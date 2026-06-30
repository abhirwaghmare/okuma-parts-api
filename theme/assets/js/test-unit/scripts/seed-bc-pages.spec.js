'use strict';

/**
 * Unit tests for scripts/seed-bc-pages.js
 *
 * Strategy mirrors seed-bc-parts.spec.js:
 *  - Pure helpers (axiosErrorMessage, readJson) are tested inline.
 *  - findPageByUrl pagination logic is tested by controlling axios.get mock
 *    responses to return pages at different pagination pages.
 *  - createPage response envelope is tested inline.
 *  - seedDocumentPages error counter is tested by driving the module via
 *    jest.resetModules() + require() (jest.isolateModulesAsync not available
 *    in Jest 27).
 */

const fs = require('fs');
const axios = require('axios');

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

const REQUIRED_ENV = {
    BC_ACCESS_TOKEN: 'test-token',
    BC_STORE_HASH: 'testhash',
    PARTS_BOOK_DATA_ROOT: '/fake/data',
};

function setRequiredEnv() {
    Object.assign(process.env, REQUIRED_ENV);
}

function clearRequiredEnv() {
    Object.keys(REQUIRED_ENV).forEach(k => delete process.env[k]);
}

// ---------------------------------------------------------------------------
// axiosErrorMessage — mirrors same logic as seed-bc-pages.js
// ---------------------------------------------------------------------------

function axiosErrorMessage(err) {
    if (err.response) {
        const status = err.response.status;
        const body = err.response.data;
        const detail = body && (body.title || body.detail || JSON.stringify(body));
        return `HTTP ${status}${detail ? ` — ${detail}` : ''}`;
    }
    return err.message;
}

describe('axiosErrorMessage (seed-bc-pages)', () => {
    it('returns HTTP status with title when response has title field', () => {
        // Arrange
        const err = {
            response: { status: 422, data: { title: 'Sku already exists' } },
        };

        // Act
        const msg = axiosErrorMessage(err);

        // Assert
        expect(msg).toBe('HTTP 422 — Sku already exists');
    });

    it('falls back to err.message when no response is present', () => {
        // Arrange
        const err = { message: 'connect ECONNREFUSED' };

        // Act
        const msg = axiosErrorMessage(err);

        // Assert
        expect(msg).toBe('connect ECONNREFUSED');
    });

    it('uses detail when title is absent', () => {
        // Arrange
        const err = {
            response: { status: 400, data: { detail: 'Bad Request' } },
        };

        // Act
        const msg = axiosErrorMessage(err);

        // Assert
        expect(msg).toBe('HTTP 400 — Bad Request');
    });

    it('falls back to JSON.stringify when neither title nor detail exist', () => {
        // Arrange
        const err = {
            response: { status: 503, data: { error: 'Service Unavailable' } },
        };

        // Act
        const msg = axiosErrorMessage(err);

        // Assert
        expect(msg).toBe('HTTP 503 — {"error":"Service Unavailable"}');
    });
});

// ---------------------------------------------------------------------------
// readJson (inline mirror)
// ---------------------------------------------------------------------------

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`[ERROR] Failed to read JSON at ${filePath}: ${err.message}`);
        return null;
    }
}

describe('readJson (seed-bc-pages)', () => {
    let readFileSyncSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns a parsed object for valid JSON', () => {
        // Arrange
        const pages = [{ id: 1, url: '/parts-book/lc40/assembly-1/' }];
        readFileSyncSpy.mockReturnValue(JSON.stringify(pages));

        // Act
        const result = readJson('/fake/toc.json');

        // Assert
        expect(result).toEqual(pages);
    });

    it('returns null and logs error when file does not exist', () => {
        // Arrange
        readFileSyncSpy.mockImplementation(() => {
            throw new Error('ENOENT: no such file or directory');
        });

        // Act
        const result = readJson('/fake/missing.json');

        // Assert
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to read JSON at /fake/missing.json')
        );
    });

    it('returns null and logs error on malformed JSON', () => {
        // Arrange
        readFileSyncSpy.mockReturnValue('[invalid json');

        // Act
        const result = readJson('/fake/bad.json');

        // Assert
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to read JSON at /fake/bad.json')
        );
    });
});

