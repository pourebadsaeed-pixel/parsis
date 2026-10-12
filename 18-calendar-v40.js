/* =====================================================================
   پارسیس v41 — 18-calendar-v40.js
   پچ جامع تقویم، دسته‌بندی، اعلان، ساعت، تکرار و رفع باگ‌ها
   ===================================================================== */
'use strict';

/* ═══════════════════════════════════════════════════════════════
   ۱) رفع نرخ طلای دسته دوم (ضریب اشتباه در API)
   ═══════════════════════════════════════════════════════════════ */
(function fixGoldMiniSize() {
    setTimeout(function () {
        if (typeof RATE_ASSETS !== 'undefined' && Array.isArray(RATE_ASSETS)) {
            RATE_ASSETS.forEach(function (a) {
                if (a.key === 'gold_mini_size') {
                    a.priceto = 'gold-18';
                    a.navasanKey = '18ayar';
                    a.navasanMul = 10;
                    a.label = '🥇 طلای دسته دوم (گرم)';
                }
            });
        }
        try {
            var c = DB.load('liveRatesCache', null);
            if (c && c.values) { c.values.gold_mini_size = 0; DB.save('liveRatesCache', c); }
        } catch (e) {}
    }, 500);
})();

/* ═══════════════════════════════════════════════════════════════
   ۲) باکس‌های اعتبار AvalAI بزرگ‌تر
   ═══════════════════════════════════════════════════════════════ */
(function cssCreditBoxes() {
    if (document.getElementById('avalai-credit-style')) return;
    var s = document.createElement('style');
    s.id = 'avalai-credit-style';
    s.textContent = ''
      + '#avalai-credit-result{display:grid!important;grid-template-columns:1fr 1fr!important;gap:14px!important}'
      + '#avalai-credit-result .kpi-card{min-height:110px!important;padding:16px 14px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important}'
      + '#avalai-credit-result .kpi-card .kpi-lbl{font-size:.8rem!important;margin-bottom:10px!important}'
      + '#avalai-credit-result .kpi-card .kpi-val{font-size:1.25rem!important;font-weight:900!important;word-break:break-all!important;line-height:1.3!important}'
      + '@media(max-width:520px){#avalai-credit-result{grid-template-columns:1fr!important}}';
    document.head.appendChild(s);
})();

/* ═══════════════════════════════════════════════════════════════
   ۳) دسته‌بندی‌های قابل ویرایش (CRUD)
   ═══════════════════════════════════════════════════════════════ */
var DEF_CATS = [
    { key: 'personal', label: 'شخصی', color: '#8b5cf6', icon: '⭐' },
    { key: 'work',     label: 'کاری', color: '#0ea5e9', icon: '💼' },
    { key: 'birthday', label: 'تولد', color: '#ec4899', icon: '🎂' },
    { key: 'meeting',  label: 'جلسه', color: '#f59e0b', icon: '👥' },
    { key: 'travel',   label: 'سفر',  color: '#10b981', icon: '✈️' }
];
var SYS_CATS = {
    installment: { label: 'قسط',     color: '#dc2626', icon: '💳' },
    source:      { label: 'دریافتنی', color: '#10b981', icon: '📥' },
    external:    { label: 'خارجی',   color: '#64748b', icon: '🌐' }
};
function uCats() {
    var l = DB.load('cal.userCats', null);
    if (!l || !l.length) { DB.save('cal.userCats', DEF_CATS); return DEF_CATS.slice(); }
    return l;
}
function sUCats(l) { DB.save('cal.userCats', l); }

Object.defineProperty(window, 'CAL_CATS', {
    get: function () {
        var c = Object.assign({}, SYS_CATS);
        uCats().forEach(function (u) { c[u.key] = u; });
        return c;
    }, configurable: true
});

window.openCategoriesManager = function () {
    var old = document.getElementById('cat-mgr-modal'); if (old) old.remove();
    var oldO = document.getElementById('cat-mgr-overlay'); if (oldO) oldO.remove();
    document.body.insertAdjacentHTML('beforeend',
        '<div id="cat-mgr-overlay" class="overlay show" style="z-index:880"></div>'
      + '<div id="cat-mgr-modal" class="modal show" style="max-width:520px;z-index:885">'
      +   '<div class="modal-head"><h2>🎨 مدیریت دسته‌بندی‌ها</h2><button id="cat-mgr-close" class="close-btn">×</button></div>'
      +   '<div class="modal-body" id="cat-mgr-body"></div>'
      +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">'
      +     '<button id="cat-mgr-cancel" class="btn-secondary">انصراف</button>'
      +     '<button id="cat-mgr-save" class="btn-primary">💾 ذخیره</button>'
      +   '</div></div>');
    var cur = uCats().slice();
    function rb() {
        var h = '<div style="display:flex;flex-direction:column;gap:10px">';
        cur.forEach(function (c, i) {
            h += '<div style="display:flex;gap:8px;align-items:center;padding:10px;background:var(--card-alt);border-radius:10px;border:1px solid var(--border)">'
               + '<input type="color" value="' + c.color + '" data-i="' + i + '" data-f="color" style="width:44px;height:40px;border:none;background:none;cursor:pointer;padding:0">'
               + '<input type="text" value="' + esc(c.icon) + '" data-i="' + i + '" data-f="icon" style="width:54px;padding:8px;text-align:center;font-size:1.15rem;border:1px solid var(--border);border-radius:8px;background:#fff;font-family:inherit">'
               + '<input type="text" value="' + esc(c.label) + '" data-i="' + i + '" data-f="label" style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:#fff;font-family:inherit;font-weight:700;font-size:.85rem">'
               + '<button class="cd" data-i="' + i + '" style="background:#fee2e2;color:#dc2626;border:none;width:38px;height:38px;border-radius:9px;font-size:1.2rem;cursor:pointer;font-weight:800">×</button>'
               + '</div>';
        });
        h += '</div><button id="cat-mgr-add" style="width:100%;margin-top:12px;padding:12px;background:var(--primary-soft);color:var(--primary-dark);border:1.5px dashed var(--primary);border-radius:11px;font-family:inherit;font-weight:800;cursor:pointer;font-size:.88rem">+ افزودن دسته‌بندی جدید</button>';
        document.getElementById('cat-mgr-body').innerHTML = h;
        var b = document.getElementById('cat-mgr-body');
        b.querySelectorAll('input[data-f]').forEach(function (x) {
            x.addEventListener('input', function () {
                var i = +this.getAttribute('data-i'); var f = this.getAttribute('data-f');
                if (cur[i]) cur[i][f] = this.value;
            });
        });
        b.querySelectorAll('.cd').forEach(function (x) {
            x.addEventListener('click', function () {
                var i = +this.getAttribute('data-i');
                if (cur.length <= 1) { alert('حداقل یک دسته باید بماند.'); return; }
                if (!confirm('حذف شود؟')) return;
                cur.splice(i, 1); rb();
            });
        });
        document.getElementById('cat-mgr-add').onclick = function () {
            cur.push({ key: 'cat_' + Date.now(), label: 'دسته جدید', color: '#6366f1', icon: '📌' });
            rb();
        };
    }
    rb();
    function close() {
        var o = document.getElementById('cat-mgr-overlay'); if (o) o.remove();
        var m = document.getElementById('cat-mgr-modal'); if (m) m.remove();
    }
    document.getElementById('cat-mgr-close').onclick = close;
    document.getElementById('cat-mgr-cancel').onclick = close;
    document.getElementById('cat-mgr-overlay').onclick = close;
    document.getElementById('cat-mgr-save').onclick = function () {
        for (var i = 0; i < cur.length; i++) if (!cur[i].label.trim()) { alert('عنوان خالی است.'); return; }
        sUCats(cur); close();
        if (typeof showToast === 'function') showToast('✅ ذخیره شد');
        if (typeof calRender === 'function') calRender();
    };
};

/* ═══════════════════════════════════════════════════════════════
   ۴) تبدیل ساعت به ارقام فارسی
   ═══════════════════════════════════════════════════════════════ */
window.toFaTime = function (hhmm) {
    if (!hhmm) return '';
    return String(hhmm).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
};
window.toEnTime = function (faHHMM) {
    return String(faHHMM || '').replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
};

/* ═══════════════════════════════════════════════════════════════
   ۵) STATE تقویم
   ═══════════════════════════════════════════════════════════════ */
