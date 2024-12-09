const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ví dụ hoạt ảnh đơn giản
let x = 0;

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(x, canvas.height / 2 - 25, 50, 50);

  x += 2;
  if (x > canvas.width) x = 0;

  requestAnimationFrame(gameLoop);
}

gameLoop();
