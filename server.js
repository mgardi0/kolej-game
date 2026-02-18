// server.js - مێشکی یارییەکە
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

// دابینکردنی فایلەکان (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// زانیاری ژوورەکان لێرە پاشەکەوت دەکرێت
// Structure: { roomId: { password: '123', players: [], gameState: {} } }
let rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // ١. دروستکردنی ژوور (Create Room)
    socket.on('createRoom', ({ username, password }) => {
        const roomId = Math.floor(1000 + Math.random() * 9000).toString(); // ژمارەی ٤ ڕەقەمی
        
        rooms[roomId] = {
            password: password,
            players: [{ id: socket.id, username: username, hand: [], score: 0 }],
            gameState: 'waiting', // waiting, playing
            currentTurn: 0
        };

        socket.join(roomId);
        console.log(`Room ${roomId} created by ${username}`);
        
        // ناردنەوەی زانیاری بۆ ئەدمینی ژوور
        socket.emit('roomCreated', { roomId, players: rooms[roomId].players });
    });

    // ٢. چوونە ژوور (Join Room)
    socket.on('joinRoom', ({ roomId, password, username }) => {
        const room = rooms[roomId];

        if (!room) {
            socket.emit('errorMsg', 'ژمارەی ژوور هەڵەیە!');
            return;
        }
        if (room.password !== password) {
            socket.emit('errorMsg', 'پاسۆرد هەڵەیە!');
            return;
        }
        if (room.players.length >= 4) {
            socket.emit('errorMsg', 'ژوور پڕ بووە! (٤ کەس تەواوە)');
            return;
        }

        // زیادکردنی یاریزان بۆ ژوورەکە
        room.players.push({ id: socket.id, username: username, hand: [], score: 0 });
        socket.join(roomId);
        
        // ئاگادارکردنەوەی هەموو یاریزانەکان کە کەسێکی نوێ هات
        io.to(roomId).emit('updatePlayers', room.players);

        // ئەگەر ٤ کەس تەواو بوو، یاری دەست پێ دەکات
        if (room.players.length === 4) {
             io.to(roomId).emit('gameStart', { msg: 'یاری دەستی پێکرد!' });
             startGame(roomId);
        }
    });

    // ٣. مامەڵەکردن لەگەڵ کارت (Play Card)
    socket.on('playCard', ({ roomId, cardId }) => {
        // لێرەدا لۆژیکی کارتەکان دەنووسرێت (لە بەشەکانی تر وردی دەکەینەوە)
        io.to(roomId).emit('cardPlayed', { playerId: socket.id, cardId: cardId });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        // پاککردنەوەی ژوور ئەگەر بەتاڵ بوو (دواتر دەنووسرێت)
    });
});

// دەستپێکردنی یاری و دابەشکردنی کارتەکان
function startGame(roomId) {
    const room = rooms[roomId];
    room.gameState = 'playing';
    // لێرەدا کۆدی دابەشکردنی کارتەکان دەنووسین
    io.to(roomId).emit('dealCards', { /* cards data */ });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
