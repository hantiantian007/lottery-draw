import { getDisplaySegments, getPrizeTotal, getThanksProbability, loadConfig, pickOutcome } from "./logic.js";

const titleElement = document.querySelector("#activityTitle");
const spinButton = document.querySelector("#spinButton");
const statusText = document.querySelector("#statusText");
const canvas = document.querySelector("#wheelCanvas");
const toast = document.querySelector("#toast");
const modal = document.querySelector("#resultModal");
const modalTitle = document.querySelector("#modalTitle");
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
    ctx.fillText(segment.label.slice(0, 8), radius * 0.6, 10);
    ctx.restore();
  });

  ctx.restore();
}

function render() {
  config = loadConfig();
  const segments = getDisplaySegments(config);
  titleElement.textContent = config.title;
  drawWheel(segments);
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
  if (statusText) statusText.textContent = "正在为您抽取好运...";

  await animateToSegment(outcomeInfo.segmentIndex, outcomeInfo.segments.length);

  render();
  const isThanks = outcomeInfo.outcome.isThanks;
  const title = isThanks ? "谢谢参与" : "恭喜中奖";
  const descHtml = isThanks 
    ? `<p class="modal-desc">本次未中奖，欢迎继续参与。</p>` 
    : (outcomeInfo.outcome.description ? `<p class="modal-desc">${outcomeInfo.outcome.description}</p>` : '');

  modalTitle.textContent = title;
  openModal(`
    <div class="modal-prize-name">${outcomeInfo.outcome.label}</div>
    ${descHtml}
  `);

  spinning = false;
  spinButton.disabled = false;
  spinButton.textContent = "再抽一次";
  if (statusText) statusText.textContent = "点击按钮，开启好运";
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
