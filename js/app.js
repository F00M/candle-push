// ============================================
//  CANDLE.PUSH — Config & Constants
// ============================================

const G  = '#00e676';
const R  = '#ff3d57';
const Y  = '#ffd600';
const BG = '#0e1013';

const LOGIC_MS  = 130;
const TPC       = 18;
const CRASH_ANI = 70;

function genCrash() {
  const r = Math.random();
  if (r < 0.38) return parseFloat((1.0  + Math.random() * 0.55).toFixed(2));
  if (r < 0.62) return parseFloat((1.55 + Math.random() * 1.6 ).toFixed(2));
  if (r < 0.80) return parseFloat((3.2  + Math.random() * 8   ).toFixed(2));
  if (r < 0.93) return parseFloat((11   + Math.random() * 39  ).toFixed(2));
  return parseFloat((52 + Math.random() * 200).toFixed(2));
}

const PLAYERS = [
  { name: 'Ghostoption', col: '#ff6b9d', bet: 0.10 },
  { name: 'Kairox',      col: '#7b68ee', bet: 0.02 },
  { name: 'Aldrin',      col: '#ffd600', bet: 0.08 },
  { name: 'lexor',       col: '#00bcd4', bet: 0.15 },
  { name: 'Rune',        col: '#ff7043', bet: 0.03 },
  { name: 'Onyx7',       col: '#ab47bc', bet: 0.06 },
];

const BOTS  = ['Ghostoption', 'Kairox', 'lexor', 'Rune'];
const BCOLS = ['#ff6b9d', '#7b68ee', '#00bcd4', '#ff7043'];
const BMSGS = [
  'holding 💎', 'PUMP IT 🚀', 'already rugged again 😭',
  "scared money don't make money", '50x or bust 💀',
  'bro it always rugs on me 😭', 'paper hands smh 🤡',
  'i bought the top again LMAO', 'RUG RUG RUG 💀',
  'nah im holding til 0', 'one more round i promise',
  "just 2x and i'm out (lying)", 'why do i always do this 😭',
  'this is fine 🔥🔥🔥', 'my whole bag is gone',
  'trust the process 📈', 'we are so back', 'we are so not back',
];

let roundHist = [2.41, 1.07, 3.22, 1.21, 2.27, 1.42, 1.22, 1.08];

// ============================================
//  CANDLE.PUSH — Price Engine
// ============================================

let price = 1, vel = 0, momentum = 0, vol = 0;
let subPhase = 'pump', subTick = 0, subLen = 0;
let candles = [], cO = 1, cH = 1, cL = 1, cC = 1, tic = 0;
let scaleMin = 0.6, scaleMax = 2.2;

function nextSub() {
  const r = Math.random(), p = price, sp = 1 + p * 0.08;
  if (p < 1.5) {
    if      (r < 0.52) { subPhase='pump';     subLen=12+Math.random()*18; vel= (0.007+Math.random()*0.009)*sp; }
    else if (r < 0.74) { subPhase='sideways'; subLen= 8+Math.random()*14; vel= (Math.random()-.5)*0.002; }
    else                { subPhase='pullback'; subLen= 8+Math.random()*10; vel=-(0.005+Math.random()*0.007)*sp; }
  } else if (p < 4) {
    if      (r < 0.50) { subPhase='pump';     subLen=10+Math.random()*14; vel= (0.01+Math.random()*0.013)*sp; }
    else if (r < 0.66) { subPhase='sideways'; subLen= 6+Math.random()*10; vel= (Math.random()-.5)*0.003; }
    else                { subPhase='pullback'; subLen= 6+Math.random()*10; vel=-(0.008+Math.random()*0.01)*sp; }
  } else {
    if      (r < 0.48) { subPhase='pump';     subLen= 8+Math.random()*10; vel= (0.014+Math.random()*0.018)*sp; }
    else if (r < 0.60) { subPhase='sideways'; subLen= 5+Math.random()* 8; vel= (Math.random()-.5)*0.005; }
    else                { subPhase='pullback'; subLen= 5+Math.random()* 8; vel=-(0.012+Math.random()*0.015)*sp; }
  }
  vol = 0.003 + price * 0.0015 + Math.random() * 0.005;
  subTick = 0;
}

