import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET: Preluăm toate facturile companiei
export const getInvoices = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const invoices = await prisma.invoice.findMany({
            where: { tenantId },
            include: { contact: true },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(invoices);
    } catch (error) {
        console.error('Eroare la preluarea facturilor:', error);
        res.status(500).json({ eroare: 'Nu am putut prelua facturile.' });
    }
};

// POST: Emiterea unei facturi noi
export const createInvoice = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const { invoiceNumber, amount, status, dueDate, contactId } = req.body;

        if (!invoiceNumber || !amount) {
            return res.status(400).json({ eroare: 'Numărul facturii și suma sunt obligatorii.' });
        }

        const newInvoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                amount: parseFloat(amount),
                status: status || 'PENDING',
                dueDate: dueDate || null,
                contactId: contactId || null,
                tenantId
            },
            include: { contact: true }
        });

        res.status(201).json(newInvoice);
    } catch (error) {
        console.error('Eroare la crearea facturii:', error);
        res.status(500).json({ eroare: 'Nu am putut emite factura.' });
    }
};

// DELETE: Ștergerea unei facturi
export const deleteInvoice = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const { id } = req.params;

        const invoice = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!invoice) return res.status(404).json({ eroare: 'Factura nu a fost găsită.' });

        await prisma.invoice.delete({ where: { id } });
        res.status(200).json({ mesaj: 'Factura a fost ștearsă.' });
    } catch (error) {
        console.error('Eroare la ștergerea facturii:', error);
        res.status(500).json({ eroare: 'Nu am putut șterge factura.' });
    }
};