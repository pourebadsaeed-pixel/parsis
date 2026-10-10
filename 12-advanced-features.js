/* =====================================================================
   پارسیس v27 — 12-advanced-features.js
   ویژگی‌های پیشرفته:
   ۱) ویرایش و مسدود/آزادسازی الگوی پیامک
   ۲) تشخیص دقیق جهت (برداشت/واریز) با علامت مبلغ
   ۳) مرور حساب: کلیک روی هر ردیف → ویرایش سند
   ۴) تراز آزمایشی با سطح گروه
   ۵) جستجو/فیلتر پیشرفته در تمام ستون‌های جداول
   ۶) مرتب‌سازی سراسری در همه جداول
   ===================================================================== */
'use strict';

/* ============================================================
   ================ ۱) تشخیص دقیق جهت با علامت ================
   ============================================================ */
function parseAmountWithSign(text) {
    var t = normalizeDigits(String(text || ''))
        .replace(/[−–—]/g, '-')
        .replace(/[＋]/g, '+');

    var patterns = [
        /مبلغ\s*[:ـ]?\s*([+\-]?\s*[\d][\d,]*)/,
        /(?:انتقالي|انتقالی)\s*[:ـ]?\s*([+\-]?\s*[\d][\d,]*)/,
        /(?:موجودي|موجودی)\s*[:ـ]?\s*([+\-]?\s*[\d][\d,]*)/,
        /(?:برداشت|واریز|خرید|پرداخت)\s*[:ـ]?\s*([+\-]?\s*[\d][\d,]*)/,
        /([+\-])\s*([\d]{1,3}(?:,[\d]{3})+)/
    ];

    for (var i = 0; i < patterns.length; i++) {
        var m = t.match(patterns[i]);
        if (!m) continue;
        var raw, sign = '';
        if (m.length >= 3 && (m[1] === '+' || m[1] === '-')) {
            sign = m[1]; raw = m[2];
        } else {
            raw = String(m[1]).replace(/\s+/g, '');
            if (raw.charAt(0) === '+') { sign = '+'; raw = raw.slice(1); }
            else if (raw.charAt(0) === '-') { sign = '-'; raw = raw.slice(1); }
        }
        var num = Number(String(raw).replace(/,/g, ''));
        if (num > 0) return { amount: num, sign: sign };
    }
    var m2 = t.match(/([+\-])?\s*([\d]{1,3}(?:,[\d]{3})+)/);
    if (m2) return { amount: Number(m2[2].replace(/,/g, '')), sign: m2[1] || '' };
    return { amount: 0, sign: '' };
}
window.parseAmountWithSign = parseAmountWithSign;

function detectDirectionPrecise(text) {
    var t = normalizeDigits(String(text || '')).replace(/[−–—]/g, '-');
    var amt = parseAmountWithSign(t);
    if (amt.sign === '+') return 'in';
    if (amt.sign === '-') return 'out';

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

    if (/واریز|افزایش|دریافت|حقوق|سود\s*بانکی/.test(t)) return 'in';
    if (/برداشت|خرید|کسر|قسط|پرداخت/.test(t)) return 'out';
    return '';
}
window.detectSmsDirection = detectDirectionPrecise;

/* ============================================================
   ================ ۲) ویرایش/مسدودسازی الگوها ================
   ============================================================ */

// override findMatchingSmsPattern برای نادیده گرفتن الگوهای مسدود
(function () {
    var _orig = window.findMatchingSmsPattern;
    if (typeof _orig !== 'function') return;
    window.findMatchingSmsPattern = function (raw) {
        var patterns = (typeof loadSmsPatterns === 'function') ? loadSmsPatterns() : [];
        var active = patterns.filter(function (p) { return !p.blocked; });
        if (active.length === 0) return null;
        if (typeof buildSmsPattern !== 'function' || typeof smsTokenSimilarity !== 'function') {
            return _orig(raw);
        }
        var built = buildSmsPattern(raw);
        var best = null, bestScore = 0;
        for (var i = 0; i < active.length; i++) {
            var s = smsTokenSimilarity(built.tokens, active[i].tokens || []);
            if (s > bestScore) { bestScore = s; best = active[i]; }
        }
        return bestScore >= (window.SMS_PATTERN_THRESHOLD || 0.75)
            ? { pattern: best, score: bestScore, built: built }
            : null;
    };
})();

