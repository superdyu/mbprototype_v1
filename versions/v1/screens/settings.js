// ─── Settings ─────────────────────────────────────────────────────────────────
// TAB: None (no bottom nav tab) | NAV BAR: Visible
//
// PURPOSE
// App preferences and account configuration.
//
// NAVIGATION
//   Entry: Settings button on Home screen header
//   Exit:  ← Back → home
//
// STATES
//   Coming Soon placeholder — no functional settings implemented yet.
//
// PRODUCTION NOTES
//   Intended for: notification preferences, color mode toggle (currently
//   dev-only in admin panel), linked accounts, data export, profile editing.
//   Color mode persists in state.settings.colorMode — the toggle mechanism
//   exists; it just needs a visible UI surface here instead of the admin panel.

function renderSettings() {
  return `
    <div class="home-header">
      <div>
        <h1 class="title">Settings</h1>
        <p class="subtitle">App preferences and account options.</p>
      </div>
      <button class="button secondary" type="button" onclick="go('home')">Back</button>
    </div>

    <div class="card">
      <div class="section-title">Coming Soon</div>
      <p class="helper">Settings screen is a placeholder. Features will be added here as the app grows.</p>
    </div>
  `;
}
