/* ---- site/js/core/00-core.js ---- */
/* ClearDrive core: data access, money math, shared constants, DOM helpers, car figures, overlays.
   Every page loads data.js (window.CD_DATA) and then this file, which exposes window.CD. */
(function () {
  "use strict";
  var D = window.CD_DATA || {};
  var CD = window.CD = {};
  CD.version = D.version || "2.0.0";
  CD.build = D.build || "";

  /* ---------- data ---------- */
  CD.models = D.models || [];
  CD.rooftops = D.rooftops || [];
  CD.preowned = D.preowned || [];
  CD.zips = D.zips || {};
  CD.credits = D.credits || {};
  CD.brands = (function () { var s = {}; CD.models.forEach(function (m) { s[m.make] = 1; }); CD.rooftops.forEach(function (r) { (r.brands || []).forEach(function (b) { s[b] = 1; }); }); return Object.keys(s).sort(); })();
  CD.modelById = function (id) { for (var i = 0; i < CD.models.length; i++) if (CD.models[i].id === id) return CD.models[i]; return null; };
  CD.rooftopById = function (id) { for (var i = 0; i < CD.rooftops.length; i++) if (CD.rooftops[i].id === id) return CD.rooftops[i]; return null; };
  CD.rooftopsFor = function (make) { return CD.rooftops.filter(function (r) { return (r.brands || []).indexOf(make) >= 0; }); };

  /* ---------- founder decisions, shared by every page ---------- */
  CD.FEATS = { awd: "All-wheel drive", third: "Third row", heated: "Heated seats", blind: "Blind-spot monitoring", cam360: "360° camera", hybrid: "Hybrid", ev: "Electric", remote: "Remote start", tow: "Tows 3,500 lb+", carplay: "Wireless CarPlay / Android Auto", acc: "Adaptive cruise" };
  CD.FEAT_GROUPS = [
    { n: "Technology", f: ["carplay", "heated", "cam360", "remote"] },
    { n: "Safety", f: ["acc", "blind", "awd"] },
    { n: "Powertrain", f: ["hybrid", "ev", "tow"] },
    { n: "Space", f: ["third"] }
  ];
  CD.BODIES = [["suv", "SUV"], ["sedan", "Sedan"], ["truck", "Truck"], ["minivan", "Minivan"], ["hatch", "Hatchback"], ["coupe", "Coupe"], ["van", "Van"], ["wagon", "Wagon"], ["convertible", "Convertible"]];
  CD.SIZES = [["subcompact", "Subcompact"], ["compact", "Compact"], ["mid", "Midsize"], ["large", "Full-size"]];
  CD.FUELS = { gas: "Gas", hybrid: "Hybrid", phev: "Plug-in hybrid", ev: "Electric", diesel: "Diesel" };
  CD.TIERS = { excellent: { n: "Excellent", lo: 5.4, hi: 6.9 }, good: { n: "Good", lo: 6.9, hi: 8.4 }, fair: { n: "Fair", lo: 9.5, hi: 12.5 }, rebuilding: { n: "Rebuilding", lo: 13.5, hi: 18 } };
  /* Protection products. The buyer decides which ones a dealer may quote. Dealers set their own prices; ClearDrive publishes no price guide. */
  CD.PRODUCTS = [
    ["gap", "GAP", "If the car is totaled or stolen, it pays the difference between what insurance pays and what you still owe."],
    ["vsc", "Extended service contract", "Covers listed repairs after the factory warranty ends. Often called an extended warranty."],
    ["maint", "Prepaid maintenance", "Pays in advance for scheduled services such as oil changes and tire rotations."],
    ["tire", "Tire and wheel protection", "Repairs or replaces tires and wheels damaged by potholes, nails and other road hazards."]
  ];
  CD.PROTWORD = { yes: "Yes, quote it", no: "No thanks", ask: "Explain it in person" };
  CD.SURVEY = ["Was the price the one you were shown?", "Did the paperwork match the offer?", "Was your time respected?"];
  CD.LENDERS = [["tcu", "Tidewater Credit Union", 0.1, "Anyone who lives or works in the county can join"], ["mfc", "Meridian Federal Credit Union", 0.35, "Join with a $5 share deposit"], ["hsb", "Harbor Savings Bank", 0.8, "No membership needed"]];
  CD.PLANS = [["Pilot", "$0", "for 90 days", "One or two rooftops. Every feature. Either side can end it in one email."], ["Founding store", "$500", "a month per rooftop", "For the first fifty stores, locked for 12 months after the pilot."], ["Standard", "$1,000", "a month per rooftop", "The same product. No tiers of access and no add-on charges."]];
  /* State sales tax on vehicles, and title/registration estimates used in every out-the-door figure */
  CD.TAX = { VA: { rate: 0.0415, name: "Virginia motor vehicle sales and use tax (4.15%)", reg: 95 }, MD: { rate: 0.06, name: "Maryland titling tax (6%)", reg: 135 }, DC: { rate: 0.06, name: "DC excise tax (est. 6%)", reg: 120 } };
  CD.DOC_FEE = { VA: 899, MD: 500, DC: 500 }; /* Virginia processing fees are uncapped; Maryland caps the dealer processing charge at $500 */

  /* ---------- money ---------- */
  CD.usd = function (n, opt) { if (n == null || !isFinite(n)) return "—"; var s = Math.abs(Math.round(n)).toLocaleString("en-US"); return (n < 0 ? "−$" : "$") + s + (opt && opt.mo ? "/mo" : ""); };
  CD.usd2 = function (n) { if (n == null || !isFinite(n)) return "—"; return (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  CD.n = function (n) { return n == null ? "—" : Math.round(n).toLocaleString("en-US"); };
  CD.pct = function (n, d) { return n == null ? "—" : n.toFixed(d == null ? 2 : d) + "%"; };
  CD.pmt = function (P, apr, n) { if (P <= 0) return 0; var r = apr / 1200; return r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n)); };
  CD.pv = function (p, apr, n) { var r = apr / 1200; return r === 0 ? p * n : p * (1 - Math.pow(1 + r, -n)) / r; };
  CD.taxOf = function (price, state) { var t = CD.TAX[state] || CD.TAX.VA; return Math.round(price * t.rate); };
  CD.otd = function (price, fee, add, state) { var t = CD.TAX[state] || CD.TAX.VA; return price + (fee || 0) + (add || 0) + Math.round(price * t.rate) + t.reg; };
  CD.leaseMo = function (price, fee, add, equity, apr, term, miles) {
    var n = term || 36, res = price * ({ 24: .68, 36: .62, 39: .60, 48: .55 }[n] + ({ 10000: .01, 12000: 0, 15000: -.02 }[miles] || 0));
    var cap = price + (fee || 0) + (add || 0) - (equity || 0), mf = (apr || 6.5) / 2400;
    return (cap - res) / n + (cap + res) * mf;
  };
  CD.round10 = function (v) { return Math.ceil(v / 10) * 10; };

  /* ---------- storage (per browser, optional) ---------- */
  CD.store = {
    get: function (k, d) { try { var v = localStorage.getItem("cd:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("cd:" + k, JSON.stringify(v)); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem("cd:" + k); } catch (e) { } }
  };

  /* ---------- the deal: one record shared by the buyer workspace and the dealer desk in this browser ----------
     Shape (all optional until set):
     { id:"CD-1042", created:ms, status:"new"|"asked"|"replied"|"booked"|"sold",
       brief:{ pay:"finance"|"lease"|"cash", limit:650, down:3000, term:72, lterm:36, miles:12000, das:3000, body:"suv", size:"compact",
               makes:["Kia"], feats:["awd"], zip:"22030", state:"VA", tier:"good", lender:"tcu"|null,
               trade:{has:true, year:2018, make:"Honda", model:"Accord", miles:82000, cond:"good", payoff:9000, photos:["front","rear","interior","odo"]},
               prot:{gap:"yes"|"no"|"ask", vsc:..., maint:..., tire:...}, name:"Jordan Ellis" },
       pick:"kia-telluride", way:"drive"|"price", alias:"jordan.e@cleardrive.app", rooftops:["kia-fairfax","kia-chantilly"],
       askedAt:ms, offers:[{rooftop:"kia-fairfax", at:ms, msg:"", q:{price,fee,add,allow,payoff,apr,prod:{gap:795}}}],
       chosen:"kia-fairfax", slot:{day:"Thu", time:"5:30 pm"}, thread:[{who:"buyer"|"desk"|"sys", text, at}], paper:{...}, survey:{} }
     The desk never writes brief fields; the workspace never writes offers. Both read everything. */
  CD.deal = {
    get: function () { return CD.store.get("deal", null); },
    set: function (d) { CD.store.set("deal", d); return d; },
    update: function (fn) { var d = CD.deal.get() || {}; fn(d); return CD.deal.set(d); },
    clear: function () { CD.store.del("deal"); },
    newId: function () { var n = CD.store.get("seq", 1041) + 1; CD.store.set("seq", n); return "CD-" + n; }
  };
  /* protection guard: only a product the buyer said "yes" to may carry a price, whatever the desk typed */
  CD.cleanProd = function (prot, prod) { var out = {}; CD.PRODUCTS.forEach(function (p) { if (prot && prot[p[0]] === "yes") out[p[0]] = Math.max(0, +((prod || {})[p[0]]) || 0); }); return out; };
  /* one function prices every offer for both sides */
  CD.priceQuote = function (brief, q) {
    var state = brief.state || "VA", t = CD.TAX[state] || CD.TAX.VA, prod = CD.cleanProd(brief.prot, q.prod), prodSum = 0; Object.keys(prod).forEach(function (k) { prodSum += prod[k]; });
    var tax = Math.round((q.price + (q.add || 0) + prodSum) * t.rate), otd = q.price + (q.fee || 0) + (q.add || 0) + prodSum + tax + t.reg;
    var allow = brief.trade && brief.trade.has ? (q.allow || 0) : 0, payoff = brief.trade && brief.trade.has ? (brief.trade.payoff || 0) : 0, equity = allow - payoff;
    var o = { otd: otd, tax: tax, reg: t.reg, prod: prod, prodSum: prodSum, allow: allow, payoff: payoff, equity: equity };
    if (brief.pay === "cash") { o.due = otd - equity; o.mo = null; }
    else if (brief.pay === "lease") { o.cap = otd - equity - (brief.das || 0); o.mo = CD.leaseMo(q.price, (q.fee || 0), (q.add || 0) + prodSum, equity + (brief.das || 0), q.apr == null ? 6.5 : q.apr, brief.lterm || 36, brief.miles || 12000); o.due = brief.das || 0; }
    else { o.fin = otd - equity - (brief.down || 0); o.mo = CD.pmt(o.fin, q.apr == null ? 7.5 : q.apr, brief.term || 72); o.due = brief.down || 0; }
    o.limit = brief.limit; o.under = brief.pay === "cash" ? o.due <= brief.limit : o.mo <= brief.limit;
    o.gap = brief.pay === "cash" ? brief.limit - o.due : brief.limit - o.mo;
    return o;
  };

  /* ---------- text and DOM ---------- */
  CD.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  CD.qs = function (s, r) { return (r || document).querySelector(s); };
  CD.qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  CD.on = function (root, ev, sel, fn) { root.addEventListener(ev, function (e) { var t = e.target.closest(sel); if (t && root.contains(t)) fn(e, t); }); };
  CD.html = function (el, h) { el.innerHTML = h; return el; };
  CD.uid = function (p) { return (p || "id") + "-" + Math.random().toString(36).slice(2, 8); };
  CD.plural = function (n, s, p) { return n === 1 ? s : (p || s + "s"); };
  CD.cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  CD.fmtDate = function (d, o) { d = d instanceof Date ? d : new Date(d); return d.toLocaleDateString("en-US", o || { month: "short", day: "numeric" }); };
  CD.fmtTime = function (d) { d = d instanceof Date ? d : new Date(d); return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };
  CD.ago = function (ms) { var s = Math.max(0, Math.round(ms / 1000)); if (s < 60) return s + "s"; var m = Math.round(s / 60); if (m < 60) return m + "m"; var h = Math.round(m / 60); if (h < 24) return h + "h"; return Math.round(h / 24) + "d"; };
  CD.clock = function (ms) { var s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); };
  CD.initials = function (name) { return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join(""); };
  CD.fill = function (r) { r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min) * 100) + "%"); };
  CD.param = function (k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } };
  CD.hashParam = function (k) { var m = (location.hash || "").match(new RegExp("[#&]" + k + "=([^&]+)")); return m ? decodeURIComponent(m[1]) : null; };

  /* ---------- geography ---------- */
  CD.zip = function (z) { var r = CD.zips[String(z || "").trim()]; return r ? { lat: r[0], lng: r[1], city: r[2], state: r[3] } : null; };
  CD.dist = function (a, b) { if (!a || !b || a.lat == null || b.lat == null) return null; var R = 3958.8, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180; var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2); return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };
  CD.nearest = function (from, make, n) { var list = (make ? CD.rooftopsFor(make) : CD.rooftops.slice()).map(function (r) { return { r: r, d: CD.dist(from, r) }; }); list.sort(function (a, b) { return (a.d == null ? 1e9 : a.d) - (b.d == null ? 1e9 : b.d); }); return list.slice(0, n || 3); };
  CD.miles = function (d) { return d == null ? "" : (d < 10 ? d.toFixed(1) : Math.round(d)) + " mi"; };

  /* ---------- car figures ---------- */
  var ARCH = function (rx) { return " L" + (rx + 22) + " 82 A22 22 0 0 0 " + (rx - 22) + " 82 L100 82 A22 22 0 0 0 56 82 "; };
  var SHAPES = {
    suv: { rx: 246, x0: 14, x1: 300, d: "M14 82 C12 72 13 62 20 56 C40 49 66 46 92 44 C108 26 130 16 158 15 L250 15 C268 16 280 22 288 36 C296 46 302 58 302 72 L300 82", w: "M100 42 C114 28 134 21 158 20 L246 20 C262 21 272 28 278 40 Z", p: [170, 226] },
    sedan: { rx: 246, x0: 14, x1: 304, d: "M14 82 C12 72 14 64 22 60 C40 53 70 50 98 47 C116 30 140 22 170 21 C200 20 224 25 246 40 C262 44 280 45 294 49 C304 52 308 62 306 74 L304 82", w: "M106 45 C122 32 142 27 168 26 L200 26 C218 27 232 33 242 42 Z", p: [174] },
    truck: { rx: 254, x0: 12, x1: 308, d: "M12 82 C10 70 12 58 20 54 C40 48 64 45 88 43 C102 24 120 15 146 14 L190 14 C198 14 202 18 203 26 L206 46 L300 46 C306 46 308 50 308 56 L308 82", w: "M96 42 C108 27 124 20 146 19 L188 19 C194 19 196 22 197 28 L199 42 Z", p: [150] },
    minivan: { rx: 246, x0: 14, x1: 302, d: "M14 82 C12 72 14 62 24 56 C40 50 56 47 74 45 C92 24 118 13 150 12 L262 12 C278 13 290 22 296 40 C302 54 304 66 303 76 L302 82", w: "M82 43 C98 26 120 18 150 17 L258 17 C272 18 282 26 288 41 Z", p: [160, 224] },
    hatch: { rx: 246, x0: 22, x1: 294, d: "M22 82 C20 73 22 65 30 61 C48 55 76 52 104 49 C122 32 146 24 174 23 L226 23 C246 24 264 32 280 46 C290 54 296 64 295 76 L294 82", w: "M112 47 C128 34 148 29 174 28 L224 28 C242 29 256 36 268 46 Z", p: [182] }
  };
  var ALIAS = { coupe: "sedan", convertible: "sedan", wagon: "hatch", van: "minivan" };
  function wheel(cx) { var sp = ""; for (var a = 0; a < 5; a++) sp += '<line x1="' + cx + '" y1="80" x2="' + cx + '" y2="69.5" transform="rotate(' + (a * 72 + 18) + " " + cx + ' 80)"/>'; return '<circle class="tyre" cx="' + cx + '" cy="82" r="20"/><circle class="rim" cx="' + cx + '" cy="82" r="12"/><g class="rim">' + sp + "</g>"; }
  CD.defs = function () {
    if (document.getElementById("cdBody")) return;
    var s = document.createElement("div"); s.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="cdBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46688A"/><stop offset=".42" stop-color="#1F3B57"/><stop offset="1" stop-color="#0B1827"/></linearGradient><linearGradient id="cdGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A4764"/><stop offset=".5" stop-color="#0A1522"/><stop offset="1" stop-color="#132A40"/></linearGradient><linearGradient id="cdGround" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#BED7EB" stop-opacity="0"/><stop offset=".5" stop-color="#BED7EB" stop-opacity=".35"/><stop offset="1" stop-color="#BED7EB" stop-opacity="0"/></linearGradient></defs></svg>';
    document.body.insertBefore(s.firstChild, document.body.firstChild);
  };
  CD.bodySVG = function (body) {
    var o = SHAPES[ALIAS[body] || body] || SHAPES.sedan;
    var d = o.d + ARCH(o.rx) + " Z";
    return '<svg viewBox="0 0 320 110" aria-hidden="true"><line class="floor" x1="0" y1="104" x2="320" y2="104"/><path class="body" d="' + d + '"/><path class="glass" d="' + o.w + '"/>' + o.p.map(function (x) { return '<line x1="' + x + '" y1="46" x2="' + x + '" y2="78" stroke="rgba(190,215,235,.25)" stroke-width="1"/>'; }).join("") + '<rect class="lamp" x="' + (o.x1 - 10) + '" y="56" width="8" height="5" rx="2"/><rect class="tail" x="' + (o.x0 + 2) + '" y="58" width="6" height="6" rx="2"/>' + wheel(56) + wheel(o.rx) + "</svg>";
  };
  CD.carSrc = function (m) { return m && m.id && CD.credits[m.id] ? "assets/cars/" + m.id + ".webp" : null; };
  CD.car = function (m, cls, cap) {
    var src = CD.carSrc(m), alt = m ? (m.year ? m.year + " " : "") + m.make + " " + m.model : "Vehicle";
    var inner = src ? '<img src="' + src + '" alt="' + CD.esc(alt) + '" loading="lazy" decoding="async" onerror="this.outerHTML=CD.bodySVG(\'' + CD.esc((m && m.body) || "sedan") + '\')">' : CD.bodySVG((m && m.body) || "sedan");
    return '<figure class="car ' + (cls || "") + '">' + inner + (cap ? '<figcaption class="cap">' + CD.esc(cap) + "</figcaption>" : "") + "</figure>";
  };
  CD.hasFeat = function (m, f) { return (m.feats || []).indexOf(f) >= 0 || f === "carplay" || f === "acc"; };
  CD.featName = function (k) { return CD.FEATS[k] || k; };
  CD.bodyName = function (k) { for (var i = 0; i < CD.BODIES.length; i++) if (CD.BODIES[i][0] === k) return CD.BODIES[i][1]; return k; };
  CD.sizeName = function (k) { for (var i = 0; i < CD.SIZES.length; i++) if (CD.SIZES[i][0] === k) return CD.SIZES[i][1]; return ""; };
  CD.brandAbbr = function (b) { var map = { Chevrolet: "CHEV", Volkswagen: "VW", Mitsubishi: "MITS", Chrysler: "CHRY", Lincoln: "LINC", Hyundai: "HYUN", Subaru: "SUBA", Toyota: "TOYO", Honda: "HOND", Mazda: "MAZD", Nissan: "NISS", Dodge: "DODG", Jeep: "JEEP", Ram: "RAM", Ford: "FORD", Buick: "BUIC", GMC: "GMC", Audi: "AUDI", Lexus: "LEXU", Volvo: "VOLV", Lotus: "LOTU", Kia: "KIA" }; return map[b] || String(b || "").slice(0, 4).toUpperCase(); };

  /* ---------- overlays ---------- */
  var toasts;
  CD.toast = function (msg, kind, ms) { if (!toasts) { toasts = document.createElement("div"); toasts.className = "toasts"; toasts.setAttribute("aria-live", "polite"); document.body.appendChild(toasts); } var t = document.createElement("div"); t.className = "toast " + (kind || ""); t.innerHTML = "<b></b><span>" + CD.esc(msg) + "</span>"; toasts.appendChild(t); setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .4s"; setTimeout(function () { t.remove(); }, 420); }, ms || 3200); };
  var modalEl;
  CD.modal = function (html, opt) { opt = opt || {}; if (!modalEl) { modalEl = document.createElement("div"); modalEl.className = "modal"; modalEl.setAttribute("role", "dialog"); modalEl.setAttribute("aria-modal", "true"); document.body.appendChild(modalEl); modalEl.addEventListener("click", function (e) { if (e.target === modalEl || e.target.closest("[data-close]")) CD.closeModal(); }); document.addEventListener("keydown", function (e) { if (e.key === "Escape") CD.closeModal(); }); } modalEl.innerHTML = '<div class="box ' + (opt.wide ? "wide" : "") + '"><button class="x" data-close aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' + html + "</div>"; requestAnimationFrame(function () { modalEl.classList.add("open"); var f = modalEl.querySelector("input,button:not(.x),select,textarea"); if (f) f.focus(); }); return modalEl; };
  CD.closeModal = function () { if (modalEl) modalEl.classList.remove("open"); };

  /* ---------- navigation chrome ---------- */
  CD.icon = function (n) {
    var I = {
      shield: '<path d="M12 3l8 3v6c0 4.6-3.2 8.3-8 9-4.8-.7-8-4.4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
      check: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
      lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', car: '<path d="M5 13l2-5h10l2 5M4 13h16v5H4z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/>',
      pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>', star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17h.01"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
      bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 6 5.5"/>',
      chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
      camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', video: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3z"/>', plate: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h10"/>',
      spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>', refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[n] || I.info) + "</svg>";
  };
  CD.logo = function () { return '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3l11 4v8c0 6.2-4.4 11.3-11 13C9.4 26.3 5 21.2 5 15V7l11-4z" fill="none" stroke="#63D2C6" stroke-width="1.6"/><path d="M10.5 16.5l3.5 3.5 7.5-8" fill="none" stroke="#ECF2F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
  CD.NAV = [["index.html", "Home", "home"], ["app.html", "Buyers", "app"], ["inventory.html", "Inventory", "inventory"], ["dealer.html", "Dealers", "dealer"], ["trust.html", "Trust", "trust"]];
  CD.nav = function (active) {
    var links = CD.NAV.filter(function (l) { return l[2] !== "home"; }).map(function (l) { return '<a href="' + l[0] + '"' + (l[2] === active ? ' class="on" aria-current="page"' : "") + ">" + l[1] + "</a>"; }).join("");
    return '<header class="nav"><div class="wrap in"><a class="mark" href="index.html" aria-label="ClearDrive home">' + CD.logo() + "Clear<i>Drive</i></a><nav class=\"links\" aria-label=\"Primary\">" + links + '</nav><span class="sp"></span><span class="tag">Demonstration · sample data</span><a class="btn pri sm cta" href="app.html">Start your brief</a><button class="burger" aria-label="Open menu" data-sheet-open>' + CD.icon("menu") + "</button></div></header>" +
      '<div class="sheet" id="sheet" aria-hidden="true"><div class="panel"><button class="close" data-sheet-close>Close</button>' + CD.NAV.map(function (l) { return '<a href="' + l[0] + '"' + (l[2] === active ? ' class="on"' : "") + ">" + l[1] + "</a>"; }).join("") + '<a class="btn pri block" href="app.html" style="margin-top:8px">Start your brief</a></div></div>';
  };
  CD.footer = function () {
    return '<footer class="foot"><div class="wrap"><div class="cols4"><div><a class="mark" href="index.html">' + CD.logo() + 'Clear<i>Drive</i></a><p class="about">The buyer\'s side of the desk. A free workspace for choosing a car, collecting written offers and checking the paperwork, built with Ourisman Automotive Group as the founding dealer.</p></div>' +
      '<div><h5>Product</h5><ul><li><a href="app.html">Buyer workspace</a></li><li><a href="inventory.html">New and preowned</a></li><li><a href="dealer.html">Dealer desk</a></li><li><a href="trust.html">Trust center</a></li></ul></div>' +
      '<div><h5>Company</h5><ul><li><a href="index.html#why">Why ClearDrive</a></li><li><a href="index.html#dealers">For dealer groups</a></li><li><a href="index.html#pricing">Pricing</a></li><li><a href="trust.html#changelog">Release notes</a></li></ul></div>' +
      '<div><h5>Legal</h5><ul><li><a href="trust.html#privacy">Privacy</a></li><li><a href="trust.html#rules">Fairness rules</a></li><li><a href="trust.html#security">Security</a></li><li><a href="trust.html#credits">Imagery credits</a></li></ul></div></div>' +
      '<div class="base"><span class="status"><b></b>All systems operational</span><span>ClearDrive ' + CD.esc(CD.version) + " · build " + CD.esc(CD.build) + "</span><span>Demonstration with sample data. No real customers, offers or dealer replies.</span><span class=\"sp\"></span><span>© 2026 ClearDrive Technologies · Fairfax, Virginia</span></div></div></footer>";
  };
  CD.chrome = function (active) {
    var navSlot = document.getElementById("nav"), footSlot = document.getElementById("footer");
    if (navSlot) navSlot.outerHTML = CD.nav(active);
    if (footSlot) footSlot.outerHTML = CD.footer();
    CD.defs();
    var sheet = document.getElementById("sheet");
    if (sheet) {
      CD.on(document, "click", "[data-sheet-open]", function () { sheet.classList.add("open"); sheet.setAttribute("aria-hidden", "false"); });
      CD.on(document, "click", "[data-sheet-close]", function () { sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); });
      sheet.addEventListener("click", function (e) { if (e.target === sheet) { sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); } });
    }
  };

  /* ---------- ambient sky (aurora + horizon + one headlight sweep) ---------- */
  CD.sky = function (canvas) {
    if (!canvas) return; var ctx = canvas.getContext("2d"), reduced = matchMedia("(prefers-reduced-motion:reduce)").matches, t0 = performance.now(), W, H;
    function size() { W = canvas.width = innerWidth * Math.min(devicePixelRatio || 1, 2); H = canvas.height = innerHeight * Math.min(devicePixelRatio || 1, 2); }
    size(); addEventListener("resize", size);
    function frame(now) {
      var t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(6,16,28,0)"); g.addColorStop(1, "rgba(6,16,28,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 3; i++) {
        var x = W * (0.2 + 0.3 * i) + Math.sin(t * 0.08 + i) * W * 0.12, y = H * (0.18 + 0.12 * i) + Math.cos(t * 0.06 + i * 2) * H * 0.06, r = W * (0.28 + 0.06 * i);
        var rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, i === 1 ? "rgba(99,210,198,.11)" : "rgba(30,80,120,.16)"); rg.addColorStop(1, "rgba(6,16,28,0)"); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
      var hy = H * 0.82; var hg = ctx.createLinearGradient(0, hy - 2, 0, hy + 2); hg.addColorStop(0, "rgba(190,215,235,0)"); hg.addColorStop(.5, "rgba(190,215,235,.14)"); hg.addColorStop(1, "rgba(190,215,235,0)"); ctx.fillStyle = hg; ctx.fillRect(0, hy - 2, W, 4);
      var sx = ((t * 0.045) % 1.4 - 0.2) * W; var sg = ctx.createLinearGradient(sx - W * 0.25, 0, sx + W * 0.25, 0); sg.addColorStop(0, "rgba(99,210,198,0)"); sg.addColorStop(.5, "rgba(99,210,198,.07)"); sg.addColorStop(1, "rgba(99,210,198,0)"); ctx.fillStyle = sg; ctx.fillRect(0, hy - H * 0.3, W, H * 0.3);
      if (!reduced) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})();
