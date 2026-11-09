import Phaser from 'phaser';
import Asteroid from '../objects/asteroid.js';
import { createSpaceBackground, updateSpaceBackground } from '../objects/spaceBackground.js';
import { PROGRESSION_STORAGE_KEY } from '../progression/upgrades.js';
import { readStoredNumber, readStoredValue, writeStoredValue } from '../progression/browserStorage.js';

const POWER_UP_TYPES = [
    { id: 'nanite', name: 'NANITE REPAIR', color: 0x5cba9e, message: 'HULL REPAIRED  //  +35' },
    { id: 'shield', name: 'PHASE SHIELD', color: 0x67e8f9, message: 'PHASE SHIELD  //  ACTIVE' },
    { id: 'radial', name: '360° VOLLEY', color: 0x22d3ee, message: 'RADIAL VOLLEY  //  FIRED' },
    { id: 'overcharge', name: 'OVERCHARGE', color: 0xfacc15, message: 'OVERCHARGE  //  ACTIVE' },
    { id: 'nova', name: 'NOVA PULSE', color: 0xf0abfc, message: 'NOVA PULSE  //  DETONATED' }
];

const ENEMY_SHIP_TYPES = [
    {
        id: 'scout', name: 'SCOUT', unlockLevel: 1, color: 0x67e8f9,
        hull: [[0, 22], [-21, 5], [-15, -13], [0, -21], [15, -13], [21, 5]],
        health: 3, fireInterval: 2100, projectileSpeed: 195, damage: 7, speed: 78
    },
    {
        id: 'striker', name: 'STRIKER', unlockLevel: 3, color: 0xf0abfc,
        hull: [[0, 25], [-30, 8], [-19, 0], [-24, -16], [0, -10], [24, -16], [19, 0], [30, 8]],
        health: 5, fireInterval: 1800, projectileSpeed: 225, damage: 9, speed: 70
    },
    {
        id: 'gunship', name: 'GUNSHIP', unlockLevel: 6, color: 0xfacc15,
        hull: [[-32, 17], [-29, -19], [-11, -27], [11, -27], [29, -19], [32, 17], [12, 11], [0, 24], [-12, 11]],
        health: 8, fireInterval: 1950, projectileSpeed: 215, damage: 11, speed: 62
    }
];

const BOSS_TYPES = [
    {
        id: 'aegis', name: 'AEGIS WARDEN', color: 0x67e8f9, health: 92,
        attack: 'fan', attackName: 'PRISM FAN', interval: 5200, damage: 6, projectileSpeed: 205,
        powerName: 'AEGIS FIELD', powerDescription: 'Projectiles cleared · brief damage immunity', cooldown: 38000
    },
    {
        id: 'hunter', name: 'SEEKER PRIME', color: 0xfb7185, health: 112,
        attack: 'lock', attackName: 'LOCK-ON BURST', interval: 4800, damage: 7, projectileSpeed: 250,
        powerName: 'HOMING SALVO', powerDescription: 'Seekers hunt the nearest threats', cooldown: 42000
    },
    {
        id: 'chrono', name: 'CHRONO WEAVER', color: 0xa78bfa, health: 132,
        attack: 'spiral', attackName: 'TIME-SLIP RING', interval: 5100, damage: 7, projectileSpeed: 190,
        powerName: 'TEMPORAL FIELD', powerDescription: 'Slows hazards for 7 seconds', cooldown: 45000
    },
    {
        id: 'singularity', name: 'SINGULARITY CORE', color: 0xf0abfc, health: 152,
        attack: 'collapse', attackName: 'EVENT HORIZON', interval: 5500, damage: 8, projectileSpeed: 220,
        powerName: 'NOVA COLLAPSE', powerDescription: 'Clears nearby debris and enemy fire', cooldown: 50000
    }
];

export default class StartScene extends Phaser.Scene {

    constructor() {
        super('StartScene');
    }

    create() {
        this.game.events.emit('forward-record:visibility', false);
    
        this.stars = createSpaceBackground(this);

        const particleTextureKey = 'space-survivor-particle-dot';
        if (!this.textures.exists(particleTextureKey)) {
            const particleTexture = this.textures.createCanvas(particleTextureKey, 16, 16);
            const context = particleTexture.getContext();
            const gradient = context.createRadialGradient(8, 8, 0, 8, 8, 8);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 16, 16);
            particleTexture.refresh();
        }

        const confettiTextureKey = 'space-survivor-confetti';
        if (!this.textures.exists(confettiTextureKey)) {
            const confettiTexture = this.textures.createCanvas(confettiTextureKey, 12, 16);
            const context = confettiTexture.getContext();
            context.fillStyle = '#ffffff';
            context.beginPath();
            context.moveTo(2, 0);
            context.lineTo(12, 2);
            context.lineTo(10, 16);
            context.lineTo(0, 14);
            context.closePath();
            context.fill();
            confettiTexture.refresh();
        }

        this.impactParticles = this.add.particles(0, 0, particleTextureKey, {
            emitting: false,
            lifespan: { min: 220, max: 440 },
            speed: { min: 70, max: 210 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.95, end: 0 },
            tint: [0x67e8f9, 0xc084fc, 0xf0abfc, 0xffffff],
            blendMode: Phaser.BlendModes.ADD,
            maxAliveParticles: 100
        }).setDepth(4);

        this.explosionParticles = this.add.particles(0, 0, particleTextureKey, {
            emitting: false,
            lifespan: { min: 420, max: 850 },
            speed: { min: 100, max: 330 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.1, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0x67e8f9, 0x8b5cf6, 0xf0abfc, 0xfacc15, 0xffffff],
            blendMode: Phaser.BlendModes.ADD,
            maxAliveParticles: 100
        }).setDepth(5);

        this.weaponFailureParticles = this.add.particles(0, 0, particleTextureKey, {
            emitting: false,
            lifespan: { min: 100, max: 260 },
            speed: { min: 35, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.48, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xfb7185, 0xfacc15, 0xffffff],
            blendMode: Phaser.BlendModes.ADD,
            maxAliveParticles: 30
        }).setDepth(4);

        this.thrusterParticles = this.add.particles(480, 458, particleTextureKey, {
            lifespan: { min: 140, max: 280 },
            frequency: 65,
            quantity: 1,
            speed: { min: 35, max: 90 },
            angle: { min: 78, max: 102 },
            scale: { start: 0.42, end: 0 },
            alpha: { start: 0.62, end: 0 },
            tint: [0x67e8f9, 0xa855f7, 0xf0abfc],
            blendMode: Phaser.BlendModes.ADD,
            maxAliveParticles: 28
        }).setDepth(1.7);

        this.confettiParticles = this.add.particles(0, 0, confettiTextureKey, {
            emitting: false,
            lifespan: { min: 1500, max: 2600 },
            speed: { min: 130, max: 360 },
            angle: { min: 220, max: 320 },
            gravityY: 240,
            rotate: { min: 0, max: 360 },
            scale: { start: 0.9, end: 0.55 },
            alpha: { start: 1, end: 0.85 },
            tint: [0xfacc15, 0x67e8f9, 0xf0abfc, 0xa78bfa, 0xffffff],
            maxAliveParticles: 240
        }).setDepth(9);


        // CREATE ENGINE FLAMES FIRST (behind spaceship)

        // Twin afterburners behind the fighter
        this.flameLeft = this.add.triangle(
            472, 457,
            0, 0,
            6, 28,
            12, 0,
            0xa855f7
        ).setOrigin(0.5, 0);

        this.flameRight = this.add.triangle(
            488, 457,
            0, 0,
            6, 28,
            12, 0,
            0xa855f7
        ).setOrigin(0.5, 0);

        this.flameCoreLeft = this.add.triangle(
            472, 457,
            0, 0,
            3, 20,
            6, 0,
            0x67e8f9
        ).setOrigin(0.5, 0);

        this.flameCoreRight = this.add.triangle(
            488, 457,
            0, 0,
            3, 20,
            6, 0,
            0x67e8f9
        ).setOrigin(0.5, 0);


        // Retro delta-wing fighter hull. The collider follows the visible outline.
        this.playerCollisionPoints = [
            { x: 32, y: 0 },
            { x: 64, y: 42 },
            { x: 38, y: 56 },
            { x: 26, y: 56 },
            { x: 0, y: 42 }
        ];

        const shipHullPoints = this.playerCollisionPoints.flatMap(({ x, y }) => [x, y]);
        this.player = this.add.polygon(
            480,
            430,
            shipHullPoints,
            0x39245f,
            1
        ).setOrigin(0.5, 0.5);

        this.player.setStrokeStyle(2.5, 0x67e8f9, 0.95);

        this.phaseShieldVisual = this.add.circle(this.player.x, this.player.y, 44, 0x67e8f9, 0.06)
            .setStrokeStyle(2, 0x67e8f9, 0.85)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(2.4)
            .setVisible(false);

        this.laserGauge = this.add.container(this.player.x + 39, this.player.y - 14).setDepth(2.25);
        this.laserGaugeVisual = this.add.graphics();
        this.laserGauge.add(this.laserGaugeVisual);

        // Make sure spaceship appears in front of flames
        this.flameLeft.setDepth(1);
        this.flameRight.setDepth(1);
        this.flameCoreLeft.setDepth(1.5);
        this.flameCoreRight.setDepth(1.5);
        this.player.setDepth(2);

        // Add neon glow to engine flames
        this.flameLeft.setBlendMode(Phaser.BlendModes.ADD);
        this.flameRight.setBlendMode(Phaser.BlendModes.ADD);
        this.flameCoreLeft.setBlendMode(Phaser.BlendModes.ADD);
        this.flameCoreRight.setBlendMode(Phaser.BlendModes.ADD);


        // Red damage glow (initially invisible)
        this.damageGlow = this.add.polygon(
            this.player.x,
            this.player.y,
            shipHullPoints,
            0x8b0000,
            1
        ).setOrigin(0.5, 0.5);

        this.damageGlow.setAlpha(0);
        this.damageGlow.setDepth(1);
        this.player.setDepth(2);

        this.shipDetails = this.add.graphics().setDepth(2.1);
        const detailPoint = (x, y) => ({
            x: x - this.player.displayOriginX,
            y: y - this.player.displayOriginY
        });
        const drawDetailShape = (points, color, alpha) => {
            const localPoints = points.map(([x, y]) => detailPoint(x, y));
            this.shipDetails.fillStyle(color, alpha);
            this.shipDetails.beginPath();
            this.shipDetails.moveTo(localPoints[0].x, localPoints[0].y);
            localPoints.slice(1).forEach((point) => {
                this.shipDetails.lineTo(point.x, point.y);
            });
            this.shipDetails.closePath();
            this.shipDetails.fillPath();
        };

        // Central fuselage, canopy and vivid wing panels
        drawDetailShape([[32, 3], [39, 25], [35, 50], [29, 50], [25, 25]], 0x7866c4, 0.96);
        drawDetailShape([[32, 4], [35, 12], [29, 12]], 0xf0abfc, 0.95);
        drawDetailShape([[7, 42], [24, 32], [20, 45]], 0x8b5cf6, 0.9);
        drawDetailShape([[57, 42], [40, 32], [44, 45]], 0x8b5cf6, 0.9);

        const canopy = [
            detailPoint(32, 15),
            detailPoint(36, 25),
            detailPoint(32, 31),
            detailPoint(28, 25)
        ];
        this.shipDetails.fillStyle(0x10172e, 1);
        this.shipDetails.lineStyle(1.5, 0x67e8f9, 0.95);
        this.shipDetails.beginPath();
        this.shipDetails.moveTo(canopy[0].x, canopy[0].y);
        canopy.slice(1).forEach((point) => this.shipDetails.lineTo(point.x, point.y));
        this.shipDetails.closePath();
        this.shipDetails.fillPath();
        this.shipDetails.strokePath();

        // Twin laser ports at the leading edge of the nose
        for (const x of [26, 38]) {
            const muzzle = detailPoint(x, 18);
            this.shipDetails.fillStyle(0xe0fbff, 1);
            this.shipDetails.fillCircle(muzzle.x, muzzle.y, 2.2);
            this.shipDetails.lineStyle(1, 0x67e8f9, 0.95);
            this.shipDetails.strokeCircle(muzzle.x, muzzle.y, 3.4);
        }

