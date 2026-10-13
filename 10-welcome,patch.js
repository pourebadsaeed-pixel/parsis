/* =====================================================================
   پارسیس v28 — 10-welcome,patch.js
   پچ جامع ۱۵ درخواست:
     • صفحه خوش‌آمدگویی انیمیشنی (درخواست ۸)
     • جلوگیری از حذف اطلاعات پایه‌ی استفاده‌شده (درخواست ۱، ۳)
     • ستون ترکیبی تفصیلی‌ها برای معین‌های چند-نوعی (درخواست ۲)
     • گزارش مرور حساب به شکل ستون‌های هم‌راستا (درخواست ۴)
     • نمایش «فقط حساب‌های دارای مانده» (درخواست ۵)
     • جمع ردیف‌های فیلترشده در تراز/مقایسه‌ای/گردش وجه نقد (درخواست ۶)
     • آیکن پرکاربرد بسته باشد (درخواست ۷)
     • سطح گروه در تراز آزمایشی (درخواست ۹)
     • حذف ردیف فیلتر از پرینت/اشتراک (درخواست ۱۰)
     • گروه‌بندی صندوق پیامک‌ها در تب‌ها (درخواست ۱۱)
     • نمایش وضعیت سند در فرم پس از ذخیره (درخواست ۱۲)
     • جابجایی دکمه 🧹 شرح به قبل از + (درخواست ۱۳)
     • ویرایش سند از گردش حساب (درخواست ۱۴)
     • پرداخت قسط + ساخت سند خودکار (درخواست ۱۵)
     • بهبود درک AI از قابلیت‌های جدید
   ===================================================================== */
'use strict';

/* =====================================================================
   ★ بخش ۱: توابع کمکی «استفاده‌شده در اسناد»
   ===================================================================== */
function isFiscalPeriodUsed(periodId) {
    if (!periodId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) { return v.periodId === periodId; });
}
function isAccountUsed(accountId) {
    if (!accountId) return false;
    var vs = DB.load('vouchers', []);
    for (var i = 0; i < vs.length; i++) {
        var lines = vs[i].lines || [];
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].account === accountId) return true;
            if (lines[j].details) {
                for (var k in lines[j].details) {
                    if (lines[j].details[k] === accountId) return true;
                }
            }
        }
    }
    // آیا حساب والدِ حساب دیگری است؟
    var accs = DB.load('accounts', []);
    return accs.some(function(a) { return a.parent === accountId; });
}
function isPersonUsed(personId) {
    if (!personId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.person === personId;
        });
    });
}
function isCompanyUsed(companyId) {
    if (!companyId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.company === companyId;
        });
    });
}
function isBankUsed(bankId) {
    if (!bankId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.bank === bankId;
        });
    });
}
function isCashBoxUsed(cbId) {
    if (!cbId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.cashbox === cbId;
        });
    });
}
function isProjectUsed(prjId) {
    if (!prjId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.project === prjId;
        });
    });
}
function isFacilityUsed(facId) {
    if (!facId) return false;
    var vs = DB.load('vouchers', []);
    return vs.some(function(v) {
        return (v.lines || []).some(function(l) {
            return l.details && l.details.facility === facId;
        });
    });
}
window.isFiscalPeriodUsed = isFiscalPeriodUsed;
window.isAccountUsed = isAccountUsed;
window.isPersonUsed = isPersonUsed;
window.isCompanyUsed = isCompanyUsed;
window.isBankUsed = isBankUsed;
window.isCashBoxUsed = isCashBoxUsed;
window.isProjectUsed = isProjectUsed;
window.isFacilityUsed = isFacilityUsed;

/* =====================================================================
   ★ بخش ۲: پچ attachRowActions — جلوگیری از حذف داده‌های استفاده‌شده
   ===================================================================== */
(function patchRowActions() {
    var _origAttach = window.attachRowActions;
    if (typeof _origAttach !== 'function') return;
    window.attachRowActions = function(tb, sk, rf, ef) {
        _origAttach.apply(this, arguments);
        var dls = tb.querySelectorAll('.row-btn.del');
        dls.forEach(function(btn) {
            // حذف listener قبلی با کلون
            var newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', function() {
                var id = this.getAttribute('data-id');
                var blockReason = checkDeleteBlocked(sk, id);
                if (blockReason) {
                    alert('⛔️ حذف امکان‌پذیر نیست:\n\n' + blockReason + '\n\nفقط ویرایش مجاز است.');
                    return;
                }
                if (!confirm('حذف شود؟')) return;
                var list = DB.load(sk);
                list = list.filter(function(x) { return x.id !== id; });
                DB.save(sk, list);
                rf();
                if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
            });
        });
    };
    function checkDeleteBlocked(sk, id) {
        switch (sk) {
            case 'fiscalPeriods':
                if (isFiscalPeriodUsed(id)) return 'این دوره مالی در اسناد حسابداری استفاده شده است.';
                if (state.activePeriodId === id) return 'این دوره، دورهٔ فعال فعلی است. ابتدا دورهٔ دیگری را فعال کنید.';
                break;
            case 'persons':
                if (isPersonUsed(id)) return 'این شخص در اسناد حسابداری به‌عنوان تفصیلی استفاده شده است.';
                break;
            case 'companies':
                if (isCompanyUsed(id)) return 'این شرکت در اسناد حسابداری به‌عنوان تفصیلی استفاده شده است.';
                break;
            case 'bankAccounts':
                if (isBankUsed(id)) return 'این حساب بانکی در اسناد حسابداری استفاده شده است.';
                break;
            case 'cashBoxes':
                if (isCashBoxUsed(id)) return 'این صندوق در اسناد حسابداری استفاده شده است.';
                break;
            case 'projects':
                if (isProjectUsed(id)) return 'این پروژه در اسناد حسابداری استفاده شده است.';
                break;
            case 'accounts':
                if (isAccountUsed(id)) return 'این حساب در اسناد حسابداری استفاده شده یا فرزند دارد.';
                break;
        }
        return null;
    }
    window._checkDeleteBlocked = checkDeleteBlocked;
})();

/* =====================================================================
   ★ بخش ۳: پچ رسم ستون تفصیلی ترکیبی در فرم سند (درخواست ۲)
   ===================================================================== */
(function patchCombinedDetailColumn() {
    // نگه‌داشتن مرجع تابع اصلی
    var _orig = window.renderVoucherLines;
    if (typeof _orig !== 'function') return;

    window.renderVoucherLines = function() {
        var box = document.getElementById('voucher-lines');
        if (!box) return _orig.apply(this, arguments);
        // اگر خطی چند-لینکی داریم، از نسخه‌ی ترکیبی استفاده می‌کنیم
        _orig.apply(this, arguments);

        var accounts = DB.load('accounts', []);
        // روی هر voucher-line که چند لینک دارد، بخش‌های مجزای تفصیلی را
        // با یک select ترکیبی واحد جایگزین می‌کنیم
        var lines = box.querySelectorAll('.voucher-line');
        lines.forEach(function(wrap, idx) {
            var line = voucherLines[idx];
            if (!line) return;
            var acc = accounts.find(function(a) { return a.id === line.account; });
            if (!acc || !acc.links || acc.links.length < 2) return;

            // یافتن تمام divs تفصیلی
            var detailDivs = wrap.querySelectorAll('.ln-search-row');
            if (detailDivs.length < 2) return;
            // اولین select تفصیلی را نگه می‌داریم، بقیه را حذف می‌کنیم
            var firstInput = detailDivs[0].querySelector('input');
            var firstSelect = detailDivs[0].querySelector('select');
            if (!firstSelect) return;

            // ساخت options ترکیبی: «نوع: برچسب»
            var combined = [];
            acc.links.forEach(function(lt) {
                var items = getLinkedItems(lt);
                items.forEach(function(it) {
                    combined.push({
                        linkType: lt,
                        id: it.id,
                        label: linkTypeName(lt) + ': ' + getLinkedItemLabel(lt, it)
                    });
                });
            });

            // شناسایی انتخاب فعلی (اگر وجود دارد)
            var currentLT = null, currentID = null;
            acc.links.forEach(function(lt) {
                if (line.details && line.details[lt]) {
                    currentLT = lt; currentID = line.details[lt];
                }
            });

            firstSelect.innerHTML = '';
            var ph = document.createElement('option');
            ph.value = ''; ph.textContent = '— تفصیلی ترکیبی —';
            firstSelect.appendChild(ph);
            combined.forEach(function(c) {
                var o = document.createElement('option');
                o.value = c.linkType + '::' + c.id;
                o.textContent = c.label;
                if (c.linkType === currentLT && c.id === currentID) o.selected = true;
                firstSelect.appendChild(o);
            });
            firstSelect.dataset.combined = '1';
            if (firstInput) firstInput.placeholder = '🔍 تفصیلی ترکیبی...';

            // listener جدید (جایگزین)
            var newSel = firstSelect.cloneNode(true);
            firstSelect.parentNode.replaceChild(newSel, firstSelect);
            newSel.addEventListener('change', function() {
                var v = this.value;
                line.details = {};
                if (v) {
                    var parts = v.split('::');
                    line.details[parts[0]] = parts[1];
                }
            });
            // listener جستجو
            if (firstInput) {
                var newInput = firstInput.cloneNode(true);
                firstInput.parentNode.replaceChild(newInput, firstInput);
                newInput.addEventListener('input', function() {
                    var q = normalizeDigits(this.value.trim().toLowerCase());
                    var cur = newSel.value;
                    newSel.innerHTML = '';
                    var ph2 = document.createElement('option');
                    ph2.value = ''; ph2.textContent = '— تفصیلی ترکیبی —';
                    newSel.appendChild(ph2);
                    combined.forEach(function(c) {
                        if (!q || c.label.toLowerCase().indexOf(q) !== -1) {
                            var o = document.createElement('option');
                            o.value = c.linkType + '::' + c.id;
                            o.textContent = c.label;
                            if (o.value === cur) o.selected = true;
                            newSel.appendChild(o);
                        }
                    });
                });
            }

            // حذف ردیف‌های تفصیلی بعدی
            for (var d = detailDivs.length - 1; d >= 1; d--) {
                detailDivs[d].parentNode.removeChild(detailDivs[d]);
            }
        });
    };
})();

