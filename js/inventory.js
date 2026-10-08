(function(){
"use strict";
/* ---- site/js/inventory/10-inventory.js ---- */
/* inventory page: new catalog, preowned samples, rooftops. State lives in the URL hash plus a few per-browser conveniences. */
var S = { tab: "new", f: { brand: "", fuel: "", price: "", sort: "price", popular: false, body: "", feats: [] }, p: { rooftop: "", brand: "", body: "", price: "", miles: "", year: "", sort: "price", cert: false }, zip: CD.store.get("zip", "22030") };
var FEAT_CHIPS = ["awd", "hybrid", "ev", "third", "tow", "heated", "blind", "cam360", "remote"];
var FUEL_SHORT = { gas: "Gas", hybrid: "Hybrid", phev: "Plug-in", ev: "Electric", diesel: "Diesel" };
var DRIVE = { fwd: "Front-wheel drive", rwd: "Rear-wheel drive", awd: "All-wheel drive", "4wd": "Four-wheel drive" };
var GOOD_APR = (CD.TIERS.good.lo + CD.TIERS.good.hi) / 2;

function $(id) { return document.getElementById(id); }
function within(v, band) { if (!band) return true; var p = band.split("-"); return v >= +p[0] && v < +p[1]; }
function from() { return CD.zip(S.zip) || CD.zip("22030"); }
function priceLabel(m) { return m.msrp ? "From " + CD.usd(m.msrp) : "Price on request"; }
function estMo(msrp) { var otd = CD.otd(msrp, CD.DOC_FEE.VA, 0, "VA"); return { mo: CD.round10(CD.pmt(otd - 3000, GOOD_APR, 72)), otd: otd }; }
function fuelLine(m) { var o = (m.fuelOptions && m.fuelOptions.length ? m.fuelOptions : [m.fuel]).map(function (f) { return FUEL_SHORT[f] || f; }); return o.join(" · "); }
function seatsLine(m) { return m.seats ? m.seats + " seats" : ""; }
function driveLine(m) { return m.awdAvailable || m.drive === "awd" || m.drive === "4wd" ? "AWD available" : (DRIVE[m.drive] ? DRIVE[m.drive].split("-")[0] + "-wheel drive" : ""); }

/* ---------- NEW ---------- */
function newList() {
  var f = S.f, out = CD.models.filter(function (m) {
    if (f.brand && m.make !== f.brand) return false;
    if (f.fuel && (m.fuelOptions || [m.fuel]).indexOf(f.fuel) < 0) return false;
    if (f.price && !within(m.msrp || 0, f.price)) return false;
    if (f.popular && !m.popular) return false;
    if (f.body && m.body !== f.body) return false;
    for (var i = 0; i < f.feats.length; i++) if (!CD.hasFeat(m, f.feats[i])) return false;
    return true;
  });
  var s = f.sort;
  out.sort(function (a, b) {
    if (s === "price") return (a.msrp || 9e9) - (b.msrp || 9e9) || a.model.localeCompare(b.model);
    if (s === "price-desc") return (b.msrp || 0) - (a.msrp || 0) || a.model.localeCompare(b.model);
    if (s === "name") return a.model.localeCompare(b.model);
    return a.make.localeCompare(b.make) || (a.msrp || 0) - (b.msrp || 0);
  });
  return out;
}
function modelCard(m, extra) {
  return '<button class="model" type="button" data-model="' + CD.esc(m.id) + '">' + CD.car(m, "sm") +
    '<h4><small>' + CD.esc(m.year || "") + " · " + CD.esc(m.make) + "</small>" + CD.esc(m.model) + "</h4>" +
    (m.tagline ? '<p class="why">' + CD.esc(m.tagline) + "</p>" : "") +
    '<div class="price">' + priceLabel(m) + (m.msrp ? ' <small>MSRP, approx.</small>' : "") + "</div>" +
    '<div class="tags">' + [fuelLine(m), seatsLine(m), driveLine(m)].filter(Boolean).map(function (t) { return "<span>" + CD.esc(t) + "</span>"; }).join("") + "</div>" + (extra || "") + "</button>";
}
function renderNew() {
  var list = newList(), grid = $("new-grid");
  grid.innerHTML = list.length ? list.map(function (m) { return modelCard(m); }).join("") : '<div class="empty"><b>No models match</b>Loosen a filter or clear them all.</div>';
  var total = CD.models.length;
  $("new-summary").textContent = list.length === total ? total + " new models across " + brandCount(CD.models) + " brands" : list.length + " of " + total + " models" + (S.f.brand ? " · " + S.f.brand : "");
  CD.qsa("#f-body .chip").forEach(function (c) { c.classList.toggle("on", c.dataset.v === S.f.body); c.setAttribute("aria-pressed", c.dataset.v === S.f.body); });
  CD.qsa("#f-feats .chip").forEach(function (c) { var on = S.f.feats.indexOf(c.dataset.v) >= 0; c.classList.toggle("on", on); c.setAttribute("aria-pressed", on); });
  CD.qsa("#brand-strip span").forEach(function (b) { b.classList.toggle("on", b.dataset.b === S.f.brand); });
}
function brandCount(list) { var s = {}; list.forEach(function (m) { s[m.make] = 1; }); return Object.keys(s).length; }
function initNew() {
  var brands = {}; CD.models.forEach(function (m) { brands[m.make] = (brands[m.make] || 0) + 1; });
  var names = Object.keys(brands).sort();
  $("f-brand").innerHTML = '<option value="">All brands</option>' + names.map(function (b) { return '<option value="' + CD.esc(b) + '">' + CD.esc(b) + " (" + brands[b] + ")</option>"; }).join("");
  var bodies = {}; CD.models.forEach(function (m) { bodies[m.body] = (bodies[m.body] || 0) + 1; });
  $("f-body").innerHTML = CD.BODIES.filter(function (b) { return bodies[b[0]]; }).map(function (b) { return '<button class="chip sm" type="button" data-v="' + b[0] + '" aria-pressed="false">' + b[1] + ' <span class="mute">' + bodies[b[0]] + "</span></button>"; }).join("");
  $("f-feats").innerHTML = FEAT_CHIPS.map(function (k) { return '<button class="chip sm" type="button" data-v="' + k + '" aria-pressed="false">' + CD.esc(CD.FEATS[k]) + "</button>"; }).join("");
  $("brand-strip").innerHTML = names.map(function (b) { return '<span data-b="' + CD.esc(b) + '">' + CD.esc(b) + "<b>" + brands[b] + "</b></span>"; }).join("");
  $("count-new").textContent = CD.models.length;
  ["f-brand", "f-fuel", "f-price", "f-sort"].forEach(function (id) { $(id).addEventListener("change", function () { S.f[id.slice(2)] = this.value; renderNew(); }); });
  $("f-popular").addEventListener("change", function () { S.f.popular = this.checked; renderNew(); });
  CD.on($("f-body"), "click", ".chip", function (e, t) { S.f.body = S.f.body === t.dataset.v ? "" : t.dataset.v; renderNew(); });
  CD.on($("f-feats"), "click", ".chip", function (e, t) { var i = S.f.feats.indexOf(t.dataset.v); if (i >= 0) S.f.feats.splice(i, 1); else S.f.feats.push(t.dataset.v); renderNew(); });
  CD.on($("brand-strip"), "click", "span", function (e, t) { S.f.brand = S.f.brand === t.dataset.b ? "" : t.dataset.b; $("f-brand").value = S.f.brand; renderNew(); });
  $("f-clear").addEventListener("click", function () { S.f = { brand: "", fuel: "", price: "", sort: "price", popular: false, body: "", feats: [] }; $("f-brand").value = ""; $("f-fuel").value = ""; $("f-price").value = ""; $("f-sort").value = "price"; $("f-popular").checked = false; renderNew(); });
  CD.on($("new-grid"), "click", ".model", function (e, t) { location.hash = "new/" + t.dataset.model; });
  renderNew();
}

/* ---------- model detail ---------- */
function nearHTML(make, n) {
  var fr = from(); if (!fr) return '<p class="note">Enter a five-digit zip code in Maryland, Virginia or DC.</p>';
  var list = CD.nearest(fr, make, n || 3);
  if (!list.length) return '<p class="note">No Ourisman rooftop sells ' + CD.esc(make) + " today. A sister store can still take the request.</p>";
  return list.map(function (x) { var r = x.r; return '<div class="rooftop"><div class="brand">' + CD.esc(CD.brandAbbr(r.brands[0])) + '</div><div><b>' + CD.esc(r.name) + "</b><small>" + CD.esc(r.city + ", " + r.state) + " · " + CD.esc(r.brands.join(", ")) + '</small></div><div class="dist">' + CD.miles(x.d) + "</div></div>"; }).join("");
}
function zipLine(id) { return '<div class="zipline"><span class="label">Near</span><input class="input sm" id="' + id + '" inputmode="numeric" maxlength="5" value="' + CD.esc(S.zip) + '" aria-label="Zip code"><span class="small">' + (from() ? CD.esc(from().city + ", " + from().state) : "Unknown zip") + "</span></div>"; }
function featsHTML(m) { return Object.keys(CD.FEATS).filter(function (k) { return CD.hasFeat(m, k); }).map(function (k) { return '<span class="' + ((m.feats || []).indexOf(k) < 0 ? "std" : "") + '">' + CD.esc(CD.FEATS[k]) + "</span>"; }).join(""); }
function openModel(id) {
  var m = CD.modelById(id); if (!m) return;
  var est = m.msrp ? estMo(m.msrp) : null;
  var specs = [["Starting trim", m.trim], ["Powertrain", fuelLine(m)], ["Drivetrain", (DRIVE[m.drive] || m.drive || "") + (m.awdAvailable && m.drive !== "awd" && m.drive !== "4wd" ? ", AWD available" : "")], ["Seating", m.seats ? m.seats + " seats" : null], ["Economy", m.mpg || null], ["Body", CD.bodyName(m.body) + (m.size ? " · " + CD.sizeName(m.size) : "")], ["Tow", CD.hasFeat(m, "tow") ? "3,500 lb or more" : null]].filter(function (s) { return s[1]; });
  var html = '<div class="detail"><div class="top">' + CD.car(m) + '<div><p class="eyebrow">' + CD.esc(m.year || "") + " " + CD.esc(m.make) + (m.popular ? ' · <span class="gold">best seller</span>' : "") + '</p><h3>' + CD.esc(m.model) + "</h3>" + (m.tagline ? '<p class="soft">' + CD.esc(m.tagline) + "</p>" : "") +
    '<div class="from">' + priceLabel(m) + (m.msrp ? "<small>MSRP, approx., before destination</small>" : "") + "</div></div></div>" +
    '<div class="specs">' + specs.map(function (s) { return '<div class="spec"><div class="k">' + CD.esc(s[0]) + '</div><div class="v">' + CD.esc(s[1]) + "</div></div>"; }).join("") + "</div>" +
    '<div class="feats">' + featsHTML(m) + "</div>" +
    (est ? '<div class="est"><span class="v">' + CD.usd(est.mo) + "<small>a month, estimate</small></span><span class=\"small\">Out the door about " + CD.usd(est.otd) + "</span><p>72 months at " + GOOD_APR.toFixed(2) + "% APR (good-credit midpoint), $3,000 down, Virginia tax, " + CD.usd(CD.DOC_FEE.VA) + " processing fee and " + CD.usd(CD.TAX.VA.reg) + " title and registration. Before any trade, rebate or dealer pricing. A written offer replaces this estimate.</p></div>" : "") +
    '<div><div class="row between mb8" style="--gap:10px"><span class="label">Ourisman rooftops that sell ' + CD.esc(m.make) + "</span>" + zipLine("m-zip") + '</div><div class="near" id="m-near">' + nearHTML(m.make) + "</div></div>" +
    '<div class="ctas"><a class="btn pri" href="app.html?model=' + encodeURIComponent(m.id) + '&way=price">Ask Ourisman for a written offer</a><a class="btn" href="app.html?model=' + encodeURIComponent(m.id) + '&way=drive">Book a test drive</a></div>' +
    '<p class="note">Model data compiled from manufacturer sites in October 2026. The silhouette is derived from a Creative Commons photograph of the real model; see the <a href="trust.html#credits">imagery credits</a>.</p></div>';
  var el = CD.modal(html, { wide: true });
  var z = el.querySelector("#m-zip"); if (z) z.addEventListener("input", function () { if (this.value.length === 5) { S.zip = this.value; CD.store.set("zip", S.zip); el.querySelector("#m-near").innerHTML = nearHTML(m.make); this.nextElementSibling.textContent = from() ? from().city + ", " + from().state : "Unknown zip"; } });
}

/* ---------- PREOWNED ---------- */
function preList() {
  var f = S.p, out = CD.preowned.filter(function (l) {
    if (f.rooftop && l.rooftop !== f.rooftop) return false;
    if (f.brand && l.make !== f.brand) return false;
    if (f.body && l.body !== f.body) return false;
    if (f.price && !within(l.price, f.price)) return false;
    if (f.miles && !within(l.miles, f.miles)) return false;
    if (f.year && l.year < +f.year) return false;
    if (f.cert && !l.certified) return false;
    return true;
  });
  var s = f.sort;
  out.sort(function (a, b) {
    if (s === "price") return a.price - b.price; if (s === "price-desc") return b.price - a.price;
    if (s === "miles") return a.miles - b.miles; if (s === "year") return b.year - a.year || a.miles - b.miles;
    return a.days - b.days;
  });
  return out;
}
function preCard(l) {
  var m = CD.modelById(l.modelId) || { id: l.modelId, make: l.make, model: l.model, body: l.body }, r = CD.rooftopById(l.rooftop);
  return '<button class="model" type="button" data-pre="' + CD.esc(l.id) + '">' + (l.certified ? '<span class="badge teal plain cert">Certified</span>' : "") + CD.car(m, "sm") +
    '<h4><small>' + l.year + " · " + CD.esc(l.make) + "</small>" + CD.esc(l.model) + " " + CD.esc(l.trim) + "</h4>" +
    '<div class="meta"><b>' + CD.n(l.miles) + " mi</b><span>" + CD.esc(FUEL_SHORT[l.fuel] || l.fuel) + "</span><span>" + CD.esc((l.drive || "").toUpperCase()) + "</span></div>" +
    '<div class="price">' + CD.usd(l.price) + (l.msrpNew ? ' <small>vs ' + CD.usd(l.msrpNew) + " new</small>" : "") + "</div>" +
    '<div class="meta"><span>' + CD.esc(r ? r.short || r.name : l.rooftop) + "</span><span>" + l.days + " " + CD.plural(l.days, "day") + ' on lot</span><span class="sample">Sample listing</span></div></button>';
}
function renderPre() {
  var list = preList();
  $("pre-grid").innerHTML = list.length ? list.map(preCard).join("") : '<div class="empty"><b>No listings match</b>Loosen a filter or clear them all.</div>';
  var cert = list.filter(function (l) { return l.certified; }).length;
  $("pre-summary").textContent = list.length + " of " + CD.preowned.length + " sample listings · " + cert + " certified";
}
function initPre() {
  var roofs = {}, brands = {}, bodies = {}, years = {};
  CD.preowned.forEach(function (l) { roofs[l.rooftop] = (roofs[l.rooftop] || 0) + 1; brands[l.make] = (brands[l.make] || 0) + 1; bodies[l.body] = 1; years[l.year] = 1; });
  $("p-rooftop").innerHTML = '<option value="">All rooftops</option>' + Object.keys(roofs).map(function (id) { var r = CD.rooftopById(id); return { id: id, n: r ? r.name : id, c: roofs[id] }; }).sort(function (a, b) { return a.n.localeCompare(b.n); }).map(function (x) { return '<option value="' + CD.esc(x.id) + '">' + CD.esc(x.n) + " (" + x.c + ")</option>"; }).join("");
  $("p-brand").innerHTML = '<option value="">All brands</option>' + Object.keys(brands).sort().map(function (b) { return '<option value="' + CD.esc(b) + '">' + CD.esc(b) + " (" + brands[b] + ")</option>"; }).join("");
  $("p-body").innerHTML = '<option value="">Any</option>' + CD.BODIES.filter(function (b) { return bodies[b[0]]; }).map(function (b) { return '<option value="' + b[0] + '">' + b[1] + "</option>"; }).join("");
  $("p-year").innerHTML = '<option value="">Any</option>' + Object.keys(years).sort().reverse().map(function (y) { return '<option value="' + y + '">' + y + " and newer</option>"; }).join("");
  $("count-preowned").textContent = CD.preowned.length;
  ["p-rooftop", "p-brand", "p-body", "p-price", "p-miles", "p-year", "p-sort"].forEach(function (id) { $(id).addEventListener("change", function () { S.p[id.slice(2)] = this.value; renderPre(); }); });
  $("p-cert").addEventListener("change", function () { S.p.cert = this.checked; renderPre(); });
  CD.on($("pre-grid"), "click", ".model", function (e, t) { location.hash = "preowned/" + t.dataset.pre; });
  renderPre();
}
function openPre(id) {
  var l = null; for (var i = 0; i < CD.preowned.length; i++) if (CD.preowned[i].id === id) l = CD.preowned[i];
  if (!l) return;
  var m = CD.modelById(l.modelId) || { id: l.modelId, make: l.make, model: l.model, body: l.body }, r = CD.rooftopById(l.rooftop) || {};
  var specs = [["Mileage", CD.n(l.miles) + " mi"], ["Color", l.color], ["Powertrain", FUEL_SHORT[l.fuel] || l.fuel], ["Drivetrain", DRIVE[l.drive] || l.drive], ["Owners", l.owners], ["Accidents reported", l.accidents === 0 ? "None" : l.accidents], ["Stock", l.stock], ["VIN ends", l.vin6]];
  var est = { mo: CD.round10(CD.pmt(CD.otd(l.price, CD.DOC_FEE[r.state] || 899, 0, r.state || "VA") - 3000, GOOD_APR, 72)) };
  var html = '<div class="detail"><div class="top">' + CD.car(m) + '<div><p class="eyebrow">' + l.year + " " + CD.esc(l.make) + ' · <span class="gold">sample listing</span></p><h3>' + CD.esc(l.model) + " " + CD.esc(l.trim) + "</h3>" +
    '<div class="row" style="--gap:8px">' + (l.certified ? '<span class="badge teal">Ourisman Certified</span>' : '<span class="badge plain">As traded</span>') + '<span class="badge plain">' + l.days + " days on lot</span></div>" +
    '<div class="from">' + CD.usd(l.price) + (l.msrpNew ? "<small>" + CD.usd(l.msrpNew) + " new, approx.</small>" : "") + "</div></div></div>" +
    '<div class="specs">' + specs.map(function (s) { return '<div class="spec"><div class="k">' + CD.esc(s[0]) + '</div><div class="v">' + CD.esc(s[1]) + "</div></div>"; }).join("") + "</div>" +
    '<div class="est"><span class="v">' + CD.usd(est.mo) + "<small>a month, estimate</small></span><p>72 months at " + GOOD_APR.toFixed(2) + "% APR (good-credit midpoint), $3,000 down, " + CD.esc((CD.TAX[r.state] || CD.TAX.VA).name) + ". Before any trade or dealer pricing. A written offer replaces this estimate.</p></div>" +
    '<div class="store"><b>' + CD.esc(r.name || l.rooftop) + "</b><span>" + CD.esc([r.street, r.city, r.state, r.zip].filter(Boolean).join(", ")) + "</span>" + (r.phone ? '<span>Sales <span class="tel">' + CD.esc(r.phone) + '</span> · <a href="tel:' + CD.esc(r.phone.replace(/[^\d+]/g, "")) + '">call</a></span>' : "") + "</div>" +
    (l.certified ? '<div class="callout"><span><b>Ourisman Certified, sample terms.</b> A multipoint inspection, reconditioning to the brand\'s standard and a limited warranty whose length and coverage vary by manufacturer program. The written offer lists the exact terms for this car.</span></div>' : "") +
    '<div class="ctas"><a class="btn pri" href="app.html?model=' + encodeURIComponent(l.modelId) + "&used=" + encodeURIComponent(l.id) + '&way=drive">Book a test drive</a><a class="btn" href="app.html?model=' + encodeURIComponent(l.modelId) + "&used=" + encodeURIComponent(l.id) + '&way=price">Ask for a written offer</a></div>' +
    '<p class="note">Generated for the demonstration from the new-model catalog. Not a vehicle on a lot today.</p></div>';
  CD.modal(html, { wide: true });
}

/* ---------- ROOFTOPS ---------- */
function roofCard(x) {
  var r = x.r, here = r.id === "kia-fairfax";
  return '<article class="roof' + (here ? " here" : "") + '"><div class="brand">' + CD.esc(CD.brandAbbr(r.brands[0])) + '</div><div class="body"><div class="name"><b>' + CD.esc(r.name) + '</b><span class="dist">' + (x.d != null ? CD.miles(x.d) : "") + "</span></div>" +
    '<div class="line">' + CD.esc(r.brands.join(" · ")) + (r.preowned ? " · Preowned" : "") + "</div>" +
    '<div class="line addr">' + CD.esc([r.street, r.city + ", " + r.state + " " + r.zip].join(", ")) + "</div>" +
    '<div class="line">' + (r.phone ? 'Sales <span class="tel">' + CD.esc(r.phone) + '</span> · <a href="tel:' + CD.esc(r.phone.replace(/[^\d+]/g, "")) + '">call</a>' : "") + (r.site ? ' · <a href="' + CD.esc(r.site) + '" target="_blank" rel="noopener">website</a>' : "") + "</div></div>" +
    '<div class="foot"><span>' + CD.esc(r.region || "") + " · Sales Mon–Sat 9–8, Sun 11–5 (sample hours)</span><a class=\"btn sm\" href=\"app.html?rooftop=" + encodeURIComponent(r.id) + '">Ask this store</a></div></article>';
}
function renderRoofs() {
  var fr = from(), list = CD.rooftops.map(function (r) { return { r: r, d: fr ? CD.dist(fr, r) : null }; });
  list.sort(function (a, b) { return (a.d == null ? 1e9 : a.d) - (b.d == null ? 1e9 : b.d) || a.r.name.localeCompare(b.r.name); });
  $("roof-list").innerHTML = list.map(roofCard).join("");
  $("r-zip-note").textContent = fr ? "Sorted by distance from " + fr.city + ", " + fr.state : "Enter a Maryland, Virginia or DC zip code";
}
function initRoofs() {
  var brands = {}, states = {}; CD.rooftops.forEach(function (r) { r.brands.forEach(function (b) { brands[b] = 1; }); states[r.state] = 1; });
  $("roof-stats").innerHTML = [["Rooftops", CD.rooftops.length], ["Brands", Object.keys(brands).length], ["States", Object.keys(states).length], ["Founded", "1921"]].map(function (s) { return '<div class="stat"><div class="k">' + s[0] + '</div><div class="v">' + s[1] + "</div></div>"; }).join("");
  $("count-rooftops").textContent = CD.rooftops.length;
  $("r-zip").value = S.zip;
  $("r-zip").addEventListener("input", function () { if (this.value.length === 5) { S.zip = this.value; CD.store.set("zip", S.zip); renderRoofs(); } });
  renderRoofs();
}

/* ---------- routing ---------- */
function showTab(tab) {
  S.tab = tab;
  ["new", "preowned", "rooftops"].forEach(function (t) { $("view-" + t).hidden = t !== tab; });
  CD.qsa("#inv-tabs a").forEach(function (a) { var on = a.dataset.tab === tab; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
}
function route() {
  var h = (location.hash || "#new").slice(1), parts = h.split("/"), tab = parts[0] || "new";
  if (["new", "preowned", "rooftops"].indexOf(tab) < 0) tab = "new";
  showTab(tab);
  if (parts[1]) { if (tab === "new") openModel(parts[1]); else if (tab === "preowned") openPre(parts[1]); } else CD.closeModal();
}
document.addEventListener("DOMContentLoaded", function () {
  var brands = {}; CD.models.forEach(function (m) { brands[m.make] = 1; }); CD.rooftops.forEach(function (r) { r.brands.forEach(function (b) { brands[b] = 1; }); });
  $("inv-stats").innerHTML = [["Models", CD.models.length], ["Brands", Object.keys(brands).length], ["Rooftops", CD.rooftops.length]].map(function (s) { return '<div class="stat"><div class="k">' + s[0] + '</div><div class="v">' + s[1] + "</div></div>"; }).join("");
  initNew(); initPre(); initRoofs();
  addEventListener("hashchange", route);
  var q = CD.param("model"); if (q && CD.modelById(q) && !location.hash) location.hash = "new/" + q;
  route();
  /* closing the modal via its own controls returns to the tab */
  document.addEventListener("click", function (e) { if (e.target.closest("[data-close]") || (e.target.classList && e.target.classList.contains("modal"))) { if (location.hash.indexOf("/") > 0) history.replaceState(null, "", "#" + S.tab); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && location.hash.indexOf("/") > 0) history.replaceState(null, "", "#" + S.tab); });
});

})();
