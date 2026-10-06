"""Builds the static pages: wraps every page body in src/ with the shared head, header, footer,
mobile action bar and age check. Run:  python build.py
Edit content in js/data.js and page copy in src/*.html, never the generated *.html files."""
import json, pathlib, re, time

BUILD_VER = time.strftime("%Y%m%d%H%M%S")  # cache-buster: browsers refetch css/js after every build

ROOT = pathlib.Path(__file__).parent
SITE = "Rolling Mills Taproom, Andheri West"
ORDER = "https://www.airmenus.in/rollingmills/order"

# id, file, title, description, nav key (for aria-current)
PAGES = [
    ("home", "index.html", f"Rolling Mills Taproom · Craft beer brewed in Kandivali, poured in Andheri West",
     "Rolling Mills' own taproom on New Link Road, Andheri West. Fresh craft beer from our Kandivali brewhouse, food, events and table bookings.", None),
    ("taps", "on-tap.html", f"On tap · {SITE}", "What's pouring now at the Rolling Mills Taproom: lagers, IPAs, wheat beers, stouts and ciders brewed in Kandivali.", "taps"),
    ("menu", "menu.html", f"Menu · {SITE}", "Beer, food and non-alcoholic drinks at the Rolling Mills Taproom, Andheri West. Veg and non-veg marked.", "menu"),
    ("book", "book.html", f"Book a table · {SITE}", "Book a table at the Rolling Mills Taproom. Send a request and we'll confirm on WhatsApp.", "book"),
    ("parties", "parties.html", f"Private parties · {SITE}", "Birthdays, office nights and launches at the Rolling Mills Taproom, Andheri West.", "parties"),
    ("story", "story.html", f"Our story · {SITE}", "Brewed in Kandivali, poured in Andheri. The story of Rolling Mills Brewery and its taproom.", "story"),
    ("404", "404.html", f"Page not found · {SITE}", "This page isn't here. Head back to the Rolling Mills Taproom home page.", None),
    ("privacy", "privacy.html", f"Privacy · {SITE}", "How the Rolling Mills Taproom website handles your information.", None),
]

NAV = [("taps", "on-tap.html", "On tap"), ("menu", "menu.html", "Menu"), ("story", "story.html", "Our story")]

JSONLD = {
    "@context": "https://schema.org", "@type": ["BarOrPub", "Brewery"], "name": "Rolling Mills Taproom",
    "description": "Rolling Mills Brewery's own taproom in Andheri West, Mumbai.",
    "telephone": "+917400407711", "servesCuisine": "Bar food", "acceptsReservations": "True",
    "address": {"@type": "PostalAddress", "streetAddress": "Shop 20, Meera Co-op Hsg, New Link Road, Oshiwara",
                "addressLocality": "Andheri West, Mumbai", "postalCode": "400053", "addressRegion": "Maharashtra", "addressCountry": "IN"},
    "geo": {"@type": "GeoCoordinates", "latitude": 19.15123, "longitude": 72.8317709},
    "sameAs": ["https://www.instagram.com/rollingmillsbrewery/"],
}

ICON = {  # simple line icons, 24px, currentColor
    "book": '<path d="M4 5h16v15H4zM4 9h16M9 3v4M15 3v4"/>',
    "order": '<path d="M7 4h10l-1 16H8zM7 8h10"/>',
    "call": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    "map": '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    "chat": '<path d="M4 20l1.4-4A8 8 0 1 1 8 18.6L4 20z"/><path d="M9 10h.01M12 10h.01M15 10h.01"/>',
    "insta": '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8"/>',
}
def icon(n): return f'<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">{ICON[n]}</svg>'


