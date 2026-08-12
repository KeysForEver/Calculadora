import express from "express";
import path from "path";
import dotenv from "dotenv";
import os from "os";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy initialization helper for Gemini AI
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

// Helper to parse profile dimensions (e.g., "30x30", "50x50", "40x20", "80x40") and weight
interface ProfileInfo {
  name: string;
  widthM: number;        // width in meters (e.g. 0.03m)
  heightM: number;       // height in meters (e.g. 0.03m)
  faceSizeM: number;     // main profile face dimension in meters
  linearWeightKgM: number; // estimated weight per meter in kg/m
}

function parseProfileInfo(perfilStr: string): ProfileInfo {
  const matches = perfilStr.match(/\d+/g);
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

  // Approximate weight per meter for steel profile (chapa 18 ~ 1.2mm)
  const perimeterMm = 2 * (wMm + hMm);
  const linearWeightKgM = Number((perimeterMm * 0.0105).toFixed(2));

  return {
    name: perfilStr,
    widthM,
    heightM,
    faceSizeM,
    linearWeightKgM: Math.max(linearWeightKgM, 0.5),
  };
}

// Fallback exact calculation function if API is unavailable or offline
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

  // Sort sub-6m pieces descending by length
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

  const totalComEmenda = full6mBarsCount + allocatedBars.length;

  return {
    full6mBarsCount,
    allocatedBars,
    totalComEmenda,
  };
}

