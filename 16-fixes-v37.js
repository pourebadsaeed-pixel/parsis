/* =====================================================================
   پارسیس v37 — 16-fixes-v37.js
   رفع ۱۰ درخواست کاربر + قابلیت اسکن سند
   ===================================================================== */
'use strict';

/* ============ FIX 1: z-index مودال تقویم ============ */
(function() {
    if (document.getElementById('calg-z-fix')) return;
    var s = document.createElement('style');
    s.id = 'calg-z-fix';
    s.textContent = '.calg-mo{z-index:9990 !important;}.calg-mp{z-index:9995 !important;}';
    document.head.appendChild(s);
})();

/* ============ FIX 2: تنظیمات — کلپس + ویجت در لیست ترتیب ============ */
(function() {
    function convertSettings() {
        var modal = document.getElementById('settings-modal');
        if (!modal || modal.dataset.cv === '1') return;
        modal.dataset.cv = '1';
        var body = modal.querySelector('.modal-body');
        if (!body) return;
        var sections = body.querySelectorAll('.modal-section');
        sections.forEach(function(sec) {
            var h3 = sec.querySelector('h3');
            if (!h3) return;
            var title = h3.textContent.trim();
            var det = document.createElement('details');
            det.className = 'settings-details';
            var sum = document.createElement('summary');
            sum.className = 'settings-summary';
            sum.textContent = title;
            det.appendChild(sum);
            var wrap = document.createElement('div');
            wrap.style.padding = '0 8px 12px 8px';
            var move = [];
            sec.childNodes.forEach(function(n) { if (n !== h3) move.push(n); });
            move.forEach(function(n) { wrap.appendChild(n); });
            det.appendChild(wrap);
            sec.parentNode.replaceChild(det, sec);
        });
        var btns = document.createElement('div');
        btns.className = 'settings-expand-btns';
        btns.innerHTML = '<button class="mini-btn" id="set-expand-all">باز کردن همه</button>'
                       + '<button class="mini-btn" id="set-collapse-all">بستن همه</button>';
        body.insertBefore(btns, body.firstChild);
        document.getElementById('set-expand-all').addEventListener('click', function() {
            body.querySelectorAll('details.settings-details').forEach(function(d) { d.open = true; });
        });
        document.getElementById('set-collapse-all').addEventListener('click', function() {
            body.querySelectorAll('details.settings-details').forEach(function(d) { d.open = false; });
        });
        // حذف سکشن «ویجت‌ها (فعال/غیرفعال)»
        setTimeout(function() {
            body.querySelectorAll('details.settings-details').forEach(function(d) {
                var sum = d.querySelector('summary');
                if (sum && /ویجت/.test(sum.textContent) && /فعال/.test(sum.textContent)) d.remove();
            });
        }, 100);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(convertSettings, 1000); });
    } else {
        setTimeout(convertSettings, 1000);
    }
})();

/* بازنویسی renderWidgetOrderUI با چک‌باکس فعال/غیرفعال */
(function() {
    function patch() {
        if (typeof window.renderWidgetOrderUI !== 'function') { setTimeout(patch, 500); return; }
        window.renderWidgetOrderUI = function() {
            var box = document.getElementById('widget-order-list');
            if (!box) return;
            var names = {
                calendar:'📅 تقویم', todayChecklist:'✅ چک‌لیست', bankTotal:'🏦 مانده کل بانک',
                bankBalances:'🏦 مانده حساب‌ها', cashBalances:'💰 صندوق‌ها',
                upcomingInstallments:'⏰ اقساط ۳ روز آینده', birthdays:'🎂 تولدها',
                liveRates:'💱 نرخ لحظه‌ای ارز و طلا'
            };
            var order = state.widgetOrder || [];
            box.innerHTML = '';
            order.forEach(function(key, idx) {
                var row = document.createElement('div');
                row.className = 'widget-order-row';
                var curPage = state.widgetPages[key] || 1;
                var sel = '<select class="wo-page" data-widget-page="' + key + '">';
                for (var p = 1; p <= 3; p++) sel += '<option value="' + p + '"' + (curPage === p ? ' selected' : '') + '>صفحه ' + toFa(p) + '</option>';
                sel += '</select>';
                var checked = state.widgets[key] ? 'checked' : '';
                row.innerHTML = '<label class="wo-name" style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1">'
                    + '<input type="checkbox" data-widget-check="' + key + '" ' + checked + ' style="width:17px;height:17px;accent-color:var(--primary)">'
                    + '<span>' + (names[key] || key) + '</span></label>' + sel
                    + '<div class="wo-btns">'
                    + '<button class="wo-btn" data-key="' + key + '" data-dir="-1"' + (idx === 0 ? ' disabled' : '') + '>↑</button>'
                    + '<button class="wo-btn" data-key="' + key + '" data-dir="1"' + (idx === order.length - 1 ? ' disabled' : '') + '>↓</button>'
                    + '</div>';
                box.appendChild(row);
            });
            box.querySelectorAll('.wo-btn').forEach(function(b) {
                b.addEventListener('click', function() {
                    var key = this.getAttribute('data-key');
                    var dir = Number(this.getAttribute('data-dir'));
                    var arr = state.widgetOrder.slice();
                    var i = arr.indexOf(key), j = i + dir;
                    if (j < 0 || j >= arr.length) return;
                    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
                    state.widgetOrder = arr;
                    DB.save('widgetOrder', arr);
                    updateHomeWidgets();
                    renderWidgetOrderUI();
                });
            });
            box.querySelectorAll('[data-widget-page]').forEach(function(s) {
                s.addEventListener('change', function() {
                    var key = this.getAttribute('data-widget-page');
                    state.widgetPages[key] = Number(this.value);
                    DB.save('widgetPages', state.widgetPages);
                    updateHomeWidgets();
                });
            });
            box.querySelectorAll('[data-widget-check]').forEach(function(cb) {
                cb.addEventListener('change', function() {
                    var key = this.getAttribute('data-widget-check');
                    state.widgets[key] = this.checked;
                    DB.save('widgets', state.widgets);
                    updateHomeWidgets();
                    if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility();
                });
            });
        };
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 500); });
    } else {
        setTimeout(patch, 500);
    }
})();

