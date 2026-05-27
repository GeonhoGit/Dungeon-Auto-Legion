// ==========================================
// 몬스터 생성 및 스테이지 스케일링 로직 (monster/monsterScaling.js)
// ==========================================

const ENEMY_MODIFIERS = [
  { key: 'enraged', name: '분노', apply: (stats) => { stats.attack = Math.floor(stats.attack * 1.25); } },
  { key: 'tough', name: '강인함', apply: (stats) => { stats.maxHp = Math.floor(stats.maxHp * 1.4); } },
  { key: 'swift', name: '신속', apply: (stats) => { stats.attackSpeed = Number((stats.attackSpeed * 1.25).toFixed(2)); } },
  { key: 'armored', name: '철갑', apply: (stats) => { stats.defense = Math.floor(stats.defense * 1.5); } },
  { key: 'regenerating', name: '재생', apply: (stats) => { stats.hasRegeneration = true; } }
];

function applyRandomModifiers(enemyStats, isBoss) {
    const modifierChance = isBoss ? 0.4 : 0.2; // 보스 40%, 일반 20%
    if (Math.random() > modifierChance) return;
    const modifier = randomFrom(ENEMY_MODIFIERS);
    modifier.apply(enemyStats);
    enemyStats.name = `[${modifier.name}] ${enemyStats.name}`;
}

function createEnemies(isBoss) {
  return generateEnemiesForRoom(isBoss ? "boss" : "battle");
}

function resetEnemyUnits() {
  gameState.currentEnemies = [];
}

function createUniqueEnemyId() {
  return `enemy-${gameState.nextEnemyId++}`;
}

function getEnemyScalingFactor(stage) {
  const settings = gameConfig.enemyScaling || {};
  const normalStageCap = 10;
  const stageScale = Math.pow(settings.stageMultiplier ?? 1.4, Math.min(stage, normalStageCap) - 1);

  // 무한 모드 추가 스케일링
  const infiniteSettings = gameConfig.infiniteMode || {};
  let infiniteScale = 1.0;
  if (stage > normalStageCap) {
    infiniteScale = Math.pow(infiniteSettings.extraDifficultyFactor ?? 1.05, stage - normalStageCap);
  }
  return stageScale * infiniteScale;
}

function generateEnemiesForRoom(roomType) {
  if (roomType === "boss" && gameState.currentStage === 1) {
    return [createBossEnemy({ onlyBoss: true })];
  }

  const settings = gameConfig.enemyScaling || {};
  const normalStageCap = 10;
  const totalScale = getEnemyScalingFactor(gameState.currentStage);

  const minCount = settings.enemyCountBaseMin ?? 2;
  const maxCount = (settings.enemyCountBaseMax ?? 4) + Math.floor(Math.min(gameState.currentStage, normalStageCap) * 0.8);
  const count = Math.min(10, randomIntegerBetween(minCount, maxCount));

  const baseMultiplier = roomType === "boss"
    ? randomBetween(settings.bossPowerMin ?? 1.2, settings.bossPowerMax ?? 1.5)
    : randomBetween(settings.battlePowerMin ?? 0.9, settings.battlePowerMax ?? 1.1);

  const normalTemplates = settings.normalTemplates || [{ name: "해골 병사", hpMod: 1.0, atkMod: 1.0, defMod: 1.0, spdMod: 1.0 }];
  const bossTemplates = settings.bossTemplates || [{ name: "던전 보스", hpMod: 1.0, atkMod: 1.0, defMod: 1.0, spdMod: 1.0 }];

  const enemies = [];
  const typeCount = {};

  for (let i = 0; i < count; i++) {
    const isBoss = roomType === "boss" && i === 0;
    const isElite = !isBoss && gameState.currentStage > 1 && Math.random() < 0.15; // 1스테이지 제외, 15% 확률로 일반 방에서 정예 등장
    let roleMultiplier = isBoss ? baseMultiplier * 1.6 : baseMultiplier * randomBetween(0.9, 1.1);
    if (isElite) roleMultiplier *= 1.35; // 정예 몬스터는 35% 추가 강화

    const baseHp = settings.baseHp ?? 110;
    const baseAttack = settings.baseAttack ?? 15;
    const baseDefense = settings.baseDefense ?? 5;

    let template;
    let enemyName = "";

    if (isBoss) {
      template = bossTemplates[Math.floor(Math.random() * bossTemplates.length)];
      enemyName = `[보스] ${template.name}`;
    } else {
      template = normalTemplates[Math.floor(Math.random() * normalTemplates.length)];
      typeCount[template.name] = (typeCount[template.name] || 0) + 1;
      const letter = String.fromCharCode(64 + typeCount[template.name]); // A, B, C...
      enemyName = isElite ? `[정예] ${template.name} ${letter}` : `${template.name} ${letter}`;
    }

    let enemyStats = {
      typeKey: template.key,
      name: enemyName,
      type: isBoss ? "boss" : (isElite ? "elite" : "normal"),
      danger: isBoss ? "보스" : (isElite ? "정예" : "일반"),
      maxHp: Math.max(1, Math.floor(baseHp * totalScale * roleMultiplier * template.hpMod)),
      attack: Math.max(1, Math.floor(baseAttack * totalScale * roleMultiplier * template.atkMod)),
      defense: Math.max(0, Math.floor(baseDefense * totalScale * roleMultiplier * (isBoss ? 1.15 : 1) * template.defMod)),
      critChance: (settings.baseCritChance ?? 0.05) + (template.critChanceMod ?? 0),
      critDamage: (settings.baseCritDamage ?? 0.5) + (template.critDamageMod ?? 0),
      attackSpeed: isBoss ? Math.max(0.45, Number((0.95 * template.spdMod).toFixed(2))) : Math.max(0.45, Number((0.95 * randomBetween(0.85, 1.15) * template.spdMod).toFixed(2)))
    };

    if (!isBoss) {
      applyRandomModifiers(enemyStats, false);
    }

    enemies.push(createEnemyUnit(enemyStats, 1));
  }
  return enemies;
}

