/* =====================================================================
   پارسیس v32 — 15-account-review-final.js
   گزارش مرور حساب‌ها — نسخه نهایی

   ✔ فقط ۴ سطح: گروه، کل، معین، تفصیل
   ✔ سایدبار سمت راست با ۴ سطح
   ✔ کلیک روی سطح → نمایش حساب‌های آن سطح
   ✔ کلیک روی سطر → فعال‌شدن ذره‌بین سطح بعدی
   ✔ کلیک روی ذره‌بین → نمایش فقط سطح انتخاب‌شده
   ✔ دبل‌کلیک روی سطر → گردش + ویرایش سند
   ✔ جمع در همه ستون‌های مبلغ (گردش بد/بس، مانده بد/بس)
   ✔ چک‌باکس «حساب‌های با مانده» کارا
   ✔ حذف «دوره» و «سطح» از فرم
   ✔ حذف پنل «محدوده اسناد» قدیمی
   ✔ فیلتر جمع‌شو با فلش ▼
   ===================================================================== */
'use strict';

var _AR = {
    activeLevel: 1,       // 1=گروه، 2=کل، 3=معین، 4=تفصیل
    selectedId: null,     // شناسه سطر انتخاب‌شده
    parentId: null,       // والد برای فیلتر سطح جاری
    expanded: {}          // برای نمایش درختی
};

var _AR_LEVELS = { 1: 'گروه', 2: 'کل', 3: 'معین', 4: 'تفصیل' };

/* =====================================================================
   ★ بخش ۱: استایل
   ===================================================================== */
