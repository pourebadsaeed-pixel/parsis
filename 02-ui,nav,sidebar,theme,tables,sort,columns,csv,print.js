/* =====================================================================
   پارسیس v27 — 02-ui,nav,sidebar,theme,tables,sort,columns,csv,print.js
   رابط کاربری: ناوبری، سایدبار، تب‌ها، تم، جدول‌ها، مرتب‌سازی، ستون‌ها
   ===================================================================== */
'use strict';

/* ==================== Form Usage / Frequent Nav ==================== */
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
    var entries = Object.keys(usage)
        .map(function(k) { return { page: k, count: usage[k] }; })
        .sort(function(a, b) { return b.count - a.count; })
        .slice(0, 6);
    if (entries.length === 0) { group.style.display = 'none'; return; }
    group.style.display = '';

    var meta = {
        'voucher-new':            { label:'✏️ صدور سند جدید' },
        'voucher-list':           { label:'📄 فهرست اسناد' },
        'persons':                { label:'👥 اشخاص' },
        'companies':              { label:'🏢 شرکت‌ها' },
        'bank-accounts':          { label:'🏦 حساب‌های بانکی' },
        'cash-boxes':             { label:'💰 صندوق‌ها' },
        'projects':               { label:'📁 پروژه‌ها' },
        'notes':                  { label:'📔 یادداشت‌ها' },
        'dashboard':              { label:'🎯 داشبورد مالی' },
        'report-cashflow':        { label:'💵 وضعیت نقدینگی' },
        'report-cashflow-desc':   { label:'💸 گردش وجه نقد' },
        'report-account':         { label:'📒 مرور حساب‌ها' },
        'report-trial':           { label:'⚖️ تراز آزمایشی' },
        'report-incomplete':      { label:'🔍 تراکنش‌های تکمیل نشده' },
        'report-facility':        { label:'🏦 خلاصه تسهیلات' },
        'report-facility-full':   { label:'📊 گزارش جامع تسهیلات' },
        'report-rates':           { label:'📈 نرخ ارز و طلا' },
        'report-compare':         { label:'📊 گزارش مقایسه‌ای' },
        'facilities':             { label:'🏦 تسهیلات' },
        'chart-define':           { label:'✏️ تعریف حساب‌ها' },
        'sms':                    { label:'📱 پیامک بانکی' },
        'templates':              { label:'🧩 الگوها' },
        'fiscal':                 { label:'📅 دوره مالی' },
        'estimate-daily':         { label:'📝 برآورد هزینه‌ها' },
        'cashflow-sources':       { label:'📌 منابع دریافتنی' },
        'daily-close':            { label:'📅 قیمت پایانی روز' },
        'language':               { label:'🌐 زبان' },
        'account-types':          { label:'📑 لیست نوع حساب' },
        'bank-types':             { label:'🏦 انواع حساب بانکی' },
        'cash-types':             { label:'💰 انواع صندوق' },
        'currency':               { label:'💱 ارز و واحد پول' }
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
        var m = meta[e.page] || { label: '📄 ' + e.page };
        var b = document.createElement('button');
        b.setAttribute('data-page', e.page);
        b.innerHTML = '<span>' + m.label + '</span><span class="count-badge" style="padding:2px 8px;font-size:0.7rem">' + toFa(e.count) + '</span>';
        b.addEventListener('click', function() { goToPage(e.page); });
        container.appendChild(b);
    });
}

/* ==================== Sidebar ==================== */
function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}
function closeSettings() {
    document.getElementById('settings-modal').classList.remove('show');
    document.getElementById('settings-overlay').classList.remove('show');
}

/* ==================== goToPage ==================== */
function goToPage(name) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    var target = document.getElementById('page-' + name);
    if (target) target.classList.add('active');
    var btns = document.querySelectorAll('.nav-group-items button');
    for (var j = 0; j < btns.length; j++) {
        btns[j].classList.toggle('active', btns[j].getAttribute('data-page') === name);
    }
    closeSidebar();
    trackFormUsage(name);

    var dispatch = {
        'chart-define': function() { renderChartTree('chart-tree', true); },
        'voucher-list': function() { refreshPeriodFilters(); renderVoucherList(); },
        'voucher-new': function() { refreshTemplateSelect(); if (voucherLines.length === 0) newVoucherForm(); else renderVoucherLines(); },
        'templates': function() { renderTemplateList(); renderTemplateLines(); renderStdDescChips(); refreshStdDescDatalist(); },
        'notes': function() { renderNotesList(); },
        'sms': function() { renderSmsInbox(); updateSmsBadge(); checkClipboardSupport(); },
        'fiscal': function() { renderFiscalList(); },
        'persons': function() { renderPersonsList(); },
        'companies': function() { renderCompaniesList(); },
        'bank-accounts': function() { renderBankAccountsList(); refreshBankTypeSelect(); },
        'cash-boxes': function() { renderCashBoxesList(); refreshCashTypeSelect(); },
        'projects': function() { renderProjectsList(); },
        'estimate-daily': function() { refreshEstPeriodSelect(); renderEstimateList(); },
        'cashflow-sources': function() { refreshCfsMoeinSelect(); renderCfsList(); },
        'facilities': function() { renderFacilitiesList(); refreshFacBankSelect(); },
        'dashboard': function() { renderDashboard(); },
        'report-cashflow': function() {
            if (!document.getElementById('cf-from').value) {
                var t = todayJalaliStr();
                document.getElementById('cf-from').value = t;
                document.getElementById('cf-to').value = addJalaliDays(t, 30);
            }
            runCashFlowReport();
        },
        'report-cashflow-desc': function() {
            if (!document.getElementById('cfd-from').value) {
                var t2 = todayJalaliStr();
                document.getElementById('cfd-from').value = t2;
                document.getElementById('cfd-to').value = addJalaliDays(t2, 30);
            }
            runCashFlowByDescReport();
        },
        'report-account': function() { refreshReportPeriodSelects(); updateUnitChips(); },
        'report-trial': function() { refreshReportPeriodSelects(); updateUnitChips(); },
        'report-incomplete': function() { refreshReportPeriodSelects(); updateUnitChips(); runIncompleteReport(); },
        'report-facility': function() { runFacilityReport(); },
        'report-facility-full': function() { refreshRffBankSelect(); runFacilityFullReport(); },
        'report-rates': function() { runRatesReport(); },
        'report-compare': function() {
            if (!document.getElementById('rc-from1').value) {
                var t3 = todayJalaliStr();
                var y = t3.split('/')[0];
                document.getElementById('rc-from1').value = y + '/01/01';
                document.getElementById('rc-to1').value   = y + '/06/31';
                document.getElementById('rc-from2').value = y + '/07/01';
                document.getElementById('rc-to2').value   = t3;
            }
            runComparisonReport();
        },
        'daily-close': function() { renderDailyClosePage(); },
        'home': function() { updateHomeWidgets(); }
    };
    if (dispatch[name]) dispatch[name]();

    attachDatePickers();
    updateTopbarPeriod();
    applyColVisibilityAll();
    makeAllTablesResizable();
    buildHeaderButtons();
    updateEyeButtons();
    if (typeof attachFilterRowsToAllTables === 'function') attachFilterRowsToAllTables();
    if (typeof window._enhanceGlobalSorting === 'function') window._enhanceGlobalSorting();
    if (typeof buildShareButtons === 'function') setTimeout(buildShareButtons, 80);
}

