/* =====================================================================
   پارسیس v27 — 09-settings,backup,restore,reset,init.js
   تنظیمات، پشتیبان‌گیری، بازیابی، ریست، راه‌اندازی اولیه
   ===================================================================== */
'use strict';

/* ==================== Backup / Restore / Reset ==================== */
function downloadBackup() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf(LS_PREFIX) === 0) data[k] = localStorage.getItem(k);
    }
    var backup = { app: 'parsis', version: APP_VERSION, exportedAt: new Date().toISOString(), data: data };
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var now = new Date();
    var dateStr = todayJalaliStr().replace(/\//g, '-');
    var timeStr = pad2(now.getHours()) + '-' + pad2(now.getMinutes());
    var a = document.createElement('a');
    a.href = url;
    a.download = 'parsis-' + dateStr + '_' + timeStr + '.json';
    a.click();
    URL.revokeObjectURL(url);
}
function restoreBackup(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var parsed = JSON.parse(e.target.result);
            var data = parsed.data || parsed;
            if (!confirm('⚠️ جایگزین شود؟')) return;
            var keys = Object.keys(data);
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].indexOf(LS_PREFIX) === 0) localStorage.setItem(keys[i], data[keys[i]]);
            }
            alert('✅ بازیابی شد.');
            location.reload();
        } catch(err) {
            alert('❌ ' + err.message);
        }
    };
    reader.readAsText(file);
}
function resetAllData() {
    var pwd = prompt('رمز ریست:');
    if (pwd === null) return;
    if (String(pwd).trim() !== '1234') { alert('رمز اشتباه.'); return; }
    if (!confirm('⚠️ همه داده‌ها پاک شود؟')) return;
    var ks = [];
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS_PREFIX) === 0) ks.push(k);
    }
    ks.forEach(function(k) { localStorage.removeItem(k); });
    alert('✅');
    location.reload();
}

/* ==================== Settings bindings ==================== */
function bindSettingsButtons() {
    document.getElementById('settings-btn').addEventListener('click', function() {
        document.getElementById('settings-modal').classList.add('show');
        document.getElementById('settings-overlay').classList.add('show');
        renderWidgetOrderUI();
        var aboutEl = document.getElementById('about-version');
        if (aboutEl) aboutEl.textContent = APP_NAME + ' — نسخه ' + toFa(APP_VERSION) + ' (PWA)';
    });
    document.getElementById('close-settings').addEventListener('click', closeSettings);
    document.getElementById('settings-overlay').addEventListener('click', closeSettings);
    document.getElementById('modal-backup-btn').addEventListener('click', downloadBackup);
    document.getElementById('modal-restore-btn').addEventListener('click', function() {
        document.getElementById('restore-file').click();
    });
    document.getElementById('restore-file').addEventListener('change', function() {
        if (this.files[0]) restoreBackup(this.files[0]);
        this.value = '';
    });
    document.getElementById('modal-reset-btn').addEventListener('click', resetAllData);
    document.getElementById('logout-btn').addEventListener('click', function() {
        if (confirm('رفرش شود؟')) location.reload();
    });
}

/* ==================== Theme / Font bindings ==================== */
function bindThemeFontButtons() {
    var tC = document.querySelectorAll('.theme-card');
    for (var k = 0; k < tC.length; k++) {
        tC[k].addEventListener('click', function() {
            state.theme = this.getAttribute('data-theme');
            saveState('theme');
            applyTheme(state.theme);
        });
    }
    var fC = document.querySelectorAll('.font-card');
    for (var fc = 0; fc < fC.length; fc++) {
        fC[fc].addEventListener('click', function() {
            state.font = this.getAttribute('data-font');
            saveState('font');
            applyFont(state.font);
        });
    }
}

/* ==================== Widget toggles ==================== */
function bindWidgetToggles() {
    var wT = document.querySelectorAll('[data-widget-toggle]');
    for (var wt = 0; wt < wT.length; wt++) {
        wT[wt].addEventListener('change', function() {
            var k = this.getAttribute('data-widget-toggle');
            state.widgets[k] = this.checked;
            DB.save('widgets', state.widgets);
            updateHomeWidgets();
        });
    }
}

/* ==================== Currency / Hide numbers ==================== */
function bindCurrencyHide() {
    document.getElementById('set-language').value = state.language;
    document.getElementById('set-language').addEventListener('change', function() {
        state.language = this.value;
        saveState('language');
    });
    document.getElementById('set-currency').value = state.currency;
    document.getElementById('set-currency').addEventListener('change', function() {
        state.currency = this.value;
        saveState('currency');
    });
    function onCD(v) {
        state.currencyDisplay = v;
        saveState('currencyDisplay');
        document.getElementById('set-currency-display').value = v;
        document.getElementById('set-currency-display2').value = v;
        updateUnitChips();
        updateHomeWidgets();
        rerenderCurrentPage();
    }
    document.getElementById('set-currency-display').addEventListener('change', function() { onCD(this.value); });
    document.getElementById('set-currency-display2').addEventListener('change', function() { onCD(this.value); });
    function onHN(v) {
        state.hideNumbers = v;
        saveState('hideNumbers');
        document.getElementById('set-hide-numbers').checked = v;
        updateEyeButtons();
        updateHomeWidgets();
        rerenderCurrentPage();
    }
    document.getElementById('set-hide-numbers').addEventListener('change', function() { onHN(this.checked); });
}

