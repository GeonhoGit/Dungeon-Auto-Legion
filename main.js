// ==========================================
// ==========================================

function render() {
  if (window._activeTooltipNode) {
    window._activeTooltipNode.remove();
    window._activeTooltipNode = null;
  }

  // 애드센스 정책 준수를 위해 콘텐츠가 적은 화면(시작 화면, 게임 오버)에서는 광고를 숨김 처리
  const adBanner = document.getElementById("ad-bottom-banner");
  if (adBanner) {
    if (gameState.screen === "start" || gameState.screen === "gameover") {
      adBanner.style.display = "none";
    } else {
      adBanner.style.display = "block";
    }
  }

  if (gameState.screen === "start") {
    renderStart();
    return;
  }

    const shellClass = window._firstRenderAnim ? "app-shell screen-fade-in" : "app-shell";
    window._firstRenderAnim = false;

  const inventoryPanel = document.getElementById("inventoryPanel");
  const mainPanel = document.getElementById("screen");
  const mapPanel = document.getElementById("mapPanel");
  const layoutPanel = document.querySelector(".three-column-layout");
  const modalPanel = document.querySelector(".squad-preview-modal");
  const recombCandidates = document.querySelector(".recombination-candidates");

  const inventoryScroll = inventoryPanel ? inventoryPanel.scrollTop : 0;
  const mapScroll = mapPanel ? mapPanel.scrollTop : 0;
  let mainScroll = mainPanel ? mainPanel.scrollTop : 0;
  let layoutScroll = layoutPanel ? layoutPanel.scrollTop : 0;
  const modalScroll = modalPanel ? modalPanel.scrollTop : 0;
  const recombScroll = recombCandidates ? recombCandidates.scrollTop : 0;

  const sliderScrolls = {};
  document.querySelectorAll(".owned-category-track").forEach(slider => {
    if (slider.id) sliderScrolls[slider.id] = slider.scrollLeft;
  });

  // 이전 화면과 다른 방으로 이동했다면, 자연스럽게 스크롤을 맨 위로 초기화
  if (window._lastScreen !== gameState.screen) {
    mainScroll = 0;
    layoutScroll = 0;
    window._lastScreen = gameState.screen;
  }

  app.innerHTML = `
      <div class="${shellClass}">
      ${renderTopbar()}
      <div class="game-layout three-column-layout">
        <aside id="inventoryPanel" class="panel inventory-panel"></aside>
        <section id="screen" class="main-panel"></section>
        <aside id="mapPanel" class="panel map-panel"></aside>
      </div>
    </div>
    ${gameState.isSynergyModalOpen ? renderSynergyModal() : ""}
    ${gameState.isInventoryModalOpen ? renderInventoryModal() : ""}
    ${gameState.isUpgradeModalOpen ? renderUpgradeModal() : ""}
    ${gameState.isBattleStatsModalOpen ? renderBattleStatsModal() : ""}
    ${gameState.isHelpModalOpen ? renderHelpModal() : ""}
  `;

  if (gameState.screen === "dungeon") renderDungeon();
  if (gameState.screen === "battle") renderBattle();
  if (gameState.screen === "shop") renderShop();
  if (gameState.screen === "rest") renderRest();
  if (gameState.screen === "reward") renderReward();
  if (gameState.screen === "event") renderEvent();
  if (gameState.screen === "gameover") renderEnd("게임 오버", "던전의 어둠이 부대를 삼켰습니다.");
  renderInventoryPanel();
  renderDungeonMap();

  const newInventoryPanel = document.getElementById("inventoryPanel");
  const newMainPanel = document.getElementById("screen");
  const newMapPanel = document.getElementById("mapPanel");
  const newLayoutPanel = document.querySelector(".three-column-layout");
  const newModalPanel = document.querySelector(".squad-preview-modal");
  const newRecombCandidates = document.querySelector(".recombination-candidates");

  if (newInventoryPanel) newInventoryPanel.scrollTop = inventoryScroll;
  if (newMainPanel) newMainPanel.scrollTop = mainScroll;
  if (newMapPanel) newMapPanel.scrollTop = mapScroll;
  if (newLayoutPanel) newLayoutPanel.scrollTop = layoutScroll;
  if (newModalPanel) newModalPanel.scrollTop = modalScroll;
  if (newRecombCandidates) newRecombCandidates.scrollTop = recombScroll;

  Object.entries(sliderScrolls).forEach(([id, scrollLeft]) => {
    const newSlider = document.getElementById(id);
    if (newSlider) newSlider.scrollLeft = scrollLeft;
  });
}

