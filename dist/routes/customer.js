"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bigcommerce_1 = __importDefault(require("../services/bigcommerce"));
const b2b_1 = __importDefault(require("../services/b2b"));
const logger_1 = __importDefault(require("../config/logger"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = (0, express_1.Router)();
const RECENT_MACHINES_LIMIT = 3;
const RECENT_SEARCHES_LIMIT = 3;
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Fetch all okuma-namespace metafields for a customer in one BC call.
 * Retains record IDs in `_ids` so callers can skip a redundant GET on upsert.
 * BC OOTB: GET /v3/customers/:id/metafields?namespace=okuma
 */
async function fetchOkumaMetafields(customerId) {
    const res = await bigcommerce_1.default.get(`/v3/customers/${customerId}/metafields`, { params: { namespace: 'okuma' } });
    const fields = res.data?.data ?? [];
    const map = { _ids: {} };
    // Guard against reserved and prototype-polluting keys. Writing '_ids' would
    // overwrite internal bookkeeping; writing '__proto__', 'constructor', or
    // 'prototype' could mutate Object.prototype and cause hard-to-debug runtime issues.
    const RESERVED_KEYS = new Set([...Object.keys(map), '__proto__', 'constructor', 'prototype']);
    fields.forEach(f => {
        if (RESERVED_KEYS.has(f.key))
            return;
        map[f.key] = f.value;
        map._ids[f.key] = f.id;
    });
    return map;
}
/**
 * Upsert a single okuma-namespace metafield on a customer.
 * When `existingId` is supplied (from a prior fetchOkumaMetafields call) the
 * redundant GET to discover the record is skipped — PUT is issued directly.
 * When omitted, falls back to GET → PUT/POST.
 */
async function upsertOkumaMetafield(customerId, key, value, existingId) {
    const payload = { value, namespace: 'okuma', key, permission_set: 'read_and_sf_access' };
    if (existingId !== undefined) {
        await bigcommerce_1.default.put(`/v3/customers/${customerId}/metafields/${existingId}`, payload);
        return;
    }
    const getRes = await bigcommerce_1.default.get(`/v3/customers/${customerId}/metafields`, {
        params: { namespace: 'okuma', key },
    });
    const existing = getRes.data?.data?.[0] ?? null;
    if (existing) {
        await bigcommerce_1.default.put(`/v3/customers/${customerId}/metafields/${existing.id}`, payload);
    }
    else {
        await bigcommerce_1.default.post(`/v3/customers/${customerId}/metafields`, payload);
    }
}
/**
 * Fetch customer profile (company, phone, email) from BC.
 * BC OOTB: GET /v3/customers?id:in=:customerId
 */
async function fetchCustomerProfile(customerId) {
    try {
        const res = await bigcommerce_1.default.get('/v3/customers', {
            params: { 'id:in': customerId },
        });
        return res.data?.data?.[0] ?? null;
    }
    catch (err) {
        logger_1.default.warn(`fetchCustomerProfile ${customerId}: ${err.message}`);
        return null;
    }
}
/**
 * Fetch machines from the B2B company Machines extra field.
 * Resolves: BC email → B2B user → companyId → company extraFields → Machines JSON.
 * Returns an empty array on any lookup failure.
 */
async function fetchB2BMachines(email) {
    try {
        const usersRes = await b2b_1.default.get('/api/v3/io/users', { params: { email } });
        const companyId = usersRes.data?.data?.[0]?.companyId;
        if (!companyId)
            return [];
        const companyRes = await b2b_1.default.get(`/api/v3/io/companies/${companyId}`);
        const machinesField = (companyRes.data?.data?.extraFields ?? []).find(f => f.fieldName.toLowerCase() === 'machines');
        if (!machinesField)
            return [];
        let raw;
        try {
            const sanitized = machinesField.fieldValue.replace(/,(\s*[}\]])/g, '$1');
            const parsed = JSON.parse(sanitized);
            raw = Array.isArray(parsed) ? parsed : (parsed?.machines ?? []);
        }
        catch {
            logger_1.default.warn(`fetchB2BMachines: Machines field for company ${companyId} is not valid JSON`);
            return [];
        }
        const seenSerials = new Set();
        return raw
            .filter(m => m.status !== 'Inactive')
            .filter(m => {
            const serial = m.serialNo ?? '';
            if (!serial || seenSerials.has(serial))
                return false;
            seenSerials.add(serial);
            return true;
        })
            .map(m => ({
            model: m.modelNo ?? '',
            serial: m.serialNo ?? '',
            display: `${m.modelNo ?? ''} ${m.serialNo ?? ''}`.trim(),
            installDate: m.installDate || 'pending',
            status: m.status ?? null,
        }))
            .sort((a, b) => {
            const cmp = a.model.localeCompare(b.model);
            return cmp !== 0 ? cmp : a.serial.localeCompare(b.serial);
        });
    }
    catch (err) {
        logger_1.default.warn(`fetchB2BMachines: ${err.message}`);
        return [];
    }
}
/**
 * Fetch job title from BC customer form field values.
 * BC OOTB: GET /v3/customers/form-field-values?customer_id:in=:customerId
 * Matches any field whose name normalises to "jobtitle".
 */
