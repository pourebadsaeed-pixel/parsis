/* =====================================================================
   پارسیس v27 — 06-widgets,dashboard,rates,close,sms.js
   ویجت‌ها، داشبورد، نرخ لحظه‌ای، قیمت پایانی، پیامک بانکی
   ===================================================================== */
'use strict';

/* =====================================================================
   ============ بخش A: ویجت‌ها ============
   ===================================================================== */

/* ==================== Widgets visibility & order ==================== */
function applyWidgetVisibility() {
    var cards = document.querySelectorAll('.widget-card');
    for (var i = 0; i < cards.length; i++) {
        var w = cards[i].getAttribute('data-widget');
        var enabled = !!state.widgets[w];
        var pageOk = (state.widgetPages[w] || 1) === state.homePage;
        cards[i].classList.toggle('widget-hidden', !enabled || !pageOk);
    }
    var cbs = document.querySelectorAll('[data-widget-toggle]');
    for (var j = 0; j < cbs.length; j++) {
        var k = cbs[j].getAttribute('data-widget-toggle');
        cbs[j].checked = !!state.widgets[k];
    }
    renderHomePageTabs();
    renderHomePageDots();
}
function renderHomePageTabs() {
    var tabs = document.querySelectorAll('.home-page-tab');
    for (var i = 0; i < tabs.length; i++) {
        var pg = Number(tabs[i].getAttribute('data-home-page'));
        tabs[i].classList.toggle('active', pg === state.homePage);
    }
}
function renderHomePageDots() {
    var box = document.getElementById('home-page-dots');
    if (!box) return;
    box.innerHTML = '';
    for (var p = 1; p <= 3; p++) {
        var d = document.createElement('div');
        d.className = 'home-page-dot' + (p === state.homePage ? ' active' : '');
        (function(pg) { d.addEventListener('click', function() { state.homePage = pg; saveState('homePage'); applyWidgetVisibility(); }); })(p);
        box.appendChild(d);
    }
}
function setHomePage(p) { state.homePage = p; saveState('homePage'); applyWidgetVisibility(); }
function applyWidgetOrder() {
    var grid = document.getElementById('home-grid');
    if (!grid) return;
    var order = state.widgetOrder || [];
    order.forEach(function(key) {
        var card = grid.querySelector('.widget-card[data-widget="' + key + '"]');
        if (card) grid.appendChild(card);
    });
}
function renderWidgetOrderUI() {
    var box = document.getElementById('widget-order-list');
    if (!box) return;
    var names = {
        calendar:'📅 تقویم', todayChecklist:'✅ چک‌لیست', bankTotal:'🏦 مانده کل بانک',
        bankBalances:'🏦 مانده حساب‌ها', cashBalances:'💰 صندوق‌ها',
        upcomingInstallments:'⏰ اقساط ۳ روز آینده', birthdays:'🎂 تولدها',
        liveRates:'💱 نرخ لحظه‌ای ارز و طلا'
    };
    var order = state.widgetOrder || [];
    box.innerHTML = '';
    order.forEach(function(key, idx) {
        var row = document.createElement('div');
        row.className = 'widget-order-row';
        var curPage = state.widgetPages[key] || 1;
        var pageSel = '<select class="wo-page" data-widget-page="' + key + '">';
        for (var p = 1; p <= 3; p++) pageSel += '<option value="' + p + '"' + (curPage === p ? ' selected' : '') + '>صفحه ' + toFa(p) + '</option>';
        pageSel += '</select>';
        row.innerHTML = '<span class="wo-name">' + (names[key] || key) + '</span>' + pageSel +
            '<div class="wo-btns"><button class="wo-btn" data-key="' + key + '" data-dir="-1"' + (idx === 0 ? ' disabled' : '') + '>↑</button><button class="wo-btn" data-key="' + key + '" data-dir="1"' + (idx === order.length - 1 ? ' disabled' : '') + '>↓</button></div>';
        box.appendChild(row);
    });
    box.querySelectorAll('.wo-btn').forEach(function(b) {
        b.addEventListener('click', function() {
            var key = this.getAttribute('data-key');
            var dir = Number(this.getAttribute('data-dir'));
            var arr = state.widgetOrder.slice();
            var i = arr.indexOf(key);
            var j = i + dir;
            if (j < 0 || j >= arr.length) return;
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            state.widgetOrder = arr;
            DB.save('widgetOrder', arr);
            updateHomeWidgets();
            renderWidgetOrderUI();
        });
    });
    box.querySelectorAll('[data-widget-page]').forEach(function(sel) {
        sel.addEventListener('change', function() {
            var key = this.getAttribute('data-widget-page');
            state.widgetPages[key] = Number(this.value);
            DB.save('widgetPages', state.widgetPages);
            updateHomeWidgets();
        });
    });
}

/* ==================== Balance helpers ==================== */
function getBankBalance(bankId) {
    var vouchers = DB.load('vouchers', []);
    var total = 0;
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(line) {
            if (line.details && line.details.bank === bankId) {
                total += (Number(line.debit) || 0) - (Number(line.credit) || 0);
            }
        });
    });
    return total;
}
function getCashBoxBalance(cbId) {
    var vouchers = DB.load('vouchers', []);
    var total = 0;
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(line) {
            if (line.details && line.details.cashbox === cbId) {
                total += (Number(line.debit) || 0) - (Number(line.credit) || 0);
            }
        });
    });
    return total;
}
function getBirthdayInfo(birthStr) {
    if (!birthStr) return null;
    var parts = normalizeDigits(birthStr).split('/').map(Number);
    if (parts.length !== 3 || isNaN(parts[1]) || isNaN(parts[2])) return null;
    var bM = parts[1], bD = parts[2];
    if (bM < 1 || bM > 12 || bD < 1 || bD > 31) return null;
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tY = today[0], tM = today[1], tD = today[2];
    var dimThis = daysInJalaliMonth(tY, bM);
    if (bD > dimThis) return null;
    var daysThis = jalaliDiff(tY, tM, tD, tY, bM, bD);
    var birthYear;
    if (daysThis >= 0) birthYear = tY;
    else {
        birthYear = tY + 1;
        var dimN = daysInJalaliMonth(birthYear, bM);
        if (bD > dimN) return null;
    }
    var g = jalaliToGregorian(birthYear, bM, bD);
    var dt = new Date(g[0], g[1] - 1, g[2]);
    var dow = WEEKDAYS_FA[dt.getDay()];
    var daysRemaining = jalaliDiff(tY, tM, tD, birthYear, bM, bD);
    return { birthMonth: bM, birthDay: bD, dow: dow, daysRemaining: daysRemaining, birthYear: birthYear };
}

/* ==================== Bank balances widget ==================== */
function renderBankBalancesWidget() {
    var el = document.getElementById('home-bank-balances');
    if (!el) return;
    var banks = DB.load('bankAccounts', []);
    if (banks.length === 0) { el.innerHTML = '<div class="widget-empty">حساب بانکی ثبت نشده.</div>'; return; }
    banks = banks.slice().sort(function(a, b) {
        var oa = Number(a.order) || 9999, ob = Number(b.order) || 9999;
        if (oa !== ob) return oa - ob;
        return (a.bank || '').localeCompare(b.bank || '', 'fa');
    });
    var html = '', total = 0, shown = 0;
    for (var i = 0; i < banks.length; i++) {
        var b = banks[i];
        if (b.status === 'inactive' || b.active === false) continue;
        var bal = getBankBalance(b.id);
        var minBal = Number(b.minBalance) || 0;
        var deficit = bal - minBal;
        if (bal === 0 && minBal === 0) continue;
        shown++;
        total += bal;
        var cls = bal > 0 ? 'positive' : 'negative';
        var defCls = deficit < 0 ? 'negative' : 'positive';
        html += '<div class="balance-row">'
            +   '<div class="info">'
            +     '<div class="name">' + esc(b.bank || '—') + '</div>'
            +     '<div class="meta">' + (b.branchName ? esc(b.branchName) + ' — ' : '') + toFa(esc(b.account || '—')) + '</div>'
            +   '</div>'
            +   '<div class="amounts-grid">'
            +     '<div class="amt-cell"><span class="amt-lbl">مانده</span><span class="amount ' + cls + '">' + moneyHtml(bal) + ' ' + currencyLabel() + '</span></div>'
            +     '<div class="amt-cell"><span class="amt-lbl">حداقل</span><span class="amount">' + (minBal ? moneyHtml(minBal) : '—') + '</span></div>'
            +     '<div class="amt-cell"><span class="amt-lbl">کسری</span><span class="amount ' + defCls + '">' + (minBal ? moneyHtml(deficit) : '—') + '</span></div>'
            +   '</div>'
            + '</div>';
    }
    if (shown === 0) { el.innerHTML = '<div class="widget-empty">حساب با مانده غیرصفر نیست.</div>'; return; }
    html += '<div class="balance-row balance-total"><div class="info"><div class="name">💰 جمع کل</div></div><div class="amount">' + moneyHtml(total) + ' ' + currencyLabel() + '</div></div>';
    el.innerHTML = html;
}