var CAL41 = {
    view: 'month',           // month | week | 3day | day | agenda
    cursor: null,
    filterCats: {},
    colWidths: DB.load('cal41.colWidths', {}),
    externalEvents: [],
    userEvents: []
};
(function initCursor() {
    var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    CAL41.cursor = { y: t[0], m: t[1], d: t[2] };
    if (typeof _cal !== 'undefined') _cal.cursor = CAL41.cursor;
})();

/* ═══════════════════════════════════════════════════════════════
   ۶) مدل رویداد + بسط تکرار
   ═══════════════════════════════════════════════════════════════ */
function calLoadUserEvents() { return DB.load('calendarUserEvents', []); }
function calSaveUserEvents(l) { DB.save('calendarUserEvents', l); }

function mapEvent(u, date, time) {
    var endD = date, endT = time;
    if (u.endDate && u.startDate) {
        var g1 = jalaliToGregorian.apply(null, date.split('/').map(Number));
        var g2 = jalaliToGregorian.apply(null, u.startDate.split('/').map(Number));
        var diff = Math.round((new Date(g1[0], g1[1] - 1, g1[2]) - new Date(g2[0], g2[1] - 1, g2[2])) / 86400000);
        endD = addJalaliDays(u.endDate, diff);
        endT = u.endTime || time;
    }
    return {
        id: u.id + '_' + date + '_' + time,
        rawId: u.id,
        cat: u.cat,
        date: date, time: time,
        startDate: date, startTime: time,
        endDate: endD, endTime: endT,
        title: u.title,
        sub: u.desc || '',
        desc: u.desc || '',
        location: u.location || '',
        persons: u.persons || [],
        reminder: u.reminder || 0,
        recurrence: u.recurrence,
        readonly: false
    };
}

function expandRecurrence(u) {
    var out = [];
    var start = u.startDate || u.date;
    if (!start) return out;
    var rec = u.recurrence;
    if (!rec || rec.type === 'none') {
        out.push(mapEvent(u, start, u.startTime || u.time || '21:00'));
        return out;
    }
    var step = Math.max(1, rec.interval || 1);
    var count = Math.min(rec.count || 60, 120);
    var until = rec.until || null;
    var unit = rec.type;
    if (unit === 'custom') unit = rec.customUnit || 'day';

    for (var i = 0; i < count; i++) {
        var off = 0;
        if (unit === 'day')      off = i * step;
        else if (unit === 'week')  off = i * 7 * step;
        else if (unit === 'month') off = i * 30 * step;
        else if (unit === 'year')  off = i * 365 * step;
        var newD = addJalaliDays(start, off);
        if (!newD) break;
        if (until && newD > until) break;
        out.push(mapEvent(u, newD, u.startTime || u.time || '21:00'));
    }
    return out;
}

/* ═══════════════════════════════════════════════════════════════
   ۷) ساخت همه رویدادها (بدون اسناد و یادداشت‌ها)
   ═══════════════════════════════════════════════════════════════ */
window.calBuildAllEvents = function () {
    var evs = [];
    // اقساط
    DB.load('facilities', []).forEach(function (f) {
        (f.installments || []).forEach(function (ins, i) {
            if (!ins.date) return;
            var t = ins.time || '21:00';
            evs.push({
                id: 'i_' + f.id + '_' + i, cat: 'installment',
                date: ins.date, time: t,
                startDate: ins.date, startTime: t,
                endDate: ins.date, endTime: t,
                title: (ins.status === 'paid' ? '✅ ' : '⏰ ') + 'قسط ' + f.name,
                sub: ins.status === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده',
                amount: +ins.amount || 0, ref: f.id, readonly: true
            });
        });
    });
    // منابع دریافتنی
    DB.load('cashFlowSources', []).forEach(function (s) {
        if (!s.expectedDate) return;
        var t = s.time || '21:00';
        evs.push({
            id: 's_' + s.id, cat: 'source',
            date: s.expectedDate, time: t,
            startDate: s.expectedDate, startTime: t,
            endDate: s.expectedDate, endTime: t,
            title: '📥 ' + getSourceLabel(s),
            sub: s.notes || '',
            amount: +s.amount || 0, ref: s.id, readonly: true
        });
    });
    // رویدادهای کاربر
    calLoadUserEvents().forEach(function (u) {
        expandRecurrence(u).forEach(function (e) { evs.push(e); });
    });
    // رویدادهای خارجی
    if (Array.isArray(CAL41.externalEvents)) {
        CAL41.externalEvents.forEach(function (e) { evs.push(e); });
    }
    return evs;
};

/* ═══════════════════════════════════════════════════════════════
   ۸) بازنویسی کامل رندر تقویم
   ═══════════════════════════════════════════════════════════════ */
window.calRender = function () {
    var page = document.getElementById('page-jalali-calendar');
    if (!page) {
        // ساخت صفحه اگر نبود
        if (typeof calEnsurePage === 'function') calEnsurePage();
        page = document.getElementById('page-jalali-calendar');
        if (!page) return;
    }
    if (!CAL41.cursor || isNaN(CAL41.cursor.y)) {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        CAL41.cursor = { y: t[0], m: t[1], d: t[2] };
    }
    var all = calBuildAllEvents();
    var active = all.filter(function (e) { return CAL41.filterCats[e.cat] !== false; });

    var html = '<h2>📅 تقویم شمسی</h2><div class="calg-wrap">';

    // نوار ابزار بالا
    html += '<div class="calg-bar">';
    html += '<button class="calg-btn" id="calg-prev">‹</button>';
    html += '<h3 id="calg-titledate" style="flex:1;text-align:center">—</h3>';
    html += '<button class="calg-btn" id="calg-today">امروز</button>';
    html += '<button class="calg-btn" id="calg-next">›</button>';
    html += '<button class="calg-btn" id="calg-cat-mgr" title="مدیریت دسته‌بندی" style="font-size:1.05rem">🎨</button>';
    html += '<button class="calg-btn primary" id="calg-new">＋ رویداد</button>';
    html += '</div>';

    // تب‌ها
    html += '<div class="calg-tabs">';
    [['month','ماه'],['week','هفته'],['3day','۳ روز آتی'],['day','روز'],['agenda','دستورکار']].forEach(function (x) {
        html += '<button class="calg-tab' + (CAL41.view === x[0] ? ' active' : '') + '" data-view="' + x[0] + '">' + x[1] + '</button>';
    });
    html += '</div>';

    // محتوا
    html += '<div class="calg-body" id="calg-body">';
    if (CAL41.view === 'month')      html += calRenderMonth41(active);
    else if (CAL41.view === 'week')  html += calRenderWeek41(active);
    else if (CAL41.view === '3day')  html += calRender3Day41(active);
    else if (CAL41.view === 'day')   html += calRenderDay41(active);
    else                              html += calRenderAgenda41(active);
    html += '</div>';

    // Legend
    html += '<div class="calg-legend">';
    var cats = window.CAL_CATS;
    Object.keys(cats).forEach(function (k) {
        var c = cats[k];
        if (k === 'external') return; // نمایش به‌صورت پیش‌فرض
        var checked = CAL41.filterCats[k] !== false ? 'checked' : '';
        html += '<label><input type="checkbox" data-cat="' + k + '" ' + checked + '>'
             +  '<span class="lg-dot" style="background:' + c.color + '"></span>'
             +  c.icon + ' ' + c.label + '</label>';
    });
    html += '</div>';

    html += '</div>';
    page.innerHTML = html;

    // عنوان
    var titleEl = document.getElementById('calg-titledate');
    if (titleEl) titleEl.textContent = buildCalTitle();

    bindCalEvents41(active);
};

