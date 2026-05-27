// lm-auto-bot.mjs
// ==========================================
// Dungeon Auto Legion - AI 자동 플레이 봇
//
// Playwright를 이용해 브라우저를 띄우고, LM Studio의 로컬 AI 모델과 통신하여
// 화면 상태를 읽고 스스로 판단하여 게임을 진행합니다.
// 설치:
//   npm install playwright
//   npx playwright install chromium
//
// 실행:
//   node lm-auto-bot.mjs
//
// 중요:
// - VS Code Live Server는 프로젝트 폴더 안 파일이 바뀌면 브라우저를 자동 새로고침할 수 있습니다.
// - 그래서 이 봇은 기본 로그를 프로젝트 폴더가 아니라 OS 임시 폴더에 저장합니다.
// - 로그 위치는 실행 시 터미널에 출력됩니다.

import { chromium } from "playwright";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// ==========================================
// 1. 환경 변수 및 기본 설정
// ==========================================

const BOT_VERSION = "live-safe-2026-05-23-v4-logfix";

const GAME_URL = process.env.GAME_URL || "http://127.0.0.1:5500/index.html";
const LM_BASE_URL = process.env.LM_BASE_URL || "http://localhost:1234/v1";

const MAX_STEPS = Number(process.env.MAX_STEPS || 5000);
const STEP_DELAY_MS = Number(process.env.STEP_DELAY_MS || 1000);
const MAX_RESTARTS = Number(process.env.MAX_RESTARTS || 30);
const MAX_REVIVES_PER_RUN = Number(process.env.MAX_REVIVES_PER_RUN || 3);
const HEADLESS = process.env.HEADLESS === "true";
const RESET_LOGS = process.env.RESET_LOGS !== "false";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOG_DIR = process.env.LOG_DIR || path.join(os.tmpdir(), "dal-bot-logs");
const LOG_FILE = process.env.LOG_FILE || path.join(LOG_DIR, "lm-run-log.json");
const LOG_JSONL_FILE = process.env.LOG_JSONL_FILE || LOG_FILE.replace(/\.json$/i, ".jsonl");
const LOG_SUMMARY_KR = process.env.LOG_SUMMARY_KR || path.join(LOG_DIR, "run-summary-korean.txt");
const LOG_ANALYSIS_FILE = process.env.LOG_ANALYSIS_FILE || path.join(LOG_DIR, "run-analysis.json");
const LOG_PATH_POINTER_FILE = process.env.LOG_PATH_POINTER_FILE || path.join(LOG_DIR, "lm-run-log-path.txt");

let runHasPassedStart = false;
let browserReloadCount = 0;

// ==========================================
// 1.5 시너지 데이터 및 분석 (Smart Heuristic)
// ==========================================
const SYNERGY_DATA = [
  { id: "vanguard", req: ["warrior", "guardian"] },
  { id: "assassin", req: ["rogue", "archer"] },
  { id: "hextech", req: ["mage", "healer"] },
  { id: "darklegion", req: ["necromancer", "rogue"] },
  { id: "berserker", req: ["warrior", "warrior", "warrior"] },
  { id: "wargod", req: ["warrior", "warrior", "warrior", "warrior", "warrior"] },
  { id: "sniper", req: ["archer", "archer", "archer"] },
  { id: "stormbow", req: ["archer", "archer", "archer", "archer", "archer"] },
  { id: "archmage", req: ["mage", "mage", "mage"] },
  { id: "elemental", req: ["mage", "mage", "mage", "mage", "mage"] },
  { id: "aegis", req: ["guardian", "guardian", "guardian"] },
  { id: "immortal", req: ["guardian", "guardian", "guardian", "guardian", "guardian"] },
  { id: "shadowlord", req: ["rogue", "rogue", "rogue"] },
  { id: "phantom", req: ["rogue", "rogue", "rogue", "rogue", "rogue"] },
  { id: "saint", req: ["healer", "healer", "healer"] },
  { id: "salvation", req: ["healer", "healer", "healer", "healer", "healer"] },
  { id: "lichking", req: ["necromancer", "necromancer", "necromancer"] },
  { id: "deathgod", req: ["necromancer", "necromancer", "necromancer", "necromancer", "necromancer"] }
];

// ==========================================
// 2. 유틸리티 및 통신 함수
// ==========================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 봇이 유닛을 평가할 때 사용하는 자체 전투력 계산 점수
function scoreUnit(unit) {
  const atk = Number(unit.attack ?? unit.atk ?? unit.baseAttack ?? unit.baseAtk ?? 0);
  const hp = Number(unit.currentHp ?? unit.maxHp ?? unit.baseMaxHp ?? unit.baseHp ?? 0);
  const def = Number(unit.defense ?? unit.baseDefense ?? 0);
  const spd = Number(unit.attackSpeed ?? unit.speed ?? unit.baseAttackSpeed ?? 1);
  const grade = Number(unit.grade ?? 1);
  let score = atk * 4 + hp * 0.4 + def * 2 + spd * 20 + grade * 100;
  if (grade >= 3) score *= 1.6; // 각성 보너스
  if (grade >= 6) score *= 1.4; // 한계 돌파 보너스
  return score;
}

function getUrgentSynergyUnits(state) {
  const fieldUnitIds = new Set(state.fieldUnits || []);
  const fieldUnits = (state.ownedUnits || []).filter((unit) => fieldUnitIds.has(unit.id));
  const typeCounts = fieldUnits.reduce((counts, unit) => {
    counts[unit.typeKey] = (counts[unit.typeKey] || 0) + 1;
    return counts;
  }, {});

  const urgent = new Set();
  for (const synergy of SYNERGY_DATA) {
    const requiredCounts = synergy.req.reduce((counts, typeKey) => {
      counts[typeKey] = (counts[typeKey] || 0) + 1;
      return counts;
    }, {});

    const missing = [];
    let missingTotal = 0;
    for (const [typeKey, requiredCount] of Object.entries(requiredCounts)) {
      const need = Math.max(0, requiredCount - (typeCounts[typeKey] || 0));
      missingTotal += need;
      for (let i = 0; i < need; i++) missing.push(typeKey);
    }

    if (missingTotal === 1) urgent.add(missing[0]);
  }

  return [...urgent];
}

function extractJson(text) {
  if (!text || typeof text !== "string") throw new Error("LM Studio 응답이 비어 있습니다.");
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`JSON을 찾지 못했습니다: ${text}`);
    return JSON.parse(match[0]);
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status} ${response.statusText}\n${body}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ==========================================
// 3. AI 연동 및 프롬프트 생성 (LM Studio)
// ==========================================

async function getLmModel() {
  try {
    const data = await fetchJson(`${LM_BASE_URL}/models`, { method: "GET", timeoutMs: 5000 });
    const modelId = data?.data?.[0]?.id;
    if (!modelId) {
      console.warn("[LM Studio] 모델이 로드되어 있지 않습니다. fallback 규칙으로 진행합니다.");
      return null;
    }
    console.log(`[LM Studio] 사용 모델: ${modelId}`);
    return modelId;
  } catch (error) {
    console.warn("[LM Studio] 서버 연결 실패. fallback 규칙으로 진행합니다.");
    console.warn(`원인: ${error.message}`);
    return null;
  }
}

