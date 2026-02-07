class Player {
  constructor(x, y, number, speed = 0) {
    this.x = x;
    this.y = y;
    this.width = 150;
    this.height = 150;
    this.speed = speed;
    this.number = number; // Số của player

    // Các khung hình hoạt ảnh
    this.frames = Array.from({ length: 4 }, (_, i) => i + 1).map((index) => {
      const img = new Image();
      img.src = `../assets/horses/${this.number}/${index}.png`;
      return img;
    });

    this.frameIndex = 0; // Khung hình hiện tại
    this.frameSpeed = 20; // Tốc độ chuyển frame
    this.frameCount = 0; // Bộ đếm để thay đổi khung hình
    this.stop = false; // Dừng hoạt ảnh

    // Sound for this horse
    this.gallopSound = new Audio("../assets/sounds/horse-galloping.mp3");
    this.gallopSound.loop = true;
    this.gallopSound.volume = 0.3; // Lower volume for individual horse
    // Randomize pitch/speed slightly for realistic herd effect
    this.gallopSound.playbackRate = 1.5 + Math.random() * 0.5;
  }

  playAudio() {
    this.gallopSound.play().catch(() => { });
  }

  stopAudio() {
    this.gallopSound.pause();
    this.gallopSound.currentTime = 0;
  }

  draw(context) {
    const currentFrame = this.frames[this.frameIndex];

    context.drawImage(currentFrame, this.x, this.y, this.width, this.height);
  }

  update() {
    // if (this.x > canvasWidth) this.x = -this.width; // Quay lại khi ra khỏi canvas

    // Cập nhật khung hình
    if (!this.stop) {
      this.frameCount++;

      if (this.frameCount >= this.frameSpeed) {
        this.frameIndex = (this.frameIndex + 1) % this.frames.length; // Lặp qua các khung hình
        this.frameCount = 0;
      }
    }
  }

  move() {
    // Di chuyển player
    this.x += this.speed / 4;
  }
}

module.exports = Player;
