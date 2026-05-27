// ==========================================
// 부대 관리 및 유닛 배치 (squad/squad.js)
// ==========================================

function managementLayout() {
  const aliveFieldCount = getAliveFieldUnits().length;
  return `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
      <button onclick="openInventoryModal()" style="margin-right: 8px; background: #9d81ba; border-color: #5d4b7a; color: #111;">보유 아이템</button>
      <button onclick="openSynergyModal()" style="margin-right: 8px; background: var(--blue); border-color: #5a7da3; color: #111;">시너지 도감</button>
      <button onclick="openRecombinationModal()">재조합 (동급 카드 합성)</button>
    </div>
    <div class="split">
      <div>
        <h3>보유 카드 목록</h3>
        <div id="ownedUnits" class="owned-unit-grid"></div>
      </div>
      <div>
        <h3>전투 필드 <small style="font-size:0.8em; color:var(--muted); font-weight:normal;">(${aliveFieldCount} / ${gameState.maxFieldUnits})</small></h3>
        <div id="fieldUnits" class="field-grid"></div>
      </div>
    </div>
    ${gameState.isRecombinationModalOpen ? renderRecombinationModal() : ""}
  `;
}

function getBenchUnits() {
  const fieldUnitIds = new Set(gameState.fieldUnits);
  return gameState.ownedUnits.filter((unit) => !fieldUnitIds.has(unit.id) && (unit.currentHp ?? unit.maxHp) > 0);
}

function getUnitCategoryIcon(typeKey) {
  return "";
}

function groupUnitsByJob(units) {
  const usedIds = new Set();
  const groups = unitTypes.map((type) => {
    const matchedUnits = units.filter((unit) => unit.typeKey === type.key || unit.name === type.name);
    matchedUnits.forEach((unit) => usedIds.add(unit.id));
    return {
      key: type.key,
      title: type.name,
      icon: getUnitCategoryIcon(type.key),
      units: matchedUnits
    };
    });

  const unknownUnits = units.filter((unit) => !usedIds.has(unit.id));
  if (unknownUnits.length > 0) {
    groups.push({
      key: "unknown",
      title: "기타",
      icon: "",
      units: unknownUnits
    });
  }

  const activeGroups = groups.filter(g => g.units.length > 0);
  const emptyGroups = groups.filter(g => g.units.length === 0);

  return [...activeGroups, ...emptyGroups];
}

