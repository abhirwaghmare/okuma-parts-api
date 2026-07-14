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
const GROUP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes — groups change rarely
const B2B_PAGE_LIMIT = 100;
const BC_CUSTOMER_FILTER_LIMIT = 250;
const RECENT_SEARCH_NAMESPACE = 'okuma';
const RECENT_SEARCH_KEY = 'recent_customer_searches';
const RECENT_SEARCH_LIMIT = 3;
// ---------------------------------------------------------------------------
// BC Helpers
// ---------------------------------------------------------------------------
let groupCache = null;
let groupCacheAt = 0;
/**
 * Fetch all BC customer groups and return a map of id → name.
 * Cached for 5 minutes.
 */
async function fetchCustomerGroupMap() {
    const now = Date.now();
    if (groupCache && now - groupCacheAt < GROUP_CACHE_TTL)
        return groupCache;
    const res = await bigcommerce_1.default.get('/v2/customer_groups', {
        params: { limit: 250 },
    });
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
 * Fetch machines for a B2B company from its Machines extra field.
 * Returns [] on missing field, invalid JSON, or API failure.
 */
async function fetchB2BCompanyMachines(companyId) {
    try {
        const res = await b2b_1.default.get(`/api/v3/io/companies/${companyId}`);
        const extraFields = res.data?.data?.extraFields ?? [];
        const field = extraFields.find(f => f.fieldName.toLowerCase() === 'machines');
        if (!field)
            return [];
        let raw;
        try {
            const sanitized = field.fieldValue.replace(/,(\s*[}\]])/g, '$1');
            const parsed = JSON.parse(sanitized);
            raw = Array.isArray(parsed) ? parsed : (parsed?.machines ?? []);
        }
        catch {
            logger_1.default.error(`dealers: company ${companyId} Machines extra field is not valid JSON`);
            return [];
        }
        if (!Array.isArray(raw))
            return [];
        return raw
            .filter(m => m.status !== 'Inactive')
            .map(m => ({
            serial: m.serialNo ?? null,
            model: m.modelNo ?? null,
            installDate: m.installDate || null,
            status: m.status ?? null,
        }));
    }
    catch (err) {
        logger_1.default.error(`dealers: company ${companyId} machines fetch failed: ${err.message}`);
        return [];
    }
}
/**
 * Run an async fn over items with at most `concurrency` in-flight at once.
 */
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
function buildDealerSummary(dealer) {
    return {
        id: dealer.id,
        firstName: dealer.first_name,
        lastName: dealer.last_name,
        email: dealer.email,
        company: dealer.company || null,
    };
}
// ---------------------------------------------------------------------------
// B2B Hierarchy Helpers
// ---------------------------------------------------------------------------
/**
 * Recursively collects all pages from a paginated B2B endpoint.
 * Uses recursion instead of a loop to satisfy the no-restricted-syntax rule.
 */
async function collectPages(fetcher, pageOffset = 0, acc = []) {
    const page = await fetcher(pageOffset);
    acc.push(...page);
    if (page.length < B2B_PAGE_LIMIT)
        return acc;
    return collectPages(fetcher, pageOffset + B2B_PAGE_LIMIT, acc);
}
/**
 * Find the dealer's B2B company ID by looking up the admin user via their email.
 *
 * B2B API: GET /api/v3/io/users?email={email}
 * The returned user object contains `companyId` which is the dealer's B2B company.
 */
async function fetchB2BCompanyIdByEmail(email) {
    try {
        const res = await b2b_1.default.get('/api/v3/io/users', {
            params: { email, limit: 1 },
        });
        const user = res.data?.data?.[0] ?? null;
        return user ? user.companyId : null;
    }
    catch (err) {
        logger_1.default.error(`B2B user lookup by email ${email} failed: ${err.message}`);
        return null;
    }
}
/**
 * Fetch all direct subsidiaries of a B2B company.
 *
 * The B2B API does not support server-side parent filtering, so all companies
 * are fetched (paginated) and filtered client-side on parentCompany.id.
 *
 * B2B API: GET /api/v3/io/companies (paginated)
 */
