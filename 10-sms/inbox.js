const Native = () => window.Capacitor?.Plugins?.SmsReader;
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

/** گوش دادن به پیامک‌های تازه در پس‌زمینه */
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

/** Fallback: خواندن از کلیپ‌بورد */
export async function readClipboard() {
  try { return await navigator.clipboard.readText(); }
  catch { return ''; }
}
