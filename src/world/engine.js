/* eslint-disable */
// Pixel forest engine (canvas, no dependencies). Ported from the original Habitat prototype.
// The app feeds it a World (src/domain/world.ts); the engine only draws and animates it.
// Typed boundary: engine.d.ts
/* =========================================================
   Grundlagen
   ========================================================= */
var VW = 240, VH = 150, WW = 480, TILE = 4, COLS = WW / TILE;
var REDUCED = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function hash(x, y, s) {
  var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var rgbCache = {};
function rgb(h) { var c = rgbCache[h]; if (c) return c; var n = parseInt(h.slice(1), 16); c = [n >> 16 & 255, n >> 8 & 255, n & 255]; rgbCache[h] = c; return c; }
function hex(c) { return "#" + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
function shade(a, f) { return f < 0 ? mix(a, "#000000", -f) : mix(a, "#ffffff", f); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function makeCanvas(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }

// Pixel-Raster -> Sprite (mit automatischer Kontur)
function Grid(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
Grid.prototype.set = function (x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; };
Grid.prototype.get = function (x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : null; };
Grid.prototype.rect = function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c); };

function finishSprite(g, outline, ax, ay) {
  var o = new Grid(g.w, g.h), x, y;
  for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) {
    var c = g.get(x, y);
    if (c) o.set(x, y, c);
    else if (outline && (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1))) o.set(x, y, outline);
  }
  var minX = o.w, minY = o.h, maxX = -1, maxY = -1;
  for (y = 0; y < o.h; y++) for (x = 0; x < o.w; x++) if (o.get(x, y)) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  if (maxX < 0) { minX = minY = 0; maxX = maxY = 0; }
  var w = maxX - minX + 1, h = maxY - minY + 1, cv = makeCanvas(w, h), cx = cv.getContext("2d"), img = cx.createImageData(w, h);
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var col = o.get(x + minX, y + minY);
    if (col) { var p = rgb(col), i = (y * w + x) * 4; img.data[i] = p[0]; img.data[i + 1] = p[1]; img.data[i + 2] = p[2]; img.data[i + 3] = 255; }
  }
  cx.putImageData(img, 0, 0);
  var fl = makeCanvas(w, h), fx = fl.getContext("2d"); fx.translate(w, 0); fx.scale(-1, 1); fx.drawImage(cv, 0, 0);
  return { cv: cv, cvL: fl, w: w, h: h, ax: ax - minX, ay: ay - minY };
}

function fromRows(rows, pal, outline) {
  var w = 0; rows.forEach(function (r) { w = Math.max(w, r.length); });
  var g = new Grid(w + 2, rows.length + 2);
  rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r[x]; if (ch !== "." && pal[ch]) g.set(x + 1, y + 1, pal[ch]); } });
  return finishSprite(g, outline, (w + 2) / 2, rows.length + 1);
}
function scaled(sp, f) {
  var w = Math.max(2, Math.round(sp.w * f)), h = Math.max(2, Math.round(sp.h * f));
  var src = sp.cv.getContext("2d").getImageData(0, 0, sp.w, sp.h).data;
  var cv = makeCanvas(w, h), cx = cv.getContext("2d"), img = cx.createImageData(w, h);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var sx = Math.min(sp.w - 1, Math.floor(x / f)), sy = Math.min(sp.h - 1, Math.floor(y / f)), si = (sy * sp.w + sx) * 4, di = (y * w + x) * 4;
    img.data[di] = src[si]; img.data[di + 1] = src[si + 1]; img.data[di + 2] = src[si + 2]; img.data[di + 3] = src[si + 3];
  }
  cx.putImageData(img, 0, 0);
  var fl = makeCanvas(w, h), fx = fl.getContext("2d"); fx.translate(w, 0); fx.scale(-1, 1); fx.drawImage(cv, 0, 0);
  return { cv: cv, cvL: fl, w: w, h: h, ax: sp.ax * f, ay: h - 1 };
}

/* =========================================================
   Tiere
   ========================================================= */
var SPECIES = [
  { id: "squirrel", at: 2, name: "Eichhörnchen", baby: "Eichhörnchen-Junges", speed: 16, hop: true,
    c: { main: "#b5562b", light: "#d77d48", dark: "#7f3a1a", belly: "#f0dcc0" },
    q: { bl: 5, bh: 3, leg: 1, lw: 1, hw: 3, hh: 3, sw: 1, sh: 1, hy: 0, ear: "point", earH: 1, tail: "squirrel", tl: 4 } },
  { id: "hare", at: 5, name: "Schneeschuhhase", baby: "Häschen", speed: 18, hop: true,
    c: { main: "#8b6f52", light: "#a98d6e", dark: "#614b37", belly: "#e8e0d0" },
    winter: { main: "#eef2f6", light: "#ffffff", dark: "#b8c4d4", belly: "#ffffff" },
    q: { bl: 6, bh: 4, leg: 2, lw: 1, hw: 3, hh: 3, sw: 1, sh: 2, hy: 0, ear: "long", earH: 4, tail: "stub" } },
  { id: "beaver", at: 8, name: "Biber", baby: "Biberjunges", speed: 8, habitat: "lake",
    c: { main: "#6e4527", light: "#8a5a35", dark: "#4a2d17", snout: "#4a2d17" },
    q: { bl: 8, bh: 4, leg: 1, lw: 1, hw: 3, hh: 3, sw: 1, sh: 2, hy: 3, ear: "round", tail: "flat", tl: 4, teeth: true } },
  { id: "fox", at: 12, name: "Rotfuchs", baby: "Fuchswelpe", speed: 22,
    c: { main: "#d9692b", light: "#f08c48", dark: "#a2461a", belly: "#f6eadb", leg: "#2e1d14" },
    q: { bl: 8, bh: 3, leg: 3, lw: 1, hw: 3, hh: 3, sw: 2, sh: 1, hy: 1, ear: "point", earH: 2, tail: "bushy", tl: 6 } },
  { id: "loon", at: 17, name: "Eistaucher", baby: "Küken", kind: "loon", speed: 5, migrates: true },
  { id: "eagle", at: 23, name: "Weißkopfseeadler", baby: "Adlerküken", kind: "eagle", speed: 18 },
  { id: "deer", at: 30, name: "Weißwedelhirsch", baby: "Kitz", speed: 18,
    c: { main: "#a8794b", light: "#c39465", dark: "#74522f", belly: "#efe4d2", leg: "#8a6440", hoof: "#2a1a10" },
    q: { bl: 9, bh: 4, leg: 6, lw: 1, hw: 3, hh: 3, sw: 2, sh: 1, neckX: 2, neckY: 3, nw: 2, ear: "point", earH: 2, tail: "short", antler: "deer", spots: true } },
  { id: "wolf", at: 38, name: "Grauwolf", baby: "Wolfswelpe", speed: 20,
    c: { main: "#7d7f86", light: "#a6a8b0", dark: "#4f5157", belly: "#d6d6d2" },
    q: { bl: 10, bh: 4, leg: 4, lw: 1, hw: 4, hh: 3, sw: 2, sh: 2, hy: 1, ear: "point", earH: 2, tail: "wolf", tl: 5 } },
  { id: "elk", at: 48, name: "Wapiti (Elk)", baby: "Wapitikalb", speed: 14,
    c: { main: "#b48555", light: "#c99c6b", dark: "#5a3b22", neck: "#5e3d23", leg: "#4a3020", rump: "#ead8b2", hoof: "#1e140c" },
    q: { bl: 11, bh: 5, leg: 7, lw: 2, hw: 4, hh: 3, sw: 2, sh: 2, neckX: 2, neckY: 4, nw: 3, ear: "point", earH: 2, tail: "none", antler: "elk", spots: true } },
  { id: "blackbear", at: 60, name: "Schwarzbär", baby: "Bärenjunges", speed: 10, hibernate: true,
    c: { main: "#26232b", light: "#3b3742", dark: "#16141a", snout: "#a88a64" },
    q: { bl: 12, bh: 6, leg: 4, lw: 2, hw: 4, hh: 4, sw: 2, sh: 2, hy: 2, ear: "round", tail: "stub", hump: 1 } },
  { id: "moose", at: 75, name: "Elch (Moose)", baby: "Elchkalb", speed: 10,
    c: { main: "#4a3222", light: "#634433", dark: "#2c1d13", leg: "#9a8f80", snout: "#3a271a", hoof: "#2a2420" },
    q: { bl: 13, bh: 6, leg: 9, lw: 2, hw: 5, hh: 4, sw: 3, sh: 3, neckX: 2, neckY: 3, nw: 3, ear: "point", earH: 2, tail: "stub", antler: "moose", hump: 2, bell: true } },
  { id: "grizzly", at: 90, name: "Grizzly", baby: "Grizzlyjunges", speed: 9, hibernate: true,
    c: { main: "#8a5a32", light: "#b27c4a", dark: "#5c3a1d", snout: "#c49b69" },
    q: { bl: 14, bh: 7, leg: 4, lw: 2, hw: 5, hh: 4, sw: 2, sh: 2, hy: 2, ear: "round", tail: "stub", hump: 3 } }
];
var AURORA_AT = 110;
var BYID = {}; SPECIES.forEach(function (s) { BYID[s.id] = s; });

