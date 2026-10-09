/* =====================================================================
   پارسیس v27 — 05-reports,cashflow,account,trial,incomplete,facility.js
   گزارش‌ها: وضعیت نقدینگی، گردش وجه نقد، مرور حساب‌ها، تراز آزمایشی،
   تراکنش‌های ناقص، خلاصه تسهیلات، جامع تسهیلات، نرخ ارز، قیمت پایانی
   ===================================================================== */
'use strict';

/* ==================== Helpers مشترک ==================== */
function filterVouchers(opts) {
    var l = DB.load('vouchers', []);
    return l.filter(function(v) {
        if (v.status !== 'approved') return false;
        if (opts.from && v.date < opts.from) return false;
        if (opts.to && v.date > opts.to) return false;
        if (opts.vtype && v.type !== opts.vtype) return false;
        if (opts.periodId && v.periodId !== opts.periodId) return false;
        return true;
    });
}
function computeAccountBalances(opts) {
    var vouchers = filterVouchers(opts);
    var accounts = DB.load('accounts', []);
    var balances = {};
    accounts.forEach(function(a) { balances[a.id] = { debit: 0, credit: 0 }; });
    vouchers.forEach(function(v) {
        v.lines.forEach(function(line) {
            if (!line.account) return;
            var acc = accounts.find(function(a) { return a.id === line.account; });
            if (!acc) return;
            if (opts.cat && acc.cat !== opts.cat) return;
            if (opts.nature && acc.nature !== opts.nature) return;
            if (!balances[acc.id]) balances[acc.id] = { debit: 0, credit: 0 };
            balances[acc.id].debit += Number(line.debit) || 0;
            balances[acc.id].credit += Number(line.credit) || 0;
        });
    });
    var db = {};
    if (opts.level === 4) {
        vouchers.forEach(function(v) {
            v.lines.forEach(function(line) {
                if (!line.account || !line.details) return;
                var acc = accounts.find(function(a) { return a.id === line.account; });
                if (!acc) return;
                if (opts.cat && acc.cat !== opts.cat) return;
                if (opts.nature && acc.nature !== opts.nature) return;
                Object.keys(line.details).forEach(function(lt) {
                    var did = line.details[lt];
                    if (!did) return;
                    if (!db[did]) db[did] = { debit: 0, credit: 0, parent: acc.id, linkType: lt };
                    db[did].debit += Number(line.debit) || 0;
                    db[did].credit += Number(line.credit) || 0;
                });
            });
        });
    }
    return { balances: balances, detailBalances: db };
}
function rollupBalances(accounts, balances) {
    var rolled = {}, idMap = {};
    accounts.forEach(function(a) {
        idMap[a.id] = a;
        rolled[a.id] = { debit: balances[a.id] ? balances[a.id].debit : 0, credit: balances[a.id] ? balances[a.id].credit : 0 };
    });
    function depth(acc) {
        var d = 0, cur = acc;
        while (cur && cur.parent) { d++; cur = idMap[cur.parent]; }
        return d;
    }
    var sorted = accounts.slice().sort(function(a, b) { return depth(b) - depth(a); });
    sorted.forEach(function(a) {
        if (a.parent && rolled[a.parent]) {
            rolled[a.parent].debit += rolled[a.id].debit;
            rolled[a.parent].credit += rolled[a.id].credit;
        }
    });
    return rolled;
}
function getRootAccountId(accId, accounts) {
    var acc = accounts.find(function(a) { return a.id === accId; });
    if (!acc) return '';
    while (acc.parent) {
        acc = accounts.find(function(a) { return a.id === acc.parent; });
        if (!acc) break;
    }
    return acc ? acc.id : '';
}
function getDescendantIds(accountId) {
    var accounts = DB.load('accounts', []);
    var result = [accountId];
    var queue = [accountId];
    while (queue.length > 0) {
        var cur = queue.shift();
        accounts.forEach(function(a) {
            if (a.parent === cur) { result.push(a.id); queue.push(a.id); }
        });
    }
    return result;
}
function getPeriodMonthRange() {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var y = j[0], m = j[1];
    var from = y + '/' + pad2(m) + '/01';
    var to = y + '/' + pad2(m) + '/' + pad2(daysInJalaliMonth(y, m));
    return { from: from, to: to, year: y, month: m };
}
function refreshReportPeriodSelects() {
    var ps = DB.load('fiscalPeriods', []);
    ['ra-period','rt-period','ri-period'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (!sel) return;
        var v = sel.value;
        sel.innerHTML = '<option value="">همه</option>';
        for (var i = 0; i < ps.length; i++) {
            var o = document.createElement('option');
            o.value = ps[i].id;
            o.textContent = ps[i].title;
            sel.appendChild(o);
        }
        sel.value = v;
    });
}

