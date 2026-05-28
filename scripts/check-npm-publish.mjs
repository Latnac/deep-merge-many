#!/usr/bin/env node
/**
 * Decide whether the current commit should trigger an npm publish.
 * Writes should_publish=true|false to GITHUB_OUTPUT when present.
 */
import { execSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const { name, version } = pkg;

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function setOutput(shouldPublish) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, `should_publish=${shouldPublish}\n`);
  if (shouldPublish) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `tag=v${version}\n`);
  }
}

function tagExistsOnOrigin(version) {
  const tag = `v${version}`;
  try {
    const remote = execSync(`git ls-remote --tags origin ${JSON.stringify(`refs/tags/${tag}`)}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return remote.length > 0;
  } catch {
    return false;
  }
}

function readVersionFromRef(ref) {
  try {
    const raw = execSync(`git show ${ref}:package.json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(raw).version;
  } catch {
    return null;
  }
}

function versionChanged(beforeSha, afterSha) {
  const beforeVersion = readVersionFromRef(beforeSha);
  const afterVersion = readVersionFromRef(afterSha);
  if (!afterVersion) {
    fail("Could not read version from package.json at current commit.");
  }
  if (beforeVersion === null) {
    console.log("No previous package.json on base ref; treating version as new.");
    return true;
  }
  return beforeVersion !== afterVersion;
}

function isPublished(name, version) {
  try {
    const published = execSync(`npm view ${JSON.stringify(`${name}@${version}`)} version`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return published === version;
  } catch {
    return false;
  }
}

if (!SEMVER.test(version)) {
  fail(`package.json version is not valid semver: ${version}`);
}

if (process.env.GITHUB_EVENT_BEFORE && process.env.GITHUB_SHA) {
  if (!versionChanged(process.env.GITHUB_EVENT_BEFORE, process.env.GITHUB_SHA)) {
    console.log(
      `Version unchanged (${version}) on this push; skip publish.`,
    );
    setOutput(false);
    process.exit(0);
  }
  console.log(`Version bump detected for ${version}.`);
} else {
  console.log("GITHUB_EVENT_BEFORE/GITHUB_SHA not set; skipping version-changed check.");
}

if (isPublished(name, version)) {
  fail(
    `Version ${version} is already published to npm. Bump package.json before merging to main.`,
  );
}

if (tagExistsOnOrigin(version)) {
  fail(
    `Git tag v${version} already exists on origin. Bump package.json before merging to main.`,
  );
}

console.log(`Ready to publish ${name}@${version} and create tag v${version}.`);
setOutput(true);
process.exit(0);
