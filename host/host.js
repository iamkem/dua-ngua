// 1. CHẨN ĐOÁN LỖI TOÀN CỤC
window.onerror = function (msg, url, line) {
    alert("PHÁT HIỆN LỖI SCRIPT:\n" + msg + "\nTại dòng: " + line);
    return false;
};

console.log("Hệ thống Host đang khởi động...");

// === PRNG GENERATOR (Mulberry32) ===
function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Global Variables
let currentRoomId = null;
let db = null;
let isViewer = false;
let hostBalance = 1000; // Tiền của Host

// Mock Data (Copy from Client)
const horsesData = [
    { id: 1, name: "Tia Chớp", color: "Red" },
    { id: 2, name: "Bão Táp", color: "Blue" },
    { id: 3, name: "Thần Gió", color: "Green" },
    { id: 4, name: "Xích Thố", color: "Yellow" },
    { id: 5, name: "Hắc Long", color: "Black" },
    { id: 6, name: "Bạch Mã", color: "White" },
    { id: 7, name: "Phi Vân", color: "Purple" },
];

// === MAIN ENTRY POINT ===
function startApp() {
    console.log("App Starting...");

    // Nạp Module
    try {
        const firebaseConfig = require("../firebase_config.js");
        db = firebaseConfig.db;
    } catch (e) {
        alert("Lỗi nạp Firebase: " + e.message);
        return;
    }

    // Check URL Params
    const urlParams = new URLSearchParams(window.location.search);
    isViewer = urlParams.get('role') === 'viewer';
    const roomIdParam = urlParams.get('roomId');

    if (isViewer) {
        // Viewer Mode: Ẩn overlay tạo phòng, vào thẳng game
        document.getElementById("create-room-overlay").classList.add("d-none");
        if (roomIdParam) {
            initGame(roomIdParam);
        } else {
            alert("Thiếu Room ID!");
            window.location.href = "../client/index.html";
        }
    } else {
        // Host Mode: Hiện overlay tạo phòng (đã có trong HTML)
        // Tìm nút tạo phòng và gắn sự kiện
        // Note: Trong HTML nút đang là <button onclick="window.handleCreateRoom()">
        // Ta sẽ ghi đè hoặc tốt nhất là sửa HTML để bỏ onclick, nhưng ở đây ta định nghĩa hàm window.handleCreateRoom cho tương thích
        window.handleCreateRoom = async function () {
            const nameInput = document.getElementById("room-name-input");
            const roomName = nameInput.value.trim();
            if (!roomName) {
                alert("Vui lòng nhập tên phòng!");
                return;
            }

            // Tạo Room ID ngẫu nhiên 6 ký tự
            const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

            try {
                // Tạo phòng trên Firebase
                await db.collection("games").doc(newRoomId).set({
                    roomName: roomName,
                    status: "waiting",
                    createdAt: Date.now(),
                    hostId: "host-" + Date.now(),
                    winner: null,
                    seed: null
                });

                // Thêm Host vào danh sách người chơi (Balance 1000)
                await db.collection("games").doc(newRoomId).collection("players").doc("HOST").set({
                    name: "Host (Chủ phòng)",
                    balance: 1000,
                    betAmount: 0,
                    betHorse: null,
                    isHost: true
                });

                // Xóa phòng khi thoát (Cải tiến dọn dẹp cả người chơi)
                window.addEventListener("beforeunload", () => {
                    const roomRef = db.collection("games").doc(newRoomId);
                    roomRef.collection("players").get().then(snapshot => {
                        const batch = db.batch();
                        snapshot.forEach(doc => batch.delete(doc.ref));
                        batch.delete(roomRef);
                        batch.commit();
                    });
                });

                // Vào game
                document.getElementById("create-room-overlay").classList.add("d-none");
                initGame(newRoomId);

            } catch (err) {
                console.error("Lỗi tạo phòng:", err);
                alert("Không thể tạo phòng: " + err.message);
            }
            // Hàm xóa phòng thủ công
            window.handleDeleteRoomManual = async function () {
                if (!currentRoomId) return;
                if (confirm("Bạn có chắc chắn muốn giải tán phòng và thoát không?")) {
                    await deleteRoomCompletely(currentRoomId);
                    window.location.reload();
                }
            };
        }
    }
}

