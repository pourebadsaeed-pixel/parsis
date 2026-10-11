/* =====================================================================
   پارسیس v31 — 14-calendar-google.js
   تقویم شمسی شبیه گوگل‌کلندر (به‌صورت خلاصه‌تر):
   ✔ ۴ نما: ماه / هفته / روز / دستورکار
   ✔ افزودن/ویرایش/حذف رویداد با کاتگوری و رنگ
   ✔ ادغام با اسناد، اقساط، یادداشت‌ها، منابع دریافتنی (فقط‌خواندنی)
   ✔ تاریخ شمسی + برچسب میلادی کوچک
   ===================================================================== */
'use strict';

var _cal = {
    view: 'month',
    cursor: null,        // {y, m, d} jalali
    filterCats: {}       // {voucher: true, installment: true, ...}
};

var CAL_CATS = {
    voucher:      { label: 'سند حسابداری', color: '#4a90e2', icon: '📄' },
    installment:  { label: 'قسط',           color: '#dc2626', icon: '💳' },
    note:         { label: 'یادداشت',       color: '#f59e0b', icon: '📔' },
    source:       { label: 'دریافتنی',      color: '#10b981', icon: '📥' },
    personal:     { label: 'شخصی',           color: '#8b5cf6', icon: '⭐' },
    work:         { label: 'کاری',           color: '#0ea5e9', icon: '💼' },
    birthday:     { label: 'تولد',           color: '#ec4899', icon: '🎂' }
};

/* -------- ذخیره‌سازی -------- */
function calLoadUserEvents() { return DB.load('calendarUserEvents', []); }
function calSaveUserEvents(list) { DB.save('calendarUserEvents', list); }

/* -------- جمع‌آوری رویدادها -------- */
function calBuildAllEvents() {
    var evs = [];
    DB.load('vouchers', []).forEach(function(v) {
        if (v.status !== 'approved' || !v.date) return;
        evs.push({ id: 'v_' + v.id, cat: 'voucher', date: v.date, title: 'سند #' + v.number,
            sub: v.desc || '', amount: getVoucherAmount(v), ref: v.id, readonly: true });
    });
    DB.load('facilities', []).forEach(function(f) {
        (f.installments || []).forEach(function(ins, i) {
            if (!ins.date) return;
            evs.push({ id: 'i_' + f.id + '_' + i, cat: 'installment', date: ins.date,
                title: (ins.status === 'paid' ? '✅ ' : '⏰ ') + 'قسط ' + f.name,
                sub: ins.status === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده',
                amount: Number(ins.amount) || 0, ref: f.id, readonly: true });
        });
    });
    DB.load('notes', []).forEach(function(n) {
        if (!n.date) return;
        evs.push({ id: 'n_' + n.id, cat: 'note', date: n.date, title: '📔 ' + (n.title || 'یادداشت'),
            sub: (n.checklist || []).length + ' آیتم', ref: n.id, readonly: true });
    });
    DB.load('cashFlowSources', []).forEach(function(s) {
        if (!s.expectedDate) return;
        evs.push({ id: 's_' + s.id, cat: 'source', date: s.expectedDate, title: '📥 ' + getSourceLabel(s),
            sub: s.notes || '', amount: Number(s.amount) || 0, ref: s.id, readonly: true });
    });
    calLoadUserEvents().forEach(function(u) { evs.push(Object.assign({}, u, { readonly: false })); });
    return evs;
}

