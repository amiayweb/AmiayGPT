// Configuration
const API_BASE_URL = '/api';

const elements = {
    loginTab: document.getElementById('loginTab'),
    registerTab: document.getElementById('registerTab'),
    
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    toggleLoginPassword: document.getElementById('toggleLoginPassword'),
    rememberMe: document.getElementById('rememberMe'),
    
    registerFirstName: document.getElementById('registerFirstName'),
    registerLastName: document.getElementById('registerLastName'),
    registerUsername: document.getElementById('registerUsername'),
    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    toggleRegisterPassword: document.getElementById('toggleRegisterPassword'),
    agreeTerms: document.getElementById('agreeTerms'),
    
    loadingState: document.getElementById('loadingState'),
    errorMessage: document.getElementById('errorMessage'),
    successMessage: document.getElementById('successMessage')
};

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuthStatus();
});

function setupEventListeners() {
    elements.loginTab.addEventListener('click', () => switchTab('login'));
    elements.registerTab.addEventListener('click', () => switchTab('register'));
    
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);
    
    elements.toggleLoginPassword.addEventListener('click', () => togglePassword('loginPassword', 'toggleLoginPassword'));
    elements.toggleRegisterPassword.addEventListener('click', () => togglePassword('registerPassword', 'toggleRegisterPassword'));
    
    elements.registerPassword.addEventListener('input', validatePassword);
    elements.registerUsername.addEventListener('input', validateUsername);
}

function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
        fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/';
            } else {
                localStorage.removeItem('authToken');
            }
        })
        .catch(() => {
            localStorage.removeItem('authToken');
        });
    }
}

function switchTab(tab) {
    if (tab === 'login') {
        elements.loginTab.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'shadow-lg');
        elements.loginTab.classList.remove('text-gray-300');
        elements.loginTab.classList.add('text-white');
        
        elements.registerTab.classList.remove('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'shadow-lg', 'text-white');
        elements.registerTab.classList.add('text-gray-300');
        
        elements.loginForm.classList.remove('hidden');
        elements.registerForm.classList.add('hidden');
    } else {
        elements.registerTab.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'shadow-lg');
        elements.registerTab.classList.remove('text-gray-300');
        elements.registerTab.classList.add('text-white');
        
        elements.loginTab.classList.remove('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'shadow-lg', 'text-white');
        elements.loginTab.classList.add('text-gray-300');
        
        elements.registerForm.classList.remove('hidden');
        elements.loginForm.classList.add('hidden');
    }
    
    hideMessages();
}

function togglePassword(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    const icon = toggle.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function validatePassword() {
    const password = elements.registerPassword.value;
    const hasMinLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    // Mettre à jour l'indicateur visuel
    const input = elements.registerPassword;
    if (hasMinLength && hasUpperCase && hasLowerCase && hasNumber) {
        input.classList.remove('border-red-500');
        input.classList.add('border-green-500');
    } else {
        input.classList.remove('border-green-500');
        input.classList.add('border-red-500');
    }
}

function validateUsername() {
    const username = elements.registerUsername.value;
    const isValid = /^[a-zA-Z0-9_]{3,50}$/.test(username);
    
    const input = elements.registerUsername;
    if (isValid) {
        input.classList.remove('border-red-500');
        input.classList.add('border-green-500');
    } else {
        input.classList.remove('border-green-500');
        input.classList.add('border-red-500');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value;
    
    if (!email || !password) {
        showError('Veuillez remplir tous les champs');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            if (elements.rememberMe.checked) {
                localStorage.setItem('rememberMe', 'true');
            }
            
            showSuccess('Connexion réussie ! Redirection...');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } else {
            showError(data.error || 'Erreur lors de la connexion');
        }
        
    } catch (error) {
        console.error('Erreur de connexion:', error);
        showError('Erreur de connexion au serveur');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = elements.registerFirstName.value.trim();
    const lastName = elements.registerLastName.value.trim();
    const username = elements.registerUsername.value.trim();
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value;
    
    if (!username || !email || !password) {
        showError('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    if (!elements.agreeTerms.checked) {
        showError('Veuillez accepter les conditions d\'utilisation');
        return;
    }
    
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(password)) {
        showError('Le mot de passe ne respecte pas les critères de sécurité');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
        showError('Le nom d\'utilisateur ne respecte pas le format requis');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName: firstName || null,
                lastName: lastName || null,
                username,
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showSuccess('Compte créé avec succès ! Redirection...');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } else {
            if (data.code === 'USER_EXISTS') {
                showError('Un utilisateur avec cet email ou nom d\'utilisateur existe déjà');
            } else if (data.details) {
                const errorDetails = data.details.map(detail => detail.msg).join(', ');
                showError(errorDetails);
            } else {
                showError(data.error || 'Erreur lors de l\'inscription');
            }
        }
        
    } catch (error) {
        console.error('Erreur d\'inscription:', error);
        showError('Erreur de connexion au serveur');
    } finally {
        hideLoading();
    }
}

function showLoading() {
    elements.loadingState.classList.remove('hidden');
    elements.loginForm.classList.add('hidden');
    elements.registerForm.classList.add('hidden');
    hideMessages();
}

function hideLoading() {
    elements.loadingState.classList.add('hidden');
    if (elements.loginTab.classList.contains('text-white')) {
        elements.loginForm.classList.remove('hidden');
    } else {
        elements.registerForm.classList.remove('hidden');
    }
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    elements.successMessage.classList.add('hidden');
}

function showSuccess(message) {
    elements.successMessage.textContent = message;
    elements.successMessage.classList.remove('hidden');
    elements.errorMessage.classList.add('hidden');
}

function hideMessages() {
    elements.errorMessage.classList.add('hidden');
    elements.successMessage.classList.add('hidden');
}

function createBlobAnimation() {
    const blobs = document.querySelectorAll('.animate-blob');
    blobs.forEach((blob, index) => {
        blob.style.animationDelay = `${index * 2}s`;
    });
}

createBlobAnimation(); 