/* =====================================================================
   پارسیس v27 — 06b-sms-patterns.js  (v3 — کلیپ‌بورد مقاوم + فرم معادل‌سازی)
   ===================================================================== */
'use strict';

/* ==================== Constants ==================== */
var SMS_PATTERNS_KEY  = 'smsPatterns';
var SMS_PENDING_KEY   = 'smsPending';
var SMS_PENDING_MAX   = 200;
var SMS_PATTERN_THRESHOLD = 0.75;
var _lastAutoAttempt  = 0;
var _autoReadBusy     = false;
var _clipboardStatus  = 'idle';

/* ==================== CSS Injection ==================== */
(function () {
    var css = ''
    + '.pending-sms-card{border:1px solid var(--border);border-radius:14px;padding:14px;'
    + 'margin-bottom:12px;background:var(--card);border-right:5px solid #c47c00}'
    + '.pending-sms-head{display:flex;justify-content:space-between;align-items:center;'
    + 'margin-bottom:10px;flex-wrap:wrap;gap:8px}'
    + '.pending-sms-head .title{font-weight:800;font-size:0.88rem;color:var(--primary-dark)}'
    + '.pending-sms-head .meta{font-size:0.72rem;color:var(--text-muted)}'
    + '.pending-sms-text{background:var(--card-alt);padding:10px 12px;border-radius:10px;'
    + 'font-size:0.8rem;white-space:pre-wrap;word-break:break-word;max-height:130px;'
    + 'overflow-y:auto;border:1px solid var(--border);margin-bottom:12px;direction:rtl;line-height:1.8}'
    + '.pending-sms-form{display:grid;gap:9px;margin-bottom:12px}'
    + '.psf-row{display:grid;grid-template-columns:130px 1fr;gap:10px;align-items:center}'
    + '.psf-row>label{font-size:0.82rem;font-weight:700;color:var(--text-muted)}'
    + '.psf-row input,.psf-row select{width:100%;padding:9px 12px;border:1.5px solid var(--border);'
    + 'border-radius:10px;font-family:inherit;font-size:0.88rem;background:var(--card-solid);'
    + 'color:var(--text);outline:none;transition:all .25s}'
    + '.psf-row input:focus,.psf-row select:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-soft)}'
    + '.psf-radio{display:flex;gap:8px;flex-wrap:wrap}'
    + '.psf-radio label{flex:1;display:flex;align-items:center;gap:6px;padding:9px 12px;'
    + 'background:var(--card-alt);border-radius:10px;cursor:pointer;font-size:0.85rem;'
    + 'font-weight:700;border:1.5px solid var(--border);transition:all .25s}'
    + '.psf-radio label:hover{border-color:var(--primary)}'
    + '.psf-radio label.checked-out{background:#fee2e2;border-color:#dc2626;color:#991b1b}'
    + '.psf-radio label.checked-in{background:#d1fae5;border-color:#059669;color:#065f46}'
    + '.psf-radio input[type=radio]{accent-color:var(--primary)}'
    + '.pending-sms-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}'
    + '.pending-sms-actions button{padding:10px 16px;border:none;border-radius:11px;'
    + 'font-family:inherit;font-size:0.82rem;font-weight:800;cursor:pointer;transition:all .25s}'
    + '.pending-sms-actions button.primary{background:var(--gradient-accent);color:#fff;'
    + 'box-shadow:0 4px 14px rgba(99,102,241,.25)}'
    + '.pending-sms-actions button.secondary{background:var(--primary-light);color:var(--primary-dark)}'
    + '.pending-sms-actions button.danger{background:#fee2e2;color:#dc2626}'
    + '.pending-sms-actions button:hover{transform:translateY(-1px)}'
    + '.clip-status-pill{display:flex;align-items:center;justify-content:space-between;'
    + 'gap:10px;margin-top:10px;padding:10px 14px;border-radius:12px;background:var(--card-alt);'
    + 'border:1px solid var(--border);font-size:0.78rem;font-weight:700;flex-wrap:wrap}'
    + '.clip-status-pill .csp-left{display:flex;align-items:center;gap:8px}'
    + '.clip-status-pill .dot{width:10px;height:10px;border-radius:50%;background:#9ca3af;flex-shrink:0}'
    + '.clip-status-pill.ready .dot{background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.2)}'
    + '.clip-status-pill.ready{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}'
    + '.clip-status-pill.blocked .dot{background:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.2)}'
    + '.clip-status-pill.blocked{background:#fffbeb;border-color:#fde68a;color:#92400e}'
    + '.clip-status-pill.unsupported .dot,.clip-status-pill.error .dot{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.2)}'
    + '.clip-status-pill.unsupported,.clip-status-pill.error{background:#fef2f2;border-color:#fecaca;color:#991b1b}'
    + '.clip-status-pill.empty .dot{background:#64748b}'
    + '.clip-status-pill button{padding:6px 12px;border:none;border-radius:9px;'
    + 'font-family:inherit;font-size:0.75rem;font-weight:800;cursor:pointer;'
    + 'background:var(--primary-light);color:var(--primary-dark);transition:all .2s}'
    + '.clip-status-pill button:hover{background:var(--primary);color:#fff}'
    + '.clip-status-pill button:disabled{opacity:.5;cursor:not-allowed}'
    + '@media (max-width:500px){.psf-row{grid-template-columns:1fr;gap:4px}'
    + '.psf-row>label{font-size:0.75rem}}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
})();

