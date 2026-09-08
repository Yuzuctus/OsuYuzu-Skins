/**
 * Minimal ZIP writer for Cloudflare Workers.
 *
 * Why this exists instead of JSZip:
 * - Workers are limited to ~128 MB of memory per isolate and very little CPU
 *   time on the free plan. Buffering every skin (`arrayBuffer()`) + keeping
 *   them in a JSZip instance + `generateAsync(DEFLATE, level 9)` blows both
 *   limits and surfaces as "1102 Worker exceeded resource limits".
 * - This writer streams entries with method STORE (no compression, minimal
 *   CPU) through a `WritableStream`, so memory stays constant (one chunk at
 *   a time) regardless of the total archive size.
 *
 * It uses data descriptors (general purpose flag bit 3) so file data can be
 * streamed without knowing CRC/size upfront. Only small metadata (names,
 * sizes, CRCs, offsets) is kept in memory for the central directory.
 *
 * Limitations (ZIP32): max 65 535 entries, max 4 GiB total / per file.
 * Beyond that, `finish()` throws a clear error instead of producing a corrupt
 * archive.
 */

const SIGNATURE_LOCAL_HEADER = 0x04034b50;
const SIGNATURE_DATA_DESCRIPTOR = 0x08074b50;
const SIGNATURE_CENTRAL_HEADER = 0x02014b50;
const SIGNATURE_EOCD = 0x06054b50;

const METHOD_STORE = 0;
const FLAG_DATA_DESCRIPTOR = 0x08;
const FLAG_UTF8 = 0x0800;

const MAX_ENTRIES = 0xffff;
const MAX_U32 = 0xffffffff;

// ─── CRC32 (incremental, IEEE) ──────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function createCrc32(): {
  update: (chunk: Uint8Array) => void;
  digest: () => number;
} {
  let crc = 0xffffffff;
  return {
    update(chunk: Uint8Array) {
      for (let i = 0; i < chunk.length; i++) {
        crc = CRC_TABLE[(crc ^ chunk[i]!) & 0xff]! ^ (crc >>> 8);
      }
    },
    digest() {
      return (crc ^ 0xffffffff) >>> 0;
    },
  };
}

// ─── DOS date/time ──────────────────────────────────────────────────

function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2) & 0x1f) << 0);
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    ((date.getDate() & 0x1f) << 0);
  return { time, date: dosDate };
}

// ─── Header builders ────────────────────────────────────────────────

const encoder = new TextEncoder();

interface CentralRecord {
  nameBytes: Uint8Array;
  crc: number;
  compSize: number;
  uncompSize: number;
  localHeaderOffset: number;
  modTime: number;
  modDate: number;
}

function buildLocalHeader(
  nameBytes: Uint8Array,
  modTime: number,
  modDate: number,
): Uint8Array {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, SIGNATURE_LOCAL_HEADER, true);
  view.setUint16(4, 20, true); // version needed: 2.0
  view.setUint16(6, FLAG_DATA_DESCRIPTOR | FLAG_UTF8, true);
  view.setUint16(8, METHOD_STORE, true);
  view.setUint16(10, modTime, true);
  view.setUint16(12, modDate, true);
  view.setUint32(14, 0, true); // crc (in data descriptor)
  view.setUint32(18, 0, true); // compressed size (in data descriptor)
  view.setUint32(22, 0, true); // uncompressed size (in data descriptor)
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true); // extra length
  header.set(nameBytes, 30);
  return header;
}

function buildDataDescriptor(
  crc: number,
  compSize: number,
  uncompSize: number,
): Uint8Array {
  const desc = new Uint8Array(16);
  const view = new DataView(desc.buffer);
  view.setUint32(0, SIGNATURE_DATA_DESCRIPTOR, true);
  view.setUint32(4, crc, true);
  view.setUint32(8, compSize, true);
  view.setUint32(12, uncompSize, true);
  return desc;
}

function buildCentralHeader(record: CentralRecord): Uint8Array {
  const header = new Uint8Array(46 + record.nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, SIGNATURE_CENTRAL_HEADER, true);
  view.setUint16(4, 20, true); // version made by (2.0, DOS)
  view.setUint16(6, 20, true); // version needed
  // Bit 3 cleared here: sizes/CRC are known in the central directory.
  view.setUint16(8, FLAG_UTF8, true);
  view.setUint16(10, METHOD_STORE, true);
  view.setUint16(12, record.modTime, true);
  view.setUint16(14, record.modDate, true);
  view.setUint32(16, record.crc, true);
  view.setUint32(20, record.compSize, true);
  view.setUint32(24, record.uncompSize, true);
  view.setUint16(28, record.nameBytes.length, true);
  view.setUint16(30, 0, true); // extra length
  view.setUint16(32, 0, true); // comment length
  view.setUint16(34, 0, true); // disk number
  view.setUint16(36, 0, true); // internal attributes
  view.setUint32(38, 0, true); // external attributes
  view.setUint32(42, record.localHeaderOffset, true);
  header.set(record.nameBytes, 46);
  return header;
}

