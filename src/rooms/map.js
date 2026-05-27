// ==========================================
// 던전 맵 시스템 (dungeon/map.js)
// ==========================================

function renderDungeonMap() {
  const panel = document.getElementById("mapPanel");
  if (!panel) return;
  const layers = [...new Set(gameState.dungeonMap.map((node) => node.layer))];
  const currentNode = getCurrentNode();
  const availableCount = gameState.availableNodeIds.length;
  panel.innerHTML = `
    <h2>던전 맵</h2>
    <section class="map-info-section">
      <p class="hint" style="color: ${gameState.currentStage >= 11 ? 'var(--red)' : 'inherit'}; font-weight: bold;">
        ${gameState.currentStage >= 11 ? '무한 던전 ' : 'Stage '}${gameState.currentStage}
      </p>
      <p class="hint">현재 위치: ${currentNode ? `${roomLabels[currentNode.roomType].title} #${currentNode.id}` : "입구"}</p>
      <p class="hint">진행도: ${gameState.clearedNodeIds.length} / ${gameState.dungeonMap.length}</p>
      <p class="hint">선택 가능 노드: ${availableCount}개</p>
      ${gameState.currentStage >= 11 ? `<p class="hint" style="color:var(--gold); font-weight:bold;">현재 최대 등급: ${gameState.maxUnitGrade}성</p>` : ""}
    </section>
    <div class="map-list" style="margin-bottom: 24px; position: relative;">
      <svg id="mapLines" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; overflow: visible;"></svg>
      ${layers.map((layer) => `
        <div class="map-row" style="position: relative; z-index: 1; height: 80px; margin-bottom: 12px;">
          ${gameState.dungeonMap.filter((node) => node.layer === layer).map((node, index, arr) => {
            if (node.x == null) {
              const sectionWidth = 80 / arr.length;
              node.x = 10 + (index * sectionWidth) + (sectionWidth / 2);
            }
            return mapNodeButton(node);
          }).join("")}
        </div>
      `).join("")}
    </div>
  `;
  setTimeout(drawMapLines, 50); // DOM 렌더링 직후에 선을 그리기 위해 약간의 지연
}

function mapNodeButton(node) {
  const label = roomLabels[node.roomType];
  const isCurrent = node.id === gameState.currentNodeId && !gameState.clearedNodeIds.includes(node.id);
  const isCleared = gameState.clearedNodeIds.includes(node.id);
  const isAvailable = gameState.availableNodeIds.includes(node.id);
  const stateClass = isCleared ? "cleared" : isCurrent ? "current" : isAvailable ? "available" : "locked";
  
  const nextInfo = node.nextIds.length > 0 ? `\n다음 연결 방: ${node.nextIds.map(id => `#${id}`).join(', ')}` : "";

  return `
    <button id="map-node-${node.id}" class="map-node ${stateClass}" onmouseenter="highlightMapLines(${node.id})" onmouseleave="unhighlightMapLines()" onclick="selectMapNode(${node.id})" ${isAvailable ? "" : "disabled"} title="${label.title}${nextInfo}" style="position: absolute; left: ${node.x}%; transform: translateX(-50%);">
      <span>${label.icon}</span>
      <strong>${label.short}</strong>
      <small>#${node.id}</small>
    </button>
  `;
}

function drawMapLines() {
  const svg = document.getElementById("mapLines");
  const mapList = document.querySelector(".map-list");
  if (!svg || !mapList) return;

  svg.innerHTML = "";
  const mapRect = mapList.getBoundingClientRect();

  let linesHtml = "";
  gameState.dungeonMap.forEach(node => {
    const fromBtn = document.getElementById(`map-node-${node.id}`);
    if (!fromBtn) return;
    
    node.nextIds.forEach(nextId => {
      const toBtn = document.getElementById(`map-node-${nextId}`);
      if (!toBtn) return;

      const fromRect = fromBtn.getBoundingClientRect();
      const toRect = toBtn.getBoundingClientRect();

      const startX = fromRect.left + fromRect.width / 2 - mapRect.left;
      const startY = fromRect.top + fromRect.height / 2 - mapRect.top;
      const endX = toRect.left + toRect.width / 2 - mapRect.left;
      const endY = toRect.top + toRect.height / 2 - mapRect.top;

      let strokeColor = "rgba(255, 255, 255, 0.15)";
      let strokeWidth = 2;
      let strokeDash = "4, 4";
      
      if (gameState.clearedNodeIds.includes(node.id) && (gameState.clearedNodeIds.includes(nextId) || gameState.currentNodeId === nextId)) {
         strokeColor = "var(--gold)";
         strokeWidth = 3;
         strokeDash = "none";
      } else if (gameState.currentNodeId === node.id && gameState.availableNodeIds.includes(nextId)) {
         strokeColor = "var(--blue)";
         strokeWidth = 2.5;
         strokeDash = "6, 4";
      }

      linesHtml += `<line class="map-line map-line-from-${node.id}" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" />`;
    });
  });
  svg.innerHTML = linesHtml;
}

