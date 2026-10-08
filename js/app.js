(function(){
"use strict";
/* ---- site/js/app/10-state.js ---- */
/* buyer workspace: state, seeding, scoring, pricing. Everything here is sample data; nothing contacts a dealer. */
var STEPS = ["intro", "brief", "matches", "trade", "payment", "protect", "account", "dealers", "offers", "record"];
var LABEL = { brief: "Your brief", matches: "Your three", trade: "Your trade", payment: "Your payment", protect: "Your protection", account: "Private address", dealers: "Dealers", offers: "Written offers", record: "Deal record" };
function at(k) { return STEPS.indexOf(k); }
var SHOTS = [["front", "Front corner", "camera"], ["rear", "Rear corner", "camera"], ["interior", "Interior", "camera"], ["odo", "Odometer", "plate"]];
var PRIORITIES = [["fit", "Best overall"], ["payment", "Lowest payment"], ["total", "Lowest total cost"], ["trade", "Highest trade allowance"]];
var CONDS = [["excellent", "Excellent"], ["good", "Good"], ["fair", "Fair"], ["needs", "Needs work"]];
var PAYWORD = { finance: "financing", lease: "leasing", cash: "paying cash" };
var media = {}; /* photo previews live in memory only; the deal stores a flag per shot */
var S = null;

function fresh() {
  return {
    id: null, created: Date.now(), status: "new", step: "intro", mode: "guide",
    brief: {
      pay: "finance", limit: 650, budget: 650, leaseBudget: 480, cashBudget: 35000, down: 3000, term: 72, lterm: 36, miles: 12000, das: 3000,
      zip: "22030", state: "VA", tier: "good", body: "suv", size: "", makes: [], feats: [], priority: "fit", lender: null,
      trade: { has: false, year: "", make: "", model: "", miles: "", cond: "good", payoff: 0, photos: [], vin6: "" },
      prot: { gap: "ask", vsc: "ask", maint: "ask", tire: "ask" }, name: ""
    },
    pick: null, way: "drive", alias: null, rooftops: [], askedAt: null, offers: [], sim: {}, revisions: {}, chosen: null, slot: null, saved: null,
    thread: [], paper: null, survey: {}, surveyDone: false, usedId: null
  };
}
function save() { S.brief.limit = limit(); CD.deal.set(S); }
function load() { var d = CD.deal.get(); if (d && d.brief && d.step) { S = d; } else { S = fresh(); } }

/* ---------- seeded sample buyer ---------- */
function seed() {
  var d = fresh(); d.id = CD.deal.newId(); d.created = Date.now() - 9 * 60 * 1000;
  d.brief.pay = "finance"; d.brief.budget = 650; d.brief.limit = 650; d.brief.down = 3000; d.brief.term = 72; d.brief.zip = "22030"; d.brief.state = "VA"; d.brief.tier = "good";
  d.brief.body = "suv"; d.brief.size = "mid"; d.brief.makes = ["Kia", "Toyota", "Honda"]; d.brief.feats = ["awd", "blind", "third"]; d.brief.lender = "tcu"; d.brief.name = "Jordan Ellis";
  d.brief.prot = { gap: "yes", vsc: "ask", maint: "no", tire: "no" };
  d.brief.trade = { has: true, year: 2018, make: "Honda", model: "Accord", miles: 82000, cond: "good", payoff: 9000, photos: ["front", "rear", "interior", "odo"], vin6: "A04217" };
  d.pick = CD.modelById("kia-telluride") ? "kia-telluride" : (CD.models.filter(function (m) { return m.body === "suv"; })[0] || CD.models[0] || {}).id || null;
  d.way = "price"; d.alias = makeAlias(d.brief.name); d.consent = true;
  d.rooftops = ["kia-fairfax", "chantilly-kia", "kia-alexandria"].filter(function (id) { return !!CD.rooftopById(id); });
  if (!d.rooftops.length) d.rooftops = CD.rooftops.slice(0, 3).map(function (r) { return r.id; });
  d.askedAt = Date.now() - 8 * 60 * 1000; d.status = "asked"; d.step = "offers"; d.mode = "guide";
  d.sim = simulate(d);
  return d;
}

/* ---------- money helpers that depend on the brief ---------- */
function limit() { var b = S.brief; return b.pay === "cash" ? b.cashBudget : b.pay === "lease" ? b.leaseBudget : b.budget; }
function setLimit(v) { var b = S.brief; if (b.pay === "cash") b.cashBudget = v; else if (b.pay === "lease") b.leaseBudget = v; else b.budget = v; b.limit = v; }
function limitText() { return CD.usd(limit()) + (S.brief.pay === "cash" ? " out the door" : " a month"); }
function tierMid() { var t = CD.TIERS[S.brief.tier] || CD.TIERS.good; return (t.lo + t.hi) / 2; }
function docFee(state) { return CD.DOC_FEE[state] || 899; }
function tradeEstimate(t) {
  if (!t || !t.has || !t.year) return null;
  var age = Math.max(0, 2026 - (+t.year || 2026)), base = 32000;
  var cm = CD.models.filter(function (m) { return m.make.toLowerCase() === String(t.make || "").trim().toLowerCase() && m.model.toLowerCase() === String(t.model || "").trim().toLowerCase(); })[0];
  if (cm && cm.msrp) base = cm.msrp * 1.05;
  var v = base * (age >= 1 ? 0.85 : 0.95); for (var i = 1; i < age; i++) v *= 0.93;
  var exp = 12000 * Math.max(age, 1); v += (exp - (+t.miles || exp)) * 0.05;
  v *= ({ excellent: 1.06, good: 1, fair: 0.9, needs: 0.78 }[t.cond] || 1); v = Math.max(1500, v);
  return { lo: Math.round(v * 0.92 / 100) * 100, mid: Math.round(v / 100) * 100, hi: Math.round(v * 1.08 / 100) * 100 };
}
function tradeEquity() { var t = S.brief.trade, e = tradeEstimate(t); return t.has && e ? e.mid - (+t.payoff || 0) : 0; }
function priceBand() {
  var b = S.brief, L = limit(), t = CD.TIERS[b.tier] || CD.TIERS.good, tax = CD.TAX[b.state] || CD.TAX.VA, fee = docFee(b.state), eq = tradeEquity();
  function fromOTD(otd) { return Math.max(0, (otd - fee - tax.reg) / (1 + tax.rate)); }
  if (b.pay === "cash") return { lo: fromOTD(L * 0.9 + eq), hi: fromOTD(L + eq) };
  if (b.pay === "finance") return { lo: fromOTD(CD.pv(L, t.hi, b.term) + b.down + eq), hi: fromOTD(CD.pv(L, t.lo, b.term) + b.down + eq) };
  var lo = 8000, hi = 150000; for (var i = 0; i < 32; i++) { var mid = (lo + hi) / 2; if (CD.leaseMo(mid, fee, 0, eq + b.das, t.lo + 0.5, b.lterm, b.miles) > L) hi = mid; else lo = mid; }
  return { lo: lo * 0.88, hi: lo };
}
function needFor(m) {
  var b = S.brief, fee = docFee(b.state), eq = tradeEquity(), v;
  if (b.pay === "cash") v = CD.otd(m.msrp, fee, 0, b.state) - eq;
  else if (b.pay === "lease") v = CD.leaseMo(m.msrp, fee, 0, eq + b.das, tierMid(), b.lterm, b.miles);
  else v = CD.pmt(CD.otd(m.msrp, fee, 0, b.state) - eq - b.down, tierMid(), b.term);
  return Math.ceil(v / 10) * 10;
}
function bandText() {
  var bnd = priceBand(), lo = Math.round(bnd.lo / 500) * 500, hi = Math.round(bnd.hi / 500) * 500;
  return CD.usd(limit()) + (S.brief.pay === "cash" ? " out the door" : " a month") + " realistically buys a car priced from <b>" + CD.usd(lo) + "</b> to <b>" + CD.usd(hi) + "</b>" + (S.brief.pay === "finance" ? ", at " + CD.TIERS[S.brief.tier].n.toLowerCase() + "-credit rates over " + S.brief.term + " months with " + CD.usd(S.brief.down) + " down" : S.brief.pay === "lease" ? ", over " + S.brief.lterm + " months with " + CD.usd(S.brief.das) + " due at signing" : "") + ". Taxes and fees for " + S.brief.state + " are included.";
}

/* ---------- matching ---------- */
function scoreModel(m) {
  var b = S.brief, L = limit(), need = needFor(m), miss = b.feats.filter(function (f) { return !CD.hasFeat(m, f); }), s = 0, ratio = need / L;
  s -= miss.length * 25;
  if (b.makes.length) s += b.makes.indexOf(m.make) >= 0 ? 20 : -8;
  if (b.size && m.size === b.size) s += 10;
  if (m.popular) s += 8;
  /* budget fit: the best use of the cap sits around 85% of it; cheaper is fine, over the cap is not */
  if (ratio <= 1) s += 14 - Math.abs(0.85 - ratio) * 30; else if (ratio <= 1.1) s -= 12; else s -= 40 + (ratio - 1.1) * 100;
  return { m: m, need: need, miss: miss, score: s, over: ratio > 1, ratio: ratio };
}
function matches(n) {
  var b = S.brief, pool = CD.models.filter(function (m) { return !b.body || m.body === b.body; });
  if (!pool.length) pool = CD.models.slice();
  var pref = b.makes.length ? pool.filter(function (m) { return b.makes.indexOf(m.make) >= 0; }) : pool;
  var list = pref.map(scoreModel).sort(function (a, c) { return c.score - a.score || a.need - c.need; });
  if (list.length < (n || 3) && pref !== pool) {
    var ids = {}; list.forEach(function (x) { ids[x.m.id] = 1; });
    list = list.concat(pool.filter(function (m) { return !ids[m.id]; }).map(scoreModel).sort(function (a, c) { return c.score - a.score || a.need - c.need; }));
  }
  return list.slice(0, n || 3);
}
function explain(x) {
  var b = S.brief, bits = [];
  bits.push(x.over ? "About " + CD.usd(x.need) + (b.pay === "cash" ? " out the door, " : " a month, ") + CD.usd(x.need - limit()) + " over your cap" : "Under your cap at about " + CD.usd(x.need) + (b.pay === "cash" ? " out the door" : " a month"));
  if (b.feats.length) bits.push(x.miss.length ? "missing " + x.miss.map(CD.featName).join(" and ").toLowerCase() : "has " + (b.feats.length === 1 ? "the feature you asked for" : "all " + b.feats.length + " features you asked for"));
  if (b.makes.length && b.makes.indexOf(x.m.make) >= 0) bits.push(x.m.make + ", as you asked");
  else if (b.makes.length) bits.push("not a make you listed, but it fits better");
  return bits.join(" · ");
}
function searchModels(q) {
  q = String(q || "").trim().toLowerCase(); if (!q) return [];
  return CD.models.filter(function (m) { return (m.make + " " + m.model + " " + (m.tagline || "")).toLowerCase().indexOf(q) >= 0; }).slice(0, 8);
}

/* ---------- alias ---------- */
function hash(str) { var x = 7; for (var i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) >>> 0; return x; }
function makeAlias(name) {
  var p = String(name || "").trim().toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  var base = p.length ? p[0] + (p[1] ? "." + p[1][0] : "") : "buyer";
  var sfx = hash(base + "|" + Date.now().toString().slice(0, 7)).toString(36).slice(0, 4);
  return base + "-" + sfx + "@cleardrive.app";
}

/* ---------- simulated written offers (sample data, deterministic per rooftop) ---------- */
function rf(id, i) { return (hash(id + ":" + i) % 1000) / 1000; }
function traits(id) {
  if (id === "kia-fairfax") return { priceF: 0.985, add: 0, aprOff: -0.3, allowF: 0.97, reply: 3, stock: "On the lot" };
  var r = rf(id, 1), a = rf(id, 2), p = rf(id, 3), t = rf(id, 4), s = rf(id, 5), q = rf(id, 6);
  return { priceF: 0.97 + r * 0.06, add: [0, 0, 495, 895, 1295][Math.floor(a * 5)], aprOff: -0.4 + p * 0.9, allowF: 0.92 + t * 0.08, reply: 2 + Math.floor(s * 6), stock: q < 0.7 ? "On the lot" : "Arrives in " + (2 + Math.floor(q * 10)) + " days" };
}
function dealerProd(id) { return { gap: 695 + Math.round(rf(id, 7) * 6) * 50, vsc: 1995 + Math.round(rf(id, 8) * 16) * 50, maint: 595 + Math.round(rf(id, 9) * 6) * 50, tire: 495 + Math.round(rf(id, 10) * 6) * 50 }; }
function simulate(d) {
  var m = CD.modelById(d.pick), b = d.brief, sim = {}, est = tradeEstimate(b.trade), tier = CD.TIERS[b.tier] || CD.TIERS.good, mid = (tier.lo + tier.hi) / 2;
  if (!m) return sim;
  d.rooftops.forEach(function (id) {
    var t = traits(id), r = CD.rooftopById(id), st = r ? r.state : b.state;
    sim[id] = {
      q: { price: Math.round(m.msrp * t.priceF / 10) * 10, fee: docFee(st), add: t.add, allow: b.trade.has && est ? Math.round(est.mid * t.allowF / 50) * 50 : 0, payoff: b.trade.has ? +b.trade.payoff || 0 : 0, apr: Math.round((mid + t.aprOff) * 100) / 100, prod: dealerProd(id) },
      reply: t.reply, stock: t.stock, rev: null, revAt: null,
      msg: (r ? r.short || r.name : "The desk") + " here. Priced the " + m.year + " " + m.make + " " + m.model + " " + (m.trim || "") + " to your " + (b.pay === "cash" ? "out-the-door" : "monthly") + " limit, in writing. " + (t.add ? "Add-ons are listed separately and optional. " : "No add-ons. ") + (b.trade.has ? "Trade allowance is based on your photos and odometer; confirmed on inspection. " : "") + "Valid for 7 days."
    };
  });
  return sim;
}
function offerFor(id) {
  var desk = (S.offers || []).filter(function (o) { return o.rooftop === id; }).slice(-1)[0], sim = S.sim[id], r = CD.rooftopById(id);
  if (desk && desk.q) return { rooftop: id, r: r, q: desk.q, at: desk.at, msg: desk.msg || "", desk: true, arrived: true, revised: false, stock: desk.stock || "", priced: CD.priceQuote(S.brief, desk.q) };
  if (!sim) return null;
  var arrived = !!S.askedAt && (Date.now() - S.askedAt) >= sim.reply * 1000, q = sim.rev || sim.q;
  return { rooftop: id, r: r, q: q, at: (S.askedAt || 0) + sim.reply * 1000, msg: sim.rev ? sim.revMsg : sim.msg, desk: false, arrived: arrived, revised: !!sim.rev, stock: sim.stock, priced: CD.priceQuote(S.brief, q), reply: sim.reply };
}
function offers() { return S.rooftops.map(offerFor).filter(Boolean); }
function cost(P) { var b = S.brief; return b.pay === "cash" ? P.due : b.pay === "lease" ? P.due + P.mo * b.lterm : P.due + P.mo * b.term; }
/* Ranking uses the buyer's priority and the priced terms only. No dealer input, membership or fee can affect it. */
function ranked() {
  var list = offers().filter(function (o) { return o.arrived; }), p = S.brief.priority, pay = S.brief.pay;
  list.sort(function (a, b) {
    var A = a.priced, B = b.priced;
    if (p === "trade") return (B.allow - A.allow) || (cost(A) - cost(B));
    if (p === "payment") return pay === "cash" ? A.due - B.due : A.mo - B.mo;
    if (p === "total") return cost(A) - cost(B);
    return ((B.under ? 1 : 0) - (A.under ? 1 : 0)) || (cost(A) - cost(B));
  });
  return list;
}
function chosenOffer() { return S.saved ? S.saved : (S.chosen ? offerFor(S.chosen) : null); }
function lenderOf() { if (S.brief.pay !== "finance" || !S.brief.lender) return null; return CD.LENDERS.filter(function (l) { return l[0] === S.brief.lender; })[0] || null; }
function lenderRate(l) { var t = CD.TIERS[S.brief.tier] || CD.TIERS.good; return Math.round((t.lo + l[2]) * 100) / 100; }
function lenderLine(P) {
  var l = lenderOf(); if (!l || P.fin == null) return "";
  var mine = CD.pmt(P.fin, lenderRate(l), S.brief.term), diff = P.mo - mine;
  return '<div class="lender-line"><span>' + CD.esc(l[1]) + " at " + CD.pct(lenderRate(l)) + ": <b>" + CD.usd(mine) + "</b> a month</span><span class=\"" + (diff <= 0 ? "ok" : "warn") + '">' + (diff <= 0 ? "Desk rate beats it by " + CD.usd(-diff) : "Your lender saves " + CD.usd(diff)) + "</span></div>";
}
function revise(id, text) {
  var sim = S.sim[id]; if (!sim) return;
  S.revisions[id] = text; sim.revAt = Date.now();
  var q = Object.assign({}, sim.q); var lower = text.toLowerCase();
  if (lower.indexOf("fee") >= 0) q.fee = Math.max(0, q.fee - 200);
  if (lower.indexOf("add-on") >= 0 || lower.indexOf("add on") >= 0) q.add = 0;
  if (lower.indexOf("allowance") >= 0 || lower.indexOf("trade") >= 0) q.allow = q.allow + 300;
  if (lower.indexOf("rate") >= 0 || lower.indexOf("apr") >= 0) { var l = lenderOf(); q.apr = l ? Math.min(q.apr, lenderRate(l) - 0.1) : Math.round((q.apr - 0.5) * 100) / 100; }
  if (lower.indexOf("price") >= 0) q.price = Math.round(q.price * 0.99 / 10) * 10;
  if (JSON.stringify(q) === JSON.stringify(sim.q)) q.fee = Math.max(0, q.fee - 100);
  sim.rev = q; sim.revMsg = "Revised as asked: " + text + " Everything else stands. Still in writing, still valid for 7 days.";
}
function slots() {
  var out = [], d = new Date(), times = ["10:30 am", "1:00 pm", "5:30 pm"], i = 0;
  while (out.length < 3) { d = new Date(d.getTime() + 86400000); if (d.getDay() === 0) continue; out.push({ k: d.toISOString().slice(0, 10) + "|" + times[i], day: d.toLocaleDateString("en-US", { weekday: "long" }), date: CD.fmtDate(d, { month: "long", day: "numeric" }), time: times[i] }); i++; }
  return out;
}
function slotOf() { return slots().filter(function (s) { return S.slot && s.k === S.slot.k; })[0] || S.slot; }

/* ---- site/js/app/20-views.js ---- */
/* buyer workspace: step views (intro → dealers → offers). The record view lives in 30-record.js. */
var V = {};
function head(eye, h, l) { return '<div style="--i:0"><p class="eyebrow">' + eye + "</p><h1>" + h + '</h1><p class="lede">' + l + "</p></div>"; }
function seg(label, act, opts, cur, extra) { return '<div class="seg' + (extra ? " " + extra : "") + '" role="group" aria-label="' + CD.esc(label) + '">' + opts.map(function (o) { return '<button type="button" data-act="' + act + '" data-v="' + CD.esc(o[0]) + '"' + (o[0] === cur ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + ">" + CD.esc(o[1]) + "</button>"; }).join("") + "</div>"; }
function chips(act, opts, on) { return '<div class="chips">' + opts.map(function (o) { var k = typeof o === "string" ? o : o[0], n = typeof o === "string" ? o : o[1], isOn = on.indexOf(k) >= 0; return '<button type="button" class="chip' + (isOn ? " on" : "") + '" data-act="' + act + '" data-v="' + CD.esc(k) + '" aria-pressed="' + isOn + '">' + CD.esc(n) + "</button>"; }).join("") + "</div>"; }
function money(id, path, val, label, help) { return '<div class="field"><label for="' + id + '">' + label + '</label><div class="money-wrap"><input class="input money" id="' + id + '" type="number" inputmode="numeric" min="0" step="100" data-bind="' + path + '" value="' + CD.esc(val) + '"></div>' + (help ? '<span class="help">' + help + "</span>" : "") + "</div>"; }
function sel(id, path, val, label, opts) { return '<div class="field"><label for="' + id + '">' + label + '</label><select class="input" id="' + id + '" data-bind="' + path + '" data-rerender="1">' + opts.map(function (o) { return '<option value="' + CD.esc(o[0]) + '"' + (String(o[0]) === String(val) ? " selected" : "") + ">" + CD.esc(o[1]) + "</option>"; }).join("") + "</select></div>"; }

V.intro = function () {
  var m = CD.modelById("kia-telluride") || CD.models.filter(function (x) { return x.body === "suv" && CD.carSrc(x); })[0] || CD.models[0];
  return '<section class="intro-hero" style="--i:0"><div><p class="eyebrow">Buyer workspace · Demonstration with sample data</p><h1>Put your needs first. <i>Compare written deal terms.</i></h1><p class="lede">Choose the car from every brand Ourisman sells. Get itemized written offers from the rooftops near you, ranked by your terms. Check the contract against the offer before you sign. Nothing to pay.</p>' +
    '<div class="go"><button type="button" class="btn pri lg" data-act="start">Start your brief</button><button type="button" class="btn lg" data-act="know">I know the car</button><button type="button" class="ghost" data-act="sample">Try the sample →</button></div>' +
    '<ul class="intro-proof"><li>Two minutes to a brief. Three real models that fit it.</li><li>Dealers write to a private address you control.</li><li>Every offer priced the same way, for both sides of the desk.</li></ul></div>' +
    '<div>' + (m ? CD.car(m, "hero") : "") + '</div></section>' +
    '<div class="intro-cards" style="--i:1"><div class="card"><h4>Already have a deal?</h4><p>Open the record to message the desk, check the paperwork or finish the survey.</p>' + (S.status !== "new" ? '<button type="button" class="btn sm mt16" data-act="goto" data-v="record">Open my deal record</button>' : '<p class="small mt8">No deal in this browser yet.</p>') + '</div><div class="card"><h4>Browsing first?</h4><p>Every new model from 23 brands and the sample preowned lots, with starting prices.</p><a class="btn sm mt16" href="inventory.html">Open the inventory</a></div><div class="card"><h4>Run a dealership?</h4><p>See what the desk sees when a request arrives, and how it prices an answer.</p><a class="btn sm mt16" href="dealer.html">Open the dealer desk</a></div></div>';
};

V.brief = function () {
  var b = S.brief, r = { finance: [300, 1200, 10], lease: [200, 1000, 10], cash: [15000, 90000, 500] }[b.pay], L = limit(), z = CD.zip(b.zip);
  var bodies = CD.BODIES.filter(function (bd) { return CD.models.some(function (m) { return m.body === bd[0]; }); });
  if (!bodies.length) bodies = CD.BODIES.slice(0, 5);
  return head("Your brief", "What do you need, and what will you " + (b.pay === "cash" ? "pay" : "pay a month") + "?", "Start with the money. Everything that follows is measured against it. Taxes and fees are included in every figure, so the number you set is the number you will see.") +
    '<div class="two" style="--i:1"><div class="block"><h2>How you will pay</h2>' + seg("How you will pay", "pay", [["finance", "Finance"], ["lease", "Lease"], ["cash", "Cash"]], b.pay) +
    '<div class="range-head"><span class="label">' + (b.pay === "cash" ? "Out-the-door limit" : "Monthly limit") + '</span><span class="v" id="limit-out">' + CD.usd(L) + "<small>" + (b.pay === "cash" ? "all in" : "/mo") + '</small></span></div><input class="range" id="limit" type="range" min="' + r[0] + '" max="' + r[1] + '" step="' + r[2] + '" value="' + L + '" data-act="limit" aria-label="Limit">' +
    '<p class="band" id="band-out">' + bandText() + "</p>" +
    (b.pay === "finance" ? '<div class="fields">' + money("down", "brief.down", b.down, "Cash down") + sel("term", "brief.term", b.term, "Term", [[48, "48 months"], [60, "60 months"], [72, "72 months"], [84, "84 months"]]) + "</div>" : b.pay === "lease" ? '<div class="fields">' + money("das", "brief.das", b.das, "Due at signing") + sel("lterm", "brief.lterm", b.lterm, "Term", [[24, "24 months"], [36, "36 months"], [39, "39 months"]]) + sel("miles", "brief.miles", b.miles, "Miles a year", [[10000, "10,000"], [12000, "12,000"], [15000, "15,000"]]) + "</div>" : "") +
    '</div><div class="block"><h2>Where you are and your credit</h2><div class="zipline"><input class="input" id="zip" inputmode="numeric" maxlength="5" placeholder="ZIP" value="' + CD.esc(b.zip) + '" data-act="zip" aria-label="ZIP code"><span class="city' + (z ? "" : " bad") + '" id="zip-out">' + (z ? CD.esc(z.city + ", " + z.state) + " · " + (CD.TAX[z.state] ? CD.TAX[z.state].name : "") : "Enter a Maryland, Virginia or DC ZIP") + "</span></div>" +
    '<div class="field"><span class="l">Credit, as you understand it</span>' + seg("Credit tier", "tier", Object.keys(CD.TIERS).map(function (k) { return [k, CD.TIERS[k].n]; }), b.tier, "sm") + '<span class="help">Sets the rate range used for estimates. No credit check runs here.</span></div>' +
    '<div class="field"><span class="l">Rank offers by</span>' + seg("Ranking priority", "priority", PRIORITIES, b.priority, "sm") + '<span class="help">Only your priority and the priced terms order the offers. Dealers cannot change their position.</span></div></div></div>' +
    '<div class="block" style="--i:2"><h2>Body style</h2><div class="bodies">' + bodies.map(function (bd) { return '<button type="button" class="body-card' + (b.body === bd[0] ? " on" : "") + '" data-act="body" data-v="' + bd[0] + '" aria-pressed="' + (b.body === bd[0]) + '"><figure class="car">' + CD.bodySVG(bd[0]) + "</figure>" + CD.esc(bd[1]) + "</button>"; }).join("") + "</div>" +
    '<div class="row" style="--gap:14px"><span class="label">Size</span>' + seg("Size", "size", [["", "Any"]].concat(CD.SIZES), b.size, "sm") + "</div></div>" +
    '<div class="two" style="--i:3"><div class="block"><h2>Makes you prefer <span class="mute" style="letter-spacing:0;text-transform:none;font-weight:400">· optional</span></h2>' + chips("make", CD.brands, b.makes) + '</div><div class="block"><h2>Must-have features</h2>' + CD.FEAT_GROUPS.map(function (g) { return '<div><p class="small mb8">' + g.n + "</p>" + chips("feat", g.f.map(function (f) { return [f, CD.featName(f)]; }), b.feats) + "</div>"; }).join("") + "</div></div>";
};

function modelCard(x, on, i) {
  var m = x.m || x;
  return '<button type="button" class="model' + (on ? " on" : "") + '" data-act="pick" data-v="' + m.id + '" style="--i:' + (i || 0) + '" aria-pressed="' + !!on + '">' + (on ? '<span class="badge teal pickmark">Chosen</span>' : "") + CD.car(m) + '<h4><small>' + CD.esc(m.year + " " + m.make) + "</small>" + CD.esc(m.model + (m.trim ? " " + m.trim : "")) + "</h4>" +
    (x.need != null ? '<div class="need' + (x.over ? " over" : "") + '"><span>' + (S.brief.pay === "cash" ? "Out the door, est." : "Est. a month") + "</span><b>" + CD.usd(x.need) + "</b></div>" : '<div class="price">' + CD.usd(m.msrp) + " <small>starting MSRP, approx.</small></div>") +
    '<div class="tags">' + [CD.bodyName(m.body), CD.sizeName(m.size), CD.FUELS[m.fuel] || "", m.seats ? m.seats + " seats" : ""].filter(Boolean).map(function (t) { return "<span>" + CD.esc(t) + "</span>"; }).join("") + "</div>" +
    (x.m ? '<p class="why">' + CD.esc(explain(x)) + "</p>" : (m.tagline ? '<p class="why">' + CD.esc(m.tagline) + "</p>" : "")) + "</button>";
}
V.matches = function () {
  var n = S.showMore ? 6 : 3, list = matches(n), pick = S.pick ? CD.modelById(S.pick) : null;
  var inList = pick && list.some(function (x) { return x.m.id === pick.id; });
  return head("Your three", list.length ? (S.brief.makes.length ? "Three that fit, from the makes you listed." : "Three that fit the brief and the budget.") : "No model fits every part of that brief.", "Each card says why it made the list and what it would cost you, taxes and fees included. Pick one to continue, or search for any model Ourisman sells.") +
    '<div class="matches" style="--i:1">' + list.map(function (x, i) { return modelCard(x, pick && x.m.id === pick.id, i); }).join("") + "</div>" +
    (!S.showMore && CD.models.length > 3 ? '<div style="--i:2"><button type="button" class="btn sm" data-act="more">Show three more</button></div>' : "") +
    (pick && !inList ? '<div class="card teal" style="--i:2"><p class="label mb8">Your choice</p><div class="picked">' + CD.car(pick) + "<div><h3>" + CD.esc(pick.year + " " + pick.make + " " + pick.model + (pick.trim ? " " + pick.trim : "")) + '</h3><p class="soft mt8">' + CD.esc(pick.tagline || "") + " · " + CD.usd(pick.msrp) + ' starting MSRP, approx.</p><p class="small mt8">Estimated ' + (S.brief.pay === "cash" ? "out the door " : "a month ") + "<b>" + CD.usd(needFor(pick)) + "</b></p></div></div></div>" : "") +
    '<div class="block search" style="--i:3"><h2>Know exactly what you want?</h2><input class="input" id="msearch" placeholder="Search any model, e.g. Sorento, Tacoma, Civic" data-act="search" aria-label="Search models" autocomplete="off"><div class="results" id="mresults" hidden></div></div>';
};

V.trade = function () {
  var t = S.brief.trade, est = tradeEstimate(t), pick = CD.modelById(S.pick);
  return head("Your trade", t.has ? "Show the desk the car before you arrive." : "Do you have a car to trade?", "Four photos, the odometer and the last six of the VIN. The desk prices the allowance from what it sees here, so the number is in the written offer and not a surprise at the visit.") +
    '<div style="--i:1">' + seg("Trade", "trade", [["yes", "Yes, I have a trade"], ["no", "No trade"]], t.has ? "yes" : "no") + "</div>" +
    (t.has ? '<div class="two" style="--i:2"><div class="block"><h2>The car</h2><div class="fields"><div class="field"><label for="ty">Year</label><input class="input" id="ty" type="number" inputmode="numeric" min="1990" max="2026" data-bind="brief.trade.year" value="' + CD.esc(t.year) + '"></div><div class="field"><label for="tmk">Make</label><input class="input" id="tmk" data-bind="brief.trade.make" value="' + CD.esc(t.make) + '" placeholder="Honda"></div><div class="field"><label for="tmd">Model</label><input class="input" id="tmd" data-bind="brief.trade.model" value="' + CD.esc(t.model) + '" placeholder="Accord"></div><div class="field"><label for="tmi">Mileage</label><input class="input" id="tmi" type="number" inputmode="numeric" min="0" step="1000" data-bind="brief.trade.miles" value="' + CD.esc(t.miles) + '"></div>' + sel("tc", "brief.trade.cond", t.cond, "Condition", CONDS) + money("tp", "brief.trade.payoff", t.payoff, "Loan payoff", "Zero if the car is paid off") + '<div class="field"><label for="tv">VIN, last six</label><input class="input" id="tv" maxlength="6" data-bind="brief.trade.vin6" value="' + CD.esc(t.vin6) + '" placeholder="A04217" style="text-transform:uppercase"></div></div>' +
      '<div class="inset" id="est-out">' + estHTML(est, t) + "</div></div>" +
      '<div class="block"><h2>Photos</h2><div class="photo-tiles">' + SHOTS.map(function (s) { var done = t.photos.indexOf(s[0]) >= 0, img = media[s[0]]; return '<label class="tile' + (done ? " done" : "") + '" for="ph-' + s[0] + '">' + (img ? '<img src="' + img + '" alt="">' : "") + '<span><b>' + s[1] + "</b>" + (done ? "Added" : "Tap to add") + '</span><input type="file" accept="image/*" capture="environment" id="ph-' + s[0] + '" data-act="photo" data-v="' + s[0] + '" class="sr-only"></label>'; }).join("") + '</div><p class="note">Photos stay on this device in the demonstration. In the product they travel with the request to the rooftops you choose, and nowhere else.</p>' + (pick ? '<div class="callout"><span>' + CD.icon("info") + "</span><span>Trading toward the <b>" + CD.esc(pick.year + " " + pick.make + " " + pick.model) + "</b>. Equity, positive or negative, is carried into every offer.</span></div>" : "") + "</div></div>" :
      '<div class="callout" style="--i:2"><span>' + CD.icon("info") + "</span><span>No trade means every offer is priced on the car alone. You can add a trade later from the deal record.</span></div>");
};
function estHTML(est, t) {
  if (!est) return '<p class="small">Enter the year, make and model to see the allowance range dealers typically start from.</p>';
  var eq = est.mid - (+t.payoff || 0);
  return '<p class="label mb8">Allowance range dealers typically start from</p><div class="est"><b>' + CD.usd(est.lo) + "</b><span class=\"mute\">to</span><b>" + CD.usd(est.hi) + "</b></div><p class=\"small mt8\">An estimate from age, mileage and condition, not an appraisal. " + (t.payoff > 0 ? "After the " + CD.usd(t.payoff) + " payoff, that is about <b>" + CD.usd(eq) + "</b> of " + (eq < 0 ? "negative " : "") + "equity." : "No payoff, so the full allowance is equity.") + "</p>";
}

V.payment = function () {
  var b = S.brief, tier = CD.TIERS[b.tier], pick = CD.modelById(S.pick);
  return head("Your payment", "Set the terms every offer will be priced against.", "Dealers see your limit and your term. They do not see your credit file. If you bring a lender rate, the desk sees the number it has to beat.") +
    '<div class="two" style="--i:1"><div class="block"><h2>Terms</h2>' + seg("How you will pay", "pay", [["finance", "Finance"], ["lease", "Lease"], ["cash", "Cash"]], b.pay) +
    '<div class="range-head"><span class="label">' + (b.pay === "cash" ? "Out-the-door limit" : "Monthly limit") + '</span><span class="v" id="limit-out">' + CD.usd(limit()) + "<small>" + (b.pay === "cash" ? "all in" : "/mo") + '</small></span></div><input class="range" id="limit" type="range" min="' + { finance: 300, lease: 200, cash: 15000 }[b.pay] + '" max="' + { finance: 1200, lease: 1000, cash: 90000 }[b.pay] + '" step="' + { finance: 10, lease: 10, cash: 500 }[b.pay] + '" value="' + limit() + '" data-act="limit" aria-label="Limit">' +
    (b.pay === "finance" ? '<div class="fields">' + money("down", "brief.down", b.down, "Cash down") + sel("term", "brief.term", b.term, "Term", [[48, "48 months"], [60, "60 months"], [72, "72 months"], [84, "84 months"]]) + "</div>" : b.pay === "lease" ? '<div class="fields">' + money("das", "brief.das", b.das, "Due at signing") + sel("lterm", "brief.lterm", b.lterm, "Term", [[24, "24 months"], [36, "36 months"], [39, "39 months"]]) + sel("miles", "brief.miles", b.miles, "Miles a year", [[10000, "10,000"], [12000, "12,000"], [15000, "15,000"]]) + "</div>" : '<p class="small">Cash offers are compared on the out-the-door figure less your trade equity.</p>') +
    (pick ? '<div class="inset"><p class="label mb8">' + CD.esc(pick.year + " " + pick.make + " " + pick.model) + ' at starting MSRP</p><p class="band" id="band-out">About <b>' + CD.usd(needFor(pick)) + "</b> " + (b.pay === "cash" ? "out the door" : "a month") + " at " + tier.n.toLowerCase() + "-credit rates, before any dealer discount or rebate. " + (needFor(pick) <= limit() ? '<span class="ok">Under your cap.</span>' : '<span class="warn">' + CD.usd(needFor(pick) - limit()) + " over your cap; the written offers will show what each rooftop can do.</span>") + "</p></div>" : "") + "</div>" +
    '<div class="block"><h2>' + (b.pay === "finance" ? "Bring a lender rate" : "Lenders") + '</h2>' + (b.pay === "finance" ? '<p class="small">Lenders pay ClearDrive a flat fee to list a real rate for your credit tier. They are sorted by rate only. Choose one and every desk sees the rate it has to beat; choose none and the desk quotes its own.</p><div class="lenders">' + CD.LENDERS.slice().sort(function (x, y) { return x[2] - y[2]; }).map(function (l) { var on = b.lender === l[0]; return '<button type="button" class="lender' + (on ? " on" : "") + '" data-act="lender" data-v="' + l[0] + '" aria-pressed="' + on + '"><span class="dot" style="background:' + (on ? "var(--teal)" : "var(--line2)") + '"></span><span><b>' + CD.esc(l[1]) + "</b><small>" + CD.esc(l[3]) + '</small></span><span class="rate">' + CD.pct(lenderRate(l)) + "<small>APR</small></span></button>"; }).join("") + '<button type="button" class="lender' + (!b.lender ? " on" : "") + '" data-act="lender" data-v="" aria-pressed="' + !b.lender + '"><span class="dot" style="background:' + (!b.lender ? "var(--teal)" : "var(--line2)") + '"></span><span><b>Let the desk quote its own rate</b><small>You can still compare it with a rate of your own later</small></span><span></span></button></div>' : '<p class="small">Lender rates apply to financed deals. Switch to Finance to compare a rate.</p>') + "</div></div>";
};

V.protect = function () {
  var b = S.brief, list = CD.PRODUCTS.filter(function (p) { return !(p[0] === "gap" && b.pay === "cash"); });
  return head("Your protection", "Decide now which products a dealer may quote.", "These are sold at the desk, often at the end of a long visit. Decide here, with time to read. Only a product you mark \"yes\" can carry a price on any offer, whatever the desk types.") +
    '<div class="prods" style="--i:1">' + list.map(function (p) { var cur = b.prot[p[0]] || "ask"; return '<div class="prod"><h4>' + CD.esc(p[1]) + '</h4><p>' + CD.esc(p[2]) + '</p><div class="radio-cards">' + ["yes", "no", "ask"].map(function (k) { return '<button type="button" class="radio-card' + (cur === k ? " on" : "") + '" data-act="prot" data-v="' + p[0] + ":" + k + '" aria-pressed="' + (cur === k) + '"><span class="tick"></span><span><b>' + CD.PROTWORD[k] + "</b><small>" + ({ yes: "The desk prices it on the written offer, at its own price.", no: "It cannot appear on any offer or contract line.", ask: "No price on the offer. The desk explains it at the visit." }[k]) + "</small></span></button>"; }).join("") + "</div></div>"; }).join("") + "</div>" +
    '<div class="callout gold" style="--i:2"><span>' + CD.icon("shield") + '</span><span><b>ClearDrive publishes no price guide for these products.</b> Dealers set their own prices. The paperwork check later flags any product on the contract that you did not ask for.</span></div>';
};

V.account = function () {
  var b = S.brief, alias = S.alias || (b.name ? makeAlias(b.name) : null);
  return head("Private address", "Dealers write to an address you control.", "Your phone number, email and home address never leave this workspace. Rooftops reply to a ClearDrive address that forwards to you and can be closed with one tap.") +
    '<div class="two" style="--i:1"><div class="block"><h2>Your name</h2><div class="field"><label for="name">First and last name</label><input class="input" id="name" data-bind="brief.name" data-act="name" value="' + CD.esc(b.name) + '" placeholder="Jordan Ellis" autocomplete="name"></div>' +
    '<div class="alias-box"><span class="label">Your ClearDrive address</span><span class="alias" id="alias-out">' + (alias ? aliasHTML(alias) : '<span class="mute">Appears when you enter your name</span>') + '</span><span class="small">Rooftops see this address and nothing else. It stops forwarding when you close the deal.</span></div>' +
    '<label class="check"><input type="checkbox" id="consent" data-act="consent"' + (S.consent ? " checked" : "") + '><span>Send my brief, my trade photos and this address to the rooftops I choose on the next screen, and nowhere else.</span></label></div>' +
    '<div class="block"><h2>What the desk sees</h2><div class="sees"><div class="card sm"><p class="label mb8 teal">Sent to the rooftops you pick</p><ul class="check-list"><li>The model and trim</li><li>How you will pay and your limit</li><li>Your required features and priorities</li><li>The trade, with photos and odometer</li><li>Which protection products to quote</li><li>Your lender rate, if you chose one</li><li>' + (alias ? CD.esc(alias) : "Your ClearDrive address") + "</li></ul></div>" +
    '<div class="card sm"><p class="label mb8 bad">Never sent</p><ul class="check-list x"><li>Your phone number</li><li>Your personal email</li><li>Your home address</li><li>Your credit file or score</li><li>Other dealers\' offers</li><li>Anything after you close the address</li></ul></div></div></div></div>';
};
function aliasHTML(a) { var p = a.split("@"); return CD.esc(p[0]) + '<span class="dom">@' + CD.esc(p[1] || "") + "</span>"; }

V.dealers = function () {
  var pick = CD.modelById(S.pick), z = CD.zip(S.brief.zip) || { lat: 38.846, lng: -77.327 }, near = pick ? CD.nearest(z, pick.make, 6) : [], sisters = [];
  if (pick && !near.length) sisters = CD.nearest(z, null, 3);
  return head("Dealers", near.length ? "Ourisman rooftops that sell the " + CD.esc(pick.make) + ", nearest first." : "No Ourisman rooftop sells that make directly.", near.length ? "Pick up to three. Each one receives the same brief and answers in writing to your private address. Booking a drive is the default; written pricing comes first if you ask for it." : "The group routes the request to the nearest sister rooftop, which works it with the brand store that can source the car.") +
    '<div style="--i:1">' + seg("What to ask for", "way", [["drive", "Book a test drive"], ["price", "Ask for written pricing"]], S.way) + "</div>" +
    '<div class="roofs" style="--i:2">' + (near.length ? near : sisters).map(function (x) { var r = x.r, on = S.rooftops.indexOf(r.id) >= 0; return '<div class="rooftop' + (on ? " on" : "") + '"><span class="brand">' + CD.brandAbbr(r.brands[0]) + "</span><span><b>" + CD.esc(r.name) + "</b><small>" + CD.esc(r.street + ", " + r.city + ", " + r.state) + " · " + CD.esc(r.brands.join(", ")) + '</small></span><span class="dist">' + CD.miles(x.d) + "<small>from " + CD.esc(S.brief.zip) + '</small><button type="button" class="btn sm' + (on ? " pri" : "") + ' mt8" data-act="roof" data-v="' + r.id + '" aria-pressed="' + on + '">' + (on ? "Selected" : "Select") + "</button></span></div>"; }).join("") + "</div>" +
    '<div class="callout" style="--i:3"><span>' + CD.icon("lock") + "</span><span><b>" + S.rooftops.length + " of 3 selected.</b> The rooftops receive your brief as a lead in their own CRM, with the trade photos attached, and reply to <b>" + CD.esc(S.alias || "your private address") + "</b>. The response clock starts when you send.</span></div>";
};

V.offers = function () {
  var pick = CD.modelById(S.pick), all = offers(), list = ranked(), waiting = all.filter(function (o) { return !o.arrived; }), chosen = S.chosen;
  var html = head("Written offers", list.length ? (list.length + " written " + CD.plural(list.length, "offer") + " for the " + CD.esc(pick ? pick.make + " " + pick.model : "car") + ", ranked by " + PRIORITIES.filter(function (p) { return p[0] === S.brief.priority; })[0][1].toLowerCase() + ".") : "Your request is with " + all.length + " " + CD.plural(all.length, "rooftop") + ".", "Every offer is priced the same way, with " + (CD.TAX[S.brief.state] || CD.TAX.VA).name + " and registration included. Ask for a change, or choose one and book the visit. Saved terms are frozen once you book.") +
    '<div class="row between" style="--i:1;--gap:12px"><span class="label">Rank by</span>' + seg("Ranking priority", "priority", PRIORITIES, S.brief.priority, "sm") + '<span class="sp"></span><span class="small">Sent ' + (S.askedAt ? CD.ago(Date.now() - S.askedAt) + " ago" : "") + " to " + CD.esc(S.alias || "") + "</span></div>";
  if (waiting.length) html += '<div class="waiting" style="--i:2">' + waiting.map(function (o) { return '<div class="row between"><span>' + CD.esc(o.r ? o.r.name : o.rooftop) + ' is writing…</span><span class="clock">' + CD.clock(Date.now() - S.askedAt) + "</span></div>"; }).join("") + "</div>";
  html += '<div class="offers" style="--i:2">' + list.map(function (o, i) { return offerCard(o, i, chosen); }).join("") + "</div>";
  if (chosen && !S.saved) {
    var o = offerFor(chosen);
    html += '<div class="card teal" style="--i:3"><p class="label mb8">Book the visit · ' + CD.esc(o.r ? o.r.name : chosen) + '</p><h3>Pick a time. The written offer travels with the appointment.</h3><div class="slots mt16">' + slots().map(function (s) { var on = S.slot && S.slot.k === s.k; return '<button type="button" class="slot' + (on ? " on" : "") + '" data-act="slot" data-v="' + s.k + '" aria-pressed="' + !!on + '"><b>' + s.day + "</b><span>" + s.date + " · " + s.time + "</span><small>" + (S.way === "drive" ? "Test drive, 45 minutes" : "Review the offer, 30 minutes") + "</small></button>"; }).join("") + '</div><div class="row mt16" style="--gap:10px"><button type="button" class="btn pri" data-act="book"' + (S.slot ? "" : " disabled") + ">Book and freeze these terms</button><span class=\"small\">The desk gets the appointment, your alias and the offer it wrote. Nothing else.</span></div></div>";
  }
  if (S.saved) html += '<div class="callout ok" style="--i:3"><span>' + CD.icon("check") + "</span><span><b>Booked with " + CD.esc((CD.rooftopById(S.saved.rooftop) || {}).name || S.saved.rooftop) + "</b> for " + CD.esc(S.saved.slotText || "") + ". The terms are saved as a snapshot; a later revision cannot replace them. Continue to the deal record.</span></div>";
  return html;
}
function offerCard(o, i, chosen) {
  var P = o.priced, b = S.brief, q = o.q, r = o.r, isChosen = chosen === o.rooftop, pick = CD.modelById(S.pick), t = CD.TAX[b.state] || CD.TAX.VA;
  var rows = '<div><dt>Selling price</dt><dd>' + CD.usd(q.price) + "</dd></div>" + (q.fee ? "<div><dt>Processing fee" + (q.fee > 500 && (r && r.state === "VA") ? ", negotiable in Virginia" : "") + "</dt><dd>" + CD.usd(q.fee) + "</dd></div>" : "") + (q.add ? '<div class="flag"><dt>Add-ons, optional</dt><dd>' + CD.usd(q.add) + "</dd></div>" : "") +
    Object.keys(P.prod).map(function (k) { var p = CD.PRODUCTS.filter(function (x) { return x[0] === k; })[0]; return '<div class="sub"><dt>' + CD.esc(p ? p[1] : k) + ", as you asked</dt><dd>" + CD.usd(P.prod[k]) + "</dd></div>"; }).join("") +
    "<div><dt>" + CD.esc(t.name) + "</dt><dd>" + CD.usd(P.tax) + "</dd></div><div><dt>Title and registration</dt><dd>" + CD.usd(P.reg) + '</dd></div><div class="total"><dt>Out the door</dt><dd>' + CD.usd(P.otd) + "</dd></div>" +
    (b.trade.has ? "<div><dt>Trade allowance · " + CD.esc(b.trade.year + " " + b.trade.make + " " + b.trade.model) + "</dt><dd>−" + CD.usd(P.allow) + "</dd></div>" + (P.payoff ? "<div><dt>Loan payoff</dt><dd>" + CD.usd(P.payoff) + "</dd></div>" : "") : "") +
    (b.pay === "finance" ? "<div><dt>Cash down</dt><dd>−" + CD.usd(b.down) + '</dd></div><div class="total"><dt>Amount financed</dt><dd>' + CD.usd(P.fin) + "</dd></div><div><dt>" + b.term + " months at " + CD.pct(q.apr) + " APR</dt><dd>" + CD.usd(P.mo) + " a month</dd></div>" :
      b.pay === "lease" ? "<div><dt>Due at signing</dt><dd>" + CD.usd(b.das) + "</dd></div><div><dt>" + b.lterm + " months · " + CD.n(b.miles) + " miles a year</dt><dd>" + CD.usd(P.mo) + " a month</dd></div>" : '<div class="total"><dt>You pay' + (b.trade.has ? " after trade" : "") + "</dt><dd>" + CD.usd(P.due) + "</dd></div>");
  return '<article class="card offer' + (isChosen ? " chosen" : "") + '" style="--i:' + (i + 2) + '">' + (i === 0 ? '<span class="badge teal rank">Best by your priority</span>' : "") +
    '<div class="top"><div><h3>' + CD.esc(r ? r.name : o.rooftop) + "</h3><small>" + CD.esc(r ? r.city + ", " + r.state : "") + (o.stock ? " · " + CD.esc(o.stock) : "") + " · replied in " + CD.clock(o.at - (S.askedAt || o.at)) + "</small></div>" + (o.desk ? '<span class="badge gold">Replied by the desk</span>' : o.revised ? '<span class="badge info">Revised</span>' : '<span class="badge plain">Written offer</span>') + "</div>" +
    '<div class="pay' + (P.under ? " under" : " over") + '"><b>' + CD.usd(b.pay === "cash" ? P.due : P.mo) + (b.pay === "cash" ? "" : "<small>/mo</small>") + '</b><span class="cap">' + (P.under ? CD.usd(P.gap) + " under your cap" : CD.usd(-P.gap) + " over your cap") + "<br>" + CD.esc(pick ? pick.year + " " + pick.make + " " + pick.model + (pick.trim ? " " + pick.trim : "") : "") + "</span></div>" +
    '<dl class="kv">' + rows + "</dl>" + lenderLine(P) +
    (o.msg ? '<div class="msg them">' + CD.esc(o.msg) + "<small>" + CD.esc(r ? r.short || r.name : "") + " · " + CD.fmtTime(o.at) + "</small></div>" : "") +
    (S.revisions[o.rooftop] && !o.revised ? '<div class="msg me">' + CD.esc(S.revisions[o.rooftop]) + "<small>You · change requested, the desk is revising</small></div>" : "") +
    '<div class="acts">' + (S.saved ? (isChosen ? '<span class="badge ok">Booked · terms saved</span>' : "") : '<button type="button" class="btn sm" data-act="change" data-v="' + o.rooftop + '">Ask for a change</button><button type="button" class="btn sm' + (isChosen ? "" : " pri") + '" data-act="choose" data-v="' + o.rooftop + '">' + (isChosen ? "Chosen" : "Choose this offer") + "</button>") + "</div></article>";
}

/* ---- site/js/app/30-record.js ---- */
/* buyer workspace: the deal record (timeline, messages, paperwork check, survey) */
var ASK = {
  price: "Ask why the selling price differs from the written offer. The offer is valid for seven days.",
  fee: "Ask which fee this is, and whether the state requires it. Processing fees are negotiable in Virginia and capped at $500 in Maryland.",
  add: "Add-ons are optional. Ask for each one to be listed and priced, and decline what you do not want.",
  allow: "Ask what changed on inspection. The allowance was priced from your photos and odometer.",
  payoff: "Ask for the payoff letter. The number should match your lender's figure to the day.",
  apr: "Ask whether this is the rate you were approved at, or a marked-up rate. You may use your own lender.",
  mo: "Ask for the payment to be recomputed from the figures on this page. It should match to the dollar.",
  prod: "This product was not quoted. Ask for it to be removed, or for the price to match the offer if you now want it."
};
function savedPaper() {
  var s = S.saved; if (!s) return null;
  var P = s.priced, q = s.q, X = { price: q.price, fee: q.fee || 0, add: q.add || 0, allow: P.allow, payoff: P.payoff, apr: q.apr, mo: Math.round(P.mo || 0) };
  CD.PRODUCTS.forEach(function (p) { X["p_" + p[0]] = P.prod[p[0]] || 0; });
  return X;
}
function samplePaper() { var P = savedPaper(); if (!P) return null; var X = Object.assign({}, P); X.fee += 200; return X; }
function audit() {
  var P = savedPaper(), X = S.paper, F = [], b = S.brief; if (!P || !X) return { F: [], lines: [] };
  var lines = [];
  function line(k, name, want, got, money) { var diff = (+got || 0) - (+want || 0), flag = Math.abs(diff) > (k === "apr" ? 0.009 : 0.5); if (flag) F.push(k); lines.push({ k: k, name: name, want: want, got: got, diff: diff, flag: flag, money: money !== false }); }
  line("price", "Selling price", P.price, X.price);
  line("fee", "Processing fee", P.fee, X.fee);
  line("add", "Add-ons", P.add, X.add);
  CD.PRODUCTS.forEach(function (p) { if (b.pay === "cash" && p[0] === "gap") return; var want = P["p_" + p[0]], got = +X["p_" + p[0]] || 0; var flag = Math.abs(got - want) > 0.5; if (flag) F.push("prod"); lines.push({ k: "prod", name: p[1] + (b.prot[p[0]] === "yes" ? ", quoted" : b.prot[p[0]] === "no" ? ", declined" : ", not quoted"), want: want, got: got, diff: got - want, flag: flag, money: true }); });
  if (b.trade.has) { line("allow", "Trade allowance", P.allow, X.allow); line("payoff", "Loan payoff", P.payoff, X.payoff); }
  if (b.pay === "finance") { line("apr", "APR", P.apr, X.apr, false); line("mo", "Monthly payment", P.mo, X.mo); }
  if (b.pay === "lease") line("mo", "Monthly payment", P.mo, X.mo);
  return { F: F, lines: lines };
}
function gradeFromSurvey() { var sc = { yes: 100, mostly: 60, no: 0 }, t = 0, n = 0; CD.SURVEY.forEach(function (q, i) { if (S.survey[i]) { t += sc[S.survey[i]]; n++; } }); if (!n) return null; var a = t / n; return a >= 92 ? "A" : a >= 80 ? "A−" : a >= 70 ? "B+" : a >= 55 ? "B" : a >= 40 ? "B−" : "C"; }

V.record = function () {
  var s = S.saved, r = s ? CD.rooftopById(s.rooftop) : null, pick = CD.modelById(S.pick), tab = S.rtab || "timeline";
  if (!s) return head("Deal record", "No offer saved yet.", "Choose a written offer and book the visit; the record opens with the saved terms frozen.") + '<div style="--i:1"><button type="button" class="btn pri" data-act="goto" data-v="offers">Back to the offers</button></div>';
  var tabs = [["timeline", "Timeline"], ["messages", "Messages"], ["paper", "Paperwork check"], ["survey", "Survey"]];
  return head("Deal record · " + CD.esc(S.id || ""), CD.esc(pick ? pick.year + " " + pick.make + " " + pick.model + (pick.trim ? " " + pick.trim : "") : "Your deal") + " <i>at " + CD.esc(r ? r.short || r.name : s.rooftop) + "</i>", "The saved offer, the visit, the messages and the paperwork check in one place. Saved terms are frozen: a later revision from the desk cannot replace them.") +
    '<div class="tabs rec-tabs" style="--i:1" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-act="rtab" data-v="' + t[0] + '"' + (tab === t[0] ? ' class="on" aria-selected="true"' : ' aria-selected="false"') + ">" + t[1] + (t[0] === "paper" && S.paper && audit().F.length ? '<span class="count">' + audit().F.length + "</span>" : "") + "</button>"; }).join("") + "</div>" +
    '<div class="record" style="--i:2"><div class="card">' + savedCard() + "</div><div>" + ({ timeline: timelineHTML, messages: messagesHTML, paper: paperHTML, survey: surveyHTML }[tab])() + "</div></div>";
};
function savedCard() {
  var s = S.saved, P = s.priced, q = s.q, b = S.brief, r = CD.rooftopById(s.rooftop), t = CD.TAX[b.state] || CD.TAX.VA;
  return '<div class="head"><div><p class="label">Saved terms · frozen ' + CD.fmtDate(s.at) + "</p><h3>" + CD.esc(r ? r.name : s.rooftop) + '</h3></div><span class="badge ok">Booked</span></div>' +
    '<div class="pay under" style="margin-bottom:14px"><b>' + CD.usd(b.pay === "cash" ? P.due : P.mo) + (b.pay === "cash" ? "" : "<small>/mo</small>") + '</b><span class="cap">' + CD.esc(s.slotText || "") + "</span></div>" +
    '<dl class="kv"><div><dt>Selling price</dt><dd>' + CD.usd(q.price) + "</dd></div><div><dt>Processing fee</dt><dd>" + CD.usd(q.fee || 0) + "</dd></div>" + (q.add ? "<div><dt>Add-ons</dt><dd>" + CD.usd(q.add) + "</dd></div>" : "") + Object.keys(P.prod).map(function (k) { var p = CD.PRODUCTS.filter(function (x) { return x[0] === k; })[0]; return '<div class="sub"><dt>' + CD.esc(p ? p[1] : k) + "</dt><dd>" + CD.usd(P.prod[k]) + "</dd></div>"; }).join("") + "<div><dt>" + CD.esc(t.name) + "</dt><dd>" + CD.usd(P.tax) + "</dd></div><div><dt>Title and registration</dt><dd>" + CD.usd(P.reg) + '</dd></div><div class="total"><dt>Out the door</dt><dd>' + CD.usd(P.otd) + "</dd></div>" +
    (b.trade.has ? "<div><dt>Trade allowance</dt><dd>−" + CD.usd(P.allow) + "</dd></div>" + (P.payoff ? "<div><dt>Loan payoff</dt><dd>" + CD.usd(P.payoff) + "</dd></div>" : "") : "") +
    (b.pay === "finance" ? "<div><dt>Cash down</dt><dd>−" + CD.usd(b.down) + "</dd></div><div><dt>Amount financed</dt><dd>" + CD.usd(P.fin) + "</dd></div><div><dt>" + b.term + " months at " + CD.pct(q.apr) + "</dt><dd>" + CD.usd(P.mo) + " a month</dd></div>" : b.pay === "lease" ? "<div><dt>Due at signing</dt><dd>" + CD.usd(b.das) + "</dd></div><div><dt>" + b.lterm + " months</dt><dd>" + CD.usd(P.mo) + " a month</dd></div>" : "") + "</dl>" +
    '<p class="note mt16">Alias ' + CD.esc(S.alias || "") + " · " + (r ? CD.esc(r.street + ", " + r.city) : "") + "</p>";
}
function timelineHTML() {
  var s = S.saved, items = [], n = offers().filter(function (o) { return o.arrived; }).length, grade = gradeFromSurvey();
  items.push(["done", "Request sent", "To " + S.rooftops.length + " " + CD.plural(S.rooftops.length, "rooftop") + " from " + CD.esc(S.alias || "your private address") + ".", S.askedAt]);
  items.push(["done", n + " written " + CD.plural(n, "offer") + " received", "Ranked by your priority. Nothing a dealer did changed the order.", S.askedAt ? S.askedAt + 7000 : null]);
  items.push(["done", "Offer chosen and visit booked", CD.esc(s.slotText || "") + " · terms frozen as a snapshot.", s.at]);
  items.push([S.visited ? "done" : "now", "The visit", S.way === "drive" ? "Drive the car. The written offer is already on the desk." : "Review the offer at the desk. Nothing on it should move.", null, S.visited ? "" : '<button type="button" class="btn sm mt8" data-act="visited">We met · open the paperwork check</button>']);
  items.push([S.paper ? (audit().F.length ? "now" : "done") : "", "Paperwork check", S.paper ? (audit().F.length ? audit().F.length + " " + CD.plural(audit().F.length, "line") + " to ask about before you sign." : "Every line matches the saved offer.") : "Enter the contract figures at the desk; each line is checked against the offer.", null, S.paper ? "" : '<button type="button" class="btn sm mt8" data-act="rtab" data-v="paper">Open the check</button>']);
  items.push([S.surveyDone ? "done" : "", "Three questions after the sale", S.surveyDone ? "Thank you. Your answers feed " + CD.esc((CD.rooftopById(s.rooftop) || {}).short || "the dealer") + "'s public grade" + (grade ? " (" + grade + " from your answers)" : "") + "." : "Was the price the one you were shown? Did the paperwork match? Was your time respected?", null, S.surveyDone ? "" : '<button type="button" class="btn sm mt8" data-act="rtab" data-v="survey">Answer them</button>']);
  return '<ul class="tl">' + items.map(function (it) { return '<li class="tl-item ' + it[0] + '"><span class="tl-dot" aria-hidden="true"></span><div class="tl-body">' + (it[3] ? '<div class="when">' + CD.fmtDate(it[3]) + " · " + CD.fmtTime(it[3]) + "</div>" : "") + "<h3>" + it[1] + "</h3><p>" + it[2] + "</p>" + (it[4] || "") + "</div></li>"; }).join("") + "</ul>";
}
function messagesHTML() {
  var r = CD.rooftopById(S.saved.rooftop);
  return '<div class="card sm"><p class="label mb16">Messages · ' + CD.esc(r ? r.short || r.name : "") + '</p><div class="thread">' + (S.thread.length ? S.thread.map(function (m) { return '<div class="msg ' + (m.who === "buyer" ? "me" : m.who === "sys" ? "sys" : "them") + '">' + CD.esc(m.text) + (m.who === "sys" ? "" : "<small>" + (m.who === "buyer" ? "You" : CD.esc(r ? r.short || r.name : "Desk")) + " · " + CD.fmtTime(m.at) + "</small>") + "</div>"; }).join("") : '<div class="msg sys">Messages stay inside the deal record. The desk never gets your phone number or email.</div>') + '</div><div class="msgbox"><input class="input" id="msg" placeholder="Ask the desk anything about the offer" aria-label="Message"><button type="button" class="btn pri sm" data-act="send">Send</button></div><p class="note mt8">Replies in this demonstration are simulated.</p></div>';
}
function paperHTML() {
  var P = savedPaper(), X = S.paper, b = S.brief;
  if (!X) return '<div class="card sm"><p class="label mb8">Paperwork check</p><h3>At the desk, with the contract in front of you.</h3><p class="soft mt8">Enter the figures from the buyer\'s order or retail installment contract. Each line is compared with the offer you saved. A sample contract is loaded with one line changed so you can see how a difference is flagged.</p><div class="row mt16" style="--gap:10px"><button type="button" class="btn pri" data-act="paper-sample">Load the sample contract</button><button type="button" class="btn" data-act="paper-blank">Enter my own figures</button></div></div>';
  var a = audit();
  var fields = [["price", "Selling price"], ["fee", "Processing fee"], ["add", "Add-ons"]].concat(CD.PRODUCTS.filter(function (p) { return !(b.pay === "cash" && p[0] === "gap"); }).map(function (p) { return ["p_" + p[0], p[1]]; })).concat(b.trade.has ? [["allow", "Trade allowance"], ["payoff", "Loan payoff"]] : []).concat(b.pay === "finance" ? [["apr", "APR %"], ["mo", "Monthly payment"]] : b.pay === "lease" ? [["mo", "Monthly payment"]] : []);
  return '<div class="card sm paper"><div class="head"><div><p class="label">Paperwork check</p><h3>' + (a.F.length ? a.F.length + " " + CD.plural(a.F.length, "line") + " to ask about" : "Every line matches the offer") + "</h3></div>" + (a.F.length ? '<span class="badge warn">Do not sign yet</span>' : '<span class="badge ok">Matches</span>') + '</div><div class="fields">' + fields.map(function (f) { return '<div class="field"><label for="pp-' + f[0] + '">' + CD.esc(f[1]) + '</label><input class="input money sm" id="pp-' + f[0] + '" type="number" step="' + (f[0] === "apr" ? "0.01" : "1") + '" data-paper="' + f[0] + '" value="' + CD.esc(X[f[0]] == null ? "" : X[f[0]]) + '"></div>'; }).join("") + "</div>" +
    '<div class="audit mt16">' + a.lines.map(function (l) { return '<div class="line' + (l.flag ? " flag" : "") + '"><span>' + CD.esc(l.name) + '</span><span class="d">' + (l.flag ? (l.money ? (l.diff > 0 ? "+" : "−") + CD.usd(Math.abs(l.diff)) : (l.diff > 0 ? "+" : "−") + Math.abs(l.diff).toFixed(2) + " pts") + " vs offer" : "Matches") + "</span>" + (l.flag ? "<p>" + CD.esc(ASK[l.k]) + "</p>" : "") + "</div>"; }).join("") + "</div>" +
    '<div class="row mt16" style="--gap:10px"><button type="button" class="btn sm" data-act="paper-sample">Reload the sample</button><button type="button" class="btn sm" data-act="paper-clear">Clear</button><span class="small">Offer figures are the saved snapshot. Nothing here changes them.</span></div></div>';
}
function surveyHTML() {
  var r = CD.rooftopById(S.saved.rooftop), grade = gradeFromSurvey(), done = CD.SURVEY.every(function (q, i) { return S.survey[i]; });
  return '<div class="card sm survey"><p class="label mb8">Three questions · ' + CD.esc(r ? r.short || r.name : "") + '</p><h3>' + (S.surveyDone ? "Thank you." : "Answered once, after the sale.") + '</h3><p class="soft mb16">Only buyers who completed a deal answer them. The answers, and nothing else, make the dealer\'s public grade.</p>' +
    CD.SURVEY.map(function (q, i) { return '<div class="q"><b>' + CD.esc(q) + "</b>" + seg(q, "survey", [["yes", "Yes"], ["mostly", "Mostly"], ["no", "No"]], S.survey[i] || "", "sm") + "</div>"; }).join("").replace(/data-act="survey" data-v="(yes|mostly|no)"/g, function (m, v, off, str) { return m; }) +
    (done ? '<div class="gradecard mt16"><div class="grade' + (grade && grade[0] !== "A" ? " b" : "") + '">' + grade + '</div><div><b>Your grade for this visit</b><p class="small">' + (S.surveyDone ? "Recorded. It joins " + CD.esc(r ? r.short || r.name : "the dealer") + "'s public page." : "Submit to record it.") + "</p></div></div>" : "") +
    (!S.surveyDone ? '<div class="mt16"><button type="button" class="btn pri" data-act="survey-done"' + (done ? "" : " disabled") + ">Submit my answers</button></div>" : "") + "</div>";
}

/* ---- site/js/app/90-boot.js ---- */
/* buyer workspace: rendering, gates, events, boot */
var viewEl, railEl, stepsEl, whereEl, backBtn, nextBtn, hintEl, dockEl, timer = null;
function gate() {
  var k = S.step, b = S.brief;
  if (k === "brief") { if (!CD.zip(b.zip)) return "Enter a Maryland, Virginia or DC ZIP code"; if (!b.body) return "Pick a body style"; return ""; }
  if (k === "matches") return S.pick ? "" : "Choose a car to continue";
  if (k === "trade") { var t = b.trade; if (!t.has) return ""; if (!t.year || !t.make || !t.model || !t.miles) return "Enter the year, make, model and mileage"; return ""; }
  if (k === "account") { if (!b.name.trim()) return "Enter your name"; if (!S.consent) return "Confirm what will be sent"; return ""; }
  if (k === "dealers") return S.rooftops.length ? "" : "Select at least one rooftop";
  if (k === "offers") return S.saved ? "" : "Choose an offer and book the visit to continue";
  return "";
}
function hintFor() {
  var k = S.step, g = gate(); if (g) return g;
  return { brief: "Continue to your three", matches: "Continue to your trade", trade: "Continue to payment", payment: "Continue to protection", protect: "Continue to your private address", account: "Choose the rooftops next", dealers: (S.way === "drive" ? "Book a drive at " : "Ask for pricing from ") + S.rooftops.length + " " + CD.plural(S.rooftops.length, "rooftop"), offers: "Continue to the deal record", record: "" }[k] || "";
}
function nextLabel() { return { dealers: S.way === "drive" ? "Send and book" : "Send the request", offers: "Open the deal record", record: "Restart" }[S.step] || "Continue"; }
/* the dealer desk writes replies into the same stored deal; pick them up before drawing offers or the record */
function syncDesk() {
  var d = CD.deal.get(); if (!d || !d.id || d.id !== S.id || !d.offers) return;
  var mine = JSON.stringify(S.offers || []), theirs = JSON.stringify(d.offers);
  if (mine !== theirs) { S.offers = d.offers; if (d.thread && d.thread.length > (S.thread || []).length) S.thread = d.thread; }
}
function render(still) {
  var k = S.step, i = at(k);
  if (k === "offers" || k === "record") syncDesk();
  document.body.classList.toggle("intro", k === "intro");
  document.body.classList.toggle("working", k !== "intro");
  viewEl.className = "view" + (still ? " still" : "");
  viewEl.innerHTML = V[k] ? V[k]() : "";
  whereEl.textContent = LABEL[k] || "";
  stepsEl.innerHTML = STEPS.slice(1).map(function (s) { var j = at(s); return '<span class="' + (j < i ? "done" : j === i ? "on" : "") + '">' + LABEL[s] + "</span>"; }).join("");
  railEl.style.setProperty("--w", (i / (STEPS.length - 1) * 100) + "%");
  var g = gate();
  nextBtn.textContent = nextLabel(); nextBtn.disabled = !!g && k !== "record"; hintEl.textContent = hintFor();
  backBtn.hidden = i <= 1 && k !== "record";
  if (k === "record") { nextBtn.className = "btn"; } else nextBtn.className = "btn pri";
  CD.qsa("input[type=range].range", viewEl).forEach(CD.fill);
  if (timer) { clearInterval(timer); timer = null; }
  if (k === "offers" && offers().some(function (o) { return !o.arrived; })) timer = setInterval(function () { render(true); }, 1000);
  if (k === "offers" && Object.keys(S.sim).some(function (id) { return S.revisions[id] && !S.sim[id].rev; })) setTimeout(function () { }, 0);
  window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
  save();
}
function go(k, still) { S.step = k; render(still); }
function next() {
  var k = S.step, g = gate(); if (g && k !== "record") { CD.toast(g, "warn"); return; }
  if (k === "record") { restart(); return; }
  if (k === "dealers") { send(); return; }
  if (k === "offers") { go("record"); return; }
  if (k === "account") { if (!S.alias) S.alias = makeAlias(S.brief.name); }
  if (k === "brief" && S.pick && S.mode === "know") { go("trade"); return; }
  go(STEPS[at(k) + 1]);
}
function back() { var k = S.step; if (k === "record") { go("offers"); return; } if (k === "trade" && S.mode === "know") { go("matches"); return; } var j = at(k) - 1; if (j >= 1) go(STEPS[j]); else go("intro"); }
function send() {
  if (!S.id) S.id = CD.deal.newId();
  if (!S.alias) S.alias = makeAlias(S.brief.name);
  S.askedAt = Date.now(); S.status = "asked"; S.sim = simulate(S); S.offers = (S.offers || []).filter(function (o) { return S.rooftops.indexOf(o.rooftop) >= 0; }); S.chosen = null; S.slot = null; S.saved = null; S.revisions = {};
  S.thread = [{ who: "sys", text: "Request " + S.id + " sent to " + S.rooftops.length + " " + CD.plural(S.rooftops.length, "rooftop") + " from " + S.alias + ".", at: Date.now() }];
  CD.toast("Sent to " + S.rooftops.length + " " + CD.plural(S.rooftops.length, "rooftop") + ". The response clock is running.", "ok");
  go("offers");
}
function restart() { CD.deal.clear(); S = fresh(); media = {}; go("intro"); CD.toast("Workspace cleared.", ""); }
function setPath(path, v) { var p = path.split("."), o = S; for (var i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; }
function num(v) { v = String(v).replace(/[^0-9.\-]/g, ""); return v === "" ? "" : +v; }

function bind() {
  CD.on(document, "click", "[data-act]", function (e, t) {
    var act = t.getAttribute("data-act"), v = t.getAttribute("data-v"), b = S.brief;
    if (t.tagName === "INPUT" || t.tagName === "SELECT") return;
    switch (act) {
      case "start": S.mode = "guide"; go("brief"); break;
      case "know": S.mode = "know"; go("matches"); setTimeout(function () { var s = document.getElementById("msearch"); if (s) s.focus(); }, 50); break;
      case "sample": S = seed(); media = {}; CD.toast("Sample buyer loaded: Jordan Ellis, 2026 Kia Telluride, three rooftops asked.", "ok"); render(); break;
      case "goto": go(v); break;
      case "pay": b.pay = v; render(true); break;
      case "tier": b.tier = v; render(true); break;
      case "priority": b.priority = v; render(true); break;
      case "body": b.body = v; render(true); break;
      case "size": b.size = v; render(true); break;
      case "make": var i = b.makes.indexOf(v); if (i >= 0) b.makes.splice(i, 1); else b.makes.push(v); render(true); break;
      case "feat": var j = b.feats.indexOf(v); if (j >= 0) b.feats.splice(j, 1); else b.feats.push(v); render(true); break;
      case "more": S.showMore = true; render(true); break;
      case "pick": S.pick = v; if (S.askedAt) { S.sim = simulate(S); } render(true); CD.toast(CD.modelById(v) ? CD.modelById(v).make + " " + CD.modelById(v).model + " chosen" : "Chosen", "ok", 1600); break;
      case "trade": b.trade.has = v === "yes"; render(true); break;
      case "lender": b.lender = v || null; render(true); break;
      case "prot": var kv = v.split(":"); b.prot[kv[0]] = kv[1]; render(true); break;
      case "way": S.way = v; render(true); break;
      case "roof": var ri = S.rooftops.indexOf(v); if (ri >= 0) S.rooftops.splice(ri, 1); else if (S.rooftops.length < 3) S.rooftops.push(v); else { CD.toast("Three rooftops at most. Deselect one first.", "warn"); return; } render(true); break;
      case "choose": if (S.saved) return; S.chosen = v; S.slot = null; render(true); break;
      case "slot": var sl = slots().filter(function (s) { return s.k === v; })[0]; S.slot = sl; render(true); break;
      case "book": book(); break;
      case "change": changeModal(v); break;
      case "rtab": S.rtab = v; if (S.step !== "record") go("record"); else render(true); break;
      case "visited": S.visited = true; S.rtab = "paper"; render(true); break;
      case "paper-sample": S.paper = samplePaper(); render(true); break;
      case "paper-blank": S.paper = savedPaper(); render(true); break;
      case "paper-clear": S.paper = null; render(true); break;
      case "send": sendMsg(); break;
      case "survey": var qi = CD.SURVEY.indexOf(t.closest(".q").querySelector("b").textContent); S.survey[qi] = v; render(true); break;
      case "survey-done": S.surveyDone = true; S.status = "sold"; render(true); CD.toast("Recorded. Thank you.", "ok"); break;
      case "revise-send": var ta = document.getElementById("revtext"), id = t.getAttribute("data-id"); if (ta && ta.value.trim()) { requestChange(id, ta.value.trim()); } break;
      case "revise-pick": var tb = document.getElementById("revtext"); if (tb) tb.value = v; break;
    }
  });
  CD.on(document, "input", "[data-bind]", function (e, t) {
    var path = t.getAttribute("data-bind"), val = t.type === "number" ? num(t.value) : t.value;
    setPath(path, val);
    if (path.indexOf("brief.trade") === 0) { var est = document.getElementById("est-out"); if (est) est.innerHTML = estHTML(tradeEstimate(S.brief.trade), S.brief.trade); }
    if (path === "brief.down" || path === "brief.das") { var bo = document.getElementById("band-out"); if (bo && S.step === "brief") bo.innerHTML = bandText(); }
    if (path === "brief.name") { var ao = document.getElementById("alias-out"); S.alias = t.value.trim() ? makeAlias(t.value) : null; if (ao) ao.innerHTML = S.alias ? aliasHTML(S.alias) : '<span class="mute">Appears when you enter your name</span>'; }
    save();
  });
  CD.on(document, "change", "[data-rerender]", function () { render(true); });
  CD.on(document, "input", "[data-act=limit]", function (e, t) { setLimit(+t.value); CD.fill(t); var o = document.getElementById("limit-out"); if (o) o.innerHTML = CD.usd(limit()) + "<small>" + (S.brief.pay === "cash" ? "all in" : "/mo") + "</small>"; var bo = document.getElementById("band-out"); if (bo && S.step === "brief") bo.innerHTML = bandText(); save(); });
  CD.on(document, "change", "[data-act=limit]", function () { render(true); });
  CD.on(document, "input", "[data-act=zip]", function (e, t) { var z = CD.zip(t.value); S.brief.zip = t.value.trim(); if (z) S.brief.state = z.state; var o = document.getElementById("zip-out"); if (o) { o.className = "city" + (z ? "" : " bad"); o.innerHTML = z ? CD.esc(z.city + ", " + z.state) + " · " + (CD.TAX[z.state] ? CD.TAX[z.state].name : "") : "Enter a Maryland, Virginia or DC ZIP"; } var bo = document.getElementById("band-out"); if (bo) bo.innerHTML = bandText(); nextBtn.disabled = !!gate(); hintEl.textContent = hintFor(); save(); });
  CD.on(document, "input", "[data-act=search]", function (e, t) { var res = document.getElementById("mresults"), list = searchModels(t.value); if (!res) return; res.hidden = !list.length; res.innerHTML = list.map(function (m) { return '<button type="button" data-act="pick" data-v="' + m.id + '"><span>' + CD.esc(m.year + " " + m.make + " " + m.model + (m.trim ? " " + m.trim : "")) + "</span><span>" + CD.usd(m.msrp) + "</span></button>"; }).join(""); });
  CD.on(document, "change", "[data-act=photo]", function (e, t) { var k = t.getAttribute("data-v"), f = t.files && t.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { media[k] = rd.result; if (S.brief.trade.photos.indexOf(k) < 0) S.brief.trade.photos.push(k); render(true); }; rd.readAsDataURL(f); });
  CD.on(document, "change", "[data-act=consent]", function (e, t) { S.consent = t.checked; nextBtn.disabled = !!gate(); hintEl.textContent = hintFor(); save(); });
  CD.on(document, "input", "[data-paper]", function (e, t) { if (!S.paper) return; S.paper[t.getAttribute("data-paper")] = num(t.value); save(); clearTimeout(window.__pt); window.__pt = setTimeout(function () { var a = audit(), box = CD.qs(".audit"); if (box) box.outerHTML = paperHTML().match(/<div class="audit[\s\S]*?<\/div>\s*<div class="row mt16"/) ? paperHTML().split('<div class="audit mt16">')[1].split('<div class="row mt16"')[0].replace(/<\/div>\s*$/, "") && ('<div class="audit mt16">' + paperHTML().split('<div class="audit mt16">')[1].split('<div class="row mt16"')[0]) : box.outerHTML; var h3 = CD.qs(".paper .head h3"), bd = CD.qs(".paper .head .badge"); if (h3) h3.textContent = a.F.length ? a.F.length + " " + CD.plural(a.F.length, "line") + " to ask about" : "Every line matches the offer"; if (bd) { bd.className = "badge " + (a.F.length ? "warn" : "ok"); bd.textContent = a.F.length ? "Do not sign yet" : "Matches"; } }, 250); });
  nextBtn.addEventListener("click", next); backBtn.addEventListener("click", back);
  window.addEventListener("storage", function (e) { if (e.key === "cd:deal" && (S.step === "offers" || S.step === "record")) { var before = JSON.stringify(S.offers || []); syncDesk(); if (JSON.stringify(S.offers || []) !== before) { render(true); CD.toast("A desk replied in writing.", "ok"); } } });
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "msg") sendMsg(); });
}
function book() {
  if (!S.chosen || !S.slot) return;
  var o = offerFor(S.chosen); if (!o) return;
  var sl = slotOf();
  S.saved = { rooftop: S.chosen, q: JSON.parse(JSON.stringify(o.q)), priced: JSON.parse(JSON.stringify(o.priced)), at: Date.now(), slotText: sl ? sl.day + ", " + sl.date + " at " + sl.time : "", desk: !!o.desk };
  S.status = "booked"; S.rtab = "timeline";
  S.thread.push({ who: "sys", text: "Visit booked with " + ((o.r && o.r.name) || S.chosen) + " · " + S.saved.slotText + ". Saved terms are frozen.", at: Date.now() });
  CD.toast("Booked. The written offer travels with the appointment.", "ok");
  render(true);
}
function changeModal(id) {
  var r = CD.rooftopById(id), sugg = ["Lower the processing fee.", "Remove the add-ons.", "Match my lender's rate.", "Raise the trade allowance.", "Lower the selling price."];
  CD.modal('<p class="label mb8">Ask ' + CD.esc(r ? r.short || r.name : id) + ' for a change</p><h3>What should move?</h3><p class="soft mt8 mb16">The desk receives the request in writing and answers with a revised offer. Your saved terms, if any, do not change.</p><div class="chips mb16">' + sugg.map(function (s) { return '<button type="button" class="chip" data-act="revise-pick" data-v="' + CD.esc(s) + '">' + CD.esc(s) + "</button>"; }).join("") + '</div><textarea class="input" id="revtext" placeholder="Or write your own request"></textarea><div class="row mt16" style="--gap:10px"><button type="button" class="btn pri" data-act="revise-send" data-id="' + id + '">Send the request</button><button type="button" class="btn" data-close>Cancel</button></div>');
}
function requestChange(id, text) {
  CD.closeModal(); revise(id, text); var sim = S.sim[id], rev = sim && sim.rev;
  if (sim) { var r2 = sim.rev; sim.rev = null; S.revisions[id] = text; save(); render(true); setTimeout(function () { if (S.sim[id]) { S.sim[id].rev = r2; S.sim[id].revAt = Date.now(); save(); if (S.step === "offers") render(true); CD.toast("Revised offer received from " + ((CD.rooftopById(id) || {}).short || id) + ".", "ok"); } }, 3000); }
  CD.toast("Change requested. The desk is revising.", "");
}
function sendMsg() {
  var inp = document.getElementById("msg"); if (!inp || !inp.value.trim()) return;
  var text = inp.value.trim(), r = CD.rooftopById(S.saved.rooftop);
  S.thread.push({ who: "buyer", text: text, at: Date.now() }); inp.value = ""; save(); render(true);
  var low = text.toLowerCase(), reply = low.indexOf("fee") >= 0 ? "The processing fee on your offer is the number on the contract. If you see anything else at the desk, show this record and it gets corrected." : low.indexOf("trade") >= 0 || low.indexOf("allowance") >= 0 ? "The allowance stands as written as long as the car matches your photos and odometer. We confirm on a short inspection when you arrive." : low.indexOf("time") >= 0 || low.indexOf("appointment") >= 0 ? "Your appointment is on the desk calendar. The paperwork will be ready when you arrive so the visit stays short." : "Thanks. Everything on the written offer stands. Bring this record and we will walk the contract line by line against it.";
  setTimeout(function () { S.thread.push({ who: "desk", text: reply, at: Date.now() }); save(); if (S.step === "record" && (S.rtab || "timeline") === "messages") render(true); }, 1500);
}
function boot() {
  viewEl = document.getElementById("view"); railEl = document.getElementById("railfill"); stepsEl = document.getElementById("steps"); whereEl = document.getElementById("where"); backBtn = document.getElementById("back"); nextBtn = document.getElementById("next"); hintEl = document.getElementById("hint"); dockEl = document.getElementById("dock");
  CD.sky(document.getElementById("sky"));
  load();
  var model = CD.param("model"), used = CD.param("used");
  if (model && CD.modelById(model)) { S.pick = model; S.mode = "know"; S.step = "trade"; if (used) { S.usedId = used; var u = CD.preowned.filter(function (p) { return p.id === used; })[0]; if (u) CD.toast("Listing " + u.year + " " + u.make + " " + u.model + " noted in your brief.", ""); } try { history.replaceState(null, "", location.pathname); } catch (e) { } }
  else if (location.hash === "#sample") { S = seed(); try { history.replaceState(null, "", location.pathname); } catch (e) { } }
  else if (location.hash === "#record" && S.saved) S.step = "record";
  bind(); render(true);
  window.CDApp = { S: function () { return S; }, go: go, render: render, seed: function () { S = seed(); render(true); }, next: next, back: back, offers: offers, ranked: ranked, matches: matches, audit: audit, priceBand: priceBand, needFor: needFor, book: book, send: send };
}
document.addEventListener("DOMContentLoaded", boot);

})();
