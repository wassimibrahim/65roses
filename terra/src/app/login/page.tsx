import { redirect } from "next/navigation";
import { currentUser } from "@/lib/rbac";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await currentUser();
  if (user) redirect("/command");
  const { from } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-6">
      <div className="w-full max-w-[300px]">
        <div className="mb-14 text-center">
          <h1 className="display text-[38px] leading-none tracking-[0.16em] text-ink">TERRA</h1>
          <p className="eyebrow mt-3">Capital Intelligence</p>
          <p className="mt-8 text-[12.5px] text-stone">From relationships to transactions.</p>
        </div>

        <LoginForm redirectTo={from ?? "/command"} />

        <div className="mt-14 border-t border-rule-soft pt-4 text-center">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone-light">
            Confidential — Terra Capital
          </p>
        </div>
      </div>
    </main>
  );
}
