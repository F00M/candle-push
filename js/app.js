// ============================================
//  CANDLE.PUSH — Config & Constants
// ============================================

// Colors (mirrored from CSS vars for canvas use)
const G = '#00e676';  // green
const R = '#ff3d57';  // red
const Y = '#ffd600';  // yellow
const BG = '#0e1013'; // chart background

// Game tuning
const LOGIC_MS  = 130;  // ms per game logic tick (higher = slower)
const TPC       = 18;   // ticks per candle (higher = wider candles, slower formation)
const CRASH_ANI = 70;   // ms per crash animation step

// Crash point probability distribution
function genCrash() {
  const r = Math.random();
  if (r < 0.38) return parseFloat((1.0  + Math.random() * 0.55).toFixed(2));
  if (r < 0.62) return parseFloat((1.55 + Math.random() * 1.6 ).toFixed(2));
  if (r < 0.80) return parseFloat((3.2  + Math.random() * 8   ).toFixed(2));
  if (r < 0.93) return parseFloat((11   + Math.random() * 39  ).toFixed(2));
  return parseFloat((52 + Math.random() * 200).toFixed(2));
}

// Bot players config
const PLAYERS = [
  { name: 'Ghostoption', col: '#ff6b9d', bet: 0.10 },
  { name: 'Kairox',      col: '#7b68ee', bet: 0.02 },
  { name: 'Aldrin',      col: '#ffd600', bet: 0.08 },
  { name: 'lexor',       col: '#00bcd4', bet: 0.15 },
  { name: 'Rune',        col: '#ff7043', bet: 0.03 },
  { name: 'Onyx7',       col: '#ab47bc', bet: 0.06 },
];

// Bot chat messages
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

// Round history (initial dummy data)
let roundHist = [2.41, 1.07, 3.22, 1.21, 2.27, 1.42, 1.22, 1.08];
// ============================================
//  CANDLE.PUSH — Price Engine
//  Controls how the multiplier moves over time
// ============================================

let price    = 1;
let vel      = 0;
let momentum = 0;
let vol      = 0;
let subPhase = 'pump';
let subTick  = 0;
let subLen   = 0;

// Candle state
let candles = [];
let cO = 1, cH = 1, cL = 1, cC = 1, tic = 0;

// Scale for Y axis
let scaleMin = 0.6;
let scaleMax = 2.2;

/**
 * Pick next sub-phase (pump / sideways / pullback)
 * Velocity scales with current price for natural feel
 */
function nextSub() {
  const r  = Math.random();
  const p  = price;
  const sp = 1 + p * 0.08; // speed multiplier at higher prices

  if (p < 1.5) {
    if      (r < 0.52) { subPhase='pump';     subLen=12+Math.random()*18; vel= (0.007+Math.random()*0.009)*sp; }
    else if (r < 0.74) { subPhase='sideways'; subLen= 8+Math.random()*14; vel= (Math.random()-.5)*0.002; }
    else                { subPhase='pullback'; subLen= 8+Math.random()*10; vel=-(0.005+Math.random()*0.007)*sp; }
  } else if (p < 4) {
    if      (r < 0.50) { subPhase='pump';     subLen=10+Math.random()*14; vel= (0.01 +Math.random()*0.013)*sp; }
    else if (r < 0.66) { subPhase='sideways'; subLen= 6+Math.random()*10; vel= (Math.random()-.5)*0.003; }
    else                { subPhase='pullback'; subLen= 6+Math.random()*10; vel=-(0.008+Math.random()*0.01 )*sp; }
  } else {
    if      (r < 0.48) { subPhase='pump';     subLen= 8+Math.random()*10; vel= (0.014+Math.random()*0.018)*sp; }
    else if (r < 0.60) { subPhase='sideways'; subLen= 5+Math.random()* 8; vel= (Math.random()-.5)*0.005; }
    else                { subPhase='pullback'; subLen= 5+Math.random()* 8; vel=-(0.012+Math.random()*0.015)*sp; }
  }

  vol = 0.003 + price * 0.0015 + Math.random() * 0.005;
  subTick = 0;
}

/**
 * Advance price by one logic tick
 */
function stepPrice() {
  subTick++;
  if (subTick > subLen) nextSub();

  momentum = momentum * 0.86 + vel * 0.14;
  const noise = (Math.random() - .5) * 2 * vol;
  const spike = Math.random() < 0.03 ? ((Math.random() - .42) * 0.04 * price) : 0;

  price = Math.max(0.28, price + momentum + noise + spike);
  return price;
}

