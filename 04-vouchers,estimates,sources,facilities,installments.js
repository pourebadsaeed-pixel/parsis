/* =====================================================================
   پارسیس v27 — 04-vouchers,estimates,sources,facilities,installments.js
   اسناد، اقلام سند، برآورد هزینه، منابع دریافتنی، تسهیلات، اقساط
   ===================================================================== */
'use strict';

/* ==================== Voucher Lines ==================== */
var voucherLines = [];
var currentVoucherStatus = 'draft';

function renderVoucherLines() {
    var box = document.getElementById('voucher-lines');
    if (!box) return;
    box.innerHTML = '';
    if (voucherLines.length === 0) voucherLines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
    var leaves = getLeafAccounts();
    var accounts = DB.load('accounts', []);
    for (var i = 0; i < voucherLines.length; i++) (function(idx) {
        var line = voucherLines[idx];
        if (!line.details) line.details = {};
        var wrap = document.createElement('div');
        wrap.className = 'voucher-line' + (line.locked ? ' locked' : '');
        wrap.setAttribute('data-line-id', line.id);
        var numSpan = document.createElement('span');
        numSpan.className = 'ln-num' + (line.locked ? ' locked-tag' : '');
        numSpan.textContent = '#' + toFa(idx + 1) + (line.locked ? ' 🔒' : '');
        wrap.appendChild(numSpan);

        var mainGrid = document.createElement('div');
        mainGrid.className = 'ln-search-row';
        mainGrid.style.paddingTop = '14px';
        var sA = document.createElement('input');
        sA.type = 'text';
        sA.className = 'ln-search';
        sA.placeholder = '🔍 معین...';
        var selA = document.createElement('select');
        var fillA = function(q) {
            var cur = line.account;
            var f = leaves.filter(function(l) {
                if (!q) return true;
                return getAccountSearchText(l.id, accounts).indexOf(q) !== -1;
            });
            selA.innerHTML = '';
            var ph = document.createElement('option');
            ph.value = ''; ph.textContent = '— معین —';
            selA.appendChild(ph);
            for (var k = 0; k < f.length; k++) {
                var o = document.createElement('option');
                o.value = f[k].id;
                o.textContent = getAccountLabel(f[k].id, accounts);
                if (cur === f[k].id) o.selected = true;
                selA.appendChild(o);
            }
        };
        fillA('');
        if (line.locked) selA.disabled = true;
        selA.addEventListener('change', function() { line.account = this.value; line.details = {}; renderVoucherLines(); });
        sA.addEventListener('input', function() { fillA(normalizeDigits(this.value.trim().toLowerCase())); });
        mainGrid.appendChild(sA);
        mainGrid.appendChild(selA);
        wrap.appendChild(mainGrid);

        var acc = accounts.find(function(a) { return a.id === line.account; });
        if (acc && acc.links && acc.links.length > 0) {
            for (var li = 0; li < acc.links.length; li++) {
                var lt = acc.links[li];
                var items = getLinkedItems(lt);
                if (items.length === 0) continue;
                var detGrid = document.createElement('div');
                detGrid.className = 'ln-search-row';
                detGrid.style.marginTop = '8px';
                var sD = document.createElement('input');
                sD.type = 'text'; sD.className = 'ln-search';
                sD.placeholder = '🔍 ' + linkTypeName(lt) + '...';
                var selD = document.createElement('select');
                var fillD = function(q) {
                    var cv = (line.details && line.details[lt]) || '';
                    var f = items.filter(function(it) {
                        if (!q) return true;
                        return getLinkedItemLabel(lt, it).toLowerCase().indexOf(q) !== -1;
                    });
                    buildOptionsInto(selD, f, function(it) { return getLinkedItemLabel(lt, it); }, cv, '— ' + linkTypeName(lt) + ' —');
                };
                fillD('');
                if (line.locked) selD.disabled = true;
                (function(ltype, sR) { sR.addEventListener('change', function() { line.details[ltype] = this.value; }); })(lt, selD);
                (function(sR, its, ltype, sI) {
                    sI.addEventListener('input', function() {
                        var q = normalizeDigits(this.value.trim().toLowerCase());
                        var cv = sR.value;
                        var f = its.filter(function(it) { return !q || getLinkedItemLabel(ltype, it).toLowerCase().indexOf(q) !== -1; });
                        buildOptionsInto(sR, f, function(it) { return getLinkedItemLabel(ltype, it); }, cv, '— ' + linkTypeName(ltype) + ' —');
                    });
                })(selD, items, lt, sD);
                detGrid.appendChild(sD);
                detGrid.appendChild(selD);
                wrap.appendChild(detGrid);
            }
        }

        var r3 = document.createElement('div');
        r3.className = 'ln-row r4';
        r3.style.marginTop = '10px';
        var wD = document.createElement('div');
        wD.className = 'ln-amount-wrap';
        var iD = document.createElement('input');
        iD.type = 'text'; iD.inputMode = 'numeric'; iD.dir = 'ltr'; iD.placeholder = 'بدهکار';
        iD.value = line.debit ? formatRaw(line.debit) : '';
        iD.addEventListener('input', function() {
            var v = normalizeDigits(this.value);
            var r = v.replace(/[^\d]/g, '');
            this.value = r;
            var x = Number(r) || 0;
            line.debit = x;
            if (x > 0 && line.credit !== 0) { line.credit = 0; iC.value = ''; }
            updateVoucherTotals();
        });
        iD.addEventListener('blur', function() {
            var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
            this.value = v ? formatRaw(v) : '';
            line.debit = v;
            updateVoucherTotals();
        });
        var cD = document.createElement('button');
        cD.type = 'button'; cD.className = 'calc-btn'; cD.title = 'ماشین حساب'; cD.textContent = '🧮';
        cD.addEventListener('click', function() {
            calcOpen(function() { return line.debit || 0; }, function(v) {
                line.debit = v;
                if (v > 0 && line.credit !== 0) { line.credit = 0; }
                renderVoucherLines();
                updateVoucherTotals();
            }, 'ماشین حساب بدهکار');
        });
        wD.appendChild(iD); wD.appendChild(cD);
        var wC = document.createElement('div');
        wC.className = 'ln-amount-wrap';
        var iC = document.createElement('input');
        iC.type = 'text'; iC.inputMode = 'numeric'; iC.dir = 'ltr'; iC.placeholder = 'بستانکار';
        iC.value = line.credit ? formatRaw(line.credit) : '';
        iC.addEventListener('input', function() {
            var v = normalizeDigits(this.value);
            var r = v.replace(/[^\d]/g, '');
            this.value = r;
            var x = Number(r) || 0;
            line.credit = x;
            if (x > 0 && line.debit !== 0) { line.debit = 0; iD.value = ''; }
            updateVoucherTotals();
        });
        iC.addEventListener('blur', function() {
            var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
            this.value = v ? formatRaw(v) : '';
            line.credit = v;
            updateVoucherTotals();
        });
        var cC = document.createElement('button');
        cC.type = 'button'; cC.className = 'calc-btn'; cC.title = 'ماشین حساب'; cC.textContent = '🧮';
        cC.addEventListener('click', function() {
            calcOpen(function() { return line.credit || 0; }, function(v) {
                line.credit = v;
                if (v > 0 && line.debit !== 0) { line.debit = 0; }
                renderVoucherLines();
                updateVoucherTotals();
            }, 'ماشین حساب بستانکار');
        });
        wC.appendChild(iC); wC.appendChild(cC);
        r3.appendChild(wD); r3.appendChild(wC);

        var iT = document.createElement('input');
        iT.type = 'text'; iT.dir = 'ltr'; iT.placeholder = 'ش پیگیری';
        iT.value = line.trackingNumber || '';
        iT.addEventListener('input', function() { line.trackingNumber = this.value; });
        r3.appendChild(iT);

        var iTD = document.createElement('input');
        iTD.type = 'text'; iTD.dir = 'ltr'; iTD.placeholder = 'ت پیگیری';
        iTD.value = line.trackingDate || '';
        iTD.classList.add('date-picker');
        iTD.addEventListener('input', function() { line.trackingDate = this.value; });
        r3.appendChild(iTD);
        wrap.appendChild(r3);

        var r4 = document.createElement('div');
        r4.className = 'desc-row';
        var iDsc = document.createElement('input');
        iDsc.type = 'text'; iDsc.placeholder = 'شرح قلم *';
        iDsc.value = line.description || '';
        iDsc.setAttribute('list', 'std-desc-list');
        if (!line.description && (Number(line.debit) > 0 || Number(line.credit) > 0)) iDsc.classList.add('desc-required');
        iDsc.addEventListener('input', function() { line.description = this.value; this.classList.remove('desc-required'); });
        r4.appendChild(iDsc);
        var btnAddDesc = document.createElement('button');
        btnAddDesc.type = 'button'; btnAddDesc.className = 'desc-add-btn'; btnAddDesc.textContent = '＋';
        btnAddDesc.addEventListener('click', function() { addDescriptionToStandard(iDsc.value); });
        r4.appendChild(btnAddDesc);
        wrap.appendChild(r4);

        var aW = document.createElement('div');
        aW.className = 'ln-actions';
        var bU = document.createElement('button');
        bU.className = 'ln-btn'; bU.textContent = '↑';
        if (idx === 0) bU.disabled = true;
        bU.title = 'انتقال به بالا';
        bU.addEventListener('click', function() { moveLine(idx, -1); });
        var bD = document.createElement('button');
        bD.className = 'ln-btn'; bD.textContent = '↓';
        if (idx === voucherLines.length - 1) bD.disabled = true;
        bD.title = 'انتقال به پایین';
        bD.addEventListener('click', function() { moveLine(idx, 1); });
        var bCp = document.createElement('button');
        bCp.className = 'ln-btn ln-copy'; bCp.textContent = '📋 کپی'; bCp.title = 'کپی ردیف';
        bCp.addEventListener('click', function() { copyVoucherLine(idx); });
        var bSwap = document.createElement('button');
        bSwap.className = 'ln-btn ln-swap'; bSwap.textContent = '🔄 بدهکار/بستانکار'; bSwap.title = 'جابه‌جایی بدهکار و بستانکار';
        bSwap.addEventListener('click', function() {
            var tmpD = line.debit;
            line.debit = line.credit;
            line.credit = tmpD;
            renderVoucherLines();
            showToast('🔄 بدهکار/بستانکار جابه‌جا شد.');
        });
        var bMoveTo = document.createElement('button');
        bMoveTo.className = 'ln-btn ln-moveto'; bMoveTo.textContent = '📍 انتقال به ردیف';
        bMoveTo.title = 'انتقال به ردیف مشخص';
        bMoveTo.addEventListener('click', function() {
            var total = voucherLines.length;
            if (total < 2) { showToast('فقط یک ردیف موجود است.'); return; }
            var ans = prompt('این ردیف به کدام شماره ردیف منتقل شود؟ (۱ تا ' + toFa(total) + ')\nشماره فعلی: ' + toFa(idx + 1), String(idx + 1));
            if (!ans) return;
            var target = Number(normalizeDigits(ans));
            if (isNaN(target) || target < 1 || target > total) { alert('شماره نامعتبر.'); return; }
            target = target - 1;
            if (target === idx) return;
            var movedLine = voucherLines.splice(idx, 1)[0];
            voucherLines.splice(target, 0, movedLine);
            window._focusLineId = movedLine.id;
            renderVoucherLines();
            showToast('📍 ردیف به شماره ' + toFa(target + 1) + ' منتقل شد.');
        });
        var bClearDesc = document.createElement('button');
        bClearDesc.className = 'ln-btn ln-clear-desc'; bClearDesc.textContent = '🧹 پاک شرح';
        bClearDesc.title = 'خالی کردن شرح این قلم';
        bClearDesc.addEventListener('click', function() {
            line.description = '';
            iDsc.value = '';
            iDsc.classList.remove('desc-required');
            iDsc.focus();
        });
        var bX = document.createElement('button');
        bX.className = 'ln-btn ln-del'; bX.textContent = '× حذف ردیف';
        bX.title = 'حذف این ردیف';
        bX.addEventListener('click', function() {
            if (!confirm('این ردیف حذف شود؟')) return;
            voucherLines.splice(idx, 1);
            renderVoucherLines();
        });
        aW.appendChild(bU); aW.appendChild(bD); aW.appendChild(bCp); aW.appendChild(bSwap); aW.appendChild(bMoveTo); aW.appendChild(bClearDesc); aW.appendChild(bX);
        wrap.appendChild(aW);
        box.appendChild(wrap);
        attachDatePickers();
    })(i);

    updateVoucherTotals();
    if (window._focusLineId) {
        var tid = window._focusLineId;
        window._focusLineId = null;
        setTimeout(function() {
            var t = box.querySelector('[data-line-id="' + tid + '"]');
            if (t) {
                t.scrollIntoView({ behavior: 'smooth', block: 'center' });
                t.classList.add('focus-highlight');
                setTimeout(function() { t.classList.remove('focus-highlight'); }, 1200);
            }
        }, 60);
    }
}
function copyVoucherLine(idx) {
    var src = voucherLines[idx];
    if (!src) return;
    var copyLine = JSON.parse(JSON.stringify(src));
    copyLine.id = uid();
    voucherLines.splice(idx + 1, 0, copyLine);
    window._focusLineId = copyLine.id;
    renderVoucherLines();
    showToast('📋 ردیف کپی شد در پایین');
}
function moveLine(idx, dir) {
    var ni = idx + dir;
    if (ni < 0 || ni >= voucherLines.length) return;
    var tmp = voucherLines[idx];
    voucherLines[idx] = voucherLines[ni];
    voucherLines[ni] = tmp;
    window._focusLineId = voucherLines[ni].id;
    renderVoucherLines();
}
function updateVoucherTotals() {
    var td = 0, tc = 0;
    for (var i = 0; i < voucherLines.length; i++) {
        td += Number(voucherLines[i].debit) || 0;
        tc += Number(voucherLines[i].credit) || 0;
    }
    document.getElementById('v-total-debit').textContent = formatMoney(td);
    document.getElementById('v-total-credit').textContent = formatMoney(tc);
    var st = document.getElementById('v-balance-status');
    if (td === tc && td > 0) st.innerHTML = '<span class="ok">✓ متوازن</span>';
    else if (td > 0 || tc > 0) st.innerHTML = '<span class="err">اختلاف: ' + formatMoney(Math.abs(td - tc)) + '</span>';
    else st.textContent = '';
}

