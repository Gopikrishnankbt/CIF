const NAV = [
  ["dashboard", "Dashboard"],
  ["calendar", "Bookings"],
  ["event-types", "Event Types"],
  ["availability", "Availability"],
  ["teams", "Teams"],
  ["workflows", "Workflows"],
  ["routing-forms", "Routing Forms"],
  ["integrations", "Integrations"],
  ["apps", "App Store"],
  ["billing", "Billing"],
  ["settings", "Settings"],
  ["public-booking", "Public Booking"],
];

const defaults = {
  events: [
    { id: crypto.randomUUID(), name: "30-min Intro Call", slug: "intro-call", duration: 30, location: "Google Meet", price: 0, active: true },
    { id: crypto.randomUUID(), name: "Product Demo", slug: "product-demo", duration: 45, location: "Zoom", price: 0, active: true },
  ],
  bookings: [],
  availability: {
    timezone: "UTC",
    schedule: {
      Mon: ["09:00", "17:00"], Tue: ["09:00", "17:00"], Wed: ["09:00", "17:00"], Thu: ["09:00", "17:00"], Fri: ["09:00", "16:00"],
    },
    buffers: { before: 10, after: 10 },
  },
  team: [
    { name: "Alex Founder", role: "Owner", seats: "calendar+booking" },
    { name: "Sam Ops", role: "Admin", seats: "routing+workflows" },
  ],
  integrations: [
    { name: "Google Calendar", status: "connected" },
    { name: "Stripe", status: "available" },
    { name: "Zoom", status: "connected" },
    { name: "Slack", status: "available" },
  ],
};

const state = loadState();
const content = document.getElementById("page-content");
const titleEl = document.getElementById("page-title");
const subtitleEl = document.getElementById("page-subtitle");

buildSidebar();
bindTopbarActions();
route();
window.addEventListener("hashchange", route);

function loadState() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem("calclone-state") || "{}") };
  } catch {
    return { ...defaults };
  }
}
function saveState() {
  localStorage.setItem("calclone-state", JSON.stringify(state));
}

function buildSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = `<div class="brand">CalClone</div><ul class="nav-list">${NAV.map(([key, label]) => `<li><button data-key="${key}">${label}</button></li>`).join("")}</ul>`;
  sidebar.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => (location.hash = btn.dataset.key)));
}

function bindTopbarActions() {
  document.getElementById("create-event-btn").onclick = openCreateEventModal;
  document.getElementById("seed-btn").onclick = () => {
    state.bookings = [
      { id: crypto.randomUUID(), event: "30-min Intro Call", when: new Date().toISOString(), guest: "Ari", email: "ari@mail.com", status: "confirmed" },
      { id: crypto.randomUUID(), event: "Product Demo", when: new Date(Date.now() + 86400000).toISOString(), guest: "Mina", email: "mina@mail.com", status: "pending" },
    ];
    saveState();
    toast("Demo bookings generated");
    route();
  };
}

function route() {
  const page = (location.hash.replace("#", "") || "dashboard").trim();
  highlightNav(page);
  const routes = {
    dashboard: renderDashboard,
    calendar: renderBookings,
    "event-types": renderEvents,
    availability: renderAvailability,
    teams: renderTeams,
    workflows: renderWorkflows,
    "routing-forms": renderRouting,
    integrations: renderIntegrations,
    apps: renderApps,
    billing: renderBilling,
    settings: renderSettings,
    "public-booking": renderPublicBooking,
  };
  (routes[page] || renderDashboard)();
}

function highlightNav(key) {
  document.querySelectorAll(".nav-list button").forEach(btn => btn.classList.toggle("active", btn.dataset.key === key));
}

function setHeader(title, subtitle) {
  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
}

function renderDashboard() {
  setHeader("Dashboard", "Overview of bookings, event performance, and team activity.");
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = state.bookings.filter(b => b.when.startsWith(today)).length;
  const upcoming = state.bookings.filter(b => new Date(b.when) > new Date()).length;
  content.innerHTML = `
    <article class="card"><h3>Today</h3><div class="metric-value">${todayCount}</div><p class="muted">Scheduled slots today</p></article>
    <article class="card"><h3>Upcoming</h3><div class="metric-value">${upcoming}</div><p class="muted">Future bookings</p></article>
    <article class="card"><h3>Active Event Types</h3><div class="metric-value">${state.events.filter(e => e.active).length}</div><p class="muted">Publicly bookable links</p></article>
    <article class="card"><h3>Automation Health</h3><span class="status success">All workflows healthy</span><ul class="list"><li>Reminder emails: enabled</li><li>Follow-up SMS: queued</li><li>Round-robin routing: active</li></ul></article>
  `;
}

