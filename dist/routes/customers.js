"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bigcommerce_1 = __importDefault(require("../services/bigcommerce"));
const logger_1 = __importDefault(require("../config/logger"));
const router = (0, express_1.Router)();
router.get('/api/customer/:customerId/profile', async (req, res) => {
    const { customerId } = req.params;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    // TODO: add auth guard once session population is confirmed (req.session.customerId === customerId)
    try {
        const [customerRes, metaRes] = await Promise.all([
            bigcommerce_1.default.get(`/v3/customers?id:in=${customerId}`),
            bigcommerce_1.default.get(`/v3/customers/${customerId}/metafields`),
        ]);
        const customer = customerRes.data?.data?.[0];
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found.' });
        }
        const okumaMeta = (metaRes.data?.data ?? []).filter(m => m.namespace === 'okuma');
        const getValue = (key) => okumaMeta.find(m => m.key === key)?.value ?? null;
        return res.json({
            firstName: customer.first_name,
            lastName: customer.last_name,
            email: customer.email,
            phone: customer.phone || null,
            company: customer.company || null,
            jobTitle: getValue('job_title'),
        });
    }
    catch (err) {
        logger_1.default.error(`customer ${customerId}: profile fetch failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not load customer profile.' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map