function updateUnitChips() {
    ['ra-unit','rt-unit','rf-unit','ri-unit','rff-unit','cf-unit','cfd-unit','rr-unit','dc-unit','rc-unit'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = 'واحد: ' + currencyLabel();
    });
}

/* ==================== Theme & Font ==================== */
function applyTheme(theme) {
    document.body.classList.remove('theme-sky','theme-beige','theme-jade','theme-ocean','theme-sunset','theme-forest','theme-midnight','theme-glass3d','theme-neu3d','theme-cyber3d','theme-gold3d');
    document.body.classList.add('theme-' + theme);
    var c = document.querySelectorAll('.theme-card');
    for (var i = 0; i < c.length; i++) c[i].classList.toggle('active', c[i].getAttribute('data-theme') === theme);
}
function applyFont(font) {
    document.body.classList.remove('font-bnazanin','font-bsans','font-tahoma');
    document.body.classList.add('font-' + font);
    var c = document.querySelectorAll('.font-card');
    for (var i = 0; i < c.length; i++) c[i].classList.toggle('active', c[i].getAttribute('data-font') === font);
}

/* ==================== Chips ==================== */
function renderChips(cid, arr, sk) {
    var box = document.getElementById(cid);
    if (!box) return;
    box.innerHTML = '';
    for (var i = 0; i < arr.length; i++) {
        var chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = esc(arr[i]) + ' <button class="chip-del" data-i="' + i + '">×</button>';
        box.appendChild(chip);
    }
    var d = box.querySelectorAll('.chip-del');
    for (var j = 0; j < d.length; j++) {
        d[j].addEventListener('click', function() {
            var idx = Number(this.getAttribute('data-i'));
            state[sk].splice(idx, 1);
            saveState(sk);
            renderChips(cid, state[sk], sk);
        });
    }
}

/* ==================== Tabs ==================== */
function setupTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function() {
            var tn = this.getAttribute('data-tab');
            if (!tn) return;
            var parent = this.parentElement;
            var tbs = parent.querySelectorAll('.tab-btn');
            for (var j = 0; j < tbs.length; j++) tbs[j].classList.remove('active');
            this.classList.add('active');
            var sec = parent.parentElement;
            var cs = sec.querySelectorAll('.tab-content');
            for (var k = 0; k < cs.length; k++) cs[k].classList.remove('active');
            var target = document.getElementById('tab-' + tn);
            if (target) target.classList.add('active');
            attachDatePickers();
        });
    }
}

/* ==================== Topbar ==================== */
function updateTopbarPeriod() {
    var el = document.getElementById('topbar-period');
    if (!el) return;
    var list = DB.load('fiscalPeriods', []);
    var p = list.find(function(x) { return x.id === state.activePeriodId; });
    el.textContent = p ? p.title : 'دوره: —';
}

/* ==================== Sidebar Search ==================== */
function initSidebarSearch() {
    var inp = document.getElementById('sidebar-search-input');
    if (!inp) return;
    inp.addEventListener('input', function() {
        var q = this.value.trim().toLowerCase();
        var groups = document.querySelectorAll('#sidebar-nav .nav-group');
        for (var i = 0; i < groups.length; i++) {
            var btns = groups[i].querySelectorAll('.nav-group-items button');
            var anyMatch = false;
            for (var j = 0; j < btns.length; j++) {
                var txt = btns[j].textContent.toLowerCase();
                var match = !q || txt.indexOf(q) !== -1;
                btns[j].style.display = match ? '' : 'none';
                if (match) anyMatch = true;
            }
            groups[i].style.display = anyMatch ? '' : 'none';
            if (q && anyMatch) groups[i].classList.remove('collapsed');
        }
    });
}

/* ==================== Home swipe ==================== */
function initHomeSwipe() {
    var grid = document.getElementById('home-grid');
    if (!grid) return;
    var startX = 0, startY = 0, tracking = false;
    grid.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = true;
    }, { passive: true });
    grid.addEventListener('touchend', function(e) {
        if (!tracking) return;
        tracking = false;
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx < 0) { if (state.homePage < 3) { state.homePage++; saveState('homePage'); applyWidgetVisibility(); } }
        else { if (state.homePage > 1) { state.homePage--; saveState('homePage'); applyWidgetVisibility(); } }
    }, { passive: true });
}

/* =====================================================================
   ============ Table resize (نسخه اصلاح‌شده — بدون minWidth) ============
   ===================================================================== */
var colWidths = DB.load('colWidths', {});
function saveColWidths() { DB.save('colWidths', colWidths); }

function applyColWidths(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var widths = colWidths[tableId] || [];
    var ths = table.querySelectorAll('thead th');
    for (var i = 0; i < ths.length; i++) {
        if (widths[i]) {
            ths[i].style.width = widths[i] + 'px';
        } else {
            ths[i].style.width = '';
        }
        ths[i].style.minWidth = '';
        ths[i].style.maxWidth = '';
    }
    table.style.minWidth = '';
}

function updateTableMinWidth(table) {
    if (!table) return;
    table.style.minWidth = '';
}