function stepPrice() {
  subTick++;
  if (subTick > subLen) nextSub();
  momentum = momentum * 0.86 + vel * 0.14;
  const noise = (Math.random() - .5) * 2 * vol;
  const spike = Math.random() < 0.03 ? ((Math.random() - .42) * 0.04 * price) : 0;
  price = Math.max(0.28, price + momentum + noise + spike);
  return price;
}

function updateScale() {
  const all = [price, cH, cL];
  candles.slice(-30).forEach(c => { all.push(c.high, c.low); });
  const dMin = Math.min(...all), dMax = Math.max(...all);
  const range = Math.max(0.5, dMax - dMin), pad = range * 0.3;
  scaleMin += (dMin - pad        - scaleMin) * 0.04;
  scaleMax += (dMax + pad * 1.25 - scaleMax) * 0.04;
}

function toY(v) { return H - ((v - scaleMin) / (scaleMax - scaleMin)) * H; }

function resetPriceEngine() {
  price = 1; vel = 0.006; momentum = 0; vol = 0.004;
  tic = 0; candles = [];
  cO = 1; cH = 1; cL = 1; cC = 1;
  scaleMin = 0.6; scaleMax = 2.2;
  nextSub();
}

// ============================================
//  CANDLE.PUSH — Chart Renderer
// ============================================

let canvas, ctx, W, H;
let chartEvents = [];

function initCanvas() {
  canvas = document.getElementById('gc');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resizeCanvas();
      startRound();
    });
  });
}

function resizeCanvas() {
  if (!canvas) return;
  const wrap = document.getElementById('chartWrap');
  const rect  = wrap.getBoundingClientRect();
  const dpr   = window.devicePixelRatio || 1;
  W = rect.width  || wrap.offsetWidth  || wrap.clientWidth;
  H = rect.height || wrap.offsetHeight || wrap.clientHeight;
  if (W < 10 || H < 10) { W = window.innerWidth - 360; H = 400; }
  // Scale canvas for HiDPI/Retina — makes everything crisp
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); // scale all drawing operations
}

window.addEventListener('resize', resizeCanvas);

function CW()   { return Math.min(18, Math.max(10, Math.floor(W / 60))); }
function CG()   { return Math.max(4, Math.floor(CW() * 0.4)); }
function STEP() { return CW() + CG(); }

function render() {
  if (!ctx || !W || !H) return;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  drawGrid();
  drawCandles();
  if (phase === 'live' && !crashing) drawPriceLine();
  drawChartEvents();
}

function drawGrid() {
  const steps = 5;
  ctx.textAlign = 'right';
  for (let i = 0; i <= steps; i++) {
    const v = scaleMin + ((scaleMax - scaleMin) / steps) * i;
    const y = toY(v);
    if (y < 4 || y > H - 4) continue;
    ctx.strokeStyle = 'rgba(30,45,71,0.7)'; ctx.lineWidth = 0.5; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(42, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(140,160,200,0.85)'; ctx.font = 'bold 9px Space Mono,monospace';
    ctx.fillText(v.toFixed(2) + 'x', 39, y + 3);
  }
  ctx.textAlign = 'left';
}

function drawCandles() {
  const cw = CW(), cs = STEP(), maxVis = Math.floor((W - 50) / cs);
  const formClose = crashing ? Math.max(0.28, cO - (cO - 0.28) * Math.min(1, crashProg)) : cC;
  const forming = {
    open: cO,
    high: crashing ? Math.max(cH, cO) : Math.max(cH, formClose),
    low:  crashing ? Math.min(cL, formClose * 0.68) : cL,
    close: formClose, forming: true,
  };
  const vis = [...candles, forming].slice(-maxVis);
  vis.forEach((c, i) => {
    const x = 44 + i * cs, isG = c.close >= c.open;
    const col = (crashing && c.forming) ? R : (isG ? G : R);
    const oY = toY(c.open), cY = toY(c.close), hY = toY(c.high), lY = toY(c.low);
    // Wick — thicker & sharper
    ctx.strokeStyle = col; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x + cw/2, hY); ctx.lineTo(x + cw/2, lY); ctx.stroke();
    // Body
    const bTop = Math.min(oY, cY), bH = Math.max(3, Math.abs(oY - cY));
    ctx.globalAlpha = c.forming ? 1 : 0.95;
    ctx.fillStyle = col;
    ctx.fillRect(x, bTop, cw, bH);
    ctx.globalAlpha = 1;
    // Sharp border — same color, no blur
    ctx.strokeStyle = isG ? '#00ff88' : '#ff2244'; ctx.lineWidth = 0.8;
    ctx.strokeRect(x, bTop, cw, bH);
  });
}

