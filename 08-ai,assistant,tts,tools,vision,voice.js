/* =====================================================================
   پارسیس v27 — 08-ai,assistant,tts,tools,vision,voice.js
   دستیار هوشمند: AI، ابزارها، TTS پارسی، Vision، Voice
   ===================================================================== */
'use strict';

/* ==================== Models & Tools ==================== */
var AVALAI_MODELS = [
    { id: 'gpt-4o-mini',                label: 'GPT-4o Mini (پیشنهاد، vision)' },
    { id: 'gpt-4o',                     label: 'GPT-4o (vision)' },
    { id: 'gpt-4.1-mini',               label: 'GPT-4.1 Mini (vision)' },
    { id: 'gpt-4.1',                    label: 'GPT-4.1 (vision)' },
    { id: 'gpt-3.5-turbo',              label: 'GPT-3.5 Turbo (اقتصادی)' },
    { id: 'deepseek-chat',              label: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner',          label: 'DeepSeek Reasoner' },
    { id: 'gemini-2.0-flash',           label: 'Gemini 2.0 Flash (vision)' },
    { id: 'gemini-1.5-flash',           label: 'Gemini 1.5 Flash (vision)' },
    { id: 'gemini-1.5-pro',             label: 'Gemini 1.5 Pro (vision)' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (vision)' },
    { id: 'o1-mini',                    label: 'o1-mini' }
];
var VISION_MODEL_IDS = ['gpt-4o-mini','gpt-4o','gpt-4.1-mini','gpt-4.1','gemini-2.0-flash','gemini-1.5-flash','gemini-1.5-pro','claude-3-5-sonnet-20241022'];

var AI_NAVIGABLE_PAGES = {
    'home': 'صفحه اصلی', 'dashboard': 'داشبورد مالی', 'voucher-list': 'فهرست اسناد',
    'voucher-new': 'صدور سند جدید', 'persons': 'اشخاص', 'companies': 'شرکت‌ها',
    'bank-accounts': 'حساب‌های بانکی', 'cash-boxes': 'صندوق‌ها', 'projects': 'پروژه‌ها',
    'fiscal': 'دوره‌های مالی', 'chart-define': 'تعریف حساب‌ها', 'facilities': 'تسهیلات',
    'cashflow-sources': 'منابع دریافتنی', 'estimate-daily': 'برآورد هزینه‌های روزانه',
    'templates': 'الگوهای سند', 'notes': 'دفترچه یادداشت', 'sms': 'پیامک بانکی',
    'report-cashflow': 'وضعیت نقدینگی', 'report-cashflow-desc': 'گردش وجه نقد',
    'report-account': 'مرور حساب‌ها', 'report-trial': 'تراز آزمایشی',
    'report-incomplete': 'تراکنش‌های تکمیل نشده', 'report-facility': 'خلاصه تسهیلات',
    'report-facility-full': 'گزارش جامع تسهیلات', 'report-rates': 'گزارش نرخ ارز و طلا',
    'daily-close': 'قیمت پایانی روز'
};

var AI_TOOLS = [
    { type: 'function', function: { name: 'create_voucher_draft', description: 'ساخت پیش‌نویس سند حسابداری. فقط زمانی که کاربر صریحاً درخواست ثبت سند کرد از این ابزار استفاده کن.', parameters: { type: 'object', properties: { date: { type: 'string', description: 'تاریخ شمسی YYYY/MM/DD' }, desc: { type: 'string', description: 'شرح کلی سند' }, type: { type: 'string', enum: ['general', 'opening', 'establishment', 'closing', 'final'] }, lines: { type: 'array', minItems: 2, items: { type: 'object', properties: { account_code: { type: 'string', description: 'کد معین دقیق از چارت حساب‌ها' }, debit: { type: 'number' }, credit: { type: 'number' }, description: { type: 'string' }, details: { type: 'object', additionalProperties: { type: 'string' }, description: 'نام تفصیلی مرتبط. کلید یکی از: person, company, bank, cashbox, project, facility' } }, required: ['account_code', 'description'] } } }, required: ['date', 'desc', 'lines'] } } },
    { type: 'function', function: { name: 'navigate_and_run_report', description: 'رفتن به یک صفحه گزارش یا فرم و اجرای آن.', parameters: { type: 'object', properties: { page_key: { type: 'string' }, from_date: { type: 'string' }, to_date: { type: 'string' } }, required: ['page_key'] } } },
    { type: 'function', function: { name: 'create_person', description: 'تعریف شخص جدید.', parameters: { type: 'object', properties: { first: { type: 'string' }, last: { type: 'string' }, father: { type: 'string' }, nationalId: { type: 'string' }, birth: { type: 'string' }, mobile: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, bankTitle: { type: 'string' }, acc: { type: 'string' }, iban: { type: 'string' }, card: { type: 'string' }, address: { type: 'string' } }, required: ['first'] } } },
    { type: 'function', function: { name: 'create_company', description: 'تعریف شرکت جدید.', parameters: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, address: { type: 'string' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'create_bank_account', description: 'تعریف حساب بانکی جدید.', parameters: { type: 'object', properties: { bank: { type: 'string' }, type: { type: 'string' }, branchCode: { type: 'string' }, branchName: { type: 'string' }, account: { type: 'string' }, iban: { type: 'string' }, card: { type: 'string' }, order: { type: 'number' }, minBalance: { type: 'number' } }, required: ['bank'] } } },
    { type: 'function', function: { name: 'create_cash_box', description: 'تعریف صندوق جدید.', parameters: { type: 'object', properties: { title: { type: 'string' }, type: { type: 'string' }, unit: { type: 'string' }, order: { type: 'number' } }, required: ['title'] } } },
    { type: 'function', function: { name: 'create_project', description: 'تعریف پروژه جدید.', parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'create_fiscal_period', description: 'تعریف دوره مالی جدید.', parameters: { type: 'object', properties: { title: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, activate: { type: 'boolean' } }, required: ['title', 'from', 'to'] } } },
    { type: 'function', function: { name: 'create_account', description: 'تعریف حساب جدید در چارت.', parameters: { type: 'object', properties: { code: { type: 'string' }, name: { type: 'string' }, parent_code: { type: 'string' }, cat: { type: 'string' }, nature: { type: 'string' }, links: { type: 'array', items: { type: 'string' } }, cfEffect: { type: 'boolean' } }, required: ['code', 'name'] } } },
    { type: 'function', function: { name: 'create_facility', description: 'تعریف تسهیلات جدید.', parameters: { type: 'object', properties: { name: { type: 'string' }, category: { type: 'string' }, bank_account: { type: 'string' }, date: { type: 'string' }, initial: { type: 'number' } }, required: ['name'] } } },
    { type: 'function', function: { name: 'create_note', description: 'ایجاد یادداشت جدید.', parameters: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string' }, content: { type: 'string' }, checklist: { type: 'array', items: { type: 'string' } } }, required: ['title'] } } }
];

/* ==================== AI State ==================== */
var AI = {
    provider: DB.load('ai.provider', 'avalai'),
    apiKey: DB.load('ai.apiKey', ''),
    model: DB.load('ai.model', 'gpt-4o-mini'),
    autoFallback: DB.load('ai.autoFallback', true),
    failedModels: {},
    history: DB.load('ai.history', []),
    MAX_HISTORY: 20,
    isThinking: false
};
var AI_PENDING_IMAGE = null;
var AI_VOICE_ACTIVE = false;
var AI_REC = null;

function aiSaveSettings() {
    DB.save('ai.provider', AI.provider);
    DB.save('ai.apiKey', AI.apiKey);
    DB.save('ai.model', AI.model);
    DB.save('ai.autoFallback', AI.autoFallback);
}
function aiSaveHistory() { DB.save('ai.history', AI.history.slice(-AI.MAX_HISTORY)); }

/* ==================== Image preview ==================== */
function aiRenderImagePreview() {
    var box = document.getElementById('ai-image-preview-box');
    if (!box) return;
    if (!AI_PENDING_IMAGE) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = 'flex';
    box.innerHTML = '<img src="' + AI_PENDING_IMAGE.dataUrl + '" alt="">' +
        '<div class="info"><div class="name">📷 ' + esc(AI_PENDING_IMAGE.name) + '</div>' +
        '<div class="muted" style="font-size:0.72rem">متن سوال را بنویسید و ارسال کنید</div></div>' +
        '<button class="remove" title="حذف تصویر">×</button>';
    box.querySelector('.remove').addEventListener('click', function() {
        AI_PENDING_IMAGE = null;
        aiRenderImagePreview();
    });
}
function aiAttachImage(file) {
    if (!file || !file.type || file.type.indexOf('image') === -1) return;
    if (file.size > 5 * 1024 * 1024) { showToast('⚠️ حجم تصویر بیش از ۵ مگابایت.'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
        AI_PENDING_IMAGE = { dataUrl: e.target.result, name: file.name || 'image' };
        aiRenderImagePreview();
        showToast('📷 تصویر پیوست شد.');
    };
    reader.readAsDataURL(file);
}

/* ==================== Voice recognition ==================== */
function aiToggleVoice() {
    if (AI_VOICE_ACTIVE) { aiStopVoice(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast('⚠️ تشخیص گفتار در این مرورگر پشتیبانی نمی‌شود. از Chrome یا Edge استفاده کنید.'); return; }
    try {
        var rec = new SR();
        rec.lang = 'fa-IR';
        rec.continuous = false;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        var input = document.getElementById('ai-input');
        var startVal = input.value;
        var micBtn = document.getElementById('ai-mic-btn');
        AI_VOICE_ACTIVE = true;
        micBtn.classList.add('recording');
        micBtn.textContent = '⏹';
        micBtn.title = 'توقف ضبط';
        rec.onresult = function(e) {
            var finalText = '';
            var interimText = '';
            for (var i = e.resultIndex; i < e.results.length; i++) {
                var t = e.results[i][0].transcript;
                if (e.results[i].isFinal) finalText += t;
                else interimText += t;
            }
            input.value = ((startVal ? startVal + ' ' : '') + finalText + interimText).trim();
        };
        rec.onerror = function(e) {
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') showToast('⚠️ دسترسی به میکروفون داده نشد.');
            else if (e.error === 'no-speech') showToast('صدایی شنیده نشد.');
            else if (e.error !== 'aborted') showToast('خطای تشخیص گفتار: ' + e.error);
        };
        rec.onend = function() {
            AI_VOICE_ACTIVE = false;
            AI_REC = null;
            if (micBtn) {
                micBtn.classList.remove('recording');
                micBtn.textContent = '🎤';
                micBtn.title = 'ضبط صدا';
            }
        };
        rec.start();
        AI_REC = rec;
    } catch(err) {
        AI_VOICE_ACTIVE = false;
        var mb = document.getElementById('ai-mic-btn');
        if (mb) { mb.classList.remove('recording'); mb.textContent = '🎤'; }
        showToast('⚠️ شروع ضبط ناموفق بود.');
    }
}
function aiStopVoice() {
    if (AI_REC) { try { AI_REC.stop(); } catch(e) {} AI_REC = null; }
    AI_VOICE_ACTIVE = false;
    var mb = document.getElementById('ai-mic-btn');
    if (mb) { mb.classList.remove('recording'); mb.textContent = '🎤'; mb.title = 'ضبط صدا'; }
}

/* ==================== TTS پارسی ==================== */
var AI_TTS = { autoSpeak: DB.load('ai.autoSpeak', false), rate: DB.load('ai.speakRate', 1.0), voice: null };
function aiSaveTTS() { DB.save('ai.autoSpeak', AI_TTS.autoSpeak); DB.save('ai.speakRate', AI_TTS.rate); }
function aiPickPersianVoice() {
    if (!window.speechSynthesis) return null;
    var voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    var priorityLangs = ['fa-ir', 'fa', 'persian'];
    for (var p = 0; p < priorityLangs.length; p++) {
        var v = voices.find(function(x) {
            return (x.lang || '').toLowerCase().indexOf(priorityLangs[p]) === 0 || (x.lang || '').toLowerCase() === priorityLangs[p];
        });
        if (v) return v;
    }
    var v2 = voices.find(function(x) { return /persian|farsi|parsi/i.test(x.name || ''); });
    if (v2) return v2;
    var v3 = voices.find(function(x) { return (x.lang || '').toLowerCase().indexOf('ar') === 0; });
    return v3 || null;
}
function aiStripMarkdownForSpeech(text) {
    return String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/^\s*[|>\-*+▸▾▲▼⇅•]+\s*/gm, '')
        .replace(/\|/g, ' ')
        .replace(/[0-9]+/g, function(m) { return toFa(m); })
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' . ')
        .replace(/\.\s*\./g, '.')
        .trim();
}
function aiSpeak(text) {
    if (!window.speechSynthesis) { showToast('⚠️ مرورگر از پخش صوتی پشتیبانی نمی‌کند.'); return; }
    try { window.speechSynthesis.cancel(); } catch(e) {}
    var clean = aiStripMarkdownForSpeech(text);
    if (!clean) { showToast('متنی برای خواندن نیست.'); return; }
    var utt = new SpeechSynthesisUtterance(clean);
    utt.lang = 'fa-IR';
    utt.rate = Math.max(0.5, Math.min(1.5, Number(AI_TTS.rate) || 1));
    utt.pitch = 1.0;
    var v = AI_TTS.voice || aiPickPersianVoice();
    if (v) { utt.voice = v; AI_TTS.voice = v; }
    var btn = document.getElementById('ai-tts-btn');
    if (btn) { btn.textContent = '⏹'; btn.classList.add('speaking'); btn.title = 'توقف'; }
    utt.onend = function() {
        if (btn) { btn.textContent = '🔊'; btn.classList.remove('speaking'); btn.title = 'پخش صوتی آخرین پاسخ'; }
    };
    utt.onerror = function() {
        if (btn) { btn.textContent = '🔊'; btn.classList.remove('speaking'); }
    };
    window.speechSynthesis.speak(utt);
}
function aiStopSpeaking() {
    if (!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch(e) {}
    var btn = document.getElementById('ai-tts-btn');
    if (btn) { btn.textContent = '🔊'; btn.classList.remove('speaking'); btn.title = 'پخش صوتی آخرین پاسخ'; }
}
function aiToggleSpeak() {
    if (!window.speechSynthesis) { showToast('⚠️ مرورگر پشتیبانی نمی‌کند.'); return; }
    if (window.speechSynthesis.speaking) { aiStopSpeaking(); return; }
    var lastMsg = null;
    for (var i = AI.history.length - 1; i >= 0; i--) {
        if (AI.history[i].role === 'assistant' && AI.history[i].content) { lastMsg = AI.history[i]; break; }
    }
    if (!lastMsg) { showToast('پاسخی برای خواندن نیست.'); return; }
    aiSpeak(lastMsg.content);
}
function aiAutoSpeakIfNeeded(msg) {
    if (!AI_TTS.autoSpeak) return;
    if (!msg || msg.role !== 'assistant' || !msg.content) return;
    setTimeout(function() { aiSpeak(msg.content); }, 250);
}
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function() { AI_TTS.voice = aiPickPersianVoice(); };
    setTimeout(function() { AI_TTS.voice = aiPickPersianVoice(); }, 500);
}

/* ==================== Context builder ==================== */
function aiBuildContext() {
    var lines = [];
    var todayJ = toJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var todayStr = todayJ[0] + '/' + pad2(todayJ[1]) + '/' + pad2(todayJ[2]);
    lines.push('=== 📅 اطلاعات پایه ===');
    lines.push('نرم‌افزار: ' + APP_NAME + ' (نسخه ' + APP_VERSION + ')');
    lines.push('⚠️ تاریخ امروز (شمسی): ' + todayStr + ' (' + WEEKDAYS_FA[new Date().getDay()] + ')');
    lines.push('⚠️ تمام مبالغ در این دیتابیس به ریال هستند.');
    lines.push('واحد نمایش فعلی کاربر: ' + currencyLabel());

    var periods = DB.load('fiscalPeriods', []);
    if (periods.length > 0) {
        lines.push('\n=== 📅 دوره‌های مالی ===');
        var activeP = null;
        periods.forEach(function(p) {
            var am = (p.id === state.activePeriodId) ? ' ⭐(دوره فعال فعلی)' : '';
            if (p.id === state.activePeriodId) activeP = p;
            lines.push('- «' + p.title + '» از ' + p.from + ' تا ' + p.to + am);
        });
        if (activeP) lines.push('⚠️ سند باید تاریخش در بازه ' + activeP.from + ' تا ' + activeP.to + ' باشد.');
        else lines.push('⚠️ هیچ دوره فعالی انتخاب نشده!');
    } else lines.push('\n=== 📅 دوره مالی === (تعریف نشده)');

    var accounts = DB.load('accounts', []);
    if (accounts.length > 0) {
        lines.push('\n=== 🗂️ چارت حساب‌ها (' + accounts.length + ' حساب) ===');
        lines.push('فرمت: [کد] عنوان سطح | تفصیلی مرتبط | ویژگی‌ها');
        var byParent = {};
        accounts.forEach(function(a) {
            var p = a.parent || '__root__';
            if (!byParent[p]) byParent[p] = [];
            byParent[p].push(a);
        });
        function walk(pid, depth) {
            var arr = byParent[pid] || [];
            arr.sort(function(a, b) { return (a.code || '').localeCompare(b.code || '', 'fa'); });
            arr.forEach(function(a) {
                var extra = [];
                if (a.links && a.links.length > 0) extra.push('تفصیلی: ' + a.links.map(linkTypeName).join('، '));
                if (a.cfEffect) extra.push('گردش وجه نقد');
                var lvlName = depth === 0 ? 'گروه' : (depth === 1 ? 'کل' : (depth === 2 ? 'معین' : 'تفصیلی'));
                lines.push(new Array(depth + 1).join('   ') + '├─ [' + (a.code || '?') + '] ' + (a.name || '') + ' (' + lvlName + ')' + (extra.length ? ' — ' + extra.join(' | ') : ''));
                walk(a.id, depth + 1);
            });
        }
        walk('__root__', 0);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        lines.push('\n=== 📋 فقط این کدها را در account_code استفاده کن (' + leaves.length + ' معین) ===');
        leaves.forEach(function(a) { lines.push('- ' + a.code + ' → ' + getAccountLabel(a.id, accounts)); });
    } else lines.push('\n=== 🗂️ چارت حساب‌ها === (خالی - اول باید تعریف شود)');

    var persons = DB.load('persons', []);
    if (persons.length > 0) {
        lines.push('\n=== 👥 اشخاص (' + persons.length + ') ===');
        lines.push('⚠️ در فیلد details.person نام دقیق از این لیست استفاده کن.');
        persons.forEach(function(p) {
            var parts = ['نام: ' + (p.first || '—'), 'خانوادگی: ' + (p.last || '—')];
            if (p.mobile) parts.push('موبایل: ' + p.mobile);
            if (p.nationalId) parts.push('کد ملی: ' + p.nationalId);
            lines.push('- ' + parts.join(' | '));
        });
    } else lines.push('\n=== 👥 اشخاص === (خالی)');

    var companies = DB.load('companies', []);
    if (companies.length > 0) {
        lines.push('\n=== 🏢 شرکت‌ها (' + companies.length + ') ===');
        companies.forEach(function(c) { lines.push('- ' + (c.name || '—') + (c.phone ? ' | تلفن: ' + c.phone : '')); });
    } else lines.push('\n=== 🏢 شرکت‌ها === (خالی)');

    var banks = DB.load('bankAccounts', []);
    if (banks.length > 0) {
        lines.push('\n=== 🏦 حساب‌های بانکی (' + banks.length + ') ===');
        lines.push('⚠️ در فیلد details.bank دقیقاً یکی از این‌ها را بنویس.');
        var tb = 0;
        banks.forEach(function(b) {
            var bal = getBankBalance(b.id);
            tb += bal;
            var det = '🏦 ' + (b.bank || '—');
            if (b.account) det += ' | حساب: ' + b.account;
            if (b.branchName) det += ' | شعبه: ' + b.branchName;
            det += ' | مانده: ' + formatRial(bal) + ' ریال';
            lines.push('- ' + det);
        });
        lines.push('💰 جمع مانده بانک‌ها: ' + formatRial(tb) + ' ریال');
    } else lines.push('\n=== 🏦 حساب‌های بانکی === (خالی)');

    var cbs = DB.load('cashBoxes', []);
    if (cbs.length > 0) {
        lines.push('\n=== 💰 صندوق‌ها (' + cbs.length + ') ===');
        lines.push('⚠️ در فیلد details.cashbox دقیقاً عنوان صندوق را بنویس.');
        var tc = 0;
        cbs.forEach(function(c) {
            var bal = getCashBoxBalance(c.id);
            tc += bal;
            lines.push('- «' + (c.title || '—') + '» | نوع: ' + (c.type || '—') + (c.unit ? ' | واحد: ' + c.unit : '') + ' | مانده: ' + formatRial(bal) + ' ریال');
        });
        lines.push('💰 جمع صندوق‌ها: ' + formatRial(tc) + ' ریال');
    } else lines.push('\n=== 💰 صندوق‌ها === (خالی)');

    var projects = DB.load('projects', []);
    if (projects.length > 0) {
        lines.push('\n=== 📁 پروژه‌ها (' + projects.length + ') ===');
        lines.push('⚠️ در فیلد details.project نام دقیق پروژه را بنویس.');
        projects.forEach(function(p) { lines.push('- «' + (p.name || '—') + '»'); });
    } else lines.push('\n=== 📁 پروژه‌ها === (خالی)');

    var facilities = DB.load('facilities', []);
    if (facilities.length > 0) {
        lines.push('\n=== 🏦 تسهیلات (' + facilities.length + ') ===');
        facilities.forEach(function(f) {
            var ins = (f.installments || []);
            var paid = ins.filter(function(x) { return x.status === 'paid'; });
            var unpaid = ins.filter(function(x) { return x.status !== 'paid'; });
            var paidAmt = paid.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
            var unpaidAmt = unpaid.reduce(function(s, x) { return s + (Number(x.amount) || 0); }, 0);
            lines.push('- «' + f.name + '» | دسته: ' + categoryName(f.category) + ' | مبلغ اولیه: ' + formatRial(f.initial || 0) + ' | پرداخت: ' + formatRial(paidAmt) + ' | باقی: ' + formatRial(unpaidAmt) + ' (' + unpaid.length + ' قسط)');
        });
    } else lines.push('\n=== 🏦 تسهیلات === (خالی)');

    lines.push('\n=== ⏰ اقساط ۷ روز آینده ===');
    var upcoming = [];
    facilities.forEach(function(f) {
        (f.installments || []).forEach(function(inst) {
            if (inst.status === 'paid' || !inst.date) return;
            var ip = inst.date.split('/').map(Number);
            if (ip.length !== 3) return;
            var dleft = jalaliDiff(todayJ[0], todayJ[1], todayJ[2], ip[0], ip[1], ip[2]);
            if (dleft >= 0 && dleft <= 7) upcoming.push({ f: f, inst: inst, daysLeft: dleft });
        });
    });
    if (upcoming.length === 0) lines.push('- هیچ قسطی در ۷ روز آینده نیست.');
    else {
        upcoming.sort(function(a, b) { return a.daysLeft - b.daysLeft; });
        var upTotal = 0;
        upcoming.forEach(function(u) {
            upTotal += Number(u.inst.amount) || 0;
            lines.push('- ' + u.f.name + ' | ' + u.inst.date + ' | ' + formatRial(u.inst.amount || 0) + ' ریال | ' + (u.daysLeft === 0 ? 'امروز' : u.daysLeft + ' روز دیگر'));
        });
        lines.push('💰 جمع: ' + formatRial(upTotal) + ' ریال');
    }

    var sources = DB.load('cashFlowSources', []);
    if (sources.length > 0) {
        lines.push('\n=== 📥 منابع دریافتنی (' + sources.length + ') ===');
        sources.forEach(function(s) {
            lines.push('- ' + getSourceLabel(s) + ' | تاریخ: ' + (s.expectedDate || '—') + ' | ' + formatRial(s.amount || 0) + ' ریال');
        });
    }

    var estimates = DB.load('dailyEstimates', []);
    if (estimates.length > 0) {
        lines.push('\n=== 📝 برآورد هزینه‌ها (' + estimates.length + ') ===');
        estimates.forEach(function(est) {
            lines.push('- «' + (est.title || est.desc) + '» | بازه: ' + est.from + ' تا ' + est.to + ' | ' + formatRial(est.total || 0) + ' ریال');
        });
    }

    var vouchers = DB.load('vouchers', []);
    if (vouchers.length > 0) {
        var approved = vouchers.filter(function(v) { return v.status === 'approved'; });
        var draft = vouchers.filter(function(v) { return v.status !== 'approved'; });
        lines.push('\n=== 📄 اسناد ===');
        lines.push('کل: ' + vouchers.length + ' | تأیید: ' + approved.length + ' | پیش‌نویس: ' + draft.length);
        var recent = approved.slice().sort(function(a, b) { return compareVals(b.date, a.date); }).slice(0, 10);
        if (recent.length > 0) {
            lines.push('--- ۱۰ سند آخر ---');
            recent.forEach(function(v) {
                lines.push('• #' + v.number + ' | ' + v.date + ' | ' + formatRial(getVoucherAmount(v)) + ' ریال | ' + (v.desc || '—'));
            });
        }
    }

    var pr = getPeriodMonthRange();
    var monthInc = 0, monthExp = 0;
    vouchers.filter(function(v) { return v.status === 'approved' && v.date >= pr.from && v.date <= pr.to; }).forEach(function(v) {
        (v.lines || []).forEach(function(l) {
            if (!l.account) return;
            var rootId = getRootAccountId(l.account, accounts);
            var root = accounts.find(function(a) { return a.id === rootId; });
            if (!root) return;
            var codeRoot = String(root.code || '').charAt(0);
            var d = Number(l.debit) || 0, c = Number(l.credit) || 0;
            if (codeRoot === '4') monthInc += c;
            else if (codeRoot === '5') monthExp += d;
        });
    });
    lines.push('\n=== 📊 خلاصه ماه جاری (' + getJalaliMonthName(pr.month) + ' ' + toFa(pr.year) + ') ===');
    lines.push('- درآمد: ' + formatRial(monthInc) + ' ریال');
    lines.push('- هزینه: ' + formatRial(monthExp) + ' ریال');
    lines.push('- سود/زیان: ' + formatRial(monthInc - monthExp) + ' ریال');

    var notes = DB.load('notes', []);
    if (notes.length > 0) {
        lines.push('\n=== 📔 یادداشت‌ها (' + notes.length + ') ===');
        notes.slice(0, 10).forEach(function(n) {
            var chk = (n.checklist || []).length;
            var done = (n.checklist || []).filter(function(c) { return c.done; }).length;
            lines.push('- ' + (n.date || '—') + ' | ' + (n.title || '—') + (chk > 0 ? ' (' + done + '/' + chk + ')' : '') + (n.archived ? ' 📦' : ''));
        });
    }

    var stdDesc = DB.load('standardDescriptions', []);
    if (stdDesc.length > 0) lines.push('\n=== 💬 شرح‌های استاندارد ===\n' + stdDesc.join(' ، '));

    var cr = LIVE_RATES_CACHE;
    if (cr && cr.ts > 0 && cr.values) {
        lines.push('\n=== 💱 نرخ‌های لحظه‌ای ===');
        for (var ri = 0; ri < RATE_ASSETS.length; ri++) {
            var val = cr.values[RATE_ASSETS[ri].key] || 0;
            if (val > 0) lines.push('- ' + RATE_ASSETS[ri].label + ': ' + formatRial(val) + ' ریال');
        }
    }
    return lines.join('\n');
}

/* ==================== System prompt ==================== */
function aiBuildSystemPrompt() {
    return 'تو «پارسیس یار» هستی، دستیار هوشمند حسابداری و مدیریت مالی فارسی‌زبان.\n\n' +
        '🎯 **مأموریت تو**: کمک دقیق، سریع و بدون خطا به کاربر در:\n' +
        '  • صدور اسناد حسابداری با تمام تفصیلی‌ها\n' +
        '  • تحلیل داده‌های مالی و گزارش‌گیری\n' +
        '  • تعریف اطلاعات پایه (اشخاص، بانک، صندوق، پروژه، تسهیلات)\n' +
        '  • پاسخ به سوالات حسابداری و راهنمایی\n\n' +
        '═══════════════════════════════════════\n' +
        '📌 **قوانین طلایی**\n' +
        '═══════════════════════════════════════\n' +
        '1. **اطلاعات کامل** سیستم در بخش «اطلاعات پایه» انتهای همین پرامپت موجود است. حتماً قبل از پاسخ بخوان.\n' +
        '2. **هرگز** نگو «به سیستم دسترسی ندارم» یا «اطلاعات را ندارم» — همه چیز اینجاست!\n' +
        '3. **تاریخ امروز** بالای context نوشته شده. همه محاسبات تاریخ را از آن مبنا بگیر.\n' +
        '4. **تمام مبالغ به ریال** هستند. اگر کاربر «تومان» گفت، خودکار × ۱۰ کن.\n' +
        '5. **پاسخ‌ها با Markdown فارسی روان**: جدول، بولت، عناوین، اعداد فارسی.\n' +
        '6. **هرگز داده ساختگی نساز**. اگر خالی است، صریح بگو.\n\n' +
        '═══════════════════════════════════════\n' +
        '📝 **صدور سند (create_voucher_draft)**\n' +
        '═══════════════════════════════════════\n' +
        '⚠️ **فقط وقتی** کاربر صریحاً گفت: «سند بزن»، «ثبت کن»، «پرداخت شد»، «واریز شد»، «هزینه شد».\n\n' +
        '**گام‌به‌گام**:\n' +
        '1. **تاریخ**: اگر کاربر تاریخ نگفت، امروز. فرمت YYYY/MM/DD. باید در بازه دوره فعال باشد.\n' +
        '2. **حساب‌ها**: از لیست «فقط این کدها را در account_code استفاده کن» کد **دقیق** بردار.\n' +
        '3. **تفصیلی‌ها (بسیار مهم)**: اگر حساب معین «تفصیلی مرتبط» دارد، در فیلد `details` نام دقیق بنویس:\n' +
        '   • برای person → نام کامل شخص (مثلاً: "علی رضایی")\n' +
        '   • برای bank → نام بانک + شماره حساب (مثلاً: "بانک ملی - 48003")\n' +
        '   • برای cashbox → عنوان صندوق (مثلاً: "صندوق نقد")\n' +
        '   • برای project → نام پروژه\n' +
        '   • برای facility → نام تسهیلات\n' +
        '   • برای company → نام شرکت\n' +
        '4. **توازن**: جمع بدهکار = بستانکار **حتماً**.\n' +
        '5. **شرح هر قلم**: هر ردیف **باید** description داشته باشد.\n\n' +
        '**مثال درست برای «۵۰۰ هزار تومان کرایه تاکسی از صندوق پرداخت شد»**:\n' +
        '```json\n' +
        '{\n' +
        '  "date": "' + todayJalaliStr() + '",\n' +
        '  "desc": "کرایه تاکسی",\n' +
        '  "type": "general",\n' +
        '  "lines": [\n' +
        '    { "account_code": "<کد معین هزینه ایاب و ذهاب>", "debit": 5000000, "credit": 0, "description": "کرایه تاکسی" },\n' +
        '    { "account_code": "<کد معین صندوق>", "debit": 0, "credit": 5000000, "description": "پرداخت از صندوق", "details": { "cashbox": "<نام دقیق صندوق از لیست>" } }\n' +
        '  ]\n' +
        '}\n' +
        '```\n' +
        '⚠️ توجه: ۵۰۰ هزار تومان = ۵,۰۰۰,۰۰۰ ریال.\n\n' +
        '═══════════════════════════════════════\n' +
        '🗺️ **باز کردن صفحه‌ها (navigate_and_run_report)**\n' +
        '═══════════════════════════════════════\n' +
        'وقتی کاربر گفت «گزارش X را باز کن»، «برو به Y»، «داشبورد را نشان بده»:\n' +
        '• page_key را از لیست صفحات قابل اجرا انتخاب کن\n' +
        '• اگر بازه زمانی گفت، from_date و to_date را درج کن\n\n' +
        '═══════════════════════════════════════\n' +
        '👥 **تعریف اطلاعات پایه**\n' +
        '═══════════════════════════════════════\n' +
        'برای تعریف شخص/شرکت/بانک/صندوق/پروژه/دوره/حساب/تسهیلات/یادداشت از ابزارهای create_* استفاده کن.\n\n' +
        '═══════════════════════════════════════\n' +
        '📊 **تحلیل و گزارش‌گیری متنی**\n' +
        '═══════════════════════════════════════\n' +
        'برای سوالاتی مثل «وضعیت نقدینگی چطوره؟»، «چقدر درآمد داشتم؟»:\n' +
        '• از داده‌های context استفاده کن\n' +
        '• جدول خلاصه بساز\n' +
        '• تحلیل روند بده\n' +
        '• پیشنهادهای مالی ارائه بده\n\n' +
        '═══════════════════════════════════════\n' +
        '📷 **تحلیل تصویر**\n' +
        '═══════════════════════════════════════\n' +
        'اگر کاربر تصویر فرستاد: متن، اعداد، جداول، فاکتور یا فیش را دقیق بخوان و تحلیل کن.\n\n' +
        '═══════════════════════════════════════\n\n' + aiBuildContext();
}

/* ==================== Markdown rendering ==================== */
function _aiSplitTableRow(line) {
    var t = String(line).trim();
    if (t.charAt(0) === '|') t = t.slice(1);
    if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
    return t.split('|').map(function(s) { return s.trim(); });
}
function renderAIMarkdown(text) {
    if (!text) return '';
    var raw = String(text);
    var html = esc(raw);
    html = html.replace(/`([^`\n]+)`/g, '<code class="ai-inline-code">$1</code>');
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^#{3}\s+(.+)$/gm, '<h4 class="ai-h">$1</h4>');
    html = html.replace(/^#{2}\s+(.+)$/gm, '<h3 class="ai-h">$1</h3>');
    html = html.replace(/^#{1}\s+(.+)$/gm, '<h2 class="ai-h">$1</h2>');
    var lines = html.split('\n');
    var out = [], i = 0;
    var isSep = /^\s*\|?[\s:*-]+\|[\s:*-|]+\|?\s*$/;
    while (i < lines.length) {
        var ln = lines[i];
        if (ln.indexOf('|') !== -1 && i + 1 < lines.length && isSep.test(lines[i + 1])) {
            var headers = _aiSplitTableRow(ln);
            i += 2;
            var body = [];
            while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim() !== '') {
                body.push(_aiSplitTableRow(lines[i]));
                i++;
            }
            var th = '<div class="ai-table-wrap"><table class="ai-table"><thead><tr>';
            headers.forEach(function(h) { th += '<th>' + h + '</th>'; });
            th += '</tr></thead><tbody>';
            body.forEach(function(r) {
                th += '<tr>';
                for (var c = 0; c < headers.length; c++) th += '<td>' + (r[c] || '') + '</td>';
                th += '</tr>';
            });
            th += '</tbody></table></div>';
            out.push(th);
        } else { out.push(ln); i++; }
    }
    html = out.join('\n');
    html = html.replace(/(?:^|\n)((?:[ \t]*[-*]\s+.+(?:\n|$))+)/g, function(m, block) {
        var items = block.split('\n').filter(function(l) { return l.trim(); }).map(function(l) {
            return '<li>' + l.replace(/^[ \t]*[-*]\s+/, '') + '</li>';
        });
        return '\n<ul class="ai-ul">' + items.join('') + '</ul>\n';
    });
    return html;
}

/* ==================== API Calls ==================== */
async function _aiDoFetch(modelId, userMessage, includeTools, imageData) {
    var sys = aiBuildSystemPrompt();
    var histArr = AI.history.slice();
    for (var hi = histArr.length - 1; hi >= 0; hi--) {
        if (histArr[hi].role === 'user') { histArr.splice(hi, 1); break; }
    }
    histArr = histArr.filter(function(m) { return m.role === 'user' || m.role === 'assistant'; }).slice(-AI.MAX_HISTORY);
    var messages = histArr.map(function(m) { return { role: m.role, content: m.content }; });
    var userContent;
    if (imageData && imageData.dataUrl) {
        userContent = [{ type: 'text', text: userMessage || 'این تصویر را تحلیل کن.' }, { type: 'image_url', image_url: { url: imageData.dataUrl } }];
    } else userContent = userMessage;
    messages.push({ role: 'user', content: userContent });
    var url, headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI.apiKey }, model = modelId;
    if (AI.provider === 'avalai') { url = 'https://api.avalai.ir/v1/chat/completions'; model = modelId || 'gpt-4o-mini'; }
    else if (AI.provider === 'chatanywhere') { url = 'https://api.chatanywhere.tech/v1/chat/completions'; model = modelId || 'deepseek-chat'; }
    else if (AI.provider === 'deepseek') { url = 'https://api.deepseek.com/v1/chat/completions'; model = modelId || 'deepseek-chat'; }
    else if (AI.provider === 'groq') { url = 'https://api.groq.com/openai/v1/chat/completions'; model = modelId || 'openai/gpt-oss-120b'; }
    else throw new Error('سرویس نامعتبر');
    var bodyObj = { model: model, messages: [{ role: 'system', content: sys }].concat(messages), temperature: 0.3, max_tokens: 4000 };
    if (includeTools && !imageData) { bodyObj.tools = AI_TOOLS; bodyObj.tool_choice = 'auto'; }
    var controller = new AbortController();
    var timer = setTimeout(function() { try { controller.abort(); } catch(e){} }, 60000);
    var res;
    try {
        res = await fetch(url, { method: 'POST', headers: headers, signal: controller.signal, body: JSON.stringify(bodyObj) });
    } finally { clearTimeout(timer); }
    if (!res.ok) {
        var t = await res.text();
        var e = new Error(res.status + ': ' + t.substring(0, 300));
        e.status = res.status;
        throw e;
    }
    var data = await res.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) throw new Error('پاسخ نامعتبر');
    var msg = data.choices[0].message;
    if (msg.tool_calls && msg.tool_calls.length > 0) return { type: 'tool_call', calls: msg.tool_calls, content: msg.content || '' };
    return { type: 'text', content: msg.content || '' };
}
async function aiCallOnce(modelId, userMessage, imageData) {
    try {
        return await _aiDoFetch(modelId, userMessage, true, imageData);
    } catch (e) {
        if (e.status === 400 && /tool/i.test(String(e.message || ''))) return await _aiDoFetch(modelId, userMessage, false, imageData);
        throw e;
    }
}
async function aiCallAPI(userMessage, imageData) {
    if (AI.provider !== 'avalai') return await aiCallOnce(AI.model, userMessage, imageData);
    var candidates = [];
    if (AI.model) candidates.push(AI.model);
    if (imageData) {
        VISION_MODEL_IDS.forEach(function(m) { if (candidates.indexOf(m) === -1) candidates.push(m); });
    }
    AVALAI_MODELS.forEach(function(m) { if (candidates.indexOf(m.id) === -1) candidates.push(m.id); });
    if (candidates.indexOf('gpt-4o-mini') === -1) candidates.push('gpt-4o-mini');
    if (!AI.autoFallback) return await aiCallOnce(AI.model, userMessage, imageData);
    var errors = [];
    for (var i = 0; i < candidates.length; i++) {
        var m = candidates[i];
        if (AI.failedModels[m]) continue;
        try {
            var result = await aiCallOnce(m, userMessage, imageData);
            if (i > 0) showToast('⚠️ مدل ' + candidates[0] + ' پاسخ نداد → ' + m, 4000);
            if (AI.model !== m) { AI.model = m; aiSaveSettings(); updateAiModelSelectUI(); }
            return result;
        } catch (e) {
            errors.push(m + ': ' + (e.message || e));
            AI.failedModels[m] = true;
            console.warn('AI model failed:', m, e);
        }
    }
    throw new Error('همه مدل‌ها ناموفق بودند. آخرین خطا: ' + (errors[errors.length - 1] || 'نامشخص'));
}

/* ==================== Fuzzy matching for details ==================== */
function aiNormalizeStr(s) {
    return String(s || '').trim().toLowerCase()
        .replace(/[يى]/g, 'ی').replace(/[كک]/g, 'ک')
        .replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ۀ/g, 'ه')
        .replace(/\u200c/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[.,،؛;:!?؟]/g, '')
        .trim();
}
function aiFindDetailId(linkType, nameHint) {
    if (!linkType || !nameHint) return { id: '', candidates: [] };
    var items = getLinkedItems(linkType);
    if (items.length === 0) return { id: '', candidates: [] };
    var q = aiNormalizeStr(nameHint);
    if (!q) return { id: '', candidates: [] };
    for (var i = 0; i < items.length; i++) {
        var label = aiNormalizeStr(getLinkedItemLabel(linkType, items[i]));
        if (label === q) return { id: items[i].id, candidates: [] };
    }
    var candidates = [];
    for (var j = 0; j < items.length; j++) {
        var l2 = aiNormalizeStr(getLinkedItemLabel(linkType, items[j]));
        if (l2.indexOf(q) !== -1 || q.indexOf(l2) !== -1) candidates.push(items[j]);
    }
    if (candidates.length === 1) return { id: candidates[0].id, candidates: [] };
    if (candidates.length === 0) {
        var qWords = q.split(' ').filter(function(w) { return w.length > 1; });
        var scored = [];
        for (var k = 0; k < items.length; k++) {
            var l3 = aiNormalizeStr(getLinkedItemLabel(linkType, items[k]));
            var score = 0;
            qWords.forEach(function(w) { if (l3.indexOf(w) !== -1) score++; });
            if (score > 0) scored.push({ item: items[k], score: score });
        }
        scored.sort(function(a, b) { return b.score - a.score; });
        if (scored.length === 1) return { id: scored[0].item.id, candidates: [] };
        if (scored.length > 1 && scored[0].score > scored[1].score) return { id: scored[0].item.id, candidates: [] };
        if (scored.length > 1) return { id: '', candidates: scored.slice(0, 5).map(function(s) { return s.item; }) };
    }
    if (items.length === 1) return { id: items[0].id, candidates: [] };
    if (candidates.length > 0) return { id: '', candidates: candidates.slice(0, 5) };
    return { id: '', candidates: items.slice(0, 5) };
}

/* ==================== Tool handlers ==================== */
function aiHandleToolCall(call) {
    if (!call || !call.function) return { error: 'ساختار ابزار نامعتبر' };
    var name = call.function.name;
    var args;
    try { args = JSON.parse(call.function.arguments || '{}'); }
    catch(e) { return { error: 'JSON نامعتبر: ' + (e.message || '') }; }
    switch (name) {
        case 'create_voucher_draft': return aiHandleVoucherDraft(args);
        case 'navigate_and_run_report': return aiHandleNavigateReport(args);
        case 'create_person': return aiHandleCreatePerson(args);
        case 'create_company': return aiHandleCreateCompany(args);
        case 'create_bank_account': return aiHandleCreateBankAccount(args);
        case 'create_cash_box': return aiHandleCreateCashBox(args);
        case 'create_project': return aiHandleCreateProject(args);
        case 'create_fiscal_period': return aiHandleCreateFiscalPeriod(args);
        case 'create_account': return aiHandleCreateAccount(args);
        case 'create_facility': return aiHandleCreateFacility(args);
        case 'create_note': return aiHandleCreateNote(args);
        default: return { error: 'ابزار ناشناخته: ' + name };
    }
}
function aiHandleNavigateReport(args) {
    var key = String(args.page_key || '').trim();
    if (!AI_NAVIGABLE_PAGES[key]) return { error: 'صفحه ناشناخته: ' + key };
    var label = AI_NAVIGABLE_PAGES[key];
    setTimeout(function() {
        goToPage(key);
        if (args.from_date || args.to_date) {
            var map = { 'report-cashflow': ['cf-from','cf-to'], 'report-cashflow-desc': ['cfd-from','cfd-to'] };
            var ids = map[key];
            if (ids) {
                var f = normalizeDigits(args.from_date || ''), t = normalizeDigits(args.to_date || '');
                if (f) document.getElementById(ids[0]).value = f;
                if (t) document.getElementById(ids[1]).value = t;
                if (key === 'report-cashflow') runCashFlowReport();
                else if (key === 'report-cashflow-desc') runCashFlowByDescReport();
            }
        }
        setTimeout(function() { attachDatePickers(); }, 200);
    }, 200);
    return { action: '✅ صفحه «' + label + '» باز و اجرا شد.' };
}
function aiHandleVoucherDraft(args) {
    if (!args.lines || !Array.isArray(args.lines) || args.lines.length < 2) {
        return { error: 'سند حداقل دو قلم دارد. لطفاً ردیف‌های بدهکار و بستانکار را با کد معین و مبلغ دقیق بفرست.' };
    }
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
    var lines = [];
    var problems = [];
    for (var i = 0; i < args.lines.length; i++) {
        var L = args.lines[i] || {};
        var code = String(L.account_code || '').trim();
        if (!code) { problems.push('ردیف ' + (i + 1) + ': کد حساب خالی است'); continue; }
        var acc = leaves.find(function(a) { return String(a.code) === code; });
        if (!acc) acc = leaves.find(function(a) { return aiNormalizeStr(a.name) === aiNormalizeStr(code); });
        if (!acc) acc = leaves.find(function(a) { return aiNormalizeStr(a.name).indexOf(aiNormalizeStr(code)) !== -1; });
        if (!acc) {
            var available = leaves.map(function(a) { return a.code + ' (' + a.name + ')'; }).slice(0, 20).join('، ');
            problems.push('ردیف ' + (i + 1) + ': کد «' + code + '» پیدا نشد. کدهای موجود: ' + available);
            continue;
        }
        var d = Number(L.debit) || 0;
        var c = Number(L.credit) || 0;
        if (d < 0 || c < 0) { problems.push('ردیف ' + (i+1) + ': مبلغ منفی مجاز نیست'); continue; }
        if (d > 0 && c > 0) { problems.push('ردیف ' + (i+1) + ': هم بدهکار و هم بستانکار نمی‌شود'); continue; }
        if (d === 0 && c === 0) { problems.push('ردیف ' + (i+1) + ': مبلغ صفر است'); continue; }
        var resolvedDetails = {};
        var detailsInput = L.details || {};
        if (acc.links && acc.links.length > 0) {
            for (var li = 0; li < acc.links.length; li++) {
                var lt = acc.links[li];
                var items = getLinkedItems(lt);
                if (items.length === 0) continue;
                var hint = detailsInput[lt];
                if (!hint) {
                    var opts = items.map(function(it) { return getLinkedItemLabel(lt, it); }).slice(0, 10).join('، ');
                    problems.push('ردیف ' + (i+1) + ': حساب «' + acc.name + '» نیازمند تفصیلی ' + linkTypeName(lt) + ' است. یکی از این‌ها را در details.' + lt + ' بنویس: ' + opts);
                    continue;
                }
                var matchRes = aiFindDetailId(lt, hint);
                if (matchRes.id) resolvedDetails[lt] = matchRes.id;
                else if (matchRes.candidates.length > 0) {
                    var candNames = matchRes.candidates.map(function(c2) { return getLinkedItemLabel(lt, c2); }).join('، ');
                    problems.push('ردیف ' + (i+1) + ': برای ' + linkTypeName(lt) + ' با «' + hint + '» چند گزینه هست: ' + candNames + '. یکی را دقیق بنویس.');
                } else {
                    var allOpts = items.map(function(it) { return getLinkedItemLabel(lt, it); }).slice(0, 10).join('، ');
                    problems.push('ردیف ' + (i+1) + ': ' + linkTypeName(lt) + ' با «' + hint + '» پیدا نشد. گزینه‌های موجود: ' + allOpts);
                }
            }
        }
        var desc = String(L.description || '').trim() || 'بدون شرح';
        lines.push({ id: uid(), account: acc.id, details: resolvedDetails, debit: d, credit: c, description: desc });
    }
    if (lines.length < 2) problems.push('حداقل دو قلم معتبر با مبلغ لازم است.');
    var td = 0, tc = 0;
    lines.forEach(function(l) { td += l.debit; tc += l.credit; });
    if (Math.abs(td - tc) > 0.5 && lines.length >= 2) {
        problems.push('سند متوازن نیست. بدهکار: ' + formatMoney(td) + ' ریال | بستانکار: ' + formatMoney(tc) + ' ریال | اختلاف: ' + formatMoney(Math.abs(td - tc)) + ' ریال. یکی از ردیف‌ها را اصلاح کن.');
    }
    var date = normalizeDigits(String(args.date || '').trim());
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(date)) date = todayJalaliStr();
    var dv = validateDateInActivePeriod(date);
    if (!dv.ok) problems.push(dv.msg);
    if (problems.length > 0) {
        return { draft: { date: date, desc: String(args.desc || '').trim() || 'سند هوشمند', type: args.type || 'general', lines: lines }, warnings: problems };
    }
    return { draft: { date: date, desc: String(args.desc || '').trim() || 'سند هوشمند', type: args.type || 'general', lines: lines } };
}
function aiHandleCreatePerson(args) {
    if (!args.first) return { error: 'نام اجباری است' };
    var persons = DB.load('persons', []);
    if (persons.some(function(p) {
        return aiNormalizeStr(p.first) === aiNormalizeStr(args.first) && aiNormalizeStr(p.last || '') === aiNormalizeStr(args.last || '');
    })) return { error: 'شخصی با همین نام و فامیل قبلاً ثبت شده' };
    var o = {
        id: uid(),
        first: String(args.first).trim(),
        last: String(args.last || '').trim(),
        father: String(args.father || '').trim(),
        nationalId: normalizeDigits(String(args.nationalId || '').trim()),
        birth: normalizeDigits(String(args.birth || '').trim()),
        mobile: normalizeDigits(String(args.mobile || '').trim()),
        phone: normalizeDigits(String(args.phone || '').trim()),
        email: String(args.email || '').trim(),
        bankTitle: String(args.bankTitle || '').trim(),
        acc: normalizeDigits(String(args.acc || '').trim()),
        iban: String(args.iban || '').trim(),
        card: normalizeDigits(String(args.card || '').trim()),
        address: String(args.address || '').trim()
    };
    persons.push(o);
    DB.save('persons', persons);
    renderPersonsList();
    updateHomeWidgets();
    return { action: '✅ شخص «' + o.first + ' ' + o.last + '» تعریف شد.' };
}
function aiHandleCreateCompany(args) {
    if (!args.name) return { error: 'نام اجباری' };
    var list = DB.load('companies', []);
    if (list.some(function(x) { return aiNormalizeStr(x.name) === aiNormalizeStr(args.name); })) return { error: 'شرکت تکراری' };
    var o = {
        id: uid(),
        name: String(args.name).trim(),
        phone: normalizeDigits(String(args.phone || '').trim()),
        email: String(args.email || '').trim(),
        address: String(args.address || '').trim()
    };
    list.push(o);
    DB.save('companies', list);
    renderCompaniesList();
    return { action: '✅ شرکت «' + o.name + '» تعریف شد.' };
}
function aiHandleCreateBankAccount(args) {
    if (!args.bank) return { error: 'نام بانک اجباری' };
    var list = DB.load('bankAccounts', []);
    var accNo = normalizeDigits(String(args.account || '').trim());
    if (accNo && list.some(function(x) { return (x.account || '').trim() === accNo; })) return { error: 'حساب تکراری' };
    var o = {
        id: uid(),
        bank: String(args.bank).trim(),
        type: String(args.type || '').trim(),
        branchCode: normalizeDigits(String(args.branchCode || '').trim()),
        branchName: String(args.branchName || '').trim(),
        account: accNo,
        iban: String(args.iban || '').trim(),
        card: normalizeDigits(String(args.card || '').trim()),
        order: args.order != null ? Number(args.order) : null,
        minBalance: Number(args.minBalance) || 0
    };
    list.push(o);
    DB.save('bankAccounts', list);
    renderBankAccountsList();
    updateHomeWidgets();
    return { action: '✅ حساب «' + o.bank + (o.account ? ' - ' + o.account : '') + '» تعریف شد.' };
}
function aiHandleCreateCashBox(args) {
    if (!args.title) return { error: 'عنوان اجباری' };
    var list = DB.load('cashBoxes', []);
    if (list.some(function(x) { return aiNormalizeStr(x.title) === aiNormalizeStr(args.title); })) return { error: 'صندوق تکراری' };
    var o = {
        id: uid(),
        title: String(args.title).trim(),
        type: String(args.type || 'نقد').trim(),
        unit: String(args.unit || '').trim(),
        order: args.order != null ? Number(args.order) : null
    };
    list.push(o);
    DB.save('cashBoxes', list);
    renderCashBoxesList();
    updateHomeWidgets();
    return { action: '✅ صندوق «' + o.title + '» تعریف شد.' };
}
function aiHandleCreateProject(args) {
    if (!args.name) return { error: 'نام اجباری' };
    var list = DB.load('projects', []);
    if (list.some(function(x) { return aiNormalizeStr(x.name) === aiNormalizeStr(args.name); })) return { error: 'پروژه تکراری' };
    var o = { id: uid(), name: String(args.name).trim() };
    list.push(o);
    DB.save('projects', list);
    renderProjectsList();
    return { action: '✅ پروژه «' + o.name + '» تعریف شد.' };
}
function aiHandleCreateFiscalPeriod(args) {
    if (!args.title || !args.from || !args.to) return { error: 'عنوان، از و تا اجباری' };
    var list = DB.load('fiscalPeriods', []);
    var from = normalizeDigits(String(args.from).trim());
    var to = normalizeDigits(String(args.to).trim());
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(from) || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(to)) {
        return { error: 'فرمت تاریخ نامعتبر (باید YYYY/MM/DD باشد)' };
    }
    if (from > to) return { error: 'شروع باید قبل از پایان' };
    var nid = uid();
    list.push({ id: nid, title: String(args.title).trim(), from: from, to: to });
    DB.save('fiscalPeriods', list);
    var activated = false;
    if (args.activate || !state.activePeriodId) {
        state.activePeriodId = nid;
        saveState('activePeriodId');
        activated = true;
    }
    renderFiscalList();
    updateTopbarPeriod();
    return { action: '✅ دوره «' + args.title + '» از ' + from + ' تا ' + to + (activated ? ' (فعال)' : '') };
}
function aiHandleCreateAccount(args) {
    if (!args.code || !args.name) return { error: 'کد و عنوان اجباری' };
    var accounts = DB.load('accounts', []);
    var code = normalizeDigits(String(args.code).trim());
    if (accounts.some(function(a) { return a.code === code; })) return { error: 'کد تکراری' };
    var parentId = '';
    if (args.parent_code) {
        var par = accounts.find(function(a) { return a.code === normalizeDigits(String(args.parent_code).trim()); });
        if (!par) return { error: 'حساب والد یافت نشد' };
        parentId = par.id;
    }
    var level = 1;
    if (parentId) {
        var cur = accounts.find(function(a) { return a.id === parentId; });
        while (cur && cur.parent) {
            level++;
            cur = accounts.find(function(a) { return a.id === cur.parent; });
        }
        level++;
    }
    if (level > 3) return { error: 'حداکثر سطح ۳' };
    var links = Array.isArray(args.links) ? args.links.filter(function(x) {
        return ['person','company','bank','cashbox','project','facility'].indexOf(x) !== -1;
    }) : [];
    if (level !== 3) links = [];
    var o = {
        id: uid(),
        code: code,
        name: String(args.name).trim(),
        parent: parentId,
        level: level,
        cat: args.cat || 'permanent',
        nature: args.nature || 'debit',
        active: true,
        links: links,
        cfEffect: (level === 3) && !!args.cfEffect
    };
    accounts.push(o);
    DB.save('accounts', accounts);
    renderChartTree('chart-tree', true);
    refreshTemplateSelect();
    return { action: '✅ حساب «' + o.code + ' - ' + o.name + '» سطح ' + level + ' تعریف شد.' };
}
function aiHandleCreateFacility(args) {
    if (!args.name) return { error: 'نام اجباری' };
    var list = DB.load('facilities', []);
    if (list.some(function(x) { return aiNormalizeStr(x.name) === aiNormalizeStr(args.name); })) return { error: 'تکراری' };
    var bankId = '';
    if (args.bank_account) {
        var res = aiFindDetailId('bank', args.bank_account);
        if (res.id) bankId = res.id;
    }
    var o = {
        id: uid(),
        name: String(args.name).trim(),
        category: args.category || 'facility',
        bankId: bankId,
        date: normalizeDigits(String(args.date || '').trim()),
        initial: Number(args.initial) || 0,
        paid: 0,
        installments: [],
        status: 'active'
    };
    list.push(o);
    DB.save('facilities', list);
    renderFacilitiesList();
    updateHomeWidgets();
    return { action: '✅ تسهیلات «' + o.name + '» تعریف شد.' };
}
function aiHandleCreateNote(args) {
    if (!args.title) return { error: 'عنوان اجباری' };
    var list = DB.load('notes', []);
    var cl = [];
    if (Array.isArray(args.checklist)) {
        cl = args.checklist.filter(function(t) { return t && String(t).trim(); }).map(function(t) {
            return { id: uid(), text: String(t).trim(), done: false };
        });
    }
    var o = {
        id: uid(),
        title: String(args.title).trim(),
        date: normalizeDigits(String(args.date || todayJalaliStr()).trim()),
        content: String(args.content || ''),
        checklist: cl,
        imageRefs: [],
        archived: false,
        savedAt: Date.now()
    };
    list.push(o);
    DB.save('notes', list);
    renderNotesList();
    return { action: '✅ یادداشت «' + o.title + '» ایجاد شد.' };
}
function aiLoadDraftIntoForm(draft) {
    if (!draft || !draft.lines || draft.lines.length === 0) { alert('پیش‌نویس خالی است.'); return; }
    document.getElementById('v-id').value = '';
    document.getElementById('v-number').value = getNextVoucherNumberForPeriod(state.activePeriodId || '');
    document.getElementById('v-date').value = draft.date || todayJalaliStr();
    document.getElementById('v-type').value = draft.type || 'general';
    document.getElementById('v-desc').value = draft.desc || '';
    currentVoucherStatus = 'draft';
    voucherLines = JSON.parse(JSON.stringify(draft.lines));
    renderVoucherLines();
    goToPage('voucher-new');
    aiClose();
    showToast('🤖 پیش‌نویس سند آماده شد — بازبینی و ذخیره کن');
}
function updateAiModelSelectUI() {
    var status = document.getElementById('ai-model-status');
    if (!status) return;
    var failed = Object.keys(AI.failedModels);
    var txt = 'مدل فعلی: ' + (AI.model || '—');
    if (failed.length > 0) txt += ' | ناموفق: ' + failed.join(', ');
    status.textContent = txt;
}

/* ==================== AI Render ==================== */
function aiRender() {
    var box = document.getElementById('ai-messages');
    if (!box) return;
    if (!AI.apiKey) {
        box.innerHTML = '<div class="ai-setup"><h3>🤖 به پارسیس یار خوش آمدید</h3>' +
            '<p>کلید API را از تنظیمات (⚙) وارد کنید.<br>سرویس AvalAI ایرانی است.<br><a href="https://avalai.ir" target="_blank">avalai.ir</a></p>' +
            '<p style="margin-top:14px;font-size:0.82rem;color:#667eea">🎤 می‌توانی با میکروفون صحبت کنی<br>📷 می‌توانی عکس فاکتور/فیش/فرم بفرستی<br>🔊 پاسخ‌ها به صورت صوتی هم پخش می‌شوند</p>' +
            '<button class="btn-primary" onclick="document.getElementById(\'ai-settings-btn\').click()">⚙ تنظیمات</button></div>';
        return;
    }
    if (AI.history.length === 0) {
        box.innerHTML = '<div class="ai-msg system">👋 سلام! من پارسیس یار هستم.<br>می‌توانم:<br>• 📝 سند با تفصیلی‌های دقیق ثبت کنم<br>• 📊 گزارش‌های متنوع بسازم و تحلیل کنم<br>• 👥 اطلاعات پایه تعریف کنم<br>• 🎤 به صحبتت گوش بدم<br>• 📷 عکس فاکتور/فیش را تحلیل کنم<br>• 🔊 پاسخ‌ها را با صدای پارسی بخونم</div>';
        return;
    }
    var html = '';
    AI.history.forEach(function(m, mi) {
        var cls = m.role === 'user' ? 'user' : (m.role === 'error' ? 'error' : 'assistant');
        var content = (m.role === 'assistant') ? renderAIMarkdown(m.content || '') : esc(m.content);
        if (m.role === 'user' && m.image && m.image.dataUrl) content += '<img class="ai-msg-image" src="' + m.image.dataUrl + '" alt="">';
        html += '<div class="ai-msg ' + cls + '">' + content;
        if (m.drafts && m.drafts.length > 0) {
            m.drafts.forEach(function(d, di) {
                var accounts = DB.load('accounts', []);
                var td = 0, tc = 0;
                d.lines.forEach(function(l) { td += l.debit; tc += l.credit; });
                var rows = '';
                d.lines.forEach(function(l, li) {
                    var accLabel = getAccountLabel(l.account, accounts);
                    var detStr = '';
                    if (l.details) Object.keys(l.details).forEach(function(lt) {
                        if (l.details[lt]) {
                            if (detStr) detStr += ' ، ';
                            detStr += linkTypeName(lt) + ': ' + getDetailLabel(lt, l.details[lt]);
                        }
                    });
                    rows += '<tr><td>' + toFa(li + 1) + '</td><td>' + esc(accLabel) + (detStr ? '<div style="font-size:0.7rem;color:#666">' + esc(detStr) + '</div>' : '') + '</td><td>' + esc(l.description || '') + '</td>' +
                        '<td class="dr" style="text-align:center">' + (l.debit ? formatMoney(l.debit) : '—') + '</td>' +
                        '<td class="cr" style="text-align:center">' + (l.credit ? formatMoney(l.credit) : '—') + '</td></tr>';
                });
                html += '<div class="ai-draft-card">' +
                    '<div class="ai-draft-head">📝 پیش‌نویس سند آماده شد</div>' +
                    '<div class="ai-draft-meta">تاریخ: <b dir="ltr">' + toFa(esc(d.date)) + '</b> | نوع: <b>' + voucherTypeName(d.type) + '</b> | شرح: <b>' + esc(d.desc) + '</b></div>' +
                    '<table class="ai-draft-table"><thead><tr><th>#</th><th>حساب</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th></tr></thead><tbody>' + rows + '</tbody>' +
                    '<tfoot><tr><td colspan="3">جمع</td><td>' + formatMoney(td) + '</td><td>' + formatMoney(tc) + '</td></tr></tfoot></table>' +
                    '<button class="ai-draft-load" data-msg-idx="' + mi + '" data-draft-idx="' + di + '">📥 بارگذاری در فرم سند</button>' +
                    '</div>';
            });
        }
        if (m.actions && m.actions.length > 0) {
            m.actions.forEach(function(a) { html += '<div class="ai-action-card">' + esc(a) + '</div>'; });
        }
        if (m.errors && m.errors.length > 0) {
            html += '<div class="ai-draft-errors"><strong>⚠️ نتوانستم انجام دهم:</strong>' + m.errors.map(esc).join('<br>') + '</div>';
        }
        if (m.warnings && m.warnings.length > 0) {
            html += '<div class="ai-draft-errors"><strong>⚠️ هشدار (قابل بارگذاری):</strong>' + m.warnings.map(esc).join('<br>') + '</div>';
        }
        html += '</div>';
    });
    if (AI.isThinking) html += '<div class="ai-msg thinking">در حال فکر کردن</div>';
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
    box.querySelectorAll('.ai-draft-load').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var mi = Number(this.getAttribute('data-msg-idx'));
            var di = Number(this.getAttribute('data-draft-idx'));
            var msg = AI.history[mi];
            if (!msg || !msg.drafts || !msg.drafts[di]) { alert('پیش‌نویس یافت نشد.'); return; }
            aiLoadDraftIntoForm(msg.drafts[di]);
        });
    });
}
function aiOpen() {
    document.getElementById('ai-modal').classList.add('show');
    document.getElementById('ai-overlay').classList.add('show');
    aiRender();
}
function aiClose() {
    document.getElementById('ai-modal').classList.remove('show');
    document.getElementById('ai-overlay').classList.remove('show');
    if (AI_VOICE_ACTIVE) aiStopVoice();
    aiStopSpeaking();
}
async function aiSend() {
    if (AI.isThinking) return;
    var inp = document.getElementById('ai-input');
    var text = (inp.value || '').trim();
    var img = AI_PENDING_IMAGE;
    if (!text && !img) return;
    if (!AI.apiKey) { alert('کلید API را وارد کنید.'); return; }
    if (AI_VOICE_ACTIVE) aiStopVoice();
    inp.value = '';
    AI_PENDING_IMAGE = null;
    aiRenderImagePreview();
    var historyEntry = { role: 'user', content: text || '📷 [تحلیل تصویر]' };
    if (img) historyEntry.image = { name: img.name, dataUrl: img.dataUrl };
    AI.history.push(historyEntry);
    AI.isThinking = true;
    aiRender();
    var btn = document.getElementById('ai-send-btn');
    if (btn) btn.disabled = true;
    try {
        var result = await aiCallAPI(text, img);
        if (result && result.type === 'tool_call') {
            var drafts = [], actions = [], errors = [], warnings = [];
            for (var i = 0; i < result.calls.length; i++) {
                var r = aiHandleToolCall(result.calls[i]);
                if (!r) continue;
                if (r.draft) drafts.push(r.draft);
                else if (r.action) actions.push(r.action);
                else if (r.error) errors.push(r.error);
                if (r.warnings) warnings = warnings.concat(r.warnings);
            }
            var msgContent = result.content || '';
            if (!msgContent) {
                if (drafts.length > 0) msgContent = '✅ پیش‌نویس سند آماده شد. برای بازبینی روی دکمه «بارگذاری در فرم سند» بزن.';
                else if (actions.length > 0) msgContent = '✅ عملیات با موفقیت انجام شد.';
                else if (errors.length > 0) msgContent = '⚠️ نتوانستم کامل انجام دهم. لطفاً متن خطا را ببین و اصلاح کن.';
                else msgContent = '⚠️ نتوانستم انجام دهم.';
            }
            var msg = { role: 'assistant', content: msgContent };
            if (drafts.length > 0) msg.drafts = drafts;
            if (actions.length > 0) msg.actions = actions;
            if (errors.length > 0) msg.errors = errors;
            if (warnings.length > 0) msg.warnings = warnings;
            AI.history.push(msg);
            aiAutoSpeakIfNeeded(msg);
        } else {
            var txtMsg = { role: 'assistant', content: (result && result.content) || '' };
            AI.history.push(txtMsg);
            aiAutoSpeakIfNeeded(txtMsg);
        }
    } catch (e) {
        AI.history.push({ role: 'error', content: '⚠️ ' + (e.message || 'خطا') });
    } finally {
        AI.isThinking = false;
        if (btn) btn.disabled = false;
        aiSaveHistory();
        aiRender();
    }
}
function aiOpenSettings() {
    document.getElementById('ai-provider-select').value = AI.provider;
    document.getElementById('ai-apikey-input').value = AI.apiKey;
    document.getElementById('ai-model-input').value = AI.model || '';
    document.getElementById('ai-auto-fallback').checked = !!AI.autoFallback;
    var ttsAutoS = document.getElementById('ai-auto-speak');
    if (ttsAutoS) ttsAutoS.checked = !!AI_TTS.autoSpeak;
    var ttsRateS = document.getElementById('ai-speak-rate');
    if (ttsRateS) ttsRateS.value = AI_TTS.rate;
    var sel = document.getElementById('ai-model-select');
    sel.innerHTML = '<option value="__auto__">🤖 خودکار (پیشنهاد: gpt-4o-mini)</option>';
    AVALAI_MODELS.forEach(function(m) {
        var o = document.createElement('option');
        o.value = m.id;
        o.textContent = m.label;
        if (AI.model === m.id) o.selected = true;
        sel.appendChild(o);
    });
    if (!AVALAI_MODELS.some(function(m) { return m.id === AI.model; })) sel.value = '__auto__';
    updateAiModelSelectUI();
    document.getElementById('ai-settings-modal').classList.add('show');
    document.getElementById('ai-settings-overlay').classList.add('show');
}
function aiCloseSettings() {
    document.getElementById('ai-settings-modal').classList.remove('show');
    document.getElementById('ai-settings-overlay').classList.remove('show');
}

/* ==================== Draggable FAB ==================== */
function initDraggableFab() {
    var fab = document.getElementById('ai-fab');
    if (!fab) return;
    var pos = state.aiFabPos || { left: 22, bottom: 22 };
    fab.style.left = pos.left + 'px';
    fab.style.bottom = pos.bottom + 'px';
    fab.style.right = 'auto';
    var isDragging = false, startX = 0, startY = 0, startL = 0, startB = 0, moved = false;
    function getPoint(e) {
        if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    }
    function onDown(e) {
        isDragging = true;
        moved = false;
        var p = getPoint(e);
        startX = p.x; startY = p.y;
        startL = fab.offsetLeft;
        startB = window.innerHeight - fab.offsetTop - fab.offsetHeight;
        fab.classList.add('dragging');
    }
    function onMove(e) {
        if (!isDragging) return;
        var p = getPoint(e);
        var dx = p.x - startX, dy = p.y - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        var newL = startL + dx;
        var newB = startB - dy;
        newL = Math.max(4, Math.min(window.innerWidth - fab.offsetWidth - 4, newL));
        newB = Math.max(4, Math.min(window.innerHeight - fab.offsetHeight - 4, newB));
        fab.style.left = newL + 'px';
        fab.style.bottom = newB + 'px';
        if (e.cancelable) e.preventDefault();
    }
    function onUp(e) {
        if (!isDragging) return;
        isDragging = false;
        fab.classList.remove('dragging');
        if (moved) {
            state.aiFabPos = { left: fab.offsetLeft, bottom: window.innerHeight - fab.offsetTop - fab.offsetHeight };
            DB.save('aiFabPos', state.aiFabPos);
        } else {
            aiOpen();
        }
    }
    fab.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    fab.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
}

/* ==================== AI Init ==================== */
function aiInit() {
    initDraggableFab();
    document.getElementById('ai-close-btn').addEventListener('click', aiClose);
    document.getElementById('ai-overlay').addEventListener('click', aiClose);
    document.getElementById('ai-settings-btn').addEventListener('click', function(e) { e.stopPropagation(); aiOpenSettings(); });
    document.getElementById('ai-settings-close').addEventListener('click', aiCloseSettings);
    document.getElementById('ai-settings-cancel').addEventListener('click', aiCloseSettings);
    document.getElementById('ai-settings-overlay').addEventListener('click', aiCloseSettings);
    document.getElementById('ai-settings-save').addEventListener('click', function() {
        AI.provider = document.getElementById('ai-provider-select').value;
        AI.apiKey = document.getElementById('ai-apikey-input').value.trim();
        var selVal = document.getElementById('ai-model-select').value;
        var freeModel = document.getElementById('ai-model-input').value.trim();
        if (freeModel) AI.model = freeModel;
        else if (selVal && selVal !== '__auto__') AI.model = selVal;
        else AI.model = 'gpt-4o-mini';
        AI.autoFallback = document.getElementById('ai-auto-fallback').checked;
        AI.failedModels = {};
        aiSaveSettings();
        aiCloseSettings();
        aiRender();
        updateAiModelSelectUI();
        showToast('✅ ذخیره شد. مدل: ' + AI.model);
    });
    document.getElementById('ai-model-select').addEventListener('change', function() {
        var v = this.value;
        if (v === '__auto__') document.getElementById('ai-model-input').value = '';
        else document.getElementById('ai-model-input').value = v;
    });
    document.getElementById('ai-clear-btn').addEventListener('click', function() {
        if (!confirm('پاک شود؟')) return;
        AI.history = [];
        aiSaveHistory();
        aiRender();
    });
    document.getElementById('ai-send-btn').addEventListener('click', aiSend);
    document.getElementById('ai-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); }
    });
    document.getElementById('ai-mic-btn').addEventListener('click', aiToggleVoice);
    document.getElementById('ai-img-btn').addEventListener('click', function() { document.getElementById('ai-image-file').click(); });
    document.getElementById('ai-image-file').addEventListener('change', function() {
        if (this.files && this.files[0]) aiAttachImage(this.files[0]);
        this.value = '';
    });
    document.getElementById('ai-input').addEventListener('paste', function(e) {
        var items = (e.clipboardData || {}).items || [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                aiAttachImage(items[i].getAsFile());
                return;
            }
        }
    });
    document.querySelectorAll('.ai-suggestion').forEach(function(b) {
        b.addEventListener('click', function() {
            document.getElementById('ai-input').value = this.getAttribute('data-q');
            aiSend();
        });
    });
    var ttsBtn = document.getElementById('ai-tts-btn');
    if (ttsBtn) ttsBtn.addEventListener('click', function(e) { e.stopPropagation(); aiToggleSpeak(); });
    var ttsAuto = document.getElementById('ai-auto-speak');
    if (ttsAuto) {
        ttsAuto.checked = !!AI_TTS.autoSpeak;
        ttsAuto.addEventListener('change', function() {
            AI_TTS.autoSpeak = this.checked;
            aiSaveTTS();
            showToast(this.checked ? '🔊 خواندن خودکار فعال شد' : '🔇 غیرفعال شد');
        });
    }
    var ttsRate = document.getElementById('ai-speak-rate');
    if (ttsRate) {
        ttsRate.value = AI_TTS.rate;
        ttsRate.addEventListener('input', function() {
            AI_TTS.rate = Number(this.value) || 1;
            aiSaveTTS();
        });
    }
    if (window.speechSynthesis) AI_TTS.voice = aiPickPersianVoice();
}

/* ==================== AvalAI Credit ==================== */
var AVALAI_CREDIT_CACHE = DB.load('avalaiCreditCache', { data: null, ts: 0 });
async function fetchAvalaiCredit() {
    var box = document.getElementById('avalai-credit-result');
    if (!box) return;
    if (!AI.apiKey) { box.innerHTML = '⚠️ کلید API ذخیره نشده.'; return; }
    box.innerHTML = '⏳ در حال دریافت...';
    try {
        var res = await fetch('https://api.avalai.ir/user/v1/credit', {
            headers: { 'Authorization': 'Bearer ' + AI.apiKey }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var d = await res.json();
        AVALAI_CREDIT_CACHE = { data: d, ts: Date.now() };
        DB.save('avalaiCreditCache', AVALAI_CREDIT_CACHE);
        renderAvalaiCredit(d);
        showToast('✅ اعتبار به‌روز شد.');
    } catch(e) {
        if (AVALAI_CREDIT_CACHE.data) renderAvalaiCredit(AVALAI_CREDIT_CACHE.data);
        else box.innerHTML = '❌ ' + e.message;
    }
}
function renderAvalaiCredit(d) {
    var box = document.getElementById('avalai-credit-result');
    if (!box) return;
    var irt = Number(d.remaining_irt||0), unit = Number(d.remaining_unit||0);
    var total = Number(d.total_unit||0), rate = Number(d.exchange_rate||0), lim = Number(d.limit||0);
    var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    h += '<div class="kpi-card"><div class="kpi-lbl">💰 اعتبار تومانی</div><div class="kpi-val positive">' + formatMoney(irt) + ' تومان</div></div>';
    h += '<div class="kpi-card"><div class="kpi-lbl">🔢 اعتبار واحدی</div><div class="kpi-val">' + toFa(unit.toFixed(4)) + '</div></div>';
    h += '<div class="kpi-card"><div class="kpi-lbl">🏦 مجموع کیف پول</div><div class="kpi-val">' + toFa(total.toFixed(4)) + '</div></div>';
    h += '<div class="kpi-card"><div class="kpi-lbl">📈 نرخ تبدیل</div><div class="kpi-val">' + formatMoney(rate) + '</div></div>';
    h += '<div class="kpi-card" style="grid-column:1/-1"><div class="kpi-lbl">🎯 سقف اعتبار</div><div class="kpi-val">' + (lim > 0 ? formatMoney(lim*rate) + ' تومان' : 'بدون سقف') + '</div></div>';
    h += '</div>';
    box.innerHTML = h;
}
function initAvalaiCreditRefresh() {
    var btn = document.getElementById('avalai-credit-refresh');
    if (btn) btn.addEventListener('click', function(e) { e.stopPropagation(); fetchAvalaiCredit(); });
    if (AVALAI_CREDIT_CACHE.data) renderAvalaiCredit(AVALAI_CREDIT_CACHE.data);
}