// Hàm dọn dẹp Firebase triệt để
async function deleteRoomCompletely(roomId) {
    if (!roomId) return;
    try {
        const roomRef = db.collection("games").doc(roomId);
        const playersSnapshot = await roomRef.collection("players").get();
        const batch = db.batch();
        playersSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(roomRef);
        await batch.commit();
    } catch (err) {
        console.error("Lỗi xóa dọn dẹp phòng:", err);
    }
}

function initGame(roomId) {
    currentRoomId = roomId;
    if (document.getElementById("display-room-id")) {
        document.getElementById("display-room-id").innerText = roomId;
    }
    console.log("Khởi tạo Game tại phòng:", roomId);

    let Map, Player, FinishLine;
    try {
        Map = require("../animation_scripts/map.js");
        Player = require("../animation_scripts/player.js");
        FinishLine = require("../animation_scripts/finish_line.js");
    } catch (e) {
        console.error("Lỗi nạp animation scripts:", e);
    }

    const canvas = document.getElementById("race-canvas");
    const ctx = canvas.getContext("2d");
    const startButton = document.getElementById("start-button");
    const gameHud = document.getElementById("game-hud");
    const resultOverlay = document.getElementById("result-overlay");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let map, finishLine;
    try {
        map = new Map();
        finishLine = new FinishLine("finish-line");
    } catch (e) { }

    // Helper to calculate horse size based on screen
    function getHorseSize() {
        const laneHeight = window.innerHeight / 8;
        let size = laneHeight * 1.5;
        if (size > 200) size = 200; // Cap max size
        if (size < 60) size = 60;   // Cap min size
        return size;
    }

    const players = [];
    const initialSize = getHorseSize();
    for (let i = 1; i <= 7; i++) {
        const yPos = (canvas.height / 8) * (i - 1) + 60;
        const p = new Player(0, yPos, 8 - i);
        p.width = initialSize;
        p.height = initialSize;
        players.push(p);
    }

    // Game Logic Variables
    const VIRTUAL_TRACK_WIDTH = 800; // Track ảo cố định, không phụ thuộc screen size
    const VIRTUAL_FINISH_POS = VIRTUAL_TRACK_WIDTH * 0.90; // Win khi ngựa qua vạch 1 chút
    let isRacing = false;
    let isFinished = false;
    let isFinishApproaching = false;
    let currentRandom = Math.random;
    let raceSeed = 0;
    let finishLinePercent = 100;  // Vị trí % hiện tại của vạch đích
    let finishLineSpeed = 0;      // Tốc độ trôi mỗi frame

    // Host Betting Variables
    let myBetHorse = null;
    let myBetAmount = 0;

    // Fixed Time Step
    const TIME_STEP = 1000 / 60;
    let accumulator = 0;
    let lastTime = 0;

    // --- HOST LOGIC ---
    if (!isViewer) {
        initHostBetting(); // Setup betting UI

        // Nút Start - mặc định enable (host đua 1 mình)
        if (startButton) {
            startButton.disabled = false;
            startButton.onclick = function () {
                const seed = Date.now();
                db.collection("games").doc(roomId).update({
                    status: "racing",
                    seed: seed,
                    winner: null
                }).then(() => {
                    startRaceWithSeed(seed);
                });
            }
        }

        // Nút Giải tán phòng (Host Only)
        const manageBtn = document.getElementById("manage-room-btn");
        if (manageBtn) {
            manageBtn.onclick = async function () {
                if (confirm("CẢNH BÁO: Bạn có chắc chắn muốn GIẢI TÁN PHÒNG?\nTất cả kết nối sẽ bị ngắt.")) {
                    try {
                        await deleteRoomCompletely(roomId);
                        window.location.reload();
                    } catch (e) {
                        alert("Lỗi giải tán phòng: " + e.message);
                    }
                }
            };
        }
    }

    // --- COMMON LOGIC (HOST & VIEWER) ---
    // Lắng nghe người chơi tham gia (Update Realtime)
    db.collection("games").doc(roomId).collection("players").onSnapshot(snapshot => {
        const playerCount = snapshot.size;
        const playersList = [];
        let clientCount = 0;
        let readyCount = 0;

        snapshot.forEach(doc => {
            const p = doc.data();
            const isHost = p.isHost === true;

            // Đếm client (không phải host)
            if (!isHost) {
                clientCount++;
                if (p.ready) readyCount++;
            }

            // Hiển thị trạng thái
            let statusInfo = '';
            if (p.betAmount > 0) {
                statusInfo = `<span class="fw-bold text-success">Cược: ${p.betAmount}$ (#${p.betHorse})</span>`;
            } else if (!isHost && p.ready) {
                statusInfo = `<span class="badge bg-success">Sẵn sàng</span>`;
            } else if (!isHost) {
                statusInfo = `<span class="badge bg-secondary">Chưa sẵn sàng</span>`;
            } else {
                statusInfo = `<span class="text-muted fst-italic">Chưa cược</span>`;
            }
            playersList.push(`<li class="list-group-item d-flex justify-content-between"><strong>${p.name}</strong> ${statusInfo}</li>`);
        });

        if (document.getElementById("player-count"))
            document.getElementById("player-count").innerText = playerCount;
        if (document.getElementById("connected-players-list"))
            document.getElementById("connected-players-list").innerHTML = playersList.join("") || '<li class="list-group-item text-muted text-center">Chờ người chơi...</li>';

        // HOST: Kiểm tra điều kiện bắt đầu đua
        if (!isViewer && startButton && !isRacing && !isFinished) {
            if (clientCount === 0) {
                // Không có client -> Host đua 1 mình
                startButton.disabled = false;
                startButton.innerText = "BẮT ĐẦU ĐUA (Solo)";
            } else if (readyCount > 0) {
                // Có client và ít nhất 1 đã sẵn sàng
                startButton.disabled = false;
                startButton.innerText = `BẮT ĐẦU ĐUA (${readyCount}/${clientCount} sẵn sàng)`;
            } else {
                // Có client nhưng chưa ai sẵn sàng
                startButton.disabled = true;
                startButton.innerText = `CHỜ NGƯỜI CHƠI SẴN SÀNG (0/${clientCount})`;
            }
        }
    });

    // --- VIEWER SPECIFIC UI TWEAKS ---
    if (isViewer) {
        // 1. Ẩn nút cược của Host
        const hostBetBtn = document.getElementById("host-bet-btn");
        if (hostBetBtn) hostBetBtn.classList.add("d-none");

        // 2. Thêm nút Sẵn sàng cho Viewer
        const readyBtn = document.createElement("button");
        readyBtn.id = "viewer-ready-btn";
        readyBtn.className = "btn btn-primary btn-lg fw-bold mb-2";
        readyBtn.innerText = "SẴN SÀNG";
        // Chèn trước nút start
        const btnContainer = startButton ? startButton.parentElement : null;
        if (btnContainer && startButton) {
            btnContainer.insertBefore(readyBtn, startButton);
        }

        readyBtn.onclick = async function () {
            const currentUser = sessionStorage.getItem("racing_user");
            if (!currentUser) return;
            try {
                await db.collection("games").doc(roomId).collection("players").doc(currentUser).update({
                    ready: true
                });
                readyBtn.disabled = true;
                readyBtn.innerText = "ĐÃ SẴN SÀNG ✔";
                readyBtn.className = "btn btn-success btn-lg fw-bold mb-2";
            } catch (e) {
                console.error("Lỗi sẵn sàng:", e);
                alert("Lỗi: " + e.message);
            }
        };

        // 3. Đổi nút "Giải tán phòng" thành "Rời phòng"
        const manageBtn = document.getElementById("manage-room-btn");
        if (manageBtn) {
            manageBtn.innerText = "Rời phòng";
            manageBtn.className = "btn btn-outline-secondary btn-sm"; // Đổi màu xám cho nhẹ nhàng hơn
            manageBtn.onclick = async function () {
                if (confirm("Bạn có chắc chắn muốn rời phòng?")) {
                    try {
                        const currentUser = sessionStorage.getItem("racing_user");
                        if (!currentUser) {
                            window.location.href = "../client/index.html";
                            return;
                        }

                        const playerRef = db.collection("games").doc(roomId).collection("players").doc(currentUser);
                        const pDoc = await playerRef.get(); // Lấy data mới nhất từ DB
                        let finalBalance = 0;

                        if (pDoc.exists) {
                            const pData = pDoc.data();
                            finalBalance = pData.balance; // Số tiền hiện có (đã trừ cược)
                            if (pData.betAmount > 0) {
                                // Nếu chưa đua thì hoàn tiền
                                finalBalance += pData.betAmount;
                            }
                        }

                        // Xóa người chơi khỏi phòng
                        await playerRef.delete();

                        // 3. LƯU SỐ DƯ ĐỂ DÙNG CHO PHÒNG KHÁC
                        sessionStorage.setItem("racing_balance", finalBalance);

                        // Quay về màn chọn cược
                        window.location.href = "../client/index.html";
                    } catch (e) {
                        console.error("Lỗi rời phòng:", e);
                        window.location.href = "../client/index.html";
                    }
                }
            }
        }
    }

    // --- HOST BETTING LOGIC ---
    function initHostBetting() {
        const betBtn = document.getElementById("host-bet-btn");
        const modal = document.getElementById("host-bet-modal");
        const closeBtn = document.getElementById("close-bet-modal");
        const grid = document.getElementById("host-horses-grid");
        const balanceDisplay = document.getElementById("host-balance-display");
        const hudBtnDisplay = document.getElementById("host-bet-btn");

        // Toggle Modal
        betBtn.onclick = () => modal.classList.remove("d-none", "d-flex") || modal.classList.add("d-flex");
        closeBtn.onclick = () => modal.classList.add("d-none") || modal.classList.remove("d-flex");

        // Render Grid
        grid.innerHTML = "";
        horsesData.forEach(horse => {
            const col = document.createElement("div");
            col.className = "col-md-4 mb-3";
            col.innerHTML = `
                <div class="card h-100 shadow-sm horse-card-host" data-id="${horse.id}">
                    <div class="card-body text-center">
                        <h5 class="card-title">#${horse.id} - ${horse.name}</h5>
                        <img src="../assets/horses/${horse.id}/1.png" style="height:50px; image-rendering: pixelated;" class="mb-2">
                         <div class="input-group input-group-sm mb-2">
                            <input type="number" class="form-control" value="100" min="10" step="10" id="host-bet-val-${horse.id}">
                            <button class="btn btn-success host-place-bet-btn" data-id="${horse.id}">Cược</button>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });

        // Handle Bet Click (Event Delegation)
        grid.addEventListener('click', async (e) => {
            if (e.target.classList.contains('host-place-bet-btn')) {
                const btn = e.target;
                if (isRacing) { alert("Đang đua không thể cược!"); return; }

                const id = parseInt(btn.dataset.id);
                const input = document.getElementById(`host-bet-val-${id}`);
                const amount = parseInt(input.value);

                if (isNaN(amount) || amount <= 0) {
                    alert("Số tiền không hợp lệ!"); return;
                }

                // LOGIC CƯỢC THÔNG MINH (Hoàn tiền cũ -> Cược mới)
                let tempBalance = hostBalance;
                if (myBetAmount > 0) tempBalance += myBetAmount;

                if (tempBalance < amount) {
                    alert("Không đủ tiền!"); return;
                }

                // Thực hiện cược
                hostBalance = tempBalance - amount;
                myBetHorse = id;
                myBetAmount = amount;

                // Update UI
                balanceDisplay.innerText = hostBalance;
                const horseName = horsesData.find(h => h.id === id)?.name || id;
                hudBtnDisplay.innerText = `Đã cược ${amount}$ vào #${id} ${horseName} (Ví: ${hostBalance}$)`;
                modal.classList.add("d-none");
                modal.classList.remove("d-flex");

                // Highlight
                document.querySelectorAll(".horse-card-host").forEach(c => c.classList.remove("border-primary", "border-3"));
                const activeCard = grid.querySelector(`.horse-card-host[data-id="${id}"]`);
                if (activeCard) activeCard.classList.add("border-primary", "border-3");

                // Update Firebase
                try {
                    console.log(`Host betting via RoomID: ${roomId}`);
                    await db.collection("games").doc(roomId).collection("players").doc("HOST").update({
                        betAmount: myBetAmount,
                        betHorse: myBetHorse,
                        balance: hostBalance
                    });
                    console.log("Host bet updated in DB successfully");
                } catch (err) {
                    console.error("Error updating host bet:", err);
                    alert("Lỗi cập nhật cược lên hệ thống: " + err.message);
                    // Rollback local state optionally?
                    // For now just warn user
                }
            }
        });
    }

    function formatBalance(bal) {
        return bal >= 0 ? bal : 0;
    }

    // --- VIEWER LOGIC ---
    if (isViewer) {
        console.log("Viewer Mode Active");
        if (startButton) startButton.style.display = "none";
        if (document.getElementById("game-status-text"))
            document.getElementById("game-status-text").innerText = "Chờ chủ phòng...";

        // Đổi TEXT nút kết quả thành "Thoát"
        const resultBtn = document.getElementById("result-btn");
        if (resultBtn) {
            resultBtn.innerText = "Thoát";
            resultBtn.classList.replace("btn-primary", "btn-secondary"); // Đổi màu xám cho hợp ngữ cảnh thoát
        }

        // Lắng nghe phòng
        db.collection("games").doc(roomId).onSnapshot(doc => {
            if (!doc.exists) {
                alert("Phòng này đã bị giải tán!");
                window.location.href = "../client/index.html"; // Quay về client home
                return;
            }

            const data = doc.data();
            console.log("Room Update:", data.status);

            if (data.status === "racing" && !isRacing) {
                // Ẩn nút sẵn sàng khi đua bắt đầu
                const readyBtn = document.getElementById("viewer-ready-btn");
                if (readyBtn) readyBtn.style.display = "none";
                const seed = data.seed || Date.now();
                startRaceWithSeed(seed);
            }
            else if (data.status === "finished") {
                if (!isFinished) finishGame(data.winner);
            }
            // Reset nếu host bấm đua lại (về waiting)
            else if (data.status === "waiting" && isFinished) {
                // Quay về màn hình đặt cược cho ván mới
                window.location.href = `../client/index.html?autoJoinRoom=${currentRoomId}`;
            }
        });
    }

    // --- SHARED GAME FUNCTIONS ---

    // --- SHARED GAME FUNCTIONS ---

    // --- SOUND SYSTEM ---
    const neighSound = new Audio("../assets/sounds/horse-neigh.mp3");

    // Helper to stop sound safely
    function stopAllGallops() {
        players.forEach(p => {
            if (p.stopAudio) p.stopAudio();
        });
    }

    window.resetHostGame = function () {
        console.log("Resetting Game...");
        stopAllGallops(); // STOP ALL SOUNDS

        // 1. Reset Local State
        isRacing = false;
        isFinished = false;
        isFinishApproaching = false;
        raceSeed = 0;
        finishLinePercent = 100;
        finishLineSpeed = 0;

        // Reset Bet State Local
        myBetHorse = null;
        myBetAmount = 0;
        document.getElementById("host-bet-btn").innerText = `Cược (${hostBalance}$)`;
        if (!isViewer) {
            document.getElementById("host-bet-btn").disabled = false;
        }

        // 2. Reset UI
        if (resultOverlay) {
            resultOverlay.classList.remove("d-flex");
            resultOverlay.classList.add("d-none");
        }
        if (gameHud) {
            gameHud.classList.remove("d-none");
            // Reset text trạng thái
            if (document.getElementById("game-status-text"))
                document.getElementById("game-status-text").innerText = "Sẵn sàng";
        }
        if (startButton) {
            startButton.innerText = "BẮT ĐẦU ĐUA";
            startButton.classList.replace("btn-secondary", "btn-success");
        }

        // 3. Reset Objects
        if (map) map.stopAnimation();
        if (finishLine) finishLine.reset();
        players.forEach(p => {
            p.x = 0;
            p.speed = 0;
            if (p.stopAudio) p.stopAudio();
        });
        // Vẽ lại một khung hình tĩnh để ngựa về vạch xuất phát
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        players.forEach(p => {
            const savedX = p.x;
            p.x = (p.x / VIRTUAL_TRACK_WIDTH) * canvas.width;
            p.draw(ctx);
            p.x = savedX;
        });

        // 4. Update Firebase
        if (!isViewer) {
            // Reset trạng thái game
            db.collection("games").doc(roomId).update({
                status: "waiting",
                winner: null,
                seed: null
            });

            // Reset cược của người chơi (Force Clear Bets)
            db.collection("games").doc(roomId).collection("players").get().then(snapshot => {
                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.update(doc.ref, { betAmount: 0, betHorse: null, ready: false });
                });
                batch.commit().then(() => console.log("Đã reset cược của người chơi"));
            }).catch(console.error);
        }
    };

    function startRaceWithSeed(seed) {
        if (isRacing) return;

        // PLAY SOUND for EACH horse
        players.forEach(p => {
            if (p.playAudio) p.playAudio();
        });

        raceSeed = seed;
        currentRandom = mulberry32(raceSeed);

        isRacing = true;
        isFinished = false;
        isFinishApproaching = false;

        if (gameHud) gameHud.classList.add("d-none");
        if (map) map.startAnimation();

        players.forEach(p => {
            p.x = 0;
            // Slow down start speed (was * 2 + 2)
            p.speed = (currentRandom() * 1.5) + 1;
        });
    }

    function updateGameLogic() {
        if (!isRacing || isFinished) return;

        players.forEach(p => {
            p.move(); // Di chuyển theo đơn vị ảo
            if (currentRandom() < 0.02) p.speed = (currentRandom() * 2) + 1;

            // Chỉ HOST mới xác định kết quả
            if (!isViewer) {
                if (p.x >= VIRTUAL_FINISH_POS) {
                    if (!isFinished) {
                        finishGame(p.number);
                        db.collection("games").doc(roomId).update({
                            status: "finished",
                            winner: p.number
                        });
                    }
                }
            }
        });

        // Tìm ngựa dẫn đầu
        const leaderX = Math.max(...players.map(p => p.x));

        // Vị trí vạch đích = đầu ngựa khi win (85% + horseWidth%)
        const horseWidthPercent = (players[0].width / canvas.width) * 100;
        const finishTargetPercent = 85 + horseWidthPercent;

        // Tính trigger point: bắt đầu trôi sớm đủ để vạch đến kịp lúc
        // Road speed = 0.13%/frame, cần trôi (100 - target)% 
        const ROAD_SCROLL_SPEED = 0.13; // Cùng tốc độ road_lines.js
        const framesNeeded = (100 - finishTargetPercent) / ROAD_SCROLL_SPEED;
        // Ước tính leader trung bình di chuyển ~0.5 virtual/frame
        const avgSpeed = 0.5;
        const triggerPos = VIRTUAL_FINISH_POS - (framesNeeded * avgSpeed);
        const approachStart = Math.max(triggerPos, VIRTUAL_TRACK_WIDTH * 0.5);

        // Khi ngựa dẫn đầu đạt trigger point → bắt đầu animate vạch đích
        if (leaderX > approachStart && finishLine) {
            if (!isFinishApproaching) {
                isFinishApproaching = true;
                finishLinePercent = 100;
                finishLineSpeed = ROAD_SCROLL_SPEED;
            }

            // Trôi đều mỗi frame - cùng tốc độ đường
            finishLinePercent -= finishLineSpeed;
            if (finishLinePercent < finishTargetPercent) finishLinePercent = finishTargetPercent;

            finishLine.finishLine.style.opacity = 1;
            finishLine.finishLine.style.left = finishLinePercent + "%";
        }
    }

    async function finishGame(winnerId) {
        if (isFinished) return;
        isFinished = true;
        isRacing = false;

        stopAllGallops(); // STOP ALL SOUNDS
        neighSound.play().catch(e => console.log("Neigh sound failed:", e)); // PLAY NEIGH

        if (map) map.stopAnimation();
        if (finishLine) finishLine.stopAnimation();

        document.getElementById("winner-text").innerText = "Ngựa số " + winnerId + " đã thắng!";
        resultOverlay.classList.remove("d-none");
        resultOverlay.classList.add("d-flex");

        // --- HOST WIN LOGIC ---
        if (!isViewer && myBetHorse) {
            if (myBetHorse === winnerId) {
                const win = myBetAmount * 5;
                hostBalance += win;
                alert(`Host thắng ${win}$!`);
            } else {
                // Host thua
            }
            // Update balance UI & DB
            document.getElementById("host-balance-display").innerText = formatBalance(hostBalance);
            document.getElementById("host-bet-btn").innerText = `Cược (${hostBalance}$)`;

            try {
                await db.collection("games").doc(roomId).collection("players").doc("HOST").update({
                    balance: hostBalance,
                    betAmount: 0,
                    betHorse: null
                });
            } catch (e) {
                console.error("Lỗi cập nhật balance Host:", e);
            }
        }

        // --- VIEWER WIN LOGIC ---
        if (isViewer) {
            const currentUser = sessionStorage.getItem("racing_user");
            if (currentUser) {
                try {
                    const playerRef = db.collection("games").doc(roomId).collection("players").doc(currentUser);
                    const pDoc = await playerRef.get();

                    if (pDoc.exists) {
                        const pData = pDoc.data();
                        const myBetHorse = pData.betHorse;
                        const myBetAmount = pData.betAmount;
                        let newBalance = pData.balance;

                        let msg = "";
                        if (myBetHorse === winnerId) {
                            const win = myBetAmount * 5;
                            newBalance += win;
                            msg = `CHÚC MỪNG! Bạn đã thắng ${win}$!`;
                        } else if (myBetHorse) {
                            msg = `Rất tiếc, bạn đã thua cược.`;
                        } else {
                            msg = `Bạn không tham gia cược ván này.`;
                        }

                        // Cập nhật lại DB
                        await playerRef.update({
                            balance: newBalance,
                            betAmount: 0,
                            betHorse: null
                        });

                        sessionStorage.setItem("racing_balance", newBalance);
                        if (myBetHorse) alert(msg + `\nSố dư hiện tại: ${newBalance}$`);
                    }
                } catch (e) {
                    console.error("Lỗi xử lý kết quả Viewer:", e);
                }
            }
        }
    }

    function mainLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        accumulator += (timestamp - lastTime);
        lastTime = timestamp;

        let loops = 0;
        while (accumulator >= TIME_STEP && loops < 10) {
            updateGameLogic();
            accumulator -= TIME_STEP;
            loops++;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (isRacing && isFinishApproaching && finishLine) {
            // Finish line đã được sync trong updateGameLogic, không cần animate riêng
        }

        // Scale virtual coords → screen coords khi vẽ
        players.forEach(p => {
            p.update();
            const savedX = p.x;
            p.x = (p.x / VIRTUAL_TRACK_WIDTH) * canvas.width;
            p.draw(ctx);
            p.x = savedX; // Khôi phục virtual coords
        });

        requestAnimationFrame(mainLoop);
    }

    // Auto Resize logic
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const newSize = getHorseSize();

        // Re-calculate Y positions for players to match new height
        players.forEach((p, index) => {
            p.y = (canvas.height / 8) * index + 60;
            p.width = newSize;
            p.height = newSize;
        });

        // Redraw if static
        if (!isRacing && !isFinished) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            players.forEach(p => {
                const savedX = p.x;
                p.x = (p.x / VIRTUAL_TRACK_WIDTH) * canvas.width;
                p.draw(ctx);
                p.x = savedX;
            });
        }
    });

    // Start Loop
    requestAnimationFrame(mainLoop);
}

// Boot
if (document.readyState === "complete" || document.readyState === "interactive") {
    startApp();
} else {
    window.onload = startApp;
}
