class FinishLine {
  constructor(id, position = 0) {
    this.finishLine = document.getElementById(id);

    this.positon = position;
    this.initialPosition = position;

    this.finishLine.style.opacity = 0;
    this.stop = false;
  }

  animate(callback) {
    if (!this.stop) {
      this.finishLine.style.opacity = 1;

      // Tăng tốc độ di chuyển ngược lại để gặp ngựa (từ 0.08 lên 2)
      const pos = (this.positon -= 2);

      this.finishLine.style.transform = `translateX(${pos}px)`;

      if (callback) callback(pos);
    }
  }

  stopAnimation() {
    this.stop = true;
  }

  reset() {
    this.stop = false;
    this.positon = this.initialPosition;
    this.finishLine.style.opacity = 0;
    this.finishLine.style.transform = `translateX(${this.initialPosition}px)`;
  }
}

module.exports = FinishLine;
