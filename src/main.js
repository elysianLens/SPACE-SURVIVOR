import './style.css';
import Phaser from 'phaser';
import MenuScene from './game/scenes/menuScene.js';
import StartScene from './game/scenes/startScene.js';
import { PROGRESSION_STORAGE_KEY, UPGRADE_DEFINITIONS, getUpgradeCost } from './game/progression/upgrades.js';
import { readStoredNumber, readStoredValue, writeStoredValue } from './game/progression/browserStorage.js';

const gameConfig = {
    type: Phaser.AUTO,

    width: 960,
    height: 540,

    backgroundColor: '#10051f',

    parent: 'game-screen',

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [MenuScene, StartScene]
};

const game = new Phaser.Game(gameConfig);
game.canvas?.setAttribute('aria-label', 'Space Survivor game. Move with WASD or arrow keys and fire with Space. Use number keys 1 through 3 to activate equipped boss abilities. On small screens, use the on-screen controls and boss ability buttons.');
game.canvas?.setAttribute('tabindex', '0');

const scoreDisplay = document.getElementById('hud-score');
const highScoreDisplay = document.getElementById('forward-best');
const forwardRecordPanel = document.querySelector('.forward-record');
const activePowerUpsDisplay = document.getElementById('active-powerups');
const bossPowersDisplay = document.getElementById('boss-powers');
const xpBalanceDisplay = document.getElementById('xp-balance');
const totalXpDisplay = document.getElementById('xp-lifetime');
const missionList = document.getElementById('mission-list');
const missionAlert = document.getElementById('mission-alert');
const forwardMissionAlert = document.getElementById('forward-mission-alert');
const forwardMissionName = document.getElementById('forward-mission-name');
const forwardMissionReward = document.getElementById('forward-mission-reward');
const hullFill = document.getElementById('hull-fill');
const hullTrack = document.querySelector('.hull-track');
const hullPercent = document.getElementById('hull-percent');
const hullStatus = document.querySelector('.hull-status');
const gameAnnouncer = document.getElementById('game-announcer');
const touchControls = document.querySelector('.touch-controls');
const saveStatus = document.getElementById('save-status');
const paddedScore = (score) => Math.floor(score).toString().padStart(6, '0');
const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
};

const missionDefinitions = [
    {
        id: 'asteroids',
        name: 'DEBRIS SWEEP',
        unit: 'KILLS',
        target: 3,
        targetStep: 2,
        reward: 25,
        rewardStep: 5,
        description: (target) => `Destroy ${target} asteroids`
    },
    {
        id: 'flightTime',
        name: 'FLIGHT HOURS',
        unit: 'SEC',
        target: 60,
        targetStep: 30,
        reward: 20,
        rewardStep: 5,
        description: (target) => `Fly for ${formatTime(target)}`
    },
    {
        id: 'laserVolleys',
        name: 'LASER QUALIFICATION',
        unit: 'VOLLEYS',
        target: 10,
        targetStep: 5,
        reward: 15,
        rewardStep: 5,
        description: (target) => `Fire ${target} laser volleys`
    },
    {
        id: 'threatLevels',
        name: 'THREAT CLIMBER',
        unit: 'LEVELS',
        target: 1,
        targetStep: 1,
        reward: 25,
        rewardStep: 5,
        description: (target) => `Advance ${target} threat level${target === 1 ? '' : 's'} across flights`
    },
    {
        id: 'distanceKm',
        name: 'VECTOR DRIFT',
        unit: 'KM',
        target: 12,
        targetStep: 6,
        reward: 20,
        rewardStep: 5,
        description: (target) => `Travel ${target} km under your own power`
    },
    {
        id: 'nearMisses',
        name: 'THREAD THE NEEDLE',
        unit: 'CLOSE CALLS',
        target: 3,
        targetStep: 2,
        reward: 30,
        rewardStep: 5,
        description: (target) => `Pass within danger range of ${target} asteroids`
    },
    {
        id: 'cleanFlight',
        name: 'GHOST PILOT',
        unit: 'CLEAN SEC',
        target: 45,
        targetStep: 15,
        reward: 35,
        rewardStep: 5,
        description: (target) => `Fly ${target} seconds without a hit`
    },
    {
        id: 'criticalFlight',
        name: 'REDLINE RUNNER',
        unit: 'CRITICAL SEC',
        target: 15,
        targetStep: 10,
        reward: 40,
        rewardStep: 10,
        description: (target) => `Survive ${target} seconds at critical hull`
    },
    {
        id: 'enemyShips',
        name: 'HOSTILE CONTACT',
        unit: 'SHIPS',
        target: 1,
        targetStep: 1,
        reward: 45,
        rewardStep: 10,
        description: (target) => `Destroy ${target} enemy ship${target === 1 ? '' : 's'}`
    },
    {
        id: 'bossBattles',
        name: 'CORE BREAKER',
        unit: 'BOSSES',
        target: 1,
        targetStep: 1,
        reward: 80,
        rewardStep: 20,
        description: (target) => `Defeat ${target} boss${target === 1 ? '' : 'es'}`
    }
];