/* ==================== Bank/Cash Types ==================== */
function bindBankCashTypes() {
    document.getElementById('add-bank-type').addEventListener('click', function() {
        var v = document.getElementById('new-bank-type').value.trim();
        if (!v) return;
        if (state.bankTypes.indexOf(v) !== -1) return;
        state.bankTypes.push(v);
        saveState('bankTypes');
        document.getElementById('new-bank-type').value = '';
        renderChips('bank-types-list', state.bankTypes, 'bankTypes');
    });
    document.getElementById('add-cash-type').addEventListener('click', function() {
        var v = document.getElementById('new-cash-type').value.trim();
        if (!v) return;
        if (state.cashTypes.indexOf(v) !== -1) return;
        state.cashTypes.push(v);
        saveState('cashTypes');
        document.getElementById('new-cash-type').value = '';
        renderChips('cash-types-list', state.cashTypes, 'cashTypes');
    });
}

/* ==================== SMS bindings ==================== */
function bindSmsButtons() {
    function onSAR(val) {
        state.smsAutoRead = val;
        DB.save('smsAutoRead', val);
        document.getElementById('sms-auto-read').checked = val;
        document.getElementById('set-sms-auto-read').checked = val;
    }
    document.getElementById('sms-auto-read').addEventListener('change', function() { onSAR(this.checked); });
    document.getElementById('set-sms-auto-read').addEventListener('change', function() { onSAR(this.checked); });
    document.getElementById('sms-read-clip').addEventListener('click', function() { readClipboardAndAdd(false); });
    document.getElementById('parse-sms').addEventListener('click', function() {
        var text = document.getElementById('sms-text').value;
        if (!text.trim()) { alert('متن را وارد کن.'); return; }
        var res = addSmsToInbox(text, 'paste');
        if (res.ok) {
            showToast('✅');
            document.getElementById('sms-text').value = '';
            renderSmsInbox();
            updateSmsBadge();
        } else {
            alert(res.reason === 'duplicate' ? 'قبلاً ثبت شده.' : 'قابل تشخیص نبود.');
        }
    });
    document.getElementById('clear-sms').addEventListener('click', function() {
        document.getElementById('sms-text').value = '';
        document.getElementById('sms-result').innerHTML = '';
    });
    document.getElementById('sms-clear-converted').addEventListener('click', function() {
        if (!confirm('حذف تبدیل‌شده‌ها؟')) return;
        var l = getSmsInbox().filter(function(s) { return s.status === 'new'; });
        saveSmsInbox(l);
        renderSmsInbox();
        updateSmsBadge();
    });
}

