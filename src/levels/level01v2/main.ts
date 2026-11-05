import Phaser from 'phaser';
import {BootScene} from '../../scenes/BootScene';
import {Level01V2Scene} from './Level01V2Scene';
import '../../style.css';
import '../level01/style.css';
const game=new Phaser.Game({type:Phaser.WEBGL,parent:'game',width:1280,height:720,backgroundColor:'#b8d7bf',antialias:true,roundPixels:false,
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[new BootScene('Level01'),Level01V2Scene],banner:false,audio:{noAudio:true},
  input:{keyboard:false,mouse:false,touch:false,gamepad:false},fps:{target:60}});
if(import.meta.hot)import.meta.hot.dispose(()=>game.destroy(true));
