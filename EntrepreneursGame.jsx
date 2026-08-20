import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import SiteChrome from "./Rulebook.jsx";

/* ============================== DATA ============================== */

const BP_DATA = [{"code": "UT-01", "ind": "UT", "name": "Solar Field I", "lvl": 1, "setup": 15, "opex": 4, "deps": [{"ind": "HO", "val": 4}], "prod": 4}, {"code": "UT-02", "ind": "UT", "name": "Hydro-Farm Initiative I", "lvl": 1, "setup": 15, "opex": 4, "deps": [{"ind": "HO", "val": 4}], "prod": 4}, {"code": "UT-03", "ind": "UT", "name": "Wind Farm I", "lvl": 1, "setup": 15, "opex": 4, "deps": [{"ind": "TE", "val": 4}], "prod": 4}, {"code": "UT-04", "ind": "UT", "name": "Biomass Plant I", "lvl": 1, "setup": 15, "opex": 4, "deps": [{"ind": "TE", "val": 4}], "prod": 4}, {"code": "UT-05", "ind": "UT", "name": "Tidal Generator I", "lvl": 1, "setup": 15, "opex": 4, "deps": [{"ind": "HC", "val": 4}], "prod": 4}, {"code": "UT-06", "ind": "UT", "name": "Fusion Conduit Hub II", "lvl": 2, "setup": 20, "opex": 7, "deps": [{"ind": "HO", "val": 4}, {"ind": "TE", "val": 3}], "prod": 8}, {"code": "UT-07", "ind": "UT", "name": "Smart Grid Node II", "lvl": 2, "setup": 20, "opex": 7, "deps": [{"ind": "HO", "val": 4}, {"ind": "HC", "val": 3}], "prod": 8}, {"code": "UT-08", "ind": "UT", "name": "Oceanic Turbine II", "lvl": 2, "setup": 20, "opex": 7, "deps": [{"ind": "TE", "val": 4}, {"ind": "HC", "val": 3}], "prod": 8}, {"code": "UT-09", "ind": "UT", "name": "Geothermal Supernode III", "lvl": 3, "setup": 30, "opex": 10, "deps": [{"ind": "HO", "val": 4}, {"ind": "TE", "val": 3}, {"ind": "HC", "val": 3}], "prod": 16}, {"code": "UT-10", "ind": "UT", "name": "Antimatter Reactor III", "lvl": 3, "setup": 30, "opex": 10, "deps": [{"ind": "HO", "val": 4}, {"ind": "TE", "val": 3}, {"ind": "HC", "val": 3}], "prod": 16}, {"code": "RE-01", "ind": "RE", "name": "Corner Store I", "lvl": 1, "setup": 10, "opex": 5, "deps": [{"ind": "TE", "val": 5}], "prod": 4}, {"code": "RE-02", "ind": "RE", "name": "Pop-Up Kiosk I", "lvl": 1, "setup": 10, "opex": 5, "deps": [{"ind": "TE", "val": 5}], "prod": 4}, {"code": "RE-03", "ind": "RE", "name": "Local Market I", "lvl": 1, "setup": 10, "opex": 5, "deps": [{"ind": "HO", "val": 5}], "prod": 4}, {"code": "RE-04", "ind": "RE", "name": "Strip Mall I", "lvl": 1, "setup": 10, "opex": 5, "deps": [{"ind": "HO", "val": 5}], "prod": 4}, {"code": "RE-05", "ind": "RE", "name": "Vending Network I", "lvl": 1, "setup": 10, "opex": 5, "deps": [{"ind": "MA", "val": 5}], "prod": 4}, {"code": "RE-06", "ind": "RE", "name": "Supermarket II", "lvl": 2, "setup": 15, "opex": 9, "deps": [{"ind": "TE", "val": 5}, {"ind": "HO", "val": 4}], "prod": 8}, {"code": "RE-07", "ind": "RE", "name": "Department Store II", "lvl": 2, "setup": 15, "opex": 9, "deps": [{"ind": "TE", "val": 5}, {"ind": "MA", "val": 4}], "prod": 8}, {"code": "RE-08", "ind": "RE", "name": "Outlet Center II", "lvl": 2, "setup": 15, "opex": 9, "deps": [{"ind": "HO", "val": 5}, {"ind": "MA", "val": 4}], "prod": 8}, {"code": "RE-09", "ind": "RE", "name": "Mega-Mall III", "lvl": 3, "setup": 25, "opex": 14, "deps": [{"ind": "TE", "val": 6}, {"ind": "HO", "val": 4}, {"ind": "MA", "val": 4}], "prod": 16}, {"code": "RE-10", "ind": "RE", "name": "Omni-Channel Hub III", "lvl": 3, "setup": 25, "opex": 14, "deps": [{"ind": "TE", "val": 6}, {"ind": "HO", "val": 4}, {"ind": "MA", "val": 4}], "prod": 16}, {"code": "HO-01", "ind": "HO", "name": "Motel I", "lvl": 1, "setup": 10, "opex": 6, "deps": [{"ind": "MA", "val": 6}], "prod": 3}, {"code": "HO-02", "ind": "HO", "name": "Bed & Breakfast I", "lvl": 1, "setup": 10, "opex": 6, "deps": [{"ind": "MA", "val": 6}], "prod": 3}, {"code": "HO-03", "ind": "HO", "name": "Transit Hostel I", "lvl": 1, "setup": 10, "opex": 6, "deps": [{"ind": "HC", "val": 6}], "prod": 3}, {"code": "HO-04", "ind": "HO", "name": "Roadside Inn I", "lvl": 1, "setup": 10, "opex": 6, "deps": [{"ind": "HC", "val": 6}], "prod": 3}, {"code": "HO-05", "ind": "HO", "name": "Capsule Hotel I", "lvl": 1, "setup": 10, "opex": 6, "deps": [{"ind": "RE", "val": 6}], "prod": 3}, {"code": "HO-06", "ind": "HO", "name": "Business Hotel II", "lvl": 2, "setup": 15, "opex": 10, "deps": [{"ind": "MA", "val": 6}, {"ind": "HC", "val": 4}], "prod": 6}, {"code": "HO-07", "ind": "HO", "name": "Resort Lodge II", "lvl": 2, "setup": 15, "opex": 10, "deps": [{"ind": "MA", "val": 6}, {"ind": "RE", "val": 4}], "prod": 6}, {"code": "HO-08", "ind": "HO", "name": "Boutique Hotel II", "lvl": 2, "setup": 15, "opex": 10, "deps": [{"ind": "HC", "val": 6}, {"ind": "RE", "val": 4}], "prod": 6}, {"code": "HO-09", "ind": "HO", "name": "Luxury Casino III", "lvl": 3, "setup": 25, "opex": 16, "deps": [{"ind": "MA", "val": 6}, {"ind": "HC", "val": 5}, {"ind": "RE", "val": 5}], "prod": 12}, {"code": "HO-10", "ind": "HO", "name": "Orbit Resort III", "lvl": 3, "setup": 25, "opex": 16, "deps": [{"ind": "MA", "val": 6}, {"ind": "HC", "val": 5}, {"ind": "RE", "val": 5}], "prod": 12}, {"code": "MA-01", "ind": "MA", "name": "Assembly Workshop I", "lvl": 1, "setup": 20, "opex": 4, "deps": [{"ind": "HC", "val": 4}], "prod": 3}, {"code": "MA-02", "ind": "MA", "name": "Parts Fabricator I", "lvl": 1, "setup": 20, "opex": 4, "deps": [{"ind": "HC", "val": 4}], "prod": 3}, {"code": "MA-03", "ind": "MA", "name": "Textile Mill I", "lvl": 1, "setup": 20, "opex": 4, "deps": [{"ind": "RE", "val": 4}], "prod": 3}, {"code": "MA-04", "ind": "MA", "name": "Canning Facility I", "lvl": 1, "setup": 20, "opex": 4, "deps": [{"ind": "RE", "val": 4}], "prod": 3}, {"code": "MA-05", "ind": "MA", "name": "Injection Molder I", "lvl": 1, "setup": 20, "opex": 4, "deps": [{"ind": "UT", "val": 4}], "prod": 3}, {"code": "MA-06", "ind": "MA", "name": "Auto Plant II", "lvl": 2, "setup": 35, "opex": 7, "deps": [{"ind": "HC", "val": 4}, {"ind": "RE", "val": 3}], "prod": 6}, {"code": "MA-07", "ind": "MA", "name": "Microchip Foundry II", "lvl": 2, "setup": 35, "opex": 7, "deps": [{"ind": "HC", "val": 4}, {"ind": "UT", "val": 3}], "prod": 6}, {"code": "MA-08", "ind": "MA", "name": "Chemical Plant II", "lvl": 2, "setup": 35, "opex": 7, "deps": [{"ind": "RE", "val": 4}, {"ind": "UT", "val": 3}], "prod": 6}, {"code": "MA-09", "ind": "MA", "name": "Heavy Robotics III", "lvl": 3, "setup": 60, "opex": 10, "deps": [{"ind": "HC", "val": 4}, {"ind": "RE", "val": 3}, {"ind": "UT", "val": 3}], "prod": 12}, {"code": "MA-10", "ind": "MA", "name": "Orbital Shipyard III", "lvl": 3, "setup": 60, "opex": 10, "deps": [{"ind": "HC", "val": 4}, {"ind": "RE", "val": 3}, {"ind": "UT", "val": 3}], "prod": 12}, {"code": "HC-01", "ind": "HC", "name": "Urgent Care Clinic I", "lvl": 1, "setup": 20, "opex": 5, "deps": [{"ind": "RE", "val": 5}], "prod": 2}, {"code": "HC-02", "ind": "HC", "name": "Pharmacy I", "lvl": 1, "setup": 20, "opex": 5, "deps": [{"ind": "RE", "val": 5}], "prod": 2}, {"code": "HC-03", "ind": "HC", "name": "Dental Office I", "lvl": 1, "setup": 20, "opex": 5, "deps": [{"ind": "UT", "val": 5}], "prod": 2}, {"code": "HC-04", "ind": "HC", "name": "Wellness Center I", "lvl": 1, "setup": 20, "opex": 5, "deps": [{"ind": "UT", "val": 5}], "prod": 2}, {"code": "HC-05", "ind": "HC", "name": "Physical Therapy I", "lvl": 1, "setup": 20, "opex": 5, "deps": [{"ind": "TE", "val": 5}], "prod": 2}, {"code": "HC-06", "ind": "HC", "name": "General Hospital II", "lvl": 2, "setup": 35, "opex": 9, "deps": [{"ind": "RE", "val": 5}, {"ind": "UT", "val": 4}], "prod": 4}, {"code": "HC-07", "ind": "HC", "name": "Trauma Center II", "lvl": 2, "setup": 35, "opex": 9, "deps": [{"ind": "RE", "val": 5}, {"ind": "TE", "val": 4}], "prod": 4}, {"code": "HC-08", "ind": "HC", "name": "Specialized Clinic II", "lvl": 2, "setup": 35, "opex": 9, "deps": [{"ind": "UT", "val": 5}, {"ind": "TE", "val": 4}], "prod": 4}, {"code": "HC-09", "ind": "HC", "name": "Biotech Campus III", "lvl": 3, "setup": 60, "opex": 14, "deps": [{"ind": "RE", "val": 6}, {"ind": "UT", "val": 4}, {"ind": "TE", "val": 4}], "prod": 8}, {"code": "HC-10", "ind": "HC", "name": "Cybernetics Inst. III", "lvl": 3, "setup": 60, "opex": 14, "deps": [{"ind": "RE", "val": 6}, {"ind": "UT", "val": 4}, {"ind": "TE", "val": 4}], "prod": 8}, {"code": "TE-01", "ind": "TE", "name": "App Startup I", "lvl": 1, "setup": 15, "opex": 6, "deps": [{"ind": "UT", "val": 6}], "prod": 2}, {"code": "TE-02", "ind": "TE", "name": "Data Center I", "lvl": 1, "setup": 15, "opex": 6, "deps": [{"ind": "UT", "val": 6}], "prod": 2}, {"code": "TE-03", "ind": "TE", "name": "Server Farm I", "lvl": 1, "setup": 15, "opex": 6, "deps": [{"ind": "MA", "val": 6}], "prod": 2}, {"code": "TE-04", "ind": "TE", "name": "IT Support Firm I", "lvl": 1, "setup": 15, "opex": 6, "deps": [{"ind": "MA", "val": 6}], "prod": 2}, {"code": "TE-05", "ind": "TE", "name": "Cloud Provider I", "lvl": 1, "setup": 15, "opex": 6, "deps": [{"ind": "HO", "val": 6}], "prod": 2}, {"code": "TE-06", "ind": "TE", "name": "Software Campus II", "lvl": 2, "setup": 25, "opex": 10, "deps": [{"ind": "UT", "val": 6}, {"ind": "MA", "val": 4}], "prod": 4}, {"code": "TE-07", "ind": "TE", "name": "Network Hub II", "lvl": 2, "setup": 25, "opex": 10, "deps": [{"ind": "UT", "val": 6}, {"ind": "HO", "val": 4}], "prod": 4}, {"code": "TE-08", "ind": "TE", "name": "Telecom Provider II", "lvl": 2, "setup": 25, "opex": 10, "deps": [{"ind": "MA", "val": 6}, {"ind": "HO", "val": 4}], "prod": 4}, {"code": "TE-09", "ind": "TE", "name": "Sentient AI Cluster III", "lvl": 3, "setup": 40, "opex": 16, "deps": [{"ind": "UT", "val": 6}, {"ind": "MA", "val": 5}, {"ind": "HO", "val": 5}], "prod": 8}, {"code": "TE-10", "ind": "TE", "name": "Quantum Computing III", "lvl": 3, "setup": 40, "opex": 16, "deps": [{"ind": "UT", "val": 6}, {"ind": "MA", "val": 5}, {"ind": "HO", "val": 5}], "prod": 8}];

const INDUSTRIES = ["UT", "RE", "HO", "MA", "HC", "TE"];
const BASE_PRICE = { UT: 2, RE: 2, HO: 3, MA: 3, HC: 4, TE: 4 };
const SCALING = { UT: "H", MA: "H", TE: "H", RE: "V", HO: "V", HC: "V" };
const IND_COLOR = { UT: "#E8B330", RE: "#3FAE6A", HO: "#D65B4A", MA: "#9066C8", HC: "#3E8FD0", TE: "#D6428B" };
const IND_NAME = { UT: "Utilities", RE: "Retail", HO: "Hospitality", MA: "Manufacturing", HC: "Healthcare", TE: "Technology" };
const IND_ABILITY = {
  UT: "Access demand on its level\u00d7level grid. No LH.",
  RE: "Sell to 1 extra district per level. No LH.",
  HO: "Sell 1 extra production per business/LH around it, per level.",
  MA: "Sell 1 extra production to another industry's rows, per level.",
  HC: "Reach any district near any LH, not just its own.",
  TE: "Sell 2 tokens to every demand icon it reaches.",
};

const PLAYER_COLORS = ["#22D3EE", "#FB923C", "#A78BFA", "#FB7185"];

/* ============================== BOARD ============================== */

const COORDS = { NW: [0, 0], N: [1, 0], NE: [2, 0], W: [0, 1], E: [2, 1], SW: [0, 2], S: [1, 2], SE: [2, 2] };
const ALL_POS = Object.keys(COORDS);
function intraAdjacent(a, b) {
  const [x1, y1] = COORDS[a], [x2, y2] = COORDS[b];
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)) === 1;
}
const INTRA_GRAPH = {};
ALL_POS.forEach((p) => (INTRA_GRAPH[p] = new Set()));
for (let i = 0; i < ALL_POS.length; i++)
  for (let j = i + 1; j < ALL_POS.length; j++) {
    const a = ALL_POS[i], b = ALL_POS[j];
    if (intraAdjacent(a, b)) {
      INTRA_GRAPH[a].add(b);
      INTRA_GRAPH[b].add(a);
    }
  }

const TILES = {
  R1: ["N", "E", "S", "W"], R2: ["NW", "NE", "SE", "SW"], R3: ["NW", "N", "NE", "S"],
  R4: ["N", "SE", "S", "W"], R5: ["N", "NE", "E", "SE"],
  C1: ["N", "E", "S", "W"], C2: ["NW", "NE", "SE", "SW"], C3: ["NW", "SE", "S", "W"],
  C4: ["N", "NE", "E", "SW"], C5: ["E", "SE", "SW", "W"],
  A1: ["N", "E", "S", "W"], A2: ["NW", "NE", "SE", "SW"], A3: ["N", "NE", "S", "SW"],
  I1: ["N", "E", "S", "W"], I2: ["NW", "NE", "SE", "SW"], I3: ["NW", "N", "NE", "SW"],
  FC: ["NE", "E", "SE", "S"], IA: ["SE", "S", "SW", "W"], CC: ["NW", "N", "SW", "W"], LM: ["NW", "N", "NE", "E"],
};
const SUBURB_POOL = ["R1", "R2", "R3", "R4", "R5", "C1", "C2", "C3", "C4", "C5", "A1", "A2", "A3", "I1", "I2", "I3"];
const CENTER_POOL = ["FC", "IA", "CC", "LM"];
const TILE_LABEL = { R:"#D65B4A22", C:"#3E8FD022" };

const DEMAND_ROWS = {
  R: ["UT", "RE", "HO", "UT"], C: ["RE", "UT", "MA", "RE"],
  A: ["HO", "UT", "TE", "HO"], I: ["MA", "RE", "HC", "MA"],
  FC: ["TE", "UT", "HC", "TE"], IA: ["MA", "RE", "TE", "MA"],
  CC: ["HC", "HO", "TE", "HC"], LM: ["HO", "MA", "HC", "HO"],
};
function districtFamily(tname) {
  return ["FC", "IA", "CC", "LM"].includes(tname) ? tname : tname[0];
}

const Y_MAP = { N: "S", S: "N", NE: "SE", SE: "NE", NW: "SW", SW: "NW" };
const X_MAP = { E: "W", W: "E", NE: "NW", NW: "NE", SE: "SW", SW: "SE" };
const HAS_N = new Set(["N", "NE", "NW"]), HAS_S = new Set(["S", "SE", "SW"]);
const HAS_E = new Set(["E", "NE", "SE"]), HAS_W = new Set(["W", "NW", "SW"]);
function crossLinks(r, c, pos) {
  const links = [];
  if (pos in Y_MAP) {
    if (HAS_N.has(pos)) links.push([[r - 1, c], Y_MAP[pos]]);
    if (HAS_S.has(pos)) links.push([[r + 1, c], Y_MAP[pos]]);
  }
  if (pos in X_MAP) {
    if (HAS_E.has(pos)) links.push([[r, c + 1], X_MAP[pos]]);
    if (HAS_W.has(pos)) links.push([[r, c - 1], X_MAP[pos]]);
  }
  return links;
}
const CENTER_CELLS = [[2, 2], [2, 3], [3, 2], [3, 3]];
const OUTER_CELLS = [];
for (let r = 1; r <= 4; r++) for (let c = 1; c <= 4; c++) if (!CENTER_CELLS.some(([cr, cc]) => cr === r && cc === c)) OUTER_CELLS.push([r, c]);

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function sample(arr, n, rng) { return shuffle(arr, rng).slice(0, n); }
function plotKey(r, c, pos) { return `${r},${c},${pos}`; }

function buildBoard(rng) {
  const tiles = {};
  const centers = shuffle(CENTER_POOL, rng);
  CENTER_CELLS.forEach(([r, c], i) => (tiles[`${r},${c}`] = centers[i]));
  const chosen = sample(SUBURB_POOL, 12, rng);
  const slots = shuffle(OUTER_CELLS, rng);
  chosen.forEach((name, i) => { const [r, c] = slots[i]; tiles[`${r},${c}`] = name; });

  const graph = {}, cellOf = {};
  Object.entries(tiles).forEach(([key, tname]) => {
    const [r, c] = key.split(",").map(Number);
    TILES[tname].forEach((pos) => { const k = plotKey(r, c, pos); graph[k] = new Set(); cellOf[k] = { r, c, pos, tname }; });
  });
  Object.entries(tiles).forEach(([key, tname]) => {
    const [r, c] = key.split(",").map(Number);
    const plots = TILES[tname];
    for (let i = 0; i < plots.length; i++) for (let j = i + 1; j < plots.length; j++) {
      if (INTRA_GRAPH[plots[i]].has(plots[j])) {
        const a = plotKey(r, c, plots[i]), b = plotKey(r, c, plots[j]);
        graph[a].add(b); graph[b].add(a);
      }
    }
  });
  Object.entries(tiles).forEach(([key, tname]) => {
    const [r, c] = key.split(",").map(Number);
    TILES[tname].forEach((pos) => {
      crossLinks(r, c, pos).forEach(([[nr, nc], npos]) => {
        const nkey = `${nr},${nc}`;
        if (tiles[nkey] && TILES[tiles[nkey]].includes(npos)) {
          const a = plotKey(r, c, pos), b = plotKey(nr, nc, npos);
          graph[a].add(b); graph[b].add(a);
        }
      });
    });
  });
  /* A second, stricter adjacency: plots that share an edge on the city grid, at
     most four of them. `graph` is deliberately looser - it counts diagonals inside
     a district - and everything built on it stays as it is. This one exists for
     hubs placed on plots, which reach straight lines only. */
  const orth = {};
  const atXY = {};
  Object.keys(cellOf).forEach((k) => {
    const c = cellOf[k];
    const [x, y] = COORDS[c.pos];
    atXY[`${(c.c - 1) * 3 + x},${(c.r - 1) * 3 + y}`] = k;
  });
  Object.keys(cellOf).forEach((k) => {
    const c = cellOf[k];
    const [x, y] = COORDS[c.pos];
    const gx = (c.c - 1) * 3 + x, gy = (c.r - 1) * 3 + y;
    orth[k] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => atXY[`${gx + dx},${gy + dy}`])
      .filter(Boolean);
  });

  const centerPlots = Object.keys(cellOf).filter((k) => CENTER_CELLS.some(([cr, cc]) => cr === cellOf[k].r && cc === cellOf[k].c));
  const distFromCenter = bfsDistances(graph, centerPlots);
  const board = { tiles, graph, orth, cellOf, owner: {}, occupiedBy: {}, distFromCenter, lhEdges: [], lhPlots: [], lhOnPlots: false };
  board.priceLattice = computePriceLattice(board);
  return board;
}
function bfsDistances(graph, startNodes) {
  const dist = {};
  startNodes.forEach((n) => (dist[n] = 0));
  const queue = [...startNodes];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of graph[cur] || []) if (!(n in dist)) { dist[n] = dist[cur] + 1; queue.push(n); }
  }
  return dist;
}
function edgeKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }
/* ---------- Logistic Hubs ----------
   Two shapes, chosen at setup. Normally a hub sits on the road between two plots in
   different districts, and both of those districts join the network. Under the
   "hubs on plots" variant it stands on a plot instead: you join the network by
   being orthogonally beside one, and the network reaches the district each hub
   stands in. Everything downstream asks these three questions rather than reading
   lhEdges directly, so neither shape has to know about the other. */
const orthOf = (board, plot) => (board.orth && board.orth[plot]) || [];
/* Is this plot itself a hub? Only ever true under the variant - on the road, a hub
   occupies no plot at all. */
const plotIsLH = (board, plot) => !!board.lhOnPlots && (board.lhPlots || []).includes(plot);
/* Does a company standing on this plot touch the network? */
function plotHasLH(board, plot) {
  if (board.lhOnPlots) return orthOf(board, plot).some((n) => (board.lhPlots || []).includes(n));
  return board.lhEdges.some((e) => e[0] === plot || e[1] === plot);
}
/* Every district the network reaches. */
function lhDistricts(board) {
  const out = new Set();
  const add = (plot) => { const c = board.cellOf[plot]; if (c) out.add(`${c.r},${c.c}`); };
  if (board.lhOnPlots) (board.lhPlots || []).forEach(add);
  else board.lhEdges.forEach(([a, b]) => { add(a); add(b); });
  return out;
}
const lhCount = (board) => (board.lhOnPlots ? (board.lhPlots || []).length : board.lhEdges.length);
/* A hub standing on a plot fills it: nothing can be built there afterwards. */
const plotFree = (board, plot) => !(plot in board.occupiedBy) && !plotIsLH(board, plot);
const LOCAL5 = { NW: [0, 0], N: [0, 2], NE: [0, 4], W: [2, 0], E: [2, 4], SW: [4, 0], S: [4, 2], SE: [4, 4] };
function isCCDistrict0(dr, dc) { return CENTER_CELLS.some(([cr, cc]) => cr - 1 === dr && cc - 1 === dc); }

/* ---------- Price lattice ----------
   Prices live on the roads, on a 9x9 lattice over the 4x4 district grid.
   Even index = a road line; odd index = a district's middle. (odd,odd) is a
   district centre and carries no price. Corner positions (even,even) sit where
   up to 4 districts meet; mid positions sit beside a district's middle plot.
   Values reproduce the printed board: 6 dead centre down to 1 at the outer edge. */
function computePriceLattice(board) {
  const exists = (dr, dc) => dr >= 0 && dr < 4 && dc >= 0 && dc < 4 && !!board.tiles[`${dr + 1},${dc + 1}`];
  const isCC = (dr, dc) => exists(dr, dc) && isCCDistrict0(dr, dc);
  const lat = {};
  for (let r = 0; r <= 8; r++) {
    for (let c = 0; c <= 8; c++) {
      const rEven = r % 2 === 0, cEven = c % 2 === 0;
      if (!rEven && !cEven) continue; // district centre: no price
      let touching;
      if (rEven && cEven) {
        const i = r / 2, j = c / 2;
        touching = [[i - 1, j - 1], [i - 1, j], [i, j - 1], [i, j]];
      } else if (rEven) {
        const i = r / 2, k = (c - 1) / 2;
        touching = [[i - 1, k], [i, k]];
      } else {
        const j = c / 2, k = (r - 1) / 2;
        touching = [[k, j - 1], [k, j]];
      }
      const live = touching.filter(([a, b]) => exists(a, b));
      const nCC = live.filter(([a, b]) => isCC(a, b)).length;
      let v;
      if (rEven && cEven) v = nCC === 4 ? 6 : nCC >= 1 ? 4 : live.length >= 2 ? 2 : 1;
      else v = nCC === 2 ? 5 : live.length === 2 ? 3 : 1;
      lat[`${r},${c}`] = v;
    }
  }
  return lat;
}
/* A plot's road-price position: district (1-indexed) + its ring slot. */
function latticeKeyForCell(cell) {
  const [lr, lc] = LOCAL5[cell.pos];
  return `${2 * (cell.r - 1) + lr / 2},${2 * (cell.c - 1) + lc / 2}`;
}
function plotValue(state, plotKeyStr) {
  const board = state.board;
  const cell = board.cellOf[plotKeyStr];
  let base = 1;
  if (cell && board.priceLattice) {
    const v = board.priceLattice[latticeKeyForCell(cell)];
    if (v !== undefined) base = v;
  }
  const occupiedNeighbors = [...board.graph[plotKeyStr]].filter((n) => n in board.occupiedBy).length;
  const lhBonus = plotHasLH(board, plotKeyStr) ? 1 : 0;
  return base + occupiedNeighbors + lhBonus;
}
function isCrossDistrictEdge(board, a, b) {
  const ca = board.cellOf[a], cb = board.cellOf[b];
  return ca.r !== cb.r || ca.c !== cb.c;
}
/* Where a hub may go, in whichever shape this game is using. Under the variant
   that is any plot with nothing standing on it; otherwise it is any road between
   two districts that has no hub yet. */
function lhPlotOptions(state) {
  return Object.keys(state.board.graph).filter((p) => plotFree(state.board, p));
}
function lhEdgeOptions(state) {
  const out = [], seen = new Set();
  for (const a of Object.keys(state.board.graph)) {
    for (const b of state.board.graph[a]) {
      const ek = edgeKey(a, b);
      if (seen.has(ek)) continue;
      seen.add(ek);
      if (!isCrossDistrictEdge(state.board, a, b)) continue;   // a road hub straddles two districts
      if (state.board.lhEdges.some((e) => edgeKey(e[0], e[1]) === ek)) continue;
      out.push([a, b]);
    }
  }
  return out;
}
function logNewLH(state, districts, log) {
  const names = districts.map((d) => state.board.tiles[d]).filter(Boolean);
  const grows = districts.some((d) => DEMAND_ROWS[districtFamily(state.board.tiles[d])].includes("HC"));
  log(`A new Logistic Hub opens near ${names.join("/")}${grows ? " \u2014 Healthcare demand grows." : "."}`, null);
}
const districtOf = (board, plot) => { const c = board.cellOf[plot]; return c ? `${c.r},${c.c}` : null; };

function placeNewLH(state, rng, log) {
  if (state.board.lhOnPlots) {
    const spots = lhPlotOptions(state);
    if (!spots.length) return;
    /* A quarter of plots have no orthogonal neighbour at all - the district centre
       is not a plot, and each tile carries only four of the eight ring positions -
       so a hub dropped there would connect nobody. Prefer somewhere it can do some
       good, and fall back to anywhere if the board is that full. */
    const useful = spots.filter((p) => orthOf(state.board, p).length > 0);
    const pool = useful.length ? useful : spots;
    const plot = pool[Math.floor(rng() * pool.length)];
    state.board.lhPlots.push(plot);
    logNewLH(state, [districtOf(state.board, plot)], log);
    return;
  }
  const allEdges = [];
  const seen = new Set();
  for (const a of Object.keys(state.board.graph)) {
    for (const b of state.board.graph[a]) {
      const ek = edgeKey(a, b);
      if (seen.has(ek)) continue;
      seen.add(ek);
      if (!isCrossDistrictEdge(state.board, a, b)) continue; // LH only sits between two districts
      const alreadyLH = state.board.lhEdges.some((e) => edgeKey(e[0], e[1]) === ek);
      if (!alreadyLH) allEdges.push([a, b]);
    }
  }
  if (!allEdges.length) return;
  const [a, b] = allEdges[Math.floor(rng() * allEdges.length)];
  state.board.lhEdges.push([a, b]);
  logNewLH(state, [districtOf(state.board, a), districtOf(state.board, b)], log);
}
/* ---- where a company footprint may grow ----
   Strictly orthogonal: plots that share an edge, within a district or across the
   border into the next one. A building never spreads across a corner.

   `board.graph` is looser - it also joins diagonals inside a district - because it
   is the road/neighbour network, used for hub roads, the Hospitality reach and the
   adjacency bonus. Footprints are a different question and must not use it: doing
   so let a horizontal company sit on two plots that only touch at a corner. */
function freeNeighbors(board, plot) { return orthOf(board, plot).filter((n) => plotFree(board, n)); }
function ownedFreeNeighbors(board, plot) { return freeNeighbors(board, plot).filter((n) => n in board.owner); }
/* Rank candidate plots by how much demand a business of `ind` could actually reach
   from there: open icons in the home district, plus hub access if the industry can
   use it. Building blind was leaving ~80% of bot production unsold. */
function plotDemandScore(state, ind, plotKeyStr) {
  const board = state.board;
  const c = board.cellOf[plotKeyStr];
  if (!c) return 0;
  const tileKey = `${c.r},${c.c}`;
  const t = state.demand && state.demand.tiles ? state.demand.tiles[tileKey] : null;
  let score = 0;
  if (t) {
    t.rows.forEach((rowInd, rowIdx) => {
      if (rowInd !== ind) return;
      const openable = rowIdx >= 2 && state.quarter <= 4 ? 0 : 1;
      for (let l = 0; l < 4; l++) if (openable && !t.filled[rowIdx][l]) score += 1;
    });
  }
  const canLH = ind !== "UT" && ind !== "RE";      // those two are never on the network
  if (canLH && plotHasLH(board, plotKeyStr)) score += 6;      // opens the whole hub network
  return score;
}
/* ---- how much of this company's output could actually be sold from here ----
   Built as a probe company and passed through the real eligibleSlotsFor, so it counts
   the home district, the hub network, the delivery column cap for that level and the
   Technology doubler exactly as delivery will. Bots used to value a card at
   production x price, assuming every unit sold; measured over 40 games they were only
   placing 38% of what they made and recycling the rest at $1. */
function sellableFrom(state, owner, bp, footprint) {
  const probe = { id: -1, bp, footprint, level: bp.lvl, upgraded: false, distressed: false,
    isHQ: false, epOnCard: 0, scored: false, quarterBuilt: state.quarter };
  const slots = eligibleSlotsFor(state, probe, owner).filter((s) => !s.cross).length;
  return slots * exchangeRate(state, probe);
}
/* Manufacturing pushes a level's worth of units into OTHER industries' rows in its own
   districts. Those units are EXTRA - the delivery loop funds them from their own budget
   and never touches the company's production - so a Manufacturing card's real output is
   its production plus this. Leaving them out made every Manufacturing card look worse
   than it plays, which is part of why the most profitable industry on the board was
   also among the least built. */
function crossSellUnits(state, owner, probe) {
  if (bizInd(probe) !== "MA") return 0;
  const slots = eligibleSlotsFor(state, probe, owner).filter((s) => s.cross).length;
  return Math.min(probe.level, slots);
}
/* The best any plot this player already owns could do for this blueprint. Returns null
   when they own nowhere to build, in which case the caller has nothing to judge by. */
function bestSellableFor(state, p, bp) {
  const mine = Object.keys(state.board.owner)
    .filter((k) => state.board.owner[k] === p.id && plotFree(state.board, k));
  if (!mine.length) return null;
  let best = 0, bestCross = 0;
  for (const plot of mine) {
    const units = sellableFrom(state, p, bp, [plot]);
    if (units < best) continue;
    const probe = { id: -1, bp, footprint: [plot], level: bp.lvl, upgraded: false,
      distressed: false, isHQ: false, epOnCard: 0, scored: false, quarterBuilt: state.quarter };
    best = units; bestCross = crossSellUnits(state, p, probe);
  }
  return { units: best, cross: bestCross };
}
function findFootprint(board, nPlots, rng, state, ind, bp, owner) {
  let pool = Object.keys(board.graph).filter((p) => plotFree(board, p) && p in board.owner);
  if (state && bp && owner) {
    // rank by what this exact company could sell from there, falling back to the
    // cheaper home-district count only to break ties
    pool = pool.map((pk) => [pk, sellableFrom(state, owner, bp, [pk]), plotDemandScore(state, bp.ind, pk)])
               .sort((a, b) => b[1] - a[1] || b[2] - a[2])
               .map(([pk]) => pk);
  } else if (state && ind) {
    // prefer plots where this industry can actually sell
    pool = pool.map((pk) => [pk, plotDemandScore(state, ind, pk)])
               .sort((a, b) => b[1] - a[1])
               .map(([pk]) => pk);
  }
  const candidates = state && (ind || bp) ? pool : shuffle(pool, rng);
  const grow = (start) => {
    const cluster = new Set([start]);
    let frontier = ownedFreeNeighbors(board, start);
    while (cluster.size < nPlots && frontier.length) {
      const idx = Math.floor(rng() * frontier.length);
      const nxt = frontier.splice(idx, 1)[0];
      if (cluster.has(nxt)) continue;
      cluster.add(nxt);
      frontier = frontier.concat(ownedFreeNeighbors(board, nxt).filter((p) => !cluster.has(p)));
    }
    return cluster.size >= nPlots ? [...cluster].slice(0, nPlots) : null;
  };
  /* A horizontal company grows by taking one more plot beside itself, so a spot with no
     empty ground next to it is a spot the company can never be upgraded from. Measured
     across 120 games, being boxed in was the single commonest reason a Utilities or
     Manufacturing company sat at level 1 all game - more common than having no money for
     the upgrade. Room to grow is therefore part of choosing where to build, not an
     afterthought at upgrade time. Vertical companies stack on their own plot and do not
     care. */
  const wantsRoom = bp ? SCALING[bp.ind] === "H" : (ind ? SCALING[ind] === "H" : false);
  if (!wantsRoom || !state || !bp || !owner) {
    for (const start of candidates) { const c = grow(start); if (c) return c; }
    return null;
  }
  const roomAround = (cluster) => {
    const set = new Set(cluster), seen = new Set();
    cluster.forEach((pk) => orthOf(board, pk).forEach((n) => {
      if (set.has(n) || seen.has(n)) return;
      // somewhere the company could later spread to: empty ground, owned or not
      if (!(n in board.occupiedBy)) seen.add(n);
    }));
    return seen.size;
  };
  let best = null, bestScore = -Infinity;
  for (const start of candidates.slice(0, 24)) {
    const cluster = grow(start);
    if (!cluster) continue;
    // units it could place now, plus what having somewhere to grow into is worth
    const score = sellableFrom(state, owner, bp, cluster) + Math.min(2, roomAround(cluster)) * 1.5;
    if (score > bestScore) { bestScore = score; best = cluster; }
  }
  if (best) return best;
  for (const start of candidates) { const c = grow(start); if (c) return c; }
  return null;
}
/* Is this footprint one connected building? Every plot must be reachable from every
   other by orthogonal steps within the footprint itself.

   Checked in the engine rather than only in the plot picker: online the footprint
   arrives over the wire, and the server must never take a client's word for the shape
   of a building. A three-plot company made of three unconnected plots used to be
   accepted, and diagonal ones were accepted everywhere. */
