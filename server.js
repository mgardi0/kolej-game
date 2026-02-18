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
// لە ناو server.js ئەم بەشە نوێ بکەوە:

// لیستی کارتە کۆمیدییەکە (Kurdish Deck)
const deckTemplate = [
    { id: 1, text: "د. فەرهاد پیرباڵ", type: "card-farhad", power: 100 },
    { id: 2, text: "نوێنەری قاعە", type: "card-nwenar", power: 50 },
    { id: 3, text: "بەربانگی ئێوارە", type: "card-ramadan", power: 80 },
    { id: 4, text: "کویزی کتوپڕ", type: "card-shame", power: -20 },
    { id: 5, text: "غەیبەتی مامۆستا", type: "card-normal", power: 10 },
    { id: 6, text: "ئینزیبات", type: "card-shame", power: -50 },
    { id: 7, text: "خەوتن لە کۆتا ڕیز", type: "card-normal", power: 30 },
    { id: 8, text: "نەمانی شەحنی مۆبایل", type: "card-shame", power: -10 },
    { id: 9, text: "چای کافتریا", type: "card-normal", power: 5 },
    { id: 10, text: "مەعاش هات", type: "card-ramadan", power: 90 },
];

function generateDeck() {
    // کۆپی کردنی کارتەکان و تێکەڵکردنیان (Shuffle)
    let deck = [];
    for(let i=0; i<3; i++) { // سێ جار کارتەکان دووبارە دەبنەوە تا ژمارەیان زۆر بێت
        deck = deck.concat(JSON.parse(JSON.stringify(deckTemplate)));
    }
    return deck.sort(() => Math.random() - 0.5); // Shuffle
}

function startGame(roomId) {
    const room = rooms[roomId];
    room.gameState = 'playing';
    
    // دابەشکردنی کارت بۆ هەر یاریزانێک (٥ کارت)
    const gameDeck = generateDeck();
    
    room.players.forEach(player => {
        // ٥ کارت دەدەین بە یاریزانەکە
        player.hand = gameDeck.splice(0, 5); 
        
        // ناردنی کارتەکان تەنیا بۆ ئەو یاریزانە (کەس کارتەکانی ئەوی تر نەبینێت)
        io.to(player.id).emit('dealCards', { hand: player.hand });
    });

    console.log(`Game started in room ${roomId}`);
}
