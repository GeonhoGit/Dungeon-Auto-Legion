// ==========================================
// 게임 설정 및 시너지 데이터 (data/config.js)
// ==========================================

const roomLabels = {
  battle: { title: "전투방", icon: "", short: "전투" },
  shop: { title: "상점방", icon: "", short: "상점" },
  rest: { title: "휴식방", icon: "", short: "휴식" },
  boss: { title: "보스방", icon: "", short: "보스" },
  event: { title: "이벤트방", icon: "?", short: "이벤트" }
};

// 직업 시너지 효과 및 발동 조건 정의
const synergyData = [
  { id: "vanguard", name: "선봉대", req: ["warrior", "guardian"], desc: "받는 피해 8% 감소", bonuses: { damageReduction: 0.08 } },
  { id: "assassin_duo", name: "암살 듀오", req: ["rogue", "archer"], desc: "치명타 확률 5%, 치명타 피해 10% 증가", bonuses: { critChance: 0.05, critDamage: 0.10 } },
  { id: "hextech_duo", name: "기초 마법공학", req: ["mage", "healer"], desc: "공격력 8%, 회복량 8% 증가", bonuses: { attack: 0.08, healBonus: 0.08 } },
  { id: "darklegion", name: "어둠의 군단", req: ["necromancer", "rogue"], desc: "생명력 흡수 3%, 공격 속도 8% 증가", bonuses: { lifesteal: 0.03, attackSpeed: 8 } },
  { id: "royal_guard", name: "왕실 근위대", req: ["warrior", "healer"], desc: "체력 8%, 방어력 8% 증가", bonuses: { hp: 0.08, defense: 0.08 } },
  { id: "spellblade", name: "마검사", req: ["mage", "rogue"], desc: "공격력 8%, 공격 속도 8% 증가", bonuses: { attack: 0.08, attackSpeed: 8 } },
  { id: "magic_artillery", name: "마법 포병대", req: ["mage", "archer"], desc: "공격력 8%, 치명타 확률 8% 증가", bonuses: { attack: 0.08, critChance: 0.08 } },
  { id: "warmonger_duo", name: "초급 전쟁광", req: ["warrior", "rogue"], desc: "공격력 10%, 생명력 흡수 3% 증가", bonuses: { attack: 0.10, lifesteal: 0.03 } },
  { id: "undead_knight", name: "불사 기사단", req: ["guardian", "necromancer"], desc: "체력 10%, 고정 방어력 8 증가", bonuses: { hp: 0.10, defenseFlat: 8 } },
  { id: "nature_spirit", name: "자연의 정령", req: ["archer", "healer"], desc: "체력 8%, 회복량 8% 증가", bonuses: { hp: 0.08, healBonus: 0.08 } },
  { id: "dark_magic", name: "흑마법사", req: ["mage", "necromancer"], desc: "공격력 8%, 생명력 흡수 3% 증가", bonuses: { attack: 0.08, lifesteal: 0.03 } },
  { id: "battle_bard", name: "전투 시인", req: ["warrior", "bard"], desc: "공격력 8%, 공격 속도 8% 증가", bonuses: { attack: 0.08, attackSpeed: 8 } },
  { id: "witch_doctor", name: "주술사", req: ["witch", "healer"], desc: "체력 8%, 받는 피해 5% 감소", bonuses: { hp: 0.08, damageReduction: 0.05 } },
  { id: "shadow_witch", name: "그림자 마녀", req: ["rogue", "witch"], desc: "치명타 확률 5%, 공격 속도 8% 증가", bonuses: { critChance: 0.05, attackSpeed: 8 } },
  { id: "iron_wall", name: "성벽 수비대", req: ["guardian", "archer"], desc: "방어력 10%, 공격 속도 5% 증가", bonuses: { defense: 0.10, attackSpeed: 5 } },
  { id: "assassin", name: "암살단", req: ["rogue", "archer", "mage"], desc: "치명타 확률 15%, 치명타 피해 30% 증가", bonuses: { critChance: 0.15, critDamage: 0.30 } },
  { id: "hextech", name: "마법공학", req: ["mage", "healer", "bard"], desc: "공격력 15%, 회복량 15%, 공격 속도 15% 증가", bonuses: { attack: 0.15, healBonus: 0.15, attackSpeed: 15 } },
  { id: "dark_knights", name: "칠흑의 기사단", req: ["guardian", "rogue", "necromancer"], desc: "체력 20%, 생명력 흡수 10%, 받는 피해 10% 감소", bonuses: { hp: 0.20, lifesteal: 0.10, damageReduction: 0.10 } },
  { id: "warmonger", name: "전쟁광", req: ["warrior", "rogue", "witch"], desc: "공격력 25%, 생명력 흡수 10% 증가", bonuses: { attack: 0.25, lifesteal: 0.10 } },
  { id: "hero_party", name: "용사 일행", req: ["warrior", "mage", "archer"], desc: "공격력 15%, 체력 15%, 공격 속도 15% 증가", bonuses: { attack: 0.15, hp: 0.15, attackSpeed: 15 } },
  { id: "holy_crusade", name: "성전사단", req: ["guardian", "warrior", "healer"], desc: "체력 20%, 방어력 20%, 회복량 20% 증가", bonuses: { hp: 0.20, defense: 0.20, healBonus: 0.20 } },
  { id: "shadow_magic", name: "그림자 마법", req: ["mage", "necromancer", "witch"], desc: "공격력 20%, 치명타 확률 15%, 생명력 흡수 10% 증가", bonuses: { attack: 0.20, critChance: 0.15, lifesteal: 0.10 } },
  { id: "ranger_squad", name: "유격대", req: ["archer", "rogue", "healer"], desc: "공격 속도 20%, 치명타 확률 15%, 받는 피해 10% 감소", bonuses: { attackSpeed: 20, critChance: 0.15, damageReduction: 0.10 } },
  { id: "legendary_party", name: "전설의 파티", req: ["warrior", "mage", "archer", "healer"], desc: "공격력 20%, 체력 20%, 공격 속도 20%, 회복량 20% 증가", bonuses: { attack: 0.20, hp: 0.20, attackSpeed: 20, healBonus: 0.20 } },
  { id: "dark_council", name: "어둠의 의회", req: ["warrior", "rogue", "mage", "necromancer"], desc: "생명력 흡수 10%, 치명타 확률 20%, 치명타 피해 40%, 받는 피해 15% 감소", bonuses: { lifesteal: 0.10, critChance: 0.20, critDamage: 0.40, damageReduction: 0.15 } },
  { id: "ironclad_siege", name: "철벽의 방진", req: ["guardian", "warrior", "archer", "healer"], desc: "방어력 30%, 체력 25%, 받는 피해 15% 감소, 공격 속도 15% 증가", bonuses: { defense: 0.30, hp: 0.25, damageReduction: 0.15, attackSpeed: 15 } },
  { id: "twilight_executioners", name: "황혼의 집행자", req: ["rogue", "archer", "mage", "necromancer"], desc: "공격력 30%, 공격 속도 30%, 치명타 확률 25%, 치명타 피해 50% 증가", bonuses: { attack: 0.30, attackSpeed: 30, critChance: 0.25, critDamage: 0.50 } },
  { id: "eight_heroes", name: "여덟 영웅", req: ["warrior", "archer", "mage", "guardian", "rogue", "healer", "necromancer", "bard"], desc: "공격력/체력/방어/공속/회복/치명타 60% 증가, 생명력 흡수 15%, 받는 피해 25% 감소", bonuses: { attack: 0.60, hp: 0.60, defense: 0.60, attackSpeed: 60, healBonus: 0.60, critChance: 0.60, critDamage: 0.60, lifesteal: 0.15, damageReduction: 0.25 } },
  { id: "berserker", name: "광전사", req: ["warrior", "warrior", "warrior"], desc: "공격 속도 20%, 치명타 피해 30% 증가", bonuses: { attackSpeed: 20, critDamage: 0.30 } },
  { id: "warmaster", name: "전투의 대가", req: ["warrior", "warrior", "warrior", "warrior"], desc: "공격력 20%, 공격 속도 30%, 치명타 피해 45% 증가", bonuses: { attack: 0.20, attackSpeed: 30, critDamage: 0.45 } },
  { id: "wargod", name: "전신", req: ["warrior", "warrior", "warrior", "warrior", "warrior"], desc: "공격력 40%, 공격 속도 40%, 치명타 피해 60% 증가", bonuses: { attack: 0.40, attackSpeed: 40, critDamage: 0.60 } },
  { id: "sniper", name: "명사수", req: ["archer", "archer", "archer"], desc: "공격 속도 25%, 치명타 확률 15% 증가", bonuses: { attackSpeed: 25, critChance: 0.15 } },
  { id: "sharpshooter", name: "저격수", req: ["archer", "archer", "archer", "archer"], desc: "공격력 20%, 공격 속도 30%, 치명타 확률 20% 증가", bonuses: { attack: 0.20, attackSpeed: 30, critChance: 0.20 } },
  { id: "stormbow", name: "폭풍의 화살", req: ["archer", "archer", "archer", "archer", "archer"], desc: "공격력 40%, 공격 속도 40%, 치명타 확률 25% 증가", bonuses: { attack: 0.40, attackSpeed: 40, critChance: 0.25 } },
  { id: "archmage", name: "대마법관", req: ["mage", "mage", "mage"], desc: "공격력 30% 증가", bonuses: { attack: 0.30 } },
  { id: "grandmage", name: "대마법사", req: ["mage", "mage", "mage", "mage"], desc: "공격력 45%, 치명타 확률 10% 증가", bonuses: { attack: 0.45, critChance: 0.10 } },
  { id: "elemental", name: "원소의 지배자", req: ["mage", "mage", "mage", "mage", "mage"], desc: "공격력 60%, 치명타 확률 20% 증가", bonuses: { attack: 0.60, critChance: 0.20 } },
  { id: "aegis", name: "절대 방벽", req: ["guardian", "guardian", "guardian"], desc: "방어력 30%, 체력 15%, 받는 피해 10% 감소", bonuses: { defense: 0.30, hp: 0.15, damageReduction: 0.10 } },
  { id: "iron_bulwark", name: "강철 방벽", req: ["guardian", "guardian", "guardian", "guardian"], desc: "방어력 45%, 체력 20%, 받는 피해 15% 감소", bonuses: { defense: 0.45, hp: 0.20, damageReduction: 0.15 } },
  { id: "immortal", name: "불멸자", req: ["guardian", "guardian", "guardian", "guardian", "guardian"], desc: "방어력 60%, 체력 30%, 받는 피해 20% 감소", bonuses: { defense: 0.60, hp: 0.30, damageReduction: 0.20 } },
  { id: "shadowlord", name: "그림자 군주", req: ["rogue", "rogue", "rogue"], desc: "치명타 확률 20%, 치명타 피해 30% 증가", bonuses: { critChance: 0.20, critDamage: 0.30 } },
  { id: "night_stalker", name: "밤의 추적자", req: ["rogue", "rogue", "rogue", "rogue"], desc: "공격력 15%, 치명타 확률 25%, 치명타 피해 45% 증가", bonuses: { attack: 0.15, critChance: 0.25, critDamage: 0.45 } },
  { id: "phantom", name: "환영 암살자", req: ["rogue", "rogue", "rogue", "rogue", "rogue"], desc: "공격력 30%, 치명타 확률 35%, 치명타 피해 60% 증가", bonuses: { attack: 0.30, critChance: 0.35, critDamage: 0.60 } },
  { id: "saint", name: "성자", req: ["healer", "healer", "healer"], desc: "회복량 30%, 체력 20% 증가", bonuses: { healBonus: 0.30, hp: 0.20 } },
  { id: "divine_healer", name: "신성한 치유사", req: ["healer", "healer", "healer", "healer"], desc: "회복량 45%, 체력 30%, 방어력 15% 증가", bonuses: { healBonus: 0.45, hp: 0.30, defense: 0.15 } },
  { id: "salvation", name: "구원자", req: ["healer", "healer", "healer", "healer", "healer"], desc: "회복량 60%, 체력 40%, 방어력 30% 증가", bonuses: { healBonus: 0.60, hp: 0.40, defense: 0.30 } },
  { id: "lichking", name: "리치왕", req: ["necromancer", "necromancer", "necromancer"], desc: "공격력 20%, 생명력 흡수 15% 증가", bonuses: { attack: 0.20, lifesteal: 0.15 } },
  { id: "soul_reaper", name: "영혼 수확자", req: ["necromancer", "necromancer", "necromancer", "necromancer"], desc: "공격력 35%, 생명력 흡수 20%, 받는 피해 10% 감소", bonuses: { attack: 0.35, lifesteal: 0.20, damageReduction: 0.10 } },
  { id: "deathgod", name: "죽음의 신", req: ["necromancer", "necromancer", "necromancer", "necromancer", "necromancer"], desc: "공격력 50%, 생명력 흡수 25%, 받는 피해 15% 감소", bonuses: { attack: 0.50, lifesteal: 0.25, damageReduction: 0.15 } },
  { id: "choir", name: "합창단", req: ["bard", "bard", "bard"], desc: "공격 속도 15%, 치명타 확률 15% 증가", bonuses: { attackSpeed: 15, critChance: 0.15 } },
  { id: "symphony", name: "교향곡", req: ["bard", "bard", "bard", "bard"], desc: "공격 속도 20%, 치명타 확률 20%, 회복량 10% 증가", bonuses: { attackSpeed: 20, critChance: 0.20, healBonus: 0.10 } },
  { id: "orchestra", name: "오케스트라", req: ["bard", "bard", "bard", "bard", "bard"], desc: "공격 속도 30%, 치명타 확률 25%, 회복량 20% 증가", bonuses: { attackSpeed: 30, critChance: 0.25, healBonus: 0.20 } },
  { id: "coven", name: "마녀의 집회", req: ["witch", "witch", "witch"], desc: "공격 속도 15%, 공격력 15% 증가", bonuses: { attackSpeed: 15, attack: 0.15 } },
  { id: "grand_coven", name: "대마녀의 집회", req: ["witch", "witch", "witch", "witch"], desc: "공격 속도 25%, 공격력 30% 증가", bonuses: { attackSpeed: 25, attack: 0.30 } },
  { id: "walpurgis", name: "발푸르기스의 밤", req: ["witch", "witch", "witch", "witch", "witch"], desc: "공격 속도 40%, 공격력 50%, 생명력 흡수 15% 증가", bonuses: { attackSpeed: 40, attack: 0.50, lifesteal: 0.15 } }
];

