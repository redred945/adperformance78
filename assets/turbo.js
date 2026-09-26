/* =============================================================
   AD PERFORMANCE — le turbo (Three.js, procédural)
   Aucun modèle importé : la roue de compresseur est calculée
   (moyeu en trompette, aubes arrière-courbées, aubes intermédiaires),
   éclairée par un petit studio d'environnement, avec des filets
   d'air aspirés vers l'inducteur. Le scroll pilote la caméra et le régime.
   ============================================================= */
import * as THREE from "./vendor/three.module.min.js";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/* ---------- profil méridien de la roue (r, y) — rayon extérieur R = 1 ---------- */
const hubR = (u) => 0.14 + 0.86 * Math.pow(u, 1.9);        /* moyeu : trompette */
const hubY = (u) => 0.10 + 0.85 * Math.pow(1 - u, 1.7);
const shR  = (u) => 0.56 + 0.44 * Math.pow(u, 1.5);        /* arête haute des aubes */
const shY  = (u) => 0.98 - 0.74 * Math.pow(u, 0.9);

/* ---------- géométrie d'une aube ---------- */
function buildBlade({ u0, thickness, wrap, nu, nv }) {
  const pos = [];
  const idx = [];

  const point = (u, v, side) => {
    const r = lerp(hubR(u), shR(u), v);
    const y = lerp(hubY(u), shY(u), v);
    const a = -wrap * Math.pow(u, 1.35);                    /* arrière-courbure */
    const w = (thickness * (1 - 0.45 * v)) / r * 0.5;       /* s'affine vers l'arête */
    const t = a + side * w;
    return [r * Math.cos(t), y, -r * Math.sin(t)];
  };

  /* chaque face a ses propres sommets : arêtes vives, pas de lissage parasite */
  const grid = (nA, nB, fn) => {
    const base = pos.length / 3;
    for (let i = 0; i < nA; i++) {
      for (let j = 0; j < nB; j++) pos.push(...fn(i / (nA - 1), j / (nB - 1)));
    }
    for (let i = 0; i < nA - 1; i++) {
      for (let j = 0; j < nB - 1; j++) {
        const a = base + i * nB + j, b = a + nB, c = b + 1, d = a + 1;
        idx.push(a, b, c, a, c, d);
      }
    }
  };
  const U = (a) => lerp(u0, 1, a);

  grid(nu, nv, (a, b) => point(U(a), b, -1));               /* intrados */
  grid(nu, nv, (a, b) => point(U(a), b, +1));               /* extrados */
  grid(2, nv, (a, b) => point(u0, b, a * 2 - 1));            /* bord d'attaque */
  grid(2, nv, (a, b) => point(1, b, a * 2 - 1));             /* bord de fuite */
  grid(nu, 2, (a, b) => point(U(a), 1, b * 2 - 1));          /* arête haute */

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------- moyeu (révolution) ---------- */
function buildHub() {
  const pts = [];
  pts.push(new THREE.Vector2(0, 1.045), new THREE.Vector2(0.05, 1.04), new THREE.Vector2(0.1, 1.01));
  const N = 44;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    pts.push(new THREE.Vector2(hubR(u), hubY(u)));
  }
  pts.push(
    new THREE.Vector2(1.0, 0.062), new THREE.Vector2(0.94, 0.018),
    new THREE.Vector2(0.5, 0.0), new THREE.Vector2(0.3, -0.04),
    new THREE.Vector2(0.3, -0.34), new THREE.Vector2(0, -0.34)
  );
  return new THREE.LatheGeometry(pts, 160);
}

/* ---------- studio d'environnement : réflexions du métal ---------- */
function buildEnvironment(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x090a0c, side: THREE.BackSide })
  ));
  const panel = (w, h, at, power) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(power), side: THREE.DoubleSide })
    );
    m.position.set(...at);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  panel(11, 3.2, [0, 9, 2], 16);        /* softbox du dessus */
  panel(2, 9, [-9, 2, 0], 12);          /* bande gauche */
  panel(1.4, 9, [9, 3, -3], 9);         /* bande droite, plus fine */
  panel(9, 1.1, [0, -2.5, -9], 6);      /* contre-jour bas */
  panel(3, 3, [0, 3, 10], 2.4);         /* remplissage face */
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.02);
  pm.dispose();
  return rt.texture;
}