        this.shipDetails.lineStyle(1, 0xe0fbff, 0.72);
        this.shipDetails.beginPath();
        const leftWingStart = detailPoint(25, 31);
        const leftWingEnd = detailPoint(7, 41);
        const rightWingStart = detailPoint(39, 31);
        const rightWingEnd = detailPoint(57, 41);
        const centerlineStart = detailPoint(32, 34);
        const centerlineEnd = detailPoint(32, 48);
        this.shipDetails.moveTo(leftWingStart.x, leftWingStart.y);
        this.shipDetails.lineTo(leftWingEnd.x, leftWingEnd.y);
        this.shipDetails.moveTo(rightWingStart.x, rightWingStart.y);
        this.shipDetails.lineTo(rightWingEnd.x, rightWingEnd.y);
        this.shipDetails.moveTo(centerlineStart.x, centerlineStart.y);
        this.shipDetails.lineTo(centerlineEnd.x, centerlineEnd.y);
        this.shipDetails.strokePath();
        this.shipDetails.setPosition(this.player.x, this.player.y);

        this.weaponMuzzleLights = [-7, 7].map((offsetX) => (
            this.add.circle(this.player.x + offsetX, this.player.y - 10, 3, 0x67e8f9, 0.78)
                .setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(2.25)
        ));
        this.weaponFailureActive = false;


        // Apply permanent systems purchased between flights.
        let savedProgression = {};
        try {
            savedProgression = JSON.parse(readStoredValue(PROGRESSION_STORAGE_KEY) || '{}');
        } catch {
            savedProgression = {};
        }
        const upgradeLevels = savedProgression.upgrades || {};
        const upgradeLevel = (id) => {
            const level = Number(upgradeLevels[id]);
            return Number.isFinite(level) ? Math.max(0, Math.min(5, Math.floor(level))) : 0;
        };

        // PLAYER HEALTH AND FLIGHT SYSTEMS
        this.maxHealth = 50 + upgradeLevel('reinforcedHull') * 10;
        this.health = this.maxHealth;
        this.laserHeatPerVolley = 22 - upgradeLevel('capacitorBank') * 2;
        this.overheatRecoveryMs = 3200 - upgradeLevel('coolingLoop') * 400;
        this.collisionDamage = 17 - upgradeLevel('impactDampeners');
        this.enemyLaserDamage = 1 + upgradeLevel('pulseAmplifier') * 0.5;
        this.powerUpCollectionRadius = 49 + upgradeLevel('salvageMagnet') * 8;
        this.shieldPickupDuration = 6500 + upgradeLevel('shieldCapacitor') * 500;
        this.damageGraceMs = 1000 + upgradeLevel('emergencyBulkheads') * 100;
        this.naniteRepairAmount = 35 + upgradeLevel('fieldMedic') * 5;
        this.powerUpDropBonus = upgradeLevel('supplyBeacon') * 0.005;
        this.powerUpFallSpeedMultiplier = 1 - upgradeLevel('tractorWake') * 0.08;
        this.gameOver = false;
        this.score = 0;
        this.elapsed = 0;
        this.missionSecondMark = 0;
        this.cleanFlightSecondMark = 0;
        this.missionDistanceRemainder = 0;
        this.bestScore = Math.max(0, Math.floor(readStoredNumber('space-survivor-best')));
        this.previousBestScore = this.bestScore;
        this.laserHeat = 0;
        this.laserOverheated = false;
        this.overheatCooldown = 0;
        this.phaseShieldRemaining = 0;
        this.phaseShieldDuration = this.shieldPickupDuration;
        this.overchargeRemaining = 0;
        this.overchargeDuration = 8000;
        this.activePowerUpStatusTimer = 0;
        this.powerUps = [];
        // Damage protection
        this.canTakeDamage = true;

        // Create keyboard controls
        this.keys = this.input.keyboard.addKeys('W,A,S,D');

        // Arrow keys
        this.cursors = this.input.keyboard.createCursorKeys(); 
        this.restartKeys = this.input.keyboard.addKeys('R,SPACE,ENTER,ESC');
        this.fireKey = this.restartKeys.SPACE;
        this.touchControls = { up: false, down: false, left: false, right: false, fire: false };
        this.touchFireWasDown = false;
        this.touchControlAbort = new AbortController();
        document.querySelectorAll('[data-flight-control]').forEach((button) => {
            const control = button.dataset.flightControl;
            const release = () => {
                this.touchControls[control] = false;
                button.classList.remove('is-pressed');
            };
            button.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                this.touchControls[control] = true;
                button.classList.add('is-pressed');
                button.setPointerCapture?.(event.pointerId);
            }, { signal: this.touchControlAbort.signal });
            button.addEventListener('pointerup', release, { signal: this.touchControlAbort.signal });
            button.addEventListener('pointercancel', release, { signal: this.touchControlAbort.signal });
            button.addEventListener('lostpointercapture', release, { signal: this.touchControlAbort.signal });
        });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.touchControlAbort.abort());
        this.fireCooldown = 0;
        this.lasers = [];
        this.radialShots = [];
        this.threatLevel = 0;
        this.speedMultiplier = 1;
        this.enemyShips = [];
        this.enemyProjectiles = [];
        this.enemySpawnTimer = 6000;
        this.boss = null;
        this.nextBossThreatLevel = 10;
        this.temporalSlowRemaining = 0;
        this.bossPowerSlots = [1, 2, 3].map((key) => ({
            id: null,
            name: 'EMPTY SOCKET',
            description: 'Defeat a boss to claim its signature ability.',
            color: 0x68708f,
            key,
            cooldown: 1,
            remaining: 0,
            level: 0
        }));
        this.pendingBossPowerType = null;
        this.bossPowerChoiceUI = null;
        this.bossPowerStatusTimer = 0;
        this.pendingBossPowerIndex = null;
        this.bossPowerProjectiles = [];
        this.bossAbilityKeys = [
            Phaser.Input.Keyboard.KeyCodes.ONE,
            Phaser.Input.Keyboard.KeyCodes.TWO,
            Phaser.Input.Keyboard.KeyCodes.THREE,
        ].map((keyCode) => this.input.keyboard.addKey(keyCode));
        this.handleBossPowerRequest = (slotIndex) => {
            if (!this.pendingBossPowerType) this.pendingBossPowerIndex = Number(slotIndex);
        };
        this.game.events.on('boss-power:request-use', this.handleBossPowerRequest);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.game.events.off('boss-power:request-use', this.handleBossPowerRequest);
        });

        this.bossHeaderText = this.add.text(480, 42, '', {
            fontSize: '12px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            fontStyle: 'bold',
            color: '#ffffff',
            letterSpacing: 2,
            backgroundColor: '#090b1c'
        }).setOrigin(0.5).setPadding(8, 4).setDepth(10).setAlpha(0);
        this.bossHealthGraphics = this.add.graphics().setDepth(9).setVisible(false);
        this.bossWarningText = this.add.text(480, 91, '', {
            fontSize: '10px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            fontStyle: 'bold',
            color: '#ffffff',
            letterSpacing: 1.5,
            backgroundColor: '#090b1c'
        }).setOrigin(0.5).setPadding(6, 3).setDepth(10).setAlpha(0);

        this.threatAlert = this.add.text(480, 111, '', {
            fontSize: '15px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            color: '#fb7185',
            letterSpacing: 2,
            backgroundColor: '#090b1c'
        }).setOrigin(0.5).setPadding(8, 5).setDepth(8).setAlpha(0);

        this.powerUpAlert = this.add.text(480, 143, '', {
            fontSize: '12px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            color: '#67e8f9',
            letterSpacing: 2,
            backgroundColor: '#090b1c'
        }).setOrigin(0.5).setPadding(7, 4).setDepth(8).setAlpha(0);

        this.enemyAlert = this.add.text(480, 175, '', {
            fontSize: '11px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            color: '#f0abfc',
            letterSpacing: 1.5,
            backgroundColor: '#090b1c'
        }).setOrigin(0.5).setPadding(6, 4).setDepth(8).setAlpha(0);

        const gameOverFrame = this.add.rectangle(0, 0, 560, 300, 0x090b1c, 0.97)
            .setStrokeStyle(2, 0x7c3aed, 0.95);
        const gameOverAccents = this.add.graphics();
        gameOverAccents.lineStyle(2, 0xfb7185, 0.8);
        gameOverAccents.beginPath();
        gameOverAccents.moveTo(-228, -107);
        gameOverAccents.lineTo(228, -107);
        gameOverAccents.strokePath();
        gameOverAccents.lineStyle(1, 0x493b75, 0.85);
        gameOverAccents.beginPath();
        gameOverAccents.moveTo(-85, 22);
        gameOverAccents.lineTo(-85, 74);
        gameOverAccents.moveTo(85, 22);
        gameOverAccents.lineTo(85, 74);
        gameOverAccents.strokePath();

        const gameOverButton = this.add.rectangle(-104, 102, 190, 38, 0x201744, 1)
            .setStrokeStyle(1.5, 0x67e8f9, 0.9)
            .setInteractive({ useHandCursor: true });
        const mainMenuButton = this.add.rectangle(104, 102, 190, 38, 0x201744, 1)
            .setStrokeStyle(1.5, 0xa78bfa, 0.9)
            .setInteractive({ useHandCursor: true });

        gameOverButton.on('pointerover', () => gameOverButton.setFillStyle(0x4c2b83));
        gameOverButton.on('pointerout', () => gameOverButton.setFillStyle(0x201744));
        gameOverButton.on('pointerdown', () => this.scene.restart());
        mainMenuButton.on('pointerover', () => mainMenuButton.setFillStyle(0x4c2b83));
        mainMenuButton.on('pointerout', () => mainMenuButton.setFillStyle(0x201744));
        mainMenuButton.on('pointerdown', () => this.returnToMenu());

        this.gameOverScoreText = this.add.text(0, -8, '000000', {
            fontSize: '25px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            color: '#facc15',
            letterSpacing: 2
        }).setOrigin(0.5).setShadow(0, 0, '#facc15', 8);

        this.gameOverBestText = this.add.text(-170, 60, '000000', {
            fontSize: '16px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            color: '#a78bfa'
        }).setOrigin(0.5);

        this.gameOverXpText = this.add.text(0, 60, '+000 XP', {
            fontSize: '15px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            color: '#5cba9e'
        }).setOrigin(0.5);

        this.gameOverTimeText = this.add.text(170, 60, '00:00', {
            fontSize: '16px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            color: '#67e8f9'
        }).setOrigin(0.5);

        this.gameOverEyebrow = this.add.text(0, -119, 'FLIGHT CONTROL  //  SIGNAL LOST', {
            fontSize: '12px',
            fontFamily: 'Cascadia Mono, Consolas, monospace',
            color: '#fb7185',
            letterSpacing: 2
        }).setOrigin(0.5);

        this.gameOverUI = this.add.container(480, 270, [
            gameOverFrame,
            gameOverAccents,
            this.gameOverEyebrow,
            this.add.text(0, -78, 'MISSION FAILED', {
                fontSize: '34px',
                fontFamily: 'Cascadia Mono, Consolas, monospace',
                fontStyle: 'bold',
                color: '#f3f0ff',
                letterSpacing: 1
            }).setOrigin(0.5).setShadow(0, 0, '#8b5cf6', 10),
            this.add.text(0, -34, 'RUN SCORE', {
                fontSize: '11px',
                fontFamily: 'Cascadia Mono, Consolas, monospace',
                color: '#777894',
                letterSpacing: 2
            }).setOrigin(0.5),
            this.gameOverScoreText,
            this.add.text(-170, 34, 'HIGH SCORE', {
                fontSize: '10px',
                fontFamily: 'Cascadia Mono, Consolas, monospace',
                color: '#777894',
                letterSpacing: 1
            }).setOrigin(0.5),
            this.gameOverBestText,
            this.add.text(0, 34, 'XP GAINED', {
                fontSize: '10px',
                fontFamily: 'Cascadia Mono, Consolas, monospace',
                color: '#777894',
                letterSpacing: 1
            }).setOrigin(0.5),
            this.gameOverXpText,
            this.add.text(170, 34, 'FLIGHT TIME', {
                fontSize: '10px',
                fontFamily: 'Cascadia Mono, Consolas, monospace',
                color: '#777894',
                letterSpacing: 1
            }).setOrigin(0.5),
            this.gameOverTimeText,
            gameOverButton,
            mainMenuButton,
            this.add.text(-104, 102, 'RESTART FLIGHT', {
                fontSize: '11px',
                fontFamily: 'Cascadia Mono, Consolas, monospace',
                color: '#e9e7ff',
                letterSpacing: 2
            }).setOrigin(0.5),
            this.add.text(104, 102, 'MAIN MENU', {
                fontSize: '11px',
                fontFamily: 'Cascadia Mono, Consolas, monospace',
                color: '#e9e7ff',
                letterSpacing: 2
            }).setOrigin(0.5),
            this.add.text(0, 136, 'R / ENTER / SPACE: RESTART     ESC: MAIN MENU', {
                fontSize: '10px',
                fontFamily: 'Cascadia Mono, Consolas, monospace',
                color: '#777894',
                letterSpacing: 1
            }).setOrigin(0.5)
        ]).setDepth(10).setVisible(false);


        // Start with five hostiles; later threat levels add more.
        this.asteroids = [];
        this.asteroidRespawnRemaining = 0;
        this.powerUps = [];

        for (let i = 0; i < 5; i++) {
            this.asteroids.push(this.spawnAsteroid(Math.random() * -500));
        }

        this.game.events.emit('mission:reset', { id: 'cleanFlight' });
        this.game.events.emit('flight:started');
        this.emitCockpitUpdate();
    }
    
