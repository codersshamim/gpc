const countrySelect = document.getElementById("countrySelect");
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
async function loadCountries() {
  const data = await getJson("/api/countries");
  data.countries.forEach(country => {
    const option = document.createElement("option");
    option.value = country.code;
    option.textContent = country.name;
    countrySelect.appendChild(option);
  });
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
