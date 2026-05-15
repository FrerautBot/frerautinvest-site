#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const DIST_DIR = path.join(__dirname, "dist");
const USERNAME = "u119284082";
const DOMAIN = "frerautinvest.com";
const TOKEN = process.env.HOSTINGER_API_TOKEN;

if (!TOKEN) {
  console.error("ERROR: HOSTINGER_API_TOKEN no está definido");
  process.exit(1);
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() })
      );
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function requestBinary(options, buf) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() })
      );
    });
    req.on("error", reject);
    req.write(buf);
    req.end();
  });
}

async function uploadFile(hostname, urlBase, authKey, restAuthKey, fileBuffer, remotePath) {
  const fullPath = `${urlBase}/${remotePath}?override=true`;
  const size = fileBuffer.length;

  const post = await request({
    hostname, path: fullPath, method: "POST",
    headers: { "X-Auth": authKey, "X-Auth-Rest": restAuthKey, "upload-length": String(size), "upload-offset": "0", "Content-Length": "0" },
  });
  if (post.status !== 201) throw new Error(`POST ${remotePath} → HTTP ${post.status}: ${post.body}`);

  const patch = await requestBinary({
    hostname, path: fullPath, method: "PATCH",
    headers: { "X-Auth": authKey, "X-Auth-Rest": restAuthKey, "Content-Type": "application/offset+octet-stream", "upload-offset": "0", "Content-Length": String(size) },
  }, fileBuffer);
  if (patch.status !== 204) throw new Error(`PATCH ${remotePath} → HTTP ${patch.status}: ${patch.body}`);

  console.log(`  ✓ ${remotePath}`);
}

function walkDir(dir, base) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walkDir(full, rel));
    else files.push({ full, rel: rel.replace(/\\/g, "/") });
  }
  return files;
}

async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error("ERROR: dist/ no existe — ejecuta 'npm run build' primero");
    process.exit(1);
  }

  const files = walkDir(DIST_DIR, "");
  console.log(`\nArchivos a subir: ${files.length}`);

  const credBody = JSON.stringify({ username: USERNAME, domain: DOMAIN });
  const credRes = await request({
    hostname: "developers.hostinger.com",
    path: "/api/hosting/v1/files/upload-urls",
    method: "POST",
    headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(credBody) },
  }, credBody);

  if (credRes.status !== 200) throw new Error(`Credenciales → HTTP ${credRes.status}: ${credRes.body}`);

  const { url, auth_key, rest_auth_key } = JSON.parse(credRes.body);
  const uploadUrl = new URL(url);
  const hostname = uploadUrl.hostname;
  const urlBase = uploadUrl.pathname.replace(/\/$/, "");

  console.log(`URL Hostinger: ${url}\n`);

  for (const { full, rel } of files) {
    await uploadFile(hostname, urlBase, auth_key, rest_auth_key, fs.readFileSync(full), rel);
  }

  console.log(`\n✓ Deploy completado → https://${DOMAIN}`);
}

main().catch((err) => {
  console.error("\n✗ ERROR:", err.message);
  process.exit(1);
});
