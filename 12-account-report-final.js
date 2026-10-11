/* =====================================================================
   پارسیس v30 — 12-account-report-final.js
   بازطراحی کامل گزارش مرور حساب‌ها به شکل جدول با سایدبار سطوح
   ✔ ۶ ستون دقیق: کد معین | عنوان معین | گردش بد | گردش بس | مانده بد | مانده بس
   ✔ سایدبار سطوح (گروه، کل، معین، سطح چهار، سطح پنج، پیگیری، تفصیلی)
   ✔ پنل فیلتر بالا با همه گزینه‌ها
   ✔ ردیف فیلتر (ورودی جستجو) زیر هدر جدول
   ✔ چک‌باکس «حساب‌های با مانده» کارا
   ✔ هایلایت ردیف انتخاب‌شده
   ===================================================================== */
'use strict';

/* =====================================================================
   ★ بخش ۱: استایل کامل گزارش
   ===================================================================== */
(function injectAccountReportFinalStyle() {
    if (document.getElementById('arv2-style')) return;
    var s = document.createElement('style');
    s.id = 'arv2-style';
    s.textContent = ''
    /* ====== Wrap کلی ====== */
    + '.arv2-wrap { background: var(--card-solid); border-radius: 14px; border: 1px solid var(--border); overflow: hidden; }'
    /* ====== نوار عنوان بالا ====== */
    + '.arv2-titlebar { display:flex; align-items:center; gap:8px; padding:10px 14px; '
    +   'background: linear-gradient(180deg, #e8f0fb, #f0f5fc); border-bottom:1px solid var(--border); }'
    + '.arv2-titlebar .arv2-tab { padding: 6px 14px; border-radius: 8px 8px 0 0; font-size:0.82rem; font-weight:800; '
    +   'background: transparent; color: var(--text-muted); border:1px solid transparent; cursor:pointer; }'
    + '.arv2-titlebar .arv2-tab.active { background: #fff; color: var(--primary-dark); border-color:var(--border); border-bottom-color:#fff; margin-bottom:-1px; }'
    + '.arv2-titlebar .arv2-tab:hover:not(.active) { color: var(--primary-dark); }'
    + '.arv2-titlebar .arv2-head-title { flex:1; text-align:center; font-weight:900; color:var(--primary-dark); font-size:0.9rem; }'
    + '.arv2-titlebar .arv2-close { background:#fee2e2; color:#dc2626; border:none; width:30px; height:30px; '
    +   'border-radius:8px; font-size:1.1rem; cursor:pointer; line-height:1; padding:0; }'
    + '.arv2-titlebar .arv2-close:hover { background:#dc2626; color:#fff; }'
    /* ====== محتوا: سایدبار + بدنه ====== */
    + '.arv2-main { display: flex; gap: 0; min-height: 400px; }'
    + '.arv2-sidebar { width: 190px; flex-shrink: 0; border-left: 1px solid var(--border); background: #f7fafd; display:flex; flex-direction:column; }'
    + '.arv2-sidebar-head { padding: 10px 12px; font-weight: 800; color: var(--primary-dark); font-size: 0.82rem; '
    +   'background: linear-gradient(180deg, #e8f0fb, #dbe7f6); border-bottom: 1px solid var(--border); display: flex; align-items:center; gap: 6px; }'
    + '.arv2-sidebar-head::before { content: "🔍"; font-size: 0.85rem; }'
    + '.arv2-levels { padding: 8px; overflow-y: auto; flex: 1; }'
    + '.arv2-level { display:flex; align-items:center; gap:8px; padding: 9px 12px; border-radius: 10px; '
    +   'font-size: 0.84rem; font-weight: 700; color: var(--text); cursor: pointer; margin-bottom: 3px; '
    +   'transition: all 0.2s; user-select: none; }'
    + '.arv2-level:hover { background: var(--primary-soft); transform: translateX(-2px); }'
    + '.arv2-level.active { background: linear-gradient(135deg, #2c3e50, #1a252f); color: #fff; box-shadow: 0 2px 8px rgba(44,62,80,0.3); }'
    + '.arv2-level .arv2-ico { font-size: 0.9rem; opacity: 0.7; }'
    + '.arv2-level.active .arv2-ico { opacity: 1; }'
    /* ====== بدنه اصلی ====== */
    + '.arv2-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }'
    /* ====== پنل فیلتر بالا ====== */
    + '.arv2-filters { padding: 10px 12px; background: linear-gradient(180deg, #f0f6fd, #fafcff); '
    +   'border-bottom: 1px solid var(--border); }'
    + '.arv2-filters-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; margin-bottom: 6px; }'
    + '.arv2-filters-row.cols-3 { grid-template-columns: repeat(3, 1fr); }'
    + '.arv2-frow { display: grid; grid-template-columns: 110px 1fr; gap: 6px; align-items: center; }'
    + '.arv2-frow > label { font-size: 0.76rem; font-weight: 800; color: var(--text-muted); text-align: right; padding-right: 4px; }'
    + '.arv2-frow > select, .arv2-frow > input { padding: 6px 10px; border: 1.5px solid var(--border); border-radius: 8px; '
    +   'font-family: inherit; font-size: 0.78rem; background: #fff; color: var(--text); outline: none; width: 100%; box-sizing: border-box; }'
    + '.arv2-frow > select:focus, .arv2-frow > input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }'
    + '.arv2-frow > input[readonly] { background: #f5f8fc; }'
    + '.arv2-cb-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 0.82rem; '
    +   'font-weight: 800; color: var(--text); cursor: pointer; user-select: none; }'
    + '.arv2-cb-row input { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; }'
    + '.arv2-more-filters { display:flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }'
    + '.arv2-more-filters > button { padding: 5px 12px; border-radius: 8px; border: 1px solid var(--border); '
    +   'background: #fff; color: var(--text); font-family: inherit; font-size: 0.74rem; font-weight: 800; cursor: pointer; }'
    + '.arv2-more-filters > button:hover { border-color: var(--primary); background: var(--primary-soft); color: var(--primary-dark); }'
    /* ====== نوار عنوان گزارش ====== */
    + '.arv2-report-title { padding: 9px 14px; background: linear-gradient(90deg, #fff7e0, #fef9ec); '
    +   'border-bottom: 1px solid #e8d5a8; font-size: 0.82rem; font-weight: 800; color: #92400e; text-align: center; }'
    /* ====== جدول ====== */
    + '.arv2-table-wrap { overflow: auto; max-height: 62vh; background: #fff; }'
    + '.arv2-table { width: 100%; border-collapse: collapse; background: #fff; font-size: 0.84rem; }'
    + '.arv2-table thead th { background: linear-gradient(180deg, #dce8f5, #c8dcef); color: #1e40af; '
    +   'padding: 10px 12px; text-align: center; font-weight: 900; font-size: 0.8rem; '
    +   'border: 1px solid #b9cfe5; position: sticky; top: 0; z-index: 3; white-space: nowrap; }'
    + '.arv2-table thead th:first-child { border-top-right-radius: 0; }'
    /* ردیف فیلتر (زیر هدر) */
    + '.arv2-table thead tr.arv2-filter-row th { background: #f0f6fc; padding: 4px 6px; border-color: #b9cfe5; }'
    + '.arv2-table thead tr.arv2-filter-row th input { width: 100%; padding: 5px 8px; '
    +   'border: 1px solid #c8dcef; border-radius: 6px; font-family: inherit; font-size: 0.75rem; background: #fff; '
    +   'outline: none; box-sizing: border-box; }'
    + '.arv2-table thead tr.arv2-filter-row th input:focus { border-color: var(--primary); }'
    /* سلول‌ها */
    + '.arv2-table tbody td { padding: 9px 12px; border: 1px solid #dbe6f1; text-align: center; white-space: nowrap; }'
    + '.arv2-table tbody tr { cursor: pointer; transition: background 0.15s; }'
    + '.arv2-table tbody tr:hover { background: #f0f6ff; }'
    + '.arv2-table tbody tr.selected { background: #ffe9b3 !important; box-shadow: inset 0 0 0 2px #e8a33d; }'
    + '.arv2-table tbody tr.lvl-1 td { background: #eef4fb; font-weight: 900; color: #1e40af; }'
    + '.arv2-table tbody tr.lvl-2 td { background: #f6faff; font-weight: 800; }'
    + '.arv2-table tbody tr.lvl-3 td { background: #fff; }'
    + '.arv2-table tbody tr.lvl-4 td { background: #fbfdff; font-size: 0.8rem; color: #334155; }'
    + '.arv2-table .arv2-code { font-family: monospace; direction: ltr; font-weight: 800; color: #1e40af; }'
    + '.arv2-table .arv2-name { text-align: right !important; font-weight: 700; }'
    + '.arv2-table .arv2-num { font-variant-numeric: tabular-nums; text-align: center; direction: ltr; }'
    + '.arv2-table .arv2-num.zero { color: #cbd5e1; }'
    + '.arv2-table .arv2-num.neg { color: #dc2626; }'
    + '.arv2-table .arv2-toggle { display: inline-flex; align-items: center; justify-content: center; '
    +   'width: 18px; height: 18px; border-radius: 5px; background: #e0ecf8; color: #1e40af; '
    +   'font-size: 0.62rem; font-weight: 900; cursor: pointer; margin-left: 6px; user-select: none; flex-shrink: 0; }'
    + '.arv2-table .arv2-toggle:hover { background: var(--primary); color: #fff; }'
    + '.arv2-table .arv2-toggle.empty { visibility: hidden; }'
    + '.arv2-table .arv2-badge { display: inline-block; font-size: 0.62rem; padding: 1px 7px; '
    +   'border-radius: 8px; margin-right: 6px; font-weight: 800; }'
    + '.arv2-table .arv2-badge.b1 { background: #c7d2fe; color: #3730a3; }'
    + '.arv2-table .arv2-badge.b2 { background: #bbf7d0; color: #065f46; }'
    + '.arv2-table .arv2-badge.b3 { background: #fde68a; color: #92400e; }'
    + '.arv2-table .arv2-badge.b4 { background: #e2e8f0; color: #475569; }'
    + '.arv2-table tfoot td { background: linear-gradient(180deg, #dce8f5, #c8dcef); '
    +   'font-weight: 900; padding: 11px 12px; color: #1e40af; text-align: center; border: 1px solid #b9cfe5; }'
    + '.arv2-empty { padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem; }'
    /* ====== ریسپانسیو ====== */
    + '@media (max-width: 720px) {'
    +   '.arv2-main { flex-direction: column; }'
    +   '.arv2-sidebar { width: 100%; border-left: none; border-bottom: 1px solid var(--border); max-height: 180px; }'
    +   '.arv2-levels { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px; }'
    +   '.arv2-level { padding: 6px 10px; font-size: 0.76rem; margin: 0; }'
    +   '.arv2-filters-row, .arv2-filters-row.cols-3 { grid-template-columns: 1fr; }'
    +   '.arv2-table { font-size: 0.74rem; }'
    +   '.arv2-table thead th, .arv2-table tbody td { padding: 7px 8px; }'
    + '}';
    document.head.appendChild(s);
})();

