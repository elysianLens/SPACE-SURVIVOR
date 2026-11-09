export const PROGRESSION_STORAGE_KEY = 'space-survivor-progression-v1';

// A first upgrade is within reach after an early run; field kit upgrades are
// priced as useful long-term improvements to pickup value and handling.
const COSTS = [100, 200, 350, 550, 850];
const FIELD_COSTS = [250, 450, 750, 1100, 1500];
const BASE_OVERHEAT_RECOVERY_MS = 3200;
const COOLING_LOOP_REDUCTION_MS = 400;

export const UPGRADE_DEFINITIONS = [
    {
        id: 'reinforcedHull',
        page: 0,
        name: 'REINFORCED HULL',
        maxLevel: 5,
        costs: COSTS,
        preview: (level) => `MAX HULL  ${50 + level * 10}  →  ${50 + (level + 1) * 10}`,
        current: (level) => `CURRENT  ${50 + level * 10} MAX HULL`
    },
    {
        id: 'capacitorBank',
        page: 0,
        name: 'CAPACITOR BANK',
        maxLevel: 5,
        costs: COSTS,
        preview: (level) => `HEAT / VOLLEY  ${22 - level * 2}  →  ${22 - (level + 1) * 2}`,
        current: (level) => `CURRENT  ${22 - level * 2} HEAT PER VOLLEY`
    },
    {
        id: 'coolingLoop',
        page: 0,
        name: 'COOLING LOOP',
        maxLevel: 5,
        costs: COSTS,
        preview: (level) => `OVERHEAT RECOVERY  ${((BASE_OVERHEAT_RECOVERY_MS - level * COOLING_LOOP_REDUCTION_MS) / 1000).toFixed(1)}s  →  ${((BASE_OVERHEAT_RECOVERY_MS - (level + 1) * COOLING_LOOP_REDUCTION_MS) / 1000).toFixed(1)}s`,
        current: (level) => `CURRENT  ${((BASE_OVERHEAT_RECOVERY_MS - level * COOLING_LOOP_REDUCTION_MS) / 1000).toFixed(1)}s RECOVERY`
    },
    {
        id: 'impactDampeners',
        page: 0,
        name: 'IMPACT DAMPENERS',
        maxLevel: 5,
        costs: COSTS,
        preview: (level) => `DAMAGE / HIT  ${17 - level}  →  ${17 - (level + 1)}`,
        current: (level) => `CURRENT  ${17 - level} DAMAGE PER HIT`
    },
    {
        id: 'missionDataLink',
        page: 1,
        name: 'MISSION DATA LINK',
        maxLevel: 5,
        costs: COSTS,
        preview: (level) => `CONTRACT XP BONUS  +${level * 5}%  →  +${(level + 1) * 5}%`,
        current: (level) => `CURRENT  +${level * 5}% CONTRACT XP`
    },
    {
        id: 'pulseAmplifier',
        page: 1,
        name: 'PULSE AMPLIFIER',
        maxLevel: 5,
        costs: COSTS,
        preview: (level) => `LASER DAMAGE  ${(1 + level * 0.5).toFixed(1)}  →  ${(1 + (level + 1) * 0.5).toFixed(1)}`,
        current: (level) => `CURRENT  ${(1 + level * 0.5).toFixed(1)} DAMAGE PER LASER`
    },
    {
        id: 'salvageMagnet',
        page: 1,
        name: 'SALVAGE MAGNET',
        maxLevel: 5,
        costs: COSTS,
        preview: (level) => `PICKUP RANGE  ${49 + level * 8}  →  ${49 + (level + 1) * 8}`,
        current: (level) => `CURRENT  ${49 + level * 8} UNIT PICKUP RANGE`
    },
    {
        id: 'shieldCapacitor',
        page: 1,
        name: 'SHIELD CAPACITOR',
        maxLevel: 5,
        costs: COSTS,
        preview: (level) => `SHIELD PICKUP  ${((6500 + level * 500) / 1000).toFixed(1)}s  →  ${((6500 + (level + 1) * 500) / 1000).toFixed(1)}s`,
        current: (level) => `CURRENT  ${((6500 + level * 500) / 1000).toFixed(1)}s SHIELD`
    },
    {
        id: 'emergencyBulkheads',
        page: 1,
        name: 'EMERGENCY BULKHEADS',
        maxLevel: 5,
        costs: COSTS,
        preview: (level) => `HIT PROTECTION  ${((1000 + level * 100) / 1000).toFixed(1)}s  →  ${((1100 + level * 100) / 1000).toFixed(1)}s`,
        current: (level) => `CURRENT  ${((1000 + level * 100) / 1000).toFixed(1)}s AFTER A HIT`
    },
    {
        id: 'fieldMedic',
        page: 2,
        name: 'FIELD MEDIC',
        maxLevel: 5,
        costs: FIELD_COSTS,
        preview: (level) => `NANITE REPAIR  ${35 + level * 5}  →  ${35 + (level + 1) * 5} HULL`,
        current: (level) => `CURRENT  ${35 + level * 5} HULL PER NANITE`
    },
    {
        id: 'supplyBeacon',
        page: 2,
        name: 'SUPPLY BEACON',
        maxLevel: 5,
        costs: FIELD_COSTS,
        preview: (level) => `PICKUP CHANCE  +${(level * 0.5).toFixed(1)}%  →  +${((level + 1) * 0.5).toFixed(1)}%`,
        current: (level) => `CURRENT  +${(level * 0.5).toFixed(1)}% PICKUP CHANCE`
    },
    {
        id: 'tractorWake',
        page: 2,
        name: 'TRACTOR WAKE',
        maxLevel: 5,
        costs: FIELD_COSTS,
        preview: (level) => `PICKUP FALL SPEED  −${level * 8}%  →  −${(level + 1) * 8}%`,
        current: (level) => `CURRENT  −${level * 8}% PICKUP FALL SPEED`
    }
];

export const getUpgradeCost = (upgrade, level) => upgrade.costs[level] ?? null;
