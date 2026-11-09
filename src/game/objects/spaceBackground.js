import Phaser from 'phaser';

const WIDTH = 960;
const HEIGHT = 540;
const BACKGROUND_KEY = 'space-survivor-gradient';
const GLOW_KEY = 'space-survivor-nebula-glow';

function createBackgroundTextures(scene) {
    if (!scene.textures.exists(BACKGROUND_KEY)) {
        const texture = scene.textures.createCanvas(BACKGROUND_KEY, WIDTH, HEIGHT);
        const context = texture.getContext();
        const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);

        gradient.addColorStop(0, '#080719');
        gradient.addColorStop(0.45, '#120a2b');
        gradient.addColorStop(1, '#070d22');
        context.fillStyle = gradient;
        context.fillRect(0, 0, WIDTH, HEIGHT);

        const nebula = context.createRadialGradient(300, 290, 20, 300, 290, 390);
        nebula.addColorStop(0, 'rgba(126, 34, 206, 0.28)');
        nebula.addColorStop(0.55, 'rgba(79, 30, 140, 0.13)');
        nebula.addColorStop(1, 'rgba(8, 7, 25, 0)');
        context.fillStyle = nebula;
        context.fillRect(0, 0, WIDTH, HEIGHT);

        const blueNebula = context.createRadialGradient(760, 150, 10, 760, 150, 310);
        blueNebula.addColorStop(0, 'rgba(8, 145, 178, 0.15)');
        blueNebula.addColorStop(0.6, 'rgba(35, 70, 145, 0.08)');
        blueNebula.addColorStop(1, 'rgba(7, 13, 34, 0)');
        context.fillStyle = blueNebula;
        context.fillRect(0, 0, WIDTH, HEIGHT);

        texture.refresh();
    }

    if (!scene.textures.exists(GLOW_KEY)) {
        const texture = scene.textures.createCanvas(GLOW_KEY, 256, 256);
        const context = texture.getContext();
        const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);

        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
        gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);

        texture.refresh();
    }
}

export function createSpaceBackground(scene) {
    createBackgroundTextures(scene);

    scene.add.image(480, 270, BACKGROUND_KEY)
        .setDepth(-100)
        .setScrollFactor(0);

    const violetCloud = scene.add.image(280, 305, GLOW_KEY)
        .setTint(0x8b5cf6)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.2)
        .setScale(2.7, 1.8)
        .setDepth(-90);

    const cyanCloud = scene.add.image(760, 150, GLOW_KEY)
        .setTint(0x22d3ee)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.11)
        .setScale(2.3, 1.6)
        .setDepth(-89);

    scene.tweens.add({
        targets: violetCloud,
        alpha: 0.3,
        scaleX: 2.95,
        scaleY: 2.05,
        duration: 6500,
        yoyo: true,
        repeat: -1
    });

    scene.tweens.add({
        targets: cyanCloud,
        alpha: 0.2,
        scaleX: 2.55,
        scaleY: 1.9,
        duration: 7800,
        yoyo: true,
        repeat: -1
    });

    const stars = [];
    const starColors = [0xffffff, 0xc084fc, 0xa855f7, 0x67e8f9, 0xf0abfc];

    for (let i = 0; i < 145; i++) {
        const isBrightStar = i < 18;
        const size = isBrightStar ? Math.random() * 1.1 + 1.4 : Math.random() * 0.9 + 0.25;
        const star = scene.add.circle(
            Math.random() * WIDTH,
            Math.random() * HEIGHT,
            size,
            Phaser.Utils.Array.GetRandom(starColors)
        );

        star.baseAlpha = isBrightStar
            ? Math.random() * 0.2 + 0.5
            : Math.random() * 0.22 + 0.23;
        star.twinkleSpeed = Math.random() * 0.003 + 0.001;
        star.twinkleOffset = Math.random() * Math.PI * 2;
        star.speed = size > 1.4 ? Math.random() * 24 + 18 : Math.random() * 9 + 3;
        star.drift = size > 1.4 ? Math.random() * 7 + 2 : Math.random() * 3 + 0.5;
        star.setBlendMode(Phaser.BlendModes.ADD);
        stars.push(star);
    }

    const launchShootingStar = () => {
        const x = 150 + Math.random() * 900;
        const y = -20 + Math.random() * 260;
        const color = Math.random() < 0.5 ? 0x67e8f9 : 0xe9a8ff;
        const meteor = scene.add.container(x, y).setDepth(-10);
        const trail = scene.add.graphics();

        // Layered strokes taper away from the bright meteor head.
        trail.lineStyle(12, color, 0.035);
        trail.beginPath();
        trail.moveTo(0, 0);
        trail.lineTo(44, -44);
        trail.strokePath();

        trail.lineStyle(6, color, 0.11);
        trail.beginPath();
        trail.moveTo(0, 0);
        trail.lineTo(34, -34);
        trail.strokePath();

        trail.lineStyle(2, 0xffffff, 0.58);
        trail.beginPath();
        trail.moveTo(0, 0);
        trail.lineTo(22, -22);
        trail.strokePath();
        trail.setBlendMode(Phaser.BlendModes.ADD);

        const headGlow = scene.add.circle(0, 0, 8, color, 0.14)
            .setBlendMode(Phaser.BlendModes.ADD);
        const head = scene.add.circle(0, 0, 2.4, 0xffffff, 0.95)
            .setBlendMode(Phaser.BlendModes.ADD);

        meteor.add([trail, headGlow, head]);
        meteor.setAlpha(0.9);

        scene.tweens.add({
            targets: meteor,
            x: x - 420,
            y: y + 420,
            alpha: 0,
            duration: 900,
            ease: 'Linear',
            onComplete: () => meteor.destroy()
        });

        scene.time.delayedCall(4500 + Math.random() * 4500, launchShootingStar);
    };

    scene.time.delayedCall(1800 + Math.random() * 2400, launchShootingStar);

    return stars;
}

export function updateSpaceBackground(stars, time, delta) {
    for (const star of stars) {
        star.x += star.drift * delta / 1000;
        star.y += star.speed * delta / 1000;
        star.alpha = star.baseAlpha * (
            0.78 + 0.22 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset)
        );

        if (star.y > HEIGHT + 3) {
            star.y = -3;
            star.x = Math.random() * WIDTH;
        }

        if (star.x > WIDTH + 3) {
            star.x = -3;
            star.y = Math.random() * HEIGHT;
        }
    }
}