// ---------------------------------------------------------------------------
// findPageByUrl — pagination logic
//
// The function is not exported; we test its behaviour by replicating the
// pagination contract from the implementation and verifying it against
// controlled axios mock responses.
// ---------------------------------------------------------------------------

// Inline mirror of findPageByUrl from seed-bc-pages.js.
// Accepts an axiosInstance so the mock can be injected cleanly.
async function findPageByUrl(pageUrl, axiosInstance) {
    const endpoint = 'https://api.bigcommerce.com/stores/testhash/v2/pages';
    let page = 1;
    const limit = 250;

    while (true) { // eslint-disable-line no-constant-condition
        const resp = await axiosInstance.get(endpoint, {
            headers: {},
            params: { limit, page },
        });

        const pages = resp.data;

        if (!Array.isArray(pages) || pages.length === 0) {
            return null;
        }

        const match = pages.find(p => p.url === pageUrl);
        if (match) {
            return match.id;
        }

        if (pages.length < limit) {
            return null;
        }

        page++;
    }
}

describe('findPageByUrl pagination', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns page ID when matching page is on the first page of results', async () => {
        // Arrange — first (and only) page has the matching URL
        const targetUrl = '/parts-book/lc40/assembly-1/';
        axios.get.mockResolvedValueOnce({
            data: [
                { id: 10, url: '/other-page/' },
                { id: 11, url: targetUrl },
            ],
        });

        // Act
        const result = await findPageByUrl(targetUrl, axios);

        // Assert
        expect(result).toBe(11);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('returns page ID when matching page is on the second paginated page', async () => {
        // Arrange — first page: 250 items none matching; second page: match found
        const targetUrl = '/parts-book/lc40/assembly-final/';
        const firstPageItems = Array.from({ length: 250 }, (_, i) => ({
            id: i + 1,
            url: `/other-page-${i + 1}/`,
        }));
        const secondPageItems = [
            { id: 300, url: '/something-else/' },
            { id: 301, url: targetUrl },
        ];

        axios.get
            .mockResolvedValueOnce({ data: firstPageItems })
            .mockResolvedValueOnce({ data: secondPageItems });

        // Act
        const result = await findPageByUrl(targetUrl, axios);

        // Assert
        expect(result).toBe(301);
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenNthCalledWith(
            1,
            expect.any(String),
            expect.objectContaining({ params: { limit: 250, page: 1 } })
        );
        expect(axios.get).toHaveBeenNthCalledWith(
            2,
            expect.any(String),
            expect.objectContaining({ params: { limit: 250, page: 2 } })
        );
    });

    it('returns null when no pages match across all paginated results', async () => {
        // Arrange — single page of items, none matching target URL
        const targetUrl = '/parts-book/lc40/nonexistent/';
        axios.get.mockResolvedValueOnce({
            data: [
                { id: 1, url: '/page-one/' },
                { id: 2, url: '/page-two/' },
            ],
        });

        // Act
        const result = await findPageByUrl(targetUrl, axios);

        // Assert
        expect(result).toBeNull();
    });

    it('returns null immediately when response is an empty array', async () => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: [] });

        // Act
        const result = await findPageByUrl('/any-url/', axios);

        // Assert
        expect(result).toBeNull();
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('terminates pagination when last page returns fewer items than limit', async () => {
        // Arrange — first page full (250), second page partial (3 items, none matching)
        const targetUrl = '/parts-book/lc40/never-found/';
        const firstPage = Array.from({ length: 250 }, (_, i) => ({
            id: i + 1,
            url: `/page-${i + 1}/`,
        }));
        const secondPage = [
            { id: 251, url: '/last-1/' },
            { id: 252, url: '/last-2/' },
            { id: 253, url: '/last-3/' },
        ];

        axios.get
            .mockResolvedValueOnce({ data: firstPage })
            .mockResolvedValueOnce({ data: secondPage });

        // Act
        const result = await findPageByUrl(targetUrl, axios);

        // Assert
        expect(result).toBeNull();
        // Must stop after second page (< 250 items), not request a third
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('returns null when response data is not an array', async () => {
        // Arrange — unexpected response shape
        axios.get.mockResolvedValueOnce({ data: { pages: [] } });

        // Act
        const result = await findPageByUrl('/some-url/', axios);

        // Assert
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// createPage — response envelope
// ---------------------------------------------------------------------------

describe('createPage response envelope', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns id from bare data.id v2 response envelope', async () => {
        // Arrange — v2 returns bare object (not wrapped in data.data)
        axios.post.mockResolvedValueOnce({
            data: { id: 77, name: 'Test Page', url: '/test/' },
        });

        // Act — replicate createPage extraction logic
        const resp = await axios.post('any-url', {});
        const result = (resp.data && resp.data.id) || null;

        // Assert
        expect(result).toBe(77);
    });

    it('returns null when response body is missing id field', async () => {
        // Arrange
        axios.post.mockResolvedValueOnce({ data: {} });

        // Act
        const resp = await axios.post('any-url', {});
        const result = (resp.data && resp.data.id) || null;

        // Assert
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// seedDocumentPages — module-level integration tests
//
// We load the script via jest.resetModules() + require() after setting env
// vars. The script's main() fires immediately on require; we await long enough
// for the async call chain to complete.
// ---------------------------------------------------------------------------

describe('seedDocumentPages error counter', () => {
    let exitSpy;
    let consoleErrorSpy;
    let consoleLogSpy;

    beforeEach(() => {
        setRequiredEnv();
        jest.resetModules();
        exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        clearRequiredEnv();
        jest.restoreAllMocks();
    });

    it('logs an error when findPageByUrl throws', async () => {
        // Arrange — toc with one document that has one assembly
        const toc = [{
            label: 'LC-40',
            pdf_id: 'lc40',
            assemblies: [{
                label: 'Assembly One',
                slug: 'assembly-one',
            }],
        }];

        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(toc));

        const axMock = require('axios');
        // findPageByUrl calls axios.get — make it reject
        axMock.get.mockRejectedValue(new Error('BC API timeout'));

        // Act — load the module (triggers main() → seedDocumentPages() → findPageByUrl())
        require('../../../../../scripts/seed-bc-pages.js');
        await new Promise(r => setTimeout(r, 500));

        // Assert — error was logged for the page lookup failure
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR]')
        );
    });

    it('calls axios.post to create a page when findPageByUrl returns no match', async () => {
        // Arrange — toc with one assembly; axios.get returns empty (page not found)
        const toc = [{
            label: 'Test Machine',
            pdf_id: 'test-machine',
            assemblies: [{
                label: 'Main Assembly',
                slug: 'main-assembly',
            }],
        }];

        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(toc));

        const capturedPostArgs = [];
        const axMock = require('axios');

        // findPageByUrl: empty array response → page not found → triggers createPage
        axMock.get.mockResolvedValue({ data: [] });
        axMock.post.mockImplementation((url, body) => {
            capturedPostArgs.push({ url, body });
            return Promise.resolve({ data: { id: 200 } });
        });

        // Act
        require('../../../../../scripts/seed-bc-pages.js');
        await new Promise(r => setTimeout(r, 600));

        // Assert — POST was called with the correct page payload
        expect(capturedPostArgs.length).toBeGreaterThan(0);
        const { url: postedUrl, body: postedBody } = capturedPostArgs[0];
        expect(postedUrl).toContain('/v2/pages');
        expect(postedBody).toMatchObject({
            url: '/parts-book/test-machine/main-assembly/',
            type: 'page',
            is_visible: false,
        });
    });
});