var ANTLERS = {
  deer: [[0,0],[0,-1],[-1,-2],[-1,-3],[0,-4],[1,-4],[2,-4],[3,-3],[0,-5],[2,-5]],
  elk: [[0,0],[0,-1],[-1,-2],[-1,-3],[-2,-4],[-2,-5],[-3,-6],[-3,-7],[-4,-8],[-4,-9],[-5,-10],[1,-1],[2,-1],[0,-3],[1,-4],[-1,-6],[0,-7],[-2,-8],[-1,-9]],
  moose: [[0,0],[0,-1],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[-5,-4],[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[-5,-5],[-3,-5],[-1,-5],[1,-5],[3,-4]]
};

// Vierbeiner-Generator: baut aus Körper-Parametern ein Pixel-Sprite. stage 0 = Baby, 1 = jung, 2 = ausgewachsen
function quadSprite(sp, stage, frame, season) {
  var c = (season === "winter" && sp.winter) ? sp.winter : sp.c, q = sp.q;
  var k = [0.55, 0.78, 1][stage], kh = k + (1 - k) * 0.45, kl = k + (1 - k) * 0.5;
  function S(v, m, f) { return Math.max(m, Math.round(v * (f || k))); }
  var BL = S(q.bl, 3), BH = S(q.bh, 2), L = S(q.leg, 1, kl), LW = stage === 2 ? q.lw : 1;
  var HW = S(q.hw, 2, kh), HH = S(q.hh, 2, kh), SW = q.sw ? S(q.sw, 1, kh) : 0, SH = q.sh ? Math.min(HH, S(q.sh, 1, kh)) : 0;
  var NX = q.neckX ? S(q.neckX, 1) : 0, NY = q.neckY ? S(q.neckY, 1) : 0, NW = q.nw ? S(q.nw, 1) : 0;
  var g = new Grid(64, 64), G = 54, X0 = 22, bBot = G - L, bTop = bBot - BH + 1;
  var legC = c.leg || c.dark, farC = shade(legC, -0.3), white = "#f4efe6", i, j;

  // Schwanz
  var TL = q.tl ? S(q.tl, 2) : 0;
  if (q.tail === "squirrel") {
    var tw = stage === 2 ? 3 : 2;
    for (j = bTop - TL; j <= bBot; j++) { g.rect(X0 - tw, j, tw, 1, c.main); g.set(X0 - tw, j, c.light); }
    g.rect(X0 - tw + 1, bTop - TL - 1, tw, 1, c.light); g.set(X0, bTop - TL, c.main);
  } else if (q.tail === "bushy" || q.tail === "wolf") {
    for (i = 0; i < TL; i++) {
      var drop = q.tail === "wolf" ? (i > TL * 0.4 ? 1 : 0) + (i > TL * 0.8 ? 1 : 0) : (i > TL * 0.5 ? 1 : 0);
      var tipC = q.tail === "bushy" ? white : c.dark;
      var col = i >= TL - 2 ? tipC : (i === 0 ? c.main : c.main);
      g.rect(X0 - 1 - i, bTop + drop, 1, 2, col);
      if (i > 0 && i < TL - 1) g.set(X0 - 1 - i, bTop + drop, i % 2 ? c.light : c.main);
    }
  } else if (q.tail === "short") { g.set(X0 - 1, bTop, white); g.set(X0 - 1, bTop + 1, c.main); }
  else if (q.tail === "stub") { g.set(X0 - 1, bTop + 1, c.main); }
  else if (q.tail === "flat") { g.rect(X0 - TL, bBot - 1, TL, 2, "#3b2a20"); g.set(X0 - TL, bBot - 1, null); g.set(X0 - 2, bBot, "#2c1f17"); }

  // Beine (hinten, vorne; jeweils fernes und nahes Bein)
  function leg(x, phase, near) {
    var colL = near ? legC : farC;
    for (var r = 0; r < L; r++) {
      var y = bBot + 1 + r, off = 0;
      if (frame && r >= Math.floor(L / 2)) off = (near ? 1 : -1) * phase;
      g.rect(x + off, y, LW, 1, (c.hoof && r === L - 1) ? c.hoof : colL);
    }
  }
  var backX = X0 + 1, frontX = X0 + BL - 1 - LW;
  var two = BL >= 2 * (LW + 1) + 2;
  if (two) { leg(backX + 1, -1, false); leg(frontX + 1, 1, false); }
  leg(backX, 1, true); leg(frontX, -1, true);

  // Körper
  g.rect(X0, bTop, BL, BH, c.main);
  for (i = 0; i < BL; i++) g.set(X0 + i, bTop, c.light);
  if (BH >= 3) for (i = 1; i < BL - 1; i++) g.set(X0 + i, bBot, c.belly || c.dark);
  if (c.rump) { g.rect(X0, bTop, 2, Math.min(3, BH), c.rump); }
  if (BL >= 4 && BH >= 3) { g.set(X0, bTop, null); g.set(X0 + BL - 1, bTop, null); g.set(X0, bBot, null); }
  var hump = q.hump ? S(q.hump, 0) : 0;
  for (i = 0; i < hump; i++) {
    var hx0 = X0 + Math.round(BL * 0.45) + i, hx1 = X0 + Math.round(BL * 0.85) - i;
    for (var hx = hx0; hx <= hx1; hx++) g.set(hx, bTop - 1 - i, i === hump - 1 ? c.light : c.main);
    if (i === 0) for (hx = hx0; hx <= hx1; hx++) g.set(hx, bTop, c.main);
  }
  if (q.spots && stage === 0) for (i = 0; i < Math.floor(BL / 2) - 1; i++) g.set(X0 + 2 + i * 2, bTop + 1 + (i % 2), white);

  // Hals und Kopf
  var headLeft, headBottom;
  if (NY > 0) {
    for (j = 0; j <= NY; j++) g.rect(X0 + BL - NW - 1 + Math.round(j * NX / NY), bTop - j, NW, 1, c.neck || c.main);
    headLeft = X0 + BL - NW - 1 + NX; headBottom = bTop - NY;
  } else {
    headLeft = X0 + BL - 2; headBottom = bTop + Math.min(BH - 1, S(q.hy || 0, 0, kh) + HH - 1);
  }
  var headTop = headBottom - HH + 1;
  g.rect(headLeft, headTop, HW, HH, c.main);
  for (i = 0; i < HW; i++) g.set(headLeft + i, headTop, c.light);
  if (HW >= 3) g.set(headLeft, headTop, null);
  if (HW >= 3 && HH >= 3) g.set(headLeft + HW - 1, headTop, null);
  if (SW) { g.rect(headLeft + HW, headBottom - SH + 1, SW, SH, c.snout || c.main); g.set(headLeft + HW + SW - 1, headBottom - SH + 1, "#1a1210"); }
  if (q.teeth) g.set(headLeft + HW + SW - 1, headBottom + 1, "#f0e2a8");
  if (q.bell && stage === 2) g.rect(headLeft + 1, headBottom + 1, 1, 2, c.dark);
  g.set(HW >= 3 ? headLeft + HW - 2 : headLeft + HW - 1, headTop + 1, "#0d0907");

  // Ohren
  var earH = q.earH ? S(q.earH, 1, kh) : 0;
  if (q.ear === "point") {
    for (i = 0; i < earH; i++) g.set(headLeft + 1, headTop - 1 - i, i === earH - 1 ? c.dark : c.main);
    if (earH >= 2 && HW >= 3) g.set(headLeft + 2, headTop - 1, c.main);
  } else if (q.ear === "long") {
    for (i = 0; i < earH; i++) g.set(headLeft + (i >= 2 ? 0 : 1), headTop - 1 - i, i === earH - 1 ? c.dark : c.main);
    for (i = 0; i < earH - 1; i++) g.set(headLeft + (i >= 2 ? 1 : 2), headTop - 1 - i, shade(c.main, -0.15));
  } else if (q.ear === "round") {
    g.set(headLeft + 1, headTop - 1, c.main); if (HW >= 4) g.set(headLeft + 2, headTop - 1, c.dark);
  }

  // Geweih nur bei ausgewachsenen Tieren
  if (q.antler && stage === 2) {
    var ac = q.antler === "moose" ? "#cdb88d" : "#e7dcbd";
    ANTLERS[q.antler].forEach(function (p) { g.set(headLeft + 2 + p[0], headTop - 1 + p[1], ac); });
  }
  var outline = shade(c.dark, -0.55);
  var spr = finishSprite(g, outline, X0 + BL / 2, G);
  spr.legs = L;
  return spr;
}

var LOON_PAL = { k: "#121619", g: "#1d3b33", w: "#f2f4f5", r: "#c0262d", b: "#2b2f33" };
var LOON = fromRows([
  "........kkk...",
  ".......kgkrkbb",
  "........kkk...",
  "........wkw...",
  "kkwkwkwkkkk...",
  ".kkwkwkwkkk...",
  "..kkkkkkkk...."
], LOON_PAL, "#06080a");
var LOON_CHICK = fromRows([".cc.", "ccek", "ccc."], { c: "#6b625a", e: "#111111", k: "#2b2f33" }, "#241f1b");
var EAGLE_PAL = { d: "#2b1a0e", m: "#4f321c", l: "#6b4628", w: "#f6f5ef", y: "#f2c230" };
var EAGLE = [
  fromRows([
    "...............www..",
    "wwddddddddddmmmwwwwy",
    "wwwwmmmmmmmmmmmmwwyy",
    ".ww..lllllllmmm....."
  ], EAGLE_PAL, "#140b05"),
  fromRows([
    "..d.................",
    "..dd.d..............",
    "...ddddd............",
    "....ddddddd.........",
    ".....dddddddl..www..",
    "www...mmdddmmmwwwwy.",
    "wwwwmmmmmmmmmmmmwwyy",
    ".ww...mmmmmmmmm....."
  ], EAGLE_PAL, "#140b05"),
  fromRows([
    "...............www..",
    "www...mmmmmmmmmwwwwy",
    "wwwwmmmmmlllmmmmwwyy",
    ".ww....ddddddd......",
    ".......dddddd.......",
    "......ddddd.........",
    ".....ddd.d..........",
    "....d..............."
  ], EAGLE_PAL, "#140b05")
];
var NEST = fromRows(["..wc..cw..", ".wwwwwwww.", "nnmnnmnnmn", ".nnnnnnnn."], { n: "#6b4a2b", m: "#8a6a40", w: "#e9e4da", c: "#f2c230" }, "#2a1a0e");

var spriteCache = {};
function animalSprite(spId, stage, frame, season) {
  var sp = BYID[spId], wkey = (season === "winter" && sp.winter) ? "w" : "";
  var key = spId + stage + frame + wkey;
  if (spriteCache[key]) return spriteCache[key];
  var s;
  if (sp.kind === "loon") s = stage === 0 ? LOON_CHICK : stage === 1 ? scaled(LOON, 0.75) : LOON;
  else if (sp.kind === "eagle") s = stage === 2 ? EAGLE[frame] : scaled(EAGLE[frame], stage === 1 ? 0.72 : 0.5);
  else s = quadSprite(sp, stage, frame, season);
  spriteCache[key] = s;
  return s;
}

/* =========================================================
   Bäume (eine pro Gewohnheit)
   ========================================================= */
function treeHeight(s) { return Math.min(86, Math.round(9 + 12.5 * Math.log2(1 + s))); }
function treeStageName(s, had) {
  if (s === 0) return had ? "Vertrocknet" : "Setzling";
  if (s < 3) return "Spross"; if (s < 7) return "Junger Baum"; if (s < 14) return "Baum"; if (s < 30) return "Großer Baum"; return "Uralter Baum";
}
var LEAVES = {
  summer: [["#3f8a3a", "#62ad4a", "#2a6530"]],
  spring: [["#5ea844", "#86c95a", "#3f8536"]],
  autumnMaple: [["#c2362b", "#e0573a", "#8a2219"], ["#d9772b", "#f09a3e", "#a35220"], ["#c2362b", "#e66a3b", "#8a2219"]],
  autumnBirch: [["#d9b02b", "#f0cf4a", "#a6821f"], ["#e0a32b", "#f5c34e", "#a8761e"]]
};

function addRoots(g, cx, base, h, seed) {
  var r = rng(seed * 7 + 3), n = 2 + Math.floor(h / 22), depth = Math.round(h * 0.22) + 2;
  for (var k = 0; k < n; k++) {
    var x = cx + (k % 2 ? 1 : -1) * (k > 1 ? 1 : 0), dir = k % 2 ? 1 : -1, len = Math.round(depth * (0.5 + r() * 0.5));
    for (var d = 0; d < len; d++) { g.set(x, base + 1 + d, "#4b301c"); if (r() < 0.55) x += dir; if (r() < 0.2) g.set(x - dir, base + 1 + d, "#4b301c"); }
  }
}

function pineGrid(h, seed, season) {
  var W = Math.ceil(h * 0.7) + 6, cx = Math.floor(W / 2), depth = Math.round(h * 0.22) + 3;
  var g = new Grid(W, h + depth + 2), base = h, tw = h < 14 ? 1 : h < 36 ? 2 : 3, th = Math.max(2, Math.round(h * 0.13));
  var trunk = "#5b3a24", trunkL = "#7a5032";
  g.rect(cx - Math.floor(tw / 2), Math.round(h * 0.3), tw, base - Math.round(h * 0.3) + 1, trunk);
  if (tw > 1) g.rect(cx - Math.floor(tw / 2), Math.round(h * 0.3), 1, base - Math.round(h * 0.3) + 1, trunkL);
  var fh = h - th, n = clamp(Math.round(h / 11), 2, 7);
  var pal = season === "winter" ? ["#2c5e44", "#3f7a55", "#1d4532"] : ["#2f6b3a", "#4a8a45", "#1e4a2c"];
  for (var t = 0; t < n; t++) {
    var yT = Math.floor(t * fh / (n + 1)) + 1, yB = Math.floor((t + 2) * fh / (n + 1));
    var maxH = Math.max(1, Math.round(h * 0.3 * (t + 2) / (n + 1)));
    for (var y = yT; y <= yB; y++) {
      var f = (y - yT + 1) / (yB - yT + 1), half = Math.round(maxH * f);
      if (y < yB && hash(y, t, seed) < 0.3) half = Math.max(0, half - 1);
      for (var x = cx - half; x <= cx + half; x++) {
        var col = pal[0];
        if (x <= cx - Math.ceil(half * 0.45)) col = pal[1];
        else if (x >= cx + Math.ceil(half * 0.4)) col = pal[2];
        if (y === yB) col = pal[2];
        g.set(x, y, col);
      }
    }
  }
  g.set(cx, 0, pal[1]);
  if (season === "winter") {
    for (var yy = 1; yy < base; yy++) for (var xx = 0; xx < W; xx++) {
      var cc = g.get(xx, yy);
      if (cc && cc !== trunk && cc !== trunkL && !g.get(xx, yy - 1)) { g.set(xx, yy, "#f2f6fb"); }
    }
  }
  addRoots(g, cx, base, h, seed);
  return { g: g, ax: cx, ay: base };
}

function broadleafGrid(h, seed, season, birch) {
  var W = Math.ceil(h * 0.8) + 8, cx = Math.floor(W / 2), depth = Math.round(h * 0.22) + 3;
  var g = new Grid(W, h + depth + 2), base = h, r = rng(seed * 13 + 1);
  var tw = h < 16 ? 1 : h < 40 ? 2 : 3;
  var trunk = birch ? "#e8e4dc" : "#5b3a24", trunkD = birch ? "#2a2522" : "#432a19";
  var topY = Math.round(h * 0.35);
  g.rect(cx - Math.floor(tw / 2), topY, tw, base - topY + 1, trunk);
  for (var y = topY; y <= base; y++) if (birch ? hash(cx, y, seed) < 0.22 : (tw > 1 && y % 3 === 0)) g.set(cx - Math.floor(tw / 2) + (birch ? Math.floor(hash(y, cx, seed) * tw) : tw - 1), y, trunkD);
  // Äste
  var nb = h < 16 ? 1 : 2 + Math.floor(h / 30), branchC = birch ? "#cfc9bd" : "#5b3a24", tips = [];
  for (var b = 0; b < nb; b++) {
    var sy = Math.round(topY + (base - topY) * (0.05 + 0.3 * r())), dir = b % 2 ? 1 : -1, bx = cx, by = sy, len = Math.round(h * (0.18 + 0.12 * r()));
    for (var s = 0; s < len; s++) { bx += dir * (r() < 0.6 ? 1 : 0); by -= r() < 0.7 ? 1 : 0; g.set(bx, by, branchC); }
    tips.push([bx, by]);
  }
  tips.push([cx, topY - 2]);
  if (season === "winter") {
    for (var t = 0; t < tips.length; t++) { g.set(tips[t][0], tips[t][1] - 1, branchC); g.set(tips[t][0] + 1, tips[t][1] - 2, branchC); g.set(tips[t][0], tips[t][1] - 2, "#f2f6fb"); }
    for (var yy = 1; yy < base; yy++) for (var xx = 0; xx < W; xx++) if (g.get(xx, yy) && !g.get(xx, yy - 1) && hash(xx, yy, seed) < 0.5 && yy < topY + 6) g.set(xx, yy - 1, "#f2f6fb");
  } else {
    var pals = season === "autumn" ? (birch ? LEAVES.autumnBirch : LEAVES.autumnMaple) : (season === "spring" ? LEAVES.spring : LEAVES.summer);
    var cyC = Math.round(h * (birch ? 0.32 : 0.3)), rad = h * (birch ? 0.2 : 0.26), blobs = [];
    var nBlobs = 3 + Math.floor(h / 20);
    for (var k = 0; k < nBlobs; k++) blobs.push({ x: cx + (r() - 0.5) * rad * (birch ? 1.0 : 1.5), y: cyC + (r() - 0.5) * rad * 1.1, r: rad * (0.55 + r() * 0.4), p: pals[Math.floor(r() * pals.length)] });
    blobs.push({ x: cx, y: cyC, r: rad * 0.8, p: pals[0] });
    for (var py = 0; py < base; py++) for (var px = 0; px < W; px++) {
      var hit = null;
      for (var bi = 0; bi < blobs.length; bi++) { var bb = blobs[bi], dx = px - bb.x, dy = (py - bb.y) * (birch ? 0.8 : 1.05); if (dx * dx + dy * dy <= bb.r * bb.r * (0.85 + hash(px, py, seed) * 0.3)) { hit = bb; break; } }
      if (!hit) continue;
      var rel = (px - cx) / (rad * 2) + (py - cyC) / (rad * 2), col = hit.p[0];
      if (rel < -0.18) col = hit.p[1]; else if (rel > 0.22) col = hit.p[2];
      var hv = hash(px, py, seed + 5);
      if (hv < 0.08) col = hit.p[2]; else if (hv > 0.93) col = hit.p[1];
      g.set(px, py, col);
    }
  }
  addRoots(g, cx, base, h, seed);
  return { g: g, ax: cx, ay: base };
}

function smallPlantGrid(dead) {
  var g = new Grid(9, 14), c = dead ? "#8a6a45" : "#5ea844";
  if (dead) { g.rect(4, 3, 1, 7, "#6b4a2b"); g.set(3, 4, "#6b4a2b"); g.set(2, 3, "#6b4a2b"); g.set(5, 5, "#6b4a2b"); g.set(6, 4, "#6b4a2b"); g.set(4, 2, "#6b4a2b"); }
  else { g.rect(4, 6, 1, 4, "#4a8a3a"); g.set(3, 6, c); g.set(2, 5, c); g.set(5, 7, c); g.set(6, 6, c); g.set(4, 5, "#86c95a"); }
  g.set(4, 10, "#4b301c"); g.set(3, 11, "#4b301c");
  return { g: g, ax: 4, ay: 9 };
}

var treeCache = {};
function treeSprite(type, s, had, season, seed) {
  var h = treeHeight(s), key = type + "|" + (s === 0 ? (had ? "dead" : "sprout") : h) + "|" + season + "|" + seed;
  if (treeCache[key]) return treeCache[key];
  var r = s === 0 ? smallPlantGrid(had) : type === "pine" ? pineGrid(h, seed, season) : broadleafGrid(h, seed, season, type === "birch");
  var spr = finishSprite(r.g, null, r.ax, r.ay);
  spr.h0 = s === 0 ? 8 : h;
  treeCache[key] = spr;
  return spr;
}
var TREE_TYPES = ["pine", "maple", "pine", "birch"];

/* =========================================================
   Gelände (Terraria-artige Blöcke)
   ========================================================= */
var surf = [], POOL0 = 78, POOL1 = 94, RIM, WATER_Y, DEN0 = 14, DEN1 = 27, DEN_ROW;
(function () {
  for (var c = 0; c < COLS; c++) surf[c] = 25 + Math.round(1.7 * Math.sin(c * 0.09 + 0.5) + 1.2 * Math.sin(c * 0.23 + 2.1) + 0.6 * Math.sin(c * 0.51));
  RIM = 25;
  for (c = POOL0 - 3; c <= POOL1 + 3; c++) surf[c] = RIM;
  for (c = POOL0; c <= POOL1; c++) surf[c] = RIM + 1 + Math.round(2 * Math.sin(Math.PI * (c - POOL0 + 0.5) / (POOL1 - POOL0 + 1)));
  for (c = 1; c < COLS; c++) { if (c >= POOL0 - 3 && c <= POOL1 + 4) continue; if (surf[c] - surf[c - 1] > 1) surf[c] = surf[c - 1] + 1; if (surf[c] - surf[c - 1] < -1) surf[c] = surf[c - 1] - 1; }
  WATER_Y = RIM * TILE + 2;
  DEN_ROW = 0; for (c = DEN0; c <= DEN1; c++) DEN_ROW = Math.max(DEN_ROW, surf[c]); DEN_ROW += 3;
})();
function colAt(x) { return clamp(Math.floor(x / TILE), 0, COLS - 1); }
function surfY(x) { return surf[colAt(x)] * TILE; }
function inPool(x) { var c = colAt(x); return c >= POOL0 && c <= POOL1; }
var POOL_X0 = POOL0 * TILE, POOL_X1 = (POOL1 + 1) * TILE;
var DEN_X0 = DEN0 * TILE, DEN_X1 = (DEN1 + 1) * TILE, DEN_FLOOR = (DEN_ROW + 4) * TILE;
function isCave(c, r) {
  if (c < DEN0 || c > DEN1) return false;
  var edge = c === DEN0 || c === DEN1;
  return r >= DEN_ROW + (edge ? 1 : 0) && r <= DEN_ROW + 3;
}

var GROUND = {
  summer: { g0: "#7cc94f", g1: "#5aa83c", g2: "#3f8a2e", blade: ["#5aa83c", "#7cc94f"], flowers: ["#f5d33b", "#ffffff", "#c86ad1"] },
  spring: { g0: "#8fd65a", g1: "#64b444", g2: "#46913a", blade: ["#64b444", "#8fd65a"], flowers: ["#f5d33b", "#ffffff", "#ff9ec0"] },
  autumn: { g0: "#a8b04a", g1: "#8a9a3c", g2: "#6b7a2e", blade: ["#8a9a3c", "#b3a447"], flowers: ["#d9772b", "#c2362b", "#e0b02b"] },
  winter: { g0: "#f4f8fd", g1: "#dde8f4", g2: "#b9cbe0", blade: ["#eef4fb"], flowers: [] }
};

function buildTerrain(season) {
  var cv = makeCanvas(WW, VH), cx = cv.getContext("2d"), img = cx.createImageData(WW, VH), d = img.data, G = GROUND[season];
  function put(x, y, col, a) { if (x < 0 || y < 0 || x >= WW || y >= VH) return; var p = rgb(col), i = (y * WW + x) * 4; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = a == null ? 255 : a; }
  var ROWS = Math.ceil(VH / TILE);
  for (var c = 0; c < COLS; c++) {
    var top = surf[c], pool = c >= POOL0 && c <= POOL1;
    for (var r = top; r < ROWS; r++) {
      var depth = r - top, cave = isCave(c, r);
      var stoneLine = 5 + Math.floor(hash(c, 3, 9) * 2.5);
      var type = cave ? "wall" : depth === 0 ? (pool ? "mud" : "grass") : depth < stoneLine ? "dirt" : "stone";
      for (var py = 0; py < TILE; py++) for (var px = 0; px < TILE; px++) {
        var X = c * TILE + px, Y = r * TILE + py, hv = hash(X, Y, 1), col;
        if (type === "grass") {
          if (py === 0) col = G.g0; else if (py === 1) col = G.g1;
          else col = hash(X, 7, 2) < (py === 2 ? 0.55 : 0.2) ? G.g2 : (hv < 0.15 ? "#5e3a20" : "#7a4e2d");
        } else if (type === "mud") col = hv < 0.25 ? "#3d3022" : "#4e3d2b";
        else if (type === "dirt") col = hv < 0.13 ? "#5e3a20" : hv > 0.9 ? "#946139" : "#7a4e2d";
        else if (type === "stone") {
          col = hv < 0.15 ? "#545862" : hv > 0.88 ? "#868b96" : "#6b6f7a";
          if (hash(Math.floor(X / 6), Math.floor(Y / 6), 4) < 0.07 && hv < 0.55) col = hv < 0.2 ? "#e39a55" : "#c8743a";
          if (hash(Math.floor(X / 5), Math.floor(Y / 5), 8) < 0.015 && hv < 0.4) col = "#5fe3d0";
        } else {
          col = hv < 0.2 ? "#2a1c12" : "#36251a";
          if (r === DEN_ROW + 3 && py >= 2) col = hv < 0.5 ? "#c9a55a" : "#a8873f";
        }
        if (type !== "grass" || py > 1) {
          if (px === TILE - 1 || py === TILE - 1) col = shade(col, -0.07);
        }
        var dark = clamp((Y - top * TILE) / (VH - top * TILE), 0, 1) * 0.5;
        if (type !== "grass" || py > 1) col = mix(col, "#0b0a12", dark);
        put(X, Y, col);
      }
    }
    // Gras, Blumen, Laub, Schnee oberhalb
    if (!pool) for (var px2 = 0; px2 < TILE; px2++) {
      var X2 = c * TILE + px2, Y0 = top * TILE, hv2 = hash(X2, 99, 3);
      if (season === "winter") { if (hv2 < 0.55) put(X2, Y0 - 1, "#eef4fb"); continue; }
      if (hv2 < 0.5) put(X2, Y0 - 1, G.blade[0]);
      if (hv2 < 0.22) put(X2, Y0 - 2, G.blade[G.blade.length - 1]);
      if (G.flowers.length && hash(X2, 5, 6) < (season === "autumn" ? 0.1 : 0.05)) put(X2, Y0 - (season === "autumn" ? 1 : 3), G.flowers[Math.floor(hash(X2, 6, 7) * G.flowers.length)]);
    }
  }
  // Höhleneingang oben über dem Bau ist zugewachsen: nur eine dunkle Spalte als Zugang
  cx.putImageData(img, 0, 0);
  return cv;
}

/* Parallax-Hintergrund */
function buildLayer(f, kind, season) {
  var w = Math.ceil(VW + (WW - VW) * f) + 2, cv = makeCanvas(w, VH), cx = cv.getContext("2d"), img = cx.createImageData(w, VH), d = img.data;
  function put(x, y, col) { if (x < 0 || y < 0 || x >= w || y >= VH) return; var p = rgb(col), i = (y * w + x) * 4; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255; }
  for (var x = 0; x < w; x++) {
    var top, col, snow;
    if (kind === "far") { top = Math.round(56 + 14 * Math.sin(x * 0.031 + 1) + 8 * Math.sin(x * 0.077 + 2.3) + 3 * Math.sin(x * 0.19)); col = "#9aaed2"; snow = season === "winter" ? 9 : (top < 54 ? 4 + Math.round((54 - top) * 0.6) : 0); }
    else if (kind === "near") { top = Math.round(70 + 12 * Math.sin(x * 0.045 + 0.3) + 7 * Math.sin(x * 0.11 + 1.7) + 2 * Math.sin(x * 0.3)); col = "#6377a3"; snow = season === "winter" ? 7 : (top < 64 ? 2 + Math.round((64 - top) * 0.5) : 0); }
    else { top = Math.round(88 + 4 * Math.sin(x * 0.05) + 2 * Math.sin(x * 0.13 + 1)); col = season === "winter" ? "#3a5a58" : "#2f4f45"; snow = 0; }
    for (var y = top; y < VH; y++) {
      var c2 = col;
      if (kind !== "hills") {
        if (y - top < snow && hash(x, y, 2) > (y - top) / (snow + 1) * 0.7) c2 = kind === "far" ? "#eef3fa" : "#dfe8f3";
        else if (hash(x, y, 3) < 0.06) c2 = shade(col, -0.08);
        if (x % 23 < 11 && kind === "near" && y - top > snow) c2 = shade(c2, -0.06);
      }
      put(x, y, c2);
    }
  }
  if (kind === "hills") {
    var r = rng(42);
    for (var tx = 0; tx < w; tx += 3 + Math.floor(r() * 3)) {
      var base = Math.round(88 + 4 * Math.sin(tx * 0.05) + 2 * Math.sin(tx * 0.13 + 1)) + 1, th = 7 + Math.floor(r() * 10);
      var broad = season !== "winter" && r() < 0.28;
      if (broad) {
        var bc = season === "autumn" ? ["#b8562b", "#c9862f", "#a8402a", "#d0a23a"][Math.floor(r() * 4)] : "#355e45";
        var rr = 3 + Math.floor(r() * 2);
        for (var by = -rr; by <= rr; by++) for (var bx = -rr; bx <= rr; bx++) if (bx * bx + by * by <= rr * rr) put(tx + bx, base - rr - 2 + by, hash(tx + bx, by, 5) < 0.2 ? shade(bc, -0.15) : bc);
      } else {
        for (var yy = 0; yy < th; yy++) { var half = Math.floor(yy * 0.38); for (var xx = -half; xx <= half; xx++) put(tx + xx, base - th + yy, season === "winter" && yy < th * 0.5 && xx === -half ? "#dfe8f3" : "#24413a"); }
      }
    }
  }
  cx.putImageData(img, 0, 0);
  return { cv: cv, f: f };
}

function buildCloud(seed) {
  var r = rng(seed), w = 22 + Math.floor(r() * 18), h = 10, g = new Grid(w, h + 2), puffs = [];
  for (var i = 0; i < 4; i++) puffs.push([4 + r() * (w - 8), 5 + r() * 3, 3 + r() * 3]);
  for (var y = 0; y < h + 2; y++) for (var x = 0; x < w; x++) {
    for (var p = 0; p < puffs.length; p++) { var dx = x - puffs[p][0], dy = y - puffs[p][1]; if (dx * dx + dy * dy * 1.6 <= puffs[p][2] * puffs[p][2] && y <= 9) { g.set(x, y, y >= 8 ? "#d7e2ef" : y <= 3 ? "#ffffff" : "#f3f7fb"); break; } }
  }
  return finishSprite(g, null, 0, 0);
}


/* =========================================================
   Hütte (Create) und Lichterkette (veröffentlichte Videos)
   ========================================================= */
var cabinCache = {};
function cabinSprite(stage, season) {
  var key = stage + season;
  if (cabinCache[key]) return cabinCache[key];
  var W = 44, H = 40, g = new Grid(W, H), base = H - 3, x0 = 8, w = 28, i, r, y;
  var log = "#8a5a32", logD = "#6b4325", logE = "#4a2d17", stone = "#80838c", stoneD = "#5d5f66";
  var roof = "#6b2b20", roofL = "#8a3a2a", door = "#3a2414", glass = "#2b3646", snow = "#eef4fb";
  var info = { window: null, chimney: null };
  if (stage === 0) {
    g.rect(x0 + 12, base - 9, 1, 10, logE);
    g.rect(x0 + 8, base - 10, 9, 4, log); g.rect(x0 + 9, base - 9, 7, 1, logE); g.rect(x0 + 9, base - 7, 5, 1, logE);
    for (i = 0; i < 4; i++) g.set(x0 + 2 + i * 7, base, logD);
  }
  if (stage >= 1) {
    g.rect(x0 - 1, base - 1, w + 2, 2, stone);
    for (i = 0; i < w + 2; i += 3) g.set(x0 - 1 + i, base - (i % 2), stoneD);
  }
  var wallH = stage >= 3 ? 12 : stage >= 2 ? 6 : 0;
  for (r = 0; r < wallH; r++) {
    y = base - 2 - r;
    g.rect(x0, y, w, 1, r % 2 ? logD : log);
    g.set(x0 - 1, y, logE); g.set(x0 + w, y, logE);
    if (r % 2 === 0) for (i = 3; i < w; i += 7) g.set(x0 + i, y, logD);
  }
  if (stage >= 3) {
    g.rect(x0 + 4, base - 9, 5, 7, door); g.set(x0 + 7, base - 5, "#c9a55a");
    g.rect(x0 + 16, base - 10, 7, 6, logE); g.rect(x0 + 17, base - 9, 5, 4, glass); g.rect(x0 + 19, base - 9, 1, 4, logE); g.rect(x0 + 17, base - 7, 5, 1, logE);
    info.window = { x: x0 + 17, y: base - 9, w: 5, h: 4 };
  }
  if (stage >= 4) {
    for (var k = 0; k < 11; k++) {
      y = base - 14 - k;
      var a = x0 - 3 + k + (k > 0 ? Math.floor(k * 0.5) : 0), b = x0 + w + 2 - k - (k > 0 ? Math.floor(k * 0.5) : 0);
      if (a > b) break;
      for (var xx = a; xx <= b; xx++) g.set(xx, y, k % 2 ? roof : roofL);
      if (season === "winter") { g.set(a, y, snow); g.set(b, y, snow); if (a + 1 >= b - 1) for (xx = a; xx <= b; xx++) g.set(xx, y, snow); }
    }
    g.rect(x0 - 3, base - 14, w + 6, 1, logE);
  }
  if (stage >= 5) {
    g.rect(x0 + w - 7, base - 26, 4, 10, stone); g.rect(x0 + w - 8, base - 27, 6, 1, stoneD);
    info.chimney = { x: x0 + w - 5, y: base - 28 };
  }
  if (stage >= 6) {
    g.rect(x0 + w + 1, base - 2, 6, 1, logD); g.rect(x0 + w + 6, base - 9, 1, 8, logE); g.rect(x0 + w + 1, base - 9, 6, 1, logE);
    for (i = 0; i < 3; i++) { g.rect(x0 - 7, base - 2 - i * 2, 5 - i, 2, i % 2 ? log : logD); g.set(x0 - 7, base - 2 - i * 2, "#c49a68"); }
  }
  var spr = finishSprite(g, stage === 0 ? null : "#24150b", x0 + w / 2, base);
  var dx = 0, dy = 0;
  // finishSprite crops; shift recorded info by the same offset as ax/ay
  dx = spr.ax - (x0 + w / 2); dy = spr.ay - base;
  if (info.window) info.window = { x: info.window.x + dx, y: info.window.y + dy, w: info.window.w, h: info.window.h };
  if (info.chimney) info.chimney = { x: info.chimney.x + dx, y: info.chimney.y + dy };
  spr.info = info;
  cabinCache[key] = spr;
  return spr;
}
var BULBS = ["#ffd36b", "#ff7b6b", "#7be0a5", "#7ab8ff", "#ffb35c"];

export function speciesIcon(id) {
  var sp = BYID[id];
  return animalSprite(id, 2, sp && sp.kind === "eagle" ? 1 : 0, "summer");
}

export function createWorld(canvas, bubble) {
  /* =========================================================
     Welt-Simulation
     ========================================================= */
  var cv = canvas, ctx = cv.getContext("2d");
  var fg = makeCanvas(VW, VH), fctx = fg.getContext("2d");
  ctx.imageSmoothingEnabled = false; fctx.imageSmoothingEnabled = false;
  var camX = 120, T = 0;
  var curSeason = null, terrain, layers, clouds = [], stars = [];
  var entities = [], particles = [], trees = [];
  var nestPos = null, geese = null, geeseTimer = 8;

  (function () { var r = rng(5); for (var i = 0; i < 70; i++) stars.push({ x: r() * VW, y: r() * 80, b: r(), p: r() * 6 }); for (i = 0; i < 6; i++) clouds.push({ s: buildCloud(100 + i), x: r() * (VW + 80) - 40, y: 6 + r() * 36, v: 1.2 + r() * 2.2 }); })();

  function ensureSeason() {
    var s = seasonNow();
    if (s === curSeason) return false;
    curSeason = s;
    particles = particles.filter(function (p) { return p.k !== "snow" && p.k !== "leaf" && p.k !== "fly"; });
    terrain = buildTerrain(s);
    layers = [buildLayer(0.1, "far", s), buildLayer(0.22, "near", s), buildLayer(0.5, "hills", s)];
    return true;
  }

  var GROVE_RANGE = { training: [18, 122], spanish: [186, 300], driving: [394, 474] };
  var CABIN_X = 152;
  var cabin = { stage: 0, videos: 0, title: "", sub: "" };
  var flowerCount = 0, auroraLevel = 0, world = null;

  function treeCount(n) { return n > 0 ? Math.min(6, 1 + Math.floor((n - 1) / 4)) : 0; }
  function layoutWorld(ws) {
    var list = [];
    ws.groves.forEach(function (gr, gi) {
      var range = GROVE_RANGE[gr.habit], n = gr.sessions, cnt = treeCount(n), order = [2, 3, 1, 4, 0, 5];
      if (!cnt) { list.push({ x: Math.round((range[0] + range[1]) / 2), type: gr.tree, s: 0, had: false, seed: gi * 97 + 5, label: gr.label, sub: "log a session to plant the first tree", grove: gr.habit }); return; }
      for (var i = 0; i < cnt; i++) {
        var slot = order[i], x = Math.round(range[0] + (range[1] - range[0]) * (slot + 0.5) / 6 + (hash(i, gi, 3) - 0.5) * 8);
        var growth = n - 4 * i;
        list.push({ x: x, type: gr.tree, s: growth, had: true, seed: gi * 97 + i * 13 + 5, label: gr.label, sub: n + (n === 1 ? " session" : " sessions") + (cnt >= 6 ? " · trees keep growing" : " · next tree at " + (cnt * 4 + 1)), grove: gr.habit });
      }
    });
    list.sort(function (a, b) { return b.s - a.s; });
    trees = list;
    var tallest = null;
    trees.forEach(function (t) { if (t.s >= 6 && (!tallest || t.s > tallest.s)) tallest = t; });
    nestPos = tallest ? { x: tallest.x, y: surfY(tallest.x) - Math.round(treeHeight(tallest.s) * 0.62) } : null;
  }

  function walkable(sp, x) {
    if (x < 6 || x > WW - 6) return false;
    if (sp.habitat === "lake") return x > POOL_X0 - 40 && x < POOL_X1 + 40;
    return !inPool(x) && !inPool(x + 4) && !inPool(x - 4);
  }
  function randomSpot(sp, inView) {
    for (var i = 0; i < 40; i++) { var x = inView ? camX + 12 + Math.random() * (VW - 24) : 10 + Math.random() * (WW - 20); if (walkable(sp, x)) return x; }
    return 40;
  }

  function modeFor(sp, s) {
    if (sp.kind === "loon") return s === "winter" ? "away" : "swim";
    if (sp.kind === "eagle") return "fly";
    if (sp.hibernate && s === "winter") return "den";
    return "walk";
  }

  function reconcile(fx) {
    var want = world ? world.population : [], map = {}, s = curSeason;
    want.forEach(function (w) { map[w.id] = w; });
    entities.forEach(function (e) {
      var w = map[e.id];
      if (!w) { if (!e.leaving) { e.leaving = true; e.exitDir = e.x - camX < VW / 2 ? -1 : 1; } return; }
      e.leaving = false;
      if (w.stage !== e.stage) { e.stage = w.stage; if (fx) burst(e, "sparkle"); }
      e.mode = modeFor(BYID[e.sp], s);
    });
    want.forEach(function (w) {
      if (entities.some(function (e) { return e.id === w.id; })) return;
      var sp = BYID[w.sp], mode = modeFor(sp, s), parent = w.kid ? entities.find(function (e) { return e.id === w.sp + "#0"; }) : null;
      var e = { id: w.id, sp: w.sp, stage: w.stage, kid: w.kid, mode: mode, dir: Math.random() < 0.5 ? -1 : 1, state: "idle", timer: Math.random() * 3, anim: 0, frame: 0, phase: Math.random() * 6, y: 0, spd: 0.8 + Math.random() * 0.4 };
      if (mode === "swim") e.x = POOL_X0 + 8 + Math.random() * (POOL_X1 - POOL_X0 - 16);
      else if (mode === "fly") e.x = fx ? camX + 20 + Math.random() * (VW - 40) : Math.random() * WW;
      else if (mode === "den") e.x = DEN_X0 + 8 + Math.random() * (DEN_X1 - DEN_X0 - 16);
      else if (parent && fx) e.x = parent.x - parent.dir * 6;
      else if (fx) { e.x = randomSpot(sp, true); e.state = "walk"; e.timer = 2; }
      else e.x = randomSpot(sp);
      if (mode === "fly" && fx) e.dir = 1;
      entities.push(e);
      if (fx) burst(e, w.kid ? "heart" : "sparkle");
    });
  }

  function burst(e, kind) {
    var spr = animalSprite(e.sp, e.stage, 0, curSeason), y = (e.y || surfY(e.x)) - spr.h;
    for (var i = 0; i < (kind === "heart" ? 3 : 6); i++) particles.push({ k: kind, x: e.x + (Math.random() - 0.5) * spr.w, y: y + Math.random() * 4, vx: (Math.random() - 0.5) * 6, vy: -8 - Math.random() * 6, life: 1.6, max: 1.6, world: true });
  }
  function treeBurst(t) {
    var h = treeHeight(t.s), y = surfY(t.x);
    for (var i = 0; i < 10; i++) particles.push({ k: "sparkle", x: t.x + (Math.random() - 0.5) * h * 0.5, y: y - Math.random() * h, vx: 0, vy: -6 - Math.random() * 4, life: 1.4, max: 1.4, world: true });
  }

  function update(dt) {
    T += dt;
    if (REDUCED) dt = 0;
    var s = curSeason;
    entities = entities.filter(function (e) {
      var sp = Object.assign({}, BYID[e.sp]); sp.speed *= e.spd || 1;
      var parent = e.kid ? entities.find(function (p) { return p.id === e.sp + "#0" && !p.leaving; }) : null;
      e.anim += dt;
      if (e.mode === "den" || e.mode === "away") { if (e.leaving) return false; e.x = clamp(e.x, DEN_X0 + 10, DEN_X1 - 10); e.y = DEN_FLOOR - 1; e.frame = 0; return true; }
      if (e.mode === "fly") {
        var follow = parent && e.stage < 2 ? parent : null;
        if (e.leaving) { e.x += e.exitDir * sp.speed * 1.5 * dt; e.dir = e.exitDir; return e.x > camX - 40 && e.x < camX + VW + 40 && e.x > -40 && e.x < WW + 40; }
        if (follow) { var tx = follow.x - follow.dir * (14 + e.kid * 8); e.x += clamp(tx - e.x, -1, 1) * sp.speed * 1.2 * dt; e.dir = follow.dir; e.y = follow.y + 4 + e.kid * 3; }
        else {
          e.x += e.dir * sp.speed * dt;
          if (e.x > WW + 30) e.dir = -1; if (e.x < -30) e.dir = 1;
          e.y = 26 + Math.sin(T * 0.4 + e.phase) * 7 + e.kid * 6;
        }
        var cyc = (T * 0.35 + e.phase) % 3;
        e.frame = cyc < 0.6 ? (Math.floor(T * 6) % 2 ? 1 : 2) : 0;
        return true;
      }
      if (e.mode === "swim") {
        e.timer -= dt;
        if (e.timer <= 0) { e.state = Math.random() < 0.5 ? "idle" : "walk"; e.dir = Math.random() < 0.5 ? -1 : 1; e.timer = 2 + Math.random() * 4; }
        if (parent && e.stage < 2) { var tx2 = parent.x - parent.dir * (e.stage === 0 ? 1 : 10 + e.kid * 6); e.x += clamp(tx2 - e.x, -1, 1) * sp.speed * 1.5 * dt; e.dir = parent.dir; }
        else if (e.state === "walk") { e.x += e.dir * sp.speed * dt; if (e.x < POOL_X0 + 8 || e.x > POOL_X1 - 8) { e.dir *= -1; e.x = clamp(e.x, POOL_X0 + 8, POOL_X1 - 8); } }
        if (e.leaving) return false;
        e.y = WATER_Y + 3 + Math.round(Math.sin(T * 2 + e.phase) * 0.6);
        return true;
      }
      // Laufen
      var moving = false;
      if (e.leaving) {
        e.dir = e.exitDir; e.x += e.dir * sp.speed * 1.3 * dt; moving = true;
        if (e.x < camX - 30 || e.x > camX + VW + 30 || e.x < -20 || e.x > WW + 20) return false;
      } else if (parent && e.stage < 2) {
        var target = parent.x - parent.dir * (5 + e.kid * 7);
        if (Math.abs(target - e.x) > 3) { e.dir = target > e.x ? 1 : -1; var nx = e.x + e.dir * sp.speed * 1.1 * dt; if (walkable(sp, nx)) { e.x = nx; moving = true; } }
        else e.dir = parent.dir;
      } else {
        e.timer -= dt;
        if (e.timer <= 0) {
          if (e.state === "walk" || Math.random() < 0.4) { e.state = "idle"; e.timer = 1.5 + Math.random() * 4; }
          else { e.state = "walk"; e.dir = Math.random() < 0.5 ? -1 : 1; e.timer = 1.5 + Math.random() * 4; }
        }
        if (e.state === "walk") {
          var nx2 = e.x + e.dir * sp.speed * dt;
          if (walkable(sp, nx2)) { e.x = nx2; moving = true; } else { e.dir *= -1; }
        }
      }
      if (moving) { e.frame = Math.floor(e.anim * (sp.speed / 4)) % 2; } else e.frame = 0;
      if (sp.habitat === "lake" && inPool(e.x)) e.y = WATER_Y + Math.round(animalSprite(e.sp, e.stage, 0, s).h * 0.45);
      else e.y = surfY(e.x) - 1 - (sp.hop && moving && e.frame ? 1 : 0);
      return true;
    });

    // Partikel
    particles = particles.filter(function (p) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === "leaf") { p.x += Math.sin(T * 2 + p.ph) * 6 * dt; if (p.y >= surfY(p.x) - 1) p.life = Math.min(p.life, 0.01); }
      if (p.k === "snow") { p.x += Math.sin(T + p.ph) * 4 * dt; if (p.y > VH) p.life = 0; }
      return p.life > 0;
    });
    if (!REDUCED) weather(dt);

    clouds.forEach(function (c) { c.x += c.v * dt; if (c.x > VW + 50) c.x = -c.s.w - 10; });
    if (s === "autumn" && dayFactor() > 0.5) {
      if (geese) { geese.x += 22 * dt; if (geese.x > VW + 60) geese = null; }
      else if ((geeseTimer -= dt) <= 0) { geese = { x: -30, y: 18 + Math.random() * 20 }; geeseTimer = 35 + Math.random() * 20; }
    }
  }

  function weather(dt) {
    var s = curSeason, nf = nightFactor();
    if (cabin.stage >= 5 && Math.random() < dt * 2.2) {
      var ci = cabinSprite(cabin.stage, s), ch = ci.info.chimney;
      if (ch) particles.push({ k: "smoke", x: CABIN_X - ci.ax + ch.x + 1, y: surfY(CABIN_X) - ci.ay - 1 + ch.y, vx: 2 + Math.random() * 2, vy: -5 - Math.random() * 2, life: 3, max: 3, world: true });
    }
    if (s === "autumn") {
      var src = trees.filter(function (t) { return t.type !== "pine" && t.s > 0 && t.x > camX - 20 && t.x < camX + VW + 20; });
      if (Math.random() < dt * (1.2 + src.length * 1.2)) {
        var t = src.length && Math.random() < 0.8 ? src[Math.floor(Math.random() * src.length)] : null;
        var h = t ? treeHeight(t.s) : 0;
        var pal = ["#c2362b", "#e0573a", "#d9772b", "#f09a3e", "#e0b02b"];
        particles.push({ k: "leaf", x: t ? t.x + (Math.random() - 0.5) * h * 0.5 : camX + Math.random() * VW, y: t ? surfY(t.x) - h * (0.5 + Math.random() * 0.4) : 0, vx: 2 + Math.random() * 3, vy: 7 + Math.random() * 6, life: 12, max: 12, c: pal[Math.floor(Math.random() * pal.length)], ph: Math.random() * 6, world: true });
      }
    }
    if (s === "winter" && particles.filter(function (p) { return p.k === "snow"; }).length < 70 && Math.random() < dt * 18) {
      particles.push({ k: "snow", x: Math.random() * VW, y: -2, vx: -1, vy: 10 + Math.random() * 8, life: 20, max: 20, ph: Math.random() * 6, world: false });
    }
    if ((s === "summer" || s === "spring") && nf > 0.5 && particles.filter(function (p) { return p.k === "fly"; }).length < 16) {
      particles.push({ k: "fly", x: camX + Math.random() * VW, y: 70 + Math.random() * 30, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 3, life: 6 + Math.random() * 6, max: 12, ph: Math.random() * 6, world: true });
    }
    if (s === "winter" && Math.random() < dt * 0.7 && entities.some(function (e) { return e.mode === "den"; })) {
      particles.push({ k: "zzz", x: DEN_X0 + 18 + Math.random() * 20, y: DEN_FLOOR - 12, vx: 3, vy: -4, life: 2.4, max: 2.4, world: true });
    }
  }

  /* Himmel & Licht */
  var SKY = [[0, "#070b22", "#141c44"], [5, "#070b22", "#141c44"], [6.5, "#34407e", "#f0a060"], [8, "#4f9ae0", "#bfe3f5"], [17, "#4f9ae0", "#bfe3f5"], [19, "#3a4a92", "#f08a5d"], [20.5, "#070b22", "#141c44"], [24, "#070b22", "#141c44"]];
  var NIGHT = [[0, 1], [5, 1], [6.5, 0.45], [8, 0], [17, 0], [19, 0.45], [20.5, 1], [24, 1]];
  function interp(tab, h, i) { for (var k = 0; k < tab.length - 1; k++) if (h >= tab[k][0] && h <= tab[k + 1][0]) { var f = (h - tab[k][0]) / (tab[k + 1][0] - tab[k][0]); return typeof tab[k][i] === "number" ? tab[k][i] + (tab[k + 1][i] - tab[k][i]) * f : mix(tab[k][i], tab[k + 1][i], f); } return tab[0][i]; }
  function nightFactor() { return interp(NIGHT, hourNow(), 1); }
  function dayFactor() { return 1 - nightFactor(); }

  function drawPixelDisc(c, cx, cy, r, col, col2) {
    for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) { c.fillStyle = (col2 && (x + y) < -r * 0.6) ? col2 : col; c.fillRect(cx + x, cy + y, 1, 1); }
  }

  function draw() {
    var hr = hourNow(), nf = nightFactor(), s = curSeason;
    var top = interp(SKY, hr, 1), bot = interp(SKY, hr, 2);
    // Himmel in Bändern
    for (var b = 0; b < 16; b++) { ctx.fillStyle = mix(top, bot, b / 15); ctx.fillRect(0, b * 7, VW, 7); }
    ctx.fillStyle = bot; ctx.fillRect(0, 112, VW, VH - 112);
    // Sterne
    if (nf > 0.05) stars.forEach(function (st) {
      var tw = 0.55 + 0.45 * Math.sin(T * 2 + st.p);
      ctx.globalAlpha = nf * tw * (0.4 + st.b * 0.6);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round((st.x - camX * 0.04 + VW) % VW), Math.round(st.y), 1, 1);
    });
    ctx.globalAlpha = 1;
    // Sonne / Mond
    if (hr >= 5.5 && hr <= 20.5) { var f = (hr - 5.5) / 15; drawPixelDisc(ctx, Math.round(20 + f * 200), Math.round(78 - Math.sin(f * Math.PI) * 58), 6, "#ffe27a", "#fff6c8"); }
    if (hr >= 19 || hr <= 7) { var mf = ((hr + 24 - 19) % 24) / 12; drawPixelDisc(ctx, Math.round(20 + mf * 200), Math.round(70 - Math.sin(mf * Math.PI) * 52), 5, "#e6e9f2", "#ffffff"); }
    // Polarlichter
    if (auroraLevel > 0 && nf > 0.2) {
      for (var x = 0; x < VW; x += 2) {
        var wx = x + camX * 0.08, y0 = 10 + Math.sin(wx * 0.045 + T * 0.35) * 7 + Math.sin(wx * 0.11 + T * 0.6) * 3, len = 18 + Math.sin(wx * 0.07 + T * 0.5) * 8;
        var a = nf * Math.min(1, 0.45 + auroraLevel * 0.12) * (0.55 + 0.45 * Math.sin(wx * 0.09 - T * 0.8));
        ctx.globalAlpha = a * 0.25; ctx.fillStyle = "#b48cff"; ctx.fillRect(x, Math.round(y0 - 6), 2, 6);
        ctx.globalAlpha = a * 0.55; ctx.fillStyle = "#46f2a4"; ctx.fillRect(x, Math.round(y0), 2, Math.round(len * 0.5));
        ctx.globalAlpha = a * 0.25; ctx.fillRect(x, Math.round(y0 + len * 0.5), 2, Math.round(len * 0.5));
      }
      ctx.globalAlpha = 1;
    }
    // Wolken
    clouds.forEach(function (c) { ctx.globalAlpha = 0.95 - nf * 0.7; ctx.drawImage(c.s.cv, Math.round(c.x), Math.round(c.y)); });
    ctx.globalAlpha = 1;

    // Vordergrund
    fctx.clearRect(0, 0, VW, VH);
    layers.forEach(function (L) { fctx.drawImage(L.cv, -Math.round(camX * L.f), 0); });
    if (geese) for (var gi = 0; gi < 7; gi++) {
      var off = [[0, 0], [-5, -2], [-10, -4], [-15, -6], [-5, 2], [-10, 4], [-15, 6]][gi], gx = Math.round(geese.x + off[0]), gy = Math.round(geese.y + off[1]), up = Math.floor(T * 5 + gi) % 2;
      fctx.fillStyle = "#2a2a30"; fctx.fillRect(gx, gy, 1, 1); fctx.fillRect(gx - 1, gy - up, 1, 1); fctx.fillRect(gx + 1, gy - up, 1, 1);
    }
    // fliegende Adler
    entities.forEach(function (e) { if (e.mode === "fly" && !(e.stage === 0 && nestPos)) drawEntity(e); });
    fctx.drawImage(terrain, -Math.round(camX), 0);
    drawFlowers();
    // Bäume (mit Wind in den oberen Pixelreihen)
    trees.forEach(function (t) {
      var spr = treeSprite(t.type, t.s, t.had, s, t.seed), bx = Math.round(t.x - camX - spr.ax), by = surfY(t.x) - spr.ay - 1;
      if (bx > VW || bx + spr.w < 0) return;
      var wind = REDUCED || t.s === 0 ? 0 : Math.round(Math.sin(T * 1.1 + t.seed) * (spr.h0 > 30 ? 1.2 : 0.7));
      var cut1 = Math.round(spr.ay * 0.35), cut2 = Math.round(spr.ay * 0.65);
      fctx.drawImage(spr.cv, 0, 0, spr.w, cut1, bx + wind, by, spr.w, cut1);
      fctx.drawImage(spr.cv, 0, cut1, spr.w, cut2 - cut1, bx + (wind > 0 ? 1 : wind < 0 ? -1 : 0) * (Math.abs(wind) > 1 ? 1 : 0), by + cut1, spr.w, cut2 - cut1);
      fctx.drawImage(spr.cv, 0, cut2, spr.w, spr.h - cut2, bx, by + cut2, spr.w, spr.h - cut2);
    });
    var cab = drawCabin();
    if (nestPos && entities.some(function (e) { return e.sp === "eagle"; })) {
      var nx = Math.round(nestPos.x - camX - NEST.ax), ny = Math.round(nestPos.y - NEST.ay);
      var chicks = entities.filter(function (e) { return e.sp === "eagle" && e.stage === 0; }).length;
      if (chicks) fctx.drawImage(NEST.cv, nx, ny);
    }
    // Tiere am Boden (große hinten)
    var ground = entities.filter(function (e) { return e.mode === "walk" || e.mode === "den"; });
    ground.sort(function (a, b) { return animalSprite(b.sp, b.stage, 0, s).h - animalSprite(a.sp, a.stage, 0, s).h; });
    ground.forEach(drawEntity);
    // Wasser
    entities.forEach(function (e) { if (e.mode === "swim" && !(e.stage === 0)) drawEntity(e); });
    entities.forEach(function (e) { if (e.mode === "swim" && e.stage === 0) { var p = entities.find(function (q) { return q.id === e.sp + "#0"; }); if (p) { var spr = animalSprite(e.sp, 0, 0, s); fctx.drawImage(p.dir > 0 ? spr.cv : spr.cvL, Math.round(p.x - camX - spr.ax - p.dir * (2 + e.kid * 3)), Math.round(p.y - 7 - spr.ay)); } } });
    drawWater();
    // Partikel in der Welt
    particles.forEach(function (p) { if (p.k !== "fly") drawParticle(fctx, p); });
    // Nacht-Tönung nur auf Landschaft
    fctx.globalCompositeOperation = "source-atop";
    if (nf > 0) { fctx.fillStyle = "rgba(10,16,48," + (0.58 * nf).toFixed(3) + ")"; fctx.fillRect(0, 0, VW, VH); }
    var dusk = Math.max(0, 1 - Math.abs(nf - 0.45) / 0.3);
    if (dusk > 0) { fctx.fillStyle = "rgba(255,130,60," + (0.14 * dusk).toFixed(3) + ")"; fctx.fillRect(0, 0, VW, VH); }
    fctx.globalCompositeOperation = "source-over";
    ctx.drawImage(fg, 0, 0);
    // Glühwürmchen, Fensterlicht und Lichterkette leuchten über der Nacht
    particles.forEach(function (p) { if (p.k === "fly") drawParticle(ctx, p); });
    drawCabinLights(cab, nf);
  }

  function flowerSpots() {
    var out = [];
    for (var i = 0; out.length < Math.min(140, flowerCount) && i < 600; i++) {
      var x = Math.round(8 + hash(i, 11, 77) * (WW - 16));
      if (inPool(x) || inPool(x - 3) || inPool(x + 3) || Math.abs(x - CABIN_X) < 18) continue;
      out.push({ x: x, c: Math.floor(hash(i, 12, 78) * 4), big: hash(i, 13, 79) < 0.3 });
    }
    return out;
  }
  var flowerCache = null, flowerCacheN = -1;
  function drawFlowers() {
    if (flowerCacheN !== flowerCount) { flowerCache = flowerSpots(); flowerCacheN = flowerCount; }
    var s = curSeason;
    var pal = s === "winter" ? ["#d33a3a", "#e04848", "#c02f2f", "#d33a3a"] : s === "autumn" ? ["#e0b02b", "#d9772b", "#c86ad1", "#f2e2b0"] : ["#f5d33b", "#ffffff", "#c86ad1", "#ff8fb4"];
    var stem = s === "winter" ? "#2f5a3a" : "#3f8a2e";
    flowerCache.forEach(function (f) {
      var sx = Math.round(f.x - camX); if (sx < -2 || sx > VW + 2) return;
      var y = surfY(f.x);
      fctx.fillStyle = stem; fctx.fillRect(sx, y - 2, 1, 2);
      fctx.fillStyle = pal[f.c]; fctx.fillRect(sx, y - 3, 1, 1);
      if (f.big) { fctx.fillRect(sx - 1, y - 3, 1, 1); fctx.fillRect(sx + 1, y - 3, 1, 1); fctx.fillRect(sx, y - 4, 1, 1); }
    });
  }

  function drawCabin() {
    var spr = cabinSprite(cabin.stage, curSeason), bx = Math.round(CABIN_X - camX - spr.ax), by = surfY(CABIN_X) - spr.ay - 1;
    var res = { spr: spr, bx: bx, by: by, bulbs: [] };
    if (bx > VW + 20 || bx + spr.w < -20) return res;
    fctx.drawImage(spr.cv, bx, by);
    // Lichterkette: ein Licht pro veröffentlichtem Video
    if (cabin.videos > 0) {
      var x1 = bx - 3, x2 = bx + spr.w + 2, yTop = by + spr.h - (cabin.stage >= 4 ? 17 : 14);
      fctx.fillStyle = "#4a2d17"; fctx.fillRect(x1, yTop, 1, surfY(CABIN_X) - 1 - yTop); fctx.fillRect(x2, yTop, 1, surfY(CABIN_X) - 1 - yTop);
      var n = Math.min(24, cabin.videos);
      for (var x = x1; x <= x2; x++) { var t = (x - x1) / (x2 - x1), sag = Math.round(Math.sin(t * Math.PI) * 3); fctx.fillStyle = "#2a1d14"; fctx.fillRect(x, yTop + sag, 1, 1); }
      for (var i = 0; i < n; i++) {
        var tt = (i + 1) / (n + 1), bxx = Math.round(x1 + tt * (x2 - x1)), byy = yTop + Math.round(Math.sin(tt * Math.PI) * 3) + 1;
        fctx.fillStyle = BULBS[i % BULBS.length]; fctx.fillRect(bxx, byy, 1, 2);
        res.bulbs.push({ x: bxx, y: byy, c: BULBS[i % BULBS.length] });
      }
    }
    return res;
  }

  function drawCabinLights(cab, nf) {
    if (!cab) return;
    var info = cab.spr.info;
    if (cabin.stage >= 5 && info.window) {
      ctx.globalAlpha = 0.35 + 0.65 * nf; ctx.fillStyle = "#ffd27a";
      ctx.fillRect(cab.bx + info.window.x, cab.by + info.window.y, info.window.w, info.window.h);
      ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.3 * nf; ctx.fillRect(cab.bx + info.window.x + 1, cab.by + info.window.y + 1, 1, 1);
      ctx.globalAlpha = 1;
    }
    if (nf > 0.15) cab.bulbs.forEach(function (b, i) {
      var tw = 0.75 + 0.25 * Math.sin(T * 2 + i);
      ctx.globalAlpha = 0.25 * nf * tw; ctx.fillStyle = b.c; ctx.fillRect(b.x - 1, b.y - 1, 3, 4);
      ctx.globalAlpha = nf * tw; ctx.fillRect(b.x, b.y, 1, 2);
    });
    ctx.globalAlpha = 1;
  }

  function drawEntity(e) {
    var spr = animalSprite(e.sp, e.stage, e.frame, curSeason);
    var x = Math.round(e.x - camX - spr.ax), y = Math.round(e.y - spr.ay);
    if (x > VW + 4 || x + spr.w < -4) return;
    if (e.mode === "den" && spr.legs) {
      // liegt schlafend: Beine ausblenden, Körper auf den Boden legen
      var lh = spr.h - spr.legs;
      fctx.drawImage(e.dir > 0 ? spr.cv : spr.cvL, 0, 0, spr.w, lh, x, y + spr.legs, spr.w, lh);
      return;
    }
    fctx.drawImage(e.dir > 0 ? spr.cv : spr.cvL, x, y);
  }

  function drawWater() {
    var s = curSeason;
    for (var x = Math.max(POOL_X0, Math.floor(camX)); x < Math.min(POOL_X1, camX + VW); x++) {
      var floor = surfY(x), sx = Math.round(x - camX);
      if (s === "winter") {
        fctx.fillStyle = "rgba(120,170,215,0.85)"; fctx.fillRect(sx, WATER_Y + 2, 1, floor - WATER_Y - 2);
        fctx.fillStyle = hash(x, 1, 1) < 0.2 ? "#ffffff" : "#cfe6f5"; fctx.fillRect(sx, WATER_Y, 1, 2);
      } else {
        fctx.fillStyle = "rgba(40,110,190,0.62)"; fctx.fillRect(sx, WATER_Y, 1, floor - WATER_Y);
        var sh = Math.sin(x * 0.6 + T * 3) + Math.sin(x * 0.23 - T * 1.7);
        fctx.fillStyle = sh > 1.1 ? "#cfeaff" : "#5fa8e0"; fctx.fillRect(sx, WATER_Y, 1, 1);
        if (Math.sin(x * 0.4 - T * 2.2) > 0.92) { fctx.fillStyle = "rgba(200,235,255,0.5)"; fctx.fillRect(sx, WATER_Y + 3 + (x % 3), 1, 1); }
      }
    }
  }

  var HEART = [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]];
  var ZED = [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]];
  function drawParticle(c, p) {
    var x = Math.round(p.world ? p.x - camX : p.x), y = Math.round(p.y), a = Math.min(1, p.life / p.max * 2);
    c.globalAlpha = a;
    if (p.k === "heart") { HEART.forEach(function (q) { c.fillStyle = q[0] === 1 && q[1] === 1 ? "#ffc2d4" : "#ff4f86"; c.fillRect(x + q[0], y + q[1], 1, 1); }); }
    else if (p.k === "sparkle") { var on = Math.floor(p.life * 10) % 2; c.fillStyle = "#fff3a3"; c.fillRect(x, y - on, 1, 1 + 2 * on); c.fillRect(x - on, y, 1 + 2 * on, 1); c.fillStyle = "#ffffff"; c.fillRect(x, y, 1, 1); }
    else if (p.k === "leaf") { c.fillStyle = p.c; c.fillRect(x, y, 2, 1); if (Math.sin(T * 4 + p.ph) > 0) c.fillRect(x, y + 1, 1, 1); }
    else if (p.k === "snow") { c.fillStyle = "#ffffff"; c.fillRect(x, y, 1, 1); }
    else if (p.k === "smoke") { var sz = p.life > 2 ? 1 : 2; c.globalAlpha = a * 0.55; c.fillStyle = "#c9ccd4"; c.fillRect(x, y, sz, sz); }
    else if (p.k === "zzz") { c.fillStyle = "#cfd8ff"; ZED.forEach(function (q) { c.fillRect(x + q[0], y + q[1], 1, 1); }); }
    else if (p.k === "fly") {
      var g = 0.5 + 0.5 * Math.sin(T * 3 + p.ph);
      c.globalAlpha = a * g * nightFactor(); c.fillStyle = "rgba(220,255,120,0.35)"; c.fillRect(x - 1, y - 1, 3, 3); c.globalAlpha = a * g * nightFactor(); c.fillStyle = "#f4ff9a"; c.fillRect(x, y, 1, 1);
      p.vx += (Math.random() - 0.5) * 0.8; p.vy += (Math.random() - 0.5) * 0.5; p.vx = clamp(p.vx, -5, 5); p.vy = clamp(p.vy, -3, 3);
    }
    c.globalAlpha = 1;
  }


  /* Steuerung: ziehen zum Schwenken, tippen für Infos */
  var drag = null, panAnim = null, bubbleTimer = 0, nightOverride = null, running = true, raf = 0;
  function seasonNow() { var m = new Date().getMonth(); return m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn"; }
  function hourNow() { if (nightOverride === true) return 23; if (nightOverride === false) return 12.5; var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function setCam(x) { camX = clamp(x, 0, WW - VW); }
  function hideBubble() { if (bubble) bubble.hidden = true; }
  function showBubble(wx, wy, title, sub) {
    if (!bubble) return;
    var r = cv.getBoundingClientRect(), sc = r.width / VW;
    bubble.textContent = "";
    var t = document.createElement("strong"); t.textContent = title; bubble.appendChild(t);
    if (sub) { var sm = document.createElement("span"); sm.textContent = sub; bubble.appendChild(sm); }
    bubble.style.left = clamp((wx - camX) * sc, 90, r.width - 90) + "px";
    bubble.style.top = Math.max(36, wy * sc - 6) + "px";
    bubble.hidden = false;
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(hideBubble, 3500);
  }
  function tap(e) {
    var r = cv.getBoundingClientRect(), wx = camX + (e.clientX - r.left) * VW / r.width, wy = (e.clientY - r.top) * VH / r.height;
    var hit = null;
    entities.forEach(function (en) {
      if (en.mode === "away") return;
      var spr = animalSprite(en.sp, en.stage, 0, curSeason), x0 = en.x - spr.ax - 3, y0 = en.y - spr.ay - 3;
      if (wx >= x0 && wx <= x0 + spr.w + 6 && wy >= y0 && wy <= y0 + spr.h + 6) hit = en;
    });
    if (hit) {
      var res = (world ? world.population : []).find(function (p) { return p.id === hit.id; });
      var sub = hit.mode === "den" ? "hibernating" : res ? res.sub : "";
      showBubble(hit.x, hit.y - animalSprite(hit.sp, hit.stage, 0, curSeason).ay, res ? res.name : "", sub);
      return;
    }
    var cs = cabinSprite(cabin.stage, curSeason), cx0 = CABIN_X - cs.ax;
    if (wx >= cx0 - 6 && wx <= cx0 + cs.w + 6 && wy >= surfY(CABIN_X) - cs.ay - 4 && wy <= surfY(CABIN_X) + 2) { showBubble(CABIN_X, surfY(CABIN_X) - cs.ay, cabin.title, cabin.sub); return; }
    for (var i = trees.length - 1; i >= 0; i--) {
      var t = trees[i], spr2 = treeSprite(t.type, t.s, t.had, curSeason, t.seed), bx = t.x - spr2.ax, by = surfY(t.x) - spr2.ay;
      if (wx >= bx - 2 && wx <= bx + spr2.w + 2 && wy >= by - 2 && wy <= surfY(t.x) + 2) { showBubble(t.x, by + 4, t.label, t.sub); return; }
    }
    hideBubble();
  }
  function onDown(e) { drag = { x: e.clientX, cam: camX, moved: false, id: e.pointerId }; }
  function onMove(e) {
    if (!drag) return;
    var r = cv.getBoundingClientRect(), dx = (e.clientX - drag.x) * VW / r.width;
    if (Math.abs(dx) > 2 && !drag.moved) { drag.moved = true; try { cv.setPointerCapture(drag.id); } catch (err) {} hideBubble(); }
    if (drag.moved) { panAnim = null; setCam(drag.cam - dx); }
  }
  function onUp(e) { if (!drag) return; var d = drag; drag = null; if (!d.moved && e.type === "pointerup") tap(e); }
  function onKey(e) { if (e.key === "ArrowLeft") { panBy(-40); e.preventDefault(); } if (e.key === "ArrowRight") { panBy(40); e.preventDefault(); } }
  cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove);
  cv.addEventListener("pointerup", onUp); cv.addEventListener("pointercancel", onUp); cv.addEventListener("keydown", onKey);
  function panBy(d) { var target = clamp((panAnim ? panAnim.to : camX) + d, 0, WW - VW); hideBubble(); if (REDUCED) setCam(target); else panAnim = { to: target }; }

  function setWorld(ws, fx) {
    var prev = world;
    world = ws;
    cabin = ws.cabin; flowerCount = ws.flowers; auroraLevel = ws.aurora;
    var oldTrees = trees.slice();
    layoutWorld(ws);
    reconcile(!!fx);
    if (fx && prev) {
      trees.forEach(function (t) { var o = oldTrees.find(function (q) { return q.grove === t.grove && q.seed === t.seed; }); if (!o || o.s < t.s) { if (t.s > 0) treeBurst(t); } });
      if (prev.cabin.stage !== ws.cabin.stage || prev.cabin.videos !== ws.cabin.videos) for (var i = 0; i < 10; i++) particles.push({ k: "sparkle", x: CABIN_X + (Math.random() - 0.5) * 30, y: surfY(CABIN_X) - Math.random() * 24, vx: 0, vy: -6, life: 1.4, max: 1.4, world: true });
    }
  }

  ensureSeason();
  setCam(120);
  var last = performance.now(), lastDraw = 0;
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (ensureSeason()) { spriteCache = {}; reconcile(false); }
    if (panAnim) { var d = panAnim.to - camX; if (Math.abs(d) < 1) { setCam(panAnim.to); panAnim = null; } else setCam(camX + d * Math.min(1, dt * 6)); }
    update(dt);
    if (now - lastDraw >= 33) { draw(); lastDraw = now; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    setWorld: setWorld,
    panBy: panBy,
    setNight: function (v) { nightOverride = v; },
    focus: function (x) { setCam(x - VW / 2); },
    destroy: function () {
      running = false; cancelAnimationFrame(raf); clearTimeout(bubbleTimer);
      cv.removeEventListener("pointerdown", onDown); cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp); cv.removeEventListener("pointercancel", onUp); cv.removeEventListener("keydown", onKey);
    },
  };
}
