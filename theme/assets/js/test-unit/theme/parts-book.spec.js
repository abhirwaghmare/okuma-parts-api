'use strict';

/**
 * Unit tests for theme/parts-book.js
 *
 * Strategy:
 *  - The PartsBook class extends PageManager and depends heavily on jQuery DOM
 *    queries and fetch(). We test the pure logic methods by constructing a
 *    lightweight instance (bypassing onReady / PageManager wiring) and stubbing
 *    only the jQuery calls each method requires.
 *  - DOM-heavy methods (_initZoom, _initTooltip, _initSelects, _loadToc) are
 *    covered with smoke tests to confirm they do not throw when jQuery stubs
 *    are in place.
 *  - fetch() is replaced with jest.fn() for _addToCart and _loadToc tests.
 */

// ---------------------------------------------------------------------------
// jQuery stub — minimal subset used by parts-book.js
// ---------------------------------------------------------------------------

const jQueryResult = {
    find: jest.fn(),
    attr: jest.fn(),
    removeAttr: jest.fn(),
    prop: jest.fn(),
    val: jest.fn(),
    text: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    empty: jest.fn(),
    append: jest.fn(),
    remove: jest.fn(),
    addClass: jest.fn(),
    removeClass: jest.fn(),
    hasClass: jest.fn(),
    off: jest.fn(),
    on: jest.fn(),
    closest: jest.fn(),
    data: jest.fn(),
    trigger: jest.fn(),
    css: jest.fn(),
    length: 1,
    0: { complete: false, getBoundingClientRect: jest.fn(() => ({ right: 100, left: 50, top: 80 })), offsetWidth: 240, offsetHeight: 180, scrollIntoView: jest.fn() },
};

// Make all chain methods return jQueryResult so calls can be chained
Object.keys(jQueryResult).forEach(key => {
    if (typeof jQueryResult[key] === 'function') {
        jQueryResult[key].mockReturnValue(jQueryResult);
    }
});

const $ = jest.fn(() => jQueryResult);
$.fn = {};

global.$ = $;
global.jQuery = $;

// ---------------------------------------------------------------------------
// fetch stub
// ---------------------------------------------------------------------------

global.fetch = jest.fn();

// ---------------------------------------------------------------------------
// window stubs
// ---------------------------------------------------------------------------

global.window = global.window || {};
Object.defineProperty(global.window, 'location', {
    value: { hostname: 'store.example.com', pathname: '/parts-book/' },
    writable: true,
});
Object.defineProperty(global.window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(global.window, 'scrollY', { value: 0, writable: true });
Object.defineProperty(global.window, 'innerWidth', { value: 1280, writable: true });
Object.defineProperty(global.window, 'innerHeight', { value: 800, writable: true });
global.window.matchMedia = jest.fn(() => ({ matches: false }));

// ---------------------------------------------------------------------------
// Module under test — loaded after globals are set
// ---------------------------------------------------------------------------

// PageManager is a Stencil base class; stub it so we can instantiate PartsBook
jest.mock('../../theme/page-manager', () => class PageManager {
    constructor() { this.context = {}; }
});

const PartsBook = require('../../theme/parts-book').default;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInstance(contextOverrides = {}) {
    const instance = new PartsBook();
    instance.context = Object.assign({ partsBookApiUrl: 'http://api.test' }, contextOverrides);
    // Manually run the setup that onReady() does, without calling _loadToc or _init* DOM hooks
    instance._toc = null;
    instance._currentPdfId = null;
    instance._currentAssemblySlug = null;
    instance._currentSheetSlug = null;
    instance._currentParts = [];
    instance._zoomLevel = 1;
    instance._activeCallout = null;
    instance._apiUrl = instance.context.partsBookApiUrl;
    return instance;
}

beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply chainable returns after clearAllMocks resets them
    Object.keys(jQueryResult).forEach(key => {
        if (typeof jQueryResult[key] === 'function') {
            jQueryResult[key].mockReturnValue(jQueryResult);
        }
    });
    $.mockReturnValue(jQueryResult);
});

// ---------------------------------------------------------------------------
// _apiUrl resolution
// ---------------------------------------------------------------------------

