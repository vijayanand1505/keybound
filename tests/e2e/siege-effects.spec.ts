import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1100 },
  { width: 390, height: 844 },
]) {
  test(`shots aim, recoil on contact and burst completed words at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    // Observe real Canvas output rather than adding debug state to the game.
    await page.addInitScript(() => {
      const qa = {
        angle: 0,
        frames: 0,
        text: [] as string[],
        words: [] as { text: string; x: number; y: number; font: string }[],
      };
      (window as unknown as { siegeQA: typeof qa }).siegeQA = qa;
      const proto = CanvasRenderingContext2D.prototype;
      const clear = proto.clearRect,
        fill = proto.fillRect,
        text = proto.fillText;
      proto.clearRect = function (...args) {
        if (this.canvas.closest(".siege-field")) {
          qa.frames++;
          qa.text = [];
          qa.words = [];
        }
        return clear.apply(this, args);
      };
      proto.fillRect = function (...args) {
        if (
          args[0] === -2 &&
          args[1] === -12 &&
          args[2] === 4 &&
          args[3] === 10
        ) {
          const matrix = this.getTransform();
          qa.angle = Math.atan2(matrix.b, matrix.a);
        }
        return fill.apply(this, args);
      };
      proto.fillText = function (...args) {
        if (this.canvas.closest(".siege-field")) {
          qa.text.push(args[0]);
          qa.words.push({
            text: args[0],
            x: args[1],
            y: args[2],
            font: this.font,
          });
        }
        return text.apply(this, args);
      };
    });
    const qa = () =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              siegeQA: {
                angle: number;
                frames: number;
                text: string[];
                words: { text: string; x: number; y: number; font: string }[];
              };
            }
          ).siegeQA,
      );
    await page.goto("/");
    await page
      .getByRole("button", { name: "Signal Siege", exact: true })
      .click();
    await page.clock.install({ time: new Date("2026-10-29T01:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-29T01:00:01Z"));
    await page
      .getByRole("button", { name: "Launch defense", exact: true })
      .click();
    await page.clock.runFor(3100);
    await page.clock.runFor(32);
    const enemy = page.locator(".siege-enemy").first();
    const word = (await enemy.getAttribute("data-word"))!;
    const id = (await enemy.getAttribute("data-enemy-id"))!;
    const locked = page.locator(`.siege-enemy[data-enemy-id="${id}"]`);
    const center = await enemy.evaluate(
      (e) =>
        parseFloat((e as HTMLElement).style.left) +
        parseFloat((e as HTMLElement).style.width) / 2,
    );
    const fieldWidth = await page
      .locator(".siege-field")
      .evaluate((e) => e.clientWidth);
    await page.keyboard.press(word[0]);
    await page.clock.runFor(32);
    expect(Math.sign((await qa()).angle)).toBe(
      Math.sign(center - fieldWidth / 2),
    );
    const offset = () =>
      locked.evaluate((e) =>
        (e as HTMLElement).style.translate.split(" ").map(parseFloat),
      );
    expect(Math.hypot(...(await offset()))).toBe(0);
    await page.clock.runFor(315);
    const pushed = await offset();
    expect(Math.hypot(...pushed)).toBeGreaterThan(6);
    expect(Math.hypot(...pushed)).toBeLessThanOrEqual(18.01);
    expect(pushed[1]).toBeLessThan(0);
    // The word remains locked, but the fighter has already settled before impact.
    expect((await qa()).angle).toBeCloseTo(0);
    await page.keyboard.press("Escape");
    const beforePause = await qa();
    await page.clock.runFor(500);
    expect(await offset()).toEqual(pushed);
    expect((await qa()).frames).toBe(beforePause.frames);
    await page
      .getByRole("button", { name: "Resume defense", exact: true })
      .click();
    await page.clock.runFor(300);
    expect(Math.hypot(...(await offset()))).toBe(0);
    const wordBox = await locked.locator(".siege-word").evaluate((element) => {
      const rect = element.getBoundingClientRect(),
        field = element
          .closest(".siege-field")!
          .querySelector("canvas")!
          .getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - field.left,
        y: rect.top + rect.height / 2 - field.top,
        fontSize: getComputedStyle(element).fontSize,
      };
    });
    await page.keyboard.type(word.slice(1));
    await expect(locked).toHaveCount(0);
    await page.clock.runFor(32);
    expect((await qa()).text).toContain(word);
    const completed = (await qa()).words.find((entry) => entry.text === word)!;
    expect(Math.abs(completed.x - wordBox.x)).toBeLessThan(2);
    expect(Math.abs(completed.y - wordBox.y)).toBeLessThan(2);
    expect(completed.font).toContain(wordBox.fontSize);
    expect((await qa()).text.some((s) => s.startsWith("+"))).toBe(false);
    await page.clock.runFor(word.length * 75 + 240);
    const burst = (await qa()).text;
    expect(burst).toEqual(expect.arrayContaining([...word]));
    expect(burst.some((s) => s.startsWith("+"))).toBe(true);
    expect(burst).not.toContain(word);
    const fragments = (await qa()).words.filter(
      (entry) => entry.text.length === 1,
    );
    expect(fragments).toHaveLength(word.length);
    expect(
      Math.abs(
        fragments.reduce((sum, entry) => sum + entry.y, 0) / fragments.length -
          wordBox.y,
      ),
    ).toBeLessThanOrEqual(18.1);
    await page.clock.runFor(1000);
    expect((await qa()).text.some((s) => s.startsWith("+"))).toBe(false);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
}

test("a lost defense keeps fullscreen and its results until the player exits", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.clock.install({ time: new Date("2026-10-29T01:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-29T01:00:01Z"));
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await page.clock.runFor(3100);
  await page
    .getByRole("button", { name: "Enter fullscreen", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  for (let i = 0; i < 8; i++) {
    await page.clock.runFor(10000);
    if (
      (await page.locator(".siege-page").getAttribute("data-status")) === "over"
    )
      break;
  }
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "over",
  );
  await expect(
    page.getByRole("heading", { name: "Run complete", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("0 hull shields", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  const result = await page.locator(".siege-result-stats").innerText();
  const elapsed = await page
    .locator(".siege-page")
    .getAttribute("data-elapsed");
  await page.clock.runFor(5000);
  expect(await page.locator(".siege-result-stats").innerText()).toBe(result);
  expect(await page.locator(".siege-page").getAttribute("data-elapsed")).toBe(
    elapsed,
  );
  // Replaying and voluntarily ending a run also retain the player's fullscreen choice.
  await page.getByRole("button", { name: "Fly again", exact: true }).click();
  await page.clock.runFor(3100);
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.clock.runFor(1200);
  await page
    .getByRole("button", { name: "Pause defense", exact: true })
    .click();
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Run complete", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page
    .getByRole("button", { name: "Exit fullscreen", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "over",
  );
  await expect(
    page.getByRole("heading", { name: "Your defense report", exact: true }),
  ).toBeVisible();
});
