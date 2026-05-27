// ==========================================
// 보상 시스템 (reward/reward.js)
// ==========================================

function openRewardRoom(sourceRoomType) {
  gameState.pendingRewardType = sourceRoomType;
  gameState.pendingRewards = generateRewardOptions(sourceRoomType);
  gameState.screen = "reward";
  if (typeof saveGameProgress === "function") saveGameProgress(true);
  render();
}

function generateRewardOptions(sourceRoomType) {
  const rewards = [
    ...Array.from({ length: 3 }, () => generateUnitRewardForRoom(sourceRoomType)),
    ...Array.from({ length: 3 }, () => generateItemRewardForRoom(sourceRoomType)),
    generateHealRewardForRoom(sourceRoomType)
  ];
  const multiplier = sourceRoomType === "boss" ? gameConfig.rewards.bossRewardMultiplier : 1;
  return rewards.map((reward) => applyRewardMultiplier(reward, multiplier));
}

function applyRewardMultiplier(reward, multiplier) {
  if (multiplier <= 1) return reward;
  if (reward.kind === "item") return generateScaledItemReward(reward.item, multiplier);
  return { ...reward, isBossReward: true };
}

function generateUnitRewardForRoom(sourceRoomType) {
  const rewardStage = sourceRoomType === "boss" ? gameState.currentStage + 1 : gameState.currentStage;
  return {
    kind: "unit",
    unit: createRandomUnitByStage(rewardStage),
    isBossReward: sourceRoomType === "boss",
    rewardStage
  };
}

function generateItemRewardForRoom(sourceRoomType) {
  const isBoss = sourceRoomType === "boss";
  const rewardStage = isBoss ? gameState.currentStage + 1 : gameState.currentStage;
  const chances = getItemTierChances(rewardStage, isBoss ? "boss" : "normal");
  const total = Object.values(chances || {1:100}).reduce((sum, value) => sum + Number(value), 0);
  let roll = Math.random() * (total || 100);
  let selectedTier = 1;
  for (const [tier, chance] of Object.entries(chances || {1:100})) {
    roll -= Number(chance);
    if (roll <= 0) {
      selectedTier = Number(tier);
      break;
    }
  }
  const candidates = itemData.filter(item => (item.tier || 1) === selectedTier);
  const selectedItem = candidates.length > 0 ? randomFrom(candidates) : randomFrom(itemData);
  return { kind: "item", item: selectedItem, isBossReward: isBoss };
}

function generateHealRewardForRoom(sourceRoomType) {
  const percent = sourceRoomType === "boss"
    ? gameConfig.rewards.bossHealMissingHpPercent
    : gameConfig.rewards.battleHealMissingHpPercent;
  return {
    kind: "heal",
    name: randomFrom(["야전 치료", "응급 처치", "치유의 샘"]),
    percent,
    isBossReward: sourceRoomType === "boss"
  };
}

