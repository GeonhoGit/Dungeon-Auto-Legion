// ==========================================
// 프리미엄 상점 및 영구 강화 시스템 (systems/gemSystem.js)
// ==========================================

function upgradeShopProbability() {
  const cost = 3;
  if (gameState.gems < cost) {
    setMessage("보석이 부족합니다.");
    return;
  }
  if ((gameState.shopUpgradeLevel || 0) >= 10) {
    setMessage("이미 상점 확률이 최대치에 도달했습니다.");
    return;
  }
  
  gameState.gems -= cost;
  gameState.shopUpgradeLevel = (gameState.shopUpgradeLevel || 0) + 1;
  
  // 새로고침 효과를 주어 바뀐 확률을 즉시 적용
  gameState.shopUnits = [
    generateShopRandomUnit(),
    generateShopRandomUnit(),
    generateShopRandomUnit()
  ];
  gameState.shopItems = [
    generateShopRandomItem(),
    generateShopRandomItem(),
    generateShopRandomItem()
  ];
  
  addLog(`상점 확률 영구 강화! (Lv.${gameState.shopUpgradeLevel})`);
  setMessage(`상점 용병 및 장비 등장 확률이 영구적으로 강화되었습니다!`);
  if (typeof saveMetaProgress === "function") saveMetaProgress();
  render();
}

function buyPremiumUnit() {
  if (gameState.gems < 2) {
    setMessage("보석이 부족합니다.");
    return;
  }
  gameState.gems -= 2;
  playActionSound();
  
  // 4성 80%, 5성 20% 확률로 등장
  const grade = Math.random() < 0.8 ? 4 : 5;
  const unit = randomUnit(grade);
  
  gameState.ownedUnits.push(unit);
  addLog(`프리미엄 뽑기로 ${unit.name} ${stars(unit.grade)} 획득!`);
  setMessage(`프리미엄 뽑기 성공! ${unit.name} ${stars(unit.grade)} 합류!`);
  
  checkAndMergeUnits();
  if (typeof saveMetaProgress === "function") saveMetaProgress();
  render();
}

function buyPremiumItem() {
  if (gameState.gems < 3) {
    setMessage("보석이 부족합니다.");
    return;
  }
  gameState.gems -= 3;
  playActionSound();
  
  // 4티어 80%, 5티어 20% 확률로 등장
  const tier = Math.random() < 0.8 ? 4 : 5;
  const candidates = itemData.filter(item => (item.tier || 1) === tier);
  const selectedItem = candidates.length > 0 ? randomFrom(candidates) : randomFrom(itemData);
  
  applyItemEffect(selectedItem);
  addLog(`프리미엄 뽑기로 ${selectedItem.name} 획득: ${selectedItem.text}`);
  setMessage(`프리미엄 장비 뽑기 성공! ${selectedItem.name} 획득!`);
  
  if (typeof saveMetaProgress === "function") saveMetaProgress();
  render();
}

function buyPremiumEmblem() {
  if (gameState.gems < 3) {
    setMessage("보석이 부족합니다.");
    return;
  }
  gameState.gems -= 3;
  playActionSound();
  
  const emblemKeys = ["warrior", "archer", "mage", "guardian", "rogue", "healer", "necromancer", "bard", "witch"];
  const selectedKey = randomFrom(emblemKeys);
  const emblemItems = itemData.filter(item => item.key.startsWith("emblem_"));
  const selectedItem = emblemItems.find(item => item.key === `emblem_${selectedKey}`);
  
  if (selectedItem) {
    applyItemEffect(selectedItem);
    addLog(`프리미엄 상점에서 ${selectedItem.name} 획득`);
    setMessage(`직업 문장 제작 성공! ${selectedItem.name} 획득!`);
  }
  
  if (typeof window.updateSynergies === "function") window.updateSynergies();
  if (typeof saveMetaProgress === "function") saveMetaProgress();
  render();
}

function openUpgradeModal() {
  gameState.isUpgradeModalOpen = true;
  render();
}

function closeUpgradeModal() {
  gameState.isUpgradeModalOpen = false;
  render();
}

function initUpgradeLevels() {
  if (!gameState.upgradeLevels) {
    gameState.upgradeLevels = { fieldLimit: 0, heroBlessing: 0, commanderAura: 0, goldBonus: 0, recombChance: 0, critDamage: 0, critChance: 0 };
  } else {
    if (gameState.upgradeLevels.goldBonus === undefined) gameState.upgradeLevels.goldBonus = 0;
    if (gameState.upgradeLevels.recombChance === undefined) gameState.upgradeLevels.recombChance = 0;
    if (gameState.upgradeLevels.critDamage === undefined) gameState.upgradeLevels.critDamage = 0;
    if (gameState.upgradeLevels.critChance === undefined) gameState.upgradeLevels.critChance = 0;
  }
}

