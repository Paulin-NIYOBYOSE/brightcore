import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { getCurrentAdmin } from "@/server/auth/current-admin";

export const metadata: Metadata = {
  title: "Recruiter sign in",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  if (await getCurrentAdmin()) redirect("/admin");

  const params = await searchParams;
  // Validated again by safeAdminRedirect() before any redirect happens.
  const next = typeof params.next === "string" ? params.next : "";
  const signedOut = params.signedOut === "1";

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12"
    >
      <div className="w-full max-w-sm">
        <Link href="/" className="mx-auto flex w-fit rounded-md" aria-label="BrightCore Careers home">
          <Logo />
        </Link>
        <Card className="mt-8 p-6 shadow-md sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">Recruiter sign in</h1>
          <p className="mt-1 mb-6 text-sm text-slate-600">
            Manage job postings and review applications.
          </p>
          {signedOut && (
            <Alert tone="success" className="mb-5">
              You have been signed out.
            </Alert>
          )}
          <LoginForm next={next} />
        </Card>
        <Link
          href="/"
          className="mx-auto mt-6 flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-navy-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to the careers site
        </Link>
      </div>
    </main>
  );
}
