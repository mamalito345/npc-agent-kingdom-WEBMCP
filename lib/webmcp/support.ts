export function isWebMCPAvailable(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return typeof document.modelContext?.registerTool === "function";
}