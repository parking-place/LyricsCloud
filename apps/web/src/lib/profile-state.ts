export interface ProfileView {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly rowVersion: number;
  readonly displayNameSource: "legacy_unclassified" | "provider" | "override";
  readonly avatarSource: "legacy_unclassified" | "provider" | "override";
}

export const PROFILE_UPDATED_EVENT = "lc:profile-updated";
export function profileChannelName(userId: string): string { return `lc:${userId}:profile`; }

export function notifyProfileSaved(profile: ProfileView): void {
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: profile }));
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(profileChannelName(profile.userId));
  channel.postMessage({ userId: profile.userId });
  channel.close();
}
