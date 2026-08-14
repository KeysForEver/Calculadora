// Vercel Serverless Function for Metalon Calculation with Gemini AI & Deterministic Engine
// Zero external file dependencies to avoid Vercel module resolution errors

interface ProfileInfo {
  name: string;
  widthM: number;
  heightM: number;
  faceSizeM: number;
  linearWeightKgM: number;
}

function parseProfileInfo(perfilStr: string): ProfileInfo {
  const matches = (perfilStr || "").match(/\d+/g);
  let wMm = 30;
  let hMm = 30;
  if (matches && matches.length >= 2) {
    wMm = parseInt(matches[0], 10);
    hMm = parseInt(matches[1], 10);
  } else if (matches && matches.length === 1) {
    wMm = parseInt(matches[0], 10);
    hMm = wMm;
  }
  const widthM = wMm / 1000;
  const heightM = hMm / 1000;
  const faceSizeM = Math.max(widthM, heightM);
  const perimeterMm = 2 * (wMm + hMm);
  const linearWeightKgM = Number((perimeterMm * 0.0105).toFixed(2));
  return {
    name: perfilStr || "30 x 30 mm",
    widthM,
    heightM,
    faceSizeM,
    linearWeightKgM: Math.max(linearWeightKgM, 0.5),
  };
}

interface PieceToCut {
  type: 'Horizontal' | 'Vertical';
  length: number;
  description: string;
}

interface AllocatedBar {
  id: number;
  remainingLength: number;
  usedLength: number;
  pieces: PieceToCut[];
}

function optimizePiecesPlan(inputPieces: PieceToCut[]) {
  let full6mBarsCount = 0;
  const subPieces: PieceToCut[] = [];

  for (const piece of inputPieces) {
    const fullBars = Math.floor(piece.length / 6.0);
    const remLength = Number((piece.length - fullBars * 6.0).toFixed(3));
    full6mBarsCount += fullBars;
    if (remLength > 0) {
      subPieces.push({
        type: piece.type,
        length: remLength,
        description: piece.description,
      });
    }
  }

  subPieces.sort((a, b) => b.length - a.length);
  const allocatedBars: AllocatedBar[] = [];

  for (const piece of subPieces) {
    let placed = false;
    for (const bar of allocatedBars) {
      if (bar.remainingLength >= piece.length - 0.001) {
        bar.pieces.push(piece);
        bar.usedLength = Number((bar.usedLength + piece.length).toFixed(3));
        bar.remainingLength = Number((6.0 - bar.usedLength).toFixed(3));
        placed = true;
        break;
      }
    }
    if (!placed) {
      allocatedBars.push({
        id: allocatedBars.length + 1,
        remainingLength: Number((6.0 - piece.length).toFixed(3)),
        usedLength: piece.length,
        pieces: [piece],
      });
    }
  }

  return {
    full6mBarsCount,
    allocatedBars,
    totalComEmenda: full6mBarsCount + allocatedBars.length,
  };
}

function optimizeWholePiecesPlan(inputPieces: PieceToCut[]) {
  const wholeItems: PieceToCut[] = [];
  let longBarsCount = 0;

  for (const piece of inputPieces) {
    if (piece.length > 6.0) {
      longBarsCount += Math.ceil(piece.length / 6.0);
    } else {
      wholeItems.push(piece);
    }
  }

  wholeItems.sort((a, b) => b.length - a.length);
  const allocatedBars: AllocatedBar[] = [];

  for (const piece of wholeItems) {
    let placed = false;
    for (const bar of allocatedBars) {
      if (bar.remainingLength >= piece.length - 0.001) {
        bar.pieces.push(piece);
        bar.usedLength = Number((bar.usedLength + piece.length).toFixed(3));
        bar.remainingLength = Number((6.0 - bar.usedLength).toFixed(3));
        placed = true;
        break;
      }
    }
    if (!placed) {
      allocatedBars.push({
        id: allocatedBars.length + 1,
        remainingLength: Number((6.0 - piece.length).toFixed(3)),
        usedLength: piece.length,
        pieces: [piece],
      });
    }
  }

  return {
    totalBars: longBarsCount + allocatedBars.length,
    allocatedBars,
  };
}

