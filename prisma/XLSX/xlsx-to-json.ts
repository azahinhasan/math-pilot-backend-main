import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import * as XLSX from 'xlsx';

type CliOptions = {
  input: string;
  output?: string;
  sheet?: string;
  allSheets: boolean;
};

//npx ts-node prisma/XLSX/xlsx-to-json.ts --input prisma/XLSX/myFile.xlsx

function printUsage(): void {
  // Intentionally no comments/docs in repo; keep minimal output.
  const msg = [
    'Usage:',
    '  ts-node prisma/XLSX/xlsx-to-json.ts --input <file.xlsx> [--output <file.json>] [--sheet <name>] [--all-sheets]',
    '',
    'Notes:',
    '  --sheet exports a single sheet (default: first sheet).',
    '  --all-sheets exports an object keyed by sheet name.',
  ].join('\n');
  process.stdout.write(`${msg}\n`);
}

function parseArgs(argv: string[]): CliOptions | null {
  const opts: Partial<CliOptions> = { allSheets: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input' || arg === '-i') {
      opts.input = argv[++i];
      continue;
    }
    if (arg === '--output' || arg === '-o') {
      opts.output = argv[++i];
      continue;
    }
    if (arg === '--sheet' || arg === '-s') {
      opts.sheet = argv[++i];
      continue;
    }
    if (arg === '--all-sheets' || arg === '--all') {
      opts.allSheets = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      return null;
    }

    process.stderr.write(`Unknown argument: ${arg}\n`);
    return null;
  }

  if (!opts.input) return null;

  return {
    input: opts.input,
    output: opts.output,
    sheet: opts.sheet,
    allSheets: Boolean(opts.allSheets),
  };
}

function ensureFileExists(p: string): void {
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) {
    throw new Error(`Input file not found: ${p}`);
  }
}

function defaultOutputPath(inputPath: string, sheetOrAll?: string): string {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  const suffix = sheetOrAll ? `.${sheetOrAll}` : '';
  return path.join(dir, `${base}${suffix}.json`);
}

function sheetToRows(workbook: XLSX.WorkBook, sheetName: string): unknown[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  return XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: true,
  });
}

function removeBackslashesDeep(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(/\\/g, '');
  if (Array.isArray(value)) return value.map((v) => removeBackslashesDeep(v));
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = removeBackslashesDeep(v);
    }
    return out;
  }
  return value;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const inputAbs = path.resolve(process.cwd(), opts.input);
  ensureFileExists(inputAbs);

  const workbook = XLSX.readFile(inputAbs, {
    cellDates: true,
  });

  let json: unknown;
  let outPath = opts.output;

  if (opts.allSheets) {
    const out: Record<string, unknown[]> = {};
    for (const name of workbook.SheetNames) {
      out[name] = sheetToRows(workbook, name);
    }
    json = out;
    if (!outPath) outPath = defaultOutputPath(inputAbs, 'all');
  } else {
    const sheetName = opts.sheet ?? workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Workbook has no sheets');
    }
    json = sheetToRows(workbook, sheetName);
    if (!outPath) outPath = defaultOutputPath(inputAbs, sheetName.replace(/[^a-z0-9_-]+/gi, '_'));
  }

  const outAbs = path.resolve(process.cwd(), outPath);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(removeBackslashesDeep(json), null, 2), 'utf8');

  process.stdout.write(`Wrote ${outAbs}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
