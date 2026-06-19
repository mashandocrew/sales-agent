import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const configRows = [
  {
    key: 'product',
    value: {
      name: 'Pip',
      url: 'https://soypip.com',
      description:
        'Plataforma de automatización conversacional para WhatsApp Business. Chatbot con IA, CRM conversacional, envíos masivos, plantillas con botones, etiquetas inteligentes, derivaciones automáticas, chat interno, API/Webhooks, analytics, integración Instagram.',
      value_props: [
        'Reducción del 80% en tiempos de respuesta',
        'Aumento del 40% en tasa de respuesta con plantillas interactivas',
        'Escalabilidad sin sumar headcount',
        'Todo el equipo en un solo lugar con chat interno',
        'Integración con Instagram y API abierta',
      ],
      fee_usd: 270,
    },
  },
  {
    key: 'sales_targets',
    value: {
      fee_promedio_usd: 270,
      meta_clientes_mes: 11,
      meta_comisiones_usd: 900,
      comision_porcentaje: 0.30,
      sueldo_base_ars: 800000,
    },
  },
  {
    key: 'outreach_config',
    value: {
      max_connections_per_day: 25,
      max_messages_per_day: 50,
      days_between_steps: {
        connection_to_step2: 3,
        step2_to_step3: 4,
        step3_to_step4: 7,
      },
      cooldown_cold_days: 90,
      min_employees: 10,
      connection_note_max_chars: 300,
      message_max_chars: 500,
      breakup_max_chars: 250,
    },
  },
  {
    key: 'icp',
    value: {
      titles: [
        'CEO', 'COO', 'Founder', 'Co-Founder', 'Head of Sales',
        'Director Comercial', 'VP Operations', 'Owner', 'Gerente General',
        'Director de Ventas', 'CMO',
      ],
      verticals: {
        ecommerce: {
          name: 'e-Commerce & Retail',
          pain_points: [
            'Respuestas lentas en WhatsApp pierden ventas',
            'Carrito abandonado sin seguimiento automático',
            'Soporte post-venta colapsado',
            'Consultas repetitivas saturan al equipo',
          ],
          keywords_es: ['ecommerce', 'tienda online', 'retail', 'shopify', 'woocommerce', 'dropshipping', 'venta online'],
        },
        real_estate: {
          name: 'Real Estate',
          pain_points: [
            'Consultas de disponibilidad repetitivas',
            'Leads se enfrían esperando respuesta',
            'Agentes pierden tiempo en preguntas básicas',
          ],
          keywords_es: ['inmobiliaria', 'bienes raíces', 'realtor', 'broker', 'propiedades'],
        },
        salud: {
          name: 'Clínicas & Salud',
          pain_points: [
            'Gestión manual de turnos por WhatsApp',
            'Pacientes no reciben confirmación automática',
            'Recepción colapsada con consultas repetitivas',
          ],
          keywords_es: ['clínica', 'consultorio', 'médico', 'dental', 'salud'],
        },
        saas: {
          name: 'SaaS & Agencias',
          pain_points: [
            'Soporte no escala con el crecimiento',
            'Onboarding manual de cada cliente',
            'Churn por tiempos de respuesta lentos',
          ],
          keywords_es: ['saas', 'software', 'agencia digital', 'marketing digital'],
        },
        gastronomia: {
          name: 'Gastronomía & Hotelería',
          pain_points: [
            'Reservas por WhatsApp sin automatizar',
            'Menú y disponibilidad: mismas preguntas todo el día',
            'Pedidos se pierden en el chat',
          ],
          keywords_es: ['restaurante', 'hotel', 'gastronomía', 'catering', 'food delivery'],
        },
      },
      markets: {
        usa_es: {
          locations: ['Miami', 'Houston', 'San Antonio', 'Los Angeles', 'New York', 'Dallas', 'Tampa'],
          language: 'es',
          tone: 'Profesional y cercano. Enfocado en resultados y ahorro. Español neutro.',
        },
        usa_en: {
          locations: ['Miami', 'Dallas', 'Austin', 'Phoenix', 'Tampa'],
          language: 'en',
          tone: 'Direct, ROI-focused, no fluff. Efficiency and scale.',
        },
        latam: {
          locations: ['CDMX', 'Bogotá', 'Buenos Aires', 'Santiago', 'Lima', 'Medellín', 'Monterrey'],
          language: 'es',
          tone: 'Cercano y experto. Ahorro de costos y mejora de atención al cliente.',
        },
      },
    },
  },
  {
    key: 'message_templates',
    value: {
      step1_connection_note: {
        type: 'connection_note',
        description: 'Nota de conexión de LinkedIn. CERO pitch. Solo curiosidad o reconocimiento genuino.',
        max_chars: 300,
        rules: [
          'NUNCA usar: Espero que estés bien, Me gustaría presentarme, Soy X de Y',
          'NUNCA mencionar Pip, WhatsApp, automatización ni venta en este paso',
          'SÍ mencionar algo específico de su empresa, cargo o industria',
          'Debe sonar 100% humano, como si de verdad te interesara conectar',
          'Usar nombre del prospecto y nombre de su empresa siempre',
          'Máximo 300 caracteres ESTRICTO (LinkedIn lo corta)',
        ],
      },
      step2_value: {
        type: 'linkedin_message',
        description: 'Primer mensaje después de que aceptó conexión. Mostrar valor concreto.',
        max_chars: 500,
        rules: [
          'Agradecer brevemente la conexión (1 línea)',
          'Mencionar resultado cuantificable de empresa similar en su industria',
          'Relacionar con su pain point específico',
          'NO pedir reunión todavía',
          "Cerrar con algo como 'si te interesa saber más, con gusto te cuento'",
        ],
      },
      step3_cta: {
        type: 'linkedin_message',
        description: 'CTA suave. Ofrecer algo tangible de bajo compromiso.',
        max_chars: 400,
        rules: [
          'Ofrecer enviar video de 30 segundos o caso de estudio',
          'Mencionar empresa/industria similar que ya lo usa',
          'Pregunta cerrada de sí/no, no abierta',
          'No ser insistente',
        ],
      },
      step4_breakup: {
        type: 'linkedin_message',
        description: 'Mensaje de cierre. Dejar puerta abierta sin insistir.',
        max_chars: 250,
        rules: [
          'Breve y respetuoso',
          'Sin resentimiento ni presión',
          'Dejar claro que pueden escribir cuando quieran',
        ],
      },
    },
  },
  {
    key: 'sales_stages',
    value: {
      stages: [
        { id: 'PROSPECTADO',       label: 'Prospectado',        order: 1, color: '#6b7280' },
        { id: 'CONTACTADO',        label: 'Contactado',         order: 2, color: '#3b82f6' },
        { id: 'EN_CONVERSACION',   label: 'En conversación',    order: 3, color: '#8b5cf6' },
        { id: 'PROPUESTA_ENVIADA', label: 'Propuesta enviada',  order: 4, color: '#f59e0b' },
        { id: 'NEGOCIACION',       label: 'Negociación',        order: 5, color: '#f97316' },
        { id: 'CERRADO_GANADO',    label: 'Cerrado ✅',          order: 6, color: '#10b981' },
        { id: 'CERRADO_PERDIDO',   label: 'Perdido ❌',          order: 7, color: '#ef4444' },
      ],
    },
  },
];

async function seedConfig() {
  const { data, error } = await supabase
    .from('config')
    .upsert(configRows, { onConflict: 'key' })
    .select('key');

  if (error) {
    console.error('Error al insertar config:', error.message);
    process.exit(1);
  }

  console.log(`✅ Config insertada: ${data?.length ?? 0} filas en tabla config`);
  data?.forEach((row) => console.log(`   • ${row.key}`));
}

seedConfig();
