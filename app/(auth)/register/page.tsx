import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="brutalist-box bg-surface p-6 mb-4">
            <div className="label-mono text-foreground/50 mb-2">EXPENSE TRACKER</div>
            <h1 className="text-4xl font-black text-foreground leading-none">
              JOIN.<br />TRACK.<br />SAVE.
            </h1>
          </div>
          <p className="text-sm text-foreground/60 font-mono">
            Create an account to start tracking your expenses.
          </p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-xs text-foreground/40 font-mono text-center">
          Your data is private and secure
        </p>
      </div>
    </div>
  );
}
