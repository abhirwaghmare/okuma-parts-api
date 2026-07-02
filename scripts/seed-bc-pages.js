'use strict';

/**
 * seed-bc-pages.js
 *
 * One-time seeding script for the Parts Book feature.
 * Creates BC Web Pages for each assembly group within each document (machine).
 *
 * For each document → for each assembly:
 *   POST /v2/pages with the assembly's name and URL.
 *   Pages are created as invisible (is_visible: false) and type "page".
 *   Existing pages (matched by URL) are skipped.
 *
 * Usage:
 *   node scripts/seed-bc-pages.js
 *   node scripts/seed-bc-pages.js --dry-run
 *
 * Credentials are read from .env in the project root.
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BC_ACCESS_TOKEN = process.env.BC_ACCESS_TOKEN;
const BC_STORE_HASH = process.env.BC_STORE_HASH;
const PARTS_BOOK_DATA_ROOT = process.env.PARTS_BOOK_DATA_ROOT;

const DRY_RUN = process.argv.includes('--dry-run');

const API_BASE = `https://api.bigcommerce.com/stores/${BC_STORE_HASH}`;

const HEADERS = {
    'X-Auth-Token': BC_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

if (!BC_ACCESS_TOKEN || !BC_STORE_HASH || !PARTS_BOOK_DATA_ROOT) {
    console.error(
        'Missing required environment variables. Ensure BC_ACCESS_TOKEN, BC_STORE_HASH, ' +
        'and PARTS_BOOK_DATA_ROOT are set in .env'
    );
    process.exit(1);
}

if (DRY_RUN) {
    console.log('[DRY RUN] No API calls will be made.\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pause execution for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract a human-readable error message from an axios error.
 * Includes the BC API error body when available, but never the request
 * config (which would expose X-Auth-Token in logs).
 *
 * @param {Error} err
 * @returns {string}
 */
function axiosErrorMessage(err) {
    if (err.response) {
        const status = err.response.status;
        const body = err.response.data;
        const detail = body && (body.title || body.detail || JSON.stringify(body));
        return `HTTP ${status}${detail ? ` — ${detail}` : ''}`;
    }
    return err.message;
}

/**
 * Safely read and parse a JSON file. Returns null on any error.
 * @param {string} filePath
 * @returns {object|null}
 */
function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`[ERROR] Failed to read JSON at ${filePath}: ${err.message}`);
        return null;
    }
}

// ---------------------------------------------------------------------------
// BC API wrappers
// ---------------------------------------------------------------------------

/**
 * Find an existing BC web page by its URL path.
 *
 * The v2/pages API does NOT support filtering by URL via query parameter —
 * passing `url` is silently ignored and the full page list is returned.
 * Instead we fetch all pages (paginated) and match client-side by the `url`
 * field on each page object.
 *
 * This is acceptable for seeding scripts where the total page count is small
 * relative to a single run. For stores with thousands of pages, paginate with
 * limit/page params — but parts-book assembly pages are bounded by the toc.
 *
 * @param {string} pageUrl - e.g. /parts-book/lc40/assembly-name/
 * @returns {Promise<number|null>} page ID or null if not found
 */
async function findPageByUrl(pageUrl) {
    const endpoint = `${API_BASE}/v2/pages`;
    let page = 1;
    const limit = 250;

    while (true) {
        const resp = await axios.get(endpoint, {
            headers: HEADERS,
            params: { limit, page },
        });

        const pages = resp.data;

        // v2 returns a bare array; an empty array means no more pages.
        if (!Array.isArray(pages) || pages.length === 0) {
            return null;
        }

        const match = pages.find(p => p.url === pageUrl);
        if (match) {
            return match.id;
        }

        // If the response returned fewer items than the limit, we have reached
        // the last page of results.
        if (pages.length < limit) {
            return null;
        }

        page++;
        await sleep(250);
    }
}

/**
 * Create a BC web page.
 * @param {object} payload
 * @returns {Promise<number|null>} new page ID or null on failure
 */
async function createPage(payload) {
    const url = `${API_BASE}/v2/pages`;
    const resp = await axios.post(url, payload, { headers: HEADERS });
    return (resp.data && resp.data.id) || null;
}

// ---------------------------------------------------------------------------
// Counters for summary
// ---------------------------------------------------------------------------

const counters = {
    pagesCreated: 0,
    pagesSkipped: 0,
    errors: 0,
};

// ---------------------------------------------------------------------------
// Core seeding logic
// ---------------------------------------------------------------------------

/**
 * Seed BC web pages for all assemblies in a single document.
 *
 * @param {object} doc - document entry from toc.json
 * @returns {Promise<void>}
 */
async function seedDocumentPages(doc) {
    const docLabel = doc.label || doc.name || doc.pdf_id || 'Unknown';
    const pdfId = doc.pdf_id || doc.id || doc.slug || 'unknown';
    const assemblies = doc.assemblies || [];

    console.log(`\n[Machine] ${docLabel} — ${assemblies.length} assembly/assemblies`);

    for (const assembly of assemblies) {
        const assemblyLabel = assembly.label || assembly.name || assembly.slug || 'Unknown';
        const assemblySlug = assembly.slug || assembly.id || 'unknown';
        const pageUrl = `/parts-book/${pdfId}/${assemblySlug}/`;
        const pageName = `${docLabel} - ${assemblyLabel}`;

        if (DRY_RUN) {
            console.log(`  [DRY RUN] Would create page: "${pageName}" at ${pageUrl}`);
            continue;
        }

        try {
            const existingId = await findPageByUrl(pageUrl);
            await sleep(250);

            if (existingId) {
                console.log(`  Skipped (already exists): "${pageName}" (id=${existingId})`);
                counters.pagesSkipped++;
                continue;
            }

            const newId = await createPage({
                name: pageName,
                url: pageUrl,
                body: '',
                type: 'page',
                is_visible: false,
            });
            await sleep(250);

            if (newId) {
                counters.pagesCreated++;
                console.log(`  Created page: "${pageName}" (id=${newId})`);
            }
        } catch (err) {
            console.error(`  [ERROR] Page "${pageName}": ${axiosErrorMessage(err)}`);
            counters.errors++;
        }
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
    const tocPath = path.join(PARTS_BOOK_DATA_ROOT, 'toc.json');
    const toc = readJson(tocPath);
    if (!toc) {
        console.error(`Could not load toc.json from: ${tocPath}`);
        process.exit(1);
    }

    const documents = Array.isArray(toc) ? toc : (toc.documents || toc.docs || []);
    if (documents.length === 0) {
        console.error('No documents found in toc.json. Check the root key (expected array, "documents", or "docs").');
        process.exit(1);
    }

    console.log(`Found ${documents.length} document(s) in toc.json.\n`);

    for (const doc of documents) {
        await seedDocumentPages(doc);
    }

    console.log('\n------------------------------------------------------------');
    console.log('Page seeding complete.');
    console.log(
        `Created: ${counters.pagesCreated} pages. ` +
        `Skipped (already existed): ${counters.pagesSkipped}. ` +
        `Errors: ${counters.errors}`
    );
    console.log('------------------------------------------------------------');
}

main().catch(err => {
    console.error('[FATAL]', axiosErrorMessage(err));
    process.exit(1);
});
