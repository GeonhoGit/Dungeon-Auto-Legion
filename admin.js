// ==========================================
// 1. 관리자 설정 데이터 및 인증
// ==========================================
const ADMIN_PASSWORD = "1234";
const STORAGE_KEY = "adminGameConfig";
const SESSION_KEY = "isAdminLoggedIn";

// MVP 주의: 프론트엔드에 비밀번호를 두는 방식은 안전하지 않습니다.
// 실제 서비스에서는 서버 인증과 데이터베이스 저장 방식이 필요합니다.
const defaultConfig = {
  startGold: 80,
  startGems: 0,
  recombination: { greatSuccessChance: 0.2 },
  combat: { defenseK: 100 },
  infiniteMode: { startStage: 11, bossInterval: 5, extraDifficultyFactor: 1.05 },
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
  abilitySettings: {
    warrior: {
      shieldBashChance: 0.3,
      shieldBashDamageMultiplier: 1.25,
      shieldBashAttackSpeedDownPercent: 20,
      shieldBashDebuffDuration: 2000,
      shieldBashDefDebuffPercent: 15,
      shieldBashDefDebuffDuration: 5000,
      shieldBashCooldown: 3000,
      battleInstinctHpThreshold: 0.5,
      battleInstinctBonus: 0.15,
      battleInstinctOncePerBattle: true
    },
    guardian: {
      guardianWillChance: 0.2,
      guardianWillHealPercent: 0.05,
      ironWallChance: 0.15,
      ironWallDamageReduction: 0.5
    },
    mage: {
      flameExplosionAttackCount: 4,
      flameExplosionMinTargets: 3,
      flameExplosionMaxTargets: 5,
      flameExplosionDamageMultiplier: 1,
      magicAmplificationTime: 5000,
      magicAmplificationAttackBonus: 0.25
    },
    archer: {
      doubleShotChance: 0.25,
      doubleShotDamageMultiplier: 0.6,
      weakPointHpThreshold: 0.4,
      weakPointDamageBonus: 0.3
    },
    rogue: {
      shadowBladeChance: 0.2,
      shadowBladeCritMultiplier: 1.8,
      ambushCritMultiplier: 2.5
    },
    healer: {
      healingLightAttackCount: 2,
      healingLightHealMultiplier: 1.5,
      healingLightMaxHpMultiplier: 0.05,
      lifeTouchHealingBonus: 0.1
    },
    necromancer: {
      summonAttackCount: 4,
      summonMaxCount: 2,
      skeletonHpMultiplier: 0.8,
      skeletonAtkMultiplier: 0.5,
      skeletonDefMultiplier: 0.2,
      corpseExplosionDamageMultiplier: 2.0,
      corpseExplosionTargets: 2
    },
    witch: { potionAttackCount: 2, maxHpDecreasePercent: 0.005 }
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
  enemyTargetPriority: typeof enemyTargetPriorityData !== "undefined" ? enemyTargetPriorityData : [
    { priority: 1, unitNames: ["전사", "수호자", "해골 병사"] },
    { priority: 2, unitNames: ["도적"] },
    { priority: 3, unitNames: ["궁수", "마법사", "치유사", "강령술사"] }
  ],
  dungeon: { startNodeCount: 8, nextStageMapScaleMin: 1.2, nextStageMapScaleMax: 1.3 },
  shop: { unitCost: 15, fieldUpgradeBaseCost: 50, fieldUpgradeCostIncrease: 50, refreshCost: 10, refreshCostIncrease: 2 },
  items: {
    attackBannerBonus: 0.1,
    lifeCharmBonus: 0.1,
    guardianEmblemDefenseBonus: 0.1,
    ironShieldDefenseFlat: 5,
    knightBannerDefenseBonus: 0.15,
    tacticsBookSpeedBonus: 10,
    rewardHealPercent: 0.2,
    giantBeltHpBonus: 0.15,
    warriorSwordAttackBonus: 0.15,
    windBootsSpeedBonus: 15,
    paladinArmorDefenseBonus: 0.1,
    paladinArmorHpBonus: 0.05,
    assassinRingAttackBonus: 0.08,
    assassinRingSpeedBonus: 8,
    hextechDaggerAttackBonus: 0.15,
    hextechDaggerSpeedBonus: 15,
    radiantShieldDefenseBonus: 0.15,
    radiantShieldHpBonus: 0.15,
    
    // 신규 추가 복합 & 4~5티어 아이템
    hunterMarkAttackBonus: 0.35,
    dragonHeartHpBonus: 0.35,
    blessedHelmDefenseFlat: 50,
    gladiatorGloveAttackBonus: 0.20,
    tyrantSwordAttackBonus: 0.30,
    woodenShieldHpBonus: 0.20,
    titanArmorHpBonus: 0.30,
    steelBreastplateDefenseBonus: 0.20,
    thornArmorDefenseBonus: 0.30,
    goddessShieldDefenseBonus: 0.35,
    warriorHelmDefenseFlat: 15,
    imperialHelmDefenseFlat: 40,
    swiftDaggerSpeedBonus: 20,
    phantomDancerSpeedBonus: 30,
    stormBowSpeedBonus: 35,
    sunfireCapeDefenseBonus: 0.25,
    sunfireCapeHpBonus: 0.20,
    trinityForceAttackBonus: 0.20,
    trinityForceSpeedBonus: 20,
    trinityForceCritChance: 0.10,

    damageReductionT1: 0.05,
    damageReductionT2: 0.10,
    damageReductionT3: 0.15,
    damageReductionT4: 0.20,
    damageReductionT5: 0.22,
    healBonusT1: 0.10,
    healBonusT2: 0.20,
    healBonusT3: 0.30,
    healBonusT4: 0.40,
    healBonusT5: 0.45,
    critChanceT1: 0.05,
    critChanceT2: 0.10,
    critChanceT3: 0.15,
    critChanceT4: 0.20,
    critChanceT5: 0.22,
    critDamageT1: 0.20,
    critDamageT2: 0.40,
    critDamageT3: 0.60,
    critDamageT4: 0.80,
    critDamageT5: 0.90,
    lifestealT1: 0.05,
    lifestealT2: 0.10,
    lifestealT3: 0.15,
    lifestealT4: 0.20,
    lifestealT5: 0.14,

    itemTierChancesByStage: {
      1: { 1: 80, 2: 20, 3: 0, 4: 0, 5: 0 },
      3: { 1: 40, 2: 40, 3: 20, 4: 0, 5: 0 },
      5: { 1: 25, 2: 40, 3: 30, 4: 5, 5: 0 },
      7: { 1: 10, 2: 30, 3: 40, 4: 15, 5: 5 }
    },
    bossItemTierChancesByStage: {
      1: { 1: 30, 2: 60, 3: 10, 4: 0, 5: 0 },
      3: { 1: 10, 2: 40, 3: 45, 4: 5, 5: 0 },
      5: { 1: 0, 2: 20, 3: 60, 4: 15, 5: 5 },
      7: { 1: 0, 2: 15, 3: 50, 4: 25, 5: 10 }
    },
    shopItemTierChancesByStage: {
      1: { 1: 60, 2: 35, 3: 5, 4: 0, 5: 0 },
      3: { 1: 30, 2: 40, 3: 28, 4: 2, 5: 0 },
      5: { 1: 15, 2: 35, 3: 40, 4: 8, 5: 2 },
      7: { 1: 5, 2: 30, 3: 45, 4: 15, 5: 5 }
    }
  },
  units: [
    { key: "warrior", name: "전사", baseHp: 130, attack: 18, baseDefense: 18, attackSpeed: 0.9, description: "체력이 높고 공격력이 보통입니다." },
    { key: "archer", name: "궁수", baseHp: 110, attack: 27, baseDefense: 8, attackSpeed: 1.15, description: "공격력이 높지만 체력이 낮습니다." },
    { key: "mage", name: "마법사", baseHp: 100, attack: 36, baseDefense: 6, attackSpeed: 0.75, description: "강한 공격력을 가진 원거리 유닛입니다." },
    { key: "guardian", name: "수호자", baseHp: 175, attack: 14, baseDefense: 28, attackSpeed: 0.7, description: "체력이 매우 높고 전열을 버팁니다." },
    { key: "rogue", name: "도적", baseHp: 120, attack: 19, baseDefense: 10, attackSpeed: 1.65, description: "공격 속도가 빠른 유닛입니다." },
    { key: "healer", name: "치유사", baseHp: 115, attack: 12, baseDefense: 7, attackSpeed: 0.9, description: "아군을 회복시키는 후열 지원 유닛입니다." },
    { key: "necromancer", name: "강령술사", baseHp: 95, attack: 22, baseDefense: 5, attackSpeed: 1.0, description: "적의 시체를 활용해 소환수를 부리고 광역 피해를 주는 마법 딜러입니다." },
    { key: "witch", name: "마녀", baseHp: 90, attack: 24, baseDefense: 5, attackSpeed: 0.85, description: "적의 최대 체력을 비율로 깎아먹으며 스스로 강해지는 특수 디버퍼입니다." }
  ],
  gradeMultipliers: { 1: 1, 2: 1.6, 3: 2.5, 4: 4, 5: 6.5 }
};

// ==========================================
// 2. UI 렌더링 및 기능 제어
// ==========================================

let config = loadAdminConfig();
let activeMenu = "basic";
const app = document.getElementById("adminApp");


const menuMeta = {
  basic: { icon: "", label: "기본 설정", desc: "시작 골드, 필드 슬롯, 최소 전투 인원을 조정합니다." },
  rooms: { icon: "", label: "방 비율", desc: "전투방, 상점방, 휴식방의 등장 비율을 설정합니다." },
  units: { icon: "", label: "유닛 데이터", desc: "직업별 HP, 공격력, 방어력, 공격속도를 수정합니다." },
  items: { icon: "", label: "아이템 데이터", desc: "아이템 효과 수치와 회복/강화량을 관리합니다." },
  shop: { icon: "", label: "상점 설정", desc: "상점 가격과 슬롯 확장 비용을 조정합니다." },
  enemy: { icon: "", label: "적 밸런스 / 보상", desc: "적 전투력, 방어력 및 전투 승리 보상을 조정합니다." },
  enemyAbilities: { icon: "", label: "적 스킬 설정", desc: "몬스터별 스킬 발동 확률과 배율을 조정합니다." },
  abilities: { icon: "", label: "스킬 / 특성 설정", desc: "플레이어 유닛별 스킬과 특성 수치를 조정합니다." },
  targetPriority: { icon: "", label: "적 타겟 우선순위", desc: "적이 어떤 직업을 먼저 공격할지 정합니다." },
  gradeChances: { icon: "", label: "유닛 등급 확률", desc: "스테이지별 상점/보상 유닛 등급 확률을 관리합니다." },
  save: { icon: "", label: "초기화 / 기타", desc: "던전 맵 설정을 조정하고 기본값으로 초기화합니다." }
};

function getMenuMeta(menu = activeMenu) {
  return menuMeta[menu] || menuMeta.basic;
}

// 관리자 패널의 주요 상태값을 요약해서 보여주는 상단 카드 영역
function renderSummaryCards() {
  const roomTotal = Object.values(config.roomRatio || {}).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  const battleRate = Math.round((Number(config.roomRatio.battle || 0) / roomTotal) * 100);
  const shopRate = Math.round((Number(config.roomRatio.shop || 0) / roomTotal) * 100);
  const restRate = Math.round((Number(config.roomRatio.rest || 0) / roomTotal) * 100);
  return `
    <div class="summary-grid">
      <article class="summary-card">
        <span class="summary-label">시작 골드</span>
        <strong>${config.startGold}</strong>
        <small>초기 플레이어 재화</small>
      </article>
      <article class="summary-card">
        <span class="summary-label">시작 보석</span>
        <strong>${config.startGems || 0}</strong>
        <small>초기 프리미엄 재화</small>
      </article>
      <article class="summary-card">
        <span class="summary-label">필드 슬롯</span>
        <strong>${config.field.initialMaxUnits} / ${config.field.maxLimit}</strong>
        <small>기본 / 최대 배치 수</small>
      </article>
      <article class="summary-card">
        <span class="summary-label">방 비율</span>
        <strong>${battleRate}% · ${shopRate}% · ${restRate}%</strong>
        <small>전투 / 상점 / 휴식</small>
      </article>
      <article class="summary-card">
        <span class="summary-label">방어 K</span>
        <strong>${config.combat?.defenseK ?? 100}</strong>
        <small>낮을수록 방어 효율 증가</small>
      </article>
    </div>
  `;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeConfig(base, override) {
  const result = clone(base);
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && result[key]) {
      result[key] = mergeConfig(result[key], value);
    } else {
      result[key] = value;
    }
  });
  return result;
}