/**
 * Smooth scale tracking — keeps chart centered on current action
 */
function updateScale() {
  const all = [price, cH, cL];
  candles.slice(-30).forEach(c => { all.push(c.high, c.low); });
  const dMin  = Math.min(...all);
  const dMax  = Math.max(...all);
  const range = Math.max(0.5, dMax - dMin);
  const pad   = range * 0.3;
  scaleMin += (dMin - pad         - scaleMin) * 0.04;
  scaleMax += (dMax + pad * 1.25  - scaleMax) * 0.04;
}

/** Map a multiplier value to a canvas Y coordinate */
function toY(v) {
  return H - ((v - scaleMin) / (scaleMax - scaleMin)) * H;
}

/** Reset price engine for a new round */
function resetPriceEngine() {
  price    = 1; vel = 0.006; momentum = 0; vol = 0.004;
  tic      = 0; candles = [];
  cO = 1; cH = 1; cL = 1; cC = 1;
  scaleMin = 0.6; scaleMax = 2.2;
  nextSub();
}
// ============================================
//  CANDLE.PUSH — Chart Renderer
//  All canvas drawing logic lives here
// ============================================

let canvas, ctx, W, H;

// Buy/sell event bubbles on chart
let chartEvents = [];

// ── Canvas Setup ──────────────────────────────
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
  W = rect.width  || wrap.offsetWidth  || wrap.clientWidth;
  H = rect.height || wrap.offsetHeight || wrap.clientHeight;
  if (W < 10 || H < 10) { W = window.innerWidth - 360; H = 400; } // fallback
  canvas.width  = W;
  canvas.height = H;
  ctx = canvas.getContext('2d'); // always re-acquire after resize
}

window.addEventListener('resize', resizeCanvas);

// ── Candle sizing helpers ──────────────────────
function CW()   { return Math.min(14, Math.max(8, Math.floor(W / 70))); }
function CG()   { return Math.max(3,  Math.floor(CW() * 0.35)); }
function STEP() { return CW() + CG(); }

// ── Main render ───────────────────────────────
function render() {
  if (!ctx || !W || !H) return;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  drawGrid();
  drawCandles();
  if (phase === 'live' && !crashing) drawPriceLine();
  drawChartEvents();
}

