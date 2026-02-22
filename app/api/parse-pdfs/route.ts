import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "Food", emoji: "🍔", color: "#FF6B6B" },
  { name: "Transport", emoji: "🚗", color: "#4ECDC4" },
  { name: "Housing", emoji: "🏠", color: "#45B7D1" },
  { name: "Entertainment", emoji: "🎮", color: "#F7DC6F" },
  { name: "Health", emoji: "💊", color: "#A8D5A2" },
  { name: "Shopping", emoji: "🛍️", color: "#C39BD3" },
  { name: "Travel", emoji: "✈️", color: "#F0A500" },
  { name: "Unknown", emoji: "🚫", color: "#FFFFFF" },
];

// Maps AI-returned category strings to our standard category names
const CATEGORY_MAP: Record<string, string> = {
  food: "Food",
  dining: "Food",
  restaurant: "Food",
  grocery: "Food",
  groceries: "Food",
  supermarket: "Food",
  cafe: "Food",
  coffee: "Food",
  transport: "Transport",
  transportation: "Transport",
  taxi: "Transport",
  uber: "Transport",
  careem: "Transport",
  fuel: "Transport",
  petrol: "Transport",
  metro: "Transport",
  parking: "Transport",
  housing: "Housing",
  rent: "Housing",
  utilities: "Housing",
  electricity: "Housing",
  internet: "Housing",
  phone: "Housing",
  telecom: "Housing",
  entertainment: "Entertainment",
  streaming: "Entertainment",
  cinema: "Entertainment",
  movies: "Entertainment",
  gaming: "Entertainment",
  health: "Health",
  medical: "Health",
  pharmacy: "Health",
  gym: "Health",
  fitness: "Health",
  shopping: "Shopping",
  retail: "Shopping",
  clothing: "Shopping",
  electronics: "Shopping",
  travel: "Travel",
  hotel: "Travel",
  airline: "Travel",
  flight: "Travel",
  holiday: "Travel",
};

function resolveCategory(aiCategory: string): string {
  const lower = aiCategory.toLowerCase();
  for (const [keyword, mapped] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return mapped;
  }
  return "Unknown"; // default fallback
}

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
        transactions = await extractDataFromPDF({ filePath, fileName });
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

// ── PDF extraction ────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  transactions: z.array(
    z.object({
      category: z
        .string()
        .describe(
          "examples: food, transport, housing, health, travel, shopping, unknown",
        ),
      amount: z.number().describe("positive for credit, negative for debit"),
      description: z.string(),
      marchant: z
        .string()
        .describe(
          "merchant name from the Description column, empty string if unknown",
        ),
      date: z.string().describe("ISO date string"),
    }),
  ),
});

type Transaction = z.infer<typeof transactionSchema>["transactions"][number];

async function extractDataFromPDF({
  filePath,
  fileName,
}: {
  filePath: string;
  fileName: string;
}): Promise<Transaction[] | null> {
  try {
    const file = await fs.readFile(filePath);
    const res = await generateText({
      model: openai("gpt-4o"),
      system:
        "You are a bank statement parser. Extract the full transactions list from the attached PDF. Return every transaction row you find.",
      output: Output.object({
        name: "transactions",
        schema: transactionSchema,
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all transactions from this bank statement. For each transaction set amount to negative if it is a debit/withdrawal, positive if it is a credit/deposit.",
            },
            {
              type: "file",
              mediaType: "application/pdf",
              filename: fileName,
              data: file,
            },
          ],
        },
      ],
    });
    const parsed = transactionSchema.safeParse(JSON.parse(res.text ?? "{}"));
    return parsed.success ? parsed.data.transactions : null;
  } catch (e) {
    console.error(`extractDataFromPDF error [${fileName}]:`, e);
    return null;
  }
}