async function fetchB2BSubsidiaries(dealerCompanyId) {
    const all = await collectPages(async (off) => {
        try {
            const res = await b2b_1.default.get('/api/v3/io/companies', {
                params: { limit: B2B_PAGE_LIMIT, offset: off },
            });
            return res.data?.data ?? [];
        }
        catch (err) {
            logger_1.default.error(`B2B companies fetch failed: ${err.message}`);
            throw err;
        }
    });
    return all.filter(c => c.parentCompany?.id === dealerCompanyId);
}
/**
 * Fetch all B2B users (and their BC customer IDs) for a given company (all pages).
 *
 * B2B API: GET /api/v3/io/users?companyId={companyId}
 */
async function fetchB2BCompanyUsers(companyId) {
    return collectPages(async (off) => {
        try {
            const res = await b2b_1.default.get('/api/v3/io/users', {
                params: { companyId, limit: B2B_PAGE_LIMIT, offset: off },
            });
            return res.data?.data ?? [];
        }
        catch (err) {
            logger_1.default.error(`B2B users fetch for company ${companyId} failed: ${err.message}`);
            throw err;
        }
    });
}
/**
 * Core hierarchy resolver.
 *
 * Given a dealer's email, finds their B2B company via the users endpoint,
 * walks all direct subsidiaries (as shown in the Hierarchy tab in the BC portal),
 * and collects the BC customer IDs of every user within those subsidiaries.
 *
 * Returns no customer IDs when:
 *  - no B2B user matches the email
 *  - the company has no subsidiaries
 */
async function fetchCustomerIdsFromHierarchy(dealerEmail) {
    const dealerCompanyId = await fetchB2BCompanyIdByEmail(dealerEmail);
    if (!dealerCompanyId) {
        logger_1.default.warn(`dealer-hierarchy: no B2B company found for email ${dealerEmail}`);
        return { customerIds: [], totalCustomerIds: 0, truncated: false, machinesByCustomerId: {} };
    }
    logger_1.default.info(`dealer-hierarchy: resolved B2B company ${dealerCompanyId} for ${dealerEmail}`);
    const subsidiaries = await fetchB2BSubsidiaries(dealerCompanyId);
    if (subsidiaries.length === 0) {
        logger_1.default.warn(`dealer-hierarchy: company ${dealerCompanyId} has no subsidiaries`);
        return { customerIds: [], totalCustomerIds: 0, truncated: false, machinesByCustomerId: {} };
    }
    logger_1.default.info(`dealer-hierarchy: found ${subsidiaries.length} subsidiaries under company ${dealerCompanyId}`);
    const subsidiaryData = await batchedMap(subsidiaries, async (sub) => {
        const [users, machines] = await Promise.all([
            fetchB2BCompanyUsers(sub.companyId),
            fetchB2BCompanyMachines(sub.companyId),
        ]);
        return { users, machines };
    }, 5);
    const seen = new Set();
    const customerIds = [];
    const machinesByCustomerId = {};
    subsidiaryData.forEach(({ users, machines }) => {
        users.forEach(user => {
            if (user.customerId > 0) {
                if (!seen.has(user.customerId)) {
                    seen.add(user.customerId);
                    customerIds.push(user.customerId);
                }
                machinesByCustomerId[user.customerId] = machines;
            }
        });
    });
    const validCustomerIds = customerIds.filter(id => Number.isInteger(id) && id > 0);
    const totalCustomerIds = validCustomerIds.length;
    const truncated = totalCustomerIds > BC_CUSTOMER_FILTER_LIMIT;
    if (truncated) {
        logger_1.default.warn(`dealer-hierarchy: truncated customer IDs from ${totalCustomerIds} to ${BC_CUSTOMER_FILTER_LIMIT}`);
    }
    logger_1.default.info(`dealer-hierarchy: collected ${totalCustomerIds} unique customer IDs`);
    return {
        customerIds: validCustomerIds.slice(0, BC_CUSTOMER_FILTER_LIMIT),
        totalCustomerIds,
        truncated,
        machinesByCustomerId,
    };
}
// ---------------------------------------------------------------------------
// Recent-search helpers
// ---------------------------------------------------------------------------
/**
 * Fetch the dealer's recent_customer_searches metafield.
 * Returns the raw BC metafield record, or null when it does not yet exist.
 */
