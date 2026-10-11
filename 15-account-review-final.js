/* =====================================================================
   پارسیس v36 — 15-account-review-final.js
   گزارش مرور حساب‌ها — نسخه نهایی با آیکن گردش

   تغییرات v36:
   ✔ رفع خطای «Cannot read properties of null» در گردش
   ✔ ساخت خودکار المان‌های ra-period و ra-level
   ✔ دکمه 📊 گردش با onclick مستقیم
   ✔ ستون «عملیات» با دکمه ویرایش در مودال گردش
   ===================================================================== */
'use strict';

var _AR = {
    activeLevel: 1,
    path: [],
    selectedId: null
};

var _AR_LEVELS = { 1: 'گروه', 2: 'کل', 3: 'معین', 4: 'تفصیل' };

/* =====================================================================
   ★ استایل
   ===================================================================== */
(function injectStyle() {
    if (document.getElementById('ar-final-style')) return;
    var s = document.createElement('style');
    s.id = 'ar-final-style';
    s.textContent = ''
    + '.ar-wrap { background:#fff; border-radius:14px; border:1px solid var(--border); overflow:hidden; direction:rtl }'
    + '.ar-tb { display:flex; align-items:center; gap:10px; padding:10px 14px; '
    +   'background:linear-gradient(180deg,#e8f0fb,#f4f8fd); border-bottom:1px solid var(--border) }'
    + '.ar-tb-title { flex:1; text-align:center; font-weight:900; color:#1e40af; font-size:.88rem }'
    + '.ar-tb-bc { font-size:.8rem; color:#64748b }'
    + '.ar-tb-bc a { color:#1e40af; text-decoration:none; cursor:pointer; border-bottom:1px dashed #93c5fd; padding:0 2px }'
    + '.ar-tb-bc a:hover { background:#dbeafe }'
    + '.ar-tb-bc .sep { color:#cbd5e1; margin:0 4px }'
    + '.ar-main { display:flex; min-height:460px }'
    /* sidebar */
    + '.ar-side { width:170px; flex-shrink:0; border-left:1px solid var(--border); background:#f7fafd; display:flex; flex-direction:column }'
    + '.ar-side-head { padding:11px 14px; font-weight:900; color:#1e40af; font-size:.8rem; '
    +   'background:linear-gradient(180deg,#dbe7f6,#c8dcef); border-bottom:1px solid var(--border); text-align:center }'
    + '.ar-levels { padding:10px; display:flex; flex-direction:column; gap:6px; overflow-y:auto }'
    + '.ar-lvl { position:relative; padding:12px 14px; border-radius:12px; text-align:center; '
    +   'font-size:.86rem; font-weight:800; color:#334155; background:#fff; '
    +   'border:1.5px solid #e0ecf8; cursor:pointer; user-select:none; transition:all .2s }'
    + '.ar-lvl.disabled { opacity:.35; cursor:not-allowed }'
    + '.ar-lvl.clickable { border-color:#3b82f6; color:#1e40af; background:linear-gradient(135deg,#dbeafe,#eff6ff) }'
    + '.ar-lvl.clickable.next { animation:arPulse 1.6s ease-in-out infinite }'
    + '.ar-lvl.clickable:hover { transform:scale(1.03) }'
    + '.ar-lvl.active { background:linear-gradient(135deg,#1e40af,#1e3a8a); color:#fff; '
    +   'border-color:#1e40af; box-shadow:0 4px 14px rgba(30,64,175,.35); transform:scale(1.05) }'
    + '@keyframes arPulse { 0%,100% { box-shadow:0 0 0 0 rgba(59,130,246,.5) } 50% { box-shadow:0 0 0 8px rgba(59,130,246,0) } }'
    /* body */
    + '.ar-body { flex:1; min-width:0; display:flex; flex-direction:column; background:#fff }'
    + '.ar-toolbar { margin:0 !important; border-radius:0 !important; border-bottom:1px solid var(--border) !important; '
    +   'padding:8px 12px !important; box-shadow:none !important }'
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
    + '.ar-tbl .ar-code { font-family:monospace; direction:ltr; font-weight:800; color:#1e40af; text-align:center; '
    +   'display:flex; align-items:center; justify-content:center; gap:6px }'
    + '.ar-tbl .ar-name { text-align:right; font-weight:700; padding-right:16px !important }'
    + '.ar-tbl .ar-num { text-align:center; direction:ltr; font-variant-numeric:tabular-nums; font-weight:800 }'
    + '.ar-tbl .ar-num.zero { color:#cbd5e1; font-weight:500 }'
    + '.ar-tbl .ar-num.md { color:#059669 }'
    + '.ar-tbl .ar-num.mc { color:#dc2626 }'
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
    /* دکمه گردش */
    + '.ar-turnover-btn { display:inline-flex; align-items:center; justify-content:center; '
    +   'width:26px; height:26px; border-radius:6px; background:#dbeafe; color:#1e40af; '
    +   'border:1px solid #93c5fd; cursor:pointer; font-size:.85rem; padding:0; '
    +   'transition:all .15s; flex-shrink:0; font-family:inherit; line-height:1 }'
    + '.ar-turnover-btn:hover { background:#1e40af; color:#fff; transform:scale(1.15); '
    +   'box-shadow:0 2px 8px rgba(30,64,175,.4) }'
    + '.ar-turnover-btn:active { transform:scale(0.95) }'
    + '@media (max-width:720px) {'
    +   '.ar-main { flex-direction:column }'
    +   '.ar-side { width:100%; border-left:none; border-bottom:1px solid var(--border) }'
    +   '.ar-levels { flex-direction:row; flex-wrap:wrap; padding:8px; gap:6px }'
    +   '.ar-lvl { flex:1; min-width:80px; padding:9px 8px; font-size:.78rem }'
    +   '.ar-tbl { font-size:.74rem }'
    +   '.ar-tbl thead th, .ar-tbl tbody td { padding:7px 8px }'
    +   '.ar-turnover-btn { width:22px; height:22px; font-size:.72rem }'
    + '}'
    /* filter panel */
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
   ★ پنل فیلتر
   ===================================================================== */
function rebuildAccountFilterPanel() {
    var page = document.getElementById('page-report-account');
    if (!page) return;
    if (document.getElementById('ra-clean-panel')) return;
    var firstCard = page.querySelector('.card');
    if (!firstCard) return;

    var oldV = {
        from: (document.getElementById('ra-from') || {}).value || '',
        to: (document.getElementById('ra-to') || {}).value || '',
        vtype: (document.getElementById('ra-vtype') || {}).value || '',
        cat: (document.getElementById('ra-cat') || {}).value || '',
        nature: (document.getElementById('ra-nature') || {}).value || '',
        onlyBal: document.getElementById('ra-only-balance') ? document.getElementById('ra-only-balance').checked : false
    };

    firstCard.innerHTML = '';

    // ★ اطمینان از وجود ra-period و ra-level (مخفی) برای openAccountTurnover
    if (!document.getElementById('ra-period')) {
        var hp = document.createElement('input');
        hp.type = 'hidden';
        hp.id = 'ra-period';
        hp.value = '';
        document.body.appendChild(hp);
    }
    if (!document.getElementById('ra-level')) {
        var hl = document.createElement('input');
        hl.type = 'hidden';
        hl.id = 'ra-level';
        hl.value = '3';
        document.body.appendChild(hl);
    }

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
        +     '<div class="field"><label>از تاریخ</label><input type="text" id="ra-from" class="date-picker" dir="ltr" value="' + esc(oldV.from) + '"></div>'
        +     '<div class="field"><label>تا تاریخ</label><input type="text" id="ra-to" class="date-picker" dir="ltr" value="' + esc(oldV.to) + '"></div>'
        +   '</div>'
        +   '<div class="grid-2">'
        +     '<div class="field"><label>نوع حساب</label><select id="ra-cat">'
        +       '<option value="">همه</option>'
        +       '<option value="permanent"' + (oldV.cat === 'permanent' ? ' selected' : '') + '>دائمی</option>'
        +       '<option value="temporary"' + (oldV.cat === 'temporary' ? ' selected' : '') + '>موقت</option>'
        +     '</select></div>'
        +     '<div class="field"><label>ماهیت</label><select id="ra-nature">'
        +       '<option value="">همه</option>'
        +       '<option value="debit"' + (oldV.nature === 'debit' ? ' selected' : '') + '>بدهکار</option>'
        +       '<option value="credit"' + (oldV.nature === 'credit' ? ' selected' : '') + '>بستانکار</option>'
        +     '</select></div>'
        +   '</div>'
        +   '<div class="grid-2">'
        +     '<div class="field"><label>نوع سند</label><select id="ra-vtype">'
        +       '<option value="">همه</option>'
        +       '<option value="general"' + (oldV.vtype === 'general' ? ' selected' : '') + '>عمومی</option>'
        +       '<option value="opening"' + (oldV.vtype === 'opening' ? ' selected' : '') + '>افتتاحیه</option>'
        +       '<option value="establishment"' + (oldV.vtype === 'establishment' ? ' selected' : '') + '>افتتاحیه استقرار</option>'
        +       '<option value="closing"' + (oldV.vtype === 'closing' ? ' selected' : '') + '>بستن حساب</option>'
        +       '<option value="final"' + (oldV.vtype === 'final' ? ' selected' : '') + '>اختتامیه</option>'
        +     '</select></div>'
        +     '<div class="field" style="display:flex; align-items:flex-end">'
        +       '<label class="checkbox-item" style="margin:0; padding:11px 14px; background:#eaf4fd; border:1.5px solid #93c5fd; border-radius:12px; width:100%">'
        +         '<input type="checkbox" id="ra-only-balance"' + (oldV.onlyBal ? ' checked' : '') + '> '
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

    document.getElementById('ra-clean-head').addEventListener('click', function() {
        var body = document.getElementById('ra-clean-body');
        var isHidden = body.classList.toggle('hidden');
        this.classList.toggle('open', !isHidden);
    });
    document.getElementById('ra-run').addEventListener('click', function() {
        _AR = { activeLevel: 1, path: [], selectedId: null };
        renderAccountReview();
    });
    document.getElementById('ra-print').addEventListener('click', function() {
        if (typeof printHtmlReport === 'function') printHtmlReport('#ra-result', 'مرور حساب‌ها');
    });
    document.getElementById('ra-export').addEventListener('click', function() {
        if (typeof exportReportTable === 'function') exportReportTable('#ra-result', 'account-report');
    });
    document.getElementById('ra-only-balance').addEventListener('change', function() {
        renderAccountReview();
    });

    if (typeof attachDatePickers === 'function') attachDatePickers();
}

/* =====================================================================
   ★ توابع کمکی
   ===================================================================== */
function _arLevel(acc, all) {
    var lvl = 1, cur = acc;
    while (cur && cur.parent) { lvl++; cur = all.find(function(a) { return a.id === cur.parent; }); }
    return lvl;
}
function _arBreadcrumb(path, all) {
    if (!path || path.length === 0) return '<a data-goto-lvl="1">گروه</a>';
    var html = '<a data-goto-lvl="1">گروه</a>';
    path.forEach(function(pid) {
        var acc = all.find(function(a) { return a.id === pid; });
        if (!acc) return;
        html += '<span class="sep">›</span><a data-goto="' + pid + '">' + esc(acc.name) + '</a>';
    });
    return html;
}

/* =====================================================================
   ★ رسم گزارش
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

    var result = computeAccountBalances(opts);
    var rolled = rollupBalances(accounts, result.balances);
    var detailBals = result.detailBalances || {};

    var parentId = null;
    if (_AR.activeLevel === 2) parentId = _AR.path[0] || null;
    else if (_AR.activeLevel === 3) parentId = _AR.path[1] || null;
    else if (_AR.activeLevel === 4) parentId = _AR.path[2] || null;

    var list = [];
    if (_AR.activeLevel <= 3) {
        accounts.forEach(function(a) {
            if (_arLevel(a, accounts) !== _AR.activeLevel) return;
            if (_AR.activeLevel === 1) {
                if (a.parent) return;
            } else if (parentId) {
                if (a.parent !== parentId) return;
            }
            list.push(a);
        });
    } else {
        Object.keys(detailBals).forEach(function(did) {
            var d = detailBals[did];
            if (parentId && d.parent !== parentId) return;
            list.push({
                id: did,
                isDetail: true,
                linkType: d.linkType,
                parentId: d.parent,
                name: getDetailLabel(d.linkType, did),
                code: '',
                debit: d.debit,
                credit: d.credit
            });
        });
    }

    var tD = 0, tC = 0, tMD = 0, tMC = 0, shown = 0;

    var html = '<div class="ar-wrap">';

    // titlebar
    html += '<div class="ar-tb">';
    html += '<div class="ar-tb-title">گزارش مرور حساب‌ها</div>';
    html += '<div class="ar-tb-bc">' + _arBreadcrumb(_AR.path, accounts) + '</div>';
    html += '</div>';

    html += '<div class="ar-main">';

    // سایدبار
    html += '<div class="ar-side">';
    html += '<div class="ar-side-head">سطوح حساب</div>';
    html += '<div class="ar-levels">';
    [1, 2, 3, 4].forEach(function(lvl) {
        var cls = 'ar-lvl';
        var state = _arLevelState(lvl);
        if (state === 'active') cls += ' active';
        else if (state === 'next') cls += ' clickable next';
        else if (state === 'clickable') cls += ' clickable';
        else cls += ' disabled';
        html += '<div class="' + cls + '" data-lvl="' + lvl + '">' + _AR_LEVELS[lvl] + '</div>';
    });
    html += '</div>';
    html += '</div>';

    // بدنه
    html += '<div class="ar-body">';

    // toolbar
    html += '<div class="list-header ar-toolbar" data-col-table="ra-acc-table" data-hide-key="ra">';
    html += '<span class="count-badge" id="ra-count">۰</span>';
    html += '<span style="flex:1"></span>';
    html += '</div>';

    // جدول
    html += '<div class="ar-tw">';
    html += '<table class="ar-tbl" id="ra-acc-table">';
    html += '<thead><tr>';
    html += '<th style="width:150px">کد و گردش</th>';
    html += '<th class="ar-th-name">عنوان</th>';
    html += '<th style="width:170px">گردش بدهکار</th>';
    html += '<th style="width:170px">گردش بستانکار</th>';
    html += '<th style="width:170px">مانده بدهکار</th>';
    html += '<th style="width:170px">مانده بستانکار</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    list.forEach(function(a) {
        var b;
        if (a.isDetail) b = { debit: Number(a.debit) || 0, credit: Number(a.credit) || 0 };
        else b = rolled[a.id] || { debit: 0, credit: 0 };
        if (filterBal && !b.debit && !b.credit) return;

        var net = b.debit - b.credit;
        var md = net > 0 ? net : 0;
        var mc = net < 0 ? -net : 0;

        var rowCls = 'ar-row' + (a.id === _AR.selectedId ? ' selected' : '');
        var badgeCls = 'b' + Math.min(_AR.activeLevel, 4);
        var lvlName = _AR_LEVELS[_AR.activeLevel];

        var turnoverAcc = a.isDetail ? a.parentId : a.id;
        var turnoverDetailAttr = a.isDetail
            ? ' data-turnover-detail="' + a.id + '" data-turnover-link="' + a.linkType + '"'
            : '';

        html += '<tr class="' + rowCls + '" '
             +  'data-id="' + (a.isDetail ? '' : a.id) + '" '
             +  (a.isDetail ? 'data-detail-id="' + a.id + '" data-parent-id="' + a.parentId + '" data-link="' + a.linkType + '"' : '')
             +  '>';

        html += '<td class="ar-code">';
        html += '<button type="button" class="ar-turnover-btn" '
             +  'data-turnover-acc="' + turnoverAcc + '"'
             +  turnoverDetailAttr
             +  ' onclick="event.stopPropagation(); window._AR_openTurnover(this); return false;" '
             +  'title="نمایش گردش حساب">📊</button>';
        html += '<span>' + esc(a.code || '—') + '</span>';
        html += '</td>';

        html += '<td class="ar-name">' + esc(a.name || '') + (a.isDetail ? '' : ' <span class="ar-badge ' + badgeCls + '">' + lvlName + '</span>') + '</td>';
        html += '<td class="ar-num' + (b.debit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(b.debit)) + '</td>';
        html += '<td class="ar-num' + (b.credit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(b.credit)) + '</td>';
        html += '<td class="ar-num md' + (md ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(md)) + '</td>';
        html += '<td class="ar-num mc' + (mc ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(mc)) + '</td>';
        html += '</tr>';
        tD += b.debit; tC += b.credit; tMD += md; tMC += mc; shown++;
    });

    if (shown === 0) {
        html += '<tr><td colspan="6" class="ar-empty">' +
            (filterBal ? 'هیچ حسابی با مانده در این سطح نیست.' : 'حسابی در این سطح نیست.') +
            '</td></tr>';
    }

    html += '</tbody><tfoot><tr>';
    html += '<td></td>';
    html += '<td style="text-align:right; padding-right:20px">جمع کل</td>';
    html += '<td>' + (hide ? '—' : moneyHtml(tD)) + '</td>';
    html += '<td>' + (hide ? '—' : moneyHtml(tC)) + '</td>';
    html += '<td>' + (hide ? '—' : moneyHtml(tMD)) + '</td>';
    html += '<td>' + (hide ? '—' : moneyHtml(tMC)) + '</td>';
    html += '</tr></tfoot>';
    html += '</table></div>';
    html += '</div></div></div>';

    box.innerHTML = html;

    var cnt = document.getElementById('ra-count');
    if (cnt) cnt.textContent = toFa(shown);

    bindAccountReviewEvents(accounts, box);

    setTimeout(function() {
        if (typeof buildHeaderButtons === 'function') buildHeaderButtons();
        if (typeof applyColVisibility === 'function') applyColVisibility('ra-acc-table');
        if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('ra-acc-table'));
    }, 30);
}

/* =====================================================================
   ★ وضعیت سطح
   ===================================================================== */
function _arLevelState(lvl) {
    if (lvl === _AR.activeLevel) return 'active';
    if (lvl === _AR.activeLevel + 1 && _AR.selectedId) return 'next';
    if (lvl < _AR.activeLevel) {
        if (lvl === 1) return 'clickable';
        if (lvl === 2) return 'clickable';
        if (lvl === 3) return _AR.path.length >= 1 ? 'clickable' : 'disabled';
        if (lvl === 4) return _AR.path.length >= 2 ? 'clickable' : 'disabled';
    }
    return 'disabled';
}

/* =====================================================================
   ★ رویدادها
   ===================================================================== */
function bindAccountReviewEvents(accounts, box) {
    // سطوح سایدبار
    box.querySelectorAll('.ar-lvl').forEach(function(el) {
        el.addEventListener('click', function() {
            if (this.classList.contains('disabled')) return;
            var lvl = Number(this.getAttribute('data-lvl'));
            if (lvl === _AR.activeLevel) return;

            if (lvl < _AR.activeLevel) {
                _AR.path = _AR.path.slice(0, lvl - 1);
            } else if (lvl === _AR.activeLevel + 1 && _AR.selectedId) {
                _AR.path[_AR.activeLevel - 1] = _AR.selectedId;
                _AR.path = _AR.path.slice(0, _AR.activeLevel);
            } else {
                return;
            }
            _AR.activeLevel = lvl;
            _AR.selectedId = null;
            renderAccountReview();
        });
    });

    // breadcrumb
    box.querySelectorAll('[data-goto]').forEach(function(a) {
        a.addEventListener('click', function() {
            var id = this.getAttribute('data-goto');
            var idx = _AR.path.indexOf(id);
            if (idx >= 0) {
                _AR.path = _AR.path.slice(0, idx + 1);
                _AR.activeLevel = idx + 1;
            } else {
                _AR.path = [];
                _AR.activeLevel = 1;
            }
            _AR.selectedId = null;
            renderAccountReview();
        });
    });
    box.querySelectorAll('[data-goto-lvl]').forEach(function(a) {
        a.addEventListener('click', function() {
            _AR.path = []; _AR.activeLevel = 1; _AR.selectedId = null;
            renderAccountReview();
        });
    });

    // کلیک روی سطر → انتخاب
    box.querySelectorAll('.ar-row').forEach(function(tr) {
        tr.addEventListener('click', function(e) {
            if (e.target.closest && e.target.closest('.ar-turnover-btn')) return;
            if (e.target.classList && e.target.classList.contains('ar-turnover-btn')) return;

            var id = tr.getAttribute('data-id') || tr.getAttribute('data-detail-id');
            var isDetail = tr.hasAttribute('data-detail-id');
            _AR.selectedId = id;
            if (isDetail) {
                _AR.path[3] = id;
                _AR.path = _AR.path.slice(0, 4);
            } else {
                _AR.path[_AR.activeLevel - 1] = id;
                _AR.path = _AR.path.slice(0, _AR.activeLevel);
            }
            renderAccountReview();
        });
    });
}

/* =====================================================================
   ★ تابع جهانی برای باز کردن گردش (از onclick صدا زده می‌شود)
   ===================================================================== */
window._AR_openTurnover = function(btn) {
    try {
        if (!btn) {
            console.warn('_AR_openTurnover: btn خالی است');
            return;
        }
        var accId = btn.getAttribute('data-turnover-acc');
        var detId = btn.getAttribute('data-turnover-detail');
        var link = btn.getAttribute('data-turnover-link');

        console.log('📊 Turnover click:', { accId: accId, detId: detId, link: link });

        if (!accId) {
            alert('⚠️ شناسه حساب یافت نشد.');
            return;
        }

        if (typeof openAccountTurnover !== 'function') {
            alert('⚠️ تابع گردش حساب در دسترس نیست. لطفاً فایل ۰۵ را بررسی کنید.');
            return;
        }

        if (detId && link) {
            _openTurnoverSafe(accId, { linkType: link, detailId: detId });
        } else {
            _openTurnoverSafe(accId, null);
        }
    } catch (err) {
        console.error('خطا در باز کردن گردش:', err);
        alert('خطا در باز کردن گردش:\n' + (err.message || err));
    }
};

/* =====================================================================
   ★ باز کردن گردش + افزودن دکمه ویرایش به هر ردیف
   ===================================================================== */
function _openTurnoverSafe(accountId, detailInfo) {
    // ★ رفع خطای null — اطمینان از وجود المان‌های مورد نیاز openAccountTurnover
    if (!document.getElementById('ra-period')) {
        var tp = document.createElement('input');
        tp.type = 'hidden';
        tp.id = 'ra-period';
        tp.value = '';
        document.body.appendChild(tp);
    }
    if (!document.getElementById('ra-level')) {
        var tl = document.createElement('input');
        tl.type = 'hidden';
        tl.id = 'ra-level';
        tl.value = '3';
        document.body.appendChild(tl);
    }
    // ★ همچنین ra-from، ra-to، ra-vtype مورد نیازند
    if (!document.getElementById('ra-from')) {
        var tf = document.createElement('input');
        tf.type = 'hidden';
        tf.id = 'ra-from';
        tf.value = '';
        document.body.appendChild(tf);
    }
    if (!document.getElementById('ra-to')) {
        var tt = document.createElement('input');
        tt.type = 'hidden';
        tt.id = 'ra-to';
        tt.value = '';
        document.body.appendChild(tt);
    }
    if (!document.getElementById('ra-vtype')) {
        var tv = document.createElement('input');
        tv.type = 'hidden';
        tv.id = 'ra-vtype';
        tv.value = '';
        document.body.appendChild(tv);
    }

    console.log('🔍 _openTurnoverSafe:', accountId, detailInfo);

    if (typeof openAccountTurnover !== 'function') {
        alert('تابع گردش حساب در دسترس نیست. فایل ۰۵ را بررسی کنید.');
        return;
    }

    try {
        openAccountTurnover(accountId, detailInfo);
    } catch (err) {
        console.error('خطا در openAccountTurnover:', err);
        alert('خطا: ' + (err.message || err));
        return;
    }

    setTimeout(function() {
        var body = document.getElementById('turnover-body');
        if (!body) { console.warn('turnover-body یافت نشد'); return; }
        var thead = body.querySelector('thead tr');
        var tbody = body.querySelector('tbody');
        if (!thead || !tbody) { console.warn('thead/tbody یافت نشد'); return; }

        // ستون عملیات در هدر
        if (!thead.querySelector('[data-action-col]')) {
            var th = document.createElement('th');
            th.setAttribute('data-action-col', '1');
            th.textContent = 'عملیات';
            th.style.textAlign = 'center';
            thead.appendChild(th);
        }

        // دکمه ویرایش در هر ردیف
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.dataset.editAdded === '1') return;
            tr.dataset.editAdded = '1';
            var cells = tr.querySelectorAll('td');
            if (cells.length < 3) return;
            var numTxt = cells[2].textContent.trim();
            var numVal = normalizeDigits(numTxt).replace(/[^\d]/g, '');
            var editCell = document.createElement('td');
            editCell.style.textAlign = 'center';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.title = 'ویرایش سند';
            btn.textContent = '✎';
            btn.style.cssText = 'background:#e0ecf8;color:#1e40af;border:none;border-radius:8px;width:34px;height:30px;font-size:1rem;cursor:pointer;font-weight:800';
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var v = DB.load('vouchers', []).find(function(x) {
                    return String(normalizeDigits(String(x.number))).replace(/[^\d]/g, '') === numVal;
                });
                if (v && typeof openVoucherForEditById === 'function') {
                    openVoucherForEditById(v.id);
                } else if (v && typeof loadVoucherForEdit === 'function') {
                    loadVoucherForEdit(v);
                } else {
                    alert('سند یافت نشد.');
                }
            });
            editCell.appendChild(btn);
            tr.appendChild(editCell);
        });
    }, 200);
}

/* =====================================================================
   ★ راه‌اندازی
   ===================================================================== */
(function initAccountReviewFinal() {
    function apply() {
        rebuildAccountFilterPanel();

        window.runAccountReport = function() {
            _AR = { activeLevel: 1, path: [], selectedId: null };
            renderAccountReview();
        };
        window._renderAccountReportTree = renderAccountReview;

        var page = document.getElementById('page-report-account');
        if (page) {
            var observer = new MutationObserver(function() {
                if (page.classList.contains('active')) {
                    var box = document.getElementById('ra-result');
                    if (box && !box.querySelector('.ar-wrap')) renderAccountReview();
                }
            });
            observer.observe(page, { attributes: true, attributeFilter: ['class'] });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(apply, 2500); });
    else setTimeout(apply, 2500);
})();

console.log('✅ گزارش مرور حساب‌ها v36 — رفع خطای null');
