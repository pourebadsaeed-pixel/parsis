/* =====================================================================
   پارسیس v27 — 03-base,persons,companies,banks,fiscal,chart,templates.js
   اطلاعات پایه: دوره مالی، اشخاص، شرکت‌ها، بانک، صندوق، پروژه،
   چارت حساب‌ها، الگوهای سند، شرح‌های استاندارد
   ===================================================================== */
'use strict';

/* ==================== Fiscal Periods ==================== */
function renderFiscalList() {
    var list = DB.load('fiscalPeriods', []);
    var filter = (document.getElementById('fiscal-filter').value || '').toLowerCase();
    var tb = document.getElementById('fiscal-list-body');
    if (!tb) return;
    tb.innerHTML = '';
    var shown = 0;
    var filtered = list.filter(function(p) {
        if (filter && (p.title || '').toLowerCase().indexOf(filter) === -1) return false;
        return true;
    });
    filtered = applyTableSort('fiscal-table', filtered, function(p, k) {
        if (k === 'title') return p.title || '';
        if (k === 'from') return p.from || '';
        if (k === 'to') return p.to || '';
        return '';
    });
    for (var i = 0; i < filtered.length; i++) {
        var p = filtered[i]; shown++;
        var tr = document.createElement('tr');
        var isA = state.activePeriodId === p.id;
        var ab = isA ? '<span class="badge badge-approved">✓ فعال</span>' : '<button class="row-btn approve" data-id="' + p.id + '">فعال</button>';
        tr.innerHTML = '<td><strong>' + esc(p.title) + '</strong></td><td dir="ltr">' + toFa(esc(p.from)) + '</td><td dir="ltr">' + toFa(esc(p.to)) + '</td><td>' + ab + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + p.id + '">✎</button><button class="row-btn del" data-id="' + p.id + '">×</button></div></td>';
        tb.appendChild(tr);
    }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="5" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('fiscal-count').textContent = toFa(shown);
    attachRowActions(tb, 'fiscalPeriods', renderFiscalList, function(p) {
        document.getElementById('fiscal-id').value = p.id;
        document.getElementById('fiscal-title').value = p.title;
        document.getElementById('fiscal-from').value = p.from;
        document.getElementById('fiscal-to').value = p.to;
        document.querySelector('[data-tab="fiscal-add"]').click();
    });
    var acts = tb.querySelectorAll('.row-btn.approve');
    for (var a = 0; a < acts.length; a++) {
        acts[a].addEventListener('click', function() {
            state.activePeriodId = this.getAttribute('data-id');
            saveState('activePeriodId');
            renderFiscalList();
            updateTopbarPeriod();
        });
    }
    applyColVisibility('fiscal-table');
    makeTableResizable(document.getElementById('fiscal-table'));
    attachTableSorting('fiscal-table', renderFiscalList);
    applySortIndicator('fiscal-table');
}
function refreshPeriodFilters() {
    var list = DB.load('fiscalPeriods', []);
    var sel = document.getElementById('vl-period-filter');
    if (!sel) return;
    var v = sel.value;
    sel.innerHTML = '<option value="">همه دوره‌ها</option>';
    for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i].id;
        o.textContent = list[i].title;
        sel.appendChild(o);
    }
    sel.value = v;
}
function clearFiscalForm() {
    ['fiscal-id','fiscal-title','fiscal-from','fiscal-to'].forEach(function(x) { document.getElementById(x).value = ''; });
}

/* ==================== Generic Row Actions ==================== */
function attachRowActions(tb, sk, rf, ef) {
    var eds = tb.querySelectorAll('.row-btn.edit');
    var dls = tb.querySelectorAll('.row-btn.del');
    for (var j = 0; j < eds.length; j++) {
        eds[j].addEventListener('click', function() {
            var id = this.getAttribute('data-id');
            var list = DB.load(sk);
            var item = list.find(function(x) { return x.id === id; });
            if (item) ef(item);
        });
    }
    for (var k = 0; k < dls.length; k++) {
        dls[k].addEventListener('click', function() {
            if (!confirm('حذف شود؟')) return;
            var id = this.getAttribute('data-id');
            var list = DB.load(sk);
            list = list.filter(function(x) { return x.id !== id; });
            DB.save(sk, list);
            rf();
            updateHomeWidgets();
        });
    }
}

