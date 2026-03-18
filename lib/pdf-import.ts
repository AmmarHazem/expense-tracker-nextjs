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

export async function extractTransactionsFromBuffer(
  buffer: Buffer,
  fileName: string,
): Promise<Transaction[] | null> {
  try {
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
              data: buffer,
            },
          ],
        },
      ],
    });
    const parsed = transactionSchema.safeParse(JSON.parse(res.text ?? "{}"));
    return parsed.success ? parsed.data.transactions : null;
  } catch (e) {
    console.error(`extractTransactionsFromBuffer error [${fileName}]:`, e);
    return null;
  }
}