/* -------- Style -------- */
(function () {
    if (document.getElementById('calg-style')) return;
    var s = document.createElement('style');
    s.id = 'calg-style';
    s.textContent = ''
    + '.calg-wrap { background:#fff; border-radius:16px; border:1px solid var(--border); overflow:hidden }'
    + '.calg-bar { display:flex; align-items:center; gap:8px; padding:12px 16px; border-bottom:1px solid var(--border); background:linear-gradient(180deg,#f4f8fd,#fff) }'
    + '.calg-bar h3 { margin:0; flex:1; font-size:1rem; font-weight:900; color:#1e40af }'
    + '.calg-btn { padding:7px 14px; border-radius:10px; border:1px solid var(--border); background:#fff; font-family:inherit; font-size:.8rem; font-weight:800; color:#1e40af; cursor:pointer }'
    + '.calg-btn:hover { background:#e0ecf8 }'
    + '.calg-btn.primary { background:linear-gradient(135deg,#1e40af,#3b82f6); color:#fff; border:none }'
    + '.calg-tabs { display:flex; gap:4px; padding:8px 16px; background:#f8fafd; border-bottom:1px solid var(--border) }'
    + '.calg-tab { padding:6px 14px; border-radius:8px; font-size:.78rem; font-weight:800; color:var(--text-muted); background:transparent; border:none; cursor:pointer; font-family:inherit }'
    + '.calg-tab.active { background:#1e40af; color:#fff }'
    + '.calg-body { padding:14px }'
    /* Month view */
    + '.calg-mhead { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; margin-bottom:6px }'
    + '.calg-mhead > div { text-align:center; font-weight:900; font-size:.76rem; padding:7px 4px; background:#eef4fb; border-radius:8px; color:#1e40af }'
    + '.calg-mhead > div:last-child { color:#dc2626 }'
    + '.calg-mgrid { display:grid; grid-template-columns:repeat(7,1fr); gap:5px }'
    + '.calg-mcell { background:#fbfdff; border:1.5px solid #e0ecf8; border-radius:10px; min-height:92px; padding:6px; display:flex; flex-direction:column; cursor:pointer; transition:all .15s }'
    + '.calg-mcell:hover { border-color:#3b82f6; transform:translateY(-2px) }'
    + '.calg-mcell.other { opacity:.35 }'
    + '.calg-mcell.today { background:linear-gradient(135deg,#dbeafe,#eff6ff); border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,.2) }'
    + '.calg-mcell.fri { background:linear-gradient(135deg,#fee2e2,#fff5f5) }'
    + '.calg-mcell .cd { display:flex; justify-content:space-between; align-items:center; font-weight:900; color:#1e40af; font-size:.82rem; margin-bottom:4px }'
    + '.calg-mcell .cd .en { font-size:.58rem; color:#94a3b8; font-weight:700 }'
    + '.calg-mcell .cev { display:flex; align-items:center; gap:4px; font-size:.68rem; overflow:hidden; margin-bottom:2px }'
    + '.calg-mcell .cev .cdot { width:7px; height:7px; border-radius:2px; flex-shrink:0 }'
    + '.calg-mcell .cev .ctxt { overflow:hidden; text-overflow:ellipsis; white-space:nowrap }'
    + '.calg-mcell .cmore { font-size:.6rem; color:#94a3b8; font-weight:800 }'
    /* Week/Day view */
    + '.calg-wgrid { display:grid; grid-template-columns:60px repeat(7,1fr); gap:0; border:1px solid var(--border); border-radius:10px; overflow:hidden }'
    + '.calg-wgrid.day { grid-template-columns:60px 1fr }'
    + '.calg-whead { padding:8px 4px; text-align:center; background:#eef4fb; font-weight:800; font-size:.74rem; color:#1e40af; border-bottom:1px solid var(--border) }'
    + '.calg-whour { padding:6px; font-size:.68rem; color:#94a3b8; text-align:center; background:#fafcff; border-top:1px solid var(--border) }'
    + '.calg-wcell { min-height:44px; padding:4px; border-top:1px solid var(--border); border-right:1px solid var(--border); font-size:.68rem; overflow:hidden; cursor:pointer; background:#fff }'
    + '.calg-wcell:hover { background:#f0f6ff }'
    + '.calg-wcell .wev { padding:2px 4px; border-radius:4px; color:#fff; font-weight:700; margin-bottom:2px; font-size:.62rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }'
    /* Agenda view */
    + '.calg-agenda { display:flex; flex-direction:column; gap:10px }'
    + '.calg-agday { padding:10px 14px; background:#f7fafd; border-radius:10px; border-right:4px solid #3b82f6 }'
    + '.calg-agday.today { background:linear-gradient(90deg,#dbeafe,#f0f6ff); border-right-color:#1e40af }'
    + '.calg-agday h4 { margin:0 0 6px; font-size:.85rem; color:#1e40af; font-weight:900 }'
    + '.calg-agev { display:flex; gap:8px; align-items:center; padding:6px 8px; border-radius:8px; background:#fff; margin-bottom:4px; cursor:pointer; border:1px solid #e0ecf8 }'
    + '.calg-agev:hover { background:#e0ecf8 }'
    + '.calg-agev .adot { width:8px; height:8px; border-radius:2px; flex-shrink:0 }'
    + '.calg-agev .atxt { flex:1; font-size:.8rem; font-weight:700 }'
    + '.calg-agev .atime { font-size:.72rem; color:#94a3b8; direction:ltr }'
    + '.calg-empty { text-align:center; padding:30px; color:#94a3b8 }'
    /* Legend */
    + '.calg-legend { display:flex; gap:10px; flex-wrap:wrap; padding:10px 14px; background:#fafcff; border-top:1px solid var(--border); font-size:.74rem; font-weight:700 }'
    + '.calg-legend label { display:flex; align-items:center; gap:5px; cursor:pointer }'
    + '.calg-legend .lg-dot { width:10px; height:10px; border-radius:3px }'
    /* Modal */
    + '.calg-mo { position:fixed; inset:0; background:rgba(15,23,42,.55); backdrop-filter:blur(4px); z-index:800; opacity:0; visibility:hidden; transition:all .25s }'
    + '.calg-mo.show { opacity:1; visibility:visible }'
    + '.calg-mp { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) scale(.92); width:min(460px,94vw); max-height:88vh; background:#fff; border-radius:18px; z-index:810; opacity:0; visibility:hidden; transition:all .25s cubic-bezier(.34,1.56,.64,1); display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(15,23,42,.35) }'
    + '.calg-mp.show { opacity:1; visibility:visible; transform:translate(-50%,-50%) scale(1) }'
    + '.calg-mph { padding:14px 18px; background:linear-gradient(135deg,#1e40af,#3b82f6); color:#fff; display:flex; justify-content:space-between; align-items:center }'
    + '.calg-mph h3 { margin:0; font-size:.95rem; font-weight:900 }'
    + '.calg-mph button { background:rgba(255,255,255,.2); color:#fff; border:none; width:32px; height:32px; border-radius:10px; font-size:1.1rem; cursor:pointer }'
    + '.calg-mpb { padding:16px; overflow-y:auto; flex:1 }'
    + '.calg-fld { margin-bottom:12px }'
    + '.calg-fld label { display:block; font-size:.74rem; font-weight:800; color:var(--text-muted); margin-bottom:5px }'
    + '.calg-fld input, .calg-fld select, .calg-fld textarea { width:100%; padding:9px 12px; border:1.5px solid var(--border); border-radius:10px; font-family:inherit; font-size:.85rem; outline:none; box-sizing:border-box; background:#fafcff }'
    + '.calg-fld input:focus, .calg-fld select:focus, .calg-fld textarea:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.15) }'
    + '.calg-2col { display:grid; grid-template-columns:1fr 1fr; gap:10px }'
    + '.calg-cat-picker { display:flex; flex-wrap:wrap; gap:6px }'
    + '.calg-cat-picker button { padding:7px 12px; border-radius:10px; border:2px solid transparent; font-family:inherit; font-size:.76rem; font-weight:800; cursor:pointer; background:#f0f6ff; color:#1e40af; display:flex; align-items:center; gap:5px }'
    + '.calg-cat-picker button.active { border-color:currentColor; box-shadow:0 0 0 2px rgba(0,0,0,.05) }'
    + '.calg-mpf { padding:12px 16px; border-top:1px solid var(--border); display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap }'
    + '.calg-mpf button { padding:10px 18px; border-radius:10px; border:none; font-family:inherit; font-weight:800; font-size:.85rem; cursor:pointer }'
    + '.calg-mpf .save { background:linear-gradient(135deg,#1e40af,#3b82f6); color:#fff }'
    + '.calg-mpf .del { background:#fee2e2; color:#dc2626 }'
    + '.calg-mpf .cancel { background:#f3f4f6; color:#4b5563 }'
    + '@media (max-width:640px) { .calg-mcell { min-height:60px; padding:4px } .calg-mcell .cev { display:none } }';
    document.head.appendChild(s);
})();

