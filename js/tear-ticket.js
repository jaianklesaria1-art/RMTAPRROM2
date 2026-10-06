/* TearTicket: vanilla port of the React component Jai supplied (same geometry, same tear simulation, no React).
   TearTicket(root, opts) builds a ticket inside `root`: a body and a perforated stub you can drag to tear off.
   Fibres stretch across the perforation and snap one by one; once all have snapped the stub hangs free, and on release
   it drops away with gravity and fades. Keyboard: Enter / Space on the stub tears it at once.
   opts.onRelease(): called inside the user's gesture the moment the stub is torn free (safe place to window.open).
   opts.onTear(): called once the stub has fallen away. Returns { tear(), el }. */
(function () {
  "use strict";
  const GRAVITY = 2400, RETRACT = 0.17, ART_INSET = 8, ART_SPAN = 0.78;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const rad = d => d * Math.PI / 180;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const f = n => n.toFixed(2);
  const noise = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  function buildGeometry(W, H, S, R, holes, hole, notch, rough, vertical) {
    const main = vertical ? H : W, cross = vertical ? W : H, x = main - S, hr = hole / 2, n = Math.max(1, Math.round(holes));
    const span = cross - 2 * notch, bridge = Math.max(2, (span - n * hole) / (n + 1)), random = noise(n * 7919 + Math.round(cross));
    const at = (u, v) => vertical ? { x: v, y: u } : { x: u, y: v };
    const pt = (u, v) => vertical ? `${f(v)},${f(u)}` : `${f(u)},${f(v)}`;
    const arc = (r, sweep, u, v) => `A${f(r)},${f(r)} 0 0 ${vertical ? 1 - sweep : sweep} ${pt(u, v)}`;
    const bridges = [];
    for (let i = 0; i <= n; i++) {
      const y0 = notch + i * (bridge + hole), y1 = y0 + bridge, steps = Math.max(2, Math.round(bridge / 2.2)), pts = [];
      for (let k = 1; k < steps; k++) pts.push([x + (random() - .5) * 2 * rough, y0 + bridge * k / steps]);
      bridges.push({ y0, y1, mid: (y0 + y1) / 2, pts, ...at(x, (y0 + y1) / 2) });
    }
    let body = `M${pt(R, 0)}L${pt(x - notch, 0)}${arc(notch, 0, x, notch)}`;
    bridges.forEach((b, i) => { b.pts.forEach(p => { body += `L${pt(p[0], p[1])}`; }); body += `L${pt(x, b.y1)}`; if (i < n) body += arc(hr, 0, x, b.y1 + hole); });
    body += `${arc(notch, 0, x - notch, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}Z`;
    let stub = `M${pt(x + notch, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + notch, cross)}${arc(notch, 0, x, cross - notch)}`;
    for (let i = n; i >= 0; i--) { const b = bridges[i]; for (let k = b.pts.length - 1; k >= 0; k--) stub += `L${pt(b.pts[k][0], b.pts[k][1])}`; stub += `L${pt(x, b.y0)}`; if (i > 0) stub += arc(hr, 0, x, b.y0 - hole); }
    stub += `${arc(notch, 0, x + notch, 0)}Z`;
    const ends = [{ ...at(x, notch), v: notch }, { ...at(x, cross - notch), v: cross - notch }];
    const bodyOutline = `M${pt(x, cross - notch)}${arc(notch, 0, x - notch, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}L${pt(x - notch, 0)}${arc(notch, 0, x, notch)}`;
    const stubOutline = `M${pt(x, notch)}${arc(notch, 0, x + notch, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + notch, cross)}${arc(notch, 0, x, cross - notch)}`;
    return { vertical, cross, body, stub, bridges, ends, bodyOutline, stubOutline };
  }

  window.TearTicket = function (root, o) {
    o = Object.assign({ orientation: "horizontal", width: 460, height: 250, stubSize: 150, radius: 16, holes: 12, holeSize: 6, notch: 3, roughness: 0,
      tearAngle: 30, stretch: 30, resistance: .45, rotate: 4, tilt: true, tiltMax: 9, tiltReach: 260, parallax: 6, perspective: 1000,
      background: "#27272a", color: "#f5f5f5", border: true, borderColor: "", borderWidth: 1, stubBackground: "", recenter: true,
      image: "", imageAlt: "", scrim: true, imageRadius: 8, body: "", stub: "", ariaLabel: "Tear off the stub" }, o);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const vertical = o.orientation === "vertical", W = o.width, H = o.height;
    const geo = buildGeometry(W, H, o.stubSize, o.radius, o.holes, o.holeSize, o.notch, o.roughness, vertical);
    const el = document.createElement("div");
    el.className = "tear-ticket"; el.dataset.orientation = o.orientation;
    const vars = { "--tt-w": W + "px", "--tt-h": H + "px", "--tt-stub": o.stubSize + "px", "--tt-bg": o.background, "--tt-stub-bg": o.stubBackground || o.background,
      "--tt-ink": o.color, "--tt-edge": o.borderColor || `color-mix(in srgb, ${o.color} 16%, transparent)`, "--tt-edge-w": o.borderWidth, "--tt-parallax": o.parallax + "px",
      "--tt-body-w": (vertical ? W : W - o.stubSize) + "px", "--tt-body-h": (vertical ? H - o.stubSize : H) + "px", "--tt-inset": ART_INSET + "px", "--tt-span": ART_SPAN, "--tt-art-radius": o.imageRadius + "px" };
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
    const edge = d => o.border ? `<svg class="tear-ticket__edge" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}"/></svg>` : "";
    el.innerHTML = `<div class="tear-ticket__stage"><div class="tear-ticket__plane">
        <div class="tear-ticket__piece tear-ticket__piece--body">${edge(geo.bodyOutline)}
          <div class="tear-ticket__paper" style="clip-path: path('${geo.body}')">
            ${o.image ? `<div class="tear-ticket__art"><img class="tear-ticket__image" src="${o.image}" alt="${o.imageAlt}" draggable="false">${o.scrim ? '<div class="tear-ticket__scrim"></div>' : ""}</div>` : ""}
            <div class="tear-ticket__content">${o.body}</div>
          </div></div>
        <svg class="tear-ticket__fibres" aria-hidden="true">${geo.bridges.map(() => "<g><path/><path/></g>").join("")}</svg>
        <div class="tear-ticket__piece tear-ticket__piece--stub" role="button" tabindex="0" aria-label="${o.ariaLabel}">${edge(geo.stubOutline)}
          <div class="tear-ticket__paper tear-ticket__paper--stub" style="clip-path: path('${geo.stub}')"><div class="tear-ticket__stub">${o.stub}</div></div>
        </div>
      </div></div><span class="tear-ticket__sr" role="status"></span>`;
    root.appendChild(el);
    const stage = el.querySelector(".tear-ticket__stage"), plane = el.querySelector(".tear-ticket__plane");
    const bodyEl = el.querySelector(".tear-ticket__piece--body"), stubEl = el.querySelector(".tear-ticket__piece--stub");
    const artImg = el.querySelector(".tear-ticket__image"), ink = el.querySelector(".tear-ticket__content"), sr = el.querySelector(".tear-ticket__sr");
    const fibres = [...el.querySelectorAll(".tear-ticket__fibres path")];

    // fit to the container width
    let fit = 1;
    const measure = () => { fit = Math.min(1, el.clientWidth / W) || 1; el.style.setProperty("--tt-fit", fit); el.style.height = H * fit + "px"; };
    new ResizeObserver(measure).observe(el); measure();

    // tilt (simple spring) + parallax
    const T = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0 };
    const depth = o.tiltMax > 0 ? o.parallax / o.tiltMax : 0;
    const applyTilt = () => {
      plane.style.transform = `perspective(${o.perspective}px) rotate(${o.rotate}deg) rotateX(${T.x.toFixed(3)}deg) rotateY(${T.y.toFixed(3)}deg)`;
      if (!reduce) { if (artImg) artImg.style.transform = `translate(${(-T.y * depth).toFixed(2)}px, ${(T.x * depth).toFixed(2)}px)`;
        ink.style.transform = `translate(${(T.y * depth * .22).toFixed(2)}px, ${(-T.x * depth * .22).toFixed(2)}px)`; }
    };
    const tiltStep = () => {
      const k = 220, c = 24, m = .6, dt = 1 / 60;
      T.vx += ((k * (T.tx - T.x) - c * T.vx) / m) * dt; T.x += T.vx * dt;
      T.vy += ((k * (T.ty - T.y) - c * T.vy) / m) * dt; T.y += T.vy * dt;
      applyTilt();
      if (Math.abs(T.tx - T.x) + Math.abs(T.ty - T.y) + Math.abs(T.vx) + Math.abs(T.vy) > .01) T.raf = requestAnimationFrame(tiltStep); else T.raf = 0;
    };
    const setTilt = (x, y) => { T.tx = x; T.ty = y; if (!T.raf) T.raf = requestAnimationFrame(tiltStep); };
    applyTilt();
    let used = false;
    if (o.tilt && !reduce) addEventListener("pointermove", e => {
      if (e.pointerType === "touch" || s.id !== null || used) return;
      const r = el.getBoundingClientRect();
      const nx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2 + o.tiltReach), -1, 1), ny = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2 + o.tiltReach), -1, 1);
      setTilt(-ny * o.tiltMax, nx * o.tiltMax);
    });

    const s = { raf: 0, last: 0, phase: "idle", id: null, sign: 1, hinge: { x: 0, y: 0 }, hingeV: 0, grab: { x: 0, y: 0 }, start: { x: 0, y: 0 }, point: { x: 0, y: 0 },
      a0: 0, theta: 0, thetaV: 0, sx: 0, sy: 0, vx: 0, vy: 0, spin: 0, pvx: 0, pvy: 0, pt: 0, fade: 1, age: 0, bx: 0, bv: 0, snapped: [], snapAt: [], span: [], auto: 0 };

    function paint(now) {
      stubEl.style.transform = `translate(${s.sx.toFixed(2)}px, ${s.sy.toFixed(2)}px) rotate(${(s.theta * s.sign * 180 / Math.PI).toFixed(3)}deg)`;
      stubEl.style.opacity = s.fade.toFixed(3);
      const up = geo.vertical;
      bodyEl.style.transform = `translate${up ? "Y" : "X"}(${s.bx.toFixed(2)}px)`;
      const cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign), lx = up ? 1.6 : 0, ly = up ? 0 : 1.6;
      let busy = false;
      geo.bridges.forEach((b, i) => {
        const dx = b.x - s.hinge.x, dy = b.y - s.hinge.y;
        const tx = s.hinge.x + dx * cos - dy * sin + s.sx, ty = s.hinge.y + dx * sin + dy * cos + s.sy;
        const ox = b.x + (up ? 0 : s.bx), oy = b.y + (up ? s.bx : 0), gx = tx - ox, gy = ty - oy, gap = Math.hypot(gx, gy);
        const near = fibres[i * 2], far = fibres[i * 2 + 1];
        const live = s.phase !== "idle" && !reduce;
        if (!s.snapped[i]) {
          if (!live || gap < .35) { near.style.opacity = "0"; far.style.opacity = "0"; return; }
          const k = clamp(gap / o.stretch, 0, 1), sag = gap * .18, w = (1.7 - 1.15 * k).toFixed(2);
          const sx = (up ? sag : 0) + gx / 2, sy = (up ? 0 : sag) + gy / 2;
          near.setAttribute("d", `M${f(ox - lx)},${f(oy - ly)}Q${f(ox - lx + sx)},${f(oy - ly + sy)} ${f(tx - lx)},${f(ty - ly)}`);
          far.setAttribute("d", `M${f(ox + lx)},${f(oy + ly)}Q${f(ox + lx + gx - sx)},${f(oy + ly + gy - sy)} ${f(tx + lx)},${f(ty + ly)}`);
          near.style.strokeWidth = w; far.style.strokeWidth = w; near.style.opacity = "1"; far.style.opacity = "1"; s.span[i] = gap; return;
        }
        const t = (now - s.snapAt[i]) / 1000 / RETRACT;
        if (!live || t >= 1 || !s.snapAt[i]) { near.style.opacity = "0"; far.style.opacity = "0"; return; }
        busy = true;
        const left = (1 - t) * (1 - t), len = (s.span[i] || o.stretch) * .5 * left, ux = gap > .01 ? gx / gap : 1, uy = gap > .01 ? gy / gap : 0;
        near.setAttribute("d", `M${f(ox)},${f(oy)}L${f(ox + ux * len)},${f(oy + uy * len)}`);
        far.setAttribute("d", `M${f(tx)},${f(ty)}L${f(tx - ux * len)},${f(ty - uy * len)}`);
        near.style.strokeWidth = "0.9"; far.style.strokeWidth = "0.9"; near.style.opacity = left.toFixed(2); far.style.opacity = left.toFixed(2);
      });
      return busy;
    }
    function finish() {
      stubEl.style.visibility = "hidden"; used = true;
      el.dataset.used = ""; if (o.recenter) el.dataset.shift = vertical ? "y" : "x";
      stubEl.setAttribute("aria-hidden", "true"); stubEl.tabIndex = -1; sr.textContent = "Ticket torn";
      setTilt(0, 0);
      if (o.onTear) o.onTear();
    }
    let released = false;
    const release = () => {
      if (released) return; released = true; if (o.onRelease) o.onRelease();
      // WhatsApp opening in a new tab pauses this tab's animation frames; make sure the tear still completes
      setTimeout(() => { if (!used) { cancelAnimationFrame(s.raf); s.raf = 0; s.phase = "idle"; s.fade = 0; paint(performance.now()); finish(); } }, 1800);
    };
    function step(now) {
      const dt = clamp((now - s.last) / 1000, .001, .034); s.last = now;
      const limit = rad(o.tearAngle);
      if (s.phase === "held") {
        const count = geo.bridges.length; let intact = 0;
        for (let i = 0; i < count; i++) if (!s.snapped[i]) intact++;
        const hold = count ? intact / count : 0, follow = .92 * (1 - clamp(o.resistance, 0, .95) * hold);
        const a = Math.atan2(s.point.y - s.hinge.y, s.point.x - s.hinge.x);
        // auto tear (button / keyboard): an invisible hand pulls the stub away over ~0.9s, fibres snap one by one
        const autoP = s.auto ? clamp((now - s.auto) / 900, 0, 1) : 0;
        const want = s.auto ? (1 - Math.pow(1 - autoP, 2.2)) * (limit + .12) : clamp(wrap(a - s.a0) * s.sign * follow, 0, limit + .1);
        s.theta += (want - s.theta) * (1 - Math.exp(-dt / .035));
        const up = geo.vertical;
        const away = clamp(((up ? s.point.y - s.start.y : s.point.x - s.start.x) || 0) * .05, -2, 4), side = clamp(((up ? s.point.x - s.start.x : s.point.y - s.start.y) || 0) * .05, -3, 3);
        const px = s.auto ? (up ? 0 : 3 * autoP) : (up ? side : away), py = s.auto ? (up ? 3 * autoP : 0) : (up ? away : side);
        s.sx += (px - s.sx) * (1 - Math.exp(-dt / .05)); s.sy += (py - s.sy) * (1 - Math.exp(-dt / .05));
        const slack = Math.hypot(s.sx, s.sy); let left = 0;
        geo.bridges.forEach((b, i) => {
          if (s.snapped[i]) return;
          const d = Math.abs(b.mid - s.hingeV);
          if (2 * d * Math.sin(s.theta / 2) + slack > o.stretch || s.theta >= limit) { s.snapped[i] = true; s.snapAt[i] = now; s.bv -= 560 / geo.bridges.length; } else left++;
        });
        if (left === 0) {
          s.bv -= 150;
          if (s.auto) { s.auto = 0; s.vx = vertical ? 120 : 420; s.vy = vertical ? 380 : -260; s.spin = 2.4 * s.sign; s.age = 0; s.phase = "drop"; release(); }
          else s.phase = "free";
        }
      } else if (s.phase === "free") {
        const cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign), gx = s.grab.x - s.hinge.x, gy = s.grab.y - s.hinge.y;
        const wx = s.point.x - s.hinge.x - (gx * cos - gy * sin), wy = s.point.y - s.hinge.y - (gx * sin + gy * cos);
        s.sx += (wx - s.sx) * (1 - Math.exp(-dt / .045)); s.sy += (wy - s.sy) * (1 - Math.exp(-dt / .045));
        const hang = limit * .55 + clamp(s.pvx * .0009 * s.sign, -.3, .3);
        s.theta += (hang - s.theta) * (1 - Math.exp(-dt / .12));
      } else if (s.phase === "drop") {
        s.age += dt; s.vy += GRAVITY * dt; s.sx += s.vx * dt; s.sy += s.vy * dt; s.theta += s.spin * dt;
        if (s.age > .16) s.fade = clamp(1 - (s.age - .16) / .42, 0, 1);
        if (s.fade <= 0) { s.phase = "idle"; finish(); }
      } else if (s.phase === "return") {
        s.thetaV += (-300 * s.theta - 24 * s.thetaV) * dt; s.theta += s.thetaV * dt;
        s.sx += -s.sx * (1 - Math.exp(-dt / .07)); s.sy += -s.sy * (1 - Math.exp(-dt / .07));
        if (Math.abs(s.theta) < .0008 && Math.abs(s.thetaV) < .01 && Math.hypot(s.sx, s.sy) < .05) { s.theta = 0; s.thetaV = 0; s.sx = 0; s.sy = 0; s.phase = "idle"; }
      }
      s.bv += (-520 * s.bx - 30 * s.bv) * dt; s.bx += s.bv * dt;
      const busy = paint(now), moving = Math.abs(s.bx) > .02 || Math.abs(s.bv) > .5;
      if (s.phase !== "idle" || moving || busy) s.raf = requestAnimationFrame(step);
      else { s.bx = 0; s.bv = 0; paint(now); s.raf = 0; }
    }
    const run = () => { if (s.raf) return; s.last = performance.now(); s.raf = requestAnimationFrame(step); };
    const local = e => { const r = stage.getBoundingClientRect(), k = r.width / W || 1; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
    // a tear that does not need dragging (keyboard, button, reduced motion): the stub still drops away when motion is allowed
    function tear() {
      if (used || s.phase === "drop" || s.auto) return;
      if (reduce) { release(); cancelAnimationFrame(s.raf); s.raf = 0; s.phase = "idle"; el.dataset.instant = ""; finish(); return; }
      // hinge on the far end, like a hand gripping the near corner and pulling it away
      const end = geo.ends[1]; s.sign = geo.vertical ? -1 : 1; s.hinge = { x: end.x, y: end.y }; s.hingeV = end.v;
      stubEl.style.transformOrigin = `${s.hinge.x}px ${s.hinge.y}px`;
      s.snapped = []; s.snapAt = []; s.span = []; s.theta = 0; s.sx = 0; s.sy = 0;
      s.start = { x: 0, y: 0 }; s.point = { x: 0, y: 0 };
      s.auto = performance.now(); s.phase = "held"; setTilt(0, 0); run();
    }
    stubEl.addEventListener("pointerdown", e => {
      if (used || e.button !== 0 || s.id !== null || s.phase === "drop") return;
      try { stubEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const p = local(e); s.id = e.pointerId; s.start = p; s.point = p; s.pt = performance.now(); s.pvx = 0; s.pvy = 0;
      if (s.theta < .01) {
        const farSide = (geo.vertical ? p.x : p.y) < geo.cross / 2, end = geo.ends[farSide ? 1 : 0];
        s.sign = (farSide ? 1 : -1) * (geo.vertical ? -1 : 1); s.hinge = { x: end.x, y: end.y }; s.hingeV = end.v;
        stubEl.style.transformOrigin = `${s.hinge.x}px ${s.hinge.y}px`;
      }
      const cos = Math.cos(-s.theta * s.sign), sin = Math.sin(-s.theta * s.sign), ux = p.x - s.sx - s.hinge.x, uy = p.y - s.sy - s.hinge.y;
      s.grab = { x: s.hinge.x + ux * cos - uy * sin, y: s.hinge.y + ux * sin + uy * cos };
      s.a0 = Math.atan2(s.grab.y - s.hinge.y, s.grab.x - s.hinge.x) - s.theta * s.sign / .92;
      s.phase = "held"; s.thetaV = 0; setTilt(0, 0); el.dataset.grabbing = ""; run();
    });
    stubEl.addEventListener("pointermove", e => {
      if (s.id !== e.pointerId) return;
      const p = local(e), now = performance.now(), dt = Math.max(.004, (now - s.pt) / 1000);
      s.pvx += ((p.x - s.point.x) / dt - s.pvx) * .35; s.pvy += ((p.y - s.point.y) / dt - s.pvy) * .35; s.pt = now; s.point = p;
      if (reduce && Math.hypot(p.x - s.start.x, p.y - s.start.y) > 28) { s.id = null; delete el.dataset.grabbing; tear(); }
    });
    const up = e => {
      if (s.id !== e.pointerId) return;
      s.id = null; delete el.dataset.grabbing;
      try { if (stubEl.hasPointerCapture(e.pointerId)) stubEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (s.phase === "free") {
        const still = performance.now() - s.pt > 80;
        s.vx = still ? 0 : clamp(s.pvx, -1600, 1600); s.vy = still ? 0 : clamp(s.pvy, -1600, 1200);
        s.spin = clamp(s.vx * .004, -6, 6) + 1.2 * s.sign; s.age = 0; s.phase = "drop";
        release();
      } else if (s.phase === "held") s.phase = "return";
      run();
    };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => stubEl.addEventListener(t, up));
    stubEl.addEventListener("keydown", e => { if (used || (e.key !== "Enter" && e.key !== " ")) return; e.preventDefault(); if (!e.repeat) tear(); });
    stubEl.addEventListener("dragstart", e => e.preventDefault());
    paint(performance.now());
    return { el, tear, stub: stubEl };
  };
})();
