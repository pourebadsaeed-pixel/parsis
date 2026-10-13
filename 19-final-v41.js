/* =====================================================================
   پارسیس v41 — 19-final-v41.js
   رفع نهایی دو مشکل باقی‌مانده:
   ۱) غیرفعال‌سازی reminder قدیمی (جلوگیری از نوتیف تکراری)
   ۲) کولاپس مودال تنظیمات (آکاردئون)
   ===================================================================== */
'use strict';

/* ═══════════════════════════════════════════════════════════════
   ۱) غیرفعال کردن reminder قدیمی از 16-calendar-v37.js
   چون notifStack41 در 18-calendar-v40.js با استک زیبا کار می‌کند
   ═══════════════════════════════════════════════════════════════ */
(function disableOldReminder() {
    // جایگزینی با تابع خالی تا reminder قدیمی چیزی نشان ندهد
    window.showReminderModal = function() { /* no-op */ };

    // پاک کردن مودال‌های بازمانده
    function cleanup() {
        var m = document.getElementById('reminder-modal');
        var o = document.getElementById('reminder-overlay');
        if (m) m.remove();
        if (o) o.remove();
    }
    setTimeout(cleanup, 1000);
    setInterval(cleanup, 5000);

    console.log('✅ [v41] reminder قدیمی غیرفعال شد — فقط notifStack41 فعال است');
})();

/* ═══════════════════════════════════════════════════════════════
   ۲) کولاپس مودال تنظیمات (تبدیل modal-section به details)
   ═══════════════════════════════════════════════════════════════ */
(function collapseSettings() {
    function convert() {
        var modal = document.getElementById('settings-modal');
        if (!modal || modal.dataset.collapseV41 === '1') return;
        modal.dataset.collapseV41 = '1';
        var body = modal.querySelector('.modal-body');
        if (!body) return;

        var sections = Array.from(body.querySelectorAll('.modal-section'));
        sections.forEach(function(sec) {
            var h3 = sec.querySelector('h3');
            if (!h3) return;
            var title = h3.textContent.trim();

            // حذف سکشن ویجت‌های فعال/غیرفعال (به لیست ترتیب منتقل شده)
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
            wrap.style.padding = '0 8px 12px 8px';
            Array.from(sec.childNodes).forEach(function(n) {
                if (n !== h3) wrap.appendChild(n);
            });
            det.appendChild(wrap);
            sec.parentNode.replaceChild(det, sec);
        });

        // دکمه‌های باز/بستن همه
        var btns = document.createElement('div');
        btns.className = 'settings-expand-btns';
        btns.innerHTML =
            '<button class="mini-btn" id="set-expand-all-v41">باز کردن همه</button>' +
            '<button class="mini-btn" id="set-collapse-all-v41">بستن همه</button>';
        body.insertBefore(btns, body.firstChild);

        document.getElementById('set-expand-all-v41').addEventListener('click', function() {
            body.querySelectorAll('details.settings-details').forEach(function(d) { d.open = true; });
        });
        document.getElementById('set-collapse-all-v41').addEventListener('click', function() {
            body.querySelectorAll('details.settings-details').forEach(function(d) { d.open = false; });
        });

        console.log('✅ [v41] تنظیمات کولاپس شد');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(convert, 1200); });
    } else {
        setTimeout(convert, 1200);
    }
})();

/* ═══════════════════════════════════════════════════════════════
   ۳) نمایش بخش ویجت‌ها در ترتیب (اگر حذف شده) با تیک فعال/غیرفعال
   ═══════════════════════════════════════════════════════════════ */
(function ensureWidgetCheckboxes() {
    function patch() {
        if (typeof window.renderWidgetOrderUI !== 'function') {
            setTimeout(patch, 600);
            return;
        }
        if (window._widgetCheckPatchedV41) return;
        window._widgetCheckPatchedV41 = true;

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
                for (var p = 1; p <= 3; p++)
                    sel += '<option value="' + p + '"' + (curPage === p ? ' selected' : '') + '>صفحه ' + toFa(p) + '</option>';
                sel += '</select>';
                var checked = state.widgets[key] ? 'checked' : '';
                row.innerHTML =
                    '<label class="wo-name" style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0">' +
                        '<input type="checkbox" data-widget-check="' + key + '" ' + checked + ' style="width:17px;height:17px;accent-color:var(--primary);flex-shrink:0">' +
                        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (names[key] || key) + '</span>' +
                    '</label>' + sel +
                    '<div class="wo-btns">' +
                        '<button class="wo-btn" data-key="' + key + '" data-dir="-1"' + (idx === 0 ? ' disabled' : '') + '>↑</button>' +
                        '<button class="wo-btn" data-key="' + key + '" data-dir="1"' + (idx === order.length - 1 ? ' disabled' : '') + '>↓</button>' +
                    '</div>';
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
        document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 1500); });
    } else {
        setTimeout(patch, 1500);
    }
})();

console.log('✅ [v44] پارسیس — نسخه نهایی پایدار');