function openEditSmsPattern(patternId) {
    var patterns = loadSmsPatterns();
    var p = patterns.find(function (x) { return x.id === patternId; });
    if (!p) { showToast('الگو یافت نشد.'); return; }

    var old = document.getElementById('sms-edit-modal'); if (old) old.remove();
    var oldO = document.getElementById('sms-edit-overlay'); if (oldO) oldO.remove();

    var accounts = DB.load('bankAccounts', []);
    var accOpts = '<option value="">— تعیین نشده —</option>';
    accounts.forEach(function (a) {
        var sel = (p.linkedAccountId === a.id) ? ' selected' : '';
        accOpts += '<option value="' + a.id + '"' + sel + '>' + esc((a.bank || '') + ' — ' + (a.account || '')) + '</option>';
    });
    var dirIn  = p.direction === 'in'  ? 'checked' : '';
    var dirOut = p.direction === 'out' ? 'checked' : '';

    var html = ''
        + '<div id="sms-edit-overlay" class="overlay" style="z-index:1400"></div>'
        + '<div id="sms-edit-modal" class="modal" style="max-width:560px;z-index:1410">'
        +   '<div class="modal-head"><h2>✏️ ویرایش الگوی پیامک</h2>'
        +     '<button id="sms-edit-close" class="close-btn">×</button></div>'
        +   '<div class="modal-body">'
        +     '<div class="field"><label>نام الگو</label>'
        +       '<input type="text" id="se-label" value="' + esc(p.label || '') + '"></div>'
        +     '<div class="field"><label>حساب بانکی مرتبط</label>'
        +       '<select id="se-account">' + accOpts + '</select></div>'
        +     '<div class="field"><label>جهت تراکنش</label>'
        +       '<div class="psf-radio">'
        +         '<label class="' + (dirIn ? 'checked-in' : '') + '"><input type="radio" name="se_dir" value="in" ' + dirIn + '> 📥 واریز</label>'
        +         '<label class="' + (dirOut ? 'checked-out' : '') + '"><input type="radio" name="se_dir" value="out" ' + dirOut + '> 📤 برداشت</label>'
        +       '</div></div>'
        +     '<div class="field"><label>نمونه الگو</label>'
        +       '<div style="background:var(--card-alt);border:1px solid var(--border);border-radius:10px;padding:10px;font-family:monospace;font-size:.78rem;direction:rtl;line-height:1.8;max-height:150px;overflow-y:auto">'
        +         esc((p.tokens || []).join(' '))
        +       '</div></div>'
        +     '<div class="field"><label style="display:flex;align-items:center;gap:8px;padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer">'
        +       '<input type="checkbox" id="se-blocked" ' + (p.blocked ? 'checked' : '') + '> '
        +       '<span style="font-size:.82rem">مسدود کردن این الگو (برای شناسایی خودکار استفاده نشود)</span></label></div>'
        +   '</div>'
        +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">'
        +     '<button id="sms-edit-save" class="btn-primary">💾 ذخیره</button>'
        +     '<button id="sms-edit-cancel" class="btn-secondary">انصراف</button>'
        +   '</div>'
        + '</div>';

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('sms-edit-close').onclick = closeSmsEditModal;
    document.getElementById('sms-edit-cancel').onclick = closeSmsEditModal;
    document.getElementById('sms-edit-overlay').onclick = closeSmsEditModal;

    // رنگ کردن رادیوها
    var radios = document.querySelectorAll('input[name="se_dir"]');
    radios.forEach(function (r) {
        r.addEventListener('change', function () {
            var labels = document.querySelectorAll('.psf-radio label');
            labels.forEach(function (L) {
                L.classList.remove('checked-out', 'checked-in');
                var inp = L.querySelector('input');
                if (inp && inp.checked) L.classList.add(inp.value === 'in' ? 'checked-in' : 'checked-out');
            });
        });
    });

    document.getElementById('sms-edit-save').onclick = function () {
        var all = loadSmsPatterns();
        var idx = all.findIndex(function (x) { return x.id === patternId; });
        if (idx === -1) { closeSmsEditModal(); return; }
        var newLabel = document.getElementById('se-label').value.trim();
        var newAcc = document.getElementById('se-account').value;
        var dirEl = document.querySelector('input[name="se_dir"]:checked');
        var newDir = dirEl ? dirEl.value : '';
        var blocked = document.getElementById('se-blocked').checked;
        if (!newLabel) { alert('نام الگو اجباری است.'); return; }
        all[idx].label = newLabel;
        all[idx].linkedAccountId = newAcc;
        all[idx].direction = newDir;
        all[idx].blocked = blocked;
        all[idx].lastEdited = Date.now();
        saveSmsPatterns(all);
        closeSmsEditModal();
        if (typeof window.renderSmsPatternsManagerBody === 'function') window.renderSmsPatternsManagerBody();
        showToast('✅ ذخیره شد' + (blocked ? ' (مسدود)' : ''));
    };
}
function closeSmsEditModal() {
    var m = document.getElementById('sms-edit-modal'); if (m) m.remove();
    var o = document.getElementById('sms-edit-overlay'); if (o) o.remove();
}
window.openEditSmsPattern = openEditSmsPattern;

