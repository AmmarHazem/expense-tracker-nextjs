import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { resolveCategory, extractTransactionsFromText } from "@/lib/pdf-import";
import { extractPdfText } from "@/lib/pdf-text";
import { parseStatement, type ParsedTransaction } from "@/lib/statement-parser";

interface ImportDependencies {
  db: PrismaClient;
  readPdf: typeof extractPdfText;
  extractFallback: typeof extractTransactionsFromText;
}

/** Internal composition seam: production and tests exercise the same import interface. */
export function createImportProcessor({ db, readPdf, extractFallback }: ImportDependencies) {
  /** Run after the upload response; terminal jobs are never executed again. */
  return async function processImport(jobId: string, userId: string, buffer: Buffer): Promise<void> {
    // Scope every job mutation to its owner and its non-terminal state.
    const where = { id: jobId, userId, status: "processing" };
    try {
      const job = await db.importJob.findFirst({ where });
      if (!job) return;

      const text = await readPdf(buffer);
      let candidates = parseStatement(text);
      let history: Awaited<ReturnType<typeof buildKnownMerchants>> | undefined;
      if (candidates.length === 0) {
        history = await buildKnownMerchants(db, userId);
        candidates = await extractFallback(text, history.forPrompt);
      }
      validateTransactions(candidates);
      await db.importJob.updateMany({ where, data: { extracted: candidates.length } });

      const debits = candidates.filter((c) => c.amount < 0);
      if (debits.length > 0) history ??= await buildKnownMerchants(db, userId);
      const knownMerchants = history?.exact ?? new Map<string, string>();

      await db.$transaction(async (tx) => {
        // This conditional write takes the row lock. Concurrent executions wait,
        // then see the committed terminal state and do not insert again. The
        // transition rolls back with the expenses if any later write fails.
        const claimed = await tx.importJob.updateMany({
          where,
          data: { status: "done", error: null },
        });
        if (claimed.count === 0) return;

        let inserted = 0;
        if (debits.length > 0) {
          // Repair partial catalogues too, without replacing user customizations.
          await tx.category.createMany({
            data: DEFAULT_CATEGORIES.map((c) => ({ ...c, isDefault: true, userId })),
            skipDuplicates: true,
          });
          const categories = await tx.category.findMany({ where: { userId } });
          const catByName = new Map(categories.map((c) => [c.name, c.id]));
          const unknownId = catByName.get("Unknown");
          if (!unknownId) throw new Error("Unknown category is unavailable");

          const rows = debits.map((c) => {
            const knownCategory = c.merchant
              ? knownMerchants.get(c.merchant.toLowerCase().trim())
              : undefined;
            const categoryName = knownCategory ?? resolveCategory(c.categoryHint ?? c.description);
            return {
              amount: Math.abs(c.amount),
              description: c.description || null,
              merchant: c.merchant || null,
              date: c.date,
              userId,
              categoryId: catByName.get(categoryName) ?? unknownId,
            };
          });
          // Expense has no import uniqueness constraint: repeat protection is
          // supplied by the job transition, not by createMany.skipDuplicates.
          const result = await tx.expense.createMany({ data: rows });
          inserted = result.count;
        }
        await tx.importJob.update({ where: { id: jobId }, data: { inserted } });
      });
    } catch (error) {
      console.error(`processImport error [job ${jobId}]:`, error);
      try {
        await db.importJob.updateMany({
          where,
          data: {
            status: "error",
            error: (error instanceof Error ? error.message : "Import failed").slice(0, 500),
          },
        });
      } catch (recordError) {
        console.error(`Could not record import failure [job ${jobId}]:`, recordError);
      }
    }
  };
}

export const processImport = createImportProcessor({
  db: prisma,
  readPdf: extractPdfText,
  extractFallback: extractTransactionsFromText,
});

function validateTransactions(candidates: ParsedTransaction[]) {
  for (const c of candidates) {
    if (!Number.isFinite(c.date.getTime())) throw new Error("Statement contains an invalid date");
    if (!Number.isFinite(c.amount) || Math.abs(c.amount) > 99_999_999.99) {
      throw new Error("Statement contains an invalid amount");
    }
  }
}

/** Newest merchant mapping wins, shared by exact category overrides and the AI prompt. */
async function buildKnownMerchants(db: PrismaClient, userId: string) {
  const pastExpenses = await db.expense.findMany({
    where: { userId, merchant: { not: null } },
    select: { merchant: true, category: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  const exact = new Map<string, string>();
  const forPrompt: Record<string, string> = Object.create(null);
  for (const e of pastExpenses) {
    const merchant = e.merchant?.trim();
    if (!merchant) continue;
    const key = merchant.toLowerCase();
    if (!exact.has(key)) {
      exact.set(key, e.category.name);
      forPrompt[merchant] = e.category.name;
    }
  }
  return { exact, forPrompt };
}
