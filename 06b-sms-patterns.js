/* =====================================================================
   پارسیس v27 — 06b-sms-patterns.js
   یادگیری الگوی پیامک بانکی + باکس پیامک‌های ثبت‌نشده
   باید بعد از 06 و قبل از 07 بارگذاری شود.
   ===================================================================== */
'use strict';

/* ==================== Storage Keys ==================== */
var SMS_PATTERNS_KEY  = 'smsPatterns';
var SMS_PENDING_KEY   = 'smsPending';
var SMS_PENDING_MAX   = 200;
var SMS_PATTERN_THRESHOLD = 0.75;

/* ==================== Pattern Storage ==================== */
function loadSmsPatterns() {
    var list = DB.load(SMS_PATTERNS_KEY, []);
    return Array.isArray(list) ? list : [];
}
function saveSmsPatterns(list) { DB.save(SMS_PATTERNS_KEY, list); }

/* ==================== Tokenization ==================== */
function smsNormalizeForPattern(text) {
    return normalizeDigits(String(text || ''))
        .replace(/[\u200c\u200e\u200f]/g, ' ')
        .replace(/[،,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * ساخت الگو از متن خام:
 *   "برداشت 1,200,000 ریال از حساب 1234"
 *   tokens : ["برداشت","#1","ریال","از","حساب","#2"]
 *   mapping: { "#1": "1,200,000", "#2": "1234" }
 */
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
        ? { pattern: best, score: bestScore }
        : null;
}

/* ==================== Pattern CRUD ==================== */
function addSmsPattern(opts) {
    var patterns = loadSmsPatterns();
    var built = buildSmsPattern(opts.raw || '');
    var key = opts.key || built.key;
    var existing = patterns.find(function(p) { return p.key === key; });
    if (existing) {
        existing.uses = (existing.uses || 0) + 1;
        existing.lastUsed = Date.now();
        if (opts.label) existing.label = opts.label;
        if (opts.mapping) existing.mapping = opts.mapping;
        saveSmsPatterns(patterns);
        return existing;
    }
    var rec = {
        id: 'sp_' + uid(),
        key: key,
        raw: built.raw,
        tokens: built.tokens,
        mapping: opts.mapping || built.mapping,
        label: opts.label || 'الگوی پیامک',
        bankName: opts.bankName || '',
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
    var p = patterns.find(function(x) { return x.id === id; });
    if (!p) return;
    p.uses = (p.uses || 0) + 1;
    p.lastUsed = Date.now();
    saveSmsPatterns(patterns);
}

function deleteSmsPattern(id) {
    saveSmsPatterns(loadSmsPatterns().filter(function(p) { return p.id !== id; }));
}

/* ==================== Pending Storage ==================== */
function getPendingSms() {
    var list = DB.load(SMS_PENDING_KEY, []);
    return Array.isArray(list) ? list : [];
}
function savePendingSms(list) { DB.save(SMS_PENDING_KEY, list.slice(-SMS_PENDING_MAX)); }

function addPendingSms(raw, source) {
    var text = String(raw || '').trim();
    if (!text) return null;
    var list = getPendingSms();
    if (list.some(function(p) { return p.raw === text; })) return null;
    var parsed = (typeof parseBankSms === 'function') ? parseBankSms(text) : {};
    var rec = {
        id: 'pd_' + uid(),
        raw: text,
        source: source || 'clipboard',
        createdAt: Date.now(),
        parsed: {
            amount: parsed.amount || 0,
            direction: parsed.direction || '',
            balance: parsed.balance || 0,
            bankName: parsed.bankName || '',
            matchedAccountId: parsed.matchedAccount ? parsed.matchedAccount.id : '',
            matchedAccountTitle: parsed.matchedAccount
                ? ((parsed.matchedAccount.bank || '') + ' - ' + (parsed.matchedAccount.account || ''))
                : ''
        }
    };
    list.push(rec);
    savePendingSms(list);
    return rec;
}
function removePendingSms(id) { savePendingSms(getPendingSms().filter(function(p) { return p.id !== id; })); }
function clearPendingSms()    { savePendingSms([]); }
function getPendingSmsCount() { return getPendingSms().length; }

/* ==================== Nav Badge Override ==================== */
window.updateSmsBadge = function() {
    var inboxCount   = (typeof getUnreadSmsCount === 'function') ? getUnreadSmsCount() : 0;
    var pendingCount = getPendingSmsCount();
    var total = inboxCount + pendingCount;
    var b = document.getElementById('sms-nav-badge');
    if (!b) return;
    if (total > 0) { b.textContent = toFa(total); b.classList.remove('hidden'); }
    else b.classList.add('hidden');
};

function updatePendingSmsBadge() { window.updateSmsBadge(); }

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
            '<br><span style="font-size:0.72rem;opacity:0.8">برای فعال‌سازی تشخیص خودکار، گزینه «خواندن خودکار کلیپ‌بورد» را روشن کن.</span></div>';
        updatePendingSmsBadge();
        return;
    }

    var sorted = list.slice().sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    var html = '';
    for (var i = 0; i < sorted.length; i++) {
        var p = sorted[i];
        var pa = p.parsed || {};
        var dirLabel = pa.direction === 'out' ? '🔴 برداشت' : (pa.direction === 'in' ? '🟢 واریز' : '❓');
        var pills = '';
        if (pa.bankName) pills += '<span class="pill">🏦 ' + esc(pa.bankName) + '</span>';
        if (pa.amount) pills += '<span class="pill ' + (pa.direction === 'out' ? 'out' : (pa.direction === 'in' ? 'in' : '')) + '">' +
            dirLabel + ': ' + formatMoney(pa.amount) + ' ' + currencyLabel() + '</span>';
        else pills += '<span class="pill">' + dirLabel + '</span>';
        if (pa.matchedAccountTitle) pills += '<span class="pill" style="background:#d1fae5;color:#065f46">🎯 ' + esc(pa.matchedAccountTitle) + '</span>';

        var meta = '📅 ' + toFa(tsToJalaliDate(p.createdAt)) + ' — ' + toFa(tsToJalaliTime(p.createdAt));
        html += '<div class="sms-item status-new pending-item" data-pid="' + p.id + '">' +
            '<div class="sms-item-head"><div><div class="title">🔔 ثبت نشده</div>' +
            '<div class="meta">' + esc(meta) + '</div></div></div>' +
            '<div class="sms-item-parsed">' + pills + '</div>' +
            '<div class="sms-item-text">' + esc(p.raw) + '</div>' +
            '<div class="sms-item-actions">' +
                '<button class="btn-convert" data-action="learn"  data-id="' + p.id + '">🧠 ثبت الگو</button>' +
                '<button class="btn-ignore"  data-action="toInbox" data-id="' + p.id + '">📥 افزودن به صندوق</button>' +
                '<button class="btn-delete"  data-action="drop"    data-id="' + p.id + '">🗑</button>' +
            '</div></div>';
    }
    box.innerHTML = html;

    var btns = box.querySelectorAll('[data-action]');
    for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function() {
            var action = this.getAttribute('data-action');
            var id = this.getAttribute('data-id');
            var item = getPendingSms().find(function(x) { return x.id === id; });
            if (!item) return;

            if (action === 'learn') { openLearnPatternDialog(item); return; }

            if (action === 'toInbox') {
                var res = addSmsToInbox(item.raw, 'pending');
                removePendingSms(id);
                renderPendingSmsBox();
                updatePendingSmsBadge();
                if (res.ok) { renderSmsInbox(); updateSmsBadge(); showToast('📥 به صندوق اضافه شد'); }
                else showToast('قبلاً در صندوق بود');
                return;
            }

            if (action === 'drop') {
                if (!confirm('این پیامک از باکس ثبت‌نشده‌ها حذف شود؟')) return;
                removePendingSms(id);
                renderPendingSmsBox();
                updatePendingSmsBadge();
                showToast('🗑 حذف شد');
                return;
            }
        });
    }
    updatePendingSmsBadge();
}

