#!/usr/bin/env node
/**
 * Sync host_permissions and CSP connect-src from api-config.json into manifest.json.
 * Run after changing productionApiBase: node sync-manifest.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(dir, "api-config.json");
const manifestPath = path.join(dir, "manifest.json");

const { productionApiBase } = JSON.parse(fs.readFileSync(configPath, "utf8"));
const production = new URL(productionApiBase.replace(/\/$/, ""));
const productionOrigin = production.origin;

const localPatterns = [
  "http://localhost:8000/*",
  "http://127.0.0.1:8000/*",
];
const productionPattern = `${productionOrigin}/*`;
const hostPermissions = [
  ...new Set([...localPatterns, productionPattern]),
];

const connectSrc = new Set([
  "'self'",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  productionOrigin,
]);
if (production.protocol === "http:") {
  connectSrc.add(`https://${production.host}`);
}
if (production.protocol === "https:") {
  connectSrc.add(`http://${production.host}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.host_permissions = hostPermissions;
manifest.content_security_policy = {
  extension_pages: `script-src 'self'; object-src 'self'; connect-src ${[...connectSrc].join(" ")}`,
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Updated manifest.json (production: ${productionOrigin})`);