/* ==================== Persons ==================== */
function renderPersonsList() {
    var list = DB.load('persons', []);
    var filter = (document.getElementById('persons-filter').value || '').toLowerCase();
    var tb = document.getElementById('persons-list-body');
    if (!tb) return;
    tb.innerHTML = '';
    var shown = 0;
    var filtered = list.filter(function(p) {
        var txt = ((p.first||'') + ' ' + (p.last||'') + ' ' + (p.mobile||'') + ' ' + (p.email||'') + ' ' + (p.nationalId||'')).toLowerCase();
        if (filter && txt.indexOf(filter) === -1) return false;
        return true;
    });
    filtered = applyTableSort('persons-table', filtered, function(p, k) { return p[k] || ''; });
    for (var i = 0; i < filtered.length; i++) {
        var p = filtered[i]; shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(p.first) + '</td><td>' + esc(p.last) + '</td><td dir="ltr">' + toFa(esc(p.nationalId || '—')) + '</td><td dir="ltr">' + toFa(esc(p.birth || '—')) + '</td><td dir="ltr">' + toFa(esc(p.mobile || '—')) + '</td><td dir="ltr">' + esc(p.email || '—') + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + p.id + '">✎</button><button class="row-btn del" data-id="' + p.id + '">×</button></div></td>';
        tb.appendChild(tr);
    }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="7" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('persons-count').textContent = toFa(shown);
    attachRowActions(tb, 'persons', renderPersonsList, function(p) {
        document.getElementById('pr-id').value = p.id;
        document.getElementById('pr-first').value = p.first || '';
        document.getElementById('pr-last').value = p.last || '';
        document.getElementById('pr-father').value = p.father || '';
        document.getElementById('pr-national-id').value = p.nationalId || '';
        document.getElementById('pr-birth').value = p.birth || '';
        document.getElementById('pr-mobile').value = p.mobile || '';
        document.getElementById('pr-phone').value = p.phone || '';
        document.getElementById('pr-email').value = p.email || '';
        document.getElementById('pr-bank-title').value = p.bankTitle || '';
        document.getElementById('pr-acc').value = p.acc || '';
        document.getElementById('pr-iban').value = p.iban || '';
        document.getElementById('pr-card').value = p.card || '';
        document.getElementById('pr-address').value = p.address || '';
        document.querySelector('[data-tab="persons-add"]').click();
    });
    applyColVisibility('persons-table');
    makeTableResizable(document.getElementById('persons-table'));
    attachTableSorting('persons-table', renderPersonsList);
    applySortIndicator('persons-table');
}
function clearPersonForm() {
    ['pr-id','pr-first','pr-last','pr-father','pr-national-id','pr-birth','pr-mobile','pr-phone','pr-email','pr-bank-title','pr-acc','pr-iban','pr-card','pr-address'].forEach(function(i) {
        document.getElementById(i).value = '';
    });
}

/* ==================== Companies ==================== */
function renderCompaniesList() {
    var list = DB.load('companies', []);
    var filter = (document.getElementById('comp-filter').value || '').toLowerCase();
    var tb = document.getElementById('comp-list-body');
    if (!tb) return;
    tb.innerHTML = '';
    var shown = 0;
    var filtered = list.filter(function(c) {
        if (filter && ((c.name||'') + ' ' + (c.phone||'') + ' ' + (c.email||'')).toLowerCase().indexOf(filter) === -1) return false;
        return true;
    });
    filtered = applyTableSort('comp-table', filtered, function(c, k) { return c[k] || ''; });
    for (var i = 0; i < filtered.length; i++) {
        var c = filtered[i]; shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(c.name) + '</td><td dir="ltr">' + toFa(esc(c.phone || '—')) + '</td><td dir="ltr">' + esc(c.email || '—') + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + c.id + '">✎</button><button class="row-btn del" data-id="' + c.id + '">×</button></div></td>';
        tb.appendChild(tr);
    }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="4" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('comp-count').textContent = toFa(shown);
    attachRowActions(tb, 'companies', renderCompaniesList, function(c) {
        document.getElementById('co-id').value = c.id;
        document.getElementById('co-name').value = c.name || '';
        document.getElementById('co-phone').value = c.phone || '';
        document.getElementById('co-email').value = c.email || '';
        document.getElementById('co-address').value = c.address || '';
        document.querySelector('[data-tab="comp-add"]').click();
    });
    applyColVisibility('comp-table');
    makeTableResizable(document.getElementById('comp-table'));
    attachTableSorting('comp-table', renderCompaniesList);
    applySortIndicator('comp-table');
}
function clearCompanyForm() {
    ['co-id','co-name','co-phone','co-email','co-address'].forEach(function(i) { document.getElementById(i).value = ''; });
}

