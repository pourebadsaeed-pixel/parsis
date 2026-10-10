/* =====================================================================
   پارسیس v27 — 11-sms-direction-fix.js (v2)
   رفع باگ جهت تراکنش در پیامک‌ها:
   - علامت + و - کنار مبلغ (قبل یا بعد) اولویت مطلق دارد
   - الگوها با علامت ذخیره می‌شوند (برداشت و واریز جدا)
   - جهت هر پیامک لحظه‌ای از متن استخراج می‌شود
   - فرم پیامک‌های ثبت‌نشده بازطراحی شد
   ===================================================================== */
'use strict';

/* ==================== CSS درون‌خطی ==================== */
(function () {
    var css = ''
    + '.pending-sms-card{border:1px solid var(--border);border-radius:16px;padding:0;'
    + 'margin-bottom:14px;background:var(--card);overflow:hidden;'
    + 'box-shadow:0 4px 16px rgba(15,23,42,0.06)}'
    + '.pending-sms-card.psm-new{border-right:5px solid #c47c00}'
    + '.pending-sms-card.psm-forced{border-right:5px solid #f59e0b}'
    + '.psm-head{padding:12px 16px;background:var(--card-alt);'
    + 'border-bottom:1px solid var(--border);display:flex;justify-content:space-between;'
    + 'align-items:center;gap:10px;flex-wrap:wrap}'
    + '.psm-head .title{font-weight:800;font-size:.9rem;color:var(--primary-dark)}'
    + '.psm-head .meta{font-size:.72rem;color:var(--text-muted)}'
    + '.psm-head .badge{background:#fef3c7;color:#92400e;padding:2px 9px;'
    + 'border-radius:9px;font-size:.66rem;font-weight:800;margin-right:6px}'
    + '.psm-text-wrap{border-bottom:1px solid var(--border)}'
    + '.psm-text-toggle{padding:10px 16px;background:var(--card-alt);'
    + 'font-size:.78rem;font-weight:700;color:var(--primary-dark);cursor:pointer;'
    + 'display:flex;justify-content:space-between;align-items:center;user-select:none}'
    + '.psm-text-toggle:hover{background:var(--primary-soft)}'
    + '.psm-text-toggle .arrow{transition:transform .25s;display:inline-block}'
    + '.psm-text-toggle.open .arrow{transform:rotate(90deg)}'
    + '.psm-text-body{padding:12px 16px;background:var(--card-alt);'
    + 'font-size:.8rem;white-space:pre-wrap;word-break:break-word;direction:rtl;'
    + 'line-height:1.9;color:var(--text);max-height:200px;overflow-y:auto;display:none;'
    + 'border-top:1px dashed var(--border)}'
    + '.psm-text-body.show{display:block}'
    + '.psm-body{padding:16px}'
    + '.psm-dir-box{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}'
    + '.psm-dir-btn{padding:16px 10px;border:2px solid var(--border);border-radius:14px;'
    + 'background:var(--card-solid);cursor:pointer;font-family:inherit;font-size:1rem;'
    + 'font-weight:900;display:flex;flex-direction:column;align-items:center;gap:6px;'
    + 'transition:all .25s;color:var(--text-muted)}'
    + '.psm-dir-btn .icon{font-size:1.6rem;line-height:1}'
    + '.psm-dir-btn .lbl{font-size:.85rem}'
    + '.psm-dir-btn:hover{border-color:var(--primary);transform:translateY(-2px)}'
    + '.psm-dir-btn.active-in{background:linear-gradient(135deg,#d1fae5,#a7f3d0);'
    + 'border-color:#059669;color:#065f46;box-shadow:0 6px 20px rgba(5,150,105,.25)}'
    + '.psm-dir-btn.active-out{background:linear-gradient(135deg,#fee2e2,#fecaca);'
    + 'border-color:#dc2626;color:#991b1b;box-shadow:0 6px 20px rgba(220,38,38,.25)}'
    + '.psm-field{margin-bottom:12px}'
    + '.psm-field label{display:block;font-size:.76rem;font-weight:800;'
    + 'color:var(--text-muted);margin-bottom:5px}'
    + '.psm-field input,.psm-field select{width:100%;padding:11px 14px;'
    + 'border:1.5px solid var(--border);border-radius:11px;font-family:inherit;'
    + 'font-size:.9rem;background:var(--card-solid);color:var(--text);outline:none}'
    + '.psm-field input:focus,.psm-field select:focus{border-color:var(--primary);'
    + 'box-shadow:0 0 0 3px var(--primary-soft)}'
    + '.psm-field input.amount-input{text-align:center;direction:ltr;'
    + 'font-variant-numeric:tabular-nums;font-weight:800;font-size:1.05rem;letter-spacing:.5px}'
    + '.psm-row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}'
    + '.psm-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;'
    + 'padding:12px 16px;background:var(--card-alt);border-top:1px solid var(--border)}'
    + '.psm-actions button{padding:11px 18px;border:none;border-radius:11px;'
    + 'font-family:inherit;font-size:.85rem;font-weight:800;cursor:pointer;'
    + 'transition:transform .2s}'
    + '.psm-actions button:hover{transform:translateY(-1px)}'
    + '.psm-btn-primary{background:var(--gradient-accent);color:#fff;'
    + 'box-shadow:0 4px 14px rgba(99,102,241,.3)}'
    + '.psm-btn-secondary{background:var(--primary-light);color:var(--primary-dark)}'
    + '.psm-btn-danger{background:#fee2e2;color:#dc2626}'
    + '@media (max-width:500px){.psm-row-2{grid-template-columns:1fr}'
    + '.psm-dir-btn{padding:13px 8px}.psm-dir-btn .icon{font-size:1.4rem}'
    + '.psm-dir-btn .lbl{font-size:.78rem}}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
})();