/* =====================================================================
   ★ بخش ۲: تابع اصلی رسم گزارش
   ===================================================================== */
var _arv2State = {
    visibleLevels: { 1: true, 2: true, 3: true, 4: false, 5: false, 6: false, 7: false },
    activeLevel: 3,
    selectedRowId: null,
    expandedNodes: {}
};

function renderAccountReportV2() {
    var page = document.getElementById('page-report-account');
    if (!page) return;

    var opts = {
        from: document.getElementById('ra-from').value,
        to: document.getElementById('ra-to').value,
        vtype: document.getElementById('ra-vtype').value,
        periodId: document.getElementById('ra-period').value,
        cat: document.getElementById('ra-cat').value,
        nature: document.getElementById('ra-nature').value,
        level: Number(document.getElementById('ra-level').value) || 3
    };
    var onlyBalance = document.getElementById('ra-only-balance');
    var shouldFilterBalance = onlyBalance && onlyBalance.checked;

    var accounts = DB.load('accounts', []);
    var result = computeAccountBalances(opts);
    var rolled = rollupBalances(accounts, result.balances);
    var hide = getHideState('ra');

    var box = document.getElementById('ra-result');
    if (!box) return;

    // ★ تشخیص سطح‌های نمایش
    var tL = opts.level;
    var showL4 = _arv2State.visibleLevels[4] || tL >= 4;

    // ★ محاسبه dM (جزئیات سطح ۴)
    var dM = {};
    if (tL >= 4 || showL4) {
        Object.keys(result.detailBalances).forEach(function(did) {
            var d = result.detailBalances[did];
            if (!dM[d.parent]) dM[d.parent] = [];
            dM[d.parent].push({ id: did, linkType: d.linkType, debit: d.debit, credit: d.credit });
        });
    }

    // ★ تابع بررسی مانده
    function hasAnyBalance(nodeId) {
        var b = rolled[nodeId] || { debit: 0, credit: 0 };
        return b.debit !== 0 || b.credit !== 0;
    }
    function childHasBalance(parentId) {
        var kids = accounts.filter(function(a) { return a.parent === parentId; });
        for (var i = 0; i < kids.length; i++) {
            if (hasAnyBalance(kids[i].id)) return true;
            if (childHasBalance(kids[i].id)) return true;
        }
        return false;
    }

    // ★ HTML
    var html = '<div class="arv2-wrap">';

    // ===== نوار عنوان بالا =====
    html += '<div class="arv2-titlebar">';
    html += '<button class="arv2-tab active">گزارش</button>';
    html += '<button class="arv2-tab">فیلتر اسناد</button>';
    html += '<div class="arv2-head-title">محدوده اسناد</div>';
    html += '</div>';

    // ===== محتوا =====
    html += '<div class="arv2-main">';

    // --- سایدبار سطوح (سمت راست) ---
    html += '<div class="arv2-sidebar">';
    html += '<div class="arv2-sidebar-head">جستجو</div>';
    html += '<div class="arv2-levels">';
    var levels = [
        { id: 1, label: 'گروه' },
        { id: 2, label: 'کل' },
        { id: 3, label: 'معین' },
        { id: 4, label: 'سطح چهار' },
        { id: 5, label: 'سطح پنج' },
        { id: 6, label: 'پیگیری' },
        { id: 7, label: 'حساب تفصیلی' }
    ];
    levels.forEach(function(lv) {
        var cls = 'arv2-level';
        if (_arv2State.activeLevel === lv.id) cls += ' active';
        html += '<div class="' + cls + '" data-level="' + lv.id + '">';
        html += '<span class="arv2-ico">🔍</span><span>' + lv.label + '</span>';
        html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    // --- بدنه اصلی ---
    html += '<div class="arv2-body">';

    // ===== پنل فیلتر بالا =====
    html += '<div class="arv2-filters">';
    // ردیف اول: نوع تفصیلی + نوع سند
    html += '<div class="arv2-filters-row">';
    html += '<div class="arv2-frow"><label>نوع تفصیلی:</label><select id="arv2-f-detail-type">';
    html += '<option value="">— همه —</option>';
    html += '<option value="person">اشخاص</option>';
    html += '<option value="company">شرکت‌ها</option>';
    html += '<option value="bank">بانکی</option>';
    html += '<option value="cashbox">صندوق</option>';
    html += '<option value="project">پروژه</option>';
    html += '<option value="facility">تسهیلات</option>';
    html += '</select></div>';
    html += '<div class="arv2-frow"><label>نوع سند:</label><select id="arv2-f-vtype">';
    html += '<option value="">— همه —</option>';
    html += '<option value="general">عمومی</option>';
    html += '<option value="opening">افتتاحیه</option>';
    html += '<option value="establishment">افتتاحیه استقرار</option>';
    html += '<option value="closing">بستن حساب</option>';
    html += '<option value="final">اختتامیه</option>';
    html += '</select></div>';
    html += '</div>';

    // ردیف دوم: وضعیت سند + از دوره مالی
    html += '<div class="arv2-filters-row">';
    html += '<div class="arv2-frow"><label>وضعیت سند:</label><select id="arv2-f-status">';
    html += '<option value="">انتخاب وضعیت سند...</option>';
    html += '<option value="approved">تأییدشده</option>';
    html += '<option value="draft">پیش‌نویس</option>';
    html += '</select></div>';
    html += '<div class="arv2-frow"><label>از دوره مالی:</label><input type="text" id="arv2-f-period-from" placeholder="مثلاً ۱۴۰۵"></div>';
    html += '</div>';

    // ردیف سوم: تا دوره مالی + نوع حساب
    html += '<div class="arv2-filters-row">';
    html += '<div class="arv2-frow"><label>تا دوره مالی:</label><input type="text" id="arv2-f-period-to" placeholder="مثلاً ۱۴۰۵"></div>';
    html += '<div class="arv2-frow"><label>نوع حساب:</label><select id="arv2-f-acct-type">';
    html += '<option value="">— همه —</option>';
    html += '<option value="permanent">دائمی</option>';
    html += '<option value="temporary">موقت</option>';
    html += '</select></div>';
    html += '</div>';

    // ردیف چهارم: چک‌باکس + فیلتر مبلغ
    html += '<div class="arv2-filters-row">';
    html += '<label class="arv2-cb-row"><input type="checkbox" id="arv2-only-balance"' + (shouldFilterBalance ? ' checked' : '') + '> <span>حساب‌های با مانده</span></label>';
    html += '<div class="arv2-frow"><label>فیلتر:</label><select id="arv2-f-amount-op">';
    html += '<option value="">—</option>';
    html += '<option value="gt">بزرگتر از</option>';
    html += '<option value="lt">کوچکتر از</option>';
    html += '<option value="eq">مساوی</option>';
    html += '</select></div>';
    html += '</div>';

    // ردیف پنجم: از ماه + تا ماه
    html += '<div class="arv2-filters-row">';
    html += '<div class="arv2-frow"><label>از ماه:</label><input type="text" id="arv2-f-from-month" placeholder="مثلاً فروردین ۱۴۰۵"></div>';
    html += '<div class="arv2-frow"><label>تا ماه:</label><input type="text" id="arv2-f-to-month" placeholder="مثلاً فروردین ۱۴۰۵"></div>';
    html += '</div>';

    html += '</div>'; // پایان پنل فیلتر

    // ===== نوار عنوان گزارش =====
    var activeAccount = null;
    if (_arv2State.selectedRowId) {
        activeAccount = accounts.find(function(a) { return a.id === _arv2State.selectedRowId; });
    }
    var titleText = activeAccount
        ? ('گزارش: ' + activeAccount.name + (activeAccount.code ? ' | کد ' + activeAccount.code : ''))
        : 'گزارش مرور حساب‌ها';
    html += '<div class="arv2-report-title">' + esc(titleText) + '</div>';

    // ===== جدول =====
    html += '<div class="arv2-table-wrap">';
    html += '<table class="arv2-table" id="arv2-tbl">';
    html += '<thead>';
    html += '<tr>';
    html += '<th style="width:100px">کد معین</th>';
    html += '<th>عنوان معین</th>';
    html += '<th style="width:160px">گردش بدهکار</th>';
    html += '<th style="width:160px">گردش بستانکار</th>';
    html += '<th style="width:160px">مانده بدهکار</th>';
    html += '<th style="width:160px">مانده بستانکار</th>';
    html += '</tr>';
    // ردیف فیلتر (ورودی‌های جستجو)
    html += '<tr class="arv2-filter-row">';
    html += '<th><input type="text" data-filter-col="0" placeholder="🔍"></th>';
    html += '<th><input type="text" data-filter-col="1" placeholder="🔍"></th>';
    html += '<th><input type="text" data-filter-col="2" placeholder="🔍"></th>';
    html += '<th><input type="text" data-filter-col="3" placeholder="🔍"></th>';
    html += '<th><input type="text" data-filter-col="4" placeholder="🔍"></th>';
    html += '<th><input type="text" data-filter-col="5" placeholder="🔍"></th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';

    // ★ رسم ردیف‌ها
    var totalD = 0, totalC = 0, shown = 0;

    function childrenOf(pid) {
        return accounts.filter(function(a) { return a.parent === pid; });
    }

    function renderRow(node, level) {
        var b = rolled[node.id] || { debit: 0, credit: 0 };
        var net = b.debit - b.credit;
        var md = net > 0 ? net : 0;
        var mc = net < 0 ? -net : 0;

        // ★ فیلتر فقط مانده‌دار
        if (shouldFilterBalance) {
            if (!hasAnyBalance(node.id) && !childHasBalance(node.id)) return;
        }

        // ★ فیلتر سطح نمایش
        var maxLevel = opts.level;
        if (level > maxLevel && !(level === 4 && showL4)) return;

        var levelName = level === 1 ? 'گروه' : level === 2 ? 'کل' : level === 3 ? 'معین' : 'تفصیلی';
        var badgeCls = 'b' + Math.min(level, 4);
        var isExpanded = _arv2State.expandedNodes[node.id] !== false;
        var kids = childrenOf(node.id);
        var hasChildren = kids.length > 0;
        if (level === 3 && showL4 && dM[node.id] && dM[node.id].length > 0) hasChildren = true;
        // اگر فیلتر فقط-مانده فعال است، چک کن فرزندی برای نمایش دارد
        if (shouldFilterBalance && hasChildren) {
            var anyKid = false;
            for (var i = 0; i < kids.length; i++) {
                if (hasAnyBalance(kids[i].id) || childHasBalance(kids[i].id)) { anyKid = true; break; }
            }
            if (!anyKid && !(level === 3 && showL4 && dM[node.id] && dM[node.id].length > 0)) {
                // فقط اگر خود نود مانده دارد نمایش داده شود
                if (!hasAnyBalance(node.id)) hasChildren = false;
            }
        }

        var toggleHtml = hasChildren
            ? '<span class="arv2-toggle" data-toggle-id="' + node.id + '">' + (isExpanded ? '▼' : '◀') + '</span>'
            : '<span class="arv2-toggle empty">•</span>';

        var rowCls = 'lvl-' + level;
        if (_arv2State.selectedRowId === node.id) rowCls += ' selected';

        html += '<tr class="' + rowCls + '" data-node-id="' + node.id + '" data-level="' + level + '">';
        html += '<td class="arv2-code">' + esc(node.code || '') + '</td>';
        html += '<td class="arv2-name">' + toggleHtml + esc(node.name || '') + ' <span class="arv2-badge ' + badgeCls + '">' + levelName + '</span></td>';
        html += '<td class="arv2-num' + (b.debit ? '' : ' zero') + '">' + (hide ? '—' : (b.debit ? moneyHtml(b.debit) : '0')) + '</td>';
        html += '<td class="arv2-num' + (b.credit ? '' : ' zero') + '">' + (hide ? '—' : (b.credit ? moneyHtml(b.credit) : '0')) + '</td>';
        html += '<td class="arv2-num' + (md ? '' : ' zero') + '">' + (hide ? '—' : (md ? moneyHtml(md) : '0')) + '</td>';
        html += '<td class="arv2-num' + (mc ? '' : ' zero') + '">' + (hide ? '—' : (mc ? moneyHtml(mc) : '0')) + '</td>';
        html += '</tr>';

        totalD += b.debit;
        totalC += b.credit;
        shown++;

        // ★ رسم فرزندان
        if (isExpanded && hasChildren) {
            if (level < maxLevel) {
                for (var k = 0; k < kids.length; k++) renderRow(kids[k], level + 1);
            }
            // سطح ۴
            if (level === 3 && showL4 && dM[node.id]) {
                var ds = dM[node.id];
                for (var di = 0; di < ds.length; di++) {
                    var d = ds[di];
                    var dn = d.debit - d.credit;
                    var dmd = dn > 0 ? dn : 0;
                    var dmc = dn < 0 ? -dn : 0;
                    if (shouldFilterBalance && !d.debit && !d.credit) continue;

                    var dRowCls = 'lvl-4';
                    if (_arv2State.selectedRowId === d.id) dRowCls += ' selected';
                    html += '<tr class="' + dRowCls + '" data-detail-id="' + d.id + '" data-parent-id="' + node.id + '" data-level="4">';
                    html += '<td class="arv2-code">—</td>';
                    html += '<td class="arv2-name"><span class="arv2-toggle empty">•</span>' + esc(getDetailLabel(d.linkType, d.id)) + ' <span class="arv2-badge b4">' + linkTypeName(d.linkType) + '</span></td>';
                    html += '<td class="arv2-num' + (d.debit ? '' : ' zero') + '">' + (hide ? '—' : (d.debit ? moneyHtml(d.debit) : '0')) + '</td>';
                    html += '<td class="arv2-num' + (d.credit ? '' : ' zero') + '">' + (hide ? '—' : (d.credit ? moneyHtml(d.credit) : '0')) + '</td>';
                    html += '<td class="arv2-num' + (dmd ? '' : ' zero') + '">' + (hide ? '—' : (dmd ? moneyHtml(dmd) : '0')) + '</td>';
                    html += '<td class="arv2-num' + (dmc ? '' : ' zero') + '">' + (hide ? '—' : (dmc ? moneyHtml(dmc) : '0')) + '</td>';
                    html += '</tr>';

                    totalD += d.debit;
                    totalC += d.credit;
                    shown++;
                }
            }
        }
    }

    var roots = accounts.filter(function(a) { return !a.parent; });
    for (var i = 0; i < roots.length; i++) renderRow(roots[i], 1);

    if (shown === 0) {
        html += '<tr><td colspan="6" class="arv2-empty">داده‌ای مطابق فیلترها یافت نشد.</td></tr>';
    }

    html += '</tbody>';
    html += '<tfoot>';
    html += '<tr>';
    html += '<td colspan="2" style="text-align:right; padding-right:20px">جمع کل</td>';
    html += '<td class="arv2-num">' + (hide ? '—' : moneyHtml(totalD)) + '</td>';
    html += '<td class="arv2-num">' + (hide ? '—' : moneyHtml(totalC)) + '</td>';
    html += '<td class="arv2-num">' + (hide ? '—' : moneyHtml(totalD > totalC ? totalD - totalC : 0)) + '</td>';
    html += '<td class="arv2-num">' + (hide ? '—' : moneyHtml(totalC > totalD ? totalC - totalD : 0)) + '</td>';
    html += '</tr>';
    html += '</tfoot>';
    html += '</table>';
    html += '</div>'; // table-wrap

    html += '</div>'; // body
    html += '</div>'; // main
    html += '</div>'; // wrap

    box.innerHTML = html;

    // ★ شمارنده
    var cnt = document.getElementById('ra-count');
    if (cnt) cnt.textContent = toFa(shown);

    // ============ رویدادها ============
    bindArv2Events(accounts, box);

    if (typeof attachDatePickers === 'function') attachDatePickers();
}

/* =====================================================================
   ★ بخش ۳: رویدادها
   ===================================================================== */
function bindArv2Events(accounts, box) {
    // سایدبار سطوح
    box.querySelectorAll('.arv2-level').forEach(function(lv) {
        lv.addEventListener('click', function() {
            var lvl = Number(this.getAttribute('data-level'));
            _arv2State.activeLevel = lvl;
            // اگر روی یک سطح کلیک شد، همان سطح را نمایش بده
            if (lvl <= 3) {
                var levelSel = document.getElementById('ra-level');
                if (levelSel) levelSel.value = String(lvl);
            }
            if (lvl === 4) {
                _arv2State.visibleLevels[4] = true;
                var lvl4 = document.getElementById('ra-level');
                if (lvl4) lvl4.value = '4';
            }
            renderAccountReportV2();
        });
    });

    // چک‌باکس فقط-مانده
    var cb = document.getElementById('arv2-only-balance');
    if (cb) {
        cb.addEventListener('change', function() {
            // همگام با چک‌باکس اصلی
            var origCb = document.getElementById('ra-only-balance');
            if (origCb) origCb.checked = this.checked;
            renderAccountReportV2();
        });
    }

    // فیلترهای بالا (تغییر نوع سند)
    var vtypeSel = document.getElementById('arv2-f-vtype');
    if (vtypeSel) {
        vtypeSel.addEventListener('change', function() {
            var orig = document.getElementById('ra-vtype');
            if (orig) orig.value = this.value;
            renderAccountReportV2();
        });
    }
    var catSel = document.getElementById('arv2-f-acct-type');
    if (catSel) {
        catSel.addEventListener('change', function() {
            var orig = document.getElementById('ra-cat');
            if (orig) orig.value = this.value;
            renderAccountReportV2();
        });
    }

    // ردیف فیلتر زیر هدر (جستجو در ستون)
    box.querySelectorAll('.arv2-filter-row input').forEach(function(inp) {
        inp.addEventListener('input', function() {
            var col = Number(this.getAttribute('data-filter-col'));
            var q = normalizeDigits(this.value.trim().toLowerCase());
            var tbody = box.querySelector('tbody');
            if (!tbody) return;
            tbody.querySelectorAll('tr').forEach(function(tr) {
                if (tr.classList.contains('arv2-empty') || tr.querySelector('.arv2-empty')) return;
                var cells = tr.querySelectorAll('td');
                if (cells.length <= col) return;
                var txt = (cells[col].textContent || '').toLowerCase();
                tr.style.display = (!q || txt.indexOf(q) !== -1) ? '' : 'none';
            });
            // بازمحاسبه جمع فقط ردیف‌های visible
            recalcArv2Footer(box);
        });
    });

    // کلیک روی ردیف
    box.querySelectorAll('tbody tr').forEach(function(tr) {
        tr.addEventListener('click', function(e) {
            if (e.target.closest('.arv2-toggle')) return;
            var nodeId = this.getAttribute('data-node-id');
            var detailId = this.getAttribute('data-detail-id');
            var parentId = this.getAttribute('data-parent-id');

            // هایلایت
            box.querySelectorAll('tbody tr.selected').forEach(function(x) { x.classList.remove('selected'); });
            this.classList.add('selected');
            _arv2State.selectedRowId = nodeId || detailId;

            // به‌روزرسانی عنوان
            var accounts2 = DB.load('accounts', []);
            var active = null;
            if (nodeId) {
                active = accounts2.find(function(a) { return a.id === nodeId; });
            } else if (detailId && parentId) {
                active = accounts2.find(function(a) { return a.id === parentId; });
            }
            var titleEl = box.querySelector('.arv2-report-title');
            if (titleEl && active) {
                var codePart = active.code ? ' | کد ' + active.code : '';
                var detailPart = '';
                if (detailId && parentId) {
                    var acc2 = accounts2.find(function(a) { return a.id === parentId; });
                    var lt = acc2 && acc2.links ? acc2.links[0] : 'person';
                    detailPart = ' | ' + getDetailLabel(lt, detailId);
                }
                titleEl.textContent = 'گزارش: ' + active.name + codePart + detailPart;
            }

            // باز کردن گردش حساب
            if (nodeId) {
                openAccountTurnover(nodeId, null);
            } else if (detailId && parentId) {
                var accs = DB.load('accounts', []);
                var pAcc = accs.find(function(a) { return a.id === parentId; });
                var lt = pAcc && pAcc.links ? pAcc.links[0] : 'person';
                openAccountTurnover(parentId, { linkType: lt, detailId: detailId });
            }
        });
    });

    // دکمه‌های toggle (باز/بستن زیرشاخه)
    box.querySelectorAll('[data-toggle-id]').forEach(function(t) {
        t.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.getAttribute('data-toggle-id');
            _arv2State.expandedNodes[id] = !_arv2State.expandedNodes[id];
            renderAccountReportV2();
        });
    });

    // نوارهای بالای جدول (تب‌ها)
    box.querySelectorAll('.arv2-tab').forEach(function(tb) {
        tb.addEventListener('click', function() {
            box.querySelectorAll('.arv2-tab').forEach(function(x) { x.classList.remove('active'); });
            this.classList.add('active');
        });
    });
}