/* ==================== Fiscal / Person / Company / Bank / Cash / Project forms ==================== */
function bindBaseDataForms() {
    /* Fiscal */
    document.getElementById('save-fiscal').addEventListener('click', function() {
        var id = document.getElementById('fiscal-id').value;
        var t = document.getElementById('fiscal-title').value.trim();
        var f = normalizeDigits(document.getElementById('fiscal-from').value.trim());
        var to = normalizeDigits(document.getElementById('fiscal-to').value.trim());
        if (!t || !f || !to) { alert('همه را پر کن.'); return; }
        var l = DB.load('fiscalPeriods', []);
        if (id) {
            var p = l.find(function(x) { return x.id === id; });
            if (p) { p.title = t; p.from = f; p.to = to; }
        } else {
            var nid = uid();
            l.push({ id: nid, title: t, from: f, to: to });
            if (!state.activePeriodId) { state.activePeriodId = nid; saveState('activePeriodId'); }
        }
        DB.save('fiscalPeriods', l);
        clearFiscalForm();
        showToast('✅');
        renderFiscalList();
        updateTopbarPeriod();
        document.querySelector('[data-tab="fiscal-list"]').click();
    });
    document.getElementById('new-fiscal').addEventListener('click', clearFiscalForm);

    /* Person */
    document.getElementById('save-person').addEventListener('click', function() {
        var id = document.getElementById('pr-id').value;
        var f = document.getElementById('pr-first').value.trim();
        if (!f) { alert('نام اجباری.'); return; }
        var o = {
            id: id || uid(),
            first: f,
            last: document.getElementById('pr-last').value.trim(),
            father: document.getElementById('pr-father').value.trim(),
            nationalId: normalizeDigits(document.getElementById('pr-national-id').value.trim()),
            birth: normalizeDigits(document.getElementById('pr-birth').value.trim()),
            mobile: normalizeDigits(document.getElementById('pr-mobile').value.trim()),
            phone: normalizeDigits(document.getElementById('pr-phone').value.trim()),
            email: document.getElementById('pr-email').value.trim(),
            bankTitle: document.getElementById('pr-bank-title').value.trim(),
            acc: normalizeDigits(document.getElementById('pr-acc').value.trim()),
            iban: document.getElementById('pr-iban').value.trim(),
            card: normalizeDigits(document.getElementById('pr-card').value.trim()),
            address: document.getElementById('pr-address').value.trim()
        };
        var l = DB.load('persons', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; }
        else l.push(o);
        DB.save('persons', l);
        showToast('✅');
        clearPersonForm();
        renderPersonsList();
        updateHomeWidgets();
        document.querySelector('[data-tab="persons-list"]').click();
    });
    document.getElementById('new-person').addEventListener('click', clearPersonForm);

    /* Company */
    document.getElementById('save-company').addEventListener('click', function() {
        var id = document.getElementById('co-id').value;
        var n = document.getElementById('co-name').value.trim();
        if (!n) { alert('نام اجباری.'); return; }
        var o = {
            id: id || uid(),
            name: n,
            phone: normalizeDigits(document.getElementById('co-phone').value.trim()),
            email: document.getElementById('co-email').value.trim(),
            address: document.getElementById('co-address').value.trim()
        };
        var l = DB.load('companies', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; }
        else l.push(o);
        DB.save('companies', l);
        showToast('✅');
        clearCompanyForm();
        renderCompaniesList();
        document.querySelector('[data-tab="comp-list"]').click();
    });
    document.getElementById('new-company').addEventListener('click', clearCompanyForm);

    /* Bank Account */
    document.getElementById('save-ba').addEventListener('click', function() {
        var id = document.getElementById('ba-id').value;
        var b = document.getElementById('ba-bank').value.trim();
        if (!b) { alert('نام بانک اجباری.'); return; }
        var oR = normalizeDigits(document.getElementById('ba-order').value.trim());
        var o = oR === '' ? null : Number(oR);
        var mb = parseMoney(normalizeDigits(document.getElementById('ba-min-balance').value));
        var o2 = {
            id: id || uid(),
            bank: b,
            type: document.getElementById('ba-type').value,
            branchCode: normalizeDigits(document.getElementById('ba-branch-code').value.trim()),
            branchName: document.getElementById('ba-branch-name').value.trim(),
            account: normalizeDigits(document.getElementById('ba-account').value.trim()),
            iban: document.getElementById('ba-iban').value.trim(),
            card: normalizeDigits(document.getElementById('ba-card').value.trim()),
            order: o,
            minBalance: mb
        };
        var l = DB.load('bankAccounts', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o2; }
        else l.push(o2);
        DB.save('bankAccounts', l);
        showToast('✅');
        clearBAForm();
        renderBankAccountsList();
        updateHomeWidgets();
        document.querySelector('[data-tab="ba-list"]').click();
    });
    document.getElementById('new-ba').addEventListener('click', clearBAForm);

    /* Cash Box */
    document.getElementById('save-cb').addEventListener('click', function() {
        var id = document.getElementById('cb-id').value;
        var t = document.getElementById('cb-title').value.trim();
        if (!t) { alert('عنوان اجباری.'); return; }
        var oR = normalizeDigits(document.getElementById('cb-order').value.trim());
        var o = oR === '' ? null : Number(oR);
        var o2 = {
            id: id || uid(),
            title: t,
            type: document.getElementById('cb-type').value,
            unit: document.getElementById('cb-unit').value.trim(),
            order: o
        };
        var l = DB.load('cashBoxes', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o2; }
        else l.push(o2);
        DB.save('cashBoxes', l);
        showToast('✅');
        clearCBForm();
        renderCashBoxesList();
        updateHomeWidgets();
        document.querySelector('[data-tab="cb-list"]').click();
    });
    document.getElementById('new-cb').addEventListener('click', clearCBForm);

    /* Project */
    document.getElementById('save-project').addEventListener('click', function() {
        var id = document.getElementById('pj-id').value;
        var n = document.getElementById('pj-name').value.trim();
        if (!n) { alert('نام اجباری.'); return; }
        var o = { id: id || uid(), name: n };
        var l = DB.load('projects', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; }
        else l.push(o);
        DB.save('projects', l);
        showToast('✅');
        document.getElementById('pj-id').value = '';
        document.getElementById('pj-name').value = '';
        renderProjectsList();
        document.querySelector('[data-tab="proj-list"]').click();
    });
    document.getElementById('new-project').addEventListener('click', function() {
        document.getElementById('pj-id').value = '';
        document.getElementById('pj-name').value = '';
    });
}

