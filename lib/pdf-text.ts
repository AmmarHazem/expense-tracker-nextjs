import { extractText } from "unpdf";

/**
 * Extract the plain text of a PDF, server-side, without the slow LLM-vision
 * path. unpdf ships a serverless build of pdf.js (no canvas / worker), so this
 * runs fine inside a Vercel function. Returns the merged text of all pages.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return text;
}