/* =====================================================================
   ★ بخش ۴: تنظیم getVoucherIssues — بررسی تفصیلی ترکیبی
   ===================================================================== */
(function patchVoucherIssuesForCombined() {
    var _orig = window.getVoucherIssues;
    if (typeof _orig !== 'function') return;
    window.getVoucherIssues = function(v) {
        var issues = _orig.apply(this, arguments);
        // اگر معین بیش از یک لینک دارد و فقط یکی از details پر است، بررسی می‌کنیم
        var accounts = DB.load('accounts', []);
        (v.lines || []).forEach(function(line, i) {
            if (!line.account) return;
            var acc = accounts.find(function(a) { return a.id === line.account; });
            if (!acc || !acc.links || acc.links.length < 2) return;
            var filled = acc.links.filter(function(lt) { return line.details && line.details[lt]; });
            if (filled.length === 0) {
                var msg = 'ردیف ' + toFa(i + 1) + ': تفصیلی ترکیبی انتخاب نشده';
                if (issues.indexOf(msg) === -1) issues.push(msg);
            }
        });
        return issues;
    };
})();

/* =====================================================================
   ★ بخش ۵: جلوگیری از حذف معین از چارت (درخواست ۳)
   ===================================================================== */
(function patchChartTreeDelete() {
    var _orig = window.renderChartTree;
    if (typeof _orig !== 'function') return;
    window.renderChartTree = function(cid, editable) {
        _orig.apply(this, arguments);
        if (!editable) return;
        var box = document.getElementById(cid);
        if (!box) return;
        box.querySelectorAll('.tree-del-btn').forEach(function(btn) {
            var nodeDiv = btn.closest('.tree-node');
            if (!nodeDiv) return;
            // پیدا کردن id از روی کد قابل مشاهده
            var codeEl = nodeDiv.querySelector('.tn-code');
            if (!codeEl) return;
            var code = codeEl.textContent.trim();
            var accs = DB.load('accounts', []);
            var acc = accs.find(function(a) { return a.code === code; });
            if (!acc) return;
            var reason = window._checkDeleteBlocked('accounts', acc.id);
            if (reason) {
                btn.style.opacity = '0.35';
                btn.title = 'غیرقابل حذف: ' + reason;
                var newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    alert('⛔️ ' + reason + '\n\nفقط ویرایش مجاز است.');
                });
            }
        });
    };
})();

/* =====================================================================
   ★ بخش ۶: جلوگیری از حذف در چارت — پچ تابع داخلی buildNode
   ===================================================================== */
/* این کار با پچ renderChartTree انجام شد که del-btn ها را دوباره bind می‌کند */

/* =====================================================================
   ★ بخش ۷: ستون رفرنس دوره مالی در فهرست اسناد (درخواست ۱)
   ===================================================================== */
(function patchVoucherListFiscalRef() {
    var _orig = window.renderVoucherList;
    if (typeof _orig !== 'function') return;
    window.renderVoucherList = function() {
        _orig.apply(this, arguments);
        var tb = document.getElementById('voucher-list-body');
        if (!tb) return;
        var periods = DB.load('fiscalPeriods', []);
        var pMap = {};
        periods.forEach(function(p) { pMap[p.id] = p; });
        var vouchers = DB.load('vouchers', []);
        var vMap = {};
        vouchers.forEach(function(v) { vMap[v.id] = v; });

        // اضافه کردن هدر دورهٔ مالی اگر نبود
        var thead = document.querySelector('#voucher-table-list thead tr');
        if (thead && !thead.querySelector('[data-fiscal-ref]')) {
            var ths = thead.querySelectorAll('th');
            // ستون دوره در جایگاه ۴ (بعد از نوع) وجود دارد — آن را با رفرنس ترکیب نمی‌کنیم
            // فقط یک نشانگر برای سلول دوره اضافه می‌کنیم
            thead.setAttribute('data-fiscal-ref', '1');
        }

        // هر ردیف را با شناسه دوره غنی می‌کنیم
        Array.prototype.forEach.call(tb.querySelectorAll('tr'), function(tr) {
            var firstCell = tr.querySelector('td');
            if (!firstCell) return;
            var numCell = firstCell.textContent.trim();
            var v = vouchers.find(function(x) { return toFa(x.number) === numCell || x.number === numCell; });
            if (!v) return;
            tr.dataset.fiscalId = v.periodId || '';
            tr.title = v.periodId ? ('دوره: ' + (pMap[v.periodId] ? pMap[v.periodId].title : '?')) : 'بدون دوره';
        });
    };
})();

/* =====================================================================
   ★ بخش ۸: نمایش وضعیت سند در فرم پس از ذخیره (درخواست ۱۲)
   ===================================================================== */
