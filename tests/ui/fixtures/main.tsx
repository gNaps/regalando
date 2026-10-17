import LiveListsPage from "@/app/components/live/list-overview";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LiveListDetail } from "@/app/components/live/list-detail";
import { CustomSignIn } from "@/app/components/auth/sign-in-form";
import { CustomSignUp } from "@/app/components/auth/sign-up-form";
import { AccountMenu } from "@/app/components/live/account-menu";
import { InviteEntry } from "@/app/components/live/invite-entry";
import { FriendsOverview } from "@/app/components/live/friends-overview";
import type { AuthOptions } from "@/lib/auth";
import "@/app/globals.css";
import { LocaleProvider } from "@/app/providers/LocaleProvider";
import { LanguageSwitcher } from "@/app/components/ui/language-switcher";
import { localeCookie, resolveLocale } from "@/lib/i18n";

// Exercise the production components with React's development effect replay.
// Persistence, authentication and Next's router/image optimization are replaced; no live data is used.
const options: AuthOptions = { username: { enabled: true, required: true }, firstName: { enabled: true, required: false }, lastName: { enabled: true, required: false }, password: { enabled: true, required: true }, social: [{ strategy: "oauth_google", name: "Google" }], signupMode: "public" };
const auth = new URLSearchParams(window.location.search).get("auth");
const screen = new URLSearchParams(window.location.search).get("screen");
const initialLocale = resolveLocale(document.cookie.split("; ").find(cookie => cookie.startsWith(`${localeCookie}=`))?.split("=")[1]);
createRoot(document.getElementById("root")!).render(
  <StrictMode><LocaleProvider initialLocale={initialLocale}><div style={{ padding: "16px 22px", display: "flex", justifyContent: "flex-end" }}><LanguageSwitcher /></div>{screen === "lists" ? <main className="main-content"><LiveListsPage /></main> : screen === "invite" ? <main className="main-content invite-main"><InviteEntry token={"A".repeat(43)} /></main> : screen === "friends" ? <main className="main-content"><FriendsOverview /></main> : auth === "menu" ? <header className="app-header"><div className="header-inner"><span>Regalando</span><AccountMenu /></div></header> : auth ? <main className="auth-panel" style={{ maxWidth: 440, margin: "40px auto" }}>{auth === "signup" ? <CustomSignUp options={options} /> : <CustomSignIn options={options} />}</main> : <main className="main-content"><LiveListDetail id="fixture-list" /></main>}</LocaleProvider></StrictMode>,
);
