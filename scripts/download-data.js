// Downloads the bilingual Bangladesh postcode JSON dataset into ./data.
// Run: node scripts/download-data.js
const fs = require("fs");
const path = require("path");

const url = "https://raw.githubusercontent.com/TanjidulIslamToha/bangladesh-postal-codes-database/main/postcodes-pretty.json";
const destination = path.join(__dirname, "..", "data", "bangladesh-postcodes.json");

async function main() {
  console.log("Downloading Bangladesh postcode dataset...");
  const response = await fetch(url, { headers: { "User-Agent": "GlobalPostalCodes-starter/1.0" } });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const data = await response.json();

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Unexpected dataset format.");
  }

  const records = Object.entries(data).map(([postcode, value]) => ({
    bn: value.bn || {},
    en: value.en || {},
    sourcePostcode: postcode
  })).filter(r => r.en.postcode && r.en.division && r.en.district);

  if (!records.length) throw new Error("No usable postcode records found.");

  const output = {
    records,
    source: "TanjidulIslamToha/bangladesh-postal-codes-database (MIT-licensed repository)",
    sourceUrl: url,
    downloadedAt: new Date().toISOString(),
    recordCount: records.length,
    verified: false,
    note: "Community-maintained dataset. Not independently verified against current Bangladesh Post records."
  };

  fs.writeFileSync(destination, JSON.stringify(output, null, 2), "utf8");
  console.log(`Done. Saved ${records.length} postcode records to data/bangladesh-postcodes.json`);
  console.log("Important: these records are marked unverified. Cross-check with Bangladesh Post before publishing as official.");
}
main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