/* =====================================================================
   ★ بخش ۴: بازمحاسبه جمع بر اساس ردیف‌های نمایش‌داده‌شده
   ===================================================================== */
function recalcArv2Footer(box) {
    var tbody = box.querySelector('tbody');
    if (!tbody) return;
    var tD = 0, tC = 0;
    tbody.querySelectorAll('tr').forEach(function(tr) {
        if (tr.style.display === 'none') return;
        var cells = tr.querySelectorAll('td');
        if (cells.length < 6) return;
        tD += parseArv2Num(cells[2].textContent);
        tC += parseArv2Num(cells[3].textContent);
    });
    var tfoot = box.querySelector('tfoot');
    if (!tfoot) return;
    var fCells = tfoot.querySelectorAll('td');
    if (fCells.length < 6) return;
    fCells[2].textContent = moneyHtml(tD);
    fCells[3].textContent = moneyHtml(tC);
    fCells[4].textContent = moneyHtml(tD > tC ? tD - tC : 0);
    fCells[5].textContent = moneyHtml(tC > tD ? tC - tD : 0);
}
function parseArv2Num(txt) {
    var t = normalizeDigits(String(txt || '')).replace(/[^\d\-]/g, '');
    return Number(t) || 0;
}

/* =====================================================================
   ★ بخش ۵: Override نهایی runAccountReport
   ===================================================================== */
