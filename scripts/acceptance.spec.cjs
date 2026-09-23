const fs = require("fs");
const path = require("path");
const { test, expect } = require("playwright/test");

const baseURL = process.env.LOTTERY_BASE_URL || "http://192.168.0.179:8080";
const artifactDir = path.join(__dirname, "..", "artifacts");

fs.mkdirSync(artifactDir, { recursive: true });

async function clearStorage(page) {
  await page.goto(`${baseURL}/index.html`);
  await page.evaluate(() => window.localStorage.clear());
}

async function getOverflowInfo(page) {
  return page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > window.innerWidth + 1 || document.body.scrollWidth > window.innerWidth + 1,
  }));
}

async function setViewport(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function saveScreenshot(page, name) {
  await page.screenshot({
    path: path.join(artifactDir, name),
    fullPage: true,
  });
}

test.describe.configure({ mode: "serial" });

test("视觉检查：手机与 iPad 三种视口", async ({ page }) => {
  await clearStorage(page);

  const cases = [
    { name: "iphone-15-pro", width: 393, height: 852 },
    { name: "android-normal", width: 360, height: 800 },
    { name: "android-large", width: 412, height: 915 },
    { name: "ipad-portrait", width: 820, height: 1180 },
    { name: "ipad-landscape", width: 1180, height: 820 },
  ];

  for (const item of cases) {
    await setViewport(page, item.width, item.height);

    await page.goto(`${baseURL}/index.html`);
    await expect(page.locator("#spinButton")).toBeVisible();
    const indexOverflow = await getOverflowInfo(page);
    expect(indexOverflow.hasHorizontalOverflow).toBeFalsy();
    await saveScreenshot(page, `${item.name}-index.png`);

    if (item.name === "iphone-15-pro") {
      await page.click("#spinButton");
      await expect(page.locator("#resultModal.show")).toBeVisible();
      await expect(page.locator("#modalBody")).not.toBeEmpty();
      await saveScreenshot(page, `${item.name}-modal.png`);
      await page.click("#closeModalButton");
    }

    await page.goto(`${baseURL}/settings.html`);
    await expect(page.locator("#saveButton")).toBeVisible();
    const settingsOverflow = await getOverflowInfo(page);
    expect(settingsOverflow.hasHorizontalOverflow).toBeFalsy();
    await saveScreenshot(page, `${item.name}-settings.png`);
  }
});

test("配置更新：保存、取消、后退与刷新保留", async ({ page }) => {
  await clearStorage(page);
  await setViewport(page, 393, 852);

  await page.goto(`${baseURL}/index.html`);
  await expect(page.locator("#activityTitle")).toHaveText("韩梓墨专属抽奖");

  // 首页已经移除设置入口，改为直接通过 URL 导航测试
  await page.goto(`${baseURL}/settings.html`);
  await page.fill("#titleInput", "取消不会生效");
  await page.fill('[data-field="name"]', "取消测试奖品");
  await page.click("#cancelButton");
  await expect(page).toHaveURL(/index\.html$/);
  await expect(page.locator("#activityTitle")).toHaveText("韩梓墨专属抽奖");

  await page.goto(`${baseURL}/settings.html`);
  await page.fill("#titleInput", "春季抽奖会");
  await page.locator('[data-field="name"]').first().fill("超长奖品名称用于界面换行检查和展示截断");
  await page.locator('[data-field="probability"]').first().fill("100");
  
  const probInputs = page.locator('[data-field="probability"]');
  const probCount = await probInputs.count();
  for (let i = 1; i < probCount; i++) {
    await probInputs.nth(i).fill("0");
  }

  const deleteButtons = page.locator(".delete-prize");
  while ((await deleteButtons.count()) > 12) {
    await deleteButtons.last().click();
  }
  await page.click("#saveButton");

  await expect(page).toHaveURL(/index\.html$/);
  await expect(page.locator("#activityTitle")).toHaveText("春季抽奖会");
  await expect(page.locator("#marqueeGrid")).toContainText("超长奖品名称用于界面换行检查和展示截断");

  await page.reload();
  await expect(page.locator("#activityTitle")).toHaveText("春季抽奖会");

  await page.goBack();
  await page.goForward();
  await expect(page.locator("#activityTitle")).toHaveText("春季抽奖会");

  await page.click("#spinButton");
  await expect(page.locator("#resultModal.show")).toBeVisible();
  const modalText = await page.locator("#modalBody").innerText();
  expect(modalText).toContain("超长奖品名称用于界面换行检查和展示截断");

  await page.click("#closeModalButton");
  await expect(page.locator("#chancesText")).toContainText("今日剩余 2 次机会");
});

test("边界检查：超限保存被拦截，空奖池不可保存", async ({ page }) => {
  await clearStorage(page);
  await setViewport(page, 393, 852);

  await page.goto(`${baseURL}/settings.html`);
  await page.locator('[data-field="probability"]').nth(0).fill("60");
  await page.locator('[data-field="probability"]').nth(1).fill("50");
  await page.click("#saveButton");
  await expect(page).toHaveURL(/settings\.html$/);
  await expect(page.locator("#toast")).toContainText("已超过 100%");

  const deleteButtons = page.locator(".delete-prize");
  const count = await deleteButtons.count();
  for (let i = 0; i < count; i += 1) {
    if (await deleteButtons.count() <= 11) break;
    await deleteButtons.last().click();
  }

  await page.click("#saveButton");
  await expect(page).toHaveURL(/settings\.html$/);
  await expect(page.locator("#toast")).toContainText("奖品数量必须在 12 到 15 个之间");
});

test("视觉检查：Preview 原型效果", async ({ page }) => {
  await setViewport(page, 1440, 900);
  await page.goto(`${baseURL}/preview.html`);
  // 等待 iframe 加载完成
  await page.waitForTimeout(1000);
  await saveScreenshot(page, `desktop-preview-mockup.png`);
});
