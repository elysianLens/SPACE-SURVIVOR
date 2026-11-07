import './style.css';
import Phaser from 'phaser';
import StartScene from './game/scenes/startScene.js';

const gameConfig = {
    type: Phaser.AUTO,

    width: 960,
    height: 540,

    backgroundColor: '#10051f',

    parent: 'app',

    scene: [StartScene]
};

const game = new Phaser.Game(gameConfig);