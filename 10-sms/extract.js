import { normalizeText, toAmount } from './normalize.js';
import { detectBank } from './banks.js';

const DEPOSIT_WORDS   = ['واریز','افزایش','به حساب','دریافت','credit','deposit','بستانکار'];
const WITHDRAW_WORDS  = ['برداشت','کسر','پرداخت','debit','withdraw','بدهکار'];

export function extractFields(raw='') {
  const text = normalizeText(raw);
  const out = {};

  // 1) بانک
  const bank = detectBank(text);
  if (bank) { out.bankId = bank.id; out.bankName = bank.name; }

  // 2) مبلغ + علامت
  // پشتیبانی از "+1,200,000" یا "-500,000" یا "120,000 ریال"
  const amountMatch = text.match(/([+\-])?\s*([\d][\d,]{3,})/);
  if (amountMatch) {
    out.amount = toAmount(amountMatch[2]);
    out.sign   = amountMatch[1] || '';
  }

  // 3) نوع تراکنش
  if (DEPOSIT_WORDS.some(w => text.includes(w)))       out.type = 'deposit';
  else if (WITHDRAW_WORDS.some(w => text.includes(w))) out.type = 'withdrawal';
  else if (out.sign === '+') out.type = 'deposit';
  else if (out.sign === '-') out.type = 'withdrawal';

  // 4) شماره حساب / کارت (آخرین ۴ رقم)
  const accMatch = text.match(/(?:حساب|کارت|شماره)[^\d]{0,15}(\d{6,})/);
  if (accMatch) out.accountTail = accMatch[1].slice(-4);

  // 5) تاریخ / ساعت
  const dateM = text.match(/(\d{2,4}[\/\-]\d{1,2}(?:[\/\-]\d{1,2})?)/);
  if (dateM) out.date = dateM[1];
  const timeM = text.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (timeM) out.time = timeM[1];

  // 6) مانده (اختیاری)
  const balM = text.match(/مانده[^\d]{0,15}([\d,]+)/);
  if (balM) out.balance = toAmount(balM[1]);

  return out;
}
