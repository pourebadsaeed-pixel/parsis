/* =====================================================================
   پارسیس v37 — 16-calendar-v37.js
   رفع نهایی:
     ۱) رفع نمایش تفصیلی معین‌های چند-نوعی (یک سلول جستجو + یک سلول انتخاب)
     ۲) افزودن ساعت به اقساط (پیش‌فرض ۲۱:۰۰) با انتخابگر ساعت عقربه‌ای
     ۳) تقویم حرفه‌ای جدید (فقط اقساط + منابع دریافتنی)
     ۴) نمایش کامل اسم/شماره روز شمسی + میلادی زیر آن
     ۵) رفع آیکن تقویم در ورودی‌های تاریخ
     ۶) سیستم یادآور با مودال اجباری
   ===================================================================== */
'use strict';

/* =====================================================================
   ۱) نمایش تفصیلی معین چند-نوعی — نسخه اصلاح‌شده
   ===================================================================== */
(function fixCombinedDetailCell() {
    window.renderVoucherLines = function() {
        var box = document.getElementById('voucher-lines');
        if (!box) return;
        box.innerHTML = '';
        if (voucherLines.length === 0) {
            voucherLines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
        }
        var leaves = getLeafAccounts();
        var accounts = DB.load('accounts', []);

        for (var i = 0; i < voucherLines.length; i++) (function(idx) {
            var line = voucherLines[idx];
            if (!line.details) line.details = {};
            var wrap = document.createElement('div');
            wrap.className = 'voucher-line' + (line.locked ? ' locked' : '');
            wrap.setAttribute('data-line-id', line.id);

            var numSpan = document.createElement('span');
            numSpan.className = 'ln-num' + (line.locked ? ' locked-tag' : '');
            numSpan.textContent = '#' + toFa(idx + 1) + (line.locked ? ' 🔒' : '');
            wrap.appendChild(numSpan);

            /* ردیف ۱: انتخاب معین */
            var mainGrid = document.createElement('div');
            mainGrid.className = 'ln-search-row';
            mainGrid.style.paddingTop = '14px';

            var sA = document.createElement('input');
            sA.type = 'text';
            sA.className = 'ln-search';
            sA.placeholder = '🔍 جستجوی معین...';

            var selA = document.createElement('select');
            var fillA = function(q) {
                var cur = line.account;
                var f = leaves.filter(function(l) {
                    if (!q) return true;
                    return getAccountSearchText(l.id, accounts).indexOf(q) !== -1;
                });
                selA.innerHTML = '';
                var ph = document.createElement('option');
                ph.value = ''; ph.textContent = '— معین —';
                selA.appendChild(ph);
                for (var k = 0; k < f.length; k++) {
                    var o = document.createElement('option');
                    o.value = f[k].id;
                    o.textContent = getAccountLabel(f[k].id, accounts);
                    if (cur === f[k].id) o.selected = true;
                    selA.appendChild(o);
                }
            };
            fillA('');
            if (line.locked) selA.disabled = true;
            sA.addEventListener('input', function() { fillA(normalizeDigits(this.value.trim().toLowerCase())); });
            selA.addEventListener('change', function() {
                line.account = this.value;
                line.details = {};
                renderVoucherLines();
            });
            mainGrid.appendChild(sA);
            mainGrid.appendChild(selA);
            wrap.appendChild(mainGrid);

            /* ردیف ۲: انتخاب تفصیلی ترکیبی (همه انواع در یک سلول) */
            var acc = accounts.find(function(a) { return a.id === line.account; });
            if (acc && acc.links && acc.links.length > 0) {
                var combined = [];
                acc.links.forEach(function(lt) {
                    var items = getLinkedItems(lt);
                    items.forEach(function(it) {
                        combined.push({
                            linkType: lt,
                            id: it.id,
                            label: linkTypeName(lt) + ': ' + getLinkedItemLabel(lt, it),
                            searchText: (getLinkedItemLabel(lt, it) + ' ' + linkTypeName(lt)).toLowerCase()
                        });
                    });
                });
                var currentLT = null, currentID = null;
                if (line.details) {
                    acc.links.forEach(function(lt) {
                        if (line.details[lt]) { currentLT = lt; currentID = line.details[lt]; }
                    });
                }
                var detGrid = document.createElement('div');
                detGrid.className = 'ln-search-row';
                detGrid.style.marginTop = '8px';

                var sD = document.createElement('input');
                sD.type = 'text';
                sD.className = 'ln-search';
                sD.placeholder = '🔍 جستجوی تفصیلی...';

                var selD = document.createElement('select');
                var fillD = function(q) {
                    selD.innerHTML = '';
                    var ph = document.createElement('option');
                    ph.value = ''; ph.textContent = '— تفصیلی —';
                    selD.appendChild(ph);
                    combined.forEach(function(c) {
                        if (q && c.searchText.indexOf(q) === -1) return;
                        var o = document.createElement('option');
                        o.value = c.linkType + '::' + c.id;
                        o.textContent = c.label;
                        if (c.linkType === currentLT && c.id === currentID) o.selected = true;
                        selD.appendChild(o);
                    });
                };
                fillD('');
                if (line.locked) selD.disabled = true;
                sD.addEventListener('input', function() {
                    var q = normalizeDigits(this.value.trim().toLowerCase());
                    var curVal = selD.value;
                    fillD(q);
                    if (curVal) {
                        for (var k = 0; k < selD.options.length; k++) {
                            if (selD.options[k].value === curVal) { selD.selectedIndex = k; break; }
                        }
                    }
                });
                selD.addEventListener('change', function() {
                    line.details = {};
                    if (this.value) {
                        var parts = this.value.split('::');
                        line.details[parts[0]] = parts[1];
                        currentLT = parts[0]; currentID = parts[1];
                    }
                });
                detGrid.appendChild(sD);
                detGrid.appendChild(selD);
                wrap.appendChild(detGrid);
            }

            /* ردیف ۳: مبالغ + شماره‌های پیگیری */
            var r3 = document.createElement('div');
            r3.className = 'ln-row r4';
            r3.style.marginTop = '10px';

            var wD = document.createElement('div');
            wD.className = 'ln-amount-wrap';
            var iD = document.createElement('input');
            iD.type = 'text'; iD.inputMode = 'numeric'; iD.dir = 'ltr'; iD.placeholder = 'بدهکار';
            iD.value = line.debit ? formatRaw(line.debit) : '';
            iD.addEventListener('input', function() {
                var v = normalizeDigits(this.value);
                var r = v.replace(/[^\d]/g, '');
                this.value = r;
                var x = Number(r) || 0;
                line.debit = x;
                if (x > 0 && line.credit !== 0) { line.credit = 0; iC.value = ''; }
                updateVoucherTotals();
            });
            iD.addEventListener('blur', function() {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
                line.debit = v;
                updateVoucherTotals();
            });
            var cD = document.createElement('button');
            cD.type = 'button'; cD.className = 'calc-btn'; cD.title = 'ماشین حساب'; cD.textContent = '🧮';
            cD.addEventListener('click', function() {
                calcOpen(function() { return line.debit || 0; }, function(v) {
                    line.debit = v;
                    if (v > 0 && line.credit !== 0) { line.credit = 0; }
                    renderVoucherLines(); updateVoucherTotals();
                }, 'ماشین حساب بدهکار');
            });
            wD.appendChild(iD); wD.appendChild(cD);

            var wC = document.createElement('div');
            wC.className = 'ln-amount-wrap';
            var iC = document.createElement('input');
            iC.type = 'text'; iC.inputMode = 'numeric'; iC.dir = 'ltr'; iC.placeholder = 'بستانکار';
            iC.value = line.credit ? formatRaw(line.credit) : '';
            iC.addEventListener('input', function() {
                var v = normalizeDigits(this.value);
                var r = v.replace(/[^\d]/g, '');
                this.value = r;
                var x = Number(r) || 0;
                line.credit = x;
                if (x > 0 && line.debit !== 0) { line.debit = 0; iD.value = ''; }
                updateVoucherTotals();
            });
            iC.addEventListener('blur', function() {
                var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
                this.value = v ? formatRaw(v) : '';
                line.credit = v;
                updateVoucherTotals();
            });
            var cC = document.createElement('button');
            cC.type = 'button'; cC.className = 'calc-btn'; cC.title = 'ماشین حساب'; cC.textContent = '🧮';
            cC.addEventListener('click', function() {
                calcOpen(function() { return line.credit || 0; }, function(v) {
                    line.credit = v;
                    if (v > 0 && line.debit !== 0) { line.debit = 0; }
                    renderVoucherLines(); updateVoucherTotals();
                }, 'ماشین حساب بستانکار');
            });
            wC.appendChild(iC); wC.appendChild(cC);
            r3.appendChild(wD); r3.appendChild(wC);

            var iT = document.createElement('input');
            iT.type = 'text'; iT.dir = 'ltr'; iT.placeholder = 'ش پیگیری';
            iT.value = line.trackingNumber || '';
            iT.addEventListener('input', function() { line.trackingNumber = this.value; });
            r3.appendChild(iT);

            var iTD = document.createElement('input');
            iTD.type = 'text'; iTD.dir = 'ltr'; iTD.placeholder = 'ت پیگیری';
            iTD.value = line.trackingDate || '';
            iTD.classList.add('date-picker');
            iTD.addEventListener('input', function() { line.trackingDate = this.value; });
            r3.appendChild(iTD);
            wrap.appendChild(r3);

            /* ردیف ۴: شرح */
            var r4 = document.createElement('div');
            r4.className = 'desc-row';
            r4.style.marginTop = '8px';
            var iDsc = document.createElement('input');
            iDsc.type = 'text'; iDsc.placeholder = 'شرح قلم *';
            iDsc.value = line.description || '';
            iDsc.setAttribute('list', 'std-desc-list');
            if (!line.description && (Number(line.debit) > 0 || Number(line.credit) > 0)) {
                iDsc.classList.add('desc-required');
            }
            iDsc.addEventListener('input', function() {
                line.description = this.value;
                this.classList.remove('desc-required');
            });
            var clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'desc-clear-btn';
            clearBtn.title = 'خالی کردن شرح';
            clearBtn.textContent = '🧹';
            clearBtn.style.cssText = 'background:#fee2e2;color:#dc2626;border:none;border-radius:10px;width:38px;height:38px;font-size:1.05rem;font-weight:800;cursor:pointer;flex-shrink:0';
            clearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                iDsc.value = '';
                line.description = '';
                iDsc.classList.remove('desc-required');
                iDsc.focus();
            });
            var btnAddDesc = document.createElement('button');
            btnAddDesc.type = 'button'; btnAddDesc.className = 'desc-add-btn'; btnAddDesc.textContent = '＋';
            btnAddDesc.addEventListener('click', function() { addDescriptionToStandard(iDsc.value); });
            r4.appendChild(iDsc);
            r4.appendChild(clearBtn);
            r4.appendChild(btnAddDesc);
            wrap.appendChild(r4);

            /* ردیف ۵: دکمه‌ها */
            var aW = document.createElement('div');
            aW.className = 'ln-actions';
            var bU = document.createElement('button');
            bU.className = 'ln-btn'; bU.textContent = '↑';
            if (idx === 0) bU.disabled = true;
            bU.addEventListener('click', function() { moveLine(idx, -1); });
            var bD = document.createElement('button');
            bD.className = 'ln-btn'; bD.textContent = '↓';
            if (idx === voucherLines.length - 1) bD.disabled = true;
            bD.addEventListener('click', function() { moveLine(idx, 1); });
            var bCp = document.createElement('button');
            bCp.className = 'ln-btn ln-copy'; bCp.textContent = '📋 کپی';
            bCp.addEventListener('click', function() { copyVoucherLine(idx); });
            var bSwap = document.createElement('button');
            bSwap.className = 'ln-btn ln-swap'; bSwap.textContent = '🔄 بدهکار/بستانکار';
            bSwap.addEventListener('click', function() {
                var tmpD = line.debit;
                line.debit = line.credit; line.credit = tmpD;
                renderVoucherLines();
                showToast('🔄 جابه‌جا شد.');
            });
            var bMoveTo = document.createElement('button');
            bMoveTo.className = 'ln-btn ln-moveto'; bMoveTo.textContent = '📍 انتقال';
            bMoveTo.addEventListener('click', function() {
                var total = voucherLines.length;
                if (total < 2) { showToast('فقط یک ردیف موجود است.'); return; }
                var ans = prompt('به کدام شماره ردیف منتقل شود؟ (۱ تا ' + toFa(total) + ')', String(idx + 1));
                if (!ans) return;
                var target = Number(normalizeDigits(ans)) - 1;
                if (isNaN(target) || target < 0 || target >= total || target === idx) return;
                var movedLine = voucherLines.splice(idx, 1)[0];
                voucherLines.splice(target, 0, movedLine);
                window._focusLineId = movedLine.id;
                renderVoucherLines();
            });
            var bX = document.createElement('button');
            bX.className = 'ln-btn ln-del'; bX.textContent = '× حذف';
            bX.addEventListener('click', function() {
                if (!confirm('این ردیف حذف شود؟')) return;
                voucherLines.splice(idx, 1);
                renderVoucherLines();
            });
            aW.appendChild(bU); aW.appendChild(bD); aW.appendChild(bCp);
            aW.appendChild(bSwap); aW.appendChild(bMoveTo); aW.appendChild(bX);
            wrap.appendChild(aW);

            box.appendChild(wrap);
            attachDatePickers();
        })(i);

        updateVoucherTotals();
        if (window._focusLineId) {
            var tid = window._focusLineId;
            window._focusLineId = null;
            setTimeout(function() {
                var t = box.querySelector('[data-line-id="' + tid + '"]');
                if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.add('focus-highlight'); setTimeout(function() { t.classList.remove('focus-highlight'); }, 1200); }
            }, 60);
        }
    };
})();