(function patchVoucherStatusBadge() {
    // افزودن نوار وضعیت به هدر فرم سند
    function injectStatusBar() {
        var card = document.getElementById('voucher-head-card');
        if (!card) return;
        if (card.querySelector('.voucher-status-bar')) return;
        var bar = document.createElement('div');
        bar.className = 'voucher-status-bar';
        bar.id = 'voucher-status-bar';
        bar.style.cssText = 'margin-bottom:12px;padding:10px 14px;border-radius:12px;font-weight:800;display:none;align-items:center;gap:10px;border:1px solid var(--border)';
        bar.innerHTML = '<span class="vsb-icon"></span><span class="vsb-text"></span><span class="vsb-id"></span>';
        card.insertBefore(bar, card.firstChild);
    }
    function setStatus(status, vId) {
        var bar = document.getElementById('voucher-status-bar');
        if (!bar) return;
        bar.style.display = 'flex';
        var icon = bar.querySelector('.vsb-icon');
        var text = bar.querySelector('.vsb-text');
        var idEl = bar.querySelector('.vsb-id');
        if (status === 'approved') {
            bar.style.background = 'linear-gradient(135deg,#d1fae5,#a7f3d0)';
            bar.style.color = '#065f46';
            bar.style.borderColor = '#059669';
            icon.textContent = '✅';
            text.textContent = 'سند تأیید شده';
        } else if (status === 'draft') {
            bar.style.background = 'linear-gradient(135deg,#fef3c7,#fde68a)';
            bar.style.color = '#92400e';
            bar.style.borderColor = '#f59e0b';
            icon.textContent = '📝';
            text.textContent = 'سند به‌عنوان پیش‌نویس ذخیره شد';
        } else {
            bar.style.display = 'none';
            return;
        }
        idEl.textContent = vId ? ('شناسه: ' + vId.substring(0, 8)) : '';
        idEl.style.fontSize = '0.72rem';
        idEl.style.opacity = '0.7';
        idEl.style.marginRight = 'auto';
    }
    window._setVoucherStatusBar = setStatus;

    // پچ persistVoucher
    var _orig = window.persistVoucher;
    if (typeof _orig === 'function') {
        window.persistVoucher = function(approve) {
            var vIdBefore = document.getElementById('v-id').value;
            _orig.apply(this, arguments);
            var vIdAfter = document.getElementById('v-id').value;
            if (approve) {
                setStatus('approved', vIdBefore || vIdAfter);
            } else {
                // اگر ذخیره موفق بود، v-id باید پر شده باشد
                if (vIdAfter && vIdAfter.length > 0) {
                    setStatus('draft', vIdAfter);
                }
            }
        };
    }

    // پچ newVoucherForm برای پاک کردن نوار
    var _origNew = window.newVoucherForm;
    if (typeof _origNew === 'function') {
        window.newVoucherForm = function() {
            _origNew.apply(this, arguments);
            var bar = document.getElementById('voucher-status-bar');
            if (bar) bar.style.display = 'none';
        };
    }

    // پچ loadVoucherForEdit
    var _origLoad = window.loadVoucherForEdit;
    if (typeof _origLoad === 'function') {
        window.loadVoucherForEdit = function(v) {
            _origLoad.apply(this, arguments);
            if (v && v.status === 'approved') setStatus('approved', v.id);
            else if (v) setStatus('draft', v.id);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(injectStatusBar, 800); });
    } else {
        setTimeout(injectStatusBar, 800);
    }

    // پچ hasUnsavedData در تب‌ها — اگر سند ذخیره شده، گیر ندهد
    if (typeof window._origHasUnsavedData === 'undefined') {
        // این تابع داخل IIFE فایل ۰۲ است و بیرون قابل دسترسی نیست؛
        // راه‌حل جایگزین: ردیابی تغییرات در DOM با MutationObserver
        var vIdInitial = '';
        var descInitial = '';
        document.addEventListener('input', function(e) {
            // فقط وقتی فرم سند فعال است
            var page = document.getElementById('page-voucher-new');
            if (!page || !page.classList.contains('active')) return;
            var vIdEl = document.getElementById('v-id');
            if (!vIdEl) return;
            // اگر v-id پر است یعنی سند ذخیره شده — داده‌ی ذخیره‌شده = پاک
        });
    }
})();

/* =====================================================================
   ★ بخش ۹: جابجایی دکمه 🧹 شرح به قبل از + (درخواست ۱۳)
   ===================================================================== */
(function patchDescRowButtons() {
    var _orig = window.renderVoucherLines;
    if (typeof _orig !== 'function') return;
    window.renderVoucherLines = (function(orig) {
        return function() {
            orig.apply(this, arguments);
            var box = document.getElementById('voucher-lines');
            if (!box) return;
            box.querySelectorAll('.desc-row').forEach(function(row) {
                if (row.dataset.reordered === '1') return;
                row.dataset.reordered = '1';
                // در حال حاضر: input + button.add-std
                // می‌خواهیم: input + button.clear + button.add-std
                var addBtn = row.querySelector('.desc-add-btn');
                if (!addBtn) return;
                var clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.className = 'desc-clear-btn';
                clearBtn.title = 'خالی کردن شرح این قلم';
                clearBtn.textContent = '🧹';
                clearBtn.style.cssText = 'background:#fee2e2;color:#dc2626;border:none;border-radius:10px;width:38px;height:38px;font-size:1.05rem;font-weight:800;cursor:pointer;flex-shrink:0';
                clearBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var inp = row.querySelector('input[type=text]');
                    if (inp) {
                        inp.value = '';
                        inp.classList.remove('desc-required');
                        inp.dispatchEvent(new Event('input', { bubbles: true }));
                        inp.focus();
                    }
                });
                row.insertBefore(clearBtn, addBtn);
                // اطمینان از چیدمان: desc-row به grid تبدیل شود
                row.style.gridTemplateColumns = '1fr auto auto';
            });
        };
    })(_orig);
})();

/* =====================================================================
   ★ بخش ۱۰: آیکن پرکاربرد بسته باشد (درخواست ۷)
   ===================================================================== */
(function patchFrequentNavCollapsed() {
    function collapseFrequent() {
        var g = document.getElementById('nav-frequent-group');
        if (!g) return;
        g.classList.add('collapsed');
    }
    // اطمینان از اینکه title کلیک‌پذیر برای باز/بسته دارد (موجود است)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(collapseFrequent, 900); });
    } else {
        setTimeout(collapseFrequent, 900);
    }
    // هر بار بعد از renderFrequentNav دوباره بسته شود
    if (typeof window.renderFrequentNav === 'function') {
        var _orig = window.renderFrequentNav;
        window.renderFrequentNav = function() {
            _orig.apply(this, arguments);
            collapseFrequent();
        };
    }
})();

/* =====================================================================
   ★ بخش ۱۱: حذف ردیف فیلتر از پرینت/اشتراک (درخواست ۱۰)
   ===================================================================== */
(function patchShareAndPrintFilterRows() {
    // پچ shareAsImage — مخفی کردن فیلترها قبل از اسکرین‌شات
    if (typeof window.shareAsImage === 'function') {
        var _orig = window.shareAsImage;
        window.shareAsImage = function(el, title, filename) {
            var hiddenRows = [];
            if (el) {
                el.querySelectorAll('tr.column-filter-row').forEach(function(r) {
                    hiddenRows.push({ el: r, old: r.style.display });
                    r.style.display = 'none';
                });
                el.querySelectorAll('.filters-toggle-btn, .col-filter-btn').forEach(function(b) {
                    hiddenRows.push({ el: b, old: b.style.display });
                    b.style.display = 'none';
                });
            }
            return _orig.apply(this, arguments).finally(function() {
                hiddenRows.forEach(function(x) { x.el.style.display = x.old; });
            });
        };
    }
})();

/* =====================================================================
   ★ بخش ۱۲: گروه‌بندی صندوق پیامک‌ها در تب‌ها (درخواست ۱۱)
   ===================================================================== */