/* ==================== Bank Accounts ==================== */
function refreshBankTypeSelect() {
    var sel = document.getElementById('ba-type');
    if (!sel) return;
    sel.innerHTML = '<option value="">— نوع —</option>';
    for (var i = 0; i < state.bankTypes.length; i++) {
        var o = document.createElement('option');
        o.value = state.bankTypes[i];
        o.textContent = state.bankTypes[i];
        sel.appendChild(o);
    }
}
function renderBankAccountsList() {
    var list = DB.load('bankAccounts', []);
    var filter = (document.getElementById('ba-filter').value || '').toLowerCase();
    var tb = document.getElementById('ba-list-body');
    if (!tb) return;
    tb.innerHTML = '';
    var shown = 0;
    var filtered = list.filter(function(b) {
        if (filter && ((b.bank||'') + ' ' + (b.account||'') + ' ' + (b.branchName||'')).toLowerCase().indexOf(filter) === -1) return false;
        return true;
    });
    filtered = applyTableSort('ba-table', filtered, function(b, k) {
        if (k === 'order') return Number(b.order) || 9999;
        if (k === 'minBalance') return Number(b.minBalance) || 0;
        return b[k] || '';
    });
    for (var i = 0; i < filtered.length; i++) {
        var b = filtered[i]; shown++;
        var mb = b.minBalance ? formatMoney(b.minBalance) + ' ' + currencyLabel() : '—';
        var tr = document.createElement('tr');
        tr.innerHTML = '<td dir="ltr">' + (b.order != null ? toFa(esc(b.order)) : '—') + '</td><td>' + esc(b.bank) + '</td><td>' + esc(b.branchName) + '</td><td dir="ltr">' + toFa(esc(b.account)) + '</td><td dir="ltr">' + mb + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + b.id + '">✎</button><button class="row-btn del" data-id="' + b.id + '">×</button></div></td>';
        tb.appendChild(tr);
    }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="6" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('ba-count').textContent = toFa(shown);
    attachRowActions(tb, 'bankAccounts', renderBankAccountsList, function(b) {
        document.getElementById('ba-id').value = b.id;
        document.getElementById('ba-bank').value = b.bank || '';
        document.getElementById('ba-type').value = b.type || '';
        document.getElementById('ba-branch-code').value = b.branchCode || '';
        document.getElementById('ba-branch-name').value = b.branchName || '';
        document.getElementById('ba-account').value = b.account || '';
        document.getElementById('ba-iban').value = b.iban || '';
        document.getElementById('ba-card').value = b.card || '';
        document.getElementById('ba-order').value = (b.order != null ? b.order : '');
        document.getElementById('ba-min-balance').value = b.minBalance ? formatRaw(b.minBalance) : '';
        document.querySelector('[data-tab="ba-add"]').click();
    });
    applyColVisibility('ba-table');
    makeTableResizable(document.getElementById('ba-table'));
    attachTableSorting('ba-table', renderBankAccountsList);
    applySortIndicator('ba-table');
}
function clearBAForm() {
    ['ba-id','ba-bank','ba-branch-code','ba-branch-name','ba-account','ba-iban','ba-card','ba-order','ba-min-balance'].forEach(function(i) {
        document.getElementById(i).value = '';
    });
    document.getElementById('ba-type').value = '';
}

/* ==================== Cash Boxes ==================== */
function refreshCashTypeSelect() {
    var sel = document.getElementById('cb-type');
    if (!sel) return;
    sel.innerHTML = '<option value="">— نوع —</option>';
    for (var i = 0; i < state.cashTypes.length; i++) {
        var o = document.createElement('option');
        o.value = state.cashTypes[i];
        o.textContent = state.cashTypes[i];
        sel.appendChild(o);
    }
}
function renderCashBoxesList() {
    var list = DB.load('cashBoxes', []);
    var filter = (document.getElementById('cb-filter').value || '').toLowerCase();
    var tb = document.getElementById('cb-list-body');
    if (!tb) return;
    tb.innerHTML = '';
    var shown = 0;
    var filtered = list.filter(function(c) {
        if (filter && ((c.title||'') + ' ' + (c.type||'')).toLowerCase().indexOf(filter) === -1) return false;
        return true;
    });
    filtered = applyTableSort('cb-table', filtered, function(c, k) {
        if (k === 'order') return Number(c.order) || 9999;
        return c[k] || '';
    });
    for (var i = 0; i < filtered.length; i++) {
        var c = filtered[i]; shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td dir="ltr">' + (c.order != null ? toFa(esc(c.order)) : '—') + '</td><td>' + esc(c.title) + '</td><td>' + esc(c.type) + '</td><td>' + esc(c.unit) + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + c.id + '">✎</button><button class="row-btn del" data-id="' + c.id + '">×</button></div></td>';
        tb.appendChild(tr);
    }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="5" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('cb-count').textContent = toFa(shown);
    attachRowActions(tb, 'cashBoxes', renderCashBoxesList, function(c) {
        document.getElementById('cb-id').value = c.id;
        document.getElementById('cb-title').value = c.title || '';
        document.getElementById('cb-type').value = c.type || '';
        document.getElementById('cb-unit').value = c.unit || '';
        document.getElementById('cb-order').value = (c.order != null ? c.order : '');
        document.querySelector('[data-tab="cb-add"]').click();
    });
    applyColVisibility('cb-table');
    makeTableResizable(document.getElementById('cb-table'));
    attachTableSorting('cb-table', renderCashBoxesList);
    applySortIndicator('cb-table');
}
function clearCBForm() {
    ['cb-id','cb-title','cb-unit','cb-order'].forEach(function(i) { document.getElementById(i).value = ''; });
    document.getElementById('cb-type').value = '';
}

