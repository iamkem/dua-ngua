class Fence {
  constructor(id) {
    this.position = 0;
    this.fence1 = document.getElementById(`${id}1`);
    this.fence2 = document.getElementById(`${id}2`);
    this.stop = false;
  }

  animate() {
    if (!this.stop) {
      this.position -= 0.13;

      if (this.position < -100) {
        this.position = 0;
      }

      this.fence1.style.transform = `translateX(${this.position}%)`;
      this.fence2.style.transform = `translateX(${this.position + 100}%)`;

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

module.exports = Fence;