/* ==================== Learn Pattern Dialog ==================== */
function openLearnPatternDialog(pendingItem) {
    var raw = pendingItem.raw;
    var built = buildSmsPattern(raw);
    var parsed = pendingItem.parsed || {};

    var suggestedLabel = parsed.bankName || 'الگوی پیامک';
    if (parsed.direction === 'out') suggestedLabel += ' — برداشت';
    else if (parsed.direction === 'in') suggestedLabel += ' — واریز';

    var label = prompt('نام الگو (برای شناسایی خودکار بعدی):', suggestedLabel);
    if (label === null) return;
    label = String(label || '').trim();
    if (!label) { alert('نام الگو اجباری است.'); return; }

    var direction = parsed.direction || '';
    if (!direction) {
        var d = prompt('نوع تراکنش این الگو:\n1 = برداشت\n2 = واریز\n0 = نامشخص', '0');
        if (d === '1') direction = 'out';
        else if (d === '2') direction = 'in';
    }

    var previewLines = [];
    for (var i = 0; i < built.tokens.length; i++) {
        var t = built.tokens[i];
        previewLines.push(isWild(t) ? (t + ' ← ' + (built.mapping[t] || '')) : t);
    }
    if (!confirm('این الگو ثبت شود؟\n\n' + previewLines.join(' ') + '\n\nدفعه بعد، پیامک‌های مشابه خودکار شناسایی می‌شوند.')) return;

    addSmsPattern({
        raw: raw,
        key: built.key,
        tokens: built.tokens,
        mapping: built.mapping,
        label: label,
        bankName: parsed.bankName || '',
        direction: direction,
        linkedAccountId: parsed.matchedAccountId || ''
    });

    var res = addSmsToInbox(raw, 'learned');
    removePendingSms(pendingItem.id);
    renderPendingSmsBox();
    updatePendingSmsBadge();
    if (res.ok) { renderSmsInbox(); updateSmsBadge(); }
    showToast('🧠 الگو ثبت شد: ' + label);
}

