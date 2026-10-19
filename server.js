const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Estado de usuarios: socket.id -> { username, currentRoom }
const connectedUsers = {};

// 🌟 HISTORIAL DE MENSAJES POR CANAL
const channelMessages = {
    'general': [],
    'proyectos-node': [],
    'recursos': []
};

// Obtener lista de nombres en una sala específica
function getUsersInRoom(room) {
    const roomUsers = [];
    for (const [id, user] of Object.entries(connectedUsers)) {
        if (user.currentRoom === room) {
            roomUsers.push(user.username);
        }
    }
    return roomUsers;
}

io.on('connection', (socket) => {
    // 1. Unirse inicialmente (Canal por defecto: general)
    socket.on('user:join', (username) => {
        const cleanName = username.trim() || 'Usuario Anónimo';
        const defaultRoom = 'general';

        connectedUsers[socket.id] = {
            username: cleanName,
            currentRoom: defaultRoom
        };

        socket.join(defaultRoom);

        // 🌟 Enviar historial del canal 'general' al usuario que entra
        socket.emit('channel:history', channelMessages[defaultRoom] || []);

        // Notificar a los miembros del canal
        io.to(defaultRoom).emit('users:update', getUsersInRoom(defaultRoom));
        socket.broadcast.to(defaultRoom).emit('chat:notification', {
            text: `${cleanName} ha entrado al canal.`,
            type: 'join',
            time: getFormattedTime()
        });
    });

    // 2. CAMBIO DE CANAL / SALA
    socket.on('channel:switch', (targetRoom) => {
        const user = connectedUsers[socket.id];
        if (!user || user.currentRoom === targetRoom) return;

        const oldRoom = user.currentRoom;

        // Salir de la sala anterior
        socket.leave(oldRoom);
        socket.broadcast.to(oldRoom).emit('chat:notification', {
            text: `${user.username} ha salido del canal.`,
            type: 'leave',
            time: getFormattedTime()
        });
        io.to(oldRoom).emit('users:update', getUsersInRoom(oldRoom));

        // Entrar a la nueva sala
        user.currentRoom = targetRoom;
        socket.join(targetRoom);

        // Crear la sala en memoria si no existe
        if (!channelMessages[targetRoom]) {
            channelMessages[targetRoom] = [];
        }

        // 🌟 Enviar historial del NUEVO canal al usuario
        socket.emit('channel:history', channelMessages[targetRoom]);

        // Notificar a la nueva sala
        socket.broadcast.to(targetRoom).emit('chat:notification', {
            text: `${user.username} se ha unido al canal.`,
            type: 'join',
            time: getFormattedTime()
        });
        io.to(targetRoom).emit('users:update', getUsersInRoom(targetRoom));
    });

    // 3. Envío de mensaje
    socket.on('chat:message', (data) => {
        const user = connectedUsers[socket.id];
        if (!user) return;

        const msgData = {
            username: user.username,
            message: data.message,
            time: getFormattedTime(),
            senderId: socket.id
        };

        // 🌟 Guardar mensaje en el historial del canal actual
        if (!channelMessages[user.currentRoom]) {
            channelMessages[user.currentRoom] = [];
        }
        channelMessages[user.currentRoom].push(msgData);

        // Limitar historial a los últimos 50 mensajes por canal
        if (channelMessages[user.currentRoom].length > 50) {
            channelMessages[user.currentRoom].shift();
        }

        // Transmitir mensaje solo a los miembros del canal
        io.to(user.currentRoom).emit('chat:message', msgData);
    });

    // 4. Indicador de "Escribiendo..."
    socket.on('chat:typing', (isTyping) => {
        const user = connectedUsers[socket.id];
        if (user) {
            socket.broadcast.to(user.currentRoom).emit('chat:typing', {
                username: user.username,
                isTyping: isTyping
            });
        }
    });

    // 5. Desconexión
    socket.on('disconnect', () => {
        const user = connectedUsers[socket.id];
        if (user) {
            const room = user.currentRoom;
            delete connectedUsers[socket.id];

            io.to(room).emit('users:update', getUsersInRoom(room));
            io.to(room).emit('chat:notification', {
                text: `${user.username} ha abandonado la sala.`,
                type: 'leave',
                time: getFormattedTime()
            });
        }
    });
});

function getFormattedTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});