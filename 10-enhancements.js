/* =====================================================================
   پارسیس v27 — 10-enhancements.js
   بسته بهبودها:
   ۱) نمایش منفی در پرانتز قرمز (همه گزارش‌ها و ویجت‌ها)
   ۲) ویجت مانده بانک‌ها + ستون کسری (حداقل موجودی)
   ۳) ویجت اقساط: تاریخ آخرین قسط + مانده بانک مرتبط
   ۴) گزارش گردش وجه نقد: اسکرول افقی + کلیک روی ردیف برای ویرایش سند
   ۵) ویجت‌های داشبورد جدید + قابلیت انتخاب/ترتیب توسط کاربر
   ۶) تنظیمات: گروه‌های قابل باز/بسته شدن (از طریق HTML details)
   ===================================================================== */
'use strict';

/* ==================== ۱) نمایش منفی در پرانتز قرمز ==================== */
function moneyHtml(n, key) {
    if (key && typeof getHideState === 'function' && getHideState(key)) return '—';
    n = Number(n) || 0;
    var mode = state.currencyDisplay || 'rial';
    var v = n;
    var decimals = 0;
    if (mode === 'toman') v = n / 10;
    else if (mode === 'million') { v = n / 1000000; decimals = 3; }
    var abs = Math.abs(v);
    var str = abs.toLocaleString('fa-IR', { maximumFractionDigits: decimals }).replace(/\u066C/g, ',');
    if (v < 0) return '<span class="neg-money">(' + str + ')</span>';
    return str;
}
window.moneyHtml = moneyHtml;

// Override helpers used everywhere in reports
window.fmtFor = function(n, key) {
    if (getHideState(key)) return '—';
    return moneyHtml(n);
};
window.fmtRep = function(n, key) { return fmtFor(n, key); };

// Override formatMoney too — but ONLY for HTML contexts (negatives get styled)
// To avoid breaking textContent usages, we add new formatMoneyHTML
window.formatMoneyHTML = function(n) { return moneyHtml(n); };

// A wrapper that wraps any money string in a text-safe way
window.moneyText = function(n) {
    n = Number(n) || 0;
    var mode = state.currencyDisplay || 'rial';
    var v = n;
    if (mode === 'toman') v = n / 10;
    else if (mode === 'million') v = n / 1000000;
    var abs = Math.abs(v);
    var str = abs.toLocaleString('fa-IR', { maximumFractionDigits: mode === 'million' ? 3 : 0 }).replace(/\u066C/g, ',');
    return v < 0 ? '(' + str + ')' : str;
};

/* ==================== ۲) ویجت مانده بانک‌ها + ستون کسری ==================== */
window.renderBankBalancesWidget = function() {
    var el = document.getElementById('home-bank-balances');
    if (!el) return;
    var banks = DB.load('bankAccounts', []);
    if (banks.length === 0) { el.innerHTML = '<div class="widget-empty">حساب بانکی ثبت نشده.</div>'; return; }
    banks = banks.slice().sort(function(a, b) {
        var oa = Number(a.order) || 9999, ob = Number(b.order) || 9999;
        if (oa !== ob) return oa - ob;
        return (a.bank || '').localeCompare(b.bank || '', 'fa');
    });
    var html = '', total = 0, shown = 0;
    for (var i = 0; i < banks.length; i++) {
        var b = banks[i];
        if (b.status === 'inactive' || b.active === false) continue;
        var bal = getBankBalance(b.id);
        var minBal = Number(b.minBalance) || 0;
        var deficit = bal - minBal; // کسری = مانده فعلی - حداقل
        if (bal === 0 && minBal === 0) continue;
        shown++;
        total += bal;
        var cls = bal > 0 ? 'positive' : 'negative';
        var defCls = deficit < 0 ? 'negative' : 'positive';
        html += '<div class="balance-row">'
            +   '<div class="info">'
            +     '<div class="name">' + esc(b.bank || '—') + '</div>'
            +     '<div class="meta">' + (b.branchName ? esc(b.branchName) + ' — ' : '') + toFa(esc(b.account || '—')) + '</div>'
            +   '</div>'
            +   '<div class="amounts-grid">'
            +     '<div class="amt-cell"><span class="amt-lbl">مانده</span><span class="amount ' + cls + '">' + moneyHtml(bal) + ' ' + currencyLabel() + '</span></div>'
            +     '<div class="amt-cell"><span class="amt-lbl">حداقل</span><span class="amount">' + (minBal ? moneyHtml(minBal) : '—') + '</span></div>'
            +     '<div class="amt-cell"><span class="amt-lbl">کسری</span><span class="amount ' + defCls + '">' + (minBal ? moneyHtml(deficit) : '—') + '</span></div>'
            +   '</div>'
            + '</div>';
    }
    if (shown === 0) { el.innerHTML = '<div class="widget-empty">حساب با مانده غیرصفر نیست.</div>'; return; }
    html += '<div class="balance-row balance-total"><div class="info"><div class="name">💰 جمع کل</div></div><div class="amount">' + moneyHtml(total) + ' ' + currencyLabel() + '</div></div>';
    el.innerHTML = html;
};

