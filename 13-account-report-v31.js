/* =====================================================================
   پارسیس v31 — 13-account-report-v31.js
   گزارش مرور حساب با ناوبری درختی دوسطحی:
   ✔ سایدبار با ۷ سطح (گروه، کل، معین، سطح چهار، سطح پنج، پیگیری، تفصیلی)
   ✔ کلیک روی هر سطر → سطوح مرتبط (بالا/پایین) در سایدبار فعال می‌شوند
   ✔ Breadcrumb در عنوان گزارش
   ✔ ردیف فیلتر زیر هدر + جمع فیلترشده
   ===================================================================== */
'use strict';

var _acr = {
    activeLevel: 1,
    parentId: null,
    selectedId: null,
    path: []
};

/* ---------- helpers ---------- */
function _acrLevel(acc, all) {
    var lvl = 1, cur = acc;
    while (cur && cur.parent) {
        lvl++;
        cur = all.find(function(a) { return a.id === cur.parent; });
    }
    return lvl;
}
function _acrPath(accId, all) {
    var out = [], cur = all.find(function(a) { return a.id === accId; });
    while (cur) { out.unshift(cur); if (!cur.parent) break; cur = all.find(function(a) { return a.id === cur.parent; }); }
    return out;
}

/* ---------- Style ---------- */
(function () {
    if (document.getElementById('acr-style')) return;
    var s = document.createElement('style');
    s.id = 'acr-style';
    s.textContent = ''
    + '.acr-wrap { background:#fff; border-radius:14px; border:1px solid var(--border); overflow:hidden }'
    + '.acr-top { display:flex; align-items:center; gap:6px; padding:8px 12px; background:linear-gradient(180deg,#e8f0fb,#f4f8fd); border-bottom:1px solid var(--border) }'
    + '.acr-top .acr-tab { padding:6px 14px; border-radius:8px; font-size:.8rem; font-weight:800; background:transparent; color:var(--text-muted); border:1px solid transparent; cursor:pointer }'
    + '.acr-top .acr-tab.active { background:#fff; color:#1e40af; border-color:var(--border) }'
    + '.acr-top .acr-title { flex:1; text-align:center; font-weight:900; color:#1e40af; font-size:.86rem }'
    + '.acr-main { display:flex; min-height:420px }'
    + '.acr-side { width:180px; flex-shrink:0; border-left:1px solid var(--border); background:#f7fafd; display:flex; flex-direction:column }'
    + '.acr-side-head { padding:10px 12px; font-weight:800; color:#1e40af; font-size:.8rem; background:linear-gradient(180deg,#e8f0fb,#dbe7f6); border-bottom:1px solid var(--border); display:flex; align-items:center; gap:6px }'
    + '.acr-side-head::before { content:"🔍"; font-size:.85rem }'
    + '.acr-levels { padding:8px; overflow-y:auto; flex:1 }'
    + '.acr-lvl { display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:10px; font-size:.84rem; font-weight:700; color:var(--text); cursor:pointer; margin-bottom:3px; transition:all .2s; user-select:none }'
    + '.acr-lvl .acr-ico { font-size:.85rem; opacity:.65 }'
    + '.acr-lvl.disabled { opacity:.35; cursor:not-allowed }'
    + '.acr-lvl.disabled:hover { background:none; transform:none }'
    + '.acr-lvl.clickable { background:#e0ecf8; color:#1e40af; border:1px dashed #93c5fd }'
    + '.acr-lvl.clickable:hover { background:#dbeafe; transform:translateX(-2px) }'
    + '.acr-lvl.active { background:linear-gradient(135deg,#1e40af,#1e3a8a); color:#fff; box-shadow:0 2px 8px rgba(30,64,175,.3) }'
    + '.acr-lvl .acr-dot { width:6px; height:6px; border-radius:50%; background:#3b82f6; margin-right:auto; animation:pulseDot 1.5s infinite }'
    + '@keyframes pulseDot { 0%,100% { transform:scale(1); opacity:1 } 50% { transform:scale(1.4); opacity:.5 } }'
    + '.acr-body { flex:1; min-width:0; display:flex; flex-direction:column }'
    + '.acr-filter-bar { padding:8px 12px; background:#fafcff; border-bottom:1px solid var(--border); font-size:.78rem; display:flex; flex-wrap:wrap; gap:6px; align-items:center }'
    + '.acr-chip { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; background:#e0ecf8; color:#1e40af; border-radius:14px; font-weight:800; font-size:.72rem }'
    + '.acr-chip button { background:none; border:none; color:#1e40af; cursor:pointer; font-size:.9rem; line-height:1; padding:0; font-weight:900 }'
    + '.acr-bc { padding:9px 14px; background:linear-gradient(90deg,#fff7e0,#fef9ec); border-bottom:1px solid #e8d5a8; font-size:.8rem; font-weight:800; color:#92400e }'
    + '.acr-bc a { color:#c2410c; text-decoration:none; cursor:pointer; border-bottom:1px dashed }'
    + '.acr-tw { overflow:auto; max-height:62vh; background:#fff }'
    + '.acr-tbl { width:100%; border-collapse:collapse; font-size:.84rem }'
    + '.acr-tbl thead th { background:linear-gradient(180deg,#dce8f5,#c8dcef); color:#1e40af; padding:10px 12px; text-align:center; font-weight:900; font-size:.78rem; border:1px solid #b9cfe5; position:sticky; top:0; z-index:3; white-space:nowrap }'
    + '.acr-tbl thead tr.acr-fr th { background:#f0f6fc; padding:4px 6px }'
    + '.acr-tbl thead tr.acr-fr input { width:100%; padding:5px 8px; border:1px solid #c8dcef; border-radius:6px; font-family:inherit; font-size:.74rem; outline:none; box-sizing:border-box }'
    + '.acr-tbl tbody td { padding:9px 12px; border:1px solid #dbe6f1; text-align:center; white-space:nowrap }'
    + '.acr-tbl tbody tr { cursor:pointer; transition:background .15s }'
    + '.acr-tbl tbody tr:hover { background:#f0f6ff }'
    + '.acr-tbl tbody tr.selected { background:#ffe9b3 !important; box-shadow:inset 0 0 0 2px #e8a33d }'
    + '.acr-tbl .acr-code { font-family:monospace; direction:ltr; font-weight:800; color:#1e40af }'
    + '.acr-tbl .acr-name { text-align:right !important; font-weight:700 }'
    + '.acr-tbl .acr-num { text-align:center; direction:ltr; font-variant-numeric:tabular-nums }'
    + '.acr-tbl .acr-num.zero { color:#cbd5e1 }'
    + '.acr-tbl .acr-num.neg { color:#dc2626 }'
    + '.acr-tbl tfoot td { background:linear-gradient(180deg,#dce8f5,#c8dcef); font-weight:900; padding:11px 12px; color:#1e40af; text-align:center; border:1px solid #b9cfe5 }'
    + '.acr-tbl .acr-lv-badge { display:inline-block; font-size:.62rem; padding:1px 7px; border-radius:8px; margin-right:6px; font-weight:800 }'
    + '.acr-lv-badge.b1 { background:#c7d2fe; color:#3730a3 }'
    + '.acr-lv-badge.b2 { background:#bbf7d0; color:#065f46 }'
    + '.acr-lv-badge.b3 { background:#fde68a; color:#92400e }'
    + '.acr-lv-badge.b4 { background:#e2e8f0; color:#475569 }'
    + '.acr-empty { padding:40px; text-align:center; color:#94a3b8; font-size:.9rem }'
    + '@media (max-width:720px) { .acr-side { width:100%; border-left:none; border-bottom:1px solid var(--border) } .acr-main { flex-direction:column } .acr-levels { display:flex; flex-wrap:wrap; gap:4px } .acr-lvl { padding:6px 10px; font-size:.74rem } }';
    document.head.appendChild(s);
})();

