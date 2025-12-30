export default class Map {
  constructor({ grid, tileSize, width, height, name }) {
    this.grid = grid;
    this.tileSize = tileSize;
    this.width = width;
    this.height = height;
    this.name = name;
  }

  static async fromUrl(url, name) {
    const response = await fetch(url);
    const data = await response.json();
    return new Map({
      grid: data.grid,
      tileSize: data.tileSize,
      width: data.width,
      height: data.height,
      name,
    });
  }

  isWallTile(tileX, tileY) {
    if (tileX < 0 || tileY < 0 || tileX >= this.width || tileY >= this.height) {
      return true;
    }
    return this.grid[tileY][tileX] === 1;
  }

  isWallAt(x, y, radius) {
    const left = Math.floor((x - radius) / this.tileSize);
    const right = Math.floor((x + radius) / this.tileSize);
    const top = Math.floor((y - radius) / this.tileSize);
    const bottom = Math.floor((y + radius) / this.tileSize);
    return (
      this.isWallTile(left, top) ||
      this.isWallTile(right, top) ||
      this.isWallTile(left, bottom) ||
      this.isWallTile(right, bottom)
    );
  }

  findFirstFloorTile() {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.grid[y][x] === 0) {
          return { x, y };
        }
      }
    }
    return { x: 1, y: 1 };
  }

  render(ctx, camera) {
    const startX = Math.max(0, Math.floor(camera.x / this.tileSize));
    const startY = Math.max(0, Math.floor(camera.y / this.tileSize));
    const endX = Math.min(
      this.width,
      Math.ceil((camera.x + camera.width) / this.tileSize)
    );
    const endY = Math.min(
      this.height,
      Math.ceil((camera.y + camera.height) / this.tileSize)
    );

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, camera.width, camera.height);
    this._renderMatrixGrid(ctx, camera);

    ctx.fillStyle = "#00d19a";
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        if (this.grid[y][x] === 1) {
          ctx.fillRect(
            x * this.tileSize - camera.x,
            y * this.tileSize - camera.y,
            this.tileSize,
            this.tileSize
          );
        }
      }
    }
  }

  _renderMatrixGrid(ctx, camera) {
    const size = this.tileSize;
    ctx.strokeStyle = "rgba(0, 90, 60, 0.25)";
    ctx.lineWidth = 1;
    const startX = -((camera.x % size + size) % size);
    const startY = -((camera.y % size + size) % size);
    for (let x = startX; x < camera.width; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, camera.height);
      ctx.stroke();
    }
    for (let y = startY; y < camera.height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(camera.width, y);
      ctx.stroke();
    }
  }
}
