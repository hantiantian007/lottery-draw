const STORAGE_KEY = "lottery-tool-config-v3";

const DEFAULT_PRIZES = [
  { id: "p1", name: "小号布鲁克", description: "9.9布鲁克一个", probability: 5 },
  { id: "p2", name: "中号布鲁克", description: "19.9布鲁克一个", probability: 5 },
  { id: "p3", name: "大号布鲁克", description: "39.9布鲁克一个", probability: 5 },
  { id: "p4", name: "现金奖励", description: "现金奖励5元", probability: 5 },
  { id: "p5", name: "现金奖励", description: "现金奖励10元", probability: 5 },
  { id: "p6", name: "游乐园门票", description: "米兰德或奈尔宝游玩一次", probability: 2 },
  { id: "p7", name: "运动次数", description: "羽毛球门票一次", probability: 5 },
  { id: "p8", name: "随机奖励", description: "奖励打游戏1小时", probability: 5 },
  { id: "p9", name: "零食奖励", description: "自选零食一包", probability: 5 },
  { id: "p10", name: "饮料奖励", description: "奖励蜜雪冰城饮料一杯（热饮）", probability: 5 },
  { id: "p11", name: "电视奖励", description: "看电视一小时", probability: 5 },
  { id: "p12", name: "谢谢惠顾", description: "下次再参与", probability: 48 },
];

const DEFAULT_CONFIG = {
  title: "韩梓墨专属抽奖",
  initialChances: 3,
  remainingChances: 3,
  prizes: DEFAULT_PRIZES,
};

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function clampProbability(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return round2(Math.min(parsed, 100));
}

function createId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function ensurePrize(prize, index) {
  return {
    id: prize?.id || createId(),
    name: String(prize?.name || `奖品 ${index + 1}`).trim().slice(0, 24) || `奖品 ${index + 1}`,
    description: String(prize?.description || "").trim().slice(0, 120),
    probability: clampProbability(prize?.probability),
    icon: "./assets/images/red-envelope.svg",
  };
}

export function sanitizeConfig(input) {
  const title = String(input?.title ?? DEFAULT_CONFIG.title).trim().slice(0, 30);
  const initialChances = Math.max(0, Math.floor(Number(input?.initialChances ?? DEFAULT_CONFIG.initialChances)));
  const remainingChances = Math.max(0, Math.floor(Number(input?.remainingChances ?? DEFAULT_CONFIG.remainingChances)));
  const prizes = Array.isArray(input?.prizes) ? input.prizes.map(ensurePrize) : DEFAULT_PRIZES.map(ensurePrize);
  return { title, initialChances, remainingChances, prizes };
}

export function getPrizeTotal(config) {
  return round2(sanitizeConfig(config).prizes.reduce((sum, prize) => sum + clampProbability(prize.probability), 0));
}

export function getThanksProbability(config) {
  return round2(Math.max(0, 100 - getPrizeTotal(config)));
}

export function validateConfig(config) {
  const sanitized = sanitizeConfig(config);
  const errors = [];
  const total = getPrizeTotal(sanitized);

  if (!sanitized.title.trim()) errors.push("活动标题不能为空。");
  
  if (sanitized.prizes.length < 12 || sanitized.prizes.length > 15) {
    errors.push(`奖品数量必须在 12 到 15 个之间（当前 ${sanitized.prizes.length} 个）。`);
  }

  sanitized.prizes.forEach((prize, index) => {
    if (!prize.name.trim()) errors.push(`第 ${index + 1} 个奖品名称不能为空。`);
  });

  if (total > 100) {
    errors.push(`当前奖品总概率为 ${total.toFixed(2)}%，已超过 100%，请调整后再保存。`);
  }
  
  if (!Number.isInteger(sanitized.initialChances) || sanitized.initialChances < 0) {
    errors.push("初始抽奖次数必须是大于或等于 0 的整数。");
  }

  return {
    valid: errors.length === 0,
    errors,
    total,
    remaining: round2(Math.max(0, 100 - total)),
    config: sanitized,
  };
}

