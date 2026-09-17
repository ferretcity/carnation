import { useState } from "react";
import { ArrowDown, ArrowUp, Info, Plus, X } from "lucide-react";
import { useHandbookStore } from "../store";
import type { Page, Step } from "../types";
import { makeId } from "../id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PageDetailsPanel } from "./PageDetailsPanel";

export function StepListEditor({ page }: { page: Page }) {
  const updatePage = useHandbookStore((s) => s.updatePage);
  const [showDetails, setShowDetails] = useState(false);
  const steps = page.steps ?? [];

  function setSteps(next: Step[]) {
    updatePage(page.id, { steps: next });
  }

  function update(index: number, patch: Partial<Step>) {
    setSteps(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
  }

  function remove(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function add(type: Step["type"]) {
    const newStep: Step =
      type === "decision"
        ? { id: makeId(), type, text: "New decision", yes: "Then…", no: "Otherwise…" }
        : { id: makeId(), type, text: "New step" };
    setSteps([...steps, newStep]);
  }

  return (
    <div className="max-w-[1000px] px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <input
          className="w-full border-none bg-transparent text-3xl font-semibold text-foreground outline-none"
          value={page.title}
          onChange={(e) => updatePage(page.id, { title: e.target.value })}
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 rounded-full"
          aria-label="Toggle page details"
          onClick={() => setShowDetails((v) => !v)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {showDetails && <PageDetailsPanel page={page} />}

      <div className="mt-4 flex gap-7">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Write it as steps
          </div>
          <div className="flex flex-col gap-2.5">
            {steps.map((step, i) => (
              <div key={step.id} className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      step.type === "decision" ? "text-amber-600 dark:text-amber-400" : "text-primary",
                    )}
                  >
                    {step.type}
                  </span>
                  <span className="flex gap-0.5">
                    <button
                      aria-label="Move up"
                      disabled={i === 0}
                      className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      aria-label="Move down"
                      disabled={i === steps.length - 1}
                      className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      aria-label="Remove step"
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(i)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <Input value={step.text} onChange={(e) => update(i, { text: e.target.value })} aria-label="Step text" />
                {step.type === "decision" && (
                  <>
                    <Input
                      value={step.yes ?? ""}
                      placeholder="If yes…"
                      onChange={(e) => update(i, { yes: e.target.value })}
                      aria-label="Yes branch"
                    />
                    <Input
                      value={step.no ?? ""}
                      placeholder="If no…"
                      onChange={(e) => update(i, { no: e.target.value })}
                      aria-label="No branch"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => add("step")}>
              <Plus className="h-3.5 w-3.5" /> Step
            </Button>
            <Button variant="outline" size="sm" onClick={() => add("decision")}>
              <Plus className="h-3.5 w-3.5" /> Decision
            </Button>
          </div>
        </div>

        <div className="min-w-0 flex-1 border-l border-border pl-7">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Read it as a flowchart
          </div>
          <div className="flex flex-col items-center">
            {steps.map((step, i) => (
              <div key={step.id} className="flex w-full flex-col items-center">
                {step.type === "decision" ? (
                  <>
                    <div
                      className="flex h-24 w-[190px] items-center justify-center border border-amber-400 bg-card p-6 text-center text-xs"
                      style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                    >
                      <span>{step.text}</span>
                    </div>
                    <div className="mt-1.5 flex flex-col gap-0.5 text-left text-xs text-foreground/80">
                      <div>↳ Yes — {step.yes}</div>
                      <div>↳ No — {step.no}</div>
                    </div>
                  </>
                ) : (
                  <div className="max-w-[260px] rounded-lg border border-border bg-card px-4 py-2.5 text-center text-sm">
                    <span>{step.text}</span>
                  </div>
                )}
                {i !== steps.length - 1 && <div className="my-1 text-base leading-none text-border">↓</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
