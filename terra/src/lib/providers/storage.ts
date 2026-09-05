/**
 * Document storage interface. The MVP records metadata only; a data-room
 * provider can be attached without touching calling code.
 */

export interface StoredDocument {
  key: string;
  url: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
}

export interface StorageProvider {
  readonly name: string;
  put(key: string, body: Uint8Array, mimeType: string): Promise<StoredDocument>;
  signedUrl(key: string, expiresInSeconds?: number): Promise<string | null>;
}

class MetadataOnlyStorage implements StorageProvider {
  readonly name = "metadata-only";

  async put(key: string, body: Uint8Array, mimeType: string): Promise<StoredDocument> {
    return { key, url: null, sizeBytes: body.byteLength, mimeType };
  }

  async signedUrl(): Promise<string | null> {
    return null;
  }
}

export function storageProvider(): StorageProvider {
  return new MetadataOnlyStorage();
}