function loadAdminConfig() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? mergeConfig(defaultConfig, JSON.parse(saved)) : clone(defaultConfig);
}

function checkAdminLogin() {
  const password = document.getElementById("adminPassword").value;
  if (password !== ADMIN_PASSWORD) {
    renderLogin("관리자 권한이 없습니다.");
    return;
  }
  sessionStorage.setItem(SESSION_KEY, "true");
  renderAdminPanel();
}

function renderLogin(message = "") {
  app.innerHTML = `
    <section class="login">
      <div class="login-panel readable-card">
        <div class="login-badge">Dungeon Auto Legion</div>
        <h1>관리자 로그인</h1>
        <p class="hint">게임 밸런스와 데이터 설정을 수정하는 관리자 전용 페이지입니다.</p>
        <div class="field large-field">
          <label>관리자 비밀번호</label>
          <input id="adminPassword" type="password" placeholder="비밀번호를 입력하세요" onkeydown="if(event.key === 'Enter') checkAdminLogin()">
        </div>
        <div class="actions full-actions">
          <button class="primary" onclick="checkAdminLogin()">로그인</button>
        </div>
        <p class="message danger">${message}</p>
        <p class="subtle-warning">MVP용 로그인입니다. 실제 서비스에서는 서버 인증이 필요합니다.</p>
      </div>
    </section>
  `;
}

function renderAdminPanel() {
  const menus = ["basic", "rooms", "units", "items", "shop", "enemy", "enemyAbilities", "abilities", "targetPriority", "gradeChances", "save"];
  const current = getMenuMeta();

  app.innerHTML = `
    <div class="admin-shell">
      <aside class="sidebar">
        <div class="brand-block">
          <span class="brand-mark">DAL</span>
          <div>
            <h1>관리자 패널</h1>
            <p class="hint">localStorage 기반 설정 관리</p>
          </div>
        </div>
        <div class="menu">
          ${menus.map((key) => {
            const meta = getMenuMeta(key);
            return `
              <button class="menu-button ${activeMenu === key ? "active" : ""}" onclick="setMenu('${key}')">
                <span class="menu-icon">${meta.icon}</span>
                <span class="menu-text">
                  <strong>${meta.label}</strong>
                  <small>${meta.desc}</small>
                </span>
              </button>
            `;
          }).join("")}
        </div>
        <button class="logout-button" onclick="logoutAdmin()">로그아웃</button>
      </aside>
      <section class="content">
        <header class="content-top">
          <div>
            <span class="section-kicker">${current.icon} ${current.label}</span>
            <h2>${current.label}</h2>
            <p class="hint">${current.desc}</p>
          </div>
          <div class="top-actions">
            <button class="ghost" onclick="resetAdminConfig()">초기화</button>
          </div>
        </header>
        ${renderSummaryCards()}
        <p class="notice">실제 서비스에서는 서버 인증과 데이터베이스 저장 방식이 필요합니다.</p>
        <div id="editor"></div>
      </section>
    </div>
  `;
  renderActiveEditor();
}