function optimizeWholePiecesPlan(inputPieces: PieceToCut[]) {
  const wholeItems: PieceToCut[] = [];
  let longBarsCount = 0;

  for (const piece of inputPieces) {
    if (piece.length > 6.0) {
      // Piece longer than 6m without splice requires Math.ceil(length / 6.0) bars
      longBarsCount += Math.ceil(piece.length / 6.0);
    } else {
      wholeItems.push(piece);
    }
  }

  // Sort descending by length
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

function generateFallbackMarkdown(
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

  // Vertical cut length = altura - 2 * profileExt.faceSizeM (for both outer sides and inner verticals)
  const vertCutLength = Number(Math.max(0.1, altura - 2 * profileExt.faceSizeM).toFixed(3));

  // Spans & lines calculation
  const vaosVerticais = Math.ceil((altura - profileExt.faceSizeM) / (vaoVertM + profileInt.faceSizeM)) || Math.ceil(altura / vaoVertM) || 1;
  const linhasHorizontais = vaosVerticais + 1;
  const vaoLivreVert = Number(((altura - (2 * profileExt.faceSizeM) - (Math.max(0, linhasHorizontais - 2) * profileInt.faceSizeM)) / vaosVerticais).toFixed(3));

  const vaosHorizontais = Math.ceil((largura - profileExt.faceSizeM) / (vaoHorizM + profileInt.faceSizeM)) || Math.ceil(largura / vaoHorizM) || 1;
  const colunasVerticais = vaosHorizontais + 1;
  const vaoLivreHoriz = Number(((largura - (2 * profileExt.faceSizeM) - (Math.max(0, colunasVerticais - 2) * profileInt.faceSizeM)) / vaosHorizontais).toFixed(3));

  // Quantities
  const horizExtCount = Math.min(2, linhasHorizontais);
  const horizIntCount = Math.max(0, linhasHorizontais - 2);

  const vertExtCount = Math.min(2, colunasVerticais);
  const vertIntCount = Math.max(0, colunasVerticais - 2);

  // Linear metrage
  const metragemExtHoriz = Number((horizExtCount * largura).toFixed(2));
  const metragemExtVert = Number((vertExtCount * vertCutLength).toFixed(2));
  const metragemExtTotal = Number((metragemExtHoriz + metragemExtVert).toFixed(2));

  const metragemIntHoriz = Number((horizIntCount * largura).toFixed(2));
  const metragemIntVert = Number((vertIntCount * vertCutLength).toFixed(2));
  const metragemIntTotal = Number((metragemIntHoriz + metragemIntVert).toFixed(2));

  const metragemGeral = Number((metragemExtTotal + metragemIntTotal).toFixed(2));

  let planoDeCorteTexto = "";
  let totalSemEmendaSemOpt = 0;
  let totalSemEmendaComOpt = 0;
  let totalComEmendaComOpt = 0;

  // Profiles comparison variables
  let extScenario1 = 0, extScenario2 = 0, extScenario3 = 0;
  let intScenario1 = 0, intScenario2 = 0, intScenario3 = 0;

  if (isSameProfile) {
    const allPieces: PieceToCut[] = [
      ...Array(linhasHorizontais).fill(0).map((_, i) => ({ type: 'Horizontal' as const, length: largura, description: `Linha Horiz ${i + 1}` })),
      ...Array(colunasVerticais).fill(0).map((_, i) => ({ type: 'Vertical' as const, length: vertCutLength, description: `Coluna Vert ${i + 1}` })),
    ];

    // Scenario 1: Sem Emenda & Sem Otimização (Compra Direta)
    totalSemEmendaSemOpt = (linhasHorizontais * Math.ceil(largura / 6.0)) + (colunasVerticais * Math.ceil(vertCutLength / 6.0));

    // Scenario 2: Sem Emenda & Com Otimização de Peças Inteiras
    const optWholeUnified = optimizeWholePiecesPlan(allPieces);
    totalSemEmendaComOpt = optWholeUnified.totalBars;

    // Scenario 3: Com Emenda & Com Otimização Total
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

    // External profile scenarios
    extScenario1 = (horizExtCount * Math.ceil(largura / 6.0)) + (vertExtCount * Math.ceil(vertCutLength / 6.0));
    extScenario2 = optimizeWholePiecesPlan(piecesExt).totalBars;
    const optExtResult = optimizePiecesPlan(piecesExt);
    extScenario3 = optExtResult.totalComEmenda;

    // Internal profile scenarios
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
- **Dimensões da Estrutura:** ${widthFormatted} m × ${heightFormatted} m
${profileHeader}
- **Vão Máximo Horizontal (Colunas):** ${vaoMaxHorizCm} cm (${vaoHorizM.toLocaleString("pt-BR")} m)
- **Vão Máximo Vertical (Linhas):** ${vaoMaxVertCm} cm (${vaoVertM.toLocaleString("pt-BR")} m)
- **Desconto de Encaixe:** -${(profileExt.faceSizeM * 2 * 1000).toFixed(0)} mm na altura das colunas verticais (encaixe sob as barras superior/inferior do Perfil Externo de ${extFaceMm} mm)

---

## 1. Estrutura Horizontal
* Linhas Horizontais Totais: **${linhasHorizontais} linhas** (${vaosVerticais} vãos de **${vaoLivreVert.toLocaleString("pt-BR")} m** de vão livre)
* Linhas de Borda Externa (${profileExt.name}): **${horizExtCount} linhas** de **${widthFormatted} m** = **${metragemExtHoriz.toLocaleString("pt-BR")} m**
${horizIntCount > 0 ? `* Linhas Internas (${profileInt.name}): **${horizIntCount} linhas** de **${widthFormatted} m** = **${metragemIntHoriz.toLocaleString("pt-BR")} m**\n` : ''}

---

## 2. Estrutura Vertical (Com Desconto do Perfil Externo)
* Colunas Verticais Totais: **${colunasVerticais} colunas** (${vaosHorizontais} vãos de **${vaoLivreHoriz.toLocaleString("pt-BR")} m** de vão livre)
* **Comprimento real de corte por coluna:** **${vertCutLength.toLocaleString("pt-BR")} m** (com desconto de 2× ${extFaceMm} mm dos perfis de contorno)
* Colunas de Borda Externa (${profileExt.name}): **${vertExtCount} colunas** = **${metragemExtVert.toLocaleString("pt-BR")} m**
${vertIntCount > 0 ? `* Colunas Internas (${profileInt.name}): **${vertIntCount} colunas** = **${metragemIntVert.toLocaleString("pt-BR")} m**\n` : ''}

---

## 3. Plano de Corte Otimizado (Reaproveitamento de Sobras)
${planoDeCorteTexto}

---

## 4. Resultado e Quadro Comparativo de Consumo

${
  isSameProfile
    ? `| Cenário / Método de Corte | Horizontais | Verticais | Aplicação / Característica | Total de Barras (6m) |
| :------------------------ | :---------: | :-------: | :------------------------- | :------------------: |
| **1. Sem Emenda e Sem Otimização** | ${linhasHorizontais * Math.ceil(largura / 6.0)} | ${colunasVerticais * Math.ceil(vertCutLength / 6.0)} | Compra direta por peça isolada | **${totalSemEmendaSemOpt} barra(s)** |
| **2. Sem Emenda com Otimização** | - | - | Aproveita sobras com peças inteiras (sem soldas) | **${totalSemEmendaComOpt} barra(s)** |
| **3. Com Emenda e Otimização Total** | - | - | Otimização máxima (permite emenda de sobras) | **${totalComEmendaComOpt} barra(s)** |`
    : `| Cenário / Método de Corte | Perfil Externo (${profileExt.name}) | Perfil Interno (${profileInt.name}) | TOTAL GERAL DO PROJETO |
| :------------------------ | :---------------------------------: | :---------------------------------: | :--------------------: |
| **1. Sem Emenda e Sem Otimização** | ${extScenario1} barra(s) | ${intScenario1} barra(s) | **${totalSemEmendaSemOpt} barra(s)** |
| **2. Sem Emenda com Otimização** | ${extScenario2} barra(s) | ${intScenario2} barra(s) | **${totalSemEmendaComOpt} barra(s)** |
| **3. Com Emenda e Otimização Total** | ${extScenario3} barra(s) | ${intScenario3} barra(s) | **${totalComEmendaComOpt} barra(s)** |`
}`;
}

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
5. OS 3 CENÁRIOS OBRIGATÓRIOS PARA A SEÇÃO 4:
   - Cenário 1: "Sem Emenda e Sem Otimização" -> Compra direta onde cada peça é cortada individualmente de suas próprias barras de 6m sem compartilhar sobras entre peças.
   - Cenário 2: "Sem Emenda com Otimização de Corte" -> Peças inteiras (sem nenhuma solda/emenda individual em barras), mas otimizando o plano de corte para encaixar peças inteiras nas sobras das barras de 6m.
   - Cenário 3: "Com Emenda e Otimização Total" -> Otimização máxima permitindo emendas/soldas estruturais de retalhos para obter o menor consumo total absoluto de barras de 6m.

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
[Detalhe o plano de corte das barras de 6m do Cenário Otimizado. Se os perfis forem diferentes, detalhe a seção A para Perfil Externo e a seção B para Perfil Interno]

---

## 4. Resultado e Quadro Comparativo de Consumo
[Apresente a tabela comparativa exibindo OBRIGATORIAMENTE as linhas para os 3 Cenários: 1. Sem Emenda e Sem Otimização, 2. Sem Emenda com Otimização, 3. Com Emenda e Otimização Total].
CRÍTICO: NÃO INCLUA NENHUMA COLUNA CHAMADA 'Metragem Comprada' OU SIMILAR NA TABELA DA SEÇÃO 4. As colunas devem focar exclusivamente no consumo em barras de 6m por perfil/cenário e total de barras.
OBRIGATÓRIO: Na Seção 4, exiba APENAS a tabela comparativa dos 3 cenários, sem nenhum texto ou marcador abaixo dela.
`;

    // Attempt Gemini call if GEMINI_API_KEY is defined
    const aiClient = getGeminiClient();
    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            temperature: 0.1, // low temperature for precise mathematical calculations
            systemInstruction: `Você é um especialista em serralheria e cálculo de estruturas de metalon. Calcule com extrema precisão os vãos, linhas, colunas, metragens lineares e barras de 6 metros respeitando estritamente o vão máximo horizontal de ${vaoMaxHorizCm} cm (colunas) e vão máximo vertical de ${vaoMaxVertCm} cm (linhas) configurados pelo usuário. CRÍTICO E OBRIGATÓRIO: Na tabela da Seção 4, NUNCA INCLUA a coluna 'Metragem Comprada' ou qualquer coluna em metros comprados. Exiba APENAS a quantidade de barras de 6m por perfil e o total de barras do projeto. Exiba APENAS a tabela comparativa sem nenhum texto ou marcador abaixo dela na Seção 4. Responda rigorosamente no formato especificado em Markdown.`,
          },
        });

        if (response.text) {
          // Sanitizer function to strip any "Metragem Comprada" column from markdown tables if generated
          let cleanedText = response.text;
          cleanedText = cleanedText.replace(/\|\s*Metragem Comprada[^\n|]*/gi, '');
          return res.json({
            markdown: cleanedText,
            source: "gemini",
            date: dateFormatted
          });
        }
      } catch (geminiErr) {
        console.warn("Gemini API call warning, using fallback calculation:", geminiErr);
      }
    }

    // Fallback deterministic calculation if Gemini API key is missing or errored
    const fallbackMarkdown = generateFallbackMarkdown(numLargura, numAltura, perfilExtStr, perfilIntStr, vaoMaxHorizCm, vaoMaxVertCm);
    return res.json({
      markdown: fallbackMarkdown,
      source: "calculator",
      date: dateFormatted
    });

  } catch (error: any) {
    console.error("Error in /api/calculate:", error);
    res.status(500).json({ error: error?.message || "Erro interno no servidor ao calcular metalon." });
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