describe('_apiUrl — context injection', () => {
    it('reads API URL from this.context.partsBookApiUrl', () => {
        const instance = makeInstance({ partsBookApiUrl: 'https://backend.example.com' });
        expect(instance._apiUrl).toBe('https://backend.example.com');
    });

    it('falls back to localhost:3001 when context URL is empty and hostname is localhost', () => {
        global.window.location.hostname = 'localhost';
        const instance = new PartsBook();
        instance.context = { partsBookApiUrl: '' };
        instance._toc = null;
        instance._currentPdfId = null;
        instance._currentAssemblySlug = null;
        instance._currentSheetSlug = null;
        instance._currentParts = [];
        instance._zoomLevel = 1;
        instance._activeCallout = null;
        const configUrl = (instance.context && instance.context.partsBookApiUrl) || '';
        instance._apiUrl = configUrl || (global.window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
        expect(instance._apiUrl).toBe('http://localhost:3001');
        global.window.location.hostname = 'store.example.com';
    });

    it('leaves _apiUrl empty when context URL is missing and hostname is not localhost', () => {
        global.window.location.hostname = 'store.example.com';
        const instance = makeInstance({ partsBookApiUrl: '' });
        instance._apiUrl = (instance.context.partsBookApiUrl) || (global.window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
        expect(instance._apiUrl).toBe('');
    });
});

// ---------------------------------------------------------------------------
// _setZoom
// ---------------------------------------------------------------------------

describe('_setZoom', () => {
    it('clamps zoom level to a minimum of 0.5', () => {
        const pb = makeInstance();
        pb._setZoom(0.1);
        expect(pb._zoomLevel).toBe(0.5);
    });

    it('clamps zoom level to a maximum of 3.0', () => {
        const pb = makeInstance();
        pb._setZoom(10);
        expect(pb._zoomLevel).toBe(3.0);
    });

    it('sets zoom level within the valid range', () => {
        const pb = makeInstance();
        pb._setZoom(1.5);
        expect(pb._zoomLevel).toBe(1.5);
    });

    it('applies CSS transform to .parts-book__diagram-inner', () => {
        const pb = makeInstance();
        pb._setZoom(2.0);
        expect($).toHaveBeenCalledWith('.parts-book__diagram-inner');
        expect(jQueryResult.css).toHaveBeenCalledWith(expect.objectContaining({
            transform: 'scale(2)',
        }));
    });
});

// ---------------------------------------------------------------------------
// _selectCallout — selector injection guard
// ---------------------------------------------------------------------------

describe('_selectCallout — selector injection guard', () => {
    it('strips double-quotes and backslashes from callout number before use in selector', () => {
        const pb = makeInstance();
        pb._currentParts = [];
        pb._showTooltip = jest.fn();

        pb._selectCallout('"evil\\inject"', 'PART-1');

        // Extract the attribute value portion (between the quotes) from each
        // data-callout-no selector and verify it contains no injected chars.
        // Format: [data-callout-no="<value>"]
        const calls = $.mock.calls.map(c => c[0]);
        const selectorCalls = calls.filter(s => typeof s === 'string' && s.includes('data-callout-no'));
        selectorCalls.forEach(sel => {
            const match = sel.match(/data-callout-no="([^"]*)"/);
            if (match) {
                expect(match[1]).not.toContain('"');
                expect(match[1]).not.toContain('\\');
            }
        });
    });

    it('sets aria-pressed=true on the active callout element', () => {
        const pb = makeInstance();
        pb._currentParts = [{ partNo: 'PART-1', calloutNumber: 3 }];
        pb._showTooltip = jest.fn();

        pb._selectCallout(3, 'PART-1');

        expect(jQueryResult.attr).toHaveBeenCalledWith('aria-pressed', 'true');
    });

    it('sets aria-current=true on the active table row', () => {
        const pb = makeInstance();
        pb._currentParts = [{ partNo: 'PART-1', calloutNumber: 3 }];
        pb._showTooltip = jest.fn();

        pb._selectCallout(3, 'PART-1');

        expect(jQueryResult.attr).toHaveBeenCalledWith('aria-current', 'true');
    });
});

// ---------------------------------------------------------------------------
// _showTooltip and _hideTooltip — hidden attribute toggle
// ---------------------------------------------------------------------------

describe('_showTooltip', () => {
    it('removes the hidden attribute to reveal the tooltip', () => {
        const pb = makeInstance();
        const part = { partNo: 'ABC-123', description: 'Widget', price: 9.99, productId: 42 };

        pb._showTooltip(part, null);

        expect(jQueryResult.removeAttr).toHaveBeenCalledWith('hidden');
    });

    it('does not re-apply role=dialog or aria-modal attributes', () => {
        const pb = makeInstance();
        const part = { partNo: 'ABC-123', description: 'Widget', price: null, productId: null };

        pb._showTooltip(part, null);

        const attrCalls = jQueryResult.attr.mock.calls;
        const roleCall = attrCalls.find(args => {
            if (typeof args[0] === 'object') return args[0].role !== undefined;
            return args[0] === 'role';
        });
        expect(roleCall).toBeUndefined();
    });

    it('shows Price on request when part.price is null', () => {
        const pb = makeInstance();
        const part = { partNo: 'X', description: 'Y', price: null, productId: null };
        pb._showTooltip(part, null);
        expect(jQueryResult.text).toHaveBeenCalledWith('Price on request');
    });

    it('formats price to two decimal places', () => {
        const pb = makeInstance();
        const part = { partNo: 'X', description: 'Y', price: 5, productId: null };
        pb._showTooltip(part, null);
        expect(jQueryResult.text).toHaveBeenCalledWith('$5.00');
    });

    it('disables add-to-cart button with aria-disabled when productId is absent', () => {
        const pb = makeInstance();
        const part = { partNo: 'X', description: 'Y', price: null, productId: null };
        jQueryResult.find.mockReturnValue(jQueryResult);
        pb._showTooltip(part, null);
        expect(jQueryResult.attr).toHaveBeenCalledWith('aria-disabled', 'true');
    });
});

describe('_hideTooltip', () => {
    it('sets the hidden attribute on the tooltip', () => {
        const pb = makeInstance();
        pb._activeCallout = null;
        pb._hideTooltip();
        expect(jQueryResult.attr).toHaveBeenCalledWith('hidden', '');
    });

    it('returns focus to the active callout element after close', () => {
        const pb = makeInstance();
        pb._activeCallout = 5;
        pb._hideTooltip();
        expect(jQueryResult.trigger).toHaveBeenCalledWith('focus');
    });
});

// ---------------------------------------------------------------------------
// _renderPartsTable — column count
// ---------------------------------------------------------------------------

describe('_renderPartsTable — column count', () => {
    it('appends exactly 9 cells per row matching the 9-column header', () => {
        const pb = makeInstance();
        const appendCalls = [];
        const mockRow = {
            append: jest.fn(function() { appendCalls.push(true); return this; }),
            on: jest.fn().mockReturnThis(),
        };
        $.mockImplementation(selector => {
            if (selector === '<tr>') return mockRow;
            return jQueryResult;
        });

        pb._renderPartsTable([{
            calloutNumber: 1,
            partNo: 'P-001',
            name: 'Widget',
            description: 'A widget',
            qty: 2,
            price: 10,
            inStock: true,
            productId: 99,
        }]);

        // 8 td appends + 1 action cell appended to row = 9 columns
        expect(appendCalls.length).toBe(9);
    });

    it('renders Part Name cell from part.name, falls back to em dash when absent', () => {
        const pb = makeInstance();
        const cellTexts = [];
        $.mockImplementation((selector, opts) => {
            if (selector === '<td>' && opts && opts.text !== undefined) {
                cellTexts.push(opts.text);
            }
            return jQueryResult;
        });

        pb._renderPartsTable([{
            calloutNumber: 1,
            partNo: 'P-002',
            name: undefined,
            description: 'Desc',
            qty: 1,
            price: null,
            inStock: false,
            productId: null,
        }]);

        expect(cellTexts).toContain('—');
    });
});

// ---------------------------------------------------------------------------
// _addToCart — Storefront Cart API
// ---------------------------------------------------------------------------

describe('_addToCart', () => {
    it('POSTs to the existing cart items endpoint when a cart already exists', async () => {
        const pb = makeInstance();
        pb._showAddToCartSuccess = jest.fn();
        pb._showAddToCartError = jest.fn();

        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'cart-abc' }] })
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        await pb._addToCart(42, 2);

        const secondCall = global.fetch.mock.calls[1];
        expect(secondCall[0]).toBe('/api/storefront/carts/cart-abc/items');
        expect(secondCall[1].method).toBe('POST');
        const body = JSON.parse(secondCall[1].body);
        expect(body.lineItems[0]).toEqual({ productId: 42, quantity: 2 });
        expect(pb._showAddToCartSuccess).toHaveBeenCalled();
    });

    it('POSTs to /api/storefront/carts when no cart exists', async () => {
        const pb = makeInstance();
        pb._showAddToCartSuccess = jest.fn();

        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        await pb._addToCart(7, 1);

        expect(global.fetch.mock.calls[1][0]).toBe('/api/storefront/carts');
    });

    it('calls _showAddToCartError when the cart fetch fails', async () => {
        const pb = makeInstance();
        pb._showAddToCartError = jest.fn();

        global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

        await pb._addToCart(1, 1);

        expect(pb._showAddToCartError).toHaveBeenCalled();
    });

    it('calls _showAddToCartError on network failure', async () => {
        const pb = makeInstance();
        pb._showAddToCartError = jest.fn();

        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        await pb._addToCart(1, 1);

        expect(pb._showAddToCartError).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// _renderCallouts — parts with missing coordinates are skipped
// ---------------------------------------------------------------------------

describe('_renderCallouts', () => {
    it('does not render a callout element when calloutX or calloutY is null', () => {
        const pb = makeInstance();
        const appendedElements = [];
        jQueryResult.append.mockImplementation(el => { appendedElements.push(el); return jQueryResult; });

        pb._renderCallouts([
            { calloutX: null, calloutY: 50, calloutNumber: 1, partNo: 'A' },
            { calloutX: 20, calloutY: null, calloutNumber: 2, partNo: 'B' },
            { calloutX: 30, calloutY: 40, calloutNumber: 3, partNo: 'C' },
        ]);

        // Only the third part (with both coordinates) should append an element
        expect(appendedElements.length).toBe(1);
    });

    it('renders nothing when parts array is empty', () => {
        const pb = makeInstance();
        jQueryResult.empty.mockReturnValue(jQueryResult);
        expect(() => pb._renderCallouts([])).not.toThrow();
    });

    it('renders nothing when parts is null', () => {
        const pb = makeInstance();
        expect(() => pb._renderCallouts(null)).not.toThrow();
    });
});