/* -------- Page + menu -------- */
function calEnsurePage() {
    if (document.getElementById('page-jalali-calendar')) return;
    var main = document.querySelector('main.content');
    if (!main) return;
    var sec = document.createElement('section');
    sec.id = 'page-jalali-calendar';
    sec.className = 'page';
    main.appendChild(sec);

    // menu
    var navOps = document.querySelector('[data-nav-group="ops"] .nav-group-items');
    if (navOps && !navOps.querySelector('[data-page="jalali-calendar"]')) {
        var b = document.createElement('button');
        b.setAttribute('data-page', 'jalali-calendar');
        b.textContent = '📅 تقویم شمسی';
        navOps.appendChild(b);
    }
}

/* -------- Render -------- */
function calRender() {
    calEnsurePage();
    var page = document.getElementById('page-jalali-calendar');
    if (!page) return;
    if (!_cal.cursor) {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        _cal.cursor = { y: t[0], m: t[1], d: t[2] };
    }
    var all = calBuildAllEvents();
    var active = all.filter(function(e) { return _cal.filterCats[e.cat] !== false; });

    var html = '<h2>📅 تقویم شمسی</h2><div class="calg-wrap">';
    // top bar
    html += '<div class="calg-bar">';
    html += '<button class="calg-btn" id="calg-prev">‹</button>';
    html += '<h3 id="calg-titledate">—</h3>';
    html += '<button class="calg-btn" id="calg-today">امروز</button>';
    html += '<button class="calg-btn" id="calg-next">›</button>';
    html += '<button class="calg-btn primary" id="calg-new">＋ رویداد</button>';
    html += '</div>';
    // tabs
    html += '<div class="calg-tabs">';
    ['month|ماه','week|هفته','day|روز','agenda|دستورکار'].forEach(function(x) {
        var p = x.split('|');
        html += '<button class="calg-tab' + (_cal.view === p[0] ? ' active' : '') + '" data-view="' + p[0] + '">' + p[1] + '</button>';
    });
    html += '</div>';
    html += '<div class="calg-body" id="calg-body">';

    if (_cal.view === 'month') html += calRenderMonth(active);
    else if (_cal.view === 'week') html += calRenderWeek(active);
    else if (_cal.view === 'day') html += calRenderDay(active);
    else html += calRenderAgenda(active);

    html += '</div>';
    // legend
    html += '<div class="calg-legend">';
    Object.keys(CAL_CATS).forEach(function(k) {
        var c = CAL_CATS[k];
        var checked = _cal.filterCats[k] !== false ? 'checked' : '';
        html += '<label><input type="checkbox" data-cat="' + k + '" ' + checked + '><span class="lg-dot" style="background:' + c.color + '"></span>' + c.icon + ' ' + c.label + '</label>';
    });
    html += '</div>';
    html += '</div>';
    page.innerHTML = html;

    // title
    var titleEl = document.getElementById('calg-titledate');
    if (_cal.view === 'month') titleEl.textContent = JALALI_MONTHS[_cal.cursor.m - 1] + ' ' + toFa(_cal.cursor.y);
    else if (_cal.view === 'week') titleEl.textContent = 'هفته ' + toFa(_cal.cursor.d) + ' ' + JALALI_MONTHS[_cal.cursor.m - 1];
    else if (_cal.view === 'day') titleEl.textContent = WEEKDAYS_FA[calGreg(c(_cal.cursor)).getDay()] + ' ' + toFa(_cal.cursor.d) + ' ' + JALALI_MONTHS[_cal.cursor.m - 1];
    else titleEl.textContent = 'رویدادهای پیش‌رو';

    calBindEvents(active);
}