/* =====================================================================
   ۲) انتخابگر ساعت عقربه‌ای
   ===================================================================== */
function openTimePicker(callback, initialValue) {
    var old = document.getElementById('time-picker-modal'); if (old) old.remove();
    var oldO = document.getElementById('time-picker-overlay'); if (oldO) oldO.remove();
    var init = initialValue || '21:00';
    var initParts = init.split(':');
    var initH = Number(initParts[0]) || 21;
    var initM = Number(initParts[1]) || 0;

    var html = ''
        + '<div id="time-picker-overlay" class="overlay show" style="z-index:900"></div>'
        + '<div id="time-picker-modal" class="modal show" style="max-width:360px;z-index:910">'
        +   '<div class="modal-head"><h2>🕐 انتخاب ساعت</h2><button id="tp-close" class="close-btn">×</button></div>'
        +   '<div class="modal-body" style="text-align:center;padding:20px">'
        +     '<div id="tp-display" style="font-size:2.4rem;font-weight:900;color:var(--primary-dark);'
        +       'background:var(--primary-soft);padding:16px;border-radius:14px;margin-bottom:16px;'
        +       'font-family:monospace;direction:ltr;letter-spacing:3px">' + toFa(pad2(initH) + ':' + pad2(initM)) + '</div>'
        +     '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
        +       '<div><label style="font-size:0.82rem;color:var(--text-muted);font-weight:800">ساعت</label>'
        +         '<input type="number" id="tp-hour" min="0" max="23" value="' + initH + '" style="width:100%;padding:14px;font-size:1.3rem;text-align:center;border:1.5px solid var(--border);border-radius:10px;font-family:monospace;margin-top:6px"></div>'
        +       '<div><label style="font-size:0.82rem;color:var(--text-muted);font-weight:800">دقیقه</label>'
        +         '<input type="number" id="tp-min" min="0" max="59" step="5" value="' + initM + '" style="width:100%;padding:14px;font-size:1.3rem;text-align:center;border:1.5px solid var(--border);border-radius:10px;font-family:monospace;margin-top:6px"></div>'
        +     '</div>'
        +     '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:16px">'
        +       '<button class="tp-preset" data-h="8" data-m="0">۰۸:۰۰</button>'
        +       '<button class="tp-preset" data-h="12" data-m="0">۱۲:۰۰</button>'
        +       '<button class="tp-preset" data-h="14" data-m="0">۱۴:۰۰</button>'
        +       '<button class="tp-preset" data-h="18" data-m="0">۱۸:۰۰</button>'
        +       '<button class="tp-preset" data-h="21" data-m="0">۲۱:۰۰</button>'
        +       '<button class="tp-preset" data-h="23" data-m="59">۲۳:۵۹</button>'
        +     '</div>'
        +     '<div style="display:flex;gap:8px">'
        +       '<button id="tp-cancel" style="flex:1;padding:12px;background:var(--card-alt);color:var(--text);border:none;border-radius:11px;font-family:inherit;font-weight:800;cursor:pointer">انصراف</button>'
        +       '<button id="tp-ok" style="flex:2;padding:12px;background:var(--gradient-accent);color:#fff;border:none;border-radius:11px;font-family:inherit;font-weight:800;cursor:pointer">تأیید</button>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    var hEl = document.getElementById('tp-hour'), mEl = document.getElementById('tp-min'), dEl = document.getElementById('tp-display');
    function upd() {
        var h = Math.max(0, Math.min(23, Number(hEl.value) || 0));
        var mm = Math.max(0, Math.min(59, Number(mEl.value) || 0));
        dEl.textContent = toFa(pad2(h) + ':' + pad2(mm));
    }
    hEl.addEventListener('input', upd); mEl.addEventListener('input', upd);

    // استایل presets
    setTimeout(function() {
        document.querySelectorAll('.tp-preset').forEach(function(b) {
            b.style.cssText = 'padding:7px 13px;border-radius:9px;border:1px solid var(--border);background:var(--card-alt);font-family:inherit;font-size:0.8rem;font-weight:800;cursor:pointer';
            b.addEventListener('click', function() {
                hEl.value = this.getAttribute('data-h');
                mEl.value = this.getAttribute('data-m');
                upd();
            });
        });
    }, 20);

    function close() {
        var o = document.getElementById('time-picker-overlay'); if (o) o.remove();
        var m = document.getElementById('time-picker-modal'); if (m) m.remove();
    }
    document.getElementById('tp-close').onclick = close;
    document.getElementById('tp-cancel').onclick = close;
    document.getElementById('time-picker-overlay').onclick = close;
    document.getElementById('tp-ok').onclick = function() {
        var h = Math.max(0, Math.min(23, Number(hEl.value) || 0));
        var mm = Math.max(0, Math.min(59, Number(mEl.value) || 0));
        var s = pad2(h) + ':' + pad2(mm);
        if (callback) callback(s);
        close();
    };
}
window.openTimePicker = openTimePicker;

