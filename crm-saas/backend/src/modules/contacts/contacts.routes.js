import express from 'express';
import { getContacts, createContact, updateContact, deleteContact } from './contacts.controller.js';
import { protectRoute } from '../../middleware/auth.middleware.js';

import { schemas, validateBody } from '../../middleware/validation.middleware.js';

const router = express.Router();

router.route('/')
    .get(protectRoute, getContacts)
    .post(protectRoute, validateBody(schemas.contact), createContact);

// Asigură-te că această linie există pentru a rezolva eroarea 404:
router.route('/:id')
    .put(protectRoute, validateBody(schemas.contactUpdate), updateContact)
    .delete(protectRoute, deleteContact);

export default router;