/* ==================== Voucher Issues Check ==================== */
function getVoucherIssues(v) {
    var issues = [];
    if (!v) return ['سند نامعتبر'];
    var accounts = DB.load('accounts', []);
    var lines = v.lines || [];
    if (!v.number) issues.push('شماره سند خالی است');
    if (!v.date) issues.push('تاریخ سند خالی است');
    if (!v.desc || !String(v.desc).trim()) issues.push('شرح سند خالی است');
    var valid = lines.filter(function(l) { return (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0; });
    if (valid.length < 2) issues.push('حداقل دو ردیف با مبلغ لازم است');
    var lineIssues = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var d = Number(line.debit) || 0;
        var c = Number(line.credit) || 0;
        if (d === 0 && c === 0) continue;
        var ln = toFa(i + 1);
        if (!line.account) { lineIssues.push('ردیف ' + ln + ': حساب معین تعیین نشده'); continue; }
        var acc = accounts.find(function(a) { return a.id === line.account; });
        if (!acc) { lineIssues.push('ردیف ' + ln + ': حساب معین نامعتبر'); continue; }
        if (acc.links && acc.links.length > 0) {
            for (var li = 0; li < acc.links.length; li++) {
                var lt = acc.links[li];
                var items = getLinkedItems(lt);
                if (items.length === 0) continue;
                if (!line.details || !line.details[lt]) {
                    lineIssues.push('ردیف ' + ln + ': تفصیلی ' + linkTypeName(lt) + ' تعیین نشده');
                }
            }
        }
        if (!line.description || !String(line.description).trim()) {
            lineIssues.push('ردیف ' + ln + ': شرح قلم خالی است');
        }
    }
    var td = 0, tc = 0;
    lines.forEach(function(l) { td += Number(l.debit) || 0; tc += Number(l.credit) || 0; });
    if (td !== tc) issues.push('سند متوازن نیست (اختلاف: ' + formatMoney(Math.abs(td - tc)) + ' ' + currencyLabel() + ')');
    return issues.concat(lineIssues);
}
function validateDateInActivePeriod(dateStr) {
    if (!dateStr) return { ok: false, msg: 'تاریخ خالی است' };
    var periods = DB.load('fiscalPeriods', []);
    if (!state.activePeriodId) return { ok: true };
    var ap = periods.find(function(p) { return p.id === state.activePeriodId; });
    if (!ap) return { ok: true };
    if (dateStr < ap.from || dateStr > ap.to) {
        return { ok: false, msg: 'تاریخ باید در بازه دوره فعال («' + ap.from + ' تا ' + ap.to + '») باشد' };
    }
    return { ok: true };
}

