/**
 * Bulk-loads B2B companies from company_full.jsonl into BigCommerce B2B Edition.
 *
 * Usage:
 *   node scripts/load-b2b-companies.js
 *   node scripts/load-b2b-companies.js --dry-run        # parse + validate only, no API calls
 *   node scripts/load-b2b-companies.js --delay 500      # ms between requests (default: 300)
 *   node scripts/load-b2b-companies.js --start 10       # resume from line 10 (1-based)
 *
 * Results are written to scripts/load-b2b-companies-results.json when the run completes.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ────────────────────────────────────────────────────────────────────

const INPUT_FILE = path.resolve(__dirname, '../company_full.jsonl');
const RESULTS_FILE = path.resolve(__dirname, 'load-b2b-companies-results.json');

const API_URL = 'https://api-b2b.bigcommerce.com/api/v3/io/companies';
const HEADERS = {
    'content-type': 'application/json',
    'x-auth-token': 'r9m2ewevrcm1l4i184cf5uwz6hx5mbs',
    'x-store-hash': 'tb0nfpch8c',
};

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DELAY_MS = (() => {
    const idx = args.indexOf('--delay');
    return idx !== -1 ? parseInt(args[idx + 1], 10) : 300;
})();
const START_LINE = (() => {
    const idx = args.indexOf('--start');
    return idx !== -1 ? parseInt(args[idx + 1], 10) : 1;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function postCompany(payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const url = new URL(API_URL);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                ...HEADERS,
                'content-length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch (_) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const raw = fs.readFileSync(INPUT_FILE, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim() !== '');

    console.log(`Found ${lines.length} entries in ${path.basename(INPUT_FILE)}`);
    if (DRY_RUN) console.log('DRY RUN — no API calls will be made');
    if (START_LINE > 1) console.log(`Resuming from line ${START_LINE}`);
    console.log('');

    const results = { success: [], failed: [], skipped: [] };

    for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;

        if (lineNumber < START_LINE) {
            results.skipped.push({ line: lineNumber });
            continue;
        }

        let payload;
        try {
            payload = JSON.parse(lines[i]);
        } catch (err) {
            console.error(`[line ${lineNumber}] PARSE ERROR: ${err.message}`);
            results.failed.push({ line: lineNumber, error: `JSON parse error: ${err.message}` });
            continue;
        }

        const companyName = payload.companyName || '(unknown)';
        const accountNum = payload.extraFields?.find(f => f.fieldName === 'Account Number')?.fieldValue || '';

        if (DRY_RUN) {
            console.log(`[line ${lineNumber}] DRY-RUN  ${companyName} (${accountNum})`);
            results.success.push({ line: lineNumber, companyName, accountNum, dryRun: true });
            continue;
        }

        try {
            const { statusCode, body } = await postCompany(payload);
            const ok = statusCode >= 200 && statusCode < 300;
            const id = body?.data?.id || body?.id || null;

            if (ok) {
                console.log(`[line ${lineNumber}] OK  ${statusCode}  ${companyName} (${accountNum})  id=${id}`);
                results.success.push({ line: lineNumber, companyName, accountNum, statusCode, id });
            } else {
                const message = body?.message || body?.title || JSON.stringify(body);
                console.error(`[line ${lineNumber}] FAIL  ${statusCode}  ${companyName} (${accountNum})  ${message}`);
                results.failed.push({ line: lineNumber, companyName, accountNum, statusCode, error: message });
            }
        } catch (err) {
            console.error(`[line ${lineNumber}] ERROR  ${companyName} (${accountNum})  ${err.message}`);
            results.failed.push({ line: lineNumber, companyName, accountNum, error: err.message });
        }

        if (i < lines.length - 1) await sleep(DELAY_MS);
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    console.log('');
    console.log('─────────────────────────────────────');
    console.log(`Total  : ${lines.length}`);
    console.log(`Success: ${results.success.length}`);
    console.log(`Failed : ${results.failed.length}`);
    console.log(`Skipped: ${results.skipped.length}`);
    console.log('─────────────────────────────────────');

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`\nResults saved → ${RESULTS_FILE}`);

    if (results.failed.length > 0) {
        console.log('\nFailed entries:');
        results.failed.forEach(f => {
            console.log(`  line ${f.line}  ${f.companyName || ''}  ${f.error || ''}`);
        });
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
