import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { once } from "node:events";
import { createConnection } from "node:net";
import test from "node:test";
import { Pool } from "pg";
import { hash } from "bcryptjs";

// The runner starts its own app with disposable data; it never reads DATABASE_URL.
const connectionString = process.env.TEST_DATABASE_URL;
const browseBin = process.env.BROWSE_BIN;
assert.ok(connectionString, "Set TEST_DATABASE_URL to a disposable local PostgreSQL database");
assert.ok(browseBin, "Set BROWSE_BIN to the gstack browse executable (or a source-runner script)");
const database = new URL(connectionString);
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname), "Browser tests require a local database");
assert.ok(database.pathname.endsWith("_history_test"), "Use a dedicated database ending in _history_test");
const port = Number(process.env.HISTORY_TEST_PORT ?? 3102);
const baseUrl = `http://localhost:${port}`;
const pool = new Pool({ connectionString });
const userId = `history-test-${randomUUID()}`;
const foodId = `${userId}-food`;
const travelId = `${userId}-travel`;
const password = randomUUID();
let app;
let appOutput = "";

function browse(...args) {
  return execFileSync(browseBin, args, { encoding: "utf8", timeout: 30_000 });
}
// gstack fill waits for network-idle and cannot fill an empty string. Dispatch
// native input events in one browser task to exercise the actual debounce races.
function rapidSearch(values, action) {
  browse("js", `(() => {
    const input = document.querySelector('[aria-label="Search expenses"]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const value of ${JSON.stringify(values)}) {
      set.call(input, value);
      input.dispatchEvent(new Event('input', {bubbles: true}));
    }
    const action = ${JSON.stringify(action ?? null)};
    if (action === 'back') history.back();
    else if (action) {
      const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes(action));
      if (!button) throw new Error('Missing test button: ' + action);
      button.click();
    }
    return true;
  })()`);
}
function js(expression) { return JSON.parse(browse("js", `[${expression}]`))[0]; }
async function settle() {
  // Deliberately outwait the original 300 ms mount effect and RSC navigation.
  await delay(1000);
}
function state() {
  return js(`({url:location.pathname+location.search,search:document.querySelector('[aria-label="Search expenses"]')?.value,pressed:Array.from(document.querySelectorAll('[aria-pressed="true"]')).map(b=>b.textContent.trim()),text:document.body.innerText})`);
}
async function visit(query) {
  browse("goto", `${baseUrl}/history${query}`);
  await settle();
}
async function expectHistory(query, merchant) {
  const result = state();
  assert.equal(result.url, `/history${query}`, "Hydration/refresh must preserve the requested History URL");
  assert.ok(result.text.includes(merchant), `Expected the saved page's expense: ${merchant}`);
  return result;
}
async function waitForApp() {
  for (let i = 0; i < 100; i++) {
    if (app.exitCode !== null) throw new Error(`Test app exited: ${appOutput}`);
    const connected = await new Promise((resolve) => {
      const socket = createConnection({ port, host: "127.0.0.1" });
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => { socket.destroy(); resolve(false); });
    });
    if (connected) return;
    await delay(100);
  }
  throw new Error(`Test app did not start: ${appOutput}`);
}

