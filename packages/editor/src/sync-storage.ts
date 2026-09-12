import { Dexie, type Table } from "dexie";
import * as Y from "yjs";

export interface LocalDocument {
  resourceId: string;
  documentKey: string;
  snapshot: Uint8Array;
}

export interface QueuedUpdate {
  updateId: string;
  documentKey: string;
  payload: Uint8Array;
  grantId?: string;
  permissionEpoch?: number;
  writeEpoch?: number;
  authoredText?: string;
}

export interface RejectedWriterDraft {
  updateId: string;
  resourceId: string;
  documentKey: string;
  grantId: string;
  permissionEpoch: number;
  writeEpoch: number;
  authoredText: string;
  reason: "write-revoked" | "read-revoked" | "epoch-stale";
  rejectedAt: string;
}

interface SyncMetadata {
  key: string;
  value: number;
}

export class SyncStorage extends Dexie {
  documents!: Table<LocalDocument, string>;
  updates!: Table<QueuedUpdate, number>;
  metadata!: Table<SyncMetadata, string>;
  rejected!: Table<RejectedWriterDraft, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ documents: "&resourceId,&documentKey", updates: "++sequence,&updateId,documentKey" });
    this.version(2).stores({ documents: "&resourceId,&documentKey", updates: "++sequence,&updateId,documentKey", metadata: "&key" });
    this.version(3).stores({ documents: "&resourceId,&documentKey", updates: "++sequence,&updateId,documentKey,[documentKey+grantId+permissionEpoch+writeEpoch]",
      metadata: "&key", rejected: "&updateId,resourceId,documentKey,[grantId+permissionEpoch+writeEpoch],rejectedAt" });
  }

  async markCurrentSchema(): Promise<void> {
    await this.metadata.put({ key: "schema", value: 3 });
  }

  // A tab must never replace another tab's newer snapshot or persist a draft
  // without the update that will eventually receive its durable server ACK.
  async persist(document: LocalDocument, update?: QueuedUpdate): Promise<void> {
    await this.transaction("rw", this.documents, this.updates, async () => {
      const current = await this.documents.get(document.resourceId);
      if (current && current.documentKey !== document.documentKey) throw new Error("SYNC_DOCUMENT_CHANGED");
      const snapshot = current ? Y.mergeUpdates([current.snapshot, document.snapshot]) : document.snapshot;
      await this.documents.put({ ...document, snapshot });
      if (update) await this.updates.put(update);
    });
  }

  async rejectWriterEpoch(resourceId: string, documentKey: string, capability: {
    grantId: string; permissionEpoch: number; writeEpoch: number;
  }, reason: RejectedWriterDraft["reason"], now = new Date()): Promise<number> {
    return this.transaction("rw", this.documents, this.updates, this.rejected, async () => {
      const pending = await this.updates.where("documentKey").equals(documentKey).toArray();
      const rejected = pending.filter((item) => item.grantId === capability.grantId
        && item.permissionEpoch === capability.permissionEpoch && item.writeEpoch === capability.writeEpoch);
      for (const item of rejected) {
        await this.rejected.put({ updateId: item.updateId, resourceId, documentKey,
          grantId: capability.grantId, permissionEpoch: capability.permissionEpoch, writeEpoch: capability.writeEpoch,
          authoredText: item.authoredText ?? "", reason, rejectedAt: now.toISOString() });
        await this.updates.where("updateId").equals(item.updateId).delete();
      }
      // Once read access is gone, the cached server projection must not remain
      // reachable through recovery. Rejected rows retain only text authored by
      // this actor, never the merged private snapshot or CRDT payload.
      if (reason === "read-revoked") await this.documents.delete(resourceId);
      return rejected.length;
    });
  }
}
