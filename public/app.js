const countrySelect = document.getElementById("countrySelect");
const countrySearchInput = document.getElementById("countrySearchInput");
let availableCountries = [];
const divisionSelect = document.getElementById("divisionSelect");
const districtSelect = document.getElementById("districtSelect");
const areaSelect = document.getElementById("areaSelect");
const officeSelect = document.getElementById("officeSelect");
const formMessage = document.getElementById("formMessage");
const resultsSection = document.getElementById("resultsSection");
const resultsList = document.getElementById("resultsList");

document.getElementById("year").textContent = new Date().getFullYear();

function resetSelect(select, placeholder) {
  select.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = placeholder;
  select.appendChild(option);
  select.disabled = true;
}
function fillSelect(select, placeholder, values) {
  resetSelect(select, placeholder);
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.disabled = values.length === 0;
}
async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Request failed");
  return response.json();
}
function flagEmoji(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2)
    .replace(/[A-Z]/g, letter => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}
function chooseCountry(code) {
  countrySelect.value = code;
  countrySelect.dispatchEvent(new Event("change"));
  document.getElementById("search").scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderPopularPostalCodes() {
  const items = [
    { code: "1000", city: "Dhaka GPO", area: "Dhaka" },
    { code: "1100", city: "Dhaka Sadar HO", area: "Dhaka" },
    { code: "1207", city: "Mohammadpur Housing", area: "Dhaka" },
    { code: "4000", city: "Chattogram GPO", area: "Chattogram" },
    { code: "6000", city: "Rajshahi Sadar", area: "Rajshahi" },
    { code: "9000", city: "Khulna G.P.O", area: "Khulna" },
    { code: "3100", city: "Sylhet Sadar", area: "Sylhet" }
  ];
  const grid = document.getElementById("popularPostalGrid");
  if (!grid) return;
  grid.innerHTML = "";
  items.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "postal-tile";
    const country = document.createElement("span");
    country.className = "tile-country";
    country.textContent = "🇧🇩 Bangladesh · " + item.area;
    const city = document.createElement("span");
    city.className = "tile-city";
    city.textContent = item.city;
    const code = document.createElement("span");
    code.className = "tile-code";
    code.textContent = item.code;
    const hint = document.createElement("span");
    hint.className = "tile-arrow";
    hint.textContent = "View postal code →";
    button.append(country, city, code, hint);
    button.addEventListener("click", async () => {
      try {
        const data = await getJson("/api/bd/search?postcode=" + encodeURIComponent(item.code));
        if (data.results && data.results.length) {
          renderResults(data.results);
          resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          formMessage.textContent = "No records found for postal code " + item.code + ".";
          chooseCountry("BD");
        }
      } catch {
        formMessage.textContent = "Could not load this postal code right now.";
        chooseCountry("BD");
      }
    });
    grid.appendChild(button);
  });
}

// Render the static popular postal-code cards immediately, even if country API loading fails.
renderPopularPostalCodes();

function renderPopularCountries(countries) {
  const popularCodes = ["BD","US","GB","IN","CA","AU","DE","FR","JP","CN","SA","AE","SG","MY","PK","IT","ES","BR","NZ","KR"];
  const popularGrid = document.getElementById("popularCountriesGrid");
  popularGrid.innerHTML = "";
  popularCodes.map(code => countries.find(country => country.code === code)).filter(Boolean).forEach(country => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "popular-country-card";
    const flag = document.createElement("span"); flag.className = "country-flag"; flag.textContent = flagEmoji(country.code);
    const name = document.createElement("span"); name.className = "country-name"; name.textContent = country.name;
    button.append(flag, name);
    button.addEventListener("click", () => chooseCountry(country.code));
    popularGrid.appendChild(button);
  });
}
function renderCountryOptions(query) {
  const selected = countrySelect.value;
  const term = String(query || "").trim().toLowerCase();
  countrySelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = term ? "Matching Countries" : "Select Country";
  countrySelect.appendChild(placeholder);
  const matches = availableCountries.filter(country =>
    country.name.toLowerCase().includes(term) ||
    country.code.toLowerCase().includes(term)
  );
  matches.forEach(country => {
    const option = document.createElement("option");
    option.value = country.code;
    option.textContent = flagEmoji(country.code) + " " + country.name;
    countrySelect.appendChild(option);
  });
  if (matches.some(country => country.code === selected)) {
    countrySelect.value = selected;
  } else if (selected) {
    countrySelect.value = "";
    countrySelect.dispatchEvent(new Event("change"));
  }
  if (term && matches.length === 0) {
    placeholder.textContent = "No matching country found";
  }
}
countrySearchInput.addEventListener("input", () => {
  renderCountryOptions(countrySearchInput.value);
});

