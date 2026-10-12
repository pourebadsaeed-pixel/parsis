/* =====================================================================
   پارسیس v40 — 18-parsis-final.js
   فایل واحد جامع — همه ۱۰ درخواست + اسکن هوشمند
   فقط این یک فایل را اضافه کن و بقیه patchها را حذف کن.
   ===================================================================== */
'use strict';

(function PARSIS_FINAL() {
    if (window._parsisV40) return;
    window._parsisV40 = true;

/* ═══════════════════════════════════════════════════════════════
   §1 — تقویم: z-index پویا داخل مودال + تغییر نام
   ═══════════════════════════════════════════════════════════════ */
(function fixCalendarModalZ() {
    function patch() {
        if (typeof window.openCalendar !== 'function') { setTimeout(patch, 400); return; }
        if (window._calZPatched) return;
        window._calZPatched = true;
        var _orig = window.openCalendar;
        window.openCalendar = function(input) {
            _orig.apply(this, arguments);
            var maxZ = 0, el = input;
            while (el) {
                var cs = window.getComputedStyle(el);
                var z = parseInt(cs.zIndex, 10);
                if (!isNaN(z) && z > maxZ) maxZ = z;
                el = el.parentElement;
            }
            var popup = document.getElementById('cal-popup');
            var overlay = document.getElementById('cal-overlay');
            if (maxZ > 300) {
                var targetZ = maxZ + 100;
                if (popup) popup.style.zIndex = String(targetZ + 1);
                if (overlay) overlay.style.zIndex = String(targetZ);
            } else {
                if (popup) popup.style.zIndex = '';
                if (overlay) overlay.style.zIndex = '';
            }
        };
        if (typeof window.closeCalendar === 'function') {
            var _origClose = window.closeCalendar;
            window.closeCalendar = function() {
                _origClose.apply(this, arguments);
                var p = document.getElementById('cal-popup');
                var o = document.getElementById('cal-overlay');
                if (p) p.style.zIndex = '';
                if (o) o.style.zIndex = '';
            };
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 800); });
    else setTimeout(patch, 800);

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
        var oldTitle = document.querySelector('#page-jalali-calendar .calg-wrap h2');
        if (oldTitle && oldTitle.textContent.indexOf('مدیریت') === -1) {
            oldTitle.textContent = '📅 مدیریت تقویم شمسی';
        }
    }
    setInterval(renameCalendar, 1200);
})();

/* ═══════════════════════════════════════════════════════════════
   §2 — تنظیمات: کلپس/اکسپند + حذف بخش ویجت‌ها + تیک در لیست ترتیب
   ═══════════════════════════════════════════════════════════════ */
(function fixSettings() {
    function convert() {
        var modal = document.getElementById('settings-modal');
        if (!modal || modal.dataset.cv40 === '1') return;
        modal.dataset.cv40 = '1';
        var body = modal.querySelector('.modal-body');
        if (!body) return;

        // تبدیل modal-section ها به details
        var sections = Array.from(body.querySelectorAll('.modal-section'));
        sections.forEach(function(sec) {
            var h3 = sec.querySelector('h3');
            if (!h3) return;
            var title = h3.textContent.trim();
            // حذف سکشن ویجت‌های فعال/غیرفعال (چون به لیست ترتیب منتقل می‌شود)
            if (/ویجت.*فعال|فعال.*ویجت/.test(title) && /checkbox-grid/.test(sec.innerHTML)) {
                sec.remove();
                return;
            }
            var det = document.createElement('details');
            det.className = 'settings-details';
            var sum = document.createElement('summary');
            sum.className = 'settings-summary';
            sum.textContent = title;
            det.appendChild(sum);
            var wrap = document.createElement('div');
            wrap.style.padding = '0 8px 12px';
            Array.from(sec.childNodes).forEach(function(n) { if (n !== h3) wrap.appendChild(n); });
            det.appendChild(wrap);
            sec.parentNode.replaceChild(det, sec);
        });

        // دکمه‌های باز/بسته کردن همه
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
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(convert, 900); });
    else setTimeout(convert, 900);
})();

/* بازنویسی لیست ترتیب ویجت‌ها با چک‌باکس فعال/غیرفعال */
(function patchWidgetOrder() {
    function apply() {
        if (typeof window.renderWidgetOrderUI !== 'function') { setTimeout(apply, 500); return; }
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
                row.innerHTML = '<label class="wo-name" style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0">'
                    + '<input type="checkbox" data-widget-check="' + key + '" ' + checked + ' style="width:17px;height:17px;accent-color:var(--primary);flex-shrink:0">'
                    + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (names[key] || key) + '</span></label>'
                    + sel
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
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(apply, 1500); });
    else setTimeout(apply, 1500);
})();

/* ═══════════════════════════════════════════════════════════════
   §3 — فهرست اسناد: تاریخ کلیک‌پذیر + وضعیت + صفحه‌بندی ۵۰تایی
   ═══════════════════════════════════════════════════════════════ */
