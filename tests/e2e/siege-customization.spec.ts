import { expect, test } from "@playwright/test";

test("navigation uses plain names and keeps each destination available", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of [
    "Games",
    "Daily Challenge",
    "Signal Siege",
    "Practice",
    "Custom Text",
    "Progress",
  ]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name, exact: true })
      .click();
    await expect(page.locator(".topbar")).toContainText(name);
  }
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Typing practice", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your results", exact: true }),
  ).toBeVisible();
});

test("3-2-1 countdown blocks early input, cancels on interruption and starts fresh", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await page.clock.install({ time: new Date("2026-10-31T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T03:00:01Z"));
  const launch = page.getByRole("button", {
    name: "Launch defense",
    exact: true,
  });
  await launch.click();
  await expect(page.locator(".siege-countdown strong")).toHaveText("3");
  await page.keyboard.type("orbit ");
  await expect(page.locator(".siege-enemy")).toHaveCount(0);
  await expect(
    page.locator(".siege-hud>div").nth(1).locator("strong"),
  ).toHaveText("00000");
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-elapsed",
    "0",
  );
  await page.clock.runFor(1120);
  await expect(page.locator(".siege-countdown strong")).toHaveText("2");
  await page.clock.runFor(1000);
  await expect(page.locator(".siege-countdown strong")).toHaveText("1");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "ready",
  );
  await page.clock.runFor(5000);
  await expect(page.locator(".siege-enemy")).toHaveCount(0);
  await launch.click();
  await expect(page.locator(".siege-countdown strong")).toHaveText("3");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await expect(launch).toBeVisible();
  await launch.click();
  await page.keyboard.press("Escape");
  await expect(launch).toBeVisible();
  await expect(launch).toBeFocused();
  await launch.click();
  await page
    .getByRole("button", { name: "Cancel launch", exact: true })
    .click();
  await expect(launch).toBeVisible();
  await launch.click();
  await page.clock.runFor(3100);
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "running",
  );
  await expect(page.locator(".siege-enemy").first()).toBeVisible();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-elapsed",
    /^[0-9.]+$/,
  );
});

test("finishing a real run unlocks Aurora, saves selection and clears it with local data", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await page.locator(".siege-customization summary").click();
  await expect(page.getByRole("radio", { name: /^Aurora/ })).toBeDisabled();
  await page.clock.install({ time: new Date("2026-10-31T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T03:00:01Z"));
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await page.clock.runFor(3100);
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
  const preview = page.locator(".siege-customization canvas");
  const before = await preview.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page.getByRole("radio", { name: /^Aurora/ }).check();
  await expect
    .poll(() => preview.evaluate((c) => (c as HTMLCanvasElement).toDataURL()))
    .not.toBe(before);
  await page.clock.resume();
  await page.reload();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.locator(".siege-customization summary").click();
  await expect(page.getByRole("radio", { name: /^Aurora/ })).toBeChecked();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.locator(".run-list .run-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete local progress", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete everything", exact: true })
    .click();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.locator(".siege-customization summary").click();
  await expect(page.getByRole("radio", { name: /^Relay/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^Aurora/ })).toBeDisabled();
});

test("legacy progress unlocks styles and all five selections persist on a narrow light layout", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Games & practice", exact: true })
    .waitFor();
  await page.evaluate(async () => {
    const runs = Array.from({ length: 3 }, (_, i) => ({
      id: `legacy-${i}`,
      missionId: "orbit-signal-siege",
      title: "Signal Siege",
      expedition: "orbit",
      mode: "arcade",
      date: "2026-10-30T01:00:00Z",
      completed: false,
      xp: 100,
      events: [],
      metrics: {
        wpm: 40,
        grossWpm: 40,
        accuracy: 100,
        consistency: 100,
        flow: 0,
        combo: 10,
        maxCombo: 10,
        errors: 0,
        duration: 30000,
        progress: 0,
      },
      arcade: {
        score: 2000,
        wave: 5,
        kills: 20,
        maxCombo: 10,
        difficulty: "standard",
      },
    }));
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("keyval-store");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result,
          transaction = db.transaction("keyval", "readwrite");
        transaction.objectStore("keyval").put(
          {
            version: 1,
            runs,
            settings: { theme: "light" },
            arcadeBests: { standard: { score: 2000, wave: 5 } },
          },
          "keybound-save-v1",
        );
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await page.reload();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.locator(".siege-customization summary").click();
  await expect(page.locator(".siege-customization summary")).toContainText(
    "15 / 16 unlocked",
  );
  for (const name of ["Ember", "Comet", "Orbit", "Twinfin", "Prism"])
    await page.getByRole("radio", { name: new RegExp(`^${name}`) }).check();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await page.locator(".siege-customization summary").click();
  for (const name of ["Ember", "Comet", "Orbit", "Twinfin", "Prism"])
    await expect(
      page.getByRole("radio", { name: new RegExp(`^${name}`) }),
    ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("unlock results and countdown controls fit a short fullscreen field", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await page.clock.install({ time: new Date("2026-10-31T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T03:00:01Z"));
  await page
    .getByRole("button", { name: "Launch defense", exact: true })
    .click();
  await page.clock.runFor(3100);
  const word = (await page
    .locator(".siege-enemy")
    .first()
    .getAttribute("data-word"))!;
  await page.keyboard.type(word);
  await page
    .getByRole("button", { name: "Enter fullscreen", exact: true })
    .click();
  await page.clock.runFor(64);
  await page
    .getByRole("button", { name: "Pause defense", exact: true })
    .click();
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await expect(page.locator(".siege-cosmetic-reward")).toContainText("Aurora");
  await expect(
    page.getByRole("button", { name: "Fly again", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: "Fly again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cancel launch", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page
    .getByRole("button", { name: "Cancel launch", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Launch defense", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
});
