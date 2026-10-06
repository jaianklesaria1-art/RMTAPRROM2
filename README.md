# Rolling Mills Taproom website

A static site built to `../PRD-rolling-mills-taproom.md`, `../05-user-flows.md` and `../06-information-architecture.md`. Visual direction: A (Spray & Steel), with the professional restraint rules from PRD 7.1.

## Run it
```
python build.py            # rebuilds the pages from src/
python -m http.server 8770 # then open http://localhost:8770
```

## Where things live
| What | File |
|---|---|
| Beers, food, events, hours, contact details, timeline | `js/data.js` (the only file staff should need) |
| Page copy | `src/*.html`. Run `python build.py` after editing |
| Header, footer, mobile action bar, age check, SEO tags | `build.py` (shared layout) |
| Behaviour (status, drawer, tabs, events, forms) | `js/app.js` |
| Styles | `css/site.css` |
| Photos | `assets/photos/` (the client's WhatsApp photos, the cleanest shots only), `assets/labels/` (AirMenus label art) |

**Don't edit the generated `*.html` files in the root.** They get overwritten on every build.

## Pages (IA section 2)
Home, On tap, Menu, Events, Event detail (`event.html?e=slug`), Book a table, Private parties, Visit, Our story, Privacy.

**One change from the IA:** event links are `event.html?e=slug`, not `/events/slug`, so the site works without a server. On Netlify we can add a rewrite later, once asset paths are made absolute.

## Placeholder content (shows a yellow "Sample" badge or note on the site)
- Food and non-alcoholic menus, with no prices yet
- All events
- Private party offer, capacity and prices
- Booking rules, house rules, parking and transport
- **Hours.** `hoursConfirmed: false` in data.js. The current hours are AirMenus ordering hours (Friday closed). Set it to `true` once the client confirms.
- Flavour words per beer (empty until the brewer adds them)

## How the main flows work
- **Book a table.** The form checks the date against the opening hours (closed days offer the next open day), then opens WhatsApp with the request filled in. Nothing is stored on a server. Groups of 10 or more are pointed to Private parties.
- **Events.** "This week", "Upcoming" and "Past" are worked out from IST time. Each event has its own page with RSVP on WhatsApp, Add to calendar (.ics), Share, and "Book a table for this night".
- **On tap.** Filters are built from the data. A beer opens in a drawer that you can link to as `on-tap.html#slug`. "Pairs with" links go both ways between beer and food.
- **Age check.** Remembered for 30 days on the device. Visitors stay on the page they opened.
- **Analytics.** Every main button has `data-track`. Add the Plausible or GA4 snippet and the events start reporting.

## Before launch
Real menu, events, hours, booking rules and photos; the domain; the analytics snippet; the privacy page checked by the client's advisor; a professional photo shoot to replace the fit-out photos.

## Home v2 (2026-10-04): video hero, About scroll, beer stage
- **Hero video.** A Google Flow clip of "ROLLING MILLS" being spray-painted. The brief, prompts and start/end frames are in `../flow-video/`. Drop the files in `assets/video/` as `hero-intro-16x9.mp4`, `hero-loop-16x9.mp4`, `hero-intro-9x16.mp4` and `hero-loop-9x16.mp4` (WebM versions optional), then set `heroVideo: true` in `js/data.js`. Until then the hero shows the end frame as a still. The intro plays once, then the loop runs. There's a pause button, and nothing loads with reduced motion or data saver switched on.
- **About scroll scene** (after Soul Street). The section pins in place while four rows of words slide sideways and taped photos swap. With reduced motion, it's a static layout.
- **Beer stage** (after BrewDistrict24). A Three.js can wrapped in each beer's real label art, with name and ABV on the left and description, specs and Order on the right. The background colour comes from each label (`bg` and `hl` in data.js). Arrows, keyboard arrows, and swiping on phones switch beers; drag turns the can, and it also turns slightly as you scroll. A flat label image shows if WebGL isn't available.
- Files: `js/home.js`, `js/three.min.js` (r128), `css/home-v2.css`. These load on the home page only.