/* ==================== Storage ==================== */
function loadSmsPatterns() {
    var list = DB.load(SMS_PATTERNS_KEY, []);
    return Array.isArray(list) ? list : [];
}
function saveSmsPatterns(list) { DB.save(SMS_PATTERNS_KEY, list); }

function getPendingSms() {
    var list = DB.load(SMS_PENDING_KEY, []);
    return Array.isArray(list) ? list : [];
}
function savePendingSms(list) { DB.save(SMS_PENDING_KEY, list.slice(-SMS_PENDING_MAX)); }
function getPendingSmsCount() { return getPendingSms().length; }

/* ==================== Tokenization ==================== */
function smsNormalizeForPattern(text) {
    return normalizeDigits(String(text || ''))
        .replace(/[\u200c\u200e\u200f]/g, ' ')
        .replace(/[،,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function buildSmsPattern(raw) {
    var normalized = smsNormalizeForPattern(raw);
    var parts = normalized.split(' ').filter(Boolean);
    var tokens = [], mapping = {}, n = 0;
    for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (/\d/.test(p)) {
            n++;
            var slot = '#' + n;
            tokens.push(slot);
            mapping[slot] = p;
        } else {
            tokens.push(p);
        }
    }
    return { raw: normalized, tokens: tokens, mapping: mapping, key: tokens.join(' ') };
}

/* ==================== Matching ==================== */
function isWild(t) { return typeof t === 'string' && t.charAt(0) === '#'; }
function smsTokenSimilarity(a, b) {
    var n = Math.max(a.length, b.length);
    if (n === 0) return 0;
    var score = 0;
    for (var i = 0; i < n; i++) {
        var ta = a[i], tb = b[i];
        if (ta === undefined || tb === undefined) { score -= 0.2; continue; }
        if (isWild(ta) && isWild(tb))           score += 1.0;
        else if (ta === tb)                     score += 1.0;
        else if (isWild(ta) || isWild(tb))      score += 0.4;
        else                                    score -= 0.3;
    }
    return Math.max(0, score / n);
}
function findMatchingSmsPattern(raw) {
    var patterns = loadSmsPatterns();
    if (patterns.length === 0) return null;
    var built = buildSmsPattern(raw);
    var best = null, bestScore = 0;
    for (var i = 0; i < patterns.length; i++) {
        var p = patterns[i];
        var s = smsTokenSimilarity(built.tokens, p.tokens || []);
        if (s > bestScore) { bestScore = s; best = p; }
    }
    return bestScore >= SMS_PATTERN_THRESHOLD
        ? { pattern: best, score: bestScore, built: built }
        : null;
}

/* ==================== Bank SMS Filter ==================== */
function isBankSms(text) {
    if (!text) return false;
    var t = String(text).trim();
    if (t.length < 20) return false;

    if (/کد\s*(ورود|تایید|تأیید|فعالسازی|فعال\s*سازی|احراز)/.test(t)) return false;
    if (/رمز\s*(یکبار|پویا|ورود|دوم)/.test(t)) return false;
    if (/\bOTP\b/i.test(t) || /one[\s-]?time/i.test(t)) return false;
    if (/کد\s*تخفیف|کد\s*معرف|کد\s*هدیه/.test(t)) return false;
    if (/کد\s*\d{4,6}\s*$/.test(t) && !/ریال|تومان|مبلغ|برداشت|واریز/.test(t)) return false;

    if (typeof findMatchingBankAccount === 'function') {
        try { if (findMatchingBankAccount(t)) return true; } catch (e) {}
    }

    var hasBankWord = /بانک|حساب|کارت|شبا|سپرده/.test(t);
    var hasMoney    = /ریال|تومان|مبلغ/.test(t);
    var hasDir      = /برداشت|واریز|پرداخت|دریافت|خرید|انتقال|بستانکار|بدهکار|مانده/.test(t);

    if (hasBankWord && hasMoney) return true;
    if (hasMoney && hasDir) return true;
    return false;
}

/* ==================== Value Suggestions ==================== */
function suggestAmount(text) {
    var t = normalizeDigits(String(text || ''));
    var m1 = t.match(/مبلغ\s*[:ـ]?\s*([\d,]+)/);
    if (m1) { var v1 = Number(m1[1].replace(/,/g, '')); if (v1 > 0) return v1; }
    var m2 = t.match(/([\d]{1,3}(?:,[\d]{3})+)/);
    if (m2) { var v2 = Number(m2[1].replace(/,/g, '')); if (v2 > 0) return v2; }
    return 0;
}
function suggestDirection(text) {
    var t = normalizeDigits(String(text || ''));
    if (/برداشت|پرداخت|خرید|کسر|بدهکار|انتقال\s*از/.test(t)) return 'out';
    if (/واریز|دریافت|افزایش|بستانکار|انتقال\s*به/.test(t))  return 'in';
    if (/-\s*[\d]/.test(t)) return 'out';
    if (/\+\s*[\d]/.test(t)) return 'in';
    return '';
}
function suggestDate(text) {
    var t = normalizeDigits(String(text || ''));
    var m = t.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m) return m[1] + '/' + pad2(m[2]) + '/' + pad2(m[3]);
    var m2 = t.match(/(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m2) {
        var y = Number(m2[1]);
        var cy = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())[0];
        if (y < 100) y += Math.floor(cy / 100) * 100;
        return y + '/' + pad2(m2[2]) + '/' + pad2(m2[3]);
    }
    return todayJalaliStr();
}
function suggestDescription(text) {
    var lines = String(text || '').split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim().replace(/^\*+|\*+$/g, '').trim();
        if (!line) continue;
        if (/\d/.test(line)) continue;
        if (/بانک|حساب|کارت|شبا|ریال|تومان|مبلغ|موجودی/.test(line)) continue;
        if (line.length > 40) continue;
        return line;
    }
    return '';
}
function suggestLabel(text, parsedBankName, dir) {
    var bank = parsedBankName || '';
    if (!bank) {
        var m = String(text || '').match(/بانک\s+([^\s*،,]+)/);
        if (m) bank = 'بانک ' + m[1];
    }
    var dirLabel = dir === 'out' ? 'برداشت' : (dir === 'in' ? 'واریز' : 'تراکنش');
    return (bank ? bank + ' — ' : '') + dirLabel;
}

