// ==========================================
// 공통 UI 및 모달 제어 시스템 (ui/ui.js)
// ==========================================

window._activeTooltipNode = null;

document.addEventListener('mouseover', (e) => {
  if (gameState.isBattleActive) return;
  const container = e.target.closest('.unit-tooltip-container');
  if (container) {
    if (container._activeTooltip) return;
    const sourceTooltip = container.querySelector('.unit-tooltip');
    if (sourceTooltip) {
      if (window._activeTooltipNode) {
        window._activeTooltipNode.remove();
        window._activeTooltipNode = null;
      }
      const clone = sourceTooltip.cloneNode(true);
      document.body.appendChild(clone);
      window._activeTooltipNode = clone;
      
      const rect = container.getBoundingClientRect();
      clone.style.left = (rect.left + rect.width / 2) + 'px';
      
      void clone.offsetWidth;
      // 카드가 화면 위쪽에 있어 툴팁 공간이 모자랄 경우 아래쪽으로 표시되게 보정
      if (rect.top - clone.offsetHeight - 20 < 0) {
        clone.style.bottom = 'auto';
        clone.style.top = (rect.bottom + 10) + 'px';
      } else {
        clone.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
      }
      
      clone.classList.add('show');
      container._activeTooltip = clone;
    }

    const typeKey = container.getAttribute('data-type-key');
    if (typeKey) {
      const fieldUnitTypes = window.getAliveFieldUnits().map(u => u.typeKey);
      const currentTypeCounts = fieldUnitTypes.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
      const simulatedCounts = { ...currentTypeCounts };
      simulatedCounts[typeKey] = (simulatedCounts[typeKey] || 0) + 1;

      synergyData.forEach(syn => {
        const reqCounts = syn.req.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
        let currentFulfilled = 0;
        let simulatedFulfilled = 0;
        Object.entries(reqCounts).forEach(([reqType, reqAmt]) => {
          currentFulfilled += Math.min(currentTypeCounts[reqType] || 0, reqAmt);
          simulatedFulfilled += Math.min(simulatedCounts[reqType] || 0, reqAmt);
        });

        // 이 유닛을 더해서 마침내 시너지가 완성(활성)되는 상태일 때 시너지 바 푸른빛 연동
        if (simulatedFulfilled === syn.req.length && currentFulfilled < syn.req.length) {
          const box = document.querySelector(`.synergy-box[data-synergy-id="${syn.id}"]`);
          if (box) box.classList.add('will-be-active');
        }
      });
    }
  }
});

document.addEventListener('mouseout', (e) => {
  const container = e.target.closest('.unit-tooltip-container');
  if (container) {
    if (container.contains(e.relatedTarget)) return;
    const tooltipToRemove = container._activeTooltip;
    if (tooltipToRemove) {
      tooltipToRemove.classList.remove('show');
      container._activeTooltip = null;
      if (window._activeTooltipNode === tooltipToRemove) {
        window._activeTooltipNode = null;
      }
      setTimeout(() => {
        if (tooltipToRemove.parentNode) {
          tooltipToRemove.remove();
        }
      }, 200);
    }
    
    // 마우스가 떠나면 푸른빛 시너지 바 효과 제거
    document.querySelectorAll('.synergy-box.will-be-active').forEach(box => {
      box.classList.remove('will-be-active');
    });
  }
});

function openProbabilityModal() {
  gameState.isProbabilityModalOpen = true;
  render();
}

function closeProbabilityModal() {
  gameState.isProbabilityModalOpen = false;
  render();
}

