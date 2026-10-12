/* =====================================================================
   پارسیس v39 — 17-scan-improved.js
   بازنویسی کامل قابلیت اسکن سند (بدون وابستگی به پچ‌های قبلی)
   ===================================================================== */
'use strict';

(function ScanModule() {
    if (window._scanV39Loaded) return;
    window._scanV39Loaded = true;

    /* ─────────────── 1) حذف دکمه قدیمی و پچ قبلی ─────────────── */
    function removeOldScanBtn() {
        var old = document.getElementById('voucher-scan-btn');
        if (old) old.remove();
    }
    removeOldScanBtn();
    var cleanupTimer = setInterval(removeOldScanBtn, 500);
    setTimeout(function() { clearInterval(cleanupTimer); }, 5000);

    /* ─────────────── 2) توابع کمکی ─────────────── */
    function normalizeFa(s) {
        return normalizeDigits(String(s || ''))
            .replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک')
            .replace(/[\u200c\u200e\u200f]/g, ' ')
            .replace(/\s+/g, ' ').trim();
    }
    function normLower(s) { return normalizeFa(s).toLowerCase(); }

    function findMoeinByCodeOrName(codeOrName) {
        if (!codeOrName) return null;
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) {
            return !accounts.some(function(x) { return x.parent === a.id; });
        });
        var targetCode = normalizeDigits(String(codeOrName)).replace(/[^\d\-]/g, '');
        var targetName = normLower(codeOrName);
        // ۱) تطابق دقیق کد
        var hit = leaves.find(function(a) { return normalizeDigits(String(a.code)) === targetCode; });
        if (hit) return hit;
        // ۲) تطابق دقیق نام
        hit = leaves.find(function(a) { return normLower(a.name) === targetName; });
        if (hit) return hit;
        // ۳) نام شامل
        hit = leaves.find(function(a) { return normLower(a.name).indexOf(targetName) !== -1; });
        if (hit) return hit;
        // ۴) کلمه‌ای
        var words = targetName.split(' ').filter(function(w) { return w.length > 2; });
        if (words.length) {
            var best = null, bestScore = 0;
            leaves.forEach(function(a) {
                var n = normLower(a.name);
                var s = words.filter(function(w) { return n.indexOf(w) !== -1; }).length;
                if (s > bestScore) { bestScore = s; best = a; }
            });
            if (best) return best;
        }
        return null;
    }

    function fuzzyFindDetail(linkType, hint) {
        if (!hint) return '';
        var items = getLinkedItems(linkType);
        if (!items.length) return '';
        var h = normLower(hint);
        var exact = items.find(function(it) { return normLower(getLinkedItemLabel(linkType, it)) === h; });
        if (exact) return exact.id;
        var partial = items.find(function(it) { return normLower(getLinkedItemLabel(linkType, it)).indexOf(h) !== -1; });
        if (partial) return partial.id;
        var partial2 = items.find(function(it) { return h.indexOf(normLower(getLinkedItemLabel(linkType, it))) !== -1; });
        if (partial2) return partial2.id;
        var words = h.split(' ').filter(function(w) { return w.length > 2; });
        if (!words.length) return '';
        var best = null, bestScore = 0;
        items.forEach(function(it) {
            var lbl = normLower(getLinkedItemLabel(linkType, it));
            var s = words.filter(function(w) { return lbl.indexOf(w) !== -1; }).length;
            if (s > bestScore) { bestScore = s; best = it; }
        });
        return best ? best.id : '';
    }

    /* ─────────────── 3) یافتن حساب بستانکار پیش‌فرض ─────────────── */
    function findDefaultCreditAccount() {
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) {
            return !accounts.some(function(x) { return x.parent === a.id; });
        });
        var cashboxes = DB.load('cashBoxes', []);
        var banks = DB.load('bankAccounts', []);

        // ۱) معین با لینک cashbox و صندوق "کیف پول"
        var walletCb = cashboxes.find(function(c) { return /کیف\s*پول|wallet/i.test(c.title || ''); });
        if (walletCb) {
            var cbAcc = leaves.find(function(a) { return a.links && a.links.indexOf('cashbox') !== -1; });
            if (cbAcc) return { acc: cbAcc, details: { cashbox: walletCb.id }, label: cbAcc.name + ' — ' + walletCb.title };
        }
        // ۲) اولین صندوق + معین cashbox
        if (cashboxes.length) {
            var cbAcc2 = leaves.find(function(a) { return a.links && a.links.indexOf('cashbox') !== -1; });
            if (cbAcc2) return { acc: cbAcc2, details: { cashbox: cashboxes[0].id }, label: cbAcc2.name + ' — ' + cashboxes[0].title };
        }
        // ۳) بانک
        var bankMoeinId = (typeof getBankMoeinId === 'function') ? getBankMoeinId() : '';
        if (bankMoeinId && banks.length) {
            var bankAcc = accounts.find(function(a) { return a.id === bankMoeinId; });
            if (bankAcc) return { acc: bankAcc, details: { bank: banks[0].id }, label: bankAcc.name + ' — ' + (banks[0].bank || '') };
        }
        // ۴) اولین معین با لینک bank یا cashbox (حتی بدون مورد)
        var anyAcc = leaves.find(function(a) {
            return a.links && (a.links.indexOf('cashbox') !== -1 || a.links.indexOf('bank') !== -1);
        });
        if (anyAcc) return { acc: anyAcc, details: {}, label: anyAcc.name };
        return null;
    }

    /* ─────────────── 4) فراخوانی AI مستقیم ─────────────── */
    async function callVisionAI(dataUrl) {
        if (!AI || !AI.apiKey) throw new Error('کلید API دستیار تنظیم نشده');
        if (typeof _aiDoFetch !== 'function') throw new Error('هسته AI بارگذاری نشده');

        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) {
            return !accounts.some(function(x) { return x.parent === a.id; });
        });
        var accList = leaves.map(function(a) {
            var lk = (a.links && a.links.length) ? ' [نیازمند تفصیلی: ' + a.links.join(',') + ']' : '';
            return a.code + ' = ' + a.name + lk;
        }).join('\n');

        function listOf(key, labeler) {
            var arr = DB.load(key, []);
            var out = arr.map(labeler).filter(Boolean);
            return out.length ? out.join(' | ') : '(هیچ)';
        }
        var personsL = listOf('persons', function(p) { return (p.first || '') + ' ' + (p.last || ''); });
        var compsL   = listOf('companies', function(c) { return c.name; });
        var banksL   = listOf('bankAccounts', function(b) { return (b.bank || '') + (b.account ? ' - ' + b.account : ''); });
        var cashsL   = listOf('cashBoxes', function(c) { return c.title; });
        var projsL   = listOf('projects', function(p) { return p.name; });
        var facsL    = listOf('facilities', function(f) { return f.name; });

        var prompt = [
            'این تصویر یک سند مالی است (فاکتور، پوز، رسید بانکی، دست‌نویس).',
            'تمام اطلاعات را دقیق استخراج کن.',
            'پاسخ را **فقط** به صورت JSON خالص برگردان — بدون هیچ متن اضافه، بدون ```json، بدون توضیح.',
            '',
            'ساختار دقیق JSON:',
            '{',
            '  "date": "YYYY/MM/DD شمسی یا \\"\\" اگر مشخص نیست",',
            '  "description": "شرح کوتاه کل سند",',
            '  "total_amount_rial": عدد صحیح کل به ریال,',
            '  "debit_lines": [',
            '    {',
            '      "account_code": "کد معین از لیست زیر",',
            '      "amount_rial": عدد صحیح این قلم به ریال,',
            '      "description": "شرح این قلم",',
            '      "detail_hint": {',
            '        "person": "نام شخص/فروشنده اگر در متن بود",',
            '        "company": "نام شرکت اگر بود",',
            '        "project": "نام پروژه اگر بود",',
            '        "facility": "نام تسهیلات اگر بود"',
            '      }',
            '    }',
            '  ]',
            '}',
            '',
            '⚠️ قوانین مهم:',
            '1. اگر مبلغ به «تومان» است، × 10 کن تا ریال شود.',
            '2. برای هر قلم هزینه یک ردیف جدا در debit_lines قرار بده.',
            '3. account_code را **الزاماً** از لیست زیر انتخاب کن. اگر مطمئن نیستی، نزدیک‌ترین را انتخاب کن.',
            '4. اگر معین انتخاب‌شده در ستون «نیازمند تفصیلی» نوعی دارد، نام دقیق آن را در detail_hint بگذار.',
            '5. سمت بستانکار را نیاز نیست بنویسی — سیستم خودش پر می‌کند.',
            '6. اگر تصویر قابل خواندن نیست، آرایه debit_lines را خالی بگذار.',
            '',
            '═══ معین‌های معتبر (کد = نام) ═══',
            accList || '(چارت حساب خالی است)',
            '',
            '═══ اشخاص موجود ═══',
            personsL,
            '',
            '═══ شرکت‌ها ═══',
            compsL,
            '',
            '═══ بانک‌ها ═══',
            banksL,
            '',
            '═══ صندوق‌ها ═══',
            cashsL,
            '',
            '═══ پروژه‌ها ═══',
            projsL,
            '',
            '═══ تسهیلات ═══',
            facsL
        ].join('\n');

        // استفاده از _aiDoFetch مستقیم با includeTools=false
        var imgObj = { dataUrl: dataUrl, name: 'scan.jpg' };
        // چند بار تلاش با مدل‌های vision
        var models = ['gpt-4o-mini', 'gpt-4o', 'gemini-2.0-flash', 'gemini-1.5-flash', AI.model].filter(Boolean);
        // حذف تکراری‌ها
        models = models.filter(function(m, i) { return models.indexOf(m) === i; });

        var lastErr = null;
        for (var i = 0; i < models.length; i++) {
            try {
                var res = await _aiDoFetch(models[i], prompt, false, imgObj);
                if (res && res.type === 'text' && res.content) return res.content;
                if (res && res.content) return res.content;
            } catch (e) {
                lastErr = e;
                console.warn('scan attempt failed with', models[i], e);
            }
        }
        throw lastErr || new Error('تحلیل تصویر ناموفق بود');
    }

    /* ─────────────── 5) پارس و اعتبارسنجی پاسخ AI ─────────────── */
    function parseAIJson(text) {
        if (!text) return null;
        // پیدا کردن اولین { و آخرین }
        var s = text.indexOf('{');
        var e = text.lastIndexOf('}');
        if (s === -1 || e === -1 || e < s) return null;
        var jsonStr = text.substring(s, e + 1);
        // نرمال‌سازی اعداد فارسی به لاتین درون JSON
        jsonStr = jsonStr.replace(/[\u06F0-\u06F9]/g, function(d) { return String(d.charCodeAt(0) - 0x06F0); });
        jsonStr = jsonStr.replace(/[\u0660-\u0669]/g, function(d) { return String(d.charCodeAt(0) - 0x0660); });
        try { return JSON.parse(jsonStr); }
        catch (err) {
            console.warn('JSON parse failed', err, jsonStr.substring(0, 200));
            return null;
        }
    }

    /* ─────────────── 6) فشرده‌سازی تصویر ─────────────── */
    function compressImage(dataUrl, maxW, quality) {
        maxW = maxW || 1400; quality = quality || 0.82;
        return new Promise(function(resolve) {
            var img = new Image();
            img.onload = function() {
                var w = img.width, h = img.height;
                if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
                var c = document.createElement('canvas');
                c.width = w; c.height = h;
                var ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                try { resolve(c.toDataURL('image/jpeg', quality)); }
                catch (e) { resolve(dataUrl); }
            };
            img.onerror = function() { resolve(dataUrl); };
            img.src = dataUrl;
        });
    }

    /* ─────────────── 7) مودال ─────────────── */
    function buildModal() {
        var old = document.getElementById('scan-modal-v39');
        if (old) old.remove();
        var oldO = document.getElementById('scan-overlay-v39');
        if (oldO) oldO.remove();

        var html = ''
            + '<div id="scan-overlay-v39" class="overlay show" style="z-index:11000"></div>'
            + '<div id="scan-modal-v39" class="modal show" style="max-width:680px;z-index:11010">'
            +   '<div class="modal-head" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)">'
            +     '<h2>📷 اسکن هوشمند سند</h2>'
            +     '<button class="close-btn" id="scan-close-v39">×</button>'
            +   '</div>'
            +   '<div class="modal-body" style="min-height:300px">'
            +     '<div id="scan-step-pick" class="scan-step">'
            +       '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
            +         '<button id="scan-cam-v39" class="btn-primary" style="flex:1;min-width:140px">📸 دوربین</button>'
            +         '<label class="btn-secondary" style="flex:1;min-width:140px;cursor:pointer;text-align:center;display:inline-flex;align-items:center;justify-content:center;padding:11px 20px">'
            +           '🖼 انتخاب فایل'
            +           '<input type="file" id="scan-file-v39" accept="image/*" style="display:none">'
            +         '</label>'
            +       '</div>'
            +       '<div id="scan-preview-v39" style="text-align:center;margin-bottom:12px;min-height:60px"></div>'
            +       '<video id="scan-video-v39" style="width:100%;border-radius:14px;display:none;background:#000;max-height:340px" autoplay playsinline muted></video>'
            +       '<div id="scan-status-v39" style="text-align:center;color:var(--text-muted);font-size:0.85rem;min-height:34px;padding:8px;font-weight:700"></div>'
            +       '<button id="scan-capture-v39" class="btn-primary" style="display:none;width:100%;margin-top:8px">📸 گرفتن عکس</button>'
            +     '</div>'
            +     '<div id="scan-step-review" class="scan-step" style="display:none">'
            +       '<div style="padding:12px 14px;background:#eef2ff;border-radius:12px;margin-bottom:14px;font-size:0.82rem;color:#3730a3;line-height:1.9">'
            +         '<strong>🎯 اطلاعات استخراج‌شده — بررسی کنید:</strong>'
            +       '</div>'
            +       '<div id="scan-review-body"></div>'
            +     '</div>'
            +   '</div>'
            +   '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">'
            +     '<button id="scan-analyze-v39" class="btn-primary" disabled>🤖 تحلیل با AI</button>'
            +     '<button id="scan-apply-v39" class="btn-primary" style="display:none;background:linear-gradient(135deg,#10b981,#059669)">✅ اعمال در فرم سند</button>'
            +     '<button id="scan-back-v39" class="btn-secondary" style="display:none">↩ بازگشت</button>'
            +     '<button id="scan-cancel-v39" class="btn-secondary">انصراف</button>'
            +   '</div>'
            + '</div>';
        document.body.insertAdjacentHTML('beforeend', html);

        var st = {
            dataUrl: null,
            stream: null,
            extracted: null
        };

        function closeAll() {
            if (st.stream) { st.stream.getTracks().forEach(function(t) { t.stop(); }); st.stream = null; }
            var m = document.getElementById('scan-modal-v39'); if (m) m.remove();
            var o = document.getElementById('scan-overlay-v39'); if (o) o.remove();
        }

        function setStatus(text, color) {
            var el = document.getElementById('scan-status-v39');
            if (!el) return;
            el.textContent = text;
            el.style.color = color || 'var(--text-muted)';
        }

        document.getElementById('scan-close-v39').onclick = closeAll;
        document.getElementById('scan-cancel-v39').onclick = closeAll;
        document.getElementById('scan-overlay-v39').onclick = closeAll;

        // دوربین
        document.getElementById('scan-cam-v39').onclick = async function() {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('مرورگر از دوربین پشتیبانی نمی‌کند');
                }
                var stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
                    audio: false
                });
                st.stream = stream;
                var v = document.getElementById('scan-video-v39');
                v.srcObject = stream;
                v.style.display = 'block';
                document.getElementById('scan-capture-v39').style.display = 'block';
                setStatus('🟢 دوربین فعال — کادر را روی سند بگیر', '#059669');
            } catch (e) {
                setStatus('⚠️ ' + (e.message || e), '#dc2626');
            }
        };

        // گرفتن عکس
        document.getElementById('scan-capture-v39').onclick = function() {
            var v = document.getElementById('scan-video-v39');
            if (!v || !v.videoWidth) { setStatus('⚠️ دوربین آماده نیست', '#dc2626'); return; }
            var c = document.createElement('canvas');
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            c.getContext('2d').drawImage(v, 0, 0);
            var raw = c.toDataURL('image/jpeg', 0.9);
            st.dataUrl = raw;
            renderPreview(raw);
            if (st.stream) { st.stream.getTracks().forEach(function(t) { t.stop(); }); st.stream = null; }
            v.style.display = 'none';
            this.style.display = 'none';
            setStatus('📸 عکس آماده است — روی «تحلیل با AI» بزن', '#1e40af');
            document.getElementById('scan-analyze-v39').disabled = false;
        };

        // فایل
        document.getElementById('scan-file-v39').onchange = function() {
            var f = this.files && this.files[0];
            if (!f) return;
            if (!f.type || f.type.indexOf('image') === -1) { setStatus('⚠️ فایل باید تصویر باشد', '#dc2626'); return; }
            if (f.size > 12 * 1024 * 1024) { setStatus('⚠️ حجم فایل بیش از ۱۲ مگابایت است', '#dc2626'); return; }
            var reader = new FileReader();
            reader.onload = function(ev) {
                st.dataUrl = ev.target.result;
                renderPreview(ev.target.result);
                setStatus('🖼 تصویر آماده است — روی «تحلیل با AI» بزن', '#1e40af');
                document.getElementById('scan-analyze-v39').disabled = false;
            };
            reader.readAsDataURL(f);
            this.value = '';
        };

        function renderPreview(url) {
            var p = document.getElementById('scan-preview-v39');
            p.innerHTML = '<img src="' + url + '" style="max-width:100%;max-height:320px;border-radius:14px;border:1px solid var(--border);box-shadow:var(--shadow-md)">';
        }

        // تحلیل
        document.getElementById('scan-analyze-v39').onclick = async function() {
            if (!st.dataUrl) return;
            var btn = this;
            btn.disabled = true;
            setStatus('🗜 فشرده‌سازی تصویر...', '#4f46e5');
            var small;
            try { small = await compressImage(st.dataUrl, 1400, 0.82); }
            catch (e) { small = st.dataUrl; }

            setStatus('🤖 در حال تحلیل با AI — چند ثانیه صبر کن...', '#4f46e5');
            try {
                var txt = await callVisionAI(small);
                var data = parseAIJson(txt);
                if (!data) throw new Error('پاسخ AI قابل تجزیه نبود');
                st.extracted = data;
                renderReview(data);
                setStatus('✅ استخراج کامل شد — بررسی و تأیید کن', '#059669');
                document.getElementById('scan-step-pick').style.display = 'none';
                document.getElementById('scan-step-review').style.display = '';
                document.getElementById('scan-apply-v39').style.display = '';
                document.getElementById('scan-back-v39').style.display = '';
                btn.style.display = 'none';
            } catch (e) {
                console.error(e);
                setStatus('⚠️ خطا: ' + (e.message || e), '#dc2626');
                btn.disabled = false;
            }
        };

        // بازگشت
        document.getElementById('scan-back-v39').onclick = function() {
            document.getElementById('scan-step-pick').style.display = '';
            document.getElementById('scan-step-review').style.display = 'none';
            document.getElementById('scan-apply-v39').style.display = 'none';
            this.style.display = 'none';
            var ab = document.getElementById('scan-analyze-v39');
            ab.style.display = '';
            ab.disabled = false;
            setStatus('🖼 می‌توانی عکس دیگری انتخاب کنی', 'var(--text-muted)');
        };

        // اعمال
        document.getElementById('scan-apply-v39').onclick = function() {
            if (!st.extracted) return;
            try {
                applyExtracted(st.extracted);
                closeAll();
            } catch (e) {
                alert('⚠️ خطا در اعمال: ' + (e.message || e));
            }
        };

        // رسم پیش‌نمایش اطلاعات استخراج‌شده
        function renderReview(data) {
            var box = document.getElementById('scan-review-body');
            if (!box) return;
            var lines = Array.isArray(data.debit_lines) ? data.debit_lines : [];
            var total = Number(data.total_amount_rial) || lines.reduce(function(s, l) { return s + (Number(l.amount_rial) || 0); }, 0);

            var html = '';
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';
            html += '<div style="padding:10px 12px;background:var(--card-alt);border-radius:10px;border:1px solid var(--border)"><div style="font-size:.7rem;color:var(--text-muted);font-weight:700">تاریخ</div><div style="font-weight:800;color:var(--primary-dark)" dir="ltr">' + (data.date ? toFa(esc(data.date)) : '—') + '</div></div>';
            html += '<div style="padding:10px 12px;background:var(--card-alt);border-radius:10px;border:1px solid var(--border)"><div style="font-size:.7rem;color:var(--text-muted);font-weight:700">مبلغ کل</div><div style="font-weight:800;color:var(--primary-dark)">' + (total ? formatMoney(total) + ' ' + currencyLabel() : '—') + '</div></div>';
            html += '</div>';
            if (data.description) {
                html += '<div style="padding:10px 12px;background:var(--card-alt);border-radius:10px;border:1px solid var(--border);margin-bottom:12px"><div style="font-size:.7rem;color:var(--text-muted);font-weight:700">شرح</div><div style="font-weight:700">' + esc(data.description) + '</div></div>';
            }

            if (lines.length === 0) {
                html += '<div class="widget-empty" style="padding:20px">⚠️ AI قلم هزینه‌ای تشخیص نداد. می‌توانی خودت دستی پر کنی.</div>';
                box.innerHTML = html;
                return;
            }

            html += '<div style="font-weight:800;color:var(--primary-dark);margin-bottom:8px;font-size:.88rem">📋 ' + toFa(lines.length) + ' قلم هزینه تشخیص داده شد:</div>';
            html += '<div style="overflow-x:auto;border-radius:12px;border:1px solid var(--border)"><table style="width:100%;border-collapse:collapse;font-size:.82rem">';
            html += '<thead><tr style="background:var(--primary-soft);color:var(--primary-dark)">'
                 +  '<th style="padding:8px 10px;text-align:right">#</th>'
                 +  '<th style="padding:8px 10px;text-align:right">حساب (کد)</th>'
                 +  '<th style="padding:8px 10px;text-align:right">تفصیلی</th>'
                 +  '<th style="padding:8px 10px;text-align:right">مبلغ</th>'
                 +  '<th style="padding:8px 10px;text-align:right">شرح</th>'
                 +  '</tr></thead><tbody>';
            lines.forEach(function(l, i) {
                var acc = findMoeinByCodeOrName(l.account_code);
                var accLbl = acc ? (acc.code + ' — ' + acc.name) : ('⚠️ یافت نشد (' + esc(l.account_code || 'خالی') + ')');
                var det = '—';
                if (l.detail_hint && acc && acc.links) {
                    var detParts = [];
                    Object.keys(l.detail_hint).forEach(function(k) {
                        if (acc.links.indexOf(k) === -1) return;
                        var v = l.detail_hint[k];
                        if (!v) return;
                        var did = fuzzyFindDetail(k, v);
                        detParts.push(linkTypeName(k) + ': ' + (did ? '✅ ' + getDetailLabel(k, did) : '❌ ' + v));
                    });
                    if (detParts.length) det = detParts.join(' • ');
                }
                html += '<tr style="border-top:1px solid var(--border)">'
                     +  '<td style="padding:8px 10px">' + toFa(i + 1) + '</td>'
                     +  '<td style="padding:8px 10px;font-weight:' + (acc ? '700' : '800') + ';color:' + (acc ? 'var(--text)' : '#dc2626') + '">' + accLbl + '</td>'
                     +  '<td style="padding:8px 10px;font-size:.76rem">' + det + '</td>'
                     +  '<td style="padding:8px 10px;font-weight:800;direction:ltr;text-align:center">' + (l.amount_rial ? formatMoney(Number(l.amount_rial)) : '—') + '</td>'
                     +  '<td style="padding:8px 10px">' + esc(l.description || '—') + '</td>'
                     +  '</tr>';
            });
            html += '</tbody></table></div>';

            // پیش‌نمایش سمت بستانکار
            var def = findDefaultCreditAccount();
            if (def) {
                html += '<div style="margin-top:12px;padding:10px 12px;background:#ecfdf5;border:1px solid #10b981;border-radius:10px;font-size:.82rem;color:#065f46">';
                html += '<strong>💳 سمت بستانکار پیش‌فرض:</strong> ' + esc(def.label);
                html += '<div style="font-size:.72rem;opacity:.85;margin-top:4px">اگر این درست نیست، بعد از اعمال، خودت از فرم ویرایش کن.</div>';
                html += '</div>';
            }

            box.innerHTML = html;
        }
    }

    /* ─────────────── 8) اعمال داده‌ی استخراج‌شده در فرم سند ─────────────── */
    function applyExtracted(data) {
        // اگر فرم نیمه‌کاره است، هشدار بده
        var hasContent = false;
        try {
            var descEl = document.getElementById('v-desc');
            if (descEl && descEl.value && descEl.value.trim()) hasContent = true;
            if (Array.isArray(window.voucherLines)) {
                var valid = window.voucherLines.filter(function(l) {
                    return l && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0 || l.account);
                });
                if (valid.length > 1) hasContent = true;
            }
        } catch (e) {}
        if (hasContent) {
            if (!confirm('⚠️ در فرم سند فعلی اطلاعاتی وجود دارد.\n\nOK = جایگزینی کامل با اسکن\nCancel = انصراف')) return;
        }

        // اطمینان از پاک بودن فرم قبل از اعمال
        document.getElementById('v-id').value = '';
        if (typeof getNextVoucherNumberForPeriod === 'function') {
            document.getElementById('v-number').value = getNextVoucherNumberForPeriod(state.activePeriodId || '');
        }
        // تاریخ
        var dt = document.getElementById('v-date');
        if (data.date && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(data.date)) dt.value = data.date;
        else dt.value = todayJalaliStr();

        // شرح سند
        if (data.description) document.getElementById('v-desc').value = String(data.description).trim();

        // ساخت قلم‌ها
        var lines = [];
        var debitLines = Array.isArray(data.debit_lines) ? data.debit_lines : [];
        var totalAmt = 0;

        debitLines.forEach(function(dl) {
            var amt = Number(dl.amount_rial) || 0;
            if (amt <= 0) return;
            var acc = findMoeinByCodeOrName(dl.account_code);
            var accId = acc ? acc.id : '';
            var details = {};
            if (acc && acc.links && dl.detail_hint) {
                acc.links.forEach(function(lt) {
                    var hint = dl.detail_hint[lt];
                    if (!hint) return;
                    var foundId = fuzzyFindDetail(lt, hint);
                    if (foundId) details[lt] = foundId;
                });
            }
            lines.push({
                id: uid(),
                account: accId,
                details: details,
                debit: amt,
                credit: 0,
                description: String(dl.description || data.description || '').trim()
            });
            totalAmt += amt;
        });

        if (lines.length === 0) {
            // اگر AI هیچ قلمی نداد، یک ردیف خالی + کل مبلغ در بدهکار
            var tAmt = Number(data.total_amount_rial) || 0;
            lines.push({
                id: uid(),
                account: '',
                details: {},
                debit: tAmt,
                credit: 0,
                description: String(data.description || '').trim()
            });
            totalAmt = tAmt;
        }

        // سمت بستانکار پیش‌فرض
        if (totalAmt > 0) {
            var def = findDefaultCreditAccount();
            if (def && def.acc) {
                lines.push({
                    id: uid(),
                    account: def.acc.id,
                    details: def.details || {},
                    debit: 0,
                    credit: totalAmt,
                    description: 'پرداخت از ' + def.acc.name,
                    locked: true
                });
            } else {
                // نبود پیش‌فرض — ردیف خالی بستانکار
                lines.push({
                    id: uid(),
                    account: '',
                    details: {},
                    debit: 0,
                    credit: totalAmt,
                    description: 'سمت بستانکار — تعیین کنید'
                });
            }
        }

        window.voucherLines = lines;
        if (typeof renderVoucherLines === 'function') renderVoucherLines();
        if (typeof goToPage === 'function') goToPage('voucher-new');
        if (typeof showToast === 'function') {
            showToast('✅ اسکن اعمال شد — ' + toFa(lines.length) + ' قلم');
        }
    }

    /* ─────────────── 9) افزودن دکمه به فرم سند ─────────────── */
    function injectScanButton() {
        var page = document.getElementById('page-voucher-new');
        if (!page) return;
        var existing = document.getElementById('scan-btn-v39');
        if (existing) return;
        var headCard = page.querySelector('#voucher-head-card');
        if (!headCard) return;
        var btn = document.createElement('button');
        btn.id = 'scan-btn-v39';
        btn.type = 'button';
        btn.style.cssText = [
            'margin-top:12px',
            'width:100%',
            'padding:13px',
            'background:linear-gradient(135deg,#8b5cf6,#6366f1)',
            'color:#fff',
            'border:none',
            'border-radius:12px',
            'font-family:inherit',
            'font-weight:800',
            'font-size:0.92rem',
            'cursor:pointer',
            'box-shadow:0 4px 14px rgba(99,102,241,0.35)',
            'transition:transform .2s'
        ].join(';');
        btn.innerHTML = '📷 اسکن هوشمند سند (فاکتور / پوز / دست‌نویس)';
        btn.addEventListener('mouseenter', function() { btn.style.transform = 'translateY(-1px)'; });
        btn.addEventListener('mouseleave', function() { btn.style.transform = ''; });
        btn.addEventListener('click', buildModal);
        var headRow = headCard.querySelector('.voucher-head-row');
        if (headRow) headRow.parentNode.insertBefore(btn, headRow.nextSibling);
        else headCard.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(injectScanButton, 3200); });
    } else {
        setTimeout(injectScanButton, 3200);
    }
    // نگهبان — اگر بین init، دکمه حذف شد
    setInterval(injectScanButton, 4000);

    console.log('✅ Scan Module v39 بارگذاری شد');
})();
