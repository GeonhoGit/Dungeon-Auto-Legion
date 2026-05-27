// ==========================================
// 카드 렌더링 및 UI (card/card.js)
// ==========================================

function unitCard(unit, attrs = "") {
  if (!unit) return "";
  const showFinalStats = attrs.includes("data-final-stats");
  const stats = getUnitStats(unit, showFinalStats);
  let currentHp = unit.currentHp ?? stats.maxHp;
  
  // 시너지나 아이템 효과로 인해 최종 체력이 증가했다면, 증가한 만큼 현재 체력도 추가 보정 (손실된 상태로 보이지 않게 함)
  if (showFinalStats) {
    const extraHp = stats.maxHp - (unit.maxHp || stats.baseMaxHp || 100);
    if (extraHp > 0) {
      currentHp = Math.min(stats.maxHp, currentHp + extraHp);
    }
  }
  
  const hpRatio = stats.maxHp > 0 ? currentHp / stats.maxHp : 0;
  const ability = getUnitAbility(unit);
  const awakenedClass = isAwakened(unit) ? "awakened-card" : "";
  
  const gradeClass = `grade-${unit.grade || 1}`;

  const hpBonus = showFinalStats && (stats.maxHp > stats.baseMaxHp) ? ` <small style="color:var(--gold)">(+${stats.maxHp - stats.baseMaxHp})</small>` : "";
  const atkBonus = showFinalStats && (stats.atk > stats.baseAttack) ? ` <small style="color:var(--gold)">(+${stats.atk - stats.baseAttack})</small>` : "";
  const defBonus = showFinalStats && (stats.defense > stats.baseDefense) ? ` <small style="color:var(--gold)">(+${stats.defense - stats.baseDefense})</small>` : "";
  const spdDiff = stats.speed - stats.baseAttackSpeed;
  let spdBonus = "";
  if (showFinalStats) {
    if (spdDiff > 0.001) spdBonus = ` <small style="color:var(--gold)">(+${formatAttackSpeedValue(spdDiff)})</small>`;
    else if (spdDiff < -0.001) spdBonus = ` <small style="color:var(--red)">(${formatAttackSpeedValue(spdDiff)})</small>`;
  }

  let classAttr = attrs.includes("class=") ? "" : `class="card unit-tooltip-container ${gradeClass} ${awakenedClass}"`;
  let modifiedAttrs = attrs;
  if (attrs.includes("class=\"")) {
    modifiedAttrs = attrs.replace('class="', `class="unit-tooltip-container ${gradeClass} ${awakenedClass} `);
  } else if (attrs.includes("class='")) {
    modifiedAttrs = attrs.replace("class='", `class='unit-tooltip-container ${gradeClass} ${awakenedClass} `);
  }

  const nameLabel = isAwakened(unit) ? `<span style="color:#a78bfa;">[각성]</span> ${unit.name}` : unit.name;

  return `
    <div ${classAttr} ${modifiedAttrs} data-type-key="${unit.typeKey}">
      <div class="name"><span>${nameLabel}</span><span class="stars">${stars(unit.grade)}</span></div>
      <div class="meta">
        <span class="hp">HP ${Math.max(0, Math.ceil(currentHp))} / ${stats.maxHp}${hpBonus}</span>
        <span class="atk">공격력 ${stats.atk}${atkBonus}</span>
        <span class="def">방어력 ${stats.defense}${defBonus}</span>
        <span class="spd">공격 속도 ${formatAttackSpeedValue(stats.attackSpeed ?? stats.speed)}${spdBonus}</span>
      </div>
      <div class="bar"><div class="bar-fill ${hpRatio <= 0.35 ? "danger" : ""}" style="width:${Math.max(0, Math.min(100, hpRatio * 100))}%"></div></div>
      <div class="unit-tooltip">
        <strong>스킬: ${ability.skill?.name || "정보 없음"}</strong>
        <p>${ability.skill?.description || ""}</p>
        <strong>특성: ${ability.trait?.name || "정보 없음"}</strong>
        <p>${ability.trait?.description || ""}</p>
        ${getPotentialSynergyHtml(unit)}
        ${renderUnitStatBreakdown(unit, showFinalStats)}
      </div>
    </div>
  `;
}

