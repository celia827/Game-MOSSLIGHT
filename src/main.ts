import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ForestPreviewScene } from './scenes/ForestPreviewScene';
import { DESIGN } from './config/game';
import { createPresentation } from './ui/presentation';
import './style.css';

let game: Phaser.Game|undefined;
const presentation=createPresentation(()=>game?.scale.refresh());
game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: DESIGN.width, height: DESIGN.height,
  backgroundColor: '#b8d7bf',
  antialias: true, roundPixels: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene,new ForestPreviewScene(controls=>presentation.connect(controls))],
  banner: false,
  audio: { noAudio: true },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  fps: { target: 60 },
});

if (import.meta.hot) import.meta.hot.dispose(() => {presentation.destroy();game?.destroy(true);});
