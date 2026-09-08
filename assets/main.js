(function () {
  "use strict";
  var docEl = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var anim = !reduce;

  /* ---------- intro : le logo qui s'allume (néon), une fois par session ----------
     L'animation dure 1.5s + 0.12s de retard = 1.62s. On enchaîne le fondu
     juste après, puis on retire le calque. ?neon dans l'URL force le rejeu. */
  var NEON_LIFT = 1700;   /* fin de l'animation -> on lève le calque */
  var NEON_KILL = 2160;   /* fin du fondu (.42s) -> on retire du DOM */
  var introPlayed = false;
  var neon = document.getElementById("neon");
  if (neon) {
    var replay = /[?&]neon\b/.test(location.search);
    var seen = false;
    try { seen = !replay && sessionStorage.getItem("adpNeon") === "1"; } catch (e) {}
    var killNeon = function () {
      if (neon && neon.parentNode) neon.parentNode.removeChild(neon);
      neon = null;
    };
    if (seen || reduce) {
      killNeon();
    } else {
      introPlayed = true;
      docEl.classList.remove("intro-done");
      try { sessionStorage.setItem("adpNeon", "1"); } catch (e) {}
      setTimeout(function () { if (neon) neon.classList.add("lift"); }, NEON_LIFT);
      setTimeout(killNeon, NEON_KILL);
      ["click", "touchstart", "keydown", "wheel"].forEach(function (ev) {
        window.addEventListener(ev, killNeon, { once: true, passive: true });
      });
    }
  }

  /* ---------- hero : les lettres du titre montent depuis sous la ligne ----------
     Découpage maison, sans dépendance. Le texte reste intact pour les
     lecteurs d'écran via aria-label ; sans JS le titre s'affiche normalement. */
  try {
    var h1 = document.querySelector(".hero h1");
    if (h1 && !reduce) {
      var full = h1.textContent.replace(/\s+/g, " ").trim();
      h1.setAttribute("aria-label", full);
      h1.classList.remove("shine");        /* le dégradé et le découpage ne cohabitent pas */
      h1.textContent = "";
      var n = 0;
      full.split(" ").forEach(function (word, wi, arr) {
        var w = document.createElement("span");
        w.className = "hw";
        w.setAttribute("aria-hidden", "true");
        for (var i = 0; i < word.length; i++) {
          var c = document.createElement("span");
          c.className = "hc";
          c.textContent = word[i];
          c.style.animationDelay = (n++ * 14) + "ms";
          w.appendChild(c);
        }
        h1.appendChild(w);
        if (wi < arr.length - 1) h1.appendChild(document.createTextNode(" "));
      });
      /* on démarre pendant que le voile du néon s'efface, sinon tout de suite */
      setTimeout(function () { h1.classList.add("go"); }, introPlayed ? NEON_LIFT + 250 : 60);
      /* filet : si le minuteur saute, le titre s'affiche quand même */
      setTimeout(function () { h1.classList.add("go"); }, 4000);
    }
  } catch (e) {
    var h1f = document.querySelector(".hero h1");
    if (h1f) h1f.classList.add("go");
  }

  /* ---------- reveals : filets de sécurité d'abord ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var revealAll = function () { for (var i = 0; i < reveals.length; i++) reveals[i].classList.add("in"); };
  var unlock = function () { docEl.classList.remove("anim"); revealAll(); };

  if (anim && reveals.length) {
    docEl.classList.add("anim");
    setTimeout(revealAll, 1600);
    window.addEventListener("scroll", function once() {
      revealAll();
      window.removeEventListener("scroll", once);
    }, { passive: true, once: true });
  } else {
    revealAll();
  }
  window.addEventListener("error", unlock);
  setTimeout(function () { window.removeEventListener("error", unlock); }, 8000);

  try {
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    var hd = document.getElementById("hd");
    var burger = document.getElementById("burger");
    var nav = document.getElementById("nav");
    var closeNav = function () { if (nav) nav.classList.remove("open"); if (burger) burger.setAttribute("aria-expanded", "false"); };
    if (burger && nav) {
      burger.addEventListener("click", function () { burger.setAttribute("aria-expanded", String(nav.classList.toggle("open"))); });
      nav.addEventListener("click", function (e) { if (e.target.tagName === "A") closeNav(); });
    }
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
    if (hd) {
      var onScroll = function () { hd.classList.toggle("stuck", window.scrollY > 28); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (anim && reveals.length && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    }

  } catch (err) {
    unlock();
  }

  /* ---------- carrousels : pastilles de pagination ---------- */
  var buildDots = function (scroller, itemList, dotsEl) {
    if (!scroller || !dotsEl || !itemList.length) return;
    itemList.forEach(function (it, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Aller a l'element " + (i + 1));
      b.addEventListener("click", function () {
        var d = it.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
        scroller.scrollBy({ left: d - 4, behavior: "smooth" });
      });
      dotsEl.appendChild(b);
    });
    var dots = dotsEl.children;
    var sync = function () {
      var mid = scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
      var best = 0, bd = Infinity;
      for (var i = 0; i < itemList.length; i++) {
        var r = itemList[i].getBoundingClientRect();
        var d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bd) { bd = d; best = i; }
      }
      for (var j = 0; j < dots.length; j++) dots[j].classList.toggle("on", j === best);
    };
    scroller.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  };

  /* ---------- réalisations : slider flèches + pastilles ---------- */
  var gwrap = document.querySelector(".gallery-slider .gwrap");
  var gtrack = document.getElementById("gtrack");
  var gprev = document.querySelector(".gnav.gprev");
  var gnext = document.querySelector(".gnav.gnext");
  var gitems = gtrack ? Array.prototype.slice.call(gtrack.querySelectorAll(".gitem")) : [];
  if (gwrap && gtrack && gprev && gnext) {
    var gstep = function () {
      var it = gtrack.querySelector(".gitem");
      var w = it ? it.getBoundingClientRect().width : 300;
      return (w + 16) * 2;
    };
    var gupd = function () {
      var max = gtrack.scrollWidth - gwrap.clientWidth - 4;
      gprev.disabled = gwrap.scrollLeft <= 4;
      gnext.disabled = gwrap.scrollLeft >= max;
    };
    gprev.addEventListener("click", function () { gwrap.scrollBy({ left: -gstep(), behavior: "smooth" }); });
    gnext.addEventListener("click", function () { gwrap.scrollBy({ left: gstep(), behavior: "smooth" }); });
    gwrap.addEventListener("scroll", gupd, { passive: true });
    window.addEventListener("resize", gupd);
    gupd();
  }
  if (gwrap) buildDots(gwrap, gitems, document.getElementById("galDots"));

  /* ---------- lightbox réalisations ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll("#gtrack .gitem"));
  var lb = document.getElementById("lb");
  var lbImg = document.getElementById("lbImg");
  var lbCap = document.getElementById("lbCap");
  if (lb && lbImg && items.length) {
    var idx = 0;
    var open = function (i) {
      idx = (i + items.length) % items.length;
      var it = items[idx], im = it.querySelector("img");
      lbImg.src = im.src; lbImg.alt = im.alt;
      var cap = it.querySelector("span");
      lbCap.textContent = cap ? cap.textContent : "";
      lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    var close = function () { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; };
    items.forEach(function (it, i) {
      it.setAttribute("tabindex", "0");
      it.addEventListener("click", function () { open(i); });
      it.addEventListener("keydown", function (e) { if (e.key === "Enter") open(i); });
    });
    var byId = function (id) { return document.getElementById(id); };
    if (byId("lbClose")) byId("lbClose").addEventListener("click", close);
    if (byId("lbPrev")) byId("lbPrev").addEventListener("click", function () { open(idx - 1); });
    if (byId("lbNext")) byId("lbNext").addEventListener("click", function () { open(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    window.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") open(idx - 1);
      else if (e.key === "ArrowRight") open(idx + 1);
    });
  }

  /* ---------- contact form (no backend) — brouillon e-mail ---------- */
  var form = document.getElementById("cform");
  var note = document.getElementById("fnote");
  if (form && note) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      note.className = "fnote"; note.textContent = "";
      var d = new FormData(form);
      var name = (d.get("name") || "").toString().trim();
      var email = (d.get("email") || "").toString().trim();
      var msg = (d.get("message") || "").toString().trim();
      if (!name || !msg || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        note.classList.add("err");
        note.textContent = "Merci d'indiquer votre nom, un e-mail valide et votre demande.";
        return;
      }
      var body = "Nom : " + name + "\n" +
        "E-mail : " + email + "\n" +
        "Telephone : " + ((d.get("phone") || "").toString().trim() || "-") + "\n" +
        "Vehicule : " + ((d.get("vehicle") || "").toString().trim() || "-") + "\n" +
        "Objectif : " + ((d.get("goal") || "").toString().trim() || "-") + "\n\n" + msg;
      window.location.href = "mailto:contact@adperformance78.fr?subject=" +
        encodeURIComponent("Demande de devis - " + name) + "&body=" + encodeURIComponent(body);
      note.classList.add("ok");
      note.textContent = "Votre messagerie va s'ouvrir avec la demande pre-remplie. Vous pouvez aussi nous ecrire en DM sur Instagram.";
      form.reset();
    });
  }
})();
