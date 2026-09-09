"use client";
import { useEffect, useState, useRef } from "react";
import { Plus, X, ArrowRight } from "lucide-react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useCreateProposal } from "@/hooks/useCreateProposal";
import {
  emptyProposalForm,
  validateProposalForm,
  smokeTestForm,
  type ProposalForm,
} from "@/lib/voxen/create-proposal";
import { voteStageLabels } from "@/lib/voxen/transaction-state";
import { SupportingReference } from "./SupportingReference";
import { CredentialPicker } from "./CredentialPicker";
const steps = ["Proposal details", "Voting choices", "Voting period", "Who can vote?", "Review & publish"];
export function CreateProposalForm() {
  const wallet = useWallet();
  const creation = useCreateProposal();
  const created = ["accepted", "finalized"].includes(creation.stage);
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
  const [form, setForm] = useState<ProposalForm>(emptyProposalForm);
  const [options, setOptions] = useState(["", ""]);
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
      const restored = { ...emptyProposalForm };
      for (const key of Object.keys(restored) as (keyof ProposalForm)[]) {
        if (key === "guard") restored.guard = draft.form.guard === true;
        else if (typeof draft.form[key] === "string")
          restored[key] = draft.form[key];
      }
      if (
        !draft.options.every((value: unknown) => typeof value === "string") ||
        draft.options.length < 2 || draft.options.length > 6
      )
        throw new Error("Invalid draft options");
      restored.space = "";
      restored.guard = false;
      setForm(restored);
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
  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };
  const validate = (step: number) => validateProposalForm(form, options, step);
  function submit() {
    if (!wallet.isConnected || !wallet.address) {
      setError("Connect your wallet to create this proposal.");
      return;
    }
    if (!wallet.isOnCorrectNetwork) {
      setError("Switch to GenLayer Bradbury to create this proposal.");
      return;
    }
    if (creation.pending || created) return;
    for (let i = 0; i < 5; i++) {
      const message = validateProposalForm(form, options, i, true);
      if (message) {
        setStep(i);
        setError(message);
        return;
      }
    }
    setError("");
    void creation.submit({ ...form }, [...options]);
  }
  function next() {
    const e = validate(step);
    setError(e);
    if (!e) setStep(step + 1);
  }
  function save() {
    try {
      localStorage.setItem(
        "voxen:proposal-draft",
        JSON.stringify({
          form,
          options,
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
          if (step < 4) next();
          else submit();
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
        <span className="eyebrow">Step {step + 1} of 5</span>
        <h2 ref={heading} tabIndex={-1}>
          {
            [
              "What are you asking the community to decide?",
              "What choices can voters select?",
              "When can people vote?",
              "Who is allowed to vote?",
              "Review before submitting",
            ][step]
          }
        </h2>
        {step === 0 && (
          <>
            <p>
              Create a publicly accessible proposal on Bradbury. A Community workspace is not required. You may prepare a proposal on behalf of another entity; the connected wallet remains the onchain creator.
            </p>
            {process.env.NODE_ENV !== "production" && <>
            <button
              type="button"
              className="button"
              disabled={creation.pending}
              onClick={() => {
                setForm(smokeTestForm());
                setOptions(["Approve", "Reject"]);
                setSaved(false);
                setError("");
              }}
            >
              Load live test settings
            </button>
            <p className="small muted">
              Fills the recommended ERC1155 test with a four-hour window. Review
              all five steps and submit manually.
            </p>
            </>}
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
            <section aria-labelledby="proposal-context-heading">
              <h3 id="proposal-context-heading">Proposal Context</h3>
              <p>Add supporting information that helps voters understand the decision.</p>
              <label>
                Supporting reference (optional)
                <input type="url" value={form.evidence} placeholder="https://..."
                  aria-describedby="reference-help"
                  onChange={(e) => set("evidence", e.target.value)} />
              </label>
              <p id="reference-help" className="small muted">Add a link to a document, discussion, announcement, research, budget, or other source that provides context for this proposal.</p>
              <SupportingReference url={form.evidence} preview />
            </section>
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
                    placeholder="Enter a choice"
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
                <CredentialPicker
                  form={form}
                  onChange={(patch) => {
                    setForm((f) => ({ ...f, ...patch }));
                    setSaved(false);
                    setError("");
                  }}
                />
              </>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <p>Check the details before creating your proposal on Bradbury.</p>
            <h3>{form.title}</h3>
            <p className="wrap">{form.description}</p>
            <dl className="review-list">
              <dt>Access</dt>
              <dd>Public proposal · voting requires proposal eligibility</dd>
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
              {form.evidence.trim() && <>
                <dt>Proposal Context</dt>
                <dd><SupportingReference url={form.evidence} /></dd>
              </>}
            </dl>
            <div className="demo-notice">
              Creation starts this proposal in Draft. Opening voting is a
              separate creator action; creation does not automatically open the
              voting window. Your browser draft is retained.
            </div>
            {!wallet.isConnected ? (
              <p role="status">Connect your wallet to create this proposal.</p>
            ) : !wallet.isOnCorrectNetwork ? (
              <p role="status">
                Switch to GenLayer Bradbury to create this proposal.
              </p>
            ) : (
              <p className="small">
                Ready to submit with your connected wallet. Your wallet will
                display the network fee.
              </p>
            )}
            <WalletButton />
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="success">
            Draft saved to this browser.
          </p>
        )}
        {creation.stage !== "idle" && (
          <div aria-live="polite">
            <p role="status">
              {creation.stage === "preparing"
                ? "Preparing proposal"
                : voteStageLabels[creation.stage]}
            </p>
            {created && (
              <>
                <h3>Proposal created</h3>
                <p>
                  The transaction succeeded. The new proposal link is
                  unavailable; you can find the transaction reference below.
                </p>
              </>
            )}
            {creation.message && <p role="alert">{creation.message}</p>}
            {creation.monitoringError && (
              <>
                <p role="alert">
                  Transaction status is temporarily unavailable. Your proposal
                  may still be processing; do not resubmit.
                </p>
                <button
                  type="button"
                  className="button"
                  onClick={() => void creation.retryStatus()}
                >
                  Retry transaction status
                </button>
              </>
            )}
            <details>
              <summary>Transaction details</summary>
              {created && (
                <p>
                  The installed SDK returns a transaction ID, not a decoded
                  proposal ID. No proposal ID has been guessed.
                </p>
              )}
              <p className="mono wrap">
                Wallet transaction: {creation.evmHash || "Not submitted"}
              </p>
              <p className="mono wrap">
                GenLayer transaction: {creation.txId || "Not available yet"}
              </p>
              <p className="small wrap">
                {creation.monitoringError || creation.technical}
              </p>
            </details>
          </div>
        )}
        {created && (
          <button
            type="button"
            className="button"
            onClick={() => {
              creation.startAnother();
              setStep(0);
              setForm(emptyProposalForm);
              setOptions(["", ""]);
              setSaved(false);
            }}
          >
            Start another proposal
          </button>
        )}
        <button type="button" className="button" onClick={save}>
          Save local draft
        </button>
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
          <button
            type="submit"
            className="button primary"
            disabled={
              creation.pending ||
              (step === 4 &&
                (created || !wallet.isConnected || !wallet.isOnCorrectNetwork))
            }
          >
            {step === 4 ? "Create proposal" : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