function renderProbabilityModal() {
  const stage = gameState.currentStage;
  const unitChances = getStageGradeChances(stage);
  const itemChances = getItemTierChances(stage, "shop");
  const bossItemChances = getItemTierChances(stage, "boss");
  const normalItemChances = getItemTierChances(stage, "normal");

  const getColor = (tier) => ({ 1: "#b9a992", 2: "#7ec98a", 3: "#7fa7d9", 4: "#d46b68", 5: "#e6b85c" }[tier] || "#b9a992");
  const getName = (tier) => ({ 1: "일반", 2: "고급", 3: "희귀", 4: "전설", 5: "신화" }[tier] || "일반");

  const renderBarList = (chances, labelPrefix) => {
    return [1, 2, 3, 4, 5].map(level => {
      const chance = Number(chances[level] || 0);
      if (chance <= 0) return "";
      return `
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; color: ${getColor(level)};">
            <strong>${level}${labelPrefix} [${getName(level)}]</strong>
            <span>${chance}%</span>
          </div>
          <div class="bar" style="height: 10px; background: rgba(0,0,0,0.4); border-radius: 4px;">
            <div class="bar-fill" style="width: ${chance}%; background: ${getColor(level)}; border-radius: 4px;"></div>
          </div>
        </div>
      `;
    }).join("");
  };

  return `
    <div class="modal-backdrop" onclick="closeProbabilityModal()">
      <section class="panel squad-preview-modal" style="max-width: 680px; padding: 24px;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>스테이지 ${stage} 등장 확률</h2>
          <button onclick="closeProbabilityModal()">닫기</button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px;">
          <div class="choice-section" style="margin-top: 0; padding-top: 0; border: none;">
            <h3 style="color: var(--gold); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 12px;">용병 고용 <small style="color:var(--muted); font-size:12px; font-weight:normal;">(상점 기준)</small></h3>
            ${renderBarList(typeof getShopUnitGradeChances === "function" ? getShopUnitGradeChances(stage) : unitChances, "성")}
          </div>
          <div class="choice-section" style="margin-top: 0; padding-top: 0; border: none;">
            <h3 style="color: var(--gold); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 12px;">장비 구매 <small style="color:var(--muted); font-size:12px; font-weight:normal;">(상점)</small></h3>
            ${renderBarList(itemChances, "티어")}
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 20px;">
          <div class="choice-section" style="margin-top: 0; padding-top: 0; border: none;">
            <h3 style="color: var(--gold); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 12px;">일반 보상 <small style="color:var(--muted); font-size:12px; font-weight:normal;">(장비)</small></h3>
            ${renderBarList(normalItemChances, "티어")}
          </div>
          <div class="choice-section" style="margin-top: 0; padding-top: 0; border: none;">
            <h3 style="color: var(--gold); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 12px;">보스 보상 <small style="color:var(--muted); font-size:12px; font-weight:normal;">(장비)</small></h3>
            ${renderBarList(bossItemChances, "티어")}
          </div>
        </div>
      </section>
    </div>
  `;
}

function openInventoryModal() {
  gameState.isInventoryModalOpen = true;
  render();
}

function closeInventoryModal() {
  gameState.isInventoryModalOpen = false;
  render();
}

