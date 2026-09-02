// Simple CSV parser that handles quoted fields and CRLF/newlines.
export function parseCSV(text: string) {
  const rows: string[][] = [];
  let i = 0;
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      }

      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      cur.push(field);
      field = '';
      i++;
      continue;
    }

    if (ch === '\r') {
      // skip, handle \r\n together
      i++;
      continue;
    }

    if (ch === '\n') {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // push last
  if (inQuotes) {
    // unterminated quotes — still push what we have
    cur.push(field);
    rows.push(cur);
  } else if (field !== '' || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  const header = rows.length > 0 ? rows[0].map((h) => (h ?? '').trim()) : [];
  const data = rows.slice(1);

  return { header, rows: data };
}

export function parseCSVToObjects(text: string) {
  const { header, rows } = parseCSV(text);
  const objs = rows.map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      obj[header[i]] = r[i] ?? '';
    }
    return obj;
  });

  return { header, rows: objs };
}
