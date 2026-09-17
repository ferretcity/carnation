import JSZip from "jszip";
import type { Handbook } from "./types";
import { pageToMarkdownFile } from "./frontmatter";
import { slugify } from "./id";

export async function exportHandbookAsZip(handbook: Handbook): Promise<Blob> {
  const zip = new JSZip();
  for (const section of handbook.sections) {
    const folder = zip.folder(section.slug);
    for (const p of section.pages) {
      folder?.file(`${p.slug}.md`, pageToMarkdownFile(p));
    }
  }
  return zip.generateAsync({ type: "blob" });
}

export async function downloadHandbookAsZip(handbook: Handbook): Promise<void> {
  const blob = await exportHandbookAsZip(handbook);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(handbook.orgName)}-handbook.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
