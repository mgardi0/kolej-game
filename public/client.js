// public/client.js - مێشکی یاریزان (Client Side)

const socket = io();

// گۆڕاوەکان بۆ کۆنتڕۆڵکردنی HTML
const screens = {
    login: document.getElementById('login-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

let myRoomId = null;
let myUsername = null;
let isMyTurn = false;

// --- ١. بەشی گۆڕینی شاشەکان ---

function showScreen(screenName) {
    // هەموو شاشەکان دەشارێتەوە
    Object.values(screens).forEach(s => s.classList.remove('active'));
    // شاشەی دیاریکراو نیشان دەدات
    screens[screenName].classList.add('active');
}

function showTab(tab) {
    const createSec = document.getElementById('create-section');
    const joinSec = document.getElementById('join-section');
    const createBtn = document.querySelector('button[onclick="showTab(\'create\')"]');
    const joinBtn = document.querySelector('button[onclick="showTab(\'join\')"]');

    if (tab === 'create') {
        createSec.style.display = 'block';
        joinSec.style.display = 'none';
        createBtn.classList.add('active-tab');
        joinBtn.classList.remove('active-tab');
    } else {
        createSec.style.display = 'none';
        joinSec.style.display = 'block';
        createBtn.classList.remove('active-tab');
        joinBtn.classList.add('active-tab');
    }
}

// --- ٢. بەشی پەیوەندی بە سێرڤەر (Socket Events) ---

// دروستکردنی ژوور
function createRoom() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('new-room-pass').value;

    if (!username || !password) {
        alert("تکایە ناو و پاسۆرد بنووسە!");
        return;
    }

    myUsername = username;
    socket.emit('createRoom', { username, password });
}

// وەڵامی سێرڤەر بۆ دروستکردنی ژوور
socket.on('roomCreated', (data) => {
    myRoomId = data.roomId;
    document.getElementById('display-room-id').innerText = myRoomId;
    updateLobbyPlayers(data.players);
    showScreen('lobby');
});

// جۆینکردنی ژوور
function joinRoom() {
    const username = document.getElementById('username').value;
    const roomId = document.getElementById('room-id-input').value;
    const password = document.getElementById('room-pass-input').value;

    if (!username || !roomId || !password) {
        alert("تکایە هەموو خانەکان پڕ بکەوە!");
        return;
    }

    myUsername = username;
    myRoomId = roomId;
    socket.emit('joinRoom', { roomId, password, username });
}

// نوێکردنەوەی لیستی یاریزانەکان لە ژووری چاوەڕوانی
socket.on('updatePlayers', (players) => {
    updateLobbyPlayers(players);
});

function updateLobbyPlayers(players) {
    const list = document.getElementById('players-list');
    list.innerHTML = '';
    players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'player-item';
        div.innerText = `👤 ${p.username}`;
        list.appendChild(div);
    });
}

// هەڵەکان (Errors)
socket.on('errorMsg', (msg) => {
    alert(msg);
});

// --- ٣. بەشی دەستپێکردنی یاری (Game Logic) ---

socket.on('gameStart', (data) => {
    alert(data.msg); // "یاری دەستی پێکرد!"
    showScreen('game');
});

// وەرگرتنی کارتەکان (Deal Cards)
socket.on('dealCards', (data) => {
    const myHand = data.hand;
    renderHand(myHand);
});

// وێنەکێشانی کارتەکانی ناو دەست (UI Rendering)
function renderHand(cards) {
    const handDiv = document.getElementById('my-hand');
    handDiv.innerHTML = ''; // پاککردنەوە

    cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.type}`; // card-farhad, card-ramadan...
        cardEl.innerText = card.text;
        cardEl.dataset.id = card.id;
        
        // زیادکردنی وێنەی بچووک یان ئایکۆن بۆ جوانی
        if(card.type === 'card-farhad') cardEl.innerHTML += '<br><small>⚠️ مەترسی</small>';
        if(card.type === 'card-ramadan') cardEl.innerHTML += '<br><small>🌙 پیرۆزە</small>';

        // کلیککردن بۆ یاریکردن
        cardEl.onclick = () => playCard(card.id, cardEl);
        
        // دواخستنی دەرکەوتن بۆ ئەنیمەیشن (Staggered Animation)
        cardEl.style.opacity = '0';
        handDiv.appendChild(cardEl);
        
        setTimeout(() => {
            cardEl.style.opacity = '1';
            cardEl.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// یاریکردن بە کارتێک
function playCard(cardId, element) {
    // ناردن بۆ سێرڤەر
    socket.emit('playCard', { roomId: myRoomId, cardId: cardId });
    
    // ئەنیمەیشنی فڕێدان (Visual Feedback)
    element.style.transform = "translateY(-300px) rotate(10deg) scale(0.5)";
    element.style.opacity = "0";
    
    setTimeout(() => {
        element.remove(); // سڕینەوە لە دەست
    }, 500);
}

// کاتێک یاریزانێکی تر کارتێک دەدات
socket.on('cardPlayed', (data) => {
    const slot = document.getElementById('played-card-slot');
    
    // دروستکردنی کارتی سەر مێز
    const playedCard = document.createElement('div');
    playedCard.className = 'card';
    playedCard.style.position = 'absolute';
    playedCard.innerText = "کارتی یاریزان..."; // لێرە دەتوانین زانیاری کارتەکە بنێرین
    
    // ئەگەر کارتی خۆت نەبوو، دەبێ وێنەکەی بێت
    // لێرەدا دەتوانین دەنگ زیاد بکەین (Audio)
    if(data.playerId !== socket.id) {
        playSound('card-flip');
    }

    slot.innerHTML = ''; // پاککردنەوەی کارتی پێشوو
    slot.appendChild(playedCard);
    
    // ئەنیمەیشنی دەرکەوتن
    playedCard.animate([
        { transform: 'scale(2)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
    ], { duration: 300 });
});

// --- ٤. زیادکردنی دەنگەکان (Optional) ---
function playSound(type) {
    // دەتوانین فایلی mp3 زیاد بکەین دواتر
    console.log("Playing sound:", type);
}