function setMenu(menu) {
  activeMenu = menu;
  renderAdminPanel();
}

function renderActiveEditor() {
  if (activeMenu === "units") return renderUnitDataEditor();
  if (activeMenu === "items") return renderItemDataEditor();
  if (activeMenu === "abilities") return renderAbilitySettingsEditor();
  if (activeMenu === "enemyAbilities") return renderEnemyAbilitySettingsEditor();
  if (activeMenu === "targetPriority") return renderEnemyTargetPriorityEditor();
  if (activeMenu === "gradeChances") return renderUnitGradeChanceEditor();
  return renderConfigEditor();
}

function numberField(label, path, value, step = 1) {
  return `
    <div class="field">
      <label>${label}</label>
      <input type="number" step="${step}" value="${value}" onchange="updateConfigValue('${path}', this.value)">
    </div>
  `;
}

function renderConfigEditor() {
  const editor = document.getElementById("editor");
  const sections = {
    basic: `
      <h2>기본 설정</h2>
      <div class="grid">
        ${numberField("시작 골드", "startGold", config.startGold)}
        ${numberField("시작 보석", "startGems", config.startGems || 0)}
        ${numberField("무한 던전 시작 스테이지", "infiniteMode.startStage", config.infiniteMode?.startStage ?? 11)}
        ${numberField("히든 보스 등장 간격", "infiniteMode.bossInterval", config.infiniteMode?.bossInterval ?? 5)}
        ${numberField("무한 모드 추가 난이도 계수", "infiniteMode.extraDifficultyFactor", config.infiniteMode?.extraDifficultyFactor ?? 1.1, 0.01)}
        ${numberField("재조합 대성공 확률", "recombination.greatSuccessChance", (config.recombination || {}).greatSuccessChance ?? 0.2, 0.01)}
        ${numberField("현재 스테이지 기본값", "currentStagePreview", 1)}
        ${numberField("기본 필드 슬롯 수", "field.initialMaxUnits", config.field.initialMaxUnits)}
        ${numberField("최대 필드 슬롯 수", "field.maxLimit", config.field.maxLimit)}
        ${numberField("전투 시작 최소 유닛 수", "field.minUnitsToBattle", config.field.minUnitsToBattle)}
      </div>
    `,
    rooms: `
      <h2>방 비율</h2>
      <div class="grid">
        ${numberField("전투방", "roomRatio.battle", config.roomRatio.battle)}
        ${numberField("상점방", "roomRatio.shop", config.roomRatio.shop)}
        ${numberField("휴식방", "roomRatio.rest", config.roomRatio.rest)}
        ${numberField("이벤트방", "roomRatio.event", config.roomRatio.event)}
      </div>
      <p class="hint">보상방은 맵에 생성되지 않고 전투/보스 승리 후에만 열립니다. 보스방은 마지막 노드에 고정됩니다.</p>
    `,
    shop: `
      <h2>상점 설정</h2>
      <div class="grid">
        ${numberField("유닛 구매 가격", "shop.unitCost", config.shop.unitCost)}
        ${numberField("상점 새로고침 가격", "shop.refreshCost", config.shop.refreshCost || 10)}
        ${numberField("상점 새로고침 가격 증가량", "shop.refreshCostIncrease", config.shop.refreshCostIncrease || 2)}
        ${numberField("필드 슬롯 확장 기본 가격", "shop.fieldUpgradeBaseCost", config.shop.fieldUpgradeBaseCost)}
        ${numberField("필드 슬롯 확장 가격 증가량", "shop.fieldUpgradeCostIncrease", config.shop.fieldUpgradeCostIncrease)}
      </div>
    `,
    enemy: `
      <h2>적 밸런스 및 보상</h2>
      <p class="hint">현재 적 스케일링 설정 (스테이지 비례 방식):</p>
      <p class="hint">몬스터 스탯 = 기본 스탯 × (스테이지 배율 ^ (스테이지 - 1)) × 개체별 배율</p>
      <div class="grid">
        ${numberField("적 기본 HP", "enemyScaling.baseHp", config.enemyScaling.baseHp)}
        ${numberField("적 기본 공격력", "enemyScaling.baseAttack", config.enemyScaling.baseAttack)}
        ${numberField("적 기본 방어력", "enemyScaling.baseDefense", config.enemyScaling.baseDefense)}
        ${numberField("스테이지당 스탯 증가 배율", "enemyScaling.stageMultiplier", config.enemyScaling.stageMultiplier, 0.01)}
        ${numberField("전투방 개체별 최소 배율", "enemyScaling.battlePowerMin", config.enemyScaling.battlePowerMin, 0.01)}
        ${numberField("전투방 개체별 최대 배율", "enemyScaling.battlePowerMax", config.enemyScaling.battlePowerMax, 0.01)}
        ${numberField("보스방 전투력 최소 배율", "enemyScaling.bossPowerMin", config.enemyScaling.bossPowerMin, 0.01)}
        ${numberField("보스방 전투력 최대 배율", "enemyScaling.bossPowerMax", config.enemyScaling.bossPowerMax, 0.01)}
        ${numberField("전투방 최소 적 마릿수", "enemyScaling.enemyCountBaseMin", config.enemyScaling.enemyCountBaseMin)}
        ${numberField("전투방 최대 적 마릿수", "enemyScaling.enemyCountBaseMax", config.enemyScaling.enemyCountBaseMax)}
        ${numberField("전투방 골드 최소", "rewards.battleGoldMin", config.rewards.battleGoldMin)}
        ${numberField("전투방 골드 최대", "rewards.battleGoldMax", config.rewards.battleGoldMax)}
        ${numberField("보스방 골드 최소", "rewards.bossGoldMin", config.rewards.bossGoldMin)}
        ${numberField("보스방 골드 최대", "rewards.bossGoldMax", config.rewards.bossGoldMax)}
        ${numberField("부활 비용", "rewards.reviveCost", config.rewards.reviveCost ?? 50)}
        ${numberField("보스 보상 배율", "rewards.bossRewardMultiplier", config.rewards.bossRewardMultiplier, 0.1)}
        ${numberField("전투방 승리 체력 회복률", "rewards.battleHealMissingHpPercent", config.rewards.battleHealMissingHpPercent, 0.01)}
        ${numberField("보스방 승리 체력 회복률", "rewards.bossHealMissingHpPercent", config.rewards.bossHealMissingHpPercent, 0.01)}
        ${numberField("위험 전투 골드 배율 (최소)", "goldBonus.outnumberedMinMultiplier", config.goldBonus.outnumberedMinMultiplier, 0.01)}
        ${numberField("위험 전투 골드 배율 (최대)", "goldBonus.outnumberedMaxMultiplier", config.goldBonus.outnumberedMaxMultiplier, 0.01)}
        ${numberField("방어력 계산 상수 K", "combat.defenseK", config.combat.defenseK)}
        ${numberField("보스 제한 시간(ms)", "combat.bossTimeLimitMs", config.combat.bossTimeLimitMs ?? 30000)}
        ${numberField("보스 광폭화 배율", "combat.bossEnrageMultiplier", config.combat.bossEnrageMultiplier ?? 5, 0.1)}
        ${numberField("보스 2페이즈 광역 배율", "combat.bossPhase2AoEMultiplier", config.combat.bossPhase2AoEMultiplier ?? 1.5, 0.1)}
      </div>
      <p class="hint">적 마릿수는 스테이지가 오를수록 최대 마릿수가 조금씩 증가합니다. (최대 10마리)</p>
      <p class="hint">방어력 공식: 피해 감소율(%) = 방어력 / (방어력 + K) × 100, 최종 피해량 = 공격력 × (1 - 피해 감소율 / 100)</p>
      <p class="hint">K가 낮을수록 방어력 효율이 강해지고, K가 높을수록 방어력 효율이 약해집니다.</p>

      <h3 style="margin-top: 24px;">일반 몬스터 템플릿</h3>
      <div class="table">
        ${(config.enemyScaling.normalTemplates || []).map((tpl, i) => `
          <div class="row">
            ${numberOrText("이름", `enemyScaling.normalTemplates.${i}.name`, tpl.name, "text")}
            ${numberOrText("HP 배율", `enemyScaling.normalTemplates.${i}.hpMod`, tpl.hpMod, "number", 0.01)}
            ${numberOrText("공격력 배율", `enemyScaling.normalTemplates.${i}.atkMod`, tpl.atkMod, "number", 0.01)}
            ${numberOrText("방어력 배율", `enemyScaling.normalTemplates.${i}.defMod`, tpl.defMod, "number", 0.01)}
            ${numberOrText("속도 배율", `enemyScaling.normalTemplates.${i}.spdMod`, tpl.spdMod, "number", 0.01)}
          </div>
        `).join("")}
      </div>

      <h3 style="margin-top: 24px;">보스 몬스터 템플릿</h3>
      <div class="table">
        ${(config.enemyScaling.bossTemplates || []).map((tpl, i) => `
          <div class="row">
            ${numberOrText("이름", `enemyScaling.bossTemplates.${i}.name`, tpl.name, "text")}
            ${numberOrText("HP 배율", `enemyScaling.bossTemplates.${i}.hpMod`, tpl.hpMod, "number", 0.01)}
            ${numberOrText("공격력 배율", `enemyScaling.bossTemplates.${i}.atkMod`, tpl.atkMod, "number", 0.01)}
            ${numberOrText("방어력 배율", `enemyScaling.bossTemplates.${i}.defMod`, tpl.defMod, "number", 0.01)}
            ${numberOrText("속도 배율", `enemyScaling.bossTemplates.${i}.spdMod`, tpl.spdMod, "number", 0.01)}
          </div>
        `).join("")}
      </div>
    `,
    save: `
      <h2>던전 맵 설정 / 초기화</h2>
      <div class="grid">
        ${numberField("시작 맵 노드 수", "dungeon.startNodeCount", config.dungeon.startNodeCount)}
        ${numberField("다음 스테이지 맵 증가 최소", "dungeon.nextStageMapScaleMin", config.dungeon.nextStageMapScaleMin, 0.01)}
        ${numberField("다음 스테이지 맵 증가 최대", "dungeon.nextStageMapScaleMax", config.dungeon.nextStageMapScaleMax, 0.01)}
      </div>
      <p class="hint">보스방 위치 규칙: 각 스테이지 마지막 노드에 고정 배치</p>
      <div class="actions">
        <button onclick="resetAdminConfig()">기본값 초기화</button>
      </div>
      <p id="adminMessage" class="message"></p>
    `
  };
  editor.innerHTML = `<div class="panel">${sections[activeMenu] || sections.basic}</div>`;
}