/* ==================== Projects ==================== */
function renderProjectsList() {
    var list = DB.load('projects', []);
    var filter = (document.getElementById('proj-filter').value || '').toLowerCase();
    var tb = document.getElementById('proj-list-body');
    if (!tb) return;
    tb.innerHTML = '';
    var shown = 0;
    var filtered = list.filter(function(p) {
        if (filter && (p.name||'').toLowerCase().indexOf(filter) === -1) return false;
        return true;
    });
    filtered = applyTableSort('proj-table', filtered, function(p, k) { return p[k] || ''; });
    for (var i = 0; i < filtered.length; i++) {
        var p = filtered[i]; shown++;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(p.name) + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + p.id + '">✎</button><button class="row-btn del" data-id="' + p.id + '">×</button></div></td>';
        tb.appendChild(tr);
    }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="2" class="empty-row">یافت نشد.</td></tr>';
    document.getElementById('proj-count').textContent = toFa(shown);
    attachRowActions(tb, 'projects', renderProjectsList, function(p) {
        document.getElementById('pj-id').value = p.id;
        document.getElementById('pj-name').value = p.name || '';
        document.querySelector('[data-tab="proj-add"]').click();
    });
    applyColVisibility('proj-table');
    makeTableResizable(document.getElementById('proj-table'));
    attachTableSorting('proj-table', renderProjectsList);
    applySortIndicator('proj-table');
}

