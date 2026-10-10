/* =====================================================================
   پارسیس v27 — 07-notes,images,checklist,share,view.js
   دفترچه یادداشت: چک‌لیست، تصاویر (IndexedDB)، اشتراک‌گذاری، نمایش
   ===================================================================== */
'use strict';

var noteChecklist = [];
var noteImageRefs = [];

/* ==================== IndexedDB برای فایل‌های تصویر ==================== */
var _noteImageDB = {
    _db: null,
    open: function() {
        if (this._db) return Promise.resolve(this._db);
        var self = this;
        return new Promise(function(resolve, reject) {
            if (!window.indexedDB) { reject(new Error('IndexedDB نیست')); return; }
            var req = indexedDB.open('parsisNoteImages', 1);
            req.onupgradeneeded = function(e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'id' });
            };
            req.onsuccess = function(e) { self._db = e.target.result; resolve(self._db); };
            req.onerror = function(e) { reject(e.target.error); };
        });
    },
    put: function(id, handle) {
        return this.open().then(function(db) {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('handles', 'readwrite');
                tx.objectStore('handles').put({ id: id, handle: handle, savedAt: Date.now() });
                tx.oncomplete = function() { resolve(id); };
                tx.onerror = function(e) { reject(e.target.error); };
            });
        });
    },
    get: function(id) {
        return this.open().then(function(db) {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('handles', 'readonly');
                var req = tx.objectStore('handles').get(id);
                req.onsuccess = function() { resolve(req.result); };
                req.onerror = function(e) { reject(e.target.error); };
            });
        });
    },
    del: function(id) {
        return this.open().then(function(db) {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction('handles', 'readwrite');
                tx.objectStore('handles').delete(id);
                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) { reject(e.target.error); };
            });
        });
    }
};
var _noteImageUrlCache = {};

function pickNoteImagesFS() {
    if (!window.showOpenFilePicker) return Promise.resolve(null);
    return window.showOpenFilePicker({
        multiple: true,
        types: [{ description: 'تصاویر', accept: { 'image/*': ['.png','.jpg','.jpeg','.gif','.webp','.bmp'] } }]
    }).then(function(handles) { return handles; })
    .catch(function(e) { if (e.name !== 'AbortError') console.warn(e); return null; });
}
function loadNoteImageRef(ref) {
    if (!ref || !ref.id) return Promise.resolve(null);
    if (_noteImageUrlCache[ref.id]) return Promise.resolve(_noteImageUrlCache[ref.id]);
    return _noteImageDB.get(ref.id).then(function(rec) {
        if (!rec || !rec.handle) return null;
        return rec.handle.getFile().then(function(file) {
            var url = URL.createObjectURL(file);
            _noteImageUrlCache[ref.id] = url;
            return url;
        });
    }).catch(function() { return null; });
}
async function addNoteImageHandles(handles) {
    if (!handles || !handles.length) return;
    for (var i = 0; i < handles.length; i++) {
        try {
            var h = handles[i];
            var file = await h.getFile();
            if (!file.type.startsWith('image/')) continue;
            var id = 'img-' + uid();
            await _noteImageDB.put(id, h);
            noteImageRefs.push({ id: id, name: file.name, size: file.size, type: file.type });
        } catch(e) { console.warn('image add failed', e); }
    }
    renderNoteImages();
}
async function addNoteImageFromFile(file) {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) {
        if (!confirm('حجم تصویر بیشتر از ۲ مگابایت است. ادامه؟')) return;
    }
    var id = 'img-' + uid();
    var rec = { id: id, blob: file, name: file.name, size: file.size, type: file.type, isBlob: true };
    await _noteImageDB.open().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').put(rec);
            tx.oncomplete = resolve;
            tx.onerror = function(e) { reject(e.target.error); };
        });
    });
    noteImageRefs.push({ id: id, name: file.name, size: file.size, type: file.type, isBlob: true });
}
async function loadNoteImageRefBlob(ref) {
    if (_noteImageUrlCache[ref.id]) return _noteImageUrlCache[ref.id];
    var rec = await _noteImageDB.get(ref.id);
    if (!rec) return null;
    if (rec.blob) {
        var u = URL.createObjectURL(rec.blob);
        _noteImageUrlCache[ref.id] = u;
        return u;
    }
    return null;
}
async function handleNoteImagesFS() {
    var handles = await pickNoteImagesFS();
    if (handles) {
        await addNoteImageHandles(handles);
    } else {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.multiple = true;
        inp.onchange = async function() {
            if (inp.files && inp.files.length) {
                for (var i = 0; i < inp.files.length; i++) await addNoteImageFromFile(inp.files[i]);
                renderNoteImages();
            }
        };
        inp.click();
    }
}
function handleNoteImages(files) {
    if (!files || files.length === 0) return;
    for (var i = 0; i < files.length; i++) {
        addNoteImageFromFile(files[i]).then(renderNoteImages);
    }
}