/* ==================== ۳) ویجت اقساط: تاریخ آخرین قسط + بانک مرتبط ==================== */
window.updateHomeUpcomingInstallments = function() {
    var el = document.getElementById('home-upcoming-installments');
    if (!el) return;
    var totalEl = document.getElementById('home-upcoming-total');
    var totalAmountEl = document.getElementById('home-upcoming-total-amount');
    var facilities = DB.load('facilities', []);
    var banks = DB.load('bankAccounts', []);
    var bankMap = {};
    banks.forEach(function(b) { bankMap[b.id] = b; });
    var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var tY = today[0], tM = today[1], tD = today[2];
    var upcoming = [];
    var totalAmount = 0;
    facilities.forEach(function(f) {
        if (f.status === 'settled' || f.status === 'inactive') return;
        var ins = f.installments || [];
        // تاریخ آخرین قسط
        var lastDate = '';
        var lastAmt = 0;
        if (ins.length > 0) {
            var sorted = ins.slice().sort(function(a, b) { return compareVals(a.date, b.date); });
            lastDate = sorted[sorted.length - 1].date || '';
            lastAmt = Number(sorted[sorted.length - 1].amount) || 0;
        }
        // مانده بانک مرتبط
        var bankBal = f.bankId ? getBankBalance(f.bankId) : 0;
        var bankName = f.bankId && bankMap[f.bankId] ? bankMap[f.bankId].bank : '';

        ins.forEach(function(inst) {
            if (inst.status === 'paid') return;
            if (!inst.date) return;
            var p = inst.date.split('/').map(Number);
            if (p.length !== 3) return;
            var diff = jalaliDiff(tY, tM, tD, p[0], p[1], p[2]);
            if (diff >= 0 && diff <= 3) {
                upcoming.push({
                    facility: f, date: inst.date, amount: inst.amount, diff: diff,
                    lastDate: lastDate, lastAmt: lastAmt,
                    bankName: bankName, bankBal: bankBal
                });
                totalAmount += Number(inst.amount) || 0;
            }
        });
    });
    if (upcoming.length === 0) {
        el.innerHTML = '<div class="widget-empty">قسطی نیست.</div>';
        if (totalEl) totalEl.classList.add('hidden');
        return;
    }
    upcoming.sort(function(a, b) { return a.diff - b.diff; });
    var html = '';
    upcoming.forEach(function(u) {
        var dl = u.diff === 0 ? 'امروز' : (u.diff === 1 ? 'فردا' : toFa(u.diff) + ' روز دیگر');
        html += '<div class="balance-row inst-row">'
            +   '<div class="info">'
            +     '<div class="name">' + esc(u.facility.name) + '</div>'
            +     '<div class="meta">' + dl + ' — ' + toFa(esc(u.date)) + '</div>'
            +     '<div class="meta extra">'
            +       (u.lastDate ? '🔚 آخرین قسط: ' + toFa(u.lastDate) + ' (' + moneyHtml(u.lastAmt) + ')' : '')
            +       (u.bankName ? ' | 🏦 ' + esc(u.bankName) + ': ' + moneyHtml(u.bankBal) : '')
            +     '</div>'
            +   '</div>'
            +   '<div class="amount">' + moneyHtml(u.amount || 0) + '</div>'
            + '</div>';
    });
    el.innerHTML = html;
    if (totalEl && totalAmountEl) {
        totalEl.classList.remove('hidden');
        totalAmountEl.innerHTML = moneyHtml(totalAmount) + ' ' + currencyLabel();
    }
};

/* ==================== ۴) گردش وجه نقد: اسکرول افقی + کلیک روی ردیف ==================== */
/* در جزئیات هر گروه، هر ردیف شامل data-vid می‌شود تا کلیک → ویرایش سند */

