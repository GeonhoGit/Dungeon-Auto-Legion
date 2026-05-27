// ==========================================
// 상점 시스템 (shop/shop.js)
// ==========================================

function renderShop() {
  renderShopRoom();
}

function renderShopRoom() {
  const screen = document.getElementById("screen");
  const refreshCost = gameState.currentRefreshCost || gameConfig.shop.refreshCost || 10;

  let unitCardsHtml = "";
  if (gameState.shopUnits && gameState.shopUnits.length > 0) {
    unitCardsHtml = gameState.shopUnits.map((unit, index) => {
      if (!unit) return `<div class="slot empty">품절</div>`;
      const stats = getUnitStats(unit);
      const ability = getUnitAbility(unit);
      
      const gradeClass = `grade-${unit.grade || 1}`;
      const unitCost = (gameConfig.shop.unitCost || 15) + ((unit.grade || 1) - 1) * 10;
      const canAfford = gameState.gold >= unitCost;
      
      const keyHint = `<span style="display:inline-block; margin-right:6px; padding:2px 6px; background:rgba(255,255,255,0.2); border-radius:4px; font-size:12px; color:#fff; vertical-align:middle;">${index + 1}</span>`;
      return `
        <button class="choice-card unit-tooltip-container ${gradeClass} ${canAfford ? "" : "cannot-afford"}" onclick="buyShopUnit(${index})" style="text-align:left; position:relative;" ${canAfford ? "" : "disabled"} data-type-key="${unit.typeKey}">
          <strong>${keyHint}${unit.name} ${stars(unit.grade)}</strong>
          <span>HP ${stats.maxHp} / 공격력 ${stats.atk}</span>
          <em class="price">${unitCost} 골드</em>
          <div class="unit-tooltip">
            <strong>스킬: ${ability.skill.name}</strong>
            <p>${ability.skill.description}</p>
            <strong>특성: ${ability.trait.name}</strong>
            <p>${ability.trait.description}</p>
            ${renderUnitStatBreakdown(unit, false)}
          </div>
        </button>
      `;
    }).join("");
  } else {
    unitCardsHtml = `<p class="hint">현재 고용 가능한 유닛이 없습니다.</p>`;
  }

  let itemCardsHtml = "";
  if (gameState.shopItems && gameState.shopItems.length > 0) {
    itemCardsHtml = gameState.shopItems.map((item, index) => {
      if (!item) return `<div class="slot empty">품절</div>`;
      const tier = item.tier || 1;
      const tierName = { 1: "[일반]", 2: "[고급]", 3: "[희귀]", 4: "[전설]", 5: "[신화]" }[tier] || "[일반]";
      const tierColor = { 1: "var(--muted)", 2: "var(--green)", 3: "var(--blue)", 4: "var(--red)", 5: "var(--gold)" }[tier] || "inherit";
      const itemCost = { 1: 20, 2: 45, 3: 80, 4: 130, 5: 200 }[tier] || 20;
      const canAfford = gameState.gold >= itemCost;
      const keyHint = `<span style="display:inline-block; margin-right:6px; padding:2px 6px; background:rgba(255,255,255,0.2); border-radius:4px; font-size:12px; color:#fff; vertical-align:middle;">${index + 4}</span>`;
      return `
        <button class="choice-card tier-${tier} ${canAfford ? "" : "cannot-afford"}" onclick="buyShopItem(${index})" style="text-align:left;" ${canAfford ? "" : "disabled"}>
          <strong style="color:${tierColor};">${keyHint}${tierName} ${item.name}</strong>
          <span style="color:var(--text);">${item.text}</span>
          <em class="price">${itemCost} 골드</em>
        </button>
      `;
    }).join("");
  } else {
    itemCardsHtml = `<p class="hint">현재 구매 가능한 장비가 없습니다.</p>`;
  }

  const remainingSlots = Math.max(0, gameState.maxFieldUnitLimit - gameState.maxFieldUnits);
  const isFieldMaxed = remainingSlots <= 0;
  const fieldUpgrade = { title: "필드 슬롯 확장", effect: `필드에 배치할 수 있는 유닛 수를 늘립니다. <span style="display:block; margin-top:4px; color:var(--blue);">남은 확장 가능: ${remainingSlots}칸</span>`, price: gameState.fieldUpgradeCost, action: "buyFieldUpgrade()", isMaxed: isFieldMaxed, maxText: "최대 한도 도달" };

  screen.innerHTML = `
    <section class="panel">
      <h2>상점방</h2>
      <section class="choice-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h3 style="margin: 0; color: var(--gold);">용병 고용</h3>
            <p class="hint" style="margin: 4px 0 0;">현재 스테이지(${gameState.currentStage})에 따른 용병이 등장합니다.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="refreshShop()" ${gameState.gold >= refreshCost ? "" : "disabled"}><span class="refresh-icon" style="display:inline-block; margin-right:4px;"></span>새로고침 (${refreshCost} 골드)</button>
          </div>
        </div>
        <div class="shop-grid">
          ${unitCardsHtml}
        </div>
      </section>

      <section class="choice-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h3 style="color: var(--gold); margin: 0;">장비 구매</h3>
            <p class="hint" style="margin: 4px 0 0;">부대에 강력한 효과를 부여하는 장비를 구매합니다.</p>
          </div>
        </div>
        <div class="shop-grid">
          ${itemCardsHtml}
        </div>
      </section>

      <section class="choice-section">
        <h3 style="color: var(--gold); margin-bottom: 12px;">부대 강화</h3>
        <div class="shop-grid">
          ${(() => {
            if (fieldUpgrade.isMaxed) {
              return `
              <button class="choice-card cannot-afford" disabled>
                <strong>${fieldUpgrade.title}</strong>
                <span>${fieldUpgrade.effect}</span>
                <em class="price" style="color:var(--muted);">${fieldUpgrade.maxText}</em>
              </button>
              `;
            }
            const canAfford = gameState.gold >= fieldUpgrade.price;
            return `
            <button class="choice-card ${canAfford ? "" : "cannot-afford"}" onclick="${fieldUpgrade.action}" ${canAfford ? "" : "disabled"}>
              <strong>${fieldUpgrade.title}</strong>
              <span>${fieldUpgrade.effect}</span>
              <em class="price">${fieldUpgrade.price} 골드</em>
            </button>
            `;
          })()}
        </div>
      </section>

      <section class="choice-section">
        <h3 style="color: var(--gem); margin-bottom: 12px;">프리미엄 상점</h3>
        <div class="shop-grid">
          ${(() => {
            const canAffordUnit = gameState.gems >= 2;
            return `
            <button class="choice-card ${canAffordUnit ? "" : "cannot-afford"}" onclick="buyPremiumUnit()" ${canAffordUnit ? "" : "disabled"} style="border-color: rgba(179, 102, 255, 0.5); background: rgba(179, 102, 255, 0.05);">
              <strong style="color: var(--gem);">전설/신화 용병 고용</strong>
              <span>4성 또는 5성 유닛이 확정으로 등장합니다.</span>
              <em class="price" style="color: var(--gem);">2 보석</em>
            </button>
            `;
          })()}
          ${(() => {
            const canAffordItem = gameState.gems >= 3;
            return `
            <button class="choice-card ${canAffordItem ? "" : "cannot-afford"}" onclick="buyPremiumItem()" ${canAffordItem ? "" : "disabled"} style="border-color: rgba(179, 102, 255, 0.5); background: rgba(179, 102, 255, 0.05);">
              <strong style="color: var(--gem);">전설/신화 장비 뽑기</strong>
              <span>4티어 또는 5티어 장비가 확정으로 등장합니다.</span>
              <em class="price" style="color: var(--gem);">3 보석</em>
            </button>
            `;
          })()}
          ${(() => {
            const canAffordEmblem = gameState.gems >= 3;
            return `
            <button class="choice-card ${canAffordEmblem ? "" : "cannot-afford"}" onclick="buyPremiumEmblem()" ${canAffordEmblem ? "" : "disabled"} style="border-color: rgba(179, 102, 255, 0.5); background: rgba(179, 102, 255, 0.05);">
              <strong style="color: var(--gem);">직업 문장 제작</strong>
              <span>무작위 직업의 시너지 카운트를 +1 증가시키는 문장을 획득합니다.</span>
              <em class="price" style="color: var(--gem);">3 보석</em>
            </button>
            `;
          })()}
        </div>
      </section>
      
      <div class="actions"><button onclick="leaveShop()">상점 나가기</button></div>
      <p class="message">${gameState.message}</p>
      <div class="actions"><span class="hint">필드 슬롯 최대 한도: ${gameState.maxFieldUnitLimit}</span></div>
    </section>
  `;
}

