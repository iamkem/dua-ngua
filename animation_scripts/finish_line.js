export default class FinishLine {
  constructor(id, position = 0) {
    this.finishLine = document.getElementById(id);

    this.positon = position;

    this.finishLine.style.opacity = 0;
    this.stop = false;
  }

  animate(callback) {
    if (!this.stop) {
      this.finishLine.style.opacity = 1;

      const pos = (this.positon -= 0.08);

      this.finishLine.style.transform = `translateX(${pos}px)`;

      callback(pos);
    }
  }

  stopAnimation() {
    this.stop = true;
  }
}