/* ==================== Voucher List ==================== */
function getVoucherAmount(v) {
    var t = 0;
    (v.lines || []).forEach(function(l) { t += Number(l.debit) || 0; });
    return t;
}
function findVoucherById(id) {
    var l = DB.load('vouchers', []);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
}
function renderVoucherList() {
    var filter = document.getElementById('vl-period-filter').value;
    var search = (document.getElementById('vlist-search').value || '').toLowerCase();
    var vouchers = DB.load('vouchers', []);
    if (filter) vouchers = vouchers.filter(function(v) { return v.periodId === filter; });
    var periods = DB.load('fiscalPeriods', []);
    var pM = {};
    periods.forEach(function(p) { pM[p.id] = p.title; });
    if (search) {
        vouchers = vouchers.filter(function(v) {
            var pN = pM[v.periodId] || '';
            var txt = (v.number + ' ' + v.date + ' ' + (v.desc || '') + ' ' + voucherTypeName(v.type) + ' ' + pN).toLowerCase();
            return txt.indexOf(search) !== -1;
        });
    }
    var st = sortState.vouchers;
    vouchers.sort(function(a, b) {
        var va, vb;
        if (st.col === 'periodName') { va = pM[a.periodId] || ''; vb = pM[b.periodId] || ''; }
        else if (st.col === 'status') { va = a.status === 'approved' ? 'ت' : 'پ'; vb = b.status === 'approved' ? 'ت' : 'پ'; }
        else if (st.col === 'type') { va = voucherTypeName(a.type); vb = voucherTypeName(b.type); }
        else if (st.col === 'amount') { va = getVoucherAmount(a); vb = getVoucherAmount(b); }
        else { va = a[st.col]; vb = b[st.col]; }
        var c = compareVals(va, vb);
        return st.dir === 'asc' ? c : -c;
    });
    var tb = document.getElementById('voucher-list-body');
    if (!tb) return;
    tb.innerHTML = '';
    var shown = 0;
    var hide = getHideState('voucher-list');
    for (var i = 0; i < vouchers.length; i++) {
        var v = vouchers[i]; shown++;
        var status = v.status || 'draft';
        var issues = getVoucherIssues(v);
        var badge;
        if (status === 'approved') badge = '<span class="badge badge-approved">✓ تأیید</span>';
        else if (issues.length > 0) badge = '<span class="badge badge-draft" title="ناقص">پیش‌نویس ⚠️</span>';
        else badge = '<span class="badge badge-draft">پیش‌نویس</span>';
        var tB = '<span class="badge badge-type">' + voucherTypeName(v.type) + '</span>';
        var pN = pM[v.periodId] || '—';
        var amt = getVoucherAmount(v);
        var tr = document.createElement('tr');
        if (status === 'approved') tr.classList.add('approved-row');
        var aH = '<div class="row-actions"><button class="row-btn open" data-id="' + v.id + '" data-action="preview">👁</button>';
        if (status === 'draft') {
            aH += '<button class="row-btn edit" data-id="' + v.id + '" data-action="edit">✎</button><button class="row-btn approve" data-id="' + v.id + '" data-action="approve">✓</button><button class="row-btn del" data-id="' + v.id + '" data-action="delete">×</button>';
        } else {
            aH += '<button class="row-btn unapprove" data-id="' + v.id + '" data-action="unapprove">↩</button>';
        }
        aH += '</div>';
        tr.innerHTML = '<td dir="ltr">' + toFa(esc(v.number)) + '</td><td dir="ltr">' + toFa(esc(v.date)) + '</td><td>' + tB + '</td><td>' + esc(pN) + '</td><td>' + esc(v.desc) + '</td><td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(amt)) + '</td><td>' + badge + '</td><td>' + aH + '</td>';
        tb.appendChild(tr);
    }
    if (shown === 0) tb.innerHTML = '<tr><td colspan="8" class="empty-row">سندی یافت نشد.</td></tr>';
    document.getElementById('vlist-count').textContent = toFa(shown);
    var allBtns = tb.querySelectorAll('.row-btn');
    for (var b = 0; b < allBtns.length; b++) allBtns[b].addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var action = this.getAttribute('data-action');
        var v = findVoucherById(id);
        if (!v) return;
        if (action === 'preview') { openVoucherPreview(v); return; }
        if (action === 'edit') { loadVoucherForEdit(v); return; }
        if (action === 'approve') {
            var issues = getVoucherIssues(v);
            if (issues.length > 0) { alert('⚠️ سند قابل تأیید نیست:\n\n• ' + issues.join('\n• ')); return; }
            var l = DB.load('vouchers', []);
            for (var x = 0; x < l.length; x++) if (l[x].id === id) l[x].status = 'approved';
            DB.save('vouchers', l);
            renderVoucherList();
            showToast('✅ سند تأیید شد.');
            return;
        }
        if (action === 'unapprove') {
            if (!confirm('برگشت؟')) return;
            var l2 = DB.load('vouchers', []);
            for (var y = 0; y < l2.length; y++) if (l2[y].id === id) l2[y].status = 'draft';
            DB.save('vouchers', l2);
            renderVoucherList();
            return;
        }
        if (action === 'delete') {
            if (!confirm('حذف شود؟')) return;
            var l3 = DB.load('vouchers', []);
            l3 = l3.filter(function(x) { return x.id !== id; });
            DB.save('vouchers', l3);
            renderVoucherList();
            updateHomeWidgets();
            return;
        }
    });
    applyColVisibility('voucher-table-list');
}
function setupSorting() {
    var ths = document.querySelectorAll('#voucher-table-list th[data-sort]');
    for (var i = 0; i < ths.length; i++) ths[i].addEventListener('click', function() {
        var col = this.getAttribute('data-sort');
        if (sortState.vouchers.col === col) sortState.vouchers.dir = sortState.vouchers.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.vouchers.col = col; sortState.vouchers.dir = 'asc'; }
        renderVoucherList();
    });
}
function loadVoucherForEdit(v) {
    document.getElementById('v-id').value = v.id;
    document.getElementById('v-number').value = v.number;
    document.getElementById('v-date').value = v.date;
    document.getElementById('v-type').value = v.type || 'general';
    document.getElementById('v-desc').value = v.desc || '';
    currentVoucherStatus = v.status || 'draft';
    voucherLines = JSON.parse(JSON.stringify(v.lines));
    renderVoucherLines();
    goToPage('voucher-new');
}
function newVoucherForm() {
    document.getElementById('v-id').value = '';
    document.getElementById('v-number').value = getNextVoucherNumberForPeriod(state.activePeriodId || '');
    document.getElementById('v-date').value = todayJalaliStr();
    document.getElementById('v-type').value = 'general';
    document.getElementById('v-desc').value = '';
    currentVoucherStatus = 'draft';
    voucherLines = [{ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' }];
    renderVoucherLines();
}
function getNextVoucherNumberForPeriod(periodId) {
    var vouchers = DB.load('vouchers', []);
    var pid = periodId || '';
    var filtered = vouchers.filter(function(v) { return (v.periodId || '') === pid; });
    var maxN = 0;
    filtered.forEach(function(v) {
        var n = parseInt(normalizeDigits(String(v.number || '0')).replace(/\D/g, '')) || 0;
        if (n > maxN) maxN = n;
    });
    return String(maxN + 1);
}
function persistVoucher(approve) {
    if (currentVoucherStatus === 'approved' && !approve) {
        alert('سند تأیید شده قابل ذخیره به‌عنوان پیش‌نویس نیست.');
        return;
    }
    var num = normalizeDigits(document.getElementById('v-number').value.trim());
    var d = normalizeDigits(document.getElementById('v-date').value.trim());
    var ty = document.getElementById('v-type').value;
    var ds = document.getElementById('v-desc').value.trim();
    var pid = state.activePeriodId || '';
    if (!num || !d) { alert('شماره و تاریخ اجباری.'); return; }
    var dv = validateDateInActivePeriod(d);
    if (!dv.ok) { alert('⚠️ ' + dv.msg); return; }
    if (!ds) { alert('⚠️ شرح سند اجباری.'); return; }
    var valid = voucherLines.filter(function(l) {
        return (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0;
    });
    if (valid.length < 2) { alert('حداقل دو ردیف با مبلغ.'); return; }
    var id = document.getElementById('v-id').value;
    var status = approve ? 'approved' : 'draft';
    if (!id) num = getNextVoucherNumberForPeriod(pid);
    var vch = { id: id || uid(), number: num, date: d, type: ty, periodId: pid, desc: ds, lines: valid, status: status };
    if (approve) {
        var issues = getVoucherIssues(vch);
        if (issues.length > 0) { alert('⚠️ سند قابل تأیید نیست:\n\n• ' + issues.join('\n• ')); return; }
    }
    var l = DB.load('vouchers', []);
    if (id) { for (var kk = 0; kk < l.length; kk++) if (l[kk].id === id) l[kk] = vch; }
    else l.push(vch);
    DB.save('vouchers', l);
    if (approve) {
        showToast('✅ سند تأیید شد.');
        goToPage('voucher-list');
    } else {
        showToast('✅ پیش‌نویس ذخیره شد.');
        newVoucherForm();
    }
    updateHomeWidgets();
}

/* ==================== Voucher Preview ==================== */
function openVoucherPreview(v) {
    var body = document.getElementById('vpreview-body');
    if (!body) return;
    var accounts = DB.load('accounts', []);
    var periods = DB.load('fiscalPeriods', []);
    var period = periods.find(function(p) { return p.id === v.periodId; });
    var status = v.status === 'approved' ? '<span class="badge badge-approved">✓ تأیید</span>' : '<span class="badge badge-draft">پیش‌نویس</span>';
    var html = '<div class="vp-header"><div class="vp-grid">';
    html += '<div><span class="lbl">شماره:</span> <b>' + toFa(esc(v.number)) + '</b></div><div><span class="lbl">تاریخ:</span> <b dir="ltr">' + toFa(esc(v.date)) + '</b></div>';
    html += '<div><span class="lbl">نوع:</span> ' + voucherTypeName(v.type) + '</div><div><span class="lbl">دوره:</span> ' + esc(period ? period.title : '—') + '</div>';
    html += '<div class="full"><span class="lbl">شرح:</span> <b>' + esc(v.desc || '') + '</b></div>';
    html += '<div><span class="lbl">وضعیت:</span> ' + status + '</div></div></div>';
    html += '<div class="table-wrap"><table class="report-table"><thead><tr><th>#</th><th>معین</th><th>تفصیلی</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>';
    var td = 0, tc = 0;
    var lines = v.lines || [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var accLabel = line.account ? getAccountLabel(line.account, accounts) : '—';
        var dt = '';
        if (line.details) Object.keys(line.details).forEach(function(lt) {
            var did = line.details[lt];
            if (did) {
                if (dt) dt += ' ، ';
                dt += linkTypeName(lt) + ': ' + getDetailLabel(lt, did);
            }
        });
        var d = Number(line.debit) || 0, c = Number(line.credit) || 0;
        td += d; tc += c;
        html += '<tr><td>' + toFa(i + 1) + '</td><td>' + esc(accLabel) + '</td><td>' + (dt ? esc(dt) : '—') + '</td><td>' + esc(line.description || '') + '</td><td class="num dr">' + (d ? formatMoney(d) : '—') + '</td><td class="num cr">' + (c ? formatMoney(c) : '—') + '</td></tr>';
    }
    html += '</tbody><tfoot><tr><td colspan="4" style="text-align:left">جمع</td><td class="num dr">' + formatMoney(td) + '</td><td class="num cr">' + formatMoney(tc) + '</td></tr></tfoot></table></div>';
    if (td === tc && td > 0) html += '<div class="vp-balance-ok">✓ متوازن</div>';
    else html += '<div class="vp-balance-err">⚠️ اختلاف: ' + formatMoney(Math.abs(td - tc)) + '</div>';
    body.innerHTML = html;
    document.getElementById('vpreview-modal').classList.add('show');
    document.getElementById('vpreview-overlay').classList.add('show');
    window._currentPreviewVoucher = v;
}
function closeVoucherPreview() {
    document.getElementById('vpreview-modal').classList.remove('show');
    document.getElementById('vpreview-overlay').classList.remove('show');
    window._currentPreviewVoucher = null;
}
function printVoucherPreview() {
    var v = window._currentPreviewVoucher;
    if (!v) return;
    var body = document.getElementById('vpreview-body');
    var win = window.open('', '_blank');
    if (!win) return;
    var ff = getPrintFontFamily();
    win.document.write('<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><title>سند ' + esc(v.number) + '</title><style>');
    win.document.write('body { font-family:' + ff + '; direction:rtl; color:#222; font-size:12px; } h1 { text-align:center; font-size:15px; } table { width:100%; border-collapse:collapse; font-size:10px; } th, td { border:1px solid #999; padding:5px 7px; } th { background:#e6f0fa; } .dr { color:#c0392b; } .cr { color:#1e9e6a; }');
    win.document.write('</style></head><body><h1>سند شماره ' + toFa(esc(v.number)) + '</h1>' + body.innerHTML + '</body></html>');
    win.document.close();
    setTimeout(function() { win.focus(); win.print(); }, 400);
}

/* ==================== Templates Apply / Save ==================== */
function applyTemplate(tplId) {
    var list = DB.load('voucherTemplates', []);
    var t = list.find(function(x) { return x.id === tplId; });
    if (!t) return;
    voucherLines = [];
    for (var i = 0; i < (t.lines || []).length; i++) {
        var tl = t.lines[i];
        var accId = tl.account || findAccountByNameHint(tl.nameHint) || '';
        var amt = Number(tl.fixedAmount) || 0;
        voucherLines.push({
            id: uid(),
            account: accId,
            details: tl.details ? JSON.parse(JSON.stringify(tl.details)) : {},
            debit: (tl.side === 'debit') ? amt : 0,
            credit: (tl.side === 'credit') ? amt : 0,
            description: tl.desc || ''
        });
    }
    if (voucherLines.length === 0) voucherLines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
    if (t.desc && !document.getElementById('v-desc').value.trim()) document.getElementById('v-desc').value = t.desc;
    renderVoucherLines();
    showToast('✅ الگو اعمال شد.');
}
function saveVoucherAsTemplate() {
    var valid = voucherLines.filter(function(l) { return l.account; });
    if (valid.length === 0) { alert('ابتدا حساب انتخاب کن.'); return; }
    var name = prompt('نام الگو:');
    if (!name) return;
    name = name.trim();
    if (!name) return;
    var tplDesc = document.getElementById('v-desc').value.trim();
    var tpl = {
        id: uid(),
        name: name,
        desc: tplDesc,
        lines: valid.map(function(l) {
            var amt = Number(l.debit) > 0 ? Number(l.debit) : Number(l.credit);
            return {
                account: l.account,
                details: l.details || {},
                desc: l.description || '',
                side: (Number(l.debit) > 0 ? 'debit' : 'credit'),
                fixedAmount: amt || 0
            };
        })
    };
    var list = DB.load('voucherTemplates', []);
    list.push(tpl);
    DB.save('voucherTemplates', list);
    refreshTemplateSelect();
    renderTemplateList();
    showToast('✅ ذخیره شد.');
}

/* ==================== Estimate (برآورد هزینه روزانه) ==================== */
var estimateItems = [];
function refreshEstPeriodSelect() {
    var sel = document.getElementById('est-period');
    if (!sel) return;
    var list = DB.load('fiscalPeriods', []);
    var v = sel.value;
    sel.innerHTML = '<option value="">— انتخاب دوره —</option>';
    list.forEach(function(p) {
        var o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.title + ' (' + p.from + ' - ' + p.to + ')';
        sel.appendChild(o);
    });
    sel.value = v || state.activePeriodId || '';
}
function renderEstimateItems() {
    var box = document.getElementById('est-items');
    if (!box) return;
    box.innerHTML = '';
    if (estimateItems.length === 0) estimateItems.push({ id: uid(), date: '', amount: 0 });
    for (var i = 0; i < estimateItems.length; i++) {
        (function(idx) {
            var it = estimateItems[idx];
            var row = document.createElement('div');
            row.className = 'est-item-row';
            var n = document.createElement('span');
            n.textContent = '#' + toFa(idx + 1);
            n.style.fontWeight = 'bold';
            var iD = document.createElement('input');
            iD.type = 'text'; iD.className = 'date-picker'; iD.placeholder = 'تاریخ';
            iD.value = it.date || '';
            iD.addEventListener('input', function() { it.date = normalizeDigits(this.value); });
            var iA = document.createElement('input');
            iA.type = 'text'; iA.inputMode = 'numeric'; iA.dir = 'ltr'; iA.placeholder = 'مبلغ';
            iA.value = it.amount ? formatRaw(it.amount) : '';
            iA.addEventListener('input', function() {
                var v = normalizeDigits(this.value);
                var r = v.replace(/[^\d]/g, '');
                this.value = r;
                it.amount = Number(r) || 0;
            });
            iA.addEventListener('blur', function() {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
                it.amount = v;
            });
            var del = document.createElement('button');
            del.className = 'row-btn del'; del.textContent = '×';
            del.addEventListener('click', function() {
                if (!confirm('حذف شود؟')) return;
                estimateItems.splice(idx, 1);
                renderEstimateItems();
            });
            row.appendChild(n); row.appendChild(iD); row.appendChild(iA); row.appendChild(del);
            box.appendChild(row);
            attachDatePickers();
        })(i);
    }
}
function autoGenerateEstimate() {
    var fromD = normalizeDigits(document.getElementById('est-from').value.trim());
    var toD = normalizeDigits(document.getElementById('est-to').value.trim());
    var total = parseMoney(normalizeDigits(document.getElementById('est-total').value));
    if (!fromD || !toD) { alert('از و تا تاریخ را وارد کنید.'); return; }
    if (!total) { alert('مبلغ تخمینی کل را وارد کنید.'); return; }
    if (fromD > toD) { alert('شروع باید قبل از پایان باشد.'); return; }
    var mode = prompt('نحوه تولید:\n1 - روزانه\n2 - هفتگی\n3 - ماهانه', '1');
    if (!mode) return;
    mode = mode.trim();
    var p1 = fromD.split('/').map(Number);
    var p2 = toD.split('/').map(Number);
    var items = [];
    if (mode === '1') {
        var days = jalaliDiff(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]) + 1;
        if (days <= 0) { alert('بازه نامعتبر.'); return; }
        var each = Math.floor(total / days);
        var rem = total - each * days;
        for (var d = 0; d < days; d++) {
            var date = addJalaliDays(fromD, d);
            var amt = each + (d === days - 1 ? rem : 0);
            items.push({ id: uid(), date: date, amount: amt });
        }
    } else if (mode === '2') {
        var weeks = Math.ceil((jalaliDiff(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]) + 1) / 7);
        if (weeks <= 0) { alert('بازه نامعتبر.'); return; }
        var eachW = Math.floor(total / weeks);
        var remW = total - eachW * weeks;
        for (var w = 0; w < weeks; w++) {
            var dateW = addJalaliDays(fromD, w * 7);
            if (dateW > toD) break;
            var amtW = eachW + (w === weeks - 1 ? remW : 0);
            items.push({ id: uid(), date: dateW, amount: amtW });
        }
    } else if (mode === '3') {
        var y1 = p1[0], m1 = p1[1], y2 = p2[0], m2 = p2[1];
        var months = (y2 - y1) * 12 + (m2 - m1) + 1;
        if (months <= 0) { alert('بازه نامعتبر.'); return; }
        var eachM = Math.floor(total / months);
        var remM = total - eachM * months;
        for (var mi = 0; mi < months; mi++) {
            var cy = y1, cm = m1 + mi;
            while (cm > 12) { cm -= 12; cy++; }
            var dateM = cy + '/' + pad2(cm) + '/01';
            if (dateM > toD) break;
            var amtM = eachM + (mi === months - 1 ? remM : 0);
            items.push({ id: uid(), date: dateM, amount: amtM });
        }
    } else { alert('گزینه نامعتبر.'); return; }
    estimateItems = items;
    renderEstimateItems();
    showToast('✅ ' + toFa(items.length) + ' آیتم تولید شد.');
}
function renderEstimateList() {
    var list = DB.load('dailyEstimates', []);
    var filter = (document.getElementById('est-filter').value || '').toLowerCase();
    var box = document.getElementById('est-list-body');
    if (!box) return;
    box.innerHTML = '';
    var periods = DB.load('fiscalPeriods', []);
    var pMap = {};
    periods.forEach(function(p) { pMap[p.id] = p.title; });
    var shown = 0;
    list.sort(function(a, b) { return compareVals(b.from, a.from); });
    list.forEach(function(est) {
        var txt = ((est.title||'') + ' ' + (est.desc||'') + ' ' + (pMap[est.periodId]||'') + ' ' + (est.from||'') + ' ' + (est.to||'')).toLowerCase();
        if (filter && txt.indexOf(filter) === -1) return;
        shown++;
        var items = est.items || [];
        var total = items.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px"><div><strong style="font-size:1rem">' + esc(est.title || est.desc || 'بدون عنوان') + '</strong>' + (est.desc && est.title ? '<div class="muted" style="font-size:0.78rem">' + esc(est.desc) + '</div>' : '') + '</div><div class="row-actions"><button class="row-btn open" data-id="' + est.id + '" data-action="edit">✎</button><button class="row-btn del" data-id="' + est.id + '" data-action="delete">×</button></div></div>' +
            '<div class="facility-summary"><div class="item"><div class="lbl">دوره مالی</div><div class="val">' + esc(pMap[est.periodId] || '—') + '</div></div><div class="item"><div class="lbl">از تاریخ</div><div class="val" dir="ltr">' + toFa(esc(est.from || '—')) + '</div></div><div class="item"><div class="lbl">تا تاریخ</div><div class="val" dir="ltr">' + toFa(esc(est.to || '—')) + '</div></div><div class="item"><div class="lbl">مبلغ تخمینی</div><div class="val">' + fmtFor(est.total || 0, 'est-list') + '</div></div><div class="item"><div class="lbl">جمع آیتم‌ها</div><div class="val" style="color:var(--accent)">' + fmtFor(total, 'est-list') + '</div></div><div class="item"><div class="lbl">تعداد</div><div class="val">' + toFa(items.length) + '</div></div></div>';
        box.appendChild(card);
    });
    if (shown === 0) box.innerHTML = '<div class="card"><p class="muted" style="text-align:center">موردی ثبت نشده.</p></div>';
    document.getElementById('est-count').textContent = toFa(shown);
    var btns = box.querySelectorAll('[data-action]');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var action = this.getAttribute('data-action');
        var est = DB.load('dailyEstimates', []).find(function(x) { return x.id === id; });
        if (!est) return;
        if (action === 'edit') {
            document.getElementById('est-id').value = est.id;
            document.getElementById('est-title').value = est.title || '';
            document.getElementById('est-period').value = est.periodId || '';
            document.getElementById('est-from').value = est.from || '';
            document.getElementById('est-to').value = est.to || '';
            document.getElementById('est-total').value = est.total ? formatRaw(est.total) : '';
            document.getElementById('est-desc').value = est.desc || '';
            estimateItems = JSON.parse(JSON.stringify(est.items || []));
            renderEstimateItems();
            document.querySelector('[data-tab="est-add"]').click();
        } else if (action === 'delete') {
            if (!confirm('حذف شود؟')) return;
            var l = DB.load('dailyEstimates', []).filter(function(x) { return x.id !== id; });
            DB.save('dailyEstimates', l);
            renderEstimateList();
        }
    });
}
function clearEstForm() {
    ['est-id','est-title','est-period','est-from','est-to','est-total','est-desc'].forEach(function(x) { document.getElementById(x).value = ''; });
    estimateItems = [];
    renderEstimateItems();
}
function saveEstimate() {
    var id = document.getElementById('est-id').value;
    var title = document.getElementById('est-title').value.trim();
    var periodId = document.getElementById('est-period').value;
    var from = normalizeDigits(document.getElementById('est-from').value.trim());
    var to = normalizeDigits(document.getElementById('est-to').value.trim());
    var total = parseMoney(normalizeDigits(document.getElementById('est-total').value));
    var desc = document.getElementById('est-desc').value.trim();
    if (!title) { alert('عنوان برآورد اجباری است.'); return; }
    if (!from || !to) { alert('از و تا تاریخ اجباری است.'); return; }
    if (!total) { alert('مبلغ تخمینی اجباری است.'); return; }
    var o = {
        id: id || uid(),
        title: title,
        periodId: periodId,
        from: from,
        to: to,
        total: total,
        desc: desc,
        items: estimateItems.map(function(it) { return { id: it.id, date: it.date, amount: Number(it.amount) || 0 }; })
    };
    var l = DB.load('dailyEstimates', []);
    if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; }
    else l.push(o);
    DB.save('dailyEstimates', l);
    showToast('✅ ذخیره شد');
    clearEstForm();
    renderEstimateList();
    document.querySelector('[data-tab="est-list"]').click();
}

