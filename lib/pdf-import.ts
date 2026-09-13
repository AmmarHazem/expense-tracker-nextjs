import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";

export const CATEGORY_MAP: Record<string, string> = {
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

export function resolveCategory(aiCategory: string): string {
  const lower = aiCategory.toLowerCase();
  for (const [keyword, mapped] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return mapped;
  }
  return "Unknown";
}

export const transactionSchema = z.object({
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

export type Transaction = z.infer<typeof transactionSchema>["transactions"][number];

function buildKnownMerchantsSection(knownMerchants?: Record<string, string>): string {
  if (!knownMerchants || Object.keys(knownMerchants).length === 0) return "";
  const lines = Object.entries(knownMerchants)
    .map(([merchant, category]) => `${merchant} → ${category}`)
    .join("\n");
  return `\n\nThe user's expense history contains these merchant-to-category mappings. Use them as your FIRST reference — if a merchant name matches or closely resembles one of these, assign that category:\n\n${lines}\n\nAvailable categories: Food, Transport, Housing, Entertainment, Health, Shopping, Travel, Unknown.`;
}

/**
 * Fallback extractor for statement formats the deterministic parser doesn't
 * recognise. Sends the already-extracted PDF *text* (not the raw PDF) to the
 * model, which is far faster than the vision path since the model no longer has
 * to OCR every page. Still bounded by the function timeout, so it is only a
 * best-effort fallback for small/unknown statements.
 *
 * Throws on any failure (missing key, model error, unparseable response) so the
 * caller can surface the real reason instead of a generic message.
 */
export async function extractTransactionsFromText(
  text: string,
  knownMerchants?: Record<string, string>,
): Promise<Transaction[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const res = await generateText({
    model: openai("gpt-4o"),
    system:
      `You are a bank statement parser. Extract the full transactions list from the statement text below. Return every transaction row you find.${buildKnownMerchantsSection(knownMerchants)}`,
    output: Output.object({ name: "transactions", schema: transactionSchema }),
    messages: [
      {
        role: "user",
        content: `For each transaction set amount to negative if it is a debit/withdrawal, positive if it is a credit/deposit.\n\n---\n${text}`,
      },
    ],
  });

  const parsed = transactionSchema.safeParse(JSON.parse(res.text ?? "{}"));
  if (!parsed.success) {
    throw new Error("The AI returned an unparseable response for this statement");
  }
  return parsed.data.transactions;
}