/* ==================== Cash balances widget ==================== */
function renderCashBalancesWidget() {
    var el = document.getElementById('home-cash-balances');
    if (!el) return;
    var cbs = DB.load('cashBoxes', []);
    if (cbs.length === 0) { el.innerHTML = '<div class="widget-empty">صندوقی نیست.</div>'; return; }
    cbs = cbs.slice().sort(function(a, b) {
        var oa = Number(a.order) || 9999, ob = Number(b.order) || 9999;
        if (oa !== ob) return oa - ob;
        return (a.title || '').localeCompare(b.title || '', 'fa');
    });
    var html = '', total = 0, shown = 0;
    for (var i = 0; i < cbs.length; i++) {
        var c = cbs[i];
        if (c.status === 'inactive' || c.active === false) continue;
        var bal = getCashBoxBalance(c.id);
        if (bal === 0) continue;
        shown++;
        total += bal;
        var cls = bal > 0 ? 'positive' : 'negative';
        html += '<div class="balance-row"><div class="info"><div class="name">' + esc(c.title || '—') + '</div><div class="meta">' + esc(c.type || '—') + (c.unit ? ' — ' + esc(c.unit) : '') + '</div></div><div class="amount ' + cls + '">' + moneyHtml(bal) + ' ' + currencyLabel() + '</div></div>';
    }
    if (shown === 0) { el.innerHTML = '<div class="widget-empty">صندوق با مانده غیرصفر نیست.</div>'; return; }
    html += '<div class="balance-row balance-total"><div class="info"><div class="name">💰 جمع کل</div></div><div class="amount">' + moneyHtml(total) + ' ' + currencyLabel() + '</div></div>';
    el.innerHTML = html;
}

/* ==================== Birthdays widget ==================== */
function renderBirthdaysWidget() {
    var el = document.getElementById('home-birthdays');
    if (!el) return;
    var persons = DB.load('persons', []);
    var items = [];
    for (var i = 0; i < persons.length; i++) {
        var p = persons[i];
        if (!p.birth) continue;
        var info = getBirthdayInfo(p.birth);
        if (!info) continue;
        items.push({ person: p, info: info });
    }
    if (items.length === 0) { el.innerHTML = '<div class="widget-empty">تاریخ تولدی نیست.</div>'; return; }
    items.sort(function(a, b) { return a.info.daysRemaining - b.info.daysRemaining; });
    var html = '';
    for (var k = 0; k < items.length; k++) {
        var it = items[k];
        var p2 = it.person;
        var info2 = it.info;
        var dl, dc = '';
        if (info2.daysRemaining === 0) { dl = '🎉 امروز'; dc = 'today'; }
        else if (info2.daysRemaining === 1) { dl = 'فردا'; dc = 'soon'; }
        else if (info2.daysRemaining <= 7) { dl = toFa(info2.daysRemaining) + ' روز دیگر'; dc = 'soon'; }
        else { dl = toFa(info2.daysRemaining) + ' روز'; }
        var ds = toFa(pad2(info2.birthMonth)) + '/' + toFa(pad2(info2.birthDay));
        html += '<div class="birthday-row"><div class="name">' + esc(p2.first || '') + ' ' + esc(p2.last || '') + '</div><div>' + ds + '</div><div class="dow">' + info2.dow + '</div><div class="days ' + dc + '">' + dl + '</div></div>';
    }
    el.innerHTML = html;
}

/* ==================== Bank total widget ==================== */
function updateHomeBankTotal() {
    var el = document.getElementById('home-bank-total');
    if (!el) return;
    var banks = DB.load('bankAccounts', []);
    var total = 0;
    for (var i = 0; i < banks.length; i++) {
        var b = banks[i];
        if (b.status === 'inactive' || b.active === false) continue;
        total += getBankBalance(b.id);
    }
    el.innerHTML = moneyHtml(total) + ' ' + currencyLabel();
}

/* ==================== Upcoming installments widget ==================== */
function updateHomeUpcomingInstallments() {
    var el = document.getElementById('home-upcoming-installments');
    if (!el) return;
    var totalEl = document.getElementById('home-upcoming-total');
    var totalAmountEl = document.getElementById('home-upcoming-total-amount');
    var facilities = DB.load('facilities', []);
    var banks = DB.load('bankAccounts', []);
    var bankMap = {};
    banks.forEach(function(b) { bankMap[b.id] = b; });
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tY = today[0], tM = today[1], tD = today[2];
    var upcoming = [];
    var totalAmount = 0;
    facilities.forEach(function(f) {
        if (f.status === 'settled' || f.status === 'inactive') return;
        var ins = f.installments || [];
        var lastDate = '';
        var lastAmt = 0;
        if (ins.length > 0) {
            var sorted = ins.slice().sort(function(a, b) { return compareVals(a.date, b.date); });
            lastDate = sorted[sorted.length - 1].date || '';
            lastAmt = Number(sorted[sorted.length - 1].amount) || 0;
        }
        var bankBal = f.bankId ? getBankBalance(f.bankId) : 0;
        var bankName = f.bankId && bankMap[f.bankId] ? bankMap[f.bankId].bank : '';
        ins.forEach(function(inst) {
            if (inst.status === 'paid') return;
            if (!inst.date) return;
            var p = inst.date.split('/').map(Number);
            if (p.length !== 3) return;
            var diff = jalaliDiff(tY, tM, tD, p[0], p[1], p[2]);
            if (diff >= 0 && diff <= 3) {
                upcoming.push({
                    facility: f, date: inst.date, amount: inst.amount, diff: diff,
                    lastDate: lastDate, lastAmt: lastAmt,
                    bankName: bankName, bankBal: bankBal
                });
                totalAmount += Number(inst.amount) || 0;
            }
        });
    });
    if (upcoming.length === 0) {
        el.innerHTML = '<div class="widget-empty">قسطی نیست.</div>';
        if (totalEl) totalEl.classList.add('hidden');
        return;
    }
    upcoming.sort(function(a, b) { return a.diff - b.diff; });
    var html = '';
    upcoming.forEach(function(u) {
        var dl = u.diff === 0 ? 'امروز' : (u.diff === 1 ? 'فردا' : toFa(u.diff) + ' روز دیگر');
        html += '<div class="balance-row inst-row">'
            +   '<div class="info">'
            +     '<div class="name">' + esc(u.facility.name) + '</div>'
            +     '<div class="meta">' + dl + ' — ' + toFa(esc(u.date)) + '</div>'
            +     '<div class="meta extra">'
            +       (u.lastDate ? '🔚 آخرین قسط: ' + toFa(u.lastDate) + ' (' + moneyHtml(u.lastAmt) + ')' : '')
            +       (u.bankName ? ' | 🏦 ' + esc(u.bankName) + ': ' + moneyHtml(u.bankBal) : '')
            +     '</div>'
            +   '</div>'
            +   '<div class="amount">' + moneyHtml(u.amount || 0) + '</div>'
            + '</div>';
    });
    el.innerHTML = html;
    if (totalEl && totalAmountEl) {
        totalEl.classList.remove('hidden');
        totalAmountEl.innerHTML = moneyHtml(totalAmount) + ' ' + currencyLabel();
    }
}

