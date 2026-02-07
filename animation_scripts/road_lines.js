class RoadLines {
  constructor(id) {
    this.roadLines1 = document.getElementById(id);
    this.roadLines2 = document.getElementById(id + "2"); // road-lines2
    this.position = 0;
    this.stop = false;
  }

  animate() {
    if (!this.stop) {
      this.position -= 0.13;

      if (this.position < -100) {
        this.position = 0;
      }

      if (this.roadLines1)
        this.roadLines1.style.transform = `translateX(${this.position}%)`;
      if (this.roadLines2)
        this.roadLines2.style.transform = `translateX(${this.position + 100}%)`;

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

module.exports = RoadLines;
