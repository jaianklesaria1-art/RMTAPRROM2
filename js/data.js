/* =====================================================================
   Rolling Mills Taproom: all site content lives here.
   Staff edit this file (v1). In v2 it moves to Airtable or a CMS.
   Anything marked sample:true is placeholder content and shows a
   "Sample" badge on the site until the client sends the real thing.
   ===================================================================== */

window.RM_DATA = {

  // ---------- the taproom ----------
  place: {
    name: "Rolling Mills Taproom",
    tagline: "Craft Beer Dispensary",
    address: ["Shop 20, Meera Co-op Hsg", "New Link Road, Oshiwara", "Andheri West, Mumbai 400053"],
    geo: { lat: 19.15123, lng: 72.8317709 },
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=19.15123,72.8317709",
    phone: "+91 74004 07711",
    phoneHref: "tel:+917400407711",
    whatsapp: "917400407711",
    instagram: "https://www.instagram.com/rollingmillsbrewery/",
    orderUrl: "https://www.airmenus.in/rollingmills/order",
    brewery: "146-BCD, Govt. Industrial Estate, Charkop Road, Kandivali West, Mumbai 400067",
    legalAge: 21 // to confirm with the client (PRD A5)
  },

  // ---------- how table bookings are delivered ----------
  // "netlify":  tearing POSTs the booking to Netlify Forms (no backend needed when the site is hosted on Netlify). The taproom gets
  //             each booking by email / Slack / dashboard; the guest sees "Request received" and never leaves the page. (current)
  // "whatsapp": tearing the ticket opens WhatsApp with the booking
  // "api":      tearing POSTs the booking as JSON to `endpoint` (the future backend / database). The guest's mobile is asked for,
  //             and the backend sends the confirmation SMS / WhatsApp. Expected reply: { ok: true, status: "confirmed" | "pending", ref?, smsSent? }
  // "demo":     shows the full "Table booked!" flow for presentations but SENDS NOTHING (a demo banner says so). Never ship this.
  booking: { mode: "netlify", endpoint: "" },

  // where the rolling can ends up: "beer-card" (lands on the What's on Beer card) or "fridge" (dives into the Taproom fridge)
  canRoute: "beer-card",
  // false: no can in the hero; it flies in from the right onto the beer stage (v2)
  canHero: false,

  // ---------- hero video (Google Flow) ----------
  // Set to true once hero-intro-*.mp4 / hero-loop-*.mp4 are in assets/video (see ../flow-video/FLOW-BRIEF.md).
  // Until then the hero shows the still end frame.
  heroVideo: true,   // hero-intro-*: 4 Flow clips joined (1 men walk + shutter chain at 1.25x, 2 crew, 3 van chaos, 4 painter + can throw), 16 s, all original footage
  heroLoop: false,   // set true once hero-loop-*.mp4 exists; until then the video holds on its last frame
  // Set to true once assets/video/loader-r.mp4 (the R being painted, from Flow) is added. Until then the loader draws the chrome R itself.
  loaderVideo: false,

  // ---------- hours (IST, 24h). [] means closed. ----------
  // From AirMenus ordering hours. The taproom's own hours are NOT confirmed yet (PRD open question 1).
  hoursConfirmed: false,
  hours: {
    mon: [["11:30", "22:30"]],
    tue: [["11:30", "22:30"]],
    wed: [["11:30", "22:30"]],
    thu: [["11:30", "22:30"]],
    fri: [],
    sat: [["11:30", "22:30"]],
    sun: [["11:30", "22:30"]]
  },
  // Special days override the weekly hours: { date: "2026-10-20", closed: true, reason: "Private event" }
  // or { date: "...", hours: [["17:00","23:00"]], reason: "Late opening" }
  exceptions: [],

  // ---------- beers (from the client's live AirMenus menu, 2026-10-03) ----------
  // bg / hl: stage background (muted, label hue) and accent colour (button), picked from each label
  tapListUpdated: "2026-10-03",
  beers: [
    { slug: "no-brainer", tagline: "Raise a stein to the malty side of Oktoberfest", bg: "#b97d9b", hl: "#ff6fb8", name: "No Brainer", style: "Oktoberfest Märzen", group: "Lager", abv: 7, sizes: [["1 L", 699]], img: "no-brainer.jpg", status: "on-tap",
      desc: "German fest lager with malty, toffee and toasty notes.", flavour: [], pairs: "masala-peanuts" },
    { slug: "kura-kura", tagline: "Crisp, dry and brewed with Japanese rice", bg: "#917db9", hl: "#b996ff", name: "Kura Kura", style: "Japanese Rice Lager", group: "Lager", abv: 4.5, sizes: [["1 L", 699]], img: "kura-kura.jpg", status: "on-tap",
      desc: "Crisp, dry lager brewed with Japanese rice and Japanese hops.", flavour: [], pairs: "chilli-cheese-toast" },
    { slug: "absurdist", tagline: "A stout that plays by lager rules", bg: "#b9897d", hl: "#ff6a45", name: "Absurdist", style: "Pseudo Stout", group: "Stout", abv: 6, sizes: [["1 L", 699]], img: "absurdist.jpg", status: "on-tap",
      desc: "A stout fermented with old-school lager yeast. Dark chocolate, coffee and burnt caramel.", flavour: [], pairs: "brownie" },
    { slug: "fracture", tagline: "Orange zest and coriander, the Belgian way", bg: "#b9997d", hl: "#ff9d45", name: "Fracture", style: "Belgian Wit", group: "Wheat", abv: 4.5, sizes: [["1 L", 699]], img: "fracture.jpg", status: "on-tap",
      desc: "Belgian wheat beer brewed with Curaçao orange zest and coriander seed. Bright and zesty.", flavour: [], pairs: "paneer-tikka" },
    { slug: "deadbeat", tagline: "Dank, piney, West Coast through and through", bg: "#7daeb9", hl: "#45dcff", name: "Deadbeat", style: "West Coast IPA", group: "IPA", abv: 6.5, sizes: [["1 L", 799]], img: "deadbeat.jpg", status: "on-tap",
      desc: "Dank, tropical and piney. Dry hopped with Citra, Saphir, Mosaic and Apollo.", flavour: [], pairs: "chicken-tikka-sliders" },
    { slug: "banana-republic", tagline: "Banana and clove, the classic German way", bg: "#7db987", hl: "#7fe08f", name: "Banana Republic", style: "Hefeweizen", group: "Wheat", abv: 5.5, sizes: [["1 L", 699]], img: "banana-republic.jpg", status: "on-tap",
      desc: "Classic German wheat beer with notes of banana and clove.", flavour: [], pairs: "beer-batter-fries" },
    { slug: "fruity", tagline: "Mango and peach in every pour", bg: "#b9a07d", hl: "#ffb347", name: "Fruity", style: "Mango Peach Cider", group: "Cider", abv: 6, sizes: [["1 L", 699]], img: "fruity.jpg", status: "on-tap",
      desc: "Juicy cider with notes of mango and peach.", flavour: [], pairs: "" },
    { slug: "grin", tagline: "Lychee and apple, bright and juicy", bg: "#b97da9", hl: "#ff73d9", name: "Grin", style: "Lychee Apple Cider", group: "Cider", abv: 6, sizes: [["1 L", 699]], img: "grin.jpg", status: "on-tap",
      desc: "Fruity cider with notes of lychee and apple.", flavour: [], pairs: "" },
    { slug: "kura-kura-cans", tagline: "The rice lager, six cans deep", bg: "#937db9", hl: "#c4a3ff", name: "Kura Kura 6-pack", style: "Japanese Rice Lager, cans", group: "Lager", abv: 4.5, sizes: [["6 × 330 ml", 1800]], img: "kura-6pack.jpg", status: "cans",
      desc: "The rice lager in cans. Six of them, to take home.", flavour: [], pairs: "" }
  ],

  // ---------- food (SAMPLE until the client sends the real menu; no prices yet) ----------
  food: [
    { slug: "masala-peanuts", name: "Masala peanuts", cat: "Small plates", veg: true, desc: "Roasted, spiced and salty. Built for lagers.", sample: true },
    { slug: "beer-batter-fries", name: "Beer-batter fries", cat: "Small plates", veg: true, desc: "Thick cut, with peri-peri dust.", sample: true },
    { slug: "chilli-cheese-toast", name: "Chilli cheese toast", cat: "Small plates", veg: true, desc: "Bombay classic, extra green chilli.", sample: true },
    { slug: "paneer-tikka", name: "Paneer tikka", cat: "Grills", veg: true, desc: "Charred, smoky, with mint chutney.", sample: true },
    { slug: "chicken-tikka-sliders", name: "Chicken tikka sliders", cat: "Grills", veg: false, desc: "Two sliders with pickled onion.", sample: true },
    { slug: "keema-pav", name: "Keema pav", cat: "Mains", veg: false, desc: "Spiced mince with buttered pav.", sample: true },
    { slug: "brownie", name: "Stout brownie", cat: "Desserts", veg: true, desc: "Fudgy, dark, with a scoop of vanilla.", sample: true }
  ],

  // ---------- non-alcoholic (SAMPLE) ----------
  softDrinks: [
    { slug: "fresh-lime-soda", name: "Fresh lime soda", cat: "Non-alcoholic", veg: true, desc: "Sweet, salted or mixed.", sample: true },
    { slug: "cold-brew", name: "Cold brew coffee", cat: "Non-alcoholic", veg: true, desc: "Served over ice.", sample: true }
  ],

  // ---------- events (SAMPLE). Times are IST. ----------
  events: [
    { slug: "match-screening", title: "Match screening", type: "Screening", start: "2026-09-27T19:00", end: "2026-09-27T22:00", price: 0,
      desc: "Big screen, cold beer, loud room.", img: "long-tables.webp", sample: true },
    { slug: "quiz-night", title: "Pub quiz", type: "Quiz", start: "2026-10-08T20:00", end: "2026-10-08T22:30", price: 0,
      desc: "Teams of up to six. Four rounds, and one of them is all about beer.", img: "unstable-minds.webp", sample: true },
    { slug: "vinyl-night", title: "Vinyl night", type: "Live music", start: "2026-10-17T20:00", end: "2026-10-17T22:30", price: 0,
      desc: "Local selectors spin records all evening.", img: "loud-corner.webp", sample: true },
    { slug: "oktoberfest-pour", title: "Oktoberfest pour", type: "Tap takeover", start: "2026-10-24T18:00", end: "2026-10-24T22:30", price: 0,
      desc: "No Brainer Märzen by the litre, with something salty on the side.", img: "unholy-order.webp", beer: "no-brainer", sample: true },
    { slug: "live-paint-jam", title: "Live paint jam", type: "Art", start: "2026-11-01T17:00", end: "2026-11-01T22:00", price: 0,
      desc: "Artists take over a wall while you drink.", img: "tag-wall.webp", sample: true }
  ],

  // ---------- reviews: REAL guests only, with their permission. Empty = the section stays hidden. ----------
  // { name: "Maya", source: "Google", url: "https://maps.app.goo.gl/...", date: "Oct 2026",
  //   text: "Their words, unedited apart from trimming.", tag: "assets/tags/maya.png" }   // tag = the PNG they sent from "Leave your tag" (optional)
  reviews: [],

  // ---------- story (confirmed facts only) ----------
  timeline: [
    { when: "Nov 2020", what: "Rolling Mills Brewery LLP is set up." },
    { when: "2021", what: "The brewhouse in Kandivali West starts brewing." },
    { when: "Apr 2025", what: "Los Pablos, a Mexican lager collab with Simba, launches in Goa." },
    { when: "Now", what: "The taproom opens on New Link Road, Andheri West." }
  ]
};