function renderInventoryModal() {
  const groupedItems = groupItemsByCategory(gameState.inventoryItems);
  
  return `
    <div class="modal-backdrop" onclick="closeInventoryModal()">
      <section class="panel squad-preview-modal" style="max-width: 960px;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>부대 인벤토리 (보유 아이템)</h2>
          <button onclick="closeInventoryModal()">닫기</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; max-height: 50vh; overflow-y: auto; padding-right: 8px;">
          ${Object.keys(groupedItems).length
            ? Object.entries(groupedItems).map(([category, items]) => {
                const itemCounts = items.reduce((acc, item) => {
                  if (!acc[item.name]) acc[item.name] = { ...item, count: 0 };
                  acc[item.name].count += 1;
                  return acc;
                }, {});

                const displayItems = Object.values(itemCounts);
                displayItems.sort((a, b) => (b.tier || 1) - (a.tier || 1)); // 항상 등급순으로 정렬

                return `
                  <div class="inventory-section" style="margin-bottom: 0;">
                    <h3 style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">${getItemCategoryTitle(category)}</h3>
                    <div style="display: grid; gap: 8px;">
                      ${displayItems.map((item) => {
                        const tier = item.tier || 1;
                        return `
                        <div class="inventory-item tier-${tier}">
                          <strong><span class="tier-label">[${{ 1: "일반", 2: "고급", 3: "희귀", 4: "전설", 5: "신화" }[tier] || "일반"}]</span> ${item.name}${item.count > 1 ? ` <span style="color:var(--gold);">x${item.count}</span>` : ""}</strong><br>
                          <small style="color: var(--muted);">${item.text || item.description || ""}</small>
                        </div>
                      `;}).join("")}
                    </div>
                  </div>
                `;
              }).join("")
            : `<div class="slot empty" style="grid-column: 1/-1;">보유 중인 아이템이 없습니다.</div>`}
        </div>
        
        <div class="choice-section" style="margin-top: 24px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 20px;">
          <h3 style="color: var(--gold); margin-bottom: 16px;">부대 전체 보너스 합계</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
             ${["attack", "hp", "defense", "attackSpeed", "damageReduction", "healBonus", "critChance", "critDamage", "lifesteal"]
               .map(type => {
                 const label = { attack:"공격력", hp:"체력", defense:"방어력", attackSpeed:"공격 속도", damageReduction:"피해 감소", healBonus:"회복량 증가", critChance:"치명타 확률", critDamage:"치명타 피해", lifesteal:"생명력 흡수" }[type];
                 const totalBonus = (gameState.bonuses[type] || 0) + (gameState.synergyBonuses[type] || 0);
                 if (totalBonus === 0) return "";
                 return `<div class="inventory-row" style="margin: 0; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;"><span>${label}</span><strong style="color: var(--green);">${formatBonusValue(type, totalBonus)}</strong></div>`;
               }).join("")}
          </div>
        </div>
      </section>
    </div>
  `;
}

function groupItemsByCategory(items) {
  return (items || []).reduce((groups, item) => {
    const category = item.category || getItemCategory(item.key);
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});
}

function getItemCategory(key) {
  if (key.startsWith("cloak_")) return "defense";
  if (key.startsWith("pendant_")) return "heal";
  if (key.startsWith("dagger_") || key.startsWith("axe_")) return "attack";
  if (key.startsWith("scythe_")) return "heal";

  return {
    field_ticket: "special",
    attack_banner: "attack",
    warrior_sword: "attack",
    gladiator_glove: "attack",
    tyrant_sword: "attack",
    hunter_mark: "attack",
    life_charm: "hp",
    giant_belt: "hp",
    wooden_shield: "hp",
    titan_armor: "hp",
    dragon_heart: "hp",
    guardian_emblem: "defense",
    knight_banner: "defense",
    steel_breastplate: "defense",
    thorn_armor: "defense",
    goddess_shield: "defense",
    iron_shield: "defense",
    warrior_helm: "defense",
    imperial_helm: "defense",
    blessed_helm: "defense",
    paladin_armor: "defense",
    radiant_shield: "defense",
    sunfire_cape: "defense",
    tactics_book: "speed",
    wind_boots: "speed",
    swift_dagger: "speed",
    phantom_dancer: "speed",
    storm_bow: "speed",
    assassin_ring: "attack",
    hextech_dagger: "attack",
    trinity_force: "attack"
  }[key] || "special";
}

function getItemCategoryTitle(category) {
  return {
    attack: "공격 아이템",
    hp: "체력 아이템",
    defense: "방어 아이템",
    speed: "속도 아이템",
    special: "특수 아이템",
    heal: "회복 아이템"
  }[category] || "기타 아이템";
}

function formatBonusValue(type, value) {
  const number = Number(value) || 0;
  if (type === "defenseFlat") return `+${Math.round(number)}`;
  if (type === "attackSpeed") return `+${Math.round(number)}%`;
  return `+${Math.round(number * 100)}%`;
}