const activePowerUpLabels = {
    shield: { name: 'PHASE SHIELD', color: '#67e8f9' },
    overcharge: { name: 'OVERCHARGE', color: '#facc15' }
};

const progressionStorageKey = PROGRESSION_STORAGE_KEY;
const createDefaultProgress = () => ({ tier: 1, progress: 0 });
const createDefaultUpgrades = () => Object.fromEntries(UPGRADE_DEFINITIONS.map(({ id }) => [id, 0]));
const safeInteger = (value, fallback = 0, minimum = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, Math.floor(number)) : fallback;
};
const loadProgression = () => {
    try {
        const saved = JSON.parse(readStoredValue(progressionStorageKey) || '{}');
        return {
            xp: safeInteger(saved.xp),
            totalXp: safeInteger(saved.totalXp),
            upgrades: Object.fromEntries(UPGRADE_DEFINITIONS.map(({ id, maxLevel }) => [
                id,
                Math.min(maxLevel, safeInteger(saved.upgrades?.[id]))
            ])),
            missions: Object.fromEntries(missionDefinitions.map(({ id, target, targetStep }) => {
                const state = saved.missions?.[id] || {};
                const tier = Math.min(Number.MAX_SAFE_INTEGER, safeInteger(state.tier, 1, 1));
                const currentTarget = target + (tier - 1) * targetStep;
                return [id, {
                    tier,
                    progress: Math.min(Math.max(0, currentTarget - 1), safeInteger(state.progress))
                }];
            }))
        };
    } catch {
        return {
            xp: 0,
            totalXp: 0,
            upgrades: createDefaultUpgrades(),
            missions: Object.fromEntries(missionDefinitions.map(({ id }) => [id, createDefaultProgress()]))
        };
    }
};

const progression = loadProgression();
let xpEarnedThisFlight = 0;
let missionAlertTimeout;
let forwardMissionAlertTimeout;

const saveProgression = () => {
    return writeStoredValue(progressionStorageKey, JSON.stringify(progression));
};

window.addEventListener('space-survivor:storage-error', () => {
    saveStatus.textContent = 'SAVING UNAVAILABLE · PROGRESS IS TEMPORARY';
    saveStatus.classList.add('visible');
});

const renderMissionBoard = (completedMissionIds = []) => {
    xpBalanceDisplay.textContent = progression.xp.toString().padStart(6, '0');
    totalXpDisplay.textContent = `LIFETIME EARNED ${progression.totalXp.toString().padStart(6, '0')} XP`;
    missionList.innerHTML = missionDefinitions.map((mission) => {
        const state = progression.missions[mission.id];
        const target = mission.target + (state.tier - 1) * mission.targetStep;
        const baseReward = mission.reward + (state.tier - 1) * mission.rewardStep;
        const reward = Math.round(baseReward * (1 + progression.upgrades.missionDataLink * 0.05));
        const progress = Math.min(state.progress, target);
        const progressPercent = Math.min(100, (progress / target) * 100);
        const completedClass = completedMissionIds.includes(mission.id) ? ' just-completed' : '';
        return `
            <article class="mission-card${completedClass}" aria-label="${mission.name}, tier ${state.tier}, ${progress} of ${target} ${mission.unit}">
                <div class="mission-card-heading">
                    <strong>${mission.name}</strong>
                    <span class="mission-tier">T-${state.tier.toString().padStart(2, '0')}</span>
                </div>
                <p class="mission-description">${mission.description(target)}</p>
                <div class="mission-progress-track" aria-hidden="true"><div class="mission-progress-fill" style="width:${progressPercent}%"></div></div>
                <div class="mission-card-progress">
                    <span>${progress} / ${target} ${mission.unit}</span>
                    <strong class="mission-reward">+${reward} XP</strong>
                </div>
            </article>
        `;
    }).join('');
};

