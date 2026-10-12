/* =====================================================================
   پارسیس v42 — 20-voucher-fix.js
   رفع قطعی نمایش نشدن اسناد در فهرست اسناد
   ✔ بازنویسی کامل renderVoucherList بدون flag یک‌بارمصرف
   ✔ تشخیص خودکار و رندر مجدد اگر جدول خالی ولی دیتابیس پر باشد
   ✔ لاگ تشخیصی در Console برای دیباگ
   ===================================================================== */
'use strict';

(function fixVoucherListDisplay() {
    console.log('🔧 [v42] نصب پچ فهرست اسناد...');

    function renderVoucherListV42() {
        var tb = document.getElementById('voucher-list-body');
        if (!tb) {
            console.warn('❌ [v42] voucher-list-body یافت نشد');
            return;
        }

        try {
            var allVouchers = DB.load('vouchers', []);
            console.log('📊 [v42] اسناد در دیتابیس:', allVouchers.length);

            if (!Array.isArray(allVouchers) || allVouchers.length === 0) {
                tb.innerHTML = '<tr><td colspan="8" class="empty-row">هیچ سندی ثبت نشده است. برای ثبت، از «✏️ صدور سند» استفاده کنید.</td></tr>';
                var cEl = document.getElementById('vlist-count');
                if (cEl) cEl.textContent = '۰';
                return;
            }

            // فیلترها
            var periodFilter = (document.getElementById('vl-period-filter') || {}).value || '';
            var searchVal = ((document.getElementById('vlist-search') || {}).value || '').toLowerCase();
            var statusFilter = (document.getElementById('vlist-status-filter') || {}).value || '';

            var vouchers = allVouchers.slice();
            if (periodFilter) vouchers = vouchers.filter(function(v) { return v.periodId === periodFilter; });
            if (statusFilter) vouchers = vouchers.filter(function(v) { return (v.status || 'draft') === statusFilter; });

            var periods = DB.load('fiscalPeriods', []);
            var pMap = {};
            periods.forEach(function(p) { pMap[p.id] = p.title; });

            if (searchVal) {
                vouchers = vouchers.filter(function(v) {
                    var pN = pMap[v.periodId] || '';
                    var txt = String(v.number || '') + ' ' + String(v.date || '') + ' ' + String(v.desc || '') + ' ' + voucherTypeName(v.type) + ' ' + pN;
                    return txt.toLowerCase().indexOf(searchVal) !== -1;
                });
            }

            // مرتب‌سازی
            var st = (typeof sortState !== 'undefined' && sortState.vouchers) ? sortState.vouchers : { col: 'number', dir: 'desc' };
            try {
                vouchers.sort(function(a, b) {
                    var va, vb;
                    if (st.col === 'periodName') { va = pMap[a.periodId] || ''; vb = pMap[b.periodId] || ''; }
                    else if (st.col === 'status') { va = a.status === 'approved' ? 'ت' : 'پ'; vb = b.status === 'approved' ? 'ت' : 'پ'; }
                    else if (st.col === 'type') { va = voucherTypeName(a.type); vb = voucherTypeName(b.type); }
                    else if (st.col === 'amount') { va = getVoucherAmount(a); vb = getVoucherAmount(b); }
                    else { va = a[st.col] || ''; vb = b[st.col] || ''; }
                    var c = compareVals(va, vb);
                    return st.dir === 'asc' ? c : -c;
                });
            } catch (e) { console.warn('⚠️ [v42] خطای مرتب‌سازی:', e); }

            // رسم
            tb.innerHTML = '';
            var hide = getHideState('voucher-list');
            var shown = 0;

            for (var i = 0; i < vouchers.length; i++) {
                var v = vouchers[i];
                var status = v.status || 'draft';
                var issues = [];
                try { issues = getVoucherIssues(v) || []; } catch (e) { issues = []; }

                var badge;
                if (status === 'approved') {
                    badge = '<span class="badge badge-approved">✓ تأیید</span>';
                } else if (issues.length > 0) {
                    badge = '<span class="badge badge-draft" title="ناقص">پیش‌نویس ⚠️</span>';
                } else {
                    badge = '<span class="badge badge-draft">پیش‌نویس</span>';
                }

                var tB = '<span class="badge badge-type">' + voucherTypeName(v.type) + '</span>';
                var pN = pMap[v.periodId] || '—';
                var amt = getVoucherAmount(v);
                var descTxt = v.desc ? esc(v.desc) : '<span style="color:#cbd5e1">—</span>';

                var tr = document.createElement('tr');
                if (status === 'approved') tr.classList.add('approved-row');

                var aH = '<div class="row-actions"><button class="row-btn open" data-id="' + v.id + '" data-action="preview">👁</button>';
                if (status === 'draft') {
                    aH += '<button class="row-btn edit" data-id="' + v.id + '" data-action="edit">✎</button>';
                    aH += '<button class="row-btn approve" data-id="' + v.id + '" data-action="approve">✓</button>';
                    aH += '<button class="row-btn del" data-id="' + v.id + '" data-action="delete">×</button>';
                } else {
                    aH += '<button class="row-btn unapprove" data-id="' + v.id + '" data-action="unapprove">↩</button>';
                }
                aH += '</div>';

                tr.innerHTML = '<td dir="ltr">' + toFa(esc(v.number)) + '</td>'
                    + '<td dir="ltr">' + toFa(esc(v.date)) + '</td>'
                    + '<td>' + tB + '</td>'
                    + '<td>' + esc(pN) + '</td>'
                    + '<td>' + descTxt + '</td>'
                    + '<td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(amt)) + '</td>'
                    + '<td>' + badge + '</td>'
                    + '<td>' + aH + '</td>';

                tb.appendChild(tr);
                shown++;
            }

            if (shown === 0) {
                tb.innerHTML = '<tr><td colspan="8" class="empty-row">سندی مطابق فیلترها یافت نشد.</td></tr>';
            }

            console.log('✅ [v42] ' + shown + ' سند نمایش داده شد');

            var cntEl = document.getElementById('vlist-count');
            if (cntEl) cntEl.textContent = toFa(vouchers.length);

            // رویداد دکمه‌ها
            var btns = tb.querySelectorAll('.row-btn');
            for (var b = 0; b < btns.length; b++) {
                btns[b].addEventListener('click', handleRowBtnClick);
            }

            if (typeof applyColVisibility === 'function') {
                try { applyColVisibility('voucher-table-list'); } catch (e) {}
            }

        } catch (err) {
            console.error('❌ [v42] خطای کلی:', err);
            tb.innerHTML = '<tr><td colspan="8" class="empty-row" style="color:#dc2626">خطا: ' + esc(err.message || err) + '</td></tr>';
        }
    }

    function handleRowBtnClick() {
        var id = this.getAttribute('data-id');
        var action = this.getAttribute('data-action');
        var v = findVoucherById(id);
        if (!v) return;

        if (action === 'preview') { openVoucherPreview(v); return; }
        if (action === 'edit') { loadVoucherForEdit(v); return; }

        if (action === 'approve') {
            var issues = getVoucherIssues(v);
            if (issues.length > 0) { alert('⚠️ سند قابل تأیید نیست:\n\n• ' + issues.join('\n• ')); return; }
            var list = DB.load('vouchers', []);
            for (var x = 0; x < list.length; x++) if (list[x].id === id) list[x].status = 'approved';
            DB.save('vouchers', list);
            renderVoucherListV42();
            showToast('✅ سند تأیید شد.');
            return;
        }

        if (action === 'unapprove') {
            if (!confirm('به پیش‌نویس برگردد؟')) return;
            var list2 = DB.load('vouchers', []);
            for (var y = 0; y < list2.length; y++) if (list2[y].id === id) list2[y].status = 'draft';
            DB.save('vouchers', list2);
            renderVoucherListV42();
            return;
        }

        if (action === 'delete') {
            if (!confirm('حذف شود؟')) return;
            var list3 = DB.load('vouchers', []).filter(function(x) { return x.id !== id; });
            DB.save('vouchers', list3);
            renderVoucherListV42();
            if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
            return;
        }
    }

    // ★ جایگزینی قطعی
    window.renderVoucherList = renderVoucherListV42;
    window._renderVoucherListV42 = renderVoucherListV42;

    // ★ پچ goToPage
    function patchGoToPage() {
        if (!window.goToPage) { setTimeout(patchGoToPage, 500); return; }
        if (window._gtpV42Patched) return;
        window._gtpV42Patched = true;
        var _orig = window.goToPage;
        window.goToPage = function (name) {
            var r = _orig.apply(this, arguments);
            if (name === 'voucher-list') {
                setTimeout(function () {
                    try { renderVoucherListV42(); } catch (e) { console.error('v42:', e); }
                }, 120);
            }
            return r;
        };
    }

    // ★ نگهبان هوشمند: اگر جدول خالی ولی DB پر بود، رندر کن
    setInterval(function () {
        var page = document.getElementById('page-voucher-list');
        if (!page || !page.classList.contains('active')) return;
        var tb = document.getElementById('voucher-list-body');
        if (!tb) return;
        var rows = tb.querySelectorAll('tr').length;
        var isEmpty = rows === 0 || (rows === 1 && tb.querySelector('.empty-row'));
        var dbCount = DB.load('vouchers', []).length;
        if (isEmpty && dbCount > 0) {
            console.log('🔄 [v42] جدول خالی ولی ' + dbCount + ' سند در DB هست — رندر مجدد');
            renderVoucherListV42();
        }
    }, 3000);

    function init() {
        patchGoToPage();
        var page = document.getElementById('page-voucher-list');
        if (page && page.classList.contains('active')) {
            setTimeout(renderVoucherListV42, 500);
        }
        console.log('✅ [v42] پچ فهرست اسناد نصب شد');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 3000); });
    } else {
        setTimeout(init, 3000);
    }
})();
