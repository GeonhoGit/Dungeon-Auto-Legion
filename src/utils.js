// ==========================================
// 2. 전역 상태 관리 (Game State)
// ==========================================
const gameState = {
  screen: "start",
  floor: 1,
  gold: gameConfig.startGold,
  gems: gameConfig.startGems || 0,
  ownedUnits: [], // 보유 중인 전체 유닛 (필드 + 대기열)
  fieldUnits: [], // 필드에 배치된 유닛의 고유 ID 목록
  maxFieldUnits: gameConfig.field.initialMaxUnits,
  maxFieldUnitLimit: gameConfig.field.maxLimit,
  fieldUpgradeCost: gameConfig.shop.fieldUpgradeBaseCost,
  nextUnitId: 1,
  currentEnemies: [],
  nextEnemyId: 1,
  battleUnits: [],
  battleTimer: null,
  lastBattleTickTime: 0,
  lastBattlePlayerUnitCount: 0,
  lastBattleEnemyUnitCount: 0,
  isBattleActive: false,
  isWaitingForReward: false,
  pendingRewardDelaySeconds: 0,
  pendingRewardRoomType: "",
  rewardTransitionTimer: null,
  rewardTransitionCountdownTimer: null,
  isWaitingForGameOver: false,
  pendingGameOverDelaySeconds: 0,
  gameOverTransitionTimer: null,
  gameOverTransitionCountdownTimer: null,
  pendingRewards: [],
  isSquadPreviewOpen: false,
  inventoryItems: [],
  bonusSources: {
    attack: [],
    hp: [],
    defense: [],
    attackSpeed: [],
    field: [],
    damageReduction: [],
    healBonus: [],
    critChance: [],
    critDamage: [],
    lifesteal: []
  },
  message: "",
  logs: [],
  battleLogs: [],
  combatAnimations: {},
  damagePopups: [],
  pendingCombatEffects: [],
  deadUnitIds: [],
  nextPopupId: 1,
  currentStage: 1,
  currentMapNodeCount: gameConfig.dungeon.startNodeCount,
  dungeonMap: [],
  currentNodeId: 0,
  clearedNodeIds: [],
  availableNodeIds: [],
  pendingRewardType: "",
  shopUnits: [],
  shopItems: [],
  currentRefreshCost: 10,
  lastClearedRoomType: "",
  currentRoomType: "",
  minFieldUnitsToBattle: gameConfig.field.minUnitsToBattle,
  recombinationSlots: [],
  lastRecombinationResult: null,
  maxUnitGrade: 5,
  isRecombining: false,
  isSynergyModalOpen: false,
  isRecombinationModalOpen: false,
  isRefreshing: false,
  isInventoryModalOpen: false,
  isProcessingAction: false,
  isUpgradeModalOpen: false,
  inventorySortMode: "tier", // 기본적으로 등급순으로 정렬
  upgradeLevels: { fieldLimit: 0, heroBlessing: 0, commanderAura: 0, goldBonus: 0, recombChance: 0, critDamage: 0, critChance: 0 },
  stats: {
    monstersKilled: 0,
    bossesKilled: 0,
    totalDamageDealt: 0
  },
  commanderSpells: { heal: { cooldown: 15000, current: 0 }, strike: { cooldown: 15000, current: 0 } },
  bonuses: {
    attack: 0,
    hp: 0,
    defense: 0,
    defenseFlat: 0,
    nextBattleSpeed: 0,
    attackSpeedBonusPercent: 0,
    damageReduction: 0,
    healBonus: 0,
    critChance: 0,
    critDamage: 0,
    lifesteal: 0
  },
  activeSynergies: [],
  synergyBonuses: { attack: 0, hp: 0, defense: 0, defenseFlat: 0, attackSpeed: 0, damageReduction: 0, healBonus: 0, critChance: 0, critDamage: 0, lifesteal: 0 },
  reviveCount: 0,
  isBgmOn: true,
  autoCastSpells: false
};

const app = document.getElementById("app");

// ==========================================
// 3. 유닛 스탯 및 유틸리티 로직 (Stats & Utils)
// ==========================================

function getGradeMultiplier(grade) {
  // 관리자 설정이나 기본 설정에서 배율 테이블을 가져옵니다.
  const multipliers = (typeof gameConfig !== 'undefined' && gameConfig.gradeMultipliers) ? gameConfig.gradeMultipliers : (typeof gradeMultipliers !== 'undefined' ? gradeMultipliers : {1:1, 2:1.6, 3:2.5, 4:4, 5:6.5});
  if (grade <= 5) return multipliers[grade] || 1;
  // 5성을 초과할 경우 5성 배율을 기준으로 등급당 1.6배씩 지수적으로 증가
  const base5 = multipliers[5] || 6.5;
  return base5 * Math.pow(1.6, grade - 5);
}

