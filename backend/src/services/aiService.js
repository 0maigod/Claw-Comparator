import { GoogleGenAI, Type } from '@google/genai';

export async function extractConceptsFromDiff(agentName, filesDiffData) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY no configurada. Por favor añade el .env en la ruta backend.');
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Armamos un bloque de texto que describe el diff (limitado para no saturar el contexto)
    const MAX_DIFF_CHARS = 30000;
    let diffStream = '';
    for (const fileData of filesDiffData) {
        const fileHeader = `\n--- FILE: ${fileData.path} ---\n`;
        let fileBlock = fileHeader;
        fileData.diffs.forEach(d => {
            const token = d.added ? '+' : d.removed ? '-' : ' ';
            fileBlock += `${token}${d.value}`;
        });
        if (diffStream.length + fileBlock.length > MAX_DIFF_CHARS) break;
        diffStream += fileBlock;
    }

    const prompt = `Eres un Arquitecto de Sistemas evaluando el cambio de código (Divergencia A -> B) del Agente: "${agentName}".

Tus directrices:
Identifica qué 'conceptos' (funcionalidades lógicas, librerías, lógicas de negocio relevantes) fueron AÑADIDOS, ELIMINADOS, o MUTADOS.

Categorías:
- added_concepts: Conceptos completamente nuevos que existen en B pero no en A (líneas con +).
- removed_concepts: Conceptos completamente eliminados que existían en A pero no en B (líneas con -).
- mutated_concepts: Conceptos que EXISTÍAN en A y continúan en B pero con cambios significativos de lógica, nombre, o parámetros. No es alta ni baja, es una transformación.

Para cada concepto en cualquier categoría:
1. concept: Título conciso y semántico (máximo 4 palabras).
2. size: Importancia jerárquica del cambio (int de 10 a 100, basado en su impacto).
3. diff_fragments: Un array de bloques directos que originaron al concepto.
    - old_code: string exacto que fue reemplazado o removido (o vacío si es completamente nuevo).
    - new_code: string exacto introducido (o vacío si fue completamente purgado).

Si no hay código modificado con impacto real, devuelve arrays vacíos. No alucines texto que no provea el diff.

--- CODE DIFF ---
${diffStream}
`;

    const conceptItemSchema = {
        type: Type.OBJECT,
        properties: {
            concept: { type: Type.STRING },
            size: { type: Type.INTEGER },
            diff_fragments: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        old_code: { type: Type.STRING },
                        new_code: { type: Type.STRING }
                    },
                    required: ["old_code", "new_code"]
                }
            }
        },
        required: ["concept", "size", "diff_fragments"]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            added_concepts:   { type: Type.ARRAY, items: conceptItemSchema },
            removed_concepts: { type: Type.ARRAY, items: conceptItemSchema },
            mutated_concepts: { type: Type.ARRAY, items: conceptItemSchema }
        },
        required: ["added_concepts", "removed_concepts", "mutated_concepts"]
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        }
    });

    const rawText = response.text;

    // Sanear caracteres de control que corrompen JSON (0x00-0x1F excepto \n, \t, \r)
    const sanitizedText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    try {
        return JSON.parse(sanitizedText);
    } catch (parseError) {
        throw new Error(`Gemini devolvio JSON invalido: ${parseError.message}. Response length: ${rawText.length}`);
    }
}

export default { extractConceptsFromDiff };
