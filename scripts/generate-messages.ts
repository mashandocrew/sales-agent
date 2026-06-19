import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ── CLI args ──────────────────────────────────────────────────────────────────
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : 20;

// ── Groq helper ───────────────────────────────────────────────────────────────
async function groq(prompt: string, temperature: number, maxTokens = 500): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { choices: { message: { content: string } }[] };
  return json.choices[0].message.content.trim();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Analysis prompt ───────────────────────────────────────────────────────────
function analysisPrompt(lead: Record<string, unknown>): string {
  return `Sos un analista de ventas B2B experto en el mercado hispano de Estados Unidos y LATAM.
Analizá este prospecto para venderle Pip (soypip.com), una plataforma de automatización de WhatsApp Business.

Producto Pip: Chatbot con IA para WhatsApp, CRM conversacional, envíos masivos, plantillas con botones, etiquetas inteligentes, derivaciones automáticas, chat interno, API/Webhooks, analytics.

Prospecto:
- Nombre: ${lead.first_name} ${lead.last_name}
- Cargo: ${lead.title ?? 'desconocido'}
- Empresa: ${lead.company ?? 'desconocida'}
- Industria: ${lead.industry ?? 'desconocida'}
- Ubicación: ${lead.location ?? 'desconocida'}
- Empleados: ${lead.employee_count ?? 'desconocido'}

Respondé ÚNICAMENTE con JSON válido. Sin markdown, sin backticks, sin explicaciones:
{
  "pain_point": "NO_WHATSAPP_AUTO | CHATBOT_DEFICIENTE | SIN_WHATSAPP | SOPORTE_MANUAL | CRECIMIENTO_SIN_ESCALA",
  "relevance_hook": "una oración corta y específica sobre por qué este prospecto necesita automatizar WhatsApp, mencionando su empresa o industria por nombre",
  "priority_score": 1-10,
  "reasoning": "explicación breve"
}`;
}

// ── Message prompts ───────────────────────────────────────────────────────────
function step1Prompt(lead: Record<string, unknown>): string {
  return `Escribí una nota de conexión de LinkedIn en español para:
${lead.first_name} ${lead.last_name}, ${lead.title ?? 'profesional'} en ${lead.company ?? 'su empresa'} (${lead.industry ?? ''}, ${lead.location ?? ''}).

CONTEXTO: ${lead.relevance_hook}

REGLAS ESTRICTAS:
- MÁXIMO 300 caracteres (LinkedIn corta después de 300)
- NO menciones Pip, WhatsApp, automatización, ventas, ni tu empresa
- NO uses "Espero que estés bien", "Me gustaría presentarme", "Soy X de Y"
- SÍ mencioná algo específico de ${lead.company ?? 'su empresa'} o su rol como ${lead.title ?? 'profesional'}
- Tono: natural, humano, como si de verdad quisieras conectar con esa persona
- Usá el nombre: ${lead.first_name}

Respondé SOLO con el texto del mensaje. Sin comillas, sin explicaciones.`;
}

function step2Prompt(lead: Record<string, unknown>): string {
  return `Escribí un mensaje de LinkedIn en español para ${lead.first_name} ${lead.last_name}, ${lead.title ?? 'profesional'} en ${lead.company ?? 'su empresa'}.
Ya aceptó tu conexión. Es momento de aportar valor.

Pain point detectado: ${lead.pain_point}
Gancho: ${lead.relevance_hook}
Producto: Pip (soypip.com) automatiza WhatsApp Business.

REGLAS:
- MÁXIMO 500 caracteres
- Agradecé brevemente la conexión (1 línea corta)
- Mencioná un dato concreto: "empresas de ${lead.industry ?? 'tu industria'} que automatizaron WhatsApp redujeron tiempos de respuesta un 80%"
- NO pidas reunión
- Cerrá con algo natural como "si te interesa, con gusto te cuento más"

Respondé SOLO con el texto del mensaje.`;
}

function step3Prompt(lead: Record<string, unknown>): string {
  return `Escribí un mensaje de LinkedIn en español para ${lead.first_name} de ${lead.company ?? 'su empresa'}.
Ya intercambiaron un mensaje. Ahora ofrecé algo concreto.

REGLAS:
- MÁXIMO 400 caracteres
- Ofrecé enviar un video de 30 segundos mostrando cómo una empresa de ${lead.industry ?? 'su industria'} automatizó WhatsApp
- Pregunta cerrada: "¿Te lo comparto?" o "¿Te interesa?"
- No seas insistente

Respondé SOLO con el texto del mensaje.`;
}

function step4Prompt(lead: Record<string, unknown>): string {
  return `Escribí un mensaje de cierre de LinkedIn en español para ${lead.first_name} de ${lead.company ?? 'su empresa'}.
No respondió a tus mensajes anteriores. Este es el último contacto.

REGLAS:
- MÁXIMO 250 caracteres
- Breve, respetuoso, sin presión
- Dejá la puerta abierta: "cuando quieras, acá estoy"
- No menciones que no respondió

Respondé SOLO con el texto del mensaje.`;
}