function footprintIsContiguous(board, footprint) {
  if (!Array.isArray(footprint) || !footprint.length) return false;
  if (new Set(footprint).size !== footprint.length) return false;      // no plot listed twice
  const want = new Set(footprint);
  const seen = new Set([footprint[0]]);
  const queue = [footprint[0]];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of orthOf(board, cur)) {
      if (!want.has(n) || seen.has(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return seen.size === want.size;
}
function adjacentFreePlot(board, footprint, rng, state, biz, owner) {
  const opts = new Set();
  footprint.forEach((p) => ownedFreeNeighbors(board, p).forEach((n) => opts.add(n)));
  footprint.forEach((p) => opts.delete(p));
  const arr = [...opts];
  if (!arr.length) return null;
  /* Growing sideways can reach into the next district, so where the new plot goes
     decides how much the bigger company can sell. Take the plot that opens the most
     demand; a random one was as likely to face a wall. */
  if (state && biz && owner) {
    let best = arr[0], bestSell = -1;
    for (const plot of arr) {
      const grown = { ...biz, level: biz.level + 1, footprint: [...footprint, plot] };
      const sell = eligibleSlotsFor(state, grown, owner).filter((s) => !s.cross).length;
      if (sell > bestSell) { bestSell = sell; best = plot; }
    }
    return best;
  }
  return arr[Math.floor(rng() * arr.length)];
}

/* ============================== DEMAND POOL (per-district 4x4 grid) ============================== */

const HC_CARRYING_FAMILIES = Object.entries(DEMAND_ROWS).filter(([f, rows]) => rows.includes("HC")).map(([f]) => f);
function makeDemandPool(board, rng) {
  const tiles = {};
  Object.entries(board.tiles).forEach(([key, tname]) => {
    const fam = districtFamily(tname);
    tiles[key] = { rows: DEMAND_ROWS[fam], filled: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] };
  });
  return { tiles, hcBonusTiles: [] };
}
function unlockY2(pool) { /* rows 2-3 gate purely on quarter at read-time; nothing to mutate */ }
function refreshY3(pool) {
  Object.values(pool.tiles).forEach((t) => { t.filled = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; });
}
function slotOpen(pool, tileKey, rowIdx, levelIdx, quarter) {
  const t = pool.tiles[tileKey];
  if (!t) return false;
  if (rowIdx >= 2 && quarter <= 4) return false;   // rows 3-4 open from Q5
  return !t.filled[rowIdx][levelIdx];
}
function slotIndustry(pool, tileKey, rowIdx) { return pool.tiles[tileKey]?.rows[rowIdx]; }

/* ---- reachability: which tiles can a business deliver to ---- */
function tileGridDist(a, b) {
  const [ar, ac] = a.split(",").map(Number), [br, bc] = b.split(",").map(Number);
  return Math.max(Math.abs(ar - br), Math.abs(ac - bc));
}
function footprintDistricts(board, footprint) {
  return new Set(footprint.map((plot) => { const c = board.cellOf[plot]; return `${c.r},${c.c}`; }));
}
function lhAdjacentDistricts(board, fromDistricts) {
  const out = new Set();
  board.lhEdges.forEach(([a, b]) => {
    const da = `${board.cellOf[a].r},${board.cellOf[a].c}`, db = `${board.cellOf[b].r},${board.cellOf[b].c}`;
    if (fromDistricts.has(da)) out.add(db);
    if (fromDistricts.has(db)) out.add(da);
  });
  return out;
}
function allDistrictKeys(board) { return [...new Set(Object.keys(board.cellOf).map((p) => { const c = board.cellOf[p]; return `${c.r},${c.c}`; }))]; }
function bestExtraDistrictsForRE(state, biz, count, home) {
  const others = allDistrictKeys(state.board).filter((d) => !home.has(d));
  const openCount = (d) => {
    const t = state.demand.tiles[d];
    if (!t) return 0;
    let n = 0;
    t.rows.forEach((rowInd, rowIdx) => {
      if (rowInd !== "RE") return;
      if (rowIdx >= 2 && state.quarter < 4) return;
      for (let l = 0; l < Math.min(biz.level, 4); l++) if (!t.filled[rowIdx][l]) n++;
    });
    return n;
  };
  others.sort((a, b) => openCount(b) - openCount(a) || tileGridDist([...home][0], a) - tileGridDist([...home][0], b));
  return others.slice(0, count);
}
function reachableDistricts(state, biz, chosenExtra) {
  const board = state.board;
  const home = footprintDistricts(board, biz.footprint);
  const out = new Set(home);
  // Utilities and Retail can never use Logistic Hubs; Healthcare uses the network natively,
  // everyone else needs a footprint plot actually touching a hub.
  // Utilities and Retail are never on the network: UT already reads a block of
  // districts of its own and RE picks extra districts outright, so giving them hubs
  // as well made them reach everywhere at once.
  const canUseLH = bizInd(biz) !== "UT" && bizInd(biz) !== "RE";
  const touchesAnyLH = biz.footprint.some((plot) => plotHasLH(board, plot));
  if (canUseLH && (bizInd(biz) === "HC" || touchesAnyLH)) {
    // one shared network: every district any hub reaches becomes reachable
    lhDistricts(board).forEach((d) => out.add(d));
  }
  if (bizInd(biz) === "UT") {
    /* A level-N Utility reads demand across an N x N block of districts that also
       encompasses its whole footprint. The old test (distance < level from ANY home
       district) actually described a (2N-1) x (2N-1) block, so a level-3 Utility could
       see the entire city instead of nine districts. */
    const N = biz.level;
    const rs = [...home].map((h) => +h.split(",")[0]);
    const cs = [...home].map((h) => +h.split(",")[1]);
    const minR = Math.min(...rs), maxR = Math.max(...rs);
    const minC = Math.min(...cs), maxC = Math.max(...cs);
    // every N x N block that still encompasses the whole footprint
    const blocks = [];
    for (let r0 = maxR - N + 1; r0 <= minR; r0++) {
      for (let c0 = maxC - N + 1; c0 <= minC; c0++) {
        const cells = [];
        for (let r = r0; r < r0 + N; r++) for (let c = c0; c < c0 + N; c++) cells.push(`${r},${c}`);
        blocks.push(cells.filter((d) => allDistrictKeys(board).includes(d)));
      }
    }
    // the owner picks one block, so take the one offering the most open demand
    const score = (cells) => cells.reduce((acc, d) => {
      const t = state.demand && state.demand.tiles ? state.demand.tiles[d] : null;
      if (!t) return acc;
      let k = 0;
      t.rows.forEach((rowInd, ri) => {
        if (rowInd !== "UT") return;
        if (ri >= 2 && state.quarter <= 4) return;
        for (let l = 0; l < Math.min(biz.level, 4); l++) if (!t.filled[ri][l]) k++;
      });
      return acc + k;
    }, 0);
    let best = blocks[0] || [];
    blocks.forEach((b2) => { if (score(b2) > score(best)) best = b2; });
    best.forEach((d) => out.add(d));
  }
  if (bizInd(biz) === "RE") {
    // the Supply Chain Expert reaches one district further this quarter
    const owner = ownerOf(state, biz);
    const bonus = (owner && state.reExtraDistrict && state.reExtraDistrict[owner.id]) ? 1 : 0;
    const explicit = chosenExtra || (state.reChoices && state.reChoices[biz.id]);
    const extra = explicit || bestExtraDistrictsForRE(state, biz, biz.level + bonus, home);
    extra.forEach((d) => out.add(d));
  }
  return out;
}
function adjacencyBonusCount(state, biz) {
  const board = state.board;
  const seen = new Set();
  biz.footprint.forEach((plot) => {
    board.graph[plot].forEach((n) => {
      if (biz.footprint.includes(n)) return;
      const occupied = n in board.occupiedBy;
      if (occupied || plotIsLH(board, n) || plotHasLH(board, n)) seen.add(n);
    });
  });
  return seen.size;
}
function exchangeRate(state, biz) {
  if (bizInd(biz) === "TE") return 2;   // Technology is the only doubler
  return 1;
}
/* Hospitality sells one unit per demand icon like everyone else, but additionally moves
   one extra unit for every business or Logistic Hub within `level` plots of its footprint.
   Those extra units are sold straight at the industry price - they need no demand icon. */
function hoBonusUnits(state, biz, owner) {
  if (bizInd(biz) !== "HO") return 0;
  const board = state.board;
  const foot = new Set(biz.footprint);
  const seen = new Set(biz.footprint);
  let frontier = [...biz.footprint];
  const countedBiz = new Set();
  let hubs = 0;
  for (let step = 0; step < biz.level; step++) {
    const next = [];
    for (const plot of frontier) {
      for (const n of (board.graph[plot] || [])) {
        if (seen.has(n)) continue;
        seen.add(n);
        next.push(n);
        const id = board.occupiedBy[n];
        if (id !== undefined && !foot.has(n)) countedBiz.add(id);
        if (plotIsLH(board, n) || plotHasLH(board, n)) hubs++;
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return countedBiz.size + hubs;
}
function ownerOf(state, biz) {
  return state.players.find((pl) => pl.businesses.includes(biz)) || null;
}
/* How deep into a demand row a company may sell. Normally that is its level, but a
   Public Health Director's clinics serve any column whatever their size.

   Everything that decides what may be delivered reads this one function: the bots'
   auto-delivery, the engine's own check, and the demand grid the human clicks. It
   was three separate copies of the rule before, and the grid's copy did not know
   about the persona - so the ability worked for bots and did nothing at all for the
   player holding it. */
function deliveryColumnCap(state, biz, owner) {
  const p = owner || ownerOf(state, biz);
  if (bizInd(biz) === "HC" && hasPersona(p, "preventive")) return 4;
  return Math.min(biz.level, 4);
}
/* `owner` is normally found from the state, but a bot weighing a company it has not
   built yet has no owner to find - it passes one in. Everything else is identical, so
   a bot's idea of what it could sell is the delivery rule itself, not a copy of it. */
function eligibleSlotsFor(state, biz, owner) {
  const __owner = owner || ownerOf(state, biz);
  const reach = reachableDistricts(state, biz);
  const ind = bizInd(biz), lvl = biz.level;
  const cap = deliveryColumnCap(state, biz, __owner);
  const out = [];
  reach.forEach((tileKey) => {
    const t = state.demand.tiles[tileKey];
    if (!t) return;
    t.rows.forEach((rowInd, rowIdx) => {
      if (rowInd !== ind) return;
      for (let levelIdx = 0; levelIdx < cap; levelIdx++) {
        if (slotOpen(state.demand, tileKey, rowIdx, levelIdx, state.quarter)) out.push({ tileKey, rowIdx, levelIdx, cross: false });
      }
    });
  });
  if (ind === "MA") {
    const home = footprintDistricts(state.board, biz.footprint);
    home.forEach((tileKey) => {
      const t = state.demand.tiles[tileKey];
      if (!t) return;
      t.rows.forEach((rowInd, rowIdx) => {
        if (rowInd === ind) return; // own-industry slots already covered above
        for (let levelIdx = 0; levelIdx < Math.min(lvl, 4); levelIdx++) {
          if (slotOpen(state.demand, tileKey, rowIdx, levelIdx, state.quarter)) out.push({ tileKey, rowIdx, levelIdx, cross: true });
        }
      });
    });
  }
  return out;
}
function deliverToSlot(state, biz, tileKey, rowIdx, levelIdx, cross) {
  if (!slotOpen(state.demand, tileKey, rowIdx, levelIdx, state.quarter)) return 0;
  const slotInd = slotIndustry(state.demand, tileKey, rowIdx);
  if (cross) {
    if (bizInd(biz) !== "MA" || slotInd === bizInd(biz)) return 0;
    if (!footprintDistricts(state.board, biz.footprint).has(tileKey)) return 0;
  } else if (slotInd !== bizInd(biz)) return 0;
  if (levelIdx >= deliveryColumnCap(state, biz)) return 0;
  state.demand.tiles[tileKey].filled[rowIdx][levelIdx] = 1;
  return cross ? 1 : exchangeRate(state, biz);
}
/* What one unit of this company's output is actually worth to this owner, including
   any persona effect. `slotInd` is the row being sold into, which only differs from the
   company's own industry when Manufacturing cross-sells. */
function unitPrice(state, p, biz, slotInd) {
  const own = price(state.pm, bizInd(biz));
  if (slotInd && slotInd !== bizInd(biz)) {
    // White-Label Supplier is paid the price of the row being sold into, not its own
    return hasPersona(p, "product_mgr") ? price(state.pm, slotInd) : own;
  }
  if (bizInd(biz) === "UT" && hasPersona(p, "gov_rel")) return own + 1;
  return own;
}
function autoDeliver(state, p, biz) {
  let remaining = bizProd(biz);
  // Hospitality moves extra units straight to neighbours, no demand icon required
  const hoBonus = Math.min(remaining, hoBonusUnits(state, biz, p));
  if (hoBonus > 0) { p.cash += hoBonus * unitPrice(state, p, biz); remaining -= hoBonus; }
  let crossRemaining = bizInd(biz) === "MA" ? biz.level : 0;
  let sold = 0, crossPaid = 0;
  const slots = eligibleSlotsFor(state, biz);
  for (const s of slots) {
    if (s.cross) {
      if (crossRemaining <= 0) continue;
      const got = deliverToSlot(state, biz, s.tileKey, s.rowIdx, s.levelIdx, true);
      if (got > 0) {
        crossRemaining -= got;
        crossPaid += got * unitPrice(state, p, biz, slotIndustry(state.demand, s.tileKey, s.rowIdx));
      }
    } else {
      if (remaining <= 0) continue;
      const got = deliverToSlot(state, biz, s.tileKey, s.rowIdx, s.levelIdx, false);
      if (got > 0) {
        const n = Math.min(got, remaining);
        sold += n * unitPrice(state, p, biz);
        remaining -= n;
      }
    }
  }
  const leftover = Math.max(0, remaining);
  p.cash += sold + crossPaid + leftover * 1;
}

function humanDeliver(state, human, tileKey, rowIdx, levelIdx, cross, log) {
  const bizId = state.deliveringBizId;
  const biz = human.businesses.find((b) => b.id === bizId);
  if (!biz) return false;
  const got = deliverToSlot(state, biz, tileKey, rowIdx, levelIdx, cross);
  if (got <= 0) return false;
  /* Pay through unitPrice, the same as the bots. This used to charge the plain market
     price, so a human holding White-Label Supplier or Concession Holder never actually
     collected what their persona promised - only the bots did. */
  const slotInd = cross ? slotIndustry(state.demand, tileKey, rowIdx) : null;
  const paid = got * unitPrice(state, human, biz, slotInd);
  human.cash += paid;
  if (cross) state.crossSellRemaining[bizId] = Math.max(0, (state.crossSellRemaining[bizId] || 0) - got);
  else state.deliveryRemaining[bizId] = Math.max(0, (state.deliveryRemaining[bizId] || 0) - got);
  log(`${human.name} delivers ${got} ${bizInd(biz)}${cross ? " (cross-sell)" : ""} to ${state.board.tiles[tileKey]} for $${paid}.`, human.id);
  return true;
}


function makePriceMatrix() {
  const demand = {}, offer = {};
  INDUSTRIES.forEach((i) => { demand[i] = 0; offer[i] = 0; });
  return { demand, offer };
}
/* Offer and demand move the price symmetrically: two steps in either direction are
   worth $1, and nothing ever sells below $1. Demand used to pay out a whole dollar per
   step while supply took two to claw one back, which made every supplier industry
   climb about twice as fast as the rulebook says it should. */
function price(pm, ind) {
  return Math.max(1, BASE_PRICE[ind] + Math.floor(pm.demand[ind] / 2) - Math.floor(pm.offer[ind] / 2));
}
function onLaunch(pm, ind, depInds) { pm.offer[ind] += 1; depInds.forEach((d) => (pm.demand[d] += 1)); }

/* ============================== GAME ENGINE ============================== */

const BP_SELL_PRICE = { 1: 4, 2: 8, 3: 12 };
/* Forced liquidation is punishing by design: a Blueprint fetches half what the same
   card would earn through a voluntary SELL (4/8/12 -> 2/4/6). */
const BP_SOLVENCY_PRICE = { 1: 2, 2: 4, 3: 6 };
/* ============================== PERSONAS ==============================
   Optional asymmetric powers, one per industry. Off unless a game is created with
   personas enabled, so the base game is unchanged. Each is a tilt, not a cage: the
   5 EP-per-industry bonus still pushes everyone toward breadth. */
const PERSONAS = {
  tech_savvy:  { ind: "TE", name: "Systems Architect",
    blurb: "Your Technology companies upgrade vertically, stacking on one plot instead of needing a free neighbour." },
  preventive:  { ind: "HC", name: "Public Health Director",
    blurb: "Your Healthcare companies ignore the level restriction: a level-1 clinic may serve any column of a Healthcare row." },
  product_mgr: { ind: "MA", name: "White-Label Supplier",
    blurb: "When your Manufacturing cross-sells into another industry's row, it is paid that industry's price rather than its own." },
  customer_or: { ind: "HO", name: "Resort Developer",
    blurb: "Your Hospitality companies upgrade horizontally, spreading across plots so more businesses and hubs sit adjacent to them." },
  supply_chain:{ ind: "RE", name: "Supply Chain Expert",
    blurb: "At the start of Revenue, raise one industry you do NOT operate by one step; your Retail then reaches one extra district this quarter." },
  gov_rel:     { ind: "UT", name: "Concession Holder",
    blurb: "Your Utilities production sells for $1 above the current price." },
};
/* ============================== VARIANTS ==============================
   Optional rule changes the host turns on before a game starts. Every one is off
   by default, so a table that touches nothing plays the printed rulebook exactly.
   The catalogue is data because three things read it: the lobby, the single-player
   setup screen, and the rulebook. */
/* ---- optional rules ----
   Every one of these is OFF by default, and a table that touches nothing plays
   exactly the printed Rulebook v13.

   They all read as "play it the older way", because that is what they are. Five
   rules that used to be optional became standard in v13 - companies score the
   moment they are finished, a level is worth 3 EP, the decks are shuffled whole,
   hubs stand on plots, and the land awards pay every year - so what remains
   switchable is the way the game worked before. Keeping them costs a boolean each
   and makes it possible to play the two side by side. */
const VARIANTS = [
  { key: "classicScoring", name: "Score at the year end",
    blurb: "A company waits for the next year end to take its EP, instead of scoring the moment it is built or upgraded." },
  { key: "singleLevelEP", name: "Levels score single",
    blurb: "A company level is worth 1 EP instead of 3, which moves the weight of the game back toward land and cash." },
  { key: "orderedDecks", name: "Ordered decks",
    blurb: "Each industry deck runs level 1 down to level 3, instead of being shuffled whole. The early game holds no surprises and no level 3 can be drafted." },
  { key: "roadHubs", name: "Hubs on the road",
    blurb: "A Logistic Hub straddles a border and joins the two districts either side, instead of standing on a plot and reaching only its own." },
  { key: "endgameLandAwards", name: "Land awards at the end only",
    blurb: "The Real-Estate Mogul and The Omnipresent are paid once, after Quarter 12, instead of at every year end." },
];
const VARIANT_KEYS = VARIANTS.map((v) => v.key);
/* Anything off the wire is untrusted, so read only the keys we know and coerce
   each to a boolean. A state built before a variant existed simply has it off. */
function normaliseVariants(v) {
  const out = {};
  VARIANT_KEYS.forEach((k) => { out[k] = !!(v && v[k]); });
  return out;
}
const hasVariant = (state, key) => !!(state && state.variants && state.variants[key]);
/* Company EP per level. Three is the standard: building and upgrading is the
   essence of the game, and at 1 EP a level it lost to land and cash. */
const levelEP = (state) => (hasVariant(state, "singleLevelEP") ? 1 : 3);

const PERSONA_KEYS = Object.keys(PERSONAS);
const hasPersona = (p, key) => !!p && p.persona === key;

const ARCHETYPES = ["balanced", "rush_cheap", "upgrade_focus", "tech_heavy", "vest_rebuild"];
const ARCHETYPE_LABEL = { balanced: "Balanced", rush_cheap: "Rush-Cheap", upgrade_focus: "Upgrade-Focus", tech_heavy: "Tech-Heavy", vest_rebuild: "Vest & Rebuild" };

let bizIdCounter = 1;
/* A footprint is not a flat area. A horizontal company spreads one level onto each plot
   it covers; a vertical one stacks all of its levels on a single plot. Personas can flip
   which way a company grows, so a Technology company that spread to two plots and was
   then upgraded vertically stands two storeys on one plot and one on the other.

   That matters for rent: a landlord collects $3 for every level standing on their plot,
   so the two-storey corner pays $6 and the neighbour pays $3. Recording the levels per
   plot is the only way the rent can be right, and it keeps the total at $3 x level. */
function startingLevels(bp, footprint) {
  const levels = {};
  if (footprint.length <= 1) levels[footprint[0]] = bp.lvl;      // one stack
  else footprint.forEach((plot) => { levels[plot] = 1; });       // one storey each
  return levels;
}
/* Businesses that predate this record, and any that arrive over the wire from an older
   client, fall back to the even split the previous rule described. */
function ensureLevels(b) {
  if (b.levels && b.footprint.every((pk) => pk in b.levels)) return b.levels;
  const n = b.footprint.length || 1;
  const base = Math.floor(b.level / n);
  let odd = b.level - base * n;
  const out = {};
  b.footprint.forEach((pk) => { out[pk] = base + (odd > 0 ? 1 : 0); if (odd > 0) odd--; });
  b.levels = out;
  return out;
}
const levelsOn = (b, plot) => ensureLevels(b)[plot] || 0;
function newBusiness(bp, footprint, quarterBuilt) {
  return { id: bizIdCounter++, bp, footprint, levels: startingLevels(bp, footprint), level: bp.lvl,
    upgraded: false, distressed: false, scored: false, epOnCard: 0, quarterBuilt };
}
const bizOpex = (b) => b.bp.opex * (b.upgraded ? 2 : 1);
const bizProd = (b) => b.bp.prod * (b.upgraded ? 2 : 1);
const bizSetup = (b) => b.bp.setup;
const bizInd = (b) => b.bp.ind;

const byId = (state, id) => state.players.find((p) => p.id === id);
/* Multiplayer: several players can be human, so every interactive phase works through
   a queue of player ids in turn order rather than assuming a single "the human". */
function humansNeedingLiquidation(state) {
  return state.turnOrder.filter((id) => {
    const p = byId(state, id);
    return p.isHuman && committedOpex(p) > 0 && p.cash < committedOpex(p);
  });
}
function humansNeedingDelivery(state) {
  return state.turnOrder.filter((id) => {
    const p = byId(state, id);
    return p.isHuman && humanDeliveryQueue(state, p).length > 0;
  });
}
function humansNeedingRepay(state) {
  return state.turnOrder.filter((id) => {
    const p = byId(state, id);
    return p.isHuman && p.discsInBank > 0;
  });
}
function newPlayer(id, name, isHuman, cash, hand, archetype) {
  return { id, name, isHuman, cash, hand, archetype, persona: null, businesses: [], discsInBank: 0, epBank: 0, epLog: [], industriesScored: [] };
}
const activeBiz = (p) => p.businesses.filter((b) => !b.distressed && !b.isHQ);
/* A Megacorp headquarters stops trading - no Blueprint, so no production, no OPEX and
   no share of any pot - but it is still a building of yours standing on the board. It
   keeps its disc and it locks one of your five company slots, so every Megacorp you
   form permanently narrows how wide you can operate. */
const megacorpHQs = (p) => p.businesses.filter((b) => b.isHQ);
const companySlotsUsed = (p) => activeBiz(p).length + megacorpHQs(p).length;
const COMPANY_SLOTS = 5;
const canLaunchMore = (p) => companySlotsUsed(p) < COMPANY_SLOTS;
const committedOpex = (p) => activeBiz(p).reduce((s, b) => s + bizOpex(b), 0);
function safeToSpend(p, spend, addedOpex = 0, buffer = 0.4) {
  return p.cash - spend >= (committedOpex(p) + addedOpex) * buffer;
}
/* The cost of caution falls as the game shortens: an unused company slot earns nothing,
   while a company built now still takes its one score at the next year end and produces
   until then. Late building is cheaper than it looks. */
function expansionBuffer(state) {
  return state.quarter >= 9 ? 0.15 : state.quarter >= 5 ? 0.28 : 0.4;
}
/* $10 of cash is worth 1 EP at the end; a company is worth its level once, plus its level
   again on every upgrade, plus 5 EP if it opens a new industry. Sitting on money is close to the worst thing a bot
   can do, so the safety buffer relaxes hard once the game is nearly over. */
function endgameSpendMode(state, p) {
  return state.quarter >= 9 && p.cash > 60;
}
/* Scoring rewards breadth (5 EP per distinct active industry) and endgame bonuses
   reward land and district spread. Bots were hoarding cash and finishing with ~1.6
   companies of a possible 5, so expansion is weighted much more aggressively. */
function missingIndustries(p) {
  const have = new Set(activeBiz(p).map(bizInd));
  return new Set(INDUSTRIES.filter((i) => !have.has(i)));
}
function districtsTouched(state, p) {
  const d = new Set();
  Object.entries(state.board.owner).forEach(([pk, v]) => {
    if (v !== p.id) return;
    const c = state.board.cellOf[pk];
    if (c) d.add(`${c.r},${c.c}`);
  });
  activeBiz(p).forEach((b) => b.footprint.forEach((pk) => {
    const c = state.board.cellOf[pk];
    if (c) d.add(`${c.r},${c.c}`);
  }));
  return d;
}
function addEP(p, amount, label, quarter) {
  if (!amount) return;
  p.epBank += amount;
  if (!p.epLog) p.epLog = [];
  p.epLog.push({ label, amount, quarter });
}
/* What a player would score if the game ended right now: banked EPs plus the
   tokens still sitting on scored BP cards (those vest at the Grand Finale). */
function epTotal(p) {
  return p.epBank + p.businesses.reduce((s, b) => s + (b.epOnCard || 0), 0);
}
/* A company puts its EP on its own card the moment it is finished - built or
   upgraded - the same way entering an industry pays the moment you build there.
   The card is the same card either way, so it still vests when the company is
   upgraded, sold, merged or the game ends.

   Under "Score at the year end" this does nothing and the year end picks the
   company up instead, which is how the game worked before v13. */
function scoreCompanyOnCompletion(state, biz) {
  if (hasVariant(state, "classicScoring") || !biz || biz.isHQ || biz.distressed) return;
  biz.epOnCard = biz.level * levelEP(state);
  biz.scored = true;
}
function vest(p, b, quarter) {
  if (b.epOnCard > 0) { addEP(p, b.epOnCard, `Vested: ${b.bp.name}`, quarter); b.epOnCard = 0; }
}

function sellCompany(p, b, solvency = false) {
  let recv;
  if (solvency) recv = b.upgraded ? Math.floor(bizSetup(b) / 2) : Math.floor(bizSetup(b) / 4);
  else recv = b.upgraded ? bizSetup(b) : Math.floor(bizSetup(b) / 2);
  p.cash += recv; b.distressed = true; vest(p, b);
  return recv;
}
function sellBpFromHand(state, p, bp, solvency = false) {
  const table = solvency ? BP_SOLVENCY_PRICE : BP_SELL_PRICE;
  p.cash += table[bp.lvl] || (solvency ? 2 : 4);
  p.hand = p.hand.filter((x) => x !== bp);
  if (state.decks[bp.ind]) state.decks[bp.ind].push(bp); // returns to bottom of its industry deck, recyclable
}
function worstRoiBusiness(p, pm, quarter, minAge = 1) {
  const cands = activeBiz(p).filter((b) => quarter - b.quarterBuilt >= minAge);
  if (!cands.length) return null;
  const roi = (b) => bizProd(b) * price(pm, bizInd(b)) - bizOpex(b) - 3 * b.level;
  return cands.reduce((worst, b) => (roi(b) < roi(worst) ? b : worst), cands[0]);
}
/* Score a Blueprint for launching. Price is the dominant term: an industry everyone
   is flooding drops toward $1 while an unbuilt one everybody depends on can reach $9+,
   so the same card can be worth several times more depending on the market. A flat
   breadth bonus used to swamp this entirely, which had bots piling into whatever was
   cheapest regardless of what it sold for. */
/* How many times the two land awards will still be paid. Standard is once per year
   end, so land is worth chasing from Quarter 1; under "Land awards at the end only"
   there is a single payout and it is a late-game move. The bots read this rather
   than assuming, or they would misprice every plot on the board. */
const landPayouts = (state) => {
  if (hasVariant(state, "endgameLandAwards")) return 1;
  return [4, 8, 12].filter((q) => q >= state.quarter).length || 1;
};
/* One plot is worth this much EP in expectation: the two awards are 10 and 5, paid
   `landPayouts` times, spread over the plots it takes to lead them. */
const landEPWeight = (state) => landPayouts(state) * 1.5;

/* $10 on hand is 1 EP at the end of the game. That rate is what makes it possible to
   compare a company's earnings with the points its building scores, so it is the unit
   everything below is measured in. */
const CASH_PER_EP = 10;

/* What will this industry pay ME, once my own company is standing in it?

   Building pushes your own industry's price down. A bot that reads the price before it
   builds is reading a price it will never sell at, which matters most in exactly the
   case that goes wrong: an industry already at the floor, where one more entrant is the
   difference between $2 and $1. */
function priceAfterMyBuild(pm, ind) {
  return Math.max(1, BASE_PRICE[ind] + Math.floor(pm.demand[ind] / 2) - Math.floor((pm.offer[ind] + 1) / 2));
}

/* What is a company actually worth, in points?

   The old version added the EP a building scores - a ONE-OFF - to a per-quarter cash
   return, and then multiplied the whole thing by its risk factors. That treated 3 EP as
   though it arrived every quarter, and it meant a cheap card scored well no matter what
   the market was doing: the price penalty scaled a term that had already been swamped.
   The result was a board full of $10 Retail selling at $1, which is what the balance
   audit found and what a human would never build.

   Everything is now on one clock and in one unit:
     - what it earns each quarter, for the quarters that are actually left
     - the money it earns, converted at the rate the game really pays for cash
     - the points the building scores, once
     - the 5 points for entering an industry, once, and only if it is really owed
     - minus what it costs to get standing, also converted to points

   A company that cannot sell now scores negative, which is the whole point. */
function launchScore(state, p, bp, archetype) {
  const pm = state.pm;
  const px = priceAfterMyBuild(pm, bp.ind);
  const qLeft = Math.max(1, 13 - (state.quarter || 1));

  // --- what it costs to get standing ---
  // Horizontal industries (UT/MA/TE) need one plot per level, and upgrading needs yet
  // another adjacent plot. That land is a real outlay the printed setup hides, and it
  // is why a level-3 Manufacturing is the most expensive thing on the board.
  const nPlots = SCALING[bp.ind] === "H" ? bp.lvl : 1;
  const owned = Object.entries(state.board.owner).filter(([k, v]) =>
    v === p.id && !(k in state.board.occupiedBy)).length;
  const mustBuy = Math.max(0, nPlots - owned);
  const totalOutlay = bp.setup + mustBuy * 3;   // mid-board plots run about $3

  // --- what it earns every quarter it stands ---
  // Rent is $3 per level, so a business on land you own returns that rent to you,
  // which materially narrows the gap between cheap-OPEX and expensive-OPEX industries.
  const rent = 3 * bp.lvl;
  const rentBack = owned >= nPlots ? rent : 0;
  const effOpex = bp.opex + rent - rentBack;

  /* Only what can be delivered earns the market price. Whatever the demand board
     cannot absorb is recycled at $1, so value it at $1 - which is what the bot will
     actually collect. This is the difference between judging a card by its printed
     production and judging the company you would actually be running. */
  const reach = bestSellableFor(state, p, bp);
  const sellable = reach === null ? bp.prod : Math.min(bp.prod, reach.units);
  const waste = Math.max(0, bp.prod - sellable);
  const cross = reach === null ? (bp.ind === "MA" ? bp.lvl : 0) : reach.cross;
  let perQuarter = (sellable + cross) * px + waste * 1 - effOpex;

  /* Two things say the good years will not last, and both belong on the revenue, not
     on the finished score. Other companies in your industry compete for the same demand
     icons; a picked-over deck means more of them are coming. */
  if (perQuarter > 0) {
    const ownActive = state.players.reduce((n, pl) =>
      n + activeBiz(pl).filter((b) => bizInd(b) === bp.ind).length, 0);
    const deckLeft = (state.decks && state.decks[bp.ind]) ? state.decks[bp.ind].length : 5;
    perQuarter *= 1 / (1 + 0.45 * ownActive);
    perQuarter *= Math.min(1.15, 0.92 + 0.025 * deckLeft);
  }

  /* Money already sitting in the pot is a stock, not a flow: an industry nobody serves
     has been collecting its suppliers' OPEX with nobody to collect it, and the first
     company in takes a share of the whole pile. */
  let potNow = 0;
  const pot = (state.pots && state.pots[bp.ind]) || 0;
  if (pot > 0) {
    const levelsThere = state.players.reduce((acc, pl) =>
      acc + activeBiz(pl).filter((b) => bizInd(b) === bp.ind).reduce((a, b) => a + b.level, 0), 0);
    potNow = pot * (bp.lvl / (levelsThere + bp.lvl));
  }

  // --- add it up, in points ---
  const cashEP = (perQuarter * qLeft + potNow) / CASH_PER_EP;
  const buildEP = bp.lvl * levelEP(state);
  /* The 5 EP for entering an industry is owed once per game, ever. Reading the live
     ledger rather than "do I have one standing right now" stops a bot rebuilding an
     industry it already scored and calling it 5 free points. */
  const debutEP = (p.industriesScored || []).includes(bp.ind) ? 0 : 5;
  const costEP = totalOutlay / CASH_PER_EP;
  let s = cashEP + buildEP + debutEP - costEP;

  // a horizontal build also needs a contiguous cluster, which gets harder as the city
  // fills and constrains where the business can ever be upgraded
  if (SCALING[bp.ind] === "H" && bp.lvl >= 2) s -= 1;

  // a player with a persona leans toward the industry it empowers, the way a human would
  if (p.persona && PERSONAS[p.persona] && PERSONAS[p.persona].ind === bp.ind) s += 3;

  if (archetype === "rush_cheap") s += (30 - bp.setup) / 15;
  else if (archetype === "tech_heavy" && bp.ind === "TE") s += 2;
  return s;
}
/* How many units could this exact company place, at this exact moment? The delivery
   rule itself, asked a question - not a copy of it. */
function sellableForBiz(state, owner, biz) {
  return eligibleSlotsFor(state, biz, owner).filter((s) => !s.cross).length * exchangeRate(state, biz);
}

/* What is upgrading worth, in the same points a build is measured in?

   Only two of the five archetypes ever upgraded, and they took the first upgradable
   company in their list rather than the best one. That is most of why the audit found
   level 2 and level 3 buildings almost exclusively in the two industries that happen to
   get built first, and why Utilities, Manufacturing and Technology sat at level 1 all
   game with their level 2 and 3 cards doing nothing.

   An upgrade is a purchase like any other: production and OPEX both double, rent rises
   by $3, a horizontal company gains a plot - and with it whatever districts that plot
   can reach, which for UT, MA and TE is the whole point of scaling sideways - and the
   building scores another level. */
/* `assumePlot` asks the question the other way round: what would this upgrade be worth
   if I owned that plot? A horizontal company can only grow onto an empty plot that
   somebody already owns, and that is the single biggest thing standing between the three
   sideways industries and their level 2 and 3 cards - so the plot that unblocks an
   upgrade has to be pricable before it is bought. */
function upgradeScore(state, p, b, assumePlot) {
  const blocked = upgradeBlockedReason(state, p, b);
  if (blocked && !(assumePlot && blocked.startsWith("no owned"))) return -Infinity;
  const qLeft = Math.max(1, 13 - (state.quarter || 1));
  const px = price(state.pm, bizInd(b));   // upgrading adds no new supply to the market
  const spreads = upgradeScaling(p, b) === "H";

  const nowUnits = Math.min(bizProd(b), sellableForBiz(state, p, b));
  const nowNet = (nowUnits + crossSellUnits(state, p, b)) * px
    + Math.max(0, bizProd(b) - nowUnits) * 1 - bizOpex(b) - 3 * b.level;

  /* Where it would grow to. A sideways step reaches from a new plot, so ask the
     delivery rule about the grown footprint rather than assuming the reach is the same. */
  let grownFootprint = b.footprint;
  if (spreads) {
    let opts = adjacentOwnedFreePlots(state.board, b.footprint);
    if (!opts.length && assumePlot) opts = [assumePlot];
    if (!opts.length) return -Infinity;
    let best = null, bestUnits = -1;
    for (const plot of opts) {
      const probe = { ...b, level: b.level + 1, upgraded: true, footprint: [...b.footprint, plot] };
      const u = sellableForBiz(state, p, probe);
      if (u > bestUnits) { bestUnits = u; best = plot; }
    }
    grownFootprint = [...b.footprint, best];
  }
  const grown = { ...b, level: b.level + 1, upgraded: true, footprint: grownFootprint };
  const grownProd = bizProd(grown);
  const grownUnits = Math.min(grownProd, sellableForBiz(state, p, grown));
  const grownNet = (grownUnits + crossSellUnits(state, p, grown)) * px
    + Math.max(0, grownProd - grownUnits) * 1 - bizOpex(grown) - 3 * grown.level;

  const cashEP = (grownNet - nowNet) * qLeft / CASH_PER_EP;
  const buildEP = levelEP(state);                        // one more level on the card
  const costEP = bizSetup(b) / CASH_PER_EP;
  let s = cashEP + buildEP - costEP;

  /* A bigger company also reads more of each demand tile - the column cap is its level -
     so the next upgrade after this one is worth more than this one. Worth a nudge, not
     a term: it only pays if the company survives to use it. */
  if (b.level < 3 && qLeft >= 4) s += 0.5;
  return s;
}
/* The best upgrade on this player's board, and what it is worth. */
function bestUpgrade(state, p) {
  let best = null, bestScore = -Infinity;
  for (const b of activeBiz(p)) {
    if (b.upgraded || b.isHQ) continue;
    const s = upgradeScore(state, p, b);
    if (s > bestScore) { bestScore = s; best = b; }
  }
  return best ? { biz: best, score: bestScore } : null;
}

function pickLaunchCandidate(p, archetype, pm, missingInds, buffer, state) {
  if (!p.hand.length) return null;
  let scored = [];
  for (const bp of p.hand) {
    if (!safeToSpend(p, bp.setup, bp.opex, buffer)) continue;
    const s = state ? launchScore(state, p, bp, archetype)
                    : (bp.prod * price(pm, bp.ind) - bp.opex) / Math.max(1, bp.setup);
    scored.push([s, bp]);
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b[0] - a[0]);
  return scored[0][1];
}
/* The same choice, but saying what the card is worth as well as which one it is, so a
   build can be weighed against an upgrade instead of always beating it. */
function bestLaunch(state, p, archetype, buffer) {
  const bp = pickLaunchCandidate(p, archetype, state.pm, undefined, buffer, state);
  if (!bp) return null;
  return { bp, score: launchScore(state, p, bp, archetype) };
}

/* Entering an industry pays 5 EP straight away, the moment the first company of that
   type is built, rather than waiting for a year-end. It is banked immediately and can
   never be earned twice, so it is not placed on a card and does not need vesting. */
function claimIndustryBonus(state, p, ind, log) {
  p.industriesScored = p.industriesScored || [];
  if (p.industriesScored.includes(ind)) return;
  p.industriesScored.push(ind);
  addEP(p, 5, `Entered ${ind}`, state.quarter);
  if (log) log(`${p.name} enters ${ind} for the first time (+5 EP).`, p.id);
}
function doLaunch(state, p, bp, rng, log, manualFootprint) {
  const nPlots = SCALING[bp.ind] === "H" ? bp.lvl : 1;
  const footprint = manualFootprint || findFootprint(state.board, nPlots, rng, state, bp.ind, bp, p);
  if (!footprint || footprint.length !== nPlots) return false;
  if (!footprint.every((plot) => plot in state.board.owner && plotFree(state.board, plot))) return false;
  if (!footprintIsContiguous(state.board, footprint)) return false;
  if (p.cash < bp.setup) return false;
  if (discsFree(state, p) <= 0) return false;   // no disc left to mark the new company
  p.cash -= bp.setup;
  const biz = newBusiness(bp, footprint, state.quarter);
  footprint.forEach((plot) => (state.board.occupiedBy[plot] = biz.id));
  p.businesses.push(biz);
  p.hand = p.hand.filter((x) => x !== bp);
  scoreCompanyOnCompletion(state, biz);
  onLaunch(state.pm, bp.ind, bp.deps.map((d) => d.ind));
  log(`${p.name} launches ${bp.name} (${bp.ind} L${bp.lvl}) for $${bp.setup} (cash: $${Math.round(p.cash)}).`, p.id);
  claimIndustryBonus(state, p, bp.ind, log);
  return true;
}
/* Returns null if the upgrade is legal, otherwise a short reason. Used to disable
   the button up front instead of burning the action and logging a failure. */
/* Personas can flip how their own industry grows. Defined once so the rule itself and
   the button that predicts it can never disagree. */
function upgradeScaling(p, b) {
  const ind = bizInd(b);
  if (ind === "TE" && hasPersona(p, "tech_savvy")) return "V";    // stacks instead of spreading
  if (ind === "HO" && hasPersona(p, "customer_or")) return "H";   // spreads instead of stacking
  return SCALING[ind];
}
function upgradeBlockedReason(state, p, b) {
  if (b.isHQ) return "is a Megacorp HQ";
  if (b.upgraded) return "already upgraded";
  if (p.cash < bizSetup(b)) return `needs $${bizSetup(b)}, you have $${Math.round(p.cash)}`;
  if (upgradeScaling(p, b) === "H") {
    const opts = adjacentOwnedFreePlots(state.board, b.footprint);
    if (!opts.length) return "no owned, empty plot adjacent to it";
  }
  return null;
}
/* The same orthogonal rule as freeNeighbors, phrased for the whole footprint - this
   is what tells a player WHY an upgrade is blocked, so it has to agree with what the
   upgrade will actually accept. */
function adjacentOwnedFreePlots(board, footprint) {
  const out = new Set();
  footprint.forEach((pk) => orthOf(board, pk).forEach((n) => {
    if (!footprint.includes(n) && n in board.owner && plotFree(board, n)) out.add(n);
  }));
  return [...out];
}
function doUpgrade(state, p, b, rng, log, manualPlot) {
  if (b.upgraded) return false;
  if (p.cash < bizSetup(b)) return false;   // affordability only - safeToSpend is a bot heuristic
  if (upgradeScaling(p, b) === "H") {
    const newPlot = manualPlot || adjacentFreePlot(state.board, b.footprint, rng, state, b, p);
    if (!newPlot || !(newPlot in state.board.owner) || !plotFree(state.board, newPlot)) return false;
    // it has to actually touch the building, orthogonally - a manual plot arrives from
    // the client online, so this cannot be left to the picker either
    if (!orthOf(state.board, newPlot).some((n) => b.footprint.includes(n))) return false;
    p.cash -= bizSetup(b);
    ensureLevels(b)[newPlot] = 1;                // the new wing is one storey
    b.footprint.push(newPlot);
    state.board.occupiedBy[newPlot] = b.id;
  } else {
    /* Vertical growth stacks the new level on one plot the company already stands on.
       Which one is a real choice: rent for every level on a plot goes to that plot's
       owner, so stacking on your own land brings the whole rent back to you. */
    const mine = b.footprint.filter((pk) => state.board.owner[pk] === p.id);
    const target = manualPlot && b.footprint.includes(manualPlot) ? manualPlot
                 : (mine[0] || b.footprint[0]);
    p.cash -= bizSetup(b);
    const levels = ensureLevels(b);
    levels[target] = (levels[target] || 0) + 1;
  }
  b.upgraded = true; b.level += 1;
  vest(p, b, state.quarter); b.scored = false;
  scoreCompanyOnCompletion(state, b);
  log(`${p.name} upgrades ${b.bp.name} to level ${b.level} for $${bizSetup(b)} (cash: $${Math.round(p.cash)}).`, p.id);
  return true;
}
function doDraw(state, p, industry, log) {
  if (!state.decks[industry] || !state.decks[industry].length || p.hand.length >= 5) return false;
  p.hand.push(state.decks[industry].shift());
  log(`${p.name} draws from the ${industry} deck.`, p.id);
  return true;
}
/* Stamped by build.mjs from a hash of the rules code above - do not edit by hand. The
   server reads this file at boot, so if a deployment updates the client but not this
   file the two will disagree and the UI says so instead of silently playing by old
   rules. Change any rule, run the build, and this moves on its own. */
const ENGINE_VERSION = "adbbea5f";
const DISCS_PER_PLAYER = 10;
/* Every disc a player owns is committed somewhere: on a plot they own, on an active
   business, or sitting in the bank against a loan. Ten discs, no more. */
function plotsOwned(state, p) {
  return Object.values(state.board.owner).filter((v) => v === p.id).length;
}
function discsUsed(state, p) {
  return plotsOwned(state, p) + companySlotsUsed(p) + p.discsInBank;
}
function discsFree(state, p) { return DISCS_PER_PLAYER - discsUsed(state, p); }

function doLoan(state, p, log) {
  if (p.discsInBank >= DISCS_PER_PLAYER) { log(`${p.name} has no discs left to pledge for a loan.`, p.id); return false; }
  if (discsFree(state, p) <= 0) { log(`${p.name} has all ${DISCS_PER_PLAYER} discs committed \u2014 cannot take a loan.`, p.id); return false; }
  p.cash += 20; p.discsInBank += 1;
  log(`${p.name} takes a loan (+$20, +1 disc) (cash: $${Math.round(p.cash)}, discs used: ${discsUsed(state, p)}/${DISCS_PER_PLAYER}).`, p.id);
  return true;
}
function doSellCompany(p, b, log, solvency = false) {
  const recv = sellCompany(p, b, solvency);
  log(`${p.name} sells ${b.bp.name} for $${recv}${solvency ? " (SOLVENCY - half price)" : ""} (cash: $${Math.round(p.cash)}).`, p.id);
}
/* `solvency` is set when the sale is forced by a bill you cannot pay. Everything then
   goes for half what a planned sale through Raise Capital would fetch - which is the
   whole difference between choosing to sell and having to. */
function doSellBP(state, p, bp, log, solvency = false) {
  const before = p.cash;
  sellBpFromHand(state, p, bp, solvency);
  log(`${p.name} sells ${bp.name} from hand for $${Math.round(p.cash - before)}${solvency ? " (SOLVENCY - half price)" : ""} (cash: $${Math.round(p.cash)}).`, p.id);
}

function runProduction(state, log) {
  const { players, board, pm } = state;
  for (const p of players) {
    let bill = committedOpex(p);
    while (p.cash < bill && p.hand.length) {
      const bp = p.hand.reduce((a, b) => ((BP_SELL_PRICE[a.lvl] || 4) < (BP_SELL_PRICE[b.lvl] || 4) ? a : b));
      sellBpFromHand(state, p, bp, false);
    }
    while (p.cash < bill) {
      const cheapPlot = cheapestOwnedPlot(state, p);
      if (!cheapPlot) break;
      doSellPlot(state, p, cheapPlot, log, false);
      bill = committedOpex(p);
    }
    while (p.cash < bill) {
      const worst = worstRoiBusiness(p, pm, state.quarter, 0);
      if (!worst) break;
      sellCompany(p, worst, false);
      bill = committedOpex(p);
    }
    if (p.cash < bill) { p.cash += 20; p.discsInBank += 1; }
  }
  for (const p of players) {
    for (const b of activeBiz(p)) {
      const cost = bizOpex(b);
      if (p.cash < cost) {
        state.solvencyEvents++;
        let debt = cost - p.cash; p.cash = 0;
        while (debt > 0 && p.hand.length) {
          const bp = p.hand.reduce((a, x) => ((BP_SOLVENCY_PRICE[a.lvl] || 2) < (BP_SOLVENCY_PRICE[x.lvl] || 2) ? a : x));
          const before = p.cash; sellBpFromHand(state, p, bp, true); debt -= p.cash - before;
        }
        while (debt > 0) {
          const cheapPlot = cheapestOwnedPlot(state, p);
          if (!cheapPlot) break;
          const before = p.cash; doSellPlot(state, p, cheapPlot, log, true); debt -= p.cash - before;
        }
        const liquidatable = activeBiz(p).filter((x) => x.id !== b.id);
        for (const x of liquidatable) { if (debt <= 0) break; const before = p.cash; sellCompany(p, x, true); debt -= p.cash - before; }
        sellCompany(p, b, true);
        log(`${p.name} enters SOLVENCY on ${b.bp.name}.`, p.id);
        continue;
      }
      p.cash -= cost;
      const rentTotal = 3 * b.level;
      /* $3 for every level standing on a plot, paid to whoever owns that plot. A
         two-storey corner pays its landlord $6 while the single-storey neighbour
         collects $3, and the total still comes to $3 x level. */
      for (const plot of b.footprint) {
        const due = 3 * levelsOn(b, plot);
        const ownerId = board.owner[plot];
        if (ownerId !== undefined) { const owner = players.find((pl) => pl.id === ownerId); if (owner) owner.cash += due; }
      }
      /* Whatever survives rent flows into each supplier's industry pot, split in
         proportion to what this business owes them. Whole dollars only: each supplier
         takes its share rounded down, and the odd dollars go to the largest dependency
         first, so the company's whole bill still leaves its hands. Pots used to hold
         fractions of a dollar, which no table can pay and which then leaked out through
         the Megacorp siphon. */
      if (!state.pots) state.pots = Object.fromEntries(INDUSTRIES.map((i) => [i, 0]));
      const toPots = Math.max(0, cost - rentTotal);
      const deps = b.bp.deps;
      if (deps.length && toPots > 0) {
        const depTotal = deps.reduce((s2, d) => s2 + d.val, 0) || 1;
        const shares = deps.map((d) => Math.floor((toPots * d.val) / depTotal));
        let rest = toPots - shares.reduce((s2, v) => s2 + v, 0);
        const biggestFirst = deps.map((d, i) => i).sort((x, y) => deps[y].val - deps[x].val);
        for (let k = 0; rest > 0; k = (k + 1) % biggestFirst.length) { shares[biggestFirst[k]] += 1; rest--; }
        deps.forEach((d, i) => { state.pots[d.ind] += shares[i]; });
      }
    }
  }
}
/* Revenue - B2B. Each industry pot is split evenly among the active businesses of that
   industry - one equal share each, whatever their level - and whatever will not divide
   cleanly rides forward. An industry with no active business keeps its whole pot. */
/* Supply Chain Expert: at the start of Revenue, push one industry you do not operate up
   one step. It costs you nothing directly but helps a rival's market, and in exchange
   your Retail reaches one more district this quarter. */
function applySupplyChainBump(state, log) {
  for (const p of state.players) {
    if (!hasPersona(p, "supply_chain")) continue;
    if (!activeBiz(p).some((b) => bizInd(b) === "RE")) continue;
    const mine = new Set(activeBiz(p).map(bizInd));
    const options = INDUSTRIES.filter((i) => !mine.has(i));
    if (!options.length) continue;
    // help whichever outside industry is cheapest to lift; bots take the top one
    const pick = options.sort((a, b) => price(state.pm, a) - price(state.pm, b))[0];
    state.pm.demand[pick] += 1;   // one step of extra demand for that industry
    state.reExtraDistrict = state.reExtraDistrict || {};
    state.reExtraDistrict[p.id] = true;
    if (log) log(`${p.name} works the supply chain: ${pick} demand rises, and Retail reaches one extra district this quarter.`, p.id);
  }
}
function runB2B(state, log) {
  if (!state.pots) return;
  runMegacorpSyphon(state, log);
  for (const ind of INDUSTRIES) {
    const pot = state.pots[ind];
    if (pot <= 0.005) continue;
    const recipients = [];
    state.players.forEach((p) => activeBiz(p).forEach((b) => { if (bizInd(b) === ind) recipients.push({ p, b }); }));
    if (!recipients.length) continue;                    // nobody to pay: carries over
    /* One equal share each, whatever size the companies are, and whatever will not
       divide cleanly rides forward in the pot. A big company draws no more from the
       pot than a small one - it is the industry that is being paid, not the building. */
    const share = Math.floor(pot / recipients.length);
    if (share < 1) continue;                             // too small to split: it rides forward
    recipients.forEach((r) => { r.p.cash += share; });
    state.pots[ind] = pot - share * recipients.length;
    if (log) log(`${ind} pot pays $${share} to each of ${recipients.length} ${ind} business${recipients.length === 1 ? "" : "es"}${state.pots[ind] >= 1 ? `; $${Math.floor(state.pots[ind])} carries over` : ""}.`, null);
  }
}
function potRecipients(state, ind) {
  let n = 0, levels = 0;
  state.players.forEach((p) => activeBiz(p).forEach((b) => { if (bizInd(b) === ind) { n++; levels += b.level; } }));
  return { n, levels };
}

/* Kept for the balance harnesses, which run all-bot tables and never enter the
   delivery phase. Real games go through advanceDelivery, in turn order. */
function runBotRevenue(state) {
  for (const p of state.players) {
    if (p.isHuman) continue;
    for (const b of activeBiz(p)) if (businessCanProduce(state, b)) autoDeliver(state, p, b);
  }
}
function humanDeliveryQueue(state, human) {
  return activeBiz(human).filter((b) => businessCanProduce(state, b) && (bizProd(b) > 0 || (bizInd(b) === "MA" && b.level > 0)));
}
/* `b` is the second plot of the road the hub straddles, and is unused when hubs
   stand on plots - there the whole placement is the single plot `a`. */
function doPlaceLH(state, a, b, log) {
  if (state.board.lhOnPlots) {
    if (!state.board.graph[a] || !plotFree(state.board, a)) return false;
    state.board.lhPlots.push(a);
    logNewLH(state, [districtOf(state.board, a)], log);
    return true;
  }
  const ek = edgeKey(a, b);
  if (state.board.lhEdges.some((e) => edgeKey(e[0], e[1]) === ek)) return false;
  if (!state.board.graph[a] || !state.board.graph[a].has(b)) return false;
  if (!isCrossDistrictEdge(state.board, a, b)) return false;
  state.board.lhEdges.push([a, b]);
  logNewLH(state, [districtOf(state.board, a), districtOf(state.board, b)], log);
  return true;
}
function runClosing(state, log, rng) {
  const { quarter, demand } = state;
  if (quarter === 4) unlockY2(demand);
  if (quarter === 8) refreshY3(demand);
  const firstPlayer = byId(state, state.turnOrder[0]);
  if (firstPlayer.isHuman) {
    state.phase = "placingLH";
    state.awaitingPlayerId = firstPlayer.id;
    return;
  }
  placeNewLH(state, rng, log);
  // NOTE: year-end scoring lives in runClosingRest, which finishQuarterAfterLH always
  // calls. Calling it here too would score the year twice whenever the human is not
  // the first player (the branch above returns early only for the human).
}
const LOAN_REPAY_RATE = { 4: 30, 8: 35, 12: 40 };
function doRepayLoan(p, quarter, log) {
  const rate = LOAN_REPAY_RATE[quarter];
  if (!rate || p.discsInBank <= 0 || p.cash < rate) return false;
  p.cash -= rate;
  p.discsInBank -= 1;
  log(`${p.name} repays a loan for $${rate} (${p.discsInBank} disc${p.discsInBank === 1 ? "" : "s"} left).`, p.id);
  return true;
}
function botRepayLoans(state, p, quarter, log) {
  const rate = LOAN_REPAY_RATE[quarter];
  if (!rate) return;
  if (quarter === 12) {
    // Final scoring: there is no next quarter to fund. An unpaid disc is -5 EP, while
    // the $40 it costs is only worth 4 EP as cash, so clearing debt is strictly better.
    while (p.discsInBank > 0 && p.cash >= rate) {
      if (!doRepayLoan(p, quarter, log)) break;
    }
    return;
  }
  // mid-game: repay while it still leaves enough cash to cover committed OPEX
  while (p.discsInBank > 0 && p.cash - rate >= committedOpex(p) * 0.6) {
    if (!doRepayLoan(p, quarter, log)) break;
  }
}
function runClosingRest(state, log) {
  const { players, quarter } = state;
  if ([4, 8, 12].includes(quarter)) {
    for (const p of players) {
      for (const b of activeBiz(p)) if (!b.scored) { b.epOnCard = b.level * levelEP(state); b.scored = true; }
      // Each industry pays its 5 EP once per game, the first year a company of that
      // type is active. Entering a new industry is what scores, not holding one.
      // (industry bonuses are awarded on construction, see claimIndustryBonus)
      // NOTE: previously a player at the 5-company cap sold its worst company here
      // every year end. That threw away 1 EP/level plus possibly 5 EP for the industry,
      // for no gain - being full is the goal, not a problem. Removed.
    }
    /* The two land awards are handed out at every year end, so holding the most land
       in Year 1 is worth something even if you lose it later - and with companies
       now scoring the moment they are finished, these two are what a year end is
       FOR. Quarter 12 is left to finalizeGame, which awards them once as part of
       final scoring. Under "Land awards at the end only" that is the sole payout. */
    if (!hasVariant(state, "endgameLandAwards") && quarter !== 12) {
      awardRanked(state, (p) => plotCount(state, p), "The Real-Estate Mogul", log);
      awardRanked(state, (p) => districtCount(state, p), "The Omnipresent", log);
    }
    log(`\u2014\u2014\u2014 Year-end scoring complete (Q${quarter}) \u2014\u2014\u2014`, null);
    if (quarter === 12) for (const p of players) for (const b of p.businesses) vest(p, b, quarter);
    for (const p of players) if (!p.isHuman) botRepayLoans(state, p, quarter, log);
  }
}
function awardRanked(state, scoreFn, label, log) {
  const scores = state.players.map((p) => ({ p, s: scoreFn(p) })).filter((x) => x.s > 0);
  if (!scores.length) return;
  scores.sort((a, b) => b.s - a.s);
  const values = [10, 5];
  let i = 0;
  while (i < scores.length && i < values.length) {
    let j = i;
    while (j + 1 < scores.length && scores[j + 1].s === scores[i].s) j++;
    const tiedCount = j - i + 1;
    const pot = values.slice(i, Math.min(j + 1, values.length)).reduce((a, b) => a + b, 0);
    /* Rounded down, like every other split in the game: a two-way tie for first takes
       7 EP each rather than 7.5, and the odd point is simply not awarded. A score track
       has no half points on it. */
    const share = Math.floor(pot / tiedCount);
    if (share <= 0) { i = j + 1; continue; }
    // stamp the quarter it was actually awarded in - under the yearly-land variant this
    // runs at Q4 and Q8 too, and hardcoding 12 made the scoring log claim otherwise
    for (let k = i; k <= j; k++) { addEP(scores[k].p, share, label, state.quarter); if (log) log(`${scores[k].p.name} earns ${label} (+${share} EP).`, scores[k].p.id); }
    i = j + 1;
  }
}
/* The two endgame land awards, exposed so the standings can show the same running
   totals players will actually be scored on. */
function plotCount(state, p) {
  return Object.values(state.board.owner).filter((id) => id === p.id).length;
}
function districtCount(state, p) {
  const districts = new Set();
  Object.entries(state.board.owner).forEach(([plot, id]) => {
    if (id === p.id) districts.add(`${state.board.cellOf[plot].r},${state.board.cellOf[plot].c}`);
  });
  activeBiz(p).forEach((b) => b.footprint.forEach((plot) => districts.add(`${state.board.cellOf[plot].r},${state.board.cellOf[plot].c}`)));
  return districts.size;
}
/* Final standings. EP first; a tie is broken by money, and then by having fewer loan
   discs still sitting in the bank. Ranking used to be EP alone, so a tied game picked
   its winner by whatever order the players happened to be sitting in. */
function finalRank(a, b) {
  return epTotal(b) - epTotal(a) || b.cash - a.cash || a.discsInBank - b.discsInBank;
}
function finalizeGame(state) {
  awardRanked(state, (p) => plotCount(state, p), "The Real-Estate Mogul", null);
  awardRanked(state, (p) => districtCount(state, p), "The Omnipresent", null);
  for (const p of state.players) {
    if (p.discsInBank) addEP(p, -5 * p.discsInBank, `Unpaid loans (${p.discsInBank} disc${p.discsInBank === 1 ? "" : "s"})`, 12);
    const cashEP = Math.floor(p.cash / 10);
    if (cashEP) addEP(p, cashEP, `Cash on hand ($${Math.round(p.cash)})`, 12);
  }
}

/* ---------------- Megacorp tiles ---------------- */
const MEGACORP_TILES = [
  ["Local Syndicate", { 1: 3 }, 8], ["Founders\u2019 Pact", { 1: 2, 2: 1 }, 9],
  ["Continental Holdings", { 1: 4 }, 10], ["Twin Ventures", { 1: 1, 2: 2 }, 10],
  ["Silent Merger", { 2: 3 }, 11], ["Neighborhood Holdings", { 1: 3, 2: 1 }, 12],
  ["Regional Consolidated", { 2: 2, 3: 1 }, 13], ["Crosstown Alliance", { 1: 2, 2: 2 }, 13],
  ["Metro Trust", { 2: 1, 3: 2 }, 14], ["Crossroads Deal", { 1: 1, 2: 3 }, 14],
  ["Skyline Consolidated", { 3: 3 }, 15], ["Apex Group", { 2: 2, 3: 2 }, 16],
  ["Titan Industries", { 3: 2, 4: 1 }, 17], ["Colossus Group", { 3: 4 }, 19],
  ["Empire Holdings", { 2: 1, 3: 2, 4: 1 }, 20], ["Omnicorp", { 3: 3, 4: 1 }, 22],
];
function tryMatchMegacorp(bizList, combo) {
  const needed = { ...combo };
  const have = [];
  for (const b of bizList) { if (needed[b.level] > 0) { needed[b.level] -= 1; have.push(b); } }
  return Object.values(needed).every((v) => v <= 0) ? have : null;
}
function bestMegacorpMatch(bizList, pool) {
  let best = null;
  for (const tile of pool) {
    const [name, combo, ep] = tile;
    const have = tryMatchMegacorp(bizList, combo);
    if (have && (!best || ep > best.ep)) best = { tile, have, ep };
  }
  return best;
}
/* Going public always means merging companies for a Megacorp tile, from the very first
   time it is done. The IPO tile is not a separate action you can take: it is the prize
   for being first, and forming the first Megacorp of the game is what wins it and opens
   the second Board Meeting seat. */
function claimMegacorp(state, p, log, hqChoice) {
  const match = bestMegacorpMatch(activeBiz(p), state.megacorpPool);
  if (!match) { log(`${p.name} has no company combo matching an available Megacorp tile.`, p.id); return false; }
  const [name, combo, ep] = match.tile;
  // One of the merged companies becomes the Megacorp HQ: it keeps its building and the
  // owner's disc, gains a Megacorp block, and its BP returns to its industry deck.
  // Bots take the highest-level company; the human is asked to choose.
  const hq = hqChoice && match.have.includes(hqChoice)
    ? hqChoice
    : match.have.reduce((a, b) => (b.level > a.level ? b : a));
  match.have.forEach((b) => {
    vest(p, b, state.quarter);
    if (b === hq) return;
    b.distressed = true;
  });
  hq.isHQ = true;
  hq.distressed = false;
  hq.megacorpName = name;
  if (state.decks && state.decks[hq.bp.ind]) state.decks[hq.bp.ind].push(hq.bp);   // BP back to its deck
  addEP(p, ep, `Megacorp: ${name}`, state.quarter);
  state.megacorpPool = state.megacorpPool.filter((t) => t !== match.tile);
  log(`${p.name} forms Megacorp "${name}" (+${ep} EP, EP total: ${p.epBank.toFixed(0)}) \u2014 ${hq.bp.name} becomes its HQ, ${match.have.length - 1} other compan${match.have.length - 1 === 1 ? "y goes" : "ies go"} distressed.`, p.id);
  // first Megacorp of the game also takes the IPO tile, which opens Board Meeting's second seat
  if (!state.ipoTileClaimed) {
    state.ipoTileClaimed = true;
    addEP(p, 5, "IPO tile", state.quarter);
    log(`${p.name} was first to go public and takes the IPO tile (+5 EP) \u2014 Board Meeting's second seat is now open.`, p.id);
  }
  return true;
}

/* Revenue - B2B, step 1: every Megacorp HQ siphons $5 out of the industry pot that each
   adjacent active business draws from, before the pots are shared out. */
function runMegacorpSyphon(state, log) {
  if (!state.pots) return;
  for (const p of state.players) {
    for (const hq of p.businesses.filter((b) => b.isHQ)) {
      const neighbourIds = new Set();
      hq.footprint.forEach((pk) => {
        (state.board.graph[pk] || []).forEach((n) => {
          const id = state.board.occupiedBy[n];
          if (id !== undefined && id !== hq.id) neighbourIds.add(id);
        });
      });
      /* $5 out of the pot of every INDUSTRY the headquarters touches - not $5 per
         neighbouring building. Two neighbours in the same industry are still one pot,
         and it can only be tapped once. */
      const industries = new Set();
      neighbourIds.forEach((id) => {
        for (const q of state.players) {
          const b = q.businesses.find((x) => x.id === id);
          if (!b || b.distressed || b.isHQ) continue;
          industries.add(bizInd(b));
        }
      });
      let taken = 0;
      industries.forEach((ind) => {
        /* Pots hold the fractional change left over from OPEX, so this has to take
           whole dollars only - the remainder rides forward exactly as a B2B share
           does. It used to hand over $4.80 while the log said $5. */
        const take = Math.min(5, Math.floor(state.pots[ind] || 0));
        state.pots[ind] -= take;
        taken += take;
      });
      if (taken > 0) {
        p.cash += taken;
        log(`Megacorp "${hq.megacorpName}" siphons $${taken} from neighbouring industries' pots.`, p.id);
      }
    }
  }
}

/* ---------------- Renovation & plot market ---------------- */
/* A renovation has to fit the structure that is already standing there, so the card
   must match its level, and from level 2 up its scaling type as well: a distressed
   horizontal shell occupies several plots and a vertical one occupies a single stacked
   plot, and neither can be rebuilt as the other. At level 1 both occupy exactly one
   plot, so a level-1 shell is open to any level-1 Blueprint. */
function renovationEligible(distressedBiz, bp) {
  if (distressedBiz.level !== bp.lvl) return false;
  if (distressedBiz.level === 1) return true;            // one plot either way: anything fits
  return SCALING[bizInd(distressedBiz)] === SCALING[bp.ind];
}
function findDistressedTargets(state) {
  const out = [];
  for (const p of state.players) for (const b of p.businesses) if (b.distressed) out.push(b);
  return out;
}
function doRenovate(state, p, distressedBiz, bp, log) {
  const cost = Math.floor(bp.setup / 2);
  if (p.cash < cost) return false;
  // renovating brings a structure back online, so it counts against the active-company cap
  if (!p.businesses.includes(distressedBiz) && !canLaunchMore(p)) return false;
  if (!p.businesses.includes(distressedBiz) && discsFree(state, p) <= 0) return false;
  if (p.businesses.includes(distressedBiz) && companySlotsUsed(p) >= COMPANY_SLOTS) return false;
  // A distressed structure still sits in its previous owner's ledger. Detach it there
  // first, otherwise the same business object ends up listed under both players.
  const prev = state.players.find((pl) => pl.businesses.includes(distressedBiz));
  if (prev) prev.businesses = prev.businesses.filter((b) => b !== distressedBiz);
  p.cash -= cost;
  distressedBiz.distressed = false;
  distressedBiz.bp = bp;
  distressedBiz.level = bp.lvl;
  distressedBiz.upgraded = false;
  distressedBiz.scored = false;
  distressedBiz.epOnCard = 0;
  distressedBiz.quarterBuilt = state.quarter;
  scoreCompanyOnCompletion(state, distressedBiz);
  p.hand = p.hand.filter((x) => x !== bp);
  p.businesses.push(distressedBiz);
  const from = prev && prev.id !== p.id ? ` (previously ${prev.name}'s)` : "";
  log(`${p.name} renovates a distressed structure${from} into ${bp.name} (${bp.ind} L${bp.lvl}) (cash: $${Math.round(p.cash)}).`, p.id);
  claimIndustryBonus(state, p, bp.ind, log);
  return true;
}
/* A distressed company can also simply be bought out of the bank as it stands, for half
   its own setup cost, keeping its Blueprint and level. Renovating with a card from hand
   is the alternative when you want to change what the structure is. */
function reclaimCost(biz) {
  return Math.floor(bizSetup(biz) / 2);
}
function canReclaim(state, p, biz) {
  if (!biz || !biz.distressed) return false;
  if (p.cash < reclaimCost(biz)) return false;
  if (!canLaunchMore(p)) return false;
  if (!p.businesses.includes(biz) && discsFree(state, p) <= 0) return false;
  return true;
}
function doReclaim(state, p, biz, log) {
  if (!canReclaim(state, p, biz)) return false;
  const cost = reclaimCost(biz);
  const prev = state.players.find((pl) => pl.businesses.includes(biz));
  if (prev) prev.businesses = prev.businesses.filter((b) => b !== biz);
  p.cash -= cost;
  biz.distressed = false;
  biz.scored = false;          // it scores again for its new owner
  biz.epOnCard = 0;
  biz.quarterBuilt = state.quarter;
  scoreCompanyOnCompletion(state, biz);
  p.businesses.push(biz);
  const from = prev && prev.id !== p.id ? ` (previously ${prev.name}'s)` : "";
  log(`${p.name} buys the distressed ${biz.bp.name} (${bizInd(biz)} L${biz.level}) back from the bank${from} for $${cost} (cash: $${Math.round(p.cash)}).`, p.id);
  claimIndustryBonus(state, p, bizInd(biz), log);
  return true;
}
function doSellPlot(state, p, plotKeyStr, log, solvency = false) {
  if (state.board.owner[plotKeyStr] !== p.id) return false;
  const fullVal = plotValue(state, plotKeyStr);
  const val = solvency ? Math.floor(fullVal / 2) : fullVal;
  delete state.board.owner[plotKeyStr];
  p.cash += val;
  log(`${p.name} sells a plot for $${val}${solvency ? " (SOLVENCY)" : ""}. Any business standing on it can no longer produce until it's bought back.`, p.id);
  return true;
}
function cheapestOwnedPlot(state, p) {
  const owned = Object.entries(state.board.owner).filter(([k, v]) => v === p.id).map(([k]) => k);
  if (!owned.length) return null;
  const ownBizPlots = new Set(activeBiz(p).flatMap((b) => b.footprint));
  const spare = owned.filter((k) => !ownBizPlots.has(k));
  const pool = spare.length ? spare : owned;
  return pool.map((k) => [k, plotValue(state, k)]).sort((a, b) => a[1] - b[1])[0][0];
}
function doBuyPlot(state, p, plotKeyStr, log) {
  if (plotKeyStr in state.board.owner) return false;
  if (discsFree(state, p) <= 0) return false;   // no disc left to mark ownership
  const cost = plotValue(state, plotKeyStr);
  if (p.cash < cost) return false;
  p.cash -= cost;
  state.board.owner[plotKeyStr] = p.id;
  log(`${p.name} buys a plot for $${cost} (cash: $${Math.round(p.cash)}).`, p.id);
  return true;
}
/* Human-readable plot label: district tile name + compass slot + grid coords,
   e.g. "R1 NE (2,3)" - matches how districts are named everywhere else. */
function plotLabel(board, plotKeyStr) {
  const c = board.cellOf[plotKeyStr];
  if (!c) return plotKeyStr;
  const tname = board.tiles[`${c.r},${c.c}`] || "?";
  return `${tname} ${c.pos} (${c.r},${c.c})`;
}
function businessCanProduce(state, b) {
  return b.footprint.every((plot) => plot in state.board.owner);
}
function getBizTooltipInfo(state, biz) {
  // A distressed company sits in the bank: it stays in its former owner's array for
  // bookkeeping, but nobody owns it, so it must not be attributed to them.
  const owner = biz.distressed ? null : state.players.find((p) => p.businesses.includes(biz));
  const plotOwnerIds = [...new Set(biz.footprint.map((pk) => state.board.owner[pk]).filter((v) => v !== undefined))];
  const plotOwners = plotOwnerIds.map((id) => state.players.find((p) => p.id === id)).filter(Boolean);
  return { owner, plotOwners, canProduce: businessCanProduce(state, biz) };
}

/* ---------------- Turn-order / tracks ---------------- */
function makeTracks() {
  // Board Meeting holds two players (both meeples each). Seat 2 stays blocked by the
  // IPO tile until a player goes public and claims it.
  return { raise_capital: [null, null, null, null], ma: [null, null, null, null], rd: [null, null, null, null], board_meeting: [null, null] };
}
function trackBonusOrder(slots) {
  const filled = [];
  slots.forEach((pid, i) => { if (pid !== null) filled.push(i); });
  const out = filled.map((i) => ({ playerId: slots[i], slotIndex: i, actions: 1 + filled.filter((j) => j > i).length }));
  out.sort((a, b) => b.slotIndex - a.slotIndex);
  return out;
}
function doReposition(state, p, log) {
  state.turnOrder = [p.id, ...state.turnOrder.filter((id) => id !== p.id)];
  state.doubleFirstPlayer = p.id;
  log(`${p.name} takes REPOSITION \u2014 moves to 1st in turn order and places both meeples at once next quarter.`, p.id);
}

const TRACK_ACTIONS = { raise_capital: ["LOAN", "SELL"], ma: ["BUY", "LAUNCH"], rd: ["RESEARCH", "UPGRADE"] };
const TRACK_LABEL = { raise_capital: "Raise Capital", ma: "M&A", rd: "R&D", board_meeting: "Board Meeting" };
/* Plain-language description of every action, used on the track board and again on the
   placement buttons, so a new player never has to guess what a track does. */
const TRACK_HELP = {
  raise_capital: "Turn assets into cash. LOAN takes $20 from the bank for one of your discs (buy it back later or lose 5 EP). SELL turns a plot, an unbuilt Blueprint, or a whole company into money at market value.",
  ma: "Grow your footprint. BUY takes an unowned plot, or renovates a distressed company for half its Blueprint's setup cost. LAUNCH builds a Blueprint from your hand onto plots you own \u2014 and pays you 5 EP the first time you enter each industry.",
  rd: "Improve what you have. RESEARCH draws the face-up top card of any industry deck. UPGRADE pays a company's setup cost again to double its production and OPEX, and raise its level by one.",
  board_meeting: "The power track. Both your workers go here together. GO PUBLIC merges companies into a Megacorp tile for big EP \u2014 you need the exact combination one of the tiles asks for. Whoever does it first also takes the IPO tile (+5 EP), which opens this track's second seat. REPOSITION moves you to first in turn order.",
};

/* How much does this bot want the Board Meeting track this quarter?
   Returns 0-100. Board Meeting costs BOTH meeples, so it only ever commits at the
   start of its own quarter, never by pulling a meeple it has already placed. */
function megacorpWorthIt(state, p, match) {
  if (!match) return false;
  // What merging actually costs in EP is the level EP those companies had not scored yet.
  // A company scores once, so one that has already scored owes nothing more, and merging
  // vests what is on its card either way - that EP is safe. The HQ is no exception: it
  // leaves activeBiz, so it never scores at a year end again.
  // Industry bonuses are banked when the company is BUILT and are never taken back, so
  // they are not at risk here \u2014 an older version of this test wrongly counted them and
  // refused almost every worthwhile merger.
  const ep = match.tile[2];
  const forgone = match.have.reduce((s, b) => s + (b.scored ? 0 : b.level * levelEP(state)), 0);
  return ep >= forgone;
}

/* Going public is only a legal choice when it can actually do something: form a
   tile the first time, or afterwards merge a real set of companies into a Megacorp.
   Otherwise the player is restricted to Reposition. */
function canGoPublic(state, p) {
  return !!bestMegacorpMatch(activeBiz(p), state.megacorpPool);
}
function goPublicBlockedReason(state, p) {
  if (canGoPublic(state, p)) return null;
  if (!state.megacorpPool.length) return "no Megacorp tiles left";
  const n = activeBiz(p).length;
  if (!n) return "you have no active companies to merge";
  return "none of the available Megacorp tiles match your companies";
}
/* Would an M&A action actually accomplish something this quarter? Bots were choosing
   the track with an empty hand, at the company cap, or with no land to build on, and
   burning roughly a third of all their actions on nothing. */
function maWouldAchieveSomething(state, p) {
  // a distressed shell is worth the action if you can renovate it OR simply buy it back
  if (findDistressedTargets(state).some((db) =>
    canReclaim(state, p, db) || p.hand.some((bp) => renovationEligible(db, bp)))) return true;
  const canBuild = canLaunchMore(p) && discsFree(state, p) > 0
    && p.hand.some((bp) => p.cash >= bp.setup);
  if (canBuild) {
    const ownedFree = Object.entries(state.board.owner)
      .filter(([k, v]) => v === p.id && !(k in state.board.occupiedBy)).length;
    const need = Math.min(...p.hand.filter((bp) => p.cash >= bp.setup)
      .map((bp) => (SCALING[bp.ind] === "H" ? bp.lvl : 1)));
    if (ownedFree >= need) return true;
  }
  // buying land is still worth an action: it feeds future builds and the two land awards
  const unowned = Object.keys(state.board.graph).some((k) => !(k in state.board.owner));
  return unowned && discsFree(state, p) > 0 && p.cash >= 6;
}
function rdWouldAchieveSomething(state, p) {
  if (p.hand.length < 5 && INDUSTRIES.some((i) => state.decks[i] && state.decks[i].length)) return true;
  return activeBiz(p).some((b) => !upgradeBlockedReason(state, p, b));
}
function boardMeetingDesire(state, p) {
  const bmOpen = state.tracks.board_meeting.some((s, i) => s === null && (i === 0 || state.ipoTileClaimed));
  if (!bmOpen) return 0;
  const meeplesLeft = (state.planningQueue || []).filter((id) => id === p.id).length;
  if (meeplesLeft < 2) return 0;                       // don't waste an already-placed meeple

  /* A Megacorp is the single biggest EP swing on the board, so it is always worth both
     meeples. There is no separate IPO action to want any more - the tile comes free with
     whoever merges first, which is only a reason to hurry, not a reason to sit here. */
  const m = bestMegacorpMatch(activeBiz(p), state.megacorpPool);
  if (m && (megacorpWorthIt(state, p, m) || !state.ipoTileClaimed)) return 100;
  // otherwise, is it worth seizing the front of the turn order?
  // sitting late means everyone else picks their track (and their FILO bonus) before you.
  // This costs two meeples for one action, so only the back of the order bothers.
  /* Repositioning buys first place NEXT quarter. In Quarter 12 there is no next
     quarter: all it still wins is the closing hub, which is placed after the last
     delivery and cannot change anybody's score. Both meeples for nothing. */
  if (state.quarter >= 12) return 0;
  const idx = state.turnOrder.indexOf(p.id);
  if (idx >= 2 && activeBiz(p).length >= 1) return 8 + idx * 9;     // 3rd 26, 4th 35
  return 0;
}

function botChoosePlanningTrack(state, p) {
  const openTrack = (name) => state.tracks[name].some((s) => s === null);
  const boardMeetingOpen = state.tracks.board_meeting.some((s, i) => s === null && (i === 0 || state.ipoTileClaimed));

  const bmDesire = boardMeetingDesire(state, p);
  if (bmDesire >= 70) return "board_meeting";
  if (bmDesire > 0) {
    // deterministic jitter, so bots vary quarter to quarter without breaking seeded replays
    const jitter = (state.quarter * 31 + p.id * 17 + activeBiz(p).length * 11) % 100;
    if (jitter < bmDesire) return "board_meeting";
  }

  const cheapestHandSetup = p.hand.length ? Math.min(...p.hand.map((bp) => bp.setup)) : Infinity;
  const nothingAffordable = p.cash < cheapestHandSetup && p.hand.length > 0;
  const outOfCards = p.hand.length === 0;

  /* M&A sells new companies and R&D grows the ones you have. Both are purchases, and
     which track to take is simply the question of which purchase is worth more - so ask,
     rather than following a fixed list. The old order put M&A ahead of R&D for every
     archetype but one, which is most of why Utilities, Manufacturing and Technology
     spent whole games at level 1: those three can only grow sideways, and the bot never
     visited the track that lets them. */
  const buildable = canLaunchMore(p) && discsFree(state, p) > 0 ? bestLaunch(state, p, p.archetype) : null;
  const growable = bestUpgrade(state, p);
  const upTilt = p.archetype === "upgrade_focus" ? 2
               : p.archetype === "vest_rebuild" && state.quarter > 4 && state.quarter <= 8 ? 1 : 0;
  const buildValue = buildable ? buildable.score : -Infinity;
  const growValue = growable && safeToSpend(p, bizSetup(growable.biz), bizOpex(growable.biz))
    ? growable.score + upTilt : -Infinity;
  const growFirst = growValue > buildValue;

  let order;
  if (outOfCards) order = ["rd", "ma", "raise_capital"];        // nothing to build without Blueprints
  else if (nothingAffordable) order = ["raise_capital", "rd", "ma"];
  else if (committedOpex(p) > p.cash * 0.7 && p.archetype !== "rush_cheap") order = ["raise_capital", "ma", "rd"];
  else order = growFirst ? ["rd", "ma", "raise_capital"] : ["ma", "rd", "raise_capital"];
  // Skip a track that cannot achieve anything for this player right now: an empty hand
  // makes M&A pointless, a full company slate and a full hand make R&D pointless.
  const useful = (t) =>
    t === "ma" ? maWouldAchieveSomething(state, p)
    : t === "rd" ? rdWouldAchieveSomething(state, p)
    : true;
  for (const t of order) if (openTrack(t) && useful(t)) return t;
  for (const t of order) if (openTrack(t)) return t;      // nothing is useful: take what is open
  if (boardMeetingOpen) return "board_meeting";
  return order.find((t) => openTrack(t)) || "raise_capital";
}

function placeMeeple(state, playerId, track) {
  if (track === "board_meeting") {
    // pull both meeples together: remove any existing single-track placement first
    for (const tn of ["raise_capital", "ma", "rd"]) {
      const idx = state.tracks[tn].indexOf(playerId);
      if (idx !== -1) state.tracks[tn][idx] = null;
    }
    const slotIdx = state.tracks.board_meeting.findIndex((s, i) => s === null && (i === 0 || state.ipoTileClaimed));
    if (slotIdx === -1) return false;   // second seat is under the IPO tile until it is claimed
    state.tracks.board_meeting[slotIdx] = playerId;
    return true;
  }
  const idx = state.tracks[track].indexOf(null);
  if (idx === -1) return false;
  state.tracks[track][idx] = playerId;
  return true;
}

function buildResolutionQueue(state) {
  const queue = [];
  for (const tn of ["raise_capital", "ma", "rd"]) {
    trackBonusOrder(state.tracks[tn]).forEach((e) => queue.push({ track: tn, playerId: e.playerId, actionsRemaining: e.actions }));
  }
  const bmFilled = [];
  state.tracks.board_meeting.forEach((pid, i) => { if (pid !== null) bmFilled.push(i); });
  bmFilled.sort((a, b) => b - a).forEach((i) => queue.push({ track: "board_meeting", playerId: state.tracks.board_meeting[i], actionsRemaining: 1 }));
  return queue;
}

/* ---------------- Bot action resolution ---------------- */
function botResolveOneAction(state, p, track, rng, log) {
  if (track === "raise_capital") {
    const LOAN_CEILING = 60; // once cash comfortably covers most BPs, more loans are pure EP cost with no upside
    // Each disc is a guaranteed -5 EP unless bought back for $30-40, and bots rarely
    // end with that spare. Borrow late only when it converts straight into a company.
    const lateGame = state.quarter >= 9;
    const MAX_VOLUNTARY_DISCS = lateGame ? 1 : 3;
    const genuineNeed = committedOpex(p) > p.cash * 0.8 || p.cash < 15;
    // a company that cannot produce is pure OPEX drain - sell it before anything else
    // late game with money doing nothing: land is 10 EP for the most plots and 10 more
    // for the most districts, so buying beats holding
    if (endgameSpendMode(state, p) && discsFree(state, p) > 0) {
      const unowned = Object.keys(state.board.graph).filter((k) => !(k in state.board.owner));
      if (unowned.length) {
        const districtsMine = new Set(Object.entries(state.board.owner)
          .filter(([, v]) => v === p.id)
          .map(([k]) => `${state.board.cellOf[k].r},${state.board.cellOf[k].c}`));
        const ranked = unowned.map((k) => {
          const c = state.board.cellOf[k];
          const fresh = districtsMine.has(`${c.r},${c.c}`) ? 0 : 1;   // new district = extra award progress
          return { k, cost: plotValue(state, k), score: fresh * 4 - plotValue(state, k) * 0.5 };
        }).sort((a, b) => b.score - a.score);
        const pick = ranked.find((r) => p.cash - r.cost > committedOpex(p) * 0.6);
        if (pick && doBuyPlot(state, p, pick.k, log)) return;
      }
    }
    // A company whose price has fallen to the floor earns about what recycling earns,
    // while still costing full OPEX every quarter. Holding it is worse than selling it
    // and freeing the slot, the disc and the cash for something the table is short of.
    const collapsed = activeBiz(p).find((b) => {
      if (price(state.pm, bizInd(b)) > 1) return false;
      const net = bizProd(b) * 1 - bizOpex(b) - 3 * b.level;   // $1/unit is recycling money
      return net < 0;
    });
    // ...but only when there is something better to put in its place: the company still
    // holds the EP on its card and can still be upgraded, so dumping it for nothing is a loss.
    const replacement = collapsed && p.hand.find((bp) =>
      bp.ind !== bizInd(collapsed)
      && price(state.pm, bp.ind) >= BASE_PRICE[bp.ind]
      && p.cash + bizSetup(collapsed) / 2 >= bp.setup);
    if (collapsed && replacement && state.quarter <= 9) {
      const got = sellCompany(p, collapsed, false);
      log(`${p.name} sells ${collapsed.bp.name}: ${bizInd(collapsed)} has collapsed to $1 and it was losing money (+$${got}).`, p.id);
      return;
    }
    const dead = activeBiz(p).find((b) => !businessCanProduce(state, b));
    if (dead) { sellCompany(p, dead, false); log(`${p.name} sells ${dead.bp.name} \u2014 it sits on land nobody owns and cannot produce.`, p.id); return; }
    if (genuineNeed && p.discsInBank >= 3 && activeBiz(p).length) {
      // already carrying real debt just to keep the lights on - cut the worst offender loose
      // instead of financing it forever with more loans
      const worst = worstRoiBusiness(p, state.pm, state.quarter, 0);
      if (worst) { sellCompany(p, worst, false); log(`${p.name} cuts loose ${worst.bp.name} rather than take another loan to cover it (cash: $${Math.round(p.cash)}).`, p.id); }
      else doLoan(state, p, log);
    } else if (genuineNeed) doLoan(state, p, log);
    else if (p.hand.length > 3) { sellBpFromHand(state, p, p.hand.reduce((a, b) => (BP_SELL_PRICE[a.lvl] || 4) > (BP_SELL_PRICE[b.lvl] || 4) ? a : b), false); log(`${p.name} sells a BP from hand.`, p.id); }
    else if (p.cash < LOAN_CEILING && p.discsInBank < MAX_VOLUNTARY_DISCS
             && p.hand.length > 0 && canLaunchMore(p) && discsFree(state, p) > 0) doLoan(state, p, log);
    else log(`${p.name} has plenty of cash and nothing to sell \u2014 sits this one out.`, p.id);
  } else if (track === "ma") {
    // A company standing on land nobody owns cannot produce. Buy the ground back if it is
    // affordable and worth it; otherwise cut the dead weight loose rather than sit on it.
    const stuck = activeBiz(p).filter((b) => !businessCanProduce(state, b));
    if (stuck.length) {
      const b = stuck[0];
      const missing = b.footprint.filter((pk) => !(pk in state.board.owner));
      const cost = missing.reduce((s2, pk) => s2 + plotValue(state, pk), 0);
      const worthIt = cost <= bizSetup(b) * 0.75 && p.cash >= cost && discsFree(state, p) >= missing.length;
      if (worthIt) {
        let bought = 0;
        for (const pk of missing) if (doBuyPlot(state, p, pk, log)) bought++;
        if (bought) { log(`${p.name} buys back land under ${b.bp.name} so it can produce again.`, p.id); return; }
      }
    }
    const distressed = findDistressedTargets(state);
    const renoOpt = distressed.map((db) => ({ db, bp: p.hand.find((bp) => renovationEligible(db, bp)) })).find((o) => o.bp);
    if (renoOpt && p.cash >= Math.floor(renoOpt.bp.setup / 2) && doRenovate(state, p, renoOpt.db, renoOpt.bp, log)) return;
    // buying a distressed company as it stands is often the cheapest company on the
    // board: half setup, already built, and it may open a new industry worth 5 EP
    const reclaimOpt = distressed
      .filter((db) => canReclaim(state, p, db))
      .map((db) => {
        const px = price(state.pm, bizInd(db));
        const value = bizProd(db) * px - bizOpex(db) - 3 * db.level;
        const fresh = missingIndustries(p).has(bizInd(db)) ? 5 : 0;
        return { db, score: value + fresh - reclaimCost(db) * 0.25 };
      })
      .sort((a, b) => b.score - a.score)[0];
    if (reclaimOpt && reclaimOpt.score > 0 && doReclaim(state, p, reclaimOpt.db, log)) return;
    const maxNeeded = p.hand.length ? Math.max(...p.hand.map((bp) => (SCALING[bp.ind] === "H" ? bp.lvl : 1))) : 0;
    const freeOwnedByMe = Object.entries(state.board.owner)
      .filter(([k, v]) => v === p.id && !(k in state.board.occupiedBy)).length;
    const unowned = Object.keys(state.board.graph).filter((k) => !(k in state.board.owner));
    // Always keep discs in hand for future companies: each active company is worth
    // its level in EP plus 5 EP for a new industry, usually more than a spare plot.
    /* Only hold discs back for a company that could actually be built. Reserving two
       against an empty hand, or against cards there is no money for, is how bots ended
       games sitting on both spare discs and spare cash - the one combination that
       converts to nothing at all. */
    const companySlotsLeft = Math.max(0, 5 - activeBiz(p).length);
    const buildableNow = p.hand.filter((bp) => p.cash >= bp.setup).length;
    const reserveForCompanies = Math.min(companySlotsLeft, buildableNow, 2);
    const mayBuyLand = discsFree(state, p) > reserveForCompanies;

    /* Land that unblocks an upgrade is a category of its own. A horizontal company grows
       only onto an empty plot somebody already owns, and 95% of every Utilities and
       Manufacturing upgrade the bots ever weighed was refused for exactly that reason -
       which is why those industries spent whole games at level 1 with their level 2 and
       3 cards unplayed. Price the plot at what the upgrade it unlocks is worth, and it
       stops being luck whether the company can ever grow. */
    const growthValue = new Map();
    for (const b of activeBiz(p)) {
      if (b.upgraded || b.isHQ) continue;
      if (upgradeScaling(p, b) !== "H") continue;
      if (adjacentOwnedFreePlots(state.board, b.footprint).length) continue;   // already able to grow
      for (const pk of unowned) {
        if (!orthOf(state.board, pk).some((n) => b.footprint.includes(n))) continue;
        const worth = upgradeScore(state, p, b, pk);
        if (worth > 0 && worth > (growthValue.get(pk) || 0)) growthValue.set(pk, worth);
      }
    }
    // a plot bought to grow a company is not a spare disc for long, so it may dip into
    // the reserve the bot otherwise keeps for future companies
    const mayBuyGrowth = growthValue.size > 0 && discsFree(state, p) > 0;
    const growable = activeBiz(p).filter((b) => !b.upgraded && !b.isHQ && upgradeScaling(p, b) === "H");
    const minUpgradeCost = growable.length ? Math.min(...growable.map((b) => bizSetup(b))) : 0;

    /* Build, or buy the plot that lets a company already standing grow? Both are
       measured in endgame points, so ask rather than always building. The launch branch
       used to return unconditionally whenever anything at all was buildable, which meant
       the land branch below was only ever reached by a bot with nothing to build - and a
       Manufacturing company boxed in on all four sides never got its second plot. */
    const bestGrowth = growthValue.size ? Math.max(...growthValue.values()) : -Infinity;
    const launchNow = canLaunchMore(p) && discsFree(state, p) > 0
      ? bestLaunch(state, p, p.archetype) : null;
    if (launchNow && launchNow.score >= bestGrowth) {
      // 5 EP per distinct industry makes breadth worth far more than a marginally
      // better card in an industry already covered
      if (doLaunch(state, p, launchNow.bp, rng, log)) return;
    }
    /* Nothing was worth building. Buy land instead - for two different reasons, and the
       bot has to tell them apart.

       The first is to unblock a build, and that depends on plots THIS PLAYER can build
       on. It used to count every free plot on the board whoever owned it, so a rival
       sitting on empty land convinced the bot its own land was fine and it bought
       nothing. (Building on a rival's plot is legal, but it pays them the rent every
       quarter, so it is a fallback rather than a plan.)

       The second is that land is points. The two awards are 10 EP and 5 EP each, and
       under the yearly variant they are paid three times - up to 90 EP across a game,
       which no amount of company income matches. That is worth buying for its own sake
       once the discs are not needed for companies. */

    /* Is land worth chasing for the awards? Only once there is spare capacity and the
       payout is close enough to be worth the disc. Weighted by how many times the
       awards will still be paid, so the yearly variant makes this urgent from Q1 and
       the standard game keeps it a late-game move. */
    const landIsPoints = discsFree(state, p) > reserveForCompanies
      && p.cash > committedOpex(p) * 1.5 + 10
      // either the awards pay often enough to chase all game, or it is late and the
      // money is otherwise going to convert at a flat $10 per EP
      && (landEPWeight(state) >= 3 || endgameSpendMode(state, p));
    if (unowned.length && ((mayBuyLand && (freeOwnedByMe < maxNeeded || landIsPoints)) || mayBuyGrowth)) {
      const ownedByMe = Object.entries(state.board.owner).filter(([k, v]) => v === p.id).map(([k]) => k);
      const adjacentCandidates = new Set();
      ownedByMe.forEach((owned) => { [...state.board.graph[owned]].forEach((n) => { if (unowned.includes(n)) adjacentCandidates.add(n); }); });
      // Buying the cheapest plot always meant the board edge, where demand is thinnest -
      // bots ended up unable to sell ~80% of what they produced. Weigh reachable demand
      // for the industries actually in hand against the price instead.
      const wantInds = p.hand.length ? [...new Set(p.hand.map((bp) => bp.ind))] : INDUSTRIES;
      // when land is being bought for points rather than for a build, look at the whole
      // board: a plot in a district we are not in yet also feeds The Omnipresent
      const pool = adjacentCandidates.size && !landIsPoints ? [...new Set([...adjacentCandidates, ...growthValue.keys()])]
        : [...new Set([...adjacentCandidates, ...growthValue.keys(), ...unowned])];
      const myDistricts = new Set(ownedByMe.map((k) => {
        const c = state.board.cellOf[k];
        return `${c.r},${c.c}`;
      }));
      const ranked = pool.map((k) => {
        const cost = plotValue(state, k);
        const demand = Math.max(...wantInds.map((ind) => plotDemandScore(state, ind, k)));
        const c = state.board.cellOf[k];
        const newDistrict = myDistricts.has(`${c.r},${c.c}`) ? 0 : 1;
        // the upgrade this plot unlocks is worth points; points are worth $10 each, so
        // that is the number that belongs beside a plot price in dollars
        const growth = (growthValue.get(k) || 0) * CASH_PER_EP;
        return { k, cost, growth, score: demand * 3 + growth + (landIsPoints ? landEPWeight(state) * (1 + newDistrict) : 0) - cost };
      }).sort((a, b) => b.score - a.score);
      /* Buying to unblock a build takes the best affordable plot even if the score is
         negative - a plot that lets a company exist beats no company. Buying for points
         is optional, so it has to actually be worth the disc. */
      /* Buying to unblock a build takes the best affordable plot even if the score is
         negative - a plot that lets a company exist beats no company. Buying for points,
         or to grow a company, is optional, so it has to actually be worth the disc. But
         a growth plot must also leave enough cash to pay for the upgrade it unlocks,
         otherwise the bot buys the land and then cannot build on it. */
      const pick = ranked.find((r) => p.cash >= r.cost
        && (freeOwnedByMe < maxNeeded || r.score > 0)
        && (!r.growth || p.cash - r.cost >= minUpgradeCost));
      if (pick && doBuyPlot(state, p, pick.k, log)) return;
    }
    log(`${p.name} finds nothing worth building right now.`, p.id);
  } else if (track === "rd") {
    // A bot with no Blueprints cannot expand at all, so restocking beats upgrading
    // whenever the hand is thin and there is still room to build.
    const starved = p.hand.length === 0 || (p.hand.length < 2 && canLaunchMore(p) && discsFree(state, p) > 0);
    /* Upgrade the company where the extra level actually pays, not simply the first
       one in the list. A level buys EP either way, but it also buys production - and
       production the demand board cannot absorb is recycled at $1, so a company that
       already outruns its reach is the worst one on the list to grow. */
    const candidates = starved ? [] : activeBiz(p).filter((b) => !b.upgraded
      && safeToSpend(p, bizSetup(b), bizOpex(b)) && !upgradeBlockedReason(state, p, b));
    let upgradable = null, bestGain = -Infinity;
    for (const b of candidates) {
      const gain = upgradeScore(state, p, b);   // endgame points, same scale as a build
      if (gain > bestGain) { bestGain = gain; upgradable = b; }
    }
    if (upgradable && bestGain > 0) doUpgrade(state, p, upgradable, rng, log);
    else {
      const openDecks = INDUSTRIES.filter((ind) => state.decks[ind] && state.decks[ind].length);
      if (openDecks.length) {
        let best = openDecks[0], bestScore = -Infinity;
        for (const ind of openDecks) {
          const top = state.decks[ind][0];
          // Research is a bet on where the market will be, so weigh the same crowding
          // and price signals as launching. Drawing into a flooded $1 industry wastes
          // the action even when the card itself looks cheap.
          const s = launchScore(state, p, top, p.archetype);
          if (s > bestScore) { bestScore = s; best = ind; }
        }
        doDraw(state, p, best, log);
      }
    }
  } else if (track === "board_meeting") {
    const match = bestMegacorpMatch(activeBiz(p), state.megacorpPool);
    // merging first also wins the IPO tile's 5 EP, which is worth reaching for
    const worth = match && (megacorpWorthIt(state, p, match) || !state.ipoTileClaimed);
    if (worth) claimMegacorp(state, p, log);
    else doReposition(state, p, log);
  }
}

/* ---------------- Planning / resolution phase drivers ---------------- */
function workersPerPlayer(state) {
  // Two-player games would leave the tracks half empty with two workers each, so the
  // duel is played with three apiece to keep the placement contest meaningful.
  return state.players.length === 2 ? 3 : 2;
}
function startPlanning(state) {
  state.tracks = makeTracks();
  const W = workersPerPlayer(state);
  const rep = (ids, k) => { const out = []; for (let i = 0; i < k; i++) out.push(...ids); return out; };
  if (state.doubleFirstPlayer !== null && state.doubleFirstPlayer !== undefined) {
    const dp = state.doubleFirstPlayer;
    const rest = state.turnOrder.filter((id) => id !== dp);
    state.planningQueue = [dp, dp, ...rep(rest, W), ...(W > 2 ? [dp] : [])];
    state.doubleFirstPlayer = null; // one-time bonus, consumed
  } else {
    state.planningQueue = rep(state.turnOrder, W);
  }
  state.phase = "planning";
  state.resolutionQueue = [];
  state.pendingHumanAction = null;
}
function consumePlanningTurn(state, playerId, track) {
  if (track === "board_meeting") {
    state.planningQueue = state.planningQueue.filter((id) => id !== playerId);
  } else {
    const idx = state.planningQueue.indexOf(playerId);
    if (idx !== -1) state.planningQueue.splice(idx, 1);
  }
}
function advancePlanning(state, rng, log) {
  while (state.planningQueue.length) {
    const pid = state.planningQueue[0];
    const p = state.players.find((pl) => pl.id === pid);
    if (p.isHuman) return; // wait for UI
    const track = botChoosePlanningTrack(state, p);
    const ok = placeMeeple(state, pid, track);
    if (!ok) { state.planningQueue.shift(); continue; }
    log(`${p.name} places on ${TRACK_LABEL[track]}.`, p.id);
    consumePlanningTurn(state, pid, track);
  }
  state.resolutionQueue = buildResolutionQueue(state);
  state.phase = "resolving";
  advanceResolution(state, rng, log);
}
function advanceResolution(state, rng, log) {
  while (state.resolutionQueue.length) {
    const entry = state.resolutionQueue[0];
    const p = state.players.find((pl) => pl.id === entry.playerId);
    if (p.isHuman) { state.pendingHumanAction = entry; return; }
    for (let i = 0; i < entry.actionsRemaining; i++) botResolveOneAction(state, p, entry.track, rng, log);
    state.resolutionQueue.shift();
  }
  state.pendingHumanAction = null;
  state.liqQueue = humansNeedingLiquidation(state);
  if (state.liqQueue.length) {
    state.phase = "liquidating";
    state.awaitingPlayerId = state.liqQueue[0];
    return;
  }
  proceedToProduction(state, log, rng);
}
function proceedToProduction(state, log, rng) {
  state.phase = "production";
  state.reExtraDistrict = {};              // the Retail bonus lasts one quarter only
  applySupplyChainBump(state, log);
  runProduction(state, log);
  state.deliveryRemaining = {};
  state.crossSellRemaining = {};
  state.reChoices = {};   // Retail re-picks its extra districts every delivery
  state.hoBonusPaid = {};
  /* Delivery runs in turn order, everybody in one sequence. Demand icons are first
     come first served, so who sells before whom is the whole point of being first
     player - and this used to run every bot first, whatever the seating, which meant
     a human at the front of the order still arrived to a picked-over board. */
  state.deliveryOrder = [...state.turnOrder];
  state.deliveryCursor = 0;
  if (!advanceDelivery(state, log)) finishQuarter(state, log, rng);
}
/* Walk the delivery order: a bot sells where it stands, a human is handed the board.
   Returns true while somebody still has to be waited for. */
function advanceDelivery(state, log) {
  const order = state.deliveryOrder || [];
  while (state.deliveryCursor < order.length) {
    const pid = order[state.deliveryCursor];
    const p = byId(state, pid);
    if (!p) { state.deliveryCursor++; continue; }
    if (p.isHuman) {
      if (humanDeliveryQueue(state, p).length) {
        // who is still to come, for the waiting screen
        state.delQueue = order.slice(state.deliveryCursor).filter((id) => {
          const q = byId(state, id);
          return q && q.isHuman && humanDeliveryQueue(state, q).length > 0;
        });
        startDeliveryFor(state, pid, log);
        return true;
      }
      state.deliveryCursor++;
      continue;
    }
    for (const b of activeBiz(p)) if (businessCanProduce(state, b)) autoDeliver(state, p, b);
    state.deliveryCursor++;
  }
  state.delQueue = [];
  state.awaitingPlayerId = null;
  state.deliveringBizId = null;
  return false;
}
function startDeliveryFor(state, playerId, log) {
  const human = byId(state, playerId);
  const pending = humanDeliveryQueue(state, human);
  {
    state.phase = "delivering";
    state.awaitingPlayerId = playerId;
    pending.forEach((b) => {
      let prod = bizProd(b);
      const bonus = Math.min(prod, hoBonusUnits(state, b));
      if (bonus > 0) {
        human.cash += bonus * unitPrice(state, human, b);   // via unitPrice so personas apply here too
        prod -= bonus;
        state.hoBonusPaid[b.id] = bonus;
        log(`${b.bp.name} moves ${bonus} unit${bonus === 1 ? "" : "s"} to neighbouring businesses/hubs for $${bonus * price(state.pm, bizInd(b))}.`, human.id);
      }
      state.deliveryRemaining[b.id] = prod;
      state.crossSellRemaining[b.id] = bizInd(b) === "MA" ? b.level : 0;
    });
    state.deliveringBizId = pending[0].id;
  }
}
/* The player finished liquidating: move to the next one who needs it, then carry on. */
function humanLiquidationDone(state, rng, log) {
  state.liqQueue = (state.liqQueue || []).filter((id) => id !== state.awaitingPlayerId);
  const still = humansNeedingLiquidation(state).filter((id) => state.liqQueue.includes(id));
  if (still.length) { state.awaitingPlayerId = still[0]; state.phase = "liquidating"; return; }
  state.awaitingPlayerId = null;
  proceedToProduction(state, log, rng);
}
function nextDeliveryTarget(state) {
  const human = byId(state, state.awaitingPlayerId);
  if (!human) return null;
  return activeBiz(human).find((b) => (state.deliveryRemaining[b.id] || 0) > 0 || (state.crossSellRemaining[b.id] || 0) > 0) || null;
}
function skipDelivery(state, human, bizId, log) {
  const remaining = (state.deliveryRemaining[bizId] || 0) + (state.crossSellRemaining[bizId] || 0);
  if (remaining > 0) { human.cash += remaining; log(`Unsold production recycled for $${remaining}.`, human.id); }
  state.deliveryRemaining[bizId] = 0;
  state.crossSellRemaining[bizId] = 0;
}
function finishDelivery(state, log, rng) {
  const next = nextDeliveryTarget(state);
  if (next) { state.deliveringBizId = next.id; return; }
  // this player is done - carry on down the turn order, bots included
  state.deliveryCursor = (state.deliveryCursor || 0) + 1;
  if (advanceDelivery(state, log)) return;
  finishQuarter(state, log, rng);
}
function finishQuarter(state, log, rng) {
  state.phase = "production";
  runB2B(state, log);            // Revenue - B2B: share out the industry pots
  runClosing(state, log, rng);
  if (state.phase === "placingLH") return; // paused for human's LH choice; UI resumes via finishQuarterAfterLH
  finishQuarterAfterLH(state, log, rng);
}
function finishQuarterAfterLH(state, log, rng) {
  runClosingRest(state, log);
  state.awaitingPlayerId = null;
  if ([4, 8, 12].includes(state.quarter)) {
    state.repayQueue = humansNeedingRepay(state);
    if (state.repayQueue.length) {
      state.phase = "repayingLoans";
      state.awaitingPlayerId = state.repayQueue[0];
      return; // paused for each human's optional repayment
    }
  }
  finishQuarterAfterRepay(state, log, rng);
}
function finishQuarterAfterRepay(state, log, rng) {
  // more humans still owed a repayment window?
  if (state.phase === "repayingLoans") {
    state.repayQueue = (state.repayQueue || []).filter((id) => id !== state.awaitingPlayerId);
    if (state.repayQueue.length) { state.awaitingPlayerId = state.repayQueue[0]; return; }
    state.awaitingPlayerId = null;
  }
  const summary = state.players.map((p) => `${p.name} $${Math.round(p.cash)}/${p.epBank.toFixed(0)}EP/${activeBiz(p).length}biz`).join("  \u00b7  ");
  log(`\u2500 End of Q${state.quarter}: ${summary}`, null);
  if (state.quarter >= 12) {
    finalizeGame(state);
    state.phase = "gameover";
    log("=== GAME OVER \u2014 final scoring complete ===", null);
    return;
  }
  state.quarter += 1;
  log(`\u25b6 Year ${Math.ceil(state.quarter / 4)}, Quarter ${state.quarter}`, null);
  startPlanning(state);
  advancePlanning(state, rng, log);
}
function humanCompleteResolutionAction(state, rng, log) {
  const entry = state.resolutionQueue[0];
  entry.actionsRemaining -= 1;
  if (entry.actionsRemaining <= 0) state.resolutionQueue.shift();
  state.pendingHumanAction = null;
  advanceResolution(state, rng, log);
}

const STARTING = { 4: [[25, 1], [25, 2], [20, 2], [20, 3]], 3: [[25, 1], [25, 2], [20, 3]], 2: [[20, 2], [20, 2]] };

/* humanNames: optional array of display names for human seats. Single player passes
   nothing and gets one human ("You") plus bots; the online server passes one name per
   connected player. */
/* What a Blueprint will really be worth once the whole table has drafted.
   Every card drafted is a company that will probably get built, and building it pushes
   its own industry's price DOWN while pushing each of its suppliers' prices UP (two
   steps move the price by $1). So a deck everyone is raiding is worth less than its
   printed price suggests, and the industries that feed it are worth more. Because the
   supplier chain closes a loop, this ripples outwards on its own: if the table piles
   into Retail, Retail's suppliers gain, and their suppliers gain in turn. */
function draftedPressure(drafted) {
  const bumps = Object.fromEntries(INDUSTRIES.map((i) => [i, 0]));
  for (const bp of drafted) {
    bumps[bp.ind] -= 1;                                   // more supply of its own good
    bp.deps.forEach((d) => { bumps[d.ind] += 1; });        // more demand for its suppliers
  }
  return bumps;
}
function expectedDraftPrice(ind, bumps) {
  return Math.max(1, BASE_PRICE[ind] + Math.round(bumps[ind] / 2));   // 2 steps = $1
}
function draftScoreNaive(bp) {
  return (bp.prod * BASE_PRICE[bp.ind] - bp.opex) / Math.max(1, bp.setup);
}
function draftScore(bp, drafted) {
  const bumps = draftedPressure(drafted);
  const px = expectedDraftPrice(bp.ind, bumps);
  const rent = 3 * bp.lvl;                                 // paid, then returned on own land
  const net = bp.prod * px - bp.opex;
  let s = net / Math.max(1, bp.setup + (SCALING[bp.ind] === "H" ? (bp.lvl - 1) * 3 : 0));
  // a deck the table is already raiding will be crowded on the board too
  const sameInd = drafted.filter((d) => d.ind === bp.ind).length;
  s *= 1 / (1 + 0.5 * sameInd);
  return s;
}

/* ---- the draft, as one sequence ----
   Reverse seat order, last seat picking first, and everybody is in the same queue.
   A bot takes its cards when the order reaches it, not before.

   This used to run as two passes: every bot drafted during setup, then every human
   drafted on the draft screen. With one human that is invisible, but at a mixed table
   a bot seated 2nd took its Blueprints ahead of a human seated 3rd, who by the rule
   picks first. It also meant a bot could never see what a human had taken, because no
   human had taken anything yet. */
function botDraftPick(state, p) {
  const avail = INDUSTRIES.filter((ind) => state.decks[ind] && state.decks[ind].length > 0);
  if (!avail.length) return false;
  const aware = state.marketAwareSeats;
  let best = avail[0], bestScore = -Infinity;
  for (const ind of avail) {
    // read the draft so far and take the card that will still be worth something
    // once everyone has built what they are drafting
    const sc = (aware && !aware.includes(p.id))
      ? draftScoreNaive(state.decks[ind][0])
      : draftScore(state.decks[ind][0], state.draftedCards || []);
    if (sc > bestScore) { bestScore = sc; best = ind; }
  }
  const card = state.decks[best].shift();
  p.hand.push(card);
  (state.draftedCards = state.draftedCards || []).push(card);
  (state.draftTaken = state.draftTaken || []).push(card.ind);
  return true;
}
/* Walk the draft order until it reaches a human who still owes picks. Returns true if
   the game is still drafting (and awaitingPlayerId names who it is waiting on), false
   when the draft is finished and planning should begin. */
function advanceDraft(state, log) {
  const order = state.draftOrder || [];
  while (state.draftCursor < order.length) {
    const pid = order[state.draftCursor];
    const p = byId(state, pid);
    const need = (state.draftCounts || {})[pid] || 0;
    if (!p) { state.draftCursor++; continue; }
    if (p.isHuman && p.hand.length < need) {
      state.phase = "drafting";
      state.awaitingPlayerId = pid;
      // who is still to come, for the waiting screen
      state.draftQueue = order.slice(state.draftCursor).filter((id) => {
        const q = byId(state, id);
        return q && q.isHuman && q.hand.length < ((state.draftCounts || {})[id] || 0);
      });
      return true;
    }
    if (!p.isHuman) {
      while (p.hand.length < need && botDraftPick(state, p)) { /* takes its whole hand */ }
      if (log) log(`${p.name} drafts ${p.hand.length} Blueprint${p.hand.length === 1 ? "" : "s"}.`, p.id);
    }
    state.draftCursor++;
  }
  state.draftQueue = [];
  state.awaitingPlayerId = null;
  state.phase = "planning";
  return false;
}

function initGame(numBots, seedNum, humanNames, marketAwareSeats, usePersonas, variants) {
  const rng = mulberry32(seedNum);
  const V = normaliseVariants(variants);
  const nHumans = humanNames && humanNames.length ? humanNames.length : 1;
  const nPlayers = nHumans + numBots;
  const board = buildBoard(rng);
  // Hubs stand on plots unless the table asked for the older road hubs. The board
  // itself has to know, because the hub helpers take a board rather than a state.
  board.lhOnPlots = !V.roadHubs;
  const demand = makeDemandPool(board, rng);
  const pm = makePriceMatrix();

  const bpByInd = {};
  INDUSTRIES.forEach((i) => (bpByInd[i] = []));
  BP_DATA.forEach((bp) => bpByInd[bp.ind].push(bp));
  const decks = {};
  INDUSTRIES.forEach((ind) => {
    if (!V.orderedDecks) {
      // one shuffle over the whole deck: a level 3 can be the public card from Q1
      decks[ind] = shuffle(bpByInd[ind], rng);
      return;
    }
    const byLevel = { 1: [], 2: [], 3: [] };
    bpByInd[ind].forEach((bp) => byLevel[bp.lvl].push(bp));
    decks[ind] = [...shuffle(byLevel[1], rng), ...shuffle(byLevel[2], rng), ...shuffle(byLevel[3], rng)];
  });

  const starting = STARTING[nPlayers];
  // Seating is randomised: the human is not automatically the first player.
  const seats = shuffle(Array.from({ length: nPlayers }, (_, i) => i), rng);   // seats[k] = player id sitting kth
  const seatOf = {};
  seats.forEach((pid, k) => { seatOf[pid] = k; });

  const players = [];
  for (let i = 0; i < nPlayers; i++) {
    const [cash] = starting[seatOf[i]];        // capital follows the seat, not the player id
    if (i < nHumans) {
      const nm = humanNames && humanNames[i] ? humanNames[i] : "You";
      players.push(newPlayer(i, nm, true, cash, [], null));
    } else {
      const arch = ARCHETYPES[(i - nHumans) % ARCHETYPES.length];
      players.push(newPlayer(i, `${ARCHETYPE_LABEL[arch]} Bot`, false, cash, [], arch));
    }
  }
  // Starting BPs are drafted in REVERSE seat order, so the last player picks first.
  // Everyone is in one sequence: a bot picks when the order reaches it, not before.
  const draftOrder = [...seats].reverse();
  const draftCounts = {};
  players.forEach((p) => { draftCounts[p.id] = starting[seatOf[p.id]][1]; });
  const humanDraftCount = draftCounts[0] || 0;   // kept for the single-player UI
  // personas are optional; six exist and only nPlayers are dealt, so two or more sit out
  if (usePersonas) {
    const deal = shuffle(PERSONA_KEYS, rng);
    players.forEach((pl, i) => { pl.persona = deal[i % deal.length]; });
  }
  const megacorpPool = shuffle(MEGACORP_TILES, rng).slice(0, nPlayers + 1);
  const state = {
    board, demand, pm, players, decks, variants: V, quarter: 1, solvencyEvents: 0, rngSeed: seedNum, rngCalls: 0,
    turnOrder: seats,                      // randomised seating
    seats, humanDraftCount, draftCounts,
    draftOrder, draftCursor: 0, draftQueue: [], draftedCards: [], draftTaken: [],
    marketAwareSeats: marketAwareSeats || null,
    awaitingPlayerId: null,
    phase: "drafting",
    tracks: makeTracks(),
    megacorpPool, ipoTileClaimed: false,
    planningQueue: [],
    resolutionQueue: [],
    pendingHumanAction: null,
    deliveryRemaining: {},
    reChoices: {},
    pots: Object.fromEntries(INDUSTRIES.map((i) => [i, 0])),
    doubleFirstPlayer: null,
    crossSellRemaining: {},
    deliveringBizId: null,
  };
  // let the bots ahead of the first human take their picks, in order
  advanceDraft(state);
  return state;
}

/* ============================== REACT UI ============================== */

/* Online play: the client sets NET, and every action handler dispatches to the server
   instead of mutating locally. In single-player NET stays null and nothing changes. */
let NET = null;
export function setNet(n) { NET = n; }
export function getEngineVersion() { return ENGINE_VERSION; }
/* Mirrors the server's own check so the UI only offers controls to the player who can
   actually act, and so the host can tell who the table is stuck on. */
function whoAwaited(st) {
  if (!st) return null;
  if (st.phase === "drafting") return st.awaitingPlayerId;
  if (st.phase === "planning") return st.planningQueue[0];
  if (st.phase === "resolving") return st.pendingHumanAction ? st.pendingHumanAction.playerId : null;
  if (["delivering", "liquidating", "repayingLoans"].includes(st.phase)) return st.awaitingPlayerId;
  if (st.phase === "placingLH") return st.turnOrder[0];
  return null;
}

function Chip({ children, color, style }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: color + "22", color, border: `1px solid ${color}55`, ...style }}
    >
      {children}
    </span>
  );
}

function PriceTicker({ pm }) {
  return (
    <div data-tut="prices" className="flex flex-wrap gap-2">
      {INDUSTRIES.map((ind) => (
        <div key={ind} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ backgroundColor: "#1c1f26" }}>
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: IND_COLOR[ind] }} />
          <span className="text-xs font-mono text-gray-300">{ind}</span>
          <span className="text-sm font-mono font-bold text-white">${price(pm, ind)}</span>
        </div>
      ))}
    </div>
  );
}

