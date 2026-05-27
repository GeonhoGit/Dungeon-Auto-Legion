// ==========================================
// 재조합 시스템 (Re/recombination.js)
// ==========================================

function openRecombinationModal() {
  gameState.isRecombinationModalOpen = true;
  gameState.lastRecombinationResult = null;
  gameState.isRecombinationGreatSuccess = false;
  render();
}

function closeRecombinationModal() {
  gameState.isRecombinationModalOpen = false;
  gameState.recombinationSlots = [];
  gameState.isRecombinationGreatSuccess = false;
  render();
}

function renderRecombinationModal() {
  cleanupRecombinationSlots();
  const selectedUnits = gameState.recombinationSlots
    .map((id) => getBenchUnits().find((unit) => unit.id === id))
    .filter(Boolean);
  const candidates = getBenchUnits();
  const hasGradeMismatch = selectedUnits.length === 2 && selectedUnits[0].grade !== selectedUnits[1].grade;
  const warning = hasGradeMismatch ? "같은 등급의 유닛끼리만 재조합할 수 있습니다." : "";

  return `
    <div class="modal-backdrop" onclick="closeRecombinationModal()">
      <section class="panel squad-preview-modal" style="max-width: 800px;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>재조합</h2>
          <button onclick="closeRecombinationModal()">닫기</button>
        </div>
        <p class="hint" style="margin-bottom: 16px;">같은 등급의 유닛 2개를 소모해 같은 등급의 랜덤 유닛 1개를 얻습니다.</p>
        <div style="background: rgba(0,0,0,0.25); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;">
          <h3 style="margin-top: 0; margin-bottom: 12px; color: var(--gold); text-align: center;">합성할 카드</h3>
          <div class="recombination-slots">
            ${[0, 1].map((index) => {
              const unit = selectedUnits[index];
              const slotHtml = unit
                ? unitCard(unit, `class="card recombination-slot filled" onclick="removeUnitFromRecombination(${unit.id})"`)
                : `<div class="slot empty" style="min-height: 160px; height: 100%;">재조합 슬롯 ${index + 1}</div>`;
              
              if (index === 0) {
                return slotHtml + `<div style="font-size: 28px; color: var(--muted); font-weight: bold; text-align: center;">+</div>`;
              }
              return slotHtml;
            }).join("")}
          </div>
        </div>
        <h3>대기 중인 카드 <small style="color:var(--muted); font-weight:normal;">(클릭하여 선택)</small></h3>
        <div class="unit-grid recombination-candidates" style="margin-bottom: 20px;">
        ${candidates.length ? candidates.map((unit) => {
          const selected = gameState.recombinationSlots.includes(unit.id);
          return unitCard(unit, `class="card recombination-candidate ${selected ? "selected" : ""}" onclick="selectUnitForRecombination(${unit.id})"`);
        }).join("") : `<div class="slot empty">대기 중인 카드가 없습니다.</div>`}
      </div>
      <div class="actions">
          <button class="primary" onclick="recombineUnits()" ${canRecombineUnits() ? "" : "disabled"}>재조합 실행</button>
          <span class="message" style="margin-left: 12px;">${warning || gameState.message}</span>
      </div>
        ${gameState.lastRecombinationResult ? `<div class="recombination-result ${gameState.isRecombinationGreatSuccess ? 'great-success-anim' : ''}" style="margin-top: 16px;"><h4>${gameState.isRecombinationGreatSuccess ? '<span style="color:#e5a4ff; text-shadow: 0 0 8px rgba(229,164,255,0.6);">대성공!</span>' : '결과'}</h4>${unitCard(gameState.lastRecombinationResult)}</div>` : ""}
      </section>
    </div>
  `;
}

function selectUnitForRecombination(unitId) {
  if (gameState.isBattleActive) {
    setMessage("전투 중에는 재조합할 수 없습니다.");
    render();
    return;
  }
  const unit = getBenchUnits().find((entry) => entry.id === unitId);
  if (!unit) {
    setMessage("필드에 배치된 유닛은 재조합할 수 없습니다.");
    render();
    return;
  }
  if (unit.currentHp <= 0) return;
  if (gameState.recombinationSlots.includes(unitId)) {
    removeUnitFromRecombination(unitId);
    return;
  }
  if (gameState.recombinationSlots.length >= 2) {
    gameState.recombinationSlots.shift();
  }
  gameState.recombinationSlots.push(unitId);
  render();
}

function removeUnitFromRecombination(unitId) {
  gameState.recombinationSlots = gameState.recombinationSlots.filter((id) => id !== unitId);
  render();
}

function canRecombineUnits() {
  if (gameState.isBattleActive || gameState.recombinationSlots.length !== 2) return false;
  const benchUnits = getBenchUnits();
  const benchUnitIds = new Set(benchUnits.map((unit) => unit.id));
  const units = gameState.recombinationSlots
    .map((id) => benchUnits.find((unit) => unit.id === id))
    .filter(Boolean);
  return gameState.recombinationSlots.every((id) => benchUnitIds.has(id))
    && units.length === 2
    && units.every((unit) => unit.currentHp > 0)
    && units[0].grade === units[1].grade;
}

function createRandomUnitByGrade(grade) {
  return randomUnit(grade);
}

function removeUnitCompletely(unitId) {
  gameState.ownedUnits = gameState.ownedUnits.filter((unit) => unit.id !== unitId);
  gameState.fieldUnits = gameState.fieldUnits.filter((id) => id !== unitId);
  gameState.recombinationSlots = gameState.recombinationSlots.filter((id) => id !== unitId);
}

function recombineUnits() {
  if (!canRecombineUnits()) {
    setMessage("같은 등급의 유닛끼리만 재조합할 수 있습니다.");
    render();
    return;
  }
  gameState.isRecombining = true;
  const units = gameState.recombinationSlots.map((id) => gameState.ownedUnits.find((unit) => unit.id === id));
  const grade = units[0].grade;
  
  // 설정된 확률(기본 20%)로 대성공(1단계 더 높은 등급 등장, 최대 5성)
  const baseChance = (gameConfig.recombination || {}).greatSuccessChance ?? 0.2;
  const bonusChance = (gameState.upgradeLevels?.recombChance || 0) * 0.01;
  const chance = baseChance + bonusChance;
  const currentMax = gameState.maxUnitGrade || 5;
  const isGreatSuccess = grade < currentMax && Math.random() < chance;
  const targetGrade = isGreatSuccess ? grade + 1 : grade;
  
  const result = createRandomUnitByGrade(targetGrade);
  const message = isGreatSuccess 
    ? `대성공! ${units[0].name} ${stars(grade)} + ${units[1].name} ${stars(grade)} → ${result.name} ${stars(targetGrade)} 획득!`
    : `${units[0].name} ${stars(grade)} + ${units[1].name} ${stars(grade)} → ${result.name} ${stars(targetGrade)} 재조합 완료!`;

  units.forEach((unit) => removeUnitCompletely(unit.id));
  gameState.ownedUnits.push(result);
  gameState.lastRecombinationResult = result;
  gameState.isRecombinationGreatSuccess = isGreatSuccess;
  gameState.recombinationSlots = [];
  gameState.isRecombining = false;
  setMessage(message);
  addLog(message);
  checkAndMergeUnits();
  render();
}

function cleanupRecombinationSlots() {
  const benchUnitIds = new Set(getBenchUnits().map((unit) => unit.id));
  gameState.recombinationSlots = gameState.recombinationSlots.filter((id) => benchUnitIds.has(id));
}