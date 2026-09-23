import { clampProbability, createId, loadConfig, saveConfig, validateConfig } from "./logic.js";

const titleInput = document.querySelector("#titleInput");
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
    name: item.querySelector('[data-field="name"]').value.trim(),
    description: item.querySelector('[data-field="description"]').value.trim(),
    probability: clampProbability(item.querySelector('[data-field="probability"]').value),
  }));

  return {
    title: titleInput.value.trim(),
    prizes,
  };
}

function updateSummary() {
  const validation = validateConfig(readDraft());
  summaryTotal.textContent = `${validation.total.toFixed(2)}%`;
  summaryRemaining.textContent = `${validation.remaining.toFixed(2)}%`;

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
  titleInput.value = config.title;
  prizeList.innerHTML = "";
  config.prizes.forEach(createPrizeItem);
  syncIndexes();
  updateSummary();
}

function addPrize() {
  createPrizeItem({
    id: createId(),
    name: "",
    description: "",
    probability: 0,
  });
  syncIndexes();
  updateSummary();
}

function handleSave() {
  const result = saveConfig(readDraft());
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
window.addEventListener("pageshow", () => {
  render(loadConfig());
});

render(savedConfig);