/* ==================== گزارش وضعیت نقدینگی ==================== */
function computeBankBalanceAtDate(fromDate) {
    var vouchers = DB.load('vouchers', []);
    var banks = DB.load('bankAccounts', []);
    var bankIds = banks.map(function(b) { return b.id; });
    var total = 0;
    vouchers.forEach(function(v) {
        if (v.status !== 'approved') return;
        if (v.date >= fromDate) return;
        (v.lines || []).forEach(function(line) {
            if (line.details && line.details.bank && bankIds.indexOf(line.details.bank) !== -1) {
                total += (Number(line.debit) || 0) - (Number(line.credit) || 0);
            }
        });
    });
    return total;
}
function runCashFlowReport() {
    var fromDate = normalizeDigits((document.getElementById('cf-from').value || '').trim());
    var toDate = normalizeDigits((document.getElementById('cf-to').value || '').trim());
    if (!fromDate) fromDate = todayJalaliStr();
    if (!toDate) toDate = fromDate;
    document.getElementById('cf-from').value = fromDate;
    document.getElementById('cf-to').value = toDate;
    if (fromDate > toDate) { alert('تاریخ شروع باید قبل از پایان باشد.'); return; }
    var hide = getHideState('cf');
    var bankBalance = computeBankBalanceAtDate(fromDate);
    var sources = DB.load('cashFlowSources', []);
    var sourcesInRange = sources.filter(function(s) {
        if (!s.expectedDate) return true;
        return s.expectedDate >= fromDate && s.expectedDate <= toDate;
    });
    var facilities = DB.load('facilities', []);
    var facilityInsts = [];
    facilities.forEach(function(f) {
        (f.installments || []).forEach(function(inst) {
            if (inst.status === 'paid') return;
            if (!inst.date) return;
            if (inst.date < fromDate || inst.date > toDate) return;
            facilityInsts.push({ f: f, inst: inst });
        });
    });
    var estimates = DB.load('dailyEstimates', []);
    var estimateItemsArr = [];
    estimates.forEach(function(est) {
        (est.items || []).forEach(function(it) {
            if (!it.date) return;
            if (it.date < fromDate || it.date > toDate) return;
            estimateItemsArr.push({ est: est, item: it });
        });
    });
    var items = [];
    sourcesInRange.forEach(function(s) {
        items.push({ type: 'source', date: s.expectedDate || fromDate, sortDate: s.expectedDate || (fromDate + '~'), amount: Number(s.amount) || 0, label: '📥 ' + getSourceLabel(s), notes: s.notes || '' });
    });
    facilityInsts.forEach(function(item) {
        items.push({ type: 'facility', date: item.inst.date, sortDate: item.inst.date, amount: -Number(item.inst.amount || 0), label: '💸 قسط ' + item.f.name, notes: '' });
    });
    estimateItemsArr.forEach(function(item) {
        items.push({ type: 'estimate', date: item.item.date, sortDate: item.item.date, amount: -Number(item.item.amount || 0), label: '📝 ' + (item.est.title || item.est.desc || 'برآورد'), notes: '' });
    });
    items.sort(function(a, b) { return compareVals(a.sortDate, b.sortDate); });
    var html = '<div class="cf-report"><div class="table-wrap">';
    html += '<table class="cf-table" id="cf-table"><thead><tr><th style="width:35%">عنوان دسته</th><th style="width:15%">تاریخ</th><th style="width:25%">مبلغ</th><th style="width:25%">مانده در خط</th></tr></thead><tbody>';
    var running = bankBalance;
    var bbCls = bankBalance < 0 ? 'cf-neg' : '';
    var bbText = hide ? '—' : (bankBalance < 0 ? '(' + formatMoney(Math.abs(bankBalance)) + ')' : formatMoney(bankBalance));
    html += '<tr class="cf-bank-row"><td class="cf-cat">💰 مانده بانک ها</td><td dir="ltr">' + toFa(fromDate) + '</td><td class="num ' + bbCls + '">' + bbText + '</td><td class="num ' + bbCls + '">' + bbText + '</td></tr>';
    items.forEach(function(it) {
        running += it.amount;
        var amtCls = '';
        var amtText = '';
        if (it.type === 'facility' || it.type === 'estimate') {
            amtCls = 'cf-neg';
            amtText = hide ? '—' : '(' + formatMoney(Math.abs(it.amount)) + ')';
        } else {
            amtCls = 'cf-pos';
            amtText = hide ? '—' : formatMoney(it.amount);
        }
        var balCls = running < 0 ? 'cf-neg' : '';
        var balText = hide ? '—' : (running < 0 ? '(' + formatMoney(Math.abs(running)) + ')' : formatMoney(running));
        var rowCls = it.type === 'facility' ? 'cf-fac-row' : (it.type === 'estimate' ? 'cf-est-row' : 'cf-source-row');
        var label = it.label + (it.notes ? ' <span class="muted" style="font-size:0.72rem">(' + esc(it.notes) + ')</span>' : '');
        html += '<tr class="' + rowCls + '"><td class="cf-cat">' + label + '</td><td dir="ltr">' + toFa(esc(it.date)) + '</td><td class="num ' + amtCls + '">' + amtText + '</td><td class="num ' + balCls + '">' + balText + '</td></tr>';
    });
    html += '</tbody>';
    var finalCls = running < 0 ? 'cf-neg' : '';
    var finalText = hide ? '—' : (running < 0 ? '(' + formatMoney(Math.abs(running)) + ')' : formatMoney(running));
    html += '<tfoot><tr><td colspan="2" style="text-align:left">مانده نهایی</td><td class="num"></td><td class="num ' + finalCls + '">' + finalText + '</td></tr></tfoot></table></div></div>';
    document.getElementById('cf-result').innerHTML = html;
    document.getElementById('cf-count').textContent = toFa(items.length + 1) + ' ردیف';
    var unitEl = document.getElementById('cf-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    autoAttachReportHelpers();
}

/* ==================== گردش وجه نقد ==================== */
function runCashFlowByDescReport() {
    var fromD = normalizeDigits((document.getElementById('cfd-from').value || '').trim());
    var toD = normalizeDigits((document.getElementById('cfd-to').value || '').trim());
    if (!fromD) fromD = todayJalaliStr();
    if (!toD) toD = fromD;
    if (fromD > toD) { alert('تاریخ شروع باید قبل از پایان باشد.'); return; }
    document.getElementById('cfd-from').value = fromD;
    document.getElementById('cfd-to').value = toD;
    var hide = getHideState('cfd');
    var accounts = DB.load('accounts', []);
    var effectiveAccs = {};
    accounts.forEach(function(a) { if (a.cfEffect) effectiveAccs[a.id] = true; });
    var effIds = Object.keys(effectiveAccs);
    if (effIds.length === 0) {
        document.getElementById('cfd-result').innerHTML = '<div class="card"><p class="muted" style="text-align:center;padding:16px">⚠️ هیچ معینی با گزینه «موثر در گزارش گردش وجه نقد» تعریف نشده است.</p></div>';
        document.getElementById('cfd-count').textContent = '۰';
        return;
    }
    var vouchers = DB.load('vouchers', []).filter(function(v) {
        return v.status === 'approved' && v.date >= fromD && v.date <= toD;
    });
    var buckets = {};
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account || !effectiveAccs[l.account]) return;
            var desc = (l.description || '').trim() || '(بدون شرح)';
            if (!buckets[desc]) buckets[desc] = { in: 0, out: 0, details: [] };
            var d = Number(l.debit) || 0;
            var c = Number(l.credit) || 0;
            buckets[desc].in += d;
            buckets[desc].out += c;
            buckets[desc].details.push({
                date: v.date,
                number: v.number,
                desc: v.desc,
                accLabel: getAccountLabel(l.account, accounts),
                lineDesc: l.description || '',
                debit: d,
                credit: c
            });
        });
    });
    var keys = Object.keys(buckets);
    keys.sort(function(a, b) { return compareVals(a, b); });
    if (keys.length === 0) {
        document.getElementById('cfd-result').innerHTML = '<div class="card"><p class="muted" style="text-align:center;padding:16px">در این بازه گردشی ثبت نشده است.</p></div>';
        document.getElementById('cfd-count').textContent = '۰';
        return;
    }
    var html = '<div class="table-wrap"><table class="report-table" id="cfd-table"><thead><tr><th>#</th><th>بابت / شرح</th><th>ورود (بدهکار)</th><th>خروج (بستانکار)</th><th>مانده</th><th>تعداد</th></tr></thead><tbody>';
    var tIn = 0, tOut = 0;
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var b = buckets[k];
        var bal = b.in - b.out;
        tIn += b.in;
        tOut += b.out;
        html += '<tr><td class="num">' + toFa(i + 1) + '</td><td><strong>' + esc(k) + '</strong></td><td class="num" style="color:#1e9e6a">' + (hide ? '—' : (b.in ? formatMoney(b.in) : '—')) + '</td><td class="num" style="color:#c0392b">' + (hide ? '—' : (b.out ? formatMoney(b.out) : '—')) + '</td><td class="num" style="font-weight:bold;color:' + (bal >= 0 ? '#1e9e6a' : '#c0392b') + '">' + (hide ? '—' : formatMoney(bal)) + '</td><td class="num">' + toFa(b.details.length) + '</td></tr>';
    }
    html += '</tbody><tfoot><tr><td colspan="2" style="text-align:left">جمع</td><td class="num" style="color:#1e9e6a">' + (hide ? '—' : formatMoney(tIn)) + '</td><td class="num" style="color:#c0392b">' + (hide ? '—' : formatMoney(tOut)) + '</td><td class="num">' + (hide ? '—' : formatMoney(tIn - tOut)) + '</td><td></td></tr></tfoot></table></div>';
    for (var j = 0; j < keys.length; j++) {
        var k2 = keys[j];
        var b2 = buckets[k2];
        html += '<div class="cfd-group" style="margin-top:14px"><div class="cfd-head" onclick="var d=this.nextElementSibling;d.classList.toggle(\'show\')"><div class="cfd-title">' + esc(k2) + '</div><div class="cfd-nums"><span class="n in">ورود: ' + (hide ? '—' : formatMoney(b2.in)) + '</span><span class="n out">خروج: ' + (hide ? '—' : formatMoney(b2.out)) + '</span><span class="n bal">مانده: ' + (hide ? '—' : formatMoney(b2.in - b2.out)) + '</span></div></div><div class="cfd-details"><table class="data-table"><thead><tr><th>#</th><th>تاریخ</th><th>شماره</th><th>شرح سند</th><th>حساب</th><th>شرح قلم</th><th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>';
        for (var di = 0; di < b2.details.length; di++) {
            var d2 = b2.details[di];
            html += '<tr><td>' + toFa(di + 1) + '</td><td dir="ltr">' + toFa(d2.date) + '</td><td dir="ltr">' + toFa(d2.number) + '</td><td>' + esc(d2.desc || '') + '</td><td>' + esc(d2.accLabel) + '</td><td>' + esc(d2.lineDesc) + '</td><td class="num dr">' + (hide ? '—' : (d2.debit ? formatMoney(d2.debit) : '—')) + '</td><td class="num cr">' + (hide ? '—' : (d2.credit ? formatMoney(d2.credit) : '—')) + '</td></tr>';
        }
        html += '</tbody></table></div></div>';
    }
    document.getElementById('cfd-result').innerHTML = html;
    document.getElementById('cfd-count').textContent = toFa(keys.length) + ' دسته';
    var unitEl = document.getElementById('cfd-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    autoAttachReportHelpers();
}

