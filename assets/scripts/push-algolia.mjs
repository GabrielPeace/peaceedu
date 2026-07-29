import fs from "node:fs/promises";
import { algoliasearch } from "algoliasearch";
import YAML from "yaml";

const inputPath = process.argv[2] || "_site/algolia-records.json";
const configPath = process.env.JEKYLL_CONFIG || "_config.yml";
const adminApiKey =
  process.env.ALGOLIA_ADMIN_API_KEY ||
  process.env.ALGOLIA_API_KEY;

if (!adminApiKey) {
  console.error("ALGOLIA_ADMIN_API_KEY (or ALGOLIA_API_KEY) is required.");
  process.exit(1);
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

try {
  const config = YAML.parse(await fs.readFile(configPath, "utf8")) || {};
  const appId = process.env.ALGOLIA_APP_ID || config.algolia?.application_id;
  const indexName = process.env.ALGOLIA_INDEX_NAME || config.algolia?.index_name;

  if (!appId || !indexName) {
    throw new Error("Algolia application_id and index_name must be configured.");
  }

  const rawRecords = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const records = rawRecords.map((record) => ({
    ...record,
    description: normalizeText(record.description),
    content: normalizeText(record.content).slice(0, 5000)
  }));

  const client = algoliasearch(appId, adminApiKey);
  await client.replaceAllObjects({
    indexName,
    objects: records
  });

  console.log(`Algolia index updated: ${indexName}, ${records.length} records.`);
} catch (error) {
  console.error(`Algolia push failed: ${error.message}`);
  process.exit(1);
}
