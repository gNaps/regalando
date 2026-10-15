import { CustomSignUp } from "@/app/components/auth/sign-up-form";
import { getAuthOptions } from "@/lib/auth-options";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { requireConfig } from "@/lib/require-session";
import { signedInDestination } from "@/lib/auth-server";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  requireConfig();
  if ((await auth()).userId) redirect(await signedInDestination(searchParams));
  return <CustomSignUp options={await getAuthOptions()} />;
}
