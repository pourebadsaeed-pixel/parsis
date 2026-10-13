/* =====================================================================
   پارسیس v42 — 21-share-image.js
   رفع کامل اشتراک‌گذاری تصویر:
   ✔ گرفتن کل تصویر (نه فقط بخش visible)
   ✔ باز کردن موقت همه اسکرول‌ها و max-height ها
   ✔ کیفیت بالا (scale هوشمند بر اساس اندازه‌ی محتوا)
   ✔ باز کردن کارت‌های collapsed قبل از capture
   ✔ پشتیبانی از Web Share API + fallback دانلود
   ===================================================================== */
'use strict';

(function fixShareAsImage() {
    if (window._shareImageV42) return;
    window._shareImageV42 = true;

    /* ═══════════════════════════════════════════════════════════
       ۱) باز کردن قفل اسکرول روی خود المان و والدها
       ═══════════════════════════════════════════════════════════ */
    function unlockElement(el) {
        if (!el || !el.style) return;
        var cs = window.getComputedStyle(el);
        var changed = false;
        var saved = {
            el: el,
            maxHeight: el.style.maxHeight,
            height: el.style.height,
            overflow: el.style.overflow,
            overflowX: el.style.overflowX,
            overflowY: el.style.overflowY,
            whiteSpace: el.style.whiteSpace
        };

        if (cs.maxHeight && cs.maxHeight !== 'none') {
            el.style.maxHeight = 'none';
            changed = true;
        }
        if (cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflow === 'hidden') {
            el.style.overflow = 'visible';
            changed = true;
        }
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowX === 'hidden') {
            el.style.overflowX = 'visible';
            changed = true;
        }
        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflowY === 'hidden') {
            el.style.overflowY = 'visible';
            changed = true;
        }
        return changed ? saved : null;
    }

    function restoreElement(saved) {
        if (!saved || !saved.el || !saved.el.style) return;
        saved.el.style.maxHeight = saved.maxHeight || '';
        saved.el.style.height = saved.height || '';
        saved.el.style.overflow = saved.overflow || '';
        saved.el.style.overflowX = saved.overflowX || '';
        saved.el.style.overflowY = saved.overflowY || '';
        saved.el.style.whiteSpace = saved.whiteSpace || '';
    }

    /* ═══════════════════════════════════════════════════════════
       ۲) تشخیص عرض و ارتفاع کامل عنصر (شامل محتوای خارج از viewport)
       ═══════════════════════════════════════════════════════════ */
    function getFullSize(el) {
        var w = 0, h = 0;
        // بهترین حالت: از خود المان
        w = Math.max(w, el.scrollWidth || 0, el.offsetWidth || 0, el.clientWidth || 0);
        h = Math.max(h, el.scrollHeight || 0, el.offsetHeight || 0, el.clientHeight || 0);
        // از فرزندان قابل اسکرول هم بررسی کن
        el.querySelectorAll('*').forEach(function(child) {
            if (child.scrollHeight > h) h = child.scrollHeight + (child.offsetTop || 0);
            if (child.scrollWidth > w) w = child.scrollWidth;
        });
        return { width: Math.ceil(w), height: Math.ceil(h) };
    }

    /* ═══════════════════════════════════════════════════════════
       ۳) تابع اصلی اشتراک‌گذاری
       ═══════════════════════════════════════════════════════════ */
    async function shareAsImageV42(el, title, filename) {
        if (!el) { showToast('محتوایی برای اشتراک نیست.'); return; }
        if (typeof loadHtml2Canvas !== 'function') { showToast('⚠️ کتابخانه html2canvas یافت نشد'); return; }

        showToast('📸 در حال آماده‌سازی تصویر با کیفیت بالا...');

        var h2c;
        try {
            h2c = await loadHtml2Canvas();
        } catch (e) {
            showToast('⚠️ خطا در بارگذاری کتابخانه — سوئیچ به متن');
            if (typeof shareAsText === 'function' && typeof reportToText === 'function') {
                shareAsText(title || 'گزارش پارسیس', reportToText(el));
            }
            return;
        }

        // ★ ۱. باز کردن قفل کارت‌های collapsed
        var collapsedCards = [];
        el.querySelectorAll('.card.collapsed').forEach(function(card) {
            collapsedCards.push(card);
            card.classList.remove('collapsed');
            var btn = card.querySelector('.card-collapse-btn');
            if (btn) btn.classList.remove('collapsed');
        });

        // ★ ۲. باز کردن قفل اسکرول در خود المان
        var savedStyles = [];
        var s = unlockElement(el);
        if (s) savedStyles.push(s);

        // ★ ۳. باز کردن قفل اسکرول در تمام فرزندان
        el.querySelectorAll('*').forEach(function(node) {
            if (node.scrollHeight > node.clientHeight + 5 ||
                node.scrollWidth > node.clientWidth + 5) {
                var sn = unlockElement(node);
                if (sn) savedStyles.push(sn);
            }
        });

        // ★ ۴. مخفی کردن دکمه‌های عملیات و ابزارها
        var hiddenNodes = [];
        var hideSelectors = [
            '.share-btn', '.widget-share-btn', '.col-resizer', '.col-reset-btn',
            '.col-toggle-btn', '.eye-toggle-btn', '.filters-toggle-btn',
            '.card-collapse-btn', '.column-filter-row', '.col-filter-menu',
            '#col-filter-menu', '.row-actions', '.ar-turnover-btn'
        ].join(', ');
        el.querySelectorAll(hideSelectors).forEach(function(node) {
            if (node.style.display !== 'none') {
                hiddenNodes.push({ el: node, old: node.style.display });
                node.style.display = 'none';
            }
        });

        // ★ ۵. انتظار کوتاه برای اعمال تغییرات DOM
        await new Promise(function(resolve) { setTimeout(resolve, 200); });

        // ★ ۶. محاسبه‌ی ابعاد کامل
        var fullSize = getFullSize(el);
        console.log('📸 [v42] ابعاد کامل:', fullSize.width, 'x', fullSize.height);

        // ★ ۷. تعیین scale با کیفیت بالا
        var dpr = window.devicePixelRatio || 1;
        var scale = Math.max(dpr, 2); // حداقل ۲
        if (fullSize.width * fullSize.height < 500000) scale = 4; // کوچک → scale بالاتر
        else if (fullSize.width * fullSize.height < 2000000) scale = 3;
        else scale = 2.5;

        // ★ ۸. محدود کردن به ۵۰ مگاپیکسل برای جلوگیری از crash
        var maxPixels = 50 * 1000 * 1000;
        var estimated = fullSize.width * fullSize.height * scale * scale;
        if (estimated > maxPixels) {
            scale = Math.sqrt(maxPixels / (fullSize.width * fullSize.height));
            scale = Math.max(1.5, scale);
        }
        console.log('📸 [v42] scale نهایی:', scale.toFixed(2));

        // ★ ۹. رندر با html2canvas
        var canvas;
        try {
            canvas = await h2c(el, {
                backgroundColor: '#ffffff',
                scale: scale,
                useCORS: true,
                allowTaint: false,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                width: fullSize.width,
                height: fullSize.height,
                windowWidth: fullSize.width,
                windowHeight: fullSize.height,
                // ★ حذف کامل محدودیت‌ها در نسخه‌ی کلون‌شده
                onclone: function(clonedDoc, clonedEl) {
                    clonedEl.style.overflow = 'visible';
                    clonedEl.style.maxHeight = 'none';
                    clonedEl.style.height = 'auto';
                    clonedEl.querySelectorAll('*').forEach(function(node) {
                        var cs = window.getComputedStyle(node);
                        if (cs.overflow && cs.overflow !== 'visible') node.style.overflow = 'visible';
                        if (cs.overflowX && cs.overflowX !== 'visible') node.style.overflowX = 'visible';
                        if (cs.overflowY && cs.overflowY !== 'visible') node.style.overflowY = 'visible';
                        if (cs.maxHeight && cs.maxHeight !== 'none') {
                            node.style.maxHeight = 'none';
                            node.style.height = 'auto';
                        }
                    });
                    // حذف دکمه‌های اضافی در نسخه کلون
                    clonedEl.querySelectorAll(hideSelectors).forEach(function(n) {
                        n.style.display = 'none';
                    });
                }
            });
        } catch (e) {
            console.error('❌ [v42] html2canvas error:', e);
            // بازگردانی
            restoreAll();
            showToast('⚠️ خطا در ساخت تصویر — سوئیچ به متن');
            if (typeof shareAsText === 'function' && typeof reportToText === 'function') {
                shareAsText(title || 'گزارش پارسیس', reportToText(el));
            }
            return;
        }

        // ★ ۱۰. بازگردانی همه‌ی تغییرات
        restoreAll();

        function restoreAll() {
            savedStyles.forEach(restoreElement);
            collapsedCards.forEach(function(c) {
                c.classList.add('collapsed');
                var btn = c.querySelector('.card-collapse-btn');
                if (btn) btn.classList.add('collapsed');
            });
            hiddenNodes.forEach(function(x) { x.el.style.display = x.old; });
        }

        // ★ ۱۱. تبدیل به فایل PNG با کیفیت کامل (بدون افت)
        canvas.toBlob(async function(blob) {
            if (!blob) { showToast('❌ ساخت تصویر ناموفق بود'); return; }

            var safeName = (filename || 'parsis-report') + '-' + todayJalaliStr().replace(/\//g, '-') + '.png';
            var file = new File([blob], safeName, { type: 'image/png' });
            var shareTitle = title || 'گزارش پارسیس';

            console.log('📸 [v42] حجم تصویر:', (blob.size / 1024).toFixed(0), 'KB');

            // ★ تلاش برای Web Share API
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: shareTitle,
                        text: shareTitle
                    });
                    showToast('✅ تصویر اشتراک شد.');
                    return;
                } catch (e) {
                    if (e && e.name === 'AbortError') return;
                    console.warn('⚠️ [v42] Web Share failed:', e);
                }
            }

            // ★ fallback: دانلود
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = safeName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
            showToast('💾 تصویر با کیفیت ' + (blob.size / 1024 / 1024).toFixed(1) + 'MB ذخیره شد.');
        }, 'image/png'); // PNG = بدون افت کیفیت
    }

    // ★ جایگزینی قطعی تابع قبلی
    window.shareAsImage = shareAsImageV42;

    console.log('✅ [v42] پچ اشتراک‌گذاری تصویر (کیفیت بالا + full content) نصب شد');
})();