function renderBookings() {
  setHeader("Bookings", "View and manage all booked slots.");
  const rows = state.bookings.map(b => `<tr><td>${fmtDate(b.when)}</td><td>${b.event}</td><td>${b.guest}</td><td>${b.email}</td><td><span class="status ${b.status === "confirmed" ? "success" : "warning"}">${b.status}</span></td></tr>`).join("");
  content.innerHTML = `<article class="card" style="grid-column:1/-1"><table class="table"><thead><tr><th>When</th><th>Event</th><th>Guest</th><th>Email</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted">No bookings yet. Use Public Booking page.</td></tr>'}</tbody></table></article>`;
}

function renderEvents() {
  setHeader("Event Types", "Create and customize booking links.");
  content.innerHTML = state.events.map(e => `
    <article class="card">
      <h3>${e.name}</h3>
      <p class="muted">/${e.slug} • ${e.duration} mins • ${e.location}</p>
      <p>${e.price > 0 ? `$${e.price}` : "Free"} • ${e.active ? "Active" : "Hidden"}</p>
      <div class="stack">
        <button data-copy="${location.origin || "https://calclone.app"}/book/${e.slug}" class="secondary copy-btn">Copy Link</button>
      </div>
    </article>
  `).join("");
  content.querySelectorAll(".copy-btn").forEach(btn => btn.onclick = () => {
    navigator.clipboard?.writeText(btn.dataset.copy);
    toast("Booking link copied");
  });
}

function renderAvailability() {
  setHeader("Availability", "Timezone, working hours, and buffer settings.");
  const days = Object.entries(state.availability.schedule).map(([d, [s, e]]) => `<li><strong>${d}</strong>: ${s} - ${e}</li>`).join("");
  content.innerHTML = `
    <article class="card"><h3>Timezone</h3><p>${state.availability.timezone}</p></article>
    <article class="card"><h3>Buffers</h3><p>${state.availability.buffers.before} min before / ${state.availability.buffers.after} min after</p></article>
    <article class="card"><h3>Weekly Schedule</h3><ul class="list">${days}</ul></article>
  `;
}

function renderTeams() {
  setHeader("Teams", "Members, permissions, and pooled calendars.");
  content.innerHTML = `
    <article class="card" style="grid-column:1/-1">
      <table class="table"><thead><tr><th>Name</th><th>Role</th><th>Seats</th></tr></thead><tbody>
      ${state.team.map(m => `<tr><td>${m.name}</td><td>${m.role}</td><td>${m.seats}</td></tr>`).join("")}
      </tbody></table>
    </article>
    <article class="card"><h3>Round Robin</h3><p class="muted">Distribute bookings equally across team members.</p></article>
    <article class="card"><h3>Collective Events</h3><p class="muted">Require multiple hosts for one booking.</p></article>
  `;
}

function renderWorkflows() {
  setHeader("Workflows", "Automations for reminders and follow-ups.");
  content.innerHTML = `
    <article class="card"><h3>Email Reminder</h3><p>24h before booking</p><span class="status success">Enabled</span></article>
    <article class="card"><h3>SMS Reminder</h3><p>30m before booking</p><span class="status warning">Draft</span></article>
    <article class="card"><h3>Webhook Trigger</h3><p>On booking.created</p><span class="status success">Enabled</span></article>
  `;
}

function renderRouting() {
  setHeader("Routing Forms", "Route leads to the right host based on answers.");
  content.innerHTML = `
    <article class="card" style="grid-column:1/-1">
      <h3>Lead Qualification Form</h3>
      <p class="muted">Sample logic:</p>
      <ul class="list">
        <li>If team size > 50 → route to Enterprise Demo</li>
        <li>If budget < $500 → route to Self-serve Onboarding</li>
        <li>If region = EU → assign EU host pool</li>
      </ul>
    </article>
  `;
}