async function fetchCustomerJobTitle(customerId) {
    try {
        const res = await bigcommerce_1.default.get('/v3/customers/form-field-values', { params: { 'customer_id:in': customerId } });
        const field = (res.data?.data ?? []).find(f => f.name?.toLowerCase().replace(/[\s_-]/g, '') === 'jobtitle');
        return field?.value ?? null;
    }
    catch (err) {
        logger_1.default.warn(`fetchCustomerJobTitle ${customerId}: ${err.message}`);
        return null;
    }
}
/**
 * Fetch a customer record by ID.
 * Returns company name, or falls back to first + last name.
 */
async function fetchCustomerName(customerId) {
    try {
        const res = await bigcommerce_1.default.get('/v3/customers', {
            params: { 'id:in': customerId },
        });
        const c = res.data?.data?.[0] ?? null;
        if (!c)
            return null;
        return {
            id: c.id,
            name: c.company || `${c.first_name} ${c.last_name}`.trim(),
        };
    }
    catch (err) {
        logger_1.default.warn(`fetchCustomerName ${customerId}: ${err.message}`);
        return null;
    }
}
/** Fetch a BC customer group name by ID via GET /v2/customer_groups/:id. Returns null on failure. */
async function fetchCustomerGroupName(groupId) {
    try {
        const res = await bigcommerce_1.default.get(`/v2/customer_groups/${groupId}`);
        return res.data?.name ?? null;
    }
    catch (err) {
        logger_1.default.warn(`fetchCustomerGroupName ${groupId}: ${err.message}`);
        return null;
    }
}
/**
 * Read per-customer machine context from Express session without mutating it.
 * Returns a default value when the key is absent so GET handlers do not
 * dirty the session store on cold requests.
 */
function readSessionState(req, customerId) {
    const session = req.session;
    return session.machineContext?.[customerId] ?? { selected: null, recent: [] };
}
/** Persist updated machine context to the session (write handlers only). */
function writeSessionState(req, customerId, state) {
    const session = req.session;
    if (!session.machineContext)
        session.machineContext = {};
    session.machineContext[customerId] = state;
}
/**
 * Resolve the default selected machine.
 * Priority: BC last_viewed_machine metafield → session → first alphabetically.
 * Uses || (not ??) so that an empty-string metafield value falls through to session.
 */
function resolveDefaultMachine(machines, lastViewedSerial, sessionSerial) {
    if (!machines.length)
        return null;
    const preferred = lastViewedSerial || sessionSerial;
    if (preferred) {
        const found = machines.find(m => m.serial === preferred);
        if (found)
            return found;
    }
    return machines[0];
}
/**
 * Parse the recent_machines metafield value into an array of serials.
 * Falls back to the session list on missing value, invalid JSON, or non-array.
 */
function parseRecentSerials(raw, sessionFallback) {
    if (!raw)
        return sessionFallback;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : sessionFallback;
    }
    catch {
        return sessionFallback;
    }
}
/** Parse the recent_customer_searches metafield value into an array of CustomerSearchEntry objects. */
function parseRecentSearches(raw) {
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((s) => typeof s === 'object' && s !== null && typeof s.customerId === 'number');
    }
    catch {
        return [];
    }
}
// ---------------------------------------------------------------------------
// Session-based customer authorization
// ---------------------------------------------------------------------------
/**
 * Bind the caller's session to the given customer ID.
 * Called by the Stencil front-end after BC native login has been confirmed.
 * The customer's existence in BC is verified before the session is written.
 */
async function bindCustomerSession(req, customerId) {
    const res = await bigcommerce_1.default.get('/v3/customers', {
        params: { 'id:in': customerId },
    });
    if (!res.data?.data?.[0]) {
        throw Object.assign(new Error('Customer not found'), { statusCode: 404 });
    }
    req.session.customerId = customerId;
}
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
/**
 * POST /customer/:customerId/session
 *
 * Establishes a session for the authenticated customer.
 * This route is restricted to trusted server-to-server callers so an arbitrary
 * browser client cannot bind a session to another customer's ID.
 * Existence in BC is verified before the session is written.
 *
 * Response: 204 No Content on success.
 */
