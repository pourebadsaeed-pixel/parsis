/* =====================================================================
   پارسیس v27 — 06c-sms-patterns-fixes.js
   اصلاح باگ‌های 06 و 06b:
   ۱) تشخیص مبلغ و نوع تراکنش (برداشت/واریز) از کلمات کلیدی
   ۲) کارکردن دکمه «ساخت سند» در صندوق پیامک
   ۳) نمایش لیست و جزئیات الگوها در یک modal تمیز
   ===================================================================== */
'use strict';

/* ==================== ۱) اصلاح parseBankSms ==================== */
(function () {
    var _orig = window.parseBankSms;
    if (typeof _orig !== 'function') return;

    window.parseBankSms = function (text) {
        var r = _orig(text) || {};
        var t = normalizeDigits(String(text || ''));

        // مبلغ: اولویت اول — عدد بلافاصله بعد از «مبلغ»
        var mamt = t.match(/مبلغ\s*[:ـ]?\s*([\d][\d,]*)/);
        if (mamt) {
            var vamt = Number(mamt[1].replace(/,/g, ''));
            if (vamt > 0) r.amount = vamt;
        } else if (!r.amount || r.amount === 0) {
            // اولویت دوم — عددی که با کاما نوشته شده (شماره حساب‌ها معمولاً کاما ندارند)
            var mcomma = t.match(/([\d]{1,3}(?:,[\d]{3})+)/);
            if (mcomma) {
                var vc = Number(mcomma[1].replace(/,/g, ''));
                if (vc > 1000) r.amount = vc;
            }
        }

        // نوع تراکنش از کلمات کلیدی (وقتی علامت +/- وجود ندارد)
        if (!r.direction) {
            if (/برداشت|پرداخت|خرید|کسر|بدهکار|انتقال\s*از|کاهش|قسط/.test(t)) r.direction = 'out';
            else if (/واریز|دریافت|افزایش|بستانکار|انتقال\s*به|حقوق|افزودن/.test(t)) r.direction = 'in';
            else if (/-\s*[\d]/.test(t)) r.direction = 'out';
            else if (/\+\s*[\d]/.test(t)) r.direction = 'in';
        }

        return r;
    };
})();