function enrichItemWithBonuses(item, multiplier = 1) {
  const scaledItem = { ...item };
  const c = gameConfig.items;
  const k = item.key;
  
  if (["attack_banner", "warrior_sword", "gladiator_glove", "tyrant_sword", "hunter_mark"].includes(k)) {
    const fallback = { attack_banner: c.attackBannerBonus, warrior_sword: c.warriorSwordAttackBonus, gladiator_glove: c.gladiatorGloveAttackBonus, tyrant_sword: c.tyrantSwordAttackBonus, hunter_mark: c.hunterMarkAttackBonus }[k];
    scaledItem.attackBonus = Number(item.attackBonus ?? fallback) * multiplier;
    scaledItem.text = `필드 유닛 전체 공격력 +${Math.round(scaledItem.attackBonus * 100)}%`;
  }
  else if (["life_charm", "giant_belt", "wooden_shield", "titan_armor", "dragon_heart"].includes(k)) {
    const fallback = { life_charm: c.lifeCharmBonus, giant_belt: c.giantBeltHpBonus, wooden_shield: c.woodenShieldHpBonus, titan_armor: c.titanArmorHpBonus, dragon_heart: c.dragonHeartHpBonus }[k];
    scaledItem.hpBonus = Number(item.hpBonus ?? fallback) * multiplier;
    scaledItem.text = `필드 유닛 전체 HP +${Math.round(scaledItem.hpBonus * 100)}%`;
  }
  else if (["guardian_emblem", "knight_banner", "steel_breastplate", "thorn_armor", "goddess_shield"].includes(k)) {
    const fallback = { guardian_emblem: c.guardianEmblemDefenseBonus, knight_banner: c.knightBannerDefenseBonus, steel_breastplate: c.steelBreastplateDefenseBonus, thorn_armor: c.thornArmorDefenseBonus, goddess_shield: c.goddessShieldDefenseBonus }[k];
    scaledItem.defenseBonus = Number(item.defenseBonus ?? item.value ?? fallback) * multiplier;
    scaledItem.text = `모든 필드 유닛의 방어력 +${Math.round(scaledItem.defenseBonus * 100)}%`;
    scaledItem.category = "defense";
    scaledItem.effectType = "defensePercent";
    scaledItem.value = scaledItem.defenseBonus;
  }
  else if (["iron_shield", "warrior_helm", "imperial_helm", "blessed_helm"].includes(k)) {
    const fallback = { iron_shield: c.ironShieldDefenseFlat, warrior_helm: c.warriorHelmDefenseFlat, imperial_helm: c.imperialHelmDefenseFlat, blessed_helm: c.blessedHelmDefenseFlat }[k];
    scaledItem.defenseFlatBonus = Math.max(1, Math.round(Number(item.defenseFlatBonus ?? item.value ?? fallback) * multiplier));
    scaledItem.text = `모든 필드 유닛의 방어력 +${scaledItem.defenseFlatBonus}`;
    scaledItem.category = "defense";
    scaledItem.effectType = "defenseFlat";
    scaledItem.value = scaledItem.defenseFlatBonus;
  }
  else if (["tactics_book", "wind_boots", "swift_dagger", "phantom_dancer", "storm_bow"].includes(k)) {
    const fallback = { tactics_book: (typeof getConfiguredAttackSpeedBonusPercent === "function") ? getConfiguredAttackSpeedBonusPercent() : c.tacticsBookSpeedBonus, wind_boots: getLegacyAttackSpeedBonusPercent(c.windBootsSpeedBonus), swift_dagger: getLegacyAttackSpeedBonusPercent(c.swiftDaggerSpeedBonus), phantom_dancer: getLegacyAttackSpeedBonusPercent(c.phantomDancerSpeedBonus), storm_bow: getLegacyAttackSpeedBonusPercent(c.stormBowSpeedBonus) }[k];
    scaledItem.attackSpeedBonusPercent = Number(item.attackSpeedBonusPercent ?? fallback) * multiplier;
    scaledItem.text = `다음 전투 공격 속도 +${Math.round(scaledItem.attackSpeedBonusPercent)}%`;
  }
  else if (["paladin_armor", "radiant_shield", "sunfire_cape"].includes(k)) {
    const defFallback = { paladin_armor: c.paladinArmorDefenseBonus, radiant_shield: c.radiantShieldDefenseBonus, sunfire_cape: c.sunfireCapeDefenseBonus }[k];
    const hpFallback = { paladin_armor: c.paladinArmorHpBonus, radiant_shield: c.radiantShieldHpBonus, sunfire_cape: c.sunfireCapeHpBonus }[k];
    scaledItem.defenseBonus = Number(item.defenseBonus ?? defFallback) * multiplier;
    scaledItem.hpBonus = Number(item.hpBonus ?? hpFallback) * multiplier;
    scaledItem.text = `모든 필드 방어력 +${Math.round(scaledItem.defenseBonus * 100)}%, HP +${Math.round(scaledItem.hpBonus * 100)}%`;
  }
  else if (["assassin_ring", "hextech_dagger"].includes(k)) {
    const atkFallback = { assassin_ring: c.assassinRingAttackBonus, hextech_dagger: c.hextechDaggerAttackBonus }[k];
    const spdFallback = { assassin_ring: getLegacyAttackSpeedBonusPercent(c.assassinRingSpeedBonus), hextech_dagger: getLegacyAttackSpeedBonusPercent(c.hextechDaggerSpeedBonus) }[k];
    scaledItem.attackBonus = Number(item.attackBonus ?? atkFallback) * multiplier;
    scaledItem.attackSpeedBonusPercent = Number(item.attackSpeedBonusPercent ?? spdFallback) * multiplier;
    scaledItem.text = `모든 필드 공격력 +${Math.round(scaledItem.attackBonus * 100)}%, 공격 속도 +${Math.round(scaledItem.attackSpeedBonusPercent)}%`;
  }
  else if (k === "trinity_force") {
    scaledItem.attackBonus = Number(item.attackBonus ?? c.trinityForceAttackBonus) * multiplier;
    scaledItem.attackSpeedBonusPercent = Number(item.attackSpeedBonusPercent ?? getLegacyAttackSpeedBonusPercent(c.trinityForceSpeedBonus)) * multiplier;
    scaledItem.critChance = Number(item.critChance ?? c.trinityForceCritChance) * multiplier;
    scaledItem.text = `모든 필드 공격력 +${Math.round(scaledItem.attackBonus * 100)}%, 공격 속도 +${Math.round(scaledItem.attackSpeedBonusPercent)}%, 치명타 확률 +${Math.round(scaledItem.critChance * 100)}%`;
  }
  else if (k.startsWith("cloak_")) {
    const fallback = {1: c.damageReductionT1, 2: c.damageReductionT2, 3: c.damageReductionT3, 4: c.damageReductionT4, 5: c.damageReductionT5}[item.tier] || 0;
    scaledItem.damageReduction = Number(item.damageReduction ?? fallback) * multiplier;
    scaledItem.text = `받는 피해 ${Math.round(scaledItem.damageReduction * 100)}% 감소`;
  }
  else if (k.startsWith("pendant_")) {
    const fallback = {1: c.healBonusT1, 2: c.healBonusT2, 3: c.healBonusT3, 4: c.healBonusT4, 5: c.healBonusT5}[item.tier] || 0;
    scaledItem.healBonus = Number(item.healBonus ?? fallback) * multiplier;
    scaledItem.text = `모든 회복량 ${Math.round(scaledItem.healBonus * 100)}% 증가`;
  }
  else if (k.startsWith("dagger_")) {
    const fallback = {1: c.critChanceT1, 2: c.critChanceT2, 3: c.critChanceT3, 4: c.critChanceT4, 5: c.critChanceT5}[item.tier] || 0;
    scaledItem.critChance = Number(item.critChance ?? fallback) * multiplier;
    scaledItem.text = `치명타 확률 ${Math.round(scaledItem.critChance * 100)}% 증가`;
  }
  else if (k.startsWith("axe_")) {
    const fallback = {1: c.critDamageT1, 2: c.critDamageT2, 3: c.critDamageT3, 4: c.critDamageT4, 5: c.critDamageT5}[item.tier] || 0;
    scaledItem.critDamage = Number(item.critDamage ?? fallback) * multiplier;
    scaledItem.text = `치명타 피해 ${Math.round(scaledItem.critDamage * 100)}% 증가`;
  }
  else if (k.startsWith("scythe_")) {
    const fallback = {1: c.lifestealT1, 2: c.lifestealT2, 3: c.lifestealT3, 4: c.lifestealT4, 5: c.lifestealT5}[item.tier] || 0;
    scaledItem.lifesteal = Number(item.lifesteal ?? fallback) * multiplier;
    scaledItem.text = `생명력 흡수 ${Math.round(scaledItem.lifesteal * 100)}% 증가`;
  }
  return scaledItem;
}