function buildCalTitle() {
    var cur = CAL41.cursor;
    if (!cur || isNaN(cur.y) || isNaN(cur.m) || isNaN(cur.d)) return '—';
    var mon = JALALI_MONTHS[cur.m - 1] || '?';
    if (CAL41.view === 'month') return mon + ' ' + toFa(cur.y);
    if (CAL41.view === 'agenda') return 'رویدادهای پیش‌رو';
    if (CAL41.view === 'day') {
        var g = jalaliToGregorian(cur.y, cur.m, cur.d);
        var d = new Date(g[0], g[1] - 1, g[2]);
        var wd = WEEKDAYS_FA[d.getDay()] || '';
        return wd + '، ' + toFa(cur.d) + ' ' + mon + ' ' + toFa(cur.y);
    }
    // هفته یا ۳ روز
    var days = CAL41.view === 'week' ? 7 : 3;
    // پیدا کردن ابتدای هفته (شنبه)
    var startY = cur.y, startM = cur.m, startD = cur.d;
    var g2 = jalaliToGregorian(cur.y, cur.m, cur.d);
    var dt = new Date(g2[0], g2[1] - 1, g2[2]);
    var jsDay = dt.getDay(); // 0=Sun ... 6=Sat
    var offsetFromSat = (jsDay + 1) % 7;
    if (CAL41.view === 'week') {
        startD = cur.d - offsetFromSat;
    }
    var startJ = addJalaliDays(cur.y + '/' + pad2(cur.m) + '/' + pad2(startD), 0);
    var endJ = addJalaliDays(startJ, days - 1);
    if (!startJ || !endJ) return mon + ' ' + toFa(cur.y);
    var sp = startJ.split('/').map(Number), ep = endJ.split('/').map(Number);
    return toFa(sp[2]) + ' ' + (JALALI_MONTHS[sp[1] - 1] || '?')
         + ' — ' + toFa(ep[2]) + ' ' + (JALALI_MONTHS[ep[1] - 1] || '?')
         + ' ' + toFa(ep[0]);
}

/* ═══ رندر ماه ═══ */
function calRenderMonth41(events) {
    var y = CAL41.cursor.y, m = CAL41.cursor.m;
    var days = daysInJalaliMonth(y, m);
    var firstG = jalaliToGregorian(y, m, 1);
    var firstDow = (new Date(firstG[0], firstG[1] - 1, firstG[2]).getDay() + 1) % 7;
    var prevM = m - 1, prevY = y, nextM = m + 1, nextY = y;
    if (prevM < 1) { prevM = 12; prevY--; }
    if (nextM > 12) { nextM = 1; nextY++; }
    var prevDays = daysInJalaliMonth(prevY, prevM);
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

    var byDate = {};
    events.forEach(function (e) {
        if (!byDate[e.date]) byDate[e.date] = [];
        byDate[e.date].push(e);
    });
    Object.keys(byDate).forEach(function (d) {
        byDate[d].sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
    });

    var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var FA_WD = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه','شنبه'];
    var FA_WD_SHORT = ['ش','ی','د','س','چ','پ','ج'];

    var html = '<div class="calg-mhead">';
    FA_WD_SHORT.forEach(function (x) { html += '<div>' + x + '</div>'; });
    html += '</div><div class="calg-mgrid">';

    var total = 42, dc = 1, ndc = 1;
    for (var i = 0; i < total; i++) {
        var day, cy, cm, other = false;
        if (i < firstDow) { day = prevDays - (firstDow - 1 - i); cy = prevY; cm = prevM; other = true; }
        else if (dc <= days) { day = dc++; cy = y; cm = m; }
        else { day = ndc++; cy = nextY; cm = nextM; other = true; }
        var ds = cy + '/' + pad2(cm) + '/' + pad2(day);
        var isToday = (cy === today[0] && cm === today[1] && day === today[2]);
        var colIdx = i % 7;
        var isFri = (colIdx === 6);
        var gd = jalaliToGregorian(cy, cm, day);
        var dt = new Date(gd[0], gd[1] - 1, gd[2]);
        var enDay = dt.getDate();
        var enMon = EN_MONTHS[dt.getMonth()];
        var wd = FA_WD[dt.getDay()];

        var cls = 'calg-mcell';
        if (other) cls += ' other';
        if (isToday) cls += ' today';
        if (isFri) cls += ' fri';

        html += '<div class="' + cls + '" data-date="' + ds + '">';
        html += '<div class="cd">';
        html += '<div class="cjd">' + toFa(day) + ' ' + JALALI_MONTHS[cm - 1] + '</div>';
        html += '<div class="cwday">' + wd + '</div>';
        html += '<div class="cgd">' + enDay + ' ' + enMon + '</div>';
        html += '</div>';

        var evs = byDate[ds] || [];
        var shown = 0;
        evs.forEach(function (e) {
            if (shown >= 3) return;
            var cat = window.CAL_CATS[e.cat] || { color: '#999' };
            var t = e.time ? toFaTime(e.time) : '';
            html += '<div class="cev"><span class="cdot" style="background:' + cat.color + '"></span>'
                 +  (t ? '<span class="ctime">' + t + '</span>' : '')
                 +  '<span class="ctxt">' + esc(e.title) + '</span></div>';
            shown++;
        });
        if (evs.length > 3) html += '<div class="cmore">+' + toFa(evs.length - 3) + ' مورد دیگر</div>';
        html += '</div>';
    }
    html += '</div>';
    return html;
}

/* ═══ رندر هفته / ۳ روز ═══ */
function calRenderWeek41(events) { return calRenderMultiDay(events, 7, 'week'); }
function calRender3Day41(events) { return calRenderMultiDay(events, 3, '3day'); }

function calRenderMultiDay(events, numDays, viewKey) {
    var cur = CAL41.cursor;
    var g0 = jalaliToGregorian(cur.y, cur.m, cur.d);
    var dt0 = new Date(g0[0], g0[1] - 1, g0[2]);
    var jsDay = dt0.getDay();
    var offsetFromSat = (jsDay + 1) % 7;
    var startJ;
    if (viewKey === 'week') {
        startJ = addJalaliDays(cur.y + '/' + pad2(cur.m) + '/' + pad2(cur.d - offsetFromSat), 0);
    } else {
        startJ = cur.y + '/' + pad2(cur.m) + '/' + pad2(cur.d);
    }
    var byDate = {};
    events.forEach(function (e) {
        if (!byDate[e.date]) byDate[e.date] = [];
        byDate[e.date].push(e);
    });
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var todayStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);

    var colW = CAL41.colWidths[viewKey] || Math.floor(100 / numDays);
    var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    var html = '<div class="calg-multi" data-view="' + viewKey + '" style="display:grid;grid-template-columns:repeat(' + numDays + ',minmax(0,1fr));gap:5px;position:relative">';
    // هدر
    for (var d = 0; d < numDays; d++) {
        var ds = addJalaliDays(startJ, d);
        if (!ds) continue;
        var p = ds.split('/').map(Number);
        var gd = jalaliToGregorian(p[0], p[1], p[2]);
        var dt = new Date(gd[0], gd[1] - 1, gd[2]);
        var isToday = ds === todayStr;
        var wd = WEEKDAYS_FA[dt.getDay()];
        var enD = dt.getDate();
        var enMon = EN_MONTHS[dt.getMonth()];
        html += '<div class="calg-md-head' + (isToday ? ' today' : '') + '" data-col="' + d + '">'
             +  '<div class="mh-wd">' + wd + '</div>'
             +  '<div class="mh-jd">' + toFa(p[2]) + ' ' + JALALI_MONTHS[p[1] - 1] + '</div>'
             +  '<div class="mh-gd">' + enD + ' ' + enMon + '</div>'
             +  '</div>';
    }
    // ستون‌ها (هر روز یک ستون کامل)
    for (var d2 = 0; d2 < numDays; d2++) {
        var ds2 = addJalaliDays(startJ, d2);
        if (!ds2) continue;
        var evs = (byDate[ds2] || []).slice().sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
        var isToday2 = ds2 === todayStr;
        html += '<div class="calg-md-col' + (isToday2 ? ' today' : '') + '" data-date="' + ds2 + '" style="min-height:400px;max-height:60vh;overflow-y:auto;background:var(--card-solid);border:1px solid var(--border);border-radius:12px;padding:8px">';
        if (evs.length === 0) {
            html += '<div style="text-align:center;padding:20px;font-size:.75rem;color:var(--text-muted)">رویدادی نیست</div>';
        } else {
            evs.forEach(function (e) {
                var cat = window.CAL_CATS[e.cat] || { color: '#999' };
                var t = e.time ? toFaTime(e.time) : '';
                var sub2 = e.location ? '📍 ' + esc(e.location) : (e.sub || '');
                html += '<div class="calg-md-ev" data-ev="' + e.id + '" style="background:' + cat.color + '10;border-right:3px solid ' + cat.color + ';padding:8px;border-radius:8px;margin-bottom:6px;cursor:pointer">'
                     +  (t ? '<div style="font-size:.7rem;font-weight:900;color:' + cat.color + ';direction:ltr;margin-bottom:2px">' + t + '</div>' : '')
                     +  '<div style="font-weight:800;font-size:.82rem">' + esc(e.title) + '</div>'
                     +  (sub2 ? '<div style="font-size:.7rem;color:var(--text-muted);margin-top:2px">' + sub2 + '</div>' : '')
                     +  '</div>';
            });
        }
        html += '</div>';
        // دستگیره‌ی تغییر عرض
        if (d2 < numDays - 1) {
            html += '<div class="calg-col-resizer" data-col="' + d2 + '" data-view="' + viewKey + '" style="position:absolute;top:0;bottom:0;width:8px;cursor:col-resize;z-index:5;background:transparent;left:' + ((100 / numDays) * (d2 + 1) - 0.2) + '%"></div>';
        }
    }
    html += '</div>';
    return html;
}