/* ==================== هسته تشخیص علامت ==================== */

/**
 * تجزیه یک رشته شامل عدد و علامت اختیاری (قبل یا بعد)
 * "12,868,300+"  → { amount: 12868300, sign: '+' }
 * "+500,000"      → { amount: 500000, sign: '+' }
 * "-300,000"      → { amount: 300000, sign: '-' }
 * "1,200,000"     → { amount: 1200000, sign: '' }
 */
function parseSignNumber(str) {
    var s = String(str).replace(/\s+/g, '').trim();
    var sign = '';
    if (s.charAt(0) === '+') { sign = '+'; s = s.slice(1); }
    else if (s.charAt(0) === '-') { sign = '-'; s = s.slice(1); }
    if (!sign && s.charAt(s.length - 1) === '+') { sign = '+'; s = s.slice(0, -1); }
    else if (!sign && s.charAt(s.length - 1) === '-') { sign = '-'; s = s.slice(0, -1); }
    var num = Number(s.replace(/,/g, ''));
    return { amount: (isFinite(num) && num > 0) ? num : 0, sign: sign };
}

/**
 * استخراج مبلغ با علامتش از متن پیامک
 * علامت می‌تواند قبل یا بعد از عدد باشد
 */
function extractAmountWithSign(text) {
    var t = normalizeDigits(String(text || ''))
        .replace(/[−–—]/g, '-')
        .replace(/[＋]/g, '+');

    // ۱) الگوی «کلمه راهنما + عدد با علامت اختیاری در هر طرف»
    var labeled = t.match(/(?:انتقالي|انتقالی|مبلغ|برداشت|واریز|خرید|پرداخت|افزایش|کسر|موجودي|موجودی|حقوق|قسط)\s*[:ـ]?\s*([+\-]?\s*[\d][\d,]*(?:\s*[+\-])?)/);
    if (labeled) {
        var res = parseSignNumber(labeled[1]);
        if (res.amount > 0) return res;
    }

    // ۲) عدد با علامت در ابتدا
    var m1 = t.match(/([+\-])\s*([\d]{1,3}(?:,[\d]{3})+)/);
    if (m1) return { amount: Number(m1[2].replace(/,/g, '')), sign: m1[1] };

    // ۳) عدد با علامت در انتها (حالت پیامک بانک ملی)
    var m2 = t.match(/([\d]{1,3}(?:,[\d]{3})+)\s*([+\-])/);
    if (m2) return { amount: Number(m2[1].replace(/,/g, '')), sign: m2[2] };

    // ۴) عدد بدون علامت (fallback)
    var m3 = t.match(/([\d]{1,3}(?:,[\d]{3})+)/);
    if (m3) return { amount: Number(m3[1].replace(/,/g, '')), sign: '' };

    return { amount: 0, sign: '' };
}

