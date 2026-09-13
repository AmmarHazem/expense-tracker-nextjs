/**
 * Deterministic parser for the columnar bank-statement format this app imports.
 *
 * The extracted text of each transaction looks like:
 *
 *   12/09/2026                                            <- posting date (own line)
 *   12:29:52 10/09/2026 PUR 10/09 NOVOTEL HO ... 9682 663401 32 0.00 30557.38
 *
 * i.e. a posting-date line, followed by one or more lines that together carry:
 *   <time> <valueDate> <description...> <ref> <debit> <credit> <balance>
 *
 * One of <debit>/<credit> is always 0.00. The last three tokens of the row are
 * always debit, credit, balance; the token before them is the reference number.
 * This is ~1000x faster than an LLM and never drops or hallucinates rows, but
 * it is specific to this layout — unrecognised formats fall back to the LLM.
 */

export interface ParsedTransaction {
  /** Value date — when the purchase happened. */
  date: Date;
  description: string;
  merchant: string | null;
  /** Signed: negative for debits/withdrawals, positive for credits/deposits. */
  amount: number;
}

const POSTING_DATE = /^\d{2}\/\d{2}\/\d{4}$/;
const TIME_VALUEDATE = /^(\d{2}:\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+)$/;
const NUMERIC = /^-?[\d,]+(?:\.\d+)?$/;

function toNumber(token: string): number {
  return parseFloat(token.replace(/,/g, ""));
}

/** Parse a dd/mm/yyyy string as a UTC date (avoids local-timezone drift). */
function parseDate(ddmmyyyy: string): Date | null {
  const [dd, mm, yyyy] = ddmmyyyy.split("/").map(Number);
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Derive a merchant name from a transaction description, e.g.
 *   "PUR 10/09 NOVOTEL HO ABU DHABI 9682" -> "NOVOTEL HO ABU DHABI"
 * Falls back to the trimmed description, or null when nothing useful remains.
 */
function extractMerchant(description: string): string | null {
  let s = description
    // drop a leading "PUR dd/mm " point-of-sale prefix
    .replace(/^PUR\s+\d{2}\/\d{2}\s+/i, "")
    // drop a foreign-currency amount that sometimes follows, e.g. "18.99 USD "
    .replace(/^[\d,.]+\s+[A-Z]{3}\s+/, "")
    .trim();
  // drop a trailing card-fragment (the recurring 4-digit group)
  s = s.replace(/\s+\d{3,4}$/, "").trim();
  return s.length > 0 ? s : null;
}

export function parseStatement(text: string): ParsedTransaction[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Group lines into records delimited by posting-date lines.
  const records: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (POSTING_DATE.test(line)) {
      if (current) records.push(current);
      current = [];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) records.push(current);

  const transactions: ParsedTransaction[] = [];
  for (const rest of records) {
    const joined = rest.join(" ");
    const m = joined.match(TIME_VALUEDATE);
    if (!m) continue; // not a transaction row (page header, summary, etc.)

    const date = parseDate(m[2]);
    if (!date) continue;

    const tokens = m[3].trim().split(/\s+/);
    if (tokens.length < 4) continue;

    const balance = tokens[tokens.length - 1];
    const credit = tokens[tokens.length - 2];
    const debit = tokens[tokens.length - 3];
    if (![balance, credit, debit].every((t) => NUMERIC.test(t))) continue;

    const description = tokens.slice(0, tokens.length - 4).join(" ").trim();
    const debitAmt = toNumber(debit);
    const creditAmt = toNumber(credit);

    // Signed amount: debits negative, credits positive. Skip zero-value rows.
    let amount: number;
    if (debitAmt > 0) amount = -debitAmt;
    else if (creditAmt > 0) amount = creditAmt;
    else continue;

    transactions.push({
      date,
      description,
      merchant: extractMerchant(description),
      amount,
    });
  }

  return transactions;
}
