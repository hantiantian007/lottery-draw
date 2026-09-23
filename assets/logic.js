const STORAGE_KEY = "lottery-tool-config-v1";

const DEFAULT_PRIZES = [
  {
    id: "p1",
    name: "一等奖",
    description: "品牌蓝牙耳机 1 份",
    probability: 5,
  },
  {
    id: "p2",
    name: "二等奖",
    description: "100 元礼品卡 3 份",
    probability: 12.5,
  },
  {
    id: "p3",
    name: "三等奖",
    description: "定制保温杯 8 份",
    probability: 22.5,
  },
  {
    id: "p4",
    name: "参与奖",
    description: "品牌贴纸 20 份",
    probability: 20,
  },
];

const DEFAULT_CONFIG = {
  title: "秋季现场抽奖",
  prizes: DEFAULT_PRIZES,
};

const PALETTE = ["#7c3aed", "#2563eb", "#0ea5e9", "#059669", "#eab308", "#f97316", "#ef4444", "#ec4899"];

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function clampProbability(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return round2(Math.min(parsed, 100));
}

function createId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function ensurePrize(prize, index) {
  const sourceName =
    prize && Object.prototype.hasOwnProperty.call(prize, "name") ? prize.name : `奖品 ${index + 1}`;
  return {
    id: prize?.id || createId(),
    name: String(sourceName ?? "").trim().slice(0, 24),
    description: String(prize?.description || "").trim().slice(0, 120),
    probability: clampProbability(prize?.probability),
  };
}

export function sanitizeConfig(input) {
  const sourceTitle =
    input && Object.prototype.hasOwnProperty.call(input, "title") ? input.title : DEFAULT_CONFIG.title;
  const title = String(sourceTitle ?? "").trim().slice(0, 30);
  const prizes = Array.isArray(input?.prizes) ? input.prizes.map(ensurePrize) : DEFAULT_PRIZES.map(ensurePrize);
  return { title, prizes };
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

  if (!sanitized.title.trim()) {
    errors.push("活动标题不能为空。");
  }

  sanitized.prizes.forEach((prize, index) => {
    if (!prize.name.trim()) {
      errors.push(`第 ${index + 1} 个奖品名称不能为空。`);
    }
    if (String(prize.description).length > 120) {
      errors.push(`第 ${index + 1} 个奖品说明不能超过 120 个字符。`);
    }
  });

  if (total > 100) {
    errors.push(`当前奖品总概率为 ${total.toFixed(2)}%，已超过 100%，请调整后再保存。`);
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
  const prizeSegments = sanitized.prizes.map((prize, index) => ({
    id: prize.id,
    label: prize.name,
    description: prize.description,
    probability: clampProbability(prize.probability),
    isThanks: false,
    color: PALETTE[index % PALETTE.length],
  }));
  const thanksProbability = getThanksProbability(sanitized);

  if (thanksProbability > 0 || prizeSegments.length === 0) {
    prizeSegments.push({
      id: "thanks",
      label: "谢谢参与",
      description: "剩余概率自动分配给未中奖结果。",
      probability: thanksProbability || 100,
      isThanks: true,
      color: "#334155",
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
    }));

  const thanksProbability = round2(Math.max(0, 100 - total));
  if (thanksProbability > 0 || pool.length === 0) {
    pool.push({
      id: "thanks",
      label: "谢谢参与",
      description: "本次未中奖，欢迎再次参与。",
      probability: thanksProbability || 100,
      isThanks: true,
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
  const segmentIndex = Math.max(
    0,
    segments.findIndex((segment) => segment.id === selected.id)
  );

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
    if (!raw) {
      return sanitizeConfig(DEFAULT_CONFIG);
    }
    const loaded = sanitizeConfig(JSON.parse(raw));
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
    return {
      ok: false,
      message: validation.errors[0],
    };
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validation.config));
    return {
      ok: true,
      config: validation.config,
    };
  } catch (error) {
    return {
      ok: false,
      message: `保存失败：${error instanceof Error ? error.message : "浏览器存储不可用。"}`,
    };
  }
}

export { DEFAULT_CONFIG, STORAGE_KEY, PALETTE, createId, clampProbability, round2 };
