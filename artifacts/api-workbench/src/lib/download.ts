/** Hand the browser a file to save. The fallback for everything below. */
export function downloadText(filename: string, text: string, type = 'text/plain'): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Hand the browser a JSON file to save. Shared by every export in the app. */
export function downloadJson(filename: string, payload: unknown): void {
  downloadText(filename, JSON.stringify(payload, null, 2), 'application/json');
}
