const Native  = () => window.Capacitor?.Plugins?.SmsReader;
const Cordova = () => window.cordova?.plugins?.sms;

export const canReadSms = () => !!(Native() || Cordova());

export async function requestPermission() {
  if (Native())   return Native().requestPermission();
  if (Cordova())  return new Promise((ok, err) => Cordova().requestPermission(ok, err));
  throw new Error('در این محیط دسترسی به پیامک وجود ندارد');
}

export async function readInbox({ since = 0, max = 100 } = {}) {
  if (Native()) {
    const { messages } = await Native().getMessages({
      filter: { minDate: since, maxCount: max }
    });
    return messages.map(m => ({ body: m.body, date: m.date, address: m.address }));
  }
  if (Cordova()) {
    return new Promise((ok, err) => {
      Cordova().listSMS(
        { filter: { minDate: since, maxCount: max } },
        list => ok(list.map(m => ({ body: m.body, date: m.date, address: m.address }))),
        err
      );
    });
  }
  return [];
}

/** گوش دادن به پیامکهای تازه در پسزمینه (Capacitor/Cordova) */
export function watchIncoming(cb) {
  if (Native()) {
    const handle = Native().addListener('smsReceived', m => cb({ body: m.body, date: m.date, address: m.address }));
    return () => handle.remove();
  }
  if (Cordova()) {
    const onArrive = e => cb({ body: e.data.body, date: e.data.date, address: e.data.address });
    Cordova().startWatch(() => {}, () => {});
    document.addEventListener('onSMSArrive', onArrive, false);
    return () => {
      document.removeEventListener('onSMSArrive', onArrive);
      Cordova().stopWatch(() => {}, () => {});
    };
  }
  return () => {};
}

/** Fallback: خواندن از کلیپبورد */
export async function readClipboard() {
  try { return await navigator.clipboard.readText(); }
  catch { return ''; }
}

/**
 * گوش دادن به کلیپبورد (فقط وب / PWA).
 * - اگر Clipboard API رویدادمحور داشت (Chrome 104+) → onclipboardchange
 * - وگرنه polling فقط زمانی که پنجره focus داره (الزام امنیتی مرورگر)
 * cb(text) با هر متن جدید یکبار صدا زده میشه.
 */
export function watchClipboard(cb, { interval = 1500 } = {}) {
  let last = '';

  const emit = async () => {
    const text = await readClipboard();
    const t = (text || '').trim();
    if (!t || t === last) return;
    last = t;
    cb(t);
  };

  // 1) Native Clipboard API
  if (navigator.clipboard && 'onclipboardchange' in navigator.clipboard) {
    navigator.clipboard.onclipboardchange = emit;
    return () => { try { navigator.clipboard.onclipboardchange = null; } catch {} };
  }

  // 2) Fallback
  let timer = null;
  const start = () => { if (!timer) timer = setInterval(() => { if (document.hasFocus()) emit(); }, interval); };
  const stop  = () => { if (timer) { clearInterval(timer); timer = null; } };
  const onVis   = () => (document.hidden ? stop() : start());
  const onFocus = () => { emit(); start(); };
  const onBlur  = () => stop();

  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('focus', onFocus);
  window.addEventListener('blur', onBlur);
  start();

  return () => {
    stop();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('blur', onBlur);
  };
}
