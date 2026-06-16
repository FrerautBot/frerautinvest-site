// deploy-hostinger.cjs — Sube el build a frerautinvest.com vía API TUS
// Uso: HOSTINGER_API_TOKEN=xxx node deploy-hostinger.cjs
// El token está en IULER/config/.env del PC prode

const fs = require('fs');
const path = require('path');
const https = require('https');

const USERNAME = 'u119284082';
const DOMAIN = 'frerautinvest.com';
const DIST = path.join(__dirname, 'dist');

const FILES = [
  { local: 'index.html', remote: 'index.html' },
  { local: 'vite.svg', remote: 'vite.svg' },
];

async function main() {
  const token = process.env.HOSTINGER_API_TOKEN;
  if (!token) {
    console.error('ERROR: Falta HOSTINGER_API_TOKEN');
    console.error('  En PC prode: export HOSTINGER_API_TOKEN=$(grep HOSTINGER_API_TOKEN IULER/config/.env | cut -d= -f2)');
    process.exit(1);
  }

  if (!fs.existsSync(DIST)) {
    console.error('ERROR: No existe dist/. Ejecuta "npm run build" primero');
    process.exit(1);
  }

  // Leer directorio assets/
  const assetsDir = path.join(DIST, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const file of fs.readdirSync(assetsDir)) {
      FILES.push({ local: `assets/${file}`, remote: `assets/${file}` });
    }
  }

  // Paso 1: Obtener credenciales temporales
  console.log('Obteniendo credenciales TUS...');
  const { url, auth_key, rest_auth_key } = await apiPost(
    'https://developers.hostinger.com/api/hosting/v1/files/upload-urls',
    { username: USERNAME, domain: DOMAIN },
    token
  );
  console.log(`  URL base: ${url}`);

  // Paso 2-3: Subir cada archivo
  for (const file of FILES) {
    const localPath = path.join(DIST, file.local);
    if (!fs.existsSync(localPath)) {
      console.warn(`  [SKIP] ${file.local} — no existe`);
      continue;
    }
    const content = fs.readFileSync(localPath);
    const remotePath = `/${file.remote}`;

    console.log(`Subiendo ${file.local} (${(content.length / 1024).toFixed(1)}KB)...`);

    // Pre-upload (POST)
    await tusPost(url, remotePath, auth_key, rest_auth_key, content.length);

    // Upload (PATCH)
    await tusPatch(url, remotePath, auth_key, rest_auth_key, content);
    console.log(`  ✓ ${file.remote}`);
  }

  console.log('\n✅ Deploy completado');
}

function apiPost(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(d));
        else reject(new Error(`POST ${url} → ${res.statusCode}: ${d}`));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function tusPost(baseUrl, remotePath, authKey, restAuthKey, length) {
  return new Promise((resolve, reject) => {
    const u = new URL(baseUrl + remotePath + '?override=true');
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: {
        'X-Auth': authKey, 'X-Auth-Rest': restAuthKey,
        'upload-length': String(length), 'upload-offset': '0', 'Content-Length': '0'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode === 201) resolve();
        else reject(new Error(`TUS POST → ${res.statusCode}: ${d}`));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function tusPatch(baseUrl, remotePath, authKey, restAuthKey, content) {
  return new Promise((resolve, reject) => {
    const u = new URL(baseUrl + remotePath + '?override=true');
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH',
      headers: {
        'X-Auth': authKey, 'X-Auth-Rest': restAuthKey,
        'Content-Type': 'application/offset+octet-stream',
        'upload-offset': '0', 'Content-Length': String(content.length)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode === 204) resolve();
        else reject(new Error(`TUS PATCH → ${res.statusCode}: ${d}`));
      });
    });
    req.on('error', reject);
    req.write(content);
    req.end();
  });
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
