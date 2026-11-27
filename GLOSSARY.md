# Expense Tracking

Expenses record a user's spending. A bank statement can supply transactions from which expenses are imported.

## Language

**Statement transaction**:
A dated movement of money on a bank statement. Debits have negative amounts and credits have positive amounts.
_Avoid_: Expense (credits are not expenses)

**Expense**:
A user's spending entry, recorded as a positive amount and assigned to one of that user's categories.

**Import job**:
One attempt to import a bank statement for a user, with progress and a final success or error outcome. A separate upload is a separate import job, even if the file is identical.
_Avoid_: Statement (the document itself)
