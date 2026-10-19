const socket = io();

// Elementos DOM
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messagesBox = document.getElementById('messages-box');
const usersList = document.getElementById('users-list');
const userCount = document.getElementById('user-count');
const currentUserDisplay = document.getElementById('current-user-display');
const userAvatarFooter = document.getElementById('user-avatar-footer');
const typingIndicator = document.getElementById('typing-indicator');
const typingText = document.getElementById('typing-text');

const currentChannelTitle = document.getElementById('current-channel-title');
const welcomeChannelTitle = document.getElementById('welcome-channel-title');
const channelItems = document.querySelectorAll('.channel-item');

let currentUsername = '';
let currentChannel = 'general';
let typingTimeout = null;

const avatarColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

// 1. Ingresar al Chat
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (name) {
        currentUsername = name;
        currentUserDisplay.textContent = currentUsername;
        
        const initial = currentUsername.charAt(0).toUpperCase();
        userAvatarFooter.textContent = initial;
        userAvatarFooter.style.backgroundColor = getAvatarColor(currentUsername);

        socket.emit('user:join', currentUsername);
        loginModal.style.display = 'none';
        messageInput.focus();
    }
});

// 2. Cambio de canal al hacer clic
channelItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetChannel = item.getAttribute('data-channel');
        if (targetChannel === currentChannel) return;

        channelItems.forEach(c => c.classList.remove('active'));
        item.classList.add('active');

        currentChannel = targetChannel;

        // Actualizar UI del canal
        currentChannelTitle.textContent = currentChannel;
        welcomeChannelTitle.textContent = `¡Bienvenido al canal #${currentChannel}!`;
        messageInput.placeholder = `Enviar mensaje a #${currentChannel}`;

        // Notificar al servidor el cambio de canal
        socket.emit('channel:switch', currentChannel);
    });
});

// 🌟 3. RECIBIR Y RENDERIZAR HISTORIAL DEL CANAL ACTIVO
socket.on('channel:history', (messages) => {
    // Resetear la caja con el mensaje de bienvenida
    messagesBox.innerHTML = `
        <div class="channel-welcome">
            <div class="welcome-icon"><i class="fa-solid fa-hashtag"></i></div>
            <h1>¡Bienvenido al canal #${currentChannel}!</h1>
            <p>Este es el inicio de la conversación en tiempo real para este canal.</p>
        </div>
    `;

    // Cargar todos los mensajes previos guardados de este canal
    messages.forEach(data => {
        renderSingleMessage(data);
    });

    scrollToBottom();
});

// 4. Enviar mensaje
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (msg) {
        socket.emit('chat:message', { message: msg });
        messageInput.value = '';
        socket.emit('chat:typing', false);
    }
});

// 5. Notificar escritura
messageInput.addEventListener('input', () => {
    socket.emit('chat:typing', true);
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('chat:typing', false);
    }, 1500);
});

// Recibir mensaje nuevo en vivo
socket.on('chat:message', (data) => {
    renderSingleMessage(data);
    scrollToBottom();
});

// Función auxiliar para renderizar un mensaje
function renderSingleMessage(data) {
    const isOwn = data.senderId === socket.id;
    const initial = data.username.charAt(0).toUpperCase();
    const color = getAvatarColor(data.username);

    const msgEl = document.createElement('div');
    msgEl.classList.add('custom-chat-message');

    msgEl.innerHTML = `
        <div class="avatar-circle" style="background-color: ${color}; width: 38px; height: 38px; font-size: 1rem;">
            ${initial}
        </div>
        <div class="msg-content">
            <div class="msg-header">
                <span class="msg-author" style="${isOwn ? 'color: #818cf8;' : ''}">${escapeHtml(data.username)}</span>
                <span class="msg-timestamp">hoy a las ${data.time}</span>
            </div>
            <div class="msg-text">${escapeHtml(data.message)}</div>
        </div>
    `;

    messagesBox.appendChild(msgEl);
}

// Notificaciones del sistema
socket.on('chat:notification', (data) => {
    const notifEl = document.createElement('div');
    notifEl.classList.add('system-chat-msg');
    
    const icon = data.type === 'join' ? 'fa-user-plus' : 'fa-user-minus';
    const color = data.type === 'join' ? '#22c55e' : '#ef4444';

    notifEl.innerHTML = `
        <i class="fa-solid ${icon}" style="color: ${color}"></i>
        <span><strong>${escapeHtml(data.text)}</strong> <small>(${data.time})</small></span>
    `;

    messagesBox.appendChild(notifEl);
    scrollToBottom();
});

// Actualizar lista de miembros
socket.on('users:update', (users) => {
    userCount.textContent = users.length;
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const initial = user.charAt(0).toUpperCase();
        const color = getAvatarColor(user);

        const li = document.createElement('li');
        li.classList.add('member-item');
        li.innerHTML = `
            <div class="avatar-circle" style="background-color: ${color}; width: 30px; height: 30px; font-size: 0.8rem;">
                ${initial}
            </div>
            <span class="member-name">${escapeHtml(user)}</span>
        `;
        usersList.appendChild(li);
    });
});

// Indicador de tipeo
socket.on('chat:typing', (data) => {
    if (data.isTyping) {
        typingText.textContent = `${data.username} está escribiendo...`;
        typingIndicator.classList.remove('hidden');
    } else {
        typingIndicator.classList.add('hidden');
    }
});

function scrollToBottom() {
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}