function drawPriceLine() {
  const y = toY(price);
  if (y < 0 || y > H) return;
  ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(0,230,118,0.45)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(42, y); ctx.lineTo(W - 2, y); ctx.stroke(); ctx.setLineDash([]);
  const tag = mult.toFixed(4) + 'x'; ctx.font = 'bold 10px Space Mono,monospace';
  const tw = ctx.measureText(tag).width + 14;
  ctx.fillStyle = 'rgba(0,230,118,0.18)'; ctx.fillRect(W - tw - 2, y - 9, tw, 17);
  ctx.strokeStyle = 'rgba(0,230,118,0.7)'; ctx.lineWidth = 0.8; ctx.strokeRect(W - tw - 2, y - 9, tw, 17);
  ctx.fillStyle = '#00ff88'; ctx.fillText(tag, W - tw + 2, y + 4);
}

function spawnEvent(type, name, col, atMult) {
  const cw = CW(), cs = STEP(), maxVis = Math.floor((W - 50) / cs);
  const visIdx = Math.min(candles.length, maxVis - 1);
  const x = 44 + visIdx * cs + cw / 2, y = toY(atMult);
  chartEvents.push({ type, name, col, atMult, x, y: Math.max(22, y), age: 0, maxAge: 280 });
}

function drawChartEvents() {
  chartEvents = chartEvents.filter(e => e.age < e.maxAge);
  chartEvents.forEach(e => {
    e.age++;
    const t = e.age / e.maxAge;
    const alpha = t < 0.08 ? t / 0.08 : t > 0.78 ? (1 - t) / 0.22 : 1;
    const dy = -e.age * 0.16, isBuy = e.type === 'buy';
    const label = (isBuy ? '▲ ' : '▼ ') + e.name + ' ' + e.atMult.toFixed(2) + 'x';
    ctx.save(); ctx.globalAlpha = alpha; ctx.font = 'bold 10px Fredoka,sans-serif';
    const tw = ctx.measureText(label).width + 16;
    const bx = Math.max(2, Math.min(W - tw - 2, e.x - tw / 2)), by = e.y + dy;
    ctx.fillStyle = e.col + (isBuy ? '30' : '28'); roundRect(ctx, bx, by - 12, tw, 18, 5); ctx.fill();
    ctx.strokeStyle = e.col + (isBuy ? 'cc' : '99'); ctx.lineWidth = isBuy ? 1.5 : 1;
    roundRect(ctx, bx, by - 12, tw, 18, 5); ctx.stroke();
    ctx.strokeStyle = e.col + '44'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(e.x, by + 8); ctx.lineTo(e.x, e.y + 4); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(label, bx + tw / 2, by + 2); ctx.textAlign = 'left'; ctx.restore();
  });
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}

// ============================================
//  CANDLE.PUSH — Game Logic
// ============================================

