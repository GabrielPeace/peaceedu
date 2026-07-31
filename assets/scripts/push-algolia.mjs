import crypto from "node:crypto";
import fs from "node:fs/promises";
import { algoliasearch } from "algoliasearch";
import YAML from "yaml";

const {
  ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_API_KEY,
  ALGOLIA_INDEX_NAME,
  JEKYLL_CONFIG
} = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY || !ALGOLIA_INDEX_NAME) {
  console.error(
    "ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, and ALGOLIA_INDEX_NAME are required."
  );
  process.exit(1);
}

const inputPath = process.argv[2] || "_site/algolia-records.json";
const maximumRecordBytes = 10_000;

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stableObjectID(url, index) {
  const hash = crypto
    .createHash("sha1")
    .update(`${url}#${index}`)
    .digest("hex")
    .slice(0, 16);
  return `${url}#${index}-${hash}`;
}

function pickString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function globToRegExp(glob) {
  const source = safePath(glob)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, ".*");
  return new RegExp(`^${source}$`, "i");
}

async function loadExcludePatterns() {
  try {
    const configPath = JEKYLL_CONFIG || "_config.yml";
    const config = YAML.parse(await fs.readFile(configPath, "utf8")) || {};
    return (config.algolia?.files_to_exclude || []).map(globToRegExp);
  } catch (error) {
    console.warn(`Could not read Algolia exclusions: ${error.message}`);
    return [];
  }
}

function shouldExcludeRecord(record, patterns) {
  const path = safePath(record.path);

  if (patterns.some((pattern) => pattern.test(path))) return true;
  if (path.startsWith("docs/_pages/")) return true;
  if (/^(tags|categories|assets|images|js|css)(\/|$)/i.test(path)) return true;
  if (/\/(page\d+|posts\/page\d+)\/?$/i.test(record.url)) return true;

  return false;
}

function prepareRecord(record) {
  const url = pickString(record.url);
  return {
    ...record,
    objectID: stableObjectID(url, 0),
    description: normalizeText(record.description),
    content: normalizeText(record.content).slice(0, 2000)
  };
}

try {
  const sourceRecords = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const excludePatterns = await loadExcludePatterns();
  const records = sourceRecords
    .filter((record) => !shouldExcludeRecord(record, excludePatterns))
    .map(prepareRecord);

  const oversizedRecord = records.find(
    (record) => Buffer.byteLength(JSON.stringify(record), "utf8") >= maximumRecordBytes
  );

  if (oversizedRecord) {
    const bytes = Buffer.byteLength(JSON.stringify(oversizedRecord), "utf8");
    throw new Error(
      `Prepared record exceeds ${maximumRecordBytes} bytes: ${oversizedRecord.url} (${bytes} bytes)`
    );
  }

  console.log(
    `Prepared ${records.length} Algolia records from ${sourceRecords.length} generated pages.`
  );

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);
  await client.replaceAllObjects({
    indexName: ALGOLIA_INDEX_NAME,
    objects: records
  });

  console.log(`Algolia index updated: ${ALGOLIA_INDEX_NAME}.`);
} catch (error) {
  console.error(`Algolia push failed: ${error.message}`);
  process.exit(1);
}
