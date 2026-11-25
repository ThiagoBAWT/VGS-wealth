// VG Wealth - terreno 3D em curvas de nivel (4 camadas). Arraste para girar; nada reage a rolagem.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

const C = {
  layers: ['#0b664f', '#14916f', '#5fc7a0', '#d3f1e1'],
  side: ['#0f5a46', '#12705a', '#278a6a', '#86c9ab'],
  line: '#c9f5df', clay: '#f06c3f', claySide: '#b84a26', white: '#ffffff', sky: '#effff7', ground: '#06342a',
};
const LAYERS = [
  { r: 4.00, seed: 0.4, ox: 0.00, oz: 0.00 },
  { r: 3.12, seed: 1.1, ox: -0.22, oz: 0.10 },
  { r: 2.28, seed: 1.9, ox: -0.40, oz: 0.02 },
  { r: 1.46, seed: 2.7, ox: -0.52, oz: -0.10 },
];
const H = 0.34, BEV = 0.07, STEP = H + BEV * 2 + 0.03, SQUASH = 0.74, LIFT = 0.5;

// contorno organico: soma de harmonicos suaves, com forma que evolui de uma camada para a outra
function radius(L, a, k = 1) {
  return L.r * k * (1 + 0.085 * Math.sin(2 * a + L.seed) + 0.058 * Math.sin(3 * a - L.seed * 1.7)
    + 0.022 * Math.sin(5 * a + L.seed * 2.3));
}
function outline(L, k = 1, n = 160) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, r = radius(L, a, k);
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r * SQUASH));
  }
  return pts;
}
function contourLine(L, k, y, opacity) {
  // shape (x, y) apos rotateX(-90) vira (x, 0, -y)
  const g = new THREE.BufferGeometry().setFromPoints(outline(L, k).map(p => new THREE.Vector3(p.x, y, -p.y)));
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity, depthWrite: false }));
}
function softShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 20, 128, 128, 128);
  g.addColorStop(0, 'rgba(1,24,18,.55)'); g.addColorStop(0.62, 'rgba(1,24,18,.28)'); g.addColorStop(1, 'rgba(1,24,18,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
// o "V" de tres curvas do logo (mesma geometria do mark.mjs), extrudado
function logoV() {
  const group = new THREE.Group(), S = 0.0155;
  const cut = x => 27.5 + (x - 0) * (2.6 - 27.5) / 104; // topo em linha ascendente (y do SVG)
  const HALF = 7.6 / 2, SL = 0.53, hx = HALF * Math.hypot(1, SL), hy = hx / SL;
  [87, 64, 41].forEach(apex => {
    // braco: x = 50 +/- (apex_borda - y) * SL ; interseca a linha de corte
    const solve = (ap, dir) => {
      const m = (2.6 - 27.5) / 104; // y = 27.5 + m x ; x = 50 + dir (ap - y) SL
      const x = (50 + dir * (ap - 27.5) * SL) / (1 + dir * m * SL);
      return [x, cut(x)];
    };
    const o = apex + hy, i = apex - hy;
    const pts = [solve(o, -1), [50, o], solve(o, 1), solve(i, 1), [50, i], solve(i, -1)];
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2((x - 50) * S * 1.08, (97.6 - y) * S * 1.08)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.03, bevelSegments: 3 });
    geo.translate(0, 0, -0.1);
    const m = new THREE.Mesh(geo, [
      new THREE.MeshStandardMaterial({ color: C.clay, roughness: 0.4, metalness: 0.05, emissive: C.clay, emissiveIntensity: 0.34 }),
      new THREE.MeshStandardMaterial({ color: C.claySide, roughness: 0.55, metalness: 0.05, emissive: C.claySide, emissiveIntensity: 0.3 }),
    ]);
    m.castShadow = true;
    group.add(m);
  });
  return group;
}

