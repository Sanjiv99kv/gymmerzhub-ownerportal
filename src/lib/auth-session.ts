import { clearSession, expireSessionToLogin, getAccessToken } from "@/lib/tenant";
import { logoutOwner } from "@/lib/owner-auth-api";

/** Revoke session on the API (best-effort), then clear local session. */
export async function logoutOwnerSession() {
  const token = getAccessToken();
  if (token) {
    try {
      await logoutOwner(token);
    } catch {
      // Still clear local session if the network/API call fails.
    }
  }
  clearSession();
}

/** Local logout when the server session is already missing or revoked. */
export function expireOwnerSession() {
  expireSessionToLogin();
}
