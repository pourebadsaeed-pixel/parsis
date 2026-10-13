/* =====================================================================
   پارسیس v43 — 22-share-hq.js
   اشتراک‌گذاری تصویر با کیفیت بسیار بالا + تقسیم خودکار تصاویر بلند
   
   ✔ تقسیم خودکار به چند تکه برای گزارش‌های بلند
   ✔ scale حداقل ۳ برای وضوح بالا
   ✔ ارسال همه‌ی تکه‌ها با Web Share API (یک جا)
   ✔ fallback: دانلود همه‌ی تکه‌ها
   ===================================================================== */
'use strict';

(function shareImageHQ() {
    if (window._shareHQV43) return;
    window._shareHQV43 = true;

    console.log('🚀 [v43] نصب اشتراک‌گذاری کیفیت بالا...');

    /* ═══════════════════════════════════════════════════════
       ۱) باز کردن قفل اسکرول
       ═══════════════════════════════════════════════════════ */
    function unlockElement(el) {
        if (!el || !el.style) return null;
        var cs = window.getComputedStyle(el);
        var saved = {
            el: el,
            maxHeight: el.style.maxHeight,
            height: el.style.height,
            overflow: el.style.overflow,
            overflowX: el.style.overflowX,
            overflowY: el.style.overflowY
        };
        var changed = false;
        if (cs.maxHeight && cs.maxHeight !== 'none') { el.style.maxHeight = 'none'; changed = true; }
        if (cs.overflow && cs.overflow !== 'visible') { el.style.overflow = 'visible'; changed = true; }
        if (cs.overflowX && cs.overflowX !== 'visible') { el.style.overflowX = 'visible'; changed = true; }
        if (cs.overflowY && cs.overflowY !== 'visible') { el.style.overflowY = 'visible'; changed = true; }
        return changed ? saved : null;
    }

    function restoreElement(s) {
        if (!s || !s.el || !s.el.style) return;
        s.el.style.maxHeight = s.maxHeight || '';
        s.el.style.height = s.height || '';
        s.el.style.overflow = s.overflow || '';
        s.el.style.overflowX = s.overflowX || '';
        s.el.style.overflowY = s.overflowY || '';
    }

    /* ═══════════════════════════════════════════════════════
       ۲) محاسبه‌ی ابعاد کامل
       ═══════════════════════════════════════════════════════ */
    function getFullSize(el) {
        var w = Math.max(el.scrollWidth || 0, el.offsetWidth || 0, el.clientWidth || 0);
        var h = Math.max(el.scrollHeight || 0, el.offsetHeight || 0, el.clientHeight || 0);
        el.querySelectorAll('*').forEach(function(c) {
            if (c.scrollHeight > h) h = c.scrollHeight + (c.offsetTop || 0);
            if (c.scrollWidth > w) w = c.scrollWidth;
        });
        return { width: Math.ceil(w), height: Math.ceil(h) };
    }

    /* ═══════════════════════════════════════════════════════
       ۳) رندر یک تکه
       ═══════════════════════════════════════════════════════ */
    async function renderChunk(h2c, el, opts) {
        var canvas = await h2c(el, opts);
        return await new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (blob) resolve(blob);
                else reject(new Error('toBlob failed'));
            }, 'image/png');
        });
    }

    /* ═══════════════════════════════════════════════════════
       ۴) تابع اصلی
       ═══════════════════════════════════════════════════════ */
    window.shareAsImage = async function(el, title, filename) {
        if (!el) { showToast('محتوایی برای اشتراک نیست.'); return; }
        if (typeof loadHtml2Canvas !== 'function') { showToast('⚠️ کتابخانه یافت نشد'); return; }

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

        // ★ ۱. باز کردن کارت‌های collapsed
        var collapsedCards = [];
        el.querySelectorAll('.card.collapsed').forEach(function(card) {
            collapsedCards.push(card);
            card.classList.remove('collapsed');
            var btn = card.querySelector('.card-collapse-btn');
            if (btn) btn.classList.remove('collapsed');
        });

        // ★ ۲. قفل اسکرول‌ها
        var savedStyles = [];
        var s = unlockElement(el); if (s) savedStyles.push(s);
        el.querySelectorAll('*').forEach(function(node) {
            if (node.scrollHeight > node.clientHeight + 5 || node.scrollWidth > node.clientWidth + 5) {
                var sn = unlockElement(node);
                if (sn) savedStyles.push(sn);
            }
        });

        // ★ ۳. مخفی کردن ابزارها
        var hiddenNodes = [];
        var hideSel = '.share-btn,.widget-share-btn,.col-resizer,.col-reset-btn,.col-toggle-btn,.eye-toggle-btn,.filters-toggle-btn,.card-collapse-btn,.column-filter-row,.col-filter-menu,#col-filter-menu,.row-actions,.ar-turnover-btn';
        el.querySelectorAll(hideSel).forEach(function(n) {
            if (n.style.display !== 'none') {
                hiddenNodes.push({ el: n, old: n.style.display });
                n.style.display = 'none';
            }
        });

        // ★ ۴. انتظار کوتاه
        await new Promise(function(r) { setTimeout(r, 250); });

        // ★ ۵. ابعاد
        var size = getFullSize(el);
        console.log('📸 [v43] ابعاد کامل:', size.width, '×', size.height);

        // ★ ۶. مقیاس — حداقل ۳ برای وضوح
        var dpr = window.devicePixelRatio || 1;
        var scale = Math.max(3, Math.ceil(dpr * 1.5));
        console.log('📸 [v43] scale:', scale);

        // ★ ۷. حداکثر ارتفاع هر تکه (قبل از scale)
        var MAX_CHUNK_H = 3500;
        var needSplit = size.height > MAX_CHUNK_H * 1.3;

        // آماده‌سازی onclone (در همه‌ی مسیرها)
        var oncloneFn = function(clonedDoc, clonedEl) {
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
            clonedEl.querySelectorAll(hideSel).forEach(function(n) { n.style.display = 'none'; });
        };

        var blobs = [];
        var safeName = (filename || 'parsis-report') + '-' + todayJalaliStr().replace(/\//g, '-');

        try {
            if (needSplit) {
                // ★ مسیر ۱: تقسیم به چند تکه
                var chunkCount = Math.ceil(size.height / MAX_CHUNK_H);
                console.log('📸 [v43] تقسیم به', chunkCount, 'تکه');

                for (var i = 0; i < chunkCount; i++) {
                    var y = i * MAX_CHUNK_H;
                    var h = Math.min(MAX_CHUNK_H, size.height - y);
                    showToast('📸 آماده‌سازی تکه ' + toFa(i+1) + ' از ' + toFa(chunkCount) + '...');

                    var blob = await renderChunk(h2c, el, {
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
                    blobs.push(blob);
                    console.log('📸 [v43] تکه', i+1, ':', (blob.size/1024).toFixed(0), 'KB');
                }
            } else {
                // ★ مسیر ۲: یک تصویر
                console.log('📸 [v43] یک تصویر کامل');
                var blob2 = await renderChunk(h2c, el, {
                    backgroundColor: '#ffffff',
                    scale: scale,
                    useCORS: true,
                    allowTaint: false,
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    x: 0,
                    y: 0,
                    width: size.width,
                    height: size.height,
                    windowWidth: size.width,
                    windowHeight: size.height,
                    onclone: oncloneFn
                });
                blobs.push(blob2);
                console.log('📸 [v43] حجم:', (blob2.size/1024).toFixed(0), 'KB');
            }
        } catch (e) {
            console.error('❌ [v43] خطا:', e);
            restore();
            showToast('⚠️ خطا در ساخت تصویر — سوئیچ به متن');
            if (typeof shareAsText === 'function' && typeof reportToText === 'function') {
                shareAsText(title || 'گزارش پارسیس', reportToText(el));
            }
            return;
        }

        // ★ بازگردانی
        restore();
        function restore() {
            savedStyles.forEach(restoreElement);
            collapsedCards.forEach(function(c) {
                c.classList.add('collapsed');
                var btn = c.querySelector('.card-collapse-btn');
                if (btn) btn.classList.add('collapsed');
            });
            hiddenNodes.forEach(function(x) { x.el.style.display = x.old; });
        }

        // ★ ۸. ساخت فایل‌ها
        var files = blobs.map(function(blob, i) {
            var name = blobs.length > 1
                ? safeName + '-part' + (i+1) + '.png'
                : safeName + '.png';
            return new File([blob], name, { type: 'image/png' });
        });

        var shareTitle = title || 'گزارش پارسیس';

        // ★ ۹. Web Share API با همه‌ی فایل‌ها
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
                console.warn('⚠️ [v43] Web Share failed:', e);
            }
        }

        // ★ ۱۰. Fallback: دانلود همه
        files.forEach(function(file, i) {
            var url = URL.createObjectURL(file);
            setTimeout(function() {
                var a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
            }, i * 300); // با تاخیر بین دانلودها
        });
        showToast('💾 ' + toFa(files.length) + ' تصویر دانلود شد.');
    };

    console.log('✅ [v43] اشتراک‌گذاری کیفیت بالا نصب شد');
})();