// بازنویسی لیست الگوها با دکمه ویرایش و مسدود
window.renderSmsPatternsManagerBody = function () {
    var box = document.getElementById('sms-patterns-body');
    if (!box) return;
    var patterns = loadSmsPatterns();
    if (patterns.length === 0) {
        box.innerHTML = '<div class="widget-empty">هنوز الگویی ثبت نشده.</div>';
        return;
    }
    var sorted = patterns.slice().sort(function (a, b) {
        if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
        return (b.lastUsed || 0) - (a.lastUsed || 0);
    });
    var accounts = DB.load('bankAccounts', []);
    var accMap = {};
    accounts.forEach(function (a) { accMap[a.id] = a; });

    var html = '<div style="display:grid;gap:12px">';
    for (var i = 0; i < sorted.length; i++) {
        var p = sorted[i];
        var linkedAcc = accMap[p.linkedAccountId];
        var accLabel = linkedAcc ? ((linkedAcc.bank || '') + ' — ' + (linkedAcc.account || '')) : '— (تعیین نشده)';
        var dirLabel = p.direction === 'out' ? '🔴 برداشت' : p.direction === 'in' ? '🟢 واریز' : '❔ نامشخص';
        var dirCls = p.direction === 'out' ? 'badge-draft' : p.direction === 'in' ? 'badge-approved' : '';
        var preview = (p.tokens || []).join(' ');
        if (preview.length > 140) preview = preview.slice(0, 140) + '…';
        var blockedBadge = p.blocked
            ? ' <span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:8px;font-size:.66rem;font-weight:800">🚫 مسدود</span>'
            : '';
        var opacity = p.blocked ? 'opacity:.65;' : '';

        html += '<div class="card" style="margin:0;padding:14px;' + opacity + '">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:8px">'
            +   '<div style="flex:1;min-width:0">'
            +     '<div style="font-weight:800;color:var(--primary-dark);font-size:.95rem">' + esc(p.label || 'بدون نام') + blockedBadge + '</div>'
            +     '<div style="font-size:.74rem;color:var(--text-muted);margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">'
            +       '<span>🏦 ' + esc(accLabel) + '</span>'
            +       '<span class="badge ' + dirCls + '">' + dirLabel + '</span>'
            +     '</div>'
            +   '</div>'
            +   '<div style="display:flex;gap:6px;flex-wrap:wrap">'
            +     '<button data-pattern-edit="' + p.id + '" style="background:#dbeafe;color:#1e40af;border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">✏️ ویرایش</button>'
            +     '<button data-pattern-block="' + p.id + '" style="background:' + (p.blocked ? '#d1fae5;color:#065f46' : '#fef3c7;color:#92400e') + ';border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">' + (p.blocked ? '✅ رفع' : '🚫 مسدود') + '</button>'
            +     '<button data-pattern-del="' + p.id + '" style="background:#fee2e2;color:#dc2626;border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">🗑</button>'
            +   '</div>'
            + '</div>'
            + '<div style="background:var(--card-alt);border:1px solid var(--border);border-radius:10px;padding:10px;font-size:.76rem;direction:rtl;line-height:1.8">'
            +   '<div style="color:var(--text-muted);margin-bottom:4px;font-weight:700">نمونهٔ الگو:</div>'
            +   '<div style="font-family:monospace;direction:rtl;white-space:pre-wrap;word-break:break-word;color:var(--primary-dark)">' + esc(preview) + '</div>'
            + '</div>'
            + '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:.72rem;color:var(--text-muted);margin-top:8px">'
            +   '<span>📊 ' + toFa(p.uses || 0) + ' بار</span>'
            +   '<span>📅 ' + (p.lastUsed ? toFa(tsToJalaliDate(p.lastUsed)) + ' ' + toFa(tsToJalaliTime(p.lastUsed)) : '—') + '</span>'
            + '</div>'
            + '</div>';
    }
    html += '</div>';
    box.innerHTML = html;

    box.querySelectorAll('[data-pattern-del]').forEach(function (b) {
        b.addEventListener('click', function () {
            var id = this.getAttribute('data-pattern-del');
            var pat = loadSmsPatterns().find(function (x) { return x.id === id; });
            if (!pat) return;
            if (!confirm('الگوی «' + (pat.label || '') + '» حذف شود؟')) return;
            deleteSmsPattern(id);
            window.renderSmsPatternsManagerBody();
            showToast('🗑 حذف شد');
        });
    });
    box.querySelectorAll('[data-pattern-edit]').forEach(function (b) {
        b.addEventListener('click', function () {
            openEditSmsPattern(this.getAttribute('data-pattern-edit'));
        });
    });
    box.querySelectorAll('[data-pattern-block]').forEach(function (b) {
        b.addEventListener('click', function () {
            var id = this.getAttribute('data-pattern-block');
            var all = loadSmsPatterns();
            var idx = all.findIndex(function (x) { return x.id === id; });
            if (idx === -1) return;
            all[idx].blocked = !all[idx].blocked;
            saveSmsPatterns(all);
            window.renderSmsPatternsManagerBody();
            showToast(all[idx].blocked ? '🚫 مسدود شد' : '✅ رفع مسدودی');
        });
    });
};

