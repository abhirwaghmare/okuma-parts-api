'use strict';

const { Router } = require('express');
const bcClient = require('../services/bigcommerce');

const router = Router();

const RECENT_MACHINES_LIMIT = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch all okuma-namespace metafields for a customer in one BC OOTB call.
 * Returns a plain object keyed by metafield key for easy lookup.
 *
 * BC OOTB: GET /v3/customers/:id/metafields?namespace=okuma
 *
 * @param {string|number} customerId
 * @returns {Promise<Object.<string, string>>}  key → raw string value
 */
async function fetchOkumaMetafields(customerId) {
    const res = await bcClient.get(`/v3/customers/${customerId}/metafields`, {
        params: { namespace: 'okuma' },
    });
    const fields = (res.data && res.data.data) || [];
    const map = {};
    fields.forEach(f => {
        map[f.key] = f.value;
    });
    return map;
}

/**
 * Parse and normalise the registered_machines metafield value.
 * Filters inactive machines, adds a display string, and sorts alphabetically
 * by model then serial.
 *
 * @param {string|undefined} raw  - raw JSON string from metafield
 * @returns {Array}
 */
function parseMachines(raw) {
    if (!raw) return [];
    let list;
    try {
        list = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(list)) return [];

    return list
        .filter(m => m.status !== 'Inactive')
        .map(m => ({
            model: m.model || '',
            serial: m.serial || '',
            display: `${m.model || ''} ${m.serial || ''}`.trim(),
            installDate: m.install_date || null,
            status: m.status || null,
        }))
        .sort((a, b) => {
            const cmp = a.model.localeCompare(b.model);
            return cmp !== 0 ? cmp : a.serial.localeCompare(b.serial);
        });
}

/**
 * Fetch the dealer's display name from BC using a customer ID.
 * Prefers company field; falls back to first + last name.
 *
 * BC OOTB: GET /v3/customers?id:in=:dealerId&include_fields=id,company,first_name,last_name
 *
 * @param {string} dealerId
 * @returns {Promise<string|null>}
 */
async function fetchDealerName(dealerId) {
    try {
        const res = await bcClient.get('/v3/customers', {
            params: {
                'id:in': dealerId,
                include_fields: 'id,company,first_name,last_name',
            },
        });
        const dealer = (res.data && res.data.data && res.data.data[0]) || null;
        if (!dealer) return null;
        return dealer.company || `${dealer.first_name} ${dealer.last_name}`.trim() || null;
    } catch {
        return null;
    }
}

/**
 * Read per-customer machine context from Express session.
 * Initialises the structure on first access.
 *
 * @param {object} req   - Express request
 * @param {string} customerId
 * @returns {{ selected: string|null, recent: string[] }}
 */
function getSessionState(req, customerId) {
    if (!req.session.machineContext) req.session.machineContext = {};
    if (!req.session.machineContext[customerId]) {
        req.session.machineContext[customerId] = { selected: null, recent: [] };
    }
    return req.session.machineContext[customerId];
}

/**
 * Resolve which machine should be selected by default:
 * 1. Last selected machine stored in session (if still in assigned list)
 * 2. First machine in alphabetically sorted list
 *
 * @param {Array}   machines      - sorted assigned machines
 * @param {object}  sessionState  - { selected: string|null, recent: string[] }
 * @returns {object|null}
 */
function resolveDefaultMachine(machines, sessionState) {
    if (!machines.length) return null;
    if (sessionState.selected) {
        const found = machines.find(m => m.serial === sessionState.selected);
        if (found) return found;
    }
    return machines[0];
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/customer/:customerId/header-context
 *
 * Returns everything needed to render the machine-selector sub-header.
 * One BC API call fetches all okuma metafields; dealer name resolved in parallel.
 *
 * Response when customer is a dealer:
 *   { isDealer: true }
 *
 * Response when customer is a regular user:
 *   {
 *     isDealer: false,
 *     dealerName: "ABC Distributors" | null,
 *     selectedMachine: { model, serial, display, installDate, status } | null,
 *     machines: [...],          // all active machines, sorted A→Z
 *     recentMachines: [...]     // last 5 selected, most-recent first
 *   }
 *
 * Dealer detection: customer has okuma.registered_customers metafield.
 * Default machine: session last-selected → first alphabetically.
 */
router.get('/api/customer/:customerId/header-context', async (req, res) => {
    const { customerId } = req.params;

    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }

    try {
        // Single BC call — all okuma metafields for this customer
        const meta = await fetchOkumaMetafields(customerId);

        // Dealers have registered_customers metafield — sub-header not shown for them
        if (meta.registered_customers !== undefined) {
            return res.json({ isDealer: true });
        }

        const machines = parseMachines(meta.registered_machines);

        // Fetch dealer name in parallel with nothing else blocking (meta already loaded)
        const dealerName = meta.dealer_id ? await fetchDealerName(meta.dealer_id) : null;

        const sessionState = getSessionState(req, customerId);
        const selectedMachine = resolveDefaultMachine(machines, sessionState);

        // Resolve recent machines — only include serials still in the assigned list
        const recentMachines = (sessionState.recent || [])
            .map(serial => machines.find(m => m.serial === serial))
            .filter(Boolean);

        return res.json({
            isDealer: false,
            dealerName,
            selectedMachine,
            machines,
            recentMachines,
        });
    } catch (err) {
        console.error(`customer ${customerId}: header-context failed:`, err.message);
        return res.status(500).json({ error: 'Could not load customer context.' });
    }
});

/**
 * POST /api/customer/:customerId/machine/select
 *
 * Persists the selected machine in session and prepends it to the recent list.
 * Called by the frontend AFTER the user confirms cart clearance (if needed).
 * The frontend is responsible for clearing the cart before calling this.
 *
 * Body:   { "serial": "M5-2891-K" }
 *
 * Response:
 *   { "selectedMachine": { model, serial, display, installDate, status } }
 */
router.post('/api/customer/:customerId/machine/select', async (req, res) => {
    const { customerId } = req.params;
    const { serial } = req.body;

    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }
    if (!serial || typeof serial !== 'string' || !serial.trim()) {
        return res.status(400).json({ error: 'serial is required.' });
    }

    try {
        const meta = await fetchOkumaMetafields(customerId);
        const machines = parseMachines(meta.registered_machines);
        const machine = machines.find(m => m.serial === serial.trim());

        if (!machine) {
            return res.status(404).json({
                error: `Machine with serial '${serial}' not found in customer's assigned machines.`,
            });
        }

        const sessionState = getSessionState(req, customerId);

        // Persist selection
        sessionState.selected = machine.serial;

        // Prepend to recent, deduplicate, cap at limit
        sessionState.recent = [
            machine.serial,
            ...(sessionState.recent || []).filter(s => s !== machine.serial),
        ].slice(0, RECENT_MACHINES_LIMIT);

        return res.json({ selectedMachine: machine });
    } catch (err) {
        console.error(`customer ${customerId}: machine select failed:`, err.message);
        return res.status(500).json({ error: 'Could not select machine.' });
    }
});

module.exports = router;