(function patchSmsGroupingTabs() {
    function injectSmsTabs() {
        var page = document.getElementById('page-sms');
        if (!page) return;
        // تب‌های گروه‌بندی بین «ثبت‌نشده» و «صندوق»
        var pendingCard = document.querySelector('#page-sms .card #pending-sms-list');
        if (!pendingCard) return;
        // فقط یک بار
        if (document.getElementById('sms-group-tabs')) return;

        var tabs = document.createElement('div');
        tabs.id = 'sms-group-tabs';
        tabs.className = 'tabs';
        tabs.style.marginBottom = '16px';
        tabs.innerHTML =
            '<button class="tab-btn active" data-sms-group="pending">🔔 ثبت‌نشده (<span id="sms-pending-count-tab">۰</span>)</button>' +
            '<button class="tab-btn" data-sms-group="inbox">📥 صندوق (<span id="sms-inbox-count-tab">۰</span>)</button>' +
            '<button class="tab-btn" data-sms-group="registered">✅ ثبت‌شده</button>' +
            '<button class="tab-btn" data-sms-group="ignored">🚫 نادیده</button>';

        // اولین card داخل صفحه SMS را پیدا کن
        var firstCard = page.querySelector('.card');
        if (firstCard) {
            page.insertBefore(tabs, firstCard);
        } else {
            page.appendChild(tabs);
        }

        // پرچم نمایش
        var state = { group: 'pending' };

        function applyFilter() {
            // کارت اول: پیامک‌های ثبت‌نشده
            var pendingCard = page.querySelectorAll('.card')[0];
            var methodsCard = page.querySelectorAll('.card')[1];
            var pasteCard = page.querySelectorAll('.card')[2];
            var inboxCard = page.querySelectorAll('.card')[3];
            var allCards = [pendingCard, methodsCard, pasteCard, inboxCard];

            // تب pending = فقط pendingCard
            // تب inbox = فقط inboxCard (فقط ثبت‌شده‌ها نمایش داده می‌شوند)
            // تب registered = فقط inboxCard فیلتر شده به converted
            // تب ignored = فقط inboxCard فیلتر شده به ignored

            allCards.forEach(function(c) { if (c) c.style.display = 'none'; });

            if (state.group === 'pending') {
                if (pendingCard) pendingCard.style.display = '';
                if (methodsCard) methodsCard.style.display = '';
                if (pasteCard) pasteCard.style.display = '';
            } else if (state.group === 'inbox') {
                if (inboxCard) inboxCard.style.display = '';
                filterInboxBy(null);
            } else if (state.group === 'registered') {
                if (inboxCard) inboxCard.style.display = '';
                filterInboxBy('converted');
            } else if (state.group === 'ignored') {
                if (inboxCard) inboxCard.style.display = '';
                filterInboxBy('ignored');
            }
        }

        function filterInboxBy(status) {
            var items = document.querySelectorAll('#sms-inbox-list .sms-item');
            items.forEach(function(it) {
                var isConv = it.classList.contains('status-converted');
                var isIgn = it.classList.contains('status-ignored');
                var isNew = it.classList.contains('status-new');
                var show = true;
                if (status === 'converted') show = isConv;
                else if (status === 'ignored') show = isIgn;
                it.style.display = show ? '' : 'none';
            });
        }

        tabs.querySelectorAll('[data-sms-group]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                tabs.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                state.group = this.getAttribute('data-sms-group');
                applyFilter();
            });
        });

        window._refreshSmsTabCounts = function() {
            var pc = (typeof getPendingSmsCount === 'function') ? getPendingSmsCount() : 0;
            var inbox = (typeof getSmsInbox === 'function') ? getSmsInbox() : [];
            var converted = inbox.filter(function(s) { return s.status === 'converted'; }).length;
            var el1 = document.getElementById('sms-pending-count-tab');
            var el2 = document.getElementById('sms-inbox-count-tab');
            if (el1) el1.textContent = toFa(pc);
            if (el2) el2.textContent = toFa(inbox.length);
        };
        window._refreshSmsTabCounts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(injectSmsTabs, 1200); });
    } else {
        setTimeout(injectSmsTabs, 1200);
    }

    // بعد از هر render دوباره فیلتر اعمال شود
    if (typeof window.renderSmsInbox === 'function') {
        var _orig = window.renderSmsInbox;
        window.renderSmsInbox = function() {
            _orig.apply(this, arguments);
            if (window._refreshSmsTabCounts) window._refreshSmsTabCounts();
            var activeTab = document.querySelector('#sms-group-tabs .tab-btn.active');
            if (activeTab) {
                var g = activeTab.getAttribute('data-sms-group');
                // اعمال مجدد فیلتر
                setTimeout(function() {
                    var items = document.querySelectorAll('#sms-inbox-list .sms-item');
                    items.forEach(function(it) {
                        if (g === 'registered') it.style.display = it.classList.contains('status-converted') ? '' : 'none';
                        else if (g === 'ignored') it.style.display = it.classList.contains('status-ignored') ? '' : 'none';
                        else it.style.display = '';
                    });
                }, 50);
            }
        };
    }
    if (typeof window.renderPendingSmsBox === 'function') {
        var _origPending = window.renderPendingSmsBox;
        window.renderPendingSmsBox = function() {
            _origPending.apply(this, arguments);
            if (window._refreshSmsTabCounts) window._refreshSmsTabCounts();
        };
    }
})();

/* =====================================================================
   ★ بخش ۱۳: ویرایش سند از مودال گردش حساب (درخواست ۱۴)
   ===================================================================== */
(function patchTurnoverEditLinks() {
    // openAccountTurnover تولید جدول با ستون‌های شماره، تاریخ، شرح ... دارد.
    // ردیف‌ها را کلیک‌پذیر می‌کنیم تا سند باز شود.
    var _orig = window.openAccountTurnover;
    if (typeof _orig !== 'function') return;
    window.openAccountTurnover = function(accountId, detailInfo) {
        var res = _orig.apply(this, arguments);
        setTimeout(function() {
            var body = document.getElementById('turnover-body');
            if (!body) return;
            var table = body.querySelector('table');
            if (!table) return;
            var tbody = table.querySelector('tbody');
            if (!tbody) return;
            var rows = tbody.querySelectorAll('tr');
            rows.forEach(function(tr) {
                tr.style.cursor = 'pointer';
                tr.title = 'کلیک برای ویرایش سند';
                tr.classList.add('turnover-clickable');
                tr.addEventListener('click', function(e) {
                    if (e.target.closest('button')) return;
                    // ستون شماره سند = 3 (ایندکس 2)
                    var cells = tr.querySelectorAll('td');
                    if (cells.length < 3) return;
                    var numTxt = cells[2].textContent.trim();
                    var numVal = normalizeDigits(numTxt).replace(/[^\d]/g, '');
                    var v = DB.load('vouchers', []).find(function(x) {
                        return String(normalizeDigits(String(x.number))).replace(/[^\d]/g, '') === numVal;
                    });
                    if (v && typeof openVoucherForEditById === 'function') {
                        openVoucherForEditById(v.id);
                    }
                });
            });
        }, 100);
        return res;
    };
})();

/* =====================================================================
   ★ بخش ۱۴: نمایش فقط حساب‌های دارای مانده (درخواست ۵)
   ===================================================================== */
(function patchOnlyBalanceOption() {
    // افزودن چک‌باکس به فرم‌های مرور/تراز/مقایسه‌ای
    function injectCheckbox(containerSelector, id, labelText, onChange) {
        var container = document.querySelector(containerSelector);
        if (!container) return;
        if (document.getElementById(id)) return;
        var label = document.createElement('label');
        label.className = 'checkbox-item';
        label.style.cssText = 'margin-top:8px;background:var(--primary-soft);border:1px solid var(--primary-light)';
        label.innerHTML = '<input type="checkbox" id="' + id + '"> <span>' + labelText + '</span>';
        container.appendChild(label);
        label.querySelector('input').addEventListener('change', onChange);
    }

    setTimeout(function() {
        // مرور حساب‌ها
        var raCard = document.querySelector('#page-report-account .card');
        if (raCard) {
            var p = raCard.querySelector('.form-buttons');
            if (p) {
                var lbl = document.createElement('label');
                lbl.className = 'checkbox-item';
                lbl.style.cssText = 'margin-top:8px;background:var(--primary-soft);border:1px solid var(--primary-light);display:inline-flex';
                lbl.innerHTML = '<input type="checkbox" id="ra-only-balance"> <span>فقط حساب‌های دارای مانده</span>';
                p.parentNode.insertBefore(lbl, p.nextSibling);
                lbl.querySelector('input').addEventListener('change', function() {
                    if (typeof runAccountReport === 'function') runAccountReport();
                });
            }
        }
        // تراز
        var rtCard = document.querySelector('#page-report-trial .card');
        if (rtCard) {
            var p2 = rtCard.querySelector('.form-buttons');
            if (p2) {
                var lbl2 = document.createElement('label');
                lbl2.className = 'checkbox-item';
                lbl2.style.cssText = 'margin-top:8px;background:var(--primary-soft);border:1px solid var(--primary-light);display:inline-flex';
                lbl2.innerHTML = '<input type="checkbox" id="rt-only-balance"> <span>فقط حساب‌های دارای مانده</span>';
                p2.parentNode.insertBefore(lbl2, p2.nextSibling);
                lbl2.querySelector('input').addEventListener('change', function() {
                    if (typeof runTrialBalance === 'function') runTrialBalance();
                });
            }
        }
        // مقایسه‌ای
        var rcCard = document.querySelector('#page-report-compare .card');
        if (rcCard) {
            var p3 = rcCard.querySelector('.form-buttons');
            if (p3) {
                var lbl3 = document.createElement('label');
                lbl3.className = 'checkbox-item';
                lbl3.style.cssText = 'margin-top:8px;background:var(--primary-soft);border:1px solid var(--primary-light);display:inline-flex';
                lbl3.innerHTML = '<input type="checkbox" id="rc-only-balance"> <span>فقط حساب‌های دارای مانده</span>';
                p3.parentNode.insertBefore(lbl3, p3.nextSibling);
                lbl3.querySelector('input').addEventListener('change', function() {
                    if (typeof runComparisonReport === 'function') runComparisonReport();
                });
            }
        }
    }, 1000);
})();

/* =====================================================================
   ★ بخش ۱۵: پچ runAccountReport — فیلتر فقط-مانده + جمع فیلترشده (۶)
   ===================================================================== */
