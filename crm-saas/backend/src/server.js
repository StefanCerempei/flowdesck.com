import app from './app.js';
import http from 'http';

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
    throw new Error('JWT_SECRET and DATABASE_URL must be configured before starting the API.');
}

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
});

