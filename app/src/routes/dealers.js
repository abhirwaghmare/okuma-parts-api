'use strict';

const { Router } = require('express');
const bcClient = require('../services/bigcommerce');

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let groupCache = null;
let groupCacheAt = 0;
const GROUP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes — groups change rarely

/**
 * Fetch all BC customer groups and return a map of id → name.
 * Results are cached for 5 minutes to avoid redundant API calls.
 *
 * @returns {Promise<Object.<number, string>>}
 */
async function fetchCustomerGroupMap() {
    const now = Date.now();
    if (groupCache && now - groupCacheAt < GROUP_CACHE_TTL) {
        return groupCache;
    }
    const res = await bcClient.get('/v2/customer_groups', { params: { limit: 250 } });
    const groups = Array.isArray(res.data) ? res.data : [];
    const map = {};
    groups.forEach(g => {
        map[g.id] = g.name;
    });
    groupCache = map;
    groupCacheAt = now;
    return map;
}

/**
 * GET /v3/customers/:customerId/metafields?namespace=okuma&key=registered_machines
 *
 * Calls the BC OOTB metafields API and returns a parsed array of active machines.
 * Returns [] on missing metafield, invalid JSON, or any API failure.
 *
 * @param {number} customerId
 * @returns {Promise<Array>}
 */
async function fetchRegisteredMachines(customerId) {
    try {
        // BC OOTB: GET /v3/customers/{id}/metafields?namespace=okuma&key=registered_machines
        const res = await bcClient.get(`/v3/customers/${customerId}/metafields`, {
            params: { namespace: 'okuma', key: 'registered_machines' },
        });

        // BC returns filtered results — first record is the metafield when it exists
        const field = (res.data && res.data.data && res.data.data[0]) || null;
        if (!field) return [];

        let raw;
        try {
            raw = JSON.parse(field.value);
        } catch {
            console.error(`dealer-customers: registered_machines for customer ${customerId} is not valid JSON`);
            return [];
        }

        if (!Array.isArray(raw)) return [];

        return raw
            .filter(m => m.status !== 'Inactive')
            .map(m => ({
                serial: m.serial || null,
                model: m.model || null,
                installDate: m.install_date || null,
                status: m.status || null,
            }));
    } catch (err) {
        console.error(`dealer-customers: metafield fetch failed for customer ${customerId}:`, err.message);
        return [];
    }
}

/**
 * Run an async fn over every item with at most `concurrency` in-flight at once.
 * Prevents hammering the BC API when a dealer has a large customer list.
 *
 * @template T, R
 * @param {T[]} items
 * @param {function(T): Promise<R>} fn
 * @param {number} concurrency
 * @returns {Promise<R[]>}
 */
async function batchedMap(items, fn, concurrency) {
    const results = new Array(items.length);
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const i = index;
            index += 1;
            results[i] = await fn(items[i]);
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/dealers/:dealerId/customers
 *
 * Returns all registered customers under a dealer / distributor, enriched
 * with basic identity, account status, customer group, and registered machines.
 *
 * The dealer-customer relationship is stored as a `registered_customers`
 * metafield (namespace: okuma, key: registered_customers) on the dealer's
 * BC customer record — a JSON array of BC customer IDs.  This mirrors the
 * `registered_machines` pattern used on regular customer records.
 *
 * Example response:
 * {
 *   "dealerId": 42,
 *   "customers": [
 *     {
 *       "id": 123,
 *       "email": "jane@example.com",
 *       "firstName": "Jane",
 *       "lastName": "Smith",
 *       "customerGroup": { "id": 7, "name": "Preferred" },
 *       "dateCreated": "2024-01-15T10:23:00+00:00",
 *       "dateModified": "2025-03-01T08:00:00+00:00",
 *       "registeredMachines": [
 *         { "serial": "SN001", "model": "LU300-M", "installDate": "2024-02-01", "status": "Active" }
 *       ]
 *     }
 *   ]
 * }
 */
router.get('/api/dealers/:dealerId/customers', async (req, res) => {
    const { dealerId } = req.params;

    if (!dealerId || !/^\d+$/.test(dealerId)) {
        return res.status(400).json({ error: 'Invalid dealerId — must be a numeric BC customer ID.' });
    }

    const dealerIdNum = Number(dealerId);

    try {
        // -- 1. Fetch dealer's registered_customers metafield -----------------
        // Filter server-side via BC OOTB query params — avoids loading all metafields.
        const metaRes = await bcClient.get(`/v3/customers/${dealerId}/metafields`, {
            params: { namespace: 'okuma', key: 'registered_customers' },
        });
        const rcField = (metaRes.data && metaRes.data.data && metaRes.data.data[0]) || null;

        if (!rcField) {
            return res.json({ dealerId: dealerIdNum, customers: [] });
        }

        let customerIds;
        try {
            customerIds = JSON.parse(rcField.value);
        } catch {
            console.error(`dealer ${dealerId}: registered_customers metafield is not valid JSON`);
            return res.json({ dealerId: dealerIdNum, customers: [] });
        }

        if (!Array.isArray(customerIds) || customerIds.length === 0) {
            return res.json({ dealerId: dealerIdNum, customers: [] });
        }

        // BC id:in filter accepts up to 250 IDs per request
        const validIds = customerIds.filter(id => Number.isInteger(id) && id > 0).slice(0, 250);

        // -- 2. Batch-fetch BC customer records, machines, and groups in parallel
        const [customersRes, machinesResults, groupMap] = await Promise.all([
            bcClient.get('/v3/customers', {
                params: {
                    'id:in': validIds.join(','),
                    limit: 250,
                    include_fields: 'id,email,first_name,last_name,customer_group_id,date_created,date_modified',
                },
            }),
            batchedMap(validIds, id => fetchRegisteredMachines(id).then(machines => ({ id, machines })), 10),
            fetchCustomerGroupMap(),
        ]);

        const bcCustomers = customersRes.data?.data || [];

        // Build machines lookup: customer id → machines[]
        const machinesById = {};
        machinesResults.forEach(({ id, machines }) => {
            machinesById[id] = machines;
        });

        const customers = bcCustomers.map(c => ({
            id: c.id,
            email: c.email,
            firstName: c.first_name,
            lastName: c.last_name,
            customerGroup: {
                id: c.customer_group_id || null,
                name: c.customer_group_id ? (groupMap[c.customer_group_id] || null) : null,
            },
            dateCreated: c.date_created || null,
            dateModified: c.date_modified || null,
            registeredMachines: machinesById[c.id] || [],
        }));

        return res.json({ dealerId: dealerIdNum, customers });
    } catch (err) {
        console.error(`dealer ${dealerId}: customer fetch failed:`, err.message);
        return res.status(500).json({ error: 'Could not load dealer customers.' });
    }
});

module.exports = router;