update(time, delta) {

    if (this.gameOver) {
        if (Phaser.Input.Keyboard.JustDown(this.restartKeys.ESC)) {
            this.returnToMenu();
            return;
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.restartKeys.R) ||
            Phaser.Input.Keyboard.JustDown(this.restartKeys.ENTER) ||
            Phaser.Input.Keyboard.JustDown(this.restartKeys.SPACE)
        ) {
            this.scene.restart();
        }

        return;
    }

    if (this.pendingBossPowerType) {
        if (this.pendingBossPowerChoiceReady) {
            const choiceIndex = this.bossAbilityKeys.findIndex((key) => Phaser.Input.Keyboard.JustDown(key));
            if (choiceIndex >= 0) this.replaceBossPower(choiceIndex);
        }
        return;
    }

    if (this.pendingBossPowerIndex !== null) {
        this.activateBossPower(this.pendingBossPowerIndex);
        this.pendingBossPowerIndex = null;
    }
    this.bossAbilityKeys.forEach((key, index) => {
        if (Phaser.Input.Keyboard.JustDown(key)) this.activateBossPower(index);
    });
    this.bossPowerSlots.forEach((slot) => {
        if (slot.level > 0) slot.remaining = Math.max(0, slot.remaining - delta);
    });
    this.temporalSlowRemaining = Math.max(0, this.temporalSlowRemaining - delta);
    this.bossPowerStatusTimer -= delta;
    if (this.bossPowerStatusTimer <= 0) {
        this.emitBossPowerStatus();
        this.bossPowerStatusTimer = 500;
    }

    this.score += delta * 0.01;
    this.elapsed += delta / 1000;
    const elapsedMissionSeconds = Math.floor(this.elapsed);
    if (elapsedMissionSeconds > this.missionSecondMark) {
        const elapsedStep = elapsedMissionSeconds - this.missionSecondMark;
        this.game.events.emit('mission:progress', {
            id: 'flightTime',
            amount: elapsedStep
        });
        const cleanSeconds = elapsedMissionSeconds - this.cleanFlightSecondMark;
        if (cleanSeconds > 0) {
            this.game.events.emit('mission:progress', { id: 'cleanFlight', amount: cleanSeconds });
            this.cleanFlightSecondMark = elapsedMissionSeconds;
        }
        if (this.health <= 20) {
            this.game.events.emit('mission:progress', { id: 'criticalFlight', amount: elapsedStep });
        }
        this.missionSecondMark = elapsedMissionSeconds;
    }
    this.phaseShieldRemaining = Math.max(0, this.phaseShieldRemaining - delta);
    this.overchargeRemaining = Math.max(0, this.overchargeRemaining - delta);
    this.activePowerUpStatusTimer -= delta;
    if (this.activePowerUpStatusTimer <= 0) {
        this.emitActivePowerUpStatus();
        this.activePowerUpStatusTimer = 100;
    }
    this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
    this.updateThreatProgression();

    // Parallax starfield
    updateSpaceBackground(this.stars, time, delta);


    // SPACESHIP MOVEMENT
    const movementStartX = this.player.x;
    const movementStartY = this.player.y;
    const speed = 400;

    if (this.keys.A.isDown || this.cursors.left.isDown || this.touchControls.left) {
        this.player.x -= speed * delta / 1000;
    }

    if (this.keys.D.isDown || this.cursors.right.isDown || this.touchControls.right) {
        this.player.x += speed * delta / 1000;
    }

    if (this.keys.W.isDown || this.cursors.up.isDown || this.touchControls.up) {
        this.player.y -= speed * delta / 1000;
    }

    if (this.keys.S.isDown || this.cursors.down.isDown || this.touchControls.down) {
        this.player.y += speed * delta / 1000;
    }

    const touchFireDown = this.touchControls.fire;
    const fireHeld = this.fireKey.isDown || touchFireDown;
    const attemptedFire = Phaser.Input.Keyboard.JustDown(this.fireKey) || (touchFireDown && !this.touchFireWasDown);
    this.touchFireWasDown = touchFireDown;
    this.fireCooldown -= delta;
    if (this.laserOverheated) {
        if (fireHeld && !this.weaponFailureActive) {
            this.playWeaponFailure();
        }

        this.overheatCooldown = Math.max(0, this.overheatCooldown - delta);
        this.laserHeat = Math.max(0, this.laserHeat - delta * (100 / this.overheatRecoveryMs));

        if (this.overheatCooldown === 0) {
            this.laserOverheated = false;
        }
    } else if (fireHeld && this.fireCooldown <= 0) {
        this.fireLasers();
        this.fireCooldown = this.overchargeRemaining > 0 ? 280 : 350;
        const volleyHeat = this.laserHeatPerVolley * (this.overchargeRemaining > 0 ? (12 / 22) : 1);
        this.laserHeat = Math.min(100, this.laserHeat + volleyHeat);

        if (this.laserHeat >= 100) {
            this.laserOverheated = true;
            this.overheatCooldown = this.overheatRecoveryMs;
        }
    } else {
        if (attemptedFire && this.fireCooldown > 0) {
            this.playWeaponFailure();
        }

        if (!fireHeld) {
            this.laserHeat = Math.max(0, this.laserHeat - delta * 0.02);
        }
    }
    this.updateLaserGauge();
    this.emitCockpitUpdate();


    // SCREEN BOUNDARIES
    const halfWidth = 34;
    const halfHeight = 30;

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

    this.phaseShieldVisual
        .setPosition(this.player.x, this.player.y)
        .setVisible(this.phaseShieldRemaining > 0)
        .setAlpha(0.55 + Math.sin(time * 0.012) * 0.2);

    this.missionDistanceRemainder += Phaser.Math.Distance.Between(
        movementStartX,
        movementStartY,
        this.player.x,
        this.player.y
    );
    const distanceMilestones = Math.floor(this.missionDistanceRemainder / 1000);
    if (distanceMilestones > 0) {
        this.game.events.emit('mission:progress', { id: 'distanceKm', amount: distanceMilestones });
        this.missionDistanceRemainder -= distanceMilestones * 1000;
    }


    // Attach flames to spaceship

    this.flameLeft.x = this.player.x - 7;
    this.flameLeft.y = this.player.y + 27;

    this.flameRight.x = this.player.x + 7;
    this.flameRight.y = this.player.y + 27;

    this.flameCoreLeft.x = this.flameLeft.x;
    this.flameCoreLeft.y = this.flameLeft.y;
    this.flameCoreRight.x = this.flameRight.x;
    this.flameCoreRight.y = this.flameRight.y;

    this.thrusterParticles.setPosition(this.player.x, this.player.y + 30);


    // Animate engine flames
    this.flameLeft.setScale(
        1,
        Math.random() * 0.35 + 0.85
    );

    this.flameRight.setScale(
        1,
        Math.random() * 0.35 + 0.85
    );

    this.flameCoreLeft.setScale(1, Math.random() * 0.35 + 0.85);
    this.flameCoreRight.setScale(1, Math.random() * 0.35 + 0.85);
    this.flameLeft.setAlpha(Math.random() * 0.18 + 0.78);
    this.flameRight.setAlpha(Math.random() * 0.18 + 0.78);

    // Keep damage glow attached to spaceship
    this.damageGlow.x = this.player.x;
    this.damageGlow.y = this.player.y;
    this.shipDetails.setPosition(this.player.x, this.player.y);
    this.weaponMuzzleLights[0].setPosition(this.player.x - 7, this.player.y - 10);
    this.weaponMuzzleLights[1].setPosition(this.player.x + 7, this.player.y - 10);

    // Update all asteroids
    const hazardDelta = this.temporalSlowRemaining > 0 ? delta * 0.38 : delta;
    this.asteroids.forEach((asteroid) => {
        asteroid.update(time, hazardDelta);
    });

    const playerPolygon = this.getWorldPolygon(
        this.player,
        this.playerCollisionPoints
    );

    for (const asteroid of this.asteroids) {

        if (
            this.canTakeDamage &&
            this.polygonTouchesAsteroid(playerPolygon, asteroid)
        ) {
            this.handleCollision(this.player, asteroid);
            break;
        }

        const distanceToAsteroid = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            asteroid.x,
            asteroid.y
        );
        if (
            !asteroid.nearMissRegistered &&
            distanceToAsteroid > asteroid.radius + 36 &&
            distanceToAsteroid < asteroid.radius + 76
        ) {
            asteroid.nearMissRegistered = true;
            this.game.events.emit('mission:progress', { id: 'nearMisses', amount: 1 });
        }
    }

    if (
        !this.gameOver && this.boss && this.canTakeDamage &&
        Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.container.x, this.boss.container.y) < 66
    ) {
        this.handleCollision(this.player, this.boss.container, this.boss.contactDamage);
    }

    if (!this.gameOver) {
        const hostileDelta = this.temporalSlowRemaining > 0 ? delta * 0.38 : delta;
        if (this.boss) this.updateBoss(hostileDelta);
        else this.updateEnemyShips(delta);
        this.updateLasers(delta);
        this.updateRadialShots(delta);
        this.updateBossPowerProjectiles(delta);
        this.updateEnemyProjectiles(hostileDelta);
        this.updatePowerUps(delta);
    }
}

spawnAsteroid(y = Math.random() * -500) {
    const radius = Math.random() * 35 + 15;
    const speed = Math.random() * 100 + 50;

    return new Asteroid(
        this,
        Math.random() * 960,
        y,
        radius,
        speed
    );
}

updateEnemyShips(delta) {
    if (this.threatLevel < 1) return;

    const maxEnemyShips = this.threatLevel >= 14 ? 3 : this.threatLevel >= 7 ? 2 : 1;
    if (this.enemyShips.length < maxEnemyShips) {
        this.enemySpawnTimer -= delta;
        if (this.enemySpawnTimer <= 0) {
            this.spawnEnemyShip();
            this.enemySpawnTimer = Math.max(10500, 24000 - this.threatLevel * 350);
        }
    }

    for (let index = this.enemyShips.length - 1; index >= 0; index--) {
        const enemy = this.enemyShips[index];
        enemy.elapsed += delta / 1000;
        const step = delta / 1000;
        const movementScale = 1 + Math.min(0.35, this.threatLevel * 0.018);
        if (!enemy.hovering) {
            enemy.container.y += enemy.speed * movementScale * step;
            if (enemy.container.y >= 125) enemy.hovering = true;
        }
        if (enemy.hovering) {
            enemy.container.y = 125 + Math.sin(enemy.elapsed * 1.1 + enemy.driftPhase) * 17;
        }
        const targetX = Phaser.Math.Clamp(
            this.player.x + Math.sin(enemy.elapsed * 1.3 + enemy.driftPhase) * enemy.drift * 1.8,
            55,
            905
        );
        const horizontalStep = enemy.speed * movementScale * 0.8 * step;
        enemy.container.x += Phaser.Math.Clamp(
            targetX - enemy.container.x,
            -horizontalStep,
            horizontalStep
        );

        enemy.healthBar.clear();
        enemy.healthBar.fillStyle(0x080d1b, 0.82);
        enemy.healthBar.fillRoundedRect(enemy.container.x - 25, enemy.container.y - 37, 50, 5, 2);
        enemy.healthBar.fillStyle(enemy.type.color, 1);
        enemy.healthBar.fillRoundedRect(
            enemy.container.x - 23,
            enemy.container.y - 35,
            46 * (enemy.health / enemy.maxHealth),
            2,
            1
        );

        if (enemy.warningRemaining === null) {
            enemy.fireCooldown -= delta;
            if (enemy.fireCooldown <= 0 && enemy.container.y > 28) {
                enemy.warningRemaining = 560;
                this.tweens.killTweensOf(this.enemyAlert);
                this.enemyAlert.setText('INCOMING FIRE  //  EVADE')
                    .setColor(`#${enemy.type.color.toString(16).padStart(6, '0')}`)
                    .setAlpha(1);
                this.tweens.add({ targets: this.enemyAlert, alpha: 0, duration: 520, ease: 'Sine.Out' });
                this.game.events.emit('accessibility:announce', 'Incoming enemy fire. Evade now.');
            }
        } else {
            enemy.warningRemaining -= delta;
            enemy.container.setAlpha(Math.floor(enemy.warningRemaining / 70) % 2 === 0 ? 0.55 : 1);
            enemy.warningLine.clear();
            enemy.warningLine.lineStyle(2.2, enemy.type.color, 0.9);
            enemy.warningLine.beginPath();
            enemy.warningLine.moveTo(enemy.container.x, enemy.container.y + 20);
            enemy.warningLine.lineTo(this.player.x, this.player.y - 24);
            enemy.warningLine.strokePath();

            if (enemy.warningRemaining <= 0) {
                enemy.container.setAlpha(1);
                enemy.warningLine.clear();
                this.fireEnemyProjectile(enemy);
                enemy.warningRemaining = null;
                enemy.fireCooldown = enemy.fireInterval;
            }
        }
    }
}

