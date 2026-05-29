// ==========================================
// 5. 전투 시스템 (combat/combat.js)
// ==========================================

function setupBattle(isBoss = false) {
  clearRewardTransitionTimers();
  resetBattleVisualState();
  resetEnemyUnits();
  clearBattleLogs();
  if (gameState.commanderSpells) {
    gameState.commanderSpells.heal.current = 0;
    gameState.commanderSpells.strike.current = 0;
  }
  gameState.currentEnemies = generateEnemiesForRoom(isBoss ? "boss" : "battle");
  gameState.battleUnits = [];
  gameState.screen = "battle";
  addLog(isBoss ? "보스가 모습을 드러냈습니다." : "적과 마주쳤습니다.");
  render();
}

function resetBattleVisualState() {
  gameState.combatAnimations = {};
  gameState.damagePopups = [];
  gameState.pendingCombatEffects = [];
  gameState.deadUnitIds = [];
  document.querySelectorAll(".dead, .attack-ally, .attack-enemy").forEach((element) => {
    element.classList.remove("dead", "attack-ally", "attack-enemy");
  });
  document.querySelectorAll(".damage-popup, .heal-popup").forEach((element) => element.remove());
}

function renderBattle() {
  const screen = document.getElementById("screen");
  const label = roomLabels[gameState.currentRoomType] || roomLabels.battle;
  const aliveAllies = gameState.battleUnits.length
    ? gameState.battleUnits.filter((unit) => unit.currentHp > 0).length
    : gameState.fieldUnits.map((id) => gameState.ownedUnits.find((unit) => unit.id === id)).filter((unit) => unit && unit.currentHp > 0).length;
  const aliveEnemies = gameState.currentEnemies.filter((enemy) => enemy.currentHp > 0).length;
  const speedColor = gameState.battleSpeed === 3 ? "var(--red)" : (gameState.battleSpeed === 2 ? "var(--green)" : "var(--gold)");
  const speedBorder = gameState.battleSpeed === 3 ? "var(--red)" : (gameState.battleSpeed === 2 ? "var(--green)" : "var(--line)");

  let spellsHtml = "";
  if (gameState.commanderSpells) {
      const healSpell = gameState.commanderSpells.heal;
      const strikeSpell = gameState.commanderSpells.strike;
      const healCooldownRatio = healSpell.current / healSpell.cooldown;
      const strikeCooldownRatio = strikeSpell.current / strikeSpell.cooldown;

      spellsHtml = `
      <div class="commander-spell-bar">
          <button class="commander-spell-btn" onclick="toggleAutoCast()" style="width: 50px; border-color: ${gameState.autoCastSpells ? 'var(--green)' : 'var(--line)'};" title="사령관 주문 자동 사용 설정">
              <span style="color: ${gameState.autoCastSpells ? 'var(--green)' : 'var(--muted)'}; font-size: 11px;">AUTO</span>
              <span style="font-size: 14px; font-weight: bold; color: ${gameState.autoCastSpells ? '#fff' : 'var(--muted)'}; margin-top: 2px;">${gameState.autoCastSpells ? 'ON' : 'OFF'}</span>
          </button>
          <button id="spellBtnHeal" class="commander-spell-btn" onclick="castCommanderSpell('heal')" ${healSpell.current > 0 ? "disabled" : ""} title="신성한 강림 (쿨타임 15초)\n모든 생존 아군의 상태 이상을 해제하고 최대 체력의 15%를 즉시 회복합니다.">
              <span class="spell-icon">✨</span>
              <span class="spell-name">신성한 강림</span>
              <div class="spell-cooldown-overlay" style="height: ${healCooldownRatio * 100}%;"></div>
          </button>
          <button id="spellBtnStrike" class="commander-spell-btn" onclick="castCommanderSpell('strike')" ${strikeSpell.current > 0 ? "disabled" : ""} title="벼락 (쿨타임 15초)\n가장 체력이 높은 적에게 (스테이지 x 100 + 100)의 피해를 입히고 2초간 기절시킵니다.">
              <span class="spell-icon">⚡</span>
              <span class="spell-name">벼락</span>
              <div class="spell-cooldown-overlay" style="height: ${strikeCooldownRatio * 100}%;"></div>
          </button>
      </div>
      `;
  }

  let bossHpBarHtml = "";
  const boss = gameState.currentEnemies.find((e) => e.type === "boss");
  if (boss) {
    const maxHp = Math.max(1, boss.maxHp);
    const currentHp = Math.max(0, boss.currentHp);
    const hpRatio = currentHp / maxHp;
    const timeLeftStr = Math.max(0, Math.ceil((gameState.battleTimeLeft ?? (gameConfig.combat?.bossTimeLimitMs ?? 30000)) / 1000));
    bossHpBarHtml = `
      <div class="boss-hp-container" style="grid-column: 1 / -1; margin-bottom: 12px; padding: 0 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <div class="boss-hp-name" style="font-size: 15px;">${boss.name}</div>
            <div class="boss-timer ${timeLeftStr <= 10 ? 'urgent-timer' : ''}" id="arenaBossTimer" style="font-size: 14px; font-weight: bold; color: ${timeLeftStr <= 10 ? 'var(--red)' : 'var(--gold)'};">남은 시간: ${timeLeftStr}초</div>
        </div>
        <div class="boss-hp-bar-bg" style="height: 22px;">
          <div id="arenaBossHpFill" class="boss-hp-bar-fill" style="width: ${hpRatio * 100}%"></div>
          <div id="arenaBossHpText" class="boss-hp-text" style="font-size: 13px;">${Math.ceil(currentHp)} / ${maxHp}</div>
        </div>
      </div>
    `;
  }

  screen.innerHTML = `
    <section class="panel battle-screen">
      <div class="battle-header">
        <div>
          <h2>${label.title}</h2>
          <p class="hint">필드에 배치된 유닛만 전투에 참여합니다.</p>
          <p class="message" style="margin-top: 4px;">${gameState.message}</p>
        </div>
        <div class="battle-status">
        <button id="speedToggleButton" onclick="toggleBattleSpeed()" title="단축키: 1, 2, 3" style="padding: 4px 12px; font-size: 13px; background: rgba(0,0,0,0.3); border: 1px solid ${speedBorder}; color: ${speedColor}; border-radius: 999px; cursor: pointer; margin-right: 4px; font-weight: bold; transition: all 0.2s;">▶ ${gameState.battleSpeed || 1}배속</button>
          <span class="pill">아군 ${aliveAllies}</span>
          <span class="pill">적 ${aliveEnemies}</span>
          ${(gameState.isWaitingForReward || gameState.isWaitingForGameOver) ? `<button onclick="openBattleStatsModal()" style="padding: 4px 12px; font-size: 13px; border-color: var(--blue); color: var(--blue); background: rgba(127,167,217,0.1); border-radius: 999px; cursor: pointer;">통계</button>` : ""}
          ${gameState.isWaitingForReward ? `<button id="skipRewardButton" class="reward-skip-button" onclick="skipRewardDelayToRewardRoom()">바로 이동하기 (Space)</button>` : ""}
        </div>
      </div>
      <div class="battle-arena">
        ${bossHpBarHtml}
        ${spellsHtml}
        ${(!gameState.isBattleActive && !gameState.isWaitingForReward && !gameState.isWaitingForGameOver) ? `
        <div class="battle-start-overlay">
          <button id="centerStartButton" onclick="startBattle()" ${canStartBattle() ? "" : "disabled"}>
            전투 시작 (Space)
          </button>
        </div>
        ` : ""}
        <div>
          <h3>아군</h3>
          <div id="battleAllies" class="combat-side ally-side"></div>
        </div>
        <div class="versus">VS</div>
        <div>
          <h3>적</h3>
          <div id="battleEnemies" class="combat-side enemy-side"></div>
        </div>
      </div>
    </section>
  `;
  renderBattleUnits();
  renderEnemies();
}

function renderBattleUnits() {
  const container = document.getElementById("battleAllies");
  const units = gameState.battleUnits.length ? gameState.battleUnits : gameState.fieldUnits.map((id) => gameState.ownedUnits.find((unit) => unit.id === id)).filter(Boolean);
  container.innerHTML = units.length ? units.map((unit) => battleCard(unit, "ally")).join("") : `<div class="slot empty">전투 필드에 유닛을 배치하세요</div>`;
}

function battleCard(unit, side) {
  const hasBattleStats = Number.isFinite(Number(unit.atk)) && Number.isFinite(Number(unit.speed));
  const stats = hasBattleStats ? unit : getUnitStats(unit, true);
  let hp = unit.currentHp ?? stats.maxHp;

  // 전투 시작 전(미리보기 상태)일 경우, 시너지/버프로 늘어난 최대 체력만큼 현재 체력도 시각적으로 채워줍니다.
  if (!hasBattleStats && side === "ally") {
    const extraHp = stats.maxHp - (unit.maxHp || stats.baseMaxHp || 100);
    if (extraHp > 0) {
      hp = Math.min(stats.maxHp, hp + extraHp);
    }
  }

  const key = getCombatKey(side, unit.id);
  const dead = hp <= 0 || gameState.deadUnitIds.includes(key);
  const summonClass = unit.isSummon ? "summon-card" : "";
  const ability = getUnitAbility(unit);

  const gradeClass = `grade-${unit.grade || 1}`;

  const hasEmblem = side === "ally" && (gameState.inventoryItems || []).some(item => item.key === `emblem_${unit.typeKey}`);
  const emblemClass = hasEmblem ? "has-emblem-aura" : "";
  const emblemBadge = hasEmblem ? `<span class="emblem-badge" title="직업 문장 효과 적용 중"></span>` : "";

  const hpBonus = (stats.maxHp > stats.baseMaxHp) ? ` <small style="color:var(--gold)">(+${stats.maxHp - stats.baseMaxHp})</small>` : "";
  const atkBonus = (stats.atk > stats.baseAttack) ? ` <small style="color:var(--gold)">(+${stats.atk - stats.baseAttack})</small>` : "";
  const defBonus = (stats.defense > stats.baseDefense) ? ` <small style="color:var(--gold)">(+${stats.defense - stats.baseDefense})</small>` : "";
  const spdDiff = stats.speed - stats.baseAttackSpeed;
  let spdBonus = "";
  if (spdDiff > 0.001) spdBonus = ` <small style="color:var(--gold)">(+${formatAttackSpeedValue(spdDiff)})</small>`;
  else if (spdDiff < -0.001) spdBonus = ` <small style="color:var(--red)">(${formatAttackSpeedValue(spdDiff)})</small>`;

  return `
    <div id="combat-${key}" class="unit-card card field-card unit-tooltip-container ${gradeClass} ${summonClass} ${emblemClass} ${dead ? "dead" : ""}" data-type-key="${unit.typeKey}">
      <div class="name"><span>${unit.name}${emblemBadge}${renderBuffIcons(unit)}</span><span class="stars">${stars(unit.grade)}</span></div>
      <div class="meta">
        <span class="hp">HP ${Math.max(0, Math.ceil(hp))} / ${stats.maxHp}${hpBonus}</span>
        <span class="atk">공격력 ${stats.atk}${atkBonus}</span>
        <span class="def">방어력 ${stats.defense}${defBonus}</span>
        <span class="spd">공격 속도 ${formatAttackSpeedValue(stats.attackSpeed ?? stats.speed)}${spdBonus}</span>
        ${side === "ally" ? `<span class="dmg">딜량 ${unit.totalDamageDealt || 0}</span>` : ""}
      </div>
      <div class="bar"><div class="bar-fill ${hp / stats.maxHp <= 0.35 ? "danger" : ""}" style="width:${Math.max(0, hp / stats.maxHp * 100)}%"></div></div>
      ${dead ? `<strong class="ko-label">KO</strong>` : ""}
      ${renderDamagePopups(key)}
      <div class="unit-tooltip">
        <strong>스킬: ${ability.skill?.name || "정보 없음"}</strong>
        <p>${ability.skill?.description || ""}</p>
        <strong>특성: ${ability.trait?.name || "정보 없음"}</strong>
        <p>${ability.trait?.description || ""}</p>
        ${renderUnitStatBreakdown(unit, true)}
      </div>
    </div>
  `;
}