/* ==================== مرور حساب‌ها ==================== */
function openAccountTurnover(accountId, detailInfo) {
    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === accountId; });
    if (!acc) return;
    var ids = getDescendantIds(accountId);
    var fromD = document.getElementById('ra-from').value;
    var toD = document.getElementById('ra-to').value;
    var vtype = document.getElementById('ra-vtype').value;
    var periodId = document.getElementById('ra-period').value;
    var hide = getHideState('ra');
    var vouchers = DB.load('vouchers', []).filter(function(v) {
        if (v.status !== 'approved') return false;
        if (!v.date) return false;
        if (fromD && v.date < fromD) return false;
        if (toD && v.date > toD) return false;
        if (vtype && v.type !== vtype) return false;
        if (periodId && v.periodId !== periodId) return false;
        return true;
    });
    var rows = [];
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account || ids.indexOf(l.account) === -1) return;
            if (detailInfo) {
                if (!l.details || l.details[detailInfo.linkType] !== detailInfo.detailId) return;
            }
            rows.push({ voucher: v, line: l });
        });
    });
    rows.sort(function(a, b) {
        var c = compareVals(a.voucher.date, b.voucher.date);
        if (c !== 0) return c;
        return compareVals(a.voucher.number, b.voucher.number);
    });
    var title = '📊 گردش: ' + acc.name;
    if (detailInfo) title += ' → ' + getDetailLabel(detailInfo.linkType, detailInfo.detailId);
    document.getElementById('turnover-title').textContent = title;
    var body = document.getElementById('turnover-body');
    if (rows.length === 0) body.innerHTML = '<p class="muted" style="text-align:center;padding:20px">گردشی در این بازه یافت نشد.</p>';
    else {
        var html = '<div class="table-wrap"><table class="report-table" id="turnover-table"><thead><tr><th>#</th><th>تاریخ</th><th>شماره</th><th>شرح سند</th><th>حساب</th><th>تفصیلی</th><th>شرح قلم</th><th>بدهکار</th><th>بستانکار</th><th>مانده</th></tr></thead><tbody>';
        var runBal = 0;
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var v = r.voucher;
            var l = r.line;
            var d = Number(l.debit) || 0;
            var c = Number(l.credit) || 0;
            runBal += d - c;
            var detailsStr = '';
            if (l.details) Object.keys(l.details).forEach(function(lt) {
                var did = l.details[lt];
                if (did) {
                    if (detailsStr) detailsStr += ' ، ';
                    detailsStr += linkTypeName(lt) + ': ' + getDetailLabel(lt, did);
                }
            });
            var accLabel = getAccountLabel(l.account, accounts);
            html += '<tr><td class="num">' + toFa(i + 1) + '</td><td dir="ltr">' + toFa(esc(v.date)) + '</td><td dir="ltr">' + toFa(esc(v.number)) + '</td><td>' + esc(v.desc || '') + '</td><td>' + esc(accLabel) + '</td><td>' + (detailsStr ? esc(detailsStr) : '—') + '</td><td>' + esc(l.description || '') + '</td><td class="num dr">' + (hide ? '—' : (d ? formatMoney(d) : '—')) + '</td><td class="num cr">' + (hide ? '—' : (c ? formatMoney(c) : '—')) + '</td><td class="num" style="font-weight:bold;color:' + (runBal >= 0 ? '#1e9e6a' : '#c0392b') + '">' + (hide ? '—' : formatMoney(runBal)) + '</td></tr>';
        }
        html += '</tbody></table></div>';
        body.innerHTML = html;
    }
    document.getElementById('turnover-modal').classList.add('show');
    document.getElementById('turnover-overlay').classList.add('show');
    setTimeout(function() { autoAttachReportHelpers(); }, 50);
}
function closeTurnover() {
    document.getElementById('turnover-modal').classList.remove('show');
    document.getElementById('turnover-overlay').classList.remove('show');
}
function runAccountReport() {
    var opts = {
        from: document.getElementById('ra-from').value,
        to: document.getElementById('ra-to').value,
        vtype: document.getElementById('ra-vtype').value,
        periodId: document.getElementById('ra-period').value,
        cat: document.getElementById('ra-cat').value,
        nature: document.getElementById('ra-nature').value,
        level: Number(document.getElementById('ra-level').value) || 3
    };
    var accounts = DB.load('accounts', []);
    var result = computeAccountBalances(opts);
    var rolled = rollupBalances(accounts, result.balances);
    var hide = getHideState('ra');
    state.reportExpandedNodes = {};
    var box = document.getElementById('ra-result');
    box.innerHTML = '';
    var tL = opts.level;
    var roots = accounts.filter(function(a) { return !a.parent; });
    function getCh(pid) { return accounts.filter(function(a) { return a.parent === pid; }); }
    var dM = {};
    if (tL >= 4) {
        Object.keys(result.detailBalances).forEach(function(did) {
            var d = result.detailBalances[did];
            if (!dM[d.parent]) dM[d.parent] = [];
            dM[d.parent].push({ id: did, linkType: d.linkType, debit: d.debit, credit: d.credit });
        });
    }
    var tD = 0, tC = 0, shown = 0;
    var container = document.createElement('div');
    container.className = 'report-tree';
    box.appendChild(container);
    function renderNode(node, level, parentEl) {
        var b = rolled[node.id] || { debit: 0, credit: 0 };
        var net = b.debit - b.credit;
        var hC = getCh(node.id).length > 0 || (level === 3 && tL === 4 && dM[node.id] && dM[node.id].length > 0);
        var sS = level <= tL;
        var isE = state.reportExpandedNodes[node.id] !== false;
        if (sS) {
            var div = document.createElement('div');
            div.className = 'rt-node level-' + level;
            var ek = node.id;
            var th = hC ? '<span class="rt-toggle" data-toggle="' + ek + '">' + (isE ? '▼' : '◀') + '</span>' : '<span class="rt-toggle empty">•</span>';
            var lB = '';
            if (level === 1) lB = '<span class="rt-level-badge l1">گروه</span>';
            else if (level === 2) lB = '<span class="rt-level-badge l2">کل</span>';
            else if (level === 3) lB = '<span class="rt-level-badge l3">معین</span>';
            var nD = net === 0 ? '۰' : (hide ? '—' : fmtRep(Math.abs(net), 'ra'));
            div.innerHTML = th + '<span class="rt-name">' + esc(node.name) + '</span>' + lB + '<span class="rt-amounts"><span class="amt dr">بدهکار: ' + (hide ? '—' : fmtRep(b.debit, 'ra')) + '</span><span class="amt cr">بستانکار: ' + (hide ? '—' : fmtRep(b.credit, 'ra')) + '</span><span class="amt net">مانده: ' + nD + '</span></span>';
            var tEl = div.querySelector('[data-toggle]');
            if (tEl) tEl.addEventListener('click', function(e) {
                e.stopPropagation();
                state.reportExpandedNodes[ek] = !isE;
                rerender();
            });
            div.addEventListener('click', function(e) {
                if (e.target.closest('[data-toggle]')) return;
                openAccountTurnover(node.id, null);
            });
            parentEl.appendChild(div);
            tD += b.debit;
            tC += b.credit;
            shown++;
        }
        if (sS && isE) {
            var cB = document.createElement('div');
            cB.className = 'rt-children';
            var chs = getCh(node.id);
            for (var ci = 0; ci < chs.length; ci++) renderNode(chs[ci], level + 1, cB);
            if (level === 3 && dM[node.id]) {
                var ds = dM[node.id];
                for (var di = 0; di < ds.length; di++) {
                    (function(d) {
                        var dn = d.debit - d.credit;
                        var dnD = dn === 0 ? '۰' : (hide ? '—' : fmtRep(Math.abs(dn), 'ra'));
                        var dD = document.createElement('div');
                        dD.className = 'rt-node level-4';
                        dD.style.cursor = 'pointer';
                        dD.innerHTML = '<span class="rt-toggle empty">•</span><span class="rt-name">' + esc(getDetailLabel(d.linkType, d.id)) + '</span><span class="rt-level-badge l4">' + linkTypeName(d.linkType) + '</span><span class="rt-amounts"><span class="amt dr">بدهکار: ' + (hide ? '—' : fmtRep(d.debit, 'ra')) + '</span><span class="amt cr">بستانکار: ' + (hide ? '—' : fmtRep(d.credit, 'ra')) + '</span><span class="amt net">مانده: ' + dnD + '</span></span>';
                        dD.addEventListener('click', function(ev) {
                            ev.stopPropagation();
                            openAccountTurnover(node.id, { linkType: d.linkType, detailId: d.id });
                        });
                        cB.appendChild(dD);
                        tD += d.debit;
                        tC += d.credit;
                        shown++;
                    })(ds[di]);
                }
            }
            if (cB.children.length > 0) parentEl.appendChild(cB);
        }
    }
    function rerender() {
        container.innerHTML = '';
        tD = 0; tC = 0; shown = 0;
        for (var i = 0; i < roots.length; i++) renderNode(roots[i], 1, container);
        var footer = document.createElement('div');
        footer.style.cssText = 'margin-top:14px;padding:14px;background:var(--primary-soft);border-radius:14px;font-weight:bold;color:var(--primary-dark);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;border:1px solid var(--primary-light)';
        var bt = (tD === tC) ? '✓ متوازن' : '⚠️ اختلاف: ' + (hide ? '—' : fmtRep(Math.abs(tD - tC), 'ra'));
        footer.innerHTML = '<span>جمع بدهکار: ' + (hide ? '—' : fmtRep(tD, 'ra')) + '</span><span>جمع بستانکار: ' + (hide ? '—' : fmtRep(tC, 'ra')) + '</span><span>' + bt + '</span><span>واحد: ' + currencyLabel() + '</span>';
        container.appendChild(footer);
        document.getElementById('ra-count').textContent = toFa(shown);
    }
    rerender();
    window._renderAccountReportTree = rerender;
    autoAttachReportHelpers();
}

