const Bush = require("./bush.js");
const RoadLines = require("./road_lines.js");
const Fence = require("./fence.js");
const Tower = require("./tower.js");

class Map {
  constructor() {
    this.bush = new Bush("bush");
    this.roadLines = new RoadLines("road-lines");
    this.fenceA = new Fence("fence-a");
    this.fenceB = new Fence("fence-b");
    this.tower = new Tower("tower");
  }

  startAnimation() {
    this.bush.startAnimation();
    this.roadLines.startAnimation();
    this.fenceA.startAnimation();
    this.fenceB.startAnimation();
    this.tower.startAnimation();
  }

  stopAnimation() {
    this.bush.stopAnimation();
    this.roadLines.stopAnimation();
    this.fenceA.stopAnimation();
    this.fenceB.stopAnimation();
    this.tower.stopAnimation();
  }
}

module.exports = Map;