/**
 * تشخیص جهت از متن — با اولویت مطلق علامت (قبل یا بعد)
 */
function detectSmsDirection(text, amount) {
    var t = normalizeDigits(String(text || '')).replace(/[−–—]/g, '-');

    // مرحله ۰ (اولویت مطلق): علامت کنار مبلغ
    var amtRes = extractAmountWithSign(t);
    if (amtRes.sign === '+') return 'in';
    if (amtRes.sign === '-') return 'out';

    // مرحله ۱: عبارت‌های صریح با حرف اضافه
    if (/واریز\s*به/.test(t))          return 'in';
    if (/برداشت\s*از/.test(t))         return 'out';
    if (/پرداخت\s*از/.test(t))         return 'out';
    if (/انتقال\s*به\s*حساب/.test(t))  return 'in';
    if (/انتقال\s*از\s*حساب/.test(t))  return 'out';
    if (/انتقال\s*به/.test(t))         return 'in';
    if (/انتقال\s*از/.test(t))         return 'out';
    if (/افزایش\s*موجودی/.test(t))     return 'in';
    if (/کسر\s*از/.test(t))            return 'out';
    if (/دریافت\s*از/.test(t))         return 'in';
    if (/بستانکار/.test(t) && !/بدهکار/.test(t)) return 'in';
    if (/بدهکار/.test(t) && !/بستانکار/.test(t)) return 'out';

    // مرحله ۲: کلمه‌های خالی
    if (/واریز/.test(t))               return 'in';
    if (/برداشت/.test(t))              return 'out';
    if (/دریافت/.test(t))              return 'in';
    if (/افزایش/.test(t))              return 'in';
    if (/کسر/.test(t))                 return 'out';
    if (/خرید/.test(t))                return 'out';
    if (/حقوق/.test(t))                return 'in';
    if (/قسط/.test(t))                 return 'out';

    // مرحله ۳: پرداخت مبهم
    if (/پرداخت/.test(t))              return 'out';

    return '';
}
window.detectSmsDirection = detectSmsDirection;
window.extractAmountWithSign = extractAmountWithSign;
window.parseSignNumber = parseSignNumber;

/* ==================== ساخت الگو با علامت ==================== */
function buildSmsPattern(raw) {
    var normalized = smsNormalizeForPattern(raw);
    var parts = normalized.split(' ').filter(Boolean);
    var tokens = [], mapping = {}, n = 0;

    for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var signBefore = p.match(/^([+\-−])(\d.*)$/);
        var signAfter  = p.match(/^(\d.*?)([+\-−])$/);

        if (signBefore) {
            n++;
            var s = signBefore[1] === '−' ? '-' : signBefore[1];
            var slot = '#' + n;
            tokens.push(s + slot);
            mapping[slot] = p;
        } else if (signAfter) {
            n++;
            var s2 = signAfter[2] === '−' ? '-' : signAfter[2];
            var slot2 = '#' + n;
            tokens.push(slot2 + s2);
            mapping[slot2] = p;
        } else if (/\d/.test(p)) {
            n++;
            var slot3 = '#' + n;
            tokens.push(slot3);
            mapping[slot3] = p;
        } else {
            tokens.push(p);
        }
    }
    return { raw: normalized, tokens: tokens, mapping: mapping, key: tokens.join(' ') };
}
window.buildSmsPattern = buildSmsPattern;