async function fetchRecentSearchMetafield(dealerId) {
    const res = await bigcommerce_1.default.get(`/v3/customers/${dealerId}/metafields`, {
        params: { namespace: RECENT_SEARCH_NAMESPACE, key: RECENT_SEARCH_KEY },
    });
    return res.data?.data?.[0] ?? null;
}
/**
 * Persist a new recent customer search for the dealer.
 *
 * - De-duplicates by customerId (a repeated search moves the entry to the front with an updated timestamp).
 * - Keeps at most RECENT_SEARCH_LIMIT entries, ordered most-recent first.
 * - Creates the metafield on first call; updates it on subsequent calls.
 *
 * BC OOTB calls:
 *   GET /v3/customers/:dealerId/metafields?namespace=okuma&key=recent_customer_searches
 *   POST /v3/customers/:dealerId/metafields  (first call)
 *   PUT  /v3/customers/:dealerId/metafields/:id  (subsequent calls)
 */
async function upsertRecentCustomerSearches(dealerId, newEntry) {
    const existing = await fetchRecentSearchMetafield(dealerId);
    let current = [];
    if (existing) {
        try {
            const parsed = JSON.parse(existing.value);
            if (Array.isArray(parsed))
                current = parsed;
        }
        catch {
            logger_1.default.warn(`dealer ${dealerId}: recent_customer_searches metafield contained invalid JSON — resetting`);
        }
    }
    const updated = [newEntry, ...current.filter(s => s.customerId !== newEntry.customerId)].slice(0, RECENT_SEARCH_LIMIT);
    const value = JSON.stringify(updated);
    if (existing) {
        await bigcommerce_1.default.put(`/v3/customers/${dealerId}/metafields/${existing.id}`, { value });
    }
    else {
        await bigcommerce_1.default.post(`/v3/customers/${dealerId}/metafields`, {
            permission_set: 'write_and_sf_access',
            namespace: RECENT_SEARCH_NAMESPACE,
            key: RECENT_SEARCH_KEY,
            value,
        });
    }
    return updated;
}
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
/**
 * GET /v1/api/dealers/context?email=<dealerEmail>
 *
 * Looks up a dealer by email address and returns their profile together with
 * all customers found under their subsidiaries in the B2B hierarchy.
 *
 * B2B hierarchy calls:
 *   [1] GET /api/v3/io/users?email=<email>                  → dealer's B2B companyId
 *   [2] GET /api/v3/io/companies (paginated)               → subsidiaries filtered by parentCompany.id
 *   [3] GET /api/v3/io/users?companyId=<id> (paginated)    → BC customer IDs
 *
 * BC OOTB calls:
 *   [4] GET /v3/customers?email:in=<email>&limit=1         → dealer customer record
 *   [5] GET /v3/customers?id:in=<customerIds>&limit=250    → customer profiles
 *   [6] GET /api/v3/io/companies/{id} ×subsidiaries (batched 5) → company Machines extra field
 *   [7] GET /v2/customer_groups                                  → group names (cached 5 min)
 *
 * Response:
 * {
 *   dealer:    { id, firstName, lastName, email, company },
 *   customers: [{ id, email, firstName, lastName, customerGroup, dateCreated, dateModified, registeredMachines }],
 *   meta:      { totalCustomerIds, returnedCustomerIds, truncated }
 * }
 */