(function fixVoucherList() {
    var PAGE_SIZE = 50;
    var PG = { page: 1 };

    function ensurePagerDiv() {
        var card = document.querySelector('#page-voucher-list .card');
        if (!card) return;
        if (!document.getElementById('vlist-pagination')) {
            var d = document.createElement('div');
            d.id = 'vlist-pagination';
            d.style.cssText = 'display:flex;justify-content:center;gap:8px;padding:14px 8px;flex-wrap:wrap;direction:rtl';
            card.appendChild(d);
        }
    }

    function renderPager(totalPages, cur) {
        var box = document.getElementById('vlist-pagination');
        if (!box) return;
        box.innerHTML = '';
        if (totalPages <= 1) return;
        function mk(label, page, disabled, title) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.title = title || '';
            b.disabled = !!disabled;
            b.style.cssText = 'min-width:44px;height:38px;padding:0 12px;border-radius:10px;'
                + 'border:1.5px solid var(--border);background:var(--card-solid);color:var(--primary-dark);'
                + 'font-weight:800;font-family:inherit;font-size:1rem;cursor:pointer;'
                + 'display:inline-flex;align-items:center;justify-content:center;transition:all .2s';
            if (disabled) b.style.opacity = '0.3';
            b.addEventListener('mouseenter', function() { if (!disabled) b.style.background = 'var(--primary-light)'; });
            b.addEventListener('mouseleave', function() { if (!disabled) b.style.background = 'var(--card-solid)'; });
            b.addEventListener('click', function() {
                if (disabled) return;
                PG.page = page;
                if (typeof window.renderVoucherList === 'function') window.renderVoucherList();
            });
            box.appendChild(b);
        }
        // در RTL: اولین عنصر راست‌ترین است.
        // کاربر گفته «جهت‌ها را با معکوس عوض کن» → یعنی فلش آخرین صفحه باید اول (راست) بیاید
        mk('⏭', 1, cur === 1, 'اولین صفحه');
        mk('▶', cur - 1, cur === 1, 'صفحه قبلی');       // ▶ در RTL = فلش راست = قبلی
        mk('◀', cur + 1, cur === totalPages, 'صفحه بعدی'); // ◀ در RTL = فلش چپ = بعدی
        mk('⏮', totalPages, cur === totalPages, 'آخرین صفحه');
    }

    function openDatePickerForVoucher(v) {
        var tmp = document.createElement('input');
        tmp.type = 'text';
        tmp.value = v.date;
        tmp.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
        tmp.addEventListener('input', function() {
            var nd = this.value;
            if (nd && nd !== v.date) {
                var l = DB.load('vouchers', []);
                for (var i = 0; i < l.length; i++) if (l[i].id === v.id) { l[i].date = nd; break; }
                DB.save('vouchers', l);
                if (typeof renderVoucherList === 'function') renderVoucherList();
                showToast('✅ تاریخ به ' + toFa(nd) + ' تغییر یافت');
            }
            setTimeout(function() { tmp.remove(); }, 100);
        });
        document.body.appendChild(tmp);
        if (typeof openCalendar === 'function') openCalendar(tmp);
    }

    function patch() {
        if (typeof window.renderVoucherList !== 'function') { setTimeout(patch, 800); return; }
        if (window._vlPatched) return;
        window._vlPatched = true;
        window.renderVoucherList = function() {
            ensurePagerDiv();
            var filterEl = document.getElementById('vl-period-filter');
            var searchEl = document.getElementById('vlist-search');
            var filter = filterEl ? (filterEl.value || '') : '';
            var search = searchEl ? (searchEl.value || '').toLowerCase() : '';
            var vouchers = DB.load('vouchers', []);
            if (filter) vouchers = vouchers.filter(function(v) { return v.periodId === filter; });
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
            if (PG.page > totalPages) PG.page = totalPages;
            if (PG.page < 1) PG.page = 1;
            var startIdx = (PG.page - 1) * PAGE_SIZE;
            var pageVs = vouchers.slice(startIdx, startIdx + PAGE_SIZE);

            var tb = document.getElementById('voucher-list-body');
            if (!tb) return;
            tb.innerHTML = '';
            var hide = getHideState('voucher-list');
            pageVs.forEach(function(v) {
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
                tr.innerHTML = '<td dir="ltr">' + toFa(esc(v.number)) + '</td>'
                    + '<td dir="ltr">' + toFa(esc(v.date)) + '</td>'
                    + '<td>' + tB + '</td>'
                    + '<td>' + esc(pN) + '</td>'
                    + '<td>' + esc(v.desc) + '</td>'
                    + '<td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(amt)) + '</td>'
                    + '<td>' + badge + '</td>'
                    + '<td>' + aH + '</td>';
                // تاریخ کلیک‌پذیر
                tr.children[1].style.cssText = 'cursor:pointer;color:var(--primary-dark);text-decoration:underline dotted';
                tr.children[1].title = 'کلیک: تغییر تاریخ';
                tr.children[1].addEventListener('click', function() { openDatePickerForVoucher(v); });
                tb.appendChild(tr);
            });
            if (pageVs.length === 0) tb.innerHTML = '<tr><td colspan="8" class="empty-row">سندی یافت نشد.</td></tr>';
            document.getElementById('vlist-count').textContent = toFa(total);
            renderPager(totalPages, PG.page);

            tb.querySelectorAll('.row-btn').forEach(function(b) {
                b.addEventListener('click', function() {
                    var id = this.getAttribute('data-id');
                    var action = this.getAttribute('data-action');
                    var v = findVoucherById(id);
                    if (!v) return;
                    if (action === 'preview') { openVoucherPreview(v); return; }
                    if (action === 'edit') { loadVoucherForEdit(v); return; }
                    if (action === 'approve') {
                        var iss = getVoucherIssues(v);
                        if (iss.length > 0) { alert('⚠️ ' + iss.join('\n• ')); return; }
                        var l = DB.load('vouchers', []);
                        for (var x = 0; x < l.length; x++) if (l[x].id === id) l[x].status = 'approved';
                        DB.save('vouchers', l); renderVoucherList(); showToast('✅ تأیید شد.');
                        return;
                    }
                    if (action === 'unapprove') {
                        if (!confirm('برگشت؟')) return;
                        var l2 = DB.load('vouchers', []);
                        for (var y = 0; y < l2.length; y++) if (l2[y].id === id) l2[y].status = 'draft';
                        DB.save('vouchers', l2); renderVoucherList();
                        return;
                    }
                    if (action === 'delete') {
                        if (!confirm('حذف شود؟')) return;
                        var l3 = DB.load('vouchers', []).filter(function(x) { return x.id !== id; });
                        DB.save('vouchers', l3); renderVoucherList();
                        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
                        return;
                    }
                });
            });
            if (typeof applyColVisibility === 'function') applyColVisibility('voucher-table-list');
        };
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 1900); });
    else setTimeout(patch, 1900);
})();

/* ═══════════════════════════════════════════════════════════════
   §4 — جمع فیلترشده در تراز + گردش وجه نقد
   ═══════════════════════════════════════════════════════════════ */
