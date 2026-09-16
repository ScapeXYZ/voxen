import { describe, expect, it, vi } from "vitest";
import { createDiscoveryService, isServerBusyError, retryAfterSeconds, retryServerBusy } from "./discovery";

const busy = (retry_after_seconds = 0) => Object.assign(new Error("Server busy"), { code: -32006, data: { retry_after_seconds } });

describe("proposal discovery resilience", () => {
  it("retries a server-busy RPC response then succeeds", async () => {
    const operation = vi.fn().mockRejectedValueOnce(busy(2)).mockResolvedValueOnce("ok");
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(retryServerBusy(operation, sleep)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("stops after five busy attempts", async () => {
    const operation = vi.fn().mockRejectedValue(busy(0));
    await expect(retryServerBusy(operation, vi.fn().mockResolvedValue(undefined))).rejects.toThrow("Server busy");
    expect(operation).toHaveBeenCalledTimes(5);
  });

  it("retries the nested _JsonRpcVersionUnsupportedError server-busy response", async () => {
    const cause = Object.assign(new Error("Server busy: all 8 execution slots occupied, retry later"), {
      code: -32006,
      data: { retry_after_seconds: 2 },
    });
    const error = Object.assign(new Error("JSON-RPC version is unsupported", { cause }), {
      name: "_JsonRpcVersionUnsupportedError",
      shortMessage: "JSON-RPC version is unsupported",
    });
    const operation = vi.fn().mockRejectedValue(error);
    const sleep = vi.fn().mockResolvedValue(undefined);

    expect(isServerBusyError(error)).toBe(true);
    expect(retryAfterSeconds(error)).toBe(2);
    await expect(retryServerBusy(operation, sleep)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(5);
    expect(sleep).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenNthCalledWith(1, 2_000);
  });

  it("coalesces concurrent discovery requests for the same page", async () => {
    let resolve!: (value: string) => void;
    const load = vi.fn(() => new Promise<string>((done) => { resolve = done; }));
    const discover = createDiscoveryService(load);
    const first = discover(0, 20);
    const second = discover(0, 20);
    expect(load).toHaveBeenCalledTimes(1);
    resolve("proposal page");
    await expect(Promise.all([first, second])).resolves.toEqual(["proposal page", "proposal page"]);
  });

  it("does not retry permanent errors", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Invalid contract response"));
    await expect(retryServerBusy(operation, vi.fn())).rejects.toThrow("Invalid contract response");
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
