export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const { marca, formato, idea, password } = req.body;
  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Contrasena incorrecta' });
  }

  const BRAND_CONTEXT = {
    naiqo: {
      nombre: 'Naiqo',
      descripcion: 'SaaS de inteligencia artificial para salones de unas. Automatiza la gestion de citas, clientes y comunicaciones. Dirigido a duenos/as de nail salons en Espana y Latinoamerica.',
      audiencia: 'Duenos y duenas de salones de unas',
      instagram: '@naiqo_vdo',
      tiktok: '@naiqoia'
    },
    ollotechs: {
      nombre: 'Ollotechs',
      descripcion: 'Consultoria de inteligencia artificial para el sector belleza: salones de unas, peluquerias, barberias, centros de estetica y salones de tatuajes. Crea agentes de IA personalizados para automatizar reservas, atencion al cliente y gestion del negocio.',
      audiencia: 'Duenos y gestores de negocios del sector belleza',
      instagram: '@ollotechs',
      tiktok: '@ollotechs'
    }
  };

  const FORMAT_CONTEXT = {
    dolor: {
      nombre: '"Esto te esta costando dinero"',
      descripcion: 'Revela un problema costoso que el dueno del salon no sabe que tiene. Primero el gancho (dato impactante), luego el problema, luego la solucion implicita.'
    },
    demo: {
      nombre: '"Mira lo que hace la IA"',
      descripcion: 'Demostracion de como funciona la tecnologia. Sin explicaciones largas, solo mostrar el resultado sorprendente.'
    },
    insight: {
      nombre: '"Lo que descubri trabajando con salones"',
      descripcion: 'Historia o reflexion personal desde la experiencia. Genera autoridad y confianza. Formato: observacion - leccion - aplicacion practica.'
    }
  };

  const brand = BRAND_CONTEXT[marca];
  const fmt = FORMAT_CONTEXT[formato];

  if (!brand || !fmt) {
    return res.status(400).json({ ok: false, error: 'Marca o formato invalido' });
  }

  const systemPrompt = `Eres un experto en marketing de contenido viral para redes sociales, especializado en el sector belleza y tecnologia.

Conoces perfectamente la marca ${brand.nombre}: ${brand.descripcion}

Tu objetivo es crear contenido que:
1. Para en el scroll - el primer segundo es todo
2. Genere identificacion inmediata en la audiencia: ${brand.audiencia}
3. Sea autentico y no parezca publicidad
4. Lleve a guardar, compartir o seguir la cuenta
5. Este en espanol de Espana (tuteo, natural, sin ser demasiado formal)

Devuelve SIEMPRE en este formato JSON exacto (sin markdown, sin explicaciones extra):
{
  "gancho": "Primera frase del video - debe parar el scroll en menos de 3 segundos",
  "guion": "Guion completo del video (60-90 segundos al hablar). Usa saltos de linea para indicar pausas. Incluye indicaciones de tono entre [corchetes].",
  "caption_ig": "Caption para Instagram. Max 150 palabras. Empieza con el gancho. Incluye llamada a la accion al final.",
  "caption_tiktok": "Caption para TikTok. Mas corto, mas directo. Max 80 palabras.",
  "hashtags": "Entre 15-20 hashtags relevantes separados por espacios. Mix de grandes y nicho.",
  "titulo_contenido": "Titulo corto para identificar este contenido (max 8 palabras)"
}`;

  const userMessage = `Marca: ${brand.nombre}
Formato: ${fmt.nombre} - ${fmt.descripcion}
Idea/tema: ${idea}
Instagram: ${brand.instagram} | TikTok: ${brand.tiktok}

Crea el contenido para este video.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();
    if (!data.content || !data.content[0]) {
      throw new Error('Respuesta inesperada de la API');
    }

    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No se pudo parsear la respuesta');

    const content = JSON.parse(jsonMatch[0]);
    content.id = Date.now();
    content.fecha = new Date().toISOString();
    content.marca = marca;
    content.formato = formato;
    content.idea = idea;

    return res.status(200).json({ ok: true, content });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
