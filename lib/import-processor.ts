import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { resolveCategory, extractTransactionsFromText } from "@/lib/pdf-import";
import { extractPdfText } from "@/lib/pdf-text";
import { parseStatement, type ParsedTransaction } from "@/lib/statement-parser";

interface Candidate extends ParsedTransaction {
  /** AI-suggested category string, present only on the LLM fallback path. */
  aiCategory?: string;
}

/**
 * Process a single PDF import end to end and record the outcome on the
 * ImportJob row. Designed to run *after* the HTTP response is sent (via
 * `after()`), so it never blocks the upload request. Deterministic parsing is
 * near-instant; the LLM fallback only runs for unrecognised formats.
 */
export async function processImport(
  jobId: string,
  userId: string,
  buffer: Buffer,
): Promise<void> {
  try {
    // 1. Extract text and parse deterministically (fast path).
    const text = await extractPdfText(buffer);
    let candidates: Candidate[] = parseStatement(text);

    // 2. Fallback to the LLM for formats the parser doesn't recognise.
    //    extractTransactionsFromText throws on failure; the outer catch records
    //    the real reason on the job.
    if (candidates.length === 0) {
      const knownForPrompt = await buildKnownMerchants(userId);
      const llm = await extractTransactionsFromText(text, knownForPrompt.forPrompt);
      candidates = llm.map((t) => ({
        date: new Date(t.date),
        description: t.description || "",
        merchant: t.marchant || null,
        amount: t.amount,
        aiCategory: t.category,
      }));
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: { extracted: candidates.length },
    });

    // 3. Only debits become expenses.
    const debits = candidates.filter((c) => c.amount < 0);
    if (debits.length === 0) {
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: "done", inserted: 0 },
      });
      return;
    }

    // 4. Resolve categories using the user's history + keyword map.
    const { exact: knownMerchants } = await buildKnownMerchants(userId);
    const categories = await ensureCategories(userId);
    const catByName = new Map(categories.map((c) => [c.name, c]));

    const rows = debits.map((c) => {
      const merchantKey = c.merchant?.toLowerCase().trim();
      const knownCategoryName = merchantKey ? knownMerchants[merchantKey] : undefined;
      const categoryName = knownCategoryName ?? resolveCategory(c.aiCategory ?? c.description);
      const category = catByName.get(categoryName) ?? catByName.get("Unknown")!;
      return {
        amount: Math.abs(c.amount),
        description: c.description || null,
        merchant: c.merchant || null,
        date: c.date,
        userId,
        categoryId: category.id,
      };
    });

    // 5. Insert and mark done.
    const result = await prisma.expense.createMany({ data: rows, skipDuplicates: true });
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: "done", inserted: result.count },
    });
  } catch (e) {
    console.error(`processImport error [job ${jobId}]:`, e);
    await fail(jobId, e instanceof Error ? e.message : "Import failed");
  }
}

async function fail(jobId: string, message: string): Promise<void> {
  await prisma.importJob
    .update({ where: { id: jobId }, data: { status: "error", error: message.slice(0, 500) } })
    .catch(() => {});
}

/**
 * Build merchant→category maps from the user's expense history. Returns both a
 * lowercase-keyed map (for exact-match category override) and an
 * original-casing map (for the LLM prompt).
 */
async function buildKnownMerchants(userId: string) {
  const pastExpenses = await prisma.expense.findMany({
    where: { userId, merchant: { not: null } },
    select: { merchant: true, category: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  const exact: Record<string, string> = {};
  const forPrompt: Record<string, string> = {};
  for (const e of pastExpenses) {
    if (!e.merchant) continue;
    const key = e.merchant.toLowerCase().trim();
    if (!exact[key]) {
      exact[key] = e.category.name;
      forPrompt[e.merchant.trim()] = e.category.name;
    }
  }
  return { exact, forPrompt };
}

async function ensureCategories(userId: string) {
  let categories = await prisma.category.findMany({ where: { userId } });
  if (categories.length === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, isDefault: true, userId })),
    });
    categories = await prisma.category.findMany({ where: { userId } });
  }
  return categories;
}
