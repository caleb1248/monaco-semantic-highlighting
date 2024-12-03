// @ts-check
import { mkdir, rm, writeFile, rename } from "fs/promises";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { exec } from "child_process";

const typeTempDir = "extra-types-temp";

if (existsSync(typeTempDir)) await rm(typeTempDir, { recursive: true });
await mkdir(typeTempDir);

/**
 * @param {string[]} paths
 * @param {string} dest
 */
async function addExtraTypes(paths, dest) {
  // Fetch from https://raw.githubusercontent.com/microsoft/vscode/refs/heads/main/src/ the path + .ts in parallel
  const promises = [];

  for (const path of paths) {
    promises.push(
      fetch(
        `https://raw.githubusercontent.com/microsoft/vscode/refs/heads/main/src/${path}.ts`
      ).then(async (res) => {
        await mkdir(`${typeTempDir}/${dirname(path)}`, { recursive: true });
        await writeFile(`${typeTempDir}/${path}.ts`, await res.text());
      })
    );
  }

  promises.push(
    writeFile(
      `${typeTempDir}/tsconfig.json`,
      JSON.stringify(
        {
          compilerOptions: {
            rootDir: ".",
            declaration: true,
            declarationDir: "types-out",
            lib: ["ESNext", "DOM"],
            emitDeclarationOnly: true,
          },
          include: ["."],
        },
        null,
        2
      )
    )
  );

  await Promise.all(promises);

  await /** @type {Promise<void>} */ (
    new Promise((resolve) => {
      exec(`npx tsc`, { cwd: typeTempDir }, () => resolve());
    })
  );

  for (const path of paths) {
    await rename(`${typeTempDir}/types-out/${path}.d.ts`, join(dest, `${path}.d.ts`));
  }

  await rm(typeTempDir, { recursive: true });
}

addExtraTypes(
  [
    "vs/platform/theme/common/tokenClassificationRegistry",
    "vs/workbench/services/themes/common/workbenchThemeService",
    "vs/editor/common/languages/supports/tokenization",
    "vs/base/common/lifecycle",
    "vs/base/browser/dom",
    "vs/base/browser/window",
    "vs/platform/theme/common/colorUtils",
    "vs/platform/theme/browser/iconsStyleSheet",
    "vs/editor/standalone/browser/standaloneThemeService",
  ],
  "node_modules/vscode/vscode/src"
).catch(console.error);