/* ═══ رندر روز (۵ تا ۲۳) ═══ */
function calRenderDay41(events) {
    var ds = CAL41.cursor.y + '/' + pad2(CAL41.cursor.m) + '/' + pad2(CAL41.cursor.d);
    var dayEvs = events.filter(function (e) { return e.date === ds; });
    dayEvs.sort(function (a, b) { return (a.time || '00:00').localeCompare(b.time || '00:00'); });
    var gd = jalaliToGregorian(CAL41.cursor.y, CAL41.cursor.m, CAL41.cursor.d);
    var dt = new Date(gd[0], gd[1] - 1, gd[2]);
    var enMon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()];

    var html = '<div style="text-align:center;margin-bottom:14px;padding:12px;background:var(--primary-soft);border-radius:12px">'
             +  '<div style="font-size:1.05rem;font-weight:900;color:#1e40af">' + WEEKDAYS_FA[dt.getDay()] + '، ' + toFa(CAL41.cursor.d) + ' ' + JALALI_MONTHS[CAL41.cursor.m - 1] + ' ' + toFa(CAL41.cursor.y) + '</div>'
             +  '<div style="font-size:0.78rem;color:#94a3b8;direction:ltr;margin-top:4px">' + dt.getDate() + ' ' + enMon + ' ' + dt.getFullYear() + '</div>'
             +  '<button class="calg-btn primary" id="calg-share-day" style="margin-top:10px">📤 اشتراک‌گذاری</button>'
             +  '</div>';

    html += '<div style="display:grid;grid-template-columns:70px 1fr;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card-solid)">';
    for (var h = 5; h <= 23; h++) {
        var hourStr = pad2(h) + ':00';
        var hourEvs = dayEvs.filter(function (e) { return e.time && e.time.substring(0, 2) === pad2(h); });
        html += '<div style="padding:10px 8px;text-align:center;font-weight:900;font-size:.82rem;background:var(--card-alt);border-bottom:1px solid var(--border);direction:ltr;color:var(--primary-dark)">' + toFaTime(hourStr) + '</div>';
        html += '<div class="calg-hour-cell" data-date="' + ds + '" data-hour="' + h + '" style="padding:8px;border-bottom:1px solid var(--border);min-height:56px;cursor:pointer">';
        hourEvs.forEach(function (e) {
            var cat = window.CAL_CATS[e.cat] || { color: '#999' };
            html += '<div class="calg-day-ev" data-ev="' + e.id + '" style="background:' + cat.color + '15;border-right:4px solid ' + cat.color + ';padding:8px 10px;border-radius:8px;margin-bottom:4px;cursor:pointer">'
                 +  '<div style="font-weight:800;font-size:.85rem">' + esc(e.title) + '</div>'
                 +  (e.location ? '<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">📍 ' + esc(e.location) + '</div>' : '')
                 +  (e.persons && e.persons.length ? '<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">👥 ' + e.persons.map(function (pid) {
                        var p = DB.load('persons', []).find(function (x) { return x.id === pid; });
                        return p ? (p.first || '') + ' ' + (p.last || '') : '?';
                    }).join('، ') + '</div>' : '')
                 +  '</div>';
        });
        html += '</div>';
    }
    html += '</div>';
    return html;
}

/* ═══ دستورکار ═══ */
function calRenderAgenda41(events) {
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var todayStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);
    var future = events.filter(function (e) { return e.date >= todayStr; });
    future.sort(function (a, b) {
        var c = a.date.localeCompare(b.date); if (c !== 0) return c;
        return (a.time || '').localeCompare(b.time || '');
    });
    var byDate = {};
    future.forEach(function (e) { (byDate[e.date] = byDate[e.date] || []).push(e); });
    var dates = Object.keys(byDate).sort();
    if (dates.length === 0) return '<div class="calg-empty">رویدادی در آینده نیست.</div>';
    var html = '<div style="display:flex;flex-direction:column;gap:10px">';
    dates.slice(0, 30).forEach(function (d) {
        var p = d.split('/').map(Number);
        var gd = jalaliToGregorian(p[0], p[1], p[2]);
        var dt = new Date(gd[0], gd[1] - 1, gd[2]);
        var isToday = d === todayStr;
        html += '<div style="padding:10px 14px;background:var(--card-alt);border-radius:10px;border-right:4px solid ' + (isToday ? '#1e40af' : '#3b82f6') + '">';
        html += '<h4 style="margin:0 0 8px;font-size:.85rem;color:#1e40af;font-weight:900">'
             +  WEEKDAYS_FA[dt.getDay()] + '، ' + toFa(p[2]) + ' ' + JALALI_MONTHS[p[1] - 1] + ' ' + toFa(p[0])
             +  (isToday ? ' (امروز)' : '') + '</h4>';
        byDate[d].forEach(function (e) {
            var cat = window.CAL_CATS[e.cat] || { color: '#999' };
            html += '<div class="calg-agev" data-ev="' + e.id + '" style="display:flex;gap:8px;align-items:center;padding:8px;border-radius:8px;background:#fff;margin-bottom:4px;cursor:pointer;border:1px solid var(--border)">'
                 +  '<span style="width:8px;height:8px;border-radius:2px;background:' + cat.color + ';flex-shrink:0"></span>'
                 +  '<span style="font-size:.8rem;font-weight:700;flex:1">' + esc(e.title) + '</span>'
                 +  (e.time ? '<span style="font-size:.72rem;color:var(--text-muted);direction:ltr;font-family:monospace">' + toFaTime(e.time) + '</span>' : '')
                 +  '</div>';
        });
        html += '</div>';
    });
    html += '</div>';
    return html;
}

/* ═══════════════════════════════════════════════════════════════
   ۹) اتصال رویدادها
   ═══════════════════════════════════════════════════════════════ */