(function injectStyle() {
    if (document.getElementById('ar-final-style')) return;
    var s = document.createElement('style');
    s.id = 'ar-final-style';
    s.textContent = ''
    /* --- wrap --- */
    + '.ar-wrap { background:#fff; border-radius:14px; border:1px solid var(--border); overflow:hidden; direction:rtl }'
    /* --- titlebar --- */
    + '.ar-tb { display:flex; align-items:center; gap:10px; padding:10px 14px; '
    +   'background:linear-gradient(180deg,#e8f0fb,#f4f8fd); border-bottom:1px solid var(--border) }'
    + '.ar-tb-title { flex:1; text-align:center; font-weight:900; color:#1e40af; font-size:.88rem }'
    + '.ar-tb-bc { font-size:.8rem; color:#64748b }'
    + '.ar-tb-bc a { color:#1e40af; text-decoration:none; cursor:pointer; border-bottom:1px dashed #93c5fd; padding:0 2px }'
    + '.ar-tb-bc a:hover { background:#dbeafe }'
    + '.ar-tb-bc .sep { color:#cbd5e1; margin:0 4px }'
    /* --- main split --- */
    + '.ar-main { display:flex; min-height:460px }'
    /* --- sidebar (levels) --- */
    + '.ar-side { width:170px; flex-shrink:0; border-left:1px solid var(--border); background:#f7fafd; display:flex; flex-direction:column }'
    + '.ar-side-head { padding:11px 14px; font-weight:900; color:#1e40af; font-size:.8rem; '
    +   'background:linear-gradient(180deg,#dbe7f6,#c8dcef); border-bottom:1px solid var(--border); text-align:center }'
    + '.ar-levels { padding:10px; display:flex; flex-direction:column; gap:6px; overflow-y:auto }'
    + '.ar-lvl { position:relative; padding:12px 14px; border-radius:12px; text-align:center; '
    +   'font-size:.86rem; font-weight:800; color:#334155; background:#fff; '
    +   'border:1.5px solid #e0ecf8; cursor:pointer; user-select:none; transition:all .2s }'
    + '.ar-lvl.disabled { opacity:.35; cursor:not-allowed }'
    + '.ar-lvl.clickable { border-color:#3b82f6; color:#1e40af; background:linear-gradient(135deg,#dbeafe,#eff6ff); '
    +   'animation:arPulse 1.6s ease-in-out infinite }'
    + '.ar-lvl.clickable:hover { transform:scale(1.03) }'
    + '.ar-lvl.active { background:linear-gradient(135deg,#1e40af,#1e3a8a); color:#fff; '
    +   'border-color:#1e40af; box-shadow:0 4px 14px rgba(30,64,175,.35); transform:scale(1.05) }'
    + '@keyframes arPulse {'
    +   '0%,100% { box-shadow:0 0 0 0 rgba(59,130,246,.5) }'
    +   '50% { box-shadow:0 0 0 8px rgba(59,130,246,0) }'
    + '}'
    /* --- body --- */
    + '.ar-body { flex:1; min-width:0; display:flex; flex-direction:column; background:#fff }'
    /* --- table --- */
    + '.ar-tw { overflow:auto; max-height:64vh; background:#fff; flex:1 }'
    + '.ar-tbl { width:100%; border-collapse:collapse; font-size:.85rem }'
    + '.ar-tbl thead th { background:linear-gradient(180deg,#dce8f5,#c8dcef); color:#1e40af; '
    +   'padding:11px 12px; text-align:center; font-weight:900; font-size:.8rem; '
    +   'border:1px solid #b9cfe5; white-space:nowrap; position:sticky; top:0; z-index:3 }'
    + '.ar-tbl thead th.ar-th-name { text-align:right; padding-right:16px }'
    + '.ar-tbl tbody td { padding:9px 12px; border:1px solid #dbe6f1; white-space:nowrap }'
    + '.ar-tbl tbody tr { cursor:pointer; transition:background .15s }'
    + '.ar-tbl tbody tr:hover { background:#f0f6ff !important }'
    + '.ar-tbl tbody tr.selected { background:#ffe9b3 !important; box-shadow:inset 0 0 0 2px #e8a33d }'
    + '.ar-tbl tbody tr.ar-sub { background:#f8fbff; font-size:.82rem; opacity:.9 }'
    + '.ar-tbl tbody tr.ar-sub td:first-child { padding-right:32px }'
    + '.ar-tbl .ar-code { font-family:monospace; direction:ltr; font-weight:800; color:#1e40af; text-align:center }'
    + '.ar-tbl .ar-name { text-align:right; font-weight:700; padding-right:16px !important }'
    + '.ar-tbl .ar-num { text-align:center; direction:ltr; font-variant-numeric:tabular-nums; font-weight:800 }'
    + '.ar-tbl .ar-num.zero { color:#cbd5e1; font-weight:500 }'
    + '.ar-tbl .ar-num.md { color:#059669 }'
    + '.ar-tbl .ar-num.mc { color:#dc2626 }'
    + '.ar-tbl .ar-tog { display:inline-flex; align-items:center; justify-content:center; '
    +   'width:18px; height:18px; border-radius:5px; background:#e0ecf8; color:#1e40af; '
    +   'font-size:.62rem; font-weight:900; cursor:pointer; margin-left:6px; user-select:none; vertical-align:middle }'
    + '.ar-tbl .ar-tog:hover { background:#3b82f6; color:#fff }'
    + '.ar-tbl .ar-tog.empty { visibility:hidden }'
    + '.ar-tbl .ar-badge { display:inline-block; font-size:.62rem; padding:1px 8px; '
    +   'border-radius:8px; margin-right:8px; font-weight:800; vertical-align:middle }'
    + '.ar-badge.b1 { background:#c7d2fe; color:#3730a3 }'
    + '.ar-badge.b2 { background:#bbf7d0; color:#065f46 }'
    + '.ar-badge.b3 { background:#fde68a; color:#92400e }'
    + '.ar-badge.b4 { background:#e2e8f0; color:#475569 }'
    + '.ar-tbl tfoot td { background:linear-gradient(180deg,#dce8f5,#c8dcef); color:#1e40af; '
    +   'padding:12px; font-weight:900; text-align:center; border:1px solid #b9cfe5; '
    +   'position:sticky; bottom:0; z-index:3 }'
    + '.ar-empty { padding:40px 20px; text-align:center; color:#94a3b8; font-size:.9rem }'
    /* --- responsive --- */
    + '@media (max-width:720px) {'
    +   '.ar-main { flex-direction:column }'
    +   '.ar-side { width:100%; border-left:none; border-bottom:1px solid var(--border) }'
    +   '.ar-levels { flex-direction:row; flex-wrap:wrap; padding:8px; gap:6px }'
    +   '.ar-lvl { flex:1; min-width:80px; padding:9px 8px; font-size:.78rem }'
    +   '.ar-tbl { font-size:.74rem }'
    +   '.ar-tbl thead th, .ar-tbl tbody td { padding:7px 8px }'
    + '}'
    /* --- clean filter form --- */
    + '#ra-clean-panel { margin-bottom:12px; background:#fff; border:1px solid var(--border); border-radius:14px; overflow:hidden }'
    + '#ra-clean-head { display:flex; align-items:center; gap:10px; padding:12px 16px; '
    +   'background:linear-gradient(180deg,#e8f0fb,#f4f8fd); cursor:pointer; user-select:none }'
    + '#ra-clean-head:hover { background:linear-gradient(180deg,#dbe7f6,#e8f0fb) }'
    + '#ra-clean-head .rch-icon { font-size:1rem }'
    + '#ra-clean-head .rch-title { flex:1; font-weight:900; color:#1e40af; font-size:.9rem }'
    + '#ra-clean-head .rch-arrow { font-size:.75rem; color:#1e40af; transition:transform .25s }'
    + '#ra-clean-head.open .rch-arrow { transform:rotate(180deg) }'
    + '#ra-clean-body { padding:14px 16px; border-top:1px solid var(--border) }'
    + '#ra-clean-body.hidden { display:none }';
    document.head.appendChild(s);
})();