const renderActivePowerUps = (effects) => {
    const activeEffects = effects.filter((effect) => (
        activePowerUpLabels[effect.id] && Number(effect.remaining) > 0
    ));

    activePowerUpsDisplay.innerHTML = activeEffects.map((effect) => {
        const label = activePowerUpLabels[effect.id];
        const remaining = Math.max(0, Number(effect.remaining) || 0);
        const duration = Math.max(1, Number(effect.duration) || 1);
        const percent = Math.min(100, (remaining / duration) * 100);
        return `
            <div class="active-powerup" style="--powerup-color:${label.color}">
                <div class="active-powerup-heading">
                    <strong class="active-powerup-name">${label.name}</strong>
                    <span class="active-powerup-state">ACTIVE</span>
                    <strong class="active-powerup-time">${(remaining / 1000).toFixed(1)}s</strong>
                </div>
                <div class="active-powerup-track" aria-hidden="true">
                    <div class="active-powerup-fill" style="width:${percent}%"></div>
                </div>
            </div>
        `;
    }).join('');
    activePowerUpsDisplay.classList.toggle('visible', activeEffects.length > 0);
};

const renderBossPowers = (slots = []) => {
    const signature = JSON.stringify(slots.map(({ id, level, remaining, cooldown }) => [
        id, level, Math.ceil((remaining || 0) / 1000), cooldown
    ]));
    if (bossPowersDisplay.dataset.signature === signature) return;
    bossPowersDisplay.dataset.signature = signature;

    const unlocked = slots.some((slot) => slot.level > 0);
    bossPowersDisplay.classList.toggle('visible', unlocked);
    bossPowersDisplay.innerHTML = slots.map((slot) => {
        const ready = slot.level > 0 && slot.remaining <= 0;
        const availability = slot.level <= 0
            ? 'EMPTY'
            : ready ? 'READY' : `${Math.ceil(slot.remaining / 1000)}s`;
        const charge = slot.level <= 0 ? 0 : ready ? 100 : Math.max(0, 100 * (1 - slot.remaining / slot.cooldown));
        return `
            <button type="button" class="boss-power-slot${ready ? ' ready' : ''}" data-boss-slot="${slot.key - 1}"
                style="--boss-power-color:#${slot.color.toString(16).padStart(6, '0')}" ${ready ? '' : 'disabled'}
                aria-label="${slot.key}: ${slot.name}, ${availability}. ${slot.description}">
                <span class="boss-power-top"><kbd>${slot.key}</kbd><strong>${slot.name}</strong></span>
                <span class="boss-power-state">${availability}${slot.level > 1 ? ` · MK-${slot.level}` : ''}</span>
                <span class="boss-power-track" aria-hidden="true"><i style="width:${charge}%"></i></span>
            </button>
        `;
    }).join('');
};

bossPowersDisplay.addEventListener('click', (event) => {
    const slotButton = event.target.closest('[data-boss-slot]');
    if (slotButton && !slotButton.disabled) {
        game.events.emit('boss-power:request-use', Number(slotButton.dataset.bossSlot));
    }
});

const showMissionCompletions = (completedMissions) => {
    if (completedMissions.length === 0) return;
    const rewardsTotal = completedMissions.reduce((sum, mission) => sum + mission.reward, 0);
    const completedNames = completedMissions.map(({ id }) => (
        missionDefinitions.find((mission) => mission.id === id)?.name
    )).filter(Boolean);
    missionAlert.textContent = `CONTRACT COMPLETE  +${rewardsTotal} XP`;
    missionAlert.classList.add('visible');
    clearTimeout(missionAlertTimeout);
    missionAlertTimeout = setTimeout(() => missionAlert.classList.remove('visible'), 3200);
    forwardMissionName.textContent = completedNames.length === 1
        ? completedNames[0]
        : `${completedNames.length} CONTRACTS COMPLETE`;
    forwardMissionReward.textContent = `+${rewardsTotal} XP EARNED`;
    forwardMissionAlert.classList.add('visible');
    clearTimeout(forwardMissionAlertTimeout);
    forwardMissionAlertTimeout = setTimeout(() => forwardMissionAlert.classList.remove('visible'), 3200);
    renderMissionBoard(completedMissions.map(({ id }) => id));
    setTimeout(() => renderMissionBoard(), 1400);
};

const updateMissionProgress = (missionId, amount) => {
    const mission = missionDefinitions.find(({ id }) => id === missionId);
    if (!mission || !Number.isFinite(amount) || amount <= 0) return;

    const state = progression.missions[mission.id];
    state.progress += amount;

    const completedMissions = [];
    let target = mission.target + (state.tier - 1) * mission.targetStep;
    while (state.progress >= target) {
        state.progress -= target;
        const baseReward = mission.reward + (state.tier - 1) * mission.rewardStep;
        const completedMission = {
            id: mission.id,
            reward: Math.round(baseReward * (1 + progression.upgrades.missionDataLink * 0.05))
        };
        completedMissions.push(completedMission);
        progression.xp += completedMission.reward;
        progression.totalXp += completedMission.reward;
        xpEarnedThisFlight += completedMission.reward;
        state.tier += 1;
        target = mission.target + (state.tier - 1) * mission.targetStep;
    }

    saveProgression();
    if (completedMissions.length > 0) showMissionCompletions(completedMissions);
    else renderMissionBoard();
};