/* ==================== Estimate / CFS / Facility forms ==================== */
function bindCashForms() {
    /* Estimate */
    document.getElementById('est-add-item').addEventListener('click', function() {
        estimateItems.push({ id: uid(), date: '', amount: 0 });
        renderEstimateItems();
    });
    document.getElementById('est-auto-gen').addEventListener('click', autoGenerateEstimate);
    document.getElementById('save-est').addEventListener('click', saveEstimate);
    document.getElementById('new-est').addEventListener('click', clearEstForm);

    /* CFS */
    document.getElementById('cfs-moein').addEventListener('change', onCfsMoeinChange);
    document.getElementById('save-cfs').addEventListener('click', saveCfsSource);
    document.getElementById('new-cfs').addEventListener('click', clearCfsForm);

    /* Facility */
    document.getElementById('save-fac').addEventListener('click', function() {
        var id = document.getElementById('fc-id').value;
        var name = document.getElementById('fc-name').value.trim();
        if (!name) { alert('نام اجباری.'); return; }
        var init = parseMoney(normalizeDigits(document.getElementById('fc-initial').value));
        if (!init) { alert('مبلغ اولیه اجباری.'); return; }
        var tp = currentInstallments.reduce(function(s, x) {
            return s + (x.status === 'paid' ? Number(x.amount || 0) : 0);
        }, 0);
        var ap = currentInstallments.length > 0 && currentInstallments.every(function(x) { return x.status === 'paid'; });
        var o = {
            id: id || uid(),
            name: name,
            category: document.getElementById('fc-category').value,
            bankId: document.getElementById('fc-bank').value,
            date: normalizeDigits(document.getElementById('fc-date').value),
            initial: init,
            paid: tp,
            installments: currentInstallments,
            status: ap ? 'settled' : 'active'
        };
        var l = DB.load('facilities', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; }
        else l.push(o);
        DB.save('facilities', l);
        showToast('✅');
        clearFacForm();
        renderFacilitiesList();
        document.querySelector('[data-tab="fac-list"]').click();
        updateHomeWidgets();
    });
    document.getElementById('new-fac').addEventListener('click', clearFacForm);
    document.getElementById('fac-add-inst').addEventListener('click', function() {
        currentInstallments.push({ id: uid(), date: '', amount: 0, status: 'registered' });
        renderInstallments();
    });
    document.getElementById('fac-auto-gen').addEventListener('click', autoGenerateInstallments);
    document.getElementById('fac-save-inst').addEventListener('click', function() {
        if (!currentFacilityId) { alert('ابتدا ذخیره کن.'); return; }
        var l = DB.load('facilities', []);
        var idx = -1;
        for (var i = 0; i < l.length; i++) if (l[i].id === currentFacilityId) { idx = i; break; }
        if (idx === -1) return;
        var tp = currentInstallments.reduce(function(s, x) {
            return s + (x.status === 'paid' ? Number(x.amount || 0) : 0);
        }, 0);
        var ap = currentInstallments.length > 0 && currentInstallments.every(function(x) { return x.status === 'paid'; });
        l[idx].installments = JSON.parse(JSON.stringify(currentInstallments));
        l[idx].paid = tp;
        l[idx].status = ap ? 'settled' : 'active';
        DB.save('facilities', l);
        showToast('✅');
        renderFacilitiesList();
        updateHomeWidgets();
    });
    attachMoneyInput(document.getElementById('fc-initial'), function(v) { renderInstallmentsTotals(); });
    attachMoneyInput(document.getElementById('ba-min-balance'));
    attachMoneyInput(document.getElementById('cfs-amount'));
    attachMoneyInput(document.getElementById('est-total'));
}

/* ==================== Chart form ==================== */
function bindChartForm() {
    document.getElementById('load-default-chart').addEventListener('click', loadDefaultChart);
    document.getElementById('add-group').addEventListener('click', function() { openChartForm(null, 1, null); });
    document.getElementById('save-chart').addEventListener('click', function() {
        var id = document.getElementById('ch-id').value;
        var level = Number(document.getElementById('ch-level').value) || 1;
        var code = normalizeDigits(document.getElementById('ch-code').value.trim());
        var name = document.getElementById('ch-name').value.trim();
        if (!code || !name) { alert('کد و عنوان اجباری.'); return; }
        var links = [];
        var cbs = document.querySelectorAll('#ch-links-box input[type=checkbox]:checked');
        for (var li = 0; li < cbs.length; li++) links.push(cbs[li].value);
        var o = {
            id: id || uid(),
            code: code,
            name: name,
            parent: document.getElementById('ch-parent').value || '',
            level: level,
            cat: document.getElementById('ch-cat').value,
            nature: document.getElementById('ch-nature').value,
            links: (level === 3) ? links : [],
            cfEffect: (level === 3) ? document.getElementById('ch-cf-effect').checked : false,
            active: document.getElementById('ch-active').checked
        };
        var l = DB.load('accounts', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; }
        else l.push(o);
        DB.save('accounts', l);
        showToast('✅');
        document.getElementById('chart-form-card').style.display = 'none';
        renderChartTree('chart-tree', true);
        document.getElementById('load-default-chart').disabled = true;
        refreshTemplateSelect();
    });
    document.getElementById('cancel-chart').addEventListener('click', function() {
        document.getElementById('chart-form-card').style.display = 'none';
    });
    document.getElementById('cd-expand').addEventListener('click', function() { setAllExpanded(true); });
    document.getElementById('cd-collapse').addEventListener('click', function() { setAllExpanded(false); });
    document.getElementById('charttree-search').addEventListener('input', function() {
        renderChartTree('chart-tree', true);
    });
}