function radialTexture(stops) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, a]) => grad.addColorStop(o, `rgba(255,255,255,${a})`));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- filets d'air : lignes aspirées en spirale vers l'inducteur ---------- */
function buildAirflow(count) {
  const seed = new Float32Array(count * 2 * 4);
  const end = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const r = 0.65 + Math.random() * 1.35;
    const ph = Math.random();
    const sp = 0.16 + Math.random() * 0.2;
    for (let k = 0; k < 2; k++) {
      const o = (i * 2 + k) * 4;
      seed[o] = a; seed[o + 1] = r; seed[o + 2] = ph; seed[o + 3] = sp;
      end[i * 2 + k] = k;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
  g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uSpin: { value: 0 } },
    vertexShader: /* glsl */`
      attribute vec4 aSeed; attribute float aEnd;
      uniform float uTime, uAmt, uSpin;
      varying float vA;
      void main() {
        float t  = fract(aSeed.z + uTime * aSeed.w * (0.6 + uAmt * 1.4));
        float tl = max(t - aEnd * (0.035 + 0.11 * uAmt), 0.0);
        float rad = mix(aSeed.y, 0.3, smoothstep(0.0, 1.0, tl));
        float ang = aSeed.x + tl * (1.2 + 5.5 * uSpin);
        float y   = mix(3.6, 0.95, tl);
        vec3 p = vec3(rad * cos(ang), y, -rad * sin(ang));
        vA = smoothstep(0.0, 0.18, tl) * (1.0 - smoothstep(0.82, 1.0, tl)) * (1.0 - aEnd) * uAmt;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() { gl_FragColor = vec4(vec3(1.0), vA * 0.6); }`
  });
  const lines = new THREE.LineSegments(g, m);
  lines.frustumCulled = false;
  return lines;
}

/* ---------- trajectoire de caméra : [progression, azimut°, élévation°, distance, cible Y, fov] ---------- */
const KEYS = [
  [0.00,  28, 13, 5.1, 0.42, 33],
  [0.50,  78, 32, 4.55, 0.44, 34],
  [1.00, 122, 68, 4.45, 0.42, 37]
];
function pathAt(p) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = smooth(clamp((p - a[0]) / (b[0] - a[0]), 0, 1));
  return [1, 2, 3, 4, 5].map((k) => lerp(a[k], b[k], t));
}

