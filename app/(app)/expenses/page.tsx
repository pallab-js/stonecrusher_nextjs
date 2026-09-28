import { listExpenses } from "@/lib/repo/operations";
import { PageHeader } from "@/components/shared/page-header";
import { ExpensesTable } from "@/components/modules/expenses-table";

export const dynamic = "force-dynamic";

export default function ExpensesPage() {
  const expenses = listExpenses();
  return (
    <>
      <PageHeader
        title="Expenses"
        description="Day-to-day spending outside purchases — payroll, admin, transport and repairs."
      />
      <ExpensesTable rows={expenses} />
    </>
  );
}