/* ============================================================
   ================ ۳) مرور حساب: کلیک روی ردیف → ویرایش ================
   ============================================================ */
(function () {
    var _origTurnover = window.openAccountTurnover;
    if (typeof _origTurnover !== 'function') return;
    window.openAccountTurnover = function (accountId, detailInfo) {
        _origTurnover(accountId, detailInfo);
        setTimeout(function () {
            var body = document.getElementById('turnover-body');
            if (!body) return;
            var table = body.querySelector('table');
            if (!table) return;
            var rows = table.querySelectorAll('tbody tr');
            rows.forEach(function (tr) {
                var tds = tr.querySelectorAll('td');
                if (tds.length < 3) return;
                var num = (tds[2].textContent || '').trim();
                if (!num) return;
                var v = DB.load('vouchers', []).find(function (x) {
                    return String(normalizeDigits(x.number || '')) === String(normalizeDigits(num));
                });
                if (!v) return;
                if (tr.dataset.vidBound === '1') return;
                tr.dataset.vidBound = '1';
                tr.setAttribute('data-vid', v.id);
                tr.style.cursor = 'pointer';
                tr.addEventListener('mouseenter', function () { tr.style.background = 'var(--primary-soft)'; });
                tr.addEventListener('mouseleave', function () { tr.style.background = ''; });
                tr.addEventListener('click', function (e) {
                    if (e.target.closest('button')) return;
                    window.editVoucherFromAnywhere(v.id);
                });
            });
        }, 150);
    };
})();

