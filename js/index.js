(function(){
"use strict";
/* ---- site/js/index/10-index.js ---- */
/* landing page: live counts from the data, rooftops by region, pricing plans, ambient sky */
document.addEventListener("DOMContentLoaded", function () {
  CD.sky(document.getElementById("sky"));
  var brandRow = document.getElementById("brand-row");
  if (brandRow) brandRow.innerHTML = CD.brands.map(function (b) { return "<span>" + CD.esc(b) + "</span>"; }).join("");
  var rc = document.getElementById("rooftop-count"); if (rc && CD.rooftops.length) rc.textContent = CD.rooftops.length;
  var regions = {};
  CD.rooftops.forEach(function (r) { var k = r.region || r.state; (regions[k] = regions[k] || []).push(r); });
  var order = Object.keys(regions).sort(function (a, b) { return regions[b].length - regions[a].length || a.localeCompare(b); });
  var reg = document.getElementById("regions");
  if (reg) reg.innerHTML = order.map(function (k) {
    var list = regions[k].slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    return '<div class="region"><h4>' + CD.esc(k) + "<small>" + list.length + " " + CD.plural(list.length, "rooftop") + '</small></h4><ul>' + list.map(function (r) { return "<li><span>" + CD.esc(r.short || r.name) + "</span><span>" + CD.esc((r.brands || []).join(" · ")) + "</span></li>"; }).join("") + "</ul></div>";
  }).join("") || '<p class="note">Rooftop data loads with the build.</p>';
  var lineup = document.getElementById("lineup"), grid = document.getElementById("lineup-grid");
  if (lineup && grid) {
    var want = ["kia-telluride", "toyota-rav4", "honda-cr-v", "ford-f-150", "hyundai-tucson", "jeep-grand-cherokee", "subaru-outback", "volkswagen-atlas", "lexus-rx", "chevrolet-silverado-1500", "mazda-cx-5", "nissan-rogue"];
    var picks = want.map(CD.modelById).filter(function (m) { return m && CD.carSrc(m); });
    if (picks.length < 12) picks = picks.concat(CD.models.filter(function (m) { return m.popular && CD.carSrc(m) && picks.indexOf(m) < 0; })).slice(0, 12);
    picks = picks.slice(0, 12);
    if (picks.length >= 4) {
      lineup.hidden = false;
      grid.innerHTML = picks.map(function (m) { return '<a class="model" href="inventory.html?model=' + CD.esc(m.id) + '">' + CD.car(m) + "<h4><small>" + CD.esc(m.make) + "</small>" + CD.esc(m.model) + '</h4><div class="price">From ' + CD.usd(m.msrp) + " <small>MSRP, approx.</small></div></a>"; }).join("");
    }
  }
  var plans = document.getElementById("plans");
  if (plans) plans.innerHTML = CD.PLANS.map(function (p, i) { return '<div class="card plan' + (i === 1 ? " on" : "") + '"><p class="label">' + CD.esc(p[0]) + '</p><div class="price">' + CD.esc(p[1]) + "<small>" + CD.esc(p[2]) + "</small></div><p>" + CD.esc(p[3]) + "</p></div>"; }).join("");
  CD.qsa(".rise").forEach(function (el) { el.classList.add("still"); });
});

})();
