import assert from "node:assert/strict";
import { after, before, beforeEach, test, mock } from "node:test";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createImportProcessor } from "../lib/import-processor";
import { transactionSchema, extractTransactionsFromText } from "../lib/pdf-import";
import { extractPdfText } from "../lib/pdf-text";
import type { ParsedTransaction } from "../lib/statement-parser";

// Never use the app's DATABASE_URL. Each run migrates a fresh, isolated schema.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database");
const schema = `import_test_${randomUUID().replaceAll("-", "")}`;
const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
const buffer = Buffer.from("test PDF");
const purchase: ParsedTransaction = {
  date: new Date("2026-09-10T00:00:00Z"),
  description: "coffee",
  merchant: "Cafe",
  amount: -32,
  categoryHint: "food",
};
const statement = `12/09/2026\n12:29:52 10/09/2026 PUR 10/09 COFFEE SHOP 9682 663401 32 0.00 30557.38\n13/09/2026\n12:29:52 11/09/2026 SALARY 663402 0.00 1000.00 31557.38`;
let userId: string;
let jobId: string;

before(async () => {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  const migrations = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  for (const migration of migrations) {
    await pool.query(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
  }
});
beforeEach(async () => {
  await db.user.deleteMany();
  const user = await db.user.create({ data: {} });
  userId = user.id;
  const job = await db.importJob.create({ data: { userId, fileName: "statement.pdf" } });
  jobId = job.id;
});
after(async () => {
  await db.$disconnect();
  await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await pool.end();
});

function processor(text = "unknown layout", candidates = [purchase]) {
  const readPdf = mock.fn(async () => text);
  const extractFallback = mock.fn(async (text: string, known?: Record<string, string>) => {
    void text;
    void known;
    return candidates;
  });
  return { run: createImportProcessor({ db, readPdf, extractFallback }), readPdf, extractFallback };
}
async function outcome() {
  return {
    job: await db.importJob.findUniqueOrThrow({ where: { id: jobId } }),
    expenses: await db.expense.findMany({ where: { userId }, include: { category: true } }),
  };
}

// Expected errors are recorded on jobs; suppress only their console output.
async function expectFailure(run: ReturnType<typeof processor>["run"]) {
  const log = mock.method(console, "error", () => {});
  try { await run(jobId, userId, buffer); } finally { log.mock.restore(); }
  const result = await outcome();
  assert.equal(result.job.status, "error");
  assert.equal(result.job.inserted, 0);
  assert.equal(result.expenses.length, 0);
  return result.job;
}

test("deterministic extraction imports debits, counts credits, and never calls AI", async () => {
  const { run, extractFallback } = processor(statement);
  await run(jobId, userId, buffer);
  const { job, expenses } = await outcome();
  assert.equal(extractFallback.mock.callCount(), 0);
  assert.equal(job.status, "done");
  assert.equal(job.extracted, 2);
  assert.equal(job.inserted, 1);
  assert.equal(Number(expenses[0].amount), 32);
  assert.equal(expenses[0].category.name, "Food");
  assert.equal(expenses[0].merchant, "COFFEE SHOP");
  assert.equal(expenses[0].date.toISOString(), "2026-09-10T00:00:00.000Z");
});

test("fallback uses newest merchant history before its suggested category", async () => {
  const category = await db.category.create({ data: { userId, name: "Work", emoji: "W", color: "#000000" } });
  const olderCategory = await db.category.create({ data: { userId, name: "Meals", emoji: "M", color: "#111111" } });
  await db.expense.create({ data: { userId, categoryId: olderCategory.id, amount: 1, date: purchase.date, merchant: "cafe", updatedAt: new Date("2026-09-01") } });
  await db.expense.create({ data: { userId, categoryId: category.id, amount: 1, date: purchase.date, merchant: " CAFE ", updatedAt: new Date("2026-09-02") } });
  const { run, extractFallback } = processor();
  await run(jobId, userId, buffer);
  assert.equal(extractFallback.mock.calls[0].arguments[1]?.["CAFE"], "Work");
  const { job, expenses } = await outcome();
  assert.equal(job.inserted, 1);
  assert.equal(expenses.find((e) => Number(e.amount) === 32)?.category.name, "Work");
});

test("partial category catalogue gains defaults without overwriting customizations", async () => {
  await db.category.create({ data: { userId, name: "Food", emoji: "F", color: "#000000" } });
  const { run } = processor("unknown", [{ ...purchase, categoryHint: "unrecognized" }]);
  await run(jobId, userId, buffer);
  const { job, expenses } = await outcome();
  assert.equal(job.status, "done");
  assert.equal(expenses[0].category.name, "Unknown");
  assert.equal((await db.category.findFirstOrThrow({ where: { userId, name: "Food" } })).emoji, "F");
});

test("credit-only and empty extraction complete without expenses or categories", async () => {
  for (const candidates of [[{ ...purchase, amount: 100 }], []]) {
    const job = await db.importJob.create({ data: { userId, fileName: "credits.pdf" } });
    await processor("unknown", candidates).run(job.id, userId, buffer);
    const result = await db.importJob.findUniqueOrThrow({ where: { id: job.id } });
    assert.equal(result.status, "done");
    assert.equal(result.extracted, candidates.length);
    assert.equal(result.inserted, 0);
  }
  assert.equal(await db.expense.count({ where: { userId } }), 0);
  assert.equal(await db.category.count({ where: { userId } }), 0);
});

test("completed and concurrent executions insert exactly once per job", async () => {
  let arrived = 0;
  let release!: () => void;
  const bothExtracting = new Promise<void>((resolve) => { release = resolve; });
  const readPdf = mock.fn(async () => "unknown");
  const run = createImportProcessor({
    db,
    readPdf,
    extractFallback: async () => {
      if (++arrived === 2) release();
      await bothExtracting;
      return [purchase];
    },
  });
  await Promise.all([run(jobId, userId, buffer), run(jobId, userId, buffer)]);
  assert.equal((await outcome()).expenses.length, 1);
  const reads = readPdf.mock.callCount();
  await run(jobId, userId, buffer);
  assert.equal(readPdf.mock.callCount(), reads);
  const { job, expenses } = await outcome();
  assert.equal(job.status, "done");
  assert.equal(job.inserted, 1);
  assert.equal(expenses.length, 1);
  const next = await db.importJob.create({ data: { userId, fileName: "new-upload.pdf" } });
  await run(next.id, userId, buffer);
  assert.equal(await db.expense.count({ where: { userId } }), 2);
});

test("foreign-owned, missing, and failed jobs do not run", async () => {
  const { run, readPdf } = processor();
  await run(jobId, "another-user", buffer);
  await run("missing", userId, buffer);
  await db.importJob.update({ where: { id: jobId }, data: { status: "error", error: "original failure" } });
  await run(jobId, userId, buffer);
  assert.equal(readPdf.mock.callCount(), 0);
  assert.equal((await outcome()).job.error, "original failure");
});

test("extraction failures are recorded and bounded without writing expenses", async () => {
  const run = createImportProcessor({ db, readPdf: async () => { throw new Error("x".repeat(600)); }, extractFallback: async () => [] });
  assert.equal((await expectFailure(run)).error?.length, 500);
  const next = await db.importJob.create({ data: { userId, fileName: "ai.pdf" } });
  jobId = next.id;
  const aiFailure = createImportProcessor({ db, readPdf: async () => "unknown", extractFallback: async () => { throw new Error("AI unavailable"); } });
  assert.equal((await expectFailure(aiFailure)).error, "AI unavailable");
});

test("invalid fallback dates and amounts fail the whole job", async () => {
  for (const invalid of [{ date: new Date("invalid") }, { amount: NaN }, { amount: Infinity }, { amount: -100_000_000 }]) {
    const job = await db.importJob.create({ data: { userId, fileName: "invalid.pdf" } });
    jobId = job.id;
    await expectFailure(processor("unknown", [purchase, { ...purchase, ...invalid }]).run);
  }
});

test("invalid calendar dates in recognized statements are rejected", async () => {
  const job = await expectFailure(processor(statement.replace("10/09/2026", "31/02/2026")).run);
  assert.match(job.error!, /invalid date/);
});

test("database insertion failure rolls back category creation and job completion", async () => {
  await pool.query(`CREATE FUNCTION reject_expense() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected expense failure'; END $$`);
  await pool.query(`CREATE TRIGGER reject_expense BEFORE INSERT ON "Expense" FOR EACH ROW EXECUTE FUNCTION reject_expense()`);
  try {
    await expectFailure(processor().run);
    assert.equal(await db.category.count({ where: { userId } }), 0);
  } finally {
    await pool.query(`DROP TRIGGER reject_expense ON "Expense"`);
    await pool.query(`DROP FUNCTION reject_expense()`);
  }
});

test("failure recording inserted count rolls back expenses too", async () => {
  await pool.query(`CREATE FUNCTION reject_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.inserted > 0 THEN RAISE EXCEPTION 'injected completion failure'; END IF; RETURN NEW; END $$`);
  await pool.query(`CREATE TRIGGER reject_completion BEFORE UPDATE ON "ImportJob" FOR EACH ROW EXECUTE FUNCTION reject_completion()`);
  try { await expectFailure(processor().run); } finally {
    await pool.query(`DROP TRIGGER reject_completion ON "ImportJob"`);
    await pool.query(`DROP FUNCTION reject_completion()`);
  }
});

test("AI output schema rejects invalid dates and uses the canonical merchant field", () => {
  const raw = { category: "food", amount: -32, description: "coffee", merchant: "Cafe", date: "2026-09-10" };
  assert.equal(transactionSchema.safeParse({ transactions: [raw] }).success, true);
  assert.equal(transactionSchema.safeParse({ transactions: [{ ...raw, date: "2026-02-31" }] }).success, false);
  const legacy: Partial<typeof raw> = { ...raw };
  delete legacy.merchant;
  assert.equal(transactionSchema.safeParse({ transactions: [{ ...legacy, marchant: "Cafe" }] }).success, false);
});

// A synthetic statement keeps the real PDF adapter under test without bank data.
function statementPdf(lines: string[]): Buffer {
  const stream = "BT /F1 10 Tf 20 750 Td " + lines.map((line) => `(${line}) Tj 0 -14 Td`).join(" ") + " ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test("real PDF text adapter feeds the deterministic import path", async () => {
  const extractFallback = mock.fn(async () => [purchase]);
  const run = createImportProcessor({ db, readPdf: extractPdfText, extractFallback });
  await run(jobId, userId, statementPdf(statement.split("\n")));
  const { job, expenses } = await outcome();
  assert.equal(job.status, "done");
  assert.equal(job.extracted, 2);
  assert.equal(job.inserted, 1);
  assert.equal(expenses[0].merchant, "COFFEE SHOP");
  assert.equal(extractFallback.mock.callCount(), 0);
});


