class Bush {
  constructor(id) {
    this.bush = document.getElementById(id);
    this.position = 0;
    this.stop = false;
  }

  animate() {
    if (!this.stop) {
      this.position -= 0.13;

      const rect = this.bush.getBoundingClientRect();
      if (rect.right < 0) {
        this.position = 100;
      }

      this.bush.style.left = `${this.position}%`;

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

module.exports = Bush;