async function loadCountries() {
  const data = await getJson("/api/countries");
  availableCountries = data.countries || [];
  renderCountryOptions("");
  renderPopularCountries(availableCountries);

  const requestedCountry = new URLSearchParams(window.location.search).get("country");
  if (requestedCountry && data.countries.some(country => country.code === requestedCountry)) {
    chooseCountry(requestedCountry);
  }
}
async function updateLocations() {
  const params = new URLSearchParams();
  if (divisionSelect.value) params.set("division", divisionSelect.value);
  if (districtSelect.value) params.set("district", districtSelect.value);
  if (areaSelect.value) params.set("thana", areaSelect.value);
  return getJson(`/api/bd/locations?${params.toString()}`);
}
function clearBelow(from) {
  const selects = [divisionSelect,districtSelect,areaSelect,officeSelect];
  const placeholders = ["Select Division/State","Select District/City","Select Subdistrict/Area","Select Post Office"];
  const index = selects.indexOf(from);
  for (let i=index+1;i<selects.length;i++) resetSelect(selects[i],placeholders[i]);
  resultsSection.hidden = true;
}
countrySelect.addEventListener("change", async () => {
  clearBelow(divisionSelect);
  formMessage.textContent = "";
  resultsSection.hidden = true;
  if (countrySelect.value !== "BD") {
    formMessage.textContent = countrySelect.value ? "Postal location data for this country will be added in a future update." : "";
    return;
  }
  try {
    const data = await getJson("/api/bd/locations");
    fillSelect(divisionSelect,"Select Division/State",data.divisions);
    if (!data.divisions.length) formMessage.textContent = "Bangladesh dataset is not downloaded yet. Follow the setup instructions in README.";
  } catch { formMessage.textContent = "Could not load Bangladesh location data."; }
});
divisionSelect.addEventListener("change", async () => {
  clearBelow(districtSelect);
  if (!divisionSelect.value) return;
  const data = await updateLocations();
  fillSelect(districtSelect,"Select District/City",data.districts);
});
districtSelect.addEventListener("change", async () => {
  clearBelow(areaSelect);
  if (!districtSelect.value) return;
  const data = await updateLocations();
  fillSelect(areaSelect,"Select Subdistrict/Area",data.thanas);
});
areaSelect.addEventListener("change", async () => {
  clearBelow(officeSelect);
  if (!areaSelect.value) return;
  const data = await updateLocations();
  fillSelect(officeSelect,"Select Post Office",data.postOffices);
});

function addText(parent, tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = value || "—";
  parent.appendChild(el);
  return el;
}
function renderResults(records) {
  resultsList.innerHTML = "";
  document.getElementById("resultCount").textContent = `${records.length} result${records.length===1?"":"s"}`;
  records.forEach(record => {
    const e=record.en||{}, b=record.bn||{};
    const card=document.createElement("article"); card.className="result-card";
    const top=document.createElement("div"); top.className="result-top";
    addText(top,"div","postcode",String(e.postcode ?? record.sourcePostcode ?? ""));
    addText(top,"span","unverified","Not independently verified");
    card.appendChild(top);
    addText(card,"h3","",e.suboffice || b.suboffice || "Post Office");
    const meta=document.createElement("div"); meta.className="result-meta";
    [["Division",e.division],["District",e.district],["Upazila / Thana",e.thana],["Post Office",e.suboffice]].forEach(([label,value])=>{
      const cell=document.createElement("div"); cell.textContent=label;
      const strong=document.createElement("b"); strong.textContent=value||"—"; cell.appendChild(strong); meta.appendChild(cell);
    });
    card.appendChild(meta); resultsList.appendChild(card);
  });
  resultsSection.hidden=false;
}
document.getElementById("postalForm").addEventListener("submit", async event => {
  event.preventDefault();
  formMessage.textContent="";
  if (countrySelect.value !== "BD") {
    formMessage.textContent="Please select Bangladesh. Other country datasets are coming soon.";
    return;
  }
  if (!divisionSelect.value) {
    formMessage.textContent="Please select a Division/State.";
    return;
  }
  const params=new URLSearchParams({division:divisionSelect.value});
  if(districtSelect.value) params.set("district",districtSelect.value);
  if(areaSelect.value) params.set("thana",areaSelect.value);
  if(officeSelect.value) params.set("suboffice",officeSelect.value);
  try {
    const data=await getJson(`/api/bd/search?${params.toString()}`);
    if(!data.results.length) {
      formMessage.textContent="No postal code records found for this selection.";
      resultsSection.hidden=true;
      return;
    }
    renderResults(data.results);
    resultsSection.scrollIntoView({behavior:"smooth",block:"start"});
  } catch { formMessage.textContent="Search failed. Please try again."; }
});
async function loadStats() {
  try {
    const s=await getJson("/api/bd/summary");
    document.getElementById("dataStats").textContent=s.dataAvailable
      ? `${s.records.toLocaleString()} postcode records · ${s.divisions} divisions · ${s.districts} districts`
      : "Bangladesh postcode dataset not downloaded yet";
  } catch { document.getElementById("dataStats").textContent="Postal directory"; }
}
Promise.all([loadCountries(),loadStats()]).catch(()=>{formMessage.textContent="Unable to load website data. Refresh the page.";});
