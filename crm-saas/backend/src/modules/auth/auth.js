import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// ==========================================
// RUTA 1: ÎNREGISTRARE CONT (/register)
// ==========================================
router.post('/register', async (req, res) => {
    try {
        const { companyName, email, password } = req.body;

        // 1. Validare date primite
        if (!email || !password) {
            return res.status(400).json({ message: 'Emailul și parola sunt obligatorii.' });
        }

        // 2. Verificare dacă emailul există deja în baza de date
        // ATENȚIE: Dacă tabelul tău se numește 'company' în loc de 'user', modifică 'prisma.user' în 'prisma.company'
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Acest email este deja folosit.' });
        }

        // 3. Criptare parolă
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Salvare în baza de date
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                // Dacă ai câmpul companyName în schema Prisma, îl poți decomenta:
                // companyName: companyName
            }
        });

        res.status(201).json({ message: 'Cont creat cu succes!', user: newUser });
    } catch (error) {
        console.error('Eroare la înregistrare:', error);
        res.status(500).json({ message: 'Eroare internă a serverului.' });
    }
});

// ==========================================
// RUTA 2: LOGARE (/login)
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validare date primite
        if (!email || !password) {
            return res.status(400).json({ message: 'Emailul și parola sunt obligatorii.' });
        }

        // 2. Căutare utilizator în baza de date
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ message: 'Nu există un cont cu acest email.' });
        }

        // 3. Verificare parolă
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Parolă incorectă.' });
        }

        // 4. Generare Token JWT pentru a menține utilizatorul logat
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret_temporar_flowdesck',
            { expiresIn: '1d' } // Token-ul expiră într-o zi
        );

        res.status(200).json({ message: 'Logare reușită!', token, user });
    } catch (error) {
        console.error('Eroare la logare:', error);
        res.status(500).json({ message: 'Eroare internă a serverului.' });
    }
});

export default router;