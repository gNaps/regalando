"use client";
import { useSyncExternalStore } from "react";

const eventName = "regalando-guest-session";
export const guestStoragePrefix = "regalando:guest:";
function read(token: string) {
  try {
    const value = window.localStorage.getItem(guestStoragePrefix + token);
    return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  } catch { return null; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener(eventName, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(eventName, callback); };
}
export function useGuestSession(token: string) {
  return useSyncExternalStore(subscribe, () => read(token), () => null);
}
export function saveGuestSession(token: string, secret: string) {
  // A second tab opening the invite must keep an already-saved identity.
  if (!read(token)) window.localStorage.setItem(guestStoragePrefix + token, secret);
  window.dispatchEvent(new Event(eventName));
}
export function forgetGuestSession(token: string) {
  window.localStorage.removeItem(guestStoragePrefix + token);
  window.dispatchEvent(new Event(eventName));
}
