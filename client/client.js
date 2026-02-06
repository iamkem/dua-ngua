const { db } = require("../firebase_config.js");

// DOM Elements
const loginScreen = document.getElementById("login-screen");
const roomListScreen = document.getElementById("room-list-screen");
const bettingScreen = document.getElementById("betting-screen");
const usernameInput = document.getElementById("username-input");
const loginBtn = document.getElementById("login-btn");
const roomsContainer = document.getElementById("rooms-container");

const playerNameDisplay = document.getElementById("player-name");
const playerBalanceDisplay = document.getElementById("player-balance");
const horsesList = document.getElementById("horses-list");
const gameStatusDisplay = document.getElementById("game-status");

// Game State
let currentUser = null;
let currentBalance = 1000;
let currentRoomId = null;
let gameRef = null;
let playerRef = null;
let currentGameState = "waiting";

// Mock Data for Horses (will match assets)
const horsesData = [
  { id: 1, name: "Tia Chớp", color: "Red" },
  { id: 2, name: "Bão Táp", color: "Blue" },
  { id: 3, name: "Thần Gió", color: "Green" },
  { id: 4, name: "Xích Thố", color: "Yellow" },
  { id: 5, name: "Hắc Long", color: "Black" },
  { id: 6, name: "Bạch Mã", color: "White" },
  { id: 7, name: "Phi Vân", color: "Purple" },
];

function init() {
  if (loginBtn) loginBtn.addEventListener("click", handleLogin);
  window.joinRoom = joinRoom;

  // Check Session Storage & Auto Join
  const savedUser = sessionStorage.getItem("racing_user");
  if (savedUser) {
    currentUser = savedUser;
    usernameInput.value = savedUser; // Điền sẵn cho chắc

    // UI Transition: Skip Login
    loginScreen.classList.add("d-none");
    roomListScreen.classList.remove("d-none");
    fetchRooms(); // Load rooms anyway

    // Check Auto Join Param
    const urlParams = new URLSearchParams(window.location.search);
    const autoRoomId = urlParams.get('autoJoinRoom');

    if (autoRoomId) {
      console.log("Auto joining room:", autoRoomId);
      // Small delay to ensure DB is ready or UI transition is smooth
      setTimeout(() => joinRoom(autoRoomId), 500);
    }
  }
}

async function handleLogin() {
  const username = usernameInput.value.trim();
  if (!username) {
    alert("Vui lòng nhập tên!");
    return;
  }
  currentUser = username;
  sessionStorage.setItem("racing_user", currentUser); // SAVE SESSION

  // Chuyển sang màn hình danh sách phòng
  loginScreen.classList.add("d-none");
  roomListScreen.classList.remove("d-none");

  fetchRooms();
}