/* ---------- Main render ---------- */
function renderAccountReportV31() {
    var page = document.getElementById('page-report-account');
    if (!page) return;
    var box = document.getElementById('ra-result');
    if (!box) return;

    var accounts = DB.load('accounts', []);
    var opts = {
        from: document.getElementById('ra-from').value,
        to: document.getElementById('ra-to').value,
        vtype: document.getElementById('ra-vtype').value,
        periodId: document.getElementById('ra-period').value,
        cat: document.getElementById('ra-cat').value,
        nature: document.getElementById('ra-nature').value,
        level: Number(document.getElementById('ra-level').value) || 3
    };
    var hide = getHideState('ra');
    var onlyBalance = document.getElementById('ra-only-balance');
    var filterBal = onlyBalance && onlyBalance.checked;

    var result = computeAccountBalances(opts);
    var rolled = rollupBalances(accounts, result.balances);
    var detailBals = result.detailBalances || {};

    /* ---- انتخاب حساب‌های مناسب سطح فعلی ---- */
    var displayAccounts = accounts.filter(function(a) {
        if (_acrLevel(a, accounts) !== _acr.activeLevel) return false;
        if (_acr.activeLevel === 1) return !a.parent;
        if (_acr.parentId) return a.parent === _acr.parentId;
        return true;
    });

    /* ---- سطوح قابل نمایش ---- */
    var selNode = _acr.selectedId ? accounts.find(function(a) { return a.id === _acr.selectedId; }) : null;
    var selLevel = selNode ? _acrLevel(selNode, accounts) : 0;

    /* ---- جمع کل ---- */
    var totalD = 0, totalC = 0, shown = 0;

    /* ---- HTML ---- */
    var html = '<div class="acr-wrap">';
    html += '<div class="acr-top">';
    html += '<button class="acr-tab active">گزارش</button>';
    html += '<button class="acr-tab">فیلتر اسناد</button>';
    html += '<div class="acr-title">محدوده اسناد</div>';
    html += '</div>';
    html += '<div class="acr-main">';

    /* ===== سایدبار ===== */
    html += '<div class="acr-side">';
    html += '<div class="acr-side-head">جستجو</div>';
    html += '<div class="acr-levels">';
    var LV = ['گروه','کل','معین','سطح چهار','سطح پنج','پیگیری','حساب تفصیلی'];
    LV.forEach(function(name, i) {
        var lvl = i + 1;
        var cls = 'acr-lvl';
        // حالت فعال
        if (lvl === _acr.activeLevel) cls += ' active';
        else if (lvl === _acr.activeLevel + 1 && selNode && selLevel === _acr.activeLevel) cls += ' clickable';
        else if (lvl === _acr.activeLevel - 1) cls += ' clickable';
        else cls += ' disabled';
        html += '<div class="' + cls + '" data-lvl="' + lvl + '">';
        html += '<span class="acr-ico">🔍</span><span>' + name + '</span>';
        if (cls.indexOf('clickable') !== -1) html += '<span class="acr-dot"></span>';
        html += '</div>';
    });
    html += '</div></div>';

    /* ===== بدنه ===== */
    html += '<div class="acr-body">';

    /* فیلتر نوار بالا */
    html += '<div class="acr-filter-bar">';
    if (filterBal) html += '<span class="acr-chip">✔ فقط با مانده</span>';
    if (_acr.parentId) {
        var par = accounts.find(function(a) { return a.id === _acr.parentId; });
        if (par) html += '<span class="acr-chip">والد: ' + esc(par.name) + '</span>';
    }
    html += '<span class="acr-chip">سطح: ' + LV[_acr.activeLevel - 1] + '</span>';
    html += '</div>';

    /* Breadcrumb */
    var bcPath = _acr.parentId ? _acrPath(_acr.parentId, accounts) : [];
    html += '<div class="acr-bc">📁 ';
    html += '<a data-lvl="1">گروه</a>';
    bcPath.forEach(function(p, i) {
        html += ' › <a data-goto="' + p.id + '">' + esc(p.name) + '</a>';
    });
    if (_acr.selectedId && selLevel === _acr.activeLevel) {
        var s = accounts.find(function(a) { return a.id === _acr.selectedId; });
        if (s) html += ' › <strong>' + esc(s.name) + '</strong> (انتخاب‌شده)';
    }
    html += '</div>';

    /* جدول */
    html += '<div class="acr-tw"><table class="acr-tbl" id="acr-tbl"><thead>';
    html += '<tr><th style="width:100px">کد معین</th><th>عنوان معین</th>'
         +  '<th style="width:160px">گردش بدهکار</th><th style="width:160px">گردش بستانکار</th>'
         +  '<th style="width:160px">مانده بدهکار</th><th style="width:160px">مانده بستانکار</th></tr>';
    html += '<tr class="acr-fr"><th><input data-fc="0" placeholder="🔍"></th><th><input data-fc="1" placeholder="🔍"></th>'
         +  '<th><input data-fc="2" placeholder="🔍"></th><th><input data-fc="3" placeholder="🔍"></th>'
         +  '<th><input data-fc="4" placeholder="🔍"></th><th><input data-fc="5" placeholder="🔍"></th></tr>';
    html += '</thead><tbody>';

    displayAccounts.forEach(function(a) {
        var b = rolled[a.id] || { debit: 0, credit: 0 };
        if (filterBal && !b.debit && !b.credit) return;
        var net = b.debit - b.credit;
        var md = net > 0 ? net : 0, mc = net < 0 ? -net : 0;
        var cls = 'acr-row' + (a.id === _acr.selectedId ? ' selected' : '');
        var lvlName = LV[_acr.activeLevel - 1];
        var badge = 'b' + Math.min(_acr.activeLevel, 4);
        html += '<tr class="' + cls + '" data-id="' + a.id + '">';
        html += '<td class="acr-code">' + esc(a.code || '') + '</td>';
        html += '<td class="acr-name">' + esc(a.name || '') + ' <span class="acr-lv-badge ' + badge + '">' + lvlName + '</span></td>';
        html += '<td class="acr-num' + (b.debit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(b.debit)) + '</td>';
        html += '<td class="acr-num' + (b.credit ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(b.credit)) + '</td>';
        html += '<td class="acr-num' + (md ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(md)) + '</td>';
        html += '<td class="acr-num' + (mc ? '' : ' zero') + '">' + (hide ? '—' : moneyHtml(mc)) + '</td>';
        html += '</tr>';
        totalD += b.debit; totalC += b.credit; shown++;
    });

    if (shown === 0) html += '<tr><td colspan="6" class="acr-empty">موردی برای نمایش در این سطح نیست.</td></tr>';
    html += '</tbody><tfoot><tr>'
         +  '<td colspan="2" style="text-align:right;padding-right:20px">جمع کل</td>'
         +  '<td>' + (hide ? '—' : moneyHtml(totalD)) + '</td>'
         +  '<td>' + (hide ? '—' : moneyHtml(totalC)) + '</td>'
         +  '<td>' + (hide ? '—' : moneyHtml(totalD > totalC ? totalD - totalC : 0)) + '</td>'
         +  '<td>' + (hide ? '—' : moneyHtml(totalC > totalD ? totalC - totalD : 0)) + '</td>'
         +  '</tr></tfoot></table></div>';

    html += '</div></div></div>';
    box.innerHTML = html;

    var cEl = document.getElementById('ra-count');
    if (cEl) cEl.textContent = toFa(shown);

    bindAcrEvents(accounts, box);
}

