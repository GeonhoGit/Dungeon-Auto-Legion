// ==========================================
// 시너지 도감 시스템 (synergy/synergy.js)
// ==========================================

function renderSynergyList() {
  const fieldUnitTypes = typeof getAliveFieldUnits === "function" ? getAliveFieldUnits().map(u => u.typeKey) : [];
  const fieldTypeCounts = fieldUnitTypes.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});

  (gameState.inventoryItems || []).forEach(item => {
    if (item.key && item.key.startsWith("emblem_")) {
      const typeKey = item.key.split("_")[1];
      if (typeKey) {
        fieldTypeCounts[typeKey] = (fieldTypeCounts[typeKey] || 0) + 1;
      }
    }
  });

  // 요구 인원수별로 시너지 그룹화
  const groups = {};
  synergyData.forEach(syn => {
    const reqCount = syn.req.length;
    if (!groups[reqCount]) groups[reqCount] = [];
    groups[reqCount].push(syn);
  });

  // 2인, 3인, 5인 순으로 정렬하여 렌더링
  const sortedKeys = Object.keys(groups).map(Number).sort((a, b) => a - b);

  return sortedKeys.map(reqCount => {
    const syns = groups[reqCount];
    const groupHtml = syns.map(syn => {
      const reqCounts = syn.req.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
      let totalFulfilled = 0;

      const reqDetailsHtml = Object.entries(reqCounts).map(([reqType, requiredAmount]) => {
        const typeDef = unitTypes.find(type => type.key === reqType);
        const name = typeDef ? typeDef.name : reqType;

        const currentAmount = fieldTypeCounts[reqType] || 0;
        const matched = Math.min(currentAmount, requiredAmount);
        totalFulfilled += matched;
        const hasType = matched >= requiredAmount;

        return `<span style="color: ${hasType ? 'var(--green)' : 'var(--red)'}; margin-right: 8px; white-space: nowrap; font-size: 0.9em;">${name} (${matched}/${requiredAmount})</span>`;
      }).join("");
      
      const isActive = totalFulfilled === syn.req.length;
      const classLabel = isActive ? "active" : "inactive";
      
      const isHighlighted = gameState.highlightedSynergyId === syn.id;
      const highlightClass = isHighlighted ? "highlight-selected" : "";
      
      const progressText = isActive ? `<span style="color:var(--gold)">활성</span>` : `${totalFulfilled}/${syn.req.length}`;
      return `
        <div class="synergy-box ${classLabel} ${highlightClass} unit-tooltip-container" data-synergy-id="${syn.id}" onclick="toggleSynergyHighlight('${syn.id}')">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 1.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${syn.name}</strong>
            <small style="font-weight: bold; opacity: 0.9; flex-shrink: 0; padding-left: 4px;">${progressText}</small>
          </div>
          <div class="synergy-effect-text">
            ${syn.desc}
          </div>
          <div class="unit-tooltip" style="min-width: 240px; white-space: normal;">
            <strong style="color: ${isActive ? 'var(--gold)' : 'var(--muted)'}">${syn.name} (${isActive ? "활성" : "비활성"})</strong>
            <div style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px; line-height: 1.6; display: flex; flex-wrap: wrap; gap: 4px;">${reqDetailsHtml}</div>
            <p style="margin: 0; color: #e5a4ff;">효과: ${syn.desc}</p>
          </div>
        </div>
      `;
    }).join("");

    // 각각의 인원수별 독립된 창(영역)으로 분리해서 반환
    return `
      <div class="synergy-group">
        <h4 class="synergy-group-title">${reqCount}인 시너지</h4>
        <div class="synergy-group-grid">
          ${groupHtml}
        </div>
      </div>
    `;
  }).join("");
}

function toggleSynergyHighlight(synergyId) {
  if (gameState.highlightedSynergyId === synergyId) {
    gameState.highlightedSynergyId = null;
  } else {
    gameState.highlightedSynergyId = synergyId;
  }
  render();
}

function openSynergyModal() {
  gameState.isSynergyModalOpen = true;
  render();
}

function closeSynergyModal() {
  gameState.isSynergyModalOpen = false;
  render();
}

function renderSynergyModal() {
  return `
    <div class="modal-backdrop" onclick="closeSynergyModal()">
      <section class="panel squad-preview-modal" style="max-width: 900px;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>시너지 도감</h2>
          <button onclick="closeSynergyModal()">닫기</button>
        </div>
        <div class="synergy-bar" style="margin-bottom: 0; padding: 0; border: none; background: transparent;">
          ${renderSynergyList()}
        </div>
      </section>
    </div>
  `;
}

function updateSynergies() {
  const fieldUnitTypes = typeof getAliveFieldUnits === "function" ? getAliveFieldUnits().map(u => u.typeKey) : [];
  const typeCounts = fieldUnitTypes.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});

  (gameState.inventoryItems || []).forEach(item => {
    if (item.key && item.key.startsWith("emblem_")) {
      const typeKey = item.key.split("_")[1];
      if (typeKey) {
        typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;
      }
    }
  });

  const activeSynergies = [];
  synergyData.forEach(syn => {
    const reqCounts = syn.req.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    let isMet = true;
    for (const [type, count] of Object.entries(reqCounts)) {
      if ((typeCounts[type] || 0) < count) {
        isMet = false;
        break;
      }
    }
    if (isMet) activeSynergies.push(syn);
  });
  
  const finalBonuses = { attack: 0, hp: 0, defense: 0, defenseFlat: 0, attackSpeed: 0, damageReduction: 0, healBonus: 0, critChance: 0, critDamage: 0, lifesteal: 0 };
  activeSynergies.forEach(syn => {
    Object.entries(syn.bonuses || {}).forEach(([stat, value]) => {
      finalBonuses[stat] = (finalBonuses[stat] || 0) + value;
    });
  });

  gameState.activeSynergies = activeSynergies.map(syn => syn.id);
  gameState.synergyBonuses = finalBonuses;
}