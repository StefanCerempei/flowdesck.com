import { DEMO_ROLE, DEMO_EMAIL } from '../src/lib/public-demo.js';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/lib/prisma.js';
import { schemas, validateBody } from '../src/middleware/validation.middleware.js';

const router = express.Router();
router.post('/register', validateBody(schemas.register), async (req, res, next) => {
    const { companyName, email, password } = req.body;
    try {
        if (email.toLowerCase() === DEMO_EMAIL) return res.status(409).json({eroare:'Reserved demo identity.'});
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ eroare: 'Acest email este deja folosit.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        // Nested creation is atomic: a duplicate email cannot leave an orphan company.
        await prisma.company.create({ data: {
            name: companyName,
            users: { create: { email, password: hashedPassword, role: 'SUPER_ADMIN' } }
        } });
        res.status(201).json({ mesaj: 'Compania și contul au fost create cu succes!' });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ eroare: 'Acest email este deja folosit.' });
        next(error);
    }
});
router.post('/login', validateBody(schemas.login), async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role === DEMO_ROLE || user.email.toLowerCase() === DEMO_EMAIL || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ eroare: 'Email sau parolă incorectă.' });
        }
        const token = jwt.sign({ id: user.id, companyId: user.companyId, role: user.role }, process.env.JWT_SECRET,
            { expiresIn: '1d', algorithm: 'HS256' });
        res.json({ token, user: { id: user.id, email: user.email, role: user.role, companyId: user.companyId } });
    } catch (error) { next(error); }
});
export default router;