function generateScaledItemReward(item, multiplier) {
  const scaledItem = enrichItemWithBonuses(item, multiplier);
  return { kind: "item", item: scaledItem, isBossReward: true };
}

function renderReward() {
  renderRewardRoom();
}

function renderRewardRoom() {
  const screen = document.getElementById("screen");
  const source = gameState.pendingRewardType === "boss" ? "보스방" : "전투방";
  const groups = groupRewardsByType(gameState.pendingRewards);
  const bossNotice = gameState.pendingRewardType === "boss"
    ? `<p class="hint">보스 클리어 보상: 일반 보상보다 ${gameConfig.rewards.bossRewardMultiplier}배 강화됩니다.</p>`
    : "";
  screen.innerHTML = `
    <section class="panel">
      ${renderRewardRoomHeader(source)}
      ${bossNotice}
      ${Object.entries(groups).map(([type, rewards]) => `
        <section class="choice-section">
          <h3>${getRewardSectionTitle(type)}</h3>
          <p class="hint">${getRewardSectionDescription(type)}</p>
          <div class="reward-grid">
            ${rewards.map(({ reward, index }) => rewardCard(reward, index)).join("")}
          </div>
        </section>
      `).join("")}
      <p class="message">${gameState.message}</p>
    </section>
    ${gameState.isSquadPreviewOpen ? renderSquadPreview() : ""}
  `;
}