/* ==================== Checklist rendering ==================== */
function renderNoteChecklist() {
    var box = document.getElementById('nt-checklist');
    if (!box) return;
    box.innerHTML = '';
    if (noteChecklist.length === 0) noteChecklist.push({ id: uid(), text: '', done: false });
    for (var i = 0; i < noteChecklist.length; i++) {
        (function(idx) {
            var it = noteChecklist[idx];
            var row = document.createElement('div');
            row.className = 'cl-item-row';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = !!it.done;
            cb.addEventListener('change', function() { it.done = this.checked; });
            var ta = document.createElement('textarea');
            ta.rows = 1;
            ta.placeholder = 'آیتم ' + toFa(idx + 1);
            ta.value = it.text || '';
            function autoResize() {
                ta.style.height = 'auto';
                ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
            }
            ta.addEventListener('input', function() { it.text = this.value; autoResize(); });
            ta.addEventListener('focus', autoResize);
            setTimeout(autoResize, 0);
            var upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'cl-move-btn';
            upBtn.textContent = '↑';
            upBtn.title = 'انتقال به بالا';
            if (idx === 0) upBtn.disabled = true;
            upBtn.addEventListener('click', function() {
                var tmp = noteChecklist[idx];
                noteChecklist[idx] = noteChecklist[idx - 1];
                noteChecklist[idx - 1] = tmp;
                renderNoteChecklist();
            });
            var downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'cl-move-btn';
            downBtn.textContent = '↓';
            downBtn.title = 'انتقال به پایین';
            if (idx === noteChecklist.length - 1) downBtn.disabled = true;
            downBtn.addEventListener('click', function() {
                var tmp = noteChecklist[idx];
                noteChecklist[idx] = noteChecklist[idx + 1];
                noteChecklist[idx + 1] = tmp;
                renderNoteChecklist();
            });
            var del = document.createElement('button');
            del.className = 'row-btn del';
            del.textContent = '×';
            del.addEventListener('click', function() {
                noteChecklist.splice(idx, 1);
                renderNoteChecklist();
            });
            row.appendChild(cb); row.appendChild(ta); row.appendChild(upBtn); row.appendChild(downBtn); row.appendChild(del);
            box.appendChild(row);
        })(i);
    }
}

