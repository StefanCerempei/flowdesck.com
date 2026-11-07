import { prisma } from '../../lib/prisma.js';

export async function activity(tenantId) {
    const end = new Date();
    end.setUTCHours(24,0,0,0);
    const week = 7 * 86400000;
    const start = new Date(end.getTime() - 4 * week);
    const invoices = await prisma.invoice.findMany({
        where: {tenantId, status:'PAID', createdAt:{gte:start, lt:end}},
        select:{amount:true, createdAt:true}
    });
    const weeks = Array.from({length:4}, (_, i) => ({
        start:new Date(start.getTime()+i*week).toISOString().slice(0,10), amount:0
    }));
    for (const invoice of invoices) weeks[Math.floor((invoice.createdAt-start)/week)].amount += invoice.amount;
    const overdue = await prisma.invoice.count({where:{tenantId, status:'OVERDUE'}});
    return {weeks, overdue};
}
