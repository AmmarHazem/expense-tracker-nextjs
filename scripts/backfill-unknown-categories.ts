/**
 * Backfill categories for expenses stuck in "Unknown".
 *
 * For every Unknown expense inside the target window, find the most recent
 * *categorized* expense belonging to the same user with the same name, and copy
 * that category over.
 *
 * "Same name" is matched in two passes, so a merchant key can never collide
 * with a description key:
 *   1. normalised `merchant`    (lowercased, trimmed, whitespace collapsed)
 *   2. normalised `description` (only when the expense has no merchant, or the
 *      merchant pass found nothing)
 *
 * "Most recent" means the latest transaction `date`, tie-broken by `updatedAt`
 * so a manual recategorisation wins over an untouched row from the same day.
 *
 * Dry-run by default — nothing is written until you pass --apply.
 *
 *   npm run backfill:unknown                  # preview, all users, last 4 months
 *   npm run backfill:unknown -- --apply       # write the changes
 *   npm run backfill:unknown -- --months 12 --user ammar.hazem0@gmail.com
 *   npm run backfill:unknown -- --donor-window --apply
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { subMonths } from "date-fns";

const UNKNOWN = "Unknown";

// ---------------------------------------------------------------- args

interface Options {
  apply: boolean;
  months: number;
  /** Restrict donor expenses to the same window instead of all history. */
  donorWindow: boolean;
  /** Email or user id; undefined means every user. */
  user?: string;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { apply: false, months: 4, donorWindow: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--apply":
        opts.apply = true;
        break;
      case "--donor-window":
        opts.donorWindow = true;
        break;
      case "--months": {
        const value = Number(argv[++i]);
        if (!Number.isFinite(value) || value <= 0) {
          throw new Error(`--months expects a positive number, got "${argv[i]}"`);
        }
        opts.months = value;
        break;
      }
      case "--user":
        opts.user = argv[++i];
        if (!opts.user) throw new Error("--user expects an email or user id");
        break;
      case "--help":
      case "-h":
        console.log(
          [
            "Usage: npm run backfill:unknown -- [options]",
            "",
            "  --apply          Write the changes (default is a dry run)",
            "  --months <n>     How far back to fix Unknown expenses (default 4)",
            "  --donor-window   Only borrow categories from inside the same window",
            "  --user <ref>     Limit to one user (email or id)",
          ].join("\n"),
        );
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument "${arg}" (try --help)`);
    }
  }

  return opts;
}

// ---------------------------------------------------------------- matching

/** Normalise a name for comparison: lowercase, trimmed, whitespace collapsed. */
function normalise(value: string | null): string | null {
  if (!value) return null;
  const key = value.toLowerCase().trim().replace(/\s+/g, " ");
  return key.length > 0 ? key : null;
}

interface Donor {
  categoryId: string;
  categoryName: string;
  date: Date;
  label: string;
}

/**
 * Index donors by name, keeping only the most recent one per key. Expects
 * `donors` pre-sorted newest-first, so the first write per key wins.
 */
function indexDonors(
  donors: {
    merchant: string | null;
    description: string | null;
    date: Date;
    categoryId: string;
    category: { name: string };
  }[],
) {
  const byMerchant = new Map<string, Donor>();
  const byDescription = new Map<string, Donor>();

  for (const donor of donors) {
    const entry: Donor = {
      categoryId: donor.categoryId,
      categoryName: donor.category.name,
      date: donor.date,
      label: donor.merchant ?? donor.description ?? "(no name)",
    };

    const merchantKey = normalise(donor.merchant);
    if (merchantKey && !byMerchant.has(merchantKey)) byMerchant.set(merchantKey, entry);

    const descriptionKey = normalise(donor.description);
    if (descriptionKey && !byDescription.has(descriptionKey)) {
      byDescription.set(descriptionKey, entry);
    }
  }

  return { byMerchant, byDescription };
}

// ---------------------------------------------------------------- reporting

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const cutoff = subMonths(new Date(), opts.months);
  console.log(
    `${opts.apply ? "APPLYING" : "DRY RUN"} — Unknown expenses on or after ${formatDate(cutoff)}` +
      ` (last ${opts.months} months)`,
  );
  console.log(
    `Borrowing categories from ${opts.donorWindow ? "the same window" : "all history"}.\n`,
  );

  try {
    const users = await prisma.user.findMany({
      where: opts.user ? { OR: [{ email: opts.user }, { id: opts.user }] } : undefined,
      select: { id: true, email: true },
    });

    if (users.length === 0) {
      console.log(opts.user ? `No user matched "${opts.user}".` : "No users found.");
      return;
    }

    let totalMatched = 0;
    let totalUnmatched = 0;
    let totalUpdated = 0;

    for (const user of users) {
      const unknownCategory = await prisma.category.findFirst({
        where: { userId: user.id, name: UNKNOWN },
        select: { id: true },
      });
      if (!unknownCategory) continue;

      const unknownExpenses = await prisma.expense.findMany({
        where: { userId: user.id, categoryId: unknownCategory.id, date: { gte: cutoff } },
        select: { id: true, merchant: true, description: true, date: true },
        orderBy: { date: "desc" },
      });
      if (unknownExpenses.length === 0) continue;

      // Donors: everything already categorised as something other than Unknown.
      // Newest first so the first entry indexed per name is the most recent.
      const donors = await prisma.expense.findMany({
        where: {
          userId: user.id,
          categoryId: { not: unknownCategory.id },
          ...(opts.donorWindow ? { date: { gte: cutoff } } : {}),
        },
        select: {
          merchant: true,
          description: true,
          date: true,
          categoryId: true,
          category: { select: { name: true } },
        },
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      });

      const { byMerchant, byDescription } = indexDonors(donors);

      // Group the planned changes by match key (not raw name) so casing and
      // whitespace variants of one merchant collapse into a single line.
      const planned = new Map<string, { donor: Donor; name: string; ids: string[] }>();
      const unmatched = new Map<string, number>();

      for (const expense of unknownExpenses) {
        const merchantKey = normalise(expense.merchant);
        const descriptionKey = normalise(expense.description);

        const merchantDonor = merchantKey ? byMerchant.get(merchantKey) : undefined;
        const donor =
          merchantDonor ?? (descriptionKey ? byDescription.get(descriptionKey) : undefined);

        const name = expense.merchant ?? expense.description ?? "(no name)";

        if (!donor) {
          unmatched.set(name, (unmatched.get(name) ?? 0) + 1);
          totalUnmatched++;
          continue;
        }

        const key = merchantDonor ? `m:${merchantKey}` : `d:${descriptionKey}`;
        const group = planned.get(key) ?? { donor, name, ids: [] };
        group.ids.push(expense.id);
        planned.set(key, group);
        totalMatched++;
      }

      if (planned.size === 0 && unmatched.size === 0) continue;

      console.log(`── ${user.email ?? user.id}`);
      console.log(
        `   ${unknownExpenses.length} Unknown expense(s) in window, ` +
          `${donors.length} categorised expense(s) available as donors`,
      );

      for (const { donor, name, ids } of planned.values()) {
        console.log(
          `   ✓ ${name} → ${donor.categoryName}  ` +
            `(${ids.length} expense${ids.length === 1 ? "" : "s"}; ` +
            `from "${donor.label}" on ${formatDate(donor.date)})`,
        );
      }

      if (unmatched.size > 0) {
        console.log(`   No categorised match for ${unmatched.size} distinct name(s):`);
        for (const [name, count] of unmatched) {
          console.log(`   · ${name}${count > 1 ? ` (${count})` : ""}`);
        }
      }

      if (opts.apply && planned.size > 0) {
        // One transaction per user. The categoryId guard means a row that was
        // recategorised since we read it is left alone rather than overwritten.
        const updated = await prisma.$transaction(
          [...planned.values()].map(({ donor, ids }) =>
            prisma.expense.updateMany({
              where: { id: { in: ids }, userId: user.id, categoryId: unknownCategory.id },
              data: { categoryId: donor.categoryId },
            }),
          ),
        );
        const count = updated.reduce((sum, r) => sum + r.count, 0);
        totalUpdated += count;
        console.log(`   → updated ${count} expense(s)`);
      }

      console.log();
    }

    console.log("─".repeat(60));
    console.log(`Matched:   ${totalMatched}`);
    console.log(`Unmatched: ${totalUnmatched}`);
    if (opts.apply) {
      console.log(`Updated:   ${totalUpdated}`);
    } else {
      console.log("\nNothing was written. Re-run with --apply to commit these changes.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
