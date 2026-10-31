import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// 1. ÎNREGISTRARE (Creare Companie + Cont Super Admin)
router.post('/register', async (req, res) => {
    const { companyName, email, password } = req.body;

    try {
        // Verificăm dacă email-ul există deja
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ eroare: 'Acest email este deja folosit.' });
        }

        // Criptăm parola
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Creăm Compania și Utilizatorul simultan (relație Prisma)
        const newCompany = await prisma.company.create({
            data: {
                name: companyName,
                users: {
                    create: {
                        email,
                        password: hashedPassword,
                        role: 'SUPER_ADMIN'
                    }
                }
            }
        });

        res.status(201).json({ mesaj: 'Compania și contul au fost create cu succes!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ eroare: 'Eroare la înregistrare pe server.' });
    }
});

// 2. AUTENTIFICARE (Login)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Căutăm utilizatorul
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ eroare: 'Utilizatorul nu a fost găsit.' });
        }

        // Verificăm parola
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ eroare: 'Parolă incorectă.' });
        }

        // Generăm Token-ul de sesiune
        const token = jwt.sign(
            { id: user.id, companyId: user.companyId, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // Expiră într-o zi
        );

        // Trimitem datele către interfață (fără parolă)
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ eroare: 'Eroare la autentificare.' });
    }
});

export default router;