// 현재 게임 상태를 AI가 이해할 수 있는 간결한 형태의 JSON으로 변환
function makeLmInput(state) {
  const aliveFieldUnitCount = (state.fieldUnits || []).filter(id => {
    const u = (state.ownedUnits || []).find(unit => unit.id === id);
    return u && (u.currentHp ?? u.maxHp) > 0;
  }).length;
  
  // 부대 능력치 밸런스 분석
  let totalAtk = 0; let totalMaxHp = 0;
  (state.ownedUnits || []).filter(u => state.fieldUnits.includes(u.id)).forEach(u => {
    totalAtk += (u.attack || 0);
    totalMaxHp += (u.maxHp ?? 1);
  });
  const balanceFactor = totalAtk / (totalMaxHp / 5);
  const squadNeed = balanceFactor > 1.2 ? "survival" : (balanceFactor < 0.8 ? "damage" : "balanced");

  // 보스전 임박 여부 계산
  const current = (state.dungeonMap || []).find(n => n.id === state.currentNodeId);
  const nextIds = current ? current.nextIds : (state.availableNodeIds || []);
  const nextNodes = nextIds.map(id => (state.dungeonMap || []).find(n => n.id === id));
  const isFinalShowdown = (current?.roomType === "boss") || nextNodes.some(n => n?.roomType === "boss");

  // 시너지 진행도 분석
  const fieldUnits = (state.ownedUnits || []).filter(u => (state.fieldUnits || []).includes(u.id));
  const fieldTypeCounts = fieldUnits.reduce((acc, u) => { acc[u.typeKey] = (acc[u.typeKey] || 0) + 1; return acc; }, {});

  return {
    screen: state.screen,
    currentStage: state.currentStage,
    gold: state.gold,
    squadNeed,
    isFinalShowdown,
    balanceRatio: balanceFactor.toFixed(2),
    urgentSynergyUnits: getUrgentSynergyUnits(state),
    currentRefreshCost: state.currentRefreshCost || 10,
    currentRoomType: state.currentRoomType,
    maxUnitGrade: state.maxUnitGrade || 5,
    aliveUnitCount: (state.ownedUnits || []).filter((u) => (u.currentHp ?? u.maxHp) > 0).length,
    deadUnitCount: (state.ownedUnits || []).filter((u) => (u.currentHp ?? u.maxHp) <= 0).length,
    aliveFieldUnitCount: aliveFieldUnitCount,
    availableNodeIds: state.availableNodeIds || [],
    dungeonMap: state.dungeonMap || [],
    currentNodeId: state.currentNodeId,
    ownedUnits: (state.ownedUnits || []).map((unit) => ({
      id: unit.id,
      name: unit.name,
      typeKey: unit.typeKey,
      grade: unit.grade,
      isAwakened: unit.grade >= 3,
      currentHp: unit.currentHp,
      maxHp: unit.maxHp,
      attack: unit.attack,
      defense: unit.defense,
      attackSpeed: unit.attackSpeed,
      score: scoreUnit(unit)
    })),
    fieldUnits: state.fieldUnits || [],
    currentEnemies: (state.currentEnemies || []).map((enemy) => ({
      id: enemy.id,
      name: enemy.name,
      type: enemy.type,
      danger: enemy.danger,
      currentHp: enemy.currentHp,
      maxHp: enemy.maxHp,
      attack: enemy.attack,
      defense: enemy.defense,
      attackSpeed: enemy.attackSpeed
    })),
    pendingRewards: state.pendingRewards || [],
    shopUnits: state.shopUnits || [],
    shopItems: state.shopItems || [],
    activeSynergies: state.activeSynergies || [],
    synergyBonuses: state.synergyBonuses || {},
    reviveCount: state.reviveCount,
    recentLogs: (state.logs || []).slice(0, 10),
    recentBattleLogs: (state.battleLogs || []).slice(-15)
  };
}

// LM Studio에 현재 상태를 보내고 다음 행동(Action)을 결정받는 핵심 함수
async function askLmStudio(model, state, purpose, restartCount = 0, stageFailures = {}) {
  if (!model) return null;

  const isAggressive = restartCount >= 5;
  const currentStageFailures = stageFailures[state.currentStage] || [];
  let stageFailureContext = "";
  if (currentStageFailures.length > 0) {
    const lastFailure = currentStageFailures[currentStageFailures.length - 1];
    stageFailureContext = `\n[실패분석] Stg ${state.currentStage} (${currentStageFailures.length}패).
적: ${lastFailure.enemies.map(e => `${e.name}(ATK:${e.atk})`).join(", ")}
로그: ${(lastFailure.lastLogs || []).join('|')}
전략 수정하라.
`;
  }

  const systemPrompt = `로컬 AI 봇이다. JSON 하나만 출력. No Markdown.
${stageFailureContext}${isAggressive ? "[공격모드] 골드 아끼지 말고 상점/확장 집중 투자.\n" : ""}
Actions: selectNode, chooseReward, buyShop, takeRest, wait, stop
Format: {"action": "...", "nodeId": n|null, "rewardIndex": n|null, "shopAction": "...", "restAction": "...", "reason": "..."}
Rules:
1. nodeId/rewardIndex는 리스트 내에서만 선택.
2. squadNeed 참고. 체력 낮으면 회복, 가득 차면 maxHp.
3. field_ticket, 3성(각성), 진화용 유닛(2개 보유시), urgentSynergyUnits 최우선.
4. 3/5인 시너지 완성 중시. 필요시 공격적 리롤.
5. 구매 불가시 leaveShop.
6. 이유는 짧게.`;

  try {
    const data = await fetchJson(`${LM_BASE_URL}/chat/completions`, {
      method: "POST",
      timeoutMs: 30000,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ purpose, restartCount, stageFailures: currentStageFailures.length, state: makeLmInput(state) }) }
        ],
        temperature: 0.2,
        max_tokens: 500
      })
    });

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error(`LM Studio 응답 형식이 이상합니다: ${JSON.stringify(data)}`);
    return extractJson(text);
  } catch (error) {
    console.warn(`[LM Studio] 판단 실패: ${error.message}`);
    return null;
  }
}

// ==========================================
// 4. 게임 제어 및 브라우저 조작 (Playwright)
// ==========================================

async function getState(page) {
  return await page.evaluate(() => {
    if (!window.DALAutomation) {
      throw new Error("window.DALAutomation이 없습니다. 수정된 main.js를 적용해야 합니다.");
    }
    const state = window.DALAutomation.getState();
    const config = window.DALAutomation.getConfig();
    if (!state || !state.screen) throw new Error(`게임 상태를 가져오는 데 실패했습니다.`);
    return { ...state, gameConfig: config };
  });
}

