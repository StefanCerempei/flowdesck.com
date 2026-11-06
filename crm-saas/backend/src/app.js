import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from '../routes/auth.js';

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://flowdesck.com',
    'https://www.flowdesck.com'
];


app.use(helmet());

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'API is running'
    });
});

// Authentication
app.use('/api/auth', authRoutes);

export default app;