/* ==================== تراز آزمایشی ==================== */
function runTrialBalance() {
    var opts = {
        from: document.getElementById('rt-from').value,
        to: document.getElementById('rt-to').value,
        vtype: document.getElementById('rt-vtype').value,
        periodId: document.getElementById('rt-period').value,
        cat: document.getElementById('rt-cat').value,
        nature: document.getElementById('rt-nature').value,
        level: Number(document.getElementById('rt-level').value) || 3
    };
    var accounts = DB.load('accounts', []);
    var result = computeAccountBalances(opts);
    var rolled = rollupBalances(accounts, result.balances);
    var hide = getHideState('rt');
    var rows = [];
    function getCh(pid) { return accounts.filter(function(a) { return a.parent === pid; }); }
    function walk(node, level) {
        var b = rolled[node.id] || { debit: 0, credit: 0 };
        var net = b.debit - b.credit;
        if (opts.level === 4 && level === 3) {
            var sD = 0, sC = 0;
            Object.keys(result.detailBalances).forEach(function(did) {
                var d = result.detailBalances[did];
                if (d.parent !== node.id) return;
                sD += d.debit; sC += d.credit;
                var dn = d.debit - d.credit;
                rows.push({ name: getDetailLabel(d.linkType, did) + ' (' + node.name + ')', level: 4, debit: d.debit, credit: d.credit, md: dn > 0 ? dn : 0, mc: dn < 0 ? -dn : 0 });
            });
            var dd = b.debit - sD, dc = b.credit - sC;
            if (Math.abs(dd) > 0.5 || Math.abs(dc) > 0.5) {
                var dn2 = dd - dc;
                rows.push({ name: node.name + ' (بدون تفصیلی)', level: 4, debit: dd, credit: dc, md: dn2 > 0 ? dn2 : 0, mc: dn2 < 0 ? -dn2 : 0 });
            }
            return;
        }
        if (level === opts.level) {
            if (b.debit > 0 || b.credit > 0) rows.push({ name: node.name, level: level, debit: b.debit, credit: b.credit, md: net > 0 ? net : 0, mc: net < 0 ? -net : 0 });
            return;
        }
        if (level < opts.level) {
            var chs = getCh(node.id);
            for (var ci = 0; ci < chs.length; ci++) walk(chs[ci], level + 1);
        }
    }
    var roots = accounts.filter(function(a) { return !a.parent; });
    for (var i = 0; i < roots.length; i++) walk(roots[i], 1);
    var html = '<div class="table-wrap"><table class="report-table" id="rt-table"><thead><tr><th>عنوان</th><th>سطح</th><th>گردش بدهکار</th><th>گردش بستانکار</th><th>مانده بدهکار</th><th>مانده بستانکار</th></tr></thead><tbody>';
    var tD = 0, tC = 0, tMD = 0, tMC = 0;
    for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        tD += row.debit; tC += row.credit; tMD += row.md; tMC += row.mc;
        var lN = row.level === 1 ? 'گروه' : (row.level === 2 ? 'کل' : (row.level === 3 ? 'معین' : 'تفصیلی'));
        html += '<tr><td>' + esc(row.name) + '</td><td>' + lN + '</td><td class="num dr">' + (hide ? '—' : fmtRep(row.debit, 'rt')) + '</td><td class="num cr">' + (hide ? '—' : fmtRep(row.credit, 'rt')) + '</td><td class="num dr">' + (hide ? '—' : (row.md ? fmtRep(row.md, 'rt') : '—')) + '</td><td class="num cr">' + (hide ? '—' : (row.mc ? fmtRep(row.mc, 'rt') : '—')) + '</td></tr>';
    }
    html += '</tbody><tfoot><tr><td colspan="2" style="text-align:left">جمع</td><td class="num dr">' + (hide ? '—' : fmtRep(tD, 'rt')) + '</td><td class="num cr">' + (hide ? '—' : fmtRep(tC, 'rt')) + '</td><td class="num dr">' + (hide ? '—' : fmtRep(tMD, 'rt')) + '</td><td class="num cr">' + (hide ? '—' : fmtRep(tMC, 'rt')) + '</td></tr></tfoot></table></div>';
    document.getElementById('rt-result').innerHTML = html;
    document.getElementById('rt-count').textContent = toFa(rows.length);
    applyColVisibility('rt-table');
    autoAttachReportHelpers();
}