(function fixFilteredTotals() {
    function parseNum(txt) {
        var t = normalizeDigits(String(txt || ''));
        var neg = /\(.*\)/.test(t);
        var v = Number(t.replace(/[^\d]/g, '')) || 0;
        return neg ? -v : v;
    }
    function recalcTrial() {
        var box = document.getElementById('rt-result');
        if (!box) return;
        var tbody = box.querySelector('tbody'), tfoot = box.querySelector('tfoot');
        if (!tbody || !tfoot) return;
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
        var fc = tfoot.querySelectorAll('td');
        if (fc.length < 6) return;
        fc[2].innerHTML = moneyHtml(tD);
        fc[3].innerHTML = moneyHtml(tC);
        fc[4].innerHTML = moneyHtml(tMD);
        fc[5].innerHTML = moneyHtml(tMC);
    }
    function recalcCfd() {
        var box = document.getElementById('cfd-result');
        if (!box) return;
        var table = box.querySelector('table#cfd-table');
        if (!table) return;
        var tbody = table.querySelector('tbody'), tfoot = table.querySelector('tfoot');
        if (!tbody || !tfoot) return;
        var tIn = 0, tOut = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var c = tr.querySelectorAll('td');
            if (c.length < 7) return;
            tIn += parseNum(c[2].textContent);
            tOut += parseNum(c[3].textContent);
        });
        var fc = tfoot.querySelectorAll('td');
        if (fc.length < 7) return;
        fc[2].innerHTML = moneyHtml(tIn);
        fc[3].innerHTML = moneyHtml(tOut);
        fc[4].innerHTML = moneyHtml(tIn - tOut);
    }

    function patchFilter() {
        if (typeof window.applyColumnFiltersToTable !== 'function') { setTimeout(patchFilter, 700); return; }
        if (window._acft40) return;
        window._acft40 = true;
        var _orig = window.applyColumnFiltersToTable;
        window.applyColumnFiltersToTable = function(tid) {
            _orig.apply(this, arguments);
            setTimeout(function() {
                if (tid === 'rt-table') recalcTrial();
                else if (tid === 'cfd-table') recalcCfd();
            }, 30);
        };
    }

    // MutationObserver برای rt و cfd
    function obs(tableId, cb) {
        var t = document.getElementById(tableId);
        if (!t) return;
        var tb = t.querySelector('tbody');
        if (!tb || tb.dataset.obs40) return;
        tb.dataset.obs40 = '1';
        new MutationObserver(function() { cb(); }).observe(tb, {
            attributes: true, attributeFilter: ['style'], subtree: true, childList: true
        });
    }
    setInterval(function() {
        obs('rt-table', recalcTrial);
        obs('cfd-table', recalcCfd);
    }, 1200);

    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'rt-only-balance') setTimeout(recalcTrial, 200);
    }, true);
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'rt-run') setTimeout(recalcTrial, 400);
        if (e.target && e.target.id === 'cfd-run') setTimeout(recalcCfd, 400);
    }, true);

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(patchFilter, 1100); });
    else setTimeout(patchFilter, 1100);
})();

/* ═══════════════════════════════════════════════════════════════
   §5 — تاریخ پیش‌فرض همه گزارش‌ها = دوره مالی فعال
   ═══════════════════════════════════════════════════════════════ */
(function defaultDates() {
    function getAP() {
        var p = DB.load('fiscalPeriods', []);
        return p.find(function(x) { return x.id === state.activePeriodId; });
    }
    function apply() {
        var ap = getAP();
        if (!ap) return;
        [['cf-from','cf-to'],['cfd-from','cfd-to'],['ra-from','ra-to'],
         ['rt-from','rt-to'],['rff-from','rff-to']].forEach(function(p) {
            var f = document.getElementById(p[0]), t = document.getElementById(p[1]);
            if (f && !f.value) f.value = ap.from;
            if (t && !t.value) t.value = ap.to;
        });
    }
    var lastPage = '';
    setInterval(function() {
        var active = document.querySelector('.page.active');
        if (!active) return;
        if (active.id === lastPage) return;
        lastPage = active.id;
        if (active.id && active.id.indexOf('report-') === 0) apply();
    }, 400);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(apply, 1800); });
    else setTimeout(apply, 1800);
})();

/* ═══════════════════════════════════════════════════════════════
   §6 — جستجو در شرح‌های استاندارد
   ═══════════════════════════════════════════════════════════════ */
(function fixStdDescSearch() {
    function setup() {
        var box = document.getElementById('std-desc-chips');
        if (!box) { setTimeout(setup, 700); return; }
        if (document.getElementById('std-desc-search')) return;
        var card = box.closest('.card');
        if (!card) return;
        var f = document.createElement('div');
        f.className = 'field';
        f.innerHTML = '<label>🔍 جستجو در شرح‌ها</label><input type="text" id="std-desc-search" placeholder="تایپ کن...">';
        card.insertBefore(f, box);
        function render(q) {
            q = (q || '').trim().toLowerCase();
            var list = DB.load('standardDescriptions', getDefaultStdDescriptions());
            box.innerHTML = '';
            var n = 0;
            list.forEach(function(v, i) {
                if (q && v.toLowerCase().indexOf(q) === -1) return;
                n++;
                var chip = document.createElement('span');
                chip.className = 'chip';
                chip.innerHTML = esc(v) + ' <button class="chip-del" data-i="' + i + '">×</button>';
                box.appendChild(chip);
            });
            box.querySelectorAll('.chip-del').forEach(function(b) {
                b.addEventListener('click', function() {
                    var idx = Number(this.getAttribute('data-i'));
                    var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
                    l.splice(idx, 1);
                    DB.save('standardDescriptions', l);
                    render(document.getElementById('std-desc-search').value);
                    if (typeof refreshStdDescDatalist === 'function') refreshStdDescDatalist();
                });
            });
            if (n === 0) box.innerHTML = '<div class="widget-empty">موردی یافت نشد.</div>';
        }
        document.getElementById('std-desc-search').addEventListener('input', function() { render(this.value); });
        // در هر رندر مجدد
        setInterval(function() {
            var searchVal = document.getElementById('std-desc-search');
            if (searchVal && searchVal.value) render(searchVal.value);
        }, 2000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(setup, 1200); });
    else setTimeout(setup, 1200);
})();

/* ═══════════════════════════════════════════════════════════════
   §7 — دو ستون جدید در خلاصه تسهیلات
   ═══════════════════════════════════════════════════════════════ */
