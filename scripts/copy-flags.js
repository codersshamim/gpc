const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "node_modules", "flag-icons", "flags", "4x3");
const destination = path.join(__dirname, "..", "public", "flags");

if (!fs.existsSync(source)) {
  console.error("Flag SVG source folder is missing. Make sure flag-icons is installed.");
  process.exit(1);
}

fs.mkdirSync(destination, { recursive: true });
const files = fs.readdirSync(source).filter(file => /^[a-z]{2}\.svg$/i.test(file));
let copied = 0;

for (const file of files) {
  fs.copyFileSync(path.join(source, file), path.join(destination, file));
  copied++;
}

const attribution = [
  "Country flag SVG assets are copied from flag-icons v7.5.0.",
  "Project: https://github.com/lipis/flag-icons",
  "License: MIT",
  "The flag-icons license file is included when supplied by the package."
].join("\n") + "\n";
fs.writeFileSync(path.join(destination, "ATTRIBUTION.txt"), attribution, "utf8");

const licenseCandidates = ["LICENSE", "LICENSE.md", "LICENSE.txt"];
for (const licenseName of licenseCandidates) {
  const licensePath = path.join(__dirname, "..", "node_modules", "flag-icons", licenseName);
  if (fs.existsSync(licensePath)) {
    fs.copyFileSync(licensePath, path.join(destination, "LICENSE"));
    break;
  }
}

console.log(`Copied ${copied} local country flag SVG files to public/flags.`);