const DIST_TYPE_COLOR = { R: "#2E7D4F", C: "#B9702E", A: "#2E6FA8", I: "#5B5F6B", CTR: "#7A3F6E" };
const DIST_TYPE_LABEL = { R: "Residential", C: "Commercial", A: "Academic", I: "Industrial", CTR: "City Center" };
function distTypeOf(tname) { return ["FC", "IA", "CC", "LM"].includes(tname) ? "CTR" : tname[0]; }


function DemandCenter({ tname, demand, quarter, tileKey, deliverInfo, onDeliver }) {
  const fam = districtFamily(tname);
  const t = demand.tiles[tileKey];
  const rows = t.rows;
  const y2Open = quarter > 4;   // rows 3-4 open from Q5 (end of Year 1)
  return (
    <div className="flex flex-col items-center justify-center h-full w-full select-none" style={{ gap: 2, padding: 3 }}>
      <div className="font-bold text-white/70 tracking-wide" style={{ fontSize: 9, lineHeight: 1 }}>{tname}</div>
      {rows.map((ind, rowIdx) => {
        const locked = rowIdx >= 2 && !y2Open;
        return (
          <div key={rowIdx} className="flex items-center" style={{ gap: 2, opacity: locked ? 0.45 : 1 }}
            title={locked ? "Locked until Year 2 (opens at the end of Q4)" : undefined}>
            {locked && <span style={{ fontSize: 8, lineHeight: 1, marginRight: 1 }}>{"\uD83D\uDD12"}</span>}
            {[0, 1, 2, 3].map((levelIdx) => {
              const filled = !!t.filled[rowIdx][levelIdx];
              const isNormalEligible = !locked && !filled && deliverInfo && deliverInfo.ind === ind && levelIdx < deliverInfo.cap && deliverInfo.reach.has(tileKey);
              const isCrossEligible = !locked && !filled && deliverInfo && deliverInfo.crossActive && ind !== deliverInfo.ind && levelIdx < deliverInfo.level && deliverInfo.crossHome.has(tileKey);
              const isEligible = isNormalEligible || isCrossEligible;
              let bg = filled ? "#00000055" : IND_COLOR[ind] + "aa";
              return (
                <div key={levelIdx}
                  onClick={() => { if (isEligible) onDeliver(tileKey, rowIdx, levelIdx, isCrossEligible); }}
                  title={`${ind} \u00b7 Lvl ${levelIdx + 1}${filled ? " (met)" : ""}${isCrossEligible ? " (cross-sell)" : ""}`}
                  className={isEligible ? "cursor-pointer" : ""}
                  style={{ width: 16, height: 13, borderRadius: 2, backgroundColor: bg,
                    border: isCrossEligible ? "2px solid #f5a623" : isNormalEligible ? "2px solid #ffffff" : "1px solid #00000044",
                    boxShadow: isEligible ? "0 0 4px rgba(255,255,255,0.5)" : "none" }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function computeEligiblePlots(board, selectMode, ctx) {
  if (!selectMode) return new Set();
  if (selectMode.kind === "buy") {
    if (selectMode.selected.length >= 1) return new Set();
    // only offer plots this player can actually afford right now; anything else
    // would just be refused (server-side, as a toast) when confirmed
    const canPay = (k) => !ctx || plotValue(ctx.state, k) <= ctx.player.cash;
    return new Set(Object.keys(board.graph).filter((k) => !(k in board.owner) && canPay(k)));
  }
  if (selectMode.kind === "lh") {
    // hubs on plots: pick one empty plot and that is the whole placement
    if (board.lhOnPlots) {
      if (selectMode.selected.length >= 1) return new Set();
      return new Set(Object.keys(board.graph).filter((k) => plotFree(board, k)));
    }
    if (selectMode.selected.length >= 2) return new Set();
    const hasLH = (x, y) => board.lhEdges.some((e) => edgeKey(e[0], e[1]) === edgeKey(x, y));
    if (!selectMode.selected.length) {
      return new Set(Object.keys(board.graph).filter((k) =>
        [...board.graph[k]].some((n) => isCrossDistrictEdge(board, k, n) && !hasLH(k, n))
      ));
    }
    const [a] = selectMode.selected;
    return new Set([...board.graph[a]].filter((n) => isCrossDistrictEdge(board, a, n) && !hasLH(a, n)));
  }
  const { selected, nPlots } = selectMode;
  if (selected.length >= nPlots) return new Set();
  const ownedFree = (k) => k in board.owner && !(k in board.occupiedBy);
  if (!selected.length) return new Set(Object.keys(board.graph).filter(ownedFree));
  // a footprint grows orthogonally only - the same rule the engine enforces, so the
  // picker can never offer a plot the build would refuse
  const opts = new Set();
  selected.forEach((p) => orthOf(board, p).forEach((n) => { if (ownedFree(n) && !selected.includes(n)) opts.add(n); }));
  return opts;
}

/* ============================== BOARD GEOMETRY ==============================
   Absolute pixel layout. A "district tile" is the district body plus the road
   on its top/left; roads are shared with neighbours, and one trailing road
   closes the board. The district body carries the district's base colour and
   fully encompasses its 4 plots, leaving a WALL margin so the plots read as
   sitting inside the district's walls.

     PLOT  size of one plot
     IGAP  gap between slots inside a district
     WALL  district wall margin around the outermost plots
     ROAD  road width (= PLOT, so a road intersection is one plot square)
   ---------------------------------------------------------------------- */
const PLOT = 26, IGAP = 3, WALL = 6, ROAD = 26;
const SLOT = PLOT + IGAP;                       // pitch between ring slots
const BODY = 5 * PLOT + 4 * IGAP + 2 * WALL;    // district body edge length
const PITCH = BODY + ROAD;                      // district-to-district pitch
const BOARD_PX = 4 * PITCH + ROAD;              // whole board edge length

const ROAD_COLOR = "#c8cfdd";                   // light roads, as on the printed board
const PLOT_EMPTY = "#20232c";

function districtOrigin(i0) { return ROAD + i0 * PITCH; }
function roadOrigin(i) { return i * PITCH; }
function slotOffset(k) { return WALL + k * SLOT; }

/* rect of a plot, given 1-indexed district coords + ring position */
function plotRect(dr, dc, pos) {
  const [lr, lc] = LOCAL5[pos];
  return {
    x: districtOrigin(dc - 1) + slotOffset(lc),
    y: districtOrigin(dr - 1) + slotOffset(lr),
    w: PLOT, h: PLOT,
  };
}
function plotRectOf(board, plotKeyStr) {
  const c = board.cellOf[plotKeyStr];
  return c ? plotRect(c.r, c.c, c.pos) : null;
}
/* the demand block fills ring slots 1..3 in both directions */
function demandRect(dr, dc) {
  const x = districtOrigin(dc - 1) + slotOffset(1);
  const y = districtOrigin(dr - 1) + slotOffset(1);
  const size = 3 * PLOT + 2 * IGAP;
  return { x, y, w: size, h: size };
}

/* ---- price tag geometry ----
   Corner tags (4 districts meeting) are cross-shaped: they fill the road
   intersection and reach half a plot down each of the four road arms.
   Mid tags sit beside a district's middle plot and are twice a plot long,
   centred on that plot. */
function cornerTagRect(i, j) {
  const cx = roadOrigin(j) + ROAD / 2;
  const cy = roadOrigin(i) + ROAD / 2;
  const w = ROAD + PLOT, h = ROAD + PLOT;   // ROAD + half a plot on each side
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
const CROSS_CLIP = (() => {
  const w = ROAD + PLOT, h = ROAD + PLOT;
  const ax = (w - ROAD) / 2, ay = (h - ROAD) / 2;
  const pts = [
    [ax, 0], [w - ax, 0], [w - ax, ay], [w, ay], [w, h - ay], [w - ax, h - ay],
    [w - ax, h], [ax, h], [ax, h - ay], [0, h - ay], [0, ay], [ax, ay],
  ];
  return `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(", ")})`;
})();
function midTagRect(latR, latC) {
  const rEven = latR % 2 === 0;
  if (rEven) {
    // on a horizontal road, beside district column (latC-1)/2
    const k = (latC - 1) / 2;
    const cx = districtOrigin(k) + slotOffset(2) + PLOT / 2;
    return { x: cx - PLOT, y: roadOrigin(latR / 2), w: 2 * PLOT, h: ROAD };
  }
  // on a vertical road, beside district row (latR-1)/2
  const k = (latR - 1) / 2;
  const cy = districtOrigin(k) + slotOffset(2) + PLOT / 2;
  return { x: roadOrigin(latC / 2), y: cy - PLOT, w: ROAD, h: 2 * PLOT };
}

/* ---- footprint grouping ----
   Every plot of a multi-plot business is outlined in its industry colour, and
   game-adjacent pairs are joined by a connector bar so the footprint reads as
   one company even when it spans a road. */
function computeFootprintOverlays(board, players) {
  const outlines = [], connectors = [];
  for (const p of players) {
    for (const b of p.businesses) {
      if (b.distressed || b.footprint.length < 2) continue;
      const color = IND_COLOR[bizInd(b)];
      b.footprint.forEach((pk) => {
        const r = plotRectOf(board, pk);
        if (r) outlines.push({ key: `fo-${b.id}-${pk}`, r, color });
      });
      for (let i = 0; i < b.footprint.length; i++) {
        for (let j = i + 1; j < b.footprint.length; j++) {
          const a = b.footprint[i], c = b.footprint[j];
          if (!board.graph[a] || !board.graph[a].has(c)) continue;
          const ra = plotRectOf(board, a), rb = plotRectOf(board, c);
          if (!ra || !rb) continue;
          const acx = ra.x + ra.w / 2, acy = ra.y + ra.h / 2;
          const bcx = rb.x + rb.w / 2, bcy = rb.y + rb.h / 2;
          const T = 5;
          if (Math.abs(acy - bcy) < Math.abs(acx - bcx)) {
            const x1 = Math.min(ra.x + ra.w, rb.x + rb.w), x2 = Math.max(ra.x, rb.x);
            connectors.push({ key: `fc-${b.id}-${i}-${j}`, color,
              r: { x: x1, y: (acy + bcy) / 2 - T / 2, w: Math.max(0, x2 - x1), h: T } });
          } else {
            const y1 = Math.min(ra.y + ra.h, rb.y + rb.h), y2 = Math.max(ra.y, rb.y);
            connectors.push({ key: `fc-${b.id}-${i}-${j}`, color,
              r: { x: (acx + bcx) / 2 - T / 2, y: y1, w: T, h: Math.max(0, y2 - y1) } });
          }
        }
      }
    }
  }
  return { outlines, connectors };
}

function BoardView({ board, players, demand, quarter, selectedPlot, onSelectPlot, selectMode, selectCtx, onSelectForLaunch, deliverInfo, onDeliver, onHoverBiz }) {
  const eligible = computeEligiblePlots(board, selectMode, selectCtx);
  const { outlines, connectors } = computeFootprintOverlays(board, players);
  const layers = [];

  // 1. road surface: the whole board is road-coloured, districts are laid on top
  layers.push(
    <div key="roads" style={{ position: "absolute", inset: 0, backgroundColor: ROAD_COLOR, borderRadius: 4 }} />
  );

  // 2. district bodies (base colour = the district's "walls"), then demand block
  for (let dr = 1; dr <= 4; dr++) {
    for (let dc = 1; dc <= 4; dc++) {
      const tname = board.tiles[`${dr},${dc}`];
      if (!tname) continue;
      const bg = DIST_TYPE_COLOR[distTypeOf(tname)];
      layers.push(
        <div key={`d-${dr}-${dc}`} style={{
          position: "absolute", left: districtOrigin(dc - 1), top: districtOrigin(dr - 1),
          width: BODY, height: BODY, backgroundColor: bg, borderRadius: 6,
          boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
        }} />
      );
      const dm = demandRect(dr, dc);
      layers.push(
        <div key={`dm-${dr}-${dc}`} style={{
          position: "absolute", left: dm.x, top: dm.y, width: dm.w, height: dm.h,
          backgroundColor: "rgba(0,0,0,0.16)", borderRadius: 4, overflow: "hidden",
        }}>
          <DemandCenter tname={tname} demand={demand} quarter={quarter}
            tileKey={`${dr},${dc}`} deliverInfo={deliverInfo} onDeliver={onDeliver} />
        </div>
      );
    }
  }

  // 3. price tags on the roads
  const lat = board.priceLattice || {};
  const lhTagKeys = new Set();
  board.lhEdges.forEach(([a, b]) => {
    const ca = board.cellOf[a], cb = board.cellOf[b];
    if (ca) lhTagKeys.add(latticeKeyForCell(ca));
    if (cb) lhTagKeys.add(latticeKeyForCell(cb));
  });
  for (let r = 0; r <= 8; r++) {
    for (let c = 0; c <= 8; c++) {
      const v = lat[`${r},${c}`];
      if (v === undefined) continue;
      const isCorner = r % 2 === 0 && c % 2 === 0;
      const rect = isCorner ? cornerTagRect(r / 2, c / 2) : midTagRect(r, c);
      layers.push(
        <div key={`pt-${r}-${c}`} style={{
          position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h,
          backgroundColor: "#000000", clipPath: isCorner ? CROSS_CLIP : undefined,
          borderRadius: isCorner ? 0 : 3,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "ui-monospace, monospace", color: "#ffffff", lineHeight: 1 }}>{v}</span>
        </div>
      );
    }
  }

  // 4. Logistic Hub discs, on the road between the two plots they join
  board.lhEdges.forEach(([a, b], i) => {
    const ra = plotRectOf(board, a), rb = plotRectOf(board, b);
    if (!ra || !rb) return;
    const cx = (ra.x + ra.w / 2 + rb.x + rb.w / 2) / 2;
    const cy = (ra.y + ra.h / 2 + rb.y + rb.h / 2) / 2;
    const d = 15;
    layers.push(
      <div key={`lh-${i}`} title="Logistic Hub" style={{
        position: "absolute", left: cx - d / 2, top: cy - d / 2, width: d, height: d,
        borderRadius: "50%", backgroundColor: "#111827",
        border: "2.5px solid #22D3EE", boxShadow: "0 0 6px rgba(34,211,238,0.9)",
        pointerEvents: "none", zIndex: 4,
      }} />
    );
  });

  // 5. footprint connectors (under plots), then plots, then outlines
  connectors.forEach(({ key, r, color }) => layers.push(
    <div key={key} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h,
      backgroundColor: color, opacity: 0.95, zIndex: 2 }} />
  ));

  for (let dr = 1; dr <= 4; dr++) {
    for (let dc = 1; dc <= 4; dc++) {
      const tname = board.tiles[`${dr},${dc}`];
      if (!tname) continue;
      for (const pos of TILES[tname]) {
        const key = plotKey(dr, dc, pos);
        const r = plotRect(dr, dc, pos);
        layers.push(
          <PlotCell key={key} plotKeyStr={key} board={board} players={players} rect={r}
            selected={selectedPlot === key} onSelect={onSelectPlot}
            eligible={eligible.has(key)} chosen={selectMode ? selectMode.selected.includes(key) : false}
            onChoose={onSelectForLaunch} onHoverBiz={onHoverBiz} />
        );
      }
    }
  }

  outlines.forEach(({ key, r, color }) => layers.push(
    <div key={key} style={{ position: "absolute", left: r.x - 2, top: r.y - 2, width: r.w + 4, height: r.h + 4,
      border: `2px solid ${color}`, borderRadius: 5, pointerEvents: "none", zIndex: 3 }} />
  ));

  return (
    <div data-tut="board" className="board-shell inline-block rounded-lg p-2" style={{ backgroundColor: "#0b0c0f", border: "1px solid #262a33" }}>
      <div style={{ position: "relative", width: BOARD_PX, height: BOARD_PX, overflow: "hidden", borderRadius: 2 }}>
        {layers}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {Object.entries(DIST_TYPE_LABEL).map(([k, label]) => (
          <div key={k} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIST_TYPE_COLOR[k] }} />
            <span className="text-[9px] text-gray-400">{label}</span>
          </div>
        ))}
        {selectMode && (
          <div className="flex items-center gap-1 ml-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#0d2818", border: "2px solid #4ade80" }} />
            <span className="text-[9px]" style={{ color: "#4ade80" }}>Click to build here</span>
          </div>
        )}
        <div className="flex items-center gap-1 ml-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ border: "2px solid #22D3EE" }} />
          <span className="text-[9px] text-gray-400">Logistic Hub ({lhCount(board)})</span>
        </div>
      </div>
    </div>
  );
}

function PlotCell({ plotKeyStr, board, players, rect, selected, onSelect, eligible, chosen, onChoose, onHoverBiz }) {
  const bizId = board.occupiedBy[plotKeyStr];
  const ownerId = board.owner[plotKeyStr];
  let fill = PLOT_EMPTY;
  let foundBiz = null;
  if (bizId !== undefined) {
    for (const p of players) {
      const b = p.businesses.find((bb) => bb.id === bizId);
      // a distressed structure belongs to nobody: show it derelict, not in an owner's colour
      if (b) { fill = b.distressed ? "#4a4d57" : IND_COLOR[b.bp.ind]; foundBiz = b; break; }
    }
  }
  if (chosen) fill = "#1a4a2e";
  else if (eligible) fill = "#0d2818";
  const ownerColor = ownerId !== undefined ? PLAYER_COLORS[ownerId] : null;
  const border = chosen || eligible ? "2px solid #4ade80"
    : selected ? "2px solid #ffffff"
    : "1px solid rgba(0,0,0,0.5)";
  const isVertical = foundBiz && SCALING[bizInd(foundBiz)] === "V";
  const hasLH = plotHasLH(board, plotKeyStr);
  const isHub = plotIsLH(board, plotKeyStr);      // a hub standing on this plot
  return (
    <div
      onClick={() => { if (eligible && onChoose) onChoose(plotKeyStr); else onSelect(plotKeyStr); }}
      onMouseEnter={(e) => { if (foundBiz && onHoverBiz) { const b = e.currentTarget.getBoundingClientRect(); onHoverBiz(foundBiz, b.right, b.top); } }}
      onMouseLeave={() => { if (foundBiz && onHoverBiz) onHoverBiz(null); }}
      className="cursor-pointer"
      title={isHub ? "Logistic Hub" : hasLH ? "Adjacent to a Logistic Hub" : undefined}
      style={{
        position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h,
        backgroundColor: fill, border, borderRadius: 4, zIndex: 3,
        boxSizing: "border-box",
      }}
    >
      {ownerColor && (
        <span style={{ position: "absolute", inset: 1, borderRadius: "50%",
          border: `2px solid ${ownerColor}`, pointerEvents: "none" }} />
      )}
      {foundBiz && foundBiz.distressed && (
        <span title="Distressed - unowned" style={{ position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#f5a623", pointerEvents: "none" }}>!</span>
      )}
      {isVertical && foundBiz.level > 1 && Array.from({ length: Math.min(foundBiz.level - 1, 3) }).map((_, i) => (
        <span key={i} style={{ position: "absolute", inset: 5 + i * 3.5,
          border: `1px solid ${IND_COLOR[bizInd(foundBiz)]}`, opacity: 0.95, pointerEvents: "none" }} />
      ))}
      {isHub && (
        <span title="Logistic Hub" style={{
          position: "absolute", inset: 2, borderRadius: "50%", backgroundColor: "#22D3EE",
          border: "1.5px solid #0e5f6f", pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 800, color: "#062b33",
        }}>H</span>
      )}
      {foundBiz && foundBiz.isHQ && (
        <span title={`Megacorp HQ: ${foundBiz.megacorpName}`} style={{
          position: "absolute", inset: 3, borderRadius: 2, backgroundColor: "#f5d76e",
          border: "1.5px solid #7a5c00", pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 800, color: "#3a2c00",
        }}>HQ</span>
      )}
    </div>
  );
}

function EPBreakdown({ hover }) {
  if (!hover || !hover.p) return null;
  const p = hover.p;
  const onCards = p.businesses.filter((b) => (b.epOnCard || 0) > 0);
  const onCardTotal = onCards.reduce((s, b) => s + b.epOnCard, 0);
  const log = p.epLog || [];
  const vw = typeof window !== "undefined" ? window.innerWidth : 1400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const W = 250, PAD = 10;
  const below = hover.y < vh / 2;
  const vertical = below ? { top: Math.min(hover.y, vh - PAD) } : { bottom: Math.max(PAD, vh - hover.y - 4) };
  return (
    <Floating><div className="fixed rounded-md p-2.5 pointer-events-none" style={{ zIndex: 9999,
      left: Math.max(PAD, Math.min(hover.x - W - 12, vw - W - PAD)),
      ...vertical, width: W, maxHeight: vh - 2 * PAD, overflowY: "auto",
      backgroundColor: "#0e1014", border: `1px solid ${PLAYER_COLORS[p.id]}88`, boxShadow: "0 4px 16px rgba(0,0,0,0.55)",
    }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold" style={{ color: PLAYER_COLORS[p.id] }}>{p.name}</span>
        <span className="text-xs font-bold font-mono" style={{ color: "#8fd3b6" }}>{epTotal(p).toFixed(0)} EP</span>
      </div>
      {!log.length && !onCards.length && <div className="text-[10px] text-gray-500 italic">No points scored yet.</div>}
      {log.length > 0 && (
        <>
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">Banked</div>
          <div className="space-y-0.5 mb-1.5">
            {log.map((e, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-[10px]">
                <span className="text-gray-300 leading-tight">
                  {e.label}{e.quarter ? <span className="text-gray-600"> &middot; Q{e.quarter}</span> : null}
                </span>
                <span className="font-mono shrink-0" style={{ color: e.amount < 0 ? "#fca5a5" : "#8fd3b6" }}>
                  {e.amount > 0 ? "+" : ""}{e.amount.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {onCards.length > 0 && (
        <>
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">On cards (not yet vested)</div>
          <div className="space-y-0.5">
            {onCards.map((b) => (
              <div key={b.id} className="flex items-start justify-between gap-2 text-[10px]">
                <span className="text-gray-300 leading-tight">{b.bp.name}</span>
                <span className="font-mono shrink-0" style={{ color: "#a5d6f3" }}>+{b.epOnCard}</span>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-gray-600 mt-1">{onCardTotal} EP vest at game end, or sooner if upgraded, sold or merged.</div>
        </>
      )}
    </div></Floating>
  );
}

function BizTooltip({ state, hover }) {
  if (!hover || !hover.biz) return null;
  const b = hover.biz;
  const { owner, plotOwners, canProduce } = getBizTooltipInfo(state, b);
  const vw = typeof window !== "undefined" ? window.innerWidth : 1400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const W = 210, PAD = 10;
  // Anchor to whichever edge is nearer so the panel always grows *into* the viewport:
  // in the lower half we pin its bottom above the cursor, in the upper half we pin its top below.
  const below = hover.y < vh / 2;
  const vertical = below
    ? { top: Math.min(hover.y + 14, vh - PAD) }
    : { bottom: Math.max(PAD, vh - hover.y + 14) };
  return (
    <Floating><div className="fixed rounded-md p-2.5 pointer-events-none" style={{ zIndex: 9999,
      left: Math.max(PAD, Math.min(hover.x + 14, vw - W - PAD)),
      ...vertical,
      width: W, maxHeight: vh - 2 * PAD, overflowY: "auto",
      backgroundColor: "#0e1014", border: `1px solid ${IND_COLOR[b.bp.ind]}88`, boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    }}>
      <div className="flex items-center justify-between mb-1">
        <Chip color={IND_COLOR[b.bp.ind]}>{b.bp.ind}</Chip>
        <span className="text-[10px] font-mono text-gray-400">Lvl {b.level}{b.upgraded ? " \u2191" : ""}</span>
      </div>
      <div className="text-xs font-bold text-gray-100 mb-1.5">{b.bp.name}</div>
      <div className="text-[10px] font-mono text-gray-300 space-y-0.5">
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: owner ? PLAYER_COLORS[owner.id] : "#666" }} /> Biz owner: {owner ? owner.name : "\u2014"}</div>
        <div className="flex items-center gap-1 flex-wrap">
          <span>Plot owner{plotOwners.length !== 1 ? "s" : ""}:</span>
          {plotOwners.length ? plotOwners.map((p) => (
            <span key={p.id} className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.id] }} />{p.name}</span>
          )) : <span className="text-red-400">none (can't produce)</span>}
        </div>
        <div>Setup: ${bizSetup(b)} &middot; Opex: ${bizOpex(b)}</div>
        <div>Split: {b.bp.deps.map((d) => `${d.ind} $${d.val}${b.upgraded ? "\u00d72" : ""}`).join(", ") || "\u2014"}</div>
        <div>Production: {bizProd(b)}/qtr</div>
        {!canProduce && <div className="text-red-400">Land unowned — not producing</div>}
      </div>
    </div></Floating>
  );
}
function PlotInfo({ board, players, selectedPlot }) {
  if (!selectedPlot) return <div className="text-[10px] text-gray-500 italic px-1">Click a plot to inspect it.</div>;
  const [r, c, pos] = selectedPlot.split(",");
  const tname = board.tiles[`${r},${c}`];
  const bizId = board.occupiedBy[selectedPlot];
  const ownerId = board.owner[selectedPlot];
  let ownerName = "Unowned", biz = null, bizOwnerName = null;
  if (ownerId !== undefined) ownerName = players.find((p) => p.id === ownerId)?.name || "Unowned";
  if (bizId !== undefined) {
    for (const p of players) { const b = p.businesses.find((bb) => bb.id === bizId); if (b) { biz = b; bizOwnerName = p.name; break; } }
  }
  return (
    <div className="text-[10px] font-mono text-gray-300 px-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
      <span className="text-gray-500">{tname} &middot; {pos}</span>
      <span>Land owner: <span className="text-gray-100">{ownerName}</span></span>
      {biz ? (
        <span>
          Business: <span style={{ color: biz.distressed ? "#8b93a3" : IND_COLOR[biz.bp.ind] }}>{biz.bp.name}</span>
          {" "}(L{biz.level}{biz.upgraded ? "\u2191" : ""}) &mdash;{" "}
          {biz.distressed
            ? <span style={{ color: "#f5a623" }}>Distressed &middot; unowned (renovate via M&amp;A &rarr; Buy)</span>
            : biz.isHQ
              ? <span style={{ color: "#f5d76e" }}>Megacorp HQ &ldquo;{biz.megacorpName}&rdquo; &middot; {bizOwnerName}</span>
              : bizOwnerName}
        </span>
      ) : (
        <span className="text-gray-500">Empty plot</span>
      )}
    </div>
  );
}

function BPCard({ bp, onClick, disabled, small }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-left rounded-md p-2 transition ${disabled ? "opacity-40 cursor-not-allowed" : "hover:brightness-125 cursor-pointer"}`}
      style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[bp.ind]}55`, width: small ? 128 : 148 }}
    >
      <div className="flex items-center justify-between mb-1">
        <Chip color={IND_COLOR[bp.ind]}>{bp.ind}</Chip>
        <span className="text-[10px] font-mono text-gray-400">Lvl {bp.lvl}</span>
      </div>
      <div className="text-xs font-semibold text-gray-100 leading-tight mb-1.5" style={{ minHeight: 28 }}>{bp.name}</div>
      <div className="text-[10px] font-mono text-gray-400 space-y-0.5">
        <div>Setup ${bp.setup} &middot; Opex ${bp.opex}</div>
        <div>Prod {bp.prod} &middot; {bp.deps.map((d) => `${d.ind} $${d.val}`).join(", ")}</div>
      </div>
    </button>
  );
}

function BizCard({ b, onUpgrade, onSell, canUpgrade }) {
  return (
    <div className="rounded-md p-2" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[b.bp.ind]}55`, width: 148 }}>
      <div className="flex items-center justify-between mb-1">
        <Chip color={IND_COLOR[b.bp.ind]}>{b.bp.ind}</Chip>
        <span className="text-[10px] font-mono text-gray-400">Lvl {b.level}{b.upgraded ? " \u2191" : ""}</span>
      </div>
      <div className="text-xs font-semibold text-gray-100 leading-tight mb-1.5" style={{ minHeight: 28 }}>{b.bp.name}</div>
      <div className="text-[10px] font-mono text-gray-400 mb-1.5">Opex ${bizOpex(b)} &middot; Prod {bizProd(b)}</div>
      <div className="flex gap-1">
        <button onClick={onUpgrade} disabled={!canUpgrade} className="flex-1 text-[10px] px-1.5 py-1 rounded font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#2a2e38", color: "#e5e7eb" }}>Upgrade</button>
        <button onClick={onSell} className="flex-1 text-[10px] px-1.5 py-1 rounded font-semibold" style={{ backgroundColor: "#3a2020", color: "#f3a5a5" }}>Sell</button>
      </div>
    </div>
  );
}

function TrackBoard({ state, human }) {
  const tracks = [
    ["raise_capital", "Raise Capital", ["LOAN", "SELL"]],
    ["ma", "M&A", ["BUY", "LAUNCH"]],
    ["rd", "R&D", ["RESEARCH", "UPGRADE"]],
  ];
  return (
    <div data-tut="tracks" className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#14161a", border: "1px solid #262a33" }}>
      <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-1 flex items-center gap-1">Planning &amp; Action Tracks <Help text="Place two workers, then tracks resolve first-in, last-out: whoever placed LAST acts FIRST. Committing early earns +1 extra action for every player who joins after you, but they all act before you do." /></div>
      {tracks.map(([key, label, actions]) => (
        <div key={key} className="flex items-center gap-2">
          <div className="w-24 text-[10px] font-mono text-gray-400 shrink-0 flex items-center gap-1">
            {label} <Help text={TRACK_HELP[key]} />
          </div>
          <div className="flex gap-1">
            {state.tracks[key].map((pid, i) => (
              <div key={i} className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: pid !== null ? PLAYER_COLORS[pid] + "33" : "#1c1f26", border: `1px solid ${pid !== null ? PLAYER_COLORS[pid] : "#33384355"}` }}>
                {pid !== null ? ((state.players[pid] || {}).name || "?").slice(0, 1) : ""}
              </div>
            ))}
          </div>
          <div className="text-[9px] font-mono text-gray-600">{actions.join(" / ")}</div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div className="w-24 text-[10px] font-mono text-gray-400 shrink-0 flex items-center gap-1">
          Board Mtg <Help text={TRACK_HELP.board_meeting} />
        </div>
        <div className="flex gap-1">
          {state.tracks.board_meeting.map((pid, i) => {
            const locked = i > 0 && !state.ipoTileClaimed;
            return (
              <div key={i} className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: locked ? "#0e1014" : pid !== null ? PLAYER_COLORS[pid] + "33" : "#1c1f26", border: `1px solid ${locked ? "#262a33" : pid !== null ? PLAYER_COLORS[pid] : "#33384355"}`, opacity: locked ? 0.4 : 1 }}>
                {locked ? "\ud83d\udd12" : pid !== null ? (pid === 0 ? "Y" : state.players[pid].name.slice(0, 1)) : ""}
              </div>
            );
          })}
        </div>
        <div className="text-[9px] font-mono text-gray-600">GO PUBLIC / REPOSITION</div>
      </div>
    </div>
  );
}

function LiquidationPanel({ state, human, log, onContinue }) {
  const needed = committedOpex(human);
  const short = Math.max(0, needed - human.cash);
  const ownedPlots = Object.entries(state.board.owner).filter(([k, v]) => v === human.id).map(([k]) => k);
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: "#2a1a1a", border: "1px solid #7a3f3f" }}>
      <div className="text-xs font-bold mb-1" style={{ color: "#fca5a5" }}>
        Cash shortfall — this quarter's OPEX bill is ${needed}, you have ${Math.round(human.cash)} ({short > 0 ? `$${Math.round(short)} short` : "covered, you may continue"})
      </div>
      <div className="text-[10px] mb-2" style={{ color: "#e0b060" }}>
        This is a forced sale: <b>everything goes for half</b> what a planned sale through Raise
        Capital would fetch. Sell hand BPs, businesses or plots below until the bill is covered,
        then continue.
      </div>
      {human.hand.length > 0 && (
        <>
          <div className="text-[10px] text-gray-400 mb-1">Hand BPs (${BP_SOLVENCY_PRICE[1]} / ${BP_SOLVENCY_PRICE[2]} / ${BP_SOLVENCY_PRICE[3]} by level):</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {human.hand.map((bp, i) => (
              <button key={i} onClick={() => { if (NET) return NET.send("liquidate", { type: "bp", index: i }); doSellBP(state, human, bp, log, true); onContinue(false); }} className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[bp.ind]}55`, color: "#e5e7eb" }}>
                {bp.name} <span style={{ color: "#f3a5a5" }}>${BP_SOLVENCY_PRICE[bp.lvl] || 2}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {activeBiz(human).length > 0 && (
        <>
          <div className="text-[10px] text-gray-400 mb-1">Businesses:</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {activeBiz(human).map((b) => (
              <button key={b.id} onClick={() => { if (NET) return NET.send("liquidate", { type: "biz", bizId: b.id }); doSellCompany(human, b, log, true); onContinue(false); }} className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[b.bp.ind]}55`, color: "#e5e7eb" }}>
                {b.bp.name} <span style={{ color: "#f3a5a5" }}>${b.upgraded ? Math.floor(bizSetup(b) / 2) : Math.floor(bizSetup(b) / 4)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {ownedPlots.length > 0 && (
        <>
          <div className="text-[10px] text-gray-400 mb-1">Owned plots:</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {ownedPlots.map((pk) => (
              <button key={pk} onClick={() => { if (NET) return NET.send("liquidate", { type: "plot", plot: pk }); doSellPlot(state, human, pk, log, true); onContinue(false); }} className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "#1c1f26", border: "1px solid #33384355", color: "#e5e7eb" }}>
                {plotLabel(state.board, pk)} <span style={{ color: "#f3a5a5" }}>${Math.floor(plotValue(state, pk) / 2)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button onClick={() => { if (NET) return NET.send("liquidateDone", {}); onContinue(true); }} disabled={short > 0 && (human.hand.length > 0 || activeBiz(human).length > 0 || ownedPlots.length > 0)}
        className="text-xs font-bold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#2c5f4f", color: "#d3fcec" }}>
        Continue
      </button>
      {!human.hand.length && !activeBiz(human).length && !ownedPlots.length && short > 0 && (
        <div className="text-[10px] text-red-400 mt-2">
          Nothing left to sell — continuing triggers involuntary SOLVENCY, and the bank takes over at
          half rates: Blueprints fetch ${BP_SOLVENCY_PRICE[1]} / ${BP_SOLVENCY_PRICE[2]} / ${BP_SOLVENCY_PRICE[3]} by
          level, plots half their value, and a company half what a voluntary sale would pay.
        </div>
      )}
    </div>
  );
}

function ActionPanel({ state, human, rng, log, onDone, onStartLaunch, onStartBuy }) {
  const entry = state.pendingHumanAction;
  const [mode, setMode] = useState(null);
  useEffect(() => { setMode(null); }, [entry?.track, entry?.actionsRemaining]);
  if (!entry) return null;
  const label = TRACK_LABEL[entry.track];

  function finish() { setMode(null); onDone(); }

  const distressedTargets = findDistressedTargets(state);
  /* Every distressed structure in the bank is offered, not only the ones you happen
     to hold a matching card for. Taking one over as it stands needs no card at all -
     including the one you sold yourself last quarter - and filtering on the hand made
     that button unreachable unless you also had a renovation card for the same shell. */
  const renoOptions = distressedTargets.map((db) => ({ db, bps: human.hand.filter((bp) => renovationEligible(db, bp)) }));
  const ownedPlots = Object.entries(state.board.owner).filter(([k, v]) => v === human.id).map(([k]) => k);
  const unownedPlots = Object.keys(state.board.graph).filter((k) => !(k in state.board.owner));
  const upgradable = activeBiz(human).filter((b) => !b.upgraded);
  const megacorpMatch = bestMegacorpMatch(activeBiz(human), state.megacorpPool);

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#1a2420", border: "1px solid #2c5f4f" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: "#d3fcec" }}>Your turn — {label}</span>
        <span className="text-[10px] font-mono text-gray-400">{entry.actionsRemaining} action{entry.actionsRemaining > 1 ? "s" : ""} left this track</span>
      </div>

      {entry.track === "raise_capital" && mode === null && (
        <div className="flex gap-2">
          <button onClick={() => { if (NET) return NET.send("act", { type: "loan" }); doLoan(state, human, log); finish(); }} disabled={discsFree(state, human) <= 0}
            className="text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>Take Loan (+$20, +1 disc)</button>
          <button onClick={() => setMode("sell")} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>Sell for cash</button>
        </div>
      )}
      {entry.track === "raise_capital" && mode === "sell" && (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-400">Hand BPs (${BP_SELL_PRICE[1]}/${BP_SELL_PRICE[2]}/${BP_SELL_PRICE[3]} by level):</div>
          <div className="flex flex-wrap gap-2">
            {human.hand.map((bp, i) => (
              <button key={i} onClick={() => { if (NET) return NET.send("act", { type: "sellBP", index: i }); doSellBP(state, human, bp, log); finish(); }} className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[bp.ind]}55`, color: "#e5e7eb" }}>
                {bp.name} <span style={{ color: "#f3a5a5" }}>${BP_SELL_PRICE[bp.lvl] || 4}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-gray-400">Businesses:</div>
          <div className="flex flex-wrap gap-2">
            {activeBiz(human).map((b) => (
              <button key={b.id} onClick={() => { if (NET) return NET.send("act", { type: "sellCompany", bizId: b.id }); doSellCompany(human, b, log); finish(); }} className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[b.bp.ind]}55`, color: "#e5e7eb" }}>
                {b.bp.name} <span style={{ color: "#f3a5a5" }}>${b.upgraded ? bizSetup(b) : Math.floor(bizSetup(b) / 2)}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-gray-400">Owned plots (value = printed road price, +$1 per adjacent business, +$1 if adjacent to an LH):</div>
          <div className="flex flex-wrap gap-2">
            {ownedPlots.length ? ownedPlots.map((pk) => (
              <button key={pk} onClick={() => { if (NET) return NET.send("act", { type: "sellPlot", plot: pk }); doSellPlot(state, human, pk, log); finish(); }} className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "#1c1f26", border: "1px solid #33384355", color: "#e5e7eb" }}>
                {plotLabel(state.board, pk)} <span style={{ color: "#f3a5a5" }}>${plotValue(state, pk)}</span>
              </button>
            )) : <span className="text-[10px] text-gray-600 italic">None owned.</span>}
          </div>
          <button onClick={() => setMode(null)} className="text-[10px] text-gray-500 underline">back</button>
        </div>
      )}

      {entry.track === "ma" && mode === null && (
        <div className="flex gap-2">
          <button onClick={() => setMode("launch")} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>Launch</button>
          <button onClick={() => setMode("buy")} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>Buy</button>
        </div>
      )}
      {entry.track === "ma" && mode === "launch" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {human.hand.map((bp, i) => (
              <BPCard key={i} bp={bp} disabled={!canLaunchMore(human) || human.cash < bp.setup || discsFree(state, human) <= 0} onClick={() => onStartLaunch(bp)} small />
            ))}
            {!human.hand.length && <span className="text-xs text-gray-500 italic">Hand is empty.</span>}
          </div>
          {(() => { const why = !canLaunchMore(human) ? "you already have 5 active companies" : discsFree(state, human) <= 0 ? `all ${DISCS_PER_PLAYER} of your discs are committed` : null; return why ? <div className="text-[9px]" style={{ color: "#fca5a5" }}>Can't launch: {why}.</div> : null; })()}
          <div className="text-[9px] text-gray-500">Pick a BP, then click its plot(s) on the board — owned, unoccupied plots only. Horizontal industries at level 2+ need a connected cluster.</div>
          <button onClick={() => setMode(null)} className="text-[10px] text-gray-500 underline">back</button>
        </div>
      )}
      {entry.track === "ma" && mode === "buy" && (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-400">
            Take over a distressed structure from the bank &mdash; including one you sold yourself.
            <b> Buy it as it stands</b> for half its own setup, keeping its Blueprint and level, or
            <b> renovate it</b> with a card from your hand for half that card&rsquo;s setup. Location matters,
            since renovating changes industry. A renovation card must match the shell&rsquo;s level, and from
            level 2 up its scaling type too; a level-1 shell takes any level-1 card:
          </div>
          <div className="flex flex-col gap-1.5">
            {renoOptions.length ? renoOptions.map(({ db, bps }) => {
              const locs = [...new Set(db.footprint.map((pk) => state.board.tiles[`${state.board.cellOf[pk].r},${state.board.cellOf[pk].c}`]))];
              const nearLH = db.footprint.some((pk) => plotHasLH(state.board, pk));
              return (
                <div key={db.id} className="rounded p-1.5" style={{ backgroundColor: "#161920", border: "1px solid #33384355" }}>
                  <div className="text-[9px] text-gray-500 mb-1">
                    Was {db.bp.ind} L{db.level} — {locs.join("+")} ({db.footprint.length} plot{db.footprint.length > 1 ? "s" : ""}){nearLH ? " \u00b7 near a Logistic Hub" : ""}
                    {human.businesses.includes(db) && <span style={{ color: "#8fd3b6" }}> &middot; yours before you sold it</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* take it over exactly as it stands, keeping its Blueprint and level */}
                    <button disabled={!canReclaim(state, human, db)}
                      onClick={() => { if (NET) return NET.send("act", { type: "reclaim", bizId: db.id }); doReclaim(state, human, db, log); finish(); }}
                      className="text-[10px] px-2 py-1 rounded disabled:opacity-30"
                      style={{ backgroundColor: "#1c2733", border: `1px solid ${IND_COLOR[db.bp.ind]}`, color: "#e5e7eb" }}>
                      Buy as-is: {db.bp.name} <span style={{ color: "#8fd3b6" }}>${reclaimCost(db)}</span>
                    </button>
                    {bps.map((bp, i) => (
                      <button key={i} onClick={() => { if (NET) return NET.send("act", { type: "renovate", bizId: db.id, index: human.hand.indexOf(bp) }); doRenovate(state, human, db, bp, log); finish(); }} className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[bp.ind]}55`, color: "#e5e7eb" }}>
                        Renovate into {bp.name} <span style={{ color: "#a5d6f3" }}>${Math.floor(bp.setup / 2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            }) : <span className="text-[10px] text-gray-600 italic">Nothing distressed in the bank right now.</span>}
          </div>
          <div className="text-[10px] text-gray-400">
            Buy a plot ({unownedPlots.length ? `$${Math.min(...unownedPlots.map((pk) => plotValue(state, pk)))}\u2013$${Math.max(...unownedPlots.map((pk) => plotValue(state, pk)))}` : "none left"}):
          </div>
          {(() => {
            const noDiscs = discsFree(state, human) <= 0;
            const cheapest = unownedPlots.length ? Math.min(...unownedPlots.map((pk) => plotValue(state, pk))) : 0;
            const tooPoor = unownedPlots.length > 0 && human.cash < cheapest;
            const blocked = !unownedPlots.length ? "no unowned plots left"
              : noDiscs ? `all ${DISCS_PER_PLAYER} of your discs are committed`
              : tooPoor ? `cheapest plot costs $${cheapest}, you have $${Math.round(human.cash)}`
              : null;
            return (
              <>
                <button onClick={() => onStartBuy()} disabled={!!blocked}
                  className="text-[10px] px-2 py-1 rounded disabled:opacity-30" style={{ backgroundColor: "#1c1f26", border: "1px solid #33384355", color: "#e5e7eb" }}>
                  Pick a plot to buy ({unownedPlots.length} available)
                </button>
                {blocked && <div className="text-[9px] mt-0.5" style={{ color: "#fca5a5" }}>Can't buy: {blocked}.</div>}
              </>
            );
          })()}
          <button onClick={() => setMode(null)} className="text-[10px] text-gray-500 underline block">back</button>
        </div>
      )}

      {entry.track === "rd" && mode === null && (
        <div className="flex gap-2">
          <button onClick={() => setMode("research")} disabled={human.hand.length >= 5} className="text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>Research (choose a deck)</button>
          <button onClick={() => setMode("upgrade")} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>Upgrade</button>
        </div>
      )}
      {entry.track === "rd" && mode === "research" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => {
              const deck = state.decks[ind];
              const top = deck && deck[0];
              return (
                <button key={ind} onClick={() => { if (NET) return NET.send("act", { type: "research", ind }); doDraw(state, human, ind, log); finish(); }} disabled={!top}
                  className="text-left rounded-md p-2 disabled:opacity-30" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[ind]}55`, width: 118 }}>
                  <div className="flex items-center justify-between mb-1">
                    <Chip color={IND_COLOR[ind]}>{ind}</Chip>
                    <span className="text-[9px] font-mono text-gray-500">{deck ? deck.length : 0} left</span>
                  </div>
                  {top ? (
                    <>
                      <div className="text-[10px] font-semibold text-gray-200 leading-tight" style={{ minHeight: 22 }}>{top.name}</div>
                      <div className="text-[9px] font-mono text-gray-500">Lvl {top.lvl} &middot; ${top.setup}</div>
                    </>
                  ) : <div className="text-[9px] text-gray-600 italic">Empty</div>}
                </button>
              );
            })}
          </div>
          <button onClick={() => setMode(null)} className="text-[10px] text-gray-500 underline">back</button>
        </div>
      )}
      {entry.track === "rd" && mode === "upgrade" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {upgradable.length ? upgradable.map((b) => {
              const why = upgradeBlockedReason(state, human, b);
              return (
                <div key={b.id} style={{ width: 170 }}>
                  <button disabled={!!why}
                    onClick={() => { if (NET) return NET.send("act", { type: "upgrade", bizId: b.id }); const ok = doUpgrade(state, human, b, rng, log); if (ok) finish(); }}
                    className="text-[10px] px-2 py-1 rounded w-full text-left disabled:opacity-30"
                    style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[b.bp.ind]}55`, color: "#e5e7eb" }}>
                    {b.bp.name} <span className="text-gray-500">L{b.level}&rarr;{b.level + 1}</span> <span style={{ color: "#a5d6f3" }}>${bizSetup(b)}</span>
                  </button>
                  {why && <div className="text-[9px] mt-0.5" style={{ color: "#fca5a5" }}>{why}</div>}
                </div>
              );
            }) : <span className="text-[10px] text-gray-600 italic">Nothing eligible to upgrade.</span>}
          </div>
          <button onClick={() => setMode(null)} className="text-[10px] text-gray-500 underline">back</button>
        </div>
      )}

      {entry.track === "board_meeting" && mode !== "hq" && (() => {
        const blocked = goPublicBlockedReason(state, human);
        return (
        <div>
          <div className="flex gap-2 flex-wrap">
            <button disabled={!!blocked}
              onClick={() => { if (state.ipoTileClaimed && megacorpMatch) return setMode("hq"); if (NET) return NET.send("act", { type: "megacorp" }); claimMegacorp(state, human, log); finish(); }}
              className="text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>
              {megacorpMatch
                ? `Go Public \u2014 form "${megacorpMatch.tile[0]}" (+${megacorpMatch.tile[2]} EP${!state.ipoTileClaimed ? " +5 IPO" : ""})`
                : "Go Public"}
            </button>
            <button onClick={() => { if (NET) return NET.send("act", { type: "reposition" }); doReposition(state, human, log); finish(); }} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>Reposition (become 1st)</button>
          </div>
          {blocked && <div className="text-[10px] mt-1" style={{ color: "#fca5a5" }}>Can&rsquo;t go public: {blocked}. Reposition is your only option this turn.</div>}
        </div>
        );
      })()}
      {entry.track === "board_meeting" && mode === "hq" && megacorpMatch && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold" style={{ color: "#d3fcec" }}>
            Choose the HQ for &ldquo;{megacorpMatch.tile[0]}&rdquo;
          </div>
          <div className="text-[10px] text-gray-400">
            The company you pick keeps its building and your disc, gains a Megacorp block, and returns its
            BP to its industry deck. It will siphon $5 from each neighbouring business's industry pot every
            B2B. The other {megacorpMatch.have.length - 1} go to the bank as Distressed Assets.
          </div>
          <div className="flex flex-wrap gap-2">
            {megacorpMatch.have.map((b) => {
              const nbrs = new Set();
              b.footprint.forEach((pk) => (state.board.graph[pk] || []).forEach((n) => {
                const id = state.board.occupiedBy[n];
                if (id !== undefined && id !== b.id) nbrs.add(id);
              }));
              return (
                <button key={b.id} onClick={() => { if (NET) return NET.send("act", { type: "megacorp", hqId: b.id }); claimMegacorp(state, human, log, b); finish(); }}
                  className="text-left rounded-md p-2" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[b.bp.ind]}77`, width: 150 }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <Chip color={IND_COLOR[b.bp.ind]}>{b.bp.ind}</Chip>
                    <span className="text-[10px] font-mono text-gray-400">L{b.level}</span>
                  </div>
                  <div className="text-[10px] font-semibold text-gray-100 leading-tight">{b.bp.name}</div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: nbrs.size ? "#8fd3b6" : "#6b7280" }}>
                    {nbrs.size} neighbour{nbrs.size === 1 ? "" : "s"} to siphon
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={() => setMode(null)} className="text-[10px] text-gray-500 underline">back</button>
        </div>
      )}

      <button onClick={() => { if (NET) return NET.send("act", { type: "pass" }); finish(); }} className="text-[10px] text-gray-500 underline">Pass this action</button>
    </div>
  );
}

/* ---------------- Animated diagrams ----------------
   Small inline SVGs. They loop with CSS so the idea is shown, not just described:
   a supply-chain loop that lights up in sequence, price markers sliding in opposite
   directions, and workers resolving right-to-left. */

const TUT_CSS = `
@keyframes tutFlow { 0%,100% { opacity:.25 } 40% { opacity:1 } }
@keyframes tutSlideL { 0%,100% { transform:translateX(0) } 50% { transform:translateX(-26px) } }
@keyframes tutSlideR { 0%,100% { transform:translateX(0) } 50% { transform:translateX(26px) } }
@keyframes tutPop { 0%,100% { transform:scale(1); opacity:.35 } 50% { transform:scale(1.18); opacity:1 } }
@keyframes tutPulse { 0%,100% { box-shadow:0 0 0 3px rgba(143,211,182,.9), 0 0 0 9999px rgba(6,8,11,.78) }
                      50%     { box-shadow:0 0 0 7px rgba(143,211,182,.45), 0 0 0 9999px rgba(6,8,11,.78) } }
.tut-spot { position:fixed; border-radius:8px; pointer-events:none; z-index:10000;
            animation:tutPulse 1.8s ease-in-out infinite; transition:all .35s ease; }
`;

function ArtChain() {                       // the six industries feeding each other
  const ring = ["UT", "HO", "MA", "HC", "RE", "TE"];
  const R = 42, cx = 100, cy = 52;
  return (
    <svg viewBox="0 0 200 104" style={{ width: "100%", height: 104 }}>
      {ring.map((_, i) => {
        const a1 = (i / 6) * 2 * Math.PI - Math.PI / 2;
        const a2 = ((i + 1) / 6) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={cx + R * Math.cos(a1)} y1={cy + R * Math.sin(a1) * 0.62}
          x2={cx + R * Math.cos(a2)} y2={cy + R * Math.sin(a2) * 0.62}
          stroke="#2c5f4f" strokeWidth="1.5"
          style={{ animation: `tutFlow 3s linear ${i * 0.5}s infinite` }} />;
      })}
      {ring.map((ind, i) => {
        const a = (i / 6) * 2 * Math.PI - Math.PI / 2;
        const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a) * 0.62;
        return (
          <g key={ind} style={{ animation: `tutFlow 3s linear ${i * 0.5}s infinite` }}>
            <circle cx={x} cy={y} r="12" fill={IND_COLOR[ind]} />
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#14161a">{ind}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ArtPrices() {                      // build your own -> down; pay a supplier -> up
  return (
    <svg viewBox="0 0 200 92" style={{ width: "100%", height: 92 }}>
      <text x="6" y="16" fontSize="8" fill="#8b93a3">you build Retail</text>
      <line x1="6" y1="26" x2="194" y2="26" stroke="#262a33" strokeWidth="1" />
      <g style={{ animation: "tutSlideL 3s ease-in-out infinite" }}>
        <rect x="96" y="19" width="14" height="14" rx="2" fill={IND_COLOR.RE} />
        <text x="103" y="30" textAnchor="middle" fontSize="8" fontWeight="700" fill="#14161a">RE</text>
      </g>
      <text x="6" y="46" fontSize="7" fill="#fca5a5">price falls &mdash; more supply</text>

      <text x="6" y="66" fontSize="8" fill="#8b93a3">its supplier is paid</text>
      <line x1="6" y1="76" x2="194" y2="76" stroke="#262a33" strokeWidth="1" />
      <g style={{ animation: "tutSlideR 3s ease-in-out infinite" }}>
        <rect x="96" y="69" width="14" height="14" rx="2" fill={IND_COLOR.TE} />
        <text x="103" y="80" textAnchor="middle" fontSize="8" fontWeight="700" fill="#14161a">TE</text>
      </g>
      <text x="112" y="92" fontSize="7" fill="#8fd3b6">price rises &mdash; more demand</text>
    </svg>
  );
}

function ArtFilo() {                        // placed left to right, resolved right to left
  return (
    <svg viewBox="0 0 200 84" style={{ width: "100%", height: 84 }}>
      <text x="6" y="12" fontSize="7.5" fill="#8b93a3">placed left to right</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={14 + i * 44} y={22} width="34" height="24" rx="3"
            fill="#1c1f26" stroke="#3a4152" />
          <text x={31 + i * 44} y={38} textAnchor="middle" fontSize="9" fill="#8b93a3">{i + 1}</text>
        </g>
      ))}
      {[3, 2, 1, 0].map((i, k) => (
        <circle key={i} cx={31 + i * 44} cy={58} r="4" fill="#8fd3b6"
          style={{ animation: `tutPop 2.4s ease-in-out ${k * 0.5}s infinite` }} />
      ))}
      <text x="6" y="80" fontSize="7.5" fill="#8fd3b6">resolved right to left &mdash; last in acts first</text>
    </svg>
  );
}

function ArtScoring() {
  const bars = [["5 EP", "new industry", "#8fd3b6", 78], ["1 EP", "per level, yearly", "#67e8f9", 46],
                ["10 EP", "most land", "#f5d76e", 62], ["1 EP", "per $10 left", "#a97bd6", 30]];
  return (
    <svg viewBox="0 0 200 96" style={{ width: "100%", height: 96 }}>
      {bars.map(([amt, label, col, w], i) => (
        <g key={i} style={{ animation: `tutFlow 3.2s linear ${i * 0.4}s infinite` }}>
          <rect x="52" y={8 + i * 22} width={w} height="12" rx="2" fill={col} opacity="0.85" />
          <text x="48" y={18 + i * 22} textAnchor="end" fontSize="8" fontWeight="700" fill="#e5e7eb">{amt}</text>
          <text x={58 + w} y={18 + i * 22} fontSize="7" fill="#8b93a3">{label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ---------------- Tutorial ----------------
   Each step may name a `target`, a data-tut region on screen. When that region exists
   the rest of the interface dims and the region is ringed, so the explanation is
   attached to the thing it describes rather than floating free. */
const TUTORIAL = [
  { title: "You are building a city's economy", target: "board", art: null,
    body: "Every player is a founder. You buy land, build companies on it, and sell what they produce to the districts around them. Most Entrepreneurial Points at the end of Year 3 wins.",
    points: ["3 years of 4 quarters \u2014 12 rounds in total",
             "The board is 16 districts, each with 4 plots",
             "Coloured squares in a district are its demand: what it will buy"] },

  { title: "Six industries that feed each other", target: "pots", art: ArtChain,
    body: "Every company pays OPEX each quarter to companies in other industries \u2014 its suppliers, printed on its Blueprint. Those payments are the heart of the game.",
    points: ["UT \u2192 HO \u2192 MA \u2192 HC \u2192 RE \u2192 TE \u2192 back to UT",
             "Your OPEX lands in your suppliers' industry pots",
             "Each pot is split evenly among that industry's companies",
             "So an industry nobody serves quietly piles up money"] },

  { title: "Prices move as the city is built", target: "prices", art: ArtPrices,
    body: "Build a company and you push your own industry's price DOWN \u2014 more supply. Every supplier you now pay gets pushed UP \u2014 more demand. Two steps in either direction move the price by $1.",
    points: ["A crowded industry can fall to $1, barely above recycling",
             "A neglected one can climb past $8 per unit",
             "Reading this strip is the main skill in the game"] },

  { title: "Placing workers: last in, first out", target: "tracks", art: ArtFilo,
    body: "Workers are placed left to right, but each track resolves RIGHT TO LEFT. This is the rule that catches everyone.",
    points: ["Placing early earns +1 extra action per player who joins after you",
             "But they all act before you, and may take what you wanted",
             "Placing last means acting first, with only one action"] },

  { title: "A quarter, step by step", target: "tracks", art: null,
    body: "Each of the 12 quarters runs the same five phases. You only make decisions in the first two.",
    points: ["PLANNING \u2014 place your workers",
             "ACTION \u2014 tracks resolve and you act",
             "PRODUCTION \u2014 OPEX and rent are paid automatically",
             "REVENUE \u2014 deliver production to demand icons for cash",
             "CLOSING \u2014 a Logistic Hub is placed; years end with scoring"] },

  { title: "Selling what you produce", target: "board", art: null,
    body: "In Revenue you deliver to demand icons your company can reach. Each icon pays the current market price for that industry.",
    points: ["A company reaches its own district, plus whatever its ability grants",
             "Logistic Hubs link districts \u2014 but Utilities and Retail can never use them",
             "Anything you cannot sell recycles for just $1 a unit"] },

  { title: "Your ledger", target: "ledger", art: null,
    body: "Everything you own lives here: cash, running costs, your ten discs, your hand and your companies.",
    points: ["Ten discs total \u2014 one per plot, one per company, one per loan",
             "Run out and you cannot buy, build or borrow",
             "The industry strip fills in as you enter each industry"] },

  { title: "Winning", target: "standings", art: ArtScoring,
    body: "Score steadily rather than chasing one big move. Breadth pays early, size pays late.",
    points: ["5 EP the first time you build in each industry \u2014 paid immediately",
             "1 EP per company level, once, at the first year end after you build or upgrade it",
             "10 EP for most plots, 10 EP for most districts",
             "A Megacorp is worth 8\u201322 EP, but eats companies and locks a slot"] },
];

function Tutorial({ onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = TUTORIAL[i];
  const last = i === TUTORIAL.length - 1;

  // find the region this step is about, if it is on screen
  useEffect(() => {
    const find = () => {
      if (!step.target) return setRect(null);
      const el = document.querySelector(`[data-tut="${step.target}"]`);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return setRect(null);
      // scroll it into view if it is off screen, then measure again
      if (r.top < 0 || r.bottom > window.innerHeight) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setTimeout(() => { const r2 = el.getBoundingClientRect(); setRect({ t: r2.top, l: r2.left, w: r2.width, h: r2.height }); }, 320);
        return;
      }
      setRect({ t: r.top, l: r.left, w: r.width, h: r.height });
    };
    find();
    window.addEventListener("resize", find);
    return () => window.removeEventListener("resize", find);
  }, [i]);

  // place the card clear of the highlighted region
  const card = (() => {
    const W = 380, PAD = 16;
    if (!rect) return { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(92vw,560px)" };
    const below = rect.t + rect.h + PAD;
    const room = window.innerHeight - below;
    const left = Math.min(Math.max(PAD, rect.l), window.innerWidth - W - PAD);
    if (room > 300) return { position: "fixed", left, top: below, width: W };
    if (rect.t > 320) return { position: "fixed", left, top: Math.max(PAD, rect.t - 320), width: W };
    return { position: "fixed", left: Math.min(window.innerWidth - W - PAD, rect.l + rect.w + PAD), top: PAD, width: W };
  })();

  const Art = step.art;
  return (
    <Floating>
      <style>{TUT_CSS}</style>
      {/* dim everything, or cut a hole around the region being explained */}
      {rect ? (
        <div className="tut-spot" style={{ top: rect.t - 4, left: rect.l - 4, width: rect.w + 8, height: rect.h + 8 }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(6,8,11,.78)" }} />
      )}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10001 }} />

      <div onClick={(e) => e.stopPropagation()} style={{
        ...card, zIndex: 10002, backgroundColor: "#14161a", border: "1px solid #2c5f4f",
        borderRadius: 12, padding: 18, boxShadow: "0 20px 60px rgba(0,0,0,.7)", maxHeight: "88vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#8fd3b6" }}>
            HOW TO PLAY &nbsp;{i + 1}/{TUTORIAL.length}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 11, cursor: "pointer" }}>skip</button>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "6px 0 8px" }}>{step.title}</h2>

        {Art && (
          <div style={{ backgroundColor: "#0f1115", border: "1px solid #262a33", borderRadius: 8, padding: 6, marginBottom: 10 }}>
            <Art />
          </div>
        )}

        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#c3c9d4", margin: 0 }}>{step.body}</p>

        <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
          {step.points.map((pt, k) => (
            <li key={k} style={{ display: "flex", gap: 8, fontSize: 11.5, lineHeight: 1.45, color: "#9aa3b2", marginBottom: 4 }}>
              <span style={{ color: "#2c5f4f", fontWeight: 700 }}>&#9679;</span><span>{pt}</span>
            </li>
          ))}
        </ul>

        {rect && (
          <div style={{ fontSize: 10, color: "#8fd3b6", marginTop: 9 }}>
            The highlighted area on screen is what this step is about.
          </div>
        )}

        <div style={{ display: "flex", gap: 4, margin: "14px 0 10px" }}>
          {TUTORIAL.map((_, k) => (
            <span key={k} onClick={() => setI(k)} style={{
              flex: 1, height: 3, borderRadius: 2, cursor: "pointer",
              backgroundColor: k <= i ? "#2c5f4f" : "#262a33",
            }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}
            style={{ padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              backgroundColor: "#1c1f26", color: "#8b93a3", border: "1px solid #262a33", opacity: i === 0 ? 0.35 : 1 }}>Back</button>
          <button onClick={() => (last ? onClose() : setI((v) => v + 1))}
            style={{ flex: 1, padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
              backgroundColor: "#2c5f4f", color: "#d3fcec", border: "none" }}>{last ? "Start playing" : "Next"}</button>
        </div>
      </div>
    </Floating>
  );
}

/* The rulebook and the live counters sit outside the game so they are reachable
   from every screen. Online they are mounted by OnlineApp instead, which wraps
   this component - mounting them here too would show them twice. */
export default function EntrepreneursGame({ online }) {
  return (
    <>
      {!online && <SiteChrome />}
      <GameScreens online={online} />
    </>
  );
}

function GameScreens({ online }) {
  const [screen, setScreen] = useState(online ? "play" : "setup");
  const [numBots, setNumBots] = useState(3);
  const [playerName, setPlayerName] = useState(() => { try { return localStorage.getItem("entrepreneurs_name") || ""; } catch (_) { return ""; } });
  useEffect(() => { try { localStorage.setItem("entrepreneurs_name", playerName); } catch (_) {} }, [playerName]);
  /* When this page is served by the game server, the same name the online lobby
     remembers fills in here too, so the two entry points agree. Opened straight off
     the disk there is no server to ask and localStorage above is the whole story. */
  useEffect(() => {
    if (online) return;
    let stop = false;
    fetch("/api/whoami", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json())
      .then((me) => { if (!stop && me && me.name) setPlayerName((cur) => cur || me.name); })
      .catch(() => {});
    return () => { stop = true; };
  }, [online]);
  const [localState, setLocalState] = useState(null);
  const [localLogs, setLocalLogs] = useState([]);
  // Online: state and log come from the server and are read-only here; every action is
  // dispatched through NET and comes back as a pushed state.
  const state = online ? online.state : localState;
  const logs = online ? online.logs : localLogs;
  const setState = online ? (() => {}) : setLocalState;
  const setLogs = online ? (() => {}) : setLocalLogs;
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [hover, setHover] = useState(null);
  const [epHover, setEpHover] = useState(null);
  const [pickMode, setPickMode] = useState(null); // {kind:'launch', bp, nPlots, selected:[]} | {kind:'buy', selected:[]}
  const [waitSecs, setWaitSecs] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [indTab, setIndTab] = useState("pots");
  // Personas are on by default in v13: they are one line each and give every seat
  // something of its own from Quarter 1. Still switchable on the setup screen.
  const [personas, setPersonas] = useState(true);
  const [variants, setVariants] = useState(() => normaliseVariants(null));
  const [reviewing, setReviewing] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  useEffect(() => {
    // open once for a first-time player, then never again unless they ask
    try {
      if (!localStorage.getItem("entrepreneurs_tutorial_seen")) setTutorial(true);
    } catch (_) {}
  }, []);
  const closeTutorial = () => {
    try { localStorage.setItem("entrepreneurs_tutorial_seen", "1"); } catch (_) {}
    setTutorial(false);
  };
  const startedAt = useRef(null);
  const [reSelection, setReSelection] = useState([]);
  const rngRef = useRef(null);
  const logEndRef = useRef(null);

  // Scroll the log's own container rather than calling scrollIntoView, which walks up
  // the ancestor chain and yanks the whole page (and the board) around on every entry.
  useEffect(() => {
    const end = logEndRef.current;
    if (!end) return;
    const box = end.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [logs]);

  // A click focuses the button; when the panel re-renders and that button moves, the
  // browser scrolls to chase it and the board jumps away. Removing focus after every
  // click removes the thing it chases, which is more reliable than fighting the scroll.
  useEffect(() => {
    const onPointerUp = () => {
      const el = document.activeElement;
      if (el && typeof el.blur === "function" && el.tagName === "BUTTON") el.blur();
    };
    document.addEventListener("pointerup", onPointerUp, true);
    return () => document.removeEventListener("pointerup", onPointerUp, true);
  }, []);
  useEffect(() => {
    if (state && state.phase === "placingLH" && (!pickMode || pickMode.kind !== "lh")) setPickMode({ kind: "lh", selected: [] });
  }, [state && state.phase]);

  // total time this match has been running
  useEffect(() => {
    if (!state || state.phase === "gameover") return;
    if (startedAt.current === null) startedAt.current = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [state && state.phase === "gameover"]);

  // how long the table has been waiting on the same player
  const awaitedRef = useRef(null);
  useEffect(() => {
    if (!state) return;
    const a = whoAwaited(state);
    if (a !== awaitedRef.current) { awaitedRef.current = a; setWaitSecs(0); }
    const id = setInterval(() => setWaitSecs((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  const log = useCallback((msg, pid) => {
    setLogs((L) => [...L.slice(-79), { msg, pid, id: Math.random() }]);
  }, []);

  function startGame() {
    const seedNum = Math.floor(Math.random() * 1e9);
    const chosen = playerName.trim() || "You";
    try {
      fetch("/api/whoami", { method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: chosen }) }).catch(() => {});
    } catch (_) { /* offline page: nothing to tell */ }
    const s = initGame(numBots, seedNum, [chosen], undefined, personas, variants);
    rngRef.current = mulberry32(seedNum + 777);
    setLogs([]);
    const seat = s.turnOrder.indexOf(0) + 1;
    const ord = seat === 1 ? "1st" : seat === 2 ? "2nd" : seat === 3 ? "3rd" : `${seat}th`;
    log(`New game: You vs ${numBots} bot${numBots > 1 ? "s" : ""}. You are seated ${ord} in turn order.`, null);
    if (s.phase !== "drafting") { startPlanning(s); advancePlanning(s, rngRef.current, log); }
    setState(s);
    setScreen(s.phase === "gameover" ? "gameover" : "playing");
  }

  // A spectator has no seat, so fall back to the first player purely so the read-only
  // panels have something to render. Every control is gated on `isSpectator` below.
  const isSpectator = !!(online && online.spectator);
  const human = online
    ? (state?.players.find((p) => p.id === online.seat) || state?.players[0])
    : state?.players[0];

  function handlePlaceMeeple(track) {
    if (NET) return NET.send("plan", { track });
    if (!state || state.phase !== "planning") return;
    if (state.planningQueue[0] !== human.id) return;
    const ok = placeMeeple(state, human.id, track);
    if (!ok) { log(`No open slot on ${TRACK_LABEL[track]}.`, human.id); setState({ ...state }); return; }
    log(`You place on ${TRACK_LABEL[track]}.`, human.id);
    consumePlanningTurn(state, human.id, track);
    advancePlanning(state, rngRef.current, log);
    setState({ ...state });
    if (state.phase === "gameover") setScreen("gameover");
  }

  function handleResolutionDone() {
    if (!state) return;
    humanCompleteResolutionAction(state, rngRef.current, log);
    setState({ ...state });
    if (state.phase === "gameover") setScreen("gameover");
  }

  function handleStartLaunch(bp) {
    const nPlots = SCALING[bp.ind] === "H" ? bp.lvl : 1;
    setPickMode({ kind: "launch", bp, nPlots, selected: [] });
  }
  function handleStartBuy() {
    setPickMode({ kind: "buy", selected: [] });
  }
  function handlePickPlot(plotKeyStr) {
    setPickMode((pm) => pm ? { ...pm, selected: [...pm.selected, plotKeyStr] } : pm);
  }
  function handleCancelPick() { setPickMode(null); }
  function handleConfirmPick() {
    if (!state || !pickMode) return;
    if (NET) {
      if (pickMode.kind === "launch") NET.send("act", { type: "launch", index: human.hand.indexOf(pickMode.bp), footprint: pickMode.selected });
      else if (pickMode.kind === "buy") NET.send("act", { type: "buyPlot", plot: pickMode.selected[0] });
      setPickMode(null);
      return;
    }
    if (pickMode.kind === "launch") {
      const ok = doLaunch(state, human, pickMode.bp, rngRef.current, log, pickMode.selected);
      if (!ok) log(`Couldn't launch ${pickMode.bp.name} on that selection.`, human.id);
    } else if (pickMode.kind === "buy") {
      const ok = doBuyPlot(state, human, pickMode.selected[0], log);
      if (!ok) log(`Couldn't buy that plot.`, human.id);
    }
    setPickMode(null);
    humanCompleteResolutionAction(state, rngRef.current, log);
    setState({ ...state });
    if (state.phase === "gameover") setScreen("gameover");
  }

  if (!online && screen === "setup") return (
    <>
      {tutorial && <Tutorial onClose={closeTutorial} />}
      <SetupScreen numBots={numBots} setNumBots={setNumBots} onStart={startGame}
        playerName={playerName} setPlayerName={setPlayerName} onTutorial={() => setTutorial(true)}
        personas={personas} setPersonas={setPersonas} variants={variants} setVariants={setVariants} />
    </>
  );
  if (screen === "gameover" && !reviewing) return <GameOverScreen state={state} elapsed={elapsed} onRestart={() => setScreen("setup")} onReview={() => setReviewing(true)} />;
  // Online the server owns the phase, so surface the end screen straight from state.
  if (online && state && state.phase === "gameover") {
    if (!reviewing) return <GameOverScreen state={state} online={online} elapsed={elapsed} onRestart={online.onRematch} onReview={() => setReviewing(true)} />;
  }

  if (!state) return null;
  if (state.phase === "drafting") {
    if (online) return <DraftScreen state={state} log={log} seatId={isSpectator ? null : online.seat}
      host={!isSpectator && online.host} onKick={online.onKick} onDone={null} spectator={isSpectator} />;
    return <DraftScreen state={state} log={log} onDone={() => {
      // any bots seated after you draft now, then planning begins
      if (!advanceDraft(state, log)) { startPlanning(state); advancePlanning(state, rngRef.current, log); }
      setState({ ...state });
    }} />;
  }
  const year = Math.ceil(state.quarter / 4);
  const humanMeeplesLeft = state.planningQueue.filter((id) => id === human.id).length;
  /* Whose input is the game waiting on right now? Mirrors the server's check so the
     UI only offers controls to the player who can actually act. */
  const awaitedId = whoAwaited(state);
  // who currently leads on land - shown in the standings so the two endgame awards
  // are contested visibly rather than being a surprise at scoring
  const landLead = (() => {
    const mk = (fn) => {
      const vals = state.players.map((p) => fn(state, p));
      const best = Math.max(0, ...vals);
      const set = new Set();
      if (best > 0) state.players.forEach((p, i) => { if (vals[i] === best) set.add(p.id); });
      return set;
    };
    return { plots: mk(plotCount), districts: mk(districtCount) };
  })();
  const myTurn = !online || (!isSpectator && awaitedId === online.seat);
  const awaitedName = awaitedId != null && state.players.find((p) => p.id === awaitedId)
    ? state.players.find((p) => p.id === awaitedId).name : null;
  const isHumanPlanningTurn = state.phase === "planning" && state.planningQueue[0] === human.id && myTurn;
  const isHumanResolving = state.phase === "resolving" && state.pendingHumanAction && state.pendingHumanAction.playerId === human.id && myTurn;
  const isHumanDelivering = state.phase === "delivering" && myTurn;
  const isHumanLiquidating = state.phase === "liquidating" && myTurn;
  const isHumanPlacingLH = state.phase === "placingLH" && myTurn;
  const isHumanRepaying = state.phase === "repayingLoans" && myTurn;
  const deliveringBiz = isHumanDelivering ? human.businesses.find((b) => b.id === state.deliveringBizId) : null;
  const needsREChoice = deliveringBiz && bizInd(deliveringBiz) === "RE" && !state.reChoices[deliveringBiz.id];
  const deliverInfo = deliveringBiz && !needsREChoice ? {
    ind: bizInd(deliveringBiz), level: deliveringBiz.level, reach: reachableDistricts(state, deliveringBiz),
    // how deep into a row this company may sell - see deliveryColumnCap
    cap: deliveryColumnCap(state, deliveringBiz, human),
    crossActive: bizInd(deliveringBiz) === "MA" && (state.crossSellRemaining[deliveringBiz.id] || 0) > 0,
    crossHome: bizInd(deliveringBiz) === "MA" ? footprintDistricts(state.board, deliveringBiz.footprint) : new Set(),
  } : null;

  function handleConfirmREChoice() {
    if (!state || !deliveringBiz) return;
    if (NET) { NET.send("reChoice", { bizId: deliveringBiz.id, districts: reSelection }); setReSelection([]); return; }
    state.reChoices[deliveringBiz.id] = reSelection;
    setReSelection([]);
    setState({ ...state });
  }
  function toggleReDistrict(d, max) {
    setReSelection((sel) => sel.includes(d) ? sel.filter((x) => x !== d) : sel.length < max ? [...sel, d] : sel);
  }

  function handleRepayOne() {
    if (!state) return;
    if (NET) return NET.send("repay", {});
    doRepayLoan(human, state.quarter, log);
    setState({ ...state });
  }
  function handleDoneRepaying() {
    if (!state) return;
    if (NET) return NET.send("repayDone", {});
    finishQuarterAfterRepay(state, log, rngRef.current);
    setState({ ...state });
    if (state.phase === "gameover") setScreen("gameover");
  }

  function handleConfirmLH() {
    const need = state && state.board.lhOnPlots ? 1 : 2;
    if (!state || !pickMode || pickMode.kind !== "lh" || pickMode.selected.length < need) return;
    if (NET) { NET.send("placeLH", { a: pickMode.selected[0], b: pickMode.selected[1] || null }); setPickMode(null); return; }
    doPlaceLH(state, pickMode.selected[0], pickMode.selected[1] || null, log);
    setPickMode(null);
    finishQuarterAfterLH(state, log, rngRef.current);
    setState({ ...state });
    if (state.phase === "gameover") setScreen("gameover");
  }

  function handleLiquidationContinue(proceed) {
    if (!state) return;
    if (NET) { if (proceed) NET.send("liquidateDone", {}); return; }
    if (proceed) humanLiquidationDone(state, rngRef.current, log);
    setState({ ...state });
    if (state.phase === "gameover") setScreen("gameover");
  }

  function handleDeliverClick(tileKey, rowIdx, levelIdx, cross) {
    if (!state || !deliveringBiz) return;
    if (NET) return NET.send("deliver", { tileKey, rowIdx, levelIdx, cross: !!cross });
    humanDeliver(state, human, tileKey, rowIdx, levelIdx, cross, log);
    const stillHas = (state.deliveryRemaining[deliveringBiz.id] || 0) > 0 || (state.crossSellRemaining[deliveringBiz.id] || 0) > 0;
    if (!stillHas) finishDelivery(state, log, rngRef.current);
    setState({ ...state });
    if (state.phase === "gameover") setScreen("gameover");
  }
  function handleSkipDelivery() {
    if (!state || !deliveringBiz) return;
    if (NET) return NET.send("skipDelivery", {});
    skipDelivery(state, human, deliveringBiz.id, log);
    finishDelivery(state, log, rngRef.current);
    setState({ ...state });
    if (state.phase === "gameover") setScreen("gameover");
  }

  return (
    <div className="w-full min-h-screen p-4" style={{ backgroundColor: "#0e1014", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">ENTREPRENEURS</h1>
              <button onClick={() => setTutorial(true)} title="How to play"
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ backgroundColor: "#1c1f26", border: "1px solid #2c5f4f", color: "#8fd3b6", cursor: "pointer" }}>
                How to play
              </button>
            </div>
            <MatchTracker state={state} elapsed={elapsed} />
          </div>
          <PriceTicker pm={state.pm} />
        </div>

        {tutorial && <Tutorial onClose={closeTutorial} />}
        {reviewing && (
          <div className="rounded-lg p-2 mb-3 flex items-center justify-between flex-wrap gap-2"
            style={{ backgroundColor: "#1a2e26", border: "1px solid #2c5f4f" }}>
            <span className="text-xs" style={{ color: "#d3fcec" }}>
              Reviewing the final board &mdash; the game is over, nothing can be changed.
            </span>
            <button onClick={() => setReviewing(false)}
              className="text-xs font-bold px-3 py-1 rounded"
              style={{ backgroundColor: "#2c5f4f", color: "#d3fcec" }}>
              Back to results
            </button>
          </div>
        )}
        <div className="board-grid">
          <div className="board-col">
            <div className="board-pane">
            <BoardView board={state.board} players={state.players} demand={state.demand} quarter={state.quarter} selectedPlot={selectedPlot} onSelectPlot={setSelectedPlot} selectMode={pickMode} selectCtx={{ state, player: human }} onSelectForLaunch={handlePickPlot} deliverInfo={deliverInfo} onDeliver={handleDeliverClick} onHoverBiz={(biz, x, y) => setHover(biz ? { biz, x, y } : null)} />
            <BizTooltip state={state} hover={hover} />
            <EPBreakdown hover={epHover} />
            <PlotInfo board={state.board} players={state.players} selectedPlot={selectedPlot} />

            </div>

            <div className="play-rail space-y-3">
            <TrackBoard state={state} human={human} />

            {isHumanPlanningTurn && (
              <div className="rounded-lg p-3" style={{ backgroundColor: "#1a2420", border: "1px solid #2c5f4f" }}>
                <div className="text-xs font-bold mb-2" style={{ color: "#d3fcec" }}>Place a meeple ({humanMeeplesLeft} left this quarter)</div>
                <div className="flex flex-wrap gap-2">
                  {["raise_capital", "ma", "rd"].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1">
                      <button onClick={() => handlePlaceMeeple(t)} disabled={!state.tracks[t].includes(null)}
                        className="text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>
                        {TRACK_LABEL[t]}
                      </button>
                      <Help text={TRACK_HELP[t]} />
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1">
                    <button onClick={() => handlePlaceMeeple("board_meeting")}
                      disabled={!state.tracks.board_meeting.some((s, i) => s === null && (i === 0 || state.ipoTileClaimed))}
                      className="text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>
                      Board Meeting (both meeples)
                    </button>
                    <Help text={TRACK_HELP.board_meeting} />
                  </span>
                </div>
                {!state.ipoTileClaimed && (
                  <div className="text-[10px] text-gray-500 mt-1.5">
                    Board Meeting seats two players, but the second seat is under the IPO tile until the first Megacorp is formed.
                  </div>
                )}
              </div>
            )}
            {isHumanResolving && pickMode && (
              <div className="rounded-lg p-3" style={{ backgroundColor: "#1a2420", border: "1px solid #2c5f4f" }}>
                <div className="text-xs font-bold mb-1" style={{ color: "#d3fcec" }}>
                  {pickMode.kind === "launch" ? `Placing ${pickMode.bp.name} \u2014 select ${pickMode.selected.length}/${pickMode.nPlots} plot(s)` : `Pick a plot to buy \u2014 ${pickMode.selected.length}/1 selected`}
                </div>
                <div className="text-[10px] text-gray-400 mb-2">
                  Click highlighted plots on the board above.
                  {pickMode.kind === "launch" && pickMode.nPlots > 1 &&
                    " Plots must share an edge — corners do not count."}
                </div>
                {computeEligiblePlots(state.board, pickMode, { state, player: human }).size === 0 && pickMode.selected.length < (pickMode.kind === "buy" ? 1 : pickMode.nPlots) && (
                  <div className="text-[10px] text-red-400 mb-2">No more eligible adjacent plots — this cluster can't be completed here. Cancel and try elsewhere, or buy more land first.</div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleConfirmPick} disabled={pickMode.selected.length < (pickMode.kind === "buy" ? 1 : pickMode.nPlots)}
                    className="text-xs font-bold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#2c5f4f", color: "#d3fcec" }}>Confirm</button>
                  <button onClick={handleCancelPick} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>Cancel</button>
                </div>
              </div>
            )}
            {isHumanResolving && !pickMode && <ActionPanel state={state} human={human} rng={rngRef.current} log={log} onDone={handleResolutionDone} onStartLaunch={handleStartLaunch} onStartBuy={handleStartBuy} />}
            {isHumanDelivering && needsREChoice && (
              <div className="rounded-lg p-3" style={{ backgroundColor: "#1a2420", border: "1px solid #2c5f4f" }}>
                <div className="text-xs font-bold mb-1" style={{ color: "#d3fcec" }}>
                  {deliveringBiz.bp.name} may reach {deliveringBiz.level} extra district{deliveringBiz.level > 1 ? "s" : ""} this delivery — pick {reSelection.length}/{deliveringBiz.level}
                </div>
                <div className="text-[10px] text-gray-400 mb-2">Retail may sell to any district(s) beyond its own, one per level. Choose which.</div>
                <div className="flex flex-wrap gap-1.5 mb-2" style={{ maxHeight: 160, overflowY: "auto" }}>
                  {allDistrictKeys(state.board).filter((d) => !footprintDistricts(state.board, deliveringBiz.footprint).has(d)).map((d) => {
                    const tname = state.board.tiles[d];
                    const chosen = reSelection.includes(d);
                    return (
                      <button key={d} onClick={() => toggleReDistrict(d, deliveringBiz.level)}
                        className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: chosen ? "#1a4a2e" : "#1c1f26", border: chosen ? "1px solid #4ade80" : "1px solid #33384355", color: "#e5e7eb" }}>
                        {tname}
                      </button>
                    );
                  })}
                </div>
                <button onClick={handleConfirmREChoice} disabled={reSelection.length < 1 && deliveringBiz.level > 0}
                  className="text-xs font-bold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#2c5f4f", color: "#d3fcec" }}>
                  Confirm reach
                </button>
              </div>
            )}
            {isHumanDelivering && deliveringBiz && !needsREChoice && (
              <div className="rounded-lg p-3" style={{ backgroundColor: "#1a2420", border: "1px solid #2c5f4f" }}>
                <div className="text-xs font-bold mb-1" style={{ color: "#d3fcec" }}>
                  Delivering {deliveringBiz.bp.name} ({bizInd(deliveringBiz)} L{deliveringBiz.level}) — {state.deliveryRemaining[deliveringBiz.id]} unit(s) left
                  {bizInd(deliveringBiz) === "MA" && (state.crossSellRemaining[deliveringBiz.id] || 0) > 0 && <span> &middot; <span style={{ color: "#f5a623" }}>{state.crossSellRemaining[deliveringBiz.id]} cross-sell unit(s)</span></span>}
                </div>
                {state.hoBonusPaid && state.hoBonusPaid[deliveringBiz.id] > 0 && (
                  <div className="text-[10px] mb-1" style={{ color: "#8fd3b6" }}>
                    Hospitality bonus: {state.hoBonusPaid[deliveringBiz.id]} unit(s) already sold to neighbouring businesses/hubs.
                  </div>
                )}
                {(() => {
                  const slots = eligibleSlotsFor(state, deliveringBiz).length;
                  const rate = exchangeRate(state, deliveringBiz);
                  const capacity = slots * rate;
                  const left = state.deliveryRemaining[deliveringBiz.id] || 0;
                  if (capacity >= left) return null;
                  const ind = bizInd(deliveringBiz);
                  const vertical = SCALING[ind] === "V";
                  const onLH = deliveringBiz.footprint.some((pk) => plotHasLH(state.board, pk));
                  const canLH = ind !== "UT" && ind !== "RE";
                  const why = ind === "HC" ? "Healthcare already reaches the whole hub network."
                    : !canLH ? `${ind} cannot use Logistic Hubs — its reach grows only with level.`
                    : onLH ? "It is on the hub network; more hubs will open more districts."
                    : "It is not touching a Logistic Hub, so it can only sell in its own district.";
                  return (
                    <div className="rounded p-1.5 mb-2" style={{ backgroundColor: "#2a2415", border: "1px solid #7a6a3f" }}>
                      <div className="text-[10px]" style={{ color: "#f5d76e" }}>
                        Only {capacity} of {left} unit{left === 1 ? "" : "s"} can be sold: {slots} open demand icon{slots === 1 ? "" : "s"} in reach{rate > 1 ? ` × ${rate} per icon` : ""}.
                      </div>
                      <div className="text-[9px] text-gray-400 mt-0.5">
                        {why}{vertical ? " Single-plot industries stay in one district unless a hub links them out." : ""} The rest recycles at $1/unit.
                      </div>
                    </div>
                  );
                })()}
                <div className="text-[10px] text-gray-400 mb-2">
                  Click a highlighted demand cell (white border) to sell there.
                  {bizInd(deliveringBiz) === "MA" && <span> Amber-bordered cells are cross-sell slots — Manufacturing may fill another industry's demand within its own footprint.</span>}
                  {" "}Leftover recycles at $1/unit.
                </div>
                <button onClick={handleSkipDelivery} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>
                  Recycle remainder &amp; move on
                </button>
              </div>
            )}
            {isHumanLiquidating && <LiquidationPanel state={state} human={human} log={log} onContinue={handleLiquidationContinue} />}
            {isHumanPlacingLH && pickMode && pickMode.kind === "lh" && (
              <div className="rounded-lg p-3" style={{ backgroundColor: "#0f2530", border: "1px solid #22D3EE" }}>
                <div className="text-xs font-bold mb-1" style={{ color: "#67e8f9" }}>
                  You&rsquo;re 1st in turn order &mdash; place this quarter&rsquo;s Logistic Hub
                  ({pickMode.selected.length}/{state.board.lhOnPlots ? 1 : 2} plot{state.board.lhOnPlots ? "" : "s"} picked)
                </div>
                {state.board.lhOnPlots ? (
                  <div className="text-[10px] text-gray-400 mb-2">
                    Click one empty plot. Companies orthogonally beside it join the hub network, and the network
                    reaches this district for everyone already on it.
                    {pickMode.selected.length === 1 && (() => {
                      const n = orthOf(state.board, pickMode.selected[0]).length;
                      return <span style={{ color: n ? "#8fd3b6" : "#fca5a5" }}> That plot connects {n} neighbouring plot{n === 1 ? "" : "s"}.</span>;
                    })()}
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-400 mb-2">Click two adjacent plots on the board to place the hub between them.</div>
                )}
                {!state.board.lhOnPlots && pickMode.selected.length === 1 && computeEligiblePlots(state.board, pickMode).size === 0 && (
                  <div className="text-[10px] text-red-400 mb-2">That plot&rsquo;s neighbours all already have a hub &mdash; reset and pick a different starting plot.</div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleConfirmLH} disabled={pickMode.selected.length < (state.board.lhOnPlots ? 1 : 2)}
                    className="text-xs font-bold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#0e5f6f", color: "#d3fcec" }}>Confirm placement</button>
                  {pickMode.selected.length > 0 && (
                    <button onClick={() => setPickMode({ kind: "lh", selected: [] })} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>Reset selection</button>
                  )}
                </div>
              </div>
            )}
            {!isHumanPlanningTurn && !isHumanResolving && !isHumanDelivering && !isHumanLiquidating && !isHumanPlacingLH && !isHumanRepaying && (
              <div className="rounded-lg p-3" style={{ backgroundColor: "#14161a", border: "1px solid #262a33" }}>
                <div className="text-xs italic" style={{ color: awaitedName ? "#8fd3b6" : "#6b7280" }}>
                  {awaitedName ? `Waiting for ${awaitedName}\u2026` : "Waiting on other players\u2026"}
                </div>
                {/* If someone has dropped out, the host can hand their seat to a bot so the
                    table is not stuck waiting on a browser that is never coming back. */}
                {online && online.host && awaitedId != null && awaitedId !== online.seat
                  && state.players.find((p) => p.id === awaitedId && p.isHuman) && (
                  <div className="mt-2 pt-2" style={{ borderTop: "1px solid #262a33" }}>
                    {waitSecs >= 20 ? (
                      <div className="text-[10px] text-gray-500 mb-1.5">
                        {awaitedName} has not acted for {waitSecs}s. If they have disconnected you can hand their seat to a bot.
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-600 mb-1.5">Host controls</div>
                    )}
                    <button onClick={() => {
                        if (window.confirm(`Replace ${awaitedName} with a bot for the rest of the game? They will not be able to rejoin.`)) online.onKick(awaitedId);
                      }}
                      className="text-[10px] px-2 py-1 rounded"
                      style={{ backgroundColor: "#2a2415", border: "1px solid #7a6a3f", color: "#f5d76e", cursor: "pointer" }}>
                      Replace {awaitedName} with a bot
                    </button>
                  </div>
                )}
              </div>
            )}
            {isHumanRepaying && (
              <div className="rounded-lg p-3" style={{ backgroundColor: "#0f2530", border: "1px solid #22D3EE" }}>
                <div className="text-xs font-bold mb-1" style={{ color: "#67e8f9" }}>
                  Year-end: you may repay loan discs at ${LOAN_REPAY_RATE[state.quarter]} each — {human.discsInBank} disc{human.discsInBank === 1 ? "" : "s"} outstanding (−{human.discsInBank * 5} EP if left unpaid)
                </div>
                <div className="text-[10px] text-gray-400 mb-2">You have ${Math.round(human.cash)} cash.</div>
                <div className="flex gap-2">
                  <button onClick={handleRepayOne} disabled={human.discsInBank <= 0 || human.cash < LOAN_REPAY_RATE[state.quarter]}
                    className="text-xs font-bold px-3 py-1.5 rounded disabled:opacity-30" style={{ backgroundColor: "#0e5f6f", color: "#d3fcec" }}>
                    Repay 1 disc (−${LOAN_REPAY_RATE[state.quarter]})
                  </button>
                  <button onClick={handleDoneRepaying} className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: "#20232c", color: "#e5e7eb" }}>
                    Done
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-lg p-3" style={{ backgroundColor: "#14161a", border: "1px solid #262a33" }}>
              <div className="flex items-center justify-between mb-2">
                <span data-tut="ledger" className="text-xs font-bold text-gray-300 uppercase tracking-wide flex items-center gap-1">Your player board <Help text="Your ten discs are your whole footprint: one per plot you own, one per company (a Megacorp HQ still holds its own), and one for each outstanding loan. Run out and you cannot buy, build or borrow until you free one up." /></span>
                <span className="text-[9px] font-mono text-gray-600">{human.name}</span>
              </div>

              {human.persona && PERSONAS[human.persona] && (
                <div className="rounded-md p-2 mb-2" style={{
                  backgroundColor: "#1c1f26",
                  border: `1px solid ${IND_COLOR[PERSONAS[human.persona].ind]}`,
                }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Chip color={IND_COLOR[PERSONAS[human.persona].ind]}>{PERSONAS[human.persona].ind}</Chip>
                    <span className="text-xs font-bold text-gray-100">{PERSONAS[human.persona].name}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 leading-snug">{PERSONAS[human.persona].blurb}</div>
                </div>
              )}

              {/* Each industry pays 5 EP once per game, the first year-end a company of
                  that type is active. Filled = already banked, outline = still available. */}
              <div className="flex items-center gap-1 mb-2">
                {INDUSTRIES.map((ind) => {
                  const done = (human.industriesScored || []).includes(ind);
                  const live = activeBiz(human).some((b) => bizInd(b) === ind);
                  return (
                    <div key={ind} title={done ? `${ind}: 5 EP already scored` : live ? `${ind}: scores 5 EP at the next year end` : `${ind}: 5 EP available - build one`}
                      className="flex-1 rounded text-center" style={{
                        padding: "3px 0", fontSize: 9, fontWeight: 800, letterSpacing: 0.3,
                        backgroundColor: done ? IND_COLOR[ind] : "transparent",
                        color: done ? "#0e1014" : live ? IND_COLOR[ind] : "#4b5563",
                        border: `1px ${done ? "solid" : live ? "dashed" : "solid"} ${done || live ? IND_COLOR[ind] : "#2b3040"}`,
                      }}>
                      {ind}
                    </div>
                  );
                })}
              </div>
              <div className="text-[9px] text-gray-600 mb-2">
                {(human.industriesScored || []).length}/6 industry bonuses banked
                <span className="text-gray-700"> &middot; 5 EP each, once per game</span>
              </div>

              {(() => {
                const opex = committedOpex(human);
                const after = human.cash - opex;
                const discs = human.discsInBank;
                const tiles = [
                  { label: "CASH", value: `$${Math.round(human.cash)}`, color: "#8fd3b6" },
                  { label: "OPEX / QTR", value: `$${Math.round(opex)}`, color: "#f3b0a5" },
                  { label: "AFTER OPEX", value: `${after < 0 ? "\u2212" : ""}$${Math.abs(Math.round(after))}`, color: after < 0 ? "#fca5a5" : "#e5e7eb" },
                  { label: "LOAN DISCS", value: `${discs}`, sub: discs ? `\u2212${discs * 5} EP` : "none", color: discs ? "#fca5a5" : "#6b7280" },
                  { label: "DISCS USED", value: `${discsUsed(state, human)}/${DISCS_PER_PLAYER}`,
                    sub: `${plotsOwned(state, human)} land \u00b7 ${activeBiz(human).length} biz \u00b7 ${discs} loan`,
                    color: discsFree(state, human) <= 0 ? "#fca5a5" : discsFree(state, human) <= 2 ? "#f5a623" : "#e5e7eb" },
                ];
                return (
                  <div className="flex gap-1.5 mb-3">
                    {tiles.map((t) => (
                      <div key={t.label} className="flex-1 rounded p-1.5" style={{ backgroundColor: "#1c1f26", border: "1px solid #2b3040" }}>
                        <div className="text-[8px] font-bold text-gray-500 tracking-wide mb-0.5">{t.label}</div>
                        <div className="text-sm font-bold font-mono leading-tight" style={{ color: t.color }}>{t.value}</div>
                        {t.sub && <div className="text-[8px] font-mono text-gray-600">{t.sub}</div>}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {committedOpex(human) > human.cash && (
                <div className="rounded p-1.5 mb-3" style={{ backgroundColor: "#2a1a1a", border: "1px solid #7a3f3f" }}>
                  <div className="text-[9px] font-bold" style={{ color: "#fca5a5" }}>
                    Short ${Math.round(committedOpex(human) - human.cash)} for next quarter's OPEX &mdash; raise cash or you'll be forced to liquidate.
                  </div>
                </div>
              )}

              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                Hand &mdash; {human.hand.length}/5
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {human.hand.map((bp, i) => <BPCard key={i} bp={bp} disabled small />)}
                {!human.hand.length && <span className="text-xs text-gray-500 italic">Empty.</span>}
              </div>

              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                Portfolio &mdash; {activeBiz(human).length}/5
              </div>
              <div className="flex flex-wrap gap-2">
                {activeBiz(human).map((b) => {
                  const canProd = businessCanProduce(state, b);
                  return (
                    <div key={b.id} className="rounded-md p-2" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[b.bp.ind]}55`, width: 148, opacity: canProd ? 1 : 0.5 }}
                      onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover({ biz: b, x: r.right, y: r.top }); }}
                      onMouseLeave={() => setHover(null)}>
                      <div className="flex items-center justify-between mb-1">
                        <Chip color={IND_COLOR[b.bp.ind]}>{b.bp.ind}</Chip>
                        <span className="text-[10px] font-mono text-gray-400">Lvl {b.level}{b.upgraded ? " \u2191" : ""}</span>
                      </div>
                      <div className="text-xs font-semibold text-gray-100 leading-tight mb-1" style={{ minHeight: 28 }}>{b.bp.name}</div>
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span style={{ color: "#f3b0a5" }}>opex ${bizOpex(b)}</span>
                        <span className="text-gray-400">prod {bizProd(b)}</span>
                      </div>
                      {b.epOnCard > 0 && (
                        <div className="flex items-center gap-1 mt-1 rounded px-1 py-0.5" style={{ backgroundColor: "#1a2420", border: "1px solid #2c5f4f" }}>
                          <span className="text-[9px] font-bold" style={{ color: "#8fd3b6" }}>{b.epOnCard} EP</span>
                          <span className="text-[8px] text-gray-500">on card &mdash; vests if upgraded/sold</span>
                        </div>
                      )}
                      {!canProd && <div className="text-[9px] text-red-400 mt-0.5">Land unowned &mdash; can't produce</div>}
                    </div>
                  );
                })}
                {!activeBiz(human).length && <span className="text-xs text-gray-500 italic">None yet.</span>}
              </div>
            </div>
            </div>
          </div>

          <div className="side-col space-y-3">
            <div className="rounded-lg p-3" style={{ backgroundColor: "#14161a", border: "1px solid #262a33" }}>
              <div data-tut="standings" className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-1">Standings <Help text="Score = 1 EP per company level, taken once at the first year end after you build or upgrade it, plus 5 EP the moment you first build in each industry (once per game). Plus endgame bonuses for most plots and most districts, $10 = 1 EP, and -5 EP per unpaid loan disc. A tie is settled by money, then by fewer loan discs. Hover a player for the full breakdown." /></div>
              <div className="space-y-2">
                {[...state.players].sort((a, b) => epTotal(b) - epTotal(a)).map((p) => {
                  const onCards = p.businesses.reduce((s2, b) => s2 + (b.epOnCard || 0), 0);
                  return (
                    <div key={p.id} className="rounded p-1.5" style={{ backgroundColor: "#1c1f26" }}
                      onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setEpHover({ p, x: r.left, y: r.top }); }}
                      onMouseLeave={() => setEpHover(null)}>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.id] }} />
                          <span className="font-semibold text-gray-200">{p.name}</span>
                          {state.turnOrder[0] === p.id && <span className="text-[8px] font-mono text-gray-500">1st</span>}
                        </div>
                        <div className="font-mono font-bold" style={{ color: "#8fd3b6" }}>{epTotal(p).toFixed(0)} EP</div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 mt-0.5">
                        <span>${Math.round(p.cash)} &middot; {activeBiz(p).length}biz &middot; {p.hand.length}BP &middot; {p.discsInBank}disc</span>
                        <span>{p.epBank.toFixed(0)} banked{onCards > 0 ? ` + ${onCards} on cards` : ""}</span>
                      </div>
                      {p.persona && PERSONAS[p.persona] && (
                        <div className="text-[9px] mt-0.5" style={{ color: IND_COLOR[PERSONAS[p.persona].ind] }}
                          title={PERSONAS[p.persona].blurb}>
                          {PERSONAS[p.persona].name}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[9px] font-mono mt-0.5">
                        <span title="Plots owned - most at game end scores The Real-Estate Mogul"
                          style={{ color: landLead.plots.has(p.id) ? "#f5d76e" : "#6b7280" }}>
                          {landLead.plots.has(p.id) ? "\u265B " : ""}{plotCount(state, p)} plots
                        </span>
                        <span style={{ color: "#3a4152" }}>|</span>
                        <span title="Districts you have a presence in - most at game end scores The Omnipresent"
                          style={{ color: landLead.districts.has(p.id) ? "#f5d76e" : "#6b7280" }}>
                          {landLead.districts.has(p.id) ? "\u265B " : ""}{districtCount(state, p)} districts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[9px] text-gray-600 mt-1.5">Hover a player for a full scoring breakdown.</div>
            </div>

            <div className="rounded-lg p-3" style={{ backgroundColor: "#14161a", border: "1px solid #262a33" }}>
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-1">The Bank <Help text="Loans give $20 for one disc and cost 5 EP each at game end; you may buy discs back at year end for $30/$35/$40. Distressed companies sit here until someone renovates them via M&amp;A - Buy." /></div>
              <div className="text-[9px] text-gray-500 mb-1.5">Loan discs (−5 EP each at game end):</div>
              <div className="space-y-1 mb-2">
                {state.players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-[10px] rounded p-1" style={{ backgroundColor: "#1c1f26" }}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.id] }} />
                      <span className="text-gray-300">{p.name}</span>
                    </div>
                    <span className="font-mono text-gray-400">{p.discsInBank} disc{p.discsInBank === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-gray-500 mb-1.5">Distressed companies (renovate via M&A → Buy):</div>
              <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 120 }}>
                {state.players.flatMap((p) => p.businesses.filter((b) => b.distressed).map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-[9px] rounded p-1" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[b.bp.ind]}44` }}>
                    <span className="text-gray-300">{b.bp.name}
                      <span className="font-mono text-gray-500"> &middot; {b.footprint.map((pk) => plotLabel(state.board, pk)).join(" + ")}</span>
                    </span>
                    <span className="font-mono text-gray-500">{b.bp.ind} L{b.level}</span>
                  </div>
                )))}
                {!state.players.some((p) => p.businesses.some((b) => b.distressed)) && <div className="text-[9px] text-gray-600 italic">None yet.</div>}
              </div>
            </div>

            {/* Pots, Decks and Abilities are all reference material for the same six
                industries, so they share one frame and one tab bar instead of three
                tall panels competing for space. */}
            <div className="rounded-lg p-3" style={{ backgroundColor: "#14161a", border: "1px solid #262a33" }}>
              <div className="flex items-center gap-1 mb-2">
                {[["pots", "Pots"], ["decks", "Decks"], ["abil", "Abilities"]].map(([k, label]) => (
                  <button key={k} onClick={() => setIndTab(k)}
                    className="flex-1 rounded text-xs font-bold uppercase tracking-wide"
                    style={{ padding: "4px 0", border: "1px solid #262a33", cursor: "pointer",
                      backgroundColor: indTab === k ? "#2c5f4f" : "#1c1f26",
                      color: indTab === k ? "#d3fcec" : "#8b93a3" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ display: indTab === "pots" ? "block" : "none" }}>
              <div data-tut="pots" className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-1">Industry Pots <Help text="When a company pays OPEX, that money (minus rent) lands in its suppliers' pots. Each quarter every pot is split evenly among the active businesses of that industry \u2014 one equal share each, whatever their size \u2014 and any remainder rides forward. A pot with nobody to pay keeps growing, so supplying an industry nobody builds is very lucrative." /></div>
              <div className="text-[9px] text-gray-500 mb-1.5">Supplier OPEX collects here, then splits among that industry's active businesses by level.</div>
              <div className="grid grid-cols-2 gap-1.5">
                {INDUSTRIES.map((ind) => {
                  const pot = state.pots ? state.pots[ind] : 0;
                  const { n, levels } = potRecipients(state, ind);
                  return (
                    <div key={ind} className="rounded p-1.5" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[ind]}44` }}>
                      <div className="flex items-center justify-between">
                        <Chip color={IND_COLOR[ind]}>{ind}</Chip>
                        <span className="text-[11px] font-bold font-mono" style={{ color: pot > 0 ? "#8fd3b6" : "#4b5563" }}>${pot.toFixed(0)}</span>
                      </div>
                      <div className="text-[8px] font-mono text-gray-500 mt-0.5">
                        {n ? `${n} biz \u00b7 ${levels} lvl` : "no takers \u2014 carries over"}
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
              <div style={{ display: indTab === "decks" ? "block" : "none" }}>
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-1">Industry Decks <Help text={hasVariant(state, "orderedDecks")
                ? "Six separate decks, each ordered level 1 on top through level 3 at the bottom. The top card is always public, so RESEARCH is a real choice: you pick which deck to draw from."
                : "Six separate decks, each shuffled whole, so any level can be on top. The top card is always public, so RESEARCH is a real choice: you pick which deck to draw from."} /></div>
              <div className="grid grid-cols-2 gap-1.5">
                {INDUSTRIES.map((ind) => {
                  const deck = state.decks[ind];
                  const top = deck && deck[0];
                  return (
                    <div key={ind} className="rounded p-1.5" style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[ind]}55` }}>
                      <div className="flex items-center justify-between">
                        <Chip color={IND_COLOR[ind]}>{ind}</Chip>
                        <span className="text-[8px] font-mono text-gray-500">{deck ? deck.length : 0} left</span>
                      </div>
                      {top ? (
                        <>
                          <div className="text-[9px] text-gray-300 leading-tight mt-0.5">{top.name}</div>
                          <div className="text-[8px] font-mono text-gray-500 leading-tight">
                            L{top.lvl} &middot; set ${top.setup} &middot; opex ${top.opex} &middot; prod {top.prod}
                          </div>
                          <div className="text-[8px] font-mono leading-tight" style={{ color: "#a5b4cf" }}>
                            {top.deps.map((d) => `${d.ind} $${d.val}`).join(" \u00b7 ")}
                          </div>
                        </>
                      ) : <div className="text-[9px] text-gray-600 italic mt-0.5">Empty</div>}
                    </div>
                  );
                })}
              </div>
            </div>

              <div style={{ display: indTab === "abil" ? "block" : "none" }}>
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2">Abilities</div>
              <div className="space-y-1.5">
                {INDUSTRIES.map((ind) => (
                  <div key={ind} className="text-[10px] leading-snug">
                    <Chip color={IND_COLOR[ind]}>{ind}</Chip> <span className="text-gray-400">{IND_ABILITY[ind]}</span>
                  </div>
                ))}
              </div>
              </div>
            </div>

            {/* The Megacorp list is short; the log shares its frame so the column
                keeps a single, full-width block instead of two stubby ones. */}
            <div className="rounded-lg p-3 mega-log" style={{ backgroundColor: "#14161a", border: "1px solid #262a33" }}>

              <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-1">Megacorp tiles ({state.megacorpPool.length} left) <Help text="Merge the exact combination of company levels shown to claim a tile. One of the merged companies becomes the HQ: it keeps its building and your disc, stops trading, and siphons $5 from the pot of every industry it touches. The rest go distressed. Each Megacorp permanently locks one of your five company slots." /></div>
              <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 140 }}>
                {state.megacorpPool.map(([name, combo, ep], i) => (
                  <div key={i} className="text-[10px] font-mono flex justify-between items-center gap-2 rounded px-1 py-0.5" style={{ backgroundColor: "#1c1f26" }}>
                    <span className="text-gray-300">{name}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {Object.entries(combo).map(([l, k], j) => (
                        <span key={j} className="flex items-center gap-0.5 text-gray-400">
                          {k}&times;<LevelBadge level={+l} />
                        </span>
                      ))}
                      <span style={{ color: "#8fd3b6", fontWeight: 700 }}>{ep}EP</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-gray-600 mt-1">{state.ipoTileClaimed ? "IPO tile taken \u2014 both Board Meeting seats are open." : "IPO tile: +5 EP to whoever forms the first Megacorp."}</div>
              <div style={{ height: 1, backgroundColor: "#262a33", margin: "10px 0" }} />

              <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2">Log</div>
              <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 220 }}>
                {logs.map((l) => (
                  <div key={l.id} className="text-[10px] font-mono leading-snug" style={{ color: l.pid !== null ? PLAYER_COLORS[l.pid] : "#8b93a3" }}>
                    {l.msg}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupScreen({ numBots, setNumBots, onStart, playerName, setPlayerName, onTutorial, personas, setPersonas, variants, setVariants }) {
  const [showVariants, setShowVariants] = useState(false);
  const variantsOn = VARIANTS.filter((v) => variants[v.key]);
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0e1014" }}>
      <div className="max-w-md w-full rounded-xl p-6" style={{ backgroundColor: "#14161a", border: "1px solid #262a33" }}>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">ENTREPRENEURS</h1>
        <p className="text-sm text-gray-400 mb-6">Build, produce, sell, score — 3 fiscal years, solo vs bots.</p>
        {onTutorial && (
          <button onClick={onTutorial} className="w-full mb-5 py-2 rounded-md text-xs font-semibold"
            style={{ backgroundColor: "#1c1f26", border: "1px solid #2c5f4f", color: "#8fd3b6" }}>
            New here? Read How to play first
          </button>
        )}
        <div className="mb-5">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2">Your name</div>
          <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="You" maxLength={16}
            className="w-full rounded-md px-3 py-2 text-sm"
            style={{ backgroundColor: "#1c1f26", border: "1px solid #262a33", color: "#e5e7eb", outline: "none" }} />
        </div>
        <div className="mb-5">
          <button onClick={() => setPersonas(!personas)}
            className="w-full rounded-md px-3 py-2 text-left"
            style={{ backgroundColor: "#1c1f26", border: `1px solid ${personas ? "#2c5f4f" : "#262a33"}` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: personas ? "#8fd3b6" : "#8b93a3" }}>
                Personas {personas ? "ON" : "OFF"}
              </span>
              <span className="text-[10px]" style={{ color: personas ? "#8fd3b6" : "#6b7280" }}>
                {personas ? "\u2713" : ""}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              Deal each player a random specialist power, one per industry.
            </div>
          </button>

          {/* The same variants the online host can set. Folded away by default, so
              the standard game stays one click from the front door. */}
          <button onClick={() => setShowVariants((v) => !v)}
            className="w-full text-left text-[11px] mt-2 px-1"
            style={{ background: "none", border: "none", color: "#8b93a3", cursor: "pointer" }}>
            {showVariants ? "\u25be" : "\u25b8"} Rule variants
            {variantsOn.length ? <span style={{ color: "#8fd3b6" }}> &mdash; {variantsOn.length} on</span>
              : <span style={{ color: "#4b5563" }}> &mdash; standard rules</span>}
          </button>
          {showVariants && VARIANTS.map((v) => (
            <button key={v.key} onClick={() => setVariants({ ...variants, [v.key]: !variants[v.key] })}
              className="w-full rounded-md px-3 py-2 text-left mt-1.5"
              style={{ backgroundColor: "#1c1f26", border: `1px solid ${variants[v.key] ? "#2c5f4f" : "#262a33"}` }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold" style={{ color: variants[v.key] ? "#8fd3b6" : "#8b93a3" }}>{v.name}</span>
                <span className="text-[10px] shrink-0" style={{ color: variants[v.key] ? "#8fd3b6" : "#4b5563" }}>
                  {variants[v.key] ? "ON \u2713" : "OFF"}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5" style={{ lineHeight: 1.4 }}>{v.blurb}</div>
            </button>
          ))}
        </div>
        <div className="mb-6">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-2">Opponents</div>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button key={n} onClick={() => setNumBots(n)}
                className="flex-1 py-2 rounded-md text-sm font-semibold transition"
                style={{ backgroundColor: numBots === n ? "#2c5f4f" : "#1c1f26", color: numBots === n ? "#d3fcec" : "#9ca3af", border: "1px solid #262a33" }}>
                {n} bot{n > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-1.5">
          {INDUSTRIES.map((ind) => (<Chip key={ind} color={IND_COLOR[ind]}>{IND_NAME[ind]}</Chip>))}
        </div>
        <button onClick={onStart} className="w-full py-2.5 rounded-md text-sm font-bold" style={{ backgroundColor: "#2c5f4f", color: "#d3fcec" }}>
          Start Game
        </button>
      </div>
    </div>
  );
}

/* ---------------- Help affordance ----------------
   A small "?" the player can tap or hover for a plain-language explanation.
   Used across the panels so a first-timer can learn the game in place. */
export function Floating({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
function Help({ text, label }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const show = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const W = 250, PAD = 8;
    const vw = window.innerWidth, vh = window.innerHeight;
    // keep the panel inside the viewport, flipping to the left of the icon if needed
    const x = Math.min(Math.max(PAD, r.right + 8), vw - W - PAD);
    const y = Math.min(Math.max(PAD, r.top - 4), vh - 120);
    setPos({ x, y });
    setOpen(true);
  };
  return (
    <span style={{ display: "inline-flex" }}>
      <button
        onClick={(e) => { e.stopPropagation(); if (open) setOpen(false); else show(e); }}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        aria-label={label || "Help"}
        style={{
          width: 13, height: 13, borderRadius: "50%", lineHeight: "11px",
          fontSize: 9, fontWeight: 700, color: "#8b93a3",
          backgroundColor: "#1c1f26", border: "1px solid #3a4152",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "help", flexShrink: 0,
        }}
      >?</button>
      {open && (
        <Floating><span style={{
          position: "fixed", left: pos.x, top: pos.y, zIndex: 9999, width: 250,
          backgroundColor: "#0e1014", border: "1px solid #3a4152", borderRadius: 6,
          padding: "7px 9px", fontSize: 10, lineHeight: 1.45, color: "#d1d5db",
          boxShadow: "0 6px 20px rgba(0,0,0,0.6)", pointerEvents: "none",
          fontWeight: 400, textTransform: "none", letterSpacing: 0,
        }}>{text}</span></Floating>
      )}
    </span>
  );
}

/* ---------------- Starting BP draft ----------------
   Seating is random and the draft runs in reverse seat order, so the last
   player picks first. Bots have already taken theirs; this is the human's turn. */
function DraftScreen({ state, log, onDone, seatId, host, onKick, spectator }) {
  // A spectator holds no seat, so fall back to any human just to have something to
  // render; the draft controls below are hidden for them anyway.
  const human = (seatId != null ? state.players.find((p) => p.id === seatId) : null)
             || state.players.find((p) => p.isHuman)
             || state.players[0];
  const need = (state.draftCounts && state.draftCounts[human.id] != null)
    ? state.draftCounts[human.id] : (state.humanDraftCount || 0);
  const myTurn = !spectator && (seatId == null || state.awaitingPlayerId === seatId);
  const waitingFor = !myTurn && state.awaitingPlayerId != null
    ? (state.players.find((p) => p.id === state.awaitingPlayerId) || {}).name : null;
  const [, force] = useState(0);
  const picked = human.hand.length;
  const seat = state.turnOrder.indexOf(human.id) + 1;
  const ord = seat === 1 ? "1st" : seat === 2 ? "2nd" : seat === 3 ? "3rd" : `${seat}th`;

  function take(ind) {
    if (!myTurn) return;
    if (picked >= need) return;
    if (!state.decks[ind] || !state.decks[ind].length) return;
    if (NET) return NET.send("draft", { ind });
    const card = state.decks[ind].shift();
    human.hand.push(card);
    state.draftTaken = state.draftTaken || [];
    state.draftTaken.push(card.ind);
    log(`You draft ${card.name} (${card.ind} L${card.lvl}).`, human.id);
    force((v) => v + 1);
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0e1014" }}>
      <div className="w-full rounded-xl p-6" style={{ maxWidth: 620, backgroundColor: "#14161a", border: "1px solid #262a33" }}>
        <h1 className="text-xl font-bold text-white mb-1">Draft your starting Blueprints</h1>
        <p className="text-sm text-gray-400 mb-1">
          You are seated <span className="text-gray-200 font-semibold">{ord}</span> this game.
          Later seats start with less cash but draft earlier &mdash; pick {need} card{need === 1 ? "" : "s"}.
        </p>
        <p className="text-[11px] text-gray-500 mb-4">
          {hasVariant(state, "orderedDecks")
            ? "Each industry deck is ordered level 1 on top, level 3 at the bottom, and its top card is always public."
            : "Each deck is shuffled whole, so any level can be on top \u2014 a level 3 may be there from the first draft. Its top card is always public."}
        </p>

        {/* Personas are dealt before the draft and are public, so everyone can weigh
            their own specialism \u2014 and everyone else's \u2014 while choosing Blueprints. */}
        {human.persona && PERSONAS[human.persona] && (
          <div className="rounded-md p-3 mb-3" style={{
            backgroundColor: "#1c1f26",
            border: `1px solid ${IND_COLOR[PERSONAS[human.persona].ind]}`,
          }}>
            <div className="flex items-center gap-2 mb-1">
              <Chip color={IND_COLOR[PERSONAS[human.persona].ind]}>{PERSONAS[human.persona].ind}</Chip>
              <span className="text-sm font-bold text-white">You are the {PERSONAS[human.persona].name}</span>
            </div>
            <div className="text-[11px] text-gray-300 leading-snug">{PERSONAS[human.persona].blurb}</div>
            <div className="text-[10px] mt-1.5" style={{ color: IND_COLOR[PERSONAS[human.persona].ind] }}>
              Worth weighing as you draft &mdash; but the 5 EP for entering each industry still rewards breadth.
            </div>
          </div>
        )}

        {state.players.some((p) => p.persona && p.id !== human.id) && (
          <div className="mb-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Others at the table
            </div>
            <div className="flex flex-wrap gap-1.5">
              {state.players.filter((p) => p.persona && p.id !== human.id).map((p) => (
                <div key={p.id} className="rounded px-2 py-1" title={PERSONAS[p.persona].blurb}
                  style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[PERSONAS[p.persona].ind]}55` }}>
                  <span className="text-[10px] text-gray-400">{p.name}: </span>
                  <span className="text-[10px] font-bold" style={{ color: IND_COLOR[PERSONAS[p.persona].ind] }}>
                    {PERSONAS[p.persona].name}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-gray-600 mt-1.5">
              Expect them to lean into those industries &mdash; and the prices to move accordingly.
            </div>
          </div>
        )}

        {/* The same signal the bots read: every card taken so far. Drafting into a deck
            the table is raiding means that industry's price will be low when you build. */}
        {state.draftTaken && state.draftTaken.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Taken so far &mdash; and what it does to prices
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRIES.map((ind) => {
                const taken = state.draftTaken.filter((x) => x === ind).length;
                const bumps = draftedPressure(state.draftTaken.map((x) => BP_DATA.find((b) => b.ind === x && b.lvl === 1)).filter(Boolean));
                const px = expectedDraftPrice(ind, bumps);
                const up = px > BASE_PRICE[ind], down = px < BASE_PRICE[ind];
                return (
                  <div key={ind} className="rounded px-1.5 py-1" style={{
                    backgroundColor: "#1c1f26",
                    border: `1px solid ${taken ? IND_COLOR[ind] : "#262a33"}`,
                  }}>
                    <span className="text-[10px] font-bold" style={{ color: IND_COLOR[ind] }}>{ind}</span>
                    <span className="text-[10px] font-mono text-gray-400"> &times;{taken}</span>
                    <span className="text-[10px] font-mono ml-1" style={{
                      color: up ? "#8fd3b6" : down ? "#fca5a5" : "#6b7280",
                    }}>${px}{up ? " \u2191" : down ? " \u2193" : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {INDUSTRIES.map((ind) => {
            const deck = state.decks[ind] || [];
            const top = deck[0];
            const done = picked >= need;
            return (
              <button key={ind} onClick={() => take(ind)} disabled={!top || done || !myTurn}
                className="text-left rounded-md p-2 disabled:opacity-30"
                style={{ backgroundColor: "#1c1f26", border: `1px solid ${IND_COLOR[ind]}66` }}>
                <div className="flex items-center justify-between mb-1">
                  <Chip color={IND_COLOR[ind]}>{ind}</Chip>
                  <span className="text-[9px] font-mono text-gray-500">{deck.length} left</span>
                </div>
                {top ? (
                  <>
                    <div className="text-[10px] font-semibold text-gray-100 leading-tight" style={{ minHeight: 26 }}>{top.name}</div>
                    <div className="text-[9px] font-mono text-gray-500">L{top.lvl} &middot; set ${top.setup} &middot; opex ${top.opex} &middot; prod {top.prod}</div>
                    <div className="text-[9px] font-mono" style={{ color: "#a5b4cf" }}>
                      {top.deps.map((d) => `${d.ind} $${d.val}`).join(" \u00b7 ")}
                    </div>
                  </>
                ) : <div className="text-[10px] text-gray-600 italic">Empty</div>}
              </button>
            );
          })}
        </div>

        <div className="rounded-md p-2 mb-4" style={{ backgroundColor: "#101318" }}>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Your hand &mdash; {picked}/{need}</div>
          <div className="flex flex-wrap gap-2">
            {human.hand.map((bp, i) => <BPCard key={i} bp={bp} disabled small />)}
            {!picked && <span className="text-[10px] text-gray-600 italic">Nothing drafted yet.</span>}
          </div>
        </div>

        {waitingFor ? (
          <>
            <div className="w-full py-2.5 rounded-md text-sm font-bold text-center"
              style={{ backgroundColor: "#1c1f26", color: "#8fd3b6" }}>
              Waiting for {waitingFor} to draft&hellip;
            </div>
            {/* Drafting is the first thing that happens, so it is where a player who
                never made it into the game leaves everyone else stranded. */}
            {host && onKick && state.awaitingPlayerId != null && state.awaitingPlayerId !== seatId && (
              <div className="mt-2 pt-2 text-center" style={{ borderTop: "1px solid #262a33" }}>
                <div className="text-[10px] text-gray-500 mb-1.5">
                  If {waitingFor} has disconnected, you can hand their seat to a bot.
                </div>
                <button onClick={() => {
                    if (window.confirm(`Replace ${waitingFor} with a bot for the rest of the game? They will not be able to rejoin.`)) onKick(state.awaitingPlayerId);
                  }}
                  className="text-[10px] px-2 py-1 rounded"
                  style={{ backgroundColor: "#2a2415", border: "1px solid #7a6a3f", color: "#f5d76e", cursor: "pointer" }}>
                  Replace {waitingFor} with a bot
                </button>
              </div>
            )}
          </>
        ) : onDone ? (
          <button onClick={onDone} disabled={picked < need}
            className="w-full py-2.5 rounded-md text-sm font-bold disabled:opacity-30"
            style={{ backgroundColor: "#2c5f4f", color: "#d3fcec" }}>
            {picked < need ? `Pick ${need - picked} more` : "Start Year 1"}
          </button>
        ) : (
          <div className="w-full py-2.5 rounded-md text-sm font-bold text-center"
            style={{ backgroundColor: "#1c1f26", color: "#9ca3af" }}>
            {picked < need ? `Pick ${need - picked} more` : "Waiting for the others\u2026"}
          </div>
        )}
      </div>
    </div>
  );
}

/* A small stack of pips reads faster than "L3" when scanning a list of Megacorp
   requirements: one filled block per level, so height maps to company size. */
function LevelBadge({ level }) {
  const COLORS = ["#6b7280", "#8fd3b6", "#67e8f9", "#f5d76e"];
  return (
    <span title={`Level ${level}`} style={{ display: "inline-flex", alignItems: "flex-end", gap: 1, verticalAlign: "middle", height: 11 }}>
      {Array.from({ length: level }).map((_, i) => (
        <span key={i} style={{
          width: 3.5, height: 3 + i * 2.4, backgroundColor: COLORS[Math.min(level, 4) - 1],
          borderRadius: 0.5, display: "inline-block",
        }} />
      ))}
    </span>
  );
}
/* Shows the whole match at a glance - which year, which quarter, which phase - rather
   than a single line naming only the current step. */
function MatchTracker({ state, elapsed }) {
  const year = Math.ceil(state.quarter / 4);
  const qInYear = ((state.quarter - 1) % 4) + 1;
  const PHASES = [
    ["planning", "Planning"], ["resolving", "Action"], ["production", "Production"],
    ["delivering", "Revenue"], ["closing", "Closing"],
  ];
  const phaseNow =
    state.phase === "planning" ? "planning"
    : state.phase === "resolving" ? "resolving"
    : state.phase === "production" ? "production"
    : state.phase === "delivering" || state.phase === "liquidating" ? "delivering"
    : ["placingLH", "repayingLoans"].includes(state.phase) ? "closing"
    : null;
  const detail =
    state.phase === "delivering" ? "B2C" :
    state.phase === "liquidating" ? "cash shortfall" :
    state.phase === "placingLH" ? "hub placement" :
    state.phase === "repayingLoans" ? "loan repayment" : null;
  const pill = (label, on, done) => (
    <span key={label} style={{
      padding: "1.5px 6px", borderRadius: 3, fontSize: 10.5, fontWeight: on ? 800 : 600,
      backgroundColor: on ? "#2c5f4f" : "transparent",
      color: on ? "#d3fcec" : done ? "#6b7280" : "#8b93a3",
      border: `1px solid ${on ? "#3f8a70" : "#262a33"}`,
    }}>{label}</span>
  );
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const hh = Math.floor(elapsed / 3600);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono" style={{ fontSize: 10.5 }}>
      <span className="flex items-center gap-1">
        {[1, 2, 3].map((y) => pill(`Y${y}`, y === year, y < year))}
      </span>
      <span style={{ color: "#3a4152" }}>|</span>
      <span className="flex items-center gap-1">
        {[1, 2, 3, 4].map((q) => pill(`Q${q}`, q === qInYear, q < qInYear))}
      </span>
      <span style={{ color: "#3a4152" }}>|</span>
      <span className="flex items-center gap-1">
        {PHASES.map(([k, label]) => pill(label, k === phaseNow, false))}
      </span>
      {detail && <span style={{ color: "#8fd3b6" }}>({detail})</span>}
      <span style={{ color: "#3a4152" }}>|</span>
      <span title="Time played" style={{ color: "#8b93a3" }}>
        {hh > 0 ? `${hh}:` : ""}{mm}:{ss}
      </span>
    </div>
  );
}
function GameOverScreen({ state, onRestart, online, onReview, elapsed }) {
  const ranked = [...state.players].sort(finalRank);
  const mm = String(Math.floor((elapsed || 0) / 60)).padStart(2, "0");
  const ss = String((elapsed || 0) % 60).padStart(2, "0");
  const hh = Math.floor((elapsed || 0) / 3600);
  return (
    <div className="w-full min-h-screen flex items-start justify-center p-4 overflow-y-auto" style={{ backgroundColor: "#0e1014" }}>
      <div className="w-full rounded-xl p-6" style={{ maxWidth: 1200, backgroundColor: "#14161a", border: "1px solid #262a33" }}>
        <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
          <h1 className="text-xl font-bold text-white">Game Over</h1>
          <span className="text-xs font-mono text-gray-500">
            match time {hh > 0 ? `${hh}:` : ""}{mm}:{ss}
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-5">{ranked[0].name} wins with {ranked[0].epBank.toFixed(0)} EP.</p>
        <div className="gameover-grid mb-6">
          {ranked.map((p, i) => {
            const open = true;                       // all breakdowns visible at once
            const log = p.epLog || [];
            const positives = log.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
            const negatives = log.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
            return (
              <div key={p.id} className="rounded-md" style={{ backgroundColor: i === 0 ? "#1a2e26" : "#1c1f26", border: i === 0 ? "1px solid #2c5f4f" : "1px solid transparent" }}>
                <div className="w-full flex items-center justify-between p-2.5 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500">#{i + 1}</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PLAYER_COLORS[p.id] }} />
                    <span className="text-sm font-semibold text-gray-200">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-white">{p.epBank.toFixed(0)} EP</span>
                  </div>
                </div>
                {open && (
                  <div className="px-2.5 pb-2.5">
                    <div className="rounded p-2" style={{ backgroundColor: "#101318" }}>
                      {!log.length && <div className="text-[10px] text-gray-500 italic">No points scored.</div>}
                      <div className="space-y-0.5">
                        {log.map((e, k) => (
                          <div key={k} className="flex items-start justify-between gap-2 text-[10px]">
                            <span className="text-gray-300 leading-tight">
                              {e.label}{e.quarter ? <span className="text-gray-600"> &middot; Q{e.quarter}</span> : null}
                            </span>
                            <span className="font-mono shrink-0" style={{ color: e.amount < 0 ? "#fca5a5" : "#8fd3b6" }}>
                              {e.amount > 0 ? "+" : ""}{e.amount.toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {log.length > 0 && (
                        <div className="flex items-center justify-between mt-1.5 pt-1.5 text-[10px] font-mono" style={{ borderTop: "1px solid #262a33" }}>
                          <span className="text-gray-500">
                            earned +{positives.toFixed(0)}{negatives < 0 ? `, lost ${negatives.toFixed(0)}` : ""}
                          </span>
                          <span className="font-bold" style={{ color: "#8fd3b6" }}>{p.epBank.toFixed(0)} EP</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {online && !online.host ? (
          <div className="w-full py-2.5 rounded-md text-sm font-bold text-center"
            style={{ backgroundColor: "#1c1f26", color: "#8fd3b6" }}>
            Waiting for the host to start a rematch&hellip;
          </div>
        ) : (
        <button onClick={onRestart} className="w-full py-2.5 rounded-md text-sm font-bold" style={{ backgroundColor: "#2c5f4f", color: "#d3fcec" }}>
          {online ? "Play again \u2014 same players" : "Play Again"}
        </button>
        )}
        {onReview && (
          <button onClick={onReview} className="w-full mt-2 py-2 rounded-md text-xs font-semibold"
            style={{ backgroundColor: "#1c1f26", color: "#8b93a3", border: "1px solid #262a33" }}>
            Review the final board, log and stats
          </button>
        )}
      </div>
    </div>
  );
}
