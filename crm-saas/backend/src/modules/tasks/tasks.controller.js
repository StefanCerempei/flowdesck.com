import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET: Preluăm toate sarcinile companiei
export const getTasks = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const tasks = await prisma.task.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Eroare la preluarea sarcinilor:', error);
        res.status(500).json({ eroare: 'Nu am putut prelua sarcinile.' });
    }
};

// POST: Creăm o sarcină nouă
export const createTask = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const { title, priority } = req.body;

        if (!title) {
            return res.status(400).json({ eroare: 'Titlul sarcinii este obligatoriu.' });
        }

        const newTask = await prisma.task.create({
            data: {
                title,
                priority: priority || 'Normal',
                tenantId
            }
        });
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Eroare la crearea sarcinii:', error);
        res.status(500).json({ eroare: 'Nu am putut crea sarcina.' });
    }
};

// PATCH: Schimbă starea (bifat / nebifat)
export const toggleTask = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const { id } = req.params;

        const task = await prisma.task.findFirst({ where: { id, tenantId } });
        if (!task) return res.status(404).json({ eroare: 'Sarcina nu a fost găsită.' });

        const updated = await prisma.task.update({
            where: { id },
            data: { completed: !task.completed }
        });
        res.status(200).json(updated);
    } catch (error) {
        console.error('Eroare la actualizarea sarcinii:', error);
        res.status(500).json({ eroare: 'Nu am putut actualiza sarcina.' });
    }
};

// DELETE: Șterge o sarcină
export const deleteTask = async (req, res) => {
    try {
        const tenantId = req.user.companyId;
        const { id } = req.params;

        const task = await prisma.task.findFirst({ where: { id, tenantId } });
        if (!task) return res.status(404).json({ eroare: 'Sarcina nu a fost găsită.' });

        await prisma.task.delete({ where: { id } });
        res.status(200).json({ mesaj: 'Sarcina a fost ștearsă.' });
    } catch (error) {
        console.error('Eroare la ștergerea sarcinii:', error);
        res.status(500).json({ eroare: 'Nu am putut șterge sarcina.' });
    }
};