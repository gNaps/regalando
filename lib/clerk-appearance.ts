import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

export const clerkAppearance: ComponentProps<typeof ClerkProvider>["appearance"] = {
  variables: {
    colorPrimary: "#d2b477",
    colorBackground: "#171719",
    colorForeground: "#f1f1f3",
    colorMutedForeground: "#a5a5ae",
    colorInput: "#101012",
    colorInputForeground: "#f1f1f3",
    colorBorder: "#3c3c43",
    colorDanger: "#eea19c",
    borderRadius: "1rem",
    fontFamily: "var(--font-geist-sans), Arial, sans-serif",
  },
  elements: {
    formButtonPrimary: { color: "#17140d" },
    socialButtonsBlockButton: { color: "#f1f1f3", borderColor: "#3c3c43" },
    footer: { background: "#111113" },
  },
};
