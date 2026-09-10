/**
 * Minimal indentation-based YAML subset parser for routing metadata.
 * Supports nested maps, sequences, scalars, inline lists, and comments.
 */

function stripInlineComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) {
      if (line[i - 1] !== '\\') inDouble = !inDouble;
    } else if (ch === '#' && !inSingle && !inDouble) {
      return line.slice(0, i).replace(/\s+$/, '');
    }
  }
  return line.replace(/\s+$/, '');
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === '') return '';
  if (value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((part) => parseScalar(part.trim()));
  }
  return value;
}

function indentWidth(line) {
  const match = /^( *)/.exec(line);
  return match ? match[1].length : 0;
}

function prepareLines(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line, index) => {
      const cleaned = stripInlineComment(line);
      return {
        index: index + 1,
        indent: indentWidth(cleaned),
        text: cleaned.trim(),
        raw: cleaned,
      };
    })
    .filter((line) => line.text.length > 0);
}

function parseMapItemBody(lines, start, keyIndent) {
  const line = lines[start];
  const colon = line.text.indexOf(':');
  const key = line.text.slice(0, colon).trim();
  const rest = line.text.slice(colon + 1).trim();

  if (rest !== '') {
    return { key, value: parseScalar(rest), next: start + 1 };
  }

  if (start + 1 >= lines.length || lines[start + 1].indent <= keyIndent) {
    return { key, value: {}, next: start + 1 };
  }

  const childIndent = lines[start + 1].indent;
  const { value, next } = parseNode(lines, start + 1, childIndent);
  return { key, value, next };
}

function parseNode(lines, start, expectedIndent) {
  if (start >= lines.length) return { value: null, next: start };
  const first = lines[start];
  if (first.indent !== expectedIndent) {
    throw new Error(`line ${first.index}: unexpected indent`);
  }

  if (first.text.startsWith('- ')) {
    const items = [];
    let i = start;
    while (i < lines.length && lines[i].indent === expectedIndent && lines[i].text.startsWith('- ')) {
      const itemText = lines[i].text.slice(2).trim();
      if (itemText === '') {
        if (i + 1 < lines.length && lines[i + 1].indent > expectedIndent) {
          const childIndent = lines[i + 1].indent;
          const parsed = parseNode(lines, i + 1, childIndent);
          items.push(parsed.value);
          i = parsed.next;
        } else {
          items.push(null);
          i += 1;
        }
        continue;
      }

      if (itemText.includes(':') && !itemText.startsWith('[') && !itemText.startsWith('{')) {
        // Inline map start on the sequence marker line.
        const synthetic = {
          index: lines[i].index,
          indent: expectedIndent + 2,
          text: itemText,
          raw: itemText,
        };
        const rest = [];
        let j = i + 1;
        while (j < lines.length && lines[j].indent > expectedIndent) {
          rest.push({
            ...lines[j],
            indent: lines[j].indent,
          });
          j += 1;
        }
        const local = [synthetic, ...rest];
        const { value, next } = parseNode(local, 0, expectedIndent + 2);
        items.push(value);
        // `next` counts local lines consumed; first local line is synthetic.
        const consumedRest = Math.max(0, next - 1);
        i = i + 1 + consumedRest;
        continue;
      }

      items.push(parseScalar(itemText));
      i += 1;
    }
    return { value: items, next: i };
  }

  const obj = {};
  let i = start;
  while (i < lines.length && lines[i].indent === expectedIndent) {
    if (lines[i].text.startsWith('- ')) break;
    if (!lines[i].text.includes(':')) {
      throw new Error(`line ${lines[i].index}: expected key: value`);
    }
    const parsed = parseMapItemBody(lines, i, expectedIndent);
    obj[parsed.key] = parsed.value;
    i = parsed.next;
  }
  return { value: obj, next: i };
}

export function parseYaml(text, { filename = '<yaml>' } = {}) {
  try {
    const lines = prepareLines(text);
    if (lines.length === 0) return {};
    const rootIndent = lines[0].indent;
    const { value, next } = parseNode(lines, 0, rootIndent);
    if (next !== lines.length) {
      throw new Error(`line ${lines[next].index}: unexpected content after root document`);
    }
    return value;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${filename}: ${message}`);
  }
}

export function loadYamlFile(fsApi, filePath) {
  const text = fsApi.readFileSync(filePath, 'utf8');
  return parseYaml(text, { filename: filePath });
}
