(function () {
  'use strict';

  /* ---------- Configurare ---------- */
  const EXAM = { count: 60, minutes: 120, pass: 65 };
  const TOPICS = {
    basics: 'Bazele Java',
    types: 'Tipuri de date și operatori',
    control: 'Decizii și bucle',
    strings: 'String și StringBuilder',
    arrays: 'Tablouri și ArrayList',
    oop: 'Clase și obiecte',
    inherit: 'Moștenire și interfețe',
    exceptions: 'Excepții'
  };
  const PRACTICE_COUNTS = [10, 25, 50, 0]; // 0 = toate

  /* ---------- Utilitare ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  const norm = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'q' + (h >>> 0).toString(36); }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignorat */ } }
  };

  const BANK = (window.QUESTIONS || []).slice();
  BANK.forEach(q => { q.id = hash(q.q + '|' + (q.code || '')); });
  const BY_ID = {}; BANK.forEach(q => { BY_ID[q.id] = q; });

  /* ---------- Stare ---------- */
  let Q = [], ANS = [], FLAG = [], LOCK = [], cur = 0, mode = 'exam', left = 0, tick = null;

  /* ---------- Tema ---------- */
  $('#themeBtn').onclick = () => {
    const r = document.documentElement;
    const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    r.dataset.theme = dark ? 'light' : 'dark';
    store.set('jfs.theme', r.dataset.theme);
  };
  const savedTheme = store.get('jfs.theme', null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;

  /* ---------- Ecran start ---------- */
  $('#exCount').textContent = Math.min(EXAM.count, BANK.length);
  $('#exMin').textContent = EXAM.minutes;
  $('#exPass').textContent = EXAM.pass + '%';

  const topicsBox = $('#topics');
  Object.keys(TOPICS).forEach(k => {
    const n = BANK.filter(q => q.topic === k).length;
    if (!n) return;
    const lab = el('label', 'chk');
    const inp = el('input'); inp.type = 'checkbox'; inp.value = k; inp.checked = true;
    lab.append(inp, el('span', '', TOPICS[k]), el('small', '', String(n)));
    topicsBox.append(lab);
  });
  $('#allTopics').onclick = () => $$('input', topicsBox).forEach(i => i.checked = true);
  $('#noTopics').onclick = () => $$('input', topicsBox).forEach(i => i.checked = false);

  const countSeg = $('#countSeg');
  PRACTICE_COUNTS.forEach((n, i) => {
    const lab = el('label'); const inp = el('input');
    inp.type = 'radio'; inp.name = 'count'; inp.value = n; inp.checked = (i === 1);
    lab.append(inp, el('span', '', n === 0 ? 'Toate' : String(n)));
    countSeg.append(lab);
  });

  function showMsg(t) { const m = $('#startMsg'); m.textContent = t; m.classList.toggle('hidden', !t); }

  function refreshStart() {
    showMsg('');
    const mistakes = store.get('jfs.mistakes', []).filter(id => BY_ID[id]);
    const mb = $('#mistakesBtn');
    mb.textContent = `Greșelile mele (${mistakes.length})`;
    mb.disabled = mistakes.length === 0;
    const hist = store.get('jfs.history', []).slice(-6).reverse();
    const box = $('#history'); box.replaceChildren();
    if (!hist.length) { box.append(el('p', 'hint', 'Încă nu ai nicio încercare terminată.')); return; }
    const wrap = el('div', 'hist');
    hist.forEach(h => {
      const row = el('div');
      row.append(
        el('span', 'd', new Date(h.d).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })),
        el('span', '', h.m === 'exam' ? 'Examen' : 'Exersare'),
        el('span', 'p', `${h.pct}% (${h.ok}/${h.n})`)
      );
      if (h.m === 'exam') row.append(el('span', h.pass ? 'tag-ok' : 'tag-bad', h.pass ? 'Promovat' : 'Nepromovat'));
      wrap.append(row);
    });
    box.append(wrap);
  }

  $('#examBtn').onclick = () => begin(shuffle(BANK).slice(0, EXAM.count), 'exam');
  $('#practiceBtn').onclick = () => {
    const picked = $$('input:checked', topicsBox).map(i => i.value);
    if (!picked.length) { showMsg('Alege cel puțin o temă.'); return; }
    const n = +$('input[name=count]:checked').value;
    let pool = shuffle(BANK.filter(q => picked.includes(q.topic)));
    if (n > 0) pool = pool.slice(0, n);
    begin(pool, 'practice');
  };
  $('#mistakesBtn').onclick = () => {
    const ids = store.get('jfs.mistakes', []);
    const pool = shuffle(ids.map(id => BY_ID[id]).filter(Boolean));
    if (pool.length) begin(pool, 'practice');
  };

  /* ---------- Pregătire test ---------- */
  function prep(item) {
    const c = Object.assign({}, item);
    if (c.t === 'tf') { c.o = ['True', 'False']; }
    else if (c.t === 's' || c.t === 'm') {
      const idx = shuffle(item.o.map((_, i) => i));
      c.o = idx.map(i => item.o[i]);
      c.a = item.a.map(old => idx.indexOf(old)).sort((x, y) => x - y);
    }
    return c;
  }

  function begin(items, m) {
    mode = m;
    Q = items.map(prep);
    ANS = Q.map(q => q.t === 'x' ? '' : []);
    FLAG = Q.map(() => false);
    LOCK = Q.map(() => false);
    cur = 0;
    $('#start').classList.add('hidden');
    $('#result').classList.add('hidden');
    $('#exam').classList.remove('hidden');
    clearInterval(tick);
    if (mode === 'exam') {
      left = EXAM.minutes * 60;
      paintTimer();
      tick = setInterval(() => { left--; paintTimer(); if (left <= 0) { clearInterval(tick); finish(); } }, 1000);
    } else {
      $('#timer').textContent = 'Fără timer';
      $('#timer').classList.remove('low');
    }
    $('#checkBtn').classList.toggle('hidden', mode !== 'practice');
    render();
    window.scrollTo(0, 0);
  }

  function paintTimer() {
    const m = Math.floor(left / 60), s = left % 60;
    const t = $('#timer');
    t.textContent = `Timp rămas ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    t.classList.toggle('low', left <= 300);
  }

  /* ---------- Evaluare ---------- */
  function isCorrect(i) {
    const q = Q[i], a = ANS[i];
    if (q.t === 'x') return q.a.some(x => norm(x) === norm(a));
    return a.length === q.a.length && [...a].sort((x, y) => x - y).every((v, k) => v === q.a[k]);
  }
  function answered(i) { return Q[i].t === 'x' ? norm(ANS[i]) !== '' : ANS[i].length > 0; }
  function correctText(q) { return q.t === 'x' ? q.a.join(' / ') : q.a.map(i => q.o[i]).join('  |  '); }
  function yourText(i) {
    const q = Q[i];
    if (!answered(i)) return '(fără răspuns)';
    return q.t === 'x' ? ANS[i] : ANS[i].map(k => q.o[k]).join('  |  ');
  }
  function isLocked() { return mode === 'practice' && LOCK[cur]; }
  function countAnswered() { return Q.filter((_, i) => answered(i)).length; }

  /* ---------- Afișare întrebare ---------- */
  function render() {
    const q = Q[cur], card = $('#qcard'), locked = isLocked();
    card.replaceChildren();
    $('#qno').textContent = `Întrebarea ${cur + 1} din ${Q.length}`;
    $('#bar').style.width = `${(countAnswered() / Q.length) * 100}%`;

    if (mode === 'practice') card.append(el('span', 'qtopic', TOPICS[q.topic] || q.topic));
    card.append(el('p', 'qtext', q.q));
    if (q.code) { const pre = el('pre', 'code'); pre.textContent = q.code; card.append(pre); }
    if (q.t === 'm') card.append(el('p', 'choose', `Alege ${q.a.length} răspunsuri.`));
    if (q.t === 's') card.append(el('p', 'choose', 'Alege un singur răspuns.'));

    if (q.t === 'x') {
      const inp = el('input', 'txt'); inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false;
      inp.placeholder = 'Răspunsul tău'; inp.value = ANS[cur]; inp.disabled = locked;
      inp.setAttribute('aria-label', 'Răspunsul tău');
      inp.oninput = () => { ANS[cur] = inp.value; paintGrid(); $('#checkBtn').disabled = !answered(cur); $('#bar').style.width = `${(countAnswered() / Q.length) * 100}%`; };
      inp.onkeydown = e => { if (e.key === 'Enter' && mode === 'practice' && answered(cur) && !LOCK[cur]) { LOCK[cur] = true; render(); } };
      card.append(inp);
    } else {
      const box = el('div', 'opts'); box.setAttribute('role', q.t === 'm' ? 'group' : 'radiogroup');
      q.o.forEach((txt, i) => {
        const lab = el('label', 'opt');
        const inp = el('input'); inp.type = q.t === 'm' ? 'checkbox' : 'radio'; inp.name = 'opt'; inp.disabled = locked;
        inp.checked = ANS[cur].includes(i);
        lab.append(inp, el('span', 't' + (q.t === 'tf' ? ' plain' : ''), txt));
        if (inp.checked) lab.classList.add('sel');
        if (locked) {
          if (q.a.includes(i)) lab.classList.add('right');
          else if (ANS[cur].includes(i)) lab.classList.add('wrong');
        }
        inp.onchange = () => {
          if (q.t === 'm') ANS[cur] = inp.checked ? [...ANS[cur], i] : ANS[cur].filter(v => v !== i);
          else ANS[cur] = [i];
          $$('.opt', card).forEach((l, k) => l.classList.toggle('sel', ANS[cur].includes(k)));
          paintGrid();
          $('#checkBtn').disabled = !answered(cur);
          $('#bar').style.width = `${(countAnswered() / Q.length) * 100}%`;
        };
        box.append(lab);
      });
      card.append(box);
    }

    if (locked) {
      const ok = isCorrect(cur);
      const fb = el('div', 'fb ' + (ok ? 'ok' : 'no'));
      fb.append(el('strong', '', ok ? 'Corect' : 'Greșit'));
      if (!ok) fb.append(el('div', '', 'Răspuns corect: ' + correctText(q)));
      fb.append(el('div', '', q.e));
      card.append(fb);
    }

    $('#prevBtn').disabled = cur === 0;
    $('#nextBtn').disabled = cur === Q.length - 1;
    $('#flagBtn').textContent = FLAG[cur] ? 'Demarchează' : 'Marchează';
    $('#checkBtn').disabled = locked || !answered(cur);
    paintGrid();
  }

  function paintGrid() {
    const g = $('#grid'); g.replaceChildren();
    Q.forEach((_, i) => {
      const b = el('button', 'cell', String(i + 1)); b.type = 'button';
      if (answered(i)) b.classList.add('done');
      if (FLAG[i]) b.classList.add('flag');
      if (i === cur) b.classList.add('cur');
      b.setAttribute('aria-label', `Întrebarea ${i + 1}${answered(i) ? ', răspuns dat' : ''}${FLAG[i] ? ', marcată' : ''}`);
      b.onclick = () => { cur = i; render(); };
      g.append(b);
    });
  }

  $('#prevBtn').onclick = () => { if (cur > 0) { cur--; render(); } };
  $('#nextBtn').onclick = () => { if (cur < Q.length - 1) { cur++; render(); } };
  $('#flagBtn').onclick = () => { FLAG[cur] = !FLAG[cur]; render(); };
  $('#checkBtn').onclick = () => { LOCK[cur] = true; render(); };

  /* ---------- Final ---------- */
  const dlg = $('#dlg');
  $('#finishBtn').onclick = () => {
    const un = Q.length - countAnswered();
    $('#dlgText').textContent = un > 0
      ? `Mai ai ${un} ${un === 1 ? 'întrebare fără răspuns' : 'întrebări fără răspuns'}. Sigur vrei să termini testul?`
      : 'Ai răspuns la toate întrebările. Termini testul?';
    dlg.showModal();
  };
  $('#dlgNo').onclick = () => dlg.close();
  $('#dlgYes').onclick = () => { dlg.close(); finish(); };

  function finish() {
    clearInterval(tick);
    if (dlg.open) dlg.close();
    $('#exam').classList.add('hidden');
    $('#result').classList.remove('hidden');

    const n = Q.length;
    const ok = Q.filter((_, i) => isCorrect(i)).length;
    const un = Q.filter((_, i) => !answered(i)).length;
    const pct = Math.round(ok / n * 100);
    const need = Math.ceil(n * EXAM.pass / 100);
    const pass = ok >= need;

    $('#pct').textContent = pct + '%';
    const b = $('#badge');
    if (mode === 'exam') { b.textContent = pass ? 'Promovat' : 'Nepromovat'; b.className = 'badge ' + (pass ? 'pass' : 'fail'); }
    else { b.textContent = 'Exersare'; b.className = 'badge'; }

    const st = $('#stats'); st.replaceChildren();
    const items = [['corecte', ok], ['greșite', n - ok - un], ['fără răspuns', un]];
    if (mode === 'exam') items.push(['necesare pentru promovare', `${need} din ${n}`]);
    items.forEach(([k, v]) => { const d = el('div'); d.append(el('b', '', String(v)), document.createTextNode(' ' + k)); st.append(d); });

    // istoric + greșeli
    const hist = store.get('jfs.history', []);
    hist.push({ d: Date.now(), m: mode, ok, n, pct, pass });
    store.set('jfs.history', hist.slice(-30));
    const miss = new Set(store.get('jfs.mistakes', []));
    Q.forEach((q, i) => { if (isCorrect(i)) miss.delete(q.id); else miss.add(q.id); });
    store.set('jfs.mistakes', [...miss]);

    // pe teme
    const bk = $('#breakdown'); bk.replaceChildren();
    const per = {};
    Q.forEach((q, i) => { const t = per[q.topic] || (per[q.topic] = { ok: 0, n: 0 }); t.n++; if (isCorrect(i)) t.ok++; });
    Object.keys(TOPICS).filter(k => per[k]).forEach(k => {
      const r = per[k], p = Math.round(r.ok / r.n * 100);
      const row = el('div', 'bk');
      const bar = el('div', 'barwrap'); const fill = el('i', p < EXAM.pass ? 'low' : ''); fill.style.width = p + '%'; bar.append(fill);
      row.append(el('span', '', TOPICS[k]), bar, el('span', 'n', `${r.ok}/${r.n}`));
      bk.append(row);
    });

    $('#retryWrongBtn').classList.toggle('hidden', ok === n);
    $$('input[name=flt]')[0].checked = true;
    paintReview('all');
    window.scrollTo(0, 0);
  }

  function paintReview(f) {
    const r = $('#review'); r.replaceChildren();
    Q.forEach((q, i) => {
      const ok = isCorrect(i);
      if (f === 'wrong' && ok) return;
      const d = el('details', ok ? 'ok' : 'no');
      const s = el('summary'); s.append(el('span', 'mk', ok ? '✓' : '✗'), el('span', '', `${i + 1}. ${q.q}`));
      const body = el('div', 'body');
      if (q.code) { const pre = el('pre', 'code'); pre.textContent = q.code; body.append(pre); }
      body.append(el('div', 'yours', 'Răspunsul tău: ' + yourText(i)));
      if (!ok) body.append(el('div', 'yours', 'Răspuns corect: ' + correctText(q)));
      body.append(el('div', '', q.e));
      d.append(s, body); r.append(d);
    });
    if (!r.children.length) r.append(el('p', 'hint', 'Nicio întrebare greșită. Rezultat perfect.'));
  }
  $$('input[name=flt]').forEach(r => r.onchange = () => paintReview(r.value));

  $('#againBtn').onclick = () => {
    $('#result').classList.add('hidden');
    $('#start').classList.remove('hidden');
    refreshStart();
    window.scrollTo(0, 0);
  };
  $('#retryWrongBtn').onclick = () => {
    const pool = Q.filter((_, i) => !isCorrect(i)).map(q => BY_ID[q.id]).filter(Boolean);
    if (pool.length) begin(shuffle(pool), 'practice');
  };

  refreshStart();
})();