// ── Grid ──────────────────────────────────────
function drawGrid() {
  const steps = 5;
  ctx.textAlign = 'right';
  for (let i = 0; i <= steps; i++) {
    const v = scaleMin + ((scaleMax - scaleMin) / steps) * i;
    const y = toY(v);
    if (y < 4 || y > H - 4) continue;

    ctx.strokeStyle = 'rgba(30,45,71,0.55)';
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(42, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(90,106,138,0.6)';
    ctx.font      = '8px Space Mono,monospace';
    ctx.fillText(v.toFixed(2) + 'x', 39, y + 3);
  }
  ctx.textAlign = 'left';
}

// ── Candles ───────────────────────────────────
function drawCandles() {
  const cw     = CW(), cs = STEP();
  const maxVis = Math.floor((W - 50) / cs);
  const formClose = crashing
    ? Math.max(0.28, cO - (cO - 0.28) * Math.min(1, crashProg))
    : cC;

  const forming = {
    open:    cO,
    high:    crashing ? Math.max(cH, cO) : Math.max(cH, formClose),
    low:     crashing ? Math.min(cL, formClose * 0.68) : cL,
    close:   formClose,
    forming: true,
  };

  const all = [...candles, forming];
  const vis = all.slice(-maxVis);

  vis.forEach((c, i) => {
    const x   = 44 + i * cs;
    const isG = c.close >= c.open;
    const col = (crashing && c.forming) ? R : (isG ? G : R);

    const oY = toY(c.open), cY = toY(c.close);
    const hY = toY(c.high), lY = toY(c.low);

    // Wick
    ctx.strokeStyle = col; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(x + cw/2, hY); ctx.lineTo(x + cw/2, lY); ctx.stroke();

    // Body
    const bTop = Math.min(oY, cY);
    const bH   = Math.max(2.5, Math.abs(oY - cY));
    ctx.globalAlpha = c.forming ? 1 : 0.88;
    ctx.fillStyle   = col;
    ctx.fillRect(x, bTop, cw, bH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 0.5;
    ctx.strokeRect(x, bTop, cw, bH);
  });
}

// ── Price line ────────────────────────────────
function drawPriceLine() {
  const y = toY(price);
  if (y < 0 || y > H) return;

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(0,230,118,0.28)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(42, y); ctx.lineTo(W - 2, y); ctx.stroke();
  ctx.setLineDash([]);

  const tag = mult.toFixed(4) + 'x';
  ctx.font = 'bold 9px Space Mono,monospace';
  const tw = ctx.measureText(tag).width + 12;
  ctx.fillStyle   = 'rgba(0,230,118,0.12)';
  ctx.fillRect(W - tw - 2, y - 8, tw, 15);
  ctx.strokeStyle = 'rgba(0,230,118,0.42)'; ctx.lineWidth = 0.5;
  ctx.strokeRect(W - tw - 2, y - 8, tw, 15);
  ctx.fillStyle = G;
  ctx.fillText(tag, W - tw + 2, y + 4);
}

// ── Buy / Sell event bubbles ──────────────────
function spawnEvent(type, name, col, atMult) {
  const cw     = CW(), cs = STEP();
  const maxVis = Math.floor((W - 50) / cs);
  const visIdx = Math.min(candles.length, maxVis - 1);
  const x      = 44 + visIdx * cs + cw / 2;
  const y      = toY(atMult);
  chartEvents.push({ type, name, col, atMult, x, y: Math.max(22, y), age: 0, maxAge: 280 });
}

function drawChartEvents() {
  chartEvents = chartEvents.filter(e => e.age < e.maxAge);

  chartEvents.forEach(e => {
    e.age++;
    const t      = e.age / e.maxAge;
    const alpha  = t < 0.08 ? t / 0.08 : t > 0.78 ? (1 - t) / 0.22 : 1;
    const dy     = -e.age * 0.16;
    const isBuy  = e.type === 'buy';
    const label  = (isBuy ? '▲ ' : '▼ ') + e.name + ' ' + e.atMult.toFixed(2) + 'x';

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 10px Fredoka,sans-serif';
    const tw  = ctx.measureText(label).width + 16;
    const bx  = Math.max(2, Math.min(W - tw - 2, e.x - tw / 2));
    const by  = e.y + dy;

    // Pill background
    ctx.fillStyle   = e.col + (isBuy ? '30' : '28');
    roundRect(ctx, bx, by - 12, tw, 18, 5); ctx.fill();
    ctx.strokeStyle = e.col + (isBuy ? 'cc' : '99');
    ctx.lineWidth   = isBuy ? 1.5 : 1;
    roundRect(ctx, bx, by - 12, tw, 18, 5); ctx.stroke();

    // Connector line to price level
    ctx.strokeStyle = e.col + '44'; ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(e.x, by + 8); ctx.lineTo(e.x, e.y + 4); ctx.stroke();
    ctx.setLineDash([]);

    // Label text
    ctx.fillStyle  = '#fff';
    ctx.textAlign  = 'center';
    ctx.fillText(label, bx + tw / 2, by + 2);
    ctx.textAlign  = 'left';
    ctx.restore();
  });
}

// ── Utility ───────────────────────────────────
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y,     x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x,     y + h, x,     y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}
// ============================================
//  CANDLE.PUSH — Game Logic
//  State machine: waiting → live → crashing → crashed → countdown → ...
// ============================================

// ── Game State ─────────────────────────────────
let balance       = 10;
let phase         = 'waiting';
let mult          = 1;
let playerBet     = 0;
let playerIn      = false;
let playerBuyMult = 1;
let autoSell      = null;
let crashPt       = 0;

// Animation state
let crashing      = false;
let crashProg     = 0;
let crashAnimAcc  = 0;
let cdTimer       = null;

// Loop timing
let rafId     = null;
let lastTs    = 0;
let logicAcc  = 0;

// Bot player state
let plState = [];

// ── Game Loop ──────────────────────────────────
function loop(ts) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(ts - lastTs, 250);
  lastTs = ts;

  if (phase === 'live') {
    logicAcc += dt;
    while (logicAcc >= LOGIC_MS) { logicAcc -= LOGIC_MS; gameTick(); }
  }

  if (crashing) {
    crashAnimAcc += dt;
    if (crashAnimAcc >= CRASH_ANI) { crashAnimAcc = 0; crashProg += 0.045; }
    if (crashProg >= 1.6) { crashing = false; phase = 'crashed'; finishCrash(); }
  }

  updateScale();
  render();
}