/* ==================== Pattern CRUD ==================== */
function addSmsPattern(opts) {
    var patterns = loadSmsPatterns();
    var built = buildSmsPattern(opts.raw || '');
    var key = opts.key || built.key;
    var existing = patterns.find(function (p) { return p.key === key; });
    if (existing) {
        existing.uses = (existing.uses || 0) + 1;
        existing.lastUsed = Date.now();
        if (opts.label) existing.label = opts.label;
        if (opts.direction) existing.direction = opts.direction;
        if (opts.linkedAccountId) existing.linkedAccountId = opts.linkedAccountId;
        if (opts.slots) existing.slots = opts.slots;
        saveSmsPatterns(patterns);
        return existing;
    }
    var rec = {
        id: 'sp_' + uid(),
        key: key,
        raw: built.raw,
        tokens: built.tokens,
        mapping: opts.mapping || built.mapping,
        slots: opts.slots || {},
        label: opts.label || 'الگوی پیامک',
        direction: opts.direction || '',
        linkedAccountId: opts.linkedAccountId || '',
        uses: 1,
        createdAt: Date.now(),
        lastUsed: Date.now()
    };
    patterns.push(rec);
    saveSmsPatterns(patterns);
    return rec;
}
function bumpSmsPatternUsage(id) {
    var patterns = loadSmsPatterns();
    var p = patterns.find(function (x) { return x.id === id; });
    if (!p) return;
    p.uses = (p.uses || 0) + 1;
    p.lastUsed = Date.now();
    saveSmsPatterns(patterns);
}
function deleteSmsPattern(id) {
    saveSmsPatterns(loadSmsPatterns().filter(function (p) { return p.id !== id; }));
}

