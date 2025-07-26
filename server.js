const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;




app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/auth', authRoutes);

app.use('/api/conversations', conversationRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        code: 'ROUTE_NOT_FOUND'
    });
});

app.use((error, req, res, next) => {
    console.error('Erreur serveur:', error);
    
    res.status(error.status || 500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur AmiayGPT démarré sur http://localhost:${PORT}`);
    console.log(`📝 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Authentification: Activée`);
    console.log(`🗄️  Base de données: MySQL`);
    console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configurée' : 'Non configurée'}`);
}); 