// ── Game Tick (called at LOGIC_MS rate) ───────
function gameTick() {
  price = stepPrice();
  mult  = parseFloat(price.toFixed(4));
  cC    = mult;
  cH    = Math.max(cH, mult + (Math.random() < 0.2  ? Math.random() * 0.06 * mult : 0));
  cL    = Math.min(cL, mult - (Math.random() < 0.15 ? Math.random() * 0.04 * mult : 0));

  tic++;
  if (tic >= TPC) {
    candles.push({ open: cO, high: cH, low: cL, close: cC });
    cO = mult; cH = mult; cL = mult; cC = mult; tic = 0;
  }

  // Bot player logic
  plState.forEach(p => {
    if (!p.active) return;
    // Delayed buy-in
    if (!p.buyMult && p.buyDelay > 0) {
      p.buyDelay--;
      if (p.buyDelay === 0) { p.buyMult = mult; spawnEvent('buy', p.name, p.col, mult); }
    }
    // Auto cashout at target
    if (p.buyMult && !p.cashedAt && mult >= p.target) {
      p.cashedAt = mult;
      p.profit   = parseFloat((p.bet * (mult / p.buyMult - 1)).toFixed(4));
      spawnEvent('sell', p.name, p.col, mult);
      chat(p.name, 'sold ' + mult.toFixed(2) + 'x! +' + p.profit.toFixed(3), true, p.col);
    }
  });

  if (autoSell && mult >= autoSell && playerIn) cashOut();
  if (mult >= crashPt) beginCrash();

  // Update multiplier display
  const d = document.getElementById('multDisp');
  d.textContent = mult.toFixed(2) + 'x';
  d.className   = 'mult-overlay ' + (mult < 3 ? 's' : mult < 8 ? 'd' : 'c');
  renderLb();
}

// ── Crash ─────────────────────────────────────
function beginCrash() {
  phase = 'crashing'; crashing = true; crashProg = 0; crashAnimAcc = 0;

  document.getElementById('phPill').textContent  = 'RUGGED';
  document.getElementById('phPill').className    = 'phase-pill crash';
  document.getElementById('multDisp').className  = 'mult-overlay c';
  document.getElementById('buyBtn').disabled     = true;
  document.getElementById('sellBtn').disabled    = true;

  if (playerIn) {
    spawnEvent('sell', 'You', G, mult);
    chat('System', 'RUGGED! -' + playerBet.toFixed(3) + ' PUSH 💀', false, R);
    playerIn = false; playerBet = 0;
    document.getElementById('balDisp').textContent = balance.toFixed(3) + ' PUSH';
  }

  plState.forEach(p => { if (p.active && !p.cashedAt && p.buyMult) p.profit = -p.bet; });

  // Push a big red dump candle
  candles.push({ open: cO, high: cH, low: Math.max(0.28, cO * 0.3), close: Math.max(0.3, cO * 0.36) });
  cO = Math.max(0.3, mult * 0.36); cH = cO; cL = Math.max(0.25, cO * 0.38); cC = cL;
}

function finishCrash() {
  cancelAnimationFrame(rafId);
  document.getElementById('crashAt').textContent = mult.toFixed(2) + 'x';
  document.getElementById('crashOverlay').classList.add('show');

  roundHist.unshift(parseFloat(mult.toFixed(2)));
  if (roundHist.length > 8) roundHist.pop();
  updateHist();
  renderLbFinal();

  let secs = 10;
  document.getElementById('crashCd').textContent = 'Next round in ' + secs + 's...';
  cdTimer = setInterval(() => {
    secs--;
    document.getElementById('crashCd').textContent = 'Next round in ' + secs + 's...';
    if (secs <= 0) {
      clearInterval(cdTimer);
      document.getElementById('crashOverlay').classList.remove('show');
      startCountdown();
    }
  }, 1000);
}

// ── Countdown ─────────────────────────────────
function startCountdown() {
  phase = 'waiting';
  document.getElementById('phPill').textContent = 'WAITING';
  document.getElementById('phPill').className   = 'phase-pill wait';
  document.getElementById('multDisp').textContent = '1.00x';
  document.getElementById('multDisp').className   = 'mult-overlay s';
  document.getElementById('buyBtn').disabled  = false;
  document.getElementById('sellBtn').disabled = true;
  playerIn = false; playerBet = 0; chartEvents = [];

  const cdO = document.getElementById('cdOverlay');
  const cdN = document.getElementById('cdNum');
  cdO.classList.add('show');
  let secs = 10; cdN.textContent = secs;
  cdTimer = setInterval(() => {
    secs--; cdN.textContent = secs;
    if (secs <= 0) { clearInterval(cdTimer); cdO.classList.remove('show'); startRound(); }
  }, 1000);
}

