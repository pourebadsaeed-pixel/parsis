/* =====================================================================
   پارسیس v27 — 06-widgets,dashboard,rates,close,sms.js
   ویجت‌ها، داشبورد، نرخ لحظه‌ای، قیمت پایانی، پیامک بانکی
   ===================================================================== */
'use strict';

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
        if (bal === 0) continue;
        shown++;
        total += bal;
        var cls = bal > 0 ? 'positive' : 'negative';
        html += '<div class="balance-row"><div class="info"><div class="name">' + esc(b.bank || '—') + '</div><div class="meta">' + (b.branchName ? esc(b.branchName) + ' — ' : '') + toFa(esc(b.account || '—')) + '</div></div><div class="amount ' + cls + '">' + fmtFor(bal, 'widgets') + ' ' + currencyLabel() + '</div></div>';
    }
    if (shown === 0) { el.innerHTML = '<div class="widget-empty">حساب با مانده غیرصفر نیست.</div>'; return; }
    html += '<div class="balance-row balance-total"><div class="info"><div class="name">💰 جمع کل</div></div><div class="amount">' + fmtFor(total, 'widgets') + ' ' + currencyLabel() + '</div></div>';
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
        html += '<div class="balance-row"><div class="info"><div class="name">' + esc(c.title || '—') + '</div><div class="meta">' + esc(c.type || '—') + (c.unit ? ' — ' + esc(c.unit) : '') + '</div></div><div class="amount ' + cls + '">' + fmtFor(bal, 'widgets') + ' ' + currencyLabel() + '</div></div>';
    }
    if (shown === 0) { el.innerHTML = '<div class="widget-empty">صندوق با مانده غیرصفر نیست.</div>'; return; }
    html += '<div class="balance-row balance-total"><div class="info"><div class="name">💰 جمع کل</div></div><div class="amount">' + fmtFor(total, 'widgets') + ' ' + currencyLabel() + '</div></div>';
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
        var p = it.person;
        var info = it.info;
        var dl, dc = '';
        if (info.daysRemaining === 0) { dl = '🎉 امروز'; dc = 'today'; }
        else if (info.daysRemaining === 1) { dl = 'فردا'; dc = 'soon'; }
        else if (info.daysRemaining <= 7) { dl = toFa(info.daysRemaining) + ' روز دیگر'; dc = 'soon'; }
        else { dl = toFa(info.daysRemaining) + ' روز'; }
        var ds = toFa(pad2(info.birthMonth)) + '/' + toFa(pad2(info.birthDay));
        html += '<div class="birthday-row"><div class="name">' + esc(p.first || '') + ' ' + esc(p.last || '') + '</div><div>' + ds + '</div><div class="dow">' + info.dow + '</div><div class="days ' + dc + '">' + dl + '</div></div>';
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
    el.textContent = fmtFor(total, 'widgets') + ' ' + currencyLabel();
}