window.editVoucherFromAnywhere = function (vid) {
    var v = findVoucherById(vid);
    if (!v) { showToast('سند یافت نشد.'); return; }
    if (v.status === 'approved') {
        var ans = confirm('سند تأیید شده است.\n\nOK = برگشت از تأیید + ویرایش\nCancel = مشاهده');
        if (ans) {
            var l = DB.load('vouchers', []);
            for (var i = 0; i < l.length; i++) if (l[i].id === vid) l[i].status = 'draft';
            DB.save('vouchers', l);
            showToast('↩ سند به پیش‌نویس برگشت.');
            loadVoucherForEdit(v);
        } else {
            openVoucherPreview(v);
        }
        return;
    }
    loadVoucherForEdit(v);
};

/* ============================================================
   ================ ۴) تراز آزمایشی با سطح گروه ================
   ============================================================ */
(function () {
    function ensureGroupOption() {
        var sel = document.getElementById('rt-level');
        if (!sel) return;
        if (sel.querySelector('option[value="1"]')) return;
        var opt = document.createElement('option');
        opt.value = '1';
        opt.textContent = 'گروه';
        sel.insertBefore(opt, sel.firstChild);
    }
    function loop() {
        ensureGroupOption();
        setTimeout(loop, 2000);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(loop, 800); });
    } else {
        setTimeout(loop, 800);
    }
})();

/* ============================================================
   ================ ۵) جستجو/فیلتر پیشرفته ================
   ============================================================ */
var COLUMN_FILTERS = {};
var FILTER_OPS = [
    { key: 'contains',    label: 'شامل' },
    { key: 'notContains', label: 'شامل نباشد' },
    { key: 'eq',          label: 'مساوی' },
    { key: 'neq',         label: 'نامساوی' },
    { key: 'startsWith',  label: 'شروع با' },
    { key: 'endsWith',    label: 'پایان با' },
    { key: 'gt',          label: 'بزرگتر از' },
    { key: 'gte',         label: 'بزرگتر یا مساوی' },
    { key: 'lt',          label: 'کوچکتر از' },
    { key: 'lte',         label: 'کوچکتر یا مساوی' },
    { key: 'empty',       label: 'خالی' },
    { key: 'notEmpty',    label: 'غیرخالی' }
];

function normalizeCellText(s) {
    return String(s || '')
        .replace(/[\u200c\u200e\u200f]/g, ' ')
        .replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک')
        .replace(/\u066C/g, ',')
        .replace(/\s+/g, ' ')
        .trim().toLowerCase();
}
function cellToNumber(s) {
    var t = normalizeDigits(String(s || '')).replace(/[^\d\-\.]/g, '');
    if (!t || t === '-') return null;
    var n = Number(t);
    return isFinite(n) ? n : null;
}
function testFilter(cellText, filter) {
    if (!filter || !filter.op) return true;
    var txt = normalizeCellText(cellText);
    var val = normalizeCellText(filter.val || '');
    switch (filter.op) {
        case 'contains':    return txt.indexOf(val) !== -1;
        case 'notContains': return txt.indexOf(val) === -1;
        case 'eq':          return txt === val;
        case 'neq':         return txt !== val;
        case 'startsWith':  return txt.indexOf(val) === 0;
        case 'endsWith':    return val.length > 0 && txt.slice(-val.length) === val;
        case 'empty':       return txt === '' || txt === '—';
        case 'notEmpty':    return txt !== '' && txt !== '—';
        case 'gt': case 'gte': case 'lt': case 'lte': {
            var a = cellToNumber(cellText);
            var b = cellToNumber(filter.val);
            if (a === null || b === null) return false;
            if (filter.op === 'gt')  return a >  b;
            if (filter.op === 'gte') return a >= b;
            if (filter.op === 'lt')  return a <  b;
            if (filter.op === 'lte') return a <= b;
        }
    }
    return true;
}

