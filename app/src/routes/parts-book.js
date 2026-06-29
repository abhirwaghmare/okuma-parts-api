'use strict';

const path = require('path');
const fs = require('fs');
const { Router } = require('express');
const config = require('../config');
const bcClient = require('../services/bigcommerce');

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load and parse a JSON file from the parts-book data root.
 * Returns null when the file does not exist or is outside the data root.
 *
 * @param {string} relativePath - Path relative to dataRoot (may use forward or back slashes).
 * @returns {object|null}
 */
function readDataJson(relativePath) {
    const dataRoot = path.resolve(config.partsBook.dataRoot);
    const resolved = path.resolve(dataRoot, relativePath);

    // Security: resolved path must remain inside dataRoot.
    // Append path.sep so a sibling directory named "dataRoot_evil" cannot pass the prefix check.
    if (!resolved.startsWith(dataRoot + path.sep) && resolved !== dataRoot) {
        return null;
    }

    if (!fs.existsSync(resolved)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    } catch (err) {
        console.error(`parts-book: failed to parse JSON at ${resolved}:`, err.message);
        return null;
    }
}

/**
 * Rewrite image paths in a TOC document so every `overview_image` and
 * `assembly_image` field becomes a backend URL the browser can fetch.
 *
 * @param {object} toc - The raw toc.json object.
 * @returns {object} - A deep-cloned copy with rewritten image paths.
 */
function rewriteTocImagePaths(toc) {
    // Encode each path segment individually so spaces and special characters are safe in URLs.
    const rewrite = relPath =>
        `/api/parts-book/images/${relPath
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/')}`;

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

        return { ...doc, assemblies };
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

/**
 * Middleware: reject requests that have no authenticated session customer.
 */
function requireCustomer(req, res, next) {
    if (!req.session || !req.session.customerId) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    return next();
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/parts-book/toc
 *
 * Returns the master table of contents with all image paths rewritten to
 * backend-served URLs.
 */
router.get('/api/parts-book/toc', requireCustomer, (req, res) => {
    const toc = readDataJson('toc.json');

    if (!toc) {
        console.error('parts-book: toc.json not found at', config.partsBook.dataRoot);
        return res.status(500).json({ error: 'Table of contents not available.' });
    }

    return res.json(rewriteTocImagePaths(toc));
});

/**
 * GET /api/parts-book/sheets/:pdfId/:assemblySlug/:sheetSlug/parts
 *
 * Returns all parts for a given sheet, enriched with BC price/inventory data
 * and diagram callout coordinates as CSS percentages.
 */
router.get('/api/parts-book/sheets/:pdfId/:assemblySlug/:sheetSlug/parts', requireCustomer, async (req, res) => {
    const { pdfId, assemblySlug, sheetSlug } = req.params;

    // -- Locate the sheet entry in the TOC ----------------------------------
    const toc = readDataJson('toc.json');

    if (!toc) {
        console.error('parts-book: toc.json not found');
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
    const partsData = readDataJson(sheet.parts_json);

    if (!partsData) {
        console.error(`parts-book: parts.json not found at ${sheet.parts_json}`);
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
            // BC allows up to 250 items per sku:in request; parts-per-sheet is well under 50.
            const response = await bcClient.get('/v3/catalog/products', {
                params: {
                    'sku:in': matchedSkus.join(','),
                    limit: 50,
                    // inventory_tracking is required to correctly interpret inventory_level:
                    // when tracking is 'none' the API returns inventory_level 0, not null.
                    include_fields: 'id,sku,name,price,inventory_level,inventory_tracking,availability',
                },
            });

            const bcProducts = response.data?.data || [];

            bcProducts.forEach(product => {
                // A product is in stock when:
                //   - availability is 'available', AND
                //   - either inventory is not tracked (inventory_tracking === 'none'),
                //     or the tracked level is above zero.
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
            // Non-fatal: parts still returned, just without BC enrichment.
            console.error('parts-book: BC product lookup failed:', err.message);
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

    return res.json({
        sheet: {
            id: sheet.id,
            label: sheet.label,
            sheetNumber: sheet.sheet_number,
            diagramUrl: sheet.assembly_image
                ? `/api/parts-book/images/${sheet.assembly_image
                    .split('/')
                    .map(segment => encodeURIComponent(segment))
                    .join('/')}`
                : null,
        },
        parts,
    });
});

/**
 * GET /api/parts-book/images/*
 *
 * Serves PNG diagram images from the data root. Path traversal is prevented
 * by verifying the resolved path starts with dataRoot.
 */
router.get('/api/parts-book/images/*', requireCustomer, (req, res) => {
    const dataRoot = path.resolve(config.partsBook.dataRoot);

    // Express wildcard param — the splat is in req.params[0].
    const relativePath = req.params[0];

    if (!relativePath) {
        return res.status(400).json({ error: 'Image path required.' });
    }

    const resolved = path.resolve(dataRoot, relativePath);

    // Security: prevent path traversal.
    if (!resolved.startsWith(dataRoot + path.sep) && resolved !== dataRoot) {
        return res.status(403).json({ error: 'Forbidden.' });
    }

    if (!fs.existsSync(resolved)) {
        return res.status(404).json({ error: 'Image not found.' });
    }

    res.setHeader('Content-Type', 'image/png');
    return fs.createReadStream(resolved).pipe(res);
});

/**
 * GET /api/parts-book/machine/verify
 *
 * Stub endpoint for machine serial-number verification.
 * Query param: serialNo
 */
router.get('/api/parts-book/machine/verify', requireCustomer, (req, res) => {
    const { serialNo } = req.query;

    if (!serialNo) {
        return res.status(400).json({ error: 'serialNo query parameter is required.' });
    }

    // Stub response — replace with real lookup when service is available.
    return res.json({
        verified: true,
        model: 'LU300-M',
        serialNo,
        stockCondition: 'Active',
    });
});

module.exports = router;