highScoreDisplay.textContent = paddedScore(readStoredNumber('space-survivor-best'));
renderMissionBoard();

game.events.on('flight:started', () => {
    xpEarnedThisFlight = 0;
    renderActivePowerUps([]);
    renderBossPowers([]);
    touchControls.classList.remove('is-hidden');
    clearTimeout(forwardMissionAlertTimeout);
    forwardMissionAlert.classList.remove('visible');
});

game.events.on('forward-record:visibility', (visible) => {
    forwardRecordPanel.classList.toggle('hidden', !visible);
});

game.events.on('cockpit:menu-reset', () => {
    touchControls.classList.add('is-hidden');
    clearTimeout(forwardMissionAlertTimeout);
    forwardMissionAlert.classList.remove('visible');
});

game.events.on('powerup:status', renderActivePowerUps);
game.events.on('boss-powers:status', renderBossPowers);

game.events.on('accessibility:announce', (message) => {
    gameAnnouncer.textContent = '';
    requestAnimationFrame(() => {
        gameAnnouncer.textContent = message;
    });
});

game.events.on('mission:progress', ({ id, amount }) => {
    updateMissionProgress(id, amount);
});

game.events.on('mission:reset', ({ id }) => {
    const state = progression.missions[id];
    if (!state || state.progress === 0) return;
    state.progress = 0;
    saveProgression();
    renderMissionBoard();
});

game.events.on('upgrade:request-state', () => {
    game.events.emit('upgrade:state', {
        xp: progression.xp,
        upgrades: { ...progression.upgrades }
    });
});

game.events.on('upgrade:purchase-request', ({ id }) => {
    const upgrade = UPGRADE_DEFINITIONS.find((item) => item.id === id);
    if (!upgrade) return;

    const level = progression.upgrades[id];
    const cost = getUpgradeCost(upgrade, level);
    if (cost === null) {
        game.events.emit('upgrade:purchase-result', {
            success: false, message: 'ALREADY AT MAXIMUM LEVEL', xp: progression.xp,
            upgrades: { ...progression.upgrades }
        });
        return;
    }
    if (progression.xp < cost) {
        game.events.emit('upgrade:purchase-result', {
            success: false, message: 'NOT ENOUGH EXPERIENCE', xp: progression.xp,
            upgrades: { ...progression.upgrades }
        });
        return;
    }

    progression.xp -= cost;
    progression.upgrades[id] += 1;
    saveProgression();
    renderMissionBoard();
    game.events.emit('upgrade:purchase-result', {
        success: true,
        name: upgrade.name,
        xp: progression.xp,
        upgrades: { ...progression.upgrades }
    });
});

game.events.on('cockpit:update', ({ score, bestScore, health, maxHealth = 100 }) => {
    const formattedScore = paddedScore(score);
    scoreDisplay.textContent = formattedScore;
    highScoreDisplay.textContent = paddedScore(bestScore);

    const healthPercent = Math.max(0, Math.min(100, Math.round((health / maxHealth) * 100)));
    hullTrack.setAttribute('aria-valuenow', healthPercent.toString());
    hullFill.style.width = `${healthPercent}%`;
    hullPercent.textContent = `${healthPercent}%`;
    const hullColor = healthPercent > 60 ? '#67e8f9' : healthPercent > 30 ? '#facc15' : '#fb7185';
    hullFill.style.backgroundColor = hullColor;
    hullFill.style.boxShadow = `0 0 8px ${hullColor}b8`;
    hullPercent.style.color = hullColor;
    hullStatus.textContent = healthPercent > 60
        ? 'LIFE SUPPORT // NOMINAL'
        : healthPercent > 30
            ? 'LIFE SUPPORT // CAUTION'
            : 'LIFE SUPPORT // CRITICAL';
    hullStatus.style.color = hullColor;

});

game.events.on('cockpit:menu-reset', () => {
    hullFill.style.width = '100%';
    hullTrack.setAttribute('aria-valuenow', '100');
    hullFill.style.backgroundColor = '#67e8f9';
    hullFill.style.boxShadow = '0 0 8px #67e8f9b8';
    hullPercent.textContent = '100%';
    hullPercent.style.color = '#67e8f9';
    hullStatus.textContent = 'LIFE SUPPORT // NOMINAL';
    hullStatus.style.color = '#67e8f9';
});

game.events.on('flight-record:complete', ({ score }) => {
    touchControls.classList.add('is-hidden');
    renderBossPowers([]);
    writeStoredValue('space-survivor-last-xp', xpEarnedThisFlight.toString());
});