test("production AI SDK adapter normalizes structured output through the import interface", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "synthetic-test-key";
  const fetchMock = mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.match(String(input), /\/responses$/);
    const request = JSON.parse(String(init?.body));
    const fields = request.text.format.schema.properties.transactions.items.properties;
    assert.equal(request.text.format.type, "json_schema");
    assert.ok(fields.merchant);
    assert.equal(fields.marchant, undefined);
    return Response.json({
      id: "resp_test",
      created_at: 1_789_000_000,
      model: "gpt-4o",
      output: [{
        type: "message", id: "msg_test", role: "assistant",
        content: [{ type: "output_text", annotations: [], text: JSON.stringify({
          transactions: [{ category: "food", amount: -45.5, description: "Fallback coffee",
            merchant: " Cafe Fallback ", date: "2026-09-10" }],
        }) }],
      }],
      usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 },
    });
  });
  try {
    const run = createImportProcessor({ db, readPdf: extractPdfText, extractFallback: extractTransactionsFromText });
    await run(jobId, userId, statementPdf(["Example statement", "Cafe Fallback debit 45.50"]));
    const { job, expenses } = await outcome();
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(job.status, "done");
    assert.equal(job.extracted, 1);
    assert.equal(job.inserted, 1);
    assert.equal(expenses[0].merchant, "Cafe Fallback");
    assert.equal(Number(expenses[0].amount), 45.5);
    assert.equal(expenses[0].category.name, "Food");
    assert.equal(expenses[0].date.toISOString(), "2026-09-10T00:00:00.000Z");
  } finally {
    fetchMock.mock.restore();
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
