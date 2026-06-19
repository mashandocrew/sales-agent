import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function importFromSheet() {
  const sheetUrl = process.env.GOOGLE_SHEET_URL!;
  console.log('Importing leads from Google Sheet:', sheetUrl);
  // TODO: fetch CSV export and upsert leads
  console.log('Done.');
}

importFromSheet().catch(console.error);