router.post('/customer/:customerId/session', auth_1.default, async (req, res) => {
    const { customerId } = req.params;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    try {
        await bindCustomerSession(req, customerId);
        return res.status(204).send();
    }
    catch (err) {
        const { statusCode } = err;
        if (statusCode === 404) {
            return res.status(404).json({ error: 'Customer not found.' });
        }
        logger_1.default.error(`customer ${customerId}: session bind failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not establish customer session.' });
    }
});
/**
 * GET /customer/:customerId/distributor
 *
 * Returns the distributor/dealer assigned to the customer.
 * The binding is stored as an okuma/dealer_id metafield on the customer.
 *
 * Response: { dealerId: number, dealerName: string } | { dealerId: null, dealerName: null }
 */
router.get('/customer/:customerId/distributor', async (req, res) => {
    const { customerId } = req.params;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    try {
        const meta = await fetchOkumaMetafields(customerId);
        if (!meta.dealer_id) {
            return res.json({ dealerId: null, dealerName: null });
        }
        const dealerIdNum = parseInt(meta.dealer_id, 10);
        if (Number.isNaN(dealerIdNum)) {
            logger_1.default.warn(`customer ${customerId}: dealer_id metafield is non-numeric: "${meta.dealer_id}"`);
            return res.json({ dealerId: null, dealerName: null });
        }
        const dealer = await fetchCustomerName(meta.dealer_id);
        return res.json({
            dealerId: dealer ? dealer.id : dealerIdNum,
            dealerName: dealer ? dealer.name : null,
        });
    }
    catch (err) {
        logger_1.default.error(`customer ${customerId}: distributor lookup failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not load distributor.' });
    }
});
/**
 * GET /customer/:customerId/machines
 *
 * Returns assigned machines from the B2B company Machines extra field.
 *
 * Response: { count: number, machines: [{ model, serial, display, installDate, status }] }
 */
router.get('/customer/:customerId/machines', async (req, res) => {
    const { customerId } = req.params;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    try {
        const profile = await fetchCustomerProfile(customerId);
        const machines = profile?.email ? await fetchB2BMachines(profile.email) : [];
        return res.json({ count: machines.length, machines });
    }
    catch (err) {
        logger_1.default.error(`customer ${customerId}: machines fetch failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not load customer machines.' });
    }
});
/**
 * GET /customer/:customerId/header-context
 *
 * Returns all data needed for the machine-selector sub-header and account
 * summary card in one response.
 *
 * Default machine priority: BC last_viewed_machine metafield → session → first alphabetically.
 * Recent machines: BC recent_machines metafield (survives logout) → session fallback, capped at 3.
 *
 * Response for dealer:        { isDealer: true }
 * Response for regular user:
 * {
 *   isDealer: false,
 *   customer:        { firstName, lastName, email, company, phone },
 *   dealerName:      string | null,
 *   selectedMachine: { model, serial, display, installDate, status } | null,
 *   machines:        [...],              // all active, sorted A→Z
 *   recentMachines:  [...]              // last 3 selected, most-recent first
 * }
 */
router.get('/customer/:customerId/header-context', async (req, res) => {
    const { customerId } = req.params;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    try {
        const [meta, profile, jobTitle] = await Promise.all([
            fetchOkumaMetafields(customerId),
            fetchCustomerProfile(customerId),
            fetchCustomerJobTitle(customerId),
        ]);
        if (meta.registered_customers !== undefined) {
            return res.json({ isDealer: true });
        }
        const [machines, dealerName] = await Promise.all([
            profile?.email ? fetchB2BMachines(profile.email) : Promise.resolve([]),
            profile?.customer_group_id ? fetchCustomerGroupName(profile.customer_group_id) : Promise.resolve(null),
        ]);
        // readSessionState never mutates req.session — avoids a store write on every GET
        const sessionState = readSessionState(req, customerId);
        const selectedMachine = resolveDefaultMachine(machines, meta.last_viewed_machine, sessionState.selected);
        const recentSerials = parseRecentSerials(meta.recent_machines, sessionState.recent ?? []);
        const recentMachines = recentSerials
            .slice(0, RECENT_MACHINES_LIMIT)
            .map(serial => machines.find(m => m.serial === serial))
            .filter((m) => m !== undefined);
        return res.json({
            isDealer: false,
            customer: profile
                ? {
                    firstName: profile.first_name,
                    lastName: profile.last_name,
                    email: profile.email,
                    company: profile.company || null,
                    phone: profile.phone || null,
                    jobTitle,
                }
                : null,
            dealerName,
            selectedMachine,
            machines,
            recentMachines,
        });
    }
    catch (err) {
        logger_1.default.error(`customer ${customerId}: header-context failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not load customer context.' });
    }
});
/**
 * POST /customer/:customerId/machine/select
 *
 * Records the customer's machine selection.
 * - Updates session (immediate)
 * - Persists last_viewed_machine to BC metafield (survives logout, sets default on next visit)
 * - Persists recent_machines to BC metafield (survives logout, drives Recent section, capped at 3)
 *
 * Body:     { "serial": "M5-2891-K" }
 * Response: { "selectedMachine": { model, serial, display, installDate, status } }
 */
router.post('/customer/:customerId/machine/select', async (req, res) => {
    const { customerId } = req.params;
    const { serial, model } = req.body;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    if (!serial || typeof serial !== 'string' || !serial.trim()) {
        return res.status(400).json({ error: 'serial is required.' });
    }
    try {
        const [meta, profile] = await Promise.all([
            fetchOkumaMetafields(customerId),
            fetchCustomerProfile(customerId),
        ]);
        const machines = profile?.email ? await fetchB2BMachines(profile.email) : [];
        const machine = machines.find(m => m.serial === serial.trim() && (model ? m.model === model.trim() : true));
        if (!machine) {
            return res.status(404).json({
                error: `Machine with serial '${serial}'${model ? ` and model '${model}'` : ''} not found in customer's assigned machines.`,
            });
        }
        // Seed recent list from BC metafield so cross-session history is preserved
        const sessionState = readSessionState(req, customerId);
        const baseRecent = parseRecentSerials(meta.recent_machines, sessionState.recent ?? []);
        const updatedRecent = [machine.serial, ...baseRecent.filter(s => s !== machine.serial)].slice(0, RECENT_MACHINES_LIMIT);
        writeSessionState(req, customerId, { selected: machine.serial, recent: updatedRecent });
        const recentMachines = updatedRecent
            .map(s => machines.find(m => m.serial === s))
            .filter((m) => m !== undefined);
        // Await both BC metafield writes so GET /header-context reads fresh data immediately after.
        const results = await Promise.allSettled([
            upsertOkumaMetafield(customerId, 'last_viewed_machine', machine.serial, meta._ids.last_viewed_machine),
            upsertOkumaMetafield(customerId, 'recent_machines', JSON.stringify(updatedRecent), meta._ids.recent_machines),
        ]);
        const keys = ['last_viewed_machine', 'recent_machines'];
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                logger_1.default.error(`customer ${customerId}: metafield upsert [${keys[i]}] failed: ${r.reason.message}`);
            }
        });
        return res.json({ selectedMachine: machine, recentMachines });
    }
    catch (err) {
        logger_1.default.error(`customer ${customerId}: machine select failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not select machine.' });
    }
});
/**
 * GET /customer/:customerId/searches
 *
 * Returns the customer's recent searched-customer history from the BC metafield.
 *
 * Response: { searches: CustomerSearchEntry[] }
 */
router.get('/customer/:customerId/searches', async (req, res) => {
    const { customerId } = req.params;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    try {
        const meta = await fetchOkumaMetafields(customerId);
        const searches = parseRecentSearches(meta.recent_customer_searches);
        return res.json({ searches });
    }
    catch (err) {
        logger_1.default.error(`customer ${customerId}: searches fetch failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not load recent searches.' });
    }
});
/**
 * POST /customer/:customerId/searches
 *
 * Prepends a searched customer entry to the dealer's recent search history and
 * persists it to the BC metafield. Deduplicates by searchedCustomerId. Capped
 * at RECENT_SEARCHES_LIMIT.
 *
 * Body:     { "customerId": 248, "customerName": "John Smith", "companyName": "Gosiger Inc." }
 * Response: { "searches": CustomerSearchEntry[] }
 */
