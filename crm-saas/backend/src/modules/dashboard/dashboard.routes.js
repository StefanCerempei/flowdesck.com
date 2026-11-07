import { brief } from './brief.js';
import express from 'express';
import { getDashboardSummary } from './dashboard.controller.js';
import { protectRoute } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Ruta necesită token valid (protectRoute)
router.get('/summary', protectRoute, getDashboardSummary);

router.post('/brief', protectRoute, brief);
export default router;