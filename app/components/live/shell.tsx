"use client";

import type { ReactNode } from "react";
import { AppShell } from "../ui/app-shell";
import { AccountMenu } from "./account-menu";

export function LiveShell({ children }: { children: ReactNode }) {
  return <AppShell account={<AccountMenu />}>{children}</AppShell>;
}
