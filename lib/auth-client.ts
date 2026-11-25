import { createAuthClient } from "better-auth/react";
import { oauthPopupClient } from "better-auth/client/plugins";

function resolveClientBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: resolveClientBaseUrl(),
  plugins: [oauthPopupClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;
export default authClient;
