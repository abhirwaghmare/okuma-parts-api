import bcClient from './bigcommerce';
import logger from '../config/logger';

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — customer_group_id changes rarely

export interface BcCustomer {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    company: string;
    phone: string;
    customer_group_id: number | null;
}

interface ProfileCacheEntry {
    data: BcCustomer | null;
    expiresAt: number;
}

const profileCache = new Map<string, ProfileCacheEntry>();

/**
 * Fetch a BC customer's profile (including customer_group_id) by BC customer ID.
 * BC OOTB: GET /v3/customers?id:in=:customerId
 * Cached per customerId for PROFILE_CACHE_TTL_MS to avoid re-fetching on repeated calls
 * (e.g. successive searches by the same dealer in a session).
 */
export default async function fetchCustomerProfile(customerId: string): Promise<BcCustomer | null> {
    const cached = profileCache.get(customerId);
    if (cached) {
        if (Date.now() < cached.expiresAt) return cached.data;
        profileCache.delete(customerId);
    }

    try {
        const res = await bcClient.get<{ data: BcCustomer[] }>('/v3/customers', {
            params: { 'id:in': customerId },
        });
        const profile = res.data?.data?.[0] ?? null;
        profileCache.set(customerId, { data: profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
        return profile;
    } catch (err) {
        logger.warn(`fetchCustomerProfile ${customerId}: ${(err as Error).message}`);
        return null;
    }
}
