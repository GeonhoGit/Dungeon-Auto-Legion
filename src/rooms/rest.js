// ==========================================
// 휴식방 시스템 (rest/rest.js)
// ==========================================

function enterRestRoom() {
  gameState.screen = "rest";
  addLog("휴식방에 도착했습니다.");
  if (typeof saveGameProgress === "function") saveGameProgress(true);
  render();
}

function renderRest() {
  renderRestRoom();
}

function renderRestRoom() {
  const screen = document.getElementById("screen");
  const units = getAlivePlayerUnits();
  const options = [
    { type: "heal", key: "allHeal", name: "전열 정비", effect: "모든 생존 유닛의 잃은 체력 40% 회복", description: "전투 피해를 넓게 복구합니다.", hotkey: 1 },
    { type: "heal", key: "singleHeal", name: "집중 치료", effect: "가장 체력이 낮은 유닛 잃은 체력 80% 회복", description: "위험한 유닛 하나를 크게 회복합니다.", hotkey: 2 },
    { type: "train", key: "maxHp", name: "생명의 축복", effect: "모든 생존 유닛 최대 체력 +5%", description: "장기 생존력을 높입니다.", hotkey: 3 }
  ];
  const groups = groupRestOptionsByType(options);
  screen.innerHTML = `
    <section class="panel">
      <h2>휴식방</h2>
      <p class="hint">현재 유닛들의 체력 상태를 확인하고 회복 방식을 선택하세요.</p>
      <div class="unit-grid">
        ${units.length ? units.map((unit) => unitCard(unit)).join("") : `<div class="slot empty">생존 유닛 없음</div>`}
      </div>
      ${Object.entries(groups).map(([type, groupOptions]) => `
        <section class="choice-section">
          <h3>${getRestSectionTitle(type)}</h3>
          <p class="hint">${getRestSectionDescription(type)}</p>
          <div class="shop-grid">
            ${groupOptions.map((option) => {
              const keyHint = `<span style="display:inline-block; margin-right:6px; padding:2px 6px; background:rgba(255,255,255,0.2); border-radius:4px; font-size:12px; color:#fff; vertical-align:middle;">${option.hotkey}</span>`;
              return `
              <button class="choice-card" onclick="takeRestReward('${option.key}')">
                <strong>${keyHint}${option.name}</strong>
                <span>${option.effect}</span>
                <small>${option.description}</small>
              </button>
              `;
            }).join("")}
          </div>
        </section>
      `).join("")}
      <p class="message">${gameState.message}</p>
    </section>
  `;
}

function groupRestOptionsByType(options) {
  return options.reduce((groups, option) => {
    if (!groups[option.type]) groups[option.type] = [];
    groups[option.type].push(option);
    return groups;
  }, {});
}

function getRestSectionTitle(type) {
  return { heal: "휴식과 치료", train: "훈련", prep: "부대 정비" }[type] || "휴식";
}

function getRestSectionDescription(type) {
  return {
    heal: "피해를 입은 유닛들의 체력을 회복합니다.",
    train: "생존한 유닛을 장기적으로 강화합니다.",
    prep: "다음 전투를 준비합니다."
  }[type] || "";
}

function takeRestReward(type) {
  if (gameState.isProcessingAction) return;
  gameState.isProcessingAction = true;
  playActionSound();

  const btn = document.querySelector(`button[onclick="takeRestReward('${type}')"]`);
  if (btn) btn.classList.add("buy-anim");

  setTimeout(() => {
    gameState.isProcessingAction = false;
    if (type === "allHeal") healMissingHpPercent(0.4);
    if (type === "singleHeal") {
      const unit = getLowestHpUnit();
      if (unit) {
        const healAmount = Math.floor((unit.maxHp - unit.currentHp) * 0.8);
        unit.currentHp = Math.min(unit.maxHp, unit.currentHp + healAmount);
        const message = `${unit.name} ${stars(unit.grade)}이 ${healAmount} 회복했습니다.`;
        addLog(message);
        setMessage(message);
      } else {
        setMessage("회복할 생존 유닛이 없습니다.");
      }
    }
    if (type === "maxHp") increaseAllAliveMaxHp(0.05);
    clearRoom("rest");
  }, 250);
}
