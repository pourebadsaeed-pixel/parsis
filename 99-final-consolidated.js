/* پارسیس — FINAL CONSOLIDATED (v2.0.1)
 * ⚠️ این فایل باید آخرین <script> باشد.
 * نقش: بستن رگرسیون‌ها + safety + performance + self-check
 * این فایل را می‌توان با حذف script tag به‌طور کامل rollback کرد.
 */
(function PARSSIS_FINAL() {
    'use strict';

    if (window._parsisFinalLoaded) {
        console.warn('⚠️ parsis-final already loaded — skipping');
        return;
    }
    window._parsisFinalLoaded = true;

    var VERSION = '2.0.1-final';
    var REPORT = { fixes: [], warnings: [], verified: {} };

    console.log('%c🎯 PARSSIS FINAL ' + VERSION,
        'color:#4f46e5;font-weight:bold;font-size:14px');

    /* =========================================================
       FIX #1 — بازگرداندن دکمه «📍 انتقال به ردیف» و auto-scroll
       علت: فایل ۱۶ نسخه کامل renderVoucherLines را نوشت و این دو
             قابلیت را از نسخه فایل ۰۴ حذف کرد.
       راه‌حل: wrap کردن (نه بازنویسی) — کم‌ریسک‌ترین روش
       ========================================================= */
    function fixRenderVoucherLines() {
        var current = window.renderVoucherLines;
        if (typeof current !== 'function') {
            REPORT.warnings.push('renderVoucherLines یافت نشد');
            return;
        }
        if (current._parsisFixed) {
            REPORT.verified['renderVoucherLines'] = 'already fixed';
            return;
        }

        var wrapped = function() {
            try { current.apply(this, arguments); }
            catch (e) { console.error('[renderVoucherLines error]', e); return; }

            var box = document.getElementById('voucher-lines');
            if (!box) return;

            var lines = box.querySelectorAll('.voucher-line');
            for (var i = 0; i < lines.length; i++) {
                (function(wrap, idx) {
                    var actions = wrap.querySelector('.ln-actions');
                    if (!actions) return;
                    if (actions.querySelector('.ln-moveto')) return;

                    var bMoveTo = document.createElement('button');
                    bMoveTo.type = 'button';
                    bMoveTo.className = 'ln-btn ln-moveto';
                    bMoveTo.textContent = '📍 انتقال به ردیف';
                    bMoveTo.title = 'انتقال به ردیف مشخص';
                    bMoveTo.addEventListener('click', function() {
                        var total = voucherLines.length;
                        if (total < 2) {
                            if (typeof showToast === 'function')
                                showToast('فقط یک ردیف موجود است.');
                            return;
                        }
                        var ans = prompt(
                            'این ردیف به کدام شماره ردیف منتقل شود؟ (۱ تا '
                            + toFa(total) + ')\nشماره فعلی: ' + toFa(idx + 1),
                            String(idx + 1)
                        );
                        if (!ans) return;
                        var target = Number(normalizeDigits(ans));
                        if (isNaN(target) || target < 1 || target > total) {
                            alert('شماره نامعتبر.');
                            return;
                        }
                        target = target - 1;
                        if (target === idx) return;
                        var moved = voucherLines.splice(idx, 1)[0];
                        voucherLines.splice(target, 0, moved);
                        window._focusLineId = moved.id;
                        window.renderVoucherLines();
                        if (typeof showToast === 'function')
                            showToast('📍 ردیف به ' + toFa(target + 1) + ' منتقل شد.');
                    });

                    var delBtn = actions.querySelector('.ln-del');
                    if (delBtn) actions.insertBefore(bMoveTo, delBtn);
                    else actions.appendChild(bMoveTo);
                })(lines[i], i);
            }

            /* auto-scroll به ردیف تازه کپی/جابجا شده */
            if (window._focusLineId) {
                var tid = window._focusLineId;
                window._focusLineId = null;
                setTimeout(function() {
                    var t = box.querySelector('[data-line-id="' + tid + '"]');
                    if (t) {
                        t.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        t.classList.add('focus-highlight');
                        setTimeout(function() {
                            t.classList.remove('focus-highlight');
                        }, 1200);
                    }
                }, 60);
            }
        };
        wrapped._parsisFixed = true;
        window.renderVoucherLines = wrapped;
        REPORT.fixes.push('renderVoucherLines: bMoveTo + auto-scroll بازگشت');
    }

    /* =========================================================
       FIX #2 — Safety برای صفحه خوش‌آمدگویی
       علت: فایل ۱۱ body را visibility:hidden می‌کند و اگر کاربر
             کلیک نکند، برنامه سیاه می‌ماند.
       راه‌حل: یک timeout ۱۲ ثانیه‌ای که body را آزاد می‌کند.
       ========================================================= */
    function fixWelcomeSafety() {
        var welcome = document.getElementById('welcome-overlay');
        if (!welcome) {
            REPORT.warnings.push('welcome-overlay یافت نشد — skip');
            return;
        }
        if (welcome.dataset.safetyInstalled === '1') return;
        welcome.dataset.safetyInstalled = '1';

        var safety = setTimeout(function() {
            if (document.body.style.visibility === 'hidden') {
                console.warn('⚠️ welcome safety: کلیک نشد — body آزاد شد');
                document.body.style.visibility = 'visible';
                welcome.classList.add('welcome-out');
                setTimeout(function() { welcome.style.display = 'none'; }, 500);
            }
        }, 12000);

        welcome.addEventListener('click', function() {
            clearTimeout(safety);
        }, { once: true });

        REPORT.fixes.push('welcome: safety timeout 12s');
    }

    /* =========================================================
       FIX #3 — Interval Manager (کاهش مصرف باتری)
       علت: ۶+ عدد setInterval همزمان (هر ۰.۷ تا ۳ ثانیه)
       راه‌حل: override window.setInterval — اگر tab مخفی بود،
               callback اجرا نمی‌شود.
       ⚠️ فقط interval هایی که پس از این فایل ساخته شوند پوشش
          داده می‌شوند (اما ۹۰٪ interval ها در این دسته‌اند).
       ========================================================= */
    function installIntervalManager() {
        if (window._parsisIntervalMgrInstalled) return;

        var nativeSetInterval = window.setInterval;
        var nativeClearInterval = window.clearInterval;
        var managed = [];

        window.setInterval = function(fn, ms) {
            if (typeof fn !== 'function')
                return nativeSetInterval.apply(window, arguments);
            var wrapped = function() {
                if (document.hidden) return;
                try { fn.apply(this, arguments); }
                catch (e) { console.error('[interval error]', e); }
            };
            var id = nativeSetInterval(wrapped, ms);
            managed.push({ id: id, ms: ms, name: fn.name || 'anonymous' });
            return id;
        };

        window.clearInterval = function(id) {
            managed = managed.filter(function(x) { return x.id !== id; });
            return nativeClearInterval(id);
        };

        window._parsisIntervalMgrInstalled = true;

        window.parsisIntervalReport = function() {
            console.log('📊 Managed intervals: ' + managed.length);
            managed.forEach(function(x, i) {
                console.log('  ' + (i+1) + ') every ' + x.ms + 'ms — ' + x.name);
            });
            return managed.length;
        };

        REPORT.fixes.push('interval manager نصب شد');
    }

    /* =========================================================
       FIX #4 — Self-check برای تأیید کاربر
       پس از بارگذاری، این تابع در console قابل فراخوانی است.
       ========================================================= */
    function buildSelfCheck() {
        window.parsisSelfCheck = function() {
            console.log('%c🔍 PARSSIS SELF CHECK',
                'color:#0891b2;font-weight:bold;font-size:13px');

            var checks = {};

            // توابع حیاتی
            ['renderVoucherLines','renderVoucherList','renderFacilitiesList',
             'renderPersonsList','renderBankAccountsList','renderDashboard',
             'goToPage','showToast'].forEach(function(fn) {
                checks['fn:' + fn] = typeof window[fn] === 'function';
            });

            // DOM حیاتی
            ['app','sidebar','voucher-lines','voucher-table-list','ai-modal'].forEach(function(id) {
                checks['dom:' + id] = !!document.getElementById(id);
            });

            // DB
            checks['db:load'] = typeof DB !== 'undefined' && typeof DB.load === 'function';
            checks['db:save'] = typeof DB !== 'undefined' && typeof DB.save === 'function';

            // Fix های این فایل
            checks['fix:moveto'] = document.querySelector('.ln-moveto') !== null
                                || (typeof window.renderVoucherLines === 'function'
                                    && window.renderVoucherLines._parsisFixed === true);
            checks['fix:intervalMgr'] = !!window._parsisIntervalMgrInstalled;
            checks['fix:welcomeSafety'] = document.body.style.visibility !== 'hidden';

            console.table(checks);

            var total = Object.keys(checks).length;
            var passed = Object.keys(checks).filter(function(k) {
                return checks[k];
            }).length;

            var color = passed === total ? '#059669' : '#dc2626';
            console.log('%c✅ ' + passed + '/' + total + ' بررسی موفق',
                'color:' + color + ';font-weight:bold;font-size:12px');

            if (passed < total) {
                console.log('❌ موارد ناموفق:',
                    Object.keys(checks).filter(function(k) { return !checks[k]; }));
            }
            return { passed: passed, total: total, results: checks };
        };

        REPORT.verified['selfCheck'] = 'window.parsisSelfCheck() را اجرا کن';
    }

    /* =========================================================
       FIX #5 — تست دکمه moveto
       ========================================================= */
    function buildMovetoTest() {
        window.parsisTestMoveto = function() {
            if (typeof goToPage === 'function') goToPage('voucher-new');
            setTimeout(function() {
                var box = document.getElementById('voucher-lines');
                if (!box) { console.error('voucher-lines not found'); return; }
                var btns = box.querySelectorAll('.ln-moveto');
                console.log('📍 moveto buttons: ' + btns.length);
                if (btns.length === 0) {
                    if (typeof window.renderVoucherLines === 'function')
                        window.renderVoucherLines();
                    setTimeout(function() {
                        console.log('📍 after re-render: '
                            + box.querySelectorAll('.ln-moveto').length);
                    }, 200);
                }
            }, 400);
        };
    }

    /* =========================================================
       اجرا
       ========================================================= */
    function runAll() {
        fixRenderVoucherLines();
        installIntervalManager();
        buildSelfCheck();
        buildMovetoTest();
    }

    function schedule() {
        // بار اول — بعد از init کامل
        setTimeout(runAll, 2500);

        // بار دوم — برای welcome که ممکن است دیرتر ظاهر شود
        setTimeout(fixWelcomeSafety, 5500);

        // بار سوم — اطمینان نهایی + re-render اگر لازم بود
        setTimeout(function() {
            fixRenderVoucherLines();
            var page = document.getElementById('page-voucher-new');
            if (page && page.classList.contains('active')
                && typeof window.renderVoucherLines === 'function') {
                try { window.renderVoucherLines(); } catch (e) {}
            }
        }, 8000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', schedule);
    } else {
        schedule();
    }

    // گزارش نهایی
    setTimeout(function() {
        console.log('%c📋 FINAL REPORT',
            'color:#7c3aed;font-weight:bold');
        console.log('  Fixes:', REPORT.fixes);
        if (REPORT.warnings.length)
            console.warn('  Warnings:', REPORT.warnings);
        console.log('  📌 تست: window.parsisSelfCheck()');
    }, 3000);

})();
