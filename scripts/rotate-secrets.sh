#!/usr/bin/env bash
#
# rotate-secrets.sh — One-shot secret rotation helper for Zubite.bg.
#
# What it does:
#   1. Auto-generates new values for the secrets that are entirely yours
#      (JWT_SECRET, REVALIDATE_SECRET) using openssl.
#   2. Prompts you, one by one, for the secrets that have to be rotated
#      on the provider side first (Resend, Twilio, ElevenLabs, Emergent
#      Universal Key, MongoDB password). Press ENTER on any prompt to
#      KEEP the current value (useful for partial rotations).
#   3. Atomically rewrites /app/backend/.env and /app/frontend/.env,
#      keeping a timestamped backup of each.
#   4. Restarts both supervisor services so the new values take effect.
#   5. Prints a checklist of provider-side rotation links.
#
# What it does NOT do:
#   • Touch git history. After this script finishes, run
#     `git filter-repo` (or `git filter-branch`) to scrub the leaked
#     values out of the past commits, then force-push. This script
#     does not push or deploy anything.
#   • Rotate values on the provider side. You must rotate Resend /
#     Twilio / ElevenLabs / Emergent / MongoDB on their dashboards
#     yourself; this script only stores the new keys you paste.
#
# Usage:
#   bash /app/scripts/rotate-secrets.sh
#
set -euo pipefail

BACKEND_ENV="/app/backend/.env"
FRONTEND_ENV="/app/frontend/.env"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

if [[ ! -f "$BACKEND_ENV" || ! -f "$FRONTEND_ENV" ]]; then
  echo "ERROR: expected $BACKEND_ENV and $FRONTEND_ENV to exist." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "ERROR: openssl is required for auto-generation." >&2
  exit 1
fi

cp "$BACKEND_ENV"  "${BACKEND_ENV}.bak.${TS}"
cp "$FRONTEND_ENV" "${FRONTEND_ENV}.bak.${TS}"
echo "Backups written: ${BACKEND_ENV}.bak.${TS}"
echo "Backups written: ${FRONTEND_ENV}.bak.${TS}"
echo

# ── helpers ───────────────────────────────────────────────────────

# Read the current value of KEY from FILE; returns empty if absent.
_current() {
  local key="$1" file="$2"
  awk -F= -v k="$key" '
    $1==k { sub(/^"/, "", $2); sub(/"$/, "", $2);
            for (i=3; i<=NF; i++) $2 = $2 "=" $i;
            print $2; exit }
  ' "$file" || true
}

# Set KEY=VALUE (quoted) inside FILE atomically. If KEY is missing,
# append it. Writes to a tempfile and renames.
_set_kv() {
  local key="$1" value="$2" file="$3"
  local tmp; tmp="$(mktemp)"
  if grep -qE "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" 'BEGIN{set=0}
      $0 ~ "^"k"=" { print k"=\""v"\""; set=1; next }
      { print }
      END{ if(!set) print k"=\""v"\"" }
    ' "$file" > "$tmp"
  else
    cat "$file" > "$tmp"
    printf '%s="%s"\n' "$key" "$value" >> "$tmp"
  fi
  mv "$tmp" "$file"
}