// Override for the detail rows generator inside runCashFlowByDescReport
// Since we can't easily patch the inner function, we rebuild the report.
window.runCashFlowByDescReport = function() {
    var fromD = normalizeDigits((document.getElementById('cfd-from').value || '').trim());
    var toD = normalizeDigits((document.getElementById('cfd-to').value || '').trim());
    if (!fromD) fromD = todayJalaliStr();
    if (!toD) toD = fromD;
    if (fromD > toD) { alert('تاریخ شروع باید قبل از پایان باشد.'); return; }
    document.getElementById('cfd-from').value = fromD;
    document.getElementById('cfd-to').value = toD;
    var hide = getHideState('cfd');
    var accounts = DB.load('accounts', []);
    var effectiveAccs = {};
    accounts.forEach(function(a) { if (a.cfEffect) effectiveAccs[a.id] = true; });
    if (Object.keys(effectiveAccs).length === 0) {
        document.getElementById('cfd-result').innerHTML =
            '<div class="card"><p class="muted" style="text-align:center;padding:16px">⚠️ هیچ معینی با گزینه «موثر در گزارش گردش وجه نقد» تعریف نشده است.</p></div>';
        document.getElementById('cfd-count').textContent = '۰';
        return;
    }
    var vouchers = DB.load('vouchers', []).filter(function(v) {
        return v.status === 'approved' && v.date >= fromD && v.date <= toD;
    });
    var buckets = {};
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account || !effectiveAccs[l.account]) return;
            var desc = (l.description || '').trim() || '(بدون شرح)';
            if (!buckets[desc]) buckets[desc] = { in: 0, out: 0, details: [] };
            var d = Number(l.debit) || 0;
            var c = Number(l.credit) || 0;
            buckets[desc].in += d;
            buckets[desc].out += c;
            buckets[desc].details.push({
                voucherId: v.id,
                date: v.date, number: v.number, desc: v.desc,
                accLabel: getAccountLabel(l.account, accounts),
                lineDesc: l.description || '',
                debit: d, credit: c
            });
        });
    });
    var keys = Object.keys(buckets);
    keys.sort(function(a, b) { return compareVals(a, b); });
    if (keys.length === 0) {
        document.getElementById('cfd-result').innerHTML =
            '<div class="card"><p class="muted" style="text-align:center;padding:16px">در این بازه گردشی ثبت نشده است.</p></div>';
        document.getElementById('cfd-count').textContent = '۰';
        return;
    }
    var html = '<div class="cfd-scroll-wrap">';
    html += '<div class="table-wrap"><table class="report-table" id="cfd-table"><thead><tr>'
        + '<th>#</th><th>بابت / شرح</th><th>ورود (بدهکار)</th><th>خروج (بستانکار)</th><th>مانده</th><th>تعداد</th>'
        + '</tr></thead><tbody>';
    var tIn = 0, tOut = 0;
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i]; var b = buckets[k];
        var bal = b.in - b.out;
        tIn += b.in; tOut += b.out;
        html += '<tr><td class="num">' + toFa(i + 1) + '</td>'
            + '<td><strong>' + esc(k) + '</strong></td>'
            + '<td class="num" style="color:#1e9e6a">' + (b.in ? moneyHtml(b.in) : '—') + '</td>'
            + '<td class="num" style="color:#c0392b">' + (b.out ? moneyHtml(b.out) : '—') + '</td>'
            + '<td class="num" style="font-weight:bold">' + moneyHtml(bal) + '</td>'
            + '<td class="num">' + toFa(b.details.length) + '</td></tr>';
    }
    html += '</tbody><tfoot><tr><td colspan="2" style="text-align:left">جمع</td>'
        + '<td class="num" style="color:#1e9e6a">' + moneyHtml(tIn) + '</td>'
        + '<td class="num" style="color:#c0392b">' + moneyHtml(tOut) + '</td>'
        + '<td class="num">' + moneyHtml(tIn - tOut) + '</td><td></td></tr></tfoot></table></div>';

    // جزئیات هر گروه - با اسکرول افقی و کلیک روی ردیف
    for (var j = 0; j < keys.length; j++) {
        var k2 = keys[j];
        var b2 = buckets[k2];
        html += '<div class="cfd-group" style="margin-top:14px">'
            +   '<div class="cfd-head" onclick="this.nextElementSibling.classList.toggle(\'show\')">'
            +     '<div class="cfd-title">' + esc(k2) + '</div>'
            +     '<div class="cfd-nums">'
            +       '<span class="n in">ورود: ' + moneyHtml(b2.in) + '</span>'
            +       '<span class="n out">خروج: ' + moneyHtml(b2.out) + '</span>'
            +       '<span class="n bal">مانده: ' + moneyHtml(b2.in - b2.out) + '</span>'
            +     '</div>'
            +   '</div>'
            +   '<div class="cfd-details">'
            +     '<div class="cfd-hscroll">'
            +       '<table class="data-table cfd-detail-table">'
            +         '<thead><tr><th>#</th><th>تاریخ</th><th>شماره</th><th>شرح سند</th><th>حساب</th><th>شرح قلم</th><th>بدهکار</th><th>بستانکار</th><th>عملیات</th></tr></thead>'
            +         '<tbody>';
        for (var di = 0; di < b2.details.length; di++) {
            var d2 = b2.details[di];
            html += '<tr class="cfd-row" data-vid="' + d2.voucherId + '" style="cursor:pointer">'
                +   '<td>' + toFa(di + 1) + '</td>'
                +   '<td dir="ltr">' + toFa(d2.date) + '</td>'
                +   '<td dir="ltr">' + toFa(d2.number) + '</td>'
                +   '<td>' + esc(d2.desc || '') + '</td>'
                +   '<td>' + esc(d2.accLabel) + '</td>'
                +   '<td>' + esc(d2.lineDesc) + '</td>'
                +   '<td class="num dr">' + (d2.debit ? moneyHtml(d2.debit) : '—') + '</td>'
                +   '<td class="num cr">' + (d2.credit ? moneyHtml(d2.credit) : '—') + '</td>'
                +   '<td><button class="row-btn edit" data-vid="' + d2.voucherId + '" title="ویرایش سند">✎</button></td>'
                + '</tr>';
        }
        html += '</tbody></table></div></div></div>';
    }
    html += '</div>';
    document.getElementById('cfd-result').innerHTML = html;
    document.getElementById('cfd-count').textContent = toFa(keys.length) + ' دسته';
    var unitEl = document.getElementById('cfd-unit');
    if (unitEl) unitEl.textContent = 'واحد: ' + currencyLabel();

    // اتصال کلیک برای ویرایش
    document.querySelectorAll('#cfd-result .cfd-row').forEach(function(row) {
        row.addEventListener('click', function(e) {
            if (e.target.closest('button')) return;
            var vid = this.getAttribute('data-vid');
            openVoucherForEditById(vid);
        });
    });
    document.querySelectorAll('#cfd-result .row-btn.edit').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openVoucherForEditById(this.getAttribute('data-vid'));
        });
    });

    autoAttachReportHelpers();
};

