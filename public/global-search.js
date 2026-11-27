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
  // Clicking outside keeps the search open; Escape and the X button close it.
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
        const a = document.createElement("article"); a.className = "global-search-result global-search-postal-result";
        const top = document.createElement("div"); top.className = "global-search-postal-top";
        const code = document.createElement("strong"); code.className = "global-search-result-code";
        code.textContent = String(e.postcode || b.postcode || record.sourcePostcode || "");
        const status = document.createElement("span"); status.className = "global-search-verification";
        status.textContent = "Not verified";
        top.append(code, status);
        const office = document.createElement("h3"); office.className = "global-search-post-office";
        office.textContent = e.suboffice || b.suboffice || "Post office not specified";
        const details = document.createElement("div"); details.className = "global-search-postal-details";
        const fields = [
          ["Division", e.division || b.division],
          ["District", e.district || b.district],
          ["Upazila / Thana", e.thana || b.thana],
          ["Post Office", e.suboffice || b.suboffice]
        ];
        fields.forEach(([label, value]) => {
          if (!value) return;
          const item = document.createElement("div"); item.className = "global-search-postal-field";
          const name = document.createElement("small"); name.textContent = label;
          const detail = document.createElement("strong"); detail.textContent = value;
          item.append(name, detail); details.appendChild(item);
        });
        a.append(top, office, details);
        output.appendChild(a);
      });
      if (!output.children.length) output.innerHTML = '<p class="global-search-empty">No matching keyword found. Try another keyword.</p>';
    } catch { output.innerHTML = '<p class="global-search-empty">Search is temporarily unavailable. Please try again.</p>'; }
  });
  const params = new URLSearchParams(location.search);
  const initial = params.get("globalQuery");
  if (initial) { overlay.hidden = false; document.body.style.overflow = "hidden"; input.value = initial; form.requestSubmit(); }
})();