let balance = 10, phase = 'waiting', mult = 1;
let playerBet = 0, playerIn = false, playerBuyMult = 1;
let autoSell = null, crashPt = 0;
let crashing = false, crashProg = 0, crashAnimAcc = 0, cdTimer = null;
let rafId = null, lastTs = 0, logicAcc = 0;
let plState = [];

function loop(ts) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(ts - lastTs, 250); lastTs = ts;
  if (phase === 'live') {
    logicAcc += dt;
    while (logicAcc >= LOGIC_MS) { logicAcc -= LOGIC_MS; gameTick(); }
  }
  if (crashing) {
    crashAnimAcc += dt;
    if (crashAnimAcc >= CRASH_ANI) { crashAnimAcc = 0; crashProg += 0.045; }
    if (crashProg >= 1.6) { crashing = false; phase = 'crashed'; finishCrash(); }
  }
  updateScale(); render();
}

function gameTick() {
  price = stepPrice(); mult = parseFloat(price.toFixed(4)); cC = mult;
  cH = Math.max(cH, mult + (Math.random() < 0.2  ? Math.random() * 0.06 * mult : 0));
  cL = Math.min(cL, mult - (Math.random() < 0.15 ? Math.random() * 0.04 * mult : 0));
  tic++;
  if (tic >= TPC) {
    candles.push({ open: cO, high: cH, low: cL, close: cC });
    cO = mult; cH = mult; cL = mult; cC = mult; tic = 0;
  }
  plState.forEach(p => {
    if (!p.active) return;
    if (!p.buyMult && p.buyDelay > 0) {
      p.buyDelay--;
      if (p.buyDelay === 0) { p.buyMult = mult; spawnEvent('buy', p.name, p.col, mult); }
    }
    if (p.buyMult && !p.cashedAt && mult >= p.target) {
      p.cashedAt = mult;
      p.profit   = parseFloat((p.bet * (mult / p.buyMult - 1)).toFixed(4));
      spawnEvent('sell', p.name, p.col, mult);
      chat(p.name, 'sold ' + mult.toFixed(2) + 'x! +' + p.profit.toFixed(3), true, p.col);
    }
  });
  if (autoSell && mult >= autoSell && playerIn) cashOut();
  if (mult >= crashPt) beginCrash();
  const d = document.getElementById('multDisp');
  d.textContent = mult.toFixed(2) + 'x';
  d.className   = 'mult-overlay ' + (mult < 3 ? 's' : mult < 8 ? 'd' : 'c');
  renderLb();
}

function beginCrash() {
  phase = 'crashing'; crashing = true; crashProg = 0; crashAnimAcc = 0;
  document.getElementById('phPill').textContent = 'RUGGED';
  document.getElementById('phPill').className   = 'phase-pill crash';
  document.getElementById('multDisp').className = 'mult-overlay c';
  document.getElementById('buyBtn').disabled    = true;
  document.getElementById('sellBtn').disabled   = true;
  if (playerIn) {
    spawnEvent('sell', 'You', G, mult);
    chat('System', 'RUGGED! -' + playerBet.toFixed(3) + ' PUSH 💀', false, R);
    playerIn = false; playerBet = 0;
    document.getElementById('balDisp').textContent = balance.toFixed(3) + ' PUSH';
  }
  plState.forEach(p => { if (p.active && !p.cashedAt && p.buyMult) p.profit = -p.bet; });
  candles.push({ open: cO, high: cH, low: Math.max(0.28, cO * 0.3), close: Math.max(0.3, cO * 0.36) });
  cO = Math.max(0.3, mult * 0.36); cH = cO; cL = Math.max(0.25, cO * 0.38); cC = cL;
}

function finishCrash() {
  cancelAnimationFrame(rafId);
  document.getElementById('crashAt').textContent = mult.toFixed(2) + 'x';
  document.getElementById('crashOverlay').classList.add('show');
  roundHist.unshift(parseFloat(mult.toFixed(2)));
  if (roundHist.length > 8) roundHist.pop();
  updateHist(); renderLbFinal();
  let secs = 10;
  document.getElementById('crashCd').textContent = 'Next round in ' + secs + 's...';
  cdTimer = setInterval(() => {
    secs--;
    document.getElementById('crashCd').textContent = 'Next round in ' + secs + 's...';
    if (secs <= 0) { clearInterval(cdTimer); document.getElementById('crashOverlay').classList.remove('show'); startCountdown(); }
  }, 1000);
}