function getBaseUnitStats(unit) {
  const type = unitTypes.find((entry) => entry.key === unit.typeKey || entry.name === unit.name);
  const grade = Math.max(1, Number(unit.grade) || 1);
  const multiplier = getGradeMultiplier(grade);
  const baseHp = Number(type?.baseHp);
  const baseAtk = Number(type?.baseAtk);
  const baseDefense = Number(type?.baseDefense);
  const speed = Number(type?.speed);
  return {
    maxHp: Math.round((Number.isFinite(baseHp) ? baseHp : 80) * multiplier),
    atk: Math.round((Number.isFinite(baseAtk) ? baseAtk : 10) * multiplier),
    defense: Math.round((Number.isFinite(baseDefense) ? baseDefense : 0) * multiplier),
    speed: Number((Number.isFinite(speed) ? speed : 1).toFixed(2))
  };
}

function createUnit(typeKey, grade = 1) {
  const type = unitTypes.find((unit) => unit.key === typeKey) || unitTypes[0];
  const safeGrade = Math.max(1, Number(grade) || 1);
  const unit = { id: gameState.nextUnitId++, typeKey: type.key, name: type.name, grade: safeGrade };
  const stats = getBaseUnitStats(unit);
  return normalizePlayerUnit({
    ...unit,
    baseMaxHp: stats.maxHp,
    baseAttack: stats.atk,
    baseDefense: stats.defense,
    baseAttackSpeed: stats.speed,
    maxHp: stats.maxHp,
    currentHp: stats.maxHp,
    attack: stats.atk,
    defense: stats.defense,
    attackSpeed: stats.speed
  });
}

// 각종 장비 보너스와 버프를 포함하여 유닛의 최종 스탯을 계산
function getUnitStats(unit, battleMode = false) {
  return calculateUnitFinalStats(unit, battleMode);
}

function normalizePlayerUnit(unit) {
  if (!unit || !unit.grade) return unit; // grade가 없는 몬스터는 정규화 과정을 건너뜁니다.
  const baseData = unitTypes.find((entry) => entry.key === unit.typeKey || entry.name === unit.name);
  const grade = Math.max(1, Number(unit.grade) || 1);
  const multiplier = getGradeMultiplier(grade);
  const fallbackMaxHp = Math.round((Number(baseData?.baseHp) || 100) * multiplier);
  const fallbackAttack = Math.round((Number(baseData?.baseAtk) || 10) * multiplier);
  const fallbackDefense = Math.round((Number(baseData?.baseDefense) || 0) * multiplier);
  const fallbackAttackSpeed = Number(baseData?.speed) || 1;
  const baseMaxHp = Number(unit.baseMaxHp ?? unit.maxHp);
  const baseAttack = Number(unit.baseAttack ?? unit.attack ?? unit.atk);
  const baseDefense = Number(unit.baseDefense ?? unit.defense);
  const baseAttackSpeed = Number(unit.baseAttackSpeed ?? unit.attackSpeed ?? unit.speed);
  const maxHp = Number(unit.maxHp ?? unit.baseMaxHp);
  const normalizedMaxHp = Number.isFinite(maxHp) && maxHp > 0
    ? Math.round(maxHp)
    : (Number.isFinite(baseMaxHp) && baseMaxHp > 0 ? Math.round(baseMaxHp) : fallbackMaxHp);
  const currentHp = Number(unit.currentHp);

  unit.grade = grade;
  unit.typeKey = unit.typeKey || baseData?.key || "warrior";
  unit.name = unit.name || baseData?.name || "전사";
  unit.baseMaxHp = Number.isFinite(baseMaxHp) && baseMaxHp > 0 ? Math.round(baseMaxHp) : normalizedMaxHp;
  unit.baseAttack = Number.isFinite(baseAttack) && baseAttack > 0 ? Math.round(baseAttack) : fallbackAttack;
  unit.baseDefense = Number.isFinite(baseDefense) && baseDefense >= 0 ? Math.round(baseDefense) : fallbackDefense;
  unit.baseAttackSpeed = Number.isFinite(baseAttackSpeed) && baseAttackSpeed > 0 ? Number(baseAttackSpeed.toFixed(2)) : fallbackAttackSpeed;
  unit.maxHp = normalizedMaxHp;
  unit.currentHp = Number.isFinite(currentHp) ? Math.min(normalizedMaxHp, currentHp) : normalizedMaxHp;
  unit.attack = Number(unit.attack ?? unit.atk ?? unit.baseAttack);
  if (!Number.isFinite(unit.attack) || unit.attack <= 0) unit.attack = unit.baseAttack;
  unit.defense = Number(unit.defense ?? unit.baseDefense);
  if (!Number.isFinite(unit.defense) || unit.defense < 0) unit.defense = unit.baseDefense;
  unit.defenseBonusPercent = Number(unit.defenseBonusPercent || 0);
  unit.defenseBonusFlat = Number(unit.defenseBonusFlat || 0);
  unit.attackSpeed = Number(unit.attackSpeed ?? unit.speed ?? unit.baseAttackSpeed);
  if (!Number.isFinite(unit.attackSpeed) || unit.attackSpeed <= 0) unit.attackSpeed = unit.baseAttackSpeed;
  unit.attackSpeedBonusPercent = Number(unit.attackSpeedBonusPercent || 0);
  return unit;
}

