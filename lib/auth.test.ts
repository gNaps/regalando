import { describe, expect, test } from "vitest";
import { authError, authRedirect } from "./auth";

describe("destinazione dopo l’accesso", () => {
  const origin = "https://regalando.example";
  test("mantiene la lista richiesta anche da un URL assoluto interno", () => {
    expect(authRedirect("/lists/festa?sort=price#regalo", origin)).toBe("/lists/festa?sort=price#regalo");
    expect(authRedirect(`${origin}/lists/festa`, origin)).toBe("/lists/festa");
  });
  test("blocca siti esterni, percorsi di autenticazione e prefissi ingannevoli", () => {
    for (const url of ["https://example.org/lists", "//example.org/lists", "/sign-in", "/lists-fake", "/lists/../../sign-in", "javascript:alert(1)", "https://["]) {
      expect(authRedirect(url, origin)).toBe("/lists");
    }
    expect(authRedirect(null, origin)).toBe("/lists");
  });
  test("conserva l’invito dopo login, registrazione, OAuth e verifica della sessione", () => {
    const path = `/invite/${"A".repeat(43)}`;
    expect(authRedirect(path, origin)).toBe(path);
    expect(authRedirect(`${origin}${path}`, origin)).toBe(path);
    expect(authRedirect("/friends", origin)).toBe("/friends");
    for (const invalid of ["/invite/short", `${path}/extra`, `https://evil.example${path}`, "/friends/evil"]) expect(authRedirect(invalid, origin)).toBe("/lists");
  });
});

describe("errori di autenticazione", () => {
  test("localizza anche gli errori API contenuti in cause", () => {
    expect(authError({ code: "api_response_error", cause: { errors: [{ code: "form_code_incorrect" }] } })).toContain("codice");
    expect(authError({ code: "form_password_pwned" })).toContain("violazione");
    expect(authError({ errors: [{ code: "too_many_requests" }] })).toContain("Attendi");
  });
  test("non espone messaggi tecnici o dati restituiti dal provider", () => {
    expect(authError({ message: "private@example.org password secret", errors: [{ code: "unknown" }] })).not.toContain("secret");
  });
});
