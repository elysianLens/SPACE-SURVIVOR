
import Phaser from 'phaser';

export default class Asteroid extends Phaser.GameObjects.Polygon {

    constructor(scene, x, y, radius, speed) {

        // Deep mineral tones with neon edges to match the ship and starfield
        const asteroidPalettes = [
            { fill: 0x302044, outline: 0xc084fc, facet: 0xe9a8ff },
            { fill: 0x1c3045, outline: 0x67e8f9, facet: 0xa5f3fc },
            { fill: 0x3b203c, outline: 0xf0abfc, facet: 0xfbcfe8 },
            { fill: 0x24264a, outline: 0x8b8cff, facet: 0xc4b5fd },
            { fill: 0x203b42, outline: 0x5eead4, facet: 0xa7f3d0 }
        ];

        const palette = asteroidPalettes[
            Math.floor(Math.random() * asteroidPalettes.length)
        ];

        // Generate an irregular asteroid shape
        const points = [];
        const collisionPoints = [];
        const sides = 9;

        for (let i = 0; i < sides; i++) {

            const angle = (Math.PI * 2 / sides) * i;
            const variation = Math.random() * 0.6 + 0.4;

            const pointX = Math.cos(angle) * radius * variation;
            const pointY = Math.sin(angle) * radius * variation;

            points.push(pointX, pointY);
            collisionPoints.push({
                x: pointX,
                y: pointY
            });
        }

        super(scene, x, y, points, palette.fill, 1);

        scene.add.existing(this);

        this.collisionPoints = collisionPoints;
        this.nearMissRegistered = false;
        this.setDepth(1);

        this.radius = radius;

        // Neon rim and restrained facet lines make each asteroid read like a space mineral.
        this.setStrokeStyle(2.5, palette.outline, 0.9);
        this.facetLines = scene.add.graphics().setDepth(1.1);
        this.facetLines.lineStyle(1.2, palette.facet, 0.32);

        const originX = this.displayOriginX;
        const originY = this.displayOriginY;
        const facetCenter = { x: -originX, y: -originY };

        for (let i = 1; i < sides; i += 3) {
            this.facetLines.beginPath();
            this.facetLines.moveTo(facetCenter.x, facetCenter.y);
            this.facetLines.lineTo(
                collisionPoints[i].x - originX,
                collisionPoints[i].y - originY
            );
            this.facetLines.strokePath();
        }

        this.facetLines.setPosition(x, y);

        // Keep a base speed so difficulty can scale it without compounding.
        this.baseSpeed = speed;
        this.speedMultiplier = scene.speedMultiplier ?? 1;
        this.speed = this.baseSpeed * this.speedMultiplier;

        // Random rotation speed
        this.rotationSpeed = Math.random() * 2 - 1;
    }

    update(time, delta) {

        // Move asteroid downwards
        this.y += this.speed * delta / 1000;

        // Rotate asteroid
        this.rotation += this.rotationSpeed * delta / 1000;
        this.facetLines.setPosition(this.x, this.y);
        this.facetLines.setRotation(this.rotation);

        // Check if asteroid has left the screen
        if (this.y > 540 + this.radius) {

            // Send it back above the screen
            this.y = -this.radius;
            this.nearMissRegistered = false;

            // New random horizontal position
            this.x = Math.random() * 960;

            // New random base speed, scaled by the current threat level.
            this.baseSpeed = Math.random() * 100 + 50;
            this.speed = this.baseSpeed * this.speedMultiplier;
            this.scene.trySpawnPowerUpFromSky();
        }
    }

    setDifficultyMultiplier(multiplier) {
        this.speedMultiplier = multiplier;
        this.speed = this.baseSpeed * this.speedMultiplier;
    }

    destroy(fromScene) {
        if (this.facetLines) {
            this.facetLines.destroy();
            this.facetLines = null;
        }

        super.destroy(fromScene);
    }
}
