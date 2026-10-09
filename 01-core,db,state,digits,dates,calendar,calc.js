/* =====================================================================
   پارسیس v27 — 01-core,db,state,digits,dates,calendar,calc.js
   هسته: ثابت‌ها، State، پایگاه‌داده، ابزارها، تقویم، ماشین‌حساب
   ===================================================================== */
'use strict';

var APP_NAME = 'پارسیس';
var APP_VERSION = '27.01.01';
var LS_PREFIX = 'parsis.';

/* ==================== DB ==================== */
var DB = {
    load: function(k, f) {
        try { var r = localStorage.getItem(LS_PREFIX + k); return r ? JSON.parse(r) : f; }
        catch(e) { return f; }
    },
    save: function(k, v) {
        try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); } catch(e) {}
    }
};

/* ==================== Toast ==================== */
var _toastTimer = null;
function showToast(msg, ms) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(function() { t.classList.add('show'); });
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function() { t.classList.remove('show'); }, ms || 3000);
}

/* ==================== State ==================== */
var state = {
    theme: DB.load('theme', 'sky'),
    language: DB.load('language', 'fa'),
    font: DB.load('font', 'tahoma'),
    currency: DB.load('currency', 'rial'),
    currencyDisplay: DB.load('currencyDisplay', 'rial'),
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

/* نرمال‌سازی auto state */
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

/* ==================== Migrations ==================== */
(function() {
    var accounts = DB.load('accounts', []);
    var changed = false;
    for (var i = 0; i < accounts.length; i++) {
        if (accounts[i].link && !accounts[i].links) { accounts[i].links = [accounts[i].link]; delete accounts[i].link; changed = true; }
        else if (!accounts[i].links) { accounts[i].links = []; changed = true; }
        if (typeof accounts[i].cfEffect === 'undefined') { accounts[i].cfEffect = false; changed = true; }
    }
    if (changed) DB.save('accounts', accounts);
    var notes = DB.load('notes', []);
    var nch = false;
    for (var ni = 0; ni < notes.length; ni++) {
        if (typeof notes[ni].archived === 'undefined') { notes[ni].archived = false; nch = true; }
    }
    if (nch) DB.save('notes', notes);
})();

/* ==================== Hide/Show helpers ==================== */
function getHideState(key) {
    if (!key) return state.hideNumbers;
    var v = state.reportHide[key];
    if (typeof v === 'boolean') return v;
    return state.hideNumbers;
}
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

/* ==================== اعداد و ارقام فارسی ==================== */
function toFa(x) { if (x === undefined || x === null) return ''; return String(x).replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
function toFaSimple(x) { return String(x).replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
function normalizeDigits(s) {
    if (s === undefined || s === null) return ''; s = String(s);
    s = s.replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
    s = s.replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); });
    s = s.replace(/\u066B/g, '.'); s = s.replace(/\u060C/g, ','); s = s.replace(/\u066C/g, ',');
    return s;
}
function pad2(n) { return String(n).length < 2 ? '0' + n : String(n); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatRaw(n) { n = Number(n) || 0; return Math.round(n).toLocaleString('fa-IR').replace(/\u066C/g, ','); }
function formatMoney(n) {
    n = Number(n) || 0; var mode = state.currencyDisplay || 'rial';
    if (mode === 'toman') return formatRaw(n / 10);
    if (mode === 'million') { var v = n / 1000000; return v.toLocaleString('fa-IR', { maximumFractionDigits: 3 }).replace(/\u066C/g, ','); }
    return formatRaw(n);
}
function formatRial(n) { n = Number(n) || 0; return formatRaw(n); }
function currencyLabel() {
    var m = state.currencyDisplay || 'rial';
    if (m === 'toman') return 'تومان';
    if (m === 'million') return 'میلیون ریال';
    return 'ریال';
}
function parseMoney(s) { var t = String(s).replace(/[^\d\-]/g, ''); return Number(t) || 0; }

/* ==================== تاریخ شمسی / میلادی ==================== */
var JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
var GREG_MONTHS = ['ژانویه','فوریه','مارس','آپریل','مه','ژوئن','جولای','آگوست','سپتامبر','اکتبر','نوامبر','دسامبر'];
var WEEKDAYS_FA = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];

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
function todayJalaliStr() { var d = new Date(); var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]); }
function jalaliDiff(y1, m1, d1, y2, m2, d2) {
    var g1 = jalaliToGregorian(y1, m1, d1);
    var g2 = jalaliToGregorian(y2, m2, d2);
    var date1 = new Date(g1[0], g1[1] - 1, g1[2]);
    var date2 = new Date(g2[0], g2[1] - 1, g2[2]);
    return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
}
function addJalaliDays(dateStr, days) {
    if (!dateStr) return '';
    var p = normalizeDigits(dateStr).split('/').map(Number);
    if (p.length !== 3) return '';
    var g = jalaliToGregorian(p[0], p[1], p[2]);
    var dt = new Date(g[0], g[1] - 1, g[2]);
    dt.setDate(dt.getDate() + days);
    var j = toJalali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    return j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]);
}
function tsToJalaliDate(ts) { var d = new Date(ts); var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]); }
function tsToJalaliTime(ts) { var d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function getJalaliMonthName(m) { return JALALI_MONTHS[m - 1] || ''; }

function updateDateDisplay() {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var el1 = document.getElementById('date-jalali'), el2 = document.getElementById('date-gregorian');
    if (el1) el1.textContent = WEEKDAYS_FA[d.getDay()] + ' ' + toFa(j[2]) + ' ' + JALALI_MONTHS[j[1] - 1] + ' ' + toFa(j[0]);
    if (el2) el2.textContent = GREG_MONTHS[d.getMonth()] + ' ' + toFa(d.getDate()) + '، ' + toFa(d.getFullYear());
}

/* ==================== تقویم شمسی ==================== */
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
function pickDay(d) {
    if (calTarget) {
        calTarget.value = calCursorY + '/' + pad2(calCursorM) + '/' + pad2(d);
        calTarget.dispatchEvent(new Event('input', { bubbles: true }));
    }
    closeCalendar();
}
function closeCalendar() {
    document.getElementById('cal-overlay').classList.remove('show');
    document.getElementById('cal-popup').classList.remove('show');
    calTarget = null; calYearMode = false;
}
function initCalendarListeners() {
    document.getElementById('cal-prev').addEventListener('click', function() {
        if (calYearMode) { calYearStart -= 12; renderCalendar(); return; }
        calCursorM--;
        if (calCursorM < 1) { calCursorM = 12; calCursorY--; }
        calSelectedD = 0;
        renderCalendar();
    });
    document.getElementById('cal-next').addEventListener('click', function() {
        if (calYearMode) { calYearStart += 12; renderCalendar(); return; }
        calCursorM++;
        if (calCursorM > 12) { calCursorM = 1; calCursorY++; }
        calSelectedD = 0;
        renderCalendar();
    });
    document.getElementById('cal-title').addEventListener('click', function() {
        calYearMode = !calYearMode;
        calYearStart = Math.floor(calCursorY / 12) * 12;
        renderCalendar();
    });
    document.getElementById('cal-today').addEventListener('click', function() {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        calCursorY = t[0]; calCursorM = t[1]; calSelectedD = t[2];
        calYearMode = false;
        renderCalendar();
    });
    document.getElementById('cal-close').addEventListener('click', closeCalendar);
    document.getElementById('cal-overlay').addEventListener('click', closeCalendar);
}

/* ==================== ماشین حساب ==================== */
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
    try {
        var expr = calcExpr.replace(/[^0-9+\-*/().]/g, '');
        if (!expr) return 0;
        var result = Function('"use strict";return (' + expr + ')')();
        if (!isFinite(result)) return 0;
        return Math.round(result);
    } catch(e) { return 0; }
}
function calcButtonPress(key) {
    if (key === 'C') { calcExpr = '0'; }
    else if (key === '←') { calcExpr = calcExpr.length > 1 ? calcExpr.slice(0, -1) : '0'; }
    else if (key === '=') { var r = calcEval(); calcExpr = String(r); }
    else if (['+','-','*','/'].indexOf(key) !== -1) {
        var lastChar = calcExpr.slice(-1);
        if (['+','-','*','/'].indexOf(lastChar) !== -1) calcExpr = calcExpr.slice(0, -1) + key;
        else calcExpr += key;
    }
    else if (key === '.') {
        var parts = calcExpr.split(/[+\-*/]/);
        var lastPart = parts[parts.length - 1];
        if (lastPart.indexOf('.') === -1) calcExpr += '.';
    }
    else if (/^\d$/.test(key)) { if (calcExpr === '0') calcExpr = key; else calcExpr += key; }
    updateCalcDisplay();
}
function calcClose() {
    document.getElementById('calc-popup').classList.remove('show');
    document.getElementById('calc-overlay').classList.remove('show');
    calcTarget = null;
}
function initCalculator() {
    var box = document.getElementById('calc-buttons');
    var keys = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','←','C'];
    box.innerHTML = '';
    keys.forEach(function(k) {
        var b = document.createElement('button');
        b.type = 'button';
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
        if (calcTarget && calcTarget.get && calcTarget.set) {
            var cur = Number(calcTarget.get()) || 0;
            calcTarget.set(cur + r);
            showToast('➕ افزوده شد: ' + formatRaw(r));
        }
        calcClose();
    });
    document.getElementById('calc-clear').addEventListener('click', function() { calcExpr = '0'; updateCalcDisplay(); });
}

