import { Router } from 'express';
import bcClient from '../services/bigcommerce';
import fetchCustomerProfile from '../services/customerProfile';
import { fetchB2BUserByEmail, buildExtraFieldsMap } from '../services/b2b-user';
import logger from '../config/logger';

const router = Router();

interface BcMetafield {
    key: string;
    namespace: string;
    value: string;
}

router.get('/api/customer/:customerId/profile', async (req, res) => {
    const { customerId } = req.params;

    if (!customerId || !/^\d+$/.test(customerId)) {
        return res.status(400).json({ error: 'Invalid customerId.' });
    }

    // TODO: add auth guard once session population is confirmed (req.session.customerId === customerId)

    try {
        const [customer] = await Promise.all([
            fetchCustomerProfile(customerId),
            bcClient.get<{ data: BcMetafield[] }>(`/v3/customers/${customerId}/metafields`),
        ]);

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found.' });
        }

        // Fetch job_title from B2B user extra fields (requires email from customer record)
        const b2bUser = await fetchB2BUserByEmail(customer.email);
        const extraFieldsMap = buildExtraFieldsMap(b2bUser?.extraFields);

        return res.json({
            firstName: customer.first_name,
            lastName: customer.last_name,
            email: customer.email,
            phone: customer.phone || null,
            company: customer.company || null,
            jobTitle: extraFieldsMap.job_title ?? null,
        });
    } catch (err) {
        logger.error(`customer ${customerId}: profile fetch failed: ${(err as Error).message}`);
        return res.status(500).json({ error: 'Could not load customer profile.' });
    }
});

export default router;
