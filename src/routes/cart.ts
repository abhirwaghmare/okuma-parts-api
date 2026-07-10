import { Router, Request, Response } from 'express';
import { AxiosError } from 'axios';
import bcClient from '../services/bigcommerce';
import logger from '../config/logger';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
    id: string;
    product_id: number;
    variant_id: number;
    name: string;
    sku: string;
    quantity: number;
    sale_price: number;
    list_price: number;
    image_url?: string;
}

interface BcCart {
    id: string;
    customer_id: number;
    base_amount: number;
    discount_amount: number;
    cart_amount: number;
    line_items: {
        physical_items: LineItem[];
        digital_items: LineItem[];
        gift_certificates: unknown[];
        custom_items: unknown[];
    };
}

interface BcRedirectUrls {
    cart_url: string;
    checkout_url: string;
    embedded_checkout_url: string;
}

interface AddItemBody {
    productId?: unknown;
    quantity?: unknown;
    variantId?: unknown;
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function getCartId(req: Request): string | null {
    const session = req.session as unknown as Record<string, unknown> & { cartId?: string };
    return session.cartId ?? null;
}

function setCartId(req: Request, cartId: string): void {
    const session = req.session as unknown as Record<string, unknown> & { cartId?: string };
    session.cartId = cartId;
}

function clearCartId(req: Request): void {
    const session = req.session as unknown as Record<string, unknown> & { cartId?: string };
    delete session.cartId;
}

// ---------------------------------------------------------------------------
// BC Cart helpers
// ---------------------------------------------------------------------------

async function fetchRedirectUrls(cartId: string): Promise<BcRedirectUrls> {
    const res = await bcClient.post<{ data: BcRedirectUrls }>(`/v3/carts/${cartId}/redirect_urls`);
    return res.data.data;
}

/**
 * Create a new BC cart with one line item.
 * BC OOTB: POST /v3/carts
 */
async function createCart(productId: number, quantity: number, variantId?: number): Promise<BcCart> {
    const lineItem: Record<string, unknown> = { product_id: productId, quantity };
    if (variantId) lineItem.variant_id = variantId;

    const res = await bcClient.post<{ data: BcCart }>('/v3/carts', {
        line_items: [lineItem],
    });
    return res.data.data;
}

/**
 * Append a line item to an existing cart.
 * BC OOTB: POST /v3/carts/:cartId/items
 */
async function appendCartItem(
    cartId: string,
    productId: number,
    quantity: number,
    variantId?: number
): Promise<BcCart> {
    const lineItem: Record<string, unknown> = { product_id: productId, quantity };
    if (variantId) lineItem.variant_id = variantId;

    const res = await bcClient.post<{ data: BcCart }>(`/v3/carts/${cartId}/items`, {
        line_items: [lineItem],
    });
    return res.data.data;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /cart/items
 *
 * Add a product to the cart. Creates the cart on the first call; appends on
 * subsequent calls using the cartId stored in the session. If the stored cart
 * has expired on BC (404), a new one is created transparently.
 *
 * Body: { productId: number, quantity?: number, variantId?: number }
 *
 * Response:
 * {
 *   cartId:       string,
 *   cart:         { id, baseAmount, cartAmount, lineItems },
 *   redirectUrls: { cartUrl, checkoutUrl, embeddedCheckoutUrl }
 * }
 */
router.post('/cart/items', async (req: Request, res: Response) => {
    const { productId, quantity = 1, variantId } = req.body as AddItemBody;

    if (!productId || typeof productId !== 'number' || !Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: 'productId must be a positive integer.' });
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        return res.status(400).json({ error: 'quantity must be an integer between 1 and 999.' });
    }
    if (variantId !== undefined && (typeof variantId !== 'number' || !Number.isInteger(variantId) || variantId <= 0)) {
        return res.status(400).json({ error: 'variantId must be a positive integer.' });
    }

    try {
        let cart: BcCart;
        const existingCartId = getCartId(req);

        if (existingCartId) {
            try {
                cart = await appendCartItem(existingCartId, productId, quantity, variantId as number | undefined);
            } catch (err) {
                // Cart expired or deleted on BC — create a fresh one
                if ((err as AxiosError).response?.status === 404) {
                    logger.warn(`cart ${existingCartId}: not found on BC, creating new cart`);
                    clearCartId(req);
                    cart = await createCart(productId, quantity, variantId as number | undefined);
                } else {
                    throw err;
                }
            }
        } else {
            cart = await createCart(productId, quantity, variantId as number | undefined);
        }

        setCartId(req, cart.id);

        const redirectUrls = await fetchRedirectUrls(cart.id);

        const physicalItems = cart.line_items?.physical_items ?? [];

        return res.status(201).json({
            cartId: cart.id,
            cart: {
                id: cart.id,
                baseAmount: cart.base_amount,
                cartAmount: cart.cart_amount,
                lineItemCount: physicalItems.length,
                lineItems: physicalItems.map(item => ({
                    id: item.id,
                    productId: item.product_id,
                    variantId: item.variant_id,
                    name: item.name,
                    sku: item.sku,
                    quantity: item.quantity,
                    salePrice: item.sale_price,
                    listPrice: item.list_price,
                    imageUrl: item.image_url ?? null,
                })),
            },
            redirectUrls: {
                cartUrl: redirectUrls.cart_url,
                checkoutUrl: redirectUrls.checkout_url,
                embeddedCheckoutUrl: redirectUrls.embedded_checkout_url,
            },
        });
    } catch (err) {
        logger.error(`cart add item failed (productId=${productId}): ${(err as Error).message}`);
        return res.status(500).json({ error: 'Could not add item to cart.' });
    }
});

