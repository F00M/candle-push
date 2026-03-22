// ============================================
//  CANDLE.PUSH — UI Helpers
//  DOM updates, chat, leaderboard, history
// ============================================

// ── Leaderboard ───────────────────────────────
function renderLb() {
  const b = document.getElementById('lbBody');
  b.innerHTML = '';
  plState.forEach(p => {
    const d = document.createElement('div');
    d.className = 'lb-row';
    let ph;
    if (!p.buyMult)  ph = `<span class="lp" style="color:var(--muted)">—</span>`;
    else if (p.cashedAt) ph = `<span class="lp p">+${p.profit.toFixed(3)}</span>`;
    else             ph = `<span class="lp w">${mult.toFixed(2)}x</span>`;
    d.innerHTML = `
      <div class="lb-user">
        <div class="av" style="background:${p.col}22;color:${p.col}">${p.name[0]}</div>
        <div>
          <div class="lb-name">${p.name}</div>
          <div class="lb-bet">${p.bet.toFixed(3)}</div>
        </div>
      </div>
      ${ph}`;
    b.appendChild(d);
  });
}

function renderLbFinal() {
  const b = document.getElementById('lbBody');
  b.innerHTML = '';
  plState.forEach(p => {
    const d   = document.createElement('div');
    d.className = 'lb-row';
    const pos   = p.profit >= 0;
    const label = p.buyMult ? (pos ? '+' : '') + p.profit.toFixed(3) : '—';
    d.innerHTML = `
      <div class="lb-user">
        <div class="av" style="background:${p.col}22;color:${p.col}">${p.name[0]}</div>
        <div>
          <div class="lb-name">${p.name}</div>
          <div class="lb-bet">${p.bet.toFixed(3)}</div>
        </div>
      </div>
      <span class="lp ${pos ? 'p' : 'n'}">${label}</span>`;
    b.appendChild(d);
  });
}

// ── Round History Pills ───────────────────────
function updateHist() {
  const w = document.getElementById('hpills');
  w.innerHTML = '';
  roundHist.slice(0, 7).forEach(v => {
    const s = document.createElement('span');
    s.className   = 'hp ' + (v >= 2 ? 'g' : 'r');
    s.textContent = v.toFixed(2) + 'x';
    w.appendChild(s);
  });
}

// ── Chat ──────────────────────────────────────
function chat(u, t, w, col) {
  const b = document.getElementById('chatBody');
  const d = document.createElement('div');
  d.className = 'chat-msg';
  d.innerHTML = `<span class="chat-user" style="color:${col || '#aaa'}">${u}</span><span class="ct ${w ? 'w' : ''}">${t}</span>`;
  b.appendChild(d);
  if (b.children.length > 80) b.removeChild(b.children[0]);
  b.scrollTop = b.scrollHeight;
}

// ── Init UI Events ────────────────────────────
function initUI() {
  // Chat input
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      chat('Parman', e.target.value.trim(), false, G);
      e.target.value = '';
    }
  });

  // Bot chat interval
  setInterval(() => {
    if (phase === 'live' && Math.random() < 0.32) {
      const i = Math.floor(Math.random() * BOTS.length);
      chat(BOTS[i], BMSGS[Math.floor(Math.random() * BMSGS.length)], false, BCOLS[i]);
    }
  }, 3500);

  // Latency badge (fake)
  setInterval(() => {
    document.getElementById('msLabel').textContent = (15 + Math.floor(Math.random() * 55)) + ' ms';
  }, 3000);

  // Seed chat with initial messages
  [
    { u: 'lexor',      t: 'cashed 3x lets gooo 🎉',            w: true,  c: '#00bcd4' },
    { u: 'Ghostoption',t: 'i buy it rugs instant 💀',           w: false, c: '#ff6b9d' },
    { u: 'Rune',       t: 'diamond hands only 💎',              w: false, c: '#ff7043' },
    { u: 'Kairox',     t: 'one more round and i quit (lying)',  w: false, c: '#7b68ee' },
  ].forEach(m => chat(m.u, m.t, m.w, m.c));

  updateHist();
}
