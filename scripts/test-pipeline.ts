import 'dotenv/config';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import { processOneLead, type LeadResult } from './generate-messages.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STEP_ICONS = ['📨 Conexión', '💬 Paso 2 ', '💬 Paso 3 ', '👋 Paso 4 '];

// ── Test leads ────────────────────────────────────────────────────────────────
const TEST_LEADS = [
  {
    first_name: 'María',    last_name: 'García',
    title: 'CEO',           company: 'TiendaHispana.com',
    industry: 'ecommerce',  location: 'Miami FL',
    linkedin_url: 'https://linkedin.com/in/test-maria-garcia',
    employee_count: 40,     vertical: 'ecommerce', market: 'usa_es',
    status: 'NEW', source: 'test', sales_stage: 'PROSPECTADO',
  },
  {
    first_name: 'Roberto',  last_name: 'Díaz',
    title: 'Founder',       company: 'CasasLatinas Realty',
    industry: 'real_estate',location: 'Houston TX',
    linkedin_url: 'https://linkedin.com/in/test-roberto-diaz',
    employee_count: 20,     vertical: 'real_estate', market: 'usa_es',
    status: 'NEW', source: 'test', sales_stage: 'PROSPECTADO',
  },
  {
    first_name: 'Ana',      last_name: 'Martínez',
    title: 'Gerente General', company: 'ClínicaSalud360',
    industry: 'salud',      location: 'Buenos Aires',
    linkedin_url: 'https://linkedin.com/in/test-ana-martinez',
    employee_count: 55,     vertical: 'salud', market: 'latam',
    status: 'NEW', source: 'test', sales_stage: 'PROSPECTADO',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function hr(ch = '─', n = 55) { return ch.repeat(n); }

function ask(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase().startsWith('s'));
    });
  });
}

function printLeadBlock(
  idx: number,
  lead: typeof TEST_LEADS[0],
  result: LeadResult,
) {
  const { analysis, messages } = result;
  console.log(`\n${hr()}`);
  console.log(`--- Lead ${idx}: ${lead.first_name} ${lead.last_name} (${lead.title} @ ${lead.company}) ---`);
  console.log(`Score: ${analysis.priority_score}/10 | Pain: ${analysis.pain_point}`);
  console.log(`Gancho: ${analysis.relevance_hook}`);
  console.log();

  for (const msg of messages) {
    const icon = STEP_ICONS[msg.step_number - 1] ?? `Paso ${msg.step_number}`;
    const preview = msg.body.length > 120 ? msg.body.slice(0, 120) + '…' : msg.body;
    console.log(`${icon} (${msg.char_count} chars):`);
    console.log(`  "${preview}"`);
    console.log();
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
async function cleanup(leadIds: string[]) {
  await supabase.from('messages').delete().in('lead_id', leadIds);
  await supabase.from('outreach').delete().in('lead_id', leadIds);
  await supabase.from('leads').delete().in('id', leadIds);
  console.log(`\n🧹 Datos de prueba eliminados (${leadIds.length} leads + mensajes + outreach).`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function testPipeline() {
  console.log(`\n${'═'.repeat(55)}`);
  console.log('=== 🧪 TEST PIPELINE LINKEDIN AGENT v3 ===');
  console.log(`${'═'.repeat(55)}\n`);

  // ── 1. Insertar leads de prueba ───────────────────────────────────────────
  console.log('Insertando leads de prueba...');
  const { data: inserted, error: insErr } = await supabase
    .from('leads')
    .insert(TEST_LEADS)
    .select('id, first_name, last_name');

  if (insErr) {
    console.error('❌ Error insertando leads:', insErr.message);
    process.exit(1);
  }

  const leadIds = inserted!.map(l => l.id);
  console.log(`✅ Leads insertados: ${leadIds.length}`);

  // ── 2. Procesar cada lead ─────────────────────────────────────────────────
  console.log('\nGenerando análisis y mensajes con Groq...\n');
  const results: { lead: typeof TEST_LEADS[0]; result: LeadResult }[] = [];
  let errors = 0;

  for (let i = 0; i < TEST_LEADS.length; i++) {
    const lead = { ...TEST_LEADS[i], id: leadIds[i] };
    const name = `${lead.first_name} ${lead.last_name}`;
    process.stdout.write(`  [${i + 1}/3] ${name}... `);
    try {
      const result = await processOneLead(supabase, lead);
      results.push({ lead: TEST_LEADS[i], result });
      console.log(`✅ Score ${result.analysis.priority_score}/10`);
    } catch (err) {
      errors++;
      console.log(`❌ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 3. Resultados completos ───────────────────────────────────────────────
  const totalMsgs = results.reduce((s, r) => s + r.result.messages.length, 0);
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`✅ Leads insertados:   ${leadIds.length}`);
  console.log(`✅ Leads analizados:   ${results.length}`);
  console.log(`✅ Mensajes generados: ${totalMsgs} (4 × ${results.length})`);
  if (errors) console.log(`❌ Errores:            ${errors}`);

  results.forEach(({ lead, result }, i) => printLeadBlock(i + 1, lead, result));

  // ── Pipeline status ───────────────────────────────────────────────────────
  const [{ count: outCount }, { count: msgCount }] = await Promise.all([
    supabase.from('outreach').select('*', { count: 'exact', head: true }).in('lead_id', leadIds),
    supabase.from('messages').select('*', { count: 'exact', head: true }).in('lead_id', leadIds).eq('status', 'DRAFT'),
  ]);

  console.log(`\n${hr('═')}`);
  console.log('=== Pipeline status ===');
  console.log(`Outreach entries: ${outCount}`);
  console.log(`Messages DRAFT:   ${msgCount}`);
  console.log(`Next actions:     ${outCount} × SEND_CONNECTION`);
  console.log(hr('═'));

  // ── 4. Cleanup opcional ───────────────────────────────────────────────────
  const doClean = await ask('\n¿Eliminar datos de prueba? [s/N] ');
  if (doClean) {
    await cleanup(leadIds);
  } else {
    console.log('\nℹ️  Datos de prueba conservados. Para limpiarlos manualmente:');
    console.log('   leads con linkedin_url LIKE \'%test-%\'\n');
  }
}

testPipeline().catch(err => {
  console.error('Error fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
