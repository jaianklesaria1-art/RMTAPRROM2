/* FuzzyText: vanilla port of the React Bits <FuzzyText> component (canvas row-jitter effect).
   The text is drawn once to an offscreen canvas, then copied one pixel row at a time with a
   random sideways offset every frame. Hovering the text turns the fuzz up.
   Usage: FuzzyText(canvasEl, { text, fontSize, fontFamily, stroke, ... }) */
(() => {
  "use strict";
  window.FuzzyText = function (canvas, o) {
    const opt = Object.assign({
      text: "", fontSize: "clamp(4rem, 14vw, 12rem)", fontWeight: 400, fontFamily: "Anton",
      color: "#f1ede4", stroke: 0,           // stroke > 0 draws outlined text of that width (CSS px)
      shadow: null,                          // e.g. { color: "rgba(0,0,0,.85)", blur: 0, x: 0, y: 6 } (CSS px)
      baseIntensity: 0.18, hoverIntensity: 0.5, fuzzRange: 30, fps: 60, letterSpacing: 0
    }, o);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    let raf = 0, visible = true, hovering = false, cleanup = () => {};

    async function init() {
      cleanup();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // resolve a CSS size like clamp(...) to pixels
      const probe = document.createElement("span");
      probe.style.cssText = `position:absolute;visibility:hidden;font-size:${opt.fontSize}`;
      document.body.appendChild(probe);
      const size = parseFloat(getComputedStyle(probe).fontSize) * dpr;
      probe.remove();
      const font = `${opt.fontWeight} ${size}px ${opt.fontFamily}`;
      try { await document.fonts.load(`${opt.fontWeight} 40px ${opt.fontFamily}`); } catch (e) {}

      const off = document.createElement("canvas"), oc = off.getContext("2d");
      oc.font = font;
      const m = oc.measureText(opt.text);
      const ls = opt.letterSpacing * dpr;
      const width = Math.ceil((m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width) + ls * Math.max(opt.text.length - 1, 0));
      const asc = m.actualBoundingBoxAscent || size, desc = m.actualBoundingBoxDescent || size * 0.2;
      const lw = opt.stroke * dpr, sh = opt.shadow;
      const pad = Math.ceil(lw) + 6 + (sh ? Math.ceil((Math.abs(sh.y || 0) + (sh.blur || 0) * 2) * dpr) : 0);
      off.width = width + pad * 2; off.height = Math.ceil(asc + desc) + pad * 2;
      oc.font = font; oc.textBaseline = "alphabetic";
      const draw = (fn) => {
        if (!ls) return fn(opt.text, pad + (m.actualBoundingBoxLeft || 0), pad + asc);
        let x = pad; for (const ch of opt.text) { fn(ch, x, pad + asc); x += oc.measureText(ch).width + ls; }
      };
      if (lw) { oc.strokeStyle = opt.color; oc.lineWidth = lw; oc.lineJoin = "round"; draw((t, x, y) => oc.strokeText(t, x, y)); }
      else {
        if (sh) { oc.shadowColor = sh.color; oc.shadowBlur = (sh.blur || 0) * dpr; oc.shadowOffsetX = (sh.x || 0) * dpr; oc.shadowOffsetY = (sh.y || 0) * dpr; }
        oc.fillStyle = opt.color; draw((t, x, y) => oc.fillText(t, x, y));
      }

      const margin = Math.round((opt.fuzzRange + 20) * dpr);
      canvas.width = off.width + margin * 2; canvas.height = off.height;
      canvas.style.width = canvas.width / dpr + "px";
      canvas.style.height = canvas.height / dpr + "px";

      let current = opt.baseIntensity, last = 0;
      const frame = 1000 / opt.fps, range = opt.fuzzRange * dpr;
      const paint = (intensity) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let j = 0; j < off.height; j++) {
          const dx = Math.floor(intensity * (Math.random() - 0.5) * range);
          ctx.drawImage(off, 0, j, off.width, 1, margin + dx, j, off.width, 1);
        }
      };
      if (reduce) { paint(0); return; }
      const run = (t) => {
        raf = requestAnimationFrame(run);
        if (!visible || t - last < frame) return;
        last = t;
        const target = hovering ? opt.hoverIntensity : opt.baseIntensity;
        current += (target - current) * 0.2;
        paint(current);
      };
      raf = requestAnimationFrame(run);

      const onMove = (e) => {
        const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
        hovering = x > margin && x < margin + off.width && y > 0 && y < off.height;
      };
      const onLeave = () => { hovering = false; };
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      cleanup = () => { cancelAnimationFrame(raf); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerleave", onLeave); };
    }

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(init, 200); });
    init();
  };
})();
