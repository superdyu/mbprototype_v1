// ─── Shared Top Bar ───────────────────────────────────────────────────────────
// NEW IN v3 — v2 had no shared top bar; every screen rendered its own header.
// 03-home-daily-loop puts kibble, streak and buddy level up here, and L5 puts
// the home/back control in the top-left, so one component owns the strip.
//
//   ┌────────────────────────────────────────────┐
//   │ [◄ or ⌂]   🦴 240 · 🔥 6 · Lv 3        [☰] │
//   └────────────────────────────────────────────┘
//
// LEFT SLOT is contextual (L5). Back and home are mutually exclusive — two
// competing escapes on one screen is what confuses testers:
//
//   stack depth > 1          → Back   (pops the active stack)
//   stack depth = 1, not home→ Home   (switches to the home stack)
//   full-bleed / nav hidden  → Back only, home suppressed
//   on Home itself           → nothing
//
// The back button is the SINGLE source of back navigation. v2's per-screen
// "← Budget" buttons were hardcoded forward-jumps to a fixed destination, which
// is wrong once the same screen can be reached from two places — that is the
// whole point of the per-stack model in architecture §7.

const TOPBAR_HIDDEN_SCREENS = ["streak"];   // full-bleed splash owns the viewport

function renderTopBar() {
  if (TOPBAR_HIDDEN_SCREENS.includes(state.screen)) return "";

  const fullBleed = !NAV_VISIBLE_SCREENS.includes(state.screen);
  const depth     = navDepth();
  const onHome    = state.screen === "home" && depth === 1;

  // Left slot — back wins over home whenever there is somewhere to go back to.
  let left = `<span class="topbar-slot"></span>`;
  if (depth > 1) {
    left = `<button class="topbar-btn" type="button" onclick="navBack()" aria-label="Back">‹</button>`;
  } else if (!onHome && !fullBleed) {
    left = `<button class="topbar-btn" type="button" onclick="navGoTab('home')" aria-label="Home">${TOPBAR_HOME_ICON}</button>`;
  } else if (fullBleed) {
    // Nav is hidden here, so back is the only exit. Depth 1 on a full-bleed
    // screen means it was entered as a stack root — fall back to home.
    left = `<button class="topbar-btn" type="button" onclick="navBack()" aria-label="Back">‹</button>`;
  }

  // Full-bleed screens get the back control only — no status strip competing
  // with a focused flow (journal entry, lesson, daily update).
  if (fullBleed) {
    return `<div class="topbar topbar-bare">${left}<span class="topbar-slot"></span></div>`;
  }

  return `
    <div class="topbar">
      ${left}
      <div class="topbar-status" aria-label="Kibble, streak and level">
        <span class="topbar-stat" title="Kibble">${TOPBAR_KIBBLE_ICON}${h(state.kibble)}</span>
        <span class="topbar-dot">·</span>
        <span class="topbar-stat" title="Day streak">${TOPBAR_STREAK_ICON}${h(state.streak)}</span>
        <span class="topbar-dot">·</span>
        <span class="topbar-stat" title="Buddy level">Lv&nbsp;${h(state.buddyLevel)}</span>
      </div>
      <button class="topbar-btn" type="button" onclick="topbarToggleMenu()" aria-label="Menu">☰</button>
    </div>
    ${state.topbarMenuOpen ? renderTopBarMenu() : ""}
  `;
}

// Half-screen overlay for system information (03-home-daily-loop). Contents are
// Phase 3's job; the shell and the dismiss behaviour live here.
function renderTopBarMenu() {
  return `
    <div class="topbar-menu-scrim" onclick="topbarToggleMenu()"></div>
    <div class="topbar-menu" role="dialog" aria-label="Menu">
      <p class="section-title" style="margin:0 0 8px;">Money Buddy</p>
      <p class="helper" style="margin:0 0 14px;">
        ${h(state.profile ? state.profile.name : "")} · ${h(state.profile ? state.profile.zip : "")}
      </p>
      <button class="button secondary full" type="button" onclick="topbarToggleMenu();navAdminJump('settings')">Settings</button>
      <p class="helper" style="margin:14px 0 0;font-size:10px;">
        Prototype build — nothing here is financial advice.
      </p>
    </div>
  `;
}

function topbarToggleMenu() {
  state.topbarMenuOpen = !state.topbarMenuOpen;
  render();
}

// Inline SVG — no icon library under L1 (no npm, so no lucide-react).
// Sized to sit inside the 44px tap target rather than fill it.
const TOPBAR_HOME_ICON =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
  'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/></svg>';

const TOPBAR_KIBBLE_ICON = '<span class="topbar-ico" aria-hidden="true">🦴</span>';
const TOPBAR_STREAK_ICON = '<span class="topbar-ico" aria-hidden="true">🔥</span>';
