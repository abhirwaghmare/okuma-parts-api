'use strict';

/**
 * seed-bc-parts.js
 *
 * One-time seeding script for the Parts Book feature.
 * Reads extracted PDF data from PARTS_BOOK_DATA_ROOT and creates:
 *   - One BC category per machine (document)
 *   - One BC product per unique part number per machine
 *   - BC metafields on each product with callout coordinate data
 *
 * Usage:
 *   node scripts/seed-bc-parts.js
 *   node scripts/seed-bc-parts.js --dry-run
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
 * Convert raw callout_box_2d coordinates to percentage center values.
 * callout_box_2d is [ymin, xmin, ymax, xmax] normalised 0-1000.
 *
 * @param {number[]} box - [ymin, xmin, ymax, xmax]
 * @returns {{ cx: number, cy: number }}
 */
function boxToCenter(box) {
    const [ymin, xmin, ymax, xmax] = box;
    const cx = ((xmin + xmax) / 2) / 10;
    const cy = ((ymin + ymax) / 2) / 10;
    return { cx, cy };
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
// BC API wrappers (all return null on failure, log and continue)
// ---------------------------------------------------------------------------

/**
 * Find an existing BC category by exact name using the v3 catalog API.
 * v3 wraps results in { data: [] }.
 * @param {string} name
 * @returns {Promise<number|null>} category ID or null if not found
 */
async function findCategoryByName(name) {
    const url = `${API_BASE}/v3/catalog/categories`;
    const resp = await axios.get(url, {
        headers: HEADERS,
        params: { name },
    });
    const categories = resp.data && resp.data.data;
    if (Array.isArray(categories) && categories.length > 0) {
        return categories[0].id;
    }
    return null;
}

/**
 * Create a top-level BC category using the v3 catalog API.
 * v3 POST returns { data: { id, ... } }.
 * @param {string} name
 * @returns {Promise<number|null>} new category ID or null on failure
 */
async function createCategory(name) {
    const url = `${API_BASE}/v3/catalog/categories`;
    const resp = await axios.post(url, { name, is_visible: true, parent_id: 0 }, { headers: HEADERS });
    return (resp.data && resp.data.data && resp.data.data.id) || null;
}

/**
 * Find an existing BC product by SKU.
 * @param {string} sku
 * @returns {Promise<object|null>} product object or null
 */
async function findProductBySku(sku) {
    const url = `${API_BASE}/v3/catalog/products`;
    const resp = await axios.get(url, {
        headers: HEADERS,
        params: { sku },
    });
    const data = resp.data && resp.data.data;
    if (Array.isArray(data) && data.length > 0) {
        return data[0];
    }
    return null;
}

/**
 * Create a BC product.
 * @param {object} payload
 * @returns {Promise<object|null>} created product or null on failure
 */
async function createProduct(payload) {
    const url = `${API_BASE}/v3/catalog/products`;
    const resp = await axios.post(url, payload, { headers: HEADERS });
    return (resp.data && resp.data.data) || null;
}

/**
 * Partially update a BC product (PATCH — only supplied fields are changed).
 * @param {number} productId
 * @param {object} payload
 * @returns {Promise<void>}
 */
async function updateProduct(productId, payload) {
    const url = `${API_BASE}/v3/catalog/products/${productId}`;
    await axios.patch(url, payload, { headers: HEADERS });
}

/**
 * Fetch all existing metafields for a product.
 * @param {number} productId
 * @returns {Promise<object[]>}
 */
async function getProductMetafields(productId) {
    const url = `${API_BASE}/v3/catalog/products/${productId}/metafields`;
    const resp = await axios.get(url, { headers: HEADERS });
    return (resp.data && resp.data.data) || [];
}

/**
 * Create a single metafield on a product.
 * @param {number} productId
 * @param {object} payload
 * @returns {Promise<void>}
 */
async function createMetafield(productId, payload) {
    const url = `${API_BASE}/v3/catalog/products/${productId}/metafields`;
    await axios.post(url, payload, { headers: HEADERS });
}

/**
 * Update an existing metafield on a product.
 * @param {number} productId
 * @param {number} metafieldId
 * @param {object} payload
 * @returns {Promise<void>}
 */
async function updateMetafield(productId, metafieldId, payload) {
    const url = `${API_BASE}/v3/catalog/products/${productId}/metafields/${metafieldId}`;
    await axios.put(url, payload, { headers: HEADERS });
}

// ---------------------------------------------------------------------------
// Metafield upsert
// ---------------------------------------------------------------------------

/**
 * Idempotently set a metafield on a product. Checks existing metafields first,
 * updates if the key already exists, creates otherwise.
 *
 * @param {number} productId
 * @param {object[]} existingMetafields - already-fetched list for this product
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
async function upsertMetafield(productId, existingMetafields, key, value) {
    const NAMESPACE = 'parts_book';
    const PERMISSION = 'read_and_sf_access';
    const existing = existingMetafields.find(m => m.namespace === NAMESPACE && m.key === key);
    const payload = { namespace: NAMESPACE, key, value, permission_set: PERMISSION };
    if (existing) {
        await updateMetafield(productId, existing.id, payload);
    } else {
        await createMetafield(productId, payload);
    }
}

// ---------------------------------------------------------------------------
// Counters for summary
// ---------------------------------------------------------------------------

const counters = {
    categoriesCreated: 0,
    productsCreated: 0,
    productsUpdated: 0,
    metafieldsSet: 0,
    errors: 0,
};

// ---------------------------------------------------------------------------
// Core seeding logic
// ---------------------------------------------------------------------------

/**
 * Ensure a BC category exists for the given document label. Returns the
 * category ID whether it was found or created.
 *
 * @param {string} docLabel
 * @returns {Promise<number|null>}
 */
async function ensureCategory(docLabel) {
    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create/find category: "${docLabel}"`);
        return -1;
    }
    try {
        const existingId = await findCategoryByName(docLabel);
        await sleep(250);
        if (existingId) {
            console.log(`  Category already exists: "${docLabel}" (id=${existingId})`);
            return existingId;
        }
        const newId = await createCategory(docLabel);
        await sleep(250);
        if (newId) {
            counters.categoriesCreated++;
            console.log(`  Created category: "${docLabel}" (id=${newId})`);
        }
        return newId;
    } catch (err) {
        console.error(`  [ERROR] Category "${docLabel}": ${axiosErrorMessage(err)}`);
        counters.errors++;
        return null;
    }
}

/**
 * Collect all unique parts for a document. Parts with the same part_no are
 * deduplicated — the first occurrence is used for product creation, but every
 * occurrence is recorded in the `occurrences` array for metafield population.
 *
 * @param {object} doc - document entry from toc.json
 * @returns {Map<string, { primary: object, pdfId: string, assemblySlug: string, sheetSlug: string, occurrences: object[] }>}
 */
function collectUniqueParts(doc) {
    /** @type {Map<string, object>} */
    const partsMap = new Map();

    for (const assembly of (doc.assemblies || [])) {
        for (const sheet of (assembly.sheets || [])) {
            const partsFile = sheet.parts_json;
            if (!partsFile) continue;

            const absPath = path.isAbsolute(partsFile)
                ? partsFile
                : path.join(PARTS_BOOK_DATA_ROOT, partsFile);

            const partsData = readJson(absPath);
            if (!partsData || !Array.isArray(partsData.parts)) continue;

            for (const part of partsData.parts) {
                if (!part.has_table_match) continue;
                if (!part.part_no) continue;

                const occurrence = {
                    part,
                    pdfId: doc.pdf_id || doc.id || doc.slug || '',
                    assemblySlug: assembly.slug || assembly.id || '',
                    sheetSlug: sheet.slug || sheet.id || '',
                };

                if (partsMap.has(part.part_no)) {
                    partsMap.get(part.part_no).occurrences.push(occurrence);
                } else {
                    partsMap.set(part.part_no, {
                        primary: part,
                        pdfId: occurrence.pdfId,
                        assemblySlug: occurrence.assemblySlug,
                        sheetSlug: occurrence.sheetSlug,
                        occurrences: [occurrence],
                    });
                }
            }
        }
    }

    return partsMap;
}

/**
 * Ensure a BC product exists for the given part. Returns the product ID.
 *
 * @param {string} partNo
 * @param {object} primary - part record from parts.json
 * @param {number} categoryId
 * @returns {Promise<number|null>}
 */
async function ensureProduct(partNo, primary, categoryId) {
    if (DRY_RUN) {
        console.log(`    [DRY RUN] Would create/update product SKU="${partNo}" name="${primary.description}"`);
        return -1;
    }
    try {
        const existing = await findProductBySku(partNo);
        await sleep(250);

        if (existing) {
            const currentCategories = existing.categories || [];
            if (!currentCategories.includes(categoryId)) {
                await updateProduct(existing.id, {
                    categories: [...currentCategories, categoryId],
                });
                await sleep(250);
                counters.productsUpdated++;
                console.log(`    Updated product (added category) SKU="${partNo}" (id=${existing.id})`);
            } else {
                console.log(`    Product already up to date SKU="${partNo}" (id=${existing.id})`);
            }
            return existing.id;
        }

        const created = await createProduct({
            name: primary.description || partNo,
            sku: partNo,
            type: 'physical',
            price: 0,
            weight: 0,
            categories: [categoryId],
            is_visible: true,
        });
        await sleep(250);

        if (created) {
            counters.productsCreated++;
            console.log(`    Created product SKU="${partNo}" (id=${created.id})`);
            return created.id;
        }
        return null;
    } catch (err) {
        console.error(`    [ERROR] Product SKU="${partNo}": ${axiosErrorMessage(err)}`);
        counters.errors++;
        return null;
    }
}

/**
 * Set parts_book metafields on a product using the primary occurrence.
 *
 * @param {number} productId
 * @param {object} primary - part record
 * @param {string} pdfId
 * @param {string} assemblySlug
 * @param {string} sheetSlug
 * @returns {Promise<void>}
 */
async function setMetafields(productId, primary, pdfId, assemblySlug, sheetSlug) {
    if (DRY_RUN) {
        console.log(`    [DRY RUN] Would set metafields on product id=${productId}`);
        return;
    }
    try {
        const existingMetafields = await getProductMetafields(productId);
        await sleep(250);

        const sheetId = `${pdfId}/${assemblySlug}/${sheetSlug}`;
        const { cx, cy } = primary.callout_box_2d
            ? boxToCenter(primary.callout_box_2d)
            : { cx: 0, cy: 0 };

        const fields = [
            { key: 'sheet_id', value: sheetId },
            { key: 'callout_no', value: String(primary.callout_number || '') },
            { key: 'callout_x', value: String(cx) },
            { key: 'callout_y', value: String(cy) },
            { key: 'unit_no', value: String(primary.unit_no || '') },
            { key: 'sheet_item', value: String(primary.sheet_item || '') },
        ];

        for (const field of fields) {
            await upsertMetafield(productId, existingMetafields, field.key, field.value);
            await sleep(250);
            counters.metafieldsSet++;
        }
    } catch (err) {
        console.error(`    [ERROR] Metafields for product id=${productId}: ${axiosErrorMessage(err)}`);
        counters.errors++;
    }
}

/**
 * Seed all BC data for a single document (machine).
 *
 * @param {object} doc - document entry from toc.json
 * @returns {Promise<void>}
 */
async function seedDocument(doc) {
    const docLabel = doc.label || doc.name || doc.pdf_id || 'Unknown';
    console.log(`\n[Machine] ${docLabel}`);

    const categoryId = await ensureCategory(docLabel);
    if (categoryId === null) {
        console.error(`  Skipping document "${docLabel}" — could not obtain category.`);
        return;
    }

    const partsMap = collectUniqueParts(doc);
    const partEntries = Array.from(partsMap.entries());
    const total = partEntries.length;
    console.log(`  Collected ${total} unique parts.`);

    let index = 0;
    for (const [partNo, { primary, pdfId, assemblySlug, sheetSlug }] of partEntries) {
        index++;
        console.log(`  [${index}/${total}] Processing part ${partNo}...`);

        const productId = await ensureProduct(partNo, primary, categoryId);
        if (productId === null) continue;

        await setMetafields(productId, primary, pdfId, assemblySlug, sheetSlug);
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
        await seedDocument(doc);
    }

    console.log('\n------------------------------------------------------------');
    console.log('Seeding complete.');
    console.log(
        `Created: ${counters.categoriesCreated} categories, ` +
        `${counters.productsCreated} products, ` +
        `${counters.metafieldsSet} metafields. ` +
        `Updated: ${counters.productsUpdated} products. ` +
        `Errors: ${counters.errors}`
    );
    console.log('------------------------------------------------------------');
}

main().catch(err => {
    console.error('[FATAL]', axiosErrorMessage(err));
    process.exit(1);
});
