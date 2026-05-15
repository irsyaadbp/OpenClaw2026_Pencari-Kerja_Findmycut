export function generateExportFilename(styleName: string): string {
  const slug = styleName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  return `findmycut-${slug}.png`;
}