function openVoucherForEditById(vid) {
    var v = findVoucherById(vid);
    if (!v) { showToast('سند یافت نشد.'); return; }
    // اگر تأیید شده، از کاربر بپرس که برگشت از تأیید شود یا فقط مشاهده
    if (v.status === 'approved') {
        var ans = confirm('این سند تأیید شده است.\n\nOK = برگشت از تأیید + ویرایش\nCancel = فقط مشاهده');
        if (ans) {
            var l = DB.load('vouchers', []);
            for (var i = 0; i < l.length; i++) {
                if (l[i].id === vid) { l[i].status = 'draft'; break; }
            }
            DB.save('vouchers', l);
            showToast('↩ سند به پیش‌نویس برگشت.');
            loadVoucherForEdit(v);
        } else {
            openVoucherPreview(v);
        }
        return;
    }
    loadVoucherForEdit(v);
}

/* ==================== ۵) داشبورد جدید و قابل تنظیم ==================== */

// State جدید برای داشبوردها
if (typeof state.dashboards === 'undefined') {
    state.dashboards = DB.load('dashboards', {
        expenseDonut: true,
        assetDonut: true,
        trendBar: true,
        topExpenses: true,
        lastVouchers: true,        // جدید
        overdueInstallments: true, // جدید
        negativeBanks: true,       // جدید
        topPersons: true,          // جدید
        cashLiquidity: true        // جدید
    });
}
if (typeof state.dashboardOrder === 'undefined') {
    var defOrder = ['cashLiquidity', 'expenseDonut', 'assetDonut', 'trendBar', 'topExpenses', 'lastVouchers', 'overdueInstallments', 'negativeBanks', 'topPersons'];
    var ord = DB.load('dashboardOrder', defOrder);
    defOrder.forEach(function(k) { if (ord.indexOf(k) === -1) ord.push(k); });
    state.dashboardOrder = ord;
    DB.save('dashboardOrder', state.dashboardOrder);
}
if (typeof state.dashboards === 'undefined') state.dashboards = {};
DB.save('dashboards', state.dashboards);

// اطمینان از وجود کانتینر داشبورد
function ensureDashboardGrid() {
    var page = document.getElementById('page-dashboard');
    if (!page) return null;
    var grid = document.getElementById('dash-grid-container');
    if (grid) return grid;
    // ساخت کانتینر جدید و انتقال کارت‌های موجود
    var oldDash = page.querySelector('.dash-grid');
    var oldTrend = page.querySelector('#dash-trend');
    var oldTop = page.querySelector('#dash-top-exp');
    var oldKpi = page.querySelector('.kpi-grid');

    // ساخت ساختار جدید
    var newGrid = document.createElement('div');
    newGrid.id = 'dash-grid-container';
    newGrid.className = 'dash-cards-grid';
    // انتقال KPI در بالای گرید
    if (oldKpi) oldKpi.parentNode.insertBefore(newGrid, oldKpi.nextSibling);
    else page.appendChild(newGrid);
    return newGrid;
}

// ساخت کارت‌های داشبورد با data-dash-key
function getDashboardCard(key) {
    var cards = {
        cashLiquidity: '<div class="card dash-card" data-dash-key="cashLiquidity"><h3>💧 نمودار نقدینگی</h3><div id="dash-cash-liquidity"></div></div>',
        expenseDonut: '<div class="card dash-card" data-dash-key="expenseDonut"><h3>🥧 ترکیب هزینه‌ها</h3><div id="dash-expense-donut"></div></div>',
        assetDonut: '<div class="card dash-card" data-dash-key="assetDonut"><h3>🏦 ترکیب دارایی‌ها</h3><div id="dash-asset-donut"></div></div>',
        trendBar: '<div class="card dash-card dash-wide" data-dash-key="trendBar"><h3>📊 روند درآمد و هزینه ۶ ماه اخیر</h3><div id="dash-trend"></div></div>',
        topExpenses: '<div class="card dash-card" data-dash-key="topExpenses"><h3>🏆 بیشترین هزینه‌ها (Top 10)</h3><div id="dash-top-exp"></div></div>',
        lastVouchers: '<div class="card dash-card" data-dash-key="lastVouchers"><h3>📄 ۱۰ سند آخر</h3><div id="dash-last-vouchers"></div></div>',
        overdueInstallments: '<div class="card dash-card" data-dash-key="overdueInstallments"><h3>⏰ اقساط سررسید گذشته</h3><div id="dash-overdue-inst"></div></div>',
        negativeBanks: '<div class="card dash-card" data-dash-key="negativeBanks"><h3>🔴 بانک‌های با کسری</h3><div id="dash-neg-banks"></div></div>',
        topPersons: '<div class="card dash-card" data-dash-key="topPersons"><h3>👥 پرتراکنش‌ترین اشخاص</h3><div id="dash-top-persons"></div></div>'
    };
    return cards[key] || '';
}

