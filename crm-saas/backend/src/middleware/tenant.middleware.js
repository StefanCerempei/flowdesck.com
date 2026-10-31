export const requireTenant = (req, res, next) => {
    // Presupunem că am setat req.user în auth.middleware (din token-ul JWT)
    const companyId = req.user?.companyId;

    if (!companyId) {
        return res.status(403).json({
            success: false,
            message: 'Acces interzis. Utilizatorul nu este asociat unei companii (tenant).'
        });
    }

    // Injectăm companyId în request pentru a fi folosit de controllere
    req.companyId = companyId;
    next();
};