'use strict';

/**
 * Upload Parts Book JSON and image files to BigCommerce WebDAV using Digest auth.
 *
 * Files are placed under /dav/content/parts-book/ and become publicly
 * accessible at https://store-{hash}.mybigcommerce.com/content/parts-book/
 *
 * Usage:
 *   node scripts/upload-parts-book-to-bc.js [--dry-run]
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

require(path.join(__dirname, '../app/node_modules/dotenv')).config({
    path: path.join(__dirname, '../app/.env'),
});

const STORE_HASH = process.env.BC_STORE_HASH;
const WEBDAV_USER = process.env.BC_WEBDAV_USER;
const WEBDAV_PASS = process.env.BC_WEBDAV_PASS;
const DATA_ROOT = process.env.PARTS_BOOK_DATA_ROOT;
const DRY_RUN = process.argv.includes('--dry-run');

const WEBDAV_BASE = `https://store-${STORE_HASH}.mybigcommerce.com/dav/content/parts-book`;
const WEBDAV_HOST = `store-${STORE_HASH}.mybigcommerce.com`;

// ---------------------------------------------------------------------------
// Digest auth state — fetched once, refreshed on nonce-stale 401
// ---------------------------------------------------------------------------

let digest = null; // { realm, nonce, opaque, qop }
let ncCounter = 1;

function md5(str) {
    return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

function buildDigestHeader(method, uriPath) {
    const { realm, nonce, opaque, qop } = digest;
    const HA1 = md5(`${WEBDAV_USER}:${realm}:${WEBDAV_PASS}`);
    const HA2 = md5(`${method}:${uriPath}`);
    const nc = ncCounter++;
    const ncHex = nc.toString(16).padStart(8, '0');
    const cnonce = crypto.randomBytes(4).toString('hex');
    const responseHash = md5(`${HA1}:${nonce}:${ncHex}:${cnonce}:${qop}:${HA2}`);
    return (
        `Digest username="${WEBDAV_USER}", realm="${realm}", nonce="${nonce}", ` +
        `uri="${uriPath}", qop=${qop}, nc=${ncHex}, cnonce="${cnonce}", ` +
        `response="${responseHash}", opaque="${opaque}"`
    );
}

function parseChallenge(wwwAuth) {
    const get = key => { const m = wwwAuth.match(new RegExp(`${key}="([^"]+)"`)); return m ? m[1] : null; };
    return {
        realm: get('realm'),
        nonce: get('nonce'),
        opaque: get('opaque'),
        qop: (wwwAuth.match(/qop="?([^",\s]+)/) || [])[1] || 'auth',
    };
}

// ---------------------------------------------------------------------------
// Core HTTP request
// ---------------------------------------------------------------------------

function httpsRequest(method, urlStr, extraHeaders, bodyStream, bodyLength) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(urlStr);
        const reqOptions = {
            hostname: parsed.hostname,
            path: parsed.pathname,
            method,
            headers: { ...extraHeaders },
        };

        const req = https.request(reqOptions, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString(),
            }));
        });

        req.on('error', reject);

        if (bodyStream) {
            bodyStream.pipe(req);
        } else {
            req.end();
        }
    });
}

async function fetchDigestChallenge() {
    const res = await httpsRequest('OPTIONS', `https://${WEBDAV_HOST}/dav/`, {});
    if (res.headers['www-authenticate']) {
        digest = parseChallenge(res.headers['www-authenticate']);
        ncCounter = 1;
    }
}

// ---------------------------------------------------------------------------
// WebDAV operations with automatic Digest auth + nonce refresh
// ---------------------------------------------------------------------------

async function webdavRequest(method, urlStr, extraHeaders, bodyStream, bodyLength) {
    if (!digest) await fetchDigestChallenge();

    const parsed = new URL(urlStr);
    const authHeader = buildDigestHeader(method, parsed.pathname);

    const res = await httpsRequest(method, urlStr, {
        Authorization: authHeader,
        ...extraHeaders,
    }, bodyStream, bodyLength);

    // Nonce expired — refresh and retry once
    if (res.status === 401 && res.headers['www-authenticate']) {
        digest = parseChallenge(res.headers['www-authenticate']);
        ncCounter = 1;

        const newAuth = buildDigestHeader(method, parsed.pathname);
        return httpsRequest(method, urlStr, {
            Authorization: newAuth,
            ...extraHeaders,
        }, bodyStream, bodyLength);
    }

    return res;
}

async function mkcol(dirUrl) {
    if (DRY_RUN) { console.log(`  [MKCOL] ${dirUrl.replace(WEBDAV_BASE, '')}`); return; }
    const res = await webdavRequest('MKCOL', dirUrl, {});
    if (![201, 405, 301, 302].includes(res.status)) {
        console.warn(`  MKCOL ${dirUrl.replace(WEBDAV_BASE, '')} → HTTP ${res.status}`);
    }
}

async function putFile(fileUrl, filePath) {
    const relPath = fileUrl.replace(WEBDAV_BASE, '');
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
        ext === '.json' ? 'application/json' :
        ext === '.png'  ? 'image/png' :
                          'application/octet-stream';
    const fileSize = fs.statSync(filePath).size;

    if (DRY_RUN) {
        console.log(`  [PUT]   ${relPath} (${(fileSize / 1024).toFixed(1)} KB)`);
        return;
    }

    // Digest auth signs the path, not the body — create a fresh read stream per request.
    const bodyStream = fs.createReadStream(filePath);
    const res = await webdavRequest('PUT', fileUrl, {
        'Content-Type': contentType,
        'Content-Length': fileSize,
    }, bodyStream, fileSize);

    if ([200, 201, 204].includes(res.status)) {
        console.log(`  ✓ ${relPath}`);
    } else {
        console.warn(`  ✗ ${relPath} → HTTP ${res.status}: ${res.body.slice(0, 120)}`);
    }
}

// ---------------------------------------------------------------------------
// Directory walker
// ---------------------------------------------------------------------------

async function walkAndUpload(localDir, remoteBase) {
    await mkcol(remoteBase);

    const entries = fs.readdirSync(localDir, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        const remoteUrl = `${remoteBase}/${encodeURIComponent(entry.name)}`;

        if (entry.isDirectory()) {
            await walkAndUpload(localPath, remoteUrl);
        } else if (entry.isFile()) {
            await putFile(remoteUrl, localPath);
        }
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const missing = ['BC_STORE_HASH', 'BC_WEBDAV_USER', 'BC_WEBDAV_PASS', 'PARTS_BOOK_DATA_ROOT']
        .filter(k => !process.env[k]);

    if (missing.length) { console.error(`Missing env vars: ${missing.join(', ')}`); process.exit(1); }
    if (!fs.existsSync(DATA_ROOT)) { console.error(`Data root not found: ${DATA_ROOT}`); process.exit(1); }

    let totalFiles = 0;
    function countFiles(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
            if (e.isDirectory()) countFiles(path.join(dir, e.name));
            else totalFiles++;
        });
    }
    countFiles(DATA_ROOT);

    const label = DRY_RUN ? '[DRY RUN] ' : '';
    console.log(`${label}Uploading parts book to BC WebDAV (Digest auth)`);
    console.log(`Source : ${DATA_ROOT}`);
    console.log(`Target : ${WEBDAV_BASE}`);
    console.log(`Files  : ${totalFiles}\n`);

    await walkAndUpload(DATA_ROOT, WEBDAV_BASE);

    console.log(`\n${label}Done.`);
    if (!DRY_RUN) {
        console.log(`Verify: https://store-${STORE_HASH}.mybigcommerce.com/content/parts-book/toc.json`);
    }
}

main().catch(err => { console.error('Upload failed:', err.message); process.exit(1); });
