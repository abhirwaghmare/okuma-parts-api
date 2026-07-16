import { Router, Request, Response } from 'express';
import b2bClient from '../../services/b2b';
import logger from '../../config/logger';

const router = Router();

interface B2BAddress {
    addressId: number;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    zipCode: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    stateName: string;
    countryName: string;
    stateCode: string;
    countryCode: string;
    companyId: string;
    isBilling: boolean;
    isShipping: boolean;
    isDefaultBilling: boolean;
    isDefaultShipping: boolean;
    label: string;
    externalId: string;
    createdAt: number;
    updatedAt: number;
}

interface B2BAddressesResponse {
    code: number;
    data: B2BAddress[];
    meta: {
        pagination: { totalCount: number; offset: number; limit: number };
        message: string;
    };
}

// GET /v1/api/addresses?companyId=13675067&limit=10&page=1
router.get('/addresses', async (req: Request, res: Response) => {
    try {
        const companyIdRaw = req.query.companyId as string | undefined;
        const limitRaw = Number(req.query.limit);
        const pageRaw = Number(req.query.page);

        if (!companyIdRaw || !/^\d+$/.test(companyIdRaw)) {
            return res.status(400).json({ error: 'companyId must be a positive integer' });
        }

        const companyId = Number(companyIdRaw);
        const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 250) : 50;
        const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
        const offset = (page - 1) * limit;

        const b2bRes = await b2bClient.get<B2BAddressesResponse>('/api/v3/io/addresses', {
            params: { companyId, limit, offset },
        });

        const list: B2BAddress[] = b2bRes.data?.data ?? [];
        const b2bPagination = b2bRes.data?.meta?.pagination;
        const totalCount = b2bPagination?.totalCount ?? list.length;
        const totalPages = Math.ceil(totalCount / limit) || 1;

        const addresses = list.map(a => ({
            addressId: a.addressId,
            label: a.label || null,
            firstName: a.firstName,
            lastName: a.lastName,
            phoneNumber: a.phoneNumber || null,
            addressLine1: a.addressLine1,
            addressLine2: a.addressLine2 || null,
            city: a.city,
            state: a.stateName,
            stateCode: a.stateCode,
            zip: a.zipCode,
            country: a.countryName,
            countryCode: a.countryCode,
            isBilling: a.isBilling,
            isShipping: a.isShipping,
            isDefaultBilling: a.isDefaultBilling,
            isDefaultShipping: a.isDefaultShipping,
            externalId: a.externalId || null,
        }));

        res.json({
            pagination: { total: totalCount, perPage: limit, currentPage: page, totalPages, offset },
            data: addresses,
        });
    } catch (err) {
        logger.error(`Addresses error: ${(err as Error).message}`);
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
});

export default router;
