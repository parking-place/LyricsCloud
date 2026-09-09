export interface BuildMetadata {
  readonly version: string;
  readonly channel: "dev" | "release";
  readonly phase: string | null;
}

export function formatBuildLabel(metadata: BuildMetadata): string {
  if (metadata.channel === "release") return `v${metadata.version} Release`;
  return `v${metadata.version}${metadata.phase ? `-${metadata.phase}` : ""} dev`;
}
