import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { resolveCategory, extractTransactionsFromBuffer } from "@/lib/pdf-import";

export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  // 3. Read file buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // 3b. Build merchant→category maps from the user's expense history.
  // Fetch up to 300 rows ordered by most-recently-updated so that the most
  // recently corrected category wins when a merchant appears more than once.
  // After deduplication this yields at most ~150 distinct merchants — enough
  // for useful fuzzy matching without bloating the LLM prompt.
  const pastExpenses = await prisma.expense.findMany({
    where: { userId, merchant: { not: null } },
    select: { merchant: true, category: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  // knownMerchantsForPrompt: original casing → sent to LLM for semantic matching
  // knownMerchants: lowercase-keyed → used for exact-match override post-LLM
  const knownMerchants: Record<string, string> = {};
  const knownMerchantsForPrompt: Record<string, string> = {};
  for (const e of pastExpenses) {
    if (e.merchant) {
      const key = e.merchant.toLowerCase().trim();
      if (!knownMerchants[key]) {
        knownMerchants[key] = e.category.name;
        knownMerchantsForPrompt[e.merchant.trim()] = e.category.name;
      }
    }
  }

  // 4. Extract transactions via LLM
  const transactions = await extractTransactionsFromBuffer(buffer, file.name, knownMerchantsForPrompt);
  if (!transactions) {
    return NextResponse.json({ error: "Failed to extract transactions from PDF" }, { status: 422 });
  }

  // 5. Ensure user has categories
  let categories = await prisma.category.findMany({ where: { userId } });
  if (categories.length === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, isDefault: true, userId })),
    });
    categories = await prisma.category.findMany({ where: { userId } });
  }
  const catByName = new Map(categories.map((c) => [c.name, c]));

  // 6. Filter debits and build expense rows
  const debits = transactions.filter((t) => t.amount < 0);
  if (debits.length === 0) {
    return NextResponse.json({ ok: true, extracted: transactions.length, inserted: 0 });
  }

  const rows = debits.map((t) => {
    const merchantKey = t.marchant?.toLowerCase().trim();
    const knownCategoryName = merchantKey ? knownMerchants[merchantKey] : undefined;
    const categoryName = knownCategoryName ?? resolveCategory(t.category);
    const category = catByName.get(categoryName) ?? catByName.get("Unknown")!;
    return {
      amount: Math.abs(t.amount),
      description: t.description || null,
      merchant: t.marchant || null,
      date: new Date(t.date),
      userId,
      categoryId: category.id,
    };
  });

  // 7. Insert expenses
  await prisma.expense.createMany({ data: rows, skipDuplicates: true });

  return NextResponse.json({ ok: true, extracted: transactions.length, inserted: rows.length });
}