function makeTableResizable(table) {
    if (!table || table.dataset.resizable === '1') return;
    table.dataset.resizable = '1';
    var tableId = table.id;
    if (!tableId) return;

    var MIN_W = 50;
    var MAX_W = 600;
    var ths = table.querySelectorAll('thead th');

    for (var i = 0; i < ths.length; i++) {
        (function(th, idx) {
            if (th.querySelector('.col-resizer')) return;
            var res = document.createElement('div');
            res.className = 'col-resizer';
            res.title = 'بکش تا عرض تغییر کند • دابل‌کلیک: بازنشانی این ستون';
            th.appendChild(res);

            var startX = 0, startW = 0, isDragging = false;

            function start(x) {
                isDragging = true;
                startX = x;
                startW = th.offsetWidth;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                document.body.classList.add('resizing-cols');
            }
            function move(x) {
                if (!isDragging) return;
                var diff = startX - x;
                var w = Math.max(MIN_W, Math.min(MAX_W, startW + diff));
                th.style.width = w + 'px';
                th.style.minWidth = '';
                th.style.maxWidth = '';
            }
            function end() {
                if (!isDragging) return;
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.body.classList.remove('resizing-cols');
                if (!colWidths[tableId]) colWidths[tableId] = [];
                colWidths[tableId][idx] = th.offsetWidth;
                saveColWidths();
            }

            res.addEventListener('dblclick', function(e) {
                e.preventDefault(); e.stopPropagation();
                th.style.width = '';
                th.style.minWidth = '';
                th.style.maxWidth = '';
                if (colWidths[tableId]) {
                    delete colWidths[tableId][idx];
                    saveColWidths();
                }
                showToast('↔ عرض ستون بازنشانی شد.');
            });

            res.addEventListener('click', function(e) { e.stopPropagation(); });
            res.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                start(e.pageX);
            });
            res.addEventListener('touchstart', function(e) {
                e.preventDefault(); e.stopPropagation();
                start(e.touches[0].pageX);
            }, { passive: false });

            document.addEventListener('mousemove', function(e) {
                if (isDragging) move(e.pageX);
            });
            document.addEventListener('mouseup', end);
            document.addEventListener('touchmove', function(e) {
                if (isDragging) { move(e.touches[0].pageX); e.preventDefault(); }
            }, { passive: false });
            document.addEventListener('touchend', end);
        })(ths[i], i);
    }
    applyColWidths(tableId);
}

/* ★ بازنشانی همه عرض ستون‌ها */
function resetColumnWidths(tableId) {
    if (!tableId) return;
    delete colWidths[tableId];
    saveColWidths();
    var table = document.getElementById(tableId);
    if (!table) return;
    var ths = table.querySelectorAll('thead th');
    for (var i = 0; i < ths.length; i++) {
        ths[i].style.width = '';
        ths[i].style.minWidth = '';
        ths[i].style.maxWidth = '';
    }
    table.style.minWidth = '';
    table.style.width = '';
    showToast('↔ عرض ستون‌ها فیت شد.');
}

/* ==================== Column visibility ==================== */
var colSettings = DB.load('columnSettings', {});
function getHiddenCols(tableId) { return colSettings[tableId] || []; }
function setHiddenCols(tableId, arr) { colSettings[tableId] = arr; DB.save('columnSettings', colSettings); }
function applyColVisibility(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var hidden = getHiddenCols(tableId);
    var rows = table.querySelectorAll('tr');
    for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].children;
        if (cells.length === 1 && cells[0].hasAttribute('colspan')) continue;
        for (var c = 0; c < cells.length; c++) cells[c].style.display = hidden.indexOf(c) !== -1 ? 'none' : '';
    }
    updateTableMinWidth(table);
}
function applyColVisibilityAll() {
    ['fiscal-table','persons-table','comp-table','ba-table','cb-table','proj-table','voucher-table-list','rt-table','ri-table','rf-table','rff-table','cfs-table','rr-table','cf-table','cfd-table','dc-table','rc-table'].forEach(applyColVisibility);
}
function makeAllTablesResizable() {
    ['fiscal-table','persons-table','comp-table','ba-table','cb-table','proj-table','voucher-table-list','rt-table','ri-table','rf-table','rff-table','cfs-table','cf-table','cfd-table','rr-table','dc-table','turnover-table','rc-table'].forEach(function(id) {
        var t = document.getElementById(id); if (t) makeTableResizable(t);
    });
}

/* =====================================================================
   ============ Column menu popup (اصلاح‌شده) ============
   ===================================================================== */