function renderUnitDataEditor() {
  document.getElementById("editor").innerHTML = `
    <div class="panel">
      <h2>유닛 데이터</h2>
      <div class="table">
        ${config.units.map((unit, index) => `
          <div class="row">
            ${numberOrText("이름", `units.${index}.name`, unit.name, "text")}
            ${numberOrText("기본 HP", `units.${index}.baseHp`, unit.baseHp)}
            ${numberOrText("기본 공격력", `units.${index}.attack`, unit.attack)}
            ${numberOrText("기본 방어력", `units.${index}.baseDefense`, unit.baseDefense)}
            ${numberOrText("공격 속도", `units.${index}.attackSpeed`, unit.attackSpeed, "number", 0.01)}
            ${numberOrText("설명", `units.${index}.description`, unit.description, "text")}
          </div>
        `).join("")}
      </div>
      <h3 style="margin-top: 24px;">유닛 등급별 스탯 배율</h3>
      <div class="grid">
        ${numberField("1성 스탯 배율", "gradeMultipliers.1", config.gradeMultipliers[1], 0.1)}
        ${numberField("2성 스탯 배율", "gradeMultipliers.2", config.gradeMultipliers[2], 0.1)}
        ${numberField("3성 스탯 배율", "gradeMultipliers.3", config.gradeMultipliers[3], 0.1)}
        ${numberField("4성 스탯 배율", "gradeMultipliers.4", config.gradeMultipliers[4], 0.1)}
        ${numberField("5성 스탯 배율", "gradeMultipliers.5", config.gradeMultipliers[5], 0.1)}
      </div>
    </div>
  `;
}

function numberOrText(label, path, value, type = "number", step = 1) {
  return `
    <div class="field">
      <label>${label}</label>
      <input type="${type}" step="${step}" value="${value}" onchange="updateConfigValue('${path}', this.value)">
    </div>
  `;
}

