"use client";
import { useRef, useState } from "react";
import { useCredentialSearch } from "@/hooks/useCredentialSearch";
import {
  credentialFields,
  credentialProblem,
} from "@/lib/voxen/credentials/provider";
import type { ProposalForm } from "@/lib/voxen/create-proposal";

export function CredentialPicker({
  form,
  onChange,
}: {
  form: ProposalForm;
  onChange: (patch: Partial<ProposalForm>) => void;
}) {
  const [query, setQuery] = useState("");
  const search = useCredentialSearch(query);
  const input = useRef<HTMLInputElement>(null);
  const custom = useRef<HTMLDetailsElement>(null);
  const selected = !!form.contract && !!form.label;
  const set = (key: keyof ProposalForm, value: string) =>
    onChange({
      [key]: value,
      credentialMetadata: "",
      ...(key === "standard" ? { token: "" } : {}),
    });
  return (
    <div className="credential-picker">
      <label>
        Search credential...
        <input
          ref={input}
          type="search"
          placeholder="Search credential..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <p className="small muted">
        Browse the configured Voxen catalog. Live POAP discovery is not
        connected.
      </p>
      <div role="status" className="small">
        {search.loading
          ? "Searching credentials..."
          : search.error ||
            `${search.results.length} credential${search.results.length === 1 ? "" : "s"} found`}
      </div>
      {search.error && (
        <button type="button" className="button" onClick={search.retry}>
          Retry search
        </button>
      )}
      {!search.loading && !search.error && !search.results.length && (
        <p>
          No matching credentials. Try another name or use a custom credential.
        </p>
      )}
      <ul className="credential-results" aria-label="Available credentials">
        {search.results.map((c) => {
          const problem = credentialProblem(c);
          const active = form.credentialMetadata === JSON.stringify(c);
          return (
            <li key={c.id}>
              <button
                type="button"
                className="credential-result"
                disabled={!!problem}
                aria-pressed={active}
                onClick={() => {
                  onChange(credentialFields(c));
                  if (custom.current) custom.current.open = false;
                }}
              >
                <strong>{c.name}</strong>
                {c.issuer && <span>{c.issuer}</span>}
                {c.startDate && (
                  <span>
                    {c.startDate}
                    {c.endDate && c.endDate !== c.startDate
                      ? ` – ${c.endDate}`
                      : ""}
                  </span>
                )}
                {c.issuedCount != null && (
                  <span>{c.issuedCount.toLocaleString()} issued</span>
                )}
                {c.description && (
                  <span className="small">{c.description}</span>
                )}
                {active && <span>Selected</span>}
              </button>
              {problem && <p className="small">Unavailable: {problem}</p>}
            </li>
          );
        })}
      </ul>
      {selected && (
        <section
          className="credential-selection"
          aria-label="Voting requirement"
        >
          <h3>Voting requirement</h3>
          <strong className="wrap">{form.label}</strong>
          <p>Hold this credential to participate.</p>
          <p className="small muted">
            Voxen will verify ownership from the connected wallet when voting.
          </p>
          <div className="row start">
            <button
              type="button"
              className="button"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
            >
              Change credential
            </button>
            <button
              type="button"
              className="button"
              onClick={() =>
                onChange({
                  contract: "",
                  label: "",
                  token: "",
                  credentialMetadata: "",
                })
              }
            >
              Clear selection
            </button>
          </div>
          <details>
            <summary>Technical details</summary>
            <dl className="wrap">
              <dt>Chain</dt>
              <dd>{form.chain}</dd>
              <dt>Contract</dt>
              <dd>{form.contract}</dd>
              <dt>Credential type</dt>
              <dd>{form.standard}</dd>
              {form.standard === "ERC1155" && (
                <>
                  <dt>Token ID</dt>
                  <dd>{form.token}</dd>
                </>
              )}
            </dl>
          </details>
        </section>
      )}
      <details ref={custom} className="credential-custom">
        <summary>Use custom credential</summary>
        <p className="small muted">
          Enter canonical ownership settings supplied by the issuer. Only
          Bradbury (4221) ERC721 collections and ERC1155 tokens are supported.
          Names and POAP event numbers cannot verify ownership.
        </p>
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
            pattern="0x[0-9a-fA-F]{40}"
            title="Enter the collection’s 42-character address beginning with 0x."
            value={form.contract}
            onChange={(e) => set("contract", e.target.value)}
            placeholder="0x…"
          />
        </label>
        <label>
          Friendly label
          <input
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            placeholder="Community membership"
          />
        </label>
        {form.standard === "ERC1155" && (
          <label>
            Token ID
            <span className="small muted">
              Only required when the credential uses a specific ERC1155 token.
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
        </p>{" "}
      </details>
    </div>
  );
}
