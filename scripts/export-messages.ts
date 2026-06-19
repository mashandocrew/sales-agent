import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportMessages() {
  console.log('Exporting ready messages...');
  mkdirSync(join('data', 'exports'), { recursive: true });
  // TODO: query approved messages and write to data/exports/
  console.log('Done.');
}

exportMessages().catch(console.error);
