import Map from "./Map.js";
import Player from "./Player.js";
import Aura from "./Aura.js";
import Input from "./Input.js";

const GameState = Object.freeze({
  INTRO: "intro",
  HOME: "home",
  LEVEL: "level",
  WIN: "win",
});

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.sceneCanvas = document.createElement("canvas");
    this.sceneCanvas.width = canvas.width;
    this.sceneCanvas.height = canvas.height;
    this.sceneCtx = this.sceneCanvas.getContext("2d");

    this.state = GameState.INTRO;
    this.input = new Input();
    this.levels = [];
    this.currentLevelIndex = 0;

    this.player = null;
    this.aura = null;
    this.key = { x: 0, y: 0, collected: false, following: false };
    this.message = "";
    this.messageTimer = 0;

    this.homeMap = null;
    this.homeDoorEntry = { x: 0, y: 0 };
    this.homeDoorWin = { x: 0, y: 0 };
    this.homeCenter = { x: 0, y: 0 };

    this.assets = {
      player: new Image(),
      key: new Image(),
    };

    this.audio = {
      intro: new Audio("assets/audio/intro.wav"),
      step: new Audio("assets/audio/step.wav"),
      key: new Audio("assets/audio/key.wav"),
      win: new Audio("assets/audio/win.wav"),
    };

    this.audio.intro.loop = true;
    this.audio.step.loop = true;

    this.startTime = null;
    this.elapsedTime = 0;
    this.running = false;

    this._bindClick();
  }

  async init() {
    this.assets.player.src = "assets/sprites/player.png";
    this.assets.key.src = "assets/sprites/key.png";

    const lab1 = await Map.fromUrl("maps/lab1.json", "lab1");
    const lab2 = await Map.fromUrl("maps/lab2.json", "lab2");
    const lab3 = await Map.fromUrl("maps/lab3.json", "lab3");
    const lab4 = await Map.fromUrl("maps/lab4.json", "lab4");

    this.levels = [
      { map: lab1, aura: false },
      { map: lab2, aura: true },
      { map: lab3, aura: true },
      { map: lab4, aura: true },
    ];

    const tileSize = lab1.tileSize;
    this.homeMap = this._createHomeMap(tileSize);
    this.aura = new Aura(tileSize * 6);

    this.player = new Player({
      x: (this.homeCenter.x + 0.5) * tileSize,
      y: (this.homeCenter.y + 0.5) * tileSize,
      tileSize,
      speed: tileSize * 18,
    });

    this._prepareLevels();
    this.running = true;
    requestAnimationFrame((time) => this._loop(time));
  }

  _bindClick() {
    this.canvas.addEventListener("click", (event) => {
      if (this.state !== GameState.INTRO) {
        return;
      }

      const rect = this.canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
      const button = this._introButton();

      if (
        x >= button.x &&
        x <= button.x + button.width &&
        y >= button.y &&
        y <= button.y + button.height
      ) {
        this._startGame();
      }
    });
  }

  _startGame() {
    this.state = GameState.HOME;
    this.startTime = performance.now();
    this._playAudio(this.audio.intro);
  }

  _prepareLevels() {
    this.levels.forEach((level) => {
      const targetEntry = {
        x: Math.floor(level.map.width / 2),
        y: 1,
      };
      const targetExit = {
        x: Math.floor(level.map.width / 2),
        y: level.map.height - 2,
      };
      const entry = this._findNearestFloor(level.map, targetEntry);
      const exit = this._findNearestFloor(level.map, targetExit);
      const keyTile = this._findFarthestTile(level.map, entry);
      level.entry = entry;
      level.exit = exit;
      level.keyTile = keyTile;
    });
  }

  _createHomeMap(tileSize) {
    const width = 25;
    const height = 17;
    const grid = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) =>
        x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1 : 0
      )
    );

    const centerX = Math.floor(width / 2);
    this.homeDoorEntry = { x: centerX, y: 1 };
    this.homeDoorWin = { x: centerX, y: height - 2 };
    this.homeCenter = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    grid[this.homeDoorEntry.y][this.homeDoorEntry.x] = 0;
    grid[this.homeDoorWin.y][this.homeDoorWin.x] = 0;

    return new Map({ grid, tileSize, width, height, name: "home" });
  }

  _findFarthestTile(map, start) {
    const queue = [start];
    const distances = Array.from({ length: map.height }, () =>
      Array(map.width).fill(-1)
    );
    distances[start.y][start.x] = 0;
    let farthest = start;

    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    while (queue.length) {
      const current = queue.shift();
      const distance = distances[current.y][current.x];
      if (distance > distances[farthest.y][farthest.x]) {
        farthest = current;
      }

      directions.forEach((dir) => {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        if (
          nx >= 0 &&
          ny >= 0 &&
          nx < map.width &&
          ny < map.height &&
          map.grid[ny][nx] === 0 &&
          distances[ny][nx] === -1
        ) {
          distances[ny][nx] = distance + 1;
          queue.push({ x: nx, y: ny });
        }
      });
    }

    return farthest;
  }

  _findNearestFloor(map, target) {
    const queue = [target];
    const visited = Array.from({ length: map.height }, () =>
      Array(map.width).fill(false)
    );
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    while (queue.length) {
      const current = queue.shift();
      if (
        current.x >= 0 &&
        current.y >= 0 &&
        current.x < map.width &&
        current.y < map.height &&
        !visited[current.y][current.x]
      ) {
        visited[current.y][current.x] = true;
        if (map.grid[current.y][current.x] === 0) {
          return current;
        }
        directions.forEach((dir) => {
          queue.push({ x: current.x + dir.x, y: current.y + dir.y });
        });
      }
    }
    return map.findFirstFloorTile();
  }

  _loop(time) {
    if (!this.running) {
      return;
    }

    const dt = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;

    this.update(dt);
    this.render();

    if (this.state !== GameState.WIN) {
      requestAnimationFrame((nextTime) => this._loop(nextTime));
    }
  }

  update(dt) {
    if (this.state === GameState.HOME || this.state === GameState.LEVEL) {
      const map = this._activeMap();
      this.player.update(dt, this.input, map);
      this._updateFootsteps();
      this._checkKeyPickup(map);
      this._checkTransitions();
    }

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.message = "";
      }
    }
  }

  _updateFootsteps() {
    if (this.input.isMoving()) {
      this._playAudio(this.audio.step);
    } else {
      this.audio.step.pause();
      this.audio.step.currentTime = 0;
    }
  }

  _activeMap() {
    if (this.state === GameState.HOME) {
      return this.homeMap;
    }
    return this.levels[this.currentLevelIndex].map;
  }

  _checkKeyPickup(map) {
    const lastIndex = this.levels.length - 1;
    if (
      this.state !== GameState.LEVEL ||
      this.key.collected ||
      this.currentLevelIndex !== lastIndex
    ) {
      return;
    }

    const keyTile = this.levels[this.currentLevelIndex].keyTile;
    const playerTile = this.player.tilePosition();
    if (playerTile.x === keyTile.x && playerTile.y === keyTile.y) {
      this.key.collected = true;
      this.key.following = true;
      this.player.hasKey = true;
      this._showMessage("KEY FOUND - RETURN HOME", 3.5);
      this._playAudio(this.audio.key);
    }
  }

  _checkTransitions() {
    if (this.state === GameState.HOME) {
      const playerTile = this.player.tilePosition();
      if (
        this.player.hasKey &&
        this.currentLevelIndex === this.levels.length - 1 &&
        playerTile.x === this.homeDoorWin.x &&
        playerTile.y === this.homeDoorWin.y
      ) {
        this._win();
        return;
      }

      if (
        playerTile.x === this.homeDoorEntry.x &&
        playerTile.y === this.homeDoorEntry.y &&
        this.currentLevelIndex < this.levels.length &&
        !this.player.hasKey
      ) {
        this.state = GameState.LEVEL;
        this._movePlayerToLevelEntry();
      }
    }

    if (this.state === GameState.LEVEL) {
      const level = this.levels[this.currentLevelIndex];
      const playerTile = this.player.tilePosition();
      if (
        this.player.hasKey &&
        playerTile.x === level.entry.x &&
        playerTile.y === level.entry.y
      ) {
        this.state = GameState.HOME;
        this._movePlayerToHomeDoor();
      }

      if (playerTile.x === level.exit.x && playerTile.y === level.exit.y) {
        if (this.currentLevelIndex < this.levels.length - 1) {
          this.currentLevelIndex += 1;
          this._movePlayerToLevelEntry();
          this._showMessage(`LEVEL ${this.currentLevelIndex + 1}`, 2);
        } else if (this.player.hasKey) {
          this.state = GameState.HOME;
          this._movePlayerToHomeDoor();
          this._showMessage("HOME", 2);
        } else {
          this._showMessage("NEED THE KEY", 1.5);
        }
      }
    }
  }

  _movePlayerToLevelEntry() {
    const level = this.levels[this.currentLevelIndex];
    const tileSize = level.map.tileSize;
    this.player.x = (level.entry.x + 0.5) * tileSize;
    this.player.y = (level.entry.y + 0.5) * tileSize;
    if (this.currentLevelIndex === this.levels.length - 1) {
      this.key.x = (level.keyTile.x + 0.5) * tileSize;
      this.key.y = (level.keyTile.y + 0.5) * tileSize;
      this.key.collected = false;
      this.key.following = false;
    }
  }

  _movePlayerToHomeDoor() {
    const tileSize = this.homeMap.tileSize;
    this.player.x = (this.homeDoorEntry.x + 0.5) * tileSize;
    this.player.y = (this.homeDoorEntry.y + 0.5) * tileSize;
  }

  _win() {
    this.state = GameState.WIN;
    this.audio.step.pause();
    this.audio.intro.pause();
    this._playAudio(this.audio.win);
    this.elapsedTime = (performance.now() - this.startTime) / 1000;
  }

  _playAudio(audio) {
    if (audio.paused) {
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }

  _showMessage(text, seconds) {
    this.message = text;
    this.messageTimer = seconds;
  }

  render() {
    if (this.state === GameState.INTRO) {
      this._renderIntro();
      return;
    }

    if (this.state === GameState.WIN) {
      this._renderWin();
      return;
    }

    const map = this._activeMap();
    const camera = this._computeCamera(map);

    this.sceneCtx.clearRect(0, 0, this.sceneCanvas.width, this.sceneCanvas.height);
    map.render(this.sceneCtx, camera);
    if (map.name === "home") {
      this._renderHomeText(this.sceneCtx, camera);
    }

    this._renderDoors(this.sceneCtx, camera);

    if (
      this.state === GameState.LEVEL &&
      this.currentLevelIndex === this.levels.length - 1 &&
      !this.key.collected
    ) {
      this._renderKey(this.sceneCtx, camera, this.key.x, this.key.y);
    }

    this.player.render(this.sceneCtx, camera);

    if (this.player.hasKey && this.key.following) {
      this._renderKey(
        this.sceneCtx,
        camera,
        this.player.x - map.tileSize * 0.6,
        this.player.y - map.tileSize * 0.6
      );
    }

    const auraEnabled = this.state === GameState.LEVEL && this.levels[this.currentLevelIndex].aura;
    if (auraEnabled) {
      this.aura.render(this.ctx, this.sceneCanvas, this.player, camera);
    } else {
      this.ctx.drawImage(this.sceneCanvas, 0, 0);
    }

    this._renderHud();
    this._renderNoise(0.08);
  }

  _renderIntro() {
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#fff";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = "20px Courier New";

    const lines = [
      "HAI PERSO LA CHIAVE",
      "IN UNO DEI LABIRINTI",
      "RITROVALA",
    ];

    lines.forEach((line, index) => {
      this.ctx.fillText(
        line,
        this.canvas.width / 2,
        this.canvas.height / 2 - 70 + index * 28
      );
    });

    const button = this._introButton();
    this.ctx.strokeStyle = "#fff";
    this.ctx.strokeRect(button.x, button.y, button.width, button.height);
    this.ctx.fillText(
      "ENTRA NEL GIOCO",
      button.x + button.width / 2,
      button.y + button.height / 2
    );

    this._renderNoise(0.3);
    this._renderKeyField(28);
  }

  _introButton() {
    return {
      x: this.canvas.width / 2 - 140,
      y: this.canvas.height / 2 + 60,
      width: 280,
      height: 44,
    };
  }

  _renderWin() {
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = "24px Courier New";
    this.ctx.fillText("SHE IS HOME", this.canvas.width / 2, this.canvas.height / 2 - 20);
    this.ctx.font = "18px Courier New";
    this.ctx.fillText(
      `TIME: ${this._formatTime(this.elapsedTime)}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 20
    );
  }

  _renderHomeText(ctx, camera) {
    ctx.fillStyle = "#fff";
    ctx.font = "12px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tileSize = this.homeMap.tileSize;
    ctx.fillText(
      "FIND THE KEY",
      (this.homeCenter.x * tileSize + tileSize / 2) - camera.x,
      (this.homeCenter.y * tileSize + tileSize / 2) - camera.y - tileSize
    );
    ctx.fillText(
      "RETURN HERE",
      (this.homeCenter.x * tileSize + tileSize / 2) - camera.x,
      (this.homeCenter.y * tileSize + tileSize / 2) - camera.y + tileSize
    );
  }

  _renderDoors(ctx, camera) {
    const tileSize = this._activeMap().tileSize;
    ctx.strokeStyle = "#00d19a";
    ctx.lineWidth = 2;

    if (this.state === GameState.HOME) {
      this._renderDoorTile(ctx, camera, this.homeDoorEntry, tileSize, false);
      this._renderDoorTile(ctx, camera, this.homeDoorWin, tileSize, !this.player.hasKey);
      return;
    }

    const level = this.levels[this.currentLevelIndex];
    this._renderDoorTile(ctx, camera, level.entry, tileSize, false);
    this._renderDoorTile(ctx, camera, level.exit, tileSize, false);
  }

  _renderDoorTile(ctx, camera, tile, tileSize, locked) {
    const x = tile.x * tileSize - camera.x + tileSize * 0.15;
    const y = tile.y * tileSize - camera.y + tileSize * 0.15;
    const size = tileSize * 0.7;
    ctx.fillStyle = "#00d19a";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#000";
    ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.6, size * 0.6);
    ctx.strokeStyle = "#00d19a";
    ctx.strokeRect(x, y, size, size);
    if (locked) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + size, y + size);
      ctx.moveTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.stroke();
    }
  }

  _renderKey(ctx, camera, x, y) {
    const size = this._activeMap().tileSize;
    ctx.fillStyle = "#ffd200";
    ctx.fillRect(x - camera.x - size / 4, y - camera.y - size / 6, size / 2, size / 3);
    ctx.fillRect(x - camera.x, y - camera.y - size / 6, size / 3, size / 3);
  }

  _renderHud() {
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "12px Courier New";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    const levelLabel = this.state === GameState.HOME ? "HOME" : `LEVEL ${this.currentLevelIndex + 1}`;
    this.ctx.fillText(levelLabel, 12, 12);

    let objective = "GO SOUTH";
    if (this.player.hasKey) {
      objective = "RETURN HOME";
    } else if (this.state === GameState.HOME) {
      objective = "ENTER LAB 1";
    }
    this.ctx.fillText(objective, 12, 28);

    if (this.message) {
      this.ctx.textAlign = "center";
      this.ctx.fillText(this.message, this.canvas.width / 2, 16);
    }
  }

  _renderNoise(alpha) {
    const noiseCount = 120;
    this.ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (let i = 0; i < noiseCount; i += 1) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      this.ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  _renderKeyField(count) {
    const t = performance.now() * 0.001;
    const size = 8;
    for (let i = 0; i < count; i += 1) {
      const seed = i * 37;
      const x = (Math.sin(t * 0.7 + seed) * 0.5 + 0.5) * this.canvas.width;
      const y = (Math.cos(t * 0.9 + seed) * 0.5 + 0.5) * this.canvas.height;
      this._drawPixelKey(this.ctx, x, y, size);
    }
  }

  _drawPixelKey(ctx, x, y, size) {
    const pixel = size / 4;
    ctx.fillStyle = "#ffd200";
    ctx.fillRect(x, y + pixel, pixel * 2, pixel);
    ctx.fillRect(x + pixel * 2, y + pixel, pixel, pixel * 2);
    ctx.fillRect(x + pixel * 3, y + pixel * 2, pixel, pixel);
    ctx.fillRect(x + pixel * 2, y + pixel * 3, pixel, pixel);
    ctx.fillRect(x - pixel, y + pixel * 1.5, pixel, pixel * 0.5);
  }

  _computeCamera(map) {
    const halfWidth = this.sceneCanvas.width / 2;
    const halfHeight = this.sceneCanvas.height / 2;
    let x = this.player.x - halfWidth;
    let y = this.player.y - halfHeight;
    const maxX = map.width * map.tileSize - this.sceneCanvas.width;
    const maxY = map.height * map.tileSize - this.sceneCanvas.height;
    if (maxX <= 0) {
      x = -(this.sceneCanvas.width - map.width * map.tileSize) / 2;
    } else {
      x = Math.max(0, Math.min(x, maxX));
    }

    if (maxY <= 0) {
      y = -(this.sceneCanvas.height - map.height * map.tileSize) / 2;
    } else {
      y = Math.max(0, Math.min(y, maxY));
    }
    return {
      x,
      y,
      width: this.sceneCanvas.width,
      height: this.sceneCanvas.height,
    };
  }

  _formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
}