router.get('/dealers/context', async (req, res) => {
    const { email } = req.query;
    if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: 'email query parameter is required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }
    const emailNorm = email.trim().toLowerCase();
    try {
        // -- 1. Look up dealer BC record (identity only — not for customer list) --
        const dealerLookup = await bigcommerce_1.default.get('/v3/customers', {
            params: { 'email:in': emailNorm, limit: 1 },
        });
        const dealerRecord = dealerLookup.data?.data?.[0] ?? null;
        if (!dealerRecord) {
            return res.status(404).json({ error: 'No customer found for the supplied email.' });
        }
        // -- 2. Resolve customer IDs and company machines from B2B hierarchy --
        const { customerIds, totalCustomerIds, truncated, machinesByCustomerId } = await fetchCustomerIdsFromHierarchy(emailNorm);
        if (customerIds.length === 0) {
            return res.json({
                dealer: buildDealerSummary(dealerRecord),
                customers: [],
                meta: { totalCustomerIds, returnedCustomerIds: 0, truncated },
            });
        }
        // -- 3. Enrich: customer profiles and groups in parallel (machines already resolved) --
        const [customersRes, groupMap] = await Promise.all([
            bigcommerce_1.default.get('/v3/customers', {
                params: { 'id:in': customerIds.join(','), limit: BC_CUSTOMER_FILTER_LIMIT },
            }),
            fetchCustomerGroupMap(),
        ]);
        const bcCustomers = customersRes.data?.data ?? [];
        const customers = bcCustomers.map(c => ({
            id: c.id,
            email: c.email,
            firstName: c.first_name,
            lastName: c.last_name,
            customerGroup: {
                id: c.customer_group_id ?? null,
                name: c.customer_group_id ? (groupMap[c.customer_group_id] ?? null) : null,
            },
            dateCreated: c.date_created ?? null,
            dateModified: c.date_modified ?? null,
            registeredMachines: machinesByCustomerId[c.id] ?? [],
        }));
        return res.json({
            dealer: buildDealerSummary(dealerRecord),
            customers,
            meta: { totalCustomerIds, returnedCustomerIds: customerIds.length, truncated },
        });
    }
    catch (err) {
        logger_1.default.error(`dealer context lookup for ${emailNorm} failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not load dealer context.' });
    }
});
/**
 * GET /v1/api/dealers/:dealerId/customers
 *
 * Returns all customers under a dealer's B2B hierarchy subsidiaries, enriched
 * with basic identity, customer group, and registered machines.
 *
 * B2B hierarchy calls:
 *   [1] GET /api/v3/io/users?email=<email>                        → dealer's B2B user → companyId
 *   [2] GET /api/v3/io/companies (all pages, filtered client-side on parentCompany.id) → subsidiaries
 *   [3] GET /api/v3/io/users?companyId=<id> ×subsidiaries (batched 5) → BC customer IDs
 *
 * BC OOTB calls:
 *   [4] GET /v3/customers?id:in=<dealerId>                        → dealer customer record (for email)
 *   [5] GET /v3/customers?id:in=<customerIds>&limit=250           → customer profiles
 *   [6] GET /api/v3/io/companies/{id} ×subsidiaries (batched 5)   → company Machines extra field
 *   [7] GET /v2/customer_groups                                    → group names (cached 5 min)
 *
 * Response:
 * {
 *   dealerId:  number,
 *   customers: [{ id, email, firstName, lastName, customerGroup, dateCreated, dateModified, registeredMachines }],
 *   meta:      { totalCustomerIds, returnedCustomerIds, truncated }
 * }
 */
router.get('/dealers/:dealerId/customers', async (req, res) => {
    const { dealerId } = req.params;
    if (!dealerId || !/^\d+$/.test(dealerId)) {
        return res.status(400).json({ error: 'Invalid dealerId — must be a numeric BC customer ID.' });
    }
    const dealerIdNum = Number(dealerId);
    try {
        // -- 1. Fetch dealer BC record to get email (needed for B2B lookup) --
        const dealerRes = await bigcommerce_1.default.get('/v3/customers', {
            params: { 'id:in': dealerId },
        });
        const dealerRecord = dealerRes.data?.data?.[0] ?? null;
        if (!dealerRecord) {
            return res.status(404).json({ error: 'Dealer not found.' });
        }
        // -- 2. Resolve customer IDs and company machines from B2B hierarchy --
        const { customerIds, totalCustomerIds, truncated, machinesByCustomerId } = await fetchCustomerIdsFromHierarchy(dealerRecord.email);
        if (customerIds.length === 0) {
            return res.json({
                dealerId: dealerIdNum,
                customers: [],
                meta: { totalCustomerIds, returnedCustomerIds: 0, truncated },
            });
        }
        // -- 3. Enrich: customer profiles and groups in parallel (machines already resolved) --
        const [customersRes, groupMap] = await Promise.all([
            bigcommerce_1.default.get('/v3/customers', {
                params: { 'id:in': customerIds.join(','), limit: BC_CUSTOMER_FILTER_LIMIT },
            }),
            fetchCustomerGroupMap(),
        ]);
        const bcCustomers = customersRes.data?.data ?? [];
        const customers = bcCustomers.map(c => ({
            id: c.id,
            email: c.email,
            firstName: c.first_name,
            lastName: c.last_name,
            customerGroup: {
                id: c.customer_group_id ?? null,
                name: c.customer_group_id ? (groupMap[c.customer_group_id] ?? null) : null,
            },
            dateCreated: c.date_created ?? null,
            dateModified: c.date_modified ?? null,
            registeredMachines: machinesByCustomerId[c.id] ?? [],
        }));
        return res.json({
            dealerId: dealerIdNum,
            customers,
            meta: { totalCustomerIds, returnedCustomerIds: customerIds.length, truncated },
        });
    }
    catch (err) {
        logger_1.default.error(`dealer ${dealerId}: customer fetch failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not load dealer customers.' });
    }
});
/**
 * POST /v1/api/dealers/:dealerId/recent-customer-search
 *
 * Records a customer the dealer selected/searched, storing the last 3 unique
 * entries (most-recent first) in the dealer's BC customer metafield.
 *
 * Body:
 * {
 *   "customerId":   123,
 *   "customerName": "ACME Corp"
 * }
 *
 * Response:
 * {
 *   "recentSearches": [
 *     { "customerId": 123, "customerName": "ACME Corp", "searchedAt": "2026-07-10T14:30:00.000Z" },
 *     ...
 *   ]
 * }
 *
 * BC OOTB calls:
 *   GET  /v3/customers/:dealerId/metafields?namespace=okuma&key=recent_customer_searches
 *   POST /v3/customers/:dealerId/metafields   (first call per dealer)
 *   PUT  /v3/customers/:dealerId/metafields/:id  (subsequent calls)
 */
router.post('/dealers/:dealerId/recent-customer-search', async (req, res) => {
    const { dealerId } = req.params;
    if (!dealerId || !/^\d+$/.test(dealerId)) {
        return res.status(400).json({ error: 'Invalid dealerId — must be a numeric BC customer ID.' });
    }
    const { customerId, customerName, companyName } = req.body;
    if (customerId === undefined ||
        customerId === null ||
        typeof customerId !== 'number' ||
        !Number.isInteger(customerId) ||
        customerId <= 0) {
        return res.status(400).json({ error: 'customerId must be a positive integer.' });
    }
    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
        return res.status(400).json({ error: 'customerName is required.' });
    }
    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
        return res.status(400).json({ error: 'companyName is required.' });
    }
    const newEntry = {
        customerId,
        customerName: customerName.trim(),
        companyName: companyName.trim(),
        searchedAt: new Date().toISOString(),
    };
    try {
        await upsertRecentCustomerSearches(dealerId, newEntry);
        return res.status(200).json({ message: 'Recent customer search saved successfully.' });
    }
    catch (err) {
        logger_1.default.error(`dealer ${dealerId}: recent-customer-search POST failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not save recent customer search.' });
    }
});
exports.default = router;
//# sourceMappingURL=dealers.js.map