const text = (options = {}) => ({ type: 'string', max: 191, ...options });
const optionalText = (options = {}) => text({ nullable: true, ...options });
const email = text({ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ });
const contact = {
    firstName: text({ required: true }), lastName: text({ required: true }),
    email: { ...email, nullable: true }, phone: optionalText(), company: optionalText(),
    status: text({ choices: ['LEAD', 'ACTIVE', 'INACTIVE'] }),
    notes: optionalText({ max: 65535, maxBytes: 65535 }), source: optionalText(),
    potentialValue: { type: 'number', nullable: true, min: 0 }
};
export const schemas = {
    register: {
        companyName: text({ required: true }), email: { ...email, required: true },
        password: text({ required: true, trim: false, min: 8, maxBytes: 72 })
    },
    login: { email: { ...email, required: true }, password: text({ required: true, trim: false, maxBytes: 72 }) },
    contact,
    contactUpdate: Object.fromEntries(Object.entries(contact).map(([key, rule]) => [key, { ...rule, required: false }])),
    task: { title: text({ required: true }), priority: text({ choices: ['Normal', 'Urgent'] }) },
    invoice: {
        invoiceNumber: text({ required: true }), amount: { type: 'number', required: true, min: 0, exclusive: true },
        status: text({ choices: ['PENDING', 'PAID', 'OVERDUE'] }),
        dueDate: optionalText({ date: true }), contactId: optionalText()
    }
};

export const validateBody = (schema) => (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ eroare: 'Corpul cererii trebuie să fie un obiect JSON.' });
    }
    const result = {};
    for (const [key, rule] of Object.entries(schema)) {
        let value = body[key];
        if (value === undefined) {
            if (rule.required) return res.status(400).json({ eroare: `Câmp obligatoriu: ${key}.` });
            continue;
        }
        if (rule.nullable && (value === null || value === '')) { result[key] = null; continue; }
        let invalid = false;
        if (rule.type === 'string') {
            invalid = typeof value !== 'string';
            if (!invalid) {
                if (rule.trim !== false) value = value.trim();
                if (rule.nullable && value === '') { result[key] = null; continue; }
                invalid = !value || value.length > rule.max || (rule.min && value.length < rule.min)
                    || (rule.maxBytes && Buffer.byteLength(value, 'utf8') > rule.maxBytes)
                    || (rule.pattern && !rule.pattern.test(value)) || (rule.choices && !rule.choices.includes(value));
                if (rule.date) {
                    const parsed = new Date(value);
                    invalid ||= !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value;
                }
            }
        } else {
            invalid = !['string', 'number'].includes(typeof value)
                || (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value));
            if (!invalid) {
                value = Number(value);
                invalid = !Number.isFinite(value) || (rule.exclusive ? value <= rule.min : value < rule.min);
            }
        }
        if (invalid) return res.status(400).json({ eroare: `Valoare invalidă pentru câmpul ${key}.` });
        result[key] = value;
    }
    req.body = result;
    next();
};