function renderUpgradeModal() {
  initUpgradeLevels();
  const shopLvl = gameState.shopUpgradeLevel || 0;
  const fieldLvl = gameState.upgradeLevels.fieldLimit || 0;
  const heroLvl = gameState.upgradeLevels.heroBlessing || 0;
  const cmdLvl = gameState.upgradeLevels.commanderAura || 0;
  const goldLvl = gameState.upgradeLevels.goldBonus || 0;
  const recombLvl = gameState.upgradeLevels.recombChance || 0;
  const critLvl = gameState.upgradeLevels.critDamage || 0;
  const critChanceLvl = gameState.upgradeLevels.critChance || 0;

  const renderOpt = (title, desc, cost, cur, max, action) => {
    const isMax = cur >= max;
    const canBuy = gameState.gems >= cost;
    if (isMax) {
      return `<button class="choice-card cannot-afford" disabled style="border-color: rgba(179, 102, 255, 0.4); background: rgba(179, 102, 255, 0.05);"><strong style="color: var(--gem);">${title}</strong><span>최대 레벨에 도달했습니다.</span><em class="price" style="color:var(--muted);">Lv.MAX</em></button>`;
    }
    return `<button class="choice-card ${canBuy ? "" : "cannot-afford"}" onclick="${action}" ${canBuy ? "" : "disabled"} style="border-color: rgba(179, 102, 255, 0.4); background: rgba(179, 102, 255, 0.05);"><strong style="color: var(--gem);">${title} (Lv.${cur})</strong><span>${desc}</span><em class="price" style="color: var(--gem);">${cost} 보석</em></button>`;
  };

  return `
    <div class="modal-backdrop" onclick="closeUpgradeModal()">
      <section class="panel squad-preview-modal" style="max-width: 680px;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2 style="color: var(--gem);">영구 강화 제단</h2>
          <button onclick="closeUpgradeModal()">닫기</button>
        </div>
        <p class="hint" style="margin-top: 0; margin-bottom: 16px;">보석을 소모하여 이번 탐험 내내 유지되는 강력한 능력을 얻습니다.</p>
        <div class="inventory-row" style="background: rgba(179,102,255,0.1); border: 1px solid var(--gem); margin-bottom: 20px;">
          <span style="color: #e5a4ff;">보유 보석</span>
          <strong style="color: var(--gem); font-size: 1.2em;">${gameState.gems} 개</strong>
        </div>
        
        <div class="choice-section" style="margin-top: 0; padding-top: 0; border: none;">
          <div class="shop-grid">
            ${renderOpt("부대 한계 돌파", "최대 필드 배치 한도(상한선)를 1칸 늘립니다.", 5, fieldLvl, 5, "buyPermanentUpgrade('fieldLimit')")}
            ${renderOpt("상점 확률 강화", "고등급 용병 및 장비 등장 확률을 영구적으로 2% 증가시킵니다.", 3, shopLvl, 10, "upgradeShopProbability()")}
            ${renderOpt("전장의 지휘관", "모든 유닛의 방어력이 5%, 피해 감소가 2% 증가합니다.", 3, cmdLvl, 5, "buyPermanentUpgrade('commanderAura')")}
            ${renderOpt("영웅의 축복", "모든 유닛의 공격력과 최대 체력이 2% 증가합니다.", 2, heroLvl, 10, "buyPermanentUpgrade('heroBlessing')")}
            ${renderOpt("재물 획득", "전투 승리 시 획득하는 골드가 5% 증가합니다.", 2, goldLvl, 10, "buyPermanentUpgrade('goldBonus')")}
            ${renderOpt("재조합 명인", "재조합 시 상위 등급이 등장할 대성공 확률이 1% 증가합니다.", 2, recombLvl, 10, "buyPermanentUpgrade('recombChance')")}
            ${renderOpt("치명적인 일격", "모든 유닛의 치명타 피해가 1% 증가합니다.", 1, critLvl, 10, "buyPermanentUpgrade('critDamage')")}
            ${renderOpt("정밀한 타격", "모든 유닛의 치명타 확률이 1% 증가합니다.", 1, critChanceLvl, 10, "buyPermanentUpgrade('critChance')")}
            
            <button class="choice-card ${gameState.gems >= 1 ? "" : "cannot-afford"}" onclick="buyGoldWithGems()" style="border-color: rgba(230, 184, 92, 0.4); background: rgba(230, 184, 92, 0.05);">
              <strong style="color: var(--gold);">황금 교환</strong>
              <span>보석을 소모해 30 골드를 즉시 획득합니다.</span>
              <em class="price" style="color: var(--gem);">1 보석</em>
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
}

// 영구 강화 데이터 구조화
const PERMANENT_UPGRADES = {
  fieldLimit: { cost: 5, max: 5, title: "부대 한계 돌파", apply: () => { gameState.maxFieldUnitLimit++; return `최대 슬롯 한도가 ${gameState.maxFieldUnitLimit}이 되었습니다.`; } },
  heroBlessing: { cost: 2, max: 10, title: "영웅의 축복", apply: () => { gameState.bonuses.attack += 0.02; gameState.bonuses.hp += 0.02; addBonusSource("attack", {name: "영웅의 축복 (영구 강화)"}, 0.02); addBonusSource("hp", {name: "영웅의 축복 (영구 강화)"}, 0.02); return "부대 공격력과 체력이 2% 증가했습니다."; } },
  commanderAura: { cost: 3, max: 5, title: "전장의 지휘관", apply: () => { gameState.bonuses.defense += 0.05; gameState.bonuses.damageReduction += 0.02; addBonusSource("defense", {name: "전장의 지휘관 (영구 강화)"}, 0.05); addBonusSource("damageReduction", {name: "전장의 지휘관 (영구 강화)"}, 0.02); return "부대 방어력 5%, 피해 감소 2% 증가했습니다."; } },
  goldBonus: { cost: 2, max: 10, title: "재물 획득", apply: (lvl) => `전투 보상 골드가 ${lvl * 5}% 증가합니다.` },
  recombChance: { cost: 2, max: 10, title: "재조합 명인", apply: (lvl) => `대성공 확률이 ${lvl}% 증가했습니다.` },
  critDamage: { cost: 1, max: 10, title: "치명적인 일격", apply: () => { gameState.bonuses.critDamage += 0.01; addBonusSource("critDamage", {name: "치명적인 일격 (영구 강화)"}, 0.01); return "치명타 피해가 1% 증가했습니다."; } },
  critChance: { cost: 1, max: 10, title: "정밀한 타격", apply: () => { gameState.bonuses.critChance += 0.01; addBonusSource("critChance", {name: "정밀한 타격 (영구 강화)"}, 0.01); return "치명타 확률이 1% 증가했습니다."; } }
};

// 단일화된 공통 영구 강화 처리 함수
function buyPermanentUpgrade(key) {
  initUpgradeLevels();
  const upgrade = PERMANENT_UPGRADES[key];
  if (!upgrade) return;
  
  if (gameState.gems < upgrade.cost) {
    setMessage("보석이 부족합니다.");
    return;
  }
  if (gameState.upgradeLevels[key] >= upgrade.max) {
    setMessage("최대 레벨입니다.");
    return;
  }
  
  gameState.gems -= upgrade.cost;
  gameState.upgradeLevels[key]++;
  
  // 각각 고유의 효과 실행 및 메시지 획득
  const resultMessage = upgrade.apply(gameState.upgradeLevels[key]);
  
  addLog(`[영구 강화] ${upgrade.title}! ${resultMessage}`);
  if (typeof saveMetaProgress === "function") saveMetaProgress();
  render();
}

function buyGoldWithGems() { 
  if (gameState.gems < 1) { 
    setMessage("보석이 부족합니다."); 
    return; 
  } 
  gameState.gems -= 1; 
  gameState.gold += 30; 
  addLog(`[영구 강화] 황금 교환! 보석 1개를 30 골드로 교환했습니다.`); 
  if (typeof saveMetaProgress === "function") saveMetaProgress();
  render(); 
}

// 새 게임 시작 시 영구 강화 효과를 보너스 스탯에 재적용하는 함수
function applyAllPermanentUpgrades() {
  if (!gameState.upgradeLevels) return;
  const levels = gameState.upgradeLevels;
  
  if (levels.fieldLimit > 0) {
    gameState.maxFieldUnitLimit += levels.fieldLimit;
  }
  if (levels.heroBlessing > 0) {
    const bonus = levels.heroBlessing * 0.02;
    gameState.bonuses.attack += bonus;
    gameState.bonuses.hp += bonus;
    addBonusSource("attack", {name: "영웅의 축복 (영구 강화)"}, bonus);
    addBonusSource("hp", {name: "영웅의 축복 (영구 강화)"}, bonus);
  }
  if (levels.commanderAura > 0) {
    const defBonus = levels.commanderAura * 0.05;
    const drBonus = levels.commanderAura * 0.02;
    gameState.bonuses.defense += defBonus;
    gameState.bonuses.damageReduction += drBonus;
    addBonusSource("defense", {name: "전장의 지휘관 (영구 강화)"}, defBonus);
    addBonusSource("damageReduction", {name: "전장의 지휘관 (영구 강화)"}, drBonus);
  }
  if (levels.critDamage > 0) {
    const bonus = levels.critDamage * 0.01;
    gameState.bonuses.critDamage += bonus;
    addBonusSource("critDamage", {name: "치명적인 일격 (영구 강화)"}, bonus);
  }
  if (levels.critChance > 0) {
    const bonus = levels.critChance * 0.01;
    gameState.bonuses.critChance += bonus;
    addBonusSource("critChance", {name: "정밀한 타격 (영구 강화)"}, bonus);
  }
}