/* ==================== Note images preview ==================== */
function renderNoteImages() {
    var box = document.getElementById('nt-images-preview');
    if (!box) return;
    box.innerHTML = '';
    if (noteImageRefs.length === 0) {
        box.innerHTML = '<div class="muted" style="font-size:0.75rem">تصویری اضافه نشده.</div>';
        return;
    }
    for (var i = 0; i < noteImageRefs.length; i++) {
        (function(idx) {
            var ref = noteImageRefs[idx];
            var wrap = document.createElement('div');
            wrap.className = 'note-img-thumb';
            var loading = document.createElement('div');
            loading.className = 'note-img-loading';
            loading.textContent = '⏳';
            wrap.appendChild(loading);
            var rm = document.createElement('button');
            rm.className = 'rm-img';
            rm.textContent = '×';
            rm.title = 'حذف';
            rm.addEventListener('click', function(e) {
                e.stopPropagation();
                _noteImageDB.del(ref.id).catch(function(){});
                delete _noteImageUrlCache[ref.id];
                noteImageRefs.splice(idx, 1);
                renderNoteImages();
            });
            wrap.appendChild(rm);
            box.appendChild(wrap);
            var loader = ref.isBlob ? loadNoteImageRefBlob(ref) : loadNoteImageRef(ref);
            loader.then(function(url) {
                loading.remove();
                if (url) {
                    var img = document.createElement('img');
                    img.src = url;
                    img.alt = ref.name || '';
                    img.title = ref.name || '';
                    img.addEventListener('click', function() { openImageView(url); });
                    wrap.insertBefore(img, rm);
                } else {
                    var ph = document.createElement('div');
                    ph.className = 'note-img-missing';
                    ph.textContent = '❌';
                    ph.title = 'فایل «' + (ref.name || '') + '» یافت نشد';
                    wrap.insertBefore(ph, rm);
                }
            });
        })(i);
    }
}

/* ==================== Image viewer ==================== */
function openImageView(src) {
    document.getElementById('imgview-src').src = src;
    document.getElementById('imgview-modal').classList.add('show');
    document.getElementById('imgview-overlay').classList.add('show');
}

/* ==================== Note form ==================== */
function clearNoteForm() {
    document.getElementById('nt-id').value = '';
    document.getElementById('nt-title').value = '';
    document.getElementById('nt-date').value = todayJalaliStr();
    document.getElementById('nt-content').value = '';
    noteChecklist = [];
    renderNoteChecklist();
    noteImageRefs = [];
    renderNoteImages();
}
function saveNote() {
    var id = document.getElementById('nt-id').value;
    var title = document.getElementById('nt-title').value.trim();
    if (!title) { alert('عنوان اجباری است.'); return; }
    var date = normalizeDigits(document.getElementById('nt-date').value.trim());
    var content = document.getElementById('nt-content').value;
    var checklist = noteChecklist.filter(function(c) { return c.text && c.text.trim(); });
    var existing = id ? DB.load('notes', []).find(function(x) { return x.id === id; }) : null;
    var note = {
        id: id || uid(),
        title: title,
        date: date,
        content: content,
        checklist: checklist,
        imageRefs: noteImageRefs.slice(),
        archived: existing ? !!existing.archived : false,
        savedAt: Date.now()
    };
    var l = DB.load('notes', []);
    if (id) { for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i] = note; }
    else l.push(note);
    DB.save('notes', l);
    showToast('✅ یادداشت ذخیره شد.');
    clearNoteForm();
    renderNotesList();
    document.querySelector('[data-tab="notes-list"]').click();
}