/* ==================== Voucher form ==================== */
function bindVoucherForm() {
    document.getElementById('add-line').addEventListener('click', function() {
        voucherLines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
        renderVoucherLines();
    });
    document.getElementById('save-voucher').addEventListener('click', function() { persistVoucher(false); });
    document.getElementById('save-voucher-approve').addEventListener('click', function() { persistVoucher(true); });
    document.getElementById('new-voucher').addEventListener('click', newVoucherForm);
    document.getElementById('v-desc-clear').addEventListener('click', function() {
        document.getElementById('v-desc').value = '';
        document.getElementById('v-desc').focus();
        showToast('🧹 شرح سند خالی شد.');
    });
    document.getElementById('apply-template').addEventListener('click', function() {
        var id = document.getElementById('v-template').value;
        if (!id) { alert('الگو انتخاب کن.'); return; }
        applyTemplate(id);
    });
    document.getElementById('save-as-template').addEventListener('click', saveVoucherAsTemplate);
    document.getElementById('goto-templates').addEventListener('click', function() { goToPage('templates'); });
    document.getElementById('vl-period-filter').addEventListener('change', renderVoucherList);
    document.getElementById('vlist-search').addEventListener('input', renderVoucherList);
}

/* ==================== Template form ==================== */
function bindTemplateForm() {
    document.getElementById('tpl-add-line').addEventListener('click', function() {
        templateLines.push({ side: 'debit', account: '', details: {}, desc: '', fixedAmount: 0 });
        renderTemplateLines();
    });
    document.getElementById('save-tpl').addEventListener('click', function() {
        var id = document.getElementById('tpl-id').value;
        var name = document.getElementById('tpl-name').value.trim();
        if (!name) { alert('نام اجباری.'); return; }
        var valid = templateLines.filter(function(l) { return l.account || l.desc; });
        if (valid.length === 0) { alert('حداقل یک قلم.'); return; }
        var o = {
            id: id || uid(),
            name: name,
            desc: document.getElementById('tpl-desc').value.trim(),
            lines: valid.map(function(l) {
                return {
                    side: l.side,
                    account: l.account || '',
                    details: l.details || {},
                    desc: l.desc || '',
                    fixedAmount: Number(l.fixedAmount) || 0
                };
            })
        };
        var l = DB.load('voucherTemplates', []);
        if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = o; }
        else l.push(o);
        DB.save('voucherTemplates', l);
        showToast('✅');
        document.getElementById('tpl-id').value = '';
        document.getElementById('tpl-name').value = '';
        document.getElementById('tpl-desc').value = '';
        templateLines = [];
        renderTemplateLines();
        renderTemplateList();
        refreshTemplateSelect();
        document.querySelector('[data-tab="tpl-list"]').click();
    });
    document.getElementById('new-tpl').addEventListener('click', function() {
        document.getElementById('tpl-id').value = '';
        document.getElementById('tpl-name').value = '';
        document.getElementById('tpl-desc').value = '';
        templateLines = [];
        renderTemplateLines();
    });
    document.getElementById('tpl-load-defaults').addEventListener('click', function() {
        var l = DB.load('voucherTemplates', []);
        var d = getDefaultTemplates();
        var added = 0;
        d.forEach(function(x) {
            if (!l.some(function(y) { return y.name === x.name; })) { l.push(x); added++; }
        });
        DB.save('voucherTemplates', l);
        renderTemplateList();
        refreshTemplateSelect();
        showToast('✅ ' + toFa(added) + ' افزوده شد.');
    });
    document.getElementById('add-std-desc').addEventListener('click', function() {
        var inp = document.getElementById('new-std-desc');
        var v = inp.value.trim();
        if (!v) return;
        var l = DB.load('standardDescriptions', getDefaultStdDescriptions());
        if (l.indexOf(v) !== -1) { alert('قبلاً.'); return; }
        l.push(v);
        DB.save('standardDescriptions', l);
        inp.value = '';
        renderStdDescChips();
        refreshStdDescDatalist();
    });
}

