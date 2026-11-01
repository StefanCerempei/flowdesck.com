import jwt from 'jsonwebtoken';

export const protectRoute = (req, res, next) => {
    // Preluăm token-ul din header (Format: "Bearer <token>")
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ eroare: 'Acces refuzat. Token lipsă.' });
    }

    try {
        // Decodificăm token-ul (trebuie să folosești același JWT_SECRET ca la login)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Atașăm datele utilizatorului (inclusiv companyId) la request
        req.user = decoded;
        next(); // Trecem mai departe la controller
    } catch (error) {
        res.status(401).json({ eroare: 'Token invalid sau expirat.' });
    }
};