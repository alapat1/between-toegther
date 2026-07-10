// Failure catcher — writes client errors to the client_errors table so
// "the game feels broken" can be answered by querying real evidence instead
// of hunting. Deliberately minimal (no Sentry: no vendor, no bundle weight):
// captures unhandled exceptions, promise rejections, and failed writes.
//
// Safety valves so the logger can never become its own problem:
// - fire-and-forget, everything wrapped in try/catch (an error logging an
//   error must be a no-op, not a loop)
// - per-session cap (25) and 30s dedupe per unique message
// - context (roomId/gameType) is set by screens, attached to every row
import { sb } from './supabase.js';

const recent = new Map();
let count = 0;
let ctx = {};
let cachedUserId = null;

export function setErrorContext(patch) {
  ctx = { ...ctx, ...patch };
}

export async function logError(kind, message, extra = {}) {
  try {
    if (count >= 25) return;
    const msg = String(message || 'unknown').slice(0, 500);
    const key = `${kind}:${msg}`;
    const now = Date.now();
    if (recent.get(key) > now - 30000) return;
    recent.set(key, now);
    count++;

    if (!cachedUserId) {
      const { data } = await sb.auth.getSession();
      cachedUserId = data?.session?.user?.id || null;
    }
    if (!cachedUserId) return; // not signed in yet — nothing to attribute

    await sb.from('client_errors').insert({
      user_id: cachedUserId,
      room_id: ctx.roomId || null,
      kind,
      message: msg,
      code: extra.code != null ? String(extra.code) : null,
      context: { ...ctx, ...extra },
      user_agent: navigator.userAgent.slice(0, 200)
    });
  } catch (e) {
    // never let the logger throw
  }
}

export function initErrorCatcher() {
  window.addEventListener('error', (e) => {
    logError('exception', e.message, { source: e.filename, line: e.lineno });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    logError('rejection', r?.message || String(r), { code: r?.code });
  });
}
