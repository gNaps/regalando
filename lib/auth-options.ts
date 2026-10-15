import "server-only";
import type { AuthOptions } from "./auth";

// Fallback matches the current instance; Clerk remains authoritative for all requirements.
const fallback: AuthOptions = {
  username: { enabled: true, required: true },
  firstName: { enabled: true, required: false },
  lastName: { enabled: true, required: false },
  password: { enabled: true, required: true },
  social: [{ strategy: "oauth_google", name: "Google" }],
  signupMode: "public",
};

type Environment = { user_settings?: { attributes?: Record<string, { enabled: boolean; required: boolean }>; social?: Record<string, { enabled: boolean; authenticatable?: boolean; strategy: string; name: string }>; sign_up?: { mode?: string } } };

export async function getAuthOptions(): Promise<AuthOptions> {
  try {
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
    const host = Buffer.from(key.replace(/^pk_(test|live)_/, ""), "base64").toString("utf8").replace(/\$$/, "");
    if (!/^[a-z0-9.-]+$/i.test(host)) return fallback;
    const response = await fetch(`https://${host}/v1/environment`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return fallback;
    const payload = await response.json() as Environment & { response?: Environment };
    const settings = (payload.response ?? payload).user_settings;
    if (!settings?.attributes) return fallback;
    const attribute = (name: string) => ({ enabled: settings.attributes![name]?.enabled ?? false, required: settings.attributes![name]?.required ?? false });
    return {
      username: attribute("username"), firstName: attribute("first_name"), lastName: attribute("last_name"), password: attribute("password"),
      social: Object.entries(settings.social ?? {}).filter(([, value]) => value.enabled && value.authenticatable !== false).map(([strategy, value]) => ({ strategy: (value.strategy || strategy) as AuthOptions["social"][number]["strategy"], name: value.name || strategy.replace("oauth_", "") })),
      signupMode: settings.sign_up?.mode ?? "public",
    };
  } catch { return fallback; }
}
