import app from './app.js';
import http from 'http';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
});

