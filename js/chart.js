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