/* ==================== تشخیص wildcard با علامت ==================== */
function isWild(t) {
    return typeof t === 'string' && t.indexOf('#') !== -1;
}
window.isWild = isWild;

/* ==================== شباهت توکن‌ها با در نظر گرفتن علامت ==================== */
function smsTokenSimilarity(a, b) {
    var n = Math.max(a.length, b.length);
    if (n === 0) return 0;
    var score = 0;

    function getSign(t) {
        if (!t) return '';
        var c0 = t.charAt(0);
        if (c0 === '+' || c0 === '-' || c0 === '−') return c0 === '−' ? '-' : c0;
        var cl = t.charAt(t.length - 1);
        if (cl === '+' || cl === '-' || cl === '−') return cl === '−' ? '-' : cl;
        return '';
    }

    for (var i = 0; i < n; i++) {
        var ta = a[i], tb = b[i];
        if (ta === undefined || tb === undefined) { score -= 0.2; continue; }
        if (ta === tb) { score += 1.0; continue; }

        var wildA = isWild(ta), wildB = isWild(tb);
        if (wildA && wildB) {
            var signA = getSign(ta), signB = getSign(tb);
            if (signA === signB) score += 1.0;
            else if (!signA || !signB) score += 0.85;
            else score += 0.3;
        }
        else if (wildA || wildB) score += 0.4;
        else score -= 0.3;
    }
    return Math.max(0, score / n);
}
window.smsTokenSimilarity = smsTokenSimilarity;

/* ==================== Override parseBankSms ==================== */
(function () {
    var _origParse = window.parseBankSms;
    if (typeof _origParse !== 'function') return;

    window.parseBankSms = function (text) {
        var r = _origParse(text) || {};
        var t = normalizeDigits(String(text || ''));

        // استخراج مبلغ با علامتش (اولویت مطلق)
        var amtRes = extractAmountWithSign(t);
        if (amtRes.amount > 0) {
            r.amount = amtRes.amount;
            if (amtRes.sign === '+') r.direction = 'in';
            else if (amtRes.sign === '-') r.direction = 'out';
        }

        // اگه علامت نبود، از کلمات کلیدی
        if (!r.direction) {
            var dir = detectSmsDirection(t, r.amount);
            if (dir) r.direction = dir;
        }

        return r;
    };
})();

/* ==================== Override suggestDirection ==================== */
window.suggestDirection = function (text) {
    return detectSmsDirection(text);
};

