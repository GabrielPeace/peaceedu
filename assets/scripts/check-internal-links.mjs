import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = process.cwd();
const siteDir = path.join(root, "_site");
const config = YAML.parse(fs.readFileSync(path.join(root, "_config.yml"), "utf8")) || {};
const siteUrl = new URL(config.url || "https://example.invalid");
const baseurl = String(config.baseurl || "").replace(/\/+$/, "");
const ignoredPrefixes = [
  "/assets/",
  "/feed.xml",
  "/sitemap.xml",
  "/robots.txt",
  "/algolia-records.json"
];

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function toPosix(value) {
  return value.replace(/\\/g, "/");
}

function normalizePathname(value) {
  let pathname;
  try {
    pathname = decodeURI(value.split("#")[0].split("?")[0]);
  } catch {
    pathname = value.split("#")[0].split("?")[0];
  }
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/+/g, "/");
  if (baseurl && pathname.startsWith(`${baseurl}/`)) {
    pathname = pathname.slice(baseurl.length);
  }
  return pathname;
}

function pageUrlForFile(file) {
  const relative = toPosix(path.relative(siteDir, file));
  if (relative === "index.html") return "/";
  return `/${relative.replace(/index\.html$/, "")}`;
}

function existingTargets(files) {
  const targets = new Set(["/"]);
  for (const file of files) {
    const relative = toPosix(path.relative(siteDir, file));
    const pathname = normalizePathname(`/${relative}`);
    targets.add(pathname);
    if (pathname.endsWith("/index.html")) {
      targets.add(pathname.replace(/index\.html$/, ""));
    }
  }
  return targets;
}

function shouldIgnore(rawHref, pathname) {
  if (rawHref.includes("${")) return true;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(rawHref)) return true;
  return ignoredPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

function resolveHref(rawHref, currentPageUrl) {
  let url;
  if (/^https?:\/\//i.test(rawHref)) {
    url = new URL(rawHref);
    if (url.hostname !== siteUrl.hostname) return null;
  } else if (rawHref.startsWith("//")) {
    return null;
  } else {
    url = new URL(rawHref, new URL(currentPageUrl, siteUrl));
  }

  let hash = "";
  try {
    hash = decodeURIComponent(url.hash.slice(1));
  } catch {
    hash = url.hash.slice(1);
  }
  return { pathname: normalizePathname(url.pathname), hash };
}

function hasTarget(targets, pathname) {
  if (targets.has(pathname)) return true;
  if (!pathname.endsWith("/") && targets.has(`${pathname}/`)) return true;
  if (pathname.endsWith("/") && targets.has(`${pathname}index.html`)) return true;
  return false;
}

if (!fs.existsSync(siteDir)) {
  console.error("_site does not exist. Run the Jekyll build first.");
  process.exit(1);
}

const allFiles = walk(siteDir);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const targets = existingTargets(allFiles);
const anchorsByPage = new Map();
const misses = [];
const hrefPattern = /<a\b[^>]*?\bhref=["']([^"']*)["']/g;
const anchorPattern = /\b(?:id|name)=["']([^"']+)["']/g;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const anchors = new Set();
  let match;
  while ((match = anchorPattern.exec(html))) anchors.add(match[1]);
  anchorsByPage.set(pageUrlForFile(file), anchors);
}

function anchorsForPath(pathname) {
  if (anchorsByPage.has(pathname)) return anchorsByPage.get(pathname);
  if (!pathname.endsWith("/") && anchorsByPage.has(`${pathname}/`)) {
    return anchorsByPage.get(`${pathname}/`);
  }
  if (pathname.endsWith("/index.html")) {
    return anchorsByPage.get(pathname.replace(/index\.html$/, ""));
  }
  return undefined;
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const currentPageUrl = pageUrlForFile(file);
  let match;

  while ((match = hrefPattern.exec(html))) {
    const rawHref = match[1].trim();
    if (!rawHref || rawHref === "#") {
      misses.push({
        file,
        href: rawHref || "(empty)",
        reason: rawHref ? "placeholder href" : "empty href"
      });
      continue;
    }

    let resolved;
    try {
      resolved = resolveHref(rawHref, currentPageUrl);
    } catch {
      misses.push({ file, href: rawHref, reason: "invalid URL" });
      continue;
    }

    if (!resolved || shouldIgnore(rawHref, resolved.pathname)) continue;
    if (!hasTarget(targets, resolved.pathname)) {
      misses.push({
        file,
        href: rawHref,
        reason: `missing target ${resolved.pathname}`
      });
      continue;
    }
    if (resolved.hash) {
      const anchors = anchorsForPath(resolved.pathname);
      if (anchors && !anchors.has(resolved.hash)) {
        misses.push({
          file,
          href: rawHref,
          reason: `missing anchor #${resolved.hash}`
        });
      }
    }
  }
}

if (misses.length) {
  console.error(`Internal link check failed with ${misses.length} issue(s):`);
  for (const miss of misses.slice(0, 80)) {
    console.error(
      `- ${toPosix(path.relative(siteDir, miss.file))} -> ${miss.href} (${miss.reason})`
    );
  }
  if (misses.length > 80) {
    console.error(`...and ${misses.length - 80} more.`);
  }
  process.exit(1);
}

console.log(`Internal links OK: ${htmlFiles.length} HTML files checked.`);
