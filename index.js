// Hostinger supplies PORT and database credentials through the app environment.
process.env.NODE_ENV ||= 'production';
import('./crm-saas/backend/src/server.js');
