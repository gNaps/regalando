import { useSyncExternalStore, type ReactNode } from "react";
import type { SessionResource, SignInFutureResource, SignUpFutureResource } from "@clerk/nextjs/types";

// Simulated SDK responses only: these fixtures never contact Clerk or send email.
const params = new URLSearchParams(window.location.search);
type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };
const subscribers = new Set<() => void>();
let revision = 0;
function notify() { revision++; subscribers.forEach(callback => callback()); }
function subscribe(callback: () => void) { subscribers.add(callback); return () => { subscribers.delete(callback); }; }
function useObserve() { useSyncExternalStore(subscribe, () => revision); }
const ok = { error: null };
const session = { id: "fixture-session", status: params.has("pending-session") ? "pending" : "active", currentTask: params.has("pending-session") ? { key: "setup-mfa" } : null } as unknown as SessionResource;
let sessionAvailable = params.has("existing-session") || params.has("pending-session");
const client = {
  get sessions() { return sessionAvailable ? [session] : []; },
  get signedInSessions() { return client.sessions.filter(value => ["active", "pending"].includes(value.status)); },
  lastActiveSessionId: "fixture-session",
  async reload() {
    document.body.dataset.reloaded = "true";
    if (!params.has("missing-session")) sessionAvailable = true;
    notify(); return client;
  },
};
async function sso() {
  document.body.dataset.social = "true";
  if (params.has("session-race")) return { error: { errors: [{ code: "session_exists" }] } };
  if (params.has("social-error")) return { error: { code: "oauth_access_denied" } };
  return ok;
}
const wrongCode = { error: { code: "form_code_incorrect" } };
async function send() { document.body.dataset.sent = String(Number(document.body.dataset.sent || 0) + 1); return ok; }
async function finalize({ navigate }: Parameters<SignInFutureResource["finalize"]>[0] = {}) {
  document.body.dataset.finalized = "true";
  await navigate?.({ session: { currentTask: null } as unknown as SessionResource, decorateUrl: url => url });
  return ok;
}
const signIn = {
  status: "needs_identifier", identifier: null, supportedFirstFactors: [], supportedSecondFactors: [],
  async create({ identifier }: { identifier?: string }) {
    signIn.identifier = identifier || null; signIn.status = "needs_first_factor";
    signIn.supportedFirstFactors = params.has("code-only") ? [{ strategy: "email_code", emailAddressId: "fixture-email", safeIdentifier: "g***@example.org" }] : [{ strategy: "password" }, { strategy: "email_code", emailAddressId: "fixture-email", safeIdentifier: "g***@example.org" }];
    notify(); return ok;
  },
  async password({ password }: { password: string }) {
    if (password === "wrong") return { error: { code: "form_password_incorrect" } };
    if (params.has("device-trust")) {
      signIn.status = "needs_client_trust";
      signIn.supportedSecondFactors = [{ strategy: "email_code", emailAddressId: "fixture-email", safeIdentifier: "g***@example.org" }, { strategy: "totp" }];
    } else signIn.status = "complete";
    notify(); return ok;
  },
  emailCode: {
    sendCode: send,
    async verifyCode({ code }: { code: string }) { if (code !== "123456") return wrongCode; signIn.status = "complete"; notify(); return ok; },
  },
  resetPasswordEmailCode: {
    sendCode: send,
    async verifyCode({ code }: { code: string }) { if (code !== "123456") return wrongCode; signIn.status = "needs_new_password"; notify(); return ok; },
    async submitPassword({ signOutOfOtherSessions }: { password: string; signOutOfOtherSessions?: boolean }) { document.body.dataset.revoke = String(signOutOfOtherSessions); signIn.status = "complete"; notify(); return ok; },
  },
  mfa: { sendEmailCode: send, sendPhoneCode: send, verifyEmailCode: verifyMfa, verifyPhoneCode: verifyMfa, verifyTOTP: verifyMfa, verifyBackupCode: verifyMfa },
  finalize,
  async reset() { signIn.status = "needs_identifier"; notify(); return ok; },
  sso,
} as unknown as Mutable<SignInFutureResource>;
async function verifyMfa({ code }: { code: string }) { if (code !== "123456") return wrongCode; signIn.status = "complete"; notify(); return ok; }

// Mutable mock resources follow the SDK's method-driven lifecycle.
const signInMutable = signIn as Mutable<SignInFutureResource>;
// Resource properties above are mutable at runtime; this alias is used for initial OAuth state.
if (params.has("resume-mfa")) { signInMutable.status = "needs_second_factor"; signInMutable.supportedSecondFactors = [{ strategy: "totp" }]; }

const signUp = {
  id: params.has("oauth-pending") ? "fixture-signup" : undefined,
  status: "missing_requirements", canBeDiscarded: false,
  missingFields: params.has("oauth-pending") ? ["username"] : [],
  unverifiedFields: [], emailAddress: params.has("oauth-pending") ? "google@example.org" : null,
  username: null, firstName: null, lastName: null,
  async create(values: { emailAddress?: string; username?: string }) {
    signUp.id = "fixture-signup"; signUp.emailAddress = values.emailAddress || null; signUp.username = values.username || null;
    signUp.missingFields = []; signUp.unverifiedFields = ["email_address"];
    notify(); return ok;
  },
  async update({ username }: { username?: string }) { signUp.username = username || null; signUp.missingFields = []; signUp.status = "complete"; notify(); return ok; },
  verifications: { sendEmailCode: send, async verifyEmailCode({ code }: { code: string }) { if (code !== "123456") return wrongCode; signUp.status = "complete"; notify(); return ok; } },
  async reset() { signUp.id = undefined; signUp.missingFields = []; signUp.unverifiedFields = []; notify(); return ok; },
  finalize,
  sso,
} as unknown as Mutable<SignUpFutureResource>;

export function useSignIn() { useObserve(); return { signIn, errors: { raw: null } }; }
export function useSignUp() { useObserve(); return { signUp, errors: { raw: null } }; }
export function ClerkLoaded({ children }: { children: ReactNode }) { return children; }
export function ClerkLoading() { return null; }
export function useAuth() { return { userId: params.has("guest") ? null : "fixture-clerk-user" }; }
export function useUser() { return { isLoaded: true, isSignedIn: !params.has("guest"), user: { fullName: "Giulia Rossi", firstName: "Giulia", username: "giulia", hasImage: false, primaryEmailAddress: { emailAddress: "giulia@example.org" } } }; }
const clerk = {
  client,
  async setActive({ navigate }: Parameters<NonNullable<ReturnType<typeof import("@clerk/nextjs").useSessionList>["setActive"]>>[0]) {
    document.body.dataset.activationAttempts = String(Number(document.body.dataset.activationAttempts || 0) + 1);
    if (params.has("activation-error") && document.body.dataset.activationAttempts === "1") throw { code: "network_error" };
    document.body.dataset.activated = session.id;
    await navigate?.({ session, decorateUrl: url => url });
  },
  openUserProfile() { document.body.dataset.profile = "true"; },
  async signOut() { if (params.has("logout-error")) throw new Error("simulated error"); document.body.dataset.signedOut = "true"; },
};
export function useClerk() { useObserve(); return clerk; }
export function useSessionList() { useObserve(); return { isLoaded: true, sessions: client.sessions, setActive: clerk.setActive }; }
