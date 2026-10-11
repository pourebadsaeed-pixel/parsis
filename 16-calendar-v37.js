/* =====================================================================
   پارسیس v39 — 16-calendar-v37.js (نسخه نهایی پایدار)
   رفع قطعی: 
     ۱) جابجایی ساعت/دقیقه در مودال ساعت (RTL issue)
     ۲) آیکن تقویم قفل و باز نمی‌شود
     ۳) انتخاب تاریخ ممکن نیست
     ۴) نمایش تفصیلی ترکیبی
     ۵) اقساط با ساعت پیش‌فرض ۲۱:۰۰
     ۶) تقویم حرفه‌ای + یادآور
   ===================================================================== */
'use strict';

/* =====================================================================
   ۱) نمایش تفصیلی معین چند-نوعی — یک سلول جستجو + یک سلول انتخاب
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
            sA.type = 'text'; sA.className = 'ln-search'; sA.placeholder = '🔍 جستجوی معین...';
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

            /* ردیف ۲: تفصیلی ترکیبی */
            var acc = accounts.find(function(a) { return a.id === line.account; });
            if (acc && acc.links && acc.links.length > 0) {
                var combined = [];
                acc.links.forEach(function(lt) {
                    var items = getLinkedItems(lt);
                    items.forEach(function(it) {
                        var lbl = getLinkedItemLabel(lt, it);
                        combined.push({
                            linkType: lt, id: it.id,
                            label: linkTypeName(lt) + ': ' + lbl,
                            searchText: (lbl + ' ' + linkTypeName(lt)).toLowerCase()
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
                sD.type = 'text'; sD.className = 'ln-search'; sD.placeholder = '🔍 جستجوی تفصیلی...';
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

            /* ردیف ۳: مبالغ */
            var r3 = document.createElement('div');
            r3.className = 'ln-row r4';
            r3.style.marginTop = '10px';

            var wD = document.createElement('div');
            wD.className = 'ln-amount-wrap';
            var iD = document.createElement('input');
            iD.type = 'text'; iD.inputMode = 'numeric'; iD.dir = 'ltr'; iD.placeholder = 'بدهکار';
            iD.value = line.debit ? formatRaw(line.debit) : '';
            iD.addEventListener('input', function() {
                var v = normalizeDigits(this.value).replace(/[^\d]/g, '');
                this.value = v;
                var x = Number(v) || 0;
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
            cD.type = 'button'; cD.className = 'calc-btn'; cD.textContent = '🧮';
            cD.addEventListener('click', function() {
                calcOpen(function() { return line.debit || 0; }, function(v) {
                    line.debit = v;
                    if (v > 0 && line.credit !== 0) line.credit = 0;
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
                var v = normalizeDigits(this.value).replace(/[^\d]/g, '');
                this.value = v;
                var x = Number(v) || 0;
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
            cC.type = 'button'; cC.className = 'calc-btn'; cC.textContent = '🧮';
            cC.addEventListener('click', function() {
                calcOpen(function() { return line.credit || 0; }, function(v) {
                    line.credit = v;
                    if (v > 0 && line.debit !== 0) line.debit = 0;
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
            clearBtn.type = 'button'; clearBtn.className = 'desc-clear-btn';
            clearBtn.textContent = '🧹';
            clearBtn.style.cssText = 'background:#fee2e2;color:#dc2626;border:none;border-radius:10px;width:38px;height:38px;font-size:1.05rem;font-weight:800;cursor:pointer;flex-shrink:0';
            clearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                iDsc.value = ''; line.description = '';
                iDsc.classList.remove('desc-required'); iDsc.focus();
            });
            var btnAddDesc = document.createElement('button');
            btnAddDesc.type = 'button'; btnAddDesc.className = 'desc-add-btn'; btnAddDesc.textContent = '＋';
            btnAddDesc.addEventListener('click', function() { addDescriptionToStandard(iDsc.value); });
            r4.appendChild(iDsc); r4.appendChild(clearBtn); r4.appendChild(btnAddDesc);
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
            bSwap.className = 'ln-btn ln-swap'; bSwap.textContent = '🔄 جابجایی';
            bSwap.addEventListener('click', function() {
                var tmp = line.debit; line.debit = line.credit; line.credit = tmp;
                renderVoucherLines();
                showToast('🔄 جابه‌جا شد.');
            });
            var bX = document.createElement('button');
            bX.className = 'ln-btn ln-del'; bX.textContent = '× حذف';
            bX.addEventListener('click', function() {
                if (!confirm('این ردیف حذف شود؟')) return;
                voucherLines.splice(idx, 1);
                renderVoucherLines();
            });
            aW.appendChild(bU); aW.appendChild(bD); aW.appendChild(bCp);
            aW.appendChild(bSwap); aW.appendChild(bX);
            wrap.appendChild(aW);

            box.appendChild(wrap);
        })(i);
        updateVoucherTotals();
        if (typeof attachDatePickers === 'function') attachDatePickers();
    };
})();

/* =====================================================================
   ۲) ساعت عقربه‌ای — با رفع جابجایی HH/MM
   ===================================================================== */
function openTimePicker(callback, initialValue) {
    var old = document.getElementById('time-picker-modal'); if (old) old.remove();
    var oldO = document.getElementById('time-picker-overlay'); if (oldO) oldO.remove();

    var init = initialValue || '21:00';
    var ip = String(init).split(':');
    var selH = Number(ip[0]); if (isNaN(selH)) selH = 21;
    var selM = Number(ip[1]); if (isNaN(selM)) selM = 0;
    selH = Math.max(0, Math.min(23, selH));
    selM = Math.max(0, Math.min(59, selM));
    var mode = 'hour';

    var html = ''
        + '<div id="time-picker-overlay" class="overlay show" style="z-index:900"></div>'
        + '<div id="time-picker-modal" class="modal show" style="max-width:400px;z-index:910">'
        +   '<div class="modal-head" style="background:linear-gradient(135deg,#6366f1,#4f46e5)">'
        +     '<h2>🕐 انتخاب ساعت</h2>'
        +     '<button id="tp-close" class="close-btn">×</button>'
        +   '</div>'
        +   '<div class="modal-body" style="text-align:center;padding:16px">'
        /* ★★★ اینجا direction:ltr اضافه شد تا HH:MM درست نمایش داده شود ★★★ */
        +     '<div style="direction:ltr;display:flex;justify-content:center;gap:14px;margin-bottom:14px">'
        +       '<div id="tp-hh-display" style="font-size:2.4rem;font-weight:900;font-family:monospace;direction:ltr;padding:8px 20px;background:#eef2ff;color:#4338ca;border-radius:12px;cursor:pointer;min-width:80px;text-align:center">' + pad2(selH) + '</div>'
        +       '<div style="font-size:2.4rem;font-weight:900;color:#4338ca">:</div>'
        +       '<div id="tp-mm-display" style="font-size:2.4rem;font-weight:900;font-family:monospace;direction:ltr;padding:8px 20px;background:#fef2f2;color:#dc2626;border-radius:12px;cursor:pointer;min-width:80px;text-align:center">' + pad2(selM) + '</div>'
        +     '</div>'
        +     '<div style="text-align:center;font-size:0.75rem;color:#64748b;margin-bottom:10px">'
        +       '👆 روی HH (آبی) کلیک کن = تنظیم ساعت | روی MM (قرمز) = تنظیم دقیقه'
        +     '</div>'
        +     '<div style="position:relative;width:280px;height:280px;margin:0 auto">'
        +       '<svg id="tp-svg" viewBox="0 0 280 280" style="width:100%;height:100%;cursor:pointer;user-select:none;touch-action:none">'
        +         '<circle cx="140" cy="140" r="130" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>'
        +         '<g id="tp-numbers"></g>'
        +         '<line id="tp-hour-hand" x1="140" y1="140" x2="140" y2="60" stroke="#4338ca" stroke-width="6" stroke-linecap="round"/>'
        +         '<line id="tp-min-hand" x1="140" y1="140" x2="140" y2="40" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>'
        +         '<circle cx="140" cy="140" r="6" fill="#1e293b"/>'
        +         '<circle id="tp-handle" cx="140" cy="60" r="14" fill="#4338ca" opacity="0.35"/>'
        +       '</svg>'
        +     '</div>'
        +     '<div style="display:flex;gap:8px;margin-top:16px">'
        +       '<button id="tp-cancel" style="flex:1;padding:12px;background:var(--card-alt);color:var(--text);border:none;border-radius:11px;font-family:inherit;font-weight:800;cursor:pointer">انصراف</button>'
        +       '<button id="tp-ok" style="flex:2;padding:12px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:11px;font-family:inherit;font-weight:800;cursor:pointer">تأیید</button>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    document.body.insertAdjacentHTML('beforeend', html);

    var svg = document.getElementById('tp-svg');
    var numbersG = document.getElementById('tp-numbers');
    var hourHand = document.getElementById('tp-hour-hand');
    var minHand = document.getElementById('tp-min-hand');
    var handle = document.getElementById('tp-handle');
    var hhDisp = document.getElementById('tp-hh-display');
    var mmDisp = document.getElementById('tp-mm-display');
    var CX = 140, CY = 140;

    function drawNumbers() {
        var nums = '';
        if (mode === 'hour') {
            // ۲۴ ساعت، دو رینگ
            for (var i = 0; i < 24; i++) {
                var isOuter = i < 12;
                var r = isOuter ? 110 : 78;
                var ang = (i % 12) * 30 - 90;
                var rad = ang * Math.PI / 180;
                var x = CX + r * Math.cos(rad);
                var y = CY + r * Math.sin(rad);
                var isSel = (i === selH);
                nums += '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" '
                     +  'font-size="' + (isOuter ? 16 : 13) + '" font-weight="800" '
                     +  'fill="' + (isSel ? '#4338ca' : (isOuter ? '#1e293b' : '#64748b')) + '" '
                     +  'style="pointer-events:none;font-family:monospace">' + pad2(i) + '</text>';
            }
        } else {
            for (var j = 0; j < 12; j++) {
                var ang2 = j * 30 - 90;
                var rad2 = ang2 * Math.PI / 180;
                var x2 = CX + 110 * Math.cos(rad2);
                var y2 = CY + 110 * Math.sin(rad2);
                var v = j * 5;
                var isSel2 = (v === selM);
                nums += '<text x="' + x2 + '" y="' + (y2 + 5) + '" text-anchor="middle" '
                     +  'font-size="16" font-weight="800" '
                     +  'fill="' + (isSel2 ? '#dc2626' : '#1e293b') + '" '
                     +  'style="pointer-events:none;font-family:monospace">' + pad2(v) + '</text>';
            }
        }
        numbersG.innerHTML = nums;
    }

    function drawHands() {
        var hAng = (selH % 12) * 30 + selM * 0.5 - 90;
        var hRad = hAng * Math.PI / 180;
        var hLen = (selH < 12 ? 75 : 55);
        var hx = CX + hLen * Math.cos(hRad);
        var hy = CY + hLen * Math.sin(hRad);
        hourHand.setAttribute('x2', hx);
        hourHand.setAttribute('y2', hy);

        var mAng = selM * 6 - 90;
        var mRad = mAng * Math.PI / 180;
        var mx = CX + 95 * Math.cos(mRad);
        var my = CY + 95 * Math.sin(mRad);
        minHand.setAttribute('x2', mx);
        minHand.setAttribute('y2', my);

        if (mode === 'hour') {
            handle.setAttribute('cx', hx);
            handle.setAttribute('cy', hy);
            handle.setAttribute('fill', '#4338ca');
        } else {
            handle.setAttribute('cx', mx);
            handle.setAttribute('cy', my);
            handle.setAttribute('fill', '#dc2626');
        }

        hhDisp.textContent = pad2(selH);
        mmDisp.textContent = pad2(selM);
        hhDisp.style.background = mode === 'hour' ? '#eef2ff' : '#f3f4f6';
        hhDisp.style.color = mode === 'hour' ? '#4338ca' : '#6b7280';
        hhDisp.style.boxShadow = mode === 'hour' ? '0 0 0 3px rgba(67,56,202,0.25)' : 'none';
        mmDisp.style.background = mode === 'minute' ? '#fef2f2' : '#f3f4f6';
        mmDisp.style.color = mode === 'minute' ? '#dc2626' : '#6b7280';
        mmDisp.style.boxShadow = mode === 'minute' ? '0 0 0 3px rgba(220,38,38,0.25)' : 'none';
    }

    function posToTime(px, py) {
        var dx = px - CX, dy = py - CY;
        var r = Math.sqrt(dx * dx + dy * dy);
        var ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        if (ang < 0) ang += 360;
        if (mode === 'hour') {
            var isInner = r < 95;
            var slot = Math.round(ang / 30) % 12;
            selH = isInner ? slot + 12 : slot;
            if (selH >= 24) selH -= 12;
        } else {
            selM = Math.round(ang / 6) % 60;
        }
        drawNumbers();
        drawHands();
    }

    function handlePointer(e) {
        var rect = svg.getBoundingClientRect();
        var cx = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        var cy = (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        var px = (cx - rect.left) / rect.width * 280;
        var py = (cy - rect.top) / rect.height * 280;
        posToTime(px, py);
    }

    hhDisp.addEventListener('click', function() { mode = 'hour'; drawNumbers(); drawHands(); });
    mmDisp.addEventListener('click', function() { mode = 'minute'; drawNumbers(); drawHands(); });

    var isDragging = false;
    svg.addEventListener('mousedown', function(e) { isDragging = true; handlePointer(e); });
    document.addEventListener('mousemove', function(e) { if (isDragging) handlePointer(e); });
    document.addEventListener('mouseup', function() { isDragging = false; });
    svg.addEventListener('touchstart', function(e) { isDragging = true; handlePointer(e); }, { passive: true });
    svg.addEventListener('touchmove', function(e) { if (isDragging) { e.preventDefault(); handlePointer(e); } }, { passive: false });
    svg.addEventListener('touchend', function() { isDragging = false; });

    drawNumbers();
    drawHands();

    function close() {
        var o = document.getElementById('time-picker-overlay'); if (o) o.remove();
        var m = document.getElementById('time-picker-modal'); if (m) m.remove();
    }
    document.getElementById('tp-close').onclick = close;
    document.getElementById('tp-cancel').onclick = close;
    document.getElementById('time-picker-overlay').onclick = close;
    document.getElementById('tp-ok').onclick = function() {
        var s = pad2(selH) + ':' + pad2(selM);
        if (callback) callback(s);
        close();
    };
}
window.openTimePicker = openTimePicker;

/* =====================================================================
   ۳) اقساط با ساعت پیش‌فرض ۲۱:۰۰
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
                row.style.cssText = 'display:grid;grid-template-columns:38px 1fr 130px 1fr auto auto auto;gap:8px;align-items:center;padding:10px;background:var(--card-alt);border-radius:12px;margin-bottom:6px;border:1px solid var(--border)';

                var n = document.createElement('span');
                n.textContent = '#' + toFa(idx + 1);
                n.style.fontWeight = 'bold';

                var iD = document.createElement('input');
                iD.type = 'text'; iD.dir = 'ltr'; iD.className = 'date-picker'; iD.placeholder = 'تاریخ';
                iD.value = ins.date || '';
                iD.style.cssText = 'padding:7px 10px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);width:100%';
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
                    openTimePicker(function(hhmm) { ins.time = hhmm; iT.value = hhmm; }, ins.time);
                });
                timeWrap.appendChild(iT); timeWrap.appendChild(clockBtn);

                var iA = document.createElement('input');
                iA.type = 'text'; iA.inputMode = 'numeric'; iA.dir = 'ltr'; iA.placeholder = 'مبلغ';
                iA.value = ins.amount ? formatRaw(ins.amount) : '';
                iA.style.cssText = 'padding:7px 10px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);width:100%';
                attachMoneyInput(iA, function(v) { ins.amount = v; renderInstallmentsTotals(); });

                var sS = document.createElement('select');
                sS.innerHTML = '<option value="registered">ثبت</option><option value="paid">پرداخت</option>';
                sS.value = ins.status || 'registered';
                sS.style.cssText = 'padding:7px 10px;font-size:0.8rem;border:1.5px solid var(--border);border-radius:9px;background:var(--card-solid);width:100%';
                sS.addEventListener('change', function() { ins.status = this.value; renderInstallmentsTotals(); });

                var d = document.createElement('button');
                d.className = 'row-btn del'; d.textContent = '×';
                d.style.cssText = 'background:#fee2e2;color:#dc2626;border:none;border-radius:9px;padding:7px 10px;font-size:0.95rem;font-weight:800;cursor:pointer';
                d.addEventListener('click', function() {
                    if (!confirm('حذف شود؟')) return;
                    currentInstallments.splice(idx, 1);
                    renderInstallments();
                });

                var lastCell = document.createElement('div');
                if (ins.status === 'paid') {
                    var tag = document.createElement('div');
                    tag.style.cssText = 'font-size:0.72rem;color:#059669;font-weight:800;padding:4px 8px;background:#d1fae5;border-radius:9px;white-space:nowrap';
                    tag.textContent = '✅ پرداخت' + (ins.systemPaid ? ' (سیستمی)' : '');
                    lastCell.appendChild(tag);
                } else {
                    var payBtn = document.createElement('button');
                    payBtn.type = 'button'; payBtn.className = 'inst-pay-btn'; payBtn.textContent = '💳';
                    payBtn.title = 'پرداخت قسط';
                    payBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;padding:7px 10px;font-size:0.9rem;font-weight:800;cursor:pointer';
                    payBtn.addEventListener('click', function() {
                        if (typeof payInstallment === 'function') payInstallment(currentFacilityId, idx);
                    });
                    lastCell.appendChild(payBtn);
                }

                row.appendChild(n); row.appendChild(iD); row.appendChild(timeWrap);
                row.appendChild(iA); row.appendChild(sS); row.appendChild(d); row.appendChild(lastCell);

                box.appendChild(row);
                if (typeof attachDatePickers === 'function') attachDatePickers();
            })(i);
        }
        renderInstallmentsTotals();
    };
})();

/* =====================================================================
   ۴) تقویم حرفه‌ای — فقط اقساط + منابع + رویدادهای شخصی
   ===================================================================== */
(function overrideCalendarEvents() {
    window.calBuildAllEvents = function() {
        var evs = [];
        DB.load('facilities', []).forEach(function(f) {
            (f.installments || []).forEach(function(ins, i) {
                if (!ins.date) return;
                evs.push({
                    id: 'i_' + f.id + '_' + i, cat: 'installment', date: ins.date,
                    time: ins.time || '21:00',
                    title: (ins.status === 'paid' ? '✅ ' : '⏰ ') + 'قسط ' + f.name,
                    sub: ins.status === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده',
                    amount: Number(ins.amount) || 0, ref: f.id, readonly: true
                });
            });
        });
        DB.load('cashFlowSources', []).forEach(function(s) {
            if (!s.expectedDate) return;
            evs.push({
                id: 's_' + s.id, cat: 'source', date: s.expectedDate,
                time: s.time || '21:00',
                title: '📥 ' + getSourceLabel(s),
                sub: s.notes || '', amount: Number(s.amount) || 0, ref: s.id, readonly: true
            });
        });
        calLoadUserEvents().forEach(function(u) {
            var ev = Object.assign({}, u, { readonly: false });
            if (!ev.time) ev.time = '21:00';
            evs.push(ev);
        });
        return evs;
    };

    window.CAL_CATS = {
        installment: { label: 'قسط',       color: '#dc2626', icon: '💳' },
        source:      { label: 'دریافتنی',   color: '#10b981', icon: '📥' },
        personal:    { label: 'شخصی',       color: '#8b5cf6', icon: '⭐' },
        work:        { label: 'کاری',       color: '#0ea5e9', icon: '💼' },
        birthday:    { label: 'تولد',       color: '#ec4899', icon: '🎂' },
        note:        { label: 'یادداشت',     color: '#f59e0b', icon: '📔' }
    };
})();

/* استایل تقویم */
(function injectCalendarStyle() {
    if (document.getElementById('cal-v39-style')) return;
    var s = document.createElement('style');
    s.id = 'cal-v39-style';
    s.textContent = ''
    + '.calg-mcell { display:flex;flex-direction:column;gap:3px }'
    + '.calg-mcell .cd { display:flex;flex-direction:column;align-items:flex-start;gap:1px;margin-bottom:4px;padding-bottom:3px;border-bottom:1px dashed var(--border) }'
    + '.calg-mcell .cd .cjd { font-weight:900;font-size:0.82rem;color:#1e40af;line-height:1.15 }'
    + '.calg-mcell.today .cd .cjd { color:#1e3a8a }'
    + '.calg-mcell .cd .cwday { font-size:0.62rem;color:#64748b;font-weight:700;line-height:1 }'
    + '.calg-mcell .cd .cgd { font-size:0.6rem;color:#94a3b8;font-weight:700;direction:ltr;line-height:1 }'
    + '.calg-mcell .cev { display:flex;align-items:center;gap:4px;font-size:0.68rem;overflow:hidden;margin-bottom:2px;padding:2px 4px;border-radius:5px;background:rgba(99,102,241,0.06) }'
    + '.calg-mcell .cev .ctime { font-size:0.6rem;color:#6366f1;font-weight:800;direction:ltr;flex-shrink:0;font-family:monospace }'
    + '.calg-mcell .cev .ctxt { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 }'
    + '.calg-mcell .cdot { width:7px;height:7px;border-radius:2px;flex-shrink:0 }'
    + '@media (max-width:640px) { .calg-mcell { min-height:80px } .calg-mcell .cev { display:none } }'
    /* ★ استایل قوی برای دکمه تقویم */
    + '.date-wrap { position:relative !important; display:block !important }'
    + '.date-wrap .date-picker { padding-left:42px !important; padding-right:12px !important }'
    + '.date-wrap .cal-btn {'
    +   'position:absolute !important; top:50% !important; left:5px !important;'
    +   'transform:translateY(-50%) !important;'
    +   'z-index:99999 !important;'
    +   'pointer-events:auto !important;'
    +   'cursor:pointer !important;'
    +   'width:34px !important; height:34px !important;'
    +   'border-radius:9px !important;'
    +   'border:1.5px solid var(--border) !important;'
    +   'background:var(--primary-soft) !important;'
    +   'color:var(--primary-dark) !important;'
    +   'display:flex !important; align-items:center !important; justify-content:center !important;'
    +   'padding:0 !important; font-size:1.05rem !important;'
    +   'touch-action:manipulation !important;'
    +   'box-shadow:0 1px 3px rgba(15,23,42,0.08) !important;'
    + '}'
    + '.date-wrap .cal-btn:hover { background:var(--primary) !important; color:#fff !important }'
    + '.date-wrap .cal-btn:active { transform:translateY(-50%) scale(0.92) !important }';
    document.head.appendChild(s);
})();

/* Override renderMonth */
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
        Object.keys(byDate).forEach(function(d) {
            byDate[d].sort(function(a, b) { return (a.time || '00:00').localeCompare(b.time || '00:00'); });
        });

        var EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var FA_WD = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];

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
            var wd = FA_WD[dt.getDay()];

            var cls = 'calg-mcell';
            if (other) cls += ' other';
            if (isToday) cls += ' today';
            if (isFri) cls += ' fri';

            html += '<div class="' + cls + '" data-date="' + ds + '">';
            html += '<div class="cd">';
            html += '<div class="cjd">' + toFa(day) + ' ' + JALALI_MONTHS[cm - 1] + '</div>';
            html += '<div class="cwday">' + wd + '</div>';
            html += '<div class="cgd">' + enDay + ' ' + enMon + '</div>';
            html += '</div>';

            var evs = byDate[ds] || [];
            var shown = 0;
            evs.forEach(function(e) {
                if (shown >= 3) return;
                var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#999' };
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
            var cat = (window.CAL_CATS && window.CAL_CATS[e.cat]) || { color: '#999' };
            html += '<div style="display:flex;gap:12px;align-items:center;padding:14px;background:#fff;border:1px solid var(--border);border-right:4px solid ' + cat.color + ';border-radius:12px;cursor:pointer" data-ev="' + e.id + '">'
                 +   '<div style="font-size:0.85rem;font-weight:900;color:' + cat.color + ';direction:ltr;min-width:60px;font-family:monospace">' + toFa(e.time || '21:00') + '</div>'
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
   ۵) رفع باگ دکمه افزودن رویداد
   ===================================================================== */
(function patchEventModal() {
    window.calOpenEventModal = function(ev, defaultDate) {
        var old = document.getElementById('calg-modal'); if (old) old.remove();
        var oldO = document.getElementById('calg-modal-overlay'); if (oldO) oldO.remove();

        var isNew = !ev;
        var title = isNew ? '＋ رویداد جدید' : '✎ ویرایش رویداد';

        var USER_CATS = ['personal','work','birthday'];
        var catPicker = USER_CATS.map(function(k) {
            var c = window.CAL_CATS[k] || { color: '#999', icon: '📌', label: k };
            var active = (ev && ev.cat === k) || (!ev && k === 'personal') ? ' active' : '';
            return '<button type="button" class="' + active + '" data-cat="' + k + '" '
                 + 'style="color:' + c.color + ';padding:8px 12px;border-radius:10px;border:2px solid transparent;'
                 + 'font-family:inherit;font-size:0.78rem;font-weight:800;cursor:pointer;'
                 + 'background:#f0f6ff;display:inline-flex;align-items:center;gap:5px">'
                 + c.icon + ' ' + c.label + '</button>';
        }).join('');

        var html = ''
            + '<div id="calg-modal-overlay" class="calg-mo"></div>'
            + '<div id="calg-modal" class="calg-mp">'
            +   '<div class="calg-mph"><h3>' + title + '</h3><button id="calg-mclose">×</button></div>'
            +   '<div class="calg-mpb">'
            +     '<div class="calg-fld"><label>عنوان</label><input id="calg-ttl" value="' + (ev ? esc(ev.title) : '') + '"></div>'
            +     '<div class="calg-fld"><label>دسته‌بندی</label><div class="calg-cat-picker" id="calg-cats">' + catPicker + '</div></div>'
            +     '<div class="calg-2col">'
            +       '<div class="calg-fld"><label>تاریخ (شمسی)</label><input id="calg-date" class="date-picker" dir="ltr" value="' + (ev ? ev.date : (defaultDate || '')) + '"></div>'
            +       '<div class="calg-fld"><label>ساعت</label>'
            +         '<div style="display:flex;gap:6px">'
            +           '<input id="calg-time" dir="ltr" placeholder="HH:MM" value="' + (ev && ev.time ? ev.time : '21:00') + '" style="flex:1;font-family:monospace;text-align:center;direction:ltr">'
            +           '<button type="button" id="calg-clock-btn" style="background:var(--primary-soft);color:var(--primary-dark);border:1.5px solid var(--border);width:44px;border-radius:10px;cursor:pointer;font-size:1.1rem">🕐</button>'
            +         '</div>'
            +       '</div>'
            +     '</div>'
            +     '<div class="calg-fld"><label>توضیحات</label><textarea id="calg-desc" rows="3">' + (ev && ev.desc ? esc(ev.desc) : '') + '</textarea></div>'
            +     '<div class="calg-fld"><label>یادآور (دقیقه قبل)</label><input id="calg-rem" type="number" placeholder="مثلاً 30" value="' + (ev && ev.reminder ? ev.reminder : '') + '"></div>'
            +   '</div>'
            +   '<div class="calg-mpf">'
            +     (ev ? '<button class="del" id="calg-del">حذف</button>' : '')
            +     '<button class="cancel" id="calg-cancel">انصراف</button>'
            +     '<button class="save" id="calg-save">💾 ذخیره</button>'
            +   '</div>'
            + '</div>';
        document.body.insertAdjacentHTML('beforeend', html);

        setTimeout(function() {
            if (typeof attachDatePickers === 'function') attachDatePickers();
        }, 50);

        var selectedCat = (ev && ev.cat) || 'personal';
        document.querySelectorAll('#calg-cats button').forEach(function(b) {
            b.onclick = function() {
                document.querySelectorAll('#calg-cats button').forEach(function(x) { x.classList.remove('active'); });
                this.classList.add('active');
                selectedCat = this.getAttribute('data-cat');
            };
        });

        function close() {
            var o = document.getElementById('calg-modal-overlay'); if (o) o.remove();
            var m = document.getElementById('calg-modal'); if (m) m.remove();
        }
        document.getElementById('calg-mclose').onclick = close;
        document.getElementById('calg-cancel').onclick = close;
        document.getElementById('calg-modal-overlay').onclick = close;

        document.getElementById('calg-clock-btn').onclick = function() {
            var cur = document.getElementById('calg-time').value || '21:00';
            openTimePicker(function(hhmm) {
                document.getElementById('calg-time').value = hhmm;
            }, cur);
        };

        document.getElementById('calg-save').onclick = function() {
            var t = document.getElementById('calg-ttl').value.trim();
            var d = normalizeDigits(document.getElementById('calg-date').value.trim());
            var tm = document.getElementById('calg-time').value.trim() || '21:00';
            var desc = document.getElementById('calg-desc').value.trim();
            var rem = Number(document.getElementById('calg-rem').value) || 0;
            if (!t) { alert('عنوان اجباری'); return; }
            if (!d) { alert('تاریخ اجباری'); return; }
            var list = calLoadUserEvents();
            var obj;
            if (ev && ev.id) {
                obj = { id: ev.id, cat: selectedCat, date: d, time: tm, title: t, desc: desc, reminder: rem };
                for (var i = 0; i < list.length; i++) if (list[i].id === ev.id) { list[i] = obj; break; }
            } else {
                obj = { id: 'u_' + uid(), cat: selectedCat, date: d, time: tm, title: t, desc: desc, reminder: rem, createdAt: Date.now() };
                list.push(obj);
            }
            calSaveUserEvents(list);
            close();
            calRender();
            showToast('✅ رویداد ذخیره شد');
        };

        if (ev) {
            document.getElementById('calg-del').onclick = function() {
                if (!confirm('رویداد حذف شود؟')) return;
                var list = calLoadUserEvents().filter(function(x) { return x.id !== ev.id; });
                calSaveUserEvents(list);
                close();
                calRender();
                showToast('🗑 حذف شد');
            };
        }

        setTimeout(function() {
            document.getElementById('calg-modal-overlay').classList.add('show');
            document.getElementById('calg-modal').classList.add('show');
        }, 10);
    };
})();

/* =====================================================================
   ۶) سیستم یادآور
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

        DB.load('facilities', []).forEach(function(f) {
            (f.installments || []).forEach(function(ins, i) {
                if (!ins.date || ins.status === 'paid') return;
                if (ins.date !== todayStr) return;
                var t = ins.time || '21:00';
                var key = 'inst_' + f.id + '_' + i + '_' + ins.date + '_' + t;
                if (shownKeys[key]) return;
                if (nowHHMM >= t) {
                    shownKeys[key] = true; saveShown();
                    showReminderModal('💳 یادآور قسط', 'قسط ' + f.name + ' در ساعت ' + toFa(t),
                        (ins.amount ? formatMoney(ins.amount) + ' ' + currencyLabel() : ''),
                        function() { if (typeof goToPage === 'function') goToPage('facilities'); });
                }
            });
        });

        DB.load('cashFlowSources', []).forEach(function(s) {
            if (!s.expectedDate || s.expectedDate !== todayStr) return;
            var t = s.time || '21:00';
            var key = 'src_' + s.id + '_' + s.expectedDate + '_' + t;
            if (shownKeys[key]) return;
            if (nowHHMM >= t) {
                shownKeys[key] = true; saveShown();
                showReminderModal('📥 یادآور دریافتنی', getSourceLabel(s),
                    (s.amount ? formatMoney(s.amount) + ' ' + currencyLabel() : ''),
                    function() { if (typeof goToPage === 'function') goToPage('cashflow-sources'); });
            }
        });

        calLoadUserEvents().forEach(function(u) {
            if (!u.date || !u.time || u.date !== todayStr) return;
            var reminderMin = Number(u.reminder) || 0;
            var key = 'usr_' + u.id + '_' + u.date + '_' + u.time;
            if (shownKeys[key]) return;
            var parts = u.time.split(':');
            var target = new Date(now);
            target.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
            var remindAt = target.getTime() - reminderMin * 60 * 1000;
            if (nowTs >= remindAt) {
                shownKeys[key] = true; saveShown();
                showReminderModal('🔔 یادآور', u.title || 'رویداد', u.time ? 'ساعت ' + toFa(u.time) : '',
                    function() { if (typeof goToPage === 'function') goToPage('jalali-calendar'); });
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
        try {
            if (window.AudioContext || window.webkitAudioContext) {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                [880, 1100, 1320].forEach(function(freq, idx) {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    var t0 = ctx.currentTime + idx * 0.15;
                    gain.gain.setValueAtTime(0.001, t0);
                    gain.gain.linearRampToValueAtTime(0.15, t0 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
                    osc.start(t0); osc.stop(t0 + 0.15);
                });
            }
        } catch(e) {}
    };

    setInterval(checkReminders, 30000);
    setTimeout(checkReminders, 3000);
})();

/* =====================================================================
   ۷) ★★★ رفع قطعی آیکن تقویم — با Event Delegation + Force Click
   ===================================================================== */
(function bulletproofDatePicker() {
    function log() { /* console.log.apply(console, arguments); */ }

    function attachOne(el) {
        if (!el || el.nodeType !== 1) return;
        // اگر قبلاً داخل date-wrap با دکمه هست، رد شو
        var parent = el.parentNode;
        if (!parent) return;
        var wrap;
        if (parent.classList && parent.classList.contains('date-wrap')) {
            wrap = parent;
        } else {
            try {
                wrap = document.createElement('div');
                wrap.className = 'date-wrap';
                parent.insertBefore(wrap, el);
                wrap.appendChild(el);
            } catch(err) { return; }
        }
        wrap.style.position = 'relative';
        wrap.style.display = 'block';

        // استایل‌های input
        el.style.paddingLeft = '42px';
        el.style.paddingRight = '12px';

        if (wrap.querySelector('.cal-btn')) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cal-btn';
        btn.innerHTML = '📅';
        btn.title = 'باز کردن تقویم';
        btn.setAttribute('data-picker-btn', '1');
        btn.style.cssText = [
            'position:absolute',
            'top:50%',
            'left:5px',
            'transform:translateY(-50%)',
            'z-index:9999',
            'pointer-events:auto',
            'cursor:pointer',
            'width:34px',
            'height:34px',
            'border-radius:9px',
            'border:1.5px solid var(--border)',
            'background:var(--primary-soft)',
            'color:var(--primary-dark)',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:0',
            'font-size:1.05rem',
            'touch-action:manipulation',
            'box-shadow:0 1px 3px rgba(15,23,42,0.08)'
        ].join(';');

        // ★ اتصال مستقیم برای اطمینان
        (function(inputEl) {
            var fire = function(ev) {
                if (ev) { ev.preventDefault(); ev.stopPropagation(); }
                log('📅 button clicked');
                if (typeof window.openCalendar === 'function') {
                    try {
                        window.openCalendar(inputEl);
                    } catch(err) {
                        console.error('📅 openCalendar failed:', err);
                        alert('خطا در باز کردن تقویم: ' + (err.message || err));
                    }
                } else {
                    console.error('📅 window.openCalendar not defined!');
                    alert('تابع تقویم یافت نشد. صفحه را رفرش کنید.');
                }
            };
            btn.addEventListener('click', fire, false);
            btn.addEventListener('mousedown', function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
            }, true);
            btn.addEventListener('touchstart', function(ev) {
                ev.stopPropagation();
            }, { passive: true });
        })(el);

        wrap.appendChild(btn);
        log('📅 attached to', el.id || el.className);
    }

    window.attachDatePickers = function() {
        var els = document.querySelectorAll('.date-picker');
        for (var i = 0; i < els.length; i++) {
            try { attachOne(els[i]); } catch(e) { console.warn('attachOne err:', e); }
        }
    };

    // ★★★ Event Delegation (Capture Phase) به‌عنوان لایه‌ی پشتیبان
    document.addEventListener('click', function(e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var btn = t.closest('.cal-btn');
        if (!btn) return;
        // اگر قبلاً handler اصلی اجرا شده، دیگر اجرا نکن
        if (btn.dataset.handled === '1') {
            delete btn.dataset.handled;
            return;
        }
        var wrap = btn.closest('.date-wrap');
        if (!wrap) return;
        var inp = wrap.querySelector('.date-picker');
        if (!inp) return;
        e.preventDefault();
        e.stopPropagation();
        btn.dataset.handled = '1';
        log('📅 delegation fired for', inp.id || inp.className);
        if (typeof window.openCalendar === 'function') {
            try {
                window.openCalendar(inp);
            } catch(err) {
                console.error('📅 openCalendar (delegation) failed:', err);
            }
        }
    }, true);

    // اجرای دوره‌ای
    setTimeout(window.attachDatePickers, 300);
    setTimeout(window.attachDatePickers, 1000);
    setTimeout(window.attachDatePickers, 2500);
    setInterval(window.attachDatePickers, 2000);
})();

/* =====================================================================
   ۸) تست صحت در Console
   ===================================================================== */
setTimeout(function() {
    console.log('════════ پارسیس v39 — بررسی ════════');
    console.log('openCalendar:', typeof window.openCalendar);
    console.log('cal-popup:', !!document.getElementById('cal-popup'));
    console.log('cal-overlay:', !!document.getElementById('cal-overlay'));
    console.log('.date-picker count:', document.querySelectorAll('.date-picker').length);
    console.log('.date-wrap count:', document.querySelectorAll('.date-wrap').length);
    console.log('.cal-btn count:', document.querySelectorAll('.cal-btn').length);
    console.log('═════════════════════════════════════');
}, 3500);

console.log('✅ پارسیس v39 — رفع جابجایی ساعت + آیکن تقویم + انتخاب تاریخ');
