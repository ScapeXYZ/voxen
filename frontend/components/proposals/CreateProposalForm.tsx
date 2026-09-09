"use client";
import { useEffect, useState, useRef } from "react";
import { Plus, X, ArrowRight } from "lucide-react";
import type { Space } from "@/types/voxen";
const steps = [
  "Basics",
  "Options",
  "Voting window",
  "Eligibility",
  "Governance Guard",
  "Review",
];
export function CreateProposalForm({ spaces }: { spaces: Space[] }) {
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [timezone, setTimezone] = useState("local timezone");
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const readableDate = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  const [form, setForm] = useState({
    title: "",
    description: "",
    space: "",
    start: "",
    end: "",
    policy: "FINAL_ON_CAST",
    visibility: "LIVE",
    mode: "GEN_HOLDING",
    minimum: "",
    chain: "4221",
    contract: "",
    label: "",
    standard: "ERC1155",
    token: "",
    guard: false,
    evidence: "",
  });
  const [options, setOptions] = useState(["Approve", "Reject"]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    try {
      setHasDraft(!!localStorage.getItem("voxen:proposal-draft"));
    } catch {}
  }, []);
  function restoreDraft() {
    try {
      const draft = JSON.parse(
        localStorage.getItem("voxen:proposal-draft") || "null",
      );
      if (!draft?.form || !Array.isArray(draft.options))
        throw new Error("Invalid draft");
      setForm((current) => ({ ...current, ...draft.form }));
      setOptions(draft.options);
      setStep(0);
      setHasDraft(false);
      setError("");
    } catch {
      setError(
        "We couldn't open this saved draft. You can start a new one below.",
      );
    }
  }
  useEffect(() => {
    const space = new URLSearchParams(window.location.search).get("space");
    if (space && spaces.some((s) => s.id === space))
      setForm((f) => ({ ...f, space }));
  }, [spaces]);
  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };
  const space = spaces.find((s) => s.id === form.space);
  const validate = (s: number): string => {
    if (s === 0 && (!form.title.trim() || !form.description.trim()))
      return "Add a title and description.";
    if (
      s === 1 &&
      (options.length < 2 ||
        options.length > 6 ||
        options.some((o) => !o.trim()) ||
        new Set(options.map((o) => o.trim().toLowerCase())).size !==
          options.length)
    )
      return "Provide 2–6 distinct, non-empty options.";
    if (
      s === 2 &&
      (!form.start ||
        !form.end ||
        !Number.isFinite(Date.parse(form.start)) ||
        !Number.isFinite(Date.parse(form.end)) ||
        Date.parse(form.end) <= Date.parse(form.start))
    )
      return "Choose an end time after the start time.";
    if (s === 3) {
      if (
        form.mode === "GEN_HOLDING" &&
        (!/^\d+(\.\d{1,18})?$/.test(form.minimum) || Number(form.minimum) <= 0)
      )
        return "Enter a positive minimum GEN balance, up to 18 decimal places.";
      if (
        form.mode === "POAP_NFT" &&
        (!/^0x[0-9a-fA-F]{40}$/.test(form.contract) ||
          /^0x0{40}$/.test(form.contract) ||
          !form.label.trim() ||
          !Number.isSafeInteger(Number(form.chain)) ||
          Number(form.chain) <= 0)
      )
        return "Provide a valid chain ID, non-zero contract address, and credential label.";
      if (
        form.mode === "POAP_NFT" &&
        form.standard === "ERC1155" &&
        (!/^\d+$/.test(form.token) || BigInt(form.token) > 2n ** 256n - 1n)
      )
        return "Enter the numeric token ID supplied by the credential collection owner.";
    }
    if (s === 4) {
      if (form.guard && (!space || !space.guardEnabled))
        return "Choose a Space with Governance Guard enabled.";
      if (form.evidence) {
        try {
          if (!["https:", "http:"].includes(new URL(form.evidence).protocol))
            return "Use an HTTP or HTTPS evidence URL.";
        } catch {
          return "Enter a valid evidence URL.";
        }
      }
    }
    return "";
  };
  function next() {
    const e = validate(step);
    setError(e);
    if (!e) setStep(step + 1);
  }
  function save() {
    for (let i = 0; i < 5; i++) {
      const e = validate(i);
      if (e) {
        setStep(i);
        setError(e);
        return;
      }
    }
    try {
      localStorage.setItem(
        "voxen:proposal-draft",
        JSON.stringify({
          form,
          options,
          startsAt: Math.floor(Date.parse(form.start) / 1000),
          endsAt: Math.floor(Date.parse(form.end) / 1000),
          source: "local-draft",
          status: "DRAFT",
          savedAt: new Date().toISOString(),
        }),
      );
      setSaved(true);
      setError("");
    } catch {
      setError(
        "Local storage is unavailable. Your draft remains in this form.",
      );
    }
  }
  return (
    <div className="form-layout">
      <aside className="step-sidebar">
        <span className="eyebrow">A DECISION STARTS HERE</span>
        <ol>
          {steps.map((s, i) => (
            <li
              key={s}
              className={step === i ? "current" : step > i ? "complete" : ""}
            >
              <button
                type="button"
                disabled={i > step}
                onClick={() => {
                  setStep(i);
                  setError("");
                }}
              >
                <span>0{i + 1}</span>
                {s}
              </button>
            </li>
          ))}
        </ol>
        <p>
          One wallet. One vote.
          <br />
          Eligibility on every proposal.
        </p>
      </aside>
      <form
        className="panel creation-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 5) next();
          else save();
        }}
      >
        {hasDraft && (
          <div className="demo-notice">
            You have a saved proposal draft.{" "}
            <button type="button" className="text-link" onClick={restoreDraft}>
              Resume saved draft
            </button>
            <p className="small">
              Saving a new draft replaces the previous one in this browser.
            </p>
          </div>
        )}
        <span className="eyebrow">Step {step + 1} of 6</span>
        <h2 ref={heading} tabIndex={-1}>
          {
            [
              "What are you asking the community to decide?",
              "What choices can voters select?",
              "When can people vote?",
              "Who is allowed to vote?",
              "Should Governance Guard review this proposal?",
              "Review before submitting",
            ][step]
          }
        </h2>
        {step === 0 && (
          <>
            <p>Give your community a clear decision to make.</p>
            <label>
              Proposal title
              <input
                required
                value={form.title}
                maxLength={160}
                onChange={(e) => set("title", e.target.value)}
                placeholder="What should we decide?"
              />
            </label>
            <label>
              Description
              <textarea
                rows={6}
                required
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Explain the context, intended outcome, and what happens next."
              />
            </label>
            <label>
              Space <span className="muted">(optional)</span>
              <select
                value={form.space}
                onChange={(e) => {
                  set("space", e.target.value);
                  set("guard", false);
                }}
              >
                <option value="">Standalone proposal</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · sample
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <p>Keep options clear and distinct. Add between two and six.</p>
            {options.map((o, i) => (
              <div className="option-edit" key={i}>
                <label>
                  Option {i + 1}
                  <input
                    value={o}
                    required
                    maxLength={120}
                    onChange={(e) =>
                      setOptions(
                        options.map((x, j) => (i === j ? e.target.value : x)),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={options.length <= 2}
                  onClick={() => setOptions(options.filter((_, j) => i !== j))}
                >
                  <X size={17} />
                </button>
              </div>
            ))}
            <button
              className="button"
              type="button"
              disabled={options.length >= 6}
              onClick={() => setOptions([...options, ""])}
            >
              <Plus size={16} />
              Add option
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <p>
              Your local timezone: {timezone}. Choose when voting opens and
              closes.
            </p>
            <div className="field-grid">
              <label>
                Start date and time
                <input
                  type="datetime-local"
                  required
                  value={form.start}
                  onChange={(e) => set("start", e.target.value)}
                />
              </label>
              <label>
                End date and time
                <input
                  type="datetime-local"
                  required
                  value={form.end}
                  onChange={(e) => set("end", e.target.value)}
                />
              </label>
            </div>
            <label>
              Vote change policy
              <select
                value={form.policy}
                onChange={(e) => set("policy", e.target.value)}
              >
                <option value="FINAL_ON_CAST">
                  Cannot change after submission
                </option>
                <option value="CHANGE_UNTIL_CLOSE">
                  Can change until voting closes
                </option>
              </select>
            </label>
            <label>
              Result visibility
              <select
                value={form.visibility}
                onChange={(e) => set("visibility", e.target.value)}
              >
                <option value="LIVE">Live results</option>
                <option value="HIDDEN_UNTIL_CLOSE">Hidden until close</option>
              </select>
            </label>
          </>
        )}
        {step === 3 && (
          <>
            <p>
              Choose who can vote. GEN holding requires a minimum balance; NFT /
              POAP requires a specific community credential.
            </p>
            <fieldset className="mode-picker">
              <legend>Eligibility mode</legend>
              {[
                ["GEN_HOLDING", "GEN holding"],
                ["POAP_NFT", "NFT / POAP credential"],
              ].map(([v, l]) => (
                <label key={v}>
                  <input
                    type="radio"
                    name="mode"
                    checked={form.mode === v}
                    onChange={() => set("mode", v)}
                  />
                  {l}
                </label>
              ))}
            </fieldset>
            {form.mode === "GEN_HOLDING" ? (
              <>
                <label>
                  Minimum GEN balance
                  <input
                    required
                    pattern="[0-9]+([.][0-9]{1,18})?"
                    inputMode="decimal"
                    value={form.minimum}
                    onChange={(e) => set("minimum", e.target.value)}
                    placeholder="100"
                  />
                </label>
                <p className="small muted">
                  GEN is not spent or locked. It is only used to verify
                  eligibility.
                </p>
              </>
            ) : (
              <>
                <div className="field-grid">
                  <label>
                    Chain ID
                    <input
                      inputMode="numeric"
                      value={form.chain}
                      onChange={(e) => set("chain", e.target.value)}
                    />
                  </label>
                  <label>
                    Credential type
                    <select
                      value={form.standard}
                      onChange={(e) => set("standard", e.target.value)}
                    >
                      <option value="ERC721">
                        ERC721 · any credential in the collection
                      </option>
                      <option value="ERC1155">
                        ERC1155 · a specific credential token
                      </option>
                    </select>
                  </label>
                </div>
                <label>
                  Credential contract address
                  <input
                    required
                    pattern="0x[0-9a-fA-F]{40}"
                    title="Enter the collection’s 42-character address beginning with 0x."
                    value={form.contract}
                    onChange={(e) => set("contract", e.target.value)}
                    placeholder="0x…"
                  />
                </label>
                <label>
                  Credential label
                  <input
                    required
                    value={form.label}
                    onChange={(e) => set("label", e.target.value)}
                    placeholder="Community membership"
                  />
                </label>
                {form.standard === "ERC1155" && (
                  <label>
                    Token ID
                    <span className="small muted">
                      Only required when the credential uses a specific ERC1155
                      token.
                    </span>
                    <input
                      inputMode="numeric"
                      value={form.token}
                      onChange={(e) => set("token", e.target.value)}
                      placeholder="501"
                    />
                  </label>
                )}
                <p className="demo-notice">
                  Display name only. This does not determine the token ID.
                </p>
              </>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <p>
              Governance Guard compares this proposal with the Space’s rules and
              uses validator consensus to produce a review.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.guard}
                disabled={!space?.guardEnabled}
                onChange={(e) => set("guard", e.target.checked)}
              />
              Enable Governance Guard
            </label>
            {!space?.guardEnabled && (
              <p className="small muted">
                Select a Guard-enabled Space in Basics to enable rule review.
              </p>
            )}
            <label>
              Evidence URL <span className="muted">(optional)</span>
              <input
                type="url"
                value={form.evidence}
                onChange={(e) => set("evidence", e.target.value)}
                placeholder="https://…"
              />
            </label>
            <div className="demo-notice">
              {form.guard
                ? "Review pending. Validator outcome, risk, confidence, evidence consistency, and reason will appear after a connected submission."
                : "No Guard review. Lifecycle: Draft → Open → Closed → Finalized."}
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <p>Check the details before saving your local draft.</p>
            <h3>{form.title}</h3>
            <p className="wrap">{form.description}</p>
            <dl className="review-list">
              <dt>Space</dt>
              <dd>{space?.name || "Standalone"}</dd>
              <dt>Options</dt>
              <dd>{options.join(" / ")}</dd>
              <dt>Voting window · {timezone}</dt>
              <dd>
                Voting opens {readableDate(form.start)}
                <br />
                Voting closes {readableDate(form.end)}
              </dd>
              <dt>Policies</dt>
              <dd>
                {form.policy === "FINAL_ON_CAST"
                  ? "Votes cannot be changed"
                  : "Votes can change until voting closes"}{" "}
                ·{" "}
                {form.visibility === "LIVE"
                  ? "Live results"
                  : "Results hidden until voting closes"}
              </dd>
              <dt>Eligibility</dt>
              <dd>
                {form.mode === "GEN_HOLDING"
                  ? `Holding at least ${form.minimum} GEN`
                  : `Hold the ${form.label} community credential`}
              </dd>
              {form.mode === "POAP_NFT" && (
                <>
                  <dt>Credential details</dt>
                  <dd>
                    <details>
                      <summary>Technical details</summary>
                      <p className="wrap">
                        Collection: {form.contract}
                        <br />
                        Chain ID: {form.chain}
                        <br />
                        Standard: {form.standard}
                        {form.standard === "ERC1155" && (
                          <>
                            <br />
                            Token ID: {form.token}
                          </>
                        )}
                      </p>
                    </details>
                  </dd>
                </>
              )}
              <dt>Governance Guard</dt>
              <dd>
                {form.guard
                  ? `Pending review · ${space?.nonCompliantPolicy === "BLOCK" ? "Block" : "Warn about"} non-compliant proposals`
                  : "Off"}
              </dd>
              <dt>Evidence</dt>
              <dd>{form.evidence || "None"}</dd>
            </dl>
            <div className="demo-notice">
              Contract submission is not connected. Saving creates a local draft
              on this browser only.
            </div>
            <button className="button full-width" type="button" disabled>
              Submit to GenLayer · integration pending
            </button>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="success">
            Draft saved to this browser. No on-chain proposal was created.
          </p>
        )}
        <div className="form-actions">
          <button
            className="button"
            type="button"
            disabled={step === 0}
            onClick={() => {
              setStep(step - 1);
              setError("");
            }}
          >
            Back
          </button>
          <button type="submit" className="button primary">
            {step === 5 ? "Save local draft" : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