/* =====================================================================
   ۳) ساعت در اقساط — پیش‌فرض ۲۱:۰۰
   ===================================================================== */
(function patchInstallmentTime() {
    window.renderInstallments = function() {
        var box = document.getElementById('fac-installments');
        if (!box) return;
        box.innerHTML = '';
        for (var i = 0; i < currentInstallments.length; i++) {
            (function(idx) {
                var ins = currentInstallments[idx];
                if (!ins.time) ins.time = '21:00';
                var row = document.createElement('div');
                row.className = 'installment-row';
                row.style.cssText = 'grid-template-columns:38px 1fr 150px 1fr auto auto';

                var n = document.createElement('span');
                n.textContent = '#' + toFa(idx + 1);
                n.style.fontWeight = 'bold';

                var iD = document.createElement('input');
                iD.type = 'text'; iD.dir = 'ltr'; iD.className = 'date-picker'; iD.placeholder = 'تاریخ';
                iD.value = ins.date || '';
                iD.addEventListener('input', function() { ins.date = this.value; });

                var timeWrap = document.createElement('div');
                timeWrap.style.cssText = 'display:flex;gap:4px;align-items:center';
                var iT = document.createElement('input');
                iT.type = 'text'; iT.dir = 'ltr'; iT.placeholder = 'HH:MM';
                iT.value = ins.time || '21:00';
                iT.style.cssText = 'flex:1;padding:7px 8px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);font-family:monospace;text-align:center;direction:ltr;min-width:0';
                iT.addEventListener('input', function() { ins.time = this.value; });
                var clockBtn = document.createElement('button');
                clockBtn.type = 'button'; clockBtn.textContent = '🕐'; clockBtn.title = 'انتخاب ساعت';
                clockBtn.style.cssText = 'background:var(--primary-soft);color:var(--primary-dark);border:1.5px solid var(--border);width:32px;height:32px;border-radius:9px;cursor:pointer;font-size:1rem;padding:0;flex-shrink:0';
                clockBtn.addEventListener('click', function(e) {
                    e.preventDefault(); e.stopPropagation();
                    openTimePicker(function(hhmm) {
                        ins.time = hhmm;
                        iT.value = hhmm;
                    }, ins.time);
                });
                timeWrap.appendChild(iT);
                timeWrap.appendChild(clockBtn);

                var iA = document.createElement('input');
                iA.type = 'text'; iA.inputMode = 'numeric'; iA.dir = 'ltr'; iA.placeholder = 'مبلغ';
                iA.value = ins.amount ? formatRaw(ins.amount) : '';
                attachMoneyInput(iA, function(v) { ins.amount = v; renderInstallmentsTotals(); });

                var sS = document.createElement('select');
                sS.innerHTML = '<option value="registered">ثبت</option><option value="paid">پرداخت</option>';
                sS.value = ins.status || 'registered';
                sS.addEventListener('change', function() { ins.status = this.value; renderInstallmentsTotals(); });

                var a = document.createElement('div');
                var d = document.createElement('button');
                d.className = 'row-btn del'; d.textContent = '×';
                d.addEventListener('click', function() {
                    if (!confirm('حذف شود؟')) return;
                    currentInstallments.splice(idx, 1);
                    renderInstallments();
                });
                a.appendChild(d);

                if (ins.status === 'paid') {
                    var tag = document.createElement('div');
                    tag.style.cssText = 'font-size:0.72rem;color:#059669;font-weight:800;padding:4px 10px;background:#d1fae5;border-radius:9px;grid-column:1/-1;text-align:center';
                    tag.textContent = '✅ پرداخت‌شده' + (ins.systemPaid ? ' (سیستمی)' : '');
                    row.appendChild(n); row.appendChild(iD); row.appendChild(timeWrap);
                    row.appendChild(iA); row.appendChild(sS); row.appendChild(a);
                    row.appendChild(tag);
                } else {
                    var payBtn = document.createElement('button');
                    payBtn.type = 'button'; payBtn.className = 'inst-pay-btn'; payBtn.textContent = '💳';
                    payBtn.title = 'پرداخت قسط';
                    payBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;padding:7px 10px;font-size:0.9rem;font-weight:800;cursor:pointer';
                    payBtn.addEventListener('click', function() {
                        if (typeof payInstallment === 'function') payInstallment(currentFacilityId, idx);
                    });
                    row.appendChild(n); row.appendChild(iD); row.appendChild(timeWrap);
                    row.appendChild(iA); row.appendChild(sS); row.appendChild(a);
                    row.appendChild(payBtn);
                }

                box.appendChild(row);
                attachDatePickers();
            })(i);
        }
        renderInstallmentsTotals();
    };

    // autoGenerateInstallments با ساعت پیش‌فرض
    var _origGen = window.autoGenerateInstallments;
    if (typeof _origGen === 'function') {
        window.autoGenerateInstallments = function() {
            _origGen.apply(this, arguments);
            currentInstallments.forEach(function(ins) {
                if (!ins.time) ins.time = '21:00';
            });
            renderInstallments();
        };
    }
})();