/* ==================== Date pickers ==================== */
function attachDatePickers() {
    var els = document.querySelectorAll('.date-picker');
    for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.dataset.picker === '1') continue;
        el.dataset.picker = '1';
        if (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('date-wrap')) continue;
        try {
            var wrap = document.createElement('div'); wrap.className = 'date-wrap';
            el.parentNode.insertBefore(wrap, el); wrap.appendChild(el);
            var btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'cal-btn'; btn.innerHTML = '📅'; btn.title = 'باز کردن تقویم';
            (function(inp) { btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); openCalendar(inp); }); })(el);
            wrap.appendChild(btn);
        } catch(err) {}
    }
}

/* ==================== Money input binding ==================== */
function attachMoneyInput(el, setter) {
    if (!el || el.dataset.money) return;
    el.dataset.money = '1';
    el.addEventListener('input', function() {
        var val = normalizeDigits(el.value);
        var neg = val.trim().charAt(0) === '-';
        var raw = val.replace(/[^\d]/g, '');
        el.value = (neg ? '-' : '') + raw;
        var v = Number(raw) || 0;
        if (setter) setter(neg ? -v : v);
    });
    el.addEventListener('blur', function() {
        var val = normalizeDigits(el.value);
        var neg = val.trim().charAt(0) === '-';
        var raw = val.replace(/[^\d]/g, '');
        var v = Number(raw) || 0;
        el.value = (neg && v ? '-' : '') + (v ? formatRaw(v) : '');
        if (setter) setter(neg ? -v : v);
    });
}

