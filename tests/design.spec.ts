import { test, expect } from "@playwright/test";

for (const width of [360,768,1440]) {
  test(`cinematic theme is readable at ${width}px`,async ({ page },testInfo) => {
    const errors: string[] = [];
    page.on("pageerror",(error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(page.locator("#hero-title")).toContainText("BE PRESENT.");
    await expect(page.locator("#hero-title")).toContainText("STAY AHEAD.");
    await expect(page.locator("body")).toHaveCSS("background-color","rgb(0, 0, 0)");
    const primary = page.locator(".design-hero").getByRole("link",{ name: "Start tracking", exact: true });
    await expect(primary).toHaveCSS("background-color","rgb(255, 192, 0)");
    await expect(primary).toHaveCSS("border-radius","0px");
    await expect(primary).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), animations: "disabled" });
    expect(errors).toEqual([]);
  });
}

test("menu opens, traps focus, and Escape restores the trigger",async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("header").getByRole("button",{ name: "Menu", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog",{ name: "Explore Present Sir" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow","hidden");
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("live attendance preview uses cumulative exact maths",async ({ page }) => {
  await page.goto("/");
  const slider = page.locator("#landing-skips");
  await slider.scrollIntoViewIfNeeded();
  await slider.focus();
  await slider.press("Home");
  await expect(page.locator("output")).toHaveText("90%");
  for (let i = 0; i < 6; i += 1) await slider.press("ArrowRight");
  await expect(page.locator("output")).toHaveText("75%");
  await slider.press("ArrowRight");
  await expect(page.locator("output")).toHaveText("73%");
  await expect(page.getByText("Falls below your minimum",{ exact: true })).toBeVisible();
});

test("motion choice persists and system reduced motion always wins",async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion","on");
  await page.locator("footer").getByRole("button",{ name: "Motion on" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion","off");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion","off");
  await page.locator("footer").getByRole("button",{ name: "Motion off" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion","on");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion","off");
  await expect(page.locator("footer").getByRole("button",{ name: "Motion off" })).toBeDisabled();
  await expect(page.locator(".cursor-aura")).toHaveCount(0);
  await expect(page.locator(".horizontal-sticky")).toHaveCount(0);
});

test("Hindi switch translates the public menu and hero",async ({ page }) => {
  await page.setViewportSize({ width: 360,height: 900 });
  await page.goto("/");
  await page.locator("header").getByRole("button",{ name: "Switch language" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang","hi");
  await expect(page.locator("#hero-title")).toContainText("आज उपस्थित।");
  await expect(page.locator("#hero-title")).toContainText("कल आगे।");
  await expect(page.locator("header").getByRole("button",{ name: "मेन्यू",exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("demo CTA keeps real auth and four mobile navigation destinations",async ({ page },testInfo) => {
  const errors: string[] = [];
  page.on("pageerror",(error) => errors.push(error.message));
  await page.setViewportSize({ width: 360,height: 900 });
  await page.goto("/");
  await page.locator(".design-hero").getByRole("button",{ name: "Explore the demo",exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading",{ name: "Attendance risk",exact: true })).toBeVisible();
  await expect(page.locator(".app-topbar")).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.locator(".app-bottom-nav a")).toHaveCount(4);
  await expect(page.locator(".app-bottom-nav")).toBeVisible();
  await expect(page.locator(".app-bottom-nav a").first()).toHaveAttribute("aria-current","page");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("student-home-mobile.png"), animations: "disabled" });
  await page.setViewportSize({ width: 1440,height: 960 });
  await expect(page.locator(".app-topbar")).toBeVisible();
  await expect(page.locator(".app-mobile-top")).not.toBeVisible();
  await expect(page.locator(".app-bottom-nav")).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("student-home-desktop.png"), animations: "disabled" });
  await page.goto("/settings");
  await expect(page.getByRole("heading",{ name: "Settings",exact: true })).toBeVisible();
  await expect(page.getByText("Motion & animation",{ exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Lecture Log demo deep link opens the actual shared classroom",async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button",{ name: "Discover the classroom",exact: true }).click();
  await expect(page).toHaveURL(/\/classrooms\/[^/]+\/lecture-log$/);
  await expect(page.getByRole("heading",{ name: "Lecture Log",exact: true })).toBeVisible();
  await expect(page.getByText(/Normalization/).first()).toBeVisible();
});

test("hero and primary CTA remain readable without JavaScript",async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360,height: 900 } });
  const page = await context.newPage();
  await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000");
  await expect(page.locator("#hero-title")).toContainText("BE PRESENT.");
  await expect(page.locator("#hero-title .split-word").first()).toHaveCSS("opacity","1");
  await expect(page.locator(".design-hero").getByRole("link",{ name: "Start tracking",exact: true })).toBeVisible();
  await context.close();
});


test("all student screens stay within a 360px viewport",async ({ page }) => {
  await page.setViewportSize({ width: 360,height: 900 });
  await page.goto("/");
  await page.locator(".design-hero").getByRole("button",{ name: "Explore the demo",exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  const routes = ["/home","/attendance","/attendance/what-if","/attendance/budget","/attendance/leave","/attendance/forecast","/attendance/proofs","/classrooms","/planner","/search?q=normalization","/profile","/settings"];
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),{ message: `${route} must not overflow` }).toBeLessThanOrEqual(1);
  }
});

test("linked demo notes open the real notes filter",async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button",{ name: "Unit 3 notes",exact: true }).click();
  await expect(page).toHaveURL(/\/classrooms\/[^/]+\/resources\?type=notes$/);
  await expect(page.getByText("Normalization full notes (Unit 3)",{ exact: true })).toBeVisible();
});