/* ==================== ۲) اصلاح convertSmsToVoucher ==================== */
window.convertSmsToVoucher = function (smsId) {
    var list = getSmsInbox();
    var item = list.find(function (s) { return s.id === smsId; });
    if (!item) { showToast('پیامک یافت نشد.'); return; }

    var p = item.parsed || {};
    var raw = normalizeDigits(item.rawText);
    var amount = p.amount || 0;
    var direction = p.direction || '';
    var bankAccountId = p.matchedAccountId || '';

    // اگر مبلغ نداریم یا مشکوک است (بیش از ۱۲ رقم = شبیه شماره حساب) → از متن استخراج کن
    if (!amount || amount > 1e12) {
        var mamt = raw.match(/مبلغ\s*[:ـ]?\s*([\d][\d,]*)/);
        if (mamt) amount = Number(mamt[1].replace(/,/g, ''));
        else {
            var mcomma = raw.match(/([\d]{1,3}(?:,[\d]{3})+)/);
            if (mcomma) amount = Number(mcomma[1].replace(/,/g, ''));
        }
    }

    if (!amount || amount > 1e13) {
        alert('⚠️ مبلغ در پیامک قابل تشخیص نیست.\nبرای این پیامک از باکس «ثبت نشده» الگو تعریف کن.');
        return;
    }

    // نوع تراکنش
    if (!direction) {
        if (/برداشت|پرداخت|خرید|کسر|بدهکار|قسط/.test(raw)) direction = 'out';
        else if (/واریز|دریافت|افزایش|بستانکار|حقوق/.test(raw)) direction = 'in';
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
    if (!bankMoein) {
        alert('⚠️ معین بانک تعریف نشده.\nاز «تعریف حساب‌ها» یک حساب معین با گزینه «بانکی» بساز.');
        return;
    }

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
        desc: '',
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
    showToast('✅ پیش‌نویس سند ساخته شد');
};

/* ==================== ۳) مدیریت الگوها با Modal ==================== */
function ensureSmsPatternsModal() {
    if (document.getElementById('sms-patterns-modal')) return;
    var html = ''
        + '<div id="sms-patterns-overlay" class="overlay"></div>'
        + '<div id="sms-patterns-modal" class="modal" style="max-width:820px">'
        +   '<div class="modal-head">'
        +     '<h2>🧠 الگوهای پیامک بانکی</h2>'
        +     '<button id="sms-patterns-close" class="close-btn">×</button>'
        +   '</div>'
        +   '<div class="modal-body" id="sms-patterns-body"></div>'
        +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">'
        +     '<button id="sms-patterns-del-all" class="btn-danger">🗑 حذف همه</button>'
        +     '<button id="sms-patterns-close-btn" class="btn-primary">بستن</button>'
        +   '</div>'
        + '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('sms-patterns-close').addEventListener('click', closeSmsPatternsManager);
    document.getElementById('sms-patterns-close-btn').addEventListener('click', closeSmsPatternsManager);
    document.getElementById('sms-patterns-overlay').addEventListener('click', closeSmsPatternsManager);
    document.getElementById('sms-patterns-del-all').addEventListener('click', function () {
        if (loadSmsPatterns().length === 0) { showToast('الگویی وجود ندارد.'); return; }
        if (!confirm('همه الگوها حذف شوند؟ این کار قابل بازگشت نیست.')) return;
        saveSmsPatterns([]);
        renderSmsPatternsManagerBody();
        showToast('🗑 همه الگوها حذف شد');
    });
}

function openSmsPatternsManager() {
    ensureSmsPatternsModal();
    renderSmsPatternsManagerBody();
    document.getElementById('sms-patterns-overlay').classList.add('show');
    document.getElementById('sms-patterns-modal').classList.add('show');
}
function closeSmsPatternsManager() {
    var o = document.getElementById('sms-patterns-overlay');
    var m = document.getElementById('sms-patterns-modal');
    if (o) o.classList.remove('show');
    if (m) m.classList.remove('show');
}

function renderSmsPatternsManagerBody() {
    var box = document.getElementById('sms-patterns-body');
    if (!box) return;
    var patterns = loadSmsPatterns();

    if (patterns.length === 0) {
        box.innerHTML = '<div class="widget-empty">هنوز هیچ الگویی ثبت نشده.<br>'
            + '<span style="font-size:.75rem;opacity:.8">'
            + 'وقتی پیامک بانکی جدیدی دیدی، در باکس «ثبت نشده» فرم را پر کن و «ثبت الگو» را بزن.'
            + '</span></div>';
        return;
    }

    var sorted = patterns.slice().sort(function (a, b) {
        return (b.lastUsed || 0) - (a.lastUsed || 0);
    });

    var accounts = DB.load('bankAccounts', []);
    var accMap = {};
    accounts.forEach(function (a) { accMap[a.id] = a; });

    var html = '<div style="display:grid;gap:12px">';
    for (var i = 0; i < sorted.length; i++) {
        var p = sorted[i];
        var linkedAcc = accMap[p.linkedAccountId];
        var accLabel = linkedAcc
            ? ((linkedAcc.bank || '') + ' — ' + (linkedAcc.account || ''))
            : '— (تعیین نشده)';
        var dirLabel = p.direction === 'out' ? '🔴 برداشت'
                      : p.direction === 'in' ? '🟢 واریز'
                      : '❔ نامشخص';
        var dirCls = p.direction === 'out' ? 'badge-draft'
                    : p.direction === 'in' ? 'badge-approved' : '';

        var preview = (p.tokens || []).join(' ');
        if (preview.length > 140) preview = preview.slice(0, 140) + '…';

        html += '<div class="card" style="margin:0;padding:14px">'
            +   '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:8px">'
            +     '<div style="flex:1;min-width:0">'
            +       '<div style="font-weight:800;color:var(--primary-dark);font-size:.95rem">'
            +         esc(p.label || 'بدون نام')
            +       '</div>'
            +       '<div style="font-size:.74rem;color:var(--text-muted);margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">'
            +         '<span>🏦 ' + esc(accLabel) + '</span>'
            +         '<span class="badge ' + dirCls + '">' + dirLabel + '</span>'
            +       '</div>'
            +     '</div>'
            +     '<button class="row-btn del" data-pattern-del="' + p.id + '" title="حذف" '
            +       'style="background:#fee2e2;color:#dc2626;border-radius:9px;padding:8px 12px;font-weight:800">🗑 حذف</button>'
            +   '</div>'
            +   '<div style="background:var(--card-alt);border:1px solid var(--border);border-radius:10px;padding:10px;font-size:.76rem;direction:rtl;line-height:1.8">'
            +     '<div style="color:var(--text-muted);margin-bottom:4px;font-weight:700">نمونهٔ الگو (توکن‌ها):</div>'
            +     '<div style="font-family:monospace;direction:rtl;white-space:pre-wrap;word-break:break-word;color:var(--primary-dark)">'
            +       esc(preview)
            +     '</div>'
            +   '</div>'
            +   '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:.72rem;color:var(--text-muted);margin-top:8px">'
            +     '<span>📊 ' + toFa(p.uses || 0) + ' بار استفاده</span>'
            +     '<span>📅 آخرین: '
            +       (p.lastUsed ? toFa(tsToJalaliDate(p.lastUsed)) + ' ' + toFa(tsToJalaliTime(p.lastUsed)) : '—')
            +     '</span>'
            +   '</div>'
            + '</div>';
    }
    html += '</div>';
    box.innerHTML = html;

    var btns = box.querySelectorAll('[data-pattern-del]');
    for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
            var id = this.getAttribute('data-pattern-del');
            var pat = loadSmsPatterns().find(function (x) { return x.id === id; });
            if (!pat) return;
            if (!confirm('الگوی «' + (pat.label || '') + '» حذف شود؟')) return;
            deleteSmsPattern(id);
            renderSmsPatternsManagerBody();
            showToast('🗑 الگو حذف شد');
        });
    }
}

/* ==================== ۴) جایگزینی showSmsPatternsManager ==================== */
window.showSmsPatternsManager = openSmsPatternsManager;

/* ==================== Init ==================== */
(function () {
    function bind() {
        var btn = document.getElementById('sms-patterns-manage');
        if (!btn) return;
        // جایگزینی listener قدیمی
        var newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openSmsPatternsManager();
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(bind, 400); });
    } else {
        setTimeout(bind, 400);
    }
    console.log('🔧 06c SMS fixes loaded');
})();
