'use strict';

const axios = require('axios');
const { Router } = require('express');
const config = require('../config');
const bcClient = require('../services/bigcommerce');
const logger = require('../config/logger');

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch and parse a JSON file from the BC CDN content store.
 * Returns null on 404, network error, or parse failure.
 *
 * @param {string} relativePath - Path relative to cdnBaseUrl (forward slashes).
 * @returns {Promise<object|null>}
 */
async function fetchDataJson(relativePath) {
    const cdnBase = config.partsBook.cdnBaseUrl;
    const url = `${cdnBase}/${relativePath}`;
    try {
        const res = await axios.get(url, { timeout: 15000 });
        return res.data;
    } catch (err) {
        if (err.response && err.response.status === 404) {
            return null;
        }
        logger.error(`parts-book: failed to fetch ${url}`, { message: err.message });
        return null;
    }
}

/**
 * Rewrite image paths in a TOC document so every `overview_image` and
 * `assembly_image` field becomes a full BC CDN URL the browser can fetch.
 *
 * @param {object} toc - The raw toc.json object.
 * @returns {object} - A deep-cloned copy with rewritten image paths.
 */
function rewriteTocImagePaths(toc) {
    const cdnBase = config.partsBook.cdnBaseUrl;
    const rewrite = relPath => `${cdnBase}/${relPath}`;

    const documents = (toc.documents || []).map(doc => {
        const assemblies = (doc.assemblies || []).map(assembly => {
            const sheets = (assembly.sheets || []).map(sheet => ({
                ...sheet,
                assembly_image: sheet.assembly_image ? rewrite(sheet.assembly_image) : sheet.assembly_image,
            }));

            return {
                ...assembly,
                overview_image: assembly.overview_image ? rewrite(assembly.overview_image) : assembly.overview_image,
                sheets,
            };
        });

        return {
            ...doc,
            overview_image: doc.overview_image ? rewrite(doc.overview_image) : doc.overview_image,
            assemblies,
        };
    });

    return { ...toc, documents };
}

/**
 * Convert a callout_box_2d coordinate ([ymin, xmin, ymax, xmax] in 0-1000 space)
 * to centre-percentage values suitable for CSS `left`/`top` positioning.
 *
 * @param {number[]} box - [ymin, xmin, ymax, xmax] — must have exactly 4 numeric elements.
 * @returns {{ calloutX: number, calloutY: number }|null} - null when the box is malformed.
 */
