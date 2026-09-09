// Am I in the right tree?
//
// 65 ROSES and Terra OS are near-identical: Next 15, Prisma 6, next-auth 5,
// Tailwind 4, the same src/lib/providers/ shape, the same file names. A session
// started in the wrong directory looks completely normal until it has written
// to the wrong database. This runs before dev, build and test so that mistake
// costs a second instead of a night.
import { readFileSync } from "node:fs";

const EXPECTED_NAME = "65roses";
// Any database this project may legitimately talk to has this in its name.
const EXPECTED_DB = "roses";

function die(what, detail) {
  console.error(`\n  ✕ WRONG REPOSITORY — ${what}\n    ${detail}\n`);
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
} catch {
  die("package.json is unreadable", "This script must live in the 65 ROSES tree.");
}

if (pkg.name !== EXPECTED_NAME) {
  die(
    `package.json says "${pkg.name}", expected "${EXPECTED_NAME}"`,
    "This is 65 ROSES tooling running in another project. Stop and change directory.",
  );
}

// The catastrophic case: a 65 ROSES command pointed at another project's
// database. `prisma migrate reset --force` there would take the Roses with it.
const url = process.env.DATABASE_URL;
if (url) {
  const name = url.split("?")[0].split("/").pop() ?? "";
  if (!name.toLowerCase().includes(EXPECTED_DB)) {
    die(
      `DATABASE_URL points at "${name}"`,
      `A 65 ROSES database must have "${EXPECTED_DB}" in its name. Refusing to touch this one.`,
    );
  }
}