(function facilityExtraColumns() {
    function computeBalances() {
        var facilities = DB.load('facilities', []);
        var vouchers = DB.load('vouchers', []);
        var map = {};
        facilities.forEach(function(f) {
            var bal = 0;
            if (f.moeinId) {
                vouchers.forEach(function(v) {
                    if (v.status !== 'approved') return;
                    (v.lines || []).forEach(function(l) {
                        if (l.account !== f.moeinId) return;
                        if (l.details && l.details.facility === f.id) {
                            bal += (Number(l.credit) || 0) - (Number(l.debit) || 0);
                        }
                    });
                });
            }
            map[f.id] = bal;
        });
        return map;
    }
    function parseNum(txt) {
        var t = normalizeDigits(String(txt || ''));
        var neg = /\(.*\)/.test(t);
        var v = Number(t.replace(/[^\d]/g, '')) || 0;
        return neg ? -v : v;
    }
    function augment() {
        var table = document.getElementById('rf-table');
        if (!table || table.dataset.fx40 === '1') return;
        table.dataset.fx40 = '1';
        var hr = table.querySelector('thead tr');
        if (!hr) return;
        var ths = Array.from(hr.querySelectorAll('th'));
        var remIdx = -1;
        ths.forEach(function(th, i) {
            if ((th.textContent || '').indexOf('مبلغ باقی') !== -1 && remIdx === -1) remIdx = i;
        });
        if (remIdx === -1) remIdx = 5;

        var bals = computeBalances();
        var facilities = DB.load('facilities', []);
        var hide = getHideState('rf');

        var thA = document.createElement('th');
        thA.textContent = 'مانده حسابداری';
        thA.style.cssText = 'background:linear-gradient(180deg,#dbeafe,#bfdbfe);color:#1e40af';
        var thB = document.createElement('th');
        thB.textContent = 'مغایرت با حسابداری';
        thB.style.cssText = 'background:linear-gradient(180deg,#fef3c7,#fde68a);color:#92400e';
        var refTh = ths[remIdx];
        if (refTh) {
            refTh.parentNode.insertBefore(thA, refTh.nextSibling);
            refTh.parentNode.insertBefore(thB, refTh.nextSibling);
        }

        var tbody = table.querySelector('tbody');
        var totalBal = 0, totalVar = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            var cells = tr.querySelectorAll('td');
            if (cells.length < 6) return;
            var name = (cells[0].textContent || '').trim();
            var f = facilities.find(function(x) { return x.name === name; });
            var bal = f ? (bals[f.id] || 0) : 0;
            var remTxt = cells[remIdx] ? cells[remIdx].textContent : '';
            var rem = (remTxt && remTxt !== '—') ? parseNum(remTxt) : 0;
            var variance = bal - rem;
            totalBal += bal; totalVar += variance;
            var tdA = document.createElement('td');
            tdA.className = 'num';
            tdA.style.cssText = 'color:#1e40af;font-weight:800';
            tdA.innerHTML = hide ? '—' : moneyHtml(bal);
            var tdB = document.createElement('td');
            tdB.className = 'num';
            tdB.style.cssText = 'font-weight:800;color:' + (Math.abs(variance) > 1 ? '#dc2626' : '#059669');
            tdB.innerHTML = hide ? '—' : moneyHtml(variance);
            var rc = cells[remIdx];
            if (rc) {
                rc.parentNode.insertBefore(tdA, rc.nextSibling);
                rc.parentNode.insertBefore(tdB, rc.nextSibling);
            }
        });

        var tfoot = table.querySelector('tfoot tr');
        if (tfoot) {
            var fcs = tfoot.querySelectorAll('td');
            if (fcs.length > remIdx) {
                var fcA = document.createElement('td');
                fcA.className = 'num';
                fcA.style.cssText = 'color:#1e40af;font-weight:800';
                fcA.innerHTML = hide ? '—' : moneyHtml(totalBal);
                var fcB = document.createElement('td');
                fcB.className = 'num';
                fcB.style.fontWeight = '800';
                fcB.style.color = Math.abs(totalVar) > 1 ? '#dc2626' : '#059669';
                fcB.innerHTML = hide ? '—' : moneyHtml(totalVar);
                var rf = fcs[remIdx];
                if (rf) {
                    rf.parentNode.insertBefore(fcA, rf.nextSibling);
                    rf.parentNode.insertBefore(fcB, rf.nextSibling);
                }
            }
        }
    }
    // trigger در هر بار رندر
    var lastLen = 0;
    setInterval(function() {
        var box = document.getElementById('rf-result');
        if (!box) return;
        var len = box.innerHTML.length;
        if (len !== lastLen) { lastLen = len; setTimeout(augment, 100); }
    }, 700);
})();

/* ═══════════════════════════════════════════════════════════════
   §8 — رنگ سبز/قرمز در تراز + گردش وجه نقد
   ═══════════════════════════════════════════════════════════════ */
(function colorTrial() {
    if (document.getElementById('color-rt-40')) return;
    var s = document.createElement('style');
    s.id = 'color-rt-40';
    s.textContent = ''
        + '#rt-table td.dr { color:#059669 !important; font-weight:800; }'
        + '#rt-table td.cr { color:#dc2626 !important; font-weight:800; }'
        + '#rt-table tfoot td.dr { color:#059669 !important; }'
        + '#rt-table tfoot td.cr { color:#dc2626 !important; }'
        + '#cfd-table td[style*="#1e9e6a"], #cfd-table td[style*="#059669"] { color:#059669 !important; font-weight:800 !important; }'
        + '#cfd-table td[style*="#c0392b"], #cfd-table td[style*="#dc2626"] { color:#dc2626 !important; font-weight:800 !important; }'
        + '#rt-table thead th:nth-child(3) { color:#059669 !important; }'
        + '#rt-table thead th:nth-child(4) { color:#dc2626 !important; }'
        + '#rt-table thead th:nth-child(5) { color:#059669 !important; }'
        + '#rt-table thead th:nth-child(6) { color:#dc2626 !important; }';
    document.head.appendChild(s);
})();

/* ═══════════════════════════════════════════════════════════════
   §9 — جابجایی الگوهای سند + درگ رویداد + دقیقه خودکار
   ═══════════════════════════════════════════════════════════════ */
(function reorderTemplates() {
    function move(idx, dir) {
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
        if (typeof window.renderTemplateList !== 'function') { setTimeout(patch, 900); return; }
        if (window._tplPatched40) return;
        window._tplPatched40 = true;
        var _orig = window.renderTemplateList;
        window.renderTemplateList = function() {
            _orig.apply(this, arguments);
            var box = document.getElementById('tpl-list-body');
            if (!box) return;
            var rows = box.querySelectorAll('.tpl-row');
            rows.forEach(function(row, idx) {
                if (row.querySelector('.tpl-mv-up')) return;
                var acts = row.querySelector('.row-actions');
                if (!acts) return;
                var up = document.createElement('button');
                up.className = 'row-btn edit tpl-mv-up';
                up.textContent = '↑';
                up.title = 'انتقال به بالا';
                up.style.color = '#3b82f6';
                if (idx === 0) up.disabled = true;
                up.addEventListener('click', function(e) { e.stopPropagation(); move(idx, -1); });
                var dn = document.createElement('button');
                dn.className = 'row-btn edit tpl-mv-dn';
                dn.textContent = '↓';
                dn.title = 'انتقال به پایین';
                dn.style.color = '#3b82f6';
                if (idx === rows.length - 1) dn.disabled = true;
                dn.addEventListener('click', function(e) { e.stopPropagation(); move(idx, 1); });
                acts.insertBefore(dn, acts.firstChild);
                acts.insertBefore(up, acts.firstChild);
            });
        };
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 2000); });
    else setTimeout(patch, 2000);
})();

