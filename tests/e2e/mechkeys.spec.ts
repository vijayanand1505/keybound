import { expect, test, type Page } from "@playwright/test";
type Trace = { starts: { recorded: boolean; rate: number }[]; decoded: number };
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const trace: Trace = { starts: [], decoded: 0 };
    (window as unknown as { mechTrace: Trace }).mechTrace = trace;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      private recordings = new WeakSet<AudioBuffer>();
      decodeAudioData(
        data: ArrayBuffer,
        success?: DecodeSuccessCallback,
        error?: DecodeErrorCallback,
      ): Promise<AudioBuffer> {
        return super.decodeAudioData(data, success, error).then((buffer) => {
          this.recordings.add(buffer);
          trace.decoded++;
          return buffer;
        });
      }
      createBufferSource() {
        const source = super.createBufferSource(),
          start = source.start.bind(source);
        source.start = (
          ...args: Parameters<AudioBufferSourceNode["start"]>
        ) => {
          trace.starts.push({
            recorded: !!source.buffer && this.recordings.has(source.buffer),
            rate: source.playbackRate.value,
          });
          return start(...args);
        };
        return source;
      }
    };
  });
}
async function trace(page: Page) {
  return page.evaluate(
    () => (window as unknown as { mechTrace: Trace }).mechTrace,
  );
}
async function reset(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { mechTrace: Trace }).mechTrace.starts = [];
  });
}

test("MechKeys recordings decode, press/release once, ignore repeats, persist, and mute", async ({
  page,
}) => {
  await instrument(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("switch", { name: "Terminal sound", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "MechKeys · Tactile", exact: false })
    .check();
  await expect.poll(async () => (await trace(page)).decoded).toBe(15);
  await page
    .getByRole("button", { name: "Preview MechKeys · Tactile", exact: true })
    .click();
  await expect
    .poll(
      async () => (await trace(page)).starts.filter((s) => s.recorded).length,
    )
    .toBeGreaterThan(2);
  await page
    .getByRole("button", { name: "Stop MechKeys · Tactile", exact: true })
    .click();
  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByRole("button", { name: "Begin expedition" }).click();
  await page.getByRole("button", { name: "Begin mission" }).click();
  await reset(page);
  await page.keyboard.down("a");
  await expect.poll(async () => (await trace(page)).starts.length).toBe(1);
  await page.waitForTimeout(120);
  expect((await trace(page)).starts).toHaveLength(1);
  await page.keyboard.down("a");
  expect((await trace(page)).starts).toHaveLength(1);
  await page.keyboard.up("a");
  await expect.poll(async () => (await trace(page)).starts.length).toBe(2);
  expect((await trace(page)).starts.every((s) => s.recorded)).toBe(true);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Enter");
  expect((await trace(page)).starts).toHaveLength(6);
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Type the mission transmission" })
    .focus();
  await reset(page);
  await page.keyboard.type("signal");
  expect((await trace(page)).starts).toHaveLength(0);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("switch", { name: "Terminal sound", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "MechKeys · Tactile", exact: false }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});

test("all other MechKeys previews play and stop, including the original Classic WAV files", async ({
  page,
}) => {
  await instrument(page);
  await page.clock.install({ time: new Date("2026-10-28T08:00:00Z") });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("switch", { name: "Terminal sound", exact: true })
    .click();
  await page.clock.pauseAt(new Date("2026-10-28T10:00:00Z"));
  for (const pack of ["Classic", "Clicky", "Linear", "Typewriter"]) {
    await reset(page);
    await page
      .getByRole("button", { name: `Preview MechKeys · ${pack}`, exact: true })
      .click();
    if (pack === "Classic")
      await expect.poll(async () => (await trace(page)).decoded).toBe(16);
    await page.clock.runFor(250);
    await expect
      .poll(async () => (await trace(page)).starts.length)
      .toBeGreaterThan(1);
    if (pack === "Classic") {
      expect((await trace(page)).decoded).toBe(16);
      expect((await trace(page)).starts.every((s) => s.recorded)).toBe(true);
    } else
      expect((await trace(page)).starts.every((s) => !s.recorded)).toBe(true);
    await page
      .getByRole("button", { name: `Stop MechKeys · ${pack}`, exact: true })
      .click();
    const count = (await trace(page)).starts.length;
    await page.clock.runFor(500);
    expect((await trace(page)).starts.length).toBe(count);
  }
});

test("stopping a preview while recordings are downloading prevents late playback", async ({
  page,
}) => {
  await instrument(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/audio/mechkeys/classic/*.wav", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("switch", { name: "Terminal sound", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preview MechKeys · Classic", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Stop MechKeys · Classic", exact: true })
    .click();
  release();
  await expect.poll(async () => (await trace(page)).decoded).toBe(16);
  await page.waitForTimeout(250);
  expect((await trace(page)).starts).toHaveLength(0);
});
