// 3D field: the real layout pieced together from the owner's drone footage, as a sunset diorama. 1 unit = 1 metre (roughly).
import { THREE } from "./vendor/three-bundle.js";

const fig = document.querySelector(".map");
const host = document.getElementById("map3d");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglOk() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch { return false; }
}

if (host && webglOk()) init();

function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  host.appendChild(renderer.domElement);
  fig.classList.add("has3d");

  const scene = new THREE.Scene();

  // sunset sky: vertical gradient on a canvas
  const sky = document.createElement("canvas"); sky.width = 4; sky.height = 256;
  const sg = sky.getContext("2d").createLinearGradient(0, 0, 0, 256);
  sg.addColorStop(0, "#2b3552"); sg.addColorStop(.45, "#8d6a7a"); sg.addColorStop(.72, "#f0925a"); sg.addColorStop(1, "#ffd08a");
  const sctx = sky.getContext("2d"); sctx.fillStyle = sg; sctx.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0xd98a60, 130, 280);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 700);

  // light: low warm sun + cool sky fill
  scene.add(new THREE.HemisphereLight(0xb6c4e0, 0x5a6a30, 1.4));
  const sun = new THREE.DirectionalLight(0xffb070, 2.6);
  sun.position.set(-60, 22, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 50, bottom: -50, near: 1, far: 220 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // ground: grass texture drawn on canvas, a little uneven
  const gc = document.createElement("canvas"); gc.width = gc.height = 512;
  const g = gc.getContext("2d"); const gr = seeded(5);
  g.fillStyle = "#6c7f36"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = gr(); g.fillStyle = v < .33 ? "#5a6d2c" : v < .66 ? "#7f9140" : "#8c8a44";
    g.fillRect(gr() * 512, gr() * 512, 1 + gr() * 2, 2 + gr() * 5);
  }
  const grassTex = new THREE.CanvasTexture(gc);
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(13, 11); grassTex.colorSpace = THREE.SRGBColorSpace;
  const groundGeo = new THREE.PlaneGeometry(260, 220, 70, 60);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const inField = Math.abs(x) < 38 && Math.abs(y) < 41;
    pos.setZ(i, inField ? Math.sin(x * .15) * Math.cos(y * .2) * .15 : Math.sin(x * .05) * Math.cos(y * .07) * .8 + .3);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // distant tree line on the horizon
  const trees = new THREE.Group(); const tr = seeded(9);
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2c3a1c, roughness: 1 });
  for (let i = 0; i < 90; i++) {
    const a = tr() * Math.PI * 2, d = 105 + tr() * 30;
    const h = 5 + tr() * 7;
    const t = new THREE.Mesh(new THREE.ConeGeometry(2 + tr() * 2, h, 6), treeMat);
    t.position.set(Math.cos(a) * d, h / 2 + 1, Math.sin(a) * d * .9);
    trees.add(t);
  }
  scene.add(trees);

  // The field as it stands in the owner's drone footage (2026-09-29), pieced together in NOTES.md.
  // Metres. x runs along the centre line (net, killhouse, net), + toward the hedge; z + is team A (road side), z - team B (maize side).
  // The layout is point-symmetric: 1A sits where 1B would land if you spun the field half a turn round the killhouse.
  const PLAN = {"fence":{"x":36,"z":38.5},"house":[0,0,7.4,4.8],"nets":[[-19.2,-0.6,-7.8,-0.6],[7.8,0.6,19.2,0.6]],"bunkers":[["1B",-19.2,-13.1,"red"],["2B",-4.6,-23.9,"red"],["3B",12.3,-17.8,"teal"],["4B",26,-6,"teal"],["1A",19.2,13.1,"green"],["2A",4.6,23.9,"green"],["3A",-12.3,17.8,"red"],["4A",-26,6,"red"]],"crates_black":[[6.5,-11.5],[-9.5,-19],[-6.5,11.5],[9.5,19],[-22.3,-4.8,"war"],[22.3,4.8,"war"]],"barrels":[[2.9,15.9,2],[-17.6,-26.1,2],[17.6,26.1,2],[4.6,-2.2,1,"sos"]],"tyre_stacks":[[11.4,-9.2,4],[14,7.6,4],[-1.5,-15.2,3],[6.5,-29,5,"pallet"],[-6,-29.5,5,"pallet"],[-6.5,29,5,"pallet"],[6,29.5,5,"pallet"]],"tyre_pile":[-5.2,2.8],"tyre_chain":[4.8,-4.1],"crates":[[-11.7,-19],[5.6,-24.2],[-3.3,7.8],[-2.9,10.2],[-4.3,21],[11.6,18.4],[4.1,-14.9,"tyre"]],"boards":[[-8.3,-10.1,0.45],[0.5,-28.5,0],[8.3,10.1,0.45],[-0.5,28.5,0]],"uframes":[[-3,-27.5,0],[3,27.5,0]],"netboxes":[[9,-25.5],[16,-2.5],[-9,25.5],[-16,2.5]],"spawns":[["B",1,-35],["A",-1,35]],"routes":{"A":[[-1,32],[-5,26],[-8.5,20],[-6,12],[-2,4.5]],"B":[[1,-32],[5,-26],[8.5,-20],[6,-12],[2,-4.5]]}};
  const groups = {};
  const add = (k, mesh) => {
    (groups[k] ||= new THREE.Group()).add(mesh);
    mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.k = k; } });
  };
  const jr = seeded(21), jitter = a => (jr() - .5) * a;
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .9, ...o });
  const box = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.y = h / 2; return b; };
  const at = (o, x, z, r = 0) => { o.position.x = x; o.position.z = z; o.rotation.y = r; return o; };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const wood = mat(0xb98a4e), woodDark = mat(0x8a6436), ply = mat(0xcfae78);
  // a wall of pallet slats between two points (the bunkers' open sides, the spawn shelters, the U walls)
  const slats = (len, h) => {
    const g = new THREE.Group();
    for (let y = .15; y < h; y += .3) { const s = box(len, .14, .08, y % .6 < .3 ? wood : woodDark); s.position.y = y; g.add(s); }
    [-len / 2, len / 2].forEach(x => { const p = box(.1, h, .1, woodDark); p.position.x = x; g.add(p); });
    return g;
  };

  // ---- the killhouse: 2 x 3 open-top rooms, yellow / black camo walls, net over the top, orange end wall ----
  {
    const [hx, hz, L, Wd] = PLAN.house, H = 2.1, T = .12;
    const camoTex = canvasTex(512, 160, (c, w, h) => {   // their paint here is only yellow and black, in big angular blocks
      const r = seeded(77); c.fillStyle = "#e9b92c"; c.fillRect(0, 0, w, h); c.fillStyle = "#15140f";
      for (let i = 0; i < 18; i++) { const x = r() * w, y = r() * h, s = 22 + r() * 30; c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * 2, y + s * (r() - .5)); c.lineTo(x + s * 1.6, y + s * 1.4); c.lineTo(x + s * .2, y + s * 1.1); c.fill(); c.fillRect(x + s * .4, y - s * .6, s * .5, s * 1.4); }
    });
    const camo = mat(0xffffff, { map: camoTex }), orange = mat(0xd0632c), inner = mat(0xc9a64a);
    const g = new THREE.Group();
    const wall = (x1, z1, x2, z2, m) => {
      const len = Math.hypot(x2 - x1, z2 - z1), w = box(len, H, T, m);
      w.position.set((x1 + x2) / 2, H / 2, (z1 + z2) / 2); w.rotation.y = -Math.atan2(z2 - z1, x2 - x1); g.add(w);
    };
    const l = L / 2, d = Wd / 2, c = L / 6, door = .45;
    // long walls: a doorway into the middle room from each side
    wall(-l, -d, -door, -d, camo); wall(door, -d, l, -d, camo);
    wall(-l, d, -door, d, camo); wall(door, d, l, d, camo);
    wall(-l, -d, -l, d, camo); wall(l, -d, l, d, orange);
    // inside: one wall down the middle, two across, each with a gap to pass through
    wall(-l, 0, -c - door, 0, inner); wall(-c + door, 0, c - door, 0, inner); wall(c + door, 0, l - .9, 0, inner);
    [-c, c].forEach(x => { wall(x, -d, x, -door * 1.6, inner); wall(x, door * 1.6, x, d, inner); });
    // windows: dark holes on the outer walls
    const holeMat = mat(0x0d0f0a);
    [[-l + c, -d - .07, 0], [l - c, d + .07, Math.PI], [-l - .07, 0, Math.PI / 2]].forEach(([x, z, r]) => {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(.9, .55), holeMat); h.position.set(x, 1.35, z); h.rotation.y = r + Math.PI; g.add(h);
    });
    // net roof on a wooden grid
    const net = new THREE.Mesh(new THREE.PlaneGeometry(L, Wd, 30, 20), new THREE.MeshBasicMaterial({ color: 0x2a2a22, wireframe: true, transparent: true, opacity: .55 }));
    net.rotation.x = -Math.PI / 2; net.position.y = H + .02; g.add(net);
    [-l, -c, c, l].forEach(x => { const b = box(.08, .08, Wd, woodDark); b.position.set(x, H, 0); g.add(b); });
    [-d, 0, d].forEach(z => { const b = box(L, .08, .08, woodDark); b.position.set(0, H, z); g.add(b); });
    add("casa", at(g, hx, hz));
  }

  // ---- numbered bunkers: pallet frame, two painted plywood sides with the number, crossed beams on top ----
  const PAINT3D = { red: ["#b3323a", "#3f7a4a"], teal: ["#2e6e66", "#1f4f49"], green: ["#3f8f4a", "#2d6b37"] };
  PLAN.bunkers.forEach(([name, x, z, col]) => {
    const [base, blob] = PAINT3D[col], r = seeded(name.charCodeAt(0) * 7 + name.charCodeAt(1));
    const tex = canvasTex(256, 240, (c, w, h) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      c.fillStyle = blob; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(r() * w, r() * h, 20 + r() * 40, 12 + r() * 30, r() * 3, 0, 7); c.fill(); }
      c.fillStyle = "#f4efe2"; c.font = "700 104px 'Chakra Petch', Impact, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(name, w / 2, h / 2 + 8);
      c.fillStyle = "#f2c230"; c.font = "40px sans-serif"; c.fillText("★", w / 2, 38);
    });
    const S = 2.2, H = 2, g = new THREE.Group(), paint = mat(0xffffff, { map: tex });
    const front = box(S, H, .06, paint); front.position.z = S / 2; g.add(front);           // faces the team's own spawn
    const side = box(S, H, .06, paint); side.position.x = S / 2; side.rotation.y = Math.PI / 2; g.add(side);
    const back = slats(S, H); back.position.z = -S / 2; g.add(back);
    const left = slats(S, H); left.position.x = -S / 2; left.rotation.y = Math.PI / 2; g.add(left);
    [1, -1].forEach(s => { const b = box(3.4, .1, .12, ply); b.position.y = H + .05; b.rotation.y = s * Math.PI / 4; g.add(b); });
    // front to the own side: A bunkers look toward the road (z +), B toward the maize
    add("zid", at(g, x, z, (z > 0 ? 0 : Math.PI) + jitter(.5)));
  });

  // ---- black crates with stars (two by the ends of the centre line are marked WAR) ----
  const starTex = war => canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = "#121410"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#e8e1cb"; c.font = "22px sans-serif"; c.textAlign = "center"; c.fillText("★ ★ ★", w / 2, 30);
    if (war) { c.fillStyle = "#d8323c"; c.font = "700 40px 'Chakra Petch', Impact, sans-serif"; c.fillText("WAR", w / 2, 88); }
  });
  const starMat = mat(0xffffff, { map: starTex(false) }), warMat = mat(0xffffff, { map: starTex(true) });
  PLAN.crates_black.forEach(([x, z, war]) => add("cub", at(box(1.1, 1.25, 1.1, war ? warMat : starMat), x, z, jitter(1))));

  // ---- barrels: blue ones in pairs, one black barrel painted SOS by the killhouse ----
  const blue = mat(0x2455b0, { roughness: .45, metalness: .3 });
  const sosMat = mat(0xffffff, { map: canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = "#15171a"; c.fillRect(0, 0, w, h); c.fillStyle = "#d8323c"; c.font = "700 30px sans-serif"; c.textAlign = "center"; c.fillText("SOS  ✕", w / 2, 42);
  }) });
  PLAN.barrels.forEach(([x, z, n, mark]) => {
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .9, 18), mark ? sosMat : blue);
      b.position.set(x + i * .62, .45, z + jitter(.2)); add("butoi", b);
    }
  });

  // ---- tyres: stacks (some on a pallet), a pile against the killhouse, a chain by its other corner ----
  const tyreMat = mat(0x1a1a1a, { roughness: .95 });
  const tyre = (x, y, z) => { const t = new THREE.Mesh(new THREE.TorusGeometry(.4, .16, 10, 22), tyreMat); t.rotation.x = Math.PI / 2; t.position.set(x, y, z); add("cauciuc", t); };
  PLAN.tyre_stacks.forEach(([x, z, n, pallet]) => {
    const y0 = pallet ? .16 : 0;
    if (pallet) add("cauciuc", at(box(1.2, .14, 1, wood), x, z, jitter(.4)));
    for (let i = 0; i < n; i++) tyre(x + jitter(.08), y0 + .16 + i * .3, z + jitter(.08));
  });
  { const [x, z] = PLAN.tyre_pile; for (let i = 0; i < 8; i++) tyre(x - .1 - .85 * (i % 2), .16 + (i > 5 ? .3 : 0), z - 1.6 + .8 * (i % 4 === 3 ? 3 : (i >> 1) % 4)); }
  { const [x, z] = PLAN.tyre_chain; for (let i = 0; i < 6; i++) tyre(x + .55 * i, .16 + (i % 2) * .3, z - .3 * i); }

  // ---- wood: crates, plywood boards on legs, U-shaped pallet walls, low boxes under camo netting ----
  PLAN.crates.forEach(([x, z, tyreIn]) => {
    add("palet", at(box(1, .9, 1, jr() < .5 ? wood : woodDark), x, z, jitter(1.2)));
    if (tyreIn) tyre(x, 1.06, z);
  });
  PLAN.boards.forEach(([x, z, r]) => {
    const g = new THREE.Group();
    const panel = box(2.2, 1.2, .05, ply); panel.position.y = .75; panel.rotation.x = .2; g.add(panel);
    [-1, 1].forEach(s => { const leg = box(.08, 1.3, .08, woodDark); leg.position.set(s * .9, .65, -.35); leg.rotation.x = -.35; g.add(leg); });
    add("palet", at(g, x, z, r + (z > 0 ? Math.PI : 0)));
  });
  PLAN.uframes.forEach(([x, z]) => {
    const g = new THREE.Group(), s = z > 0 ? -1 : 1;
    const back = slats(2.6, 1.3); back.position.z = s * .9; g.add(back);
    [-1.3, 1.3].forEach(dx => { const w = slats(1.8, 1.3); w.position.x = dx; w.rotation.y = Math.PI / 2; g.add(w); });
    add("palet", at(g, x, z));
  });
  const netOver = new THREE.MeshBasicMaterial({ color: 0x3b4a2a, wireframe: true, transparent: true, opacity: .8 });
  PLAN.netboxes.forEach(([x, z]) => {
    const g = new THREE.Group(); g.add(box(1.6, .8, 1.2, mat(0x7d8a6a)));
    const n = new THREE.Mesh(new THREE.BoxGeometry(1.75, .9, 1.35, 6, 3, 5), netOver); n.position.y = .45; g.add(n);
    add("palet", at(g, x, z, jitter(1)));
  });

  // ---- spawns: a pallet shelter at each end, open toward the field, team colour on the grass ----
  PLAN.spawns.forEach(([team, x, z]) => {
    const g = new THREE.Group(), s = z > 0 ? 1 : -1, c = team === "A" ? 0x2f6fd6 : 0xc8323c;
    const back = slats(4.2, 2.1); back.position.z = s * 1.2; g.add(back);
    [-2.1, 2.1].forEach(dx => { const w = slats(2.4, 2.1); w.position.x = dx; w.rotation.y = Math.PI / 2; g.add(w); });
    const roof = box(4.4, .1, 2.6, woodDark); roof.position.y = 2.15; g.add(roof);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), mat(c, { transparent: true, opacity: .5 }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, .06, -s * 1.2); g.add(pad);
    add("baza", at(g, x, z));
  });

  // ---- green mesh: the fence on three sides (the hedge closes the fourth) and the two nets in line with the killhouse ----
  const netMat = mat(0x2f5a22, { transparent: true, opacity: .6, side: THREE.DoubleSide, roughness: 1 });
  const postMat = mat(0x3a3a30);
  const fence = (pts, h) => pts.slice(1).forEach(([x2, z2], i) => {
    const [x1, z1] = pts[i], len = Math.hypot(x2 - x1, z2 - z1);
    const n = new THREE.Mesh(new THREE.PlaneGeometry(len, h), netMat);
    n.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2); n.rotation.y = -Math.atan2(z2 - z1, x2 - x1); add("plasa", n);
    for (let s = 0; s <= len; s += 3) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, h + .2, 6), postMat);
      p.position.set(x1 + (x2 - x1) * s / len, (h + .2) / 2, z1 + (z2 - z1) * s / len); add("plasa", p);
    }
  });
  const FX = PLAN.fence.x, FZ = PLAN.fence.z;
  fence([[FX, -FZ], [-FX, -FZ], [-FX, FZ], [FX, FZ]], 1.8);
  PLAN.nets.forEach(([x1, z1, x2, z2]) => fence([[x1, z1], [x2, z2]], 2));

  Object.values(groups).forEach(gp => scene.add(gp));

  // ---- around it, as the drone shows it: hedge at the east end, maize beyond, the gravel road and the parking by team A ----
  const bushMat = mat(0x3f5a25, { roughness: 1, flatShading: true });
  for (let z = -FZ; z <= FZ; z += 2.6) {
    const r = 1.3 + jr() * 1.6, b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), bushMat);
    b.position.set(FX + 2.5 + jitter(2), r * .7, z + jitter(1)); b.castShadow = true; scene.add(b);
  }
  const maizeTex = canvasTex(64, 64, (c, w, h) => { c.fillStyle = "#a88d55"; c.fillRect(0, 0, w, h); c.fillStyle = "#7d6a3c"; for (let i = 0; i < w; i += 8) c.fillRect(i, 0, 3, h); });
  maizeTex.wrapS = maizeTex.wrapT = THREE.RepeatWrapping; maizeTex.repeat.set(14, 1);
  [[0, -FZ - 16, 140, 24], [FX + 18, 0, 22, 70]].forEach(([x, z, w, d]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, d), mat(0xffffff, { map: maizeTex, roughness: 1 }));
    f.position.set(x, .9, z); f.receiveShadow = true; scene.add(f);
  });
  const road = new THREE.CatmullRomCurve3([[-90, FZ + 6], [-30, FZ + 4.5], [10, FZ + 5], [26, FZ + 8], [34, FZ + 16]].map(([x, z]) => new THREE.Vector3(x, .3, z)));
  const rp = road.getSpacedPoints(80), rv = [], ri = [];
  rp.forEach((p, i) => {   // a flat ribbon 4.4 m wide along the curve
    const q = rp[Math.min(i + 1, rp.length - 1)], o = rp[Math.max(i - 1, 0)];
    const nx = -(q.z - o.z), nz = q.x - o.x, l = Math.hypot(nx, nz) / 2.2;
    rv.push(p.x + nx / l, .3, p.z + nz / l, p.x - nx / l, .3, p.z - nz / l);
    if (i) ri.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
  });
  const roadGeo = new THREE.BufferGeometry(); roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(rv, 3)); roadGeo.setIndex(ri); roadGeo.computeVertexNormals();
  const roadMesh = new THREE.Mesh(roadGeo, mat(0xc9bfa6, { roughness: 1, side: THREE.DoubleSide })); roadMesh.receiveShadow = true; scene.add(roadMesh);
  const carMat = mat(0x1c1f24, { roughness: .35, metalness: .6 });
  [[27, FZ + 12, .4], [22, FZ + 14, .5], [30, FZ + 5, .2]].forEach(([x, z, r]) => {
    const car = new THREE.Group();
    const body = box(4.6, .8, 1.8, carMat); body.position.y = .55; car.add(body);
    const top = box(2.4, .6, 1.6, carMat); top.position.set(-.2, 1.25, 0); car.add(top);
    car.traverse(o => (o.castShadow = true)); scene.add(at(car, x, z, r));
  });

  // ---- routes: dashed lines from each spawn to the killhouse ----
  const route = (pts, color) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, .12, z)));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(100)),
      new THREE.LineDashedMaterial({ color, dashSize: .9, gapSize: .6 }));
    line.computeLineDistances(); scene.add(line); return line;
  };
  const routes = [route(PLAN.routes.A, 0x2f6fd6), route(PLAN.routes.B, 0xc8323c)];

  // every material gets its own copy so dimming one type does not dim the rest
  scene.traverse(o => { if (o.isMesh && o.userData.k) { o.material = o.material.clone(); o.material.transparent = true; o.userData.baseOpacity = o.material.opacity; } });

  // ---- camera: slow orbit, drag to turn, legend flies to a group ----
  const HOME = new THREE.Vector3(0, 0, 0);
  const target = HOME.clone(), wantTarget = target.clone();
  let angle = 1.15, radius = 56, height = 34, wantRadius = radius, wantHeight = height;
  let dragging = false, lastX = 0, idleUntil = 0;
  const el = renderer.domElement;
  el.style.touchAction = "pan-y";
  el.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; el.setPointerCapture(e.pointerId); downAt = [e.clientX, e.clientY]; });
  el.addEventListener("pointermove", e => { if (!dragging) return; angle -= (e.clientX - lastX) * .006; lastX = e.clientX; idleUntil = performance.now() + 4000; });
  el.addEventListener("pointerup", e => { dragging = false; if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5) pick(e); });
  el.addEventListener("pointercancel", () => (dragging = false));
  let downAt = [0, 0];

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(Object.values(groups), true).find(h => h.object.userData.k);
    if (hit && window.focusEl) window.focusEl(hit.object.userData.k);
  }

  let focused = null;
  document.addEventListener("fieldfocus", e => {
    focused = e.detail;
    if (focused && groups[focused]) {
      const box = new THREE.Box3().setFromObject(groups[focused]);
      box.getCenter(wantTarget); wantTarget.y = 0;
      const size = box.getSize(new THREE.Vector3()).length();
      wantRadius = Math.max(14, Math.min(80, size * .8)); wantHeight = wantRadius * .6;
    } else { wantTarget.copy(HOME); wantRadius = 56; wantHeight = 34; }
    idleUntil = performance.now() + 1500;
    scene.traverse(o => {
      if (!o.isMesh || !o.userData.k) return;
      const on = !focused || o.userData.k === focused;
      o.userData.wantOpacity = on ? o.userData.baseOpacity : .12;
    });
    routes.forEach(l => (l.visible = !focused));
  });

  // ---- size, visibility, loop ----
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 1 ? 52 : 38; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host); resize();

  let visible = false;
  new IntersectionObserver(es => es.forEach(e => (visible = e.isIntersecting)), { rootMargin: "100px" }).observe(host);

  let last = performance.now(), t = 0;
  (function loop() {
    requestAnimationFrame(loop);
    const now = performance.now(), raw = (now - last) / 1000; last = now;
    if (!visible) return;
    const dt = Math.min(raw, .05); t += dt;
    if (!reduce && !dragging && performance.now() > idleUntil) angle += dt * .06;
    const k = 1 - Math.pow(.02, dt);
    target.lerp(wantTarget, k); radius += (wantRadius - radius) * k; height += (wantHeight - height) * k;
    camera.position.set(target.x + Math.cos(angle) * radius, height, target.z + Math.sin(angle) * radius);
    camera.lookAt(target);
    scene.traverse(o => {
      if (o.isMesh && o.userData.wantOpacity !== undefined) o.material.opacity += (o.userData.wantOpacity - o.material.opacity) * k;
    });
    renderer.render(scene, camera);
  })();
}
