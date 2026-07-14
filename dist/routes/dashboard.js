"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bigcommerce_1 = __importDefault(require("../services/bigcommerce"));
const b2b_1 = __importDefault(require("../services/b2b"));
const logger_1 = __importDefault(require("../config/logger"));
const router = (0, express_1.Router)();
const STATUS_MAP = {
    1: 'Pending',
    2: 'Shipped',
    3: 'Partially Shipped',
    4: 'Refunded',
    5: 'Cancelled',
    6: 'Declined',
    7: 'Awaiting Payment',
    8: 'Awaiting Pickup',
    9: 'Awaiting Shipment',
    10: 'Completed',
    11: 'Processing',
    12: 'Manual Verification Required',
    13: 'Disputed',
    14: 'Partially Refunded',
};
const OPEN_STATUS_IDS = new Set([1, 7, 8, 9, 11, 12]);
function formatOrderNumber(orderId, dateCreated) {
    const year = new Date(dateCreated).getFullYear();
    return `OKU-${year}-${String(orderId).padStart(5, '0')}`;
}
const METAFIELD_NAMESPACE = 'okuma';
const METAFIELD_KEY = 'dealer_customer_ids';
const CACHE_TTL_HOURS = 24;
// Fix #4: concurrency-limited map — mirrors the batchedMap pattern in routes/dealers.ts
async function batchedMap(items, fn, concurrency) {
    const results = new Array(items.length);
    let index = 0;
    async function worker() {
        while (index < items.length) {
            const i = index;
            index += 1;
            // eslint-disable-next-line no-await-in-loop
            results[i] = await fn(items[i]);
        }
    }
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}
async function getDealerCustomerIds(dealerId) {
    const metaRes = await bigcommerce_1.default.get(`/v3/customers/${dealerId}/metafields?namespace=${METAFIELD_NAMESPACE}&key=${METAFIELD_KEY}`);
    const existing = metaRes.data.data?.[0];
    if (existing) {
        // Fix #2: guard against malformed metafield values — treat as cache miss
        try {
            const parsed = JSON.parse(existing.value);
            const ageHours = (Date.now() - new Date(parsed.cachedAt).getTime()) / (1000 * 60 * 60);
            if (ageHours < CACHE_TTL_HOURS) {
                logger_1.default.info(`Dashboard: using cached customer IDs for dealer ${dealerId}`);
                return parsed.ids;
            }
        }
        catch {
            logger_1.default.warn(`Dashboard: malformed metafield cache for dealer ${dealerId}, re-resolving`);
        }
    }
    logger_1.default.info(`Dashboard: resolving customer IDs for dealer ${dealerId}`);
    const customerRes = await bigcommerce_1.default.get(`/v3/customers?id:in=${dealerId}`);
    const dealer = customerRes.data.data?.[0];
    if (!dealer)
        throw new Error(`Dealer customer ${dealerId} not found`);
    const companyName = dealer.company;
    let customerIds = [dealerId];
    if (companyName) {
        const groupsRes = await bigcommerce_1.default.get('/v2/customer_groups');
        const matchedGroup = groupsRes.data.find(g => g.name === companyName);
        if (matchedGroup) {
            const custRes = await bigcommerce_1.default.get(`/v3/customers?customer_group_id:in=${matchedGroup.id}&limit=250`);
            const groupIds = custRes.data.data.map(c => c.id);
            customerIds = [...new Set([...customerIds, ...groupIds])];
        }
    }
    // Fix #3: use read_and_sf_access to match permission_set convention in this codebase
    const metafieldPayload = {
        namespace: METAFIELD_NAMESPACE,
        key: METAFIELD_KEY,
        value: JSON.stringify({ ids: customerIds, cachedAt: new Date().toISOString() }),
        permission_set: 'read_and_sf_access',
    };
    if (existing) {
        await bigcommerce_1.default.put(`/v3/customers/${dealerId}/metafields/${existing.id}`, metafieldPayload);
    }
    else {
        await bigcommerce_1.default.post(`/v3/customers/${dealerId}/metafields`, metafieldPayload);
    }
    return customerIds;
}
// GET /v1/dashboard/recent-orders?customerId=248&limit=3
router.get('/recent-orders', async (req, res) => {
    try {
        const dealerId = Number(req.query.customerId);
        // Fix #6: clamp limit to a safe range
        const limitRaw = Number(req.query.limit);
        const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 3;
        if (!dealerId) {
            return res.status(400).json({ error: 'customerId is required' });
        }
        const customerIds = await getDealerCustomerIds(dealerId);
        // Fix #4: batch order fetches at 10 concurrent to avoid BC rate limiting
        // Fix #5: fetch 250 orders per customer so counts reflect actual totals
        const [orderResults, customersRes] = await Promise.all([
            batchedMap(customerIds, id => bigcommerce_1.default
                .get(`/v2/orders?customer_id=${id}&sort=date_created:desc&limit=250`)
                .then(r => (Array.isArray(r.data) ? r.data : []))
                .catch(() => []), 10),
            bigcommerce_1.default
                .get(`/v3/customers?id:in=${customerIds.join(',')}&limit=250`)
                .catch(() => ({ data: { data: [] } })),
        ]);
        const customerNameMap = {};
        (customersRes.data.data ?? []).forEach(c => {
            customerNameMap[c.id] = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Customer';
        });
        const allOrders = orderResults.flat().filter(Boolean);
        allOrders.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
        const totalOrderCount = allOrders.length;
        const openOrderCount = allOrders.filter(o => OPEN_STATUS_IDS.has(o.status_id)).length;
        const recentOrders = allOrders.slice(0, limit).map(o => ({
            orderId: o.id,
            orderNumber: formatOrderNumber(o.id, o.date_created),
            date: o.date_created,
            orderedFor: o.customer_id === dealerId ? 'Self' : (customerNameMap[o.customer_id] ?? 'Customer'),
            itemsTotal: o.items_total ?? 0,
            total: o.total_inc_tax,
            currency: o.currency_code,
            statusId: o.status_id,
            status: STATUS_MAP[o.status_id] ?? o.status,
            customerId: o.customer_id,
        }));
        res.json({
            summary: { totalOrderCount, openOrderCount },
            data: recentOrders,
        });
    }
    catch (err) {
        logger_1.default.error(`Dashboard recent-orders error: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
});
// GET /v1/dashboard/quotes?customerId=248&limit=10
router.get('/quotes', async (req, res) => {
    try {
        const dealerId = Number(req.query.customerId);
        // Fix #7: clamp limit to a safe range
        const limitRaw = Number(req.query.limit);
        const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 10;
        if (!dealerId) {
            return res.status(400).json({ error: 'customerId is required' });
        }
        const [customerIds, quotesRes] = await Promise.all([
            getDealerCustomerIds(dealerId),
            b2b_1.default.get('/api/v3/io/rfq?status=0&limit=250'),
        ]);
        const customerIdSet = new Set(customerIds.map(String));
        const allQuotes = quotesRes.data?.data ?? [];
        const dealerQuotes = allQuotes.filter(q => {
            const field = q.extraFields.find(f => f.fieldName === 'Customer Account ID');
            return field && customerIdSet.has(String(field.fieldValue));
        });
        const openQuoteCount = dealerQuotes.length;
        const data = dealerQuotes.slice(0, limit).map(q => ({
            quoteId: q.quoteId,
            quoteNumber: q.quoteNumber,
            quoteTitle: q.quoteTitle,
            date: q.createdAt ? new Date(q.createdAt * 1000).toISOString() : null,
            expiresAt: q.expiredAt ? new Date(q.expiredAt * 1000).toISOString() : null,
            createdBy: q.createdBy,
            companyName: q.company ?? '',
            subtotal: q.subtotal,
            grandTotal: q.grandTotal ?? q.subtotal,
            currency: q.currency?.currencyCode ?? 'USD',
            status: q.status,
            bcOrderId: q.bcOrderId ?? '',
        }));
        res.json({
            summary: { openQuoteCount },
            data,
        });
    }
    catch (err) {
        logger_1.default.error(`Dashboard quotes error: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map