function renderItemDataEditor() {
  document.getElementById("editor").innerHTML = `
    <div class="panel">
      <h2>아이템 데이터</h2>
      <div class="grid">
        ${numberField("공격의 깃발 공격력 증가", "items.attackBannerBonus", config.items.attackBannerBonus, 0.01)}
        ${numberField("전사의 검 공격력 증가", "items.warriorSwordAttackBonus", config.items.warriorSwordAttackBonus, 0.01)}
        ${numberField("투사의 장갑 공격력 증가", "items.gladiatorGloveAttackBonus", config.items.gladiatorGloveAttackBonus, 0.01)}
        ${numberField("폭군의 대검 공격력 증가", "items.tyrantSwordAttackBonus", config.items.tyrantSwordAttackBonus, 0.01)}
        ${numberField("사냥꾼의 증표 공격력 증가", "items.hunterMarkAttackBonus", config.items.hunterMarkAttackBonus, 0.01)}
        ${numberField("생명의 부적 HP 증가", "items.lifeCharmBonus", config.items.lifeCharmBonus, 0.01)}
        ${numberField("거인의 허리띠 HP 증가", "items.giantBeltHpBonus", config.items.giantBeltHpBonus, 0.01)}
        ${numberField("고목나무 방패 HP 증가", "items.woodenShieldHpBonus", config.items.woodenShieldHpBonus, 0.01)}
        ${numberField("타이탄의 갑옷 HP 증가", "items.titanArmorHpBonus", config.items.titanArmorHpBonus, 0.01)}
        ${numberField("용의 심장 HP 증가", "items.dragonHeartHpBonus", config.items.dragonHeartHpBonus, 0.01)}
        ${numberField("수호의 문장 방어력 증가", "items.guardianEmblemDefenseBonus", config.items.guardianEmblemDefenseBonus, 0.01)}
        ${numberField("철벽 방패 방어력 고정 증가", "items.ironShieldDefenseFlat", config.items.ironShieldDefenseFlat)}
        ${numberField("전사의 투구 방어력 고정 증가", "items.warriorHelmDefenseFlat", config.items.warriorHelmDefenseFlat)}
        ${numberField("기사단 깃발 방어력 증가", "items.knightBannerDefenseBonus", config.items.knightBannerDefenseBonus, 0.01)}
        ${numberField("강철 흉갑 방어력 증가", "items.steelBreastplateDefenseBonus", config.items.steelBreastplateDefenseBonus, 0.01)}
        ${numberField("가시 갑옷 방어력 증가", "items.thornArmorDefenseBonus", config.items.thornArmorDefenseBonus, 0.01)}
        ${numberField("여신의 방패 방어력 증가", "items.goddessShieldDefenseBonus", config.items.goddessShieldDefenseBonus, 0.01)}
        ${numberField("전술 교본 공격 속도 증가", "items.tacticsBookSpeedBonus", config.items.tacticsBookSpeedBonus, 0.01)}
        ${numberField("바람의 부츠 공격 속도 증가", "items.windBootsSpeedBonus", config.items.windBootsSpeedBonus, 0.01)}
        ${numberField("날렵한 단검 공격 속도 증가", "items.swiftDaggerSpeedBonus", config.items.swiftDaggerSpeedBonus, 0.01)}
        ${numberField("유령 무희의 검 공격 속도 증가", "items.phantomDancerSpeedBonus", config.items.phantomDancerSpeedBonus, 0.01)}
        ${numberField("폭풍의 활 공격 속도 증가", "items.stormBowSpeedBonus", config.items.stormBowSpeedBonus, 0.01)}
        ${numberField("성기사의 갑옷 방어력 증가", "items.paladinArmorDefenseBonus", config.items.paladinArmorDefenseBonus, 0.01)}
        ${numberField("성기사의 갑옷 HP 증가", "items.paladinArmorHpBonus", config.items.paladinArmorHpBonus, 0.01)}
        ${numberField("태양불꽃 망토 방어력 증가", "items.sunfireCapeDefenseBonus", config.items.sunfireCapeDefenseBonus, 0.01)}
        ${numberField("태양불꽃 망토 HP 증가", "items.sunfireCapeHpBonus", config.items.sunfireCapeHpBonus, 0.01)}
        ${numberField("암살자의 반지 공격력 증가", "items.assassinRingAttackBonus", config.items.assassinRingAttackBonus, 0.01)}
        ${numberField("암살자의 반지 공격 속도 증가", "items.assassinRingSpeedBonus", config.items.assassinRingSpeedBonus, 0.01)}
        ${numberField("마법공학 단검 공격력 증가", "items.hextechDaggerAttackBonus", config.items.hextechDaggerAttackBonus, 0.01)}
        ${numberField("마법공학 단검 공격 속도 증가", "items.hextechDaggerSpeedBonus", config.items.hextechDaggerSpeedBonus, 0.01)}
        ${numberField("삼위일체 공격력 증가", "items.trinityForceAttackBonus", config.items.trinityForceAttackBonus, 0.01)}
        ${numberField("삼위일체 공격 속도 증가", "items.trinityForceSpeedBonus", config.items.trinityForceSpeedBonus, 0.01)}
        ${numberField("삼위일체 치명타 확률", "items.trinityForceCritChance", config.items.trinityForceCritChance, 0.01)}
        ${numberField("빛의 방패 방어력 증가", "items.radiantShieldDefenseBonus", config.items.radiantShieldDefenseBonus, 0.01)}
        ${numberField("빛의 방패 HP 증가", "items.radiantShieldHpBonus", config.items.radiantShieldHpBonus, 0.01)}
        ${numberField("제국군의 투구 방어력 고정 증가", "items.imperialHelmDefenseFlat", config.items.imperialHelmDefenseFlat)}
        ${numberField("축복받은 투구 방어력 고정 증가", "items.blessedHelmDefenseFlat", config.items.blessedHelmDefenseFlat)}
        ${numberField("회복 보상 잃은 체력 회복률", "items.rewardHealPercent", config.items.rewardHealPercent, 0.01)}
      </div>
      <h3 style="margin-top: 24px;">신규 효과 (피해 감소 / 회복 / 치명타)</h3>
      <div class="grid">
        ${numberField("가벼운 망토(1성) 피해 감소", "items.damageReductionT1", config.items.damageReductionT1, 0.01)}
        ${numberField("사슬 갑옷(2성) 피해 감소", "items.damageReductionT2", config.items.damageReductionT2, 0.01)}
        ${numberField("미스릴 갑옷(3성) 피해 감소", "items.damageReductionT3", config.items.damageReductionT3, 0.01)}
        ${numberField("흑요석 갑옷(4성) 피해 감소", "items.damageReductionT4", config.items.damageReductionT4, 0.01)}
        ${numberField("불멸의 망토(5성) 피해 감소", "items.damageReductionT5", config.items.damageReductionT5, 0.01)}
        ${numberField("요정의 가루(1성) 회복량 증가", "items.healBonusT1", config.items.healBonusT1, 0.01)}
        ${numberField("정령의 펜던트(2성) 회복량 증가", "items.healBonusT2", config.items.healBonusT2, 0.01)}
        ${numberField("세계수의 가지(3성) 회복량 증가", "items.healBonusT3", config.items.healBonusT3, 0.01)}
        ${numberField("생명의 수정(4성) 회복량 증가", "items.healBonusT4", config.items.healBonusT4, 0.01)}
        ${numberField("성스러운 성배(5성) 회복량 증가", "items.healBonusT5", config.items.healBonusT5, 0.01)}
        ${numberField("날카로운 숫돌(1성) 치명타 확률", "items.critChanceT1", config.items.critChanceT1, 0.01)}
        ${numberField("정밀한 조준경(2성) 치명타 확률", "items.critChanceT2", config.items.critChanceT2, 0.01)}
        ${numberField("암살자의 단검(3성) 치명타 확률", "items.critChanceT3", config.items.critChanceT3, 0.01)}
        ${numberField("매의 눈(4성) 치명타 확률", "items.critChanceT4", config.items.critChanceT4, 0.01)}
        ${numberField("무한의 대검(5성) 치명타 확률", "items.critChanceT5", config.items.critChanceT5, 0.01)}
        ${numberField("흑요석 화살촉(1성) 치명타 피해", "items.critDamageT1", config.items.critDamageT1, 0.01)}
        ${numberField("처형인의 도끼(2성) 치명타 피해", "items.critDamageT2", config.items.critDamageT2, 0.01)}
        ${numberField("파멸의 검(3성) 치명타 피해", "items.critDamageT3", config.items.critDamageT3, 0.01)}
        ${numberField("악마의 뿔(4성) 치명타 피해", "items.critDamageT4", config.items.critDamageT4, 0.01)}
        ${numberField("파괴자의 낫(5성) 치명타 피해", "items.critDamageT5", config.items.critDamageT5, 0.01)}
        ${numberField("흡혈의 낫(1성) 생명력 흡수", "items.lifestealT1", config.items.lifestealT1, 0.01)}
        ${numberField("피바라기(2성) 생명력 흡수", "items.lifestealT2", config.items.lifestealT2, 0.01)}
        ${numberField("뱀파이어의 검(3성) 생명력 흡수", "items.lifestealT3", config.items.lifestealT3, 0.01)}
        ${numberField("굶주린 히드라(4성) 생명력 흡수", "items.lifestealT4", config.items.lifestealT4, 0.01)}
        ${numberField("핏빛 군주의 검(5성) 생명력 흡수", "items.lifestealT5", config.items.lifestealT5, 0.01)}
      </div>
      <h3 style="margin-top: 24px;">일반 전투 아이템 등급 확률 (%)</h3>
      <div class="table">
        ${Object.keys(config.items.itemTierChancesByStage || {}).map(Number).sort((a, b) => a - b).map(stage => {
          const chances = config.items.itemTierChancesByStage[stage];
          const total = [1, 2, 3, 4, 5].reduce((sum, tier) => sum + Number(chances[tier] || 0), 0);
          return `
            <div class="row">
              <strong>${stage}스테이지</strong>
              ${[1, 2, 3, 4, 5].map(tier => numberOrText(`${tier}티어`, `items.itemTierChancesByStage.${stage}.${tier}`, chances[tier] || 0)).join("")}
              <p class="message ${total === 100 ? "" : "danger"}" style="margin:0 0 0 8px; align-self:center;">합계: ${total}%</p>
            </div>
          `;
        }).join("")}
      </div>
      <h3 style="margin-top: 24px;">보스 보상 아이템 등급 확률 (%)</h3>
      <div class="table">
        ${Object.keys(config.items.bossItemTierChancesByStage || {}).map(Number).sort((a, b) => a - b).map(stage => {
          const chances = config.items.bossItemTierChancesByStage[stage];
          const total = [1, 2, 3, 4, 5].reduce((sum, tier) => sum + Number(chances[tier] || 0), 0);
          return `
            <div class="row">
              <strong>${stage}스테이지</strong>
              ${[1, 2, 3, 4, 5].map(tier => numberOrText(`${tier}티어`, `items.bossItemTierChancesByStage.${stage}.${tier}`, chances[tier] || 0)).join("")}
              <p class="message ${total === 100 ? "" : "danger"}" style="margin:0 0 0 8px; align-self:center;">합계: ${total}%</p>
            </div>
          `;
        }).join("")}
      </div>
      <h3 style="margin-top: 24px;">상점 아이템 등급 확률 (%)</h3>
      <div class="table">
        ${Object.keys(config.items.shopItemTierChancesByStage || {}).map(Number).sort((a, b) => a - b).map(stage => {
          const chances = config.items.shopItemTierChancesByStage[stage];
          const total = [1, 2, 3, 4, 5].reduce((sum, tier) => sum + Number(chances[tier] || 0), 0);
          return `
            <div class="row">
              <strong>${stage}스테이지</strong>
              ${[1, 2, 3, 4, 5].map(tier => numberOrText(`${tier}티어`, `items.shopItemTierChancesByStage.${stage}.${tier}`, chances[tier] || 0)).join("")}
              <p class="message ${total === 100 ? "" : "danger"}" style="margin:0 0 0 8px; align-self:center;">합계: ${total}%</p>
            </div>
          `;
        }).join("")}
      </div>
      <p class="hint">아이템 설명: 필드 확장, 공격력 증가, HP 증가, 다음 전투 속도 증가, 보상방 회복 효과를 조정합니다.</p>
    </div>
  `;
}