startBossEncounter() {
    if (this.boss || this.threatLevel < this.nextBossThreatLevel) return;

    const bossNumber = Math.floor(this.nextBossThreatLevel / 10);
    const cycle = Math.floor((bossNumber - 1) / BOSS_TYPES.length);
    const type = BOSS_TYPES[(bossNumber - 1) % BOSS_TYPES.length];
    const maxHealth = type.health + cycle * 30;

    while (this.enemyShips.length > 0) this.removeEnemyShip(0);
    while (this.enemyProjectiles.length > 0) this.removeEnemyProjectile(0);
    while (this.asteroids.length > 5) this.asteroids.pop().destroy();

    const container = this.add.container(480, -90).setDepth(4);
    const artwork = this.add.graphics();
    this.drawBossArtwork(artwork, type.id, type.color);
    container.add(artwork);
    const orbit = this.add.ellipse(0, 0, 142, 92, 0x000000, 0)
        .setStrokeStyle(2, type.color, 0.75)
        .setBlendMode(Phaser.BlendModes.ADD);
    container.add(orbit);

    const warningLine = this.add.graphics().setDepth(3.8);
    this.boss = {
        type,
        cycle,
        container,
        warningLine,
        orbit,
        health: maxHealth,
        maxHealth,
        contactDamage: 18 + cycle * 2,
        elapsed: 0,
        entered: false,
        warningRemaining: null,
        attackCooldown: 1600,
        attackInterval: Math.max(3000, type.interval - cycle * 220),
        projectileSpeed: type.projectileSpeed + cycle * 14,
        damage: Math.min(13, type.damage + cycle),
        phase: 1,
        driftPhase: Math.random() * Math.PI * 2
    };
    this.bossHeaderText
        .setText(`BOSS BATTLE  //  ${type.name}  //  THREAT ${this.nextBossThreatLevel}`)
        .setColor(`#${type.color.toString(16).padStart(6, '0')}`)
        .setAlpha(1);
    this.bossWarningText.setAlpha(0);
    this.bossHealthGraphics.setVisible(true);
    this.threatAlert.setAlpha(0);
    this.drawBossHealthDisplay();

    this.game.events.emit('accessibility:announce', `Boss battle: ${type.name}. Signature attack: ${type.attackName}.`);
    this.tweens.add({ targets: this.bossHeaderText, scaleX: 1.06, scaleY: 1.06, duration: 180, yoyo: true });
}

drawBossArtwork(graphics, bossId, color) {
    graphics.lineStyle(2.5, 0xf5f7ff, 0.95);
    graphics.fillStyle(color, 0.94);
    graphics.beginPath();

    if (bossId === 'aegis') {
        [[0, -42], [34, -25], [48, 0], [32, 28], [0, 42], [-32, 28], [-48, 0], [-34, -25]]
            .forEach(([x, y], index) => index === 0 ? graphics.moveTo(x, y) : graphics.lineTo(x, y));
    } else if (bossId === 'hunter') {
        [[0, -48], [19, -18], [52, 12], [26, 11], [37, 36], [0, 24], [-37, 36], [-26, 11], [-52, 12], [-19, -18]]
            .forEach(([x, y], index) => index === 0 ? graphics.moveTo(x, y) : graphics.lineTo(x, y));
    } else if (bossId === 'chrono') {
        [[0, -48], [17, -18], [46, 0], [17, 18], [0, 48], [-17, 18], [-46, 0], [-17, -18]]
            .forEach(([x, y], index) => index === 0 ? graphics.moveTo(x, y) : graphics.lineTo(x, y));
    } else {
        for (let point = 0; point < 16; point++) {
            const angle = -Math.PI / 2 + point * Math.PI / 8;
            const radius = point % 2 === 0 ? 50 : 27;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (point === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
    }

    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    graphics.fillStyle(0x080b1d, 0.96);
    graphics.fillEllipse(0, 0, bossId === 'singularity' ? 27 : 24, bossId === 'singularity' ? 27 : 36);
    graphics.lineStyle(2, color, 0.92);
    graphics.strokeEllipse(0, 0, 37, 47);

    if (bossId === 'aegis') {
        graphics.lineStyle(2, 0xe0fbff, 0.82);
        graphics.strokeCircle(0, 0, 58);
        graphics.fillStyle(0xffffff, 0.95);
        [-1, 1].forEach((side) => graphics.fillCircle(side * 43, 0, 5));
    } else if (bossId === 'hunter') {
        graphics.lineStyle(2, 0xffe4e9, 0.92);
        graphics.lineBetween(-39, 13, -65, 40);
        graphics.lineBetween(39, 13, 65, 40);
        graphics.fillStyle(0xffffff, 0.92);
        graphics.fillTriangle(-8, -20, 8, -20, 0, -37);
    } else if (bossId === 'chrono') {
        graphics.lineStyle(1.7, 0xe7e1ff, 0.82);
        graphics.strokeEllipse(0, 0, 120, 65);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(-54, 0, 4);
        graphics.fillCircle(54, 0, 4);
    } else {
        graphics.fillStyle(0x090713, 0.98);
        graphics.fillCircle(0, 0, 12);
        graphics.lineStyle(2.5, 0xffffff, 0.9);
        graphics.strokeCircle(0, 0, 18);
        graphics.fillStyle(0xffffff, 0.92);
        graphics.fillCircle(-40, -30, 4);
        graphics.fillCircle(40, -30, 4);
    }
}

updateBoss(delta) {
    const boss = this.boss;
    if (!boss) return;

    boss.elapsed += delta / 1000;
    boss.container.x = 480 + Math.sin(boss.elapsed * (0.48 + boss.cycle * 0.04) + boss.driftPhase) * 135;
    if (!boss.entered) {
        boss.container.y += 115 * delta / 1000;
        if (boss.container.y >= 87) {
            boss.container.y = 87;
            boss.entered = true;
        }
    } else {
        boss.container.y = 87 + Math.sin(boss.elapsed * 0.9) * 8;
    }
    boss.orbit.rotation += delta * 0.00045 * (boss.type.id === 'chrono' ? -1 : 1);

    const nextPhase = boss.health <= boss.maxHealth * 0.3 ? 3 : boss.health <= boss.maxHealth * 0.62 ? 2 : 1;
    if (nextPhase > boss.phase) {
        boss.phase = nextPhase;
        this.showBossWarning(`PHASE ${['', 'I', 'II', 'III'][boss.phase]}  //  ATTACK RATE INCREASING`, boss.type.color, 1500);
        this.game.events.emit('accessibility:announce', `${boss.type.name} entered phase ${boss.phase}. Attack rate increased.`);
    }

    if (boss.warningRemaining === null) {
        boss.attackCooldown -= delta;
        if (boss.attackCooldown <= 0 && boss.entered) {
            boss.warningRemaining = 950;
            this.showBossWarning(`${boss.type.attackName}  //  EVADE`, 0xffffff, 850);
            this.game.events.emit('accessibility:announce', `${boss.type.name} attack incoming: ${boss.type.attackName}. Evade.`);
        }
    } else {
        boss.warningRemaining -= delta;
        boss.warningLine.clear();
        boss.warningLine.lineStyle(2.4, boss.type.color, 0.9);
        boss.warningLine.beginPath();
        boss.warningLine.moveTo(boss.container.x, boss.container.y + 35);
        boss.warningLine.lineTo(this.player.x, this.player.y - 24);
        boss.warningLine.strokePath();
        boss.container.setAlpha(Math.floor(boss.warningRemaining / 90) % 2 === 0 ? 0.58 : 1);

        if (boss.warningRemaining <= 0) {
            boss.container.setAlpha(1);
            boss.warningLine.clear();
            this.fireBossAttack(boss);
            boss.warningRemaining = null;
            boss.attackCooldown = Math.max(2850, boss.attackInterval - (boss.phase - 1) * 430);
        }
    }

    this.drawBossHealthDisplay();
}

drawBossHealthDisplay() {
    const boss = this.boss;
    const graphics = this.bossHealthGraphics;
    graphics.clear();
    if (!boss) {
        graphics.setVisible(false);
        return;
    }

    const x = 274;
    const y = 59;
    const width = 412;
    const height = 14;
    const fillWidth = (width - 8) * (boss.health / boss.maxHealth);
    const color = boss.phase === 3 ? 0xfb7185 : boss.type.color;

    graphics.fillStyle(0x070916, 0.96);
    graphics.fillRoundedRect(x - 9, y - 4, width + 18, height + 8, 7);
    graphics.lineStyle(2, color, 0.98);
    graphics.strokeRoundedRect(x - 9, y - 4, width + 18, height + 8, 7);
    graphics.fillStyle(0x242039, 1);
    graphics.fillRoundedRect(x, y, width, height, 4);
    graphics.fillStyle(color, 0.94);
    graphics.fillRoundedRect(x + 3, y + 3, Math.max(0, fillWidth), height - 6, 2);

    for (let segment = 1; segment < 10; segment++) {
        const tickX = x + (width * segment) / 10;
        graphics.lineStyle(1, 0xe9e7ff, boss.type.id === 'aegis' ? 0.65 : 0.28);
        graphics.lineBetween(tickX, y + 1, tickX, y + height - 1);
    }
    graphics.fillStyle(color, 1);
    if (boss.type.id === 'hunter') {
        graphics.fillTriangle(x - 17, y + height / 2, x - 6, y + 1, x - 6, y + height - 1);
        graphics.fillTriangle(x + width + 17, y + height / 2, x + width + 6, y + 1, x + width + 6, y + height - 1);
    } else if (boss.type.id === 'chrono') {
        graphics.fillCircle(x - 12, y + height / 2, 5);
        graphics.fillCircle(x + width + 12, y + height / 2, 5);
    } else if (boss.type.id === 'singularity') {
        graphics.fillCircle(x - 12, y + height / 2, 6);
        graphics.fillCircle(x + width + 12, y + height / 2, 6);
        graphics.fillStyle(0x070916, 1);
        graphics.fillCircle(x - 12, y + height / 2, 3);
        graphics.fillCircle(x + width + 12, y + height / 2, 3);
    }

    this.bossHeaderText.setColor(`#${color.toString(16).padStart(6, '0')}`);
}

showBossWarning(message, color = 0xffffff, duration = 950) {
    this.tweens.killTweensOf(this.bossWarningText);
    this.bossWarningText.setText(message)
        .setColor(`#${color.toString(16).padStart(6, '0')}`)
        .setAlpha(1);
    this.tweens.add({ targets: this.bossWarningText, alpha: 0, delay: Math.max(0, duration - 220), duration: 220 });
}

fireBossAttack(boss) {
    const originX = boss.container.x;
    const originY = boss.container.y + 30;
    const targetAngle = Phaser.Math.Angle.Between(originX, originY, this.player.x, this.player.y);
    const speed = boss.projectileSpeed;
    const damage = boss.damage;

    if (boss.type.attack === 'fan') {
        const count = boss.phase === 3 ? 7 : 5;
        for (let shot = 0; shot < count; shot++) {
            const spread = (shot - (count - 1) / 2) * (boss.phase === 3 ? 0.17 : 0.2);
            this.spawnHostileProjectile(originX, originY, targetAngle + spread, speed, damage, boss.type.color);
        }
    } else if (boss.type.attack === 'lock') {
        [-0.16, 0, 0.16].forEach((spread) => (
            this.spawnHostileProjectile(originX, originY, targetAngle + spread, speed * 1.12, damage, boss.type.color)
        ));
        if (boss.phase === 3) {
            [-0.08, 0.08].forEach((spread) => (
                this.spawnHostileProjectile(originX, originY, targetAngle + spread, speed * 0.96, damage, boss.type.color)
            ));
        }
    } else if (boss.type.attack === 'spiral') {
        const count = boss.phase === 3 ? 10 : 8;
        const phaseAngle = boss.elapsed * 1.4;
        for (let shot = 0; shot < count; shot++) {
            const angle = phaseAngle + (Math.PI * 2 * shot) / count;
            this.spawnHostileProjectile(originX, originY, angle, speed * 0.84, damage, boss.type.color);
        }
    } else {
        for (let shot = 0; shot < 6; shot++) {
            const angle = Math.PI / 6 + (Math.PI * 2 * shot) / 6;
            this.spawnHostileProjectile(originX, originY, angle, speed * 0.76, damage, boss.type.color);
        }
        this.spawnHostileProjectile(originX, originY, targetAngle, speed * 1.18, damage + 1, boss.type.color);
        if (boss.phase >= 2) {
            this.spawnHostileProjectile(originX, originY, targetAngle - 0.12, speed, damage, boss.type.color);
            this.spawnHostileProjectile(originX, originY, targetAngle + 0.12, speed, damage, boss.type.color);
        }
    }
}

spawnHostileProjectile(x, y, angle, speed, damage, color) {
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    const glow = this.add.circle(x, y, 9, color, 0.3)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3.2);
    const core = this.add.circle(x, y, 4.2, 0xfff8ff, 0.98)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3.3);
    this.enemyProjectiles.push({ glow, core, velocityX, velocityY, damage, age: 0 });
}