function bindCalEvents41(active) {
    var prev = document.getElementById('calg-prev');
    var next = document.getElementById('calg-next');
    var today = document.getElementById('calg-today');
    var newBtn = document.getElementById('calg-new');
    var catMgr = document.getElementById('calg-cat-mgr');
    var shareDay = document.getElementById('calg-share-day');

    if (prev) prev.onclick = function () { navigateCal(-1); };
    if (next) next.onclick = function () { navigateCal(1); };
    if (today) today.onclick = function () {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        CAL41.cursor = { y: t[0], m: t[1], d: t[2] };
        calRender();
    };
    if (newBtn) newBtn.onclick = function () {
        var ds = CAL41.cursor.y + '/' + pad2(CAL41.cursor.m) + '/' + pad2(CAL41.cursor.d);
        openEventModal41(null, ds);
    };
    if (catMgr) catMgr.onclick = window.openCategoriesManager;
    if (shareDay) shareDay.onclick = function () { shareDayEvents(); };

    document.querySelectorAll('.calg-tab').forEach(function (t) {
        t.onclick = function () {
            CAL41.view = this.getAttribute('data-view');
            calRender();
        };
    });
    document.querySelectorAll('.calg-legend input').forEach(function (cb) {
        cb.onchange = function () {
            CAL41.filterCats[this.getAttribute('data-cat')] = this.checked;
            calRender();
        };
    });
    document.querySelectorAll('[data-ev]').forEach(function (el) {
        el.onclick = function (e) {
            e.stopPropagation();
            var id = this.getAttribute('data-ev');
            var ev = active.find(function (x) { return x.id === id; });
            if (ev) openEventModal41(ev, null);
        };
    });
    document.querySelectorAll('.calg-mcell').forEach(function (cell) {
        cell.onclick = function (e) {
            if (e.target.closest('.cev')) return;
            var ds = this.getAttribute('data-date');
            openEventModal41(null, ds);
        };
    });
    document.querySelectorAll('.calg-hour-cell').forEach(function (cell) {
        cell.onclick = function (e) {
            if (e.target.closest('.calg-day-ev')) return;
            var ds = this.getAttribute('data-date');
            var h = +this.getAttribute('data-hour');
            openEventModal41(null, ds, h);
        };
    });
    document.querySelectorAll('.calg-md-col').forEach(function (col) {
        col.onclick = function (e) {
            if (e.target.closest('[data-ev]')) return;
            var ds = this.getAttribute('data-date');
            openEventModal41(null, ds);
        };
    });

    // تغییر عرض ستون‌ها
    document.querySelectorAll('.calg-col-resizer').forEach(function (h) {
        h.addEventListener('mousedown', function (e) {
            e.preventDefault();
            var viewKey = this.getAttribute('data-view');
            var wrapper = this.closest('.calg-multi');
            if (!wrapper) return;
            var cols = wrapper.querySelectorAll('.calg-md-col, .calg-md-head');
            var startX = e.pageX;
            var startWidths = [];
            var numCols = wrapper.querySelectorAll('.calg-md-col').length;
            wrapper.querySelectorAll('.calg-md-col').forEach(function (c) { startWidths.push(c.offsetWidth); });
            function onMove(ev) {
                var diff = ev.pageX - startX;
                var idx = +h.getAttribute('data-col');
                // آخرین ستون و ستون فعلی را تغییر بده
                var w1 = Math.max(80, startWidths[idx] + diff);
                var w2 = Math.max(80, startWidths[idx + 1] - diff);
                wrapper.style.gridTemplateColumns = startWidths.map(function (w, i) {
                    if (i === idx) return w1 + 'px';
                    if (i === idx + 1) return w2 + 'px';
                    return w + 'px';
                }).join(' ');
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                // ذخیره عرض‌ها
                var widths = [];
                wrapper.querySelectorAll('.calg-md-col').forEach(function (c) { widths.push(c.offsetWidth); });
                CAL41.colWidths[viewKey] = widths;
                DB.save('cal41.colWidths', CAL41.colWidths);
            }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    });
}

function navigateCal(dir) {
    var cur = CAL41.cursor;
    if (CAL41.view === 'month') {
        cur.m += dir;
        if (cur.m < 1) { cur.m = 12; cur.y--; }
        if (cur.m > 12) { cur.m = 1; cur.y++; }
    } else if (CAL41.view === 'week') {
        CAL41.cursor = calAddDaysObj(cur, dir * 7);
    } else if (CAL41.view === '3day') {
        CAL41.cursor = calAddDaysObj(cur, dir * 3);
    } else if (CAL41.view === 'day') {
        CAL41.cursor = calAddDaysObj(cur, dir);
    } else {
        cur.m += dir;
        if (cur.m < 1) { cur.m = 12; cur.y--; }
        if (cur.m > 12) { cur.m = 1; cur.y++; }
    }
    calRender();
}
function calAddDaysObj(cur, n) {
    var ds = cur.y + '/' + pad2(cur.m) + '/' + pad2(cur.d);
    var nd = addJalaliDays(ds, n);
    var p = nd.split('/').map(Number);
    return { y: p[0], m: p[1], d: p[2] };
}

/* ═══════════════════════════════════════════════════════════════
   ۱۰) مودال رویداد جدید — با تمام فیلدها
   ═══════════════════════════════════════════════════════════════ */
function openEventModal41(ev, defaultDate, defaultHour) {
    var old = document.getElementById('evt-modal'); if (old) old.remove();
    var oldO = document.getElementById('evt-overlay'); if (oldO) oldO.remove();

    var isNew = !ev;
    var curDate = (ev && ev.startDate) || defaultDate || (CAL41.cursor.y + '/' + pad2(CAL41.cursor.m) + '/' + pad2(CAL41.cursor.d));
    var curTime = (ev && ev.startTime) || (defaultHour !== undefined ? pad2(defaultHour) + ':00' : '21:00');
    var endDate = (ev && ev.endDate) || curDate;
    var endTime = (ev && ev.endTime) || curTime;
    var selectedCat = (ev && ev.cat) || (uCats()[0] && uCats()[0].key) || 'personal';
    var recurrence = (ev && ev.recurrence) || { type: 'none', interval: 1, customUnit: 'day', count: 10 };
    var persons = (ev && ev.persons) ? ev.persons.slice() : [];

    // دسته‌ها
    var catPicker = '';
    uCats().forEach(function (c) {
        var active = (c.key === selectedCat) ? 'background:' + c.color + '20;border-color:' + c.color : 'background:#f8fafc;border-color:transparent';
        catPicker += '<button type="button" class="evt-cat-btn" data-cat="' + c.key + '" style="' + active + ';padding:8px 14px;border-radius:10px;border:2px solid;font-family:inherit;font-size:.8rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:5px;color:' + c.color + '">'
                  +  c.icon + ' ' + c.label + '</button>';
    });

    // افراد
    var personsList = DB.load('persons', []);
    var personsChips = persons.map(function (pid) {
        var p = personsList.find(function (x) { return x.id === pid; });
        if (!p) return '';
        var nm = (p.first || '') + ' ' + (p.last || '');
        return '<span class="evt-person-chip" data-pid="' + pid + '" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#dbeafe;color:#1e40af;border-radius:14px;font-size:.78rem;font-weight:800">'
             + nm + ' <button type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;font-weight:900" data-rm="' + pid + '">×</button></span>';
    }).join('');

    var catOptions = '<option value="">— انتخاب از لیست —</option>';
    personsList.forEach(function (p) {
        catOptions += '<option value="' + p.id + '">' + esc((p.first || '') + ' ' + (p.last || '')) + (p.mobile ? ' (' + toFa(p.mobile) + ')' : '') + '</option>';
    });

    var html = ''
      + '<div id="evt-overlay" class="overlay show" style="z-index:880"></div>'
      + '<div id="evt-modal" class="modal show" style="max-width:600px;z-index:885">'
      +   '<div class="modal-head"><h2>' + (isNew ? '＋ رویداد جدید' : '✎ ویرایش رویداد') + '</h2><button id="evt-close" class="close-btn">×</button></div>'
      +   '<div class="modal-body" style="max-height:75vh;overflow-y:auto">'

      +     '<div class="field"><label>عنوان *</label>'
      +       '<input type="text" id="evt-title" value="' + (ev ? esc(ev.title) : '') + '" placeholder="عنوان رویداد">'
      +     '</div>'

      +     '<div class="field"><label>دسته‌بندی</label>'
      +       '<div id="evt-cats" style="display:flex;flex-wrap:wrap;gap:6px">' + catPicker + '</div>'
      +     '</div>'

      +     '<div class="field"><label>تاریخ و ساعت شروع</label>'
      +       '<div style="display:grid;grid-template-columns:1fr auto;gap:6px">'
      +         '<input type="text" id="evt-start-date" class="date-picker" dir="ltr" value="' + curDate + '">'
      +         '<div style="display:flex;gap:4px">'
      +           '<input type="text" id="evt-start-time" dir="ltr" placeholder="HH:MM" value="' + curTime + '" style="width:80px;text-align:center;font-family:monospace">'
      +           '<button type="button" id="evt-start-clock" style="width:38px;border:none;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);cursor:pointer;font-size:1.05rem">🕐</button>'
      +         '</div>'
      +       '</div>'
      +     '</div>'

      +     '<div class="field"><label>تاریخ و ساعت پایان</label>'
      +       '<div style="display:grid;grid-template-columns:1fr auto;gap:6px">'
      +         '<input type="text" id="evt-end-date" class="date-picker" dir="ltr" value="' + endDate + '">'
      +         '<div style="display:flex;gap:4px">'
      +           '<input type="text" id="evt-end-time" dir="ltr" placeholder="HH:MM" value="' + endTime + '" style="width:80px;text-align:center;font-family:monospace">'
      +           '<button type="button" id="evt-end-clock" style="width:38px;border:none;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);cursor:pointer;font-size:1.05rem">🕐</button>'
      +         '</div>'
      +       '</div>'
      +     '</div>'

      +     '<div class="field"><label>📍 محل رویداد</label>'
      +       '<input type="text" id="evt-location" value="' + (ev ? esc(ev.location || '') : '') + '" placeholder="مثلاً: دفتر مرکزی">'
      +     '</div>'

      +     '<div class="field"><label>👥 افراد (چندگانه)</label>'
      +       '<div style="display:flex;gap:6px;margin-bottom:8px">'
      +         '<select id="evt-person-select" style="flex:1">' + catOptions + '</select>'
      +         '<button type="button" id="evt-person-add" style="padding:0 14px;background:var(--primary);color:#fff;border:none;border-radius:10px;font-weight:800;cursor:pointer">+ افزودن</button>'
      +       '</div>'
      +       '<div id="evt-persons-chips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:26px">' + personsChips + '</div>'
      +     '</div>'

      +     '<div class="field"><label>📝 توضیحات</label>'
      +       '<textarea id="evt-desc" rows="3">' + (ev ? esc(ev.desc || '') : '') + '</textarea>'
      +     '</div>'

      +     '<div class="field"><label>🔁 تکرار</label>'
      +       '<select id="evt-recur">'
      +         '<option value="none">بدون تکرار</option>'
      +         '<option value="day">روزانه</option>'
      +         '<option value="week">هفتگی</option>'
      +         '<option value="month">ماهانه</option>'
      +         '<option value="year">سالانه</option>'
      +         '<option value="custom">سفارشی</option>'
      +       '</select>'
      +       '<div id="evt-recur-custom" style="display:none;margin-top:8px;padding:10px;background:var(--card-alt);border-radius:10px">'
      +         '<div style="display:grid;grid-template-columns:auto 1fr auto 1fr;gap:6px;align-items:center">'
      +           '<span style="font-size:.82rem;font-weight:800">هر</span>'
      +           '<input type="number" id="evt-recur-interval" min="1" value="' + (recurrence.interval || 1) + '" style="padding:8px;border:1.5px solid var(--border);border-radius:8px;text-align:center">'
      +           '<select id="evt-recur-unit" style="padding:8px;border:1.5px solid var(--border);border-radius:8px">'
      +             '<option value="day">روز</option>'
      +             '<option value="week">هفته</option>'
      +             '<option value="month">ماه</option>'
      +             '<option value="year">سال</option>'
      +           '</select>'
      +           '<span style="font-size:.75rem;color:var(--text-muted)">تکرار شود</span>'
      +         '</div>'
      +         '<div style="margin-top:8px;font-size:.78rem;display:grid;grid-template-columns:auto 1fr;gap:6px;align-items:center">'
      +           '<span style="font-weight:800">حداکثر تعداد:</span>'
      +           '<input type="number" id="evt-recur-count" min="1" max="120" value="' + (recurrence.count || 10) + '" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;text-align:center">'
      +         '</div>'
      +       '</div>'
      +     '</div>'

      +     '<div class="field"><label>🔔 یادآور (دقیقه قبل)</label>'
      +       '<div style="display:flex;gap:6px;align-items:center">'
      +         '<button type="button" id="evt-rem-minus" style="width:42px;height:42px;border-radius:10px;border:1.5px solid var(--border);background:#fee2e2;color:#dc2626;font-size:1.2rem;font-weight:900;cursor:pointer">−</button>'
      +         '<input type="number" id="evt-rem" min="0" value="' + (ev && ev.reminder ? ev.reminder : 0) + '" style="flex:1;padding:10px;border:1.5px solid var(--border);border-radius:10px;text-align:center;font-weight:800">'
      +         '<button type="button" id="evt-rem-plus" style="width:42px;height:42px;border-radius:10px;border:1.5px solid var(--border);background:#dbeafe;color:#1e40af;font-size:1.2rem;font-weight:900;cursor:pointer">+</button>'
      +       '</div>'
      +       '<div style="font-size:.72rem;color:var(--text-muted);margin-top:6px">مقدار ۰ = یادآور در زمان رویداد</div>'
      +     '</div>'

      +   '</div>'
      +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">'
      +     (ev ? '<button id="evt-delete" class="btn-danger">🗑 حذف</button>' : '<div></div>')
      +     '<div style="display:flex;gap:8px">'
      +       '<button id="evt-cancel" class="btn-secondary">انصراف</button>'
      +       '<button id="evt-save" class="btn-primary">💾 ذخیره</button>'
      +     '</div>'
      +   '</div>'
      + '</div>';

    document.body.insertAdjacentHTML('beforeend', html);

    setTimeout(function () { if (typeof attachDatePickers === 'function') attachDatePickers(); }, 80);

    // دسته‌بندی
    document.querySelectorAll('.evt-cat-btn').forEach(function (b) {
        b.onclick = function () {
            selectedCat = this.getAttribute('data-cat');
            document.querySelectorAll('.evt-cat-btn').forEach(function (x) {
                var c = window.CAL_CATS[x.getAttribute('data-cat')];
                x.style.background = '#f8fafc';
                x.style.borderColor = 'transparent';
            });
            var c = window.CAL_CATS[selectedCat];
            this.style.background = (c ? c.color : '#888') + '20';
            this.style.borderColor = c ? c.color : '#888';
        };
    });
    // مقدار اولیه select تکرار
    var recSel = document.getElementById('evt-recur');
    recSel.value = recurrence.type === 'none' ? 'none' : (recurrence.type === 'custom' ? 'custom' : recurrence.type);
    if (recurrence.type === 'custom') document.getElementById('evt-recur-custom').style.display = 'block';
    if (recurrence.customUnit) document.getElementById('evt-recur-unit').value = recurrence.customUnit;
    recSel.onchange = function () {
        document.getElementById('evt-recur-custom').style.display = (this.value === 'custom') ? 'block' : 'none';
    };
    // ساعت‌ها
    document.getElementById('evt-start-clock').onclick = function () {
        var cur = document.getElementById('evt-start-time').value || '21:00';
        openTimePicker(function (t) { document.getElementById('evt-start-time').value = t; }, cur);
    };
    document.getElementById('evt-end-clock').onclick = function () {
        var cur = document.getElementById('evt-end-time').value || '21:00';
        openTimePicker(function (t) { document.getElementById('evt-end-time').value = t; }, cur);
    };
    // یادآور
    document.getElementById('evt-rem-minus').onclick = function () {
        var el = document.getElementById('evt-rem');
        el.value = Math.max(0, (Number(el.value) || 0) - 5);
    };
    document.getElementById('evt-rem-plus').onclick = function () {
        var el = document.getElementById('evt-rem');
        el.value = Math.max(0, (Number(el.value) || 0) + 5);
    };
    document.getElementById('evt-rem').addEventListener('input', function () {
        if (Number(this.value) < 0) this.value = 0;
    });
    // افراد
    function renderPersonsChips() {
        var box = document.getElementById('evt-persons-chips');
        box.innerHTML = persons.map(function (pid) {
            var p = personsList.find(function (x) { return x.id === pid; });
            if (!p) return '';
            var nm = (p.first || '') + ' ' + (p.last || '');
            return '<span class="evt-person-chip" data-pid="' + pid + '" style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#dbeafe;color:#1e40af;border-radius:14px;font-size:.78rem;font-weight:800">'
                 + nm + ' <button type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;font-weight:900" data-rm="' + pid + '">×</button></span>';
        }).join('');
        box.querySelectorAll('[data-rm]').forEach(function (b) {
            b.onclick = function () {
                var pid = this.getAttribute('data-rm');
                persons = persons.filter(function (x) { return x !== pid; });
                renderPersonsChips();
            };
        });
    }
    document.getElementById('evt-person-add').onclick = function () {
        var sel = document.getElementById('evt-person-select');
        var v = sel.value;
        if (v && persons.indexOf(v) === -1) { persons.push(v); renderPersonsChips(); sel.value = ''; }
    };

    function close() {
        var o = document.getElementById('evt-overlay'); if (o) o.remove();
        var m = document.getElementById('evt-modal'); if (m) m.remove();
    }
    document.getElementById('evt-close').onclick = close;
    document.getElementById('evt-cancel').onclick = close;
    document.getElementById('evt-overlay').onclick = close;

    // ذخیره
    document.getElementById('evt-save').onclick = function () {
        var title = document.getElementById('evt-title').value.trim();
        var sd = normalizeDigits(document.getElementById('evt-start-date').value.trim());
        var st = toEnTime(document.getElementById('evt-start-time').value.trim()) || '21:00';
        var ed = normalizeDigits(document.getElementById('evt-end-date').value.trim()) || sd;
        var et = toEnTime(document.getElementById('evt-end-time').value.trim()) || st;
        var loc = document.getElementById('evt-location').value.trim();
        var desc = document.getElementById('evt-desc').value.trim();
        var rem = Math.max(0, Number(document.getElementById('evt-rem').value) || 0);
        var rt = document.getElementById('evt-recur').value;
        var rec = { type: rt === 'none' ? 'none' : rt, interval: 1, count: 60 };
        if (rt === 'custom') {
            rec.interval = Math.max(1, Number(document.getElementById('evt-recur-interval').value) || 1);
            rec.customUnit = document.getElementById('evt-recur-unit').value;
            rec.count = Math.max(1, Math.min(120, Number(document.getElementById('evt-recur-count').value) || 10));
        }
        if (!title) { alert('عنوان اجباری است'); return; }
        if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(sd)) { alert('تاریخ شروع نامعتبر'); return; }
        if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(ed)) { alert('تاریخ پایان نامعتبر'); return; }

        var list = calLoadUserEvents();
        var obj;
        if (ev && ev.rawId) {
            obj = {
                id: ev.rawId, cat: selectedCat,
                startDate: sd, startTime: st, endDate: ed, endTime: et,
                date: sd, time: st,
                title: title, desc: desc, location: loc,
                persons: persons.slice(), reminder: rem, recurrence: rec
            };
            var found = false;
            for (var i = 0; i < list.length; i++) if (list[i].id === ev.rawId) { list[i] = obj; found = true; break; }
            if (!found) list.push(obj);
        } else {
            obj = {
                id: 'u_' + uid(), cat: selectedCat,
                startDate: sd, startTime: st, endDate: ed, endTime: et,
                date: sd, time: st,
                title: title, desc: desc, location: loc,
                persons: persons.slice(), reminder: rem, recurrence: rec,
                createdAt: Date.now()
            };
            list.push(obj);
        }
        calSaveUserEvents(list);
        close();
        calRender();
        showToast('✅ رویداد ذخیره شد');
    };

    if (ev && ev.rawId) {
        document.getElementById('evt-delete').onclick = function () {
            if (!confirm('این رویداد حذف شود؟')) return;
            var l = calLoadUserEvents().filter(function (x) { return x.id !== ev.rawId; });
            calSaveUserEvents(l);
            close();
            calRender();
            showToast('🗑 حذف شد');
        };
    }
}
window.openEventModal41 = openEventModal41;