/* ============ FIX 3: فهرست اسناد — تاریخ کلیک‌پذیر + وضعیت + صفحه‌بندی ============ */
(function() {
    var PAGE_SIZE = 50;
    var _st = { page: 1, statusFilter: '' };

    function openDatePickerForVoucher(v) {
        var temp = document.createElement('input');
        temp.type = 'text';
        temp.value = v.date;
        temp.style.cssText = 'position:fixed;top:-9999px';
        temp.addEventListener('input', function() {
            var nd = this.value;
            if (nd && nd !== v.date) {
                var l = DB.load('vouchers', []);
                for (var i = 0; i < l.length; i++) if (l[i].id === v.id) { l[i].date = nd; break; }
                DB.save('vouchers', l);
                if (typeof renderVoucherList === 'function') renderVoucherList();
                showToast('✅ تاریخ به ' + toFa(nd) + ' تغییر یافت');
            }
            temp.remove();
        });
        document.body.appendChild(temp);
        openCalendar(temp);
    }
    window._openDatePickerForVoucher = openDatePickerForVoucher;

    function addStatusFilterAndPagination() {
        var header = document.querySelector('#page-voucher-list .list-header');
        if (header && !document.getElementById('vlist-status-filter')) {
            var sel = document.createElement('select');
            sel.id = 'vlist-status-filter';
            sel.className = 'filter-input';
            sel.style.cssText = 'flex:0 0 auto;min-width:130px';
            sel.innerHTML = '<option value="">همه وضعیت‌ها</option>'
                          + '<option value="draft">پیش‌نویس</option>'
                          + '<option value="approved">تأییدشده</option>';
            sel.addEventListener('change', function() {
                _st.statusFilter = this.value;
                _st.page = 1;
                renderVoucherList();
            });
            var exportBtn = header.querySelector('.export-btn');
            header.insertBefore(sel, exportBtn || null);
        }
        var card = document.querySelector('#page-voucher-list .card');
        if (card && !document.getElementById('vlist-pagination')) {
            var div = document.createElement('div');
            div.id = 'vlist-pagination';
            div.style.cssText = 'display:flex;justify-content:center;gap:6px;padding:14px 8px;flex-wrap:wrap';
            card.appendChild(div);
        }
    }

    function renderPagination(totalPages, currentPage) {
        var box = document.getElementById('vlist-pagination');
        if (!box) return;
        box.innerHTML = '';
        if (totalPages <= 1) return;
        function mk(label, page, disabled, active) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.disabled = !!disabled;
            b.style.cssText = 'min-width:38px;height:36px;padding:0 12px;border-radius:10px;border:1.5px solid var(--border);'
                + 'background:' + (active ? 'var(--gradient-accent)' : 'var(--card-solid)') + ';'
                + 'color:' + (active ? '#fff' : 'var(--text)') + ';'
                + 'font-weight:800;cursor:pointer;font-family:inherit;font-size:0.85rem';
            b.addEventListener('click', function() { if (!disabled) { _st.page = page; renderVoucherList(); } });
            box.appendChild(b);
        }
        mk('⏮', 1, currentPage === 1);
        mk('◀', currentPage - 1, currentPage === 1);
        var start = Math.max(1, currentPage - 2), end = Math.min(totalPages, currentPage + 2);
        if (start > 1) { mk('۱', 1, false, currentPage === 1); if (start > 2) { var d = document.createElement('span'); d.textContent = '...'; d.style.cssText = 'padding:8px 4px'; box.appendChild(d); } }
        for (var p = start; p <= end; p++) mk(toFa(p), p, false, p === currentPage);
        if (end < totalPages) { if (end < totalPages - 1) { var d2 = document.createElement('span'); d2.textContent = '...'; d2.style.cssText = 'padding:8px 4px'; box.appendChild(d2); } mk(toFa(totalPages), totalPages, false, currentPage === totalPages); }
        mk('▶', currentPage + 1, currentPage === totalPages);
        mk('⏭', totalPages, currentPage === totalPages);
    }

    function patch() {
        if (typeof window.renderVoucherList !== 'function') { setTimeout(patch, 800); return; }
        window.renderVoucherList = function() {
            addStatusFilterAndPagination();
            var filterEl = document.getElementById('vl-period-filter');
            var searchEl = document.getElementById('vlist-search');
            var filter = filterEl ? (filterEl.value || '') : '';
            var search = searchEl ? (searchEl.value || '').toLowerCase() : '';
            var sf = _st.statusFilter;

            var vouchers = DB.load('vouchers', []);
            if (filter) vouchers = vouchers.filter(function(v) { return v.periodId === filter; });
            if (sf) vouchers = vouchers.filter(function(v) { return (v.status || 'draft') === sf; });
            var periods = DB.load('fiscalPeriods', []);
            var pM = {};
            periods.forEach(function(p) { pM[p.id] = p.title; });
            if (search) vouchers = vouchers.filter(function(v) {
                var pN = pM[v.periodId] || '';
                var txt = (v.number + ' ' + v.date + ' ' + (v.desc || '') + ' ' + voucherTypeName(v.type) + ' ' + pN).toLowerCase();
                return txt.indexOf(search) !== -1;
            });
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
            var total = vouchers.length;
            var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
            if (_st.page > totalPages) _st.page = totalPages;
            var startIdx = (_st.page - 1) * PAGE_SIZE;
            var pageVs = vouchers.slice(startIdx, startIdx + PAGE_SIZE);

            var tb = document.getElementById('voucher-list-body');
            if (!tb) return;
            tb.innerHTML = '';
            var hide = getHideState('voucher-list');
            pageVs.forEach(function(v) {
                var status = v.status || 'draft';
                var issues = getVoucherIssues(v);
                var tB = '<span class="badge badge-type">' + voucherTypeName(v.type) + '</span>';
                var pN = pM[v.periodId] || '—';
                var amt = getVoucherAmount(v);
                var tr = document.createElement('tr');
                if (status === 'approved') tr.classList.add('approved-row');

                // شماره
                var td1 = document.createElement('td');
                td1.setAttribute('dir','ltr');
                td1.textContent = toFa(v.number);
                // تاریخ (کلیک‌پذیر)
                var td2 = document.createElement('td');
                td2.setAttribute('dir','ltr');
                td2.textContent = toFa(v.date);
                td2.style.cssText = 'cursor:pointer;color:var(--primary-dark);text-decoration:underline';
                td2.title = 'کلیک برای تغییر تاریخ';
                td2.addEventListener('click', function() { openDatePickerForVoucher(v); });
                // نوع
                var td3 = document.createElement('td'); td3.innerHTML = tB;
                // دوره
                var td4 = document.createElement('td'); td4.textContent = pN;
                // شرح
                var td5 = document.createElement('td'); td5.textContent = v.desc || '';
                // مبلغ
                var td6 = document.createElement('td');
                td6.className = 'num';
                td6.style.fontWeight = 'bold';
                td6.textContent = hide ? '—' : formatMoney(amt);
                // وضعیت — سلکتور
                var td7 = document.createElement('td');
                var selS = document.createElement('select');
                selS.style.cssText = 'padding:5px 8px;border-radius:8px;border:1.5px solid var(--border);font-family:inherit;font-size:0.75rem;font-weight:800;background:' + (status === 'approved' ? '#d1fae5' : '#fff4e0') + ';color:' + (status === 'approved' ? '#065f46' : '#c47c00');
                selS.innerHTML = '<option value="draft"' + (status === 'draft' ? ' selected' : '') + '>پیش‌نویس</option>'
                               + '<option value="approved"' + (status === 'approved' ? ' selected' : '') + '>تأییدشده</option>';
                selS.addEventListener('change', function() {
                    var ns = this.value;
                    if (ns === 'approved') {
                        var isu = getVoucherIssues(v);
                        if (isu.length > 0) { alert('⚠️ قابل تأیید نیست:\n• ' + isu.join('\n• ')); this.value = v.status || 'draft'; return; }
                    }
                    var l = DB.load('vouchers', []);
                    for (var i = 0; i < l.length; i++) if (l[i].id === v.id) l[i].status = ns;
                    DB.save('vouchers', l);
                    renderVoucherList();
                    showToast(ns === 'approved' ? '✅ تأیید شد' : '↩ پیش‌نویس شد');
                });
                td7.appendChild(selS);
                // عملیات
                var td8 = document.createElement('td');
                var aH = '<div class="row-actions"><button class="row-btn open" data-id="' + v.id + '" data-action="preview">👁</button>';
                if (status === 'draft') {
                    aH += '<button class="row-btn edit" data-id="' + v.id + '" data-action="edit">✎</button><button class="row-btn approve" data-id="' + v.id + '" data-action="approve">✓</button><button class="row-btn del" data-id="' + v.id + '" data-action="delete">×</button>';
                } else {
                    aH += '<button class="row-btn unapprove" data-id="' + v.id + '" data-action="unapprove">↩</button>';
                }
                aH += '</div>';
                td8.innerHTML = aH;

                tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
                tr.appendChild(td5); tr.appendChild(td6); tr.appendChild(td7); tr.appendChild(td8);
                tb.appendChild(tr);
            });
            if (pageVs.length === 0) tb.innerHTML = '<tr><td colspan="8" class="empty-row">سندی یافت نشد.</td></tr>';
            document.getElementById('vlist-count').textContent = toFa(total);
            renderPagination(totalPages, _st.page);

            tb.querySelectorAll('.row-btn').forEach(function(b) {
                b.addEventListener('click', function() {
                    var id = this.getAttribute('data-id');
                    var action = this.getAttribute('data-action');
                    var v = findVoucherById(id);
                    if (!v) return;
                    if (action === 'preview') { openVoucherPreview(v); return; }
                    if (action === 'edit') { loadVoucherForEdit(v); return; }
                    if (action === 'approve') {
                        var isu = getVoucherIssues(v);
                        if (isu.length > 0) { alert('⚠️ ' + isu.join('\n• ')); return; }
                        var l = DB.load('vouchers', []);
                        for (var x = 0; x < l.length; x++) if (l[x].id === id) l[x].status = 'approved';
                        DB.save('vouchers', l);
                        renderVoucherList();
                        showToast('✅ تأیید شد.');
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
                        var l3 = DB.load('vouchers', []).filter(function(x) { return x.id !== id; });
                        DB.save('vouchers', l3);
                        renderVoucherList();
                        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
                        return;
                    }
                });
            });
            if (typeof applyColVisibility === 'function') applyColVisibility('voucher-table-list');
        };
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 1800); });
    } else {
        setTimeout(patch, 1800);
    }
})();

