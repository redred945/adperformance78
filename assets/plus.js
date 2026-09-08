/* =============================================================
   AD PERFORMANCE — couche « plus »
   Autonome : remplace main.js sur cette page (néon, nav, lightbox,
   formulaire) et ajoute la couche animée GSAP + Lenis.
   ============================================================= */
(function () {
  "use strict";
  var docEl = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Intro néon (identique au site) ---------- */
  var NEON_LIFT = 1700, NEON_KILL = 2160;
  var neon = document.getElementById("neon");
  if (neon) {
    var replay = /[?&]neon\b/.test(location.search);
    var seen = false;
    try { seen = !replay && sessionStorage.getItem("adpNeon") === "1"; } catch (e) {}
    var killNeon = function () {
      if (neon && neon.parentNode) neon.parentNode.removeChild(neon);
      neon = null;
    };
    if (seen || reduce) killNeon();
    else {
      docEl.classList.remove("intro-done");
      try { sessionStorage.setItem("adpNeon", "1"); } catch (e) {}
      setTimeout(function () { if (neon) neon.classList.add("lift"); }, NEON_LIFT);
      setTimeout(killNeon, NEON_KILL);
      ["click", "touchstart", "keydown", "wheel"].forEach(function (ev) {
        addEventListener(ev, killNeon, { once: true, passive: true });
      });
    }
  }

  /* ---------- Base : année, header, nav, lightbox, formulaire ---------- */
  try {
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    var hd = document.getElementById("hd"),
        burger = document.getElementById("burger"),
        nav = document.getElementById("nav");
    var closeNav = function () {
      if (nav) nav.classList.remove("open");
      if (burger) burger.setAttribute("aria-expanded", "false");
    };
    if (burger && nav) {
      burger.addEventListener("click", function () {
        burger.setAttribute("aria-expanded", String(nav.classList.toggle("open")));
      });
      nav.addEventListener("click", function (e) { if (e.target.tagName === "A") closeNav(); });
    }
    addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
    if (hd) {
      var onScroll = function () { hd.classList.toggle("stuck", (window.scrollY || 0) > 28); };
      onScroll();
      addEventListener("scroll", onScroll, { passive: true });
    }
  } catch (e) {}

  /* lightbox */
  (function () {
    var items = [].slice.call(document.querySelectorAll("#gtrack .gitem"));
    var lb = document.getElementById("lb"),
        lbImg = document.getElementById("lbImg"),
        lbCap = document.getElementById("lbCap");
    if (!lb || !lbImg || !items.length) return;
    var idx = 0;
    var open = function (i) {
      idx = (i + items.length) % items.length;
      var im = items[idx].querySelector("img"), cap = items[idx].querySelector("span");
      lbImg.src = im.src; lbImg.alt = im.alt;
      lbCap.textContent = cap ? cap.textContent : "";
      lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    var close = function () {
      lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };
    items.forEach(function (it, i) {
      it.setAttribute("tabindex", "0");
      it.addEventListener("click", function () { open(i); });
      it.addEventListener("keydown", function (e) { if (e.key === "Enter") open(i); });
    });
    var by = function (id) { return document.getElementById(id); };
    if (by("lbClose")) by("lbClose").addEventListener("click", close);
    if (by("lbPrev")) by("lbPrev").addEventListener("click", function () { open(idx - 1); });
    if (by("lbNext")) by("lbNext").addEventListener("click", function () { open(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") open(idx - 1);
      else if (e.key === "ArrowRight") open(idx + 1);
    });
  })();

  /* carrousel mobile : flèches + pastilles (le rail épinglé prend le relais en desktop) */
  (function () {
    var wrap = document.querySelector(".gallery-slider .gwrap"),
        track = document.getElementById("gtrack"),
        prev = document.querySelector(".gnav.gprev"),
        next = document.querySelector(".gnav.gnext");
    if (!wrap || !track || !prev || !next) return;
    var step = function () {
      var it = track.querySelector(".gitem");
      return ((it ? it.getBoundingClientRect().width : 300) + 16) * 2;
    };
    var upd = function () {
      var max = track.scrollWidth - wrap.clientWidth - 4;
      prev.disabled = wrap.scrollLeft <= 4;
      next.disabled = wrap.scrollLeft >= max;
    };
    prev.addEventListener("click", function () { wrap.scrollBy({ left: -step(), behavior: "smooth" }); });
    next.addEventListener("click", function () { wrap.scrollBy({ left: step(), behavior: "smooth" }); });
    wrap.addEventListener("scroll", upd, { passive: true });
    addEventListener("resize", upd);
    upd();
  })();

  /* formulaire (page contact seulement) */
  (function () {
    var form = document.getElementById("cform"), note = document.getElementById("fnote");
    if (!form || !note) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      note.className = "fnote"; note.textContent = "";
      var d = new FormData(form);
      var name = (d.get("name") || "").toString().trim(),
          email = (d.get("email") || "").toString().trim(),
          msg = (d.get("message") || "").toString().trim();
      if (!name || !msg || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.classList.add("err");
        note.textContent = "Merci d'indiquer votre nom, un e-mail valide et votre demande.";
        return;
      }
      var body = "Nom : " + name + "\nE-mail : " + email +
        "\nTelephone : " + ((d.get("phone") || "").toString().trim() || "-") +
        "\nVehicule : " + ((d.get("vehicle") || "").toString().trim() || "-") +
        "\nObjectif : " + ((d.get("goal") || "").toString().trim() || "-") + "\n\n" + msg;
      location.href = "mailto:contact@adperformance78.fr?subject=" +
        encodeURIComponent("Demande de devis - " + name) + "&body=" + encodeURIComponent(body);
      note.classList.add("ok");
      note.textContent = "Votre messagerie va s'ouvrir avec la demande pre-remplie.";
      form.reset();
    });
  })();

  /* ---------- Couche animée ---------- */
  addEventListener("load", function () {
    if (reduce || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    /* Lenis, câblé sur le ticker GSAP pour n'avoir qu'une horloge */
    if (typeof Lenis !== "undefined") {
      var lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener("click", function (e) {
          var el = document.querySelector(a.getAttribute("href"));
          if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -80 }); }
        });
      });
    }

    /* 1 — hero : parallaxe du fond + titre lettre par lettre */
    var bg = document.querySelector(".hero-bg");
    if (bg) gsap.to(bg, {
      yPercent: 10, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    var h1 = document.querySelector(".hero h1");
    if (h1 && typeof SplitType !== "undefined") {
      h1.classList.remove("shine");
      var sp = new SplitType(h1, { types: "lines,chars" });
      gsap.set(h1, { opacity: 1 });
      gsap.from(sp.chars, {
        yPercent: 110, opacity: 0, duration: .85, ease: "power3.out",
        stagger: { each: .014 }, delay: neon ? 1.9 : .25
      });
    }
    gsap.from(".hero .eyebrow, .hero-sub, .hero-links", {
      y: 18, opacity: 0, duration: .8, ease: "power2.out",
      stagger: .1, delay: neon ? 2.15 : .5
    });

    /* 2 — médias de section : volet + parallaxe interne */
    gsap.utils.toArray(".axis-media").forEach(function (fig) {
      var img = fig.querySelector("img");
      gsap.fromTo(fig,
        { clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power3.out",
          scrollTrigger: { trigger: fig, start: "top 82%" } });
      if (img) gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6, ease: "none",
        scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    /* 3 — copies de section : montée en cascade */
    gsap.utils.toArray(".axis-copy").forEach(function (c) {
      gsap.from(c.children, {
        y: 22, opacity: 0, duration: .7, ease: "power2.out", stagger: .07,
        scrollTrigger: { trigger: c, start: "top 80%" }
      });
    });
    gsap.utils.toArray(".gallery-head, .sinistre .narrow, .cta .narrow").forEach(function (c) {
      gsap.from(c.children, {
        y: 22, opacity: 0, duration: .7, ease: "power2.out", stagger: .08,
        scrollTrigger: { trigger: c, start: "top 84%" }
      });
    });

    /* 4 — réalisations : rail horizontal épinglé (desktop) */
    var mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", function () {
      var gal = document.querySelector(".gallery");
      var track = document.getElementById("gtrack");
      var bar = document.querySelector(".rail-bar i");
      if (!gal || !track) return;
      gal.classList.add("pinned");
      ScrollTrigger.refresh();
      var dist = function () {
        return Math.max(0, track.scrollWidth - window.innerWidth + 40);
      };
      gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: gal, start: "top top", end: function () { return "+=" + dist(); },
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { if (bar) bar.style.width = (self.progress * 100).toFixed(1) + "%"; }
        }
      });
      return function () { gal.classList.remove("pinned"); };
    });

    /* 5 — déroulé : le trait se dessine entre les étapes */
    var line = document.querySelector(".steps-line i");
    if (line) gsap.to(line, {
      width: "100%", ease: "none",
      scrollTrigger: { trigger: ".steps", start: "top 78%", end: "bottom 70%", scrub: .5 }
    });
    gsap.utils.toArray(".steps li").forEach(function (li, i) {
      gsap.from(li, {
        y: 26, opacity: 0, duration: .6, ease: "power2.out", delay: i * .09,
        scrollTrigger: { trigger: ".steps", start: "top 80%" }
      });
    });
  });

  /* ---------- CTA : nappe WebGL, desktop uniquement, chargée à l'approche ---------- */
  (function () {
    var host = document.querySelector(".cta"), cv = document.getElementById("ctaGl");
    if (!host || !cv || reduce || innerWidth < 900) return;
    /* Détection par position : l'IntersectionObserver est inerte dans
       certains navigateurs embarqués, on ne veut pas d'un canvas noir. */
    var near = function (m) {
      var r = host.getBoundingClientRect();
      return r.top < innerHeight + m && r.bottom > -m;
    };
    var started = false;
    var boot = function () {
      if (started || !near(500)) return;
      started = true;
      removeEventListener("scroll", boot);
      import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js")
        .then(function (THREE) {
          var rnd = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true });
          rnd.setPixelRatio(Math.min(devicePixelRatio, 1.5));
          var scene = new THREE.Scene();
          var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
          var uni = {
            uT: { value: 0 },
            uR: { value: new THREE.Vector2(1, 1) },
            uM: { value: new THREE.Vector2(.25, .5) }
          };
          scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
            uniforms: uni, transparent: true,
            vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.); }",
            fragmentShader: [
              "precision highp float;",
              "uniform float uT; uniform vec2 uR; uniform vec2 uM; varying vec2 vUv;",
              "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }",
              "float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);",
              "  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }",
              "float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }",
              "void main(){",
              "  float ar = uR.x / uR.y;",
              "  vec2 p = (vUv - .5) * vec2(ar, 1.);",
              "  float t = uT * .045;",
              "  float beams = pow(fbm(vec2(p.x * 1.7 + t, p.y * .7 - t * .5)), 2.6);",
              "  vec2 m = (uM - .5) * vec2(ar, 1.) * 2.;",
              "  float glow = smoothstep(1.0, 0., length(p - m)) * .22;",
              "  float v = beams * .5 + glow;",
              "  v *= smoothstep(1.45, .15, length(p));",
              "  gl_FragColor = vec4(vec3(1.), v);",
              "}"
            ].join("\n")
          })));
          var fit = function () {
            var w = host.clientWidth, h = host.clientHeight;
            rnd.setSize(w, h, false); uni.uR.value.set(w, h);
          };
          fit(); addEventListener("resize", fit);
          host.addEventListener("pointermove", function (ev) {
            var r = host.getBoundingClientRect();
            uni.uM.value.set((ev.clientX - r.left) / r.width, 1 - (ev.clientY - r.top) / r.height);
          });
          var clock = new THREE.Clock();
          rnd.setAnimationLoop(function () {
            if (!near(0)) return;
            uni.uT.value = clock.getElapsedTime();
            rnd.render(scene, cam);
          });
          cv.classList.add("on");
        })
        .catch(function () { /* le halo CSS reste en place */ });
    };
    addEventListener("scroll", boot, { passive: true });
    boot();
  })();
})();
