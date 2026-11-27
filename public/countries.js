const countriesList = document.getElementById("countriesList");
const countrySearch = document.getElementById("countrySearch");
const countryCount = document.getElementById("countryCount");
document.getElementById("year").textContent = new Date().getFullYear();

let allCountries = [];
let currentView = { level: "countries" };

function flagEmoji(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2)
    .replace(/[A-Z]/g, letter => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}
function make(tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== undefined) el.textContent = value;
  return el;
}
async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Request failed");
  return response.json();
}
function setCount(value) { countryCount.textContent = value; }
function setView(view, push = true) {
  currentView = view;
  if (push) {
    const params = new URLSearchParams();
    if (view.country) params.set("country", view.country.code);
    if (view.division) params.set("division", view.division);
    if (view.district) params.set("district", view.district);
    if (view.thana) params.set("thana", view.thana);
    const query = params.toString();
    history.pushState({ view }, "", query ? "/countries.html?" + query : "/countries.html");
  }
  renderView(view);
}
function addHeader(title, subtitle, backView) {
  const header = make("div", "country-detail-header");
  const back = make("button", "country-back-link", "← Back");
  back.type = "button";
  back.addEventListener("click", () => {
    if (backView) setView(backView);
    else setView({ level: "countries" });
  });
  header.appendChild(back);
  header.appendChild(make("h2", "", title));
  if (subtitle) header.appendChild(make("p", "", subtitle));
  countriesList.appendChild(header);
}
function renderGrid(items, onSelect) {
  const grid = make("div", "country-state-cards");
  items.forEach(item => {
    const card = make("button", "country-state-card country-level-card");
    card.type = "button";
    card.appendChild(make("span", "country-state-name", item.name));
    card.appendChild(make("span", "country-state-code", "View →"));
    card.addEventListener("click", () => onSelect(item));
    grid.appendChild(card);
  });
  countriesList.appendChild(grid);
}
function renderCountries(query = "") {
  const normalized = query.trim().toLowerCase();
  const filtered = allCountries.filter(country =>
    country.name.toLowerCase().includes(normalized) || country.code.toLowerCase().includes(normalized)
  );
  countrySearch.closest(".all-countries-search").hidden = false;
  countriesList.innerHTML = "";
  countriesList.classList.remove("country-detail-grid");
  setCount(normalized
    ? `${filtered.length} of ${allCountries.length} countries and territories`
    : `${allCountries.length} countries and territories · Listed alphabetically`);
  if (!filtered.length) {
    countriesList.appendChild(make("p", "empty-country-message", "No countries found. Try another name or country code."));
    return;
  }
  filtered.forEach(country => {
    const link = make("a", "all-country-item");
    link.href = `/countries.html?country=${encodeURIComponent(country.code)}`;
    link.addEventListener("click", event => {
      event.preventDefault();
      setView({ level: "country", country });
    });
    link.append(make("span", "country-flag", flagEmoji(country.code)), make("span", "country-name", country.name), make("span", "country-code", country.code));
    countriesList.appendChild(link);
  });
}
async function renderView(view) {
  countriesList.innerHTML = "";
  countriesList.classList.add("country-detail-grid");
  countrySearch.closest(".all-countries-search").hidden = view.level !== "countries";
  if (view.level === "countries") {
    countrySearch.value = "";
    renderCountries();
    return;
  }
  const country = view.country;
  if (view.level === "country") {
    addHeader(`${flagEmoji(country.code)}  ${country.name}`, "Select a division, state, province or region", { level: "countries" });
    setCount("Loading administrative divisions...");
    countriesList.appendChild(make("p", "country-state-status", "Loading divisions..."));
    try {
      let divisions = [];
      if (country.code === "BD") {
        const data = await getJson("/api/bd/locations");
        divisions = data.divisions || [];
      } else {
        const payload = await getJson(`https://countriesnow.space/api/v0.1/countries/states/q?country=${encodeURIComponent(country.name)}`);
        divisions = (payload?.data?.states || []).map(item => item.name).filter(Boolean);
      }
      countriesList.querySelector(".country-state-status")?.remove();
      if (!divisions.length) {
        countriesList.appendChild(make("p", "country-state-status", "No administrative divisions are available for this country yet."));
        setCount("Division data unavailable");
        return;
      }
      renderGrid(divisions.sort((a,b)=>a.localeCompare(b)).map(name=>({name})), item => {
        if (country.code === "BD") setView({ level: "districts", country, division: item.name });
        else setView({ level: "division", country, division: item.name });
      });
      setCount(`${divisions.length} ${country.code === "BD" ? "divisions" : "administrative divisions"}`);
    } catch {
      countriesList.querySelector(".country-state-status").textContent = "Could not load divisions right now. Please try again.";
      setCount("Unable to load division data");
    }
    return;
  }
  if (view.level === "division") {
    addHeader(view.division, country.name, { level: "country", country });
    countriesList.appendChild(make("p", "country-state-status", "Detailed district and postal data for this country will be added when a verified dataset is available."));
    setCount("More location levels coming soon");
    return;
  }
  if (view.level === "districts" || view.level === "upazilas" || view.level === "offices") {
    const backView = view.level === "districts"
      ? { level: "country", country }
      : view.level === "upazilas"
        ? { level: "districts", country, division: view.division }
        : { level: "upazilas", country, division: view.division, district: view.district };
    const title = view.level === "districts" ? view.division : view.level === "upazilas" ? view.district : view.thana;
    const subtitle = view.level === "districts" ? "Districts" : view.level === "upazilas" ? "Upazilas / Thanas" : "Post offices and postal codes";
    addHeader(title, subtitle, backView);
    countriesList.appendChild(make("p", "country-state-status", "Loading..."));
    setCount("Loading location data...");
    try {
      if (view.level === "offices") {
        const params = new URLSearchParams({ division: view.division, district: view.district, thana: view.thana });
        const data = await getJson("/api/bd/search?" + params.toString());
        const rows = data.results || [];
        const status = countriesList.querySelector(".country-state-status");
        status?.remove();
        if (!rows.length) {
          countriesList.appendChild(make("p", "country-state-status", "No post office records found for this area."));
          setCount("No postal records found");
          return;
        }
        const grid = make("div", "country-state-cards");
        rows.forEach(record => {
          const e = record.en || {};
          const b = record.bn || {};
          const card = make("article", "country-state-card country-post-card");
          card.appendChild(make("span", "country-state-name", e.suboffice || b.suboffice || "Post Office"));
          card.appendChild(make("strong", "country-postcode", String(e.postcode || record.sourcePostcode || "—")));
          grid.appendChild(card);
        });
        countriesList.appendChild(grid);
        setCount(`${rows.length} post office postal records`);
        return;
      }
      const params = new URLSearchParams({ division: view.division });
      if (view.district) params.set("district", view.district);
      const data = await getJson("/api/bd/locations?" + params.toString());
      const status = countriesList.querySelector(".country-state-status");
      status?.remove();
      const values = view.level === "districts" ? data.districts : data.thanas;
      if (!values?.length) {
        countriesList.appendChild(make("p", "country-state-status", "No location records found for this selection."));
        setCount("No locations found");
        return;
      }
      renderGrid(values.map(name=>({name})), item => {
        if (view.level === "districts") setView({ level: "upazilas", country, division: view.division, district: item.name });
        else setView({ level: "offices", country, division: view.division, district: view.district, thana: item.name });
      });
      setCount(`${values.length} ${view.level === "districts" ? "districts" : "upazilas / thanas"}`);
    } catch {
      countriesList.querySelector(".country-state-status").textContent = "Could not load location data. Please try again.";
      setCount("Unable to load location data");
    }
  }
}

countrySearch.addEventListener("input", event => renderCountries(event.target.value));
window.addEventListener("popstate", event => {
  if (event.state?.view) renderView(event.state.view);
  else {
    const code = new URLSearchParams(window.location.search).get("country");
    const country = allCountries.find(item => item.code === code);
    if (country) renderView({ level: "country", country });
    else renderView({ level: "countries" });
  }
});

getJson("/api/countries")
  .then(data => {
    allCountries = (data.countries || []).slice().sort((a,b)=>a.name.localeCompare(b.name));
    const params = new URLSearchParams(window.location.search);
    const code = params.get("country");
    const country = allCountries.find(item => item.code === code);
    if (country) {
      const view = { level: "country", country };
      history.replaceState({ view }, "", window.location.href);
      renderView(view);
    } else {
      history.replaceState({ view: { level: "countries" } }, "", "/countries.html");
      renderView({ level: "countries" });
    }
  })
  .catch(() => {
    setCount("Could not load countries. Please refresh the page.");
    countriesList.innerHTML = "";
  });