/* ============ FIX 4: جمع پایانی تراز بر اساس ردیف‌های فیلترشده ============ */
(function() {
    function parseNum(txt) {
        return Number(normalizeDigits(String(txt || '')).replace(/[^\d\-]/g, '')) || 0;
    }
    function recalcTrialFooter() {
        var box = document.getElementById('rt-result');
        if (!box) return;
        var tbody = box.querySelector('tbody');
        if (!tbody) return;
        var tD = 0, tC = 0, tMD = 0, tMC = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var c = tr.querySelectorAll('td');
            if (c.length < 6) return;
            tD += parseNum(c[2].textContent);
            tC += parseNum(c[3].textContent);
            tMD += parseNum(c[4].textContent);
            tMC += parseNum(c[5].textContent);
        });
        var tfoot = box.querySelector('tfoot');
        if (!tfoot) return;
        var fc = tfoot.querySelectorAll('td');
        if (fc.length < 6) return;
        fc[2].innerHTML = moneyHtml(tD);
        fc[3].innerHTML = moneyHtml(tC);
        fc[4].innerHTML = moneyHtml(tMD);
        fc[5].innerHTML = moneyHtml(tMC);
    }
    window._recalcTrialFooter = recalcTrialFooter;

    // پچ applyColumnFiltersToTable تا بعد از فیلتر، جمع بازمحاسبه شود
    function patch() {
        if (typeof window.applyColumnFiltersToTable !== 'function') { setTimeout(patch, 500); return; }
        var _orig = window.applyColumnFiltersToTable;
        window.applyColumnFiltersToTable = function(tid) {
            _orig.apply(this, arguments);
            if (tid === 'rt-table') recalcTrialFooter();
        };
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 1000); });
    } else {
        setTimeout(patch, 1000);
    }

    // گوش دادن به کلیک دکمه اجرا
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'rt-run') setTimeout(recalcTrialFooter, 350);
    }, true);

    // چک‌باکس فقط-مانده
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'rt-only-balance') setTimeout(recalcTrialFooter, 200);
    }, true);
})();

