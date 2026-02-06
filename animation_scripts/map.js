import Bush from "./bush.js";
import RoadLines from "./road_lines.js";
import Fence from "./fence.js";
import Tower from "./tower.js";

export default class Map {
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