/* ==================== Label helpers ==================== */
function voucherTypeName(t) {
    if (t === 'general') return 'عمومی';
    if (t === 'opening') return 'افتتاحیه';
    if (t === 'establishment') return 'افتتاحیه استقرار';
    if (t === 'closing') return 'بستن حساب';
    if (t === 'final') return 'اختتامیه';
    return t || 'عمومی';
}
function categoryName(c) {
    if (c === 'facility') return 'تسهیلات';
    if (c === 'scheduled') return 'زمانبندی شده';
    return c || '—';
}
function linkTypeName(t) {
    if (t === 'person') return 'اشخاص';
    if (t === 'company') return 'شرکت‌ها';
    if (t === 'bank') return 'بانکی';
    if (t === 'cashbox') return 'صندوق';
    if (t === 'project') return 'پروژه';
    if (t === 'facility') return 'تسهیلات';
    return '';
}

/* ==================== Lookups ==================== */
function getAccountLabel(accId, accounts) {
    if (!accounts) accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === accId; });
    if (!acc) return '';
    if (!acc.parent) return acc.name;
    var parent = accounts.find(function(a) { return a.id === acc.parent; });
    if (!parent) return acc.name;
    return parent.name + ' - ' + acc.name;
}
function getAccountSearchText(accId, accounts) {
    if (!accounts) accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === accId; });
    if (!acc) return '';
    var parts = [acc.code || '', acc.name || ''];
    if (acc.parent) {
        var p = accounts.find(function(a) { return a.id === acc.parent; });
        if (p) { parts.push(p.code || ''); parts.push(p.name || ''); }
    }
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
    if (type === 'person') return DB.load('persons', []);
    if (type === 'company') return DB.load('companies', []);
    if (type === 'bank') return DB.load('bankAccounts', []);
    if (type === 'cashbox') return DB.load('cashBoxes', []);
    if (type === 'project') return DB.load('projects', []);
    if (type === 'facility') return DB.load('facilities', []);
    return [];
}
function getLinkedItemLabel(type, item) {
    if (type === 'person') return (item.first || '') + ' ' + (item.last || '');
    if (type === 'company') return item.name || '';
    if (type === 'bank') return (item.bank || '') + ' - ' + (item.account || '');
    if (type === 'cashbox') return item.title || '';
    if (type === 'project') return item.name || '';
    if (type === 'facility') {
        var bank = DB.load('bankAccounts', []).find(function(b) { return b.id === item.bankId; });
        return item.name + (bank ? ' — ' + bank.bank : '');
    }
    return '';
}
function getBankMoeinId() {
    var accounts = DB.load('accounts', []);
    var m = accounts.find(function(a) { return a.links && a.links.indexOf('bank') !== -1; });
    return m ? m.id : '';
}
function getLeafAccounts() {
    var accounts = DB.load('accounts', []);
    return accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
}
function buildOptionsInto(sel, items, labelFn, selectedId, placeholder) {
    sel.innerHTML = '';
    var ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholder || '—'; sel.appendChild(ph);
    for (var i = 0; i < items.length; i++) {
        var o = document.createElement('option');
        o.value = items[i].id;
        o.textContent = labelFn(items[i]);
        if (selectedId === items[i].id) o.selected = true;
        sel.appendChild(o);
    }
}

