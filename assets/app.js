import { getDisplaySegments, loadConfig, pickOutcome, saveConfig } from "./logic.js";

const titleElement = document.querySelector("#activityTitle");
const spinButton = document.querySelector("#spinButton");
const chancesText = document.querySelector("#chancesText");
const grid = document.querySelector("#marqueeGrid");
const toast = document.querySelector("#toast");
const modal = document.querySelector("#resultModal");
const modalTitle = document.querySelector("#modalTitle");
const modalBody = document.querySelector("#modalBody");
const closeModalButton = document.querySelector("#closeModalButton");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let config = loadConfig();
let spinning = false;
let hideToastTimer = 0;

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

function renderGrid(segments) {
  grid.innerHTML = segments.map((seg, idx) => `
    <div class="prize-card" id="card-${idx}">
      <div class="prize-icon-wrapper"><img class="prize-icon-img" src="${seg.icon}" alt="奖品红包"></div>
      <div class="prize-name">${seg.label}</div>
    </div>
  `).join('');
}

function updateChancesDisplay() {
  const chances = config.remainingChances;
  if (chances <= 0) {
    spinButton.disabled = true;
    spinButton.textContent = "抽奖机会已用完";
    chancesText.textContent = "今日剩余 0 次机会";
  } else {
    spinButton.disabled = false;
    spinButton.textContent = "开始抽奖";
    chancesText.textContent = `今日剩余 ${chances} 次机会`;
  }
}

function render() {
  config = loadConfig();
  const segments = getDisplaySegments(config);
  titleElement.textContent = config.title;
  renderGrid(segments);
  updateChancesDisplay();
  
  if (window.__lastActiveIndex !== undefined) {
    const card = document.getElementById(`card-${window.__lastActiveIndex}`);
    if (card) card.classList.add('active');
  }
}

async function animateMarquee(targetIndex, totalSegments) {
  const minLoops = reducedMotion.matches ? 1 : 4;
  const minSteps = totalSegments * minLoops + targetIndex;
  let currentStep = window.__lastActiveIndex || 0;
  const targetStep = currentStep + minSteps;
  
  return new Promise(resolve => {
    function step() {
      document.querySelectorAll('.prize-card').forEach(c => c.classList.remove('active'));
      const activeIndex = currentStep % totalSegments;
      const card = document.getElementById(`card-${activeIndex}`);
      if (card) card.classList.add('active');
      
      if (currentStep >= targetStep) {
        window.__lastActiveIndex = activeIndex;
        resolve();
        return;
      }
      
      currentStep++;
      const remaining = targetStep - currentStep;
      let delay = 30;
      if (!reducedMotion.matches) {
        if (remaining < 10) delay = 50 + (10 - remaining) * 30;
        if (remaining < 4) delay = 150 + (4 - remaining) * 100;
      }
      
      setTimeout(step, delay);
    }
    step();
  });
}

async function handleSpin() {
  if (spinning || config.remainingChances <= 0) {
    return;
  }

  config.remainingChances -= 1;
  const saveRes = saveConfig(config);
  if (!saveRes.ok) {
    showToast(saveRes.message);
  }
  updateChancesDisplay();

  const outcomeInfo = pickOutcome(config);
  spinning = true;
  spinButton.disabled = true;
  spinButton.textContent = "抽奖中...";

  await animateMarquee(outcomeInfo.segmentIndex, outcomeInfo.segments.length);

  const isThanks = outcomeInfo.outcome.isThanks;
  const title = isThanks ? "谢谢参与" : "恭喜中奖";
  const descHtml = isThanks 
    ? `<p class="modal-desc">这次没有抽中奖品。</p>` 
    : (outcomeInfo.outcome.description ? `<p class="modal-desc">${outcomeInfo.outcome.description}</p>` : '');

  modalTitle.textContent = title;
  const chances = config.remainingChances;
  
  if (chances > 0) {
    closeModalButton.textContent = "再抽一次";
  } else {
    closeModalButton.textContent = "抽奖机会已用完";
  }

  openModal(`
    <div class="modal-prize-icon" style="margin-bottom:12px;">
      <img src="${outcomeInfo.outcome.icon}" style="width: 80px; height: 96px; display: block; margin: 0 auto; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));" alt="奖品">
    </div>
    <div class="modal-prize-name">${outcomeInfo.outcome.label}</div>
    ${descHtml}
    <p class="modal-chances" style="margin-top: 12px; font-size: 14px; color: #fde047;">当前剩余 ${chances} 次机会</p>
  `);

  spinning = false;
  updateChancesDisplay();
}

spinButton.addEventListener("click", handleSpin);
closeModalButton.addEventListener("click", () => {
  closeModal();
});

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
});
window.addEventListener("pageshow", () => {
  render();
});

bindReducedMotionChange(() => {
  render();
});

render();