/* ==================== Pending CRUD ==================== */
function addPendingSms(raw, source) {
    var text = String(raw || '').trim();
    if (!text) return null;
    var list = getPendingSms();
    if (list.some(function (p) { return p.raw === text; })) return null;

    var amount    = suggestAmount(text);
    var direction = suggestDirection(text);
    var date      = suggestDate(text);
    var desc      = suggestDescription(text);
    var matched   = (typeof findMatchingBankAccount === 'function')
                    ? findMatchingBankAccount(text) : null;

    var rec = {
        id: 'pd_' + uid(),
        raw: text,
        source: source || 'clipboard',
        createdAt: Date.now(),
        suggestion: {
            amount: amount,
            direction: direction,
            date: date,
            description: desc,
            bankName: (function () {
                var m = text.match(/بانک\s+([^\s*،,\n]+)/);
                return m ? 'بانک ' + m[1] : '';
            })(),
            linkedAccountId: matched ? matched.id : ''
        }
    };
    list.push(rec);
    savePendingSms(list);
    return rec;
}
function removePendingSms(id) {
    savePendingSms(getPendingSms().filter(function (p) { return p.id !== id; }));
}
function clearPendingSms() { savePendingSms([]); }

/* ==================== Nav Badge ==================== */
window.updateSmsBadge = function () {
    var inboxCount   = (typeof getUnreadSmsCount === 'function') ? getUnreadSmsCount() : 0;
    var pendingCount = getPendingSmsCount();
    var total = inboxCount + pendingCount;
    var b = document.getElementById('sms-nav-badge');
    if (!b) return;
    if (total > 0) { b.textContent = toFa(total); b.classList.remove('hidden'); }
    else b.classList.add('hidden');
};

/* ==================== Clipboard Status UI ==================== */
function updateClipboardStatus(status) {
    _clipboardStatus = status;
    var pill = document.getElementById('clip-status-pill');
    if (!pill) return;
    pill.className = 'clip-status-pill ' + status;

    var dot = '<span class="dot"></span>';
    var texts = {
        idle:        '⏳ در انتظار اولین تلاش',
        ready:       '✅ آماده — پیامک بانکی به‌صورت خودکار خوانده می‌شود',
        blocked:     '⚠️ مرورگر دسترسی کلیپ‌بورد را رد کرده — روی «تلاش مجدد» بزن',
        unsupported: '❌ این مرورگر از کلیپ‌بورد پشتیبانی نمی‌کند',
        error:       '⚠️ خطا در خواندن کلیپ‌بورد',
        empty:       '📭 کلیپ‌بورد خالی است'
    };
    var msg = texts[status] || status;

    pill.innerHTML = '<div class="csp-left">' + dot + '<span>' + msg + '</span></div>' +
        '<button type="button" id="clip-retry-btn">🔄 تلاش مجدد</button>';

    var retryBtn = pill.querySelector('#clip-retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', function () {
            retryBtn.disabled = true;
            retryBtn.textContent = '⏳';
            doClipboardRead(false, 0).then(function () {
                retryBtn.disabled = false;
                retryBtn.textContent = '🔄 تلاش مجدد';
            });
        });
    }
}

function ensureClipboardStatusUI() {
    if (document.getElementById('clip-status-pill')) return;
    var cb = document.getElementById('sms-auto-read');
    if (!cb) return;
    var pill = document.createElement('div');
    pill.id = 'clip-status-pill';
    pill.className = 'clip-status-pill idle';
    var anchor = cb.closest('label') || cb.parentNode;
    anchor.parentNode.insertBefore(pill, anchor.nextSibling);

    cb.addEventListener('change', function () {
        if (this.checked) {
            doClipboardRead(true, 0);
        } else {
            updateClipboardStatus('idle');
        }
    });
    updateClipboardStatus('idle');
}