/* ============ FIX 5: جستجو در شرح‌های استاندارد ============ */
(function() {
    function setup() {
        var box = document.getElementById('std-desc-chips');
        if (!box) { setTimeout(setup, 800); return; }
        if (document.getElementById('std-desc-search')) return;
        var card = box.closest('.card');
        if (!card) return;
        var f = document.createElement('div');
        f.className = 'field';
        f.innerHTML = '<label>🔍 جستجو در شرح‌ها</label><input type="text" id="std-desc-search" placeholder="تایپ کن...">';
        card.insertBefore(f, box);
        document.getElementById('std-desc-search').addEventListener('input', function() {
            var q = this.value.trim().toLowerCase();
            var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
            var filtered = [];
            list.forEach(function(v, i) { if (!q || v.toLowerCase().indexOf(q) !== -1) filtered.push({ t: v, i: i }); });
            box.innerHTML = '';
            filtered.forEach(function(x) {
                var chip = document.createElement('span');
                chip.className = 'chip';
                chip.innerHTML = esc(x.t) + ' <button class="chip-del" data-i="' + x.i + '">×</button>';
                box.appendChild(chip);
            });
            box.querySelectorAll('.chip-del').forEach(function(b) {
                b.addEventListener('click', function() {
                    var idx = Number(this.getAttribute('data-i'));
                    var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
                    l.splice(idx, 1);
                    DB.save('standardDescriptions', l);
                    document.getElementById('std-desc-search').dispatchEvent(new Event('input'));
                    if (typeof renderStdDescChips === 'function') renderStdDescChips();
                    if (typeof refreshStdDescDatalist === 'function') refreshStdDescDatalist();
                });
            });
            if (filtered.length === 0) box.innerHTML = '<div class="widget-empty">موردی یافت نشد.</div>';
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(setup, 1200); });
    } else {
        setTimeout(setup, 1200);
    }
})();

