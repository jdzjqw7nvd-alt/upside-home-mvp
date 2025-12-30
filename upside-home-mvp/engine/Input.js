export default class Input {
  constructor() {
    this.keys = new Set();
    this.axis = { x: 0, y: 0 };
    this.shift = false;
    this._onKeyDown = (event) => {
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
      }
      if (event.key === "Shift") {
        this.shift = true;
      }
      this.keys.add(event.key.toLowerCase());
      this._updateAxis();
    };
    this._onKeyUp = (event) => {
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
      }
      if (event.key === "Shift") {
        this.shift = false;
      }
      this.keys.delete(event.key.toLowerCase());
      this._updateAxis();
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  _updateAxis() {
    const left = this.keys.has("a") || this.keys.has("arrowleft");
    const right = this.keys.has("d") || this.keys.has("arrowright");
    const up = this.keys.has("w") || this.keys.has("arrowup");
    const down = this.keys.has("s") || this.keys.has("arrowdown");
    this.axis.x = (right ? 1 : 0) - (left ? 1 : 0);
    this.axis.y = (down ? 1 : 0) - (up ? 1 : 0);
  }

  isMoving() {
    return this.axis.x !== 0 || this.axis.y !== 0;
  }

  speedFactor() {
    return this.shift ? 2 : 1;
  }
}