function buyShopUnit(index) {
  if (gameState.isProcessingAction) return;
  const unit = gameState.shopUnits[index];
  if (!unit) return;
  
  const cost = (gameConfig.shop.unitCost || 15) + ((unit.grade || 1) - 1) * 10;
  if (gameState.gold < cost) {
    setMessage("골드가 부족합니다.");
    render();
    return;
  }
  
  gameState.isProcessingAction = true;
  playActionSound();

  gameState.gold -= cost;
  gameState.ownedUnits.push(unit);
  gameState.shopUnits = gameState.shopUnits.map(() => generateShopRandomUnit());
  addLog(`상점에서 ${unit.name} ${stars(unit.grade)} 구매`);
  checkAndMergeUnits();
  
  const shopGrid = document.querySelectorAll(".shop-grid")[0];
  if (shopGrid && shopGrid.children[index]) {
    shopGrid.children[index].classList.add("buy-anim");
    renderInventoryPanel();
    setTimeout(() => {
      gameState.isProcessingAction = false;
      render();
    }, 250);
  } else {
    gameState.isProcessingAction = false;
    render();
  }
}

function buyShopItem(index) {
  if (gameState.isProcessingAction) return;
  const item = gameState.shopItems[index];
  if (!item) return;
  const tier = item.tier || 1;
  const cost = { 1: 20, 2: 45, 3: 80, 4: 130, 5: 200 }[tier] || 20;
  if (gameState.gold < cost) {
    setMessage("골드가 부족합니다.");
    render();
    return;
  }
  gameState.gold -= cost;
  gameState.shopItems = gameState.shopItems.map(() => generateShopRandomItem());
  applyItemEffect(item);
  addLog(`상점에서 ${item.name} 구매: ${item.text}`);
  
  const shopGrid = document.querySelectorAll(".shop-grid")[1];
  if (shopGrid && shopGrid.children[index]) {
    shopGrid.children[index].classList.add("buy-anim");
    renderInventoryPanel();
    setTimeout(() => {
      gameState.isProcessingAction = false;
      render();
    }, 250);
  } else {
    gameState.isProcessingAction = false;
    render();
  }
}

function refreshShop() {
  if (gameState.isRefreshing) return;
  const cost = gameState.currentRefreshCost || gameConfig.shop.refreshCost || 10;
  if (gameState.gold < cost) {
    setMessage("골드가 부족합니다.");
    render();
    return;
  }
  
  gameState.isRefreshing = true;
  playActionSound();
  const icon = document.querySelector(".refresh-icon");
  if (icon) icon.classList.add("spin-anim");

  setTimeout(() => {
    gameState.isRefreshing = false;
    gameState.gold -= cost;
    gameState.currentRefreshCost += (gameConfig.shop.refreshCostIncrease || 2);
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
    setMessage(`상점 목록을 새로고침했습니다. (-${cost} 골드)`);
    addLog("상점 목록을 새로고침했습니다.");
    checkAndMergeUnits();
    render();
  }, 300);
}

function buyFieldUpgrade() {
  increaseFieldLimit(false);
  render();
}

function leaveShop() {
  clearRoom("shop");
}