function startCountdown() {
  phase = 'waiting';
  mult  = 1; // reset multiplier state so no stale value
  document.getElementById('phPill').textContent    = 'WAITING';
  document.getElementById('phPill').className      = 'phase-pill wait';
  document.getElementById('multDisp').textContent  = '1.00x';
  document.getElementById('multDisp').className    = 'mult-overlay s';
  document.getElementById('buyBtn').disabled       = true;  // disabled during countdown
  document.getElementById('buyBtn').textContent    = 'Waiting...';
  document.getElementById('sellBtn').disabled      = true;
  playerIn = false; playerBet = 0; chartEvents = [];
  const cdO = document.getElementById('cdOverlay'), cdN = document.getElementById('cdNum');
  cdO.classList.add('show'); let secs = 10; cdN.textContent = secs;
  cdTimer = setInterval(() => {
    secs--; cdN.textContent = secs;
    if (secs <= 0) { clearInterval(cdTimer); cdO.classList.remove('show'); startRound(); }
  }, 1000);
}

function startRound() {
  if (cdTimer) clearInterval(cdTimer);
  cancelAnimationFrame(rafId);
  resetPriceEngine();
  crashPt = genCrash(); crashing = false; crashProg = 0; crashAnimAcc = 0;
  chartEvents = []; logicAcc = 0;
  document.getElementById('crashOverlay').classList.remove('show');
  document.getElementById('cdOverlay').classList.remove('show');
  document.getElementById('phPill').textContent   = 'LIVE';
  document.getElementById('phPill').className     = 'phase-pill live';
  document.getElementById('multDisp').textContent = '1.00x';
  document.getElementById('multDisp').className   = 'mult-overlay s';
  document.getElementById('buyBtn').disabled      = false;
  document.getElementById('buyBtn').textContent   = 'Buy ' + parseFloat(document.getElementById('betAmt').value).toFixed(3) + ' PUSH';
  phase = 'live'; mult = 1;
  playerIn = false; playerBet = 0; playerBuyMult = 1;
  resetPlayers(); renderLb();
  chat('System', 'New round! 🎯', true, G);
  lastTs = performance.now(); rafId = requestAnimationFrame(loop);
}

function placeBet() {
  if (playerIn) return;
  const amt = parseFloat(document.getElementById('betAmt').value);
  if (!amt || amt > balance) { chat('System', 'Not enough balance!', false, R); return; }
  balance -= amt; balance = parseFloat(balance.toFixed(3));
  playerBet = amt; playerBuyMult = mult; playerIn = true;
  document.getElementById('balDisp').textContent = balance.toFixed(3) + ' PUSH';
  document.getElementById('sellBtn').disabled    = false;
  document.getElementById('buyBtn').disabled     = true;
  document.getElementById('buyBtn').textContent  = 'In @ ' + mult.toFixed(2) + 'x';
  spawnEvent('buy', 'You', G, mult);
  chat('Parman', 'in @ ' + mult.toFixed(2) + 'x — ' + amt.toFixed(3) + ' PUSH 🎯', true, G);
}

function cashOut() {
  if (!playerIn) return;
  const ratio = mult / playerBuyMult, win = parseFloat((playerBet * ratio).toFixed(3));
  const profit = parseFloat((win - playerBet).toFixed(3));
  balance += win; balance = parseFloat(balance.toFixed(3));
  document.getElementById('balDisp').textContent = balance.toFixed(3) + ' PUSH';
  document.getElementById('sellBtn').disabled    = true;
  document.getElementById('buyBtn').disabled     = false;
  document.getElementById('buyBtn').textContent  = 'Buy ' + parseFloat(document.getElementById('betAmt').value).toFixed(3) + ' PUSH';
  spawnEvent('sell', 'You', G, mult);
  chat('Parman', 'CASHED ' + mult.toFixed(2) + 'x 🤑 ' + (profit >= 0 ? '+' : '') + profit.toFixed(3) + ' PUSH', profit >= 0, G);
  playerIn = false; playerBet = 0;
}

