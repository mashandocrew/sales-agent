import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── CSV parser ────────────────────────────────────────────────────────────────
// Handles quoted fields that may contain commas or escaped quotes ("").
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let i = 0;

    while (i < line.length) {
      if (line[i] === '"') {
        // Quoted field
        let value = '';
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            value += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            value += line[i++];
          }
        }
        fields.push(value);
        if (line[i] === ',') i++; // skip comma after field
      } else {
        // Unquoted field
        const end = line.indexOf(',', i);
        if (end === -1) {
          fields.push(line.slice(i).trim());
          break;
        }
        fields.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }

    rows.push(fields);
  }

  return rows;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractSheetId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error(`No se pudo extraer el Sheet ID de: ${url}`);
  return match[1];
}

function detectVertical(
  industry: string,
  verticals: Record<string, { keywords_es: string[] }>
): string | null {
  const normalized = industry.toLowerCase();
  for (const [key, def] of Object.entries(verticals)) {
    if (def.keywords_es.some((kw) => normalized.includes(kw.toLowerCase()))) {
      return key;
    }
  }
  return null;
}

function detectMarket(
  location: string,
  markets: Record<string, { locations: string[] }>
): string | null {
  const normalized = location.toLowerCase();
  for (const [key, def] of Object.entries(markets)) {
    if (def.locations.some((city) => normalized.includes(city.toLowerCase()))) {
      return key;
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function importFromSheet() {
  // 1. Fetch ICP config from Supabase
  const { data: configRow, error: configErr } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'icp')
    .single();

  if (configErr) {
    console.error('Error al leer config ICP:', configErr.message);
    process.exit(1);
  }

  const icp = configRow.value as {
    verticals: Record<string, { keywords_es: string[] }>;
    markets: Record<string, { locations: string[] }>;
  };

  // 2. Build CSV URL and fetch
  const sheetUrl = process.env.GOOGLE_SHEET_URL!;
  const sheetId = extractSheetId(sheetUrl);
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;

  console.log(`Leyendo sheet: ${csvUrl}`);

  const response = await fetch(csvUrl);
  if (!response.ok) {
    console.error(`HTTP ${response.status} al leer el Sheet`);
    process.exit(1);
  }

  const csvText = await response.text();
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    console.log('El sheet no tiene filas de datos (solo header o vacío).');
    return;
  }

  const [header, ...dataRows] = rows;
  const col = (name: string) => header.indexOf(name);

  // 3. Fetch existing linkedin_urls for deduplication
  const { data: existing, error: existErr } = await supabase
    .from('leads')
    .select('linkedin_url');

  if (existErr) {
    console.error('Error al leer leads existentes:', existErr.message);
    process.exit(1);
  }

  const existingUrls = new Set((existing ?? []).map((r) => r.linkedin_url?.trim().toLowerCase()));

  // 4. Process rows
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of dataRows) {
    const get = (name: string) => row[col(name)]?.trim() ?? '';

    const first_name   = get('first_name');
    const last_name    = get('last_name');
    const linkedin_url = get('linkedin_url');

    // Validation
    if (!first_name || !last_name || !linkedin_url) {
      errors++;
      continue;
    }

    // Deduplication
    if (existingUrls.has(linkedin_url.toLowerCase())) {
      skipped++;
      continue;
    }

    const industry     = get('industry');
    const location     = get('location');
    const employee_raw = get('employee_count');

    const lead = {
      first_name,
      last_name,
      title:         get('title')   || null,
      company:       get('company') || null,
      industry:      industry       || null,
      location:      location       || null,
      linkedin_url,
      website:       get('website') || null,
      employee_count: employee_raw ? parseInt(employee_raw, 10) || null : null,
      vertical:      detectVertical(industry, icp.verticals),
      market:        detectMarket(location, icp.markets),
      status:        'NEW',
      source:        'google_sheet',
      sales_stage:   'PROSPECTADO',
    };

    const { error: insertErr } = await supabase.from('leads').insert(lead);

    if (insertErr) {
      console.error(`Error insertando ${first_name} ${last_name}:`, insertErr.message);
      errors++;
      continue;
    }

    existingUrls.add(linkedin_url.toLowerCase()); // prevent intra-batch duplicates
    imported++;
  }

  // 5. Summary
  console.log(`\n✅ Importados:  ${imported} leads nuevos`);
  console.log(`⏭️  Saltados:    ${skipped} duplicados`);
  console.log(`❌ Errores:     ${errors} filas con datos incompletos`);
}

importFromSheet();