/* ==================== تراکنش‌های تکمیل نشده ==================== */
function runIncompleteReport() {
    var statusF = (document.getElementById('ri-status').value || '');
    var periodF = (document.getElementById('ri-period').value || '');
    var hide = getHideState('ri');
    var vouchers = DB.load('vouchers', []);
    var rows = [];
    vouchers.forEach(function(v) {
        var st = v.status || 'draft';
        if (statusF && st !== statusF) return;
        if (periodF && v.periodId !== periodF) return;
        var issues = getVoucherIssues(v);
        if (issues.length === 0) return;
        rows.push({ v: v, issues: issues });
    });
    rows.sort(function(a, b) { return compareVals(a.v.number, b.v.number); });
    var periods = DB.load('fiscalPeriods', []);
    var pM = {};
    periods.forEach(function(p) { pM[p.id] = p.title; });
    var html = '<div class="table-wrap"><table class="report-table" id="ri-table"><thead><tr><th>#</th><th>شماره</th><th>تاریخ</th><th>مبلغ</th><th>دوره</th><th>شرح</th><th>وضعیت</th><th>مشکلات</th><th>عملیات</th></tr></thead><tbody>';
    var totalAmt = 0;
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var v = r.v;
        var amt = getVoucherAmount(v);
        totalAmt += amt;
        var stB = v.status === 'approved' ? '<span class="badge badge-approved">✓</span>' : '<span class="badge badge-draft">پیش‌نویس</span>';
        var iss = '<div class="ri-issues">' + r.issues.map(function(x) { return '<div class="ri-issue-item">' + esc(x) + '</div>'; }).join('') + '</div>';
        var aH = '<div class="row-actions"><button class="row-btn open" data-vid="' + v.id + '" data-action="open-voucher">✎</button><button class="row-btn open" data-vid="' + v.id + '" data-action="preview-voucher">👁</button></div>';
        html += '<tr><td class="num">' + toFa(i + 1) + '</td><td dir="ltr">' + toFa(esc(v.number)) + '</td><td dir="ltr">' + toFa(esc(v.date)) + '</td><td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(amt)) + '</td><td>' + esc(pM[v.periodId] || '—') + '</td><td>' + esc(v.desc || '') + '</td><td>' + stB + '</td><td>' + iss + '</td><td>' + aH + '</td></tr>';
    }
    if (rows.length === 0) html += '<tr><td colspan="9" class="empty-row">✅ سند ناقصی وجود ندارد.</td></tr>';
    html += '</tbody>';
    if (rows.length > 0) {
        html += '<tfoot><tr><td colspan="3" style="text-align:left">جمع</td><td class="num" style="color:#c0392b">' + (hide ? '—' : formatMoney(totalAmt)) + '</td><td colspan="5"></td></tr></tfoot>';
    }
    html += '</table></div>';
    document.getElementById('ri-result').innerHTML = html;
    document.getElementById('ri-count').textContent = toFa(rows.length);
    var unitEl = document.getElementById('ri-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    var btns = document.querySelectorAll('#ri-result [data-action]');
    for (var bi = 0; bi < btns.length; bi++) btns[bi].addEventListener('click', function() {
        var vid = this.getAttribute('data-vid');
        var act = this.getAttribute('data-action');
        var v = findVoucherById(vid);
        if (!v) return;
        if (act === 'open-voucher') loadVoucherForEdit(v);
        else if (act === 'preview-voucher') openVoucherPreview(v);
    });
    autoAttachReportHelpers();
}

