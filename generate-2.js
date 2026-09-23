const fs = require('fs');

const appJs = `import { getDisplaySegments, loadConfig, pickOutcome, saveConfig } from "./logic.js";

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
  grid.innerHTML = segments.map((seg, idx) => \`
    <div class="prize-card" id="card-\${idx}">
      <div class="prize-icon">\${seg.icon}</div>
      <div class="prize-name">\${seg.label}</div>
    </div>
  \`).join('');
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
    chancesText.textContent = \`今日剩余 \${chances} 次机会\`;
  }
}

function render() {
  config = loadConfig();
  const segments = getDisplaySegments(config);
  titleElement.textContent = config.title;
  renderGrid(segments);
  updateChancesDisplay();
  
  if (window.__lastActiveIndex !== undefined) {
    const card = document.getElementById(\`card-\${window.__lastActiveIndex}\`);
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
      const card = document.getElementById(\`card-\${activeIndex}\`);
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
    ? \`<p class="modal-desc">这次没有抽中奖品。</p>\` 
    : (outcomeInfo.outcome.description ? \`<p class="modal-desc">\${outcomeInfo.outcome.description}</p>\` : '');

  modalTitle.textContent = title;
  const chances = config.remainingChances;
  
  if (chances > 0) {
    closeModalButton.textContent = "完成";
  } else {
    closeModalButton.textContent = "抽奖机会已用完";
  }

  openModal(\`
    <div class="modal-prize-icon" style="font-size:48px; margin-bottom:12px;">\${outcomeInfo.outcome.icon}</div>
    <div class="modal-prize-name">\${outcomeInfo.outcome.label}</div>
    \${descHtml}
    <p class="modal-chances" style="margin-top: 12px; font-size: 14px; color: #fde047;">当前剩余 \${chances} 次机会</p>
  \`);

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
`;
fs.writeFileSync('assets/app.js', appJs);

const settingsJs = `import { clampProbability, createId, loadConfig, saveConfig, validateConfig } from "./logic.js";

const titleInput = document.querySelector("#titleInput");
const initialChancesInput = document.querySelector("#initialChancesInput");
const summaryChances = document.querySelector("#summaryChances");
const resetChancesButton = document.querySelector("#resetChancesButton");

const prizeList = document.querySelector("#prizeList");
const addPrizeButton = document.querySelector("#addPrizeButton");
const saveButton = document.querySelector("#saveButton");
const cancelButton = document.querySelector("#cancelButton");
const summaryTotal = document.querySelector("#summaryTotal");
const summaryRemaining = document.querySelector("#summaryRemaining");
const template = document.querySelector("#prizeItemTemplate");
const toast = document.querySelector("#toast");

let hideToastTimer = 0;
let savedConfig = loadConfig();
let currentRemainingChances = savedConfig.remainingChances;

function showToast(message) {
  window.clearTimeout(hideToastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  hideToastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function readDraft() {
  const prizes = [...prizeList.querySelectorAll(".prize-item")].map((item) => ({
    id: item.dataset.id || createId(),
    icon: item.querySelector('[data-field="icon"]').value.trim() || "🎁",
    name: item.querySelector('[data-field="name"]').value.trim(),
    description: item.querySelector('[data-field="description"]').value.trim(),
    probability: clampProbability(item.querySelector('[data-field="probability"]').value),
  }));

  return {
    title: titleInput.value.trim(),
    initialChances: parseInt(initialChancesInput.value) || 0,
    remainingChances: currentRemainingChances,
    prizes,
  };
}

function updateSummary() {
  const validation = validateConfig(readDraft());
  summaryTotal.textContent = \`\${validation.total.toFixed(2)}%\`;
  summaryRemaining.textContent = \`\${validation.remaining.toFixed(2)}%\`;
  summaryChances.textContent = currentRemainingChances;

  if (!validation.valid && validation.total > 100) {
    summaryTotal.style.color = "#b91c1c";
  } else {
    summaryTotal.style.color = "";
  }
}

function bindPrizeItem(section) {
  section.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("input", updateSummary);
  });

  section.querySelector(".delete-prize").addEventListener("click", () => {
    section.remove();
    syncIndexes();
    updateSummary();
  });
}

function syncIndexes() {
  [...prizeList.querySelectorAll(".prize-item")].forEach((item, index) => {
    item.querySelector(".prize-index").textContent = index + 1;
    item.querySelector(".prize-label").textContent = \`奖品 \${index + 1}\`;
  });
}

function createPrizeItem(prize) {
  const fragment = template.content.cloneNode(true);
  const section = fragment.querySelector(".prize-item");
  section.dataset.id = prize.id || createId();
  section.querySelector('[data-field="icon"]').value = prize.icon || "🎁";
  section.querySelector('[data-field="name"]').value = prize.name || "";
  section.querySelector('[data-field="description"]').value = prize.description || "";
  section.querySelector('[data-field="probability"]').value = Number.isFinite(Number(prize.probability))
    ? Number(prize.probability).toFixed(2)
    : "0.00";
  bindPrizeItem(section);
  prizeList.appendChild(fragment);
}

function render(config) {
  savedConfig = config;
  currentRemainingChances = config.remainingChances;
  
  titleInput.value = config.title;
  initialChancesInput.value = config.initialChances;
  summaryChances.textContent = currentRemainingChances;
  
  prizeList.innerHTML = "";
  config.prizes.forEach(createPrizeItem);
  syncIndexes();
  updateSummary();
}

function addPrize() {
  createPrizeItem({
    id: createId(),
    icon: "🎁",
    name: "",
    description: "",
    probability: 0,
  });
  syncIndexes();
  updateSummary();
}

function handleSave() {
  const draft = readDraft();
  if (draft.prizes.length < 12 || draft.prizes.length > 15) {
    showToast(\`奖品数量必须在 12 到 15 个之间（当前 \${draft.prizes.length} 个）。\`);
    return;
  }
  
  const result = saveConfig(draft);
  if (!result.ok) {
    showToast(result.message);
    return;
  }
  showToast("设置已保存");
  window.setTimeout(() => {
    window.location.href = "./index.html";
  }, 450);
}

function handleCancel() {
  render(savedConfig);
  showToast("已放弃未保存修改");
  window.setTimeout(() => {
    window.location.href = "./index.html";
  }, 250);
}

addPrizeButton.addEventListener("click", addPrize);
saveButton.addEventListener("click", handleSave);
cancelButton.addEventListener("click", handleCancel);
titleInput.addEventListener("input", updateSummary);
initialChancesInput.addEventListener("input", updateSummary);

resetChancesButton.addEventListener("click", () => {
  const initial = parseInt(initialChancesInput.value) || 0;
  currentRemainingChances = initial;
  updateSummary();
  showToast(\`剩余次数已重置为 \${initial} 次（点击保存后生效）\`);
});

window.addEventListener("pageshow", () => {
  render(loadConfig());
});

render(savedConfig);
`;
fs.writeFileSync('assets/settings.js', settingsJs);
