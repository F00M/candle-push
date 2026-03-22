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