function renderEnemies() {
  const container = document.getElementById("battleEnemies");
  container.innerHTML = gameState.currentEnemies.map((enemy) => renderEnemyUnitCard(enemy)).join("");
}

function renderEnemyUnitCard(enemy) {
  const normalized = normalizeEnemyStats(enemy);
  const key = getCombatKey("enemy", normalized.id);
  const hpRatio = normalized.currentHp / normalized.maxHp;
  const dead = normalized.currentHp <= 0 || normalized.isDead === true || gameState.deadUnitIds.includes(key);
  const ability = getUnitAbility(normalized);
  const eliteClass = ["보스", "수문장", "정예"].includes(normalized.danger) ? "elite-enemy-card" : "";
  return `
    <div id="combat-${key}" class="unit-card enemy-card unit-tooltip-container ${eliteClass} ${dead ? "dead" : ""}" data-type-key="${normalized.typeKey}">
      <div class="name">
        <span>${normalized.name}${renderBuffIcons(normalized)}</span>
        <span class="enemy-danger">${normalized.danger}</span>
      </div>
      <div class="meta enemy-meta">
        <span class="hp">HP ${Math.max(0, Math.ceil(normalized.currentHp))} / ${normalized.maxHp}</span>
        <span class="atk">ATK ${normalized.attack}</span>
        <span class="def">DEF ${normalized.defense}</span>
        <span class="spd">AS ${formatAttackSpeedValue(normalized.speed ?? normalized.attackSpeed)}</span>
        <span class="dmg">딜량 ${normalized.totalDamageDealt || 0}</span>
        <span class="state">상태 ${dead ? "전투불능" : "전투 가능"}</span>
      </div>
      <div class="bar"><div class="bar-fill ${hpRatio <= 0.35 ? "danger" : ""}" style="width:${Math.max(0, hpRatio * 100)}%"></div></div>
      ${dead ? `<strong class="ko-label">KO</strong>` : ""}
      ${renderDamagePopups(key)}
      <div class="unit-tooltip">
        <strong>스킬: ${ability.skill?.name || "정보 없음"}</strong>
        <p>${ability.skill?.description || ""}</p>
        <strong>특성: ${ability.trait?.name || "정보 없음"}</strong>
        <p>${ability.trait?.description || ""}</p>
        ${renderUnitStatBreakdown(normalized, false)}
      </div>
    </div>
  `;
}

function getCombatKey(side, id) {
  return `${side}-${id}`;
}

function renderBuffIcons(unit) {
  let html = '';
  const addIcon = (text, color) => {
    html += `<span style="display:inline-block; margin-left:4px; padding:1px 5px; font-size:10px; font-weight:bold; background:${color}; color:#fff; text-shadow:0 0 2px rgba(0,0,0,0.8); border-radius:4px; vertical-align:middle; border:1px solid rgba(0,0,0,0.3);">${text}</span>`;
  };

  let atkUp = false;
  let defUp = false;
  let defDown = false;
  let asDown = false;
  let healDown = false;
  let isStunned = unit.stunDuration > 0;
  let isBurned = unit.dots && unit.dots.some(d => d.type === 'burn');
  let isPoisoned = unit.dots && unit.dots.some(d => d.type === 'poison');
  let isBleeding = unit.dots && unit.dots.some(d => d.type === 'bleed');
  let isEnraged = unit.isTimeAttackEnraged;
  let isPhase2 = unit.isPhase2;

  if (unit.isBattleInstinctActive) { atkUp = true; defUp = true; }
  if (unit.hasActivatedMagicAmplification) atkUp = true;
  if (unit.bardAtkBuffPercent > 0) atkUp = true;
  if (unit.isOrcEnraged) atkUp = true;
  if (unit.attackSpeedDebuffPercent > 0) asDown = true;
  if (unit.defenseDebuffPercent > 0) defDown = true;
  if (unit.healDebuffPercent > 0) healDown = true;

  if (atkUp) addIcon('공격력↑', 'var(--red)');
  if (defUp) addIcon('방어력↑', 'var(--gold)');
  if (asDown) addIcon('공속↓', 'var(--blue)');
  if (defDown) addIcon('방어력↓', '#8c7853');
  if (healDown) addIcon('치유감소', '#7a42f4');
  if (isStunned) addIcon('기절', '#888888');
  if (isBurned) addIcon('화상', '#ff5500');
  if (isPoisoned) addIcon('중독', '#55cc00');
  if (isBleeding) addIcon('출혈', '#cc0000');
  if (isEnraged) addIcon('광폭화', '#8f0000');
  if (isPhase2) addIcon('2페이즈', '#ff00aa');

  return html;
}

function renderDamagePopups(key) {
  return gameState.damagePopups
    .filter((popup) => popup.key === key)
    .map((popup) => {
      const isHeal = String(popup.damage).startsWith("+");
      const className = isHeal ? "heal-popup" : (popup.isCrit ? "damage-popup crit-popup" : "damage-popup");
      const text = isHeal ? popup.damage : `-${popup.damage}`;
      return `<span class="${className}">${text}</span>`;
    })
    .join("");
}

function getBattleLogHeaderLines() {
  return [
    "----------------------------------------",
    "전투 내용",
    "----------------------------------------"
  ];
}