/* ==================== خلاصه تسهیلات ==================== */
function runFacilityReport() {
    var facilities = DB.load('facilities', []);
    var cf = document.getElementById('rf-category').value;
    var sf = document.getElementById('rf-status').value;
    var st = sortState.rf;
    var rows = [];
    var hide = getHideState('rf');
    facilities.forEach(function(f) {
        if (cf && (f.category || 'facility') !== cf) return;
        var ins = f.installments || [];
        var ri = ins.filter(function(x) { return x.status !== 'paid'; });
        var ra = ri.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var lD = ri.length > 0 ? ri[ri.length - 1].date : '—';
        var unpaidSorted = ri.slice().sort(function(a, b) { return compareVals(a.date, b.date); });
        var fU = unpaidSorted.length > 0 ? unpaidSorted[0].date : '—';
        var set = ins.length > 0 && ri.length === 0;
        if (sf === 'settled' && !set) return;
        if (sf === 'active' && set) return;
        rows.push({ f: f, rC: ri.length, rA: ra, lD: lD, fU: fU, set: set });
    });
    rows.sort(function(a, b) {
        var va, vb;
        if (st.col === 'name') { va = a.f.name || ''; vb = b.f.name || ''; }
        else if (st.col === 'initial') { va = a.f.initial || 0; vb = b.f.initial || 0; }
        else if (st.col === 'paid') { va = a.f.paid || 0; vb = b.f.paid || 0; }
        else if (st.col === 'remainingCount') { va = a.rC; vb = b.rC; }
        else if (st.col === 'remainingAmount') { va = a.rA; vb = b.rA; }
        else if (st.col === 'lastDate') { va = a.lD; vb = b.lD; }
        else if (st.col === 'firstUnpaid') { va = a.fU; vb = b.fU; }
        else if (st.col === 'status') { va = a.set ? 'تسویه' : 'جاری'; vb = b.set ? 'تسویه' : 'جاری'; }
        else { va = ''; vb = ''; }
        return st.dir === 'asc' ? compareVals(va, vb) : -compareVals(va, vb);
    });
    var html = '<div class="table-wrap"><table class="report-table" id="rf-table"><thead><tr><th data-sort="name">عنوان</th><th data-sort="status">وضعیت</th><th data-sort="initial">مبلغ اولیه</th><th data-sort="paid">پرداخت</th><th data-sort="remainingCount">اقساط باقی</th><th data-sort="remainingAmount">مبلغ باقی</th><th data-sort="firstUnpaid">اولین قسط پرداخت‌نشده</th><th data-sort="lastDate">آخرین قسط</th></tr></thead><tbody>';
    var tr = 0;
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var f = r.f;
        html += '<tr><td>' + esc(f.name) + '</td><td>' + (r.set ? '<span class="badge badge-settled">تسویه</span>' : '<span class="badge badge-active">جاری</span>') + '</td><td class="num">' + (hide ? '—' : fmtRep(f.initial || 0, 'rf')) + '</td><td class="num">' + (hide ? '—' : fmtRep(f.paid || 0, 'rf')) + '</td><td class="num">' + toFa(r.rC) + '</td><td class="num">' + (hide ? '—' : fmtRep(r.rA, 'rf')) + '</td><td dir="ltr">' + toFa(r.fU) + '</td><td dir="ltr">' + toFa(r.lD) + '</td></tr>';
        tr += r.rA;
    }
    html += '</tbody><tfoot><tr><td colspan="5" style="text-align:left">جمع مانده</td><td class="num">' + (hide ? '—' : fmtRep(tr, 'rf')) + '</td><td colspan="2"></td></tr></tfoot></table></div>';
    document.getElementById('rf-result').innerHTML = html;
    document.getElementById('rf-count').textContent = toFa(rows.length);
    var unitEl = document.getElementById('rf-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    setupRfSorting();
    autoAttachReportHelpers();
}
function setupRfSorting() {
    var ths = document.querySelectorAll('#rf-result th[data-sort]');
    for (var i = 0; i < ths.length; i++) ths[i].addEventListener('click', function() {
        var col = this.getAttribute('data-sort');
        if (sortState.rf.col === col) sortState.rf.dir = sortState.rf.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.rf.col = col; sortState.rf.dir = 'asc'; }
        runFacilityReport();
    });
}

