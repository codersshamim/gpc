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
  countriesList.innerHTML = "";

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
    link.href = `/?country=${encodeURIComponent(country.code)}#search`;
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

countrySearch.addEventListener("input", event => renderCountries(event.target.value));

fetch("/api/countries")
  .then(response => {
    if (!response.ok) throw new Error("Country list request failed");
    return response.json();
  })
  .then(data => {
    allCountries = (data.countries || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    renderCountries();
  })
  .catch(() => {
    countryCount.textContent = "Could not load countries. Please refresh the page.";
    countriesList.innerHTML = "";
  });