/* ═══════════════════════════════════════════════════════════════
   ۱۱) اشتراک‌گذاری رویدادهای روز
   ═══════════════════════════════════════════════════════════════ */
function shareDayEvents() {
    var ds = CAL41.cursor.y + '/' + pad2(CAL41.cursor.m) + '/' + pad2(CAL41.cursor.d);
    var all = calBuildAllEvents();
    var dayEvs = all.filter(function (e) { return e.date === ds; });
    if (dayEvs.length === 0) { showToast('رویدادی برای این روز نیست'); return; }
    dayEvs.sort(function (a, b) { return (a.time || '').localeCompare(b.time || ''); });
    var gd = jalaliToGregorian(CAL41.cursor.y, CAL41.cursor.m, CAL41.cursor.d);
    var dt = new Date(gd[0], gd[1] - 1, gd[2]);
    var text = '📅 ' + WEEKDAYS_FA[dt.getDay()] + '، ' + toFa(CAL41.cursor.d) + ' ' + JALALI_MONTHS[CAL41.cursor.m - 1] + ' ' + toFa(CAL41.cursor.y) + '\n\n';
    dayEvs.forEach(function (e) {
        var cat = window.CAL_CATS[e.cat] || { icon: '📌' };
        text += cat.icon + ' ' + (e.time ? toFaTime(e.time) + ' — ' : '') + e.title;
        if (e.location) text += ' | 📍 ' + e.location;
        if (e.amount) text += ' | 💰 ' + formatMoney(e.amount);
        text += '\n';
    });
    if (navigator.share) {
        navigator.share({ title: 'رویدادهای ' + toFa(CAL41.cursor.d) + ' ' + JALALI_MONTHS[CAL41.cursor.m - 1], text: text }).catch(function(){});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function(){ showToast('📋 کپی شد'); }).catch(function(){ prompt('متن:', text); });
    } else {
        prompt('متن:', text);
    }
}
window.shareDayEvents = shareDayEvents;

