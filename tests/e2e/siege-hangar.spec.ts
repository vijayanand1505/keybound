import { expect, test } from "@playwright/test";

test("new frames and lasers preview, save, and fly in real combat without preview rewards", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await page.locator(".siege-customization summary").click();
  await expect(page.locator(".siege-customization summary")).toContainText(
    "7 / 16 unlocked",
  );
  for (const name of ["Twinfin", "Prism", "Stardust"])
    await expect(
      page.getByRole("radio", { name: new RegExp(`^${name}`) }),
    ).toBeDisabled();
  const preview = page.locator(".siege-ship-preview canvas");
  const original = await preview.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page.getByRole("radio", { name: /^Dart/ }).check();
  await page.getByRole("radio", { name: /^Tracer/ }).check();
  await expect
    .poll(() => preview.evaluate((c) => (c as HTMLCanvasElement).toDataURL()))
    .not.toBe(original);
  await page.getByRole("button", { name: "Test fire", exact: true }).click();
  await expect(page.locator(".siege-preview-actions [role=status]")).toHaveText(
    "Preview complete.",
  );
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "ready",
  );
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-elapsed",
    "0",
  );
  await expect(page.getByRole("radio", { name: /^Aurora/ })).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath("hangar-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".run-list .run-row")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.locator(".siege-customization summary").click();
  for (const name of ["Dart", "Tracer"])
    await expect(
      page.getByRole("radio", { name: new RegExp(`^${name}`) }),
    ).toBeChecked();
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Test fire", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("radio", { name: /^Vector/ })).toBeDisabled();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
    { timeout: 7000 },
  );
  const word = (await page
    .locator(".siege-enemy")
    .first()
    .getAttribute("data-word"))!;
  await page.keyboard.type(word);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await expect(page.locator(".siege-cosmetic-reward")).toContainText("Aurora");
  expect(errors).toEqual([]);
});

test("preview stops when closed or left, and reduced motion uses a stable shot on narrow screens", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  const summary = page.locator(".siege-customization summary");
  await summary.click();
  await page.clock.install({ time: new Date("2026-10-31T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T03:00:01Z"));
  const fire = page.getByRole("button", { name: "Test fire", exact: true });
  await fire.click();
  await page.clock.runFor(96);
  await summary.click();
  await page.clock.runFor(2000);
  await summary.click();
  await expect(fire).toBeEnabled();
  await fire.click();
  await page.clock.runFor(96);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await expect(fire).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("radio", { name: /^Dart/ }).check();
  await page.getByRole("radio", { name: /^Tracer/ }).check();
  await fire.click();
  await expect(
    page.locator(".siege-preview-actions [role=status]"),
  ).toContainText("Reduced motion is on");
  const preview = page.locator(".siege-ship-preview canvas");
  const still = await preview.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page.clock.runFor(1500);
  expect(
    await preview.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
  ).toBe(still);
  await expect(fire).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await preview.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("hangar-mobile.png"),
    fullPage: true,
  });
});
