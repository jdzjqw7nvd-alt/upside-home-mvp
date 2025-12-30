export default class Aura {
  constructor(radius) {
    this.radius = radius;
  }

  render(mainCtx, sceneCanvas, player, camera) {
    mainCtx.fillStyle = "#000";
    mainCtx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);

    mainCtx.save();
    mainCtx.beginPath();
    mainCtx.arc(
      player.x - camera.x,
      player.y - camera.y,
      this.radius,
      0,
      Math.PI * 2
    );
    mainCtx.clip();
    mainCtx.drawImage(sceneCanvas, 0, 0);
    mainCtx.restore();
  }
}
