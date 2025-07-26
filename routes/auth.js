const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),
    body('email')
        .isEmail()
        .withMessage('Email invalide')
        .trim()
        .toLowerCase(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit contenir au moins 6 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
    body('firstName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Le prénom ne peut pas dépasser 50 caractères'),
    body('lastName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Le nom ne peut pas dépasser 50 caractères')
];

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Email invalide')
        .trim()
        .toLowerCase(),
    body('password')
        .notEmpty()
        .withMessage('Mot de passe requis')
];

router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Données invalides',
                details: errors.array()
            });
        }

        const { username, email, password, firstName, lastName } = req.body;

        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                error: 'Un utilisateur avec cet email ou nom d\'utilisateur existe déjà',
                code: 'USER_EXISTS'
            });
        }

        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [username, email, passwordHash, firstName || null, lastName || null]
        );

        const userId = result.insertId;

        await pool.execute(
            'INSERT INTO user_preferences (user_id) VALUES (?)',
            [userId]
        );

        const token = generateToken(userId);

        const [users] = await pool.execute(
            'SELECT id, username, email, first_name, last_name, created_at FROM users WHERE id = ?',
            [userId]
        );

        res.status(201).json({
            message: 'Compte créé avec succès',
            user: users[0],
            token
        });

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Données invalides',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        const [users] = await pool.execute(
            'SELECT id, username, email, password_hash, first_name, last_name, is_active FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: 'Email ou mot de passe incorrect',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = users[0];

        if (!user.is_active) {
            return res.status(401).json({
                error: 'Compte désactivé',
                code: 'ACCOUNT_DISABLED'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Email ou mot de passe incorrect',
                code: 'INVALID_CREDENTIALS'
            });
        }

        await pool.execute(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        const token = generateToken(user.id);

        delete user.password_hash;

        res.json({
            message: 'Connexion réussie',
            user,
            token
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, email, first_name, last_name, avatar_url, created_at, last_login FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: 'Utilisateur non trouvé',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({
            user: users[0]
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.put('/profile', authenticateToken, [
    body('firstName').optional().isLength({ max: 50 }),
    body('lastName').optional().isLength({ max: 50 }),
    body('avatarUrl').optional().isURL()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Données invalides',
                details: errors.array()
            });
        }

        const { firstName, lastName, avatarUrl } = req.body;

        await pool.execute(
            'UPDATE users SET first_name = ?, last_name = ?, avatar_url = ? WHERE id = ?',
            [firstName || null, lastName || null, avatarUrl || null, req.user.id]
        );

        const [users] = await pool.execute(
            'SELECT id, username, email, first_name, last_name, avatar_url, created_at, last_login FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({
            message: 'Profil mis à jour avec succès',
            user: users[0]
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.put('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Données invalides',
                details: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        const [users] = await pool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: 'Utilisateur non trouvé',
                code: 'USER_NOT_FOUND'
            });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Mot de passe actuel incorrect',
                code: 'INVALID_PASSWORD'
            });
        }

        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, req.user.id]
        );

        res.json({
            message: 'Mot de passe modifié avec succès'
        });

    } catch (error) {
        console.error('Erreur lors du changement de mot de passe:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = router; 