/* ==================== Calendar widget ==================== */
/* ★ اصلاح‌شده طبق درخواست ۴: حذف نوار مادِل */
function renderCalendarWidget() {
    var el = document.getElementById('home-cal-widget');
    if (!el) return;
    var now = new Date();
    var todayJ = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    var jsDay = now.getDay();
    var offsetFromSat = (jsDay + 1) % 7;
    var satDate = new Date(now);
    satDate.setDate(satDate.getDate() - offsetFromSat);
    var daysEn = ['SAT','SUN','MON','TUE','WED','THU','FRI'];
    var html = '<div class="cal-week-grid">';
    for (var i = 0; i < 7; i++) {
        var d = new Date(satDate);
        d.setDate(satDate.getDate() + i);
        var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        var isToday = (j[0] === todayJ[0] && j[1] === todayJ[1] && j[2] === todayJ[2]);
        var isHoliday = (d.getDay() === 5);
        var cls = 'cal-week-day' + (isToday ? ' today' : '') + (isHoliday ? ' holiday' : '');
        html += '<div class="' + cls + '">';
        html += '<div class="cwd-name-en">' + daysEn[i] + '</div>';
        html += '<div class="cwd-circle">' + toFa(j[2]) + '</div>';
        html += '<div class="cwd-square">' + d.getDate() + '</div>';
        html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
}

/* ==================== Checklist widget ==================== */
function renderTodayChecklistWidget() {
    var el = document.getElementById('home-today-checklist');
    if (!el) return;
    var today = todayJalaliStr();
    var notes = DB.load('notes', []);
    var allItems = [];
    notes.forEach(function(n) {
        if (n.archived) return;
        (n.checklist || []).forEach(function(c) {
            if (!c.text) return;
            allItems.push({ note: n, item: c });
        });
    });
    var filtered = allItems.filter(function(x) {
        if (x.note.date === today) return true;
        return !x.item.done;
    });
    if (filtered.length === 0) {
        el.innerHTML = '<div class="widget-empty">✅ چک‌لیستی برای نمایش نیست.</div>';
        return;
    }
    filtered.sort(function(a, b) {
        var aT = a.note.date === today ? 0 : 1;
        var bT = b.note.date === today ? 0 : 1;
        if (aT !== bT) return aT - bT;
        return compareVals(b.note.date || '', a.note.date || '');
    });
    var html = '';
    filtered.forEach(function(x) {
        var dateLabel = toFa(esc(x.note.date || ''));
        html += '<div class="cl-widget-item' + (x.item.done ? ' done' : '') + '" data-note-id="' + x.note.id + '" data-item-id="' + x.item.id + '" title="کلیک برای باز کردن یادداشت">' +
            '<input type="checkbox" ' + (x.item.done ? 'checked' : '') + '>' +
            '<span class="cl-widget-text">' + esc(x.item.text) + '</span>' +
            '<span class="cl-widget-note">📅 ' + dateLabel + '</span>' +
            '</div>';
    });
    el.innerHTML = html;
    el.querySelectorAll('.cl-widget-item').forEach(function(row) {
        var cb = row.querySelector('input[type=checkbox]');
        cb.addEventListener('click', function(e) {
            e.stopPropagation();
            var noteId = row.getAttribute('data-note-id');
            var itemId = row.getAttribute('data-item-id');
            var notes = DB.load('notes', []);
            for (var i = 0; i < notes.length; i++) {
                if (notes[i].id === noteId) {
                    for (var j = 0; j < (notes[i].checklist || []).length; j++) {
                        if (notes[i].checklist[j].id === itemId) {
                            notes[i].checklist[j].done = !notes[i].checklist[j].done;
                            break;
                        }
                    }
                }
            }
            DB.save('notes', notes);
            renderTodayChecklistWidget();
        });
        row.addEventListener('click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            var noteId = row.getAttribute('data-note-id');
            if (noteId && typeof openNoteView === 'function') openNoteView(noteId);
        });
    });
}

/* ==================== Update all home widgets ==================== */
function updateHomeWidgets() {
    applyWidgetOrder();
    applyWidgetVisibility();
    if (state.widgets.calendar) renderCalendarWidget();
    if (state.widgets.todayChecklist) renderTodayChecklistWidget();
    if (state.widgets.bankTotal) updateHomeBankTotal();
    if (state.widgets.bankBalances) renderBankBalancesWidget();
    if (state.widgets.cashBalances) renderCashBalancesWidget();
    if (state.widgets.upcomingInstallments) updateHomeUpcomingInstallments();
    if (state.widgets.birthdays) renderBirthdaysWidget();
    if (state.widgets.liveRates) renderLiveRatesWidget();
    if (typeof window.updateSmsBadge === 'function') window.updateSmsBadge();
    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 100);
}

/* =====================================================================
   ============ بخش B: نرخ لحظه‌ای و قیمت پایانی ============
   ===================================================================== */
var RATE_ASSETS = [
    { key: 'price_dollar_rl', label: '💵 دلار آمریکا',         priceto: 'usd',          navasanKey: 'usd',          source: 'fiat', navasanMul: 10 },
    { key: 'geram18',         label: '🥇 طلای ۱۸ عیار (گرم)',  priceto: 'gold-18',      navasanKey: '18ayar',       source: 'gold', navasanMul: 10 },
    { key: 'geram24',         label: '🥇 طلای ۲۴ عیار (گرم)',  priceto: 'gold-24',      navasanKey: '24ayar',       source: 'gold', navasanMul: 10 },
    { key: 'gold_mini_size',  label: '🥇 طلای دسته دوم (گرم)', priceto: 'gold-meskal',  navasanKey: 'bub_18ayar',   source: 'gold', navasanMul: 10 },
    { key: 'sekke_emami',     label: '🪙 سکه امامی',          priceto: 'coin-emami',   navasanKey: 'sekkeh',       source: 'gold', navasanMul: 10 },
    { key: 'sekke_bahar',     label: '🪙 سکه بهار آزادی',     priceto: 'coin-bahar',   navasanKey: 'bahar',        source: 'gold', navasanMul: 10 },
    { key: 'nim_sekke',       label: '🪙 نیم سکه',            priceto: 'coin-nim',     navasanKey: 'nim',          source: 'gold', navasanMul: 10 },
    { key: 'rob_sekke',       label: '🪙 ربع سکه',            priceto: 'coin-rob',     navasanKey: 'rob',          source: 'gold', navasanMul: 10 }
];
var PRICETO_BASE = 'https://api.priceto.day/v1/latest/irr';
var NAVASAN_GOLD_CDN = 'https://cdn.jsdelivr.net/gh/HosseinOdd/Navasan-API@main/data/gold.json';
var NAVASAN_FIAT_CDN = 'https://cdn.jsdelivr.net/gh/HosseinOdd/Navasan-API@main/data/fiat.json';
var CORS_PROXIES = [
    function(u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
    function(u) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u); },
    function(u) { return 'https://corsproxy.io/?' + encodeURIComponent(u); }
];
var LIVE_RATES_CACHE = DB.load('liveRatesCache', { values: {}, ts: 0, prev: {}, timestamps: {}, lastUpdate: '' });

