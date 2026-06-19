import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updatePipeline() {
  console.log('Updating pipeline states...');
  // TODO: read status updates and apply to leads table
  console.log('Done.');
}

updatePipeline().catch(console.error);
