const STORAGE_KEY = "lottery-tool-config-v2";

const DEFAULT_PRIZES = [
  { id: "p1", name: "大熊玩具", description: "可爱的毛绒大熊", probability: 5, icon: "🧸" },
  { id: "p2", name: "精美绘本", description: "儿童插画绘本", probability: 10, icon: "📚" },
  { id: "p3", name: "遥控汽车", description: "酷炫遥控赛车", probability: 5, icon: "🏎️" },
  { id: "p4", name: "乐高积木", description: "创意拼装积木", probability: 5, icon: "🧱" },
  { id: "p5", name: "水彩笔套装", description: "48色水彩笔", probability: 10, icon: "🖍️" },
  { id: "p6", name: "游乐园门票", description: "周末单日票", probability: 2, icon: "🎟️" },
  { id: "p7", name: "卡通贴纸", description: "随机卡通贴纸", probability: 15, icon: "🏷️" },
  { id: "p8", name: "儿童手表", description: "智能定位手表", probability: 1, icon: "⌚" },
  { id: "p9", name: "巧克力礼盒", description: "精美巧克力", probability: 10, icon: "🍫" },
  { id: "p10", name: "棒棒糖", description: "水果味棒棒糖", probability: 15, icon: "🍭" },
  { id: "p11", name: "小汽车模型", description: "合金小汽车", probability: 10, icon: "🚗" },
  { id: "p12", name: "神秘盲盒", description: "惊喜盲盒", probability: 2, icon: "🎁" },
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
  const prizeSegments = sanitized.prizes.map((prize) => ({
    id: prize.id,
    label: prize.name,
    description: prize.description,
    probability: clampProbability(prize.probability),
    isThanks: false,
    icon: "./assets/images/red-envelope.svg",
  }));
  const thanksProbability = getThanksProbability(sanitized);

  if (thanksProbability > 0 || prizeSegments.length === 0) {
    prizeSegments.push({
      id: "thanks",
      label: "谢谢参与",
      description: "本次没有抽中奖品。",
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
    .filter((prize) => clampProbability(prize.probability) > 0)
    .map((prize) => ({
      id: prize.id,
      label: prize.name,
      description: prize.description,
      probability: clampProbability(prize.probability),
      isThanks: false,
      icon: "./assets/images/red-envelope.svg",
    }));

  const thanksProbability = round2(Math.max(0, 100 - total));
  if (thanksProbability > 0 || pool.length === 0) {
    pool.push({
      id: "thanks",
      label: "谢谢参与",
      description: "本次没有抽中奖品。",
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
