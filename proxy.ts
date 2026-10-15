import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

const withClerk = clerkMiddleware({ signInUrl: "/sign-in", signUpUrl: "/sign-up" });

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }
  return withClerk(request, event);
}

export const config = {
  matcher: ["/lists/:path*", "/friends/:path*", "/invite/:path*", "/sign-in/:path*", "/sign-up/:path*", "/sso-callback/:path*"],
};
