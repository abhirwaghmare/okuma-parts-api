import b2bClient from './b2b';
import logger from '../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface B2BCompany {
    companyId: number;
    companyName: string;
    companyEmail: string;
    bcGroupName?: string;
    parentCompany: {
        id: number | null;
        name: string;
    };
}

export interface B2BCompanyUser {
    id: number;
    email: string;
    customerId: number; // BC customer ID
    companyId: number;
    companyRoleName?: string; // e.g. 'Admin', 'Senior Buyer', 'Junior Buyer'
}

export interface B2BPage<T> {
    data: T[];
    meta?: {
        pagination?: {
            totalCount?: number;
            offset?: number;
            limit?: number;
        };
    };
}

export const B2B_PAGE_LIMIT = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collects all pages from a paginated B2B endpoint.
 * Iterative (not recursive) so page count can't overflow the call stack —
 * pagination is inherently sequential (offset N+1 depends on page N's length).
 */
export async function collectPages<T>(fetcher: (off: number) => Promise<T[]>): Promise<T[]> {
    const acc: T[] = [];
    let offset = 0;
    for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const page = await fetcher(offset);
        acc.push(...page);
        if (page.length < B2B_PAGE_LIMIT) break;
        offset += B2B_PAGE_LIMIT;
    }
    return acc;
}

/**
 * Find a dealer's B2B company ID by looking up their B2B user via email.
 *
 * B2B API: GET /api/v3/io/users?email={email}
 * The returned user object contains `companyId` which is the dealer's B2B company.
 */
export async function fetchB2BCompanyIdByEmail(email: string): Promise<number | null> {
    try {
        const res = await b2bClient.get<B2BPage<B2BCompanyUser>>('/api/v3/io/users', {
            params: { email, limit: 1 },
        });
        const user = res.data?.data?.[0] ?? null;
        return user ? user.companyId : null;
    } catch (err) {
        logger.error(`b2b-hierarchy: user lookup by email ${email} failed: ${(err as Error).message}`);
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
export async function fetchB2BSubsidiaries(dealerCompanyId: number): Promise<B2BCompany[]> {
    const all = await collectPages(async off => {
        try {
            const res = await b2bClient.get<B2BPage<B2BCompany>>('/api/v3/io/companies', {
                params: { limit: B2B_PAGE_LIMIT, offset: off },
            });
            return res.data?.data ?? [];
        } catch (err) {
            logger.error(`b2b-hierarchy: companies fetch failed: ${(err as Error).message}`);
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
export async function fetchB2BCompanyUsers(companyId: number): Promise<B2BCompanyUser[]> {
    return collectPages(async off => {
        try {
            const res = await b2bClient.get<B2BPage<B2BCompanyUser>>('/api/v3/io/users', {
                params: { companyId, limit: B2B_PAGE_LIMIT, offset: off },
            });
            return res.data?.data ?? [];
        } catch (err) {
            logger.error(`b2b-hierarchy: users fetch for company ${companyId} failed: ${(err as Error).message}`);
            throw err;
        }
    });
}
