import Phaser from 'phaser';
import { createSpaceBackground, updateSpaceBackground } from '../objects/spaceBackground.js';
import { UPGRADE_DEFINITIONS, getUpgradeCost } from '../progression/upgrades.js';

const PANEL_FONT = 'Cascadia Mono, Consolas, monospace';

export default class MenuScene extends Phaser.Scene {

    constructor() {
        super('MenuScene');
    }

    create() {
        this.game.events.emit('forward-record:visibility', true);
        this.stars = createSpaceBackground(this);

        const flightDeck = this.add.text(480, 157, 'FLIGHT DECK  //  SYSTEMS READY', {
            fontSize: '13px',
            fontFamily: PANEL_FONT,
            color: '#a78bfa',
            letterSpacing: 2
        }).setOrigin(0.5);

        const title = this.add.text(480, 207, 'SPACE SURVIVOR', {
            fontSize: '43px',
            fontFamily: PANEL_FONT,
            fontStyle: 'bold',
            color: '#f3f0ff',
            letterSpacing: 3
        }).setOrigin(0.5).setShadow(0, 0, '#67e8f9', 14);

        const titleAccent = this.add.graphics();
        titleAccent.lineStyle(1, 0x7c3aed, 0.9);
        titleAccent.beginPath();
        titleAccent.moveTo(300, 240);
        titleAccent.lineTo(660, 240);
        titleAccent.strokePath();
        titleAccent.lineStyle(2, 0x67e8f9, 0.9);
        titleAccent.beginPath();
        titleAccent.moveTo(405, 240);
        titleAccent.lineTo(555, 240);
        titleAccent.strokePath();

        const subtitle = this.add.text(480, 275, 'PILOT THROUGH THE ASTEROID FIELD', {
            fontSize: '15px',
            fontFamily: PANEL_FONT,
            color: '#b9f7ff',
            letterSpacing: 1
        }).setOrigin(0.5);

        const startButton = this.createMenuButton(480, 326, 300, 48, 'START GAME', 0x67e8f9, () => this.startGame());
        const systemsButton = this.createMenuButton(480, 384, 300, 42, 'UPGRADES', 0xa78bfa, () => this.showUpgrades());
        const guideButton = this.createMenuButton(480, 436, 300, 42, 'HOW TO PLAY', 0xf0abfc, () => this.showTutorial());

        const controlsHint = this.add.text(480, 483, 'PILOT: WASD / ARROWS  ·  LAUNCH: ENTER / SPACE', {
            fontSize: '9px',
            fontFamily: PANEL_FONT,
            color: '#777894',
            letterSpacing: 1
        }).setOrigin(0.5);

        this.mainMenuUI = this.add.container(0, 0, [
            flightDeck, title, titleAccent, subtitle, startButton, systemsButton, guideButton, controlsHint
        ]);

        this.upgradesUI = this.createUpgradesPanel().setVisible(false);
        this.tutorialUI = this.createTutorialPanel().setVisible(false);
        this.upgradesOpen = false;
        this.tutorialOpen = false;

        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.backspaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        this.input.on('wheel', this.handleTutorialWheel, this);

        this.game.events.on('upgrade:state', this.handleUpgradeState, this);
        this.game.events.on('upgrade:purchase-result', this.handleUpgradePurchaseResult, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.off('wheel', this.handleTutorialWheel, this);
            this.game.events.off('upgrade:state', this.handleUpgradeState, this);
            this.game.events.off('upgrade:purchase-result', this.handleUpgradePurchaseResult, this);
        });
        this.game.events.emit('upgrade:request-state');
    }

    createMenuButton(x, y, width, height, label, accentColor, onClick) {
        const button = this.add.rectangle(x, y, width, height, 0x201744)
            .setStrokeStyle(2, accentColor, 0.9)
            .setInteractive({ useHandCursor: true });
        const text = this.add.text(x, y, label, {
            fontSize: '15px',
            fontFamily: PANEL_FONT,
            color: '#e9e7ff',
            letterSpacing: 2
        }).setOrigin(0.5);

        button.on('pointerover', () => {
            button.setFillStyle(0x4c2b83);
            button.setStrokeStyle(2, 0xb9f7ff, 1);
        });
        button.on('pointerout', () => {
            button.setFillStyle(0x201744);
            button.setStrokeStyle(2, accentColor, 0.9);
        });
        button.on('pointerdown', onClick);

        return this.add.container(0, 0, [button, text]);
    }

    createUpgradesPanel() {
        const panelItems = [];
        const frame = this.add.rectangle(480, 270, 870, 490, 0x090b1c, 0.98)
            .setStrokeStyle(2, 0x7c3aed, 0.9);
        const accents = this.add.graphics();
        accents.lineStyle(2, 0x67e8f9, 0.8);
        accents.beginPath();
        accents.moveTo(58, 73);
        accents.lineTo(902, 73);
        accents.strokePath();
        panelItems.push(
            frame,
            accents,
            this.add.text(480, 43, 'FLIGHT SYSTEMS  //  UPGRADE BAY', {
                fontSize: '18px',
                fontFamily: PANEL_FONT,
                color: '#e9e7ff',
                letterSpacing: 1.5
            }).setOrigin(0.5),
            this.add.text(480, 88, 'AVAILABLE EXPERIENCE', {
                fontSize: '10px',
                fontFamily: PANEL_FONT,
                color: '#8583a5',
                letterSpacing: 0.6
            }).setOrigin(0.5)
        );

        this.upgradeBalanceText = this.add.text(480, 107, '000000 XP', {
            fontSize: '16px',
            fontFamily: PANEL_FONT,
            color: '#67e8f9',
            letterSpacing: 1
        }).setOrigin(0.5);
        panelItems.push(this.upgradeBalanceText);
        this.upgradeStatusText = this.add.text(480, 425, '', {
            fontSize: '11px',
            fontFamily: PANEL_FONT,
            color: '#5cba9e',
            letterSpacing: 1
        }).setOrigin(0.5);
        panelItems.push(this.upgradeStatusText);
        this.upgradeRows = [];
        this.upgradePage = 0;
        this.upgradeTabs = [
            { page: 0, x: 270, label: 'FLIGHT CORE' },
            { page: 1, x: 480, label: 'FIELD SYSTEMS' },
            { page: 2, x: 690, label: 'FIELD KIT' }
        ].map(({ page, x, label }) => {
            const button = this.add.rectangle(x, 139, 190, 30, 0x171a32, 1)
                .setStrokeStyle(1.2, 0x7c3aed, 0.75)
                .setInteractive({ useHandCursor: true });
            const text = this.add.text(x, 139, label, {
                fontSize: '10px',
                fontFamily: PANEL_FONT,
                color: '#e9e7ff',
                letterSpacing: 1
            }).setOrigin(0.5);
            button.on('pointerover', () => button.setFillStyle(0x35265f));
            button.on('pointerout', () => button.setFillStyle(this.upgradePage === page ? 0x35265f : 0x171a32));
            button.on('pointerdown', () => {
                this.upgradePage = page;
                this.applyUpgradePageVisibility();
                this.game.events.emit('upgrade:request-state');
            });
            panelItems.push(button, text);
            return { page, button };
        });

        UPGRADE_DEFINITIONS.forEach((upgrade, index) => {
            const indexOnPage = UPGRADE_DEFINITIONS.filter((item) => item.page === upgrade.page).indexOf(upgrade);
            const y = 176 + indexOnPage * 49;
            const row = this.add.rectangle(480, y, 770, 46, 0x141a31, 0.98)
                .setStrokeStyle(1.2, 0x625b91, 0.95);
            const marker = this.add.rectangle(104, y, 3, 26, 0x67e8f9, 0.9);
            const name = this.add.text(120, y - 9, upgrade.name, {
                fontSize: '12px',
                fontFamily: PANEL_FONT,
                color: '#f3f0ff',
                letterSpacing: 0.7
            }).setOrigin(0, 0.5);
            const description = this.add.text(120, y + 12, '', {
                fontSize: '11px',
                fontFamily: PANEL_FONT,
                color: '#d0d2e8',
                wordWrap: { width: 455 },
                maxLines: 1
            }).setOrigin(0, 0.5);
            const level = this.add.text(640, y, 'LEVEL 0/5', {
                fontSize: '11px',
                fontFamily: PANEL_FONT,
                color: '#a78bfa'
            }).setOrigin(0.5);
            const buyButton = this.add.rectangle(790, y, 134, 34, 0x201744, 1)
                .setStrokeStyle(1.6, 0x67e8f9, 0.95)
                .setInteractive({ useHandCursor: true });
            const buyLabel = this.add.text(790, y, 'BUY', {
                fontSize: '11px',
                fontFamily: PANEL_FONT,
                color: '#e9e7ff',
                letterSpacing: 0.6
            }).setOrigin(0.5);

            buyButton.on('pointerover', () => buyButton.setFillStyle(0x4c2b83));
            buyButton.on('pointerout', () => buyButton.setFillStyle(0x201744));
            buyButton.on('pointerdown', () => {
                this.upgradeStatusText.setText('');
                this.game.events.emit('upgrade:purchase-request', { id: upgrade.id });
            });

            const rowContainer = this.add.container(0, 0, [row, marker, name, description, level, buyButton, buyLabel]);
            panelItems.push(rowContainer);
            this.upgradeRows.push({ upgrade, description, level, buyButton, buyLabel, rowContainer });
        });

        this.applyUpgradePageVisibility();

        const backButton = this.add.rectangle(480, 468, 240, 40, 0x201744, 1)
            .setStrokeStyle(1.5, 0xa78bfa, 0.9)
            .setInteractive({ useHandCursor: true });
        const backText = this.add.text(480, 468, 'BACK TO FLIGHT DECK', {
            fontSize: '12px',
            fontFamily: PANEL_FONT,
            color: '#e9e7ff',
            letterSpacing: 1.5
        }).setOrigin(0.5);
        backButton.on('pointerover', () => backButton.setFillStyle(0x4c2b83));
        backButton.on('pointerout', () => backButton.setFillStyle(0x201744));
        backButton.on('pointerdown', () => this.showMainMenu());
        panelItems.push(backButton, backText);

        return this.add.container(0, 0, panelItems);
    }

    handleUpgradeState({ xp, upgrades }) {
        if (!this.upgradeBalanceText) return;
        this.upgradeBalanceText.setText(`${Math.max(0, Math.floor(xp)).toString().padStart(6, '0')} XP`);

        this.upgradeRows.forEach(({ upgrade, description, level, buyButton, buyLabel }) => {
            const currentLevel = upgrades[upgrade.id] || 0;
            const maxed = currentLevel >= upgrade.maxLevel;
            const cost = getUpgradeCost(upgrade, currentLevel);
            description.setText(maxed ? upgrade.current(currentLevel) : upgrade.preview(currentLevel));
            level.setText(`LEVEL ${currentLevel}/${upgrade.maxLevel}`);

            if (maxed) {
                buyLabel.setText('MAX LEVEL');
                buyButton.setStrokeStyle(1, 0x777894, 0.5).setFillStyle(0x151629).disableInteractive();
            } else if (xp < cost) {
                buyLabel.setText(`NEED ${cost} XP`);
                buyButton.setStrokeStyle(1, 0x777894, 0.5).setFillStyle(0x151629).disableInteractive();
            } else if (upgrade.page !== this.upgradePage) {
                buyLabel.setText(`BUY  ${cost} XP`);
                buyButton.setStrokeStyle(1.3, 0x67e8f9, 0.82).setFillStyle(0x201744).disableInteractive();
            } else {
                buyLabel.setText(`BUY  ${cost} XP`);
                buyButton.setStrokeStyle(1.3, 0x67e8f9, 0.82).setFillStyle(0x201744)
                    .setInteractive({ useHandCursor: true });
            }
        });
        this.applyUpgradePageVisibility();
    }

    applyUpgradePageVisibility() {
        this.upgradeRows.forEach(({ upgrade, rowContainer }) => {
            rowContainer.setVisible(upgrade.page === this.upgradePage);
        });
        this.upgradeTabs.forEach(({ page, button }) => {
            button.setFillStyle(this.upgradePage === page ? 0x35265f : 0x171a32);
            button.setStrokeStyle(1.4, this.upgradePage === page ? 0x67e8f9 : 0x7c3aed, 0.9);
        });
    }

    handleUpgradePurchaseResult(result) {
        this.handleUpgradeState(result);
        this.upgradeStatusText
            .setText(result.success ? `${result.name} UPGRADED  //  NEXT FLIGHT READY` : result.message)
            .setColor(result.success ? '#5cba9e' : '#fb7185');
    }

    createTutorialPanel() {
        const items = [];
        const frame = this.add.rectangle(480, 270, 870, 490, 0x090b1c, 0.99)
            .setStrokeStyle(2, 0x7c3aed, 0.92);
        const accents = this.add.graphics();
        accents.lineStyle(2, 0x67e8f9, 0.95);
        accents.beginPath();
        accents.moveTo(58, 73);
        accents.lineTo(902, 73);
        accents.strokePath();
        items.push(
            frame,
            accents,
            this.add.text(480, 43, 'FLIGHT MANUAL  //  HOW TO PLAY', {
                fontSize: '18px',
                fontFamily: PANEL_FONT,
                color: '#ffffff',
                letterSpacing: 1.5
            }).setOrigin(0.5),
            this.add.text(480, 88, 'CONTROLS  //  ENEMIES  //  MISSIONS  //  POWERUPS', {
                fontSize: '11px',
                fontFamily: PANEL_FONT,
                color: '#e2e6f7',
                letterSpacing: 1
            }).setOrigin(0.5)
        );

        this.tutorialRules = [
            {
                visual: 'controls', title: '01  //  PILOT CONTROLS', color: 0x67e8f9,
                body: 'Move with WASD or the arrow keys. Fly in every direction and steer clear of incoming debris.'
            },
            {
                visual: 'asteroid', title: '02  //  ASTEROIDS & THREAT', color: 0xf0abfc,
                body: 'Hold SPACE to fire your forward lasers. Each asteroid is worth 50 score; every 500 score raises the threat level.'
            },
            {
                visual: 'enemy', title: '03  //  ENEMY SHIPS', color: 0xfb7185,
                body: 'Enemy ships appear at Threat 1, track you, and stay until destroyed. Dodge their warned shots and fire back; tougher ship types unlock at higher threats.'
            },
            {
                visual: 'boss', title: '04  //  BOSS WARFARE', color: 0xfacc15,
                body: 'A boss arrives every 10 threat levels with a unique design and signature attack. Watch the top warning and themed health bar, evade its telegraphed attacks, and keep firing. Defeating it grants its signature power for this run. You can equip three powers at once; when you earn a fourth, choose one to replace. Press 1–3 to use your equipped powers. Repeat victories strengthen powers you already own.'
            },
            {
                visual: 'mission', title: '05  //  CONTRACTS & XP', color: 0xfacc15,
                body: 'Complete mission objectives to earn XP. Mission progress and XP persist between runs. Spend XP in the Upgrade Bay.'
            },
            {
                visual: 'powerup', title: '06  //  FIELD POWERUPS', color: 0x22d3ee,
                body: 'Powerups begin as rare drops at Threat 1 and appear more often at higher threats. Fly into a pickup to collect it. Supply Beacon improves their chance; Tractor Wake slows their fall.'
            },
            {
                visual: 'nanite', id: 'nanite', title: '07  //  NANITE REPAIR', color: 0x5cba9e,
                body: 'Restores 35 hull by default. The Field Medic upgrade increases the repair amount.'
            },
            {
                visual: 'shield', id: 'shield', title: '08  //  PHASE SHIELD', color: 0x67e8f9,
                body: 'Blocks asteroid and enemy-shot damage for 6.5 seconds.'
            },
            {
                visual: 'radial', id: 'radial', title: '09  //  360° VOLLEY', color: 0x22d3ee,
                body: 'Fires 16 bullets in every direction, damaging ships and asteroids and clearing nearby enemy shots.'
            },
            {
                visual: 'overcharge', id: 'overcharge', title: '10  //  OVERCHARGE', color: 0xfacc15,
                body: 'Fires a triple laser volley with slower heat build for 8 seconds.'
            },
            {
                visual: 'nova', id: 'nova', title: '11  //  NOVA PULSE', color: 0xf0abfc,
                body: 'Blasts asteroids within 250 units of your ship.'
            }
        ];

        this.tutorialPageIndex = 0;
        this.tutorialPageContainers = this.tutorialRules.map((entry, index) => (
            this.createTutorialRulePage(entry, index)
        ));
        this.tutorialPreviousButton = this.createMenuButton(230, 445, 150, 30, '← PREV', 0xa78bfa, () => {
            this.tutorialPageIndex = Phaser.Math.Clamp(this.tutorialPageIndex - 1, 0, this.tutorialRules.length - 1);
            this.updateTutorialPage();
        });
        this.tutorialNextButton = this.createMenuButton(730, 445, 150, 30, 'NEXT →', 0x67e8f9, () => {
            this.tutorialPageIndex = Phaser.Math.Clamp(this.tutorialPageIndex + 1, 0, this.tutorialRules.length - 1);
            this.updateTutorialPage();
        });
        this.tutorialPageLabel = this.add.text(480, 445, '', {
            fontSize: '10px', fontFamily: PANEL_FONT, color: '#e2e6f7', letterSpacing: 0.8
        }).setOrigin(0.5);
        items.push(
            ...this.tutorialPageContainers,
            this.tutorialPreviousButton,
            this.tutorialNextButton,
            this.tutorialPageLabel
        );

        const backButton = this.createMenuButton(480, 489, 220, 32, 'BACK TO FLIGHT DECK', 0xa78bfa, () => this.showMainMenu());
        items.push(backButton);
        const panel = this.add.container(0, 0, items);
        this.updateTutorialPage();
        return panel;
    }

    createTutorialRulePage(entry, index) {
        const page = this.add.container(0, 0);
        page.add([
            this.add.rectangle(480, 278, 790, 292, 0x11152b, 0.99)
                .setStrokeStyle(1.6, entry.color, 0.95),
            this.add.rectangle(95, 278, 5, 252, entry.color, 1),
            this.add.text(495, 187, entry.title, {
                fontSize: '17px', fontFamily: PANEL_FONT, color: '#ffffff',
                letterSpacing: 0.8, wordWrap: { width: 345 }
            }).setOrigin(0, 0.5),
            this.add.text(495, 263, entry.body, {
                fontSize: '14px', fontFamily: PANEL_FONT, color: '#f4f6ff',
                wordWrap: { width: 345 }, lineSpacing: 7
            }).setOrigin(0, 0.5),
            this.add.text(495, 374, index < 5 ? 'FLIGHT RULE' : 'FIELD POWERUP', {
                fontSize: '10px', fontFamily: PANEL_FONT, color: `#${entry.color.toString(16).padStart(6, '0')}`,
                letterSpacing: 1.4
            }).setOrigin(0, 0.5)
        ]);

        const shotFrame = this.add.rectangle(290, 278, 350, 218, 0x050917, 1)
            .setStrokeStyle(1.4, entry.color, 0.9);
        const screenshot = this.add.graphics();
        screenshot.fillStyle(0x090d20, 1);
        screenshot.fillRect(117, 171, 346, 214);
        screenshot.lineStyle(1, 0x2b3152, 0.9);
        screenshot.beginPath();
        screenshot.moveTo(117, 192);
        screenshot.lineTo(463, 192);
        screenshot.strokePath();
        screenshot.fillStyle(0xe8e8ff, 0.75);
        for (let star = 0; star < 28; star++) {
            const x = 128 + ((star * 67 + index * 29) % 322);
            const y = 201 + ((star * 41 + index * 17) % 164);
            screenshot.fillCircle(x, y, star % 5 === 0 ? 1.5 : 0.8);
        }
        page.add([shotFrame, screenshot]);
        this.drawTutorialSnapshot(page, entry, index);
        page.add(this.add.text(130, 176, `SIM CAPTURE  //  ${String(index + 1).padStart(2, '0')}`, {
            fontSize: '8px', fontFamily: PANEL_FONT, color: '#d8e1ff', letterSpacing: 0.8
        }));
        page.setVisible(false);
        return page;
    }

    drawTutorialSnapshot(page, entry, index) {
        const art = this.add.graphics();
        const pickupSnapshots = [];
        const drawShip = (x, y, color, points = [[0, -20], [16, 17], [0, 10], [-16, 17]]) => {
            art.fillStyle(color, 0.95);
            art.lineStyle(1.5, 0xeafaff, 0.95);
            art.beginPath();
            art.moveTo(x + points[0][0], y + points[0][1]);
            points.slice(1).forEach(([dx, dy]) => art.lineTo(x + dx, y + dy));
            art.closePath();
            art.fillPath();
            art.strokePath();
        };

        if (entry.visual === 'controls') {
            drawShip(290, 294, 0x8b5cf6);
            art.lineStyle(2, 0x67e8f9, 0.9);
            art.lineBetween(290, 251, 290, 230);
            art.lineBetween(290, 337, 290, 356);
            art.lineBetween(266, 294, 245, 294);
            art.lineBetween(314, 294, 335, 294);
            art.fillStyle(0x67e8f9, 1);
            [[290, 229], [290, 357], [244, 294], [336, 294]].forEach(([x, y]) => art.fillCircle(x, y, 3));
        } else if (entry.visual === 'asteroid') {
            drawShip(285, 331, 0x8b5cf6);
            art.fillStyle(0x9a8cae, 1);
            art.lineStyle(2, 0xe1caff, 0.9);
            art.beginPath();
            art.moveTo(347, 216); art.lineTo(374, 207); art.lineTo(397, 222);
            art.lineTo(393, 251); art.lineTo(367, 259); art.lineTo(344, 242);
            art.closePath(); art.fillPath(); art.strokePath();
            art.fillStyle(0x67e8f9, 1);
            art.fillRoundedRect(277, 283, 4, 23, 2);
            art.fillRoundedRect(289, 277, 4, 29, 2);
            art.fillRoundedRect(301, 283, 4, 23, 2);
            art.fillStyle(0xfacc15, 1);
            art.fillRoundedRect(127, 365, 138, 5, 2);
            art.fillRoundedRect(127, 365, 82, 5, 2);
        } else if (entry.visual === 'enemy') {
            drawShip(260, 330, 0x8b5cf6);
            art.fillStyle(0xf0abfc, 0.95);
            art.lineStyle(2, 0xffe7ff, 0.95);
            art.beginPath();
            art.moveTo(365, 218); art.lineTo(392, 241); art.lineTo(365, 263);
            art.lineTo(338, 241); art.closePath(); art.fillPath(); art.strokePath();
            art.lineStyle(1.5, 0xfb7185, 0.75);
            art.lineBetween(365, 263, 260, 310);
            art.fillStyle(0xfff1fb, 1);
            art.fillCircle(324, 282, 4);
            art.fillStyle(0x262b46, 1);
            art.fillRect(338, 207, 54, 4);
            art.fillStyle(0xfb7185, 1);
            art.fillRect(340, 208, 38, 2);
        } else if (entry.visual === 'boss') {
            drawShip(265, 335, 0x8b5cf6);
            art.lineStyle(2, 0xfacc15, 0.9);
            art.strokeRoundedRect(184, 196, 218, 13, 6);
            art.fillStyle(0x26152a, 1);
            art.fillRoundedRect(187, 199, 212, 7, 3);
            art.fillStyle(0xfacc15, 1);
            art.fillRoundedRect(187, 199, 158, 7, 3);
            art.fillStyle(0xfb7185, 0.95);
            art.lineStyle(2, 0xffe4e9, 0.95);
            art.beginPath();
            art.moveTo(293, 224); art.lineTo(321, 242); art.lineTo(303, 270);
            art.lineTo(277, 269); art.lineTo(265, 242); art.closePath();
            art.fillPath(); art.strokePath();
            art.lineStyle(2, 0xfacc15, 0.75);
            art.lineBetween(320, 256, 265, 310);
            art.fillStyle(0xfacc15, 1);
            art.fillRoundedRect(202, 293, 126, 4, 2);
            art.fillStyle(0x11152b, 1);
            art.fillRoundedRect(205, 348, 44, 27, 4);
            art.fillRoundedRect(256, 348, 44, 27, 4);
            art.fillRoundedRect(307, 348, 44, 27, 4);
            art.lineStyle(1.5, 0x67e8f9, 0.9);
            art.strokeRoundedRect(205, 348, 44, 27, 4);
            art.strokeRoundedRect(256, 348, 44, 27, 4);
            art.strokeRoundedRect(307, 348, 44, 27, 4);
            art.fillStyle(0x67e8f9, 1);
            [1, 2, 3].forEach((key, index) => {
                page.add(this.add.text(227 + index * 51, 362, String(key), {
                    fontSize: '12px', fontFamily: PANEL_FONT, color: '#67e8f9', fontStyle: 'bold'
                }).setOrigin(0.5));
            });
        } else if (entry.visual === 'mission') {
            art.fillStyle(0x131a31, 1);
            art.fillRoundedRect(174, 220, 232, 111, 7);
            art.lineStyle(1.5, 0x67e8f9, 0.95);
            art.strokeRoundedRect(174, 220, 232, 111, 7);
            art.fillStyle(0xffffff, 1);
            art.fillRect(188, 236, 127, 7);
            art.fillStyle(0xa78bfa, 1);
            art.fillRect(188, 256, 194, 6);
            art.fillStyle(0x67e8f9, 1);
            art.fillRect(188, 256, 117, 6);
            art.fillStyle(0xfacc15, 1);
            art.fillRect(343, 236, 48, 7);
            art.fillStyle(0x55ba9e, 1);
            art.fillRoundedRect(188, 281, 92, 28, 5);
            art.fillStyle(0x09121c, 1);
            art.fillRect(202, 290, 64, 4);
        } else {
            drawShip(265, 322, 0x8b5cf6);
            if (entry.visual === 'powerup') {
                pickupSnapshots.push(
                    this.createTutorialPickupSnapshot('nanite', 'NANITE REPAIR', 0x5cba9e, 182, 258, 0.9),
                    this.createTutorialPickupSnapshot('shield', 'PHASE SHIELD', 0x67e8f9, 290, 258, 0.9),
                    this.createTutorialPickupSnapshot('radial', '360° VOLLEY', 0x22d3ee, 398, 258, 0.9)
                );
            } else if (entry.id) {
                pickupSnapshots.push(this.createTutorialPickupSnapshot(
                    entry.id,
                    entry.title.replace(/^\d+\s+\/\/\s+/, ''),
                    entry.color,
                    365,
                    255,
                    1.1
                ));
            }
        }
        page.add(art);
        page.add(pickupSnapshots);
    }

    createTutorialPickupSnapshot(id, name, color, x, y, scale = 1) {
        const pickup = this.add.container(x, y).setScale(scale);
        const halo = this.add.circle(0, 0, 25, color, 0.18)
            .setStrokeStyle(2.5, color, 1)
            .setBlendMode(Phaser.BlendModes.ADD);
        const core = this.add.rectangle(0, 0, 20, 20, color, 1)
            .setAngle(45)
            .setStrokeStyle(1.8, 0xffffff, 1);
        const symbol = this.add.graphics();
        this.drawPowerUpIcon(symbol, id);
        const label = this.add.text(0, 33, name, {
            fontSize: '9px',
            fontFamily: PANEL_FONT,
            color: '#e9e7ff',
            stroke: '#090b1c',
            strokeThickness: 2
        }).setOrigin(0.5);
        pickup.add([halo, core, symbol, label]);
        return pickup;
    }

    handleTutorialWheel(pointer, gameObjects, deltaX, deltaY) {
        if (!this.tutorialOpen || pointer.x < 65 || pointer.x > 895 || pointer.y < 105 || pointer.y > 455) return;
        const now = performance.now();
        if (now - (this.lastTutorialWheelAt || 0) < 180) return;
        this.lastTutorialWheelAt = now;
        this.tutorialPageIndex = Phaser.Math.Clamp(
            this.tutorialPageIndex + Math.sign(deltaY),
            0,
            this.tutorialRules.length - 1
        );
        this.updateTutorialPage();
    }

    updateTutorialPage() {
        if (!this.tutorialPageContainers) return;
        this.tutorialPageContainers.forEach((page, index) => page.setVisible(index === this.tutorialPageIndex));
        this.tutorialPageLabel.setText(`RULE ${String(this.tutorialPageIndex + 1).padStart(2, '0')} / ${this.tutorialRules.length}`);
        this.tutorialPreviousButton.setAlpha(this.tutorialPageIndex === 0 ? 0.42 : 1);
        this.tutorialNextButton.setAlpha(this.tutorialPageIndex === this.tutorialRules.length - 1 ? 0.42 : 1);
    }

    drawPowerUpIcon(graphics, type) {
        const ink = 0x101326;
        graphics.lineStyle(2.2, ink, 1);

        if (type === 'nanite') {
            graphics.fillStyle(ink, 1);
            graphics.fillRect(-2, -7, 4, 14);
            graphics.fillRect(-7, -2, 14, 4);
        } else if (type === 'shield') {
            graphics.beginPath();
            graphics.moveTo(0, -7); graphics.lineTo(6, -4);
            graphics.lineTo(5, 2); graphics.lineTo(0, 7);
            graphics.lineTo(-5, 2); graphics.lineTo(-6, -4);
            graphics.closePath();
            graphics.fillStyle(ink, 1);
            graphics.fillPath();
        } else if (type === 'radial') {
            graphics.fillStyle(ink, 1);
            for (let angle = 0; angle < 360; angle += 45) {
                const radians = Phaser.Math.DegToRad(angle);
                graphics.fillCircle(Math.cos(radians) * 6, Math.sin(radians) * 6, 1.8);
            }
            graphics.fillCircle(0, 0, 2);
        } else if (type === 'overcharge') {
            graphics.beginPath();
            graphics.moveTo(2, -8); graphics.lineTo(-5, 1);
            graphics.lineTo(-1, 1); graphics.lineTo(-3, 8);
            graphics.lineTo(5, -2); graphics.lineTo(1, -2);
            graphics.closePath();
            graphics.fillStyle(ink, 1);
            graphics.fillPath();
        } else if (type === 'nova') {
            graphics.beginPath();
            for (let point = 0; point < 16; point++) {
                const angle = -Math.PI / 2 + point * Math.PI / 8;
                const radius = point % 2 === 0 ? 8 : 3;
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

    addSystemSection(panelItems, centerX, heading, accentColor, systems, sectionWidth = 382) {
        const cardWidth = sectionWidth - 38;
        const leftTextX = centerX - cardWidth / 2 + 17;
        const rightTextX = centerX + cardWidth / 2 - 17;
        const compactRows = systems.length > 3;
        const rowHeight = compactRows ? 54 : 70;
        const rowGap = compactRows ? 60 : 91;
        const firstRowY = compactRows ? 177 : 195;
        const section = this.add.rectangle(centerX, 288, sectionWidth, 348, 0x101329, 0.88)
            .setStrokeStyle(1.5, accentColor, 0.55);
        const sectionTitle = this.add.text(centerX, 133, heading, {
            fontSize: '13px',
            fontFamily: PANEL_FONT,
            color: `#${accentColor.toString(16).padStart(6, '0')}`,
            letterSpacing: 1.5
        }).setOrigin(0.5);
        panelItems.push(section, sectionTitle);

        systems.forEach(([name, description], index) => {
            const y = firstRowY + index * rowGap;
            const card = this.add.rectangle(centerX, y, cardWidth, rowHeight, 0x171a35, 0.94)
                .setStrokeStyle(1, 0x514a77, 0.78);
            const itemName = this.add.text(leftTextX, y - 10, name, {
                fontSize: '11px',
                fontFamily: PANEL_FONT,
                color: '#f3f0ff',
                letterSpacing: 0.5
            }).setOrigin(0, 0.5);
            const itemDescription = this.add.text(leftTextX, y + 10, description, {
                fontSize: '9px',
                fontFamily: PANEL_FONT,
                color: '#9a98b6'
            }).setOrigin(0, 0.5);
            const status = this.add.text(rightTextX, y, 'LOCKED', {
                fontSize: '8px',
                fontFamily: PANEL_FONT,
                color: '#facc15',
                letterSpacing: 0.7
            }).setOrigin(1, 0.5);
            panelItems.push(card, itemName, itemDescription, status);
        });
    }

    update(time, delta) {
        updateSpaceBackground(this.stars, time, delta);

        if (this.upgradesOpen || this.tutorialOpen) {
            if (
                Phaser.Input.Keyboard.JustDown(this.escapeKey) ||
                Phaser.Input.Keyboard.JustDown(this.backspaceKey)
            ) {
                this.showMainMenu();
            }
            return;
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.enterKey) ||
            Phaser.Input.Keyboard.JustDown(this.spaceKey)
        ) {
            this.startGame();
        }
    }

    showUpgrades() {
        this.game.events.emit('forward-record:visibility', false);
        this.upgradesOpen = true;
        this.tutorialOpen = false;
        this.mainMenuUI.setVisible(false);
        this.upgradesUI.setVisible(true);
        this.tutorialUI.setVisible(false);
        this.game.events.emit('upgrade:request-state');
    }

    showTutorial() {
        this.game.events.emit('forward-record:visibility', false);
        this.tutorialOpen = true;
        this.upgradesOpen = false;
        this.mainMenuUI.setVisible(false);
        this.upgradesUI.setVisible(false);
        this.tutorialUI.setVisible(true);
        this.tutorialPageIndex = 0;
        this.updateTutorialPage();
    }

    showMainMenu() {
        this.game.events.emit('forward-record:visibility', true);
        this.upgradesOpen = false;
        this.tutorialOpen = false;
        this.upgradesUI.setVisible(false);
        this.tutorialUI.setVisible(false);
        this.mainMenuUI.setVisible(true);
    }

    startGame() {
        this.scene.start('StartScene');
    }
}
