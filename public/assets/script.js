let currentConversation = null;
let conversations = [];
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let currentUser = null;
let authToken = localStorage.getItem('authToken');

const API_BASE_URL = '/api';

const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    themeToggle: document.getElementById('themeToggle'),
    newChatBtn: document.getElementById('newChatBtn'),
    conversationsList: document.getElementById('conversationsList'),
    chatContainer: document.getElementById('chatContainer'),
    messagesContainer: document.getElementById('messagesContainer'),
    welcomeMessage: document.getElementById('welcomeMessage'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    currentConversationTitle: document.getElementById('currentConversationTitle'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    closeErrorModal: document.getElementById('closeErrorModal'),
    logoutBtn: document.getElementById('logoutBtn')
};

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeApp();
    setupEventListeners();
    applyTheme();
});

function checkAuth() {
    if (!authToken) {
        window.location.href = '/auth.html';
        return;
    }
    
    fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Token invalide');
        }
    })
    .then(data => {
        currentUser = data.user;
        updateUserInterface();
        loadConversations();
    })
    .catch(error => {
        console.error('Erreur d\'authentification:', error);
        localStorage.removeItem('authToken');
        window.location.href = '/auth.html';
    });
}

function updateUserInterface() {
    if (currentUser) {
        const userName = currentUser.first_name && currentUser.last_name 
            ? `${currentUser.first_name} ${currentUser.last_name}`
            : currentUser.username;
        
        document.getElementById('userName').textContent = userName;
        document.getElementById('userEmail').textContent = currentUser.email;
    }
}

function logout() {
    console.log('Logout appelé');
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/auth.html';
    }
}

function initializeApp() {
    elements.messageInput.addEventListener('input', autoResizeTextarea);
    elements.messageInput.addEventListener('keydown', handleKeyPress);
    setupSuggestionCards();
}

function setupEventListeners() {
    elements.sidebarToggle?.addEventListener('click', toggleSidebar);
    elements.themeToggle?.addEventListener('click', toggleTheme);
    
    elements.newChatBtn?.addEventListener('click', async () => {
        try {
            await createNewConversation();
        } catch (error) {
            showError('Erreur lors de la création de la conversation: ' + error.message);
        }
    });
    
    elements.sendBtn?.addEventListener('click', sendMessage);
    elements.clearChatBtn?.addEventListener('click', clearCurrentConversation);
    
    console.log('logoutBtn:', elements.logoutBtn);
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', logout);
    } else {
        console.warn('logoutBtn non trouvé dans le DOM');
    }
    
    elements.closeErrorModal?.addEventListener('click', hideErrorModal);
    
    window.addEventListener('click', (e) => {
        if (e.target === elements.errorModal) {
            hideErrorModal();
        }
    });
}

function setupSuggestionCards() {
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    const suggestions = [
        "Aide-moi à générer des idées pour un projet créatif",
        "Explique-moi un concept de programmation",
        "Enseigne-moi quelque chose de nouveau",
        "Réponds à mes questions sur n'importe quel sujet"
    ];
    
    suggestionCards.forEach((card, index) => {
        card.addEventListener('click', async () => {
            elements.messageInput.value = suggestions[index];
            elements.messageInput.focus();
            autoResizeTextarea();
            
            if (!currentConversation) {
                try {
                    await createNewConversation();
                } catch (error) {
                    showError('Erreur lors de la création de la conversation: ' + error.message);
                }
            }
        });
    });
}

function autoResizeTextarea() {
    const textarea = elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    
    elements.sendBtn.disabled = !textarea.value.trim();
}

function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!elements.sendBtn.disabled) {
            sendMessage();
        }
    }
}

function toggleSidebar() {
    elements.sidebar.classList.toggle('sidebar-hidden');
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    applyTheme();
}

function applyTheme() {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

async function createNewConversation() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) throw new Error('Erreur lors de la création de la conversation');
        const conversation = await response.json();
        currentConversation = conversation;
        if (!conversations) {
            conversations = [];
        }
        conversations.unshift(conversation);
        updateConversationsList();
        displayConversation(conversation);
        elements.welcomeMessage.classList.add('hidden');
        elements.messagesContainer.classList.remove('hidden');
        hideLoading();
        showNotification('Nouvelle conversation créée', 'success');
        return conversation;
    } catch (error) {
        hideLoading();
        throw error;
    }
}

async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error('Erreur lors du chargement des conversations');
        const data = await response.json();
        conversations = data.conversations || [];
        updateConversationsList();
    } catch (error) {
        console.error('Erreur lors du chargement des conversations:', error);
        conversations = [];
        updateConversationsList();
    }
}