/* =====================================================================
   ۴) تقویم حرفه‌ای — فقط اقساط و منابع دریافتنی
   ===================================================================== */
(function overrideCalendarEvents() {
    window.calBuildAllEvents = function() {
        var evs = [];
        // فقط اقساط
        DB.load('facilities', []).forEach(function(f) {
            (f.installments || []).forEach(function(ins, i) {
                if (!ins.date) return;
                evs.push({
                    id: 'i_' + f.id + '_' + i,
                    cat: 'installment',
                    date: ins.date,
                    time: ins.time || '21:00',
                    title: (ins.status === 'paid' ? '✅ ' : '⏰ ') + 'قسط ' + f.name,
                    sub: ins.status === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده',
                    amount: Number(ins.amount) || 0,
                    ref: f.id,
                    readonly: true
                });
            });
        });
        // فقط منابع دریافتنی
        DB.load('cashFlowSources', []).forEach(function(s) {
            if (!s.expectedDate) return;
            evs.push({
                id: 's_' + s.id,
                cat: 'source',
                date: s.expectedDate,
                time: s.time || '21:00',
                title: '📥 ' + getSourceLabel(s),
                sub: s.notes || '',
                amount: Number(s.amount) || 0,
                ref: s.id,
                readonly: true
            });
        });
        // رویدادهای شخصی کاربر
        calLoadUserEvents().forEach(function(u) {
            var ev = Object.assign({}, u, { readonly: false });
            if (!ev.time) ev.time = '21:00';
            evs.push(ev);
        });
        return evs;
    };

    // در تقویم فقط این دسته‌ها پیش‌فرض فعال
    window.CAL_CATS = {
        installment: { label: 'قسط',       color: '#dc2626', icon: '💳' },
        source:      { label: 'دریافتنی',   color: '#10b981', icon: '📥' },
        personal:    { label: 'شخصی',       color: '#8b5cf6', icon: '⭐' },
        work:        { label: 'کاری',       color: '#0ea5e9', icon: '💼' },
        birthday:    { label: 'تولد',       color: '#ec4899', icon: '🎂' }
    };
})();