LOADER = """
<div class="loader" id="loader" aria-hidden="true">
  <svg class="ld-r" viewBox="0 0 679 850" role="presentation">
    <defs>
      <linearGradient id="ldChrome" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#e4e4e4"/><stop offset=".47" stop-color="#9a9a9a"/>
        <stop offset=".5" stop-color="#2e2e2e"/><stop offset=".56" stop-color="#5c5c5c"/><stop offset=".75" stop-color="#f4f4f4"/><stop offset="1" stop-color="#9c9c9c"/>
      </linearGradient>
      <linearGradient id="ldShine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <clipPath id="ldClip"><path transform="translate(11 717) scale(1 -1)" d="M560 -19C533 32 568 79 588 94C588 94 526 71 537 2C537 2 523 10 523 51V197C536 202 543 208 543 208C506 208 491 214 461 254C444 281 413 294 389 300C413 306 444 319 461 345C491 385 506 391 543 391C543 391 535 398 521 403V583C524 668 564 691 613 697C613 697 551 701 533 674C533 674 498 685 484 656C480 648 478 635 476 619C449 652 406 679 341 691C342 693 342 695 342 697C342 697 341 694 340 691C317 695 292 697 264 697C81 697 12 573 9 530C8 507 11 485 18 464C53 367 123 353 190 377C202 381 211 386 218 392C212 372 202 353 187 338L176 327L187 316C204 300 215 278 220 255C196 287 162 300 160 301C160 301 202 262 200 232C198 202 160 163 120 165C80 166 116 213 116 213C83 210 67 117 135 117C153 118 167 121 180 127C177 122 181 114 185 110C193 103 205 106 205 92V-55C197 -60 186 -66 174 -68C138 -66 145 -44 145 -44C145 -44 122 -63 132 -90C141 -116 201 -136 264 -59C326 17 394 10 394 10C352 16 314 9 283 -4V602C287 604 290 605 293 607V132C293 124 295 94 314 94C334 94 329 109 322 116C314 122 302 119 302 134V295L364 294C378 293 390 288 399 278C422 252 424 217 461 198V51C461 51 463 -19 482 -47C501 -74 575 -114 648 -51C648 -51 589 -63 560 -19ZM223 503C211 513 194 520 170 512C129 497 135 466 135 466C142 485 194 500 211 455C224 396 190 389 190 389C190 389 120 364 78 422C109 416 130 446 130 446C77 426 59 461 52 485C50 497 49 510 49 523C52 607 118 682 264 682C290 682 313 680 333 675C324 659 307 640 278 632C227 619 164 615 145 570C126 525 167 518 167 518C167 518 156 539 182 561C192 570 207 576 223 582ZM64 557C58 539 56 521 60 502C72 444 125 453 125 453C125 453 50 497 103 599C146 675 245 675 245 675C169 682 89 633 64 557ZM302 612C323 625 333 642 339 674C418 653 451 600 461 557C451 532 435 512 405 511C405 511 440 493 461 502V401C424 383 422 347 399 322C390 312 378 306 364 306L302 305ZM168 393C221 403 203 452 197 460C190 468 177 478 154 466C154 466 170 472 180 457C187 444 195 410 161 399C124 388 87 417 87 417C87 417 115 383 168 393ZM216 -46C216 -46 215 -47 214 -48V94C214 101 212 131 193 131C191 131 190 131 188 131C203 139 215 150 223 162V-40C220 -43 219 -44 216 -46Z"/></clipPath>
      <filter id="ldGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path class="ld-fill" transform="translate(11 717) scale(1 -1)" d="M560 -19C533 32 568 79 588 94C588 94 526 71 537 2C537 2 523 10 523 51V197C536 202 543 208 543 208C506 208 491 214 461 254C444 281 413 294 389 300C413 306 444 319 461 345C491 385 506 391 543 391C543 391 535 398 521 403V583C524 668 564 691 613 697C613 697 551 701 533 674C533 674 498 685 484 656C480 648 478 635 476 619C449 652 406 679 341 691C342 693 342 695 342 697C342 697 341 694 340 691C317 695 292 697 264 697C81 697 12 573 9 530C8 507 11 485 18 464C53 367 123 353 190 377C202 381 211 386 218 392C212 372 202 353 187 338L176 327L187 316C204 300 215 278 220 255C196 287 162 300 160 301C160 301 202 262 200 232C198 202 160 163 120 165C80 166 116 213 116 213C83 210 67 117 135 117C153 118 167 121 180 127C177 122 181 114 185 110C193 103 205 106 205 92V-55C197 -60 186 -66 174 -68C138 -66 145 -44 145 -44C145 -44 122 -63 132 -90C141 -116 201 -136 264 -59C326 17 394 10 394 10C352 16 314 9 283 -4V602C287 604 290 605 293 607V132C293 124 295 94 314 94C334 94 329 109 322 116C314 122 302 119 302 134V295L364 294C378 293 390 288 399 278C422 252 424 217 461 198V51C461 51 463 -19 482 -47C501 -74 575 -114 648 -51C648 -51 589 -63 560 -19ZM223 503C211 513 194 520 170 512C129 497 135 466 135 466C142 485 194 500 211 455C224 396 190 389 190 389C190 389 120 364 78 422C109 416 130 446 130 446C77 426 59 461 52 485C50 497 49 510 49 523C52 607 118 682 264 682C290 682 313 680 333 675C324 659 307 640 278 632C227 619 164 615 145 570C126 525 167 518 167 518C167 518 156 539 182 561C192 570 207 576 223 582ZM64 557C58 539 56 521 60 502C72 444 125 453 125 453C125 453 50 497 103 599C146 675 245 675 245 675C169 682 89 633 64 557ZM302 612C323 625 333 642 339 674C418 653 451 600 461 557C451 532 435 512 405 511C405 511 440 493 461 502V401C424 383 422 347 399 322C390 312 378 306 364 306L302 305ZM168 393C221 403 203 452 197 460C190 468 177 478 154 466C154 466 170 472 180 457C187 444 195 410 161 399C124 388 87 417 87 417C87 417 115 383 168 393ZM216 -46C216 -46 215 -47 214 -48V94C214 101 212 131 193 131C191 131 190 131 188 131C203 139 215 150 223 162V-40C220 -43 219 -44 216 -46Z" fill="url(#ldChrome)"/>
    <path class="ld-outline" pathLength="1" transform="translate(11 717) scale(1 -1)" d="M560 -19C533 32 568 79 588 94C588 94 526 71 537 2C537 2 523 10 523 51V197C536 202 543 208 543 208C506 208 491 214 461 254C444 281 413 294 389 300C413 306 444 319 461 345C491 385 506 391 543 391C543 391 535 398 521 403V583C524 668 564 691 613 697C613 697 551 701 533 674C533 674 498 685 484 656C480 648 478 635 476 619C449 652 406 679 341 691C342 693 342 695 342 697C342 697 341 694 340 691C317 695 292 697 264 697C81 697 12 573 9 530C8 507 11 485 18 464C53 367 123 353 190 377C202 381 211 386 218 392C212 372 202 353 187 338L176 327L187 316C204 300 215 278 220 255C196 287 162 300 160 301C160 301 202 262 200 232C198 202 160 163 120 165C80 166 116 213 116 213C83 210 67 117 135 117C153 118 167 121 180 127C177 122 181 114 185 110C193 103 205 106 205 92V-55C197 -60 186 -66 174 -68C138 -66 145 -44 145 -44C145 -44 122 -63 132 -90C141 -116 201 -136 264 -59C326 17 394 10 394 10C352 16 314 9 283 -4V602C287 604 290 605 293 607V132C293 124 295 94 314 94C334 94 329 109 322 116C314 122 302 119 302 134V295L364 294C378 293 390 288 399 278C422 252 424 217 461 198V51C461 51 463 -19 482 -47C501 -74 575 -114 648 -51C648 -51 589 -63 560 -19ZM223 503C211 513 194 520 170 512C129 497 135 466 135 466C142 485 194 500 211 455C224 396 190 389 190 389C190 389 120 364 78 422C109 416 130 446 130 446C77 426 59 461 52 485C50 497 49 510 49 523C52 607 118 682 264 682C290 682 313 680 333 675C324 659 307 640 278 632C227 619 164 615 145 570C126 525 167 518 167 518C167 518 156 539 182 561C192 570 207 576 223 582ZM64 557C58 539 56 521 60 502C72 444 125 453 125 453C125 453 50 497 103 599C146 675 245 675 245 675C169 682 89 633 64 557ZM302 612C323 625 333 642 339 674C418 653 451 600 461 557C451 532 435 512 405 511C405 511 440 493 461 502V401C424 383 422 347 399 322C390 312 378 306 364 306L302 305ZM168 393C221 403 203 452 197 460C190 468 177 478 154 466C154 466 170 472 180 457C187 444 195 410 161 399C124 388 87 417 87 417C87 417 115 383 168 393ZM216 -46C216 -46 215 -47 214 -48V94C214 101 212 131 193 131C191 131 190 131 188 131C203 139 215 150 223 162V-40C220 -43 219 -44 216 -46Z"/>
    <g clip-path="url(#ldClip)"><rect class="ld-glint" x="-679" y="-20" width="258" height="890" fill="url(#ldShine)"/></g>
    <g filter="url(#ldGlow)"><path class="ld-spark s1" d="M557 68 Q557 102 591 102 Q557 102 557 136 Q557 102 523 102 Q557 102 557 68Z"/><path class="ld-spark s2" d="M136 505 Q136 527 158 527 Q136 527 136 549 Q136 527 114 527 Q136 527 136 505Z"/><path class="ld-spark s3" d="M611 713 Q611 731 629 731 Q611 731 611 749 Q611 731 593 731 Q611 731 611 713Z"/></g>
  </svg>
  <video class="ld-video" muted playsinline preload="none" hidden></video>
  <p class="ld-cap">Rolling Mills <span>Taproom</span></p>
</div>"""