(function patchRunAccountReportFinal() {
    function apply() {
        // دکمه اجرا
        var runBtn = document.getElementById('ra-run');
        if (runBtn && runBtn.dataset.arv2 !== '1') {
            runBtn.dataset.arv2 = '1';
            var newBtn = runBtn.cloneNode(true);
            runBtn.parentNode.replaceChild(newBtn, runBtn);
            newBtn.addEventListener('click', function() {
                renderAccountReportV2();
            });
        }

        // override کلی
        window.runAccountReport = renderAccountReportV2;
        window._renderAccountReportTree = renderAccountReportV2;

        // چک‌باکس اصلی فقط-مانده
        var origCb = document.getElementById('ra-only-balance');
        if (origCb && origCb.dataset.arv2 !== '1') {
            origCb.dataset.arv2 = '1';
            var newCb = origCb.cloneNode(true);
            origCb.parentNode.replaceChild(newCb, origCb);
            newCb.addEventListener('change', function() {
                var mirror = document.getElementById('arv2-only-balance');
                if (mirror) mirror.checked = this.checked;
                renderAccountReportV2();
            });
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(apply, 500); });
    } else {
        setTimeout(apply, 500);
    }
})();

/* =====================================================================
   ★ بخش ۶: وقتی کاربر صفحه مرور حساب را باز می‌کند، خودکار رسم کن
   ===================================================================== */
(function autoRenderAccountReport() {
    function checkPage() {
        var page = document.getElementById('page-report-account');
        if (!page || !page.classList.contains('active')) return;
        var box = document.getElementById('ra-result');
        if (!box) return;
        // اگر قبلاً رسم نشده یا فرمت قدیمی است، رسم کن
        if (!box.querySelector('.arv2-wrap')) {
            renderAccountReportV2();
        }
    }
    setInterval(checkPage, 800);
})();

console.log('✅ گزارش مرور حساب‌ها v30 — بازطراحی شد');
