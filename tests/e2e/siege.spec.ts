import { expect, test, type Page } from "@playwright/test";
async function open(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  await expect(
    page.getByRole("textbox", { name: "Type incoming enemy words" }),
  ).toBeFocused();
}
const enemy = (page: Page, id: string) =>
  page.locator(`.siege-enemy[data-enemy-id="${id}"]`);
async function first(page: Page) {
  const element = page.locator(".siege-enemy").first();
  return {
    id: (await element.getAttribute("data-enemy-id"))!,
    word: (await element.getAttribute("data-word"))!,
  };
}
test("Low Orbit is a playable word shooter with locking, pause, pulse and saved reports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Expedition 06", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: /Signal Siege/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Launch defense", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  await expect(page.locator(".typing-passage")).toHaveCount(0);
  const e = await first(page);
  await page.keyboard.down(e.word[0]);
  await expect(enemy(page, e.id).locator(".siege-typed")).toHaveText(e.word[0]);
  await page.keyboard.down(e.word[0]);
  await page.keyboard.up(e.word[0]);
  await expect(enemy(page, e.id).locator(".siege-typed")).toHaveText(e.word[0]);
  await page.keyboard.press(e.word[1] === "z" ? "q" : "z");
  await expect(enemy(page, e.id).locator(".siege-typed")).toHaveText(e.word[0]);
  await page.keyboard.type(e.word.slice(1));
  await expect(enemy(page, e.id)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  const before = await page
    .locator(".siege-enemy")
    .first()
    .getAttribute("style");
  await page.waitForTimeout(250);
  expect(await page.locator(".siege-enemy").first().getAttribute("style")).toBe(
    before,
  );
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Type incoming enemy words" }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", {
      name: "Emergency pulse, 0 charges",
      exact: true,
    }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Fly again", exact: true }),
  ).toBeVisible();
  const score = (
    await page.locator(".siege-result-stats strong").first().innerText()
  ).replaceAll(",", "");
  expect(Number(score)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".run-list .run-row")).toHaveCount(1);
  await expect(page.locator(".run-list")).toContainText(
    "Signal Siege · Endless",
  );
  await page.reload();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await expect(page.locator(".siege-best strong")).toHaveText(
    Number(score).toLocaleString(),
  );
  expect(errors).toEqual([]);
});
test("waves escalate to a multi-shield dreadnought through actual typed combat", async ({
  page,
}) => {
  test.setTimeout(120000);
  await open(page);
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const wave = Number(
      await page
        .locator(".siege-hud>div")
        .first()
        .locator("strong")
        .innerText(),
    );
    if (wave >= 5) break;
    const list = await page.locator(".siege-enemy").count();
    if (list) {
      const e = await first(page);
      await page.keyboard.type(e.word);
    } else await page.waitForTimeout(250);
  }
  await expect(
    page.locator(".siege-hud>div").first().locator("strong"),
  ).toHaveText("05");
  const boss = page.locator(".siege-enemy.is-boss");
  await expect(page.locator(".siege-boss-panel")).toContainText(
    "Moving shields",
  );
  await expect(boss.locator(".siege-armor i")).toHaveCount(3);
  await page.keyboard.type((await boss.getAttribute("data-word"))!);
  await expect(boss.locator(".siege-armor i")).toHaveCount(2);
  await expect(boss).toHaveClass(/is-locked/);
  await expect(page.locator(".siege-boss-panel")).toContainText(
    "Escort carrier",
  );
  await page.waitForTimeout(3400);
  await expect(page.locator(".siege-boss-panel")).toContainText(
    "Escorts deployed",
  );
  await page.keyboard.type((await boss.getAttribute("data-word"))!);
  await expect(boss).toBeVisible();
  await expect(boss.locator(".siege-armor")).toHaveCount(0);
  await expect(page.locator(".siege-boss-panel")).toContainText("Core exposed");
  await page.keyboard.type((await boss.getAttribute("data-word"))!);
  await expect(boss).toHaveCount(0);
});
test("touch input works in a light, reduced-motion layout without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("radio", { name: /^Light/ }).check();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  const e = await first(page);
  await page.keyboard.insertText(e.word);
  await expect(enemy(page, e.id)).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Type incoming enemy words" }),
  ).toBeFocused();
});
test("leaving an active defense pauses it, Settings stay usable, and ending saves exactly one report", async ({
  page,
}) => {
  await open(page);
  const e = await first(page);
  await page.keyboard.type(e.word);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "paused",
  );
  const elapsed = await page
    .locator(".siege-page")
    .getAttribute("data-elapsed");
  const field = await page.locator(".siege-targets").innerHTML();
  await page.waitForTimeout(250);
  expect(await page.locator(".siege-page").getAttribute("data-elapsed")).toBe(
    elapsed,
  );
  expect(await page.locator(".siege-targets").innerHTML()).toBe(field);
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".run-list .run-row")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Return to paused run", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Type incoming enemy words" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".run-list .run-row")).toHaveCount(1);
});

