import { expect, test } from "@playwright/test";

test("timed arcade keeps targets available and skips sector breaks without spending extra time", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await page.getByRole("radio", { name: /^60-second arcade/ }).check();
  await page.getByRole("radio", { name: /^Training/ }).check();
  await page.clock.install({ time: new Date("2026-10-31T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T03:00:01Z"));
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await page.clock.runFor(3100);
  // Synchronize the throttled HUD before comparing simulation time across input.
  await page.keyboard.press("Backspace");
  const elapsed = await page
    .locator(".siege-page")
    .getAttribute("data-elapsed");
  for (let i = 0; i < 7; i++) {
    const enemy = page.locator(".siege-enemy").first();
    const word = (await enemy.getAttribute("data-word"))!;
    const id = await enemy.getAttribute("data-enemy-id");
    await page.keyboard.type(word);
    await expect(
      page.locator(`.siege-enemy[data-enemy-id="${id}"]`),
    ).toHaveCount(0);
    await expect(page.locator(".siege-enemy").first()).toBeVisible();
    await expect(page.locator(".siege-wave-clear")).toHaveCount(0);
  }
  await expect(
    page.locator(".siege-hud > div").first().locator("strong"),
  ).toHaveText("03");
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-elapsed",
    elapsed!,
  );
  await page.keyboard.press("Space");
  await expect(page.locator(".siege-enemy").first()).toBeVisible();
  await expect(page.locator(".siege-wave-clear")).toHaveCount(0);
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-elapsed",
    elapsed!,
  );
});

test("timed arcade freezes on interruptions, completes at 60 seconds in fullscreen, and saves separate records", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await page.getByRole("radio", { name: /^Training/ }).check();
  await page.clock.install({ time: new Date("2026-10-31T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T03:00:01Z"));
  const launch = page.getByRole("button", {
    name: "Launch defense",
    exact: true,
  });
  await launch.click();
  await page.clock.runFor(3100);
  let word = (await page
    .locator(".siege-enemy")
    .first()
    .getAttribute("data-word"))!;
  await page.keyboard.type(word);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  const endlessBest = await page.locator(".siege-best strong").textContent();
  expect(Number(endlessBest?.replaceAll(",", ""))).toBeGreaterThan(0);
  await page.getByRole("radio", { name: /^60-second arcade/ }).check();
  await expect(page.locator(".siege-best strong")).toHaveText("0");
  await page.getByRole("button", { name: "Fly again", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("1:00");
  await expect(page.getByRole("radio", { name: /^Endless/ })).toBeDisabled();
  await page.clock.runFor(3100);
  word = (await page
    .locator(".siege-enemy")
    .first()
    .getAttribute("data-word"))!;
  await page.keyboard.type(word);
  await page.clock.runFor(5000);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const frozen = await page.getByRole("timer").textContent();
  await page.clock.runFor(15000);
  await expect(page.getByRole("timer")).toHaveText(frozen!);
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByRole("button", { name: "Enter fullscreen", exact: true })
    .click();
  await page.clock.runFor(55000);
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "over",
  );
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-elapsed",
    "60000",
  );
  await expect(page.getByRole("timer")).toHaveText("0:00");
  await expect(
    page.getByRole("heading", { name: "Time’s up", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Fly again", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: testInfo.outputPath("timed-fullscreen-result.png"),
  });
  await page
    .getByRole("button", { name: "Exit fullscreen", exact: true })
    .click();
  await expect(page.locator(".siege-report")).toContainText(
    "60-second arcade · Training · 60 seconds complete",
  );
  await expect(page.locator(".siege-report")).toContainText(
    "first recorded 60-second arcade · Training run",
  );
  await expect(page.locator(".siege-report")).not.toContainText(
    "Compared with your previous",
  );
  const timedBest = await page.locator(".siege-best strong").textContent();
  expect(Number(timedBest?.replaceAll(",", ""))).toBeGreaterThan(0);
  await page.clock.runFor(2000);
  await page.clock.resume();
  await page.reload();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /^60-second arcade/ }),
  ).toBeChecked();
  await expect(page.locator(".siege-best strong")).toHaveText(timedBest!);
  await page.getByRole("radio", { name: /^Endless/ }).check();
  await expect(page.locator(".siege-best strong")).toHaveText(endlessBest!);
  await page.getByRole("radio", { name: /^60-second arcade/ }).check();
  await page.getByRole("radio", { name: /^Expert/ }).check();
  await expect(page.locator(".siege-best strong")).toHaveText("0");
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".run-list .run-row")).toHaveCount(2);
  await expect(page.locator(".run-list")).toContainText(
    "Signal Siege · 60-second arcade · Training",
  );
  await expect(page.locator(".run-list")).toContainText(
    "Signal Siege · Endless · Training",
  );
});

test("timed mode fits a narrow screen and reports hull loss before the deadline", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await page.getByRole("radio", { name: /^60-second arcade/ }).check();
  await page.getByRole("radio", { name: /^Expert/ }).check();
  await page.clock.install({ time: new Date("2026-10-31T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T03:00:01Z"));
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await page.clock.runFor(3100);
  await expect(page.getByRole("timer")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Pause defense", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page
    .getByRole("button", { name: "Pause defense", exact: true })
    .click();
  const remaining = await page.getByRole("timer").textContent();
  await page.clock.runFor(3000);
  await expect(page.getByRole("timer")).toHaveText(remaining!);
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("timed-mobile.png") });
  await page.clock.runFor(45000);
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "over",
  );
  expect(
    Number(await page.locator(".siege-page").getAttribute("data-elapsed")),
  ).toBeLessThan(60000);
  await expect(page.locator(".siege-report")).toContainText(
    "60-second arcade · Expert · Hull lost",
  );
  await expect(
    page.getByRole("heading", { name: "Time’s up", exact: true }),
  ).toHaveCount(0);
});
