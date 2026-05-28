// ==========================================
// 세이브 & 로드 시스템 (system/save.js)
// ==========================================

function saveGameProgress(isAutoSave = false) {
  if (gameState.isBattleActive || gameState.isWaitingForReward || gameState.isWaitingForGameOver) {
    if (!isAutoSave) {
      setMessage("전투 중이거나 결과 대기 중에는 저장할 수 없습니다.");
      render();
    }
    return;
  }
  const saveData = {
    screen: gameState.screen,
    pendingRewards: gameState.pendingRewards,
    pendingRewardType: gameState.pendingRewardType,
    currentEnemies: gameState.currentEnemies,
    gold: gameState.gold,
    gems: gameState.gems,
    currentStage: gameState.currentStage,
    currentMapNodeCount: gameState.currentMapNodeCount,
    dungeonMap: gameState.dungeonMap,
    currentNodeId: gameState.currentNodeId,
    clearedNodeIds: gameState.clearedNodeIds,
    availableNodeIds: gameState.availableNodeIds,
    ownedUnits: gameState.ownedUnits,
    maxUnitGrade: gameState.maxUnitGrade,
    fieldUnits: gameState.fieldUnits,
    maxFieldUnits: gameState.maxFieldUnits,
    maxFieldUnitLimit: gameState.maxFieldUnitLimit,
    fieldUpgradeCost: gameState.fieldUpgradeCost,
    inventoryItems: gameState.inventoryItems,
    bonusSources: gameState.bonusSources,
    bonuses: gameState.bonuses,
    activeSynergies: gameState.activeSynergies,
    synergyBonuses: gameState.synergyBonuses,
    stats: gameState.stats,
    commanderSpells: gameState.commanderSpells,
    reviveCount: gameState.reviveCount,
    shopUpgradeLevel: gameState.shopUpgradeLevel,
    upgradeLevels: gameState.upgradeLevels,
    nextUnitId: gameState.nextUnitId,
    nextEnemyId: gameState.nextEnemyId,
    shopUnits: gameState.shopUnits,
    shopItems: gameState.shopItems,
    currentRefreshCost: gameState.currentRefreshCost,
    lastClearedRoomType: gameState.lastClearedRoomType,
    currentRoomType: gameState.currentRoomType,
    currentEvent: gameState.currentEvent,
    eventResolved: gameState.eventResolved,
    autoCastSpells: gameState.autoCastSpells
  };
  localStorage.setItem("dal_save_data", JSON.stringify(saveData));
  if (typeof updateHallOfFame === "function") updateHallOfFame();
  if (!isAutoSave) {
    setMessage("게임이 성공적으로 저장되었습니다.");
    addLog("게임을 저장했습니다.");
    render();
  }
}

// 보석이나 영구 강화 내역이 변동될 때 호출하여 세이브 파일에 즉시 부분 저장하는 함수
function saveMetaProgress() {
  try {
    const saved = localStorage.getItem("dal_save_data");
    const saveData = saved ? JSON.parse(saved) : {};
    saveData.gems = gameState.gems || 0;
    saveData.shopUpgradeLevel = gameState.shopUpgradeLevel || 0;
    saveData.upgradeLevels = gameState.upgradeLevels || { fieldLimit: 0, heroBlessing: 0, commanderAura: 0, goldBonus: 0, recombChance: 0, critDamage: 0, critChance: 0 };
    saveData.autoCastSpells = gameState.autoCastSpells || false;
    localStorage.setItem("dal_save_data", JSON.stringify(saveData));
  } catch (e) {
  }
}

// 명예의 전당(최고 기록)을 갱신하고 저장하는 함수
function updateHallOfFame() {
  try {
    const saved = localStorage.getItem("dal_hall_of_fame");
    let hof = saved ? JSON.parse(saved) : { highestStage: 0, highestDamage: 0, highestMonstersKilled: 0, highestBossesKilled: 0 };
    
    let updated = false;
    if (gameState.currentStage > (hof.highestStage || 0)) {
      hof.highestStage = gameState.currentStage;
      updated = true;
    }
    if (gameState.stats) {
      if ((gameState.stats.totalDamageDealt || 0) > (hof.highestDamage || 0)) { hof.highestDamage = gameState.stats.totalDamageDealt; updated = true; }
      if ((gameState.stats.monstersKilled || 0) > (hof.highestMonstersKilled || 0)) { hof.highestMonstersKilled = gameState.stats.monstersKilled; updated = true; }
      if ((gameState.stats.bossesKilled || 0) > (hof.highestBossesKilled || 0)) { hof.highestBossesKilled = gameState.stats.bossesKilled; updated = true; }
    }
    
    if (updated) {
      localStorage.setItem("dal_hall_of_fame", JSON.stringify(hof));
    }
  } catch (e) {}
}

function loadGameProgress() {
  if (gameState.isBattleActive) {
    setMessage("전투 중에는 불러올 수 없습니다.");
    render();
    return;
  }
  const saved = localStorage.getItem("dal_save_data");
  if (!saved) {
    setMessage("저장된 게임이 없습니다.");
    if (gameState.screen === "start") render();
    return;
  }
  try {
    const saveData = JSON.parse(saved);
    if (!saveData.currentStage) {
      setMessage("저장된 진행 상황이 없습니다.");
      if (gameState.screen === "start") render();
      return;
    }
    
    // 시작 화면에서 불러올 경우 설정 파일 선행 초기화
    if (gameState.screen === "start") {
      gameConfig = loadGameConfig();
      applyGameConfigData();
    }
    
    Object.assign(gameState, saveData);
    
    if (!gameState.screen) gameState.screen = "dungeon";
    if (!gameState.currentEnemies) gameState.currentEnemies = [];
    if (!gameState.pendingRewards) gameState.pendingRewards = [];
    if (!gameState.stats) gameState.stats = { monstersKilled: 0, bossesKilled: 0, totalDamageDealt: 0 };
    if (!gameState.commanderSpells) gameState.commanderSpells = { heal: { cooldown: 15000, current: 0 }, strike: { cooldown: 15000, current: 0 } };

    // 전투 및 화면 전환 타이머 등 휘발성 상태 강제 초기화
    gameState.battleUnits = [];
    gameState.isWaitingForReward = false;
    gameState.isWaitingForGameOver = false;
    gameState.isBattleActive = false;
    gameState.isRecombining = false;
    gameState.isRecombinationModalOpen = false;
    gameState.isRefreshing = false;
    gameState.isProcessingAction = false;
    gameState.isSquadPreviewOpen = false;
    gameState.isUpgradeModalOpen = false;
    gameState.isProbabilityModalOpen = false;
    gameState.combatAnimations = {};
    gameState.damagePopups = [];
    gameState.pendingCombatEffects = [];
    gameState.deadUnitIds = [];
    
    if (typeof clearRewardTransitionTimers === "function") clearRewardTransitionTimers();
    if (typeof clearGameOverTransitionTimers === "function") clearGameOverTransitionTimers();
    if (typeof updateSynergies === "function") updateSynergies();
    
    setMessage("게임을 성공적으로 불러왔습니다.");
    addLog("게임을 불러왔습니다.");
    render();
  } catch (e) {
    setMessage("세이브 데이터를 불러오는 중 오류가 발생했습니다.");
    console.error(e);
    render();
  }
}