function renderAbilitySettingsEditor() {
  const ability = config.abilitySettings;
  document.getElementById("editor").innerHTML = `
    <div class="panel">
      <h2>스킬 / 특성 설정</h2>
      <p class="hint">확률은 0~1 기준입니다. 예: 30% = 0.3</p>
      <div class="table">
        <div class="row">
          <strong>전사</strong>
          ${numberOrText("방패 강타 확률", "abilitySettings.warrior.shieldBashChance", ability.warrior.shieldBashChance, "number", 0.01)}
          ${numberOrText("방패 강타 피해 배율", "abilitySettings.warrior.shieldBashDamageMultiplier", ability.warrior.shieldBashDamageMultiplier, "number", 0.01)}
          ${numberOrText("공격속도 감소율", "abilitySettings.warrior.shieldBashAttackSpeedDownPercent", ability.warrior.shieldBashAttackSpeedDownPercent)}
          ${numberOrText("디버프 지속시간", "abilitySettings.warrior.shieldBashDebuffDuration", ability.warrior.shieldBashDebuffDuration)}
          ${numberOrText("방어력 감소율(%)", "abilitySettings.warrior.shieldBashDefDebuffPercent", ability.warrior.shieldBashDefDebuffPercent)}
          ${numberOrText("방어력 감소 지속시간", "abilitySettings.warrior.shieldBashDefDebuffDuration", ability.warrior.shieldBashDefDebuffDuration)}
          ${numberOrText("방패 강타 쿨타임", "abilitySettings.warrior.shieldBashCooldown", ability.warrior.shieldBashCooldown)}
          ${numberOrText("전투 본능 HP 기준", "abilitySettings.warrior.battleInstinctHpThreshold", ability.warrior.battleInstinctHpThreshold, "number", 0.01)}
          ${numberOrText("전투 본능 증가율", "abilitySettings.warrior.battleInstinctBonus", ability.warrior.battleInstinctBonus, "number", 0.01)}
          <p class="hint">전투 본능 발동 제한: 전투당 1회</p>
        </div>
        <div class="row">
          <strong>수호자</strong>
          ${numberOrText("수호자의 의지 확률", "abilitySettings.guardian.guardianWillChance", ability.guardian.guardianWillChance, "number", 0.01)}
          ${numberOrText("회복량 비율", "abilitySettings.guardian.guardianWillHealPercent", ability.guardian.guardianWillHealPercent, "number", 0.01)}
          ${numberOrText("철벽 확률", "abilitySettings.guardian.ironWallChance", ability.guardian.ironWallChance, "number", 0.01)}
          ${numberOrText("철벽 피해 감소율", "abilitySettings.guardian.ironWallDamageReduction", ability.guardian.ironWallDamageReduction, "number", 0.01)}
        </div>
        <div class="row">
          <strong>마법사</strong>
          ${numberOrText("화염 폭발 공격 횟수", "abilitySettings.mage.flameExplosionAttackCount", ability.mage.flameExplosionAttackCount)}
          ${numberOrText("화염 폭발 최소 대상", "abilitySettings.mage.flameExplosionMinTargets", ability.mage.flameExplosionMinTargets)}
          ${numberOrText("화염 폭발 최대 대상", "abilitySettings.mage.flameExplosionMaxTargets", ability.mage.flameExplosionMaxTargets)}
          ${numberOrText("화염 폭발 피해 배율", "abilitySettings.mage.flameExplosionDamageMultiplier", ability.mage.flameExplosionDamageMultiplier, "number", 0.01)}
          ${numberOrText("마력 증폭 발동 시간", "abilitySettings.mage.magicAmplificationTime", ability.mage.magicAmplificationTime)}
          ${numberOrText("마력 증폭 공격력 증가", "abilitySettings.mage.magicAmplificationAttackBonus", ability.mage.magicAmplificationAttackBonus, "number", 0.01)}
        </div>
        <div class="row">
          <strong>궁수</strong>
          ${numberOrText("연속 사격 확률", "abilitySettings.archer.doubleShotChance", ability.archer.doubleShotChance, "number", 0.01)}
          ${numberOrText("연속 사격 피해 배율", "abilitySettings.archer.doubleShotDamageMultiplier", ability.archer.doubleShotDamageMultiplier, "number", 0.01)}
          ${numberOrText("약점 조준 HP 기준", "abilitySettings.archer.weakPointHpThreshold", ability.archer.weakPointHpThreshold, "number", 0.01)}
          ${numberOrText("약점 조준 피해 증가", "abilitySettings.archer.weakPointDamageBonus", ability.archer.weakPointDamageBonus, "number", 0.01)}
        </div>
        <div class="row">
          <strong>도적</strong>
          ${numberOrText("그림자 칼날 확률", "abilitySettings.rogue.shadowBladeChance", ability.rogue.shadowBladeChance, "number", 0.01)}
          ${numberOrText("그림자 칼날 배율", "abilitySettings.rogue.shadowBladeCritMultiplier", ability.rogue.shadowBladeCritMultiplier, "number", 0.01)}
          ${numberOrText("급습 배율", "abilitySettings.rogue.ambushCritMultiplier", ability.rogue.ambushCritMultiplier, "number", 0.01)}
        </div>
        <div class="row">
          <strong>치유사</strong>
          ${numberOrText("회복의 빛 필요 공격 횟수", "abilitySettings.healer.healingLightAttackCount", ability.healer?.healingLightAttackCount ?? 3)}
          ${numberOrText("회복의 빛 공격력 배율", "abilitySettings.healer.healingLightHealMultiplier", ability.healer?.healingLightHealMultiplier ?? 1.5, "number", 0.01)}
          ${numberOrText("회복의 빛 최대 체력 배율", "abilitySettings.healer.healingLightMaxHpMultiplier", ability.healer?.healingLightMaxHpMultiplier ?? 0.05, "number", 0.01)}
          ${numberOrText("생명의 손길 회복량 증가율", "abilitySettings.healer.lifeTouchHealingBonus", ability.healer?.lifeTouchHealingBonus ?? 0.1, "number", 0.01)}
        </div>
        <div class="row">
          <strong>강령술사</strong>
          ${numberOrText("소환 필요 공격 횟수", "abilitySettings.necromancer.summonAttackCount", ability.necromancer?.summonAttackCount ?? 4)}
          ${numberOrText("최대 소환 유지 수", "abilitySettings.necromancer.summonMaxCount", ability.necromancer?.summonMaxCount ?? 2)}
          ${numberOrText("해골 체력 배율", "abilitySettings.necromancer.skeletonHpMultiplier", ability.necromancer?.skeletonHpMultiplier ?? 0.8, "number", 0.01)}
          ${numberOrText("해골 공격력 배율", "abilitySettings.necromancer.skeletonAtkMultiplier", ability.necromancer?.skeletonAtkMultiplier ?? 0.5, "number", 0.01)}
          ${numberOrText("해골 방어력 배율", "abilitySettings.necromancer.skeletonDefMultiplier", ability.necromancer?.skeletonDefMultiplier ?? 0.2, "number", 0.01)}
          ${numberOrText("시체 폭발 타겟 수", "abilitySettings.necromancer.corpseExplosionTargets", ability.necromancer?.corpseExplosionTargets ?? 2)}
          ${numberOrText("시체 폭발 피해 배율", "abilitySettings.necromancer.corpseExplosionDamageMultiplier", ability.necromancer?.corpseExplosionDamageMultiplier ?? 2.0, "number", 0.01)}
        </div>
        <div class="row">
          <strong>마녀</strong>
          ${numberOrText("스킬 발동 공격 횟수", "abilitySettings.witch.potionAttackCount", ability.witch?.potionAttackCount ?? 2)}
          ${numberOrText("최대 체력 감소율", "abilitySettings.witch.maxHpDecreasePercent", ability.witch?.maxHpDecreasePercent ?? 0.005, "number", 0.001)}
        </div>
      </div>
    </div>
  `;
}