function fetchRooms() {
  roomsContainer.innerHTML = '<div class="col-12 text-center">Đang tải danh sách phòng...</div>';

  // Lắng nghe realtime danh sách phòng
  db.collection("games").where("status", "in", ["waiting", "racing"]).onSnapshot(snapshot => {
    roomsContainer.innerHTML = "";

    if (snapshot.empty) {
      roomsContainer.innerHTML = '<div class="col-12 text-center text-muted">Hiện chưa có phòng nào. Hãy bảo Host tạo phòng đi!</div>';
      return;
    }

    snapshot.forEach(doc => {
      const room = doc.data();
      const roomId = doc.id;
      const badge = room.status === "racing" ? '<span class="badge bg-danger">Đang đua</span>' : '<span class="badge bg-success">Đang chờ</span>';

      const col = document.createElement("div");
      col.className = "col-md-6 mb-3";
      col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title d-flex justify-content-between">
                            ${room.roomName || "Phòng vô danh"}
                            ${badge}
                        </h5>
                        <p class="card-text text-muted small">ID: ${roomId}</p>
                        <button onclick="joinRoom('${roomId}')" class="btn btn-primary w-100" ${room.status === 'racing' ? 'disabled' : ''}>
                            ${room.status === 'racing' ? 'Đang đua...' : 'Tham Gia Phòng'}
                        </button>
                    </div>
                </div>
            `;
      roomsContainer.appendChild(col);
    });
  });
}

async function joinRoom(roomId) {
  currentRoomId = roomId;
  gameRef = db.collection("games").doc(roomId);
  playerRef = gameRef.collection("players").doc(currentUser);

  // Chuyển UI
  roomListScreen.classList.add("d-none");
  bettingScreen.classList.remove("d-none");

  // Init Player Data
  try {
    const doc = await playerRef.get();
    if (doc.exists) {
      currentBalance = doc.data().balance;
    } else {
      // Logic mới: Giữ lại số dư nếu chuyển phòng
      const savedBalance = sessionStorage.getItem("racing_balance");
      currentBalance = savedBalance ? parseInt(savedBalance) : 1000;

      // Nếu không có balance hợp lệ (NaN/0/etc) thì fallback về 1000? 
      if (isNaN(currentBalance)) currentBalance = 1000;

      await playerRef.set({
        name: currentUser,
        balance: currentBalance,
        betHorse: null,
        betAmount: 0
      });
    }

    playerNameDisplay.textContent = currentUser;
    playerBalanceDisplay.textContent = currentBalance;

    renderHorses();
    listenToGame();
    listenToPlayers();

  } catch (err) {
    console.error("Join Room Error:", err);
    alert("Lỗi tham gia phòng: " + err.message);
    location.reload();
  }
}

function listenToGame() {
  gameRef.onSnapshot(doc => {
    // Nếu phòng bị xóa (Host thoát)
    if (!doc.exists) {
      alert("Chủ phòng đã thoát. Bạn sẽ quay về danh sách phòng.");
      // Quay về danh sách phòng
      bettingScreen.classList.add("d-none");
      roomListScreen.classList.remove("d-none");
      currentRoomId = null;
      return;
    }

    const data = doc.data();
    updateGameStatus(data.status, data.winner);
  });
}

function listenToPlayers() {
  gameRef.collection("players").onSnapshot(snapshot => {
    const playerCount = snapshot.size;
    const playersListEl = document.getElementById("client-players-list");
    const playerCountEl = document.getElementById("client-player-count");

    if (playerCountEl) playerCountEl.innerText = playerCount;

    if (playersListEl) {
      const listItems = [];
      snapshot.forEach(doc => {
        const p = doc.data();
        const isMe = p.name === currentUser ? " (Bạn)" : "";
        const badgeClass = p.name === currentUser ? "bg-success" : "bg-primary";

        listItems.push(`
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${p.name}${isMe}</span>
                <span class="badge ${badgeClass} rounded-pill">
                    ${p.betAmount > 0 ? `Đã cược ${p.betAmount}$` : 'Chưa cược'}
                </span>
            </li>
        `);
      });
      playersListEl.innerHTML = listItems.join("") || '<li class="list-group-item text-muted text-center">Chưa có ai...</li>';
    }
  });
}

function updateGameStatus(status, winner) {
  currentGameState = status;

  if (status === "waiting") {
    gameStatusDisplay.className = "alert alert-info text-center fw-bold";
    gameStatusDisplay.textContent = "Đang chờ đặt cược...";
    enableBetting(true);
  } else if (status === "racing") {
    gameStatusDisplay.className = "alert alert-warning text-center fw-bold";
    gameStatusDisplay.textContent = "Cuộc đua đang diễn ra! Chúc may mắn!";
    enableBetting(false);
  } else if (status === "finished") {
    enableBetting(false);
    if (winner) {
      handleRaceFinish(winner);
    }
  }
}

async function handleRaceFinish(winnerId) {
  // Fetch my latest bet info
  const playerDoc = await playerRef.get();
  const playerData = playerDoc.data();
  const myBetHorse = playerData.betHorse;
  const myBetAmount = playerData.betAmount;

  let message = `Ngựa số ${winnerId} về nhất!`;
  let alertClass = "alert-secondary";

  if (myBetHorse === winnerId) {
    const winAmount = myBetAmount * 5;
    currentBalance += winAmount;
    message += ` CHÚC MỪNG! Bạn thắng ${winAmount}$!`;
    alertClass = "alert-success";

    await playerRef.update({
      balance: currentBalance,
      betHorse: null,
      betAmount: 0
    });
  } else if (myBetHorse) {
    message += ` Rất tiếc, bạn thua ${myBetAmount}$.`;
    alertClass = "alert-danger";

    await playerRef.update({
      betHorse: null,
      betAmount: 0
    });
  } else {
    message += " Bạn không đặt cược ván này.";
  }

  gameStatusDisplay.className = `alert ${alertClass} text-center fw-bold`;
  gameStatusDisplay.textContent = message;
  playerBalanceDisplay.textContent = currentBalance;

  document.querySelectorAll(".horse-card").forEach(card => {
    card.classList.remove("selected-bet", "border-primary");
  });
}

function enableBetting(enabled) {
  const buttons = document.querySelectorAll(".bet-btn");
  buttons.forEach(btn => btn.disabled = !enabled);
}

function renderHorses() {
  horsesList.innerHTML = "";

  horsesData.forEach(horse => {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3";

    col.innerHTML = `
      <div class="card horse-card h-100 shadow-sm" data-id="${horse.id}">
        <div class="card-body text-center p-2">
          <h5 class="card-title">#${horse.id} - ${horse.name}</h5>
          <div class="rounded mb-2 p-1" style="background: #eee;">
             <img src="../assets/horses/${horse.id}/1.png" class="horse-img img-fluid" alt="${horse.name}">
          </div>
          <div class="bet-controls">
            <div class="input-group input-group-sm mb-2">
              <span class="input-group-text">$</span>
              <input type="number" class="form-control bet-amount-input" value="100" min="10" step="10" id="bet-input-${horse.id}">
            </div>
            <button class="btn btn-success btn-sm w-100 bet-btn">
              Đặt cược
            </button>
          </div>
        </div>
      </div>
    `;

    const btn = col.querySelector(".bet-btn");
    const input = col.querySelector(".bet-amount-input");

    btn.addEventListener("click", () => {
      const amount = parseInt(input.value);
      placeBet(horse.id, amount);
    });

    horsesList.appendChild(col);
  });
}

// Gán vào window để an toàn
window.placeBet = placeBet;

async function placeBet(horseId, amount) {
  if (currentGameState !== "waiting") {
    alert("Đang đua, không thể đặt cược!");
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    alert("Số tiền không hợp lệ!");
    return;
  }

  if (amount > currentBalance) {
    alert("Bạn không đủ tiền!");
    return;
  }

  // Optimistic UI update
  const previousBalance = currentBalance;
  currentBalance -= amount;
  playerBalanceDisplay.textContent = currentBalance;

  document.querySelectorAll(".horse-card").forEach(card => {
    card.classList.remove("selected-bet", "border-primary");
    if (parseInt(card.dataset.id) === horseId) {
      card.classList.add("selected-bet");
    }
  });

  try {
    await playerRef.update({
      betHorse: horseId,
      betAmount: amount,
      balance: currentBalance
    });
    alert(`Đã đặt ${amount}$ vào ngựa số ${horseId}! Đang chờ chủ phòng bắt đầu...`);

    // SỬA: Chuyển hướng sang xem đua với Room ID cụ thể
    window.location.href = `../host/index.html?role=viewer&roomId=${currentRoomId}`;

  } catch (err) {
    console.error("Bet error:", err);
    alert("Lỗi khi đặt cược, vui lòng thử lại.");
    currentBalance = previousBalance;
    playerBalanceDisplay.textContent = currentBalance;
  }
}

// Run init
init();