/* ==================== Robust Clipboard Read ==================== */
function doClipboardRead(isAuto, retry) {
    retry = retry || 0;
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        updateClipboardStatus('unsupported');
        return Promise.resolve(false);
    }
    return navigator.clipboard.readText().then(function (text) {
        var t = String(text || '').trim();
        if (!t) {
            updateClipboardStatus('empty');
            return false;
        }
        if (isAuto && t === window._lastClipboardText) {
            updateClipboardStatus('ready');
            return true;
        }
        var res = handleIncomingSms(t, isAuto ? 'auto' : 'clipboard');
        if (res.ok) {
            window._lastClipboardText = t;
            updateClipboardStatus('ready');
            return true;
        }
        if (res.reason === 'duplicate') {
            updateClipboardStatus('ready');
            if (!isAuto) showToast('قبلاً ثبت شده.');
            return false;
        }
        if (res.reason === 'not-bank') {
            updateClipboardStatus('ready');
            if (!isAuto) alert('❌ این متن یک پیامک بانکی نیست.');
            return false;
        }
        updateClipboardStatus('ready');
        if (!isAuto) alert('پیامک قابل پردازش نبود.');
        return false;
    }).catch(function (err) {
        var name = err && err.name;
        console.warn('[clipboard] read failed:', name, err);
        if (name === 'NotAllowedError' || name === 'SecurityError') {
            updateClipboardStatus('blocked');
            if (isAuto && retry < 2) {
                var delay = retry === 0 ? 1200 : 2000;
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(doClipboardRead(true, retry + 1));
                    }, delay);
                });
            }
        } else if (name === 'NotFoundError') {
            updateClipboardStatus('unsupported');
        } else {
            updateClipboardStatus('error');
            if (!isAuto) alert('خواندن کلیپ‌بورد ناموفق بود.');
        }
        return false;
    });
}

window.readClipboardAndAdd = function (auto) {
    if (!auto) {
        doClipboardRead(false, 0);
        return;
    }
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        updateClipboardStatus('unsupported');
        return;
    }
    if (_autoReadBusy) return;
    var now = Date.now();
    if (now - _lastAutoAttempt < 500) return;
    _lastAutoAttempt = now;
    _autoReadBusy = true;

    // تلاش ۱: بلافاصله (گسچر کاربر تازه)
    doClipboardRead(true, 0).then(function () {
        // تلاش ۲: با تأخیر ۹۰۰ms برای وقتی که کاربر تازه کپی کرده
        setTimeout(function () {
            doClipboardRead(true, 0).then(function () {
                _autoReadBusy = false;
            });
        }, 900);
    });
};