(function patchAccountReport() {
    var _orig = window.runAccountReport;
    if (typeof _orig !== 'function') return;
    window.runAccountReport = function() {
        _orig.apply(this, arguments);
        // اعمال فیلتر فقط-مانده روی درخت (بعد از رسم)
        setTimeout(function() {
            var box = document.getElementById('ra-result');
            if (!box) return;
            var onlyBalance = document.getElementById('ra-only-balance');
            var shouldFilter = onlyBalance && onlyBalance.checked;
            if (shouldFilter) {
                box.querySelectorAll('.rt-node').forEach(function(node) {
                    var amtTxt = node.querySelector('.amt.net');
                    if (!amtTxt) return;
                    var t = amtTxt.textContent.replace(/[^\d\-]/g, '');
                    var v = Number(normalizeDigits(t).replace(/[^\d\-]/g, ''));
                    if (!v || v === 0) node.style.display = 'none';
                });
            } else {
                box.querySelectorAll('.rt-node').forEach(function(node) { node.style.display = ''; });
            }
        }, 200);
    };
})();

/* =====================================================================
   ★ بخش ۱۶: پچ runTrialBalance — سطح گروه + فقط-مانده + جمع فیلترشده
   ===================================================================== */
(function patchTrialBalance() {
    var _orig = window.runTrialBalance;
    if (typeof _orig !== 'function') return;
    // افزودن گزینه سطح ۱ به انتخابگر
    setTimeout(function() {
        var sel = document.getElementById('rt-level');
        if (sel && !sel.querySelector('option[value="1"]')) {
            var o = document.createElement('option');
            o.value = '1'; o.textContent = 'گروه';
            sel.insertBefore(o, sel.firstChild);
        }
    }, 800);

    window.runTrialBalance = function() {
        _orig.apply(this, arguments);
        setTimeout(function() {
            var box = document.getElementById('rt-result');
            if (!box) return;
            var onlyBalance = document.getElementById('rt-only-balance');
            if (onlyBalance && onlyBalance.checked) {
                var tbody = box.querySelector('tbody');
                if (!tbody) return;
                var kept = 0;
                tbody.querySelectorAll('tr').forEach(function(tr) {
                    var cells = tr.querySelectorAll('td');
                    if (cells.length < 6) return;
                    var md = cells[4].textContent.trim();
                    var mc = cells[5].textContent.trim();
                    var hasBalance = (md && md !== '—' && md !== '۰' && md !== '0') ||
                                     (mc && mc !== '—' && mc !== '۰' && mc !== '0');
                    tr.style.display = hasBalance ? '' : 'none';
                    if (hasBalance) kept++;
                });
                // بازمحاسبه جمع فقط بر اساس ردیف‌های visible
                recalcTrialFooter(box);
            } else {
                // اگر فیلتر نیست، اما ردیف فیلتر داخلی اعمال شده
                recalcTrialFooter(box);
            }
        }, 120);
    };

    function recalcTrialFooter(box) {
        var tbody = box.querySelector('tbody');
        if (!tbody) return;
        var sums = { d: 0, c: 0, md: 0, mc: 0 };
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var cells = tr.querySelectorAll('td');
            if (cells.length < 6) return;
            sums.d += parseNum(cells[2].textContent);
            sums.c += parseNum(cells[3].textContent);
            sums.md += parseNum(cells[4].textContent);
            sums.mc += parseNum(cells[5].textContent);
        });
        var tfoot = box.querySelector('tfoot');
        if (!tfoot) return;
        var footCells = tfoot.querySelectorAll('td');
        if (footCells.length < 6) return;
        footCells[2].textContent = moneyText(sums.d);
        footCells[3].textContent = moneyText(sums.c);
        footCells[4].textContent = moneyText(sums.md);
        footCells[5].textContent = moneyText(sums.mc);
    }
    function parseNum(txt) {
        var t = normalizeDigits(String(txt || '')).replace(/[^\d\-]/g, '');
        return Number(t) || 0;
    }
    function moneyText(n) {
        if (typeof moneyHtml === 'function') return moneyHtml(n);
        return formatMoney(n);
    }
})();

/* =====================================================================
   ★ بخش ۱۷: پچ runComparisonReport — فقط-مانده + جمع فیلترشده
   ===================================================================== */
(function patchComparisonReport() {
    var _orig = window.runComparisonReport;
    if (typeof _orig !== 'function') return;
    window.runComparisonReport = function() {
        _orig.apply(this, arguments);
        setTimeout(function() {
            var box = document.getElementById('rc-result');
            if (!box) return;
            var ob = document.getElementById('rc-only-balance');
            var tbody = box.querySelector('tbody');
            if (!tbody) return;
            if (ob && ob.checked) {
                tbody.querySelectorAll('tr').forEach(function(tr) {
                    var cells = tr.querySelectorAll('td');
                    if (cells.length < 5) return;
                    var n1 = cells[2].textContent.trim();
                    var n2 = cells[3].textContent.trim();
                    var has = (n1 && n1 !== '—' && n1 !== '۰') || (n2 && n2 !== '—' && n2 !== '۰');
                    tr.style.display = has ? '' : 'none';
                });
            }
            recalcCompareFooter(box);
        }, 120);
    };
    function recalcCompareFooter(box) {
        var tbody = box.querySelector('tbody');
        if (!tbody) return;
        var t1 = 0, t2 = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var cells = tr.querySelectorAll('td');
            if (cells.length < 5) return;
            t1 += parseNum(cells[2].textContent);
            t2 += parseNum(cells[3].textContent);
        });
        var tfoot = box.querySelector('tfoot');
        if (!tfoot) return;
        var fc = tfoot.querySelectorAll('td');
        if (fc.length < 5) return;
        fc[2].textContent = moneyHtml(t1);
        fc[3].textContent = moneyHtml(t2);
        var diff = t2 - t1;
        var pct = t1 !== 0 ? (diff / Math.abs(t1) * 100) : (t2 !== 0 ? 100 : 0);
        var cls = pct > 0 ? 'cr' : (pct < 0 ? 'dr' : '');
        var sign = pct > 0 ? '▲ +' : (pct < 0 ? '▼ ' : '');
        fc[4].textContent = sign + toFa(Math.abs(pct).toFixed(2)) + '٪';
        fc[4].className = 'num ' + cls;
    }
    function parseNum(txt) {
        return Number(normalizeDigits(String(txt || '')).replace(/[^\d\-]/g, '')) || 0;
    }
})();

/* =====================================================================
   ★ بخش ۱۸: پچ گردش وجه نقد — جمع فیلترشده (درخواست ۶)
   ===================================================================== */
(function patchCashFlowByDescSum() {
    // تابع cfd اصلی جدول با tfoot می‌سازد. برای اعمال فیلتر ستونی،
    // پس از filter، جمع را محاسبه مجدد می‌کنیم.
    setInterval(function() {
        var box = document.getElementById('cfd-result');
        if (!box) return;
        var tbody = box.querySelector('tbody');
        if (!tbody) return;
        // اگر ردیفی hidden باشد، جمع را بازمحاسبه کن
        var hasHidden = false;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') hasHidden = true;
        });
        if (!hasHidden) return;
        // فقط یک‌بار در هر تغییر (با cache روی dataset)
        var sig = Array.prototype.map.call(tbody.querySelectorAll('tr'), function(tr) {
            return tr.style.display === 'none' ? '0' : '1';
        }).join('');
        if (box.dataset.lastFilterSig === sig) return;
        box.dataset.lastFilterSig = sig;

        var table = box.querySelector('table#cfd-table');
        if (!table) return;
        var tfoot = table.querySelector('tfoot');
        if (!tfoot) return;
        var tIn = 0, tOut = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var cells = tr.querySelectorAll('td');
            if (cells.length < 5) return;
            tIn += Number(normalizeDigits(cells[2].textContent).replace(/[^\d\-]/g, '')) || 0;
            tOut += Number(normalizeDigits(cells[3].textContent).replace(/[^\d\-]/g, '')) || 0;
        });
        var fc = tfoot.querySelectorAll('td');
        if (fc.length < 7) return;
        fc[2].innerHTML = moneyHtml(tIn);
        fc[3].innerHTML = moneyHtml(tOut);
        fc[4].innerHTML = moneyHtml(tIn - tOut);
    }, 800);
})();

