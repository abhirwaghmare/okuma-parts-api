import { Router } from 'express';
import bcClient from '../services/bigcommerce';

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
        const metaRes = await bcClient.get<{ data: BcMetafield[] }>(`/v3/customers/${customerId}/metafields`);

        const okumaMeta = (metaRes.data?.data ?? []).filter(m => m.namespace === 'okuma');
        const getValue = (key: string): string | null => okumaMeta.find(m => m.key === key)?.value ?? null;

        return res.json({
            jobTitle: getValue('job_title'),
        });
    } catch (err) {
        console.error(`customer ${customerId}: profile metafield lookup failed:`, (err as Error).message);
        return res.status(500).json({ error: 'Could not load customer profile.' });
    }
});

export default router;
