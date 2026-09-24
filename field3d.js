// 3D field: the same layout as the SVG sketch, as a sunset diorama. 1 unit = 1 metre (roughly).
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
  scene.fog = new THREE.Fog(0xd98a60, 120, 260);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);

  // light: low warm sun + cool sky fill
  scene.add(new THREE.HemisphereLight(0xb6c4e0, 0x5a6a30, 1.4));
  const sun = new THREE.DirectionalLight(0xffb070, 2.6);
  sun.position.set(-60, 22, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 45, bottom: -45, near: 1, far: 200 });
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
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(10, 7); grassTex.colorSpace = THREE.SRGBColorSpace;
  const groundGeo = new THREE.PlaneGeometry(220, 180, 60, 50);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const inField = Math.abs(x) < 48 && Math.abs(y) < 30;
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
    const a = tr() * Math.PI * 2, d = 100 + tr() * 30;
    const h = 5 + tr() * 7;
    const t = new THREE.Mesh(new THREE.ConeGeometry(2 + tr() * 2, h, 6), treeMat);
    t.position.set(Math.cos(a) * d, h / 2 + 1, Math.sin(a) * d * .8);
    trees.add(t);
  }
  scene.add(trees);

  // svg coords (1000 x 620) to metres
  const X = x => (x - 500) / 10, Z = y => (y - 310) / 10;
  const groups = {};
  const add = (k, mesh) => {
    (groups[k] ||= new THREE.Group()).add(mesh);
    mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.k = k; } });
  };

  // small cabins painted in the page's camo: plywood box, dark doorway, netting peak on the roof
  const camoCanvas = document.createElement("canvas"); camoCanvas.width = 512; camoCanvas.height = 320;
  window.paintCamo(camoCanvas.getContext("2d"), 512, 320, 77, 34);
  const camoTex = new THREE.CanvasTexture(camoCanvas); camoTex.colorSpace = THREE.SRGBColorSpace;
  const cabinMat = new THREE.MeshStandardMaterial({ map: camoTex, roughness: .9 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x0d0f0a, roughness: 1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b3a30, roughness: 1 });
  const netMat2 = new THREE.MeshBasicMaterial({ color: 0x1a1a14, wireframe: true, transparent: true, opacity: .8 });
  const postMat2 = new THREE.MeshStandardMaterial({ color: 0x5b4a33 });
  [[385, 125, .1], [640, 499, -.12], [423, 275, 1.45], [603, 225, 1.7]].forEach(([x, y, r]) => {
    const cab = new THREE.Group();
    const w = 4.4, h = 2.7, d = 3.4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cabinMat); body.position.y = h / 2; cab.add(body);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.9), doorMat); door.position.set(.6, .95, d / 2 + .01); cab.add(door);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(.9, .6), doorMat); win.position.set(-w / 2 - .01, 1.7, 0); win.rotation.y = -Math.PI / 2; cab.add(win);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + .3, .12, d + .3), roofMat); roof.position.y = h + .06; cab.add(roof);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.2, 6), postMat2); pole.position.y = h + 1.1; cab.add(pole);
    const net = new THREE.Mesh(new THREE.ConeGeometry(2.9, 2.1, 4, 3, true), netMat2);
    net.position.y = h + 1.1; net.rotation.y = Math.PI / 4; cab.add(net);
    cab.position.set(X(x), 0, Z(y)); cab.rotation.y = r;
    add("zid", cab);
  });

  // black cubes stencilled BASTION
  const cc = document.createElement("canvas"); cc.width = cc.height = 256;
  const cx = cc.getContext("2d");
  const drawCube = () => {
    cx.fillStyle = "#121410"; cx.fillRect(0, 0, 256, 256);
    cx.fillStyle = "#e8e1cb"; cx.font = "700 44px 'Chakra Petch', Impact, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText("BASTION", 128, 128);
    cx.fillRect(40, 160, 176, 4);
    cubeTex.needsUpdate = true;
  };
  const cubeTex = new THREE.CanvasTexture(cc); cubeTex.colorSpace = THREE.SRGBColorSpace;
  drawCube(); document.fonts?.ready.then(drawCube);
  const cubeMat = new THREE.MeshStandardMaterial({ map: cubeTex, roughness: .7 });
  [[250, 190], [690, 190], [300, 420], [650, 380]].forEach(([x, y], i) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), cubeMat);
    c.position.set(X(x + 22), 1.2, Z(y + 22)); c.rotation.y = i * .35;
    add("cub", c);
  });

  // blue barrels + tricolour
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2455b0, roughness: .45, metalness: .3 });
  [[478, 296], [503, 290], [526, 302], [490, 320], [516, 326]].forEach(([x, y]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 1.4, 20), barrelMat);
    b.position.set(X(x), .7, Z(y)); add("butoi", b);
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 4.4, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  pole.position.set(X(500), 2.2, Z(272)); add("butoi", pole);
  const fc = document.createElement("canvas"); fc.width = 96; fc.height = 64;
  const fx = fc.getContext("2d"); ["#0b3fa8", "#f2c230", "#c8102e"].forEach((c, i) => { fx.fillStyle = c; fx.fillRect(i * 32, 0, 32, 64); });
  const flagTex = new THREE.CanvasTexture(fc); flagTex.colorSpace = THREE.SRGBColorSpace;
  const flagGeo = new THREE.PlaneGeometry(1.8, 1.2, 12, 6);
  const flagBase = flagGeo.attributes.position.array.slice();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: .8 }));
  flag.position.set(X(500) + .93, 3.75, Z(272)); add("butoi", flag);

  // tyre stacks
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .95 });
  [[190, 120, 3], [216, 126, 2], [760, 110, 3], [782, 130, 2], [820, 500, 3], [794, 504, 2], [360, 300, 2]].forEach(([x, y, n]) => {
    for (let i = 0; i < n; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(.62, .25, 10, 22), tyreMat);
      t.rotation.x = Math.PI / 2; t.position.set(X(x), .25 + i * .48, Z(y)); add("cauciuc", t);
    }
  });

  // pallets
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb98a4e, roughness: .9 });
  [[185, 492, 0, 5], [595, 102, .14, 4], [762, 325, -.1, 6]].forEach(([x, y, r, n]) => {
    const stack = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, .22, 1.2), woodMat);
      p.position.y = .11 + i * .24; p.rotation.y = (i % 2) * .06; stack.add(p);
    }
    stack.position.set(X(x), 0, Z(y)); stack.rotation.y = r; add("palet", stack);
  });

  // bases painted on the grass
  [[113, 310, 0x2f6fd6], [887, 310, 0xc8323c]].forEach(([x, y, c]) => {
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(11, 16), new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: .5, roughness: 1 }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(X(x), .06, Z(y)); add("baza", pad);
    const flagpost = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.2, 6), new THREE.MeshStandardMaterial({ color: c }));
    flagpost.position.set(X(x), 1.1, Z(y)); add("baza", flagpost);
  });

  // green mesh fence around the field
  const netMat = new THREE.MeshStandardMaterial({ color: 0x2f5a22, transparent: true, opacity: .55, side: THREE.DoubleSide, roughness: 1 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3a30 });
  const W = 92, D = 54;
  [[0, -D / 2, W, 0], [0, D / 2, W, 0], [-W / 2, 0, D, Math.PI / 2], [W / 2, 0, D, Math.PI / 2]].forEach(([x, z, len, r]) => {
    const net = new THREE.Mesh(new THREE.PlaneGeometry(len, 2), netMat);
    net.position.set(x, 1, z); net.rotation.y = r; add("plasa", net);
    for (let s = -len / 2; s <= len / 2; s += 4) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.3, 6), postMat);
      p.position.set(x + (r ? 0 : s), 1.15, z + (r ? s : 0)); add("plasa", p);
    }
  });

  Object.values(groups).forEach(gp => scene.add(gp));

  // routes: dashed lines on the grass from each base to the flag
  const route = (pts, color) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(X(x), .12, Z(y))));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)),
      new THREE.LineDashedMaterial({ color, dashSize: .9, gapSize: .6 }));
    line.computeLineDistances(); scene.add(line); return line;
  };
  const routes = [route([[168, 300], [250, 330], [330, 350], [430, 305], [470, 312]], 0x2f6fd6),
                  route([[832, 320], [760, 290], [680, 262], [580, 305], [530, 312]], 0xc8323c)];

  // every material gets its own copy so dimming one type does not dim the rest
  scene.traverse(o => { if (o.isMesh && o.userData.k) { o.material = o.material.clone(); o.material.transparent = true; o.userData.baseOpacity = o.material.opacity; } });

  // ---- camera: slow orbit, drag to turn, legend flies to a group ----
  const target = new THREE.Vector3(0, 0, 0), wantTarget = target.clone();
  let angle = -0.55, radius = 64, height = 34, wantRadius = radius, wantHeight = height;
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
      wantRadius = Math.max(18, Math.min(60, size * .9)); wantHeight = wantRadius * .6;
    } else { wantTarget.set(0, 0, 0); wantRadius = 64; wantHeight = 34; }
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
    if (!reduce) {
      const p = flagGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const bx = flagBase[i * 3], u = bx + .6;
        p.setZ(i, Math.sin(bx * 5 - t * 6) * .07 * u);
      }
      p.needsUpdate = true;
    }
    renderer.render(scene, camera);
  })();
}