/* ==================== Print helpers ==================== */
function getPrintFontFamily() {
    return state.font === 'bnazanin' ? "'B Nazanin',Tahoma,sans-serif" :
           state.font === 'bsans' ? "'B Sans',Tahoma,sans-serif" : 'Tahoma,sans-serif';
}
function cleanOuterHtml(el) {
    var c = el.cloneNode(true);
    var grips = c.querySelectorAll('.col-resizer');
    for (var i = 0; i < grips.length; i++) grips[i].parentNode.removeChild(grips[i]);
    return c.outerHTML;
}
function buildPrintCss(numCols) {
    numCols = numCols || 6;
    var ff = getPrintFontFamily();
    var orientation = numCols > 8 ? 'landscape' : 'portrait';
    var fontSize = numCols > 12 ? 7 : (numCols > 9 ? 8 : (numCols > 6 ? 9 : 10));
    return '@page { size: A4 ' + orientation + '; margin: 6mm 5mm 8mm 5mm; } body { font-family:' + ff + '; padding:0; margin:0; color:#222; direction:rtl; font-size:' + fontSize + 'px; } table { width:100%; border-collapse:collapse; font-size:' + fontSize + 'px; } th, td { border:1px solid #999; padding:3px 5px; } th { background:#e6f0fa; } .num { text-align:center; } .dr { color:#c0392b; } .cr { color:#1e9e6a; }';
}
function printHtmlReport(selector, title) {
    var el = document.querySelector(selector);
    if (!el) { alert('ابتدا گزارش را اجرا کن.'); return; }
    var win = window.open('', '_blank');
    if (!win) { alert('پنجره چاپ باز نشد.'); return; }
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>' + esc(title) + '</title><style>' + buildPrintCss(8) + '</style></head><body><h2 style="text-align:center">' + esc(title) + '</h2>' + cleanOuterHtml(el) + '</body></html>');
    win.document.close();
    setTimeout(function() { win.focus(); win.print(); }, 400);
}

