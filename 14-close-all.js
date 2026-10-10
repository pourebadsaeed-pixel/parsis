/* =====================================================================
   پارسیس v27 — 14-close-all.js (v2 — با فرم تب‌ها)
   - نمایش فرم‌های باز به صورت تب در زیر topbar
   - کلیک روی تب → بازگشت به همون فرم (با حفظ داده)
   - × روی تب → بستن (با تأیید اگه داده ذخیره‌نشده باشه)
   - دکمه «🧹 بستن همه فرم‌ها» → بستن همه تب‌ها بدون رفرش
   ===================================================================== */
'use strict';

(function () {

    /* ==================== CSS ==================== */
    var css = ''
        + '.form-tabs-bar{display:flex;gap:4px;padding:6px 10px;background:var(--card-solid);'
        + 'border-bottom:1px solid var(--border);overflow-x:auto;overflow-y:hidden;'
        + 'position:sticky;z-index:49;scrollbar-width:thin;-webkit-overflow-scrolling:touch;'
        + 'box-shadow:0 2px 6px rgba(15,23,42,.04)}'
        + '.form-tabs-bar::-webkit-scrollbar{height:4px}'
        + '.form-tabs-bar::-webkit-scrollbar-thumb{background:var(--primary-light);border-radius:2px}'
        + '.form-tab{display:flex;align-items:center;gap:6px;padding:6px 10px;'
        + 'background:var(--card-alt);border:1px solid var(--border);border-radius:8px;'
        + 'font-family:inherit;font-size:.78rem;font-weight:700;color:var(--text-muted);'
        + 'cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .2s;'
        + 'user-select:none;max-width:220px}'
        + '.form-tab:hover{background:var(--primary-soft);border-color:var(--primary);color:var(--primary-dark);transform:translateY(-1px)}'
        + '.form-tab.active{background:var(--gradient-accent);color:#fff;border-color:transparent;'
        + 'box-shadow:0 2px 8px rgba(99,102,241,.25)}'
        + '.form-tab .ft-icon{font-size:.9rem;line-height:1}'
        + '.form-tab .ft-title{overflow:hidden;text-overflow:ellipsis;max-width:130px}'
        + '.form-tab .ft-close{background:rgba(0,0,0,.08);color:inherit;border:none;'
        + 'width:18px;height:18px;border-radius:4px;font-size:.9rem;line-height:1;'
        + 'cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;'
        + 'margin-right:-4px;transition:background .15s}'
        + '.form-tab.active .ft-close{background:rgba(255,255,255,.25)}'
        + '.form-tab .ft-close:hover{background:rgba(220,38,38,.85);color:#fff}'
        + '@media (max-width:480px){'
        + '.form-tab .ft-title{max-width:80px}'
        + '.form-tab{padding:5px 8px;font-size:.72rem}'
        + '}';
    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    /* ==================== State ==================== */
    var TAB_STATE = {
        tabs: [{ id: 'home', title: 'صفحه اصلی', icon: '🏠' }],
        active: 'home',
        max: 12
    };

    /* ==================== Helpers ==================== */
    function getPageMeta(pageId) {
        if (pageId === 'home') return { title: 'صفحه اصلی', icon: '🏠' };
        var btn = document.querySelector('.nav-group-items button[data-page="' + pageId + '"]');
        if (!btn) return { title: pageId, icon: '📄' };
        var clone = btn.cloneNode(true);
        var badge = clone.querySelector('.nav-badge');
        if (badge) badge.remove();
        var txt = (clone.textContent || '').trim().replace(/\s+/g, ' ');
        if (!txt) return { title: pageId, icon: '📄' };
        var parts = txt.split(' ');
        var icon = parts[0];
        var title = parts.slice(1).join(' ') || txt;
        var cc = icon && icon.charCodeAt(0);
        if (!cc || cc < 0x2000) { icon = '📄'; title = txt; }
        return { title: title, icon: icon };
    }

    function hasUnsavedData(pageId) {
        if (pageId === 'voucher-new') {
            try {
                var desc = document.getElementById('v-desc');
                if (desc && desc.value && desc.value.trim()) return true;
                if (typeof voucherLines !== 'undefined' && Array.isArray(voucherLines)) {
                    var meaningful = voucherLines.filter(function (l) {
                        if (!l) return false;
                        if (l.account) return true;
                        if (Number(l.debit) > 0) return true;
                        if (Number(l.credit) > 0) return true;
                        if (l.description && String(l.description).trim()) return true;
                        return false;
                    });
                    return meaningful.length > 0;
                }
            } catch (e) {}
        }
        return false;
    }

    function clearFormData(pageId) {
        if (pageId === 'voucher-new') {
            try {
                if (typeof newVoucherForm === 'function') newVoucherForm();
            } catch (e) { console.warn('clearFormData error:', e); }
        }
    }

    /* ==================== Tab Bar ==================== */
    function ensureTabBar() {
        var bar = document.getElementById('form-tabs-bar');
        if (bar) return bar;
        var topbar = document.querySelector('.topbar');
        if (!topbar) return null;
        bar = document.createElement('div');
        bar.id = 'form-tabs-bar';
        bar.className = 'form-tabs-bar';
        bar.style.display = 'none';
        topbar.parentNode.insertBefore(bar, topbar.nextSibling);
        function setStickyTop() {
            try { bar.style.top = topbar.offsetHeight + 'px'; } catch (e) {}
        }
        setStickyTop();
        window.addEventListener('resize', setStickyTop);
        return bar;
    }

    function renderTabs() {
        var bar = ensureTabBar();
        if (!bar) return;
        if (TAB_STATE.tabs.length <= 1) {
            bar.style.display = 'none';
            return;
        }
        bar.style.display = '';
        bar.innerHTML = '';

        TAB_STATE.tabs.forEach(function (t) {
            var tab = document.createElement('div');
            tab.className = 'form-tab' + (t.id === TAB_STATE.active ? ' active' : '');
            tab.dataset.page = t.id;
            tab.title = t.title;

            var icon = document.createElement('span');
            icon.className = 'ft-icon';
            icon.textContent = t.icon || '📄';

            var title = document.createElement('span');
            title.className = 'ft-title';
            title.textContent = t.title || t.id;

            tab.appendChild(icon);
            tab.appendChild(title);

            if (t.id !== 'home') {
                var closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'ft-close';
                closeBtn.textContent = '×';
                closeBtn.title = 'بستن این تب';
                closeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    closeTab(t.id);
                });
                tab.appendChild(closeBtn);
            }

            tab.addEventListener('click', function () {
                if (TAB_STATE.active === t.id) return;
                switchToTab(t.id);
            });

            bar.appendChild(tab);
        });

        setTimeout(function () {
            var activeEl = bar.querySelector('.form-tab.active');
            if (activeEl && activeEl.scrollIntoView) {
                try { activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
            }
        }, 30);
    }

    function switchToTab(pageId) {
        var orig = window._origGoToPage;
        if (typeof orig === 'function') orig(pageId);
        TAB_STATE.active = pageId;
        renderTabs();
    }

    function closeTab(pageId) {
        if (pageId === 'home') return;
        var idx = -1;
        for (var i = 0; i < TAB_STATE.tabs.length; i++) {
            if (TAB_STATE.tabs[i].id === pageId) { idx = i; break; }
        }
        if (idx === -1) return;

        if (hasUnsavedData(pageId)) {
            if (!confirm('این فرم داده‌های ذخیره‌نشده دارد.\n\nOK = بستن و از دست دادن داده‌ها\nCancel = انصراف')) return;
            clearFormData(pageId);
        }

        var wasActive = TAB_STATE.active === pageId;
        TAB_STATE.tabs.splice(idx, 1);

        if (wasActive) {
            var prevIdx = Math.min(idx - 1, TAB_STATE.tabs.length - 1);
            if (prevIdx < 0) prevIdx = 0;
            var prev = TAB_STATE.tabs[prevIdx];
            if (prev) { switchToTab(prev.id); return; }
        }
        renderTabs();
    }

    function closeAllTabs() {
        var nonHome = TAB_STATE.tabs.filter(function (t) { return t.id !== 'home'; });
        if (nonHome.length === 0) {
            if (typeof showToast === 'function') showToast('فرم بازی وجود ندارد');
            return;
        }

        var anyDirty = false;
        nonHome.forEach(function (t) { if (hasUnsavedData(t.id)) anyDirty = true; });

        if (anyDirty) {
            if (!confirm('بعضی فرم‌ها داده‌های ذخیره‌نشده دارند.\n\nOK = بستن همه و از دست دادن داده‌ها\nCancel = انصراف')) return;
        }

        nonHome.forEach(function (t) { clearFormData(t.id); });

        TAB_STATE.tabs = [{ id: 'home', title: 'صفحه اصلی', icon: '🏠' }];
        TAB_STATE.active = 'home';
        switchToTab('home');
        if (typeof showToast === 'function') showToast('🧹 همه فرم‌ها بسته شد');
    }

    /* ==================== Close-All Button ==================== */
    function injectCloseAllButton() {
        if (document.getElementById('close-all-forms-btn')) return true;
        var searchBox = document.querySelector('.sidebar-search');
        if (!searchBox) return false;

        var wrap = document.createElement('div');
        wrap.className = 'sidebar-close-all-wrap';
        wrap.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border)';

        var btn = document.createElement('button');
        btn.id = 'close-all-forms-btn';
        btn.type = 'button';
        btn.innerHTML = '🧹 بستن همه فرم‌ها';
        btn.title = 'بستن همه تب‌های فرم بدون رفرش';
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
            closeAllTabs();
        });

        wrap.appendChild(btn);
        searchBox.parentNode.insertBefore(wrap, searchBox.nextSibling);
        return true;
    }

    /* ==================== Override goToPage ==================== */
    function installGoToPageOverride() {
        if (typeof window.goToPage !== 'function') return false;
        if (window._origGoToPage) return true;
        var orig = window.goToPage;
        window._origGoToPage = orig;
        window.goToPage = function (name) {
            if (!name) return;
            var exists = false;
            for (var i = 0; i < TAB_STATE.tabs.length; i++) {
                if (TAB_STATE.tabs[i].id === name) { exists = true; break; }
            }
            if (!exists) {
                while (TAB_STATE.tabs.length >= TAB_STATE.max) {
                    var toRemove = -1;
                    for (var j = 1; j < TAB_STATE.tabs.length; j++) {
                        if (TAB_STATE.tabs[j].id !== name && TAB_STATE.tabs[j].id !== TAB_STATE.active) {
                            toRemove = j; break;
                        }
                    }
                    if (toRemove === -1) break;
                    TAB_STATE.tabs.splice(toRemove, 1);
                }
                var meta = getPageMeta(name);
                TAB_STATE.tabs.push({ id: name, title: meta.title, icon: meta.icon });
            }
            TAB_STATE.active = name;
            renderTabs();
            return orig.apply(this, arguments);
        };
        return true;
    }

    /* ==================== Init ==================== */
    function init() {
        var tries = 0;
        var interval = setInterval(function () {
            tries++;
            var ok1 = installGoToPageOverride();
            var ok2 = injectCloseAllButton();
            var ok3 = !!ensureTabBar();
            if ((ok1 && ok2 && ok3) || tries > 20) {
                clearInterval(interval);
                renderTabs();
                console.log('✨ 14-close-all.js v2 — فرم تب‌ها آماده شد');
            }
        }, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 500); });
    } else {
        setTimeout(init, 500);
    }

    window.closeAllTabs = closeAllTabs;
})();