function applyColumnFiltersToTable(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var filters = COLUMN_FILTERS[tableId] || {};
    var hasAny = Object.keys(filters).some(function (k) { return filters[k] && filters[k].op; });
    var tbody = table.querySelector('tbody');
    if (!tbody) return;
    var rows = tbody.querySelectorAll('tr');
    if (!hasAny) {
        rows.forEach(function (tr) { tr.style.display = ''; });
        return;
    }
    rows.forEach(function (tr) {
        var tds = tr.children;
        if (tds.length === 1 && tds[0].hasAttribute('colspan')) {
            tr.style.display = 'none'; return;
        }
        var show = true;
        for (var key in filters) {
            var idx = Number(key);
            var f = filters[key];
            if (!f || !f.op) continue;
            var cellTxt = tds[idx] ? tds[idx].textContent : '';
            if (!testFilter(cellTxt, f)) { show = false; break; }
        }
        tr.style.display = show ? '' : 'none';
    });
}

function buildFilterRow(table) {
    if (!table || !table.id) return;
    var thead = table.querySelector('thead');
    if (!thead) return;
    if (thead.querySelector('tr.column-filter-row')) return;
    var headerRow = thead.querySelector('tr');
    if (!headerRow) return;
    var ths = headerRow.querySelectorAll('th');
    if (ths.length === 0) return;

    var filterTr = document.createElement('tr');
    filterTr.className = 'column-filter-row';
    for (var i = 0; i < ths.length; i++) {
        (function (idx) {
            var td = document.createElement('th');
            td.className = 'column-filter-cell';
            td.style.cssText = 'padding:4px 6px;background:var(--card-alt);border-bottom:1px solid var(--border);font-weight:normal';

            var wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;gap:2px;align-items:center';

            var inp = document.createElement('input');
            inp.type = 'text';
            inp.placeholder = '🔍';
            inp.style.cssText = 'width:100%;padding:4px 6px;font-size:.72rem;border:1px solid var(--border);border-radius:6px;background:var(--card-solid);font-family:inherit;outline:none;min-width:0';

            var funnel = document.createElement('button');
            funnel.type = 'button';
            funnel.textContent = '▼';
            funnel.title = 'عملگر فیلتر';
            funnel.style.cssText = 'background:var(--primary-soft);color:var(--primary-dark);border:1px solid var(--border);border-radius:6px;padding:3px 5px;font-size:.6rem;cursor:pointer;flex-shrink:0';
            funnel.addEventListener('click', function (e) {
                e.stopPropagation();
                openFilterMenu(table.id, idx, inp, funnel);
            });

            wrap.appendChild(inp);
            wrap.appendChild(funnel);
            td.appendChild(wrap);
            filterTr.appendChild(td);

            var existing = (COLUMN_FILTERS[table.id] || {})[idx];
            if (existing) {
                if (existing.op !== 'empty' && existing.op !== 'notEmpty') inp.value = existing.val || '';
                if (existing.op && existing.op !== 'contains') {
                    funnel.style.background = 'var(--primary)';
                    funnel.style.color = '#fff';
                    funnel.textContent = '▼*';
                }
            }

            inp.addEventListener('input', function () {
                var v = this.value.trim();
                if (!COLUMN_FILTERS[table.id]) COLUMN_FILTERS[table.id] = {};
                if (!v) {
                    var cur = COLUMN_FILTERS[table.id][idx];
                    if (cur && (cur.op === 'empty' || cur.op === 'notEmpty')) {
                        // نگه‌دار
                    } else {
                        delete COLUMN_FILTERS[table.id][idx];
                    }
                } else {
                    var cur = COLUMN_FILTERS[table.id][idx] || {};
                    COLUMN_FILTERS[table.id][idx] = { op: cur.op || 'contains', val: v };
                }
                applyColumnFiltersToTable(table.id);
            });
        })(i);
    }
    thead.appendChild(filterTr);
}