// ── New Round ─────────────────────────────────
function startRound() {
  if (cdTimer) clearInterval(cdTimer);
  cancelAnimationFrame(rafId);

  resetPriceEngine();
  crashPt      = genCrash();
  crashing     = false; crashProg = 0; crashAnimAcc = 0;
  chartEvents  = []; logicAcc = 0;

  document.getElementById('crashOverlay').classList.remove('show');
  document.getElementById('cdOverlay').classList.remove('show');
  document.getElementById('phPill').textContent   = 'LIVE';
  document.getElementById('phPill').className     = 'phase-pill live';
  document.getElementById('multDisp').textContent = '1.00x';
  document.getElementById('multDisp').className   = 'mult-overlay s';
  document.getElementById('buyBtn').disabled      = false;
  document.getElementById('buyBtn').textContent   = 'Buy ' + parseFloat(document.getElementById('betAmt').value).toFixed(3) + ' PUSH';

  phase = 'live'; mult = 1;
  resetPlayers();
  renderLb();
  chat('System', 'New round! 🎯', true, G);
  lastTs = performance.now();
  rafId  = requestAnimationFrame(loop);
}

// ── Bet Actions ───────────────────────────────
function placeBet() {
  if (playerIn) return;
  const amt = parseFloat(document.getElementById('betAmt').value);
  if (!amt || amt > balance) { chat('System', 'Not enough balance!', false, R); return; }

  balance       -= amt; balance = parseFloat(balance.toFixed(3));
  playerBet      = amt;
  playerBuyMult  = mult;
  playerIn       = true;

  document.getElementById('balDisp').textContent  = balance.toFixed(3) + ' PUSH';
  document.getElementById('sellBtn').disabled      = false;
  document.getElementById('buyBtn').disabled       = true;
  document.getElementById('buyBtn').textContent    = 'In @ ' + mult.toFixed(2) + 'x';

  spawnEvent('buy', 'You', G, mult);
  chat('Parman', 'in @ ' + mult.toFixed(2) + 'x — ' + amt.toFixed(3) + ' PUSH 🎯', true, G);
}

function cashOut() {
  if (!playerIn) return;
  const ratio  = mult / playerBuyMult;
  const win    = parseFloat((playerBet * ratio).toFixed(3));
  const profit = parseFloat((win - playerBet).toFixed(3));

  balance += win; balance = parseFloat(balance.toFixed(3));
  document.getElementById('balDisp').textContent  = balance.toFixed(3) + ' PUSH';
  document.getElementById('sellBtn').disabled      = true;
  document.getElementById('buyBtn').disabled       = false;
  document.getElementById('buyBtn').textContent    = 'Buy ' + parseFloat(document.getElementById('betAmt').value).toFixed(3) + ' PUSH';

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

// ── Bet amount helpers ─────────────────────────
function adj(v) {
  let c = parseFloat(document.getElementById('betAmt').value) || 0;
  const n = parseFloat(Math.max(0.001, c + v).toFixed(3));
  document.getElementById('betAmt').value = n;
  if (!playerIn) document.getElementById('buyBtn').textContent = 'Buy ' + n.toFixed(3) + ' PUSH';
}
function halfB() {
  const c = parseFloat(document.getElementById('betAmt').value) || 0.01;
  const n = parseFloat(Math.max(0.001, c / 2).toFixed(3));
  document.getElementById('betAmt').value = n;
  if (!playerIn) document.getElementById('buyBtn').textContent = 'Buy ' + n.toFixed(3) + ' PUSH';
}
function dblB() {
  const c = parseFloat(document.getElementById('betAmt').value) || 0.01;
  const n = parseFloat(Math.min(balance, c * 2).toFixed(3));
  document.getElementById('betAmt').value = n;
  if (!playerIn) document.getElementById('buyBtn').textContent = 'Buy ' + n.toFixed(3) + ' PUSH';
}
function maxB() {
  document.getElementById('betAmt').value = balance.toFixed(3);
  if (!playerIn) document.getElementById('buyBtn').textContent = 'Buy ' + balance.toFixed(3) + ' PUSH';
}

// ── Players ───────────────────────────────────
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
