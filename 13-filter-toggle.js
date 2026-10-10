/* =====================================================================
   پارسیس v27 — 13-filter-toggle.js
   رفع مشکل فضای اضافی ناشی از ردیف فیلتر:
   - ردیف فیلتر به‌صورت پیش‌فرض مخفی می‌شود
   - دکمه 🔍 در هدر هر فهرست برای نمایش/مخفی
   - حذف input فیلتر از ستون‌های «عملیات» و ستون آخر
   - ذخیره‌ی وضعیت در localStorage
   ===================================================================== */
'use strict';

(function () {
    var STORAGE_KEY = 'parsis.tableFiltersVisible';

    /* ==================== CSS ==================== */
    var css = ''
        + 'tr.column-filter-row { display: none; }'
        + 'body.show-table-filters tr.column-filter-row { display: table-row; }'
        + '.filters-toggle-btn {'
        +   'background: var(--card-solid); color: var(--primary-dark);'
        +   'border: 1.5px solid var(--border); width: 36px; height: 34px;'
        +   'border-radius: 10px; font-size: 1rem; cursor: pointer; padding: 0;'
        +   'display: inline-flex; align-items: center; justify-content: center;'
        +   'transition: all 0.25s;'
        + '}'
        + '.filters-toggle-btn:hover { border-color: var(--primary); background: var(--primary-soft); }'
        + '.filters-toggle-btn.active { background: var(--gradient-accent); color: #fff; border-color: transparent; }'
        + 'body.show-table-filters .filters-toggle-btn {'
        +   'background: var(--gradient-accent); color: #fff; border-color: transparent;'
        + '}';
    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    /* ==================== پاکسازی ستون عملیات ==================== */
    function isActionsHeader(th) {
        if (!th) return true;
        var txt = (th.textContent || '').trim().toLowerCase();
        if (!txt) return true;
        if (/^عملیات|^actions?$|^action$/.test(txt)) return true;
        return false;
    }

    function cleanActionsColumn() {
        var rows = document.querySelectorAll('tr.column-filter-row');
        rows.forEach(function (row) {
            var thead = row.parentNode;
            if (!thead) return;
            var headerRow = null;
            var allTrs = thead.querySelectorAll('tr');
            for (var i = 0; i < allTrs.length; i++) {
                if (!allTrs[i].classList.contains('column-filter-row')) {
                    headerRow = allTrs[i]; break;
                }
            }
            if (!headerRow) return;
            var headerThs = headerRow.children;
            var cells = row.children;
            for (var j = 0; j < cells.length; j++) {
                if (isActionsHeader(headerThs[j])) {
                    // خالی کردن input/button و تنظیم استایل
                    cells[j].innerHTML = '';
                    cells[j].style.background = 'transparent';
                    cells[j].style.borderBottom = '1px solid var(--border)';
                    cells[j].style.padding = '0';
                    cells[j].style.minWidth = '0';
                }
            }
        });
    }

    /* ==================== دکمه‌ی toggle در هدرها ==================== */
    function addToggleButtons() {
        var headers = document.querySelectorAll('.list-header');
        headers.forEach(function (h) {
            if (h.querySelector('.filters-toggle-btn')) return;
            // اگه هدر هیچ جدولی نداره، اضافه نکن
            var card = h.closest('.card');
            if (card && !card.querySelector('table.data-table, table.report-table, table.cf-table')) return;

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filters-toggle-btn';
            btn.textContent = '🔍';
            btn.title = 'نمایش/مخفی کردن ردیف فیلترها';
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var visible = document.body.classList.toggle('show-table-filters');
                try {
                    localStorage.setItem(STORAGE_KEY, visible ? '1' : '0');
                } catch (err) {}
                updateButtons();
            });
            // در انتها اضافه کن (قبل از eye/col-toggle که buildHeaderButtons اضافه کرده)
            h.appendChild(btn);
        });
        updateButtons();
    }

    function updateButtons() {
        var visible = document.body.classList.contains('show-table-filters');
        document.querySelectorAll('.filters-toggle-btn').forEach(function (b) {
            b.classList.toggle('active', visible);
        });
    }

    /* ==================== بازیابی وضعیت از localStorage ==================== */
    function restoreState() {
        try {
            if (localStorage.getItem(STORAGE_KEY) === '1') {
                document.body.classList.add('show-table-filters');
            }
        } catch (err) {}
        updateButtons();
    }

    /* ==================== Observer برای جداول جدید ==================== */
    var observer = null;
    function startObserver() {
        if (observer) return;
        observer = new MutationObserver(function (mutations) {
            var needsClean = false;
            var needsBtn = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type !== 'childList') continue;
                var t = m.target;
                if (!t || !t.querySelector) continue;
                // اگه ردیف فیلتر جدید اضافه شده
                if (t.tagName === 'THEAD' || t.querySelector('tr.column-filter-row')) {
                    needsClean = true;
                }
                // اگه list-header جدید اضافه شده
                if (t.classList && t.classList.contains('list-header')) {
                    needsBtn = true;
                }
                if (t.querySelector && t.querySelector('.list-header')) {
                    needsBtn = true;
                }
            }
            if (needsClean) setTimeout(cleanActionsColumn, 50);
            if (needsBtn) setTimeout(addToggleButtons, 50);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ==================== Init ==================== */
    function init() {
        restoreState();
        cleanActionsColumn();
        addToggleButtons();
        startObserver();

        // چک دوره‌ای برای جداولی که با innerHTML بازنویسی می‌شوند
        setInterval(function () {
            cleanActionsColumn();
            addToggleButtons();
        }, 1500);

        console.log('✨ 13-filter-toggle.js loaded — filter row hidden by default');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1200); });
    } else {
        setTimeout(init, 1200);
    }
})();