/* تقویم: نمایش کامل نام روز شمسی + میلادی زیر آن */
(function enhanceCalendarDayCells() {
    if (document.getElementById('cal-v37-style')) return;
    var s = document.createElement('style');
    s.id = 'cal-v37-style';
    s.textContent = ''
    + '.calg-mcell .cd { display:flex;flex-direction:column;align-items:flex-start;gap:1px;margin-bottom:4px }'
    + '.calg-mcell .cd .cjd { font-weight:900;font-size:0.95rem;color:#1e40af;line-height:1.1 }'
    + '.calg-mcell.today .cd .cjd { color:#1e3a8a }'
    + '.calg-mcell .cd .cgd { font-size:0.62rem;color:#94a3b8;font-weight:700;direction:ltr;line-height:1.1 }'
    + '.calg-mcell .cd .cwday { font-size:0.6rem;color:#cbd5e1;font-weight:700;line-height:1 }'
    + '.calg-mcell .cev { display:flex;align-items:center;gap:5px;font-size:0.68rem;overflow:hidden;margin-bottom:2px;padding:2px 4px;border-radius:5px;background:rgba(99,102,241,0.06) }'
    + '.calg-mcell .cev .ctime { font-size:0.6rem;color:#6366f1;font-weight:800;direction:ltr;flex-shrink:0 }'
    + '.calg-mcell .cev .ctxt { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 }'
    + '@media (max-width:640px) { .calg-mcell { min-height:70px } .calg-mcell .cev { display:none } }';
    document.head.appendChild(s);
})();