damageBoss(damage, impactX, impactY) {
    const boss = this.boss;
    if (!boss) return;

    boss.health = Math.max(0, boss.health - damage);
    this.impactParticles.explode(7, impactX, impactY);
    this.drawBossHealthDisplay();
    if (boss.health <= 0) this.defeatBoss();
}

defeatBoss() {
    const boss = this.boss;
    if (!boss) return;

    const x = boss.container.x;
    const y = boss.container.y;
    let slot = this.bossPowerSlots.find((power) => power.id === boss.type.id);
    let powerText;
    if (slot) {
        const previousLevel = slot.level;
        slot.level = Math.min(3, slot.level + 1);
        slot.remaining = 0;
        powerText = slot.level > previousLevel ? `${slot.name} UPGRADED TO MK-${slot.level}` : `${slot.name} RECHARGED`;
    } else {
        slot = this.bossPowerSlots.find((power) => power.level === 0);
        if (slot) {
            this.assignBossPower(slot, boss.type);
            powerText = `${slot.name} ACQUIRED`;
        } else {
            this.pendingBossPowerType = boss.type;
            this.pendingBossPowerChoiceReady = false;
            this.time.delayedCall(820, () => {
                if (this.pendingBossPowerType === boss.type) {
                    this.pendingBossPowerChoiceReady = true;
                    this.showBossPowerChoice(boss.type);
                }
            });
            powerText = 'CHOOSE AN ABILITY TO REPLACE';
        }
    }
    this.burstBossCore(boss, x, y);
    for (let index = this.asteroids.length - 1; index >= 0; index--) {
        this.disintegrateAsteroid(this.asteroids[index]);
        this.asteroids[index].destroy();
    }
    this.asteroids.length = 0;
    this.asteroidRespawnRemaining = 1000;
    this.time.delayedCall(1000, () => {
        this.asteroidRespawnRemaining = 0;
        const targetAsteroidCount = 5 + Math.floor(this.threatLevel / 2);
        while (this.asteroids.length < targetAsteroidCount) {
            this.asteroids.push(this.spawnAsteroid(-50 - Math.random() * 350));
        }
    });
    boss.container.destroy();
    boss.warningLine.destroy();
    this.boss = null;
    this.bossHeaderText
        .setText(`BOSS DESTROYED  //  ${powerText}`)
        .setColor('#ffe277')
        .setAlpha(1);
    this.bossHealthGraphics.clear().setVisible(false);
    this.bossWarningText.setAlpha(0);
    this.showBossWarning('DEBRIS FIELD CLEARED  //  REFORMING', boss.type.color, 1050);
    this.threatAlert.setAlpha(1);
    this.tweens.add({ targets: this.bossHeaderText, alpha: 0, delay: 2400, duration: 400 });
    this.nextBossThreatLevel += 10;
    this.enemySpawnTimer = 9000;
    this.score += 300;
    this.game.events.emit('mission:progress', { id: 'bossBattles', amount: 1 });
    this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
    this.updateThreatProgression();
    this.emitCockpitUpdate();
    this.emitBossPowerStatus();
    this.game.events.emit('accessibility:announce', this.pendingBossPowerType
        ? `${boss.type.name} defeated. Choose one of your three equipped powers to replace. Press 1, 2, or 3 to choose.`
        : `${boss.type.name} defeated. ${slot.name} is ready in slot ${slot.key}. Press ${slot.key} to use it.`);
}

burstBossCore(boss, x, y) {
    const color = boss.type.color;
    const colors = [color, 0xf0abfc, 0xa78bfa, 0x67e8f9, 0xffffff];
    this.explosionParticles.explode(115, x, y);
    this.createShockwave(x, y, color, 18, 820);
    this.createShockwave(x, y, 0xffffff, 7, 620);
    this.cameras.main.shake(220, 0.006);

    const coreGlow = this.add.circle(x, y, 22, color, 0.7)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(5.2);
    const core = this.add.circle(x, y, 10, 0xffffff, 0.98)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(5.3);
    this.tweens.add({
        targets: coreGlow,
        scale: 4.6,
        alpha: 0,
        duration: 720,
        ease: 'Cubic.Out',
        onComplete: () => coreGlow.destroy()
    });
    this.tweens.add({
        targets: core,
        scale: 2.8,
        alpha: 0,
        duration: 460,
        ease: 'Cubic.Out',
        onComplete: () => core.destroy()
    });

    for (let index = 0; index < 22; index++) {
        const angle = (Math.PI * 2 * index) / 22 + Math.random() * 0.18;
        const distance = 8 + Math.random() * 22;
        const size = 7 + Math.random() * 12;
        const fragment = this.add.triangle(
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance,
            0, -size,
            size * 0.75, size,
            -size * 0.75, size,
            colors[index % colors.length],
            0.98
        ).setRotation(angle).setBlendMode(Phaser.BlendModes.ADD).setDepth(5.1);
        this.tweens.add({
            targets: fragment,
            x: fragment.x + Math.cos(angle) * (90 + Math.random() * 120),
            y: fragment.y + Math.sin(angle) * (90 + Math.random() * 120),
            rotation: angle + (Math.random() - 0.5) * 7,
            scale: 0.12,
            alpha: 0,
            duration: 620 + Math.random() * 520,
            ease: 'Cubic.Out',
            onComplete: () => fragment.destroy()
        });
    }

    // Soft glowing core pieces give the boss a stylized, non-gory organic breakup.
    for (let index = 0; index < 5; index++) {
        const angle = (Math.PI * 2 * index) / 5 + 0.22;
        const organ = this.add.ellipse(
            x + Math.cos(angle) * 17,
            y + Math.sin(angle) * 17,
            13 + Math.random() * 8,
            9 + Math.random() * 6,
            colors[(index + 1) % colors.length],
            0.9
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(5.15);
        this.tweens.add({
            targets: organ,
            x: organ.x + Math.cos(angle) * (105 + Math.random() * 55),
            y: organ.y + Math.sin(angle) * (105 + Math.random() * 55),
            rotation: (Math.random() - 0.5) * 8,
            scale: 0.1,
            alpha: 0,
            duration: 740 + Math.random() * 440,
            ease: 'Cubic.Out',
            onComplete: () => organ.destroy()
        });
    }
}

disintegrateAsteroid(asteroid) {
    const x = asteroid.x;
    const y = asteroid.y;
    const color = asteroid.strokeColor || 0xc084fc;
    this.impactParticles.explode(14, x, y);
    this.createShockwave(x, y, color, 5, 420);

    for (let index = 0; index < 6; index++) {
        const angle = (Math.PI * 2 * index) / 6 + Math.random() * 0.25;
        const size = 3 + Math.random() * 5;
        const shard = this.add.triangle(
            x + Math.cos(angle) * 5,
            y + Math.sin(angle) * 5,
            0, -size,
            size, size,
            -size, size,
            color,
            0.9
        ).setBlendMode(Phaser.BlendModes.ADD).setDepth(2.2);
        this.tweens.add({
            targets: shard,
            x: x + Math.cos(angle) * (28 + asteroid.radius),
            y: y + Math.sin(angle) * (28 + asteroid.radius),
            rotation: angle + 3,
            scale: 0.1,
            alpha: 0,
            duration: 340 + Math.random() * 240,
            ease: 'Cubic.Out',
            onComplete: () => shard.destroy()
        });
    }
}

assignBossPower(slot, type) {
    Object.assign(slot, {
        id: type.id,
        name: type.powerName,
        description: type.powerDescription,
        color: type.color,
        cooldown: type.cooldown,
        remaining: 0,
        level: 1
    });
}

showBossPowerChoice(type) {
    this.game.events.emit('boss-powers:status', []);
    const choice = this.add.container(480, 270).setDepth(20);
    const frame = this.add.rectangle(0, 0, 700, 230, 0x080b1a, 0.98)
        .setStrokeStyle(2, type.color, 0.98);
    choice.add(frame);
    choice.add(this.add.text(0, -91, 'BOSS CORE RECOVERED', {
        fontSize: '18px', fontFamily: 'Cascadia Mono, Consolas, monospace',
        fontStyle: 'bold', color: '#ffe277', letterSpacing: 2
    }).setOrigin(0.5));
    choice.add(this.add.text(0, -61, `EQUIP ${type.powerName}  //  CHOOSE ONE POWER TO REPLACE`, {
        fontSize: '10px', fontFamily: 'Cascadia Mono, Consolas, monospace',
        color: '#e7e9f7', letterSpacing: 0.6
    }).setOrigin(0.5));

    this.bossPowerSlots.forEach((slot, index) => {
        const x = (index - 1) * 220;
        const card = this.add.rectangle(x, 7, 198, 82, 0x17152a, 1)
            .setStrokeStyle(1.5, slot.color, 0.9)
            .setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setFillStyle(0x29213f));
        card.on('pointerout', () => card.setFillStyle(0x17152a));
        card.on('pointerdown', () => this.replaceBossPower(index));
        choice.add(card);
        choice.add(this.add.text(x, -10, `${slot.key}  //  ${slot.name}`, {
            fontSize: '10px', fontFamily: 'Cascadia Mono, Consolas, monospace',
            fontStyle: 'bold', color: `#${slot.color.toString(16).padStart(6, '0')}`,
            wordWrap: { width: 176 }, align: 'center'
        }).setOrigin(0.5));
        choice.add(this.add.text(x, 13, slot.description, {
            fontSize: '8px', fontFamily: 'Cascadia Mono, Consolas, monospace', color: '#c4c8df',
            wordWrap: { width: 176 }, align: 'center'
        }).setOrigin(0.5));
        choice.add(this.add.text(x, 34, `MK-${slot.level}  //  REPLACE`, {
            fontSize: '8px', fontFamily: 'Cascadia Mono, Consolas, monospace', color: '#c4c8df'
        }).setOrigin(0.5));
    });
    choice.add(this.add.text(0, 72, 'SELECT A CARD OR PRESS 1, 2, OR 3  //  THE REPLACED POWER IS LOST THIS RUN', {
        fontSize: '9px', fontFamily: 'Cascadia Mono, Consolas, monospace',
        color: '#9ba3bd', letterSpacing: 0.3
    }).setOrigin(0.5));
    this.bossPowerChoiceUI = choice;
}

replaceBossPower(slotIndex) {
    const type = this.pendingBossPowerType;
    const slot = this.bossPowerSlots[slotIndex];
    if (!type || !slot) return;
    const replacedName = slot.name;
    this.assignBossPower(slot, type);
    this.pendingBossPowerType = null;
    this.pendingBossPowerChoiceReady = false;
    this.bossPowerChoiceUI?.destroy(true);
    this.bossPowerChoiceUI = null;
    this.bossHeaderText
        .setText(`POWER EQUIPPED  //  ${slot.name}  //  SLOT ${slot.key}`)
        .setColor(`#${type.color.toString(16).padStart(6, '0')}`)
        .setAlpha(1);
    this.showPowerUpAlert(`${slot.name}  //  REPLACED ${replacedName}`, type.color);
    this.game.events.emit('accessibility:announce', `${slot.name} equipped in slot ${slot.key}, replacing ${replacedName}.`);
    this.emitBossPowerStatus();
}