test("selected MechKeys sounds play once per key phase, mute holds, and replay resets the field", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    (window as unknown as { siegeAudio: number }).siegeAudio = 0;
    window.AudioContext = class extends Native {
      createBufferSource() {
        const source = super.createBufferSource(),
          start = source.start.bind(source);
        source.start = (
          ...args: Parameters<AudioBufferSourceNode["start"]>
        ) => {
          (window as unknown as { siegeAudio: number }).siegeAudio++;
          return start(...args);
        };
        return source;
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("switch", { name: "Terminal sound", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "MechKeys · Clicky", exact: false })
    .check();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  const e = await first(page);
  await page.keyboard.down(e.word[0]);
  await page.keyboard.up(e.word[0]);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { siegeAudio: number }).siegeAudio,
      ),
    )
    .toBe(2);
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "paused",
  );
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  await page.keyboard.type(e.word.slice(1));
  expect(
    await page.evaluate(
      () => (window as unknown as { siegeAudio: number }).siegeAudio,
    ),
  ).toBe(2);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await page.getByRole("button", { name: "Fly again", exact: true }).click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  await expect(page.getByLabel("3 hull shields")).toBeVisible();
  await expect(
    page.locator(".siege-hud>div").first().locator("strong"),
  ).toHaveText("01");
  await expect(
    page.getByRole("button", {
      name: "Emergency pulse, 1 charges",
      exact: true,
    }),
  ).toBeEnabled();
  const next = await first(page);
  await page.keyboard.type(next.word);
  await expect(enemy(page, next.id)).toHaveCount(0);
});

test("flight school teaches real controls, can be skipped, and never saves reports or bests", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.getByRole("radio", { name: "Expert", exact: false }).check();
  await page
    .getByRole("button", { name: "Learn to play", exact: false })
    .click();
  const tutorial = page.getByLabel("Interactive tutorial");
  await expect(tutorial).toContainText("step 1 / 4");
  await expect(
    page.getByRole("radio", { name: "Standard", exact: false }),
  ).toBeDisabled();
  const initial = await first(page);
  await page.keyboard.type("o");
  await expect(tutorial).toContainText("step 2 / 4");
  await expect(enemy(page, initial.id).locator(".siege-typed")).toHaveText("o");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  await page.keyboard.press("Backspace");
  await expect(tutorial).toContainText("step 3 / 4");
  await page.keyboard.type("orbit");
  await expect(tutorial).toContainText("step 4 / 4");
  await expect(page.locator(".siege-enemy")).toHaveCount(2);
  await page.keyboard.press("Space");
  await expect(
    page.getByText("Flight school / Complete", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".siege-best strong")).toHaveText("0");
  await page
    .getByRole("button", { name: "Replay tutorial", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Skip tutorial", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Launch defense", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Expert", exact: false }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".run-list .run-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await expect(page.locator(".siege-best strong")).toHaveText("0");
});

test("difficulty persists, changes gameplay and keeps records separate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.getByRole("radio", { name: "Training", exact: false }).check();
  await page.reload();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Training", exact: false }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  await expect(page.getByLabel("5 hull shields")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Emergency pulse, 2 charges",
      exact: true,
    }),
  ).toBeEnabled();
  const e = await first(page);
  expect(e.word.length).toBeLessThanOrEqual(5);
  await page.keyboard.type(e.word);
  await expect(enemy(page, e.id)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  const score = await page
    .locator(".siege-result-stats strong")
    .first()
    .innerText();
  await expect(page.locator(".siege-best strong")).toHaveText(score);
  await page.getByRole("radio", { name: "Standard", exact: false }).check();
  await expect(page.locator(".siege-best strong")).toHaveText("0");
  await page.getByRole("radio", { name: "Expert", exact: false }).check();
  await expect(page.locator(".siege-best strong")).toHaveText("0");
  await page.getByRole("button", { name: "Fly again", exact: true }).click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  await expect(page.getByLabel("3 hull shields")).toBeVisible();
  expect((await first(page)).word.length).toBeGreaterThanOrEqual(5);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await page.getByRole("radio", { name: "Training", exact: false }).check();
  await expect(page.locator(".siege-best strong")).toHaveText(score);
  await page.reload();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await expect(page.locator(".siege-best strong")).toHaveText(score);
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".run-list")).toContainText(
    "Signal Siege · Endless · Training",
  );
});

