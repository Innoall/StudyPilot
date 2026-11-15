import { readFile } from "node:fs/promises";
import { validateAgainstSchema } from "./validate-schema.mjs";

// requirements.yaml deliberately uses the JSON-compatible YAML subset.
const [registry, schema] = await Promise.all([
  readFile(new URL("../docs/req/requirements.yaml", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../docs/req/req-schema.json", import.meta.url), "utf8").then(JSON.parse),
]);
validateAgainstSchema(registry, schema);
const ids = new Set();
for (const requirement of registry.requirements) {
  if (ids.has(requirement.id)) throw new Error(`Duplicate requirement id: ${requirement.id}`);
  ids.add(requirement.id);
  for (const field of ["metric", "threshold", "verification"]) if (!requirement.fitCriterion[field].trim()) throw new Error(`${requirement.id}: fitCriterion.${field} must not be blank`);
}
console.log(`Validated ${registry.requirements.length} requirements against docs/req/req-schema.json (strict supported subset; unsupported schema keywords fail closed).`);
