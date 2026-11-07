import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { prisma } from '../src/lib/prisma.js';

const email = 'demo@termofix.example';
const password = process.env.DEMO_PASSWORD || randomBytes(15).toString('base64url');
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const daysAgo = days => new Date(today.getTime() - days * 86400000);
try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log('Contul demo există deja.');
    } else {
        const hash = await bcrypt.hash(password, 10);
        await prisma.$transaction(async tx => {
            const company = await tx.company.create({ data: {
                name: 'TermoFix · companie simulată', createdAt: daysAgo(32),
                users: { create: { email, password: hash, role: 'SUPER_ADMIN' } }
            } });
            for (let i = 0; i < 32; i++) {
                const at = daysAgo(31 - i);
                const active = i % 4 !== 3;
                const service = ['revizie centrală', 'instalare radiator', 'reparație pompă', 'ofertă mentenanță'][i % 4];
                const contact = await tx.contact.create({ data: {
                    tenantId: company.id, createdAt: at, firstName: ['Ana','Mihai','Elena','Dan'][i%4],
                    lastName: ['Dima','Luca','Marin','Stan','Ene','Matei','Popa','Radu'][Math.floor(i/4)],
                    notes: 'Solicitare pentru ' + service, source: i % 2 ? 'Recomandare' : 'Google',
                    potentialValue: 250 + 10*i, status: active ? 'ACTIVE' : 'LEAD'
                } });
                if (active) await tx.invoice.create({ data: {
                    tenantId: company.id, contactId: contact.id, createdAt: at, invoiceNumber: 'TF-' + (101+i),
                    amount: 180 + 8*i, status: i===28 ? 'OVERDUE' : i>=29 ? 'PENDING' : 'PAID',
                    dueDate: new Date(at.getTime() + (i===28 ? 1 : 10)*86400000).toISOString().slice(0,10)
                } });
                if (!active) await tx.task.create({data: {tenantId: company.id, createdAt: at,
                    title: 'Revino cu oferta pentru ' + contact.firstName + ' ' + contact.lastName,
                    completed: i < 23, priority: i === 31 ? 'Urgent' : 'Normal' }});
            }
        }, {timeout: 30000});
        console.log(email, password);
    }
} finally { await prisma.$disconnect(); }
