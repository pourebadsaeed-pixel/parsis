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
        'voucher-new': { label:'✏️ صدور سند جدید' },
        'voucher-list': { label:'📄 فهرست اسناد' },
        'persons': { label:'👥 اشخاص' },
        'bank-accounts': { label:'🏦 حساب‌های بانکی' },
        'cash-boxes': { label:'💰 صندوق‌ها' },
        'notes': { label:'📔 یادداشت‌ها' },
        'dashboard': { label:'🎯 داشبورد مالی' },
        'report-cashflow': { label:'💵 وضعیت نقدینگی' },
        'facilities': { label:'🏦 تسهیلات' },
        'chart-define': { label:'✏️ تعریف حساب‌ها' },
        'sms': { label:'📱 پیامک بانکی' },
        'templates': { label:'🧩 الگوها' },
        'fiscal': { label:'📅 دوره مالی' },
        'report-trial': { label:'⚖️ تراز آزمایشی' },
        'report-account': { label:'📒 مرور حساب‌ها' },
        'report-rates': { label:'📈 نرخ ارز و طلا' }
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
}

function updateUnitChips() {
    ['ra-unit','rt-unit','rf-unit','ri-unit','rff-unit','cf-unit','cfd-unit','rr-unit','dc-unit'].forEach(function(id) {
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

/* ==================== Table resize ==================== */
var colWidths = DB.load('colWidths', {});
function saveColWidths() { DB.save('colWidths', colWidths); }
function applyColWidths(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
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
    var tableId = table.id;
    if (!tableId) return;
    var ths = table.querySelectorAll('thead th');
    for (var i = 0; i < ths.length; i++) {
        (function(th, idx) {
            if (th.querySelector('.col-resizer')) return;
            var res = document.createElement('div');
            res.className = 'col-resizer';
            th.appendChild(res);
            var startX, startW, isDragging = false;
            res.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                isDragging = true; startX = e.pageX; startW = th.offsetWidth;
                document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
            });
            res.addEventListener('touchstart', function(e) {
                e.preventDefault();
                var t = e.touches[0];
                isDragging = true; startX = t.pageX; startW = th.offsetWidth;
                document.body.style.userSelect = 'none';
            }, { passive: false });
            function moveHandler(x) {
                if (!isDragging) return;
                var diff = startX - x;
                var w = Math.max(50, startW + diff);
                th.style.width = w + 'px'; th.style.minWidth = w + 'px';
                updateTableMinWidth(table);
            }
            function endHandler() {
                if (!isDragging) return;
                isDragging = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                if (!colWidths[tableId]) colWidths[tableId] = [];
                colWidths[tableId][idx] = th.offsetWidth;
                saveColWidths();
                updateTableMinWidth(table);
            }
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
    ['fiscal-table','persons-table','comp-table','ba-table','cb-table','proj-table','voucher-table-list','rt-table','ri-table','rf-table','rff-table','cfs-table','rr-table','cf-table','cfd-table','dc-table'].forEach(applyColVisibility);
}
function makeAllTablesResizable() {
    ['fiscal-table','persons-table','comp-table','ba-table','cb-table','proj-table','voucher-table-list','rt-table','ri-table','rf-table','rff-table','cfs-table','cf-table','cfd-table','rr-table','dc-table','turnover-table'].forEach(function(id) {
        var t = document.getElementById(id); if (t) makeTableResizable(t);
    });
}

/* ==================== Column menu popup ==================== */
function showColMenu(tableId, btn) {
    var menu = document.getElementById('col-menu');
    if (!menu) return;
    var table = document.getElementById(tableId);
    if (!table) return;
    var thead = table.querySelector('thead');
    if (!thead) return;
    var ths = thead.querySelectorAll('th');
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
        ['cf-table','cfd-table','rt-table','ri-table','rf-table','rff-table','rr-table','dc-table','turnover-table'].forEach(function(id) {
            var t = document.getElementById(id);
            if (t) applyColVisibility(id);
        });
        buildHeaderButtons();
        attachDatePickers();
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
        'daily-close': 'renderDailyCloseHistory',
        'notes': 'renderNotesList',
        'dashboard': 'renderDashboard',
        'home': 'updateHomeWidgets'
    };
    var fnName = map[id];
    if (fnName && typeof window[fnName] === 'function') window[fnName]();
}