function calculateUnitFinalStats(unit, battleMode = false) {
  const normalized = normalizePlayerUnit(unit);
  const grade = Math.max(1, Number(normalized.grade) || 1);
  const multiplier = getGradeMultiplier(grade);
  const hpBonus = battleMode ? (Number(gameState.bonuses.hp || 0) + Number(gameState.synergyBonuses?.hp || 0)) : 0;
  const atkBonus = battleMode ? (Number(gameState.bonuses.attack || 0) + Number(gameState.synergyBonuses?.attack || 0)) : 0;
  const abilityAttackBonus = battleMode ? getBattleAbilityAttackBonus(normalized) : 0;
  const abilityDefenseBonus = battleMode ? getBattleAbilityDefenseBonus(normalized) : 0;
  const defensePercentBonus = battleMode ? (Number(gameState.bonuses.defense || 0) + Number(gameState.synergyBonuses?.defense || 0)) : 0;
  const defenseFlatBonus = battleMode ? (Number(gameState.bonuses.defenseFlat || 0) + Number(gameState.synergyBonuses?.defenseFlat || 0)) : 0;
  
  const witchAbsorbed = normalized.witchAbsorbedStats ? normalized.witchAbsorbedStats : 0;
  const baseMaxHp = getUnitMaxHp(normalized) + witchAbsorbed;
  const baseAttack = Number(normalized.baseAttack ?? normalized.attack) + witchAbsorbed;
  
  const baseDefense = Number(normalized.baseDefense ?? normalized.defense);
  const baseAttackSpeed = getUnitBaseAttackSpeed(normalized);
  const attackSpeedBonusPercent = getTotalAttackSpeedBonusPercent(normalized, battleMode);
  const attackSpeedDebuffPercent = battleMode ? Number(normalized.attackSpeedDebuffPercent || 0) : 0;
  const finalAttackSpeed = Math.max(0.1, getFinalAttackSpeed(baseAttackSpeed, attackSpeedBonusPercent) * (1 - Math.max(0, attackSpeedDebuffPercent) / 100));
  const defenseBonusPercent = defensePercentBonus + abilityDefenseBonus + Number(normalized.defenseBonusPercent || 0);
  const defenseBonusFlat = defenseFlatBonus + Number(normalized.defenseBonusFlat || 0);
  const finalDefense = Math.max(0, Math.round((Number.isFinite(baseDefense) ? baseDefense : 0) * (1 + defenseBonusPercent) + defenseBonusFlat));
  const finalAttack = Math.round((Number.isFinite(baseAttack) ? baseAttack : 10 * multiplier) * (1 + atkBonus + abilityAttackBonus));

  return {
    maxHp: Math.round(baseMaxHp * (1 + hpBonus)),
    baseMaxHp: Math.round(baseMaxHp),
    atk: finalAttack,
    attack: finalAttack,
    baseAttack: Math.round(Number.isFinite(baseAttack) ? baseAttack : 10 * multiplier),
    defense: finalDefense,
    baseDefense: Number.isFinite(baseDefense) ? Math.round(baseDefense) : 0,
    defenseBonusPercent,
    defenseBonusFlat,
    speed: finalAttackSpeed,
    attackSpeed: finalAttackSpeed,
    baseAttackSpeed,
    attackSpeedBonusPercent,
    attackIntervalMs: getAttackIntervalMsFromSpeed(finalAttackSpeed)
  };
}

function getUnitAttack(unit) {
  if (!unit?.grade) { // 성급이 없으면 몬스터/소환수로 취급하여 생스탯을 반환
    const attack = Number(unit?.attack ?? unit?.atk);
    return Number.isFinite(attack) && attack > 0 ? attack : 1;
  }
  const attack = Number(calculateUnitFinalStats(unit, true).attack);
  return Number.isFinite(attack) && attack > 0 ? attack : 10;
}

function getUnitDefense(unit) {
  let defense = 0;
  if (!unit?.grade) {
    const baseDef = Number(unit?.defense ?? unit?.baseDefense);
    defense = Number.isFinite(baseDef) && baseDef >= 0 ? baseDef : 0;
  } else {
    defense = calculateUnitFinalStats(unit, true).defense || 0;
  }
  const debuff = Number(unit?.defenseDebuffPercent || 0);
  return Math.max(0, Math.floor(defense * (1 - debuff / 100)));
}

function calculateDefenseReduction(defense) {
  const k = Number(gameConfig.combat?.defenseK);
  const safeK = Number.isFinite(k) && k > 0 ? k : 100;
  const safeDefense = Math.max(0, Number(defense) || 0);
  return safeDefense / (safeDefense + safeK);
}