function c(x) { return x.y + '/' + pad2(x.m) + '/' + pad2(x.d); }
function calGreg(cursor) {
    var g = jalaliToGregorian(cursor.y, cursor.m, cursor.d);
    return new Date(g[0], g[1] - 1, g[2]);
}

/* -------- Month view -------- */
function calRenderMonth(events) {
    var y = _cal.cursor.y, m = _cal.cursor.m;
    var days = daysInJalaliMonth(y, m);
    var firstG = jalaliToGregorian(y, m, 1);
    var firstDow = (new Date(firstG[0], firstG[1] - 1, firstG[2]).getDay() + 1) % 7;
    var prevM = m - 1, prevY = y, nextM = m + 1, nextY = y;
    if (prevM < 1) { prevM = 12; prevY--; }
    if (nextM > 12) { nextM = 1; nextY++; }
    var prevDays = daysInJalaliMonth(prevY, prevM);
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

    // گروه‌بندی رویدادها بر اساس تاریخ
    var byDate = {};
    events.forEach(function(e) { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });

    var html = '<div class="calg-mhead">';
    ['شنبه','یک','دو','سه','چهار','پنج','جمعه'].forEach(function(x) { html += '<div>' + x + '</div>'; });
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
        var en = dt.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()];

        var cls = 'calg-mcell';
        if (other) cls += ' other';
        if (isToday) cls += ' today';
        if (isFri) cls += ' fri';
        html += '<div class="' + cls + '" data-date="' + ds + '">';
        html += '<div class="cd"><span>' + toFa(day) + '</span><span class="en">' + en + '</span></div>';
        var evs = byDate[ds] || [];
        var shown = 0;
        evs.forEach(function(e) {
            if (shown >= 3) return;
            var cat = CAL_CATS[e.cat] || { color: '#999' };
            html += '<div class="cev"><span class="cdot" style="background:' + cat.color + '"></span><span class="ctxt">' + esc(e.title) + '</span></div>';
            shown++;
        });
        if (evs.length > 3) html += '<div class="cmore">+' + toFa(evs.length - 3) + ' مورد دیگر</div>';
        html += '</div>';
    }
    html += '</div>';
    return html;
}

