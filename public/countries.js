const countriesList = document.getElementById("countriesList");
const countrySearch = document.getElementById("countrySearch");
const countryCount = document.getElementById("countryCount");
document.getElementById("year").textContent = new Date().getFullYear();

function flagEmoji(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2)
    .replace(/[A-Z]/g, letter => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}
let allCountries = [];

function renderCountries(query = "") {
  const normalized = query.trim().toLowerCase();
  const filtered = allCountries.filter(country =>
    country.name.toLowerCase().includes(normalized) ||
    country.code.toLowerCase().includes(normalized)
  );
  countryCount.textContent = normalized
    ? `${filtered.length} of ${allCountries.length} countries and territories`
    : `${allCountries.length} countries and territories · Listed alphabetically`;
  countrySearch.closest(".all-countries-search").hidden = false;
  countriesList.innerHTML = "";
  countriesList.classList.remove("country-detail-grid");

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-country-message";
    empty.textContent = "No countries found. Try another name or country code.";
    countriesList.appendChild(empty);
    return;
  }

  filtered.forEach(country => {
    const link = document.createElement("a");
    link.className = "all-country-item";
    link.href = `/countries.html?country=${encodeURIComponent(country.code)}`;
    link.addEventListener("click", event => {
      event.preventDefault();
      showCountryStates(country);
    });
    const flag = document.createElement("span");
    flag.className = "country-flag";
    flag.textContent = flagEmoji(country.code);
    const name = document.createElement("span");
    name.className = "country-name";
    name.textContent = country.name;
    const code = document.createElement("span");
    code.className = "country-code";
    code.textContent = country.code;
    link.append(flag, name, code);
    countriesList.appendChild(link);
  });
}

async function showCountryStates(country, updateHistory = true) {
  countrySearch.closest(".all-countries-search").hidden = true;
  countriesList.innerHTML = "";
  countriesList.classList.add("country-detail-grid");
  countryCount.textContent = "Loading administrative divisions...";
  if (updateHistory) history.pushState({ countryCode: country.code }, "", `/countries.html?country=${encodeURIComponent(country.code)}`);

  const header = document.createElement("div");
  header.className = "country-detail-header";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "country-back-link";
  back.textContent = "← All Countries";
  back.addEventListener("click", showAllCountries);
  const title = document.createElement("h2");
  title.textContent = `${flagEmoji(country.code)}  ${country.name}`;
  const subtitle = document.createElement("p");
  subtitle.textContent = "States / Divisions / Provinces / Regions";
  header.append(back, title, subtitle);
  countriesList.appendChild(header);

  const loading = document.createElement("p");
  loading.className = "country-state-status";
  loading.textContent = "Loading divisions...";
  countriesList.appendChild(loading);

  try {
    const response = await fetch(`https://countriesnow.space/api/v0.1/countries/states/q?country=${encodeURIComponent(country.name)}`);
    if (!response.ok) throw new Error("Could not load divisions");
    const payload = await response.json();
    const states = payload?.data?.states || [];
    loading.remove();

    if (payload.error || !states.length) {
      const empty = document.createElement("p");
      empty.className = "country-state-status";
      empty.textContent = "No administrative divisions are available for this country yet.";
      countriesList.appendChild(empty);
      countryCount.textContent = "Division data unavailable";
      return;
    }

    const grid = document.createElement("div");
    grid.className = "country-state-cards";
    states.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")).forEach(state => {
      const card = document.createElement("article");
      card.className = "country-state-card";
      const stateName = document.createElement("span");
      stateName.className = "country-state-name";
      stateName.textContent = state.name || "Unnamed division";
      card.appendChild(stateName);
      if (state.state_code) {
        const stateCode = document.createElement("span");
        stateCode.className = "country-state-code";
        stateCode.textContent = state.state_code;
        card.appendChild(stateCode);
      }
      grid.appendChild(card);
    });
    countriesList.appendChild(grid);
    countryCount.textContent = `${states.length} administrative divisions`;
    const note = document.createElement("p");
    note.className = "country-state-note";
    note.textContent = "Division names are provided by an external geographic data source and may need local verification.";
    countriesList.appendChild(note);
  } catch {
    loading.textContent = "Could not load divisions right now. Please try again.";
    countryCount.textContent = "Unable to load division data";
  }
}

function showAllCountries() {
  history.pushState({}, "", "/countries.html");
  countrySearch.value = "";
  renderCountries();
}
window.addEventListener("popstate", () => {
  const code = new URLSearchParams(window.location.search).get("country");
  const country = allCountries.find(item => item.code === code);
  if (country) showCountryStates(country, false);
  else {
    countrySearch.value = "";
    renderCountries();
  }
});
countrySearch.addEventListener("input", event => renderCountries(event.target.value));

fetch("/api/countries")
  .then(response => {
    if (!response.ok) throw new Error("Country list request failed");
    return response.json();
  })
  .then(data => {
    allCountries = (data.countries || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    const requestedCode = new URLSearchParams(window.location.search).get("country");
    const requestedCountry = allCountries.find(item => item.code === requestedCode);
    if (requestedCountry) showCountryStates(requestedCountry, false);
    else renderCountries();
  })
  .catch(() => {
    countryCount.textContent = "Could not load countries. Please refresh the page.";
    countriesList.innerHTML = "";
  });
