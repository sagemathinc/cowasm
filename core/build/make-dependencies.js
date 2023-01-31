const { existsSync, readFileSync, realpathSync } = require("fs");
const { join } = require("path");
const { execSync } = require("child_process");

if (existsSync("package.json")) {
  const package = JSON.parse(readFileSync("package.json").toString());

  const root = realpathSync(".");

  const MAKE_DEP_EXCLUDE = process.env.MAKE_DEP_EXCLUDE ?? "";

  for (const key of ["devDependencies", "dependencies"]) {
    for (const name in package[key] ?? {}) {
      if (package[key][name].startsWith("workspace:")) {
        if (MAKE_DEP_EXCLUDE.includes(`:${name}:`)) {
          // Avoid possibility of infinite recursion in case of circular dep.
          // I don't think I have any, but sometime it's going to happen.
          throw Error(
            `CIRCULAR DEPENDENCY: MAKE_DEP_EXCLUDE=${MAKE_DEP_EXCLUDE}, name=${name}`
          );
        }
        if (existsSync(join(root, "node_modules", name, "dist"))) {
          // assume it was already built. This isn't meant to be a "always ensure up to date",
          // but rather -- build if it obviously wasn't built.
          continue;
        }
        console.log(`\nDEPENDENCY: ${name} - make`);
        const cwd = realpathSync(join(root, "node_modules", name));
        console.log(`cd '${cwd}'`);
        // run make there
        execSync("make", {
          stdio: "inherit",
          cwd,
          env: {
            ...process.env,
            MAKE_DEP_EXCLUDE: MAKE_DEP_EXCLUDE + ":" + name + ":",
          },
        });
        console.log(`DEPENDENCY: ${name} successfully built\n`);
        console.log(`cd "${root}"`);
      }
    }
  }
}
