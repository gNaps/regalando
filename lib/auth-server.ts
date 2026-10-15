import "server-only";
import { headers } from "next/headers";
import { authRedirect } from "./auth";

export async function signedInDestination(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const query = await searchParams;
  const request = await headers();
  const origin = `${request.get("x-forwarded-proto") === "https" ? "https" : "http"}://${request.get("host") || "localhost"}`;
  return authRedirect(typeof query.redirect_url === "string" ? query.redirect_url : null, origin);
}