(function dayViewDragAndMinute() {
    // درگ رویدادها در نمای روز
    setInterval(function() {
        var page = document.getElementById('page-jalali-calendar');
        if (!page) return;
        var grid = page.querySelector('.calg-wgrid.day');
        if (!grid) return;
        grid.querySelectorAll('.calg-wcell').forEach(function(cell) {
            if (cell.dataset.dr40 === '1') return;
            cell.dataset.dr40 = '1';
            cell.addEventListener('dragover', function(e) {
                e.preventDefault();
                cell.style.background = '#dbeafe';
                cell.style.outline = '2px dashed #3b82f6';
            });
            cell.addEventListener('dragleave', function() {
                cell.style.background = '';
                cell.style.outline = '';
            });
            cell.addEventListener('drop', function(e) {
                e.preventDefault(); e.stopPropagation();
                cell.style.background = ''; cell.style.outline = '';
                var evId = e.dataTransfer.getData('text/plain');
                if (!evId) return;
                var h = Number(cell.getAttribute('data-hour'));
                var d = cell.getAttribute('data-date');
                if (!h || !d) return;
                var list = DB.load('calendarUserEvents', []);
                var idx = list.findIndex(function(x) { return x.id === evId; });
                if (idx === -1) { showToast('⚠️ فقط رویدادهای شخصی قابل جابجایی هستند'); return; }
                var oldT = list[idx].time || '00:00';
                var m = '00';
                var pp = oldT.split(':');
                if (pp.length === 2) m = pp[1] || '00';
                list[idx].time = pad2(h) + ':' + m;
                list[idx].date = d;
                DB.save('calendarUserEvents', list);
                showToast('🕒 منتقل شد به ' + toFa(h) + ':' + toFa(m));
                if (typeof calRender === 'function') calRender();
            });
        });
        grid.querySelectorAll('.wev').forEach(function(ev) {
            if (ev.dataset.drS === '1') return;
            ev.dataset.drS = '1';
            ev.setAttribute('draggable', 'true');
            ev.style.cursor = 'grab';
            ev.addEventListener('dragstart', function(e) {
                var id = ev.getAttribute('data-ev');
                if (id) { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; ev.style.opacity = '0.5'; }
            });
            ev.addEventListener('dragend', function() { ev.style.opacity = ''; });
        });
    }, 900);

    // دقیقه خودکار
    setInterval(function() {
        var inp = document.getElementById('calg-time');
        if (!inp || inp.dataset.min40 === '1') return;
        inp.dataset.min40 = '1';
        inp.setAttribute('placeholder', 'HH:MM');
        inp.setAttribute('maxlength', '5');
        inp.addEventListener('input', function() {
            var v = this.value.replace(/[^\d:]/g, '');
            if (/^\d{2}$/.test(v)) { this.value = v + ':'; return; }
            this.value = v;
        });
        inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && /^\d{2}$/.test(this.value)) {
                e.preventDefault();
                this.value = this.value + ':';
            }
        });
    }, 700);
})();

/* ═══════════════════════════════════════════════════════════════
   §10 — اسکن هوشمند سند (کامل)
   ═══════════════════════════════════════════════════════════════ */
