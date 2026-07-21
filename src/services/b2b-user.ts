import axios from 'axios';
import b2bClient from './b2b';
import logger from '../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface B2BUserExtraField {
    fieldName: string;
    fieldValue: string;
}

/**
 * Minimal shape of a B2B user record as returned by GET /api/v3/io/users.
 * Only fields needed for identity + extra field management are included.
 * Note: the API returns `id` (not `userId`) and `phoneNumber` (not `phone`).
 */
export interface B2BUserRecord {
    id: number;
    customerId: number;
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    role?: number;
    companyId?: number;
    extraFields?: B2BUserExtraField[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a B2B user by email address, including extraFields.
 * The list endpoint (/users?email=) omits extraFields; a second GET /users/{id}
 * is required to retrieve them. Returns null on any API error or when not found.
 */
export async function fetchB2BUserByEmail(email: string): Promise<B2BUserRecord | null> {
    try {
        const listRes = await b2bClient.get<{ data: B2BUserRecord[] }>('/api/v3/io/users', {
            params: { email, limit: 1 },
        });
        const stub = listRes.data?.data?.[0];
        if (!stub) return null;

        const detailRes = await b2bClient.get<{ data: B2BUserRecord }>(`/api/v3/io/users/${stub.id}`);
        return detailRes.data?.data ?? stub;
    } catch (err) {
        logger.warn(`b2b-user: fetchByEmail ${email}: ${(err as Error).message}`);
        return null;
    }
}

/**
 * Build a key→value map from a B2B user's extra fields array for easy lookup.
 */
export function buildExtraFieldsMap(extraFields?: B2BUserExtraField[]): Record<string, string | undefined> {
    const map: Record<string, string | undefined> = Object.create(null);
    (extraFields ?? []).forEach(f => {
        map[f.fieldName] = f.fieldValue;
    });
    return map;
}

/**
 * Upsert a single extra field on a B2B user.
 * All existing extra fields are preserved; the target key is added or overwritten.
 * Uses PUT (full user replacement) as required by the B2B Edition API.
 */
export async function upsertB2BUserExtraField(user: B2BUserRecord, key: string, value: string): Promise<void> {
    const other = (user.extraFields ?? []).filter(f => f.fieldName !== key);
    try {
        await b2bClient.put(`/api/v3/io/users/${user.id}`, {
            customerId: user.customerId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            companyId: user.companyId,
            extraFields: [...other, { fieldName: key, fieldValue: value }],
        });
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logger.error(`b2b-user: PUT /users/${user.id} failed: status=${err.response?.status}`);
        }
        throw err;
    }
}

/**
 * Upsert multiple extra fields on a B2B user in a single PUT call.
 * All existing extra fields not in the `updates` map are preserved.
 */
export async function upsertB2BUserExtraFields(user: B2BUserRecord, updates: Record<string, string>): Promise<void> {
    const keysToUpdate = new Set(Object.keys(updates));
    const other = (user.extraFields ?? []).filter(f => !keysToUpdate.has(f.fieldName));
    const newFields: B2BUserExtraField[] = Object.entries(updates).map(([k, v]) => ({
        fieldName: k,
        fieldValue: v,
    }));
    try {
        await b2bClient.put(`/api/v3/io/users/${user.id}`, {
            customerId: user.customerId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            companyId: user.companyId,
            extraFields: [...other, ...newFields],
        });
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logger.error(
                `b2b-user: PUT /users/${user.id} failed: status=${err.response?.status} body=${JSON.stringify(err.response?.data)}`
            );
        }
        throw err;
    }
}
