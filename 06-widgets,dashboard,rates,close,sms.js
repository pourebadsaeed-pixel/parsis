/* =====================================================================
   ============ بخش D: SMS — هسته صندوق و پیامک ============
   ===================================================================== */

function matchBankAccountByBankName(text) {
    if (!text) return null;
    var t = String(text);
    var ba = DB.load('bankAccounts', []);
    var best = null, bestScore = 0;
    for (var i = 0; i < ba.length; i++) {
        var b = ba[i];
        var bankName = String(b.bank || '').trim();
        if (bankName.length < 3) continue;
        if (t.indexOf(bankName) !== -1) {
            var score = bankName.length * 2;
            if (score > bestScore) { bestScore = score; best = b; }
            continue;
        }
        var parts = bankName.split(/\s+/).filter(function(w) { return w.length >= 3; });
        for (var p = 0; p < parts.length; p++) {
            if (t.indexOf(parts[p]) !== -1) {
                var sc = parts[p].length;
                if (sc > bestScore) { bestScore = sc; best = b; }
            }
        }
    }
    return bestScore >= 3 ? best : null;
}
function findMatchingBankAccount(text) {
    if (!text) return null;
    var rawText = String(text);
    var byName = matchBankAccountByBankName(rawText);
    if (byName) return byName;
    var t = normalizeDigits(rawText).replace(/\D/g, '');
    if (t.length < 6) return null;
    var ba = DB.load('bankAccounts', []);
    var best = null, bestScore = 0;
    for (var j = 0; j < ba.length; j++) {
        var bj = ba[j];
        var cands = [
            { v: (bj.account || '').replace(/\D/g, ''), w: 3 },
            { v: (bj.card || '').replace(/\D/g, ''), w: 2 },
            { v: (bj.iban || '').replace(/\D/g, ''), w: 2 }
        ];
        for (var k = 0; k < cands.length; k++) {
            var n = cands[k].v;
            if (n.length < 6) continue;
            var maxLen = Math.min(n.length, 16);
            for (var len = maxLen; len >= 6; len--) {
                var sub = n.slice(-len);
                if (t.indexOf(sub) !== -1) {
                    var score = len * cands[k].w;
                    if (score > bestScore) { bestScore = score; best = bj; }
                    break;
                }
            }
        }
    }
    return best;
}
function parseBankSms(text) {
    var result = { amount: 0, direction: '', balance: 0, accountCandidates: [], matchedAccount: null, bankName: '', raw: text };
    if (!text) return result;
    var t = normalizeDigits(text);
    var knownBanks = ['ملی','پاسارگاد','صادرات','تجارت','ملت','سپه','کشاورزی','مسکن','پارسیان','سامان','رفاه','اقتصاد نوین','آینده','شهر','دی','سینا','گردشگری','صنعت و معدن','توسعه صادرات','قوامین','حکمت','ایران زمین','مهر ایران','خاورمیانه','کارآفرین','پست بانک','رسالت','بلو','سرمایه'];
    for (var b = 0; b < knownBanks.length; b++) {
        if (t.indexOf(knownBanks[b]) !== -1) { result.bankName = 'بانک ' + knownBanks[b]; break; }
    }
    var bm = t.match(/مانده\s*(?:حساب)?\s*[:ـ]?\s*([\d,]+)/);
    if (bm) result.balance = Number(bm[1].replace(/,/g, '')) || 0;
    if (!result.balance) {
        var mo = t.match(/موجودی\s*(?:قابل\s*استفاده)?\s*[:ـ]?\s*([\d,]+)/);
        if (mo) result.balance = Number(mo[1].replace(/,/g, '')) || 0;
    }
    var bigNums = [], seenVals = {};
    var numRe = /\d{1,3}(?:,\d{3})+|\d{4,}/g, nm;
    while ((nm = numRe.exec(t)) !== null) {
        var val = Number(nm[0].replace(/,/g, ''));
        if (val < 1000) continue;
        if (val === result.balance) continue;
        if (seenVals[val]) continue;
        seenVals[val] = true;
        var idx = nm.index;
        var cb = idx > 0 ? t.charAt(idx - 1) : '';
        var ca = idx + nm[0].length < t.length ? t.charAt(idx + nm[0].length) : '';
        var neg = /[-−\u2212]/.test(cb) || /[-−\u2212]/.test(ca);
        var pos = cb === '+' || ca === '+';
        bigNums.push({ value: val, neg: neg, pos: pos, idx: idx });
    }
    var chosen = null, bestScore = -1;
    var keywords = ['مبلغ','برداشت','واریز','خرید','پرداخت','انتقال','مانده‌گیری','برداشت وجه','کسر'];
    for (var k = 0; k < bigNums.length; k++) {
        var bn = bigNums[k];
        var ctx = t.substring(Math.max(0, bn.idx - 30), Math.min(t.length, bn.idx + 30));
        var score = 0;
        for (var ki = 0; ki < keywords.length; ki++) if (ctx.indexOf(keywords[ki]) !== -1) score += 10;
        if (bn.neg) score += 5;
        if (bn.pos) score += 5;
        score += Math.min(bn.value.toString().length, 10) * 0.5;
        if (score > bestScore) { bestScore = score; chosen = bn; }
    }
    if (chosen) {
        result.amount = chosen.value;
        if (chosen.neg) result.direction = 'out';
        else if (chosen.pos) result.direction = 'in';
    }
    var candidates = [], seen = {};
    function addC(s) {
        s = String(s).replace(/[*\s\-\.]/g, '');
        if (s.length < 3) return;
        if (seen[s]) return;
        seen[s] = true;
        candidates.push({ value: s });
    }
    var labelRe = /(?:حساب|کارت|شبا|شماره\s*حساب|شماره\s*کارت|IR)\s*[:ـ]?\s*([\d*.\-]{3,30})/gi, lm;
    while ((lm = labelRe.exec(t)) !== null) addC(lm[1]);
    var pasRe = /(\d{3})[.\-](\d{3})[.\-](\d{5,})(?:[.\-](\d{1,3}))?/g, pm;
    while ((pm = pasRe.exec(t)) !== null) {
        addC(pm[3]);
        addC(pm[1] + pm[2] + pm[3] + (pm[4] || ''));
    }
    var allD = t.match(/\d{5,25}/g) || [];
    for (var ad = 0; ad < allD.length; ad++) {
        var v2 = allD[ad];
        if (Number(v2) === result.balance) continue;
        if (Number(v2) === result.amount) continue;
        addC(v2);
    }
    result.accountCandidates = candidates;
    var byName = matchBankAccountByBankName(text);
    if (byName) { result.matchedAccount = byName; result.matchedField = 'نام بانک'; return result; }
    var ba = DB.load('bankAccounts', []);
    var best = null, bestMS = 0;
    for (var bi = 0; bi < ba.length; bi++) {
        var bak = ba[bi];
        var fields = [
            { v: (bak.account || '').replace(/\D/g, ''), w: 10, name: 'حساب' },
            { v: (bak.card || '').replace(/\D/g, ''), w: 7, name: 'کارت' },
            { v: (bak.iban || '').replace(/\D/g, ''), w: 5, name: 'شبا' }
        ];
        for (var fi = 0; fi < fields.length; fi++) {
            var fv = fields[fi].v, w = fields[fi].w;
            if (fv.length < 4) continue;
            for (var ci2 = 0; ci2 < candidates.length; ci2++) {
                var cand = candidates[ci2].value;
                if (cand.length < 4) continue;
                var sc = 0;
                if (fv === cand) sc = 100 * w;
                else if (fv.indexOf(cand) !== -1) sc = (50 + cand.length * 3) * w;
                else if (cand.indexOf(fv) !== -1) sc = (50 + fv.length * 3) * w;
                else {
                    var ml = Math.min(fv.length, cand.length, 10);
                    for (var sl = ml; sl >= 4; sl--) {
                        if (fv.slice(-sl) === cand.slice(-sl)) { sc = (20 + sl * 8) * w; break; }
                    }
                }
                if (sc > bestMS) { bestMS = sc; best = { account: bak, matchedField: fields[fi].name }; }
            }
        }
    }
    if (best && bestMS >= 200) { result.matchedAccount = best.account; result.matchedField = best.matchedField; }
    return result;
}
function getSmsInbox() { return DB.load('smsInbox', []); }
function saveSmsInbox(list) { DB.save('smsInbox', list); }
function getUnreadSmsCount() {
    var l = getSmsInbox();
    var c = 0;
    l.forEach(function(s) { if (s.status === 'new') c++; });
    return c;
}
function updateSmsBadge() {
    var c = getUnreadSmsCount();
    var b = document.getElementById('sms-nav-badge');
    if (!b) return;
    if (c > 0) { b.textContent = toFa(c); b.classList.remove('hidden'); }
    else b.classList.add('hidden');
}
function addSmsToInbox(rawText, source) {
    var text = String(rawText || '').trim();
    if (!text) return { ok: false, reason: 'empty' };
    var list = getSmsInbox();
    if (list.some(function(s) { return s.rawText === text; })) return { ok: false, reason: 'duplicate' };
    var parsed = parseBankSms(text);
    if (!parsed.bankName && !parsed.amount && parsed.accountCandidates.length === 0) return { ok: false, reason: 'not-bank' };
    var item = {
        id: uid(), rawText: text, source: source || 'manual', receivedAt: Date.now(),
        parsed: {
            amount: parsed.amount, direction: parsed.direction, balance: parsed.balance, bankName: parsed.bankName,
            matchedAccountId: parsed.matchedAccount ? parsed.matchedAccount.id : '',
            matchedAccountTitle: parsed.matchedAccount ? ((parsed.matchedAccount.bank || '') + ' - ' + (parsed.matchedAccount.account || '')) : '',
            matchedField: parsed.matchedField || '',
            accountCandidates: parsed.accountCandidates
        },
        status: 'new', voucherId: ''
    };
    list.unshift(item);
    saveSmsInbox(list);
    return { ok: true, item: item };
}
function renderSmsInbox() {
    var box = document.getElementById('sms-inbox-list');
    if (!box) return;
    var list = getSmsInbox();
    var countEl = document.getElementById('sms-inbox-count');
    if (list.length === 0) {
        box.innerHTML = '<div class="widget-empty">📭 صندوق خالی است.</div>';
        if (countEl) countEl.textContent = '۰';
        return;
    }
    list.sort(function(a, b) { return (b.receivedAt || 0) - (a.receivedAt || 0); });
    var html = '';
    list.forEach(function(s) {
        var p = s.parsed || {};
        var dirLabel, dirClass;
        if (p.direction === 'out') { dirLabel = '🔴 برداشت'; dirClass = 'out'; }
        else if (p.direction === 'in') { dirLabel = '🟢 واریز'; dirClass = 'in'; }
        else { dirLabel = '❓'; dirClass = ''; }
        var statusBadge, statusClass;
        if (s.status === 'converted') { statusBadge = '✓ ثبت شده'; statusClass = 'status-converted'; }
        else if (s.status === 'ignored') { statusBadge = '— نادیده'; statusClass = 'status-ignored'; }
        else { statusBadge = '🔔 ثبت نشده'; statusClass = 'status-new'; }
        var meta = '📅 ' + toFa(tsToJalaliDate(s.receivedAt)) + ' — ' + toFa(tsToJalaliTime(s.receivedAt));
        var parsedHtml = '';
        if (p.bankName) parsedHtml += '<span class="pill">🏦 ' + esc(p.bankName) + '</span>';
        if (p.amount) parsedHtml += '<span class="pill ' + dirClass + '">' + dirLabel + ': ' + formatMoney(p.amount) + ' ' + currencyLabel() + '</span>';
        else parsedHtml += '<span class="pill">' + dirLabel + '</span>';
        if (p.balance) parsedHtml += '<span class="pill">💰 ' + formatMoney(p.balance) + '</span>';
        if (p.matchedAccountTitle) parsedHtml += '<span class="pill" style="background:#d1fae5;color:#065f46">🎯 ' + esc(p.matchedAccountTitle) + '</span>';
        var canConvert = (s.status === 'new') && p.amount > 0 && p.direction;
        html += '<div class="sms-item ' + statusClass + '"><div class="sms-item-head"><div><div class="title">' + statusBadge + '</div><div class="meta">' + esc(meta) + '</div></div></div>' +
            '<div class="sms-item-parsed">' + parsedHtml + '</div><div class="sms-item-text">' + esc(s.rawText) + '</div>' +
            '<div class="sms-item-actions"><button class="btn-convert" data-action="convert" data-id="' + s.id + '"' + (canConvert ? '' : ' disabled') + '>📝 ساخت سند</button>' +
            '<button class="btn-ignore" data-action="ignore" data-id="' + s.id + '">🚫</button><button class="btn-delete" data-action="delete" data-id="' + s.id + '">🗑</button></div></div>';
    });
    box.innerHTML = html;
    if (countEl) countEl.textContent = toFa(list.length);
    var btns = box.querySelectorAll('[data-action]');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function() {
        var action = this.getAttribute('data-action');
        var id = this.getAttribute('data-id');
        if (action === 'convert') { if (window.convertSmsToVoucher) window.convertSmsToVoucher(id); return; }
        if (action === 'ignore') {
            var l = getSmsInbox();
            for (var x = 0; x < l.length; x++) if (l[x].id === id) l[x].status = 'ignored';
            saveSmsInbox(l);
            renderSmsInbox();
            updateSmsBadge();
            return;
        }
        if (action === 'delete') {
            if (!confirm('حذف شود؟')) return;
            var l2 = getSmsInbox().filter(function(x) { return x.id !== id; });
            saveSmsInbox(l2);
            renderSmsInbox();
            updateSmsBadge();
            return;
        }
    });
}
var _lastClipboardText = '';
function readClipboardAndAdd(auto) {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        if (!auto) alert('مرورگر پشتیبانی نمی‌کند.');
        return;
    }
    navigator.clipboard.readText().then(function(text) {
        var t = String(text || '').trim();
        if (!t) { if (!auto) alert('کلیپ‌بورد خالی.'); return; }
        if (auto && t === _lastClipboardText) return;
        var matched = findMatchingBankAccount(t);
        if (!matched) {
            if (!auto) alert('❌ این متن شامل شماره حساب یا نام بانک‌های شما نیست.');
            return;
        }
        var res = addSmsToInbox(t, auto ? 'auto' : 'clipboard');
        if (res.ok) {
            _lastClipboardText = t;
            renderSmsInbox();
            updateSmsBadge();
            showToast(auto ? '📱 پیامک اضافه شد' : '✅ اضافه شد.');
        } else if (res.reason === 'duplicate' && !auto) showToast('قبلاً ثبت شده.');
        else if (!auto) alert('قابل تشخیص نبود.');
    }).catch(function() { if (!auto) alert('دسترسی به کلیپ‌بورد داده نشد.'); });
}
function checkClipboardSupport() {
    var el = document.getElementById('clip-status');
    if (!el) return;
    if (navigator.clipboard && navigator.clipboard.readText) {
        el.textContent = 'در دسترس';
        el.className = 'method-status ok';
    } else {
        el.textContent = 'ندارد';
        el.className = 'method-status no';
    }
}

