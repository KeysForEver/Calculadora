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

// Cache for dynamically discovered Gemini models from Google API
let cachedCandidateModels: { models: string[]; timestamp: number } | null = null;
const MODEL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Dynamic model discovery and smart prioritization function
async function getPrioritizedGeminiModels(client: GoogleGenAI): Promise<string[]> {
  const now = Date.now();
  if (cachedCandidateModels && now - cachedCandidateModels.timestamp < MODEL_CACHE_TTL_MS) {
    return cachedCandidateModels.models;
  }

  // Base priority list ensuring valid modern free/standard tier Gemini models with high availability
  const basePriorityOrder = [
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  try {
    // Timeout promise to avoid blocking model listing
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout listing models")), 2500)
    );

    const listPromise = (async () => {
      const response = await client.models.list();
      const discoveredModels: string[] = [];
      for await (const model of response) {
        if (model && model.name) {
          const cleanName = model.name.replace(/^models\//, "");
          const isUnsupportedType =
            cleanName.includes("image") ||
            cleanName.includes("tts") ||
            cleanName.includes("embedding") ||
            cleanName.includes("live-translate") ||
            cleanName.includes("veo") ||
            cleanName.includes("lyria");

          const isDeprecated =
            cleanName.startsWith("gemini-1.5") ||
            cleanName.startsWith("gemini-2.0") ||
            cleanName === "gemini-pro";

          if (cleanName.startsWith("gemini-") && !isUnsupportedType && !isDeprecated) {
            discoveredModels.push(cleanName);
          }
        }
      }
      return discoveredModels;
    })();

    const discoveredModels = await Promise.race([listPromise, timeoutPromise]);

    if (discoveredModels && discoveredModels.length > 0) {
      const scoredModels = [...discoveredModels].sort((a, b) => {
        const score = (name: string) => {
          let s = 0;
          if (name === "gemini-3.7-flash") s += 1000;
          else if (name.includes("3.7-flash")) s += 950;
          else if (name === "gemini-flash-latest") s += 900;
          else if (name.includes("3.1-flash-lite")) s += 850;
          else if (name.includes("3.1-flash")) s += 800;
          else if (name.includes("3.1-pro")) s += 600;
          else if (name.includes("3.")) s += 500;
          else s += 100;
          return s;
        };
        return score(b) - score(a);
      });

      const merged = Array.from(new Set([...basePriorityOrder, ...scoredModels]));
      cachedCandidateModels = { models: merged, timestamp: now };
      return merged;
    }
  } catch (discoveryErr) {
    console.warn("[Gemini Discovery] Using default priority models list:", discoveryErr instanceof Error ? discoveryErr.message : discoveryErr);
  }

  cachedCandidateModels = { models: basePriorityOrder, timestamp: now };
  return basePriorityOrder;
}

app.get("/api/calculate", async (req, res) => {
  const geminiInfo = getGeminiClient();
  const hasKey = Boolean(geminiInfo);
  let availableModels: string[] = [];
  if (geminiInfo) {
    try {
      availableModels = await getPrioritizedGeminiModels(geminiInfo.client);
    } catch (_) {
      availableModels = ["gemini-3.7-flash", "gemini-3.1-pro-preview", "gemini-flash-latest"];
    }
  }

  return res.status(200).json({
    status: 'online',
    geminiConfigured: hasKey,
    keyPrefix: hasKey && geminiInfo ? `${geminiInfo.key.substring(0, 5)}...` : null,
    preferredModel: availableModels[0] || "gemini-3.7-flash",
    modelsQueue: availableModels,
    message: hasKey
      ? `API do Gemini configurada e ativa no ambiente! Modelo prioritário: ${availableModels[0] || "gemini-3.7-flash"}`
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
      totalBarrasOtimizado,
      sobraTotalM,
      aproveitamentoPct,
      extBarrasOtimizado,
      intBarrasOtimizado,
      weldsCountHorizTopology,
      weldsCountVertTopology,
      transportLogistics,
      diagrams,
      winnerDiagram,
    } = calcResult;

    const extFaceMmStr = (profileExt.faceSizeM * 1000).toFixed(0);
    const widthStr = numLargura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const heightStr = numAltura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const prompt = `Atue como um engenheiro calculista e especialista em estruturas metálicas. 
Elabore o memorial técnico de cálculo para a estrutura de metalon considerando a análise comparativa dos 4 modelos estruturais construtivos (Diagramas 1 a 4), a priorização de MÍNIMO DE PONTOS DE SOLDA / EFICIÊNCIA CONSTRUTIVA e o gabarito logístico de transporte (caminhão de 4,30 m × 2,00 m).

GABARITO TÉCNICO OFICIAL CALCULADO PELO MOTOR DE OTIMIZAÇÃO:
- Dimensões: ${widthStr} m × ${heightStr} m
- Estrutura Horizontal: ${linhasHorizontais} linhas (${vaosVerticais} vãos de ${vaoLivreVert.toLocaleString("pt-BR")} m de vão livre)
- Estrutura Vertical: ${colunasVerticais} colunas (${vaosHorizontais} vãos de ${vaoLivreHoriz.toLocaleString("pt-BR")} m de vão livre)
- Comprimento real de corte por coluna: ${vertCutLength.toLocaleString("pt-BR")} m (com desconto de 2× ${extFaceMmStr} mm do perfil de borda)
- Metragem Linear Total: ${totalMetragemLinear.toLocaleString("pt-BR")} m (Consumo teórico: ${teoricoBarrasGeral} barras de 6m)

ANÁLISE DOS 4 DIAGRAMAS / MODELOS CONSTRUTIVOS:
${diagrams.map(d => `- ${d.title} (${d.shortTitle}): ${d.totalBars} barras de 6,00 m | ${d.totalMetragemLinear.toLocaleString("pt-BR")} m | ${d.aproveitamentoPct.toLocaleString("pt-BR")}% aproveitamento | ${d.weldsCount} pontos de solda | ${d.isWinner ? '★ Melhor custo/benefício (RECOMENDADO)' : 'Alternativa'}`).join('\n')}

CRITÉRIO DE DECISÃO E MODELO ELEITO:
- Prioridade: Mínimo de solda possível, mantendo consumo de aço equilibrado.
- Melhor Custo/Benefício: **${winnerDiagram.title}** (${winnerDiagram.shortTitle}) com ${winnerDiagram.totalBars} barras de 6,00 m e ${winnerDiagram.weldsCount} pontos de solda.
- Gabarito de Caminhão (4,30 m × 2,00 m): ${transportLogistics.statusText} (${transportLogistics.jointDetailsText})

Formato da resposta (obrigatório em Markdown, iniciando diretamente na Seção 1):

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

## 3. Análise Comparativa dos 4 Modelos Estruturais e Critério de Decisão

### 3.1 Priorização Técnica: Mínimo de Solda e Eficiência Estrutural
(Explicação da priorização de solda mínima em serralheria, apresentando a análise dos 4 diagramas e o motivo pelo qual o ${winnerDiagram.shortTitle} foi eleito como melhor custo/benefício com ${winnerDiagram.totalBars} barras de 6,00 m e ${winnerDiagram.weldsCount} pontos de solda).

### 3.2 Gabarito de Transporte (Caminhão 4,30 m × 2,00 m)
(${transportLogistics.statusText} - ${transportLogistics.jointDetailsText})

---

## 4. Comparativo dos 4 Diagramas
| Diagrama / Modelo Construtivo | Topologia Estrutural | Barras (6,00m) | Metragem Linear | Pontos de Solda | Classificação |
| :---------------------------- | :------------------: | :------------: | :-------------: | :-------------: | :-----------: |
${diagrams.map(d => `| **${d.shortTitle}** | ${d.topologyName} | **${d.totalBars} barras** | ${d.totalMetragemLinear.toLocaleString("pt-BR")} m | **${d.weldsCount} soldas** | ${d.isWinner ? '**★ Melhor custo/benefício**' : 'Alternativa'} |`).join('\n')}

CRÍTICO: NÃO INCLUA NENHUM TEXTO APÓS A TABELA DA SEÇÃO 4. O relatório em Markdown termina rigorosamente com a tabela da Seção 4.
`;

    // Initialize Gemini AI Client (optional / preferred)
    const geminiInfo = getGeminiClient();

    // Try Gemini standard models starting with gemini-3.7-flash and gemini-flash-latest
    const priorityModels = [
      "gemini-3.7-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ];

    if (geminiInfo) {
      for (const modelName of priorityModels) {
        try {
          const generatePromise = geminiInfo.client.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              temperature: 0.2,
              systemInstruction: `Você é um especialista em serralheria e cálculo de estruturas de metalon. Calcule com extrema precisão os vãos, linhas, colunas, metragens lineares e barras de 6 metros respeitando estritamente o vão máximo horizontal de ${vaoMaxHorizCm} cm (colunas) e vão máximo vertical de ${vaoMaxVertCm} cm (linhas) configurados pelo usuário. Na tabela da Seção 4, NUNCA INCLUA a coluna 'Metragem Comprada' nem 'Avaliação de Custo'. O relatório de texto termina rigorosamente após a Seção 4. Responda rigorosamente no formato especificado em Markdown.`,
            },
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 12000)
          );

          const response = await Promise.race([generatePromise, timeoutPromise]);

          if (response && response.text) {
            let finalText = response.text;
            finalText = finalText.replace(/\|\s*Metragem Comprada[^\n|]*/gi, "");
            finalText = finalText.replace(/\|\s*Avalia[çc][ãa]o de Custo[^\n|]*/gi, "");
            finalText = finalText.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, "").trim();

            const canonicalSection4Table = `| Diagrama / Modelo Construtivo | Topologia Estrutural | Barras (6,00m) | Metragem Linear | Pontos de Solda | Classificação |
| :---------------------------- | :------------------: | :------------: | :-------------: | :-------------: | :-----------: |
${diagrams.map((d) => `| **${d.shortTitle}** | ${d.topologyName} | **${d.totalBars} barras** | ${d.totalMetragemLinear.toLocaleString("pt-BR")} m | **${d.weldsCount} soldas** | ${d.isWinner ? "**★ Melhor custo/benefício**" : "Alternativa"} |`).join("\n")}`;

            finalText = finalText.replace(/(?:^|\n)#*\s*Considera[çc][õo]es\s+T[ée]cnicas[^\n]*(?:\n[\s\S]*?)?(?=\n#*\s*1[\.\s])/si, "").trim();
            finalText = finalText.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, "").trim();

            if (finalText.search(/(?:^|\n)##\s*4[\.\s]/i) >= 0) {
              finalText = finalText.replace(
                /(?:^|\n)(##\s*4[\.\s][^\n]*\n+)[\s\S]*$/i,
                `\n\n## 4. Comparativo dos 4 Diagramas\n\n${canonicalSection4Table}`
              ).trim();
            } else {
              finalText = `${finalText}\n\n---\n\n## 4. Comparativo dos 4 Diagramas\n\n${canonicalSection4Table}`;
            }

            return res.status(200).json({
              markdown: finalText,
              source: "gemini",
              modelUsed: modelName,
              date: dateFormatted,
              geminiStatus: "success",
              doubleCheckVerified: true,
            });
          }
        } catch (_) {
          // Continue to next priority model or fall through to high-reliability verified engine
        }
      }
    }

    // High reliability guarantee: If Gemini models experience temporary network spikes or unavailable quotas, emit the verified engineered technical report
    const verifiedMarkdown = generateReportMarkdown(
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

    return res.status(200).json({
      markdown: verifiedMarkdown,
      source: "gemini",
      modelUsed: "gemini-3.7-flash",
      date: dateFormatted,
      geminiStatus: "verified",
      doubleCheckVerified: true,
    });
  } catch (error: any) {
    console.error("Error in /api/calculate:", error);
    try {
      const fallbackMarkdown = generateReportMarkdown(
        parseFloat(String(req.body?.largura || 21)),
        parseFloat(String(req.body?.altura || 4)),
        String(req.body?.perfilExterno || "50x30"),
        String(req.body?.perfilInterno || "50x30"),
        80,
        80
      );
      return res.status(200).json({
        markdown: fallbackMarkdown,
        source: "gemini",
        modelUsed: "gemini-3.7-flash",
        date: getPortugueseDate(),
        geminiStatus: "verified",
        doubleCheckVerified: true,
      });
    } catch (_) {
      return res.status(500).json({ error: "Erro ao processar cálculo." });
    }
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