function renderStart() {
    window._firstRenderAnim = false;
  let hasRun = false;
  let hasAnyData = false;
  try {
    const saved = localStorage.getItem("dal_save_data");
    const hof = localStorage.getItem("dal_hall_of_fame");
    if (saved || hof) hasAnyData = true;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.currentStage) hasRun = true;
    }
  } catch(e) {}
  const hasAdminConfig = !!localStorage.getItem("adminGameConfig");

  app.innerHTML = `
    <section class="start-screen">
      <div class="start-panel">
        <h1>Dungeon Auto Legion</h1>
        <p class="hint">유닛을 모으고 배치해 자동 전투로 던전을 돌파하세요.</p>
        ${hasAdminConfig ? `
          <div class="config-status" style="margin-top: 16px;">
            <span class="pill">관리자 설정 적용 중</span>
            <button class="ghost" onclick="resetStoredAdminConfig()" style="margin-left: 8px;">관리자 설정 초기화</button>
          </div>
        ` : ""}
        <div style="display: flex; flex-direction: column; gap: 14px; align-items: center; margin-top: 32px;">
          <button onclick="${hasRun ? "confirmNewGame()" : "beginGameTransition('start')"}" style="padding: 14px 24px; font-size: 18px; width: 240px;">새 게임 시작</button>
          <button onclick="beginGameTransition('load')" style="padding: 14px 24px; font-size: 18px; width: 240px; background: var(--blue); border-color: #5a7da3; color: #111;" ${hasRun ? "" : "disabled"}>이어하기</button>
          <button onclick="openHallOfFameModal()" style="padding: 12px 24px; font-size: 16px; width: 240px; background: rgba(255,255,255,0.05); border-color: var(--line); color: var(--gold);">명예의 전당</button>
          <button onclick="openHelpModal()" style="padding: 12px 24px; font-size: 16px; width: 240px; background: rgba(255,255,255,0.05); border-color: var(--line); color: var(--text);">도움말</button>
          ${hasAnyData ? `<button onclick="confirmHardReset()" style="padding: 12px 24px; font-size: 16px; width: 240px; background: rgba(212, 107, 104, 0.1); border-color: var(--red); color: var(--red);">데이터 전체 초기화</button>` : ""}
        </div>
      </div>
    </section>
    ${gameState.isHelpModalOpen ? renderHelpModal() : ""}
    ${gameState.isHallOfFameModalOpen ? renderHallOfFameModal() : ""}
  `;
}

function openHallOfFameModal() {
  gameState.isHallOfFameModalOpen = true;
  render();
}

function closeHallOfFameModal() {
  gameState.isHallOfFameModalOpen = false;
  render();
}