function getPortugueseDate(): string {
  const date = new Date();
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

function generateReportMarkdown(
  largura: number,
  altura: number,
  perfilExtStr: string,
  perfilIntStr: string,
  vaoMaxHorizCm: number = 80,
  vaoMaxVertCm: number = 80
): string {
  const profileExt = parseProfileInfo(perfilExtStr);
  const profileInt = parseProfileInfo(perfilIntStr || perfilExtStr);
  const isSameProfile = profileExt.name.toLowerCase().replace(/\s+/g, '') === profileInt.name.toLowerCase().replace(/\s+/g, '');
  const vaoHorizM = vaoMaxHorizCm / 100;
  const vaoVertM = vaoMaxVertCm / 100;

  const extFaceMm = (profileExt.faceSizeM * 1000).toFixed(0);
  const intFaceMm = (profileInt.faceSizeM * 1000).toFixed(0);
  const vertCutLength = Number(Math.max(0.1, altura - 2 * profileExt.faceSizeM).toFixed(3));

  const vaosVerticais = Math.ceil((altura - profileExt.faceSizeM) / (vaoVertM + profileInt.faceSizeM)) || Math.ceil(altura / vaoVertM) || 1;
  const linhasHorizontais = vaosVerticais + 1;
  const vaoLivreVert = Number(((altura - (2 * profileExt.faceSizeM) - (Math.max(0, linhasHorizontais - 2) * profileInt.faceSizeM)) / vaosVerticais).toFixed(3));

  const vaosHorizontais = Math.ceil((largura - profileExt.faceSizeM) / (vaoHorizM + profileInt.faceSizeM)) || Math.ceil(largura / vaoHorizM) || 1;
  const colunasVerticais = vaosHorizontais + 1;
  const vaoLivreHoriz = Number(((largura - (2 * profileExt.faceSizeM) - (Math.max(0, colunasVerticais - 2) * profileInt.faceSizeM)) / vaosHorizontais).toFixed(3));

  const horizExtCount = Math.min(2, linhasHorizontais);
  const horizIntCount = Math.max(0, linhasHorizontais - 2);
  const vertExtCount = Math.min(2, colunasVerticais);
  const vertIntCount = Math.max(0, colunasVerticais - 2);

  const metragemExtHoriz = Number((horizExtCount * largura).toFixed(2));
  const metragemExtVert = Number((vertExtCount * vertCutLength).toFixed(2));
  const metragemExtTotal = Number((metragemExtHoriz + metragemExtVert).toFixed(2));

  const metragemIntHoriz = Number((horizIntCount * largura).toFixed(2));
  const metragemIntVert = Number((vertIntCount * vertCutLength).toFixed(2));
  const metragemIntTotal = Number((metragemIntHoriz + metragemIntVert).toFixed(2));

  let planoDeCorteTexto = "";
  let totalSemEmendaSemOpt = 0;
  let totalSemEmendaComOpt = 0;
  let totalComEmendaComOpt = 0;

  let extScenario1 = 0, extScenario2 = 0, extScenario3 = 0;
  let intScenario1 = 0, intScenario2 = 0, intScenario3 = 0;

  if (isSameProfile) {
    const allPieces: PieceToCut[] = [
      ...Array(linhasHorizontais).fill(0).map((_, i) => ({ type: 'Horizontal' as const, length: largura, description: `Linha Horiz ${i + 1}` })),
      ...Array(colunasVerticais).fill(0).map((_, i) => ({ type: 'Vertical' as const, length: vertCutLength, description: `Coluna Vert ${i + 1}` })),
    ];

    totalSemEmendaSemOpt = (linhasHorizontais * Math.ceil(largura / 6.0)) + (colunasVerticais * Math.ceil(vertCutLength / 6.0));
    totalSemEmendaComOpt = optimizeWholePiecesPlan(allPieces).totalBars;
    const optSpliceUnified = optimizePiecesPlan(allPieces);
    totalComEmendaComOpt = optSpliceUnified.totalComEmenda;

    if (optSpliceUnified.full6mBarsCount > 0) {
      planoDeCorteTexto += `- **Barras de 6m inteiras:** ${optSpliceUnified.full6mBarsCount} barra(s) de ${profileExt.name}.\n`;
    }
    if (optSpliceUnified.allocatedBars.length > 0) {
      planoDeCorteTexto += `- **Barras fracionadas com corte otimizado (${optSpliceUnified.allocatedBars.length} barra(s)):**\n`;
      optSpliceUnified.allocatedBars.forEach((bar, index) => {
        const pecasDesc = bar.pieces
          .map((p) => `${p.type === "Horizontal" ? "1x Horiz" : "1x Vert"} (${p.length.toLocaleString("pt-BR")} m)`)
          .join(" + ");
        const sobraStr = bar.remainingLength > 0 
          ? ` -> **Sobra:** ${bar.remainingLength.toLocaleString("pt-BR")} m`
          : ` -> **Sem sobra**`;
        planoDeCorteTexto += `  - *Barra ${index + 1}:* ${pecasDesc}${sobraStr}\n`;
      });
    }
  } else {
    const piecesExt: PieceToCut[] = [
      ...Array(horizExtCount).fill(0).map((_, i) => ({ type: 'Horizontal' as const, length: largura, description: `Horiz Borda ${i + 1}` })),
      ...Array(vertExtCount).fill(0).map((_, i) => ({ type: 'Vertical' as const, length: vertCutLength, description: `Vert Borda ${i + 1}` })),
    ];
    const piecesInt: PieceToCut[] = [
      ...Array(horizIntCount).fill(0).map((_, i) => ({ type: 'Horizontal' as const, length: largura, description: `Horiz Interna ${i + 1}` })),
      ...Array(vertIntCount).fill(0).map((_, i) => ({ type: 'Vertical' as const, length: vertCutLength, description: `Vert Interna ${i + 1}` })),
    ];

    extScenario1 = (horizExtCount * Math.ceil(largura / 6.0)) + (vertExtCount * Math.ceil(vertCutLength / 6.0));
    extScenario2 = optimizeWholePiecesPlan(piecesExt).totalBars;
    const optExtResult = optimizePiecesPlan(piecesExt);
    extScenario3 = optExtResult.totalComEmenda;

    intScenario1 = (horizIntCount * Math.ceil(largura / 6.0)) + (vertIntCount * Math.ceil(vertCutLength / 6.0));
    intScenario2 = optimizeWholePiecesPlan(piecesInt).totalBars;
    const optIntResult = optimizePiecesPlan(piecesInt);
    intScenario3 = optIntResult.totalComEmenda;

    totalSemEmendaSemOpt = extScenario1 + intScenario1;
    totalSemEmendaComOpt = extScenario2 + intScenario2;
    totalComEmendaComOpt = extScenario3 + intScenario3;

    planoDeCorteTexto += `### A) Perfil Metalon Externo (${profileExt.name})\n`;
    planoDeCorteTexto += `* Metragem total da borda: **${metragemExtTotal.toLocaleString("pt-BR")} m** (Consumo Otimizado: **${optExtResult.totalComEmenda} barra(s) de 6m**)\n`;
    if (optExtResult.full6mBarsCount > 0) {
      planoDeCorteTexto += `- **Barras de 6m inteiras:** ${optExtResult.full6mBarsCount} barra(s)\n`;
    }
    if (optExtResult.allocatedBars.length > 0) {
      planoDeCorteTexto += `- **Barras fracionadas otimizadas (${optExtResult.allocatedBars.length} barra(s)):**\n`;
      optExtResult.allocatedBars.forEach((bar, index) => {
        const pecasDesc = bar.pieces.map((p) => `1x ${p.description} (${p.length.toLocaleString("pt-BR")} m)`).join(" + ");
        const sobraStr = bar.remainingLength > 0 ? ` -> **Sobra:** ${bar.remainingLength.toLocaleString("pt-BR")} m` : ` -> **Sem sobra**`;
        planoDeCorteTexto += `  - *Barra ${index + 1}:* ${pecasDesc}${sobraStr}\n`;
      });
    }

    planoDeCorteTexto += `\n### B) Perfil Metalon Interno (${profileInt.name})\n`;
    planoDeCorteTexto += `* Metragem total interna: **${metragemIntTotal.toLocaleString("pt-BR")} m** (Consumo Otimizado: **${optIntResult.totalComEmenda} barra(s) de 6m**)\n`;
    if (optIntResult.full6mBarsCount > 0) {
      planoDeCorteTexto += `- **Barras de 6m inteiras:** ${optIntResult.full6mBarsCount} barra(s)\n`;
    }
    if (optIntResult.allocatedBars.length > 0) {
      planoDeCorteTexto += `- **Barras fracionadas otimizadas (${optIntResult.allocatedBars.length} barra(s)):**\n`;
      optIntResult.allocatedBars.forEach((bar, index) => {
        const pecasDesc = bar.pieces.map((p) => `1x ${p.description} (${p.length.toLocaleString("pt-BR")} m)`).join(" + ");
        const sobraStr = bar.remainingLength > 0 ? ` -> **Sobra:** ${bar.remainingLength.toLocaleString("pt-BR")} m` : ` -> **Sem sobra**`;
        planoDeCorteTexto += `  - *Barra ${index + 1}:* ${pecasDesc}${sobraStr}\n`;
      });
    }
  }

  const widthFormatted = largura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const heightFormatted = altura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const profileHeader = isSameProfile
    ? `- **Perfil Metalon Selecionado:** ${profileExt.name} (Face: ${extFaceMm} mm)`
    : `- **Perfil Metalon Externo (Borda):** ${profileExt.name} (Face: ${extFaceMm} mm)\n- **Perfil Metalon Interno (Travessas):** ${profileInt.name} (Face: ${intFaceMm} mm)`;

  return `## Considerações Técnicas do Perfil
- **Dimensões do Painel:** ${widthFormatted} m (Largura) × ${heightFormatted} m (Altura)
- **Vão Máximo Configurado:** Horizontal (colunas): ${vaoMaxHorizCm} cm | Vertical (linhas): ${vaoMaxVertCm} cm
${profileHeader}
- **Regra Construtiva:** Barras horizontais inteiriças na largura total (${widthFormatted} m). Colunas verticais cortadas no vão interno descontando 2x a face externa (${(profileExt.faceSizeM * 2).toLocaleString("pt-BR")} m) = **${vertCutLength.toLocaleString("pt-BR")} m** cada.

---

## 1. Estrutura Horizontal
- **Quantidade de Linhas Horizontais:** ${linhasHorizontais} linhas (${horizExtCount} externas de borda + ${horizIntCount} internas intermediárias)
- **Vão Livre Vertical entre Linhas:** ${(vaoLivreVert * 100).toLocaleString("pt-BR")} cm (limite máx: ${vaoMaxVertCm} cm)
- **Comprimento de Cada Linha:** ${widthFormatted} m
- **Metragem Linear Total Horizontal:** ${(horizExtCount * largura + horizIntCount * largura).toLocaleString("pt-BR")} m

---

## 2. Estrutura Vertical (Com Desconto do Perfil Externo)
- **Quantidade de Colunas Verticais:** ${colunasVerticais} colunas (${vertExtCount} externas laterais + ${vertIntCount} internas intermediárias)
- **Vão Livre Horizontal entre Colunas:** ${(vaoLivreHoriz * 100).toLocaleString("pt-BR")} cm (limite máx: ${vaoMaxHorizCm} cm)
- **Comprimento de Corte Vertical:** ${vertCutLength.toLocaleString("pt-BR")} m cada coluna (altura ${heightFormatted} m - 2 × ${(profileExt.faceSizeM).toLocaleString("pt-BR")} m)
- **Metragem Linear Total Vertical:** ${((vertExtCount + vertIntCount) * vertCutLength).toLocaleString("pt-BR")} m

---

## 3. Plano de Corte Otimizado (Reaproveitamento de Sobras)
${planoDeCorteTexto}

---

## 4. Resultado e Quadro Comparativo de Consumo

${isSameProfile ? `
| Cenário / Método de Corte | Pontos de Solda / Emendas | Total de Barras (6m) |
| :--- | :--- | :---: |
| **1. Sem Emenda e Sem Otimização** | 0 pontos (peças inteiras) | **${totalSemEmendaSemOpt} barras** |
| **2. Sem Emenda com Otimização de Corte** | 0 pontos (peças inteiras com sobras) | **${totalSemEmendaComOpt} barras** |
| **3. Com Emenda e Otimização Total** | Mínimo de soldas intermediárias | **${totalComEmendaComOpt} barras** |
` : `
| Cenário / Método de Corte | Perfil Externo (${profileExt.name}) | Perfil Interno (${profileInt.name}) | Total de Barras (6m) |
| :--- | :---: | :---: | :---: |
| **1. Sem Emenda e Sem Otimização** | ${extScenario1} barras | ${intScenario1} barras | **${totalSemEmendaSemOpt} barras** |
| **2. Sem Emenda com Otimização de Corte** | ${extScenario2} barras | ${intScenario2} barras | **${totalSemEmendaComOpt} barras** |
| **3. Com Emenda e Otimização Total** | ${extScenario3} barras | ${intScenario3} barras | **${totalComEmendaComOpt} barras** |
`}
`;
}

// Direct Gemini REST API caller - Works 100% reliably in Vercel Serverless without SDK bundling bugs
async function callGeminiRestApi(apiKey: string, prompt: string, model: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1
    },
    systemInstruction: {
      parts: [
        {
          text: `Você é um especialista em serralheria e cálculo de metalon. Calcule rigorosamente o projeto respeitando as dimensões. O relatório em texto deve conter exclusivamente até a Seção 4 (Quadro Comparativo de Consumo). Na Seção 4, exiba APENAS a tabela comparativa dos 3 cenários com as colunas de corte e barras, sem nenhuma coluna de 'Avaliação de Custo' ou 'Metragem Comprada'.`
        }
      ]
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`Gemini REST error (${model} - HTTP ${response.status}):`, errorText);
    return null;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || null;
}

