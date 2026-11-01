import express from 'express';
import { getInvoices, createInvoice, deleteInvoice } from './invoices.controller.js';
import { protectRoute } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
    .get(protectRoute, getInvoices)
    .post(protectRoute, createInvoice);

router.route('/:id')
    .delete(protectRoute, deleteInvoice);

export default router;