emitBossPowerStatus() {
    if (this.pendingBossPowerType) {
        this.game.events.emit('boss-powers:status', []);
        return;
    }
    this.game.events.emit('boss-powers:status', this.bossPowerSlots.map((slot) => ({
        ...slot,
        unlocked: slot.level > 0
    })));
}

activateBossPower(slotIndex) {
    const slot = this.bossPowerSlots[slotIndex];
    if (!slot || slot.level <= 0 || slot.remaining > 0 || this.gameOver) return;

    slot.remaining = slot.cooldown;
    if (slot.id === 'aegis') {
        const duration = 5600 + slot.level * 900;
        this.phaseShieldRemaining = Math.max(this.phaseShieldRemaining, duration);
        this.phaseShieldDuration = this.phaseShieldRemaining;
        this.clearEnemyProjectiles();
        this.createShockwave(this.player.x, this.player.y, slot.color, 16, 520);
    } else if (slot.id === 'hunter') {
        this.fireBossSeekingSalvo(slot.level, slot.color);
    } else if (slot.id === 'chrono') {
        this.temporalSlowRemaining = Math.max(this.temporalSlowRemaining, 6500 + slot.level * 1400);
        this.createShockwave(this.player.x, this.player.y, slot.color, 15, 460);
    } else if (slot.id === 'singularity') {
        this.clearEnemyProjectiles();
        this.createShockwave(this.player.x, this.player.y, slot.color, 28, 720);
        this.createShockwave(this.player.x, this.player.y, 0xffffff, 10, 560);
        this.cameras.main.shake(150, 0.003);

        const targets = this.asteroids.filter((asteroid) => (
            Phaser.Math.Distance.Between(this.player.x, this.player.y, asteroid.x, asteroid.y) <= 360
        ));
        const maxTargets = 5 + slot.level;
        targets.slice(0, maxTargets).forEach((asteroid) => {
            const asteroidIndex = this.asteroids.indexOf(asteroid);
            if (asteroidIndex !== -1) this.destroyAsteroid(asteroidIndex);
        });
        for (let index = this.enemyShips.length - 1; index >= 0; index--) {
            this.damageEnemyShip(index, 4 + slot.level, this.enemyShips[index].container.x, this.enemyShips[index].container.y);
        }
        if (this.boss) this.damageBoss(22 + slot.level * 6, this.boss.container.x, this.boss.container.y);
    }

    this.showPowerUpAlert(`${slot.name}  //  ACTIVATED`, slot.color);
    this.game.events.emit('accessibility:announce', `${slot.name} activated. Cooldown ${Math.round(slot.cooldown / 1000)} seconds.`);
    this.emitBossPowerStatus();
}

clearEnemyProjectiles() {
    while (this.enemyProjectiles.length > 0) this.removeEnemyProjectile(0);
}

fireBossSeekingSalvo(level, color) {
    const targets = this.boss
        ? [{ kind: 'boss', target: this.boss }]
        : [...this.enemyShips.map((target) => ({ kind: 'enemy', target })),
            ...this.asteroids.map((target) => ({ kind: 'asteroid', target }))];
    if (targets.length === 0) return;

    const count = 6 + level * 2;
    for (let index = 0; index < count; index++) {
        const offset = (index - (count - 1) / 2) * 8;
        const x = this.player.x + offset;
        const y = this.player.y - 24;
        const angle = -Math.PI / 2 + offset * 0.008;
        const glow = this.add.circle(x, y, 8, color, 0.42)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(3.4);
        const core = this.add.triangle(x, y, 0, -8, 6, 6, -6, 6, 0xf5f7ff, 1)
            .setRotation(angle)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(3.5);
        this.bossPowerProjectiles.push({
            glow,
            core,
            targetKind: targets[index % targets.length].kind,
            target: targets[index % targets.length].target,
            angle,
            speed: 470,
            damage: 3 + level,
            age: 0
        });
    }
}

updateBossPowerProjectiles(delta) {
    for (let index = this.bossPowerProjectiles.length - 1; index >= 0; index--) {
        const shot = this.bossPowerProjectiles[index];
        shot.age += delta / 1000;
        const targetExists = shot.targetKind === 'boss'
            ? this.boss === shot.target
            : shot.targetKind === 'enemy'
                ? this.enemyShips.includes(shot.target)
                : this.asteroids.includes(shot.target);

        if (!targetExists || shot.age > 3) {
            const candidates = this.boss
                ? [{ kind: 'boss', target: this.boss }]
                : [...this.enemyShips.map((target) => ({ kind: 'enemy', target })),
                    ...this.asteroids.map((target) => ({ kind: 'asteroid', target }))];
            if (candidates.length === 0 || shot.age > 3) {
                shot.glow.destroy();
                shot.core.destroy();
                this.bossPowerProjectiles.splice(index, 1);
                continue;
            }
            const nearest = candidates.reduce((best, candidate) => {
                const point = candidate.kind === 'boss' ? candidate.target.container : candidate.target;
                const distance = Phaser.Math.Distance.Between(shot.core.x, shot.core.y, point.x, point.y);
                return distance < best.distance ? { ...candidate, distance } : best;
            }, { distance: Infinity });
            shot.targetKind = nearest.kind;
            shot.target = nearest.target;
        }

        const target = shot.targetKind === 'boss' ? shot.target.container : shot.target;
        const targetAngle = Phaser.Math.Angle.Between(shot.core.x, shot.core.y, target.x, target.y);
        shot.angle = Phaser.Math.Angle.RotateTo(shot.angle, targetAngle, 4.2 * delta / 1000);
        const step = delta / 1000;
        shot.core.x += Math.cos(shot.angle) * shot.speed * step;
        shot.core.y += Math.sin(shot.angle) * shot.speed * step;
        shot.core.setRotation(shot.angle);
        shot.glow.setPosition(shot.core.x, shot.core.y);

        const hitRadius = shot.targetKind === 'boss' ? 58 : shot.targetKind === 'enemy' ? 36 : shot.target.radius;
        if (Phaser.Math.Distance.Between(shot.core.x, shot.core.y, target.x, target.y) <= hitRadius) {
            this.impactParticles.explode(7, shot.core.x, shot.core.y);
            if (shot.targetKind === 'boss' && this.boss === shot.target) {
                this.damageBoss(shot.damage, shot.core.x, shot.core.y);
            } else if (shot.targetKind === 'enemy') {
                const enemyIndex = this.enemyShips.indexOf(shot.target);
                if (enemyIndex !== -1) this.damageEnemyShip(enemyIndex, shot.damage, shot.core.x, shot.core.y);
            } else if (shot.targetKind === 'asteroid') {
                const asteroidIndex = this.asteroids.indexOf(shot.target);
                if (asteroidIndex !== -1) this.destroyAsteroid(asteroidIndex);
            }
            shot.glow.destroy();
            shot.core.destroy();
            this.bossPowerProjectiles.splice(index, 1);
        }
    }
}

spawnEnemyShip() {
    const availableTypes = ENEMY_SHIP_TYPES.filter(({ unlockLevel }) => this.threatLevel >= unlockLevel);
    const type = Phaser.Utils.Array.GetRandom(availableTypes);
    const levelSteps = Math.floor((this.threatLevel - type.unlockLevel) / 3);
    const maxHealth = type.health + levelSteps;
    const scale = 1 + Math.min(0.22, levelSteps * 0.04);
    const x = Phaser.Math.Between(90, 870);
    const container = this.add.container(x, -55).setDepth(3).setScale(scale);
    const artwork = this.add.graphics();
    artwork.fillStyle(type.color, 0.9);
    artwork.lineStyle(2, 0xf3f0ff, 0.95);
    artwork.beginPath();
    artwork.moveTo(type.hull[0][0], type.hull[0][1]);
    type.hull.slice(1).forEach(([pointX, pointY]) => artwork.lineTo(pointX, pointY));
    artwork.closePath();
    artwork.fillPath();
    artwork.strokePath();
    artwork.fillStyle(0x10172e, 1);
    artwork.fillEllipse(0, -5, 12, 17);
    artwork.lineStyle(1.5, 0xffffff, 0.76);
    artwork.beginPath();
    artwork.moveTo(-10, 3);
    artwork.lineTo(0, 13);
    artwork.lineTo(10, 3);
    artwork.strokePath();
    container.add(artwork);

    const warningLine = this.add.graphics().setDepth(2.8);
    const healthBar = this.add.graphics().setDepth(4.2);
    const enemy = {
        type,
        container,
        warningLine,
        healthBar,
        health: maxHealth,
        maxHealth,
        speed: type.speed + Math.min(32, this.threatLevel * 1.8),
        fireInterval: Math.max(1150, type.fireInterval - this.threatLevel * 30),
        projectileSpeed: type.projectileSpeed + Math.min(70, this.threatLevel * 3.5),
        damage: Math.min(14, type.damage + Math.floor((this.threatLevel - type.unlockLevel) / 4)),
        originX: x,
        drift: 30 + Math.min(32, this.threatLevel * 2),
        driftPhase: Math.random() * Math.PI * 2,
        elapsed: 0,
        hovering: false,
        fireCooldown: 1250,
        warningRemaining: null
    };
    this.enemyShips.push(enemy);

    this.tweens.killTweensOf(this.enemyAlert);
    this.enemyAlert.setText(`HOSTILE CONTACT  //  ${type.name}  T-${this.threatLevel}`)
        .setColor(`#${type.color.toString(16).padStart(6, '0')}`)
        .setAlpha(1);
    this.game.events.emit('accessibility:announce', `Hostile ship approaching: ${type.name}.`);
    this.tweens.add({ targets: this.enemyAlert, alpha: 0, delay: 1250, duration: 650, ease: 'Sine.Out' });
}

fireEnemyProjectile(enemy) {
    const x = enemy.container.x;
    const y = enemy.container.y + 18;
    const angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
    this.spawnHostileProjectile(x, y, angle, enemy.projectileSpeed, enemy.damage, enemy.type.color);
}

updateEnemyProjectiles(delta) {
    for (let index = this.enemyProjectiles.length - 1; index >= 0; index--) {
        const projectile = this.enemyProjectiles[index];
        const step = delta / 1000;
        projectile.core.x += projectile.velocityX * step;
        projectile.core.y += projectile.velocityY * step;
        projectile.glow.setPosition(projectile.core.x, projectile.core.y);
        projectile.age += step;

        const hitPlayer = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            projectile.core.x,
            projectile.core.y
        ) < 25;
        if (hitPlayer) {
            const impact = { x: projectile.core.x, y: projectile.core.y };
            const damage = projectile.damage;
            this.removeEnemyProjectile(index);
            this.handleCollision(this.player, impact, damage);
            if (this.gameOver) return;
        } else if (
            projectile.age > 6 || projectile.core.x < -30 || projectile.core.x > 990 ||
            projectile.core.y < -30 || projectile.core.y > 570
        ) {
            this.removeEnemyProjectile(index);
        }
    }
}

removeEnemyProjectile(index) {
    const [projectile] = this.enemyProjectiles.splice(index, 1);
    projectile.glow.destroy();
    projectile.core.destroy();
}

damageEnemyShip(index, damage, impactX, impactY) {
    const enemy = this.enemyShips[index];
    enemy.health = Math.max(0, enemy.health - damage);
    this.impactParticles.explode(5, impactX, impactY);
    this.cameras.main.shake(45, 0.0012);
    if (enemy.health <= 0) this.destroyEnemyShip(index);
}

destroyEnemyShip(index) {
    const enemy = this.enemyShips[index];
    const x = enemy.container.x;
    const y = enemy.container.y;
    this.explosionParticles.explode(32, x, y);
    this.createShockwave(x, y, enemy.type.color, 8, 360);
    this.removeEnemyShip(index);
    this.score += 150;
    this.game.events.emit('mission:progress', { id: 'enemyShips', amount: 1 });
    this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
    this.updateThreatProgression();
    this.emitCockpitUpdate();

    const damaged = this.health < this.maxHealth;
    const dropType = damaged
        ? POWER_UP_TYPES.find(({ id }) => id === 'nanite')
        : POWER_UP_TYPES.find(({ id }) => id === 'shield');
    this.spawnPowerUp(dropType, x, y);
    this.showPowerUpAlert(
        `${enemy.type.name} DESTROYED  //  ${dropType.id === 'nanite' ? 'HULL REPAIR' : 'PHASE SHIELD'} DROPPED`,
        dropType.color
    );
}

removeEnemyShip(index) {
    const [enemy] = this.enemyShips.splice(index, 1);
    enemy.container.destroy();
    enemy.warningLine.destroy();
    enemy.healthBar.destroy();
}

