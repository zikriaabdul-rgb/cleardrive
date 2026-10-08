(function(){
"use strict";
/* ---- site/js/trust/10-trust.js ---- */
/* trust center: credits table, section index highlighting, copy button */
document.addEventListener("DOMContentLoaded", function () {
  var ids = Object.keys(CD.credits).sort(function (a, b) { var ma = CD.modelById(a), mb = CD.modelById(b); return ((ma ? ma.make + " " + ma.model : a)).localeCompare(mb ? mb.make + " " + mb.model : b); });
  var tbody = document.querySelector("#credits-table tbody");
  if (tbody) tbody.innerHTML = ids.length ? ids.map(function (id) {
    var c = CD.credits[id], m = CD.modelById(id), name = m ? m.make + " " + m.model : id;
    return "<tr><td>" + CD.esc(name) + "</td><td>" + CD.esc(c.author || "Unknown") + "</td><td>" + CD.esc(c.license || "") + "</td><td>" + (c.page ? '<a href="' + CD.esc(c.page) + '" target="_blank" rel="noopener">Wikimedia Commons</a>' : "") + "</td></tr>";
  }).join("") : '<tr><td colspan="4" class="mute">No silhouettes have been rendered in this build yet.</td></tr>';
  var note = document.getElementById("credits-note");
  if (note) note.textContent = ids.length + " " + CD.plural(ids.length, "silhouette") + " in this build. Models without a rendered silhouette use a generic body outline.";
  /* index highlighting */
  var links = CD.qsa(".trust-index a"), secs = CD.qsa(".tsec");
  function mark(id) { links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + id); }); }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); }); }, { rootMargin: "-20% 0px -70% 0px" });
    secs.forEach(function (s) { io.observe(s); });
  }
  if (location.hash) mark(location.hash.slice(1));
  /* copy email */
  var btn = document.getElementById("copy-email"), em = document.getElementById("contact-email");
  if (btn && em) btn.addEventListener("click", function () {
    var text = em.textContent.trim();
    function fallback() { var r = document.createRange(); r.selectNodeContents(em); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); CD.toast("Address selected. Press Ctrl+C to copy.", "warn"); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { CD.toast("Address copied", "ok"); }, fallback); else fallback();
  });
});

})();
