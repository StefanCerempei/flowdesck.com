import settingsRoutes from './modules/settings.js';
import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from '../routes/auth.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import taskRoutes from './modules/tasks/tasks.routes.js';
import contactRoutes from './modules/contacts/contacts.routes.js';
import invoiceRoutes from './modules/invoices/invoices.routes.js';

const app = express();
const allowedOrigins = [
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'https://flowdesck.com', 'https://www.flowdesck.com'
];
app.use(helmet());
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'API is running' }));
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/invoices', invoiceRoutes);
if (process.env.NODE_ENV === 'production') {
    const dist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
    app.use(express.static(dist));
    app.get(['/login', '/register', '/dashboard', '/contacts', '/invoices', '/settings'], (req, res) => {
        res.sendFile('index.html', { root: dist });
    });
}
app.use((req, res) => res.status(404).json({ eroare: 'Ruta nu există.' }));
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') return res.status(400).json({ eroare: 'JSON invalid.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ eroare: 'Cerere prea mare.' });
    console.error('Eroare API:', error);
    res.status(500).json({ eroare: 'Eroare internă de server.' });
});
export default app;
