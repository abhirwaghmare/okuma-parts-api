"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const b2b_1 = __importDefault(require("../../services/b2b"));
const logger_1 = __importDefault(require("../../config/logger"));
const router = (0, express_1.Router)();
/**
 * POST /companies/:companyId/metafields
 *
 * Creates or updates a single extra field on a B2B company.
 * The value is stored as a JSON string in the B3 extra-fields store.
 *
 * B3 API: PUT /api/v3/io/companies/:companyId/extra-fields
 *
 * Body:   { "key": "registered_machines", "value": { ... } | [...] | "string" }
 * Response: { "companyId", "key", "value" }
 */
router.post('/companies/:companyId/metafields', async (req, res) => {
    const { companyId } = req.params;
    const { key, value } = req.body;
    if (!companyId || !/^\d+$/.test(companyId)) {
        return res.status(400).json({ error: 'companyId must be a numeric B2B company ID.' });
    }
    if (!key || typeof key !== 'string' || !key.trim()) {
        return res.status(400).json({ error: 'key is required.' });
    }
    if (value === undefined || value === null) {
        return res.status(400).json({ error: 'value is required.' });
    }
    const fieldValue = typeof value === 'string' ? value : JSON.stringify(value);
    try {
        await b2b_1.default.put(`/api/v3/io/companies/${companyId}`, {
            extraFields: [{ fieldName: key.trim(), fieldValue }],
        });
        return res.status(201).json({
            companyId: parseInt(companyId, 10),
            key: key.trim(),
            value,
        });
    }
    catch (err) {
        logger_1.default.error(`company ${companyId}: metafield upsert [${key}] failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not create company metafield.' });
    }
});
exports.default = router;
//# sourceMappingURL=companies.js.map