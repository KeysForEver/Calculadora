import express from "express";
import path from "path";
import dotenv from "dotenv";
import os from "os";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { generateReportMarkdown, getPortugueseDate, parseProfileInfo } from "./src/utils/calculator";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy initialization helper for Gemini AI
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

app.get("/api/calculate", (req, res) => {
  const geminiInfo = getGeminiClient();
  const hasKey = Boolean(geminiInfo);
  return res.status(200).json({
    status: 'online',
    geminiConfigured: hasKey,
    keyPrefix: hasKey && geminiInfo ? `${geminiInfo.key.substring(0, 5)}...` : null,
    message: hasKey
      ? 'API do Gemini configurada e ativa no ambiente!'
      : 'GEMINI_API_KEY não foi encontrada ou é inválida nas variáveis de ambiente.'
  });
});

app.post("/api/calculate", async (req, res) => {
  try {
    const { largura, altura, perfilExterno, perfilInterno, perfil, vaoMaximo, vaoMaxHoriz, vaoMaxVert } = req.body;

    const perfilExtStr = String(perfilExterno || perfil || "").trim();
    const perfilIntStr = String(perfilInterno || perfilExterno || perfil || "").trim();

    if (!largura || !altura || !perfilExtStr) {
      return res.status(400).json({ error: "Largura, altura e perfil de metalon são obrigatórios." });
    }

    const numLargura = parseFloat(String(largura).replace(",", "."));
    const numAltura = parseFloat(String(altura).replace(",", "."));

    const rawVaoHoriz = vaoMaxHoriz !== undefined ? parseFloat(String(vaoMaxHoriz).replace(",", ".")) : (vaoMaximo ? parseFloat(String(vaoMaximo).replace(",", ".")) : 80);
    const rawVaoVert = vaoMaxVert !== undefined ? parseFloat(String(vaoMaxVert).replace(",", ".")) : (vaoMaximo ? parseFloat(String(vaoMaximo).replace(",", ".")) : 80);

    const vaoMaxHorizCm = (isNaN(rawVaoHoriz) || rawVaoHoriz <= 0) ? 80 : rawVaoHoriz;
    const vaoMaxVertCm = (isNaN(rawVaoVert) || rawVaoVert <= 0) ? 80 : rawVaoVert;

    const vaoHorizM = vaoMaxHorizCm / 100;
    const vaoVertM = vaoMaxVertCm / 100;

    if (isNaN(numLargura) || isNaN(numAltura) || numLargura <= 0 || numAltura <= 0) {
      return res.status(400).json({ error: "Largura e altura devem ser números positivos válidos." });
    }

    const dateFormatted = getPortugueseDate();

    const profileExtInfo = parseProfileInfo(perfilExtStr);
    const profileIntInfo = parseProfileInfo(perfilIntStr);
    const isSame = profileExtInfo.name.toLowerCase().replace(/\s+/g, '') === profileIntInfo.name.toLowerCase().replace(/\s+/g, '');

    const prompt = `Atue como um serralheiro e calculista de estruturas metálicas experiente. 
Preciso calcular a quantidade exata de barras de metalon para uma estrutura retangular, apresentando OBRIGATORIAMENTE OS 3 CENÁRIOS DE CORTE no quadro comparativo final para que o cliente defina o método desejado.

Regras fundamentais de cálculo e otimização:
1. Comprimento de cada barra de metalon padrão disponível no mercado: 6 metros.
2. ESPAÇAMENTOS MÁXIMOS PERMITIDOS (VÃO LIVRE):
   - Vão Máximo Horizontal (entre colunas verticais na largura): **${vaoMaxHorizCm} cm** (${vaoHorizM.toString().replace(".", ",")} metros).
   - Vão Máximo Vertical (entre linhas horizontais na altura): **${vaoMaxVertCm} cm** (${vaoVertM.toString().replace(".", ",")} metros).
3. PERFIS DE METALON UTILIZADOS:
   - Perfil Externo (Borda/Contorno): ${profileExtInfo.name} (Face do perfil: ${profileExtInfo.faceSizeM * 1000} mm).
   - Perfil Interno (Travessas/Grades): ${profileIntInfo.name} (Face do perfil: ${profileIntInfo.faceSizeM * 1000} mm).
4. DESCONTO DAS DIMENSÕES DO PERFIL NAS COLUNAS VERTICAIS:
   - Todas as colunas verticais se encaixam entre as barras horizontais superior e inferior da borda externa.
   - Portanto, o comprimento de corte real de cada coluna vertical DEVE descontar 2x a largura da face do Perfil Externo: Comprimento Corte Vert = Altura - (2 × ${profileExtInfo.faceSizeM} m) = ${(numAltura - 2 * profileExtInfo.faceSizeM).toFixed(3)} m.
5. HIERARQUIA DE OTIMIZAÇÃO DE CUSTO E SOLDAGEM:
   - PRIORIDADE 1 (Mais importante): Menor número total de barras de 6m a comprar (redução do custo de matéria-prima).
   - PRIORIDADE 2 (Secundária): Menor número de pontos de solda / emendas adicionais nas barras. Quanto mais soldas forem necessárias, mais complexo e caro é o processo de fabricação no chão de fábrica.
   - REGRA DE DECISÃO: Se o Cenário 2 (Sem Emenda com Otimização) atingir a MESMA quantidade total de barras de 6m que o Cenário 3 (Com Emenda e Otimização Total), o Cenário 2 DEVE ser apontado como OTIMIZADO E RECOMENDADO, pois atinge a compra mínima SEM gastar tempo ou mão de obra em soldas intermediárias.
6. OS 3 CENÁRIOS OBRIGATÓRIOS PARA A SEÇÃO 4:
   - Cenário 1: "Sem Emenda e Sem Otimização" -> Compra direta por peça isolada. (0 soldas intermediárias)
   - Cenário 2: "Sem Emenda com Otimização de Corte" -> Peças inteiras sem soldas intermediárias, aproveitando sobras com outras peças inteiras do projeto. (0 soldas intermediárias)
   - Cenário 3: "Com Emenda e Otimização Total" -> Otimização máxima permitindo emendas de retalhos para tentar reduzir barras. Indica os pontos de solda necessários.

Dimensões da estrutura:
- Largura: [${numLargura.toString().replace(".", ",")} metros]
- Altura: [${numAltura.toString().replace(".", ",")} metros]
- Perfil Externo: [${profileExtInfo.name}]
- Perfil Interno: [${profileIntInfo.name}]
- Vão máximo horizontal (entre colunas): [${vaoMaxHorizCm} cm]
- Vão máximo vertical (entre linhas): [${vaoMaxVertCm} cm]

Formato da resposta (obrigatório em Markdown):

## Considerações Técnicas do Perfil
- **Dimensões da Estrutura:** [x] m × [y] m
- **Perfil Metalon Externo (Borda):** ${profileExtInfo.name}
- **Perfil Metalon Interno (Travessas):** ${profileIntInfo.name}
- **Vão Máximo Horizontal (Colunas):** ${vaoMaxHorizCm} cm
- **Vão Máximo Vertical (Linhas):** ${vaoMaxVertCm} cm
- **Desconto de Encaixe:** -[2x face do perfil externo em mm] mm no comprimento de corte das colunas verticais

---

## 1. Estrutura Horizontal
* Linhas Horizontais: **[qtd] linhas** ([vãos] vãos de **[vão livre] m** entre perfis)
* Detalhar linhas externas (${profileExtInfo.name}) e linhas internas (${profileIntInfo.name})

---

## 2. Estrutura Vertical (Com Desconto do Perfil Externo)
* Colunas Verticais: **[qtd] colunas** ([vãos] vãos de **[vão livre] m** entre perfis)
* Comprimento real de corte por coluna: **[altura - 2x perfil externo] m**
* Detalhar colunas externas (${profileExtInfo.name}) e colunas internas (${profileIntInfo.name})

---

## 3. Plano de Corte Otimizado (Reaproveitamento de Sobras)
(Na Seção 3, NÃO liste barra por barra. Apresente exclusivamente a explicação técnica e a memória de cálculo: demanda linear total, consumo teórico mínimo de barras de 6m, lógica de reaproveitamento de sobras das peças horizontais para cortar as colunas verticais menores e critérios de aproveitamento entre peças inteiras versus soldagem).

---

## 4. Resultado e Quadro Comparativo de Consumo
[Apresente a tabela comparativa exibindo OBRIGATORIAMENTE as linhas para os 3 Cenários. Se os perfis forem diferentes, exiba as colunas: | Cenário / Método de Corte | Perfil Externo | Perfil Interno | Total de Barras (6m) |. Se o perfil for único, exiba as 3 colunas: | Cenário / Método de Corte | Pontos de Solda / Emendas | Total de Barras (6m) |].
CRÍTICO: NÃO INCLUA NENHUMA COLUNA CHAMADA 'Metragem Comprada' OU 'Avaliação de Custo'. As colunas devem focar exclusivamente nas 3 colunas de consumo e cortes.
OBRIGATÓRIO: Na Seção 4, exiba APENAS a tabela comparativa dos 3 cenários, sem nenhum texto ou marcador abaixo dela. Finalize o relatório após a Seção 4.
`;

    // Call Gemini API strictly
    const geminiInfo = getGeminiClient();
    if (!geminiInfo) {
      return res.status(502).json({
        error: "Erro de processamento, contate o administrador do sistema.",
        geminiStatus: "failed"
      });
    }

    // Candidate models ordered for optimal quality with automatic quota fallback
    const candidateModels = [
      "gemini-3.7-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest"
    ];
    let lastGeminiError: string | null = null;
    let successfulModel: string | null = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[Gemini Request] Attempting calculation with model: ${modelName}`);
        const response = await geminiInfo.client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.1,
            systemInstruction: `Você é um especialista em serralheria e cálculo de estruturas de metalon. Calcule com extrema precisão os vãos, linhas, colunas, metragens lineares e barras de 6 metros respeitando estritamente o vão máximo horizontal de ${vaoMaxHorizCm} cm (colunas) e vão máximo vertical de ${vaoMaxVertCm} cm (linhas) configurados pelo usuário. CRÍTICO E OBRIGATÓRIO: Na tabela da Seção 4, NUNCA INCLUA a coluna 'Metragem Comprada' nem 'Avaliação de Custo'. O relatório de texto termina rigorosamente após a Seção 4. Responda rigorosamente no formato especificado em Markdown.`,
          },
        });

        if (response && response.text) {
          let cleanedText = response.text;
          cleanedText = cleanedText.replace(/\|\s*Metragem Comprada[^\n|]*/gi, '');
          cleanedText = cleanedText.replace(/\|\s*Avalia[çc][ãa]o de Custo[^\n|]*/gi, '');
          cleanedText = cleanedText.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();
          successfulModel = modelName;
          console.log(`[Gemini Success] Successfully generated report using model: ${modelName}`);
          return res.json({
            markdown: cleanedText,
            source: "gemini",
            modelUsed: successfulModel,
            date: dateFormatted,
            geminiStatus: "success"
          });
        }
      } catch (geminiErr: any) {
        lastGeminiError = geminiErr?.message || String(geminiErr);
        console.warn(`[Gemini Fallback] Model ${modelName} returned error or quota limit reached. Switching to next model... Reason:`, geminiErr?.message || geminiErr);
      }
    }

    // Strict Enforcement: Return error to client if Gemini fails
    return res.status(502).json({
      error: "Erro de processamento, contate o administrador do sistema.",
      geminiStatus: "failed"
    });

  } catch (error: any) {
    console.error("Error in /api/calculate:", error);
    res.status(500).json({ error: "Erro de processamento, contate o administrador do sistema." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    const interfaces = os.networkInterfaces();
    const networkIps: string[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          networkIps.push(iface.address);
        }
      }
    }

    console.log("\n==================================================");
    console.log("  🚀 Servidor do SkyCalc Iniciado!");
    console.log("==================================================");
    console.log(`  > Local:       http://localhost:${PORT}/`);
    if (networkIps.length > 0) {
      networkIps.forEach((ip) => {
        console.log(`  > Na sua rede: http://${ip}:${PORT}/`);
      });
    } else {
      console.log(`  > Na sua rede: http://<SEU_IP_LOCAL>:${PORT}/`);
    }
    console.log("==================================================\n");
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar o servidor Express/Vite:", err);
});
