const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Token d\'accès requis',
            code: 'TOKEN_MISSING'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const [users] = await pool.execute(
            'SELECT id, username, email, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0 || !users[0].is_active) {
            return res.status(401).json({ 
                error: 'Utilisateur invalide ou désactivé',
                code: 'USER_INVALID'
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expiré',
                code: 'TOKEN_EXPIRED'
            });
        }
        return res.status(403).json({ 
            error: 'Token invalide',
            code: 'TOKEN_INVALID'
        });
    }
};

const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [users] = await pool.execute(
            'SELECT id, username, email, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length > 0 && users[0].is_active) {
            req.user = users[0];
        }
    } catch (error) {
    }

    next();
};

const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
    authenticateToken,
    optionalAuth,
    generateToken,
    JWT_SECRET
}; 