/* ==================== Override convertSmsToVoucher ==================== */
window.convertSmsToVoucher = function (smsId) {
    var list = getSmsInbox();
    var item = list.find(function (s) { return s.id === smsId; });
    if (!item) { showToast('پیامک یافت نشد.'); return; }

    var raw = normalizeDigits(item.rawText);
    var p = item.parsed || {};
    var amount = p.amount || 0;
    var direction = '';
    var bankAccountId = p.matchedAccountId || '';
    var patternLabel = '';

    // ⚠️ اولویت ۱: علامت کنار مبلغ (قبل یا بعد)
    var amtRes = extractAmountWithSign(raw);
    if (amtRes.amount > 0 && amtRes.sign) {
        amount = amtRes.amount;
        direction = amtRes.sign === '+' ? 'in' : 'out';
    }

    // اولویت ۲: الگوی یادگرفته (فقط اگه علامت در متن نبود)
    var matched = (typeof findMatchingSmsPattern === 'function')
        ? findMatchingSmsPattern(item.rawText) : null;
    if (matched && matched.pattern) {
        if (!direction && matched.pattern.direction) direction = matched.pattern.direction;
        if (!bankAccountId && matched.pattern.linkedAccountId) bankAccountId = matched.pattern.linkedAccountId;
        patternLabel = matched.pattern.label || '';
    }

    // اولویت ۳: تشخیص از کلمات کلیدی
    if (!direction) direction = detectSmsDirection(raw, amount);

    // مبلغ نهایی از متن
    if (!amount || amount > 1e12) {
        if (amtRes.amount > 0) amount = amtRes.amount;
        else {
            var mamt = raw.match(/مبلغ\s*[:ـ]?\s*([\d][\d,]*)/);
            if (mamt) amount = Number(mamt[1].replace(/,/g, ''));
        }
    }
    if (!amount || amount > 1e13) {
        alert('⚠️ مبلغ قابل تشخیص نیست.\nبرای این پیامک از باکس «ثبت نشده» الگو تعریف کن.');
        return;
    }
    if (!direction) {
        var d = prompt('نوع تراکنش این پیامک:\n1 = برداشت\n2 = واریز', '1');
        if (d === '1') direction = 'out';
        else if (d === '2') direction = 'in';
        else return;
    }

    // حساب بانکی
    if (!bankAccountId) {
        var accounts = DB.load('bankAccounts', []);
        if (accounts.length === 0) { alert('⚠️ هیچ حساب بانکی تعریف نشده.'); return; }
        if (accounts.length === 1) bankAccountId = accounts[0].id;
        else {
            var opts = accounts.map(function (a, i) {
                return (i + 1) + '. ' + (a.bank || '') + ' — ' + (a.account || '');
            }).join('\n');
            var ans = prompt('حساب بانکی:\n\n' + opts + '\n\nشماره:');
            if (!ans) return;
            var idx = Number(normalizeDigits(ans)) - 1;
            if (isNaN(idx) || idx < 0 || idx >= accounts.length) { alert('نامعتبر'); return; }
            bankAccountId = accounts[idx].id;
        }
    }

    var bankMoein = getBankMoeinId();
    if (!bankMoein) { alert('⚠️ معین بانک تعریف نشده.'); return; }

    // ⚠️ منطق حسابداری:
    //   واریز (in)   → بانک بدهکار (money enters bank)
    //   برداشت (out) → بانک بستانکار (money leaves bank)
    var bankDetail = { bank: bankAccountId };
    var lines = [];
    if (direction === 'out') {
        lines.push({ id: uid(), account: '', details: {}, debit: amount, credit: 0, description: '' });
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: amount, description: '', locked: true });
    } else {
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: amount, credit: 0, description: '', locked: true });
        lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: amount, description: '' });
    }

    var vl = DB.load('vouchers', []);
    var v = {
        id: uid(),
        number: (typeof getNextVoucherNumberForPeriod === 'function')
            ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
            : String(vl.length + 1),
        date: todayJalaliStr(),
        type: 'general',
        periodId: state.activePeriodId || '',
        desc: patternLabel || '',
        lines: lines,
        status: 'draft'
    };
    vl.push(v);
    DB.save('vouchers', vl);

    for (var i = 0; i < list.length; i++) {
        if (list[i].id === smsId) {
            list[i].status = 'converted';
            list[i].voucherId = v.id;
            list[i].parsed.amount = amount;
            list[i].parsed.direction = direction;
            list[i].parsed.matchedAccountId = bankAccountId;
        }
    }
    saveSmsInbox(list);
    if (typeof renderSmsInbox === 'function') renderSmsInbox();
    if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
    if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v);

    var dirLabel = direction === 'out' ? '🔴 برداشت' : '🟢 واریز';
    showToast('✅ پیش‌نویس — ' + dirLabel + (patternLabel ? ' | ' + patternLabel : ''));
};