/* ==================== Render Pending Box ==================== */
function renderPendingSmsBox() {
    var box = document.getElementById('pending-sms-list');
    if (!box) return;
    var list = getPendingSms();
    var countEl = document.getElementById('pending-sms-count');
    if (countEl) countEl.textContent = toFa(list.length);

    if (list.length === 0) {
        box.innerHTML =
            '<div class="widget-empty">📭 پیامک ثبت‌نشده‌ای وجود ندارد.' +
            '<br><span style="font-size:0.72rem;opacity:.8">' +
            'برای فعال‌سازی تشخیص خودکار، گزینه «خواندن خودکار کلیپ‌بورد» را روشن کن.' +
            '</span></div>';
        window.updateSmsBadge();
        return;
    }

    var accounts = DB.load('bankAccounts', []);
    var sorted = list.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    var html = '';

    for (var i = 0; i < sorted.length; i++) {
        var p = sorted[i];
        var s = p.suggestion || {};
        var pid = p.id;

        var accountOpts = '<option value="">— انتخاب حساب —</option>';
        for (var a = 0; a < accounts.length; a++) {
            var acc = accounts[a];
            var sel = (s.linkedAccountId === acc.id) ? ' selected' : '';
            accountOpts += '<option value="' + acc.id + '"' + sel + '>' +
                esc((acc.bank || '') + ' — ' + (acc.account || '')) + '</option>';
        }

        var dirOut = (s.direction === 'out') ? ' checked' : '';
        var dirIn  = (s.direction === 'in')  ? ' checked' : '';
        var clsOut = (s.direction === 'out') ? ' checked-out' : '';
        var clsIn  = (s.direction === 'in')  ? ' checked-in'  : '';

        var meta = '📅 ' + toFa(tsToJalaliDate(p.createdAt)) + ' — ' + toFa(tsToJalaliTime(p.createdAt));

        html += '<div class="pending-sms-card" data-pid="' + pid + '">'
            +   '<div class="pending-sms-head">'
            +     '<div><div class="title">🔔 ثبت نشده</div>'
            +     '<div class="meta">' + esc(meta) + '</div></div>'
            +   '</div>'
            +   '<div class="pending-sms-text">' + esc(p.raw) + '</div>'
            +   '<div class="pending-sms-form">'
            +     '<div class="psf-row"><label>🏦 حساب بانکی</label>'
            +       '<select data-field="account">' + accountOpts + '</select></div>'
            +     '<div class="psf-row"><label>💰 مبلغ (ریال)</label>'
            +       '<input type="text" inputmode="numeric" dir="ltr" data-field="amount" value="'
            +         (s.amount ? formatRaw(s.amount) : '') + '"></div>'
            +     '<div class="psf-row"><label>🔀 نوع تراکنش</label>'
            +       '<div class="psf-radio">'
            +         '<label class="' + clsOut + '"><input type="radio" name="dir_' + pid + '" value="out"' + dirOut + '> برداشت</label>'
            +         '<label class="' + clsIn  + '"><input type="radio" name="dir_' + pid + '" value="in"'  + dirIn  + '> واریز</label>'
            +       '</div></div>'
            +     '<div class="psf-row"><label>📅 تاریخ</label>'
            +       '<input type="text" dir="ltr" class="date-picker" data-field="date" value="'
            +         esc(s.date || todayJalaliStr()) + '"></div>'
            +     '<div class="psf-row"><label>📝 شرح</label>'
            +       '<input type="text" data-field="desc" value="' + esc(s.description || '') + '"></div>'
            +     '<div class="psf-row"><label>🏷 نام الگو</label>'
            +       '<input type="text" data-field="label" value="'
            +         esc(suggestLabel(p.raw, s.bankName, s.direction)) + '"></div>'
            +   '</div>'
            +   '<div class="pending-sms-actions">'
            +     '<button class="primary"   data-action="save-with-voucher" data-id="' + pid + '">✅ ثبت الگو + ساخت سند</button>'
            +     '<button class="secondary" data-action="save-pattern-only" data-id="' + pid + '">🧠 فقط ثبت الگو</button>'
            +     '<button class="danger"    data-action="drop" data-id="' + pid + '">🗑 حذف</button>'
            +   '</div>'
            + '</div>';
    }

    box.innerHTML = html;
    attachDatePickers();
    bindPendingEvents(box);
    window.updateSmsBadge();
}

function bindPendingEvents(box) {
    var cards = box.querySelectorAll('.pending-sms-card');
    for (var i = 0; i < cards.length; i++) {
        (function (card) {
            var pid = card.getAttribute('data-pid');

            var amtInput = card.querySelector('[data-field="amount"]');
            if (amtInput) {
                amtInput.addEventListener('input', function () {
                    this.value = normalizeDigits(this.value).replace(/[^\d]/g, '');
                });
                amtInput.addEventListener('blur', function () {
                    var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                    this.value = v ? formatRaw(v) : '';
                });
            }

            var radios = card.querySelectorAll('input[type=radio]');
            for (var r = 0; r < radios.length; r++) {
                radios[r].addEventListener('change', function () {
                    var labels = card.querySelectorAll('.psf-radio label');
                    for (var L = 0; L < labels.length; L++) {
                        labels[L].classList.remove('checked-out', 'checked-in');
                        var inp = labels[L].querySelector('input');
                        if (inp && inp.checked) {
                            labels[L].classList.add(inp.value === 'out' ? 'checked-out' : 'checked-in');
                        }
                    }
                });
            }

            var btns = card.querySelectorAll('[data-action]');
            for (var b = 0; b < btns.length; b++) {
                btns[b].addEventListener('click', function () {
                    var action = this.getAttribute('data-action');
                    if (action === 'drop') {
                        if (!confirm('این پیامک حذف شود؟')) return;
                        removePendingSms(pid);
                        renderPendingSmsBox();
                        return;
                    }
                    if (action === 'save-pattern-only') { savePendingAsPattern(pid, false); return; }
                    if (action === 'save-with-voucher') { savePendingAsPattern(pid, true);  return; }
                });
            }
        })(cards[i]);
    }
}