window.renderDashboard = function() {
    var page = document.getElementById('page-dashboard');
    if (!page) return;
    // اگر ساختار جدید ساخته نشده، بساز
    if (!document.getElementById('dash-grid-container')) {
        // مخفی کردن کارت‌های قدیمی
        var oldDash = page.querySelector('.dash-grid');
        if (oldDash) oldDash.style.display = 'none';
        var oldCards = page.querySelectorAll('.card');
        oldCards.forEach(function(c) {
            if (c.querySelector('#dash-trend') || c.querySelector('#dash-top-exp')) c.style.display = 'none';
        });
        var grid = document.createElement('div');
        grid.id = 'dash-grid-container';
        grid.className = 'dash-cards-grid';
        page.appendChild(grid);
    }
    var grid = document.getElementById('dash-grid-container');
    var order = state.dashboardOrder || [];
    var seen = {};
    // حذف کارت‌های قدیمی که دیگر نمایش داده نمی‌شوند
    grid.querySelectorAll('.dash-card').forEach(function(c) {
        var k = c.getAttribute('data-dash-key');
        if (!state.dashboards[k]) c.remove();
    });
    // افزودن / جایگذاری کارت‌ها بر اساس ترتیب
    order.forEach(function(key) {
        if (!state.dashboards[key]) return;
        seen[key] = true;
        var card = grid.querySelector('[data-dash-key="' + key + '"]');
        if (!card) {
            var html = getDashboardCard(key);
            if (html) {
                var tmp = document.createElement('div');
                tmp.innerHTML = html;
                card = tmp.firstElementChild;
                grid.appendChild(card);
            }
        }
        if (card) grid.appendChild(card); // برای اعمال ترتیب
    });
    // رندر محتوای هر کارت
    renderDashboardContents();
};

