import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedConfig() {
  console.log('Seeding initial config...');
  // TODO: insert initial agent_config rows
  console.log('Done.');
}

seedConfig().catch(console.error);
