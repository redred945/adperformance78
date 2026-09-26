/* =============================================================
   AD PERFORMANCE — mouvement (Lenis + GSAP + Three)
   Couche additive : le site fonctionne sans elle. Si une lib ne charge
   pas, ou si le visiteur demande moins de mouvement, on retombe sur la
   version statique (main.js + CSS) sans rien casser.
   ============================================================= */
(function () {
  "use strict";
  var docEl = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var boostEl = document.getElementById("boost");
  var canvas = document.getElementById("turbo");
  var clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };

  var hasWebGL = function () {
    try {
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) return false;
      var lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  };
  var webgl = !!(boostEl && canvas) && hasWebGL();

  /* ---------- sans mouvement : une image 3D fixe, ou la version texte ---------- */
  var still = function () {
    if (!webgl) return;
    docEl.classList.add("boost-still");
    import("./turbo.js?v=23").then(function (m) {
      m.createTurbo(canvas, { stage: boostEl.querySelector(".boost-view"), still: true, progress: 0.62, lowPower: true });
      canvas.classList.add("ready");
    }).catch(function () { docEl.classList.remove("boost-still"); });
  };

  var gsap = window.gsap, ST = window.ScrollTrigger, Lenis = window.Lenis, SplitText = window.SplitText;
  if (reduce || !gsap || !ST || !Lenis) {
    docEl.classList.remove("m");
    still();
    return;
  }
  if (boostEl && !webgl) docEl.classList.add("boost-flat");

  gsap.registerPlugin(ST, SplitText);
  ST.config({ ignoreMobileResize: true });
  docEl.classList.add("m-ok");

  /* ---------- Lenis : défilement fluide, branché sur le ticker GSAP ---------- */
  var lenis = new Lenis({
    duration: 1.15,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true
  });
  window.ADP = window.ADP || {}; window.ADP.lenis = lenis;
  lenis.on("scroll", ST.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);
  window.addEventListener("adp:lock", function () { lenis.stop(); });
  window.addEventListener("adp:unlock", function () { lenis.start(); });

  /* ancres : glissé Lenis plutôt que saut natif */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id.length < 2) return;
    var target = id === "#top" ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.7 });
    try { history.replaceState(null, "", id); } catch (err) {}
  });

  /* ---------- barre de progression de lecture ---------- */
  var bar = document.createElement("div");
  bar.className = "pbar";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.25 } });

  /* ---------- hero : entrée après le néon, parallaxe scroll + souris ---------- */
  var hero = document.querySelector(".hero");
  if (hero) {
    var bg = hero.querySelector(".hero-bg");
    var eyebrow = hero.querySelector(".eyebrow");
    var rest = hero.querySelectorAll(".hero-sub, .hero-links");
    var wait = window.ADP && window.ADP.introPlayed ? (window.ADP.neonLift + 120) / 1000 : 0;

    gsap.timeline({ delay: wait })
      .fromTo(bg, { scale: 1.2 }, { scale: 1.06, duration: 2.4, ease: "power3.out" }, 0)
      .fromTo(eyebrow, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" }, 0.1)
      .fromTo(rest, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" }, 1.0);

    gsap.to(bg, {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(hero.querySelector(".hero-text"), {
      yPercent: -14, autoAlpha: 0, ease: "none",
      scrollTrigger: { trigger: hero, start: "25% top", end: "bottom 15%", scrub: true }
    });

    if (fine) {
      var qx = gsap.quickTo(bg, "x", { duration: 1.3, ease: "power3" });
      var qy = gsap.quickTo(bg, "y", { duration: 1.3, ease: "power3" });
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        qx(((e.clientX - r.left) / r.width - 0.5) * -26);
        qy(((e.clientY - r.top) / r.height - 0.5) * -16);
      });
      hero.addEventListener("pointerleave", function () { qx(0); qy(0); });
    }
  }

  /* ---------- bandeau marques : la vitesse de scroll pousse le défilement ---------- */
  var track = document.querySelector(".marque-track");
  if (track) {
    docEl.classList.add("marq-js");
    var half = 0, mx = 0, speed = 46, dir = 1, dirT = 1;
    var setX = gsap.quickSetter(track, "x", "px");
    var setSk = gsap.quickSetter(track, "skewX", "deg");
    var measure = function () { half = track.scrollWidth / 2; };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    gsap.ticker.add(function (time, dtMs) {
      var v = lenis.velocity || 0;
      speed += (46 + Math.min(Math.abs(v), 90) * 13 - speed) * 0.08;
      if (v < -0.6) dirT = -1; else if (v > 0.6) dirT = 1;
      dir += (dirT - dir) * 0.07;
      if (half) {
        mx = (((mx + speed * dir * dtMs / 1000) % half) + half) % half;
        setX(-mx);
      }
      setSk(clamp(-v * 0.22, -7, 7));
    });
  }

  /* ---------- titres : lignes qui montent depuis un masque ---------- */
  var heads = document.querySelectorAll(".axis-copy h2, .gallery-head h2, .narrow h2, .boost h2");
  var splitHeads = function () {
    heads.forEach(function (h) {
      SplitText.create(h, {
        type: "lines", mask: "lines", linesClass: "sl", autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, {
            yPercent: 112, duration: 1.05, ease: "power4.out", stagger: 0.09,
            scrollTrigger: { trigger: h, start: "top 88%", once: true }
          });
        }
      });
    });
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(splitHeads); else splitHeads();

  /* ---------- photos : fenêtre qui s'ouvre + léger dézoom ---------- */
  gsap.utils.toArray(".axis-media").forEach(function (fig) {
    var img = fig.querySelector("img");
    gsap.fromTo(fig,
      { clipPath: "inset(14% 10% 14% 10% round 18px)" },
      { clipPath: "inset(0% 0% 0% 0% round 18px)", ease: "none",
        scrollTrigger: { trigger: fig, start: "top 94%", end: "top 42%", scrub: true } });
    /* la photo se pose de 1.08 à 1 : elle finit entière, jamais rognée */
    if (img) {
      gsap.fromTo(img, { scale: 1.08 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: fig, start: "top 94%", end: "top 30%", scrub: true }
      });
    }
  });

  /* ---------- réalisations : entrée en perspective + tilt 3D + reflet ---------- */
  var cards = gsap.utils.toArray(".gitem");
  if (cards.length) {
    gsap.set(cards, { transformPerspective: 900 });
    gsap.from(cards, {
      autoAlpha: 0, x: 110, rotationY: -26, transformOrigin: "0% 50%",
      duration: 1.1, ease: "power3.out", stagger: 0.07,
      scrollTrigger: { trigger: ".gallery-slider", start: "top 84%", once: true }
    });
    if (fine) {
      cards.forEach(function (c) {
        var rx = gsap.quickTo(c, "rotationX", { duration: 0.5, ease: "power3" });
        var ry = gsap.quickTo(c, "rotationY", { duration: 0.5, ease: "power3" });
        c.addEventListener("pointermove", function (e) {
          var r = c.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          ry((px - 0.5) * 15);
          rx(-(py - 0.5) * 15);
          c.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
          c.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
        });
        c.addEventListener("pointerleave", function () { rx(0); ry(0); });
      });
    }
  }

  /* ---------- déroulé : les pastilles se retournent ---------- */
  if (document.querySelector(".steps")) {
    gsap.from(".steps li > span", {
      rotationY: -100, autoAlpha: 0, transformPerspective: 600,
      duration: 0.95, ease: "back.out(1.5)", stagger: 0.14,
      scrollTrigger: { trigger: ".steps", start: "top 84%", once: true }
    });
  }

  /* ---------- CTA : la lumière suit le pointeur ---------- */
  var cta = document.querySelector(".cta");
  if (cta && fine) {
    cta.addEventListener("pointermove", function (e) {
      var r = cta.getBoundingClientRect();
      cta.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      cta.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    });
  }

  /* ---------- boutons magnétiques ---------- */
  if (fine) {
    document.querySelectorAll(".btn, .nav-cta").forEach(function (el) {
      var qx = gsap.quickTo(el, "x", { duration: 0.7, ease: "elastic.out(1, 0.6)" });
      var qy = gsap.quickTo(el, "y", { duration: 0.7, ease: "elastic.out(1, 0.6)" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.28);
        qy((e.clientY - (r.top + r.height / 2)) * 0.28);
      });
      el.addEventListener("pointerleave", function () { qx(0); qy(0); });
    });
  }

  /* ---------- sous le capot : le turbo (Three) piloté par le scroll ---------- */
  if (boostEl && webgl) {
    var steps = Array.prototype.slice.call(boostEl.querySelectorAll(".boost-steps li"));
    var fill = document.getElementById("boostFill");
    var stage = -1, prog = 0, turbo = null, live = false;

    var setStage = function (i) {
      if (i === stage) return;
      stage = i;
      steps.forEach(function (li, k) {
        li.classList.toggle("on", k === i);
        li.classList.toggle("past", k < i);
      });
    };
    var onProgress = function (p) {
      prog = p;
      setStage(p < 0.34 ? 0 : p < 0.68 ? 1 : 2);
      if (fill) fill.style.transform = "scaleX(" + p.toFixed(3) + ")";
      if (turbo) turbo.setProgress(p);
    };

    ST.create({
      trigger: boostEl, start: "top top", end: "bottom bottom",
      onUpdate: function (s) { onProgress(s.progress); },
      onRefresh: function (s) { onProgress(s.progress); }
    });
    ST.create({
      trigger: boostEl, start: "top bottom", end: "bottom top",
      onToggle: function (s) { live = s.isActive; if (turbo) turbo.setActive(live); }
    });
    lenis.on("scroll", function () { if (turbo) turbo.setVelocity(Math.abs(lenis.velocity) / 40); });

    var lowPower = window.matchMedia("(max-width: 800px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
    var boot = function () {
      import("./turbo.js?v=23").then(function (m) {
        turbo = m.createTurbo(canvas, {
          stage: boostEl.querySelector(".boost-view"), lowPower: lowPower, progress: prog
        });
        canvas.classList.add("ready");
        turbo.setActive(live);
      }).catch(function () {
        docEl.classList.add("boost-flat");
        ST.refresh();
      });
    };
    var kick = function () {
      if ("requestIdleCallback" in window) requestIdleCallback(boot, { timeout: 2500 });
      else setTimeout(boot, 800);
    };
    if (document.readyState === "complete") kick(); else window.addEventListener("load", kick, { once: true });
  }

  /* les images « lazy » changent les hauteurs : on recale les repères */
  window.addEventListener("load", function () { ST.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
})();