function renderDashboardContents() {
    var accounts = DB.load('accounts', []);
    var vouchers = DB.load('vouchers', []).filter(function(v) { return v.status === 'approved'; });
    var banks = DB.load('bankAccounts', []);
    var cashBoxes = DB.load('cashBoxes', []);
    var pr = getPeriodMonthRange();
    var totalBank = 0;
    banks.forEach(function(b) { totalBank += getBankBalance(b.id); });
    var totalCash = 0;
    cashBoxes.forEach(function(c) { totalCash += getCashBoxBalance(c.id); });
    var liquidity = totalBank + totalCash;
    var hide = getHideState('dashboard');

    // KPI قدیمی (بالای صفحه)
    var liqEl = document.getElementById('dash-liquidity');
    if (liqEl) liqEl.innerHTML = (hide ? '—' : moneyHtml(liquidity)) + ' ' + currencyLabel();
    var liqSubEl = document.getElementById('dash-liquidity-sub');
    if (liqSubEl) liqSubEl.innerHTML = 'بانک: ' + (hide ? '—' : moneyHtml(totalBank)) + ' | صندوق: ' + (hide ? '—' : moneyHtml(totalCash));

    var monthVouchers = vouchers.filter(function(v) { return v.date >= pr.from && v.date <= pr.to; });
    var incomeAmt = 0, expenseAmt = 0;
    monthVouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account) return;
            var rootId = getRootAccountId(l.account, accounts);
            var root = accounts.find(function(a) { return a.id === rootId; });
            if (!root) return;
            var codeRoot = String(root.code || '').charAt(0);
            var d = Number(l.debit) || 0, c = Number(l.credit) || 0;
            if (codeRoot === '4') incomeAmt += c;
            else if (codeRoot === '5') expenseAmt += d;
        });
    });
    var incEl = document.getElementById('dash-income');
    if (incEl) incEl.innerHTML = hide ? '—' : moneyHtml(incomeAmt);
    var expEl = document.getElementById('dash-expense');
    if (expEl) expEl.innerHTML = hide ? '—' : moneyHtml(expenseAmt);
    var profit = incomeAmt - expenseAmt;
    var prEl = document.getElementById('dash-profit');
    if (prEl) {
        prEl.innerHTML = hide ? '—' : moneyHtml(profit);
        prEl.className = 'kpi-val ' + (profit >= 0 ? 'positive' : 'negative');
    }

    // داشبورد ۱: نمودار نقدینگی (خطی ساده)
    var clEl = document.getElementById('dash-cash-liquidity');
    if (clEl) {
        var months = getLastNMonths(6);
        var points = months.map(function(mo) {
            var mFrom = mo.year + '/' + pad2(mo.month) + '/01';
            var mTo = mo.year + '/' + pad2(mo.month) + '/' + pad2(daysInJalaliMonth(mo.year, mo.month));
            var bal = 0;
            vouchers.forEach(function(v) {
                if (v.date < mFrom || v.date > mTo) return;
                (v.lines || []).forEach(function(l) {
                    if (!l.details) return;
                    if (l.details.bank || l.details.cashbox) {
                        bal += (Number(l.debit) || 0) - (Number(l.credit) || 0);
                    }
                });
            });
            return { label: mo.label, val: bal };
        });
        clEl.innerHTML = '<div class="mini-trend">' + points.map(function(p) {
            var cls = p.val >= 0 ? 'in' : 'out';
            var h = Math.min(Math.abs(p.val) / 1000000, 100) + 20;
            return '<div class="mini-bar"><div class="mini-bar-fill ' + cls + '" style="height:' + h + '%"></div><span class="mini-lbl">' + esc(p.label) + '</span><span class="mini-val">' + moneyHtml(p.val) + '</span></div>';
        }).join('') + '</div>';
    }

    // ترکیب هزینه‌ها
    var expByGroup = {};
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account) return;
            var d = Number(l.debit) || 0;
            if (d === 0) return;
            var rootId = getRootAccountId(l.account, accounts);
            var root = accounts.find(function(a) { return a.id === rootId; });
            if (!root || String(root.code || '').charAt(0) !== '5') return;
            var acc = accounts.find(function(a) { return a.id === l.account; });
            var lvl2 = acc;
            while (lvl2 && lvl2.parent && accounts.find(function(a) { return a.id === lvl2.parent; }).parent) {
                lvl2 = accounts.find(function(a) { return a.id === lvl2.parent; });
            }
            var key = lvl2 ? lvl2.name : (root ? root.name : 'سایر');
            expByGroup[key] = (expByGroup[key] || 0) + d;
        });
    });
    if (document.getElementById('dash-expense-donut')) renderDonutChart('dash-expense-donut', expByGroup, 'هزینه', hide);

    // ترکیب دارایی‌ها
    var assets = {};
    banks.forEach(function(b) { var bal = getBankBalance(b.id); if (bal > 0) assets['بانک ' + b.bank] = bal; });
    cashBoxes.forEach(function(c) { var bal = getCashBoxBalance(c.id); if (bal > 0) assets['صندوق ' + c.title] = bal; });
    if (document.getElementById('dash-asset-donut')) renderDonutChart('dash-asset-donut', assets, 'دارایی', hide);

    // روند میله‌ای
    var months2 = getLastNMonths(6);
    var monthStats = months2.map(function(mo) {
        var mFrom = mo.year + '/' + pad2(mo.month) + '/01';
        var mTo = mo.year + '/' + pad2(mo.month) + '/' + pad2(daysInJalaliMonth(mo.year, mo.month));
        var inc = 0, exp = 0;
        vouchers.forEach(function(v) {
            if (v.date < mFrom || v.date > mTo) return;
            (v.lines || []).forEach(function(l) {
                if (!l.account) return;
                var rootId = getRootAccountId(l.account, accounts);
                var root = accounts.find(function(a) { return a.id === rootId; });
                if (!root) return;
                var codeRoot = String(root.code || '').charAt(0);
                var d = Number(l.debit) || 0, c = Number(l.credit) || 0;
                if (codeRoot === '4') inc += c;
                else if (codeRoot === '5') exp += d;
            });
        });
        return { label: mo.label, income: inc, expense: exp };
    });
    if (document.getElementById('dash-trend')) renderBarChart('dash-trend', monthStats, hide);

    // بیشترین هزینه‌ها
    var expByMoein = {};
    vouchers.forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account) return;
            var d = Number(l.debit) || 0;
            if (d === 0) return;
            var acc = accounts.find(function(a) { return a.id === l.account; });
            if (!acc) return;
            if (String(acc.code || '').charAt(0) !== '5') return;
            expByMoein[acc.name] = (expByMoein[acc.name] || 0) + d;
        });
    });
    var topArr = Object.keys(expByMoein).map(function(k) { return { name: k, val: expByMoein[k] }; }).sort(function(a, b) { return b.val - a.val; }).slice(0, 10);
    var topEl = document.getElementById('dash-top-exp');
    if (topEl) {
        if (topArr.length === 0) topEl.innerHTML = '<div class="widget-empty">هزینه‌ای ثبت نشده.</div>';
        else {
            var h = '<div class="top-exp-list">';
            topArr.forEach(function(x, i) {
                h += '<div class="top-exp-item"><div class="rank">' + toFa(i + 1) + '</div><div class="name">' + esc(x.name) + '</div><div class="amt">' + (hide ? '—' : moneyHtml(x.val)) + ' ' + currencyLabel() + '</div></div>';
            });
            h += '</div>';
            topEl.innerHTML = h;
        }
    }

    // ۱۰ سند آخر
    var lastV = document.getElementById('dash-last-vouchers');
    if (lastV) {
        var recent = vouchers.slice().sort(function(a, b) { return compareVals(b.date, a.date) || compareVals(b.number, a.number); }).slice(0, 10);
        if (recent.length === 0) lastV.innerHTML = '<div class="widget-empty">سندی نیست.</div>';
        else {
            lastV.innerHTML = '<div class="top-exp-list">' + recent.map(function(v) {
                return '<div class="top-exp-item"><div class="name">#' + toFa(v.number) + ' — ' + esc(v.desc || '') + '</div><div class="amt" style="color:var(--primary-dark)">' + moneyHtml(getVoucherAmount(v)) + '</div><div class="muted" style="font-size:.7rem">' + toFa(v.date) + '</div></div>';
            }).join('') + '</div>';
        }
    }

    // اقساط سررسید گذشته
    var ovEl = document.getElementById('dash-overdue-inst');
    if (ovEl) {
        var today = todayJalaliStr();
        var facilities = DB.load('facilities', []);
        var overdue = [];
        facilities.forEach(function(f) {
            (f.installments || []).forEach(function(inst) {
                if (inst.status === 'paid') return;
                if (!inst.date || inst.date >= today) return;
                overdue.push({ f: f, inst: inst });
            });
        });
        if (overdue.length === 0) ovEl.innerHTML = '<div class="widget-empty">✅ قسط سررسید گذشته‌ای نیست.</div>';
        else {
            ovEl.innerHTML = '<div class="top-exp-list">' + overdue.map(function(u) {
                return '<div class="top-exp-item"><div class="name">' + esc(u.f.name) + ' — ' + toFa(u.inst.date) + '</div><div class="amt" style="color:var(--danger)">' + moneyHtml(u.inst.amount) + '</div></div>';
            }).join('') + '</div>';
        }
    }

    // بانک‌های با کسری
    var nbEl = document.getElementById('dash-neg-banks');
    if (nbEl) {
        var deficits = [];
        banks.forEach(function(b) {
            var bal = getBankBalance(b.id);
            var minB = Number(b.minBalance) || 0;
            if (bal < minB) deficits.push({ b: b, bal: bal, min: minB, def: bal - minB });
        });
        if (deficits.length === 0) nbEl.innerHTML = '<div class="widget-empty">✅ همه بانک‌ها بالای حداقل هستند.</div>';
        else {
            nbEl.innerHTML = '<div class="top-exp-list">' + deficits.map(function(d) {
                return '<div class="top-exp-item"><div class="name">' + esc(d.b.bank) + ' — ' + toFa(d.b.account || '') + '</div><div class="amt" style="color:var(--danger)">' + moneyHtml(d.def) + '</div></div>';
            }).join('') + '</div>';
        }
    }

    // پرتراکنش‌ترین اشخاص
    var tpEl = document.getElementById('dash-top-persons');
    if (tpEl) {
        var persons = DB.load('persons', []);
        var stats = {};
        vouchers.forEach(function(v) {
            (v.lines || []).forEach(function(l) {
                if (!l.details || !l.details.person) return;
                var pid = l.details.person;
                var amt = (Number(l.debit) || 0) + (Number(l.credit) || 0);
                if (!stats[pid]) stats[pid] = { count: 0, total: 0 };
                stats[pid].count++;
                stats[pid].total += amt;
            });
        });
        var arr = Object.keys(stats).map(function(pid) {
            var p = persons.find(function(x) { return x.id === pid; });
            return { id: pid, name: p ? (p.first || '') + ' ' + (p.last || '') : pid, count: stats[pid].count, total: stats[pid].total };
        }).sort(function(a, b) { return b.total - a.total; }).slice(0, 10);
        if (arr.length === 0) tpEl.innerHTML = '<div class="widget-empty">تراکنشی با اشخاص نیست.</div>';
        else {
            tpEl.innerHTML = '<div class="top-exp-list">' + arr.map(function(x, i) {
                return '<div class="top-exp-item"><div class="rank">' + toFa(i + 1) + '</div><div class="name">' + esc(x.name) + '</div><div class="amt" style="color:var(--primary-dark)">' + moneyHtml(x.total) + '</div></div>';
            }).join('') + '</div>';
        }
    }
}