/* ═══════════════════════════════════════════════════════════════
   ۱۲) سیستم نوتیفیکیشن استک‌شونده
   ═══════════════════════════════════════════════════════════════ */
(function notificationStack() {
    var shownKeys = {};
    try { shownKeys = JSON.parse(sessionStorage.getItem('parsis.notif.shown') || '{}'); } catch (e) {}
    function saveShown() {
        try { sessionStorage.setItem('parsis.notif.shown', JSON.stringify(shownKeys)); } catch (e) {}
    }
    var container = null;
    function getContainer() {
        if (container && document.body.contains(container)) return container;
        container = document.createElement('div');
        container.id = 'notif-stack';
        container.style.cssText = 'position:fixed;top:70px;left:16px;right:16px;max-width:420px;margin:0 auto;z-index:1100;display:flex;flex-direction:column;gap:10px;pointer-events:none';
        document.body.appendChild(container);
        return container;
    }
    window.pushNotification = function (opts) {
        var c = getContainer();
        var card = document.createElement('div');
        card.className = 'parsis-notif';
        card.style.cssText = 'pointer-events:auto;background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 12px 32px rgba(15,23,42,0.18);border-right:5px solid ' + (opts.color || '#f59e0b') + ';cursor:pointer;animation:slideIn 0.35s ease;position:relative';
        card.innerHTML = '<div style="display:flex;gap:10px;align-items:flex-start">'
            + '<div style="font-size:1.6rem;line-height:1">' + (opts.icon || '🔔') + '</div>'
            + '<div style="flex:1;min-width:0">'
            +   '<div style="font-weight:900;font-size:.9rem;color:#1e293b;margin-bottom:3px">' + esc(opts.title || 'یادآور') + '</div>'
            +   (opts.body ? '<div style="font-size:.82rem;color:#475569;line-height:1.6">' + esc(opts.body) + '</div>' : '')
            +   (opts.time ? '<div style="font-size:.72rem;color:#94a3b8;margin-top:5px;direction:ltr">' + opts.time + '</div>' : '')
            + '</div>'
            + '<button class="notif-close" style="background:#f1f5f9;border:none;border-radius:8px;width:26px;height:26px;font-weight:900;cursor:pointer;color:#64748b;flex-shrink:0">×</button>'
            + '</div>';
        var timer = setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 15000);
        card.querySelector('.notif-close').addEventListener('click', function (e) {
            e.stopPropagation();
            clearTimeout(timer);
            if (card.parentNode) card.parentNode.removeChild(card);
        });
        card.addEventListener('click', function (e) {
            if (e.target.classList.contains('notif-close')) return;
            clearTimeout(timer);
            if (card.parentNode) card.parentNode.removeChild(card);
            if (typeof opts.onClick === 'function') opts.onClick();
        });
        c.appendChild(card);
    };
    // بررسی یادآورها
    function check() {
        var now = new Date();
        var t = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
        var todayStr = t[0] + '/' + pad2(t[1]) + '/' + pad2(t[2]);
        var hhmm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
        var nowTs = now.getTime();
        // اقساط
        DB.load('facilities', []).forEach(function (f) {
            (f.installments || []).forEach(function (ins, i) {
                if (!ins.date || ins.status === 'paid' || ins.date !== todayStr) return;
                var tm = ins.time || '21:00';
                var key = 'i_' + f.id + '_' + i + '_' + todayStr;
                if (shownKeys[key]) return;
                if (hhmm >= tm) {
                    shownKeys[key] = true; saveShown();
                    pushNotification({
                        icon: '💳', color: '#dc2626',
                        title: 'یادآور قسط',
                        body: f.name + ' | ' + (ins.amount ? formatMoney(ins.amount) + ' ' + currencyLabel() : ''),
                        time: toFaTime(tm),
                        onClick: function () { goToPage('facilities'); }
                    });
                }
            });
        });
        // منابع دریافتنی
        DB.load('cashFlowSources', []).forEach(function (s) {
            if (!s.expectedDate || s.expectedDate !== todayStr) return;
            var tm = s.time || '21:00';
            var key = 's_' + s.id + '_' + todayStr;
            if (shownKeys[key]) return;
            if (hhmm >= tm) {
                shownKeys[key] = true; saveShown();
                pushNotification({
                    icon: '📥', color: '#10b981',
                    title: 'یادآور دریافتنی',
                    body: getSourceLabel(s) + (s.amount ? ' | ' + formatMoney(s.amount) : ''),
                    time: toFaTime(tm),
                    onClick: function () { goToPage('cashflow-sources'); }
                });
            }
        });
        // رویدادهای کاربر (با احترام به reminder)
        calLoadUserEvents().forEach(function (u) {
            if (!u.startDate) return;
            var exp = expandRecurrence(u);
            exp.forEach(function (e) {
                if (e.startDate !== todayStr) return;
                var rMin = Number(u.reminder) || 0;
                var key = 'u_' + u.id + '_' + e.startDate + '_' + e.startTime;
                if (shownKeys[key]) return;
                var st = e.startTime || '21:00';
                var parts = st.split(':');
                var target = new Date(now);
                target.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
                var remindAt = target.getTime() - rMin * 60000;
                if (nowTs >= remindAt) {
                    shownKeys[key] = true; saveShown();
                    pushNotification({
                        icon: '🔔', color: '#6366f1',
                        title: u.title,
                        body: (u.location ? '📍 ' + u.location + ' | ' : '') + (rMin > 0 ? rMin + ' دقیقه قبل' : 'در زمان رویداد'),
                        time: toFaTime(st),
                        onClick: function () {
                            CAL41.cursor = (function () {
                                var p = e.startDate.split('/').map(Number);
                                return { y: p[0], m: p[1], d: p[2] };
                            })();
                            goToPage('jalali-calendar');
                            setTimeout(calRender, 100);
                        }
                    });
                }
            });
        });
    }
    setInterval(check, 30000);
    setTimeout(check, 3000);

    // افزودن انیمیشن
    if (!document.getElementById('notif-anim-style')) {
        var s = document.createElement('style');
        s.id = 'notif-anim-style';
        s.textContent = '@keyframes slideIn { from { opacity:0; transform:translateY(-14px) } to { opacity:1; transform:none } }';
        document.head.appendChild(s);
    }
})();