/* ==================== Save Handler ==================== */
function savePendingAsPattern(pid, withVoucher) {
    var card = document.querySelector('.pending-sms-card[data-pid="' + pid + '"]');
    if (!card) return;
    var pending = getPendingSms().find(function (p) { return p.id === pid; });
    if (!pending) return;

    var accountId  = card.querySelector('[data-field="account"]').value;
    var amountStr  = card.querySelector('[data-field="amount"]').value;
    var dirEl      = card.querySelector('input[name="dir_' + pid + '"]:checked');
    var dateStr    = card.querySelector('[data-field="date"]').value;
    var descStr    = card.querySelector('[data-field="desc"]').value;
    var labelStr   = card.querySelector('[data-field="label"]').value;

    var amount = Number(normalizeDigits(amountStr).replace(/[^\d]/g, '')) || 0;
    var direction = dirEl ? dirEl.value : '';

    if (!amount)     { alert('⚠️ مبلغ را وارد کنید.'); return; }
    if (!direction)  { alert('⚠️ نوع تراکنش (برداشت/واریز) را انتخاب کنید.'); return; }
    if (!labelStr.trim()) { alert('⚠️ نام الگو اجباری است.'); return; }
    if (withVoucher && !accountId) { alert('⚠️ برای ساخت سند، حساب بانکی را انتخاب کنید.'); return; }

    var built = buildSmsPattern(pending.raw);
    var amountSlot = null;
    for (var slot in built.mapping) {
        var rawVal = built.mapping[slot];
        var numVal = Number(String(rawVal).replace(/[^\d]/g, ''));
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
        if (res.ok) {
            var inbox = getSmsInbox();
            for (var i = 0; i < inbox.length; i++) {
                if (inbox[i].id === res.item.id) inbox[i].status = 'converted';
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
    window.updateSmsBadge();
    showToast(withVoucher ? '✅ الگو ثبت شد + سند ساخته شد' : '🧠 الگو ثبت شد');
}

function createVoucherFromPending(data) {
    if (typeof getBankMoeinId !== 'function') { alert('تابع معین بانک یافت نشد.'); return; }
    var bankMoein = getBankMoeinId();
    if (!bankMoein) { alert('⚠️ معین بانک در چارت حساب‌ها تعریف نشده.'); return; }

    var bankDetail = data.bankAccountId ? { bank: data.bankAccountId } : {};
    var lines = [];

    if (data.direction === 'out') {
        lines.push({ id: uid(), account: '', details: {}, debit: data.amount, credit: 0, description: data.description || '' });
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: data.amount, description: data.description || '', locked: true });
    } else {
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: data.amount, credit: 0, description: data.description || '', locked: true });
        lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: data.amount, description: data.description || '' });
    }

    var vl = DB.load('vouchers', []);
    var v = {
        id: uid(),
        number: (typeof getNextVoucherNumberForPeriod === 'function')
                ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
                : String(vl.length + 1),
        date: data.date || todayJalaliStr(),
        type: 'general',
        periodId: state.activePeriodId || '',
        desc: data.description || '',
        lines: lines,
        status: 'draft'
    };
    vl.push(v);
    DB.save('vouchers', vl);

    if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v);
    else if (typeof goToPage === 'function') goToPage('voucher-list');
    showToast('📝 پیش‌نویس سند آماده شد');
}