function calculateFinalDamage(rawDamage, target, targetSide = "enemy") {
  const attackDamage = Math.max(1, Number(rawDamage) || 1);
  const reductionRate = calculateDefenseReduction(getUnitDefense(target));
  const damageReductionBonus = targetSide === "ally" ? Math.min(0.8, Number(gameState.bonuses.damageReduction || 0) + Number(gameState.synergyBonuses?.damageReduction || 0)) : 0;
  return Math.max(1, Math.floor(attackDamage * (1 - reductionRate) * (1 - damageReductionBonus)));
}

function calculateUnitDefenseBreakdown(unit) {
  const stats = calculateUnitFinalStats(unit, true);
  return {
    baseDefense: stats.baseDefense || 0,
    defenseBonusPercent: stats.defenseBonusPercent || 0,
    defenseBonusFlat: stats.defenseBonusFlat || 0,
    finalDefense: stats.defense || 0
  };
}

function isAwakened(unit) {
  return (unit?.grade ?? 1) >= 3;
}

function getUnitAbility(unit) {
  if (unit?.grade) {
    const typeKey = unit.typeKey || unitTypes.find((type) => type.name === unit.name)?.key;
    const abilities = unitAbilities[typeKey];
    if (!abilities) return { skill: { name: "없음", description: "" }, trait: { name: "없음", description: "" } };
    
    if (isAwakened(unit)) {
      return { ...abilities, skill: abilities.awakenedSkill || abilities.skill };
    }
    return abilities;
  }
  // 몬스터 능력치 조회
  const enemyAbilities = typeof enemyAbilitiesData !== "undefined" ? enemyAbilitiesData : {};
  return enemyAbilities[unit.typeKey] || { skill: { name: "없음", description: "" }, trait: { name: "없음", description: "" } };
}

function renderUnitAbilityInfo(unit) {
  const ability = getUnitAbility(unit);
  return `
    <div class="ability-info">
      <small title="${ability.skill.description}">스킬: ${ability.skill.name}</small>
      <small title="${ability.trait.description}">특성: ${ability.trait.name}</small>
    </div>
  `;
}

function initializeBattleAbilityState(unit) {
  unit.attackCount = 0;
  unit.totalDamageDealt = 0;
  unit.totalDamageTaken = 0;
  unit.totalHealed = 0;
  unit.battleElapsedTime = 0;
  unit.attackSpeedDebuffPercent = Number(unit.attackSpeedDebuffPercent || 0);
  unit.attackSpeedDebuffDuration = Number(unit.attackSpeedDebuffDuration || 0);
  unit.defenseDebuffPercent = 0;
  unit.defenseDebuffDuration = 0;
  unit.healDebuffPercent = 0;
  unit.healDebuffDuration = 0;
  unit.bardAtkBuffPercent = Number(unit.bardAtkBuffPercent || 0);
  unit.bardAtkBuffDuration = Number(unit.bardAtkBuffDuration || 0);
  unit.stunDuration = 0;
  unit.dots = [];

  if (unit.typeKey === "warrior") {
    unit.warriorShieldBashCooldown = 0;
    unit.hasUsedBattleInstinct = false;
    unit.isBattleInstinctActive = false;
  }
  if (unit.typeKey === "mage") {
    unit.mageAttackCount = 0;
    unit.hasActivatedMagicAmplification = false;
  }
  if (unit.typeKey === "rogue") {
    unit.hasUsedAmbush = false;
  }
  if (unit.typeKey === "healer") {
    unit.healerAttackCount = 0;
  }
  if (unit.typeKey === "necromancer") {
    unit.necromancerAttackCount = 0;
  }
  if (unit.typeKey === "witch") {
    unit.witchAttackCount = 0;
  }

  // 몬스터 상태 초기화
  if (unit.typeKey === "orc") {
    unit.orcAttackCount = 0;
    unit.isOrcEnraged = false;
  }
  if (unit.typeKey === "lich") {
    unit.lichSummonTimer = (gameConfig.enemyAbilitySettings?.lich?.summonInterval ?? 10000) / 2;
  }
  if (unit.typeKey === "minotaur") {
    unit.minotaurAttackCount = 0;
  }

  return unit;
}

function getBattleAbilityAttackBonus(unit) {
  const settings = gameConfig.abilitySettings || {};
  let bonus = 0;
  if (unit?.typeKey === "warrior" && unit.isBattleInstinctActive) bonus += Number(settings.warrior?.battleInstinctBonus || 0);
  if (unit?.typeKey === "mage" && unit.hasActivatedMagicAmplification) bonus += Number(settings.mage?.magicAmplificationAttackBonus || 0);
  if (unit?.bardAtkBuffPercent > 0) bonus += unit.bardAtkBuffPercent;
  return bonus;
}

function getBattleAbilityDefenseBonus(unit) {
  const settings = gameConfig.abilitySettings || {};
  if (unit?.typeKey === "warrior" && unit.isBattleInstinctActive) return Number(settings.warrior?.battleInstinctBonus || 0);
  return 0;
}