function fetchWithTimeout(url, opts, ms) {
    return new Promise(function(resolve, reject) {
        var controller = new AbortController();
        var timer = setTimeout(function() {
            try { controller.abort(); } catch(e) {}
            reject(new Error('timeout'));
        }, ms || 8000);
        fetch(url, Object.assign({}, opts || {}, { signal: controller.signal, cache: 'no-store' }))
            .then(function(r) { clearTimeout(timer); resolve(r); })
            .catch(function(e) { clearTimeout(timer); reject(e); });
    });
}
async function tryFetchJson(url, ms) {
    try {
        var res = await fetchWithTimeout(url, { method: 'GET', headers: { 'Accept': 'application/json, text/plain, */*' } }, ms || 8000);
        if (!res.ok) return null;
        var text = await res.text();
        if (!text) return null;
        try { return JSON.parse(text); } catch(e) { return null; }
    } catch(e) { return null; }
}
async function tryFetchJsonWithFallback(url, ms) {
    var data = await tryFetchJson(url, ms);
    if (data) return data;
    for (var i = 0; i < CORS_PROXIES.length; i++) {
        try {
            var proxyUrl = CORS_PROXIES[i](url);
            data = await tryFetchJson(proxyUrl, (ms || 8000) + 3000);
            if (data) return data;
        } catch(e) {}
    }
    return null;
}
async function fetchFromPriceto(symbol) {
    if (!symbol) return { value: 0, ts: 0 };
    var url = PRICETO_BASE + '/' + symbol;
    var data = await tryFetchJsonWithFallback(url, 7000);
    if (!data) return { value: 0, ts: 0 };
    var v = 0;
    if (typeof data === 'number') v = data;
    else v = Number(data.rate || data.price || data.value || (data.data && (data.data.rate || data.data.price)) || 0);
    if (!isFinite(v) || v <= 0) return { value: 0, ts: 0 };
    return { value: v, ts: data.timestamp || data.ts || (data.data && data.data.timestamp) || 0 };
}
function parseNavasanItem(data, assetKey, multiplier) {
    if (!data || typeof data !== 'object') return { value: 0, ts: 0 };
    var item = data[assetKey];
    if (!item) return { value: 0, ts: 0 };
    var val = item.value || item.price || item.p || item.last || 0;
    var v = Number(String(val).replace(/[,\s]/g, ''));
    if (!isFinite(v) || v <= 0) return { value: 0, ts: 0 };
    if (multiplier && multiplier !== 1) v = v * multiplier;
    return { value: v, ts: item.date || item.timestamp || item.last_update || 0 };
}
async function fetchAllRates() {
    var results = {};
    var pending = RATE_ASSETS.map(function(a) { return { asset: a, done: false, value: 0, ts: 0 }; });
    await Promise.all(pending.map(function(p) {
        return fetchFromPriceto(p.asset.priceto).then(function(r) {
            if (r.value > 0) { p.done = true; p.value = r.value; p.ts = r.ts; }
        });
    }));
    var stillNeed = pending.filter(function(p) { return !p.done; });
    if (stillNeed.length > 0) {
        var goldData = null, fiatData = null;
        try { goldData = await tryFetchJson(NAVASAN_GOLD_CDN, 9000); } catch(e) {}
        try { fiatData = await tryFetchJson(NAVASAN_FIAT_CDN, 9000); } catch(e) {}
        stillNeed.forEach(function(p) {
            var a = p.asset;
            var parsed = { value: 0, ts: 0 };
            if (a.source === 'gold' && goldData) parsed = parseNavasanItem(goldData, a.navasanKey, a.navasanMul);
            else if (a.source === 'fiat' && fiatData) parsed = parseNavasanItem(fiatData, a.navasanKey, a.navasanMul);
            if (parsed.value > 0) { p.done = true; p.value = parsed.value; p.ts = parsed.ts; }
        });
    }
    pending.forEach(function(p) { results[p.asset.key] = { value: p.value || 0, ts: p.ts || 0 }; });
    return results;
}
async function fetchLiveRates(silent) {
    var box = document.getElementById('home-live-rates');
    var meta = document.getElementById('live-rates-meta');
    if (box && !silent) box.innerHTML = '<div class="widget-empty">در حال دریافت نرخ‌ها...</div>';
    var newResults = {};
    try { newResults = await fetchAllRates(); } catch(e) { newResults = {}; }
    var anyFetched = false;
    var newValues = {}, newTimestamps = {};
    var prev = LIVE_RATES_CACHE.values || {};
    var prevTs = LIVE_RATES_CACHE.timestamps || {};
    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var key = RATE_ASSETS[i].key;
        var res = newResults[key] || { value: 0, ts: 0 };
        var val = res.value || 0;
        var ts = res.ts || 0;
        if (val > 0) { newValues[key] = val; newTimestamps[key] = ts; anyFetched = true; }
        else { newValues[key] = prev[key] || 0; newTimestamps[key] = prevTs[key] || 0; }
    }
    var hasAnyValue = false;
    for (var k in newValues) if (newValues[k] > 0) { hasAnyValue = true; break; }
    if (!hasAnyValue && !LIVE_RATES_CACHE.ts) {
        if (box) box.innerHTML = '<div class="widget-empty">❌ دریافت نرخ ناموفق بود.<br>اتصال اینترنت را بررسی کرده و روی 🔄 بزنید.</div>';
        if (meta) meta.textContent = 'برای تلاش مجدد روی 🔄 بزنید.';
        return;
    }
    var lastUpdate = '';
    if (anyFetched) lastUpdate = todayJalaliStr() + ' — ' + tsToJalaliTime(Date.now());
    else lastUpdate = LIVE_RATES_CACHE.lastUpdate || '—';
    LIVE_RATES_CACHE = {
        values: newValues,
        timestamps: newTimestamps,
        ts: anyFetched ? Date.now() : LIVE_RATES_CACHE.ts,
        prev: JSON.parse(JSON.stringify(prev)),
        lastUpdate: lastUpdate
    };
    DB.save('liveRatesCache', LIVE_RATES_CACHE);
    renderLiveRatesWidget();
    if (meta) meta.textContent = (anyFetched ? '✅ بروزرسانی: ' : '⚠️ آخرین داده ذخیره‌شده: ') + lastUpdate + ' — منبع: Priceto + Navasan';
}
function renderLiveRatesWidget() {
    var box = document.getElementById('home-live-rates');
    if (!box) return;
    var c = LIVE_RATES_CACHE;
    if (!c.ts || !c.values) { box.innerHTML = '<div class="widget-empty">داده‌ای موجود نیست.</div>'; return; }
    var html = '';
    var prev = c.prev || {};
    var anyShown = false;
    var hide = getHideState('widgets');
    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var a = RATE_ASSETS[i];
        var val = c.values[a.key] || 0;
        if (val <= 0) continue;
        anyShown = true;
        var oldV = prev[a.key] || 0;
        var chg = val - oldV;
        var chgCls = chg > 0 ? 'up' : (chg < 0 ? 'down' : 'same');
        var chgTxt = chg === 0 ? '—' : (chg > 0 ? '▲ ' : '▼ ') + (hide ? '—' : formatRial(Math.abs(chg)));
        var itemTs = (c.timestamps && c.timestamps[a.key]) ? c.timestamps[a.key] : 0;
        var tsDisplay = '';
        if (itemTs > 0) {
            var tsMs = itemTs < 1e12 ? itemTs * 1000 : itemTs;
            tsDisplay = '🕐 ' + toFa(tsToJalaliDate(tsMs)) + ' ' + toFa(tsToJalaliTime(tsMs));
        }
        html += '<div class="rate-row">' +
            '<span class="name">' + a.label + '</span>' +
            '<span class="amount">' + (hide ? '—' : formatRial(val)) + ' ریال</span>' +
            '<span class="rate-chg ' + chgCls + '">' + chgTxt + '</span>' +
            '<span class="rate-updated">' + tsDisplay + '</span>' +
            '</div>';
    }
    if (!anyShown) { box.innerHTML = '<div class="widget-empty">داده‌ای موجود نیست. روی 🔄 بزنید.</div>'; return; }
    box.innerHTML = html;
}

/* ==================== Daily Close ==================== */
var DAILY_CLOSE_KEY = 'dailyClosePrices';
function getDailyCloseData() { return DB.load(DAILY_CLOSE_KEY, []); }
function saveDailyCloseData(list) { DB.save(DAILY_CLOSE_KEY, list); }
async function fetchDailyClosePrices() {
    var today = todayJalaliStr();
    var cached = getDailyCloseData().find(function(x) { return x.date === today; });
    if (cached) return cached;
    var values = {};
    try {
        var results = await fetchAllRates();
        for (var i = 0; i < RATE_ASSETS.length; i++) {
            var key = RATE_ASSETS[i].key;
            values[key] = (results[key] && results[key].value) || (LIVE_RATES_CACHE.values && LIVE_RATES_CACHE.values[key]) || 0;
        }
    } catch(e) {
        for (var j = 0; j < RATE_ASSETS.length; j++) {
            values[RATE_ASSETS[j].key] = (LIVE_RATES_CACHE.values && LIVE_RATES_CACHE.values[RATE_ASSETS[j].key]) || 0;
        }
    }
    return { date: today, values: values, savedAt: Date.now() };
}
async function renderDailyClosePage() {
    var today = todayJalaliStr();
    document.getElementById('dc-date').value = today;
    var data = await fetchDailyClosePrices();
    var box = document.getElementById('dc-result');
    if (!box) return;
    var existing = getDailyCloseData().find(function(x) { return x.date === data.date; });
    var values = existing ? existing.values : data.values;
    var hide = getHideState('dc');
    var html = '';
    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var a = RATE_ASSETS[i];
        var val = values[a.key] || 0;
        html += '<div class="close-price-row"><span class="cp-name">' + a.label + '</span>' +
            '<input type="text" class="money-input" inputmode="numeric" dir="ltr" value="' + (hide && val ? '' : (val ? formatRaw(val) : '')) + '" data-dc-key="' + a.key + '" style="width:150px;text-align:center;padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.85rem;">' +
            '</div>';
    }
    html += '<div class="form-buttons" style="margin-top:14px;justify-content:center"><button id="dc-save-btn" class="btn-primary">💾 ذخیره قیمت‌های پایانی (ریال)</button></div>';
    box.innerHTML = html;
    document.getElementById('dc-count').textContent = toFa(RATE_ASSETS.length) + ' قلم';
    document.getElementById('dc-unit').textContent = 'واحد: ریال';
    var inputs = box.querySelectorAll('[data-dc-key]');
    for (var k = 0; k < inputs.length; k++) {
        (function(inp) {
            inp.addEventListener('input', function() {
                var v = normalizeDigits(this.value);
                var r = v.replace(/[^\d]/g, '');
                this.value = r;
            });
            inp.addEventListener('blur', function() {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
            });
        })(inputs[k]);
    }
    document.getElementById('dc-save-btn').addEventListener('click', saveDailyClosePrices);
    renderDailyCloseHistory();
    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}