updateThreatProgression() {
    const scoreProgress = this.score / 500;
    const nextThreatLevel = Math.floor(scoreProgress);
    this.speedMultiplier = 1 + scoreProgress * 0.08;

    this.asteroids.forEach((asteroid) => {
        asteroid.setDifficultyMultiplier(this.speedMultiplier);
    });

    if (nextThreatLevel <= this.threatLevel) {
        return;
    }

    const gainedThreatLevels = nextThreatLevel - this.threatLevel;
    this.threatLevel = nextThreatLevel;
    this.game.events.emit('mission:progress', { id: 'threatLevels', amount: gainedThreatLevels });
    this.threatAlert.setText(
        `THREAT LEVEL ${this.threatLevel.toString().padStart(2, '0')}  //  INCREASED`
    ).setAlpha(1);
    this.game.events.emit('accessibility:announce', `Threat level increased to ${this.threatLevel}.`);
    this.tweens.killTweensOf(this.threatAlert);
    this.tweens.add({
        targets: this.threatAlert,
        alpha: 0,
        delay: 900,
        duration: 650,
        ease: 'Sine.Out'
    });

    const targetAsteroidCount = 5 + Math.floor(this.threatLevel / 2);
    while (this.asteroidRespawnRemaining <= 0 && this.asteroids.length < targetAsteroidCount) {
        this.asteroids.push(this.spawnAsteroid(-50 - Math.random() * 350));
    }
    this.startBossEncounter();
}

fireLasers() {
    this.game.events.emit('mission:progress', { id: 'laserVolleys', amount: 1 });

    const laserPorts = this.overchargeRemaining > 0 ? [-12, 0, 12] : [-7, 7];
    for (const offsetX of laserPorts) {
        const x = this.player.x + offsetX;
        const y = this.player.y - 13;
        const glow = this.add.rectangle(x, y, 10, 26, 0x8b5cf6, 0.38)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(2.8);
        const beam = this.add.rectangle(x, y, 3, 20, 0xcffafe, 1)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(2.9);

        this.lasers.push({
            beam,
            glow,
            speed: 760,
            localPoints: [
                { x: 0, y: 0 },
                { x: 3, y: 0 },
                { x: 3, y: 20 },
                { x: 0, y: 20 }
            ]
        });

        this.impactParticles.explode(3, x, y);
    }
}

fireRadialVolley(color) {
    const bulletCount = 16;
    const bulletSpeed = 360;
    const bulletDamage = 1 + this.enemyLaserDamage;
    const originX = this.player.x;
    const originY = this.player.y;

    this.createShockwave(originX, originY, color, 14, 320);
    this.impactParticles.explode(22, originX, originY);
    this.cameras.main.shake(90, 0.002);

    for (let index = this.enemyProjectiles.length - 1; index >= 0; index--) {
        const projectile = this.enemyProjectiles[index];
        if (Phaser.Math.Distance.Between(originX, originY, projectile.core.x, projectile.core.y) <= 210) {
            this.impactParticles.explode(4, projectile.core.x, projectile.core.y);
            this.removeEnemyProjectile(index);
        }
    }

    for (let index = 0; index < bulletCount; index++) {
        const angle = (Math.PI * 2 * index) / bulletCount;
        const velocityX = Math.cos(angle) * bulletSpeed;
        const velocityY = Math.sin(angle) * bulletSpeed;
        const x = originX + Math.cos(angle) * 25;
        const y = originY + Math.sin(angle) * 25;
        const glow = this.add.circle(x, y, 5.5, color, 0.34)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(3.1);
        const core = this.add.circle(x, y, 2.4, 0xe0fbff, 1)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(3.2);
        this.radialShots.push({ glow, core, velocityX, velocityY, damage: bulletDamage, age: 0 });
    }
}

updateRadialShots(delta) {
    for (let shotIndex = this.radialShots.length - 1; shotIndex >= 0; shotIndex--) {
        const shot = this.radialShots[shotIndex];
        const step = delta / 1000;
        shot.core.x += shot.velocityX * step;
        shot.core.y += shot.velocityY * step;
        shot.glow.setPosition(shot.core.x, shot.core.y);
        shot.age += step;

        let hitTarget = false;
        for (let enemyIndex = this.enemyShips.length - 1; enemyIndex >= 0; enemyIndex--) {
            const enemy = this.enemyShips[enemyIndex];
            if (Phaser.Math.Distance.Between(shot.core.x, shot.core.y, enemy.container.x, enemy.container.y) < 31 * enemy.container.scaleX) {
                this.damageEnemyShip(enemyIndex, shot.damage, shot.core.x, shot.core.y);
                hitTarget = true;
                break;
            }
        }

        if (!hitTarget) {
            for (let asteroidIndex = this.asteroids.length - 1; asteroidIndex >= 0; asteroidIndex--) {
                const asteroid = this.asteroids[asteroidIndex];
                if (Phaser.Math.Distance.Between(shot.core.x, shot.core.y, asteroid.x, asteroid.y) < asteroid.radius + 3) {
                    this.destroyAsteroid(asteroidIndex);
                    hitTarget = true;
                    break;
                }
            }
        }

        if (hitTarget || shot.age > 1.7 || shot.core.x < -30 || shot.core.x > 990 || shot.core.y < -30 || shot.core.y > 570) {
            this.removeRadialShot(shotIndex);
        }
    }
}

removeRadialShot(index) {
    const [shot] = this.radialShots.splice(index, 1);
    shot.glow.destroy();
    shot.core.destroy();
}

playWeaponFailure() {
    if (this.weaponFailureActive || this.gameOver) {
        return;
    }

    this.weaponFailureActive = true;

    this.laserGauge.setAlpha(1);
    this.tweens.add({
        targets: this.laserGauge,
        rotation: 0.16,
        alpha: 0.35,
        duration: 45,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
            this.laserGauge.rotation = 0;
            this.laserGauge.setAlpha(1);
        }
    });

    this.weaponMuzzleLights.forEach((light) => {
        light.setFillStyle(0xfb7185).setAlpha(1);
        this.tweens.add({
            targets: light,
            alpha: 0.08,
            duration: 55,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                light.setFillStyle(0x67e8f9).setAlpha(0.78);
            }
        });

        this.weaponFailureParticles.explode(5, light.x, light.y);
    });

    this.cameras.main.shake(65, 0.0012);
    this.time.delayedCall(340, () => {
        this.weaponFailureActive = false;
    });
}

updateLaserGauge() {
    if (!this.laserGauge || !this.player) return;

    this.laserGauge.x = this.player.x + 39;
    this.laserGauge.y = this.player.y - 14;

    const fillColor = this.laserOverheated || this.laserHeat >= 85
        ? 0xfb7185
        : this.laserHeat >= 60
            ? 0xfacc15
            : 0x67e8f9;
    const graphics = this.laserGaugeVisual;
    const fluidHeight = 32 * (this.laserHeat / 100);
    graphics.clear();
    graphics.fillStyle(0x080d1b, 0.52);
    graphics.fillRoundedRect(-5, -19, 10, 38, 5);
    if (fluidHeight > 0) {
        graphics.fillStyle(fillColor, 0.82);
        graphics.fillRoundedRect(-2, 14 - fluidHeight, 4, fluidHeight, Math.min(2, fluidHeight / 2));
    }
    graphics.lineStyle(this.laserOverheated ? 1.8 : 1.2, this.laserOverheated ? 0xfb7185 : 0x8be9f7,
        this.laserOverheated ? 0.95 : 0.62);
    graphics.strokeRoundedRect(-5.5, -20, 11, 40, 5.5);
}

updateLasers(delta) {
    for (let laserIndex = this.lasers.length - 1; laserIndex >= 0; laserIndex--) {
        const laser = this.lasers[laserIndex];
        laser.beam.y -= laser.speed * delta / 1000;
        laser.glow.y = laser.beam.y;

        if (laser.beam.y < -25) {
            laser.beam.destroy();
            laser.glow.destroy();
            this.lasers.splice(laserIndex, 1);
            continue;
        }

        let hitEnemy = false;
        for (let enemyIndex = this.enemyShips.length - 1; enemyIndex >= 0; enemyIndex--) {
            const enemy = this.enemyShips[enemyIndex];
            const enemyScale = enemy.container.scaleX;
            if (
                Math.abs(laser.beam.x - enemy.container.x) < 28 * enemyScale &&
                Math.abs(laser.beam.y - enemy.container.y) < 28 * enemyScale
            ) {
                this.damageEnemyShip(enemyIndex, this.enemyLaserDamage, laser.beam.x, laser.beam.y);
                laser.beam.destroy();
                laser.glow.destroy();
                this.lasers.splice(laserIndex, 1);
                hitEnemy = true;
                break;
            }
        }
        if (hitEnemy) continue;

        if (
            this.boss &&
            Math.abs(laser.beam.x - this.boss.container.x) < 60 &&
            Math.abs(laser.beam.y - this.boss.container.y) < 55
        ) {
            this.damageBoss(this.enemyLaserDamage, laser.beam.x, laser.beam.y);
            laser.beam.destroy();
            laser.glow.destroy();
            this.lasers.splice(laserIndex, 1);
            continue;
        }

        const beamPolygon = this.getWorldPolygon(laser.beam, laser.localPoints);

        for (let asteroidIndex = 0; asteroidIndex < this.asteroids.length; asteroidIndex++) {
            if (this.polygonTouchesAsteroid(beamPolygon, this.asteroids[asteroidIndex])) {
                this.destroyAsteroid(asteroidIndex);
                laser.beam.destroy();
                laser.glow.destroy();
                this.lasers.splice(laserIndex, 1);
                break;
            }
        }
    }
}

destroyAsteroid(index) {
    const asteroid = this.asteroids[index];
    this.explosionParticles.explode(28, asteroid.x, asteroid.y);
    this.createShockwave(asteroid.x, asteroid.y, 0xf0abfc, 7, 320);
    asteroid.destroy();

    const radius = Math.random() * 35 + 15;
    this.asteroids[index] = new Asteroid(
        this,
        Math.random() * 960,
        -radius,
        radius,
        Math.random() * 100 + 50
    );

    this.score += 50;
    this.game.events.emit('mission:progress', { id: 'asteroids', amount: 1 });
    this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
    this.updateThreatProgression();
    this.emitCockpitUpdate();
}

trySpawnPowerUpFromSky() {
    if (this.threatLevel < 1 || this.powerUps.length >= 3) return;

    const dropChance = Math.min(0.03 + (this.threatLevel - 1) * 0.0025 + this.powerUpDropBonus, 0.125);
    if (Math.random() >= dropChance) return;

    const type = Phaser.Utils.Array.GetRandom(POWER_UP_TYPES);
    const x = Math.random() * 960;
    const y = -30 - Math.random() * 150;
    this.spawnPowerUp(type, x, y);
}

spawnPowerUp(type, x, y) {
    const container = this.add.container(x, y).setDepth(6);
    const halo = this.add.circle(0, 0, 25, type.color, 0.18)
        .setStrokeStyle(2.5, type.color, 1)
        .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.rectangle(0, 0, 20, 20, type.color, 1)
        .setAngle(45)
        .setStrokeStyle(1.8, 0xffffff, 1);
    const symbol = this.add.graphics();
    this.drawPowerUpSymbol(symbol, type.id);
    const label = this.add.text(0, 33, type.name, {
        fontSize: '9px',
        fontFamily: 'Cascadia Mono, Consolas, monospace',
        color: '#e9e7ff',
        stroke: '#090b1c',
        strokeThickness: 2
    }).setOrigin(0.5);
    container.add([halo, core, symbol, label]);
    this.tweens.add({
        targets: halo,
        scale: 1.3,
        alpha: 0.28,
        duration: 640,
        yoyo: true,
        repeat: -1
    });

    this.powerUps.push({
        type,
        container,
        halo,
        originX: x,
        speed: 170 * this.powerUpFallSpeedMultiplier,
        age: 0,
        driftPhase: Math.random() * Math.PI * 2,
        lifetime: 18000
    });
}