function openFilterMenu(tableId, colIdx, inp, anchor) {
    var old = document.getElementById('col-filter-menu');
    if (old) old.remove();

    var menu = document.createElement('div');
    menu.id = 'col-filter-menu';
    menu.style.cssText = 'position:fixed;z-index:2000;background:var(--card-solid);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow-lg);padding:6px;min-width:170px;direction:rtl';

    var cur = (COLUMN_FILTERS[tableId] || {})[colIdx];
    var curOp = cur ? cur.op : 'contains';

    FILTER_OPS.forEach(function (o) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'display:block;width:100%;padding:7px 12px;text-align:right;background:none;border:none;font-family:inherit;font-size:.8rem;cursor:pointer;border-radius:6px;color:' + (o.key === curOp ? 'var(--primary-dark)' : 'var(--text)') + ';font-weight:' + (o.key === curOp ? '900' : 'normal');
        btn.textContent = (o.key === curOp ? '✓ ' : '   ') + o.label;
        btn.addEventListener('mouseenter', function () { btn.style.background = 'var(--primary-soft)'; });
        btn.addEventListener('mouseleave', function () { btn.style.background = ''; });
        btn.addEventListener('click', function () {
            if (!COLUMN_FILTERS[tableId]) COLUMN_FILTERS[tableId] = {};
            var v = inp.value.trim();
            COLUMN_FILTERS[tableId][colIdx] = { op: o.key, val: v };
            applyColumnFiltersToTable(tableId);
            if (o.key !== 'contains' && o.key !== 'empty' && o.key !== 'notEmpty') {
                anchor.style.background = 'var(--primary)';
                anchor.style.color = '#fff';
                anchor.textContent = '▼*';
            }
            menu.remove();
        });
        menu.appendChild(btn);
    });

    var clr = document.createElement('button');
    clr.type = 'button';
    clr.style.cssText = 'display:block;width:100%;padding:7px 12px;text-align:right;background:#fee2e2;color:#dc2626;border:none;font-family:inherit;font-size:.8rem;cursor:pointer;border-radius:6px;margin-top:4px;font-weight:800';
    clr.textContent = '🗑 پاک کردن';
    clr.addEventListener('click', function () {
        if (COLUMN_FILTERS[tableId]) delete COLUMN_FILTERS[tableId][colIdx];
        inp.value = '';
        anchor.textContent = '▼';
        anchor.style.background = 'var(--primary-soft)';
        anchor.style.color = 'var(--primary-dark)';
        applyColumnFiltersToTable(tableId);
        menu.remove();
    });
    menu.appendChild(clr);

    document.body.appendChild(menu);
    var rect = anchor.getBoundingClientRect();
    var top = rect.bottom + 4;
    var left = rect.left - 100;
    if (left < 8) left = 8;
    if (left + 180 > window.innerWidth - 8) left = window.innerWidth - 188;
    if (top + 320 > window.innerHeight - 8) top = Math.max(8, rect.top - 320);
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';

    setTimeout(function () {
        function closer(e) {
            if (!menu.contains(e.target) && e.target !== anchor) {
                menu.remove();
                document.removeEventListener('click', closer, true);
            }
        }
        document.addEventListener('click', closer, true);
    }, 50);
}

function attachFilterRowsToAllTables() {
    var tables = document.querySelectorAll('table.data-table, table.report-table, table.cf-table');
    tables.forEach(function (t) {
        if (!t.id || !t.querySelector('thead')) return;
        buildFilterRow(t);
        if (COLUMN_FILTERS[t.id]) applyColumnFiltersToTable(t.id);
    });
}

/* ============================================================
   ================ ۶) مرتب‌سازی سراسری ================
   ============================================================ */
