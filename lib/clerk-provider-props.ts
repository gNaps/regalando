import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "./clerk-appearance";

export const clerkProviderProps = {
  appearance: clerkAppearance,
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
  signInFallbackRedirectUrl: "/lists",
  signUpFallbackRedirectUrl: "/lists",
} satisfies Omit<ComponentProps<typeof ClerkProvider>, "children">;