function renderIntegrations() {
  setHeader("Integrations", "Connect calendars, video, payments, and CRM.");
  content.innerHTML = state.integrations.map(i => `<article class="card"><h3>${i.name}</h3><span class="status ${i.status === "connected" ? "success" : "warning"}">${i.status}</span></article>`).join("");
}

function renderApps() {
  setHeader("App Store", "Install apps to extend scheduling workflows.");
  const apps = ["HubSpot", "Salesforce", "Notion", "Zapier", "CalDAV", "Teams"]; 
  content.innerHTML = apps.map(app => `<article class="card"><h3>${app}</h3><p class="muted">Install to sync with ${app}.</p><button class="secondary">Install</button></article>`).join("");
}

function renderBilling() {
  setHeader("Billing", "Plans, usage, and seat management.");
  content.innerHTML = `
    <article class="card"><h3>Current Plan</h3><p>Teams Pro</p><p class="muted">10 seats • annual billing</p></article>
    <article class="card"><h3>Usage</h3><p>347 bookings this month</p><p class="muted">Within fair-usage thresholds</p></article>
    <article class="card"><h3>Payouts</h3><p>Stripe connected for paid event types</p></article>
  `;
}

function renderSettings() {
  setHeader("Settings", "Profile, branding, domains, and privacy.");
  content.innerHTML = `
    <article class="card"><h3>Profile</h3><p class="muted">Name, avatar, locale, and time format.</p></article>
    <article class="card"><h3>Branding</h3><p class="muted">Logo, accent color, and custom confirmation page.</p></article>
    <article class="card"><h3>Domains</h3><p class="muted">booking.yourcompany.com mapped and verified.</p></article>
    <article class="card"><h3>Security</h3><p class="muted">SSO/SAML, SCIM, audit logs, and data residency.</p></article>
  `;
}

function renderPublicBooking() {
  setHeader("Public Booking", "Client-facing scheduling flow.");
  const template = document.getElementById("booking-template").content.cloneNode(true);
  const select = state.events[0];
  template.getElementById("booking-event-name").textContent = select.name;
  const dateInput = template.getElementById("booking-date");
  dateInput.valueAsDate = new Date();
  const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00"];
  const slotEl = template.getElementById("timeslots");
  let chosen = slots[0];
  const paintSlots = () => {
    slotEl.innerHTML = slots.map(s => `<div class="slot ${s === chosen ? "active" : ""}" data-time="${s}">${s}</div>`).join("");
    slotEl.querySelectorAll(".slot").forEach(s => s.onclick = () => {
      chosen = s.dataset.time;
      paintSlots();
    });
  };
  paintSlots();

  template.getElementById("booking-form").onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const when = `${dateInput.value}T${chosen}:00.000Z`;
    state.bookings.unshift({
      id: crypto.randomUUID(),
      event: select.name,
      when,
      guest: fd.get("name"),
      email: fd.get("email"),
      notes: fd.get("notes"),
      status: "confirmed",
    });
    saveState();
    toast("Booking confirmed");
    location.hash = "calendar";
  };

  content.innerHTML = "";
  content.appendChild(template);
}

function openCreateEventModal() {
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-backdrop" id="modal-close">
      <div class="modal" onclick="event.stopPropagation()">
        <h3>Create Event Type</h3>
        <form id="event-form" class="stack">
          <label>Name<input name="name" required /></label>
          <label>Slug<input name="slug" required /></label>
          <label>Duration (mins)<input type="number" name="duration" value="30" min="5" /></label>
          <label>Location<select name="location"><option>Google Meet</option><option>Zoom</option><option>Phone call</option><option>In Person</option></select></label>
          <button class="primary" type="submit">Create</button>
        </form>
      </div>
    </div>
  `;
  const root = document.getElementById("modal-root");
  root.querySelector("#modal-close").onclick = () => (root.innerHTML = "");
  root.querySelector("#event-form").onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    state.events.unshift({
      id: crypto.randomUUID(),
      name: fd.get("name"),
      slug: fd.get("slug"),
      duration: Number(fd.get("duration")),
      location: fd.get("location"),
      price: 0,
      active: true,
    });
    saveState();
    root.innerHTML = "";
    toast("Event type created");
    location.hash = "event-types";
  };
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString();
}

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1900);
}
