import { afterEach, describe, expect, it, vi } from "vitest";

const { runChildProcess } = vi.hoisted(() => ({
  runChildProcess: vi.fn(),
}));

vi.mock("@paperclipai/adapter-utils/server-utils", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/server-utils")>(
    "@paperclipai/adapter-utils/server-utils",
  );
  return { ...actual, runChildProcess };
});

import { execute } from "./execute.js";

function context(config: Record<string, unknown> = {}) {
  return {
    runId: "run-1",
    agent: {
      id: "agent-1",
      companyId: "company-1",
      name: "Hermes Engineer",
      adapterType: "hermes_local",
      adapterConfig: {},
    },
    runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
    config: { cwd: process.cwd(), model: "fixture-model", provider: "auto", ...config },
    context: { issueId: "issue-1", taskTitle: "Verify a Hermes run" },
    onLog: async () => {},
  } as any;
}

describe("Hermes execution output", () => {
  afterEach(() => vi.resetAllMocks());

  it("uses Hermes quiet mode by default and preserves the final completion", async () => {
    runChildProcess.mockResolvedValueOnce({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: "[done] ┊ 💻 $ git status --short  0.1s (0.5s)\nThe requested verification is complete.\nsession_id: session-1\n",
      stderr: "",
    });

    const result = await execute(context());
    const args = runChildProcess.mock.calls[0]?.[2] as string[];

    expect(args).toContain("-Q");
    expect(result.errorMessage).toBeUndefined();
    expect(result.summary).toBe("The requested verification is complete.");
  });

  it("fails a prompt echo instead of publishing it as a successful completion", async () => {
    runChildProcess.mockImplementationOnce(async (_runId: string, _command: string, args: string[]) => ({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: `Query: ${args[2]}`,
      stderr: "",
    }));

    const result = await execute(context({ quiet: false }));

    expect(result.errorCode).toBe("prompt_echo");
    expect(result.errorMessage).toContain("submitted prompt");
    expect(result.summary).toBeUndefined();
    expect(result.resultJson).toMatchObject({ result: "", prompt_echo: true });
  });

  it("fails a benign completion when Hermes used no tools", async () => {
    runChildProcess.mockResolvedValueOnce({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: "Everything looks healthy.\nsession_id: session-1\n",
      stderr: "",
    });

    const result = await execute(context());

    expect(result.errorCode).toBe("no_tool_use");
    expect(result.errorMessage).toContain("without executing any tools");
    expect(result.summary).toBeUndefined();
    expect(result.resultJson).toMatchObject({ result: "", no_tool_use: true });
  });
});