function createBossEnemy({ onlyBoss = false } = {}) {
  const settings = gameConfig.enemyScaling || {};

  // 무한 모드 및 히든 보스 판정
  const infiniteSettings = gameConfig.infiniteMode || {};
  const isHiddenBoss = gameState.currentStage >= 10 && (gameState.currentStage % (infiniteSettings.bossInterval ?? 5) === 0);
  
  const totalScale = getEnemyScalingFactor(gameState.currentStage);

  let multiplier = gameState.currentStage === 1
    ? (settings.bossPowerMin ?? 1.2)
    : randomBetween(settings.bossPowerMin ?? 1.2, settings.bossPowerMax ?? 1.5);

  if (isHiddenBoss) multiplier *= 2.0; // 히든 보스는 일반 보스의 2배 위력

  const baseHp = settings.baseHp ?? 110;
  const baseAttack = settings.baseAttack ?? 15;
  const baseDefense = settings.baseDefense ?? 5;

  const hp = Math.max(1, Math.floor(baseHp * totalScale * multiplier * (onlyBoss ? 1.8 : 1.5)));
  const attack = Math.max(1, Math.floor(baseAttack * totalScale * multiplier * (onlyBoss ? 1.5 : 1.3)));
  const defense = Math.max(0, Math.floor(baseDefense * totalScale * multiplier * (onlyBoss ? 1.5 : 1.3)));

  const template = gameState.currentStage === 1 
    ? { key: "skeleton", name: "해골 장군", hpMod: 1.0, atkMod: 1.0, defMod: 1.0, spdMod: 1.0 } 
    : randomFrom(gameConfig.enemyScaling.bossTemplates || []);

  let bossStats = {
    typeKey: template.key,
    name: isHiddenBoss ? `[히든 보스] ${template.name}` : (gameState.currentStage === 1 ? "첫 번째 수문장" : `[보스] ${template.name}`),
    type: "boss",
    danger: onlyBoss ? "수문장" : "보스",
    maxHp: Math.floor(hp * (template.hpMod || 1)),
    attack: Math.floor(attack * (template.atkMod || 1)),
    defense: Math.floor(defense * (template.defMod || 1)),
    critChance: (settings.baseCritChance ?? 0.05) + (template.critChanceMod ?? 0.05),
    critDamage: (settings.baseCritDamage ?? 0.5) + (template.critDamageMod ?? 0.2),
    attackSpeed: Number((0.95 * (template.spdMod || 1)).toFixed(2))
  };

  if (gameState.currentStage > 1) {
    applyRandomModifiers(bossStats, true);
  }

  return createEnemyUnit(bossStats, 1);
}