function calculateUnitStatBreakdown(unit, battleMode = false) {
  const normalized = normalizePlayerUnit(unit);
  const finalStats = calculateUnitFinalStats(normalized, battleMode);
  const attackBase = Number(normalized.baseAttack || normalized.attack || 0);
  const hpBase = Number(normalized.baseMaxHp || normalized.maxHp || 0);
  const defenseBase = Number(normalized.baseDefense || normalized.defense || 0);
  const speedBase = getUnitBaseAttackSpeed(normalized);
      
  const getSynergies = (key) => {
    if (!battleMode) return [];
    return (gameState.activeSynergies || [])
      .map(id => synergyData.find(s => s.id === id))
      .filter(s => s && s.bonuses && s.bonuses[key])
      .map(s => ({ name: `[시너지] ${s.name}`, value: s.bonuses[key], valueType: key }));
  };

  const attackBonuses = battleMode ? [...(gameState.bonusSources.attack || []), ...getSynergies("attack")] : [];
  const hpBonuses = battleMode ? [...(gameState.bonusSources.hp || []), ...getSynergies("hp")] : [];
  const defenseBonuses = battleMode ? [
    ...(gameState.bonusSources.defense || []),
    ...getSynergies("defense"),
    ...getSynergies("defenseFlat")
  ] : [];
  const attackSpeedBonuses = battleMode ? [...(gameState.bonusSources.attackSpeed || []), ...getSynergies("attackSpeed")] : [];

  if (battleMode) {
    const abilityAtk = getBattleAbilityAttackBonus(normalized);
    if (abilityAtk > 0) attackBonuses.push({ name: `[특성] 고유 효과`, value: abilityAtk, valueType: "attack" });
    const abilityDef = getBattleAbilityDefenseBonus(normalized);
    if (abilityDef > 0) defenseBonuses.push({ name: `[특성] 고유 효과`, value: abilityDef, valueType: "defense" });
    
    if (normalized.witchAbsorbedStats > 0) {
      attackBonuses.push({ name: `[특성] 영혼 착취`, value: normalized.witchAbsorbedStats, valueType: "attackFlat", isFlat: true });
      hpBonuses.push({ name: `[특성] 영혼 착취`, value: normalized.witchAbsorbedStats, valueType: "hpFlat", isFlat: true });
    }
  }

  return {
    attack: { base: attackBase, total: finalStats.atk, bonuses: attackBonuses },
    maxHp: { base: hpBase, total: finalStats.maxHp, bonuses: hpBonuses },
    defense: { base: defenseBase, total: finalStats.defense, bonuses: defenseBonuses },
    attackSpeed: {
      base: speedBase,
      total: finalStats.speed,
      bonuses: attackSpeedBonuses,
      formula: `${formatAttackSpeedValue(speedBase)} × (1 + ${formatAttackSpeedValue(finalStats.attackSpeedBonusPercent)} / 100) = ${formatAttackSpeedValue(finalStats.speed)}`,
      intervalMs: finalStats.attackIntervalMs
    }
  };
}