function highlightMapLines(nodeId) {
  document.querySelectorAll(`.map-line-from-${nodeId}`).forEach(line => line.classList.add("highlight"));
  const node = gameState.dungeonMap.find(n => n.id === nodeId);
  if (node && node.nextIds) {
    node.nextIds.forEach(nextId => {
      const targetBtn = document.getElementById(`map-node-${nextId}`);
      if (targetBtn) targetBtn.classList.add("highlight-node");
    });
  }
}

function unhighlightMapLines() {
  document.querySelectorAll(`.map-line`).forEach(line => line.classList.remove("highlight"));
  document.querySelectorAll(`.map-node`).forEach(btn => btn.classList.remove("highlight-node"));
}

window.addEventListener("resize", () => {
  if (document.getElementById("mapLines")) drawMapLines();
});

function selectMapNode(nodeId) {
  if (gameState.isBattleActive) {
    setMessage("전투 중에는 다른 방으로 이동할 수 없습니다.");
    render();
    return;
  }
  if (!gameState.availableNodeIds.includes(nodeId)) {
    setMessage("현재 위치에서 갈 수 없는 노드입니다.");
    render();
    return;
  }
  if (typeof canMoveToNextNode === "function" && !canMoveToNextNode()) {
    setMessage("전투 필드에 최소 1마리 이상의 생존 유닛을 배치해야 이동할 수 있습니다.");
    render();
    return;
  }
  const node = gameState.dungeonMap.find((entry) => entry.id === nodeId);
  if (!node) return;
  gameState.currentNodeId = node.id;
  gameState.availableNodeIds = [];
  enterRoom(node.roomType);
}

function goToNextStage() {
  if (gameState.currentStage === 10) {
    gameState.ownedUnits.forEach(unit => unit.grade = Math.min(unit.grade + 1, gameState.maxUnitGrade));
    addLog(`10스테이지 클리어 특별 보상! 모든 유닛이 한 단계 진화했습니다!`);
    checkAndMergeUnits();
  }
  gameState.currentStage += 1;
  if (gameState.currentStage >= 11) {
    gameState.maxUnitGrade = (gameState.maxUnitGrade || 5) + 1;
    addLog(`한계 돌파! 유닛의 최대 등급이 ${gameState.maxUnitGrade}성으로 확장되었습니다.`);
  }
  gameState.currentMapNodeCount = getNextMapNodeCount();
  gameState.dungeonMap = generateDungeonMap(gameState.currentMapNodeCount);
  gameState.currentNodeId = 0;
  gameState.clearedNodeIds = [];
  gameState.availableNodeIds = getFirstLayerNodeIds();
  setMessage(`스테이지 ${gameState.currentStage}에 진입했습니다.`);
  gameState.screen = "dungeon";
  render();
}

function renderDungeon() {
  const screen = document.getElementById("screen");
  const current = getCurrentNode();
  screen.innerHTML = `
    <section class="panel">
      <h2>던전 맵</h2>
      <p class="hint">${current ? `${roomLabels[current.roomType].title} 클리어 완료. 연결된 다음 노드를 선택하세요.` : "오른쪽 맵에서 시작 노드를 선택하세요."}</p>
      <p class="message">${gameState.message}</p>
    </section>
    <section class="panel squad-management-panel">
      <h2>부대 관리</h2>
      ${managementLayout()}
    </section>
  `;
  renderOwnedUnits();
  renderFieldUnits();
}