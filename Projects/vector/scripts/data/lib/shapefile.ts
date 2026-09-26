// Minimal ESRI shapefile (.shp polygons) and dBASE (.dbf) readers, enough for
// US Census boundary and water files.

export type Ring = [lon: number, lat: number][];

export interface ShapeRecord {
  /** Polygon rings (outer and inner) for polygon shapes; empty for null shapes. */
  rings: Ring[];
  attributes: Record<string, string>;
}

const POLYGON = 5;

export function readShapefile(shp: Uint8Array, dbf: Uint8Array): ShapeRecord[] {
  const shapes = readShp(shp);
  const attributes = readDbf(dbf);
  if (shapes.length !== attributes.length) {
    throw new Error(
      `Shapefile has ${shapes.length} shapes but ${attributes.length} attribute rows`,
    );
  }
  return shapes.map((rings, i) => ({ rings, attributes: attributes[i]! }));
}

function readShp(bytes: Uint8Array): Ring[][] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const shapes: Ring[][] = [];
  let offset = 100; // file header

  while (offset < bytes.byteLength) {
    const contentLength = view.getInt32(offset + 4, false) * 2;
    const content = offset + 8;
    const type = view.getInt32(content, true);

    if (type === POLYGON) {
      const partCount = view.getInt32(content + 36, true);
      const pointCount = view.getInt32(content + 40, true);
      const partsStart = content + 44;
      const pointsStart = partsStart + 4 * partCount;
      const rings: Ring[] = [];
      for (let part = 0; part < partCount; part++) {
        const start = view.getInt32(partsStart + 4 * part, true);
        const end =
          part + 1 < partCount ? view.getInt32(partsStart + 4 * (part + 1), true) : pointCount;
        const ring: Ring = [];
        for (let i = start; i < end; i++) {
          const p = pointsStart + 16 * i;
          ring.push([view.getFloat64(p, true), view.getFloat64(p + 8, true)]);
        }
        rings.push(ring);
      }
      shapes.push(rings);
    } else {
      shapes.push([]);
    }
    offset = content + contentLength;
  }
  return shapes;
}

function readDbf(bytes: Uint8Array): Record<string, string>[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const recordCount = view.getUint32(4, true);
  const headerLength = view.getUint16(8, true);
  const recordLength = view.getUint16(10, true);
  const decoder = new TextDecoder('latin1');

  const fields: { name: string; length: number }[] = [];
  for (let offset = 32; bytes[offset] !== 0x0d; offset += 32) {
    const name = decoder.decode(bytes.subarray(offset, offset + 11)).replace(/\0.*$/, '');
    fields.push({ name, length: bytes[offset + 16]! });
  }

  const rows: Record<string, string>[] = [];
  for (let r = 0; r < recordCount; r++) {
    let offset = headerLength + r * recordLength + 1; // skip deletion flag
    const row: Record<string, string> = {};
    for (const field of fields) {
      row[field.name] = decoder.decode(bytes.subarray(offset, offset + field.length)).trim();
      offset += field.length;
    }
    rows.push(row);
  }
  return rows;
}