/* =====================================================================
   ★ بخش ۲: بازسازی پنل فیلتر (حذف قدیمی، ساخت جدید)
   ===================================================================== */
function rebuildAccountFilterPanel() {
    var page = document.getElementById('page-report-account');
    if (!page) return;

    // اگر قبلاً ساخته شده، کاری نکن
    if (document.getElementById('ra-clean-panel')) return;

    // پیدا کردن اولین کارت داخل صفحه
    var firstCard = page.querySelector('.card');
    if (!firstCard) return;

    // ★ همه محتوای قبلی کارت را پاک کن (شامل محدوده اسناد و فیلدهای اضافی)
    // اما شناسه‌ها را نگه می‌داریم: ra-from, ra-to, ra-vtype, ra-cat, ra-nature, ra-only-balance, ra-run, ra-print, ra-export
    var oldValues = {
        from: (document.getElementById('ra-from') || {}).value || '',
        to: (document.getElementById('ra-to') || {}).value || '',
        vtype: (document.getElementById('ra-vtype') || {}).value || '',
        cat: (document.getElementById('ra-cat') || {}).value || '',
        nature: (document.getElementById('ra-nature') || {}).value || '',
        onlyBal: document.getElementById('ra-only-balance') ? document.getElementById('ra-only-balance').checked : false
    };

    // پاک کردن کارت
    firstCard.innerHTML = '';

    // ساخت پنل جدید
    var panel = document.createElement('div');
    panel.id = 'ra-clean-panel';
    panel.innerHTML = ''
        + '<div id="ra-clean-head" class="open">'
        +   '<span class="rch-icon">🔍</span>'
        +   '<span class="rch-title">فیلترها</span>'
        +   '<span class="rch-arrow">▼</span>'
        + '</div>'
        + '<div id="ra-clean-body">'
        +   '<div class="grid-2">'
        +     '<div class="field"><label>از تاریخ</label><input type="text" id="ra-from" class="date-picker" dir="ltr" value="' + esc(oldValues.from) + '"></div>'
        +     '<div class="field"><label>تا تاریخ</label><input type="text" id="ra-to" class="date-picker" dir="ltr" value="' + esc(oldValues.to) + '"></div>'
        +   '</div>'
        +   '<div class="grid-2">'
        +     '<div class="field"><label>نوع حساب</label><select id="ra-cat">'
        +       '<option value="">همه</option>'
        +       '<option value="permanent"' + (oldValues.cat === 'permanent' ? ' selected' : '') + '>دائمی</option>'
        +       '<option value="temporary"' + (oldValues.cat === 'temporary' ? ' selected' : '') + '>موقت</option>'
        +     '</select></div>'
        +     '<div class="field"><label>ماهیت</label><select id="ra-nature">'
        +       '<option value="">همه</option>'
        +       '<option value="debit"' + (oldValues.nature === 'debit' ? ' selected' : '') + '>بدهکار</option>'
        +       '<option value="credit"' + (oldValues.nature === 'credit' ? ' selected' : '') + '>بستانکار</option>'
        +     '</select></div>'
        +   '</div>'
        +   '<div class="grid-2">'
        +     '<div class="field"><label>نوع سند</label><select id="ra-vtype">'
        +       '<option value="">همه</option>'
        +       '<option value="general"' + (oldValues.vtype === 'general' ? ' selected' : '') + '>عمومی</option>'
        +       '<option value="opening"' + (oldValues.vtype === 'opening' ? ' selected' : '') + '>افتتاحیه</option>'
        +       '<option value="establishment"' + (oldValues.vtype === 'establishment' ? ' selected' : '') + '>افتتاحیه استقرار</option>'
        +       '<option value="closing"' + (oldValues.vtype === 'closing' ? ' selected' : '') + '>بستن حساب</option>'
        +       '<option value="final"' + (oldValues.vtype === 'final' ? ' selected' : '') + '>اختتامیه</option>'
        +     '</select></div>'
        +     '<div class="field" style="display:flex; align-items:flex-end">'
        +       '<label class="checkbox-item" style="margin:0; padding:11px 14px; background:#eaf4fd; border:1.5px solid #93c5fd; border-radius:12px; width:100%">'
        +         '<input type="checkbox" id="ra-only-balance"' + (oldValues.onlyBal ? ' checked' : '') + '> '
        +         '<span style="font-weight:800; color:#1e40af">✔ فقط حساب‌های دارای مانده</span>'
        +       '</label>'
        +     '</div>'
        +   '</div>'
        +   '<div class="form-buttons" style="margin-top:14px">'
        +     '<button id="ra-run" class="btn-primary">🔍 اجرا</button>'
        +     '<button id="ra-print" class="btn-secondary">🖨 چاپ</button>'
        +     '<button id="ra-export" class="btn-secondary">📊 اکسل</button>'
        +   '</div>'
        + '</div>';

    firstCard.appendChild(panel);

    // ★ جمع‌کردن/باز کردن پنل
    var head = document.getElementById('ra-clean-head');
    var body = document.getElementById('ra-clean-body');
    head.addEventListener('click', function() {
        var isHidden = body.classList.toggle('hidden');
        head.classList.toggle('open', !isHidden);
    });

    // ★ بایند دکمه‌ها
    document.getElementById('ra-run').addEventListener('click', function() {
        _AR.activeLevel = 1;
        _AR.parentId = null;
        _AR.selectedId = null;
        _AR.expanded = {};
        renderAccountReview();
    });
    document.getElementById('ra-print').addEventListener('click', function() {
        if (typeof printHtmlReport === 'function') printHtmlReport('#ra-result', 'مرور حساب‌ها');
    });
    document.getElementById('ra-export').addEventListener('click', function() {
        if (typeof exportReportTable === 'function') exportReportTable('#ra-result', 'account-report');
    });
    var cb = document.getElementById('ra-only-balance');
    cb.addEventListener('change', function() {
        renderAccountReview();
    });

    // تاریخ‌ها - پیوستن pickers
    if (typeof attachDatePickers === 'function') attachDatePickers();
}