export function createTurbo(canvas, opts = {}) {
  const stage = opts.stage || canvas.parentElement;
  const still = !!opts.still;                     /* une seule image, sans boucle */
  const lowPower = !!opts.lowPower;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x08090b, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.environment = buildEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

  /* --- la roue --- */
  const wheel = new THREE.Group();
  scene.add(wheel);

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xdde1e6, metalness: 1, roughness: 0.2, side: THREE.DoubleSide, envMapIntensity: 1.25
  });
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x8a9099, metalness: 1, roughness: 0.3, envMapIntensity: 1.1
  });

  wheel.add(new THREE.Mesh(buildHub(), hubMat));
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.13, 6), bladeMat);
  nut.position.y = 1.07;
  wheel.add(nut);

  const N = 6;
  const full = buildBlade({ u0: 0, thickness: 0.026, wrap: 1.15, nu: 56, nv: 12 });
  const half = buildBlade({ u0: 0.36, thickness: 0.022, wrap: 1.15, nu: 40, nv: 10 });
  const mk = (geo, phase) => {
    const im = new THREE.InstancedMesh(geo, bladeMat, N);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      m.makeRotationY((i / N) * TAU + phase);
      im.setMatrixAt(i, m);
    }
    wheel.add(im);
  };
  mk(full, 0);
  mk(half, TAU / (N * 2));

  /* halo néon au niveau de la volute + flou de rotation */
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.17, 0.011, 10, 260), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.13;
  scene.add(ring);
  const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, toneMapped: false });
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.006, 8, 260), ring2Mat);
  ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.13;
  scene.add(ring2);

  const blurMat = new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 0], [0.16, 0], [0.34, 0.5], [0.94, 0.8], [1, 0]]),
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const blur = new THREE.Mesh(new THREE.CircleGeometry(1.02, 96), blurMat);
  blur.rotation.x = -Math.PI / 2; blur.position.y = 0.34;
  scene.add(blur);

  const glowMat = new THREE.SpriteMaterial({
    map: radialTexture([[0, 0.9], [0.25, 0.32], [0.6, 0.07], [1, 0]]),
    transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(7);
  scene.add(glow);

  const air = buildAirflow(lowPower ? 240 : 520);
  scene.add(air);

  /* --- état --- */
  let pT = opts.progress || 0, p = pT;      /* progression cible / lissée */
  let velT = 0, vel = 0;                    /* vitesse de scroll */
  let rot = 0, clock = 0, last = 0, raf = 0, active = false;
  let mouseX = 0, mouseXs = 0;
  let W = 1, H = 1, shift = { x: 0, y: 0 };
  let pr = 0, prMax = 1;                    /* résolution de rendu : baisse seule si ça rame */
  let ema = 0.016, adaptT = 0, warm = 0;

  const camPos = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  const resize = () => {
    const r = stage.getBoundingClientRect();
    W = Math.max(2, Math.round(r.width));
    H = Math.max(2, Math.round(r.height));
    prMax = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
    pr = Math.min(pr || prMax, prMax);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    /* même seuil que le CSS : au-dessus de 800px la copie est à gauche, la roue à droite */
    const side = window.innerWidth > 800 && !still;
    shift = side ? { x: -0.19 * W, y: 0 } : { x: 0, y: still ? 0 : 0.05 * H };
    camera.setViewOffset(W, H, shift.x, shift.y, W, H);
    /* on recule juste assez pour que la roue tienne dans la place qu'on lui laisse */
    const span = side ? 4.6 : still ? 4.4 : 2.5;              /* largeur de scène à cadrer */
    camera.userData.zoom = clamp(span / (0.611 * camera.aspect * 5.1), 1, 2.1);
    draw(0);
  };

  const draw = (dt) => {
    clock += dt;
    p += (pT - p) * (1 - Math.exp(-dt * 5.5));
    if (still) p = pT;
    velT *= Math.exp(-dt * 2.6);
    vel += (velT - vel) * (1 - Math.exp(-dt * 7));
    const boost = smooth(clamp(p, 0, 1));

    /* régime : monte avec la progression, pousse avec la vitesse de scroll */
    const omega = lerp(0.7, 8.5, boost) + clamp(vel, 0, 1.4) * 3.2;
    rot += omega * dt;
    wheel.rotation.y = rot;

    const [az, el, dist, ty, fov] = pathAt(p);
    const a = (az + mouseXs * 7 + clock * 1.2) * DEG;
    const e = el * DEG;
    const d = dist * (camera.userData.zoom || 1);
    camPos.set(d * Math.cos(e) * Math.sin(a), ty + d * Math.sin(e), d * Math.cos(e) * Math.cos(a));
    camera.position.copy(camPos);
    camera.lookAt(0, ty, 0);
    const f = fov + clamp(vel, 0, 1.4) * 3;
    if (Math.abs(camera.fov - f) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }

    /* lumière : tout monte avec le boost */
    ringMat.opacity = 0.32 + 0.6 * boost;
    ring2Mat.opacity = 0.08 + 0.3 * boost;
    blurMat.opacity = smooth(clamp((omega - 3.2) / 6, 0, 1)) * 0.36;
    glowMat.opacity = 0.14 + 0.5 * boost;
    air.material.uniforms.uTime.value = clock;
    air.material.uniforms.uAmt.value = 0.18 + 0.82 * boost;
    air.material.uniforms.uSpin.value = boost;
    hubMat.envMapIntensity = 1.0 + 0.5 * boost;

    /* le halo reste derrière la roue, vu de la caméra */
    camera.getWorldDirection(camDir);
    glow.position.set(0, 0.35, 0).addScaledVector(camDir, 1.7);

    renderer.render(scene, camera);
  };

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (now - last < 15) return;                 /* plafond ~60 i/s, inutile de dessiner à 144 Hz */
    const raw = (now - last) / 1000 || 0.016;
    const dt = Math.min(0.05, raw);
    last = now;
    /* qualité adaptative : après le chauffage des shaders, si la moyenne dépasse ~36 fps on descend d'un cran */
    warm += raw;
    if (warm > 1.5 && raw < 2.5) {
      ema += (raw - ema) * 0.06;
      adaptT += raw;
      if (adaptT > 1.2) {
        adaptT = 0;
        if (ema > 0.028 && pr > 0.55) {
          pr = Math.max(0.55, pr * 0.78);
          renderer.setPixelRatio(pr);
          renderer.setSize(W, H, false);
        }
      }
    }
    mouseXs += (mouseX - mouseXs) * (1 - Math.exp(-dt * 3));
    draw(dt);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  const onMove = (e) => { mouseX = (e.clientX / window.innerWidth - 0.5) * 2; };
  if (!still) window.addEventListener("pointermove", onMove, { passive: true });

  return {
    setProgress(v) { pT = clamp(v, 0, 1); if (still) draw(0); },
    setVelocity(v) { velT = Math.max(velT, Math.abs(v)); },
    setActive(on) {
      if (still || on === active) return;
      active = on;
      cancelAnimationFrame(raf);
      if (on) { last = performance.now(); raf = requestAnimationFrame(loop); }
    },
    resize
  };
}
