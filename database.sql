-- Base de données AmiayGPT
-- Script de création des tables

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS amiaygpt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE amiaygpt;

-- Table des utilisateurs
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- Table des conversations
CREATE TABLE conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Nouvelle conversation',
    model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
);

-- Table des messages
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
);

-- Table des sessions utilisateur
CREATE TABLE user_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);

-- Table des statistiques d'utilisation
CREATE TABLE usage_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    messages_sent INT DEFAULT 0,
    tokens_used INT DEFAULT 0,
    conversations_created INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date)
);

-- Table des préférences utilisateur
CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    theme ENUM('light', 'dark', 'auto') DEFAULT 'auto',
    language VARCHAR(10) DEFAULT 'fr',
    model_preference VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    max_tokens INT DEFAULT 1000,
    temperature DECIMAL(2,1) DEFAULT 0.7,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Triggers pour mettre à jour updated_at automatiquement
DELIMITER //

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- Vues utiles
CREATE VIEW conversation_summary AS
SELECT 
    c.id,
    c.user_id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    COUNT(m.id) as message_count,
    SUM(m.tokens_used) as total_tokens
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.is_archived = FALSE
GROUP BY c.id, c.user_id, c.title, c.model, c.created_at, c.updated_at;

CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.created_at as user_created_at,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(m.id) as total_messages,
    SUM(m.tokens_used) as total_tokens_used,
    MAX(c.updated_at) as last_activity
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id AND c.is_archived = FALSE
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY u.id, u.username, u.email, u.created_at; 