/* ==================== بازطراحی فرم پیامک‌های ثبت‌نشده ==================== */
function renderPendingSmsBox() {
    var box = document.getElementById('pending-sms-list');
    if (!box) return;
    var list = getPendingSms();
    var countEl = document.getElementById('pending-sms-count');
    if (countEl) countEl.textContent = toFa(list.length);

    if (list.length === 0) {
        box.innerHTML =
            '<div class="widget-empty">📭 پیامک ثبت‌نشده‌ای وجود ندارد.' +
            '<br><span style="font-size:.72rem;opacity:.8">' +
            'برای فعال‌سازی خودکار، گزینه «خواندن خودکار کلیپ‌بورد» را روشن کن.' +
            '</span></div>';
        if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
        return;
    }

    var accounts = DB.load('bankAccounts', []);
    var sorted = list.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    var html = '';

    for (var i = 0; i < sorted.length; i++) {
        var p = sorted[i];
        var s = p.suggestion || {};
        var pid = p.id;

        // تشخیص لحظه‌ای جهت از متن خام
        var liveDir = detectSmsDirection(p.raw, s.amount);
        var effectiveDir = liveDir || s.direction || '';
        var liveAmt = extractAmountWithSign(p.raw);

        // ساخت گزینه‌های حساب
        var accountOpts = '<option value="">— انتخاب حساب —</option>';
        for (var a = 0; a < accounts.length; a++) {
            var acc = accounts[a];
            var sel = (s.linkedAccountId === acc.id) ? ' selected' : '';
            accountOpts += '<option value="' + acc.id + '"' + sel + '>' +
                esc((acc.bank || '') + ' — ' + (acc.account || '')) + '</option>';
        }

        var clsIn = (effectiveDir === 'in')  ? ' active-in'  : '';
        var clsOut = (effectiveDir === 'out') ? ' active-out' : '';
        var forcedBadge = p.forced ? '<span class="badge">دستی</span>' : '';
        var meta = '📅 ' + toFa(tsToJalaliDate(p.createdAt)) + ' — ' + toFa(tsToJalaliTime(p.createdAt));

        var autoHint = '';
        if (liveDir && (!s.direction || s.direction !== liveDir)) {
            autoHint = liveDir === 'in'
                ? ' <span style="color:#059669;font-size:.68rem;font-weight:800">(تشخیص خودکار: واریز)</span>'
                : ' <span style="color:#dc2626;font-size:.68rem;font-weight:800">(تشخیص خودکار: برداشت)</span>';
        }

        html += '<div class="pending-sms-card psm-new" data-pid="' + pid + '">'
            +   '<div class="psm-head">'
            +     '<div><div class="title">🔔 پیامک جدید' + forcedBadge + autoHint + '</div>'
            +     '<div class="meta">' + esc(meta) + '</div></div>'
            +   '</div>'
            +   '<div class="psm-text-wrap">'
            +     '<div class="psm-text-toggle" data-toggle="text"><span>📄 متن پیامک</span><span class="arrow">◀</span></div>'
            +     '<div class="psm-text-body">' + esc(p.raw) + '</div>'
            +   '</div>'
            +   '<div class="psm-body">'
            +     '<div class="psm-dir-box">'
            +       '<button type="button" class="psm-dir-btn' + clsIn + '" data-dir="in" data-pid="' + pid + '">'
            +         '<span class="icon">📥</span><span class="lbl">واریز</span></button>'
            +       '<button type="button" class="psm-dir-btn' + clsOut + '" data-dir="out" data-pid="' + pid + '">'
            +         '<span class="icon">📤</span><span class="lbl">برداشت</span></button>'
            +     '</div>'
            +     '<input type="hidden" data-field="direction" value="' + effectiveDir + '">'
            +     '<div class="psm-field">'
            +       '<label>💰 مبلغ (ریال)</label>'
            +       '<input type="text" class="amount-input" inputmode="numeric" dir="ltr" data-field="amount" value="' + (liveAmt.amount || s.amount ? formatRaw(liveAmt.amount || s.amount) : '') + '">'
            +     '</div>'
            +     '<div class="psm-field">'
            +       '<label>🏦 حساب بانکی</label>'
            +       '<select data-field="account">' + accountOpts + '</select>'
            +     '</div>'
            +     '<div class="psm-row-2">'
            +       '<div class="psm-field"><label>📅 تاریخ</label>'
            +         '<input type="text" dir="ltr" class="date-picker" data-field="date" value="' + esc(s.date || todayJalaliStr()) + '"></div>'
            +       '<div class="psm-field"><label>📝 شرح</label>'
            +         '<input type="text" data-field="desc" value="' + esc(s.description || '') + '"></div>'
            +     '</div>'
            +     '<div class="psm-field">'
            +       '<label>🏷 نام الگو (برای شناسایی خودکار)</label>'
            +       '<input type="text" data-field="label" value="' + esc(suggestLabel(p.raw, s.bankName, effectiveDir)) + '">'
            +     '</div>'
            +   '</div>'
            +   '<div class="psm-actions">'
            +     '<button class="psm-btn-primary" data-action="save-with-voucher" data-id="' + pid + '">✅ ثبت + ساخت سند</button>'
            +     '<button class="psm-btn-secondary" data-action="save-pattern-only" data-id="' + pid + '">🧠 فقط ثبت الگو</button>'
            +     '<button class="psm-btn-danger" data-action="drop" data-id="' + pid + '">🗑</button>'
            +   '</div>'
            + '</div>';
    }

    box.innerHTML = html;
    if (typeof attachDatePickers === 'function') attachDatePickers();
    bindPendingEventsNew(box);
    if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
}
window.renderPendingSmsBox = renderPendingSmsBox;