// UI ترتیب/انتخاب داشبورد در تنظیمات
function renderDashboardOrderUI() {
    var box = document.getElementById('dashboard-order-list');
    if (!box) return;
    var names = {
        cashLiquidity: '💧 نمودار نقدینگی',
        expenseDonut: '🥧 ترکیب هزینه‌ها',
        assetDonut: '🏦 ترکیب دارایی‌ها',
        trendBar: '📊 روند ۶ ماه اخیر',
        topExpenses: '🏆 بیشترین هزینه‌ها',
        lastVouchers: '📄 ۱۰ سند آخر',
        overdueInstallments: '⏰ اقساط سررسید گذشته',
        negativeBanks: '🔴 بانک‌های با کسری',
        topPersons: '👥 پرتراکنش‌ترین اشخاص'
    };
    var order = state.dashboardOrder || [];
    box.innerHTML = '';
    order.forEach(function(key, idx) {
        var row = document.createElement('div');
        row.className = 'widget-order-row';
        var enabled = !!state.dashboards[key];
        row.innerHTML = '<label class="wo-name" style="cursor:pointer"><input type="checkbox" data-dash-toggle="' + key + '" ' + (enabled ? 'checked' : '') + ' style="margin-left:6px"> ' + (names[key] || key) + '</label>' +
            '<div class="wo-btns"><button class="wo-btn" data-dash-key="' + key + '" data-dir="-1"' + (idx === 0 ? ' disabled' : '') + '>↑</button><button class="wo-btn" data-dash-key="' + key + '" data-dir="1"' + (idx === order.length - 1 ? ' disabled' : '') + '>↓</button></div>';
        box.appendChild(row);
    });
    box.querySelectorAll('.wo-btn').forEach(function(b) {
        b.addEventListener('click', function() {
            var key = this.getAttribute('data-dash-key');
            var dir = Number(this.getAttribute('data-dir'));
            var arr = state.dashboardOrder.slice();
            var i = arr.indexOf(key);
            var j = i + dir;
            if (j < 0 || j >= arr.length) return;
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            state.dashboardOrder = arr;
            DB.save('dashboardOrder', arr);
            renderDashboardOrderUI();
            renderDashboard();
        });
    });
    box.querySelectorAll('[data-dash-toggle]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var k = this.getAttribute('data-dash-toggle');
            state.dashboards[k] = this.checked;
            DB.save('dashboards', state.dashboards);
            renderDashboard();
        });
    });
}

