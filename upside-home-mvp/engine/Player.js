export default class Player {
  constructor({ x, y, tileSize, speed }) {
    this.x = x;
    this.y = y;
    this.tileSize = tileSize;
    this.radius = tileSize * 0.45;
    this.speed = speed;
    this.hasKey = false;
  }

  update(dt, input, map) {
    const length = Math.hypot(input.axis.x, input.axis.y) || 1;
    const dirX = input.axis.x / length;
    const dirY = input.axis.y / length;
    const step = this.speed * input.speedFactor() * dt;
    const nextX = this.x + dirX * step;
    const nextY = this.y + dirY * step;

    this.x = this._moveAxis(nextX, this.y, map).x;
    this.y = this._moveAxis(this.x, nextY, map).y;
  }

  _moveAxis(nextX, nextY, map) {
    if (!map || !map.isWallAt(nextX, nextY, this.radius)) {
      return { x: nextX, y: nextY };
    }

    return { x: this.x, y: this.y };
  }

  tilePosition() {
    return {
      x: Math.floor(this.x / this.tileSize),
      y: Math.floor(this.y / this.tileSize),
    };
  }

  render(ctx, camera) {
    ctx.fillStyle = "#ff3333";
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.15;
    ctx.beginPath();
    ctx.arc(
      this.x - camera.x,
      this.y - camera.y,
      this.radius * pulse,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}
