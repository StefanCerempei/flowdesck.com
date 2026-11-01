import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET: Preluăm toți clienții companiei curente
export const getContacts = async (req, res) => {
    try {
        const tenantId = req.user.companyId;

        const contacts = await prisma.contact.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(contacts);
    } catch (error) {
        console.error('Eroare la preluarea clienților:', error);
        res.status(500).json({ eroare: 'Eroare internă de server la preluarea datelor.' });
    }
};

// POST: Creăm un client/lead nou
export const createContact = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const { firstName, lastName, email, phone, company, status, notes, potentialValue, source } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({ eroare: 'Numele și prenumele sunt obligatorii.' });
        }

        const newContact = await prisma.contact.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                company,
                status: status || 'LEAD',
                tenantId,
                notes: notes || null,
                potentialValue: potentialValue ? parseFloat(potentialValue) : null,
                source: source || null
            }
        });

        res.status(201).json(newContact);
    } catch (error) {
        console.error('Eroare la crearea clientului:', error);
        res.status(500).json({ eroare: 'Nu am putut adăuga clientul în baza de date.' });
    }
};

// PUT: Actualizează un client existent
export const updateContact = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const { id } = req.params;
        const { firstName, lastName, email, phone, company, status, notes, potentialValue, source } = req.body;

        const existingContact = await prisma.contact.findFirst({
            where: { id, tenantId }
        });

        if (!existingContact) {
            return res.status(404).json({ eroare: 'Clientul nu a fost găsit.' });
        }

        const updatedContact = await prisma.contact.update({
            where: { id },
            data: {
                firstName,
                lastName,
                email,
                phone,
                company,
                status,
                notes: notes || null,
                potentialValue: potentialValue ? parseFloat(potentialValue) : null,
                source: source || null
            }
        });

        res.status(200).json(updatedContact);
    } catch (error) {
        console.error('Eroare la actualizarea clientului:', error);
        res.status(500).json({ eroare: 'Nu am putut actualiza clientul.' });
    }
};

// DELETE: Șterge un client
export const deleteContact = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const { id } = req.params;

        const existingContact = await prisma.contact.findFirst({
            where: { id, tenantId }
        });

        if (!existingContact) {
            return res.status(404).json({ eroare: 'Clientul nu a fost găsit.' });
        }

        await prisma.contact.delete({
            where: { id }
        });

        res.status(200).json({ mesaj: 'Clientul a fost șters cu succes.' });
    } catch (error) {
        console.error('Eroare la ștergerea clientului:', error);
        res.status(500).json({ eroare: 'Nu am putut șterge clientul.' });
    }
};