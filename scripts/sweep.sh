#!/usr/bin/env bash
# Phase 6 correctness sweep — run from the repo root.
#
#   bash scripts/sweep.sh
#
# Concatenates the DOM stub, every <script> in versions/v3/index.html in load
# order, and scripts/sweep.js into one file, then runs it under jsc. One script
# rather than separate evaluations, because separately-evaluated scripts do not
# share top-level `const` bindings but a browser's <script> tags do.
#
# Exits non-zero if any check fails.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

JSC="/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
[ -x "$JSC" ] || { echo "error: jsc not found (macOS only)" >&2; exit 2; }

APP="versions/v3"
OUT="$(mktemp -t mb-sweep).js"
trap 'rm -f "$OUT"' EXIT

# ── DOM stub ────────────────────────────────────────────────────────────────
cat > "$OUT" <<'STUB'
function El(i){this.id=i;this.style={};this.dataset={};this.innerHTML="";this.textContent="";this.value="";
 this.scrollTop=0;this.src="";this.onended=null;
 this.play=function(){return {catch:function(){}};};this.pause=function(){};
 this.classList={toggle:function(){},add:function(){},remove:function(){},contains:function(){return false;}};
 this.focus=function(){};this.setSelectionRange=function(){};this.addEventListener=function(){};
 this.appendChild=function(){};this.querySelector=function(){return new El("q");};
 this.querySelectorAll=function(){return [];};
 this.getBoundingClientRect=function(){return{top:0,left:0,width:0,height:0};};}
var __e={};
var document={getElementById:function(i){if(!__e[i])__e[i]=new El(i);return __e[i];},
 querySelector:function(s){if(!__e[s])__e[s]=new El(s);return __e[s];},
 querySelectorAll:function(){return [];},createElement:function(){return new El("n");},
 addEventListener:function(){},body:new El("b"),documentElement:new El("h")};
var window={addEventListener:function(){},__navLog:[],__lastError:null,
 matchMedia:function(){return{matches:false,addEventListener:function(){}};},
 scrollTo:function(){},getComputedStyle:function(){return {};}};
var history={pushState:function(){},replaceState:function(){},back:function(){}};
var performance={getEntriesByType:function(){return[{type:"navigate"}];},navigation:{type:0},now:function(){return 0;}};
var navigator={clipboard:{writeText:function(){return{then:function(f){f();return{catch:function(){}};}};}},userAgent:"jsc"};
var sessionStorage={getItem:function(){return null;},setItem:function(){}};
var localStorage=sessionStorage;
var location={href:"",replace:function(){}};
var alert=function(){},prompt=function(){},confirm=function(){return true;};
var setTimeout=function(){return 0;},clearTimeout=function(){},setInterval=function(){return 0;},clearInterval=function(){};
var requestAnimationFrame=function(){return 0;},cancelAnimationFrame=function(){};
var Audio=function(){return new El("audio");};
var console={warn:function(){},log:function(){},error:function(){}};
STUB

# ── the app, in index.html's load order ─────────────────────────────────────
n=0
while read -r src; do
  [ -f "$APP/$src" ] || { echo "error: index.html references missing $src" >&2; exit 1; }
  printf '\n// ══ %s ══\n' "$src" >> "$OUT"
  cat "$APP/$src" >> "$OUT"
  n=$((n + 1))
done < <(grep -o 'src="[^"]*\.js"' "$APP/index.html" | sed 's/src="//;s/"//')

printf '\n// ══ sweep ══\n' >> "$OUT"
cat scripts/sweep.js >> "$OUT"

echo "Money Buddy v3 — Phase 6 sweep  ($n app files)"
"$JSC" "$OUT"