/* ==================== گزارش جامع تسهیلات ==================== */
function setupRffSorting() {
    var ths = document.querySelectorAll('#rff-result th[data-sort]');
    for (var i = 0; i < ths.length; i++) ths[i].addEventListener('click', function() {
        var col = this.getAttribute('data-sort');
        if (sortState.rff.col === col) sortState.rff.dir = sortState.rff.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.rff.col = col; sortState.rff.dir = 'asc'; }
        runFacilityFullReport();
    });
}
function computeFacilityRows() {
    var facilities = DB.load('facilities', []);
    var cf = document.getElementById('rff-category').value;
    var sf = document.getElementById('rff-status').value;
    var inf = document.getElementById('rff-inst-status').value;
    var bf = document.getElementById('rff-bank').value;
    var fromD = document.getElementById('rff-from').value;
    var toD = document.getElementById('rff-to').value;
    var q = (document.getElementById('rff-search').value || '').toLowerCase();
    var banks = DB.load('bankAccounts', []);
    var bankMap = {};
    banks.forEach(function(b) { bankMap[b.id] = b; });
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);
    var rows = [];
    facilities.forEach(function(f) {
        if (cf && (f.category || 'facility') !== cf) return;
        if (bf && f.bankId !== bf) return;
        if (fromD && f.date && f.date < fromD) return;
        if (toD && f.date && f.date > toD) return;
        var allIns = f.installments || [];
        var ins = allIns;
        if (fromD || toD) {
            ins = allIns.filter(function(x) {
                if (!x.date) return false;
                if (fromD && x.date < fromD) return false;
                if (toD && x.date > toD) return false;
                return true;
            });
        }
        var paidCount = ins.filter(function(x) { return x.status === 'paid'; }).length;
        var totalAmt = ins.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var paidAmt = ins.filter(function(x) { return x.status === 'paid'; }).reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var unpaidList = ins.filter(function(x) { return x.status !== 'paid'; });
        var unpaidAmt = unpaidList.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var unpaidSorted = unpaidList.slice().sort(function(a, b) { return compareVals(a.date, b.date); });
        var firstUnpaidDate = unpaidSorted.length > 0 ? unpaidSorted[0].date : '';
        var firstUnpaidAmount = unpaidSorted.length > 0 ? Number(unpaidSorted[0].amount) || 0 : 0;
        var lastPaidDate = '—';
        var paidSorted = ins.filter(function(x) { return x.status === 'paid' && x.date; }).slice().sort(function(a, b) { return compareVals(b.date, a.date); });
        if (paidSorted.length > 0) lastPaidDate = paidSorted[0].date;
        var overdueCount = unpaidList.filter(function(x) { return x.date && x.date < tStr; }).length;
        var settled = ins.length > 0 && unpaidList.length === 0;
        var lastInsDate = '—';
        if (ins.length > 0) {
            var sortedIns = ins.slice().sort(function(a, b) { return compareVals(b.date, a.date); });
            lastInsDate = sortedIns[0].date || '—';
        }
        if ((fromD || toD) && ins.length === 0) return;
        if (sf === 'settled' && !settled) return;
        if (sf === 'active' && settled) return;
        if (inf === 'has-unpaid' && !(unpaidList.length > 0)) return;
        if (q) {
            var bankObj = bankMap[f.bankId];
            var txt = ((f.name || '') + ' ' + (f.date || '') + ' ' + categoryName(f.category) + ' ' + (bankObj ? bankObj.bank : '')).toLowerCase();
            if (txt.indexOf(q) === -1) return;
        }
        rows.push({
            f: f, bank: bankMap[f.bankId], insCount: ins.length, paidCount: paidCount,
            totalAmt: totalAmt, paidAmt: paidAmt, unpaidAmt: unpaidAmt,
            unpaidCount: unpaidList.length, firstUnpaidDate: firstUnpaidDate,
            firstUnpaidAmount: firstUnpaidAmount, lastPaidDate: lastPaidDate,
            overdueCount: overdueCount, settled: settled, lastInsDate: lastInsDate,
            filteredIns: ins
        });
    });
    return rows;
}
function runFacilityFullReport() {
    var rows = computeFacilityRows();
    var st = sortState.rff;
    rows.sort(function(a, b) {
        var va, vb;
        switch (st.col) {
            case 'name': va = a.f.name || ''; vb = b.f.name || ''; break;
            case 'category': va = categoryName(a.f.category); vb = categoryName(b.f.category); break;
            case 'bank': va = a.bank ? a.bank.bank : ''; vb = b.bank ? b.bank.bank : ''; break;
            case 'date': va = a.f.date || ''; vb = b.f.date || ''; break;
            case 'initial': va = Number(a.f.initial || 0); vb = Number(b.f.initial || 0); break;
            case 'paidAmt': va = a.paidAmt; vb = b.paidAmt; break;
            case 'unpaidAmt': va = a.unpaidAmt; vb = b.unpaidAmt; break;
            case 'insCount': va = a.insCount; vb = b.insCount; break;
            case 'paidCount': va = a.paidCount; vb = b.paidCount; break;
            case 'unpaidCount': va = a.unpaidCount; vb = b.unpaidCount; break;
            case 'firstUnpaidDate': va = a.firstUnpaidDate || ''; vb = b.firstUnpaidDate || ''; break;
            case 'lastPaidDate': va = a.lastPaidDate || ''; vb = b.lastPaidDate || ''; break;
            case 'overdueCount': va = a.overdueCount; vb = b.overdueCount; break;
            case 'status': va = a.settled ? 'تسویه' : 'جاری'; vb = b.settled ? 'تسویه' : 'جاری'; break;
            default: va = ''; vb = '';
        }
        return st.dir === 'asc' ? compareVals(va, vb) : -compareVals(va, vb);
    });
    if (state.rffView === 'detail') renderFacilityFullDetail(rows);
    else renderFacilityFullSummary(rows);
    autoAttachReportHelpers();
}
function renderFacilityFullSummary(rows) {
    var st = sortState.rff;
    var hide = getHideState('rff');
    var html = '<div class="table-wrap"><table class="report-table" id="rff-table"><thead><tr>' +
        '<th data-sort="name">عنوان</th><th data-sort="category">دسته</th><th data-sort="bank">بانک</th><th data-sort="date">تاریخ</th>' +
        '<th data-sort="initial">مبلغ اولیه</th><th data-sort="paidAmt">پرداخت</th><th data-sort="unpaidAmt">باقی‌مانده</th>' +
        '<th data-sort="insCount">تعداد</th><th data-sort="paidCount">پرداخت‌شده</th><th data-sort="unpaidCount">باقی</th>' +
        '<th data-sort="overdueCount">سررسید گذشته</th><th data-sort="firstUnpaidDate">اولین قسط پرداخت‌نشده</th>' +
        '<th data-sort="lastPaidDate">آخرین پرداخت</th><th data-sort="status">وضعیت</th><th>عملیات</th></tr></thead><tbody>';
    var sumInit = 0, sumPaid = 0, sumUnpaid = 0, sumInsCount = 0, sumPaidCount = 0, sumUnpaidCount = 0, sumOverdue = 0;
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var f = r.f;
        sumInit += Number(f.initial || 0);
        sumPaid += r.paidAmt;
        sumUnpaid += r.unpaidAmt;
        sumInsCount += r.insCount;
        sumPaidCount += r.paidCount;
        sumUnpaidCount += r.unpaidCount;
        sumOverdue += r.overdueCount;
        var catB = (f.category === 'scheduled') ? '<span class="badge badge-cat-sch">زمانبندی</span>' : '<span class="badge badge-cat-fac">تسهیلات</span>';
        var stB = r.settled ? '<span class="badge badge-settled">تسویه</span>' : '<span class="badge badge-active">جاری</span>';
        var overdue = r.overdueCount > 0 ? '<span class="badge badge-overdue">' + toFa(r.overdueCount) + '</span>' : '۰';
        var firstUnpaidCell = r.firstUnpaidDate ? (toFa(r.firstUnpaidDate) + (r.firstUnpaidAmount ? ' <span class="muted" style="font-size:0.7rem">(' + (hide ? '—' : fmtRep(r.firstUnpaidAmount, 'rff')) + ')</span>' : '')) : '—';
        var aH = '<div class="row-actions"><button class="row-btn open" data-fid="' + f.id + '" data-action="rff-inst">📖</button><button class="row-btn edit" data-fid="' + f.id + '" data-action="rff-edit">✎</button></div>';
        html += '<tr><td><strong>' + esc(f.name) + '</strong></td><td>' + catB + '</td><td>' + esc(r.bank ? r.bank.bank : '—') + '</td><td dir="ltr">' + toFa(esc(f.date || '—')) + '</td><td class="num">' + (hide ? '—' : fmtRep(f.initial || 0, 'rff')) + '</td><td class="num" style="color:#1e9e6a">' + (hide ? '—' : fmtRep(r.paidAmt, 'rff')) + '</td><td class="num" style="color:' + (r.unpaidAmt > 0 ? '#c0392b' : '#1e9e6a') + '">' + (hide ? '—' : fmtRep(r.unpaidAmt, 'rff')) + '</td><td class="num">' + toFa(r.insCount) + '</td><td class="num" style="color:#1e9e6a">' + toFa(r.paidCount) + '</td><td class="num" style="color:#c47c00">' + toFa(r.unpaidCount) + '</td><td class="num">' + overdue + '</td><td dir="ltr">' + firstUnpaidCell + '</td><td dir="ltr">' + toFa(r.lastPaidDate) + '</td><td>' + stB + '</td><td>' + aH + '</td></tr>';
    }
    if (rows.length === 0) html += '<tr><td colspan="15" class="empty-row">موردی یافت نشد.</td></tr>';
    html += '</tbody>';
    if (rows.length > 0) {
        html += '<tfoot><tr><td colspan="4" style="text-align:left">جمع کل</td><td class="num">' + (hide ? '—' : fmtRep(sumInit, 'rff')) + '</td><td class="num" style="color:#1e9e6a">' + (hide ? '—' : fmtRep(sumPaid, 'rff')) + '</td><td class="num" style="color:#c0392b">' + (hide ? '—' : fmtRep(sumUnpaid, 'rff')) + '</td><td class="num">' + toFa(sumInsCount) + '</td><td class="num" style="color:#1e9e6a">' + toFa(sumPaidCount) + '</td><td class="num" style="color:#c47c00">' + toFa(sumUnpaidCount) + '</td><td class="num">' + toFa(sumOverdue) + '</td><td colspan="4"></td></tr></tfoot>';
    }
    html += '</table></div>';
    document.getElementById('rff-result').innerHTML = html;
    document.getElementById('rff-count').textContent = toFa(rows.length);
    var unitEl = document.getElementById('rff-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
    setupRffSorting();
    var btns = document.querySelectorAll('#rff-result [data-action]');
    for (var bi = 0; bi < btns.length; bi++) btns[bi].addEventListener('click', function() {
        var fid = this.getAttribute('data-fid');
        var act = this.getAttribute('data-action');
        var f = DB.load('facilities', []).find(function(x) { return x.id === fid; });
        if (!f) return;
        if (act === 'rff-inst') loadFacilityForInstallments(f);
        else if (act === 'rff-edit') loadFacilityIntoForm(f);
    });
}
function renderFacilityFullDetail(rows) {
    var sorted = rows.slice().sort(function(a, b) {
        if (a.insCount !== b.insCount) return a.insCount - b.insCount;
        return compareVals(a.lastInsDate || '9999/99/99', b.lastInsDate || '9999/99/99');
    });
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tStr = today[0] + '/' + pad2(today[1]) + '/' + pad2(today[2]);
    var hide = getHideState('rff');
    var html = '<div class="rff-detail-list">';
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        var f = r.f;
        var ins = r.filteredIns || f.installments || [];
        var paidCount = r.paidCount;
        var unpaidCount = r.unpaidCount;
        var catLabel = (f.category === 'scheduled') ? 'زمانبندی' : 'تسهیلات';
        var cls = (f.category === 'scheduled') ? ' sch' : '';
        html += '<div class="rff-fac-card"><div class="rff-fac-head' + cls + '"><div><div class="rff-fac-title">' + esc(f.name) + '</div><div class="rff-fac-meta">';
        html += '<span class="chip-m">' + catLabel + '</span>';
        if (r.bank) html += '<span class="chip-m">🏦 ' + esc(r.bank.bank || '') + '</span>';
        if (f.date) html += '<span class="chip-m">📅 ' + toFa(f.date) + '</span>';
        html += '</div></div><div>' + (r.settled ? '<span class="badge badge-settled">✓ تسویه</span>' : '<span class="badge badge-active">در جریان</span>') + '</div></div>';
        html += '<div class="rff-fac-stats">';
        html += '<div class="item"><div class="lbl">مبلغ اولیه</div><div class="val">' + (hide ? '—' : formatMoney(f.initial || 0)) + '</div></div>';
        html += '<div class="item"><div class="lbl">پرداخت شده</div><div class="val" style="color:#1e9e6a">' + (hide ? '—' : formatMoney(r.paidAmt)) + '</div></div>';
        html += '<div class="item"><div class="lbl">باقی‌مانده</div><div class="val" style="color:' + (r.unpaidAmt > 0 ? '#c0392b' : '#1e9e6a') + '">' + (hide ? '—' : formatMoney(r.unpaidAmt)) + '</div></div>';
        html += '<div class="item"><div class="lbl">تعداد اقساط</div><div class="val">' + toFa(ins.length) + '</div></div>';
        html += '<div class="item"><div class="lbl">پرداخت‌شده</div><div class="val" style="color:#1e9e6a">' + toFa(paidCount) + '</div></div>';
        html += '<div class="item"><div class="lbl">باقی</div><div class="val" style="color:#c47c00">' + toFa(unpaidCount) + '</div></div>';
        html += '</div>';
        if (ins.length === 0) {
            html += '<div class="rff-empty">— قسطی در این بازه یافت نشد —</div>';
        } else {
            html += '<table class="rff-inst-table"><thead><tr><th style="width:40px">#</th><th>تاریخ</th><th>مبلغ</th><th>وضعیت</th></tr></thead><tbody>';
            var sortedIns = ins.slice().sort(function(a, b) { return compareVals(a.date, b.date); });
            for (var j = 0; j < sortedIns.length; j++) {
                var inx = sortedIns[j];
                var isOverdue = (inx.status !== 'paid' && inx.date && inx.date < tStr);
                var rowCls = (inx.status === 'paid') ? 'paid-row' : (isOverdue ? 'overdue-row' : '');
                var stLabel = (inx.status === 'paid') ? '<span class="badge badge-paid">✓ پرداخت</span>' : (isOverdue ? '<span class="badge badge-overdue">سررسید گذشته</span>' : '<span class="badge badge-registered">ثبت</span>');
                html += '<tr class="' + rowCls + '"><td class="num">' + toFa(j + 1) + '</td><td dir="ltr">' + toFa(esc(inx.date || '—')) + '</td><td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(inx.amount || 0)) + '</td><td>' + stLabel + '</td></tr>';
            }
            html += '</tbody></table>';
        }
        html += '</div>';
    }
    if (rows.length === 0) html += '<div class="card"><p class="muted" style="text-align:center">موردی یافت نشد.</p></div>';
    html += '</div>';
    document.getElementById('rff-result').innerHTML = html;
    document.getElementById('rff-count').textContent = toFa(rows.length);
    var unitEl = document.getElementById('rff-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();
}