/* ---------- Events ---------- */
function bindAcrEvents(accounts, box) {
    // سایدبار
    box.querySelectorAll('.acr-lvl').forEach(function(el) {
        el.addEventListener('click', function() {
            if (this.classList.contains('disabled')) return;
            var lvl = Number(this.getAttribute('data-lvl'));
            _acr.activeLevel = lvl;
            if (lvl === 1) { _acr.parentId = null; _acr.selectedId = null; }
            else if (_acr.selectedId) {
                var sel = accounts.find(function(a) { return a.id === _acr.selectedId; });
                if (sel) _acr.parentId = sel.id;
                _acr.selectedId = null;
            }
            renderAccountReportV31();
        });
    });
    // Breadcrumb
    box.querySelectorAll('[data-goto]').forEach(function(a) {
        a.addEventListener('click', function() {
            var id = this.getAttribute('data-goto');
            var acc = accounts.find(function(a2) { return a2.id === id; });
            if (!acc) return;
            _acr.parentId = acc.parent || null;
            _acr.activeLevel = _acrLevel(acc, accounts);
            _acr.selectedId = null;
            renderAccountReportV31();
        });
    });
    box.querySelector('[data-lvl="1"]') && box.querySelectorAll('.acr-bc a[data-lvl="1"]').forEach(function(a) {
        a.addEventListener('click', function() {
            _acr.activeLevel = 1; _acr.parentId = null; _acr.selectedId = null;
            renderAccountReportV31();
        });
    });
    // سطر
    box.querySelectorAll('tbody tr[data-id]').forEach(function(tr) {
        tr.addEventListener('click', function() {
            var id = this.getAttribute('data-id');
            if (_acr.selectedId === id) {
                // toggle selection off
                _acr.selectedId = null;
            } else {
                _acr.selectedId = id;
            }
            renderAccountReportV31();
        });
        // double-click = open turnover
        tr.addEventListener('dblclick', function() {
            var id = this.getAttribute('data-id');
            if (typeof openAccountTurnover === 'function') openAccountTurnover(id, null);
        });
    });
    // فیلتر ردیف
    box.querySelectorAll('.acr-fr input').forEach(function(inp) {
        inp.addEventListener('input', function() {
            var col = Number(this.getAttribute('data-fc'));
            var q = normalizeDigits(this.value.trim().toLowerCase());
            var tbody = box.querySelector('tbody');
            tbody.querySelectorAll('tr[data-id]').forEach(function(tr) {
                var cells = tr.querySelectorAll('td');
                if (cells.length <= col) return;
                tr.style.display = (!q || cells[col].textContent.toLowerCase().indexOf(q) !== -1) ? '' : 'none';
            });
        });
    });
}

/* ---------- Override ---------- */
(function patchAcrFinal() {
    function apply() {
        window.runAccountReport = renderAccountReportV31;
        window._renderAccountReportTree = renderAccountReportV31;
        var btn = document.getElementById('ra-run');
        if (btn && btn.dataset.acr31 !== '1') {
            btn.dataset.acr31 = '1';
            var nb = btn.cloneNode(true);
            btn.parentNode.replaceChild(nb, btn);
            nb.addEventListener('click', renderAccountReportV31);
        }
        var cb = document.getElementById('ra-only-balance');
        if (cb && cb.dataset.acr31 !== '1') {
            cb.dataset.acr31 = '1';
            var ncb = cb.cloneNode(true);
            cb.parentNode.replaceChild(ncb, cb);
            ncb.addEventListener('change', renderAccountReportV31);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(apply, 700); });
    else setTimeout(apply, 700);
})();

console.log('✅ گزارش مرور حساب v31 — ناوبری درختی');