function saveDailyClosePrices() {
    var dateInput = document.getElementById('dc-date');
    var date = normalizeDigits(dateInput.value.trim());
    if (!date) { alert('تاریخ اجباری است.'); return; }
    var values = {};
    var inputs = document.querySelectorAll('#dc-result [data-dc-key]');
    for (var i = 0; i < inputs.length; i++) {
        var key = inputs[i].getAttribute('data-dc-key');
        var raw = normalizeDigits(inputs[i].value).replace(/[^\d]/g, '');
        values[key] = Number(raw) || 0;
    }
    var list = getDailyCloseData();
    var idx = list.findIndex(function(x) { return x.date === date; });
    var entry = { date: date, values: values, savedAt: Date.now() };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    list.sort(function(a, b) { return b.date.localeCompare(a.date); });
    saveDailyCloseData(list);
    showToast('✅ قیمت‌های پایانی ' + toFa(date) + ' ذخیره شد.');
    renderDailyCloseHistory();
}
function renderDailyCloseHistory() {
    var box = document.getElementById('dc-history-list');
    if (!box) return;
    var list = getDailyCloseData();
    var hide = getHideState('dc');
    if (list.length === 0) {
        box.innerHTML = '<div class="widget-empty">هنوز قیمتی ذخیره نشده است.</div>';
        return;
    }
    var html = '<div class="table-wrap"><table class="data-table" id="dc-table"><thead><tr><th>تاریخ</th>';
    for (var i = 0; i < RATE_ASSETS.length; i++) html += '<th>' + RATE_ASSETS[i].label.replace(/^[^\s]+\s/, '') + '</th>';
    html += '<th>عملیات</th></tr></thead><tbody>';
    for (var j = 0; j < list.length; j++) {
        var row = list[j];
        html += '<tr><td dir="ltr">' + toFa(esc(row.date)) + '</td>';
        for (var k = 0; k < RATE_ASSETS.length; k++) {
            var v = (row.values && row.values[RATE_ASSETS[k].key]) || 0;
            html += '<td class="num">' + (v && !hide ? formatRial(v) : '—') + '</td>';
        }
        html += '<td><div class="row-actions"><button class="row-btn edit" data-dc-edit="' + row.date + '">✎</button><button class="row-btn del" data-dc-del="' + row.date + '">×</button></div></td></tr>';
    }
    html += '</tbody></table></div>';
    box.innerHTML = html;
    var editBtns = box.querySelectorAll('[data-dc-edit]');
    for (var e = 0; e < editBtns.length; e++) editBtns[e].addEventListener('click', function() {
        var date = this.getAttribute('data-dc-edit');
        var entry = getDailyCloseData().find(function(x) { return x.date === date; });
        if (!entry) return;
        document.getElementById('dc-date').value = entry.date;
        var inputs = document.querySelectorAll('#dc-result [data-dc-key]');
        for (var ii = 0; ii < inputs.length; ii++) {
            var key = inputs[ii].getAttribute('data-dc-key');
            var v = entry.values[key] || 0;
            inputs[ii].value = v ? formatRaw(v) : '';
        }
        showToast('📝 ویرایش کنید و ذخیره کنید.');
    });
    var delBtns = box.querySelectorAll('[data-dc-del]');
    for (var d = 0; d < delBtns.length; d++) delBtns[d].addEventListener('click', function() {
        var date = this.getAttribute('data-dc-del');
        if (!confirm('حذف قیمت‌های پایانی ' + toFa(date) + '؟')) return;
        var newList = getDailyCloseData().filter(function(x) { return x.date !== date; });
        saveDailyCloseData(newList);
        renderDailyCloseHistory();
        showToast('🗑 حذف شد.');
    });
    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}
async function runRatesReport() {
    var asset = document.getElementById('rr-asset').value;
    var range = document.getElementById('rr-range').value;
    var box = document.getElementById('rr-result');
    var hide = getHideState('rr');
    var days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    var allData = getDailyCloseData();
    if (allData.length === 0) {
        box.innerHTML = '<div class="widget-empty">در حال دریافت داده اولیه...</div>';
        var live = await fetchAllRates();
        var todayStr = todayJalaliStr();
        var firstValues = {};
        for (var i = 0; i < RATE_ASSETS.length; i++) {
            var k = RATE_ASSETS[i].key;
            firstValues[k] = (live[k] && live[k].value) || 0;
        }
        var newList = [{ date: todayStr, values: firstValues, savedAt: Date.now() }];
        saveDailyCloseData(newList);
        allData = newList;
    }
    var cutoffTs = Date.now() - days * 24 * 60 * 60 * 1000;
    var points = allData.filter(function(x) {
        var parts = x.date.split('/').map(Number);
        if (parts.length !== 3) return false;
        var g = jalaliToGregorian(parts[0], parts[1], parts[2]);
        var ts = new Date(g[0], g[1] - 1, g[2]).getTime();
        return ts >= cutoffTs;
    });
    points.sort(function(a, b) { return a.date.localeCompare(b.date); });
    if (points.length === 0) {
        box.innerHTML = '<div class="widget-empty">داده‌ای در این بازه وجود ندارد.</div>';
        document.getElementById('rr-count').textContent = '۰';
        return;
    }
    var html = '<div class="table-wrap"><table class="report-table" id="rr-table"><thead><tr><th>#</th><th>تاریخ</th><th>قیمت (ریال)</th><th>تغییر</th><th>درصد</th></tr></thead><tbody>';
    var prev = null;
    for (var j = 0; j < points.length; j++) {
        var p = points[j];
        var price = (p.values && p.values[asset]) || 0;
        var change = prev !== null ? price - prev : 0;
        var pct = prev ? (change / prev * 100) : 0;
        var chgCls = change > 0 ? 'cr' : (change < 0 ? 'dr' : '');
        var sign = change > 0 ? '+' : '';
        html += '<tr><td class="num">' + toFa(j + 1) + '</td><td dir="ltr">' + toFa(esc(p.date)) + '</td><td class="num" style="font-weight:bold">' + (hide ? '—' : formatRial(price)) + '</td><td class="num ' + chgCls + '">' + (!hide && prev !== null ? sign + formatRial(change) : '—') + '</td><td class="num ' + chgCls + '">' + (!hide && prev !== null ? sign + toFa(Math.abs(pct).toFixed(2)) + '٪' : '—') + '</td></tr>';
        prev = price;
    }
    html += '</tbody></table></div>';
    box.innerHTML = html;
    document.getElementById('rr-count').textContent = toFa(points.length) + ' ردیف';
    var unitEl = document.getElementById('rr-unit');
    if (unitEl) unitEl.textContent = 'واحد: ریال';
    if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
}

/* =====================================================================
   ============ بخش C: داشبورد (قابل تنظیم) ============
   ===================================================================== */
var CHART_COLORS = ['#4a90e2','#22a06b','#e8a33d','#e5484d','#8b5cf6','#06b6d4','#f59e0b','#ec4899','#14b8a6','#f97316'];
function getLastNMonths(n) {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var y = j[0], m = j[1];
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
        var cm = m - i, cy = y;
        while (cm < 1) { cm += 12; cy--; }
        out.push({ year: cy, month: cm, label: getJalaliMonthName(cm) + ' ' + String(cy).slice(-2) });
    }
    return out;
}