function boxToPercent(box) {
    if (!Array.isArray(box) || box.length !== 4 || box.some(v => typeof v !== 'number' || Number.isNaN(v))) {
        return null;
    }
    const [ymin, xmin, ymax, xmax] = box;
    const cx = parseFloat((((xmin + xmax) / 2) / 10).toFixed(2));
    const cy = parseFloat((((ymin + ymax) / 2) / 10).toFixed(2));
    return { calloutX: cx, calloutY: cy };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * Fetch category images from BC for any toc documents that have a category_id.
 * Returns a map of category_id → image_url (empty string when no image).
 *
 * @param {number[]} categoryIds
 * @returns {Promise<Object.<number, string>>}
 */
async function fetchCategoryImages(categoryIds) {
    if (!categoryIds.length) return {};
    try {
        const response = await bcClient.get('/v3/catalog/categories', {
            params: {
                'id:in': categoryIds.join(','),
                limit: categoryIds.length,
                include_fields: 'id,image_url',
            },
        });
        const result = {};
        (response.data?.data || []).forEach(cat => {
            result[cat.id] = cat.image_url || '';
        });
        return result;
    } catch (err) {
        logger.error('parts-book: category image lookup failed', { message: err.message });
        return {};
    }
}

/**
 * GET /api/parts-book/toc
 *
 * Returns the master table of contents with all image paths rewritten to
 * BC CDN URLs. When a document has a category_id, its category_image field
 * is populated from the BC category image.
 */
router.get('/api/parts-book/toc', async (req, res) => {
    const toc = await fetchDataJson('toc.json');

    if (!toc) {
        logger.error('parts-book: toc.json not found', { cdnBase: config.partsBook.cdnBaseUrl });
        return res.status(500).json({ error: 'Table of contents not available.' });
    }

    const rewritten = rewriteTocImagePaths(toc);

    const categoryIds = rewritten.documents
        .map(d => d.category_id)
        .filter(id => typeof id === 'number');

    const categoryImages = await fetchCategoryImages([...new Set(categoryIds)]);

    const documents = rewritten.documents.map(doc => ({
        ...doc,
        category_image: doc.category_id ? (categoryImages[doc.category_id] || '') : '',
    }));

    return res.json({ ...rewritten, documents });
});

/**
 * GET /api/parts-book/sheets/:pdfId/:assemblySlug/:sheetSlug/parts
 *
 * Returns all parts for a given sheet, enriched with BC price/inventory data
 * and diagram callout coordinates as CSS percentages.
 */
router.get('/api/parts-book/sheets/:pdfId/:assemblySlug/:sheetSlug/parts', async (req, res) => {
    const { pdfId, assemblySlug, sheetSlug } = req.params;

    // -- Locate the sheet entry in the TOC ----------------------------------
    const toc = await fetchDataJson('toc.json');

    if (!toc) {
        logger.error('parts-book: toc.json not found');
        return res.status(500).json({ error: 'Table of contents not available.' });
    }

    const doc = (toc.documents || []).find(d => d.id === pdfId);
    if (!doc) {
        return res.status(404).json({ error: `Document '${pdfId}' not found.` });
    }

    const assembly = (doc.assemblies || []).find(a => a.slug === assemblySlug);
    if (!assembly) {
        return res.status(404).json({ error: `Assembly '${assemblySlug}' not found.` });
    }

    const sheet = (assembly.sheets || []).find(s => s.slug === sheetSlug);
    if (!sheet) {
        return res.status(404).json({ error: `Sheet '${sheetSlug}' not found.` });
    }

    // -- Read the parts JSON for this sheet ---------------------------------
    const partsData = await fetchDataJson(sheet.parts_json);

    if (!partsData) {
        logger.error('parts-book: parts.json not found', { path: sheet.parts_json });
        return res.status(500).json({ error: 'Parts data not available for this sheet.' });
    }

    const rawParts = partsData.parts || [];

    // -- Batch-fetch BC product data for matched parts ----------------------
    const matchedSkus = [
        ...new Set(rawParts.filter(p => p.has_table_match && p.part_no).map(p => p.part_no)),
    ];

    /** @type {Object.<string, { productId: number|null, price: number|null, inStock: boolean }>} */
    const bcLookup = {};

    if (matchedSkus.length > 0) {
        try {
            const response = await bcClient.get('/v3/catalog/products', {
                params: {
                    'sku:in': matchedSkus.join(','),
                    limit: 50,
                    include_fields: 'id,sku,name,price,inventory_level,inventory_tracking,availability',
                },
            });

            const bcProducts = response.data?.data || [];

            bcProducts.forEach(product => {
                const notTracked = product.inventory_tracking === 'none';
                const inStock =
                    product.availability === 'available' && (notTracked || product.inventory_level > 0);

                bcLookup[product.sku] = {
                    productId: product.id,
                    price: product.price,
                    inStock,
                };
            });
        } catch (err) {
            logger.error('parts-book: BC product lookup failed', { message: err.message });
        }
    }

    // -- Build response parts -----------------------------------------------
    const parts = rawParts.map(p => {
        const coords = p.callout_box_2d != null ? boxToPercent(p.callout_box_2d) : null;
        const { calloutX = null, calloutY = null } = coords || {};

        const bc = bcLookup[p.part_no] || null;

        return {
            calloutNumber: p.callout_number,
            sheetItem: p.sheet_item,
            partNo: p.part_no,
            description: p.description,
            unitNo: p.unit_no,
            qty: p.qty,
            calloutX,
            calloutY,
            price: bc ? bc.price : null,
            inStock: bc ? bc.inStock : false,
            productId: bc ? bc.productId : null,
            hasTableMatch: p.has_table_match === true,
        };
    });

    const cdnBase = config.partsBook.cdnBaseUrl;

    return res.json({
        sheet: {
            id: sheet.id,
            label: sheet.label,
            sheetNumber: sheet.sheet_number,
            diagramUrl: sheet.assembly_image ? `${cdnBase}/${sheet.assembly_image}` : null,
        },
        parts,
    });
});

const MACHINE_PARENT_IDS = [301, 302, 303, 304];

const PARENT_LABELS = {
    301: 'Grinding Machines',
    302: 'Turning Centers',
    303: 'Multi-Tasking Machines',
    304: 'Machining Centers',
};

const PUB_NO_RE = /Pub\s+No\.\s*([A-Z]{2}\d{2}-\d{3}-[A-Z0-9]+)/i;

function parsePubNo(description) {
    if (!description) return null;
    const plain = description.replace(/<[^>]+>/g, ' ');
    const m = plain.match(PUB_NO_RE);
    return m ? m[1] : null;
}

/**
 * GET /api/machines
 *
 * Returns all machine model categories (children of the four machine-type
 * parent categories) enriched with their BC category image and the parts-book
 * publication number parsed from the category description.
 */
router.get('/api/machines', async (req, res) => {
    try {
        const response = await bcClient.get('/v3/catalog/categories', {
            params: {
                'parent_id:in': MACHINE_PARENT_IDS.join(','),
                limit: 250,
                include_fields: 'id,name,image_url,parent_id,description',
            },
        });

        const machines = (response.data?.data || []).map(cat => ({
            categoryId: cat.id,
            name: cat.name,
            machineType: PARENT_LABELS[cat.parent_id] || null,
            imageUrl: cat.image_url || '',
            pubNo: parsePubNo(cat.description),
        }));

        return res.json({ machines });
    } catch (err) {
        logger.error('machines: BC category fetch failed', { message: err.message });
        return res.status(500).json({ error: 'Could not load machine list.' });
    }
});

/**
 * Fetch all machine model categories (children of MACHINE_PARENT_IDS) once
 * and return them as a lookup map keyed by normalised name.
 * Used to match a machine's model string to its BC category.
 *
 * @returns {Promise<Array>}
 */
async function fetchMachineCategories() {
    const response = await bcClient.get('/v3/catalog/categories', {
        params: {
            'parent_id:in': MACHINE_PARENT_IDS.join(','),
            limit: 250,
            include_fields: 'id,name,image_url,parent_id,description',
        },
    });
    return (response.data?.data || []).map(cat => ({
        categoryId: cat.id,
        name: cat.name,
        machineType: PARENT_LABELS[cat.parent_id] || null,
        imageUrl: cat.image_url || '',
        pubNo: parsePubNo(cat.description),
        _normalised: cat.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    }));
}

function matchCategory(modelName, categories) {
    if (!modelName) return null;
    const norm = modelName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Exact normalised match
    const exact = categories.find(c => c._normalised === norm);
    if (exact) return exact;

    // 2. Substring match (one contains the other)
    const sub = categories.find(c => norm.includes(c._normalised) || c._normalised.includes(norm));
    if (sub) return sub;

    // 3. Series match — first alphabetic token (e.g. "GENOS M460-VE" → "genos")
    const series = modelName.toLowerCase().match(/^[a-z]+/);
    if (series) {
        const seriesNorm = series[0];
        const seriesMatch = categories.find(c => c._normalised.startsWith(seriesNorm));
        if (seriesMatch) return seriesMatch;
    }

    return null;
}

/**
 * GET /api/customer/:customerId/machines
 *
 * Returns the registered machines for a specific customer, enriched with
 * BC category images matched by model name.
 */
router.get('/api/customer/:customerId/machines', async (req, res) => {
    const { customerId } = req.params;

    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }

    try {
        const [metaRes, categories] = await Promise.all([
            bcClient.get(`/v3/customers/${customerId}/metafields`),
            fetchMachineCategories(),
        ]);

        const metafields = metaRes.data?.data || [];
        const rmField = metafields.find(m => m.key === 'registered_machines' && m.namespace === 'okuma');

        if (!rmField) {
            return res.json({ machines: [] });
        }

        let rawMachines;
        try {
            rawMachines = JSON.parse(rmField.value);
        } catch {
            logger.error('customer registered_machines metafield is not valid JSON', { customerId });
            return res.json({ machines: [] });
        }

        if (!Array.isArray(rawMachines)) {
            return res.json({ machines: [] });
        }

        const machines = rawMachines
            .filter(m => m.status !== 'Inactive')
            .map(m => {
                const cat = matchCategory(m.model, categories);
                return {
                    serial: m.serial || null,
                    model: m.model || null,
                    installDate: m.install_date || null,
                    status: m.status || null,
                    imageUrl: cat ? cat.imageUrl : '',
                    pubNo: cat ? cat.pubNo : null,
                    machineType: cat ? cat.machineType : null,
                    categoryId: cat ? cat.categoryId : null,
                };
            });

        return res.json({ machines });
    } catch (err) {
        logger.error('customer machine lookup failed', { customerId, message: err.message });
        return res.status(500).json({ error: 'Could not load customer machines.' });
    }
});

/**
 * GET /api/parts-book/machine/verify
 *
 * Stub endpoint for machine serial-number verification.
 * Query param: serialNo
 */
router.get('/api/parts-book/machine/verify', (req, res) => {
    const { serialNo } = req.query;

    if (!serialNo) {
        return res.status(400).json({ error: 'serialNo query parameter is required.' });
    }

    return res.json({
        verified: true,
        model: 'LU300-M',
        serialNo,
        stockCondition: 'Active',
    });
});

module.exports = router;