function showColMenu(tableId, btn) {
    var menu = document.getElementById('col-menu');
    if (!menu) return;
    var table = document.getElementById(tableId);
    if (!table) return;
    var thead = table.querySelector('thead');
    if (!thead) return;

    /* ★ فقط ردیف اصلی هدر، نه ردیف فیلترها */
    var headerRow = thead.querySelector('tr:not(.column-filter-row)');
    if (!headerRow) return;
    var ths = headerRow.querySelectorAll('th');

    var hidden = getHiddenCols(tableId);
    var html = '<div class="col-menu-head">👁 نمایش ستون‌ها</div><div class="col-menu-body">';
    for (var i = 0; i < ths.length; i++) {
        var th = ths[i];
        var label = String(th.textContent || '').replace(/[⇅▲▼]/g, '').trim() || ('ستون ' + (i+1));
        var checked = hidden.indexOf(i) === -1 ? 'checked' : '';
        html += '<label class="col-menu-item"><input type="checkbox" data-table="' + tableId + '" data-col="' + i + '" ' + checked + '><span>' + esc(label) + '</span></label>';
    }
    html += '</div><div class="col-menu-foot"><button type="button" class="col-menu-reset">بازنشانی</button><button type="button" class="col-menu-close">بستن</button></div>';
    menu.innerHTML = html;
    menu.classList.remove('hidden');
    var rect = btn.getBoundingClientRect();
    var menuW = 220;
    var top = rect.bottom + window.scrollY + 6;
    var left = rect.left + window.scrollX - menuW + rect.width;
    if (left < 8) left = 8;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.querySelectorAll('input[type=checkbox]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var tid = this.getAttribute('data-table');
            var idx = Number(this.getAttribute('data-col'));
            var h = getHiddenCols(tid).slice();
            if (this.checked) h = h.filter(function(x) { return x !== idx; });
            else if (h.indexOf(idx) === -1) h.push(idx);
            setHiddenCols(tid, h);
            applyColVisibility(tid);
        });
    });
    menu.querySelector('.col-menu-reset').addEventListener('click', function() {
        setHiddenCols(tableId, []); applyColVisibility(tableId); showColMenu(tableId, btn);
    });
    menu.querySelector('.col-menu-close').addEventListener('click', function() { menu.classList.add('hidden'); });
}
document.addEventListener('click', function(e) {
    var menu = document.getElementById('col-menu');
    if (!menu || menu.classList.contains('hidden')) return;
    if (menu.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.col-toggle-btn')) return;
    menu.classList.add('hidden');
});

/* ==================== Sort helpers ==================== */
var sortState = {
    vouchers: { col: 'number', dir: 'desc' },
    facilities: { col: 'name', dir: 'asc' },
    rf: { col: 'name', dir: 'asc' },
    rff: { col: 'name', dir: 'asc' }
};
function compareVals(a, b) {
    if (a === undefined || a === null) a = '';
    if (b === undefined || b === null) b = '';
    if (typeof a === 'string' && typeof b === 'string') {
        var na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb) && a.trim() === String(na) && b.trim() === String(nb)) return na - nb;
        return a.localeCompare(b, 'fa');
    }
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'fa');
}
var tableSortState = DB.load('tableSortState', {});
function saveTableSortState() { DB.save('tableSortState', tableSortState); }
function applySortIndicator(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var ths = table.querySelectorAll('thead th[data-sort-key]');
    var st = tableSortState[tableId];
    for (var i = 0; i < ths.length; i++) {
        var ind = ths[i].querySelector('.sort-ind');
        if (!ind) continue;
        var k = ths[i].getAttribute('data-sort-key');
        if (st && st.col === k) { ind.textContent = st.dir === 'asc' ? '▲' : '▼'; ind.classList.add('active'); }
        else { ind.textContent = '⇅'; ind.classList.remove('active'); }
    }
}
function attachTableSorting(tableId, rerender) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var ths = table.querySelectorAll('thead th[data-sortable]');
    for (var i = 0; i < ths.length; i++) {
        (function(th) {
            if (th.dataset.sortAttached) return;
            th.dataset.sortAttached = '1';
            th.addEventListener('click', function(e) {
                if (e.target.classList.contains('col-resizer')) return;
                var k = th.getAttribute('data-sort-key');
                if (!k) return;
                var st = tableSortState[tableId] || { col: k, dir: 'asc' };
                if (st.col === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
                else { st.col = k; st.dir = 'asc'; }
                tableSortState[tableId] = st;
                saveTableSortState();
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

/* ==================== buildHeaderButtons ==================== */
function buildHeaderButtons() {
    var headers = document.querySelectorAll('.list-header');
    for (var i = 0; i < headers.length; i++) {
        (function(h) {
            var tableId = h.getAttribute('data-col-table');
            var hideKey = h.getAttribute('data-hide-key');
            if (hideKey && !h.querySelector('.eye-toggle-btn')) {
                var eye = document.createElement('button');
                eye.type = 'button';
                eye.className = 'eye-toggle-btn';
                eye.setAttribute('data-hide-key', hideKey);
                eye.addEventListener('click', function(ev) { ev.stopPropagation(); toggleHideState(hideKey); rerenderCurrentPage(); });
                h.appendChild(eye);
            }
            if (tableId && !h.querySelector('.col-reset-btn')) {
                var rBtn = document.createElement('button');
                rBtn.type = 'button';
                rBtn.className = 'col-reset-btn';
                rBtn.title = 'فیت کردن عرض ستون‌ها';
                rBtn.innerHTML = '↔';
                rBtn.addEventListener('click', function(ev) {
                    ev.stopPropagation();
                    resetColumnWidths(tableId);
                });
                h.appendChild(rBtn);
            }
            if (tableId && !h.querySelector('.col-toggle-btn')) {
                var btn = document.createElement('button');
                btn.className = 'col-toggle-btn';
                btn.type = 'button';
                btn.title = 'ستون‌ها';
                btn.innerHTML = '⚙';
                btn.addEventListener('click', function(ev) { ev.stopPropagation(); showColMenu(tableId, btn); });
                h.appendChild(btn);
            }
        })(headers[i]);
    }
    updateEyeButtons();
}

/* ==================== Auto attach helpers ==================== */
function autoAttachReportHelpers() {
    setTimeout(function() {
        makeAllTablesResizable();
        ['cf-table','cfd-table','rt-table','ri-table','rf-table','rff-table','rr-table','dc-table','turnover-table','rc-table'].forEach(function(id) {
            var t = document.getElementById(id);
            if (t) applyColVisibility(id);
        });
        buildHeaderButtons();
        attachDatePickers();
        if (typeof attachFilterRowsToAllTables === 'function') attachFilterRowsToAllTables();
        if (typeof window._enhanceGlobalSorting === 'function') window._enhanceGlobalSorting();
        if (typeof buildShareButtons === 'function') buildShareButtons();
    }, 60);
}

/* ==================== Rerender current page ==================== */
function rerenderCurrentPage() {
    var active = document.querySelector('.page.active');
    if (!active) return;
    var id = active.id.replace('page-', '');
    var map = {
        'persons': 'renderPersonsList',
        'companies': 'renderCompaniesList',
        'bank-accounts': 'renderBankAccountsList',
        'cash-boxes': 'renderCashBoxesList',
        'projects': 'renderProjectsList',
        'fiscal': 'renderFiscalList',
        'voucher-list': 'renderVoucherList',
        'estimate-daily': 'renderEstimateList',
        'cashflow-sources': 'renderCfsList',
        'facilities': 'renderFacilitiesList',
        'report-cashflow': 'runCashFlowReport',
        'report-cashflow-desc': 'runCashFlowByDescReport',
        'report-account': 'runAccountReport',
        'report-trial': 'runTrialBalance',
        'report-incomplete': 'runIncompleteReport',
        'report-facility': 'runFacilityReport',
        'report-facility-full': 'runFacilityFullReport',
        'report-rates': 'runRatesReport',
        'report-compare': 'runComparisonReport',
        'daily-close': 'renderDailyCloseHistory',
        'notes': 'renderNotesList',
        'dashboard': 'renderDashboard',
        'home': 'updateHomeWidgets'
    };
    var fnName = map[id];
    if (fnName && typeof window[fnName] === 'function') window[fnName]();
}

/* =====================================================================
   ============ ۱۳) جستجو/فیلتر پیشرفته در ستون‌ها ============
   ===================================================================== */
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
        if (tds.length === 1 && tds[0].hasAttribute('colspan')) { tr.style.display = 'none'; return; }
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
    var headerRow = thead.querySelector('tr:not(.column-filter-row)');
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
                    if (!cur || (cur.op !== 'empty' && cur.op !== 'notEmpty')) {
                        delete COLUMN_FILTERS[table.id][idx];
                    }
                } else {
                    var cur2 = COLUMN_FILTERS[table.id][idx] || {};
                    COLUMN_FILTERS[table.id][idx] = { op: cur2.op || 'contains', val: v };
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
            } else {
                anchor.style.background = 'var(--primary-soft)';
                anchor.style.color = 'var(--primary-dark)';
                anchor.textContent = '▼';
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

/* =====================================================================
   ============ ۱۴) مرتب‌سازی سراسری ============
   ===================================================================== */
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
            var headerRow = t.querySelector('thead tr:not(.column-filter-row)');
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

/* =====================================================================
   ============ ۱۵) مخفی‌سازی ردیف فیلتر + حذف از پرینت ============
   ===================================================================== */
(function () {
    var STORAGE_KEY = 'parsis.tableFiltersVisible';

    var css = ''
        + 'tr.column-filter-row { display: none; }'
        + 'body.show-table-filters tr.column-filter-row { display: table-row; }'
        + '.filters-toggle-btn {'
        +   'background: var(--card-solid); color: var(--primary-dark);'
        +   'border: 1.5px solid var(--border); width: 36px; height: 34px;'
        +   'border-radius: 10px; font-size: 1rem; cursor: pointer; padding: 0;'
        +   'display: inline-flex; align-items: center; justify-content: center;'
        +   'transition: all 0.25s;'
        + '}'
        + '.filters-toggle-btn:hover { border-color: var(--primary); background: var(--primary-soft); }'
        + '.filters-toggle-btn.active { background: var(--gradient-accent); color: #fff; border-color: transparent; }'
        + 'body.show-table-filters .filters-toggle-btn {'
        +   'background: var(--gradient-accent); color: #fff; border-color: transparent;'
        + '}'
        + '@media print { tr.column-filter-row, .filters-toggle-btn { display: none !important; } }';
    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    function isActionsHeader(th) {
        if (!th) return true;
        var txt = (th.textContent || '').trim().toLowerCase();
        if (!txt) return true;
        if (/^عملیات|^actions?$|^action$/.test(txt)) return true;
        return false;
    }
    function cleanActionsColumn() {
        var rows = document.querySelectorAll('tr.column-filter-row');
        rows.forEach(function (row) {
            var thead = row.parentNode;
            if (!thead) return;
            var headerRow = null;
            var allTrs = thead.querySelectorAll('tr');
            for (var i = 0; i < allTrs.length; i++) {
                if (!allTrs[i].classList.contains('column-filter-row')) {
                    headerRow = allTrs[i]; break;
                }
            }
            if (!headerRow) return;
            var headerThs = headerRow.children;
            var cells = row.children;
            for (var j = 0; j < cells.length; j++) {
                if (isActionsHeader(headerThs[j])) {
                    cells[j].innerHTML = '';
                    cells[j].style.background = 'transparent';
                    cells[j].style.borderBottom = '1px solid var(--border)';
                    cells[j].style.padding = '0';
                    cells[j].style.minWidth = '0';
                }
            }
        });
    }

    function addToggleButtons() {
        var headers = document.querySelectorAll('.list-header');
        headers.forEach(function (h) {
            if (h.querySelector('.filters-toggle-btn')) return;
            var card = h.closest('.card');
            if (card && !card.querySelector('table.data-table, table.report-table, table.cf-table')) return;

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filters-toggle-btn';
            btn.textContent = '🔍';
            btn.title = 'نمایش/مخفی کردن ردیف فیلترها';
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var visible = document.body.classList.toggle('show-table-filters');
                try { localStorage.setItem(STORAGE_KEY, visible ? '1' : '0'); } catch (err) {}
                updateButtons();
            });
            h.appendChild(btn);
        });
        updateButtons();
    }
    function updateButtons() {
        var visible = document.body.classList.contains('show-table-filters');
        document.querySelectorAll('.filters-toggle-btn').forEach(function (b) {
            b.classList.toggle('active', visible);
        });
    }

    function restoreState() {
        try {
            if (localStorage.getItem(STORAGE_KEY) === '1') {
                document.body.classList.add('show-table-filters');
            }
        } catch (err) {}
        updateButtons();
    }

    var observer = null;
    function startObserver() {
        if (observer) return;
        observer = new MutationObserver(function (mutations) {
            var needsClean = false;
            var needsBtn = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type !== 'childList') continue;
                var t = m.target;
                if (!t || !t.querySelector) continue;
                if (t.tagName === 'THEAD' || t.querySelector('tr.column-filter-row')) {
                    needsClean = true;
                }
                if (t.classList && t.classList.contains('list-header')) {
                    needsBtn = true;
                }
                if (t.querySelector && t.querySelector('.list-header')) {
                    needsBtn = true;
                }
            }
            if (needsClean) setTimeout(cleanActionsColumn, 50);
            if (needsBtn) setTimeout(addToggleButtons, 50);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function init13() {
        restoreState();
        cleanActionsColumn();
        addToggleButtons();
        startObserver();
        setInterval(function () {
            cleanActionsColumn();
            addToggleButtons();
        }, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init13, 1200); });
    } else {
        setTimeout(init13, 1200);
    }
})();

/* =====================================================================
   ============ ۱۶) تب‌های فرم و دکمه «بستن همه فرم‌ها» ============
   ===================================================================== */
(function () {
    var css = ''
        + '.form-tabs-bar{display:flex;gap:4px;padding:6px 10px;background:var(--card-solid);'
        + 'border-bottom:1px solid var(--border);overflow-x:auto;overflow-y:hidden;'
        + 'position:sticky;z-index:49;scrollbar-width:thin;-webkit-overflow-scrolling:touch;'
        + 'box-shadow:0 2px 6px rgba(15,23,42,.04)}'
        + '.form-tabs-bar::-webkit-scrollbar{height:4px}'
        + '.form-tabs-bar::-webkit-scrollbar-thumb{background:var(--primary-light);border-radius:2px}'
        + '.form-tab{display:flex;align-items:center;gap:6px;padding:6px 10px;'
        + 'background:var(--card-alt);border:1px solid var(--border);border-radius:8px;'
        + 'font-family:inherit;font-size:.78rem;font-weight:700;color:var(--text-muted);'
        + 'cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .2s;'
        + 'user-select:none;max-width:220px}'
        + '.form-tab:hover{background:var(--primary-soft);border-color:var(--primary);color:var(--primary-dark);transform:translateY(-1px)}'
        + '.form-tab.active{background:var(--gradient-accent);color:#fff;border-color:transparent;'
        + 'box-shadow:0 2px 8px rgba(99,102,241,.25)}'
        + '.form-tab .ft-icon{font-size:.9rem;line-height:1}'
        + '.form-tab .ft-title{overflow:hidden;text-overflow:ellipsis;max-width:130px}'
        + '.form-tab .ft-close{background:rgba(0,0,0,.08);color:inherit;border:none;'
        + 'width:18px;height:18px;border-radius:4px;font-size:.9rem;line-height:1;'
        + 'cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;'
        + 'margin-right:-4px;transition:background .15s}'
        + '.form-tab.active .ft-close{background:rgba(255,255,255,.25)}'
        + '.form-tab .ft-close:hover{background:rgba(220,38,38,.85);color:#fff}'
        + '@media (max-width:480px){'
        + '.form-tab .ft-title{max-width:80px}'
        + '.form-tab{padding:5px 8px;font-size:.72rem}'
        + '}';
    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    var TAB_STATE = {
        tabs: [{ id: 'home', title: 'صفحه اصلی', icon: '🏠' }],
        active: 'home',
        max: 12
    };

    function getPageMeta(pageId) {
        if (pageId === 'home') return { title: 'صفحه اصلی', icon: '🏠' };
        var btn = document.querySelector('.nav-group-items button[data-page="' + pageId + '"]');
        if (!btn) return { title: pageId, icon: '📄' };
        var clone = btn.cloneNode(true);
        var badge = clone.querySelector('.nav-badge');
        if (badge) badge.remove();
        var txt = (clone.textContent || '').trim().replace(/\s+/g, ' ');
        if (!txt) return { title: pageId, icon: '📄' };
        var parts = txt.split(' ');
        var icon = parts[0];
        var title = parts.slice(1).join(' ') || txt;
        var cc = icon && icon.charCodeAt(0);
        if (!cc || cc < 0x2000) { icon = '📄'; title = txt; }
        return { title: title, icon: icon };
    }
    function hasUnsavedData(pageId) {
        if (pageId === 'voucher-new') {
            try {
                var desc = document.getElementById('v-desc');
                if (desc && desc.value && desc.value.trim()) return true;
                if (typeof voucherLines !== 'undefined' && Array.isArray(voucherLines)) {
                    var meaningful = voucherLines.filter(function (l) {
                        if (!l) return false;
                        if (l.account) return true;
                        if (Number(l.debit) > 0) return true;
                        if (Number(l.credit) > 0) return true;
                        if (l.description && String(l.description).trim()) return true;
                        return false;
                    });
                    return meaningful.length > 0;
                }
            } catch (e) {}
        }
        return false;
    }
    function clearFormData(pageId) {
        if (pageId === 'voucher-new') {
            try {
                if (typeof newVoucherForm === 'function') newVoucherForm();
            } catch (e) { console.warn('clearFormData error:', e); }
        }
    }

    function ensureTabBar() {
        var bar = document.getElementById('form-tabs-bar');
        if (bar) return bar;
        var topbar = document.querySelector('.topbar');
        if (!topbar) return null;
        bar = document.createElement('div');
        bar.id = 'form-tabs-bar';
        bar.className = 'form-tabs-bar';
        bar.style.display = 'none';
        topbar.parentNode.insertBefore(bar, topbar.nextSibling);
        function setStickyTop() {
            try { bar.style.top = topbar.offsetHeight + 'px'; } catch (e) {}
        }
        setStickyTop();
        window.addEventListener('resize', setStickyTop);
        return bar;
    }
    function renderTabs() {
        var bar = ensureTabBar();
        if (!bar) return;
        if (TAB_STATE.tabs.length <= 1) {
            bar.style.display = 'none';
            return;
        }
        bar.style.display = '';
        bar.innerHTML = '';

        TAB_STATE.tabs.forEach(function (t) {
            var tab = document.createElement('div');
            tab.className = 'form-tab' + (t.id === TAB_STATE.active ? ' active' : '');
            tab.dataset.page = t.id;
            tab.title = t.title;

            var icon = document.createElement('span');
            icon.className = 'ft-icon';
            icon.textContent = t.icon || '📄';

            var title = document.createElement('span');
            title.className = 'ft-title';
            title.textContent = t.title || t.id;

            tab.appendChild(icon);
            tab.appendChild(title);

            if (t.id !== 'home') {
                var closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'ft-close';
                closeBtn.textContent = '×';
                closeBtn.title = 'بستن این تب';
                closeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    closeTab(t.id);
                });
                tab.appendChild(closeBtn);
            }

            tab.addEventListener('click', function () {
                if (TAB_STATE.active === t.id) return;
                switchToTab(t.id);
            });

            bar.appendChild(tab);
        });

        setTimeout(function () {
            var activeEl = bar.querySelector('.form-tab.active');
            if (activeEl && activeEl.scrollIntoView) {
                try { activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
            }
        }, 30);
    }
    function switchToTab(pageId) {
        var orig = window._origGoToPage;
        if (typeof orig === 'function') orig(pageId);
        TAB_STATE.active = pageId;
        renderTabs();
    }
    function closeTab(pageId) {
        if (pageId === 'home') return;
        var idx = -1;
        for (var i = 0; i < TAB_STATE.tabs.length; i++) {
            if (TAB_STATE.tabs[i].id === pageId) { idx = i; break; }
        }
        if (idx === -1) return;

        if (hasUnsavedData(pageId)) {
            if (!confirm('این فرم داده‌های ذخیره‌نشده دارد.\n\nOK = بستن و از دست دادن داده‌ها\nCancel = انصراف')) return;
            clearFormData(pageId);
        }

        var wasActive = TAB_STATE.active === pageId;
        TAB_STATE.tabs.splice(idx, 1);

        if (wasActive) {
            var prevIdx = Math.min(idx - 1, TAB_STATE.tabs.length - 1);
            if (prevIdx < 0) prevIdx = 0;
            var prev = TAB_STATE.tabs[prevIdx];
            if (prev) { switchToTab(prev.id); return; }
        }
        renderTabs();
    }
    function closeAllTabs() {
        var nonHome = TAB_STATE.tabs.filter(function (t) { return t.id !== 'home'; });
        if (nonHome.length === 0) {
            if (typeof showToast === 'function') showToast('فرم بازی وجود ندارد');
            return;
        }
        var anyDirty = false;
        nonHome.forEach(function (t) { if (hasUnsavedData(t.id)) anyDirty = true; });

        if (anyDirty) {
            if (!confirm('بعضی فرم‌ها داده‌های ذخیره‌نشده دارند.\n\nOK = بستن همه و از دست دادن داده‌ها\nCancel = انصراف')) return;
        }
        nonHome.forEach(function (t) { clearFormData(t.id); });

        TAB_STATE.tabs = [{ id: 'home', title: 'صفحه اصلی', icon: '🏠' }];
        TAB_STATE.active = 'home';
        switchToTab('home');
        if (typeof showToast === 'function') showToast('🧹 همه فرم‌ها بسته شد');
    }

    function injectCloseAllButton() {
        if (document.getElementById('close-all-forms-btn')) return true;
        var searchBox = document.querySelector('.sidebar-search');
        if (!searchBox) return false;

        var wrap = document.createElement('div');
        wrap.className = 'sidebar-close-all-wrap';
        wrap.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border)';

        var btn = document.createElement('button');
        btn.id = 'close-all-forms-btn';
        btn.type = 'button';
        btn.innerHTML = '🧹 بستن همه فرم‌ها';
        btn.title = 'بستن همه تب‌های فرم بدون رفرش';
        btn.style.cssText = [
            'width:100%',
            'padding:10px 14px',
            'background:linear-gradient(135deg,#fee2e2,#fecaca)',
            'color:#991b1b',
            'border:1px solid #fca5a5',
            'border-radius:10px',
            'font-family:inherit',
            'font-size:.82rem',
            'font-weight:800',
            'cursor:pointer',
            'transition:transform .2s,box-shadow .2s'
        ].join(';');

        btn.addEventListener('mouseenter', function () {
            btn.style.transform = 'translateY(-1px)';
            btn.style.boxShadow = '0 6px 16px rgba(220,38,38,.2)';
        });
        btn.addEventListener('mouseleave', function () {
            btn.style.transform = '';
            btn.style.boxShadow = '';
        });
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeAllTabs();
        });

        wrap.appendChild(btn);
        searchBox.parentNode.insertBefore(wrap, searchBox.nextSibling);
        return true;
    }

    function installGoToPageOverride() {
        if (typeof window.goToPage !== 'function') return false;
        if (window._origGoToPage) return true;
        var orig = window.goToPage;
        window._origGoToPage = orig;
        window.goToPage = function (name) {
            if (!name) return;
            var exists = false;
            for (var i = 0; i < TAB_STATE.tabs.length; i++) {
                if (TAB_STATE.tabs[i].id === name) { exists = true; break; }
            }
            if (!exists) {
                while (TAB_STATE.tabs.length >= TAB_STATE.max) {
                    var toRemove = -1;
                    for (var j = 1; j < TAB_STATE.tabs.length; j++) {
                        if (TAB_STATE.tabs[j].id !== name && TAB_STATE.tabs[j].id !== TAB_STATE.active) {
                            toRemove = j; break;
                        }
                    }
                    if (toRemove === -1) break;
                    TAB_STATE.tabs.splice(toRemove, 1);
                }
                var meta = getPageMeta(name);
                TAB_STATE.tabs.push({ id: name, title: meta.title, icon: meta.icon });
            }
            TAB_STATE.active = name;
            renderTabs();
            return orig.apply(this, arguments);
        };
        return true;
    }

    function init14() {
        var tries = 0;
        var interval = setInterval(function () {
            tries++;
            var ok1 = installGoToPageOverride();
            var ok2 = injectCloseAllButton();
            var ok3 = !!ensureTabBar();
            if ((ok1 && ok2 && ok3) || tries > 20) {
                clearInterval(interval);
                renderTabs();
            }
        }, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init14, 500); });
    } else {
        setTimeout(init14, 500);
    }

    window.closeAllTabs = closeAllTabs;
})();