// 게임 전반에 사용되는 기본 수치 설정값 (관리자 페이지에서 덮어쓰기 가능)
const defaultGameConfig = {
  startGold: 80,
  startGems: 0,
  infiniteMode: { startStage: 11, bossInterval: 5, extraDifficultyFactor: 1.05 },
  recombination: { greatSuccessChance: 0.2 },
  roomRatio: { battle: 5, shop: 3, rest: 3, event: 1 },
  field: { initialMaxUnits: 5, maxLimit: 10, minUnitsToBattle: 1 },
  rewards: {
    battleGoldMin: 15,
    battleGoldMax: 45,
    bossGoldMin: 30,
    bossGoldMax: 100,
    bossRewardMultiplier: 1.5,
    battleHealMissingHpPercent: 0.2,
    bossHealMissingHpPercent: 0.3,
    reviveCost: 50
  },
  goldBonus: {
    outnumberedMinMultiplier: 1.2,
    outnumberedMaxMultiplier: 1.7
  },
  combat: {
    defenseK: 100,
    bossTimeLimitMs: 30000,
    bossEnrageMultiplier: 5.0,
    bossPhase2AoEMultiplier: 1.5
  },
  abilitySettings: {
    warrior: { shieldBashChance: 0.3, shieldBashDamageMultiplier: 1.25, shieldBashAttackSpeedDownPercent: 20, shieldBashDebuffDuration: 2000, shieldBashDefDebuffPercent: 15, shieldBashDefDebuffDuration: 5000, shieldBashCooldown: 3000, battleInstinctHpThreshold: 0.5, battleInstinctBonus: 0.15, battleInstinctOncePerBattle: true },
    guardian: { guardianWillChance: 0.2, guardianWillHealPercent: 0.05, ironWallChance: 0.15, ironWallDamageReduction: 0.5 },
    mage: { flameExplosionAttackCount: 4, flameExplosionMinTargets: 3, flameExplosionMaxTargets: 5, flameExplosionDamageMultiplier: 1, magicAmplificationTime: 5000, magicAmplificationAttackBonus: 0.25 },
    archer: { doubleShotChance: 0.25, doubleShotDamageMultiplier: 0.6, weakPointHpThreshold: 0.4, weakPointDamageBonus: 0.3 },
    rogue: { shadowBladeChance: 0.2, shadowBladeCritMultiplier: 1.8, ambushCritMultiplier: 2.5 },
    healer: { healingLightAttackCount: 2, healingLightHealMultiplier: 1.5, healingLightMaxHpMultiplier: 0.05, lifeTouchHealingBonus: 0.1 },
    necromancer: { summonAttackCount: 4, summonMaxCount: 2, skeletonHpMultiplier: 0.8, skeletonAtkMultiplier: 0.5, skeletonDefMultiplier: 0.2, corpseExplosionDamageMultiplier: 2.0, corpseExplosionTargets: 2 },
    bard: { heroicEpicAttackCount: 3, heroicEpicAtkBonus: 0.5, heroicEpicDuration: 3000, songOfEnthusiasmAsBonus: 10, songOfEnthusiasmCritBonus: 0.1 }
  },
  enemyAbilitySettings: {
    skeleton: { shieldChance: 0.15, asDebuffChance: 0.1, asDebuffPercent: 30, asDebuffDuration: 2000 },
    goblin: { ambushMultiplier: 2.0, asBonusPercent: 10 },
    orc: { groundBashAttackCount: 4, groundBashMultiplier: 1.5, enrageThreshold: 0.5, enrageAtkMultiplier: 1.3 },
    slime: { hitDebuffPercent: 20, hitDebuffDuration: 2000, regenPercent: 0.03 },
    ghost: { lifestealChance: 0.15, lifestealPercent: 0.25, damageReduction: 0.15 },
    bat: { lifestealPercent: 0.1 },
    minotaur: { shockwaveAttackCount: 3, shockwaveAsDebuffPercent: 35, shockwaveDuration: 1200, hpBonus: 1.3, defBonus: 1.4 },
    lich: { summonInterval: 10000, summonHpMultiplier: 0.35, summonAtkMultiplier: 0.5 },
    corrupt_knight: { darkBladeChance: 0.2, darkBladeMultiplier: 2.0, reflectChance: 0.2, reflectPercent: 0.2 },
    spider: { poisonAsDebuffPercent: 5, startWebAsDebuffPercent: 25, startWebDuration: 3000 },
    mummy: { healDebuffChance: 0.25, healDebuffPercent: 50, healDebuffDuration: 3000 }
  },
  unitGradeChancesByStage: {
    1: { 1: 90, 2: 10, 3: 0, 4: 0, 5: 0 },
    2: { 1: 75, 2: 22, 3: 3, 4: 0, 5: 0 },
    3: { 1: 60, 2: 30, 3: 9, 4: 1, 5: 0 },
    4: { 1: 45, 2: 35, 3: 16, 4: 4, 5: 0 },
    5: { 1: 30, 2: 35, 3: 25, 4: 9, 5: 1 },
    6: { 1: 20, 2: 30, 3: 30, 4: 17, 5: 3 },
    7: { 1: 10, 2: 25, 3: 35, 4: 25, 5: 5 }
  },
  enemyScaling: typeof enemyScalingData !== "undefined" ? enemyScalingData : {
    baseHp: 160,
    baseAttack: 25,
    baseDefense: 10,
    stageMultiplier: 1.40,
    baseCritChance: 0.05,
    baseCritDamage: 0.5,
    battlePowerMin: 0.9,
    battlePowerMax: 1.1,
    bossPowerMin: 1.2,
    bossPowerMax: 1.5,
    enemyCountBaseMin: 3,
    enemyCountBaseMax: 6,
    normalTemplates: [
      { key: "skeleton", name: "해골 병사", hpMod: 1.0, atkMod: 1.0, defMod: 1.0, spdMod: 1.0 },
      { key: "goblin", name: "고블린", hpMod: 0.7, atkMod: 1.2, defMod: 0.5, spdMod: 1.3 },
      { key: "orc", name: "오크 투사", hpMod: 1.3, atkMod: 1.1, defMod: 1.2, spdMod: 0.8 },
      { key: "slime", name: "거대 슬라임", hpMod: 1.5, atkMod: 0.8, defMod: 0.8, spdMod: 0.7 },
      { key: "ghost", name: "떠도는 악령", hpMod: 0.8, atkMod: 1.4, defMod: 0.4, spdMod: 1.4 },
      { key: "bat", name: "흡혈 박쥐", hpMod: 0.6, atkMod: 1.3, defMod: 0.3, spdMod: 1.5 },
      { key: "mummy", name: "저주받은 미라", hpMod: 1.2, atkMod: 0.9, defMod: 1.1, spdMod: 0.8 }
    ],
    bossTemplates: [
      { key: "minotaur", name: "미노타우르스", hpMod: 1.4, atkMod: 1.1, defMod: 1.0, spdMod: 0.8 },
      { key: "lich", name: "리치", hpMod: 0.9, atkMod: 1.5, defMod: 0.8, spdMod: 1.1 },
      { key: "corrupt_knight", name: "타락한 기사", hpMod: 1.1, atkMod: 1.2, defMod: 1.4, spdMod: 0.9 },
      { key: "spider", name: "거대 독거미", hpMod: 1.2, atkMod: 1.0, defMod: 0.9, spdMod: 1.2 }
    ]
  },
  enemyTargetPriority: typeof enemyTargetPriorityData !== "undefined" ? enemyTargetPriorityData : [],
  dungeon: { startNodeCount: 8, nextStageMapScaleMin: 1.2, nextStageMapScaleMax: 1.3 },
  shop: { unitCost: 15, fieldUpgradeBaseCost: 50, fieldUpgradeCostIncrease: 50, refreshCost: 10, refreshCostIncrease: 2 },
  items: {
    attackBannerBonus: 0.1, lifeCharmBonus: 0.1, guardianEmblemDefenseBonus: 0.1, ironShieldDefenseFlat: 5,
    knightBannerDefenseBonus: 0.15, tacticsBookSpeedBonus: 10, rewardHealPercent: 0.2,
    giantBeltHpBonus: 0.15, warriorSwordAttackBonus: 0.15, windBootsSpeedBonus: 15, paladinArmorDefenseBonus: 0.1,
    paladinArmorHpBonus: 0.05, assassinRingAttackBonus: 0.08, assassinRingSpeedBonus: 8, hextechDaggerAttackBonus: 0.15,
    hextechDaggerSpeedBonus: 15, radiantShieldDefenseBonus: 0.15, radiantShieldHpBonus: 0.15,
    hunterMarkAttackBonus: 0.35, dragonHeartHpBonus: 0.35, blessedHelmDefenseFlat: 50, gladiatorGloveAttackBonus: 0.20,
    tyrantSwordAttackBonus: 0.30, woodenShieldHpBonus: 0.20, titanArmorHpBonus: 0.30, steelBreastplateDefenseBonus: 0.20,
    thornArmorDefenseBonus: 0.30, goddessShieldDefenseBonus: 0.35, warriorHelmDefenseFlat: 15, imperialHelmDefenseFlat: 40,
    swiftDaggerSpeedBonus: 20, phantomDancerSpeedBonus: 30, stormBowSpeedBonus: 35, sunfireCapeDefenseBonus: 0.25,
    sunfireCapeHpBonus: 0.20, trinityForceAttackBonus: 0.20, trinityForceSpeedBonus: 20, trinityForceCritChance: 0.10,
    damageReductionT1: 0.05, damageReductionT2: 0.10, damageReductionT3: 0.15, damageReductionT4: 0.20, damageReductionT5: 0.22,
    healBonusT1: 0.10, healBonusT2: 0.20, healBonusT3: 0.30, healBonusT4: 0.40, healBonusT5: 0.45,
    critChanceT1: 0.05, critChanceT2: 0.10, critChanceT3: 0.15, critChanceT4: 0.20, critChanceT5: 0.22,
    critDamageT1: 0.20, critDamageT2: 0.40, critDamageT3: 0.60, critDamageT4: 0.80, critDamageT5: 0.90,
    lifestealT1: 0.03, lifestealT2: 0.06, lifestealT3: 0.09, lifestealT4: 0.12, lifestealT5: 0.14,
    itemTierChancesByStage: { 1: { 1: 80, 2: 20, 3: 0, 4: 0, 5: 0 }, 3: { 1: 40, 2: 40, 3: 20, 4: 0, 5: 0 }, 5: { 1: 25, 2: 40, 3: 30, 4: 5, 5: 0 }, 7: { 1: 10, 2: 30, 3: 40, 4: 15, 5: 5 } },
    bossItemTierChancesByStage: { 1: { 1: 30, 2: 60, 3: 10, 4: 0, 5: 0 }, 3: { 1: 10, 2: 40, 3: 45, 4: 5, 5: 0 }, 5: { 1: 0, 2: 20, 3: 60, 4: 15, 5: 5 }, 7: { 1: 0, 2: 15, 3: 50, 4: 25, 5: 10 } },
    shopItemTierChancesByStage: { 1: { 1: 60, 2: 35, 3: 5, 4: 0, 5: 0 }, 3: { 1: 30, 2: 40, 3: 28, 4: 2, 5: 0 }, 5: { 1: 15, 2: 35, 3: 40, 4: 8, 5: 2 }, 7: { 1: 5, 2: 30, 3: 45, 4: 15, 5: 5 } }
  },
  units: unitTypes.map((unit) => ({ ...unit, attack: unit.baseAtk, defense: unit.baseDefense, attackSpeed: unit.speed })),
  gradeMultipliers
};