drawPowerUpSymbol(graphics, type) {
    const ink = 0x101326;
    graphics.lineStyle(2.5, ink, 1);

    if (type === 'nanite') {
        graphics.fillStyle(ink, 1);
        graphics.fillRect(-2, -8, 4, 16);
        graphics.fillRect(-8, -2, 16, 4);
        return;
    }

    if (type === 'shield') {
        graphics.beginPath();
        graphics.moveTo(0, -8);
        graphics.lineTo(7, -5);
        graphics.lineTo(6, 2);
        graphics.lineTo(0, 8);
        graphics.lineTo(-6, 2);
        graphics.lineTo(-7, -5);
        graphics.closePath();
        graphics.fillStyle(ink, 1);
        graphics.fillPath();
        return;
    }

    if (type === 'radial') {
        graphics.fillStyle(ink, 1);
        for (let angle = 0; angle < 360; angle += 45) {
            const radians = Phaser.Math.DegToRad(angle);
            graphics.fillCircle(Math.cos(radians) * 7, Math.sin(radians) * 7, 2.2);
        }
        graphics.fillCircle(0, 0, 2.3);
        return;
    }

    if (type === 'overcharge') {
        graphics.beginPath();
        graphics.moveTo(2, -8);
        graphics.lineTo(-6, 1);
        graphics.lineTo(-1, 1);
        graphics.lineTo(-3, 8);
        graphics.lineTo(6, -2);
        graphics.lineTo(1, -2);
        graphics.closePath();
        graphics.fillStyle(ink, 1);
        graphics.fillPath();
        return;
    }

    if (type === 'nova') {
        graphics.beginPath();
        for (let point = 0; point < 16; point++) {
            const angle = -Math.PI / 2 + point * Math.PI / 8;
            const radius = point % 2 === 0 ? 8 : 3.2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (point === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
        graphics.closePath();
        graphics.fillStyle(ink, 1);
        graphics.fillPath();
    }
}

updatePowerUps(delta) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
        const pickup = this.powerUps[i];
        pickup.age += delta;
        pickup.container.y += pickup.speed * delta / 1000;
        pickup.container.x = pickup.originX + Math.sin(pickup.age * 0.003 + pickup.driftPhase) * 10;

        if (pickup.age > pickup.lifetime || pickup.container.y > 575) {
            pickup.container.destroy();
            this.powerUps.splice(i, 1);
            continue;
        }

        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            pickup.container.x,
            pickup.container.y
        );
        if (distance > this.powerUpCollectionRadius || !this.canCollectPowerUp(pickup.type)) continue;

        this.applyPowerUp(pickup.type);
        this.impactParticles.explode(16, pickup.container.x, pickup.container.y);
        pickup.container.destroy();
        this.powerUps.splice(i, 1);
    }
}

canCollectPowerUp(type) {
    if (type.id === 'nanite' && this.health >= this.maxHealth) return false;
    return true;
}

applyPowerUp(type) {
    switch (type.id) {
        case 'nanite':
            this.health = Math.min(this.maxHealth, this.health + this.naniteRepairAmount);
            this.emitCockpitUpdate();
            this.createShockwave(this.player.x, this.player.y, type.color, 9, 420);
            break;
        case 'shield':
            this.phaseShieldRemaining = Math.min(15000, this.phaseShieldRemaining + this.shieldPickupDuration);
            this.phaseShieldDuration = this.phaseShieldRemaining;
            this.phaseShieldVisual.setVisible(true);
            break;
        case 'radial':
            this.fireRadialVolley(type.color);
            break;
        case 'overcharge':
            this.overchargeRemaining = Math.min(16000, this.overchargeRemaining + 8000);
            this.overchargeDuration = this.overchargeRemaining;
            break;
        case 'nova': {
            const pulseX = this.player.x;
            const pulseY = this.player.y;
            this.createShockwave(pulseX, pulseY, type.color, 24, 520);
            this.createShockwave(pulseX, pulseY, 0x67e8f9, 12, 390);
            this.impactParticles.explode(48, pulseX, pulseY);
            this.cameras.main.shake(130, 0.003);
            const targets = this.asteroids.filter((asteroid) => (
                Phaser.Math.Distance.Between(pulseX, pulseY, asteroid.x, asteroid.y) <= 250
            ));
            targets.forEach((asteroid) => {
                const asteroidIndex = this.asteroids.indexOf(asteroid);
                if (asteroidIndex !== -1) this.destroyAsteroid(asteroidIndex);
            });
            break;
        }
    }

    this.emitActivePowerUpStatus();
    this.showPowerUpAlert(type.message, type.color);
    this.game.events.emit('accessibility:announce', `Power-up collected. ${type.message}`);
}

emitActivePowerUpStatus() {
    const activeEffects = [];
    if (this.phaseShieldRemaining > 0) {
        activeEffects.push({
            id: 'shield',
            remaining: this.phaseShieldRemaining,
            duration: this.phaseShieldDuration
        });
    }
    if (this.overchargeRemaining > 0) {
        activeEffects.push({
            id: 'overcharge',
            remaining: this.overchargeRemaining,
            duration: this.overchargeDuration
        });
    }
    this.game.events.emit('powerup:status', activeEffects);
}

showPowerUpAlert(message, color) {
    this.tweens.killTweensOf(this.powerUpAlert);
    this.powerUpAlert.setText(`POWERUP  //  ${message}`)
        .setColor(`#${color.toString(16).padStart(6, '0')}`)
        .setAlpha(1);
    this.tweens.add({
        targets: this.powerUpAlert,
        alpha: 0,
        delay: 1400,
        duration: 450,
        ease: 'Sine.Out'
    });
}

createShockwave(x, y, color, startRadius = 8, duration = 360) {
    const shockwave = this.add.circle(x, y, startRadius, 0x000000, 0)
        .setStrokeStyle(2, color, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(3.5);

    this.tweens.add({
        targets: shockwave,
        scale: 5,
        alpha: 0,
        duration,
        ease: 'Cubic.Out',
        onComplete: () => shockwave.destroy()
    });
}

returnToMenu() {
    this.game.events.emit('cockpit:menu-reset');
    this.game.events.emit('powerup:status', []);
    this.game.events.emit('boss-powers:status', []);
    this.scene.start('MenuScene');
}

emitCockpitUpdate() {
    this.game.events.emit('cockpit:update', {
        score: this.score,
        bestScore: this.bestScore,
        health: this.health,
        maxHealth: this.maxHealth,
        elapsed: this.elapsed,
        laserHeat: this.laserHeat,
        laserOverheated: this.laserOverheated,
        overheatCooldown: this.overheatCooldown
    });
}

getWorldPolygon(gameObject, localPoints) {

    const matrix = gameObject.getWorldTransformMatrix();

    return localPoints.map((point) => ({
        x: matrix.a * (point.x - gameObject.displayOriginX) +
            matrix.c * (point.y - gameObject.displayOriginY) +
            matrix.e,
        y: matrix.b * (point.x - gameObject.displayOriginX) +
            matrix.d * (point.y - gameObject.displayOriginY) +
            matrix.f
    }));
}

polygonTouchesAsteroid(polygon, asteroid) {

    const centre = this.getWorldPolygon(asteroid, [{ x: 0, y: 0 }])[0];

    const vertices = this.getWorldPolygon(
        asteroid,
        asteroid.collisionPoints
    );

    for (let i = 0; i < vertices.length; i++) {

        const next = (i + 1) % vertices.length;

        const asteroidTriangle = [
            centre,
            vertices[i],
            vertices[next]
        ];

        if (this.polygonsIntersectSAT(polygon, asteroidTriangle)) {
            return true;
        }
    }

    return false;
}

polygonsIntersectSAT(polygonA, polygonB) {

    const polygons = [polygonA, polygonB];

    for (const polygon of polygons) {

        for (let i = 0; i < polygon.length; i++) {

            const current = polygon[i];
            const next = polygon[(i + 1) % polygon.length];

            const axisX = -(next.y - current.y);
            const axisY = next.x - current.x;

            let minA = Infinity;
            let maxA = -Infinity;
            let minB = Infinity;
            let maxB = -Infinity;

            for (const point of polygonA) {

                const projection = point.x * axisX + point.y * axisY;

                minA = Math.min(minA, projection);
                maxA = Math.max(maxA, projection);
            }

            for (const point of polygonB) {

                const projection = point.x * axisX + point.y * axisY;

                minB = Math.min(minB, projection);
                maxB = Math.max(maxB, projection);
            }

            if (maxA < minB || maxB < minA) {
                return false;
            }
        }
    }

    return true;
}

handleCollision(player, asteroid, damage = this.collisionDamage) {

    // Prevent repeated damage
    if (!this.canTakeDamage) {
        return;
    }

    if (this.phaseShieldRemaining > 0) {
        const impactX = (player.x + asteroid.x) / 2;
        const impactY = (player.y + asteroid.y) / 2;
        this.impactParticles.explode(12, impactX, impactY);
        this.createShockwave(impactX, impactY, 0x67e8f9, 8, 300);
        this.canTakeDamage = false;
        this.time.delayedCall(360, () => {
            if (!this.gameOver) this.canTakeDamage = true;
        });
        return;
    }

    this.cleanFlightSecondMark = Math.floor(this.elapsed);
    this.game.events.emit('mission:reset', { id: 'cleanFlight' });

    // Reduce health
    this.health = Math.max(0, this.health - damage);

    this.emitCockpitUpdate();

    const impactX = (player.x + asteroid.x) / 2;
    const impactY = (player.y + asteroid.y) / 2;
    this.impactParticles.explode(18, impactX, impactY);
    this.createShockwave(impactX, impactY, 0x67e8f9, 5, 280);
    this.cameras.main.shake(75, 0.0025);

    if (this.health === 0) {
        this.gameOver = true;
        this.phaseShieldRemaining = 0;
        this.overchargeRemaining = 0;
        this.phaseShieldVisual.setVisible(false);
        this.emitActivePowerUpStatus();
        const finalScore = Math.floor(this.score);
        const newHighScore = finalScore > this.previousBestScore;
        this.bestScore = Math.max(this.bestScore, finalScore);
        writeStoredValue('space-survivor-best', this.bestScore.toString());
        writeStoredValue('space-survivor-last', Math.floor(this.score).toString());
        this.game.events.emit('flight-record:complete', {
            score: Math.floor(this.score)
        });
        this.emitCockpitUpdate();
        this.explosionParticles.explode(56, player.x, player.y);
        this.createShockwave(player.x, player.y, 0xf0abfc, 12, 580);
        this.cameras.main.shake(260, 0.012);
        this.player.setVisible(false);
        this.laserGauge.setVisible(false);
        this.shipDetails.setVisible(false);
        this.damageGlow.setVisible(false);
        this.flameLeft.setVisible(false);
        this.flameRight.setVisible(false);
        this.flameCoreLeft.setVisible(false);
        this.flameCoreRight.setVisible(false);
        this.weaponMuzzleLights.forEach((light) => light.setVisible(false));
        this.thrusterParticles.stop();
        this.lasers.forEach(({ beam, glow }) => {
            beam.destroy();
            glow.destroy();
        });
        this.lasers = [];
        while (this.radialShots.length > 0) this.removeRadialShot(0);
        while (this.enemyShips.length > 0) this.removeEnemyShip(0);
        while (this.enemyProjectiles.length > 0) this.removeEnemyProjectile(0);
        while (this.bossPowerProjectiles.length > 0) {
            const shot = this.bossPowerProjectiles.pop();
            shot.glow.destroy();
            shot.core.destroy();
        }
        if (this.boss) {
            this.boss.container.destroy();
            this.boss.warningLine.destroy();
            this.boss = null;
        }
        this.bossHealthGraphics.clear().setVisible(false);
        this.bossWarningText.setAlpha(0);
        this.gameOverScoreText.setText(
            Math.floor(this.score).toString().padStart(6, '0')
        );
        this.gameOverBestText.setText(
            Math.floor(this.bestScore).toString().padStart(6, '0')
        );
        const finalMinutes = Math.floor(this.elapsed / 60).toString().padStart(2, '0');
        const finalSeconds = Math.floor(this.elapsed % 60).toString().padStart(2, '0');
        this.gameOverTimeText.setText(`${finalMinutes}:${finalSeconds}`);
        const xpGained = Math.max(0, Math.floor(readStoredNumber('space-survivor-last-xp')));
        this.gameOverXpText.setText(`+${xpGained.toString().padStart(3, '0')} XP`);
        if (newHighScore) {
            this.gameOverEyebrow
                .setText('NEW HIGH SCORE  //  RECORD SET')
                .setColor('#facc15');
            this.confettiParticles.explode(100, 480, 185);
            this.confettiParticles.explode(55, 320, 195);
            this.confettiParticles.explode(55, 640, 195);
        }
        this.gameOverUI.setVisible(true);
    }

    // Activate damage protection
    this.canTakeDamage = false;

    // Turn spaceship red
    this.player.setFillStyle(0xff3333);
    this.player.setStrokeStyle(3, 0x8b0000);

    // Make spaceship flash
    this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 4
    });

    // Allow damage again after 1 second
    this.time.delayedCall(this.damageGraceMs, () => {

        if (this.gameOver) {
            return;
        }

        // Restore original spaceship colour
        this.player.setFillStyle(0x39245f);
        // Restore cyan border
        this.player.setStrokeStyle(2.5, 0x67e8f9, 0.95);
        // Allow damage again
        this.canTakeDamage = true;
    }); 
}}
