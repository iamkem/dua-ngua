export default class RoadLines {
  constructor(id) {
    this.roadLines = document.getElementById(id);
    this.position = 0;
    this.stop = false;
  }

  animate() {
    if (!this.stop) {
      this.position -= 0.13;

      if (this.position < window.innerWidth * -0.1) {
        this.position = 100;
      }

      this.roadLines.style.left = `${this.position}%`;

      requestAnimationFrame(this.animate.bind(this));
    } else {
      cancelAnimationFrame(this.animate.bind(this));
    }
  }

  startAnimation() {
    this.stop = false;
    this.animate();
  }

  stopAnimation() {
    this.stop = true;
  }
}
