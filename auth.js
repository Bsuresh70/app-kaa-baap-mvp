import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.APP_AUTH_CONFIG || {};
const accountButton = document.getElementById("accountButton");
const loginDialog = document.getElementById("loginDialog");
const googleButton = document.getElementById("googleSignIn");
const closeButton = document.getElementById("closeLogin");
const guestButton = document.getElementById("continueGuest");
const authMessage = document.getElementById("authMessage");
let supabase = null;

function showLogin(message = "") {
  authMessage.textContent = message;
  loginDialog.hidden = false;
  googleButton.focus();
}
function hideLogin() {
  loginDialog.hidden = true;
}
function setAccount(user) {
  if (!user) {
    accountButton.textContent = "Sign in";
    accountButton.classList.remove("signed-in");
    accountButton.title = "Sign in with Google";
    accountButton.dataset.signedIn = "false";
    return;
  }
  const label = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "My account";
  accountButton.textContent = label;
  accountButton.classList.add("signed-in");
  accountButton.title = "Signed in. Click to sign out.";
  accountButton.dataset.signedIn = "true";
  hideLogin();
}

accountButton.addEventListener("click", async () => {
  if (accountButton.dataset.signedIn === "true" && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) showLogin("Could not sign out. Please try again.");
    else setAccount(null);
    return;
  }
  showLogin();
});
closeButton.addEventListener("click", hideLogin);
guestButton.addEventListener("click", hideLogin);
loginDialog.addEventListener("click", event => {
  if (event.target === loginDialog) hideLogin();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !loginDialog.hidden) hideLogin();
});

const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
if (configured) {
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  supabase.auth.getSession().then(({ data }) => setAccount(data.session?.user || null));
  supabase.auth.onAuthStateChange((_event, session) => setAccount(session?.user || null));
} else {
  googleButton.addEventListener("click", () => {
    authMessage.textContent = "Google sign-in is not configured yet. Add the Supabase project URL and public key to auth-config.js, then enable Google in Supabase.";
  });
}

googleButton.addEventListener("click", async () => {
  if (!supabase) return;
  googleButton.disabled = true;
  authMessage.textContent = "Connecting securely to Google…";
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: "select_account" }
    }
  });
  if (error) {
    authMessage.textContent = error.message || "Google sign-in could not start. Please try again.";
    googleButton.disabled = false;
  }
});
