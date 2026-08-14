import express from "express";
import path from "path";
import dotenv from "dotenv";
import os from "os";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { calculateMetalonStructure, generateReportMarkdown, getPortugueseDate, parseProfileInfo } from "./src/utils/calculator";

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
    const {
      largura,
      altura,
      perfilExterno,
      perfilInterno,
      perfil,
      vaoMaximo,
      vaoMaxHoriz,
      vaoMaxVert,
      faceExternoMm,
      profundidadeExternoMm,
      faceInternoMm,
      profundidadeInternoMm,
      posicaoExterno,
      posicaoInterno,
    } = req.body;

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

    const numFaceExt = typeof faceExternoMm === 'number' && faceExternoMm > 0 ? faceExternoMm : undefined;
    const numProfExt = typeof profundidadeExternoMm === 'number' && profundidadeExternoMm > 0 ? profundidadeExternoMm : undefined;
    const numFaceInt = typeof faceInternoMm === 'number' && faceInternoMm > 0 ? faceInternoMm : undefined;
    const numProfInt = typeof profundidadeInternoMm === 'number' && profundidadeInternoMm > 0 ? profundidadeInternoMm : undefined;

    const calcResult = calculateMetalonStructure({
      largura: numLargura,
      altura: numAltura,
      perfilExterno: perfilExtStr,
      perfilInterno: perfilIntStr,
      vaoMaxHoriz: vaoMaxHorizCm,
      vaoMaxVert: vaoMaxVertCm,
      faceExternoMm: numFaceExt,
      profundidadeExternoMm: numProfExt,
      faceInternoMm: numFaceInt,
      profundidadeInternoMm: numProfInt,
    });

    const {
      profileExt,
      profileInt,
      isSameProfile,
      linhasHorizontais,
      vaosVerticais,
      vaoLivreVert,
      colunasVerticais,
      vaosHorizontais,
      vaoLivreHoriz,
      vertCutLength,
      horizExtCount,
      horizIntCount,
      vertExtCount,
      vertIntCount,
      metragemExtHoriz,
      metragemExtVert,
      metragemExtTotal,
      metragemIntHoriz,
      metragemIntVert,
      metragemIntTotal,
      totalMetragemLinear,
      teoricoBarrasGeral,
      totalSemEmendaSemOpt,
      totalSemEmendaComOpt,
      totalComEmendaComOpt,
      extScenario1,
      extScenario2,
      extScenario3,
      intScenario1,
      intScenario2,
      intScenario3,
      weldsCountScenario1,
      weldsCountScenario2,
      weldsCountScenario3,
    } = calcResult;

    const extFaceMmStr = (profileExt.faceSizeM * 1000).toFixed(0);
    const intFaceMmStr = (profileInt.faceSizeM * 1000).toFixed(0);
    const widthStr = numLargura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const heightStr = numAltura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const prompt = `Atue como um serralheiro e calculista de estruturas metálicas experiente. 
Preciso calcular a quantidade exata de barras de metalon para uma estrutura retangular, apresentando OBRIGATORIAMENTE OS 3 CENÁRIOS DE CORTE no quadro comparativo final (Seção 4) para que o cliente defina o método desejado.

OS VALORES MATEMÁTICOS DESTE PROJETO JÁ FORAM RIGOROSAMENTE CALCULADOS PELO MOTOR DE OTIMIZAÇÃO (BIN-PACKING) E DEVEM SER UTILIZADOS OBRIGATORIAMENTE SEM ALTERAÇÃO:
- Dimensões: ${widthStr} m × ${heightStr} m
- Estrutura Horizontal: ${linhasHorizontais} linhas (${vaosVerticais} vãos de ${vaoLivreVert.toLocaleString("pt-BR")} m de vão livre)
- Estrutura Vertical: ${colunasVerticais} colunas (${vaosHorizontais} vãos de ${vaoLivreHoriz.toLocaleString("pt-BR")} m de vão livre)
- Comprimento real de corte por coluna: ${vertCutLength.toLocaleString("pt-BR")} m (com desconto de 2× ${extFaceMmStr} mm do perfil de borda)
- Metragem Linear Total: ${totalMetragemLinear.toLocaleString("pt-BR")} m (Consumo teórico: ${teoricoBarrasGeral} barras de 6m)
- Cenário 1 (Sem Emenda e Sem Otimização): ${totalSemEmendaSemOpt} barra(s) (${weldsCountScenario1} soldas)
- Cenário 2 (Sem Emenda com Otimização): ${totalSemEmendaComOpt} barra(s) (${weldsCountScenario2} soldas)
- Cenário 3 (Com Emenda e Otimização Total - Melhor Cenário): ${totalComEmendaComOpt} barra(s) (${weldsCountScenario3} soldas)

${
  !isSameProfile
    ? `- Divisão por Perfil:
  * Perfil Externo (${profileExt.name}): Cenário 1 = ${extScenario1} barras, Cenário 2 = ${extScenario2} barras, Cenário 3 = ${extScenario3} barras.
  * Perfil Interno (${profileInt.name}): Cenário 1 = ${intScenario1} barras, Cenário 2 = ${intScenario2} barras, Cenário 3 = ${intScenario3} barras.`
    : ""
}

Formato da resposta (obrigatório em Markdown):

## Considerações Técnicas do Perfil
- **Dimensões da Estrutura:** ${widthStr} m × ${heightStr} m
${
  isSameProfile
    ? `- **Perfil Metalon Selecionado:** ${profileExt.name} (${profileExt.positionDesc})`
    : `- **Perfil Metalon Externo (Borda):** ${profileExt.name} (${profileExt.positionDesc})\n- **Perfil Metalon Interno (Travessas):** ${profileInt.name} (${profileInt.positionDesc})`
}
- **Vão Máximo Horizontal (Colunas):** ${vaoMaxHorizCm} cm (${vaoHorizM.toLocaleString("pt-BR")} m)
- **Vão Máximo Vertical (Linhas):** ${vaoMaxVertCm} cm (${vaoVertM.toLocaleString("pt-BR")} m)
- **Desconto de Encaixe:** -${(profileExt.faceSizeM * 2 * 1000).toFixed(0)} mm no comprimento de corte das colunas verticais

---

## 1. Estrutura Horizontal
* Linhas Horizontais Totais: **${linhasHorizontais} linhas** (${vaosVerticais} vãos de **${vaoLivreVert.toLocaleString("pt-BR")} m** de vão livre)
* Linhas de Borda Externa (${profileExt.name}): **${horizExtCount} linhas** de **${widthStr} m** = **${metragemExtHoriz.toLocaleString("pt-BR")} m**
${horizIntCount > 0 ? `* Linhas Internas (${profileInt.name}): **${horizIntCount} linhas** de **${widthStr} m** = **${metragemIntHoriz.toLocaleString("pt-BR")} m**\n` : ""}

---

## 2. Estrutura Vertical (Com Desconto do Perfil Externo)
* Colunas Verticais Totais: **${colunasVerticais} colunas** (${vaosHorizontais} vãos de **${vaoLivreHoriz.toLocaleString("pt-BR")} m** de vão livre)
* **Comprimento real de corte por coluna:** **${vertCutLength.toLocaleString("pt-BR")} m** (com desconto de 2× ${extFaceMmStr} mm dos perfis de contorno)
* Colunas de Borda Externa (${profileExt.name}): **${vertExtCount} colunas** = **${metragemExtVert.toLocaleString("pt-BR")} m**
${vertIntCount > 0 ? `* Colunas Internas (${profileInt.name}): **${vertIntCount} colunas** = **${metragemIntVert.toLocaleString("pt-BR")} m**\n` : ""}

---

## 3. Plano de Corte Otimizado (Reaproveitamento de Sobras)
(Explicação técnica clara da recombinação de sobras de cortes maiores com peças verticais menores e da lógica de otimização de barras, destacando que a Tabela de Corte de Barras para a Produção na Seção 7 reflete o Cenário 3 com exatamente ${totalComEmendaComOpt} barras).

---

## 4. Resultado e Quadro Comparativo de Consumo

${
  isSameProfile
    ? `| Cenário / Método de Corte | Pontos de Solda / Emendas | Total de Barras (6m) |
