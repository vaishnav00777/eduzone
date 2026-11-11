import { createAuthClient } from "https://esm.sh/@neon/auth";

const authUrl = new URL("/api/auth", window.location.origin).toString();
const auth = createAuthClient(authUrl);
const $ = (id) => document.getElementById(id);
let signedIn = false;
let resources = [];

function setStatus(id, message, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("is-error", isError);
}
function showSignedIn(user) {
  signedIn = true;
  $("adminSignedOut").hidden = true;
  $("adminSignedIn").hidden = false;
  $("adminIdentity").textContent = user.email || "";
  loadResources();
}
function showSignedOut() {
  signedIn = false;
  $("adminSignedOut").hidden = false;
  $("adminSignedIn").hidden = true;
}
async function getBearerToken() {
  const result = await auth.token();
  if (result.error || !result.data?.token) throw new Error(result.error?.message || "Your sign-in has expired. Please sign in again.");
  return result.data.token;
}
async function api(path, options = {}) {
  const token = await getBearerToken();
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
}
function renderResourceRows() {
  const list = $("adminResourceList");
  list.replaceChildren();
  $("adminResourceCount").textContent = resources.length + " resources";
  resources.forEach((item) => {
    const row = document.createElement("div");
    row.className = "admin-resource-row";
    const details = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.title;
    const meta = document.createElement("span");
    meta.textContent = item.level + " · " + item.subject;
    details.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "admin-row-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => fillForm(item));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-action";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!window.confirm('Delete "' + item.title + '" from the shared catalogue?')) return;
      try {
        await api("/api/resources?id=" + encodeURIComponent(item.id), { method: "DELETE" });
        setStatus("adminStatus", "Resource deleted from the shared catalogue.");
        await loadResources();
      } catch (error) { setStatus("adminStatus", error.message, true); }
    });
    actions.append(edit, remove);
    row.append(details, actions);
    list.append(row);
  });
}
async function loadResources() {
  try {
    const response = await fetch("/api/resources", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load the shared catalogue.");
    resources = await response.json();
    renderResourceRows();
    if (window.setEduZoneResources) window.setEduZoneResources(resources);
  } catch (error) {
    $("adminResourceCount").textContent = "Unable to load";
    setStatus("adminStatus", error.message, true);
  }
}
function resetForm() {
  $("resourceForm").reset();
  $("editResourceId").value = "";
  $("adminIcon").value = "📘";
  $("formHeading").textContent = "Add a learning resource";
  $("saveResource").textContent = "Save resource";
  $("cancelEdit").hidden = true;
}
function fillForm(item) {
  $("editResourceId").value = item.id;
  $("adminTitle").value = item.title;
  $("adminLevel").value = item.level;
  $("adminSubject").value = item.subject;
  $("adminDescription").value = item.description;
  $("adminUrl").value = item.url;
  $("adminType").value = item.type;
  $("adminIcon").value = item.icon || "📘";
  $("formHeading").textContent = "Edit learning resource";
  $("saveResource").textContent = "Update resource";
  $("cancelEdit").hidden = false;
  $("resourceForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("adminToggle").addEventListener("click", () => {
  const panel = $("adminPanel");
  const open = panel.hidden;
  panel.hidden = !open;
  $("adminToggle").setAttribute("aria-expanded", String(open));
  $("adminToggle").textContent = open ? "Close admin panel" : "Admin login";
});
$("adminLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("sendMagicLink");
  button.disabled = true;
  button.textContent = "Sending…";
  setStatus("adminAuthStatus", "Requesting a secure sign-in link…");
  try {
    const result = await auth.signIn.magicLink({
      email: $("adminEmail").value.trim(),
      callbackURL: window.location.origin + "/?admin=1"
    });
    if (result.error) throw new Error(result.error.message || "Unable to send the sign-in link.");
    setStatus("adminAuthStatus", "If the administrator account is eligible, a sign-in link has been sent. Check your inbox and spam folder.");
  } catch (error) {
    setStatus("adminAuthStatus", error.message || "Could not send the sign-in link.", true);
  } finally {
    button.disabled = false;
    button.textContent = "Send sign-in link";
  }
});
$("adminSignOut").addEventListener("click", async () => {
  try { await auth.signOut(); } catch (_) {}
  showSignedOut();
  setStatus("adminAuthStatus", "You have signed out.");
});
$("resourceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("saveResource");
  button.disabled = true;
  const id = $("editResourceId").value;
  const payload = {
    id,
    title: $("adminTitle").value.trim(),
    level: $("adminLevel").value,
    subject: $("adminSubject").value,
    description: $("adminDescription").value.trim(),
    url: $("adminUrl").value.trim(),
    type: $("adminType").value.trim() || "Learning resource",
    icon: $("adminIcon").value.trim() || "📘"
  };
  try {
    await api("/api/resources", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    setStatus("adminStatus", id ? "Resource updated for all EduZone visitors." : "Resource added to the shared catalogue.");
    resetForm();
    await loadResources();
  } catch (error) {
    setStatus("adminStatus", error.message, true);
  } finally { button.disabled = false; }
});
$("cancelEdit").addEventListener("click", resetForm);

async function initialiseAuth() {
  const hasVerifier = new URLSearchParams(window.location.search).has("neon_auth_session_verifier");
  try {
    // getSession also completes Neon Auth's magic-link verifier hand-off on return.
    const result = await auth.getSession();
    const session = result.data;
    const user = session?.user;
    if (hasVerifier) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("neon_auth_session_verifier");
      clean.searchParams.delete("admin");
      window.history.replaceState({}, document.title, clean.pathname + clean.search + clean.hash);
    }
    if (user && String(user.email || "").toLowerCase() === "vaishnavs56758@gmail.com") {
      showSignedIn(user);
    } else {
      showSignedOut();
      if (user) setStatus("adminAuthStatus", "This account is not the registered EduZone administrator.", true);
    }
  } catch (error) {
    showSignedOut();
    if (hasVerifier) setStatus("adminAuthStatus", "The sign-in link could not be completed. Please request a new link.", true);
  }
}
initialiseAuth();

// The catalogue is public; only write operations require an admin JWT.
fetch("/api/resources", { cache: "no-store" })
  .then(response => response.ok ? response.json() : [])
  .then(items => { if (Array.isArray(items) && window.setEduZoneResources) window.setEduZoneResources(items); })
  .catch(() => {});