function renderRewardRoomHeader(source) {
  return `
    <div class="reward-room-header">
      <div>
        <h2>보상</h2>
        <p class="hint">${source} 승리 보상 중 하나를 선택하세요.</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="openBattleStatsModal()" style="border-color: var(--blue); color: var(--blue); background: rgba(127,167,217,0.1);">전투 통계</button>
        <button onclick="openSquadPreviewModal()">부대 관리</button>
      </div>
    </div>
  `;
}

function openSquadPreviewModal() {
  gameState.isSquadPreviewOpen = true;
  renderRewardRoom();
}

function closeSquadPreviewModal() {
  gameState.isSquadPreviewOpen = false;
  renderRewardRoom();
}

function renderSquadPreview() {
  const waitingUnits = getBenchUnits();
  const fieldSlots = Array.from({ length: gameState.maxFieldUnits }, (_, index) => {
    const unitId = gameState.fieldUnits[index];
    const unit = gameState.ownedUnits.find((entry) => entry.id === unitId);
    return unit
      ? unitCard(unit, `class="card field-card slot filled" data-final-stats="true"`)
      : `<div class="slot empty empty-field-slot">빈 슬롯</div>`;
  });

  return `
    <div class="modal-backdrop">
      <section class="panel squad-preview-modal">
        <div class="modal-header">
          <h2>현재 부대</h2>
          <button onclick="closeSquadPreviewModal()">닫기</button>
        </div>
        <section class="choice-section">
          <h3>필드 유닛</h3>
          <div class="squad-preview-field">${fieldSlots.join("")}</div>
        </section>
        <section class="choice-section">
          <h3>보유 카드 목록</h3>
          <div class="squad-preview-owned">
            ${waitingUnits.length ? waitingUnits.map((unit) => unitCard(unit, `data-final-stats="true"`)).join("") : `<div class="slot empty">대기 중인 카드 없음</div>`}
          </div>
        </section>
      </section>
    </div>
  `;
}

function groupRewardsByType(rewards) {
  const groups = {};
  rewards.forEach((reward, index) => {
    if (reward.kind === "gold") return;
    if (!groups[reward.kind]) groups[reward.kind] = [];
    groups[reward.kind].push({ reward, index });
  });
  return groups;
}

function getRewardSectionTitle(type) {
  return {
    unit: "새로운 동료",
    item: "전리품",
    heal: "치유"
  }[type] || "보상";
}