/* =====================================================================
   ============ بخش E: سیستم الگوی پیامک (از 06b) ============
   ===================================================================== */

var SMS_PATTERNS_KEY  = 'smsPatterns';
var SMS_PENDING_KEY   = 'smsPending';
var SMS_PENDING_MAX   = 200;
var SMS_PATTERN_THRESHOLD = 0.75;
window.SMS_PATTERN_THRESHOLD = SMS_PATTERN_THRESHOLD;

/* CSS درون‌خطی برای پیامک‌های ثبت‌نشده (فرم بازطراحی‌شده از 11) */
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

/* =====================================================================
   ============ بخش F: تشخیص جهت و مبلغ با علامت (از 12) ============
   ===================================================================== */

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
function parseSignNum(str) { return parseSignNumber(str); }

/**
 * استخراج مبلغ با علامت از متن پیامک (قبل یا بعد عدد)
 */
function extractAmountWithSign(text) {
    var t = normalizeDigits(String(text || ''))
        .replace(/[−–—]/g, '-')
        .replace(/[＋]/g, '+');

    var labeled = t.match(/(?:انتقالي|انتقالی|مبلغ|برداشت|واریز|خرید|پرداخت|افزایش|کسر|موجودي|موجودی|حقوق|قسط)\s*[:ـ]?\s*([+\-]?\s*[\d][\d,]*(?:\s*[+\-])?)/);
    if (labeled) {
        var res = parseSignNumber(labeled[1]);
        if (res.amount > 0) return res;
    }
    var m1 = t.match(/([+\-])\s*([\d]{1,3}(?:,[\d]{3})+)/);
    if (m1) return { amount: Number(m1[2].replace(/,/g, '')), sign: m1[1] };
    var m2 = t.match(/([\d]{1,3}(?:,[\d]{3})+)\s*([+\-])/);
    if (m2) return { amount: Number(m2[1].replace(/,/g, '')), sign: m2[2] };
    var m3 = t.match(/([\d]{1,3}(?:,[\d]{3})+)/);
    if (m3) return { amount: Number(m3[1].replace(/,/g, '')), sign: '' };
    return { amount: 0, sign: '' };
}
function parseAmountWithSign(text) { return extractAmountWithSign(text); }

