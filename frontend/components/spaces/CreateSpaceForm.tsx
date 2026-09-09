"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
export function CreateSpaceForm() {
  const wallet = useWallet();
  const [form, setForm] = useState({
    name: "",
    description: "",
    owner: "",
    constitution: "",
    permission: "OWNER_ADMINS",
    guard: true,
    policy: "BLOCK",
  });
  const [message, setMessage] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    try {
      setHasDraft(!!localStorage.getItem("voxen:space-draft"));
    } catch {}
  }, []);
  function restoreDraft() {
    try {
      const draft = JSON.parse(
        localStorage.getItem("voxen:space-draft") || "null",
      );
      if (!draft || typeof draft.name !== "string")
        throw new Error("Invalid draft");
      setForm((current) => ({ ...current, ...draft }));
      setHasDraft(false);
      setMessage("Saved draft restored. Review the fields before saving.");
    } catch {
      setError(
        "We couldn't open this saved draft. You can start a new one below.",
      );
    }
  }
  const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage("");
  };
  const delegated =
    form.owner && form.owner.toLowerCase() !== wallet.address?.toLowerCase();
  return (
    <form
      className="panel creation-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (
          !form.name.trim() ||
          !form.description.trim() ||
          !form.constitution.trim() ||
          !/^0x[0-9a-fA-F]{40}$/.test(form.owner) ||
          /^0x0{40}$/.test(form.owner)
        ) {
          setError(
            "Add a name, description, constitution, and valid non-zero intended owner wallet.",
          );
          return;
        }
        try {
          localStorage.setItem(
            "voxen:space-draft",
            JSON.stringify({
              ...form,
              source: "local-draft",
              active: false,
              pendingOwner: form.owner,
            }),
          );
          setMessage(
            "Space draft saved in this browser. No Space was deployed or activated.",
          );
        } catch {
          setError(
            "Local storage is unavailable. Your draft remains in this form.",
          );
        }
      }}
    >
      <span className="eyebrow">A FOUNDATION FOR YOUR COMMUNITY</span>
      <h2>Define your Space.</h2>
      {hasDraft && (
        <div className="demo-notice">
          You have a saved Space draft.{" "}
          <button type="button" className="text-link" onClick={restoreDraft}>
            Resume saved draft
          </button>
          <p className="small">
            Saving a new draft replaces the previous one in this browser.
          </p>
        </div>
      )}
      <p>Create a governance home for your community.</p>
      <label>
        Space name
        <input
          required
          maxLength={80}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Your community’s name"
        />
      </label>
      <label>
        Description
        <textarea
          required
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>
      <label>
        Intended owner wallet
        <input
          required
          pattern="0x[0-9a-fA-F]{40}"
          title="Enter a 42-character wallet address beginning with 0x."
          value={form.owner}
          onChange={(e) => set("owner", e.target.value)}
          placeholder="0x…"
        />
      </label>
      {wallet.address && (
        <button
          className="text-link"
          type="button"
          onClick={() => set("owner", wallet.address!)}
        >
          Use connected wallet
        </button>
      )}
      <div className="demo-notice">
        {delegated
          ? "Preparing a Space for another wallet? "
          : "Ownership is explicit. "}
        This wallet must accept ownership before the Space becomes active. A
        local draft grants no ownership.
      </div>
      <label>
        Constitution / rules
        <span className="small muted">
          Write the rules Governance Guard should use when reviewing proposals.
        </span>
        <textarea
          required
          rows={6}
          value={form.constitution}
          onChange={(e) => set("constitution", e.target.value)}
          placeholder="What principles should guide decisions here?"
        />
      </label>
      <label>
        Proposal creation permission
        <select
          value={form.permission}
          onChange={(e) => set("permission", e.target.value)}
        >
          <option value="OWNER_ADMINS">Owner and admins</option>
          <option value="OPEN">Open proposal creation</option>
        </select>
      </label>
      <p className="small muted">
        {form.permission === "OPEN"
          ? "Anyone in the Space can create proposals. Voting is still eligibility-gated."
          : "Only the owner and admins can create proposals."}
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={form.guard}
          onChange={(e) => set("guard", e.target.checked)}
        />
        Enable Governance Guard
      </label>
      <label>
        Non-compliant proposal policy
        <select
          disabled={!form.guard}
          value={form.policy}
          onChange={(e) => set("policy", e.target.value)}
        >
          <option value="BLOCK">Block non-compliant proposals</option>
          <option value="WARN">Warn on non-compliant proposals</option>
        </select>
      </label>
      <p className="small muted">
        {form.guard
          ? form.policy === "BLOCK"
            ? "Non-compliant proposals cannot open until corrected."
            : "Non-compliant proposals may continue with a visible warning."
          : "Proposals will not receive a Governance Guard review."}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button" disabled>
          Create on-chain · pending
        </button>
        <button type="submit" className="button primary">
          Save local Space draft ↗
        </button>
      </div>
    </form>
  );
}