function getRewardSectionDescription(type) {
  const rewardStage = gameState.pendingRewardType === "boss" ? gameState.currentStage + 1 : gameState.currentStage;
  return {
    unit: `현재 스테이지에 따라 높은 등급 유닛이 등장할 수 있습니다.${gameState.pendingRewardType === "boss" ? "<br>새로운 동료 등급 확률은 다음 스테이지 기준으로 적용됩니다." : ""}`,
    item: `부대를 강화할 아이템을 선택합니다.`,
    heal: "생존한 유닛들의 잃은 체력을 일부 회복합니다."
  }[type] || "";
}

function registerAcquiredItem(item) {
  if (!item) return;
  gameState.inventoryItems.push({
    key: item.key,
    name: item.name,
    text: item.text,
    tier: item.tier || 1,
    category: item.category || getItemCategory(item.key),
    acquiredAt: Date.now()
  });
}

function addBonusSource(type, item, value, valueType = type) {
  if (!gameState.bonusSources[type]) gameState.bonusSources[type] = [];
  gameState.bonusSources[type].push({ name: item.name, value, valueType });
}

function applyItemEffect(item) {
  if (!item) return;
  registerAcquiredItem(item);
  
  const enriched = enrichItemWithBonuses(item, 1);
  
  if (enriched.attackBonus) {
    gameState.bonuses.attack += enriched.attackBonus;
    addBonusSource("attack", item, enriched.attackBonus);
  }
  if (enriched.hpBonus) {
    gameState.bonuses.hp += enriched.hpBonus;
    addBonusSource("hp", item, enriched.hpBonus);
  }
  if (enriched.defenseBonus) {
    gameState.bonuses.defense += enriched.defenseBonus;
    addBonusSource("defense", item, enriched.defenseBonus);
  }
  if (enriched.defenseFlatBonus) {
    gameState.bonuses.defenseFlat += enriched.defenseFlatBonus;
    addBonusSource("defense", item, enriched.defenseFlatBonus, "defenseFlat");
  }

  if (enriched.attackSpeedBonusPercent) {
    gameState.bonuses.attackSpeedBonusPercent += enriched.attackSpeedBonusPercent;
    addBonusSource("attackSpeed", item, enriched.attackSpeedBonusPercent);
  }
  if (enriched.critChance) {
    gameState.bonuses.critChance += enriched.critChance;
    addBonusSource("critChance", item, enriched.critChance);
  }
  if (enriched.damageReduction) {
    gameState.bonuses.damageReduction += enriched.damageReduction;
    addBonusSource("damageReduction", item, enriched.damageReduction);
  }
  if (enriched.healBonus) {
    gameState.bonuses.healBonus += enriched.healBonus;
    addBonusSource("healBonus", item, enriched.healBonus);
  }
  if (enriched.critDamage) {
    gameState.bonuses.critDamage += enriched.critDamage;
    addBonusSource("critDamage", item, enriched.critDamage);
  }
  if (enriched.lifesteal) {
    gameState.bonuses.lifesteal += enriched.lifesteal;
    addBonusSource("lifesteal", item, enriched.lifesteal);
  }
  
  if (typeof item.effect === "function") item.effect();

  // 직업 문장을 획득했을 경우 즉시 시너지 효과 갱신
  if (item.key && item.key.startsWith("emblem_") && typeof window.updateSynergies === "function") {
    window.updateSynergies();
  }
}