export default async function handler(req: any, res: any) {
  try {
    // Set CORS headers
    if (res && res.setHeader) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
      );
    }

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const rawKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");
    const hasValidKey = Boolean(apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.length > 10);

    // GET route for diagnostics / health-check
    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'online',
        geminiConfigured: hasValidKey,
        keyPrefix: hasValidKey ? `${apiKey.substring(0, 5)}...` : null,
        message: hasValidKey
          ? 'API do Gemini configurada e ativa no ambiente Vercel!'
          : 'Variável GEMINI_API_KEY não foi encontrada ou é inválida no Vercel. Lembre-se de fazer um Redeploy após adicionar a variável.'
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        console.warn("JSON parse warning:", parseErr);
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

    if (isNaN(numAltura) || isNaN(numLargura) || numAltura <= 0 || numLargura <= 0) {
      return res.status(400).json({ error: "Dimensões inválidas informadas. Largura e altura devem ser números positivos." });
    }

    const isSameProfile = perfilExt.toLowerCase().replace(/\s+/g, '') === perfilInt.toLowerCase().replace(/\s+/g, '');
    const profileExtInfo = parseProfileInfo(perfilExt);
    const profileIntInfo = parseProfileInfo(perfilInt);
    const dateFormatted = getPortugueseDate();

    // If Gemini key is available, call Google Gemini REST API directly
    if (hasValidKey) {
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

      const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.7-flash"];
      for (const modelName of candidateModels) {
        try {
          const rawText = await callGeminiRestApi(apiKey, prompt, modelName);
          if (rawText) {
            let cleanedText = rawText;
            cleanedText = cleanedText.replace(/\|\s*Metragem Comprada[^\n|]*/gi, '');
            cleanedText = cleanedText.replace(/\|\s*Avalia[çc][ãa]o de Custo[^\n|]*/gi, '');
            cleanedText = cleanedText.replace(/(?:---|##)\s*#*\s*[567]\..*$/si, '').trim();
            return res.status(200).json({
              markdown: cleanedText,
              source: "gemini",
              date: dateFormatted,
              geminiStatus: "success"
            });
          }
        } catch (mErr) {
          console.warn(`Model ${modelName} call exception:`, mErr);
        }
      }
    }

    // Deterministic mathematical fallback engine
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
      geminiStatus: hasValidKey ? "model_fallback" : "no_key"
    });
  } catch (err: any) {
    console.error("Critical calculation handler error:", err);
    return res.status(200).json({
      markdown: "Erro temporário ao processar cálculo. Por favor, tente novamente.",
      source: "calculator",
      date: getPortugueseDate(),
      error: err?.message || String(err)
    });
  }
}