/* Override renderMonth برای نمایش کامل تاریخ */
(function overrideRenderMonth() {
    window.calRenderMonth = function(events) {
        var y = _cal.cursor.y, m = _cal.cursor.m;
        var days = daysInJalaliMonth(y, m);
        var firstG = jalaliToGregorian(y, m, 1);
        var firstDow = (new Date(firstG[0], firstG[1] - 1, firstG[2]).getDay() + 1) % 7;
        var prevM = m - 1, prevY = y, nextM = m + 1, nextY = y;
        if (prevM < 1) { prevM = 12; prevY--; }
        if (nextM > 12) { nextM = 1; nextY++; }
        var prevDays = daysInJalaliMonth(prevY, prevM);
        var today = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

        var byDate = {};
        events.forEach(function(e) {
            if (!byDate[e.date]) byDate[e.date] = [];
            byDate[e.date].push(e);
        });
        // مرتب‌سازی بر اساس ساعت
        Object.keys(byDate).forEach(function(d) {
            byDate[d].sort(function(a, b) { return (a.time || '00:00').localeCompare(b.time || '00:00'); });
        });

        var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var FA_WEEKDAYS_SHORT = ['ش','ی','د','س','چ','پ','ج'];

        var html = '<div class="calg-mhead">';
        ['شنبه','یک','دو','سه','چهار','پنج','جمعه'].forEach(function(x) { html += '<div>' + x + '</div>'; });
        html += '</div><div class="calg-mgrid">';

        var total = 42, dc = 1, ndc = 1;
        for (var i = 0; i < total; i++) {
            var day, cy, cm, other = false;
            if (i < firstDow) { day = prevDays - (firstDow - 1 - i); cy = prevY; cm = prevM; other = true; }
            else if (dc <= days) { day = dc++; cy = y; cm = m; }
            else { day = ndc++; cy = nextY; cm = nextM; other = true; }
            var ds = cy + '/' + pad2(cm) + '/' + pad2(day);
            var isToday = (cy === today[0] && cm === today[1] && day === today[2]);
            var colIdx = i % 7;
            var isFri = (colIdx === 6);
            var gd = jalaliToGregorian(cy, cm, day);
            var dt = new Date(gd[0], gd[1] - 1, gd[2]);
            var enDay = dt.getDate();
            var enMon = EN_MONTHS[dt.getMonth()];
            var weekdayEN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dt.getDay()];

            var cls = 'calg-mcell';
            if (other) cls += ' other';
            if (isToday) cls += ' today';
            if (isFri) cls += ' fri';

            html += '<div class="' + cls + '" data-date="' + ds + '">';
            html += '<div class="cd">';
            html += '<div class="cjd">' + toFa(day) + ' ' + JALALI_MONTHS[cm - 1] + '</div>';
            html += '<div class="cgd">' + enDay + ' ' + enMon + '</div>';
            html += '<div class="cwday">' + weekdayEN + '</div>';
            html += '</div>';

            var evs = byDate[ds] || [];
            var shown = 0;
            evs.forEach(function(e) {
                if (shown >= 3) return;
                var cat = CAL_CATS[e.cat] || { color: '#999' };
                var timeStr = e.time ? toFa(e.time) : '';
                html += '<div class="cev"><span class="cdot" style="background:' + cat.color + '"></span>'
                     +  (timeStr ? '<span class="ctime">' + timeStr + '</span>' : '')
                     +  '<span class="ctxt">' + esc(e.title) + '</span></div>';
                shown++;
            });
            if (evs.length > 3) html += '<div class="cmore">+' + toFa(evs.length - 3) + ' مورد دیگر</div>';
            html += '</div>';
        }
        html += '</div>';
        return html;
    };

    // override calRenderDay برای نمایش ساعت
    window.calRenderDay = function(events) {
        var ds = c(_cal.cursor);
        var dayEvs = events.filter(function(e) { return e.date === ds; });
        dayEvs.sort(function(a, b) { return (a.time || '00:00').localeCompare(b.time || '00:00'); });
        var gDate = jalaliToGregorian(_cal.cursor.y, _cal.cursor.m, _cal.cursor.d);
        var dObj = new Date(gDate[0], gDate[1] - 1, gDate[2]);
        var enMon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dObj.getMonth()];
        var html = '<div style="text-align:center;margin-bottom:14px;padding:12px;background:var(--primary-soft);border-radius:12px">'
                 +   '<div style="font-size:1.05rem;font-weight:900;color:#1e40af">' + WEEKDAYS_FA[dObj.getDay()] + '، ' + toFa(_cal.cursor.d) + ' ' + JALALI_MONTHS[_cal.cursor.m - 1] + ' ' + toFa(_cal.cursor.y) + '</div>'
                 +   '<div style="font-size:0.78rem;color:#94a3b8;direction:ltr;margin-top:4px">' + dObj.getDate() + ' ' + enMon + ' ' + dObj.getFullYear() + '</div>'
                 + '</div>';
        if (dayEvs.length === 0) { html += '<div class="calg-empty">رویدادی برای این روز نیست.</div>'; return html; }
        html += '<div style="display:flex;flex-direction:column;gap:8px">';
        dayEvs.forEach(function(e) {
            var cat = CAL_CATS[e.cat] || { color: '#999', label: '' };
            html += '<div style="display:flex;gap:12px;align-items:center;padding:14px;background:#fff;border:1px solid var(--border);border-right:4px solid ' + cat.color + ';border-radius:12px;cursor:pointer" data-ev="' + e.id + '">'
                 +   '<div style="font-size:0.85rem;font-weight:900;color:' + cat.color + ';direction:ltr;min-width:60px">' + toFa(e.time || '21:00') + '</div>'
                 +   '<div style="flex:1">'
                 +     '<div style="font-weight:800;font-size:0.9rem">' + esc(e.title) + '</div>'
                 +     (e.sub ? '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">' + esc(e.sub) + '</div>' : '')
                 +   '</div>'
                 +   (e.amount ? '<div style="font-weight:800;color:var(--primary-dark);white-space:nowrap">' + formatMoney(e.amount) + '</div>' : '')
                 + '</div>';
        });
        html += '</div>';
        return html;
    };
})();

