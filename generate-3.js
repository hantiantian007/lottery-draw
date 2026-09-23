const fs = require('fs');

const indexHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>韩梓墨专属抽奖</title>
    <link rel="stylesheet" href="./assets/styles.css" />
  </head>
  <body class="lottery-theme">
    <main class="page lottery-page">
      <header class="minimal-topbar">
        <h1 id="activityTitle">韩梓墨专属抽奖</h1>
        <a class="settings-icon-link" href="./settings.html" aria-label="抽奖设置">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </a>
      </header>

      <section class="marquee-container">
        <div class="marquee-grid" id="marqueeGrid">
          <!-- Cards rendered by JS -->
        </div>
      </section>

      <section class="action-container">
        <button id="spinButton" class="btn-primary" type="button">开始抽奖</button>
        <p id="chancesText" class="chances-text">今日剩余 3 次机会</p>
      </section>
    </main>

    <div id="resultModal" class="modal theme-dark-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-card">
        <h2 class="modal-title" id="modalTitle">抽奖结果</h2>
        <div class="modal-body" id="modalBody"></div>
        <div class="modal-actions">
          <button id="closeModalButton" type="button" class="btn-primary" style="width: 100%; font-size: 18px; padding: 12px;">完成</button>
        </div>
      </div>
    </div>

    <div id="toast" class="toast" aria-live="polite"></div>
    <script type="module" src="./assets/app.js"></script>
  </body>
</html>
`;
fs.writeFileSync('index.html', indexHtml);

const settingsHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>抽奖设置</title>
    <link rel="stylesheet" href="./assets/styles.css" />
  </head>
  <body>
    <main class="page">
      <header class="topbar">
        <div class="title-wrap">
          <span class="hero-badge">抽奖设置</span>
          <h2>活动标题与奖品配置</h2>
          <p class="subtitle">
            奖品概率支持两位小数，所有奖品合计不能超过 100%。剩余概率会自动分配给“谢谢参与”。<br>
            <strong>要求奖品数量在 12 到 15 个之间。</strong>
          </p>
        </div>
        <a class="icon-link" href="./index.html" aria-label="返回抽奖页">返回抽奖页</a>
      </header>

      <section class="settings-layout">
        <article class="surface settings-card">
          <div class="field-grid">
            <div class="field">
              <label for="titleInput">活动标题</label>
              <input id="titleInput" type="text" maxlength="30" placeholder="请输入活动标题" />
            </div>
            <div class="field">
              <label for="initialChancesInput">初始抽奖次数</label>
              <input id="initialChancesInput" type="number" min="0" step="1" placeholder="3" />
            </div>
          </div>

          <div class="inline-actions" style="margin-top: 16px;">
            <button id="addPrizeButton" type="button" class="secondary-btn">新增奖品</button>
          </div>

          <div id="prizeList" class="settings-list" style="margin-top: 16px;"></div>

          <div class="form-actions">
            <button id="saveButton" type="button" class="btn">保存设置</button>
            <button id="cancelButton" type="button" class="secondary-btn">取消修改</button>
          </div>
        </article>

        <aside class="surface summary-card">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-head">
                <div class="summary-title">奖品总概率</div>
              </div>
              <div class="summary-highlight" id="summaryTotal">0.00%</div>
              <p class="summary-desc">超过 100% 时禁止保存。</p>
            </div>

            <div class="summary-item">
              <div class="summary-head">
                <div class="summary-title">谢谢参与</div>
              </div>
              <div class="summary-highlight" id="summaryRemaining">0.00%</div>
              <p class="summary-desc">当总概率为 100% 时，必定中奖。</p>
            </div>

            <div class="summary-item">
              <div class="summary-head">
                <div class="summary-title">剩余次数</div>
              </div>
              <div class="summary-highlight" style="display:flex; align-items:center; justify-content:space-between;">
                <span id="summaryChances">3</span>
                <button id="resetChancesButton" type="button" class="secondary-btn" style="padding:4px 12px; font-size:12px;">重置</button>
              </div>
              <p class="summary-desc">修改奖品不自动重置，需手动点击。</p>
            </div>
          </div>
        </aside>
      </section>
    </main>

    <template id="prizeItemTemplate">
      <section class="prize-item">
        <div class="prize-head">
          <div class="legend-name">
            <span class="prize-index"></span>
            <span class="prize-label">奖品</span>
          </div>
          <button type="button" class="danger-btn delete-prize">删除</button>
        </div>
        <div class="prize-fields">
          <div class="prize-row" style="display: flex; gap: 8px;">
            <div class="field" style="flex: 0 0 60px;">
              <label>图标</label>
              <input data-field="icon" type="text" maxlength="2" placeholder="🎁" />
            </div>
            <div class="field" style="flex: 1;">
              <label>奖品名称</label>
              <input data-field="name" type="text" maxlength="24" placeholder="一等奖" />
            </div>
            <div class="field" style="flex: 0 0 100px;">
              <label>概率</label>
              <div class="probability-input">
                <input data-field="probability" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="0.00" />
                <span>%</span>
              </div>
            </div>
          </div>
          <div class="textarea-field" style="margin-top: 8px;">
            <label>奖品说明</label>
            <textarea data-field="description" rows="2" maxlength="120" placeholder="说明信息只在中奖弹窗显示"></textarea>
          </div>
        </div>
      </section>
    </template>

    <div id="toast" class="toast" aria-live="polite"></div>
    <script type="module" src="./assets/settings.js"></script>
  </body>
</html>
`;
fs.writeFileSync('settings.html', settingsHtml);

