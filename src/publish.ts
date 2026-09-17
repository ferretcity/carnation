import { marked } from "marked";
import type { Handbook, OrgNode, Page } from "./types";
import { slugify } from "./id";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function anchorId(page: Page): string {
  return `page-${page.id}`;
}

function renderServesLine(page: Page, allPages: Page[]): string {
  if (!page.servesPageId) return "";
  const target = allPages.find((p) => p.id === page.servesPageId);
  if (!target) return "";
  return `<p class="serves">Serves: <a href="#${anchorId(target)}">${escapeHtml(target.title)}</a></p>`;
}

function renderActivityMeta(page: Page, orgChart: OrgNode[]): string {
  const lines: string[] = [];
  if (page.schedule) {
    lines.push(`<p class="meta-line">Schedule: ${escapeHtml(page.schedule)}</p>`);
  }
  const runBy = (page.linkedOrgNodeIds ?? [])
    .map((id) => orgChart.find((n) => n.id === id)?.title)
    .filter((title): title is string => Boolean(title));
  if (runBy.length > 0) {
    lines.push(`<p class="meta-line">Run by: ${runBy.map(escapeHtml).join(", ")}</p>`);
  }
  return lines.join("\n");
}

function renderProseBody(page: Page): string {
  return `<div class="prose">${marked.parse(page.body || "", { async: false }) as string}</div>`;
}

function renderStepBody(page: Page): string {
  const steps = page.steps ?? [];
  const items = steps
    .map((step) => {
      if (step.type === "decision") {
        return `
          <li class="step decision">
            <div class="step-text">${escapeHtml(step.text)}</div>
            <div class="branches">
              <div>↳ Yes — ${escapeHtml(step.yes ?? "")}</div>
              <div>↳ No — ${escapeHtml(step.no ?? "")}</div>
            </div>
          </li>`;
      }
      return `<li class="step"><div class="step-text">${escapeHtml(step.text)}</div></li>`;
    })
    .join("\n");
  return `<ol class="steps">${items}</ol>`;
}

function renderOrgTree(nodes: OrgNode[]): string {
  // The top level can hold several independent roles/groups, not just one
  // root — a flat org with multiple peer groups is a valid shape.
  const topLevel = nodes.filter((n) => n.parentId === null);
  if (topLevel.length === 0) return "";

  function renderNode(node: OrgNode): string {
    const children = nodes.filter((n) => n.parentId === node.id);
    const childrenHtml = children.length
      ? `<div class="org-children">${children.map(renderNode).join("")}</div>`
      : "";
    return `
      <div class="org-node">
        <div class="org-box ${node.kind === "group" ? "group" : ""}">
          ${node.kind === "group" ? '<div class="org-badge">Group</div>' : ""}
          <div class="org-title">${escapeHtml(node.title)}</div>
          <div class="org-desc">${escapeHtml(node.description)}</div>
        </div>
        ${childrenHtml}
      </div>
    `;
  }

  return `<div class="org-tree">${topLevel.map(renderNode).join("")}</div>`;
}

