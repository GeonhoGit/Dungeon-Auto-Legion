// ==========================================
// 유닛 관련 데이터 (data/units.js)
// ==========================================

// 직업별 기본 스탯 및 정보
let unitTypes = [
  { key: "warrior", name: "전사", baseHp: 130, baseAtk: 18, baseDefense: 18, speed: 0.9 },
  { key: "archer", name: "궁수", baseHp: 110, baseAtk: 27, baseDefense: 8, speed: 1.15 },
  { key: "mage", name: "마법사", baseHp: 100, baseAtk: 36, baseDefense: 6, speed: 0.75 },
  { key: "guardian", name: "수호자", baseHp: 175, baseAtk: 14, baseDefense: 28, speed: 0.7 },
  { key: "rogue", name: "도적", baseHp: 120, baseAtk: 19, baseDefense: 10, speed: 1.65 },
  { key: "healer", name: "치유사", baseHp: 115, baseAtk: 12, baseDefense: 7, speed: 0.9 },
  { key: "necromancer", name: "강령술사", baseHp: 95, baseAtk: 22, baseDefense: 5, speed: 1.0 },
  { key: "bard", name: "음유시인", baseHp: 100, baseAtk: 8, baseDefense: 5, speed: 0.8 },
  { key: "witch", name: "마녀", baseHp: 90, baseAtk: 24, baseDefense: 5, speed: 0.85 }
];

// 등급별 스탯 증폭 배율 (1성~5성)
const gradeMultipliers = { 1: 1, 2: 1.6, 3: 2.5, 4: 4, 5: 6.5 };

// 직업별 고유 스킬과 특성 정의
const unitAbilities = {
  warrior: {
    skill: { name: "방패 강타", description: "공격 시 30% 확률로 공격력의 125% 피해를 주고 2초 동안 공격속도를 20%, 5초 동안 방어력을 15% 감소시킵니다. (재사용 대기시간 3초)" },
    awakenedSkill: { name: "진·방패 강타", description: "공격 시 45% 확률로 공격력의 175% 피해를 주고 3초 동안 공격속도를 40%, 5초 동안 방어력을 25% 감소시킵니다. (재사용 대기시간 2초)" },
    trait: { name: "전투 본능", description: "체력이 50% 이하가 되면 3초 동안 공격력과 방어력이 15% 증가합니다." }
  },
  guardian: {
    skill: { name: "수호자의 의지", description: "피격 시 20% 확률로 최대 체력의 5%를 회복합니다." },
    awakenedSkill: { name: "성역의 의지", description: "피격 시 35% 확률로 최대 체력의 10%를 회복합니다." },
    trait: { name: "철벽", description: "피격 시 15% 확률로 받는 최종 피해를 50% 감소시킵니다." }
  },
  mage: {
    skill: { name: "화염 폭발", description: "공격 4회마다 살아있는 적 3~5명에게 공격력의 100% 피해를 주고, 3초간 매초 최대 체력의 2%에 해당하는 화상 피해를 입힙니다." },
    awakenedSkill: { name: "메테오 스트라이크", description: "공격 4회마다 살아있는 모든 적에게 공격력의 120% 피해를 주고, 3초간 매초 최대 체력의 2%에 해당하는 화상 피해를 입힙니다." },
    trait: { name: "마력 증폭", description: "전투가 5초 이상 지속되면 해당 전투 동안 공격력이 25% 증가합니다." }
  },
  archer: {
    skill: { name: "연속 사격", description: "공격 시 25% 확률로 같은 대상에게 공격력의 60% 추가 피해를 주고, 3초 동안 대상의 현재 체력의 15%에 해당하는 출혈 피해를 입힙니다." },
    awakenedSkill: { name: "폭풍 사격", description: "공격 시 40% 확률로 같은 대상에게 공격력의 80% 추가 피해를 주고, 3초 동안 대상의 현재 체력의 15%에 해당하는 출혈 피해를 입힙니다." },
    trait: { name: "약점 조준", description: "체력이 40% 이하인 적을 공격할 때 피해량이 30% 증가합니다." }
  },
  rogue: {
    skill: { name: "그림자 칼날", description: "공격 시 20% 확률로 공격력의 180% 치명타 피해를 줍니다." },
    awakenedSkill: { name: "그림자 습격", description: "공격 시 35% 확률로 공격력의 220% 치명타 피해를 줍니다." },
    trait: { name: "급습", description: "전투 시작 후 첫 공격은 반드시 공격력의 250% 치명타로 적용되며, 대상을 1.5초간 기절시킵니다." }
  },
  healer: {
    skill: { name: "회복의 빛", description: "공격 2회마다 현재 체력 비율이 가장 낮은 생존 아군 1명을 (치유사 공격력의 150% + 대상 최대 체력의 5%)만큼 회복합니다." },
    awakenedSkill: { name: "찬란한 광휘", description: "공격 2회마다 현재 체력 비율이 가장 낮은 생존 아군 1명을 더 강력하게 회복합니다." },
    trait: { name: "생명의 손길", description: "치유사가 살아있는 동안 치유사의 회복량이 10% 증가합니다. 여러 명 있어도 중첩되지 않습니다." }
  },
  necromancer: {
    skill: { name: "어둠의 소환술", description: "공격 4회마다 해골 병사 1마리를 아군으로 소환합니다. (최대 2마리 유지) 소환된 해골 병사는 공격 시 10% 확률로 3초 동안 대상에게 중독 피해를 입힙니다." },
    awakenedSkill: { name: "군단 소환", description: "공격 4회마다 강화된 해골 병사 1마리를 소환합니다. (최대 2마리 유지) 소환된 해골 병사는 공격 시 10% 확률로 3초 동안 대상에게 중독 피해를 입힙니다." },
    trait: { name: "시체 폭발", description: "자신이 소환한 해골 병사가 파괴될 때, 살아있는 적 2명에게 강령술사 공격력의 200%만큼 마법 피해를 주고 3초 동안 매초 공격력의 20%에 해당하는 중독 피해를 입힙니다." }
  },
  bard: {
    skill: { name: "영웅의 서사시", description: "공격 3회마다 가장 공격력이 높은 아군 1명의 공격력을 3초간 50% 증가시킵니다." },
    awakenedSkill: { name: "전설의 서사시", description: "공격 3회마다 가장 공격력이 높은 아군 1명의 공격력을 4초간 80% 증가시킵니다." },
    trait: { name: "열광의 노래", description: "전장에 음유시인이 살아있으면 아군 전체의 공격 속도와 치명타 확률이 10% 증가합니다." }
  },
  witch: {
    skill: { name: "맹독 물약", description: "공격 2회마다 대상의 최대 체력을 0.5% 영구히 감소시키고, 흡수한 체력만큼 이번 전투 동안 자신의 최대 체력과 공격력을 증가시킵니다." },
    awakenedSkill: { name: "진·맹독 물약", description: "공격 2회마다 대상의 최대 체력을 1% 영구히 감소시키고, 흡수한 체력만큼 이번 전투 동안 자신의 최대 체력과 공격력을 증가시킵니다." },
    trait: { name: "영혼 착취", description: "스킬을 통해 흡수한 적의 생명력과 공격력이 전투가 끝날 때까지 영구적으로 계속 누적됩니다." }
  }
};