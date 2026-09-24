import { getDisplaySegments, loadConfig, pickOutcome, saveConfig } from "./logic.js";

const titleElement = document.querySelector("#activityTitle");
const spinButton = document.querySelector("#spinButton");
const chancesText = document.querySelector("#chancesText");
const wheel = document.querySelector("#wheel");
const toast = document.querySelector("#toast");
const modal = document.querySelector("#resultModal");
const modalTitle = document.querySelector("#modalTitle");
const modalBody = document.querySelector("#modalBody");
const closeModalButton = document.querySelector("#closeModalButton");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let config = loadConfig();
let spinning = false;
let hideToastTimer = 0;

// Secret gestures state
const SECRET_TIMEOUT_MS = 3000;
const SECRET_CLICKS_NEEDED = 5;

let titleClickCount = 0;
let titleClickTimer = null;

let chancesClickCount = 0;
let chancesClickTimer = null;

function setupSecretGestures() {
  const activityTitle = document.getElementById("activityTitle");
  const chancesText = document.getElementById("chancesText");
  
  function isModalOpen() {
    return document.getElementById("resultModal").classList.contains("show");
  }

  // 标题隐藏点击：跳转设置
  if (activityTitle) {
    activityTitle.addEventListener("pointerdown", (e) => {
      if (spinning || isModalOpen()) return;
      
      titleClickCount++;
      clearTimeout(titleClickTimer);
      
      if (titleClickCount >= SECRET_CLICKS_NEEDED) {
        titleClickCount = 0;
        window.location.href = "./settings.html";
      } else {
        titleClickTimer = setTimeout(() => {
          titleClickCount = 0;
        }, SECRET_TIMEOUT_MS);
      }
    });
  }

  // 次数区域隐藏点击：直接重置次数
  if (chancesText) {
    chancesText.addEventListener("pointerdown", (e) => {
      if (spinning || isModalOpen()) return;
      
      chancesClickCount++;
      clearTimeout(chancesClickTimer);
      
      if (chancesClickCount >= SECRET_CLICKS_NEEDED) {
        chancesClickCount = 0;
        
        // 执行重置逻辑
        config.remainingChances = config.initialChances || 0;
        const saveRes = saveConfig(config);
        
        if (saveRes && saveRes.ok === false) {
          showToast(saveRes.message || "保存失败");
        } else {
          showToast(`抽奖次数已重置`);
          updateChancesUI();
        }
      } else {
        chancesClickTimer = setTimeout(() => {
          chancesClickCount = 0;
        }, SECRET_TIMEOUT_MS);
      }
    });
  }
}

setupSecretGestures();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    titleClickCount = 0;
    chancesClickCount = 0;
    clearTimeout(titleClickTimer);
    clearTimeout(chancesClickTimer);
  }
});

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

let currentRotation = window.__currentRotation || 0;

function renderWheel(segments) {
  const total = segments.length;
  const colors = ['#A52336', '#F7EEDC', '#7899B4'];
  const textColorMap = {
    '#A52336': '#F7EEDC',
    '#F7EEDC': '#20384B',
    '#7899B4': '#F7EEDC'
  };
  
  let gradientStops = [];
  const anglePerSegment = 360 / total;
  for (let i = 0; i < total; i++) {
    const color = colors[i % colors.length];
    const startAngle = i * anglePerSegment;
    const endAngle = startAngle + anglePerSegment;
    gradientStops.push(`${color} ${startAngle}deg ${endAngle}deg`);
  }
  
  wheel.style.background = `conic-gradient(from ${-anglePerSegment / 2}deg, ${gradientStops.join(', ')})`;
  
  wheel.innerHTML = segments.map((seg, idx) => {
    const bgColor = colors[idx % colors.length];
    const textColor = textColorMap[bgColor];
    const rotation = idx * anglePerSegment;
    return `
      <div class="wheel-item" style="transform: rotate(${rotation}deg);">
        <img class="wheel-item-icon" src="${seg.icon}" alt="红包">
        <div class="wheel-item-name" style="color: ${textColor};">${seg.label}</div>
      </div>
    `;
  }).join('');
  
  wheel.style.transition = 'none';
  wheel.style.transform = `rotate(${currentRotation}deg)`;
  // force reflow
  wheel.offsetHeight;
}

function updateChancesUI() {
  if (chancesText) {
    chancesText.textContent = `今日剩余 ${config.remainingChances} 次机会`;
  }
  
  if (config.remainingChances <= 0) {
    spinButton.disabled = true;
    spinButton.textContent = "抽奖机会已用完";
  } else {
    spinButton.disabled = false;
    spinButton.textContent = "开始抽奖";
  }
}

function render() {
  config = loadConfig();
  const segments = getDisplaySegments(config);
  titleElement.textContent = config.title;
  renderWheel(segments);
  updateChancesUI();
}

async function animateWheel(targetIndex, totalSegments) {
  return new Promise(resolve => {
    const anglePerSegment = 360 / totalSegments;
    const targetAngle = 360 - (targetIndex * anglePerSegment);
    
    const spins = reducedMotion.matches ? 1 : 5;
    const baseRotation = Math.floor(currentRotation / 360) * 360;
    let nextRotation = baseRotation + (spins * 360) + targetAngle;
    
    if (nextRotation <= currentRotation) {
      nextRotation += 360;
    }
    
    currentRotation = nextRotation;
    window.__currentRotation = currentRotation;
    
    wheel.style.transition = reducedMotion.matches 
      ? 'transform 1s ease-out' 
      : 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
    wheel.style.transform = `rotate(${currentRotation}deg)`;
    
    const duration = reducedMotion.matches ? 1000 : 5000;
    setTimeout(() => {
      resolve();
    }, duration + 50);
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
  updateChancesUI();

  const outcomeInfo = pickOutcome(config);
  spinning = true;
  spinButton.disabled = true;
  spinButton.textContent = "抽奖中...";

  await animateWheel(outcomeInfo.segmentIndex, outcomeInfo.segments.length);

  const isThanks = outcomeInfo.outcome.isThanks;
  const title = isThanks ? "谢谢惠顾" : "恭喜中奖";
  const descHtml = isThanks 
    ? `<p class="modal-desc">${outcomeInfo.outcome.description || "下次再参与"}</p>` 
    : `<p class="modal-desc">${outcomeInfo.outcome.description}</p>`;

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
  updateChancesUI();
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