function init(el) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cv = renderer.domElement;
  cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'pan-y', cursor: 'grab' });
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.style.touchAction = 'pan-y';
  el.appendChild(cv);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 2, 0.1, 100);
  scene.add(new THREE.HemisphereLight(C.sky, C.ground, 1.5));
  const sun = new THREE.DirectionalLight(C.white, 2.1);
  sun.position.set(-5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 24 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(C.line, 1.1); rim.position.set(6, 3, -6); scene.add(rim);

  const world = new THREE.Group(); scene.add(world);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 8.4), new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.34; world.add(floor);
  // curvas de nivel soltas ao redor da base
  [1.07, 1.135, 1.2].forEach((k, i) => world.add(contourLine(LAYERS[0], k, -0.16 - i * 0.05, 0.42 - i * 0.11)));
  world.children.slice(1).forEach(l => { l.position.set(0, 0, 0); });

  const layers = LAYERS.map((L, i) => {
    const g = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(outline(L)), {
      depth: H, bevelEnabled: true, bevelThickness: BEV, bevelSize: 0.065, bevelOffset: -0.065, bevelSegments: 5, curveSegments: 1,
    });
    geo.rotateX(-Math.PI / 2); geo.translate(0, BEV, 0);
    const top = new THREE.MeshStandardMaterial({ color: C.layers[i], roughness: 0.55, metalness: 0.06 });
    const side = new THREE.MeshStandardMaterial({ color: C.side[i], roughness: 0.68, metalness: 0.04 });
    const mesh = new THREE.Mesh(geo, [top, side]); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
    const y = H + BEV * 2 + 0.006;
    const lines = [contourLine(L, 0.972, y, 0.85)];
    // sulcos de plantio: curvas finas apenas na faixa exposta
    if (i < 3) [0.915, 0.86].forEach((k, j) => lines.push(contourLine(L, k, y, 0.34 - j * 0.1)));
    else lines.push(contourLine(L, 0.84, y, 0.5));
    const edge = contourLine(L, 0.999, BEV * 0.6, 0.5); lines.push(edge);
    lines.forEach(l => g.add(l));
    g.position.set(L.ox, i * STEP, L.oz);
    world.add(g);
    return { g, top, side, lines, base: i * STEP, lift: 0, mix: 0, L };
  });

  // marcador: o V do logo coroando o topo
  const crown = logoV();
  const crownPivot = new THREE.Group(); crownPivot.add(crown);
  const T = LAYERS[3];
  crownPivot.position.set(T.ox, 0, T.oz);
  world.add(crownPivot);
  const topY = 3 * STEP + H + BEV * 2;

  // particulas discretas
  const N = 46, pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.2 + Math.random() * 2.6;
    seeds.push([a, r, Math.random() * 3, 0.05 + Math.random() * 0.09]);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dc = document.createElement('canvas'); dc.width = dc.height = 32;
  const dx = dc.getContext('2d'); dx.fillStyle = C.white; dx.beginPath(); dx.arc(16, 16, 13, 0, 7); dx.fill();
  const dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: C.line, size: 0.065, map: new THREE.CanvasTexture(dc), transparent: true, opacity: 0.65, depthWrite: false }));
  world.add(dots);

  // enquadramento: calcula a distancia para o volume inteiro caber em qualquer giro
  const ELEV = THREE.MathUtils.degToRad(27);
  const fitPts = [];
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    fitPts.push(new THREE.Vector3(c * 5.25, -0.24, s * 5.25));
    fitPts.push(new THREE.Vector3(c * 3.7, 2 * STEP, s * 3.7));
    fitPts.push(new THREE.Vector3(c * 1.0, topY + 1.75 + LIFT * 1.55, s * 1.0));
  }
  function frame() {
    const w = Math.max(el.clientWidth, 1), h = Math.max(el.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.clearViewOffset();
    const dir = new THREE.Vector3(0, Math.sin(ELEV), Math.cos(ELEV));
    const target = new THREE.Vector3(0, 1.2, 0), v = new THREE.Vector3();
    let dist = 24, box;
    for (let pass = 0; pass < 5; pass++) {
      camera.position.copy(target).addScaledVector(dir, dist); camera.lookAt(target);
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      box = { x: 0, y0: 1e9, y1: -1e9 };
      for (const p of fitPts) {
        v.copy(p).project(camera);
        box.x = Math.max(box.x, Math.abs(v.x)); box.y0 = Math.min(box.y0, v.y); box.y1 = Math.max(box.y1, v.y);
      }
      dist *= Math.max(box.x / 0.97, (box.y1 - box.y0) / 1.94);
    }
    camera.position.copy(target).addScaledVector(dir, dist); camera.lookAt(target);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    let y0 = 1e9, y1 = -1e9;
    for (const p of fitPts) { v.copy(p).project(camera); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    camera.setViewOffset(w, h, 0, -(y0 + y1) / 2 * h / 2, w, h);
    draw();
  }

  // camadas selecionaveis
  const buttons = [...document.querySelectorAll('[data-terrain-layer]')];
  const pre = buttons.find(b => b.getAttribute('aria-pressed') === 'true');
  let active = pre ? Number(pre.dataset.terrainLayer) : -1;
  const clay = new THREE.Color(C.clay), claySide = new THREE.Color(C.claySide), white = new THREE.Color(C.white);
  const baseTop = C.layers.map(c => new THREE.Color(c)), baseSide = C.side.map(c => new THREE.Color(c));
  function select(i) {
    active = i;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.terrainLayer) === i)));
    kick();
  }
  buttons.forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.terrainLayer);
    select(i === active ? -1 : i);
  }));

  // arraste com inercia + giro infinito
  const AUTO = 0.16;
  let rot = -0.35, vel = AUTO, tilt = 0, dragging = false, lastX = 0, lastY = 0, lastT = 0;
  cv.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp; vel = 0;
    cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing';
  });
  cv.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dxp = e.clientX - lastX, dt = Math.max((e.timeStamp - lastT) / 1000, 0.008);
    const d = dxp * 0.0075; rot += d;
    vel = THREE.MathUtils.clamp(vel * 0.4 + (d / dt) * 0.6, -7, 7);
    if (e.pointerType === 'mouse') tilt = THREE.MathUtils.clamp(tilt + (e.clientY - lastY) * 0.003, -0.1, 0.24);
    lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp; kick();
  });
  const release = e => {
    if (!dragging) return;
    dragging = false; cv.style.cursor = 'grab';
    if (e.timeStamp - lastT > 90) vel = 0;
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => cv.addEventListener(n, release));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let time = 0, prev = 0, raf = 0, visible = true, live = false, autoDir = 1;

  function update(dt) {
    time += dt;
    if (!dragging) {
      if (Math.abs(vel) > AUTO) autoDir = Math.sign(vel);
      const goal = (reduce ? AUTO * 0.4 : AUTO) * autoDir;
      vel += (goal - vel) * (1 - Math.exp(-dt * 1.7));
      rot += vel * dt;
      tilt *= Math.exp(-dt * 1.2);
    }
    world.rotation.y = rot;
    world.rotation.x = tilt;
    const k = 1 - Math.exp(-dt * 7);
    layers.forEach((l, i) => {
      const on = i === active;
      l.lift += ((on ? LIFT : (active >= 0 && i > active ? LIFT * 1.55 : 0)) - l.lift) * k;
      l.mix += ((on ? 1 : 0) - l.mix) * k;
      l.g.position.y = l.base + l.lift;
      l.top.color.copy(baseTop[i]).lerp(clay, l.mix);
      l.side.color.copy(baseSide[i]).lerp(claySide, l.mix);
      l.top.emissive.copy(clay).multiplyScalar(0.16 * l.mix);
      l.lines.forEach(ln => ln.material.color.set(C.line).lerp(white, l.mix));
    });
    // o V acompanha o topo e fica sempre de frente, com leve balanco
    crownPivot.position.y = topY + layers[3].lift + 0.14 + (reduce ? 0 : Math.sin(time * 1.4) * 0.05);
    crownPivot.rotation.y = -rot + Math.sin(time * 0.55) * 0.42;
    for (let i = 0; i < N; i++) {
      const [a, r, y, s] = seeds[i], yy = (y + time * s) % 3;
      pos[i * 3] = Math.cos(a + time * 0.03) * r; pos[i * 3 + 1] = yy + 0.1; pos[i * 3 + 2] = Math.sin(a + time * 0.03) * r * 0.8;
    }
    pg.attributes.position.needsUpdate = true;
  }
  function draw() {
    renderer.render(scene, camera);
    if (!live) { live = true; el.classList.add('is-live'); }
  }
  function loop(t) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = prev ? Math.min((t - prev) / 1000, 0.05) : 0.016; prev = t;
    update(dt); draw();
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && visible && !document.hidden) { prev = 0; raf = requestAnimationFrame(loop); } }

  new ResizeObserver(frame).observe(el);
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(el);
  document.addEventListener('visibilitychange', kick);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); el.classList.remove('is-live'); live = false; });
  cv.addEventListener('webglcontextrestored', () => kick());
  update(0.016); frame(); kick();
}

const boot = () => {
  const el = document.getElementById('terrain3d');
  if (!el || el.dataset.terrainReady) return;
  el.dataset.terrainReady = '1';
  try { init(el); } catch (err) { el.querySelector('canvas')?.remove(); el.classList.remove('is-live'); console.warn('terrain3d:', err); }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
