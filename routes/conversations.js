const express = require('express');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.use(authenticateToken);

router.post('/', async (req, res) => {
    try {
        const conversationId = uuidv4();
        const userId = req.user.id;
        const { title = 'Nouvelle conversation', model = 'gpt-3.5-turbo' } = req.body;

        await pool.execute(
            'INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)',
            [conversationId, userId, title, model]
        );

        const [conversations] = await pool.execute(
            'SELECT * FROM conversations WHERE id = ?',
            [conversationId]
        );

        res.status(201).json(conversations[0]);

    } catch (error) {
        console.error('Erreur lors de la création de la conversation:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, archived = false } = req.query;
        const offset = (page - 1) * limit;

        const [conversations] = await pool.execute(
            `SELECT 
                c.id,
                c.title,
                c.model,
                c.created_at,
                c.updated_at,
                c.is_archived,
                COUNT(m.id) as message_count,
                SUM(m.tokens_used) as total_tokens
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.user_id = ? AND c.is_archived = ?
            GROUP BY c.id, c.title, c.model, c.created_at, c.updated_at, c.is_archived
            ORDER BY c.updated_at DESC
            LIMIT ? OFFSET ?`,
            [userId, archived === 'true', parseInt(limit), offset]
        );
            
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM conversations WHERE user_id = ? AND is_archived = ?',
            [userId, archived === 'true']
        );

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            conversations,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des conversations:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [conversations] = await pool.execute(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({
                error: 'Conversation non trouvée',
                code: 'CONVERSATION_NOT_FOUND'
            });
        }

        const conversation = conversations[0];

        const [messages] = await pool.execute(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            [id]
        );

        res.json({
            ...conversation,
            messages
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la conversation:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});

router.post('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const userId = req.user.id;

        if (!message || !message.trim()) {
            return res.status(400).json({
                error: 'Message requis',
                code: 'MESSAGE_REQUIRED'
            });
        }

        const [conversations] = await pool.execute(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({
                error: 'Conversation non trouvée',
                code: 'CONVERSATION_NOT_FOUND'
            });
        }

        const conversation = conversations[0];

        const userMessageId = uuidv4();
        await pool.execute(
            'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
            [userMessageId, id, 'user', message.trim()]
        );

        const [messageCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?',
            [id]
        );

        if (messageCount[0].count === 1) {
            const title = message.trim().substring(0, 50) + (message.trim().length > 50 ? '...' : '');
            await pool.execute(
                'UPDATE conversations SET title = ? WHERE id = ?',
                [title, id]
            );
        }

        const [messages] = await pool.execute(
            'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            [id]
        );

        const completion = await openai.chat.completions.create({
            model: conversation.model || "gpt-3.5-turbo",
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            max_tokens: 1000,
            temperature: 0.7,
        });

        const assistantResponse = completion.choices[0].message.content;
        const tokensUsed = completion.usage?.total_tokens || 0;

        const assistantMessageId = uuidv4();
        await pool.execute(
            'INSERT INTO messages (id, conversation_id, role, content, tokens_used) VALUES (?, ?, ?, ?, ?)',
            [assistantMessageId, id, 'assistant', assistantResponse, tokensUsed]
        );

        await pool.execute(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );

        const today = new Date().toISOString().split('T')[0];
        await pool.execute(
            `INSERT INTO usage_stats (user_id, date, messages_sent, tokens_used) 
             VALUES (?, ?, 1, ?) 
             ON DUPLICATE KEY UPDATE 
             messages_sent = messages_sent + 1, 
             tokens_used = tokens_used + ?`,
            [userId, today, tokensUsed, tokensUsed]
        );

        const [updatedMessages] = await pool.execute(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            [id]
        );

        res.json({
            conversation: {
                ...conversation,
                messages: updatedMessages
            },
            newMessage: {
                id: assistantMessageId,
                role: 'assistant',
                content: assistantResponse,
                tokens_used: tokensUsed,
                created_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        
        if (error.code === 'insufficient_quota') {
            return res.status(429).json({
                error: 'Quota OpenAI dépassé',
                code: 'OPENAI_QUOTA_EXCEEDED'
            });
        }

        res.status(500).json({
            error: 'Erreur lors de la communication avec l\'IA',
            code: 'OPENAI_ERROR',
            details: error.message
        });
    }
});


router.put('/:id/title', async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const userId = req.user.id;

        if (!title || !title.trim()) {
            return res.status(400).json({
                error: 'Titre requis',
                code: 'TITLE_REQUIRED'
            });
        }


        const [conversations] = await pool.execute(
            'SELECT id FROM conversations WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({
                error: 'Conversation non trouvée',
                code: 'CONVERSATION_NOT_FOUND'
            });
        }


        await pool.execute(
            'UPDATE conversations SET title = ? WHERE id = ?',
            [title.trim(), id]
        );

        res.json({
            message: 'Titre mis à jour avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du titre:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});


router.put('/:id/archive', async (req, res) => {
    try {
        const { id } = req.params;
        const { archived = true } = req.body;
        const userId = req.user.id;


        const [conversations] = await pool.execute(
            'SELECT id FROM conversations WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({
                error: 'Conversation non trouvée',
                code: 'CONVERSATION_NOT_FOUND'
            });
        }


        await pool.execute(
            'UPDATE conversations SET is_archived = ? WHERE id = ?',
            [archived, id]
        );

        res.json({
            message: archived ? 'Conversation archivée' : 'Conversation désarchivée'
        });

    } catch (error) {
        console.error('Erreur lors de l\'archivage de la conversation:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;


        const [conversations] = await pool.execute(
            'SELECT id FROM conversations WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({
                error: 'Conversation non trouvée',
                code: 'CONVERSATION_NOT_FOUND'
            });
        }


        await pool.execute(
            'DELETE FROM conversations WHERE id = ?',
            [id]
        );

        res.json({
            message: 'Conversation supprimée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de la conversation:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = router; 