/* Home page only: hero video, the About scroll scene, and the 3D beer stage. */
(() => {
  "use strict";
  const D = window.RM_DATA;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;

  /* =====================================================================
     HERO VIDEO
     Plays hero-intro (the tag being painted) once, then hero-loop forever.
     Files come from Google Flow (see ../flow-video/FLOW-BRIEF.md). Until they
     exist, or with reduced motion / data saver, the poster (end frame) shows.
     ===================================================================== */
  (function heroVideo() {
    const v = $("[data-hero-video]"); if (!v) return;
    const fmt = () => (innerWidth / innerHeight < 0.8 ? "9x16" : "16x9");
    const f = fmt();
    if (f === "9x16") v.poster = "assets/video/hero-poster-portrait.webp";
    if (reduce || saveData || !D.heroVideo) return;
    // with a video, start from its own first frame instead of the painted-wall still
    v.poster = f === "9x16" ? "assets/video/hero-video-poster-portrait.webp" : "assets/video/hero-video-poster.webp";
    const btn = $("[data-video-toggle]");
    const canWebm = v.canPlayType('video/webm; codecs="vp9"');
    // same build version as the css/js links, so a rebuilt video is never served from the browser cache
    const ver = ((document.querySelector('script[src*="home.js?v="]') || {}).src || "").split("v=")[1] || Date.now();
    const src = name => `assets/video/hero-${name}-${f}.${canWebm ? "webm" : "mp4"}?v=${ver}`;
    const queue = D.heroLoop ? ["intro", "loop"] : ["intro"]; // no loop clip yet: hold on the intro's last frame
    let userPaused = false;
    /* sound: browsers only autoplay muted video, so it starts silent and the visitor turns sound on (remembered for the visit).
       The volume fades in rather than jumping, and the video pauses itself (so goes quiet) when scrolled off screen. */
    const sndBtn = $("[data-video-sound]");
    const soundWanted = () => { try { return sessionStorage.getItem("rm-sound") === "1"; } catch (e) { return false; } };
    let fadeRaf = 0;
    function setSound(on, quiet) {
      cancelAnimationFrame(fadeRaf);
      if (on) {
        v.muted = false; v.volume = 0;
        const t0 = performance.now(), step = t => { const k = Math.min((t - t0) / 700, 1); v.volume = k * k; if (k < 1) fadeRaf = requestAnimationFrame(step); };
        fadeRaf = requestAnimationFrame(step);
        if (v.paused && !userPaused) v.play().catch(() => { v.muted = true; on = false; });
      } else { v.muted = true; }
      if (sndBtn) { sndBtn.setAttribute("aria-pressed", on); sndBtn.classList.toggle("is-on", on); $(".snd-label", sndBtn).textContent = on ? "Sound off" : "Sound on"; }
      if (!quiet) { try { sessionStorage.setItem("rm-sound", on ? "1" : "0"); } catch (e) {} }
    }
    if (sndBtn) sndBtn.addEventListener("click", () => setSound(v.muted));

    function load(name) {
      v.loop = name === "loop";
      v.src = src(name);
      v.play().then(() => { btn.hidden = false; if (sndBtn) sndBtn.hidden = false; v.classList.add("is-playing"); if (soundWanted()) setSound(true, true); }).catch(() => {});
    }
    v.addEventListener("error", () => {
      // webm missing? try mp4 once, then move down the queue
      if (/\.webm(\?|$)/.test(v.src)) { v.src = v.src.replace(/\.webm(\?|$)/, ".mp4$1"); v.play().catch(() => {}); return; }
      queue.shift(); if (queue.length) load(queue[0]);
    }, true);
    v.addEventListener("ended", () => {
      if (queue[0] === "intro" && queue.length > 1) { queue.shift(); load("loop"); return; }
      // held on the last frame (the can mid-throw): the button becomes Replay
      $(".pz-label", btn).textContent = "Replay"; btn.classList.add("is-paused"); btn.setAttribute("aria-pressed", "false");
    });
    v.addEventListener("play", () => { $(".pz-label", btn).textContent = "Pause video"; btn.classList.remove("is-paused"); });
    // end line "Brewed in Kandivali. Thrown in Andheri." sprays on as the can flies at the camera
    const tag = $(".vhero-tag");
    // decode the text images now, so showing them later costs nothing (no hitch in the video)
    if (tag) $$("img", tag).forEach(i => { if (i.decode) i.decode().catch(() => {}); });
    v.addEventListener("timeupdate", () => {
      if (!tag || !v.duration || queue[0] !== "intro") return;
      if (v.currentTime >= v.duration - 1.4) tag.classList.add("on");
      else if (v.currentTime < 1) tag.classList.remove("on");
    });
    btn.addEventListener("click", () => {
      userPaused = !v.paused;
      if (userPaused) v.pause(); else v.play();
      btn.setAttribute("aria-pressed", userPaused);
      $(".pz-label", btn).textContent = userPaused ? "Play video" : "Pause video";
      btn.classList.toggle("is-paused", userPaused);
    });
    // don't burn battery when the hero is off screen
    new IntersectionObserver(([e]) => { if (!v.src || userPaused) return; e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }, { threshold: 0.1 }).observe(v);
    // start painting only once the loader and age check are out of the way
    if (window.RM_READY) load("intro"); else document.addEventListener("rm:ready", () => load("intro"), { once: true });
  })();

  /* ---------- navigation bar: hidden over the hero video, shown as soon as the visitor scrolls ---------- */
  (function navOnScroll() {
    // only touch the body class when the state flips (a class change on <body> restyles the whole page)
    let on = null;
    const set = () => { const v = scrollY > 8; if (v !== on) { on = v; document.body.classList.toggle("nav-in", v); } };
    addEventListener("scroll", set, { passive: true }); set();
  })();

  /* ---------- About background: GridScan (Jai's settings) ---------- */
  (function gridScan() {
    const el = $(".about-grid"); if (!el || !window.GridScan) return;
    GridScan(el, { sensitivity: 0.55, lineThickness: 1, linesColor: "#2F293A", gridScale: 0.1, scanColor: "#FF9FFC", scanOpacity: 0.4,
      bloomIntensity: 0.6, noiseIntensity: 0.01, lineJitter: 0.1, scanGlow: 0.5, scanSoftness: 2,
      scanDuration: 1.2, scanDelay: 0.8 });   // faster light (Jai): a pass every 2 s instead of 4 s
  })();

  /* =====================================================================
     ABOUT: the section is pinned; rows slide sideways and the pasted
     photos swap as you scroll through it (after Soul Street).
     ===================================================================== */
  (function aboutScene() {
    const sec = $(".about"); if (!sec || !$(".arow", sec)) return;   // the scroll scene only runs if the rows exist
    if (reduce) { sec.classList.add("is-static"); return; }
    const rows = $$(".arow", sec), cards = $$(".acard", sec);
    rows.forEach(r => { r.innerHTML += r.innerHTML; }); // 4 copies, so a row never runs out of words
    let ticking = false, current = 0;
    function update() {
      ticking = false;
      const r = sec.getBoundingClientRect(), total = sec.offsetHeight - innerHeight;
      const p = Math.min(Math.max(-r.top / total, 0), 1);
      rows.forEach(row => { row.style.transform = `translate3d(${-40 + p * 15 * Number(row.dataset.speed)}%,0,0)`; });
      const i = Math.min(cards.length - 1, Math.floor(p * cards.length * 0.999));
      if (i !== current) { cards[current].classList.remove("is-on"); cards[i].classList.add("is-on"); current = i; }
    }
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", update);
    update();
  })();

  /* ---------- What's on? title: fuzzy outlined text ---------- */
  (function fuzzyTitle() {
    const sec = $(".won"), cv = $(".won-fuzz"); if (!sec || !cv || !window.FuzzyText) return;
    sec.classList.add("has-fuzz");
    // graffiti font, solid white with a hard dark shadow; light fuzz so it stays readable over the wall
    FuzzyText(cv, { text: "What's on?", fontSize: "clamp(4.6rem, 13vw, 11rem)", fontFamily: '"Sedgwick Ave Display"', color: "#ffffff",
      shadow: { color: "rgba(0,0,0,.9)", blur: 0, x: 0, y: 7 },
      baseIntensity: 0.07, hoverIntensity: 0.35, fuzzRange: 26, letterSpacing: 2 });
  })();

  /* ---------- What's on? cards: live beer count and the next event ---------- */
  (function whatsOn() {
    const words = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
    const n = D.beers.filter(b => b.status === "on-tap").length;
    const bw = $("[data-won-beers]"); if (bw) bw.textContent = words[n] || String(n);
    const nx = $("[data-won-next]"); if (!nx) return;
    const stamp = s => { const [d, t] = s.split("T"); const [y, m, dd] = d.split("-").map(Number); const [h, mi] = t.split(":").map(Number); return Date.UTC(y, m - 1, dd, h, mi) - 330 * 60000; };
    const next = D.events.filter(e => stamp(e.end) > Date.now()).sort((a, b) => stamp(a.start) - stamp(b.start))[0];
    if (!next) { nx.textContent = "New dates coming soon."; return; }
    const dt = new Date(next.start.slice(0, 10) + "T00:00:00");
    const day = dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    nx.textContent = `Next up: ${next.title}, ${day}${next.sample ? " (sample)" : ""}`;
  })();

  /* =====================================================================
     BEER STAGE: one can at a time, details either side (after BrewDistrict24).
     The can is a Three.js render wrapped in the beer's real label art.
     ===================================================================== */
  (function beerStage() {
    const stage = $("[data-stage]"); if (!stage) return;
    const sec = $(".bstage");
    const beers = D.beers;
    const canvas = $(".bs-canvas", stage), fallback = $(".bs-fallback", stage);
    const pad = n => String(n).padStart(2, "0");
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const foodBy = slug => [...D.food, ...D.softDrinks].find(f => f.slug === slug);
    let idx = 0;

    // BrewDistrict24-style switch: the next beer's colour grows as a circle from the centre,
    // the can spins, the copy fades out and back in. Only clip-path/opacity animate.
    const wipe = document.createElement("div"); wipe.className = "bs-wipe"; wipe.setAttribute("aria-hidden", "true"); sec.prepend(wipe);
    let wipeTimer = 0;
    function startWipe(b) {
      clearTimeout(wipeTimer);
      sec.style.setProperty("--hl", b.hl);
      if (reduce) { sec.style.setProperty("--bg", b.bg); return; }
      wipe.style.backgroundColor = b.bg; wipe.classList.remove("run"); void wipe.offsetWidth; wipe.classList.add("run");
      stage.classList.add("bs-out");
      wipeTimer = setTimeout(() => { sec.style.setProperty("--bg", b.bg); wipe.classList.remove("run"); }, 900);
    }
    // light labels only where they stay readable (white on the bg >= 3:1); otherwise switch the labels to dark
    const lum = hx => { const v = [1, 3, 5].map(i => parseInt(hx.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const needsDark = hx => 1.05 / (lum(hx) + .05) < 3;
    function setInfo(b, first) {
      sec.classList.toggle("bs-dark-labels", needsDark(b.bg));
      if (first) { sec.style.setProperty("--bg", b.bg); sec.style.setProperty("--hl", b.hl); }
      stage.classList.remove("bs-out");
      $("[data-bs-style]").textContent = b.style;
      $("[data-bs-name]").textContent = b.name;
      $("[data-bs-abv]").textContent = `Alc ${b.abv}% vol · ${b.sizes[0][0]}`;
      $("[data-bs-desc]").textContent = b.desc;
      const tl = $("[data-bs-tagline]"); if (tl) tl.textContent = b.tagline || b.style;
      const sm = $("[data-bs-small]"); if (sm) sm.textContent = b.status === "cans" ? "Cans to take home" : "Fresh from our brewhouse";
      const pair = b.pairs && foodBy(b.pairs);
      $("[data-bs-specs]").innerHTML =
        `<div><dt>Size</dt><dd>${esc(b.sizes[0][0])}</dd></div>` +
        `<div><dt>Price</dt><dd>₹${b.sizes[0][1].toLocaleString("en-IN")}</dd></div>` +
        `<div><dt>Style</dt><dd>${esc(b.group)}</dd></div>` +
        (pair ? `<div><dt>Pairs with</dt><dd><a href="menu.html?tab=food&amp;item=${pair.slug}">${esc(pair.name)}</a></dd></div>` : "");
      $("[data-bs-details]").href = `on-tap.html#${b.slug}`;
      $("[data-bs-i]").textContent = pad(idx + 1);
      $("[data-bs-n]").textContent = pad(beers.length);
      $("[data-bs-label]").textContent = b.name;
      const w = $("[data-bs-word]"); if (w) { w.textContent = b.name; w.classList.remove("swap"); void w.offsetWidth; w.classList.add("swap"); }
      ["[data-bs-name]", "[data-bs-desc]"].forEach(s => { const el = $(s); el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); });
      if (!fallback.hidden) { fallback.src = `assets/labels/${b.img}`; fallback.alt = `${b.name} label art`; }
    }

    let go;
    let renderer = null;
    try { if (window.THREE) renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { renderer = null; }

    if (!renderer) {
      canvas.hidden = true; fallback.hidden = false; stage.classList.add("no-gl");
      go = n => { idx = (n + beers.length) % beers.length; startWipe(beers[idx]); setTimeout(() => setInfo(beers[idx]), reduce ? 0 : 420); };
    } else {
      const R = 1, H = 3.2, h = H / 2;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
      camera.position.set(0, 0.2, 13);
      camera.lookAt(0, 0, 0);

      // studio reflections: soft white boxes plus a coloured one that follows the beer
      let envColor = "255,212,0";
      const pm = new THREE.PMREMGenerator(renderer);
      let envTex = null;
      function makeEnv() {
        const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
        const g = c.getContext("2d");
        g.fillStyle = "#050505"; g.fillRect(0, 0, 1024, 512);
        const box = (x, w, a, col) => { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(.5, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x, 70, w, 360); };
        box(150, 120, 1, "255,255,255"); box(610, 70, .7, "255,255,255"); box(820, 170, .75, envColor);
        g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(0, 0, 1024, 24);
        const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
        if (envTex) envTex.dispose();
        envTex = pm.fromEquirectangular(t).texture; scene.environment = envTex; t.dispose();
      }
      makeEnv();
      scene.add(new THREE.AmbientLight(0xffffff, .25));
      const key = new THREE.SpotLight(0xfff4e0, 2, 40, .5, .6, 1); key.position.set(-3, 8, 7); scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(-6, 2, -4); scene.add(rim);
      const rim2 = new THREE.DirectionalLight(0xffffff, .9); rim2.position.set(6, 3, -4); scene.add(rim2);

      // materials: printed aluminium body (metallic, glossy clearcoat), brushed aluminium ends
      const metal = new THREE.MeshPhysicalMaterial({ color: 0xd2d4d6, metalness: 1, roughness: .32, clearcoat: .3, clearcoatRoughness: .3, side: THREE.DoubleSide });
      const labelMat = new THREE.MeshPhysicalMaterial({ metalness: .55, roughness: .36, clearcoat: 1, clearcoatRoughness: .07 });
      const V = (x, y) => new THREE.Vector2(x, y);
      const can = new THREE.Group();
      // body (label) + a real 330 ml can profile: tapered silver neck, rolled rim, recessed lid, domed base with a stand ring
      [new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 160, 1, true, -Math.PI, Math.PI * 2), labelMat),
       new THREE.Mesh(new THREE.LatheGeometry([V(R, h), V(.995, h + .06), V(.95, h + .17), V(.885, h + .27), V(.855, h + .31), V(.858, h + .335),
         V(.85, h + .352), V(.834, h + .355), V(.822, h + .345), V(.812, h + .3), V(.79, h + .272), V(.775, h + .268), V(.6, h + .272), V(.001, h + .275)], 128), metal),
       new THREE.Mesh(new THREE.LatheGeometry([V(.001, -h - .02), V(.45, -h - .06), V(.62, -h - .12), V(.68, -h - .145), V(.72, -h - .148),
         V(.8, -h - .12), V(.92, -h - .06), V(.98, -h - .02), V(R, -h)], 128), metal)
      ].forEach(m => can.add(m));
      // ring-pull tab: a rounded plate with a finger hole, lying on the lid
      const tabShape = new THREE.Shape();
      tabShape.absarc(0, .1, .13, 0, Math.PI, false); tabShape.lineTo(-.13, -.14); tabShape.absarc(0, -.14, .13, Math.PI, Math.PI * 2, false); tabShape.lineTo(.13, .1);
      const hole = new THREE.Path(); hole.absellipse(0, .09, .075, .06, 0, Math.PI * 2, true); tabShape.holes.push(hole);
      const tab = new THREE.Mesh(new THREE.ExtrudeGeometry(tabShape, { depth: .012, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2, curveSegments: 24 }), metal);
      tab.rotation.x = -Math.PI / 2; tab.position.set(0, h + .285, .2); can.add(tab);
      const rig = new THREE.Group(); rig.add(can); scene.add(rig);

      // label: real art on the front; a dark wrap with the Rolling Mills wordmark round the back
      const texCache = {};
      const fontsReady = document.fonts ? Promise.all([document.fonts.load("80px Anton"), document.fonts.load('30px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
      const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
      async function labelTexture(b) {
        if (texCache[b.slug]) return texCache[b.slug];
        const [img] = await Promise.all([loadImg(`assets/labels/${b.img}`), fontsReady]);
        const W = 2048, TH = Math.round(W * H / (2 * Math.PI * R));
        const c = document.createElement("canvas"); c.width = W; c.height = TH;
        const g = c.getContext("2d");
        // full wrap: the background takes the label art's own edge colour, so the art reads as printed, not stuck on
        let edge = "#151515";
        if (img) { const q = document.createElement("canvas"); q.width = q.height = 24; const qc = q.getContext("2d"); qc.drawImage(img, 0, 0, 24, 24);
          const d = qc.getImageData(0, 0, 24, 24).data; let r = 0, gg = 0, bb = 0, n = 0;
          for (let i = 0; i < 24; i++) for (const [x, y] of [[i, 0], [i, 23], [0, i], [23, i]]) { const o = (y * 24 + x) * 4; r += d[o]; gg += d[o + 1]; bb += d[o + 2]; n++; }
          edge = `rgb(${r / n | 0},${gg / n | 0},${bb / n | 0})`; }
        g.fillStyle = edge; g.fillRect(0, 0, W, TH);
        const s = TH * .94; if (img) { g.save(); g.globalAlpha = .18; g.drawImage(img, W / 2 - s * 1.55, (TH - s) / 2, s, s); g.drawImage(img, W / 2 + s * .55, (TH - s) / 2, s, s); g.restore(); g.drawImage(img, W / 2 - s / 2, (TH - s) / 2, s, s); }
        // soft vignette around the art so the edges melt into the wrap
        const vg = g.createLinearGradient(W / 2 - s * .7, 0, W / 2 - s * .45, 0); vg.addColorStop(0, edge); vg.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = vg; g.fillRect(W / 2 - s * .7, 0, s * .25, TH);
        const vg2 = g.createLinearGradient(W / 2 + s * .45, 0, W / 2 + s * .7, 0); vg2.addColorStop(0, "rgba(0,0,0,0)"); vg2.addColorStop(1, edge);
        g.fillStyle = vg2; g.fillRect(W / 2 + s * .45, 0, s * .25, TH);
        // back panel: a dark band with the wordmark and the beer's spec, like a real can's info side
        g.fillStyle = "rgba(10,10,10,.82)"; g.fillRect(0, 0, W * .3, TH); g.fillRect(W * .76, 0, W * .24, TH);
        g.fillStyle = b.hl; g.fillRect(0, TH * .03, W, 5); g.fillRect(0, TH * .97 - 5, W, 5);
        g.save(); g.translate(W * .14, TH / 2); g.rotate(-Math.PI / 2);
        g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#f1ede4";
        let fs = TH * .16; g.font = `${fs}px Anton`; while (g.measureText("ROLLING MILLS").width > TH * .82) { fs -= 4; g.font = `${fs}px Anton`; }
        g.fillText("ROLLING MILLS", 0, 0);
        g.fillStyle = b.hl; g.font = `${TH * .03}px "JetBrains Mono"`; g.fillText("BREWED IN KANDIVALI · MUMBAI", 0, TH * .11);
        g.restore();
        const px = W * .79; g.textAlign = "left"; g.fillStyle = b.hl; g.font = `${TH * .032}px "JetBrains Mono"`;
        g.fillText(b.style.toUpperCase().slice(0, 26), px, TH * .22);
        g.fillStyle = "#f1ede4"; g.font = `${TH * .1}px Anton`; let y = TH * .34;
        b.name.toUpperCase().split(" ").forEach(w => { g.fillText(w, px, y); y += TH * .1; });
        g.fillStyle = b.hl; g.font = `${TH * .06}px Anton`; g.fillText(`${b.abv}% ABV`, px, y + TH * .03);
        // condensation: fine mist + a few beads with a dark rim and an offset highlight, and the odd run-down streak
        let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        g.save(); g.globalAlpha = .05; g.fillStyle = "#fff"; for (let i = 0; i < 2600; i++) g.fillRect(rnd() * W, rnd() * TH, 1.6, 1.6); g.restore();
        for (let i = 0; i < 170; i++) {
          const x = rnd() * W, yy = rnd() * TH, r = 1.4 + rnd() * rnd() * 6;
          g.fillStyle = "rgba(0,0,0,.16)"; g.beginPath(); g.arc(x, yy + r * .25, r, 0, Math.PI * 2); g.fill();
          const gr = g.createRadialGradient(x - r * .35, yy - r * .35, 0, x, yy, r); gr.addColorStop(0, "rgba(255,255,255,.75)"); gr.addColorStop(.35, "rgba(255,255,255,.14)"); gr.addColorStop(1, "rgba(255,255,255,.02)");
          g.fillStyle = gr; g.beginPath(); g.arc(x, yy, r, 0, Math.PI * 2); g.fill();
          if (r > 5 && rnd() > .55) { const len = 20 + rnd() * 70; const sg = g.createLinearGradient(0, yy, 0, yy + len); sg.addColorStop(0, "rgba(255,255,255,.22)"); sg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = sg; g.fillRect(x - r * .35, yy, r * .7, len); }
        }
        const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return (texCache[b.slug] = t);
      }
      const hexToRgb = hx => { const n = parseInt(hx.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
      async function applyTexture(b) {
        const t = await labelTexture(b); labelMat.map = t; labelMat.needsUpdate = true;
        rim.color.set(b.hl); envColor = hexToRgb(b.hl); makeEnv();
      }

      function resize() {
        const w = canvas.clientWidth, hh = canvas.clientHeight; if (!w || !hh) return;
        renderer.setSize(w, hh, false); camera.aspect = w / hh;
        camera.position.z = camera.aspect < .75 ? 13 / Math.max(camera.aspect / .75, .6) : 13;
        camera.updateProjectionMatrix();
      }
      new ResizeObserver(resize).observe(canvas);

      const ease = p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
      let spin = null, spinOffset = 0, drag = 0, dragging = false, lastX = 0, intro = reduce ? null : { start: null };
      let scrollTurn = 0, lastScroll = scrollY;
      go = n => {
        const next = (n + beers.length) % beers.length; if (next === idx && !spin) return;
        labelTexture(beers[next]);
        startWipe(beers[next]);
        if (reduce) { idx = next; setInfo(beers[idx]); applyTexture(beers[idx]); return; }
        spin = { start: performance.now(), swapped: false, next, dir: n < idx ? -1 : 1 };
      };
      canvas.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); stage.classList.add("dragged"); });
      canvas.addEventListener("pointermove", e => { if (dragging) { drag += (e.clientX - lastX) * .012; lastX = e.clientX; } });
      ["pointerup", "pointercancel"].forEach(t => canvas.addEventListener(t, () => { dragging = false; }));
      // the can turns a little as the page scrolls past (BrewDistrict24's scroll-linked can)
      addEventListener("scroll", () => { if (!reduce) scrollTurn += (scrollY - lastScroll) * .004; lastScroll = scrollY; }, { passive: true });

      let running = false, t0 = performance.now();
      function frame(now) {
        if (!running) return;
        const t = (now - t0) / 1000;
        if (intro) {
          if (intro.start === null) intro.start = now;
          const p = Math.min((now - intro.start) / 1400, 1);
          can.position.y = 2.4 * (1 - ease(p)); can.rotation.y = (1 - ease(p)) * -Math.PI * 1.5;
          if (p === 1) intro = null;
        }
        if (spin) {
          const p = Math.min((now - spin.start) / 1000, 1);
          spinOffset = ease(p) * Math.PI * 2 * spin.dir;
          if (!spin.swapped && p > .45) { spin.swapped = true; idx = spin.next; setInfo(beers[idx]); applyTexture(beers[idx]); }
          if (p === 1) { spin = null; spinOffset = 0; }
        }
        if (!dragging) drag *= .92;
        scrollTurn *= .94;
        const idle = reduce ? 0 : Math.sin(t * .5) * .22;
        rig.rotation.set(.05, idle + drag + spinOffset + scrollTurn, -.09);
        if (!intro && !reduce) can.position.y = Math.sin(t * .9) * .06;
        if (canvas.style.opacity !== "0") renderer.render(scene, camera);   // hidden once the rolling can draws it
        requestAnimationFrame(frame);
      }
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !running) { running = true; t0 = performance.now(); requestAnimationFrame(frame); }
        else if (!e.isIntersecting) running = false;
      }, { threshold: .15 }).observe(stage);
      applyTexture(beers[0]).then(resize);
      beers.slice(1, 3).forEach(labelTexture);

      /* ---------- the rolling can: scroll-linked flight from the hero down into this stage (BrewDistrict24) ----------
         A fixed, click-through canvas draws a copy of the can (same geometry, same live label texture). Scroll progress
         0 = top of the page, 1 = stage section at the top of the screen. It tumbles and spins on the way, swings to the
         side to keep the About copy clear, grows, and lands in the stage frame, where the stage's own can takes over. */
      if (!reduce) (function rollingCan() {
        const fc = document.createElement("canvas"); fc.className = "can-flyer"; fc.setAttribute("aria-hidden", "true"); document.body.appendChild(fc);
        let fr; try { fr = new THREE.WebGLRenderer({ canvas: fc, antialias: true, alpha: true }); } catch (e) { fc.remove(); return; }
        fr.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
        fr.outputEncoding = THREE.sRGBEncoding; fr.toneMapping = THREE.ACESFilmicToneMapping; fr.toneMappingExposure = 1.05;
        const fs = new THREE.Scene();
        (function env() {
          const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d");
          g.fillStyle = "#050505"; g.fillRect(0, 0, 1024, 512);
          const box = (x, w, a, col) => { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(.5, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x, 70, w, 360); };
          box(150, 120, 1, "255,255,255"); box(610, 70, .7, "255,255,255"); box(820, 170, .6, "255,212,0");
          const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
          const pm = new THREE.PMREMGenerator(fr); fs.environment = pm.fromEquirectangular(t).texture; t.dispose(); pm.dispose();
        })();
        fs.add(new THREE.AmbientLight(0xffffff, .3));
        const k = new THREE.DirectionalLight(0xfff4e0, 1.6); k.position.set(-300, 500, 600); fs.add(k);
        const rm = new THREE.DirectionalLight(0xffffff, 1.1); rm.position.set(500, 200, -300); fs.add(rm);
        const fLabel = labelMat.clone(), fMetal = metal.clone();
        const fcan = new THREE.Group();
        can.children.forEach(m => { const mm = new THREE.Mesh(m.geometry, m.material === labelMat ? fLabel : fMetal); mm.position.copy(m.position); mm.rotation.copy(m.rotation); mm.scale.copy(m.scale); fcan.add(mm); });
        fs.add(fcan);
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000); cam.position.z = 500;
        let W = 0, H = 0;
        const size = () => { W = innerWidth; H = innerHeight; fr.setSize(W, H, false); cam.left = -W / 2; cam.right = W / 2; cam.top = H / 2; cam.bottom = -H / 2; cam.updateProjectionMatrix(); };
        size();
        const hold = $(".bs-can");
        const clamp01 = v => Math.min(1, Math.max(0, v));
        const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const CAN_H = 3.6;   // can height in model units (body + lids)
        /* v3: one can for the whole page. Keyframes are tied to each section: the can is already in place when a
           section is two-thirds onto the screen, travels while the next section scrolls in, and is eased every frame.
           In the beer stage it IS the stage can (copies the stage rig's spin/drag), so there is no hand-off swap. */
        const aboutSec = $(".about"), wonSec = $(".won"), hqSec = $(".hq"), galSec = $(".gal"), noteSec = $("#note"), tagSec = $(".tagwall"), slot = document.querySelector(".ft2-canslot");
        canvas.style.opacity = "0";                                   // the flyer draws the stage can from now on
        const lerp = (a, b, t) => a + (b - a) * t;
        /* smoothness: positions are measured into a cache (page coordinates) only when the layout can change,
           instead of ~10 getBoundingClientRect() calls every frame, which forced a layout on every frame */
        const geo = new Map(), tagBoard = document.querySelector(".tagwall-board");
        const tracked = [aboutSec, wonSec, galSec, hqSec, noteSec, tagSec, tagBoard, sec, hold, slot, slot && slot.parentElement].filter(Boolean);
        function measure() { const sy = scrollY, sx = scrollX; tracked.forEach(el => { const r = el.getBoundingClientRect(); geo.set(el, { top: r.top + sy, left: r.left + sx, width: r.width, height: r.height, bottom: r.bottom + sy }); }); }
        const rect = el => { const g = geo.get(el); if (!g) return el.getBoundingClientRect(); const y = scrollY; return { top: g.top - y, bottom: g.bottom - y, left: g.left, width: g.width, height: g.height }; };
        measure();
        new ResizeObserver(measure).observe(document.body);
        addEventListener("load", measure); setInterval(measure, 1500);   // lazy images can still shift sections
        const top = el => el ? (geo.get(el) || { top: el.getBoundingClientRect().top + scrollY }).top : null;
        const mob = () => W < 700;
        // poses: hero is fixed on screen; About / What's on / HQ are pinned to their section (the can moves with it)
        const secTop = el => rect(el).top;
        const poseFixed = k => {
          const m = mob();
          if (k === "hero") return { x: .5 * W, y: (m ? .84 : .8) * H, s: (m ? .15 : .19) * H, rx: .05, ry: 0, rz: -.09, idle: 1 };
          const el = { about: aboutSec, won: wonSec, gal: galSec, hq: hqSec, note: noteSec, tag: tagSec }[k], t = secTop(el);
          const f = {
            about: m ? { x: .82, dy: .88, s: .14 } : { x: .84, dy: .5,  s: .4 },
            won:   m ? { x: .87, dy: .1,  s: .12 } : { x: .1,  dy: .3,  s: .27 },
            gal:   m ? { x: .84, dy: .22, s: .1 } : { x: .9, dy: .26, s: .2 },    // gallery: beside the heading, over the photo wall
            hq:    m ? { x: .86, dy: 1.0, s: .1 } : { x: .87, dy: .52, s: .22 },  // right side, above the kegs (not in the middle)
            note:  m ? { x: .86, dy: .025, s: .075 } : { x: .14, dy: .5, s: .27 },   // phones: tucked top-right above the note, not over the form   // v2: Leave us a note, on the left beside the paper note
            tag:   m ? { x: .8, dy: .5, s: .11 } : { x: .82, dy: .55, s: .24 }     // Leave your tag: on the wall, riding down with you like a can left on the floor
          }[k];
          let y = t + f.dy * H;
          // tag: the can rides the spray wall only, not down over the note form
          if (k === "won" || k === "tag" || (k === "note" && !m)) { const r = rect(k === "tag" && tagBoard || el), sz = f.s * H; y = Math.min(Math.max(y, H * (k === "won" ? (m ? .18 : .32) : k === "note" ? (m ? .14 : .5) : (m ? .55 : .55))), r.bottom - sz * .75); }   // rides down with you through the section   // stays with you through the whole HQ section
          return { x: f.x * W, y, s: f.s * H, rx: .05, ry: 0, rz: -.09, idle: 1 };
        };
        const poseStage = () => { const r = rect(hold); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.height * .62,
          rx: rig.rotation.x, ry: rig.rotation.y + can.rotation.y, rz: rig.rotation.z, idle: 0, stage: 1 }; };
        const poseFoot = () => { if (!slot) return poseFixed("hq"); const sr = rect(slot), wr = rect(slot.parentElement);
          return { x: sr.left + sr.width / 2, y: wr.top + wr.height / 2, s: wr.height * .95, rx: .05, ry: 0, rz: .18, idle: 0 }; };
        // timeline: [scrollY where this pose is fully in place, pose()]
        function stops() {
          const C = document.documentElement.scrollHeight - H, at = el => Math.max(0, Math.min(C, top(el) - H * .33));
          const list = [[H * .04, () => heroPose(NOW)]];
          if (aboutSec) list.push([at(aboutSec), () => poseFixed("about")]);
          list.push([Math.max(0, top(sec) - H * .3), poseStage]);                      // in place once the beer section is ~2/3 onscreen
          if (wonSec) list.push([at(wonSec), () => poseFixed("won")]);
          if (galSec) list.push([at(galSec), () => poseFixed("gal")]);
          if (hqSec) list.push([at(hqSec), () => poseFixed("hq")]);
          if (noteSec) list.push([at(noteSec), () => poseFixed("note")]);
          if (tagSec) list.push([at(tagSec), () => poseFixed("tag")]);
          if (slot) list.push([Math.max(0, Math.min(C, top(slot.parentElement) - H * .3)), poseFoot]);   // land while the wordmark is on screen
          return list.sort((p, q) => p[0] - q[0]);   // v2: sections were reordered, so follow the page order
        }
        /* ---------- v2 motion (Jai): natural, flowing can ----------
           1. Hero entrance: once the loader/age gate is done the can flies in from the right on a curved path,
              spinning and wobbling, and settles at the bottom centre of the hero.
           2. Travel between sections follows a bowed arc (not a straight line), spins in its direction of travel.
           3. Everything is driven through a soft spring, so it accelerates and settles like a real object
              (a touch of overshoot), and it leans into its own velocity (banks when moving sideways, pitches
              when moving up/down). Resting poses float: a slow bob, sway and tilt. */
        const cur = { x: 0, y: 0, s: 0, rx: 0, ry: 0, rz: 0 }, vel = { x: 0, y: 0, s: 0, rx: 0, ry: 0, rz: 0 };
        const KEYS = ["x", "y", "s", "rx", "ry", "rz"];
        let started = false, NOW = performance.now(), introStart = null;
        const startIntro = () => { if (introStart === null) introStart = performance.now() + 200; };
        if (window.RM_READY) startIntro(); else document.addEventListener("rm:ready", startIntro, { once: true });
        const INTRO = 2.4;                                                   // seconds for the entrance
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };
        function heroPose(now) {
          const base = poseFixed("hero");
          if (introStart === null) return { ...base, a: 0 };
          const p = clamp01((now - introStart) / 1000 / INTRO);
          if (p >= 1) return { ...base, a: 1 };
          const e = easeOut(p), w = 1 - e;
          // enters from the right edge, swoops up and over, dips past the centre, curls back in to rest
          return {
            x: bez(1.22 * W, .78 * W, .26 * W, base.x, e),
            y: bez(.5 * H, .02 * H, .98 * H, base.y, e),
            s: base.s * (.55 + .45 * e),
            rx: base.rx + w * .7 * Math.sin(p * Math.PI * 1.6),
            ry: base.ry - w * Math.PI * 4,                                     // two full spins, slowing as it lands
            rz: base.rz + w * .95 * Math.sin(p * Math.PI * 2.4),               // wobble
            idle: 0, intro: 1, a: clamp01(p * 8)
          };
        }
        function target(Y) {
          const L = stops();
          if (Y <= L[0][0]) return heroPose(NOW);
          for (let i = 1; i < L.length; i++) {
            const [y1, p1] = L[i], [y0, p0] = L[i - 1];
            if (Y > y1 && i < L.length - 1 && Y < L[i + 1][0] - Math.min(H * .5, (L[i + 1][0] - y1) * .6)) return { ...p1(), a: 1 }; // holding
            if (Y <= y1) {
              const travelStart = Math.max(y0, y1 - Math.min(H * .5, (y1 - y0) * .6));
              if (Y < travelStart) return { ...p0(), a: 1 };                                                   // still holding the previous pose
              const k = clamp01((Y - travelStart) / Math.max(1, y1 - travelStart)), e = easeIO(k);
              const A = p0(), B = p1(), arc = Math.sin(k * Math.PI);
              const dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy) || 1;
              const side = i % 2 ? 1 : -1, bow = arc * Math.min(dist * .3, H * .24) * side;   // alternate the bow side: S-like flow
              const dir = Math.sign(dx) || 1;
              return { x: lerp(A.x, B.x, e) - dy / dist * bow, y: lerp(A.y, B.y, e) + dx / dist * bow - arc * H * .04,
                s: lerp(A.s, B.s, e) * (1 + arc * .12),
                rx: lerp(A.rx, B.rx, e) + arc * .5, ry: lerp(A.ry, B.ry, e) + (1 - e) * Math.PI * 2 * dir,
                rz: lerp(A.rz, B.rz, e) - arc * .7 * dir, idle: 0, a: 1 };
            }
          }
          return { ...L[L.length - 1][1](), a: 1 };
        }
        let lastT = 0, lastOp = "", drawn = null;   // null = never drawn yet (must draw the first frame)
        function loop(now) {
          requestAnimationFrame(loop);
          if (document.hidden) { lastT = 0; return; }
          const dt = lastT ? Math.min((now - lastT) / 1000, .05) : 0; lastT = now; NOW = now;
          const T = target(scrollY), ts = now / 1000;
          // resting poses float: slow bob, sway and tilt (out of sync, so it never looks mechanical)
          if (T.idle) { T.y += Math.sin(ts * 1.5) * H * .008; T.ry += Math.sin(ts * 1.1) * .25; T.rz += Math.sin(ts * .8 + 1) * .05; T.rx += Math.sin(ts * .95) * .03; }
          if (!started || !dt) { if (!started) { KEYS.forEach(k => { cur[k] = T[k]; vel[k] = 0; }); started = true; } }
          else if (T.stage) {
            // inside the beer stage the can IS the stage can: follow tightly so its spin/drag reads 1:1
            const k = 1 - Math.exp(-dt / .035);
            KEYS.forEach(key => { const nv = lerp(cur[key], T[key], k); vel[key] = (nv - cur[key]) / dt; cur[key] = nv; });
          } else {
            // soft spring, slightly under-damped; stiffer during the entrance so it keeps to the drawn path
            const K = T.intro ? 150 : 62, D = 2 * Math.sqrt(K) * (T.intro ? .9 : .74);
            const n = Math.ceil(dt / (1 / 240)), h = dt / n;
            for (let i = 0; i < n; i++) KEYS.forEach(key => { vel[key] += (K * (T[key] - cur[key]) - D * vel[key]) * h; cur[key] += vel[key] * h; });
          }
          const op = T.a.toFixed(3); if (op !== lastOp) { fc.style.opacity = op; lastOp = op; }
          if (T.a < .01) return;
          // lean into the motion: bank on sideways speed, pitch on vertical speed
          const bank = T.stage ? 0 : Math.max(-.5, Math.min(.5, -vel.x / W * .9));
          const pitch = T.stage ? 0 : Math.max(-.35, Math.min(.35, vel.y / H * .45));
          const R = { x: cur.x, y: cur.y, s: cur.s, rx: cur.rx + pitch, ry: cur.ry, rz: cur.rz + bank };
          // nothing visible changed since the last draw: skip the full-screen WebGL render
          const moved = !drawn || Math.abs(R.x - drawn.x) + Math.abs(R.y - drawn.y) + Math.abs(R.s - drawn.s) > .05 ||
            Math.abs(R.rx - drawn.rx) + Math.abs(R.ry - drawn.ry) + Math.abs(R.rz - drawn.rz) > .0005 || fLabel.map !== labelMat.map;
          if (!moved) return;
          drawn = R;
          fcan.position.set(R.x - W / 2, H / 2 - R.y, 0);
          fcan.scale.setScalar(Math.max(R.s, 1) / CAN_H);
          fcan.rotation.set(R.rx, R.ry, R.rz);
          if (fLabel.map !== labelMat.map) { fLabel.map = labelMat.map; fLabel.needsUpdate = true; }
          fr.render(fs, cam);
        }
        addEventListener("resize", size);
        // warm-up: compile the can's shaders and draw it once while it's still invisible (during the loader / hero),
        // so the first scroll doesn't freeze while the GPU builds them
        const warm = () => { try { fr.compile(fs, cam); renderer.compile(scene, camera); fc.style.opacity = "0"; fr.render(fs, cam); } catch (e) {} };
        applyTexture(beers[0]).then(() => { if (fLabel.map !== labelMat.map) { fLabel.map = labelMat.map; fLabel.needsUpdate = true; } warm(); requestAnimationFrame(loop); });
      })();
    }

    $$(".bs-arrow", stage).forEach(b => b.addEventListener("click", () => go(idx + Number(b.dataset.dir))));
    stage.addEventListener("keydown", e => {
      if (e.target !== stage) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
    });
    // swipe on the text areas to switch beers on phones (dragging the can turns it instead)
    let sx = null;
    stage.addEventListener("touchstart", e => { if (!e.target.closest(".bs-canvas")) sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 60) go(idx + (dx < 0 ? 1 : -1)); });
    setInfo(beers[0], true);
  })();

