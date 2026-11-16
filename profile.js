import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.APP_AUTH_CONFIG || {};
const profileButton = document.getElementById("profileButton");
const dialog = document.getElementById("profileDialog");
const closeButton = document.getElementById("closeProfile");
const form = document.getElementById("profileForm");
const message = document.getElementById("profileMessage");
let supabase = null;
let activeUser = null;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#ffb4a8" : "#9ef0d0";
}
function openDialog() {
  dialog.hidden = false;
  showMessage("");
}
function closeDialog() { dialog.hidden = true; }

async function loadProfile(user) {
  activeUser = user || null;
  profileButton.hidden = !user;
  if (!user || !supabase) return;
  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_categories, preferred_country, preferred_language")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    showMessage("Profile storage is not ready yet. Please run the profile preferences SQL setup.", true);
    return;
  }
  const profile = data || {};
  const selected = Array.isArray(profile.preferred_categories) ? profile.preferred_categories : [];
  form.querySelectorAll('input[name="category"]').forEach(input => {
    input.checked = selected.includes(input.value);
  });
  document.getElementById("preferredCountry").value = profile.preferred_country || "India";
  document.getElementById("preferredLanguage").value = profile.preferred_language || "English";
}

profileButton.addEventListener("click", openDialog);
closeButton.addEventListener("click", closeDialog);
dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !dialog.hidden) closeDialog();
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeUser || !supabase) return;
  const preferred_categories = [...form.querySelectorAll('input[name="category"]:checked')].map(input => input.value);
  const preferred_country = document.getElementById("preferredCountry").value;
  const preferred_language = document.getElementById("preferredLanguage").value;
  const saveButton = form.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  showMessage("Saving your preferences…");
  const { error } = await supabase.from("profiles").update({
    preferred_categories, preferred_country, preferred_language, updated_at: new Date().toISOString()
  }).eq("id", activeUser.id);
  saveButton.disabled = false;
  if (error) {
    showMessage("Could not save preferences. Please check that the profile SQL setup has been run.", true);
    return;
  }
  showMessage("Your preferences have been saved.");
});

if (config.supabaseUrl && config.supabaseAnonKey) {
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const { data } = await supabase.auth.getSession();
  await loadProfile(data.session?.user || null);
  supabase.auth.onAuthStateChange((_event, session) => {
    // Defer profile queries until Supabase has released its auth-state lock.
    queueMicrotask(() => loadProfile(session?.user || null));
  });
}