/* -------- Week view -------- */
function calRenderWeek(events) {
    // ساده: 7 روز هفته جاری
    var g = calGreg(_cal.cursor);
    var dow = (g.getDay() + 1) % 7; // 0=شنبه
    var startJ = toJalali(g.getFullYear(), g.getMonth() + 1, g.getDate());
    var start = { y: startJ[0], m: startJ[1], d: startJ[2] - dow };
    // نرمال‌سازی تاریخ
    function addDays(c, n) {
        var g2 = jalaliToGregorian(c.y, c.m, c.d);
        var d2 = new Date(g2[0], g2[1] - 1, g2[2]);
        d2.setDate(d2.getDate() + n);
        var j2 = toJalali(d2.getFullYear(), d2.getMonth() + 1, d2.getDate());
        return { y: j2[0], m: j2[1], d: j2[2] };
    }
    var byDate = {};
    events.forEach(function(e) { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

    var html = '<div class="calg-wgrid">';
    html += '<div class="calg-whead"></div>';
    for (var i = 0; i < 7; i++) {
        var c2 = addDays(start, i);
        var g3 = jalaliToGregorian(c2.y, c2.m, c2.d);
        var d3 = new Date(g3[0], g3[1] - 1, g3[2]);
        var isToday = (c2.y === today[0] && c2.m === today[1] && c2.d === today[2]);
        html += '<div class="calg-whead"' + (isToday ? ' style="background:#dbeafe"' : '') + '>'
             +  WEEKDAYS_FA[d3.getDay()].substring(0, 3) + ' ' + toFa(c2.d) + '</div>';
    }
    // سطرهای ساعت (فقط 8 تا 22)
    for (var h = 8; h <= 22; h++) {
        html += '<div class="calg-whour">' + toFa(h) + ':00</div>';
        for (var d4 = 0; d4 < 7; d4++) {
            var c3 = addDays(start, d4);
            var ds = c3.y + '/' + pad2(c3.m) + '/' + pad2(c3.d);
            var evs = (byDate[ds] || []).filter(function(e) { return !e.time || e.time.indexOf(pad2(h)) === 0; });
            html += '<div class="calg-wcell" data-date="' + ds + '" data-hour="' + h + '">';
            evs.forEach(function(e) {
                var cat = CAL_CATS[e.cat] || { color: '#999' };
                html += '<div class="wev" style="background:' + cat.color + '" data-ev="' + e.id + '">' + esc(e.title.substring(0, 22)) + '</div>';
            });
            html += '</div>';
        }
    }
    html += '</div>';
    return html;
}

/* -------- Day view -------- */
function calRenderDay(events) {
    var ds = c(_cal.cursor);
    var dayEvs = events.filter(function(e) { return e.date === ds; });
    var html = '<div class="calg-wgrid day">';
    html += '<div class="calg-whead"></div><div class="calg-whead">' + WEEKDAYS_FA[calGreg(_cal.cursor).getDay()] + ' ' + toFa(_cal.cursor.d) + '</div>';
    for (var h = 6; h <= 22; h++) {
        html += '<div class="calg-whour">' + toFa(h) + ':00</div>';
        html += '<div class="calg-wcell" data-date="' + ds + '" data-hour="' + h + '">';
        dayEvs.filter(function(e) { return !e.time || e.time.indexOf(pad2(h)) === 0; }).forEach(function(e) {
            var cat = CAL_CATS[e.cat] || { color: '#999' };
            html += '<div class="wev" style="background:' + cat.color + '" data-ev="' + e.id + '">' + esc(e.title) + '</div>';
        });
        html += '</div>';
    }
    html += '</div>';
    return html;
}

/* -------- Agenda -------- */
function calRenderAgenda(events) {
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var todayStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);
    var future = events.filter(function(e) { return e.date >= todayStr; });
    future.sort(function(a, b) { return compareVals(a.date, b.date); });
    var byDate = {};
    future.forEach(function(e) { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });
    var dates = Object.keys(byDate).sort();
    if (dates.length === 0) return '<div class="calg-empty">رویدادی در آینده نیست.</div>';
    var html = '<div class="calg-agenda">';
    dates.slice(0, 30).forEach(function(d) {
        var p = d.split('/').map(Number);
        var g2 = jalaliToGregorian(p[0], p[1], p[2]);
        var dt = new Date(g2[0], g2[1] - 1, g2[2]);
        var isToday = (d === todayStr);
        html += '<div class="calg-agday' + (isToday ? ' today' : '') + '">';
        html += '<h4>' + WEEKDAYS_FA[dt.getDay()] + '، ' + toFa(p[2]) + ' ' + JALALI_MONTHS[p[1] - 1] + ' ' + toFa(p[0]) + (isToday ? ' (امروز)' : '') + '</h4>';
        byDate[d].forEach(function(e) {
            var cat = CAL_CATS[e.cat] || { color: '#999' };
            html += '<div class="calg-agev" data-ev="' + e.id + '"><span class="adot" style="background:' + cat.color + '"></span><span class="atxt">' + esc(e.title) + (e.amount ? ' — ' + formatMoney(e.amount) : '') + '</span>' + (e.time ? '<span class="atime">' + e.time + '</span>' : '') + '</div>';
        });
        html += '</div>';
    });
    html += '</div>';
    return html;
}

/* -------- Events -------- */
function calBindEvents(active) {
    // navigation
    document.getElementById('calg-prev').onclick = function() {
        if (_cal.view === 'month') { _cal.cursor.m--; if (_cal.cursor.m < 1) { _cal.cursor.m = 12; _cal.cursor.y--; } }
        else if (_cal.view === 'week') { _cal.cursor = calAddDays(_cal.cursor, -7); }
        else if (_cal.view === 'day') { _cal.cursor = calAddDays(_cal.cursor, -1); }
        calRender();
    };
    document.getElementById('calg-next').onclick = function() {
        if (_cal.view === 'month') { _cal.cursor.m++; if (_cal.cursor.m > 12) { _cal.cursor.m = 1; _cal.cursor.y++; } }
        else if (_cal.view === 'week') { _cal.cursor = calAddDays(_cal.cursor, 7); }
        else if (_cal.view === 'day') { _cal.cursor = calAddDays(_cal.cursor, 1); }
        calRender();
    };
    document.getElementById('calg-today').onclick = function() {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        _cal.cursor = { y: t[0], m: t[1], d: t[2] };
        calRender();
    };
    document.getElementById('calg-new').onclick = function() { calOpenEventModal(null, c(_cal.cursor)); };

    // tabs
    document.querySelectorAll('.calg-tab').forEach(function(t) {
        t.onclick = function() { _cal.view = this.getAttribute('data-view'); calRender(); };
    });
    // legend
    document.querySelectorAll('.calg-legend input').forEach(function(cb) {
        cb.onchange = function() {
            _cal.filterCats[this.getAttribute('data-cat')] = this.checked;
            calRender();
        };
    });
    // cell click
    document.querySelectorAll('.calg-mcell, .calg-wcell').forEach(function(cell) {
        cell.onclick = function(e) {
            if (e.target.closest('.wev, .cev')) return;
            var ds = this.getAttribute('data-date');
            calOpenEventModal(null, ds);
        };
    });
    // event click
    document.querySelectorAll('[data-ev]').forEach(function(el) {
        el.onclick = function(e) {
            e.stopPropagation();
            var id = this.getAttribute('data-ev');
            var ev = active.find(function(x) { return x.id === id; });
            if (!ev) return;
            if (ev.readonly) {
                if (ev.cat === 'voucher' && typeof openVoucherForEditById === 'function') openVoucherForEditById(ev.ref);
                else if (ev.cat === 'note' && typeof openNoteView === 'function') openNoteView(ev.ref);
                else if (ev.cat === 'installment') { if (typeof goToPage === 'function') goToPage('facilities'); }
                else if (ev.cat === 'source') { if (typeof goToPage === 'function') goToPage('cashflow-sources'); }
                return;
            }
            calOpenEventModal(ev, null);
        };
    });
}

function calAddDays(c, n) {
    var g = jalaliToGregorian(c.y, c.m, c.d);
    var d = new Date(g[0], g[1] - 1, g[2]);
    d.setDate(d.getDate() + n);
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { y: j[0], m: j[1], d: j[2] };
}

/* -------- Event modal -------- */
function calOpenEventModal(ev, defaultDate) {
    var old = document.getElementById('calg-modal');
    if (old) old.remove();
    var oldO = document.getElementById('calg-modal-overlay');
    if (oldO) oldO.remove();

    var isNew = !ev;
    var title = isNew ? '＋ رویداد جدید' : '✎ ویرایش رویداد';

    var cats = ['personal','work','birthday','note'];
    var catPicker = cats.map(function(k) {
        var c = CAL_CATS[k];
        var active = (ev && ev.cat === k) || (!ev && k === 'personal') ? ' active' : '';
        return '<button type="button" class="' + active + '" data-cat="' + k + '" style="color:' + c.color + '">' + c.icon + ' ' + c.label + '</button>';
    }).join('');

    var html = ''
        + '<div id="calg-modal-overlay" class="calg-mo"></div>'
        + '<div id="calg-modal" class="calg-mp">'
        +   '<div class="calg-mph"><h3>' + title + '</h3><button id="calg-mclose">×</button></div>'
        +   '<div class="calg-mpb">'
        +     '<div class="calg-fld"><label>عنوان</label><input id="calg-ttl" value="' + (ev ? esc(ev.title) : '') + '"></div>'
        +     '<div class="calg-fld"><label>دسته‌بندی</label><div class="calg-cat-picker" id="calg-cats">' + catPicker + '</div></div>'
        +     '<div class="calg-2col">'
        +       '<div class="calg-fld"><label>تاریخ (شمسی)</label><input id="calg-date" class="date-picker" dir="ltr" value="' + (ev ? ev.date : (defaultDate || '')) + '"></div>'
        +       '<div class="calg-fld"><label>ساعت</label><input id="calg-time" dir="ltr" placeholder="14:30" value="' + (ev && ev.time ? ev.time : '') + '"></div>'
        +     '</div>'
        +     '<div class="calg-fld"><label>توضیحات</label><textarea id="calg-desc" rows="3">' + (ev && ev.desc ? esc(ev.desc) : '') + '</textarea></div>'
        +     '<div class="calg-fld"><label>یادآور (دقیقه قبل)</label><input id="calg-rem" type="number" placeholder="مثلاً 30" value="' + (ev && ev.reminder ? ev.reminder : '') + '"></div>'
        +   '</div>'
        +   '<div class="calg-mpf">'
        +     (ev ? '<button class="del" id="calg-del">حذف</button>' : '')
        +     '<button class="cancel" id="calg-cancel">انصراف</button>'
        +     '<button class="save" id="calg-save">💾 ذخیره</button>'
        +   '</div>'
        + '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    setTimeout(function() {
        if (typeof attachDatePickers === 'function') attachDatePickers();
    }, 50);

    var selectedCat = (ev && ev.cat) || 'personal';
    document.querySelectorAll('#calg-cats button').forEach(function(b) {
        b.onclick = function() {
            document.querySelectorAll('#calg-cats button').forEach(function(x) { x.classList.remove('active'); });
            this.classList.add('active');
            selectedCat = this.getAttribute('data-cat');
        };
    });

    function close() {
        var o = document.getElementById('calg-modal-overlay');
        var m = document.getElementById('calg-modal');
        if (o) o.classList.remove('show');
        if (m) m.classList.remove('show');
        setTimeout(function() { if (o) o.remove(); if (m) m.remove(); }, 250);
    }
    document.getElementById('calg-mclose').onclick = close;
    document.getElementById('calg-cancel').onclick = close;
    document.getElementById('calg-modal-overlay').onclick = close;

    document.getElementById('calg-save').onclick = function() {
        var t = document.getElementById('calg-ttl').value.trim();
        var d = normalizeDigits(document.getElementById('calg-date').value.trim());
        var tm = document.getElementById('calg-time').value.trim();
        var desc = document.getElementById('calg-desc').value.trim();
        var rem = Number(document.getElementById('calg-rem').value) || 0;
        if (!t) { alert('عنوان اجباری'); return; }
        if (!d) { alert('تاریخ اجباری'); return; }
        var list = calLoadUserEvents();
        var obj;
        if (ev && ev.id) {
            obj = { id: ev.id, cat: selectedCat, date: d, time: tm, title: t, desc: desc, reminder: rem };
            for (var i = 0; i < list.length; i++) if (list[i].id === ev.id) { list[i] = obj; break; }
        } else {
            obj = { id: 'u_' + uid(), cat: selectedCat, date: d, time: tm, title: t, desc: desc, reminder: rem, createdAt: Date.now() };
            list.push(obj);
        }
        calSaveUserEvents(list);
        close();
        calRender();
        showToast('✅ رویداد ذخیره شد');
    };

    if (ev) {
        document.getElementById('calg-del').onclick = function() {
            if (!confirm('رویداد حذف شود؟')) return;
            var list = calLoadUserEvents().filter(function(x) { return x.id !== ev.id; });
            calSaveUserEvents(list);
            close();
            calRender();
            showToast('🗑 حذف شد');
        };
    }

    setTimeout(function() {
        document.getElementById('calg-modal-overlay').classList.add('show');
        document.getElementById('calg-modal').classList.add('show');
    }, 10);
}

/* -------- Boot -------- */
(function calBoot() {
    function init() {
        calEnsurePage();
        // Patch goToPage
        if (!window._calPatched && typeof window.goToPage === 'function') {
            window._calPatched = true;
            var _orig = window.goToPage;
            window.goToPage = function(name) {
                _orig.apply(this, arguments);
                if (name === 'jalali-calendar') setTimeout(calRender, 80);
            };
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 900); });
    else setTimeout(init, 900);
})();

console.log('✅ ماژول تقویم شمسی v31 آماده');