let styles = fs.readFileSync('assets/styles.css', 'utf-8');
styles = styles.replace(/\/\* 覆盖原有的默认样式[\s\S]*$/, \`/* 覆盖原有的默认样式，添加独立抽奖页主题 */
body.lottery-theme {
  background: linear-gradient(135deg, #e11d48, #c026d3, #ea580c);
  color: #fff;
  margin: 0;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
body.lottery-theme .lottery-page {
  max-width: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
  box-shadow: none;
}
.minimal-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
}
.minimal-topbar h1 {
  font-size: 24px;
  margin: 0;
  color: #fef08a;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0,0,0,0.4);
}
.settings-icon-link {
  color: #fef08a;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  font-size: 14px;
  transition: opacity 0.2s;
}
.settings-icon-link:hover {
  opacity: 1;
}

.marquee-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  min-height: 0;
}
.marquee-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 360px;
}
@media (min-width: 768px) {
  .marquee-grid {
    max-width: 600px;
    gap: 12px;
  }
}
.prize-card {
  width: calc(25% - 6px);
  max-width: 82px;
  aspect-ratio: 1;
  background: #fff;
  border-radius: 12px;
  border: 2px solid #fbcfe8;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.1s, box-shadow 0.1s;
  padding: 4px;
  box-sizing: border-box;
}
.prize-card.active {
  border-color: #fde047;
  background: #fef9c3;
  box-shadow: 0 0 16px #fde047;
  transform: scale(1.08);
  z-index: 10;
}
@media (min-width: 768px) {
  .prize-card {
    width: calc(20% - 10px);
    max-width: 108px;
  }
}
.prize-icon {
  font-size: 28px;
  line-height: 1;
  margin-bottom: 4px;
}
@media (min-width: 768px) {
  .prize-icon {
    font-size: 36px;
  }
}
.prize-name {
  font-size: 10px;
  color: #831843;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.2;
}
@media (min-width: 768px) {
  .prize-name {
    font-size: 12px;
  }
}

.action-container {
  text-align: center;
  padding: 20px 20px 40px;
}
.btn-primary {
  background: linear-gradient(to bottom, #fde047, #eab308);
  color: #713f12;
  border: none;
  padding: 16px 60px;
  font-size: 22px;
  font-weight: 900;
  border-radius: 999px;
  box-shadow: 0 6px 0 #ca8a04, 0 10px 20px rgba(0,0,0,0.4);
  text-shadow: 0 1px 1px rgba(255,255,255,0.6);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  display: inline-block;
}
.btn-primary:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #ca8a04, 0 4px 10px rgba(0,0,0,0.4);
}
.btn-primary:disabled {
  background: #94a3b8;
  color: #475569;
  box-shadow: 0 6px 0 #64748b;
  cursor: not-allowed;
}
.chances-text {
  margin-top: 16px;
  font-size: 16px;
  color: #fef08a;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  font-weight: bold;
}

body.lottery-theme .modal-card {
  background: linear-gradient(135deg, #e11d48, #c026d3);
  border: 2px solid #fde047;
  color: #fff;
  text-align: center;
}
body.lottery-theme .modal-title {
  color: #fef08a;
  font-size: 28px;
  margin-bottom: 24px;
  font-weight: 900;
}
.modal-prize-name {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 12px;
}
.modal-desc {
  font-size: 16px;
  color: #fbcfe8;
  line-height: 1.5;
}
\`);
fs.writeFileSync('assets/styles.css', styles);
