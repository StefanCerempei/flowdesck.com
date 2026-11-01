import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getDashboardSummary = async (req, res) => {
    try {
        const tenantId = req.user.companyId;

        const totalContacts = await prisma.contact.count({ where: { tenantId } });
        const activeClients = await prisma.contact.count({ where: { tenantId, status: 'ACTIVE' } });
        const leads = await prisma.contact.count({ where: { tenantId, status: 'LEAD' } });

        const tasks = await prisma.task.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });

        // Preluăm facturile pentru a calcula veniturile reale
        const invoices = await prisma.invoice.findMany({ where: { tenantId } });

        const paidInvoices = invoices.filter(inv => inv.status === 'PAID');
        const monthlyRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const unpaidCount = invoices.filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE').length;

        res.status(200).json({
            stats: {
                activeClients,
                totalContacts,
                monthlyRevenue,
                unpaidInvoices: unpaidCount
            },
            salesPipeline: {
                leads,
                active: activeClients
            },
            tasks
        });
    } catch (error) {
        console.error('Eroare la preluarea datelor pentru dashboard:', error);
        res.status(500).json({ eroare: 'Eroare la server.' });
    }
};