# Mask all but the first/last 4 chars for logging.
_mask() {
  local v="$1"
  local n=${#v}
  if (( n <= 8 )); then echo "***"; return; fi
  echo "${v:0:4}…${v: -4}"
}

# Prompt the user for a NEW value. Empty answer = keep current.
_prompt() {
  local key="$1" hint="$2" current="$3"
  echo
  echo "─── $key ───────────────────────────────"
  echo "  $hint"
  if [[ -n "$current" ]]; then
    echo "  current: $(_mask "$current")"
  else
    echo "  current: (not set)"
  fi
  printf "  new value (ENTER to keep current): "
  IFS= read -r new
  echo "$new"
}

# ── 1. auto-generated secrets ────────────────────────────────────

NEW_JWT="$(openssl rand -hex 32)"
NEW_REVALIDATE="$(openssl rand -hex 24)"

echo "Auto-generated:"
echo "  JWT_SECRET          → $(_mask "$NEW_JWT")"
echo "  REVALIDATE_SECRET   → $(_mask "$NEW_REVALIDATE")"

# ── 2. provider-side secrets (prompted) ──────────────────────────

declare -A NEW

NEW[MONGO_URL]="$(_prompt MONGO_URL \
  'Atlas → Database Access → reset DB user password. Paste FULL new mongodb+srv://… URI. Leave empty to keep current.' \
  "$(_current MONGO_URL "$BACKEND_ENV")")"

NEW[RESEND_API_KEY]="$(_prompt RESEND_API_KEY \
  'resend.com → API Keys → revoke old, create new. Paste re_… key.' \
  "$(_current RESEND_API_KEY "$BACKEND_ENV")")"

NEW[EMERGENT_LLM_KEY]="$(_prompt EMERGENT_LLM_KEY \
  'Emergent → Profile → Universal Key → Rotate. Paste sk-emergent-… key.' \
  "$(_current EMERGENT_LLM_KEY "$BACKEND_ENV")")"

NEW[TWILIO_AUTH_TOKEN]="$(_prompt TWILIO_AUTH_TOKEN \
  'twilio.com Console → Account → Auth Token → Rotate. Paste new token.' \
  "$(_current TWILIO_AUTH_TOKEN "$BACKEND_ENV")")"

NEW[ELEVENLABS_API_KEY]="$(_prompt ELEVENLABS_API_KEY \
  'elevenlabs.io → Profile → API Keys. Paste new key.' \
  "$(_current ELEVENLABS_API_KEY "$BACKEND_ENV")")"

NEW[ELEVENLABS_WEBHOOK_SECRET]="$(_prompt ELEVENLABS_WEBHOOK_SECRET \
  'ElevenLabs → Conversational AI → Webhook → Regenerate. Paste wsec_… value.' \
  "$(_current ELEVENLABS_WEBHOOK_SECRET "$BACKEND_ENV")")"

# ── 3. write backend/.env ────────────────────────────────────────

_set_kv JWT_SECRET        "$NEW_JWT"        "$BACKEND_ENV"
_set_kv REVALIDATE_SECRET "$NEW_REVALIDATE" "$BACKEND_ENV"

for k in MONGO_URL RESEND_API_KEY EMERGENT_LLM_KEY \
         TWILIO_AUTH_TOKEN ELEVENLABS_API_KEY ELEVENLABS_WEBHOOK_SECRET; do
  if [[ -n "${NEW[$k]:-}" ]]; then
    _set_kv "$k" "${NEW[$k]}" "$BACKEND_ENV"
    echo "  $k updated → $(_mask "${NEW[$k]}")"
  else
    echo "  $k kept (no change)"
  fi
done

# ── 4. write frontend/.env (REVALIDATE_SECRET must match) ────────

_set_kv REVALIDATE_SECRET "$NEW_REVALIDATE" "$FRONTEND_ENV"
echo "  Frontend REVALIDATE_SECRET synced."

# ── 5. restart services ─────────────────────────────────────────

echo
echo "Restarting backend + frontend supervisor services…"
sudo supervisorctl restart backend frontend || {
  echo "  WARN: supervisor restart failed; restart manually." >&2
}

# ── 6. summary + checklist ──────────────────────────────────────

cat <<EOF

════════════════════════════════════════════════════════════════════
ROTATION COMPLETE                              backups: *.bak.${TS}
════════════════════════════════════════════════════════════════════

NEXT STEPS — order matters:

  1.  Verify the platform still works:
        curl -s "\$REACT_APP_BACKEND_URL/api/" | head
        Try logging in as admin: a fresh JWT_SECRET means existing
        tokens are dead. That is expected — re-login.

  2.  Provider-side cleanup (delete the OLD keys you replaced):
        • Resend       → delete the previous API key
        • Twilio       → confirm rotation propagated, delete old token
        • ElevenLabs   → delete prior key, regenerate webhook secret
        • Emergent     → confirm old Universal Key is invalidated
        • MongoDB      → if password rotated, drop the previous user
                         or rotate again to invalidate the leaked one

  3.  Scrub git history (only after the above is verified):
        cd /app
        # install git-filter-repo first (pip install git-filter-repo)
        git filter-repo --invert-paths \\
          --path backend/.env --path frontend/.env --force
        # OR remove only known-leaked literals:
        # git filter-repo --replace-text <(printf '%s\n' \\
        #   'OLD_RESEND_KEY==>***REMOVED***' \\
        #   'OLD_TWILIO_TOKEN==>***REMOVED***' )

  4.  Force-push only after history is clean:
        git push --force origin <branch>

  5.  Notify active admin/clinic users that they have to log in
      again (E5 session governance + new JWT_SECRET both invalidate
      all existing sessions).

DO NOT delete the *.bak.${TS} files until you have verified the
platform is healthy — they are your one-step rollback if anything
breaks.

EOF
