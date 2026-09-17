import { useHandbookStore } from "../store";
import { ORG_CHART_ID } from "../types";
import { OrgChartEditor } from "./OrgChartEditor";
import { ProseEditor } from "./ProseEditor";
import { StepListEditor } from "./StepListEditor";

export function PageEditor() {
  const handbook = useHandbookStore((s) => s.handbook);
  const selectedPageId = useHandbookStore((s) => s.selectedPageId);

  if (!handbook || !selectedPageId) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center text-muted-foreground">
        Select or add a page to start editing.
      </div>
    );
  }

  if (selectedPageId === ORG_CHART_ID) {
    return <OrgChartEditor />;
  }

  const page = handbook.sections.flatMap((s) => s.pages).find((p) => p.id === selectedPageId);
  if (!page) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center text-muted-foreground">
        This page no longer exists.
      </div>
    );
  }

  return page.kind === "procedure" || page.kind === "activity" ? (
    <StepListEditor page={page} />
  ) : (
    <ProseEditor page={page} />
  );
}
