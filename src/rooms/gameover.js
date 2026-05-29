// ==========================================
// 게임 오버 시스템 (gameover/gameover.js)
// ==========================================

function renderEnd(title, body) {
  const screen = document.getElementById("screen");
  const isGameOver = title === "게임 오버";
  const baseReviveCost = gameConfig.rewards?.reviveCost ?? 50;
  const reviveCost = baseReviveCost * ((gameState.reviveCount || 0) + 1);
  const canAfford = gameState.gold >= reviveCost;
  const hasUnits = gameState.ownedUnits.length > 0;
  const canRevive = canAfford && hasUnits;

  let reviveButtonHtml = "";
  if (isGameOver) {
    let reviveButtonText = `부활하여 이어하기 (-${reviveCost} G)`;
    if (!hasUnits) {
      reviveButtonText = "부활 불가 (남은 유닛 없음)";
    } else if (!canAfford) {
      reviveButtonText = `부활 불가 (골드 부족: ${reviveCost} G)`;
    }
    reviveButtonHtml = `<button class="${canRevive ? 'primary' : 'ghost'}" onclick="revive()" ${canRevive ? '' : 'disabled'}>${reviveButtonText}</button>`;
  }

  let statsHtml = "";
  if (isGameOver) {
    const stats = gameState.stats || {};
    statsHtml = `
      <div class="game-over-stats" style="margin: 24px 0; padding: 20px; background: rgba(0, 0, 0, 0.4); border: 1px solid var(--line); border-radius: 8px; text-align: left;">
        <h3 style="color: var(--gold); margin-top: 0; margin-bottom: 16px; border-bottom: 1px dashed var(--line); padding-bottom: 10px; font-size: 1.1em;">탐험 상세 통계</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 15px;">
          <div><span style="color: var(--muted);">최종 도달:</span> <strong style="color: #fff;">스테이지 ${gameState.currentStage}</strong></div>
          <div><span style="color: var(--muted);">가한 총 피해량:</span> <strong style="color: #e5a4ff;">${(stats.totalDamageDealt || 0).toLocaleString()}</strong></div>
          <div><span style="color: var(--muted);">처치한 일반/정예:</span> <strong style="color: #fff;">${(stats.monstersKilled || 0).toLocaleString()} 마리</strong></div>
          <div><span style="color: var(--muted);">처치한 보스:</span> <strong style="color: var(--red);">${(stats.bossesKilled || 0).toLocaleString()} 마리</strong></div>
        </div>
      </div>
    `;
  }

  screen.innerHTML = `
    <section class="panel">
      <h2 class="${isGameOver ? 'game-over-title' : ''}">${title}</h2>
      <p class="hint">${body}</p>
      ${statsHtml}
      <div class="actions">
        ${reviveButtonHtml}
        <button onclick="startGame()">새 게임 시작</button>
        <button onclick="openBattleStatsModal()" style="border-color: var(--blue); color: var(--blue); background: rgba(127,167,217,0.1);">마지막 전투 통계</button>
      </div>
    </section>
  `;
}

function revive() {
  const baseReviveCost = gameConfig.rewards?.reviveCost ?? 50;
  const cost = baseReviveCost * ((gameState.reviveCount || 0) + 1);
  if (gameState.gold < cost) {
    setMessage("골드가 부족합니다.");
    return;
  }
  if (gameState.ownedUnits.length === 0) {
    setMessage("부활시킬 유닛이 없습니다.");
    return;
  }
  gameState.gold -= cost;
  gameState.reviveCount = (gameState.reviveCount || 0) + 1;

  gameState.ownedUnits.forEach(u => {
    const stats = getUnitStats(u);
    u.currentHp = stats.maxHp;
    u.isDead = false;
  });
  gameState.deadUnitIds = [];

  if (typeof updateSynergies === "function") updateSynergies();
  if (gameState.clearedNodeIds && gameState.clearedNodeIds.length > 0) {
    const lastClearedId = gameState.clearedNodeIds[gameState.clearedNodeIds.length - 1];
    gameState.currentNodeId = lastClearedId;
    const lastNode = gameState.dungeonMap.find(n => n.id === lastClearedId);
    gameState.availableNodeIds = lastNode ? [...lastNode.nextIds] : [];
  } else {
    gameState.currentNodeId = 0;
    gameState.availableNodeIds = getFirstLayerNodeIds();
  }

  gameState.currentRoomType = "";
  gameState.screen = "dungeon";
  
  addLog(`골드 ${cost}G를 지불하고 부활했습니다.`);
  setMessage("부활했습니다! 다시 도전할 방을 선택하세요.");
  render();
}