function buildEocd(
  entryCount: number,
  centralSize: number,
  centralOffset: number,
): Uint8Array {
  const eocd = new Uint8Array(22);
  const view = new DataView(eocd.buffer);
  view.setUint32(0, SIGNATURE_EOCD, true);
  view.setUint16(4, 0, true); // disk number
  view.setUint16(6, 0, true); // central dir start disk
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true); // comment length
  return eocd;
}

// ─── Writer ─────────────────────────────────────────────────────────

export class ZipStreamWriter {
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private offset = 0;
  private records: CentralRecord[] = [];
  private finished = false;

  constructor(writable: WritableStream<Uint8Array>) {
    this.writer = writable.getWriter();
  }

  private async write(chunk: Uint8Array): Promise<void> {
    if (chunk.length === 0) return;
    if (this.offset + chunk.length > MAX_U32) {
      throw new Error(
        "Archive trop volumineuse (> 4 Go) : le format ZIP64 n'est pas supporté.",
      );
    }
    await this.writer.write(chunk);
    this.offset += chunk.length;
  }

  private assertOpen(): void {
    if (this.finished) {
      throw new Error("ZipStreamWriter: archive déjà finalisée.");
    }
  }

  private registerRecord(name: string, mtime?: Date): CentralRecord {
    if (this.records.length >= MAX_ENTRIES) {
      throw new Error(
        "Archive trop volumineuse (> 65 535 fichiers) : découpez le téléchargement.",
      );
    }
    const nameBytes = encoder.encode(name);
    if (nameBytes.length === 0 || nameBytes.length > 0xffff) {
      throw new Error(`Nom de fichier invalide dans l'archive : "${name}".`);
    }
    const { time, date } = dosDateTime(mtime ?? new Date());
    const record: CentralRecord = {
      nameBytes,
      crc: 0,
      compSize: 0,
      uncompSize: 0,
      localHeaderOffset: this.offset,
      modTime: time,
      modDate: date,
    };
    this.records.push(record);
    return record;
  }

  /** Stream a (potentially large) entry without buffering it in memory. */
  async addFile(
    name: string,
    body: ReadableStream<Uint8Array>,
    mtime?: Date,
  ): Promise<void> {
    this.assertOpen();
    const record = this.registerRecord(name, mtime);
    const { time, date } = { time: record.modTime, date: record.modDate };

    await this.write(buildLocalHeader(record.nameBytes, time, date));

    const crc = createCrc32();
    let size = 0;
    const reader = body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.length === 0) continue;
        if (size + value.length > MAX_U32) {
          throw new Error(
            `Fichier trop volumineux pour le ZIP32 : "${name}" (> 4 Go).`,
          );
        }
        crc.update(value);
        size += value.length;
        await this.write(value);
      }
    } finally {
      reader.releaseLock();
    }

    const digest = crc.digest();
    await this.write(buildDataDescriptor(digest, size, size));
    record.crc = digest;
    record.compSize = size;
    record.uncompSize = size;
  }

  /** Add a small in-memory entry (README, .url, link lists). */
  async addBuffer(name: string, data: Uint8Array, mtime?: Date): Promise<void> {
    this.assertOpen();
    if (data.length > MAX_U32) {
      throw new Error(`Fichier trop volumineux pour le ZIP32 : "${name}".`);
    }
    const record = this.registerRecord(name, mtime);
    await this.write(
      buildLocalHeader(record.nameBytes, record.modTime, record.modDate),
    );
    const crc = createCrc32();
    crc.update(data);
    const digest = crc.digest();
    await this.write(data);
    await this.write(buildDataDescriptor(digest, data.length, data.length));
    record.crc = digest;
    record.compSize = data.length;
    record.uncompSize = data.length;
  }

  async finish(): Promise<void> {
    this.assertOpen();
    this.finished = true;
    const centralOffset = this.offset;
    let centralSize = 0;
    for (const record of this.records) {
      const header = buildCentralHeader(record);
      await this.write(header);
      centralSize += header.length;
    }
    await this.write(buildEocd(this.records.length, centralSize, centralOffset));
    await this.writer.close();
  }

  async abort(reason?: unknown): Promise<void> {
    try {
      await this.writer.abort(reason);
    } catch {
      // Ignore: the stream may already be closed/cancelled by the client.
    }
  }
}
