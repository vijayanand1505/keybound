"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Feather,
  LockKeyhole,
  Timer,
} from "lucide-react";
import {
  CUSTOM_TEXT_LIMIT,
  customDurations,
  customTextStats,
  emptyCustomDraft,
  prepareCustomText,
  type CustomDraft,
} from "@/game/custom-practice";
export default function CustomPractice({
  initial = emptyCustomDraft,
  onSave,
  onStart,
  calm,
}: {
  initial?: CustomDraft;
  onSave: (draft: CustomDraft) => void;
  onStart: (draft: CustomDraft) => void;
  calm: boolean;
}) {
  const [draft, setDraft] = useState<CustomDraft>(initial);
  const latest = useRef(draft);
  latest.current = draft;
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => {
      onSave(draft);
      dirty.current = false;
    }, 450);
    return () => clearTimeout(timer);
  }, [draft, onSave]);
  useEffect(
    () => () => {
      if (dirty.current) onSave(latest.current);
    },
    [onSave],
  );
  const stats = customTextStats(draft.text),
    ready = prepareCustomText(draft.text).length > 0;
  function change(patch: Partial<CustomDraft>) {
    dirty.current = true;
    setDraft((previous) => ({ ...previous, ...patch }));
  }
  const sample =
    "I took the train into town on Saturday. The market was busy, so I stopped at a small cafe for breakfast.\n\nAfter lunch, I walked through the park and picked up a book on my way home.";
  return (
    <div className="custom-practice-grid">
      <form
        className="custom-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          dirty.current = false;
          onSave(draft);
          onStart(draft);
        }}
      >
        <div className="composer-heading">
          <Feather size={21} />
          <div>
            <span className="eyebrow">Custom text</span>
            <h2>Add your practice text</h2>
          </div>
        </div>
        <p className="composer-description">
          Paste or write the text you want to practice. Choose a time limit or
          type until you finish.
        </p>
        <label htmlFor="custom-title">
          Give it a title <span>(optional)</span>
        </label>
        <input
          id="custom-title"
          className="composer-title"
          value={draft.title}
          maxLength={60}
          onChange={(event) => change({ title: event.target.value })}
          placeholder="For example, English homework"
        />
        <div className="composer-text-label">
          <label htmlFor="custom-passage">Your paragraph or sentences</label>
          <span>{draft.text.length.toLocaleString()} / 12,000</span>
        </div>
        <textarea
          id="custom-passage"
          className="composer-passage"
          value={draft.text}
          maxLength={CUSTOM_TEXT_LIMIT}
          onChange={(event) => change({ text: event.target.value })}
          placeholder={
            "Type or paste your words here.\n\nYou can use multiple paragraphs, capital letters, numbers, and punctuation."
          }
          aria-describedby="composer-help"
          spellCheck
        />
        <div className="composer-tools">
          <p id="composer-help">
            Enter keeps your paragraph breaks. Case and punctuation count.
          </p>
          {!draft.text && (
            <button
              type="button"
              className="text-button"
              onClick={() =>
                change({
                  text: sample,
                  title: draft.title || "A Saturday in town",
                })
              }
            >
              Try an example
              <ArrowRight size={13} />
            </button>
          )}
        </div>
        <div className="composer-summary">
          <span>
            <strong>{stats.words}</strong> words
          </span>
          <span>
            <strong>{stats.characters}</strong> characters
          </span>
          <span>
            <strong>{stats.paragraphs}</strong>{" "}
            {stats.paragraphs === 1 ? "paragraph" : "paragraphs"}
          </span>
        </div>
        <div className="composer-controls">
          <div>
            <label htmlFor="custom-time">
              <Timer size={14} />
              Practice duration
            </label>
            <select
              id="custom-time"
              value={draft.seconds}
              onChange={(event) =>
                change({ seconds: Number(event.target.value) })
              }
            >
              {customDurations.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds === 0
                    ? "Until I finish — no timer"
                    : seconds < 60
                      ? `${seconds} seconds`
                      : `${seconds / 60} ${seconds === 60 ? "minute" : "minutes"}`}
                </option>
              ))}
            </select>
          </div>
          <button className="button primary" type="submit" disabled={!ready}>
            Start typing
            <ArrowRight size={17} />
          </button>
        </div>
        {calm && draft.seconds > 0 && (
          <p className="composer-description">
            Calm mode is on, so this practice will have no time limit.
          </p>
        )}
        <p className="composer-privacy">
          <LockKeyhole size={12} />
          Your draft saves automatically on this device.
        </p>
      </form>
      <aside className="custom-preview">
        <span className="tiny-label">
          <BookOpen size={14} /> Preview
        </span>
        <span className="preview-quote">“</span>
        <h2>{draft.title.trim() || "Your text preview"}</h2>
        <div className={`custom-preview-text ${!ready ? "empty-preview" : ""}`}>
          {ready
            ? prepareCustomText(draft.text)
            : "Your text will appear here once you add it. You can edit it before starting."}
        </div>
        <div className="custom-preview-footer">
          <Feather size={16} />
          <span>
            {ready ? "Ready to practice" : "Add some text to start"}
            <small>
              {draft.seconds === 0 || calm
                ? "No timer. Finish at your own pace."
                : "The timer starts on your first keystroke."}
            </small>
          </span>
        </div>
      </aside>
    </div>
  );
}
