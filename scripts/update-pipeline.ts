import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const today = new Date().toISOString().slice(0, 10);

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ── 1-2: Mensajes pendientes de envío ────────────────────────────────────────
async function listPendingMessages() {
  const { data: outreachRows, error } = await supabase
    .from('outreach')
    .select('id, lead_id, current_step, next_action, next_action_date, leads(first_name, last_name, company)')
    .eq('connection_accepted', true)
    .lte('next_action_date', today)
    .not('next_action', 'is', null)
    .not('next_action', 'in', '("WAIT_ACCEPTANCE","COMPLETED")');

  if (error) {
    console.error('Error leyendo outreach:', error.message);
    return;
  }

  if (!outreachRows?.length) {
    console.log('📭 No hay mensajes pendientes para hoy.');
    return;
  }

  const STEP_MAP: Record<string, number> = {
    SEND_STEP_2: 2,
    SEND_STEP_3: 3,
    SEND_STEP_4: 4,
  };

  const pending: { name: string; company: string; step: number }[] = [];

  for (const row of outreachRows) {
    const stepNumber = STEP_MAP[row.next_action];
    if (!stepNumber) continue;

    const { data: msg } = await supabase
      .from('messages')
      .select('id')
      .eq('lead_id', row.lead_id)
      .eq('step_number', stepNumber)
      .eq('status', 'DRAFT')
      .maybeSingle();

    if (!msg) continue; // already sent or discarded

    const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
    pending.push({
      name: `${lead?.first_name ?? ''} ${lead?.last_name ?? ''}`.trim(),
      company: lead?.company ?? '—',
      step: stepNumber,
    });
  }

  if (!pending.length) {
    console.log('📭 No hay mensajes DRAFT pendientes para hoy (pueden haber sido enviados ya).');
    return;
  }

  console.log(`\n📩 Hoy hay ${pending.length} mensaje(s) pendiente(s):`);
  for (const p of pending) {
    console.log(`   - ${p.name} (${p.company}) — Paso ${p.step}`);
  }
  console.log('\n   Abrí el dashboard para enviarlos: dashboard/index.html');
}

// ── 5: Conexiones expiradas (>7 días sin aceptar) ────────────────────────────
async function expireConnections() {
  const cutoff = daysAgo(7);

  const { data: expired, error } = await supabase
    .from('outreach')
    .select('id, lead_id')
    .eq('connection_accepted', false)
    .not('connection_sent_at', 'is', null)
    .lt('connection_sent_at', cutoff);

  if (error) { console.error('Error buscando conexiones expiradas:', error.message); return; }
  if (!expired?.length) { console.log('✅ Sin conexiones expiradas.'); return; }

  const leadIds = expired.map(r => r.lead_id);

  await supabase.from('leads').update({ status: 'COLD' }).in('id', leadIds);
  await supabase.from('outreach').update({ next_action: 'COMPLETED' }).in('id', expired.map(r => r.id));

  console.log(`🧊 ${expired.length} conexión(es) marcadas como expiradas → leads a COLD`);
}

// ── 6: Secuencia completa sin respuesta (>14 días tras paso 4) ───────────────
async function markCompletedSequences() {
  const cutoff = daysAgo(14);

  const { data: done, error } = await supabase
    .from('outreach')
    .select('id, lead_id')
    .eq('current_step', 4)
    .not('step4_sent_at', 'is', null)
    .lt('step4_sent_at', cutoff)
    .not('next_action', 'eq', 'COMPLETED');

  if (error) { console.error('Error buscando secuencias completas:', error.message); return; }
  if (!done?.length) { console.log('✅ Sin secuencias para cerrar.'); return; }

  const leadIds = done.map(r => r.lead_id);

  await supabase.from('leads').update({ status: 'COLD' }).in('id', leadIds);
  await supabase.from('outreach').update({ next_action: 'COMPLETED' }).in('id', done.map(r => r.id));

  console.log(`❄️  ${done.length} secuencia(s) cerrada(s) sin respuesta → leads a COLD, outreach COMPLETED`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function updatePipeline() {
  console.log(`\n🔄 Update pipeline — ${today}\n${'─'.repeat(45)}`);
  await listPendingMessages();
  console.log();
  await expireConnections();
  await markCompletedSequences();
  console.log('\n✅ Pipeline actualizado.');
}

updatePipeline();