/* ==================== Chart Tree ==================== */
function renderChartTree(cid, editable) {
    var box = document.getElementById(cid);
    if (!box) return;
    var accounts = DB.load('accounts', []);
    box.innerHTML = '';
    if (accounts.length === 0) {
        box.innerHTML = '<p class="muted" style="text-align:center;padding:20px">حسابی تعریف نشده.</p>';
        return;
    }
    var sI = document.getElementById('charttree-search');
    var q = (sI && sI.value || '').trim().toLowerCase();
    if (q) {
        var results = accounts.filter(function(a) {
            return (a.code || '').toLowerCase().indexOf(q) !== -1 || (a.name || '').toLowerCase().indexOf(q) !== -1;
        });
        for (var r = 0; r < results.length; r++) {
            var node = results[r];
            var div = document.createElement('div');
            div.className = 'tree-node';
            div.innerHTML = '<span class="tn-code">' + esc(node.code) + '</span><span class="tn-name">' + esc(node.name) + '</span>';
            (function(nn) {
                div.addEventListener('click', function() {
                    if (editable) openChartForm(nn.id, computeLevelIn(nn.id), null);
                });
            })(node);
            box.appendChild(div);
        }
    } else {
        var roots = accounts.filter(function(a) { return !a.parent; });
        for (var i = 0; i < roots.length; i++) box.appendChild(buildNode(roots[i], accounts, 1, editable));
    }
}
function computeLevelIn(id) {
    var accounts = DB.load('accounts', []);
    var lvl = 1;
    var cur = accounts.find(function(a) { return a.id === id; });
    while (cur && cur.parent) {
        lvl++;
        cur = accounts.find(function(a) { return a.id === cur.parent; });
    }
    return lvl;
}
function buildNode(node, all, level, editable) {
    var wrap = document.createElement('div');
    var div = document.createElement('div');
    div.className = 'tree-node';
    var children = all.filter(function(a) { return a.parent === node.id; });
    var hasC = children.length > 0;
    var exp = state.expandedNodes[node.id] === true;
    var tog = document.createElement('span');
    tog.className = 'tree-toggle';
    tog.textContent = hasC ? (exp ? '▼' : '◀') : '•';
    if (!hasC) tog.style.visibility = 'hidden';
    tog.addEventListener('click', function(e) {
        e.stopPropagation();
        state.expandedNodes[node.id] = !exp;
        saveState('expandedNodes');
        renderChartTree('chart-tree', editable);
    });
    div.appendChild(tog);
    var icon = level === 1 ? '📁' : (level === 2 ? '📂' : '📄');
    var lN = level === 1 ? 'گروه' : (level === 2 ? 'کل' : (level === 3 ? 'معین' : 'تفصیلی'));
    var html = '<span class="tn-icon">' + icon + '</span><span class="tn-code">' + esc(node.code) + '</span><span class="tn-name">' + esc(node.name) + '</span><span class="tn-level">' + lN + '</span>';
    if (node.links && node.links.length > 0) html += '<span class="tn-link">' + node.links.map(linkTypeName).join('، ') + '</span>';
    if (node.cfEffect) html += '<span class="tn-cf">💸 گردش وجه نقد</span>';
    div.insertAdjacentHTML('beforeend', html);
    if (editable) {
        if (level < 3) {
            var aB = document.createElement('button');
            aB.className = 'tree-add-btn';
            aB.textContent = '+';
            aB.addEventListener('click', function(e) {
                e.stopPropagation();
                state.expandedNodes[node.id] = true;
                saveState('expandedNodes');
                openChartForm(null, level + 1, node.id);
            });
            div.appendChild(aB);
        }
        var dB = document.createElement('button');
        dB.className = 'tree-del-btn';
        dB.textContent = '×';
        dB.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!confirm('حذف شود؟')) return;
            var accs = DB.load('accounts', []);
            var toDel = {};
            function collect(id) {
                toDel[id] = true;
                accs.forEach(function(a) { if (a.parent === id) collect(a.id); });
            }
            collect(node.id);
            var nl = accs.filter(function(a) { return !toDel[a.id]; });
            DB.save('accounts', nl);
            renderChartTree('chart-tree', true);
        });
        div.appendChild(dB);
    }
    div.addEventListener('click', function(e) {
        if (e.target.classList.contains('tree-toggle')) return;
        if (e.target.classList.contains('tree-add-btn')) return;
        if (e.target.classList.contains('tree-del-btn')) return;
        if (editable) openChartForm(node.id, level, null);
    });
    wrap.appendChild(div);
    if (hasC && exp) {
        var cb = document.createElement('div');
        cb.className = 'tree-children';
        for (var i = 0; i < children.length; i++) cb.appendChild(buildNode(children[i], all, level + 1, editable));
        wrap.appendChild(cb);
    }
    return wrap;
}
function setAllExpanded(val) {
    var accounts = DB.load('accounts', []);
    state.expandedNodes = {};
    if (val) for (var i = 0; i < accounts.length; i++) state.expandedNodes[accounts[i].id] = true;
    saveState('expandedNodes');
    renderChartTree('chart-tree', true);
}
function openChartForm(id, level, parentId) {
    var card = document.getElementById('chart-form-card');
    var accounts = DB.load('accounts', []);
    var node = id ? accounts.find(function(a) { return a.id === id; }) : null;
    card.style.display = 'block';
    var titles = { 1: 'گروه', 2: 'حساب کل', 3: 'حساب معین' };
    document.getElementById('chart-form-title').textContent = node ? ('ویرایش ' + (titles[level] || '')) : ('تعریف ' + (titles[level] || 'حساب'));
    document.getElementById('ch-id').value = node ? node.id : '';
    document.getElementById('ch-level').value = level;
    document.getElementById('ch-parent').value = node ? (node.parent || '') : (parentId || '');
    var sc = '';
    if (!node) {
        if (parentId) {
            var par = accounts.find(function(a) { return a.id === parentId; });
            if (par) {
                var sib = accounts.filter(function(a) { return a.parent === parentId; });
                var w = level === 2 ? 2 : 3;
                var mx = 0;
                sib.forEach(function(s) { var n = parseInt(s.code.split('-').pop()) || 0; if (n > mx) mx = n; });
                sc = par.code + '-' + String(mx + 1).padStart(w, '0');
            }
        } else {
            var roots = accounts.filter(function(a) { return !a.parent; });
            var m = 0;
            roots.forEach(function(r) { var n = parseInt(r.code) || 0; if (n > m) m = n; });
            sc = String(m + 1);
        }
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
    var existing = DB.load('accounts', []);
    if (existing.length > 0) { alert('قبلاً تعریف شده.'); return; }
    var accounts = [];
    var counter = 0;
    function add(code, name, parent, cat, nature, links, cfEffect) {
        counter++;
        accounts.push({ id: 'a' + counter, code: code, name: name, parent: parent || '', cat: cat || 'permanent', nature: nature || 'debit', active: true, links: links || [], cfEffect: !!cfEffect });
        return 'a' + counter;
    }
    var g1 = add('1', 'دارایی‌ها', '', 'permanent', 'debit');
    var k11 = add('1-01', 'دارایی جاری', g1, 'permanent', 'debit');
    add('1-01-001', 'صندوق', k11, 'permanent', 'debit', ['cashbox'], true);
    add('1-01-002', 'بانک‌ها', k11, 'permanent', 'debit', ['bank'], true);
    add('1-01-003', 'حساب‌های دریافتنی', k11, 'permanent', 'debit', ['person','company']);
    var g2 = add('2', 'بدهی‌ها', '', 'permanent', 'credit');
    var k21 = add('2-01', 'بدهی جاری', g2, 'permanent', 'credit');
    add('2-01-001', 'حساب‌های پرداختنی', k21, 'permanent', 'credit', ['person','company']);
    add('2-01-002', 'تسهیلات بانکی پرداختنی', k21, 'permanent', 'credit', ['facility']);
    var g3 = add('3', 'سرمایه', '', 'permanent', 'credit');
    add('3-01', 'سرمایه اولیه', g3, 'permanent', 'credit');
    var g4 = add('4', 'درآمدها', '', 'temporary', 'credit');
    add('4-01', 'درآمد عملیاتی', g4, 'temporary', 'credit');
    var g5 = add('5', 'هزینه‌ها', '', 'temporary', 'debit');
    var k51 = add('5-01', 'هزینه‌های عمومی', g5, 'temporary', 'debit');
    add('5-01-001', 'هزینه ایاب و ذهاب', k51, 'temporary', 'debit', ['project']);
    add('5-01-002', 'هزینه ملزومات', k51, 'temporary', 'debit', ['project']);
    add('5-01-003', 'هزینه سوخت', k51, 'temporary', 'debit', ['project']);
    add('5-01-004', 'هزینه پذیرایی', k51, 'temporary', 'debit', ['project']);
    add('5-01-005', 'هزینه اجاره', k51, 'temporary', 'debit', ['project']);
    add('5-01-006', 'هزینه قبوض', k51, 'temporary', 'debit', ['project']);
    add('5-01-007', 'حقوق و دستمزد', k51, 'temporary', 'debit', ['project']);
    DB.save('accounts', accounts);
    showToast('✅ بارگذاری شد.');
    state.expandedNodes = {};
    saveState('expandedNodes');
    renderChartTree('chart-tree', true);
    document.getElementById('load-default-chart').disabled = true;
    refreshTemplateSelect();
}

/* ==================== Templates ==================== */
function getDefaultTemplates() {
    return [
        { id:'tpl-taxi', name:'کرایه تاکسی روزانه', desc:'کرایه تاکسی شغلی', lines:[{ side:'debit', nameHint:'ایاب و ذهاب', desc:'کرایه تاکسی', fixedAmount: 300000 },{ side:'credit', nameHint:'صندوق', desc:'پرداخت از صندوق', fixedAmount: 300000 }]},
        { id:'tpl-supplies', name:'خرید ملزومات', desc:'خرید ملزومات اداری', lines:[{ side:'debit', nameHint:'ملزومات', desc:'خرید ملزومات' },{ side:'credit', nameHint:'بانک', desc:'پرداخت از بانک' }]},
        { id:'tpl-fuel', name:'هزینه سوخت', desc:'هزینه سوخت', lines:[{ side:'debit', nameHint:'سوخت', desc:'هزینه سوخت' },{ side:'credit', nameHint:'صندوق', desc:'پرداخت' }]},
        { id:'tpl-receive', name:'دریافت از مشتری', desc:'دریافت', lines:[{ side:'debit', nameHint:'بانک', desc:'واریز' },{ side:'credit', nameHint:'دریافتنی', desc:'دریافت از مشتری' }]},
        { id:'tpl-bill', name:'پرداخت قبض', desc:'پرداخت قبوض', lines:[{ side:'debit', nameHint:'قبوض', desc:'هزینه قبوض' },{ side:'credit', nameHint:'بانک', desc:'پرداخت' }]}
    ];
}
function getDefaultStdDescriptions() {
    return ['کرایه تاکسی','خرید ملزومات','هزینه سوخت','هزینه پذیرایی','پرداخت قبض','دریافت از مشتری','پرداخت به تأمین‌کننده','حقوق و دستمزد','اجاره','تلفن و اینترنت','تعمیر و نگهداری','تبلیغات','حمل و نقل','کارمزد بانکی','مالیات','بیمه'];
}
function refreshTemplateSelect() {
    var sel = document.getElementById('v-template');
    if (!sel) return;
    var list = DB.load('voucherTemplates', []);
    sel.innerHTML = '<option value="">— بدون الگو —</option>';
    for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i].id;
        var hasAmount = (list[i].lines || []).some(function(l){ return l.fixedAmount; });
        o.textContent = list[i].name + (hasAmount ? ' (آماده)' : '');
        sel.appendChild(o);
    }
}
function findAccountByNameHint(hint) {
    if (!hint) return '';
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
    var q = hint.toLowerCase();
    var ex = leaves.find(function(a) { return (a.name || '').toLowerCase() === q; });
    if (ex) return ex.id;
    var pa = leaves.find(function(a) { return (a.name || '').toLowerCase().indexOf(q) !== -1; });
    if (pa) return pa.id;
    return '';
}
var templateLines = [];
function renderTemplateLines() {
    var box = document.getElementById('tpl-lines');
    if (!box) return;
    box.innerHTML = '';
    if (templateLines.length === 0) templateLines.push({ side: 'debit', account: '', details: {}, desc: '', fixedAmount: 0 });
    var leaves = getLeafAccounts();
    var accounts = DB.load('accounts', []);
    for (var i = 0; i < templateLines.length; i++) {
        (function(idx) {
            var ln = templateLines[idx];
            if (!ln.details) ln.details = {};
            var wrap = document.createElement('div');
            wrap.className = 'voucher-line';
            var numSpan = document.createElement('span');
            numSpan.className = 'ln-num'; numSpan.textContent = '#' + toFa(idx + 1);
            wrap.appendChild(numSpan);
            var row1 = document.createElement('div');
            row1.style.paddingTop = '14px';
            row1.style.display = 'grid';
            row1.style.gridTemplateColumns = '1fr 1fr';
            row1.style.gap = '8px';
            var selSide = document.createElement('select');
            selSide.innerHTML = '<option value="debit">بدهکار</option><option value="credit">بستانکار</option>';
            selSide.value = ln.side || 'debit';
            selSide.addEventListener('change', function() { ln.side = this.value; });
            row1.appendChild(selSide);
            var inpF = document.createElement('input');
            inpF.type = 'text'; inpF.inputMode = 'numeric'; inpF.dir = 'ltr'; inpF.placeholder = 'مبلغ ثابت';
            inpF.value = ln.fixedAmount ? formatRaw(ln.fixedAmount) : '';
            inpF.addEventListener('input', function() {
                var val = normalizeDigits(this.value);
                var raw = val.replace(/[^\d]/g, '');
                this.value = raw;
                ln.fixedAmount = Number(raw) || 0;
            });
            inpF.addEventListener('blur', function() {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
                ln.fixedAmount = v;
            });
            row1.appendChild(inpF);
            wrap.appendChild(row1);
            var row2 = document.createElement('div');
            row2.style.marginTop = '8px';
            var selAcc = document.createElement('select');
            selAcc.innerHTML = '<option value="">— حساب —</option>';
            for (var k = 0; k < leaves.length; k++) {
                var o = document.createElement('option');
                o.value = leaves[k].id;
                o.textContent = getAccountLabel(leaves[k].id, accounts);
                if (ln.account === leaves[k].id) o.selected = true;
                selAcc.appendChild(o);
            }
            selAcc.addEventListener('change', function() { ln.account = this.value; ln.details = {}; renderTemplateLines(); });
            row2.appendChild(selAcc);
            wrap.appendChild(row2);
            var acc = accounts.find(function(a) { return a.id === ln.account; });
            if (acc && acc.links && acc.links.length > 0) {
                for (var li = 0; li < acc.links.length; li++) {
                    var lt = acc.links[li];
                    var items = getLinkedItems(lt);
                    if (items.length === 0) continue;
                    var rE = document.createElement('div');
                    rE.style.display = 'grid';
                    rE.style.gridTemplateColumns = 'auto 1fr';
                    rE.style.gap = '8px';
                    rE.style.marginTop = '8px';
                    var lbl = document.createElement('div');
                    lbl.style.cssText = 'font-size:0.75rem;color:#888;align-self:center';
                    lbl.textContent = linkTypeName(lt) + ':';
                    rE.appendChild(lbl);
                    var selD = document.createElement('select');
                    buildOptionsInto(selD, items, function(it) { return getLinkedItemLabel(lt, it); }, ln.details[lt] || '', '— ' + linkTypeName(lt) + ' —');
                    (function(ltype, sR) { sR.addEventListener('change', function() { ln.details[ltype] = this.value; }); })(lt, selD);
                    rE.appendChild(selD);
                    wrap.appendChild(rE);
                }
            }
            var row3 = document.createElement('div');
            row3.className = 'desc-row';
            row3.style.marginTop = '8px';
            var inpD = document.createElement('input');
            inpD.type = 'text'; inpD.placeholder = 'شرح'; inpD.value = ln.desc || '';
            inpD.setAttribute('list', 'std-desc-list');
            inpD.addEventListener('input', function() { ln.desc = this.value; });
            row3.appendChild(inpD);
            var btnAdd = document.createElement('button');
            btnAdd.type = 'button'; btnAdd.className = 'desc-add-btn'; btnAdd.textContent = '＋';
            btnAdd.addEventListener('click', function() { addDescriptionToStandard(inpD.value); });
            row3.appendChild(btnAdd);
            wrap.appendChild(row3);
            var actWrap = document.createElement('div');
            actWrap.className = 'ln-actions';
            var bU = document.createElement('button');
            bU.className = 'ln-btn'; bU.textContent = '↑'; if (idx === 0) bU.disabled = true;
            bU.addEventListener('click', function() {
                var tmp = templateLines[idx]; templateLines[idx] = templateLines[idx-1]; templateLines[idx-1] = tmp;
                renderTemplateLines();
            });
            var bD = document.createElement('button');
            bD.className = 'ln-btn'; bD.textContent = '↓'; if (idx === templateLines.length - 1) bD.disabled = true;
            bD.addEventListener('click', function() {
                var tmp = templateLines[idx]; templateLines[idx] = templateLines[idx+1]; templateLines[idx+1] = tmp;
                renderTemplateLines();
            });
            var bX = document.createElement('button');
            bX.className = 'ln-btn ln-del'; bX.textContent = '× حذف';
            bX.addEventListener('click', function() { templateLines.splice(idx, 1); renderTemplateLines(); });
            actWrap.appendChild(bU); actWrap.appendChild(bD); actWrap.appendChild(bX);
            wrap.appendChild(actWrap);
            box.appendChild(wrap);
        })(i);
    }
}
function renderTemplateList() {
    var list = DB.load('voucherTemplates', []);
    var box = document.getElementById('tpl-list-body');
    if (!box) return;
    box.innerHTML = '';
    if (list.length === 0) {
        box.innerHTML = '<p class="muted" style="text-align:center;padding:16px">الگویی نیست.</p>';
        document.getElementById('tpl-count').textContent = '۰';
        return;
    }
    for (var i = 0; i < list.length; i++) {
        (function(t) {
            var row = document.createElement('div');
            row.className = 'tpl-row';
            var lc = (t.lines || []).length;
            var ha = (t.lines || []).some(function(l){ return l.fixedAmount; });
            var sub = toFa(lc) + ' قلم' + (ha ? ' — دارای مبلغ' : '');
            row.innerHTML = '<div style="flex:1;min-width:0"><div class="tpl-name">' + esc(t.name) + '</div><div class="tpl-desc">' + sub + '</div></div><div class="row-actions"><button class="row-btn open tpl-use" data-id="' + t.id + '">⚡</button><button class="row-btn edit tpl-edit" data-id="' + t.id + '">✎</button><button class="row-btn del tpl-del" data-id="' + t.id + '">×</button></div>';
            box.appendChild(row);
        })(list[i]);
    }
    document.getElementById('tpl-count').textContent = toFa(list.length);
    var uses = box.querySelectorAll('.tpl-use'), edits = box.querySelectorAll('.tpl-edit'), dels = box.querySelectorAll('.tpl-del');
    for (var u = 0; u < uses.length; u++) uses[u].addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        goToPage('voucher-new');
        if (voucherLines.length === 0 || currentVoucherStatus === 'approved') newVoucherForm();
        applyTemplate(id);
    });
    for (var e = 0; e < edits.length; e++) edits[e].addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var t = DB.load('voucherTemplates', []).find(function(x) { return x.id === id; });
        if (!t) return;
        document.getElementById('tpl-id').value = t.id;
        document.getElementById('tpl-name').value = t.name || '';
        document.getElementById('tpl-desc').value = t.desc || '';
        templateLines = JSON.parse(JSON.stringify(t.lines || []));
        renderTemplateLines();
        document.querySelector('[data-tab="tpl-add"]').click();
    });
    for (var d = 0; d < dels.length; d++) dels[d].addEventListener('click', function() {
        if (!confirm('حذف شود؟')) return;
        var id = this.getAttribute('data-id');
        var l2 = DB.load('voucherTemplates', []).filter(function(x) { return x.id !== id; });
        DB.save('voucherTemplates', l2);
        renderTemplateList();
        refreshTemplateSelect();
    });
}
function renderStdDescChips() {
    var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
    var box = document.getElementById('std-desc-chips');
    if (!box) return;
    box.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
        (function(idx) {
            var chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerHTML = esc(list[idx]) + ' <button class="chip-del" data-i="' + idx + '">×</button>';
            box.appendChild(chip);
        })(i);
    }
    var dels = box.querySelectorAll('.chip-del');
    for (var j = 0; j < dels.length; j++) dels[j].addEventListener('click', function() {
        var idx = Number(this.getAttribute('data-i'));
        var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
        l.splice(idx, 1);
        DB.save('standardDescriptions', l);
        renderStdDescChips();
        refreshStdDescDatalist();
    });
}
function refreshStdDescDatalist() {
    var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
    var dl = document.getElementById('std-desc-list');
    if (!dl) return;
    dl.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i];
        dl.appendChild(o);
    }
}
function addDescriptionToStandard(desc, silent) {
    if (!desc || !desc.trim()) {
        if (!silent) alert('شرح خالی است.');
        return false;
    }
    var v = desc.trim();
    var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
    if (l.indexOf(v) !== -1) {
        if (!silent) showToast('قبلاً در لیست است.');
        return false;
    }
    l.push(v);
    DB.save('standardDescriptions', l);
    refreshStdDescDatalist();
    renderStdDescChips();
    if (!silent) showToast('✅ اضافه شد.');
    return true;
}