router.post('/customer/:customerId/searches', async (req, res) => {
    const { customerId } = req.params;
    const { customerId: searchedCustomerId, customerName, companyName, } = req.body;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    if (!searchedCustomerId || typeof searchedCustomerId !== 'number') {
        return res.status(400).json({ error: 'customerId (searched customer) must be a number.' });
    }
    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
        return res.status(400).json({ error: 'customerName is required.' });
    }
    const entry = {
        customerId: searchedCustomerId,
        customerName: customerName.trim(),
        companyName: typeof companyName === 'string' ? companyName.trim() || null : null,
        searchedAt: new Date().toISOString(),
    };
    try {
        const meta = await fetchOkumaMetafields(customerId);
        const current = parseRecentSearches(meta.recent_customer_searches);
        const updated = [entry, ...current.filter(s => s.customerId !== entry.customerId)].slice(0, RECENT_SEARCHES_LIMIT);
        await upsertOkumaMetafield(customerId, 'recent_customer_searches', JSON.stringify(updated), meta._ids.recent_customer_searches);
        return res.json({ searches: updated });
    }
    catch (err) {
        logger_1.default.error(`customer ${customerId}: searches update failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not update recent searches.' });
    }
});
/**
 * GET /customer/:customerId/metafields?namespace=okuma&key=recent_customer_searches
 *
 * General-purpose BC customer metafield proxy. Returns the raw value for the
 * given namespace + key combination, proxied server-side to avoid CORS.
 *
 * Query params:
 *   namespace  — required, e.g. "okuma"
 *   key        — required, e.g. "recent_customer_searches"
 *
 * Response: { customerId, namespace, key, value: string | null }
 */
router.get('/customer/:customerId/metafields', async (req, res) => {
    const { customerId } = req.params;
    const { namespace, key } = req.query;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    if (!namespace || !namespace.trim()) {
        return res.status(400).json({ error: 'namespace query param is required.' });
    }
    if (!key || !key.trim()) {
        return res.status(400).json({ error: 'key query param is required.' });
    }
    try {
        const bcRes = await bigcommerce_1.default.get(`/v3/customers/${customerId}/metafields`, {
            params: { namespace: namespace.trim(), key: key.trim() },
        });
        const record = bcRes.data?.data?.[0] ?? null;
        return res.json({
            customerId: parseInt(customerId, 10),
            namespace: namespace.trim(),
            key: key.trim(),
            value: record ? record.value : null,
        });
    }
    catch (err) {
        logger_1.default.error(`customer ${customerId}: metafield fetch [${namespace}/${key}] failed: ${err.message}`);
        return res.status(500).json({ error: 'Could not load metafield.' });
    }
});
/*
 * GET /customer/:customerId/companyProfile
 *
 * Returns the customer's name, company name, account number, and address.
 *
 * Call 1 [OOTB B3]: GET /api/v3/io/users?bcCustomerId={id}  → firstName, lastName, companyId
 * Call 2 [OOTB B3]: GET /api/v3/io/companies/{companyId}    → companyName, address, accountNumber
 *
 * Response: { customerName, companyName, accountNumber, address }
 */
router.get('/customer/:customerId/companyProfile', auth_1.default, async (req, res) => {
    const { customerId } = req.params;
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    try {
        // Call 1 — resolve customer name + companyId from B3
        const usersRes = await b2b_1.default.get(`/api/v3/io/users?bcCustomerId=${customerId}`);
        const b3User = usersRes.data?.data?.[0];
        if (!b3User) {
            return res.status(404).json({ error: 'Customer not found in B2B.' });
        }
        const { firstName, lastName, companyId } = b3User;
        // Fix #1: guard against missing companyId before calling companies API
        if (companyId === null || companyId === undefined) {
            return res.status(404).json({ error: 'Company not found for customer.' });
        }
        // Call 2 — resolve company details from B3
        const companyRes = await b2b_1.default.get(`/api/v3/io/companies/${companyId}`);
        const company = companyRes.data?.data;
        if (!company) {
            return res.status(404).json({ error: 'Company not found.' });
        }
        const accountNumber = company.extraFields.find(f => f.fieldName === 'Account Number')?.fieldValue ?? null;
        const addressParts = [company.addressLine1, company.city, company.state, company.zipCode, company.country]
            .map(p => (p ?? '').trim())
            .filter(Boolean);
        return res.json({
            // Fix #2: coalesce to empty strings to avoid "undefined"/"null" in response
            customerName: `${firstName ?? ''} ${lastName ?? ''}`.trim(),
            companyName: company.companyName ?? null,
            accountNumber,
            address: {
                line1: company.addressLine1 ?? '',
                city: company.city ?? '',
                state: company.state ?? '',
                zipCode: company.zipCode ?? '',
                country: company.country ?? '',
                formatted: addressParts.join(', '),
            },
        });
    }
    catch (err) {
        // Fix #3: map upstream B2B 404s to 404 instead of 500
        if (err?.response?.status === 404) {
            return res.status(404).json({ error: 'Customer or company not found.' });
        }
        logger_1.default.error(`customer ${customerId}: companyProfile failed: ${err?.message ?? 'Unknown error'}`);
        return res.status(500).json({ error: 'Could not load company profile.' });
    }
});
exports.default = router;
//# sourceMappingURL=customer.js.map