/**
 * تشخیص جهت تراکنش — با اولویت مطلق علامت (قبل یا بعد مبلغ)
 */
function detectSmsDirection(text) {
    var t = normalizeDigits(String(text || '')).replace(/[−–—]/g, '-');

    var amtRes = extractAmountWithSign(t);
    if (amtRes.sign === '+') return 'in';
    if (amtRes.sign === '-') return 'out';

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
function detectDirectionPrecise(text) { return detectSmsDirection(text); }
window.detectSmsDirection = detectSmsDirection;
window.extractAmountWithSign = extractAmountWithSign;
window.parseSignNumber = parseSignNumber;
window.parseAmountWithSign = parseAmountWithSign;

/* =====================================================================
   ============ بخش G: Override parseBankSms (اضافه‌کردن علامت) ============
   ===================================================================== */
(function () {
    var _origParse = parseBankSms;
    parseBankSms = function (text) {
        var r = _origParse(text) || {};
        var t = normalizeDigits(String(text || ''));

        var amtRes = extractAmountWithSign(t);
        if (amtRes.amount > 0) {
            r.amount = amtRes.amount;
            if (amtRes.sign === '+') r.direction = 'in';
            else if (amtRes.sign === '-') r.direction = 'out';
        }
        if (!r.direction) {
            var dir = detectSmsDirection(t);
            if (dir) r.direction = dir;
        }
        return r;
    };
})();

/* Override suggestDirection (فقط برای سازگاری) */
window.suggestDirection = function (text) { return detectSmsDirection(text); };

/* =====================================================================
   ============ بخش H: توکن‌سازی و تطبیق الگو (از 06b + 11 + 12) ============
   ===================================================================== */

function smsNormalizeForPattern(text) {
    return normalizeDigits(String(text || ''))
        .replace(/[\u200c\u200e\u200f]/g, ' ')
        .replace(/[،,]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * ساخت الگو با در نظر گرفتن علامت قبل یا بعد از عدد
 */
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

function isWild(t) {
    return typeof t === 'string' && t.indexOf('#') !== -1;
}

/**
 * شباهت توکن‌ها با در نظر گرفتن علامت — نسخه سختگیرانه (از 12)
 * علامت متضاد → کل الگو رد می‌شود
 */
function smsTokenSimilarity(a, b) {
    var n = Math.max(a.length, b.length);
    if (n === 0) return 0;
    var score = 0;
    var hasSignConflict = false;
    function getSign(t) {
        if (!t) return '';
        var c0 = t.charAt(0);
        if (c0 === '+' || c0 === '-') return c0;
        var cl = t.charAt(t.length - 1);
        if (cl === '+' || cl === '-') return cl;
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
            else { hasSignConflict = true; score -= 2.0; }
        }
        else if (wildA || wildB) score += 0.4;
        else score -= 0.3;
    }
    if (hasSignConflict) return 0;
    return Math.max(0, score / n);
}
window.smsTokenSimilarity = smsTokenSimilarity;

/**
 * یافتن بهترین الگو — نادیده گرفتن الگوهای مسدود (از 12)
 */
function findMatchingSmsPattern(raw) {
    var patterns = loadSmsPatterns();
    var active = patterns.filter(function (p) { return !p.blocked; });
    if (active.length === 0) return null;
    var built = buildSmsPattern(raw);
    var best = null, bestScore = 0;
    for (var i = 0; i < active.length; i++) {
        var s = smsTokenSimilarity(built.tokens, active[i].tokens || []);
        if (s > bestScore) { bestScore = s; best = active[i]; }
    }
    return bestScore >= SMS_PATTERN_THRESHOLD
        ? { pattern: best, score: bestScore, built: built }
        : null;
}

/* =====================================================================
   ============ بخش I: فیلتر بانکی هوشمند (از 06b) ============
   ===================================================================== */
function isBankSms(text) {
    if (!text) return false;
    var t = String(text).trim();
    if (t.length < 15) return false;

    if (/کد\s*(ورود|تایید|تأیید|فعال\s*سازی|فعالسازی|احراز|ثبت\s*نام)/.test(t)) return false;
    if (/رمز\s*(یک\s*بار|یکبار|پویا|دوم|موقت)/.test(t)) return false;
    if (/\bOTP\b/i.test(t)) return false;
    if (/one[\s-]?time\s*(password|code)/i.test(t)) return false;
    if (/کد\s*تخفیف|کد\s*معرف|کد\s*هدیه|کد\s*پنل/.test(t)) return false;
    if (/^\s*\D*\d{4,6}\D*\s*$/.test(t) && !/ریال|تومان|مبلغ|برداشت|واریز/.test(t)) return false;

    if (typeof findMatchingBankAccount === 'function') {
        try { if (findMatchingBankAccount(t)) return true; } catch (e) {}
    }
    var hasBankWord = /بانک|حساب|کارت|شبا|سپرده|ATM|خودپرداز|درگاه/.test(t);
    var hasMoneyWord = /ریال|تومان|مبلغ|موجودی|مانده/.test(t);
    var hasDirWord = /برداشت|واریز|پرداخت|دریافت|خرید|انتقال|بستانکار|بدهکار|افزایش|کسر|قسط|حقوق|اجاره/.test(t);
    var hasBigNumber = /\d{1,3}(?:,\d{3})+|\d{6,}/.test(t);
    var hasDate = /\d{4}\/\d{1,2}\/\d{1,2}|\d{2}\/\d{1,2}\/\d{1,2}/.test(t);

    if (hasBankWord && hasBigNumber) return true;
    if (hasMoneyWord && (hasDirWord || hasBigNumber)) return true;
    if (hasDirWord && hasBigNumber && hasDate) return true;
    return false;
}

/* =====================================================================
   ============ بخش J: پیشنهادها (amount/direction/date/desc) ============
   ===================================================================== */
function suggestAmount(text) {
    var t = normalizeDigits(String(text || ''));
    var m1 = t.match(/مبلغ\s*[:ـ]?\s*([\d,]+)/);
    if (m1) { var v1 = Number(m1[1].replace(/,/g, '')); if (v1 > 0) return v1; }
    var m2 = t.match(/([\d]{1,3}(?:,[\d]{3})+)/);
    if (m2) { var v2 = Number(m2[1].replace(/,/g, '')); if (v2 > 0) return v2; }
    var m3 = t.match(/\b(\d{6,})\b/);
    if (m3) return Number(m3[1]);
    return 0;
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
        if (!line || line.length > 40) continue;
        if (/\d/.test(line)) continue;
        if (/بانک|حساب|کارت|شبا|ریال|تومان|مبلغ|موجودی/.test(line)) continue;
        return line;
    }
    return '';
}
function suggestLabel(text, bankName, dir) {
    var bank = bankName || '';
    if (!bank) {
        var m = String(text || '').match(/بانک\s+([^\s*،,\n]+)/);
        if (m) bank = 'بانک ' + m[1];
    }
    var dirLabel = dir === 'out' ? 'برداشت' : (dir === 'in' ? 'واریز' : 'تراکنش');
    return (bank ? bank + ' — ' : '') + dirLabel;
}

/* =====================================================================
   ============ بخش K: CRUD الگو و پیامک‌های ثبت‌نشده ============
   ===================================================================== */
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
        key: key, raw: built.raw, tokens: built.tokens,
        mapping: opts.mapping || built.mapping,
        slots: opts.slots || {},
        label: opts.label || 'الگوی پیامک',
        direction: opts.direction || '',
        linkedAccountId: opts.linkedAccountId || '',
        uses: 1, createdAt: Date.now(), lastUsed: Date.now()
    };
    patterns.push(rec);
    saveSmsPatterns(patterns);
    return rec;
}
function bumpSmsPatternUsage(id) {
    var all = loadSmsPatterns();
    var p = all.find(function (x) { return x.id === id; });
    if (!p) return;
    p.uses = (p.uses || 0) + 1;
    p.lastUsed = Date.now();
    saveSmsPatterns(all);
}
function deleteSmsPattern(id) {
    saveSmsPatterns(loadSmsPatterns().filter(function (p) { return p.id !== id; }));
}
function addPendingSms(raw, source, force) {
    var text = String(raw || '').trim();
    if (!text) return null;
    var list = getPendingSms();
    if (list.some(function (p) { return p.raw === text; })) return null;
    if (!force && !isBankSms(text)) return null;
    var amount    = suggestAmount(text);
    var direction = detectSmsDirection(text) || '';
    var date      = suggestDate(text);
    var desc      = suggestDescription(text);
    var matched   = (typeof findMatchingBankAccount === 'function') ? findMatchingBankAccount(text) : null;
    var bankM     = text.match(/بانک\s+([^\s*،,\n]+)/);
    var rec = {
        id: 'pd_' + uid(), raw: text, source: source || 'clipboard',
        createdAt: Date.now(), forced: !!force,
        suggestion: {
            amount: amount, direction: direction, date: date, description: desc,
            bankName: bankM ? 'بانک ' + bankM[1] : '',
            linkedAccountId: matched ? matched.id : ''
        }
    };
    list.push(rec);
    savePendingSms(list);
    return rec;
}
function removePendingSms(id) { savePendingSms(getPendingSms().filter(function (p) { return p.id !== id; })); }
function clearPendingSms() { savePendingSms([]); }

