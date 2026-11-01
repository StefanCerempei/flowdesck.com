import express from 'express';
import { getTasks, createTask, toggleTask, deleteTask } from './tasks.controller.js';
import { protectRoute } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
    .get(protectRoute, getTasks)
    .post(protectRoute, createTask);

router.route('/:id')
    .patch(protectRoute, toggleTask)
    .delete(protectRoute, deleteTask);

export default router;