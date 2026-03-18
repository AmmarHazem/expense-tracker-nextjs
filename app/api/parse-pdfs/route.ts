import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import {
  resolveCategory,
  transactionSchema,
  Transaction,
  extractTransactionsFromBuffer,
} from "@/lib/pdf-import";

const USER_EMAIL = "ammar.hazem0@gmail.com";
const UNLOCKED_DIR = path.join(process.cwd(), "bank-statements", "unlocked");
const EXTRACTED_DIR = path.join(process.cwd(), "bank-statements", "extracted");

export async function POST() {
  // ── 1. Find the user ──────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) {
    return NextResponse.json(
      { error: `User ${USER_EMAIL} not found` },
      { status: 404 },
    );
  }
  // ── 2. Clear previous data ────────────────────────────────────────────────
  await prisma.expense.deleteMany({ where: { userId: user.id } });
  await prisma.category.deleteMany({ where: { userId: user.id } });
  // ── 3. Re-create default categories ──────────────────────────────────────
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      isDefault: true,
      userId: user.id,
    })),
  });
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
  });
  const catByName = new Map(categories.map((c) => [c.name, c]));
  // ── 4. Read all PDFs ──────────────────────────────────────────────────────
  await fs.mkdir(EXTRACTED_DIR, { recursive: true });

  const files = (await fs.readdir(UNLOCKED_DIR)).filter((f) =>
    f.toLowerCase().endsWith(".pdf"),
  );
  const results: {
    file: string;
    source: "cache" | "llm";
    extracted: number;
    inserted: number;
    error?: string;
  }[] = [];
  let totalInserted = 0;
  // ── 5. Process each PDF sequentially ─────────────────────────────────────
  for (const fileName of files) {
    try {
      const filePath = path.join(UNLOCKED_DIR, fileName);
      const jsonName = fileName.replace(/\.pdf$/i, ".json");
      const jsonPath = path.join(EXTRACTED_DIR, jsonName);

      // Use cached JSON if it already exists, otherwise call the LLM
      let transactions: Transaction[] | null = null;
      let source: "cache" | "llm" = "llm";

      try {
        const cached = await fs.readFile(jsonPath, "utf-8");
        const parsed = transactionSchema.safeParse(JSON.parse(cached));
        if (parsed.success) {
          if (!parsed.data.transactions.length) {
            throw new Error("no transacitons in cache");
          }
          transactions = parsed.data.transactions;
          source = "cache";
        }
      } catch {
        // No cache file yet — fall through to LLM
        console.log("no cache for file", fileName);
      }

      if (source === "llm") {
        console.log(`Extracting via LLM: ${fileName}`);
        const buffer = await fs.readFile(filePath);
        transactions = await extractTransactionsFromBuffer(buffer, fileName);
        await fs.writeFile(
          jsonPath,
          JSON.stringify(
            { file: fileName, transactions: transactions ?? [] },
            null,
            2,
          ),
          "utf-8",
        );
      } else {
        console.log(`Using cache: ${fileName}`);
      }

      if (!transactions) {
        results.push({
          file: fileName,
          source,
          extracted: 0,
          inserted: 0,
          error: "extraction failed",
        });
        continue;
      }
      // Keep only debit transactions (negative amount)
      const debits = transactions.filter((t) => t.amount < 0);
      if (debits.length === 0) {
        results.push({
          file: fileName,
          source,
          extracted: transactions.length,
          inserted: 0,
        });
        continue;
      }
      // Build expense rows
      const rows = debits.map((t) => {
        const categoryName = resolveCategory(t.category);
        const category =
          catByName.get(categoryName) ?? catByName.get("Unknown")!;
        return {
          amount: Math.abs(t.amount),
          description: t.description || null,
          merchant: t.marchant || null,
          date: new Date(t.date),
          userId: user.id,
          categoryId: category.id,
        };
      });
      await prisma.expense.createMany({ data: rows, skipDuplicates: true });
      totalInserted += rows.length;
      results.push({
        file: fileName,
        source,
        extracted: transactions.length,
        inserted: rows.length,
      });
    } catch (e) {
      console.log("--- failed to process file", fileName);
      console.log(e);
    }
  }
  // Mark seed as loaded
  await prisma.user.update({
    where: { id: user.id },
    data: { seedLoaded: true },
  });
  return NextResponse.json({
    ok: true,
    filesProcessed: files.length,
    totalInserted,
    results,
  });
}