function updateAbilityCooldowns(deltaTime) {
  gameState.battleUnits.forEach((unit) => {
    unit.battleElapsedTime = Number(unit.battleElapsedTime || 0) + deltaTime;
    if (unit.warriorShieldBashCooldown > 0) unit.warriorShieldBashCooldown = Math.max(0, unit.warriorShieldBashCooldown - deltaTime);
  });
}

function updateDebuffsAndDots(deltaTime) {
  const processDebuffs = (unit) => {
    if (unit.attackSpeedDebuffDuration > 0) {
      unit.attackSpeedDebuffDuration = Math.max(0, unit.attackSpeedDebuffDuration - deltaTime);
      if (unit.attackSpeedDebuffDuration === 0) unit.attackSpeedDebuffPercent = 0;
    }
    if (unit.defenseDebuffDuration > 0) {
      unit.defenseDebuffDuration = Math.max(0, unit.defenseDebuffDuration - deltaTime);
      if (unit.defenseDebuffDuration === 0) unit.defenseDebuffPercent = 0;
    }
    if (unit.healDebuffDuration > 0) {
      unit.healDebuffDuration = Math.max(0, unit.healDebuffDuration - deltaTime);
      if (unit.healDebuffDuration === 0) unit.healDebuffPercent = 0;
    }
    if (unit.stunDuration > 0) {
      unit.stunDuration = Math.max(0, unit.stunDuration - deltaTime);
    }
    if (unit.dots && unit.dots.length > 0) {
      for (let i = unit.dots.length - 1; i >= 0; i--) {
        let dot = unit.dots[i];
        dot.duration -= deltaTime;
        dot.tickAccumulator = (dot.tickAccumulator || 0) + deltaTime;
        if (dot.tickAccumulator >= 1000) {
          dot.tickAccumulator -= 1000;
          if (unit.currentHp > 0) {
            unit.currentHp -= dot.dps;
            if (typeof syncTargetHpIfPlayerUnit === "function") syncTargetHpIfPlayerUnit(unit);
            const side = unit.grade ? "ally" : "enemy";
            const targetKey = `${side}-${unit.id}`;
            if (!Array.isArray(gameState.pendingCombatEffects)) gameState.pendingCombatEffects = [];
            gameState.pendingCombatEffects.push({
              attackerKey: null,
              targetKey: targetKey,
              attackClass: "hit-shake",
              damage: dot.dps,
              isDot: true,
              dotType: dot.type
            });
            if (unit.currentHp <= 0) {
              unit.isDead = true;
              if (typeof markUnitDead === "function") markUnitDead(unit.id, side);
              if (typeof addBattleLog === "function") addBattleLog(`[상태이상] ${unit.grade ? formatUnitName(unit) : unit.name}이(가) 쓰러졌습니다.`);
            }
          }
        }
        if (dot.duration <= 0) unit.dots.splice(i, 1);
      }
    }
  };
  gameState.battleUnits.forEach(processDebuffs);
  gameState.currentEnemies.forEach(processDebuffs);
}

function updateBuffs(deltaTime) {
  const decreaseBuff = (unit) => {
    if (unit.bardAtkBuffDuration > 0) {
      unit.bardAtkBuffDuration = Math.max(0, unit.bardAtkBuffDuration - deltaTime);
      if (unit.bardAtkBuffDuration === 0) unit.bardAtkBuffPercent = 0;
    }
  };
  gameState.battleUnits.forEach(decreaseBuff);
}

function applyBattleStartTraits() {
  gameState.battleUnits.forEach((unit) => initializeBattleAbilityState(unit));
  gameState.currentEnemies.forEach((enemy) => initializeBattleAbilityState(enemy));
}

function applyTimedTraits(deltaTime) {
  gameState.battleUnits.filter((unit) => unit.currentHp > 0).forEach((unit) => {
    checkWarriorBattleInstinct(unit, deltaTime);
    checkMageMagicAmplification(unit);
  });
  gameState.currentEnemies.filter((enemy) => enemy.currentHp > 0).forEach((enemy) => {
    checkEnemyRegeneration(enemy, deltaTime);
    checkLichSummonTimer(enemy, deltaTime);
  });
}

function updateAbilityStates(deltaTime) {
  updateAbilityCooldowns(deltaTime);
  updateDebuffsAndDots(deltaTime);
  updateBuffs(deltaTime);
  applyTimedTraits(deltaTime);
}

function checkWarriorBattleInstinct(unit) {
  if (unit.typeKey !== "warrior" || unit.currentHp <= 0 || unit.hasUsedBattleInstinct) return;
  const settings = gameConfig.abilitySettings?.warrior || {};
  const threshold = Number(settings.battleInstinctHpThreshold ?? 0.5);
  if (unit.currentHp / Math.max(1, unit.maxHp) > threshold) return;
  unit.hasUsedBattleInstinct = true;
  unit.isBattleInstinctActive = true;
  playSkillAnimation(unit, "skill-flash");
  addBattleLog(`[특성] ${formatUnitName(unit)}의 전투 본능이 발동했습니다! 공격력과 방어력이 증가합니다.`);
}