function mergeConfig(base, override) {
  const result = Array.isArray(base) ? [...base] : { ...base };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key]) {
      result[key] = mergeConfig(base[key], value);
    } else {
      result[key] = value;
    }
  });
  return result;
}

function loadGameConfig() {
  try {
    const savedConfig = localStorage.getItem("adminGameConfig");
    if (savedConfig) {
      const parsed = mergeConfig(defaultGameConfig, JSON.parse(savedConfig));
      if (parsed.enemyTargetPriority) parsed.enemyTargetPriority.sort((a, b) => a.priority - b.priority);
      return parsed;
    }
  } catch (error) {
    console.warn("관리자 설정을 불러오지 못했습니다.", error);
  }
  return mergeConfig(defaultGameConfig, {});
}

function saveGameConfig() {
  localStorage.setItem("adminGameConfig", JSON.stringify(gameConfig));
}

function applyGameConfigData() {
  if (!Array.isArray(gameConfig.units)) return;
  unitTypes = unitTypes.map((unit) => {
    const savedUnit = gameConfig.units.find((entry) => entry.key === unit.key);
    if (!savedUnit) return unit;
    return {
      ...unit,
      name: savedUnit.name || unit.name,
      baseHp: Number(savedUnit.baseHp ?? unit.baseHp),
      baseAtk: Number(savedUnit.attack ?? savedUnit.baseAtk ?? unit.baseAtk),
      baseDefense: Number(savedUnit.defense ?? savedUnit.baseDefense ?? unit.baseDefense ?? 0),
      speed: Number(savedUnit.attackSpeed ?? savedUnit.speed ?? unit.speed),
      description: savedUnit.description || unit.description
    };
  });
}

let gameConfig = loadGameConfig();
applyGameConfigData();