/* Nav Badge — ادغام با inbox و pending */
window.updateSmsBadge = function () {
    var inboxCount   = (typeof getUnreadSmsCount === 'function') ? getUnreadSmsCount() : 0;
    var pendingCount = getPendingSmsCount();
    var total = inboxCount + pendingCount;
    var b = document.getElementById('sms-nav-badge');
    if (!b) return;
    if (total > 0) { b.textContent = toFa(total); b.classList.remove('hidden'); }
    else b.classList.add('hidden');
};

/* =====================================================================
   ============ بخش L: فرم بازطراحی‌شده پیامک‌های ثبت‌نشده (از 11) ============
   ===================================================================== */
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

        var liveDir = detectSmsDirection(p.raw);
        var effectiveDir = liveDir || s.direction || '';
        var liveAmt = extractAmountWithSign(p.raw);

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
            +       '<input type="text" class="amount-input" inputmode="numeric" dir="ltr" data-field="amount" value="' + ((liveAmt.amount || s.amount) ? formatRaw(liveAmt.amount || s.amount) : '') + '">'
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
            if (action === 'save-pattern-only') return savePendingAsPattern(pid, false);
            if (action === 'save-with-voucher')  return savePendingAsPattern(pid, true);
        });
    });
}

/* =====================================================================
   ============ بخش M: ذخیره الگو از فرم پیامک ثبت‌نشده ============
   ===================================================================== */
