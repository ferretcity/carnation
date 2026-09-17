import { useEffect } from "react";
import { useHandbookStore } from "./store";
import { Sidebar } from "./components/Sidebar";
import { PageEditor } from "./components/PageEditor";
import { Toolbar } from "./components/Toolbar";
import { TraceabilityMap } from "./components/TraceabilityMap";
import { StartScreen } from "./components/StartScreen";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ViewMode } from "./store";

function App() {
  const ready = useHandbookStore((s) => s.ready);
  const handbook = useHandbookStore((s) => s.handbook);
  const init = useHandbookStore((s) => s.init);
  const view = useHandbookStore((s) => s.view);
  const setView = useHandbookStore((s) => s.setView);

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return <div className="flex min-h-svh items-center justify-center text-muted-foreground">Loading handbook…</div>;
  }

  if (!handbook) {
    return <StartScreen />;
  }

  return (
    <div className="grid min-h-svh grid-cols-[280px_1fr]">
      <Sidebar />
      <main className="flex min-w-0 flex-col">
        <Toolbar />
        <div className="px-5 pt-3">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {view === "editor" ? <PageEditor /> : <TraceabilityMap />}
      </main>
    </div>
  );
}

export default App;