/* =====================================================================
   ★ بخش ۳: توابع کمکی
   ===================================================================== */
function _arLevel(acc, all) {
    var lvl = 1, cur = acc;
    while (cur && cur.parent) {
        lvl++;
        cur = all.find(function(a) { return a.id === cur.parent; });
    }
    return lvl;
}

function _arChildrenOf(pid, all) {
    return all.filter(function(a) { return a.parent === pid; });
}

function _arBreadcrumb(parentId, all) {
    if (!parentId) return '<a data-goto-lvl="1">گروه</a>';
    var path = [], cur = all.find(function(a) { return a.id === parentId; });
    while (cur) {
        path.unshift(cur);
        if (!cur.parent) break;
        cur = all.find(function(a) { return a.id === cur.parent; });
    }
    var html = '<a data-goto-lvl="1">گروه</a>';
    path.forEach(function(p) {
        html += '<span class="sep">›</span><a data-goto="' + p.id + '">' + esc(p.name) + '</a>';
    });
    return html;
}

/* =====================================================================
   ★ بخش ۴: رسم گزارش
   ===================================================================== */
function renderAccountReview() {
    var box = document.getElementById('ra-result');
    if (!box) return;

    var accounts = DB.load('accounts', []);
    var opts = {
        from: (document.getElementById('ra-from') || {}).value || '',
        to: (document.getElementById('ra-to') || {}).value || '',
        vtype: (document.getElementById('ra-vtype') || {}).value || '',
        cat: (document.getElementById('ra-cat') || {}).value || '',
        nature: (document.getElementById('ra-nature') || {}).value || '',
        level: 4
    };
    var cb = document.getElementById('ra-only-balance');
    var filterBal = cb && cb.checked;
    var hide = getHideState('ra');

    // محاسبه بالانس‌ها
    var result = computeAccountBalances(opts);
    var rolled = rollupBalances(accounts, result.balances);
    var detailBals = result.detailBalances || {};

    // لیست حساب‌های سطح جاری
    var listAccounts = [];
    if (_AR.activeLevel <= 3) {
        accounts.forEach(function(a) {
            var lvl = _arLevel(a, accounts);
            if (lvl !== _AR.activeLevel) return;
            if (_AR.activeLevel === 1) {
                if (a.parent) return;
            } else if (_AR.parentId) {
                if (a.parent !== _AR.parentId) return;
            }
            // بررسی والد در سطح بالاتر اگر parentId دارد
            if (_AR.activeLevel === 2 && _AR.parentId) {
                if (a.parent !== _AR.parentId) return;
            }
            if (_AR.activeLevel === 3 && _AR.parentId) {
                if (a.parent !== _AR.parentId) return;
            }
            listAccounts.push(a);
        });
    } else if (_AR.activeLevel === 4 && _AR.parentId) {
        // سطح ۴ = تفصیلی
        Object.keys(detailBals).forEach(function(did) {
            var d = detailBals[did];
            if (d.parent === _AR.parentId) {
                listAccounts.push({
                    id: did,
                    isDetail: true,
                    linkType: d.linkType,
                    parent: _AR.parentId,
                    name: getDetailLabel(d.linkType, did),
                    code: '',
                    debit: d.debit,
                    credit: d.credit
                });
            }
        });
    }

    // ساخت HTML
    var html = '<div class="ar-wrap">';

    // ----- نوار عنوان + breadcrumb -----
    html += '<div class="ar-tb">';
    html += '<div class="ar-tb-title">گزارش مرور حساب‌ها</div>';
    html += '<div class="ar-tb-bc">' + _arBreadcrumb(_AR.parentId, accounts) + '</div>';
    html += '</div>';

    html += '<div class="ar-main">';

    // ----- سایدبار سطوح -----
    html += '<div class="ar-side">';
    html += '<div class="ar-side-head">سطوح حساب</div>';
    html += '<div class="ar-levels">';
    [1, 2, 3, 4].forEach(function(lvl) {
        var cls = 'ar-lvl';
        if (lvl === _AR.activeLevel) cls += ' active';
        else if (canActivateLevel(lvl, accounts)) cls += ' clickable';
        else cls += ' disabled';
        html += '<div class="' + cls + '" data-lvl="' + lvl + '">';
        html += '<span>' + _AR_LEVELS[lvl] + '</span>';
        html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    // ----- بدنه -----
    html += '<div class="ar-body">';
    html += '<div class="ar-tw"><table class="ar-tbl"><thead><tr>';
    html += '<th style="width:110px">کد</th>';
    html += '<th class="ar-th-name">عنوان</th>';
    html += '<th style="width:170px">گردش بدهکار</th>';
    html += '<th style="width:170px">گردش بستانکار</th>';
    html += '<th style="width:170px">مانده بدهکار</th>';
    html += '<th style="width:170px">مانده بستانکار</th>';
    html += '</tr></thead><tbody>';

    var tD = 0, tC = 0, tMD = 0, tMC = 0, shown = 0;

    listAccounts.forEach(function(a) {
        // بالانس
        var b;
        if (a.isDetail) {
            b = { debit: Number(a.debit) || 0, credit: Number(a.credit) || 0 };
        } else {
            b = rolled[a.id] || { debit: 0, credit: 0 };
        }
        if (filterBal && !b.debit && !b.credit) return;

        var net = b.debit - b.credit;
        var md = net > 0 ? net : 0;
        var mc = net < 0 ? -net : 0;

        // بررسی فرزند
        var hasChildren = false;
        if (!a.isDetail && _AR.activeLevel < 4) {
            hasChildren = accounts.some(function(x) { return x.parent === a.id; });
            // اگر معین است، ممکن است تفصیلی داشته باشد
            if (_AR.activeLevel === 3) {
                hasChildren = hasChildren || Object.keys(detailBals).some(function(did) {
                    return detailBals[did].parent === a.id;
                });
            }
        }
        var isExpanded = _AR.expanded[a.id] === true;

        var toggleHtml = hasChildren
            ? '<span class="ar-tog" data-tog="' + a.id + '">' + (isExpanded ? '▼' : '◀') + '</span>'
            : '<span class="ar-tog empty">•</span>';

        var rowCls = 'ar-row' + (a.id === _AR.selectedId ? ' selected' : '');

        var lvlName = _AR_LEVELS[_AR.activeLevel];
        var badgeCls = 'b' + Math.min(_AR.activeLevel, 4);

        html += '<tr class="' + rowCls + '" data-id="' + a.id + '"' + (a.isDetail ? ' data-detail="1" data-link="' + a.linkType + '"' : '') + '>';
        html += '<td class="ar-code">' + toggleHtml + ' ' + esc(a.code || '—') + '</td>';
        html += '<td class="ar-name">' + esc(a.name || '') + (a.isDetail ? '' : ' <span class="ar-badge ' + badgeCls + '">' + lvlName + '</span>') + '</td>';
        html += '<td class="ar-num' + (b.debit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(b.debit)) + '</td>';
        html += '<td class="ar-num' + (b.credit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(b.credit)) + '</td>';
        html += '<td class="ar-num md' + (md ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(md)) + '</td>';
        html += '<td class="ar-num mc' + (mc ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(mc)) + '</td>';
        html += '</tr>';
        tD += b.debit; tC += b.credit; tMD += md; tMC += mc;
        shown++;

        // ----- نمایش درختی زیرمجموعه‌ها -----
        if (isExpanded && hasChildren) {
            // زیرمجموعه‌های سطح بعد
            var kids = _arChildrenOf(a.id, accounts);
            if (kids.length > 0 && _AR.activeLevel < 4) {
                kids.forEach(function(k) {
                    var kb = rolled[k.id] || { debit: 0, credit: 0 };
                    var kn = kb.debit - kb.credit;
                    var kmd = kn > 0 ? kn : 0;
                    var kmc = kn < 0 ? -kn : 0;
                    html += '<tr class="ar-row ar-sub" data-id="' + k.id + '">';
                    html += '<td class="ar-code">' + esc(k.code || '') + '</td>';
                    html += '<td class="ar-name">' + esc(k.name || '') + '</td>';
                    html += '<td class="ar-num' + (kb.debit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(kb.debit)) + '</td>';
                    html += '<td class="ar-num' + (kb.credit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(kb.credit)) + '</td>';
                    html += '<td class="ar-num md' + (kmd ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(kmd)) + '</td>';
                    html += '<td class="ar-num mc' + (kmc ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(kmc)) + '</td>';
                    html += '</tr>';
                });
            }
            // اگر معین است، تفصیلی‌ها را هم نشان بده
            if (_AR.activeLevel === 3) {
                Object.keys(detailBals).forEach(function(did) {
                    var d = detailBals[did];
                    if (d.parent !== a.id) return;
                    var dn = d.debit - d.credit;
                    var dmd = dn > 0 ? dn : 0;
                    var dmc = dn < 0 ? -dn : 0;
                    html += '<tr class="ar-row ar-sub" data-detail-id="' + did + '" data-parent-id="' + a.id + '" data-link="' + d.linkType + '">';
                    html += '<td class="ar-code">—</td>';
                    html += '<td class="ar-name">' + esc(getDetailLabel(d.linkType, did)) + ' <span class="ar-badge b4">' + linkTypeName(d.linkType) + '</span></td>';
                    html += '<td class="ar-num' + (d.debit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(d.debit)) + '</td>';
                    html += '<td class="ar-num' + (d.credit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(d.credit)) + '</td>';
                    html += '<td class="ar-num md' + (dmd ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(dmd)) + '</td>';
                    html += '<td class="ar-num mc' + (dmc ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(dmc)) + '</td>';
                    html += '</tr>';
                });
            }
        }
    });

    if (shown === 0) {
        html += '<tr><td colspan="6" class="ar-empty">' +
            (filterBal ? 'هیچ حسابی با مانده در این سطح نیست.' : 'حسابی در این سطح وجود ندارد.') +
            '</td></tr>';
    }

    html += '</tbody><tfoot><tr>';
    html += '<td colspan="2" style="text-align:right; padding-right:20px">جمع کل</td>';
    html += '<td>' + (hide ? '—' : moneyHtml(tD)) + '</td>';
    html += '<td>' + (hide ? '—' : moneyHtml(tC)) + '</td>';
    html += '<td>' + (hide ? '—' : moneyHtml(tMD)) + '</td>';
    html += '<td>' + (hide ? '—' : moneyHtml(tMC)) + '</td>';
    html += '</tr></tfoot></table></div>';
    html += '</div>';  // ar-body
    html += '</div>';  // ar-main
    html += '</div>';  // ar-wrap

    box.innerHTML = html;

    // شمارنده
    var cnt = document.getElementById('ra-count');
    if (cnt) cnt.textContent = toFa(shown);

    // بایند رویدادها
    bindAccountReviewEvents(accounts, box, detailBals);
}

/* آیا سطح قابل فعال شدن است؟ */
function canActivateLevel(lvl, accounts) {
    // می‌توان به سطح بالاتر (والد) همیشه رفت
    if (lvl < _AR.activeLevel) return true;
    // سطح بعدی فقط اگر سطر انتخاب شده باشد و فرزند داشته باشد
    if (lvl === _AR.activeLevel + 1 && _AR.selectedId) {
        var selected = accounts.find(function(a) { return a.id === _AR.selectedId; });
        if (!selected) return false;
        // معین: هم زیرمعین دارد هم می‌تواند تفصیلی داشته باشد
        if (lvl === 4 && _arLevel(selected, accounts) === 3) return true;
        // سطوح دیگر: بررسی فرزند
        return accounts.some(function(a) { return a.parent === _AR.selectedId; });
    }
    return false;
}

/* =====================================================================
   ★ بخش ۵: رویدادها
   ===================================================================== */
function bindAccountReviewEvents(accounts, box, detailBals) {
    // ----- کلیک روی سطوح سایدبار -----
    box.querySelectorAll('.ar-lvl').forEach(function(el) {
        el.addEventListener('click', function(e) {
            if (this.classList.contains('disabled')) return;
            var lvl = Number(this.getAttribute('data-lvl'));

            if (lvl < _AR.activeLevel) {
                // برگشت به سطح بالاتر
                if (lvl === 1) {
                    _AR.parentId = null;
                } else {
                    // پیدا کردن والد سطح مورد نظر
                    // اگر سطر انتخاب‌شده داریم، از آن بالا برو
                    if (_AR.selectedId) {
                        var sel = accounts.find(function(a) { return a.id === _AR.selectedId; });
                        if (sel) {
                            var pId = sel.parent;
                            // سطح والدین را از بالا پیدا کن
                            var targetId = pId;
                            var target = accounts.find(function(a) { return a.id === targetId; });
                            if (target) {
                                var tLvl = _arLevel(target, accounts);
                                // اگر سطح والد دقیقاً lvl نیست، بالاتر برو
                                while (target && _arLevel(target, accounts) > lvl) {
                                    target = accounts.find(function(a) { return a.id === target.parent; });
                                }
                                _AR.parentId = target ? target.id : null;
                            }
                        }
                    } else {
                        _AR.parentId = null;
                    }
                }
                _AR.activeLevel = lvl;
                _AR.selectedId = null;
                renderAccountReview();
                return;
            }

            if (lvl === _AR.activeLevel + 1 && _AR.selectedId) {
                // ★ رفتن به سطح پایین‌تر (ذره‌بین)
                _AR.parentId = _AR.selectedId;
                _AR.activeLevel = lvl;
                _AR.selectedId = null;
                renderAccountReview();
                return;
            }

            if (lvl === _AR.activeLevel) return;
        });
    });

    // ----- breadcrumb -----
    box.querySelectorAll('[data-goto]').forEach(function(a) {
        a.addEventListener('click', function() {
            var id = this.getAttribute('data-goto');
            var acc = accounts.find(function(a2) { return a2.id === id; });
            if (!acc) return;
            var lvl = _arLevel(acc, accounts);
            _AR.parentId = acc.id;
            _AR.activeLevel = Math.min(lvl + 1, 4);
            _AR.selectedId = null;
            renderAccountReview();
        });
    });
    box.querySelectorAll('[data-goto-lvl]').forEach(function(a) {
        a.addEventListener('click', function() {
            var lvl = Number(this.getAttribute('data-goto-lvl'));
            _AR.parentId = null;
            _AR.activeLevel = lvl;
            _AR.selectedId = null;
            renderAccountReview();
        });
    });

    // ----- toggle (فلش ▼ روی ردیف‌های دارای فرزند) -----
    box.querySelectorAll('[data-tog]').forEach(function(t) {
        t.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.getAttribute('data-tog');
            _AR.expanded[id] = !_AR.expanded[id];
            renderAccountReview();
        });
    });

    // ----- کلیک روی سطر -----
    box.querySelectorAll('.ar-row').forEach(function(tr) {
        // single click
        tr.addEventListener('click', function(e) {
            if (e.target.closest('[data-tog]')) return;
            var id = this.getAttribute('data-id') || this.getAttribute('data-detail-id');
            _AR.selectedId = id;
            // رسم مجدد برای فعال‌سازی ذره‌بین سطح بعدی
            renderAccountReview();
        });
        // double click
        tr.addEventListener('dblclick', function(e) {
            if (e.target.closest('[data-tog]')) return;
            var id = this.getAttribute('data-id');
            var did = this.getAttribute('data-detail-id');
            var pid = this.getAttribute('data-parent-id');
            var link = this.getAttribute('data-link');

            if (id && !did) {
                // حساب عادی → گردش
                openAccountTurnoverSafe(id, null);
            } else if (did && pid) {
                // تفصیلی
                openAccountTurnoverSafe(pid, { linkType: link, detailId: did });
            }
        });
    });
}