function createEnemyUnit(baseData, multiplier = 1) {
  const maxHp = Math.max(1, Math.floor(Number(baseData.maxHp ?? baseData.hp ?? 80) * multiplier));
  const attack = Math.max(1, Math.floor(Number(baseData.attack ?? baseData.atk ?? 10) * multiplier));
  const defense = Math.max(0, Math.floor(Number(baseData.defense ?? baseData.baseDefense ?? 0) * multiplier));
  const attackSpeed = Math.max(0.1, Number(Number(baseData.attackSpeed ?? baseData.speed ?? 1).toFixed(2)));

  const eCfg = gameConfig.enemyAbilitySettings || {};
  let hpMod = 1;
  let defMod = 1;
  let asBonus = Number(baseData.attackSpeedBonusPercent || 0);

  // 패시브 특성 기반 스탯 보정 (생성 시 1회만 적용)
  if (baseData.typeKey === "goblin") asBonus += (eCfg.goblin?.asBonusPercent ?? 10);
  if (baseData.typeKey === "minotaur") { 
    hpMod = (eCfg.minotaur?.hpBonus ?? 1.3); 
    defMod = (eCfg.minotaur?.defBonus ?? 1.4); 
  }

  const finalMaxHp = Math.floor(maxHp * hpMod);
  const finalDefense = Math.floor(defense * defMod);

  const enemy = {
    id: createUniqueEnemyId(),
    typeKey: baseData.typeKey || "skeleton",
    name: baseData.name || "알 수 없는 적",
    type: baseData.type || "normal",
    danger: baseData.danger || "일반",
    maxHp: finalMaxHp,
    currentHp: finalMaxHp,
    attack,
    defense: finalDefense,
    baseDefense: finalDefense,
    attackSpeed,
    critChance: baseData.critChance ?? 0,
    critDamage: baseData.critDamage ?? 0,
    baseAttackSpeed: attackSpeed,
    attackSpeedBonusPercent: asBonus,
    atk: attack,
    speed: attackSpeed,
    isDead: false,
    attackCooldown: baseData.attackCooldown ?? 0,
    hasRegeneration: baseData.hasRegeneration || false
  };

  return normalizeEnemyStats(enemy);
}

function normalizeEnemyStats(enemy) {
  // normalizeEnemyStats는 이제 데이터의 타입을 보장하고 파생 스탯(공격 속도 등)을 갱신하는 역할만 수행합니다. (idempotent)
  enemy.maxHp = Math.max(1, Math.floor(Number(enemy.maxHp) || 80));
  enemy.currentHp = Number.isFinite(Number(enemy.currentHp)) ? Math.min(enemy.maxHp, Number(enemy.currentHp)) : enemy.maxHp;
  enemy.attack = Math.max(1, Math.floor(Number(enemy.attack ?? enemy.atk) || 10));
  enemy.defense = Math.max(0, Math.floor(Number(enemy.defense ?? enemy.baseDefense) || 0));
  enemy.critChance = Number(enemy.critChance || 0);
  enemy.critDamage = Number(enemy.critDamage || 0);
  enemy.baseDefense = enemy.defense;

  const baseAS = Number(enemy.baseAttackSpeed ?? enemy.attackSpeed ?? 1);
  enemy.baseAttackSpeed = Math.max(0.1, Number(baseAS.toFixed(2)));
  enemy.attackSpeedBonusPercent = Number(enemy.attackSpeedBonusPercent || 0);
  
  enemy.atk = enemy.attack;
  enemy.speed = getFinalAttackSpeed(enemy.baseAttackSpeed, enemy.attackSpeedBonusPercent);
  
  enemy.isDead = enemy.isDead === true || enemy.currentHp <= 0;
  enemy.name = enemy.name || "알 수 없는 적";
  enemy.danger = enemy.danger || (enemy.type === "boss" ? "보스" : (enemy.type === "elite" ? "정예" : "일반"));
  enemy.attackCooldown = Number.isFinite(Number(enemy.attackCooldown ?? enemy.cooldown))
    ? Math.max(0, Number(enemy.attackCooldown ?? enemy.cooldown))
    : 0;
  enemy.cooldown = enemy.attackCooldown;
  enemy.hasRegeneration = enemy.hasRegeneration || false;
  return enemy;
}