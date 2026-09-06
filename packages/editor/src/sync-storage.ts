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
}

export class SyncStorage extends Dexie {
  documents!: Table<LocalDocument, string>;
  updates!: Table<QueuedUpdate, number>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ documents: "&resourceId,&documentKey", updates: "++sequence,&updateId,documentKey" });
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
}
