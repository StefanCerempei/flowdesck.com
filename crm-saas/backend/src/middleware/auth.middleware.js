// Placeholder pentru verificarea JWT
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Neautorizat. Token lipsă.' });
    }

    // Aici vom adăuga logica de decodare JWT ulterior
    // req.user = decodedToken;
    next();
};