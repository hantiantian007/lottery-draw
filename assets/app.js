import { getDisplaySegments, getPrizeTotal, getThanksProbability, loadConfig, pickOutcome } from "./logic.js";

const titleElement = document.querySelector("#activityTitle");
const totalElement = document.querySelector("#totalProbability");
const thanksElement = document.querySelector("#thanksProbability");
const legendElement = document.querySelector("#legendList");
const spinButton = document.querySelector("#spinButton");
const canvas = document.querySelector("#wheelCanvas");
const recentResult = document.querySelector("#recentResult");
const resultMeta = document.querySelector("#resultMeta");
const toast = document.querySelector("#toast");
const modal = document.querySelector("#resultModal");
const modalBody = document.querySelector("#modalBody");
const closeModalButton = document.querySelector("#closeModalButton");

const ctx = canvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let config = loadConfig();
let currentRotation = 0;
let spinning = false;
let hideToastTimer = 0;
let lastOutcomeInfo = null;

function showToast(message) {
  window.clearTimeout(hideToastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  hideToastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function openModal(html) {
  modalBody.innerHTML = html;
  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
}

function bindReducedMotionChange(handler) {
  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", handler);
  } else {
    reducedMotion.onchange = handler;
  }
}

function drawWheel(segments) {
  const size = canvas.width;
  const center = size / 2;
  const radius = size / 2 - 16;
  const innerRadius = size * 0.2;
  const slice = (Math.PI * 2) / segments.length;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);

  segments.forEach((segment, index) => {
    const start = -Math.PI / 2 + index * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = segment.color;
    ctx.fill();

    ctx.save();
    ctx.rotate(start + slice / 2);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(segment.label.slice(0, 8), radius * 0.66, 8);
    ctx.font = "600 20px sans-serif";
    ctx.fillText(`${segment.probability.toFixed(2)}%`, radius * 0.66, 40);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderLegend(segments) {
  legendElement.innerHTML = segments
    .map(
      (segment) => `
        <div class="legend-item">
          <div class="legend-row">
            <div class="legend-name">
              <span class="swatch" style="background:${segment.color}"></span>
              <span>${segment.label}</span>
            </div>
            <strong>${segment.probability.toFixed(2)}%</strong>
          </div>
          <p class="legend-meta">${segment.isThanks ? "未分配给奖品的概率将落到这里。" : segment.description || "未填写奖品说明。"}</p>
        </div>
      `
    )
    .join("");
}

function render() {
  config = loadConfig();
  const segments = getDisplaySegments(config);
  titleElement.textContent = config.title;
  totalElement.textContent = `${getPrizeTotal(config).toFixed(2)}%`;
  thanksElement.textContent = `${getThanksProbability(config).toFixed(2)}%`;
  drawWheel(segments);
  renderLegend(segments);
  window.__lotteryState = {
    config,
    segments,
    currentRotation,
    lastOutcomeInfo,
  };
}

function animateToSegment(segmentIndex, segmentCount) {
  const slice = 360 / segmentCount;
  const centerAngle = segmentIndex * slice + slice / 2;
  const normalizedTarget = (360 - centerAngle) % 360;
  const base = ((currentRotation % 360) + 360) % 360;
  const delta = (normalizedTarget - base + 360) % 360;
  const extraTurns = reducedMotion.matches ? 0 : 6 * 360;
  const duration = reducedMotion.matches ? 220 : 4200;
  const nextRotation = currentRotation + extraTurns + delta;

  return new Promise((resolve) => {
    canvas.style.transition = reducedMotion.matches ? "none" : `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    canvas.style.transform = `rotate(${nextRotation}deg)`;

    if (reducedMotion.matches) {
      currentRotation = nextRotation;
      window.requestAnimationFrame(resolve);
      return;
    }

    window.setTimeout(() => {
      currentRotation = nextRotation;
      resolve();
    }, duration + 30);
  });
}

async function handleSpin() {
  if (spinning) {
    return;
  }

  const outcomeInfo = pickOutcome(config);
  lastOutcomeInfo = outcomeInfo;
  spinning = true;
  spinButton.disabled = true;
  spinButton.textContent = "抽奖中...";

  await animateToSegment(outcomeInfo.segmentIndex, outcomeInfo.segments.length);

  recentResult.textContent = outcomeInfo.outcome.label;
  resultMeta.textContent = `本次随机值 ${outcomeInfo.roll.toFixed(2)} / 100`;
  render();
  openModal(`
    <p><strong>${outcomeInfo.outcome.label}</strong></p>
    <p>${outcomeInfo.outcome.isThanks ? "本次未中奖，欢迎继续参与。" : outcomeInfo.outcome.description || "恭喜中奖，请现场登记领取奖品。"}</p>
    <p class="footnote">动画结束位置已对齐当前抽取结果。每次抽奖都重新按设定概率独立计算。</p>
  `);

  spinning = false;
  spinButton.disabled = false;
  spinButton.textContent = "再抽一次";
}

spinButton.addEventListener("click", handleSpin);
closeModalButton.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

window.addEventListener("storage", () => {
  render();
  showToast("已检测到配置更新，当前页面已同步刷新。");
});
window.addEventListener("pageshow", () => {
  render();
});

bindReducedMotionChange(() => {
  render();
});

render();