function savePendingAsPattern(pid, withVoucher) {
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
        raw: pending.raw, key: built.key, tokens: built.tokens, mapping: built.mapping,
        slots: { amount: amountSlot },
        label: labelStr.trim(), direction: direction, linkedAccountId: accountId
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
            bankAccountId: accountId, amount: amount, direction: direction,
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

/* =====================================================================
   ============ بخش N: ساخت سند از پیامک ============
   ===================================================================== */
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
                ? getNextVoucherNumberForPeriod(state.activePeriodId || '') : String(vl.length + 1),
        date: data.date || todayJalaliStr(),
        type: 'general', periodId: state.activePeriodId || '',
        desc: data.description || '', lines: lines, status: 'draft'
    };
    vl.push(v); DB.save('vouchers', vl);
    if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v);
    else if (typeof goToPage === 'function') goToPage('voucher-list');
    showToast('📝 پیش‌نویس سند آماده شد');
}

/* استخراج مقادیر از الگو برای پیامک‌های منطبق */
function extractValuesFromPattern(newRaw, pattern) {
    var built = buildSmsPattern(newRaw);
    var result = { amount: 0, direction: '', date: '', bankAccountId: pattern.linkedAccountId || '' };
    if (pattern.slots && pattern.slots.amount) {
        var rawVal = built.mapping['#' + pattern.slots.amount];
        if (rawVal) result.amount = Number(String(rawVal).replace(/[^\d]/g, '')) || 0;
    }
    if (!result.amount) result.amount = suggestAmount(newRaw);
    result.direction = pattern.direction || detectSmsDirection(newRaw);
    result.date = suggestDate(newRaw);
    return result;
}