/* =====================================================================
   ============ ۱۷) Observer مشترک برای جداول جدید ============
   ===================================================================== */
(function () {
    function init() {
        attachFilterRowsToAllTables();
        if (window._enhanceGlobalSorting) window._enhanceGlobalSorting();

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

        setInterval(function () {
            var tables = document.querySelectorAll('table.data-table, table.report-table, table.cf-table');
            tables.forEach(function (t) {
                if (!t.id) return;
                var hasRow = t.querySelector('thead tr.column-filter-row');
                if (!hasRow) buildFilterRow(t);
                if (COLUMN_FILTERS[t.id]) applyColumnFiltersToTable(t.id);
            });
        }, 900);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 900); });
    } else {
        setTimeout(init, 900);
    }
})();

/* =====================================================================
   ============ ۱۸) اشتراک‌گذاری گزارش‌ها و ویجت‌ها ============
   ===================================================================== */

/* اشتراک‌گذاری متنی (پشتیبان) */
function shareAsText(title, text) {
    var fullText = '📊 ' + title + '\n\n' + text;
    if (navigator.share) {
        navigator.share({ title: title, text: fullText }).catch(function() {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullText).then(function() {
            showToast('📋 متن گزارش کپی شد. در تلگرام پیست کن.');
        }).catch(function() { prompt('متن گزارش:', fullText); });
    } else {
        prompt('متن گزارش:', fullText);
    }
}
function reportToText(containerEl) {
    if (!containerEl) return '';
    var lines = [];
    var table = containerEl.querySelector('table');
    if (table) {
        var trs = table.querySelectorAll('tr');
        trs.forEach(function(tr) {
            var cells = tr.querySelectorAll('th, td');
            var row = [];
            cells.forEach(function(c) { row.push((c.textContent || '').trim()); });
            if (row.length) lines.push(row.join(' | '));
        });
    } else {
        lines.push((containerEl.textContent || '').trim());
    }
    return lines.join('\n');
}

/* =====================================================================
   ============ ۱۹) اشتراک‌گذاری به‌صورت تصویر (PNG) ============
   ===================================================================== */

/* بارگذاری تنبل html2canvas از CDN */
var _html2canvasLoadPromise = null;
function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (_html2canvasLoadPromise) return _html2canvasLoadPromise;
    _html2canvasLoadPromise = new Promise(function(resolve, reject) {
        var urls = [
            'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
            'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        ];
        var idx = 0;
        function tryNext() {
            if (idx >= urls.length) {
                _html2canvasLoadPromise = null;
                reject(new Error('بارگذاری html2canvas ناموفق بود (اتصال اینترنت را چک کن)'));
                return;
            }
            var s = document.createElement('script');
            s.src = urls[idx++];
            s.async = true;
            s.onload = function() {
                if (window.html2canvas) resolve(window.html2canvas);
                else tryNext();
            };
            s.onerror = function() { tryNext(); };
            document.head.appendChild(s);
        }
        tryNext();
    });
    return _html2canvasLoadPromise;
}

/* گرفتن اسکرین‌شات از یک عنصر DOM و اشتراک‌گذاری آن به‌صورت تصویر */
async function shareAsImage(el, title, filename) {
    if (!el) { showToast('محتوایی برای اشتراک نیست.'); return; }
    showToast('📸 در حال آماده‌سازی تصویر...');
    var h2c;
    try {
        h2c = await loadHtml2Canvas();
    } catch (e) {
        showToast('⚠️ ' + (e.message || 'خطا در بارگذاری کتابخانه') + ' — سوئیچ به متن');
        if (typeof shareAsText === 'function' && typeof reportToText === 'function') {
            shareAsText(title || 'گزارش پارسیس', reportToText(el));
        }
        return;
    }

    var hidden = [];
    var selectors = '.share-btn, .widget-share-btn, .col-resizer, .col-reset-btn, .col-toggle-btn, .eye-toggle-btn, .filters-toggle-btn, .card-collapse-btn, .column-filter-row, .col-filter-menu, #col-filter-menu';
    el.querySelectorAll(selectors).forEach(function (node) {
        if (node.style.display !== 'none') {
            hidden.push({ el: node, old: node.style.display });
            node.style.display = 'none';
        }
    });

    var canvas;
    try {
        canvas = await h2c(el, {
            backgroundColor: '#ffffff',
            scale: Math.min(Math.max(window.devicePixelRatio || 1, 2), 3),
            useCORS: true,
            allowTaint: false,
            logging: false,
            scrollX: 0,
            scrollY: -window.scrollY,
            windowWidth: el.scrollWidth,
            windowHeight: el.scrollHeight
        });
    } catch (e) {
        console.error('html2canvas error:', e);
        showToast('⚠️ خطا در ساخت تصویر — سوئیچ به متن');
        hidden.forEach(function (x) { x.el.style.display = x.old; });
        if (typeof shareAsText === 'function' && typeof reportToText === 'function') {
            shareAsText(title || 'گزارش پارسیس', reportToText(el));
        }
        return;
    } finally {
        hidden.forEach(function (x) { x.el.style.display = x.old; });
    }

    canvas.toBlob(async function (blob) {
        if (!blob) { showToast('❌ ساخت تصویر ناموفق بود'); return; }
        var safeName = (filename || 'parsis-report') + '-' + todayJalaliStr().replace(/\//g, '-') + '.png';
        var file = new File([blob], safeName, { type: 'image/png' });
        var shareTitle = title || 'گزارش پارسیس';

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: shareTitle,
                    text: shareTitle
                });
                showToast('✅ تصویر اشتراک شد.');
                return;
            } catch (e) {
                if (e && e.name === 'AbortError') return;
                console.warn('Web Share failed:', e);
            }
        }

        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        showToast('💾 تصویر دانلود شد — در تلگرام پیست کن.');
    }, 'image/png', 0.95);
}
window.shareAsImage = shareAsImage;