/* ============ FIX 6: دو ستون اضافه در خلاصه تسهیلات ============ */
(function() {
    function computeFacilityAcctBalances() {
        var facilities = DB.load('facilities', []);
        var vouchers = DB.load('vouchers', []);
        var out = {};
        facilities.forEach(function(f) {
            var sum = 0;
            if (f.moeinId) {
                vouchers.forEach(function(v) {
                    if (v.status !== 'approved') return;
                    (v.lines || []).forEach(function(l) {
                        if (l.account !== f.moeinId) return;
                        if (l.details && l.details.facility === f.id) {
                            sum += (Number(l.credit) || 0) - (Number(l.debit) || 0);
                        }
                    });
                });
            }
            out[f.id] = sum;
        });
        return out;
    }

    function augmentTable() {
        var table = document.getElementById('rf-table');
        if (!table || table.dataset.acctAug === '1') return;
        var headerRow = table.querySelector('thead tr');
        if (!headerRow) return;
        var ths = headerRow.querySelectorAll('th');
        if (ths.length === 0) return;
        table.dataset.acctAug = '1';
        var balMap = computeFacilityAcctBalances();
        var facilities = DB.load('facilities', []);
        var hide = getHideState('rf');

        // پیدا کردن ایندکس ستون مبلغ باقی
        var idxRem = -1;
        ths.forEach(function(th, i) {
            if ((th.textContent || '').indexOf('مبلغ باقی') !== -1) idxRem = i;
        });
        if (idxRem === -1) idxRem = ths.length - 1;

        var th1 = document.createElement('th'); th1.textContent = 'مانده حسابداری';
        var th2 = document.createElement('th'); th2.textContent = 'مغایرت';
        headerRow.insertBefore(th2, ths[idxRem + 1] || null);
        headerRow.insertBefore(th1, ths[idxRem + 1] || null);

        var tbody = table.querySelector('tbody');
        var rows = tbody.querySelectorAll('tr');
        var totalBal = 0, totalVar = 0;
        rows.forEach(function(tr) {
            var cells = tr.querySelectorAll('td');
            if (cells.length < 3) return;
            var name = (cells[0].textContent || '').trim();
            var f = facilities.find(function(x) { return x.name === name; });
            if (!f) return;
            var remText = (cells[idxRem] || {}).textContent || '';
            var rem = Number(normalizeDigits(remText).replace(/[^\d\-]/g, '')) || 0;
            var bal = balMap[f.id] || 0;
            var variance = bal - rem;
            totalBal += bal; totalVar += variance;
            var td1 = document.createElement('td');
            td1.className = 'num';
            td1.innerHTML = hide ? '—' : moneyHtml(bal);
            var td2 = document.createElement('td');
            td2.className = 'num';
            td2.style.fontWeight = '800';
            td2.style.color = Math.abs(variance) > 1 ? '#dc2626' : '#059669';
            td2.innerHTML = hide ? '—' : moneyHtml(variance);
            tr.insertBefore(td2, cells[idxRem + 1] || null);
            tr.insertBefore(td1, cells[idxRem + 1] || null);
        });
        var tfoot = table.querySelector('tfoot tr');
        if (tfoot) {
            var fc = tfoot.querySelectorAll('td');
            var t1 = document.createElement('td');
            t1.className = 'num';
            t1.innerHTML = hide ? '—' : moneyHtml(totalBal);
            var t2 = document.createElement('td');
            t2.className = 'num';
            t2.style.color = Math.abs(totalVar) > 1 ? '#dc2626' : '#059669';
            t2.innerHTML = hide ? '—' : moneyHtml(totalVar);
            tfoot.insertBefore(t2, fc[idxRem + 1] || null);
            tfoot.insertBefore(t1, fc[idxRem + 1] || null);
        }
    }

    function patch() {
        if (typeof window.runFacilityReport !== 'function') { setTimeout(patch, 800); return; }
        var _orig = window.runFacilityReport;
        window.runFacilityReport = function() {
            _orig.apply(this, arguments);
            setTimeout(augmentTable, 120);
        };
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 2500); });
    } else {
        setTimeout(patch, 2500);
    }
})();

/* ============ FIX 7: رنگ‌بندی سبز/قرمز در تراز ============ */
(function() {
    if (document.getElementById('rt-color-fix')) return;
    var s = document.createElement('style');
    s.id = 'rt-color-fix';
    s.textContent = ''
    + '#rt-table td.dr, #rt-table td.cr, #rt-table th { font-weight:800; }'
    + '#rt-table td.dr { color:#059669 !important; }'
    + '#rt-table td.cr { color:#dc2626 !important; }'
    + '#rt-table tfoot td.dr { color:#059669 !important; }'
    + '#rt-table tfoot td.cr { color:#dc2626 !important; }';
    document.head.appendChild(s);
})();

