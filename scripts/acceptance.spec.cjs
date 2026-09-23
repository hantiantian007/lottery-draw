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
    { name: "phone-390x844", width: 390, height: 844 },
    { name: "ipad-820x1180", width: 820, height: 1180 },
    { name: "ipad-1180x820", width: 1180, height: 820 },
  ];

  for (const item of cases) {
    await setViewport(page, item.width, item.height);

    await page.goto(`${baseURL}/index.html`);
    await expect(page.locator("#spinButton")).toBeVisible();
    const indexOverflow = await getOverflowInfo(page);
    expect(indexOverflow.hasHorizontalOverflow).toBeFalsy();
    await saveScreenshot(page, `${item.name}-index.png`);

    if (item.name === "phone-390x844") {
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
  await setViewport(page, 390, 844);

  await page.goto(`${baseURL}/index.html`);
  await expect(page.locator("#activityTitle")).toHaveText("秋季现场抽奖");

  await page.click('a[href="./settings.html"]');
  await page.fill("#titleInput", "取消不会生效");
  await page.fill('[data-field="name"]', "取消测试奖品");
  await page.click("#cancelButton");
  await expect(page).toHaveURL(/index\.html$/);
  await expect(page.locator("#activityTitle")).toHaveText("秋季现场抽奖");

  await page.click('a[href="./settings.html"]');
  await page.fill("#titleInput", "春季抽奖会");
  await page.fill('[data-field="name"]', "超长奖品名称用于界面换行检查和展示截断");
  await page.fill('[data-field="description"]', "用于验证设置保存后首页标题、奖品和概率都会同步更新。");
  await page.fill('[data-field="probability"]', "100");
  const deleteButtons = page.locator(".delete-prize");
  while ((await deleteButtons.count()) > 1) {
    await deleteButtons.last().click();
  }
  await page.click("#saveButton");

  await expect(page).toHaveURL(/index\.html$/);
  await expect(page.locator("#activityTitle")).toHaveText("春季抽奖会");

  await page.reload();
  await expect(page.locator("#activityTitle")).toHaveText("春季抽奖会");

  await page.goBack();
  await page.goForward();
  await expect(page.locator("#activityTitle")).toHaveText("春季抽奖会");

  await page.click("#spinButton");
  await expect(page.locator("#resultModal.show")).toBeVisible();
  const modalText = await page.locator("#modalBody").innerText();
  expect(modalText).toContain("超长奖品名称用于界面换行检查和展示截断");

  const state = await page.evaluate(() => window.__lotteryState);
  const normalizedRotation = ((state.currentRotation % 360) + 360) % 360;
  const slice = 360 / state.segments.length;
  const expectedRotation = (360 - (state.lastOutcomeInfo.segmentIndex * slice + slice / 2)) % 360;
  expect(Math.abs(normalizedRotation - expectedRotation)).toBeLessThan(0.01);
});

test("边界检查：超限保存被拦截，空奖池可保存", async ({ page }) => {
  await clearStorage(page);
  await setViewport(page, 390, 844);

  await page.goto(`${baseURL}/settings.html`);
  await page.fill('[data-field="probability"]', "60");
  await page.locator('[data-field="probability"]').nth(1).fill("50");
  await page.click("#saveButton");
  await expect(page).toHaveURL(/settings\.html$/);
  await expect(page.locator("#toast")).toContainText("已超过 100%");

  const deleteButtons = page.locator(".delete-prize");
  const count = await deleteButtons.count();
  for (let i = 0; i < count; i += 1) {
    await deleteButtons.first().click();
  }

  await page.click("#saveButton");
  await expect(page).toHaveURL(/index\.html$/);
});