(function () {
    function getCellValue(tr, idx) {
        var tds = tr.children;
        if (!tds[idx]) return '';
        var txt = (tds[idx].textContent || '').trim();
        var num = Number(normalizeDigits(txt).replace(/[^\d\-\.]/g, ''));
        if (isFinite(num) && txt && /^[\d\-\.,۰-۹٬\s]+$/.test(txt)) return num;
        return txt;
    }
    function sortTableByColumn(table, idx, dir) {
        var tbody = table.querySelector('tbody');
        if (!tbody) return;
        var rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort(function (a, b) {
            var av = getCellValue(a, idx), bv = getCellValue(b, idx);
            if (typeof av === 'number' && typeof bv === 'number') return dir * (av - bv);
            return dir * String(av).localeCompare(String(bv), 'fa');
        });
        rows.forEach(function (r) { tbody.appendChild(r); });
    }
    function enhanceGlobalSorting() {
        var tables = document.querySelectorAll('table.data-table, table.report-table');
        tables.forEach(function (t) {
            if (t.dataset.globalSort === '1') return;
            var headerRow = t.querySelector('thead tr');
            if (!headerRow) return;
            t.dataset.globalSort = '1';
            var ths = headerRow.querySelectorAll('th');
            ths.forEach(function (th, idx) {
                if (th.hasAttribute('data-sortable') || th.hasAttribute('data-sort')) return;
                if (th.classList.contains('column-filter-cell')) return;
                th.style.cursor = 'pointer';
                th.addEventListener('click', function (e) {
                    if (e.target.classList.contains('col-resizer')) return;
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                    var cur = th.dataset.globalSortDir || '';
                    var newDir = cur === 'asc' ? 'desc' : 'asc';
                    ths.forEach(function (o) {
                        delete o.dataset.globalSortDir;
                        var ind = o.querySelector('.global-sort-ind');
                        if (ind) ind.remove();
                    });
                    th.dataset.globalSortDir = newDir;
                    var arrow = document.createElement('span');
                    arrow.className = 'global-sort-ind';
                    arrow.style.cssText = 'font-size:.6rem;margin-right:4px;opacity:.9';
                    arrow.textContent = newDir === 'asc' ? ' ▲' : ' ▼';
                    th.appendChild(arrow);
                    sortTableByColumn(t, idx, newDir === 'asc' ? 1 : -1);
                });
            });
        });
    }
    window._enhanceGlobalSorting = enhanceGlobalSorting;
})();

/* ============================================================
   ================ Init ================
   ============================================================ */
(function () {
    function init() {
        attachFilterRowsToAllTables();
        if (window._enhanceGlobalSorting) window._enhanceGlobalSorting();

        // MutationObserver: هر وقت tbody عوض شد، فیلترها را دوباره اضافه کن
        var observer = new MutationObserver(function (mutations) {
            var needsRefresh = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type !== 'childList') continue;
                var t = m.target;
                if (t && t.tagName === 'TBODY') { needsRefresh = true; break; }
                if (t && t.querySelector) {
                    if (t.querySelector('table.data-table, table.report-table, table.cf-table')) {
                        needsRefresh = true; break;
                    }
                }
            }
            if (needsRefresh) setTimeout(function () {
                attachFilterRowsToAllTables();
                if (window._enhanceGlobalSorting) window._enhanceGlobalSorting();
            }, 80);
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // چک دوره‌ای برای جداولی که با innerHTML بازنویسی می‌شوند
        setInterval(function () {
            var tables = document.querySelectorAll('table.data-table, table.report-table, table.cf-table');
            tables.forEach(function (t) {
                if (!t.id) return;
                var hasRow = t.querySelector('thead tr.column-filter-row');
                if (!hasRow) buildFilterRow(t);
                if (COLUMN_FILTERS[t.id]) applyColumnFiltersToTable(t.id);
            });
        }, 900);

        console.log('✨ 12-advanced-features.js loaded');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 900); });
    } else {
        setTimeout(init, 900);
    }
})();