/* ساخت دکمه‌های اشتراک روی هدرهای لیست و ویجت‌ها */
function buildShareButtons() {
    document.querySelectorAll('.list-header').forEach(function(h) {
        if (h.querySelector('.share-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'share-btn';
        btn.title = 'اشتراک‌گذاری گزارش (تصویر)';
        btn.innerHTML = '📤';
        h.appendChild(btn);
    });
    document.querySelectorAll('.widget-card').forEach(function(w) {
        if (w.querySelector('.widget-share-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'widget-share-btn';
        btn.title = 'اشتراک‌گذاری ویجت (تصویر)';
        btn.innerHTML = '📤';
        if (getComputedStyle(w).position === 'static') w.style.position = 'relative';
        w.appendChild(btn);
    });
}
window.buildShareButtons = buildShareButtons;
window.shareAsText = shareAsText;

/* =====================================================================
   ============ ۲۰) Event Delegation برای دکمه‌های هدر و ویجت ============
   ===================================================================== */
(function() {
    function handleHeaderButtonClick(e) {
        var target = e.target;
        var btn;

        /* ⚙ منوی ستون‌ها */
        btn = target.closest ? target.closest('.col-toggle-btn') : null;
        if (btn) {
            e.stopPropagation();
            e.preventDefault();
            var h = btn.closest('.list-header');
            var tableId = h ? h.getAttribute('data-col-table') : null;
            if (tableId) {
                if (typeof showColMenu === 'function') showColMenu(tableId, btn);
            }
            return;
        }

        /* ↔ بازنشانی عرض ستون‌ها */
        btn = target.closest ? target.closest('.col-reset-btn') : null;
        if (btn) {
            e.stopPropagation();
            e.preventDefault();
            var h2 = btn.closest('.list-header');
            var tableId2 = h2 ? h2.getAttribute('data-col-table') : null;
            if (tableId2) {
                if (typeof resetColumnWidths === 'function') resetColumnWidths(tableId2);
                else showToast('⚠️ تابع بازنشانی یافت نشد.');
            } else {
                showToast('⚠️ جدولی برای این هدر تعریف نشده.');
            }
            return;
        }

        /* 👁/🙈 چشمی — مخفی/نمایش مبالغ */
        btn = target.closest ? target.closest('.eye-toggle-btn') : null;
        if (btn) {
            e.stopPropagation();
            e.preventDefault();
            var key = btn.getAttribute('data-hide-key');
            if (key) {
                toggleHideState(key);
                if (typeof rerenderCurrentPage === 'function') rerenderCurrentPage();
            }
            return;
        }

        /* 🔍 دکمه فیلترها */
        btn = target.closest ? target.closest('.filters-toggle-btn') : null;
        if (btn) {
            e.stopPropagation();
            e.preventDefault();
            var visible = document.body.classList.toggle('show-table-filters');
            try { localStorage.setItem('parsis.tableFiltersVisible', visible ? '1' : '0'); } catch (err) {}
            document.querySelectorAll('.filters-toggle-btn').forEach(function(b) {
                b.classList.toggle('active', visible);
            });
            return;
        }

        /* 📤 اشتراک‌گذاری گزارش — تصویر PNG */
        btn = target.closest ? target.closest('.share-btn') : null;
        if (btn) {
            e.stopPropagation();
            e.preventDefault();
            var card = btn.closest('.card');
            var target_el = card || (btn.closest('.list-header') ? btn.closest('.list-header').parentElement : null);
            var titleEl = document.querySelector('.page.active > h2');
            var title = titleEl ? titleEl.textContent : 'گزارش پارسیس';
            if (typeof shareAsImage === 'function') {
                shareAsImage(target_el, title.trim(), 'parsis-report');
            } else if (typeof shareAsText === 'function' && typeof reportToText === 'function') {
                shareAsText(title.trim(), reportToText(target_el));
            }
            return;
        }

        /* 📤 اشتراک‌گذاری ویجت — تصویر PNG */
        btn = target.closest ? target.closest('.widget-share-btn') : null;
        if (btn) {
            e.stopPropagation();
            e.preventDefault();
            var w = btn.closest('.widget-card');
            if (w) {
                var wTitle = (w.querySelector('h3') || {}).textContent || 'ویجت پارسیس';
                if (typeof shareAsImage === 'function') {
                    shareAsImage(w, wTitle.trim(), 'parsis-widget');
                } else if (typeof shareAsText === 'function' && typeof reportToText === 'function') {
                    shareAsText(wTitle.trim(), reportToText(w));
                }
            }
            return;
        }
    }

    document.addEventListener('click', handleHeaderButtonClick, true);

    setTimeout(function() {
        var missing = [];
        if (typeof showColMenu !== 'function') missing.push('showColMenu');
        if (typeof resetColumnWidths !== 'function') missing.push('resetColumnWidths');
        if (typeof toggleHideState !== 'function') missing.push('toggleHideState');
        if (typeof shareAsText !== 'function') missing.push('shareAsText');
        if (typeof shareAsImage !== 'function') missing.push('shareAsImage');
        if (missing.length > 0) {
            console.warn('⚠️ توابع گمشده:', missing.join(', '));
        } else {
            console.log('✅ Event Delegation دکمه‌های هدر فعال شد.');
        }
    }, 1500);
})();
