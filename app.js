/* =====================================================================
   پارسیس v26 — JavaScript کامل با AI بهبودیافته
   اصلاحات: تفصیلی‌یابی هوشمند، TTS پارسی، تاریخ میلادی، پرامپت دقیق
   ===================================================================== */
var APP_NAME = 'پارسیس';
var APP_VERSION = '26.01.01';
function toFaSimple(x){ return String(x).replace(/\d/g, function(d){ return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
var LS_PREFIX = 'parsis.';
var DB = {
    load: function(k, f) { try { var r = localStorage.getItem(LS_PREFIX + k); return r ? JSON.parse(r) : f; } catch(e) { return f; } },
    save: function(k, v) { try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); } catch(e) {} }
};
var _toastTimer = null;
function showToast(msg, ms) { var t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; requestAnimationFrame(function() { t.classList.add('show'); }); if (_toastTimer) clearTimeout(_toastTimer); _toastTimer = setTimeout(function() { t.classList.remove('show'); }, ms || 3000); }

function getDefaultTemplates() {
    return [
        { id:'tpl-taxi', name:'کرایه تاکسی روزانه', desc:'کرایه تاکسی شغلی', lines:[{ side:'debit', nameHint:'ایاب و ذهاب', desc:'کرایه تاکسی', fixedAmount: 300000 },{ side:'credit', nameHint:'صندوق', desc:'پرداخت از صندوق', fixedAmount: 300000 }]},
        { id:'tpl-supplies', name:'خرید ملزومات', desc:'خرید ملزومات اداری', lines:[{ side:'debit', nameHint:'ملزومات', desc:'خرید ملزومات' },{ side:'credit', nameHint:'بانک', desc:'پرداخت از بانک' }]},
        { id:'tpl-fuel', name:'هزینه سوخت', desc:'هزینه سوخت', lines:[{ side:'debit', nameHint:'سوخت', desc:'هزینه سوخت' },{ side:'credit', nameHint:'صندوق', desc:'پرداخت' }]},
        { id:'tpl-receive', name:'دریافت از مشتری', desc:'دریافت', lines:[{ side:'debit', nameHint:'بانک', desc:'واریز' },{ side:'credit', nameHint:'دریافتنی', desc:'دریافت از مشتری' }]},
        { id:'tpl-bill', name:'پرداخت قبض', desc:'پرداخت قبوض', lines:[{ side:'debit', nameHint:'قبوض', desc:'هزینه قبوض' },{ side:'credit', nameHint:'بانک', desc:'پرداخت' }]}
    ];
}
function getDefaultStdDescriptions() { return ['کرایه تاکسی','خرید ملزومات','هزینه سوخت','هزینه پذیرایی','پرداخت قبض','دریافت از مشتری','پرداخت به تأمین‌کننده','حقوق و دستمزد','اجاره','تلفن و اینترنت','تعمیر و نگهداری','تبلیغات','حمل و نقل','کارمزد بانکی','مالیات','بیمه']; }

var state = {
    theme: DB.load('theme', 'sky'), language: DB.load('language', 'fa'), font: DB.load('font', 'tahoma'),
    currency: DB.load('currency', 'rial'), currencyDisplay: DB.load('currencyDisplay', 'rial'),
    hideNumbers: DB.load('hideNumbers', true),
    reportHide: DB.load('reportHide', {}),
    bankTypes: DB.load('bankTypes', ['جاری','پس‌انداز','قرض‌الحسنه']),
    cashTypes: DB.load('cashTypes', ['نقد','طلا','ارز دیجیتال']),
    activePeriodId: DB.load('activePeriodId', ''),
    expandedNodes: DB.load('expandedNodes', {}),
    reportExpandedNodes: {},
    widgets: DB.load('widgets', { calendar: true, todayChecklist: true, bankTotal: true, bankBalances: true, cashBalances: true, upcomingInstallments: true, birthdays: true, liveRates: true }),
    widgetOrder: DB.load('widgetOrder', ['calendar','todayChecklist','bankTotal','cashBalances','bankBalances','upcomingInstallments','birthdays','liveRates']),
    widgetPages: DB.load('widgetPages', { calendar: 1, todayChecklist: 1, bankTotal: 1, cashBalances: 2, bankBalances: 2, upcomingInstallments: 1, birthdays: 3, liveRates: 3 }),
    homePage: DB.load('homePage', 1),
    smsAutoRead: DB.load('smsAutoRead', false),
    rffView: DB.load('rffView', 'summary'),
    notesView: DB.load('notesView', 'all'),
    formUsage: DB.load('formUsage', {}),
    aiFabPos: DB.load('aiFabPos', { left: 22, bottom: 22 }),
    cardCollapsed: DB.load('cardCollapsed', {})
};
(function() {
    var all = ['calendar','todayChecklist','bankTotal','cashBalances','bankBalances','upcomingInstallments','birthdays','liveRates'];
    var order = state.widgetOrder.slice();
    all.forEach(function(k) { if (order.indexOf(k) === -1) order.push(k); });
    state.widgetOrder = order.filter(function(k) { return all.indexOf(k) !== -1; });
    if (typeof state.widgets.calendar === 'undefined') state.widgets.calendar = true;
    DB.save('widgetOrder', state.widgetOrder);
    DB.save('widgets', state.widgets);
    all.forEach(function(k) { if (typeof state.widgetPages[k] === 'undefined') state.widgetPages[k] = 1; });
    DB.save('widgetPages', state.widgetPages);
})();
function saveState(k) { DB.save(k, state[k]); }

function trackFormUsage(pageName) {
    if (!pageName || pageName === 'home') return;
    state.formUsage[pageName] = (state.formUsage[pageName] || 0) + 1;
    DB.save('formUsage', state.formUsage);
    renderFrequentNav();
}
function renderFrequentNav() {
    var container = document.getElementById('nav-frequent-items');
    var group = document.getElementById('nav-frequent-group');
    if (!container || !group) return;
    var usage = state.formUsage || {};
    var entries = Object.keys(usage).map(function(k) { return { page: k, count: usage[k] }; }).sort(function(a, b) { return b.count - a.count; }).slice(0, 6);
    if (entries.length === 0) { group.style.display = 'none'; return; }
    group.style.display = '';
    var meta = {
        'voucher-new': { label:'✏️ صدور سند جدید' }, 'voucher-list': { label:'📄 فهرست اسناد' },
        'persons': { label:'👥 اشخاص' }, 'bank-accounts': { label:'🏦 حساب‌های بانکی' },
        'cash-boxes': { label:'💰 صندوق‌ها' }, 'notes': { label:'📔 یادداشت‌ها' },
        'dashboard': { label:'🎯 داشبورد مالی' }, 'report-cashflow': { label:'💵 وضعیت نقدینگی' },
        'facilities': { label:'🏦 تسهیلات' }, 'chart-define': { label:'✏️ تعریف حساب‌ها' },
        'sms': { label:'📱 پیامک بانکی' }, 'templates': { label:'🧩 الگوها' },
        'fiscal': { label:'📅 دوره مالی' }, 'report-trial': { label:'⚖️ تراز آزمایشی' },
        'report-account': { label:'📒 مرور حساب‌ها' }, 'report-rates': { label:'📈 نرخ ارز و طلا' }
    };
    container.innerHTML = '';
    var clearBtn = document.createElement('button');
    clearBtn.className = 'clear-freq-btn';
    clearBtn.type = 'button';
    clearBtn.textContent = '🗑 خالی کردن تاریخچه صفحات پرکاربرد';
    clearBtn.addEventListener('click', function() {
        if (!confirm('تاریخچه صفحات پرکاربرد پاک شود؟')) return;
        state.formUsage = {};
        DB.save('formUsage', {});
        renderFrequentNav();
        showToast('✅ تاریخچه پاک شد.');
    });
    container.appendChild(clearBtn);
    entries.forEach(function(e) {
        var m = meta[e.page] || { label: e.page };
        var b = document.createElement('button');
        b.setAttribute('data-page', e.page);
        b.innerHTML = '<span>' + m.label + '</span><span class="count-badge" style="padding:2px 8px;font-size:0.7rem">' + toFa(e.count) + '</span>';
        b.addEventListener('click', function() { goToPage(e.page); });
        container.appendChild(b);
    });
}

(function() { var accounts = DB.load('accounts', []); var changed = false;
    for (var i = 0; i < accounts.length; i++) {
        if (accounts[i].link && !accounts[i].links) { accounts[i].links = [accounts[i].link]; delete accounts[i].link; changed = true; }
        else if (!accounts[i].links) { accounts[i].links = []; changed = true; }
        if (typeof accounts[i].cfEffect === 'undefined') { accounts[i].cfEffect = false; changed = true; }
    }
    if (changed) DB.save('accounts', accounts);
    var notes = DB.load('notes', []);
    var nch = false;
    for (var ni = 0; ni < notes.length; ni++) { if (typeof notes[ni].archived === 'undefined') { notes[ni].archived = false; nch = true; } }
    if (nch) DB.save('notes', notes);
})();
function getHideState(key) { if (!key) return state.hideNumbers; var v = state.reportHide[key]; if (typeof v === 'boolean') return v; return state.hideNumbers; }
function setHideState(key, val) { state.reportHide[key] = !!val; DB.save('reportHide', state.reportHide); updateEyeButtons(); }
function toggleHideState(key) { setHideState(key, !getHideState(key)); }
function fmtFor(n, key) { if (getHideState(key)) return '—'; return formatMoney(n || 0); }
function fmtRep(n, key) { return fmtFor(n, key); }
function updateEyeButtons() {
    document.querySelectorAll('.eye-toggle-btn').forEach(function(btn) {
        var key = btn.getAttribute('data-hide-key'); if (!key) return;
        var hidden = getHideState(key);
        btn.textContent = hidden ? '🙈' : '👁';
        btn.classList.toggle('active', !hidden);
        btn.title = hidden ? 'نمایش مبالغ' : 'مخفی کردن مبالغ';
    });
}

var JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
var GREG_MONTHS = ['ژانویه','فوریه','مارس','آپریل','مه','ژوئن','جولای','آگوست','سپتامبر','اکتبر','نوامبر','دسامبر'];
var WEEKDAYS_FA = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
function toFa(x) { if (x === undefined || x === null) return ''; return String(x).replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
function toJalali(gy, gm, gd) {
    var g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
    var jy = (gy <= 1600) ? 0 : 979; gy -= (gy <= 1600) ? 621 : 1600;
    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * Math.floor(days / 12053); days %= 12053;
    jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
}
function jalaliToGregorian(jy, jm, jd) {
    jy = parseInt(jy); jm = parseInt(jm); jd = parseInt(jd);
    var gy; if (jy > 979) { gy = 1600; jy -= 979; } else { gy = 621; }
    var days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * Math.floor(days / 146097); days %= 146097;
    if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var gd = days + 1;
    var leap = (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
    var sal_a = [0,31, leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
    var gm; for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return [gy, gm, gd];
}
function isJalaliLeap(jy) { var r = jy % 33; return [1,5,9,13,17,22,26,30].indexOf(r) !== -1; }
function daysInJalaliMonth(jy, jm) { if (jm <= 6) return 31; if (jm <= 11) return 30; return isJalaliLeap(jy) ? 30 : 29; }
function pad2(n) { return String(n).length < 2 ? '0' + n : String(n); }
function todayJalaliStr() { var d = new Date(); var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]); }

/* ============ تاریخ با میلادی ============ */
function updateDateDisplay() {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var el1 = document.getElementById('date-jalali'), el2 = document.getElementById('date-gregorian');
    if (el1) el1.textContent = WEEKDAYS_FA[d.getDay()] + ' ' + toFa(j[2]) + ' ' + JALALI_MONTHS[j[1] - 1] + ' ' + toFa(j[0]);
    if (el2) el2.textContent = GREG_MONTHS[d.getMonth()] + ' ' + toFa(d.getDate()) + '، ' + toFa(d.getFullYear());
}
function jalaliDiff(y1, m1, d1, y2, m2, d2) { var g1 = jalaliToGregorian(y1, m1, d1); var g2 = jalaliToGregorian(y2, m2, d2); var date1 = new Date(g1[0], g1[1] - 1, g1[2]); var date2 = new Date(g2[0], g2[1] - 1, g2[2]); return Math.round((date2 - date1) / (1000 * 60 * 60 * 24)); }
function addJalaliDays(dateStr, days) { if (!dateStr) return ''; var p = normalizeDigits(dateStr).split('/').map(Number); if (p.length !== 3) return ''; var g = jalaliToGregorian(p[0], p[1], p[2]); var dt = new Date(g[0], g[1] - 1, g[2]); dt.setDate(dt.getDate() + days); var j = toJalali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()); return j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]); }
function tsToJalaliDate(ts) { var d = new Date(ts); var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]); }
function tsToJalaliTime(ts) { var d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function getJalaliMonthName(m) { return JALALI_MONTHS[m - 1] || ''; }

var calTarget = null, calCursorY = 0, calCursorM = 0, calSelectedD = 0, calYearMode = false, calYearStart = 0;
function openCalendar(input) {
    calTarget = input; calYearMode = false;
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var cursor = today;
    var v = normalizeDigits(input.value || '').trim();
    if (v) { var p = v.split('/').map(Number); if (p.length === 3 && !isNaN(p[0])) cursor = p; }
    calCursorY = cursor[0]; calCursorM = cursor[1]; calSelectedD = cursor[2] || 0;
    renderCalendar();
    document.getElementById('cal-overlay').classList.add('show');
    document.getElementById('cal-popup').classList.add('show');
}
function renderCalendar() {
    var body = document.getElementById('cal-body-content');
    if (calYearMode) {
        document.getElementById('cal-title').textContent = 'انتخاب سال شمسی';
        var startY = calYearStart;
        var html = '<div class="cal-years">';
        for (var y = startY; y < startY + 12; y++) {
            var cls = 'cal-year-btn';
            if (y === calCursorY) cls += ' selected';
            if (y === toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())[0]) cls += ' current';
            html += '<div class="' + cls + '" data-year="' + y + '">' + toFa(y) + '</div>';
        }
        html += '</div>';
        body.innerHTML = html;
        body.querySelectorAll('.cal-year-btn').forEach(function(b) {
            b.addEventListener('click', function() { calCursorY = Number(this.getAttribute('data-year')); calYearMode = false; renderCalendar(); });
        });
        return;
    }
    document.getElementById('cal-title').textContent = JALALI_MONTHS[calCursorM - 1] + ' ' + toFa(calCursorY) + ' 📅';
    var days = daysInJalaliMonth(calCursorY, calCursorM);
    var firstG = jalaliToGregorian(calCursorY, calCursorM, 1);
    var firstDate = new Date(firstG[0], firstG[1] - 1, firstG[2]);
    var firstDow = (firstDate.getDay() + 1) % 7;
    var todayJ = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var html = '<div class="cal-weekdays"><div>ش</div><div>ی</div><div>د</div><div>س</div><div>چ</div><div>پ</div><div>ج</div></div>';
    html += '<div class="cal-days" id="cal-days">';
    for (var i = 0; i < firstDow; i++) html += '<div class="cal-day empty"></div>';
    for (var d = 1; d <= days; d++) {
        var cls = 'cal-day';
        if (todayJ[0] === calCursorY && todayJ[1] === calCursorM && todayJ[2] === d) cls += ' today';
        if (calSelectedD === d) cls += ' selected';
        html += '<div class="' + cls + '" data-day="' + d + '">' + toFa(d) + '</div>';
    }
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('.cal-day[data-day]').forEach(function(el) {
        el.addEventListener('click', function() { pickDay(Number(this.getAttribute('data-day'))); });
    });
}
function pickDay(d) { if (calTarget) { calTarget.value = calCursorY + '/' + pad2(calCursorM) + '/' + pad2(d); calTarget.dispatchEvent(new Event('input', { bubbles: true })); } closeCalendar(); }
function closeCalendar() { document.getElementById('cal-overlay').classList.remove('show'); document.getElementById('cal-popup').classList.remove('show'); calTarget = null; calYearMode = false; }
document.getElementById('cal-prev').addEventListener('click', function() { if (calYearMode) { calYearStart -= 12; renderCalendar(); return; } calCursorM--; if (calCursorM < 1) { calCursorM = 12; calCursorY--; } calSelectedD = 0; renderCalendar(); });
document.getElementById('cal-next').addEventListener('click', function() { if (calYearMode) { calYearStart += 12; renderCalendar(); return; } calCursorM++; if (calCursorM > 12) { calCursorM = 1; calCursorY++; } calSelectedD = 0; renderCalendar(); });
document.getElementById('cal-title').addEventListener('click', function() { calYearMode = !calYearMode; calYearStart = Math.floor(calCursorY / 12) * 12; renderCalendar(); });
document.getElementById('cal-today').addEventListener('click', function() { var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()); calCursorY = t[0]; calCursorM = t[1]; calSelectedD = t[2]; calYearMode = false; renderCalendar(); });
document.getElementById('cal-close').addEventListener('click', closeCalendar);
document.getElementById('cal-overlay').addEventListener('click', closeCalendar);

/* ==================== Calculator ==================== */
var calcExpr = '0';
var calcTarget = null;
function calcOpen(targetGetter, targetSetter, title) {
    calcTarget = { get: targetGetter, set: targetSetter };
    var v = targetGetter ? (Number(targetGetter()) || 0) : 0;
    calcExpr = String(v || 0);
    updateCalcDisplay();
    var t = document.getElementById('calc-popup');
    document.querySelector('#calc-popup .cal-title').textContent = '🧮 ' + (title || 'ماشین حساب');
    document.getElementById('calc-overlay').classList.add('show');
    t.classList.add('show');
}
function updateCalcDisplay() {
    var el = document.getElementById('calc-display');
    if (!el) return;
    try { el.value = calcExpr; } catch(e) { el.value = calcExpr; }
}
function calcEval() {
    try { var expr = calcExpr.replace(/[^0-9+\-*/().]/g, ''); if (!expr) return 0; var result = Function('"use strict";return (' + expr + ')')(); if (!isFinite(result)) return 0; return Math.round(result); } catch(e) { return 0; }
}
function calcButtonPress(key) {
    if (key === 'C') { calcExpr = '0'; }
    else if (key === '←') { calcExpr = calcExpr.length > 1 ? calcExpr.slice(0, -1) : '0'; }
    else if (key === '=') { var r = calcEval(); calcExpr = String(r); }
    else if (['+','-','*','/'].indexOf(key) !== -1) { var lastChar = calcExpr.slice(-1); if (['+','-','*','/'].indexOf(lastChar) !== -1) calcExpr = calcExpr.slice(0, -1) + key; else calcExpr += key; }
    else if (key === '.') { var parts = calcExpr.split(/[+\-*/]/); var lastPart = parts[parts.length - 1]; if (lastPart.indexOf('.') === -1) calcExpr += '.'; }
    else if (/^\d$/.test(key)) { if (calcExpr === '0') calcExpr = key; else calcExpr += key; }
    updateCalcDisplay();
}
function initCalculator() {
    var box = document.getElementById('calc-buttons');
    var keys = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','←','C'];
    box.innerHTML = '';
    keys.forEach(function(k) {
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'calc-btn-key' + (['+','-','*','/'].indexOf(k) !== -1 ? ' op' : '') + (k === '=' ? ' eq' : '');
        b.textContent = k === '←' ? '⌫' : k === '*' ? '×' : k === '/' ? '÷' : k;
        b.addEventListener('click', function() { calcButtonPress(k); });
        box.appendChild(b);
    });
    document.getElementById('calc-close').addEventListener('click', calcClose);
    document.getElementById('calc-overlay').addEventListener('click', calcClose);
    document.getElementById('calc-set').addEventListener('click', function() {
        var r = calcEval();
        if (calcTarget && calcTarget.set) { calcTarget.set(r); showToast('✅ مقدار درج شد: ' + formatRaw(r)); }
        calcClose();
    });
    document.getElementById('calc-add').addEventListener('click', function() {
        var r = calcEval();
        if (calcTarget && calcTarget.get && calcTarget.set) { var cur = Number(calcTarget.get()) || 0; calcTarget.set(cur + r); showToast('➕ افزوده شد: ' + formatRaw(r)); }
        calcClose();
    });
    document.getElementById('calc-clear').addEventListener('click', function() { calcExpr = '0'; updateCalcDisplay(); });
}
function calcClose() { document.getElementById('calc-popup').classList.remove('show'); document.getElementById('calc-overlay').classList.remove('show'); calcTarget = null; }

function attachDatePickers() {
    var els = document.querySelectorAll('.date-picker');
    for (var i = 0; i < els.length; i++) {
        var el = els[i]; if (el.dataset.picker === '1') continue; el.dataset.picker = '1';
        if (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('date-wrap')) continue;
        try {
            var wrap = document.createElement('div'); wrap.className = 'date-wrap';
            el.parentNode.insertBefore(wrap, el); wrap.appendChild(el);
            var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cal-btn'; btn.innerHTML = '📅'; btn.title = 'باز کردن تقویم';
            (function(inp) { btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); openCalendar(inp); }); })(el);
            wrap.appendChild(btn);
        } catch(err) {}
    }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) { if (s === undefined || s === null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatRaw(n) { n = Number(n) || 0; return Math.round(n).toLocaleString('fa-IR').replace(/\u066C/g, ','); }
function formatMoney(n) { n = Number(n) || 0; var mode = state.currencyDisplay || 'rial';
    if (mode === 'toman') return formatRaw(n / 10);
    if (mode === 'million') { var v = n / 1000000; return v.toLocaleString('fa-IR', { maximumFractionDigits: 3 }).replace(/\u066C/g, ','); }
    return formatRaw(n); }
function formatRial(n) { n = Number(n) || 0; return formatRaw(n); }
function currencyLabel() { var m = state.currencyDisplay || 'rial'; if (m === 'toman') return 'تومان'; if (m === 'million') return 'میلیون ریال'; return 'ریال'; }
function parseMoney(s) { var t = String(s).replace(/[^\d\-]/g, ''); return Number(t) || 0; }
function attachMoneyInput(el, setter) {
    if (!el || el.dataset.money) return; el.dataset.money = '1';
    el.addEventListener('input', function() { var val = normalizeDigits(el.value); var neg = val.trim().charAt(0) === '-'; var raw = val.replace(/[^\d]/g, ''); el.value = (neg ? '-' : '') + raw; var v = Number(raw) || 0; if (setter) setter(neg ? -v : v); });
    el.addEventListener('blur', function() { var val = normalizeDigits(el.value); var neg = val.trim().charAt(0) === '-'; var raw = val.replace(/[^\d]/g, ''); var v = Number(raw) || 0; el.value = (neg && v ? '-' : '') + (v ? formatRaw(v) : ''); if (setter) setter(neg ? -v : v); });
}
function voucherTypeName(t) { if (t === 'general') return 'عمومی'; if (t === 'opening') return 'افتتاحیه'; if (t === 'establishment') return 'افتتاحیه استقرار'; if (t === 'closing') return 'بستن حساب'; if (t === 'final') return 'اختتامیه'; return t || 'عمومی'; }
function categoryName(c) { if (c === 'facility') return 'تسهیلات'; if (c === 'scheduled') return 'زمانبندی شده'; return c || '—'; }
function linkTypeName(t) { if (t === 'person') return 'اشخاص'; if (t === 'company') return 'شرکت‌ها'; if (t === 'bank') return 'بانکی'; if (t === 'cashbox') return 'صندوق'; if (t === 'project') return 'پروژه'; if (t === 'facility') return 'تسهیلات'; return ''; }
function normalizeDigits(s) {
    if (s === undefined || s === null) return ''; s = String(s);
    s = s.replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
    s = s.replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); });
    s = s.replace(/\u066B/g, '.'); s = s.replace(/\u060C/g, ','); s = s.replace(/\u066C/g, ',');
    return s;
}
function getAccountLabel(accId, accounts) {
    if (!accounts) accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === accId; }); if (!acc) return '';
    if (!acc.parent) return acc.name;
    var parent = accounts.find(function(a) { return a.id === acc.parent; }); if (!parent) return acc.name;
    return parent.name + ' - ' + acc.name;
}
function getAccountSearchText(accId, accounts) {
    if (!accounts) accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === accId; }); if (!acc) return '';
    var parts = [acc.code || '', acc.name || ''];
    if (acc.parent) { var p = accounts.find(function(a) { return a.id === acc.parent; }); if (p) { parts.push(p.code || ''); parts.push(p.name || ''); } }
    return parts.join(' ').toLowerCase();
}
function getDetailLabel(linkType, did) {
    if (linkType === 'person') { var p = DB.load('persons', []).find(function(x) { return x.id === did; }); return p ? ((p.first || '') + ' ' + (p.last || '')) : did; }
    if (linkType === 'company') { var co = DB.load('companies', []).find(function(x) { return x.id === did; }); return co ? co.name : did; }
    if (linkType === 'bank') { var b = DB.load('bankAccounts', []).find(function(x) { return x.id === did; }); return b ? ((b.bank || '') + ' - ' + (b.account || '')) : did; }
    if (linkType === 'cashbox') { var c = DB.load('cashBoxes', []).find(function(x) { return x.id === did; }); return c ? c.title : did; }
    if (linkType === 'project') { var pr = DB.load('projects', []).find(function(x) { return x.id === did; }); return pr ? pr.name : did; }
    if (linkType === 'facility') { var fc = DB.load('facilities', []).find(function(x) { return x.id === did; }); return fc ? fc.name : did; }
    return did;
}
function getLinkedItems(type) {
    if (type === 'person') return DB.load('persons', []); if (type === 'company') return DB.load('companies', []);
    if (type === 'bank') return DB.load('bankAccounts', []); if (type === 'cashbox') return DB.load('cashBoxes', []);
    if (type === 'project') return DB.load('projects', []); if (type === 'facility') return DB.load('facilities', []);
    return [];
}
function getLinkedItemLabel(type, item) {
    if (type === 'person') return (item.first || '') + ' ' + (item.last || '');
    if (type === 'company') return item.name || '';
    if (type === 'bank') return (item.bank || '') + ' - ' + (item.account || '');
    if (type === 'cashbox') return item.title || '';
    if (type === 'project') return item.name || '';
    if (type === 'facility') { var bank = DB.load('bankAccounts', []).find(function(b) { return b.id === item.bankId; }); return item.name + (bank ? ' — ' + bank.bank : ''); }
    return '';
}
function getBankMoeinId() { var accounts = DB.load('accounts', []); var m = accounts.find(function(a) { return a.links && a.links.indexOf('bank') !== -1; }); return m ? m.id : ''; }
function getLeafAccounts() { var accounts = DB.load('accounts', []); return accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); }); }
function buildOptionsInto(sel, items, labelFn, selectedId, placeholder) {
    sel.innerHTML = ''; var ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholder || '—'; sel.appendChild(ph);
    for (var i = 0; i < items.length; i++) { var o = document.createElement('option'); o.value = items[i].id; o.textContent = labelFn(items[i]); if (selectedId === items[i].id) o.selected = true; sel.appendChild(o); }
}
function getVoucherIssues(v) {
    var issues = []; if (!v) return ['سند نامعتبر'];
    var accounts = DB.load('accounts', []);
    var lines = v.lines || [];
    if (!v.number) issues.push('شماره سند خالی است');
    if (!v.date) issues.push('تاریخ سند خالی است');
    if (!v.desc || !String(v.desc).trim()) issues.push('شرح سند خالی است');
    var valid = lines.filter(function(l) { return (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0; });
    if (valid.length < 2) issues.push('حداقل دو ردیف با مبلغ لازم است');
    var lineIssues = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i]; var d = Number(line.debit) || 0; var c = Number(line.credit) || 0;
        if (d === 0 && c === 0) continue;
        var ln = toFa(i + 1);
        if (!line.account) { lineIssues.push('ردیف ' + ln + ': حساب معین تعیین نشده'); continue; }
        var acc = accounts.find(function(a) { return a.id === line.account; });
        if (!acc) { lineIssues.push('ردیف ' + ln + ': حساب معین نامعتبر'); continue; }
        if (acc.links && acc.links.length > 0) {
            for (var li = 0; li < acc.links.length; li++) { var lt = acc.links[li]; var items = getLinkedItems(lt); if (items.length === 0) continue;
                if (!line.details || !line.details[lt]) { lineIssues.push('ردیف ' + ln + ': تفصیلی ' + linkTypeName(lt) + ' تعیین نشده'); } }
        }
        if (!line.description || !String(line.description).trim()) { lineIssues.push('ردیف ' + ln + ': شرح قلم خالی است'); }
    }
    var td = 0, tc = 0; lines.forEach(function(l) { td += Number(l.debit) || 0; tc += Number(l.credit) || 0; });
    if (td !== tc) issues.push('سند متوازن نیست (اختلاف: ' + formatMoney(Math.abs(td - tc)) + ' ' + currencyLabel() + ')');
    return issues.concat(lineIssues);
}
function validateDateInActivePeriod(dateStr) {
    if (!dateStr) return { ok: false, msg: 'تاریخ خالی است' };
    var periods = DB.load('fiscalPeriods', []);
    if (!state.activePeriodId) return { ok: true };
    var ap = periods.find(function(p) { return p.id === state.activePeriodId; });
    if (!ap) return { ok: true };
    if (dateStr < ap.from || dateStr > ap.to) { return { ok: false, msg: 'تاریخ باید در بازه دوره فعال («' + ap.from + ' تا ' + ap.to + '») باشد' }; }
    return { ok: true };
}
/* ================== SMS parsing ================== */
function matchBankAccountByBankName(text) {
    if (!text) return null; var t = String(text); var ba = DB.load('bankAccounts', []); var best = null, bestScore = 0;
    for (var i = 0; i < ba.length; i++) { var b = ba[i]; var bankName = String(b.bank || '').trim(); if (bankName.length < 3) continue;
        if (t.indexOf(bankName) !== -1) { var score = bankName.length * 2; if (score > bestScore) { bestScore = score; best = b; } continue; }
        var parts = bankName.split(/\s+/).filter(function(w) { return w.length >= 3; });
        for (var p = 0; p < parts.length; p++) { if (t.indexOf(parts[p]) !== -1) { var sc = parts[p].length; if (sc > bestScore) { bestScore = sc; best = b; } } } }
    return bestScore >= 3 ? best : null;
}
function findMatchingBankAccount(text) {
    if (!text) return null; var rawText = String(text);
    var byName = matchBankAccountByBankName(rawText); if (byName) return byName;
    var t = normalizeDigits(rawText).replace(/\D/g, ''); if (t.length < 6) return null;
    var ba = DB.load('bankAccounts', []); var best = null, bestScore = 0;
    for (var j = 0; j < ba.length; j++) { var bj = ba[j];
        var cands = [{ v: (bj.account || '').replace(/\D/g, ''), w: 3 }, { v: (bj.card || '').replace(/\D/g, ''), w: 2 }, { v: (bj.iban || '').replace(/\D/g, ''), w: 2 }];
        for (var k = 0; k < cands.length; k++) { var n = cands[k].v; if (n.length < 6) continue;
            var maxLen = Math.min(n.length, 16);
            for (var len = maxLen; len >= 6; len--) { var sub = n.slice(-len); if (t.indexOf(sub) !== -1) { var score = len * cands[k].w; if (score > bestScore) { bestScore = score; best = bj; } break; } } } }
    return best;
}
function parseBankSms(text) {
    var result = { amount: 0, direction: '', balance: 0, accountCandidates: [], matchedAccount: null, bankName: '', raw: text };
    if (!text) return result; var t = normalizeDigits(text);
    var knownBanks = ['ملی','پاسارگاد','صادرات','تجارت','ملت','سپه','کشاورزی','مسکن','پارسیان','سامان','رفاه','اقتصاد نوین','آینده','شهر','دی','سینا','گردشگری','صنعت و معدن','توسعه صادرات','قوامین','حکمت','ایران زمین','مهر ایران','خاورمیانه','کارآفرین','پست بانک','رسالت','بلو','سرمایه'];
    for (var b = 0; b < knownBanks.length; b++) if (t.indexOf(knownBanks[b]) !== -1) { result.bankName = 'بانک ' + knownBanks[b]; break; }
    var bm = t.match(/مانده\s*(?:حساب)?\s*[:ـ]?\s*([\d,]+)/); if (bm) result.balance = Number(bm[1].replace(/,/g, '')) || 0;
    if (!result.balance) { var mo = t.match(/موجودی\s*(?:قابل\s*استفاده)?\s*[:ـ]?\s*([\d,]+)/); if (mo) result.balance = Number(mo[1].replace(/,/g, '')) || 0; }
    var bigNums = [], seenVals = {};
    var numRe = /\d{1,3}(?:,\d{3})+|\d{4,}/g, nm;
    while ((nm = numRe.exec(t)) !== null) { var val = Number(nm[0].replace(/,/g, '')); if (val < 1000) continue; if (val === result.balance) continue; if (seenVals[val]) continue;
        seenVals[val] = true; var idx = nm.index; var cb = idx > 0 ? t.charAt(idx - 1) : ''; var ca = idx + nm[0].length < t.length ? t.charAt(idx + nm[0].length) : '';
        var neg = /[-−\u2212]/.test(cb) || /[-−\u2212]/.test(ca); var pos = cb === '+' || ca === '+';
        bigNums.push({ value: val, neg: neg, pos: pos, idx: idx }); }
    var chosen = null, bestScore = -1; var keywords = ['مبلغ','برداشت','واریز','خرید','پرداخت','انتقال','مانده‌گیری','برداشت وجه','کسر'];
    for (var k = 0; k < bigNums.length; k++) { var bn = bigNums[k]; var ctx = t.substring(Math.max(0, bn.idx - 30), Math.min(t.length, bn.idx + 30));
        var score = 0; for (var ki = 0; ki < keywords.length; ki++) if (ctx.indexOf(keywords[ki]) !== -1) score += 10;
        if (bn.neg) score += 5; if (bn.pos) score += 5; score += Math.min(bn.value.toString().length, 10) * 0.5;
        if (score > bestScore) { bestScore = score; chosen = bn; } }
    if (chosen) { result.amount = chosen.value; if (chosen.neg) result.direction = 'out'; else if (chosen.pos) result.direction = 'in'; }
    var candidates = [], seen = {};
    function addC(s) { s = String(s).replace(/[*\s\-\.]/g, ''); if (s.length < 3) return; if (seen[s]) return; seen[s] = true; candidates.push({ value: s }); }
    var labelRe = /(?:حساب|کارت|شبا|شماره\s*حساب|شماره\s*کارت|IR)\s*[:ـ]?\s*([\d*.\-]{3,30})/gi, lm;
    while ((lm = labelRe.exec(t)) !== null) addC(lm[1]);
    var pasRe = /(\d{3})[.\-](\d{3})[.\-](\d{5,})(?:[.\-](\d{1,3}))?/g, pm;
    while ((pm = pasRe.exec(t)) !== null) { addC(pm[3]); addC(pm[1] + pm[2] + pm[3] + (pm[4] || '')); }
    var allD = t.match(/\d{5,25}/g) || [];
    for (var ad = 0; ad < allD.length; ad++) { var v2 = allD[ad]; if (Number(v2) === result.balance) continue; if (Number(v2) === result.amount) continue; addC(v2); }
    result.accountCandidates = candidates;
    var byName = matchBankAccountByBankName(text);
    if (byName) { result.matchedAccount = byName; result.matchedField = 'نام بانک'; return result; }
    var ba = DB.load('bankAccounts', []); var best = null, bestMS = 0;
    for (var bi = 0; bi < ba.length; bi++) { var bak = ba[bi];
        var fields = [{ v: (bak.account || '').replace(/\D/g, ''), w: 10, name: 'حساب' }, { v: (bak.card || '').replace(/\D/g, ''), w: 7, name: 'کارت' }, { v: (bak.iban || '').replace(/\D/g, ''), w: 5, name: 'شبا' }];
        for (var fi = 0; fi < fields.length; fi++) { var fv = fields[fi].v, w = fields[fi].w; if (fv.length < 4) continue;
            for (var ci2 = 0; ci2 < candidates.length; ci2++) { var cand = candidates[ci2].value; if (cand.length < 4) continue; var sc = 0;
                if (fv === cand) sc = 100 * w; else if (fv.indexOf(cand) !== -1) sc = (50 + cand.length * 3) * w; else if (cand.indexOf(fv) !== -1) sc = (50 + fv.length * 3) * w;
                else { var ml = Math.min(fv.length, cand.length, 10); for (var sl = ml; sl >= 4; sl--) if (fv.slice(-sl) === cand.slice(-sl)) { sc = (20 + sl * 8) * w; break; } }
                if (sc > bestMS) { bestMS = sc; best = { account: bak, matchedField: fields[fi].name }; } } } }
    if (best && bestMS >= 200) { result.matchedAccount = best.account; result.matchedField = best.matchedField; }
    return result;
}
function getSmsInbox() { return DB.load('smsInbox', []); }
function saveSmsInbox(list) { DB.save('smsInbox', list); }
function getUnreadSmsCount() { var l = getSmsInbox(); var c = 0; l.forEach(function(s) { if (s.status === 'new') c++; }); return c; }
function updateSmsBadge() { var c = getUnreadSmsCount(); var b = document.getElementById('sms-nav-badge'); if (!b) return; if (c > 0) { b.textContent = toFa(c); b.classList.remove('hidden'); } else b.classList.add('hidden'); }
function addSmsToInbox(rawText, source) {
    var text = String(rawText || '').trim(); if (!text) return { ok: false, reason: 'empty' };
    var list = getSmsInbox();
    if (list.some(function(s) { return s.rawText === text; })) return { ok: false, reason: 'duplicate' };
    var parsed = parseBankSms(text);
    if (!parsed.bankName && !parsed.amount && parsed.accountCandidates.length === 0) return { ok: false, reason: 'not-bank' };
    var item = { id: uid(), rawText: text, source: source || 'manual', receivedAt: Date.now(),
        parsed: { amount: parsed.amount, direction: parsed.direction, balance: parsed.balance, bankName: parsed.bankName,
            matchedAccountId: parsed.matchedAccount ? parsed.matchedAccount.id : '',
            matchedAccountTitle: parsed.matchedAccount ? ((parsed.matchedAccount.bank || '') + ' - ' + (parsed.matchedAccount.account || '')) : '',
            matchedField: parsed.matchedField || '', accountCandidates: parsed.accountCandidates },
        status: 'new', voucherId: '' };
    list.unshift(item); saveSmsInbox(list); return { ok: true, item: item };
}
function renderSmsInbox() {
    var box = document.getElementById('sms-inbox-list'); if (!box) return;
    var list = getSmsInbox(); var countEl = document.getElementById('sms-inbox-count');
    if (list.length === 0) { box.innerHTML = '<div class="widget-empty">📭 صندوق خالی است.</div>'; if (countEl) countEl.textContent = '۰'; return; }
    list.sort(function(a, b) { return (b.receivedAt || 0) - (a.receivedAt || 0); });
    var html = '';
    list.forEach(function(s) {
        var p = s.parsed || {}; var dirLabel, dirClass;
        if (p.direction === 'out') { dirLabel = '🔴 برداشت'; dirClass = 'out'; } else if (p.direction === 'in') { dirLabel = '🟢 واریز'; dirClass = 'in'; } else { dirLabel = '❓'; dirClass = ''; }
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
        var action = this.getAttribute('data-action'); var id = this.getAttribute('data-id');
        if (action === 'convert') { convertSmsToVoucher(id); return; }
        if (action === 'ignore') { var l = getSmsInbox(); for (var x = 0; x < l.length; x++) if (l[x].id === id) l[x].status = 'ignored'; saveSmsInbox(l); renderSmsInbox(); updateSmsBadge(); return; }
        if (action === 'delete') { if (!confirm('حذف شود؟')) return; var l2 = getSmsInbox().filter(function(x) { return x.id !== id; }); saveSmsInbox(l2); renderSmsInbox(); updateSmsBadge(); return; }
    });
}
function convertSmsToVoucher(smsId) {
    var list = getSmsInbox(); var item = list.find(function(s) { return s.id === smsId; }); if (!item) return;
    var p = item.parsed || {}; if (!p.amount || !p.direction) { alert('اطلاعات کافی نیست.'); return; }
    var bankMoein = getBankMoeinId(); if (!bankMoein) { alert('⚠️ معین بانک تعریف نشده.'); return; }
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
    var v = { id: uid(), number: getNextVoucherNumberForPeriod(state.activePeriodId || ''), date: todayJalaliStr(), type: 'general', periodId: state.activePeriodId || '', desc: '', lines: lines, status: 'draft' };
    vl.push(v); DB.save('vouchers', vl);
    for (var i = 0; i < list.length; i++) if (list[i].id === smsId) { list[i].status = 'converted'; list[i].voucherId = v.id; }
    saveSmsInbox(list); renderSmsInbox(); updateSmsBadge();
    loadVoucherForEdit(v); showToast('✅ پیش‌نویس ساخته شد.');
}
var _lastClipboardText = '';
function readClipboardAndAdd(auto) {
    if (!navigator.clipboard || !navigator.clipboard.readText) { if (!auto) alert('مرورگر پشتیبانی نمی‌کند.'); return; }
    navigator.clipboard.readText().then(function(text) {
        var t = String(text || '').trim(); if (!t) { if (!auto) alert('کلیپ‌بورد خالی.'); return; }
        if (auto && t === _lastClipboardText) return;
        var matched = findMatchingBankAccount(t);
        if (!matched) { if (!auto) alert('❌ این متن شامل شماره حساب یا نام بانک‌های شما نیست.'); return; }
        var res = addSmsToInbox(t, auto ? 'auto' : 'clipboard');
        if (res.ok) { _lastClipboardText = t; renderSmsInbox(); updateSmsBadge(); showToast(auto ? '📱 پیامک اضافه شد' : '✅ اضافه شد.'); }
        else if (res.reason === 'duplicate' && !auto) showToast('قبلاً ثبت شده.');
        else if (!auto) alert('قابل تشخیص نبود.');
    }).catch(function() { if (!auto) alert('دسترسی به کلیپ‌بورد داده نشد.'); });
}
function checkClipboardSupport() { var el = document.getElementById('clip-status'); if (!el) return;
    if (navigator.clipboard && navigator.clipboard.readText) { el.textContent = 'در دسترس'; el.className = 'method-status ok'; }
    else { el.textContent = 'ندارد'; el.className = 'method-status no'; } }

/* ==================== Voucher Preview ==================== */
function openVoucherPreview(v) {
    var body = document.getElementById('vpreview-body'); if (!body) return;
    var accounts = DB.load('accounts', []); var periods = DB.load('fiscalPeriods', []);
    var period = periods.find(function(p) { return p.id === v.periodId; });
    var status = v.status === 'approved' ? '<span class="badge badge-approved">✓ تأیید</span>' : '<span class="badge badge-draft">پیش‌نویس</span>';
    var html = '<div class="vp-header"><div class="vp-grid">';
    html += '<div><span class="lbl">شماره:</span> <b>' + toFa(esc(v.number)) + '</b></div><div><span class="lbl">تاریخ:</span> <b dir="ltr">' + toFa(esc(v.date)) + '</b></div>';
    html += '<div><span class="lbl">نوع:</span> ' + voucherTypeName(v.type) + '</div><div><span class="lbl">دوره:</span> ' + esc(period ? period.title : '—') + '</div>';
    html += '<div class="full"><span class="lbl">شرح:</span> <b>' + esc(v.desc || '') + '</b></div>';
    html += '<div><span class="lbl">وضعیت:</span> ' + status + '</div></div></div>';
    html += '<div class="table-wrap"><table class="report-table"><thead><tr><th>#</th><th>معین</th><th>تفصیلی</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>';
    var td = 0, tc = 0; var lines = v.lines || [];
    for (var i = 0; i < lines.length; i++) { var line = lines[i]; var accLabel = line.account ? getAccountLabel(line.account, accounts) : '—';
        var dt = ''; if (line.details) Object.keys(line.details).forEach(function(lt) { var did = line.details[lt]; if (did) { if (dt) dt += ' ، '; dt += linkTypeName(lt) + ': ' + getDetailLabel(lt, did); } });
        var d = Number(line.debit) || 0, c = Number(line.credit) || 0; td += d; tc += c;
        html += '<tr><td>' + toFa(i + 1) + '</td><td>' + esc(accLabel) + '</td><td>' + (dt ? esc(dt) : '—') + '</td><td>' + esc(line.description || '') + '</td><td class="num dr">' + (d ? formatMoney(d) : '—') + '</td><td class="num cr">' + (c ? formatMoney(c) : '—') + '</td></tr>'; }
    html += '</tbody><tfoot><tr><td colspan="4" style="text-align:left">جمع</td><td class="num dr">' + formatMoney(td) + '</td><td class="num cr">' + formatMoney(tc) + '</td></tr></tfoot></table></div>';
    if (td === tc && td > 0) html += '<div class="vp-balance-ok">✓ متوازن</div>'; else html += '<div class="vp-balance-err">⚠️ اختلاف: ' + formatMoney(Math.abs(td - tc)) + '</div>';
    body.innerHTML = html;
    document.getElementById('vpreview-modal').classList.add('show');
    document.getElementById('vpreview-overlay').classList.add('show');
    window._currentPreviewVoucher = v;
}
function closeVoucherPreview() { document.getElementById('vpreview-modal').classList.remove('show'); document.getElementById('vpreview-overlay').classList.remove('show'); window._currentPreviewVoucher = null; }
function printVoucherPreview() {
    var v = window._currentPreviewVoucher; if (!v) return;
    var body = document.getElementById('vpreview-body'); var win = window.open('', '_blank'); if (!win) return;
    var ff = getPrintFontFamily();
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>سند ' + esc(v.number) + '</title><style>');
    win.document.write('body { font-family:' + ff + '; direction:rtl; color:#222; font-size:12px; } h1 { text-align:center; font-size:15px; } table { width:100%; border-collapse:collapse; font-size:10px; } th, td { border:1px solid #999; padding:5px 7px; } th { background:#e6f0fa; } .dr { color:#c0392b; } .cr { color:#1e9e6a; }');
    win.document.write('</style></head><body><h1>سند شماره ' + toFa(esc(v.number)) + '</h1>' + body.innerHTML + '</body></html>');
    win.document.close(); setTimeout(function() { win.focus(); win.print(); }, 400);
}
/* ==================== Export helpers ==================== */
function exportToCsv(key, filename) {
    var data = DB.load(key, []); if (!Array.isArray(data)) data = [];
    if (data.length === 0) { alert('داده‌ای نیست.'); return; }
    var keys = []; data.forEach(function(row) { Object.keys(row).forEach(function(k) { if (keys.indexOf(k) === -1) keys.push(k); }); });
    var lines = [keys.join(',')];
    data.forEach(function(row) { lines.push(keys.map(function(k) { var v = row[k]; if (v === null || v === undefined) v = ''; if (typeof v === 'object') v = JSON.stringify(v); v = String(v).replace(/"/g, '""'); return '"' + v + '"'; }).join(',')); });
    var csv = '\uFEFF' + lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); var url = URL.createObjectURL(blob);
    var now = new Date(); var dateStr = todayJalaliStr().replace(/\//g, '-'); var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
    var a = document.createElement('a'); a.href = url; a.download = filename + '-' + dateStr + '_' + timeStr + '.csv'; a.click(); URL.revokeObjectURL(url);
}
function exportReportTable(selector, filename) {
    var el = document.querySelector(selector); if (!el) { alert('ابتدا گزارش را اجرا کن.'); return; }
    var table = el.querySelector('table'); var detailList = el.querySelector('.rff-detail-list');
    var rows = [];
    if (detailList) {
        rows.push(['گزارش جامع تسهیلات — جزئیات']); rows.push([]);
        var cards = detailList.querySelectorAll('.rff-fac-card');
        for (var c = 0; c < cards.length; c++) { var card = cards[c]; var title = card.querySelector('.rff-fac-title');
            rows.push(['عنوان تسهیلات:', title ? title.textContent.trim() : '']);
            var tbl = card.querySelector('.rff-inst-table');
            if (tbl) { var trs = tbl.querySelectorAll('tr'); for (var t = 0; t < trs.length; t++) { var cells = trs[t].querySelectorAll('th, td'); var rr = []; for (var cc = 0; cc < cells.length; cc++) rr.push(cells[cc].textContent.trim()); rows.push(rr); } }
            rows.push([]); }
    } else if (table) {
        var trs2 = table.querySelectorAll('tr');
        for (var i = 0; i < trs2.length; i++) { var cells2 = trs2[i].querySelectorAll('th, td'); var row2 = [];
            for (var j = 0; j < cells2.length; j++) { if (cells2[j].style.display === 'none') continue; row2.push(String(cells2[j].textContent || '').trim()); }
            if (row2.length > 0) rows.push(row2); }
    } else { alert('ابتدا گزارش را اجرا کن.'); return; }
    if (rows.length === 0) { alert('داده‌ای برای خروجی نیست.'); return; }
    var lines = [];
    for (var r = 0; r < rows.length; r++) lines.push(rows[r].map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','));
    var csv = '\uFEFF' + lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); var url = URL.createObjectURL(blob);
    var now = new Date(); var dateStr = todayJalaliStr().replace(/\//g, '-'); var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
    var a = document.createElement('a'); a.href = url; a.download = filename + '-' + dateStr + '_' + timeStr + '.csv'; a.click(); URL.revokeObjectURL(url);
}
function getPrintFontFamily() { return state.font === 'bnazanin' ? "'B Nazanin',Tahoma,sans-serif" : state.font === 'bsans' ? "'B Sans',Tahoma,sans-serif" : 'Tahoma,sans-serif'; }
function cleanOuterHtml(el) { var c = el.cloneNode(true); var grips = c.querySelectorAll('.col-resizer'); for (var i = 0; i < grips.length; i++) grips[i].parentNode.removeChild(grips[i]); return c.outerHTML; }
function buildPrintCss(numCols) {
    numCols = numCols || 6; var ff = getPrintFontFamily();
    var orientation = numCols > 8 ? 'landscape' : 'portrait';
    var fontSize = numCols > 12 ? 7 : (numCols > 9 ? 8 : (numCols > 6 ? 9 : 10));
    return '@page { size: A4 ' + orientation + '; margin: 6mm 5mm 8mm 5mm; } body { font-family:' + ff + '; padding:0; margin:0; color:#222; direction:rtl; font-size:' + fontSize + 'px; } table { width:100%; border-collapse:collapse; font-size:' + fontSize + 'px; } th, td { border:1px solid #999; padding:3px 5px; } th { background:#e6f0fa; } .num { text-align:center; } .dr { color:#c0392b; } .cr { color:#1e9e6a; }';
}
function printHtmlReport(selector, title) {
    var el = document.querySelector(selector); if (!el) { alert('ابتدا گزارش را اجرا کن.'); return; }
    var win = window.open('', '_blank'); if (!win) { alert('پنجره چاپ باز نشد.'); return; }
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>' + esc(title) + '</title><style>' + buildPrintCss(8) + '</style></head><body><h2 style="text-align:center">' + esc(title) + '</h2>' + cleanOuterHtml(el) + '</body></html>');
    win.document.close(); setTimeout(function() { win.focus(); win.print(); }, 400);
}
/* ==================== Table resizing ==================== */
var colWidths = DB.load('colWidths', {});
function saveColWidths() { DB.save('colWidths', colWidths); }
function applyColWidths(tableId) {
    var table = document.getElementById(tableId); if (!table) return;
    var widths = colWidths[tableId] || [];
    var ths = table.querySelectorAll('thead th');
    var totalW = 0;
    for (var i = 0; i < ths.length; i++) {
        if (widths[i]) { ths[i].style.width = widths[i] + 'px'; ths[i].style.minWidth = widths[i] + 'px'; totalW += widths[i]; }
        else { totalW += ths[i].offsetWidth || 100; }
    }
    if (totalW > 0) table.style.minWidth = totalW + 'px';
}
function updateTableMinWidth(table) {
    var ths = table.querySelectorAll('thead th');
    var totalW = 0;
    for (var i = 0; i < ths.length; i++) totalW += ths[i].offsetWidth || 0;
    if (totalW > 0) table.style.minWidth = totalW + 'px';
}
function makeTableResizable(table) {
    if (!table || table.dataset.resizable === '1') return;
    table.dataset.resizable = '1';
    var tableId = table.id; if (!tableId) return;
    var ths = table.querySelectorAll('thead th');
    for (var i = 0; i < ths.length; i++) {
        (function(th, idx) {
            if (th.querySelector('.col-resizer')) return;
            var res = document.createElement('div');
            res.className = 'col-resizer';
            th.appendChild(res);
            var startX, startW, isDragging = false;
            res.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); isDragging = true; startX = e.pageX; startW = th.offsetWidth; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; });
            res.addEventListener('touchstart', function(e) { e.preventDefault(); var t = e.touches[0]; isDragging = true; startX = t.pageX; startW = th.offsetWidth; document.body.style.userSelect = 'none'; }, { passive: false });
            function moveHandler(x) { if (!isDragging) return; var diff = startX - x; var w = Math.max(50, startW + diff); th.style.width = w + 'px'; th.style.minWidth = w + 'px'; updateTableMinWidth(table); }
            function endHandler() { if (!isDragging) return; isDragging = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; if (!colWidths[tableId]) colWidths[tableId] = []; colWidths[tableId][idx] = th.offsetWidth; saveColWidths(); updateTableMinWidth(table); }
            document.addEventListener('mousemove', function(e) { moveHandler(e.pageX); });
            document.addEventListener('mouseup', endHandler);
            document.addEventListener('touchmove', function(e) { if (isDragging) { moveHandler(e.touches[0].pageX); e.preventDefault(); } }, { passive: false });
            document.addEventListener('touchend', endHandler);
        })(ths[i], i);
    }
    applyColWidths(tableId);
}
/* ==================== Column visibility ==================== */
var colSettings = DB.load('columnSettings', {});
function getHiddenCols(tableId) { return colSettings[tableId] || []; }
function setHiddenCols(tableId, arr) { colSettings[tableId] = arr; DB.save('columnSettings', colSettings); }
function applyColVisibility(tableId) {
    var table = document.getElementById(tableId); if (!table) return;
    var hidden = getHiddenCols(tableId); var rows = table.querySelectorAll('tr');
    for (var r = 0; r < rows.length; r++) { var cells = rows[r].children; if (cells.length === 1 && cells[0].hasAttribute('colspan')) continue; for (var c = 0; c < cells.length; c++) cells[c].style.display = hidden.indexOf(c) !== -1 ? 'none' : ''; }
    updateTableMinWidth(table);
}
function applyColVisibilityAll() { ['fiscal-table','persons-table','comp-table','ba-table','cb-table','proj-table','voucher-table-list','rt-table','ri-table','rf-table','rff-table','cfs-table','rr-table','cf-table','cfd-table','dc-table'].forEach(applyColVisibility); }
function buildHeaderButtons() {
    var headers = document.querySelectorAll('.list-header');
    for (var i = 0; i < headers.length; i++) { (function(h) {
        var tableId = h.getAttribute('data-col-table');
        var hideKey = h.getAttribute('data-hide-key');
        if (hideKey && !h.querySelector('.eye-toggle-btn')) {
            var eye = document.createElement('button'); eye.type = 'button'; eye.className = 'eye-toggle-btn'; eye.setAttribute('data-hide-key', hideKey);
            eye.addEventListener('click', function(ev) { ev.stopPropagation(); toggleHideState(hideKey); rerenderCurrentPage(); });
            h.appendChild(eye);
        }
        if (tableId && !h.querySelector('.col-toggle-btn')) {
            var btn = document.createElement('button'); btn.className = 'col-toggle-btn'; btn.type = 'button'; btn.title = 'ستون‌ها'; btn.innerHTML = '⚙';
            btn.addEventListener('click', function(ev) { ev.stopPropagation(); showColMenu(tableId, btn); });
            h.appendChild(btn);
        }
    })(headers[i]); }
    updateEyeButtons();
}
function rerenderCurrentPage() {
    var active = document.querySelector('.page.active'); if (!active) return;
    var id = active.id.replace('page-', '');
    if (id === 'persons') renderPersonsList();
    else if (id === 'companies') renderCompaniesList();
    else if (id === 'bank-accounts') renderBankAccountsList();
    else if (id === 'cash-boxes') renderCashBoxesList();
    else if (id === 'projects') renderProjectsList();
    else if (id === 'fiscal') renderFiscalList();
    else if (id === 'voucher-list') renderVoucherList();
    else if (id === 'estimate-daily') renderEstimateList();
    else if (id === 'cashflow-sources') renderCfsList();
    else if (id === 'facilities') renderFacilitiesList();
    else if (id === 'report-cashflow') runCashFlowReport();
    else if (id === 'report-cashflow-desc') runCashFlowByDescReport();
    else if (id === 'report-account') runAccountReport();
    else if (id === 'report-trial') runTrialBalance();
    else if (id === 'report-incomplete') runIncompleteReport();
    else if (id === 'report-facility') runFacilityReport();
    else if (id === 'report-facility-full') runFacilityFullReport();
    else if (id === 'report-rates') runRatesReport();
    else if (id === 'daily-close') renderDailyCloseHistory();
    else if (id === 'notes') renderNotesList();
    else if (id === 'dashboard') renderDashboard();
    else if (id === 'home') updateHomeWidgets();
}
function showColMenu(tableId, btn) {
    var menu = document.getElementById('col-menu'); if (!menu) return;
    var table = document.getElementById(tableId); if (!table) return;
    var thead = table.querySelector('thead'); if (!thead) return;
    var ths = thead.querySelectorAll('th'); var hidden = getHiddenCols(tableId);
    var html = '<div class="col-menu-head">👁 نمایش ستون‌ها</div><div class="col-menu-body">';
    for (var i = 0; i < ths.length; i++) { var th = ths[i]; var label = String(th.textContent || '').replace(/[⇅▲▼]/g, '').trim() || ('ستون ' + (i+1));
        var checked = hidden.indexOf(i) === -1 ? 'checked' : '';
        html += '<label class="col-menu-item"><input type="checkbox" data-table="' + tableId + '" data-col="' + i + '" ' + checked + '><span>' + esc(label) + '</span></label>'; }
    html += '</div><div class="col-menu-foot"><button type="button" class="col-menu-reset">بازنشانی</button><button type="button" class="col-menu-close">بستن</button></div>';
    menu.innerHTML = html; menu.classList.remove('hidden');
    var rect = btn.getBoundingClientRect(); var menuW = 220;
    var top = rect.bottom + window.scrollY + 6; var left = rect.left + window.scrollX - menuW + rect.width;
    if (left < 8) left = 8; if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    menu.style.top = top + 'px'; menu.style.left = left + 'px';
    menu.querySelectorAll('input[type=checkbox]').forEach(function(cb) { cb.addEventListener('change', function() {
        var tid = this.getAttribute('data-table'); var idx = Number(this.getAttribute('data-col'));
        var h = getHiddenCols(tid).slice();
        if (this.checked) h = h.filter(function(x) { return x !== idx; }); else { if (h.indexOf(idx) === -1) h.push(idx); }
        setHiddenCols(tid, h); applyColVisibility(tid); }); });
    menu.querySelector('.col-menu-reset').addEventListener('click', function() { setHiddenCols(tableId, []); applyColVisibility(tableId); showColMenu(tableId, btn); });
    menu.querySelector('.col-menu-close').addEventListener('click', function() { menu.classList.add('hidden'); });
}
document.addEventListener('click', function(e) { var menu = document.getElementById('col-menu'); if (!menu || menu.classList.contains('hidden')) return;
    if (menu.contains(e.target)) return; if (e.target.closest && e.target.closest('.col-toggle-btn')) return; menu.classList.add('hidden'); });

/* ==================== Sorting ==================== */
var sortState = { vouchers: { col: 'number', dir: 'desc' }, facilities: { col: 'name', dir: 'asc' }, rf: { col: 'name', dir: 'asc' }, rff: { col: 'name', dir: 'asc' } };
function getVoucherAmount(v) { var t = 0; (v.lines || []).forEach(function(l) { t += Number(l.debit) || 0; }); return t; }
function compareVals(a, b) { if (a === undefined || a === null) a = ''; if (b === undefined || b === null) b = '';
    if (typeof a === 'string' && typeof b === 'string') { var na = parseFloat(a), nb = parseFloat(b); if (!isNaN(na) && !isNaN(nb) && a.trim() === String(na) && b.trim() === String(nb)) return na - nb; return a.localeCompare(b, 'fa'); }
    if (typeof a === 'number' && typeof b === 'number') return a - b; return String(a).localeCompare(String(b), 'fa'); }

var tableSortState = DB.load('tableSortState', {});
function saveTableSortState() { DB.save('tableSortState', tableSortState); }
function applySortIndicator(tableId) {
    var table = document.getElementById(tableId); if (!table) return;
    var ths = table.querySelectorAll('thead th[data-sort-key]');
    var st = tableSortState[tableId];
    for (var i = 0; i < ths.length; i++) {
        var ind = ths[i].querySelector('.sort-ind'); if (!ind) continue;
        var k = ths[i].getAttribute('data-sort-key');
        if (st && st.col === k) { ind.textContent = st.dir === 'asc' ? '▲' : '▼'; ind.classList.add('active'); }
        else { ind.textContent = '⇅'; ind.classList.remove('active'); }
    }
}
function attachTableSorting(tableId, rerender) {
    var table = document.getElementById(tableId); if (!table) return;
    var ths = table.querySelectorAll('thead th[data-sortable]');
    for (var i = 0; i < ths.length; i++) {
        (function(th) {
            if (th.dataset.sortAttached) return;
            th.dataset.sortAttached = '1';
            th.addEventListener('click', function(e) {
                if (e.target.classList.contains('col-resizer')) return;
                var k = th.getAttribute('data-sort-key'); if (!k) return;
                var st = tableSortState[tableId] || { col: k, dir: 'asc' };
                if (st.col === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
                else { st.col = k; st.dir = 'asc'; }
                tableSortState[tableId] = st; saveTableSortState();
                rerender();
            });
        })(ths[i]);
    }
}
function applyTableSort(tableId, rows, keyFn) {
    var st = tableSortState[tableId];
    if (!st) return rows;
    var dir = st.dir === 'asc' ? 1 : -1;
    return rows.slice().sort(function(a, b) { return dir * compareVals(keyFn(a, st.col), keyFn(b, st.col)); });
}

/* ==================== Card collapse ==================== */
function makeCardCollapsible(cardEl, key, defaultOpen) {
    if (!cardEl || cardEl.dataset.collapsible === '1') return;
    cardEl.dataset.collapsible = '1';
    var collapsed = state.cardCollapsed[key] === true;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-collapse-btn' + (collapsed ? ' collapsed' : '');
    btn.title = collapsed ? 'باز کردن' : 'جمع کردن';
    btn.textContent = '‹';
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var nowCollapsed = !cardEl.classList.contains('collapsed');
        cardEl.classList.toggle('collapsed', nowCollapsed);
        btn.classList.toggle('collapsed', nowCollapsed);
        btn.title = nowCollapsed ? 'باز کردن' : 'جمع کردن';
        state.cardCollapsed[key] = nowCollapsed;
        DB.save('cardCollapsed', state.cardCollapsed);
    });
    cardEl.appendChild(btn);
    if (collapsed) cardEl.classList.add('collapsed');
}

/* ==================== Widgets ==================== */
function updateTopbarPeriod() { var el = document.getElementById('topbar-period'); if (!el) return;
    var list = DB.load('fiscalPeriods', []); var p = list.find(function(x) { return x.id === state.activePeriodId; });
    el.textContent = p ? p.title : 'دوره: —'; }
function applyWidgetVisibility() {
    var cards = document.querySelectorAll('.widget-card');
    for (var i = 0; i < cards.length; i++) { var w = cards[i].getAttribute('data-widget');
        var enabled = !!state.widgets[w];
        var pageOk = (state.widgetPages[w] || 1) === state.homePage;
        cards[i].classList.toggle('widget-hidden', !enabled || !pageOk);
    }
    var cbs = document.querySelectorAll('[data-widget-toggle]');
    for (var j = 0; j < cbs.length; j++) { var k = cbs[j].getAttribute('data-widget-toggle'); cbs[j].checked = !!state.widgets[k]; }
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
    var box = document.getElementById('home-page-dots'); if (!box) return;
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
    var grid = document.getElementById('home-grid'); if (!grid) return;
    var order = state.widgetOrder || [];
    order.forEach(function(key) {
        var card = grid.querySelector('.widget-card[data-widget="' + key + '"]');
        if (card) grid.appendChild(card);
    });
}
function getBankBalance(bankId) { var vouchers = DB.load('vouchers', []); var total = 0;
    vouchers.forEach(function(v) { (v.lines || []).forEach(function(line) { if (line.details && line.details.bank === bankId) total += (Number(line.debit) || 0) - (Number(line.credit) || 0); }); }); return total; }
function getCashBoxBalance(cbId) { var vouchers = DB.load('vouchers', []); var total = 0;
    vouchers.forEach(function(v) { (v.lines || []).forEach(function(line) { if (line.details && line.details.cashbox === cbId) total += (Number(line.debit) || 0) - (Number(line.credit) || 0); }); }); return total; }
function getBirthdayInfo(birthStr) {
    if (!birthStr) return null; var parts = normalizeDigits(birthStr).split('/').map(Number);
    if (parts.length !== 3 || isNaN(parts[1]) || isNaN(parts[2])) return null;
    var bM = parts[1], bD = parts[2]; if (bM < 1 || bM > 12 || bD < 1 || bD > 31) return null;
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tY = today[0], tM = today[1], tD = today[2];
    var dimThis = daysInJalaliMonth(tY, bM); if (bD > dimThis) return null;
    var daysThis = jalaliDiff(tY, tM, tD, tY, bM, bD);
    var birthYear; if (daysThis >= 0) birthYear = tY; else { birthYear = tY + 1; var dimN = daysInJalaliMonth(birthYear, bM); if (bD > dimN) return null; }
    var g = jalaliToGregorian(birthYear, bM, bD); var dt = new Date(g[0], g[1] - 1, g[2]);
    var dow = WEEKDAYS_FA[dt.getDay()]; var daysRemaining = jalaliDiff(tY, tM, tD, birthYear, bM, bD);
    return { birthMonth: bM, birthDay: bD, dow: dow, daysRemaining: daysRemaining, birthYear: birthYear };
}
function renderBankBalancesWidget() {
    var el = document.getElementById('home-bank-balances'); if (!el) return;
    var banks = DB.load('bankAccounts', []);
    if (banks.length === 0) { el.innerHTML = '<div class="widget-empty">حساب بانکی ثبت نشده.</div>'; return; }
    banks = banks.slice().sort(function(a, b) { var oa = Number(a.order) || 9999, ob = Number(b.order) || 9999; if (oa !== ob) return oa - ob; return (a.bank || '').localeCompare(b.bank || '', 'fa'); });
    var html = '', total = 0, shown = 0;
    for (var i = 0; i < banks.length; i++) { var b = banks[i];
        if (b.status === 'inactive' || b.active === false) continue;
        var bal = getBankBalance(b.id); if (bal === 0) continue; shown++; total += bal;
        var cls = bal > 0 ? 'positive' : 'negative';
        html += '<div class="balance-row"><div class="info"><div class="name">' + esc(b.bank || '—') + '</div><div class="meta">' + (b.branchName ? esc(b.branchName) + ' — ' : '') + toFa(esc(b.account || '—')) + '</div></div><div class="amount ' + cls + '">' + fmtFor(bal, 'widgets') + ' ' + currencyLabel() + '</div></div>'; }
    if (shown === 0) { el.innerHTML = '<div class="widget-empty">حساب با مانده غیرصفر نیست.</div>'; return; }
    html += '<div class="balance-row balance-total"><div class="info"><div class="name">💰 جمع کل</div></div><div class="amount">' + fmtFor(total, 'widgets') + ' ' + currencyLabel() + '</div></div>';
    el.innerHTML = html;
}
function renderCashBalancesWidget() {
    var el = document.getElementById('home-cash-balances'); if (!el) return;
    var cbs = DB.load('cashBoxes', []);
    if (cbs.length === 0) { el.innerHTML = '<div class="widget-empty">صندوقی نیست.</div>'; return; }
    cbs = cbs.slice().sort(function(a, b) { var oa = Number(a.order) || 9999, ob = Number(b.order) || 9999; if (oa !== ob) return oa - ob; return (a.title || '').localeCompare(b.title || '', 'fa'); });
    var html = '', total = 0, shown = 0;
    for (var i = 0; i < cbs.length; i++) { var c = cbs[i];
        if (c.status === 'inactive' || c.active === false) continue;
        var bal = getCashBoxBalance(c.id); if (bal === 0) continue; shown++; total += bal;
        var cls = bal > 0 ? 'positive' : 'negative';
        html += '<div class="balance-row"><div class="info"><div class="name">' + esc(c.title || '—') + '</div><div class="meta">' + esc(c.type || '—') + (c.unit ? ' — ' + esc(c.unit) : '') + '</div></div><div class="amount ' + cls + '">' + fmtFor(bal, 'widgets') + ' ' + currencyLabel() + '</div></div>'; }
    if (shown === 0) { el.innerHTML = '<div class="widget-empty">صندوق با مانده غیرصفر نیست.</div>'; return; }
    html += '<div class="balance-row balance-total"><div class="info"><div class="name">💰 جمع کل</div></div><div class="amount">' + fmtFor(total, 'widgets') + ' ' + currencyLabel() + '</div></div>';
    el.innerHTML = html;
}
function renderBirthdaysWidget() {
    var el = document.getElementById('home-birthdays'); if (!el) return;
    var persons = DB.load('persons', []); var items = [];
    for (var i = 0; i < persons.length; i++) { var p = persons[i]; if (!p.birth) continue; var info = getBirthdayInfo(p.birth); if (!info) continue; items.push({ person: p, info: info }); }
    if (items.length === 0) { el.innerHTML = '<div class="widget-empty">تاریخ تولدی نیست.</div>'; return; }
    items.sort(function(a, b) { return a.info.daysRemaining - b.info.daysRemaining; });
    var html = '';
    for (var k = 0; k < items.length; k++) { var it = items[k]; var p = it.person; var info = it.info;
        var dl, dc = '';
        if (info.daysRemaining === 0) { dl = '🎉 امروز'; dc = 'today'; }
        else if (info.daysRemaining === 1) { dl = 'فردا'; dc = 'soon'; }
        else if (info.daysRemaining <= 7) { dl = toFa(info.daysRemaining) + ' روز دیگر'; dc = 'soon'; }
        else { dl = toFa(info.daysRemaining) + ' روز'; }
        var ds = toFa(pad2(info.birthMonth)) + '/' + toFa(pad2(info.birthDay));
        html += '<div class="birthday-row"><div class="name">' + esc(p.first || '') + ' ' + esc(p.last || '') + '</div><div>' + ds + '</div><div class="dow">' + info.dow + '</div><div class="days ' + dc + '">' + dl + '</div></div>'; }
    el.innerHTML = html;
}
function updateHomeBankTotal() { var el = document.getElementById('home-bank-total'); if (!el) return;
    var banks = DB.load('bankAccounts', []); var total = 0;
    for (var i = 0; i < banks.length; i++) {
        var b = banks[i];
        if (b.status === 'inactive' || b.active === false) continue;
        total += getBankBalance(b.id);
    }
    el.textContent = fmtFor(total, 'widgets') + ' ' + currencyLabel(); }
function updateHomeUpcomingInstallments() {
    var el = document.getElementById('home-upcoming-installments'); if (!el) return;
    var totalEl = document.getElementById('home-upcoming-total'); var totalAmountEl = document.getElementById('home-upcoming-total-amount');
    var facilities = DB.load('facilities', []); var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tY = today[0], tM = today[1], tD = today[2]; var upcoming = []; var totalAmount = 0;
    facilities.forEach(function(f) {
        if (f.status === 'settled' || f.status === 'inactive') return;
        (f.installments || []).forEach(function(inst) {
            if (inst.status === 'paid') return; if (!inst.date) return;
            var p = inst.date.split('/').map(Number); if (p.length !== 3) return;
            var diff = jalaliDiff(tY, tM, tD, p[0], p[1], p[2]);
            if (diff >= 0 && diff <= 3) { upcoming.push({ facility: f, date: inst.date, amount: inst.amount, diff: diff }); totalAmount += Number(inst.amount) || 0; } });
    });
    if (upcoming.length === 0) { el.innerHTML = '<div class="widget-empty">قسطی نیست.</div>'; if (totalEl) totalEl.classList.add('hidden'); return; }
    upcoming.sort(function(a, b) { return a.diff - b.diff; }); var html = '';
    upcoming.forEach(function(u) { var dl = u.diff === 0 ? 'امروز' : (u.diff === 1 ? 'فردا' : toFa(u.diff) + ' روز دیگر');
        html += '<div class="balance-row"><div class="info"><div class="name">' + esc(u.facility.name) + '</div><div class="meta">' + dl + ' — ' + toFa(esc(u.date)) + '</div></div><div class="amount">' + fmtFor(u.amount || 0, 'widgets') + '</div></div>'; });
    el.innerHTML = html;
    if (totalEl && totalAmountEl) { totalEl.classList.remove('hidden'); totalAmountEl.textContent = fmtFor(totalAmount, 'widgets') + ' ' + currencyLabel(); }
}

/* === ✅ Week Calendar Widget با تاریخ میلادی === */
function renderCalendarWidget() {
    var el = document.getElementById('home-cal-widget'); if (!el) return;
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
    /* ✅ نمایش تاریخ شمسی + میلادی */
    var gregNow = new Date();
    var gregMonth = GREG_MONTHS[gregNow.getMonth()];
    var gregDay = gregNow.getDate();
    var gregYear = gregNow.getFullYear();
    html += '<div class="cal-widget-moadel">🌍 ' + JALALI_MONTHS[todayJ[1] - 1] + ' ' + toFa(todayJ[0]) + ' | ' + gregMonth + ' ' + gregDay + ' ' + gregYear + ' — امروز ' + WEEKDAYS_FA[now.getDay()] + '</div>';
    el.innerHTML = html;
}
/* === Checklist widget === */
function renderTodayChecklistWidget() {
    var el = document.getElementById('home-today-checklist'); if (!el) return;
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
    if (filtered.length === 0) { el.innerHTML = '<div class="widget-empty">✅ چک‌لیستی برای نمایش نیست.</div>'; return; }
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
function updateHomeWidgets() {
    applyWidgetOrder(); applyWidgetVisibility();
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

/* ============ Live Rates ============ */
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
        var timer = setTimeout(function() { try { controller.abort(); } catch(e){} reject(new Error('timeout')); }, ms || 8000);
        fetch(url, Object.assign({}, opts || {}, { signal: controller.signal, cache: 'no-store' }))
            .then(function(r) { clearTimeout(timer); resolve(r); })
            .catch(function(e) { clearTimeout(timer); reject(e); });
    });
}
async function tryFetchJson(url, ms) {
    try {
        var res = await fetchWithTimeout(url, { method: 'GET', headers: { 'Accept': 'application/json, text/plain, */*' } }, ms || 8000);
        if (!res.ok) return null;
        var text = await res.text(); if (!text) return null;
        try { return JSON.parse(text); } catch(e) { return null; }
    } catch(e) { return null; }
}
async function tryFetchJsonWithFallback(url, ms) {
    var data = await tryFetchJson(url, ms);
    if (data) return data;
    for (var i = 0; i < CORS_PROXIES.length; i++) {
        try { var proxyUrl = CORS_PROXIES[i](url); data = await tryFetchJson(proxyUrl, (ms || 8000) + 3000); if (data) return data; } catch(e) { }
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
        return fetchFromPriceto(p.asset.priceto).then(function(r) { if (r.value > 0) { p.done = true; p.value = r.value; p.ts = r.ts; } });
    }));
    var stillNeed = pending.filter(function(p) { return !p.done; });
    if (stillNeed.length > 0) {
        var goldData = null, fiatData = null;
        try { goldData = await tryFetchJson(NAVASAN_GOLD_CDN, 9000); } catch(e) {}
        try { fiatData = await tryFetchJson(NAVASAN_FIAT_CDN, 9000); } catch(e) {}
        stillNeed.forEach(function(p) {
            var a = p.asset; var parsed = { value: 0, ts: 0 };
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
    var anyFetched = false; var newValues = {}; var newTimestamps = {};
    var prev = LIVE_RATES_CACHE.values || {}; var prevTs = LIVE_RATES_CACHE.timestamps || {};
    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var key = RATE_ASSETS[i].key; var res = newResults[key] || { value: 0, ts: 0 };
        var val = res.value || 0; var ts = res.ts || 0;
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
    LIVE_RATES_CACHE = { values: newValues, timestamps: newTimestamps, ts: anyFetched ? Date.now() : LIVE_RATES_CACHE.ts, prev: JSON.parse(JSON.stringify(prev)), lastUpdate: lastUpdate };
    DB.save('liveRatesCache', LIVE_RATES_CACHE);
    renderLiveRatesWidget();
    if (meta) meta.textContent = (anyFetched ? '✅ بروزرسانی: ' : '⚠️ آخرین داده ذخیره‌شده: ') + lastUpdate + ' — منبع: Priceto + Navasan';
}
function renderLiveRatesWidget() {
    var box = document.getElementById('home-live-rates'); if (!box) return;
    var c = LIVE_RATES_CACHE;
    if (!c.ts || !c.values) { box.innerHTML = '<div class="widget-empty">داده‌ای موجود نیست.</div>'; return; }
    var html = ''; var prev = c.prev || {}; var anyShown = false;
    var hide = getHideState('widgets');
    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var a = RATE_ASSETS[i]; var val = c.values[a.key] || 0; if (val <= 0) continue;
        anyShown = true;
        var oldV = prev[a.key] || 0; var chg = val - oldV;
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
    } catch (e) {
        for (var j = 0; j < RATE_ASSETS.length; j++) values[RATE_ASSETS[j].key] = (LIVE_RATES_CACHE.values && LIVE_RATES_CACHE.values[RATE_ASSETS[j].key]) || 0;
    }
    return { date: today, values: values, savedAt: Date.now() };
}
async function renderDailyClosePage() {
    var today = todayJalaliStr();
    document.getElementById('dc-date').value = today;
    var data = await fetchDailyClosePrices();
    var box = document.getElementById('dc-result'); if (!box) return;
    var existing = getDailyCloseData().find(function(x) { return x.date === data.date; });
    var values = existing ? existing.values : data.values;
    var hide = getHideState('dc');
    var html = '';
    for (var i = 0; i < RATE_ASSETS.length; i++) {
        var a = RATE_ASSETS[i]; var val = values[a.key] || 0;
        html += '<div class="close-price-row"><span class="cp-name">' + a.label + '</span>' +
            '<input type="text" class="money-input" inputmode="numeric" dir="ltr" value="' + (hide && val ? '' : (val ? formatRaw(val) : '')) + '" data-dc-key="' + a.key + '" style="width:150px;text-align:center;padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:0.85rem;">' +
            '</div>';
    }
    html += '<div class="form-buttons" style="margin-top:14px;justify-content:center"><button id="dc-save-btn" class="btn-primary">💾 ذخیره قیمت‌های پایانی (ریال)</button></div>';
    box.innerHTML = html;
    document.getElementById('dc-count').textContent = toFa(RATE_ASSETS.length) + ' قلم';
    document.getElementById('dc-unit').textContent = 'واحد: ریال';
    var inputs = box.querySelectorAll('[data-dc-key]');
    for (var k = 0; k < inputs.length; k++) { (function(inp) {
        inp.addEventListener('input', function() { var v = normalizeDigits(this.value); var r = v.replace(/[^\d]/g, ''); this.value = r; });
        inp.addEventListener('blur', function() { var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0; this.value = v ? formatRaw(v) : ''; });
    })(inputs[k]); }
    document.getElementById('dc-save-btn').addEventListener('click', saveDailyClosePrices);
    renderDailyCloseHistory();
    autoAttachReportHelpers();
}
function saveDailyClosePrices() {
    var dateInput = document.getElementById('dc-date'); var date = normalizeDigits(dateInput.value.trim());
    if (!date) { alert('تاریخ اجباری است.'); return; }
    var values = {}; var inputs = document.querySelectorAll('#dc-result [data-dc-key]');
    for (var i = 0; i < inputs.length; i++) { var key = inputs[i].getAttribute('data-dc-key'); var raw = normalizeDigits(inputs[i].value).replace(/[^\d]/g, ''); values[key] = Number(raw) || 0; }
    var list = getDailyCloseData(); var idx = list.findIndex(function(x) { return x.date === date; });
    var entry = { date: date, values: values, savedAt: Date.now() };
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    list.sort(function(a, b) { return b.date.localeCompare(a.date); });
    saveDailyCloseData(list);
    showToast('✅ قیمت‌های پایانی ' + toFa(date) + ' ذخیره شد.');
    renderDailyCloseHistory();
}
function renderDailyCloseHistory() {
    var box = document.getElementById('dc-history-list'); if (!box) return;
    var list = getDailyCloseData(); var hide = getHideState('dc');
    if (list.length === 0) { box.innerHTML = '<div class="widget-empty">هنوز قیمتی ذخیره نشده است.</div>'; return; }
    var html = '<div class="table-wrap"><table class="data-table" id="dc-table"><thead><tr><th>تاریخ</th>';
    for (var i = 0; i < RATE_ASSETS.length; i++) html += '<th>' + RATE_ASSETS[i].label.replace(/^[^\s]+\s/, '') + '</th>';
    html += '<th>عملیات</th></tr></thead><tbody>';
    for (var j = 0; j < list.length; j++) {
        var row = list[j];
        html += '<tr><td dir="ltr">' + toFa(esc(row.date)) + '</td>';
        for (var k = 0; k < RATE_ASSETS.length; k++) { var v = (row.values && row.values[RATE_ASSETS[k].key]) || 0; html += '<td class="num">' + (v && !hide ? formatRial(v) : '—') + '</td>'; }
        html += '<td><div class="row-actions"><button class="row-btn edit" data-dc-edit="' + row.date + '">✎</button><button class="row-btn del" data-dc-del="' + row.date + '">×</button></div></td></tr>';
    }
    html += '</tbody></table></div>';
    box.innerHTML = html;
    var editBtns = box.querySelectorAll('[data-dc-edit]');
    for (var e = 0; e < editBtns.length; e++) editBtns[e].addEventListener('click', function() {
        var date = this.getAttribute('data-dc-edit');
        var entry = getDailyCloseData().find(function(x) { return x.date === date; }); if (!entry) return;
        document.getElementById('dc-date').value = entry.date;
        var inputs = document.querySelectorAll('#dc-result [data-dc-key]');
        for (var ii = 0; ii < inputs.length; ii++) { var key = inputs[ii].getAttribute('data-dc-key'); var v = entry.values[key] || 0; inputs[ii].value = v ? formatRaw(v) : ''; }
        showToast('📝 ویرایش کنید و ذخیره کنید.');
    });
    var delBtns = box.querySelectorAll('[data-dc-del]');
    for (var d = 0; d < delBtns.length; d++) delBtns[d].addEventListener('click', function() {
        var date = this.getAttribute('data-dc-del'); if (!confirm('حذف قیمت‌های پایانی ' + toFa(date) + '؟')) return;
        var newList = getDailyCloseData().filter(function(x) { return x.date !== date; });
        saveDailyCloseData(newList); renderDailyCloseHistory(); showToast('🗑 حذف شد.');
    });
    autoAttachReportHelpers();
}
async function runRatesReport() {
    var asset = document.getElementById('rr-asset').value; var range = document.getElementById('rr-range').value;
    var box = document.getElementById('rr-result'); var hide = getHideState('rr');
    var days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    var allData = getDailyCloseData();
    if (allData.length === 0) {
        box.innerHTML = '<div class="widget-empty">در حال دریافت داده اولیه...</div>';
        var live = await fetchAllRates();
        var todayStr = todayJalaliStr(); var firstValues = {};
        for (var i = 0; i < RATE_ASSETS.length; i++) { var k = RATE_ASSETS[i].key; firstValues[k] = (live[k] && live[k].value) || 0; }
        var newList = [{ date: todayStr, values: firstValues, savedAt: Date.now() }];
        saveDailyCloseData(newList); allData = newList;
    }
    var cutoffTs = Date.now() - days * 24 * 60 * 60 * 1000;
    var points = allData.filter(function(x) {
        var parts = x.date.split('/').map(Number); if (parts.length !== 3) return false;
        var g = jalaliToGregorian(parts[0], parts[1], parts[2]);
        var ts = new Date(g[0], g[1] - 1, g[2]).getTime();
        return ts >= cutoffTs;
    });
    points.sort(function(a, b) { return a.date.localeCompare(b.date); });
    if (points.length === 0) {
        box.innerHTML = '<div class="widget-empty">داده‌ای در این بازه وجود ندارد.</div>';
        document.getElementById('rr-count').textContent = '۰'; return;
    }
    var html = '<div class="table-wrap"><table class="report-table" id="rr-table"><thead><tr><th>#</th><th>تاریخ</th><th>قیمت (ریال)</th><th>تغییر</th><th>درصد</th></tr></thead><tbody>';
    var prev = null;
    for (var j = 0; j < points.length; j++) {
        var p = points[j]; var price = (p.values && p.values[asset]) || 0;
        var change = prev !== null ? price - prev : 0; var pct = prev ? (change / prev * 100) : 0;
        var chgCls = change > 0 ? 'cr' : (change < 0 ? 'dr' : '');
        var sign = change > 0 ? '+' : '';
        html += '<tr><td class="num">' + toFa(j + 1) + '</td><td dir="ltr">' + toFa(esc(p.date)) + '</td><td class="num" style="font-weight:bold">' + (hide ? '—' : formatRial(price)) + '</td><td class="num ' + chgCls + '">' + (!hide && prev !== null ? sign + formatRial(change) : '—') + '</td><td class="num ' + chgCls + '">' + (!hide && prev !== null ? sign + toFa(Math.abs(pct).toFixed(2)) + '٪' : '—') + '</td></tr>';
        prev = price;
    }
    html += '</tbody></table></div>';
    box.innerHTML = html;
    document.getElementById('rr-count').textContent = toFa(points.length) + ' ردیف';
    var unitEl = document.getElementById('rr-unit'); if (unitEl) unitEl.textContent = 'واحد: ریال';
    autoAttachReportHelpers();
}

/* ==================== Dashboard ==================== */
var CHART_COLORS = ['#4a90e2','#22a06b','#e8a33d','#e5484d','#8b5cf6','#06b6d4','#f59e0b','#ec4899','#14b8a6','#f97316'];
function getPeriodMonthRange() {
    var d = new Date(); var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var y = j[0], m = j[1];
    var from = y + '/' + pad2(m) + '/01';
    var to = y + '/' + pad2(m) + '/' + pad2(daysInJalaliMonth(y, m));
    return { from: from, to: to, year: y, month: m };
}
function getLastNMonths(n) {
    var d = new Date(); var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var y = j[0], m = j[1]; var out = [];
    for (var i = n - 1; i >= 0; i--) { var cm = m - i, cy = y; while (cm < 1) { cm += 12; cy--; } out.push({ year: cy, month: cm, label: getJalaliMonthName(cm) + ' ' + String(cy).slice(-2) }); }
    return out;
}
function getRootAccountId(accId, accounts) {
    var acc = accounts.find(function(a) { return a.id === accId; }); if (!acc) return '';
    while (acc.parent) { acc = accounts.find(function(a) { return a.id === acc.parent; }); if (!acc) break; }
    return acc ? acc.id : '';
}
function renderDashboard() {
    var accounts = DB.load('accounts', []);
    var vouchers = DB.load('vouchers', []).filter(function(v) { return v.status === 'approved'; });
    var banks = DB.load('bankAccounts', []); var cashBoxes = DB.load('cashBoxes', []);
    var pr = getPeriodMonthRange();
    var totalBank = 0; banks.forEach(function(b) { totalBank += getBankBalance(b.id); });
    var totalCash = 0; cashBoxes.forEach(function(c) { totalCash += getCashBoxBalance(c.id); });
    var liquidity = totalBank + totalCash;
    var hide = getHideState('dashboard');
    var liqEl = document.getElementById('dash-liquidity'); if (liqEl) liqEl.textContent = (hide ? '—' : formatMoney(liquidity)) + ' ' + currencyLabel();
    var liqSubEl = document.getElementById('dash-liquidity-sub'); if (liqSubEl) liqSubEl.textContent = 'بانک: ' + (hide ? '—' : formatMoney(totalBank)) + ' | صندوق: ' + (hide ? '—' : formatMoney(totalCash));
    var monthVouchers = vouchers.filter(function(v) { return v.date >= pr.from && v.date <= pr.to; });
    var incomeAmt = 0, expenseAmt = 0;
    monthVouchers.forEach(function(v) { (v.lines || []).forEach(function(l) {
        if (!l.account) return; var rootId = getRootAccountId(l.account, accounts);
        var root = accounts.find(function(a) { return a.id === rootId; }); if (!root) return;
        var codeRoot = String(root.code || '').charAt(0);
        var d = Number(l.debit) || 0, c = Number(l.credit) || 0;
        if (codeRoot === '4') incomeAmt += c; else if (codeRoot === '5') expenseAmt += d;
    }); });
    var incEl = document.getElementById('dash-income'); if (incEl) incEl.textContent = hide ? '—' : formatMoney(incomeAmt);
    var expEl = document.getElementById('dash-expense'); if (expEl) expEl.textContent = hide ? '—' : formatMoney(expenseAmt);
    var profit = incomeAmt - expenseAmt;
    var prEl = document.getElementById('dash-profit'); if (prEl) { prEl.textContent = hide ? '—' : formatMoney(profit); prEl.className = 'kpi-val ' + (profit >= 0 ? 'positive' : 'negative'); }
    var incSub = document.getElementById('dash-income-sub'); if (incSub) incSub.textContent = getJalaliMonthName(pr.month) + ' ' + toFa(pr.year);
    var expSub = document.getElementById('dash-expense-sub'); if (expSub) expSub.textContent = getJalaliMonthName(pr.month) + ' ' + toFa(pr.year);
    var prSub = document.getElementById('dash-profit-sub'); if (prSub) prSub.textContent = profit >= 0 ? '✅ سود' : '⚠️ زیان';
    var expByGroup = {};
    vouchers.forEach(function(v) { (v.lines || []).forEach(function(l) {
        if (!l.account) return; var d = Number(l.debit) || 0; if (d === 0) return;
        var rootId = getRootAccountId(l.account, accounts);
        var root = accounts.find(function(a) { return a.id === rootId; });
        if (!root || String(root.code || '').charAt(0) !== '5') return;
        var acc = accounts.find(function(a) { return a.id === l.account; });
        var lvl2 = acc;
        while (lvl2 && lvl2.parent && accounts.find(function(a) { return a.id === lvl2.parent; }).parent) { lvl2 = accounts.find(function(a) { return a.id === lvl2.parent; }); }
        var key = lvl2 ? lvl2.name : (root ? root.name : 'سایر');
        expByGroup[key] = (expByGroup[key] || 0) + d;
    }); });
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
        vouchers.forEach(function(v) { if (v.date < mFrom || v.date > mTo) return; (v.lines || []).forEach(function(l) {
            if (!l.account) return; var rootId = getRootAccountId(l.account, accounts); var root = accounts.find(function(a) { return a.id === rootId; }); if (!root) return;
            var codeRoot = String(root.code || '').charAt(0); var d = Number(l.debit) || 0, c = Number(l.credit) || 0;
            if (codeRoot === '4') inc += c; else if (codeRoot === '5') exp += d;
        }); });
        return { label: mo.label, income: inc, expense: exp };
    });
    renderBarChart('dash-trend', monthStats, hide);
    var expByMoein = {};
    vouchers.forEach(function(v) { (v.lines || []).forEach(function(l) {
        if (!l.account) return; var d = Number(l.debit) || 0; if (d === 0) return;
        var acc = accounts.find(function(a) { return a.id === l.account; }); if (!acc) return;
        if (String(acc.code || '').charAt(0) !== '5') return;
        var key = acc.name;
        expByMoein[key] = (expByMoein[key] || 0) + d;
    }); });
    var topArr = Object.keys(expByMoein).map(function(k) { return { name: k, val: expByMoein[k] }; }).sort(function(a, b) { return b.val - a.val; }).slice(0, 10);
    var topEl = document.getElementById('dash-top-exp');
    if (topEl) {
        if (topArr.length === 0) topEl.innerHTML = '<div class="widget-empty">هزینه‌ای ثبت نشده.</div>';
        else {
            var h = '<div class="top-exp-list">';
            topArr.forEach(function(x, i) { h += '<div class="top-exp-item"><div class="rank">' + toFa(i + 1) + '</div><div class="name">' + esc(x.name) + '</div><div class="amt">' + (hide ? '—' : formatMoney(x.val)) + ' ' + currencyLabel() + '</div></div>'; });
            h += '</div>';
            topEl.innerHTML = h;
        }
    }
}
function renderDonutChart(containerId, dataObj, title, hide) {
    var el = document.getElementById(containerId); if (!el) return;
    var entries = Object.keys(dataObj).map(function(k) { return { label: k, value: dataObj[k] }; }).filter(function(x) { return x.value > 0; }).sort(function(a, b) { return b.value - a.value; });
    if (entries.length === 0) { el.innerHTML = '<div class="widget-empty">داده‌ای برای نمایش نیست.</div>'; return; }
    var total = entries.reduce(function(s, x) { return s + x.value; }, 0);
    var size = 200, radius = 70, cx = size / 2, cy = size / 2, stroke = 32;
    var circumference = 2 * Math.PI * radius;
    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="flex-shrink:0">';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="' + stroke + '" />';
    var cum = 0;
    for (var i = 0; i < entries.length; i++) {
        var p = entries[i].value / total; var arcLen = p * circumference;
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
    var el = document.getElementById(containerId); if (!el) return;
    if (!data || data.length === 0) { el.innerHTML = '<div class="widget-empty">داده‌ای برای نمایش نیست.</div>'; return; }
    var maxVal = 0; data.forEach(function(d) { if (d.income > maxVal) maxVal = d.income; if (d.expense > maxVal) maxVal = d.expense; });
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

/* ==================== Widget Order + Page UI ==================== */
function renderWidgetOrderUI() {
    var box = document.getElementById('widget-order-list'); if (!box) return;
    var names = { calendar:'📅 تقویم', todayChecklist:'✅ چک‌لیست', bankTotal:'🏦 مانده کل بانک', bankBalances:'🏦 مانده حساب‌ها', cashBalances:'💰 صندوق‌ها', upcomingInstallments:'⏰ اقساط ۳ روز آینده', birthdays:'🎂 تولدها', liveRates:'💱 نرخ لحظه‌ای ارز و طلا' };
    var order = state.widgetOrder || []; box.innerHTML = '';
    order.forEach(function(key, idx) {
        var row = document.createElement('div'); row.className = 'widget-order-row';
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
            var key = this.getAttribute('data-key'); var dir = Number(this.getAttribute('data-dir'));
            var arr = state.widgetOrder.slice(); var i = arr.indexOf(key); var j = i + dir;
            if (j < 0 || j >= arr.length) return;
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            state.widgetOrder = arr; DB.save('widgetOrder', arr);
            updateHomeWidgets(); renderWidgetOrderUI();
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

/* ==================== Templates ==================== */
function refreshTemplateSelect() { var sel = document.getElementById('v-template'); if (!sel) return;
    var list = DB.load('voucherTemplates', []); sel.innerHTML = '<option value="">— بدون الگو —</option>';
    for (var i = 0; i < list.length; i++) { var o = document.createElement('option'); o.value = list[i].id;
        var hasAmount = (list[i].lines || []).some(function(l){ return l.fixedAmount; });
        o.textContent = list[i].name + (hasAmount ? ' (آماده)' : ''); sel.appendChild(o); } }
function findAccountByNameHint(hint) { if (!hint) return ''; var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
    var q = hint.toLowerCase();
    var ex = leaves.find(function(a) { return (a.name || '').toLowerCase() === q; }); if (ex) return ex.id;
    var pa = leaves.find(function(a) { return (a.name || '').toLowerCase().indexOf(q) !== -1; }); if (pa) return pa.id; return ''; }
function applyTemplate(tplId) { var list = DB.load('voucherTemplates', []); var t = list.find(function(x) { return x.id === tplId; }); if (!t) return;
    voucherLines = [];
    for (var i = 0; i < (t.lines || []).length; i++) { var tl = t.lines[i]; var accId = tl.account || findAccountByNameHint(tl.nameHint) || ''; var amt = Number(tl.fixedAmount) || 0;
        voucherLines.push({ id: uid(), account: accId, details: tl.details ? JSON.parse(JSON.stringify(tl.details)) : {}, debit: (tl.side === 'debit') ? amt : 0, credit: (tl.side === 'credit') ? amt : 0, description: tl.desc || '' }); }
    if (voucherLines.length === 0) voucherLines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
    if (t.desc && !document.getElementById('v-desc').value.trim()) document.getElementById('v-desc').value = t.desc;
    renderVoucherLines(); showToast('✅ الگو اعمال شد.'); }
function saveVoucherAsTemplate() { var valid = voucherLines.filter(function(l) { return l.account; }); if (valid.length === 0) { alert('ابتدا حساب انتخاب کن.'); return; }
    var name = prompt('نام الگو:'); if (!name) return; name = name.trim(); if (!name) return;
    var tplDesc = document.getElementById('v-desc').value.trim();
    var tpl = { id: uid(), name: name, desc: tplDesc, lines: valid.map(function(l) { var amt = Number(l.debit) > 0 ? Number(l.debit) : Number(l.credit); return { account: l.account, details: l.details || {}, desc: l.description || '', side: (Number(l.debit) > 0 ? 'debit' : 'credit'), fixedAmount: amt || 0 }; }) };
    var list = DB.load('voucherTemplates', []); list.push(tpl); DB.save('voucherTemplates', list);
    refreshTemplateSelect(); renderTemplateList(); showToast('✅ ذخیره شد.'); }
var templateLines = [];
function addDescriptionToStandard(desc, silent) {
    if (!desc || !desc.trim()) { if (!silent) alert('شرح خالی است.'); return false; }
    var v = desc.trim(); var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
    if (l.indexOf(v) !== -1) { if (!silent) showToast('قبلاً در لیست است.'); return false; }
    l.push(v); DB.save('standardDescriptions', l);
    refreshStdDescDatalist(); renderStdDescChips();
    if (!silent) showToast('✅ اضافه شد.');
    return true;
}
function renderTemplateLines() {
    var box = document.getElementById('tpl-lines'); if (!box) return; box.innerHTML = '';
    if (templateLines.length === 0) templateLines.push({ side: 'debit', account: '', details: {}, desc: '', fixedAmount: 0 });
    var leaves = getLeafAccounts(); var accounts = DB.load('accounts', []);
    for (var i = 0; i < templateLines.length; i++) { (function(idx) {
        var ln = templateLines[idx]; if (!ln.details) ln.details = {};
        var wrap = document.createElement('div'); wrap.className = 'voucher-line';
        var numSpan = document.createElement('span'); numSpan.className = 'ln-num'; numSpan.textContent = '#' + toFa(idx + 1); wrap.appendChild(numSpan);
        var row1 = document.createElement('div'); row1.style.paddingTop = '14px'; row1.style.display = 'grid'; row1.style.gridTemplateColumns = '1fr 1fr'; row1.style.gap = '8px';
        var selSide = document.createElement('select'); selSide.innerHTML = '<option value="debit">بدهکار</option><option value="credit">بستانکار</option>'; selSide.value = ln.side || 'debit'; selSide.addEventListener('change', function() { ln.side = this.value; }); row1.appendChild(selSide);
        var inpF = document.createElement('input'); inpF.type = 'text'; inpF.inputMode = 'numeric'; inpF.dir = 'ltr'; inpF.placeholder = 'مبلغ ثابت';
        inpF.value = ln.fixedAmount ? formatRaw(ln.fixedAmount) : '';
        inpF.addEventListener('input', function() { var val = normalizeDigits(this.value); var raw = val.replace(/[^\d]/g, ''); this.value = raw; ln.fixedAmount = Number(raw) || 0; });
        inpF.addEventListener('blur', function() { var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0; this.value = v ? formatRaw(v) : ''; ln.fixedAmount = v; });
        row1.appendChild(inpF); wrap.appendChild(row1);
        var row2 = document.createElement('div'); row2.style.marginTop = '8px';
        var selAcc = document.createElement('select'); selAcc.innerHTML = '<option value="">— حساب —</option>';
        for (var k = 0; k < leaves.length; k++) { var o = document.createElement('option'); o.value = leaves[k].id; o.textContent = getAccountLabel(leaves[k].id, accounts); if (ln.account === leaves[k].id) o.selected = true; selAcc.appendChild(o); }
        selAcc.addEventListener('change', function() { ln.account = this.value; ln.details = {}; renderTemplateLines(); }); row2.appendChild(selAcc); wrap.appendChild(row2);
        var acc = accounts.find(function(a) { return a.id === ln.account; });
        if (acc && acc.links && acc.links.length > 0) {
            for (var li = 0; li < acc.links.length; li++) { var lt = acc.links[li]; var items = getLinkedItems(lt); if (items.length === 0) continue;
                var rE = document.createElement('div'); rE.style.display = 'grid'; rE.style.gridTemplateColumns = 'auto 1fr'; rE.style.gap = '8px'; rE.style.marginTop = '8px';
                var lbl = document.createElement('div'); lbl.style.cssText = 'font-size:0.75rem;color:#888;align-self:center'; lbl.textContent = linkTypeName(lt) + ':'; rE.appendChild(lbl);
                var selD = document.createElement('select'); buildOptionsInto(selD, items, function(it) { return getLinkedItemLabel(lt, it); }, ln.details[lt] || '', '— ' + linkTypeName(lt) + ' —');
                (function(ltype, sR) { sR.addEventListener('change', function() { ln.details[ltype] = this.value; }); })(lt, selD);
                rE.appendChild(selD); wrap.appendChild(rE); } }
        var row3 = document.createElement('div'); row3.className = 'desc-row'; row3.style.marginTop = '8px';
        var inpD = document.createElement('input'); inpD.type = 'text'; inpD.placeholder = 'شرح'; inpD.value = ln.desc || ''; inpD.setAttribute('list', 'std-desc-list');
        inpD.addEventListener('input', function() { ln.desc = this.value; }); row3.appendChild(inpD);
        var btnAdd = document.createElement('button'); btnAdd.type = 'button'; btnAdd.className = 'desc-add-btn'; btnAdd.textContent = '＋';
        btnAdd.addEventListener('click', function() { addDescriptionToStandard(inpD.value); }); row3.appendChild(btnAdd); wrap.appendChild(row3);
        var actWrap = document.createElement('div'); actWrap.className = 'ln-actions';
        var bU = document.createElement('button'); bU.className = 'ln-btn'; bU.textContent = '↑'; if (idx === 0) bU.disabled = true;
        bU.addEventListener('click', function() { var tmp = templateLines[idx]; templateLines[idx] = templateLines[idx-1]; templateLines[idx-1] = tmp; renderTemplateLines(); });
        var bD = document.createElement('button'); bD.className = 'ln-btn'; bD.textContent = '↓'; if (idx === templateLines.length - 1) bD.disabled = true;
        bD.addEventListener('click', function() { var tmp = templateLines[idx]; templateLines[idx] = templateLines[idx+1]; templateLines[idx+1] = tmp; renderTemplateLines(); });
        var bX = document.createElement('button'); bX.className = 'ln-btn ln-del'; bX.textContent = '× حذف';
        bX.addEventListener('click', function() { templateLines.splice(idx, 1); renderTemplateLines(); });
        actWrap.appendChild(bU); actWrap.appendChild(bD); actWrap.appendChild(bX); wrap.appendChild(actWrap); box.appendChild(wrap);
    })(i); }
}
function renderTemplateList() {
    var list = DB.load('voucherTemplates', []); var box = document.getElementById('tpl-list-body'); if (!box) return; box.innerHTML = '';
    if (list.length === 0) { box.innerHTML = '<p class="muted" style="text-align:center;padding:16px">الگویی نیست.</p>'; document.getElementById('tpl-count').textContent = '۰'; return; }
    for (var i = 0; i < list.length; i++) { (function(t) {
        var row = document.createElement('div'); row.className = 'tpl-row';
        var lc = (t.lines || []).length; var ha = (t.lines || []).some(function(l){ return l.fixedAmount; });
        var sub = toFa(lc) + ' قلم' + (ha ? ' — دارای مبلغ' : '');
        row.innerHTML = '<div style="flex:1;min-width:0"><div class="tpl-name">' + esc(t.name) + '</div><div class="tpl-desc">' + sub + '</div></div><div class="row-actions"><button class="row-btn open tpl-use" data-id="' + t.id + '">⚡</button><button class="row-btn edit tpl-edit" data-id="' + t.id + '">✎</button><button class="row-btn del tpl-del" data-id="' + t.id + '">×</button></div>';
        box.appendChild(row);
    })(list[i]); }
    document.getElementById('tpl-count').textContent = toFa(list.length);
    var uses = box.querySelectorAll('.tpl-use'), edits = box.querySelectorAll('.tpl-edit'), dels = box.querySelectorAll('.tpl-del');
    for (var u = 0; u < uses.length; u++) uses[u].addEventListener('click', function() { var id = this.getAttribute('data-id'); goToPage('voucher-new'); if (voucherLines.length === 0 || currentVoucherStatus === 'approved') newVoucherForm(); applyTemplate(id); });
    for (var e = 0; e < edits.length; e++) edits[e].addEventListener('click', function() {
        var id = this.getAttribute('data-id'); var t = DB.load('voucherTemplates', []).find(function(x) { return x.id === id; }); if (!t) return;
        document.getElementById('tpl-id').value = t.id; document.getElementById('tpl-name').value = t.name || ''; document.getElementById('tpl-desc').value = t.desc || '';
        templateLines = JSON.parse(JSON.stringify(t.lines || [])); renderTemplateLines(); document.querySelector('[data-tab="tpl-add"]').click(); });
    for (var d = 0; d < dels.length; d++) dels[d].addEventListener('click', function() {
        if (!confirm('حذف شود؟')) return; var id = this.getAttribute('data-id');
        var l2 = DB.load('voucherTemplates', []).filter(function(x) { return x.id !== id; });
        DB.save('voucherTemplates', l2); renderTemplateList(); refreshTemplateSelect(); });
}
function renderStdDescChips() {
    var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
    var box = document.getElementById('std-desc-chips'); if (!box) return; box.innerHTML = '';
    for (var i = 0; i < list.length; i++) { (function(idx) { var chip = document.createElement('span'); chip.className = 'chip'; chip.innerHTML = esc(list[idx]) + ' <button class="chip-del" data-i="' + idx + '">×</button>'; box.appendChild(chip); })(i); }
    var dels = box.querySelectorAll('.chip-del');
    for (var j = 0; j < dels.length; j++) dels[j].addEventListener('click', function() {
        var idx = Number(this.getAttribute('data-i')); var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
        l.splice(idx, 1); DB.save('standardDescriptions', l); renderStdDescChips(); refreshStdDescDatalist(); });
}
function refreshStdDescDatalist() {
    var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
    var dl = document.getElementById('std-desc-list'); if (!dl) return; dl.innerHTML = '';
    for (var i = 0; i < list.length; i++) { var o = document.createElement('option'); o.value = list[i]; dl.appendChild(o); }
}
function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('show'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); }
function closeSettings() { document.getElementById('settings-modal').classList.remove('show'); document.getElementById('settings-overlay').classList.remove('show'); }

function goToPage(name) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    var target = document.getElementById('page-' + name); if (target) target.classList.add('active');
    var btns = document.querySelectorAll('.nav-group-items button');
    for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', btns[j].getAttribute('data-page') === name);
    closeSidebar();
    trackFormUsage(name);
    if (name === 'chart-define') renderChartTree('chart-tree', true);
    if (name === 'voucher-list') { refreshPeriodFilters(); renderVoucherList(); }
    if (name === 'voucher-new') { refreshTemplateSelect(); if (voucherLines.length === 0) newVoucherForm(); else renderVoucherLines(); }
    if (name === 'templates') { renderTemplateList(); renderTemplateLines(); renderStdDescChips(); refreshStdDescDatalist(); }
    if (name === 'notes') { renderNotesList(); }
    if (name === 'sms') { renderSmsInbox(); updateSmsBadge(); checkClipboardSupport(); }
    if (name === 'fiscal') renderFiscalList();
    if (name === 'persons') renderPersonsList();
    if (name === 'companies') renderCompaniesList();
    if (name === 'bank-accounts') { renderBankAccountsList(); refreshBankTypeSelect(); }
    if (name === 'cash-boxes') { renderCashBoxesList(); refreshCashTypeSelect(); }
    if (name === 'projects') renderProjectsList();
    if (name === 'estimate-daily') { refreshEstPeriodSelect(); renderEstimateList(); }
    if (name === 'cashflow-sources') { refreshCfsMoeinSelect(); renderCfsList(); }
    if (name === 'facilities') { renderFacilitiesList(); refreshFacBankSelect(); }
    if (name === 'dashboard') renderDashboard();
    if (name === 'report-cashflow') { if (!document.getElementById('cf-from').value) { var t = todayJalaliStr(); document.getElementById('cf-from').value = t; document.getElementById('cf-to').value = addJalaliDays(t, 30); } runCashFlowReport(); }
    if (name === 'report-cashflow-desc') { if (!document.getElementById('cfd-from').value) { var t2 = todayJalaliStr(); document.getElementById('cfd-from').value = t2; document.getElementById('cfd-to').value = addJalaliDays(t2, 30); } runCashFlowByDescReport(); }
    if (name === 'report-account') { refreshReportPeriodSelects(); updateUnitChips(); }
    if (name === 'report-trial') { refreshReportPeriodSelects(); updateUnitChips(); }
    if (name === 'report-incomplete') { refreshReportPeriodSelects(); updateUnitChips(); runIncompleteReport(); }
    if (name === 'report-facility') { runFacilityReport(); }
    if (name === 'report-facility-full') { refreshRffBankSelect(); runFacilityFullReport(); }
    if (name === 'report-rates') { runRatesReport(); }
    if (name === 'daily-close') { renderDailyClosePage(); }
    if (name === 'home') { updateHomeWidgets(); }
    attachDatePickers(); updateTopbarPeriod(); applyColVisibilityAll(); makeAllTablesResizable(); buildHeaderButtons(); updateEyeButtons();
}
function updateUnitChips() { ['ra-unit','rt-unit','rf-unit','ri-unit','rff-unit','cf-unit','cfd-unit','rr-unit','dc-unit'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = 'واحد: ' + currencyLabel(); }); }
function applyTheme(theme) { document.body.classList.remove('theme-sky','theme-beige','theme-jade','theme-ocean','theme-sunset','theme-forest','theme-midnight','theme-glass3d','theme-neu3d','theme-cyber3d','theme-gold3d'); document.body.classList.add('theme-' + theme);
    var c = document.querySelectorAll('.theme-card'); for (var i = 0; i < c.length; i++) c[i].classList.toggle('active', c[i].getAttribute('data-theme') === theme); }
function applyFont(font) { document.body.classList.remove('font-bnazanin','font-bsans','font-tahoma'); document.body.classList.add('font-' + font);
    var c = document.querySelectorAll('.font-card'); for (var i = 0; i < c.length; i++) c[i].classList.toggle('active', c[i].getAttribute('data-font') === font); }
function renderChips(cid, arr, sk) {
    var box = document.getElementById(cid); if (!box) return; box.innerHTML = '';
    for (var i = 0; i < arr.length; i++) { var chip = document.createElement('span'); chip.className = 'chip'; chip.innerHTML = esc(arr[i]) + ' <button class="chip-del" data-i="' + i + '">×</button>'; box.appendChild(chip); }
    var d = box.querySelectorAll('.chip-del');
    for (var j = 0; j < d.length; j++) d[j].addEventListener('click', function() { var idx = Number(this.getAttribute('data-i')); state[sk].splice(idx, 1); saveState(sk); renderChips(cid, state[sk], sk); });
}
function setupTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function() {
        var tn = this.getAttribute('data-tab'); if (!tn) return;
        var parent = this.parentElement;
        var tbs = parent.querySelectorAll('.tab-btn'); for (var j = 0; j < tbs.length; j++) tbs[j].classList.remove('active'); this.classList.add('active');
        var sec = parent.parentElement; var cs = sec.querySelectorAll('.tab-content'); for (var k = 0; k < cs.length; k++) cs[k].classList.remove('active');
        var target = document.getElementById('tab-' + tn); if (target) target.classList.add('active');
        attachDatePickers();
    });
}
function downloadBackup() {
    var data = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(LS_PREFIX) === 0) data[k] = localStorage.getItem(k); }
    var backup = { app:'parsis', version: APP_VERSION, exportedAt: new Date().toISOString(), data: data };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' }); var url = URL.createObjectURL(blob);
    var now = new Date(); var dateStr = todayJalaliStr().replace(/\//g, '-'); var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
    var a = document.createElement('a'); a.href = url; a.download = 'parsis-' + dateStr + '_' + timeStr + '.json'; a.click(); URL.revokeObjectURL(url);
}
function restoreBackup(file) {
    var reader = new FileReader();
    reader.onload = function(e) { try { var parsed = JSON.parse(e.target.result); var data = parsed.data || parsed;
        if (!confirm('⚠️ جایگزین شود؟')) return; var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) if (keys[i].indexOf(LS_PREFIX) === 0) localStorage.setItem(keys[i], data[keys[i]]);
        alert('✅ بازیابی شد.'); location.reload(); } catch(err) { alert('❌ ' + err.message); } };
    reader.readAsText(file);
}
function resetAllData() { var pwd = prompt('رمز ریست:'); if (pwd === null) return; if (String(pwd).trim() !== '1234') { alert('رمز اشتباه.'); return; }
    if (!confirm('⚠️ همه داده‌ها پاک شود؟')) return;
    var ks = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(LS_PREFIX) === 0) ks.push(k); }
    ks.forEach(function(k) { localStorage.removeItem(k); }); alert('✅'); location.reload(); }

/* ==================== Lists ==================== */
function renderFiscalList() {
    var list = DB.load('fiscalPeriods', []); var filter = (document.getElementById('fiscal-filter').value || '').toLowerCase();
    var tb = document.getElementById('fiscal-list-body'); if (!tb) return; tb.innerHTML = ''; var shown = 0;
    var filtered = list.filter(function(p) { if (filter && (p.title || '').toLowerCase().indexOf(filter) === -1) return false; return true; });
    filtered = applyTableSort('fiscal-table', filtered, function(p, k) { if (k === 'title') return p.title || ''; if (k === 'from') return p.from || ''; if (k === 'to') return p.to || ''; return ''; });
    for (var i = 0; i < filtered.length; i++) { var p = filtered[i]; shown++;
        var tr = document.createElement('tr'); var isA = state.activePeriodId === p.id;
        var ab = isA ? '<span class="badge badge-approved">✓ فعال</span>' : '<button class="row-btn approve" data-id="' + p.id + '">فعال</button>';
        tr.innerHTML = '<td><strong>' + esc(p.title) + '</strong></td><td dir="ltr">' + toFa(esc(p.from)) + '</td><td dir="ltr">' + toFa(esc(p.to)) + '</td><td>' + ab + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + p.id + '">✎</button><button class="row-btn del" data-id="' + p.id + '">×</button></div></td>';
        tb.appendChild(tr); }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="5" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('fiscal-count').textContent = toFa(shown);
    attachRowActions(tb, 'fiscalPeriods', renderFiscalList, function(p) {
        document.getElementById('fiscal-id').value = p.id; document.getElementById('fiscal-title').value = p.title;
        document.getElementById('fiscal-from').value = p.from; document.getElementById('fiscal-to').value = p.to;
        document.querySelector('[data-tab="fiscal-add"]').click(); });
    var acts = tb.querySelectorAll('.row-btn.approve');
    for (var a = 0; a < acts.length; a++) acts[a].addEventListener('click', function() { state.activePeriodId = this.getAttribute('data-id'); saveState('activePeriodId'); renderFiscalList(); updateTopbarPeriod(); });
    applyColVisibility('fiscal-table'); makeTableResizable(document.getElementById('fiscal-table')); attachTableSorting('fiscal-table', renderFiscalList); applySortIndicator('fiscal-table');
}
function refreshPeriodFilters() { var list = DB.load('fiscalPeriods', []); var sel = document.getElementById('vl-period-filter'); if (!sel) return; var v = sel.value;
    sel.innerHTML = '<option value="">همه دوره‌ها</option>';
    for (var i = 0; i < list.length; i++) { var o = document.createElement('option'); o.value = list[i].id; o.textContent = list[i].title; sel.appendChild(o); } sel.value = v; }
function attachRowActions(tb, sk, rf, ef) {
    var eds = tb.querySelectorAll('.row-btn.edit'), dls = tb.querySelectorAll('.row-btn.del');
    for (var j = 0; j < eds.length; j++) eds[j].addEventListener('click', function() {
        var id = this.getAttribute('data-id'); var list = DB.load(sk); var item = list.find(function(x) { return x.id === id; }); if (item) ef(item); });
    for (var k = 0; k < dls.length; k++) dls[k].addEventListener('click', function() {
        if (!confirm('حذف شود؟')) return; var id = this.getAttribute('data-id');
        var list = DB.load(sk); list = list.filter(function(x) { return x.id !== id; }); DB.save(sk, list); rf(); updateHomeWidgets(); });
}
function renderPersonsList() {
    var list = DB.load('persons', []); var filter = (document.getElementById('persons-filter').value || '').toLowerCase();
    var tb = document.getElementById('persons-list-body'); if (!tb) return; tb.innerHTML = ''; var shown = 0;
    var filtered = list.filter(function(p) { var txt = ((p.first||'') + ' ' + (p.last||'') + ' ' + (p.mobile||'') + ' ' + (p.email||'') + ' ' + (p.nationalId||'')).toLowerCase(); if (filter && txt.indexOf(filter) === -1) return false; return true; });
    filtered = applyTableSort('persons-table', filtered, function(p, k) { return p[k] || ''; });
    for (var i = 0; i < filtered.length; i++) { var p = filtered[i]; shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(p.first) + '</td><td>' + esc(p.last) + '</td><td dir="ltr">' + toFa(esc(p.nationalId || '—')) + '</td><td dir="ltr">' + toFa(esc(p.birth || '—')) + '</td><td dir="ltr">' + toFa(esc(p.mobile || '—')) + '</td><td dir="ltr">' + esc(p.email || '—') + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + p.id + '">✎</button><button class="row-btn del" data-id="' + p.id + '">×</button></div></td>'; tb.appendChild(tr); }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="7" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('persons-count').textContent = toFa(shown);
    attachRowActions(tb, 'persons', renderPersonsList, function(p) {
        document.getElementById('pr-id').value = p.id; document.getElementById('pr-first').value = p.first || '';
        document.getElementById('pr-last').value = p.last || ''; document.getElementById('pr-father').value = p.father || '';
        document.getElementById('pr-national-id').value = p.nationalId || '';
        document.getElementById('pr-birth').value = p.birth || ''; document.getElementById('pr-mobile').value = p.mobile || '';
        document.getElementById('pr-phone').value = p.phone || ''; document.getElementById('pr-email').value = p.email || '';
        document.getElementById('pr-bank-title').value = p.bankTitle || '';
        document.getElementById('pr-acc').value = p.acc || ''; document.getElementById('pr-iban').value = p.iban || '';
        document.getElementById('pr-card').value = p.card || ''; document.getElementById('pr-address').value = p.address || '';
        document.querySelector('[data-tab="persons-add"]').click(); });
    applyColVisibility('persons-table'); makeTableResizable(document.getElementById('persons-table'));
    attachTableSorting('persons-table', renderPersonsList); applySortIndicator('persons-table');
}
function renderCompaniesList() {
    var list = DB.load('companies', []); var filter = (document.getElementById('comp-filter').value || '').toLowerCase();
    var tb = document.getElementById('comp-list-body'); if (!tb) return; tb.innerHTML = ''; var shown = 0;
    var filtered = list.filter(function(c) { if (filter && ((c.name||'') + ' ' + (c.phone||'') + ' ' + (c.email||'')).toLowerCase().indexOf(filter) === -1) return false; return true; });
    filtered = applyTableSort('comp-table', filtered, function(c, k) { return c[k] || ''; });
    for (var i = 0; i < filtered.length; i++) { var c = filtered[i]; shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(c.name) + '</td><td dir="ltr">' + toFa(esc(c.phone || '—')) + '</td><td dir="ltr">' + esc(c.email || '—') + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + c.id + '">✎</button><button class="row-btn del" data-id="' + c.id + '">×</button></div></td>'; tb.appendChild(tr); }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="4" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('comp-count').textContent = toFa(shown);
    attachRowActions(tb, 'companies', renderCompaniesList, function(c) {
        document.getElementById('co-id').value = c.id; document.getElementById('co-name').value = c.name || '';
        document.getElementById('co-phone').value = c.phone || ''; document.getElementById('co-email').value = c.email || '';
        document.getElementById('co-address').value = c.address || '';
        document.querySelector('[data-tab="comp-add"]').click(); });
    applyColVisibility('comp-table'); makeTableResizable(document.getElementById('comp-table'));
    attachTableSorting('comp-table', renderCompaniesList); applySortIndicator('comp-table');
}
function refreshBankTypeSelect() { var sel = document.getElementById('ba-type'); if (!sel) return;
    sel.innerHTML = '<option value="">— نوع —</option>';
    for (var i = 0; i < state.bankTypes.length; i++) { var o = document.createElement('option'); o.value = state.bankTypes[i]; o.textContent = state.bankTypes[i]; sel.appendChild(o); } }
function renderBankAccountsList() {
    var list = DB.load('bankAccounts', []); var filter = (document.getElementById('ba-filter').value || '').toLowerCase();
    var tb = document.getElementById('ba-list-body'); if (!tb) return; tb.innerHTML = ''; var shown = 0;
    var filtered = list.filter(function(b) { if (filter && ((b.bank||'') + ' ' + (b.account||'') + ' ' + (b.branchName||'')).toLowerCase().indexOf(filter) === -1) return false; return true; });
    filtered = applyTableSort('ba-table', filtered, function(b, k) { if (k === 'order') return Number(b.order) || 9999; if (k === 'minBalance') return Number(b.minBalance) || 0; return b[k] || ''; });
    for (var i = 0; i < filtered.length; i++) { var b = filtered[i]; shown++;
        var mb = b.minBalance ? formatMoney(b.minBalance) + ' ' + currencyLabel() : '—';
        var tr = document.createElement('tr'); tr.innerHTML = '<td dir="ltr">' + (b.order != null ? toFa(esc(b.order)) : '—') + '</td><td>' + esc(b.bank) + '</td><td>' + esc(b.branchName) + '</td><td dir="ltr">' + toFa(esc(b.account)) + '</td><td dir="ltr">' + mb + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + b.id + '">✎</button><button class="row-btn del" data-id="' + b.id + '">×</button></div></td>'; tb.appendChild(tr); }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="6" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('ba-count').textContent = toFa(shown);
    attachRowActions(tb, 'bankAccounts', renderBankAccountsList, function(b) {
        document.getElementById('ba-id').value = b.id; document.getElementById('ba-bank').value = b.bank || '';
        document.getElementById('ba-type').value = b.type || ''; document.getElementById('ba-branch-code').value = b.branchCode || '';
        document.getElementById('ba-branch-name').value = b.branchName || ''; document.getElementById('ba-account').value = b.account || '';
        document.getElementById('ba-iban').value = b.iban || ''; document.getElementById('ba-card').value = b.card || '';
        document.getElementById('ba-order').value = (b.order != null ? b.order : '');
        document.getElementById('ba-min-balance').value = b.minBalance ? formatRaw(b.minBalance) : '';
        document.querySelector('[data-tab="ba-add"]').click(); });
    applyColVisibility('ba-table'); makeTableResizable(document.getElementById('ba-table'));
    attachTableSorting('ba-table', renderBankAccountsList); applySortIndicator('ba-table');
}
function refreshCashTypeSelect() { var sel = document.getElementById('cb-type'); if (!sel) return;
    sel.innerHTML = '<option value="">— نوع —</option>';
    for (var i = 0; i < state.cashTypes.length; i++) { var o = document.createElement('option'); o.value = state.cashTypes[i]; o.textContent = state.cashTypes[i]; sel.appendChild(o); } }
function renderCashBoxesList() {
    var list = DB.load('cashBoxes', []); var filter = (document.getElementById('cb-filter').value || '').toLowerCase();
    var tb = document.getElementById('cb-list-body'); if (!tb) return; tb.innerHTML = ''; var shown = 0;
    var filtered = list.filter(function(c) { if (filter && ((c.title||'') + ' ' + (c.type||'')).toLowerCase().indexOf(filter) === -1) return false; return true; });
    filtered = applyTableSort('cb-table', filtered, function(c, k) { if (k === 'order') return Number(c.order) || 9999; return c[k] || ''; });
    for (var i = 0; i < filtered.length; i++) { var c = filtered[i]; shown++;
        var tr = document.createElement('tr'); tr.innerHTML = '<td dir="ltr">' + (c.order != null ? toFa(esc(c.order)) : '—') + '</td><td>' + esc(c.title) + '</td><td>' + esc(c.type) + '</td><td>' + esc(c.unit) + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + c.id + '">✎</button><button class="row-btn del" data-id="' + c.id + '">×</button></div></td>'; tb.appendChild(tr); }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="5" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('cb-count').textContent = toFa(shown);
    attachRowActions(tb, 'cashBoxes', renderCashBoxesList, function(c) {
        document.getElementById('cb-id').value = c.id; document.getElementById('cb-title').value = c.title || '';
        document.getElementById('cb-type').value = c.type || ''; document.getElementById('cb-unit').value = c.unit || '';
        document.getElementById('cb-order').value = (c.order != null ? c.order : '');
        document.querySelector('[data-tab="cb-add"]').click(); });
    applyColVisibility('cb-table'); makeTableResizable(document.getElementById('cb-table'));
    attachTableSorting('cb-table', renderCashBoxesList); applySortIndicator('cb-table');
}
function renderProjectsList() {
    var list = DB.load('projects', []); var filter = (document.getElementById('proj-filter').value || '').toLowerCase();
    var tb = document.getElementById('proj-list-body'); if (!tb) return; tb.innerHTML = ''; var shown = 0;
    var filtered = list.filter(function(p) { if (filter && (p.name||'').toLowerCase().indexOf(filter) === -1) return false; return true; });
    filtered = applyTableSort('proj-table', filtered, function(p, k) { return p[k] || ''; });
    for (var i = 0; i < filtered.length; i++) { var p = filtered[i]; shown++;
        var tr = document.createElement('tr'); tr.innerHTML = '<td>' + esc(p.name) + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + p.id + '">✎</button><button class="row-btn del" data-id="' + p.id + '">×</button></div></td>'; tb.appendChild(tr); }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="2" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('proj-count').textContent = toFa(shown);
    attachRowActions(tb, 'projects', renderProjectsList, function(p) {
        document.getElementById('pj-id').value = p.id; document.getElementById('pj-name').value = p.name || '';
        document.querySelector('[data-tab="proj-add"]').click(); });
    applyColVisibility('proj-table'); makeTableResizable(document.getElementById('proj-table'));
    attachTableSorting('proj-table', renderProjectsList); applySortIndicator('proj-table');
}
var estimateItems = [];
function refreshEstPeriodSelect() {
    var sel = document.getElementById('est-period'); if (!sel) return;
    var list = DB.load('fiscalPeriods', []); var v = sel.value;
    sel.innerHTML = '<option value="">— انتخاب دوره —</option>';
    list.forEach(function(p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.title + ' (' + p.from + ' - ' + p.to + ')'; sel.appendChild(o); });
    sel.value = v || state.activePeriodId || '';
}
function renderEstimateItems() {
    var box = document.getElementById('est-items'); if (!box) return; box.innerHTML = '';
    if (estimateItems.length === 0) estimateItems.push({ id: uid(), date: '', amount: 0 });
    for (var i = 0; i < estimateItems.length; i++) { (function(idx) {
        var it = estimateItems[idx]; var row = document.createElement('div'); row.className = 'est-item-row';
        var n = document.createElement('span'); n.textContent = '#' + toFa(idx + 1); n.style.fontWeight = 'bold';
        var iD = document.createElement('input'); iD.type = 'text'; iD.className = 'date-picker'; iD.placeholder = 'تاریخ'; iD.value = it.date || '';
        iD.addEventListener('input', function() { it.date = normalizeDigits(this.value); });
        var iA = document.createElement('input'); iA.type = 'text'; iA.inputMode = 'numeric'; iA.dir = 'ltr'; iA.placeholder = 'مبلغ'; iA.value = it.amount ? formatRaw(it.amount) : '';
        iA.addEventListener('input', function() { var v = normalizeDigits(this.value); var r = v.replace(/[^\d]/g, ''); this.value = r; it.amount = Number(r) || 0; });
        iA.addEventListener('blur', function() { var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0; this.value = v ? formatRaw(v) : ''; it.amount = v; });
        var del = document.createElement('button'); del.className = 'row-btn del'; del.textContent = '×';
        del.addEventListener('click', function() { if (!confirm('حذف شود؟')) return; estimateItems.splice(idx, 1); renderEstimateItems(); });
        row.appendChild(n); row.appendChild(iD); row.appendChild(iA); row.appendChild(del);
        box.appendChild(row); attachDatePickers();
    })(i); }
}
function autoGenerateEstimate() {
    var fromD = normalizeDigits(document.getElementById('est-from').value.trim());
    var toD = normalizeDigits(document.getElementById('est-to').value.trim());
    var total = parseMoney(normalizeDigits(document.getElementById('est-total').value));
    if (!fromD || !toD) { alert('از و تا تاریخ را وارد کنید.'); return; }
    if (!total) { alert('مبلغ تخمینی کل را وارد کنید.'); return; }
    if (fromD > toD) { alert('شروع باید قبل از پایان باشد.'); return; }
    var mode = prompt('نحوه تولید:\n1 - روزانه\n2 - هفتگی\n3 - ماهانه', '1');
    if (!mode) return; mode = mode.trim();
    var p1 = fromD.split('/').map(Number); var p2 = toD.split('/').map(Number); var items = [];
    if (mode === '1') {
        var days = jalaliDiff(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]) + 1;
        if (days <= 0) { alert('بازه نامعتبر.'); return; }
        var each = Math.floor(total / days); var rem = total - each * days;
        for (var d = 0; d < days; d++) { var date = addJalaliDays(fromD, d); var amt = each + (d === days - 1 ? rem : 0); items.push({ id: uid(), date: date, amount: amt }); }
    } else if (mode === '2') {
        var weeks = Math.ceil((jalaliDiff(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]) + 1) / 7);
        if (weeks <= 0) { alert('بازه نامعتبر.'); return; }
        var eachW = Math.floor(total / weeks); var remW = total - eachW * weeks;
        for (var w = 0; w < weeks; w++) { var dateW = addJalaliDays(fromD, w * 7); if (dateW > toD) break; var amtW = eachW + (w === weeks - 1 ? remW : 0); items.push({ id: uid(), date: dateW, amount: amtW }); }
    } else if (mode === '3') {
        var y1 = p1[0], m1 = p1[1]; var y2 = p2[0], m2 = p2[1];
        var months = (y2 - y1) * 12 + (m2 - m1) + 1;
        if (months <= 0) { alert('بازه نامعتبر.'); return; }
        var eachM = Math.floor(total / months); var remM = total - eachM * months;
        for (var mi = 0; mi < months; mi++) { var cy = y1, cm = m1 + mi; while (cm > 12) { cm -= 12; cy++; } var dateM = cy + '/' + pad2(cm) + '/01'; if (dateM > toD) break; var amtM = eachM + (mi === months - 1 ? remM : 0); items.push({ id: uid(), date: dateM, amount: amtM }); }
    } else { alert('گزینه نامعتبر.'); return; }
    estimateItems = items; renderEstimateItems(); showToast('✅ ' + toFa(items.length) + ' آیتم تولید شد.');
}
function renderEstimateList() {
    var list = DB.load('dailyEstimates', []); var filter = (document.getElementById('est-filter').value || '').toLowerCase();
    var box = document.getElementById('est-list-body'); if (!box) return; box.innerHTML = '';
    var periods = DB.load('fiscalPeriods', []); var pMap = {}; periods.forEach(function(p) { pMap[p.id] = p.title; });
    var shown = 0; var hide = getHideState('est-list');
    list.sort(function(a, b) { return compareVals(b.from, a.from); });
    list.forEach(function(est) {
        var txt = ((est.title||'') + ' ' + (est.desc||'') + ' ' + (pMap[est.periodId]||'') + ' ' + (est.from||'') + ' ' + (est.to||'')).toLowerCase();
        if (filter && txt.indexOf(filter) === -1) return;
        shown++;
        var items = est.items || []; var total = items.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var card = document.createElement('div'); card.className = 'card';
        card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px"><div><strong style="font-size:1rem">' + esc(est.title || est.desc || 'بدون عنوان') + '</strong>' + (est.desc && est.title ? '<div class="muted" style="font-size:0.78rem">' + esc(est.desc) + '</div>' : '') + '</div><div class="row-actions"><button class="row-btn open" data-id="' + est.id + '" data-action="edit">✎</button><button class="row-btn del" data-id="' + est.id + '" data-action="delete">×</button></div></div>' +
            '<div class="facility-summary"><div class="item"><div class="lbl">دوره مالی</div><div class="val">' + esc(pMap[est.periodId] || '—') + '</div></div><div class="item"><div class="lbl">از تاریخ</div><div class="val" dir="ltr">' + toFa(esc(est.from || '—')) + '</div></div><div class="item"><div class="lbl">تا تاریخ</div><div class="val" dir="ltr">' + toFa(esc(est.to || '—')) + '</div></div><div class="item"><div class="lbl">مبلغ تخمینی</div><div class="val">' + fmtFor(est.total || 0, 'est-list') + '</div></div><div class="item"><div class="lbl">جمع آیتم‌ها</div><div class="val" style="color:var(--accent)">' + fmtFor(total, 'est-list') + '</div></div><div class="item"><div class="lbl">تعداد</div><div class="val">' + toFa(items.length) + '</div></div></div>';
        box.appendChild(card);
    });
    if (shown === 0) box.innerHTML = '<div class="card"><p class="muted" style="text-align:center">موردی ثبت نشده.</p></div>';
    document.getElementById('est-count').textContent = toFa(shown);
    var btns = box.querySelectorAll('[data-action]');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function() {
        var id = this.getAttribute('data-id'); var action = this.getAttribute('data-action');
        var est = DB.load('dailyEstimates', []).find(function(x) { return x.id === id; }); if (!est) return;
        if (action === 'edit') {
            document.getElementById('est-id').value = est.id;
            document.getElementById('est-title').value = est.title || '';
            document.getElementById('est-period').value = est.periodId || '';
            document.getElementById('est-from').value = est.from || '';
            document.getElementById('est-to').value = est.to || '';
            document.getElementById('est-total').value = est.total ? formatRaw(est.total) : '';
            document.getElementById('est-desc').value = est.desc || '';
            estimateItems = JSON.parse(JSON.stringify(est.items || [])); renderEstimateItems();
            document.querySelector('[data-tab="est-add"]').click();
        } else if (action === 'delete') {
            if (!confirm('حذف شود؟')) return;
            var l = DB.load('dailyEstimates', []).filter(function(x) { return x.id !== id; });
            DB.save('dailyEstimates', l); renderEstimateList();
        } });
}
function clearEstForm() {
    ['est-id','est-title','est-period','est-from','est-to','est-total','est-desc'].forEach(function(x) { document.getElementById(x).value = ''; });
    estimateItems = []; renderEstimateItems();
}
function saveEstimate() {
    var id = document.getElementById('est-id').value;
    var title = document.getElementById('est-title').value.trim();
    var periodId = document.getElementById('est-period').value;
    var from = normalizeDigits(document.getElementById('est-from').value.trim());
    var to = normalizeDigits(document.getElementById('est-to').value.trim());
    var total = parseMoney(normalizeDigits(document.getElementById('est-total').value));
    var desc = document.getElementById('est-desc').value.trim();
    if (!title) { alert('عنوان برآورد اجباری است.'); return; }
    if (!from || !to) { alert('از و تا تاریخ اجباری است.'); return; }
    if (!total) { alert('مبلغ تخمینی اجباری است.'); return; }
    var o = { id: id || uid(), title: title, periodId: periodId, from: from, to: to, total: total, desc: desc,
        items: estimateItems.map(function(it) { return { id: it.id, date: it.date, amount: Number(it.amount) || 0 }; }) };
    var l = DB.load('dailyEstimates', []);
    if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; } else l.push(o);
    DB.save('dailyEstimates', l); showToast('✅ ذخیره شد'); clearEstForm(); renderEstimateList();
    document.querySelector('[data-tab="est-list"]').click();
}
function refreshCfsMoeinSelect() {
    var sel = document.getElementById('cfs-moein'); if (!sel) return; var v = sel.value;
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
    sel.innerHTML = '<option value="">— ابتدا معین را انتخاب کنید —</option>';
    leaves.forEach(function(a) { var o = document.createElement('option'); o.value = a.id; o.textContent = getAccountLabel(a.id, accounts); sel.appendChild(o); });
    sel.value = v;
}
function onCfsMoeinChange() {
    var moeinId = document.getElementById('cfs-moein').value;
    var wrap = document.getElementById('cfs-details-wrap'); wrap.innerHTML = '';
    if (!moeinId) return;
    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === moeinId; });
    if (!acc || !acc.links || acc.links.length === 0) return;
    var prev = DB.load('cfs.tmp.details', {}); var html = '';
    for (var i = 0; i < acc.links.length; i++) {
        var lt = acc.links[i]; var items = getLinkedItems(lt); if (items.length === 0) continue;
        var selId = 'cfs-detail-' + lt;
        html += '<div class="field"><label>عنوان سطح ۴ منبع (' + linkTypeName(lt) + ') *</label><select id="' + selId + '"><option value="">— انتخاب کنید —</option>';
        for (var k = 0; k < items.length; k++) { var it = items[k]; html += '<option value="' + it.id + '"' + (prev[lt] === it.id ? ' selected' : '') + '>' + esc(getLinkedItemLabel(lt, it)) + '</option>'; }
        html += '</select></div>';
    }
    wrap.innerHTML = html;
}
function renderCfsList() {
    var list = DB.load('cashFlowSources', []); var filter = (document.getElementById('cfs-filter').value || '').toLowerCase();
    var tb = document.getElementById('cfs-list-body'); if (!tb) return; tb.innerHTML = ''; var shown = 0;
    var accounts = DB.load('accounts', []);
    var rows = list.map(function(s) {
        var moeinLabel = getAccountLabel(s.moeinId, accounts);
        var detailLabel = s.linkType && s.detailId ? getDetailLabel(s.linkType, s.detailId) : '—';
        return { s: s, moein: moeinLabel, detail: detailLabel };
    }).filter(function(r) {
        var txt = (r.moein + ' ' + r.detail + ' ' + (r.s.notes || '')).toLowerCase();
        return !filter || txt.indexOf(filter) !== -1;
    });
    rows = applyTableSort('cfs-table', rows, function(r, k) {
        if (k === 'moein') return r.moein; if (k === 'detail') return r.detail;
        if (k === 'expectedDate') return r.s.expectedDate || '';
        if (k === 'amount') return Number(r.s.amount) || 0;
        if (k === 'notes') return r.s.notes || ''; return '';
    });
    rows.forEach(function(r) {
        shown++; var s = r.s;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(r.moein) + '</td><td>' + esc(r.detail) + (s.linkType ? ' <span class="muted" style="font-size:0.7rem">(' + linkTypeName(s.linkType) + ')</span>' : '') + '</td><td dir="ltr">' + toFa(esc(s.expectedDate || '—')) + '</td><td class="num" style="font-weight:bold;color:#1e9e6a">' + fmtFor(s.amount || 0, 'cfs-list') + ' ' + currencyLabel() + '</td><td>' + esc(s.notes || '—') + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + s.id + '">✎</button><button class="row-btn del" data-id="' + s.id + '">×</button></div></td>';
        tb.appendChild(tr);
    });
    if (shown === 0) tb.innerHTML = '<tr><td colspan="6" class="empty-row">موردی ثبت نشده.</td></tr>';
    document.getElementById('cfs-count').textContent = toFa(shown);
    attachRowActions(tb, 'cashFlowSources', renderCfsList, function(s) {
        document.getElementById('cfs-id').value = s.id;
        document.getElementById('cfs-moein').value = s.moeinId || '';
        onCfsMoeinChange();
        if (s.linkType && s.detailId) { var sel = document.getElementById('cfs-detail-' + s.linkType); if (sel) sel.value = s.detailId; }
        document.getElementById('cfs-date').value = s.expectedDate || '';
        document.getElementById('cfs-amount').value = s.amount ? formatRaw(s.amount) : '';
        document.getElementById('cfs-notes').value = s.notes || '';
        document.querySelector('[data-tab="cfs-add"]').click(); });
    applyColVisibility('cfs-table'); makeTableResizable(document.getElementById('cfs-table'));
    attachTableSorting('cfs-table', renderCfsList); applySortIndicator('cfs-table');
}
function clearCfsForm() {
    ['cfs-id','cfs-moein','cfs-date','cfs-amount','cfs-notes'].forEach(function(x) { document.getElementById(x).value = ''; });
    document.getElementById('cfs-details-wrap').innerHTML = '';
    DB.save('cfs.tmp.details', {});
}
function saveCfsSource() {
    var id = document.getElementById('cfs-id').value;
    var moeinId = document.getElementById('cfs-moein').value;
    if (!moeinId) { alert('معین منبع اجباری است.'); return; }
    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === moeinId; });
    if (!acc) { alert('معین نامعتبر.'); return; }
    var linkType = '', detailId = '';
    if (acc.links && acc.links.length > 0) {
        for (var i = 0; i < acc.links.length; i++) { var lt = acc.links[i]; var sel = document.getElementById('cfs-detail-' + lt); if (!sel) continue;
            var items = getLinkedItems(lt); if (items.length === 0) continue;
            if (!sel.value) { alert('سطح ۴ (' + linkTypeName(lt) + ') اجباری است.'); return; }
            linkType = lt; detailId = sel.value; break; } }
    var expectedDate = normalizeDigits(document.getElementById('cfs-date').value.trim());
    var amount = parseMoney(normalizeDigits(document.getElementById('cfs-amount').value));
    if (!amount) { alert('مبلغ اجباری است.'); return; }
    var notes = document.getElementById('cfs-notes').value.trim();
    var o = { id: id || uid(), moeinId: moeinId, linkType: linkType, detailId: detailId, expectedDate: expectedDate, amount: amount, notes: notes };
    var list = DB.load('cashFlowSources', []);
    if (id) { for (var k = 0; k < list.length; k++) if (list[k].id === id) list[k] = o; } else list.push(o);
    DB.save('cashFlowSources', list); showToast('✅ ذخیره شد'); clearCfsForm(); renderCfsList();
    document.querySelector('[data-tab="cfs-list"]').click();
}
function getSourceLabel(s) {
    var accounts = DB.load('accounts', []);
    var moeinLabel = getAccountLabel(s.moeinId, accounts);
    var detailLabel = ''; if (s.linkType && s.detailId) detailLabel = getDetailLabel(s.linkType, s.detailId);
    return moeinLabel + (detailLabel ? ' — ' + detailLabel : '');
}
function computeBankBalanceAtDate(fromDate) {
    var vouchers = DB.load('vouchers', []); var banks = DB.load('bankAccounts', []); var bankIds = banks.map(function(b) { return b.id; }); var total = 0;
    vouchers.forEach(function(v) { if (v.status !== 'approved') return; if (v.date >= fromDate) return;
        (v.lines || []).forEach(function(line) { if (line.details && line.details.bank && bankIds.indexOf(line.details.bank) !== -1) { total += (Number(line.debit) || 0) - (Number(line.credit) || 0); } }); });
    return total;
}
function runCashFlowReport() {
    var fromDate = normalizeDigits((document.getElementById('cf-from').value || '').trim());
    var toDate = normalizeDigits((document.getElementById('cf-to').value || '').trim());
    if (!fromDate) fromDate = todayJalaliStr();
    if (!toDate) toDate = fromDate;
    document.getElementById('cf-from').value = fromDate; document.getElementById('cf-to').value = toDate;
    if (fromDate > toDate) { alert('تاریخ شروع باید قبل از پایان باشد.'); return; }
    var hide = getHideState('cf');
    var bankBalance = computeBankBalanceAtDate(fromDate);
    var sources = DB.load('cashFlowSources', []);
    var sourcesInRange = sources.filter(function(s) { if (!s.expectedDate) return true; return s.expectedDate >= fromDate && s.expectedDate <= toDate; });
    var facilities = DB.load('facilities', []); var facilityInsts = [];
    facilities.forEach(function(f) { (f.installments || []).forEach(function(inst) {
        if (inst.status === 'paid') return; if (!inst.date) return;
        if (inst.date < fromDate || inst.date > toDate) return;
        facilityInsts.push({ f: f, inst: inst }); }); });
    var estimates = DB.load('dailyEstimates', []); var estimateItemsArr = [];
    estimates.forEach(function(est) { (est.items || []).forEach(function(it) {
        if (!it.date) return; if (it.date < fromDate || it.date > toDate) return;
        estimateItemsArr.push({ est: est, item: it }); }); });
    var items = [];
    sourcesInRange.forEach(function(s) { items.push({ type: 'source', date: s.expectedDate || fromDate, sortDate: s.expectedDate || (fromDate + '~'), amount: Number(s.amount) || 0, label: '📥 ' + getSourceLabel(s), notes: s.notes || '' }); });
    facilityInsts.forEach(function(item) { items.push({ type: 'facility', date: item.inst.date, sortDate: item.inst.date, amount: -Number(item.inst.amount || 0), label: '💸 قسط ' + item.f.name, notes: '' }); });
    estimateItemsArr.forEach(function(item) { items.push({ type: 'estimate', date: item.item.date, sortDate: item.item.date, amount: -Number(item.item.amount || 0), label: '📝 ' + (item.est.title || item.est.desc || 'برآورد'), notes: '' }); });
    items.sort(function(a, b) { return compareVals(a.sortDate, b.sortDate); });
    var html = '<div class="cf-report"><div class="table-wrap">';
    html += '<table class="cf-table" id="cf-table"><thead><tr><th style="width:35%">عنوان دسته</th><th style="width:15%">تاریخ</th><th style="width:25%">مبلغ</th><th style="width:25%">مانده در خط</th></tr></thead><tbody>';
    var running = bankBalance;
    var bbCls = bankBalance < 0 ? 'cf-neg' : '';
    var bbText = hide ? '—' : (bankBalance < 0 ? '(' + formatMoney(Math.abs(bankBalance)) + ')' : formatMoney(bankBalance));
    html += '<tr class="cf-bank-row"><td class="cf-cat">💰 مانده بانک ها</td><td dir="ltr">' + toFa(fromDate) + '</td><td class="num ' + bbCls + '">' + bbText + '</td><td class="num ' + bbCls + '">' + bbText + '</td></tr>';
    items.forEach(function(it) {
        running += it.amount;
        var amtCls = ''; var amtText = '';
        if (it.type === 'facility' || it.type === 'estimate') { amtCls = 'cf-neg'; amtText = hide ? '—' : '(' + formatMoney(Math.abs(it.amount)) + ')'; }
        else { amtCls = 'cf-pos'; amtText = hide ? '—' : formatMoney(it.amount); }
        var balCls = running < 0 ? 'cf-neg' : '';
        var balText = hide ? '—' : (running < 0 ? '(' + formatMoney(Math.abs(running)) + ')' : formatMoney(running));
        var rowCls = it.type === 'facility' ? 'cf-fac-row' : (it.type === 'estimate' ? 'cf-est-row' : 'cf-source-row');
        var label = it.label + (it.notes ? ' <span class="muted" style="font-size:0.72rem">(' + esc(it.notes) + ')</span>' : '');
        html += '<tr class="' + rowCls + '"><td class="cf-cat">' + label + '</td><td dir="ltr">' + toFa(esc(it.date)) + '</td><td class="num ' + amtCls + '">' + amtText + '</td><td class="num ' + balCls + '">' + balText + '</td></tr>'; });
    html += '</tbody>';
    var finalCls = running < 0 ? 'cf-neg' : '';
    var finalText = hide ? '—' : (running < 0 ? '(' + formatMoney(Math.abs(running)) + ')' : formatMoney(running));
    html += '<tfoot><tr><td colspan="2" style="text-align:left">مانده نهایی</td><td class="num"></td><td class="num ' + finalCls + '">' + finalText + '</td></tr></tfoot></table></div></div>';
    document.getElementById('cf-result').innerHTML = html;
    document.getElementById('cf-count').textContent = toFa(items.length + 1) + ' ردیف';
    var unitEl = document.getElementById('cf-unit'); if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    autoAttachReportHelpers();
}
function runCashFlowByDescReport() {
    var fromD = normalizeDigits((document.getElementById('cfd-from').value || '').trim());
    var toD = normalizeDigits((document.getElementById('cfd-to').value || '').trim());
    if (!fromD) fromD = todayJalaliStr();
    if (!toD) toD = fromD;
    if (fromD > toD) { alert('تاریخ شروع باید قبل از پایان باشد.'); return; }
    document.getElementById('cfd-from').value = fromD; document.getElementById('cfd-to').value = toD;
    var hide = getHideState('cfd');
    var accounts = DB.load('accounts', []);
    var effectiveAccs = {}; accounts.forEach(function(a) { if (a.cfEffect) effectiveAccs[a.id] = true; });
    var effIds = Object.keys(effectiveAccs);
    if (effIds.length === 0) {
        document.getElementById('cfd-result').innerHTML = '<div class="card"><p class="muted" style="text-align:center;padding:16px">⚠️ هیچ معینی با گزینه «موثر در گزارش گردش وجه نقد» تعریف نشده است.</p></div>';
        document.getElementById('cfd-count').textContent = '۰'; return;
    }
    var vouchers = DB.load('vouchers', []).filter(function(v) { return v.status === 'approved' && v.date >= fromD && v.date <= toD; });
    var buckets = {};
    vouchers.forEach(function(v) { (v.lines || []).forEach(function(l) {
        if (!l.account || !effectiveAccs[l.account]) return;
        var desc = (l.description || '').trim() || '(بدون شرح)';
        if (!buckets[desc]) buckets[desc] = { in: 0, out: 0, details: [] };
        var d = Number(l.debit) || 0; var c = Number(l.credit) || 0;
        buckets[desc].in += d; buckets[desc].out += c;
        buckets[desc].details.push({ date: v.date, number: v.number, desc: v.desc, accLabel: getAccountLabel(l.account, accounts), lineDesc: l.description || '', debit: d, credit: c });
    }); });
    var keys = Object.keys(buckets); keys.sort(function(a, b) { return compareVals(a, b); });
    if (keys.length === 0) {
        document.getElementById('cfd-result').innerHTML = '<div class="card"><p class="muted" style="text-align:center;padding:16px">در این بازه گردشی ثبت نشده است.</p></div>';
        document.getElementById('cfd-count').textContent = '۰'; return;
    }
    var html = '<div class="table-wrap"><table class="report-table" id="cfd-table"><thead><tr><th>#</th><th>بابت / شرح</th><th>ورود (بدهکار)</th><th>خروج (بستانکار)</th><th>مانده</th><th>تعداد</th></tr></thead><tbody>';
    var tIn = 0, tOut = 0;
    for (var i = 0; i < keys.length; i++) { var k = keys[i]; var b = buckets[k]; var bal = b.in - b.out; tIn += b.in; tOut += b.out;
        html += '<tr><td class="num">' + toFa(i + 1) + '</td><td><strong>' + esc(k) + '</strong></td><td class="num" style="color:#1e9e6a">' + (hide ? '—' : (b.in ? formatMoney(b.in) : '—')) + '</td><td class="num" style="color:#c0392b">' + (hide ? '—' : (b.out ? formatMoney(b.out) : '—')) + '</td><td class="num" style="font-weight:bold;color:' + (bal >= 0 ? '#1e9e6a' : '#c0392b') + '">' + (hide ? '—' : formatMoney(bal)) + '</td><td class="num">' + toFa(b.details.length) + '</td></tr>'; }
    html += '</tbody><tfoot><tr><td colspan="2" style="text-align:left">جمع</td><td class="num" style="color:#1e9e6a">' + (hide ? '—' : formatMoney(tIn)) + '</td><td class="num" style="color:#c0392b">' + (hide ? '—' : formatMoney(tOut)) + '</td><td class="num">' + (hide ? '—' : formatMoney(tIn - tOut)) + '</td><td></td></tr></tfoot></table></div>';
    for (var j = 0; j < keys.length; j++) { var k2 = keys[j]; var b2 = buckets[k2];
        html += '<div class="cfd-group" style="margin-top:14px"><div class="cfd-head" onclick="var d=this.nextElementSibling;d.classList.toggle(\'show\')"><div class="cfd-title">' + esc(k2) + '</div><div class="cfd-nums"><span class="n in">ورود: ' + (hide ? '—' : formatMoney(b2.in)) + '</span><span class="n out">خروج: ' + (hide ? '—' : formatMoney(b2.out)) + '</span><span class="n bal">مانده: ' + (hide ? '—' : formatMoney(b2.in - b2.out)) + '</span></div></div><div class="cfd-details"><table class="data-table"><thead><tr><th>#</th><th>تاریخ</th><th>شماره</th><th>شرح سند</th><th>حساب</th><th>شرح قلم</th><th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>';
        for (var di = 0; di < b2.details.length; di++) { var d2 = b2.details[di];
            html += '<tr><td>' + toFa(di + 1) + '</td><td dir="ltr">' + toFa(d2.date) + '</td><td dir="ltr">' + toFa(d2.number) + '</td><td>' + esc(d2.desc || '') + '</td><td>' + esc(d2.accLabel) + '</td><td>' + esc(d2.lineDesc) + '</td><td class="num dr">' + (hide ? '—' : (d2.debit ? formatMoney(d2.debit) : '—')) + '</td><td class="num cr">' + (hide ? '—' : (d2.credit ? formatMoney(d2.credit) : '—')) + '</td></tr>'; }
        html += '</tbody></table></div></div>'; }
    document.getElementById('cfd-result').innerHTML = html;
    document.getElementById('cfd-count').textContent = toFa(keys.length) + ' دسته';
    var unitEl = document.getElementById('cfd-unit'); if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    autoAttachReportHelpers();
}
function getDescendantIds(accountId) {
    var accounts = DB.load('accounts', []); var result = [accountId]; var queue = [accountId];
    while (queue.length > 0) { var cur = queue.shift(); accounts.forEach(function(a) { if (a.parent === cur) { result.push(a.id); queue.push(a.id); } }); }
    return result;
}
function openAccountTurnover(accountId, detailInfo) {
    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === accountId; }); if (!acc) return;
    var ids = getDescendantIds(accountId);
    var fromD = document.getElementById('ra-from').value; var toD = document.getElementById('ra-to').value;
    var vtype = document.getElementById('ra-vtype').value; var periodId = document.getElementById('ra-period').value;
    var hide = getHideState('ra');
    var vouchers = DB.load('vouchers', []).filter(function(v) {
        if (v.status !== 'approved') return false; if (!v.date) return false;
        if (fromD && v.date < fromD) return false; if (toD && v.date > toD) return false;
        if (vtype && v.type !== vtype) return false; if (periodId && v.periodId !== periodId) return false;
        return true;
    });
    var rows = [];
    vouchers.forEach(function(v) { (v.lines || []).forEach(function(l) {
        if (!l.account || ids.indexOf(l.account) === -1) return;
        if (detailInfo) { if (!l.details || l.details[detailInfo.linkType] !== detailInfo.detailId) return; }
        rows.push({ voucher: v, line: l }); }); });
    rows.sort(function(a, b) { var c = compareVals(a.voucher.date, b.voucher.date); if (c !== 0) return c; return compareVals(a.voucher.number, b.voucher.number); });
    var title = '📊 گردش: ' + acc.name;
    if (detailInfo) title += ' → ' + getDetailLabel(detailInfo.linkType, detailInfo.detailId);
    document.getElementById('turnover-title').textContent = title;
    var body = document.getElementById('turnover-body');
    if (rows.length === 0) body.innerHTML = '<p class="muted" style="text-align:center;padding:20px">گردشی در این بازه یافت نشد.</p>';
    else {
        var html = '<div class="table-wrap"><table class="report-table" id="turnover-table"><thead><tr><th>#</th><th>تاریخ</th><th>شماره</th><th>شرح سند</th><th>حساب</th><th>تفصیلی</th><th>شرح قلم</th><th>بدهکار</th><th>بستانکار</th><th>مانده</th></tr></thead><tbody>';
        var runBal = 0;
        for (var i = 0; i < rows.length; i++) { var r = rows[i]; var v = r.voucher; var l = r.line;
            var d = Number(l.debit) || 0; var c = Number(l.credit) || 0; runBal += d - c;
            var detailsStr = '';
            if (l.details) Object.keys(l.details).forEach(function(lt) { var did = l.details[lt]; if (did) { if (detailsStr) detailsStr += ' ، '; detailsStr += linkTypeName(lt) + ': ' + getDetailLabel(lt, did); } });
            var accLabel = getAccountLabel(l.account, accounts);
            html += '<tr><td class="num">' + toFa(i + 1) + '</td><td dir="ltr">' + toFa(esc(v.date)) + '</td><td dir="ltr">' + toFa(esc(v.number)) + '</td><td>' + esc(v.desc || '') + '</td><td>' + esc(accLabel) + '</td><td>' + (detailsStr ? esc(detailsStr) : '—') + '</td><td>' + esc(l.description || '') + '</td><td class="num dr">' + (hide ? '—' : (d ? formatMoney(d) : '—')) + '</td><td class="num cr">' + (hide ? '—' : (c ? formatMoney(c) : '—')) + '</td><td class="num" style="font-weight:bold;color:' + (runBal >= 0 ? '#1e9e6a' : '#c0392b') + '">' + (hide ? '—' : formatMoney(runBal)) + '</td></tr>'; }
        html += '</tbody></table></div>';
        body.innerHTML = html;
    }
    document.getElementById('turnover-modal').classList.add('show');
    document.getElementById('turnover-overlay').classList.add('show');
    setTimeout(function() { autoAttachReportHelpers(); }, 50);
}
function closeTurnover() { document.getElementById('turnover-modal').classList.remove('show'); document.getElementById('turnover-overlay').classList.remove('show'); }
function runIncompleteReport() {
    var statusF = (document.getElementById('ri-status').value || '');
    var periodF = (document.getElementById('ri-period').value || '');
    var hide = getHideState('ri');
    var vouchers = DB.load('vouchers', []); var rows = [];
    vouchers.forEach(function(v) { var st = v.status || 'draft';
        if (statusF && st !== statusF) return; if (periodF && v.periodId !== periodF) return;
        var issues = getVoucherIssues(v);
        if (issues.length === 0) return;
        rows.push({ v: v, issues: issues }); });
    rows.sort(function(a, b) { return compareVals(a.v.number, b.v.number); });
    var periods = DB.load('fiscalPeriods', []); var pM = {}; periods.forEach(function(p) { pM[p.id] = p.title; });
    var html = '<div class="table-wrap"><table class="report-table" id="ri-table"><thead><tr><th>#</th><th>شماره</th><th>تاریخ</th><th>مبلغ</th><th>دوره</th><th>شرح</th><th>وضعیت</th><th>مشکلات</th><th>عملیات</th></tr></thead><tbody>';
    var totalAmt = 0;
    for (var i = 0; i < rows.length; i++) { var r = rows[i]; var v = r.v; var amt = getVoucherAmount(v); totalAmt += amt;
        var stB = v.status === 'approved' ? '<span class="badge badge-approved">✓</span>' : '<span class="badge badge-draft">پیش‌نویس</span>';
        var iss = '<div class="ri-issues">' + r.issues.map(function(x) { return '<div class="ri-issue-item">' + esc(x) + '</div>'; }).join('') + '</div>';
        var aH = '<div class="row-actions"><button class="row-btn open" data-vid="' + v.id + '" data-action="open-voucher">✎</button><button class="row-btn open" data-vid="' + v.id + '" data-action="preview-voucher">👁</button></div>';
        html += '<tr><td class="num">' + toFa(i + 1) + '</td><td dir="ltr">' + toFa(esc(v.number)) + '</td><td dir="ltr">' + toFa(esc(v.date)) + '</td><td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(amt)) + '</td><td>' + esc(pM[v.periodId] || '—') + '</td><td>' + esc(v.desc || '') + '</td><td>' + stB + '</td><td>' + iss + '</td><td>' + aH + '</td></tr>'; }
    if (rows.length === 0) html += '<tr><td colspan="9" class="empty-row">✅ سند ناقصی وجود ندارد.</td></tr>';
    html += '</tbody>';
    if (rows.length > 0) html += '<tfoot><tr><td colspan="3" style="text-align:left">جمع</td><td class="num" style="color:#c0392b">' + (hide ? '—' : formatMoney(totalAmt)) + '</td><td colspan="5"></td></tr></tfoot>';
    html += '</table></div>';
    document.getElementById('ri-result').innerHTML = html;
    document.getElementById('ri-count').textContent = toFa(rows.length);
    var unitEl = document.getElementById('ri-unit'); if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    var btns = document.querySelectorAll('#ri-result [data-action]');
    for (var bi = 0; bi < btns.length; bi++) btns[bi].addEventListener('click', function() {
        var vid = this.getAttribute('data-vid'); var act = this.getAttribute('data-action');
        var v = findVoucherById(vid); if (!v) return;
        if (act === 'open-voucher') loadVoucherForEdit(v);
        else if (act === 'preview-voucher') openVoucherPreview(v); });
    autoAttachReportHelpers();
}
function runFacilityReport() {
    var facilities = DB.load('facilities', []); var cf = document.getElementById('rf-category').value; var sf = document.getElementById('rf-status').value;
    var st = sortState.rf; var rows = []; var hide = getHideState('rf');
    facilities.forEach(function(f) { if (cf && (f.category || 'facility') !== cf) return;
        var ins = f.installments || []; var ri = ins.filter(function(x) { return x.status !== 'paid'; });
        var ra = ri.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var lD = ri.length > 0 ? ri[ri.length - 1].date : '—';
        var unpaidSorted = ri.slice().sort(function(a, b) { return compareVals(a.date, b.date); });
        var fU = unpaidSorted.length > 0 ? unpaidSorted[0].date : '—';
        var set = ins.length > 0 && ri.length === 0;
        if (sf === 'settled' && !set) return; if (sf === 'active' && set) return;
        rows.push({ f: f, rC: ri.length, rA: ra, lD: lD, fU: fU, set: set }); });
    rows.sort(function(a, b) { var va, vb;
        if (st.col === 'name') { va = a.f.name || ''; vb = b.f.name || ''; }
        else if (st.col === 'initial') { va = a.f.initial || 0; vb = b.f.initial || 0; }
        else if (st.col === 'paid') { va = a.f.paid || 0; vb = b.f.paid || 0; }
        else if (st.col === 'remainingCount') { va = a.rC; vb = b.rC; }
        else if (st.col === 'remainingAmount') { va = a.rA; vb = b.rA; }
        else if (st.col === 'lastDate') { va = a.lD; vb = b.lD; }
        else if (st.col === 'firstUnpaid') { va = a.fU; vb = b.fU; }
        else if (st.col === 'status') { va = a.set ? 'تسویه' : 'جاری'; vb = b.set ? 'تسویه' : 'جاری'; }
        else { va = ''; vb = ''; }
        return st.dir === 'asc' ? compareVals(va, vb) : -compareVals(va, vb); });
    var html = '<div class="table-wrap"><table class="report-table" id="rf-table"><thead><tr><th data-sort="name">عنوان</th><th data-sort="status">وضعیت</th><th data-sort="initial">مبلغ اولیه</th><th data-sort="paid">پرداخت</th><th data-sort="remainingCount">اقساط باقی</th><th data-sort="remainingAmount">مبلغ باقی</th><th data-sort="firstUnpaid">اولین قسط پرداخت‌نشده</th><th data-sort="lastDate">آخرین قسط</th></tr></thead><tbody>';
    var tr = 0;
    for (var i = 0; i < rows.length; i++) { var r = rows[i]; var f = r.f;
        html += '<tr><td>' + esc(f.name) + '</td><td>' + (r.set ? '<span class="badge badge-settled">تسویه</span>' : '<span class="badge badge-active">جاری</span>') + '</td><td class="num">' + (hide ? '—' : fmtRep(f.initial || 0, 'rf')) + '</td><td class="num">' + (hide ? '—' : fmtRep(f.paid || 0, 'rf')) + '</td><td class="num">' + toFa(r.rC) + '</td><td class="num">' + (hide ? '—' : fmtRep(r.rA, 'rf')) + '</td><td dir="ltr">' + toFa(r.fU) + '</td><td dir="ltr">' + toFa(r.lD) + '</td></tr>';
        tr += r.rA; }
    html += '</tbody><tfoot><tr><td colspan="5" style="text-align:left">جمع مانده</td><td class="num">' + (hide ? '—' : fmtRep(tr, 'rf')) + '</td><td colspan="2"></td></tr></tfoot></table></div>';
    document.getElementById('rf-result').innerHTML = html; document.getElementById('rf-count').textContent = toFa(rows.length);
    var unitEl = document.getElementById('rf-unit'); if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    setupRfSorting();
    autoAttachReportHelpers();
}
function setupRfSorting() { var ths = document.querySelectorAll('#rf-result th[data-sort]');
    for (var i = 0; i < ths.length; i++) ths[i].addEventListener('click', function() {
        var col = this.getAttribute('data-sort');
        if (sortState.rf.col === col) sortState.rf.dir = sortState.rf.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.rf.col = col; sortState.rf.dir = 'asc'; } runFacilityReport(); }); }
function setupRffSorting() { var ths = document.querySelectorAll('#rff-result th[data-sort]');
    for (var i = 0; i < ths.length; i++) ths[i].addEventListener('click', function() {
        var col = this.getAttribute('data-sort');
        if (sortState.rff.col === col) sortState.rff.dir = sortState.rff.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.rff.col = col; sortState.rff.dir = 'asc'; } runFacilityFullReport(); }); }
function computeFacilityRows() {
    var facilities = DB.load('facilities', []);
    var cf = document.getElementById('rff-category').value; var sf = document.getElementById('rff-status').value;
    var inf = document.getElementById('rff-inst-status').value; var bf = document.getElementById('rff-bank').value;
    var fromD = document.getElementById('rff-from').value; var toD = document.getElementById('rff-to').value;
    var q = (document.getElementById('rff-search').value || '').toLowerCase();
    var banks = DB.load('bankAccounts', []); var bankMap = {}; banks.forEach(function(b) { bankMap[b.id] = b; });
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);
    var rows = [];
    facilities.forEach(function(f) {
        if (cf && (f.category || 'facility') !== cf) return;
        if (bf && f.bankId !== bf) return;
        if (fromD && f.date && f.date < fromD) return;
        if (toD && f.date && f.date > toD) return;
        var allIns = f.installments || []; var ins = allIns;
        if (fromD || toD) {
            ins = allIns.filter(function(x) { if (!x.date) return false; if (fromD && x.date < fromD) return false; if (toD && x.date > toD) return false; return true; });
        }
        var paidCount = ins.filter(function(x) { return x.status === 'paid'; }).length;
        var totalAmt = ins.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var paidAmt = ins.filter(function(x) { return x.status === 'paid'; }).reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var unpaidList = ins.filter(function(x) { return x.status !== 'paid'; });
        var unpaidAmt = unpaidList.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var unpaidSorted = unpaidList.slice().sort(function(a, b) { return compareVals(a.date, b.date); });
        var firstUnpaidDate = unpaidSorted.length > 0 ? unpaidSorted[0].date : '';
        var firstUnpaidAmount = unpaidSorted.length > 0 ? Number(unpaidSorted[0].amount) || 0 : 0;
        var lastPaidDate = '—';
        var paidSorted = ins.filter(function(x) { return x.status === 'paid' && x.date; }).slice().sort(function(a, b) { return compareVals(b.date, a.date); });
        if (paidSorted.length > 0) lastPaidDate = paidSorted[0].date;
        var overdueCount = unpaidList.filter(function(x) { return x.date && x.date < tStr; }).length;
        var settled = ins.length > 0 && unpaidList.length === 0;
        var lastInsDate = '—';
        if (ins.length > 0) { var sortedIns = ins.slice().sort(function(a, b) { return compareVals(b.date, a.date); }); lastInsDate = sortedIns[0].date || '—'; }
        if ((fromD || toD) && ins.length === 0) return;
        if (sf === 'settled' && !settled) return;
        if (sf === 'active' && settled) return;
        if (inf === 'has-unpaid' && !(unpaidList.length > 0)) return;
        if (q) {
            var bankObj = bankMap[f.bankId];
            var txt = ((f.name || '') + ' ' + (f.date || '') + ' ' + categoryName(f.category) + ' ' + (bankObj ? bankObj.bank : '')).toLowerCase();
            if (txt.indexOf(q) === -1) return;
        }
        rows.push({ f: f, bank: bankMap[f.bankId], insCount: ins.length, paidCount: paidCount, totalAmt: totalAmt, paidAmt: paidAmt, unpaidAmt: unpaidAmt, unpaidCount: unpaidList.length, firstUnpaidDate: firstUnpaidDate, firstUnpaidAmount: firstUnpaidAmount, lastPaidDate: lastPaidDate, overdueCount: overdueCount, settled: settled, lastInsDate: lastInsDate, filteredIns: ins });
    });
    return rows;
}
function runFacilityFullReport() {
    var rows = computeFacilityRows(); var st = sortState.rff;
    rows.sort(function(a, b) { var va, vb;
        switch (st.col) {
            case 'name': va = a.f.name || ''; vb = b.f.name || ''; break;
            case 'category': va = categoryName(a.f.category); vb = categoryName(b.f.category); break;
            case 'bank': va = a.bank ? a.bank.bank : ''; vb = b.bank ? b.bank.bank : ''; break;
            case 'date': va = a.f.date || ''; vb = b.f.date || ''; break;
            case 'initial': va = Number(a.f.initial || 0); vb = Number(b.f.initial || 0); break;
            case 'paidAmt': va = a.paidAmt; vb = b.paidAmt; break;
            case 'unpaidAmt': va = a.unpaidAmt; vb = b.unpaidAmt; break;
            case 'insCount': va = a.insCount; vb = b.insCount; break;
            case 'paidCount': va = a.paidCount; vb = b.paidCount; break;
            case 'unpaidCount': va = a.unpaidCount; vb = b.unpaidCount; break;
            case 'firstUnpaidDate': va = a.firstUnpaidDate || ''; vb = b.firstUnpaidDate || ''; break;
            case 'lastPaidDate': va = a.lastPaidDate || ''; vb = b.lastPaidDate || ''; break;
            case 'overdueCount': va = a.overdueCount; vb = b.overdueCount; break;
            case 'status': va = a.settled ? 'تسویه' : 'جاری'; vb = b.settled ? 'تسویه' : 'جاری'; break;
            default: va = ''; vb = '';
        }
        return st.dir === 'asc' ? compareVals(va, vb) : -compareVals(va, vb); });
    if (state.rffView === 'detail') renderFacilityFullDetail(rows); else renderFacilityFullSummary(rows);
    autoAttachReportHelpers();
}
function renderFacilityFullSummary(rows) {
    var st = sortState.rff; var hide = getHideState('rff');
    var html = '<div class="table-wrap"><table class="report-table" id="rff-table"><thead><tr>' +
        '<th data-sort="name">عنوان</th><th data-sort="category">دسته</th><th data-sort="bank">بانک</th><th data-sort="date">تاریخ</th>' +
        '<th data-sort="initial">مبلغ اولیه</th><th data-sort="paidAmt">پرداخت</th><th data-sort="unpaidAmt">باقی‌مانده</th>' +
        '<th data-sort="insCount">تعداد</th><th data-sort="paidCount">پرداخت‌شده</th><th data-sort="unpaidCount">باقی</th>' +
        '<th data-sort="overdueCount">سررسید گذشته</th><th data-sort="firstUnpaidDate">اولین قسط پرداخت‌نشده</th>' +
        '<th data-sort="lastPaidDate">آخرین پرداخت</th><th data-sort="status">وضعیت</th><th>عملیات</th></tr></thead><tbody>';
    var sumInit = 0, sumPaid = 0, sumUnpaid = 0, sumInsCount = 0, sumPaidCount = 0, sumUnpaidCount = 0, sumOverdue = 0;
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i]; var f = r.f;
        sumInit += Number(f.initial || 0); sumPaid += r.paidAmt; sumUnpaid += r.unpaidAmt;
        sumInsCount += r.insCount; sumPaidCount += r.paidCount; sumUnpaidCount += r.unpaidCount; sumOverdue += r.overdueCount;
        var catB = (f.category === 'scheduled') ? '<span class="badge badge-cat-sch">زمانبندی</span>' : '<span class="badge badge-cat-fac">تسهیلات</span>';
        var stB = r.settled ? '<span class="badge badge-settled">تسویه</span>' : '<span class="badge badge-active">جاری</span>';
        var overdue = r.overdueCount > 0 ? '<span class="badge badge-overdue">' + toFa(r.overdueCount) + '</span>' : '۰';
        var firstUnpaidCell = r.firstUnpaidDate ? (toFa(r.firstUnpaidDate) + (r.firstUnpaidAmount ? ' <span class="muted" style="font-size:0.7rem">(' + (hide ? '—' : fmtRep(r.firstUnpaidAmount, 'rff')) + ')</span>' : '')) : '—';
        var aH = '<div class="row-actions"><button class="row-btn open" data-fid="' + f.id + '" data-action="rff-inst">📖</button><button class="row-btn edit" data-fid="' + f.id + '" data-action="rff-edit">✎</button></div>';
        html += '<tr><td><strong>' + esc(f.name) + '</strong></td><td>' + catB + '</td><td>' + esc(r.bank ? r.bank.bank : '—') + '</td><td dir="ltr">' + toFa(esc(f.date || '—')) + '</td><td class="num">' + (hide ? '—' : fmtRep(f.initial || 0, 'rff')) + '</td><td class="num" style="color:#1e9e6a">' + (hide ? '—' : fmtRep(r.paidAmt, 'rff')) + '</td><td class="num" style="color:' + (r.unpaidAmt > 0 ? '#c0392b' : '#1e9e6a') + '">' + (hide ? '—' : fmtRep(r.unpaidAmt, 'rff')) + '</td><td class="num">' + toFa(r.insCount) + '</td><td class="num" style="color:#1e9e6a">' + toFa(r.paidCount) + '</td><td class="num" style="color:#c47c00">' + toFa(r.unpaidCount) + '</td><td class="num">' + overdue + '</td><td dir="ltr">' + firstUnpaidCell + '</td><td dir="ltr">' + toFa(r.lastPaidDate) + '</td><td>' + stB + '</td><td>' + aH + '</td></tr>';
    }
    if (rows.length === 0) html += '<tr><td colspan="15" class="empty-row">موردی یافت نشد.</td></tr>';
    html += '</tbody>';
    if (rows.length > 0) {
        html += '<tfoot><tr><td colspan="4" style="text-align:left">جمع کل</td><td class="num">' + (hide ? '—' : fmtRep(sumInit, 'rff')) + '</td><td class="num" style="color:#1e9e6a">' + (hide ? '—' : fmtRep(sumPaid, 'rff')) + '</td><td class="num" style="color:#c0392b">' + (hide ? '—' : fmtRep(sumUnpaid, 'rff')) + '</td><td class="num">' + toFa(sumInsCount) + '</td><td class="num" style="color:#1e9e6a">' + toFa(sumPaidCount) + '</td><td class="num" style="color:#c47c00">' + toFa(sumUnpaidCount) + '</td><td class="num">' + toFa(sumOverdue) + '</td><td colspan="4"></td></tr></tfoot>';
    }
    html += '</table></div>';
    document.getElementById('rff-result').innerHTML = html;
    document.getElementById('rff-count').textContent = toFa(rows.length);
    var unitEl = document.getElementById('rff-unit'); if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    setupRffSorting();
    var btns = document.querySelectorAll('#rff-result [data-action]');
    for (var bi = 0; bi < btns.length; bi++) btns[bi].addEventListener('click', function() {
        var fid = this.getAttribute('data-fid'); var act = this.getAttribute('data-action');
        var f = DB.load('facilities', []).find(function(x) { return x.id === fid; }); if (!f) return;
        if (act === 'rff-inst') loadFacilityForInstallments(f);
        else if (act === 'rff-edit') loadFacilityIntoForm(f); });
}
function renderFacilityFullDetail(rows) {
    var sorted = rows.slice().sort(function(a, b) { if (a.insCount !== b.insCount) return a.insCount - b.insCount; return compareVals(a.lastInsDate || '9999/99/99', b.lastInsDate || '9999/99/99'); });
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);
    var hide = getHideState('rff');
    var html = '<div class="rff-detail-list">';
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i]; var f = r.f; var ins = r.filteredIns || f.installments || [];
        var paidCount = r.paidCount; var unpaidCount = r.unpaidCount;
        var catLabel = (f.category === 'scheduled') ? 'زمانبندی' : 'تسهیلات';
        var cls = (f.category === 'scheduled') ? ' sch' : '';
        html += '<div class="rff-fac-card"><div class="rff-fac-head' + cls + '"><div><div class="rff-fac-title">' + esc(f.name) + '</div><div class="rff-fac-meta">';
        html += '<span class="chip-m">' + catLabel + '</span>';
        if (r.bank) html += '<span class="chip-m">🏦 ' + esc(r.bank.bank || '') + '</span>';
        if (f.date) html += '<span class="chip-m">📅 ' + toFa(f.date) + '</span>';
        html += '</div></div><div>' + (r.settled ? '<span class="badge badge-settled">✓ تسویه</span>' : '<span class="badge badge-active">در جریان</span>') + '</div></div>';
        html += '<div class="rff-fac-stats">';
        html += '<div class="item"><div class="lbl">مبلغ اولیه</div><div class="val">' + (hide ? '—' : formatMoney(f.initial || 0)) + '</div></div>';
        html += '<div class="item"><div class="lbl">پرداخت شده</div><div class="val" style="color:#1e9e6a">' + (hide ? '—' : formatMoney(r.paidAmt)) + '</div></div>';
        html += '<div class="item"><div class="lbl">باقی‌مانده</div><div class="val" style="color:' + (r.unpaidAmt > 0 ? '#c0392b' : '#1e9e6a') + '">' + (hide ? '—' : formatMoney(r.unpaidAmt)) + '</div></div>';
        html += '<div class="item"><div class="lbl">تعداد اقساط</div><div class="val">' + toFa(ins.length) + '</div></div>';
        html += '<div class="item"><div class="lbl">پرداخت‌شده</div><div class="val" style="color:#1e9e6a">' + toFa(paidCount) + '</div></div>';
        html += '<div class="item"><div class="lbl">باقی</div><div class="val" style="color:#c47c00">' + toFa(unpaidCount) + '</div></div>';
        html += '</div>';
        if (ins.length === 0) { html += '<div class="rff-empty">— قسطی در این بازه یافت نشد —</div>'; }
        else {
            html += '<table class="rff-inst-table"><thead><tr><th style="width:40px">#</th><th>تاریخ</th><th>مبلغ</th><th>وضعیت</th></tr></thead><tbody>';
            var sortedIns = ins.slice().sort(function(a, b) { return compareVals(a.date, b.date); });
            for (var j = 0; j < sortedIns.length; j++) {
                var inx = sortedIns[j];
                var isOverdue = (inx.status !== 'paid' && inx.date && inx.date < tStr);
                var rowCls = (inx.status === 'paid') ? 'paid-row' : (isOverdue ? 'overdue-row' : '');
                var stLabel = (inx.status === 'paid') ? '<span class="badge badge-paid">✓ پرداخت</span>' : (isOverdue ? '<span class="badge badge-overdue">سررسید گذشته</span>' : '<span class="badge badge-registered">ثبت</span>');
                html += '<tr class="' + rowCls + '"><td class="num">' + toFa(j + 1) + '</td><td dir="ltr">' + toFa(esc(inx.date || '—')) + '</td><td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(inx.amount || 0)) + '</td><td>' + stLabel + '</td></tr>';
            }
            html += '</tbody></table>';
        }
        html += '</div>';
    }
    if (rows.length === 0) html += '<div class="card"><p class="muted" style="text-align:center">موردی یافت نشد.</p></div>';
    html += '</div>';
    document.getElementById('rff-result').innerHTML = html;
    document.getElementById('rff-count').textContent = toFa(rows.length);
    var unitEl = document.getElementById('rff-unit'); if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
}
function filterVouchers(opts) { var l = DB.load('vouchers', []);
    return l.filter(function(v) { if (v.status !== 'approved') return false;
        if (opts.from && v.date < opts.from) return false; if (opts.to && v.date > opts.to) return false;
        if (opts.vtype && v.type !== opts.vtype) return false; if (opts.periodId && v.periodId !== opts.periodId) return false; return true; }); }
function computeAccountBalances(opts) {
    var vouchers = filterVouchers(opts); var accounts = DB.load('accounts', []); var balances = {};
    accounts.forEach(function(a) { balances[a.id] = { debit: 0, credit: 0 }; });
    vouchers.forEach(function(v) { v.lines.forEach(function(line) { if (!line.account) return;
        var acc = accounts.find(function(a) { return a.id === line.account; }); if (!acc) return;
        if (opts.cat && acc.cat !== opts.cat) return; if (opts.nature && acc.nature !== opts.nature) return;
        if (!balances[acc.id]) balances[acc.id] = { debit: 0, credit: 0 };
        balances[acc.id].debit += Number(line.debit) || 0; balances[acc.id].credit += Number(line.credit) || 0; }); });
    var db = {};
    if (opts.level === 4) { vouchers.forEach(function(v) { v.lines.forEach(function(line) { if (!line.account || !line.details) return;
        var acc = accounts.find(function(a) { return a.id === line.account; }); if (!acc) return;
        if (opts.cat && acc.cat !== opts.cat) return; if (opts.nature && acc.nature !== opts.nature) return;
        Object.keys(line.details).forEach(function(lt) { var did = line.details[lt]; if (!did) return;
            if (!db[did]) db[did] = { debit: 0, credit: 0, parent: acc.id, linkType: lt };
            db[did].debit += Number(line.debit) || 0; db[did].credit += Number(line.credit) || 0; }); }); }); }
    return { balances: balances, detailBalances: db };
}
function rollupBalances(accounts, balances) {
    var rolled = {}, idMap = {};
    accounts.forEach(function(a) { idMap[a.id] = a; rolled[a.id] = { debit: balances[a.id] ? balances[a.id].debit : 0, credit: balances[a.id] ? balances[a.id].credit : 0 }; });
    function depth(acc) { var d = 0, cur = acc; while (cur && cur.parent) { d++; cur = idMap[cur.parent]; } return d; }
    var sorted = accounts.slice().sort(function(a, b) { return depth(b) - depth(a); });
    sorted.forEach(function(a) { if (a.parent && rolled[a.parent]) { rolled[a.parent].debit += rolled[a.id].debit; rolled[a.parent].credit += rolled[a.id].credit; } });
    return rolled;
}
function runAccountReport() {
    var opts = { from: document.getElementById('ra-from').value, to: document.getElementById('ra-to').value, vtype: document.getElementById('ra-vtype').value, periodId: document.getElementById('ra-period').value, cat: document.getElementById('ra-cat').value, nature: document.getElementById('ra-nature').value, level: Number(document.getElementById('ra-level').value) || 3 };
    var accounts = DB.load('accounts', []); var result = computeAccountBalances(opts); var rolled = rollupBalances(accounts, result.balances);
    var hide = getHideState('ra');
    state.reportExpandedNodes = {}; var box = document.getElementById('ra-result'); box.innerHTML = ''; var tL = opts.level;
    var roots = accounts.filter(function(a) { return !a.parent; });
    function getCh(pid) { return accounts.filter(function(a) { return a.parent === pid; }); }
    var dM = {}; if (tL >= 4) { Object.keys(result.detailBalances).forEach(function(did) { var d = result.detailBalances[did]; if (!dM[d.parent]) dM[d.parent] = []; dM[d.parent].push({ id: did, linkType: d.linkType, debit: d.debit, credit: d.credit }); }); }
    var tD = 0, tC = 0, shown = 0;
    var container = document.createElement('div'); container.className = 'report-tree'; box.appendChild(container);
    function renderNode(node, level, parentEl) {
        var b = rolled[node.id] || { debit: 0, credit: 0 }; var net = b.debit - b.credit;
        var hC = getCh(node.id).length > 0 || (level === 3 && tL === 4 && dM[node.id] && dM[node.id].length > 0);
        var sS = level <= tL; var isE = state.reportExpandedNodes[node.id] !== false;
        if (sS) { var div = document.createElement('div'); div.className = 'rt-node level-' + level; var ek = node.id;
            var th = hC ? '<span class="rt-toggle" data-toggle="' + ek + '">' + (isE ? '▼' : '◀') + '</span>' : '<span class="rt-toggle empty">•</span>';
            var lB = ''; if (level === 1) lB = '<span class="rt-level-badge l1">گروه</span>'; else if (level === 2) lB = '<span class="rt-level-badge l2">کل</span>'; else if (level === 3) lB = '<span class="rt-level-badge l3">معین</span>';
            var nD = net === 0 ? '۰' : (hide ? '—' : fmtRep(Math.abs(net), 'ra'));
            div.innerHTML = th + '<span class="rt-name">' + esc(node.name) + '</span>' + lB + '<span class="rt-amounts"><span class="amt dr">بدهکار: ' + (hide ? '—' : fmtRep(b.debit, 'ra')) + '</span><span class="amt cr">بستانکار: ' + (hide ? '—' : fmtRep(b.credit, 'ra')) + '</span><span class="amt net">مانده: ' + nD + '</span></span>';
            var tEl = div.querySelector('[data-toggle]');
            if (tEl) tEl.addEventListener('click', function(e) { e.stopPropagation(); state.reportExpandedNodes[ek] = !isE; rerender(); });
            div.addEventListener('click', function(e) { if (e.target.closest('[data-toggle]')) return; openAccountTurnover(node.id, null); });
            parentEl.appendChild(div); tD += b.debit; tC += b.credit; shown++; }
        if (sS && isE) { var cB = document.createElement('div'); cB.className = 'rt-children';
            var chs = getCh(node.id); for (var ci = 0; ci < chs.length; ci++) renderNode(chs[ci], level + 1, cB);
            if (level === 3 && dM[node.id]) { var ds = dM[node.id];
                for (var di = 0; di < ds.length; di++) { (function(d) {
                    var dn = d.debit - d.credit; var dnD = dn === 0 ? '۰' : (hide ? '—' : fmtRep(Math.abs(dn), 'ra'));
                    var dD = document.createElement('div'); dD.className = 'rt-node level-4'; dD.style.cursor = 'pointer';
                    dD.innerHTML = '<span class="rt-toggle empty">•</span><span class="rt-name">' + esc(getDetailLabel(d.linkType, d.id)) + '</span><span class="rt-level-badge l4">' + linkTypeName(d.linkType) + '</span><span class="rt-amounts"><span class="amt dr">بدهکار: ' + (hide ? '—' : fmtRep(d.debit, 'ra')) + '</span><span class="amt cr">بستانکار: ' + (hide ? '—' : fmtRep(d.credit, 'ra')) + '</span><span class="amt net">مانده: ' + dnD + '</span></span>';
                    dD.addEventListener('click', function(ev) { ev.stopPropagation(); openAccountTurnover(node.id, { linkType: d.linkType, detailId: d.id }); });
                    cB.appendChild(dD); tD += d.debit; tC += d.credit; shown++;
                })(ds[di]); } }
            if (cB.children.length > 0) parentEl.appendChild(cB); }
    }
    function rerender() { container.innerHTML = ''; tD = 0; tC = 0; shown = 0;
        for (var i = 0; i < roots.length; i++) renderNode(roots[i], 1, container);
        var footer = document.createElement('div');
        footer.style.cssText = 'margin-top:14px;padding:14px;background:var(--primary-soft);border-radius:14px;font-weight:bold;color:var(--primary-dark);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;border:1px solid var(--primary-light)';
        var bt = (tD === tC) ? '✓ متوازن' : '⚠️ اختلاف: ' + (hide ? '—' : fmtRep(Math.abs(tD - tC), 'ra'));
        footer.innerHTML = '<span>جمع بدهکار: ' + (hide ? '—' : fmtRep(tD, 'ra')) + '</span><span>جمع بستانکار: ' + (hide ? '—' : fmtRep(tC, 'ra')) + '</span><span>' + bt + '</span><span>واحد: ' + currencyLabel() + '</span>';
        container.appendChild(footer); document.getElementById('ra-count').textContent = toFa(shown); }
    rerender(); window._renderAccountReportTree = rerender;
    autoAttachReportHelpers();
}
function runTrialBalance() {
    var opts = { from: document.getElementById('rt-from').value, to: document.getElementById('rt-to').value, vtype: document.getElementById('rt-vtype').value, periodId: document.getElementById('rt-period').value, cat: document.getElementById('rt-cat').value, nature: document.getElementById('rt-nature').value, level: Number(document.getElementById('rt-level').value) || 3 };
    var accounts = DB.load('accounts', []); var result = computeAccountBalances(opts); var rolled = rollupBalances(accounts, result.balances);
    var hide = getHideState('rt');
    var rows = []; function getCh(pid) { return accounts.filter(function(a) { return a.parent === pid; }); }
    function walk(node, level) { var b = rolled[node.id] || { debit: 0, credit: 0 }; var net = b.debit - b.credit;
        if (opts.level === 4 && level === 3) { var sD = 0, sC = 0;
            Object.keys(result.detailBalances).forEach(function(did) { var d = result.detailBalances[did]; if (d.parent !== node.id) return; sD += d.debit; sC += d.credit;
                var dn = d.debit - d.credit; rows.push({ name: getDetailLabel(d.linkType, did) + ' (' + node.name + ')', level: 4, debit: d.debit, credit: d.credit, md: dn > 0 ? dn : 0, mc: dn < 0 ? -dn : 0 }); });
            var dd = b.debit - sD, dc = b.credit - sC;
            if (Math.abs(dd) > 0.5 || Math.abs(dc) > 0.5) { var dn2 = dd - dc; rows.push({ name: node.name + ' (بدون تفصیلی)', level: 4, debit: dd, credit: dc, md: dn2 > 0 ? dn2 : 0, mc: dn2 < 0 ? -dn2 : 0 }); }
            return; }
        if (level === opts.level) { if (b.debit > 0 || b.credit > 0) rows.push({ name: node.name, level: level, debit: b.debit, credit: b.credit, md: net > 0 ? net : 0, mc: net < 0 ? -net : 0 }); return; }
        if (level < opts.level) { var chs = getCh(node.id); for (var ci = 0; ci < chs.length; ci++) walk(chs[ci], level + 1); } }
    var roots = accounts.filter(function(a) { return !a.parent; });
    for (var i = 0; i < roots.length; i++) walk(roots[i], 1);
    var html = '<div class="table-wrap"><table class="report-table" id="rt-table"><thead><tr><th>عنوان</th><th>سطح</th><th>گردش بدهکار</th><th>گردش بستانکار</th><th>مانده بدهکار</th><th>مانده بستانکار</th></tr></thead><tbody>';
    var tD = 0, tC = 0, tMD = 0, tMC = 0;
    for (var r = 0; r < rows.length; r++) { var row = rows[r]; tD += row.debit; tC += row.credit; tMD += row.md; tMC += row.mc;
        var lN = row.level === 1 ? 'گروه' : (row.level === 2 ? 'کل' : (row.level === 3 ? 'معین' : 'تفصیلی'));
        html += '<tr><td>' + esc(row.name) + '</td><td>' + lN + '</td><td class="num dr">' + (hide ? '—' : fmtRep(row.debit, 'rt')) + '</td><td class="num cr">' + (hide ? '—' : fmtRep(row.credit, 'rt')) + '</td><td class="num dr">' + (hide ? '—' : (row.md ? fmtRep(row.md, 'rt') : '—')) + '</td><td class="num cr">' + (hide ? '—' : (row.mc ? fmtRep(row.mc, 'rt') : '—')) + '</td></tr>'; }
    html += '</tbody><tfoot><tr><td colspan="2" style="text-align:left">جمع</td><td class="num dr">' + (hide ? '—' : fmtRep(tD, 'rt')) + '</td><td class="num cr">' + (hide ? '—' : fmtRep(tC, 'rt')) + '</td><td class="num dr">' + (hide ? '—' : fmtRep(tMD, 'rt')) + '</td><td class="num cr">' + (hide ? '—' : fmtRep(tMC, 'rt')) + '</td></tr></tfoot></table></div>';
    document.getElementById('rt-result').innerHTML = html; document.getElementById('rt-count').textContent = toFa(rows.length);
    applyColVisibility('rt-table');
    autoAttachReportHelpers();
}
function clearPersonForm() { ['pr-id','pr-first','pr-last','pr-father','pr-national-id','pr-birth','pr-mobile','pr-phone','pr-email','pr-bank-title','pr-acc','pr-iban','pr-card','pr-address'].forEach(function(i) { document.getElementById(i).value = ''; }); }
function clearCompanyForm() { ['co-id','co-name','co-phone','co-email','co-address'].forEach(function(i) { document.getElementById(i).value = ''; }); }
function clearBAForm() { ['ba-id','ba-bank','ba-branch-code','ba-branch-name','ba-account','ba-iban','ba-card','ba-order','ba-min-balance'].forEach(function(i) { document.getElementById(i).value = ''; }); document.getElementById('ba-type').value = ''; }
function clearCBForm() { ['cb-id','cb-title','cb-unit','cb-order'].forEach(function(i) { document.getElementById(i).value = ''; }); document.getElementById('cb-type').value = ''; }
function clearFiscalForm() { ['fiscal-id','fiscal-title','fiscal-from','fiscal-to'].forEach(function(x) { document.getElementById(x).value = ''; }); }
function clearFacForm() { ['fc-id','fc-name','fc-date','fc-initial','fc-paid'].forEach(function(x) { document.getElementById(x).value = ''; }); document.getElementById('fc-category').value = 'facility'; document.getElementById('fc-bank').value = ''; document.getElementById('fac-installments-card').style.display = 'none'; currentFacilityId = null; currentInstallments = []; }
function makeAllTablesResizable() { ['fiscal-table','persons-table','comp-table','ba-table','cb-table','proj-table','voucher-table-list','rt-table','ri-table','rf-table','rff-table','cfs-table','cf-table','cfd-table','rr-table','dc-table','turnover-table'].forEach(function(id) { var t = document.getElementById(id); if (t) makeTableResizable(t); }); }
function autoAttachReportHelpers() {
    setTimeout(function() {
        makeAllTablesResizable();
        ['cf-table','cfd-table','rt-table','ri-table','rf-table','rff-table','rr-table','dc-table','turnover-table'].forEach(function(id) {
            var t = document.getElementById(id);
            if (t) applyColVisibility(id);
        });
        buildHeaderButtons();
        attachDatePickers();
    }, 60);
}

function renderChartTree(cid, editable) {
    var box = document.getElementById(cid); if (!box) return;
    var accounts = DB.load('accounts', []); box.innerHTML = '';
    if (accounts.length === 0) { box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">حسابی تعریف نشده.</p>'; return; }
    var sI = document.getElementById('charttree-search'); var q = (sI && sI.value || '').trim().toLowerCase();
    if (q) { var results = accounts.filter(function(a) { return (a.code || '').toLowerCase().indexOf(q) !== -1 || (a.name || '').toLowerCase().indexOf(q) !== -1; });
        for (var r = 0; r < results.length; r++) { var node = results[r]; var div = document.createElement('div'); div.className = 'tree-node';
            div.innerHTML = '<span class="tn-code">' + esc(node.code) + '</span><span class="tn-name">' + esc(node.name) + '</span>';
            (function(nn) { div.addEventListener('click', function() { if (editable) openChartForm(nn.id, computeLevelIn(nn.id), null); }); })(node); box.appendChild(div); }
    } else { var roots = accounts.filter(function(a) { return !a.parent; }); for (var i = 0; i < roots.length; i++) box.appendChild(buildNode(roots[i], accounts, 1, editable)); }
}
function computeLevelIn(id) { var accounts = DB.load('accounts', []); var lvl = 1, cur = accounts.find(function(a) { return a.id === id; });
    while (cur && cur.parent) { lvl++; cur = accounts.find(function(a) { return a.id === cur.parent; }); } return lvl; }
function buildNode(node, all, level, editable) {
    var wrap = document.createElement('div'); var div = document.createElement('div'); div.className = 'tree-node';
    var children = all.filter(function(a) { return a.parent === node.id; }); var hasC = children.length > 0;
    var exp = state.expandedNodes[node.id] === true;
    var tog = document.createElement('span'); tog.className = 'tree-toggle'; tog.textContent = hasC ? (exp ? '▼' : '◀') : '•';
    if (!hasC) tog.style.visibility = 'hidden';
    tog.addEventListener('click', function(e) { e.stopPropagation(); state.expandedNodes[node.id] = !exp; saveState('expandedNodes'); renderChartTree('chart-tree', editable); });
    div.appendChild(tog);
    var icon = level === 1 ? '📁' : (level === 2 ? '📂' : '📄');
    var lN = level === 1 ? 'گروه' : (level === 2 ? 'کل' : (level === 3 ? 'معین' : 'تفصیلی'));
    var html = '<span class="tn-icon">' + icon + '</span><span class="tn-code">' + esc(node.code) + '</span><span class="tn-name">' + esc(node.name) + '</span><span class="tn-level">' + lN + '</span>';
    if (node.links && node.links.length > 0) html += '<span class="tn-link">' + node.links.map(linkTypeName).join('، ') + '</span>';
    if (node.cfEffect) html += '<span class="tn-cf">💸 گردش وجه نقد</span>';
    div.insertAdjacentHTML('beforeend', html);
    if (editable) {
        if (level < 3) { var aB = document.createElement('button'); aB.className = 'tree-add-btn'; aB.textContent = '+';
            aB.addEventListener('click', function(e) { e.stopPropagation(); state.expandedNodes[node.id] = true; saveState('expandedNodes'); openChartForm(null, level + 1, node.id); }); div.appendChild(aB); }
        var dB = document.createElement('button'); dB.className = 'tree-del-btn'; dB.textContent = '×';
        dB.addEventListener('click', function(e) { e.stopPropagation(); if (!confirm('حذف شود؟')) return;
            var accs = DB.load('accounts', []); var toDel = {};
            function collect(id) { toDel[id] = true; accs.forEach(function(a) { if (a.parent === id) collect(a.id); }); }
            collect(node.id); var nl = accs.filter(function(a) { return !toDel[a.id]; }); DB.save('accounts', nl);
            renderChartTree('chart-tree', true); });
        div.appendChild(dB);
    }
    div.addEventListener('click', function(e) {
        if (e.target.classList.contains('tree-toggle')) return; if (e.target.classList.contains('tree-add-btn')) return; if (e.target.classList.contains('tree-del-btn')) return;
        if (editable) openChartForm(node.id, level, null);
    });
    wrap.appendChild(div);
    if (hasC && exp) { var cb = document.createElement('div'); cb.className = 'tree-children';
        for (var i = 0; i < children.length; i++) cb.appendChild(buildNode(children[i], all, level + 1, editable));
        wrap.appendChild(cb); }
    return wrap;
}
function setAllExpanded(val) { var accounts = DB.load('accounts', []); state.expandedNodes = {};
    if (val) for (var i = 0; i < accounts.length; i++) state.expandedNodes[accounts[i].id] = true;
    saveState('expandedNodes'); renderChartTree('chart-tree', true); }
function openChartForm(id, level, parentId) {
    var card = document.getElementById('chart-form-card'); var accounts = DB.load('accounts', []);
    var node = id ? accounts.find(function(a) { return a.id === id; }) : null; card.style.display = 'block';
    var titles = { 1: 'گروه', 2: 'حساب کل', 3: 'حساب معین' };
    document.getElementById('chart-form-title').textContent = node ? ('ویرایش ' + (titles[level] || '')) : ('تعریف ' + (titles[level] || 'حساب'));
    document.getElementById('ch-id').value = node ? node.id : ''; document.getElementById('ch-level').value = level;
    document.getElementById('ch-parent').value = node ? (node.parent || '') : (parentId || '');
    var sc = '';
    if (!node) {
        if (parentId) { var par = accounts.find(function(a) { return a.id === parentId; });
            if (par) { var sib = accounts.filter(function(a) { return a.parent === parentId; }); var w = level === 2 ? 2 : 3;
                var mx = 0; sib.forEach(function(s) { var n = parseInt(s.code.split('-').pop()) || 0; if (n > mx) mx = n; }); sc = par.code + '-' + String(mx + 1).padStart(w, '0'); } }
        else { var roots = accounts.filter(function(a) { return !a.parent; }); var m = 0; roots.forEach(function(r) { var n = parseInt(r.code) || 0; if (n > m) m = n; }); sc = String(m + 1); }
    }
    document.getElementById('ch-code').value = node ? node.code : sc;
    document.getElementById('ch-name').value = node ? node.name : '';
    document.getElementById('ch-cat').value = node ? (node.cat || 'permanent') : 'permanent';
    document.getElementById('ch-nature').value = node ? (node.nature || 'debit') : 'debit';
    document.getElementById('ch-active').checked = node ? (node.active !== false) : true;
    document.getElementById('ch-cf-effect').checked = node ? !!node.cfEffect : false;
    var nl = node && node.links ? node.links : [];
    var cbs = document.querySelectorAll('#ch-links-box input[type=checkbox]');
    for (var i = 0; i < cbs.length; i++) cbs[i].checked = nl.indexOf(cbs[i].value) !== -1;
    document.getElementById('ch-link-wrap').style.display = (level === 3) ? 'block' : 'none';
    document.getElementById('ch-cf-wrap').style.display = (level === 3) ? 'block' : 'none';
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function loadDefaultChart() {
    var existing = DB.load('accounts', []); if (existing.length > 0) { alert('قبلاً تعریف شده.'); return; }
    var accounts = []; var counter = 0;
    function add(code, name, parent, cat, nature, links, cfEffect) { counter++; accounts.push({ id: 'a' + counter, code: code, name: name, parent: parent || '', cat: cat || 'permanent', nature: nature || 'debit', active: true, links: links || [], cfEffect: !!cfEffect }); return 'a' + counter; }
    var g1 = add('1', 'دارایی‌ها', '', 'permanent', 'debit');
    var k11 = add('1-01', 'دارایی جاری', g1, 'permanent', 'debit');
    add('1-01-001', 'صندوق', k11, 'permanent', 'debit', ['cashbox'], true);
    add('1-01-002', 'بانک‌ها', k11, 'permanent', 'debit', ['bank'], true);
    add('1-01-003', 'حساب‌های دریافتنی', k11, 'permanent', 'debit', ['person','company']);
    var g2 = add('2', 'بدهی‌ها', '', 'permanent', 'credit');
    var k21 = add('2-01', 'بدهی جاری', g2, 'permanent', 'credit');
    add('2-01-001', 'حساب‌های پرداختنی', k21, 'permanent', 'credit', ['person','company']);
    add('2-01-002', 'تسهیلات بانکی پرداختنی', k21, 'permanent', 'credit', ['facility']);
    var g3 = add('3', 'سرمایه', '', 'permanent', 'credit'); add('3-01', 'سرمایه اولیه', g3, 'permanent', 'credit');
    var g4 = add('4', 'درآمدها', '', 'temporary', 'credit'); add('4-01', 'درآمد عملیاتی', g4, 'temporary', 'credit');
    var g5 = add('5', 'هزینه‌ها', '', 'temporary', 'debit'); var k51 = add('5-01', 'هزینه‌های عمومی', g5, 'temporary', 'debit');
    add('5-01-001', 'هزینه ایاب و ذهاب', k51, 'temporary', 'debit', ['project']);
    add('5-01-002', 'هزینه ملزومات', k51, 'temporary', 'debit', ['project']);
    add('5-01-003', 'هزینه سوخت', k51, 'temporary', 'debit', ['project']);
    add('5-01-004', 'هزینه پذیرایی', k51, 'temporary', 'debit', ['project']);
    add('5-01-005', 'هزینه اجاره', k51, 'temporary', 'debit', ['project']);
    add('5-01-006', 'هزینه قبوض', k51, 'temporary', 'debit', ['project']);
    add('5-01-007', 'حقوق و دستمزد', k51, 'temporary', 'debit', ['project']);
    DB.save('accounts', accounts); showToast('✅ بارگذاری شد.');
    state.expandedNodes = {}; saveState('expandedNodes');
    renderChartTree('chart-tree', true);
    document.getElementById('load-default-chart').disabled = true; refreshTemplateSelect();
}
var voucherLines = []; var currentVoucherStatus = 'draft';
function renderVoucherLines() {
    var box = document.getElementById('voucher-lines'); if (!box) return; box.innerHTML = '';
    if (voucherLines.length === 0) voucherLines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
    var leaves = getLeafAccounts(); var accounts = DB.load('accounts', []);
    for (var i = 0; i < voucherLines.length; i++) (function(idx) {
        var line = voucherLines[idx]; if (!line.details) line.details = {};
        var wrap = document.createElement('div'); wrap.className = 'voucher-line' + (line.locked ? ' locked' : ''); wrap.setAttribute('data-line-id', line.id);
        var numSpan = document.createElement('span'); numSpan.className = 'ln-num' + (line.locked ? ' locked-tag' : ''); numSpan.textContent = '#' + toFa(idx + 1) + (line.locked ? ' 🔒' : ''); wrap.appendChild(numSpan);
        var mainGrid = document.createElement('div'); mainGrid.className = 'ln-search-row'; mainGrid.style.paddingTop = '14px';
        var sA = document.createElement('input'); sA.type = 'text'; sA.className = 'ln-search'; sA.placeholder = '🔍 معین...';
        var selA = document.createElement('select');
        var fillA = function(q) { var cur = line.account; var f = leaves.filter(function(l) { if (!q) return true; return getAccountSearchText(l.id, accounts).indexOf(q) !== -1; });
            selA.innerHTML = ''; var ph = document.createElement('option'); ph.value = ''; ph.textContent = '— معین —'; selA.appendChild(ph);
            for (var k = 0; k < f.length; k++) { var o = document.createElement('option'); o.value = f[k].id; o.textContent = getAccountLabel(f[k].id, accounts); if (cur === f[k].id) o.selected = true; selA.appendChild(o); } };
        fillA(''); if (line.locked) selA.disabled = true;
        selA.addEventListener('change', function() { line.account = this.value; line.details = {}; renderVoucherLines(); });
        sA.addEventListener('input', function() { fillA(normalizeDigits(this.value.trim().toLowerCase())); });
        mainGrid.appendChild(sA); mainGrid.appendChild(selA);
        wrap.appendChild(mainGrid);
        var acc = accounts.find(function(a) { return a.id === line.account; });
        if (acc && acc.links && acc.links.length > 0) {
            for (var li = 0; li < acc.links.length; li++) { var lt = acc.links[li]; var items = getLinkedItems(lt); if (items.length === 0) continue;
                var detGrid = document.createElement('div'); detGrid.className = 'ln-search-row'; detGrid.style.marginTop = '8px';
                var sD = document.createElement('input'); sD.type = 'text'; sD.className = 'ln-search'; sD.placeholder = '🔍 ' + linkTypeName(lt) + '...';
                var selD = document.createElement('select');
                var fillD = function(q) { var cv = (line.details && line.details[lt]) || '';
                    var f = items.filter(function(it) { if (!q) return true; return getLinkedItemLabel(lt, it).toLowerCase().indexOf(q) !== -1; });
                    buildOptionsInto(selD, f, function(it) { return getLinkedItemLabel(lt, it); }, cv, '— ' + linkTypeName(lt) + ' —'); };
                fillD(''); if (line.locked) selD.disabled = true;
                (function(ltype, sR) { sR.addEventListener('change', function() { line.details[ltype] = this.value; }); })(lt, selD);
                (function(sR, its, ltype, sI) { sI.addEventListener('input', function() { var q = normalizeDigits(this.value.trim().toLowerCase()); var cv = sR.value;
                    var f = its.filter(function(it) { return !q || getLinkedItemLabel(ltype, it).toLowerCase().indexOf(q) !== -1; });
                    buildOptionsInto(sR, f, function(it) { return getLinkedItemLabel(ltype, it); }, cv, '— ' + linkTypeName(ltype) + ' —'); }); })(selD, items, lt, sD);
                detGrid.appendChild(sD); detGrid.appendChild(selD);
                wrap.appendChild(detGrid); } }
        var r3 = document.createElement('div'); r3.className = 'ln-row r4'; r3.style.marginTop = '10px';
        var wD = document.createElement('div'); wD.className = 'ln-amount-wrap';
        var iD = document.createElement('input'); iD.type = 'text'; iD.inputMode = 'numeric'; iD.dir = 'ltr'; iD.placeholder = 'بدهکار'; iD.value = line.debit ? formatRaw(line.debit) : '';
        iD.addEventListener('input', function() { var v = normalizeDigits(this.value); var r = v.replace(/[^\d]/g, ''); this.value = r; var x = Number(r) || 0; line.debit = x; if (x > 0 && line.credit !== 0) { line.credit = 0; iC.value = ''; } updateVoucherTotals(); });
        iD.addEventListener('blur', function() { var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0; this.value = v ? formatRaw(v) : ''; line.debit = v; updateVoucherTotals(); });
        var cD = document.createElement('button'); cD.type = 'button'; cD.className = 'calc-btn'; cD.title = 'ماشین حساب'; cD.textContent = '🧮';
        cD.addEventListener('click', function() { calcOpen(function() { return line.debit || 0; }, function(v) { line.debit = v; if (v > 0 && line.credit !== 0) { line.credit = 0; } renderVoucherLines(); updateVoucherTotals(); }, 'ماشین حساب بدهکار'); });
        wD.appendChild(iD); wD.appendChild(cD);
        var wC = document.createElement('div'); wC.className = 'ln-amount-wrap';
        var iC = document.createElement('input'); iC.type = 'text'; iC.inputMode = 'numeric'; iC.dir = 'ltr'; iC.placeholder = 'بستانکار'; iC.value = line.credit ? formatRaw(line.credit) : '';
        iC.addEventListener('input', function() { var v = normalizeDigits(this.value); var r = v.replace(/[^\d]/g, ''); this.value = r; var x = Number(r) || 0; line.credit = x; if (x > 0 && line.debit !== 0) { line.debit = 0; iD.value = ''; } updateVoucherTotals(); });
        iC.addEventListener('blur', function() { var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0; this.value = v ? formatRaw(v) : ''; line.credit = v; updateVoucherTotals(); });
        var cC = document.createElement('button'); cC.type = 'button'; cC.className = 'calc-btn'; cC.title = 'ماشین حساب'; cC.textContent = '🧮';
        cC.addEventListener('click', function() { calcOpen(function() { return line.credit || 0; }, function(v) { line.credit = v; if (v > 0 && line.debit !== 0) { line.debit = 0; } renderVoucherLines(); updateVoucherTotals(); }, 'ماشین حساب بستانکار'); });
        wC.appendChild(iC); wC.appendChild(cC);
        r3.appendChild(wD); r3.appendChild(wC);
        var iT = document.createElement('input'); iT.type = 'text'; iT.dir = 'ltr'; iT.placeholder = 'ش پیگیری'; iT.value = line.trackingNumber || ''; iT.addEventListener('input', function() { line.trackingNumber = this.value; }); r3.appendChild(iT);
        var iTD = document.createElement('input'); iTD.type = 'text'; iTD.dir = 'ltr'; iTD.placeholder = 'ت پیگیری'; iTD.value = line.trackingDate || ''; iTD.classList.add('date-picker'); iTD.addEventListener('input', function() { line.trackingDate = this.value; }); r3.appendChild(iTD);
        wrap.appendChild(r3);
        var r4 = document.createElement('div'); r4.className = 'desc-row';
        var iDsc = document.createElement('input'); iDsc.type = 'text'; iDsc.placeholder = 'شرح قلم *'; iDsc.value = line.description || ''; iDsc.setAttribute('list', 'std-desc-list');
        if (!line.description && (Number(line.debit) > 0 || Number(line.credit) > 0)) iDsc.classList.add('desc-required');
        iDsc.addEventListener('input', function() { line.description = this.value; this.classList.remove('desc-required'); });
        r4.appendChild(iDsc);
        var btnAddDesc = document.createElement('button'); btnAddDesc.type = 'button'; btnAddDesc.className = 'desc-add-btn'; btnAddDesc.textContent = '＋';
        btnAddDesc.addEventListener('click', function() { addDescriptionToStandard(iDsc.value); }); r4.appendChild(btnAddDesc); wrap.appendChild(r4);
        var aW = document.createElement('div'); aW.className = 'ln-actions';
        var bU = document.createElement('button'); bU.className = 'ln-btn'; bU.textContent = '↑'; if (idx === 0) bU.disabled = true; bU.title = 'انتقال به بالا'; bU.addEventListener('click', function() { moveLine(idx, -1); });
        var bD = document.createElement('button'); bD.className = 'ln-btn'; bD.textContent = '↓'; if (idx === voucherLines.length - 1) bD.disabled = true; bD.title = 'انتقال به پایین'; bD.addEventListener('click', function() { moveLine(idx, 1); });
        var bCp = document.createElement('button'); bCp.className = 'ln-btn ln-copy'; bCp.textContent = '📋 کپی'; bCp.title = 'کپی ردیف'; bCp.addEventListener('click', function() { copyVoucherLine(idx); });
        var bSwap = document.createElement('button'); bSwap.className = 'ln-btn ln-swap'; bSwap.textContent = '🔄 بدهکار/بستانکار'; bSwap.title = 'جابه‌جایی بدهکار و بستانکار';
        bSwap.addEventListener('click', function() { var tmpD = line.debit; line.debit = line.credit; line.credit = tmpD; renderVoucherLines(); showToast('🔄 بدهکار/بستانکار جابه‌جا شد.'); });
        var bMoveTo = document.createElement('button'); bMoveTo.className = 'ln-btn ln-moveto'; bMoveTo.textContent = '📍 انتقال به ردیف'; bMoveTo.title = 'انتقال به ردیف مشخص';
        bMoveTo.addEventListener('click', function() { var total = voucherLines.length; if (total < 2) { showToast('فقط یک ردیف موجود است.'); return; }
            var ans = prompt('این ردیف به کدام شماره ردیف منتقل شود؟ (۱ تا ' + toFa(total) + ')\nشماره فعلی: ' + toFa(idx + 1), String(idx + 1)); if (!ans) return;
            var target = Number(normalizeDigits(ans)); if (isNaN(target) || target < 1 || target > total) { alert('شماره نامعتبر.'); return; }
            target = target - 1; if (target === idx) return;
            var movedLine = voucherLines.splice(idx, 1)[0]; voucherLines.splice(target, 0, movedLine);
            window._focusLineId = movedLine.id; renderVoucherLines(); showToast('📍 ردیف به شماره ' + toFa(target + 1) + ' منتقل شد.'); });
        var bClearDesc = document.createElement('button'); bClearDesc.className = 'ln-btn ln-clear-desc'; bClearDesc.textContent = '🧹 پاک شرح'; bClearDesc.title = 'خالی کردن شرح این قلم';
        bClearDesc.addEventListener('click', function() { line.description = ''; iDsc.value = ''; iDsc.classList.remove('desc-required'); iDsc.focus(); });
        var bX = document.createElement('button'); bX.className = 'ln-btn ln-del'; bX.textContent = '× حذف ردیف'; bX.title = 'حذف این ردیف';
        bX.addEventListener('click', function() { if (!confirm('این ردیف حذف شود؟')) return; voucherLines.splice(idx, 1); renderVoucherLines(); });
        aW.appendChild(bU); aW.appendChild(bD); aW.appendChild(bCp); aW.appendChild(bSwap); aW.appendChild(bMoveTo); aW.appendChild(bClearDesc); aW.appendChild(bX); wrap.appendChild(aW); box.appendChild(wrap); attachDatePickers();
    })(i);
    updateVoucherTotals();
    if (window._focusLineId) { var tid = window._focusLineId; window._focusLineId = null;
        setTimeout(function() { var t = box.querySelector('[data-line-id="' + tid + '"]'); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.add('focus-highlight'); setTimeout(function() { t.classList.remove('focus-highlight'); }, 1200); } }, 60); }
}
function copyVoucherLine(idx) {
    var src = voucherLines[idx]; if (!src) return;
    var copyLine = JSON.parse(JSON.stringify(src));
    copyLine.id = uid();
    voucherLines.splice(idx + 1, 0, copyLine);
    window._focusLineId = copyLine.id;
    renderVoucherLines();
    showToast('📋 ردیف کپی شد در پایین');
}
function moveLine(idx, dir) { var ni = idx + dir; if (ni < 0 || ni >= voucherLines.length) return;
    var tmp = voucherLines[idx]; voucherLines[idx] = voucherLines[ni]; voucherLines[ni] = tmp;
    window._focusLineId = voucherLines[ni].id; renderVoucherLines(); }
function updateVoucherTotals() {
    var td = 0, tc = 0; for (var i = 0; i < voucherLines.length; i++) { td += Number(voucherLines[i].debit) || 0; tc += Number(voucherLines[i].credit) || 0; }
    document.getElementById('v-total-debit').textContent = formatMoney(td); document.getElementById('v-total-credit').textContent = formatMoney(tc);
    var st = document.getElementById('v-balance-status');
    if (td === tc && td > 0) st.innerHTML = '<span class="ok">✓ متوازن</span>';
    else if (td > 0 || tc > 0) st.innerHTML = '<span class="err">اختلاف: ' + formatMoney(Math.abs(td - tc)) + '</span>';
    else st.textContent = '';
}
function renderVoucherList() {
    var filter = document.getElementById('vl-period-filter').value; var search = (document.getElementById('vlist-search').value || '').toLowerCase();
    var vouchers = DB.load('vouchers', []); if (filter) vouchers = vouchers.filter(function(v) { return v.periodId === filter; });
    var periods = DB.load('fiscalPeriods', []); var pM = {}; periods.forEach(function(p) { pM[p.id] = p.title; });
    if (search) vouchers = vouchers.filter(function(v) { var pN = pM[v.periodId] || ''; var txt = (v.number + ' ' + v.date + ' ' + (v.desc || '') + ' ' + voucherTypeName(v.type) + ' ' + pN).toLowerCase(); return txt.indexOf(search) !== -1; });
    var st = sortState.vouchers;
    vouchers.sort(function(a, b) { var va, vb;
        if (st.col === 'periodName') { va = pM[a.periodId] || ''; vb = pM[b.periodId] || ''; }
        else if (st.col === 'status') { va = a.status === 'approved' ? 'ت' : 'پ'; vb = b.status === 'approved' ? 'ت' : 'پ'; }
        else if (st.col === 'type') { va = voucherTypeName(a.type); vb = voucherTypeName(b.type); }
        else if (st.col === 'amount') { va = getVoucherAmount(a); vb = getVoucherAmount(b); }
        else { va = a[st.col]; vb = b[st.col]; }
        var c = compareVals(va, vb); return st.dir === 'asc' ? c : -c; });
    var tb = document.getElementById('voucher-list-body'); if (!tb) return; tb.innerHTML = ''; var shown = 0;
    var hide = getHideState('voucher-list');
    for (var i = 0; i < vouchers.length; i++) { var v = vouchers[i]; shown++; var status = v.status || 'draft';
        var issues = getVoucherIssues(v); var badge;
        if (status === 'approved') badge = '<span class="badge badge-approved">✓ تأیید</span>';
        else if (issues.length > 0) badge = '<span class="badge badge-draft" title="ناقص">پیش‌نویس ⚠️</span>';
        else badge = '<span class="badge badge-draft">پیش‌نویس</span>';
        var tB = '<span class="badge badge-type">' + voucherTypeName(v.type) + '</span>'; var pN = pM[v.periodId] || '—'; var amt = getVoucherAmount(v);
        var tr = document.createElement('tr'); if (status === 'approved') tr.classList.add('approved-row');
        var aH = '<div class="row-actions"><button class="row-btn open" data-id="' + v.id + '" data-action="preview">👁</button>';
        if (status === 'draft') { aH += '<button class="row-btn edit" data-id="' + v.id + '" data-action="edit">✎</button><button class="row-btn approve" data-id="' + v.id + '" data-action="approve">✓</button><button class="row-btn del" data-id="' + v.id + '" data-action="delete">×</button>'; }
        else { aH += '<button class="row-btn unapprove" data-id="' + v.id + '" data-action="unapprove">↩</button>'; }
        aH += '</div>';
        tr.innerHTML = '<td dir="ltr">' + toFa(esc(v.number)) + '</td><td dir="ltr">' + toFa(esc(v.date)) + '</td><td>' + tB + '</td><td>' + esc(pN) + '</td><td>' + esc(v.desc) + '</td><td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(amt)) + '</td><td>' + badge + '</td><td>' + aH + '</td>';
        tb.appendChild(tr); }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="8" class="empty-row">سندی یافت نشد.</td></tr>';
    document.getElementById('vlist-count').textContent = toFa(shown);
    var allBtns = tb.querySelectorAll('.row-btn');
    for (var b = 0; b < allBtns.length; b++) allBtns[b].addEventListener('click', function() {
        var id = this.getAttribute('data-id'); var action = this.getAttribute('data-action'); var v = findVoucherById(id); if (!v) return;
        if (action === 'preview') { openVoucherPreview(v); return; }
        if (action === 'edit') { loadVoucherForEdit(v); return; }
        if (action === 'approve') { var issues = getVoucherIssues(v);
            if (issues.length > 0) { alert('⚠️ سند قابل تأیید نیست:\n\n• ' + issues.join('\n• ')); return; }
            var l = DB.load('vouchers', []); for (var x = 0; x < l.length; x++) if (l[x].id === id) l[x].status = 'approved'; DB.save('vouchers', l); renderVoucherList(); showToast('✅ سند تأیید شد.'); return; }
        if (action === 'unapprove') { if (!confirm('برگشت؟')) return;
            var l2 = DB.load('vouchers', []); for (var y = 0; y < l2.length; y++) if (l2[y].id === id) l2[y].status = 'draft'; DB.save('vouchers', l2); renderVoucherList(); return; }
        if (action === 'delete') { if (!confirm('حذف شود؟')) return;
            var l3 = DB.load('vouchers', []); l3 = l3.filter(function(x) { return x.id !== id; }); DB.save('vouchers', l3); renderVoucherList(); updateHomeWidgets(); return; } });
    applyColVisibility('voucher-table-list');
}
function setupSorting() {
    var ths = document.querySelectorAll('#voucher-table-list th[data-sort]');
    for (var i = 0; i < ths.length; i++) ths[i].addEventListener('click', function() {
        var col = this.getAttribute('data-sort');
        if (sortState.vouchers.col === col) sortState.vouchers.dir = sortState.vouchers.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.vouchers.col = col; sortState.vouchers.dir = 'asc'; }
        renderVoucherList(); });
}
function findVoucherById(id) { var l = DB.load('vouchers', []); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
function loadVoucherForEdit(v) {
    document.getElementById('v-id').value = v.id; document.getElementById('v-number').value = v.number;
    document.getElementById('v-date').value = v.date; document.getElementById('v-type').value = v.type || 'general';
    document.getElementById('v-desc').value = v.desc || '';
    currentVoucherStatus = v.status || 'draft'; voucherLines = JSON.parse(JSON.stringify(v.lines));
    renderVoucherLines(); goToPage('voucher-new');
}
function newVoucherForm() {
    document.getElementById('v-id').value = '';
    document.getElementById('v-number').value = getNextVoucherNumberForPeriod(state.activePeriodId || '');
    document.getElementById('v-date').value = todayJalaliStr();
    document.getElementById('v-type').value = 'general'; document.getElementById('v-desc').value = '';
    currentVoucherStatus = 'draft';
    voucherLines = [{ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' }];
    renderVoucherLines();
}
function getNextVoucherNumberForPeriod(periodId) {
    var vouchers = DB.load('vouchers', []);
    var pid = periodId || '';
    var filtered = vouchers.filter(function(v) { return (v.periodId || '') === pid; });
    var maxN = 0;
    filtered.forEach(function(v) { var n = parseInt(normalizeDigits(String(v.number || '0')).replace(/\D/g, '')) || 0; if (n > maxN) maxN = n; });
    return String(maxN + 1);
}
function persistVoucher(approve) {
    if (currentVoucherStatus === 'approved' && !approve) { alert('سند تأیید شده قابل ذخیره به‌عنوان پیش‌نویس نیست.'); return; }
    var num = normalizeDigits(document.getElementById('v-number').value.trim());
    var d = normalizeDigits(document.getElementById('v-date').value.trim());
    var ty = document.getElementById('v-type').value;
    var ds = document.getElementById('v-desc').value.trim();
    var pid = state.activePeriodId || '';
    if (!num || !d) { alert('شماره و تاریخ اجباری.'); return; }
    var dv = validateDateInActivePeriod(d);
    if (!dv.ok) { alert('⚠️ ' + dv.msg); return; }
    if (!ds) { alert('⚠️ شرح سند اجباری.'); return; }
    var valid = voucherLines.filter(function(l) { return (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0; });
    if (valid.length < 2) { alert('حداقل دو ردیف با مبلغ.'); return; }
    var id = document.getElementById('v-id').value;
    var status = approve ? 'approved' : 'draft';
    if (!id) num = getNextVoucherNumberForPeriod(pid);
    var vch = { id: id || uid(), number: num, date: d, type: ty, periodId: pid, desc: ds, lines: valid, status: status };
    if (approve) { var issues = getVoucherIssues(vch); if (issues.length > 0) { alert('⚠️ سند قابل تأیید نیست:\n\n• ' + issues.join('\n• ')); return; } }
    var l = DB.load('vouchers', []);
    if (id) { for (var kk = 0; kk < l.length; kk++) if (l[kk].id === id) l[kk] = vch; } else l.push(vch);
    DB.save('vouchers', l);
    if (approve) { showToast('✅ سند تأیید شد.'); goToPage('voucher-list'); }
    else { showToast('✅ پیش‌نویس ذخیره شد.'); newVoucherForm(); }
    updateHomeWidgets();
}
var currentFacilityId = null; var currentInstallments = [];
function refreshFacBankSelect() { var sel = document.getElementById('fc-bank'); if (!sel) return; var b = DB.load('bankAccounts', []);
    sel.innerHTML = '<option value="">— بانک —</option>';
    for (var i = 0; i < b.length; i++) { var o = document.createElement('option'); o.value = b[i].id; o.textContent = (b[i].bank || '') + (b[i].account ? ' - ' + b[i].account : ''); sel.appendChild(o); } }
function refreshRffBankSelect() {
    var sel = document.getElementById('rff-bank'); if (!sel) return; var b = DB.load('bankAccounts', []); var v = sel.value;
    sel.innerHTML = '<option value="">همه</option>';
    for (var i = 0; i < b.length; i++) { var o = document.createElement('option'); o.value = b[i].id; o.textContent = (b[i].bank || '') + (b[i].account ? ' - ' + b[i].account : ''); sel.appendChild(o); }
    sel.value = v;
}
function renderFacilitiesList() {
    var list = DB.load('facilities', []); var filter = (document.getElementById('fac-filter').value || '').toLowerCase();
    var cf = document.getElementById('fac-cat-filter').value; var box = document.getElementById('fac-list-body'); if (!box) return; box.innerHTML = '';
    var hide = getHideState('fac-list');
    var filtered = list.filter(function(f) { if (cf && (f.category || 'facility') !== cf) return false;
        if (filter) { var txt = ((f.name || '') + ' ' + categoryName(f.category) + ' ' + (f.date || '')).toLowerCase(); if (txt.indexOf(filter) === -1) return false; } return true; });
    var shown = 0;
    for (var i = 0; i < filtered.length; i++) { var f = filtered[i]; shown++;
        var bank = DB.load('bankAccounts', []).find(function(b) { return b.id === f.bankId; });
        var paid = Number(f.paid || 0), initial = Number(f.initial || 0); var rem = initial - paid; var set = rem <= 0 && initial > 0;
        var sB = set ? '<span class="badge badge-settled">✓ تسویه</span>' : '<span class="badge badge-active">در جریان</span>';
        var cB = (f.category === 'scheduled') ? '<span class="badge badge-cat-sch">زمانبندی</span>' : '<span class="badge badge-cat-fac">تسهیلات</span>';
        var card = document.createElement('div'); card.className = 'card facility-card' + (f.category === 'scheduled' ? ' cat-sch' : '');
        card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px"><div><strong style="font-size:1rem">' + esc(f.name) + '</strong> ' + sB + ' ' + cB + '</div><div class="row-actions"><button class="row-btn open" data-id="' + f.id + '">📖 اقساط</button><button class="row-btn edit" data-id="' + f.id + '">✎</button><button class="row-btn del" data-id="' + f.id + '"' + (set ? ' disabled' : '') + '>×</button></div></div>' +
            '<div class="facility-summary"><div class="item"><div class="lbl">بانک</div><div class="val">' + esc(bank ? bank.bank : '—') + '</div></div><div class="item"><div class="lbl">تاریخ</div><div class="val" dir="ltr">' + toFa(esc(f.date)) + '</div></div><div class="item"><div class="lbl">مبلغ اولیه</div><div class="val">' + (hide ? '—' : formatMoney(initial)) + '</div></div><div class="item"><div class="lbl">پرداخت</div><div class="val" style="color:var(--accent)">' + (hide ? '—' : formatMoney(paid)) + '</div></div><div class="item"><div class="lbl">باقی</div><div class="val" style="color:' + (rem > 0 ? 'var(--danger)' : 'var(--accent)') + '">' + (hide ? '—' : formatMoney(rem)) + '</div></div><div class="item"><div class="lbl">تعداد</div><div class="val">' + toFa((f.installments || []).length) + '</div></div></div>';
        box.appendChild(card); }
    if (shown === 0) box.innerHTML = '<div class="card"><p class="muted" style="text-align:center">موردی نیست.</p></div>';
    document.getElementById('fac-count').textContent = toFa(shown);
    var o = box.querySelectorAll('.row-btn.open'), e = box.querySelectorAll('.row-btn.edit'), d = box.querySelectorAll('.row-btn.del');
    for (var oi = 0; oi < o.length; oi++) o[oi].addEventListener('click', function() { var id = this.getAttribute('data-id'); var f = DB.load('facilities', []).find(function(x) { return x.id === id; }); if (f) loadFacilityForInstallments(f); });
    for (var ei = 0; ei < e.length; ei++) e[ei].addEventListener('click', function() { var id = this.getAttribute('data-id'); var f = DB.load('facilities', []).find(function(x) { return x.id === id; }); if (f) loadFacilityIntoForm(f); });
    for (var di = 0; di < d.length; di++) d[di].addEventListener('click', function() { if (this.disabled) return; var id = this.getAttribute('data-id'); var f = DB.load('facilities', []).find(function(x) { return x.id === id; }); if (f) tryDeleteFacility(f); });
}
function tryDeleteFacility(f) { var ins = f.installments || []; var pi = ins.filter(function(x) { return x.status === 'paid'; });
    if (pi.length > 0) { alert('دارای ' + toFa(pi.length) + ' قسط پرداخت‌شده.'); return; }
    if (ins.length > 0) { alert('ابتدا اقساط را حذف کن.'); return; }
    if (!confirm('حذف شود؟')) return; var l = DB.load('facilities', []); l = l.filter(function(x) { return x.id !== f.id; }); DB.save('facilities', l); renderFacilitiesList(); }
function loadFacilityIntoForm(f) {
    document.getElementById('fc-id').value = f.id; document.getElementById('fc-name').value = f.name || '';
    document.getElementById('fc-category').value = f.category || 'facility'; document.getElementById('fc-bank').value = f.bankId || '';
    document.getElementById('fc-date').value = f.date || ''; document.getElementById('fc-initial').value = f.initial ? formatRaw(f.initial) : '';
    document.getElementById('fc-paid').value = f.paid ? formatRaw(f.paid) : '';
    document.getElementById('fac-installments-card').style.display = 'none'; document.querySelector('[data-tab="fac-add"]').click();
}
function loadFacilityForInstallments(f) {
    currentFacilityId = f.id; currentInstallments = JSON.parse(JSON.stringify(f.installments || []));
    document.getElementById('fc-id').value = f.id; document.getElementById('fc-name').value = f.name || '';
    document.getElementById('fc-category').value = f.category || 'facility'; document.getElementById('fc-bank').value = f.bankId || '';
    document.getElementById('fc-date').value = f.date || ''; document.getElementById('fc-initial').value = f.initial ? formatRaw(f.initial) : '';
    document.getElementById('fc-paid').value = f.paid ? formatRaw(f.paid) : '';
    document.getElementById('fac-installments-card').style.display = 'block'; renderInstallments();
    document.querySelector('[data-tab="fac-add"]').click();
    setTimeout(function() { document.getElementById('fac-installments-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200);
}
function renderInstallments() {
    var box = document.getElementById('fac-installments'); if (!box) return; box.innerHTML = '';
    for (var i = 0; i < currentInstallments.length; i++) { (function(idx) {
        var ins = currentInstallments[idx]; var row = document.createElement('div'); row.className = 'installment-row';
        var n = document.createElement('span'); n.textContent = '#' + toFa(idx + 1);
        var iD = document.createElement('input'); iD.type = 'text'; iD.dir = 'ltr'; iD.className = 'date-picker'; iD.placeholder = 'تاریخ'; iD.value = ins.date || '';
        iD.addEventListener('input', function() { ins.date = this.value; });
        var iA = document.createElement('input'); iA.type = 'text'; iA.inputMode = 'numeric'; iA.dir = 'ltr'; iA.placeholder = 'مبلغ'; iA.value = ins.amount ? formatRaw(ins.amount) : '';
        attachMoneyInput(iA, function(v) { ins.amount = v; renderInstallmentsTotals(); });
        var sS = document.createElement('select'); sS.innerHTML = '<option value="registered">ثبت</option><option value="paid">پرداخت</option>'; sS.value = ins.status || 'registered';
        sS.addEventListener('change', function() { ins.status = this.value; renderInstallmentsTotals(); });
        var a = document.createElement('div');
        var d = document.createElement('button'); d.className = 'row-btn del'; d.textContent = '×';
        d.addEventListener('click', function() { if (!confirm('حذف شود؟')) return; currentInstallments.splice(idx, 1); renderInstallments(); });
        a.appendChild(d); row.appendChild(n); row.appendChild(iD); row.appendChild(iA); row.appendChild(sS); row.appendChild(a);
        box.appendChild(row); attachDatePickers();
    })(i); }
    renderInstallmentsTotals();
}
function renderInstallmentsTotals() {
    var ti = 0, tp = 0;
    for (var i = 0; i < currentInstallments.length; i++) { ti += Number(currentInstallments[i].amount || 0); if (currentInstallments[i].status === 'paid') tp += Number(currentInstallments[i].amount || 0); }
    var init = parseMoney(normalizeDigits(document.getElementById('fc-initial').value)); var rem = init - tp;
    document.getElementById('fac-total-inst').textContent = formatMoney(ti); document.getElementById('fac-total-paid').textContent = formatMoney(tp); document.getElementById('fac-total-remaining').textContent = formatMoney(rem);
    document.getElementById('fc-paid').value = formatRaw(tp);
    var s = document.getElementById('fac-summary'); if (s) s.innerHTML = '<div class="item"><div class="lbl">مبلغ اولیه</div><div class="val">' + formatMoney(init) + '</div></div><div class="item"><div class="lbl">جمع اقساط</div><div class="val">' + formatMoney(ti) + '</div></div><div class="item"><div class="lbl">پرداخت</div><div class="val" style="color:var(--accent)">' + formatMoney(tp) + '</div></div><div class="item"><div class="lbl">باقی</div><div class="val" style="color:' + (rem > 0 ? 'var(--danger)' : 'var(--accent)') + '">' + formatMoney(rem) + '</div></div>';
}
function nextMonthDate(dateStr) { var p = (dateStr || todayJalaliStr()).split('/').map(Number); if (p.length !== 3) { var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()); p = t; }
    var y = p[0], m = p[1] + 1, d = p[2]; if (m > 12) { m = 1; y++; } var dim = daysInJalaliMonth(y, m); if (d > dim) d = dim; return y + '/' + pad2(m) + '/' + pad2(d); }
function autoGenerateInstallments() {
    var init = parseMoney(normalizeDigits(document.getElementById('fc-initial').value)); if (!init) { alert('مبلغ اولیه.'); return; }
    var dS = document.getElementById('fc-date').value || todayJalaliStr(); var df = nextMonthDate(dS);
    var fD = prompt('تاریخ اولین قسط:', toFa(df)); if (!fD) return;
    fD = normalizeDigits(fD.trim()); if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(fD)) { alert('فرمت اشتباه.'); return; }
    var cs = prompt('تعداد اقساط:', '۱۲'); if (!cs) return; var cnt = Number(normalizeDigits(cs)); if (!cnt || cnt < 1) { alert('نامعتبر.'); return; }
    var each = Math.floor(init / cnt); var rem = init - each * cnt; currentInstallments = [];
    var p = fD.split('/').map(Number); var y = p[0], m = p[1], d = p[2];
    for (var i = 0; i < cnt; i++) { var cY = y, cM = m + i, cD = d; while (cM > 12) { cM -= 12; cY++; } var dim = daysInJalaliMonth(cY, cM); if (cD > dim) cD = dim;
        var amt = each + (i === cnt - 1 ? rem : 0); currentInstallments.push({ id: uid(), date: cY + '/' + pad2(cM) + '/' + pad2(cD), amount: amt, status: 'registered' }); }
    renderInstallments();
}
function refreshReportPeriodSelects() {
    var ps = DB.load('fiscalPeriods', []);
    ['ra-period','rt-period','ri-period'].forEach(function(id) { var sel = document.getElementById(id); if (!sel) return; var v = sel.value;
        sel.innerHTML = '<option value="">همه</option>'; for (var i = 0; i < ps.length; i++) { var o = document.createElement('option'); o.value = ps[i].id; o.textContent = ps[i].title; sel.appendChild(o); } sel.value = v; });
}

/* ==================== NOTEPAD ==================== */
var noteChecklist = [];
var noteImageRefs = [];
var _noteImageDB = {
    _db: null,
    open: function() {
        if (this._db) return Promise.resolve(this._db);
        var self = this;
        return new Promise(function(resolve, reject) {
            if (!window.indexedDB) { reject(new Error('IndexedDB نیست')); return; }
            var req = indexedDB.open('parsisNoteImages', 1);
            req.onupgradeneeded = function(e) { var db = e.target.result; if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'id' }); };
            req.onsuccess = function(e) { self._db = e.target.result; resolve(self._db); };
            req.onerror = function(e) { reject(e.target.error); };
        });
    },
    put: function(id, handle) { return this.open().then(function(db) { return new Promise(function(resolve, reject) {
        var tx = db.transaction('handles', 'readwrite'); tx.objectStore('handles').put({ id: id, handle: handle, savedAt: Date.now() });
        tx.oncomplete = function() { resolve(id); }; tx.onerror = function(e) { reject(e.target.error); }; }); }); },
    get: function(id) { return this.open().then(function(db) { return new Promise(function(resolve, reject) {
        var tx = db.transaction('handles', 'readonly'); var req = tx.objectStore('handles').get(id);
        req.onsuccess = function() { resolve(req.result); }; req.onerror = function(e) { reject(e.target.error); }; }); }); },
    del: function(id) { return this.open().then(function(db) { return new Promise(function(resolve, reject) {
        var tx = db.transaction('handles', 'readwrite'); tx.objectStore('handles').delete(id);
        tx.oncomplete = function() { resolve(); }; tx.onerror = function(e) { reject(e.target.error); }; }); }); }
};
var _noteImageUrlCache = {};
function pickNoteImagesFS() {
    if (!window.showOpenFilePicker) return Promise.resolve(null);
    return window.showOpenFilePicker({ multiple: true, types: [{ description: 'تصاویر', accept: { 'image/*': ['.png','.jpg','.jpeg','.gif','.webp','.bmp'] } }] })
      .then(function(handles) { return handles; })
      .catch(function(e) { if (e.name !== 'AbortError') console.warn(e); return null; });
}
function loadNoteImageRef(ref) {
    if (!ref || !ref.id) return Promise.resolve(null);
    if (_noteImageUrlCache[ref.id]) return Promise.resolve(_noteImageUrlCache[ref.id]);
    return _noteImageDB.get(ref.id).then(function(rec) {
        if (!rec || !rec.handle) return null;
        return rec.handle.getFile().then(function(file) { var url = URL.createObjectURL(file); _noteImageUrlCache[ref.id] = url; return url; });
    }).catch(function() { return null; });
}
async function addNoteImageHandles(handles) {
    if (!handles || !handles.length) return;
    for (var i = 0; i < handles.length; i++) {
        try { var h = handles[i]; var file = await h.getFile();
            if (!file.type.startsWith('image/')) continue;
            var id = 'img-' + uid(); await _noteImageDB.put(id, h);
            noteImageRefs.push({ id: id, name: file.name, size: file.size, type: file.type });
        } catch(e) { console.warn('image add failed', e); }
    }
    renderNoteImages();
}
async function addNoteImageFromFile(file) {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) { if (!confirm('حجم تصویر بیشتر از ۲ مگابایت است. ادامه؟')) return; }
    var id = 'img-' + uid();
    var rec = { id: id, blob: file, name: file.name, size: file.size, type: file.type, isBlob: true };
    await _noteImageDB.open().then(function(db) { return new Promise(function(resolve, reject) {
        var tx = db.transaction('handles', 'readwrite'); tx.objectStore('handles').put(rec);
        tx.oncomplete = resolve; tx.onerror = function(e) { reject(e.target.error); }; }); });
    noteImageRefs.push({ id: id, name: file.name, size: file.size, type: file.type, isBlob: true });
}
async function loadNoteImageRefBlob(ref) {
    if (_noteImageUrlCache[ref.id]) return _noteImageUrlCache[ref.id];
    var rec = await _noteImageDB.get(ref.id); if (!rec) return null;
    if (rec.blob) { var u = URL.createObjectURL(rec.blob); _noteImageUrlCache[ref.id] = u; return u; }
    return null;
}
function renderNoteChecklist() {
    var box = document.getElementById('nt-checklist'); if (!box) return; box.innerHTML = '';
    if (noteChecklist.length === 0) noteChecklist.push({ id: uid(), text: '', done: false });
    for (var i = 0; i < noteChecklist.length; i++) { (function(idx) {
        var it = noteChecklist[idx];
        var row = document.createElement('div'); row.className = 'cl-item-row';
        var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!it.done;
        cb.addEventListener('change', function() { it.done = this.checked; });
        var ta = document.createElement('textarea');
        ta.rows = 1; ta.placeholder = 'آیتم ' + toFa(idx + 1); ta.value = it.text || '';
        function autoResize() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
        ta.addEventListener('input', function() { it.text = this.value; autoResize(); });
        ta.addEventListener('focus', autoResize);
        setTimeout(autoResize, 0);
        var upBtn = document.createElement('button'); upBtn.type = 'button'; upBtn.className = 'cl-move-btn'; upBtn.textContent = '↑';
        upBtn.title = 'انتقال به بالا'; if (idx === 0) upBtn.disabled = true;
        upBtn.addEventListener('click', function() { var tmp = noteChecklist[idx]; noteChecklist[idx] = noteChecklist[idx - 1]; noteChecklist[idx - 1] = tmp; renderNoteChecklist(); });
        var downBtn = document.createElement('button'); downBtn.type = 'button'; downBtn.className = 'cl-move-btn'; downBtn.textContent = '↓';
        downBtn.title = 'انتقال به پایین'; if (idx === noteChecklist.length - 1) downBtn.disabled = true;
        downBtn.addEventListener('click', function() { var tmp = noteChecklist[idx]; noteChecklist[idx] = noteChecklist[idx + 1]; noteChecklist[idx + 1] = tmp; renderNoteChecklist(); });
        var del = document.createElement('button'); del.className = 'row-btn del'; del.textContent = '×';
        del.addEventListener('click', function() { noteChecklist.splice(idx, 1); renderNoteChecklist(); });
        row.appendChild(cb); row.appendChild(ta); row.appendChild(upBtn); row.appendChild(downBtn); row.appendChild(del);
        box.appendChild(row);
    })(i); }
}
function renderNoteImages() {
    var box = document.getElementById('nt-images-preview'); if (!box) return; box.innerHTML = '';
    if (noteImageRefs.length === 0) { box.innerHTML = '<div class="muted" style="font-size:0.75rem">تصویری اضافه نشده.</div>'; return; }
    for (var i = 0; i < noteImageRefs.length; i++) { (function(idx) {
        var ref = noteImageRefs[idx];
        var wrap = document.createElement('div'); wrap.className = 'note-img-thumb';
        var loading = document.createElement('div'); loading.className = 'note-img-loading'; loading.textContent = '⏳';
        wrap.appendChild(loading);
        var rm = document.createElement('button'); rm.className = 'rm-img'; rm.textContent = '×'; rm.title = 'حذف';
        rm.addEventListener('click', function(e) {
            e.stopPropagation();
            _noteImageDB.del(ref.id).catch(function(){});
            delete _noteImageUrlCache[ref.id];
            noteImageRefs.splice(idx, 1);
            renderNoteImages();
        });
        wrap.appendChild(rm);
        box.appendChild(wrap);
        var loader = ref.isBlob ? loadNoteImageRefBlob(ref) : loadNoteImageRef(ref);
        loader.then(function(url) {
            loading.remove();
            if (url) {
                var img = document.createElement('img'); img.src = url; img.alt = ref.name || ''; img.title = ref.name || '';
                img.addEventListener('click', function() { openImageView(url); });
                wrap.insertBefore(img, rm);
            } else {
                var ph = document.createElement('div'); ph.className = 'note-img-missing';
                ph.textContent = '❌'; ph.title = 'فایل «' + (ref.name || '') + '» یافت نشد';
                wrap.insertBefore(ph, rm);
            }
        });
    })(i); }
}
function openImageView(src) {
    document.getElementById('imgview-src').src = src;
    document.getElementById('imgview-modal').classList.add('show');
    document.getElementById('imgview-overlay').classList.add('show');
}
function clearNoteForm() {
    document.getElementById('nt-id').value = '';
    document.getElementById('nt-title').value = '';
    document.getElementById('nt-date').value = todayJalaliStr();
    document.getElementById('nt-content').value = '';
    noteChecklist = []; renderNoteChecklist();
    noteImageRefs = []; renderNoteImages();
}
function renderNotesList() {
    var list = DB.load('notes', []); var filter = (document.getElementById('notes-filter').value || '').toLowerCase();
    var box = document.getElementById('notes-list-body'); if (!box) return; box.innerHTML = '';
    var view = state.notesView || 'all';
    var tabs = document.querySelectorAll('[data-notes-view]');
    for (var ti = 0; ti < tabs.length; ti++) tabs[ti].classList.toggle('active', tabs[ti].getAttribute('data-notes-view') === view);
    list.sort(function(a, b) { return compareVals(b.date || '', a.date || ''); });
    var shown = 0;
    list.forEach(function(n) {
        if (view === 'archived' && !n.archived) return;
        if (view === 'all' && n.archived) return;
        var txt = ((n.title || '') + ' ' + (n.content || '')).toLowerCase();
        if (filter && txt.indexOf(filter) === -1) return;
        shown++;
        var row = document.createElement('div');
        row.className = 'note-compact-row' + (n.archived ? ' archived' : '');
        var archBadge = n.archived ? '<span class="nc-badge">📦 آرشیو</span>' : '';
        row.innerHTML = '<span style="font-size:1.1rem">📔</span>' +
            '<span class="nc-title">' + esc(n.title || 'بدون عنوان') + '</span>' +
            archBadge +
            '<span class="nc-date">' + toFa(esc(n.date || '—')) + '</span>' +
            '<span class="nc-actions">' +
            '<button data-nt-view="' + n.id + '" title="مشاهده">👁</button>' +
            '<button data-nt-edit="' + n.id + '" title="ویرایش">✎</button>' +
            '<button data-nt-arch="' + n.id + '" title="' + (n.archived ? 'خروج از آرشیو' : 'آرشیو') + '">' + (n.archived ? '↩' : '📦') + '</button>' +
            '<button data-nt-del="' + n.id + '" title="حذف">×</button>' +
            '</span>';
        row.addEventListener('click', function(e) { if (e.target.closest('button')) return; openNoteView(n.id); });
        box.appendChild(row);
    });
    if (shown === 0) box.innerHTML = '<div class="widget-empty">📔 ' + (view === 'archived' ? 'آرشیوی وجود ندارد.' : 'هنوز یادداشتی ثبت نشده.') + '</div>';
    document.getElementById('notes-count').textContent = toFa(shown);
    var viewBtns = box.querySelectorAll('[data-nt-view]');
    for (var v = 0; v < viewBtns.length; v++) viewBtns[v].addEventListener('click', function(e) { e.stopPropagation(); openNoteView(this.getAttribute('data-nt-view')); });
    var editBtns = box.querySelectorAll('[data-nt-edit]');
    for (var e2 = 0; e2 < editBtns.length; e2++) editBtns[e2].addEventListener('click', function(e) { e.stopPropagation();
        var id = this.getAttribute('data-nt-edit');
        var n = DB.load('notes', []).find(function(x) { return x.id === id; }); if (!n) return;
        document.getElementById('nt-id').value = n.id;
        document.getElementById('nt-title').value = n.title || '';
        document.getElementById('nt-date').value = n.date || '';
        document.getElementById('nt-content').value = n.content || '';
        noteChecklist = JSON.parse(JSON.stringify(n.checklist || []));
        noteImageRefs = (n.imageRefs || []).slice();
        renderNoteChecklist(); renderNoteImages();
        document.querySelector('[data-tab="notes-add"]').click();
    });
    var archBtns = box.querySelectorAll('[data-nt-arch]');
    for (var a = 0; a < archBtns.length; a++) archBtns[a].addEventListener('click', function(e) { e.stopPropagation();
        var id = this.getAttribute('data-nt-arch');
        var l = DB.load('notes', []); for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i].archived = !l[i].archived;
        DB.save('notes', l); renderNotesList();
        showToast(l.find(function(x) { return x.id === id; }).archived ? '📦 به آرشیو منتقل شد' : '↩ از آرشیو خارج شد');
    });
    var delBtns = box.querySelectorAll('[data-nt-del]');
    for (var d = 0; d < delBtns.length; d++) delBtns[d].addEventListener('click', function(e) { e.stopPropagation();
        var id = this.getAttribute('data-nt-del');
        if (!confirm('حذف شود؟')) return;
        var l = DB.load('notes', []).filter(function(x) { return x.id !== id; });
        DB.save('notes', l); renderNotesList();
    });
}
async function openNoteView(noteId) {
    var n = DB.load('notes', []).find(function(x) { return x.id === noteId; });
    if (!n) { showToast('یادداشت یافت نشد.'); return; }
    document.getElementById('noteview-title').textContent = '📔 ' + (n.title || 'یادداشت');
    var body = document.getElementById('noteview-body');
    var html = '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">' +
        '<div><b>📅 ' + toFa(esc(n.date || '—')) + '</b></div>' +
        (n.archived ? '<span class="badge badge-archived">📦 آرشیو شده</span>' : '') + '</div>';
    if (n.content) html += '<div style="background:var(--card-alt);padding:14px;border-radius:12px;font-size:0.9rem;white-space:pre-wrap;line-height:2;margin-bottom:14px;border:1px solid var(--border)">' + esc(n.content) + '</div>';
    if (n.checklist && n.checklist.length > 0) {
        var done = n.checklist.filter(function(c) { return c.done; }).length;
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
            '<h3 style="color:var(--primary-dark);font-size:0.95rem;margin:0">✅ چک‌لیست (' + toFa(done) + '/' + toFa(n.checklist.length) + ')</h3>' +
            '<button class="note-share-sel" id="note-sel-all" style="padding:6px 12px;border-radius:10px;font-size:0.75rem">انتخاب همه</button></div>';
        html += '<ul class="note-checklist" id="note-checklist-ul">';
        n.checklist.forEach(function(c, i) {
            if (!c.text) return;
            html += '<li class="' + (c.done ? 'done' : '') + '">' +
                '<input type="checkbox" class="item-select" data-item-idx="' + i + '">' +
                '<input type="checkbox" disabled ' + (c.done ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:var(--primary);flex-shrink:0">' +
                '<span style="flex:1;word-break:break-word">' + esc(c.text) + '</span></li>';
        });
        html += '</ul>';
        html += '<div class="note-share-bar">' +
            '<label>📤 اشتراک‌گذاری:</label>' +
            '<button class="note-share-btn" id="note-share-selected" disabled>ارسال موارد انتخابی</button>' +
            '<span id="note-sel-count" style="font-size:0.75rem;color:var(--text-muted)">۰ مورد انتخاب شده</span>' +
            '</div>';
    }
    if (n.imageRefs && n.imageRefs.length > 0) {
        html += '<h3 style="margin:14px 0 10px;color:var(--primary-dark);font-size:0.95rem">🖼 تصاویر (' + toFa(n.imageRefs.length) + ')</h3>';
        html += '<div class="note-images" id="note-view-images"></div>';
    }
    body.innerHTML = html;
    var archBtn = document.getElementById('noteview-archive');
    archBtn.textContent = n.archived ? '↩ خارج از آرشیو' : '📦 آرشیو';
    archBtn.onclick = function() {
        var l = DB.load('notes', []);
        for (var i = 0; i < l.length; i++) if (l[i].id === n.id) l[i].archived = !l[i].archived;
        DB.save('notes', l); renderNotesList(); closeNoteView();
        showToast(l.find(function(x) { return x.id === n.id; }).archived ? '📦 به آرشیو رفت' : '↩ از آرشیو خارج شد');
    };
    document.getElementById('noteview-edit').onclick = function() {
        closeNoteView();
        var note = DB.load('notes', []).find(function(x) { return x.id === n.id; }); if (!note) return;
        document.getElementById('nt-id').value = note.id;
        document.getElementById('nt-title').value = note.title || '';
        document.getElementById('nt-date').value = note.date || '';
        document.getElementById('nt-content').value = note.content || '';
        noteChecklist = JSON.parse(JSON.stringify(note.checklist || []));
        noteImageRefs = (note.imageRefs || []).slice();
        renderNoteChecklist(); renderNoteImages();
        document.querySelector('[data-tab="notes-add"]').click();
    };
    document.getElementById('noteview-share').onclick = function() {
        var list = (n.checklist || []).filter(function(c) { return c.text && c.text.trim(); });
        if (list.length === 0) { showToast('چک‌لیستی وجود ندارد.'); return; }
        var text = '📔 ' + (n.title || 'یادداشت') + '\n📅 ' + toFa(n.date || '') + '\n\n' +
            list.map(function(c) { return (c.done ? '✅' : '⬜') + ' ' + c.text; }).join('\n');
        if (navigator.share) navigator.share({ title: n.title || 'یادداشت', text: text }).catch(function(){});
        else navigator.clipboard.writeText(text).then(function() { showToast('📋 متن کپی شد.'); }).catch(function() { alert(text); });
    };
    document.getElementById('noteview-close-btn').onclick = closeNoteView;
    if (n.imageRefs && n.imageRefs.length > 0) {
        var imgBox = document.getElementById('note-view-images');
        for (var ii = 0; ii < n.imageRefs.length; ii++) { (function(ref) {
            var loading = document.createElement('div'); loading.className = 'note-img-loading'; loading.textContent = '⏳';
            imgBox.appendChild(loading);
            var loader = ref.isBlob ? loadNoteImageRefBlob(ref) : loadNoteImageRef(ref);
            loader.then(function(url) {
                if (loading.parentNode) loading.parentNode.removeChild(loading);
                if (url) { var img = document.createElement('img'); img.src = url; img.alt = ref.name; img.addEventListener('click', function() { openImageView(url); }); imgBox.appendChild(img); }
                else { var ph = document.createElement('div'); ph.className = 'note-img-missing'; ph.textContent = '❌'; ph.title = 'فایل حذف شده: ' + (ref.name || ''); imgBox.appendChild(ph); }
            });
        })(n.imageRefs[ii]); }
    }
    var selAllBtn = document.getElementById('note-sel-all');
    if (selAllBtn) selAllBtn.onclick = function() {
        var boxes = body.querySelectorAll('.item-select');
        var allChecked = Array.from(boxes).every(function(b) { return b.checked; });
        boxes.forEach(function(b) { b.checked = !allChecked; });
        updateShareState();
    };
    function updateShareState() {
        var boxes = body.querySelectorAll('.item-select');
        var selected = [];
        boxes.forEach(function(b) { if (b.checked) selected.push(Number(b.getAttribute('data-item-idx'))); });
        var shareBtn = document.getElementById('note-share-selected');
        var cnt = document.getElementById('note-sel-count');
        if (shareBtn) shareBtn.disabled = selected.length === 0;
        if (cnt) cnt.textContent = toFa(selected.length) + ' مورد انتخاب شده';
        return selected;
    }
    body.querySelectorAll('.item-select').forEach(function(cb) { cb.addEventListener('change', updateShareState); });
    var shareBtn = document.getElementById('note-share-selected');
    if (shareBtn) shareBtn.onclick = function() {
        var selected = updateShareState();
        if (selected.length === 0) return;
        var items = selected.map(function(i) { return n.checklist[i]; }).filter(Boolean);
        var text = '📔 ' + (n.title || 'یادداشت') + '\n📅 ' + toFa(n.date || '') + '\n\n' +
            items.map(function(c, i) { return (i+1) + '. ' + (c.done ? '✅' : '⬜') + ' ' + c.text; }).join('\n');
        if (navigator.share) navigator.share({ title: n.title || 'یادداشت', text: text }).catch(function(){});
        else navigator.clipboard.writeText(text).then(function() { showToast('📋 متن کپی شد.'); }).catch(function() { alert(text); });
    };
    document.getElementById('noteview-modal').classList.add('show');
    document.getElementById('noteview-overlay').classList.add('show');
}
function closeNoteView() {
    document.getElementById('noteview-modal').classList.remove('show');
    document.getElementById('noteview-overlay').classList.remove('show');
}
function saveNote() {
    var id = document.getElementById('nt-id').value;
    var title = document.getElementById('nt-title').value.trim();
    if (!title) { alert('عنوان اجباری است.'); return; }
    var date = normalizeDigits(document.getElementById('nt-date').value.trim());
    var content = document.getElementById('nt-content').value;
    var checklist = noteChecklist.filter(function(c) { return c.text && c.text.trim(); });
    var existing = id ? DB.load('notes', []).find(function(x) { return x.id === id; }) : null;
    var note = {
        id: id || uid(), title: title, date: date, content: content, checklist: checklist,
        imageRefs: noteImageRefs.slice(), archived: existing ? !!existing.archived : false, savedAt: Date.now()
    };
    var l = DB.load('notes', []);
    if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = note; } else l.push(note);
    DB.save('notes', l); showToast('✅ یادداشت ذخیره شد.');
    clearNoteForm(); renderNotesList();
    document.querySelector('[data-tab="notes-list"]').click();
}
async function handleNoteImagesFS() {
    var handles = await pickNoteImagesFS();
    if (handles) { await addNoteImageHandles(handles); }
    else {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
        inp.onchange = async function() {
            if (inp.files && inp.files.length) { for (var i = 0; i < inp.files.length; i++) await addNoteImageFromFile(inp.files[i]); renderNoteImages(); }
        };
        inp.click();
    }
}
function handleNoteImages(files) { if (!files || files.length === 0) return; for (var i = 0; i < files.length; i++) { addNoteImageFromFile(files[i]).then(renderNoteImages); } }

/* =====================================================================
   ============ AI — نسخه بهبودیافته با تفصیلی‌یاب هوشمند ============
   ===================================================================== */
var AVALAI_MODELS = [
    { id: 'gpt-4o-mini',                label: 'GPT-4o Mini (پیشنهاد، vision)' },
    { id: 'gpt-4o',                     label: 'GPT-4o (vision)' },
    { id: 'gpt-4.1-mini',               label: 'GPT-4.1 Mini (vision)' },
    { id: 'gpt-4.1',                    label: 'GPT-4.1 (vision)' },
    { id: 'gpt-3.5-turbo',              label: 'GPT-3.5 Turbo (اقتصادی)' },
    { id: 'deepseek-chat',              label: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner',          label: 'DeepSeek Reasoner' },
    { id: 'gemini-2.0-flash',           label: 'Gemini 2.0 Flash (vision)' },
    { id: 'gemini-1.5-flash',           label: 'Gemini 1.5 Flash (vision)' },
    { id: 'gemini-1.5-pro',             label: 'Gemini 1.5 Pro (vision)' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (vision)' },
    { id: 'o1-mini',                    label: 'o1-mini' }
];
var VISION_MODEL_IDS = ['gpt-4o-mini','gpt-4o','gpt-4.1-mini','gpt-4.1','gemini-2.0-flash','gemini-1.5-flash','gemini-1.5-pro','claude-3-5-sonnet-20241022'];

var AI_NAVIGABLE_PAGES = {
    'home': 'صفحه اصلی', 'dashboard': 'داشبورد مالی', 'voucher-list': 'فهرست اسناد',
    'voucher-new': 'صدور سند جدید', 'persons': 'اشخاص', 'companies': 'شرکت‌ها',
    'bank-accounts': 'حساب‌های بانکی', 'cash-boxes': 'صندوق‌ها', 'projects': 'پروژه‌ها',
    'fiscal': 'دوره‌های مالی', 'chart-define': 'تعریف حساب‌ها', 'facilities': 'تسهیلات',
    'cashflow-sources': 'منابع دریافتنی', 'estimate-daily': 'برآورد هزینه‌های روزانه',
    'templates': 'الگوهای سند', 'notes': 'دفترچه یادداشت', 'sms': 'پیامک بانکی',
    'report-cashflow': 'وضعیت نقدینگی', 'report-cashflow-desc': 'گردش وجه نقد',
    'report-account': 'مرور حساب‌ها', 'report-trial': 'تراز آزمایشی',
    'report-incomplete': 'تراکنش‌های تکمیل نشده', 'report-facility': 'خلاصه تسهیلات',
    'report-facility-full': 'گزارش جامع تسهیلات', 'report-rates': 'گزارش نرخ ارز و طلا',
    'daily-close': 'قیمت پایانی روز'
};

var AI_TOOLS = [
    { type: 'function', function: { name: 'create_voucher_draft', description: 'ساخت پیش‌نویس سند حسابداری. فقط زمانی که کاربر صریحاً درخواست ثبت سند کرد از این ابزار استفاده کن.', parameters: { type: 'object', properties: { date: { type: 'string', description: 'تاریخ شمسی YYYY/MM/DD' }, desc: { type: 'string', description: 'شرح کلی سند' }, type: { type: 'string', enum: ['general', 'opening', 'establishment', 'closing', 'final'] }, lines: { type: 'array', minItems: 2, items: { type: 'object', properties: { account_code: { type: 'string', description: 'کد معین دقیق از چارت حساب‌ها' }, debit: { type: 'number' }, credit: { type: 'number' }, description: { type: 'string' }, details: { type: 'object', additionalProperties: { type: 'string' }, description: 'نام تفصیلی مرتبط. کلید یکی از: person, company, bank, cashbox, project, facility' } }, required: ['account_code', 'description'] } } }, required: ['date', 'desc', 'lines'] } } },
    { type: 'function', function: { name: 'navigate_and_run_report', description: 'رفتن به یک صفحه گزارش یا فرم و اجرای آن.', parameters: { type: 'object', properties: { page_key: { type: 'string' }, from_date: { type: 'string' }, to_date: { type: 'string' } }, required: ['page_key'] } } },
    { type: 'function', function: { name: 'create_person', description: 'تعریف شخص جدید.', parameters: { type: 'object', properties: { first: { type: 'string' }, last: { type: 'string' }, father: { type: 'string' }, nationalId: { type: 'string' }, birth: { type: 'string' }, mobile: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, bankTitle: { type: 'string' }, acc: { type: 'string' }, iban: { type: 'string' }, card: { type: 'string' }, address: { type: 'string' } }, required: ['first'] } } },
    { type: 'function', function: { name: 'create_company', description: 'تعریف شرکت جدید.', parameters: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, address: { type: 'string' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'create_bank_account', description: 'تعریف حساب بانکی جدید.', parameters: { type: 'object', properties: { bank: { type: 'string' }, type: { type: 'string' }, branchCode: { type: 'string' }, branchName: { type: 'string' }, account: { type: 'string' }, iban: { type: 'string' }, card: { type: 'string' }, order: { type: 'number' }, minBalance: { type: 'number' } }, required: ['bank'] } } },
    { type: 'function', function: { name: 'create_cash_box', description: 'تعریف صندوق جدید.', parameters: { type: 'object', properties: { title: { type: 'string' }, type: { type: 'string' }, unit: { type: 'string' }, order: { type: 'number' } }, required: ['title'] } } },
    { type: 'function', function: { name: 'create_project', description: 'تعریف پروژه جدید.', parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'create_fiscal_period', description: 'تعریف دوره مالی جدید.', parameters: { type: 'object', properties: { title: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, activate: { type: 'boolean' } }, required: ['title', 'from', 'to'] } } },
    { type: 'function', function: { name: 'create_account', description: 'تعریف حساب جدید در چارت.', parameters: { type: 'object', properties: { code: { type: 'string' }, name: { type: 'string' }, parent_code: { type: 'string' }, cat: { type: 'string' }, nature: { type: 'string' }, links: { type: 'array', items: { type: 'string' } }, cfEffect: { type: 'boolean' } }, required: ['code', 'name'] } } },
    { type: 'function', function: { name: 'create_facility', description: 'تعریف تسهیلات جدید.', parameters: { type: 'object', properties: { name: { type: 'string' }, category: { type: 'string' }, bank_account: { type: 'string' }, date: { type: 'string' }, initial: { type: 'number' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'create_note', description: 'ایجاد یادداشت جدید.', parameters: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string' }, content: { type: 'string' }, checklist: { type: 'array', items: { type: 'string' } } }, required: ['title'] } } }
];

var AI = {
    provider: DB.load('ai.provider', 'avalai'),
    apiKey: DB.load('ai.apiKey', ''),
    model: DB.load('ai.model', 'gpt-4o-mini'),
    autoFallback: DB.load('ai.autoFallback', true),
    failedModels: {},
    history: DB.load('ai.history', []),
    MAX_HISTORY: 20,
    isThinking: false
};
var AI_PENDING_IMAGE = null;
var AI_VOICE_ACTIVE = false;
var AI_REC = null;

function aiSaveSettings() { DB.save('ai.provider', AI.provider); DB.save('ai.apiKey', AI.apiKey); DB.save('ai.model', AI.model); DB.save('ai.autoFallback', AI.autoFallback); }
function aiSaveHistory() { DB.save('ai.history', AI.history.slice(-AI.MAX_HISTORY)); }

function aiRenderImagePreview() {
    var box = document.getElementById('ai-image-preview-box');
    if (!box) return;
    if (!AI_PENDING_IMAGE) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = 'flex';
    box.innerHTML = '<img src="' + AI_PENDING_IMAGE.dataUrl + '" alt="">' +
        '<div class="info"><div class="name">📷 ' + esc(AI_PENDING_IMAGE.name) + '</div>' +
        '<div class="muted" style="font-size:0.72rem">متن سوال را بنویسید و ارسال کنید</div></div>' +
        '<button class="remove" title="حذف تصویر">×</button>';
    box.querySelector('.remove').addEventListener('click', function() { AI_PENDING_IMAGE = null; aiRenderImagePreview(); });
}
function aiAttachImage(file) {
    if (!file || !file.type || file.type.indexOf('image') === -1) return;
    if (file.size > 5 * 1024 * 1024) { showToast('⚠️ حجم تصویر بیش از ۵ مگابایت.'); return; }
    var reader = new FileReader();
    reader.onload = function(e) { AI_PENDING_IMAGE = { dataUrl: e.target.result, name: file.name || 'image' }; aiRenderImagePreview(); showToast('📷 تصویر پیوست شد.'); };
    reader.readAsDataURL(file);
}
function aiToggleVoice() {
    if (AI_VOICE_ACTIVE) { aiStopVoice(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast('⚠️ تشخیص گفتار در این مرورگر پشتیبانی نمی‌شود. از Chrome یا Edge استفاده کنید.'); return; }
    try {
        var rec = new SR();
        rec.lang = 'fa-IR'; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
        var input = document.getElementById('ai-input');
        var startVal = input.value;
        var micBtn = document.getElementById('ai-mic-btn');
        AI_VOICE_ACTIVE = true;
        micBtn.classList.add('recording'); micBtn.textContent = '⏹'; micBtn.title = 'توقف ضبط';
        rec.onresult = function(e) {
            var finalText = ''; var interimText = '';
            for (var i = e.resultIndex; i < e.results.length; i++) {
                var t = e.results[i][0].transcript;
                if (e.results[i].isFinal) finalText += t; else interimText += t;
            }
            input.value = ((startVal ? startVal + ' ' : '') + finalText + interimText).trim();
        };
        rec.onerror = function(e) {
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') showToast('⚠️ دسترسی به میکروفون داده نشد.');
            else if (e.error === 'no-speech') showToast('صدایی شنیده نشد.');
            else if (e.error !== 'aborted') showToast('خطای تشخیص گفتار: ' + e.error);
        };
        rec.onend = function() { AI_VOICE_ACTIVE = false; AI_REC = null; if (micBtn) { micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; micBtn.title = 'ضبط صدا'; } };
        rec.start(); AI_REC = rec;
    } catch(err) { AI_VOICE_ACTIVE = false; var mb = document.getElementById('ai-mic-btn'); if (mb) { mb.classList.remove('recording'); mb.textContent = '🎤'; } showToast('⚠️ شروع ضبط ناموفق بود.'); }
}
function aiStopVoice() { if (AI_REC) { try { AI_REC.stop(); } catch(e) {} AI_REC = null; } AI_VOICE_ACTIVE = false; var mb = document.getElementById('ai-mic-btn'); if (mb) { mb.classList.remove('recording'); mb.textContent = '🎤'; mb.title = 'ضبط صدا'; } }

/* ==================== ✅ TTS پارسی بهبودیافته ==================== */
var AI_TTS = { autoSpeak: DB.load('ai.autoSpeak', false), rate: DB.load('ai.speakRate', 1.0), voice: null };
function aiSaveTTS() { DB.save('ai.autoSpeak', AI_TTS.autoSpeak); DB.save('ai.speakRate', AI_TTS.rate); }
function aiPickPersianVoice() {
    if (!window.speechSynthesis) return null;
    var voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    /* ✅ اولویت انتخاب صداهای پارسی */
    var priorityLangs = ['fa-ir', 'fa', 'persian'];
    for (var p = 0; p < priorityLangs.length; p++) {
        var v = voices.find(function(x) { return (x.lang || '').toLowerCase().indexOf(priorityLangs[p]) === 0 || (x.lang || '').toLowerCase() === priorityLangs[p]; });
        if (v) return v;
    }
    /* ✅ تلاش با نام زبان */
    var v2 = voices.find(function(x) { return /persian|farsi|parsi/i.test(x.name || ''); });
    if (v2) return v2;
    /* ✅ fallback: صدای عربی مشابه farsi */
    var v3 = voices.find(function(x) { return (x.lang || '').toLowerCase().indexOf('ar') === 0; });
    return v3 || null;
}
function aiStripMarkdownForSpeech(text) {
    return String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/^\s*[|>\-*+▸▾▲▼⇅•]+\s*/gm, '')
        .replace(/\|/g, ' ')
        /* ✅ تبدیل اعداد لاتین به فارسی برای تلفظ صحیح */
        .replace(/[0-9]+/g, function(m) { return toFa(m); })
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' . ')
        .replace(/\.\s*\./g, '.')
        .trim();
}
function aiSpeak(text) {
    if (!window.speechSynthesis) { showToast('⚠️ مرورگر از پخش صوتی پشتیبانی نمی‌کند.'); return; }
    try { window.speechSynthesis.cancel(); } catch(e) {}
    var clean = aiStripMarkdownForSpeech(text);
    if (!clean) { showToast('متنی برای خواندن نیست.'); return; }
    var utt = new SpeechSynthesisUtterance(clean);
    utt.lang = 'fa-IR';
    utt.rate = Math.max(0.5, Math.min(1.5, Number(AI_TTS.rate) || 1));
    utt.pitch = 1.0;
    var v = AI_TTS.voice || aiPickPersianVoice();
    if (v) { utt.voice = v; AI_TTS.voice = v; }
    var btn = document.getElementById('ai-tts-btn');
    if (btn) { btn.textContent = '⏹'; btn.classList.add('speaking'); btn.title = 'توقف'; }
    utt.onend = function() { if (btn) { btn.textContent = '🔊'; btn.classList.remove('speaking'); btn.title = 'پخش صوتی آخرین پاسخ'; } };
    utt.onerror = function() { if (btn) { btn.textContent = '🔊'; btn.classList.remove('speaking'); } };
    window.speechSynthesis.speak(utt);
}
function aiStopSpeaking() {
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch(e) {}
    var btn = document.getElementById('ai-tts-btn');
    if (btn) { btn.textContent = '🔊'; btn.classList.remove('speaking'); btn.title = 'پخش صوتی آخرین پاسخ'; }
}
function aiToggleSpeak() {
    if (!window.speechSynthesis) { showToast('⚠️ مرورگر پشتیبانی نمی‌کند.'); return; }
    if (window.speechSynthesis.speaking) { aiStopSpeaking(); return; }
    var lastMsg = null;
    for (var i = AI.history.length - 1; i >= 0; i--) { if (AI.history[i].role === 'assistant' && AI.history[i].content) { lastMsg = AI.history[i]; break; } }
    if (!lastMsg) { showToast('پاسخی برای خواندن نیست.'); return; }
    aiSpeak(lastMsg.content);
}
function aiAutoSpeakIfNeeded(msg) {
    if (!AI_TTS.autoSpeak) return;
    if (!msg || msg.role !== 'assistant' || !msg.content) return;
    setTimeout(function() { aiSpeak(msg.content); }, 250);
}
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function() { AI_TTS.voice = aiPickPersianVoice(); };
    setTimeout(function() { AI_TTS.voice = aiPickPersianVoice(); }, 500);
}

/* ==================== ✅ Context Builder بهبودیافته ==================== */
function aiBuildContext() {
    var lines = [];
    var todayJ = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var todayStr = todayJ[0] + '/' + pad2(todayJ[1]) + '/' + pad2(todayJ[2]);
    lines.push('=== 📅 اطلاعات پایه ===');
    lines.push('نرم‌افزار: ' + APP_NAME + ' (نسخه ' + APP_VERSION + ')');
    lines.push('⚠️ تاریخ امروز (شمسی): ' + todayStr + ' (' + WEEKDAYS_FA[new Date().getDay()] + ')');
    lines.push('⚠️ تمام مبالغ در این دیتابیس به ریال هستند.');
    lines.push('واحد نمایش فعلی کاربر: ' + currencyLabel());

    /* ✅ دوره فعال */
    var periods = DB.load('fiscalPeriods', []);
    if (periods.length > 0) {
        lines.push('\n=== 📅 دوره‌های مالی ===');
        var activeP = null;
        periods.forEach(function(p) {
            var am = (p.id === state.activePeriodId) ? ' ⭐(دوره فعال فعلی)' : '';
            if (p.id === state.activePeriodId) activeP = p;
            lines.push('- «' + p.title + '» از ' + p.from + ' تا ' + p.to + am);
        });
        if (activeP) lines.push('⚠️ سند باید تاریخش در بازه ' + activeP.from + ' تا ' + activeP.to + ' باشد.');
        else lines.push('⚠️ هیچ دوره فعالی انتخاب نشده!');
    } else lines.push('\n=== 📅 دوره مالی === (تعریف نشده)');

    /* ✅ چارت حساب‌ها به شکل درختی + تفصیلی‌ها */
    var accounts = DB.load('accounts', []);
    if (accounts.length > 0) {
        lines.push('\n=== 🗂️ چارت حساب‌ها (' + accounts.length + ' حساب) ===');
        lines.push('فرمت: [کد] عنوان سطح | تفصیلی مرتبط | ویژگی‌ها');
        var byParent = {}; accounts.forEach(function(a) { var p = a.parent || '__root__'; if (!byParent[p]) byParent[p] = []; byParent[p].push(a); });
        function walk(pid, depth) {
            var arr = byParent[pid] || [];
            arr.sort(function(a, b) { return (a.code || '').localeCompare(b.code || '', 'fa'); });
            arr.forEach(function(a) {
                var extra = [];
                if (a.links && a.links.length > 0) extra.push('تفصیلی: ' + a.links.map(linkTypeName).join('، '));
                if (a.cfEffect) extra.push('گردش وجه نقد');
                var lvlName = depth === 0 ? 'گروه' : (depth === 1 ? 'کل' : (depth === 2 ? 'معین' : 'تفصیلی'));
                lines.push(new Array(depth + 1).join('   ') + '├─ [' + (a.code || '?') + '] ' + (a.name || '') + ' (' + lvlName + ')' + (extra.length ? ' — ' + extra.join(' | ') : ''));
                walk(a.id, depth + 1);
            });
        }
        walk('__root__', 0);
        /* ✅ لیست کدهای معین قابل استفاده در سند */
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        lines.push('\n=== 📋 فقط این کدها را در account_code استفاده کن (' + leaves.length + ' معین) ===');
        leaves.forEach(function(a) { lines.push('- ' + a.code + ' → ' + getAccountLabel(a.id, accounts)); });
    } else lines.push('\n=== 🗂️ چارت حساب‌ها === (خالی - اول باید تعریف شود)');

    /* ✅ اشخاص با تمام جزئیات */
    var persons = DB.load('persons', []);
    if (persons.length > 0) {
        lines.push('\n=== 👥 اشخاص (' + persons.length + ') ===');
        lines.push('⚠️ در فیلد details.person نام دقیق از این لیست استفاده کن.');
        persons.forEach(function(p) { var parts = ['نام: ' + (p.first || '—'), 'خانوادگی: ' + (p.last || '—')];
            if (p.mobile) parts.push('موبایل: ' + p.mobile);
            if (p.nationalId) parts.push('کد ملی: ' + p.nationalId);
            lines.push('- ' + parts.join(' | ')); });
    } else lines.push('\n=== 👥 اشخاص === (خالی)');

    var companies = DB.load('companies', []);
    if (companies.length > 0) {
        lines.push('\n=== 🏢 شرکت‌ها (' + companies.length + ') ===');
        companies.forEach(function(c) { lines.push('- ' + (c.name || '—') + (c.phone ? ' | تلفن: ' + c.phone : '')); });
    } else lines.push('\n=== 🏢 شرکت‌ها === (خالی)');

    /* ✅ بانک با تمام جزئیات */
    var banks = DB.load('bankAccounts', []);
    if (banks.length > 0) {
        lines.push('\n=== 🏦 حساب‌های بانکی (' + banks.length + ') ===');
        lines.push('⚠️ در فیلد details.bank دقیقاً یکی از این‌ها را بنویس.');
        var tb = 0;
        banks.forEach(function(b) {
            var bal = getBankBalance(b.id); tb += bal;
            var det = '🏦 ' + (b.bank || '—');
            if (b.account) det += ' | حساب: ' + b.account;
            if (b.branchName) det += ' | شعبه: ' + b.branchName;
            det += ' | مانده: ' + formatRial(bal) + ' ریال';
            lines.push('- ' + det);
        });
        lines.push('💰 جمع مانده بانک‌ها: ' + formatRial(tb) + ' ریال');
    } else lines.push('\n=== 🏦 حساب‌های بانکی === (خالی)');

    /* ✅ صندوق‌ها */
    var cbs = DB.load('cashBoxes', []);
    if (cbs.length > 0) {
        lines.push('\n=== 💰 صندوق‌ها (' + cbs.length + ') ===');
        lines.push('⚠️ در فیلد details.cashbox دقیقاً عنوان صندوق را بنویس.');
        var tc = 0;
        cbs.forEach(function(c) { var bal = getCashBoxBalance(c.id); tc += bal;
            lines.push('- «' + (c.title || '—') + '» | نوع: ' + (c.type || '—') + (c.unit ? ' | واحد: ' + c.unit : '') + ' | مانده: ' + formatRial(bal) + ' ریال'); });
        lines.push('💰 جمع صندوق‌ها: ' + formatRial(tc) + ' ریال');
    } else lines.push('\n=== 💰 صندوق‌ها === (خالی)');

    var projects = DB.load('projects', []);
    if (projects.length > 0) {
        lines.push('\n=== 📁 پروژه‌ها (' + projects.length + ') ===');
        lines.push('⚠️ در فیلد details.project نام دقیق پروژه را بنویس.');
        projects.forEach(function(p) { lines.push('- «' + (p.name || '—') + '»'); });
    } else lines.push('\n=== 📁 پروژه‌ها === (خالی)');

    /* ✅ تسهیلات */
    var facilities = DB.load('facilities', []);
    if (facilities.length > 0) {
        lines.push('\n=== 🏦 تسهیلات (' + facilities.length + ') ===');
        facilities.forEach(function(f) { var ins = (f.installments || []); var paid = ins.filter(function(x) { return x.status === 'paid'; }); var unpaid = ins.filter(function(x) { return x.status !== 'paid'; });
            var paidAmt = paid.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
            var unpaidAmt = unpaid.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
            lines.push('- «' + f.name + '» | دسته: ' + categoryName(f.category) + ' | مبلغ اولیه: ' + formatRial(f.initial || 0) + ' | پرداخت: ' + formatRial(paidAmt) + ' | باقی: ' + formatRial(unpaidAmt) + ' (' + unpaid.length + ' قسط)'); });
    } else lines.push('\n=== 🏦 تسهیلات === (خالی)');

    /* ✅ اقساط پیش‌رو */
    lines.push('\n=== ⏰ اقساط ۷ روز آینده ===');
    var upcoming = [];
    facilities.forEach(function(f) { (f.installments || []).forEach(function(inst) {
        if (inst.status === 'paid' || !inst.date) return; var ip = inst.date.split('/').map(Number); if (ip.length !== 3) return;
        var dleft = jalaliDiff(todayJ[0], todayJ[1], todayJ[2], ip[0], ip[1], ip[2]);
        if (dleft >= 0 && dleft <= 7) upcoming.push({ f: f, inst: inst, daysLeft: dleft }); }); });
    if (upcoming.length === 0) lines.push('- هیچ قسطی در ۷ روز آینده نیست.');
    else { upcoming.sort(function(a, b) { return a.daysLeft - b.daysLeft; }); var upTotal = 0;
        upcoming.forEach(function(u) { upTotal += Number(u.inst.amount) || 0;
            lines.push('- ' + u.f.name + ' | ' + u.inst.date + ' | ' + formatRial(u.inst.amount || 0) + ' ریال | ' + (u.daysLeft === 0 ? 'امروز' : u.daysLeft + ' روز دیگر')); });
        lines.push('💰 جمع: ' + formatRial(upTotal) + ' ریال'); }

    /* ✅ منابع دریافتنی */
    var sources = DB.load('cashFlowSources', []);
    if (sources.length > 0) {
        lines.push('\n=== 📥 منابع دریافتنی (' + sources.length + ') ===');
        sources.forEach(function(s) { lines.push('- ' + getSourceLabel(s) + ' | تاریخ: ' + (s.expectedDate || '—') + ' | ' + formatRial(s.amount || 0) + ' ریال'); });
    }

    /* ✅ برآورد هزینه */
    var estimates = DB.load('dailyEstimates', []);
    if (estimates.length > 0) {
        lines.push('\n=== 📝 برآورد هزینه‌ها (' + estimates.length + ') ===');
        estimates.forEach(function(est) { lines.push('- «' + (est.title || est.desc) + '» | بازه: ' + est.from + ' تا ' + est.to + ' | ' + formatRial(est.total || 0) + ' ریال'); });
    }

    /* ✅ اسناد */
    var vouchers = DB.load('vouchers', []);
    if (vouchers.length > 0) {
        var approved = vouchers.filter(function(v) { return v.status === 'approved'; });
        var draft = vouchers.filter(function(v) { return v.status !== 'approved'; });
        lines.push('\n=== 📄 اسناد ===');
        lines.push('کل: ' + vouchers.length + ' | تأیید: ' + approved.length + ' | پیش‌نویس: ' + draft.length);
        var recent = approved.slice().sort(function(a, b) { return compareVals(b.date, a.date); }).slice(0, 10);
        if (recent.length > 0) { lines.push('--- ۱۰ سند آخر ---'); recent.forEach(function(v) { lines.push('• #' + v.number + ' | ' + v.date + ' | ' + formatRial(getVoucherAmount(v)) + ' ریال | ' + (v.desc || '—')); }); }
    }

    /* ✅ خلاصه ماه */
    var pr = getPeriodMonthRange();
    var monthInc = 0, monthExp = 0;
    vouchers.filter(function(v) { return v.status === 'approved' && v.date >= pr.from && v.date <= pr.to; }).forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account) return; var rootId = getRootAccountId(l.account, accounts); var root = accounts.find(function(a) { return a.id === rootId; }); if (!root) return;
            var codeRoot = String(root.code || '').charAt(0); var d = Number(l.debit) || 0, c = Number(l.credit) || 0;
            if (codeRoot === '4') monthInc += c; else if (codeRoot === '5') monthExp += d; });
    });
    lines.push('\n=== 📊 خلاصه ماه جاری (' + getJalaliMonthName(pr.month) + ' ' + toFa(pr.year) + ') ===');
    lines.push('- درآمد: ' + formatRial(monthInc) + ' ریال');
    lines.push('- هزینه: ' + formatRial(monthExp) + ' ریال');
    lines.push('- سود/زیان: ' + formatRial(monthInc - monthExp) + ' ریال');

    /* ✅ یادداشت‌ها */
    var notes = DB.load('notes', []);
    if (notes.length > 0) {
        lines.push('\n=== 📔 یادداشت‌ها (' + notes.length + ') ===');
        notes.slice(0, 10).forEach(function(n) { var chk = (n.checklist || []).length; var done = (n.checklist || []).filter(function(c) { return c.done; }).length;
            lines.push('- ' + (n.date || '—') + ' | ' + (n.title || '—') + (chk > 0 ? ' (' + done + '/' + chk + ')' : '') + (n.archived ? ' 📦' : '')); });
    }

    /* ✅ شرح‌های استاندارد */
    var stdDesc = DB.load('standardDescriptions', []);
    if (stdDesc.length > 0) lines.push('\n=== 💬 شرح‌های استاندارد ===\n' + stdDesc.join(' ، '));

    /* ✅ نرخ‌ها */
    var cr = LIVE_RATES_CACHE;
    if (cr && cr.ts > 0 && cr.values) {
        lines.push('\n=== 💱 نرخ‌های لحظه‌ای ===');
        for (var ri = 0; ri < RATE_ASSETS.length; ri++) { var val = cr.values[RATE_ASSETS[ri].key] || 0; if (val > 0) lines.push('- ' + RATE_ASSETS[ri].label + ': ' + formatRial(val) + ' ریال'); }
    }

    return lines.join('\n');
}

/* ==================== ✅ System Prompt بهبودیافته ==================== */
function aiBuildSystemPrompt() {
    return 'تو «پارسیس یار» هستی، دستیار هوشمند حسابداری و مدیریت مالی فارسی‌زبان.\n\n' +
        '🎯 **مأموریت تو**: کمک دقیق، سریع و بدون خطا به کاربر در:\n' +
        '  • صدور اسناد حسابداری با تمام تفصیلی‌ها\n' +
        '  • تحلیل داده‌های مالی و گزارش‌گیری\n' +
        '  • تعریف اطلاعات پایه (اشخاص، بانک، صندوق، پروژه، تسهیلات)\n' +
        '  • پاسخ به سوالات حسابداری و راهنمایی\n\n' +
        '═══════════════════════════════════════\n' +
        '📌 **قوانین طلایی**\n' +
        '═══════════════════════════════════════\n' +
        '1. **اطلاعات کامل** سیستم در بخش «اطلاعات پایه» انتهای همین پرامپت موجود است. حتماً قبل از پاسخ بخوان.\n' +
        '2. **هرگز** نگو «به سیستم دسترسی ندارم» یا «اطلاعات را ندارم» — همه چیز اینجاست!\n' +
        '3. **تاریخ امروز** بالای context نوشته شده. همه محاسبات تاریخ را از آن مبنا بگیر.\n' +
        '4. **تمام مبالغ به ریال** هستند. اگر کاربر «تومان» گفت، خودکار × ۱۰ کن.\n' +
        '5. **پاسخ‌ها با Markdown فارسی روان**: جدول، بولت، عناوین، اعداد فارسی.\n' +
        '6. **هرگز داده ساختگی نساز**. اگر خالی است، صریح بگو.\n\n' +
        '═══════════════════════════════════════\n' +
        '📝 **صدور سند (create_voucher_draft)**\n' +
        '═══════════════════════════════════════\n' +
        '⚠️ **فقط وقتی** کاربر صریحاً گفت: «سند بزن»، «ثبت کن»، «پرداخت شد»، «واریز شد»، «هزینه شد».\n\n' +
        '**گام‌به‌گام**:\n' +
        '1. **تاریخ**: اگر کاربر تاریخ نگفت، امروز. فرمت YYYY/MM/DD. باید در بازه دوره فعال باشد.\n' +
        '2. **حساب‌ها**: از لیست «فقط این کدها را در account_code استفاده کن» کد **دقیق** بردار.\n' +
        '3. **تفصیلی‌ها (بسیار مهم)**: اگر حساب معین «تفصیلی مرتبط» دارد، در فیلد `details` نام دقیق بنویس:\n' +
        '   • برای person → نام کامل شخص (مثلاً: "علی رضایی")\n' +
        '   • برای bank → نام بانک + شماره حساب (مثلاً: "بانک ملی - 48003")\n' +
        '   • برای cashbox → عنوان صندوق (مثلاً: "صندوق نقد")\n' +
        '   • برای project → نام پروژه\n' +
        '   • برای facility → نام تسهیلات\n' +
        '   • برای company → نام شرکت\n' +
        '4. **توازن**: جمع بدهکار = بستانکار **حتماً**.\n' +
        '5. **شرح هر قلم**: هر ردیف **باید** description داشته باشد.\n\n' +
        '**مثال درست برای «۵۰۰ هزار تومان کرایه تاکسی از صندوق پرداخت شد»**:\n' +
        '```json\n' +
        '{\n' +
        '  "date": "' + todayJalaliStr() + '",\n' +
        '  "desc": "کرایه تاکسی",\n' +
        '  "type": "general",\n' +
        '  "lines": [\n' +
        '    { "account_code": "<کد معین هزینه ایاب و ذهاب>", "debit": 5000000, "credit": 0, "description": "کرایه تاکسی" },\n' +
        '    { "account_code": "<کد معین صندوق>", "debit": 0, "credit": 5000000, "description": "پرداخت از صندوق", "details": { "cashbox": "<نام دقیق صندوق از لیست>" } }\n' +
        '  ]\n' +
        '}\n' +
        '```\n' +
        '⚠️ توجه: ۵۰۰ هزار تومان = ۵,۰۰۰,۰۰۰ ریال.\n\n' +
        '═══════════════════════════════════════\n' +
        '🗺️ **باز کردن صفحه‌ها (navigate_and_run_report)**\n' +
        '═══════════════════════════════════════\n' +
        'وقتی کاربر گفت «گزارش X را باز کن»، «برو به Y»، «داشبورد را نشان بده»:\n' +
        '• page_key را از لیست صفحات قابل اجرا انتخاب کن\n' +
        '• اگر بازه زمانی گفت، from_date و to_date را درج کن\n\n' +
        '═══════════════════════════════════════\n' +
        '👥 **تعریف اطلاعات پایه**\n' +
        '═══════════════════════════════════════\n' +
        'برای تعریف شخص/شرکت/بانک/صندوق/پروژه/دوره/حساب/تسهیلات/یادداشت از ابزارهای create_* استفاده کن.\n\n' +
        '═══════════════════════════════════════\n' +
        '📊 **تحلیل و گزارش‌گیری متنی**\n' +
        '═══════════════════════════════════════\n' +
        'برای سوالاتی مثل «وضعیت نقدینگی چطوره؟»، «چقدر درآمد داشتم؟»:\n' +
        '• از داده‌های context استفاده کن\n' +
        '• جدول خلاصه بساز\n' +
        '• تحلیل روند بده\n' +
        '• پیشنهادهای مالی ارائه بده\n\n' +
        '═══════════════════════════════════════\n' +
        '📷 **تحلیل تصویر**\n' +
        '═══════════════════════════════════════\n' +
        'اگر کاربر تصویر فرستاد: متن، اعداد، جداول، فاکتور یا فیش را دقیق بخوان و تحلیل کن.\n\n' +
        '═══════════════════════════════════════\n\n' + aiBuildContext();
}
function _aiSplitTableRow(line) { var t = String(line).trim(); if (t.charAt(0) === '|') t = t.slice(1); if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1); return t.split('|').map(function(s) { return s.trim(); }); }
function renderAIMarkdown(text) {
    if (!text) return ''; var raw = String(text);
    var html = esc(raw);
    html = html.replace(/`([^`\n]+)`/g, '<code class="ai-inline-code">$1</code>');
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^#{3}\s+(.+)$/gm, '<h4 class="ai-h">$1</h4>');
    html = html.replace(/^#{2}\s+(.+)$/gm, '<h3 class="ai-h">$1</h3>');
    html = html.replace(/^#{1}\s+(.+)$/gm, '<h2 class="ai-h">$1</h2>');
    var lines = html.split('\n'); var out = [], i = 0; var isSep = /^\s*\|?[\s:*-]+\|[\s:*-|]+\|?\s*$/;
    while (i < lines.length) { var ln = lines[i];
        if (ln.indexOf('|') !== -1 && i + 1 < lines.length && isSep.test(lines[i + 1])) {
            var headers = _aiSplitTableRow(ln); i += 2; var body = [];
            while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim() !== '') { body.push(_aiSplitTableRow(lines[i])); i++; }
            var th = '<div class="ai-table-wrap"><table class="ai-table"><thead><tr>'; headers.forEach(function(h) { th += '<th>' + h + '</th>'; }); th += '</tr></thead><tbody>';
            body.forEach(function(r) { th += '<tr>'; for (var c = 0; c < headers.length; c++) th += '<td>' + (r[c] || '') + '</td>'; th += '</tr>'; });
            th += '</tbody></table></div>'; out.push(th);
        } else { out.push(ln); i++; } }
    html = out.join('\n');
    html = html.replace(/(?:^|\n)((?:[ \t]*[-*]\s+.+(?:\n|$))+)/g, function(m, block) { var items = block.split('\n').filter(function(l) { return l.trim(); }).map(function(l) { return '<li>' + l.replace(/^[ \t]*[-*]\s+/, '') + '</li>'; }); return '\n<ul class="ai-ul">' + items.join('') + '</ul>\n'; });
    return html;
}
async function _aiDoFetch(modelId, userMessage, includeTools, imageData) {
    var sys = aiBuildSystemPrompt();
    var histArr = AI.history.slice();
    for (var hi = histArr.length - 1; hi >= 0; hi--) { if (histArr[hi].role === 'user') { histArr.splice(hi, 1); break; } }
    histArr = histArr.filter(function(m) { return m.role === 'user' || m.role === 'assistant'; }).slice(-AI.MAX_HISTORY);
    var messages = histArr.map(function(m) { return { role: m.role, content: m.content }; });
    var userContent;
    if (imageData && imageData.dataUrl) {
        userContent = [{ type: 'text', text: userMessage || 'این تصویر را تحلیل کن.' }, { type: 'image_url', image_url: { url: imageData.dataUrl } }];
    } else userContent = userMessage;
    messages.push({ role: 'user', content: userContent });
    var url, headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI.apiKey }, model = modelId;
    if (AI.provider === 'avalai') { url = 'https://api.avalai.ir/v1/chat/completions'; model = modelId || 'gpt-4o-mini'; }
    else if (AI.provider === 'chatanywhere') { url = 'https://api.chatanywhere.tech/v1/chat/completions'; model = modelId || 'deepseek-chat'; }
    else if (AI.provider === 'deepseek') { url = 'https://api.deepseek.com/v1/chat/completions'; model = modelId || 'deepseek-chat'; }
    else if (AI.provider === 'groq') { url = 'https://api.groq.com/openai/v1/chat/completions'; model = modelId || 'openai/gpt-oss-120b'; }
    else throw new Error('سرویس نامعتبر');
    var bodyObj = { model: model, messages: [{ role: 'system', content: sys }].concat(messages), temperature: 0.3, max_tokens: 4000 };
    if (includeTools && !imageData) { bodyObj.tools = AI_TOOLS; bodyObj.tool_choice = 'auto'; }
    var controller = new AbortController();
    var timer = setTimeout(function() { try { controller.abort(); } catch(e){} }, 60000);
    var res;
    try { res = await fetch(url, { method: 'POST', headers: headers, signal: controller.signal, body: JSON.stringify(bodyObj) }); }
    finally { clearTimeout(timer); }
    if (!res.ok) { var t = await res.text(); var e = new Error(res.status + ': ' + t.substring(0, 300)); e.status = res.status; throw e; }
    var data = await res.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) throw new Error('پاسخ نامعتبر');
    var msg = data.choices[0].message;
    if (msg.tool_calls && msg.tool_calls.length > 0) return { type: 'tool_call', calls: msg.tool_calls, content: msg.content || '' };
    return { type: 'text', content: msg.content || '' };
}
async function aiCallOnce(modelId, userMessage, imageData) {
    try { return await _aiDoFetch(modelId, userMessage, true, imageData); }
    catch (e) { if (e.status === 400 && /tool/i.test(String(e.message || ''))) return await _aiDoFetch(modelId, userMessage, false, imageData); throw e; }
}
async function aiCallAPI(userMessage, imageData) {
    if (AI.provider !== 'avalai') return await aiCallOnce(AI.model, userMessage, imageData);
    var candidates = [];
    if (AI.model) candidates.push(AI.model);
    if (imageData) { VISION_MODEL_IDS.forEach(function(m) { if (candidates.indexOf(m) === -1) candidates.push(m); }); }
    AVALAI_MODELS.forEach(function(m) { if (candidates.indexOf(m.id) === -1) candidates.push(m.id); });
    if (candidates.indexOf('gpt-4o-mini') === -1) candidates.push('gpt-4o-mini');
    if (!AI.autoFallback) return await aiCallOnce(AI.model, userMessage, imageData);
    var errors = [];
    for (var i = 0; i < candidates.length; i++) { var m = candidates[i]; if (AI.failedModels[m]) continue;
        try { var result = await aiCallOnce(m, userMessage, imageData);
            if (i > 0) showToast('⚠️ مدل ' + candidates[0] + ' پاسخ نداد → ' + m, 4000);
            if (AI.model !== m) { AI.model = m; aiSaveSettings(); updateAiModelSelectUI(); }
            return result;
        } catch (e) { errors.push(m + ': ' + (e.message || e)); AI.failedModels[m] = true; console.warn('AI model failed:', m, e); } }
    throw new Error('همه مدل‌ها ناموفق بودند. آخرین خطا: ' + (errors[errors.length - 1] || 'نامشخص'));
}

/* ==================== ✅ Fuzzy Matching برای تفصیلی ==================== */
function aiNormalizeStr(s) {
    return String(s || '').trim().toLowerCase()
        .replace(/[يى]/g, 'ی').replace(/[كک]/g, 'ک')
        .replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ۀ/g, 'ه')
        .replace(/\u200c/g, ' ')  /* نیم‌فاصله → فاصله */
        .replace(/\s+/g, ' ')
        .replace(/[.,،؛;:!?؟]/g, '')
        .trim();
}
function aiFindDetailId(linkType, nameHint) {
    if (!linkType || !nameHint) return { id: '', candidates: [] };
    var items = getLinkedItems(linkType);
    if (items.length === 0) return { id: '', candidates: [] };
    var q = aiNormalizeStr(nameHint);
    if (!q) return { id: '', candidates: [] };

    /* 1) تطبیق دقیق */
    for (var i = 0; i < items.length; i++) {
        var label = aiNormalizeStr(getLinkedItemLabel(linkType, items[i]));
        if (label === q) return { id: items[i].id, candidates: [] };
    }
    /* 2) نام کامل حاوی hint (یا برعکس) */
    var candidates = [];
    for (var j = 0; j < items.length; j++) {
        var l2 = aiNormalizeStr(getLinkedItemLabel(linkType, items[j]));
        if (l2.indexOf(q) !== -1 || q.indexOf(l2) !== -1) { candidates.push(items[j]); }
    }
    if (candidates.length === 1) return { id: candidates[0].id, candidates: [] };
    /* 3) تطبیق بر اساس کلمات */
    if (candidates.length === 0) {
        var qWords = q.split(' ').filter(function(w) { return w.length > 1; });
        var scored = [];
        for (var k = 0; k < items.length; k++) {
            var l3 = aiNormalizeStr(getLinkedItemLabel(linkType, items[k]));
            var score = 0;
            qWords.forEach(function(w) { if (l3.indexOf(w) !== -1) score++; });
            if (score > 0) scored.push({ item: items[k], score: score });
        }
        scored.sort(function(a, b) { return b.score - a.score; });
        if (scored.length === 1) return { id: scored[0].item.id, candidates: [] };
        if (scored.length > 1 && scored[0].score > scored[1].score) return { id: scored[0].item.id, candidates: [] };
        if (scored.length > 1) return { id: '', candidates: scored.slice(0, 5).map(function(s) { return s.item; }) };
    }
    /* 4) اگر فقط یک گزینه موجود است */
    if (items.length === 1) return { id: items[0].id, candidates: [] };
    /* 5) چند گزینه برگردان */
    if (candidates.length > 0) return { id: '', candidates: candidates.slice(0, 5) };
    return { id: '', candidates: items.slice(0, 5) };
}

function aiHandleToolCall(call) {
    if (!call || !call.function) return { error: 'ساختار ابزار نامعتبر' };
    var name = call.function.name; var args;
    try { args = JSON.parse(call.function.arguments || '{}'); } catch(e) { return { error: 'JSON نامعتبر: ' + (e.message || '') }; }
    switch (name) {
        case 'create_voucher_draft': return aiHandleVoucherDraft(args);
        case 'navigate_and_run_report': return aiHandleNavigateReport(args);
        case 'create_person': return aiHandleCreatePerson(args);
        case 'create_company': return aiHandleCreateCompany(args);
        case 'create_bank_account': return aiHandleCreateBankAccount(args);
        case 'create_cash_box': return aiHandleCreateCashBox(args);
        case 'create_project': return aiHandleCreateProject(args);
        case 'create_fiscal_period': return aiHandleCreateFiscalPeriod(args);
        case 'create_account': return aiHandleCreateAccount(args);
        case 'create_facility': return aiHandleCreateFacility(args);
        case 'create_note': return aiHandleCreateNote(args);
        default: return { error: 'ابزار ناشناخته: ' + name };
    }
}
function aiHandleNavigateReport(args) {
    var key = String(args.page_key || '').trim();
    if (!AI_NAVIGABLE_PAGES[key]) return { error: 'صفحه ناشناخته: ' + key };
    var label = AI_NAVIGABLE_PAGES[key];
    setTimeout(function() {
        goToPage(key);
        if (args.from_date || args.to_date) {
            var map = { 'report-cashflow': ['cf-from','cf-to'], 'report-cashflow-desc': ['cfd-from','cfd-to'] };
            var ids = map[key];
            if (ids) { var f = normalizeDigits(args.from_date || ''), t = normalizeDigits(args.to_date || '');
                if (f) document.getElementById(ids[0]).value = f; if (t) document.getElementById(ids[1]).value = t;
                if (key === 'report-cashflow') runCashFlowReport(); else if (key === 'report-cashflow-desc') runCashFlowByDescReport(); }
        }
        setTimeout(function() { attachDatePickers(); }, 200);
    }, 200);
    return { action: '✅ صفحه «' + label + '» باز و اجرا شد.' };
}
function aiHandleVoucherDraft(args) {
    if (!args.lines || !Array.isArray(args.lines) || args.lines.length < 2) {
        return { error: 'سند حداقل دو قلم دارد. لطفاً ردیف‌های بدهکار و بستانکار را با کد معین و مبلغ دقیق بفرست.' };
    }
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
    var lines = []; var problems = [];
    for (var i = 0; i < args.lines.length; i++) {
        var L = args.lines[i] || {}; var code = String(L.account_code || '').trim();
        if (!code) { problems.push('ردیف ' + (i + 1) + ': کد حساب خالی است'); continue; }
        var acc = leaves.find(function(a) { return String(a.code) === code; });
        if (!acc) { acc = leaves.find(function(a) { return aiNormalizeStr(a.name) === aiNormalizeStr(code); }); }
        if (!acc) { acc = leaves.find(function(a) { return aiNormalizeStr(a.name).indexOf(aiNormalizeStr(code)) !== -1; }); }
        if (!acc) {
            var available = leaves.map(function(a) { return a.code + ' (' + a.name + ')'; }).slice(0, 20).join('، ');
            problems.push('ردیف ' + (i + 1) + ': کد «' + code + '» پیدا نشد. کدهای موجود: ' + available);
            continue;
        }
        var d = Number(L.debit) || 0; var c = Number(L.credit) || 0;
        if (d < 0 || c < 0) { problems.push('ردیف ' + (i+1) + ': مبلغ منفی مجاز نیست'); continue; }
        if (d > 0 && c > 0) { problems.push('ردیف ' + (i+1) + ': هم بدهکار و هم بستانکار نمی‌شود'); continue; }
        if (d === 0 && c === 0) { problems.push('ردیف ' + (i+1) + ': مبلغ صفر است'); continue; }
        var resolvedDetails = {}; var detailsInput = L.details || {};
        if (acc.links && acc.links.length > 0) {
            for (var li = 0; li < acc.links.length; li++) {
                var lt = acc.links[li]; var items = getLinkedItems(lt); if (items.length === 0) continue;
                var hint = detailsInput[lt];
                if (!hint) {
                    var opts = items.map(function(it) { return getLinkedItemLabel(lt, it); }).slice(0, 10).join('، ');
                    problems.push('ردیف ' + (i+1) + ': حساب «' + acc.name + '» نیازمند تفصیلی ' + linkTypeName(lt) + ' است. یکی از این‌ها را در details.' + lt + ' بنویس: ' + opts);
                    continue;
                }
                var matchRes = aiFindDetailId(lt, hint);
                if (matchRes.id) { resolvedDetails[lt] = matchRes.id; }
                else if (matchRes.candidates.length > 0) {
                    var candNames = matchRes.candidates.map(function(c2) { return getLinkedItemLabel(lt, c2); }).join('، ');
                    problems.push('ردیف ' + (i+1) + ': برای ' + linkTypeName(lt) + ' با «' + hint + '» چند گزینه هست: ' + candNames + '. یکی را دقیق بنویس.');
                } else {
                    var allOpts = items.map(function(it) { return getLinkedItemLabel(lt, it); }).slice(0, 10).join('، ');
                    problems.push('ردیف ' + (i+1) + ': ' + linkTypeName(lt) + ' با «' + hint + '» پیدا نشد. گزینه‌های موجود: ' + allOpts);
                }
            }
        }
        var desc = String(L.description || '').trim() || 'بدون شرح';
        lines.push({ id: uid(), account: acc.id, details: resolvedDetails, debit: d, credit: c, description: desc });
    }
    if (lines.length < 2) problems.push('حداقل دو قلم معتبر با مبلغ لازم است.');
    var td = 0, tc = 0; lines.forEach(function(l) { td += l.debit; tc += l.credit; });
    if (Math.abs(td - tc) > 0.5 && lines.length >= 2) {
        problems.push('سند متوازن نیست. بدهکار: ' + formatMoney(td) + ' ریال | بستانکار: ' + formatMoney(tc) + ' ریال | اختلاف: ' + formatMoney(Math.abs(td - tc)) + ' ریال. یکی از ردیف‌ها را اصلاح کن.');
    }
    var date = normalizeDigits(String(args.date || '').trim());
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(date)) date = todayJalaliStr();
    var dv = validateDateInActivePeriod(date); if (!dv.ok) problems.push(dv.msg);
    if (problems.length > 0) {
        return { draft: { date: date, desc: String(args.desc || '').trim() || 'سند هوشمند', type: args.type || 'general', lines: lines }, warnings: problems };
    }
    return { draft: { date: date, desc: String(args.desc || '').trim() || 'سند هوشمند', type: args.type || 'general', lines: lines } };
}
function aiHandleCreatePerson(args) {
    if (!args.first) return { error: 'نام اجباری است' };
    var persons = DB.load('persons', []);
    if (persons.some(function(p) { return aiNormalizeStr(p.first) === aiNormalizeStr(args.first) && aiNormalizeStr(p.last || '') === aiNormalizeStr(args.last || ''); }))
        return { error: 'شخصی با همین نام و فامیل قبلاً ثبت شده' };
    var o = { id: uid(), first: String(args.first).trim(), last: String(args.last || '').trim(), father: String(args.father || '').trim(),
        nationalId: normalizeDigits(String(args.nationalId || '').trim()), birth: normalizeDigits(String(args.birth || '').trim()),
        mobile: normalizeDigits(String(args.mobile || '').trim()), phone: normalizeDigits(String(args.phone || '').trim()),
        email: String(args.email || '').trim(), bankTitle: String(args.bankTitle || '').trim(),
        acc: normalizeDigits(String(args.acc || '').trim()), iban: String(args.iban || '').trim(),
        card: normalizeDigits(String(args.card || '').trim()), address: String(args.address || '').trim() };
    persons.push(o); DB.save('persons', persons); renderPersonsList(); updateHomeWidgets();
    return { action: '✅ شخص «' + o.first + ' ' + o.last + '» تعریف شد.' };
}
function aiHandleCreateCompany(args) {
    if (!args.name) return { error: 'نام اجباری' };
    var list = DB.load('companies', []);
    if (list.some(function(x) { return aiNormalizeStr(x.name) === aiNormalizeStr(args.name); })) return { error: 'شرکت تکراری' };
    var o = { id: uid(), name: String(args.name).trim(), phone: normalizeDigits(String(args.phone || '').trim()), email: String(args.email || '').trim(), address: String(args.address || '').trim() };
    list.push(o); DB.save('companies', list); renderCompaniesList();
    return { action: '✅ شرکت «' + o.name + '» تعریف شد.' };
}
function aiHandleCreateBankAccount(args) {
    if (!args.bank) return { error: 'نام بانک اجباری' };
    var list = DB.load('bankAccounts', []); var accNo = normalizeDigits(String(args.account || '').trim());
    if (accNo && list.some(function(x) { return (x.account || '').trim() === accNo; })) return { error: 'حساب تکراری' };
    var o = { id: uid(), bank: String(args.bank).trim(), type: String(args.type || '').trim(), branchCode: normalizeDigits(String(args.branchCode || '').trim()),
        branchName: String(args.branchName || '').trim(), account: accNo, iban: String(args.iban || '').trim(),
        card: normalizeDigits(String(args.card || '').trim()), order: args.order != null ? Number(args.order) : null, minBalance: Number(args.minBalance) || 0 };
    list.push(o); DB.save('bankAccounts', list); renderBankAccountsList(); updateHomeWidgets();
    return { action: '✅ حساب «' + o.bank + (o.account ? ' - ' + o.account : '') + '» تعریف شد.' };
}
function aiHandleCreateCashBox(args) {
    if (!args.title) return { error: 'عنوان اجباری' };
    var list = DB.load('cashBoxes', []);
    if (list.some(function(x) { return aiNormalizeStr(x.title) === aiNormalizeStr(args.title); })) return { error: 'صندوق تکراری' };
    var o = { id: uid(), title: String(args.title).trim(), type: String(args.type || 'نقد').trim(), unit: String(args.unit || '').trim(), order: args.order != null ? Number(args.order) : null };
    list.push(o); DB.save('cashBoxes', list); renderCashBoxesList(); updateHomeWidgets();
    return { action: '✅ صندوق «' + o.title + '» تعریف شد.' };
}
function aiHandleCreateProject(args) {
    if (!args.name) return { error: 'نام اجباری' };
    var list = DB.load('projects', []);
    if (list.some(function(x) { return aiNormalizeStr(x.name) === aiNormalizeStr(args.name); })) return { error: 'پروژه تکراری' };
    var o = { id: uid(), name: String(args.name).trim() };
    list.push(o); DB.save('projects', list); renderProjectsList();
    return { action: '✅ پروژه «' + o.name + '» تعریف شد.' };
}
function aiHandleCreateFiscalPeriod(args) {
    if (!args.title || !args.from || !args.to) return { error: 'عنوان، از و تا اجباری' };
    var list = DB.load('fiscalPeriods', []); var from = normalizeDigits(String(args.from).trim()); var to = normalizeDigits(String(args.to).trim());
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(from) || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(to)) return { error: 'فرمت تاریخ نامعتبر (باید YYYY/MM/DD باشد)' };
    if (from > to) return { error: 'شروع باید قبل از پایان' };
    var nid = uid(); list.push({ id: nid, title: String(args.title).trim(), from: from, to: to });
    DB.save('fiscalPeriods', list);
    var activated = false; if (args.activate || !state.activePeriodId) { state.activePeriodId = nid; saveState('activePeriodId'); activated = true; }
    renderFiscalList(); updateTopbarPeriod();
    return { action: '✅ دوره «' + args.title + '» از ' + from + ' تا ' + to + (activated ? ' (فعال)' : '') };
}
function aiHandleCreateAccount(args) {
    if (!args.code || !args.name) return { error: 'کد و عنوان اجباری' };
    var accounts = DB.load('accounts', []); var code = normalizeDigits(String(args.code).trim());
    if (accounts.some(function(a) { return a.code === code; })) return { error: 'کد تکراری' };
    var parentId = ''; if (args.parent_code) { var par = accounts.find(function(a) { return a.code === normalizeDigits(String(args.parent_code).trim()); }); if (!par) return { error: 'حساب والد یافت نشد' }; parentId = par.id; }
    var level = 1; if (parentId) { var cur = accounts.find(function(a) { return a.id === parentId; }); while (cur && cur.parent) { level++; cur = accounts.find(function(a) { return a.id === cur.parent; }); } level++; }
    if (level > 3) return { error: 'حداکثر سطح ۳' };
    var links = Array.isArray(args.links) ? args.links.filter(function(x) { return ['person','company','bank','cashbox','project','facility'].indexOf(x) !== -1; }) : [];
    if (level !== 3) links = [];
    var o = { id: uid(), code: code, name: String(args.name).trim(), parent: parentId, level: level, cat: args.cat || 'permanent', nature: args.nature || 'debit', active: true, links: links, cfEffect: (level === 3) && !!args.cfEffect };
    accounts.push(o); DB.save('accounts', accounts); renderChartTree('chart-tree', true); refreshTemplateSelect();
    return { action: '✅ حساب «' + o.code + ' - ' + o.name + '» سطح ' + level + ' تعریف شد.' };
}
function aiHandleCreateFacility(args) {
    if (!args.name) return { error: 'نام اجباری' };
    var list = DB.load('facilities', []);
    if (list.some(function(x) { return aiNormalizeStr(x.name) === aiNormalizeStr(args.name); })) return { error: 'تکراری' };
    var bankId = '';
    if (args.bank_account) {
        var banks = DB.load('bankAccounts', []);
        var res = aiFindDetailId('bank', args.bank_account);
        if (res.id) bankId = res.id;
    }
    var o = { id: uid(), name: String(args.name).trim(), category: args.category || 'facility', bankId: bankId,
        date: normalizeDigits(String(args.date || '').trim()), initial: Number(args.initial) || 0, paid: 0, installments: [], status: 'active' };
    list.push(o); DB.save('facilities', list); renderFacilitiesList(); updateHomeWidgets();
    return { action: '✅ تسهیلات «' + o.name + '» تعریف شد.' };
}
function aiHandleCreateNote(args) {
    if (!args.title) return { error: 'عنوان اجباری' };
    var list = DB.load('notes', []); var cl = [];
    if (Array.isArray(args.checklist)) cl = args.checklist.filter(function(t) { return t && String(t).trim(); }).map(function(t) { return { id: uid(), text: String(t).trim(), done: false }; });
    var o = { id: uid(), title: String(args.title).trim(), date: normalizeDigits(String(args.date || todayJalaliStr()).trim()), content: String(args.content || ''), checklist: cl, imageRefs: [], archived: false, savedAt: Date.now() };
    list.push(o); DB.save('notes', list); renderNotesList();
    return { action: '✅ یادداشت «' + o.title + '» ایجاد شد.' };
}
function aiLoadDraftIntoForm(draft) {
    if (!draft || !draft.lines || draft.lines.length === 0) { alert('پیش‌نویس خالی است.'); return; }
    document.getElementById('v-id').value = '';
    document.getElementById('v-number').value = getNextVoucherNumberForPeriod(state.activePeriodId || '');
    document.getElementById('v-date').value = draft.date || todayJalaliStr();
    document.getElementById('v-type').value = draft.type || 'general';
    document.getElementById('v-desc').value = draft.desc || '';
    currentVoucherStatus = 'draft';
    voucherLines = JSON.parse(JSON.stringify(draft.lines));
    renderVoucherLines();
    goToPage('voucher-new');
    aiClose();
    showToast('🤖 پیش‌نویس سند آماده شد — بازبینی و ذخیره کن');
}
function updateAiModelSelectUI() {
    var status = document.getElementById('ai-model-status'); if (!status) return;
    var failed = Object.keys(AI.failedModels);
    var txt = 'مدل فعلی: ' + (AI.model || '—');
    if (failed.length > 0) txt += ' | ناموفق: ' + failed.join(', ');
    status.textContent = txt;
}
function aiRender() {
    var box = document.getElementById('ai-messages'); if (!box) return;
    if (!AI.apiKey) {
        box.innerHTML = '<div class="ai-setup"><h3>🤖 به پارسیس یار خوش آمدید</h3>' +
            '<p>کلید API را از تنظیمات (⚙) وارد کنید.<br>سرویس AvalAI ایرانی است.<br><a href="https://avalai.ir" target="_blank">avalai.ir</a></p>' +
            '<p style="margin-top:14px;font-size:0.82rem;color:#667eea">🎤 می‌توانی با میکروفون صحبت کنی<br>📷 می‌توانی عکس فاکتور/فیش/فرم بفرستی<br>🔊 پاسخ‌ها به صورت صوتی هم پخش می‌شوند</p>' +
            '<button class="btn-primary" onclick="document.getElementById(\'ai-settings-btn\').click()">⚙ تنظیمات</button></div>';
        return;
    }
    if (AI.history.length === 0) {
        box.innerHTML = '<div class="ai-msg system">👋 سلام! من پارسیس یار هستم.<br>می‌توانم:<br>• 📝 سند با تفصیلی‌های دقیق ثبت کنم<br>• 📊 گزارش‌های متنوع بسازم و تحلیل کنم<br>• 👥 اطلاعات پایه تعریف کنم<br>• 🎤 به صحبتت گوش بدم<br>• 📷 عکس فاکتور/فیش را تحلیل کنم<br>• 🔊 پاسخ‌ها را با صدای پارسی بخونم</div>';
        return;
    }
    var html = '';
    AI.history.forEach(function(m, mi) {
        var cls = m.role === 'user' ? 'user' : (m.role === 'error' ? 'error' : 'assistant');
        var content = (m.role === 'assistant') ? renderAIMarkdown(m.content || '') : esc(m.content);
        if (m.role === 'user' && m.image && m.image.dataUrl) content += '<img class="ai-msg-image" src="' + m.image.dataUrl + '" alt="">';
        html += '<div class="ai-msg ' + cls + '">' + content;
        if (m.drafts && m.drafts.length > 0) {
            m.drafts.forEach(function(d, di) {
                var accounts = DB.load('accounts', []);
                var td = 0, tc = 0; d.lines.forEach(function(l) { td += l.debit; tc += l.credit; });
                var rows = '';
                d.lines.forEach(function(l, li) {
                    var accLabel = getAccountLabel(l.account, accounts);
                    var detStr = '';
                    if (l.details) Object.keys(l.details).forEach(function(lt) { if (l.details[lt]) { if (detStr) detStr += ' ، '; detStr += linkTypeName(lt) + ': ' + getDetailLabel(lt, l.details[lt]); } });
                    rows += '<tr><td>' + toFa(li + 1) + '</td><td>' + esc(accLabel) + (detStr ? '<div style="font-size:0.7rem;color:#666">' + esc(detStr) + '</div>' : '') + '</td><td>' + esc(l.description || '') + '</td>' +
                        '<td class="dr" style="text-align:center">' + (l.debit ? formatMoney(l.debit) : '—') + '</td>' +
                        '<td class="cr" style="text-align:center">' + (l.credit ? formatMoney(l.credit) : '—') + '</td></tr>';
                });
                html += '<div class="ai-draft-card">' +
                    '<div class="ai-draft-head">📝 پیش‌نویس سند آماده شد</div>' +
                    '<div class="ai-draft-meta">تاریخ: <b dir="ltr">' + toFa(esc(d.date)) + '</b> | نوع: <b>' + voucherTypeName(d.type) + '</b> | شرح: <b>' + esc(d.desc) + '</b></div>' +
                    '<table class="ai-draft-table"><thead><tr><th>#</th><th>حساب</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>' + rows + '</tbody>' +
                    '<tfoot><tr><td colspan="3">جمع</td><td>' + formatMoney(td) + '</td><td>' + formatMoney(tc) + '</td></tr></tfoot></table>' +
                    '<button class="ai-draft-load" data-msg-idx="' + mi + '" data-draft-idx="' + di + '">📥 بارگذاری در فرم سند</button>' +
                    '</div>';
            });
        }
        if (m.actions && m.actions.length > 0) { m.actions.forEach(function(a) { html += '<div class="ai-action-card">' + esc(a) + '</div>'; }); }
        if (m.errors && m.errors.length > 0) { html += '<div class="ai-draft-errors"><strong>⚠️ نتوانستم انجام دهم:</strong>' + m.errors.map(esc).join('<br>') + '</div>'; }
        if (m.warnings && m.warnings.length > 0) { html += '<div class="ai-draft-errors"><strong>⚠️ هشدار (قابل بارگذاری):</strong>' + m.warnings.map(esc).join('<br>') + '</div>'; }
        html += '</div>';
    });
    if (AI.isThinking) html += '<div class="ai-msg thinking">در حال فکر کردن</div>';
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
    box.querySelectorAll('.ai-draft-load').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var mi = Number(this.getAttribute('data-msg-idx'));
            var di = Number(this.getAttribute('data-draft-idx'));
            var msg = AI.history[mi];
            if (!msg || !msg.drafts || !msg.drafts[di]) { alert('پیش‌نویس یافت نشد.'); return; }
            aiLoadDraftIntoForm(msg.drafts[di]);
        });
    });
}
function aiOpen() { document.getElementById('ai-modal').classList.add('show'); document.getElementById('ai-overlay').classList.add('show'); aiRender(); }
function aiClose() { document.getElementById('ai-modal').classList.remove('show'); document.getElementById('ai-overlay').classList.remove('show'); if (AI_VOICE_ACTIVE) aiStopVoice(); aiStopSpeaking(); }
async function aiSend() {
    if (AI.isThinking) return;
    var inp = document.getElementById('ai-input'); var text = (inp.value || '').trim();
    var img = AI_PENDING_IMAGE;
    if (!text && !img) return;
    if (!AI.apiKey) { alert('کلید API را وارد کنید.'); return; }
    if (AI_VOICE_ACTIVE) aiStopVoice();
    inp.value = '';
    AI_PENDING_IMAGE = null;
    aiRenderImagePreview();
    var historyEntry = { role: 'user', content: text || '📷 [تحلیل تصویر]' };
    if (img) historyEntry.image = { name: img.name, dataUrl: img.dataUrl };
    AI.history.push(historyEntry);
    AI.isThinking = true; aiRender();
    var btn = document.getElementById('ai-send-btn'); if (btn) btn.disabled = true;
    try {
        var result = await aiCallAPI(text, img);
        if (result && result.type === 'tool_call') {
            var drafts = []; var actions = []; var errors = []; var warnings = [];
            for (var i = 0; i < result.calls.length; i++) {
                var r = aiHandleToolCall(result.calls[i]);
                if (!r) continue;
                if (r.draft) drafts.push(r.draft); else if (r.action) actions.push(r.action); else if (r.error) errors.push(r.error);
                if (r.warnings) warnings = warnings.concat(r.warnings);
            }
            var msgContent = result.content || '';
            if (!msgContent) {
                if (drafts.length > 0) msgContent = '✅ پیش‌نویس سند آماده شد. برای بازبینی روی دکمه «بارگذاری در فرم سند» بزن.';
                else if (actions.length > 0) msgContent = '✅ عملیات با موفقیت انجام شد.';
                else if (errors.length > 0) msgContent = '⚠️ نتوانستم کامل انجام دهم. لطفاً متن خطا را ببین و اصلاح کن.';
                else msgContent = '⚠️ نتوانستم انجام دهم.';
            }
            var msg = { role: 'assistant', content: msgContent };
            if (drafts.length > 0) msg.drafts = drafts;
            if (actions.length > 0) msg.actions = actions;
            if (errors.length > 0) msg.errors = errors;
            if (warnings.length > 0) msg.warnings = warnings;
            AI.history.push(msg);
            aiAutoSpeakIfNeeded(msg);
        } else {
            var txtMsg = { role: 'assistant', content: (result && result.content) || '' };
            AI.history.push(txtMsg);
            aiAutoSpeakIfNeeded(txtMsg);
        }
    } catch (e) { AI.history.push({ role: 'error', content: '⚠️ ' + (e.message || 'خطا') }); }
    finally { AI.isThinking = false; if (btn) btn.disabled = false; aiSaveHistory(); aiRender(); }
}
function aiOpenSettings() {
    document.getElementById('ai-provider-select').value = AI.provider;
    document.getElementById('ai-apikey-input').value = AI.apiKey;
    document.getElementById('ai-model-input').value = AI.model || '';
    document.getElementById('ai-auto-fallback').checked = !!AI.autoFallback;
    var ttsAutoS = document.getElementById('ai-auto-speak'); if (ttsAutoS) ttsAutoS.checked = !!AI_TTS.autoSpeak;
    var ttsRateS = document.getElementById('ai-speak-rate'); if (ttsRateS) ttsRateS.value = AI_TTS.rate;
    var sel = document.getElementById('ai-model-select');
    sel.innerHTML = '<option value="__auto__">🤖 خودکار (پیشنهاد: gpt-4o-mini)</option>';
    AVALAI_MODELS.forEach(function(m) { var o = document.createElement('option'); o.value = m.id; o.textContent = m.label; if (AI.model === m.id) o.selected = true; sel.appendChild(o); });
    if (!AVALAI_MODELS.some(function(m) { return m.id === AI.model; })) sel.value = '__auto__';
    updateAiModelSelectUI();
    document.getElementById('ai-settings-modal').classList.add('show');
    document.getElementById('ai-settings-overlay').classList.add('show');
}
function aiCloseSettings() { document.getElementById('ai-settings-modal').classList.remove('show'); document.getElementById('ai-settings-overlay').classList.remove('show'); }
function initDraggableFab() {
    var fab = document.getElementById('ai-fab'); if (!fab) return;
    var pos = state.aiFabPos || { left: 22, bottom: 22 };
    fab.style.left = pos.left + 'px'; fab.style.bottom = pos.bottom + 'px'; fab.style.right = 'auto';
    var isDragging = false, startX = 0, startY = 0, startL = 0, startB = 0, moved = false;
    function getPoint(e) { if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY }; return { x: e.clientX, y: e.clientY }; }
    function onDown(e) { isDragging = true; moved = false; var p = getPoint(e); startX = p.x; startY = p.y;
        startL = fab.offsetLeft; startB = window.innerHeight - fab.offsetTop - fab.offsetHeight; fab.classList.add('dragging'); }
    function onMove(e) { if (!isDragging) return; var p = getPoint(e); var dx = p.x - startX, dy = p.y - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        var newL = startL + dx; var newB = startB - dy;
        newL = Math.max(4, Math.min(window.innerWidth - fab.offsetWidth - 4, newL));
        newB = Math.max(4, Math.min(window.innerHeight - fab.offsetHeight - 4, newB));
        fab.style.left = newL + 'px'; fab.style.bottom = newB + 'px'; if (e.cancelable) e.preventDefault(); }
    function onUp(e) { if (!isDragging) return; isDragging = false; fab.classList.remove('dragging');
        if (moved) { state.aiFabPos = { left: fab.offsetLeft, bottom: window.innerHeight - fab.offsetTop - fab.offsetHeight }; DB.save('aiFabPos', state.aiFabPos); }
        else { aiOpen(); } }
    fab.addEventListener('mousedown', onDown); document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    fab.addEventListener('touchstart', onDown, { passive: false }); document.addEventListener('touchmove', onMove, { passive: false }); document.addEventListener('touchend', onUp);
}
function aiInit() {
    initDraggableFab();
    document.getElementById('ai-close-btn').addEventListener('click', aiClose);
    document.getElementById('ai-overlay').addEventListener('click', aiClose);
    document.getElementById('ai-settings-btn').addEventListener('click', function(e) { e.stopPropagation(); aiOpenSettings(); });
    document.getElementById('ai-settings-close').addEventListener('click', aiCloseSettings);
    document.getElementById('ai-settings-cancel').addEventListener('click', aiCloseSettings);
    document.getElementById('ai-settings-overlay').addEventListener('click', aiCloseSettings);
    document.getElementById('ai-settings-save').addEventListener('click', function() {
        AI.provider = document.getElementById('ai-provider-select').value;
        AI.apiKey = document.getElementById('ai-apikey-input').value.trim();
        var selVal = document.getElementById('ai-model-select').value;
        var freeModel = document.getElementById('ai-model-input').value.trim();
        if (freeModel) AI.model = freeModel; else if (selVal && selVal !== '__auto__') AI.model = selVal; else AI.model = 'gpt-4o-mini';
        AI.autoFallback = document.getElementById('ai-auto-fallback').checked;
        AI.failedModels = {}; aiSaveSettings(); aiCloseSettings(); aiRender(); updateAiModelSelectUI();
        showToast('✅ ذخیره شد. مدل: ' + AI.model);
    });
    document.getElementById('ai-model-select').addEventListener('change', function() { var v = this.value; if (v === '__auto__') document.getElementById('ai-model-input').value = ''; else document.getElementById('ai-model-input').value = v; });
    document.getElementById('ai-clear-btn').addEventListener('click', function() { if (!confirm('پاک شود؟')) return; AI.history = []; aiSaveHistory(); aiRender(); });
    document.getElementById('ai-send-btn').addEventListener('click', aiSend);
    document.getElementById('ai-input').addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); } });
    document.getElementById('ai-mic-btn').addEventListener('click', aiToggleVoice);
    document.getElementById('ai-img-btn').addEventListener('click', function() { document.getElementById('ai-image-file').click(); });
    document.getElementById('ai-image-file').addEventListener('change', function() { if (this.files && this.files[0]) aiAttachImage(this.files[0]); this.value = ''; });
    document.getElementById('ai-input').addEventListener('paste', function(e) {
        var items = (e.clipboardData || {}).items || [];
        for (var i = 0; i < items.length; i++) { if (items[i].type && items[i].type.indexOf('image') !== -1) { e.preventDefault(); aiAttachImage(items[i].getAsFile()); return; } }
    });
    document.querySelectorAll('.ai-suggestion').forEach(function(b) { b.addEventListener('click', function() { document.getElementById('ai-input').value = this.getAttribute('data-q'); aiSend(); }); });
    var ttsBtn = document.getElementById('ai-tts-btn');
    if (ttsBtn) ttsBtn.addEventListener('click', function(e) { e.stopPropagation(); aiToggleSpeak(); });
    var ttsAuto = document.getElementById('ai-auto-speak');
    if (ttsAuto) { ttsAuto.checked = !!AI_TTS.autoSpeak; ttsAuto.addEventListener('change', function() { AI_TTS.autoSpeak = this.checked; aiSaveTTS(); showToast(this.checked ? '🔊 خواندن خودکار فعال شد' : '🔇 غیرفعال شد'); }); }
    var ttsRate = document.getElementById('ai-speak-rate');
    if (ttsRate) { ttsRate.value = AI_TTS.rate; ttsRate.addEventListener('input', function() { AI_TTS.rate = Number(this.value) || 1; aiSaveTTS(); }); }
    if (window.speechSynthesis) AI_TTS.voice = aiPickPersianVoice();
}
function initSidebarSearch() {
    var inp = document.getElementById('sidebar-search-input'); if (!inp) return;
    inp.addEventListener('input', function() {
        var q = this.value.trim().toLowerCase();
        var groups = document.querySelectorAll('#sidebar-nav .nav-group');
        for (var i = 0; i < groups.length; i++) {
            var btns = groups[i].querySelectorAll('.nav-group-items button');
            var anyMatch = false;
            for (var j = 0; j < btns.length; j++) { var txt = btns[j].textContent.toLowerCase(); var match = !q || txt.indexOf(q) !== -1;
                btns[j].style.display = match ? '' : 'none'; if (match) anyMatch = true; }
            groups[i].style.display = anyMatch ? '' : 'none';
            if (q && anyMatch) groups[i].classList.remove('collapsed');
        }
    });
}
function initHomeSwipe() {
    var grid = document.getElementById('home-grid'); if (!grid) return;
    var startX = 0, startY = 0, tracking = false;
    grid.addEventListener('touchstart', function(e) { if (e.touches.length !== 1) return; startX = e.touches[0].clientX; startY = e.touches[0].clientY; tracking = true; }, { passive: true });
    grid.addEventListener('touchend', function(e) { if (!tracking) return; tracking = false;
        var dx = e.changedTouches[0].clientX - startX; var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0) { if (state.homePage < 3) { state.homePage++; saveState('homePage'); applyWidgetVisibility(); } }
        else { if (state.homePage > 1) { state.homePage--; saveState('homePage'); applyWidgetVisibility(); } } }, { passive: true });
}

/* ==================== INIT ==================== */
function init() {
    applyTheme(state.theme); applyFont(state.font);
    renderChips('bank-types-list', state.bankTypes, 'bankTypes'); renderChips('cash-types-list', state.cashTypes, 'cashTypes');
    setupTabs(); setupSorting();
    if (DB.load('accounts', []).length > 0) document.getElementById('load-default-chart').disabled = true;
    if (!localStorage.getItem(LS_PREFIX + 'voucherTemplates')) DB.save('voucherTemplates', getDefaultTemplates());
    if (!localStorage.getItem(LS_PREFIX + 'standardDescriptions')) DB.save('standardDescriptions', getDefaultStdDescriptions());
    refreshStdDescDatalist(); refreshTemplateSelect(); renderTemplateList(); applyWidgetVisibility();
    renderWidgetOrderUI(); renderFrequentNav();
    renderSmsInbox(); updateSmsBadge();
    document.getElementById('set-currency-display2').value = state.currencyDisplay;
    document.getElementById('set-hide-numbers').checked = state.hideNumbers;
    document.getElementById('set-sms-auto-read').checked = state.smsAutoRead;
    document.getElementById('sms-auto-read').checked = state.smsAutoRead;
    var aboutEl = document.getElementById('about-version'); if (aboutEl) aboutEl.textContent = APP_NAME + ' — نسخه ' + toFa(APP_VERSION) + ' (PWA)';
    updateUnitChips();
    document.getElementById('menu-btn').addEventListener('click', openSidebar);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    document.getElementById('overlay').addEventListener('click', function() { closeSidebar(); closeSettings(); });
    var titles = document.querySelectorAll('.nav-group-title');
    for (var i = 0; i < titles.length; i++) titles[i].addEventListener('click', function() { this.parentElement.classList.toggle('collapsed'); });
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.nav-group-items button[data-page]');
        if (btn) { goToPage(btn.getAttribute('data-page')); }
    });
    document.getElementById('side-expand').addEventListener('click', function() { document.querySelectorAll('.nav-group').forEach(function(g) { g.classList.remove('collapsed'); }); });
    document.getElementById('side-collapse').addEventListener('click', function() { document.querySelectorAll('.nav-group').forEach(function(g) { g.classList.add('collapsed'); }); });
    var hpTabs = document.querySelectorAll('.home-page-tab');
    for (var hpt = 0; hpt < hpTabs.length; hpt++) hpTabs[hpt].addEventListener('click', function() { setHomePage(Number(this.getAttribute('data-home-page'))); });
    document.getElementById('cd-expand').addEventListener('click', function() { setAllExpanded(true); });
    document.getElementById('cd-collapse').addEventListener('click', function() { setAllExpanded(false); });
    document.getElementById('ra-expand').addEventListener('click', function() { state.reportExpandedNodes = {}; if (window._renderAccountReportTree) window._renderAccountReportTree(); });
    document.getElementById('ra-collapse').addEventListener('click', function() { var accounts = DB.load('accounts', []); var nodes = {}; accounts.forEach(function(a) { nodes[a.id] = false; }); state.reportExpandedNodes = nodes; if (window._renderAccountReportTree) window._renderAccountReportTree(); });
    document.getElementById('charttree-search').addEventListener('input', function() { renderChartTree('chart-tree', true); });
    document.getElementById('fiscal-filter').addEventListener('input', renderFiscalList);
    document.getElementById('persons-filter').addEventListener('input', renderPersonsList);
    document.getElementById('comp-filter').addEventListener('input', renderCompaniesList);
    document.getElementById('ba-filter').addEventListener('input', renderBankAccountsList);
    document.getElementById('cb-filter').addEventListener('input', renderCashBoxesList);
    document.getElementById('proj-filter').addEventListener('input', renderProjectsList);
    document.getElementById('fac-filter').addEventListener('input', renderFacilitiesList);
    document.getElementById('fac-cat-filter').addEventListener('change', renderFacilitiesList);
    document.getElementById('cfs-filter').addEventListener('input', renderCfsList);
    document.getElementById('est-filter').addEventListener('input', renderEstimateList);
    document.getElementById('vlist-search').addEventListener('input', renderVoucherList);
    document.getElementById('notes-filter').addEventListener('input', renderNotesList);
    var notesViewBtns = document.querySelectorAll('[data-notes-view]');
    for (var nv = 0; nv < notesViewBtns.length; nv++) notesViewBtns[nv].addEventListener('click', function() { state.notesView = this.getAttribute('data-notes-view'); saveState('notesView'); renderNotesList(); });
    var eB = document.querySelectorAll('.export-btn[data-export]');
    for (var e = 0; e < eB.length; e++) eB[e].addEventListener('click', function() { exportToCsv(this.getAttribute('data-export'), this.getAttribute('data-export')); });
    var wT = document.querySelectorAll('[data-widget-toggle]');
    for (var wt = 0; wt < wT.length; wt++) wT[wt].addEventListener('change', function() { var k = this.getAttribute('data-widget-toggle'); state.widgets[k] = this.checked; DB.save('widgets', state.widgets); updateHomeWidgets(); });
    document.getElementById('close-vpreview').addEventListener('click', closeVoucherPreview);
    document.getElementById('vpreview-close-btn').addEventListener('click', closeVoucherPreview);
    document.getElementById('vpreview-overlay').addEventListener('click', closeVoucherPreview);
    document.getElementById('vpreview-print').addEventListener('click', printVoucherPreview);
    document.getElementById('close-turnover').addEventListener('click', closeTurnover);
    document.getElementById('turnover-close-btn').addEventListener('click', closeTurnover);
    document.getElementById('turnover-overlay').addEventListener('click', closeTurnover);
    document.getElementById('turnover-print').addEventListener('click', function() { printHtmlReport('#turnover-body', 'گردش حساب'); });
    document.getElementById('close-imgview').addEventListener('click', function() { document.getElementById('imgview-modal').classList.remove('show'); document.getElementById('imgview-overlay').classList.remove('show'); });
    document.getElementById('imgview-overlay').addEventListener('click', function() { document.getElementById('imgview-modal').classList.remove('show'); document.getElementById('imgview-overlay').classList.remove('show'); });
    document.getElementById('close-noteview').addEventListener('click', closeNoteView);
    document.getElementById('noteview-overlay').addEventListener('click', closeNoteView);
    var tC = document.querySelectorAll('.theme-card');
    for (var k = 0; k < tC.length; k++) tC[k].addEventListener('click', function() { state.theme = this.getAttribute('data-theme'); saveState('theme'); applyTheme(state.theme); });
    var fC = document.querySelectorAll('.font-card');
    for (var fc = 0; fc < fC.length; fc++) fC[fc].addEventListener('click', function() { state.font = this.getAttribute('data-font'); saveState('font'); applyFont(state.font); });
    document.getElementById('settings-btn').addEventListener('click', function() { document.getElementById('settings-modal').classList.add('show'); document.getElementById('settings-overlay').classList.add('show'); renderWidgetOrderUI(); var aboutEl = document.getElementById('about-version'); if (aboutEl) aboutEl.textContent = APP_NAME + ' — نسخه ' + toFa(APP_VERSION) + ' (PWA)'; });
    document.getElementById('close-settings').addEventListener('click', closeSettings);
    document.getElementById('settings-overlay').addEventListener('click', closeSettings);
    document.getElementById('modal-backup-btn').addEventListener('click', downloadBackup);
    document.getElementById('modal-restore-btn').addEventListener('click', function() { document.getElementById('restore-file').click(); });
    document.getElementById('restore-file').addEventListener('change', function() { if (this.files[0]) restoreBackup(this.files[0]); this.value = ''; });
    document.getElementById('modal-reset-btn').addEventListener('click', resetAllData);
    document.getElementById('logout-btn').addEventListener('click', function() { if (confirm('رفرش شود؟')) location.reload(); });
    function onSAR(val) { state.smsAutoRead = val; DB.save('smsAutoRead', val); document.getElementById('sms-auto-read').checked = val; document.getElementById('set-sms-auto-read').checked = val; }
    document.getElementById('sms-auto-read').addEventListener('change', function() { onSAR(this.checked); });
    document.getElementById('set-sms-auto-read').addEventListener('change', function() { onSAR(this.checked); });
    document.getElementById('sms-read-clip').addEventListener('click', function() { readClipboardAndAdd(false); });
    document.getElementById('parse-sms').addEventListener('click', function() {
        var text = document.getElementById('sms-text').value; if (!text.trim()) { alert('متن را وارد کن.'); return; }
        var res = addSmsToInbox(text, 'paste');
        if (res.ok) { showToast('✅'); document.getElementById('sms-text').value = ''; renderSmsInbox(); updateSmsBadge(); }
        else alert(res.reason === 'duplicate' ? 'قبلاً ثبت شده.' : 'قابل تشخیص نبود.');
    });
    document.getElementById('clear-sms').addEventListener('click', function() { document.getElementById('sms-text').value = ''; document.getElementById('sms-result').innerHTML = ''; });
    document.getElementById('sms-clear-converted').addEventListener('click', function() { if (!confirm('حذف تبدیل‌شده‌ها؟')) return; var l = getSmsInbox().filter(function(s) { return s.status === 'new'; }); saveSmsInbox(l); renderSmsInbox(); updateSmsBadge(); });
    document.getElementById('set-language').value = state.language;
    document.getElementById('set-language').addEventListener('change', function() { state.language = this.value; saveState('language'); });
    document.getElementById('set-currency').value = state.currency;
    document.getElementById('set-currency').addEventListener('change', function() { state.currency = this.value; saveState('currency'); });
    function onCD(v) { state.currencyDisplay = v; saveState('currencyDisplay'); document.getElementById('set-currency-display').value = v; document.getElementById('set-currency-display2').value = v; updateUnitChips(); updateHomeWidgets(); rerenderCurrentPage(); }
    document.getElementById('set-currency-display').addEventListener('change', function() { onCD(this.value); });
    document.getElementById('set-currency-display2').addEventListener('change', function() { onCD(this.value); });
    function onHN(v) { state.hideNumbers = v; saveState('hideNumbers'); document.getElementById('set-hide-numbers').checked = v; updateEyeButtons(); updateHomeWidgets(); rerenderCurrentPage(); }
    document.getElementById('set-hide-numbers').addEventListener('change', function() { onHN(this.checked); });
    document.getElementById('add-bank-type').addEventListener('click', function() { var v = document.getElementById('new-bank-type').value.trim(); if (!v) return; if (state.bankTypes.indexOf(v) !== -1) return; state.bankTypes.push(v); saveState('bankTypes'); document.getElementById('new-bank-type').value = ''; renderChips('bank-types-list', state.bankTypes, 'bankTypes'); });
    document.getElementById('add-cash-type').addEventListener('click', function() { var v = document.getElementById('new-cash-type').value.trim(); if (!v) return; if (state.cashTypes.indexOf(v) !== -1) return; state.cashTypes.push(v); saveState('cashTypes'); document.getElementById('new-cash-type').value = ''; renderChips('cash-types-list', state.cashTypes, 'cashTypes'); });
    document.getElementById('save-fiscal').addEventListener('click', function() { var id = document.getElementById('fiscal-id').value; var t = document.getElementById('fiscal-title').value.trim();
        var f = normalizeDigits(document.getElementById('fiscal-from').value.trim()); var to = normalizeDigits(document.getElementById('fiscal-to').value.trim());
        if (!t || !f || !to) { alert('همه را پر کن.'); return; }
        var l = DB.load('fiscalPeriods', []);
        if (id) { var p = l.find(function(x) { return x.id === id; }); if (p) { p.title = t; p.from = f; p.to = to; } }
        else { var nid = uid(); l.push({ id: nid, title: t, from: f, to: to }); if (!state.activePeriodId) { state.activePeriodId = nid; saveState('activePeriodId'); } }
        DB.save('fiscalPeriods', l); clearFiscalForm(); showToast('✅'); renderFiscalList(); updateTopbarPeriod(); document.querySelector('[data-tab="fiscal-list"]').click(); });
    document.getElementById('new-fiscal').addEventListener('click', clearFiscalForm);
    document.getElementById('save-person').addEventListener('click', function() { var id = document.getElementById('pr-id').value; var f = document.getElementById('pr-first').value.trim();
        if (!f) { alert('نام اجباری.'); return; }
        var o = { id: id || uid(), first: f, last: document.getElementById('pr-last').value.trim(), father: document.getElementById('pr-father').value.trim(), nationalId: normalizeDigits(document.getElementById('pr-national-id').value.trim()), birth: normalizeDigits(document.getElementById('pr-birth').value.trim()), mobile: normalizeDigits(document.getElementById('pr-mobile').value.trim()), phone: normalizeDigits(document.getElementById('pr-phone').value.trim()), email: document.getElementById('pr-email').value.trim(), bankTitle: document.getElementById('pr-bank-title').value.trim(), acc: normalizeDigits(document.getElementById('pr-acc').value.trim()), iban: document.getElementById('pr-iban').value.trim(), card: normalizeDigits(document.getElementById('pr-card').value.trim()), address: document.getElementById('pr-address').value.trim() };
        var l = DB.load('persons', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; } else l.push(o);
        DB.save('persons', l); showToast('✅'); clearPersonForm(); renderPersonsList(); updateHomeWidgets(); document.querySelector('[data-tab="persons-list"]').click(); });
    document.getElementById('new-person').addEventListener('click', clearPersonForm);
    document.getElementById('save-company').addEventListener('click', function() { var id = document.getElementById('co-id').value; var n = document.getElementById('co-name').value.trim();
        if (!n) { alert('نام اجباری.'); return; }
        var o = { id: id || uid(), name: n, phone: normalizeDigits(document.getElementById('co-phone').value.trim()), email: document.getElementById('co-email').value.trim(), address: document.getElementById('co-address').value.trim() };
        var l = DB.load('companies', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; } else l.push(o);
        DB.save('companies', l); showToast('✅'); clearCompanyForm(); renderCompaniesList(); document.querySelector('[data-tab="comp-list"]').click(); });
    document.getElementById('new-company').addEventListener('click', clearCompanyForm);
    document.getElementById('save-ba').addEventListener('click', function() { var id = document.getElementById('ba-id').value; var b = document.getElementById('ba-bank').value.trim();
        if (!b) { alert('نام بانک اجباری.'); return; }
        var oR = normalizeDigits(document.getElementById('ba-order').value.trim()); var o = oR === '' ? null : Number(oR);
        var mb = parseMoney(normalizeDigits(document.getElementById('ba-min-balance').value));
        var o2 = { id: id || uid(), bank: b, type: document.getElementById('ba-type').value, branchCode: normalizeDigits(document.getElementById('ba-branch-code').value.trim()), branchName: document.getElementById('ba-branch-name').value.trim(), account: normalizeDigits(document.getElementById('ba-account').value.trim()), iban: document.getElementById('ba-iban').value.trim(), card: normalizeDigits(document.getElementById('ba-card').value.trim()), order: o, minBalance: mb };
        var l = DB.load('bankAccounts', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o2; } else l.push(o2);
        DB.save('bankAccounts', l); showToast('✅'); clearBAForm(); renderBankAccountsList(); updateHomeWidgets(); document.querySelector('[data-tab="ba-list"]').click(); });
    document.getElementById('new-ba').addEventListener('click', clearBAForm);
    document.getElementById('save-cb').addEventListener('click', function() { var id = document.getElementById('cb-id').value; var t = document.getElementById('cb-title').value.trim();
        if (!t) { alert('عنوان اجباری.'); return; }
        var oR = normalizeDigits(document.getElementById('cb-order').value.trim()); var o = oR === '' ? null : Number(oR);
        var o2 = { id: id || uid(), title: t, type: document.getElementById('cb-type').value, unit: document.getElementById('cb-unit').value.trim(), order: o };
        var l = DB.load('cashBoxes', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o2; } else l.push(o2);
        DB.save('cashBoxes', l); showToast('✅'); clearCBForm(); renderCashBoxesList(); updateHomeWidgets(); document.querySelector('[data-tab="cb-list"]').click(); });
    document.getElementById('new-cb').addEventListener('click', clearCBForm);
    document.getElementById('save-project').addEventListener('click', function() { var id = document.getElementById('pj-id').value; var n = document.getElementById('pj-name').value.trim();
        if (!n) { alert('نام اجباری.'); return; }
        var o = { id: id || uid(), name: n };
        var l = DB.load('projects', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; } else l.push(o);
        DB.save('projects', l); showToast('✅'); document.getElementById('pj-id').value = ''; document.getElementById('pj-name').value = ''; renderProjectsList(); document.querySelector('[data-tab="proj-list"]').click(); });
    document.getElementById('new-project').addEventListener('click', function() { document.getElementById('pj-id').value = ''; document.getElementById('pj-name').value = ''; });
    document.getElementById('est-add-item').addEventListener('click', function() { estimateItems.push({ id: uid(), date: '', amount: 0 }); renderEstimateItems(); });
    document.getElementById('est-auto-gen').addEventListener('click', autoGenerateEstimate);
    document.getElementById('save-est').addEventListener('click', saveEstimate);
    document.getElementById('new-est').addEventListener('click', clearEstForm);
    document.getElementById('load-default-chart').addEventListener('click', loadDefaultChart);
    document.getElementById('add-group').addEventListener('click', function() { openChartForm(null, 1, null); });
    document.getElementById('save-chart').addEventListener('click', function() { var id = document.getElementById('ch-id').value;
        var level = Number(document.getElementById('ch-level').value) || 1;
        var code = normalizeDigits(document.getElementById('ch-code').value.trim()); var name = document.getElementById('ch-name').value.trim();
        if (!code || !name) { alert('کد و عنوان اجباری.'); return; }
        var links = []; var cbs = document.querySelectorAll('#ch-links-box input[type=checkbox]:checked');
        for (var li = 0; li < cbs.length; li++) links.push(cbs[li].value);
        var o = { id: id || uid(), code: code, name: name, parent: document.getElementById('ch-parent').value || '', level: level, cat: document.getElementById('ch-cat').value, nature: document.getElementById('ch-nature').value, links: (level === 3) ? links : [], cfEffect: (level === 3) ? document.getElementById('ch-cf-effect').checked : false, active: document.getElementById('ch-active').checked };
        var l = DB.load('accounts', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; } else l.push(o);
        DB.save('accounts', l); showToast('✅'); document.getElementById('chart-form-card').style.display = 'none';
        renderChartTree('chart-tree', true); document.getElementById('load-default-chart').disabled = true; refreshTemplateSelect(); });
    document.getElementById('cancel-chart').addEventListener('click', function() { document.getElementById('chart-form-card').style.display = 'none'; });
    document.getElementById('add-line').addEventListener('click', function() { voucherLines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' }); renderVoucherLines(); });
    document.getElementById('save-voucher').addEventListener('click', function() { persistVoucher(false); });
    document.getElementById('save-voucher-approve').addEventListener('click', function() { persistVoucher(true); });
    document.getElementById('new-voucher').addEventListener('click', newVoucherForm);
    document.getElementById('v-desc-clear').addEventListener('click', function() { document.getElementById('v-desc').value = ''; document.getElementById('v-desc').focus(); showToast('🧹 شرح سند خالی شد.'); });
    document.getElementById('vl-period-filter').addEventListener('change', renderVoucherList);
    document.getElementById('save-fac').addEventListener('click', function() { var id = document.getElementById('fc-id').value; var name = document.getElementById('fc-name').value.trim();
        if (!name) { alert('نام اجباری.'); return; }
        var init = parseMoney(normalizeDigits(document.getElementById('fc-initial').value)); if (!init) { alert('مبلغ اولیه اجباری.'); return; }
        var tp = currentInstallments.reduce(function(s, x) { return s + (x.status === 'paid' ? Number(x.amount || 0) : 0); }, 0);
        var ap = currentInstallments.length > 0 && currentInstallments.every(function(x) { return x.status === 'paid'; });
        var o = { id: id || uid(), name: name, category: document.getElementById('fc-category').value, bankId: document.getElementById('fc-bank').value, date: normalizeDigits(document.getElementById('fc-date').value), initial: init, paid: tp, installments: currentInstallments, status: ap ? 'settled' : 'active' };
        var l = DB.load('facilities', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; } else l.push(o);
        DB.save('facilities', l); showToast('✅'); clearFacForm(); renderFacilitiesList(); document.querySelector('[data-tab="fac-list"]').click(); updateHomeWidgets(); });
    document.getElementById('new-fac').addEventListener('click', clearFacForm);
    document.getElementById('fac-add-inst').addEventListener('click', function() { currentInstallments.push({ id: uid(), date: '', amount: 0, status: 'registered' }); renderInstallments(); });
    document.getElementById('fac-auto-gen').addEventListener('click', autoGenerateInstallments);
    document.getElementById('fac-save-inst').addEventListener('click', function() { if (!currentFacilityId) { alert('ابتدا ذخیره کن.'); return; }
        var l = DB.load('facilities', []); var idx = -1; for (var i = 0; i < l.length; i++) if (l[i].id === currentFacilityId) { idx = i; break; }
        if (idx === -1) return;
        var tp = currentInstallments.reduce(function(s, x) { return s + (x.status === 'paid' ? Number(x.amount || 0) : 0); }, 0);
        var ap = currentInstallments.length > 0 && currentInstallments.every(function(x) { return x.status === 'paid'; });
        l[idx].installments = JSON.parse(JSON.stringify(currentInstallments)); l[idx].paid = tp; l[idx].status = ap ? 'settled' : 'active';
        DB.save('facilities', l); showToast('✅'); renderFacilitiesList(); updateHomeWidgets(); });
    attachMoneyInput(document.getElementById('fc-initial'), function(v) { renderInstallmentsTotals(); });
    attachMoneyInput(document.getElementById('ba-min-balance'));
    attachMoneyInput(document.getElementById('cfs-amount'));
    attachMoneyInput(document.getElementById('est-total'));
    document.getElementById('cfs-moein').addEventListener('change', onCfsMoeinChange);
    document.getElementById('save-cfs').addEventListener('click', saveCfsSource);
    document.getElementById('new-cfs').addEventListener('click', clearCfsForm);
    document.getElementById('cf-run').addEventListener('click', runCashFlowReport);
    document.getElementById('cf-today').addEventListener('click', function() { var t = todayJalaliStr(); document.getElementById('cf-from').value = t; document.getElementById('cf-to').value = addJalaliDays(t, 30); runCashFlowReport(); });
    document.getElementById('cf-print').addEventListener('click', function() { printHtmlReport('#cf-result', 'وضعیت نقدینگی'); });
    document.getElementById('cf-export').addEventListener('click', function() { exportReportTable('#cf-result', 'cash-flow'); });
    document.getElementById('cfd-run').addEventListener('click', runCashFlowByDescReport);
    document.getElementById('cfd-today').addEventListener('click', function() { var t = todayJalaliStr(); document.getElementById('cfd-from').value = t; document.getElementById('cfd-to').value = addJalaliDays(t, 30); runCashFlowByDescReport(); });
    document.getElementById('cfd-print').addEventListener('click', function() { printHtmlReport('#cfd-result', 'گردش وجه نقد'); });
    document.getElementById('cfd-export').addEventListener('click', function() { exportReportTable('#cfd-result', 'cash-flow-by-desc'); });
    document.getElementById('rr-run').addEventListener('click', runRatesReport);
    document.getElementById('rr-print').addEventListener('click', function() { printHtmlReport('#rr-result', 'گزارش نرخ ارز و طلا'); });
    document.getElementById('rr-export').addEventListener('click', function() { exportReportTable('#rr-result', 'rates'); });
    document.getElementById('live-rates-refresh').addEventListener('click', function() { fetchLiveRates(); });
    document.getElementById('apply-template').addEventListener('click', function() { var id = document.getElementById('v-template').value; if (!id) { alert('الگو انتخاب کن.'); return; } applyTemplate(id); });
    document.getElementById('save-as-template').addEventListener('click', saveVoucherAsTemplate);
    document.getElementById('goto-templates').addEventListener('click', function() { goToPage('templates'); });
    document.getElementById('tpl-add-line').addEventListener('click', function() { templateLines.push({ side: 'debit', account: '', details: {}, desc: '', fixedAmount: 0 }); renderTemplateLines(); });
    document.getElementById('save-tpl').addEventListener('click', function() { var id = document.getElementById('tpl-id').value; var name = document.getElementById('tpl-name').value.trim();
        if (!name) { alert('نام اجباری.'); return; }
        var valid = templateLines.filter(function(l) { return l.account || l.desc; }); if (valid.length === 0) { alert('حداقل یک قلم.'); return; }
        var o = { id: id || uid(), name: name, desc: document.getElementById('tpl-desc').value.trim(), lines: valid.map(function(l) { return { side: l.side, account: l.account || '', details: l.details || {}, desc: l.desc || '', fixedAmount: Number(l.fixedAmount) || 0 }; }) };
        var l = DB.load('voucherTemplates', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; } else l.push(o);
        DB.save('voucherTemplates', l); showToast('✅'); document.getElementById('tpl-id').value = ''; document.getElementById('tpl-name').value = ''; document.getElementById('tpl-desc').value = '';
        templateLines = []; renderTemplateLines(); renderTemplateList(); refreshTemplateSelect(); document.querySelector('[data-tab="tpl-list"]').click(); });
    document.getElementById('new-tpl').addEventListener('click', function() { document.getElementById('tpl-id').value = ''; document.getElementById('tpl-name').value = ''; document.getElementById('tpl-desc').value = ''; templateLines = []; renderTemplateLines(); });
    document.getElementById('tpl-load-defaults').addEventListener('click', function() { var l = DB.load('voucherTemplates', []); var d = getDefaultTemplates(); var added = 0;
        d.forEach(function(x) { if (!l.some(function(y) { return y.name === x.name; })) { l.push(x); added++; } });
        DB.save('voucherTemplates', l); renderTemplateList(); refreshTemplateSelect(); showToast('✅ ' + toFa(added) + ' افزوده شد.'); });
    document.getElementById('add-std-desc').addEventListener('click', function() { var inp = document.getElementById('new-std-desc'); var v = inp.value.trim(); if (!v) return;
        var l = DB.load('standardDescriptions', getDefaultStdDescriptions()); if (l.indexOf(v) !== -1) { alert('قبلاً.'); return; }
        l.push(v); DB.save('standardDescriptions', l); inp.value = ''; renderStdDescChips(); refreshStdDescDatalist(); });
    document.getElementById('ra-run').addEventListener('click', runAccountReport);
    document.getElementById('rt-run').addEventListener('click', runTrialBalance);
    document.getElementById('ri-run').addEventListener('click', runIncompleteReport);
    document.getElementById('rf-run').addEventListener('click', runFacilityReport);
    document.getElementById('rff-run').addEventListener('click', runFacilityFullReport);
    document.getElementById('ra-print').addEventListener('click', function() { printHtmlReport('#ra-result', 'مرور حساب‌ها'); });
    document.getElementById('rt-print').addEventListener('click', function() { printHtmlReport('#rt-result', 'تراز آزمایشی'); });
    document.getElementById('ri-print').addEventListener('click', function() { printHtmlReport('#ri-result', 'تراکنش‌های تکمیل نشده'); });
    document.getElementById('rf-print').addEventListener('click', function() { printHtmlReport('#rf-result', 'خلاصه تسهیلات'); });
    document.getElementById('rff-print').addEventListener('click', function() { printHtmlReport('#rff-result', 'گزارش جامع تسهیلات'); });
    document.getElementById('ra-export').addEventListener('click', function() { exportReportTable('#ra-result', 'account-report'); });
    document.getElementById('rt-export').addEventListener('click', function() { exportReportTable('#rt-result', 'trial-balance'); });
    document.getElementById('ri-export').addEventListener('click', function() { exportReportTable('#ri-result', 'incomplete-transactions'); });
    document.getElementById('rf-export').addEventListener('click', function() { exportReportTable('#rf-result', 'facility-summary'); });
    document.getElementById('rff-export').addEventListener('click', function() { exportReportTable('#rff-result', 'facility-full-report'); });
    document.getElementById('rf-category').addEventListener('change', runFacilityReport);
    document.getElementById('rf-status').addEventListener('change', runFacilityReport);
    document.getElementById('rff-category').addEventListener('change', runFacilityFullReport);
    document.getElementById('rff-status').addEventListener('change', runFacilityFullReport);
    document.getElementById('rff-inst-status').addEventListener('change', runFacilityFullReport);
    document.getElementById('rff-bank').addEventListener('change', runFacilityFullReport);
    document.getElementById('rff-search').addEventListener('input', runFacilityFullReport);
    ['rff-from','rff-to'].forEach(function(id) { var el = document.getElementById(id); if (el) el.addEventListener('input', runFacilityFullReport); });
    var rffTabs = document.querySelectorAll('[data-rff-view]');
    for (var ti = 0; ti < rffTabs.length; ti++) rffTabs[ti].addEventListener('click', function() {
        var v = this.getAttribute('data-rff-view'); state.rffView = v; saveState('rffView');
        for (var z = 0; z < rffTabs.length; z++) rffTabs[z].classList.toggle('active', rffTabs[z].getAttribute('data-rff-view') === v);
        runFacilityFullReport(); });
    for (var ti2 = 0; ti2 < rffTabs.length; ti2++) rffTabs[ti2].classList.toggle('active', rffTabs[ti2].getAttribute('data-rff-view') === state.rffView);
    document.getElementById('nt-add-item').addEventListener('click', function() { noteChecklist.push({ id: uid(), text: '', done: false }); renderNoteChecklist(); });
    document.getElementById('nt-save').addEventListener('click', saveNote);
    document.getElementById('nt-new').addEventListener('click', clearNoteForm);
    document.getElementById('nt-cancel').addEventListener('click', function() { clearNoteForm(); document.querySelector('[data-tab="notes-list"]').click(); });
    var ntImgInput = document.getElementById('nt-image-input');
    ntImgInput.addEventListener('click', function(e) { if (window.showOpenFilePicker) { e.preventDefault(); handleNoteImagesFS(); } });
    ntImgInput.addEventListener('change', function() { if (!window.showOpenFilePicker && this.files && this.files.length) { handleNoteImages(this.files); } this.value = ''; });
    updateDateDisplay(); updateTopbarPeriod(); updateHomeWidgets(); updateEyeButtons();
    setInterval(function() { updateDateDisplay(); updateTopbarPeriod(); }, 60000);
    newVoucherForm(); attachDatePickers();
    buildHeaderButtons();
    makeAllTablesResizable();
    checkClipboardSupport();
    clearNoteForm();
    initSidebarSearch();
    initHomeSwipe();
    initCalculator();
    makeCardCollapsible(document.getElementById('voucher-template-card'), 'voucher-template-card', true);
    makeCardCollapsible(document.getElementById('voucher-head-card'), 'voucher-head-card', true);
    setTimeout(function() { fetchLiveRates(true); }, 1500);
    setInterval(function() { if (state.widgets.liveRates) fetchLiveRates(true); }, 300000);
    function autoRead() { if (!state.smsAutoRead) return; setTimeout(function() { readClipboardAndAdd(true); }, 700); }
    window.addEventListener('focus', autoRead);
    document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') autoRead(); });
    aiInit(); aiRender();
    renderEstimateItems();
    autoAttachReportHelpers();
    console.log('🎉 ' + APP_NAME + ' v' + APP_VERSION + ' — AI TTS فارسی + تفصیلی‌یاب هوشمند آماده است.');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(function(e) { console.log('SW:', e); }); }

/* ===== AvalAI Credit ===== */
var AVALAI_CREDIT_CACHE = DB.load('avalaiCreditCache', { data: null, ts: 0 });
async function fetchAvalaiCredit() {
    var box = document.getElementById('avalai-credit-result');
    if (!box) return;
    if (!AI.apiKey) { box.innerHTML = '⚠️ کلید API ذخیره نشده.'; return; }
    box.innerHTML = '⏳ در حال دریافت...';
    try {
        var res = await fetch('https://api.avalai.ir/user/v1/credit', { headers: { 'Authorization': 'Bearer ' + AI.apiKey } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var d = await res.json();
        AVALAI_CREDIT_CACHE = { data: d, ts: Date.now() };
        DB.save('avalaiCreditCache', AVALAI_CREDIT_CACHE);
        renderAvalaiCredit(d);
        showToast('✅ اعتبار به‌روز شد.');
    } catch(e) {
        if (AVALAI_CREDIT_CACHE.data) renderAvalaiCredit(AVALAI_CREDIT_CACHE.data);
        else box.innerHTML = '❌ ' + e.message;
    }
}
function renderAvalaiCredit(d) {
    var box = document.getElementById('avalai-credit-result');
    if (!box) return;
    var irt = Number(d.remaining_irt||0), unit = Number(d.remaining_unit||0);
    var total = Number(d.total_unit||0), rate = Number(d.exchange_rate||0), lim = Number(d.limit||0);
    var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    h += '<div class="kpi-card"><div class="kpi-lbl">💰 اعتبار تومانی</div><div class="kpi-val positive">' + formatMoney(irt) + ' تومان</div></div>';
    h += '<div class="kpi-card"><div class="kpi-lbl">🔢 اعتبار واحدی</div><div class="kpi-val">' + toFa(unit.toFixed(4)) + '</div></div>';
    h += '<div class="kpi-card"><div class="kpi-lbl">🏦 مجموع کیف پول</div><div class="kpi-val">' + toFa(total.toFixed(4)) + '</div></div>';
    h += '<div class="kpi-card"><div class="kpi-lbl">📈 نرخ تبدیل</div><div class="kpi-val">' + formatMoney(rate) + '</div></div>';
    h += '<div class="kpi-card" style="grid-column:1/-1"><div class="kpi-lbl">🎯 سقف اعتبار</div><div class="kpi-val">' + (lim > 0 ? formatMoney(lim*rate) + ' تومان' : 'بدون سقف') + '</div></div>';
    h += '</div>';
    box.innerHTML = h;
}
var avalaiRefreshBtn = document.getElementById('avalai-credit-refresh');
if (avalaiRefreshBtn) avalaiRefreshBtn.addEventListener('click', function(e) { e.stopPropagation(); fetchAvalaiCredit(); });
if (AVALAI_CREDIT_CACHE.data) renderAvalaiCredit(AVALAI_CREDIT_CACHE.data);