/* ==================== CSV export ==================== */
function exportToCsv(key, filename) {
    var data = DB.load(key, []);
    if (!Array.isArray(data)) data = [];
    if (data.length === 0) { alert('داده‌ای نیست.'); return; }
    var keys = [];
    data.forEach(function(row) { Object.keys(row).forEach(function(k) { if (keys.indexOf(k) === -1) keys.push(k); }); });
    var lines = [keys.join(',')];
    data.forEach(function(row) {
        lines.push(keys.map(function(k) {
            var v = row[k];
            if (v === null || v === undefined) v = '';
            if (typeof v === 'object') v = JSON.stringify(v);
            v = String(v).replace(/"/g, '""');
            return '"' + v + '"';
        }).join(','));
    });
    var csv = '\uFEFF' + lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var now = new Date();
    var dateStr = todayJalaliStr().replace(/\//g, '-');
    var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
    var a = document.createElement('a');
    a.href = url;
    a.download = filename + '-' + dateStr + '_' + timeStr + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}
function exportReportTable(selector, filename) {
    var el = document.querySelector(selector);
    if (!el) { alert('ابتدا گزارش را اجرا کن.'); return; }
    var table = el.querySelector('table');
    var detailList = el.querySelector('.rff-detail-list');
    var rows = [];
    if (detailList) {
        rows.push(['گزارش جامع تسهیلات — جزئیات']); rows.push([]);
        var cards = detailList.querySelectorAll('.rff-fac-card');
        for (var c = 0; c < cards.length; c++) {
            var card = cards[c];
            var title = card.querySelector('.rff-fac-title');
            rows.push(['عنوان تسهیلات:', title ? title.textContent.trim() : '']);
            var tbl = card.querySelector('.rff-inst-table');
            if (tbl) {
                var trs = tbl.querySelectorAll('tr');
                for (var t = 0; t < trs.length; t++) {
                    var cells = trs[t].querySelectorAll('th, td');
                    var rr = [];
                    for (var cc = 0; cc < cells.length; cc++) rr.push(cells[cc].textContent.trim());
                    rows.push(rr);
                }
            }
            rows.push([]);
        }
    } else if (table) {
        var trs2 = table.querySelectorAll('tr');
        for (var i = 0; i < trs2.length; i++) {
            var cells2 = trs2[i].querySelectorAll('th, td');
            var row2 = [];
            for (var j = 0; j < cells2.length; j++) {
                if (cells2[j].style.display === 'none') continue;
                row2.push(String(cells2[j].textContent || '').trim());
            }
            if (row2.length > 0) rows.push(row2);
        }
    } else { alert('ابتدا گزارش را اجرا کن.'); return; }
    if (rows.length === 0) { alert('داده‌ای برای خروجی نیست.'); return; }
    var lines = [];
    for (var r = 0; r < rows.length; r++) {
        lines.push(rows[r].map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','));
    }
    var csv = '\uFEFF' + lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var now = new Date();
    var dateStr = todayJalaliStr().replace(/\//g, '-');
    var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
    var a = document.createElement('a');
    a.href = url;
    a.download = filename + '-' + dateStr + '_' + timeStr + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}
