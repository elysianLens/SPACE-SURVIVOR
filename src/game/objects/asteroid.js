
import Phaser from 'phaser';

export default class Asteroid extends Phaser.GameObjects.Polygon {

    constructor(scene, x, y, radius, speed) {

        // Random asteroid colours
        const asteroidColors = [
            0x888888,
            0x666666,
            0x8b7355,
            0x6b647d,
            0x5c6670
        ];

        const color = asteroidColors[
            Math.floor(Math.random() * asteroidColors.length)
        ];

        // Generate an irregular asteroid shape
        const points = [];
        const sides = 9;

        for (let i = 0; i < sides; i++) {

            const angle = (Math.PI * 2 / sides) * i;
            const variation = Math.random() * 0.6 + 0.4;

            const pointX = Math.cos(angle) * radius * variation;
            const pointY = Math.sin(angle) * radius * variation;

            points.push(pointX, pointY);
        }

        super(scene, x, y, points, color, 1);

        scene.add.existing(this);

        this.radius = radius;

        // Add rocky-looking outline
        this.setStrokeStyle(2, 0x3b3545);

        // Store asteroid speed
        this.speed = speed;

        // Random rotation speed
        this.rotationSpeed = Math.random() * 2 - 1;
    }

    update(time, delta) {

        // Move asteroid downwards
        this.y += this.speed * delta / 1000;

        // Rotate asteroid
        this.rotation += this.rotationSpeed * delta / 1000;

        // Check if asteroid has left the screen
        if (this.y > 540 + this.radius) {

            // Send it back above the screen
            this.y = -this.radius;

            // New random horizontal position
            this.x = Math.random() * 960;

            // New random speed
            this.speed = Math.random() * 100 + 50;
        }
    }
}