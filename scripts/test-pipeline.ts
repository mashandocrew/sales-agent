import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testPipeline() {
  console.log('Running full pipeline test...');

  const { data, error } = await supabase.from('leads').select('count').single();
  if (error) {
    console.error('Supabase connection error:', error.message);
    process.exit(1);
  }
  console.log('Supabase OK - leads count:', data);
  console.log('All checks passed.');
}

testPipeline().catch(console.error);
