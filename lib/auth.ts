import type { OAuthStrategy } from "@clerk/nextjs/types";

export type AuthOptions = {
  username: { enabled: boolean; required: boolean };
  firstName: { enabled: boolean; required: boolean };
  lastName: { enabled: boolean; required: boolean };
  password: { enabled: boolean; required: boolean };
  social: { strategy: OAuthStrategy; name: string }[];
  signupMode: string;
};

export function authRedirect(value: string | null, origin: string) {
  try {
    const url = new URL(value || "/lists", origin);
    const allowed = url.pathname === "/lists" || url.pathname.startsWith("/lists/") || url.pathname === "/friends" || /^\/invite\/[A-Za-z0-9_-]{43}$/.test(url.pathname);
    if (url.origin !== origin || !allowed) return "/lists";
    return url.pathname + url.search + url.hash;
  } catch { return "/lists"; }
}

export function authError(error: unknown) {
  if (!error || typeof error !== "object") return "Non siamo riusciti a completare la richiesta. Riprova.";
  const value = error as { code?: string; errors?: { code?: string }[]; cause?: unknown };
  const code = value.errors?.[0]?.code || value.code || "";
  if (code === "session_exists") return "Sei già connesso. Ricarica la pagina per riprendere la tua sessione.";
  if (/too_many|rate_limit/.test(code)) return "Hai fatto diversi tentativi. Attendi qualche istante prima di riprovare.";
  if (/password_pwned/.test(code)) return "Questa password è comparsa in una violazione di dati. Scegline una diversa.";
  if (/password_validation|password_length|password_not_strong/.test(code)) return "Scegli una password più sicura e riprova.";
  if (/captcha|protect_check/.test(code)) return "Completa la verifica di sicurezza e riprova.";
  if (/unsupported_factor/.test(code)) return "Per questo account usa l’accesso con Google oppure contatta l’assistenza.";
  if (/password|identification|identifier_not_found/.test(code)) return "Controlla i dati inseriti e riprova. Se hai dimenticato la password, puoi recuperarla.";
  if (/code|verification_failed|verification_expired/.test(code)) return "Il codice non è valido o è scaduto. Controllalo oppure richiedine uno nuovo.";
  if (/identifier_exists|username_taken/.test(code)) return "Email o nome utente sono già in uso. Prova ad accedere oppure scegli un altro nome utente.";
  if (/username|form_param/.test(code)) return "Controlla i campi inseriti. Il nome utente deve rispettare i requisiti dell’account.";
  if (value.cause && value.cause !== error) return authError(value.cause);
  return "Non siamo riusciti a completare la richiesta. Controlla i dati e riprova.";
}
