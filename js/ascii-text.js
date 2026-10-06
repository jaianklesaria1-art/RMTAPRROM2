/* ASCII wordmark for the footer. A lightweight, dependency-free take on the React Bits <ASCIIText>
   (itself ported from codepen.io/JuanFuentes/pen/eYEeoyE): the text is drawn to a canvas, rippled with a
   gentle wave, tilted toward the pointer, then sampled into characters. Black and white only, tuned for
   legibility (dense charset at small sizes, no hue shift). Any element with [data-ascii] gets one. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CHARSET = " .:-=+*#%@";   // short, high-contrast ramp: crisp letter edges, solid fills

  function AsciiText(host) {
    const lines = (host.dataset.ascii || "ROLLING MILLS").split("|");     // "|" = line break on small screens
    const pre = document.createElement("pre");
    pre.className = "ascii-pre";
    host.appendChild(pre);
    const src = document.createElement("canvas"), sc = src.getContext("2d");
    const smp = document.createElement("canvas"), xc = smp.getContext("2d", { willReadFrequently: true });
    let cols = 0, rows = 0, charW = 0, charH = 0, visible = true, raf = 0, last = 0, mx = 0, my = 0, tx = 0, ty = 0;

    function layout() {
      const W = host.clientWidth; if (!W) return;
      if (host.dataset.asciiFit !== undefined) return layoutFit(W);
      const small = W < 640;
      const text = small ? lines : [lines.join(" ")];
      charH = +host.dataset.asciiSize || (small ? 6 : 8);     // css px per character row (data-ascii-size overrides)
      pre.style.fontSize = charH + "px"; pre.style.lineHeight = charH + "px";
      const probe = document.createElement("span"); probe.textContent = "M".repeat(20); pre.appendChild(probe);
      charW = probe.getBoundingClientRect().width / 20; probe.remove();
      cols = Math.max(20, Math.floor(W / charW));
      // draw the source text big and crisp, then size the sample grid to its aspect ratio
      const fs = 220;
      sc.font = `400 ${fs}px Anton, Impact, sans-serif`;
      const tw = Math.max(...text.map(t => sc.measureText(t).width));
      const lh = fs * 1.02, padX = fs * 0.12, padY = fs * 0.16;
      src.width = Math.ceil(tw + padX * 2); src.height = Math.ceil(lh * text.length + padY * 2);
      sc.font = `400 ${fs}px Anton, Impact, sans-serif`; sc.fillStyle = "#fff"; sc.textBaseline = "top"; sc.textAlign = "center";
      text.forEach((t, i) => sc.fillText(t, src.width / 2, padY + i * lh));
      rows = Math.max(6, Math.round(cols * charW / (src.width / src.height) / charH));
      smp.width = cols; smp.height = rows;
      render(performance.now());
    }

    /* fit mode (footer wordmark): the ASCII is laid exactly over the host's own text box, same font and size,
       so it drops into an existing layout. Character size scales with the font size. */
    function layoutFit(W) {
      const H = host.clientHeight; if (!H) return;
      const fpx = parseFloat(getComputedStyle(host).fontSize) || 100;
      charH = Math.max(2, Math.min(9, Math.round(fpx / 22)));   // ~20 rows of characters per line of text
      pre.style.fontSize = charH + "px"; pre.style.lineHeight = charH + "px";
      const probe = document.createElement("span"); probe.textContent = "M".repeat(20); pre.appendChild(probe);
      charW = probe.getBoundingClientRect().width / 20; probe.remove();
      cols = Math.max(8, Math.floor(W / charW)); rows = Math.max(4, Math.floor(H / charH));
      const k = 400 / fpx, fs = fpx * k;
      src.width = Math.ceil(W * k); src.height = Math.ceil(H * k);
      sc.clearRect(0, 0, src.width, src.height);
      sc.font = `400 ${fs}px Anton, Impact, sans-serif`; sc.fillStyle = "#fff"; sc.textAlign = "center"; sc.textBaseline = "alphabetic";
      // centre the real ink (cap height), not the em box: the wordmark's line-height is tighter than the font
      const word = lines.join(" "), m = sc.measureText(word);
      const asc = m.actualBoundingBoxAscent || fs * .72, desc = m.actualBoundingBoxDescent || 0;
      const inkW = (m.actualBoundingBoxLeft || m.width / 2) + (m.actualBoundingBoxRight || m.width / 2);
      if (inkW > src.width * .98) { const f = src.width * .98 / inkW; sc.font = `400 ${fs * f}px Anton, Impact, sans-serif`; }
      const m2 = sc.measureText(word), a2 = m2.actualBoundingBoxAscent || asc, d2 = m2.actualBoundingBoxDescent || desc;
      sc.fillText(word, src.width / 2, (src.height + a2 - d2) / 2);
      smp.width = cols; smp.height = rows;
      render(performance.now());
    }

    function render(t) {
      const time = t / 1000;
      tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06;
      xc.setTransform(1, 0, 0, 1, 0, 0); xc.clearRect(0, 0, cols, rows);
      // gentle tilt toward the pointer, then a soft per-row ripple (the "waves")
      const tilt = host.dataset.asciiWave ? +host.dataset.asciiWave : 1;
      xc.setTransform(1, ty * 0.06 * tilt, tx * -0.18 * tilt, 1, 0, 0);
      const amp = reduce ? 0 : cols * 0.006 * (host.dataset.asciiWave ? +host.dataset.asciiWave : 1), step = src.height / rows;
      for (let r = 0; r < rows; r++) {
        const dx = Math.sin(time * 1.6 + r * 0.45) * amp;
        xc.drawImage(src, 0, r * step, src.width, step, dx, r, cols, 1);
      }
      const d = xc.getImageData(0, 0, cols, rows).data;
      let out = "";
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const a = d[(y * cols + x) * 4 + 3] / 255;
          out += a < 0.12 ? " " : CHARSET[Math.min(CHARSET.length - 1, Math.round(a * (CHARSET.length - 1)))];
        }
        out += "\n";
      }
      pre.textContent = out;
    }

    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (!visible || t - last < 1000 / 30) return;        // 30 fps is plenty for text
      last = t; render(t);
    }

    host.addEventListener("pointermove", e => {
      const b = host.getBoundingClientRect();
      mx = (e.clientX - b.left) / b.width - 0.5; my = (e.clientY - b.top) / b.height - 0.5;
    });
    host.addEventListener("pointerleave", () => { mx = my = 0; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);
    let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(layout, 120); }).observe(host);
    (document.fonts ? document.fonts.load("400 40px Anton").catch(() => {}) : Promise.resolve()).then(() => {
      layout();
      if (!reduce) raf = requestAnimationFrame(loop);
    });
  }

  document.querySelectorAll("[data-ascii]").forEach(AsciiText);
})();