function checkEnemyRegeneration(enemy, deltaTime) {
  const eCfg = gameConfig.enemyAbilitySettings?.slime;
  if (enemy.typeKey !== "slime" || enemy.currentHp <= 0 || enemy.currentHp >= enemy.maxHp || !eCfg) return;
  const regen = (enemy.maxHp * (eCfg.regenPercent ?? 0.02)) * (deltaTime / 1000);
  enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + regen);
}

function checkLichSummonTimer(enemy, deltaTime) {
  const eCfg = gameConfig.enemyAbilitySettings?.lich;
  if (enemy.typeKey !== "lich" || enemy.currentHp <= 0 || !eCfg) return;
  enemy.lichSummonTimer = (enemy.lichSummonTimer || 0) - deltaTime;
  if (enemy.lichSummonTimer <= 0) {
    enemy.lichSummonTimer = (eCfg.summonInterval ?? 10000);
    if (typeof triggerLichSummon === "function") triggerLichSummon(enemy);
  }
}

function checkMageMagicAmplification(unit) {
  if (unit.typeKey !== "mage" || unit.currentHp <= 0 || unit.hasActivatedMagicAmplification) return;
  const triggerTime = Number(gameConfig.abilitySettings?.mage?.magicAmplificationTime ?? 5000);
  if (Number(unit.battleElapsedTime || 0) < triggerTime) return;
  unit.hasActivatedMagicAmplification = true;
  playSkillAnimation(unit, "skill-flash");
  addBattleLog(`[특성] ${formatUnitName(unit)}의 마력 증폭 발동! 공격력이 증가합니다.`);
}

function formatUnitName(unit) {
  const prefix = isAwakened(unit) ? "[각성] " : "";
  return unit?.grade ? `${prefix}${unit.name} ${stars(unit.grade)}` : unit?.name || "대상";
}

function getUnitMaxHp(unit) {
  const normalized = normalizePlayerUnit(unit);
  const maxHp = Number(normalized.maxHp ?? normalized.baseMaxHp);
  return Number.isFinite(maxHp) && maxHp > 0 ? maxHp : 100;
}

function getUnitBaseAttackSpeed(unit) {
  const base = Number(unit?.baseAttackSpeed ?? unit?.attackSpeed ?? unit?.speed);
  return Number.isFinite(base) && base > 0 ? base : 1;
}

function getTotalAttackSpeedBonusPercent(unit, battleMode = false) {
  const unitBonus = Number(unit?.attackSpeedBonusPercent || 0);
  const battleBonus = battleMode
    ? Number(gameState.bonuses.attackSpeedBonusPercent || 0) + Number(gameState.synergyBonuses?.attackSpeed || 0) + getLegacyAttackSpeedBonusPercent(gameState.bonuses.nextBattleSpeed)
    : 0;
  const totalBonus = unitBonus + battleBonus;
  return Number.isFinite(totalBonus) ? totalBonus : 0;
}

function getUnitAttackSpeed(unit) {
  const isPlayerUnit = Boolean(unit?.grade);
  const normalized = isPlayerUnit ? normalizePlayerUnit(unit) : unit;
  const baseAttackSpeed = getUnitBaseAttackSpeed(normalized);
  const bonusPercent = Number(normalized?.attackSpeedBonusPercent || 0);
  const debuffPercent = Math.max(0, Number(normalized?.attackSpeedDebuffPercent || 0));
  const speed = getFinalAttackSpeed(baseAttackSpeed, bonusPercent) * (1 - debuffPercent / 100);
  return Number.isFinite(speed) && speed > 0 ? Math.max(0.1, speed) : 1;
}

function getFinalAttackSpeed(baseAttackSpeed, attackSpeedBonusPercent = 0) {
  // 최종 공격 속도 = 기본 공격 속도 × (1 + 추가 공격 속도 합(%) / 100)
  const base = Number(baseAttackSpeed);
  const bonusPercent = Number(attackSpeedBonusPercent);
  const safeBase = Number.isFinite(base) && base > 0 ? base : 1;
  const safeBonusPercent = Number.isFinite(bonusPercent) ? bonusPercent : 0;
  return safeBase * (1 + safeBonusPercent / 100);
}

function getAttackIntervalMsFromSpeed(finalAttackSpeed) {
  const speed = Number(finalAttackSpeed);
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return 1000 / safeSpeed;
}

function formatAttackSpeedValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "1";
  return number.toFixed(3).replace(/\.?0+$/, "");
}

function getLegacyAttackSpeedBonusPercent(value) {
  const bonus = Number(value || 0);
  if (!Number.isFinite(bonus) || bonus === 0) return 0;
  return Math.abs(bonus) <= 1 ? bonus * 100 : bonus;
}

