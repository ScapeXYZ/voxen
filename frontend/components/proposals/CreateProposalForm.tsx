"use client";
import { useEffect, useState, useRef } from "react";
import { Plus, X, ArrowRight } from "lucide-react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useCreateProposal } from "@/hooks/useCreateProposal";
import {
  emptyProposalForm,
  validateProposalForm,
  type ProposalForm,
} from "@/lib/voxen/create-proposal";
import { voteStageLabels } from "@/lib/voxen/transaction-state";
import { SupportingReference } from "./SupportingReference";
import { CredentialPicker } from "./CredentialPicker";
import { voxenConfig } from "@/lib/voxen/config";
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
  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
  };
  const validate = (step: number) => validateProposalForm(form, options, step);
  function submit() {
    if (!wallet.isConnected || !wallet.address) {
      setError("Connect your wallet to create this proposal.");
      return;
    }
    if (!wallet.isOnCorrectNetwork) {
      setError(`Switch to ${voxenConfig.networkName} to create this proposal.`);
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
              Create a publicly accessible proposal on {voxenConfig.networkName}. A Community workspace is not required. You may prepare a proposal on behalf of another entity; the connected wallet remains the onchain creator.
            </p>
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
              Choose who can vote. Public voting is the default submission-safe option.
            </p>
            <fieldset className="mode-picker">
              <legend>Eligibility mode</legend>
              <label><input type="radio" name="mode" checked={form.mode === "PUBLIC"} onChange={() => { set("mode", "PUBLIC"); setError(""); }} /> Public voting — anyone with a connected wallet can vote</label>
              <label><input type="radio" name="mode" checked={form.mode === "POAP_EVENT"} onChange={() => { set("mode", "POAP_EVENT"); setError(""); }} /> POAP eligibility — Experimental — external verification may be unavailable.</label>
            </fieldset>
            {form.mode === "POAP_EVENT" && <CredentialPicker form={form} onChange={(patch) => { setForm((f) => ({ ...f, ...patch })); setError(""); }} />}
          </>
        )}
        {step === 4 && (
          <>
            <p>Check the details before creating your proposal on {voxenConfig.networkName}.</p>
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
                {form.mode === "PUBLIC" ? "Public voting — anyone with a connected wallet can vote" : "Experimental POAP eligibility — external verification may be unavailable."}
              </dd>
              {form.mode === "POAP_EVENT" && (
                <>
                  <dt>Credential details</dt>
                  <dd>
                    <details>
                      <summary>Technical details</summary>
                      <p className="wrap">
                        Portal record: {form.poapMetadata}
                        <br />
                        Legacy POAP event ID: {form.poapEventId}
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
              Ordinary proposals publish immediately. Community Guard proposals
              enter Review and require a current COMPLIANT Governance Review before publication.
            </div>
            {!wallet.isConnected ? (
              <p role="status">Connect your wallet to create this proposal.</p>
            ) : !wallet.isOnCorrectNetwork ? (
              <p role="status">
                Switch to {voxenConfig.networkName} to create this proposal.
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
            }}
          >
            Start another proposal
          </button>
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
