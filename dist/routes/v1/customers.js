"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bigcommerce_1 = __importDefault(require("../../services/bigcommerce"));
const logger_1 = __importDefault(require("../../config/logger"));
const router = (0, express_1.Router)();
/**
 * GET /customers?groupId=15[&page=1&limit=50]
 *
 * Returns BC customers belonging to the given customer group.
 * Proxies GET /v3/customers?customer_group_id:in=:groupId server-side.
 *
 * Response:
 * {
 *   customers: [{ id, firstName, lastName, email, company, phone, customerGroupId, dateCreated }],
 *   pagination: { total, count, perPage, currentPage, totalPages }
 * }
 */
router.get('/customers', async (req, res) => {
    const { groupId, page = '1', limit = '50' } = req.query;
    if (!groupId || !/^\d+$/.test(groupId) || parseInt(groupId, 10) < 1) {
        return res.status(400).json({ error: 'groupId must be a positive integer.' });
    }
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({ error: 'page must be a positive integer.' });
    }
    if (Number.isNaN(limitNum) || limitNum < 1 || limitNum > 250) {
        return res.status(400).json({ error: 'limit must be between 1 and 250.' });
    }
    try {
        const bcRes = await bigcommerce_1.default.get('/v3/customers', {
            params: {
                'customer_group_id:in': groupId,
                page: pageNum,
                limit: limitNum,
            },
        });
        const customers = bcRes.data?.data ?? [];
        const pagination = bcRes.data?.meta?.pagination ?? null;
        return res.json({
            customers: customers.map(c => ({
                id: c.id,
                firstName: c.first_name,
                lastName: c.last_name,
                email: c.email,
                company: c.company || null,
                phone: c.phone || null,
                customerGroupId: c.customer_group_id,
                dateCreated: c.date_created,
            })),
            pagination: pagination
                ? {
                    total: pagination.total,
                    count: pagination.count,
                    perPage: pagination.per_page,
                    currentPage: pagination.current_page,
                    totalPages: pagination.total_pages,
                }
                : null,
        });
    }
    catch (err) {
        logger_1.default.error(`customers by group ${groupId}: fetch failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not load customers.' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map