function getConfiguredAttackSpeedBonusPercent() {
  return getLegacyAttackSpeedBonusPercent(gameConfig.items.tacticsBookSpeedBonus);
}

function addLog(text) {
  gameState.logs.unshift(text);
  gameState.logs = gameState.logs.slice(0, 80);
}

function setMessage(text) {
  gameState.message = text;
}

function stars(grade) {
  if (grade > 5) return `<span class="awakened-star-text">✦ 각성 ${grade}성 ✦</span>`;
  return `${grade}성`;
}

function randomFrom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomIntegerBetween(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomUnit(grade = 1) {
  return createUnit(randomFrom(unitTypes).key, grade);
}

function getApplicableStageChances(chancesByStage, stage) {
  const stageNumber = Math.max(1, Number(stage) || 1);
  const stages = Object.keys(chancesByStage).map(Number).sort((a, b) => a - b);
  const selectedStage = [...stages].reverse().find((entry) => entry <= stageNumber) || stages[0];
  return chancesByStage[selectedStage] || chancesByStage[1];
}

function getStageGradeChances(stage) {
  const chancesByStage = gameConfig.unitGradeChancesByStage || defaultGameConfig.unitGradeChancesByStage;
  return getApplicableStageChances(chancesByStage, stage);
}

function rollWeightedRandomChance(chancesMap) {
  const total = Object.values(chancesMap).reduce((sum, value) => sum + Number(value), 0);
  let roll = Math.random() * (total || 100);
  for (const [key, chance] of Object.entries(chancesMap)) {
    roll -= Number(chance);
    if (roll <= 0) return Number(key);
  }
  return 1;
}

function rollUnitGradeByStage(stage) {
  const chances = getStageGradeChances(stage);
  return rollWeightedRandomChance(chances);
}

function createRandomUnitByStage(stage) {
  return randomUnit(rollUnitGradeByStage(stage));
}

function getShopUnitGradeChances(stage) {
  const baseChances = getStageGradeChances(stage);
  return applyShopUpgradeShift(baseChances);
}

function generateShopRandomUnit() {
  const chances = getShopUnitGradeChances(gameState.currentStage);
  return randomUnit(rollWeightedRandomChance(chances));
}

function getItemTierChances(stage, type) {
  let chancesByStage;
  if (type === "boss") chancesByStage = gameConfig.items.bossItemTierChancesByStage || defaultGameConfig.items.bossItemTierChancesByStage;
  else if (type === "shop") chancesByStage = gameConfig.items.shopItemTierChancesByStage || defaultGameConfig.items.shopItemTierChancesByStage;
  else chancesByStage = gameConfig.items.itemTierChancesByStage || defaultGameConfig.items.itemTierChancesByStage;

  return getApplicableStageChances(chancesByStage, stage);
}

function formatItemTierChances(stage, type) {
  const chances = getItemTierChances(stage, type);
  return [1, 2, 3, 4, 5].map((tier) => `${tier}티어: ${Number(chances[tier] || 0)}%`).join(" / ");
}

function getShopItemTierChances(stage) {
  const baseChances = getItemTierChances(stage, "shop");
  return applyShopUpgradeShift(baseChances);
}

function applyShopUpgradeShift(baseChances) {
  const level = gameState.shopUpgradeLevel || 0;
  if (level === 0) return baseChances;

  const chances = { ...baseChances };
  
  for (let i = 0; i < level; i++) {
    let shift = 2; // 1레벨당 2%씩 저티어 확률을 고티어로 이전
    if (chances[1] >= shift) {
      chances[1] -= shift;
    } else {
      let remain = shift - chances[1];
      chances[1] = 0;
      if (chances[2] >= remain) {
        chances[2] -= remain;
      } else {
        remain -= chances[2];
        chances[2] = 0;
        shift -= remain;
      }
    }
    chances[3] = (chances[3] || 0) + shift * 0.6;
    chances[4] = (chances[4] || 0) + shift * 0.3;
    chances[5] = (chances[5] || 0) + shift * 0.1;
  }
  
  Object.keys(chances).forEach(k => chances[k] = Math.round(chances[k] * 10) / 10);
  return chances;
}

function generateShopRandomItem() {
  // 1% 확률로 직업 문장(Emblem) 특별 등장
  if (Math.random() < 0.01) {
    const emblemCandidates = typeof itemData !== "undefined" ? itemData.filter(item => item.key && item.key.startsWith("emblem_")) : [];
    if (emblemCandidates.length > 0) {
      return { ...randomFrom(emblemCandidates) };
    }
  }

  const chances = getShopItemTierChances(gameState.currentStage);
  const selectedTier = rollWeightedRandomChance(chances);
  const candidates = itemData.filter(item => (item.tier || 1) === selectedTier);
  return candidates.length > 0 ? { ...randomFrom(candidates) } : { ...randomFrom(itemData) };
}

function formatUnitGradeChances(stage) {
  const chances = getStageGradeChances(stage);
  return [1, 2, 3, 4, 5].map((grade) => `${grade}성: ${Number(chances[grade] || 0)}%`).join(" / ");
}

function getRoomRatioPool() {
  const pool = [];
  Object.entries(gameConfig.roomRatio).forEach(([roomType, count]) => {
    for (let i = 0; i < Number(count); i++) {
      pool.push(roomType);
    }
  });
  return pool.length ? pool : ["battle"];
}

function generateRoomType() {
  return randomFrom(getRoomRatioPool());
}

function generateBalancedRoomType(layerIndex, totalLayers) {
  // 첫 번째 방은 무조건 전투
  if (layerIndex === 0) return "battle";
  
  // 보스전 직전 층 (Prep Layer)
  // 보스 바로 전 층은 상점이나 휴식방이 나올 확률을 대폭 높임
  if (layerIndex === totalLayers - 2) {
    const prepPool = ["shop", "rest", "shop", "battle"]; // 상점/휴식 비중 강화
    return randomFrom(prepPool);
  }

  // 일반적인 무작위 생성
  return generateRoomType();
}

function generateDungeonMap(nodeCount) {
  const nodes = [];
  const normalCount = Math.max(3, nodeCount - 1);
  let remainingNodes = normalCount;
  let layers = [];
  let id = 1;

  // 대략적인 층 수 계산
  const estimatedLayers = Math.ceil(normalCount / 2.5) + 1;

  // 1. 층(Layer)별로 노드 분배
  let currentLayerIndex = 0;
  while (remainingNodes > 0) {
    // 첫 번째 층(0)은 무조건 방 1개로 고정하고, 그 다음 층부터는 2~3개의 방이 무작위로 생성됨
    const isFirstLayer = currentLayerIndex === 0;
    const layerSize = Math.min(remainingNodes, isFirstLayer ? 1 : Math.floor(randomBetween(2, 4)));
    const currentLayer = [];
    const sectionWidth = 100 / layerSize;

    for (let i = 0; i < layerSize; i++) {
      const basePath = (i * sectionWidth) + (sectionWidth / 2);
      // 노드가 겹치지 않도록 가로 할당 영역을 정하고 랜덤 오차 범위를 대폭 축소
      const x = basePath + randomBetween(-sectionWidth * 0.15, sectionWidth * 0.15);
      const roomType = generateBalancedRoomType(currentLayerIndex, estimatedLayers);
      currentLayer.push({ id, layer: currentLayerIndex, roomType, nextIds: [], x });
      id += 1;
    }
    layers.push(currentLayer);
    remainingNodes -= layerSize;
    currentLayerIndex += 1;
  }

  // 보스 방 추가
  layers.push([{ id, layer: currentLayerIndex, roomType: "boss", nextIds: [], x: 50 }]);

  // 2. 층과 층 사이의 경로(Edge) 연결
  for (let i = 0; i < layers.length - 1; i++) {
    const currentL = layers[i];
    const nextL = layers[i + 1];

    // 이전 층의 모든 노드는 다음 층의 노드 중 최소 1개(확률적으로 2개)와 연결
    currentL.forEach(node => {
      const target = randomFrom(nextL);
      if (!node.nextIds.includes(target.id)) node.nextIds.push(target.id);
      if (nextL.length > 1 && Math.random() < 0.35) { // 35% 확률로 갈래길 생성
        const target2 = randomFrom(nextL);
        if (!node.nextIds.includes(target2.id)) node.nextIds.push(target2.id);
      }
      node.nextIds.sort((a, b) => a - b);
    });

    // 다음 층의 모든 노드는 이전 층의 노드 중 최소 1개로부터 연결을 받아야 함 (고립 방지)
    nextL.forEach(targetNode => {
      const hasIncoming = currentL.some(node => node.nextIds.includes(targetNode.id));
      if (!hasIncoming) {
        const sourceNode = randomFrom(currentL);
        if (!sourceNode.nextIds.includes(targetNode.id)) {
          sourceNode.nextIds.push(targetNode.id);
          sourceNode.nextIds.sort((a, b) => a - b);
        }
      }
    });
  }

  // 배열 평탄화 (Flatten)
  layers.forEach(layer => {
    nodes.push(...layer);
  });

  return nodes;
}

function getNextMapNodeCount() {
  return Math.round(gameState.currentMapNodeCount * randomBetween(
    gameConfig.dungeon.nextStageMapScaleMin,
    gameConfig.dungeon.nextStageMapScaleMax
  ));
}

function getFirstLayerNodeIds() {
  const firstLayer = Math.min(...gameState.dungeonMap.map((node) => node.layer));
  return gameState.dungeonMap.filter((node) => node.layer === firstLayer).map((node) => node.id);
}

function getCurrentNode() {
  return gameState.dungeonMap.find((node) => node.id === gameState.currentNodeId);
}