test("flight setup and touch tutorial work at narrow widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.getByRole("radio", { name: "Training", exact: false }).check();
  expect(
    await page
      .locator(".siege-difficulty-options label")
      .evaluateAll((labels) =>
        labels.every((label) => {
          const box = label.getBoundingClientRect();
          const title = label.querySelector("strong")!.getBoundingClientRect();
          return title.left >= box.left && title.right <= box.right;
        }),
      ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Learn to play", exact: false })
    .click();
  await page.keyboard.insertText("o");
  await page
    .getByRole("button", { name: "Release target", exact: true })
    .click();
  await page.keyboard.insertText("orbit");
  await expect(page.getByLabel("Interactive tutorial")).toContainText(
    "step 4 / 4",
  );
  await page
    .getByRole("button", { name: "Emergency pulse, 2 charges", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Launch Training defense", exact: true }),
  ).toBeVisible();
  // Model the smaller battlefield available above an open virtual keyboard.
  await page
    .locator(".siege-field")
    .evaluate((field) => ((field as HTMLElement).style.height = "240px"));
  expect(
    await page.locator(".siege-field").evaluate((field) => {
      const box = field.getBoundingClientRect();
      return [
        ...field.querySelectorAll(".siege-tutorial-complete button"),
      ].every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.top >= box.top && rect.bottom <= box.bottom;
      });
    }),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Launch Training defense", exact: true })
    .click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  await expect(page.getByLabel("5 hull shields")).toBeVisible();
});

test("mistake feedback and reports lead to missed-word practice and a downloadable score card", async ({
  page,
}) => {
  await open(page);
  const e = await first(page);
  await page.keyboard.type(e.word[0]);
  await expect(enemy(page, e.id).locator(".siege-next-letter")).toHaveText(
    e.word[1],
  );
  await page.keyboard.press(e.word[1] === "z" ? "q" : "z");
  await expect(enemy(page, e.id)).toHaveClass(/is-mistake/);
  await expect(page.locator(".siege-mistake-feedback")).toContainText(
    e.word[1].toUpperCase(),
  );
  await page.keyboard.type(e.word.slice(1));
  await expect(page.locator(".siege-recharge")).toContainText("1 / 5");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your defense report", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".siege-word-review")).toContainText(e.word);
  await expect(page.locator(".siege-record")).toContainText(
    "New personal best",
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download arcade card", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "keybound-signal-siege.png",
  );
  await page
    .getByRole("button", { name: "Practice missed words", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Type the mission transmission" }),
  ).toBeFocused();
  await expect(page.locator(".typing-passage")).toHaveText(e.word);
  await page.keyboard.type(e.word);
  await expect(
    page.getByRole("heading", { name: "Session complete", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.getByRole("button", { name: "Fly again", exact: true }).click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  const next = await first(page);
  await page.keyboard.type(next.word);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await expect(page.locator(".siege-comparison")).toContainText(
    "previous Endless · Standard run",
  );
});

test("losing typing focus freezes the run and fullscreen exits safely", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("heading", { name: /Signal Siege/ }).click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "paused",
  );
  const before = await page.locator(".siege-page").getAttribute("data-elapsed");
  await page.waitForTimeout(250);
  expect(await page.locator(".siege-page").getAttribute("data-elapsed")).toBe(
    before,
  );
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enter fullscreen", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect(
    page.getByRole("textbox", { name: "Type incoming enemy words" }),
  ).toBeFocused();
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "paused",
  );
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
  );
});

test("combat volume works independently of keyboard volume and can be muted separately", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    (window as unknown as { combatTones: number }).combatTones = 0;
    window.AudioContext = class extends Native {
      createOscillator() {
        const node = super.createOscillator(),
          start = node.start.bind(node);
        node.start = (...args: Parameters<OscillatorNode["start"]>) => {
          (window as unknown as { combatTones: number }).combatTones++;
          return start(...args);
        };
        return node;
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("switch", { name: "Terminal sound", exact: true })
    .click();
  await page
    .getByRole("slider", { name: "Keyboard volume", exact: true })
    .fill("0");
  await page
    .getByRole("slider", { name: "Keyboard volume", exact: true })
    .press("Tab");
  await page
    .getByRole("slider", { name: "Combat volume", exact: true })
    .fill("60");
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  const e = await first(page);
  await page.keyboard.type(e.word[0]);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { combatTones: number }).combatTones,
      ),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Keyboard volume", exact: true }),
  ).toHaveValue("0");
  await expect(
    page.getByRole("slider", { name: "Combat volume", exact: true }),
  ).toHaveValue("60");
  await page
    .getByRole("switch", { name: "Combat sound effects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Return to paused run", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  const before = await page.evaluate(
    () => (window as unknown as { combatTones: number }).combatTones,
  );
  await page.keyboard.type(e.word.slice(1));
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () => (window as unknown as { combatTones: number }).combatTones,
    ),
  ).toBe(before);
});

test("deleting progress also clears a paused run without restoring old reports", async ({
  page,
}) => {
  await open(page);
  const e = await first(page);
  await page.keyboard.type(e.word);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete local progress", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete everything", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Return to paused run", exact: false }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Launch defense", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".siege-best strong")).toHaveText("0");
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".run-list .run-row")).toHaveCount(0);
});
