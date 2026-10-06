/* Rolling Mills Taproom: shared site behaviour. Content comes from js/data.js. */
(() => {
  "use strict";
  const D = window.RM_DATA, P = D.place;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const local = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const session = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- analytics hook (Plausible or GA4, whichever the client picks) ---------- */
  function track(name) {
    try { if (window.plausible) window.plausible(name); else if (window.gtag) window.gtag("event", name); } catch (e) {}
  }
  document.addEventListener("click", e => { const t = e.target.closest("[data-track]"); if (t) track(t.dataset.track); });

  /* =====================================================================
     TIME: everything runs on India time, whatever the phone is set to
     ===================================================================== */
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const DAY_LONG = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  const DAY_SHORT = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const IST_OFFSET = 330;
  // A Date whose local getters read as IST wall-clock time
  const istNow = () => { const d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + IST_OFFSET) * 60000); };
  const pad = n => String(n).padStart(2, "0");
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromIso = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmtTime = min => {
    min = ((min % 1440) + 1440) % 1440;
    const h = Math.floor(min / 60), m = min % 60, ap = h < 12 ? "AM" : "PM", h12 = h % 12 || 12;
    return m ? `${h12}:${pad(m)} ${ap}` : `${h12} ${ap}`;
  };
  const fmtDate = d => `${DAY_SHORT[DAYS[d.getDay()]]} ${d.getDate()} ${MON[d.getMonth()]}`;
  // Event times are IST strings like "2026-10-17T20:00": convert to a real timestamp
  const istStamp = s => { const [dt, tm] = s.split("T"); const [y, m, d] = dt.split("-").map(Number); const [h, mi] = tm.split(":").map(Number); return Date.UTC(y, m - 1, d, h, mi) - IST_OFFSET * 60000; };

  function rangesFor(date) {
    const iso = isoDate(date);
    const ex = (D.exceptions || []).find(x => x.date === iso);
    if (ex) return { ranges: ex.closed ? [] : (ex.hours || []), reason: ex.reason || "" };
    return { ranges: D.hours[DAYS[date.getDay()]] || [], reason: "" };
  }
  const span = r => { const o = toMin(r[0]); let c = toMin(r[1]); if (c <= o) c += 1440; return [o, c]; };

  function openStatus() {
    const now = istNow(), mins = now.getHours() * 60 + now.getMinutes();
    // still open from a late night yesterday?
    for (const r of rangesFor(addDays(now, -1)).ranges) { const [, c] = span(r); if (c > 1440 && mins < c - 1440) return { open: true, text: `Open now · closes ${fmtTime(c)}` }; }
    const today = rangesFor(now);
    for (const r of today.ranges) { const [o, c] = span(r); if (mins >= o && mins < c) return { open: true, text: `Open now · closes ${fmtTime(c)}${c - mins <= 60 ? " (soon)" : ""}` }; }
    for (const r of today.ranges) { const [o] = span(r); if (o > mins) return { open: false, text: `Closed now · opens today at ${fmtTime(o)}` }; }
    for (let i = 1; i <= 7; i++) {
      const d = addDays(now, i), rr = rangesFor(d).ranges;
      if (rr.length) { const when = i === 1 ? "tomorrow" : DAY_LONG[DAYS[d.getDay()]]; return { open: false, text: `Closed now · opens ${when} at ${fmtTime(span(rr[0])[0])}` }; }
    }
    return { open: false, text: "Closed now" };
  }
  const rangeText = rr => rr.length ? rr.map(r => { const [o, c] = span(r); return `${fmtTime(o)} to ${fmtTime(c)}`; }).join(", ") : "Closed";

  function renderHours() {
    const s = openStatus();
    $$("[data-status]").forEach(el => { el.textContent = s.text; el.classList.toggle("is-open", s.open); el.classList.toggle("is-closed", !s.open); });
    const t = rangesFor(istNow());
    $$("[data-today-hours]").forEach(el => el.textContent = t.ranges.length ? rangeText(t.ranges) : `Closed${t.reason ? " (" + t.reason + ")" : ""}`);
    // footer summary: group days that share the same hours
    const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], groups = [];
    order.forEach(k => { const txt = rangeText(D.hours[k]); const g = groups.find(x => x.txt === txt); g ? g.days.push(DAY_SHORT[k]) : groups.push({ txt, days: [DAY_SHORT[k]] }); });
    $$("[data-hours-summary]").forEach(el => el.innerHTML = groups.map(g => `${g.days.join(", ")}: ${g.txt}`).join("<br>"));
    // footer: consecutive days with the same hours become one row ("Mon to Thu"), today's row is marked
    const listEl = $$("[data-hours-list]");
    if (listEl.length) {
      const todayK = DAYS[istNow().getDay()], runs = [];
      order.forEach(k => { const txt = rangeText(D.hours[k]), r = runs[runs.length - 1]; r && r.txt === txt ? r.days.push(k) : runs.push({ txt, days: [k] }); });
      const html = runs.map(r => {
        const label = r.days.length > 2 ? `${DAY_SHORT[r.days[0]]} to ${DAY_SHORT[r.days[r.days.length - 1]]}` : r.days.map(d => DAY_SHORT[d]).join(" & ");
        const isToday = r.days.includes(todayK);
        const short = r.txt.replace(/ (AM|PM)/g, (m, ap) => ap.toLowerCase());   // "11:30 AM" -> "11:30am", keeps each row on one line
        return `<div class="${isToday ? "is-today" : ""}${r.txt === "Closed" ? " is-closed" : ""}"><dt>${label}${isToday ? ' <span class="ft-today">Today</span>' : ""}</dt><dd>${short}</dd></div>`;
      }).join("");
      listEl.forEach(el => el.innerHTML = html);
    }
    // visit page table
    const tbl = $("[data-hours-table]");
    if (tbl) {
      const todayKey = DAYS[istNow().getDay()];
      tbl.insertAdjacentHTML("beforeend", "<tbody>" + order.map(k => {
        const rr = D.hours[k], cls = [k === todayKey ? "is-today" : "", rr.length ? "" : "is-closed"].join(" ").trim();
        return `<tr class="${cls}"><td>${DAY_LONG[k]}${k === todayKey ? " (today)" : ""}</td><td>${rangeText(rr)}</td></tr>`;
      }).join("") + "</tbody>");
      const note = $("[data-hours-note]"); if (note && !D.hoursConfirmed) note.hidden = false;
      const exList = $("[data-exceptions]"), todayIso = isoDate(istNow());
      if (exList) exList.innerHTML = (D.exceptions || []).filter(x => x.date >= todayIso)
        .map(x => `<li>${fmtDate(fromIso(x.date))}: ${x.closed ? "Closed" : rangeText(x.hours || [])}${x.reason ? " · " + esc(x.reason) : ""}</li>`).join("");
    }
  }

  /* =====================================================================
     BEERS
     ===================================================================== */
  const beerBy = slug => D.beers.find(b => b.slug === slug);
  const foodBy = slug => [...D.food, ...D.softDrinks].find(f => f.slug === slug);
  const onTap = () => D.beers.filter(b => b.status === "on-tap");
  const priceText = s => `₹${s[1].toLocaleString("en-IN")} · ${s[0]}`;

  function renderUpdated() {
    const els = $$("[data-updated]"); if (!els.length) return;
    const upd = fromIso(D.tapListUpdated), age = (istNow() - upd) / 864e5;
    const txt = age > 14 ? "Ask at the bar for today's list" : `Tap list updated ${fmtDate(upd)}`;
    els.forEach(el => el.textContent = txt);
    $$("[data-tap-count]").forEach(el => el.textContent = onTap().length);
  }

  function beerCard(b, asLink) {
    const tag = asLink ? "a" : "button";
    const attrs = asLink ? `href="on-tap.html#${b.slug}"` : `type="button" aria-haspopup="dialog"`;
    return `<${tag} class="beer" ${attrs} data-slug="${b.slug}" data-group="${esc(b.group)}">
      <span class="beer-art"><img src="assets/labels/${b.img}" alt="" width="400" height="400" loading="lazy"></span>
      <span class="beer-body">
        <span class="beer-top"><span class="beer-name">${esc(b.name)}</span><span class="beer-abv">${b.abv}%</span></span>
        <span class="beer-style">${esc(b.style)}${b.status === "cans" ? ' <span class="badge badge-off">Cans</span>' : ""}${b.status === "sold-out" ? ' <span class="badge badge-off">Back soon</span>' : ""}</span>
      </span></${tag}>`;
  }

  function renderBeers() {
    const home = $('[data-beers="home"]');
    if (home) home.innerHTML = onTap().slice(0, 4).map(b => beerCard(b, true)).join("");
    const grid = $('[data-beers="all"]');
    if (!grid) return;
    const shop = grid.classList.contains("shop-grid");
    const shopCard = b => `<button class="beer shop-card" type="button" aria-haspopup="dialog" data-slug="${b.slug}" data-group="${esc(b.group)}">
      <span class="shop-can"><img src="assets/cans/${b.slug}.webp" alt="" width="223" height="380" loading="lazy"></span>
      <span class="shop-name">${esc(b.name)}</span>
      <span class="shop-style">${esc(b.style)} · ${b.abv}%</span>
      <span class="shop-price">₹${b.sizes[0][1].toLocaleString("en-IN")} <small>${esc(b.sizes[0][0])}</small><span class="shop-plus" aria-hidden="true">+</span></span>
    </button>`;
    grid.innerHTML = D.beers.map(b => shop ? shopCard(b) : beerCard(b, false)).join("");
    const countEl = $("[data-shop-count]"), setCount = n => { if (countEl) countEl.textContent = `${n} ${n === 1 ? "beer" : "beers"}`; };
    setCount(D.beers.length);
    // style filters, built from the data
    const groups = ["All", ...new Set(D.beers.map(b => b.group))];
    const fl = $("[data-filters]"), status = $("[data-filter-status]");
    fl.innerHTML = groups.map(g => `<button class="chip" type="button" aria-pressed="${g === "All"}" data-group="${esc(g)}">${g === "All" ? "All beers" : esc(g)}</button>`).join("");
    fl.addEventListener("click", e => {
      const c = e.target.closest(".chip"); if (!c) return;
      $$(".chip", fl).forEach(x => x.setAttribute("aria-pressed", x === c));
      let n = 0;
      $$(".beer", grid).forEach(card => { const show = c.dataset.group === "All" || card.dataset.group === c.dataset.group; card.hidden = !show; if (show) n++; });
      status.textContent = `Showing ${n} ${n === 1 ? "beer" : "beers"}`; setCount(n);
    });
    grid.addEventListener("click", e => { const card = e.target.closest(".beer"); if (card) openBeer(card.dataset.slug, card); });
    const fromHash = beerBy(decodeURIComponent(location.hash.slice(1)));
    if (fromHash) openBeer(fromHash.slug, $(`.beer[data-slug="${fromHash.slug}"]`, grid));
  }

  /* drawer with focus trap */
  let lastFocus = null;
  function openBeer(slug, opener) {
    const b = beerBy(slug), dr = $("#beer-drawer"); if (!b || !dr) return;
    lastFocus = opener || document.activeElement;
    const pair = b.pairs && foodBy(b.pairs);
    const shopDrawer = !!$(".d3-stage", dr);
    if (shopDrawer) {
      // home page beer stage look: the beer's own colour, light graffiti labels, dark values, dashed spec grid, serif notes
      const lum = hx => { const v = [1, 3, 5].map(i => parseInt(hx.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
      const sheet = $(".drawer-sheet", dr);
      sheet.classList.add("d3"); sheet.style.setProperty("--bg", b.bg); sheet.style.setProperty("--hl", b.hl);
      sheet.classList.toggle("d3-dark-labels", 1.05 / (lum(b.bg) + .05) < 3);
      sheet.scrollTop = 0;
      $("[data-drawer-body]", dr).innerHTML = `
      <div class="d3-info">
        <p class="d3-kick">Discover our beers</p>
        <h2 class="display d3-name" id="d-name">${esc(b.name)}</h2>
        <p class="d3-abv">Alc ${b.abv}% vol · ${esc(b.sizes[0][0])}</p>
        <p class="d3-label">Style</p>
        <p class="d3-style">${esc(b.style)}</p>
        <p class="d3-tagline">${esc(b.tagline || b.style)}</p>
        <p class="d3-desc">${esc(b.desc)}</p>
        <dl class="d3-specs">
          <div><dt>Size</dt><dd>${esc(b.sizes[0][0])}</dd></div>
          <div><dt>Price</dt><dd>₹${b.sizes[0][1].toLocaleString("en-IN")}</dd></div>
          <div><dt>Style</dt><dd>${esc(b.group)}</dd></div>
          ${pair ? `<div><dt>Pairs with</dt><dd><a href="menu.html?tab=food&amp;item=${pair.slug}">${esc(pair.name)}</a></dd></div>` : ""}
        </dl>
        <p class="d3-small">${b.status === "cans" ? "Cans to take home" : "Fresh from our brewhouse"}</p>
        ${b.status === "sold-out" ? `<p class="banner">Back soon. Ask at the bar for something similar.</p>` : `
        <div class="cta-row d3-ctas">
          <a class="btn btn-solid" href="${P.orderUrl}" target="_blank" rel="noopener" data-track="Order beer">Order on AirMenus<span class="sr"> (opens AirMenus)</span></a>
          <a class="btn btn-line" href="book.html" data-track="Book a table">Drink it here: book a table</a>
        </div>`}
        <p class="d3-note">3D can is a concept render with the real label art.</p>
      </div>`;
    } else {
    $("[data-drawer-body]", dr).innerHTML = `
      <p class="kicker" style="--accent:var(--cyan)">${esc(b.style)}</p>
      <h2 class="display d-name" id="d-name">${esc(b.name)}</h2>
      <img class="d-art" src="assets/labels/${b.img}" alt="${esc(b.name)} label art" width="600" height="600">
      <p>${esc(b.desc)}</p>
      ${b.flavour && b.flavour.length ? `<p class="meta-line">${b.flavour.map(esc).join(" · ")}</p>` : ""}
      <div class="d-stats" style="--accent:var(--cyan)">
        <div class="d-stat"><b>${b.abv}%</b><span>ABV</span></div>
        <div class="d-stat"><b>${esc(b.sizes[0][0])}</b><span>To take home</span></div>
        <div class="d-stat"><b>₹${b.sizes[0][1].toLocaleString("en-IN")}</b><span>AirMenus</span></div>
      </div>
      ${b.status === "sold-out" ? `<p class="banner">Back soon. Ask at the bar for something similar.</p>` : `
      <div class="cta-row">
        <a class="btn btn-solid" href="${P.orderUrl}" target="_blank" rel="noopener" data-track="Order beer">Order on AirMenus<span class="sr"> (opens AirMenus)</span></a>
        <a class="btn btn-line" href="book.html" data-track="Book a table">Drink it here: book a table</a>
      </div>`}
      ${pair ? `<p class="d-pair">Goes well with <a class="link" href="menu.html?tab=food&amp;item=${pair.slug}">${esc(pair.name)}</a>${pair.sample ? ' <span class="badge badge-sample">Sample</span>' : ""}</p>` : ""}`;
    }
    if (dr.parentElement !== document.body) document.body.appendChild(dr);
    dr.hidden = false;
    setOverlay(true, dr);
    history.replaceState(null, "", "#" + slug);
    $(".drawer-close", dr).focus();
    if (shopDrawer) {
      const cv = $(".d3-canvas", dr), fb = $(".d3-fallback", dr);
      const ok = window.RMDrawerCan && window.RMDrawerCan.show(cv, b);
      cv.hidden = !ok; fb.hidden = !!ok;
      if (!ok) { fb.src = `assets/cans/${b.slug}.webp`; fb.alt = `${b.name} can`; }
    }
  }
  function closeBeer() {
    const dr = $("#beer-drawer"); if (!dr || dr.hidden) return;
    dr.hidden = true; setOverlay(false);
    if (window.RMDrawerCan) window.RMDrawerCan.stop();
    history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", e => { if (e.target.closest("#beer-drawer [data-close]")) closeBeer(); });

  // everything outside an open dialog becomes inert
  function setOverlay(on, keep) {
    document.body.classList.toggle("has-overlay", on);
    ["header.site-header", "#main", "footer.site-footer", ".actionbar"].forEach(s => { const el = $(s); if (el && el !== keep) el.inert = on; });
  }
  document.addEventListener("keydown", e => {
    const dr = $("#beer-drawer");
    if (dr && !dr.hidden) {
      if (e.key === "Escape") closeBeer();
      if (e.key === "Tab") {
        const f = $$('a[href],button:not([disabled])', dr); const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  });

  /* =====================================================================
     MENU
     ===================================================================== */
  function menuItem(item, kind) {
    const diet = item.veg ? '<span class="diet diet-veg" role="img" aria-label="Vegetarian"></span>' : '<span class="diet diet-nonveg" role="img" aria-label="Non-vegetarian"></span>';
    if (kind === "beer") {
      return `<div class="menu-item has-pic" id="item-${item.slug}"><span class="mi-pic mi-pic-can"><img src="assets/cans/${item.slug}.webp" alt="" width="223" height="380" loading="lazy"></span><h3>${esc(item.name)} <span class="beer-abv">${item.abv}%</span></h3>
        <span class="price">${priceText(item.sizes[0])}</span><p>${esc(item.style)}. ${esc(item.desc)}</p>
        <p class="pair"><a href="on-tap.html#${item.slug}">Details</a> · <a href="${P.orderUrl}" target="_blank" rel="noopener" data-track="Order beer">Order on AirMenus<span class="sr"> (opens AirMenus)</span></a></p></div>`;
    }
    const beers = D.beers.filter(b => b.pairs === item.slug);
    const pic = D.food.includes(item) ? `<span class="mi-pic"><img src="assets/menu/${item.slug}.webp" alt="" loading="lazy"></span>` : "";
    return `<div class="menu-item${pic ? " has-pic" : ""}" id="item-${item.slug}" data-veg="${item.veg}">${pic}<h3>${diet}${esc(item.name)}${item.sample ? ' <span class="badge badge-sample">Sample</span>' : ""}</h3>
      <span class="price">${item.price ? "₹" + item.price : ""}</span><p>${esc(item.desc)}</p>
      ${beers.length ? `<p class="pair">Pairs with ${beers.map(b => `<a href="on-tap.html#${b.slug}">${esc(b.name)}</a>`).join(", ")}</p>` : ""}</div>`;
  }
  function grouped(list) {
    const cats = [...new Set(list.map(i => i.cat))];
    return cats.map(c => `<h3 class="menu-cat">${esc(c)}</h3>` + list.filter(i => i.cat === c).map(i => menuItem(i, "food")).join("")).join("");
  }
  function renderMenu() {
    const teaser = $('[data-food="home"]');
    if (teaser) teaser.innerHTML = D.food.slice(0, 4).map(i => menuItem(i, "food")).join("");
    const beerP = $('[data-menu="beer"]'); if (!beerP) return;
    beerP.innerHTML = `<p class="note">Take-home prices from AirMenus. Ask at the bar for glass sizes and prices.</p>` + D.beers.map(b => menuItem(b, "beer")).join("");
    $('[data-menu="food"]').innerHTML = grouped(D.food);
    $('[data-menu="soft"]').innerHTML = D.softDrinks.map(i => menuItem(i, "food")).join("");
    const veg = $("[data-veg-only]");
    veg.addEventListener("change", () => $$('.menu-item[data-veg]').forEach(el => el.hidden = veg.checked && el.dataset.veg === "false"));
    const q = new URLSearchParams(location.search);
    const tab = { beer: "tab-beer", food: "tab-food", soft: "tab-soft" }[q.get("tab")];
    if (tab) selectTab($("#" + tab));
    const item = q.get("item") && $("#item-" + CSS.escape(q.get("item")));
    if (item) { item.classList.add("is-highlight"); setTimeout(() => item.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }), 150); }
  }

  /* generic accessible tabs (arrow keys move between tabs) */
  function selectTab(tab) {
    const list = tab.closest("[role=tablist]"), tabs = $$("[role=tab]", list);
    tabs.forEach(t => {
      const on = t === tab; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel && tabs.filter(x => x.getAttribute("aria-controls") === panel.id).length === 1) panel.hidden = !on;
    });
    tab.dispatchEvent(new CustomEvent("tab:select", { bubbles: true }));
  }
  $$("[role=tablist]").forEach(list => {
    list.addEventListener("click", e => { const t = e.target.closest("[role=tab]"); if (t) selectTab(t); });
    list.addEventListener("keydown", e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const tabs = $$("[role=tab]", list), i = tabs.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault();
      const n = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(tabs[n]); tabs[n].focus();
    });
  });

  /* =====================================================================
     EVENTS
     ===================================================================== */
  const evs = () => D.events.map(e => ({ ...e, s: istStamp(e.start), en: istStamp(e.end) })).sort((a, b) => a.s - b.s);
  const upcoming = () => evs().filter(e => e.en > Date.now());
  const past = () => evs().filter(e => e.en <= Date.now()).reverse();
  const evDate = e => fromIso(e.start.slice(0, 10));
  const evTimes = e => `${fmtTime(toMin(e.start.slice(11)))} to ${fmtTime(toMin(e.end.slice(11)))}`;
  const evPrice = e => e.price ? `₹${e.price}` : "Free entry";

  function evRow(e, isPast) {
    const d = evDate(e);
    return `<a class="ev${isPast ? " is-past" : ""}" href="event.html?e=${e.slug}">
      <span class="ev-date"><b>${d.getDate()}</b><span>${DAY_SHORT[DAYS[d.getDay()]]} ${MON[d.getMonth()]}</span></span>
      <span><span class="ev-title">${esc(e.title)}${e.sample ? ' <span class="badge badge-sample">Sample</span>' : ""}</span>
      <span class="ev-meta">${evTimes(e)} · ${evPrice(e)} · ${esc(e.type)}</span></span>
      <span class="ev-go" aria-hidden="true">Details →</span></a>`;
  }
  const emptyEvents = msg => `<p class="empty">${msg}</p>`;

  function renderEvents() {
    const home = $('[data-events="home"]');
    if (home) { const up = upcoming().slice(0, 3); home.innerHTML = up.length ? up.map(e => evRow(e)).join("") : emptyEvents('Nothing announced yet. Follow <a href="' + P.instagram + '" target="_blank" rel="noopener">@rollingmillsbrewery</a> for what\'s next.'); }
    const list = $('[data-events="page"]');
    if (list) {
      const draw = when => {
        const week = Date.now() + 7 * 864e5;
        const items = when === "past" ? past() : when === "week" ? upcoming().filter(e => e.s <= week) : upcoming();
        list.innerHTML = items.length ? items.map(e => evRow(e, when === "past")).join("")
          : when === "week" ? emptyEvents('Nothing on in the next 7 days. <button class="btn btn-sm btn-line" type="button" data-goto-upcoming>See what\'s coming up</button>')
          : emptyEvents("Nothing here yet.");
      };
      const tl = $("[role=tablist]");
      tl.addEventListener("tab:select", e => draw(e.target.dataset.when));
      list.addEventListener("click", e => { if (e.target.closest("[data-goto-upcoming]")) { const t = $("#tab-up"); selectTab(t); t.focus(); } });
      draw("week");
    }
    renderEventDetail();
  }

  function icsFor(e) {
    const z = t => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const x = s => String(s).replace(/([,;\\])/g, "\\$1");
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rolling Mills Taproom//Events//EN", "BEGIN:VEVENT",
      `UID:${e.slug}@rollingmills-taproom`, `DTSTAMP:${z(Date.now())}`, `DTSTART:${z(e.s)}`, `DTEND:${z(e.en)}`,
      `SUMMARY:${x(e.title + " at Rolling Mills Taproom")}`, `LOCATION:${x("Rolling Mills Taproom, " + P.address.join(", "))}`,
      `DESCRIPTION:${x(e.desc)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  }

  function renderEventDetail() {
    const box = $("[data-event-detail]"); if (!box) return;
    const slug = new URLSearchParams(location.search).get("e") || location.pathname.split("/").filter(Boolean).pop();
    const e = evs().find(x => x.slug === slug);
    const more = $('[data-events="more"]');
    const showMore = exclude => { const up = upcoming().filter(x => x.slug !== exclude).slice(0, 3); if (up.length) { more.innerHTML = up.map(x => evRow(x)).join(""); $("[data-more-events-wrap]").hidden = false; } };
    if (!e) { box.innerHTML = `<h1 class="display h2">We couldn't find that event</h1><p class="lead">It may have been moved or taken down.</p><p><a class="btn btn-line" href="events.html">See all events</a></p>`; showMore(); return; }
    const isPast = e.en <= Date.now(), d = evDate(e), dateLong = `${DAY_LONG[DAYS[d.getDay()]]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
    document.title = `${e.title} · Events · Rolling Mills Taproom, Andheri West`;
    const beer = e.beer && beerBy(e.beer);
    const rsvp = `https://wa.me/${P.whatsapp}?text=${encodeURIComponent(`Hi Rolling Mills! I'd like to RSVP for ${e.title} on ${dateLong}.\nName: \nHow many of us: `)}`;
    box.innerHTML = `
      ${isPast ? `<p class="banner" role="status"><b>This one's over.</b> Here's what's coming up next.</p>` : ""}
      <div class="event-detail">
        <img src="assets/photos/${e.img}" alt="" width="1400" height="1050">
        <div>
          <p class="kicker">${esc(e.type)}</p>
          <h1 class="display h2">${esc(e.title)}</h1>
          ${e.sample ? '<p><span class="badge badge-sample">Sample event</span></p>' : ""}
          <ul class="facts">
            <li><span>Date</span>${dateLong}</li>
            <li><span>Time</span>${evTimes(e)}</li>
            <li><span>Entry</span>${evPrice(e)}</li>
            <li><span>Where</span>Rolling Mills Taproom, New Link Road, Andheri West</li>
          </ul>
          <p class="lead">${esc(e.desc)}</p>
          ${beer ? `<p>Featured beer: <a class="link" href="on-tap.html#${beer.slug}">${esc(beer.name)}</a></p>` : ""}
          ${isPast ? "" : `<div class="cta-row">
            <a class="btn btn-solid" href="${rsvp}" target="_blank" rel="noopener" data-track="Event RSVP">RSVP on WhatsApp</a>
            <button class="btn btn-line" type="button" data-ics>Add to calendar</button>
            <button class="btn btn-line" type="button" data-share>Share</button>
          </div>
          <p class="note" data-share-msg aria-live="polite"></p>
          <p><a class="link" href="book.html?date=${e.start.slice(0, 10)}&amp;time=${e.start.slice(11)}" data-track="Book a table">Want a table too? Book for this night →</a></p>`}
        </div>
      </div>`;
    const ics = $("[data-ics]", box);
    if (ics) ics.addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([icsFor(e)], { type: "text/calendar" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `${e.slug}.ics` });
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); track("Add to calendar");
    });
    const share = $("[data-share]", box);
    if (share) share.addEventListener("click", async () => {
      const data = { title: e.title, text: `${e.title} at Rolling Mills Taproom, ${dateLong}`, url: location.href };
      try { if (navigator.share) { await navigator.share(data); return; } await navigator.clipboard.writeText(location.href); $("[data-share-msg]").textContent = "Link copied."; }
      catch (err) { if (err && err.name !== "AbortError") $("[data-share-msg]").textContent = "Copy the link from your address bar to share."; }
    });
    showMore(e.slug);
  }

  /* =====================================================================
     FORMS: booking and party enquiries go to WhatsApp, nothing is stored on a server
     ===================================================================== */
  const cleanPhone = v => v.replace(/[\s()-]/g, "");
  const validPhone = v => /^(\+?91)?[6-9]\d{9}$/.test(cleanPhone(v));

  function showErrors(form, errs) {
    $$(".err", form).forEach(x => x.remove());
    $$("[aria-invalid]", form).forEach(x => x.removeAttribute("aria-invalid"));
    const box = $(".form-errors", form);
    if (!errs.length) { box.hidden = true; return true; }
    errs.forEach(([el, msg]) => {
      el.setAttribute("aria-invalid", "true");
      const p = Object.assign(document.createElement("p"), { className: "err", id: el.id + "-err", textContent: msg });
      el.insertAdjacentElement("afterend", p);
      el.setAttribute("aria-describedby", [el.getAttribute("aria-describedby"), p.id].filter(Boolean).join(" "));
    });
    box.innerHTML = `<p>Please fix ${errs.length === 1 ? "this" : "these"}:</p><ul>${errs.map(([el, m]) => `<li><a href="#${el.id}">${esc(m)}</a></li>`).join("")}</ul>`;
    box.hidden = false; box.focus();
    return false;
  }
  const openWhatsApp = text => window.open(`https://wa.me/${P.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");

  function initBooking() {
    const f = $("#book-form"); if (!f) return;
    const today = istNow(), todayIso = isoDate(today);
    f.date.min = todayIso; f.date.max = isoDate(addDays(today, 60));
    const closedMsg = $("[data-closed-msg]"), big = $("[data-big-group]");

    function fillTimes(keep) {
      const sel = f.time; sel.innerHTML = ""; closedMsg.hidden = true;
      if (!f.date.value) { sel.innerHTML = '<option value="">Pick a date first</option>'; return; }
      const d = fromIso(f.date.value), { ranges, reason } = rangesFor(d), slots = [];
      const nowMin = f.date.value === todayIso ? istNow().getHours() * 60 + istNow().getMinutes() + 30 : -1;
      ranges.forEach(r => { const [o, c] = span(r); for (let m = o; m <= c - 60; m += 30) if (m > nowMin) slots.push(m); });
      if (!slots.length) {
        let next = null; for (let i = 1; i <= 14 && !next; i++) { const nd = addDays(d, i); if (rangesFor(nd).ranges.length) next = nd; }
        closedMsg.textContent = ranges.length ? "No more tables to book today." : `We're closed on ${fmtDate(d)}${reason ? " (" + reason + ")" : ""}.`;
        if (next) closedMsg.innerHTML = esc(closedMsg.textContent) + ` <button class="btn btn-sm btn-line" type="button" data-next-day="${isoDate(next)}">Try ${fmtDate(next)}</button>`;
        closedMsg.hidden = false;
        sel.innerHTML = '<option value="">No times available</option>';
        return;
      }
      sel.innerHTML = '<option value="">Choose a time</option>' + slots.map(m => `<option value="${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}">${fmtTime(m)}</option>`).join("");
      if (keep && $$("option", sel).some(o => o.value === keep)) sel.value = keep;
    }
    /* calendar + time slots (Jai's date picker reference, vanilla): days before today, past the booking window
       and closed days are disabled; slots come from the real opening hours via fillTimes() */
    const calGrid = $("[data-cal-grid]");
    if (calGrid) {
      const maxD = addDays(today, 60), monthEl = $("[data-cal-month]"), slotsEl = $("[data-slots]"), slotsDay = $("[data-slots-day]");
      const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      let view = new Date(today.getFullYear(), today.getMonth(), 1), focusIso = null;
      const startOf = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const t0 = startOf(today);
      const isOpen = d => rangesFor(d).ranges.length > 0;
      const selectable = d => d >= t0 && d <= maxD && isOpen(d);
      function drawCal() {
        monthEl.textContent = `${MONTH_LONG[view.getMonth()]} ${view.getFullYear()}`;
        $('[data-cal-step="-1"]').disabled = view <= new Date(t0.getFullYear(), t0.getMonth(), 1);
        $('[data-cal-step="1"]').disabled = view >= new Date(maxD.getFullYear(), maxD.getMonth(), 1);
        const first = (view.getDay() + 6) % 7, days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
        const sel = f.date.value, tIso = isoDate(t0);
        let html = "", tabbable = sel && sel.slice(0, 7) === isoDate(view).slice(0, 7) ? sel : null;
        for (let i = 0; i < first; i++) html += `<span class="cal-pad"></span>`;
        for (let n = 1; n <= days; n++) {
          const d = new Date(view.getFullYear(), view.getMonth(), n), iso = isoDate(d), ok = selectable(d);
          if (!tabbable && ok) tabbable = iso;
          const closed = d >= t0 && d <= maxD && !isOpen(d);
          const label = `${DAY_LONG[DAYS[d.getDay()]]} ${n} ${MONTH_LONG[d.getMonth()]}${closed ? ", closed" : ok ? "" : ", not available"}`;
          html += `<button type="button" class="cal-day${iso === sel ? " is-sel" : ""}${iso === tIso ? " is-today" : ""}${closed ? " is-closed" : ""}" data-iso="${iso}"
            ${ok ? "" : "disabled"} aria-pressed="${iso === sel}" aria-label="${label}" tabindex="${iso === tabbable ? 0 : -1}">${n}</button>`;
        }
        calGrid.innerHTML = html;
        if (focusIso) { const b = $(`.cal-day[data-iso="${focusIso}"]`, calGrid); if (b && !b.disabled) b.focus(); focusIso = null; }
      }
      function drawSlots() {
        slotsEl.innerHTML = "";
        if (!f.date.value) { slotsDay.textContent = "Pick a day"; return; }
        const d = fromIso(f.date.value);
        slotsDay.textContent = `${DAY_LONG[DAYS[d.getDay()]]}, ${d.getDate()} ${MON[d.getMonth()]}`;
        const opts = $$("option", f.time).filter(o => o.value);
        if (!opts.length) { slotsEl.innerHTML = `<p class="slots-none">No times left on this day.</p>`; return; }
        slotsEl.innerHTML = opts.map(o => `<button type="button" class="slot${o.value === f.time.value ? " is-sel" : ""}" data-time="${o.value}" aria-pressed="${o.value === f.time.value}">${esc(o.textContent)}</button>`).join("");
      }
      const clearWhenErr = () => { const c = $("#b-when"); if (!c) return; c.removeAttribute("aria-invalid"); const e = $("#b-when-err"); if (e) e.remove(); };
      const pick = iso => { f.date.value = iso; fillTimes(); save(); drawCal(); drawSlots(); if (f.time.value || !$$("option", f.time).some(o => o.value)) clearWhenErr(); };
      calGrid.addEventListener("click", e => { const b = e.target.closest(".cal-day"); if (b && !b.disabled) { focusIso = b.dataset.iso; pick(b.dataset.iso); } });
      calGrid.addEventListener("keydown", e => {
        const b = e.target.closest(".cal-day"); if (!b) return;
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]; if (!step) return;
        e.preventDefault();
        let d = addDays(fromIso(b.dataset.iso), step), tries = 0;
        while (!selectable(d) && tries++ < 14 && d >= t0 && d <= maxD) d = addDays(d, step > 0 ? 1 : -1);
        if (!selectable(d)) return;
        if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1);
        focusIso = isoDate(d); drawCal();
      });
      $$("[data-cal-step]").forEach(btn => btn.addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() + +btn.dataset.calStep, 1); drawCal(); }));
      slotsEl.addEventListener("click", e => { const b = e.target.closest(".slot"); if (!b) return; f.time.value = b.dataset.time; save(); drawSlots(); clearWhenErr(); const again = $(`.slot[data-time="${b.dataset.time}"]`, slotsEl); if (again) again.focus(); });
      f.date.addEventListener("change", () => { drawCal(); drawSlots(); });
      // draw after the saved draft (if any) has been put back into the form
      setTimeout(() => { if (f.date.value) { const d = fromIso(f.date.value); view = new Date(d.getFullYear(), d.getMonth(), 1); } drawCal(); drawSlots(); });
      // the "Try <next open day>" button in the closed message goes through the calendar too
      closedMsg.addEventListener("click", e => { const b = e.target.closest("[data-next-day]"); if (b) { const d = fromIso(b.dataset.nextDay); view = new Date(d.getFullYear(), d.getMonth(), 1); setTimeout(() => { drawCal(); drawSlots(); }); } });
    }
    closedMsg.addEventListener("click", e => { const b = e.target.closest("[data-next-day]"); if (b) { f.date.value = b.dataset.nextDay; fillTimes(); save(); f.time.focus(); } });

    // prefill: from an event link (?date=&time=), else from this session
    const q = new URLSearchParams(location.search), saved = session.get("rm-book") || {};
    ["date", "guests", "seating", "name", "age", "occasion", "notes"].forEach(k => { if (saved[k] && f[k]) f[k].value = saved[k]; });
    if (q.get("date") && q.get("date") >= todayIso) f.date.value = q.get("date");
    fillTimes(q.get("time") || saved.time);
    const save = () => session.set("rm-book", Object.fromEntries(new FormData(f)));
    f.addEventListener("input", save);
    f.date.addEventListener("change", () => { fillTimes(); save(); });
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), pints = $("#b-guests-pints");
    const bigCheck = () => {
      const n = clamp(parseInt(f.guests.value, 10) || 1, 1, 30);
      big.hidden = n < 10;
      if (pints) pints.innerHTML = "🍺".repeat(Math.min(n, 12)) + (n > 12 ? ` <b>+${n - 12}</b>` : "");
    };
    $$("[data-guests]", f).forEach(b => b.addEventListener("click", () => {
      f.guests.value = clamp((parseInt(f.guests.value, 10) || 1) + +b.dataset.guests, 1, 30); bigCheck(); save();
    }));
    f.guests.addEventListener("input", bigCheck); bigCheck();

    const BK = Object.assign({ mode: "whatsapp", endpoint: "" }, D.booking || {});
    const mode = BK.mode === "api" && BK.endpoint ? "api" : BK.mode === "demo" ? "demo" : BK.mode === "netlify" ? "netlify" : "whatsapp";
    const usePhone = mode !== "whatsapp";
    const phoneField = $("[data-phone-field]"); if (phoneField) { phoneField.hidden = !usePhone; f.phone.required = usePhone; }
    $$("[data-step-wa]").forEach(x => x.hidden = usePhone); $$("[data-step-api]").forEach(x => x.hidden = !usePhone);
    // the page copy follows the delivery mode (it no longer mentions WhatsApp unless bookings really go there)
    if (mode === "whatsapp") {
      const set = (q, t) => { const el = $(q); if (el) el.textContent = t; };
      set("[data-bk-lead]", "Fill in your ticket, tear off the stub, and it lands with us on WhatsApp. We confirm your table there.");
      set("[data-bk-hint]", "Next you'll get a ticket. Tear off the stub and WhatsApp opens with everything filled in.");
      const sb = $("[data-bk-submit]"); if (sb) { const faces = $$(".rb-face", sb); faces.length ? faces.forEach(f => f.textContent = "Send request on WhatsApp") : (sb.textContent = "Send request on WhatsApp"); }
    }
    const done = $("[data-book-done]");
    let message = "", ticket = null, ticketNo = "", rows = [], booking = null, sendPromise = null;
    const waLink = () => `https://wa.me/${P.whatsapp}?text=${encodeURIComponent(message)}`;
    f.addEventListener("submit", e => {
      e.preventDefault();
      const errs = [], age = parseInt(f.age.value, 10), guests = parseInt(f.guests.value, 10);
      if (!f.name.value.trim()) errs.push([f.name, "Tell us your name."]);
      if (!f.age.value) errs.push([f.age, "Tell us your age."]);
      else if (!(age >= 21 && age <= 120)) errs.push([f.age, "Sorry, you need to be 21 or over to book. We only pour beer to 21+."]);
      if (!(guests >= 1 && guests <= 30)) errs.push([f.guests, "Choose between 1 and 30 people."]);
      if (usePhone && !validPhone(f.phone.value)) errs.push([f.phone, "Enter a 10-digit mobile number, like 98765 43210."]);
      const whenEl = $("#b-when") || f.date; // errors show under the calendar, not on the hidden native fields
      if (!f.date.value) errs.push([whenEl, "Choose a day in the calendar."]);
      else if (!f.time.value) errs.push([whenEl, closedMsg.hidden ? "Choose a time." : "Pick a day we're open."]);
      if (!showErrors(f, errs)) return;
      const d = fromIso(f.date.value), time = fmtTime(toMin(f.time.value));
      const when = `${DAY_LONG[DAYS[d.getDay()]]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
      ticketNo = "RM-" + String(Math.floor(1000 + Math.random() * 9000)); waBlocked = false;
      rows = [["Request no.", ticketNo], ["Name", f.name.value.trim()], ["Age", String(age)], ["Table for", `${guests} ${guests === 1 ? "person" : "people"}`],
        ["Date", when], ["Time", time], ["Seating", f.seating.value]];
      if (f.occasion.value && f.occasion.value !== "Just beers") rows.push(["Occasion", f.occasion.value]);
      if (f.notes.value.trim()) rows.push(["Notes", f.notes.value.trim()]);
      if (usePhone) rows.splice(2, 0, ["Mobile", cleanPhone(f.phone.value)]);
      booking = { requestNo: ticketNo, name: f.name.value.trim(), age, phone: usePhone ? cleanPhone(f.phone.value) : null, guests, date: f.date.value, time: f.time.value,
        seating: f.seating.value, occasion: f.occasion.value || null, notes: f.notes.value.trim() || null, createdAt: new Date().toISOString(), source: "website" };
      message = "Hi Rolling Mills! Here's my table ticket 🎟️\n" + rows.map(r => `${r[0]}: ${r[1]}`).join("\n");
      track("Booking ticket made");
      f.hidden = true; done.hidden = false;
      ["[data-sent]", "[data-booked]", "[data-booking-fail]"].forEach(q => { const x = $(q); if (x) x.hidden = true; });
      $("#bk-ticket-h").textContent = "Almost booked!";
      $("[data-ticket-sub]").textContent = mode === "whatsapp" ? "Tear off the stub to send your request to us on WhatsApp." : "Tear off the stub to book your table.";
      $("[data-tear]").hidden = false; $("[data-book-again]").hidden = false;
      buildTicket(guests, d, time);
      done.focus();
      done.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    });

    function buildTicket(guests, d, time) {
      const box = $("[data-ticket]"); box.innerHTML = "";
      const narrow = box.clientWidth < 520;
      const dayShort = `${DAYS[d.getDay()].toUpperCase()} ${d.getDate()} ${MON[d.getMonth()].toUpperCase()}`;
      const body = `<div class="tk-body">
          <p class="tk-kick">Rolling Mills Taproom</p>
          <p class="tk-title">Almost booked!</p>
          <dl class="tk-rows">
            <div><dt>Name</dt><dd>${esc(f.name.value.trim())}</dd></div>
            <div><dt>Table for</dt><dd>${guests}</dd></div>
            <div><dt>Date</dt><dd>${esc(dayShort)}</dd></div>
            <div><dt>Time</dt><dd>${esc(time)}</dd></div>
          </dl>
          <p class="tk-small">${mode === "whatsapp" ? "Confirmed when we reply on WhatsApp" : "21+ only, bring ID"} · Shop 20, New Link Road, Andheri West</p>
        </div>`;
      const stub = `<div class="tk-stub">
          <p class="tk-admit">Admit</p><p class="tk-n">${guests}</p>
          <p class="tk-when">${esc(dayShort)}<br>${esc(time)}</p>
          <p class="tk-no">${ticketNo}</p>
          <p class="tk-pull" aria-hidden="true">${narrow ? "Pull down to tear ↓" : "Pull to tear →"}</p>
        </div>`;
      ticket = window.TearTicket ? window.TearTicket(box, Object.assign(
        narrow ? { orientation: "vertical", width: 320, height: 560, stubSize: 190, holes: 14 } : { orientation: "horizontal", width: 640, height: 300, stubSize: 190, holes: 14 },
        { radius: 18, holeSize: 7, notch: 4, rotate: -3, tiltMax: 8, parallax: 8, background: "#141312", color: "#f1ede4", stubBackground: "#ffd400",
          borderColor: "rgba(255,212,0,.45)", image: "assets/gallery/g08.webp", imageAlt: "", scrim: true, imageRadius: 10, body, stub,
          ariaLabel: `Tear off the stub to send request ${ticketNo} on WhatsApp`,
          // open WhatsApp just after the stub has fallen, so the tear is actually seen (opening it at once hides this tab).
          // Browsers allow a pop-up a moment after a tap; if one blocks it, the "Open WhatsApp" button below takes over.
          onRelease: () => {
            track("Booking request");
            if (mode !== "whatsapp") { sendPromise = sendBooking(); return; }
            setTimeout(() => {
              let w = null; try { w = window.open(waLink(), "_blank"); } catch (err) { w = null; }
              if (w) { try { w.opener = null; } catch (err) { /* ignore */ } } else waBlocked = true;
              showSent();
            }, 750);
          },
          onTear: () => { if (mode === "whatsapp") showSent(); else showBooked(); } })) : null;
      if (!ticket) { const a = document.createElement("a"); a.className = "btn btn-solid"; a.href = waLink(); a.target = "_blank"; a.rel = "noopener"; a.textContent = "Send on WhatsApp"; box.appendChild(a); }
    }
    // backend delivery: POST the booking as JSON. Only a successful reply counts as booked; anything else
    // shows the WhatsApp / call fallback, so a guest is never told "booked" when nothing was saved.
    async function sendBooking() {
      if (mode === "demo") { await new Promise(r => setTimeout(r, 600)); return { ok: true, status: "confirmed", smsSent: !!booking.phone, demo: true }; }
      // Netlify Forms only exist on the deployed site; on a local preview server show the flow without sending
      if (mode === "netlify" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
        await new Promise(r => setTimeout(r, 600)); return { ok: true, status: "pending", smsSent: false, demo: true, local: true };
      }
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
      if (mode === "netlify") {
        // Netlify Forms: urlencoded POST to the site root. Staff confirm by phone, so it's "pending", not "booked".
        try {
          const body = new URLSearchParams({ "form-name": "table-booking", "bot-field": "" });
          Object.entries(booking).forEach(([k, v]) => { if (k !== "source") body.append(k, v == null ? "" : String(v)); });
          const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(), signal: ctl.signal });
          return r.ok ? { ok: true, status: "pending", smsSent: false } : { ok: false };
        } catch (err) { return { ok: false }; } finally { clearTimeout(timer); }
      }
      try {
        const r = await fetch(BK.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(booking), signal: ctl.signal });
        const j = await r.json().catch(() => ({}));
        return r.ok && j.ok !== false ? Object.assign({ ok: true, status: "pending" }, j) : { ok: false };
      } catch (err) { return { ok: false }; } finally { clearTimeout(timer); }
    }
    async function showBooked() {
      $("[data-tear]").hidden = true;
      const sub = $("[data-ticket-sub]"); sub.textContent = "Saving your booking…";
      const res = await (sendPromise || sendBooking());
      if (!res.ok) {
        $("#bk-ticket-h").textContent = "Not booked yet";
        sub.textContent = "Something went wrong on our side.";
        $("[data-wa-fallback]").href = waLink(); $("[data-booking-fail]").hidden = false; track("Booking failed"); return;
      }
      const confirmed = res.status === "confirmed";
      $("#bk-ticket-h").textContent = confirmed ? "Table booked!" : "Request received!";
      const masked = booking.phone ? booking.phone.replace(/^(\+?91)?(\d{2})\d{5}(\d{3})$/, "+91 $2xxxxx$3") : "";
      sub.textContent = confirmed
        ? (res.smsSent && masked ? `See you soon, ${booking.name}! A confirmation is on its way to ${masked}.` : `See you soon, ${booking.name}!`)
        : `Thanks, ${booking.name}. We'll confirm your table${masked ? " on " + masked : ""} shortly.`;
      $("[data-booked-rows]").innerHTML = rows.filter(r => !["Age"].includes(r[0])).map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join("") +
        (res.ref ? `<div><dt>Booking ref</dt><dd>${esc(res.ref)}</dd></div>` : "");
      const demoNote = $("[data-booked-demo]"); demoNote.hidden = !res.demo;
      demoNote.textContent = res.local ? "Local preview: not sent. On the live Netlify site this goes straight to the taproom." : "Demo mode: this booking was not sent anywhere.";
      const tkTitle = $(".tk-title"); if (tkTitle) tkTitle.textContent = confirmed ? "Booked!" : "Received!";
      $("[data-book-again]").hidden = true; // a saved booking is changed by calling us, not by editing the form
      $("[data-booked]").hidden = false;
      track(confirmed ? "Table booked" : "Booking pending");
    }
    // "Add to calendar": a small .ics file made in the browser
    const icsBtn = $("[data-ics]");
    if (icsBtn) icsBtn.addEventListener("click", () => {
      if (!booking) return;
      const [y, mo, da] = booking.date.split("-"), [hh, mm] = booking.time.split(":");
      const start = `${y}${mo}${da}T${hh}${mm}00`, endH = String((+hh + 2) % 24).padStart(2, "0");
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rolling Mills Taproom//Booking//EN", "BEGIN:VEVENT",
        `UID:${booking.requestNo}@rollingmills`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
        `DTSTART;TZID=Asia/Kolkata:${start}`, `DTEND;TZID=Asia/Kolkata:${y}${mo}${da}T${endH}${mm}00`,
        `SUMMARY:Table for ${booking.guests} at Rolling Mills Taproom`, "LOCATION:Shop 20\\, Meera Co-op Hsg\\, New Link Road\\, Oshiwara\\, Andheri West\\, Mumbai 400053",
        `DESCRIPTION:Booking ${booking.requestNo}. 21+ only\\, bring ID.`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = `rolling-mills-${booking.requestNo}.ics`; a.click();
    });

    let waBlocked = false;
    function showSent() {
      $("[data-tear]").hidden = true;
      const wa = $("[data-wa-again]"); wa.href = waLink();
      $("[data-ticket-sub]").textContent = waBlocked ? "Torn! Tap \"Open WhatsApp\" below to send it to us." : "Torn! WhatsApp is opening with your booking.";
      const label = waBlocked ? "Open WhatsApp" : "WhatsApp didn't open?", faces = $$(".rb-face", wa);
      if (faces.length) faces.forEach(x => { x.textContent = label; }); else wa.textContent = label; // keep the plate faces intact
      wa.classList.toggle("bk-wa-main", waBlocked);
      $("[data-sent]").hidden = false;
      $("[data-share-ticket]").hidden = !(navigator.canShare && navigator.share);
    }
    $("[data-tear]").addEventListener("click", () => { if (ticket) ticket.tear(); });

    // the torn stub as a picture, for the share sheet on phones (WhatsApp links can only carry text)
    function stubImage() {
      const c = document.createElement("canvas"); c.width = 600; c.height = 900; const g = c.getContext("2d");
      g.fillStyle = "#ffd400"; g.beginPath(); g.roundRect(20, 20, 560, 860, 40); g.fill();
      g.fillStyle = "#141414"; g.textAlign = "center";
      const row = (r, y, font) => { g.font = font; g.fillText(r, 300, y); };
      row("ROLLING MILLS TAPROOM", 110, '600 30px "JetBrains Mono", monospace');
      row("ADMIT", 230, '400 70px Anton, Impact, sans-serif');
      row(rows.find(r => r[0] === "Table for")[1].split(" ")[0], 430, '400 220px Anton, Impact, sans-serif');
      row(rows.find(r => r[0] === "Date")[1], 540, '600 34px Inter, sans-serif');
      row(rows.find(r => r[0] === "Time")[1], 590, '600 34px Inter, sans-serif');
      row(rows.find(r => r[0] === "Name")[1], 670, '400 46px "Sedgwick Ave Display", cursive');
      row(ticketNo, 790, '600 36px "JetBrains Mono", monospace');
      return new Promise(res => c.toBlob(res, "image/png"));
    }
    $("[data-share-ticket]").addEventListener("click", async () => {
      try {
        const file = new File([await stubImage()], `rolling-mills-${ticketNo}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: message });
      } catch (err) { /* share cancelled */ }
    });
    $("[data-copy-booking]").addEventListener("click", async ev => {
      try { await navigator.clipboard.writeText(message); ev.target.textContent = "Copied"; } catch (err) { ev.target.textContent = "Couldn't copy"; }
    });
    $("[data-book-again]").addEventListener("click", () => { done.hidden = true; f.hidden = false; f.name.focus(); });
  }

  function initParty() {
    const f = $("#party-form"); if (!f) return;
    f.date.min = isoDate(istNow());
    f.addEventListener("submit", e => {
      e.preventDefault();
      const errs = [];
      if (!f.date.value) errs.push([f.date, "Choose a date."]);
      const g = parseInt(f.guests.value, 10);
      if (!g || g < 10) errs.push([f.guests, "Private parties start at 10 guests. For fewer, book a table instead."]);
      if (!f.name.value.trim()) errs.push([f.name, "Tell us your name."]);
      if (!showErrors(f, errs)) return;
      const d = fromIso(f.date.value);
      const rows = [["Date", `${fmtDate(d)} ${d.getFullYear()}`], ["Guests", g], ["Occasion", f.occasion.value], ["Budget per head", f.budget.value.trim() || "Not sure yet"], ["Name", f.name.value.trim()]];
      if (f.notes && f.notes.value.trim()) rows.push(["Notes", f.notes.value.trim()]);
      openWhatsApp("Hi Rolling Mills! I'd like to plan a private party.\n" + rows.map(r => `${r[0]}: ${r[1]}`).join("\n"));
      track("Party enquiry");
      const done = $("[data-party-done]"); done.hidden = false; done.focus();
    });
  }

  /* ---------- story ---------- */
  function renderTimeline() {
    const tl = $("[data-timeline]"); if (!tl) return;
    const story = tl.classList.contains("st-tl");
    tl.innerHTML = D.timeline.map((t, i) => story
      ? `<li class="st-reveal" style="--i:${i}"><span class="st-dot" aria-hidden="true"></span><b class="st-when">${esc(t.when)}</b><p class="st-what">${esc(t.what)}</p></li>`
      : `<li><b>${esc(t.when)}</b>${esc(t.what)}</li>`).join("");
    if (!story) return;
    // story page: one can per style (lager, wheat, IPA, stout, cider), each links to its beer on the On tap page
    const cans = $("[data-story-cans]");
    if (cans) {
      const seen = new Set(), pick = D.beers.filter(b => b.status !== "sold-out" && !/pack/i.test(b.name) && !seen.has(b.group) && seen.add(b.group));
      cans.innerHTML = pick.map((b, i) => `<a class="st-can" href="on-tap.html#${b.slug}" style="--i:${i}">
        <img src="assets/cans/${b.slug}.webp" alt="" width="223" height="380" loading="lazy">
        <span class="st-can-name">${esc(b.name)}</span><span class="st-can-style">${esc(b.group)}</span></a>`).join("");
    }
    // reveal chapters as they scroll in
    const els = $$(".st-reveal");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -12% 0px" });
    els.forEach(e => io.observe(e));
  }

  /* =====================================================================
     SHARED UI
     ===================================================================== */
  // mobile nav
  const mb = $(".menu-btn"), nl = $("#nav-list");
  if (mb) {
    mb.addEventListener("click", () => { const o = nl.classList.toggle("open"); mb.setAttribute("aria-expanded", o); mb.setAttribute("aria-label", o ? "Close menu" : "Menu"); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && nl.classList.contains("open")) { nl.classList.remove("open"); mb.setAttribute("aria-expanded", false); mb.setAttribute("aria-label", "Menu"); mb.focus(); } });
  }

  /* rolling buttons (Jai's reference recording): the label sits on a drum with riveted corners; on hover or
     keyboard focus the drum rolls up and a second face in another shade comes up from below.
     Applied to every .btn and the "Read our story" link, including buttons added later (drawer, menus). */
  const rollSel = ".btn:not([data-bs-details]):not(.hq-btn-line), .about-links a"; // "Details" (beer stage) and "Opening hours" (taproom) stay plain (Jai)
  function rollify(el) {
    if (el.classList.contains("rb") || !el.textContent.trim()) return;
    const front = el.innerHTML;
    const tmp = document.createElement("span"); tmp.innerHTML = front; tmp.querySelectorAll(".sr").forEach(n => n.remove());
    el.classList.add("rb");
    const copy = cls => `<span class="rb-face ${cls}" aria-hidden="true">${tmp.innerHTML}</span>`;
    // two faces (two shades): one squashes up out of the top while the other unrolls from the bottom, in a loop
    el.innerHTML = `<span class="rb-cube"><span class="rb-face rb-front">${front}</span>${copy("rb-under")}</span>`;
    el.style.setProperty("--rb-delay", `${-(Math.random() * 1.8).toFixed(2)}s`); // each button starts at a different point
  }
  $$(rollSel).forEach(rollify);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.matches(rollSel)) rollify(n);
    n.querySelectorAll && n.querySelectorAll(rollSel).forEach(rollify);
  }))).observe(document.body, { childList: true, subtree: true });

  // floating pill navigation (Jai): shrinks to a round menu button while scrolling down past 150px,
  // opens again after scrolling back up 80px, or when the round button is tapped
  const pill = $(".pill-nav");
  if (pill) {
    const hd = $(".hd", pill), inner = $(".hd-in", pill), exp = $(".hd-expand", pill);
    let open = true, last = scrollY, collapsedAt = 0;
    const fit = () => { if (open) hd.style.width = inner.scrollWidth + "px"; };
    const setOpen = on => {
      if (on === open) return; open = on;
      pill.classList.toggle("is-collapsed", !on);
      inner.inert = !on; exp.tabIndex = on ? -1 : 0;
      hd.style.width = on ? inner.scrollWidth + "px" : "";
      if (!on && nl && nl.classList.contains("open")) mb.click();
    };
    const ALWAYS_OPEN = true; // Jai: keep the nav open; the collapse code stays in case it comes back
    addEventListener("scroll", () => {
      if (ALWAYS_OPEN) return;
      const y = scrollY;
      if (nl && nl.classList.contains("open")) { last = y; return; } // keep it open while the mobile menu is showing
      if (Math.abs(y - last) < 4) return; // ignore tiny jitters (mobile address bar)
      if (open && y > last && y > 150) { setOpen(false); collapsedAt = y; }
      else if (!open && y < last && (collapsedAt - y > 80 || y < 40)) setOpen(true);
      last = y;
    }, { passive: true });
    exp.addEventListener("click", () => { setOpen(true); const f = $("a, button", inner); if (f && exp === document.activeElement) f.focus(); });
    addEventListener("resize", fit); if (document.fonts) document.fonts.ready.then(fit); fit();
  }

  // age check: remembered for 30 days, and the visitor stays on the page they opened
  // the page is "ready" once the loader has played and the age check is passed;
  // the hero video waits for this so the painting starts when people can see it
  function ready() { window.RM_READY = true; document.dispatchEvent(new Event("rm:ready")); }

  // black loader with a graffiti R spraying itself on (home, first visit per session, after Soul Street)
  function runLoader() {
    const ld = $("#loader");
    return new Promise(res => {
      if (!ld) return res();
      const seen = false; // Jai: the R loader plays on every page load / reload of the home page
      if (reduce || seen) { ld.remove(); return res(); }
      try { sessionStorage.setItem("rm-loader", "1"); } catch (e) {}
      setOverlay(true, ld);
      let closed = false;
      const close = () => { if (closed) return; closed = true; ld.classList.add("out"); setTimeout(() => { ld.remove(); setOverlay(false); res(); }, 700); };
      const vid = $(".ld-video", ld);
      if (D.loaderVideo && vid) {
        // Flow video of the R being painted; the drawn chrome R is the fallback
        ld.classList.add("has-video"); vid.hidden = false;
        vid.src = "assets/video/loader-r.mp4";
        vid.addEventListener("ended", close);
        vid.addEventListener("error", () => { ld.classList.remove("has-video"); vid.hidden = true; ld.classList.add("play"); setTimeout(close, 2800); });
        vid.play().catch(() => {});
        setTimeout(close, 6000);
      } else {
        ld.classList.add("play");
        setTimeout(close, 2800);
      }
    });
  }

  function initGate() {
    const gate = $("#gate"), key = "rm-age-ok", ok = Number(local.get(key));
    if (ok && Date.now() - ok < 30 * 864e5) return ready();
    gate.hidden = false; setOverlay(true, gate);
    $('[data-gate="yes"]', gate).focus();
    gate.addEventListener("click", e => {
      const b = e.target.closest("[data-gate]"); if (!b) return;
      if (b.dataset.gate === "yes") { local.set(key, String(Date.now())); gate.hidden = true; setOverlay(false); $("#main").focus({ preventScroll: true }); ready(); }
      else { $(".gate-actions", gate).hidden = true; $(".gate-no", gate).hidden = false; }
    });
    gate.addEventListener("keydown", e => { if (e.key === "Tab") { const f = $$("button:not([hidden])", gate).filter(x => x.offsetParent); if (f.length) { e.preventDefault(); const i = f.indexOf(document.activeElement); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); } } });
  }
  $("#main").tabIndex = -1;

  // gentle reveal on scroll
  function initReveal() {
    if (reduce || !("IntersectionObserver" in window)) return;
    const els = $$(".sec-head, .beer-grid, .event-list, .gallery, .split > *, .timeline");
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("reveal"); io.observe(el); } });
  }

  renderHours(); renderUpdated(); renderBeers(); renderMenu(); renderEvents(); renderTimeline();
  initBooking(); initParty(); runLoader().then(initGate); initReveal();
  setInterval(renderStatusOnly, 60000);
  function renderStatusOnly() { const s = openStatus(); $$("[data-status]").forEach(el => { el.textContent = s.text; el.classList.toggle("is-open", s.open); el.classList.toggle("is-closed", !s.open); }); }
})();
