import { GoogleGenAI } from "@google/genai";
import { generateReportMarkdown, getPortugueseDate, parseProfileInfo } from "../src/utils/calculator";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    console.warn("Could not initialize GoogleGenAI client:", err);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { altura, largura, perfilExterno, perfilInterno, perfil, vaoMaximo, vaoMaxHoriz, vaoMaxVert } = req.body || {};

    const numAltura = parseFloat(altura);
    const numLargura = parseFloat(largura);
    const perfilExt = perfilExterno || perfil || "30 x 30 mm";
    const perfilInt = perfilInterno || perfilExterno || perfil || "30 x 30 mm";

    const vaoMaxHorizCm = parseFloat(vaoMaxHoriz) || parseFloat(vaoMaximo) || 80;
    const vaoMaxVertCm = parseFloat(vaoMaxVert) || parseFloat(vaoMaximo) || 80;

    if (isNaN(numAltura) || isNaN(numLargura) || numAltura <= 0 || numLargura <= 0) {
      return res.status(400).json({ error: "Dimensões inválidas informadas." });
    }

    const isSameProfile = perfilExt.toLowerCase().replace(/\s+/g, '') === perfilInt.toLowerCase().replace(/\s+/g, '');
    const profileExtInfo = parseProfileInfo(perfilExt);
    const profileIntInfo = parseProfileInfo(perfilInt);
    const dateFormatted = getPortugueseDate();

    const gemini = getGeminiClient();

    if (gemini) {
      const prompt = `Você é um engenheiro calculista e especialista em serralheria e corte de estruturas metálicas de metalon.
Gere um relatório técnico formal, ultra-preciso, profissional e detalhado para a fabricação de uma estrutura metálica retangular em metalon.

REGRAS DE PROJETO OBRIGATÓRIAS:
1. PERFIS UTILIZADOS:
   ${isSameProfile 
     ? `- Perfil Único em Toda a Estrutura: ${profileExtInfo.name} (Face externa: ${profileExtInfo.faceSizeM * 1000} mm)`
     : `- Perfil Externo (Borda/Quadro): ${profileExtInfo.name} (Face: ${profileExtInfo.faceSizeM * 1000} mm)
- Perfil Interno (Travessas): ${profileIntInfo.name} (Face: ${profileIntInfo.faceSizeM * 1000} mm)`
   }
2. BARRAS HORIZONTAIS:
   - Todas as barras horizontais (superior, inferior e travessas intermediárias) cobrem a largura total de ${numLargura.toString().replace(".", ",")} metros.
3. COLUNAS VERTICAIS:
   - Todas as colunas verticais (laterais da borda e colunas intermediárias) são cortadas com desconto de 2x a face do perfil externo: (${numAltura.toString().replace(".", ",")} m - ${(profileExtInfo.faceSizeM * 2).toFixed(3).replace(".", ",")} m) = ${(numAltura - 2 * profileExtInfo.faceSizeM).toFixed(3).replace(".", ",")} m.
4. OS 3 CENÁRIOS OBRIGATÓRIOS PARA A SEÇÃO 4:
   - Cenário 1: "Sem Emenda e Sem Otimização" -> Compra direta por peça isolada.
   - Cenário 2: "Sem Emenda com Otimização de Corte" -> Peças inteiras sem soldas intermediárias, aproveitando sobras com outras peças inteiras.
   - Cenário 3: "Com Emenda e Otimização Total" -> Otimização máxima permitindo emendas de retalhos.
   - PRIORIDADE 1: Menor número total de barras de 6m.
   - PRIORIDADE 2: Menor número de pontos de solda. Se Cenário 2 e 3 tiverem a mesma quantidade de barras, Cenário 2 é o recomendado.

Dimensões: Largura ${numLargura.toString().replace(".", ",")} m × Altura ${numAltura.toString().replace(".", ",")} m.
Vão máx horiz: ${vaoMaxHorizCm} cm | Vão máx vert: ${vaoMaxVertCm} cm.

Responda em formato Markdown estruturado com:
## Considerações Técnicas do Perfil
## 1. Estrutura Horizontal
## 2. Estrutura Vertical (Com Desconto do Perfil Externo)
## 3. Plano de Corte Otimizado (Reaproveitamento de Sobras)
## 4. Resultado e Quadro Comparativo de Consumo
## 7. Tabela de Corte de Barras para a Produção
`;

      try {
        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.1,
            systemInstruction: `Você é um especialista em serralheria e cálculo de metalon. Calcule rigorosamente o projeto respeitando as dimensões. Na Seção 4, exiba APENAS a tabela comparativa dos 3 cenários sem a coluna Metragem Comprada.`,
          },
        });

        let cleanedText = response.text || "";
        cleanedText = cleanedText.replace(/\|\s*Metragem Comprada[^\n|]*/gi, '');
        return res.status(200).json({
          markdown: cleanedText,
          source: "gemini",
          date: dateFormatted
        });
      } catch (geminiError) {
        console.warn("Gemini generation failed, using local deterministic calculation:", geminiError);
      }
    }

    const fallbackMarkdown = generateReportMarkdown(
      numLargura,
      numAltura,
      perfilExt,
      perfilInt,
      vaoMaxHorizCm,
      vaoMaxVertCm
    );

    return res.status(200).json({
      markdown: fallbackMarkdown,
      source: "calculator",
      date: dateFormatted
    });
  } catch (err: any) {
    console.error("Calculation handler error:", err);
    return res.status(500).json({ error: "Erro ao processar cálculo.", details: err?.message });
  }
}