// ── Analysis call with 1 retry ────────────────────────────────────────────────
async function analyzeLeadWithGroq(
  lead: Record<string, unknown>
): Promise<{ pain_point: string; relevance_hook: string; priority_score: number; reasoning: string }> {
  const prompt = analysisPrompt(lead);

  for (const temp of [0.3, 0]) {
    const raw = await groq(prompt, temp, 300);
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      if (temp === 0) throw new Error(`No se pudo parsear análisis JSON: ${raw.slice(0, 200)}`);
      console.log(`   ⚠️  Retry análisis con temperature=0...`);
      await sleep(2000);
    }
  }
  throw new Error('unreachable');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function generateMessages() {
  // Register agent run
  const { data: runRow } = await supabase
    .from('agent_runs')
    .insert({ function_name: 'generate-messages', status: 'running' })
    .select('id')
    .single();
  const runId = runRow?.id as string;

  // Fetch NEW leads
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'NEW')
    .order('created_at', { ascending: true })
    .limit(LIMIT);

  if (leadsErr) {
    console.error('Error al leer leads:', leadsErr.message);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log('No hay leads con status=NEW.');
    await supabase.from('agent_runs').update({ status: 'completed', finished_at: new Date().toISOString(), leads_processed: 0, messages_generated: 0 }).eq('id', runId);
    return;
  }

  console.log(`\nProcesando ${leads.length} lead(s) (límite: ${LIMIT})...\n`);

  let totalMessages = 0;
  let totalErrors = 0;
  let firstLeadSummary: { name: string; score: number; pain: string; step1Preview: string } | null = null;

  for (const lead of leads) {
    const name = `${lead.first_name} ${lead.last_name}`;
    console.log(`→ Analizando: ${name} | ${lead.title ?? ''} @ ${lead.company ?? ''}`);

    try {
      // ── LLAMADA 1: Análisis ──────────────────────────────────────────────
      const analysis = await analyzeLeadWithGroq(lead);
      await sleep(2000);

      await supabase.from('leads').update({
        pain_point: analysis.pain_point,
        relevance_hook: analysis.relevance_hook,
        priority_score: analysis.priority_score,
        analysis_data: analysis,
        status: 'ANALYZED',
      }).eq('id', lead.id);

      const enrichedLead = { ...lead, ...analysis };
      console.log(`   Score: ${analysis.priority_score}/10 | Pain: ${analysis.pain_point}`);

      // ── Crear outreach ───────────────────────────────────────────────────
      const today = new Date().toISOString().slice(0, 10);
      const { data: outreachRow, error: outErr } = await supabase
        .from('outreach')
        .insert({
          lead_id: lead.id,
          current_step: 0,
          next_action: 'SEND_CONNECTION',
          next_action_date: today,
        })
        .select('id')
        .single();

      if (outErr) throw new Error(`outreach insert: ${outErr.message}`);
      const outreachId = outreachRow.id as string;

      // ── LLAMADA 2: Generar 4 mensajes ────────────────────────────────────
      const steps: { prompt: string; type: string; maxChars: number }[] = [
        { prompt: step1Prompt(enrichedLead), type: 'connection_note',   maxChars: 300 },
        { prompt: step2Prompt(enrichedLead), type: 'linkedin_message',  maxChars: 500 },
        { prompt: step3Prompt(enrichedLead), type: 'linkedin_message',  maxChars: 400 },
        { prompt: step4Prompt(enrichedLead), type: 'linkedin_message',  maxChars: 250 },
      ];

      for (let i = 0; i < steps.length; i++) {
        const { prompt, type, maxChars } = steps[i];
        const stepNum = i + 1;

        const body = await groq(prompt, 0.7, maxChars + 50);
        await sleep(2000);

        const truncated = body.slice(0, maxChars);

        await supabase.from('messages').insert({
          lead_id: lead.id,
          outreach_id: outreachId,
          step_number: stepNum,
          message_type: type,
          language: 'es',
          body: truncated,
          char_count: truncated.length,
          status: 'DRAFT',
        });

        totalMessages++;

        if (i === 0 && !firstLeadSummary) {
          firstLeadSummary = {
            name,
            score: analysis.priority_score,
            pain: analysis.pain_point,
            step1Preview: truncated,
          };
        }

        console.log(`   Paso ${stepNum} (${truncated.length} chars): "${truncated.slice(0, 60)}..."`);
      }

      // ── Actualizar lead a ACTIVE ─────────────────────────────────────────
      await supabase.from('leads').update({ status: 'ACTIVE' }).eq('id', lead.id);
      console.log(`   ✅ ${name} completado\n`);

    } catch (err) {
      totalErrors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ Error con ${name}: ${msg}\n`);
      await supabase.from('leads').update({ status: 'NEW' }).eq('id', lead.id); // revert so it can retry
    }
  }

  // ── Cerrar agent_run ───────────────────────────────────────────────────────
  await supabase.from('agent_runs').update({
    status: totalErrors === leads.length ? 'failed' : 'completed',
    leads_processed: leads.length - totalErrors,
    messages_generated: totalMessages,
    finished_at: new Date().toISOString(),
  }).eq('id', runId);

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log('─'.repeat(60));
  console.log(`✅ Leads analizados:    ${leads.length - totalErrors}`);
  console.log(`✅ Mensajes generados:  ${totalMessages} (4 por lead)`);
  if (totalErrors > 0) console.log(`❌ Errores:             ${totalErrors}`);

  if (firstLeadSummary) {
    console.log(`\nEjemplo primer lead:`);
    console.log(`  ${firstLeadSummary.name} | Score: ${firstLeadSummary.score}/10 | Pain: ${firstLeadSummary.pain}`);
    console.log(`  Paso 1 (${firstLeadSummary.step1Preview.length} chars): "${firstLeadSummary.step1Preview.slice(0, 80)}..."`);
  }
}

generateMessages();
