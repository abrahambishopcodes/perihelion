// Talks to start.ng through its hidden connect page (https://start.ng/docs.md).
const START_NG = 'https://start.ng';
const TIMEOUT_MS = 5000;
let frame;

function connectFrame() {
  frame ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.title = 'start.ng';
    el.onload = () => resolve(el);
    el.onerror = reject;
    document.body.append(el);
  });
  return frame;
}

// Sends a message and resolves to start.ng's reply, or null if it didn't answer.
export async function askStartNg(message, replyType, timeoutMs = TIMEOUT_MS) {
  let el;
  try {
    el = await connectFrame();
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const done = (reply) => {
      clearTimeout(timer);
      removeEventListener('message', onMessage);
      resolve(reply);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return;
      if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
    }
    addEventListener('message', onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

// { user, guest } where user is null for guests. Null if start.ng didn't answer (e.g. played locally).
export async function whoami() {
  const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
  if (!reply) return null;
  return { user: reply.user ?? null, guest: reply.guest ?? null };
}

// Stats must match startng.json exactly.
export function saveRun({ score, multiplier, time }) {
  return askStartNg({ type: 'startng:score', stats: { score, multiplier, time } }, 'startng:scoreSaved');
}

export function signIn() {
  location.href = `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

// After sign-in start.ng adds a session to the address; the connect page doesn't need it.
export function cleanAddress() {
  if (location.hash.includes('startng_session=')) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}