/* ============ FIX 8: جابجایی الگوهای سند ============ */
(function() {
    function moveTemplate(idx, dir) {
        var list = DB.load('voucherTemplates', []);
        var j = idx + dir;
        if (j < 0 || j >= list.length) return;
        var tmp = list[idx]; list[idx] = list[j]; list[j] = tmp;
        DB.save('voucherTemplates', list);
        if (typeof renderTemplateList === 'function') renderTemplateList();
        if (typeof refreshTemplateSelect === 'function') refreshTemplateSelect();
        showToast('✅ جابجا شد');
    }

    function patch() {
        if (typeof window.renderTemplateList !== 'function') { setTimeout(patch, 1000); return; }
        var _orig = window.renderTemplateList;
        window.renderTemplateList = function() {
            _orig.apply(this, arguments);
            var box = document.getElementById('tpl-list-body');
            if (!box) return;
            var rows = box.querySelectorAll('.tpl-row');
            rows.forEach(function(row, idx) {
                if (row.querySelector('.tpl-move-up')) return;
                var actions = row.querySelector('.row-actions');
                if (!actions) return;
                var up = document.createElement('button');
                up.className = 'row-btn edit tpl-move-up';
                up.textContent = '↑';
                up.title = 'انتقال به بالا';
                up.style.color = '#3b82f6';
                if (idx === 0) up.disabled = true;
                up.addEventListener('click', function(e) { e.stopPropagation(); moveTemplate(idx, -1); });
                var dn = document.createElement('button');
                dn.className = 'row-btn edit tpl-move-dn';
                dn.textContent = '↓';
                dn.title = 'انتقال به پایین';
                dn.style.color = '#3b82f6';
                if (idx === rows.length - 1) dn.disabled = true;
                dn.addEventListener('click', function(e) { e.stopPropagation(); moveTemplate(idx, 1); });
                actions.insertBefore(dn, actions.firstChild);
                actions.insertBefore(up, actions.firstChild);
            });
        };
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 2000); });
    } else {
        setTimeout(patch, 2000);
    }
})();

/* ============ FIX 9: تقویم — تغییر نام، درگ رویداد، فعال‌سازی دقیقه ============ */
(function() {
    // تغییر نام
    function renameCalendar() {
        var menuBtn = document.querySelector('[data-page="jalali-calendar"]');
        if (menuBtn && menuBtn.textContent.indexOf('مدیریت') === -1) {
            menuBtn.textContent = '📅 مدیریت تقویم شمسی';
        }
        var title = document.querySelector('#page-jalali-calendar h2');
        if (title && title.textContent.indexOf('مدیریت') === -1) {
            title.textContent = '📅 مدیریت تقویم شمسی';
        }
    }
    setInterval(renameCalendar, 1500);

    // درگ و دراپ روی رویدادهای تقویم (نمای ماه)
    function enhanceCalendarDrag() {
        var page = document.getElementById('page-jalali-calendar');
        if (!page) return;
        // رویدادهای ماه
        page.querySelectorAll('.calg-mcell').forEach(function(cell) {
            if (cell.dataset.dropReady === '1') return;
            cell.dataset.dropReady = '1';
            cell.addEventListener('dragover', function(e) {
                e.preventDefault();
                cell.style.borderColor = '#3b82f6';
                cell.style.background = '#dbeafe';
            });
            cell.addEventListener('dragleave', function() {
                cell.style.borderColor = '';
                cell.style.background = '';
            });
            cell.addEventListener('drop', function(e) {
                e.preventDefault();
                cell.style.borderColor = '';
                cell.style.background = '';
                var evId = e.dataTransfer.getData('text/plain');
                var newDate = cell.getAttribute('data-date');
                if (!evId || !newDate) return;
                // اگر رویداد کاربر است
                var userEvs = DB.load('calendarUserEvents', []);
                var found = false;
                for (var i = 0; i < userEvs.length; i++) {
                    if (userEvs[i].id === evId) {
                        userEvs[i].date = newDate;
                        found = true;
                        break;
                    }
                }
                if (found) {
                    DB.save('calendarUserEvents', userEvs);
                    showToast('📅 رویداد به ' + toFa(newDate) + ' منتقل شد');
                    if (typeof calRender === 'function') calRender();
                } else {
                    // رویداد readonly (سند/قسط/یادداشت) — کاربر نمی‌تواند جابجا کند
                    showToast('⚠️ این رویداد فقط‌خواندنی است');
                }
            });
        });
        // رویدادهای درگ-پذیر
        page.querySelectorAll('.calg-mcell .cev, .calg-agev, .calg-wcell .wev').forEach(function(ev) {
            if (ev.dataset.dragReady === '1') return;
            ev.dataset.dragReady = '1';
            ev.setAttribute('draggable', 'true');
            ev.style.cursor = 'grab';
            ev.addEventListener('dragstart', function(e) {
                var id = null;
                // از کلیک قبلی (بسته به نمای فعال) استخراج می‌کنیم
                if (ev.dataset.evId) id = ev.dataset.evId;
                else if (ev.querySelector && ev.querySelector('.cdot')) {
                    // از ماه — id از data-attr روی ردیف
                    var match = ev.getAttribute('data-ev');
                    if (match) id = match;
                }
                if (!id) {
                    // تلاش برای یافتن از کاتگوری
                    var parent = ev.closest('[data-date]');
                    if (parent) {
                        // رویداد فقط یک مثال ساده — برای درگ کامل نیاز به data-ev داریم
                    }
                }
                if (id) {
                    e.dataTransfer.setData('text/plain', id);
                    e.dataTransfer.effectAllowed = 'move';
                }
            });
        });
    }
    setInterval(enhanceCalendarDrag, 800);

    // فوکوس خودکار روی دقیقه پس از تایپ ساعت
    function enhanceTimeInput() {
        var timeInp = document.getElementById('calg-time');
        if (!timeInp || timeInp.dataset.timeReady === '1') return;
        timeInp.dataset.timeReady = '1';
        timeInp.addEventListener('input', function() {
            var v = this.value;
            // اگر دقیقاً دو رقم تایپ شد و کولون نبود، کولون اضافه کن
            if (/^\d{2}$/.test(v)) {
                this.value = v + ':';
            }
        });
        // auto focus روی دقیقه: اگر مقدار مطابق الگوی "HH:" است، نشانگر در انتها
        timeInp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && this.value === /^\d{2}$/.test(this.value)) {
                this.value = this.value + ':';
            }
        });
    }
    setInterval(enhanceTimeInput, 800);
})();

