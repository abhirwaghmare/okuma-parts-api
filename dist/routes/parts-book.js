"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const express_1 = require("express");
const config_1 = __importDefault(require("../config"));
const bigcommerce_1 = __importDefault(require("../services/bigcommerce"));
const b2b_1 = __importDefault(require("../services/b2b"));
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchDataJson(relativePath) {
    const cdnBase = config_1.default.partsBook.cdnBaseUrl;
    const url = `${cdnBase}/${relativePath}`;
    try {
        const res = await axios_1.default.get(url, { timeout: 15000 });
        return res.data;
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response?.status === 404) {
            return null;
        }
        console.error(`parts-book: failed to fetch ${url}:`, err.message);
        return null;
    }
}
function rewriteTocImagePaths(toc) {
    const cdnBase = config_1.default.partsBook.cdnBaseUrl;
    const rewrite = (relPath) => `${cdnBase}/${relPath}`;
    const documents = toc.documents.map(doc => {
        const assemblies = doc.assemblies.map(assembly => {
            const sheets = assembly.sheets.map(sheet => ({
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
function boxToPercent(box) {
    if (!Array.isArray(box) || box.length !== 4 || box.some(v => typeof v !== 'number' || Number.isNaN(v))) {
        return null;
    }
    const [ymin, xmin, ymax, xmax] = box;
    const cx = parseFloat(((xmin + xmax) / 2 / 10).toFixed(2));
    const cy = parseFloat(((ymin + ymax) / 2 / 10).toFixed(2));
    return { calloutX: cx, calloutY: cy };
}
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
router.get('/api/parts-book/toc', async (req, res) => {
    const toc = await fetchDataJson('toc.json');
    if (!toc) {
        console.error('parts-book: toc.json not found at', config_1.default.partsBook.cdnBaseUrl);
        return res.status(500).json({ error: 'Table of contents not available.' });
    }
    const rewritten = rewriteTocImagePaths(toc);
    const { id } = req.query;
    const sourceDocuments = id ? rewritten.documents.filter(d => d.id === id) : rewritten.documents;
    if (id && sourceDocuments.length === 0) {
        return res.status(404).json({ error: `Document '${id}' not found.` });
    }
    if (id) {
        return res.json(sourceDocuments[0]);
    }
    return res.json({ ...rewritten, documents: sourceDocuments });
});
router.get('/api/parts-book/sheets/:pdfId/:assemblySlug/:sheetSlug/parts', async (req, res) => {
    const { pdfId, assemblySlug, sheetSlug } = req.params;
    const toc = await fetchDataJson('toc.json');
    if (!toc) {
        console.error('parts-book: toc.json not found');
        return res.status(500).json({ error: 'Table of contents not available.' });
    }
    const doc = toc.documents.find(d => d.id === pdfId);
    if (!doc) {
        return res.status(404).json({ error: `Document '${pdfId}' not found.` });
    }
    const assembly = doc.assemblies.find(a => a.slug === assemblySlug);
    if (!assembly) {
        return res.status(404).json({ error: `Assembly '${assemblySlug}' not found.` });
    }
    const sheet = assembly.sheets.find(s => s.slug === sheetSlug);
    if (!sheet) {
        return res.status(404).json({ error: `Sheet '${sheetSlug}' not found.` });
    }
    const partsData = await fetchDataJson(sheet.parts_json);
    if (!partsData) {
        console.error(`parts-book: parts.json not found at ${sheet.parts_json}`);
        return res.status(500).json({ error: 'Parts data not available for this sheet.' });
    }
    const rawParts = partsData.parts ?? [];
    const matchedSkus = [
        ...new Set(rawParts.filter(p => p.has_table_match && p.part_no).map(p => p.part_no)),
    ];
    const bcLookup = {};
    if (matchedSkus.length > 0) {
        try {
            const response = await bigcommerce_1.default.get('/v3/catalog/products', {
                params: {
                    'sku:in': matchedSkus.join(','),
                    limit: 50,
                    include_fields: 'id,sku,name,price,inventory_level,inventory_tracking,availability',
                },
            });
            const bcProducts = response.data?.data ?? [];
            bcProducts.forEach(product => {
                const notTracked = product.inventory_tracking === 'none';
                const inStock = product.availability === 'available' && (notTracked || product.inventory_level > 0);
                bcLookup[product.sku] = {
                    productId: product.id,
                    price: product.price,
                    inStock,
                };
            });
        }
        catch (err) {
            console.error('parts-book: BC product lookup failed:', err.message);
        }
    }
    const parts = rawParts.map(p => {
        const coords = p.callout_box_2d != null ? boxToPercent(p.callout_box_2d) : null;
        const { calloutX = null, calloutY = null } = coords ?? {};
        const bc = p.part_no ? (bcLookup[p.part_no] ?? null) : null;
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
    const cdnBase = config_1.default.partsBook.cdnBaseUrl;
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
// ---------------------------------------------------------------------------
// Machines
// ---------------------------------------------------------------------------
router.get('/api/customer/:customerId/machines', async (req, res) => {
    const { customerId } = req.params;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    try {
        const customerRes = await bigcommerce_1.default.get(`/v3/customers`, { params: { 'id:in': customerId } });
        const email = customerRes.data?.data?.[0]?.email;
        if (!email) {
            return res.json({ count: 0, machines: [] });
        }
        const usersRes = await b2b_1.default.get(`/api/v3/io/users`, { params: { email } });
        const companyId = usersRes.data?.data?.[0]?.companyId;
        if (!companyId) {
            return res.json({ count: 0, machines: [] });
        }
        const companyRes = await b2b_1.default.get(`/api/v3/io/companies/${companyId}`);
        const extraFields = companyRes.data?.data?.extraFields ?? [];
        const machinesField = extraFields.find(f => f.fieldName.toLowerCase() === 'machines');
        if (!machinesField) {
            return res.json({ count: 0, machines: [] });
        }
        let rawMachines;
        try {
            const sanitized = machinesField.fieldValue.replace(/,(\s*[}\]])/g, '$1');
            const parsed = JSON.parse(sanitized);
            rawMachines = Array.isArray(parsed) ? parsed : (parsed?.machines ?? []);
        }
        catch {
            console.error(`customer ${customerId}: company ${companyId} machines extra field is not valid JSON`);
            return res.json({ count: 0, machines: [] });
        }
        if (!Array.isArray(rawMachines)) {
            return res.json({ count: 0, machines: [] });
        }
        const seenSerials = new Set();
        const machines = rawMachines
            .filter(m => m.status !== 'Inactive')
            .filter(m => {
            const serial = m.serialNo ?? '';
            if (!serial || seenSerials.has(serial))
                return false;
            seenSerials.add(serial);
            return true;
        })
            .map(m => {
            const pubNos = m.publicationNos ?? [];
            return {
                serial: m.serialNo ?? null,
                model: m.modelNo ?? null,
                installDate: m.installDate || 'pending',
                status: m.status ?? null,
                pubNos,
                hasPartsBook: pubNos.length > 0,
            };
        });
        return res.json({ count: machines.length, machines });
    }
    catch (err) {
        console.error(`customer ${customerId}: machine lookup failed:`, err.message);
        return res.status(500).json({ error: 'Could not load customer machines.' });
    }
});
router.get('/api/parts-book/machine/verify', (req, res) => {
    const { serialNo } = req.query;
    if (!serialNo) {
        return res.status(400).json({ error: 'serialNo query parameter is required.' });
    }
    return res.json({
        verified: true,
        model: 'LU300-M',
        serialNo,
    });
});
exports.default = router;
//# sourceMappingURL=parts-book.js.map