(function scanModule() {
    // حذف دکمه‌های قبلی
    ['voucher-scan-btn','scan-btn-v39'].forEach(function(id) {
        var b = document.getElementById(id); if (b) b.remove();
    });

    function norm(s) { return normalizeDigits(String(s || '')).replace(/[يى]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c\u200e\u200f]/g,' ').replace(/\s+/g,' ').trim(); }
    function normL(s) { return norm(s).toLowerCase(); }

    function findMoein(codeOrName) {
        if (!codeOrName) return null;
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        var code = normalizeDigits(String(codeOrName)).replace(/[^\d\-]/g, '');
        var name = normL(codeOrName);
        var hit = leaves.find(function(a) { return normalizeDigits(String(a.code)) === code; });
        if (hit) return hit;
        hit = leaves.find(function(a) { return normL(a.name) === name; });
        if (hit) return hit;
        hit = leaves.find(function(a) { return normL(a.name).indexOf(name) !== -1; });
        if (hit) return hit;
        var words = name.split(' ').filter(function(w) { return w.length > 2; });
        if (words.length) {
            var best = null, bs = 0;
            leaves.forEach(function(a) {
                var n = normL(a.name);
                var s = words.filter(function(w) { return n.indexOf(w) !== -1; }).length;
                if (s > bs) { bs = s; best = a; }
            });
            if (best) return best;
        }
        return null;
    }
    function fuzzyDetail(lt, hint) {
        if (!hint) return '';
        var items = getLinkedItems(lt);
        if (!items.length) return '';
        var h = normL(hint);
        var e = items.find(function(i) { return normL(getLinkedItemLabel(lt, i)) === h; });
        if (e) return e.id;
        var p = items.find(function(i) { return normL(getLinkedItemLabel(lt, i)).indexOf(h) !== -1; });
        if (p) return p.id;
        var p2 = items.find(function(i) { return h.indexOf(normL(getLinkedItemLabel(lt, i))) !== -1; });
        if (p2) return p2.id;
        var ws = h.split(' ').filter(function(w) { return w.length > 2; });
        if (!ws.length) return '';
        var best = null, bs = 0;
        items.forEach(function(it) {
            var lbl = normL(getLinkedItemLabel(lt, it));
            var s = ws.filter(function(w) { return lbl.indexOf(w) !== -1; }).length;
            if (s > bs) { bs = s; best = it; }
        });
        return best ? best.id : '';
    }
    function findDefaultCredit() {
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        var cbs = DB.load('cashBoxes', []);
        var banks = DB.load('bankAccounts', []);
        var wallet = cbs.find(function(c) { return /کیف\s*پول|wallet/i.test(c.title || ''); });
        if (wallet) {
            var ca = leaves.find(function(a) { return a.links && a.links.indexOf('cashbox') !== -1; });
            if (ca) return { acc: ca, details: { cashbox: wallet.id }, label: ca.name + ' — ' + wallet.title };
        }
        if (cbs.length) {
            var ca2 = leaves.find(function(a) { return a.links && a.links.indexOf('cashbox') !== -1; });
            if (ca2) return { acc: ca2, details: { cashbox: cbs[0].id }, label: ca2.name + ' — ' + cbs[0].title };
        }
        var bm = (typeof getBankMoeinId === 'function') ? getBankMoeinId() : '';
        if (bm && banks.length) {
            var ba = accounts.find(function(a) { return a.id === bm; });
            if (ba) return { acc: ba, details: { bank: banks[0].id }, label: ba.name + ' — ' + (banks[0].bank || '') };
        }
        var any = leaves.find(function(a) { return a.links && (a.links.indexOf('cashbox') !== -1 || a.links.indexOf('bank') !== -1); });
        if (any) return { acc: any, details: {}, label: any.name };
        return null;
    }

    function compress(dataUrl, maxW, q) {
        return new Promise(function(res) {
            var img = new Image();
            img.onload = function() {
                var w = img.width, h = img.height;
                if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
                var c = document.createElement('canvas');
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                try { res(c.toDataURL('image/jpeg', q)); } catch(e) { res(dataUrl); }
            };
            img.onerror = function() { res(dataUrl); };
            img.src = dataUrl;
        });
    }

    async function callVision(dataUrl) {
        if (!AI || !AI.apiKey) throw new Error('کلید API دستیار تنظیم نشده');
        if (typeof _aiDoFetch !== 'function') throw new Error('هسته AI بارگذاری نشده');
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        var accList = leaves.map(function(a) {
            var lk = (a.links && a.links.length) ? ' [نیازمند تفصیلی: ' + a.links.join(',') + ']' : '';
            return a.code + ' = ' + a.name + lk;
        }).join('\n');
        function list(k, fn) { var a = DB.load(k, []); var o = a.map(fn).filter(Boolean); return o.length ? o.join(' | ') : '(هیچ)'; }
        var prompt = [
            'این تصویر یک سند مالی است (فاکتور، پوز، رسید بانکی، دست‌نویس).',
            'همه اطلاعات را دقیق استخراج کن و فقط JSON خالص برگردان — بدون ```json، بدون توضیح.',
            '',
            '{',
            '  "date": "YYYY/MM/DD یا \\"\\"",',
            '  "description": "شرح کوتاه کل سند",',
            '  "total_amount_rial": عدد_صحیح,',
            '  "debit_lines": [',
            '    {',
            '      "account_code": "کد معین از لیست",',
            '      "amount_rial": عدد_صحیح,',
            '      "description": "شرح قلم",',
            '      "detail_hint": {"person":"","company":"","project":"","facility":""}',
            '    }',
            '  ]',
            '}',
            '',
            '⚠️ اگر تومان است × 10 کن. هر قلم یک ردیف. سمت بستانکار را نیاز نیست بنویسی.',
            '',
            '═══ معین‌ها ═══', accList || '(خالی)',
            '═══ اشخاص ═══', list('persons', function(p) { return (p.first||'')+' '+(p.last||''); }),
            '═══ شرکت‌ها ═══', list('companies', function(c) { return c.name; }),
            '═══ بانک‌ها ═══', list('bankAccounts', function(b) { return (b.bank||'')+(b.account?' - '+b.account:''); }),
            '═══ صندوق‌ها ═══', list('cashBoxes', function(c) { return c.title; }),
            '═══ پروژه‌ها ═══', list('projects', function(p) { return p.name; }),
            '═══ تسهیلات ═══', list('facilities', function(f) { return f.name; })
        ].join('\n');
        var models = ['gpt-4o-mini','gpt-4o','gemini-2.0-flash','gemini-1.5-flash', AI.model].filter(Boolean);
        models = models.filter(function(m, i) { return models.indexOf(m) === i; });
        var lastErr = null;
        for (var i = 0; i < models.length; i++) {
            try {
                var r = await _aiDoFetch(models[i], prompt, false, { dataUrl: dataUrl, name: 'scan.jpg' });
                if (r && r.content) return r.content;
            } catch (e) { lastErr = e; }
        }
        throw lastErr || new Error('تحلیل ناموفق');
    }

    function parseJson(txt) {
        if (!txt) return null;
        var s = txt.indexOf('{'), e = txt.lastIndexOf('}');
        if (s === -1 || e === -1) return null;
        var j = txt.substring(s, e + 1).replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
        try { return JSON.parse(j); } catch (err) { return null; }
    }

    function buildModal() {
        var old = document.getElementById('scan-m40'); if (old) old.remove();
        var oldO = document.getElementById('scan-o40'); if (oldO) oldO.remove();
        var html = ''
            + '<div id="scan-o40" class="overlay show" style="z-index:11000"></div>'
            + '<div id="scan-m40" class="modal show" style="max-width:680px;z-index:11010">'
            +   '<div class="modal-head" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)"><h2>📷 اسکن هوشمند سند</h2><button class="close-btn" id="scan-x40">×</button></div>'
            +   '<div class="modal-body" style="min-height:300px">'
            +     '<div id="scan-pick40">'
            +       '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
            +         '<button id="scan-cam40" class="btn-primary" style="flex:1;min-width:140px">📸 دوربین</button>'
            +         '<label class="btn-secondary" style="flex:1;min-width:140px;cursor:pointer;text-align:center;display:inline-flex;align-items:center;justify-content:center;padding:11px 20px">🖼 انتخاب فایل<input type="file" id="scan-f40" accept="image/*" style="display:none"></label>'
            +       '</div>'
            +       '<div id="scan-prev40" style="text-align:center;margin-bottom:12px;min-height:60px"></div>'
            +       '<video id="scan-v40" style="width:100%;border-radius:14px;display:none;background:#000;max-height:340px" autoplay playsinline muted></video>'
            +       '<div id="scan-s40" style="text-align:center;color:var(--text-muted);font-size:.85rem;min-height:34px;padding:8px;font-weight:700"></div>'
            +       '<button id="scan-cap40" class="btn-primary" style="display:none;width:100%;margin-top:8px">📸 گرفتن عکس</button>'
            +     '</div>'
            +     '<div id="scan-rev40" style="display:none">'
            +       '<div style="padding:12px 14px;background:#eef2ff;border-radius:12px;margin-bottom:14px;font-size:.82rem;color:#3730a3;line-height:1.9"><strong>🎯 اطلاعات استخراج‌شده — بررسی کن:</strong></div>'
            +       '<div id="scan-rev-body40"></div>'
            +     '</div>'
            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">'
            +     '<button id="scan-a40" class="btn-primary" disabled>🤖 تحلیل با AI</button>'
            +     '<button id="scan-ok40" class="btn-primary" style="display:none;background:linear-gradient(135deg,#10b981,#059669)">✅ اعمال در فرم</button>'
            +     '<button id="scan-back40" class="btn-secondary" style="display:none">↩ بازگشت</button>'
            +     '<button id="scan-c40" class="btn-secondary">انصراف</button>'
            +   '</div>'
            + '</div>';
        document.body.insertAdjacentHTML('beforeend', html);
        var st = { dataUrl: null, stream: null, extracted: null };
        function closeAll() {
            if (st.stream) { st.stream.getTracks().forEach(function(t) { t.stop(); }); st.stream = null; }
            var m = document.getElementById('scan-m40'); if (m) m.remove();
            var o = document.getElementById('scan-o40'); if (o) o.remove();
        }
        function status(t, c) { var el = document.getElementById('scan-s40'); if (el) { el.textContent = t; el.style.color = c || 'var(--text-muted)'; } }
        document.getElementById('scan-x40').onclick = closeAll;
        document.getElementById('scan-c40').onclick = closeAll;
        document.getElementById('scan-o40').onclick = closeAll;
        document.getElementById('scan-cam40').onclick = async function() {
            try {
                if (!navigator.mediaDevices) throw new Error('مرورگر پشتیبانی نمی‌کند');
                var s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
                st.stream = s;
                var v = document.getElementById('scan-v40');
                v.srcObject = s;
                v.style.display = 'block';
                document.getElementById('scan-cap40').style.display = 'block';
                status('🟢 دوربین فعال — کادر روی سند', '#059669');
            } catch(e) { status('⚠️ ' + (e.message || e), '#dc2626'); }
        };
        document.getElementById('scan-cap40').onclick = function() {
            var v = document.getElementById('scan-v40');
            if (!v.videoWidth) { status('⚠️ دوربین آماده نیست', '#dc2626'); return; }
            var c = document.createElement('canvas');
            c.width = v.videoWidth; c.height = v.videoHeight;
            c.getContext('2d').drawImage(v, 0, 0);
            st.dataUrl = c.toDataURL('image/jpeg', 0.9);
            renderPrev(st.dataUrl);
            if (st.stream) { st.stream.getTracks().forEach(function(t) { t.stop(); }); st.stream = null; }
            v.style.display = 'none'; this.style.display = 'none';
            status('📸 عکس آماده — «تحلیل با AI» بزن', '#1e40af');
            document.getElementById('scan-a40').disabled = false;
        };
        document.getElementById('scan-f40').onchange = function() {
            var f = this.files && this.files[0];
            if (!f) return;
            if (!/image/.test(f.type || '')) { status('⚠️ فایل تصویر نیست', '#dc2626'); return; }
            var r = new FileReader();
            r.onload = function(ev) {
                st.dataUrl = ev.target.result;
                renderPrev(ev.target.result);
                status('🖼 آماده — «تحلیل با AI» بزن', '#1e40af');
                document.getElementById('scan-a40').disabled = false;
            };
            r.readAsDataURL(f);
            this.value = '';
        };
        function renderPrev(url) {
            document.getElementById('scan-prev40').innerHTML = '<img src="' + url + '" style="max-width:100%;max-height:320px;border-radius:14px;border:1px solid var(--border);box-shadow:var(--shadow-md)">';
        }
        document.getElementById('scan-a40').onclick = async function() {
            if (!st.dataUrl) return;
            var b = this; b.disabled = true;
            status('🗜 فشرده‌سازی...', '#4f46e5');
            var small;
            try { small = await compress(st.dataUrl, 1400, 0.82); } catch(e) { small = st.dataUrl; }
            status('🤖 در حال تحلیل...', '#4f46e5');
            try {
                var txt = await callVision(small);
                var d = parseJson(txt);
                if (!d) throw new Error('پاسخ AI قابل تجزیه نبود');
                st.extracted = d;
                renderReview(d);
                status('✅ کامل — بررسی و تأیید', '#059669');
                document.getElementById('scan-pick40').style.display = 'none';
                document.getElementById('scan-rev40').style.display = '';
                document.getElementById('scan-ok40').style.display = '';
                document.getElementById('scan-back40').style.display = '';
                b.style.display = 'none';
            } catch(e) {
                status('⚠️ ' + (e.message || e), '#dc2626');
                b.disabled = false;
            }
        };
        document.getElementById('scan-back40').onclick = function() {
            document.getElementById('scan-pick40').style.display = '';
            document.getElementById('scan-rev40').style.display = 'none';
            document.getElementById('scan-ok40').style.display = 'none';
            this.style.display = 'none';
            var ab = document.getElementById('scan-a40');
            ab.style.display = ''; ab.disabled = false;
            status('🖼 می‌توانی عکس دیگری انتخاب کنی', 'var(--text-muted)');
        };
        document.getElementById('scan-ok40').onclick = function() {
            if (!st.extracted) return;
            try { applyData(st.extracted); closeAll(); }
            catch(e) { alert('⚠️ خطا: ' + (e.message || e)); }
        };
        function renderReview(d) {
            var box = document.getElementById('scan-rev-body40');
            var lines = Array.isArray(d.debit_lines) ? d.debit_lines : [];
            var total = Number(d.total_amount_rial) || lines.reduce(function(s, l) { return s + (Number(l.amount_rial) || 0); }, 0);
            var h = '';
            h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
              +  '<div style="padding:10px 12px;background:var(--card-alt);border-radius:10px;border:1px solid var(--border)"><div style="font-size:.7rem;color:var(--text-muted);font-weight:700">تاریخ</div><div style="font-weight:800;color:var(--primary-dark)" dir="ltr">' + (d.date ? toFa(esc(d.date)) : '—') + '</div></div>'
              +  '<div style="padding:10px 12px;background:var(--card-alt);border-radius:10px;border:1px solid var(--border)"><div style="font-size:.7rem;color:var(--text-muted);font-weight:700">مبلغ کل</div><div style="font-weight:800;color:var(--primary-dark)">' + (total ? formatMoney(total) + ' ' + currencyLabel() : '—') + '</div></div>'
              +  '</div>';
            if (d.description) h += '<div style="padding:10px 12px;background:var(--card-alt);border-radius:10px;border:1px solid var(--border);margin-bottom:12px"><div style="font-size:.7rem;color:var(--text-muted);font-weight:700">شرح</div><div style="font-weight:700">' + esc(d.description) + '</div></div>';
            if (lines.length === 0) { h += '<div class="widget-empty" style="padding:20px">⚠️ AI قلمی تشخیص نداد</div>'; box.innerHTML = h; return; }
            h += '<div style="font-weight:800;color:var(--primary-dark);margin-bottom:8px;font-size:.88rem">📋 ' + toFa(lines.length) + ' قلم:</div>';
            h += '<div style="overflow-x:auto;border-radius:12px;border:1px solid var(--border)"><table style="width:100%;border-collapse:collapse;font-size:.82rem">'
              +  '<thead><tr style="background:var(--primary-soft);color:var(--primary-dark)">'
              +  '<th style="padding:8px 10px;text-align:right">#</th>'
              +  '<th style="padding:8px 10px;text-align:right">حساب</th>'
              +  '<th style="padding:8px 10px;text-align:right">تفصیلی</th>'
              +  '<th style="padding:8px 10px;text-align:right">مبلغ</th>'
              +  '<th style="padding:8px 10px;text-align:right">شرح</th>'
              +  '</tr></thead><tbody>';
            lines.forEach(function(l, i) {
                var acc = findMoein(l.account_code);
                var accLbl = acc ? (acc.code + ' — ' + acc.name) : ('⚠️ ' + esc(l.account_code || '?'));
                var det = '—';
                if (l.detail_hint && acc && acc.links) {
                    var dp = [];
                    Object.keys(l.detail_hint).forEach(function(k) {
                        if (acc.links.indexOf(k) === -1) return;
                        var v = l.detail_hint[k]; if (!v) return;
                        var did = fuzzyDetail(k, v);
                        dp.push(linkTypeName(k) + ': ' + (did ? '✅ ' + getDetailLabel(k, did) : '❌ ' + v));
                    });
                    if (dp.length) det = dp.join(' • ');
                }
                h += '<tr style="border-top:1px solid var(--border)">'
                  +  '<td style="padding:8px 10px">' + toFa(i + 1) + '</td>'
                  +  '<td style="padding:8px 10px;font-weight:' + (acc ? '700' : '800') + ';color:' + (acc ? 'var(--text)' : '#dc2626') + '">' + accLbl + '</td>'
                  +  '<td style="padding:8px 10px;font-size:.76rem">' + det + '</td>'
                  +  '<td style="padding:8px 10px;font-weight:800;direction:ltr;text-align:center">' + (l.amount_rial ? formatMoney(Number(l.amount_rial)) : '—') + '</td>'
                  +  '<td style="padding:8px 10px">' + esc(l.description || '—') + '</td></tr>';
            });
            h += '</tbody></table></div>';
            var def = findDefaultCredit();
            if (def) h += '<div style="margin-top:12px;padding:10px 12px;background:#ecfdf5;border:1px solid #10b981;border-radius:10px;font-size:.82rem;color:#065f46"><strong>💳 بستانکار پیش‌فرض:</strong> ' + esc(def.label) + '</div>';
            box.innerHTML = h;
        }
    }

    function applyData(d) {
        var hasContent = false;
        try {
            var de = document.getElementById('v-desc');
            if (de && de.value && de.value.trim()) hasContent = true;
            if (Array.isArray(window.voucherLines)) {
                var val = window.voucherLines.filter(function(l) { return l && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0 || l.account); });
                if (val.length > 1) hasContent = true;
            }
        } catch(e) {}
        if (hasContent && !confirm('⚠️ فرم سند اطلاعات دارد.\n\nOK = جایگزینی\nCancel = انصراف')) return;
        document.getElementById('v-id').value = '';
        if (typeof getNextVoucherNumberForPeriod === 'function')
            document.getElementById('v-number').value = getNextVoucherNumberForPeriod(state.activePeriodId || '');
        var dt = document.getElementById('v-date');
        dt.value = (d.date && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(d.date)) ? d.date : todayJalaliStr();
        if (d.description) document.getElementById('v-desc').value = String(d.description).trim();
        var lines = [], total = 0;
        (Array.isArray(d.debit_lines) ? d.debit_lines : []).forEach(function(dl) {
            var amt = Number(dl.amount_rial) || 0;
            if (amt <= 0) return;
            var acc = findMoein(dl.account_code);
            var details = {};
            if (acc && acc.links && dl.detail_hint) {
                acc.links.forEach(function(lt) {
                    var hint = dl.detail_hint[lt];
                    if (!hint) return;
                    var f = fuzzyDetail(lt, hint);
                    if (f) details[lt] = f;
                });
            }
            lines.push({ id: uid(), account: acc ? acc.id : '', details: details, debit: amt, credit: 0, description: String(dl.description || d.description || '').trim() });
            total += amt;
        });
        if (lines.length === 0) {
            var ta = Number(d.total_amount_rial) || 0;
            lines.push({ id: uid(), account: '', details: {}, debit: ta, credit: 0, description: String(d.description || '').trim() });
            total = ta;
        }
        if (total > 0) {
            var def = findDefaultCredit();
            if (def && def.acc) {
                lines.push({ id: uid(), account: def.acc.id, details: def.details || {}, debit: 0, credit: total, description: 'پرداخت از ' + def.acc.name, locked: true });
            } else {
                lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: total, description: 'سمت بستانکار — تعیین کنید' });
            }
        }
        window.voucherLines = lines;
        if (typeof renderVoucherLines === 'function') renderVoucherLines();
        if (typeof goToPage === 'function') goToPage('voucher-new');
        if (typeof showToast === 'function') showToast('✅ اسکن اعمال شد — ' + toFa(lines.length) + ' قلم');
    }

    function injectBtn() {
        var page = document.getElementById('page-voucher-new');
        if (!page) return;
        var old = document.getElementById('scan-btn40'); if (old) return;
        var card = page.querySelector('#voucher-head-card');
        if (!card) return;
        var b = document.createElement('button');
        b.id = 'scan-btn40';
        b.type = 'button';
        b.style.cssText = 'margin-top:12px;width:100%;padding:13px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;border:none;border-radius:12px;font-family:inherit;font-weight:800;font-size:.92rem;cursor:pointer;box-shadow:0 4px 14px rgba(99,102,241,0.35)';
        b.innerHTML = '📷 اسکن هوشمند سند (فاکتور / پوز / دست‌نویس)';
        b.addEventListener('click', buildModal);
        var hr = card.querySelector('.voucher-head-row');
        if (hr) hr.parentNode.insertBefore(b, hr.nextSibling);
        else card.appendChild(b);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(injectBtn, 3200); });
    else setTimeout(injectBtn, 3200);
    setInterval(injectBtn, 4000);
})();

console.log('✅ پارسیس v40 — فایل واحد جامع بارگذاری شد (۱۰ درخواست + اسکن)');

})();
