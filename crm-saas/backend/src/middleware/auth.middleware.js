import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const protectRoute = async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.header('Authorization') || '');
    if (!match) return res.status(401).json({ eroare: 'Acces refuzat. Token lipsă sau invalid.' });
    let decoded;
    try {
        decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (typeof decoded !== 'object' || typeof decoded.id !== 'string' || !decoded.id
            || typeof decoded.companyId !== 'string' || !decoded.companyId) throw new Error('Missing tenant identity');
    } catch {
        return res.status(401).json({ eroare: 'Token invalid sau expirat.' });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }, select: { id: true, companyId: true, role: true }
        });
        if (!user || user.companyId !== decoded.companyId) return res.status(401).json({ eroare: 'Sesiune invalidă.' });
        req.user = user;
        next();
    } catch (error) { next(error); }
};