/* ★ افزودن کارت خلاصه گردش وجه نقد */
if (typeof state.dashboards === 'undefined') {
    state.dashboards = DB.load('dashboards', {
        cashLiquidity: true, expenseDonut: true, assetDonut: true, trendBar: true,
        topExpenses: true, lastVouchers: true, overdueInstallments: true,
        negativeBanks: true, topPersons: true, cashflowSummary: true
    });
    DB.save('dashboards', state.dashboards);
} else if (typeof state.dashboards.cashflowSummary === 'undefined') {
    state.dashboards.cashflowSummary = true;
    DB.save('dashboards', state.dashboards);
}
if (typeof state.dashboardOrder === 'undefined') {
    var defOrder = ['cashLiquidity','expenseDonut','assetDonut','trendBar','topExpenses','lastVouchers','overdueInstallments','negativeBanks','topPersons','cashflowSummary'];
    var ord = DB.load('dashboardOrder', defOrder);
    defOrder.forEach(function(k) { if (ord.indexOf(k) === -1) ord.push(k); });
    state.dashboardOrder = ord;
    DB.save('dashboardOrder', state.dashboardOrder);
} else if (state.dashboardOrder.indexOf('cashflowSummary') === -1) {
    state.dashboardOrder.push('cashflowSummary');
    DB.save('dashboardOrder', state.dashboardOrder);
}

