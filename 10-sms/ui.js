import { classify, learn } from './index.js';
import { canReadSms, requestPermission, readInbox, watchIncoming, readClipboard } from './inbox.js';

/** فرمی که کاربر برای بار اول پر می‌کند */
export function openLearnModal({ rawSms, fields, onSaved }) {
  const root = document.createElement('div');
  root.className = 'sms-learn-overlay';
  root.innerHTML = `
    <div class="sms-learn-modal" dir="rtl">
      <h3>ثبت الگوی جدید پیامک</h3>
      <label>متن پیامک</label>
      <textarea id="sms-raw" readonly>${rawSms}</textarea>

      <div class="grid">
        <div>
          <label>بانک</label>
          <input id="sms-bank" value="${fields.bankName || ''}">
        </div>
        <div>
          <label>نوع</label>
          <select id="sms-type">
            <option value="deposit"    ${fields.type==='deposit'?'selected':''}>واریز</option>
            <option value="withdrawal" ${fields.type==='withdrawal'?'selected':''}>برداشت</option>
          </select>
        </div>
        <div>
          <label>مبلغ</label>
          <input id="sms-amount" type="number" value="${fields.amount || ''}">
        </div>
        <div>
          <label>حساب مرتبط</label>
          <select id="sms-account"></select>
        </div>
        <div>
          <label>دسته / سرفصل</label>
          <select id="sms-category"></select>
        </div>
        <div>
          <label>برچسب الگو</label>
          <input id="sms-label" placeholder="مثلاً: واریز حقوق ملت">
        </div>
      </div>

      <div class="actions">
        <button id="sms-save">ذخیره الگو</button>
        <button id="sms-cancel">انصراف</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  // پر کردن dropdown ها از داده‌های موجود اپ شما
  const accSel = root.querySelector('#sms-account');
  (window.Parsis?.accounts || []).forEach(a => {
    accSel.insertAdjacentHTML('beforeend', `<option value="${a.id}">${a.name}</option>`);
  });
  const catSel = root.querySelector('#sms-category');
  (window.Parsis?.categories || []).forEach(c => {
    catSel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  });

  root.querySelector('#sms-cancel').onclick = () => root.remove();

  root.querySelector('#sms-save').onclick = () => {
    const mapping = {
      bank:     root.querySelector('#sms-bank').value,
      type:     root.querySelector('#sms-type').value,
      amount:   Number(root.querySelector('#sms-amount').value) || 0,
      account:  root.querySelector('#sms-account').value,
      category: root.querySelector('#sms-category').value,
    };
    const label = root.querySelector('#sms-label').value;
    learn(rawSms, mapping, label);
    root.remove();
    onSaved?.(mapping);
  };
}

/** مسیر اصلی: هر پیامک جدید از اینجا رد می‌شود */
export function handleIncomingSms(rawSms) {
  const r = classify(rawSms);
  if (r.status === 'matched') {
    applyMapping(r.fields, r.mapping, r.confidence);
    return;
  }
  openLearnModal({
    rawSms, fields: r.fields,
    onSaved: mapping => applyMapping(r.fields, mapping, 1),
  });
}

/** اعمال رفتار ثبت‌شده */
function applyMapping(fields, mapping, confidence) {
  // اینجا با موتور حسابداری خودتان ثبت کنید
  window.Parsis?.store?.addVoucher?.({
    date:      fields.date || new Date().toISOString().slice(0,10),
    time:      fields.time || '',
    bank:      fields.bankId || mapping.bank,
    type:      fields.type   || mapping.type,
    amount:    fields.amount || mapping.amount,
    accountId: mapping.account,
    categoryId:mapping.category,
    source:    'sms',
    confidence,
    raw:       fields,
  });
  window.Parsis?.toast?.(`ثبت خودکار با اطمینان ${Math.round(confidence*100)}%`);
}

/** راه‌اندازی در startup (فایل 09-settings یا 00-init) */
export async function bootstrapSmsListener() {
  if (canReadSms()) {
    try { await requestPermission(); } catch {}
    // خواندن پیامک‌های جدید از زمان آخرین sync
    const since = Number(localStorage.getItem('parsis.sms.lastSync') || 0);
    const list  = await readInbox({ since, max: 50 });
    list.forEach(m => handleIncomingSms(m.body));
    localStorage.setItem('parsis.sms.lastSync', String(Date.now()));

    // گوش دادن به پیامک‌های زنده
    watchIncoming(m => handleIncomingSms(m.body));
  }
  // fallback کلیپ‌بورد
  window.addEventListener('focus', async () => {
    if (canReadSms()) return;
    const txt = await readClipboard();
    if (txt && /بانک|واریز|برداشت|حساب/.test(txt)) {
      // فقط پیشنهاد بده، خودکار اعمال نکن
      window.Parsis?.toast?.('پیامک بانکی در کلیپ‌بورد پیدا شد');
    }
  });
}
