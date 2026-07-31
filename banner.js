const fs = require("fs");
const pkg = require("./package.json");
const filename = "assets/js/main.min.js";
const script = fs.readFileSync(filename, "utf8");
const banner = fs
  .readFileSync("_includes/copyright.js", "utf8")
  .replace(/\r\n?/g, "\n");

if (!script.startsWith("/*!")) {
  fs.writeFileSync(filename, banner + script, "utf8");
}