function updateConversationsList() {
    elements.conversationsList.innerHTML = '';
    if (conversations && Array.isArray(conversations)) {
        conversations.forEach(conversation => {
            const conversationElement = createConversationElement(conversation);
            elements.conversationsList.appendChild(conversationElement);
        });
    }
}

function createConversationElement(conversation) {
    const div = document.createElement('div');
    div.className = `conversation-item group p-3 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${currentConversation?.id === conversation.id ? 'active' : ''}`;
    div.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-gray-800 dark:text-white truncate">
                    ${conversation.title || 'Nouvelle conversation'}
                </h4>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    ${formatDate(conversation.updated_at || conversation.updatedAt)}
                </p>
            </div>
            <div class="flex items-center space-x-2 ml-2">
                <span class="text-xs text-gray-400">${conversation.message_count || conversation.messageCount || 0}</span>
                <button class="delete-conversation text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 p-1 rounded" data-id="${conversation.id}" title="Supprimer la conversation">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        </div>
    `;
    
    div.addEventListener('click', () => loadConversation(conversation.id));
    
    const deleteBtn = div.querySelector('.delete-conversation');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Bouton de suppression cliqué pour la conversation:', conversation.id);
            deleteConversation(conversation.id);
        });
    } else {
        console.error('Bouton de suppression non trouvé pour la conversation:', conversation.id);
    }
    
    return div;
}

async function loadConversation(conversationId) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) throw new Error('Erreur lors du chargement de la conversation');
        
        const conversation = await response.json();
        currentConversation = conversation;
        
        displayConversation(conversation);
        updateConversationsList();
        
        elements.welcomeMessage.classList.add('hidden');
        elements.messagesContainer.classList.remove('hidden');
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showError('Erreur lors du chargement de la conversation: ' + error.message);
    }
}

function displayConversation(conversation) {
    elements.currentConversationTitle.textContent = conversation.title || 'Nouvelle conversation';
    elements.messagesContainer.innerHTML = '';
    
    if (conversation.messages && Array.isArray(conversation.messages)) {
        conversation.messages.forEach(message => {
            addMessageToUI(message);
        });
    }
    
    scrollToBottom();
}

async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message) return;
    
    if (!currentConversation) {
        try {
            await createNewConversation();
        } catch (error) {
            showError('Erreur lors de la création de la conversation: ' + error.message);
            return;
        }
    }
    
    try {
        elements.messageInput.disabled = true;
        elements.sendBtn.disabled = true;
        
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        addMessageToUI(userMessage);
        
        elements.messageInput.value = '';
        autoResizeTextarea();
        
        showTypingIndicator();
        
        const response = await fetch(`${API_BASE_URL}/conversations/${currentConversation.id}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) throw new Error('Erreur lors de l\'envoi du message');
        
        const data = await response.json();
        currentConversation = data.conversation;
        
        hideTypingIndicator();
        
        addMessageToUI(data.newMessage);
        
        updateConversationsList();
        
        elements.messageInput.disabled = false;
        elements.messageInput.focus();
        
    } catch (error) {
        hideTypingIndicator();
        elements.messageInput.disabled = false;
        elements.sendBtn.disabled = false;
        showError('Erreur lors de l\'envoi du message: ' + error.message);
    }
}

function addMessageToUI(message) {
    if (!elements.messagesContainer) return;
    
    const messageElement = createMessageElement(message);
    elements.messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

function createMessageElement(message) {
    const isBot = (message.role || 'user') !== 'user';
    const div = document.createElement('div');
    div.className = `message ${message.role || 'user'} animate-fade-in-up`;
    const contentHtml = formatMessageContent(message.content || '', isBot);
    div.innerHTML = `
        <div class="flex space-x-4 max-w-4xl mx-auto">
            <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full flex items-center justify-center ${
                    (message.role || 'user') === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                        : 'bg-gradient-to-r from-gray-500 to-gray-600'
                }">
                    <i class="fas fa-${(message.role || 'user') === 'user' ? 'user' : 'robot'} text-white text-sm"></i>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div class="message-content text-gray-800 dark:text-gray-200">
                        ${contentHtml}
                    </div>
                    <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        ${formatTime(message.timestamp || message.created_at)}
                    </div>
                </div>
            </div>
        </div>
    `;
    return div;
}

function formatMessageContent(content, isBot = true) {
    if (!content) return '';
    if (!isBot) {
        return '<p>' + escapeHtml(content).replace(/\n/g, '<br>') + '</p>';
    }
    let formattedContent = '';
    let lastIndex = 0;
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            const before = content.slice(lastIndex, match.index);
            formattedContent += '<p>' + escapeHtml(before).replace(/\n/g, '<br>') + '</p>';
        }
        const lang = (match[1] || 'code').toLowerCase();
        const badge = (match[1] ? match[1].toUpperCase() : 'CODE');
        const codeId = 'code-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const code = match[2];
        formattedContent += `
            <div class="code-block">
                <div class="code-header">
                    <span class="code-language">${badge}</span>
                    <button class="copy-button" onclick="copyCode('${codeId}')" title="Copier le code">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <pre class="code-content language-${lang}"><code id="${codeId}" class="language-${lang}">${escapeHtml(code.trim())}</code></pre>
            </div>
        `;
        lastIndex = codeBlockRegex.lastIndex;
    }
    if (lastIndex < content.length) {
        const after = content.slice(lastIndex);
        formattedContent += '<p>' + escapeHtml(after).replace(/\n/g, '<br>') + '</p>';
    }
    return formattedContent;
}