| :------------------------ | :-----------------------: | :------------------: |
| **1. Sem Emenda e Sem Otimização** | ${weldsCountScenario1} solda(s) | **${totalSemEmendaSemOpt} barra(s)** |
| **2. Sem Emenda com Otimização** | ${weldsCountScenario2} solda(s) | **${totalSemEmendaComOpt} barra(s)** |
| **3. Com Emenda e Otimização Total** | ${weldsCountScenario3} solda(s) | **${totalComEmendaComOpt} barra(s)** |`
    : `| Cenário / Método de Corte | Perfil Externo (${profileExt.name}) | Perfil Interno (${profileInt.name}) | Total de Barras (6m) |
| :------------------------ | :---------------------------------: | :---------------------------------: | :------------------: |
| **1. Sem Emenda e Sem Otimização** | ${extScenario1} barra(s) | ${intScenario1} barra(s) | **${totalSemEmendaSemOpt} barra(s)** |
| **2. Sem Emenda com Otimização** | ${extScenario2} barra(s) | ${intScenario2} barra(s) | **${totalSemEmendaComOpt} barra(s)** |
| **3. Com Emenda e Otimização Total** | ${extScenario3} barra(s) | ${intScenario3} barra(s) | **${totalComEmendaComOpt} barra(s)** |`
}

CRÍTICO: NÃO INCLUA NENHUMA COLUNA CHAMADA 'Metragem Comprada' OU 'Avaliação de Custo'. O relatório em Markdown termina rigorosamente após a Seção 4.
`;

    // Call Gemini API
    const geminiInfo = getGeminiClient();
    if (!geminiInfo) {
      console.log("[Calculation] Gemini key not configured, using local calculation engine");
      const fallbackMarkdown = generateReportMarkdown(
        numLargura,
        numAltura,
        perfilExtStr,
        perfilIntStr,
        vaoMaxHorizCm,
        vaoMaxVertCm,
        numFaceExt,
        numProfExt,
        numFaceInt,
        numProfInt
      );
      return res.json({
        markdown: fallbackMarkdown,
        source: "calculator",
        modelUsed: "local-engine",
        date: dateFormatted,
        geminiStatus: "fallback"
      });
    }

    // Candidate models ordered for optimal quality with automatic retry and quota fallback
    const candidateModels = [
      "gemini-3.7-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview",
      "gemini-flash-latest",
    ];
    let lastGeminiError: string | null = null;
    let successfulModel: string | null = null;

    for (const modelName of candidateModels) {
      // Try up to 2 attempts per candidate model with brief delay if overloaded
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[Gemini Request] Attempting calculation with model: ${modelName} (attempt ${attempt})`);
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
          console.warn(`[Gemini Fallback] Model ${modelName} (attempt ${attempt}) returned error or quota limit reached. Switching... Reason:`, geminiErr?.message || geminiErr);
          // Wait 300ms before retrying or switching
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    }

    // High availability fallback: If Gemini models are temporarily experiencing high demand (503/429), use the verified local calculation engine
    console.warn("[Gemini Fallback] All Gemini candidate models unavailable. Using local calculation engine as fallback.");
    const fallbackMarkdown = generateReportMarkdown(
      numLargura,
      numAltura,
      perfilExtStr,
      perfilIntStr,
      vaoMaxHorizCm,
      vaoMaxVertCm,
      numFaceExt,
      numProfExt,
      numFaceInt,
      numProfInt
    );
    return res.json({
      markdown: fallbackMarkdown,
      source: "calculator",
      modelUsed: "local-engine",
      date: dateFormatted,
      geminiStatus: "fallback",
      warning: "Cálculo gerado com o motor matemático de precisão local devido à alta demanda temporária nos servidores do Gemini."
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