function getDashboardCard(key) {
    var cards = {
        cashLiquidity: '<div class="card dash-card" data-dash-key="cashLiquidity"><h3>💧 نمودار نقدینگی</h3><div id="dash-cash-liquidity"></div></div>',
        expenseDonut: '<div class="card dash-card" data-dash-key="expenseDonut"><h3>🥧 ترکیب هزینه‌ها</h3><div id="dash-expense-donut"></div></div>',
        assetDonut: '<div class="card dash-card" data-dash-key="assetDonut"><h3>🏦 ترکیب دارایی‌ها</h3><div id="dash-asset-donut"></div></div>',
        trendBar: '<div class="card dash-card dash-wide" data-dash-key="trendBar"><h3>📊 روند درآمد و هزینه ۶ ماه اخیر</h3><div id="dash-trend"></div></div>',
        topExpenses: '<div class="card dash-card" data-dash-key="topExpenses"><h3>🏆 بیشترین هزینه‌ها (Top 10)</h3><div id="dash-top-exp"></div></div>',
        lastVouchers: '<div class="card dash-card" data-dash-key="lastVouchers"><h3>📄 ۱۰ سند آخر</h3><div id="dash-last-vouchers"></div></div>',
        overdueInstallments: '<div class="card dash-card" data-dash-key="overdueInstallments"><h3>⏰ اقساط سررسید گذشته</h3><div id="dash-overdue-inst"></div></div>',
        negativeBanks: '<div class="card dash-card" data-dash-key="negativeBanks"><h3>🔴 بانک‌های با کسری</h3><div id="dash-neg-banks"></div></div>',
        topPersons: '<div class="card dash-card" data-dash-key="topPersons"><h3>👥 پرتراکنش‌ترین اشخاص</h3><div id="dash-top-persons"></div></div>',
        cashflowSummary: '<div class="card dash-card dash-wide" data-dash-key="cashflowSummary"><h3>💸 خلاصه عوامل گردش وجه نقد (سال جاری)</h3><div id="dash-cf-summary"></div></div>'
    };
    return cards[key] || '';
}
function renderDashboard() {
    var page = document.getElementById('page-dashboard');
    if (!page) return;
    if (!document.getElementById('dash-grid-container')) {
        var oldDash = page.querySelector('.dash-grid');
        if (oldDash) oldDash.style.display = 'none';
        var oldCards = page.querySelectorAll('.card');
        oldCards.forEach(function(c) {
            if (c.querySelector('#dash-trend') || c.querySelector('#dash-top-exp')) c.style.display = 'none';
        });
        var grid0 = document.createElement('div');
        grid0.id = 'dash-grid-container';
        grid0.className = 'dash-cards-grid';
        page.appendChild(grid0);
    }
    var grid = document.getElementById('dash-grid-container');
    var order = state.dashboardOrder || [];
    grid.querySelectorAll('.dash-card').forEach(function(c) {
        var k = c.getAttribute('data-dash-key');
        if (!state.dashboards[k]) c.remove();
    });
    order.forEach(function(key) {
        if (!state.dashboards[key]) return;
        var card = grid.querySelector('[data-dash-key="' + key + '"]');
        if (!card) {
            var html = getDashboardCard(key);
            if (html) {
                var tmp = document.createElement('div');
                tmp.innerHTML = html;
                card = tmp.firstElementChild;
                grid.appendChild(card);
            }
        }
        if (card) grid.appendChild(card);
    });
    renderDashboardContents();
    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 100);
}
function renderDashboardContents() {
    var accounts = DB.load('accounts', []);
    var vouchers = DB.load('vouchers', []).filter(function(v) { return v.status === 'approved'; });
    var banks = DB.load('bankAccounts', []);
    var cashBoxes = DB.load('cashBoxes', []);
    var pr = getPeriodMonthRange();
    var totalBank = 0;
    banks.forEach(function(b) { totalBank += getBankBalance(b.id); });
    var totalCash = 0;
    cashBoxes.forEach(function(c) { totalCash += getCashBoxBalance(c.id); });
    var liquidity = totalBank + totalCash;
    var hide = getHideState('dashboard');

    var liqEl = document.getElementById('dash-liquidity');
    if (liqEl) liqEl.innerHTML = (hide ? '—' : moneyHtml(liquidity)) + ' ' + currencyLabel();
    var liqSubEl = document.getElementById('dash-liquidity-sub');
    if (liqSubEl) liqSubEl.innerHTML = 'بانک: ' + (hide ? '—' : moneyHtml(totalBank)) + ' | صندوق: ' + (hide ? '—' : moneyHtml(totalCash));

    var monthVouchers = vouchers.filter(function(v) { return v.date >= pr.from && v.date <= pr.to; });
    var incomeAmt = 0, expenseAmt = 0;
    monthVouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account) return;
            var rootId = getRootAccountId(l.account, accounts);
            var root = accounts.find(function(a) { return a.id === rootId; });
            if (!root) return;
            var codeRoot = String(root.code || '').charAt(0);
            var d = Number(l.debit) || 0, c = Number(l.credit) || 0;
            if (codeRoot === '4') incomeAmt += c;
            else if (codeRoot === '5') expenseAmt += d;
        });
    });
    var incEl = document.getElementById('dash-income');
    if (incEl) incEl.innerHTML = hide ? '—' : moneyHtml(incomeAmt);
    var expEl = document.getElementById('dash-expense');
    if (expEl) expEl.innerHTML = hide ? '—' : moneyHtml(expenseAmt);
    var profit = incomeAmt - expenseAmt;
    var prEl = document.getElementById('dash-profit');
    if (prEl) {
        prEl.innerHTML = hide ? '—' : moneyHtml(profit);
        prEl.className = 'kpi-val ' + (profit >= 0 ? 'positive' : 'negative');
    }
    var incSub = document.getElementById('dash-income-sub');
    if (incSub) incSub.textContent = getJalaliMonthName(pr.month) + ' ' + toFa(pr.year);
    var expSub = document.getElementById('dash-expense-sub');
    if (expSub) expSub.textContent = getJalaliMonthName(pr.month) + ' ' + toFa(pr.year);
    var prSub = document.getElementById('dash-profit-sub');
    if (prSub) prSub.textContent = profit >= 0 ? '✅ سود' : '⚠️ زیان';

    var clEl = document.getElementById('dash-cash-liquidity');
    if (clEl) {
        var months0 = getLastNMonths(6);
        var points = months0.map(function(mo) {
            var mFrom = mo.year + '/' + pad2(mo.month) + '/01';
            var mTo = mo.year + '/' + pad2(mo.month) + '/' + pad2(daysInJalaliMonth(mo.year, mo.month));
            var bal = 0;
            vouchers.forEach(function(v) {
                if (v.date < mFrom || v.date > mTo) return;
                (v.lines || []).forEach(function(l) {
                    if (!l.details) return;
                    if (l.details.bank || l.details.cashbox) {
                        bal += (Number(l.debit) || 0) - (Number(l.credit) || 0);
                    }
                });
            });
            return { label: mo.label, val: bal };
        });
        clEl.innerHTML = '<div class="mini-trend">' + points.map(function(p) {
            var cls = p.val >= 0 ? 'in' : 'out';
            var h = Math.min(Math.abs(p.val) / 1000000, 100) + 20;
            return '<div class="mini-bar"><div class="mini-bar-fill ' + cls + '" style="height:' + h + '%"></div><span class="mini-lbl">' + esc(p.label) + '</span><span class="mini-val">' + (hide ? '—' : moneyHtml(p.val)) + '</span></div>';
        }).join('') + '</div>';
    }

    var expByGroup = {};
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account) return;
            var d = Number(l.debit) || 0;
            if (d === 0) return;
            var rootId = getRootAccountId(l.account, accounts);
            var root = accounts.find(function(a) { return a.id === rootId; });
            if (!root || String(root.code || '').charAt(0) !== '5') return;
            var acc = accounts.find(function(a) { return a.id === l.account; });
            var lvl2 = acc;
            while (lvl2 && lvl2.parent) {
                var par = accounts.find(function(a) { return a.id === lvl2.parent; });
                if (!par || !par.parent) break;
                lvl2 = par;
            }
            var key = lvl2 ? lvl2.name : (root ? root.name : 'سایر');
            expByGroup[key] = (expByGroup[key] || 0) + d;
        });
    });
    if (document.getElementById('dash-expense-donut')) renderDonutChart('dash-expense-donut', expByGroup, 'هزینه', hide);

    var assets = {};
    banks.forEach(function(b) { var bal = getBankBalance(b.id); if (bal > 0) assets['بانک ' + b.bank] = bal; });
    cashBoxes.forEach(function(c) { var bal = getCashBoxBalance(c.id); if (bal > 0) assets['صندوق ' + c.title] = bal; });
    if (document.getElementById('dash-asset-donut')) renderDonutChart('dash-asset-donut', assets, 'دارایی', hide);

    var months2 = getLastNMonths(6);
    var monthStats = months2.map(function(mo) {
        var mFrom = mo.year + '/' + pad2(mo.month) + '/01';
        var mTo = mo.year + '/' + pad2(mo.month) + '/' + pad2(daysInJalaliMonth(mo.year, mo.month));
        var inc = 0, exp = 0;
        vouchers.forEach(function(v) {
            if (v.date < mFrom || v.date > mTo) return;
            (v.lines || []).forEach(function(l) {
                if (!l.account) return;
                var rootId = getRootAccountId(l.account, accounts);
                var root = accounts.find(function(a) { return a.id === rootId; });
                if (!root) return;
                var codeRoot = String(root.code || '').charAt(0);
                var d = Number(l.debit) || 0, c = Number(l.credit) || 0;
                if (codeRoot === '4') inc += c;
                else if (codeRoot === '5') exp += d;
            });
        });
        return { label: mo.label, income: inc, expense: exp };
    });
    if (document.getElementById('dash-trend')) renderBarChart('dash-trend', monthStats, hide);

    var expByMoein = {};
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account) return;
            var d = Number(l.debit) || 0;
            if (d === 0) return;
            var acc = accounts.find(function(a) { return a.id === l.account; });
            if (!acc) return;
            if (String(acc.code || '').charAt(0) !== '5') return;
            expByMoein[acc.name] = (expByMoein[acc.name] || 0) + d;
        });
    });
    var topArr = Object.keys(expByMoein).map(function(k) { return { name: k, val: expByMoein[k] }; }).sort(function(a, b) { return b.val - a.val; }).slice(0, 10);
    var topEl = document.getElementById('dash-top-exp');
    if (topEl) {
        if (topArr.length === 0) topEl.innerHTML = '<div class="widget-empty">هزینه‌ای ثبت نشده.</div>';
        else {
            var h = '<div class="top-exp-list">';
            topArr.forEach(function(x, i) {
                h += '<div class="top-exp-item"><div class="rank">' + toFa(i + 1) + '</div><div class="name">' + esc(x.name) + '</div><div class="amt">' + (hide ? '—' : moneyHtml(x.val)) + ' ' + currencyLabel() + '</div></div>';
            });
            h += '</div>';
            topEl.innerHTML = h;
        }
    }

    var lastV = document.getElementById('dash-last-vouchers');
    if (lastV) {
        var recent = vouchers.slice().sort(function(a, b) { return compareVals(b.date, a.date) || compareVals(b.number, a.number); }).slice(0, 10);
        if (recent.length === 0) lastV.innerHTML = '<div class="widget-empty">سندی نیست.</div>';
        else {
            lastV.innerHTML = '<div class="top-exp-list">' + recent.map(function(v) {
                return '<div class="top-exp-item"><div class="name">#' + toFa(v.number) + ' — ' + esc(v.desc || '') + '</div><div class="amt" style="color:var(--primary-dark)">' + (hide ? '—' : moneyHtml(getVoucherAmount(v))) + '</div><div class="muted" style="font-size:.7rem">' + toFa(v.date) + '</div></div>';
            }).join('') + '</div>';
        }
    }

    var ovEl = document.getElementById('dash-overdue-inst');
    if (ovEl) {
        var today = todayJalaliStr();
        var facilities = DB.load('facilities', []);
        var overdue = [];
        facilities.forEach(function(f) {
            (f.installments || []).forEach(function(inst) {
                if (inst.status === 'paid') return;
                if (!inst.date || inst.date >= today) return;
                overdue.push({ f: f, inst: inst });
            });
        });
        if (overdue.length === 0) ovEl.innerHTML = '<div class="widget-empty">✅ قسط سررسید گذشته‌ای نیست.</div>';
        else {
            ovEl.innerHTML = '<div class="top-exp-list">' + overdue.map(function(u) {
                return '<div class="top-exp-item"><div class="name">' + esc(u.f.name) + ' — ' + toFa(u.inst.date) + '</div><div class="amt" style="color:var(--danger)">' + (hide ? '—' : moneyHtml(u.inst.amount)) + '</div></div>';
            }).join('') + '</div>';
        }
    }

    var nbEl = document.getElementById('dash-neg-banks');
    if (nbEl) {
        var deficits = [];
        banks.forEach(function(b) {
            var bal = getBankBalance(b.id);
            var minB = Number(b.minBalance) || 0;
            if (bal < minB) deficits.push({ b: b, bal: bal, min: minB, def: bal - minB });
        });
        if (deficits.length === 0) nbEl.innerHTML = '<div class="widget-empty">✅ همه بانک‌ها بالای حداقل هستند.</div>';
        else {
            nbEl.innerHTML = '<div class="top-exp-list">' + deficits.map(function(d) {
                return '<div class="top-exp-item"><div class="name">' + esc(d.b.bank) + ' — ' + toFa(d.b.account || '') + '</div><div class="amt" style="color:var(--danger)">' + (hide ? '—' : moneyHtml(d.def)) + '</div></div>';
            }).join('') + '</div>';
        }
    }

    var tpEl = document.getElementById('dash-top-persons');
    if (tpEl) {
        var persons = DB.load('persons', []);
        var stats = {};
        vouchers.forEach(function(v) {
            (v.lines || []).forEach(function(l) {
                if (!l.details || !l.details.person) return;
                var pid = l.details.person;
                var amt = (Number(l.debit) || 0) + (Number(l.credit) || 0);
                if (!stats[pid]) stats[pid] = { count: 0, total: 0 };
                stats[pid].count++;
                stats[pid].total += amt;
            });
        });
        var arr = Object.keys(stats).map(function(pid) {
            var p = persons.find(function(x) { return x.id === pid; });
            return { id: pid, name: p ? (p.first || '') + ' ' + (p.last || '') : pid, count: stats[pid].count, total: stats[pid].total };
        }).sort(function(a, b) { return b.total - a.total; }).slice(0, 10);
        if (arr.length === 0) tpEl.innerHTML = '<div class="widget-empty">تراکنشی با اشخاص نیست.</div>';
        else {
            tpEl.innerHTML = '<div class="top-exp-list">' + arr.map(function(x, i) {
                return '<div class="top-exp-item"><div class="rank">' + toFa(i + 1) + '</div><div class="name">' + esc(x.name) + '</div><div class="amt" style="color:var(--primary-dark)">' + (hide ? '—' : moneyHtml(x.total)) + '</div></div>';
            }).join('') + '</div>';
        }
    }

    /* ★ خلاصه عوامل گردش وجه نقد */
    var cfSummaryEl = document.getElementById('dash-cf-summary');
    if (cfSummaryEl && typeof buildCashFlowDescSummaryForDash === 'function') {
        var cfSummary = buildCashFlowDescSummaryForDash();
        if (cfSummary.length === 0) cfSummaryEl.innerHTML = '<div class="widget-empty">گردش وجه نقدی ثبت نشده.</div>';
        else {
            var cfTotal = cfSummary.reduce(function(s, x) { return s + Math.abs(x.bal); }, 0) || 1;
            cfSummaryEl.innerHTML = '<div class="top-exp-list">' + cfSummary.map(function(x, i) {
                var pct = (Math.abs(x.bal) / cfTotal * 100).toFixed(1);
                var cls = x.bal >= 0 ? 'positive' : 'negative';
                return '<div class="top-exp-item"><div class="rank">' + toFa(i+1) + '</div><div class="name">' + esc(x.label) + '</div><div class="amt ' + cls + '">' + (hide ? '—' : moneyHtml(x.bal)) + ' <span style="font-size:0.72rem;color:var(--text-muted)">(' + toFa(pct) + '٪)</span></div></div>';
            }).join('') + '</div>';
        }
    }
}
function renderDonutChart(containerId, dataObj, title, hide) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var entries = Object.keys(dataObj).map(function(k) { return { label: k, value: dataObj[k] }; }).filter(function(x) { return x.value > 0; }).sort(function(a, b) { return b.value - a.value; });
    if (entries.length === 0) { el.innerHTML = '<div class="widget-empty">داده‌ای برای نمایش نیست.</div>'; return; }
    var total = entries.reduce(function(s, x) { return s + x.value; }, 0);
    var size = 200, radius = 70, cx = size / 2, cy = size / 2, stroke = 32;
    var circumference = 2 * Math.PI * radius;
    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="flex-shrink:0">';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="' + stroke + '" />';
    var cum = 0;
    for (var i = 0; i < entries.length; i++) {
        var p = entries[i].value / total;
        var arcLen = p * circumference;
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="' + CHART_COLORS[i % CHART_COLORS.length] + '" stroke-width="' + stroke + '" stroke-dasharray="' + arcLen + ' ' + (circumference - arcLen) + '" stroke-dashoffset="' + (-cum) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" />';
        cum += arcLen;
    }
    svg += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="14" font-weight="bold" fill="#357abd">' + (hide ? '—' : toFa(total > 1000000 ? formatMoney(total / 1000000) + 'M' : formatMoney(total))) + '</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="10" fill="#8b95a6">' + esc(title) + '</text>';
    svg += '</svg>';
    var lg = '<div class="donut-legend">';
    for (var j = 0; j < entries.length; j++) {
        var pct = (entries[j].value / total * 100).toFixed(1);
        lg += '<div class="lg-item"><span class="color-box" style="background:' + CHART_COLORS[j % CHART_COLORS.length] + '"></span><span class="lbl">' + esc(entries[j].label) + '</span><span class="val">' + (hide ? '—' : formatMoney(entries[j].value)) + ' (' + toFa(pct) + '٪)</span></div>';
    }
    lg += '</div>';
    el.innerHTML = '<div class="donut-wrap">' + svg + lg + '</div>';
}
function renderBarChart(containerId, data, hide) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!data || data.length === 0) { el.innerHTML = '<div class="widget-empty">داده‌ای برای نمایش نیست.</div>'; return; }
    var maxVal = 0;
    data.forEach(function(d) { if (d.income > maxVal) maxVal = d.income; if (d.expense > maxVal) maxVal = d.expense; });
    if (maxVal === 0) { el.innerHTML = '<div class="widget-empty">تراکنشی در این بازه ثبت نشده.</div>'; return; }
    var html = '<div class="bar-chart">';
    data.forEach(function(d) {
        var ih = maxVal > 0 ? (d.income / maxVal * 140) : 0;
        var eh = maxVal > 0 ? (d.expense / maxVal * 140) : 0;
        html += '<div class="bar-group"><div class="bar-pair">';
        html += '<div class="bar in" style="height:' + ih + 'px" title="درآمد: ' + (hide ? '—' : formatMoney(d.income)) + '"><span class="bar-val">' + (hide ? '—' : formatMoney(d.income)) + '</span></div>';
        html += '<div class="bar out" style="height:' + eh + 'px" title="هزینه: ' + (hide ? '—' : formatMoney(d.expense)) + '"><span class="bar-val">' + (hide ? '—' : formatMoney(d.expense)) + '</span></div>';
        html += '</div><span class="bar-lbl">' + esc(d.label) + '</span></div>';
    });
    html += '</div>';
    html += '<div style="display:flex;justify-content:center;gap:20px;margin-top:12px;font-size:0.8rem"><span><span style="display:inline-block;width:14px;height:14px;background:linear-gradient(180deg,#34d399,#059669);border-radius:3px;vertical-align:middle;margin-left:6px"></span>درآمد</span><span><span style="display:inline-block;width:14px;height:14px;background:linear-gradient(180deg,#f87171,#dc2626);border-radius:3px;vertical-align:middle;margin-left:6px"></span>هزینه</span></div>';
    el.innerHTML = html;
}
function renderDashboardOrderUI() {
    var box = document.getElementById('dashboard-order-list');
    if (!box) return;
    var names = {
        cashLiquidity: '💧 نمودار نقدینگی', expenseDonut: '🥧 ترکیب هزینه‌ها',
        assetDonut: '🏦 ترکیب دارایی‌ها', trendBar: '📊 روند ۶ ماه اخیر',
        topExpenses: '🏆 بیشترین هزینه‌ها', lastVouchers: '📄 ۱۰ سند آخر',
        overdueInstallments: '⏰ اقساط سررسید گذشته', negativeBanks: '🔴 بانک‌های با کسری',
        topPersons: '👥 پرتراکنش‌ترین اشخاص',
        cashflowSummary: '💸 خلاصه عوامل گردش وجه نقد'
    };
    var order = state.dashboardOrder || [];
    box.innerHTML = '';
    order.forEach(function(key, idx) {
        var row = document.createElement('div');
        row.className = 'widget-order-row';
        var enabled = !!state.dashboards[key];
        row.innerHTML = '<label class="wo-name" style="cursor:pointer"><input type="checkbox" data-dash-toggle="' + key + '" ' + (enabled ? 'checked' : '') + ' style="margin-left:6px"> ' + (names[key] || key) + '</label>' +
            '<div class="wo-btns"><button class="wo-btn" data-dash-key="' + key + '" data-dir="-1"' + (idx === 0 ? ' disabled' : '') + '>↑</button><button class="wo-btn" data-dash-key="' + key + '" data-dir="1"' + (idx === order.length - 1 ? ' disabled' : '') + '>↓</button></div>';
        box.appendChild(row);
    });
    box.querySelectorAll('.wo-btn').forEach(function(b) {
        b.addEventListener('click', function() {
            var key = this.getAttribute('data-dash-key');
            var dir = Number(this.getAttribute('data-dir'));
            var arr = state.dashboardOrder.slice();
            var i = arr.indexOf(key);
            var j = i + dir;
            if (j < 0 || j >= arr.length) return;
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            state.dashboardOrder = arr;
            DB.save('dashboardOrder', arr);
            renderDashboardOrderUI();
            renderDashboard();
        });
    });
    box.querySelectorAll('[data-dash-toggle]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var k = this.getAttribute('data-dash-toggle');
            state.dashboards[k] = this.checked;
            DB.save('dashboards', state.dashboards);
            renderDashboard();
        });
    });
}

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
   ============ بخش E: سیستم الگوی پیامک ============
   ===================================================================== */

