import { expect, test } from "@playwright/test";
test("game covers load, the featured shooter launches, and quick practice stays usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const featured = page.getByRole("region", {
    name: "Signal Siege",
    exact: true,
  });
  await expect(featured).toBeVisible();
  await expect(
    featured.getByRole("button", { name: "Play now", exact: true }),
  ).toBeVisible();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page
      .locator(".expedition-layout")
      .evaluate((element) => {
        const main = element
          .querySelector(".arcade-feature")!
          .getBoundingClientRect();
        const story = element
          .querySelector(".hero-card")!
          .getBoundingClientRect();
        return {
          first:
            element.firstElementChild?.classList.contains("arcade-feature"),
          prominent: main.width >= story.width,
          beforeStory: main.right <= story.left || main.bottom <= story.top,
        };
      });
    expect(layout).toEqual({ first: true, prominent: true, beforeStory: true });
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  const covers = page.locator(".expedition-layout .game-cover-image");
  await expect(covers).toHaveCount(2);
  await expect
    .poll(() =>
      covers.evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  for (const number of ["01", "02", "06"]) {
    const card = page.getByRole("button", {
      name: new RegExp(`Expedition ${number}:`),
    });
    await card.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        card
          .locator("img")
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  await page.getByRole("button", { name: /Expedition 02:/ }).click();
  await expect(
    page
      .locator(".hero-card")
      .getByRole("heading", { name: "The White Ascent", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".hero-card img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const card = page.getByRole("button", { name: /Expedition 02:/ });
  await card.hover();
  await expect(card).toHaveCSS("transform", "none");
  await expect(card.locator("img")).toHaveCSS("transition-duration", "0s");
  for (const theme of ["Light", "Dark"]) {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: new RegExp(`^${theme}`) }).check();
    await page.getByRole("button", { name: "Games", exact: true }).click();
    const contrast = await page
      .getByRole("button", { name: "Play now", exact: true })
      .evaluate((button) => {
        const style = getComputedStyle(button);
        const luminance = (color: string) => {
          const values = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map((value) => {
              const channel = Number(value) / 255;
              return channel <= 0.04045
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4;
            });
          return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
        };
        const ink = luminance(style.color),
          fill = luminance(style.backgroundColor);
        return (Math.max(ink, fill) + 0.05) / (Math.min(ink, fill) + 0.05);
      });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
  await page
    .getByRole("button", { name: "60-second test", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Before you start", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Keybound home", exact: true }).click();
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Launch defense", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".siege-ready-overlay img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("the home action launches the shooter and returns to the same paused run", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Play now", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  for (const difficulty of ["Training", "Standard", "Expert"]) {
    await expect(
      page.getByRole("radio", { name: new RegExp(`^${difficulty}`) }),
    ).toBeEnabled();
  }
  await page.getByRole("radio", { name: /^Training/ }).check();
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
  const firstEnemy = page.locator(".siege-enemy").first();
  await expect(firstEnemy).toBeVisible();
  const id = await firstEnemy.getAttribute("data-enemy-id");
  const word = (await firstEnemy.getAttribute("data-word"))!;
  await page.keyboard.type(word[0]);
  await page.getByRole("link", { name: "Keybound home", exact: true }).click();
  await expect(page.locator(".siege-page")).toHaveAttribute(
    "data-status",
    "paused",
  );
  await expect(
    page.getByRole("button", { name: "Play now", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Continue run", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Game paused", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume defense", exact: true })
    .click();
  await expect(
    page.locator(`.siege-enemy[data-enemy-id="${id}"] .siege-typed`),
  ).toHaveText(word[0]);
  await page.keyboard.type(word.slice(1));
  await expect(page.locator(`.siege-enemy[data-enemy-id="${id}"]`)).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "End run & save report", exact: true })
    .click();
  await page.getByRole("link", { name: "Keybound home", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play now", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Training/ })).toBeChecked();
});

test("the quieter layout keeps the name-only credit and secondary content accessible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Games & practice", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".expedition-tile:visible")).toHaveCount(3);
  const upcoming = page.locator(".upcoming-expeditions");
  await expect(upcoming).not.toHaveAttribute("open", "");
  await upcoming.locator("summary").click();
  await expect(
    page.getByRole("button", { name: /Expedition 03/ }),
  ).toBeVisible();
  await upcoming.locator("summary").click();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const heroFits = await page.locator(".hero-card").evaluate((hero) => {
      const tag = hero.querySelector(".hero-top")!.getBoundingClientRect();
      const copy = hero.querySelector(".hero-content")!.getBoundingClientRect();
      return tag.bottom <= copy.top;
    });
    expect(heroFits).toBe(true);
    const footer = page.locator("footer.footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByRole("link")).toHaveText("Vijay Anand");
    await expect(footer.getByRole("link")).toHaveAttribute(
      "href",
      "https://github.com/vijayanand1505",
    );
    await expect(footer.locator(".footer-credit")).toHaveText(
      "Developed and maintained by Vijay Anand",
    );
    await expect(footer.locator(".footer-credit")).toHaveCSS(
      "font-size",
      "14px",
    );
    await expect(footer.locator(".footer-credit")).toHaveCSS(
      "text-decoration-line",
      "none",
    );
    await expect(footer.getByRole("link")).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Signal Siege", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Launch defense", exact: true }),
  ).toBeVisible();
  const help = page.locator(".siege-help");
  await expect(help).not.toHaveAttribute("open", "");
  await help.locator("summary").click();
  await expect(
    page.getByRole("heading", { name: "Know your enemies", exact: true }),
  ).toBeVisible();
});

test("the guest profile and Settings stay inside short desktop and mobile viewports", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Games & practice" }).waitFor();
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1280, height: 600 },
    { width: 1024, height: 480 },
    { width: 768, height: 400 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator(".profile")).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    if (viewport.width > 950) {
      await expect(
        page.locator(".profile").getByText("Unknown courier", { exact: false }),
      ).toBeVisible();
      await expect(page.locator(".profile .guest-badge")).toBeInViewport({
        ratio: 1,
      });
    } else
      await expect(page.locator(".mobile-identity")).toContainText(
        "Unknown courier",
      );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("light theme, accent and contrast persist while the sound controls remain conditional", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Dark/ })).toBeChecked();
  await page.getByRole("radio", { name: /^Light/ }).check();
  await page.getByRole("radio", { name: "Ocean", exact: false }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "ocean");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(246, 244, 239)",
  );
  await page
    .getByRole("switch", { name: "High contrast", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Light/ })).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Ocean", exact: false }),
  ).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "High contrast", exact: true }),
  ).toBeChecked();
  await expect(page.locator(".sound-studio")).toHaveCount(0);
  await page
    .getByRole("switch", { name: "Terminal sound", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Keyboard sound pack" }).getByRole("radio"),
  ).toHaveCount(11);
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Begin expedition" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await expect(page.locator(".terminal")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.keyboard.type("signal ");
  await expect(page.locator(".typing-passage .typed")).toHaveCount(7);
  expect(errors).toEqual([]);
});
test("System follows device theme changes and explicit themes override them", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("radio", { name: /^System/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: /^Light/ }).check();
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("radio", { name: /^Light/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