function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showTypingIndicator() {
    if (!elements.messagesContainer) return;
    
    const typingElement = document.createElement('div');
    typingElement.id = 'typing-indicator';
    typingElement.className = 'message assistant animate-fade-in-up';
    typingElement.innerHTML = `
        <div class="flex space-x-4 max-w-4xl mx-auto">
            <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-gray-500 to-gray-600">
                    <i class="fas fa-robot text-white text-sm"></i>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center space-x-2">
                        <div class="flex space-x-1">
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
                        </div>
                        <span class="text-sm text-gray-500 dark:text-gray-400">AmiayGPT réfléchit...</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    elements.messagesContainer.appendChild(typingElement);
    scrollToBottom();
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

async function deleteConversation(conversationId) {
    if (!conversationId) {
        console.error('ID de conversation manquant');
        showError('ID de conversation manquant');
        return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) return;
    
    try {
        console.log('Suppression de la conversation:', conversationId);
        console.log('URL de suppression:', `${API_BASE_URL}/conversations/${conversationId}`);
        
        const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log('Réponse de suppression:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json().catch(() => ({}));
        console.log('Résultat de suppression:', result);
        
        conversations = conversations.filter(c => c.id !== conversationId);
        updateConversationsList();
        
        if (currentConversation?.id === conversationId) {
            await createNewConversation();
        }
        
        showNotification('Conversation supprimée avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showError('Erreur lors de la suppression: ' + error.message);
    }
}

function clearCurrentConversation() {
    if (!currentConversation) return;
    
    if (confirm('Êtes-vous sûr de vouloir effacer cette conversation ?')) {
        elements.messagesContainer.innerHTML = '';
        elements.welcomeMessage.classList.remove('hidden');
        elements.messagesContainer.classList.add('hidden');
        elements.currentConversationTitle.textContent = 'Nouvelle conversation';
        currentConversation = null;
    }
}

function scrollToBottom() {
    if (!elements.chatContainer) return;
    
    setTimeout(() => {
        elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    }, 100);
}

function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorModal.classList.remove('hidden');
}

function hideErrorModal() {
    elements.errorModal.classList.add('hidden');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} text-${type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'}-500"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'À l\'instant';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'À l\'instant';
    
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
        return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
}

function formatTime(dateString) {
    if (!dateString) return 'À l\'instant';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'À l\'instant';
    
    return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

const oldAddMessageToUI = addMessageToUI;
addMessageToUI = function(message) {
    oldAddMessageToUI(message);
    setTimeout(() => {
        const codeBlocks = document.querySelectorAll('.code-content code');
        codeBlocks.forEach((block, index) => {
            if (window.Prism) {
                try {
                    Prism.highlightElement(block);
                } catch (error) {
                    console.error(`Erreur PrismJS sur bloc ${index}:`, error);
                }
            }
        });
    }, 10);
};

function copyCode(codeId) {
    const codeElement = document.getElementById(codeId);
    if (codeElement) {
        const text = codeElement.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const button = codeElement.parentElement.parentElement.querySelector('.copy-button');
            const icon = button.querySelector('i');
            icon.className = 'fas fa-check';
            button.style.color = '#10b981';
            
            setTimeout(() => {
                icon.className = 'fas fa-copy';
                button.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Erreur lors de la copie:', err);
        });
    }
}

window.addEventListener('error', (e) => {
    console.error('Erreur JavaScript:', e.error);
    showError('Une erreur inattendue s\'est produite');
});

window.addEventListener('offline', () => {
    showNotification('Connexion perdue', 'error');
});

window.addEventListener('online', () => {
    showNotification('Connexion rétablie', 'success');
});

window.testDeleteConversation = function(conversationId) {
    console.log('Test de suppression pour la conversation:', conversationId);
    deleteConversation(conversationId);
};

window.showConversations = function() {
    console.log('Conversations actuelles:', conversations);
    console.log('Conversation active:', currentConversation);
}; 