/* =====================================================================
   ★ بخش ۶: باز کردن گردش حساب + ویرایش سند (با کلیک روی ردیف در مودال)
   ===================================================================== */
function openAccountTurnoverSafe(accountId, detailInfo) {
    if (typeof openAccountTurnover !== 'function') return;
    openAccountTurnover(accountId, detailInfo);
    // ★ بعد از باز شدن مودال، ردیف‌ها را کلیک‌پذیر می‌کنیم
    setTimeout(function() {
        var body = document.getElementById('turnover-body');
        if (!body) return;
        var tbody = body.querySelector('tbody');
        if (!tbody) return;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            tr.style.cursor = 'pointer';
            tr.title = 'دبل‌کلیک برای ویرایش سند';
            if (tr.dataset.editBound) return;
            tr.dataset.editBound = '1';
            tr.addEventListener('dblclick', function() {
                var cells = tr.querySelectorAll('td');
                if (cells.length < 3) return;
                var numTxt = cells[2].textContent.trim();
                var numVal = normalizeDigits(numTxt).replace(/[^\d]/g, '');
                var v = DB.load('vouchers', []).find(function(x) {
                    return String(normalizeDigits(String(x.number))).replace(/[^\d]/g, '') === numVal;
                });
                if (v && typeof openVoucherForEditById === 'function') {
                    openVoucherForEditById(v.id);
                }
            });
        });
    }, 200);
}