var SMS_PATTERNS_KEY  = 'smsPatterns';
var SMS_PENDING_KEY   = 'smsPending';
var SMS_PENDING_MAX   = 200;
var SMS_PATTERN_THRESHOLD = 0.75;
window.SMS_PATTERN_THRESHOLD = SMS_PATTERN_THRESHOLD;

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
   ============ بخش F: تشخیص جهت و مبلغ با علامت ============
   ===================================================================== */
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
   ============ بخش G: Override parseBankSms ============
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

window.suggestDirection = function (text) { return detectSmsDirection(text); };

/* =====================================================================
   ============ بخش H: توکن‌سازی و تطبیق الگو ============
   ===================================================================== */

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
   ============ بخش I: فیلتر بانکی هوشمند ============
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
   ============ بخش J: پیشنهادها ============
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
   ============ بخش L: فرم پیامک‌های ثبت‌نشده ============
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
   ============ بخش M: ذخیره الگو از فرم ============
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
   ============ بخش P: مودال مدیریت الگوها + ویرایش ============
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

window.showSmsPatternsManager = openSmsPatternsManager;

/* =====================================================================
   ============ بخش Q: convertSmsToVoucher هوشمند ============
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

    var amtRes = extractAmountWithSign(raw);
    if (amtRes.amount > 0 && amtRes.sign) {
        amount = amtRes.amount;
        direction = amtRes.sign === '+' ? 'in' : 'out';
    }

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