function isBattleLogHeaderLine(log) {
  return log === "전투 내용" || /^-{8,}$/.test(String(log || ""));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearBattleLogs() {
  gameState.battleLogs = getBattleLogHeaderLines();
  renderBattleLogs();
}

function addBattleLog(message) {
  const header = getBattleLogHeaderLines();
  const bodyLogs = gameState.battleLogs
    .filter((log) => !isBattleLogHeaderLine(log));

  bodyLogs.push(message);
  gameState.battleLogs = [...header, ...bodyLogs.slice(-47)];
  renderBattleLogs();
}

function renderBattleLogs() {
  const container = document.getElementById("battleLog");
  if (!container) return;

  container.innerHTML = gameState.battleLogs.map((log) => {
    const safeLog = escapeHtml(log);

    if (/^-{8,}$/.test(String(log || ""))) {
      return `<div class="battle-log-separator">${safeLog}</div>`;
    }

    if (log === "전투 내용") {
      return `<div class="battle-log-title">${safeLog}</div>`;
    }

    return `<div class="battle-log-entry">${safeLog}</div>`;
  }).join("");
  container.scrollTop = container.scrollHeight;
}

function canStartBattle() {
  const aliveFieldCount = gameState.fieldUnits
    .map((id) => gameState.ownedUnits.find((unit) => unit.id === id))
    .filter((unit) => unit && unit.currentHp > 0).length;
  return aliveFieldCount >= gameState.minFieldUnitsToBattle
    && gameState.fieldUnits.length <= gameState.maxFieldUnits
    && gameState.currentEnemies.length > 0
    && !gameState.isBattleActive
    && !gameState.isWaitingForReward
    && !gameState.isWaitingForGameOver;
}

// 전투 시작 조건 검사 및 상태 초기화
function startBattle() {
  if (!canStartBattle()) {
    setMessage("필드에 유닛이 1마리 이상 있어야 합니다.");
    render();
    return;
  }
  if (gameState.battleTimer) {
    clearInterval(gameState.battleTimer);
    gameState.battleTimer = null;
  }
  clearBattleLogs();
  resetBattleVisualState();
  gameState.battleTimeLeft = gameConfig.combat?.bossTimeLimitMs ?? 30000;
  gameState.battleUnits = gameState.fieldUnits
    .map((id) => gameState.ownedUnits.find((unit) => unit.id === id))
    .filter((unit) => unit && unit.currentHp > 0)
    .map((unit) => {
      const stats = getUnitStats(unit, true);
      const extraHp = stats.maxHp - (unit.maxHp || stats.baseMaxHp || 100);
      const battleUnit = {
        ...unit,
        ...stats,
        attackSpeed: stats.speed,
        baseAttackSpeed: stats.baseAttackSpeed,
        attackSpeedBonusPercent: stats.attackSpeedBonusPercent,
        currentHp: Math.min(stats.maxHp, unit.currentHp + Math.max(0, extraHp)),
        extraHpFromBuffs: Math.max(0, extraHp),
        attackCooldown: 0,
        cooldown: 0,
        totalDamageDealt: 0
      };
      battleUnit.attackCooldown = getAttackIntervalMs(battleUnit);
      battleUnit.cooldown = battleUnit.attackCooldown;
      return initializeBattleAbilityState(battleUnit);
    });
  gameState.currentEnemies.forEach((enemy) => {
    normalizeEnemyStats(enemy);
    enemy.attackSpeedDebuffPercent = 0;
    enemy.attackSpeedDebuffDuration = 0;
    enemy.attackCooldown = getAttackIntervalMs(enemy);
    enemy.cooldown = enemy.attackCooldown;
    
    if (enemy.typeKey === "spider") {
        const sCfg = gameConfig.enemyAbilitySettings?.spider || {};
        gameState.battleUnits.forEach(u => applyAttackSpeedDebuff(u, sCfg.startWebAsDebuffPercent ?? 25, sCfg.startWebDuration ?? 3000));
        playSkillAnimation(enemy, "skill-flash");
        addBattleLog(`[특성] ${enemy.name}의 거미줄! 적 전체의 공격 속도가 3초간 감소합니다.`);
    }
  });
  applyBattleStartTraits();
  gameState.lastBattlePlayerUnitCount = gameState.battleUnits.length;
  gameState.lastBattleEnemyUnitCount = gameState.currentEnemies.length;
  gameState.bonuses.nextBattleSpeed = 0;
  gameState.isBattleActive = true;
  gameState.lastBattleTickTime = Date.now();
  addBattleLog("전투를 시작합니다.");
  flushCombatEffectsToDom(); // 시작 시 연출(거미줄 등) 강제 반영
  render();
  gameState.battleTimer = setInterval(tickBattle, 100);
}

// 전투 중 매 틱(tick)마다 유닛들의 쿨타임과 공격을 처리하는 핵심 루프
function tickBattle() {
  const now = Date.now();
  const realDelta = Math.min(250, Math.max(0, now - gameState.lastBattleTickTime));
  gameState.lastBattleTickTime = now;
  const gameDelta = realDelta * (gameState.battleSpeed || 1);
  battleTick(gameDelta);
}

function toggleBattleSpeed() {
  gameState.battleSpeed = (gameState.battleSpeed || 1) + 1;
  if (gameState.battleSpeed > 3) gameState.battleSpeed = 1;
  
  const btn = document.getElementById("speedToggleButton");
  if (btn) {
    btn.textContent = `▶ ${gameState.battleSpeed}배속`;
    btn.style.color = gameState.battleSpeed === 3 ? "var(--red)" : (gameState.battleSpeed === 2 ? "var(--green)" : "var(--gold)");
    btn.style.borderColor = gameState.battleSpeed === 3 ? "var(--red)" : (gameState.battleSpeed === 2 ? "var(--green)" : "var(--line)");
  }
}

function setBattleSpeed(speed) {
  if (speed >= 1 && speed <= 3) {
    gameState.battleSpeed = speed;
    const btn = document.getElementById("speedToggleButton");
    if (btn) {
      btn.textContent = `▶ ${gameState.battleSpeed}배속`;
      btn.style.color = gameState.battleSpeed === 3 ? "var(--red)" : (gameState.battleSpeed === 2 ? "var(--green)" : "var(--gold)");
      btn.style.borderColor = gameState.battleSpeed === 3 ? "var(--red)" : (gameState.battleSpeed === 2 ? "var(--green)" : "var(--line)");
    }
  }
}

function battleTick(deltaTime) {
  if (gameState.commanderSpells) {
    if (gameState.commanderSpells.heal.current > 0) gameState.commanderSpells.heal.current = Math.max(0, gameState.commanderSpells.heal.current - deltaTime);
    if (gameState.commanderSpells.strike.current > 0) gameState.commanderSpells.strike.current = Math.max(0, gameState.commanderSpells.strike.current - deltaTime);
  }

  const boss = gameState.currentEnemies.find((e) => e.type === "boss");
  if (boss && boss.currentHp > 0) {
    gameState.battleTimeLeft = Math.max(0, (gameState.battleTimeLeft || 0) - deltaTime);
    
    if (gameState.battleTimeLeft <= 0 && !boss.isTimeAttackEnraged) {
      boss.isTimeAttackEnraged = true;
      const enrageMult = gameConfig.combat?.bossEnrageMultiplier ?? 5;
      boss.attack = Math.floor(boss.attack * enrageMult);
      boss.atk = boss.attack;
      addBattleLog(`[경고] 제한 시간 초과! ${boss.name}이(가) 광폭화하여 공격력이 폭증합니다!`);
      playSkillAnimation(boss, "awakened-flash");
    }

    if (!boss.isPhase2 && boss.currentHp <= boss.maxHp * 0.5) {
      boss.isPhase2 = true;
      
      boss.attack = Math.floor(boss.attack * 1.3);
      boss.atk = boss.attack;
      boss.defense = Math.floor(boss.defense * 1.3);
      boss.baseDefense = boss.defense;
      boss.attackSpeed = Number((boss.attackSpeed * 1.2).toFixed(2));
      boss.baseAttackSpeed = boss.attackSpeed;
      boss.speed = boss.attackSpeed;
      boss.attackCooldown = Math.min(boss.attackCooldown || 0, getAttackIntervalMsFromSpeed(boss.speed));

      addBattleLog(`[경고] ${boss.name}의 체력이 50% 이하로 떨어져 2페이즈에 돌입합니다! 공격력/방어력/공격속도 증가!`);
      playSkillAnimation(boss, "awakened-flash");
    }
  }

  let didAttack = false;
  updateAbilityStates(deltaTime);

  if (gameState.autoCastSpells && gameState.isBattleActive) {
    if (gameState.commanderSpells.heal.current <= 0) {
      const needsHeal = gameState.battleUnits.some(u => u.currentHp > 0 && (u.currentHp / u.maxHp) <= 0.6);
      if (needsHeal) window.castCommanderSpell('heal');
    }
    if (gameState.commanderSpells.strike.current <= 0) {
      if (getAliveEnemies().length > 0) window.castCommanderSpell('strike');
    }
  }

  // 틱(Tick)마다 반복되는 필터링 연산을 최소화하기 위해 생존 유닛을 캐싱
  const aliveAllies = gameState.battleUnits.filter((unit) => unit.currentHp > 0);
  const aliveEnemies = getAliveEnemies();

  aliveAllies.forEach((unit) => {
    if (unit.stunDuration > 0) return;
    unit.attackCooldown = Number(unit.attackCooldown ?? unit.cooldown ?? 0) - deltaTime;
    if (unit.attackCooldown <= 0) {
      const target = randomFrom(aliveEnemies);
      if (target && target.currentHp > 0) { // 캐싱된 적이 방금 전 공격으로 죽었는지 확인
        processAttack(unit, target);
        didAttack = true;
      }
      unit.attackCooldown = getAttackIntervalMs(unit);
      unit.cooldown = unit.attackCooldown;
    }
  });

  // 아군 공격 페이즈에서 적이 아군을 죽였을 수 있으므로 다시 한번 생존 아군 확인
  const currentAliveAllies = gameState.battleUnits.filter((unit) => unit.currentHp > 0);

  aliveEnemies.forEach((enemy) => {
    if (enemy.currentHp <= 0) return;
    if (enemy.stunDuration > 0) return;
    enemy.attackCooldown = Number(enemy.attackCooldown ?? enemy.cooldown ?? 0) - deltaTime;
    if (enemy.attackCooldown <= 0) {
      const target = getEnemyTargetByPriority(currentAliveAllies);
      if (target && target.currentHp > 0) {
        processAttack(enemy, target);
        didAttack = true;
      }
      enemy.attackCooldown = getAttackIntervalMs(enemy);
      enemy.cooldown = enemy.attackCooldown;
    }
  });

  if (getAliveEnemies().length === 0) {
    finishBattle(true);
    return;
  }
  if (gameState.battleUnits.every((unit) => unit.currentHp <= 0)) {
    finishBattle(false);
    return;
  }

  // 전투 중 전체 renderBattle()을 반복 호출하면 기존 카드 DOM이 교체되어
  // 여러 유닛이 공격할 때 먼저 시작된 공격 모션이 중간에 끊긴다.
  // 따라서 전투 중에는 카드 숫자/HP바/KO 표시만 부분 갱신하고,
  // 공격 모션은 기존 DOM 위에 1회성으로 적용한다.
  updateBattleUiAfterAttacks();
  flushCombatEffectsToDom();
}

function getAttackIntervalMs(unit) {
  return getAttackIntervalMsFromSpeed(getUnitAttackSpeed(unit));
}

function getAliveEnemies() {
  return gameState.currentEnemies.filter((enemy) => enemy.currentHp > 0 && enemy.isDead !== true);
}

function getRandomAliveEnemy() {
  return randomFrom(getAliveEnemies());
}

function getRandomAliveAlly() {
  return randomFrom(gameState.battleUnits.filter((unit) => unit.currentHp > 0));
}

function getEnemyTargetByPriority(aliveAllies = null) {
  const targets = aliveAllies || gameState.battleUnits.filter((unit) => unit.currentHp > 0);
  if (!targets.length) return null;

  const priorities = gameConfig.enemyTargetPriority || [];
  for (const group of priorities) {
    const candidates = targets.filter((unit) => group.unitNames.includes(unit.name));
    if (candidates.length > 0) return randomFrom(candidates);
  }

  return randomFrom(targets);
}

// 공격자(attacker)가 방어자(target)에게 피해를 입히는 상세 로직 (회피, 치명타, 스킬 등 판정)
function processAttack(attacker, target, options = {}) {
  if (!attacker || !target || attacker.currentHp <= 0 || target.currentHp <= 0) return 0;
  const attackerSide = attacker.grade ? "ally" : "enemy";
  const targetSide = target.grade ? "ally" : "enemy";
  const context = {
    attacker,
    target,
    attackerSide,
    targetSide,
    rawDamage: getUnitAttack(attacker),
    damageMultiplier: Number(options.damageMultiplier || 1),
    isExtraAttack: Boolean(options.isExtraAttack),
    isAbilityDamage: Boolean(options.isAbilityDamage),
    skipAttackerAbilities: Boolean(options.skipAttackerAbilities),
    skipRogueShadowBlade: Boolean(options.skipRogueShadowBlade),
    logs: []
  };

  if (!context.skipAttackerAbilities) {
    if (attackerSide === "ally") applyAbilityBeforeDamage(context);
    else applyEnemyAbilityBeforeDamage(context);
  }

  let genericCritTriggered = false;
  // 공격자의 고유 치명타 스탯 + (아군일 경우 보너스 합산)
  const totalCritChance = (attacker.critChance || 0) + (attackerSide === "ally" ? Number(gameState.bonuses.critChance || 0) : 0);
  const bardCritBonus = (attackerSide === "ally" && hasAliveBard()) ? (gameConfig.abilitySettings?.bard?.songOfEnthusiasmCritBonus || 0.1) : 0;
  const totalCritDamage = (attacker.critDamage || 0) + (attackerSide === "ally" ? Number(gameState.bonuses.critDamage || 0) : 0);

  if (Math.random() < totalCritChance + bardCritBonus) {
    genericCritTriggered = true;
    context.isCrit = true;
    context.damageMultiplier *= (1.5 + totalCritDamage);
  }

  const damageBeforeDefense = Math.max(1, Math.floor(context.rawDamage * context.damageMultiplier));
  let damage = calculateFinalDamage(damageBeforeDefense, target, context.targetSide);
  if (context.targetSide === "enemy") {
    damage = applyEnemyDefenderTraitsBeforeDamage(target, damage, context);
  }
  damage = applyDefenderTraitsBeforeDamage(target, damage);
  const targetDefense = getUnitDefense(target);
  const attackerName = formatUnitName(attacker);
  const targetName = formatUnitName(target);

  playAttackAnimation(attacker.id, target.id, attackerSide, targetSide, damage, context.isCrit || false);
  target.currentHp -= damage;
  target.totalDamageTaken = (target.totalDamageTaken || 0) + damage;
  syncTargetHpIfPlayerUnit(target);

  attacker.totalDamageDealt = (attacker.totalDamageDealt || 0) + damage;
  if (attackerSide === "ally") {
    if (!gameState.stats) gameState.stats = { monstersKilled: 0, bossesKilled: 0, totalDamageDealt: 0 };
    gameState.stats.totalDamageDealt = (gameState.stats.totalDamageDealt || 0) + damage;
  }

  addBattleLog(`${attackerName} → ${targetName}: ${damage} 피해 (공격력 ${damageBeforeDefense}, 방어력 ${targetDefense} 적용)`);
  if (genericCritTriggered && !context.logs.some(l => l.includes("[치명타]"))) {
    context.logs.push(`[치명타] ${attackerName}의 치명타 발동!`);
  }
  context.logs.forEach((message) => addBattleLog(message.replace("{damage}", damage)));

  const lifestealBonus = attackerSide === "ally" ? (Number(gameState.bonuses.lifesteal || 0) + Number(gameState.synergyBonuses?.lifesteal || 0)) : (attacker.typeKey === "bat" ? (gameConfig.enemyAbilitySettings?.bat?.lifestealPercent ?? 0.2) : (attacker.typeKey === "ghost" && Math.random() < (gameConfig.enemyAbilitySettings?.ghost?.lifestealChance ?? 0.15) ? (gameConfig.enemyAbilitySettings?.ghost?.lifestealPercent ?? 0.5) : 0));
  if (lifestealBonus > 0) {
    const totalHealBonus = 1 + Number(gameState.bonuses.healBonus || 0) + Number(gameState.synergyBonuses?.healBonus || 0);
    const healReduction = attacker.healDebuffPercent ? (1 - attacker.healDebuffPercent / 100) : 1;
    const healAmount = Math.floor(damage * lifestealBonus * (attackerSide === "ally" ? totalHealBonus : 1) * Math.max(0, healReduction));
    if (healAmount > 0 && attacker.currentHp > 0 && attacker.currentHp < attacker.maxHp) {
      const beforeHp = attacker.currentHp;
      attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
      const healed = attacker.currentHp - beforeHp;
      if (healed > 0) {
        attacker.totalHealed = (attacker.totalHealed || 0) + healed;
        syncTargetHpIfPlayerUnit(attacker);
        addBattleLog(`[흡혈] ${attackerName} 생명력 ${healed} 흡수!`);
        const attackerKey = getCombatKey(attackerSide, attacker.id);
        if (!Array.isArray(gameState.pendingCombatEffects)) gameState.pendingCombatEffects = [];
        gameState.pendingCombatEffects.push({
          attackerKey: attackerKey,
          targetKey: attackerKey,
          attackClass: "heal-flash",
          damage: `+${healed}`,
          duration: 1000
        });
      }
    }
  }

  if (target.currentHp <= 0) {
    target.isDead = true;
    markUnitDead(target.id, targetSide);
    addBattleLog(`${attackerName}가 ${targetName}을 처치했습니다.`);
    
    if (targetSide === "enemy") {
      if (!gameState.stats) gameState.stats = { monstersKilled: 0, bossesKilled: 0, totalDamageDealt: 0 };
      gameState.stats.monstersKilled = (gameState.stats.monstersKilled || 0) + 1;
      if (target.type === "boss") gameState.stats.bossesKilled = (gameState.stats.bossesKilled || 0) + 1;
    }

    if (target.isSummon && target.typeKey === "skeleton") {
      triggerCorpseExplosion(target);
    }
    
    if (!context.skipAttackerAbilities) applyAbilityAfterDamage(context);
    return damage;
  }

  applyOnHitAbilities(target);
  if (!context.skipAttackerAbilities) applyAbilityAfterDamage(context);
  return damage;
}

function applyAbilityBeforeDamage(contextOrAttacker, target, rawDamage) {
  const context = contextOrAttacker?.attacker
    ? contextOrAttacker
    : { attacker: contextOrAttacker, target, rawDamage, damageMultiplier: 1, logs: [] };
  const { attacker } = context;
  if (!attacker?.typeKey || attacker.currentHp <= 0) return context;
  const settings = gameConfig.abilitySettings || {};

  if (
    attacker.typeKey === "warrior"
    && Number(attacker.warriorShieldBashCooldown || 0) <= 0
  ) {
    const awakened = isAwakened(attacker);
    const chance = awakened ? 0.45 : Number(settings.warrior?.shieldBashChance ?? 0.3);
    if (Math.random() < chance) {
      const mult = awakened ? 1.75 : Number(settings.warrior?.shieldBashDamageMultiplier ?? 1.25);
      const asDown = awakened ? 40 : Number(settings.warrior?.shieldBashAttackSpeedDownPercent ?? 20);
      const duration = awakened ? 3000 : Number(settings.warrior?.shieldBashDebuffDuration ?? 2000);
      const defDown = awakened ? 25 : Number(settings.warrior?.shieldBashDefDebuffPercent ?? 15);
      const defDuration = awakened ? 5000 : Number(settings.warrior?.shieldBashDefDebuffDuration ?? 5000);
      context.damageMultiplier *= mult;
      applyAttackSpeedDebuff(context.target, asDown, duration);
      context.target.defenseDebuffPercent = Math.max(context.target.defenseDebuffPercent || 0, defDown);
      context.target.defenseDebuffDuration = Math.max(context.target.defenseDebuffDuration || 0, defDuration);
      playSkillAnimation(attacker, awakened ? "awakened-flash" : "skill-flash");
      attacker.warriorShieldBashCooldown = awakened ? 2000 : Number(settings.warrior?.shieldBashCooldown ?? 3000);
      context.logs.push(`[스킬] ${formatUnitName(attacker)}의 ${awakened ? "진·방패 강타" : "방패 강타"}가 발동했습니다!`);
      context.logs.push(`[디버프] ${formatUnitName(context.target)}의 공격속도가 ${asDown}%, 방어력이 ${defDown}% 감소했습니다.`);
    }
  }

  if (attacker.typeKey === "archer" && context.targetSide === "enemy") {
    const threshold = Number(settings.archer?.weakPointHpThreshold ?? 0.4);
    if (context.target.currentHp / Math.max(1, context.target.maxHp) <= threshold) {
      context.damageMultiplier *= 1 + Number(settings.archer?.weakPointDamageBonus ?? 0.3);
      playSkillAnimation(attacker, "skill-flash");
      context.logs.push(`[특성] ${formatUnitName(attacker)}의 약점 조준 적용!`);
    }
  }

  if (attacker.typeKey === "rogue" && !context.isExtraAttack && !context.isAbilityDamage) {
    const awakened = isAwakened(attacker);
    if (!attacker.hasUsedAmbush) {
      attacker.hasUsedAmbush = true;
      context.damageMultiplier *= Number(settings.rogue?.ambushCritMultiplier ?? 2.5);
      context.isCrit = true;
      context.skipRogueShadowBlade = true;
        context.target.stunDuration = Math.max(context.target.stunDuration || 0, 1500);
      playSkillAnimation(attacker, "skill-flash");
        context.logs.push(`[치명타] ${formatUnitName(attacker)}의 급습 발동! 적이 1.5초간 기절합니다.`);
    } else if (!context.skipRogueShadowBlade && Math.random() < (awakened ? 0.35 : Number(settings.rogue?.shadowBladeChance ?? 0.2))) {
      context.damageMultiplier *= (awakened ? 2.2 : Number(settings.rogue?.shadowBladeCritMultiplier ?? 1.8));
      context.isCrit = true;
      playSkillAnimation(attacker, awakened ? "awakened-flash" : "skill-flash");
      context.logs.push(`[스킬] ${formatUnitName(attacker)}의 ${awakened ? "그림자 습격" : "그림자 칼날"} 발동! 치명타 피해!`);
    }
  }

  return context;
}

function applyEnemyAbilityBeforeDamage(context) {
  const { attacker } = context;
  if (!attacker?.typeKey || attacker.currentHp <= 0) return;
  const eCfg = gameConfig.enemyAbilitySettings || {};

  if (attacker.typeKey === "goblin" && !attacker.hasUsedAmbush) {
    attacker.hasUsedAmbush = true;
    context.damageMultiplier *= (eCfg.goblin?.ambushMultiplier ?? 2);
    playSkillAnimation(attacker, "skill-flash");
    context.logs.push(`[스킬] ${attacker.name}의 기습! 피해량이 100% 증가합니다.`);
  }
  if (attacker.typeKey === "corrupt_knight" && Math.random() < (eCfg.corrupt_knight?.darkBladeChance ?? 0.2)) {
    context.damageMultiplier *= (eCfg.corrupt_knight?.darkBladeMultiplier ?? 2.0);
    playSkillAnimation(attacker, "skill-flash");
    context.logs.push(`[스킬] ${attacker.name}의 어둠의 검! 큰 피해를 줍니다.`);
  }
}

function applyEnemyDefenderTraitsBeforeDamage(target, finalDamage, context) {
  if (target.currentHp <= 0) return finalDamage;
  const eCfg = gameConfig.enemyAbilitySettings || {};
  if (target.typeKey === "skeleton" && Math.random() < (eCfg.skeleton?.shieldChance ?? 0.1)) {
    playSkillAnimation(target, "skill-flash");
    addBattleLog(`[스킬] ${target.name}이 뼈로 막아 피해를 무효화했습니다!`);
    return 0;
  }
  if (target.typeKey === "ghost") return Math.floor(finalDamage * (1 - (eCfg.ghost?.damageReduction ?? 0.15)));
  if (target.typeKey === "corrupt_knight" && Math.random() < (eCfg.corrupt_knight?.reflectChance ?? 0.2)) {
    const reflect = Math.floor(finalDamage * (eCfg.corrupt_knight?.reflectPercent ?? 0.2));
    if (context.attacker && context.attacker.currentHp > 0) {
        context.attacker.currentHp -= reflect;
        addBattleLog(`[특성] ${target.name}이 피해의 일부를 반사했습니다!`);
        showDamagePopup(context.attacker.id, reflect, context.attackerSide);
    }
  }
  if (target.typeKey === "slime" && context.attacker && context.attacker.currentHp > 0) {
    applyAttackSpeedDebuff(context.attacker, eCfg.slime?.hitDebuffPercent ?? 20, eCfg.slime?.hitDebuffDuration ?? 2000);
    playSkillAnimation(target, "skill-flash");
    addBattleLog(`[스킬] ${target.name}의 산성 점액! ${formatUnitName(context.attacker)}의 공격 속도가 감소합니다.`);
  }
  return finalDamage;
}

function applyEnemyAbilityAfterDamage(context) {
  const { attacker, target } = context;
  if (!attacker?.typeKey || attacker.currentHp <= 0) return;
  const eCfg = gameConfig.enemyAbilitySettings || {};

  if (attacker.typeKey === "orc") {
    attacker.orcAttackCount = (attacker.orcAttackCount || 0) + 1;
    if (attacker.orcAttackCount >= (eCfg.orc?.groundBashAttackCount ?? 4)) {
      attacker.orcAttackCount = 0;
      playSkillAnimation(attacker, "skill-flash");
      processAttack(attacker, target, { damageMultiplier: (eCfg.orc?.groundBashMultiplier ?? 1.5), isAbilityDamage: true, skipAttackerAbilities: true });
    }
    if (!attacker.isOrcEnraged && attacker.currentHp / attacker.maxHp <= (eCfg.orc?.enrageThreshold ?? 0.5)) {
      attacker.isOrcEnraged = true;
      attacker.attack = Math.floor(attacker.attack * (eCfg.orc?.enrageAtkMultiplier ?? 1.3));
      playSkillAnimation(attacker, "skill-flash");
      addBattleLog(`[특성] ${attacker.name}의 광폭화! 공격력이 증가합니다.`);
    }
  }
  if (attacker.typeKey === "skeleton" && target.currentHp > 0) {
    if (Math.random() < (eCfg.skeleton?.asDebuffChance ?? 0.1)) {
        applyAttackSpeedDebuff(target, eCfg.skeleton?.asDebuffPercent ?? 30, eCfg.skeleton?.asDebuffDuration ?? 2000);
        playSkillAnimation(attacker, "skill-flash");
        addBattleLog(`[스킬] ${attacker.name}의 뼈 무덤! ${target.name}의 공격 속도가 감소합니다.`);
    }
  }
  if (attacker.typeKey === "spider" && target.currentHp > 0) {
    if (Math.random() < (eCfg.spider?.poisonChance ?? 0.3)) {
      applyAttackSpeedDebuff(target, (eCfg.spider?.poisonAsDebuffPercent ?? 5), 999999);
      const poisonDps = Math.max(1, Math.floor(attacker.attack * 0.2));
      target.dots = target.dots || [];
      target.dots.push({ type: 'poison', dps: poisonDps, duration: 3000, tickAccumulator: 0 });
      playSkillAnimation(attacker, "skill-flash");
      addBattleLog(`[스킬] ${attacker.name}의 독니! ${target.name}이 중독되고 공격 속도가 감소합니다.`);
    }
  }
  if (attacker.typeKey === "minotaur") {
    attacker.minotaurAttackCount = (attacker.minotaurAttackCount || 0) + 1;
    if (attacker.minotaurAttackCount >= (eCfg.minotaur?.shockwaveAttackCount ?? 3)) {
        attacker.minotaurAttackCount = 0;
        playSkillAnimation(attacker, "skill-flash");
        gameState.battleUnits.filter(u => u.currentHp > 0).forEach(u => applyAttackSpeedDebuff(u, eCfg.minotaur?.shockwaveAsDebuffPercent ?? 30, eCfg.minotaur?.shockwaveDuration ?? 1000));
        addBattleLog(`[스킬] ${attacker.name}의 충격파! 모든 적의 공격 속도가 잠시 감소합니다.`);
    }
  }
  if (attacker.typeKey === "bat") {
    if (Math.random() < 0.20) {
      attacker.attackCooldown = Math.floor(attacker.attackCooldown * 0.5);
      playSkillAnimation(attacker, "skill-flash");
      addBattleLog(`[스킬] ${attacker.name}의 급강하! 다음 공격 대기시간이 50% 감소합니다.`);
    }
  }
  if (attacker.typeKey === "mummy" && target.currentHp > 0) {
    if (Math.random() < (eCfg.mummy?.healDebuffChance ?? 0.25)) {
        target.healDebuffPercent = Math.max(target.healDebuffPercent || 0, eCfg.mummy?.healDebuffPercent ?? 50);
        target.healDebuffDuration = Math.max(target.healDebuffDuration || 0, eCfg.mummy?.healDebuffDuration ?? 3000);
        playSkillAnimation(attacker, "skill-flash");
        addBattleLog(`[스킬] ${attacker.name}의 부패의 저주! ${formatUnitName(target)}의 치유량이 감소합니다.`);
    }
  }
}

function triggerUltimateSynergyEffect() {
  if (typeof synergyData === "undefined" || !gameState.activeSynergies) return;
  
  const activeUltimates = synergyData.filter(s => gameState.activeSynergies.includes(s.id) && s.req.length >= 5);
  if (activeUltimates.length === 0) return;

  activeUltimates.sort((a, b) => b.req.length - a.req.length);
  const bestSynergy = activeUltimates[0];

  const arena = document.querySelector(".battle-arena");
  if (!arena) return;

  const overlay = document.createElement("div");
  overlay.className = "ultimate-synergy-overlay";
  
  let color1 = "rgba(230, 184, 92, 0.8)"; // 5인 시너지 (골드)
  let color2 = "rgba(255, 255, 255, 0.8)";
  if (bestSynergy.req.length >= 8) {
    color1 = "rgba(229, 164, 255, 0.85)"; // 8인 시너지 (신화 핑크)
    color2 = "rgba(100, 200, 255, 0.8)";
  }

  overlay.style.background = `radial-gradient(circle, ${color1} 0%, transparent 70%)`;
  overlay.innerHTML = `
    <div class="ultimate-synergy-light-pillar" style="background: linear-gradient(90deg, transparent, ${color2}, transparent);"></div>
    <div class="ultimate-synergy-text" style="text-shadow: 0 0 10px ${color2}, 0 0 30px ${color1};">${bestSynergy.name}</div>
    <div class="ultimate-synergy-subtext">궁극의 시너지 발동!</div>
  `;
  arena.appendChild(overlay);

  setTimeout(() => {
    if (overlay && overlay.parentNode) overlay.remove();
  }, 3000);
}

function triggerLichSummon(lich) {
  const eCfg = gameConfig.enemyAbilitySettings?.lich || {};
  const skeleton = createEnemyUnit({
    typeKey: "skeleton",
    name: "부활한 해골",
    maxHp: Math.floor(lich.maxHp * (eCfg.summonHpMultiplier ?? 0.35)),
    attack: Math.floor(lich.attack * (eCfg.summonAtkMultiplier ?? 0.5)),
    defense: 0,
    attackSpeed: 0.85
  });
  skeleton.isSummon = true;
  gameState.currentEnemies.push(skeleton);
  addSummonedUnitToDom(skeleton, "enemy");
  playSkillAnimation(lich, "summon-flash");
  addBattleLog(`[스킬] ${lich.name}이 해골 병사를 소환했습니다!`);
}

function applyDefenderTraitsBeforeDamage(target, finalDamage) {
  if (target?.typeKey !== "guardian" || target.currentHp <= 0) return finalDamage;
  const settings = gameConfig.abilitySettings?.guardian || {};
  if (Math.random() >= Number(settings.ironWallChance ?? 0.15)) return finalDamage;
  playSkillAnimation(target, "skill-flash");
  addBattleLog(`[특성] ${formatUnitName(target)}의 철벽이 발동했습니다! 피해가 50% 감소했습니다.`);
  return Math.max(1, Math.floor(finalDamage * Number(settings.ironWallDamageReduction ?? 0.5)));
}

function applyAbilityAfterDamage(contextOrAttacker, target, finalDamage) {
  const context = contextOrAttacker?.attacker
    ? contextOrAttacker
    : { attacker: contextOrAttacker, target, finalDamage };
  const { attacker } = context;
  if (!attacker?.typeKey || attacker.currentHp <= 0) return;

  if (!attacker.grade) { // 몬스터인 경우
    applyEnemyAbilityAfterDamage(context);
    return;
  }

  const settings = gameConfig.abilitySettings || {};

  if (attacker.typeKey === "mage" && !context.isExtraAttack && !context.isAbilityDamage) {
    attacker.mageAttackCount = Number(attacker.mageAttackCount || 0) + 1;
    if (attacker.mageAttackCount >= Number(settings.mage?.flameExplosionAttackCount ?? 4)) {
      attacker.mageAttackCount = 0;
      triggerMageFlameExplosion(attacker);
    }
  }

  if (attacker.typeKey === "healer" && !context.isExtraAttack && !context.isAbilityDamage) {
    attacker.healerAttackCount = Number(attacker.healerAttackCount || 0) + 1;
    const threshold = Number(settings.healer?.healingLightAttackCount ?? 3);
    if (attacker.healerAttackCount >= threshold) {
      attacker.healerAttackCount = 0;
      applyHealerSkill(attacker);
    }
  }
  
  if (attacker.typeKey === "necromancer" && !context.isExtraAttack && !context.isAbilityDamage) {
    attacker.necromancerAttackCount = Number(attacker.necromancerAttackCount || 0) + 1;
    const threshold = Number(settings.necromancer?.summonAttackCount ?? 4);
    if (attacker.necromancerAttackCount >= threshold) {
      attacker.necromancerAttackCount = 0;
      triggerNecromancerSummon(attacker);
    }
  }

  if (attacker.typeKey === "archer" && !context.isExtraAttack && context.target.currentHp > 0) {
    const awakened = isAwakened(attacker);
    const chance = awakened ? 0.40 : Number(settings.archer?.doubleShotChance ?? 0.25);
    if (Math.random() < chance) {
      addBattleLog(`[스킬] ${formatUnitName(attacker)}의 ${awakened ? "폭풍 사격" : "연속 사격"} 발동!`);
      playSkillAnimation(attacker, awakened ? "awakened-flash" : "skill-flash");
      processAttack(attacker, context.target, {
        damageMultiplier: awakened ? 0.80 : Number(settings.archer?.doubleShotDamageMultiplier ?? 0.6),
        isExtraAttack: true
      });
      if (context.target.currentHp > 0) {
        const bleedDps = Math.max(1, Math.floor(context.target.currentHp * 0.05));
        context.target.dots = context.target.dots || [];
        context.target.dots.push({ type: 'bleed', dps: bleedDps, duration: 3000, tickAccumulator: 0 });
        addBattleLog(`[디버프] ${formatUnitName(context.target)}에게 출혈 효과가 적용되었습니다!`);
      }
    }
  }

  if (attacker.typeKey === "bard" && !context.isExtraAttack && !context.isAbilityDamage) {
    attacker.bardAttackCount = Number(attacker.bardAttackCount || 0) + 1;
    const threshold = Number(settings.bard?.heroicEpicAttackCount ?? 3);
    if (attacker.bardAttackCount >= threshold) {
      attacker.bardAttackCount = 0;
      triggerBardSkill(attacker);
    }
  }

  if (attacker.typeKey === "witch" && !context.isExtraAttack && !context.isAbilityDamage) {
    attacker.witchAttackCount = Number(attacker.witchAttackCount || 0) + 1;
    const threshold = Number(settings.witch?.potionAttackCount ?? 2);
    if (attacker.witchAttackCount >= threshold) {
      attacker.witchAttackCount = 0;
      triggerWitchPotion(attacker, context.target);
    }
  }

  if (attacker.typeKey === "skeleton" && attacker.isSummon && !context.isExtraAttack && !context.isAbilityDamage) {
    if (context.target.currentHp > 0 && Math.random() < 0.10) {
      const poisonDps = Math.max(1, Math.floor(attacker.attack * 0.2));
      context.target.dots = context.target.dots || [];
      context.target.dots.push({ type: 'poison', dps: poisonDps, duration: 3000, tickAccumulator: 0 });
      addBattleLog(`[디버프] ${formatUnitName(attacker)}의 뼈 공격으로 ${formatUnitName(context.target)}이(가) 중독되었습니다!`);
    }
  }
}

function applyOnHitAbilities(target) {
  if (target?.typeKey !== "guardian" || target.currentHp <= 0) return;
  if (target.currentHp >= target.maxHp) return; // 체력이 꽉 찼으면 무시

  const settings = gameConfig.abilitySettings?.guardian || {};
  const awakened = isAwakened(target);
  const chance = awakened ? 0.35 : Number(settings.guardian?.guardianWillChance ?? 0.2);
  if (Math.random() >= chance) return;

  const globalHealBonus = 1 + Number(gameState.bonuses.healBonus || 0) + Number(gameState.synergyBonuses?.healBonus || 0);
  const healPercent = awakened ? 0.1 : Number(settings.guardian?.guardianWillHealPercent ?? 0.05);
  const healReduction = target.healDebuffPercent ? (1 - target.healDebuffPercent / 100) : 1;
  const healAmount = Math.max(1, Math.floor(getUnitMaxHp(target) * healPercent * globalHealBonus * Math.max(0, healReduction)));
  const beforeHp = target.currentHp;
  target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
  const healed = target.currentHp - beforeHp;

  if (healed > 0) {
    target.totalHealed = (target.totalHealed || 0) + healed;
    syncTargetHpIfPlayerUnit(target);
    addBattleLog(`[회복] ${formatUnitName(target)}의 ${awakened ? "성역의 의지" : "수호자의 의지"}가 발동했습니다. HP ${healed} 회복!`);
    
    const targetSide = target.grade ? "ally" : "enemy";
    const targetKey = getCombatKey(targetSide, target.id);
    if (!Array.isArray(gameState.pendingCombatEffects)) gameState.pendingCombatEffects = [];
    gameState.pendingCombatEffects.push({
      attackerKey: targetKey,
      targetKey: targetKey,
      attackClass: "heal-flash",
      damage: `+${healed}`,
      duration: 1000
    });
  }
}

function applyAttackSpeedDebuff(target, percent, duration) {
  if (!target || target.currentHp <= 0) return;
  target.attackSpeedDebuffPercent = Math.max(0, Number(percent) || 0);
  target.attackSpeedDebuffDuration = Math.max(0, Number(duration) || 0);
}

function getLowestHpRatioBattleAlly() {
  const aliveAllies = gameState.battleUnits.filter((unit) => unit.currentHp > 0 && unit.currentHp < unit.maxHp);
  if (!aliveAllies.length) return null;
  return aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
}

function hasAliveHealer() {
  return gameState.battleUnits.some((unit) => unit.typeKey === "healer" && unit.currentHp > 0);
}

function hasAliveBard() {
  return gameState.battleUnits.some((unit) => unit.typeKey === "bard" && unit.currentHp > 0);
}

function getBattleHealingBonus() {
  if (!hasAliveHealer()) return 0;
  return Number(gameConfig.abilitySettings?.healer?.lifeTouchHealingBonus ?? 0.1);
}

function healBattleUnit(target, amount, healer) {
  const globalHealBonus = 1 + Number(gameState.bonuses.healBonus || 0) + Number(gameState.synergyBonuses?.healBonus || 0);
  const healReduction = target.healDebuffPercent ? (1 - target.healDebuffPercent / 100) : 1;
  const healAmount = Math.floor(amount * globalHealBonus * Math.max(0, healReduction));
  if (healAmount <= 0 || target.currentHp <= 0) return;
  const beforeHp = target.currentHp;
  target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
  const healed = target.currentHp - beforeHp;
  if (healed > 0) {
    if (healer) healer.totalHealed = (healer.totalHealed || 0) + healed;
    syncTargetHpIfPlayerUnit(target);
    addBattleLog(`[스킬] ${formatUnitName(healer)}의 회복의 빛이 발동했습니다. ${formatUnitName(target)} HP ${healed} 회복!`);
    
    const targetSide = target.grade ? "ally" : "enemy";
    const targetKey = getCombatKey(targetSide, target.id);
    
    if (!Array.isArray(gameState.pendingCombatEffects)) gameState.pendingCombatEffects = [];
    gameState.pendingCombatEffects.push({
      attackerKey: null,
      targetKey,
      attackClass: null,
      damage: `+${healed}`
    });
  }
}

function applyHealerSkill(healer) {
  const target = getLowestHpRatioBattleAlly();
  if (!target) return;
  
  const settings = gameConfig.abilitySettings?.healer || {};
  const awakened = isAwakened(healer);
  const atkMultiplier = awakened ? 2.5 : Number(settings.healingLightHealMultiplier ?? 1.5);
  const hpMultiplier = awakened ? 0.1 : Number(settings.healingLightMaxHpMultiplier ?? 0.05);
  
  const atkHeal = Math.floor(getUnitAttack(healer) * atkMultiplier);
  const hpHeal = Math.floor(target.maxHp * hpMultiplier);
  const baseHeal = atkHeal + hpHeal;
  const finalHeal = Math.floor(baseHeal * (1 + getBattleHealingBonus()));
  
  playSkillAnimation(healer, awakened ? "awakened-flash" : "heal-flash");
  healBattleUnit(target, Math.max(1, finalHeal), healer);
}

function triggerBardSkill(bard) {
  const settings = gameConfig.abilitySettings?.bard || {};
  const awakened = isAwakened(bard);
  
  const aliveAllies = gameState.battleUnits.filter(u => u.currentHp > 0);
  if (!aliveAllies.length) return;
  
  // 공격력이 가장 높은 유닛 탐색
  const target = aliveAllies.sort((a, b) => getUnitAttack(b) - getUnitAttack(a))[0];
  if (!target) return;
  
  const bonus = awakened ? 0.8 : (settings.heroicEpicAtkBonus ?? 0.5);
  const duration = awakened ? 4000 : (settings.heroicEpicDuration ?? 3000);
  
  target.bardAtkBuffPercent = bonus;
  target.bardAtkBuffDuration = duration;
  
  playSkillAnimation(bard, "heal-flash");
  applyTemporaryClass(document.getElementById(`combat-ally-${target.id}`), "skill-flash", 1000);
  addBattleLog(`[스킬] ${formatUnitName(bard)}의 ${awakened ? '전설의' : '영웅의'} 서사시 발동! ${formatUnitName(target)}의 공격력이 뻥튀기됩니다.`);
}

function triggerNecromancerSummon(necromancer) {
  const settings = gameConfig.abilitySettings?.necromancer || {};
  const awakened = isAwakened(necromancer);
  const maxCount = Number(settings.summonMaxCount ?? 2);
  
  const existingSkeletons = gameState.battleUnits.filter((u) => u.isSummon && u.ownerId === necromancer.id && u.currentHp > 0);
  
  if (existingSkeletons.length >= maxCount) {
    const lowest = existingSkeletons.sort((a, b) => a.currentHp - b.currentHp)[0];
    lowest.currentHp = 0;
    lowest.isDead = true;
    markUnitDead(lowest.id, "ally");
    updateCombatCardDom(lowest, "ally");
    triggerCorpseExplosion(lowest);
  }
  
  const skeletonId = `summon-${necromancer.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const hpMulti = Number(settings.skeletonHpMultiplier ?? 0.8);
  const atkMulti = Number(settings.skeletonAtkMultiplier ?? 0.5);
  const defMulti = Number(settings.skeletonDefMultiplier ?? 0.2);
  
  const maxHp = Math.max(1, Math.floor(getUnitMaxHp(necromancer) * hpMulti));
  const attack = Math.max(1, Math.floor(getUnitAttack(necromancer) * atkMulti));
  const inheritedDef = Math.floor(getUnitDefense(necromancer) * defMulti);
  
  const skeleton = {
    id: skeletonId,
    name: awakened ? "강화된 해골" : "해골 병사",
    typeKey: "skeleton",
    grade: necromancer.grade,
    isSummon: true,
    ownerId: necromancer.id,
    maxHp: awakened ? Math.floor(maxHp * 1.3) : maxHp,
    currentHp: awakened ? Math.floor(maxHp * 1.3) : maxHp,
    attack: awakened ? Math.floor(attack * 1.3) : attack,
    atk: awakened ? Math.floor(attack * 1.3) : attack,
    defense: inheritedDef + (awakened ? 15 : 0),
    attackSpeed: awakened ? 1.2 : 1.0,
    baseAttackSpeed: 1.0,
    speed: 1.0,
    attackSpeedBonusPercent: 0,
    attackCooldown: getAttackIntervalMsFromSpeed(1.0),
    cooldown: getAttackIntervalMsFromSpeed(1.0),
    attackSpeedDebuffPercent: 0,
    attackSpeedDebuffDuration: 0,
    isDead: false,
    totalDamageDealt: 0
  };
  
  gameState.battleUnits.push(skeleton);
  addSummonedUnitToDom(skeleton, "ally");
  playSkillAnimation(necromancer, awakened ? "awakened-flash" : "summon-flash");
  addBattleLog(`[스킬] ${formatUnitName(necromancer)}의 어둠의 소환술 발동! 해골 병사가 소환되었습니다.`);
}

function addSummonedUnitToDom(unit, side) {
  const container = document.getElementById(side === "ally" ? "battleAllies" : "battleEnemies");
  if (!container) return;
  
  const emptySlot = container.querySelector(".slot.empty");
  if (emptySlot) emptySlot.remove();
  
  container.insertAdjacentHTML("beforeend", battleCard(unit, side));
}

function triggerCorpseExplosion(skeleton) {
  const necromancer = gameState.battleUnits.find((u) => u.id === skeleton.ownerId);
  if (!necromancer) return;
  
  const settings = gameConfig.abilitySettings?.necromancer || {};
  const targetsCount = Number(settings.corpseExplosionTargets ?? 2);
  const damageMulti = Number(settings.corpseExplosionDamageMultiplier ?? 2.0);
  
  const enemies = getAliveEnemies();
  if (!enemies.length) return;
  
  const targets = [...enemies].sort(() => Math.random() - 0.5).slice(0, targetsCount);
  addBattleLog(`[특성] 파괴된 해골 병사의 시체 폭발! (강령술사 마법 피해)`);
  
  playSkillAnimation(skeleton, "summon-flash");
  targets.forEach((enemy) => {
    if (enemy.currentHp > 0) {
      processAttack(necromancer, enemy, {
        damageMultiplier: damageMulti,
        isAbilityDamage: true,
        skipAttackerAbilities: true
      });
      if (enemy.currentHp > 0) {
        const poisonDps = Math.max(1, Math.floor(necromancer.attack * 0.2));
        enemy.dots = enemy.dots || [];
        enemy.dots.push({ type: 'poison', dps: poisonDps, duration: 3000, tickAccumulator: 0 });
        addBattleLog(`[디버프] 시체 폭발의 여파로 ${enemy.name}이(가) 중독되었습니다!`);
      }
    }
  });
}

function triggerMageFlameExplosion(attacker) {
  const settings = gameConfig.abilitySettings?.mage || {};
  const awakened = isAwakened(attacker);
  const enemies = getAliveEnemies();
  if (!enemies.length) return;
  const targetCount = awakened ? enemies.length : Math.min(enemies.length, randomIntegerBetween(Number(settings.flameExplosionMinTargets ?? 3), Number(settings.flameExplosionMaxTargets ?? 5)));
  const targets = [...enemies].sort(() => Math.random() - 0.5).slice(0, targetCount);
  addBattleLog(`[스킬] ${formatUnitName(attacker)}의 ${awakened ? '메테오 스트라이크' : '화염 폭발'} 발동!`);
  playSkillAnimation(attacker, awakened ? "awakened-flash" : "skill-flash");
  targets.forEach((enemy) => {
    if (enemy.currentHp > 0) {
      processAttack(attacker, enemy, {
        damageMultiplier: (awakened ? 1.2 : Number(settings.flameExplosionDamageMultiplier ?? 1)),
        isAbilityDamage: true,
        skipAttackerAbilities: true
      });
      if (enemy.currentHp > 0) {
        const burnDps = Math.max(1, Math.floor(enemy.maxHp * 0.02));
        enemy.dots = enemy.dots || [];
        enemy.dots.push({ type: 'burn', dps: burnDps, duration: 3000, tickAccumulator: 0 });
        addBattleLog(`[디버프] ${enemy.name}에게 화상 효과가 적용되었습니다!`);
      }
    }
  });
}

function triggerWitchPotion(attacker, target) {
  if (target.currentHp <= 0) return;
  const settings = gameConfig.abilitySettings?.witch || {};
  const awakened = isAwakened(attacker);
  const percent = awakened ? 0.01 : Number(settings.maxHpDecreasePercent ?? 0.005);
  
  const loss = Math.max(1, Math.floor(target.maxHp * percent));
  target.maxHp = Math.max(1, target.maxHp - loss);
  if (target.currentHp > target.maxHp) target.currentHp = target.maxHp;
  
  attacker.witchAbsorbedStats = (attacker.witchAbsorbedStats || 0) + loss;
  attacker.currentHp += loss;
  attacker.totalDamageDealt = (attacker.totalDamageDealt || 0) + loss;
  target.totalDamageTaken = (target.totalDamageTaken || 0) + loss;
  
  playSkillAnimation(attacker, awakened ? "awakened-flash" : "skill-flash");
  const targetSide = target.grade ? "ally" : "enemy";
  applyTemporaryClass(document.getElementById(`combat-${getCombatKey(targetSide, target.id)}`), "poison-shake", 400);
  
  addBattleLog(`[스킬] ${formatUnitName(attacker)}의 맹독 물약! ${formatUnitName(target)}의 최대 체력을 ${loss} 깎고 능력치를 흡수합니다!`);
}

function syncTargetHpIfPlayerUnit(target) {
  if (!target?.grade) return;
  const ownedUnit = gameState.ownedUnits.find((unit) => unit.id === target.id);
  if (ownedUnit) {
    const extraHp = target.extraHpFromBuffs || 0;
    ownedUnit.currentHp = Math.max(0, Math.min(ownedUnit.maxHp, target.currentHp - extraHp));
  }
}

function clearRewardTransitionTimers() {
  if (gameState.rewardTransitionTimer) {
    clearTimeout(gameState.rewardTransitionTimer);
    gameState.rewardTransitionTimer = null;
  }
  if (gameState.rewardTransitionCountdownTimer) {
    clearInterval(gameState.rewardTransitionCountdownTimer);
    gameState.rewardTransitionCountdownTimer = null;
  }
  gameState.pendingRewardDelaySeconds = 0;
  gameState.pendingRewardRoomType = "";
  gameState.isWaitingForReward = false;
}

function updateBattleMessageDom() {
  const messageElement = document.querySelector(".battle-screen .message");
  if (messageElement) messageElement.textContent = gameState.message || "";

  const startButton = document.getElementById("centerStartButton");
  if (startButton) {
    startButton.disabled = gameState.isBattleActive || !canStartBattle();
    if (gameState.isBattleActive) {
      startButton.parentElement.style.display = 'none';
    }
  }

  const statusElement = document.querySelector(".battle-status");
  let skipButton = document.getElementById("skipRewardButton");
  if (gameState.isWaitingForReward) {
    if (!skipButton && statusElement) {
      skipButton = document.createElement("button");
      skipButton.id = "skipRewardButton";
      skipButton.className = "reward-skip-button";
      skipButton.type = "button";
      skipButton.onclick = skipRewardDelayToRewardRoom;
      statusElement.appendChild(skipButton);
    }
    if (skipButton) skipButton.textContent = "바로 이동하기 (Space)";
  } else if (skipButton) {
    skipButton.remove();
  }
}

function delayRewardRoomTransition(roomType, delaySeconds = 10) {
  clearRewardTransitionTimers();

  gameState.isWaitingForReward = true;
  gameState.pendingRewardRoomType = roomType;
  gameState.pendingRewardDelaySeconds = delaySeconds;
  setMessage(`전투 종료! ${delaySeconds}초 뒤 보상방으로 이동합니다.`);
  addBattleLog(`${delaySeconds}초 뒤 보상방으로 이동합니다.`);
  updateBattleMessageDom();
  renderBattleLogs();

  gameState.rewardTransitionCountdownTimer = setInterval(() => {
    gameState.pendingRewardDelaySeconds = Math.max(0, gameState.pendingRewardDelaySeconds - 1);

    if (gameState.pendingRewardDelaySeconds > 0) {
      setMessage(`전투 종료! ${gameState.pendingRewardDelaySeconds}초 뒤 보상방으로 이동합니다.`);
      updateBattleMessageDom();
      return;
    }

    if (gameState.rewardTransitionCountdownTimer) {
      clearInterval(gameState.rewardTransitionCountdownTimer);
      gameState.rewardTransitionCountdownTimer = null;
    }
  }, 1000);

  gameState.rewardTransitionTimer = setTimeout(() => {
    clearRewardTransitionTimers();
    gameState.currentEnemies = [];
    clearRoom(roomType);
  }, delaySeconds * 1000);
}

function skipRewardDelayToRewardRoom() {
  if (!gameState.isWaitingForReward) return;

  const roomType = gameState.pendingRewardRoomType || gameState.currentRoomType || gameState.lastClearedRoomType || "battle";
  addBattleLog("바로 이동하기를 눌러 보상방으로 이동합니다.");
  clearRewardTransitionTimers();
  gameState.currentEnemies = [];
  clearRoom(roomType);
}

function clearGameOverTransitionTimers() {
  if (gameState.gameOverTransitionTimer) {
    clearTimeout(gameState.gameOverTransitionTimer);
    gameState.gameOverTransitionTimer = null;
  }
  if (gameState.gameOverTransitionCountdownTimer) {
    clearInterval(gameState.gameOverTransitionCountdownTimer);
    gameState.gameOverTransitionCountdownTimer = null;
  }
  gameState.isWaitingForGameOver = false;
  gameState.pendingGameOverDelaySeconds = 0;
}

function delayGameOverTransition(delaySeconds = 5) {
  clearGameOverTransitionTimers();

  gameState.isWaitingForGameOver = true;
  gameState.pendingGameOverDelaySeconds = delaySeconds;
  setMessage(`전투 패배! ${delaySeconds}초 뒤 게임 오버 화면으로 이동합니다.`);
  addBattleLog(`${delaySeconds}초 뒤 게임 오버 화면으로 이동합니다.`);
  updateBattleMessageDom();
  renderBattleLogs();

  gameState.gameOverTransitionCountdownTimer = setInterval(() => {
    gameState.pendingGameOverDelaySeconds = Math.max(0, gameState.pendingGameOverDelaySeconds - 1);

    if (gameState.pendingGameOverDelaySeconds > 0) {
      setMessage(`전투 패배! ${gameState.pendingGameOverDelaySeconds}초 뒤 게임 오버 화면으로 이동합니다.`);
      updateBattleMessageDom();
      return;
    }

    if (gameState.gameOverTransitionCountdownTimer) {
      clearInterval(gameState.gameOverTransitionCountdownTimer);
      gameState.gameOverTransitionCountdownTimer = null;
    }
  }, 1000);

  gameState.gameOverTransitionTimer = setTimeout(() => {
    clearGameOverTransitionTimers();
    gameState.currentEnemies = [];
    gameState.screen = "gameover";
    render();
  }, delaySeconds * 1000);
}

function finishBattle(isWin) {
  clearInterval(gameState.battleTimer);
  gameState.battleTimer = null;
  gameState.lastBattleTickTime = 0;
  gameState.isBattleActive = false;

  // 마지막 공격으로 전투가 끝난 경우에도 공격 모션과 데미지 팝업이 끊기지 않도록
  // 전체 렌더링 대신 현재 DOM만 부분 갱신한다.
  updateBattleUiAfterAttacks();
  flushCombatEffectsToDom();

  syncBattleHpToOwnedUnits();
  removeDeadPlayerUnits();

  if (!isWin) {
    addBattleLog("패배했습니다.");
    if (typeof updateHallOfFame === "function") updateHallOfFame();
    if (gameState.isAiEnabled) {
      gameState.currentEnemies = [];
      gameState.screen = "gameover";
      render();
    } else {
      delayGameOverTransition(5);
    }
    return;
  }

  const clearedRoomType = gameState.currentRoomType;
  const gold = grantBattleGold(clearedRoomType);
  addBattleLog("전투 승리!");
  addBattleLog(`골드 ${gold}을 획득했습니다.`);
  addLog(`전투 승리! 골드 ${gold}을 획득했습니다.`);

  if (clearedRoomType === "boss") {
    gameState.gems = (gameState.gems || 0) + 1;
    addBattleLog(`보석 1개를 획득했습니다.`);
    addLog(`보스 처치 보상으로 보석 1개를 획득했습니다.`);
    if (typeof saveMetaProgress === "function") saveMetaProgress();
  } else if (clearedRoomType === "battle" && Math.random() < 0.01) {
    // 일반 전투 승리 시 1% 확률로 보석 획득
    gameState.gems = (gameState.gems || 0) + 1;
    addBattleLog(`보석 1개를 추가로 발견했습니다.`);
    addLog(`전투 승리 전리품으로 보석 1개를 추가로 획득했습니다.`);
    if (typeof saveMetaProgress === "function") saveMetaProgress();
  }

  // 승리 후 바로 보상방으로 넘어가지 않고, 전투 결과와 로그를 10초 동안 보여준다.
  if (gameState.isAiEnabled) {
    gameState.currentEnemies = [];
    clearRoom(clearedRoomType);
  } else {
    delayRewardRoomTransition(clearedRoomType, 10);
  }
}

function syncBattleHpToOwnedUnits() {
  gameState.battleUnits.forEach((battleUnit) => {
    const unit = gameState.ownedUnits.find((entry) => entry.id === battleUnit.id);
    if (unit) {
      const extraHp = battleUnit.extraHpFromBuffs || 0;
      unit.currentHp = Math.max(0, Math.min(unit.maxHp, battleUnit.currentHp - extraHp));
      if (battleUnit.typeKey === "witch" && battleUnit.witchAbsorbedStats) {
        unit.witchAbsorbedStats = battleUnit.witchAbsorbedStats;
      }
    }
  });
}

function playAttackAnimation(attackerId, targetId, attackerSide, targetSide, damage, isCrit = false) {
  const attackerKey = getCombatKey(attackerSide, attackerId);
  const targetKey = getCombatKey(targetSide, targetId);
  const attackClass = attackerSide === "ally" ? "attack-ally" : "attack-enemy";

  if (!Array.isArray(gameState.pendingCombatEffects)) gameState.pendingCombatEffects = [];
  gameState.pendingCombatEffects.push({
    attackerKey,
    targetKey,
    attackClass,
    damage,
    isCrit
  });
}

function playSkillAnimation(unit, flashClass = "skill-flash") {
  const side = unit.grade ? "ally" : "enemy"; // player 유닛만 grade를 가집니다.
  const key = getCombatKey(side, unit.id);
  if (!Array.isArray(gameState.pendingCombatEffects)) gameState.pendingCombatEffects = [];
  gameState.pendingCombatEffects.push({
    attackerKey: key,
    targetKey: null,
    attackClass: flashClass,
    damage: null,
    duration: 1000
  });
}

function applyTemporaryClass(element, className, duration = 460) {
  if (!element || !className) return;
  const token = `${Date.now()}-${Math.random()}`;
  const tokenKey = `animationToken${className.replace(/[^a-zA-Z0-9]/g, "")}`;

  element.dataset[tokenKey] = token;
  element.classList.remove(className);
  // 같은 카드가 연속으로 공격하거나 맞아도 애니메이션이 1회씩 새로 재생되도록 강제 리플로우를 준다.
  void element.offsetWidth;
  element.classList.add(className);

  setTimeout(() => {
    if (element.dataset[tokenKey] === token) {
      element.classList.remove(className);
      delete element.dataset[tokenKey];
    }
  }, duration);
}

function addDamagePopupToDom(targetKey, damage, isCrit = false) {
  const targetElement = document.getElementById(`combat-${targetKey}`);
  if (!targetElement) return;

  const popup = document.createElement("span");
  const isHeal = String(damage).startsWith("+");
  popup.className = isHeal ? "heal-popup" : (isCrit ? "damage-popup crit-popup" : "damage-popup");
  popup.textContent = isHeal ? damage : `-${damage}`;
  targetElement.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 1250);
}

function flushCombatEffectsToDom() {
  if (!Array.isArray(gameState.pendingCombatEffects) || gameState.pendingCombatEffects.length === 0) return;

  const effects = gameState.pendingCombatEffects.splice(0);
  effects.forEach((effect) => {
    if (effect.attackerKey && effect.attackClass) {
      const attackerElement = document.getElementById(`combat-${effect.attackerKey}`);
      applyTemporaryClass(attackerElement, effect.attackClass, effect.duration || 460);
    }
    if (effect.targetKey && effect.damage != null) {
      if (effect.isDot) {
        const targetElement = document.getElementById(`combat-${effect.targetKey}`);
        if (targetElement) {
          const popup = document.createElement("span");
          popup.className = `damage-popup dot-popup ${effect.dotType}`;
          popup.textContent = `-${effect.damage}`;
          targetElement.appendChild(popup);
          setTimeout(() => popup.remove(), 1250);

          const dotClass = effect.dotType === "burn" ? "burn-shake" : (effect.dotType === "poison" ? "poison-shake" : "bleed-shake");
          applyTemporaryClass(targetElement, dotClass, 400);
        }
      } else {
        addDamagePopupToDom(effect.targetKey, effect.damage, effect.isCrit);
        if (!String(effect.damage).startsWith("+")) {
          const targetElement = document.getElementById(`combat-${effect.targetKey}`);
          applyTemporaryClass(targetElement, "hit-shake", 400);
        }
      }
    }
  });
}


function updateBattleUiAfterAttacks() {
  renderBattleLogs();

  // 배속 버튼 등 UI 요소가 추가되어도 안전하게 작동하도록 클래스 배열 기반 갱신으로 리팩토링
  const pills = document.querySelectorAll(".battle-status .pill");
  if (pills.length >= 2) {
    pills[0].textContent = `아군 ${gameState.battleUnits.filter((unit) => unit.currentHp > 0).length}`;
    pills[1].textContent = `적 ${getAliveEnemies().length}`;
  }

  if (gameState.commanderSpells) {
      const healSpell = gameState.commanderSpells.heal;
      const strikeSpell = gameState.commanderSpells.strike;
      const healBtn = document.getElementById("spellBtnHeal");
      const strikeBtn = document.getElementById("spellBtnStrike");
      if (healBtn) {
          healBtn.disabled = healSpell.current > 0 || !gameState.isBattleActive;
          healBtn.querySelector(".spell-cooldown-overlay").style.height = `${(healSpell.current / healSpell.cooldown) * 100}%`;
      }
      if (strikeBtn) {
          strikeBtn.disabled = strikeSpell.current > 0 || !gameState.isBattleActive;
          strikeBtn.querySelector(".spell-cooldown-overlay").style.height = `${(strikeSpell.current / strikeSpell.cooldown) * 100}%`;
      }
  }
  gameState.battleUnits.forEach((unit) => updateCombatCardDom(unit, "ally"));
  gameState.currentEnemies.forEach((enemy) => updateCombatCardDom(enemy, "enemy"));

  const boss = gameState.currentEnemies.find((e) => e.type === "boss");
  if (boss) {
    const fillEl = document.getElementById("arenaBossHpFill");
    const textEl = document.getElementById("arenaBossHpText");
    const timerEl = document.getElementById("arenaBossTimer");
    if (fillEl && textEl) {
      const maxHp = Math.max(1, boss.maxHp);
      const currentHp = Math.max(0, boss.currentHp);
      const hpRatio = currentHp / maxHp;
      fillEl.style.width = `${hpRatio * 100}%`;
      textEl.textContent = `${Math.ceil(currentHp)} / ${maxHp}`;
    }
    if (timerEl) {
      const timeLeftStr = Math.max(0, Math.ceil((gameState.battleTimeLeft || 0) / 1000));
      if (boss.isTimeAttackEnraged) {
        timerEl.textContent = "광폭화 상태!";
        timerEl.style.color = "var(--red)";
        timerEl.classList.add("urgent-timer");
      } else {
        timerEl.textContent = `남은 시간: ${timeLeftStr}초`;
        timerEl.style.color = timeLeftStr <= 10 ? "var(--red)" : "var(--gold)";
        if (timeLeftStr <= 10) timerEl.classList.add("urgent-timer");
        else timerEl.classList.remove("urgent-timer");
      }
    }
  }
}

function updateCombatCardDom(unit, side) {
  const key = getCombatKey(side, unit.id);
  const card = document.getElementById(`combat-${key}`);
  if (!card) return;

  const isAlly = side === "ally";
  const normalized = isAlly ? normalizePlayerUnit(unit) : normalizeEnemyStats(unit);
  const stats = isAlly
    ? (Number.isFinite(Number(unit.atk)) && Number.isFinite(Number(unit.speed)) ? unit : getUnitStats(unit, true))
    : normalized;

  const maxHp = Math.max(1, Number(stats.maxHp) || Number(normalized.maxHp) || 1);
  const currentHp = Math.max(0, Number(unit.currentHp ?? maxHp) || 0);
  const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
  const dead = currentHp <= 0 || unit.isDead === true || gameState.deadUnitIds.includes(key);

  const hpEl = card.querySelector(".hp");
  const atkEl = card.querySelector(".atk");
  const defEl = card.querySelector(".def");
  const spdEl = card.querySelector(".spd");
  const stateEl = card.querySelector(".state");
  const dmgEl = card.querySelector(".dmg");
  const barFill = card.querySelector(".bar-fill");

  const hpBonus = (isAlly && stats.maxHp > stats.baseMaxHp) ? ` <small style="color:var(--gold)">(+${stats.maxHp - stats.baseMaxHp})</small>` : "";
  const atkBonus = (isAlly && stats.atk > stats.baseAttack) ? ` <small style="color:var(--gold)">(+${stats.atk - stats.baseAttack})</small>` : "";
  const defBonus = (isAlly && stats.defense > stats.baseDefense) ? ` <small style="color:var(--gold)">(+${stats.defense - stats.baseDefense})</small>` : "";
  let spdBonus = "";
  if (isAlly) {
    const spdDiff = stats.speed - stats.baseAttackSpeed;
    if (spdDiff > 0.001) spdBonus = ` <small style="color:var(--gold)">(+${formatAttackSpeedValue(spdDiff)})</small>`;
    else if (spdDiff < -0.001) spdBonus = ` <small style="color:var(--red)">(${formatAttackSpeedValue(spdDiff)})</small>`;
  }

  if (hpEl) hpEl.innerHTML = `HP ${Math.ceil(currentHp)} / ${Math.ceil(maxHp)}${hpBonus}`;
  if (atkEl) atkEl.innerHTML = isAlly ? `공격력 ${stats.atk}${atkBonus}` : `ATK ${stats.attack ?? stats.atk ?? 1}`;
  if (defEl) defEl.innerHTML = isAlly ? `방어력 ${stats.defense}${defBonus}` : `DEF ${stats.defense ?? 0}`;
  if (spdEl) spdEl.innerHTML = isAlly ? `공격 속도 ${formatAttackSpeedValue(stats.speed)}${spdBonus}` : `AS ${formatAttackSpeedValue(stats.speed)}`;
  if (dmgEl && isAlly) dmgEl.textContent = `딜량 ${unit.totalDamageDealt || 0}`;
  if (stateEl) stateEl.textContent = `상태 ${dead ? "전투불능" : "전투 가능"}`;
  if (barFill) {
    barFill.style.width = `${hpRatio * 100}%`;
    barFill.classList.toggle("danger", hpRatio <= 0.35);
  }

  const nameSpan = card.querySelector(".name > span:first-child");
  if (nameSpan) {
    const emblemBadge = (isAlly && (gameState.inventoryItems || []).some(item => item.key === `emblem_${unit.typeKey}`)) ? `<span class="emblem-badge" title="직업 문장 효과 적용 중"></span>` : "";
    nameSpan.innerHTML = `${unit.name}${emblemBadge}${renderBuffIcons(unit)}`;
  }

  card.classList.toggle("dead", dead);
  const hasKoLabel = !!card.querySelector(".ko-label");
  if (dead && !hasKoLabel) {
    card.insertAdjacentHTML("beforeend", `<strong class="ko-label">KO</strong>`);
  }
  if (!dead && hasKoLabel) {
    card.querySelector(".ko-label")?.remove();
  }
}

function showDamagePopup(targetId, damage, targetSide = "enemy") {
  gameState.damagePopups.push({
    id: gameState.nextPopupId++,
    key: getCombatKey(targetSide, targetId),
    damage
  });
}

function markUnitDead(unitId, side = "enemy") {
  const key = getCombatKey(side, unitId);
  if (!gameState.deadUnitIds.includes(key)) {
    gameState.deadUnitIds.push(key);
  }
}

function grantBattleGold(roomType) {
  const reward = calculateBattleGoldReward(roomType);
  if (reward.bonusApplied) {
    addBattleLog(`적 수가 더 많아 위험 전투 보너스가 적용되었습니다. 골드 x${reward.multiplier.toFixed(1)}`);
  }
  const gold = reward.gold;
  gameState.gold += gold;
  return gold;
}

function calculateBattleGoldReward(roomType) {
  const upgradeMultiplier = 1 + ((gameState.upgradeLevels?.goldBonus || 0) * 0.05);

  if (roomType === "boss") {
    return {
      gold: Math.floor(randomIntegerBetween(gameConfig.rewards.bossGoldMin, gameConfig.rewards.bossGoldMax) * upgradeMultiplier),
      bonusApplied: false,
      multiplier: upgradeMultiplier
    };
  }

  const baseGold = randomIntegerBetween(gameConfig.rewards.battleGoldMin, gameConfig.rewards.battleGoldMax);
  let multiplier = 1;
  let bonusApplied = false;

  if (gameState.lastBattleEnemyUnitCount > gameState.lastBattlePlayerUnitCount) {
    bonusApplied = true;
    multiplier = randomBetween(gameConfig.goldBonus.outnumberedMinMultiplier, gameConfig.goldBonus.outnumberedMaxMultiplier);
  }

  return {
    gold: Math.floor(baseGold * multiplier * upgradeMultiplier),
    bonusApplied,
    multiplier: multiplier * upgradeMultiplier
  };
}

window.castCommanderSpell = function(type) {
  if (!gameState.isBattleActive) return;
  if (!gameState.commanderSpells || gameState.commanderSpells[type].current > 0) return;

  if (type === 'heal') {
      gameState.commanderSpells.heal.current = gameState.commanderSpells.heal.cooldown;
      playActionSound();
      const allies = gameState.battleUnits.filter(u => u.currentHp > 0);
      allies.forEach(u => {
          u.attackSpeedDebuffPercent = 0;
          u.attackSpeedDebuffDuration = 0;
          u.healDebuffPercent = 0;
          u.healDebuffDuration = 0;
          u.stunDuration = 0;
          u.dots = [];
          const healAmt = Math.max(1, Math.floor(u.maxHp * 0.15));
          const beforeHp = u.currentHp;
          u.currentHp = Math.min(u.maxHp, u.currentHp + healAmt);
          const healed = u.currentHp - beforeHp;
          if (healed > 0) {
            syncTargetHpIfPlayerUnit(u);
            if (!Array.isArray(gameState.pendingCombatEffects)) gameState.pendingCombatEffects = [];
            gameState.pendingCombatEffects.push({ attackerKey: null, targetKey: `ally-${u.id}`, attackClass: "heal-flash", damage: `+${healed}`, duration: 1000 });
          }
      });
      addBattleLog(`[사령관 주문] 신성한 강림! 아군의 상태 이상이 해제되고 체력이 회복됩니다.`);
  } else if (type === 'strike') {
      gameState.commanderSpells.strike.current = gameState.commanderSpells.strike.cooldown;
      playActionSound();
      const enemies = getAliveEnemies();
      if (enemies.length === 0) return;
      const target = enemies.sort((a,b) => b.currentHp - a.currentHp)[0];
      const dmg = (gameState.currentStage * 100) + 100;
      target.currentHp -= dmg;
      target.totalDamageTaken = (target.totalDamageTaken || 0) + dmg;
      target.stunDuration = Math.max(target.stunDuration || 0, 2000);
      showDamagePopup(target.id, dmg, "enemy");
      applyTemporaryClass(document.getElementById(`combat-enemy-${target.id}`), "skill-flash", 1000);
      addBattleLog(`[사령관 주문] 벼락! ${target.name}에게 ${dmg} 고정 피해 및 2초 기절!`);
      if (target.currentHp <= 0) { target.isDead = true; markUnitDead(target.id, "enemy"); addBattleLog(`${target.name} 처치됨!`); }
  }
  updateBattleUiAfterAttacks();
};

window.toggleAutoCast = function() {
  gameState.autoCastSpells = !gameState.autoCastSpells;
  if (typeof saveMetaProgress === "function") saveMetaProgress();
  render();
};

window.openBattleStatsModal = function() {
  gameState.isBattleStatsModalOpen = true;
  render();
};

window.closeBattleStatsModal = function() {
  gameState.isBattleStatsModalOpen = false;
  render();
};

window.renderBattleStatsModal = function() {
  const units = gameState.battleUnits.filter(u => u.grade);
  if (!units.length) return '';

  const maxDamage = Math.max(1, ...units.map(u => u.totalDamageDealt || 0));
  const maxTaken = Math.max(1, ...units.map(u => u.totalDamageTaken || 0));
  const maxHeal = Math.max(1, ...units.map(u => u.totalHealed || 0));

  const rows = units.sort((a,b) => (b.totalDamageDealt||0) - (a.totalDamageDealt||0)).map(unit => {
    const dmgRatio = ((unit.totalDamageDealt || 0) / maxDamage) * 100;
    const takenRatio = ((unit.totalDamageTaken || 0) / maxTaken) * 100;
    const healRatio = ((unit.totalHealed || 0) / maxHeal) * 100;
    
    return `
      <div style="margin-bottom: 16px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong style="color: #fff;">${formatUnitName(unit)}</strong>
        </div>
        <div style="display: grid; grid-template-columns: 50px 1fr 60px; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12px;">
          <span style="color: var(--red);">피해량</span>
          <div style="background: rgba(0,0,0,0.5); height: 8px; border-radius: 4px; overflow: hidden;"><div style="width: ${dmgRatio}%; height: 100%; background: var(--red);"></div></div>
          <span style="text-align: right;">${(unit.totalDamageDealt || 0).toLocaleString()}</span>
        </div>
        <div style="display: grid; grid-template-columns: 50px 1fr 60px; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12px;">
          <span style="color: var(--gold);">받은피해</span>
          <div style="background: rgba(0,0,0,0.5); height: 8px; border-radius: 4px; overflow: hidden;"><div style="width: ${takenRatio}%; height: 100%; background: var(--gold);"></div></div>
          <span style="text-align: right;">${(unit.totalDamageTaken || 0).toLocaleString()}</span>
        </div>
        <div style="display: grid; grid-template-columns: 50px 1fr 60px; align-items: center; gap: 8px; font-size: 12px;">
          <span style="color: var(--green);">회복량</span>
          <div style="background: rgba(0,0,0,0.5); height: 8px; border-radius: 4px; overflow: hidden;"><div style="width: ${healRatio}%; height: 100%; background: var(--green);"></div></div>
          <span style="text-align: right;">${(unit.totalHealed || 0).toLocaleString()}</span>
        </div>
      </div>`;
  }).join("");

  return `
    <div class="modal-backdrop" onclick="closeBattleStatsModal()" style="z-index: 9999;">
      <section class="panel squad-preview-modal" style="max-width: 500px; padding: 24px;" onclick="event.stopPropagation()">
        <div class="modal-header" style="margin-bottom: 20px;">
          <h2 style="color: #fff; margin: 0;">전투 통계 (DPS 미터기)</h2>
          <button onclick="closeBattleStatsModal()">닫기</button>
        </div>
        <div style="max-height: 60vh; overflow-y: auto; padding-right: 8px;">${rows}</div>
      </section>
    </div>`;
};