/* =====================================================================
   ============ بخش O: ورودی پیامک و override readClipboard ============
   ===================================================================== */
function handleIncomingSms(text, source, force) {
    var t = String(text || '').trim();
    if (!t) return { ok: false, reason: 'empty' };
    if (!force && !isBankSms(t)) return { ok: false, reason: 'not-bank' };

    var m = findMatchingSmsPattern(t);
    if (m) {
        var res = addSmsToInbox(t, source || 'clipboard');
        if (res.ok) {
            bumpSmsPatternUsage(m.pattern.id);
            if (typeof renderSmsInbox === 'function') renderSmsInbox();
            if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
            var vals = extractValuesFromPattern(t, m.pattern);
            var amtTxt = vals.amount ? formatMoney(vals.amount) + ' ' + currencyLabel() : '';
            showToast('📱 شناسایی شد' + (amtTxt ? ' — ' + amtTxt : '') + ' (' + m.pattern.label + ')');
            return { ok: true, matched: true, pattern: m.pattern, values: vals };
        }
        if (res.reason === 'duplicate') return { ok: false, reason: 'duplicate' };
    }

    var added = addPendingSms(t, source || 'clipboard', force);
    if (added) {
        renderPendingSmsBox();
        if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
        showToast(force ? '🔔 به‌صورت دستی اضافه شد' : '🔔 پیامک جدید — برای ثبت الگو بازبینی کن');
        return { ok: true, matched: false, pending: added };
    }
    return { ok: false, reason: 'duplicate' };
}

/* Override readClipboardAndAdd با منطق جدید */
window.readClipboardAndAdd = function (auto) {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        if (!auto) alert('مرورگر از کلیپ‌بورد پشتیبانی نمی‌کند.');
        return;
    }
    navigator.clipboard.readText().then(function (text) {
        var t = String(text || '').trim();
        if (!t) { if (!auto) alert('کلیپ‌بورد خالی است.'); return; }
        if (auto && t === window._lastClipboardText) return;

        var res = handleIncomingSms(t, auto ? 'auto' : 'clipboard');
        if (res.ok) { window._lastClipboardText = t; return; }

        if (res.reason === 'duplicate') {
            if (!auto) showToast('قبلاً ثبت شده.');
            return;
        }
        if (res.reason === 'not-bank') {
            if (auto) return;
            var preview = t.length > 300 ? t.slice(0, 300) + '…' : t;
            var ok = confirm(
                '❌ این متن به‌عنوان پیامک بانکی شناسایی نشد.\n\n'
                + 'محتوا:\n' + preview + '\n\n'
                + 'اگر مطمئنی این پیامک بانکیه، «OK» بزن تا به باکس اضافه بشه.'
            );
            if (!ok) return;
            var forced = handleIncomingSms(t, 'manual', true);
            if (forced.ok) { window._lastClipboardText = t; }
            else showToast('قبلاً ثبت شده بود.');
            return;
        }
        if (!auto) alert('پیامک قابل پردازش نبود.');
    }).catch(function () {
        if (!auto) alert('دسترسی به کلیپ‌بورد داده نشد. یک بار دیگر امتحان کن.');
    });
};

