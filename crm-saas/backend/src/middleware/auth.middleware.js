import { DEMO_ROLE, demoEnabled, validGuest, limiter } from '../lib/public-demo.js';
const guestReads = limiter(300,60000);
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const protectRoute = async (req, res, next) => {
    if (req.user) return next();
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
            where: { id: decoded.id }, select: { id: true, companyId: true, role: true, email:true, company:{select:{name:true}} }
        });
        if (!user || user.companyId !== decoded.companyId) return res.status(401).json({ eroare: 'Sesiune invalidă.' });
        if (user.role === DEMO_ROLE || decoded.demoGuest) {
            if (!demoEnabled() || !validGuest(user) || decoded.demoGuest !== true
                || decoded.aud !== 'flowdesck-public-demo' || !Number.isFinite(decoded.exp)
                || !Number.isFinite(decoded.iat) || decoded.exp - decoded.iat > 900) {
                return res.status(401).json({error:{code:'DEMO_SESSION_EXPIRED',message:'Demo session expired. Open /demo to start again.'}});
            }
            const path = req.originalUrl.split('?')[0].replace(/\/$/,'');
            const safeRead = ['GET','HEAD'].includes(req.method) && (
              ['/api/contacts','/api/tasks','/api/invoices','/api/fleet/dashboard','/api/settings',
               '/api/reservations','/api/reservations/availability','/api/vehicles/availability','/api/vehicles','/api/ai/fleet-insights',
               '/api/dashboard/summary'].includes(path)
              || /^\/api\/(?:vehicles|reservations)\/[0-9a-f-]{36}$/i.test(path));
            const safeAnalysis = req.method === 'POST' && ['/api/ai/booking-proposals','/api/ai/fleet-insights/explain'].includes(path);
            if (!safeRead && !safeAnalysis) return res.status(403).json({error:{code:'DEMO_READ_ONLY',message:'Demo Mode — Read Only. Saving is restricted.'}});
            req.demoGuest = true;
            req.user = user;
            res.set('Cache-Control','no-store');
            return guestReads(req,res,next);
        }
        req.user = user;
        next();
    } catch (error) { next(error); }
};