function renderEnemyAbilitySettingsEditor() {
  const e = config.enemyAbilitySettings;
  document.getElementById("editor").innerHTML = `
    <div class="panel">
      <h2>몬스터 스킬 / 특성 설정</h2>
      <div class="table">
        <div class="row"><strong>해골</strong> 
          ${numberOrText("방어 확률", "enemyAbilitySettings.skeleton.shieldChance", e.skeleton.shieldChance, "number", 0.01)}
          ${numberOrText("디버프 확률", "enemyAbilitySettings.skeleton.asDebuffChance", e.skeleton.asDebuffChance, "number", 0.01)}
          ${numberOrText("감소율(%)", "enemyAbilitySettings.skeleton.asDebuffPercent", e.skeleton.asDebuffPercent)}
        </div>
        <div class="row"><strong>고블린</strong> 
          ${numberOrText("기습 배율", "enemyAbilitySettings.goblin.ambushMultiplier", e.goblin.ambushMultiplier, "number", 0.1)}
          ${numberOrText("상시 공속 보너스(%)", "enemyAbilitySettings.goblin.asBonusPercent", e.goblin.asBonusPercent)}
        </div>
        <div class="row"><strong>오크</strong> 
          ${numberOrText("강타 공격 횟수", "enemyAbilitySettings.orc.groundBashAttackCount", e.orc.groundBashAttackCount)}
          ${numberOrText("강타 피해 배율", "enemyAbilitySettings.orc.groundBashMultiplier", e.orc.groundBashMultiplier, "number", 0.1)}
          ${numberOrText("광폭화 HP 기준", "enemyAbilitySettings.orc.enrageThreshold", e.orc.enrageThreshold, "number", 0.01)}
          ${numberOrText("광폭화 공증 배율", "enemyAbilitySettings.orc.enrageAtkMultiplier", e.orc.enrageAtkMultiplier, "number", 0.1)}
        </div>
        <div class="row"><strong>슬라임</strong> 
          ${numberOrText("반격 공속 감소(%)", "enemyAbilitySettings.slime.hitDebuffPercent", e.slime.hitDebuffPercent)}
          ${numberOrText("감소 지속시간(ms)", "enemyAbilitySettings.slime.hitDebuffDuration", e.slime.hitDebuffDuration)}
          ${numberOrText("초당 재생률", "enemyAbilitySettings.slime.regenPercent", e.slime.regenPercent, "number", 0.005)}
        </div>
        <div class="row"><strong>유령</strong> 
          ${numberOrText("흡혈 확률", "enemyAbilitySettings.ghost.lifestealChance", e.ghost.lifestealChance, "number", 0.01)}
          ${numberOrText("흡혈률", "enemyAbilitySettings.ghost.lifestealPercent", e.ghost.lifestealPercent, "number", 0.1)}
          ${numberOrText("피해 감소율", "enemyAbilitySettings.ghost.damageReduction", e.ghost.damageReduction, "number", 0.01)}
        </div>
        <div class="row"><strong>박쥐</strong> 
          ${numberOrText("상시 흡혈률", "enemyAbilitySettings.bat.lifestealPercent", e.bat.lifestealPercent, "number", 0.05)}
        </div>
        <div class="row"><strong>미노타우르스</strong> 
          ${numberOrText("충격파 공격 횟수", "enemyAbilitySettings.minotaur.shockwaveAttackCount", e.minotaur.shockwaveAttackCount)}
          ${numberOrText("공속 감소율(%)", "enemyAbilitySettings.minotaur.shockwaveAsDebuffPercent", e.minotaur.shockwaveAsDebuffPercent)}
          ${numberOrText("HP 보너스", "enemyAbilitySettings.minotaur.hpBonus", e.minotaur.hpBonus, "number", 0.1)}
          ${numberOrText("방어 보너스", "enemyAbilitySettings.minotaur.defBonus", e.minotaur.defBonus, "number", 0.1)}
        </div>
        <div class="row"><strong>리치</strong> 
          ${numberOrText("소환 주기(ms)", "enemyAbilitySettings.lich.summonInterval", e.lich.summonInterval)}
          ${numberOrText("소환수 HP 배율", "enemyAbilitySettings.lich.summonHpMultiplier", e.lich.summonHpMultiplier, "number", 0.05)}
          ${numberOrText("소환수 공격 배율", "enemyAbilitySettings.lich.summonAtkMultiplier", e.lich.summonAtkMultiplier, "number", 0.05)}
        </div>
        <div class="row"><strong>타락한 기사</strong> 
          ${numberOrText("스킬 확률", "enemyAbilitySettings.corrupt_knight.darkBladeChance", e.corrupt_knight.darkBladeChance, "number", 0.01)}
          ${numberOrText("스킬 배율", "enemyAbilitySettings.corrupt_knight.darkBladeMultiplier", e.corrupt_knight.darkBladeMultiplier, "number", 0.1)}
          ${numberOrText("반사 확률", "enemyAbilitySettings.corrupt_knight.reflectChance", e.corrupt_knight.reflectChance, "number", 0.01)}
          ${numberOrText("반사율", "enemyAbilitySettings.corrupt_knight.reflectPercent", e.corrupt_knight.reflectPercent, "number", 0.01)}
        </div>
        <div class="row"><strong>거대 독거미</strong> 
          ${numberOrText("평타 공속 감소(%)", "enemyAbilitySettings.spider.poisonAsDebuffPercent", e.spider.poisonAsDebuffPercent)}
          ${numberOrText("시작 거미줄 감소(%)", "enemyAbilitySettings.spider.startWebAsDebuffPercent", e.spider.startWebAsDebuffPercent)}
          ${numberOrText("거미줄 지속시간(ms)", "enemyAbilitySettings.spider.startWebDuration", e.spider.startWebDuration)}
        </div>
        <div class="row"><strong>저주받은 미라</strong> 
          ${numberOrText("치유감소 확률", "enemyAbilitySettings.mummy.healDebuffChance", e.mummy?.healDebuffChance ?? 0.25, "number", 0.01)}
          ${numberOrText("치유감소율(%)", "enemyAbilitySettings.mummy.healDebuffPercent", e.mummy?.healDebuffPercent ?? 50)}
          ${numberOrText("지속시간(ms)", "enemyAbilitySettings.mummy.healDebuffDuration", e.mummy?.healDebuffDuration ?? 3000)}
        </div>
      </div>
      <div class="actions">
        <button onclick="resetAdminConfig()">기본값 초기화</button>
      </div>
    </div>
  `;
}