def page(pid, title, desc, navkey, body):
    nav = "\n".join(f'          <li><a href="{href}"{" aria-current=\"page\"" if key == navkey else ""}>{label}</a></li>' for key, href, label in NAV)
    home = pid == "home"
    base = chr(10) + '<base href="/">' if pid == "404" else ""  # 404 is served at any missing URL, so resolve links from the site root
    extra_css = ('\n<link rel="stylesheet" href="css/home-v2.css">'
                 '\n<link rel="stylesheet" href="css/loader.css">'
                 '\n<link rel="preload" as="image" href="assets/video/hero-video-poster.webp">') if home else ""
    extra_js = '<script src="js/three.min.js"></script>\n<script src="js/lenis.min.js"></script>\n<script src="js/fuzzy-text.js"></script>\n<script src="js/home.js"></script>\n<script src="js/gallery.js"></script>' if home else ""
    if pid == "book":
        extra_js = '<script src="js/tear-ticket.js"></script>'
    if pid == "taps":
        extra_js = '<script src="js/three.min.js"></script>' + chr(10) + '<script src="js/drawer-can.js"></script>'
    loader = LOADER if home else ""
    # skip the loader before first paint if it already played this session (or reduced motion is on)
    head_js = ("\n<script>try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)"
               "document.documentElement.classList.add('skip-loader')}catch(e){}</script>"
               "\n<noscript><style>#loader{display:none}</style></noscript>") if home else ""
    ld = f'<script type="application/ld+json">{json.dumps(JSONLD)}</script>' if pid in ("home", "visit") else ""
    return f"""<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">{base}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="assets/photos/unholy-order.webp">
<meta name="theme-color" content="#0d0d0d">
<link rel="icon" href="assets/logo-white.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Sedgwick+Ave+Display&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/site.css">{extra_css}{head_js}
{ld}
</head>
<body data-page="{pid}">{loader}
<a class="skip" href="#main">Skip to content</a>

<header class="site-header pill-nav">
  <div class="hd">
    <div class="hd-in">
      <a class="brand" href="index.html"><img src="assets/r-badge.svg" alt="Rolling Mills Taproom, home" width="36" height="36"></a>
      <nav class="nav" aria-label="Main">
        <ul id="nav-list">
{nav}
        </ul>
      </nav>
      <div class="hd-actions">
        <a class="btn btn-solid rb-static nav-book" href="book.html" data-track="Book a table">Book a table</a>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav-list" aria-label="Menu"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      </div>
    </div>
    <button class="hd-expand" type="button" aria-label="Show navigation" tabindex="-1"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
  </div>
</header>

<main id="main">
{body}
</main>

<footer class="site-footer ft2">
  <div class="ft2-mark" role="img" aria-label="Rolling Mills">
    <span class="ft2-word">Rolling</span>
    <img class="ft2-badge" src="assets/r-badge.svg" alt="" width="200" height="200" loading="lazy">
    <span class="ft2-canslot" aria-hidden="true"></span>
    <span class="ft2-word">Mills</span>
  </div>
  <div class="wrap ft2-cols">
    <div class="ft2-col">
      <h2 class="ft2-h">Menu</h2>
      <ul class="ft2-list">
        <li><a href="on-tap.html">On tap</a></li>
        <li><a href="menu.html">Food &amp; drink</a></li>
        <li><a href="book.html">Book a table</a></li>
        <li><a href="parties.html">Private parties</a></li>
        <li><a href="story.html">Our story</a></li>
      </ul>
    </div>
    <div class="ft2-col">
      <h2 class="ft2-h">Find us here</h2>
      <address class="ft2-text">Rolling Mills Taproom<br>Shop 20, Meera Co-op Hsg<br>New Link Road, Oshiwara<br>Andheri West, Mumbai 400053</address>
      <p class="ft2-text"><a href="https://www.google.com/maps/search/?api=1&amp;query=19.15123,72.8317709" target="_blank" rel="noopener" data-track="Directions">Get directions →</a></p>
    </div>
    <div class="ft2-col">
      <h2 class="ft2-h">Talk to us</h2>
      <ul class="ft2-list">
        <li><a href="tel:+917400407711" data-track="Call">Call +91 74004 07711</a></li>
        <li><a href="https://wa.me/917400407711" target="_blank" rel="noopener" data-track="WhatsApp">WhatsApp us</a></li>
        <li><a href="https://www.instagram.com/rollingmillsbrewery/" target="_blank" rel="noopener">Instagram @rollingmillsbrewery</a></li>
        <li><a href="privacy.html">Privacy</a></li>
      </ul>
    </div>
    <div class="ft2-card" id="hours">
      <h2 class="ft2-h">Opening hours</h2>
      <p class="ft2-text ft2-status" data-status></p>
      <dl class="ft-hours ft2-hours" data-hours-list></dl>
    </div>
  </div>
  <div class="wrap ft2-base">
    <p>Brewed in Kandivali West, poured in Andheri West.</p>
    <p>Please drink responsibly. For guests aged 21 and over.</p>
    <p>© Rolling Mills Brewery LLP</p>
  </div>
</footer>

<nav class="actionbar" aria-label="Quick actions">
  <a href="book.html" data-track="Book a table">{icon("book")}<span>Book</span></a>
  <a href="{ORDER}" target="_blank" rel="noopener" data-track="Order beer">{icon("order")}<span>Order<span class="sr"> beer on AirMenus</span></span></a>
  <a href="tel:+917400407711" data-track="Call">{icon("call")}<span>Call</span></a>
  <a href="https://www.google.com/maps/search/?api=1&amp;query=19.15123,72.8317709" target="_blank" rel="noopener" data-track="Directions">{icon("map")}<span>Directions</span></a>
</nav>

<div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-h" hidden>
  <div class="gate-card">
    <img src="assets/logo-white.png" alt="" width="160" height="42">
    <h2 id="gate-h">Are you 21 or over?</h2>
    <p>You need to be of legal drinking age to visit this site.</p>
    <div class="gate-actions">
      <button class="btn btn-solid" type="button" data-gate="yes">Yes, I'm 21+</button>
      <button class="btn btn-line" type="button" data-gate="no">Not yet</button>
    </div>
    <p class="gate-no" hidden>Thanks for being honest. Come back when you're 21.</p>
  </div>
</div>

<script src="js/data.js"></script>
<script src="js/app.js"></script>
{extra_js}
</body>
</html>
"""


# safety check: refuse to build if any script has a syntax error (one broken file blanks the whole home page)
import shutil, subprocess, sys
if shutil.which("node"):
    bad = []
    for js in sorted((ROOT / "js").glob("*.js")):
        r = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
        if r.returncode:
            lines = r.stderr.strip().splitlines()
            where = next((l.strip() for l in lines if js.name in l), "")
            what = next((l.strip() for l in lines if "Error" in l), lines[-1] if lines else "?")
            bad.append(f"{where or js.name}  {what}")
    if bad:
        sys.exit("BUILD STOPPED, script errors:" + chr(10) + "  " + (chr(10) + "  ").join(bad))

for pid, out, title, desc, navkey in PAGES:
    body = (ROOT / "src" / f"{pid}.html").read_text(encoding="utf-8")
    html = page(pid, title, desc, navkey, body.rstrip())
    html = re.sub(r'((?:href|src)="(?:css|js)/[^"?]+\.(?:css|js))"', r'\1?v=' + BUILD_VER + '"', html)
    (ROOT / out).write_text(html, encoding="utf-8")
    print("built", out)