/* ═══════════════════════════════════════════════════════════════
   ۱۳) افزودن ساعت به فرم برآورد منابع دریافتنی
   ═══════════════════════════════════════════════════════════════ */
(function addTimeToCfsForm() {
    function inject() {
        var dateInput = document.getElementById('cfs-date');
        if (!dateInput) return;
        if (document.getElementById('cfs-time')) return;
        var field = dateInput.closest('.field');
        if (!field) return;
        var parentGrid = field.parentNode;
        // ایجاد فیلد ساعت در همان ردیف
        var timeWrap = document.createElement('div');
        timeWrap.style.cssText = 'display:flex;gap:4px;align-items:center';
        // تغییر ساختار: field تاریخ + button ساعت
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'cfs-time-btn';
        btn.textContent = '🕐';
        btn.title = 'انتخاب ساعت';
        btn.style.cssText = 'padding:0 12px;border:none;border-radius:10px;background:var(--primary-soft);color:var(--primary-dark);cursor:pointer;font-size:1.05rem;margin-right:6px';
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var cur = document.getElementById('cfs-time').value || '21:00';
            openTimePicker(function (t) { document.getElementById('cfs-time').value = t; }, cur);
        });
        // ایجاد فیلد ساعت به عنوان یک field جدید در همان grid
        var timeField = document.createElement('div');
        timeField.className = 'field';
        timeField.innerHTML = '<label>ساعت احتمالی</label><div style="display:flex;gap:4px">'
            + '<input type="text" id="cfs-time" dir="ltr" placeholder="HH:MM" value="21:00" style="flex:1;text-align:center;font-family:monospace">'
            + '</div>';
        timeField.querySelector('div').appendChild(btn);
        parentGrid.appendChild(timeField);
    }
    setTimeout(inject, 800);
    setTimeout(inject, 2000);
    // پچ saveCfsSource برای ذخیره ساعت
    var _origSave = window.saveCfsSource;
    if (typeof _origSave === 'function') {
        window.saveCfsSource = function () {
            var timeEl = document.getElementById('cfs-time');
            var t = timeEl ? toEnTime(timeEl.value) : '';
            var dateVal = normalizeDigits((document.getElementById('cfs-date') || {}).value || '');
            _origSave.apply(this, arguments);
            // آخرین ذخیره را اصلاح کن
            if (dateVal) {
                var list = DB.load('cashFlowSources', []);
                var found = false;
                for (var i = list.length - 1; i >= 0; i--) {
                    if (list[i].expectedDate === dateVal && !list[i].time) {
                        list[i].time = t || '21:00';
                        found = true; break;
                    }
                }
                if (found) DB.save('cashFlowSources', list);
            }
        };
    }
})();

/* ═══════════════════════════════════════════════════════════════
   ۱۴) نوار ابزار: افزودن دکمه مدیریت دسته‌بندی در تقویم
   ═══════════════════════════════════════════════════════════════ */
(function injectTopBarButtons() {
    var _orig = calRender;
    var timer = setInterval(function () {
        var bar = document.querySelector('#page-jalali-calendar .calg-bar');
        if (!bar) return;
        if (bar.querySelector('[data-cat-mgr]')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'calg-btn';
        btn.setAttribute('data-cat-mgr', '1');
        btn.innerHTML = '🎨';
        btn.title = 'مدیریت دسته‌بندی';
        btn.addEventListener('click', window.openCategoriesManager);
        bar.insertBefore(btn, bar.querySelector('#calg-new'));
    }, 2000);
})();

/* ═══════════════════════════════════════════════════════════════
   ۱۵) استایل‌های مکمل
   ═══════════════════════════════════════════════════════════════ */
(function injectStyles() {
    if (document.getElementById('cal41-style')) return;
    var s = document.createElement('style');
    s.id = 'cal41-style';
    s.textContent = ''
      + '.calg-multi { position:relative }'
      + '.calg-md-head { padding:8px 4px;text-align:center;background:#eef4fb;border-radius:10px;border:1px solid #dbe7f6 }'
      + '.calg-md-head.today { background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-color:#3b82f6 }'
      + '.calg-md-head .mh-wd { font-size:.7rem;color:#64748b;font-weight:800 }'
      + '.calg-md-head .mh-jd { font-size:.9rem;font-weight:900;color:#1e40af;margin-top:2px }'
      + '.calg-md-head.today .mh-jd { color:#1e3a8a }'
      + '.calg-md-head .mh-gd { font-size:.62rem;color:#94a3b8;direction:ltr;margin-top:1px }'
      + '.calg-md-col { grid-column:auto;background:var(--card-solid);border:1px solid var(--border);border-radius:12px;padding:8px;min-height:400px }'
      + '.calg-md-col.today { background:linear-gradient(180deg,#eff6ff,#fff) }'
      + '.calg-col-resizer { display:flex;align-items:center;justify-content:center }'
      + '.calg-col-resizer::before { content:"⋮";color:#94a3b8;font-size:1rem;opacity:.4 }'
      + '.calg-col-resizer:hover::before { opacity:1;color:#6366f1 }'
      + 'body.cal41-resizing, body.cal41-resizing * { cursor:col-resize !important;user-select:none !important }'
      + '.calg-md-ev:hover { filter:brightness(0.97);transform:translateX(-2px) }'
      + '.parsis-notif .notif-close:hover { background:#fee2e2 !important;color:#dc2626 !important }';
    document.head.appendChild(s);
})();

/* ═══════════════════════════════════════════════════════════════
   ۱۶) راه‌اندازی
   ═══════════════════════════════════════════════════════════════ */
(function boot() {
    function init() {
        // پچ goToPage برای رندر مجدد
        if (!window._cal41Patched && typeof window.goToPage === 'function') {
            window._cal41Patched = true;
            var orig = window.goToPage;
            window.goToPage = function (name) {
                orig.apply(this, arguments);
                if (name === 'jalali-calendar') setTimeout(calRender, 80);
            };
        }
        // اگر صفحه تقویم باز است، رندر کن
        var page = document.getElementById('page-jalali-calendar');
        if (page && page.classList.contains('active')) calRender();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1200); });
    } else {
        setTimeout(init, 1200);
    }
    setTimeout(init, 3000);
})();

console.log('✅ پارسیس v41 — پچ جامع تقویم بارگذاری شد');
