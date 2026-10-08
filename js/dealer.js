(function(){
"use strict";
/* ---- site/js/dealer/10-data.js ---- */
/* dealer desk: state, sample data, the unified lead model */
var S = CD.store.get("desk", null) || {};
function save() { CD.store.set("desk", S); }
(function defaults() {
  if (!S.rooftop || !CD.rooftopById(S.rooftop)) S.rooftop = CD.rooftopById("kia-fairfax") ? "kia-fairfax" : (CD.rooftops[0] ? CD.rooftops[0].id : null);
  S.name = S.name || "Front desk";
  S.notify = S.notify || { mail: true, sms: true, push: false };
  S.sampleStatus = S.sampleStatus || {};
  S.sampleOffers = S.sampleOffers || {};
  S.drafts = S.drafts || {};
  S.calc = S.calc || { fee: 500, req: 40, show: 65, close: 45, gross: 2400 };
  S.sort = S.sort || { k: "answer", d: 1 };
  S.open = S.open || null;
})();

/* deterministic illustrative numbers: the same rooftop always gets the same figures */
function h(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) / 4294967296; }
function hv(id, salt, lo, hi) { return lo + (hi - lo) * h(id + "|" + salt); }
function gradeOf(a) { return a >= 92 ? "A" : a >= 88 ? "A−" : a >= 84 ? "B+" : a >= 80 ? "B" : a >= 75 ? "B−" : a >= 70 ? "C+" : "C"; }
function metrics(r) {
  var id = r.id, m;
  if (id === "kia-fairfax") m = { answer: 6, show: 81, drift: 2, attach: 44, reports: 214, m: [96, 94, 88], req: 58 };
  else m = { answer: Math.round(hv(id, "ans", 4, 28)), show: Math.round(hv(id, "show", 58, 86)), drift: Math.round(hv(id, "drift", 1, 12)), attach: Math.round(hv(id, "att", 26, 48)), reports: Math.round(hv(id, "rep", 40, 260)), m: [Math.round(hv(id, "m1", 84, 97)), Math.round(hv(id, "m2", 82, 96)), Math.round(hv(id, "m3", 76, 93))], req: Math.round(hv(id, "req", 22, 74)) };
  m.avg = (m.m[0] + m.m[1] + m.m[2]) / 3; m.grade = gradeOf(m.avg); return m;
}
function active() { return CD.rooftopById(S.rooftop) || CD.rooftops[0] || { id: "none", name: "No rooftop", brands: [], city: "", state: "VA", lat: 38.85, lng: -77.33 }; }

/* catalog access with a fallback so the desk renders before the catalog is built */
var FALLBACK = [
  { id: "kia-telluride", make: "Kia", model: "Telluride", year: 2026, body: "suv", size: "large", msrp: 36200, trim: "LX", fuel: "gas", feats: ["awd", "third", "heated", "blind", "cam360", "remote", "tow", "carplay", "acc"], popular: true, seats: 8 },
  { id: "kia-sportage", make: "Kia", model: "Sportage", year: 2026, body: "suv", size: "compact", msrp: 28000, trim: "LX", fuel: "gas", feats: ["awd", "hybrid", "heated", "blind", "cam360", "remote", "carplay", "acc"], popular: true, seats: 5 },
  { id: "kia-sorento", make: "Kia", model: "Sorento", year: 2026, body: "suv", size: "mid", msrp: 32000, trim: "LX", fuel: "gas", feats: ["awd", "third", "hybrid", "heated", "blind", "remote", "tow", "carplay", "acc"], popular: true, seats: 7 },
  { id: "kia-k5", make: "Kia", model: "K5", year: 2026, body: "sedan", size: "mid", msrp: 27000, trim: "LXS", fuel: "gas", feats: ["awd", "heated", "blind", "remote", "carplay", "acc"], popular: true, seats: 5 },
  { id: "kia-carnival", make: "Kia", model: "Carnival", year: 2026, body: "minivan", size: "large", msrp: 37000, trim: "LX", fuel: "gas", feats: ["third", "hybrid", "heated", "blind", "cam360", "remote", "carplay", "acc"], popular: true, seats: 8 },
  { id: "kia-ev9", make: "Kia", model: "EV9", year: 2026, body: "suv", size: "large", msrp: 55000, trim: "Light", fuel: "ev", feats: ["awd", "ev", "third", "heated", "blind", "cam360", "remote", "carplay", "acc"], popular: false, seats: 6 },
  { id: "kia-seltos", make: "Kia", model: "Seltos", year: 2026, body: "suv", size: "subcompact", msrp: 25000, trim: "LX", fuel: "gas", feats: ["awd", "heated", "blind", "remote", "carplay", "acc"], popular: true, seats: 5 },
  { id: "kia-niro", make: "Kia", model: "Niro", year: 2026, body: "hatch", size: "compact", msrp: 27000, trim: "LX", fuel: "hybrid", feats: ["hybrid", "heated", "blind", "remote", "carplay", "acc"], popular: false, seats: 5 }
];
function modelOf(id) { return CD.modelById(id) || FALLBACK.filter(function (m) { return m.id === id; })[0] || null; }
function modelsFor(r) {
  var own = CD.models.filter(function (m) { return (r.brands || []).indexOf(m.make) >= 0; });
  if (!own.length) own = FALLBACK.filter(function (m) { return (r.brands || []).indexOf(m.make) >= 0; });
  if (!own.length) own = CD.models.length ? CD.models.slice(0, 12) : FALLBACK;
  own = own.slice().sort(function (a, b) { return (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || a.msrp - b.msrp; });
  return own;
}
function allMakes() { var s = {}; CD.rooftops.forEach(function (r) { (r.brands || []).forEach(function (b) { s[b] = 1; }); }); return Object.keys(s).sort(); }
function nearZips(r, n) {
  var out = Object.keys(CD.zips).map(function (z) { var v = CD.zips[z]; return { zip: z, lat: v[0], lng: v[1], city: v[2], state: v[3], d: CD.dist({ lat: v[0], lng: v[1] }, r) }; });
  out.sort(function (a, b) { return a.d - b.d; }); return out.slice(0, n || 12);
}

/* the sample buyers every rooftop sees in its inbox (brand-aware, labeled sample) */
var STATUS = { "new": ["New", "teal"], replied: ["Replied", "info"], revision: ["Revision requested", "warn"], booked: ["Visit booked", "ok"], sold: ["Sold", "gold"] };
var ALIASES = ["quiet.heron", "blue.arbor", "north.lantern", "copper.finch", "still.harbor", "amber.ridge", "clear.meadow", "oak.signal"];
var NAMES = ["Maya R.", "Devin K.", "Priya S.", "Marcus T.", "Elena V.", "Sam O.", "Noor H.", "Chris B."];
var PERSONAS = [
  { st: "new", ago: 4 * 60e3, pay: "finance", limit: 560, down: 2500, tier: "good", trade: { has: true, year: 2017, make: "Honda", model: "Civic", miles: 71000, cond: "good", payoff: 0, photos: ["front", "rear", "interior", "odo"] }, prot: { gap: "yes", vsc: "no", maint: "no", tire: "no" }, lender: null, way: "price", feats: ["blind", "carplay"], mi: 2 },
  { st: "new", ago: 11 * 60e3, pay: "lease", limit: 450, das: 2500, tier: "excellent", trade: { has: false }, prot: { gap: "ask", vsc: "ask", maint: "ask", tire: "ask" }, lender: null, way: "drive", feats: ["heated", "cam360"], mi: 0 },
  { st: "replied", ago: 38 * 60e3, replyIn: 7 * 60e3, pay: "finance", limit: 640, down: 3000, tier: "excellent", trade: { has: true, year: 2019, make: "Toyota", model: "Camry", miles: 54000, cond: "excellent", payoff: 6200, photos: ["front", "rear", "interior", "odo"] }, prot: { gap: "yes", vsc: "yes", maint: "no", tire: "ask" }, lender: "mfc", way: "price", feats: ["awd", "blind"], mi: 1 },
  { st: "revision", ago: 2 * 3600e3, replyIn: 12 * 60e3, pay: "cash", limit: 41000, tier: "good", trade: { has: true, year: 2016, make: "Honda", model: "Odyssey", miles: 98000, cond: "fair", payoff: 0, photos: ["front", "rear", "odo"] }, prot: { gap: "no", vsc: "no", maint: "no", tire: "no" }, lender: null, way: "price", feats: ["third"], revision: "Thanks for the written offer. Can the processing fee come down? Another store put $699 in writing. If the out-the-door lands under $41,000 I will book Thursday.", mi: 3 },
  { st: "booked", ago: 26 * 3600e3, replyIn: 5 * 60e3, pay: "finance", limit: 720, down: 5000, tier: "good", trade: { has: true, year: 2020, make: "Subaru", model: "Outback", miles: 41000, cond: "good", payoff: 14500, photos: ["front", "rear", "interior", "odo"] }, prot: { gap: "yes", vsc: "ask", maint: "yes", tire: "no" }, lender: "tcu", way: "drive", feats: ["awd", "third", "heated"], slot: { day: "Thursday", time: "5:30 pm" }, mi: 4 },
  { st: "replied", ago: 29 * 3600e3, replyIn: 19 * 60e3, pay: "finance", limit: 390, down: 1000, tier: "fair", trade: { has: false }, prot: { gap: "yes", vsc: "no", maint: "no", tire: "no" }, lender: null, way: "price", feats: ["carplay"], mi: 5 },
  { st: "sold", ago: 3 * 86400e3, replyIn: 9 * 60e3, pay: "lease", limit: 520, das: 3000, tier: "excellent", trade: { has: true, year: 2018, make: "Kia", model: "Sorento", miles: 60000, cond: "good", payoff: 4100, photos: ["front", "rear", "interior", "odo"] }, prot: { gap: "no", vsc: "no", maint: "yes", tire: "no" }, lender: null, way: "drive", feats: ["heated", "blind"], survey: ["yes", "yes", "mostly"], mi: 6 },
  { st: "sold", ago: 6 * 86400e3, replyIn: 4 * 60e3, pay: "finance", limit: 610, down: 2000, tier: "good", trade: { has: true, year: 2015, make: "Ford", model: "Escape", miles: 112000, cond: "fair", payoff: 0, photos: ["front", "odo"] }, prot: { gap: "yes", vsc: "yes", maint: "no", tire: "yes" }, lender: "hsb", way: "price", feats: ["awd"], survey: ["yes", "yes", "yes"], mi: 7 }
];
function tradeEstimate(t) {
  if (!t || !t.has) return 0;
  var age = Math.max(0, 2026 - (+t.year || 2026)), v = 36000 * Math.pow(0.885, age) - Math.max(0, (+t.miles || 0) - 12000 * age) * 0.06;
  v *= { excellent: 1.06, good: 1, fair: 0.9, rebuilding: 0.8, "needs work": 0.8 }[t.cond] || 1;
  return Math.max(1500, Math.round(v / 100) * 100);
}
function sampleLeads() {
  var r = active(), ms = modelsFor(r), zips = nearZips(r, 12), now = Date.now();
  return PERSONAS.map(function (p, i) {
    var PERM = [1, 6, 3, 0, 5, 2, 7, 4], m = ms[ms.length >= 8 ? PERM[i] : i % ms.length], z = zips[(i * 3) % zips.length], id = "CD-" + (1038 - i);
    var st = S.sampleStatus[id] || p.st, offers = [];
    var at = now - p.ago;
    if (p.st !== "new" && p.replyIn) offers.push({ rooftop: r.id, at: at + p.replyIn, msg: "Thanks for the brief. Priced to your limit, in writing, with the trade from your photos.", q: { price: Math.round(m.msrp * 0.985), fee: CD.DOC_FEE[z.state] || 899, add: 0, allow: tradeEstimate(p.trade), payoff: p.trade.payoff || 0, apr: p.pay === "lease" ? 6.5 : Math.round(((CD.TIERS[p.tier].lo + CD.TIERS[p.tier].hi) / 2) * 100) / 100, prod: {} } });
    if (S.sampleOffers[id]) offers = offers.concat(S.sampleOffers[id]);
    var brief = { pay: p.pay, limit: p.limit, down: p.down || 0, das: p.das || 0, term: 72, lterm: 36, miles: 12000, body: m.body, size: m.size, makes: [m.make], feats: p.feats, zip: z.zip, state: z.state, city: z.city, tier: p.tier, lender: p.lender, trade: p.trade, prot: p.prot, name: NAMES[i] };
    return { id: id, sample: true, status: st, at: at, askedAt: at, brief: brief, pick: m.id, model: m, way: p.way, alias: ALIASES[i] + "@cleardrive.app", rooftops: [r.id], offers: offers, revision: st === "revision" ? { text: p.revision, at: at + 40 * 60e3 } : null, slot: p.slot || null, survey: p.survey || null, dist: CD.dist(z, r), chosen: st === "booked" || st === "sold" ? r.id : null };
  });
}
/* the live deal written by the buyer workspace in this browser */
function liveLead() {
  var d = CD.deal.get(); if (!d || !d.brief || !d.pick) return null;
  if (["asked", "replied", "booked", "sold"].indexOf(d.status) < 0) return null;
  var r = active(), m = modelOf(d.pick) || { id: d.pick, make: (d.brief.makes || [])[0] || "", model: d.pick, body: d.brief.body, msrp: 30000, trim: "" };
  var asked = d.rooftops || [], routedFrom = null;
  if (asked.indexOf(r.id) < 0) {
    asked.forEach(function (aid) { var a = CD.rooftopById(aid); if (a && m.make && (a.brands || []).indexOf(m.make) < 0) { var t = CD.nearest(a, m.make, 1)[0]; if (t && t.r.id === r.id) routedFrom = a; } });
    if (!routedFrom && m.make && !CD.rooftopsFor(m.make).length) { var z = CD.zip(d.brief.zip), n = CD.nearest(z || r, null, 1)[0]; if (n && n.r.id === r.id) routedFrom = CD.rooftopById(asked[0]) || { name: "the group" }; }
    if (!routedFrom) return null;
  }
  var offers = (d.offers || []).filter(function (o) { return o.rooftop === r.id; }), lastAt = offers.length ? offers[offers.length - 1].at : 0;
  var st = d.status === "booked" ? "booked" : d.status === "sold" ? "sold" : (d.revision && (d.revision.at || 0) > lastAt) ? "revision" : offers.length ? "replied" : "new";
  var z = CD.zip(d.brief.zip);
  return { id: d.id || "CD-live", live: true, status: st, at: d.askedAt || d.created || Date.now(), askedAt: d.askedAt || d.created || Date.now(), brief: d.brief, pick: d.pick, model: m, way: d.way || "drive", alias: d.alias || "private@cleardrive.app", rooftops: asked, offers: offers, allOffers: d.offers || [], revision: st === "revision" ? d.revision : null, slot: d.slot || null, survey: d.survey || null, dist: z ? CD.dist(z, r) : null, chosen: d.chosen || null, routedFrom: routedFrom, deal: d };
}
function leads() { var l = sampleLeads(), live = liveLead(); if (live) l.unshift(live); return l; }
function leadById(id) { return leads().filter(function (l) { return l.id === id; })[0] || null; }
function openLead() { var l = S.open ? leadById(S.open) : null; if (!l) { var all = leads(); l = all[0] || null; if (l) { S.open = l.id; save(); } } return l; }

/* the sample buyer the workspace also uses, for a desk demo with nothing typed */
function loadSampleDeal() {
  var now = Date.now();
  CD.deal.set({ id: CD.deal.newId(), created: now - 9 * 60e3, askedAt: now - 9 * 60e3, status: "asked", way: "price", pick: "kia-telluride", alias: "jordan.e@cleardrive.app",
    rooftops: ["kia-fairfax", "kia-catonsville"], offers: [], thread: [{ who: "sys", text: "Request sent to two Ourisman rooftops.", at: now - 9 * 60e3 }],
    brief: { pay: "finance", limit: 650, down: 3000, term: 72, lterm: 36, miles: 12000, das: 3000, body: "suv", size: "large", makes: ["Kia", "Toyota", "Honda"], feats: ["awd", "blind", "third"], zip: "22030", state: "VA", tier: "good", lender: "tcu",
      trade: { has: true, year: 2018, make: "Honda", model: "Accord", miles: 82000, cond: "good", payoff: 9000, photos: ["front", "rear", "interior", "odo"] }, prot: { gap: "yes", vsc: "ask", maint: "no", tire: "no" }, name: "Jordan Ellis" } });
  S.open = CD.deal.get().id; save();
}

/* quote drafts */
var SAMPLE_PROD = { gap: 795, vsc: 2150, maint: 695, tire: 595 };
function defaultQuote(l) {
  var b = l.brief, m = l.model, tier = CD.TIERS[b.tier] || CD.TIERS.good;
  var q = { price: Math.round(m.msrp * 0.985), fee: CD.DOC_FEE[b.state] || CD.DOC_FEE.VA, add: 0, allow: tradeEstimate(b.trade), payoff: b.trade && b.trade.has ? (b.trade.payoff || 0) : 0, apr: b.pay === "lease" ? 6.5 : Math.round(((tier.lo + tier.hi) / 2) * 100) / 100, prod: {}, msg: "Thanks for the brief. This is priced to your limit, in writing, with the trade valued from your photos. Nothing changes at the desk unless you ask for it.", cond: "Offer good for 7 days. Trade allowance assumes the car matches the photos and odometer reading. Figures exclude optional products you did not ask us to quote." };
  CD.PRODUCTS.forEach(function (p) { if (b.prot && b.prot[p[0]] === "yes") q.prod[p[0]] = SAMPLE_PROD[p[0]]; });
  return q;
}
function draftOf(l) { if (!S.drafts[l.id]) { S.drafts[l.id] = defaultQuote(l); save(); } return S.drafts[l.id]; }
function lenderOf(b) { if (!b.lender || b.pay !== "finance") return null; var l = CD.LENDERS.filter(function (x) { return x[0] === b.lender; })[0]; if (!l) return null; var t = CD.TIERS[b.tier] || CD.TIERS.good; var rate = Math.round((t.lo + l[2]) * 100) / 100; return { id: l[0], name: l[1], rate: rate, rateText: rate.toFixed(2) + "%", note: l[3] }; }

/* ADF/XML, the lead format every dealer CRM imports */
function adf(l) {
  var b = l.brief, m = l.model, r = active(), t = b.trade || {}, first = (b.name || "Buyer").split(" ")[0];
  var prot = CD.PRODUCTS.map(function (p) { return p[1] + ": " + (CD.PROTWORD[(b.prot || {})[p[0]]] || "Explain it in person"); }).join("; ");
  var ln = lenderOf(b);
  var comments = ["Pay type: " + b.pay + ", limit " + (b.pay === "cash" ? CD.usd(b.limit) + " out the door" : CD.usd(b.limit) + " a month"), b.pay === "finance" ? "Cash down: " + CD.usd(b.down) + ", " + (b.term || 72) + " months" : b.pay === "lease" ? "Due at signing: " + CD.usd(b.das) + ", " + (b.lterm || 36) + " months, " + CD.n(b.miles || 12000) + " mi/yr" : "", "Credit (self-stated): " + ((CD.TIERS[b.tier] || {}).n || "Good"), ln ? "Lender rate to beat: " + ln.name + " " + ln.rateText + " APR" : "", "Required: " + (b.feats || []).map(CD.featName).join(", "), "Protection: " + prot, t.has ? "Trade photos attached: " + (t.photos || []).length + " (" + (t.photos || []).join(", ") + ")" : "No trade", "Requested: " + (l.way === "drive" ? "test drive" : "written offer"), "Source: ClearDrive " + l.id].filter(Boolean).join(" | ");
  var x = ['<?xml version="1.0" encoding="UTF-8"?>', '<?adf version="1.0"?>', "<adf>", " <prospect status=\"new\">", "  <id sequence=\"1\" source=\"ClearDrive\">" + l.id + "</id>", "  <requestdate>" + new Date(l.at).toISOString() + "</requestdate>",
    "  <vehicle interest=\"buy\" status=\"new\">", "   <year>" + (m.year || 2026) + "</year>", "   <make>" + m.make + "</make>", "   <model>" + m.model + "</model>", "   <trim>" + (m.trim || "") + "</trim>", "   <bodystyle>" + CD.bodyName(m.body) + "</bodystyle>", "   <price type=\"quote\" currency=\"USD\">" + (b.pay === "cash" ? b.limit : "") + "</price>", "  </vehicle>"];
  if (t.has) x.push("  <vehicle interest=\"trade-in\" status=\"used\">", "   <year>" + t.year + "</year>", "   <make>" + t.make + "</make>", "   <model>" + t.model + "</model>", "   <odometer units=\"mi\">" + t.miles + "</odometer>", "   <condition>" + t.cond + "</condition>", "   <finance><balance type=\"residual\">" + (t.payoff || 0) + "</balance></finance>", "  </vehicle>");
  x.push("  <customer>", "   <contact>", "    <name part=\"first\">" + first + "</name>", "    <email>" + l.alias + "</email>", "    <address><postalcode>" + (b.zip || "") + "</postalcode></address>", "   </contact>", "   <comments>" + comments + "</comments>", "  </customer>", "  <vendor>", "   <vendorname>" + r.name + "</vendorname>", "   <contact><name part=\"full\">" + S.name + "</name></contact>", "  </vendor>", "  <provider>", "   <name part=\"full\">ClearDrive</name>", "   <service>Buyer request</service>", "   <url>https://cleardrive.app</url>", "  </provider>", " </prospect>", "</adf>");
  return x.join("\n");
}

/* ---- site/js/dealer/20-charts.js ---- */
/* inline SVG charts: one axis each, thin marks, faint grid, hover tooltips, text in theme tokens */
function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10; return n * p; }
function rbar(x, y, w, hgt, r) { if (hgt <= 0) return ""; r = Math.min(r, w / 2, hgt); return "M" + x + " " + (y + hgt) + " V" + (y + r) + " a" + r + " " + r + " 0 0 1 " + r + " -" + r + " h" + (w - 2 * r) + " a" + r + " " + r + " 0 0 1 " + r + " " + r + " V" + (y + hgt) + " Z"; }

/* line with area: opt {labels:[], data:[], name, fmt, w, h, unit} */
function lineChart(el, opt) {
  var W = opt.w || 640, H = opt.h || 220, L = 44, R = 18, T = 16, B = 30, n = opt.data.length, ymax = niceMax(Math.max.apply(null, opt.data) * 1.15);
  var xs = function (i) { return L + (W - L - R) * (n === 1 ? 0.5 : i / (n - 1)); }, ys = function (v) { return T + (H - T - B) * (1 - v / ymax); };
  var fmt = opt.fmt || function (v) { return CD.n(v); };
  var grid = "", ticks = 4; for (var g = 0; g <= ticks; g++) { var v = ymax * g / ticks, y = ys(v); grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="lbl" x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(v) + "</text>"; }
  var path = "", area = "M" + xs(0) + " " + ys(0);
  opt.data.forEach(function (v, i) { path += (i ? " L" : "M") + xs(i).toFixed(1) + " " + ys(v).toFixed(1); area += " L" + xs(i).toFixed(1) + " " + ys(v).toFixed(1); });
  area += " L" + xs(n - 1) + " " + ys(0) + " Z";
  var xl = ""; opt.labels.forEach(function (lb, i) { if (n > 8 && i % 2) return; xl += '<text class="axis-t" x="' + xs(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + CD.esc(lb) + "</text>"; });
  var last = n - 1;
  el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + CD.esc(opt.name) + '"><g class="grid">' + grid + '</g><g class="axis">' + xl + '</g><path class="area s1" d="' + area + '"/><path class="line l1" d="' + path + '"/>' +
    '<circle class="pt s1" cx="' + xs(last) + '" cy="' + ys(opt.data[last]) + '" r="4"/><text class="lbl strong" x="' + (xs(last) - 6) + '" y="' + (ys(opt.data[last]) - 10) + '" text-anchor="end">' + fmt(opt.data[last]) + (opt.unit ? " " + opt.unit : "") + "</text>" +
    '<line class="cross" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="rgba(190,215,235,.35)" stroke-dasharray="3 3" opacity="0"/><circle class="hpt" r="5" fill="var(--s1)" stroke="var(--panel)" stroke-width="2" opacity="0"/>' +
    '<rect class="hit" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent"/></svg><div class="tip"></div>';
  var svg = el.querySelector("svg"), hit = el.querySelector(".hit"), cross = el.querySelector(".cross"), hpt = el.querySelector(".hpt"), tip = el.querySelector(".tip");
  function show(i) { var x = xs(i), y = ys(opt.data[i]); cross.setAttribute("x1", x); cross.setAttribute("x2", x); cross.setAttribute("opacity", 1); hpt.setAttribute("cx", x); hpt.setAttribute("cy", y); hpt.setAttribute("opacity", 1); var bb = svg.getBoundingClientRect(); tip.innerHTML = "<small>" + CD.esc(opt.labels[i]) + "</small>" + fmt(opt.data[i]) + (opt.unit ? " " + opt.unit : ""); tip.style.left = (x / W * bb.width) + "px"; tip.style.top = (y / H * bb.height) + "px"; tip.classList.add("show"); }
  function hide() { cross.setAttribute("opacity", 0); hpt.setAttribute("opacity", 0); tip.classList.remove("show"); }
  hit.addEventListener("mousemove", function (e) { var bb = svg.getBoundingClientRect(), px = (e.clientX - bb.left) / bb.width * W, i = Math.round((px - L) / (W - L - R) * (n - 1)); show(Math.max(0, Math.min(n - 1, i))); });
  hit.addEventListener("mouseleave", hide);
  hit.addEventListener("touchstart", function (e) { var t = e.touches[0], bb = svg.getBoundingClientRect(), px = (t.clientX - bb.left) / bb.width * W, i = Math.round((px - L) / (W - L - R) * (n - 1)); show(Math.max(0, Math.min(n - 1, i))); }, { passive: true });
}

/* vertical bars with direct labels: opt {cats:[], data:[], cls:[] (per bar) | "s1", fmt, w, h, name} */
function barChart(el, opt) {
  var W = opt.w || 640, H = opt.h || 220, L = 10, R = 10, T = 26, B = 30, n = opt.data.length, ymax = niceMax(Math.max.apply(null, opt.data)), fmt = opt.fmt || function (v) { return CD.n(v); };
  var slot = (W - L - R) / n, bw = Math.min(slot - 2, 64), bars = "", labels = "";
  opt.data.forEach(function (v, i) { var x = L + slot * i + (slot - bw) / 2, hgt = (H - T - B) * v / ymax, y = H - B - hgt, cls = typeof opt.cls === "string" ? opt.cls : (opt.cls || [])[i] || "s1"; bars += '<path class="' + cls + '" d="' + rbar(x, y, bw, hgt, 4) + '"/>'; labels += '<text class="lbl strong" x="' + (x + bw / 2) + '" y="' + (y - 7) + '" text-anchor="middle">' + fmt(v) + '</text><text class="axis-t" x="' + (x + bw / 2) + '" y="' + (H - 9) + '" text-anchor="middle">' + CD.esc(opt.cats[i]) + "</text>"; });
  el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + CD.esc(opt.name) + '"><line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="var(--line2)"/>' + bars + '<g class="axis">' + labels + "</g></svg>";
  CD.qsa("path", el).forEach(function (p, i) { p.addEventListener("mouseenter", function () { var tip = el.querySelector(".tip"); if (!tip) { tip = document.createElement("div"); tip.className = "tip"; el.appendChild(tip); } var bb = el.querySelector("svg").getBoundingClientRect(), b = p.getBBox(); tip.innerHTML = "<small>" + CD.esc(opt.cats[i]) + "</small>" + fmt(opt.data[i]); tip.style.left = ((b.x + b.width / 2) / W * bb.width) + "px"; tip.style.top = (b.y / H * bb.height) + "px"; tip.classList.add("show"); }); p.addEventListener("mouseleave", function () { var tip = el.querySelector(".tip"); if (tip) tip.classList.remove("show"); }); });
}

/* horizontal bars via the shared .hbars markup */
function hbars(rows, cls, fmt) { var max = Math.max.apply(null, rows.map(function (r) { return r[1]; })); return '<div class="hbars">' + rows.map(function (r) { return '<div class="hbar"><span>' + CD.esc(r[0]) + '</span><div class="track ' + (r[2] || cls || "") + '"><b style="--w:' + (r[1] / max * 100).toFixed(1) + '%"></b></div><span class="n">' + (fmt ? fmt(r[1]) : r[1]) + "</span></div>"; }).join("") + "</div>"; }

/* deterministic performance series for a rooftop */
function weekly(r) { var m = metrics(r), out = [], labels = [], base = m.req / 4.3; for (var i = 0; i < 12; i++) { var v = base * (0.72 + 0.4 * (i / 11)) * (0.86 + 0.28 * h(r.id + "|w" + i)); out.push(Math.max(2, Math.round(v))); var d = new Date(); d.setDate(d.getDate() - 7 * (11 - i)); labels.push(CD.fmtDate(d)); } return { data: out, labels: labels }; }
function responseDist(r) { var m = metrics(r), fast = m.answer <= 10, dist = fast ? [38, 31, 14, 9, 5, 3] : m.answer <= 20 ? [18, 30, 24, 14, 9, 5] : [9, 18, 26, 22, 15, 10]; var tot = dist.reduce(function (a, b) { return a + b; }, 0), req = weekly(r).data.reduce(function (a, b) { return a + b; }, 0); return { cats: ["<5 min", "5–15", "15–30", "30–60", "1–4 h", "4 h+"], data: dist.map(function (p) { return Math.round(req * p / tot); }) }; }
function calcOut(c) { var sold = c.req * (c.show / 100) * (c.close / 100); var cps = sold > 0 ? c.fee / sold : null; var gross = sold * c.gross; return { sold: sold, cps: cps, gross: gross, share: gross > 0 ? c.fee / gross * 100 : null, day: gross > 0 ? Math.ceil(c.fee / gross * 30) : null }; }

/* ---- site/js/dealer/30-views.js ---- */
/* dealer desk views: each returns HTML for #view; mount() wires charts after render */
function vh(h, p, right) { return '<div class="view-h"><div><h2>' + h + "</h2>" + (p ? "<p>" + p + "</p>" : "") + "</div>" + (right || "") + "</div>"; }
function badge(st) { var s = STATUS[st] || STATUS["new"]; return '<span class="badge ' + s[1] + '">' + s[0] + "</span>"; }
function payLine(b) { return b.pay === "cash" ? "Cash · " + CD.usd(b.limit) + " out the door" : b.pay === "lease" ? "Lease · " + CD.usd(b.limit) + "/mo · " + CD.usd(b.das) + " due at signing" : "Finance · " + CD.usd(b.limit) + "/mo · " + CD.usd(b.down) + " down · " + (b.term || 72) + " mo"; }
function tradeLine(b) { var t = b.trade; if (!t || !t.has) return "No trade"; return t.year + " " + t.make + " " + t.model + " · " + CD.n(t.miles) + " mi · " + (t.photos || []).length + " photos"; }
function carName(m) { return (m.year || 2026) + " " + m.make + " " + m.model + (m.trim ? " " + m.trim : ""); }
function firstName(b) { return (b.name || "Buyer").split(" ")[0]; }
function srcTag(l) { return l.live ? '<span class="badge gold plain">Live · this browser</span>' : '<span class="sample">Sample</span>'; }
function brandBox(r) { return '<span class="brand">' + CD.esc(CD.brandAbbr((r.brands || [])[0])) + "</span>"; }

/* ---------- inbox ---------- */
function inboxView() {
  var all = leads(), f = S.filter || "all", list = f === "all" ? all : all.filter(function (l) { return l.status === f; });
  var counts = {}; all.forEach(function (l) { counts[l.status] = (counts[l.status] || 0) + 1; });
  var chips = [["all", "All"]].concat(Object.keys(STATUS).map(function (k) { return [k, STATUS[k][0]]; })).map(function (c) { var n = c[0] === "all" ? all.length : counts[c[0]] || 0; return '<button class="chip sm' + (f === c[0] ? " on" : "") + '" data-act="filter" data-v="' + c[0] + '">' + c[1] + " · " + n + "</button>"; }).join("");
  var live = liveLead();
  var note = live ? "" : '<div class="callout gold mb16">' + CD.icon("spark") + "<div><b>No live request in this browser yet.</b> Start a brief in the <a href=\"app.html\">buyer workspace</a> and it lands here, or load the sample buyer the workspace uses. <button class=\"link\" data-act=\"loadsample\">Load sample lead</button></div></div>";
  var rows = list.map(function (l) {
    var b = l.brief, m = l.model;
    return '<button class="lead-row' + (S.open === l.id ? " on" : "") + (l.live ? " live" : "") + '" data-act="open" data-id="' + CD.esc(l.id) + '">' + CD.car(m) + '<span class="main"><b>' + CD.esc(carName(m)) + " · " + CD.esc(firstName(b)) + "</b><small>" + CD.esc(payLine(b)) + "</small><small>" + CD.esc(tradeLine(b)) + (l.dist != null ? " · " + CD.miles(l.dist) + " away" : "") + (l.routedFrom ? " · routed from " + CD.esc(l.routedFrom.name) : "") + '</small></span><span class="side">' + badge(l.status) + '<span class="t">' + CD.esc(l.id) + " · " + CD.ago(Date.now() - l.at) + " ago</span>" + srcTag(l) + "</span></button>";
  }).join("");
  return vh("Inbox", "Every request names the exact car, the payment and the trade. Nothing here was bought; each buyer chose this rooftop.", '<div class="row" style="--gap:8px"><span class="badge teal">' + (counts["new"] || 0) + " new</span>" + (counts.revision ? '<span class="badge warn">' + counts.revision + " revision" + (counts.revision > 1 ? "s" : "") + "</span>" : "") + "</div>") + note + '<div class="chips mb16">' + chips + '</div><div class="lead-list">' + (rows || '<p class="note">No requests with this status.</p>') + "</div>" +
    '<p class="note mt24">Sample buyers are generated for ' + CD.esc(active().name) + " from the models it sells and nearby ZIP codes. They are illustrations, not customers.</p>";
}

/* ---------- lead ---------- */
function leadView() {
  var l = openLead(); if (!l) return vh("No request open") + '<p class="note">Open a request from the inbox.</p>';
  var b = l.brief, m = l.model, r = active(), t = b.trade || {}, ln = lenderOf(b);
  var feats = (b.feats || []).map(function (f) { return '<span class="chip sm on">' + CD.esc(CD.featName(f)) + "</span>"; }).join("") || '<span class="small">No required features</span>';
  var shots = [["front", "Front corner"], ["rear", "Rear corner"], ["interior", "Interior"], ["odo", "Odometer"]].map(function (s) { var has = (t.photos || []).indexOf(s[0]) >= 0; return '<div class="tile' + (has ? " done" : "") + '"><div><b>' + s[1] + "</b>" + (has ? "Provided" : "Not provided") + "</div></div>"; }).join("");
  var prot = CD.PRODUCTS.filter(function (p) { return !(p[0] === "gap" && b.pay === "cash"); }).map(function (p) { var v = (b.prot || {})[p[0]] || "ask"; return "<div><span>" + CD.esc(p[1]) + '</span><span class="' + (v === "yes" ? "ok" : v === "no" ? "bad" : "warn") + '">' + CD.esc(CD.PROTWORD[v]) + "</span></div>"; }).join("");
  var tl = [];
  tl.push({ s: "done", t: "Request sent", w: CD.fmtDate(l.at) + " · " + CD.fmtTime(l.at), b: "To " + l.rooftops.map(function (id) { var x = CD.rooftopById(id); return x ? x.short || x.name : id; }).join(", ") + (l.routedFrom ? ". Routed to this rooftop because " + CD.esc(l.routedFrom.name) + " does not sell " + CD.esc(m.make) + "." : ".") });
  if (l.offers.length) l.offers.forEach(function (o, i) { tl.push({ s: "done", t: i ? "Revised offer sent" : "Written offer sent", w: CD.fmtDate(o.at) + " · " + CD.fmtTime(o.at) + " · answered in " + CD.clock(o.at - l.askedAt), b: CD.usd(o.q.price) + " selling price" + (o.q.apr != null && b.pay !== "cash" ? " · " + o.q.apr + "% APR" : "") }); });
  else tl.push({ s: "now", t: "Waiting for a written offer", w: "Clock running " + CD.clock(Date.now() - l.askedAt), b: "The buyer sees the response time of every rooftop that answers." });
  if (l.revision) tl.push({ s: "now", t: "Revision requested", w: CD.fmtDate(l.revision.at || l.at), b: CD.esc(l.revision.text || "") });
  if (l.status === "booked") tl.push({ s: "now", t: "Visit booked", w: l.slot ? l.slot.day + " · " + l.slot.time : "", b: "The buyer's saved terms are frozen. A later revision does not replace them." });
  if (l.status === "sold") tl.push({ s: "done", t: "Sold · survey received", w: "", b: l.survey ? "Price honoured: " + l.survey[0] + " · paperwork matched: " + l.survey[1] + " · time respected: " + l.survey[2] : "Three questions, answered after the sale." });
  var timeline = '<ul class="tl">' + tl.map(function (x) { return '<li class="tl-item ' + x.s + '"><span class="tl-dot"></span><div class="tl-body">' + (x.w ? '<div class="when">' + x.w + "</div>" : "") + "<h3>" + x.t + "</h3><p>" + x.b + "</p></div></li>"; }).join("") + "</ul>";
  var action = l.status === "new" || l.status === "revision" ? '<a class="btn pri block" href="#offer">' + (l.status === "revision" ? "Write the revised offer" : "Write the offer") + "</a>" : '<a class="btn block" href="#offer">Review the offer</a>';
  return vh(CD.esc(l.id) + " · " + CD.esc(firstName(b)), "The request exactly as the buyer composed it. The desk sees what it needs to price the car and nothing it does not.", '<div class="row" style="--gap:8px">' + badge(l.status) + srcTag(l) + "</div>") +
    '<div class="lead-grid"><div class="stack" style="--gap:14px">' +
    '<div class="card lift"><div class="lead-hero"><div><p class="label">' + (l.way === "drive" ? "Wants a test drive" : "Wants a written offer") + '</p><h3 class="mt8">' + CD.esc(carName(m)) + '</h3><p class="soft mt8">' + CD.esc(payLine(b)) + '</p><p class="small mt8">' + CD.esc(CD.bodyName(m.body)) + (m.size ? " · " + CD.esc(CD.sizeName(m.size)) : "") + " · from " + CD.usd(m.msrp) + " MSRP, approx." + (m.fuel ? " · " + CD.esc(CD.FUELS[m.fuel] || m.fuel) : "") + "</p></div>" + CD.car(m) + "</div></div>" +
    '<div class="card"><p class="label mb16">The brief</p><dl class="kv"><div><dt>How they will pay</dt><dd>' + CD.esc(CD.cap(b.pay)) + "</dd></div><div><dt>Limit</dt><dd>" + CD.usd(b.limit) + (b.pay === "cash" ? " out the door" : " a month") + "</dd></div>" + (b.pay === "finance" ? "<div><dt>Cash down · term</dt><dd>" + CD.usd(b.down) + " · " + (b.term || 72) + " months</dd></div>" : b.pay === "lease" ? "<div><dt>Due at signing · term · miles</dt><dd>" + CD.usd(b.das) + " · " + (b.lterm || 36) + " mo · " + CD.n(b.miles || 12000) + "/yr</dd></div>" : "") + "<div><dt>Credit, self-stated</dt><dd>" + CD.esc((CD.TIERS[b.tier] || CD.TIERS.good).n) + "</dd></div><div><dt>Preferred makes</dt><dd>" + CD.esc((b.makes || []).join(", ") || "Open") + "</dd></div><div><dt>Buyer location</dt><dd>" + CD.esc((b.city ? b.city + " " : "") + (b.zip || "")) + (l.dist != null ? " · " + CD.miles(l.dist) : "") + '</dd></div></dl><p class="label mt16 mb8">Required features</p><div class="chips">' + feats + "</div></div>" +
    '<div class="card"><div class="head"><p class="label">The trade</p>' + (t.has ? '<span class="badge info">Payoff ' + CD.usd(t.payoff || 0) + "</span>" : "") + "</div>" + (t.has ? "<h3>" + CD.esc(t.year + " " + t.make + " " + t.model) + '</h3><p class="soft mt8">' + CD.n(t.miles) + " miles · " + CD.esc(CD.cap(t.cond)) + ' condition, self-stated</p><div class="photo-tiles mt16">' + shots + '</div><p class="note mt8">Photo and odometer flags only; the files stay in the buyer\'s workspace until the visit is booked.</p>' : '<p class="soft">No trade. The buyer is not bringing a car.</p>') + "</div>" +
    '<div class="card"><p class="label mb8">Protection products</p><p class="small mb16">The buyer decided which products may be quoted. A declined product cannot carry a price on any offer from this desk.</p><div class="prot-list">' + prot + "</div></div>" +
    "</div><div class=\"stack\" style=\"--gap:14px\">" +
    '<div class="card teal"><p class="label mb16">Status</p>' + timeline + action + "</div>" +
    (ln ? '<div class="card"><p class="label mb8">Rate to beat</p><div class="big">' + ln.rateText + '<small class="small" style="font-size:14px"> APR</small></div><p class="soft mt8">' + CD.esc(ln.name) + ". " + CD.esc(ln.note) + '.</p><p class="note mt8">The buyer chose a lender; your APR is compared against it on the offer.</p></div>' : "") +
    '<div class="card"><p class="label mb8">Private address</p><div class="alias">' + CD.esc(l.alias.split("@")[0]) + '<span class="dom">@' + CD.esc(l.alias.split("@")[1] || "cleardrive.app") + '</span></div><p class="note mt8">Every message goes through this address. The buyer can close it at any time.</p><p class="label mt16 mb8">What the desk never sees</p><div class="never"><span>Phone number</span><span>Personal email</span><span>Home address</span><span>Credit file or application</span><span>Other dealers\' offers</span></div></div>' +
    '<div class="card"><div class="head"><p class="label">CRM delivery · ADF/XML</p><button class="btn sm" data-act="copyadf">' + CD.icon("copy") + 'Copy</button></div><dl class="kv mb16"><div><dt>Delivery</dt><dd class="ok">Queued · sample</dd></div><div><dt>Format</dt><dd>ADF 1.0</dd></div><div><dt>Attachments</dt><dd>' + (t.has ? (t.photos || []).length + " trade photos" : "None") + '</dd></div></dl><pre class="adf" id="adf">' + CD.esc(adf(l)) + "</pre></div>" +
    "</div></div>";
}

/* ---------- offer builder ---------- */
function offerSummary(l) {
  var b = l.brief, q = draftOf(l), o = CD.priceQuote(b, q), tx = CD.TAX[b.state] || CD.TAX.VA, ln = lenderOf(b), rows = [];
  rows.push(["Selling price", CD.usd(q.price)], ["Processing fee", CD.usd(q.fee)]);
  if (q.add) rows.push(["Add-ons", CD.usd(q.add)]);
  CD.PRODUCTS.forEach(function (p) { if (o.prod[p[0]] != null) rows.push([p[1] + ", as asked", CD.usd(o.prod[p[0]])]); });
  rows.push([tx.name, CD.usd(o.tax)], ["Title and registration", CD.usd(o.reg)]);
  var html = '<dl class="kv">' + rows.map(function (r) { return "<div><dt>" + CD.esc(r[0]) + "</dt><dd>" + r[1] + "</dd></div>"; }).join("") + '<div class="total"><dt>Out the door</dt><dd>' + CD.usd(o.otd) + "</dd></div>";
  if (b.trade && b.trade.has) html += "<div><dt>Trade allowance</dt><dd>−" + CD.usd(o.allow).replace("$", "$") + "</dd></div><div><dt>Loan payoff</dt><dd>" + CD.usd(o.payoff) + "</dd></div>";
  if (b.pay === "finance") html += "<div><dt>Cash down</dt><dd>−" + CD.usd(b.down || 0) + '</dd></div><div class="total"><dt>Amount financed</dt><dd>' + CD.usd(o.fin) + "</dd></div><div><dt>" + (b.term || 72) + " months at " + q.apr + "% APR</dt><dd><b>" + CD.usd(o.mo) + "</b> a month</dd></div>";
  else if (b.pay === "lease") html += "<div><dt>Due at signing</dt><dd>" + CD.usd(b.das || 0) + '</dd></div><div class="total"><dt>' + (b.lterm || 36) + " months · " + CD.n(b.miles || 12000) + " mi/yr</dt><dd><b>" + CD.usd(o.mo) + "</b> a month</dd></div>";
  else html += '<div class="total"><dt>Buyer pays</dt><dd>' + CD.usd(o.due) + "</dd></div>";
  html += "</dl>";
  var cap = b.pay === "cash" ? "cap of " + CD.usd(b.limit) + " out the door" : "cap of " + CD.usd(b.limit) + " a month";
  html += '<div class="verdict ' + (o.under ? "ok" : "bad") + ' mt16"><span class="label">Against the buyer\'s ' + cap + "</span><b>" + (o.under ? "Under by " + CD.usd(Math.abs(o.gap)) : "Over by " + CD.usd(Math.abs(o.gap))) + "</b><span>" + (o.under ? "The buyer sees this offer inside their limit." : "The buyer sees this offer above their limit, ranked by terms like every other.") + "</span></div>";
  if (ln && b.pay === "finance") { var mine = CD.pmt(o.fin, ln.rate, b.term || 72), diff = mine - o.mo; html += '<div class="inset mt16"><p class="label mb8">Rate to beat</p><dl class="kv"><div><dt>' + CD.esc(ln.name) + " · " + ln.rateText + "</dt><dd>" + CD.usd(mine) + " a month</dd></div><div><dt>Your APR · " + (+q.apr).toFixed(2) + "%</dt><dd>" + CD.usd(o.mo) + ' a month</dd></div><div class="' + (diff >= 0 ? "ok" : "bad") + '"><dt>' + (diff >= 0 ? "You beat it by" : "The lender beats you by") + "</dt><dd>" + CD.usd(Math.abs(diff)) + " a month</dd></div></dl></div>"; }
  var frozen = l.status === "booked" || l.status === "sold";
  html += '<div class="mt16 stack" style="--gap:8px"><button class="btn pri block" data-act="send"' + (l.status === "sold" ? " disabled" : "") + ">" + (l.status === "revision" ? "Send revised offer" : l.offers.length ? "Send updated offer" : "Send written offer") + '</button><p class="note">' + (frozen ? "The buyer has booked on saved terms. A new offer is delivered as a separate record and never replaces what they saved." : "Delivered in writing to the buyer\'s private address. The same figures appear on both screens.") + "</p></div>";
  return html;
}
function offerView() {
  var l = openLead(); if (!l) return vh("No request open") + '<p class="note">Open a request from the inbox.</p>';
  var b = l.brief, q = draftOf(l), tx = CD.TAX[b.state] || CD.TAX.VA;
  var money = function (k, label, help, ro) { return '<div class="field"><label for="q-' + k + '">' + label + '</label><div class="money-wrap"><input class="input money" id="q-' + k + '" type="number" min="0" step="1" data-q="' + k + '" value="' + (q[k] || 0) + '"' + (ro ? " readonly disabled" : "") + "></div>" + (help ? '<span class="help">' + help + "</span>" : "") + "</div>"; };
  var prods = CD.PRODUCTS.filter(function (p) { return !(p[0] === "gap" && b.pay === "cash"); }).map(function (p) {
    var v = (b.prot || {})[p[0]] || "ask", yes = v === "yes";
    return '<div class="prod-row"><div><b>' + CD.esc(p[1]) + "</b><small>" + CD.esc(p[2]) + "</small></div>" + (yes ? '<div class="money-wrap"><input class="input money sm" type="number" min="0" step="1" data-prod="' + p[0] + '" value="' + (q.prod[p[0]] || 0) + '" aria-label="' + CD.esc(p[1]) + ' price"></div>' : '<div class="off">' + (v === "no" ? "Buyer said no thanks. No price can be quoted." : "Buyer wants it explained in person. No price can be quoted.") + "</div>") + "</div>";
  }).join("");
  var ask = l.revision ? '<div class="ask-box mb16"><small>The buyer asked</small>' + CD.esc(l.revision.text || "") + "</div>" : "";
  var frozen = l.status === "booked" || l.status === "sold" ? '<div class="callout warn mb16">' + CD.icon("lock") + "<div><b>Saved terms are frozen.</b> This buyer booked on the offer they saved. You can still send an updated offer; it is shown beside the saved one, never in place of it.</div></div>" : "";
  return vh("Written offer · " + CD.esc(l.id), "Price the exact car to the buyer's limit. One function prices the offer for both screens, so the buyer sees these figures, not a version of them.", '<div class="row" style="--gap:8px">' + badge(l.status) + srcTag(l) + "</div>") + ask + frozen +
    '<div class="offer-grid"><div class="stack" style="--gap:14px">' +
    '<div class="card"><div class="head"><div><p class="label">The car</p><h3 class="mt8">' + CD.esc(carName(l.model)) + '</h3></div><span class="badge ok">On the lot · sample</span></div><div class="fields two">' + money("price", "Selling price", "Starts at 1.5% under the approximate MSRP of " + CD.usd(l.model.msrp) + ". Enter your number.") + money("fee", "Processing fee", b.state === "MD" ? "Maryland caps the dealer processing charge at $500." : b.state === "VA" ? "Virginia does not cap processing fees. Buyers are told they are negotiable." : "Enter the fee the contract will show.") + money("add", "Add-ons", "Accessories or dealer-installed items. The buyer sees each one listed.") + "</div></div>" +
    (b.trade && b.trade.has ? '<div class="card"><div class="head"><div><p class="label">The trade</p><h3 class="mt8">' + CD.esc(b.trade.year + " " + b.trade.make + " " + b.trade.model) + '</h3></div><span class="pill">' + CD.n(b.trade.miles) + " mi · " + CD.esc(b.trade.cond) + '</span></div><div class="fields two">' + money("allow", "Trade allowance", "Starting point from the photos and odometer. Allowance is in the written offer, so it holds at the desk.") + money("payoff", "Loan payoff", "Entered by the buyer. Carried into the amount financed.", true) + "</div></div>" : "") +
    (b.pay !== "cash" ? '<div class="card"><p class="label mb16">' + (b.pay === "lease" ? "Lease terms" : "Finance terms") + '</p><div class="fields two"><div class="field"><label for="q-apr">' + (b.pay === "lease" ? "Lease rate, as APR" : "APR") + '</label><input class="input" id="q-apr" type="number" min="0" max="30" step="0.01" data-q="apr" value="' + q.apr + '"><span class="help">' + (b.pay === "lease" ? "Money factor × 2400. The buyer sees the money factor too." : "Buyer\'s self-stated credit: " + CD.esc((CD.TIERS[b.tier] || CD.TIERS.good).n) + ". Zero APR is handled.") + '</span></div><div class="field"><label>Term</label><input class="input" value="' + (b.pay === "lease" ? (b.lterm || 36) + " months · " + CD.n(b.miles || 12000) + " mi/yr" : (b.term || 72) + " months") + '" readonly disabled><span class="help">Set by the buyer in the brief.</span></div></div></div>' : "") +
    '<div class="card"><p class="label mb8">Protection products</p><p class="small mb8">Only products the buyer answered "yes, quote it" accept a price. The guard runs on every quote, whatever is typed.</p>' + prods + "</div>" +
    '<div class="card"><p class="label mb16">Message and conditions</p><div class="stack" style="--gap:12px"><div class="field"><label for="q-msg">Reply to the buyer</label><textarea class="input" id="q-msg" data-q="msg">' + CD.esc(q.msg) + '</textarea></div><div class="field"><label for="q-cond">Conditions</label><textarea class="input" id="q-cond" data-q="cond">' + CD.esc(q.cond) + '</textarea><span class="help">Plain words. Conditions appear on the buyer\'s offer card and in the paperwork check.</span></div></div></div>' +
    '</div><div class="card lift sum" id="sum">' + offerSummary(l) + "</div></div>" +
    '<p class="note mt24">Taxes use ' + CD.esc(tx.name) + " on the taxable amount; title and registration are estimates. Rates, valuations and inventory are samples, not Ourisman figures.</p>";
}

/* ---------- group ---------- */
function groupView() {
  var r = active(), rows = CD.rooftops.map(function (x) { var m = metrics(x); return { r: x, m: m }; });
  var k = S.sort.k, d = S.sort.d;
  rows.sort(function (a, b) { var va = k === "name" ? a.r.name : k === "city" ? a.r.city : k === "grade" ? a.m.avg : a.m[k], vb = k === "name" ? b.r.name : k === "city" ? b.r.city : k === "grade" ? b.m.avg : b.m[k]; return (typeof va === "string" ? va.localeCompare(vb) : va - vb) * d; });
  var th = function (key, label, num) { return '<th' + (num ? ' class="n' + (k === key ? " on" : "") + '"' : (k === key ? ' class="on"' : "")) + ' data-sort="' + key + '">' + label + '<span class="arr">' + (d > 0 ? "↑" : "↓") + "</span></th>"; };
  var table = '<div class="tablewrap"><table class="t"><thead><tr>' + th("name", "Rooftop") + th("city", "City") + "<th>Brands</th>" + th("answer", "Answer, median", 1) + th("show", "Show rate", 1) + th("drift", "Drift", 1) + th("attach", "Attach", 1) + th("grade", "Grade", 1) + "</tr></thead><tbody>" +
    rows.map(function (x) { return '<tr class="hover' + (x.r.id === r.id ? " here" : "") + '" data-act="switch" data-id="' + CD.esc(x.r.id) + '"><td>' + CD.esc(x.r.name) + (x.r.id === r.id ? ' <span class="badge teal plain">here</span>' : "") + "</td><td>" + CD.esc(x.r.city + ", " + x.r.state) + "</td><td>" + CD.esc((x.r.brands || []).join(", ")) + '</td><td class="n">' + x.m.answer + ' min</td><td class="n">' + x.m.show + '%</td><td class="n">' + x.m.drift + '%</td><td class="n">' + x.m.attach + '%</td><td class="n"><span class="' + (x.m.grade.charAt(0) === "A" ? "teal" : "gold") + '">' + x.m.grade + "</span></td></tr>"; }).join("") + "</tbody></table></div>";
  var tot = rows.length, brands = allMakes().length, medAns = rows.map(function (x) { return x.m.answer; }).sort(function (a, b) { return a - b; })[Math.floor(tot / 2)] || 0, avgShow = Math.round(rows.reduce(function (s, x) { return s + x.m.show; }, 0) / (tot || 1)), req = rows.reduce(function (s, x) { return s + x.m.req; }, 0);
  var make = S.routeMake || (r.brands && r.brands[0]) || "Kia", sel = '<select class="input" data-set="routeMake" aria-label="Make">' + allMakes().map(function (b) { return '<option' + (b === make ? " selected" : "") + ">" + CD.esc(b) + "</option>"; }).join("") + "</select>";
  var here = (r.brands || []).indexOf(make) >= 0, near = CD.nearest(r, make, 1)[0], routeTxt = here ? "A <b>" + CD.esc(make) + "</b> request to " + CD.esc(r.name) + " is <b>worked here</b>." : near ? "A <b>" + CD.esc(make) + "</b> request to " + CD.esc(r.name) + " is worked by <b>" + CD.esc(near.r.name) + "</b>, " + CD.miles(near.d) + " away. The buyer sees one group and one reply." : "No rooftop in the group sells <b>" + CD.esc(make) + "</b>. The request stays with the nearest desk, which says so in writing.";
  return vh("The group", "Every Ourisman rooftop in one view. Routing decides which desk answers; it never decides where the group appears on a buyer's screen.") +
    '<div class="stats mb24"><div class="stat"><div class="k">Rooftops</div><div class="v">' + tot + '</div><div class="d">' + brands + ' brands</div></div><div class="stat"><div class="k">Answer, group median</div><div class="v">' + medAns + '<small>min</small></div><div class="d">Illustrative</div></div><div class="stat"><div class="k">Show rate, group</div><div class="v">' + avgShow + '<small>%</small></div><div class="d">Illustrative</div></div><div class="stat"><div class="k">Requests, 30 days</div><div class="v">' + CD.n(req) + '</div><div class="d">Illustrative</div></div></div>' +
    '<div class="card mb24"><p class="label mb8">Routing</p><p class="small mb16">Pick a make. If this rooftop does not sell it, the nearest sister rooftop that does works the request.</p><div class="row" style="--gap:12px"><div style="min-width:220px">' + sel + '</div><div class="route-out sp">' + routeTxt + "</div></div></div>" +
    table + '<p class="note mt16">Answer: median minutes to a written offer. Drift: how often the contract differed from the offer. Attach: share of deals with at least one quoted product. Every figure is illustrative; click a column to sort, a row to switch desks.</p>';
}

/* ---------- performance ---------- */
function perfView() {
  var r = active(), m = metrics(r), w = weekly(r), c = S.calc, out = calcOut(c), month = w.data.slice(-4).reduce(function (a, b) { return a + b; }, 0), prev = w.data.slice(-8, -4).reduce(function (a, b) { return a + b; }, 0), delta = prev ? Math.round((month - prev) / prev * 100) : 0;
  var top = CD.rooftops.map(function (x) { return [x.short || x.name, metrics(x).show, x.id === r.id ? "" : "s3"]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
  var num = function (k, label, step, help) { return '<div class="field"><label for="c-' + k + '">' + label + '</label><input class="input" id="c-' + k + '" type="number" min="0" step="' + (step || 1) + '" data-calc="' + k + '" value="' + c[k] + '">' + (help ? '<span class="help">' + help + "</span>" : "") + "</div>"; };
  return vh("Performance", "What the requests turn into. Starting numbers are placeholders the store replaces with its own.", '<span class="sample">Illustrative · ' + CD.esc(r.short || r.name) + "</span>") +
    '<div class="stats mb24"><div class="stat teal"><div class="k">Requests, 4 weeks</div><div class="v">' + month + '</div><div class="d ' + (delta >= 0 ? "up" : "down") + '">' + (delta >= 0 ? "+" : "") + delta + '% vs prior 4</div></div><div class="stat"><div class="k">Answer, median</div><div class="v">' + m.answer + '<small>min</small></div><div class="d">Written offer, clock from request</div></div><div class="stat"><div class="k">Show rate</div><div class="v">' + m.show + '<small>%</small></div><div class="d">Booked visits that arrived</div></div><div class="stat gold"><div class="k">Cost per sale</div><div class="v">' + (out.cps != null ? CD.usd(out.cps) : "—") + '</div><div class="d">From the calculator below</div></div></div>' +
    '<div class="charts mb24"><div class="card chart-card"><h4>Requests per week</h4><p class="sub">Buyers who sent a pricing or test-drive request to this rooftop, last 12 weeks</p><div class="chart" data-chart="req"></div></div>' +
    '<div class="card chart-card"><h4>Time to a written offer</h4><p class="sub">Requests by response time, last 12 weeks</p><div class="chart" data-chart="resp"></div></div>' +
    '<div class="card chart-card"><h4>Cost per sold unit</h4><p class="sub">By source, using the calculator\'s numbers for ClearDrive</p><div class="chart" data-chart="cost"></div></div>' +
    '<div class="card chart-card"><h4>Show rate by rooftop</h4><p class="sub">Top eight in the group; this rooftop in teal</p>' + hbars(top, "s3", function (v) { return v + "%"; }) + "</div></div>" +
    '<div class="card"><div class="head"><div><p class="label">Cost-per-sale calculator</p><h3 class="mt8">Why it pays</h3></div></div><div class="calc"><div class="fields two">' + num("fee", "Monthly fee per rooftop, $", 50, "Founding store is $500. Pilot is $0.") + num("req", "Requests per month", 1) + num("show", "Show rate, %", 1, "Booked visits that arrive") + num("close", "Close rate, %", 1, "Visits that buy") + num("gross", "Gross per unit, $", 100, "Front and back, your number") + '</div><div class="calc-out"><div class="stat teal"><div class="k">Cost per sale</div><div class="v">' + (out.cps != null ? CD.usd(out.cps) : "—") + '</div><div class="d">' + out.sold.toFixed(1) + ' units a month</div></div><div class="stat"><div class="k">Gross from ClearDrive</div><div class="v">' + CD.usd(out.gross) + '<small>/mo</small></div><div class="d">Fee is ' + (out.share != null ? out.share.toFixed(1) + "% of it" : "—") + '</div></div><div class="stat gold"><div class="k">Fee covered by</div><div class="v">' + (out.day != null && out.day <= 31 ? "day " + out.day : "—") + '</div><div class="d">' + (out.day != null && out.day <= 31 ? "of each month, at these numbers" : "Not covered at these numbers") + "</div></div></div></div></div>";
}
function mountCharts() {
  var r = active(), w = weekly(r), rd = responseDist(r), out = calcOut(S.calc);
  CD.qsa('[data-chart="req"]').forEach(function (el) { lineChart(el, { labels: w.labels, data: w.data, name: "Requests per week", unit: "requests", w: 400, h: 200 }); });
  CD.qsa('[data-chart="resp"]').forEach(function (el) { barChart(el, { cats: rd.cats, data: rd.data, cls: "s1", name: "Time to a written offer", w: 400, h: 200 }); });
  CD.qsa('[data-chart="cost"]').forEach(function (el) { barChart(el, { cats: ["Third-party leads", "Group website", "ClearDrive"], data: [410, 180, Math.round(out.cps || 0)], cls: ["s3", "s2", "s1"], fmt: function (v) { return CD.usd(v); }, name: "Cost per sold unit by source", w: 400, h: 200 }); });
}

/* ---------- public page ---------- */
function publicView() {
  var r = active(), m = metrics(r), names = ["Price honoured in store", "Paperwork matched the offer", "Time respected"];
  var meters = '<div class="meters">' + names.map(function (n, i) { return '<div class="meter"><span>' + n + '</span><span class="n">' + m.m[i] + '%</span><div class="bar"><b style="--w:' + m.m[i] + '%"></b></div></div>'; }).join("") + "</div>";
  var quotes = [["The number on the contract was the number in the email. First time that has ever happened to me.", "Verified buyer · " + CD.esc(r.city)], ["They had the trade figure ready because they had already seen the photos. In and out in under an hour.", "Verified buyer · " + CD.esc(r.state === "MD" ? "Maryland" : "Virginia")], ["I said no to the extras in the app and nobody tried to sell them to me at the desk.", "Verified buyer · " + CD.esc(r.city)]];
  return vh("Public page", "What a buyer sees when this rooftop appears in their offers. The store cannot edit its grade, only earn it.", '<span class="sample">Sample surveys</span>') +
    '<div class="card lift mb16"><div class="pub-head"><div class="grade' + (m.grade.charAt(0) === "A" ? "" : " b") + '" aria-label="Grade ' + m.grade + '">' + m.grade + '</div><div><h3>' + CD.esc(r.name) + '</h3><p class="small">' + CD.esc(r.street + ", " + r.city + ", " + r.state) + " · " + m.reports + ' buyer surveys</p></div><span class="sp"></span><span class="badge ok">Answers in ' + m.answer + ' min, median</span></div><div class="mt24">' + meters + "</div></div>" +
    '<div class="quotes mb16">' + quotes.map(function (q) { return '<div class="quote">“' + q[0] + '”<small>' + q[1] + " · sample</small></div>"; }).join("") + "</div>" +
    '<div class="card"><p class="label mb8">How the grade is computed</p><p class="prose">Three questions, asked once, after a completed deal: was the price the one you were shown, did the paperwork match the offer, was your time respected. Each answer is yes, mostly or no. The grade is the average of the three meters across every survey. Nothing a store enters on this desk, and nothing it pays, changes it.</p><div class="row mt16" style="--gap:8px"><span class="badge teal plain">A ≥ 92</span><span class="badge teal plain">A− ≥ 88</span><span class="badge gold plain">B+ ≥ 84</span><span class="badge gold plain">B ≥ 80</span><span class="badge plain">C below 75</span></div></div>';
}

/* ---------- membership ---------- */
function planView() {
  var out = calcOut(S.calc), g = out.gross;
  var line = function (fee) { if (!fee) return "No fee during the pilot."; if (!g) return "Enter your numbers in Performance to see the payback."; var day = Math.ceil(fee / g * 30); return day <= 31 ? "Covered by day " + day + " of each month at your numbers." : "Not covered at your current numbers."; };
  var fees = [0, 500, 1000];
  return vh("Membership", "One flat fee per rooftop. No per-lead charges, no placement auctions and nothing that changes where the group appears on a buyer's screen.") +
    '<div class="grid three mb24">' + CD.PLANS.map(function (p, i) { return '<div class="card plan' + (i === 1 ? " teal" : "") + '"><p class="label">' + CD.esc(p[0]) + '</p><div class="price">' + CD.esc(p[1]) + "<small>" + CD.esc(p[2]) + "</small></div><p>" + CD.esc(p[3]) + '</p><p class="small ' + (i ? "ok" : "") + '">' + line(fees[i]) + "</p></div>"; }).join("") + "</div>" +
    '<div class="card"><p class="label mb8">What the fee buys, and what it cannot</p><div class="cols" style="align-items:start"><ul class="check-list"><li>Every request from buyers who chose this rooftop, delivered to the CRM</li><li>The written-offer desk, response clock and group routing</li><li>The public page and its grade</li><li>Either side can end it in one email</li></ul><ul class="check-list x"><li>Position on a buyer\'s screen</li><li>The buyer\'s phone number or email</li><li>Another dealer\'s offer</li><li>A price on a product the buyer declined</li></ul></div></div>';
}

/* ---------- settings ---------- */
function settingsView() {
  var r = active(), groups = {}; CD.rooftops.forEach(function (x) { (groups[x.region || x.state] = groups[x.region || x.state] || []).push(x); });
  var sel = '<select class="input" id="set-rooftop" data-set="rooftop">' + Object.keys(groups).sort().map(function (g) { return '<optgroup label="' + CD.esc(g) + '">' + groups[g].map(function (x) { return '<option value="' + CD.esc(x.id) + '"' + (x.id === r.id ? " selected" : "") + ">" + CD.esc(x.name) + "</option>"; }).join("") + "</optgroup>"; }).join("") + "</select>";
  var tog = function (k, label, help) { return '<label class="check"><input type="checkbox" data-notify="' + k + '"' + (S.notify[k] ? " checked" : "") + "><span><b>" + label + '</b><br><span class="small">' + help + "</span></span></label>"; };
  return vh("Settings", "Local to this browser. Nothing here reaches a server.") +
    '<div class="grid two"><div class="card"><p class="label mb16">This desk</p><div class="stack" style="--gap:14px"><div class="field"><label for="set-rooftop">Rooftop</label>' + sel + '<span class="help">Switch to any rooftop in the group. The inbox regenerates its sample buyers for that store.</span></div><div class="field"><label for="set-name">Desk name</label><input class="input" id="set-name" data-set="name" value="' + CD.esc(S.name) + '"><span class="help">Appears on offers and in the ADF vendor contact.</span></div></div></div>' +
    '<div class="card"><p class="label mb16">Notifications</p><div class="stack" style="--gap:12px">' + tog("mail", "Email on a new request", "To the desk mailbox the CRM already uses") + tog("sms", "Text when the clock passes 15 minutes", "A written offer inside 15 minutes is the pilot target") + tog("push", "Daily digest", "Requests, answers and visits, every morning") + "</div></div>" +
    '<div class="card"><p class="label mb16">Reset</p><div class="row" style="--gap:10px"><button class="btn sm" data-act="resetdesk">Reset desk</button><button class="btn sm danger" data-act="cleardeal">Clear live request</button></div><p class="note mt8">Reset desk clears drafts, sample statuses and settings. Clear live request removes the buyer record shared with the workspace in this browser.</p></div></div>';
}

/* ---- site/js/dealer/40-app.js ---- */
/* dealer desk: router, rail, strip, events */
var SECTIONS = [["inbox", "Inbox", "mail"], ["lead", "Lead", "doc"], ["offer", "Offer", "send"], ["group", "Group", "users"], ["performance", "Performance", "chart"], ["public", "Public page", "star"], ["membership", "Membership", "shield"], ["settings", "Settings", "spark"]];
var VIEWS = { inbox: inboxView, lead: leadView, offer: offerView, group: groupView, performance: perfView, "public": publicView, membership: planView, settings: settingsView };
function section() { var s = (location.hash || "").replace(/^#/, "").split("/")[0]; return VIEWS[s] ? s : "inbox"; }
function rail() {
  var sec = section(), r = active(), fresh = leads().filter(function (l) { return l.status === "new" || l.status === "revision"; }).length;
  return '<div class="lbl">Desk</div>' + SECTIONS.map(function (s) { return '<a href="#' + s[0] + '"' + (s[0] === sec ? ' class="on" aria-current="page"' : "") + ">" + CD.icon(s[2]) + "<span>" + s[1] + "</span>" + (s[0] === "inbox" && fresh ? '<span class="count">' + fresh + "</span>" : "") + "</a>"; }).join("") +
    '<div class="rail-store"><b>' + CD.esc(r.name) + "</b>" + CD.esc((r.street || "") + (r.city ? ", " + r.city : "")) + (r.phone ? "<br>" + CD.esc(r.phone) : "") + '<br><a href="#settings">Switch rooftop</a></div>';
}
function strip() {
  var r = active(), l = openLead(), clock = "";
  if (l) { var pending = l.status === "new" || l.status === "revision"; var ms = pending ? Date.now() - (l.revision ? (l.revision.at || l.askedAt) : l.askedAt) : (l.offers.length ? l.offers[0].at - l.askedAt : 0); clock = '<div class="clockbox"><span class="label">' + (pending ? "Clock" : "Answered in") + '</span><span class="clock" id="clock" data-pending="' + (pending ? "1" : "0") + '">' + CD.clock(ms) + "</span></div>"; }
  return '<div class="store">' + brandBox(r) + "<div><b>" + CD.esc(r.name) + "</b><small>" + CD.esc((r.brands || []).join(" · ") + " · " + r.city + ", " + r.state) + '</small></div></div><span class="sp"></span>' + clock + '<div class="who"><span class="avatar">' + CD.esc(CD.initials(S.name) || "FD") + "</span><span>" + CD.esc(S.name) + '</span></div><span class="sample">Demonstration</span>';
}
function render() {
  var sec = section();
  document.getElementById("rail").innerHTML = rail();
  document.getElementById("strip").innerHTML = strip();
  var v = document.getElementById("view"); v.innerHTML = VIEWS[sec]();
  v.className = "view-" + sec;
  if (sec === "performance") mountCharts();
  CD.qsa("[data-notify]", v).forEach(function (i) { i.addEventListener("change", function () { S.notify[i.getAttribute("data-notify")] = i.checked; save(); }); });
  window.scrollTo({ top: 0 });
}
function refreshSummary() { var l = openLead(), sum = document.getElementById("sum"); if (l && sum) sum.innerHTML = offerSummary(l); }
document.addEventListener("DOMContentLoaded", function () {
  render();
  addEventListener("hashchange", render);
  addEventListener("storage", function (e) { if (e.key === "cd:deal") render(); });
  setInterval(function () { var c = document.getElementById("clock"); if (!c || c.getAttribute("data-pending") !== "1") return; var l = openLead(); if (l) c.textContent = CD.clock(Date.now() - (l.revision ? (l.revision.at || l.askedAt) : l.askedAt)); }, 1000);
  CD.on(document, "click", "[data-act]", function (e, t) {
    var act = t.getAttribute("data-act"), l;
    if (act === "filter") { S.filter = t.getAttribute("data-v"); save(); render(); }
    else if (act === "open") { S.open = t.getAttribute("data-id"); save(); location.hash = "#lead"; if (section() === "lead") render(); }
    else if (act === "switch") { if (e.target.closest("th")) return; S.rooftop = t.getAttribute("data-id"); S.open = null; save(); render(); CD.toast("Desk switched to " + active().name); }
    else if (act === "loadsample") { loadSampleDeal(); render(); CD.toast("Sample buyer loaded. The workspace sees it too.", "ok"); }
    else if (act === "copyadf") { var txt = (document.getElementById("adf") || {}).textContent || ""; var done = function () { CD.toast("ADF/XML copied", "ok"); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { var r = document.createRange(); r.selectNodeContents(document.getElementById("adf")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); CD.toast("Select-all applied; press Ctrl+C"); }); else CD.toast("Clipboard unavailable here"); }
    else if (act === "send") {
      l = openLead(); if (!l || l.status === "sold") return;
      var q = draftOf(l), b = l.brief, offer = { rooftop: active().id, at: Date.now(), msg: q.msg, cond: q.cond, q: { price: +q.price || 0, fee: +q.fee || 0, add: +q.add || 0, allow: +q.allow || 0, payoff: +q.payoff || 0, apr: b.pay === "cash" ? null : +q.apr || 0, prod: CD.cleanProd(b.prot, q.prod) } };
      if (!(offer.q.price > 0)) { CD.toast("Enter a selling price first", "warn"); return; }
      if (l.live) { CD.deal.update(function (d) { d.offers = d.offers || []; d.offers.push(offer); d.thread = d.thread || []; d.thread.push({ who: "desk", rooftop: offer.rooftop, text: q.msg, at: offer.at }); if (d.status === "asked") d.status = "replied"; if (d.revision) d.revision.answeredAt = offer.at; }); }
      else { S.sampleOffers[l.id] = (S.sampleOffers[l.id] || []).concat([offer]); if (l.status === "new" || l.status === "revision") S.sampleStatus[l.id] = "replied"; save(); }
      CD.toast("Written offer sent to " + l.alias, "ok"); location.hash = "#lead"; if (section() === "lead") render();
    }
    else if (act === "resetdesk") { var keep = S.rooftop; S = { rooftop: keep }; CD.store.del("desk"); location.reload(); }
    else if (act === "cleardeal") { CD.deal.clear(); S.open = null; save(); render(); CD.toast("Live request cleared"); }
  });
  CD.on(document, "click", "th[data-sort]", function (e, t) { var k = t.getAttribute("data-sort"); if (S.sort.k === k) S.sort.d = -S.sort.d; else S.sort = { k: k, d: k === "name" || k === "city" ? 1 : -1 }; save(); render(); });
  CD.on(document, "input", "[data-q]", function (e, t) { var l = openLead(); if (!l) return; var q = draftOf(l), k = t.getAttribute("data-q"); q[k] = t.tagName === "TEXTAREA" ? t.value : (t.value === "" ? 0 : +t.value); save(); refreshSummary(); });
  CD.on(document, "input", "[data-prod]", function (e, t) { var l = openLead(); if (!l) return; var q = draftOf(l); q.prod[t.getAttribute("data-prod")] = Math.max(0, +t.value || 0); save(); refreshSummary(); });
  CD.on(document, "input", "[data-calc]", function (e, t) { S.calc[t.getAttribute("data-calc")] = Math.max(0, +t.value || 0); save(); var out = calcOut(S.calc); CD.qsa(".calc-out .stat .v").forEach(function (el, i) { if (i === 0) el.textContent = out.cps != null ? CD.usd(out.cps) : "—"; if (i === 1) el.innerHTML = CD.usd(out.gross) + "<small>/mo</small>"; if (i === 2) el.textContent = out.day != null && out.day <= 31 ? "day " + out.day : "—"; }); var ds = CD.qsa(".calc-out .stat .d"); if (ds[0]) ds[0].textContent = out.sold.toFixed(1) + " units a month"; if (ds[1]) ds[1].textContent = "Fee is " + (out.share != null ? out.share.toFixed(1) + "% of it" : "—"); if (ds[2]) ds[2].textContent = out.day != null && out.day <= 31 ? "of each month, at these numbers" : "Not covered at these numbers"; var tile = CD.qsa(".stats .stat.gold .v")[0]; if (tile) tile.textContent = out.cps != null ? CD.usd(out.cps) : "—"; mountCharts(); });
  CD.on(document, "change", "[data-set]", function (e, t) { var k = t.getAttribute("data-set"); if (k === "rooftop") { S.rooftop = t.value; S.open = null; save(); render(); CD.toast("Desk switched to " + active().name); } else if (k === "routeMake") { S.routeMake = t.value; save(); render(); } else { S[k] = t.value; save(); if (k === "name") document.getElementById("strip").innerHTML = strip(); } });
  CD.on(document, "input", "[data-set=\"name\"]", function (e, t) { S.name = t.value; save(); });
});

})();
