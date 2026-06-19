import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateMessages() {
  console.log('Analyzing leads and generating messages with Groq...');
  // TODO: fetch leads, call Groq API, store generated messages
  console.log('Done.');
}

generateMessages().catch(console.error);
