/* eslint-disable */
// Split the master English string list into N roughly-equal chunks so each
// translation agent handles a bounded amount of output.
const fs = require("fs");
const path = require("path");

const N = parseInt(process.argv[2] || "2", 10);
const src = path.resolve(__dirname, "i18n_en_strings.json");
const arr = JSON.parse(fs.readFileSync(src, "utf8"));
const partsDir = path.resolve(__dirname, "chunks");
fs.mkdirSync(partsDir, { recursive: true });

const per = Math.ceil(arr.length / N);
for (let i = 0; i < N; i++) {
  const chunk = arr.slice(i * per, (i + 1) * per);
  const dest = path.join(partsDir, `en_${i + 1}.json`);
  fs.writeFileSync(dest, JSON.stringify(chunk, null, 2) + "\n");
  console.log(`chunk ${i + 1}: ${chunk.length} strings -> ${dest}`);
}
console.log("total:", arr.length, "chunks:", N);