/* ==================== Clipboard Flow Override ==================== */
function handleIncomingSms(text, source) {
    var t = String(text || '').trim();
    if (!t) return { ok: false, reason: 'empty' };

    // ۱) اول سراغ الگوهای یادگرفته
    var m = findMatchingSmsPattern(t);
    if (m) {
        var res = addSmsToInbox(t, source || 'clipboard');
        if (res.ok) {
            bumpSmsPatternUsage(m.pattern.id);
            renderSmsInbox();
            updateSmsBadge();
            showToast('📱 شناسایی شد (الگو: ' + m.pattern.label + ')');
            return { ok: true, matched: true, pattern: m.pattern };
        }
        if (res.reason === 'duplicate') return { ok: false, reason: 'duplicate' };
        // اگر الگو match شد ولی addSmsToInbox رد کرد → می‌رود به pending
    }

    // ۲) ناشناخته → باکس ثبت‌نشده
    var added = addPendingSms(t, source || 'clipboard');
    if (added) {
        renderPendingSmsBox();
        updatePendingSmsBadge();
        showToast('🔔 پیامک جدید — منتظر ثبت الگو');
        return { ok: true, matched: false, pending: added };
    }
    return { ok: false, reason: 'duplicate' };
}

/**
 * override تابع اصلی readClipboardAndAdd از فایل 06
 * نسخه قبلی فقط چک می‌کرد پیامک شامل شماره حساب/نام بانک هست یا نه.
 * نسخه جدید: الگو → صندوق، ناشناخته → باکس ثبت‌نشده.
 */
window.readClipboardAndAdd = function(auto) {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        if (!auto) alert('مرورگر از کلیپ‌بورد پشتیبانی نمی‌کند.');
        return;
    }
    navigator.clipboard.readText().then(function(text) {
        var t = String(text || '').trim();
        if (!t) { if (!auto) alert('کلیپ‌بورد خالی است.'); return; }
        if (auto && t === window._lastClipboardText) return;

        var res = handleIncomingSms(t, auto ? 'auto' : 'clipboard');
        if (res.ok) {
            window._lastClipboardText = t;
        } else if (res.reason === 'duplicate' && !auto) {
            showToast('قبلاً ثبت شده.');
        } else if (!auto) {
            alert('پیامک قابل پردازش نبود.');
        }
    }).catch(function() {
        if (!auto) alert('دسترسی به کلیپ‌بورد داده نشد.');
    });
};

/* ==================== Pattern Manager (ساده) ==================== */
function showSmsPatternsManager() {
    var patterns = loadSmsPatterns();
    if (patterns.length === 0) { alert('هنوز الگویی ثبت نشده است.'); return; }
    var lines = patterns.map(function(p, i) {
        return (i + 1) + '. ' + p.label + '  [استفاده: ' + toFa(p.uses || 0) + ']';
    });
    var ans = prompt('مدیریت الگوها:\n\n' + lines.join('\n') + '\n\nشماره الگو برای حذف (خالی = لغو):');
    if (!ans) return;
    var idx = Number(normalizeDigits(ans)) - 1;
    if (isNaN(idx) || idx < 0 || idx >= patterns.length) { alert('شماره نامعتبر'); return; }
    if (!confirm('الگوی «' + patterns[idx].label + '» حذف شود؟')) return;
    deleteSmsPattern(patterns[idx].id);
    showToast('🗑 الگو حذف شد');
}

/* ==================== Init ==================== */
function initSmsPatternSystem() {
    // رندر اولیه باکس ثبت‌نشده
    renderPendingSmsBox();

    // دکمه خالی کردن
    var clearBtn = document.getElementById('pending-sms-clear');
    if (clearBtn && !clearBtn.dataset.bound) {
        clearBtn.dataset.bound = '1';
        clearBtn.addEventListener('click', function() {
            if (getPendingSmsCount() === 0) { showToast('باکس خالی است.'); return; }
            if (!confirm('همه پیامک‌های ثبت‌نشده حذف شوند؟')) return;
            clearPendingSms();
            renderPendingSmsBox();
            updatePendingSmsBadge();
            showToast('🗑 باکس خالی شد');
        });
    }

    // دکمه مدیریت الگوها
    var mgrBtn = document.getElementById('sms-patterns-manage');
    if (mgrBtn && !mgrBtn.dataset.bound) {
        mgrBtn.dataset.bound = '1';
        mgrBtn.addEventListener('click', showSmsPatternsManager);
    }

    console.log('🧠 SMS Pattern System ready — patterns:', loadSmsPatterns().length, '| pending:', getPendingSmsCount());
}

// اجرا پس از init اصلی (کمی تأخیر تا DOM و init تمام شود)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initSmsPatternSystem, 250); });
} else {
    setTimeout(initSmsPatternSystem, 250);
}