/* ---------- Leave your tag: spray wall (from site 21). Paint stays on this device; Save downloads a PNG. ---------- */
(function tagWall() {
  const canvas = document.querySelector("[data-tagwall]"); if (!canvas) return;
  const board = canvas.parentElement, ctx = canvas.getContext("2d");
  let color = "#ffd400", spraying = false, last = null, dripping = false;
  const drips = [];
  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    let old = null;
    if (canvas.width) { old = document.createElement("canvas"); old.width = canvas.width; old.height = canvas.height; old.getContext("2d").drawImage(canvas, 0, 0); }
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0); if (old) ctx.drawImage(old, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(canvas);
  function puff(x, y) {
    const radius = 22; ctx.fillStyle = color;
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 1.6) * radius;
      ctx.globalAlpha = .08 + Math.random() * .25; ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6, 1.6);
    }
    ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(x, y, radius * .35, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    // linger in one spot and the paint drips
    if (Math.random() < .02) { drips.push({ x: x + (Math.random() - .5) * 10, y, len: 20 + Math.random() * 70, c: color }); if (!dripping) { dripping = true; requestAnimationFrame(drip); } }
  }
  function drip() {
    for (let i = drips.length - 1; i >= 0; i--) {
      const d = drips[i]; ctx.fillStyle = d.c; ctx.globalAlpha = .7; ctx.fillRect(d.x, d.y, 3, 2); d.y += 1.2; d.len -= 1.2;
      if (d.len <= 0) { ctx.beginPath(); ctx.arc(d.x + 1.5, d.y, 3, 0, Math.PI * 2); ctx.fill(); drips.splice(i, 1); }
    }
    ctx.globalAlpha = 1;
    if (drips.length) requestAnimationFrame(drip); else dripping = false;
  }
  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener("pointerdown", e => { spraying = true; last = pos(e); puff(last.x, last.y); board.classList.add("painted"); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => {
    if (!spraying) return;
    const p = pos(e), steps = Math.max(1, Math.floor(Math.hypot(p.x - last.x, p.y - last.y) / 6));
    for (let i = 1; i <= steps; i++) puff(last.x + (p.x - last.x) * i / steps, last.y + (p.y - last.y) * i / steps);
    last = p;
  });
  ["pointerup", "pointercancel"].forEach(t => canvas.addEventListener(t, () => { spraying = false; }));
  const cans = [...document.querySelectorAll(".tw-can")];
  cans.forEach(b => b.addEventListener("click", () => { color = b.dataset.color; cans.forEach(x => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b); }); }));
  document.querySelector("[data-tw-clear]").addEventListener("click", () => { drips.length = 0; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore(); board.classList.remove("painted"); });
  // the tag as a picture: the warehouse wall behind the paint and the Instagram handle in the corner
  function tagPicture() {
    return new Promise(res => {
      const out = document.createElement("canvas"); out.width = canvas.width; out.height = canvas.height;
      const o = out.getContext("2d"), bg = new Image();
      const finish = () => {
        o.drawImage(canvas, 0, 0);
        const k = out.width / canvas.clientWidth;
        o.font = `${26 * k}px "Sedgwick Ave Display", cursive`; o.fillStyle = "#ffd400"; o.fillText("@rollingmillsbrewery", 20 * k, out.height - 22 * k);
        out.toBlob(b => res({ blob: b, url: out.toDataURL("image/png") }), "image/png");
      };
      o.fillStyle = "#1a1918"; o.fillRect(0, 0, out.width, out.height);
      bg.onload = () => {
        const s = Math.max(out.width / bg.width, out.height / bg.height), w = bg.width * s, h = bg.height * s;
        o.filter = "brightness(.5)"; o.drawImage(bg, (out.width - w) / 2, (out.height - h) * .62, w, h); o.filter = "none"; finish();
      };
      bg.onerror = finish; bg.src = "assets/photos/hq-warehouse.webp";
    });
  }
  const download = url => { const a = document.createElement("a"); a.href = url; a.download = "my-rolling-mills-tag.png"; a.click(); };
  document.querySelector("[data-tw-save]").addEventListener("click", async () => download((await tagPicture()).url));
  // send it to the taproom: phones get the share sheet with the picture (pick WhatsApp or Instagram);
  // elsewhere the picture downloads and WhatsApp opens with a message to attach it to
  /* "Leave us a note": a short review pinned to the wall. Goes to the taproom via Netlify Forms (multipart, with the
     tag picture if they attach it). Nothing is published automatically; the owner adds consented reviews to data.js. */
  const rvf = document.querySelector("[data-review-form]");
  if (rvf) {
    const err = rvf.querySelector("[data-rvf-err]"), count = rvf.querySelector("[data-rvf-count]"), tagBox = rvf.querySelector("[data-rvf-tag]"), tagHint = rvf.querySelector("[data-rvf-tag-hint]");
    rvf.review.addEventListener("input", () => { count.textContent = `${rvf.review.value.length} / 400`; });
    rvf.addEventListener("input", e => { e.target.removeAttribute("aria-invalid"); if (e.target.name === "rating") rvf.querySelectorAll("input[name=rating]").forEach(x => x.removeAttribute("aria-invalid"));
      if (!rvf.querySelector("[aria-invalid]")) err.hidden = true; });
    // the "attach my tag" box switches on once there's paint on the wall
    new MutationObserver(() => { const on = board.classList.contains("painted"); tagBox.disabled = !on; if (!on) tagBox.checked = false; tagHint.hidden = on; if (on && !tagBox.dataset.touched) tagBox.checked = true; })
      .observe(board, { attributes: true, attributeFilter: ["class"] });
    tagBox.addEventListener("change", () => { tagBox.dataset.touched = "1"; });
    rvf.addEventListener("submit", async e => {
      e.preventDefault();
      const problems = [];
      if (!rvf.name.value.trim()) problems.push([rvf.name, "Add your first name."]);
      if (!rvf.querySelector("input[name=rating]:checked")) problems.push([rvf.querySelector("#rv5"), "Rate us in pints."]);
      if (rvf.review.value.trim().length < 10) problems.push([rvf.review, "Write a few words (at least 10 characters)."]);
      rvf.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
      if (problems.length) { problems.forEach(([el]) => el.setAttribute("aria-invalid", "true")); err.textContent = problems.map(p => p[1]).join(" "); err.hidden = false; problems[0][0].focus(); return; }
      err.hidden = true;
      const btn = rvf.querySelector(".rvf-send"); btn.disabled = true;
      const fd = new FormData();
      fd.append("form-name", "guest-review"); fd.append("bot-field", rvf["bot-field"].value);
      fd.append("name", rvf.name.value.trim()); fd.append("rating", rvf.querySelector("input[name=rating]:checked").value);
      fd.append("review", rvf.review.value.trim()); fd.append("consent", rvf.consent.checked ? "yes" : "no"); fd.append("createdAt", new Date().toISOString());
      if (tagBox.checked && board.classList.contains("painted")) { const pic = await tagPicture(); fd.append("tag", new File([pic.blob], "tag.png", { type: "image/png" })); }
      const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
      let ok = local;
      if (!local) { try { const r = await fetch("/", { method: "POST", body: fd }); ok = r.ok; } catch (x) { ok = false; } }
      btn.disabled = false;
      if (!ok) { err.textContent = "Couldn't pin your note just now. Please try again in a moment."; err.hidden = false; return; }
      const done = document.querySelector("[data-rvf-done]");
      done.querySelector("[data-rvf-done-text]").textContent = `Thanks, ${rvf.name.value.trim()}. We read every note${rvf.consent.checked ? ", and we might feature yours below" : ""}.`;
      done.querySelector("[data-rvf-local]").hidden = !local;
      rvf.hidden = true; done.hidden = false; done.focus();
      if (window.plausible) window.plausible("Review note");
    });
  }
  const sendBtn = document.querySelector("[data-tw-send]");
  if (sendBtn) sendBtn.addEventListener("click", async () => {
    if (!board.classList.contains("painted")) { sendBtn.closest(".tw-send").classList.add("nudge"); setTimeout(() => sendBtn.closest(".tw-send").classList.remove("nudge"), 900); return; }
    const msg = "Hi Rolling Mills! Here's the tag I sprayed on your website. You can show it on the site with my first name: ";
    const pic = await tagPicture();
    const file = new File([pic.blob], "my-rolling-mills-tag.png", { type: "image/png" });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: msg }); return; } } catch (err) { if (err && err.name === "AbortError") return; }
    download(pic.url);
    window.open(`https://wa.me/${(window.RM_DATA.place || {}).whatsapp || "917400407711"}?text=${encodeURIComponent(msg + "\n(Your tag just downloaded. Attach it here.)")}`, "_blank", "noopener");
  });
})();

