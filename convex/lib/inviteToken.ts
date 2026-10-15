export const inviteTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export async function tokenDigest(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