export function getDisplaySegments(config) {
  const sanitized = sanitizeConfig(config);
  const total = getPrizeTotal(sanitized);
  
  const prizeSegments = sanitized.prizes
    .filter(prize => prize.name !== "谢谢惠顾")
    .map((prize) => ({
      id: prize.id,
      label: prize.name,
      description: prize.description,
      probability: clampProbability(prize.probability),
      isThanks: false,
      icon: "./assets/images/red-envelope.svg",
    }));
    
  const thanksPrize = sanitized.prizes.find(p => p.name === "谢谢惠顾");
  const thanksProbability = getThanksProbability(sanitized) + (thanksPrize ? clampProbability(thanksPrize.probability) : 0);

  if (thanksProbability > 0 || prizeSegments.length === 0) {
    prizeSegments.push({
      id: "thanks",
      label: "谢谢惠顾",
      description: thanksPrize ? thanksPrize.description : "本次没有抽中奖品。",
      probability: thanksProbability || 100,
      isThanks: true,
      icon: "./assets/images/red-envelope-muted.svg",
    });
  }

  return prizeSegments;
}

export function pickOutcome(config, randomValue = Math.random()) {
  const sanitized = sanitizeConfig(config);
  const total = getPrizeTotal(sanitized);
  const pool = sanitized.prizes
    .filter((prize) => clampProbability(prize.probability) > 0 && prize.name !== "谢谢惠顾")
    .map((prize) => ({
      id: prize.id,
      label: prize.name,
      description: prize.description,
      probability: clampProbability(prize.probability),
      isThanks: false,
      icon: "./assets/images/red-envelope.svg",
    }));

  const thanksPrize = sanitized.prizes.find(p => p.name === "谢谢惠顾");
  const thanksProbability = round2(Math.max(0, 100 - total)) + (thanksPrize ? clampProbability(thanksPrize.probability) : 0);
  
  if (thanksProbability > 0 || pool.length === 0) {
    pool.push({
      id: "thanks",
      label: "谢谢惠顾",
      description: thanksPrize ? thanksPrize.description : "本次没有抽中奖品。",
      probability: thanksProbability || 100,
      isThanks: true,
      icon: "./assets/images/red-envelope-muted.svg",
    });
  }

  const roll = Math.min(Math.max(randomValue, 0), 0.999999) * 100;
  let cursor = 0;
  let selected = pool[pool.length - 1];

  for (const item of pool) {
    cursor = round2(cursor + item.probability);
    if (roll < cursor) {
      selected = item;
      break;
    }
  }

  const segments = getDisplaySegments(sanitized);
  const segmentIndex = Math.max(0, segments.findIndex((segment) => segment.id === selected.id));

  return {
    outcome: selected,
    segments,
    segmentIndex,
    total,
    thanksProbability,
    roll: round2(roll),
  };
}

export function loadConfig() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return sanitizeConfig(DEFAULT_CONFIG);
    const loaded = sanitizeConfig(JSON.parse(raw));
    
    if (loaded.prizes.length < 12) {
      const missing = 12 - loaded.prizes.length;
      for (let i = 0; i < missing; i++) {
        const p = DEFAULT_PRIZES[loaded.prizes.length] || {name: "新奖品", probability: 0};
        loaded.prizes.push(ensurePrize(p, loaded.prizes.length));
      }
    }
    
    return {
      ...loaded,
      title: loaded.title || DEFAULT_CONFIG.title,
    };
  } catch {
    return sanitizeConfig(DEFAULT_CONFIG);
  }
}

export function saveConfig(config) {
  const validation = validateConfig(config);
  if (!validation.valid) {
    return { ok: false, message: validation.errors[0] };
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validation.config));
    return { ok: true, config: validation.config };
  } catch (error) {
    return { ok: false, message: `保存失败：${error instanceof Error ? error.message : "浏览器存储不可用。"}` };
  }
}

export { DEFAULT_CONFIG, STORAGE_KEY, createId, clampProbability, round2 };