async function waitForCondition(page, pageFunction, arg, timeoutMs = 3000) {
  try {
    await page.waitForFunction(pageFunction, arg, { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function waitForScreen(page, expectedScreen, timeoutMs = 3000) {
  return await waitForCondition(
    page,
    (screen) => {
      const state = window.DALAutomation?.getState?.() || window.DALAutomation?.getRunSummary?.();
      return state?.screen === screen;
    },
    expectedScreen,
    timeoutMs
  );
}

async function waitForScreenChange(page, beforeScreen, timeoutMs = 3000) {
  return await waitForCondition(
    page,
    (screen) => {
      const state = window.DALAutomation?.getState?.() || window.DALAutomation?.getRunSummary?.();
      return state?.screen && state.screen !== screen;
    },
    beforeScreen,
    timeoutMs
  );
}

function makeJsonSafe(value) {
  const seen = new WeakSet();
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (typeof item === "bigint") return item.toString();
    if (typeof item === "function") return `[Function ${item.name || "anonymous"}]`;
    if (item instanceof Error) {
      return { name: item.name, message: item.message, stack: item.stack };
    }
    if (item && typeof item === "object") {
      if (seen.has(item)) return "[Circular]";
      seen.add(item);
    }
    return item;
  }));
}

/**
 * 게임 상태를 한눈에 보기 쉬운 한글 텍스트 리포트로 변환합니다.
 */
function getAliveUnitsFromState(state) {
  return (state.ownedUnits || []).filter((unit) => Number(unit.currentHp ?? unit.maxHp ?? 0) > 0);
}

function getFieldUnitsFromState(state) {
  const fieldIds = new Set(state.fieldUnits || []);
  return (state.ownedUnits || []).filter((unit) => fieldIds.has(unit.id));
}

function getHpRatio(unit) {
  const maxHp = Math.max(1, Number(unit.maxHp ?? unit.baseMaxHp ?? 1));
  return Number(unit.currentHp ?? maxHp) / maxHp;
}

function inferBalanceWarnings(state) {
  const aliveUnits = getAliveUnitsFromState(state);
  const fieldUnits = getFieldUnitsFromState(state).filter((unit) => getHpRatio(unit) > 0);
  const lowHpUnits = aliveUnits.filter((unit) => getHpRatio(unit) <= 0.4);
  const hasTank = fieldUnits.some((unit) => ["warrior", "guardian"].includes(unit.typeKey));
  const hasHealer = fieldUnits.some((unit) => unit.typeKey === "healer");
  const warnings = [];

  if (fieldUnits.length === 0) warnings.push("필드 유닛 없음: 다음 노드 진입 전에 배치 필요");
  if (!hasTank) warnings.push("전사/수호자 없음: 적 타겟 우선순위 때문에 딜러가 바로 맞을 수 있음");
  if (!hasHealer) warnings.push("치유사 없음: 연속 전투에서 체력 유지가 어려울 수 있음");
  if (lowHpUnits.length > 0) warnings.push(`저체력 유닛 ${lowHpUnits.length}명: 휴식/회복 보상 우선`);
  if (Number(state.gold || 0) < Number(state.gameConfig?.shop?.unitCost || 15)) warnings.push("골드 부족: 상점방 가치 낮음");
  if (!(state.activeSynergies || []).length) warnings.push("활성 시너지 없음: 보상/상점에서 조합 완성 우선");

  return warnings;
}

function formatDecisionDetails(decision) {
  if (!decision) return "대기";
  if (decision.shopAction) return `${decision.action} / ${decision.shopAction}`;
  if (decision.restAction) return `${decision.action} / ${decision.restAction}`;
  if (decision.rewardIndex != null) return `${decision.action} / rewardIndex=${decision.rewardIndex}`;
  if (decision.nodeId != null) return `${decision.action} / nodeId=${decision.nodeId}`;
  return decision.action || "대기";
}

function generateKoreanSummary(state, step, decision, runStats = null) {
  const date = new Date().toLocaleString("ko-KR");
  const aliveUnits = getAliveUnitsFromState(state);
  const fieldUnits = getFieldUnitsFromState(state);
  const lowHpUnits = aliveUnits.filter((unit) => getHpRatio(unit) <= 0.4);
  const warnings = inferBalanceWarnings(state);
  const tanks = fieldUnits.filter((unit) => ["warrior", "guardian"].includes(unit.typeKey));
  const healers = fieldUnits.filter((unit) => unit.typeKey === "healer");
  
  let report = `
============================================================
[자동 밸런스 리포트 - Step ${step}]
기록 일시: ${date}
------------------------------------------------------------
[현재 상태]
- 현재 화면: ${state.screen}
- 스테이지: ${state.currentStage} (최대 해금 성급: ${state.maxUnitGrade}성)
- 보유 골드: ${state.gold} G
- 부활 횟수: ${state.reviveCount} 회
- 최고 도달 스테이지: ${runStats?.maxStageReached ?? state.currentStage}

[봇의 결정]
- 실행 행동: ${formatDecisionDetails(decision)}
- 결정 이유: ${decision?.reason || "없음"}

[부대 정보]
- 생존 유닛 수: ${aliveUnits.length} 마리
- 필드 유닛 수: ${fieldUnits.length} 마리
- 탱커 배치: ${tanks.map((unit) => unit.name).join(", ") || "없음"}
- 치유사 배치: ${healers.length}명
- 저체력 유닛: ${lowHpUnits.map((unit) => `${unit.name} ${Math.round(getHpRatio(unit) * 100)}%`).join(", ") || "없음"}
- 활성 시너지: ${(state.activeSynergies || []).join(", ") || "없음"}
- 필드 배치 유닛:
${fieldUnits.map(u => `  * ${u.isAwakened ? '[각성] ' : ''}${u.name} (${u.grade}성) - HP ${Math.ceil(u.currentHp)}/${u.maxHp}, ATK ${u.attack}, DEF ${u.defense ?? u.baseDefense ?? 0}`).join('\n') || "  - 없음"}

[개선 신호]
${warnings.length ? warnings.map((warning) => `  - ${warning}`).join("\n") : "  - 즉시 조정할 위험 신호 없음"}

[이번 실행 집계]
- 총 스텝: ${runStats?.steps ?? "-"}
- 게임오버/재시작: ${runStats?.gameOverCount ?? 0} / ${runStats?.restartCount ?? 0}
- 선택한 보상: ${JSON.stringify(runStats?.rewardCounts || {})}
- 상점 행동: ${JSON.stringify(runStats?.shopActions || {})}
- 휴식 행동: ${JSON.stringify(runStats?.restActions || {})}

[최근 전투 로그]
${(state.battleLogs || []).slice(-8).map(l => `  > ${l}`).join('\n') || "  - 없음"}

[최근 시스템 로그]
${(state.logs || []).slice(0, 3).map(l => `  # ${l}`).join('\n')}
============================================================
`;
  return report;
}

async function saveKoreanSummary(report) {
  await fs.writeFile(LOG_SUMMARY_KR, report, "utf-8");
}

async function atomicWriteFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmpPath, content, "utf-8");
  await fs.rename(tmpPath, filePath);
}

async function ensureLogDirs() {
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  await fs.mkdir(path.dirname(LOG_JSONL_FILE), { recursive: true });
}

async function writeLogPathPointer() {
  const text = [
    `BOT_VERSION=${BOT_VERSION}`,
    `LOG_FILE=${LOG_FILE}`,
    `LOG_JSONL_FILE=${LOG_JSONL_FILE}`,
    `RESET_LOGS=${RESET_LOGS}`,
    `LOG_SUMMARY_KR=${LOG_SUMMARY_KR}`,
    `LOG_ANALYSIS_FILE=${LOG_ANALYSIS_FILE}`,
    `updatedAt=${new Date().toISOString()}`
  ].join("\n") + "\n";

  try {
    await fs.writeFile(LOG_PATH_POINTER_FILE, text, "utf-8");
    console.log(`[log] 로그 위치 안내 파일: ${LOG_PATH_POINTER_FILE}`);
  } catch (error) {
    console.warn(`[log] 로그 위치 안내 파일 작성 실패: ${error.message}`);
  }
}

async function initLogFile() {
  await ensureLogDirs();
  if (RESET_LOGS) {
    await atomicWriteFile(LOG_FILE, JSON.stringify([], null, 2));
    await atomicWriteFile(LOG_JSONL_FILE, "");
    await atomicWriteFile(LOG_ANALYSIS_FILE, JSON.stringify({ status: "initialized", updatedAt: new Date().toISOString() }, null, 2));
    console.log(`[log] 기존 로그 초기화: ${LOG_FILE}`);
    console.log(`[log] JSONL 로그 초기화: ${LOG_JSONL_FILE}`);
    console.log(`[log] 분석 로그 초기화: ${LOG_ANALYSIS_FILE}`);
  } else {
    console.log(`[log] 기존 로그에 이어쓰기: ${LOG_FILE}`);
    console.log(`[log] JSONL 로그에 이어쓰기: ${LOG_JSONL_FILE}`);
  }
  await writeLogPathPointer();
}

async function saveLog(entry) {
  await ensureLogDirs();
  const safeEntry = makeJsonSafe(entry);

  // 1) append-only JSONL을 먼저 기록합니다.
  // 기존 JSON 배열 파일이 깨져도 최소한 이 파일에는 매 step 로그가 남습니다.
  await fs.appendFile(LOG_JSONL_FILE, `${JSON.stringify(safeEntry)}\n`, "utf-8");

  // 2) 사람이 보기 쉬운 JSON 배열 파일도 유지합니다.
  let logs = [];
  try {
    const old = await fs.readFile(LOG_FILE, "utf-8");
    const parsed = old.trim() ? JSON.parse(old) : [];
    logs = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const backupFile = `${LOG_FILE}.corrupt-${Date.now()}.bak`;
    try {
      await fs.copyFile(LOG_FILE, backupFile);
      console.warn(`[log] 기존 JSON 로그가 깨져 백업했습니다: ${backupFile}`);
    } catch {
      // 기존 파일이 없으면 무시합니다.
    }
    logs = [];
  }

  logs.push(safeEntry);
  await atomicWriteFile(LOG_FILE, JSON.stringify(logs, null, 2));
}

function createRunStats() {
  return {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    steps: 0,
    maxStageReached: 1,
    screenCounts: {},
    actionCounts: {},
    rewardCounts: {},
    shopActions: {},
    restActions: {},
    gameOverCount: 0,
    restartCount: 0,
    battleStartCount: 0,
    lowHpEvents: 0,
    tankFieldSteps: 0,
    healerFieldSteps: 0,
    selectedRewards: [],
    selectedShopActions: [],
    selectedRestActions: [],
    lastState: null,
    lastDecision: null,
    stageFailures: {}
  };
}

function incrementCounter(target, key) {
  const safeKey = key || "unknown";
  target[safeKey] = (target[safeKey] || 0) + 1;
}

function getRewardByDecision(state, decision) {
  if (!state || !decision || decision.rewardIndex == null) return null;
  const index = Number(decision.rewardIndex);
  return (state.pendingRewards || []).find((reward, fallbackIndex) => Number(reward.index ?? fallbackIndex) === index) || null;
}

function updateRunStats(runStats, beforeState, afterState, decision) {
  const state = afterState || beforeState || {};
  runStats.steps += 1;
  runStats.maxStageReached = Math.max(runStats.maxStageReached, Number(state.currentStage || 1));
  incrementCounter(runStats.screenCounts, state.screen);
  incrementCounter(runStats.actionCounts, decision?.action);

  if (state.screen === "gameover") runStats.gameOverCount += 1;
  if (decision?.action === "restart") runStats.restartCount += 1;
  if (decision?.action === "startBattle") runStats.battleStartCount += 1;

  if (decision?.shopAction) {
    incrementCounter(runStats.shopActions, decision.shopAction);
    runStats.selectedShopActions.push({ step: runStats.steps, stage: state.currentStage, action: decision.shopAction });
  }

  if (decision?.restAction) {
    incrementCounter(runStats.restActions, decision.restAction);
    runStats.selectedRestActions.push({ step: runStats.steps, stage: state.currentStage, action: decision.restAction });
  }

  const reward = getRewardByDecision(beforeState, decision);
  if (reward) {
    incrementCounter(runStats.rewardCounts, reward.kind);
    runStats.selectedRewards.push({
      step: runStats.steps,
      stage: beforeState.currentStage,
      kind: reward.kind,
      name: reward.unit?.name || reward.item?.name || reward.name || reward.kind
    });
  }

  const fieldUnits = getFieldUnitsFromState(state).filter((unit) => getHpRatio(unit) > 0);
  if (fieldUnits.some((unit) => ["warrior", "guardian"].includes(unit.typeKey))) runStats.tankFieldSteps += 1;
  if (fieldUnits.some((unit) => unit.typeKey === "healer")) runStats.healerFieldSteps += 1;
  if (getAliveUnitsFromState(state).some((unit) => getHpRatio(unit) <= 0.4)) runStats.lowHpEvents += 1;

  runStats.lastState = {
    screen: state.screen,
    currentStage: state.currentStage,
    gold: state.gold,
    aliveUnitCount: getAliveUnitsFromState(state).length,
    fieldUnitCount: fieldUnits.length,
    activeSynergies: state.activeSynergies || [],
    recentBattleLogs: (state.battleLogs || []).slice(-10)
  };
  runStats.lastDecision = decision || null;
}

function buildRunAnalysis(runStats) {
  const recommendations = [];
  if (runStats.gameOverCount > 0 || runStats.restartCount > 0) {
    recommendations.push("게임오버가 발생했습니다. 마지막 전투 로그와 저체력 이벤트를 우선 확인하세요.");
  }
  if (runStats.lowHpEvents >= Math.max(3, Math.floor(runStats.steps * 0.25))) {
    recommendations.push("저체력 이벤트가 많습니다. 휴식/회복 보상 가치 또는 적 피해량을 조정할 필요가 있습니다.");
  }
  if (runStats.healerFieldSteps < Math.floor(runStats.steps * 0.25)) {
    recommendations.push("치유사가 필드에 적게 배치됐습니다. 치유사 선택 가치 또는 봇 배치 우선순위를 더 올릴 수 있습니다.");
  }
  if (runStats.tankFieldSteps < Math.floor(runStats.steps * 0.25)) {
    recommendations.push("전사/수호자 배치가 적습니다. 탱커 보상 선택 또는 배치 우선순위를 점검하세요.");
  }
  if (!Object.keys(runStats.rewardCounts).length) {
    recommendations.push("보상 선택까지 도달하지 못했습니다. 초반 전투 난이도 또는 시작 부대 구성을 확인하세요.");
  }

  return {
    ...runStats,
    finishedAt: new Date().toISOString(),
    recommendations
  };
}

async function saveRunAnalysis(runStats) {
  await atomicWriteFile(LOG_ANALYSIS_FILE, JSON.stringify(buildRunAnalysis(runStats), null, 2));
}

function withCacheBust(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}botVersion=${encodeURIComponent(BOT_VERSION)}&t=${Date.now()}`;
}

async function getDebugInfo(page) {
  return await page.evaluate(() => {
    const state = window.DALAutomation?.getState?.() || window.DALAutomation?.getRunSummary?.() || null;
    return {
      href: location.href,
      title: document.title,
      hasStartGame: typeof window.startGame === "function",
      hasDALAutomation: Boolean(window.DALAutomation),
      screen: state?.screen ?? null,
      currentStage: state?.currentStage ?? null,
      starterUnitChoiceCount: state?.starterUnitChoices?.length ?? null,
      ownedUnitCount: state?.ownedUnits?.length ?? null,
      fieldUnitCount: state?.fieldUnits?.length ?? null,
      availableNodeIds: state?.availableNodeIds ?? null,
      appText: document.getElementById("app")?.innerText?.slice(0, 400) ?? ""
    };
  });
}

function logStep(step, beforeScreen, afterScreen, decision) {
  const parts = [`[${step}]`, `screen=${beforeScreen}->${afterScreen}`, `action=${decision?.action || "unknown"}`];
  if (decision?.nodeId != null) parts.push(`nodeId=${decision.nodeId}`);
  if (decision?.rewardIndex != null) parts.push(`rewardIndex=${decision.rewardIndex}`);
  if (decision?.shopAction) parts.push(`shopAction=${decision.shopAction}`);
  if (decision?.restAction) parts.push(`restAction=${decision.restAction}`);
  if (decision?.reason) parts.push(`reason="${decision.reason}"`);
  console.log(parts.join(" "));
}

async function handleStart(page) {
  const result = await page.evaluate(() => {
    if (typeof window.startGame === "function") {
      window.startGame();
    } else {
      const buttons = [...document.querySelectorAll("button")];
      const startButton = buttons.find((button) => button.textContent.includes("게임") || button.textContent.includes("시작"));
      if (!startButton) throw new Error("startGame 함수와 시작 버튼을 찾지 못했습니다.");
      startButton.click();
    }

    if (typeof gameState !== "undefined") gameState.isAiEnabled = true;
    return {
      screenAfterCall: window.DALAutomation?.getState?.().screen ?? null,
      appText: document.getElementById("app")?.innerText?.slice(0, 300) ?? ""
    };
  });

  await waitForScreen(page, "dungeon", 8000);
  const afterState = await getState(page);
  if (afterState.screen !== "dungeon") {
    const debugInfo = await getDebugInfo(page).catch((error) => ({ debugError: error.message }));
    throw new Error(`startGame 후 dungeon 전환 실패: ${JSON.stringify({ result, debugInfo })}`);
  }

  runHasPassedStart = true;
  return {
    action: "startGame",
    reason: "window.startGame() 직접 호출",
    afterScreen: afterState.screen
  };
}

async function deployBestUnits(page, state) {
  const ownedUnits = state.ownedUnits || [];
  const maxFieldUnits = Number(state.maxFieldUnits || 5);

  const aliveUnits = ownedUnits.filter((unit) => Number(unit.currentHp ?? unit.maxHp ?? 0) > 0);

  // 직업(typeKey)별 생존 유닛 수 파악 (시너지 가중치 계산용)
  const typeCounts = aliveUnits.reduce((acc, u) => {
    acc[u.typeKey] = (acc[u.typeKey] || 0) + 1;
    return acc;
  }, {});

  const candidates = aliveUnits
    .map((unit) => {
      let score = scoreUnit(unit); // 각성/한계돌파 반영된 기본 점수
      const count = typeCounts[unit.typeKey] || 0;

      // 전열 유닛(Tanks) 배치 가중치 (적 타겟 우선순위 반영)
      if (["guardian", "warrior"].includes(unit.typeKey)) {
        score += 80;
      }

      // 단일 직업 다수 배치 시너지 (광전사, 명사수 등 3인/5인 효과) 보너스
      if (count >= 5) score += 300;
      else if (count >= 3) score += 150;
      else if (count >= 2) score += 50; // 곧 3인이 될 수 있으므로 약간의 가점

      // 2인 조합 시너지 (선봉대, 암살단, 마법공학, 어둠의 군단) 보너스
      // 한 명만 있어도 시너지를 켤 가능성이 있으므로 가중치 부여
      if (["warrior", "guardian"].includes(unit.typeKey) && (typeCounts["warrior"] || typeCounts["guardian"])) score += 100;
      if ((unit.typeKey === "rogue" && typeCounts["archer"]) || (unit.typeKey === "archer" && typeCounts["rogue"])) score += 100;
      if ((unit.typeKey === "mage" && typeCounts["healer"]) || (unit.typeKey === "healer" && typeCounts["mage"])) score += 100;
      if ((unit.typeKey === "necromancer" && typeCounts["rogue"]) || (unit.typeKey === "rogue" && typeCounts["necromancer"])) score += 100;

      return { unit, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.unit)
    .slice(0, maxFieldUnits);

  const candidateIds = candidates.map((unit) => unit.id);

  return await page.evaluate((ids) => {
    const deployedIds = [];
    for (const id of ids) {
      const state = window.DALAutomation.getState();
      if ((state.fieldUnits || []).includes(id)) continue;
      if ((state.fieldUnits || []).length >= Number(state.maxFieldUnits || 0)) break;
      window.deployUnitToField(id);
      const after = window.DALAutomation.getState();
      if ((after.fieldUnits || []).includes(id)) deployedIds.push(id);
    }
    return { deployedIds, fieldUnits: window.DALAutomation.getState().fieldUnits };
  }, candidateIds);
}

function chooseFallbackNode(state) {
  const availableNodeIds = state.availableNodeIds || [];
  if (!availableNodeIds.length) return null;
  
  const nodes = availableNodeIds.map(id => state.dungeonMap.find(n => n.id === id)).filter(Boolean);
  const alive = (state.ownedUnits || []).filter(u => (u.currentHp ?? u.maxHp) > 0);
  const avgHp = alive.reduce((s, u) => s + (u.currentHp/u.maxHp), 0) / (alive.length || 1);

  const scoreNode = (node) => {
    let s = { boss: 1000, shop: 50, battle: 40, rest: 10 }[node.roomType] || 0;
    if (node.roomType === "shop") {
      if (state.gold > 150) s += 60;
      if (state.gold < 30) s -= 40;
    }
    if (node.roomType === "rest") {
      if (avgHp < 0.45) s += 150;
      if (avgHp > 0.85) s -= 50;
    }
    // Look-ahead (미래 경로 가치 반영)
    if (node.nextIds?.length) {
      const nexts = node.nextIds.map(nid => state.dungeonMap.find(n => n.id === nid));
      if (nexts.some(nn => nn.roomType === "boss")) s += 200;
    }
    return s;
  };
  return nodes.sort((a, b) => scoreNode(b) - scoreNode(a))[0].id;
}

async function handleDungeon(page, model, state, restartCount, stageFailures) {
  const deployResult = await deployBestUnits(page, state);
  const refreshedState = await getState(page);

  if ((refreshedState.aliveFieldUnitCount ?? (refreshedState.fieldUnits || []).length) < 1) {
    throw new Error(`필드 배치 실패: ${JSON.stringify(deployResult)}`);
  }

  const decision = await askLmStudio(model, refreshedState, "selectNode", restartCount, stageFailures);
  const availableNodeIds = refreshedState.availableNodeIds || [];
  let nodeId = null;

  if (decision?.action === "selectNode" && decision.nodeId != null && availableNodeIds.includes(Number(decision.nodeId))) {
    nodeId = Number(decision.nodeId);
  } else {
    nodeId = chooseFallbackNode(refreshedState);
  }

  if (nodeId == null) return { action: "wait", reason: "선택 가능한 노드가 없습니다.", deployResult };

  const beforeScreen = refreshedState.screen;
  const result = await page.evaluate((id) => {
    window.selectMapNode(id);
    const after = window.DALAutomation.getState();
    return {
      screenAfterSelect: after.screen,
      currentRoomType: after.currentRoomType,
      currentNodeId: after.currentNodeId,
      message: after.message,
      currentEnemyCount: after.currentEnemies?.length || 0
    };
  }, nodeId);

  await waitForScreenChange(page, beforeScreen, 3000);
  const afterState = await getState(page);

  return {
    action: "selectNode",
    nodeId,
    reason: decision?.reason || "fallback 노드 선택",
    deployResult,
    result,
    lmDecision: decision,
    afterScreen: afterState.screen
  };
}

async function handleBattle(page, state) {
  if (state.isWaitingForReward && typeof state.pendingRewardDelaySeconds === "number") {
    const skipped = await page.evaluate(() => {
      if (typeof window.skipRewardDelayToRewardRoom === "function") {
        window.skipRewardDelayToRewardRoom();
        return true;
      }
      return false;
    });
    await sleep(300);
    return { action: skipped ? "skipRewardDelay" : "waitBattle", reason: "보상 대기 처리" };
  }

  const result = await page.evaluate(() => {
    if (typeof window.canStartBattle === "function" && window.canStartBattle()) {
      window.startBattle();
      return "startBattle";
    }
    return "waitBattle";
  });
  await sleep(200);
  const battleLogs = state.battleLogs || [];
  const recentLogs = battleLogs.filter(l => !l.includes('---') && !l.includes('전투 내용')).slice(-3);
  
  const allies = state.battleUnits || [];
  const enemies = state.currentEnemies || [];
  const aliveA = allies.filter(u => u.currentHp > 0).length;
  const aliveE = enemies.filter(u => u.currentHp > 0).length;

  const status = `[아군:${aliveA} 적:${aliveE}] ${recentLogs.join(" | ") || "전투 진행 중..."}`;
  return { action: result, reason: result === "startBattle" ? "전투 시작" : status };
}

function chooseFallbackReward(state) {
  const rewards = state.pendingRewards || [];
  if (!rewards.length) return 0;

  const aliveUnits = (state.ownedUnits || []).filter((unit) => Number(unit.currentHp ?? unit.maxHp ?? 0) > 0);
  const avgHpRatio = aliveUnits.length
    ? aliveUnits.reduce((sum, unit) => sum + Number(unit.currentHp ?? unit.maxHp ?? 0) / Math.max(1, Number(unit.maxHp ?? unit.baseMaxHp ?? 1)), 0) / aliveUnits.length
    : 1;

  if (avgHpRatio < 0.5) {
    const heal = rewards.find((reward) => reward.kind === "heal");
    if (heal) return Number(heal.index ?? rewards.indexOf(heal));
  }

  const awakenedUnit = rewards.find((reward) => reward.kind === "unit" && (reward.unit?.grade >= 3));
  if (awakenedUnit) return Number(awakenedUnit.index ?? rewards.indexOf(awakenedUnit));

  // 2. 진화(합성) 가능한 유닛 보상이 있다면 선택
  const combinableUnit = rewards.find((reward) => {
    if (reward.kind === "unit") {
      const matchCount = (state.ownedUnits || []).filter(ou => ou.typeKey === reward.unit.typeKey && ou.grade === reward.unit.grade).length;
      return matchCount >= 2;
    }
    return false;
  });
  if (combinableUnit) return Number(combinableUnit.index ?? rewards.indexOf(combinableUnit));

  // 2.5 긴급 시너지 유닛 보상이 있다면 선택 (시너지 활성화 직전)
  const urgentSynergyTypes = getUrgentSynergyUnits(state);
  const synergyUnit = rewards.find((reward) => 
    reward.kind === "unit" && urgentSynergyTypes.includes(reward.unit?.typeKey)
  );
  if (synergyUnit) return Number(synergyUnit.index ?? rewards.indexOf(synergyUnit));

  const fieldTicket = rewards.find((reward) => {
    const name = String(reward.name || "");
    const text = String(reward.text || "");
    const key = String(reward.typeKey || reward.item?.key || "");
    return key === "field_ticket" || name.includes("확장") || text.includes("필드");
  });
  if (fieldTicket) return Number(fieldTicket.index ?? rewards.indexOf(fieldTicket));

  const highGradeUnit = rewards.find((reward) => reward.kind === "unit" && Number(reward.grade || 1) >= 2);
  if (highGradeUnit) return Number(highGradeUnit.index ?? rewards.indexOf(highGradeUnit));

  const itemReward = rewards.find((reward) => reward.kind === "item");
  if (itemReward) return Number(itemReward.index ?? rewards.indexOf(itemReward));

  return Number(rewards[0].index ?? 0);
}

async function handleReward(page, model, state, restartCount, stageFailures) {
  const decision = await askLmStudio(model, state, "chooseReward", restartCount, stageFailures);
  const validRewardIndexes = new Set((state.pendingRewards || []).map((reward, i) => Number(reward.index ?? i)));
  let rewardIndex = null;

  if (decision?.action === "chooseReward" && decision.rewardIndex != null && validRewardIndexes.has(Number(decision.rewardIndex))) {
    rewardIndex = Number(decision.rewardIndex);
  } else {
    rewardIndex = chooseFallbackReward(state);
  }

  await page.evaluate((index) => window.claimReward(index), rewardIndex);
  await sleep(500);
  return { action: "chooseReward", rewardIndex, reason: decision?.reason || "fallback 보상 선택", lmDecision: decision };
}

async function handleShop(page, model, state, restartCount, stageFailures) {
  const decision = await askLmStudio(model, state, "buyShop", restartCount, stageFailures);
  const allowed = new Set(["buyShopUnit0", "buyShopUnit1", "buyShopUnit2", "buyShopItem0", "buyShopItem1", "buyShopItem2", "refreshShop", "buyFieldUpgrade", "leaveShop"]);
  let shopAction = allowed.has(decision?.shopAction) ? decision.shopAction : chooseFallbackShopAction(state);

  // 골드 부족 시 강제로 leaveShop으로 변경하여 무한 루프 방지
  const gold = Number(state.gold || 0);
  const unitCost = Number(state.gameConfig?.shop?.unitCost || 15);
  const fieldCost = Number(state.fieldUpgradeCost || state.gameConfig?.shop?.fieldUpgradeBaseCost || 50);
  const refreshCost = Number(state.currentRefreshCost || state.gameConfig?.shop?.refreshCost || 10);

  if (shopAction.startsWith("buyShopUnit")) {
    const index = parseInt(shopAction.replace("buyShopUnit", ""), 10);
    const unit = state.shopUnits?.[index];
    if (gold < unitCost || !unit) shopAction = "leaveShop";
  } else if (shopAction.startsWith("buyShopItem")) {
    const index = parseInt(shopAction.replace("buyShopItem", ""), 10);
    const item = state.shopItems?.[index];
    const itemCost = item ? (item.tier || 1) * 20 : 0;
    if (gold < itemCost || !item) shopAction = "leaveShop";
  } else if (shopAction === "refreshShop" && gold < refreshCost) {
    shopAction = "leaveShop";
  } else if (shopAction === "buyFieldUpgrade" && gold < fieldCost) {
    shopAction = "leaveShop";
  }

  await page.evaluate((action) => {
    if (action.startsWith("buyShopUnit")) window.buyShopUnit(parseInt(action.replace("buyShopUnit", ""), 10));
    if (action.startsWith("buyShopItem")) window.buyShopItem(parseInt(action.replace("buyShopItem", ""), 10));
    if (action === "refreshShop") window.refreshShop();
    if (action === "buyFieldUpgrade") window.buyFieldUpgrade();
    if (action === "leaveShop") window.leaveShop();
  }, shopAction);
  await sleep(500);
  return { action: "buyShop", shopAction, reason: decision?.reason || "fallback 상점 처리", lmDecision: decision };
}

function chooseFallbackShopAction(state) {
  const unitCost = Number(state.gameConfig?.shop?.unitCost || 15);
  const fieldCost = Number(state.fieldUpgradeCost || state.gameConfig?.shop?.fieldUpgradeBaseCost || 50);
  const refreshCost = Number(state.currentRefreshCost || state.gameConfig?.shop?.refreshCost || 10);
  
  const shopUnits = state.shopUnits || [];
  const ownedUnits = state.ownedUnits || [];
  const gold = Number(state.gold || 0);

  if (gold >= unitCost && ownedUnits.length < 20) {
    const urgentUnits = getUrgentSynergyUnits(state);
    let bestUnitIndex = -1;
    let bestUnitScore = -1;

    for (let i = 0; i < shopUnits.length; i++) {
      const su = shopUnits[i];
      if (!su) continue;

      let score = 0;
      // 1. 합성(진화) 가중치
      const matchCount = ownedUnits.filter(ou => ou.typeKey === su.typeKey && ou.grade === su.grade).length;
      if (matchCount === 2) score += 500; // 즉시 진화 가능
      else if (matchCount === 1) score += 200; // 대기 중인 유닛 존재

      // 2. 시너지 완성 가중치
      if (urgentUnits.includes(su.typeKey)) score += 400;

      // 3. 현재 부대 구성과의 일치성 (시너지 빌드업)
      const fieldUnitIds = new Set(state.fieldUnits || []);
      if (ownedUnits.filter(u => fieldUnitIds.has(u.id)).some(u => u.typeKey === su.typeKey)) score += 100;

      // 4. 고등급 가중치
      score += (su.grade * 30);

      if (score > bestUnitScore) {
        bestUnitScore = score;
        bestUnitIndex = i;
      }
    }

    if (bestUnitIndex !== -1 && bestUnitScore >= 100) return `buyShopUnit${bestUnitIndex}`;

    const shopItems = state.shopItems || [];
    const availableItemIndex = shopItems.findIndex(i => i !== null && state.gold >= (i.tier || 1) * 20);
    if (availableItemIndex !== -1) return `buyShopItem${availableItemIndex}`;

    // 유용한 유닛이 없지만 돈이 여유롭다면 새로고침
    if (gold >= refreshCost + unitCost + 50) return "refreshShop";

    // 정말 살게 없지만 자리가 남고 돈이 많다면 합성 재료용으로 아무 유닛이나 구매
    if (gold >= 100 && bestUnitIndex !== -1) return `buyShopUnit${bestUnitIndex}`;
  }
  if (state.gold >= fieldCost && Number(state.maxFieldUnits || 0) < Number(state.maxFieldUnitLimit || 10)) return "buyFieldUpgrade";
  return "leaveShop";
}

async function handleRest(page, model, state, restartCount, stageFailures) {
  const decision = await askLmStudio(model, state, "takeRest", restartCount, stageFailures);
  const allowed = new Set(["allHeal", "singleHeal", "maxHp"]);
  let restAction = allowed.has(decision?.restAction) ? decision.restAction : chooseFallbackRestAction(state);

  // 부대 체력이 모두 꽉 찼다면 강제로 최대 체력 증가(maxHp)로 변경하여 낭비 방지
  const aliveUnits = (state.ownedUnits || []).filter((unit) => Number(unit.currentHp ?? unit.maxHp ?? 0) > 0);
  const isFullHp = aliveUnits.length > 0 && aliveUnits.every((unit) => {
    const hp = Number(unit.currentHp ?? unit.maxHp ?? 0);
    const maxHp = Math.max(1, Number(unit.maxHp ?? unit.baseMaxHp ?? 1));
    return hp >= maxHp;
  });

  if (isFullHp && (restAction === "allHeal" || restAction === "singleHeal")) {
    restAction = "maxHp";
  }

  await page.evaluate((type) => window.takeRestReward(type), restAction);
  await sleep(500);
  return { action: "takeRest", restAction, reason: decision?.reason || "fallback 휴식 처리", lmDecision: decision };
}

function chooseFallbackRestAction(state) {
  const aliveUnits = (state.ownedUnits || []).filter((unit) => Number(unit.currentHp ?? unit.maxHp ?? 0) > 0);
  if (!aliveUnits.length) return "maxHp";

  let minHpRatio = 1;
  let sumHpRatio = 0;
  for (const unit of aliveUnits) {
    const hp = Number(unit.currentHp ?? unit.maxHp ?? 0);
    const maxHp = Math.max(1, Number(unit.maxHp ?? unit.baseMaxHp ?? 1));
    const ratio = hp / maxHp;
    if (ratio < minHpRatio) minHpRatio = ratio;
    sumHpRatio += ratio;
  }
  const avgHpRatio = sumHpRatio / aliveUnits.length;

  if (minHpRatio < 0.4) return "singleHeal";
  if (avgHpRatio < 0.7) return "allHeal";
  return "maxHp";
}

// 메인 루프: AI의 결정을 실제 게임 화면 클릭(스크립트 실행)으로 연결
async function decideAndAct(page, model, state, restartCount, stageFailures) {
  if (state.screen === "start") {
    if (runHasPassedStart) {
      console.warn(`[start] 진행 중 start 화면으로 돌아왔습니다. 자동으로 새 게임 시작을 다시 시도합니다. 로그: ${LOG_FILE}`);
    }
    return await handleStart(page);
  }
  if (state.screen === "dungeon") return await handleDungeon(page, model, state, restartCount, stageFailures);
  if (state.screen === "battle") return await handleBattle(page, state);
  if (state.screen === "reward") return await handleReward(page, model, state, restartCount, stageFailures);
  if (state.screen === "shop") return await handleShop(page, model, state, restartCount, stageFailures);
  if (state.screen === "rest") return await handleRest(page, model, state, restartCount, stageFailures);
  if (state.screen === "gameover") {
    const config = state.gameConfig || {};
    const baseReviveCost = config.rewards?.reviveCost ?? 50;
    const currentReviveCount = state.reviveCount || 0;
    const reviveCost = baseReviveCost * (currentReviveCount + 1);

    // 골드가 충분하고, 이번 판의 부활 제한 횟수를 넘지 않았을 때만 부활 시도
    if (Number(state.gold) >= reviveCost && currentReviveCount < MAX_REVIVES_PER_RUN) {
      console.log(`[REVIVE] 골드 ${state.gold}G 확인 (필요: ${reviveCost}G). 부활을 시도합니다.`);
      const result = await page.evaluate(() => {
        if (typeof window.revive === "function") { window.revive(); return true; }
        return false;
      });
      if (result) {
        await sleep(500);
        return { action: "revive", reason: `골드 ${reviveCost}G를 지불하고 ${currentReviveCount + 1}회차 부활 성공` };
      }
    } else if (currentReviveCount >= MAX_REVIVES_PER_RUN) {
      console.log(`[RESTART] 이번 판의 부활 제한(${MAX_REVIVES_PER_RUN}회)을 모두 소모했습니다. 새로 시작합니다.`);
    }

    if (restartCount < MAX_RESTARTS) {
      return { action: "restart", reason: `게임 오버 - 재시작 시도 (${restartCount + 1}/${MAX_RESTARTS})` };
    }
    return { action: "stop", reason: "최대 재시작 횟수 도달" };
  }
  return { action: "wait", reason: `알 수 없는 screen: ${state.screen}` };
}

// ==========================================
// 5. 봇 메인 실행 함수
// ==========================================

async function main() {
  console.log(`=== LM Studio Auto Bot 시작: ${BOT_VERSION} ===`);
  console.log(`접속 URL: ${GAME_URL}`);
  console.log(`AI 서버: ${LM_BASE_URL}`);
  console.log(`최대 실행 단계: ${MAX_STEPS}`);
  console.log(`단계별 지연 시간: ${STEP_DELAY_MS}ms`);
  console.log(`브라우저 숨김(Headless): ${HEADLESS}`);
  console.log(`로그 파일: ${LOG_FILE}`);
  console.log(`JSONL 로그: ${LOG_JSONL_FILE}`);
  console.log(`분석 보고서: ${LOG_ANALYSIS_FILE}`);
  console.log(`로그 경로 정보: ${LOG_PATH_POINTER_FILE}`);
  console.log(`주의: 로그는 기본적으로 ${LOG_DIR} 에 저장됩니다.`);

  await initLogFile();
  const model = await getLmModel();

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ bypassCSP: true, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") console.log(`[browser:${type}] ${msg.text()}`);
  });
  page.on("pageerror", (error) => console.log(`[browser:pageerror] ${error.message}`));
  page.on("framenavigated", async (frame) => {
    if (frame === page.mainFrame()) {
      browserReloadCount += 1;
      console.log(`[browser:navigation #${browserReloadCount}] ${frame.url()}`);
    }
  });

  const targetUrl = withCacheBust(GAME_URL);
  try {
    console.log(`실제 접속 URL: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  } catch (error) {
    throw new Error(`게임 페이지를 열지 못했습니다. Live Server가 켜져 있는지 확인하세요. 원인: ${error.message}`);
  }

  await page.waitForFunction(() => typeof window.startGame === "function", null, { timeout: 10000 });
  await page.waitForFunction(() => Boolean(window.DALAutomation), null, { timeout: 10000 });

  const initialDebugInfo = await getDebugInfo(page);
  console.log("[debug:init]", JSON.stringify(initialDebugInfo, null, 2));
  await saveLog({ step: "init", time: new Date().toISOString(), botVersion: BOT_VERSION, type: "debug:init", debug: initialDebugInfo });

  let restartCount = 0;
  let stageFailures = {}; // 스테이지별 실패 정보 저장
  let lastKnownEnemies = []; // 가장 최근 조우한 적 정보 기억
  const runStats = createRunStats();

  for (let step = 0; step < MAX_STEPS; step++) {
    let state = null;
    let decision = null;
    try {
      state = await getState(page);

      // 전투 중 적 정보 업데이트 (실패 분석용)
      if (state.currentEnemies && state.currentEnemies.length > 0) {
        lastKnownEnemies = state.currentEnemies.map(e => ({ name: e.name, hp: e.maxHp, atk: e.attack }));
      }

      decision = await decideAndAct(page, model, state, restartCount, stageFailures);

      if (decision.action === "restart") {
        restartCount++;

        // 실패한 스테이지의 적 정보 및 전투 로그 기록
        const stageNum = state.currentStage;
        if (!stageFailures[stageNum]) stageFailures[stageNum] = [];
        stageFailures[stageNum].push({
          enemies: lastKnownEnemies,
          lastLogs: state.battleLogs ? state.battleLogs.filter(log => !log.includes("----------------------------------------") && !log.includes("전투 내용")).slice(-10) : []
        });

        updateRunStats(runStats, state, state, decision);
        runStats.stageFailures = stageFailures;
        logStep(step, state, state, decision);
        await saveLog({ step, time: new Date().toISOString(), botVersion: BOT_VERSION, screen: state.screen, decision, state });
        await saveRunAnalysis(runStats);

        console.log(`[RESTART] ${decision.reason}. 페이지를 새로고침하여 재시작합니다.`);
        runHasPassedStart = false;
        await page.goto(withCacheBust(GAME_URL), { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForFunction(() => typeof window.startGame === "function", null, { timeout: 10000 });
        await page.waitForFunction(() => Boolean(window.DALAutomation), null, { timeout: 10000 });
        continue;
      }

      // 상세 한글 리포트 생성 및 저장
      const afterState = await getState(page);
      updateRunStats(runStats, state, afterState, decision);
      runStats.stageFailures = stageFailures;
      const krReport = generateKoreanSummary(afterState, step, decision, runStats);
      await saveKoreanSummary(krReport);

      logStep(step, state, afterState, decision);
      await saveLog({
        step,
        time: new Date().toISOString(),
        botVersion: BOT_VERSION,
        lmDecision: decision,
        koreanReport: krReport,
        screen: state.screen,
        afterScreen: afterState.screen,
        stage: state.currentStage,
        afterStage: afterState.currentStage,
        decision,
        state,
        afterState
      });

      if (decision.action === "stop") {
        console.log(`자동 플레이 종료: ${decision.reason}`);
        break;
      }
    } catch (error) {
      console.error(`[ERROR step=${step}] ${error.message}`);
      runStats.finishedAt = new Date().toISOString();
      await saveLog({
        step,
        time: new Date().toISOString(),
        botVersion: BOT_VERSION,
        error: error.message,
        debug: await getDebugInfo(page).catch((debugError) => ({ debugError: debugError.message })),
        state,
        decision
      });
      await saveRunAnalysis(runStats).catch((analysisError) => console.error(`[analysis] 저장 실패: ${analysisError.message}`));
      break;
    }
    await sleep(STEP_DELAY_MS);
  }

  await saveRunAnalysis(runStats);
  await browser.close();
  console.log(`로그 저장 완료: ${LOG_FILE}`);
  console.log(`JSONL 기록 완료: ${LOG_JSONL_FILE}`);
  console.log(`분석 보고서 생성 완료: ${LOG_ANALYSIS_FILE}`);
  console.log(`=== LM Studio Auto Bot 종료: ${BOT_VERSION} ===`);
}

main().catch(async (error) => {
  console.error("[FATAL]", error.message);
  try {
    await saveLog({
      step: "fatal",
      time: new Date().toISOString(),
      botVersion: BOT_VERSION,
      error: error.message,
      stack: error.stack
    });
    console.error(`[FATAL] 로그 저장 위치: ${LOG_FILE}`);
    console.error(`[FATAL] JSONL 로그 저장 위치: ${LOG_JSONL_FILE}`);
  } catch (logError) {
    console.error("[FATAL] 치명적 오류 로그 저장 실패:", logError.message);
  }
  process.exitCode = 1;
});
