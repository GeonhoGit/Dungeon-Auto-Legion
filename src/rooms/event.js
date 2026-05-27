// ==========================================
// 이벤트 방 시스템 (rooms/event.js)
// ==========================================

const eventPool = [
  {
    id: "abandoned_altar",
    title: "버려진 제단",
    description: "던전 구석에서 기운을 잃어가는 제단을 발견했습니다. 무언가를 바치면 축복을 내릴 것 같습니다.",
    options: [
      { label: "피를 바친다 (모든 유닛 현재 체력 20% 감소, 50 골드 획득)", effect: "blood_sacrifice" },
      { label: "무시하고 지나간다", effect: "leave" }
    ]
  },
  {
    id: "wandering_merchant",
    title: "떠돌이 상인",
    description: "짐을 가득 짊어진 기괴한 상인이 은밀하게 다가와 특별한 거래를 제안합니다.",
    options: [
      { label: "희귀한 광물 구매 (50 골드 지불, 보석 1개 획득)", effect: "buy_gem" },
      { label: "거절한다", effect: "leave" }
    ]
  },
  {
    id: "fountain_of_magic",
    title: "마력의 샘",
    description: "맑은 물이 솟아나는 샘입니다. 체력을 회복할 수 있지만, 바닥에 누군가 흘린 동전이 보입니다.",
    options: [
      { label: "휴식을 취한다 (모든 생존 유닛 잃은 체력 50% 회복)", effect: "fountain_heal" },
      { label: "동전을 훔친다 (30 골드 획득, 부대 전체 방어력 10% 감소 저주)", effect: "steal_coins" }
    ]
  },
  {
    id: "mysterious_shadow",
    title: "의문의 그림자",
    description: "어둠 속에서 형체를 알 수 없는 그림자가 다가와 손을 내밉니다.",
    options: [
      { label: "손을 잡는다 (무작위 3성 유닛 획득, 50% 확률로 20 골드 분실)", effect: "shadow_hand" },
      { label: "무기를 고쳐 잡는다 (전투 없이 지나가지만 찝찝합니다)", effect: "leave" }
    ]
  },
  {
    id: "devil_contract",
    title: "악마의 계약",
    description: "어둠 속에서 붉은 눈을 번뜩이는 악마가 나타나, 당신의 영혼 일부를 대가로 달콤한 힘을 제안합니다.",
    options: [
      { label: "피로 서명한다 (부대 전체 최대 체력 15% 감소, 공격력 30% 증가)", effect: "sign_devil_contract" },
      { label: "단호하게 거절한다", effect: "leave" }
    ]
  },
  {
    id: "ancient_spirit",
    title: "고대의 정령",
    description: "눈부시게 빛나는 정령이 다가와 부대의 잠재력을 끌어올려 주겠다고 제안합니다.",
    options: [
      { label: "정령의 축복을 받는다 (무작위 유닛 1마리가 1단계 진화합니다)", effect: "evolve_unit" },
      { label: "필요 없다고 거절한다", effect: "leave" }
    ]
  },
  {
    id: "suspicious_chest",
    title: "의심스러운 상자",
    description: "방 한가운데 덩그러니 놓인 화려한 보물 상자입니다. 왠지 불길한 기운이 맴돕니다.",
    options: [
      { label: "상자를 연다 (함정이 발동하여 즉시 전투 시작)", effect: "trap_battle" },
      { label: "무시하고 지나간다", effect: "leave" }
    ]
  }
];

const legendaryEvent = {
  id: "legendary_chest",
  title: "잊혀진 영웅의 무덤",
  description: "아무도 찾지 않는 던전의 가장 깊은 곳에서 찬란한 빛을 내뿜는 영웅의 유품을 발견했습니다.",
  options: [
    { label: "유품을 취한다 (무작위 4티어 이상 전설/신화 장비 획득)", effect: "legendary_item" },
    { label: "경의를 표하고 떠난다", effect: "leave" }
  ]
};

function enterEventRoom() {
  gameState.screen = "event";
  
  // 1%의 극악의 확률로 전설 장비 이벤트 등장, 아닐 경우 일반 이벤트 풀에서 등장
  if (Math.random() < 0.01) {
    gameState.currentEvent = legendaryEvent;
  } else {
    gameState.currentEvent = randomFrom(eventPool);
  }
  
  gameState.eventResolved = false;
  addLog("물음표 방에 진입했습니다. 무언가 일어날 것 같습니다.");
  if (typeof saveGameProgress === "function") saveGameProgress(true);
  render();
}

function renderEvent() {
  const screen = document.getElementById("screen");
  const ev = gameState.currentEvent;

  if (!ev) {
    clearRoom("event");
    return;
  }

  let optionsHtml = "";
  if (!gameState.eventResolved) {
    optionsHtml = ev.options.map((opt, index) => {
      const keyHint = `<span style="display:inline-block; margin-right:6px; padding:2px 6px; background:rgba(255,255,255,0.2); border-radius:4px; font-size:12px; color:#fff; vertical-align:middle;">${index + 1}</span>`;
      return `<button class="choice-card" onclick="takeEventChoice('${opt.effect}')" style="text-align:left;"><strong>${keyHint}${opt.label}</strong></button>`;
    }).join("");
  } else {
    optionsHtml = `<button class="choice-card" onclick="leaveEventRoom()" style="text-align:center; display:flex; justify-content:center; align-items:center;"><strong>다음 방으로 이동 (Space)</strong></button>`;
  }

  screen.innerHTML = `
    <section class="panel">
      <h2 style="color: var(--blue);">이벤트: ${ev.title}</h2>
      <p class="hint" style="font-size: 1.1em; color: #fff; margin-bottom: 24px;">${ev.description}</p>
      <div class="choice-section"><div class="shop-grid" style="grid-template-columns: 1fr;">${optionsHtml}</div></div>
      <p class="message" style="margin-top: 20px;">${gameState.message}</p>
    </section>
  `;
}