function renderHallOfFameModal() {
  let hof = { highestStage: 0, highestDamage: 0, highestMonstersKilled: 0, highestBossesKilled: 0, highestUnitGrade: 0, highestSynergyCount: 0 };
  try {
    const saved = localStorage.getItem("dal_hall_of_fame");
    if (saved) hof = JSON.parse(saved);
  } catch(e) {}

  return `
    <div class="modal-backdrop" onclick="closeHallOfFameModal()" style="z-index: 9999;">
      <section class="panel squad-preview-modal" style="max-width: 480px; text-align:center; padding: 32px;" onclick="event.stopPropagation()">
        <div class="modal-header" style="justify-content: center; position: relative;">
          <h2 style="color: var(--gold); margin: 0;">명예의 전당</h2>
          <button onclick="closeHallOfFameModal()" style="position: absolute; right: 0; top: 0;">닫기</button>
        </div>
        <div class="slide-in-up" style="min-height: 180px; padding: 20px 10px; display:flex; flex-direction:column; justify-content:center;">
          <p class="hint" style="margin-top:0; margin-bottom: 24px;">지금까지 달성한 최고 기록입니다.</p>
          <div style="display: grid; grid-template-columns: 1fr; gap: 16px; font-size: 16px; text-align: left; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; border: 1px solid var(--line);">
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted);">최고 도달 스테이지</span><strong style="color: #fff;">${hof.highestStage || 0}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted);">최대 누적 피해량</span><strong style="color: #e5a4ff;">${(hof.highestDamage || 0).toLocaleString()}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted);">최다 몬스터 처치</span><strong style="color: #fff;">${(hof.highestMonstersKilled || 0).toLocaleString()} 마리</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted);">최다 보스 처치</span><strong style="color: var(--red);">${(hof.highestBossesKilled || 0).toLocaleString()} 마리</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted);">최고 도달 유닛 등급</span><strong style="color: var(--gold);">${hof.highestUnitGrade ? hof.highestUnitGrade + '성' : '기록 없음'}</strong></div>
            <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted);">최다 동시 활성 시너지</span><strong style="color: var(--blue);">${hof.highestSynergyCount || 0} 개</strong></div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function confirmNewGame() {
  if (confirm("진행 중인 탐험 데이터가 있습니다.\n새 게임을 시작하면 현재 진행 상황은 초기화됩니다.\n(※ 보유한 보석과 영구 강화는 유지됩니다.)\n정말 새 게임을 시작하시겠습니까?")) {
    beginGameTransition('start');
  }
}

function confirmHardReset() {
  if (confirm("정말 모든 데이터를 완전히 초기화하시겠습니까?\n진행 중인 탐험, 명예의 전당 기록, 보유한 보석, 영구 강화 내역이 모두 영구적으로 삭제되며 복구할 수 없습니다.")) {
    localStorage.removeItem("dal_save_data");
    localStorage.removeItem("dal_hall_of_fame");
    alert("모든 데이터가 초기화되었습니다.");
    location.reload();
  }
}

  function beginGameTransition(action) {
    if (gameState.isProcessingAction) return;
    gameState.isProcessingAction = true;
    playActionSound();
    
    const panel = document.querySelector('.start-panel');
    if (panel) {
      panel.classList.add('fade-out-up');
      setTimeout(() => {
        gameState.isProcessingAction = false;
        window._firstRenderAnim = true;
        if (action === 'start') startGame();
        else if (action === 'load') loadGameProgress();
      }, 300);
    } else {
      gameState.isProcessingAction = false;
      window._firstRenderAnim = true;
      if (action === 'start') startGame();
      else if (action === 'load') loadGameProgress();
    }
  }

function openHelpModal() {
  gameState.isHelpModalOpen = true;
  gameState.currentHelpSlide = 0;
  gameState.slideDirection = 0;
  render();
}

function closeHelpModal() {
  gameState.isHelpModalOpen = false;
  render();
}

function changeHelpSlide(dir) {
  const maxSlides = 6;
  const prevSlide = gameState.currentHelpSlide || 0;
  let nextSlide = prevSlide + dir;
  if (nextSlide < 0) nextSlide = 0;
  if (nextSlide >= maxSlides) nextSlide = maxSlides - 1;
  if (prevSlide !== nextSlide) {
    gameState.slideDirection = dir;
    gameState.currentHelpSlide = nextSlide;
    render();
  }
}

function renderHelpModal() {
  const slides = [
    {
      title: "1. 단축키 및 조작",
      content: `
        <ul style="text-align:left; line-height:2.0; margin-top:10px; font-size: 16px; color: #d1c7b7;">
          <li><strong style="color:var(--gold)">Spacebar</strong>: 전투 시작, 결과 대기 스킵, 다음 방 이동</li>
          <li><strong style="color:var(--gold)">숫자 키 (1~9)</strong>: 보상/옵션 선택, <strong style="color:var(--gold)">전투 중 배속 변경 (1~3)</strong></li>
          <li><strong style="color:var(--gold)">R 키</strong>: 상점 목록 새로고침</li>
          <li><strong style="color:var(--gold)">ESC 키</strong>: 열려있는 창(도감, 도움말 등) 닫기</li>
        </ul>
      `
    },
    {
      title: "2. 전투 및 사령관 스킬",
      content: `
        <ul style="text-align:left; line-height:1.8; margin-top:10px; font-size: 15.5px; color: #d1c7b7;">
          <li><strong style="color:var(--blue)">자동 전투</strong>: 배치된 유닛들은 자동으로 적과 싸우며 쿨타임마다 고유 스킬을 사용합니다.</li>
          <li><strong style="color:var(--gold)">사령관 스킬</strong>: 전투 하단에서 '신성한 강림(전체 회복)', '벼락(고정 피해+기절)'을 사용할 수 있습니다. (AUTO 버튼 지원)</li>
          <li><strong style="color:var(--red)">보스전 (타임어택)</strong>: 30초 내에 보스를 처치하지 못하면 광폭화하여 공격력이 폭증하며, 체력이 절반 이하가 되면 2페이즈에 돌입합니다.</li>
        </ul>
      `
    },
    {
      title: "3. 유닛 성장 및 재조합",
      content: `
        <ul style="text-align:left; line-height:1.8; margin-top:10px; font-size: 15.5px; color: #d1c7b7;">
          <li><strong style="color:#e5a4ff">자동 진화</strong>: 같은 직업, 같은 등급의 유닛 카드를 3장 모으면 다음 등급으로 자동 진화합니다.</li>
          <li><strong style="color:var(--green)">재조합</strong>: 안 쓰는 동급 카드들을 합성(재조합)하여 무작위 동급 카드를 뽑을 수 있습니다. (20% 확률로 대성공 상위 등급 획득)</li>
          <li><strong style="color:var(--gold)">배치 한도</strong>: 상점에서 필드 슬롯을 확장해 더 많은 유닛을 전투에 내보내세요.</li>
        </ul>
      `
    },
    {
      title: "4. 보석(Gems)과 영구 강화",
      content: `
        <ul style="text-align:left; line-height:1.8; margin-top:10px; font-size: 15.5px; color: #d1c7b7;">
          <li><strong style="color:var(--gem)">획득처</strong>: 보스 처치(확정), 일반 전투 승리(1% 확률), 이벤트 방 등</li>
          <li><strong style="color:var(--gem)">영구 강화</strong>: 인벤토리의 [영구 강화]에서 보석을 사용해 기본 능력치를 영구적으로 강화합니다. <strong style="color:var(--red)">(새 게임 시에도 유지)</strong></li>
          <li><strong style="color:var(--gem)">프리미엄 상점</strong>: 상점에서 보석을 지불하여 전설/신화 용병, 장비, 직업 문장을 확정 구매할 수 있습니다.</li>
        </ul>
      `
    },
    {
      title: "5. 주요 상태 이상 및 버프",
      content: `
        <ul style="text-align:left; line-height:1.7; margin-top:10px; font-size: 15.5px; color: #d1c7b7;">
          <li><strong style="color:#888888">기절</strong>: 지속시간 동안 모든 행동(공격 및 스킬) 불가</li>
          <li><strong style="color:#ff5500">화상</strong>: 매초 대상의 최대 체력에 비례한 지속 피해</li>
          <li><strong style="color:#55cc00">중독</strong>: 매초 시전자의 공격력에 비례한 지속 피해</li>
          <li><strong style="color:#cc0000">출혈</strong>: 매초 대상의 현재 체력에 비례한 지속 피해</li>
          <li><strong style="color:#7a42f4">치유감소</strong>: 회복 및 흡혈량 대폭 감소 효과.</li>
          <li><strong style="color:var(--blue)">공속↓</strong> / <strong style="color:var(--red)">공격력↑</strong> / <strong style="color:var(--gold)">방어력↑</strong>: 스탯 일시 증감.</li>
        </ul>
      `
    },
    {
      title: "6. 주요 시너지 요약",
      content: `
        <div style="text-align:left; line-height:1.6; font-size: 14.5px; color: #d1c7b7; height: 260px; overflow-y: auto; padding-right: 4px;">
          <table style="width:100%; border-collapse: collapse; text-align: left;">
            <tr style="border-bottom: 1px solid var(--line); color: var(--gold);">
              <th style="padding: 4px 0;">시너지명</th><th style="padding: 4px 0;">조합 직업</th><th style="padding: 4px 0;">핵심 효과</th>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 4px 0;">성전사단</td><td style="padding: 4px 0;">수호자+전사+치유사</td><td style="padding: 4px 0;">체력/방어력/회복 증가</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 4px 0;">암살단</td><td style="padding: 4px 0;">도적+궁수+마법사</td><td style="padding: 4px 0;">치명타 확률/피해 증가</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 4px 0;">마법공학</td><td style="padding: 4px 0;">마법사+치유사+음유시인</td><td style="padding: 4px 0;">공격력/회복/공속 증가</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 4px 0;">전쟁광</td><td style="padding: 4px 0;">전사+도적+마녀</td><td style="padding: 4px 0;">공격력/흡혈 증가</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 4px 0;">단일 직업</td><td style="padding: 4px 0;">같은 직업 3명 이상</td><td style="padding: 4px 0;">직업 고유 스탯 폭발적 증가</td>
            </tr>
          </table>
          <p style="margin-top:10px; color:var(--muted); font-size:12px; text-align:center;">* 전체 시너지 목록은 인게임의 <strong>[시너지 도감]</strong>에서 확인하세요!</p>
        </div>
      `
    }
  ];

  const slide = slides[gameState.currentHelpSlide || 0];
  const animClass = gameState.slideDirection === 1 ? "slide-in-right" : (gameState.slideDirection === -1 ? "slide-in-left" : "slide-in-up");

  return `
    <div class="modal-backdrop" onclick="closeHelpModal()" style="z-index: 9999;">
      <section class="panel squad-preview-modal" style="max-width: 720px; text-align:center; padding: 32px;" onclick="event.stopPropagation()">
        <div class="modal-header" style="justify-content: center; position: relative;">
          <h2 style="color: var(--blue); margin: 0;">게임 도움말</h2>
          <button onclick="closeHelpModal()" style="position: absolute; right: 0; top: 0;">닫기</button>
        </div>
        <div class="${animClass}" style="min-height: 360px; padding: 20px 10px; display:flex; flex-direction:column; justify-content:center;">
          <h3 style="color:var(--gold); margin-bottom: 16px; font-size: 20px;">${slide.title}</h3>
          <div>${slide.content}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px solid var(--line); padding-top: 20px;">
          <button onclick="changeHelpSlide(-1)" ${gameState.currentHelpSlide === 0 ? "disabled" : ""} style="width: 90px;">&lt; 이전</button>
          <div style="display: flex; gap: 8px;">
            ${slides.map((_, i) => `<span style="width:10px; height:10px; border-radius:50%; background: ${i === gameState.currentHelpSlide ? 'var(--gold)' : 'var(--line)'}; display:inline-block;"></span>`).join("")}
          </div>
          <button onclick="changeHelpSlide(1)" ${gameState.currentHelpSlide === slides.length - 1 ? "disabled" : ""} style="width: 90px;">다음 &gt;</button>
        </div>
      </section>
    </div>
  `;
}

function resetStoredAdminConfig() {
  localStorage.removeItem("adminGameConfig");
  gameConfig = loadGameConfig();
  applyGameConfigData();
  renderStart();
}

function renderTopbar() {
  return `
    <header class="topbar title-only">
      <div style="display: flex; align-items: center; gap: 14px;">
        <strong>Dungeon Auto Legion</strong>
        ${gameState.screen !== "start" ? `
          <button onclick="saveGameProgress()" style="padding: 4px 10px; font-size: 13px; background: transparent; border: 1px solid var(--line); color: var(--muted);">저장</button>
          <button onclick="openHelpModal()" style="padding: 4px 10px; font-size: 13px; background: transparent; border: 1px solid var(--line); color: var(--muted);">도움말</button>
        ` : ""}
      </div>
    </header>
  `;
}

function startGame() {
  if (typeof clearRewardTransitionTimers === "function") clearRewardTransitionTimers();
  
  let keepGems = gameState.gems || gameConfig.startGems || 0;
  let keepShopUpgradeLevel = gameState.shopUpgradeLevel || 0;
  let keepUpgradeLevels = gameState.upgradeLevels || { fieldLimit: 0, heroBlessing: 0, commanderAura: 0, goldBonus: 0, recombChance: 0, critDamage: 0, critChance: 0 };

  // 브라우저를 새로고침한 뒤 '이어하기'를 누르지 않고 바로 '새 게임 시작'을 눌렀을 때를 대비하여
  // 로컬 스토리지에 저장된 메타(영구 재화/강화) 데이터가 있다면 우선적으로 불러옵니다.
  try {
    const saved = localStorage.getItem("dal_save_data");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (gameState.screen === "start") {
        if (typeof parsed.autoCastSpells === "boolean") gameState.autoCastSpells = parsed.autoCastSpells;
        if (typeof parsed.gems === "number") keepGems = parsed.gems;
        if (typeof parsed.shopUpgradeLevel === "number") keepShopUpgradeLevel = parsed.shopUpgradeLevel;
        if (parsed.upgradeLevels) keepUpgradeLevels = parsed.upgradeLevels;
      }
    }
  } catch (e) {}

  gameConfig = loadGameConfig();
  applyGameConfigData();
  gameState.nextUnitId = 1;
  gameState.ownedUnits = [];
  gameState.fieldUnits = [];
  gameState.gold = gameConfig.startGold;
  gameState.gems = keepGems;
  gameState.maxUnitGrade = 5;
  gameState.maxFieldUnits = gameConfig.field.initialMaxUnits;
  gameState.maxFieldUnitLimit = gameConfig.field.maxLimit;
  gameState.minFieldUnitsToBattle = gameConfig.field.minUnitsToBattle;
  gameState.fieldUpgradeCost = gameConfig.shop.fieldUpgradeBaseCost;
  gameState.currentStage = 1;
  gameState.currentMapNodeCount = gameConfig.dungeon.startNodeCount;
  gameState.dungeonMap = [];
  gameState.currentNodeId = 0;
  gameState.currentEvent = null;
  gameState.eventResolved = false;
  gameState.clearedNodeIds = [];
  gameState.availableNodeIds = [];
  if (typeof clearGameOverTransitionTimers === "function") clearGameOverTransitionTimers();
  if (typeof clearRewardTransitionTimers === "function") clearRewardTransitionTimers();
  gameState.pendingRewards = [];
  gameState.pendingRewardType = "";
  gameState.shopUnits = [];
  gameState.shopItems = [];
  gameState.currentRefreshCost = gameConfig.shop.refreshCost || 10;
  gameState.lastClearedRoomType = "";
  gameState.currentRoomType = "";
  gameState.logs = [];
  gameState.battleLogs = [];
  gameState.combatAnimations = {};
  gameState.damagePopups = [];
  gameState.pendingCombatEffects = [];
  gameState.deadUnitIds = [];
  gameState.nextPopupId = 1;
  gameState.nextEnemyId = 1;
  gameState.reviveCount = 0;
  gameState.battleTimeLeft = 30000;
  gameState.battleSpeed = gameState.battleSpeed || 1;
  gameState.stats = { monstersKilled: 0, bossesKilled: 0, totalDamageDealt: 0 };
  gameState.commanderSpells = { heal: { cooldown: 15000, current: 0 }, strike: { cooldown: 15000, current: 0 } };
  gameState.shopUpgradeLevel = keepShopUpgradeLevel;
  gameState.upgradeLevels = keepUpgradeLevels;
  gameState.bonuses = {
    attack: 0,
    hp: 0,
    defense: 0,
    defenseFlat: 0,
    nextBattleSpeed: 0,
    attackSpeedBonusPercent: 0,
    damageReduction: 0,
    healBonus: 0,
    critChance: 0,
    critDamage: 0,
    lifesteal: 0
  };
  gameState.inventoryItems = [];
  gameState.bonusSources = {
    attack: [],
    hp: [],
    defense: [],
    attackSpeed: [],
    field: [],
    damageReduction: [],
    healBonus: [],
    critChance: [],
    critDamage: [],
    lifesteal: []
  };
  gameState.activeSynergies = [];
  gameState.synergyBonuses = { attack: 0, hp: 0, defense: 0, defenseFlat: 0, attackSpeed: 0, damageReduction: 0, healBonus: 0, critChance: 0, critDamage: 0, lifesteal: 0 };
  let keepAutoCast = gameState.autoCastSpells || false;

  // 영구 강화 스탯 재적용
  if (typeof applyAllPermanentUpgrades === "function") {
    applyAllPermanentUpgrades();
  }

  // 새 게임 시작 시 기존에 저장된 진행 상황(Run)을 초기화하고 영구 강화(Meta)만 남김
  try {
    const metaOnlySave = {
      gems: keepGems,
      shopUpgradeLevel: keepShopUpgradeLevel,
      upgradeLevels: keepUpgradeLevels,
      autoCastSpells: keepAutoCast
    };
    localStorage.setItem("dal_save_data", JSON.stringify(metaOnlySave));
  } catch(e) {}

  // 시작 시 같은 유닛이 3마리가 나와 2성으로 자동 합성되는 것(결과적으로 카드가 3장만 남는 현상) 방지
  gameState.ownedUnits = [];
  while (gameState.ownedUnits.length < 5) {
    const u = randomUnit(1);
    const count = gameState.ownedUnits.filter((s) => s.typeKey === u.typeKey).length;
    if (count < 2) { // 같은 유닛은 최대 2마리까지만 허용
      gameState.ownedUnits.push(u);
    }
  }
  gameState.dungeonMap = generateDungeonMap(gameState.currentMapNodeCount);
  gameState.availableNodeIds = getFirstLayerNodeIds();
  gameState.autoCastSpells = keepAutoCast;

  gameState.logs = ["랜덤 시작 유닛 5마리를 지급했습니다. 유닛 카드를 클릭해 필드에 배치하세요."];
  setMessage("랜덤 시작 유닛 5마리를 지급했습니다.");
  checkAndMergeUnits();
  gameState.screen = "dungeon";
  render();
}

function enterRoom(roomType) {
  gameState.currentRoomType = roomType;
  setMessage("");
  if (roomType === "battle" || roomType === "boss") {
    setupBattle(roomType === "boss");
    if (typeof saveGameProgress === "function") saveGameProgress(true);
    return;
  }
  if (roomType === "shop") {
    gameState.currentRefreshCost = gameConfig.shop.refreshCost || 10;
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
    gameState.screen = "shop";
    addLog("상점방에 도착했습니다.");
    if (typeof saveGameProgress === "function") saveGameProgress(true);
    render();
    return;
  }
  if (roomType === "rest") {
    enterRestRoom();
  }
  if (roomType === "event") {
    enterEventRoom();
    return;
  }
}

function enterRestRoom() {
  gameState.screen = "rest";
  addLog("휴식방에 도착했습니다.");
  render();
}

function clearRoom(roomType) {
  if (!gameState.clearedNodeIds.includes(gameState.currentNodeId)) gameState.clearedNodeIds.push(gameState.currentNodeId);
  gameState.lastClearedRoomType = roomType;
  if (roomType === "battle" || roomType === "boss") {
    openRewardRoom(roomType);
    return;
  }
  const node = getCurrentNode();
  gameState.availableNodeIds = node ? node.nextIds : [];
  gameState.screen = "dungeon";
  if (typeof saveGameProgress === "function") saveGameProgress(true);
  render();
}

window.DALAutomation = {
  getState: () => {
    // 원본 게임 상태를 보호하기 위해 깊은 복사 처리
    return JSON.parse(JSON.stringify(gameState));
  },
  getRunSummary: () => {
    const aliveUnits = gameState.ownedUnits.filter(u => (u.currentHp ?? u.maxHp) > 0);
    const deadUnits = gameState.ownedUnits.filter(u => (u.currentHp ?? u.maxHp) <= 0);

    return {
      screen: gameState.screen,
      currentStage: gameState.currentStage,
      gold: gameState.gold,
      gems: gameState.gems,
      reviveCount: gameState.reviveCount || 0,
      shopUpgradeLevel: gameState.shopUpgradeLevel || 0,
      upgradeLevels: gameState.upgradeLevels || {},
      stats: JSON.parse(JSON.stringify(gameState.stats || {})),
      commanderSpells: JSON.parse(JSON.stringify(gameState.commanderSpells || {})),
      currentRoomType: gameState.currentRoomType,
      ownedUnits: JSON.parse(JSON.stringify(gameState.ownedUnits)),
      fieldUnits: JSON.parse(JSON.stringify(gameState.fieldUnits)),
      aliveUnitCount: aliveUnits.length,
      deadUnitCount: deadUnits.length,
      availableNodeIds: [...gameState.availableNodeIds],
      currentEnemies: JSON.parse(JSON.stringify(gameState.currentEnemies)),
      pendingRewards: JSON.parse(JSON.stringify(gameState.pendingRewards)),
      shopUnits: JSON.parse(JSON.stringify(gameState.shopUnits)),
      logs: [...gameState.logs],
      battleLogs: [...gameState.battleLogs],
      gameConfig: JSON.parse(JSON.stringify(gameConfig))
    };
  },
  getBattleLogs: () => [...gameState.battleLogs],
  getConfig: () => JSON.parse(JSON.stringify(gameConfig)),
  exportCurrentLogJson: () => JSON.stringify(window.DALAutomation.getRunSummary(), null, 2)
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (gameState.isHelpModalOpen) {
      closeHelpModal();
    }
    if (gameState.isHallOfFameModalOpen) {
      closeHallOfFameModal();
    }
    if (gameState.isRecombinationModalOpen) {
      closeRecombinationModal();
    }
    if (gameState.isSquadPreviewOpen) {
      closeSquadPreviewModal();
    }
    if (gameState.isProbabilityModalOpen) {
      closeProbabilityModal();
    }
    if (gameState.isSynergyModalOpen) {
      closeSynergyModal();
    }
    if (gameState.isInventoryModalOpen) {
      closeInventoryModal();
    }
    if (gameState.isUpgradeModalOpen) {
      closeUpgradeModal();
    }
    if (gameState.isBattleStatsModalOpen) {
      closeBattleStatsModal();
    }
  } else if (e.key === 'Enter') {
    if (gameState.isRecombinationModalOpen && typeof canRecombineUnits === "function" && canRecombineUnits()) {
      recombineUnits();
    }
  } else if (gameState.isHelpModalOpen) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); changeHelpSlide(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); changeHelpSlide(1); }
  } else if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    if (gameState.screen === 'battle') {
      if (gameState.isWaitingForReward && typeof skipRewardDelayToRewardRoom === "function") {
        e.preventDefault();
        skipRewardDelayToRewardRoom();
      } else if (!gameState.isBattleActive && typeof canStartBattle === "function" && canStartBattle()) {
        e.preventDefault(); // 스페이스바로 인한 화면 스크롤 방지
        startBattle();
      }
    } else if (gameState.screen === 'shop') {
      e.preventDefault();
      leaveShop();
    } else if (gameState.screen === 'rest') {
      e.preventDefault();
      clearRoom("rest");
    } else if (gameState.screen === 'reward') {
      e.preventDefault();
      if (gameState.pendingRewards && gameState.pendingRewards.length > 0) {
        if (!confirm("보상을 선택하지 않았습니다. 정말 스킵하시겠습니까?")) return;
      }
      gameState.pendingRewards = [];
      if (gameState.pendingRewardType === "boss") {
        if (typeof goToNextStage === "function") goToNextStage();
      } else {
        const node = typeof getCurrentNode === "function" ? getCurrentNode() : null;
        gameState.availableNodeIds = node ? node.nextIds : [];
        gameState.pendingRewardType = "";
        gameState.screen = "dungeon";
        if (typeof render === "function") render();
      }
    }
    else if (gameState.screen === 'event') {
      if (gameState.eventResolved) {
        e.preventDefault();
        leaveEventRoom();
      }
    }
  } else if ((e.key === 'r' || e.key === 'R') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    if (e.repeat) return; // 키보드를 꾹 누르고 있을 때 연속 실행 방지
    if (gameState.screen === 'shop') {
      const cost = gameState.currentRefreshCost || gameConfig.shop.refreshCost || 10;
      if (gameState.gold < cost) return; // 돈이 없으면 동작 차단
      e.preventDefault();
      refreshShop();
    }
  } else if (e.key >= '1' && e.key <= '9' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    if (gameState.screen === 'battle' && !gameState.isSquadPreviewOpen && !gameState.isInventoryModalOpen && !gameState.isUpgradeModalOpen && !gameState.isSynergyModalOpen) {
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 3) {
        e.preventDefault();
        if (typeof setBattleSpeed === "function") setBattleSpeed(keyNum);
      }
    } else if (gameState.screen === 'reward' && !gameState.isSquadPreviewOpen && !gameState.isInventoryModalOpen && !gameState.isUpgradeModalOpen && !gameState.isSynergyModalOpen) {
      const idx = parseInt(e.key, 10) - 1;
      if (gameState.pendingRewards && idx >= 0 && idx < gameState.pendingRewards.length) {
        e.preventDefault();
        chooseReward(idx);
      }
    } else if (gameState.screen === 'shop' && !gameState.isSquadPreviewOpen && !gameState.isInventoryModalOpen && !gameState.isUpgradeModalOpen && !gameState.isSynergyModalOpen) {
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 3) {
        e.preventDefault();
        buyShopUnit(keyNum - 1);
      } else if (keyNum >= 4 && keyNum <= 6) {
        e.preventDefault();
        buyShopItem(keyNum - 4);
      }
    } else if (gameState.screen === 'rest' && !gameState.isSquadPreviewOpen && !gameState.isInventoryModalOpen && !gameState.isUpgradeModalOpen && !gameState.isSynergyModalOpen) {
      const keyNum = parseInt(e.key, 10);
      if (keyNum === 1) { e.preventDefault(); takeRestReward("allHeal"); }
      else if (keyNum === 2) { e.preventDefault(); takeRestReward("singleHeal"); }
      else if (keyNum === 3) { e.preventDefault(); takeRestReward("maxHp"); }
    } else if (gameState.screen === 'event' && !gameState.eventResolved && !gameState.isSquadPreviewOpen && !gameState.isInventoryModalOpen && !gameState.isUpgradeModalOpen && !gameState.isSynergyModalOpen) {
      const keyNum = parseInt(e.key, 10);
      const ev = gameState.currentEvent;
      if (ev && keyNum >= 1 && keyNum <= ev.options.length) {
        e.preventDefault();
        takeEventChoice(ev.options[keyNum - 1].effect);
      }
    }
  }
});

window.addEventListener('beforeunload', (event) => {
  if (gameState.screen !== 'start' && typeof saveGameProgress === 'function') {
    saveGameProgress(true); // 자동 저장
  }
});

function playActionSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 경쾌하게 올라가는 신스음 (띠링~)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) { }
}

render();