/* ---------- Reviews: "Left their mark". Real reviews from data.js only; each card shows the guest's own spray tag
   where the reference had a voice note. Hidden while there are none. ?preview=reviews shows SAMPLE cards for design review. ---------- */
(function reviews() {
  const sec = document.querySelector("[data-reviews]"); if (!sec) return;
  const D = window.RM_DATA || {}, preview = new URLSearchParams(location.search).get("preview") === "reviews";
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // preview-only placeholders (no invented praise): shown just with ?preview=reviews, never on the live page
  const ph = "A real guest's review goes here, in their own words, with a link to where they posted it.";
  const samples = [["Maya", 1], ["Rohan", 2], ["Sid", 3], ["Maya", 1], ["Rohan", 2], ["Sid", 3]].map(([name, t]) =>
    ({ name, source: "Google", date: "", text: ph, tag: `assets/tags/samples/sample-tag-${t}.png` }));
  const list = (D.reviews && D.reviews.length) ? D.reviews : (preview ? samples : []);
  if (!list.length) return;                                   // nothing real to show: the section stays hidden
  sec.hidden = false;
  if (!(D.reviews && D.reviews.length)) sec.classList.add("is-preview");
  const colours = ["#ffd400", "#ff2e88", "#29e3ff", "#f1ede4"];
  const icon = src => /insta/i.test(src) ? ""
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="currentColor"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="currentColor" opacity=".8"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" fill="currentColor" opacity=".6"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" fill="currentColor" opacity=".4"/></svg>';
  const card = (r, i) => `<article class="rv-card${i >= 6 ? " rv-extra" : ""}" style="--c:${colours[i % colours.length]};--r:${[-1.5, 1, -0.5, 1.5][i % 4]}deg">
      <header class="rv-top">
        <span class="rv-avatar" aria-hidden="true">${esc(r.name.trim()[0] || "?")}</span>
        <span class="rv-who"><b>${esc(r.name)}</b><small>${esc(r.source)} review${r.date ? " · " + esc(r.date) : ""}</small></span>
        ${!icon(r.source) ? "" : r.url ? `<a class="rv-src" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="Read ${esc(r.name)}'s review on ${esc(r.source)}">${icon(r.source)}</a>` : `<span class="rv-src" aria-hidden="true">${icon(r.source)}</span>`}
      </header>
      <blockquote class="rv-text"><p>${esc(r.text)}</p></blockquote>
      ${r.tag ? `<figure class="rv-tag"><img src="${esc(r.tag)}" alt="The spray tag ${esc(r.name)} left on our website" loading="lazy"><figcaption>Their tag</figcaption></figure>` : ""}
    </article>`;
  const track = sec.querySelector("[data-rv-grid]");
  track.innerHTML = list.map(card).join("");
  // slider: swipe / drag / arrow buttons / arrow keys; it never moves on its own
  const prev = sec.querySelector('[data-rv-step="-1"]'), next = sec.querySelector('[data-rv-step="1"]');
  const stepW = () => { const c = track.querySelector(".rv-card"); return c ? c.getBoundingClientRect().width + 22 : track.clientWidth * .8; };
  const sync = () => { const max = track.scrollWidth - track.clientWidth - 2; prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max;
    sec.classList.toggle("rv-fits", max <= 0); };
  [prev, next].forEach(b => b.addEventListener("click", () => track.scrollBy({ left: +b.dataset.rvStep * stepW(), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })));
  track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
  track.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); track.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * stepW(), behavior: "smooth" }); } });
  let down = null;
  track.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse" || e.target.closest("a")) return; down = { x: e.clientX, s: track.scrollLeft }; track.classList.add("dragging"); });
  addEventListener("pointermove", e => { if (down) track.scrollLeft = down.s - (e.clientX - down.x); });
  addEventListener("pointerup", () => { if (down) { down = null; track.classList.remove("dragging"); } });
  addEventListener("resize", sync); sync();
})();
})();
