import { GoogleGenAI } from "@google/genai";
import { generateReportMarkdown, getPortugueseDate, parseProfileInfo } from "../src/utils/calculator";

function getGeminiClient(): { client: GoogleGenAI; key: string } | null {
  const rawKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 10) {
    return null;
  }
  try {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    return { client, key: apiKey };
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

  // GET route for diagnostics / status check on Vercel
  if (req.method === 'GET') {
    const geminiInfo = getGeminiClient();
    const hasKey = Boolean(geminiInfo);
    return res.status(200).json({
      status: 'online',
      geminiConfigured: hasKey,
      keyPrefix: hasKey && geminiInfo ? `${geminiInfo.key.substring(0, 5)}...` : null,
      message: hasKey
        ? 'API do Gemini configurada e ativa no ambiente Vercel!'
        : 'Variável GEMINI_API_KEY não foi encontrada ou é inválida no Vercel. Lembre-se de fazer um Redeploy após adicionar a variável.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        console.warn("Error parsing req.body string:", parseErr);
      }
    }

    const { altura, largura, perfilExterno, perfilInterno, perfil, vaoMaximo, vaoMaxHoriz, vaoMaxVert } = body || {};

    const numAltura = parseFloat(String(altura || "").replace(",", "."));
    const numLargura = parseFloat(String(largura || "").replace(",", "."));
    const perfilExt = String(perfilExterno || perfil || "30 x 30 mm").trim();
    const perfilInt = String(perfilInterno || perfilExterno || perfil || "30 x 30 mm").trim();

    const rawVaoHoriz = vaoMaxHoriz !== undefined ? parseFloat(String(vaoMaxHoriz).replace(",", ".")) : (vaoMaximo ? parseFloat(String(vaoMaximo).replace(",", ".")) : 80);
    const rawVaoVert = vaoMaxVert !== undefined ? parseFloat(String(vaoMaxVert).replace(",", ".")) : (vaoMaximo ? parseFloat(String(vaoMaximo).replace(",", ".")) : 80);

    const vaoMaxHorizCm = (isNaN(rawVaoHoriz) || rawVaoHoriz <= 0) ? 80 : rawVaoHoriz;
    const vaoMaxVertCm = (isNaN(rawVaoVert) || rawVaoVert <= 0) ? 80 : rawVaoVert;

    const vaoHorizM = vaoMaxHorizCm / 100;
    const vaoVertM = vaoMaxVertCm / 100;

    if (isNaN(numAltura) || isNaN(numLargura) || numAltura <= 0 || numLargura <= 0) {
      return res.status(400).json({ error: "Dimensões inválidas informadas. Largura e altura devem ser números positivos." });
    }

    const isSameProfile = perfilExt.toLowerCase().replace(/\s+/g, '') === perfilInt.toLowerCase().replace(/\s+/g, '');
    const profileExtInfo = parseProfileInfo(perfilExt);
    const profileIntInfo = parseProfileInfo(perfilInt);
    const dateFormatted = getPortugueseDate();

    const geminiInfo = getGeminiClient();

    if (geminiInfo) {
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

Responda em formato Markdown estruturado contendo estritamente:
## Considerações Técnicas do Perfil
## 1. Estrutura Horizontal
## 2. Estrutura Vertical (Com Desconto do Perfil Externo)
## 3. Plano de Corte Otimizado (Reaproveitamento de Sobras)
## 4. Resultado e Quadro Comparativo de Consumo
(Na Seção 4, exiba apenas as 3 colunas principais: se mesmo perfil -> | Cenário / Método de Corte | Pontos de Solda / Emendas | Total de Barras (6m) |; se perfis diferentes -> | Cenário / Método de Corte | Perfil Externo | Perfil Interno | Total de Barras (6m) |. Não inclua nenhuma coluna de Avaliação de Custo nem Metragem Comprada. Finalize o relatório após a Seção 4).
`;

      const candidateModels = ["gemini-3.7-flash", "gemini-flash-latest"];
      let geminiSuccess = false;
      let cleanedText = "";
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          const response = await geminiInfo.client.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              temperature: 0.1,
              systemInstruction: `Você é um especialista em serralheria e cálculo de metalon. Calcule rigorosamente o projeto respeitando as dimensões. O relatório em texto deve conter exclusivamente até a Seção 4 (Quadro Comparativo de Consumo). Na Seção 4, exiba APENAS a tabela comparativa dos 3 cenários com as colunas de corte e barras, sem nenhuma coluna de 'Avaliação de Custo' ou 'Metragem Comprada'.`,
            },
          });

          if (response && response.text) {
            cleanedText = response.text;
            cleanedText = cleanedText.replace(/\|\s*Metragem Comprada[^\n|]*/gi, '');
            cleanedText = cleanedText.replace(/\|\s*Avalia[çc][ãa]o de Custo[^\n|]*/gi, '');
            cleanedText = cleanedText.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();
            geminiSuccess = true;
            break;
          }
        } catch (mErr) {
          lastError = mErr;
          console.warn(`Model ${modelName} failed on Vercel:`, mErr);
        }
      }

      if (geminiSuccess && cleanedText) {
        return res.status(200).json({
          markdown: cleanedText,
          source: "gemini",
          date: dateFormatted,
          geminiStatus: "success"
        });
      } else {
        console.warn("Gemini models failed on Vercel, falling back to algorithmic engine. Error:", lastError);
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
      date: dateFormatted,
      geminiStatus: geminiInfo ? "model_error_fallback" : "no_key_fallback"
    });
  } catch (err: any) {
    console.error("Calculation handler error:", err);
    return res.status(500).json({ error: "Erro ao processar cálculo.", details: err?.message });
  }
}
