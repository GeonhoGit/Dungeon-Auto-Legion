// ==========================================
// 몬스터 데이터 (monster/monsters.js)
// ==========================================

const enemyScalingData = {
  baseHp: 160, baseAttack: 25, baseDefense: 10, stageMultiplier: 1.40,
  baseCritChance: 0.05, // 기본 치명타 확률 5%
  baseCritDamage: 0.5,  // 기본 치명타 추가 피해 50% (합계 1.5배)
  battlePowerMin: 0.9, battlePowerMax: 1.1, bossPowerMin: 1.2, bossPowerMax: 1.5,
  enemyCountBaseMin: 2, enemyCountBaseMax: 4,
  normalTemplates: [
    { key: "skeleton", name: "해골 병사", hpMod: 1.0, atkMod: 1.0, defMod: 1.0, spdMod: 1.0 },
    { key: "goblin", name: "고블린", hpMod: 0.7, atkMod: 1.2, defMod: 0.5, spdMod: 1.3 },
    { key: "orc", name: "오크 투사", hpMod: 1.3, atkMod: 1.1, defMod: 1.2, spdMod: 0.8 },
    { key: "slime", name: "거대 슬라임", hpMod: 1.5, atkMod: 0.8, defMod: 0.8, spdMod: 0.7 },
    { key: "ghost", name: "떠도는 악령", hpMod: 0.8, atkMod: 1.4, defMod: 0.4, spdMod: 1.4 },
    { key: "bat", name: "흡혈 박쥐", hpMod: 0.6, atkMod: 1.3, defMod: 0.3, spdMod: 1.5 },
    { key: "mummy", name: "저주받은 미라", hpMod: 1.2, atkMod: 0.9, defMod: 1.1, spdMod: 0.8 }
  ],
  bossTemplates: [
    { key: "minotaur", name: "미노타우르스", hpMod: 1.4, atkMod: 1.1, defMod: 1.0, spdMod: 0.8 },
    { key: "lich", name: "리치", hpMod: 0.9, atkMod: 1.5, defMod: 0.8, spdMod: 1.1 },
    { key: "corrupt_knight", name: "타락한 기사", hpMod: 1.1, atkMod: 1.2, defMod: 1.4, spdMod: 0.9 },
    { key: "spider", name: "거대 독거미", hpMod: 1.2, atkMod: 1.0, defMod: 0.9, spdMod: 1.2 }
  ]
};

const enemyAbilitiesData = {
  skeleton: {
    skill: { name: "뼈 무덤", description: "공격 시 10% 확률로 대상의 공격 속도를 2초간 30% 감소시킵니다." },
    trait: { name: "망자의 가호", description: "피격 시 10% 확률로 피해를 완전히 무시합니다." }
  },
  goblin: {
    skill: { name: "기습", description: "전투 시작 후 첫 번째 공격의 피해량이 100% 증가합니다." },
    trait: { name: "재빠른 도주", description: "공격 속도가 기본적으로 10% 증가합니다." }
  },
  orc: {
    skill: { name: "대지 강타", description: "공격 4회마다 대상에게 150%의 위력으로 광역 피해(가정)를 줍니다." },
    trait: { name: "광폭화", description: "체력이 50% 이하가 되면 공격력이 30% 증가합니다." }
  },
  slime: {
    skill: { name: "산성 점액", description: "피격 시 공격자의 공격 속도를 2초간 20% 감소시킵니다." },
    trait: { name: "점성 재생", description: "매 초마다 최대 체력의 2%를 지속적으로 회복합니다." }
  },
  ghost: {
    skill: { name: "영혼 추출", description: "공격 시 15% 확률로 준 피해의 25%만큼 체력을 회복합니다." },
    trait: { name: "무형", description: "받는 모든 최종 피해가 15% 감소합니다." }
  },
  bat: {
    skill: { name: "급강하", description: "공격 시 20% 확률로 다음 공격 대기 시간이 50% 감소합니다." },
    trait: { name: "흡혈", description: "모든 공격에 10% 생명력 흡수 효과가 적용됩니다." }
  },
  mummy: {
    skill: { name: "부패의 저주", description: "공격 시 25% 확률로 대상이 받는 치유량을 3초간 50% 감소시킵니다." },
    trait: { name: "방부 처리", description: "체력과 방어력이 평균 이상이지만 공격 속도가 느립니다." }
  },
  minotaur: {
    skill: { name: "충격파", description: "공격 3회마다 모든 아군 유닛의 공격 속도를 1초간 30% 감소시킵니다." },
    trait: { name: "우직함", description: "기본 체력이 20%, 방어력이 30% 높게 설정됩니다." }
  },
  lich: {
    skill: { name: "망령 소환", description: "전투 중 10초마다 해골 병사 한 마리를 소환합니다." },
    trait: { name: "불사의 군주", description: "전장에 해골 병사가 있는 동안 리치의 방어력이 50% 증가합니다." }
  },
  corrupt_knight: {
    skill: { name: "어둠의 검", description: "공격 시 20% 확률로 대상의 방어력을 무시하고 큰 피해를 줍니다." },
    trait: { name: "복수의 가시", description: "피격 시 받은 피해의 20%를 공격자에게 반사합니다." }
  },
  spider: {
    skill: { name: "독니", description: "공격 시 대상에게 3초간 매초 공격력의 20%만큼 중독 피해를 주고, 전투 종료 시까지 공격 속도를 5% 감소시킵니다. (공속 감소 중첩 가능)" },
    trait: { name: "거미줄", description: "전투 시작 시 적 전체의 공격 속도를 3초간 25% 감소시킵니다." }
  }
};

const enemyTargetPriorityData = [
  { priority: 1, unitNames: ["수호자", "해골 병사"] },
  { priority: 2, unitNames: ["도적","전사"] },
  { priority: 3, unitNames: ["궁수", "마법사", "치유사", "강령술사", "마녀"] }
];