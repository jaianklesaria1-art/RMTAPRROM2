/* Gallery (Jai picked option 3, the ticker wall): a tilted wall of rounded tiles of the real taproom photos,
   rows sliding opposite ways. Tiles start grey and fade the photo in. Hovering a row pauses it; tapping a tile
   opens the photo full size in a dialog (arrow keys / swipe to move, Esc to close). */
(function () {
  "use strict";
  const box = document.querySelector('[data-gallery="ticker"]'); if (!box) return;
  const N = 20, src = i => `assets/gallery/g${String((i % N) + 1).padStart(2, "0")}.webp`;
  const rows = 5, per = 10;
  box.querySelector(".gt-wall").innerHTML = Array.from({ length: rows }, (_, r) => {
    const set = copy => Array.from({ length: per }, (_, i) => { const k = (r * 4 + i * 3) % N;
      return `<button class="gt-tile" type="button" data-photo="${k}" ${copy ? 'tabindex="-1" aria-hidden="true"' : `aria-label="Open photo ${k + 1} of ${N}"`}><img class="gt-img" src="${src(k)}" alt="" loading="lazy" decoding="async" draggable="false"></button>`; }).join("");
    return `<div class="gt-row ${r % 2 ? "rev" : ""}" style="--dur:${38 + r * 6}s"><div class="gt-track">${set(false)}${set(true)}</div></div>`;
  }).join("");
  box.querySelectorAll(".gt-img").forEach(i => { const done = () => i.classList.add("in"); i.complete ? done() : i.addEventListener("load", done); });
  // decode the photos well before the wall scrolls into view, so it isn't done mid-scroll (that caused stutter)
  new IntersectionObserver((es, io) => { if (!es[0].isIntersecting) return; io.disconnect();
    const seen = new Set(); box.querySelectorAll(".gt-img").forEach(i => { i.loading = "eager"; if (!seen.has(i.src) && i.decode) { seen.add(i.src); i.decode().catch(() => {}); } });
  }, { rootMargin: "1600px 0px" }).observe(box);
  new IntersectionObserver(([e]) => box.classList.toggle("paused", !e.isIntersecting), { rootMargin: "100px" }).observe(box);

  // lightbox
  const dlg = box.querySelector(".glb"), big = dlg.querySelector(".glb-img"), cap = dlg.querySelector(".glb-cap");
  let cur = 0, opener = null;
  const show = k => { cur = (k + N) % N; big.src = src(cur); big.alt = `Inside the Rolling Mills taproom, photo ${cur + 1} of ${N}`; cap.textContent = `${cur + 1} / ${N}`; };
  box.querySelector(".gt-wall").addEventListener("click", e => {
    const t = e.target.closest(".gt-tile"); if (!t) return;
    opener = t.getAttribute("aria-hidden") ? null : t; show(+t.dataset.photo);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    document.body.classList.add("has-overlay");
  });
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener("close", () => { document.body.classList.remove("has-overlay"); if (opener) opener.focus(); });
  dlg.addEventListener("click", e => {
    if (e.target.closest("[data-glb-close]") || e.target === dlg) return close();
    const st = e.target.closest("[data-glb-step]"); if (st) show(cur + +st.dataset.glbStep);
  });
  dlg.addEventListener("keydown", e => { if (e.key === "ArrowRight") show(cur + 1); if (e.key === "ArrowLeft") show(cur - 1); });
  let sx = null;
  dlg.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener("touchend", e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
})();