/* ==================== رویدادهای فرم جدید ==================== */
function bindPendingEventsNew(box) {
    box.querySelectorAll('.psm-text-toggle').forEach(function (t) {
        t.addEventListener('click', function () {
            var body = this.nextElementSibling;
            if (!body) return;
            var isOpen = body.classList.toggle('show');
            this.classList.toggle('open', isOpen);
        });
    });

    box.querySelectorAll('.psm-dir-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var card = this.closest('.pending-sms-card');
            if (!card) return;
            var dir = this.getAttribute('data-dir');
            card.querySelectorAll('.psm-dir-btn').forEach(function (b) {
                b.classList.remove('active-in', 'active-out');
            });
            this.classList.add(dir === 'in' ? 'active-in' : 'active-out');
            var hidden = card.querySelector('[data-field="direction"]');
            if (hidden) hidden.value = dir;
        });
    });

    box.querySelectorAll('[data-field="amount"]').forEach(function (inp) {
        inp.addEventListener('input', function () {
            this.value = normalizeDigits(this.value).replace(/[^\d]/g, '');
        });
        inp.addEventListener('blur', function () {
            var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
            this.value = v ? formatRaw(v) : '';
        });
    });

    box.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var action = this.getAttribute('data-action');
            var pid = this.getAttribute('data-id');
            if (action === 'drop') {
                if (!confirm('این پیامک حذف شود؟')) return;
                removePendingSms(pid);
                renderPendingSmsBox();
                return;
            }
            if (action === 'save-pattern-only') return savePendingAsPatternNew(pid, false);
            if (action === 'save-with-voucher')  return savePendingAsPatternNew(pid, true);
        });
    });
}