function setAuto(x) {
  autoSell = x;
  const d = document.getElementById('autoDisp');
  d.textContent = 'Auto: ' + x + 'x'; d.style.color = Y; d.style.borderColor = Y;
}
function clearAuto() {
  autoSell = null;
  const d = document.getElementById('autoDisp');
  d.textContent = 'Auto: Off'; d.style.color = ''; d.style.borderColor = '';
}
function adj(v) {
  const n = parseFloat(Math.max(0.001, (parseFloat(document.getElementById('betAmt').value) || 0) + v).toFixed(3));
  document.getElementById('betAmt').value = n;
  if (!playerIn) document.getElementById('buyBtn').textContent = 'Buy ' + n.toFixed(3) + ' PUSH';
}
function halfB() {
  const n = parseFloat(Math.max(0.001, (parseFloat(document.getElementById('betAmt').value) || 0.01) / 2).toFixed(3));
  document.getElementById('betAmt').value = n;
  if (!playerIn) document.getElementById('buyBtn').textContent = 'Buy ' + n.toFixed(3) + ' PUSH';
}
function dblB() {
  const n = parseFloat(Math.min(balance, (parseFloat(document.getElementById('betAmt').value) || 0.01) * 2).toFixed(3));
  document.getElementById('betAmt').value = n;
  if (!playerIn) document.getElementById('buyBtn').textContent = 'Buy ' + n.toFixed(3) + ' PUSH';
}
function maxB() {
  document.getElementById('betAmt').value = balance.toFixed(3);
  if (!playerIn) document.getElementById('buyBtn').textContent = 'Buy ' + balance.toFixed(3) + ' PUSH';
}

function resetPlayers() {
  plState = PLAYERS.map(p => ({
    ...p,
    target:   parseFloat((1.3 + Math.random() * 5).toFixed(2)),
    buyMult:  0, cashedAt: 0, profit: 0, active: true,
    buyDelay: Math.floor(Math.random() * 20) + 5,
  }));
}

// ============================================
//  CANDLE.PUSH — UI Helpers
// ============================================

