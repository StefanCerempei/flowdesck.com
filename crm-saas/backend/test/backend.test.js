import 'dotenv/config';
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

if (!process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to an isolated MySQL test database.');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET ||= randomUUID();
const { default: app } = await import('../src/app.js');
const { prisma } = await import('../src/lib/prisma.js');
const companies = new Set();
let server, base, a, b;
const password = 'Setup-test-password-123';
async function request(path, { token, body, method = 'GET', headers = {} } = {}) {
    const res = await fetch(base + path, {
        method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, headers: res.headers };
}
async function account() {
    const email = `backend-test-${randomUUID()}@example.invalid`;
    const registration = await request('/api/auth/register', { method: 'POST', body: { companyName: 'Backend test', email, password } });
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) companies.add(user.companyId);
    assert.equal(registration.status, 201);
    const login = await request('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(login.status, 200);
    assert.ok(login.data.token);
    assert.equal(login.data.user.password, undefined);
    return { ...login.data, email };
}
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    a = await account(); b = await account();
});
after(async () => {
    const where = { tenantId: { in: [...companies] } };
    await prisma.invoice.deleteMany({ where });
    await prisma.contact.deleteMany({ where });
    await prisma.task.deleteMany({ where });
    await prisma.user.deleteMany({ where: { companyId: { in: [...companies] } } });
    await prisma.company.deleteMany({ where: { id: { in: [...companies] } } });
    await prisma.$disconnect();
    if (server) await new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); });
});
test('configured frontend origin can use the API', async () => {
    const res = await request('/api/health', { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
});
test('all CRM routes are mounted and require authentication', async () => {
    for (const path of ['contacts', 'tasks', 'invoices', 'dashboard/summary']) {
        assert.equal((await request(`/api/${path}`)).status, 401);
        assert.equal((await request(`/api/${path}`, { token: a.token })).status, 200);
    }
});
test('invalid authentication bodies return 400, never an internal error', async () => {
    for (const body of [{}, null, [], { email: {}, password }, { email: a.email, password: 123 }]) {
        for (const route of ['register', 'login']) assert.equal((await request(`/api/auth/${route}`, { method: 'POST', body })).status, 400);
    }
    assert.equal((await request('/api/auth/register', { method: 'POST', body: { companyName: ' ', email: 'bad', password: 'x' } })).status, 400);
});
test('duplicate and concurrent registration returns a client error without orphan companies', async () => {
    const body = { companyName: 'duplicate', email: a.email, password };
    assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 409);
    body.email = `backend-test-${randomUUID()}@example.invalid`;
    const beforeCount = await prisma.company.count({ where: { name: body.companyName } });
    const results = await Promise.all([request('/api/auth/register', { method: 'POST', body }), request('/api/auth/register', { method: 'POST', body })]);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (user) companies.add(user.companyId);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    assert.equal(await prisma.company.count({ where: { name: body.companyName } }), beforeCount + 1);
});
test('login failures have a consistent 401 response', async () => {
    const missing = await request('/api/auth/login', { method: 'POST', body: { email: 'missing@example.invalid', password } });
    const wrong = await request('/api/auth/login', { method: 'POST', body: { email: a.email, password: 'wrong' } });
    assert.equal(missing.status, 401); assert.equal(wrong.status, 401);
    assert.deepEqual(missing.data, wrong.data);
});
test('tokens without a tenant, with a mismatched tenant or a deleted user cannot query CRM', async () => {
    for (const claims of [{ id: a.user.id }, { id: a.user.id, companyId: b.user.companyId }, { id: randomUUID(), companyId: a.user.companyId }]) {
        const token = jwt.sign(claims, process.env.JWT_SECRET);
        assert.equal((await request('/api/contacts', { token })).status, 401);
    }
    assert.equal((await request('/api/contacts', { headers: { Authorization: `Basic ${a.token}` } })).status, 401);
});
test('partial contact updates preserve notes, source and zero potential value', async () => {
    const created = await request('/api/contacts', { method: 'POST', token: a.token, body: { firstName: 'Ana', lastName: 'Test', notes: 'Keep me', source: 'Google', potentialValue: 0 } });
    assert.equal(created.status, 201); assert.equal(created.data.potentialValue, 0);
    const updated = await request(`/api/contacts/${created.data.id}`, { method: 'PUT', token: a.token, body: { firstName: 'Maria' } });
    assert.equal(updated.status, 200); assert.equal(updated.data.notes, 'Keep me'); assert.equal(updated.data.source, 'Google'); assert.equal(updated.data.potentialValue, 0);
});
test('invoice contact references must belong to the current tenant', async () => {
    const contact = await prisma.contact.create({ data: { tenantId: b.user.companyId, firstName: 'Other', lastName: 'Tenant' } });
    const res = await request('/api/invoices', { method: 'POST', token: a.token, body: { invoiceNumber: 'TEST-CROSS', amount: 100, contactId: contact.id } });
    assert.equal(res.status, 404);
    assert.equal(await prisma.invoice.count({ where: { tenantId: a.user.companyId, contactId: contact.id } }), 0);
    const own = await prisma.contact.create({ data: { tenantId: a.user.companyId, firstName: 'Own', lastName: 'Tenant' } });
    const missing = await request('/api/invoices', { method: 'POST', token: a.token, body: { invoiceNumber: 'TEST-MISSING', amount: 10, contactId: randomUUID() } });
    assert.equal(missing.status, 404);
    const good = await request('/api/invoices', { method: 'POST', token: a.token, body: { invoiceNumber: 'TEST-OWN', amount: '100.50', contactId: own.id } });
    assert.equal(good.status, 201); assert.equal(good.data.amount, 100.5);
});
test('invalid CRM payloads return 400', async () => {
    const cases = [
        ['contacts', { firstName: ' ', lastName: 'Test' }],
        ['contacts', { firstName: 'Ana', lastName: 'Test', potentialValue: 'abc' }],
        ['contacts', { firstName: 'Ana', lastName: 'Test', potentialValue: -1 }],
        ['contacts', { firstName: 'Ana', lastName: 'Test', status: 'UNKNOWN' }],
        ['tasks', { title: ' ' }], ['tasks', { title: {} }], ['tasks', { title: 'Test', priority: 'UNKNOWN' }],
        ...['12abc', -10, 0, {}, 'Infinity'].map(amount => ['invoices', { invoiceNumber: 'TEST-INVALID', amount }]),
        ['invoices', { invoiceNumber: 'TEST-INVALID', amount: 10, dueDate: '2026-02-30' }],
        ['invoices', { invoiceNumber: 'TEST-INVALID', amount: 10, status: 'UNKNOWN' }]
    ];
    for (const [path, body] of cases) assert.equal((await request(`/api/${path}`, { method: 'POST', token: a.token, body })).status, 400, `${path}: ${JSON.stringify(body)}`);
});
test('company boundaries apply to listing, updating and deleting records', async () => {
    const contact = await prisma.contact.create({ data: { tenantId: b.user.companyId, firstName: 'Private', lastName: 'Contact' } });
    const task = await prisma.task.create({ data: { tenantId: b.user.companyId, title: 'Private task' } });
    const invoice = await prisma.invoice.create({ data: { tenantId: b.user.companyId, invoiceNumber: 'PRIVATE', amount: 1 } });
    for (const [path, id] of [['contacts', contact.id], ['tasks', task.id], ['invoices', invoice.id]]) {
        const list = await request(`/api/${path}`, { token: a.token });
        assert.equal(list.status, 200); assert.ok(list.data.every(row => row.tenantId === a.user.companyId));
        assert.equal((await request(`/api/${path}/${id}`, { method: 'DELETE', token: a.token })).status, 404);
    }
    assert.equal((await request(`/api/contacts/${contact.id}`, { method: 'PUT', token: a.token, body: { firstName: 'Changed' } })).status, 404);
    assert.equal((await request(`/api/tasks/${task.id}`, { method: 'PATCH', token: a.token, body: {} })).status, 404);
});
test('monthly dashboard revenue excludes paid invoices from previous months', async () => {
    const current = new Date(); const previous = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 15));
    await prisma.invoice.createMany({ data: [
        { tenantId: b.user.companyId, invoiceNumber: 'OLD-PAID', amount: 999, status: 'PAID', createdAt: previous },
        { tenantId: b.user.companyId, invoiceNumber: 'CURRENT-PAID', amount: 50, status: 'PAID' }
    ] });
    const res = await request('/api/dashboard/summary', { token: b.token });
    assert.equal(res.status, 200); assert.equal(res.data.stats.monthlyRevenue, 50);
});
test('malformed JSON returns a JSON client error', async () => {
    const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
    assert.equal(res.status, 400); assert.ok((await res.json()).eroare);
});