/* ==================== ذخیره الگو با علامت ==================== */
function savePendingAsPatternNew(pid, withVoucher) {
    var card = document.querySelector('.pending-sms-card[data-pid="' + pid + '"]');
    if (!card) return;
    var pending = getPendingSms().find(function (p) { return p.id === pid; });
    if (!pending) return;

    var accountId   = card.querySelector('[data-field="account"]').value;
    var amountStr   = card.querySelector('[data-field="amount"]').value;
    var dirHidden   = card.querySelector('[data-field="direction"]').value;
    var dateStr     = card.querySelector('[data-field="date"]').value;
    var descStr     = card.querySelector('[data-field="desc"]').value;
    var labelStr    = card.querySelector('[data-field="label"]').value;

    var amount = Number(normalizeDigits(amountStr).replace(/[^\d]/g, '')) || 0;
    var direction = dirHidden;

    if (!amount)    { alert('⚠️ مبلغ را وارد کنید.'); return; }
    if (!direction) { alert('⚠️ واریز یا برداشت را انتخاب کنید.'); return; }
    if (!labelStr.trim()) { alert('⚠️ نام الگو اجباری است.'); return; }
    if (withVoucher && !accountId) { alert('⚠️ برای ساخت سند، حساب بانکی را انتخاب کنید.'); return; }

    var built = buildSmsPattern(pending.raw);
    var amountSlot = null;
    for (var slot in built.mapping) {
        var numVal = Number(String(built.mapping[slot]).replace(/[^\d]/g, ''));
        if (numVal === amount) { amountSlot = parseInt(slot.slice(1), 10); break; }
    }

    addSmsPattern({
        raw: pending.raw,
        key: built.key,
        tokens: built.tokens,
        mapping: built.mapping,
        slots: { amount: amountSlot },
        label: labelStr.trim(),
        direction: direction,
        linkedAccountId: accountId
    });

    if (typeof addSmsToInbox === 'function') {
        var res = addSmsToInbox(pending.raw, 'learned');
        if (res.ok && typeof getSmsInbox === 'function' && typeof saveSmsInbox === 'function') {
            var inbox = getSmsInbox();
            for (var i = 0; i < inbox.length; i++) {
                if (inbox[i].id === res.item.id) {
                    inbox[i].status = 'converted';
                    inbox[i].parsed.direction = direction;
                    inbox[i].parsed.amount = amount;
                }
            }
            saveSmsInbox(inbox);
            if (typeof renderSmsInbox === 'function') renderSmsInbox();
        }
    }

    if (withVoucher) {
        createVoucherFromPending({
            bankAccountId: accountId,
            amount: amount,
            direction: direction,
            date: normalizeDigits(dateStr).trim() || todayJalaliStr(),
            description: descStr.trim() || labelStr.trim()
        });
    }

    removePendingSms(pid);
    renderPendingSmsBox();
    if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
    showToast(withVoucher
        ? '✅ الگو ثبت شد + سند ساخته شد (' + (direction === 'in' ? 'واریز' : 'برداشت') + ')'
        : '🧠 الگو ثبت شد (' + (direction === 'in' ? 'واریز' : 'برداشت') + ')');
}

/* ==================== Migrate: پاک کردن الگوهای قدیمی ==================== */
window.migrateSmsPatternsToV2 = function () {
    var list = loadSmsPatterns();
    if (!Array.isArray(list) || list.length === 0) {
        console.log('الگویی برای مهاجرت وجود ندارد.');
        return;
    }
    if (!confirm('⚠️ این کار همه ' + list.length + ' الگوی قبلی را حذف می‌کند (چون فرمت key تغییر کرده و دیگه کار نمی‌کنند).\n\nادامه؟')) return;
    saveSmsPatterns([]);
    DB.save(SMS_PENDING_KEY, []);
    console.log('✅ الگوها پاک شدند. لطفاً پیامک‌های جدید را دوباره آموزش بده.');
    showToast('🗑 الگوهای قدیمی پاک شد');
    if (typeof renderPendingSmsBox === 'function') renderPendingSmsBox();
};

/* ==================== Init ==================== */
(function () {
    function init() {
        var patterns = loadSmsPatterns();
        if (patterns.length > 0 && !localStorage.getItem('parsis.sms.v2Migrated')) {
            console.log('⚠️ توجه: الگوهای SMS قدیمی با فرمت جدید سازگار نیستند.');
            console.log('   برای پاک کردن: window.migrateSmsPatternsToV2()');
        }

        if (typeof renderPendingSmsBox === 'function') renderPendingSmsBox();

        console.log('✨ 11-sms-direction-fix.js v2 loaded — sign-before-AND-after detection');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 700); });
    } else {
        setTimeout(init, 700);
    }
})();