/* ==================== Cashflow Sources ==================== */
function refreshCfsMoeinSelect() {
    var sel = document.getElementById('cfs-moein');
    if (!sel) return;
    var v = sel.value;
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
    sel.innerHTML = '<option value="">— ابتدا معین را انتخاب کنید —</option>';
    leaves.forEach(function(a) {
        var o = document.createElement('option');
        o.value = a.id;
        o.textContent = getAccountLabel(a.id, accounts);
        sel.appendChild(o);
    });
    sel.value = v;
}
function onCfsMoeinChange() {
    var moeinId = document.getElementById('cfs-moein').value;
    var wrap = document.getElementById('cfs-details-wrap');
    wrap.innerHTML = '';
    if (!moeinId) return;
    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === moeinId; });
    if (!acc || !acc.links || acc.links.length === 0) return;
    var prev = DB.load('cfs.tmp.details', {});
    var html = '';
    for (var i = 0; i < acc.links.length; i++) {
        var lt = acc.links[i];
        var items = getLinkedItems(lt);
        if (items.length === 0) continue;
        var selId = 'cfs-detail-' + lt;
        html += '<div class="field"><label>عنوان سطح ۴ منبع (' + linkTypeName(lt) + ') *</label><select id="' + selId + '"><option value="">— انتخاب کنید —</option>';
        for (var k = 0; k < items.length; k++) {
            var it = items[k];
            html += '<option value="' + it.id + '"' + (prev[lt] === it.id ? ' selected' : '') + '>' + esc(getLinkedItemLabel(lt, it)) + '</option>';
        }
        html += '</select></div>';
    }
    wrap.innerHTML = html;
}
function renderCfsList() {
    var list = DB.load('cashFlowSources', []);
    var filter = (document.getElementById('cfs-filter').value || '').toLowerCase();
    var tb = document.getElementById('cfs-list-body');
    if (!tb) return;
    tb.innerHTML = '';
    var shown = 0;
    var accounts = DB.load('accounts', []);
    var rows = list.map(function(s) {
        var moeinLabel = getAccountLabel(s.moeinId, accounts);
        var detailLabel = s.linkType && s.detailId ? getDetailLabel(s.linkType, s.detailId) : '—';
        return { s: s, moein: moeinLabel, detail: detailLabel };
    }).filter(function(r) {
        var txt = (r.moein + ' ' + r.detail + ' ' + (r.s.notes || '')).toLowerCase();
        return !filter || txt.indexOf(filter) !== -1;
    });
    rows = applyTableSort('cfs-table', rows, function(r, k) {
        if (k === 'moein') return r.moein;
        if (k === 'detail') return r.detail;
        if (k === 'expectedDate') return r.s.expectedDate || '';
        if (k === 'amount') return Number(r.s.amount) || 0;
        if (k === 'notes') return r.s.notes || '';
        return '';
    });
    rows.forEach(function(r) {
        shown++;
        var s = r.s;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + esc(r.moein) + '</td><td>' + esc(r.detail) + (s.linkType ? ' <span class="muted" style="font-size:0.7rem">(' + linkTypeName(s.linkType) + ')</span>' : '') + '</td><td dir="ltr">' + toFa(esc(s.expectedDate || '—')) + '</td><td class="num" style="font-weight:bold;color:#1e9e6a">' + fmtFor(s.amount || 0, 'cfs-list') + ' ' + currencyLabel() + '</td><td>' + esc(s.notes || '—') + '</td><td><div class="row-actions"><button class="row-btn edit" data-id="' + s.id + '">✎</button><button class="row-btn del" data-id="' + s.id + '">×</button></div></td>';
        tb.appendChild(tr);
    });
    if (shown === 0) tb.innerHTML = '<tr><td colspan="6" class="empty-row">موردی ثبت نشده.</td></tr>';
    document.getElementById('cfs-count').textContent = toFa(shown);
    attachRowActions(tb, 'cashFlowSources', renderCfsList, function(s) {
        document.getElementById('cfs-id').value = s.id;
        document.getElementById('cfs-moein').value = s.moeinId || '';
        onCfsMoeinChange();
        if (s.linkType && s.detailId) {
            var sel = document.getElementById('cfs-detail-' + s.linkType);
            if (sel) sel.value = s.detailId;
        }
        document.getElementById('cfs-date').value = s.expectedDate || '';
        document.getElementById('cfs-amount').value = s.amount ? formatRaw(s.amount) : '';
        document.getElementById('cfs-notes').value = s.notes || '';
        document.querySelector('[data-tab="cfs-add"]').click();
    });
    applyColVisibility('cfs-table');
    makeTableResizable(document.getElementById('cfs-table'));
    attachTableSorting('cfs-table', renderCfsList);
    applySortIndicator('cfs-table');
}
function clearCfsForm() {
    ['cfs-id','cfs-moein','cfs-date','cfs-amount','cfs-notes'].forEach(function(x) { document.getElementById(x).value = ''; });
    document.getElementById('cfs-details-wrap').innerHTML = '';
    DB.save('cfs.tmp.details', {});
}
function saveCfsSource() {
    var id = document.getElementById('cfs-id').value;
    var moeinId = document.getElementById('cfs-moein').value;
    if (!moeinId) { alert('معین منبع اجباری است.'); return; }
    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function(a) { return a.id === moeinId; });
    if (!acc) { alert('معین نامعتبر.'); return; }
    var linkType = '', detailId = '';
    if (acc.links && acc.links.length > 0) {
        for (var i = 0; i < acc.links.length; i++) {
            var lt = acc.links[i];
            var sel = document.getElementById('cfs-detail-' + lt);
            if (!sel) continue;
            var items = getLinkedItems(lt);
            if (items.length === 0) continue;
            if (!sel.value) { alert('سطح ۴ (' + linkTypeName(lt) + ') اجباری است.'); return; }
            linkType = lt;
            detailId = sel.value;
            break;
        }
    }
    var expectedDate = normalizeDigits(document.getElementById('cfs-date').value.trim());
    var amount = parseMoney(normalizeDigits(document.getElementById('cfs-amount').value));
    if (!amount) { alert('مبلغ اجباری است.'); return; }
    var notes = document.getElementById('cfs-notes').value.trim();
    var o = { id: id || uid(), moeinId: moeinId, linkType: linkType, detailId: detailId, expectedDate: expectedDate, amount: amount, notes: notes };
    var list = DB.load('cashFlowSources', []);
    if (id) { for (var k = 0; k < list.length; k++) if (list[k].id === id) list[k] = o; }
    else list.push(o);
    DB.save('cashFlowSources', list);
    showToast('✅ ذخیره شد');
    clearCfsForm();
    renderCfsList();
    document.querySelector('[data-tab="cfs-list"]').click();
}
function getSourceLabel(s) {
    var accounts = DB.load('accounts', []);
    var moeinLabel = getAccountLabel(s.moeinId, accounts);
    var detailLabel = '';
    if (s.linkType && s.detailId) detailLabel = getDetailLabel(s.linkType, s.detailId);
    return moeinLabel + (detailLabel ? ' — ' + detailLabel : '');
}