function takeEventChoice(effect) {
  if (gameState.isProcessingAction) return;
  gameState.isProcessingAction = true;
  playActionSound();
  
  // 이벤트 결과 효과 적용 딜레이
  setTimeout(() => {
    gameState.isProcessingAction = false;
    gameState.eventResolved = true;
    
    if (effect === "leave") { addLog("아무 일도 일어나지 않았습니다."); setMessage("무사히 자리를 떠났습니다."); }
    else if (effect === "blood_sacrifice") { getAlivePlayerUnits().forEach(u => { const loss = Math.floor(u.maxHp * 0.2); u.currentHp = Math.max(1, u.currentHp - loss); }); gameState.gold += 50; addLog("유닛들의 체력을 바치고 50 골드를 얻었습니다."); setMessage("체력이 20% 감소하고 50 골드를 얻었습니다."); }
    else if (effect === "buy_gem") { if (gameState.gold >= 50) { gameState.gold -= 50; gameState.gems += 1; addLog("50 골드를 지불하고 보석 1개를 획득했습니다."); setMessage("보석을 획득했습니다."); if (typeof saveMetaProgress === "function") saveMetaProgress(); } else { addLog("골드가 부족하여 거래에 실패했습니다."); setMessage("골드가 부족합니다."); } }
    else if (effect === "fountain_heal") { const healed = healMissingHpPercent(0.5); addLog(`마력의 샘에서 휴식하여 총 ${healed} 체력을 회복했습니다.`); setMessage("모든 유닛의 체력이 50% 회복되었습니다."); }
    else if (effect === "steal_coins") { gameState.gold += 30; gameState.bonuses.defense -= 0.1; addLog("30 골드를 훔쳤으나 저주를 받아 방어력이 10% 감소했습니다."); setMessage("골드를 얻었지만 방어력 감소 저주에 걸렸습니다."); }
    else if (effect === "shadow_hand") { const unit = randomUnit(3); gameState.ownedUnits.push(unit); if (Math.random() < 0.5) { const lostGold = Math.min(gameState.gold, 20); gameState.gold -= lostGold; addLog(`그림자 속에서 ${unit.name} 3성을 얻었지만, ${lostGold} 골드를 잃었습니다.`); setMessage(`${unit.name} 3성 획득! 하지만 골드를 잃었습니다.`); } else { addLog(`그림자 속에서 ${unit.name} 3성을 얻었습니다!`); setMessage(`${unit.name} 3성 획득!`); } }
    else if (effect === "evolve_unit") {
      const maxGrade = gameState.maxUnitGrade || 5;
      const candidates = gameState.ownedUnits.filter(u => u.grade < maxGrade);
      if (candidates.length > 0) {
        const target = randomFrom(candidates);
        target.grade += 1;
        addLog(`[정령의 축복] ${target.name}이(가) ${stars(target.grade)}(으)로 진화했습니다!`);
        setMessage(`${target.name}이(가) ${stars(target.grade)}(으)로 진화했습니다!`);
        checkAndMergeUnits(); // 진화로 인해 3마리가 모이면 자동 합성 처리
      } else {
        addLog("모든 유닛이 최대 등급이라 축복이 허공으로 흩어졌습니다.");
        setMessage("진화할 수 있는 유닛이 없습니다.");
      }
    }
    else if (effect === "trap_battle") {
      addLog("상자를 열자 함정이 발동하여 마물이 쏟아져 나옵니다!");
      setMessage("함정이 발동했습니다! 전투 준비!");
      gameState.currentRoomType = "battle";
      if (typeof setupBattle === "function") setupBattle(false);
      return; // 전투 화면으로 강제 이동하므로 render()를 호출하지 않고 리턴
    }
    else if (effect === "sign_devil_contract") {
      gameState.bonuses.hp -= 0.15;
      gameState.bonuses.attack += 0.30;
      if (typeof addBonusSource === "function") {
        addBonusSource("hp", {name: "악마의 계약 (이벤트)"}, -0.15);
        addBonusSource("attack", {name: "악마의 계약 (이벤트)"}, 0.30);
      }
      
      // 최대 체력이 깎였으므로, 현재 체력이 깎인 최대 체력을 넘지 않도록 보정
      gameState.ownedUnits.forEach(u => {
        const stats = typeof getUnitStats === "function" ? getUnitStats(u, true) : u;
        if (u.currentHp > stats.maxHp) u.currentHp = Math.max(1, stats.maxHp);
      });
      addLog("악마와 계약하여 생명력을 바치고 파괴적인 힘을 얻었습니다.");
      setMessage("부대 전체 최대 체력 15% 감소, 공격력 30% 증가!");
    }
    else if (effect === "legendary_item") {
      const candidates = typeof itemData !== "undefined" ? itemData.filter(item => (item.tier || 1) >= 4) : [];
      if (candidates.length > 0) {
        const selectedItem = randomFrom(candidates);
        if (typeof applyItemEffect === "function") applyItemEffect(selectedItem);
        addLog(`[기적적인 행운!] 눈부신 빛과 함께 ${selectedItem.name}을(를) 획득했습니다!`);
        setMessage(`전설적인 유품, ${selectedItem.name} 획득!`);
      } else {
        addLog("유품이 이미 삭아 없어져버렸습니다...");
        setMessage("아무것도 얻지 못했습니다.");
      }
    }
    
    render();
  }, 250);
}

function leaveEventRoom() {
  clearRoom("event");
}