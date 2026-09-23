import { clampProbability, createId, loadConfig, saveConfig, validateConfig } from "./logic.js";

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
    icon: "./assets/images/red-envelope.svg",
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
  summaryTotal.textContent = `${validation.total.toFixed(2)}%`;
  summaryRemaining.textContent = `${validation.remaining.toFixed(2)}%`;
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
    item.querySelector(".prize-label").textContent = `奖品 ${index + 1}`;
  });
}

function createPrizeItem(prize) {
  const fragment = template.content.cloneNode(true);
  const section = fragment.querySelector(".prize-item");
  section.dataset.id = prize.id || createId();
  // 不再显示 emoji 图标输入框
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
    showToast(`奖品数量必须在 12 到 15 个之间（当前 ${draft.prizes.length} 个）。`);
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
  showToast(`剩余次数已重置为 ${initial} 次（点击保存后生效）`);
});

window.addEventListener("pageshow", () => {
  render(loadConfig());
});

render(savedConfig);