function renderEnemyTargetPriorityEditor() {
  const priorities = [...config.enemyTargetPriority].sort((a, b) => a.priority - b.priority);
  document.getElementById("editor").innerHTML = `
    <div class="panel">
      <h2>적 타겟 우선순위</h2>
      <p class="hint">적은 낮은 priority 번호부터 살아있는 플레이어 유닛을 찾고, 같은 우선순위 안에서는 랜덤으로 공격합니다.</p>
      <div class="table">
        ${priorities.map((group, index) => `
          <div class="row">
            ${numberOrText("우선순위", `enemyTargetPriority.${index}.priority`, group.priority)}
            ${numberOrText("유닛 이름 목록", `enemyTargetPriority.${index}.unitNames`, group.unitNames.join(","), "text")}
          </div>
        `).join("")}
      </div>
      <div class="actions">
        <button onclick="updateEnemyTargetPriority()">우선순위 적용</button>
        <button onclick="resetAdminConfig()">기본값 초기화</button>
      </div>
      <p id="adminMessage" class="message"></p>
    </div>
  `;
}

function renderUnitGradeChanceEditor() {
  const stages = Object.keys(config.unitGradeChancesByStage || {}).map(Number).sort((a, b) => a - b);
  document.getElementById("editor").innerHTML = `
    <div class="panel">
      <h2>유닛 등급 확률</h2>
      <p class="hint">보상방의 새로운 동료와 상점 랜덤 유닛에 적용됩니다. 7스테이지 이후에는 가장 높은 등록 스테이지 확률을 사용합니다.</p>
      <div class="table">
        ${stages.map((stage) => {
          const chances = config.unitGradeChancesByStage[stage];
          const total = [1, 2, 3, 4, 5].reduce((sum, grade) => sum + Number(chances[grade] || 0), 0);
          return `
            <div class="row">
              <strong>${stage}스테이지</strong>
              ${[1, 2, 3, 4, 5].map((grade) => numberOrText(`${grade}성`, `unitGradeChancesByStage.${stage}.${grade}`, chances[grade] || 0)).join("")}
              <p class="message ${total === 100 ? "" : "danger"}">합계: ${total}%${total === 100 ? "" : " - 합계가 100%가 아닙니다."}</p>
            </div>
          `;
        }).join("")}
      </div>
      <div class="actions">
        <button onclick="resetAdminConfig()">기본값 초기화</button>
      </div>
      <p id="adminMessage" class="message"></p>
    </div>
  `;
}

function updateConfigValue(path, value) {
  const keys = path.split(".");
  let target = config;
  while (keys.length > 1) target = target[keys.shift()];
  const key = keys[0];
  if (key === "unitNames") {
    target[key] = value.split(",").map((name) => name.trim()).filter(Boolean);
    saveAdminConfig();
    return;
  }
  target[key] = value === "" || Number.isNaN(Number(value)) ? value : Number(value);
  saveAdminConfig();
}

function updateEnemyTargetPriority() {
  config.enemyTargetPriority = [...config.enemyTargetPriority]
    .map((group) => ({
      priority: Number(group.priority),
      unitNames: Array.isArray(group.unitNames) ? group.unitNames : String(group.unitNames).split(",").map((name) => name.trim()).filter(Boolean)
    }))
    .sort((a, b) => a.priority - b.priority);
  renderEnemyTargetPriorityEditor();
  saveAdminConfig();
}

function saveAdminConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  showMessage("설정이 저장되었습니다.");
}

function resetAdminConfig() {
  localStorage.removeItem(STORAGE_KEY);
  config = clone(defaultConfig);
  renderAdminPanel();
  showMessage("기본 설정으로 초기화되었습니다.");
}

function showMessage(text) {
  const message = document.getElementById("adminMessage");
  if (message) {
    message.textContent = text;
    return;
  }
  let toast = document.getElementById("adminToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "adminToast";
    toast.className = "admin-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function logoutAdmin() {
  sessionStorage.removeItem(SESSION_KEY);
  renderLogin();
}

if (sessionStorage.getItem(SESSION_KEY) === "true") {
  renderAdminPanel();
} else {
  renderLogin();
}

window.checkAdminLogin = checkAdminLogin;
window.renderAdminPanel = renderAdminPanel;
window.renderConfigEditor = renderConfigEditor;
window.renderUnitDataEditor = renderUnitDataEditor;
window.renderItemDataEditor = renderItemDataEditor;
window.renderAbilitySettingsEditor = renderAbilitySettingsEditor;
window.renderEnemyAbilitySettingsEditor = renderEnemyAbilitySettingsEditor;
window.renderEnemyTargetPriorityEditor = renderEnemyTargetPriorityEditor;
window.renderUnitGradeChanceEditor = renderUnitGradeChanceEditor;
window.updateConfigValue = updateConfigValue;
window.updateEnemyTargetPriority = updateEnemyTargetPriority;
window.saveAdminConfig = saveAdminConfig;
window.resetAdminConfig = resetAdminConfig;
window.logoutAdmin = logoutAdmin;
window.setMenu = setMenu;
