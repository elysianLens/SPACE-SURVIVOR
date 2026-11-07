import Phaser from 'phaser';
import Asteroid from '../objects/asteroid.js';

export default class StartScene extends Phaser.Scene {

    constructor() {
        super('StartScene');
    }

    create() {
    
        // Store all our stars
        this.stars = [];

        // Colours that our stars will use
        const starColors = [
            0xffffff,
            0xc084fc,
            0xa855f7,
            0x67e8f9
        ];

        // Create 100 stars
        for (let i = 0; i < 100; i++) {

            // Random position
            const x = Math.random() * 960;
            const y = Math.random() * 540;

            // Random star size
            const size = Math.random() * 2.5 + 0.5;

            // Random star colour
            const color = starColors[
                Math.floor(Math.random() * starColors.length)
            ];

            // Create the star
            const star = this.add.circle(x, y, size, color);
            star.setAlpha(Math.random() * 0.6 + 0.4);

            // Store the star
            this.stars.push(star);

            star.speed = Math.random() * 0.05 + 0.01;
            star.direction = Math.random() * 0.6 + 0.2;
        }


        // CREATE ENGINE FLAMES FIRST (behind spaceship)

        // Main engine flame
        this.flame = this.add.triangle(
            480, 452,
            0, 0,
            7, 18,
            14, 0,
            0xff00ff
        ).setOrigin(0.5, 0);

        // Left engine flame
        this.flameLeft = this.add.triangle(
            470, 452,
            0, 0,
            4, 13,
            8, 0,
            0xa855f7
        ).setOrigin(0.5, 0);

        // Right engine flame
        this.flameRight = this.add.triangle(
            490, 452,
            0, 0,
            4, 13,
            8, 0,
            0x67e8f9
        ).setOrigin(0.5, 0);


        // CREATE PLAYER SPACESHIP
        this.player = this.add.triangle(
            480, 430,
            18, 0,
            0, 45,
            36, 45,
            0xa855f7
        ).setOrigin(0.5, 0.5);


        // Cyan outline
        this.player.setStrokeStyle(2, 0x67e8f9);

        // Make sure spaceship appears in front of flames
        this.flame.setDepth(1);
        this.flameLeft.setDepth(1);
        this.flameRight.setDepth(1);
        this.player.setDepth(2);

        // Add neon glow to engine flames
        this.flame.setBlendMode(Phaser.BlendModes.ADD);
        this.flameLeft.setBlendMode(Phaser.BlendModes.ADD);
        this.flameRight.setBlendMode(Phaser.BlendModes.ADD);


        // Red damage glow (initially invisible)
        this.damageGlow = this.add.triangle(
            this.player.x,
            this.player.y,
            18,
            0,
            0,
            45,
            36,
            45,
            0x8b0000
        ).setOrigin(0.5, 0.5);

        this.damageGlow.setAlpha(0);
        this.damageGlow.setDepth(1);
        this.player.setDepth(2);


        // PLAYER HEALTH
        this.health = 100;
        // Damage protection
        this.canTakeDamage = true;

        // Display health
        this.healthText = this.add.text(20, 20, 'HEALTH: 100', {
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#67e8f9'
        });


        // Create keyboard controls
        this.keys = this.input.keyboard.addKeys('W,A,S,D');

        // Arrow keys
        this.cursors = this.input.keyboard.createCursorKeys(); 


        this.add.text(480, 220, 'SPACE SURVIVOR', {
            fontSize: '42px',
            fontFamily: 'monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(480, 285, 'INITIALIZING SYSTEM...', {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#00ffff'
        }).setOrigin(0.5);


        // Store all asteroids
        this.asteroids = [];

        // Create 5 asteroids
        for (let i = 0; i < 5; i++) {

            const x = Math.random() * 960;
            const y = Math.random() * -500;

            const radius = Math.random() * 35+ 15;
            const speed = Math.random() * 100 + 50;

            const asteroid = new Asteroid(
                this,
                x,
                y,
                radius,
                speed
            );

            this.asteroids.push(asteroid);
        }
    }
    
update(time, delta) {

    // STAR MOVEMENT
    this.stars.forEach((star) => {

        star.x += star.speed * delta * star.direction;
        star.y += star.speed * delta;

        star.alpha = 0.5 + Math.random() * 0.5;

        if (star.y > 540) {
            star.y = 0;
            star.x = Math.random() * 960;
        }

        if (star.x > 960) {
            star.x = 0;
            star.y = Math.random() * 540;
        }

    });


    // SPACESHIP MOVEMENT
    const speed = 400;

    if (this.keys.A.isDown || this.cursors.left.isDown) {
        this.player.x -= speed * delta / 1000;
    }

    if (this.keys.D.isDown || this.cursors.right.isDown) {
        this.player.x += speed * delta / 1000;
    }

    if (this.keys.W.isDown || this.cursors.up.isDown) {
        this.player.y -= speed * delta / 1000;
    }

    if (this.keys.S.isDown || this.cursors.down.isDown) {
        this.player.y += speed * delta / 1000;
    }


    // Animate engine flame
    this.flame.setScale(
        1,
        Math.random() * 0.5 + 0.8
    );

    const flameColors = [
        0xff00ff,
        0xa855f7,
        0x67e8f9
    ];

    this.flame.setFillStyle(
        flameColors[Math.floor(Math.random() * flameColors.length)]
    );


    // SCREEN BOUNDARIES
    const halfWidth = 20;
    const halfHeight = 26;

    this.player.x = Phaser.Math.Clamp(
        this.player.x,
        halfWidth,
        960 - halfWidth
    );

    this.player.y = Phaser.Math.Clamp(
        this.player.y,
        halfHeight,
        540 - halfHeight
    );


    // Attach flames to spaceship

    // Main flame
    this.flame.x = this.player.x;
    this.flame.y = this.player.y + 22.5;

    // Left flame
    this.flameLeft.x = this.player.x - 10;
    this.flameLeft.y = this.player.y + 22.5;

    // Right flame
    this.flameRight.x = this.player.x + 10;
    this.flameRight.y = this.player.y + 22.5;   


    // Animate engine flames
    this.flame.setScale(
        1,
        Math.random() * 0.5 + 0.8
    );

    this.flameLeft.setScale(
        1,
        Math.random() * 0.5 + 0.6
    );

    this.flameRight.setScale(
        1,
        Math.random() * 0.5 + 0.6
    );

    // Keep damage glow attached to spaceship
    this.damageGlow.x = this.player.x;
    this.damageGlow.y = this.player.y;

    // Update all asteroids
    this.asteroids.forEach((asteroid) => {
        asteroid.update(time, delta);
    }); 

    // CHECK ASTEROID COLLISIONS
    this.asteroids.forEach((asteroid) => {

        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            asteroid.x,
            asteroid.y
        );

        if (distance < asteroid.radius + 20 && this.canTakeDamage) {

        // Reduce player health
        this.health -= 20;

        // Update health display
        this.healthText.setText('HEALTH: ' + this.health);

        // Activate damage protection
        this.canTakeDamage = false;

        // Turn spaceship red
        this.player.setFillStyle(0xff3333);
        // Turn spaceship border deep red
        this.player.setStrokeStyle(3, 0x8b0000);

        // Activate deep red glow
        this.damageGlow.setAlpha(0.8);

        // Make spaceship flash during protection
        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 4
        });

        // Allow damage again after 1 second
        this.time.delayedCall(1000, () => {

            // Restore original spaceship colour
            this.player.setFillStyle(0xa855f7);
            // Restore cyan border
            this.player.setStrokeStyle(2, 0x67e8f9);
            // Remove damage glow
            this.damageGlow.setAlpha(0);

            // Allow damage again
            this.canTakeDamage = true;
        });
    }
    });  
}}