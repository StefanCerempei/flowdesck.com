import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware-uri
app.use(cors()); // Permite frontend-ului să comunice cu backend-ul
app.use(express.json()); // Permite citirea datelor tip JSON
app.use('/api/auth', authRoutes);

// Rută de test pentru a verifica dacă serverul merge
app.get('/api/health', (req, res) => {
    res.json({ status: 'succes', mesaj: 'Serverul CRM funcționează perfect!' });
});

// Rută de test pentru baza de date (va returna un array gol momentan)
app.get('/api/companii', async (req, res) => {
    try {
        const companii = await prisma.company.findMany();
        res.json(companii);
    } catch (error) {
        res.status(500).json({ eroare: 'Eroare la conectarea cu baza de date' });
    }
});

// Pornirea serverului
app.listen(PORT, () => {
    console.log(`🚀 Serverul rulează pe http://localhost:${PORT}`);
});