const STYLES = `
  :root {
    --bg: #faf8f5; --card: #ffffff; --fg: #241f21; --muted: #7a7377;
    --border: #e3ddd5; --primary: #d4356a; --accent: #fbeaf0;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1c1719; --card: #241f21; --fg: #ece7e8; --muted: #a89ea1;
      --border: #3a3236; --primary: #ea6c99; --accent: #3a2530;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.6 system-ui, "Segoe UI", Roboto, sans-serif; }
  .layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }
  nav { border-right: 1px solid var(--border); padding: 24px; position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto; }
  .brand { display: flex; align-items: center; gap: 6px; color: var(--primary); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  nav h1 { font-size: 19px; margin: 0 0 20px; }
  nav h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin: 20px 0 6px; }
  nav ul { list-style: none; margin: 0; padding: 0; }
  nav a { display: block; padding: 4px 0; color: var(--fg); text-decoration: none; font-size: 14px; }
  nav a:hover { color: var(--primary); }
  main { padding: 40px 48px; max-width: 760px; min-width: 0; overflow-x: auto; }
  section.pillar-section { margin-bottom: 56px; }
  section.pillar-section > h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); border-bottom: 1px solid var(--border); padding-bottom: 8px; }
  article { margin: 32px 0 48px; scroll-margin-top: 24px; }
  article h3 { font-family: Georgia, "Iowan Old Style", serif; font-size: 26px; font-weight: 400; margin: 0 0 4px; }
  .meta { font-size: 12px; color: var(--muted); margin-bottom: 12px; }
  .meta-line { font-size: 13px; color: var(--muted); margin: 0 0 4px; }
  .serves { font-size: 13px; color: var(--muted); }
  .serves a { color: var(--primary); }
  .prose { font-family: Georgia, "Iowan Old Style", serif; font-size: 17px; line-height: 1.7; }
  .prose blockquote { margin: 16px 0; padding-left: 16px; border-left: 3px solid var(--border); font-style: italic; color: var(--muted); }
  .steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .step { border: 1px solid var(--border); background: var(--card); border-radius: 8px; padding: 10px 14px; }
  .step.decision { border-color: #cf9a5c; }
  .step-text { font-size: 15px; }
  .branches { margin-top: 6px; font-size: 13px; color: var(--muted); display: flex; flex-direction: column; gap: 2px; }
  .org-tree { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; overflow-x: auto; }
  .org-node { display: flex; flex-direction: column; align-items: center; }
  .org-children { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; padding: 24px 0 0; margin: 0; }
  .org-box { border: 1px solid var(--border); background: var(--card); border-radius: 10px; padding: 8px 14px; text-align: center; min-width: 150px; }
  .org-box.group { border-style: dashed; }
  .org-badge { font-size: 9px; letter-spacing: 0.06em; color: #cf9a5c; }
  .org-title { font-size: 13px; font-weight: 600; }
  .org-desc { font-size: 11px; color: var(--muted); margin-top: 2px; }
  footer { padding: 24px 48px 48px; font-size: 12px; color: var(--muted); }
`;

export function buildPublishedHtml(handbook: Handbook): string {
  const allPages = handbook.sections.flatMap((s) => s.pages);

  const navSections = handbook.sections
    .map((section) => {
      if (section.id === "organization") {
        return `<h2>${escapeHtml(section.title)}</h2><ul><li><a href="#organization-chart">Organization Chart</a></li></ul>`;
      }
      const links = section.pages.map((p) => `<li><a href="#${anchorId(p)}">${escapeHtml(p.title)}</a></li>`).join("");
      return `<h2>${escapeHtml(section.title)}</h2><ul>${links}</ul>`;
    })
    .join("\n");

  const mainSections = handbook.sections
    .map((section) => {
      if (section.id === "organization") {
        return `
          <section class="pillar-section" id="organization-chart">
            <h2>${escapeHtml(section.title)}</h2>
            ${renderOrgTree(handbook.orgChart)}
          </section>`;
      }
      const articles = section.pages
        .map((p) => {
          const body = p.kind === "procedure" || p.kind === "activity" ? renderStepBody(p) : renderProseBody(p);
          return `
            <article id="${anchorId(p)}">
              <h3>${escapeHtml(p.title)}</h3>
              ${renderActivityMeta(p, handbook.orgChart)}
              ${renderServesLine(p, allPages)}
              ${body}
            </article>`;
        })
        .join("\n");
      return `<section class="pillar-section"><h2>${escapeHtml(section.title)}</h2>${articles}</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(handbook.orgName)} Handbook</title>
<style>${STYLES}</style>
</head>
<body>
  <div class="layout">
    <nav>
      <div class="brand">Carnation</div>
      <h1>${escapeHtml(handbook.orgName)}</h1>
      ${navSections}
    </nav>
    <main>
      ${mainSections}
    </main>
  </div>
  <footer>Published from Carnation on ${new Date().toLocaleDateString()} — view only.</footer>
</body>
</html>`;
}

export function downloadPublishedHandbook(handbook: Handbook): void {
  const html = buildPublishedHtml(handbook);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(handbook.orgName)}-handbook.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