/* ==================== Upcoming installments widget ==================== */
function updateHomeUpcomingInstallments() {
    var el = document.getElementById('home-upcoming-installments');
    if (!el) return;
    var totalEl = document.getElementById('home-upcoming-total');
    var totalAmountEl = document.getElementById('home-upcoming-total-amount');
    var facilities = DB.load('facilities', []);
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tY = today[0], tM = today[1], tD = today[2];
    var upcoming = [];
    var totalAmount = 0;
    facilities.forEach(function(f) {
        if (f.status === 'settled' || f.status === 'inactive') return;
        (f.installments || []).forEach(function(inst) {
            if (inst.status === 'paid') return;
            if (!inst.date) return;
            var p = inst.date.split('/').map(Number);
            if (p.length !== 3) return;
            var diff = jalaliDiff(tY, tM, tD, p[0], p[1], p[2]);
            if (diff >= 0 && diff <= 3) {
                upcoming.push({ facility: f, date: inst.date, amount: inst.amount, diff: diff });
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
        html += '<div class="balance-row"><div class="info"><div class="name">' + esc(u.facility.name) + '</div><div class="meta">' + dl + ' — ' + toFa(esc(u.date)) + '</div></div><div class="amount">' + fmtFor(u.amount || 0, 'widgets') + '</div></div>';
    });
    el.innerHTML = html;
    if (totalEl && totalAmountEl) {
        totalEl.classList.remove('hidden');
        totalAmountEl.textContent = fmtFor(totalAmount, 'widgets') + ' ' + currencyLabel();
    }
}

/* ==================== Calendar widget ==================== */
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
    var gregNow = new Date();
    var gregMonth = GREG_MONTHS[gregNow.getMonth()];
    var gregDay = gregNow.getDate();
    var gregYear = gregNow.getFullYear();
    html += '<div class="cal-widget-moadel">🌍 ' + JALALI_MONTHS[todayJ[1] - 1] + ' ' + toFa(todayJ[0]) + ' | ' + gregMonth + ' ' + gregDay + ' ' + gregYear + ' — امروز ' + WEEKDAYS_FA[now.getDay()] + '</div>';
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
            if (noteId) openNoteView(noteId);
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
    updateSmsBadge();
}

/* ==================== Live Rates ==================== */
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
    autoAttachReportHelpers();
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
    autoAttachReportHelpers();
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
    autoAttachReportHelpers();
}

/* ==================== Dashboard ==================== */
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
function renderDashboard() {
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
    if (liqEl) liqEl.textContent = (hide ? '—' : formatMoney(liquidity)) + ' ' + currencyLabel();
    var liqSubEl = document.getElementById('dash-liquidity-sub');
    if (liqSubEl) liqSubEl.textContent = 'بانک: ' + (hide ? '—' : formatMoney(totalBank)) + ' | صندوق: ' + (hide ? '—' : formatMoney(totalCash));
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
    if (incEl) incEl.textContent = hide ? '—' : formatMoney(incomeAmt);
    var expEl = document.getElementById('dash-expense');
    if (expEl) expEl.textContent = hide ? '—' : formatMoney(expenseAmt);
    var profit = incomeAmt - expenseAmt;
    var prEl = document.getElementById('dash-profit');
    if (prEl) {
        prEl.textContent = hide ? '—' : formatMoney(profit);
        prEl.className = 'kpi-val ' + (profit >= 0 ? 'positive' : 'negative');
    }
    var incSub = document.getElementById('dash-income-sub');
    if (incSub) incSub.textContent = getJalaliMonthName(pr.month) + ' ' + toFa(pr.year);
    var expSub = document.getElementById('dash-expense-sub');
    if (expSub) expSub.textContent = getJalaliMonthName(pr.month) + ' ' + toFa(pr.year);
    var prSub = document.getElementById('dash-profit-sub');
    if (prSub) prSub.textContent = profit >= 0 ? '✅ سود' : '⚠️ زیان';
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
            while (lvl2 && lvl2.parent && accounts.find(function(a) { return a.id === lvl2.parent; }).parent) {
                lvl2 = accounts.find(function(a) { return a.id === lvl2.parent; });
            }
            var key = lvl2 ? lvl2.name : (root ? root.name : 'سایر');
            expByGroup[key] = (expByGroup[key] || 0) + d;
        });
    });
    renderDonutChart('dash-expense-donut', expByGroup, 'هزینه', hide);
    var assets = {};
    banks.forEach(function(b) { var bal = getBankBalance(b.id); if (bal > 0) assets['بانک ' + b.bank] = bal; });
    cashBoxes.forEach(function(c) { var bal = getCashBoxBalance(c.id); if (bal > 0) assets['صندوق ' + c.title] = bal; });
    renderDonutChart('dash-asset-donut', assets, 'دارایی', hide);
    var months = getLastNMonths(6);
    var monthStats = months.map(function(mo) {
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
    renderBarChart('dash-trend', monthStats, hide);
    var expByMoein = {};
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account) return;
            var d = Number(l.debit) || 0;
            if (d === 0) return;
            var acc = accounts.find(function(a) { return a.id === l.account; });
            if (!acc) return;
            if (String(acc.code || '').charAt(0) !== '5') return;
            var key = acc.name;
            expByMoein[key] = (expByMoein[key] || 0) + d;
        });
    });
    var topArr = Object.keys(expByMoein).map(function(k) { return { name: k, val: expByMoein[k] }; }).sort(function(a, b) { return b.val - a.val; }).slice(0, 10);
    var topEl = document.getElementById('dash-top-exp');
    if (topEl) {
        if (topArr.length === 0) topEl.innerHTML = '<div class="widget-empty">هزینه‌ای ثبت نشده.</div>';
        else {
            var h = '<div class="top-exp-list">';
            topArr.forEach(function(x, i) {
                h += '<div class="top-exp-item"><div class="rank">' + toFa(i + 1) + '</div><div class="name">' + esc(x.name) + '</div><div class="amt">' + (hide ? '—' : formatMoney(x.val)) + ' ' + currencyLabel() + '</div></div>';
            });
            h += '</div>';
            topEl.innerHTML = h;
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

/* ==================== SMS ==================== */
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
    if (byName) {
        result.matchedAccount = byName;
        result.matchedField = 'نام بانک';
        return result;
    }
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
    if (best && bestMS >= 200) {
        result.matchedAccount = best.account;
        result.matchedField = best.matchedField;
    }
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
        if (action === 'convert') { convertSmsToVoucher(id); return; }
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
function convertSmsToVoucher(smsId) {
    var list = getSmsInbox();
    var item = list.find(function(s) { return s.id === smsId; });
    if (!item) return;
    var p = item.parsed || {};
    if (!p.amount || !p.direction) { alert('اطلاعات کافی نیست.'); return; }
    var bankMoein = getBankMoeinId();
    if (!bankMoein) { alert('⚠️ معین بانک تعریف نشده.'); return; }
    var matchedDetailId = p.matchedAccountId || '';
    var lines = [];
    if (p.direction === 'out') {
        lines.push({ id: uid(), account: '', details: {}, debit: p.amount, credit: 0, description: '' });
        lines.push({ id: uid(), account: bankMoein, details: matchedDetailId ? { bank: matchedDetailId } : {}, debit: 0, credit: p.amount, description: '', locked: true });
    } else {
        lines.push({ id: uid(), account: bankMoein, details: matchedDetailId ? { bank: matchedDetailId } : {}, debit: p.amount, credit: 0, description: '', locked: true });
        lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: p.amount, description: '' });
    }
    var vl = DB.load('vouchers', []);
    var v = {
        id: uid(),
        number: getNextVoucherNumberForPeriod(state.activePeriodId || ''),
        date: todayJalaliStr(),
        type: 'general',
        periodId: state.activePeriodId || '',
        desc: '',
        lines: lines,
        status: 'draft'
    };
    vl.push(v);
    DB.save('vouchers', vl);
    for (var i = 0; i < list.length; i++) if (list[i].id === smsId) { list[i].status = 'converted'; list[i].voucherId = v.id; }
    saveSmsInbox(list);
    renderSmsInbox();
    updateSmsBadge();
    loadVoucherForEdit(v);
    showToast('✅ پیش‌نویس ساخته شد.');
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