/* ==================== Report buttons ==================== */
function bindReportButtons() {
    /* Cashflow */
    document.getElementById('cf-run').addEventListener('click', runCashFlowReport);
    document.getElementById('cf-today').addEventListener('click', function() {
        var t = todayJalaliStr();
        document.getElementById('cf-from').value = t;
        document.getElementById('cf-to').value = addJalaliDays(t, 30);
        runCashFlowReport();
    });
    document.getElementById('cf-print').addEventListener('click', function() { printHtmlReport('#cf-result', 'وضعیت نقدینگی'); });
    document.getElementById('cf-export').addEventListener('click', function() { exportReportTable('#cf-result', 'cash-flow'); });

    /* Cashflow by desc */
    document.getElementById('cfd-run').addEventListener('click', runCashFlowByDescReport);
    document.getElementById('cfd-today').addEventListener('click', function() {
        var t = todayJalaliStr();
        document.getElementById('cfd-from').value = t;
        document.getElementById('cfd-to').value = addJalaliDays(t, 30);
        runCashFlowByDescReport();
    });
    document.getElementById('cfd-print').addEventListener('click', function() { printHtmlReport('#cfd-result', 'گردش وجه نقد'); });
    document.getElementById('cfd-export').addEventListener('click', function() { exportReportTable('#cfd-result', 'cash-flow-by-desc'); });

    /* Rates */
    document.getElementById('rr-run').addEventListener('click', runRatesReport);
    document.getElementById('rr-print').addEventListener('click', function() { printHtmlReport('#rr-result', 'گزارش نرخ ارز و طلا'); });
    document.getElementById('rr-export').addEventListener('click', function() { exportReportTable('#rr-result', 'rates'); });
    document.getElementById('live-rates-refresh').addEventListener('click', function() { fetchLiveRates(); });

    /* Daily close */
    document.getElementById('dc-save').addEventListener('click', saveDailyClosePrices);

    /* Account / Trial / Incomplete / Facility reports */
    document.getElementById('ra-run').addEventListener('click', runAccountReport);
    document.getElementById('rt-run').addEventListener('click', runTrialBalance);
    document.getElementById('ri-run').addEventListener('click', runIncompleteReport);
    document.getElementById('rf-run').addEventListener('click', runFacilityReport);
    document.getElementById('rff-run').addEventListener('click', runFacilityFullReport);
    document.getElementById('ra-print').addEventListener('click', function() { printHtmlReport('#ra-result', 'مرور حساب‌ها'); });
    document.getElementById('rt-print').addEventListener('click', function() { printHtmlReport('#rt-result', 'تراز آزمایشی'); });
    document.getElementById('ri-print').addEventListener('click', function() { printHtmlReport('#ri-result', 'تراکنش‌های تکمیل نشده'); });
    document.getElementById('rf-print').addEventListener('click', function() { printHtmlReport('#rf-result', 'خلاصه تسهیلات'); });
    document.getElementById('rff-print').addEventListener('click', function() { printHtmlReport('#rff-result', 'گزارش جامع تسهیلات'); });
    document.getElementById('ra-export').addEventListener('click', function() { exportReportTable('#ra-result', 'account-report'); });
    document.getElementById('rt-export').addEventListener('click', function() { exportReportTable('#rt-result', 'trial-balance'); });
    document.getElementById('ri-export').addEventListener('click', function() { exportReportTable('#ri-result', 'incomplete-transactions'); });
    document.getElementById('rf-export').addEventListener('click', function() { exportReportTable('#rf-result', 'facility-summary'); });
    document.getElementById('rff-export').addEventListener('click', function() { exportReportTable('#rff-result', 'facility-full-report'); });
    document.getElementById('rf-category').addEventListener('change', runFacilityReport);
    document.getElementById('rf-status').addEventListener('change', runFacilityReport);
    document.getElementById('rff-category').addEventListener('change', runFacilityFullReport);
    document.getElementById('rff-status').addEventListener('change', runFacilityFullReport);
    document.getElementById('rff-inst-status').addEventListener('change', runFacilityFullReport);
    document.getElementById('rff-bank').addEventListener('change', runFacilityFullReport);
    document.getElementById('rff-search').addEventListener('input', runFacilityFullReport);
    ['rff-from','rff-to'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', runFacilityFullReport);
    });
    var rffTabs = document.querySelectorAll('[data-rff-view]');
    for (var ti = 0; ti < rffTabs.length; ti++) {
        rffTabs[ti].addEventListener('click', function() {
            var v = this.getAttribute('data-rff-view');
            state.rffView = v;
            saveState('rffView');
            for (var z = 0; z < rffTabs.length; z++) rffTabs[z].classList.toggle('active', rffTabs[z].getAttribute('data-rff-view') === v);
            runFacilityFullReport();
        });
        rffTabs[ti].classList.toggle('active', rffTabs[ti].getAttribute('data-rff-view') === state.rffView);
    }
    document.getElementById('ra-expand').addEventListener('click', function() {
        state.reportExpandedNodes = {};
        if (window._renderAccountReportTree) window._renderAccountReportTree();
    });
    document.getElementById('ra-collapse').addEventListener('click', function() {
        var accounts = DB.load('accounts', []);
        var nodes = {};
        accounts.forEach(function(a) { nodes[a.id] = false; });
        state.reportExpandedNodes = nodes;
        if (window._renderAccountReportTree) window._renderAccountReportTree();
    });
    document.getElementById('cfd-export').addEventListener('click', function() { exportReportTable('#cfd-result', 'cash-flow-by-desc'); });
}