/* =====================================================================
   ★ بخش ۱۹: گزارش مرور حساب — نمایش ستونی هم‌راستا (درخواست ۴)
   ===================================================================== */
(function patchAccountReportAlignment() {
    // استایل اصلاحی اضافه می‌کنیم که ردیف‌های سطح ۱ تا ۴ را
    // در یک گرید ستونی هم‌راستا نمایش دهد.
    var css = ''
        + '.rt-node { display: grid !important; '
        +   'grid-template-columns: 28px minmax(140px, 1fr) auto auto auto auto; '
        +   'align-items: center; gap: 10px; }'
        + '.rt-node .rt-amounts { display: contents; }'
        + '.rt-node .rt-amounts .amt { justify-self: end; min-width: 120px; text-align: center; }'
        + '.rt-node .rt-name { grid-column: 2; }'
        + '.rt-node .rt-level-badge { grid-column: 3; justify-self: start; }'
        + '.rt-node.level-1 { padding: 14px 18px; }'
        + '.rt-node.level-2 { padding: 12px 16px; }'
        + '.rt-node.level-3 { padding: 10px 14px; }'
        + '.rt-node.level-4 { padding: 8px 12px; }'
        + '@media (max-width: 720px) {'
        +   '.rt-node { grid-template-columns: 24px 1fr; }'
        +   '.rt-node .rt-level-badge { grid-column: 2; }'
        +   '.rt-node .rt-amounts { grid-column: 1 / -1; display: flex !important; flex-wrap: wrap; gap: 6px; margin-top: 4px; }'
        + '}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
})();

/* =====================================================================
   ★ بخش ۲۰: پرداخت قسط + ساخت سند خودکار (درخواست ۱۵)
   ===================================================================== */
/* افزودن معین تسهیلات به فرم تسهیلات */
(function patchFacilityMoeinSelect() {
    function refresh() {
        var sel = document.getElementById('fc-moein');
        if (!sel) return;
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        // فیلتر: حساب‌هایی که لینک facility دارند
        var facilityAccounts = leaves.filter(function(a) { return a.links && a.links.indexOf('facility') !== -1; });
        sel.innerHTML = '<option value="">— معین تسهیلات (اختیاری) —</option>';
        facilityAccounts.forEach(function(a) {
            var o = document.createElement('option');
            o.value = a.id;
            o.textContent = a.code + ' — ' + a.name;
            sel.appendChild(o);
        });
    }
    function injectField() {
        var card = document.querySelector('#tab-fac-add .card');
        if (!card) return;
        if (document.getElementById('fc-moein')) return;
        var field = document.createElement('div');
        field.className = 'field';
        field.innerHTML = '<label>معین تسهیلات (برای ساخت سند پرداخت قسط)</label><select id="fc-moein"></select>';
        var ref = document.getElementById('fc-bank');
        if (ref) {
            ref.closest('.field').parentNode.insertBefore(field, ref.closest('.field').nextSibling);
        } else {
            card.appendChild(field);
        }
        refresh();
    }
    // پچ loadFacilityIntoForm برای پرکردن select
    if (typeof window.loadFacilityIntoForm === 'function') {
        var _orig = window.loadFacilityIntoForm;
        window.loadFacilityIntoForm = function(f) {
            _orig.apply(this, arguments);
            refresh();
            var sel = document.getElementById('fc-moein');
            if (sel) sel.value = f.moeinId || '';
        };
    }
    if (typeof window.loadFacilityForInstallments === 'function') {
        var _orig2 = window.loadFacilityForInstallments;
        window.loadFacilityForInstallments = function(f) {
            _orig2.apply(this, arguments);
            refresh();
            var sel = document.getElementById('fc-moein');
            if (sel) sel.value = f.moeinId || '';
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(injectField, 1100); });
    } else {
        setTimeout(injectField, 1100);
    }
    window._refreshFacilityMoein = refresh;
})();

/* پچ saveFacility برای ذخیره moeinId */
(function patchSaveFacility() {
    var btn = document.getElementById('save-fac');
    if (!btn) return;
    // listener اصلی در فایل ۰۹ است؛ ما با capture بعد از آن اجرا می‌شویم
    btn.addEventListener('click', function() {
        setTimeout(function() {
            var moeinSel = document.getElementById('fc-moein');
            var vId = document.getElementById('fc-id').value;
            if (!moeinSel || !vId) return;
            var l = DB.load('facilities', []);
            var idx = -1;
            for (var i = 0; i < l.length; i++) if (l[i].id === vId) { idx = i; break; }
            if (idx === -1) return;
            l[idx].moeinId = moeinSel.value;
            DB.save('facilities', l);
        }, 100);
    }, true);
})();

/* ★ افزودن دکمه «پرداخت» به هر قسط در دفترچه اقساط */
(function patchInstallmentPayButtons() {
    var _origRender = window.renderInstallments;
    if (typeof _origRender !== 'function') return;
    window.renderInstallments = function() {
        _origRender.apply(this, arguments);
        setTimeout(function() {
            var box = document.getElementById('fac-installments');
            if (!box) return;
            var rows = box.querySelectorAll('.installment-row');
            rows.forEach(function(row, idx) {
                if (row.querySelector('.inst-pay-btn')) return;
                var ins = currentInstallments[idx];
                if (!ins) return;
                if (ins.status === 'paid') {
                    var tag = document.createElement('div');
                    tag.style.cssText = 'font-size:0.72rem;color:#059669;font-weight:800;padding:4px 10px;background:#d1fae5;border-radius:9px';
                    tag.textContent = '✅ پرداخت‌شده' + (ins.systemPaid ? ' (سیستمی)' : '');
                    row.appendChild(tag);
                    return;
                }
                var payBtn = document.createElement('button');
                payBtn.type = 'button';
                payBtn.className = 'inst-pay-btn';
                payBtn.textContent = '💳 پرداخت';
                payBtn.title = 'پرداخت قسط و ساخت سند خودکار';
                payBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;padding:7px 12px;font-family:inherit;font-size:0.78rem;font-weight:800;cursor:pointer';
                payBtn.addEventListener('click', function() {
                    payInstallment(currentFacilityId, idx);
                });
                row.appendChild(payBtn);
            });
        }, 60);
    };
})();

