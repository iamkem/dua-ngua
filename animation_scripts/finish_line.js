class FinishLine {
  constructor(id) {
    this.finishLine = document.getElementById(id);
    this.position = 100; // Start at 100% (Right edge)
    this.initialPosition = 100;
    this.speed = 0.18; // Speed in % per frame. Reduced from 0.5 for realistic look
    this.stop = false;

    // Reset style initial
    this.finishLine.style.opacity = 0;
    this.finishLine.style.left = "100%";
    // Reset any transform used before
    this.finishLine.style.transform = "none";
  }

  animate(callback) {
    if (!this.stop) {
      this.finishLine.style.opacity = 1;
      this.position -= this.speed;

      this.finishLine.style.left = `${this.position}%`;

      if (callback) callback(this.getPixelPosition());
    }
  }

  getPixelPosition() {
    // Return current X position in pixels for collision check
    return (this.position / 100) * window.innerWidth;
  }

  stopAnimation() {
    this.stop = true;
  }

  reset() {
    this.stop = false;
    this.position = this.initialPosition;
    this.finishLine.style.opacity = 0;
    this.finishLine.style.left = "105%";
    this.finishLine.style.transform = "none";
  }
}

module.exports = FinishLine;
