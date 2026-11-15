// GOV-001 / ADR-002: dependency-free, fail-closed JSON Schema subset for the registry.
// This intentionally is not advertised as a complete draft-2020-12 implementation.
const metadata = new Set(["$schema", "$id", "title", "description", "$comment", "default", "examples"]);
const supported = new Set(["type", "required", "properties", "additionalProperties", "items", "minItems", "maxItems", "uniqueItems", "minLength", "maxLength", "pattern", "enum", "const", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", ...metadata]);
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const canonical = (value) => JSON.stringify(Array.isArray(value) ? value.map((item) => JSON.parse(canonical(item))) : isObject(value) ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, JSON.parse(canonical(value[key]))])) : value);

function checkSchema(schema, path = "schema") {
  if (typeof schema === "boolean") return;
  if (!isObject(schema)) throw new Error(`${path}: schema must be an object or boolean`);
  for (const key of Object.keys(schema)) if (!supported.has(key)) throw new Error(`${path}: Unsupported JSON Schema keyword ${key}; extend the validator with tests first`);
  if (schema.$schema && schema.$schema !== "https://json-schema.org/draft/2020-12/schema") throw new Error(`${path}: Unsupported schema dialect`);
  if (schema.type && !["object", "array", "string", "number", "integer", "boolean", "null"].includes(schema.type)) throw new Error(`${path}: Unsupported schema type`);
  for (const name of ["minLength", "maxLength", "minItems", "maxItems"]) if (schema[name] !== undefined && (!Number.isInteger(schema[name]) || schema[name] < 0)) throw new Error(`${path}: invalid ${name} schema`);
  for (const name of ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"]) if (schema[name] !== undefined && (typeof schema[name] !== "number" || !Number.isFinite(schema[name]))) throw new Error(`${path}: invalid ${name} schema`);
  if (schema.required !== undefined && (!Array.isArray(schema.required) || schema.required.some((key) => typeof key !== "string") || new Set(schema.required).size !== schema.required.length)) throw new Error(`${path}: invalid required schema`);
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || !schema.enum.length || new Set(schema.enum.map(canonical)).size !== schema.enum.length)) throw new Error(`${path}: invalid enum schema`);
  if (schema.properties !== undefined && !isObject(schema.properties)) throw new Error(`${path}: invalid properties schema`);
  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== "boolean" && !isObject(schema.additionalProperties)) throw new Error(`${path}: invalid additionalProperties schema`);
  if (schema.uniqueItems !== undefined && typeof schema.uniqueItems !== "boolean") throw new Error(`${path}: invalid uniqueItems schema`);
  if (schema.pattern !== undefined && typeof schema.pattern !== "string") throw new Error(`${path}: invalid pattern schema`);
  if (schema.properties) for (const [key, child] of Object.entries(schema.properties)) checkSchema(child, `${path}.properties.${key}`);
  if (schema.items !== undefined) checkSchema(schema.items, `${path}.items`);
  if (isObject(schema.additionalProperties)) checkSchema(schema.additionalProperties, `${path}.additionalProperties`);
  if (schema.pattern) new RegExp(schema.pattern, "u");
}

/** GOV-001: throws for invalid data or unsupported schema semantics. */
export function validateAgainstSchema(value, schema) {
  checkSchema(schema);
  function visit(item, shape, path) {
    if (shape === true) return;
    if (shape === false) throw new Error(`${path}: forbidden by schema`);
    const actual = item === null ? "null" : Array.isArray(item) ? "array" : typeof item;
    if (shape.type && !(shape.type === "integer" ? Number.isInteger(item) : actual === shape.type)) throw new Error(`${path}: expected ${shape.type}`);
    if (shape.enum && !shape.enum.some((candidate) => canonical(candidate) === canonical(item))) throw new Error(`${path}: not in enum`);
    if (Object.hasOwn(shape, "const") && canonical(shape.const) !== canonical(item)) throw new Error(`${path}: does not match const`);
    if (typeof item === "string") {
      const length = [...item].length;
      if (shape.minLength !== undefined && length < shape.minLength) throw new Error(`${path}: string length below ${shape.minLength}`);
      if (shape.maxLength !== undefined && length > shape.maxLength) throw new Error(`${path}: string length above ${shape.maxLength}`);
      if (shape.pattern && !new RegExp(shape.pattern, "u").test(item)) throw new Error(`${path}: pattern mismatch`);
    }
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw new Error(`${path}: number must be finite`);
      for (const [name, fails] of [["minimum", item < shape.minimum], ["maximum", item > shape.maximum], ["exclusiveMinimum", item <= shape.exclusiveMinimum], ["exclusiveMaximum", item >= shape.exclusiveMaximum]]) if (shape[name] !== undefined && fails) throw new Error(`${path}: ${name} violated`);
    }
    if (Array.isArray(item)) {
      if (shape.minItems !== undefined && item.length < shape.minItems) throw new Error(`${path}: too few items`);
      if (shape.maxItems !== undefined && item.length > shape.maxItems) throw new Error(`${path}: too many items`);
      if (shape.uniqueItems && new Set(item.map(canonical)).size !== item.length) throw new Error(`${path}: duplicate items`);
      if (shape.items !== undefined) item.forEach((child, index) => visit(child, shape.items, `${path}[${index}]`));
    }
    if (isObject(item)) {
      for (const key of shape.required || []) if (!Object.hasOwn(item, key)) throw new Error(`${path}.${key}: required property missing`);
      for (const [key, child] of Object.entries(item)) {
        if (Object.hasOwn(shape.properties || {}, key)) visit(child, shape.properties[key], `${path}.${key}`);
        else if (shape.additionalProperties === false) throw new Error(`${path}.${key}: additional property forbidden`);
        else if (isObject(shape.additionalProperties)) visit(child, shape.additionalProperties, `${path}.${key}`);
      }
    }
  }
  visit(value, schema, "$" );
  return value;
}