/* ==================== Notes list ==================== */
function renderNotesList() {
    var list = DB.load('notes', []);
    var filter = (document.getElementById('notes-filter').value || '').toLowerCase();
    var box = document.getElementById('notes-list-body');
    if (!box) return;
    box.innerHTML = '';
    var view = state.notesView || 'all';
    var tabs = document.querySelectorAll('[data-notes-view]');
    for (var ti = 0; ti < tabs.length; ti++) {
        tabs[ti].classList.toggle('active', tabs[ti].getAttribute('data-notes-view') === view);
    }
    list.sort(function(a, b) { return compareVals(b.date || '', a.date || ''); });
    var shown = 0;
    list.forEach(function(n) {
        if (view === 'archived' && !n.archived) return;
        if (view === 'all' && n.archived) return;
        var txt = ((n.title || '') + ' ' + (n.content || '')).toLowerCase();
        if (filter && txt.indexOf(filter) === -1) return;
        shown++;
        var row = document.createElement('div');
        row.className = 'note-compact-row' + (n.archived ? ' archived' : '');
        var archBadge = n.archived ? '<span class="nc-badge">📦 آرشیو</span>' : '';
        row.innerHTML = '<span style="font-size:1.1rem">📔</span>' +
            '<span class="nc-title">' + esc(n.title || 'بدون عنوان') + '</span>' +
            archBadge +
            '<span class="nc-date">' + toFa(esc(n.date || '—')) + '</span>' +
            '<span class="nc-actions">' +
            '<button data-nt-view="' + n.id + '" title="مشاهده">👁</button>' +
            '<button data-nt-edit="' + n.id + '" title="ویرایش">✎</button>' +
            '<button data-nt-arch="' + n.id + '" title="' + (n.archived ? 'خروج از آرشیو' : 'آرشیو') + '">' + (n.archived ? '↩' : '📦') + '</button>' +
            '<button data-nt-del="' + n.id + '" title="حذف">×</button>' +
            '</span>';
        row.addEventListener('click', function(e) {
            if (e.target.closest('button')) return;
            openNoteView(n.id);
        });
        box.appendChild(row);
    });
    if (shown === 0) box.innerHTML = '<div class="widget-empty">📔 ' + (view === 'archived' ? 'آرشیوی وجود ندارد.' : 'هنوز یادداشتی ثبت نشده.') + '</div>';
    document.getElementById('notes-count').textContent = toFa(shown);
    var viewBtns = box.querySelectorAll('[data-nt-view]');
    for (var v = 0; v < viewBtns.length; v++) viewBtns[v].addEventListener('click', function(e) {
        e.stopPropagation();
        openNoteView(this.getAttribute('data-nt-view'));
    });
    var editBtns = box.querySelectorAll('[data-nt-edit]');
    for (var e2 = 0; e2 < editBtns.length; e2++) editBtns[e2].addEventListener('click', function(e) {
        e.stopPropagation();
        var id = this.getAttribute('data-nt-edit');
        var n = DB.load('notes', []).find(function(x) { return x.id === id; });
        if (!n) return;
        document.getElementById('nt-id').value = n.id;
        document.getElementById('nt-title').value = n.title || '';
        document.getElementById('nt-date').value = n.date || '';
        document.getElementById('nt-content').value = n.content || '';
        noteChecklist = JSON.parse(JSON.stringify(n.checklist || []));
        noteImageRefs = (n.imageRefs || []).slice();
        renderNoteChecklist();
        renderNoteImages();
        document.querySelector('[data-tab="notes-add"]').click();
    });
    var archBtns = box.querySelectorAll('[data-nt-arch]');
    for (var a = 0; a < archBtns.length; a++) archBtns[a].addEventListener('click', function(e) {
        e.stopPropagation();
        var id = this.getAttribute('data-nt-arch');
        var l = DB.load('notes', []);
        for (var i = 0; i < l.length; i++) if (l[i].id === id) l[i].archived = !l[i].archived;
        DB.save('notes', l);
        renderNotesList();
        showToast(l.find(function(x) { return x.id === id; }).archived ? '📦 به آرشیو منتقل شد' : '↩ از آرشیو خارج شد');
    });
    var delBtns = box.querySelectorAll('[data-nt-del]');
    for (var d = 0; d < delBtns.length; d++) delBtns[d].addEventListener('click', function(e) {
        e.stopPropagation();
        var id = this.getAttribute('data-nt-del');
        if (!confirm('حذف شود؟')) return;
        var l = DB.load('notes', []).filter(function(x) { return x.id !== id; });
        DB.save('notes', l);
        renderNotesList();
    });
}

