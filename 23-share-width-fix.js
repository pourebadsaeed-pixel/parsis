/* =====================================================================
   پارسیس v44 — 23-share-width-fix.js
   رفع قطعی مشکل بریده شدن تصویر در عرض
   
   ✔ حذف max-width از همه‌ی container ها
   ✔ تنظیم عرض ریشه به max-content
   ✔ انتظار برای reflow قبل از capture
   ✔ تقسیم خودکار برای گزارش‌های بلند
   ===================================================================== */
'use strict';

(function shareImageFinalV44() {
    if (window._shareFinalV44) return;
    window._shareFinalV44 = true;

    console.log('🚀 [v44] نصب اشتراک‌گذاری تصویر نهایی...');

    /* ═══════════════════════════════════════════════════════
       باز کردن قفل عنصر: هم max-height هم max-width هم overflow
       ═══════════════════════════════════════════════════════ */
    function unlockElement(el) {
        if (!el || !el.style) return null;
        var cs = window.getComputedStyle(el);
        var saved = { el: el };
        var changed = false;

        // max-height
        if (cs.maxHeight && cs.maxHeight !== 'none') {
            saved.maxHeight = el.style.maxHeight;
            el.style.maxHeight = 'none';
            changed = true;
        }
        // max-width ★ این کلید مشکل بود
        if (cs.maxWidth && cs.maxWidth !== 'none' && cs.maxWidth !== 'auto') {
            saved.maxWidth = el.style.maxWidth;
            el.style.maxWidth = 'none';
            changed = true;
        }
        // overflow (همه‌ی جهات)
        if (cs.overflow && cs.overflow !== 'visible') {
            saved.overflow = el.style.overflow;
            el.style.overflow = 'visible';
            changed = true;
        }
        if (cs.overflowX && cs.overflowX !== 'visible') {
            saved.overflowX = el.style.overflowX;
            el.style.overflowX = 'visible';
            changed = true;
        }
        if (cs.overflowY && cs.overflowY !== 'visible') {
            saved.overflowY = el.style.overflowY;
            el.style.overflowY = 'visible';
            changed = true;
        }
        return changed ? saved : null;
    }

    function restoreElement(s) {
        if (!s || !s.el || !s.el.style) return;
        s.el.style.maxHeight = s.maxHeight || '';
        s.el.style.maxWidth = s.maxWidth || '';
        s.el.style.overflow = s.overflow || '';
        s.el.style.overflowX = s.overflowX || '';
        s.el.style.overflowY = s.overflowY || '';
    }

    /* ═══════════════════════════════════════════════════════
       محاسبه‌ی ابعاد واقعی
       ═══════════════════════════════════════════════════════ */
    function getFullSize(el) {
        // عرض واقعی: بزرگ‌ترین width از خود المان و همه‌ی فرزندان
        var w = Math.max(
            el.scrollWidth || 0,
            el.offsetWidth || 0,
            el.clientWidth || 0
        );
        var h = Math.max(
            el.scrollHeight || 0,
            el.offsetHeight || 0,
            el.clientHeight || 0
        );

        // جستجوی عمیق‌تر
        el.querySelectorAll('*').forEach(function (c) {
            var cw = Math.max(c.scrollWidth || 0, c.offsetWidth || 0);
            var ch = c.scrollHeight || 0;
            var co = c.offsetTop || 0;
            if (cw > w) w = cw;
            if (ch + co > h) h = ch + co;
        });

        return { width: Math.ceil(w), height: Math.ceil(h) };
    }

    /* ═══════════════════════════════════════════════════════
       تابع اصلی اشتراک‌گذاری
       ═══════════════════════════════════════════════════════ */
    window.shareAsImage = async function (el, title, filename) {
        if (!el) { showToast('محتوایی برای اشتراک نیست.'); return; }
        if (typeof loadHtml2Canvas !== 'function') {
            showToast('⚠️ کتابخانه یافت نشد'); return;
        }

        showToast('📸 آماده‌سازی تصویر با کیفیت بالا...');

        var h2c;
        try { h2c = await loadHtml2Canvas(); }
        catch (e) {
            showToast('⚠️ خطا در بارگذاری کتابخانه');
            if (typeof shareAsText === 'function' && typeof reportToText === 'function') {
                shareAsText(title || 'گزارش پارسیس', reportToText(el));
            }
            return;
        }

        /* ─── ۱) باز کردن کارت‌های collapsed ─── */
        var collapsedCards = [];
        el.querySelectorAll('.card.collapsed').forEach(function (card) {
            collapsedCards.push(card);
            card.classList.remove('collapsed');
            var btn = card.querySelector('.card-collapse-btn');
            if (btn) btn.classList.remove('collapsed');
        });

        /* ─── ۲) قفل اسکرول‌های داخل (بدون ریشه) ─── */
        var savedStyles = [];
        el.querySelectorAll('*').forEach(function (node) {
            var cs = window.getComputedStyle(node);
            var needsUnlock =
                (cs.maxHeight && cs.maxHeight !== 'none') ||
                (cs.maxWidth && cs.maxWidth !== 'none' && cs.maxWidth !== 'auto') ||
                (cs.overflow && cs.overflow !== 'visible') ||
                (cs.overflowX && cs.overflowX !== 'visible') ||
                (cs.overflowY && cs.overflowY !== 'visible');
            if (needsUnlock) {
                var sn = unlockElement(node);
                if (sn) savedStyles.push(sn);
            }
        });

        /* ─── ۳) ★ قفل ریشه: عرض به max-content ─── */
        var rootSaved = {
            width: el.style.width,
            minWidth: el.style.minWidth,
            maxWidth: el.style.maxWidth,
            overflow: el.style.overflow,
            overflowX: el.style.overflowX
        };
        el.style.width = 'max-content';
        el.style.minWidth = 'max-content';
        el.style.maxWidth = 'none';
        el.style.overflow = 'visible';
        el.style.overflowX = 'visible';

        /* ─── ۴) مخفی کردن ابزارها ─── */
        var hiddenNodes = [];
        var hideSel = '.share-btn,.widget-share-btn,.col-resizer,.col-reset-btn,.col-toggle-btn,.eye-toggle-btn,.filters-toggle-btn,.card-collapse-btn,.column-filter-row,.col-filter-menu,#col-filter-menu,.row-actions';
        el.querySelectorAll(hideSel).forEach(function (n) {
            if (n.style.display !== 'none') {
                hiddenNodes.push({ el: n, old: n.style.display });
                n.style.display = 'none';
            }
        });

        /* ─── ۵) انتظار برای reflow ─── */
        await new Promise(function (r) {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    setTimeout(r, 150);
                });
            });
        });

        /* ─── ۶) محاسبه‌ی ابعاد نهایی ─── */
        var size = getFullSize(el);
        console.log('📸 [v44] ابعاد کامل:', size.width, '×', size.height);

        /* ─── ۷) scale ─── */
        var dpr = window.devicePixelRatio || 1;
        var scale = Math.max(3, Math.ceil(dpr * 1.5));
        // اگر خیلی بزرگ شد، کاهش بده
        var maxPixels = 60 * 1000 * 1000;
        if (size.width * size.height * scale * scale > maxPixels) {
            scale = Math.max(2, Math.sqrt(maxPixels / (size.width * size.height)));
        }
        console.log('📸 [v44] scale:', scale.toFixed(2));

        /* ─── ۸) تقسیم به تکه‌ها ─── */
        var MAX_CHUNK_H = 3500;
        var chunkCount = Math.ceil(size.height / MAX_CHUNK_H);
        if (chunkCount < 1) chunkCount = 1;

        var oncloneFn = function (clonedDoc, clonedEl) {
            clonedEl.style.overflow = 'visible';
            clonedEl.style.maxHeight = 'none';
            clonedEl.style.maxWidth = 'none';
            clonedEl.style.height = 'auto';
            clonedEl.style.width = 'max-content';
            clonedEl.style.minWidth = 'max-content';
            clonedEl.querySelectorAll('*').forEach(function (node) {
                var cs = window.getComputedStyle(node);
                if (cs.overflow && cs.overflow !== 'visible') node.style.overflow = 'visible';
                if (cs.overflowX && cs.overflowX !== 'visible') node.style.overflowX = 'visible';
                if (cs.overflowY && cs.overflowY !== 'visible') node.style.overflowY = 'visible';
                if (cs.maxHeight && cs.maxHeight !== 'none') {
                    node.style.maxHeight = 'none';
                    node.style.height = 'auto';
                }
                if (cs.maxWidth && cs.maxWidth !== 'none' && cs.maxWidth !== 'auto') {
                    node.style.maxWidth = 'none';
                }
            });
            clonedEl.querySelectorAll(hideSel).forEach(function (n) { n.style.display = 'none'; });
        };

        var blobs = [];
        var safeName = (filename || 'parsis-report') + '-' + todayJalaliStr().replace(/\//g, '-');

        try {
            for (var i = 0; i < chunkCount; i++) {
                var y = i * MAX_CHUNK_H;
                var h = Math.min(MAX_CHUNK_H, size.height - y);

                if (chunkCount > 1) {
                    showToast('📸 آماده‌سازی تکه ' + toFa(i + 1) + ' از ' + toFa(chunkCount) + '...');
                }

                var canvas = await h2c(el, {
                    backgroundColor: '#ffffff',
                    scale: scale,
                    useCORS: true,
                    allowTaint: false,
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    x: 0,
                    y: y,
                    width: size.width,
                    height: h,
                    windowWidth: size.width,
                    windowHeight: size.height,
                    onclone: oncloneFn
                });

                var blob = await new Promise(function (resolve, reject) {
                    canvas.toBlob(function (b) {
                        if (b) resolve(b); else reject(new Error('toBlob failed'));
                    }, 'image/png');
                });

                blobs.push(blob);
                console.log('📸 [v44] تکه ' + (i + 1) + ':', (blob.size / 1024).toFixed(0), 'KB');
            }
        } catch (e) {
            console.error('❌ [v44] خطا:', e);
            restore();
            showToast('⚠️ خطا در ساخت تصویر');
            return;
        }

        /* ─── ۹) بازگردانی ─── */
        function restore() {
            savedStyles.forEach(restoreElement);
            el.style.width = rootSaved.width || '';
            el.style.minWidth = rootSaved.minWidth || '';
            el.style.maxWidth = rootSaved.maxWidth || '';
            el.style.overflow = rootSaved.overflow || '';
            el.style.overflowX = rootSaved.overflowX || '';
            collapsedCards.forEach(function (c) {
                c.classList.add('collapsed');
                var btn = c.querySelector('.card-collapse-btn');
                if (btn) btn.classList.add('collapsed');
            });
            hiddenNodes.forEach(function (x) { x.el.style.display = x.old; });
        }
        restore();

        /* ─── ۱۰) ساخت فایل‌ها ─── */
        var files = blobs.map(function (blob, i) {
            var name = blobs.length > 1
                ? safeName + '-part' + (i + 1) + '.png'
                : safeName + '.png';
            return new File([blob], name, { type: 'image/png' });
        });

        var shareTitle = title || 'گزارش پارسیس';

        /* ─── ۱۱) Web Share ─── */
        if (navigator.canShare && navigator.canShare({ files: files })) {
            try {
                await navigator.share({
                    files: files,
                    title: shareTitle,
                    text: shareTitle
                });
                showToast('✅ ' + toFa(files.length) + ' تصویر اشتراک شد.');
                return;
            } catch (e) {
                if (e && e.name === 'AbortError') return;
                console.warn('⚠️ [v44] Web Share failed:', e);
            }
        }

        /* ─── ۱۲) Fallback دانلود ─── */
        files.forEach(function (file, i) {
            var url = URL.createObjectURL(file);
            setTimeout(function () {
                var a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
            }, i * 400);
        });
        showToast('💾 ' + toFa(files.length) + ' تصویر دانلود شد.');
    };

    console.log('✅ [v44] اشتراک‌گذاری با عرض کامل نصب شد');
})();