function renderLb() {
  const b = document.getElementById('lbBody');
  b.innerHTML = '';

  // ── Player sendiri di atas (kalau lagi in) ──
  if (playerIn || (phase !== 'live' && playerBuyMult > 0)) {
    const curProfit = playerIn ? parseFloat((playerBet * (mult / playerBuyMult - 1)).toFixed(4)) : 0;
    const curPct    = playerIn ? ((curProfit / playerBet) * 100).toFixed(0) : 0;
    const pos       = curProfit >= 0;
    const you = document.createElement('div');
    you.className = 'lb-row';
    you.style.borderLeft = '2px solid var(--green)';
    you.style.background = 'rgba(0,230,118,0.04)';
    you.innerHTML = `
      <div class="lb-user">
        <div class="av" style="background:#00e67622;color:var(--green);font-size:7px">YOU</div>
        <div>
          <div class="lb-name" style="color:var(--green)">Parman</div>
          <div class="lb-bet">${playerBet.toFixed(3)} PUSH</div>
        </div>
      </div>
      <div style="text-align:right;line-height:1.3">
        <div style="font-family:var(--mono);font-weight:700;font-size:11px;color:${pos ? 'var(--green)' : 'var(--red)'}">${pos ? '+' : ''}${curProfit.toFixed(3)}</div>
        <div style="font-size:9px;color:var(--muted)">${pos ? '+' : ''}${curPct}% · in@${playerBuyMult.toFixed(2)}x</div>
        <div style="font-size:8px;margin-top:1px">
          <span style="background:#00e67618;color:var(--green);border:1px solid #00e67644;border-radius:3px;padding:0 4px;font-family:var(--mono)">● HOLD</span>
        </div>
      </div>`;
    b.appendChild(you);

    // divider
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:var(--border);margin:0';
    b.appendChild(sep);
  }

  // ── Bot players ──
  plState.forEach(p => {
    const d = document.createElement('div');
    d.className = 'lb-row';
    let ph;

    if (!p.buyMult) {
      // Belum buy
      ph = `<span style="font-size:9px;color:var(--muted);font-family:var(--mono)">waiting</span>`;

    } else if (p.cashedAt) {
      // Sudah sold — P&L berhenti, tanda SOLD
      const pos = p.profit >= 0;
      const pct = ((p.profit / p.bet) * 100).toFixed(0);
      ph = `<div style="text-align:right;line-height:1.3">
        <div style="font-family:var(--mono);font-weight:700;font-size:11px;color:${pos ? 'var(--green)' : 'var(--red)'}">${pos ? '+' : ''}${p.profit.toFixed(3)}</div>
        <div style="font-size:9px;color:${pos ? 'var(--green)' : 'var(--red)'};opacity:.65">${pos ? '+' : ''}${pct}% @ ${p.cashedAt.toFixed(2)}x</div>
        <div style="font-size:8px;margin-top:1px">
          <span style="background:${pos?'#00e67618':'#ff3d5718'};color:${pos?'var(--green)':'var(--red)'};border:1px solid ${pos?'#00e67644':'#ff3d5744'};border-radius:3px;padding:0 4px;font-family:var(--mono)">✓ SOLD</span>
        </div>
      </div>`;

    } else {
      // Masih HOLD — P&L jalan real-time
      const curProfit = parseFloat((p.bet * (mult / p.buyMult - 1)).toFixed(4));
      const curPct    = ((curProfit / p.bet) * 100).toFixed(0);
      const pos       = curProfit >= 0;
      ph = `<div style="text-align:right;line-height:1.3">
        <div style="font-family:var(--mono);font-weight:700;font-size:11px;color:${pos ? 'var(--green)' : 'var(--red)'}">${pos ? '+' : ''}${curProfit.toFixed(3)}</div>
        <div style="font-size:9px;color:var(--muted)">${pos ? '+' : ''}${curPct}% · in@${p.buyMult.toFixed(2)}x</div>
        <div style="font-size:8px;margin-top:1px">
          <span style="background:#ffd60018;color:var(--yellow);border:1px solid #ffd60044;border-radius:3px;padding:0 4px;font-family:var(--mono)">● HOLD</span>
        </div>
      </div>`;
    }

    d.innerHTML = `
      <div class="lb-user">
        <div class="av" style="background:${p.col}22;color:${p.col}">${p.name[0]}</div>
        <div>
          <div class="lb-name">${p.name}</div>
          <div class="lb-bet">${p.bet.toFixed(3)} PUSH</div>
        </div>
      </div>
      ${ph}`;
    b.appendChild(d);
  });
}