/* =====================================================================
   ============ بخش P: مودال مدیریت الگوها + ویرایش (از 12) ============
   ===================================================================== */
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
        if (!confirm('همه الگوها حذف شوند؟')) return;
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
            ? ' <span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:8px;font-size:.66rem;font-weight:800">🚫 مسدود</span>' : '';
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
            +     '<button type="button" onclick="window.openEditSmsPattern(\'' + p.id + '\')" '
            +       'style="background:#dbeafe;color:#1e40af;border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">✏️ ویرایش</button>'
            +     '<button type="button" data-pattern-block="' + p.id + '" '
            +       'style="background:' + (p.blocked ? '#d1fae5;color:#065f46' : '#fef3c7;color:#92400e') + ';border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">'
            +       (p.blocked ? '✅ رفع' : '🚫 مسدود') + '</button>'
            +     '<button type="button" data-pattern-del="' + p.id + '" '
            +       'style="background:#fee2e2;color:#dc2626;border:none;border-radius:9px;padding:8px 12px;font-family:inherit;font-weight:800;font-size:.8rem;cursor:pointer">🗑</button>'
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
            renderSmsPatternsManagerBody();
            showToast('🗑 حذف شد');
        });
    });
    box.querySelectorAll('[data-pattern-block]').forEach(function (b) {
        b.addEventListener('click', function () {
            var id = this.getAttribute('data-pattern-block');
            var all = loadSmsPatterns();
            var idx = -1;
            for (var j = 0; j < all.length; j++) if (all[j].id === id) { idx = j; break; }
            if (idx === -1) return;
            all[idx].blocked = !all[idx].blocked;
            saveSmsPatterns(all);
            renderSmsPatternsManagerBody();
            showToast(all[idx].blocked ? '🚫 مسدود شد' : '✅ رفع مسدودی');
        });
    });
}
window.renderSmsPatternsManagerBody = renderSmsPatternsManagerBody;

/* مودال ویرایش الگو */
function openEditSmsPattern(patternId) {
    try {
        var patterns = loadSmsPatterns();
        var p = patterns.find(function (x) { return x.id === patternId; });
        if (!p) { showToast('الگو یافت نشد.'); return; }

        var old = document.getElementById('sms-edit-modal'); if (old) old.remove();
        var oldO = document.getElementById('sms-edit-overlay'); if (oldO) oldO.remove();

        var accounts = DB.load('bankAccounts', []);
        var accOpts = '<option value="">— تعیین نشده —</option>';
        for (var i = 0; i < accounts.length; i++) {
            var a = accounts[i];
            var sel = (p.linkedAccountId === a.id) ? ' selected' : '';
            accOpts += '<option value="' + a.id + '"' + sel + '>' +
                esc((a.bank || '') + ' — ' + (a.account || '')) + '</option>';
        }
        var dirIn  = p.direction === 'in'  ? 'checked' : '';
        var dirOut = p.direction === 'out' ? 'checked' : '';
        var preview = (p.tokens || []).join(' ');

        var html = ''
            + '<div id="sms-edit-overlay" class="overlay" style="z-index:1400"></div>'
            + '<div id="sms-edit-modal" class="modal" style="max-width:560px;z-index:1410">'
            +   '<div class="modal-head"><h2>✏️ ویرایش الگوی پیامک</h2>'
            +     '<button type="button" id="sms-edit-close" class="close-btn">×</button></div>'
            +   '<div class="modal-body">'
            +     '<div class="field"><label>نام الگو</label>'
            +       '<input type="text" id="se-label" value="' + esc(p.label || '') + '"></div>'
            +     '<div class="field"><label>حساب بانکی مرتبط</label>'
            +       '<select id="se-account">' + accOpts + '</select></div>'
            +     '<div class="field"><label>جهت تراکنش</label>'
            +       '<div class="psf-radio" style="display:flex;gap:8px">'
            +         '<label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer;border:1.5px solid var(--border);justify-content:center">'
            +           '<input type="radio" name="se_dir" value="in" ' + dirIn + ' style="accent-color:#059669"> 📥 واریز</label>'
            +         '<label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer;border:1.5px solid var(--border);justify-content:center">'
            +           '<input type="radio" name="se_dir" value="out" ' + dirOut + ' style="accent-color:#dc2626"> 📤 برداشت</label>'
            +       '</div></div>'
            +     '<div class="field"><label>نمونه الگو</label>'
            +       '<div style="background:var(--card-alt);border:1px solid var(--border);border-radius:10px;padding:10px;font-family:monospace;font-size:.78rem;direction:rtl;line-height:1.8;max-height:150px;overflow-y:auto">'
            +         esc(preview) + '</div></div>'
            +     '<div class="field"><label style="display:flex;align-items:center;gap:8px;padding:10px;background:var(--card-alt);border-radius:10px;cursor:pointer">'
            +       '<input type="checkbox" id="se-blocked" ' + (p.blocked ? 'checked' : '') + '> '
            +       '<span style="font-size:.82rem">مسدود کردن این الگو</span></label></div>'
            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">'
            +     '<button type="button" id="sms-edit-cancel" class="btn-secondary">انصراف</button>'
            +     '<button type="button" id="sms-edit-save" class="btn-primary">💾 ذخیره</button>'
            +   '</div>'
            + '</div>';

        document.body.insertAdjacentHTML('beforeend', html);

        var closeFn = function () {
            var m = document.getElementById('sms-edit-modal'); if (m) m.remove();
            var o = document.getElementById('sms-edit-overlay'); if (o) o.remove();
        };
        document.getElementById('sms-edit-close').onclick = closeFn;
        document.getElementById('sms-edit-cancel').onclick = closeFn;
        document.getElementById('sms-edit-overlay').onclick = closeFn;

        document.getElementById('sms-edit-save').onclick = function () {
            var all = loadSmsPatterns();
            var idx = -1;
            for (var j = 0; j < all.length; j++) if (all[j].id === patternId) { idx = j; break; }
            if (idx === -1) { closeFn(); return; }
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
            closeFn();
            renderSmsPatternsManagerBody();
            showToast('✅ ذخیره شد' + (blocked ? ' (مسدود)' : ''));
        };
    } catch (err) {
        console.error('خطا در ویرایش الگو:', err);
        alert('خطا: ' + (err.message || err));
    }
}
window.openEditSmsPattern = openEditSmsPattern;