function rewardCard(reward, index) {
  const bossTag = reward.isBossReward ? `<div style="margin-bottom: 4px;"><span class="pill">보스 보상</span></div>` : "";
  if (reward.kind === "gold") return "";

  const keyHint = `<span style="display:inline-block; margin-right:6px; padding:2px 6px; background:rgba(255,255,255,0.2); border-radius:4px; font-size:12px; color:#fff; vertical-align:middle;">${index + 1}</span>`;

  if (reward.kind === "item") {
    const tier = reward.item.tier || 1;
    const tierName = { 1: "[일반]", 2: "[고급]", 3: "[희귀]", 4: "[전설]", 5: "[신화]" }[tier] || "[일반]";
    const tierColor = { 1: "var(--muted)", 2: "var(--green)", 3: "var(--blue)", 4: "var(--red)", 5: "var(--gold)" }[tier] || "inherit";
    return `
      <button class="choice-card tier-${tier}" onclick="claimReward(${index})" style="text-align:left;">
        ${bossTag}
        <strong style="color:${tierColor};">${keyHint}${tierName} ${reward.item.name}</strong>
        <span style="color:var(--text);">${reward.item.text}</span>
      </button>
    `;
  }
  if (reward.kind === "heal") {
    return `
      <button class="choice-card" onclick="claimReward(${index})" style="text-align:left;">
        ${bossTag}
        <strong>${keyHint}${reward.name}</strong>
        <span>모든 생존 유닛이 잃은 체력 ${Math.round(reward.percent * 100)}% 회복</span>
      </button>
    `;
  }
  const stats = getUnitStats(reward.unit);
  const ability = getUnitAbility(reward.unit);
  
  const gradeClass = `grade-${reward.unit.grade || 1}`;
  
  return `
    <button class="choice-card unit-tooltip-container ${gradeClass}" onclick="claimReward(${index})" style="text-align:left; position:relative;" data-type-key="${reward.unit.typeKey}">
      ${bossTag}
      <strong>${keyHint}${reward.unit.name} ${stars(reward.unit.grade)}</strong>
      <span>HP ${stats.maxHp} / 공격력 ${stats.atk} / 방어력 ${stats.defense} / 속도 ${formatAttackSpeedValue(stats.attackSpeed ?? stats.speed)}</span>
      <div class="unit-tooltip">
        <strong>스킬: ${ability.skill.name}</strong>
        <p>${ability.skill.description}</p>
        <strong>특성: ${ability.trait.name}</strong>
        <p>${ability.trait.description}</p>
        ${renderUnitStatBreakdown(reward.unit, false)}
      </div>
    </button>
  `;
}

function claimReward(rewardId) {
  if (gameState.isProcessingAction) return;
  const reward = gameState.pendingRewards[rewardId];
  if (!reward) return;
  
  gameState.isProcessingAction = true;
  playActionSound();
  
  const rewardGrid = document.querySelector(".reward-grid");
  if (rewardGrid && rewardGrid.children[rewardId]) {
    rewardGrid.children[rewardId].classList.add("buy-anim");
    renderInventoryPanel();
  }

  setTimeout(() => {
    gameState.isProcessingAction = false;
    if (reward.kind === "item") {
      applyItemEffect(reward.item);
      addLog(`${reward.item.name} 획득: ${reward.item.text}`);
    }
    if (reward.kind === "unit") {
      gameState.ownedUnits.push(reward.unit);
      addLog(`${reward.unit.name} ${stars(reward.unit.grade)} 획득`);
    }
    if (reward.kind === "gold") {
      gameState.gold += reward.amount;
      addLog(`골드 ${reward.amount} 획득`);
    }
    if (reward.kind === "heal") {
      const healed = healMissingHpPercent(reward.percent);
      addLog(`${reward.name}: 총 ${healed} 회복`);
    }
    checkAndMergeUnits();
    gameState.pendingRewards = [];
    if (gameState.pendingRewardType === "boss") {
      goToNextStage();
      if (typeof saveGameProgress === "function") saveGameProgress(true);
      return;
    }
    const node = getCurrentNode();
    gameState.availableNodeIds = node ? node.nextIds : [];
    gameState.pendingRewardType = "";
    gameState.screen = "dungeon";
    if (typeof saveGameProgress === "function") saveGameProgress(true);
    render();
  }, 250);
}

function chooseReward(index) {
  claimReward(index);
}