/* ==================== Modals close ==================== */
function bindModalClosers() {
    document.getElementById('close-vpreview').addEventListener('click', closeVoucherPreview);
    document.getElementById('vpreview-close-btn').addEventListener('click', closeVoucherPreview);
    document.getElementById('vpreview-overlay').addEventListener('click', closeVoucherPreview);
    document.getElementById('vpreview-print').addEventListener('click', printVoucherPreview);

    document.getElementById('close-turnover').addEventListener('click', closeTurnover);
    document.getElementById('turnover-close-btn').addEventListener('click', closeTurnover);
    document.getElementById('turnover-overlay').addEventListener('click', closeTurnover);
    document.getElementById('turnover-print').addEventListener('click', function() { printHtmlReport('#turnover-body', 'گردش حساب'); });

    document.getElementById('close-imgview').addEventListener('click', function() {
        document.getElementById('imgview-modal').classList.remove('show');
        document.getElementById('imgview-overlay').classList.remove('show');
    });
    document.getElementById('imgview-overlay').addEventListener('click', function() {
        document.getElementById('imgview-modal').classList.remove('show');
        document.getElementById('imgview-overlay').classList.remove('show');
    });

    document.getElementById('close-noteview').addEventListener('click', closeNoteView);
    document.getElementById('noteview-overlay').addEventListener('click', closeNoteView);
}

/* ==================== Notes bindings ==================== */
function bindNotesForm() {
    document.getElementById('nt-add-item').addEventListener('click', function() {
        noteChecklist.push({ id: uid(), text: '', done: false });
        renderNoteChecklist();
    });
    document.getElementById('nt-save').addEventListener('click', saveNote);
    document.getElementById('nt-new').addEventListener('click', clearNoteForm);
    document.getElementById('nt-cancel').addEventListener('click', function() {
        clearNoteForm();
        document.querySelector('[data-tab="notes-list"]').click();
    });
    var ntImgInput = document.getElementById('nt-image-input');
    ntImgInput.addEventListener('click', function(e) {
        if (window.showOpenFilePicker) {
            e.preventDefault();
            handleNoteImagesFS();
        }
    });
    ntImgInput.addEventListener('change', function() {
        if (!window.showOpenFilePicker && this.files && this.files.length) {
            handleNoteImages(this.files);
        }
        this.value = '';
    });
    document.getElementById('notes-filter').addEventListener('input', renderNotesList);
    var notesViewBtns = document.querySelectorAll('[data-notes-view]');
    for (var nv = 0; nv < notesViewBtns.length; nv++) {
        notesViewBtns[nv].addEventListener('click', function() {
            state.notesView = this.getAttribute('data-notes-view');
            saveState('notesView');
            renderNotesList();
        });
    }
}

/* ==================== Sidebar / Nav bindings ==================== */
function bindSidebarNav() {
    document.getElementById('menu-btn').addEventListener('click', openSidebar);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    document.getElementById('overlay').addEventListener('click', function() {
        closeSidebar();
        closeSettings();
    });
    var titles = document.querySelectorAll('.nav-group-title');
    for (var i = 0; i < titles.length; i++) {
        titles[i].addEventListener('click', function() {
            this.parentElement.classList.toggle('collapsed');
        });
    }
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.nav-group-items button[data-page]');
        if (btn) goToPage(btn.getAttribute('data-page'));
    });
    document.getElementById('side-expand').addEventListener('click', function() {
        document.querySelectorAll('.nav-group').forEach(function(g) { g.classList.remove('collapsed'); });
    });
    document.getElementById('side-collapse').addEventListener('click', function() {
        document.querySelectorAll('.nav-group').forEach(function(g) { g.classList.add('collapsed'); });
    });
    var hpTabs = document.querySelectorAll('.home-page-tab');
    for (var hpt = 0; hpt < hpTabs.length; hpt++) {
        hpTabs[hpt].addEventListener('click', function() {
            setHomePage(Number(this.getAttribute('data-home-page')));
        });
    }
}

