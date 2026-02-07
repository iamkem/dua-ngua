class Tower {
  constructor(id) {
    this.position = 0;
    this.tower = document.getElementById(id);
    this.stop = false;
  }

  animate() {
    if (!this.stop) {
      this.position -= 0.12;

      const rect = this.tower.getBoundingClientRect();
      if (rect.right < 0) {
        this.position = 100;
      }

      this.tower.style.left = `${this.position}%`;

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

module.exports = Tower;