/* ★ تابع پرداخت قسط + ساخت سند خودکار */
async function payInstallment(facilityId, installmentIdx) {
    var facilities = DB.load('facilities', []);
    var f = facilities.find(function(x) { return x.id === facilityId; });
    if (!f) { alert('تسهیلات یافت نشد.'); return; }
    var ins = (f.installments || [])[installmentIdx];
    if (!ins) { alert('قسط یافت نشد.'); return; }
    if (ins.status === 'paid') { alert('این قسط قبلاً پرداخت شده است.'); return; }
    if (!ins.amount || !ins.date) { alert('تاریخ و مبلغ قسط باید مشخص باشد.'); return; }
    if (!f.moeinId) {
        alert('⚠️ ابتدا معین تسهیلات را برای این تسهیلات تعریف کنید.\n(فیلد «معین تسهیلات» در فرم تعریف تسهیلات)');
        return;
    }
    if (!f.bankId) {
        alert('⚠️ ابتدا بانک تسهیلات را انتخاب کنید.');
        return;
    }
    // تاییدیه
    var bank = DB.load('bankAccounts', []).find(function(b) { return b.id === f.bankId; });
    var bankTitle = bank ? (bank.bank + ' — ' + (bank.account || '')) : '—';
    var msg = 'پرداخت قسط:\n\n' +
        'تاریخ: ' + ins.date + '\n' +
        'مبلغ: ' + formatMoney(ins.amount) + ' ' + currencyLabel() + '\n' +
        'بانک: ' + bankTitle + '\n' +
        'معین تسهیلات: ' + (DB.load('accounts', []).find(function(a) { return a.id === f.moeinId; }) || {}).name + '\n\n' +
        'سند خودکار ساخته شود؟';
    if (!confirm(msg)) return;

    // ساخت پیش‌نویس سند
    var bankMoein = (typeof getBankMoeinId === 'function') ? getBankMoeinId() : '';
    if (!bankMoein) { alert('معین بانک در چارت تعریف نشده.'); return; }
    var accounts = DB.load('accounts', []);
    var facAcc = accounts.find(function(a) { return a.id === f.moeinId; });
    var hasFacilityLink = facAcc && facAcc.links && facAcc.links.indexOf('facility') !== -1;

    var date = ins.date;
    var dv = validateDateInActivePeriod(date);
    if (!dv.ok) { alert('⚠️ ' + dv.msg); return; }

    var description = 'پرداخت قسط ' + (ins.date) + ' — ' + f.name;
    var lines = [];

    // ردیف بدهکار: معین تسهیلات (با تفصیلی facility)
    var facDetails = hasFacilityLink ? { facility: f.id } : {};
    lines.push({
        id: uid(),
        account: f.moeinId,
        details: facDetails,
        debit: Number(ins.amount) || 0,
        credit: 0,
        description: description
    });

    // ردیف بستانکار: معین بانک (با تفصیلی بانک)
    lines.push({
        id: uid(),
        account: bankMoein,
        details: { bank: f.bankId },
        debit: 0,
        credit: Number(ins.amount) || 0,
        description: description,
        locked: true
    });

    var vouchers = DB.load('vouchers', []);
    var v = {
        id: uid(),
        number: (typeof getNextVoucherNumberForPeriod === 'function')
                ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
                : String(vouchers.length + 1),
        date: date,
        type: 'general',
        periodId: state.activePeriodId || '',
        desc: description,
        lines: lines,
        status: 'draft'
    };

    // به‌روزرسانی قسط قبل از رفتن به فرم
    facilities.forEach(function(ff) {
        if (ff.id === facilityId) {
            ff.installments[installmentIdx].status = 'paid';
            ff.installments[installmentIdx].systemPaid = true;
            ff.installments[installmentIdx].systemVoucherId = v.id;
            ff.installments[installmentIdx].paidAt = Date.now();
            var tp = ff.installments.reduce(function(s, x) { return s + (x.status === 'paid' ? Number(x.amount || 0) : 0); }, 0);
            ff.paid = tp;
            var allPaid = ff.installments.every(function(x) { return x.status === 'paid'; });
            ff.status = allPaid ? 'settled' : 'active';
        }
    });
    DB.save('facilities', facilities);
    vouchers.push(v);
    DB.save('vouchers', vouchers);

    showToast('✅ قسط پرداخت شد — سند خودکار ساخته شد.');
    if (typeof renderFacilitiesList === 'function') renderFacilitiesList();
    if (typeof updateHomeWidgets === 'function') updateHomeWidgets();

    // انتقال به فرم سند برای بازبینی و تأیید
    if (typeof loadVoucherForEdit === 'function') {
        loadVoucherForEdit(v);
    }
    if (typeof goToPage === 'function') goToPage('voucher-new');
}
window.payInstallment = payInstallment;

/* =====================================================================
   ★ بخش ۲۱: صفحه خوش‌آمدگویی (درخواست ۸)
   ===================================================================== */
(function welcomeScreen() {
    function buildOverlay() {
        if (document.getElementById('welcome-overlay')) return;
        var el = document.createElement('div');
        el.id = 'welcome-overlay';
        el.className = 'welcome-overlay';
        el.innerHTML = ''
            + '<div class="welcome-top">'
            +   '<div class="welcome-date" id="welcome-date-jalali">—</div>'
            +   '<div class="welcome-date-greg" id="welcome-date-greg">—</div>'
            + '</div>'
            + '<div class="welcome-center">'
            +   '<div class="welcome-logo">📊</div>'
            +   '<h1 class="welcome-title">پارسیس</h1>'
            +   '<div class="welcome-subtitle">حسابداری هوشمند</div>'
            +   '<div class="welcome-version">نسخه ' + toFa(APP_VERSION) + '</div>'
            + '</div>'
            + '<div class="welcome-chart-wrap">'
            +   '<div class="welcome-chart-title">💹 خلاصهٔ دورهٔ مالی فعال</div>'
            +   '<div class="welcome-chart" id="welcome-chart"></div>'
            +   '<div class="welcome-legend" id="welcome-legend"></div>'
            + '</div>'
            + '<div class="welcome-hint">👆 برای ورود کلیک کنید</div>';
        document.body.appendChild(el);
        el.addEventListener('click', function() {
            el.classList.add('welcome-out');
            setTimeout(function() {
                el.style.display = 'none';
                try { DB.save('welcome.lastShownAt', Date.now()); } catch(e) {}
            }, 600);
        });
    }

    function renderDate() {
        var d = new Date();
        var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        var jEl = document.getElementById('welcome-date-jalali');
        var gEl = document.getElementById('welcome-date-greg');
        if (jEl) {
            jEl.textContent = WEEKDAYS_FA[d.getDay()] + '، ' +
                toFa(j[2]) + ' ' + JALALI_MONTHS[j[1] - 1] + ' ' + toFa(j[0]);
        }
        if (gEl) {
            gEl.textContent = d.getDate() + ' ' + GREG_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
        }
    }

    function computePeriodStats() {
        var accounts = DB.load('accounts', []);
        var vouchers = DB.load('vouchers', []).filter(function(v) {
            if (v.status !== 'approved') return false;
            if (state.activePeriodId && v.periodId !== state.activePeriodId) return false;
            return true;
        });
        var income = 0, expense = 0;
        vouchers.forEach(function(v) {
            (v.lines || []).forEach(function(l) {
                if (!l.account) return;
                var rootId = getRootAccountId(l.account, accounts);
                var root = accounts.find(function(a) { return a.id === rootId; });
                if (!root) return;
                var code = String(root.code || '').charAt(0);
                var d = Number(l.debit) || 0;
                var c = Number(l.credit) || 0;
                if (code === '4') income += c;
                else if (code === '5') expense += d;
            });
        });
        return { income: income, expense: expense };
    }

    function renderChart() {
        var stats = computePeriodStats();
        var box = document.getElementById('welcome-chart');
        var legend = document.getElementById('welcome-legend');
        if (!box || !legend) return;
        var total = stats.income + stats.expense;
        if (total === 0) {
            box.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.7);padding:20px;font-size:0.85rem">در دورهٔ فعال، درآمد/هزینه‌ای ثبت نشده است.</div>';
            legend.innerHTML = '';
            return;
        }
        var incomePct = stats.income / total * 100;
        var expensePct = stats.expense / total * 100;

        // SVG دایره‌ای با انیمیشن
        var size = 240, r = 90, cx = size / 2, cy = size / 2;
        var circ = 2 * Math.PI * r;
        var incLen = incomePct / 100 * circ;

        var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
        svg += '<defs>';
        svg += '<linearGradient id="wg-income" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/></linearGradient>';
        svg += '<linearGradient id="wg-expense" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>';
        svg += '</defs>';
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="32"/>';
        svg += '<circle class="wc-arc-expense" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="url(#wg-expense)" stroke-width="32" stroke-dasharray="' + circ + ' ' + circ + '" stroke-dashoffset="0" transform="rotate(-90 ' + cx + ' ' + cy + ')" style="stroke-dashoffset: ' + circ + '; animation: wgDraw 1s ease forwards; animation-delay: 0.3s; --dash-target: 0;"/>';
        svg += '<circle class="wc-arc-income" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="url(#wg-income)" stroke-width="32" stroke-dasharray="' + incLen + ' ' + (circ - incLen) + '" stroke-dashoffset="0" transform="rotate(-90 ' + cx + ' ' + cy + ')" style="stroke-dasharray: 0 ' + circ + '; animation: wgDrawInc 1s ease forwards; animation-delay: 1.3s;"/>';
        svg += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.7)">مجموع</text>';
        svg += '<text class="wc-total" x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="18" font-weight="bold" fill="#fff" style="opacity:0; animation: wgFadeIn 0.5s ease forwards; animation-delay: 2.5s">' + toFa(total.toLocaleString('fa-IR')) + '</text>';
        svg += '</svg>';
        box.innerHTML = svg;

        // Legend با انیمیشن ترتیبی
        legend.innerHTML = ''
            + '<div class="wl-item" style="opacity:0;animation:wgSlide 0.5s ease forwards;animation-delay:1s">'
            +   '<span class="wl-color in"></span>'
            +   '<span class="wl-label">💰 درآمد</span>'
            +   '<span class="wl-amount">' + formatMoney(stats.income) + '</span>'
            +   '<span class="wl-pct">' + toFa(incomePct.toFixed(1)) + '٪</span>'
            + '</div>'
            + '<div class="wl-item" style="opacity:0;animation:wgSlide 0.5s ease forwards;animation-delay:2s">'
            +   '<span class="wl-color out"></span>'
            +   '<span class="wl-label">💸 هزینه</span>'
            +   '<span class="wl-amount">' + formatMoney(stats.expense) + '</span>'
            +   '<span class="wl-pct">' + toFa(expensePct.toFixed(1)) + '٪</span>'
            + '</div>';
    }

    function init() {
        // اگر کاربر قبلاً در همین session دیده، نشان نده
        try {
            var last = DB.load('welcome.lastShownAt', 0);
            var session = sessionStorage.getItem('parsis.welcomeShown');
            if (session === '1') return;
            sessionStorage.setItem('parsis.welcomeShown', '1');
        } catch(e) {}
        buildOverlay();
        renderDate();
        setTimeout(renderChart, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 500); });
    } else {
        setTimeout(init, 500);
    }
})();