function renderProbabilityPanel() {
  const stage = gameState.currentStage;
  let unitChances = getStageGradeChances(stage);
  let itemChances, itemLabel;

  if (gameState.screen === "shop") {
    unitChances = typeof getShopUnitGradeChances === "function" ? getShopUnitGradeChances(stage) : unitChances;
    itemChances = getItemTierChances(stage, "shop");
    itemLabel = "장비 구매 (상점)";
  } else if (gameState.screen === "reward") {
    if (gameState.pendingRewardType === "boss") {
      itemChances = getItemTierChances(stage, "boss");
      itemLabel = "보스 보상 (장비)";
    } else {
      itemChances = getItemTierChances(stage, "normal");
      itemLabel = "일반 보상 (장비)";
    }
  } else {
    return "";
  }

  const getColor = (tier) => ({ 1: "#b9a992", 2: "#7ec98a", 3: "#7fa7d9", 4: "#d46b68", 5: "#e6b85c" }[tier] || "#b9a992");
  const getName = (tier) => ({ 1: "일반", 2: "고급", 3: "희귀", 4: "전설", 5: "신화" }[tier] || "일반");

  const renderBarList = (chances, labelPrefix) => {
    return [1, 2, 3, 4, 5].map(level => {
      const chance = Number(chances[level] || 0);
      if (chance <= 0) return "";
      return `
        <div style="margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; color: ${getColor(level)};">
            <strong>${level}${labelPrefix} [${getName(level)}]</strong>
            <span>${chance}%</span>
          </div>
          <div class="bar" style="height: 6px; background: rgba(0,0,0,0.4); border-radius: 4px; margin-top: 0;">
            <div class="bar-fill" style="width: ${chance}%; background: ${getColor(level)}; border-radius: 4px;"></div>
          </div>
        </div>
      `;
    }).join("");
  };

  return `
    <section class="inventory-section" style="padding: 12px 16px;">
      <h3 style="margin-bottom: 12px; font-size: 1em;">스테이지 ${stage} 등장 확률</h3>
      <div style="margin-bottom: 12px;">
        <h4 style="color: var(--gold); font-size: 12px; margin: 0 0 6px 0; padding-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,0.1);">새로운 동료 (유닛)</h4>
        ${renderBarList(unitChances, "성")}
      </div>
      <div>
        <h4 style="color: var(--gold); font-size: 12px; margin: 0 0 6px 0; padding-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,0.1);">${itemLabel}</h4>
        ${renderBarList(itemChances, "티어")}
      </div>
    </section>
  `;
}

function renderInventoryPanel() {
  const panel = document.getElementById("inventoryPanel");
  if (!panel) return;
  const aliveOwnedCount = getAlivePlayerUnits().length;
  let battleLogHtml = gameState.screen === "battle" ? `<section class="inventory-section" style="padding: 0; margin-bottom: 0;"><h3 style="padding: 16px 16px 8px; margin: 0; border-bottom: 1px solid rgba(255,255,255,0.08);">전투 로그</h3><div id="battleLog" class="log" style="height: 300px; border: none; background: transparent; border-radius: 0 0 8px 8px;"></div></section>` : "";
  let probHtml = (gameState.screen === "shop" || gameState.screen === "reward") ? renderProbabilityPanel() : "";

  panel.innerHTML = `
    <h2>인벤토리</h2>
    <section class="inventory-section"><h3>재화 & 진행도</h3><p class="inventory-row"><span>골드</span><strong style="color: var(--gold);">${gameState.gold} G</strong></p><p class="inventory-row"><span>보석</span><strong style="color: var(--gem);">${gameState.gems} 개</strong></p><p class="inventory-row"><span>현재 방</span><strong>${roomLabels[gameState.currentRoomType]?.title || "입구"}</strong></p></section>
    <section class="inventory-section" style="display: flex; gap: 8px; padding: 12px 16px;"><button onclick="openUpgradeModal()" style="flex: 1; font-size: 13px; background: rgba(179,102,255,0.1); color: #e5a4ff; border-color: rgba(179,102,255,0.5);">영구 강화</button></section>
    <section class="inventory-section"><details open><summary>부대 정보</summary><p class="inventory-row"><span>전체 생존 유닛</span><strong>${aliveOwnedCount}</strong></p><p class="inventory-row"><span>대기 중인 카드</span><strong>${getBenchUnits().length}</strong></p></details></section>
    ${probHtml}
    ${battleLogHtml}
  `;
  if (gameState.screen === "battle" && typeof renderBattleLogs === "function") renderBattleLogs();
}