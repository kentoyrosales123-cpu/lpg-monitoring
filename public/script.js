const API = "";

function getToken() {
  return localStorage.getItem("lpg_token");
}
function getUser() {
  return JSON.parse(localStorage.getItem("lpg_user") || "null");
}
function saveSession(data) {
  localStorage.setItem("lpg_token", data.token);
  localStorage.setItem("lpg_user", JSON.stringify(data.user));
}
function logout() {
  localStorage.removeItem("lpg_token");
  localStorage.removeItem("lpg_user");
  location.href = "/login.html";
}
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}
function toast(message) {
  const el = document.getElementById("toast");
  if (!el) return alert(message);
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}
function requireAuth(role) {
  const user = getUser();
  if (!getToken() || !user) location.href = "/login.html";
  if (role && user?.role !== role)
    location.href =
      user?.role === "admin" ? "/admin-dashboard.html" : "/user-dashboard.html";
}
function formatDate(date) {
  return new Date(date).toLocaleString();
}
function badge(status) {
  return `<span class="badge ${status}">${status}</span>`;
}
async function csvDownloadAdmin() {
  try {
    const res = await fetch("/api/admin/export/csv", {
      headers: authHeaders(),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "CSV export failed.");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "lpg-tank-readings.csv";
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message);
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function handleLogin(e) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target));
  try {
    const data = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    saveSession(data);
    location.href =
      data.user.role === "admin"
        ? "/admin-dashboard.html"
        : "/user-dashboard.html";
  } catch (err) {
    toast(err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target));
  try {
    const data = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    toast(
      data.message ||
        "Registration successful. Please wait for admin approval.",
    );

    setTimeout(() => {
      location.href = "/login.html";
    }, 2000);
  } catch (err) {
    toast(err.message);
  }
}
