(() => {
  const overlay = document.getElementById("globalSearchOverlay");
  if (!overlay) return;
  const input = document.getElementById("globalSearchInput");
  const form = document.getElementById("globalSearchForm");
  const output = document.getElementById("globalSearchResults");
  const close = () => { overlay.hidden = true; document.body.style.overflow = ""; };
  document.querySelectorAll("[data-open-global-search]").forEach(button => button.addEventListener("click", () => {
    overlay.hidden = false; document.body.style.overflow = "hidden"; input.focus();
  }));
  overlay.querySelectorAll("[data-close-global-search]").forEach(button => button.addEventListener("click", close));
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !overlay.hidden) close(); });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const q = input.value.trim();
    if (q.length < 2) { output.innerHTML = '<p class="global-search-empty">Please type at least 2 characters.</p>'; return; }
    output.innerHTML = '<p class="global-search-empty">Searching...</p>';
    try {
      const response = await fetch("/api/global-search?q=" + encodeURIComponent(q));
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      output.innerHTML = "";
      (data.countries || []).forEach(country => {
        const a = document.createElement("a"); a.className = "global-search-result";
        a.href = "/countries.html?country=" + encodeURIComponent(country.code);
        const left = document.createElement("span"); const title = document.createElement("strong"); title.textContent = country.name;
        const sub = document.createElement("small"); sub.textContent = "Country / Territory · " + country.code;
        left.append(title, sub); a.append(left); output.appendChild(a);
      });
      (data.results || []).forEach(record => {
        const e = record.en || {}, b = record.bn || {};
        const a = document.createElement("a"); a.className = "global-search-result";
        a.href = "/?q=" + encodeURIComponent(q) + "#globalSearchResults";
        const left = document.createElement("span"); const title = document.createElement("strong");
        title.textContent = e.suboffice || b.suboffice || e.thana || e.district || "Postal record";
        const sub = document.createElement("small"); sub.textContent = [e.thana || b.thana,e.district || b.district,e.division || b.division].filter(Boolean).join(" · ");
        left.append(title, sub); const code = document.createElement("b"); code.textContent = String(e.postcode || record.sourcePostcode || "");
        a.append(left, code); a.addEventListener("click", event => { event.preventDefault(); close(); window.location.href = "/?globalQuery=" + encodeURIComponent(q); });
        output.appendChild(a);
      });
      if (!output.children.length) output.innerHTML = '<p class="global-search-empty">No matching keyword found. Try another keyword.</p>';
    } catch { output.innerHTML = '<p class="global-search-empty">Search is temporarily unavailable. Please try again.</p>'; }
  });
  const params = new URLSearchParams(location.search);
  const initial = params.get("globalQuery");
  if (initial) { overlay.hidden = false; document.body.style.overflow = "hidden"; input.value = initial; form.requestSubmit(); }
})();