function renderOwnedUnitCategories(units) {
  return `
    <div class="owned-category-list">
      ${groupUnitsByJob(units).map((group) => {
        const canSlide = group.units.length > 3;
        return `
          <section class="owned-category owned-category-${group.key}">
            <div class="owned-category-header">
              <div>
                <h4><span>${group.icon}</span> ${group.title}</h4>
                <p class="hint">카드 크기는 유지하고 3장씩 슬라이드로 확인합니다.</p>
              </div>
              <div class="owned-category-tools">
                <span class="pill">${group.units.length}장</span>
                <button class="slide-button" onclick="scrollOwnedCategory('${group.key}', -1)" ${canSlide ? "" : "disabled"}>‹</button>
                <button class="slide-button" onclick="scrollOwnedCategory('${group.key}', 1)" ${canSlide ? "" : "disabled"}>›</button>
              </div>
            </div>
            <div class="owned-category-slider">
              <div id="ownedSlider-${group.key}" class="owned-category-track">
                  ${group.units.length > 0 
                    ? group.units.map((unit) => `<div class="owned-slide-card">${unitCard(unit, `onclick="deployUnitToField(${unit.id})"`)}</div>`).join("")
                    : `<div class="slot empty" style="width: 100%; min-height: 100px; opacity: 0.5;">대기 중인 카드가 없습니다.</div>`
                  }
              </div>
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function scrollOwnedCategory(categoryKey, direction) {
  const slider = document.getElementById(`ownedSlider-${categoryKey}`);
  if (!slider) return;
  const firstCard = slider.querySelector(".owned-slide-card");
  const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : slider.clientWidth / 3;
  const gap = 12;
  slider.scrollBy({
    left: direction * ((cardWidth + gap) * 3),
    behavior: "smooth"
  });
}

function renderOwnedUnits() {
  const container = document.getElementById("ownedUnits");
  if (!container) return;
  const waitingUnits = getBenchUnits();
  container.innerHTML = renderOwnedUnitCategories(waitingUnits);
}

function renderFieldUnits() {
  const container = document.getElementById("fieldUnits");
  if (!container) return;
  const slots = [];
  for (let i = 0; i < gameState.maxFieldUnits; i++) {
    const unitId = gameState.fieldUnits[i];
    const unit = gameState.ownedUnits.find((entry) => entry.id === unitId);
    slots.push(unit ? unitCard(unit, `class="card field-card slot filled" data-final-stats="true" onclick="removeUnitFromField(${unit.id})"`) : `<div class="slot empty empty-field-slot">빈 슬롯</div>`);
  }
  container.innerHTML = slots.join("");
}

function deployUnitToField(unitId) {
  if (gameState.isBattleActive) {
    setMessage("전투 중에는 배치를 변경할 수 없습니다.");
    render();
    return;
  }
  if (gameState.fieldUnits.includes(unitId)) return;
  const unit = gameState.ownedUnits.find((entry) => entry.id === unitId);
  if (!unit || unit.currentHp <= 0) {
    setMessage("전투불능 유닛은 배치할 수 없습니다.");
    render();
    return;
  }
  if (gameState.fieldUnits.length >= gameState.maxFieldUnits) {
    setMessage("필드 배치 제한을 초과했습니다.");
    render();
    return;
  }
  gameState.fieldUnits.push(unitId);
  cleanupRecombinationSlots();
  setMessage("유닛을 필드에 배치했습니다.");
  updateSynergies();
  render();
}

function getAliveFieldUnits() {
  return gameState.fieldUnits
    .map((id) => gameState.ownedUnits.find((unit) => unit.id === id))
    .filter((unit) => unit && unit.currentHp > 0);
}

function canMoveToNextNode() {
  return getAliveFieldUnits().length >= 1;
}

function removeUnitFromField(unitId) {
  if (gameState.isBattleActive) {
    setMessage("전투 중에는 배치를 변경할 수 없습니다.");
    render();
    return;
  }
  gameState.fieldUnits = gameState.fieldUnits.filter((id) => id !== unitId);
  cleanupRecombinationSlots();
  setMessage("유닛을 대기 카드로 되돌렸습니다.");
  updateSynergies();
  render();
}

function increaseFieldLimit(isFree = false) {
  if (gameState.maxFieldUnits >= gameState.maxFieldUnitLimit) {
    setMessage("필드 슬롯은 최대 10개입니다.");
    return false;
  }
  if (!isFree && gameState.gold < gameState.fieldUpgradeCost) {
    setMessage("골드가 부족합니다.");
    return false;
  }
  if (!isFree) {
    gameState.gold -= gameState.fieldUpgradeCost;
    gameState.fieldUpgradeCost += gameConfig.shop.fieldUpgradeCostIncrease;
  }
  gameState.maxFieldUnits = Math.min(
    gameState.maxFieldUnitLimit,
    gameState.maxFieldUnits + 1
  );
  addLog(`필드 슬롯이 ${gameState.maxFieldUnits}개로 증가했습니다.`);
  setMessage("필드 슬롯이 확장되었습니다.");
  return true;
}

function checkAndMergeUnits() {
  for (const type of unitTypes) {
    const maxMergeGrade = gameState.maxUnitGrade || 5;
    for (let grade = 1; grade < maxMergeGrade; grade++) {
      const matches = gameState.ownedUnits.filter((unit) => unit.typeKey === type.key && unit.grade === grade);
      if (matches.length >= 3) {
        const consumed = matches.slice(0, 3);
        const consumedIds = consumed.map((unit) => unit.id);
        const hadFieldUnit = consumedIds.some((id) => gameState.fieldUnits.includes(id));
        const upgraded = createUnit(type.key, grade + 1);
        gameState.ownedUnits = gameState.ownedUnits.filter((unit) => !consumedIds.includes(unit.id));
        gameState.fieldUnits = gameState.fieldUnits.filter((id) => !consumedIds.includes(id));
        gameState.ownedUnits.push(upgraded);
        if (hadFieldUnit && gameState.fieldUnits.length < gameState.maxFieldUnits) gameState.fieldUnits.push(upgraded.id);
        addLog(`${type.name} ${stars(grade)} 3개가 ${stars(grade + 1)}로 합성되었습니다.`);
        setMessage(`${type.name} ${grade + 1}성 합성 완료`);
        return checkAndMergeUnits();
      }
    }
  }
  updateSynergies();
  return false;
}

 // updateSynergies 함수는 이제 src/system/synergy.js에서 통합 관리됩니다.

function getAlivePlayerUnits() {
  return gameState.ownedUnits.filter((unit) => (unit.currentHp ?? unit.maxHp) > 0);
}

function getLowestHpUnit() {
  return getAlivePlayerUnits()
    .filter((unit) => unit.currentHp < unit.maxHp)
    .sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
}

function healMissingHpPercent(percent) {
  let healedTotal = 0;
  const globalHealBonus = 1 + Number(gameState.bonuses.healBonus || 0) + Number(gameState.synergyBonuses?.healBonus || 0);
  getAlivePlayerUnits().forEach((unit) => {
    const missingHp = Math.max(0, unit.maxHp - unit.currentHp);
    const healAmount = Math.floor(missingHp * percent * globalHealBonus);
    unit.currentHp = Math.min(unit.maxHp, unit.currentHp + healAmount);
    healedTotal += healAmount;
  });
  const message = `생존 유닛들이 잃은 체력의 ${Math.round(percent * 100)}%를 회복했습니다. 총 ${healedTotal} 회복.`;
  addLog(message);
  setMessage(message);
  return healedTotal;
}

function removeDeadPlayerUnits() {
  const deadUnits = gameState.ownedUnits.filter((unit) => (unit.currentHp ?? unit.maxHp) <= 0);
  if (!deadUnits.length) return [];

  const deadIds = deadUnits.map((unit) => unit.id);
  deadUnits.forEach((unit) => {
    const message = `${unit.name} ${stars(unit.grade)}이 전투에서 사망하여 사라졌습니다.`;
    addBattleLog(message);
    addLog(message);
  });
  gameState.ownedUnits = gameState.ownedUnits.filter((unit) => !deadIds.includes(unit.id));
  gameState.fieldUnits = gameState.fieldUnits.filter((id) => !deadIds.includes(id));
  updateSynergies();
  return deadUnits;
}

function increaseAllAliveMaxHp(percent) {
  getAlivePlayerUnits().forEach((unit) => {
    const increase = Math.max(1, Math.floor(unit.maxHp * percent));
    unit.maxHp += increase;
    unit.currentHp += increase;
    unit.baseMaxHp = (unit.baseMaxHp || unit.maxHp) + increase;
  });
  const message = `모든 생존 유닛의 최대 체력이 ${Math.round(percent * 100)}% 증가했습니다.`;
  addLog(message);
  setMessage(message);
}