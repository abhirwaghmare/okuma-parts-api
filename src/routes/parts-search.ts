import { Router, Request, Response } from 'express';
import bcClient from '../services/bigcommerce';
import fetchCustomerProfile from '../services/customerProfile';
import logger from '../config/logger';
import config from '../config';

const router = Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const CURRENCY_CODE = 'USD';

interface BcSearchProduct {
    id: number;
    sku: string;
    name: string;
    description: string;
    availability: string;
    inventory_tracking: 'none' | 'product' | 'variant';
    inventory_level: number;
}

interface BcPricingItem {
    product_id: number;
    price: { as_entered: number };
    calculated_price: { as_entered: number };
    sale_price: { as_entered: number } | null;
}

interface PricingResult {
    unitPrice: number | null;
    originalPrice: number | null;
}

interface PartResult {
    productId: number;
    partNumber: string;
    partName: string;
    description: string;
    unitPrice: number | null;
    originalPrice: number | null;
    status: string;
    stockStatus: 'instock' | 'backorder';
    shippingDetails: string;
}

/**
 * Fetch dealer-specific pricing for a batch of product IDs.
 * BC OOTB: POST /v3/pricing/products
 * customer_group_id is omitted from the payload (not from BC's required fields —
 * only channel_id + currency_code are mandatory) when the customer has none,
 * so pricing still resolves to base price instead of failing outright.
 */
async function fetchPricing(
    productIds: number[],
    customerGroupId: number | null
): Promise<Record<number, PricingResult>> {
    const payload: Record<string, unknown> = {
        channel_id: config.bc.channelId,
        currency_code: CURRENCY_CODE,
        items: productIds.map(id => ({ product_id: id })),
    };
    if (customerGroupId !== null) payload.customer_group_id = customerGroupId;

    const res = await bcClient.post<{ data: BcPricingItem[] }>('/v3/pricing/products', payload);
    const priceByProductId: Record<number, PricingResult> = {};
    (res.data?.data ?? []).forEach(item => {
        const listPrice = item.price?.as_entered ?? null;
        const finalPrice = item.calculated_price?.as_entered ?? listPrice;
        // originalPrice is only meaningful when it differs from the final price
        priceByProductId[item.product_id] = {
            unitPrice: finalPrice,
            originalPrice: finalPrice !== listPrice ? listPrice : null,
        };
    });
    return priceByProductId;
}

/**
 * GET /v1/parts/search
 *
 * Dealer part search by part number or name (Order for Self — not machine-scoped).
 * Combines BC's native keyword search (matches sku + name + description in one call)
 * with dealer-specific pricing resolved via the customer's customer_group_id.
 *
 * fetchCustomerProfile() and the catalog search run in parallel — neither depends on
 * the other's result. Pricing runs after, since it needs both the resolved
 * customer_group_id and the product IDs from the search results.
 *
 * If a customer session was bound (POST /customer/:customerId/session), customerId
 * must match it — otherwise a caller could request another customer's group pricing
 * simply by changing the query param.
 *
 * Query params:
 *   q          — required, search term (matched against SKU, name, description)
 *   customerId — required, BC customer ID of the logged-in dealer
 *   sort       — optional, "name_asc" | "name_desc"
 *   page       — optional, default 1, must be a positive integer
 *   limit      — optional, default 50, must be a positive integer, capped at 100
 *
 * Response: { total, page, limit, results: [{ productId, partNumber, partName, description, unitPrice, originalPrice, status, stockStatus, shippingDetails }] }
 */
router.get('/parts/search', async (req: Request, res: Response) => {
    const { q, customerId, sort, page = '1', limit = String(DEFAULT_LIMIT) } = req.query as Record<string, string>;

    if (!q || !q.trim()) {
        return res.status(400).json({ error: 'q (search term) is required.' });
    }
    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'customerId is required and must be numeric.' });
    }
    if (sort !== undefined && sort !== 'name_asc' && sort !== 'name_desc') {
        return res.status(400).json({ error: 'sort must be "name_asc" or "name_desc" when provided.' });
    }

    const pageNum = parseInt(page, 10);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
        return res.status(400).json({ error: 'page must be a positive integer.' });
    }
    const rawLimitNum = parseInt(limit, 10);
    if (!Number.isInteger(rawLimitNum) || rawLimitNum < 1) {
        return res.status(400).json({ error: 'limit must be a positive integer.' });
    }
    const limitNum = Math.min(rawLimitNum, MAX_LIMIT);

    const session = req.session as unknown as { customerId?: string };
    if (session.customerId && session.customerId !== customerId) {
        return res.status(403).json({ error: 'Forbidden.' });
    }

    let sortParams: Record<string, string> = {};
    if (sort === 'name_asc') sortParams = { sort: 'name', direction: 'asc' };
    else if (sort === 'name_desc') sortParams = { sort: 'name', direction: 'desc' };

    try {
        const [profile, searchRes] = await Promise.all([
            fetchCustomerProfile(customerId),
            bcClient.get<{ data: BcSearchProduct[]; meta: { pagination: { total: number } } }>('/v3/catalog/products', {
                params: { keyword: q.trim(), page, limit: limitNum, ...sortParams },
            }),
        ]);

        if (!profile) {
            return res.status(404).json({ error: 'Customer not found.' });
        }

        const products = searchRes.data?.data ?? [];
        const total = searchRes.data?.meta?.pagination?.total ?? 0;

        const priceByProductId =
            products.length > 0
                ? await fetchPricing(
                      products.map(p => p.id),
                      profile.customer_group_id
                  )
                : {};

        const results: PartResult[] = products.map(p => {
            let inStock: boolean;
            if (p.availability !== 'available') {
                inStock = false;
            } else if (p.inventory_tracking === 'none') {
                inStock = true;
            } else {
                inStock = p.inventory_level > 0;
            }
            const stockStatus = inStock ? 'instock' : 'backorder';
            const shippingDetails = inStock ? 'Ships in 1-3 business days' : 'Will be shipped once available';
            const pricing = priceByProductId[p.id] ?? { unitPrice: null, originalPrice: null };
            return {
                productId: p.id,
                partNumber: p.sku,
                partName: p.name,
                description: p.description || '',
                unitPrice: pricing.unitPrice,
                originalPrice: pricing.originalPrice,
                status: p.availability,
                stockStatus,
                shippingDetails,
            };
        });

        return res.json({ total, page: pageNum, limit: limitNum, results });
    } catch (err) {
        logger.error(`parts search failed for q="${q}": ${(err as Error).message}`);
        return res.status(502).json({ error: 'Could not complete parts search.' });
    }
});

export default router;
