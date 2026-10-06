/* On tap drawer: a 3D can of the chosen beer (same can as the home page beer stage: lathe profile, ring pull,
   real label art on a printed wrap). One renderer is reused for every opening; it only animates while the drawer is open. */
(function () {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ctx = null, running = false, current = null;

  function init(canvas) {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { return null; }
    const R = 1, H = 3.2, h = H / 2;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
    camera.position.set(0, 0.2, 13); camera.lookAt(0, 0, 0);

    // studio reflections: soft white boxes plus one in the beer's highlight colour
    const pm = new THREE.PMREMGenerator(renderer); let envTex = null;
    function makeEnv(col) {
      const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d");
      g.fillStyle = "#050505"; g.fillRect(0, 0, 1024, 512);
      const box = (x, w, a, rgb) => { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(.5, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x, 70, w, 360); };
      box(150, 120, 1, "255,255,255"); box(610, 70, .7, "255,255,255"); box(820, 170, .75, col);
      g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(0, 0, 1024, 24);
      const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
      if (envTex) envTex.dispose(); envTex = pm.fromEquirectangular(t).texture; scene.environment = envTex; t.dispose();
    }
    makeEnv("255,212,0");
    scene.add(new THREE.AmbientLight(0xffffff, .25));
    const key = new THREE.SpotLight(0xfff4e0, 2, 40, .5, .6, 1); key.position.set(-3, 8, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(-6, 2, -4); scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffffff, .9); rim2.position.set(6, 3, -4); scene.add(rim2);

    const metal = new THREE.MeshPhysicalMaterial({ color: 0xd2d4d6, metalness: 1, roughness: .32, clearcoat: .3, clearcoatRoughness: .3, side: THREE.DoubleSide });
    const labelMat = new THREE.MeshPhysicalMaterial({ metalness: .55, roughness: .36, clearcoat: 1, clearcoatRoughness: .07 });
    const V = (x, y) => new THREE.Vector2(x, y);
    const can = new THREE.Group();
    [new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 160, 1, true, -Math.PI, Math.PI * 2), labelMat),
     new THREE.Mesh(new THREE.LatheGeometry([V(R, h), V(.995, h + .06), V(.95, h + .17), V(.885, h + .27), V(.855, h + .31), V(.858, h + .335),
       V(.85, h + .352), V(.834, h + .355), V(.822, h + .345), V(.812, h + .3), V(.79, h + .272), V(.775, h + .268), V(.6, h + .272), V(.001, h + .275)], 128), metal),
     new THREE.Mesh(new THREE.LatheGeometry([V(.001, -h - .02), V(.45, -h - .06), V(.62, -h - .12), V(.68, -h - .145), V(.72, -h - .148),
       V(.8, -h - .12), V(.92, -h - .06), V(.98, -h - .02), V(R, -h)], 128), metal)
    ].forEach(m => can.add(m));
    const tabShape = new THREE.Shape();
    tabShape.absarc(0, .1, .13, 0, Math.PI, false); tabShape.lineTo(-.13, -.14); tabShape.absarc(0, -.14, .13, Math.PI, Math.PI * 2, false); tabShape.lineTo(.13, .1);
    const hole = new THREE.Path(); hole.absellipse(0, .09, .075, .06, 0, Math.PI * 2, true); tabShape.holes.push(hole);
    const tab = new THREE.Mesh(new THREE.ExtrudeGeometry(tabShape, { depth: .012, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2, curveSegments: 24 }), metal);
    tab.rotation.x = -Math.PI / 2; tab.position.set(0, h + .285, .2); can.add(tab);
    const rig = new THREE.Group(); rig.add(can); scene.add(rig);

    // label wrap: real art on the front, wordmark and spec panel round the back, condensation on top
    const texCache = {};
    const fontsReady = document.fonts ? Promise.all([document.fonts.load("80px Anton"), document.fonts.load('30px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
    const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    async function labelTexture(b) {
      if (texCache[b.slug]) return texCache[b.slug];
      const [img] = await Promise.all([loadImg(`assets/labels/${b.img}`), fontsReady]);
      const W = 2048, TH = Math.round(W * H / (2 * Math.PI * R));
      const c = document.createElement("canvas"); c.width = W; c.height = TH; const g = c.getContext("2d");
      let edge = "#151515";
      if (img) { const q = document.createElement("canvas"); q.width = q.height = 24; const qc = q.getContext("2d"); qc.drawImage(img, 0, 0, 24, 24);
        const d = qc.getImageData(0, 0, 24, 24).data; let r = 0, gg = 0, bb = 0, n = 0;
        for (let i = 0; i < 24; i++) for (const [x, y] of [[i, 0], [i, 23], [0, i], [23, i]]) { const o = (y * 24 + x) * 4; r += d[o]; gg += d[o + 1]; bb += d[o + 2]; n++; }
        edge = `rgb(${r / n | 0},${gg / n | 0},${bb / n | 0})`; }
      g.fillStyle = edge; g.fillRect(0, 0, W, TH);
      const s = TH * .94; if (img) { g.save(); g.globalAlpha = .18; g.drawImage(img, W / 2 - s * 1.55, (TH - s) / 2, s, s); g.drawImage(img, W / 2 + s * .55, (TH - s) / 2, s, s); g.restore(); g.drawImage(img, W / 2 - s / 2, (TH - s) / 2, s, s); }
      const vg = g.createLinearGradient(W / 2 - s * .7, 0, W / 2 - s * .45, 0); vg.addColorStop(0, edge); vg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = vg; g.fillRect(W / 2 - s * .7, 0, s * .25, TH);
      const vg2 = g.createLinearGradient(W / 2 + s * .45, 0, W / 2 + s * .7, 0); vg2.addColorStop(0, "rgba(0,0,0,0)"); vg2.addColorStop(1, edge);
      g.fillStyle = vg2; g.fillRect(W / 2 + s * .45, 0, s * .25, TH);
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

    function resize() {
      const w = canvas.clientWidth, hh = canvas.clientHeight; if (!w || !hh) return;
      renderer.setSize(w, hh, false); camera.aspect = w / hh;
      camera.position.z = camera.aspect < .75 ? 13 / Math.max(camera.aspect / .75, .6) : 13;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(canvas);

    // drag to turn
    let drag = 0, dragging = false, lastX = 0;
    canvas.addEventListener("pointerdown", e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.parentElement.classList.add("dragged"); });
    canvas.addEventListener("pointermove", e => { if (dragging) { drag += (e.clientX - lastX) * .012; lastX = e.clientX; } });
    ["pointerup", "pointercancel"].forEach(t => canvas.addEventListener(t, () => { dragging = false; }));

    const ease = p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    let intro = null, t0 = 0, base = 0;
    function frame(now) {
      if (!running) return;
      const t = (now - t0) / 1000;
      if (intro) {
        const p = Math.min((now - intro) / 1200, 1);
        can.position.y = 1.8 * (1 - ease(p)); can.rotation.y = (1 - ease(p)) * -Math.PI * 1.5;
        if (p === 1) intro = null;
      } else if (!reduce) can.position.y = Math.sin(t * .9) * .06;
      if (!dragging) { drag *= .985; if (!reduce) base += .004; }
      rig.rotation.set(.05, base + drag, -.09);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    return {
      async show(b) {
        resize();
        const t = await labelTexture(b); if (current !== b.slug) return;
        labelMat.map = t; labelMat.needsUpdate = true;
        rim.color.set(b.hl); makeEnv(hexToRgb(b.hl));
        drag = 0; base = 0; can.rotation.y = 0; intro = reduce ? null : performance.now();
        if (!running) { running = true; t0 = performance.now(); requestAnimationFrame(frame); }
      }
    };
  }

  window.RMDrawerCan = {
    // returns false when WebGL is not available, so the caller can show the flat can image instead
    show(canvas, b) {
      if (!window.THREE) return false;
      if (!ctx || ctx.canvas !== canvas) { const c = init(canvas); if (!c) return false; ctx = { canvas, api: c }; }
      current = b.slug; ctx.api.show(b); return true;
    },
    stop() { running = false; current = null; }
  };
})();
