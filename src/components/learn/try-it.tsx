"use client";

import * as React from "react";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/code/code-editor";
import { OutputPane } from "@/components/code/output-pane";
import { CRunner } from "@/lib/c-runner/client";
import type { RunResult } from "@/lib/c-runner/engine";
import { DEFAULT_ENGINE, type EngineName } from "@/lib/c-runner/registry";

/**
 * 讲义里可点即跑的代码块。
 * 与练习场的区别：这里代码是"读"的，所以默认折叠编辑器、按钮更小、输出更紧凑。
 *
 * 用法（MDX）：
 *   <TryIt title="试试改一下" stdin="21">
 *   {`#include <stdio.h>\nint main(void){ ... }`}
 *   </TryIt>
 */
export function TryIt({
  children,
  title = "动手跑一下",
  stdin,
  engine = DEFAULT_ENGINE,
  editable = true,
}: {
  children?: React.ReactNode;
  title?: string;
  stdin?: string;
  engine?: EngineName;
  editable?: boolean;
}) {
  const initial = React.useMemo(() => {
    // MDX 里写 {`...`} 时 children 是字符串；写成多段时可能是数组，一并兼容
    const raw = Array.isArray(children) ? children.join("") : children;
    return typeof raw === "string" ? raw.replace(/^\n/, "").replace(/\n$/, "\n") : "";
  }, [children]);
  const [code, setCode] = React.useState(initial);
  const [input, setInput] = React.useState(stdin ?? "");
  const [showInput, setShowInput] = React.useState(Boolean(stdin));
  const [result, setResult] = React.useState<RunResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [phase, setPhase] = React.useState<"idle" | "preparing" | "running">("idle");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const runnerRef = React.useRef<CRunner | null>(null);

  React.useEffect(() => () => runnerRef.current?.dispose(), []);

  async function run() {
    const runner = (runnerRef.current ??= new CRunner());
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      if (!runner.isReady(engine)) {
        setPhase("preparing");
        await runner.prepare(engine, setProgress);
      }
      setPhase("running");
      setResult(await runner.run(engine, code, { stdin: input, timeoutMs: 5000 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPhase("idle");
      setBusy(false);
    }
  }

  return (
    <section className="my-5 overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="ml-auto flex items-center gap-2">
          {stdin !== undefined && (
            <button
              type="button"
              onClick={() => setShowInput((v) => !v)}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {showInput ? "隐藏输入" : "填程序输入"}
            </button>
          )}
          <Button size="sm" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {phase === "preparing" ? `准备编译器 ${Math.round(progress * 100)}%` : "运行"}
          </Button>
        </div>
      </header>

      {showInput && (
        <div className="border-b border-border px-3 py-2">
          <label className="text-xs text-muted-foreground" htmlFor={`tryit-stdin-${title}`}>
            程序的标准输入（scanf 读的就是这里）
          </label>
          <textarea
            id={`tryit-stdin-${title}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            spellCheck={false}
            className="mt-1 w-full resize-y rounded-lg border border-border bg-code-bg px-2.5 py-1.5 font-mono text-[13px] outline-none"
          />
        </div>
      )}

      <div className="p-3">
        <CodeEditor
          value={code}
          onChange={editable ? setCode : () => {}}
          readOnly={!editable}
          minRows={4}
        />
      </div>

      {(result || error) && (
        <div className="px-3 pb-3">
          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              {error}
            </div>
          ) : (
            <OutputPane result={result} />
          )}
        </div>
      )}
    </section>
  );
}