function renderLbFinal() {
  const b = document.getElementById('lbBody');
  b.innerHTML = '';

  // Player sendiri dulu
  if (playerBet > 0 || playerBuyMult > 1) {
    // kalau kena rug, profit negatif
    const finalProfit = playerIn ? -playerBet : 0;
    const pos = finalProfit >= 0;
    const you = document.createElement('div');
    you.className = 'lb-row';
    you.style.borderLeft = '2px solid var(--green)';
    you.style.background = 'rgba(0,230,118,0.04)';
    you.innerHTML = `
      <div class="lb-user">
        <div class="av" style="background:#00e67622;color:var(--green);font-size:7px">YOU</div>
        <div>
          <div class="lb-name" style="color:var(--green)">Parman</div>
          <div class="lb-bet">${playerBet.toFixed(3)} PUSH</div>
        </div>
      </div>
      <div style="text-align:right;line-height:1.3">
        <div style="font-family:var(--mono);font-weight:700;font-size:11px;color:${pos?'var(--green)':'var(--red)'}">${pos?'+':''}${finalProfit.toFixed(3)}</div>
        <div style="font-size:8px;margin-top:2px">
          <span style="background:#ff3d5718;color:var(--red);border:1px solid #ff3d5744;border-radius:3px;padding:0 4px;font-family:var(--mono)">💀 RUGGED</span>
        </div>
      </div>`;
    b.appendChild(you);
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:var(--border)';
    b.appendChild(sep);
  }

  plState.forEach(p => {
    const d = document.createElement('div');
    d.className = 'lb-row';
    let ph;

    if (!p.buyMult) {
      ph = `<span style="font-size:9px;color:var(--muted)">—</span>`;
    } else {
      const pos = p.profit >= 0;
      const pct = ((p.profit / p.bet) * 100).toFixed(0);
      const badge = p.cashedAt
        ? `<span style="background:${pos?'#00e67618':'#ff3d5718'};color:${pos?'var(--green)':'var(--red)'};border:1px solid ${pos?'#00e67644':'#ff3d5744'};border-radius:3px;padding:0 4px;font-family:var(--mono)">✓ SOLD</span>`
        : `<span style="background:#ff3d5718;color:var(--red);border:1px solid #ff3d5744;border-radius:3px;padding:0 4px;font-family:var(--mono)">💀 RUGGED</span>`;
      ph = `<div style="text-align:right;line-height:1.3">
        <div style="font-family:var(--mono);font-weight:700;font-size:11px;color:${pos?'var(--green)':'var(--red)'}">${pos?'+':''}${p.profit.toFixed(3)}</div>
        <div style="font-size:9px;color:${pos?'var(--green)':'var(--red)'};opacity:.65">${pos?'+':''}${pct}% · in@${p.buyMult.toFixed(2)}x</div>
        <div style="font-size:8px;margin-top:1px">${badge}</div>
      </div>`;
    }

    d.innerHTML = `
      <div class="lb-user">
        <div class="av" style="background:${p.col}22;color:${p.col}">${p.name[0]}</div>
        <div>
          <div class="lb-name">${p.name}</div>
          <div class="lb-bet">${p.bet.toFixed(3)} PUSH</div>
        </div>
      </div>
      ${ph}`;
    b.appendChild(d);
  });
}

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

function chat(u, t, w, col) {
  const b = document.getElementById('chatBody');
  const d = document.createElement('div');
  d.className = 'chat-msg';
  d.innerHTML = `<span class="chat-user" style="color:${col || '#aaa'}">${u}</span><span class="ct ${w ? 'w' : ''}">${t}</span>`;
  b.appendChild(d);
  if (b.children.length > 80) b.removeChild(b.children[0]);
  b.scrollTop = b.scrollHeight;
}

function initUI() {
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      chat('Parman', e.target.value.trim(), false, G);
      e.target.value = '';
    }
  });
  setInterval(() => {
    if (phase === 'live' && Math.random() < 0.32) {
      const i = Math.floor(Math.random() * BOTS.length);
      chat(BOTS[i], BMSGS[Math.floor(Math.random() * BMSGS.length)], false, BCOLS[i]);
    }
  }, 3500);
  setInterval(() => {
    document.getElementById('msLabel').textContent = (15 + Math.floor(Math.random() * 55)) + ' ms';
  }, 3000);
  [
    { u: 'lexor',       t: 'cashed 3x lets gooo 🎉',           w: true,  c: '#00bcd4' },
    { u: 'Ghostoption', t: 'i buy it rugs instant 💀',          w: false, c: '#ff6b9d' },
    { u: 'Rune',        t: 'diamond hands only 💎',             w: false, c: '#ff7043' },
    { u: 'Kairox',      t: 'one more round and i quit (lying)', w: false, c: '#7b68ee' },
  ].forEach(m => chat(m.u, m.t, m.w, m.c));
  updateHist();
}