/* =====================================================================
   ★ بخش ۷: راه‌اندازی
   ===================================================================== */
(function initAccountReviewFinal() {
    function apply() {
        // ۱) بازسازی پنل فیلتر
        rebuildAccountFilterPanel();

        // ۲) override تابع
        window.runAccountReport = function() {
            _AR.activeLevel = 1;
            _AR.parentId = null;
            _AR.selectedId = null;
            _AR.expanded = {};
            renderAccountReview();
        };
        window._renderAccountReportTree = renderAccountReview;

        // ۳) پاک کردن پنل‌های قدیمی فایل ۱۲/۱۳
        ['arv2-wrap', 'acr-wrap', 'arv2-filters', 'acr-filter-bar', 'acr-side'].forEach(function(cls) {
            document.querySelectorAll('.' + cls).forEach(function(el) {
                var parent = el.closest('.card');
                if (parent && parent.id !== 'ra-clean-panel') {
                    // فقط اگر داخل گزارش هستند
                }
            });
        });

        // ۴) مخفی کردن فیلدهای قدیمی (دوره، سطح)
        ['ra-period', 'ra-level'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                var field = el.closest('.field');
                if (field) field.style.display = 'none';
            }
        });

        // ۵) وقتی کاربر به صفحه می‌رود، خودکار رسم کن
        var page = document.getElementById('page-report-account');
        if (page) {
            var observer = new MutationObserver(function() {
                if (page.classList.contains('active')) {
                    var box = document.getElementById('ra-result');
                    if (box && !box.querySelector('.ar-wrap')) {
                        renderAccountReview();
                    }
                }
            });
            observer.observe(page, { attributes: true, attributeFilter: ['class'] });
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(apply, 2500); });
    } else {
        setTimeout(apply, 2500);
    }
})();

console.log('✅ گزارش مرور حساب‌ها v32 — نسخه نهایی');
