// Actify — habit tracker. All data lives in localStorage under STORAGE_KEY.
(function () {
  'use strict';

  const STORAGE_KEY = 'actify.habits.v1';
  const CONTACT_EMAIL = 'jalilova.antiqa@gmail.com';

  // ---------- Date helpers (local time, YYYY-MM-DD) ----------
  function dayKey(date) {
    const d = date || new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function addDays(key, delta) {
    const [y, m, d] = key.split('-').map(Number);
    return dayKey(new Date(y, m - 1, d + delta));
  }

  // ---------- Storage ----------
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!Array.isArray(data)) return [];
      // Keep only well-formed habits; drop anything malformed or edited by hand.
      const seen = new Set();
      return data
        .filter((h) => h && typeof h.id === 'string' && typeof h.name === 'string' && h.name.trim() && Array.isArray(h.done))
        .map((h) => ({
          id: h.id,
          name: h.name.trim().slice(0, 60),
          done: [...new Set(h.done.filter((d) => typeof d === 'string' && /^d{4}-d{2}-d{2}$/.test(d)))],
          created: typeof h.created === 'string' ? h.created : dayKey(),
        }))
        .filter((h) => !seen.has(h.id) && seen.add(h.id));
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (e) {
      showToast('Could not save — browser storage is unavailable.');
    }
  }

  // ---------- Streaks ----------
  // Current streak: consecutive done days ending today (or yesterday, if today is not ticked yet).
  function currentStreak(habit) {
    const done = new Set(habit.done);
    let day = dayKey();
    if (!done.has(day)) day = addDays(day, -1);
    let count = 0;
    while (done.has(day)) {
      count++;
      day = addDays(day, -1);
    }
    return count;
  }

  function bestStreak(habit) {
    const days = [...habit.done].sort();
    let best = 0;
    let run = 0;
    let prev = null;
    days.forEach((d) => {
      run = prev && addDays(prev, 1) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    });
    return best;
  }

  // ---------- State ----------
  let habits = load();

  function addHabit(name) {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) return 'Please type a habit name.';
    if (habits.some((h) => h.name.toLowerCase() === clean.toLowerCase())) {
      return `"${clean}" is already in your list.`;
    }
    habits.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: clean, done: [], created: dayKey() });
    save();
    render();
    return '';
  }

  function toggleToday(id) {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const today = dayKey();
    const i = habit.done.indexOf(today);
    if (i === -1) habit.done.push(today);
    else habit.done.splice(i, 1);
    save();
    render();
  }

  function deleteHabit(id) {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    if (!window.confirm(`Delete "${habit.name}" and its history?`)) return;
    habits = habits.filter((h) => h.id !== id);
    save();
    render();
    showToast('Habit deleted.');
  }

  // ---------- Rendering ----------
  const list = document.getElementById('habitList');
  const empty = document.getElementById('emptyState');

  function lastSevenDays(habit) {
    const done = new Set(habit.done);
    const today = dayKey();
    const wrap = document.createElement('div');
    wrap.className = 'week';
    wrap.setAttribute('role', 'img');
    let doneCount = 0;
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i);
      const dot = document.createElement('span');
      dot.className = 'dot' + (done.has(d) ? ' on' : '');
      dot.title = d + (done.has(d) ? ' — done' : ' — not done');
      if (done.has(d)) doneCount++;
      wrap.appendChild(dot);
    }
    wrap.setAttribute('aria-label', `Last 7 days: done on ${doneCount} of 7`);
    return wrap;
  }

  function render() {
    const today = dayKey();
    list.innerHTML = '';

    habits.forEach((habit) => {
      const isDone = habit.done.includes(today);
      const streak = currentStreak(habit);

      const li = document.createElement('li');
      li.className = 'habit' + (isDone ? ' is-done' : '');

      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'check';
      check.setAttribute('aria-pressed', String(isDone));
      check.setAttribute('aria-label', `Done today: ${habit.name}`);
      check.textContent = isDone ? '✓' : '';
      check.addEventListener('click', () => toggleToday(habit.id));

      const body = document.createElement('div');
      body.className = 'habit-body';
      const name = document.createElement('span');
      name.className = 'habit-name';
      name.textContent = habit.name;
      const meta = document.createElement('span');
      meta.className = 'habit-meta';
      meta.textContent = `🔥 ${streak} day${streak === 1 ? '' : 's'} streak · best ${bestStreak(habit)}`;
      body.append(name, meta, lastSevenDays(habit));

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'delete';
      del.setAttribute('aria-label', `Delete "${habit.name}"`);
      del.textContent = '✕';
      del.addEventListener('click', () => deleteHabit(habit.id));

      li.append(check, body, del);
      list.appendChild(li);
    });

    const doneToday = habits.filter((h) => h.done.includes(today)).length;
    const best = habits.reduce((m, h) => Math.max(m, bestStreak(h)), 0);
    const pct = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;

    document.getElementById('statDone').textContent = doneToday;
    document.getElementById('statTotal').textContent = habits.length;
    document.getElementById('statBest').textContent = best;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progress').setAttribute('aria-valuenow', String(pct));
    empty.hidden = habits.length > 0;

    document.querySelectorAll('[data-habit]').forEach((btn) => {
      const added = habits.some((h) => h.name.toLowerCase() === btn.dataset.habit.toLowerCase());
      btn.disabled = added;
      btn.textContent = added ? 'In your habits ✓' : 'Add to my habits';
    });
  }

  // ---------- Toast ----------
  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // ---------- Events ----------
  const form = document.getElementById('habitForm');
  const input = document.getElementById('habitInput');
  const error = document.getElementById('habitError');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = addHabit(input.value);
    error.textContent = msg;
    if (!msg) {
      input.value = '';
      showToast('Habit added.');
    }
  });

  document.getElementById('challengeCards').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-habit]');
    if (!btn) return;
    const msg = addHabit(btn.dataset.habit);
    showToast(msg || `"${btn.dataset.habit}" added to your habits.`);
  });

  // Mobile menu
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  function setMenu(open) {
    navLinks.classList.toggle('active', open);
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  hamburger.addEventListener('click', () => setMenu(!navLinks.classList.contains('active')));
  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });

  // Contact form → mailto (no backend)
  document.getElementById('contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const name = this.elements.name.value.trim();
    const message = this.elements.message.value.trim();
    const subject = encodeURIComponent(`Actify feedback from ${name}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    showToast('Opening your email app…');
  });

  // Today label, and re-render when the date changes while the tab is open
  const today = new Date();
  document.getElementById('todayLabel').textContent = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  render();
})();
