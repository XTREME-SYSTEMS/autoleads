import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";

/**
 * Resolves the app ID from multiple sources, since appParams.appId can be
 * null in the preview iframe when the URL lacks ?app_id= and the Vite env
 * var isn't injected into the client bundle.
 */
function resolveAppId() {
  if (appParams.appId) return appParams.appId;
  try {
    const favicon = document.querySelector("link[rel='icon']")?.href || "";
    const match = favicon.match(/\/images\/public\/([a-f0-9]{20,})\//);
    if (match) return match[1];
  } catch {}
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get("app_id");
    if (fromUrl) return fromUrl;
  } catch {}
  try {
    const stored = localStorage.getItem("base44_app_id");
    if (stored) return stored;
  } catch {}
  return null;
}

/**
 * Initiates Google OAuth login.
 *
 * In the Base44 preview iframe, the SDK's popup flow can fail during the
 * OAuth callback with "Invalid id value: null" when the app ID isn't
 * available. This utility opens the auth URL in a new browser tab (a
 * full-page context with no iframe restrictions), then detects the
 * resulting access token via the `storage` event and reloads the iframe.
 *
 * @param {string} returnTo - Same-origin path to return to after login.
 */
export function loginWithGoogle(returnTo = "/dashboard") {
  const appId = resolveAppId();
  if (!appId) {
    // No app ID available — fall back to SDK (which may also fail, but
    // at least surfaces the error through its own flow).
    base44.auth.loginWithProvider("google", returnTo);
    return;
  }

  try {
    if (window.self !== window.top) {
      const redirectUrl = window.location.origin + returnTo;
      const authUrl =
        `${window.location.origin}/api/apps/auth/login` +
        `?app_id=${encodeURIComponent(appId)}` +
        `&from_url=${encodeURIComponent(redirectUrl)}`;

      const oldToken = localStorage.getItem("base44_access_token");

      const popup = window.open(authUrl, "_blank");
      if (!popup) {
        base44.auth.loginWithProvider("google", returnTo);
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("storage", onStorage);
        clearInterval(pollTimer);
        window.location.reload();
      };
      const onStorage = (e) => {
        if (e.key === "base44_access_token" && e.newValue && e.newValue !== oldToken) {
          finish();
        }
      };
      const pollTimer = setInterval(() => {
        if (settled) return;
        const currentToken = localStorage.getItem("base44_access_token");
        if (currentToken && currentToken !== oldToken) {
          finish();
        } else if (popup.closed) {
          settled = true;
          window.removeEventListener("storage", onStorage);
          clearInterval(pollTimer);
        }
      }, 1000);

      window.addEventListener("storage", onStorage);
      setTimeout(() => {
        if (!settled) {
          settled = true;
          window.removeEventListener("storage", onStorage);
          clearInterval(pollTimer);
        }
      }, 300000);
      return;
    }
  } catch {
    // Cross-origin — can't access window.top; fall through to SDK default.
  }
  base44.auth.loginWithProvider("google", returnTo);
}