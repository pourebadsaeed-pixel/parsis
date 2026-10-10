/* =====================================================================
   پارسیس v27 — 14-close-all.js
   دکمه «بستن همه فرم‌ها» زیر سلول جستجوی sidebar:
   - همه مودال‌ها، overlayها، popupها، تقویم، ماشین‌حساب، منوها رو می‌بنده
   - TTS و ضبط صدا رو متوقف می‌کنه
   - نیازی به رفرش مرورگر نیست
   ===================================================================== */
'use strict';

(function () {

    /* ==================== تابع اصلی: بستن همه ==================== */
    function closeEverything() {
        var closedCount = 0;

        // ۱) همه modalها و overlayها
        var selects = [
            '.modal.show',
            '.overlay.show',
            '.cal-popup.show',
            '.cal-overlay.show',
            '.ai-modal.show',
            '.ai-overlay.show',
            '.img-preview-modal.show'
        ];
        selects.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) {
                el.classList.remove('show');
                closedCount++;
            });
        });

        // ۲) مودال‌های داینامیک (با id مشخص)
        var dynamicIds = [
            'tts-diag-modal', 'tts-diag-overlay',
            'sms-patterns-modal', 'sms-patterns-overlay',
            'sms-edit-modal', 'sms-edit-overlay',
            'col-filter-menu'
        ];
        dynamicIds.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { el.remove(); closedCount++; }
        });

        // ۳) منوی ستون‌ها
        var colMenu = document.getElementById('col-menu');
        if (colMenu && !colMenu.classList.contains('hidden')) {
            colMenu.classList.add('hidden');
            closedCount++;
        }

        // ۴) توقف TTS و ضبط صدا
        try {
            if (typeof window.aiStopSpeaking === 'function') window.aiStopSpeaking();
            if (typeof window.aiStopVoice === 'function') window.aiStopVoice();
        } catch (e) {}

        // ۵) بستن سایدبار
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('overlay');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        }

        // ۶) پاک کردن حالت focus از ورودی‌ها
        if (document.activeElement && document.activeElement.blur) {
            try { document.activeElement.blur(); } catch (e) {}
        }

        // ۷) اسکرول به بالا
        try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            window.scrollTo(0, 0);
        }

        return closedCount;
    }

    /* ==================== تزریق دکمه در sidebar ==================== */
    function injectButton() {
        // اگه قبلاً اضافه شده، دوباره اضافه نکن
        if (document.getElementById('close-all-forms-btn')) return true;

        var searchBox = document.querySelector('.sidebar-search');
        if (!searchBox) return false;

        var wrap = document.createElement('div');
        wrap.className = 'sidebar-close-all-wrap';
        wrap.style.cssText = 'padding:8px 12px 4px 12px;border-bottom:1px solid var(--border)';

        var btn = document.createElement('button');
        btn.id = 'close-all-forms-btn';
        btn.type = 'button';
        btn.innerHTML = '🧹 بستن همه فرم‌ها';
        btn.title = 'بستن همه مودال‌ها، پنجره‌ها و فرم‌های باز (بدون رفرش)';
        btn.style.cssText = [
            'width:100%',
            'padding:10px 14px',
            'background:linear-gradient(135deg,#fee2e2,#fecaca)',
            'color:#991b1b',
            'border:1px solid #fca5a5',
            'border-radius:10px',
            'font-family:inherit',
            'font-size:.82rem',
            'font-weight:800',
            'cursor:pointer',
            'transition:transform .2s,box-shadow .2s'
        ].join(';');

        btn.addEventListener('mouseenter', function () {
            btn.style.transform = 'translateY(-1px)';
            btn.style.boxShadow = '0 6px 16px rgba(220,38,38,.2)';
        });
        btn.addEventListener('mouseleave', function () {
            btn.style.transform = '';
            btn.style.boxShadow = '';
        });

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var n = closeEverything();
            if (typeof window.showToast === 'function') {
                window.showToast('🧹 همه فرم‌ها بسته شد (' + n + ' مورد)', 1800);
            }
        });

        wrap.appendChild(btn);

        // بعد از search box اضافه کن
        searchBox.parentNode.insertBefore(wrap, searchBox.nextSibling);
        return true;
    }

    /* ==================== راه‌اندازی ==================== */
    function init() {
        if (injectButton()) {
            console.log('✨ 14-close-all.js — دکمه در sidebar اضافه شد');
            return;
        }
        // اگه sidebar هنوز لود نشده، دوباره تلاش کن
        var tries = 0;
        var interval = setInterval(function () {
            tries++;
            if (injectButton() || tries > 20) {
                clearInterval(interval);
                if (tries <= 20) {
                    console.log('✨ 14-close-all.js — دکمه در sidebar اضافه شد (تأخیر)');
                } else {
                    console.warn('⚠️ 14-close-all.js — sidebar پیدا نشد');
                }
            }
        }, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 400); });
    } else {
        setTimeout(init, 400);
    }

    // در دسترس بودن تابع برای کنسول
    window.closeAllForms = closeEverything;
})();