/* ==================== Facilities ==================== */
var currentFacilityId = null;
var currentInstallments = [];
function refreshFacBankSelect() {
    var sel = document.getElementById('fc-bank');
    if (!sel) return;
    var b = DB.load('bankAccounts', []);
    sel.innerHTML = '<option value="">— بانک —</option>';
    for (var i = 0; i < b.length; i++) {
        var o = document.createElement('option');
        o.value = b[i].id;
        o.textContent = (b[i].bank || '') + (b[i].account ? ' - ' + b[i].account : '');
        sel.appendChild(o);
    }
}
function refreshRffBankSelect() {
    var sel = document.getElementById('rff-bank');
    if (!sel) return;
    var b = DB.load('bankAccounts', []);
    var v = sel.value;
    sel.innerHTML = '<option value="">همه</option>';
    for (var i = 0; i < b.length; i++) {
        var o = document.createElement('option');
        o.value = b[i].id;
        o.textContent = (b[i].bank || '') + (b[i].account ? ' - ' + b[i].account : '');
        sel.appendChild(o);
    }
    sel.value = v;
}
function renderFacilitiesList() {
    var list = DB.load('facilities', []);
    var filter = (document.getElementById('fac-filter').value || '').toLowerCase();
    var cf = document.getElementById('fac-cat-filter').value;
    var box = document.getElementById('fac-list-body');
    if (!box) return;
    box.innerHTML = '';
    var hide = getHideState('fac-list');
    var filtered = list.filter(function(f) {
        if (cf && (f.category || 'facility') !== cf) return false;
        if (filter) {
            var txt = ((f.name || '') + ' ' + categoryName(f.category) + ' ' + (f.date || '')).toLowerCase();
            if (txt.indexOf(filter) === -1) return false;
        }
        return true;
    });
    var shown = 0;
    for (var i = 0; i < filtered.length; i++) {
        var f = filtered[i]; shown++;
        var bank = DB.load('bankAccounts', []).find(function(b) { return b.id === f.bankId; });
        var paid = Number(f.paid || 0), initial = Number(f.initial || 0);
        var rem = initial - paid;
        var set = rem <= 0 && initial > 0;
        var sB = set ? '<span class="badge badge-settled">✓ تسویه</span>' : '<span class="badge badge-active">در جریان</span>';
        var cB = (f.category === 'scheduled') ? '<span class="badge badge-cat-sch">زمانبندی</span>' : '<span class="badge badge-cat-fac">تسهیلات</span>';
        var card = document.createElement('div');
        card.className = 'card facility-card' + (f.category === 'scheduled' ? ' cat-sch' : '');
        card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:10px"><div><strong style="font-size:1rem">' + esc(f.name) + '</strong> ' + sB + ' ' + cB + '</div><div class="row-actions"><button class="row-btn open" data-id="' + f.id + '">📖 اقساط</button><button class="row-btn edit" data-id="' + f.id + '">✎</button><button class="row-btn del" data-id="' + f.id + '"' + (set ? ' disabled' : '') + '>×</button></div></div>' +
            '<div class="facility-summary"><div class="item"><div class="lbl">بانک</div><div class="val">' + esc(bank ? bank.bank : '—') + '</div></div><div class="item"><div class="lbl">تاریخ</div><div class="val" dir="ltr">' + toFa(esc(f.date)) + '</div></div><div class="item"><div class="lbl">مبلغ اولیه</div><div class="val">' + (hide ? '—' : formatMoney(initial)) + '</div></div><div class="item"><div class="lbl">پرداخت</div><div class="val" style="color:var(--accent)">' + (hide ? '—' : formatMoney(paid)) + '</div></div><div class="item"><div class="lbl">باقی</div><div class="val" style="color:' + (rem > 0 ? 'var(--danger)' : 'var(--accent)') + '">' + (hide ? '—' : formatMoney(rem)) + '</div></div><div class="item"><div class="lbl">تعداد</div><div class="val">' + toFa((f.installments || []).length) + '</div></div></div>';
        box.appendChild(card);
    }
    if (shown === 0) box.innerHTML = '<div class="card"><p class="muted" style="text-align:center">موردی نیست.</p></div>';
    document.getElementById('fac-count').textContent = toFa(shown);
    var o = box.querySelectorAll('.row-btn.open'), e = box.querySelectorAll('.row-btn.edit'), d = box.querySelectorAll('.row-btn.del');
    for (var oi = 0; oi < o.length; oi++) o[oi].addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var f = DB.load('facilities', []).find(function(x) { return x.id === id; });
        if (f) loadFacilityForInstallments(f);
    });
    for (var ei = 0; ei < e.length; ei++) e[ei].addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var f = DB.load('facilities', []).find(function(x) { return x.id === id; });
        if (f) loadFacilityIntoForm(f);
    });
    for (var di = 0; di < d.length; di++) d[di].addEventListener('click', function() {
        if (this.disabled) return;
        var id = this.getAttribute('data-id');
        var f = DB.load('facilities', []).find(function(x) { return x.id === id; });
        if (f) tryDeleteFacility(f);
    });
}
function tryDeleteFacility(f) {
    var ins = f.installments || [];
    var pi = ins.filter(function(x) { return x.status === 'paid'; });
    if (pi.length > 0) { alert('دارای ' + toFa(pi.length) + ' قسط پرداخت‌شده.'); return; }
    if (ins.length > 0) { alert('ابتدا اقساط را حذف کن.'); return; }
    if (!confirm('حذف شود؟')) return;
    var l = DB.load('facilities', []);
    l = l.filter(function(x) { return x.id !== f.id; });
    DB.save('facilities', l);
    renderFacilitiesList();
}
function loadFacilityIntoForm(f) {
    document.getElementById('fc-id').value = f.id;
    document.getElementById('fc-name').value = f.name || '';
    document.getElementById('fc-category').value = f.category || 'facility';
    document.getElementById('fc-bank').value = f.bankId || '';
    document.getElementById('fc-date').value = f.date || '';
    document.getElementById('fc-initial').value = f.initial ? formatRaw(f.initial) : '';
    document.getElementById('fc-paid').value = f.paid ? formatRaw(f.paid) : '';
    document.getElementById('fac-installments-card').style.display = 'none';
    document.querySelector('[data-tab="fac-add"]').click();
}
function loadFacilityForInstallments(f) {
    currentFacilityId = f.id;
    currentInstallments = JSON.parse(JSON.stringify(f.installments || []));
    document.getElementById('fc-id').value = f.id;
    document.getElementById('fc-name').value = f.name || '';
    document.getElementById('fc-category').value = f.category || 'facility';
    document.getElementById('fc-bank').value = f.bankId || '';
    document.getElementById('fc-date').value = f.date || '';
    document.getElementById('fc-initial').value = f.initial ? formatRaw(f.initial) : '';
    document.getElementById('fc-paid').value = f.paid ? formatRaw(f.paid) : '';
    document.getElementById('fac-installments-card').style.display = 'block';
    renderInstallments();
    document.querySelector('[data-tab="fac-add"]').click();
    setTimeout(function() {
        document.getElementById('fac-installments-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
}
function renderInstallments() {
    var box = document.getElementById('fac-installments');
    if (!box) return;
    box.innerHTML = '';
    for (var i = 0; i < currentInstallments.length; i++) {
        (function(idx) {
            var ins = currentInstallments[idx];
            var row = document.createElement('div');
            row.className = 'installment-row';
            var n = document.createElement('span');
            n.textContent = '#' + toFa(idx + 1);
            var iD = document.createElement('input');
            iD.type = 'text'; iD.dir = 'ltr'; iD.className = 'date-picker'; iD.placeholder = 'تاریخ';
            iD.value = ins.date || '';
            iD.addEventListener('input', function() { ins.date = this.value; });
            var iA = document.createElement('input');
            iA.type = 'text'; iA.inputMode = 'numeric'; iA.dir = 'ltr'; iA.placeholder = 'مبلغ';
            iA.value = ins.amount ? formatRaw(ins.amount) : '';
            attachMoneyInput(iA, function(v) { ins.amount = v; renderInstallmentsTotals(); });
            var sS = document.createElement('select');
            sS.innerHTML = '<option value="registered">ثبت</option><option value="paid">پرداخت</option>';
            sS.value = ins.status || 'registered';
            sS.addEventListener('change', function() { ins.status = this.value; renderInstallmentsTotals(); });
            var a = document.createElement('div');
            var d = document.createElement('button');
            d.className = 'row-btn del'; d.textContent = '×';
            d.addEventListener('click', function() {
                if (!confirm('حذف شود؟')) return;
                currentInstallments.splice(idx, 1);
                renderInstallments();
            });
            a.appendChild(d);
            row.appendChild(n); row.appendChild(iD); row.appendChild(iA); row.appendChild(sS); row.appendChild(a);
            box.appendChild(row);
            attachDatePickers();
        })(i);
    }
    renderInstallmentsTotals();
}
function renderInstallmentsTotals() {
    var ti = 0, tp = 0;
    for (var i = 0; i < currentInstallments.length; i++) {
        ti += Number(currentInstallments[i].amount || 0);
        if (currentInstallments[i].status === 'paid') tp += Number(currentInstallments[i].amount || 0);
    }
    var init = parseMoney(normalizeDigits(document.getElementById('fc-initial').value));
    var rem = init - tp;
    document.getElementById('fac-total-inst').textContent = formatMoney(ti);
    document.getElementById('fac-total-paid').textContent = formatMoney(tp);
    document.getElementById('fac-total-remaining').textContent = formatMoney(rem);
    document.getElementById('fc-paid').value = formatRaw(tp);
    var s = document.getElementById('fac-summary');
    if (s) {
        s.innerHTML = '<div class="item"><div class="lbl">مبلغ اولیه</div><div class="val">' + formatMoney(init) + '</div></div><div class="item"><div class="lbl">جمع اقساط</div><div class="val">' + formatMoney(ti) + '</div></div><div class="item"><div class="lbl">پرداخت</div><div class="val" style="color:var(--accent)">' + formatMoney(tp) + '</div></div><div class="item"><div class="lbl">باقی</div><div class="val" style="color:' + (rem > 0 ? 'var(--danger)' : 'var(--accent)') + '">' + formatMoney(rem) + '</div></div>';
    }
}
function nextMonthDate(dateStr) {
    var p = (dateStr || todayJalaliStr()).split('/').map(Number);
    if (p.length !== 3) {
        var t = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        p = t;
    }
    var y = p[0], m = p[1] + 1, d = p[2];
    if (m > 12) { m = 1; y++; }
    var dim = daysInJalaliMonth(y, m);
    if (d > dim) d = dim;
    return y + '/' + pad2(m) + '/' + pad2(d);
}
function autoGenerateInstallments() {
    var init = parseMoney(normalizeDigits(document.getElementById('fc-initial').value));
    if (!init) { alert('مبلغ اولیه.'); return; }
    var dS = document.getElementById('fc-date').value || todayJalaliStr();
    var df = nextMonthDate(dS);
    var fD = prompt('تاریخ اولین قسط:', toFa(df));
    if (!fD) return;
    fD = normalizeDigits(fD.trim());
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(fD)) { alert('فرمت اشتباه.'); return; }
    var cs = prompt('تعداد اقساط:', '۱۲');
    if (!cs) return;
    var cnt = Number(normalizeDigits(cs));
    if (!cnt || cnt < 1) { alert('نامعتبر.'); return; }
    var each = Math.floor(init / cnt);
    var rem = init - each * cnt;
    currentInstallments = [];
    var p = fD.split('/').map(Number);
    var y = p[0], m = p[1], d = p[2];
    for (var i = 0; i < cnt; i++) {
        var cY = y, cM = m + i, cD = d;
        while (cM > 12) { cM -= 12; cY++; }
        var dim = daysInJalaliMonth(cY, cM);
        if (cD > dim) cD = dim;
        var amt = each + (i === cnt - 1 ? rem : 0);
        currentInstallments.push({ id: uid(), date: cY + '/' + pad2(cM) + '/' + pad2(cD), amount: amt, status: 'registered' });
    }
    renderInstallments();
}
function clearFacForm() {
    ['fc-id','fc-name','fc-date','fc-initial','fc-paid'].forEach(function(x) { document.getElementById(x).value = ''; });
    document.getElementById('fc-category').value = 'facility';
    document.getElementById('fc-bank').value = '';
    document.getElementById('fac-installments-card').style.display = 'none';
    currentFacilityId = null;
    currentInstallments = [];
}