/* =====================================================================
   ۵) سیستم یادآور
   ===================================================================== */
(function reminderSystem() {
    var shownKeys = {};
    try {
        var saved = sessionStorage.getItem('parsis.shownReminders');
        if (saved) shownKeys = JSON.parse(saved);
    } catch(e) {}

    function saveShown() {
        try { sessionStorage.setItem('parsis.shownReminders', JSON.stringify(shownKeys)); } catch(e) {}
    }

    function checkReminders() {
        var now = new Date();
        var todayJ = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
        var todayStr = todayJ[0] + '/' + pad2(todayJ[1]) + '/' + pad2(todayJ[2]);
        var nowHHMM = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
        var nowTs = now.getTime();

        // اقساط
        DB.load('facilities', []).forEach(function(f) {
            (f.installments || []).forEach(function(ins, i) {
                if (!ins.date || ins.status === 'paid') return;
                if (ins.date !== todayStr) return;
                var t = ins.time || '21:00';
                var key = 'inst_' + f.id + '_' + i + '_' + ins.date + '_' + t;
                if (shownKeys[key]) return;
                if (nowHHMM >= t) {
                    shownKeys[key] = true;
                    saveShown();
                    showReminderModal('💳 یادآور قسط', 'قسط ' + f.name + ' در ساعت ' + toFa(t), (ins.amount ? formatMoney(ins.amount) + ' ' + currencyLabel() : ''), function() {
                        if (typeof goToPage === 'function') goToPage('facilities');
                    });
                }
            });
        });

        // منابع دریافتنی
        DB.load('cashFlowSources', []).forEach(function(s) {
            if (!s.expectedDate || s.expectedDate !== todayStr) return;
            var t = s.time || '21:00';
            var key = 'src_' + s.id + '_' + s.expectedDate + '_' + t;
            if (shownKeys[key]) return;
            if (nowHHMM >= t) {
                shownKeys[key] = true;
                saveShown();
                showReminderModal('📥 یادآور دریافتنی', getSourceLabel(s), (s.amount ? formatMoney(s.amount) + ' ' + currencyLabel() : ''), function() {
                    if (typeof goToPage === 'function') goToPage('cashflow-sources');
                });
            }
        });

        // رویدادهای شخصی کاربر
        calLoadUserEvents().forEach(function(u) {
            if (!u.date || !u.time) return;
            if (u.date !== todayStr) return;
            var reminderMin = Number(u.reminder) || 0;
            var key = 'usr_' + u.id + '_' + u.date + '_' + u.time;
            if (shownKeys[key]) return;
            // محاسبه زمان یادآوری
            var parts = u.time.split(':');
            var target = new Date(now);
            target.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
            var remindAt = target.getTime() - reminderMin * 60 * 1000;
            if (nowTs >= remindAt) {
                shownKeys[key] = true;
                saveShown();
                showReminderModal('🔔 یادآور', u.title || 'رویداد', u.time ? 'ساعت ' + toFa(u.time) : '', function() {
                    if (typeof calRender === 'function' && typeof goToPage === 'function') goToPage('jalali-calendar');
                });
            }
        });
    }

    window.showReminderModal = function(title, subtitle, amount, onClick) {
        var old = document.getElementById('reminder-modal'); if (old) old.remove();
        var oldO = document.getElementById('reminder-overlay'); if (oldO) oldO.remove();
        var html = ''
            + '<div id="reminder-overlay" class="overlay show" style="z-index:950"></div>'
            + '<div id="reminder-modal" class="modal show" style="max-width:420px;z-index:960">'
            +   '<div class="modal-head" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><h2>' + title + '</h2></div>'
            +   '<div class="modal-body" style="text-align:center;padding:24px">'
            +     '<div style="font-size:3.5rem;margin-bottom:12px">🔔</div>'
            +     '<div style="font-weight:900;font-size:1.1rem;color:var(--primary-dark);margin-bottom:8px">' + esc(subtitle) + '</div>'
            +     (amount ? '<div style="font-size:1.2rem;font-weight:800;color:var(--accent);margin-bottom:14px">' + amount + '</div>' : '')
            +     '<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:20px">' + toFa(todayJalaliStr()) + ' — ' + toFa(tsToJalaliTime(Date.now())) + '</div>'
            +     '<div style="display:flex;gap:8px">'
            +       '<button id="rem-dismiss" style="flex:1;padding:13px;background:var(--card-alt);color:var(--text);border:none;border-radius:12px;font-family:inherit;font-weight:800;cursor:pointer;font-size:0.88rem">بستن</button>'
            +       (onClick ? '<button id="rem-action" style="flex:2;padding:13px;background:var(--gradient-accent);color:#fff;border:none;border-radius:12px;font-family:inherit;font-weight:800;cursor:pointer;font-size:0.88rem">مشاهده</button>' : '')
            +     '</div>'
            +   '</div>'
            + '</div>';
        document.body.insertAdjacentHTML('beforeend', html);

        function close() {
            var o = document.getElementById('reminder-overlay'); if (o) o.remove();
            var m = document.getElementById('reminder-modal'); if (m) m.remove();
        }
        document.getElementById('rem-dismiss').onclick = close;
        if (onClick && document.getElementById('rem-action')) {
            document.getElementById('rem-action').onclick = function() { close(); onClick(); };
        }
        // صدای یادآور
        try {
            if (window.AudioContext || window.webkitAudioContext) {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
            }
        } catch(e) {}
    };

    // بررسی هر 30 ثانیه
    setInterval(checkReminders, 30000);
    setTimeout(checkReminders, 3000);
})();