/* ==================== Note view modal ==================== */
async function openNoteView(noteId) {
    var n = DB.load('notes', []).find(function(x) { return x.id === noteId; });
    if (!n) { showToast('یادداشت یافت نشد.'); return; }
    document.getElementById('noteview-title').textContent = '📔 ' + (n.title || 'یادداشت');
    var body = document.getElementById('noteview-body');
    var html = '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">' +
        '<div><b>📅 ' + toFa(esc(n.date || '—')) + '</b></div>' +
        (n.archived ? '<span class="badge badge-archived">📦 آرشیو شده</span>' : '') + '</div>';
    if (n.content) {
        html += '<div style="background:var(--card-alt);padding:14px;border-radius:12px;font-size:0.9rem;white-space:pre-wrap;line-height:2;margin-bottom:14px;border:1px solid var(--border)">' + esc(n.content) + '</div>';
    }
    if (n.checklist && n.checklist.length > 0) {
        var done = n.checklist.filter(function(c) { return c.done; }).length;
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
            '<h3 style="color:var(--primary-dark);font-size:0.95rem;margin:0">✅ چک‌لیست (' + toFa(done) + '/' + toFa(n.checklist.length) + ')</h3>' +
            '<button class="note-share-sel" id="note-sel-all" style="padding:6px 12px;border-radius:10px;font-size:0.75rem">انتخاب همه</button></div>';
        html += '<ul class="note-checklist" id="note-checklist-ul">';
        n.checklist.forEach(function(c, i) {
            if (!c.text) return;
            html += '<li class="' + (c.done ? 'done' : '') + '">' +
                '<input type="checkbox" class="item-select" data-item-idx="' + i + '">' +
                '<input type="checkbox" disabled ' + (c.done ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:var(--primary);flex-shrink:0">' +
                '<span style="flex:1;word-break:break-word">' + esc(c.text) + '</span></li>';
        });
        html += '</ul>';
        html += '<div class="note-share-bar">' +
            '<label>📤 اشتراک‌گذاری:</label>' +
            '<button class="note-share-btn" id="note-share-selected" disabled>ارسال موارد انتخابی</button>' +
            '<span id="note-sel-count" style="font-size:0.75rem;color:var(--text-muted)">۰ مورد انتخاب شده</span>' +
            '</div>';
    }
    if (n.imageRefs && n.imageRefs.length > 0) {
        html += '<h3 style="margin:14px 0 10px;color:var(--primary-dark);font-size:0.95rem">🖼 تصاویر (' + toFa(n.imageRefs.length) + ')</h3>';
        html += '<div class="note-images" id="note-view-images"></div>';
    }
    body.innerHTML = html;
    var archBtn = document.getElementById('noteview-archive');
    archBtn.textContent = n.archived ? '↩ خارج از آرشیو' : '📦 آرشیو';
    archBtn.onclick = function() {
        var l = DB.load('notes', []);
        for (var i = 0; i < l.length; i++) if (l[i].id === n.id) l[i].archived = !l[i].archived;
        DB.save('notes', l);
        renderNotesList();
        closeNoteView();
        showToast(l.find(function(x) { return x.id === n.id; }).archived ? '📦 به آرشیو رفت' : '↩ از آرشیو خارج شد');
    };
    /* ★ اصلاح‌شده طبق درخواست ۶: ویرایش از ویجت چک‌لیست به فرم می‌رود */
    document.getElementById('noteview-edit').onclick = function() {
        closeNoteView();
        goToPage('notes');
        var note = DB.load('notes', []).find(function(x) { return x.id === n.id; });
        if (!note) return;
        setTimeout(function() {
            document.getElementById('nt-id').value = note.id;
            document.getElementById('nt-title').value = note.title || '';
            document.getElementById('nt-date').value = note.date || '';
            document.getElementById('nt-content').value = note.content || '';
            noteChecklist = JSON.parse(JSON.stringify(note.checklist || []));
            noteImageRefs = (note.imageRefs || []).slice();
            renderNoteChecklist();
            renderNoteImages();
            var addTab = document.querySelector('[data-tab="notes-add"]');
            if (addTab) addTab.click();
        }, 150);
    };
    document.getElementById('noteview-share').onclick = function() {
        var list = (n.checklist || []).filter(function(c) { return c.text && c.text.trim(); });
        if (list.length === 0) { showToast('چک‌لیستی وجود ندارد.'); return; }
        var text = '📔 ' + (n.title || 'یادداشت') + '\n📅 ' + toFa(n.date || '') + '\n\n' +
            list.map(function(c) { return (c.done ? '✅' : '⬜') + ' ' + c.text; }).join('\n');
        if (navigator.share) navigator.share({ title: n.title || 'یادداشت', text: text }).catch(function(){});
        else navigator.clipboard.writeText(text).then(function() { showToast('📋 متن کپی شد.'); }).catch(function() { alert(text); });
    };
    document.getElementById('noteview-close-btn').onclick = closeNoteView;
    if (n.imageRefs && n.imageRefs.length > 0) {
        var imgBox = document.getElementById('note-view-images');
        for (var ii = 0; ii < n.imageRefs.length; ii++) {
            (function(ref) {
                var loading = document.createElement('div');
                loading.className = 'note-img-loading';
                loading.textContent = '⏳';
                imgBox.appendChild(loading);
                var loader = ref.isBlob ? loadNoteImageRefBlob(ref) : loadNoteImageRef(ref);
                loader.then(function(url) {
                    if (loading.parentNode) loading.parentNode.removeChild(loading);
                    if (url) {
                        var img = document.createElement('img');
                        img.src = url;
                        img.alt = ref.name;
                        img.addEventListener('click', function() { openImageView(url); });
                        imgBox.appendChild(img);
                    } else {
                        var ph = document.createElement('div');
                        ph.className = 'note-img-missing';
                        ph.textContent = '❌';
                        ph.title = 'فایل حذف شده: ' + (ref.name || '');
                        imgBox.appendChild(ph);
                    }
                });
            })(n.imageRefs[ii]);
        }
    }
    var selAllBtn = document.getElementById('note-sel-all');
    if (selAllBtn) selAllBtn.onclick = function() {
        var boxes = body.querySelectorAll('.item-select');
        var allChecked = Array.from(boxes).every(function(b) { return b.checked; });
        boxes.forEach(function(b) { b.checked = !allChecked; });
        updateShareState();
    };
    function updateShareState() {
        var boxes = body.querySelectorAll('.item-select');
        var selected = [];
        boxes.forEach(function(b) { if (b.checked) selected.push(Number(b.getAttribute('data-item-idx'))); });
        var shareBtn = document.getElementById('note-share-selected');
        var cnt = document.getElementById('note-sel-count');
        if (shareBtn) shareBtn.disabled = selected.length === 0;
        if (cnt) cnt.textContent = toFa(selected.length) + ' مورد انتخاب شده';
        return selected;
    }
    body.querySelectorAll('.item-select').forEach(function(cb) {
        cb.addEventListener('change', updateShareState);
    });
    var shareBtn = document.getElementById('note-share-selected');
    if (shareBtn) shareBtn.onclick = function() {
        var selected = updateShareState();
        if (selected.length === 0) return;
        var items = selected.map(function(i) { return n.checklist[i]; }).filter(Boolean);
        var text = '📔 ' + (n.title || 'یادداشت') + '\n📅 ' + toFa(n.date || '') + '\n\n' +
            items.map(function(c, i) { return (i+1) + '. ' + (c.done ? '✅' : '⬜') + ' ' + c.text; }).join('\n');
        if (navigator.share) navigator.share({ title: n.title || 'یادداشت', text: text }).catch(function(){});
        else navigator.clipboard.writeText(text).then(function() { showToast('📋 متن کپی شد.'); }).catch(function() { alert(text); });
    };
    document.getElementById('noteview-modal').classList.add('show');
    document.getElementById('noteview-overlay').classList.add('show');
}
function closeNoteView() {
    document.getElementById('noteview-modal').classList.remove('show');
    document.getElementById('noteview-overlay').classList.remove('show');
}
