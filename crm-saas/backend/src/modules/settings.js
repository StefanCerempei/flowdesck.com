import express from 'express';
import { prisma } from '../lib/prisma.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protectRoute);
const select = {name:true, subscriptionPlan:true};
router.get('/', async (req,res,next) => {
    try {
        res.json(await prisma.company.findUniqueOrThrow({where:{id:req.user.companyId}, select}));
    } catch (error) { next(error); }
});
router.patch('/', async (req,res,next) => {
    if (!['ADMIN','SUPER_ADMIN'].includes(req.user.role)) return res.sendStatus(403);
    const name = typeof req.body?.name === 'string' && req.body.name.trim();
    if (!name || name.length > 191) return res.status(400).json({eroare:'Introdu un nume de maximum 191 de caractere.'});
    try {
        res.json(await prisma.company.update({where:{id:req.user.companyId},data:{name},select}));
    } catch (error) { next(error); }
});
export default router;