/* =====================================================================
   ۶) رفع آیکن تقویم در ورودی‌های تاریخ
   ===================================================================== */
(function ensureDatePickers() {
    // بازنویسی attachDatePickers برای اطمینان از کارکرد
    window.attachDatePickers = function() {
        var els = document.querySelectorAll('.date-picker:not([data-picker="1"])');
        for (var i = 0; i < els.length; i++) {
            (function(el) {
                if (el.dataset.picker === '1') return;
                // اگر در date-wrap نیست، آن را بساز
                if (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('date-wrap')) {
                    el.dataset.picker = '1';
                    return;
                }
                el.dataset.picker = '1';
                try {
                    var wrap = document.createElement('div');
                    wrap.className = 'date-wrap';
                    wrap.style.cssText = 'position:relative;display:block';
                    el.parentNode.insertBefore(wrap, el);
                    wrap.appendChild(el);
                    el.style.paddingLeft = '42px';
                    el.style.paddingRight = '12px';

                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'cal-btn';
                    btn.innerHTML = '📅';
                    btn.title = 'باز کردن تقویم';
                    btn.style.cssText = 'position:absolute;top:50%;left:5px;transform:translateY(-50%);' +
                        'background:var(--primary-soft);color:var(--primary-dark);border:none;' +
                        'width:32px;height:32px;border-radius:9px;cursor:pointer;font-size:1rem;' +
                        'padding:0;display:flex;align-items:center;justify-content:center;z-index:5';

                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (typeof openCalendar === 'function') {
                            try { openCalendar(el); } catch(err) { console.error('openCalendar error:', err); }
                        }
                    });

                    btn.addEventListener('mousedown', function(e) { e.stopPropagation(); });
                    btn.addEventListener('touchstart', function(e) { e.stopPropagation(); });

                    wrap.appendChild(btn);
                } catch(err) { console.warn('attachDatePicker err:', err); }
            })(els[i]);
        }
    };

    // اجرای مجدد بعد از هر تغییر DOM
    setTimeout(function() {
        if (typeof window.attachDatePickers === 'function') window.attachDatePickers();
    }, 500);
    setInterval(function() {
        if (typeof window.attachDatePickers === 'function') window.attachDatePickers();
    }, 2000);
})();

/* =====================================================================
   ۷) بروزرسانی UI بعد از تغییرات
   ===================================================================== */
(function refreshAfterPatches() {
    function refresh() {
        try {
            if (typeof renderVoucherLines === 'function' && voucherLines && voucherLines.length > 0) {
                // چک کن آیا صفحه صدور سند فعال است
                var page = document.getElementById('page-voucher-new');
                if (page && page.classList.contains('active')) {
                    // اگر رندر قبلی مشکل داشت، دوباره رندر کن
                    var box = document.getElementById('voucher-lines');
                    if (box) {
                        var hasBroken = box.querySelector('select option[value*="::"]');
                        if (!hasBroken) renderVoucherLines();
                    }
                }
            }
            if (typeof attachDatePickers === 'function') attachDatePickers();
        } catch(e) { console.warn('refreshAfterPatches:', e); }
    }
    setTimeout(refresh, 2500);
    setTimeout(refresh, 5000);
})();

console.log('✅ پارسیس v37 — پچ نهایی اعمال شد (تقویم حرفه‌ای + ساعت اقساط + رفع تفصیلی ترکیبی + یادآور)');
