// ─── Version Gate (passcode + selector) ───────────────────────────────────────
// Standalone script for the repo-root landing page. Deliberately NOT part of
// any version's app — the versions under versions/*/ each load their own set
// of <script> tags into one shared global namespace (state, render(), go(),
// etc. per versions/v1/CLAUDE.md conventions), so this page must never load
// two versions' scripts together. Picking a version is a real page navigation
// (location.href), so each version boots fresh in its own document.
//
// The passcode is a speed bump against a shared link getting forwarded
// thoughtlessly — not real security. It's plaintext on purpose.

var GATE_PASSCODE = "1337";
var GATE_SESSION_KEY = "mb_gate_unlocked";

// Add a version here (and only here) to make it selectable — no markup changes.
var VERSIONS = [
  { id: "v1", label: "v1", path: "versions/v1/index.html" },
  { id: "v2", label: "v2 (beta)", path: "versions/v2/index.html" }
];

function gateShowSelector() {
  document.getElementById("passcodeScreen").style.display = "none";
  var selector = document.getElementById("selectorScreen");
  selector.style.display = "flex";
  var buttons = VERSIONS.map(function (v) {
    return '<button type="button" class="gate-btn" onclick="location.href=\'' + v.path + '\'">' + v.label + "</button>";
  }).join("");
  document.getElementById("versionList").innerHTML = buttons;
}

function gateShowPasscode() {
  document.getElementById("selectorScreen").style.display = "none";
  document.getElementById("passcodeScreen").style.display = "flex";
  var input = document.getElementById("gateInput");
  input.value = "";
  input.focus();
}

function gateSubmit() {
  var input = document.getElementById("gateInput");
  var error = document.getElementById("gateError");
  if (input.value === GATE_PASSCODE) {
    error.style.display = "none";
    try { sessionStorage.setItem(GATE_SESSION_KEY, "1"); } catch (e) { /* private-mode storage block — non-fatal, just re-asks next load */ }
    gateShowSelector();
  } else {
    error.style.display = "block";
    input.value = "";
    input.focus();
  }
}

function gateInit() {
  var unlocked = false;
  try { unlocked = sessionStorage.getItem(GATE_SESSION_KEY) === "1"; } catch (e) { /* private-mode storage block */ }

  if (unlocked) {
    gateShowSelector();
  } else {
    gateShowPasscode();
  }

  document.getElementById("gateInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") gateSubmit();
  });
}

document.addEventListener("DOMContentLoaded", gateInit);
