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

console.log(`Copied ${copied} local country flag SVG files to public/flags.`);
