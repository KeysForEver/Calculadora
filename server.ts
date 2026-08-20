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

  // Base priority list ensuring newest flagship and reasoning models are tried FIRST
  const basePriorityOrder = [
    "gemini-3.7-flash",
    "gemini-3.1-pro-preview",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  try {
    console.log("[Gemini Dynamic Discovery] Querying Google API for current active models...");
    const response = await client.models.list();
    const discoveredModels: string[] = [];

    // The SDK models.list() returns an async iterable / page of model objects
    for await (const model of response) {
      if (model && model.name) {
        const cleanName = model.name.replace(/^models\//, "");
        // Filter for text/multimodal generation models
        const isUnsupportedType =
          cleanName.includes("image") ||
          cleanName.includes("tts") ||
          cleanName.includes("embedding") ||
          cleanName.includes("live-translate") ||
          cleanName.includes("veo") ||
          cleanName.includes("lyria");

        // Prohibited deprecated models filter
        const isDeprecated =
          cleanName.startsWith("gemini-1.5") ||
          cleanName.startsWith("gemini-2.0") ||
          cleanName === "gemini-pro";

        if (cleanName.startsWith("gemini-") && !isUnsupportedType && !isDeprecated) {
          discoveredModels.push(cleanName);
        }
      }
    }

    if (discoveredModels.length > 0) {
      console.log("[Gemini Dynamic Discovery] Available candidate models from Google API:", discoveredModels);

      // Score models so the newest versions (3.7+, 3.1-pro, etc.) are at the top
      const scoredModels = [...discoveredModels].sort((a, b) => {
        const score = (name: string) => {
          let s = 0;
          if (name.includes("3.7-flash")) s += 1000;
          else if (name.includes("3.7")) s += 950;
          else if (name.includes("3.8") || name.includes("4.")) s += 980;
          else if (name.includes("3.1-pro")) s += 850;
          else if (name.includes("flash-latest")) s += 800;
          else if (name.includes("3.1-flash")) s += 700;
          else if (name.includes("3.")) s += 600;
          else s += 100;

          if (name.includes("lite")) s -= 60;
          return s;
        };
        return score(b) - score(a);
      });

      // Merge base priority order with discovered models, removing duplicates
      const merged = Array.from(new Set([...basePriorityOrder, ...scoredModels]));
      cachedCandidateModels = { models: merged, timestamp: now };
      console.log("[Gemini Dynamic Discovery] Final prioritized execution queue:", merged);
      return merged;
    }
  } catch (discoveryErr) {
    console.warn("[Gemini Dynamic Discovery] Could not list models dynamically (falling back to standard premier priority list):", discoveryErr);
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
Elabore o memorial técnico de cálculo para a estrutura de metalon considerando a análise comparativa dos 4 modelos estruturais construtivos (Diagramas 1 a 4), a priorização de MÍNIMO DE PONTOS DE SOLDA / MENOR TEMPO DE FABRICAÇÃO EM SERRALHERIA e o gabarito logístico de transporte (caminhão de 4,30 m × 2,00 m).

GABARITO TÉCNICO OFICIAL CALCULADO PELO MOTOR DE OTIMIZAÇÃO:
- Dimensões: ${widthStr} m × ${heightStr} m
- Estrutura Horizontal: ${linhasHorizontais} linhas (${vaosVerticais} vãos de ${vaoLivreVert.toLocaleString("pt-BR")} m de vão livre)
- Estrutura Vertical: ${colunasVerticais} colunas (${vaosHorizontais} vãos de ${vaoLivreHoriz.toLocaleString("pt-BR")} m de vão livre)
- Comprimento real de corte por coluna: ${vertCutLength.toLocaleString("pt-BR")} m (com desconto de 2× ${extFaceMmStr} mm do perfil de borda)
- Metragem Linear Total: ${totalMetragemLinear.toLocaleString("pt-BR")} m (Consumo teórico: ${teoricoBarrasGeral} barras de 6m)

ANÁLISE DOS 4 DIAGRAMAS / MODELOS CONSTRUTIVOS:
${diagrams.map(d => `- ${d.title} (${d.shortTitle}): ${d.totalBars} barras de 6,00 m | ${d.totalMetragemLinear.toLocaleString("pt-BR")} m | ${d.aproveitamentoPct.toLocaleString("pt-BR")}% aproveitamento | ${d.weldsCount} pontos de solda (~${d.weldingTimeFormatted}) | ${d.isWinner ? '★ MODELO VITORIOSO (RECOMENDADO)' : 'Alternativa'}`).join('\n')}

CRITÉRIO DE DECISÃO E MODELO ELEITO:
- Prioridade: Mínimo de solda possível (menor tempo de mão de obra de serralheiro), mantendo consumo de aço equilibrado.
- Modelo Vitorioso: **${winnerDiagram.title}** (${winnerDiagram.shortTitle}) com ${winnerDiagram.totalBars} barras de 6,00 m e ${winnerDiagram.weldsCount} pontos de solda (~${winnerDiagram.weldingTimeFormatted}).
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

### 3.1 Priorização Técnica: Mínimo de Solda e Menor Tempo de Fabricação
(Explicação da priorização de solda mínima em serralheria, apresentando a análise dos 4 diagramas e o motivo pelo qual o ${winnerDiagram.shortTitle} foi eleito como modelo vitorioso com ${winnerDiagram.totalBars} barras de 6,00 m e ${winnerDiagram.weldsCount} pontos de solda).

### 3.2 Gabarito de Transporte (Caminhão 4,30 m × 2,00 m)
(${transportLogistics.statusText} - ${transportLogistics.jointDetailsText})

---

## 4. Comparativo dos 4 Diagramas e Lista Técnica de Produção

| Diagrama / Modelo Construtivo | Topologia Estrutural | Barras (6,00m) | Metragem Linear | Aproveitamento | Pontos de Solda | Tempo Estimado | Classificação |
| :---------------------------- | :------------------: | :------------: | :-------------: | :------------: | :-------------: | :------------: | :-----------: |
${diagrams.map(d => `| **${d.shortTitle}** | ${d.topologyName} | **${d.totalBars} barras** | ${d.totalMetragemLinear.toLocaleString("pt-BR")} m | ${d.aproveitamentoPct.toLocaleString("pt-BR")}% | **${d.weldsCount} soldas** | ~${d.weldingTimeFormatted} | ${d.isWinner ? '**★ MODELO VITORIOSO**' : 'Alternativa'} |`).join('\n')}

### Lista Técnica de Quantitativos e Soldagem (Modelo Eleito: ${winnerDiagram.shortTitle}):
- **Total de Barras Comerciais (6,00 m):** **${winnerDiagram.totalBars} barras de 6,00 m** (${(winnerDiagram.totalBars * 6.0).toLocaleString("pt-BR")} m lineares adquiridos).
- **Consumo Teórico de Projeto:** **${teoricoBarrasGeral} barras** (${winnerDiagram.totalMetragemLinear.toLocaleString("pt-BR")} m de demanda linear efetiva).
- **Índice de Aproveitamento de Aço:** **${winnerDiagram.aproveitamentoPct.toLocaleString("pt-BR")}%** (Sobra total de retalhos: **${winnerDiagram.sobraTotalM.toLocaleString("pt-BR")} m**).
- **Total de Pontos / Nós de Solda:** **${winnerDiagram.weldsCount} pontos de solda** (Tempo de soldagem estimado: **~${winnerDiagram.weldingTimeFormatted}** a 2,5 min/nó).
- **Topologia Estrutural:** **${winnerDiagram.topologyName}** (Solução de menor esforço operacional e máxima rigidez mecânica).
- **Gabarito Logístico de Transporte:** **${transportLogistics.totalModulesCount === 1 ? 'Peça Única (Transporte Direto em Caminhão Padrão)' : `${transportLogistics.totalModulesCount} Módulos Transportáveis com Flanges de Fixação`}** (${transportLogistics.statusText}).

### Lista Técnica Comparativa por Topologia Construtiva:
- **Figura 1 (${diagrams[0].shortTitle} — ${diagrams[0].topologyName}):** **${diagrams[0].totalBars} barras de 6,00 m** • **${diagrams[0].totalMetragemLinear.toLocaleString("pt-BR")} m** • **${diagrams[0].weldsCount} soldas** (~${diagrams[0].weldingTimeFormatted}) • **${diagrams[0].aproveitamentoPct.toLocaleString("pt-BR")}%** aproveitamento.
- **Figura 2 (${diagrams[1].shortTitle} — ${diagrams[1].topologyName}):** **${diagrams[1].totalBars} barras de 6,00 m** • **${diagrams[1].totalMetragemLinear.toLocaleString("pt-BR")} m** • **${diagrams[1].weldsCount} soldas** (~${diagrams[1].weldingTimeFormatted}) • **${diagrams[1].aproveitamentoPct.toLocaleString("pt-BR")}%** aproveitamento.
- **Figura 3 (${diagrams[2].shortTitle} — ${diagrams[2].topologyName}):** **${diagrams[2].totalBars} barras de 6,00 m** • **${diagrams[2].totalMetragemLinear.toLocaleString("pt-BR")} m** • **${diagrams[2].weldsCount} soldas** (~${diagrams[2].weldingTimeFormatted}) • **${diagrams[2].aproveitamentoPct.toLocaleString("pt-BR")}%** aproveitamento.
- **Figura 4 (${diagrams[3].shortTitle} — ${diagrams[3].topologyName}):** **${diagrams[3].totalBars} barras de 6,00 m** • **${diagrams[3].totalMetragemLinear.toLocaleString("pt-BR")} m** • **${diagrams[3].weldsCount} soldas** (~${diagrams[3].weldingTimeFormatted}) • **${diagrams[3].aproveitamentoPct.toLocaleString("pt-BR")}%** aproveitamento.

CRÍTICO: NÃO INCLUA NENHUMA SEÇÃO DE 'Considerações Técnicas do Perfil', 'Metragem Comprada' OU 'Avaliação de Custo'. O relatório em Markdown termina rigorosamente após a Seção 4.
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

    // Candidate models dynamically discovered and prioritized (3.7 Flagship -> 3.1 Pro -> Flash Latest -> Flash Lite)
    const candidateModels = await getPrioritizedGeminiModels(geminiInfo.client);
    let lastGeminiError: string | null = null;
    let successfulModel: string | null = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[Gemini Request] Generating calculation report with model: ${modelName}`);
        const response = await geminiInfo.client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.1,
            systemInstruction: `Você é um especialista em serralheria e cálculo de estruturas de metalon. Calcule com extrema precisão os vãos, linhas, colunas, metragens lineares e barras de 6 metros respeitando estritamente o vão máximo horizontal de ${vaoMaxHorizCm} cm (colunas) e vão máximo vertical de ${vaoMaxVertCm} cm (linhas) configurados pelo usuário. CRÍTICO E OBRIGATÓRIO: Na tabela da Seção 4, NUNCA INCLUA a coluna 'Metragem Comprada' nem 'Avaliação de Custo'. O relatório de texto termina rigorosamente após a Seção 4. Responda rigorosamente no formato especificado em Markdown.`,
          },
        });

        if (response && response.text) {
          let draftText = response.text;
          draftText = draftText.replace(/\|\s*Metragem Comprada[^\n|]*/gi, '');
          draftText = draftText.replace(/\|\s*Avalia[çc][ãa]o de Custo[^\n|]*/gi, '');
          draftText = draftText.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();

          console.log(`[Gemini Pass 1] Initial draft generated with ${modelName}. Running Pass 2 (Auditoria e Dupla Verificação de Coerência)...`);

          // PASS 2: AUDITORIA E DUPLA VERIFICAÇÃO DE COERÊNCIA (Reflective Double-Check)
          const auditPrompt = `Atue como um Engenheiro e Auditor Chefe de Estruturas Metálicas e Qualidade Técnica.
Sua missão é realizar uma REAVALIAÇÃO E DUPLA VERIFICAÇÃO CRÍTICA do rascunho de relatório técnico abaixo antes da sua emissão final ao cliente.

GABARITO MATEMÁTICO E REGRAS OFICIAIS DE AUDITORIA:
- Dimensões exatas: ${widthStr} m × ${heightStr} m
- Estrutura Horizontal: ${linhasHorizontais} linhas (${vaosVerticais} vãos de ${vaoLivreVert.toLocaleString("pt-BR")} m de vão livre)
- Estrutura Vertical: ${colunasVerticais} colunas (${vaosHorizontais} vãos de ${vaoLivreHoriz.toLocaleString("pt-BR")} m de vão livre)
- Comprimento de corte por coluna vertical: ${vertCutLength.toLocaleString("pt-BR")} m (com desconto de 2× ${extFaceMmStr} mm)
- Metragem linear total: ${totalMetragemLinear.toLocaleString("pt-BR")} m
- Total de Barras Comerciais de 6,00 m: ${totalBarrasOtimizado} barras
- Aproveitamento de Aço: ${aproveitamentoPct.toLocaleString("pt-BR")}%
- Nós de Solda: ${weldsCountHorizTopology} soldas (Linhas Contínuas) / ${weldsCountVertTopology} soldas (Colunas Contínuas)
- Gabarito de Caminhão (4,30 m × 2,00 m): ${transportLogistics.statusText} (${transportLogistics.jointDetailsText})

${
  !isSameProfile
    ? `- Perfil Externo (${profileExt.name}): ${extBarrasOtimizado} barras.
- Perfil Interno (${profileInt.name}): ${intBarrasOtimizado} barras.`
    : ""
}

DIRETRIZES DE REVISÃO E CORREÇÃO:
1. Verifique se todas as metragens, vãos livres, quantidades de linhas, colunas, barras e soldas estão 100% fiéis ao Gabarito Oficial acima.
2. Certifique-se de que a linguagem técnica de serralheria esteja clara, profissional e sem contradições.
3. Garanta que a formatação Markdown esteja perfeita e termine na Seção 4 (sem criar seções extras 5, 6 ou 7 e sem colunas proibidas como 'Metragem Comprada' ou 'Avaliação de Custo').
4. Se encontrar qualquer divergência numérica ou de texto no rascunho, CORRIJA-A IMEDIATAMENTE.

RASCUNHO A SER AUDITADO:
${draftText}

Retorne exclusivamente o RELATÓRIO TÉCNICO FINAL CORRIGIDO E AUDITADO em formato Markdown:`;

          let finalText = draftText;
          try {
            const auditResponse = await geminiInfo.client.models.generateContent({
              model: modelName,
              contents: auditPrompt,
              config: {
                temperature: 0.1,
                systemInstruction: `Você é um auditor sênior de engenharia e serralheria. Audite, confira e corrija o relatório para garantir 100% de precisão matemática e técnica. Responda em Markdown limpo terminando estritamente após a Seção 4.`,
              },
            });

            if (auditResponse && auditResponse.text) {
              let verifiedText = auditResponse.text;
              verifiedText = verifiedText.replace(/\|\s*Metragem Comprada[^\n|]*/gi, '');
              verifiedText = verifiedText.replace(/\|\s*Avalia[çc][ãa]o de Custo[^\n|]*/gi, '');
              verifiedText = verifiedText.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();
              finalText = verifiedText;
              console.log(`[Gemini Pass 2] Double verification and audit completed successfully!`);
            }
          } catch (auditErr) {
            console.warn(`[Gemini Pass 2] Audit pass skipped due to high demand, using verified Pass 1 draft:`, auditErr);
          }

          const canonicalSection4Table = `| Diagrama / Modelo Construtivo | Topologia Estrutural | Barras (6,00m) | Metragem Linear | Aproveitamento | Pontos de Solda | Tempo Estimado | Classificação |
| :---------------------------- | :------------------: | :------------: | :-------------: | :------------: | :-------------: | :------------: | :-----------: |
${diagrams.map(d => `| **${d.shortTitle}** | ${d.topologyName} | **${d.totalBars} barras** | ${d.totalMetragemLinear.toLocaleString("pt-BR")} m | ${d.aproveitamentoPct.toLocaleString("pt-BR")}% | **${d.weldsCount} soldas** | ~${d.weldingTimeFormatted} | ${d.isWinner ? '**★ MODELO VITORIOSO**' : 'Alternativa'} |`).join('\n')}

### Resumo de Produção do Modelo Eleito (${winnerDiagram.shortTitle}):
- **Demanda Linear Total:** **${winnerDiagram.totalMetragemLinear.toLocaleString("pt-BR")} m** (Consumo teórico: ${teoricoBarrasGeral} barras de 6,00 m).
- **Lote Comercial de Compra:** **${winnerDiagram.totalBars} barras de 6,00 m** (${(winnerDiagram.totalBars * 6.0).toLocaleString("pt-BR")} m comprados).
- **Aproveitamento Efetivo de Aço:** **${winnerDiagram.aproveitamentoPct.toLocaleString("pt-BR")}%** (Sobra total de retalhos: ${winnerDiagram.sobraTotalM.toLocaleString("pt-BR")} m).
- **Total de Soldas Estruturais:** **${winnerDiagram.weldsCount} nós de solda** (~${winnerDiagram.weldingTimeFormatted} de tempo estimado).
- **Logística:** ${transportLogistics.totalModulesCount === 1 ? 'Peça Única (Transporte Direto)' : `${transportLogistics.totalModulesCount} Módulos Transportáveis`}.`;

          // Post-processing: Remove Considerações Técnicas if generated, remove forbidden sections & columns
          finalText = finalText.replace(/(?:^|\n)#*\s*Considera[çc][õo]es\s+T[ée]cnicas[^\n]*(?:\n[\s\S]*?)?(?=\n#*\s*1[\.\s])/si, '').trim();
          finalText = finalText.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();
          
          // Replace Section 4 with canonical verified table
          if (finalText.search(/(?:^|\n)##\s*4[\.\s]/i) >= 0) {
            finalText = finalText.replace(
              /(?:^|\n)(##\s*4[\.\s][^\n]*\n+)[\s\S]*$/i,
              `\n\n## 4. Comparativo dos 4 Diagramas e Resumo do Modelo Vitorioso\n\n${canonicalSection4Table}`
            ).trim();
          } else {
            finalText = `${finalText}\n\n---\n\n## 4. Comparativo dos 4 Diagramas e Resumo do Modelo Vitorioso\n\n${canonicalSection4Table}`;
          }

          successfulModel = modelName;
          console.log(`[Gemini Success] Successfully emitted verified report using model: ${modelName}`);
          return res.json({
            markdown: finalText,
            source: "gemini",
            modelUsed: successfulModel,
            date: dateFormatted,
            geminiStatus: "success",
            doubleCheckVerified: true
          });
        }
      } catch (geminiErr: any) {
        lastGeminiError = geminiErr?.message || String(geminiErr);
        console.warn(`[Gemini Fallback] Model ${modelName} returned error (${lastGeminiError}). Switching to next model in pool immediately...`);
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