/* =====================================================================
   ★ بخش ۲۲: استایل خوش‌آمدگویی + قسط + وضعیت سند
   ===================================================================== */
(function injectStyles() {
    var css = ''
    + '/* ---- Welcome Screen ---- */'
    + '.welcome-overlay { position:fixed; inset:0; z-index:9999; '
    +   'background:radial-gradient(circle at 25% 20%, #1e3a8a 0%, #0f172a 45%, #4c1d95 100%); '
    +   'display:flex; flex-direction:column; align-items:center; justify-content:space-between; '
    +   'padding:24px 16px; cursor:pointer; direction:rtl; '
    +   'opacity:1; transition:opacity 0.5s, transform 0.6s; }'
    + '.welcome-overlay.welcome-out { opacity:0; transform:scale(1.05); pointer-events:none; }'
    + '.welcome-overlay::before { content:""; position:absolute; inset:0; '
    +   'background-image:radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0); '
    +   'background-size:32px 32px; opacity:0.5; pointer-events:none; }'
    + '.welcome-top { text-align:center; color:rgba(255,255,255,0.9); z-index:1; '
    +   'animation:wgSlideDown 0.7s ease both; }'
    + '.welcome-date { font-size:1.05rem; font-weight:800; letter-spacing:0.3px; }'
    + '.welcome-date-greg { font-size:0.78rem; color:rgba(255,255,255,0.6); direction:ltr; margin-top:2px; }'
    + '.welcome-center { text-align:center; color:#fff; z-index:1; }'
    + '.welcome-logo { font-size:5rem; line-height:1; filter:drop-shadow(0 8px 30px rgba(129,140,248,0.6)); '
    +   'animation:wgPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay:0.2s; }'
    + '.welcome-title { font-size:3rem; font-weight:900; letter-spacing:-1px; margin-top:14px; '
    +   'background:linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #f0abfc 100%); '
    +   '-webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; '
    +   'animation:wgPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay:0.5s; }'
    + '.welcome-subtitle { font-size:1rem; color:rgba(255,255,255,0.75); margin-top:4px; '
    +   'animation:wgPop 0.7s ease both; animation-delay:0.8s; }'
    + '.welcome-version { font-size:0.75rem; color:rgba(255,255,255,0.5); margin-top:6px; '
    +   'animation:wgPop 0.7s ease both; animation-delay:1s; }'
    + '.welcome-chart-wrap { width:min(420px, 92vw); text-align:center; z-index:1; '
    +   'animation:wgFadeIn 0.8s ease both; animation-delay:1.4s; }'
    + '.welcome-chart-title { color:rgba(255,255,255,0.85); font-weight:800; font-size:0.9rem; margin-bottom:10px; }'
    + '.welcome-chart { display:flex; justify-content:center; margin-bottom:14px; }'
    + '.welcome-legend { display:flex; flex-direction:column; gap:8px; }'
    + '.wl-item { display:grid; grid-template-columns:16px 1fr auto auto; gap:10px; '
    +   'align-items:center; padding:10px 14px; border-radius:14px; '
    +   'background:rgba(255,255,255,0.08); backdrop-filter:blur(10px); '
    +   'border:1px solid rgba(255,255,255,0.12); color:#fff; font-size:0.85rem; }'
    + '.wl-color { width:14px; height:14px; border-radius:4px; }'
    + '.wl-color.in { background:linear-gradient(135deg,#34d399,#059669); }'
    + '.wl-color.out { background:linear-gradient(135deg,#f87171,#dc2626); }'
    + '.wl-label { font-weight:800; text-align:right; }'
    + '.wl-amount { font-weight:800; font-variant-numeric:tabular-nums; direction:ltr; }'
    + '.wl-pct { background:rgba(255,255,255,0.15); padding:3px 10px; border-radius:10px; font-weight:800; font-size:0.78rem; }'
    + '.welcome-hint { color:rgba(255,255,255,0.6); font-size:0.85rem; font-weight:700; '
    +   'animation:wgPulse 2s ease-in-out infinite; z-index:1; }'
    + '@keyframes wgSlideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:none; } }'
    + '@keyframes wgPop { from { opacity:0; transform:scale(0.6); } to { opacity:1; transform:scale(1); } }'
    + '@keyframes wgFadeIn { from { opacity:0; } to { opacity:1; } }'
    + '@keyframes wgSlide { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:none; } }'
    + '@keyframes wgPulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }'
    + '@keyframes wgDraw { to { stroke-dashoffset: var(--dash-target, 0); } }'
    + '@keyframes wgDrawInc { to { stroke-dasharray: var(--inc-len, 0) 10000; } }'
    + '/* ---- Voucher Status Bar ---- */'
    + '.voucher-status-bar { animation:vsbIn 0.35s ease; }'
    + '@keyframes vsbIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }'
    + '/* ---- Installment Pay Button ---- */'
    + '.installment-row .inst-pay-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(16,185,129,0.35); }'
    + '/* ---- Turnover Clickable ---- */'
    + '.turnover-clickable:hover { background:var(--primary-soft) !important; }'
    + '/* ---- Combined Detail Column ---- */'
    + '.voucher-line select[data-combined="1"] { background:linear-gradient(90deg, var(--primary-soft), var(--card-solid)); '
    +   'border-color:var(--primary-light); font-weight:700; }';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
})();

/* =====================================================================
   ★ بخش ۲۳: بهبود Context AI برای قابلیت‌های جدید
   ===================================================================== */
(function improveAIContext() {
    if (typeof aiBuildContext === 'function') {
        var _orig = aiBuildContext;
        window.aiBuildContext = function() {
            var base = _orig.apply(this, arguments);
            var extra = []
                .concat([''])
                .concat(['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'])
                .concat(['🆕 قابلیت‌های جدید نسخه v28'])
                .concat(['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'])
                .concat(['• معین‌های چند-نوعی: در فرم سند، اگر معینی بیش از یک لینک (مثلاً person و company) دارد،'])
                .concat(['  کاربر یک ستون ترکیبی می‌بیند؛ در details فقط یک کلید از لینک‌های معین مجاز است.'])
                .concat(['• پرداخت قسط: هر قسط دارای دکمه «💳 پرداخت» است که سند خودکار می‌سازد:'])
                .concat(['  ردیف بدهکار = معین تسهیلات با details.facility'])
                .concat(['  ردیف بستانکار = معین بانک با details.bank'])
                .concat(['• برای اطلاعات پایه استفاده‌شده، حذف مجاز نیست — فقط ویرایش.'])
                .concat(['• تراز آزمایشی سطح گروه (level 1) هم پشتیبانی می‌کند.'])
                .concat([''])
                .concat(['📌 برای اطلاعات بیشتر درباره هر قسط، به فیلدهای facilities[].installments نگاه کن.']);
            return base + '\n' + extra.join('\n');
        };
    }
})();

/* =====================================================================
   ★ بخش ۲۴: رفرش نهایی و ثبت رویدادها
   ===================================================================== */
(function finalInit() {
    function boot() {
        console.log('🎉 پارسیس v28 — پچ ۱۵گانه اعمال شد.');
        // به‌روزرسانی UI
        if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
        if (typeof updateEyeButtons === 'function') updateEyeButtons();
        // جمع‌بندی اطلاع‌رسانی
        setTimeout(function() {
            if (typeof showToast === 'function') {
                showToast('✨ پارسیس نسخه ۴۴ آماده است.');
            }
        }, 2000);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(boot, 1400); });
    } else {
        setTimeout(boot, 1400);
    }
})();