/* ============ FIX 10 (درخواست جدید): اسکن سند ============ */
(function() {
    function addScanButton() {
        var page = document.getElementById('page-voucher-new');
        if (!page || document.getElementById('voucher-scan-btn')) return;
        var card = page.querySelector('#voucher-head-card');
        if (!card) { setTimeout(addScanButton, 1000); return; }
        var btn = document.createElement('button');
        btn.id = 'voucher-scan-btn';
        btn.type = 'button';
        btn.style.cssText = 'margin-top:10px;width:100%;padding:12px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;border:none;border-radius:12px;font-family:inherit;font-weight:800;font-size:0.9rem;cursor:pointer;box-shadow:0 4px 14px rgba(99,102,241,0.3)';
        btn.innerHTML = '📷 اسکن سند (فاکتور / پوز / دست‌نویس)';
        btn.addEventListener('click', openScanModal);
        var headRow = card.querySelector('.voucher-head-row');
        if (headRow) {
            headRow.parentNode.insertBefore(btn, headRow.nextSibling);
        } else {
            card.appendChild(btn);
        }
    }

    function openScanModal() {
        var old = document.getElementById('voucher-scan-modal');
        if (old) old.remove();
        var oldO = document.getElementById('voucher-scan-overlay');
        if (oldO) oldO.remove();

        var html = ''
            + '<div id="voucher-scan-overlay" class="overlay show" style="z-index:10000"></div>'
            + '<div id="voucher-scan-modal" class="modal show" style="max-width:640px;z-index:10010">'
            +   '<div class="modal-head"><h2>📷 اسکن سند</h2><button class="close-btn" id="vsc-close">×</button></div>'
            +   '<div class="modal-body">'
            +     '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
            +       '<button id="vsc-camera" class="btn-primary">📸 باز کردن دوربین</button>'
            +       '<label class="btn-secondary" style="cursor:pointer;padding:11px 20px;display:inline-flex;align-items:center">'
            +         '📁 انتخاب فایل<input type="file" id="vsc-file" accept="image/*" capture="environment" style="display:none"></label>'
            +     '</div>'
            +     '<div id="vsc-preview" style="text-align:center;margin-bottom:12px"></div>'
            +     '<video id="vsc-video" style="width:100%;border-radius:12px;display:none;background:#000" autoplay playsinline></video>'
            +     '<div id="vsc-status" style="text-align:center;color:var(--text-muted);font-size:0.85rem;min-height:30px;padding:8px">تصویر را از دوربین یا فایل انتخاب کن</div>'
            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">'
            +     '<button id="vsc-capture" class="btn-primary" style="display:none">📸 گرفتن عکس</button>'
            +     '<button id="vsc-analyze" class="btn-primary" disabled>🤖 تحلیل با AI</button>'
            +     '<button id="vsc-cancel" class="btn-secondary">انصراف</button>'
            +   '</div>'
            + '</div>';
        document.body.insertAdjacentHTML('beforeend', html);

        var st = { dataUrl: null, stream: null };

        function close() {
            if (st.stream) st.stream.getTracks().forEach(function(t) { t.stop(); });
            var m = document.getElementById('voucher-scan-modal'); if (m) m.remove();
            var o = document.getElementById('voucher-scan-overlay'); if (o) o.remove();
        }
        document.getElementById('vsc-close').onclick = close;
        document.getElementById('vsc-cancel').onclick = close;
        document.getElementById('voucher-scan-overlay').onclick = close;

        document.getElementById('vsc-camera').onclick = async function() {
            try {
                var stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
                st.stream = stream;
                var v = document.getElementById('vsc-video');
                v.srcObject = stream;
                v.style.display = 'block';
                document.getElementById('vsc-capture').style.display = 'inline-block';
                document.getElementById('vsc-status').textContent = '🟢 دوربین فعال است — روی «گرفتن عکس» بزن';
                document.getElementById('vsc-status').style.color = '#059669';
            } catch(e) {
                alert('دسترسی به دوربین ناموفق:\n' + (e.message || e));
            }
        };

        document.getElementById('vsc-file').onchange = function() {
            var file = this.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(e) {
                st.dataUrl = e.target.result;
                showPreview(e.target.result);
                document.getElementById('vsc-analyze').disabled = false;
                document.getElementById('vsc-status').textContent = '📄 عکس آماده است — روی «تحلیل با AI» بزن';
                document.getElementById('vsc-status').style.color = '#1e40af';
            };
            reader.readAsDataURL(file);
            this.value = '';
        };

        document.getElementById('vsc-capture').onclick = function() {
            var v = document.getElementById('vsc-video');
            if (!v || !v.videoWidth) return;
            var c = document.createElement('canvas');
            c.width = v.videoWidth; c.height = v.videoHeight;
            c.getContext('2d').drawImage(v, 0, 0);
            st.dataUrl = c.toDataURL('image/jpeg', 0.85);
            showPreview(st.dataUrl);
            document.getElementById('vsc-analyze').disabled = false;
            document.getElementById('vsc-status').textContent = '📸 عکس گرفته شد — روی «تحلیل با AI» بزن';
            document.getElementById('vsc-status').style.color = '#1e40af';
            if (st.stream) st.stream.getTracks().forEach(function(t) { t.stop(); });
            v.style.display = 'none';
            this.style.display = 'none';
        };

        function showPreview(url) {
            document.getElementById('vsc-preview').innerHTML =
                '<img src="' + url + '" style="max-width:100%;max-height:280px;border-radius:12px;border:1px solid var(--border)">';
        }

        document.getElementById('vsc-analyze').onclick = async function() {
            if (!st.dataUrl) return;
            if (typeof AI === 'undefined' || !AI.apiKey) {
                alert('⚠️ ابتدا در تنظیمات دستیار، کلید API را وارد کنید.');
                return;
            }
            var status = document.getElementById('vsc-status');
            status.style.color = '#4f46e5';
            status.textContent = '🤖 در حال تحلیل تصویر با AI... (ممکن است چند ثانیه طول بکشد)';
            try {
                var prompt = 'این تصویر یک سند/فاکتور/رسید بانکی/پوز است. لطفاً اطلاعات زیر را دقیق استخراج کن و پاسخ را فقط به صورت JSON خالص (بدون هیچ توضیح اضافه، بدون ```) برگردان:\n'
                    + '{"amount": <عدد صحیح به ریال یا 0>, "description": "<شرح کوتاه سند>", "date": "<تاریخ شمسی YYYY/MM/DD یا خالی>", "items": [{"title": "<نام قلم>", "amount": <عدد>}]}\n'
                    + 'اگر مبلغ به تومان نوشته شده، آن را × 10 کن و به ریال برگردان.';
                var result = await aiCallAPI(prompt, { dataUrl: st.dataUrl, name: 'scan.jpg' });
                var content = (result && result.content) || '';
                var m = content.match(/\{[\s\S]*\}/);
                if (!m) throw new Error('پاسخ AI قابل تجزیه نبود');
                var data = JSON.parse(m[0]);
                applyScan(data);
                close();
                showToast('✅ اطلاعات استخراج شد — سند را بررسی کن');
            } catch(e) {
                status.style.color = '#dc2626';
                status.textContent = '⚠️ خطا: ' + (e.message || e);
            }
        };

        function applyScan(data) {
            if (data.description) {
                var d = document.getElementById('v-desc');
                if (d) d.value = String(data.description).trim();
            }
            if (data.date && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(data.date)) {
                var dt = document.getElementById('v-date');
                if (dt) dt.value = data.date;
            }
            var amt = Number(data.amount) || 0;
            if (amt > 0) {
                voucherLines = [{
                    id: uid(), account: '', details: {},
                    debit: amt, credit: 0,
                    description: (data.description || 'سند اسکن شده')
                }];
                renderVoucherLines();
            } else if (Array.isArray(data.items) && data.items.length > 0) {
                voucherLines = data.items.slice(0, 10).map(function(it) {
                    return {
                        id: uid(), account: '', details: {},
                        debit: Number(it.amount) || 0, credit: 0,
                        description: it.title || 'قلم اسکن شده'
                    };
                });
                renderVoucherLines();
            }
            goToPage('voucher-new');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(addScanButton, 3000); });
    } else {
        setTimeout(addScanButton, 3000);
    }
})();

console.log('🎉 پارسیس v37 — ۱۰ پچ اعمال شد (اسکن، تقویم، تنظیمات، گزارش‌ها)');
