interface PreviewForFormat {
  style: string;
  sides: string;
  top: string;
  finish: string;
}

export function formatInstructions(preview: PreviewForFormat): string {
  return `Style: ${preview.style}\nSides: ${preview.sides}\nTop: ${preview.top}\nFinish: ${preview.finish}`;
}
