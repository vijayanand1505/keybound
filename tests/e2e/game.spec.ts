import { expect, test } from "@playwright/test";
import missions from "../../content/missions.json" with { type: "json" };
test("new guest completes mission, shares a card, and keeps progress on reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Games & practice" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Begin expedition" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  const field = page.getByRole("textbox", {
    name: "Type the mission transmission",
  });
  await expect(field).toBeFocused();
  await page.keyboard.type("x");
  await expect(page.getByText("Incorrect key —")).toBeVisible();
  await page.keyboard.press("Backspace");
  await page.keyboard.type(missions[0].text, { delay: 3 });
  await expect(
    page.getByRole("heading", { name: "Session complete" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      `${((missions[0].text.length / (missions[0].text.length + 1)) * 100).toFixed(1)}%`,
      { exact: true },
    ),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download card" }).click();
  expect((await download).suggestedFilename()).toBe(
    "keybound-field-report.png",
  );
  await page.reload();
  await expect(page.getByText("1 / 16 missions completed")).toBeVisible();
  await page
    .getByRole("button", { name: "Progress", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your results" }),
  ).toBeVisible();
  await expect(
    page.locator(".run-title").filter({ hasText: "The Lighthouse" }),
  ).toBeVisible();
});
test("pause freezes the mission and resume restores input focus", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin expedition" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await page.keyboard.type("signal ");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Resume mission" }).click();
  await expect(
    page.getByRole("textbox", { name: "Type the mission transmission" }),
  ).toBeFocused();
  await page.keyboard.type("the ");
  await expect(
    page.getByText(
      `${Math.round((11 / missions[0].text.length) * 100)}% complete`,
    ),
  ).toBeVisible();
});
test("calm mode, training, and mobile navigation are usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Calm mode" }).click();
  await page.getByRole("switch", { name: "Reduce motion" }).click();
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Begin expedition" }).click();
  await expect(page.getByText("No time pressure")).toBeVisible();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await expect(page.getByText("∞")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Typing practice" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Enter the signal room" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await page.keyboard.type("const signal = await relay.connect();");
  await page.keyboard.press("Enter");
  await page.keyboard.type("if (signal.ready) {");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.locator(".typing-passage .typed").last()).toBeVisible();
});
test("daily route is stable and future chapters are clearly unavailable", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".upcoming-expeditions > summary").click();
  await page
    .getByRole("button", { name: "Expedition 03", exact: false })
    .click();
  await expect(
    page.getByText("This expedition is in development."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Daily Challenge", exact: true }).click();
  await page.getByRole("button", { name: "Play today's expedition" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  const first = await page.locator(".typing-passage").textContent();
  await page.getByRole("button", { name: "Daily Challenge", exact: true }).click();
  await page.getByRole("button", { name: "Play today's expedition" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  expect(await page.locator(".typing-passage").textContent()).toBe(first);
});

test("side modes have distinct animated worlds, word feedback, and pause freezes rendering", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Custom Text", exact: true })
    .click();
  await page.getByLabel("Your paragraph or sentences").fill("signal");
  await page.getByRole("button", { name: "Start typing", exact: true }).click();
  await expect(page.locator('canvas[data-world="practice"]')).toHaveAttribute(
    "data-motion",
    "animated",
  );
  await page.keyboard.type("signal");
  await expect(
    page.getByRole("heading", { name: "Session complete" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page.getByRole("button", { name: "Train with Tick" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  const coach = page.locator('canvas[data-world="coach"]');
  await expect(coach).toBeVisible();
  const before = await coach.evaluate((node: HTMLCanvasElement) =>
    node.toDataURL(),
  );
  await expect
    .poll(() => coach.evaluate((node: HTMLCanvasElement) => node.toDataURL()))
    .not.toBe(before);
  const phrase =
    (await page.locator(".typing-passage").textContent())!
      .trim()
      .split(" ")[0] + " ";
  await page.keyboard.type(phrase);
  await expect(page.locator(".word-feedback")).toContainText("Target locked");
  await page.keyboard.press("Escape");
  await expect(coach).toHaveAttribute("data-motion", "paused");
  const frames = await coach.evaluate(async (node: HTMLCanvasElement) => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const a = node.toDataURL();
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [a, node.toDataURL()];
  });
  expect(frames[0]).toBe(frames[1]);
  await page.getByRole("button", { name: "Resume mission" }).click();
  await page
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page.getByRole("button", { name: "Enter the signal room" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await expect(page.locator('canvas[data-world="code"]')).toBeVisible();
  await page.keyboard.type("const ");
  await expect(page.locator(".word-feedback")).toContainText("Packet compiled");
  await page.getByRole("button", { name: "Daily Challenge", exact: true }).click();
  await page.getByRole("button", { name: "Play today's expedition" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await expect(page.locator('canvas[data-world="daily"]')).toBeVisible();
  await expect(page.locator(".world-status")).toContainText("Scanning");
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page
    .getByRole("button", { name: "Expedition 02", exact: false })
    .click();
  await page.getByRole("button", { name: "Begin expedition" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await expect(page.locator('canvas[data-world="ascent"]')).toBeVisible();
  await page.keyboard.type("reach ");
  await expect(page.locator(".word-feedback")).toContainText(
    "Handhold secured",
  );
  const climber = await page.locator(".climber").boundingBox();
  const terminal = await page.locator(".terminal").boundingBox();
  expect(climber!.y + climber!.height).toBeLessThan(terminal!.y);
});

test("system and in-game reduced motion stop the canvas while keeping code input usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page.getByRole("button", { name: "Enter the signal room" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  const canvas = page.locator('canvas[data-world="code"]');
  await expect(canvas).toHaveAttribute("data-motion", "reduced");
  const frames = await canvas.evaluate(async (node: HTMLCanvasElement) => {
    const a = node.toDataURL();
    await new Promise((resolve) => setTimeout(resolve, 180));
    return [a, node.toDataURL()];
  });
  expect(frames[0]).toBe(frames[1]);
  await page.keyboard.type("const ");
  await expect(page.locator(".typing-passage .typed")).toHaveCount(6);
  await expect(page.locator(".word-feedback")).toContainText("Packet compiled");
  await expect(page.locator(".word-feedback")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(canvas).toHaveAttribute("data-motion", "animated");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Reduce motion" }).click();
  await page
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page.getByRole("button", { name: "Enter the signal room" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await expect(page.locator('canvas[data-world="code"]')).toHaveAttribute(
    "data-motion",
    "reduced",
  );
});

test("sound packs preview actual audio, persist preferences, and play during a mission", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    (window as unknown as { audioStarts: number }).audioStarts = 0;
    window.AudioContext = class extends Native {
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        source.start = (
          ...args: Parameters<AudioBufferSourceNode["start"]>
        ) => {
          (window as unknown as { audioStarts: number }).audioStarts++;
          return start(...args);
        };
        return source;
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const soundToggle = page.getByRole("switch", {
    name: "Terminal sound",
    exact: true,
  });
  await expect(
    page.getByRole("group", { name: "Keyboard sound pack" }).getByRole("radio"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("slider", { name: "Keyboard volume" }),
  ).toHaveCount(0);
  await soundToggle.click();
  await expect(
    page.getByRole("group", { name: "Keyboard sound pack" }).getByRole("radio"),
  ).toHaveCount(11);
  await page
    .getByRole("button", { name: "Preview Mechanical Click", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { audioStarts: number }).audioStarts,
      ),
    )
    .toBeGreaterThan(1);
  await soundToggle.click();
  await expect(
    page.getByRole("group", { name: "Keyboard sound pack" }).getByRole("radio"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("slider", { name: "Keyboard volume" }),
  ).toHaveCount(0);
  const stopped = await page.evaluate(
    () => (window as unknown as { audioStarts: number }).audioStarts,
  );
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(
      () => (window as unknown as { audioStarts: number }).audioStarts,
    ),
  ).toBe(stopped);
  await soundToggle.click();
  await page.getByRole("radio", { name: "Deep Thock", exact: false }).check();
  const volume = page.getByRole("slider", { name: "Keyboard volume" });
  await volume.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(volume).toHaveValue("2");
  await soundToggle.click();
  await expect(
    page.getByRole("group", { name: "Keyboard sound pack" }).getByRole("radio"),
  ).toHaveCount(0);
  await soundToggle.click();
  await expect(
    page.getByRole("radio", { name: "Deep Thock", exact: false }),
  ).toBeChecked();
  await expect(volume).toHaveValue("2");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Deep Thock", exact: false }),
  ).toBeChecked();
  await expect(
    page.getByRole("slider", { name: "Keyboard volume" }),
  ).toHaveValue("2");
  await expect(
    page.getByRole("switch", { name: "Terminal sound", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Begin expedition" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await page.keyboard.type("signal ");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { audioStarts: number }).audioStarts,
      ),
    )
    .toBeGreaterThan(5);
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Type the mission transmission" })
    .focus();
  const muted = await page.evaluate(
    () => (window as unknown as { audioStarts: number }).audioStarts,
  );
  await page.keyboard.type("the ");
  expect(
    await page.evaluate(
      () => (window as unknown as { audioStarts: number }).audioStarts,
    ),
  ).toBe(muted);
});

test("sound settings and pack selection fit a mobile screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("switch", { name: "Terminal sound", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "Vintage Typewriter", exact: false })
    .check();
  await expect(
    page.getByRole("radio", { name: "Vintage Typewriter", exact: false }),
  ).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Preview Vintage Typewriter", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop Vintage Typewriter", exact: true }),
  ).toBeVisible();
});

test("create a titled paragraph practice, restore its draft, and finish it without a timer", async ({
  page,
}) => {
  const text = "Hello, world!\n\nCafé 🧭";
  await page.goto("/");
  await page
    .getByRole("button", { name: "Custom Text", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start typing", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Give it a title").fill("My first paragraph");
  await page.getByLabel("Your paragraph or sentences").fill(text);
  await expect(page.locator(".custom-preview-text")).toHaveText(text);
  await page
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Custom Text", exact: true })
    .click();
  await expect(page.getByLabel("Your paragraph or sentences")).toHaveValue(
    text,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Custom Text", exact: true })
    .click();
  await expect(page.getByLabel("Your paragraph or sentences")).toHaveValue(
    text,
  );
  await expect(page.getByLabel("Give it a title")).toHaveValue(
    "My first paragraph",
  );
  await page.getByRole("button", { name: "Start typing", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My first paragraph", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("∞", { exact: true })).toBeVisible();
  await page.keyboard.type("Hello, world!");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Caf");
  await page.keyboard.insertText("é");
  await page.keyboard.type(" ");
  await page.keyboard.insertText("🧭");
  await expect(
    page.getByRole("heading", { name: "Session complete" }),
  ).toBeVisible();
  await expect(page.getByText("100.0%", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Progress", exact: true })
    .click();
  await expect(
    page.locator(".run-title").filter({ hasText: "My first paragraph" }),
  ).toBeVisible();
});

test("custom practice supports timed sessions, a mobile editor, and clear training discovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create your own practice", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Try an example", exact: true })
    .click();
  await expect(page.getByLabel("Your paragraph or sentences")).not.toHaveValue(
    "",
  );
  const opening = (
    await page.getByLabel("Your paragraph or sentences").inputValue()
  ).slice(0, 6);
  await page.getByLabel("Practice duration").selectOption("30");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Start typing", exact: true }).click();
  await expect(page.getByText("0:30", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Type the mission transmission" }),
  ).toBeFocused();
  await page.keyboard.type(opening);
  await expect(page.locator(".typing-passage .typed")).toHaveCount(6);
});
