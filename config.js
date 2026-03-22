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