/* ==================== Extract from Pattern ==================== */
function extractValuesFromPattern(newRaw, pattern) {
    var built = buildSmsPattern(newRaw);
    var result = { amount: 0, direction: '', date: '', bankAccountId: pattern.linkedAccountId || '' };
    if (pattern.slots && pattern.slots.amount) {
        var slotKey = '#' + pattern.slots.amount;
        var rawVal = built.mapping[slotKey];
        if (rawVal) result.amount = Number(String(rawVal).replace(/[^\d]/g, '')) || 0;
    }
    if (!result.amount) result.amount = suggestAmount(newRaw);
    result.direction = pattern.direction || suggestDirection(newRaw);
    result.date = suggestDate(newRaw);
    return result;
}

/* ==================== Incoming Flow ==================== */
function handleIncomingSms(text, source) {
    var t = String(text || '').trim();
    if (!t) return { ok: false, reason: 'empty' };
    if (!isBankSms(t)) return { ok: false, reason: 'not-bank' };

    var m = findMatchingSmsPattern(t);
    if (m) {
        var res = addSmsToInbox(t, source || 'clipboard');
        if (res.ok) {
            bumpSmsPatternUsage(m.pattern.id);
            if (typeof renderSmsInbox === 'function') renderSmsInbox();
            window.updateSmsBadge();
            var vals = extractValuesFromPattern(t, m.pattern);
            var amountTxt = vals.amount ? formatMoney(vals.amount) + ' ' + currencyLabel() : '';
            showToast('📱 شناسایی شد ' + (amountTxt ? ' — ' + amountTxt : '') + ' (' + m.pattern.label + ')');
            return { ok: true, matched: true, pattern: m.pattern, values: vals };
        }
        if (res.reason === 'duplicate') return { ok: false, reason: 'duplicate' };
    }

    var added = addPendingSms(t, source || 'clipboard');
    if (added) {
        renderPendingSmsBox();
        window.updateSmsBadge();
        showToast('🔔 پیامک جدید — برای ثبت الگو بازبینی کن');
        return { ok: true, matched: false, pending: added };
    }
    return { ok: false, reason: 'duplicate' };
}

/* ==================== Pattern Manager ==================== */
function showSmsPatternsManager() {
    var patterns = loadSmsPatterns();
    if (patterns.length === 0) { alert('هنوز الگویی ثبت نشده است.'); return; }
    var lines = patterns.map(function (p, i) {
        return (i + 1) + '. ' + p.label + '  [' + toFa(p.uses || 0) + ' بار]';
    });
    var ans = prompt('الگوهای یادگرفته:\n\n' + lines.join('\n') + '\n\nشماره الگو برای حذف (خالی = لغو):');
    if (!ans) return;
    var idx = Number(normalizeDigits(ans)) - 1;
    if (isNaN(idx) || idx < 0 || idx >= patterns.length) { alert('شماره نامعتبر'); return; }
    if (!confirm('الگوی «' + patterns[idx].label + '» حذف شود؟')) return;
    deleteSmsPattern(patterns[idx].id);
    showToast('🗑 الگو حذف شد');
}

/* ==================== Init ==================== */
function initSmsPatternSystem() {
    renderPendingSmsBox();
    ensureClipboardStatusUI();

    var clearBtn = document.getElementById('pending-sms-clear');
    if (clearBtn && !clearBtn.dataset.bound) {
        clearBtn.dataset.bound = '1';
        clearBtn.addEventListener('click', function () {
            if (getPendingSmsCount() === 0) { showToast('باکس خالی است.'); return; }
            if (!confirm('همه پیامک‌های ثبت‌نشده حذف شوند؟')) return;
            clearPendingSms();
            renderPendingSmsBox();
            showToast('🗑 باکس خالی شد');
        });
    }
    var mgrBtn = document.getElementById('sms-patterns-manage');
    if (mgrBtn && !mgrBtn.dataset.bound) {
        mgrBtn.dataset.bound = '1';
        mgrBtn.addEventListener('click', showSmsPatternsManager);
    }

    // شنونده‌های خودمان با اولویت capture (سریع‌تر از file 09)
    window.addEventListener('focus', function () {
        if (state.smsAutoRead) window.readClipboardAndAdd(true);
    }, true);

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && state.smsAutoRead) {
            window.readClipboardAndAdd(true);
        }
    }, true);

    console.log('🧠 SMS Pattern System v3 — patterns:', loadSmsPatterns().length, '| pending:', getPendingSmsCount());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(initSmsPatternSystem, 300); });
} else {
    setTimeout(initSmsPatternSystem, 300);
}
