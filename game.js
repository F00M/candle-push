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