function renderUnitStatBreakdown(unit, battleMode = false) {
  const breakdown = calculateUnitStatBreakdown(unit, battleMode);
  const bonusLine = (type, label, data) => {
    const sources = data.bonuses || [];
    const grouped = sources.reduce((acc, curr) => {
      const key = curr.name + (curr.valueType || "");
      if (!acc[key]) acc[key] = { ...curr, count: 0, totalValue: 0 };
      acc[key].count += 1;
      acc[key].totalValue += curr.value;
      return acc;
    }, {});

    const list = Object.keys(grouped).length
      ? Object.values(grouped).map((source) => `<li style="color:#d1c7b7;">${source.name}${source.count > 1 ? ` <span style="color:var(--gold)">x${source.count}</span>` : ""}: <span style="color:var(--green)">${source.isFlat ? `+${Math.round(source.totalValue)} (기본 스탯에 합산)` : (typeof formatBonusValue === 'function' ? formatBonusValue(source.valueType || type, source.totalValue) : `+${Math.round(source.totalValue * 100)}%`)}</span></li>`).join("")
      : `<li style="color:var(--muted)">추가 보너스 없음</li>`;

    const base = type === "attackSpeed" ? formatAttackSpeedValue(data.base) : data.base;
    const total = type === "attackSpeed" ? formatAttackSpeedValue(data.total) : data.total;
    const formula = type === "attackSpeed"
      ? `<li style="color:var(--muted); margin-top:4px;">(계산식: ${data.formula})</li><li style="color:var(--muted);">* 공격 간격: ${Math.round(data.intervalMs)}ms</li>`
      : "";
    return `<div style="margin-top:6px;"><strong>${label}</strong> (기본: ${base} → <span style="color:#fff">최종: ${total}</span>)<ul style="margin:2px 0 4px; padding-left:18px;">${list}${formula}</ul></div>`;
  };
  return `
    <div class="stat-breakdown">
      <strong style="color:var(--gold); display:block; margin-top:12px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.2);">상세 스탯 분석</strong>
      ${bonusLine("attack", "공격력", breakdown.attack)}
      ${bonusLine("hp", "체력", breakdown.maxHp)}
      ${bonusLine("defense", "방어력", breakdown.defense)}
      ${bonusLine("attackSpeed", "공격 속도", breakdown.attackSpeed)}
    </div>
  `;
}

function getPotentialSynergyHtml(unit) {
  if (!unit || !unit.typeKey) return "";
  
  const fieldUnitTypes = getAliveFieldUnits().map(u => u.typeKey);
  const currentTypeCounts = fieldUnitTypes.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  
  const simulatedTypes = [...fieldUnitTypes, unit.typeKey];
  const simulatedCounts = simulatedTypes.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});

  const relevantSynergies = synergyData.filter(syn => syn.req.includes(unit.typeKey));
  if (relevantSynergies.length === 0) return "";

  let listHtml = "";
  relevantSynergies.forEach(syn => {
    const reqCounts = syn.req.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
    
    let currentFulfilled = 0;
    Object.entries(reqCounts).forEach(([reqType, reqAmt]) => {
      currentFulfilled += Math.min(currentTypeCounts[reqType] || 0, reqAmt);
    });
    
    let simulatedFulfilled = 0;
    Object.entries(reqCounts).forEach(([reqType, reqAmt]) => {
      simulatedFulfilled += Math.min(simulatedCounts[reqType] || 0, reqAmt);
    });

    const isNowActive = simulatedFulfilled === syn.req.length;
    
    // 이 유닛을 필드에 추가했을 때 시너지 카운트가 오르는 경우만 표시
    if (simulatedFulfilled > currentFulfilled) {
      if (isNowActive) {
        listHtml += `
          <div style="font-size:0.95em; margin-top:6px; margin-bottom:4px; padding: 8px; border: 1px solid var(--blue); border-radius: 4px; background: rgba(127, 167, 217, 0.15); color: var(--blue); font-weight: bold; animation: willBeActivePulse 2.5s infinite ease-in-out; text-shadow: 0 1px 2px #000;">
            ${syn.name} (활성화 예정!)
            <div style="font-size: 0.9em; font-weight: normal; color: #b1d4ff; margin-top: 4px; text-shadow: none;">${syn.desc}</div>
          </div>
        `;
      } else {
        listHtml += `<div style="font-size:0.9em; margin-bottom:2px; color:#d1c7b7;">- ${syn.name} (${simulatedFulfilled}/${syn.req.length})</div>`;
      }
    }
  });
  
  if (!listHtml) return "";

  return `
    <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.2);">
      <strong style="color:var(--gold); display:block; margin-bottom:4px;">시너지 기여 정보</strong>
      ${listHtml}
    </div>
  `;
}