/* مدیریت الگوها با Modal — override */
window.showSmsPatternsManager = openSmsPatternsManager;

/* =====================================================================
   ============ بخش Q: convertSmsToVoucher هوشمند (از 12) ============
   ===================================================================== */
window.convertSmsToVoucher = function (smsId) {
    var list = getSmsInbox();
    var item = list.find(function (s) { return s.id === smsId; });
    if (!item) { showToast('پیامک یافت نشد.'); return; }

    var raw = normalizeDigits(item.rawText);
    var p = item.parsed || {};
    var amount = p.amount || 0;
    var direction = '';
    var bankAccountId = p.matchedAccountId || '';

    // اولویت ۱: علامت کنار مبلغ
    var amtRes = extractAmountWithSign(raw);
    if (amtRes.amount > 0 && amtRes.sign) {
        amount = amtRes.amount;
        direction = amtRes.sign === '+' ? 'in' : 'out';
    }

    // اولویت ۲: الگو
    var matched = findMatchingSmsPattern(item.rawText);
    var patternDirMatches = false;
    var patternLabel = '';
    if (matched && matched.pattern) {
        if (!direction && matched.pattern.direction) {
            direction = matched.pattern.direction;
            patternDirMatches = true;
        } else if (direction && matched.pattern.direction === direction) {
            patternDirMatches = true;
        }
        if (!bankAccountId && matched.pattern.linkedAccountId) {
            bankAccountId = matched.pattern.linkedAccountId;
        }
        if (patternDirMatches) patternLabel = matched.pattern.label || '';
    }

    // اولویت ۳: کلمات کلیدی
    if (!direction) direction = detectSmsDirection(raw);

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
        var d = prompt('نوع تراکنش:\n1 = برداشت\n2 = واریز', '1');
        if (d === '1') direction = 'out';
        else if (d === '2') direction = 'in';
        else return;
    }

    if (!bankAccountId) {
        var accounts = DB.load('bankAccounts', []);
        if (accounts.length === 0) { alert('⚠️ هیچ حساب بانکی تعریف نشده.'); return; }
        if (accounts.length === 1) bankAccountId = accounts[0].id;
        else {
            var opts = accounts.map(function (a, i) { return (i + 1) + '. ' + (a.bank || '') + ' — ' + (a.account || ''); }).join('\n');
            var ans = prompt('حساب بانکی:\n\n' + opts + '\n\nشماره:');
            if (!ans) return;
            var idx = Number(normalizeDigits(ans)) - 1;
            if (isNaN(idx) || idx < 0 || idx >= accounts.length) { alert('نامعتبر'); return; }
            bankAccountId = accounts[idx].id;
        }
    }

    var bankMoein = getBankMoeinId();
    if (!bankMoein) { alert('⚠️ معین بانک تعریف نشده.'); return; }

    // شرح خودکار بر اساس جهت نهایی
    var autoDesc = patternLabel;
    if (!autoDesc) {
        var bankName = p.bankName || '';
        var accObj = DB.load('bankAccounts', []).find(function (b) { return b.id === bankAccountId; });
        if (accObj && accObj.bank) bankName = accObj.bank;
        autoDesc = (direction === 'in' ? 'واریز' : 'برداشت') + (bankName ? ' - ' + bankName : '');
    }

    var bankDetail = { bank: bankAccountId };
    var lines = [];
    if (direction === 'out') {
        lines.push({ id: uid(), account: '', details: {}, debit: amount, credit: 0, description: autoDesc });
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: 0, credit: amount, description: autoDesc, locked: true });
    } else {
        lines.push({ id: uid(), account: bankMoein, details: bankDetail, debit: amount, credit: 0, description: autoDesc, locked: true });
        lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: amount, description: autoDesc });
    }

    var vl = DB.load('vouchers', []);
    var v = {
        id: uid(),
        number: getNextVoucherNumberForPeriod(state.activePeriodId || ''),
        date: todayJalaliStr(),
        type: 'general',
        periodId: state.activePeriodId || '',
        desc: autoDesc,
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

/* =====================================================================
   ============ بخش R: Init ============
   ===================================================================== */
function initSmsPatternSystem() {
    renderPendingSmsBox();
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
        mgrBtn.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            openSmsPatternsManager();
        });
    }
    console.log('🧠 SMS Pattern System v3 — patterns:', loadSmsPatterns().length, '| pending:', getPendingSmsCount());
}

/* راه‌اندازی */
(function () {
    function boot() {
        initSmsPatternSystem();
        if (typeof renderDashboardOrderUI === 'function') {
            try { renderDashboardOrderUI(); } catch(e) {}
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 400); });
    } else {
        setTimeout(boot, 400);
    }
})();

/* End of 06-widgets,dashboard,rates,close,sms.js */