/* ==================== ۶) تنظیمات: گروه‌های باز/بسته ==================== */
/* از طریق HTML details/summary پیاده‌سازی می‌شود. برای سازگاری، دکمه‌های باز/بسته همه هم اضافه می‌کنیم */
function initSettingsCollapse() {
    var body = document.querySelector('#settings-modal .modal-body');
    if (!body) return;
    // اگر قبلاً تبدیل نشده، همه modal-section را به details تبدیل کن
    if (body.dataset.collapseReady === '1') return;
    body.dataset.collapseReady = '1';
    var sections = body.querySelectorAll('.modal-section');
    sections.forEach(function(sec, idx) {
        var h3 = sec.querySelector('h3');
        if (!h3) return;
        var title = h3.innerHTML;
        var details = document.createElement('details');
        details.className = 'settings-details';
        if (idx < 3) details.open = true; // سه تا اول باز
        var summary = document.createElement('summary');
        summary.className = 'settings-summary';
        summary.innerHTML = title;
        details.appendChild(summary);
        // انتقال محتوای بعد از h3 به details
        var nodes = [];
        var n = h3.nextSibling;
        while (n) {
            var next = n.nextSibling;
            nodes.push(n);
            n = next;
        }
        // حذف h3 اصلی
        h3.remove();
        nodes.forEach(function(nd) { details.appendChild(nd); });
        sec.parentNode.insertBefore(details, sec);
        sec.remove();
    });
    // افزودن دکمه‌های باز/بسته همه
    var btnBar = document.createElement('div');
    btnBar.className = 'settings-expand-btns';
    btnBar.innerHTML = '<button type="button" class="mini-btn" id="settings-expand-all">باز کردن همه</button><button type="button" class="mini-btn" id="settings-collapse-all">بستن همه</button>';
    body.insertBefore(btnBar, body.firstChild);
    body.querySelector('#settings-expand-all').addEventListener('click', function() {
        body.querySelectorAll('details.settings-details').forEach(function(d) { d.open = true; });
    });
    body.querySelector('#settings-collapse-all').addEventListener('click', function() {
        body.querySelectorAll('details.settings-details').forEach(function(d) { d.open = false; });
    });
}

/* ==================== Init ==================== */
(function() {
    function init() {
        try { initSettingsCollapse(); } catch(e) { console.warn(e); }
        try { renderDashboardOrderUI(); } catch(e) { console.warn(e); }
        // رندر مجدد داشبورد در صورت باز بودن صفحه
        var active = document.querySelector('.page.active');
        if (active && active.id === 'page-dashboard') {
            try { renderDashboard(); } catch(e) {}
        }
        // رندر مجدد ویجت‌ها
        try { if (typeof updateHomeWidgets === 'function') updateHomeWidgets(); } catch(e) {}
        console.log('✨ 10-enhancements.js loaded');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 500); });
    } else {
        setTimeout(init, 500);
    }
})();
