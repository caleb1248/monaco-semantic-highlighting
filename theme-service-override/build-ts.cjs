const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const typescriptLibFolder = join(__dirname, "node_modules", "typescript", "lib");
const typescriptLibDestFolder = join(__dirname, "src", "typescript-language-features", "lib");
function buildTs() {}