test("History keeps its URL state across hydration, refresh, pagination and filters", { timeout: 120_000 }, async (t) => {
  try {
    const exists = await pool.query(`SELECT to_regclass('"User"') AS name`);
    if (!exists.rows[0].name) {
      const migrations = (await readdir("prisma/migrations", { withFileTypes: true }))
        .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
      for (const migration of migrations) {
        await pool.query(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
      }
    }
    await pool.query(`INSERT INTO "User" (id,name,email,password,"seedLoaded","updatedAt") VALUES ($1,'History test',$2,$3,true,NOW())`, [userId, `${userId}@example.test`, await hash(password, 12)]);
    for (const [id, name] of [[foodId, "Food"], [travelId, "Travel"]]) {
      await pool.query(`INSERT INTO "Category" (id,name,emoji,color,"userId") VALUES ($1,$2,'T','#123456',$3)`, [id, name, userId]);
    }
    await pool.query(`INSERT INTO "Expense" (id,amount,description,merchant,date,"userId","categoryId","updatedAt")
      SELECT $1 || '-' || i, 1.00, CASE WHEN i % 2 = 0 THEN 'Needle' ELSE 'Other' END,
      'History fixture ' || lpad(i::text,4,'0'), timestamp '2026-11-27 12:00:00' - i * interval '1 minute',
      $1, CASE WHEN i % 2 = 0 THEN $2 ELSE $3 END, NOW() FROM generate_series(1,520) i`, [userId, foodId, travelId]);

    app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port)], {
      env: { ...process.env, DATABASE_URL: connectionString, AUTH_SECRET: userId, AUTH_TRUST_HOST: "true", AUTH_URL: baseUrl, NEXTAUTH_URL: baseUrl },
      stdio: ["ignore", "pipe", "pipe"],
    });
    app.stdout.on("data", (data) => { appOutput += data; });
    app.stderr.on("data", (data) => { appOutput += data; });
    await waitForApp();
    browse("goto", `${baseUrl}/login`);
    browse("fill", 'input[type="email"]', `${userId}@example.test`);
    browse("fill", 'input[type="password"]', password);
    browse("click", 'button:has-text("Sign In")');
    await settle();

    await t.test("direct page 12 and repeated refresh retain the URL and the same expenses", async () => {
      await visit("?page=12");
      await expectHistory("?page=12", "History fixture 0221");
      for (let i = 0; i < 2; i++) {
        browse("reload");
        await settle();
        await expectHistory("?page=12", "History fixture 0221");
      }
    });

    await t.test("filtered deep link, refresh, Show More, Back and Forward retain filters", async () => {
      const query = `?page=12&search=Needle&cat=${foodId}`;
      await visit(query);
      let result = await expectHistory(query, "History fixture 0442");
      assert.equal(result.search, "Needle");
      assert.ok(result.pressed.some((label) => label.includes("Food")));
      browse("reload"); await settle();
      await expectHistory(query, "History fixture 0442");
      browse("click", 'button:has-text("Show More")'); await settle();
      await expectHistory(query.replace("page=12", "page=13"), "History fixture 0482");
      assert.equal(js(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Show More')`), false);
      browse("back"); await settle();
      await expectHistory(query, "History fixture 0442");
      browse("forward"); await settle();
      await expectHistory(query.replace("page=12", "page=13"), "History fixture 0482");
    });

    await t.test("search changes reset page once; category toggles and clear still work", async () => {
      await visit("?page=12");
      browse("fill", '[aria-label="Search expenses"]', "Needle"); await settle();
      let result = state();
      assert.equal(new URL(result.url, baseUrl).searchParams.get("page"), "1");
      assert.equal(result.search, "Needle");
      assert.ok(result.text.includes("History fixture 0002"));
      assert.equal(js(`document.activeElement?.getAttribute('aria-label')`), "Search expenses", "Search should retain focus after its debounce");
      browse("click", 'button:has-text("Food")'); await settle();
      result = state();
      assert.equal(new URL(result.url, baseUrl).searchParams.get("cat"), foodId);
      assert.equal(new URL(result.url, baseUrl).searchParams.get("search"), "Needle");
      browse("click", 'button:has-text("Clear")'); await settle();
      assert.equal(state().url, "/history");
      assert.equal(state().search, "");
      assert.deepEqual(state().pressed, []);
      browse("back"); await settle();
      result = state();
      assert.equal(result.search, "Needle", "Back must restore the visible search field");
      assert.ok(result.pressed.some((label) => label.includes("Food")), "Back must restore category selection");
    });

    await t.test("pending searches cannot overwrite category changes or Clear", async () => {
      await visit("?page=12");
      rapidSearch(["Needle"], "Food");
      await settle();
      let result = state();
      let params = new URL(result.url, baseUrl).searchParams;
      assert.equal(params.get("search"), "Needle");
      assert.equal(params.get("cat"), foodId);
      assert.equal(params.get("page"), "1");
      rapidSearch(["Other"], "Clear");
      await settle();
      assert.equal(state().url, "/history", "A cancelled debounce must not restore cleared filters");
      assert.equal(state().search, "");
    });

    await t.test("multiple category toggles preserve search and return the expected expenses", async () => {
      await visit("?page=12");
      browse("click", 'button:has-text("Food")'); await settle();
      browse("click", 'button:has-text("Travel")'); await settle();
      let result = state();
      assert.deepEqual(new URL(result.url, baseUrl).searchParams.getAll("cat").sort(), [foodId, travelId].sort());
      assert.equal(result.pressed.length, 2);
      browse("click", 'button:has-text("Food")'); await settle();
      result = state();
      assert.deepEqual(new URL(result.url, baseUrl).searchParams.getAll("cat"), [travelId]);
      assert.ok(result.text.includes("History fixture 0001"));
      assert.ok(!result.text.includes("History fixture 0002"));
    });

    await t.test("reverting a pending search leaves page 12 unchanged", async () => {
      await visit("?page=12");
      rapidSearch(["Other"]); await settle();
      assert.equal(new URL(state().url, baseUrl).searchParams.get("search"), "Other", "Native input events must trigger the real search handler");
      await visit("?page=12");
      rapidSearch(["Other", ""]);
      await settle();
      await expectHistory("?page=12", "History fixture 0221");
    });

    await t.test("Back cancels a pending edit and restores the saved page", async () => {
      await visit("?page=12");
      browse("click", 'button:has-text("Show More")'); await settle();
      await expectHistory("?page=13", "History fixture 0241");
      rapidSearch(["Other"], "back");
      await settle();
      await expectHistory("?page=12", "History fixture 0221");
      assert.equal(state().search, "");
    });
  } finally {
    if (app && app.exitCode === null) {
      const exited = once(app, "exit");
      app.kill("SIGTERM");
      await exited;
    }
    await pool.query('DELETE FROM "User" WHERE id=$1', [userId]);
    await pool.end();
  }
});