/**
 * GET /cart
 *
 * Returns the current cart from session. 404 when no active cart exists.
 *
 * Response: { cartId, baseAmount, cartAmount, lineItemCount, lineItems[], redirectUrls }
 */
router.get('/cart', async (req: Request, res: Response) => {
    const cartId = getCartId(req);

    if (!cartId) {
        return res.status(404).json({ error: 'No active cart.' });
    }

    try {
        const cartRes = await bcClient.get<{ data: BcCart }>(`/v3/carts/${cartId}`, {
            params: { include: 'line_items.physical_items.options' },
        });
        const cart = cartRes.data.data;
        const redirectUrls = await fetchRedirectUrls(cartId);
        const physicalItems = cart.line_items?.physical_items ?? [];

        return res.json({
            cartId: cart.id,
            baseAmount: cart.base_amount,
            cartAmount: cart.cart_amount,
            lineItemCount: physicalItems.length,
            lineItems: physicalItems.map(item => ({
                id: item.id,
                productId: item.product_id,
                variantId: item.variant_id,
                name: item.name,
                sku: item.sku,
                quantity: item.quantity,
                salePrice: item.sale_price,
                listPrice: item.list_price,
                imageUrl: item.image_url ?? null,
            })),
            redirectUrls: {
                cartUrl: redirectUrls.cart_url,
                checkoutUrl: redirectUrls.checkout_url,
                embeddedCheckoutUrl: redirectUrls.embedded_checkout_url,
            },
        });
    } catch (err) {
        if ((err as AxiosError).response?.status === 404) {
            clearCartId(req);
            return res.status(404).json({ error: 'Cart has expired or does not exist.' });
        }
        logger.error(`cart fetch failed (cartId=${cartId}): ${(err as Error).message}`);
        return res.status(500).json({ error: 'Could not load cart.' });
    }
});

/**
 * DELETE /cart/items/:itemId
 *
 * Remove a single line item from the cart.
 * Clears the session cartId when the last item is removed (BC deletes the cart).
 *
 * Response: 204 No Content on success.
 */
router.delete('/cart/items/:itemId', async (req: Request, res: Response) => {
    const cartId = getCartId(req);
    const { itemId } = req.params;

    if (!cartId) {
        return res.status(404).json({ error: 'No active cart.' });
    }

    try {
        await bcClient.delete(`/v3/carts/${cartId}/items/${itemId}`);
        return res.status(204).send();
    } catch (err) {
        const status = (err as AxiosError).response?.status;
        if (status === 404) {
            // BC returns 404 when the last item is removed (cart is auto-deleted)
            clearCartId(req);
            return res.status(204).send();
        }
        logger.error(`cart remove item failed (cartId=${cartId}, itemId=${itemId}): ${(err as Error).message}`);
        return res.status(500).json({ error: 'Could not remove item from cart.' });
    }
});

/**
 * DELETE /cart
 *
 * Delete the entire cart and clear the session.
 *
 * Response: 204 No Content on success.
 */
router.delete('/cart', async (req: Request, res: Response) => {
    const cartId = getCartId(req);

    if (!cartId) {
        return res.status(204).send();
    }

    try {
        await bcClient.delete(`/v3/carts/${cartId}`);
    } catch (err) {
        // 404 means BC already removed it — that's fine
        if ((err as AxiosError).response?.status !== 404) {
            logger.error(`cart delete failed (cartId=${cartId}): ${(err as Error).message}`);
            return res.status(500).json({ error: 'Could not delete cart.' });
        }
    }

    clearCartId(req);
    return res.status(204).send();
});

export { router as cartRouter };
export default router;