/* ==================== Filter bindings ==================== */
function bindFilterInputs() {
    document.getElementById('fiscal-filter').addEventListener('input', renderFiscalList);
    document.getElementById('persons-filter').addEventListener('input', renderPersonsList);
    document.getElementById('comp-filter').addEventListener('input', renderCompaniesList);
    document.getElementById('ba-filter').addEventListener('input', renderBankAccountsList);
    document.getElementById('cb-filter').addEventListener('input', renderCashBoxesList);
    document.getElementById('proj-filter').addEventListener('input', renderProjectsList);
    document.getElementById('fac-filter').addEventListener('input', renderFacilitiesList);
    document.getElementById('fac-cat-filter').addEventListener('change', renderFacilitiesList);
    document.getElementById('cfs-filter').addEventListener('input', renderCfsList);
    document.getElementById('est-filter').addEventListener('input', renderEstimateList);
}

/* ==================== Export button bindings ==================== */
function bindExportButtons() {
    var eB = document.querySelectorAll('.export-btn[data-export]');
    for (var e = 0; e < eB.length; e++) {
        eB[e].addEventListener('click', function() {
            exportToCsv(this.getAttribute('data-export'), this.getAttribute('data-export'));
        });
    }
}

/* ==================== INIT ==================== */
function init() {
    /* ظاهر و فونت */
    applyTheme(state.theme);
    applyFont(state.font);

    /* چیپ‌ها */
    renderChips('bank-types-list', state.bankTypes, 'bankTypes');
    renderChips('cash-types-list', state.cashTypes, 'cashTypes');

    /* سیستم‌های عمومی */
    setupTabs();
    setupSorting();
    initCalendarListeners();
    initCalculator();
    initSidebarSearch();
    initHomeSwipe();

    /* دیفالت‌ها */
    if (DB.load('accounts', []).length > 0) {
        var ldc = document.getElementById('load-default-chart');
        if (ldc) ldc.disabled = true;
    }
    if (!localStorage.getItem(LS_PREFIX + 'voucherTemplates')) DB.save('voucherTemplates', getDefaultTemplates());
    if (!localStorage.getItem(LS_PREFIX + 'standardDescriptions')) DB.save('standardDescriptions', getDefaultStdDescriptions());
    refreshStdDescDatalist();
    refreshTemplateSelect();
    renderTemplateList();
    applyWidgetVisibility();
    renderWidgetOrderUI();
    renderFrequentNav();
    renderSmsInbox();
    updateSmsBadge();

    /* تنظیمات اولیه */
    document.getElementById('set-currency-display2').value = state.currencyDisplay;
    document.getElementById('set-hide-numbers').checked = state.hideNumbers;
    document.getElementById('set-sms-auto-read').checked = state.smsAutoRead;
    document.getElementById('sms-auto-read').checked = state.smsAutoRead;
    var aboutEl = document.getElementById('about-version');
    if (aboutEl) aboutEl.textContent = APP_NAME + ' — نسخه ' + toFa(APP_VERSION) + ' (PWA)';
    updateUnitChips();

    /* بایندینگ‌ها */
    bindSidebarNav();
    bindSettingsButtons();
    bindThemeFontButtons();
    bindWidgetToggles();
    bindCurrencyHide();
    bindBankCashTypes();
    bindSmsButtons();
    bindBaseDataForms();
    bindCashForms();
    bindChartForm();
    bindVoucherForm();
    bindTemplateForm();
    bindReportButtons();
    bindModalClosers();
    bindNotesForm();
    bindFilterInputs();
    bindExportButtons();

    /* بروزرسانی اولیه */
    updateDateDisplay();
    updateTopbarPeriod();
    updateHomeWidgets();
    updateEyeButtons();
    setInterval(function() {
        updateDateDisplay();
        updateTopbarPeriod();
    }, 60000);

    /* فرم سند جدید */
    newVoucherForm();
    attachDatePickers();
    buildHeaderButtons();
    makeAllTablesResizable();
    checkClipboardSupport();
    clearNoteForm();

    /* کارت‌های قابل جمع شدن */
    makeCardCollapsible(document.getElementById('voucher-template-card'), 'voucher-template-card', true);
    makeCardCollapsible(document.getElementById('voucher-head-card'), 'voucher-head-card', true);

    /* نرخ لحظه‌ای */
    setTimeout(function() { fetchLiveRates(true); }, 1500);
    setInterval(function() {
        if (state.widgets.liveRates) fetchLiveRates(true);
    }, 300000);

    /* خواندن خودکار پیامک */
    function autoRead() {
        if (!state.smsAutoRead) return;
        setTimeout(function() { readClipboardAndAdd(true); }, 700);
    }
    window.addEventListener('focus', autoRead);
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') autoRead();
    });

    /* AI */
    aiInit();
    aiRender();
    initAvalaiCreditRefresh();

    /* estimate / auto helpers */
    renderEstimateItems();
    autoAttachReportHelpers();

    console.log('🎉 ' + APP_NAME + ' v' + APP_VERSION + ' — آماده است. (۹ ماژول بارگذاری شد)');
}

/* ==================== Start ==================== */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

/* Service Worker */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function(e) { console.log('SW:', e); });
}
