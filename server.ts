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

function optimizeCuttingPlan(
  largura: number,
  altura: number,
  linhasHorizontais: number,
  colunasVerticais: number,
  profile: ProfileInfo
) {
  let full6mBarsCount = 0;
  const pieces: PieceToCut[] = [];

  // Horizontal pieces (run full width of frame)
  const horizCutLength = largura;
  const horizFullPerLine = Math.floor(horizCutLength / 6.0);
  const horizRemPerLine = Number((horizCutLength - horizFullPerLine * 6.0).toFixed(3));

  for (let i = 0; i < linhasHorizontais; i++) {
    full6mBarsCount += horizFullPerLine;
    if (horizRemPerLine > 0) {
      pieces.push({
        type: 'Horizontal',
        length: horizRemPerLine,
        description: `Linha Horiz ${i + 1}`,
      });
    }
  }

  // Inner vertical columns fit between top & bottom horizontal profile bars
  // Deduct 2x profile face thickness from height for exact cut length
  const vertCutLength = Math.max(0.1, Number((altura - 2 * profile.faceSizeM).toFixed(3)));
  const vertFullPerCol = Math.floor(vertCutLength / 6.0);
  const vertRemPerCol = Number((vertCutLength - vertFullPerCol * 6.0).toFixed(3));

  for (let i = 0; i < colunasVerticais; i++) {
    full6mBarsCount += vertFullPerCol;
    if (vertRemPerCol > 0) {
      pieces.push({
        type: 'Vertical',
        length: vertRemPerCol,
        description: `Coluna Vert ${i + 1} (desconto de ${profile.faceSizeM * 2 * 1000}mm do perfil)`,
      });
    }
  }

  // Sort sub-6m pieces descending by length
  pieces.sort((a, b) => b.length - a.length);

  const allocatedBars: AllocatedBar[] = [];

  for (const piece of pieces) {
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
    vertCutLength,
    full6mBarsCount,
    allocatedBars,
    totalComEmenda,
  };
}

function generateFallbackMarkdown(
  largura: number,
  altura: number,
  perfilStr: string,
  vaoMaxCm: number = 80
): string {
  const profile = parseProfileInfo(perfilStr);
  const vaoMaxM = vaoMaxCm / 100;

  // 1. Horizontal Structure (accounting for max vaoMaxM clear gap)
  const vaosVerticais = Math.ceil((altura - profile.faceSizeM) / (vaoMaxM + profile.faceSizeM)) || Math.ceil(altura / vaoMaxM);
  const linhasHorizontais = vaosVerticais + 1;
  const vaoLivreVert = Number(((altura - (linhasHorizontais * profile.faceSizeM)) / vaosVerticais).toFixed(3));

  const metragemHorizontal = Number((linhasHorizontais * largura).toFixed(2));
  const barrasHorizSemEmenda = linhasHorizontais * Math.ceil(largura / 6.0);

  // 2. Vertical Structure
  const vaosHorizontais = Math.ceil((largura - profile.faceSizeM) / (vaoMaxM + profile.faceSizeM)) || Math.ceil(largura / vaoMaxM);
  const colunasVerticais = vaosHorizontais + 1;
  const vaoLivreHoriz = Number(((largura - (colunasVerticais * profile.faceSizeM)) / vaosHorizontais).toFixed(3));

  // Actual cut length per vertical column deducting top and bottom horizontal profiles
  const vertCutLength = Number((altura - (2 * profile.faceSizeM)).toFixed(3));
  const metragemVertical = Number((colunasVerticais * vertCutLength).toFixed(2));
  const barrasVertSemEmenda = colunasVerticais * Math.ceil(vertCutLength / 6.0);

  const totalSemEmenda = barrasHorizSemEmenda + barrasVertSemEmenda;

  // 3. Integrated Cutting Plan Optimization
  const { full6mBarsCount, allocatedBars, totalComEmenda } = optimizeCuttingPlan(
    largura,
    altura,
    linhasHorizontais,
    colunasVerticais,
    profile
  );

  const metragemTotal = Number((metragemHorizontal + metragemVertical).toFixed(2));

  const widthFormatted = largura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const heightFormatted = altura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const profileFaceMm = (profile.faceSizeM * 1000).toFixed(0);

  let planoDeCorteTexto = "";
  if (full6mBarsCount > 0) {
    planoDeCorteTexto += `- **Barras de 6m inteiras:** ${full6mBarsCount} barra(s) consumidas diretamente em trechos de 6m.\n`;
  }

  if (allocatedBars.length > 0) {
    planoDeCorteTexto += `- **Barras fracionadas com corte otimizado (${allocatedBars.length} barra(s)):**\n`;
    allocatedBars.forEach((bar, index) => {
      const pecasDesc = bar.pieces
        .map((p) => `${p.type === "Horizontal" ? "1x Horiz" : "1x Vert"} (${p.length.toLocaleString("pt-BR")} m)`)
        .join(" + ");
      const sobraStr = bar.remainingLength > 0 
        ? ` -> **Sobra:** ${bar.remainingLength.toLocaleString("pt-BR")} m`
        : ` -> **Sem sobra**`;
      planoDeCorteTexto += `  - *Barra ${index + 1}:* ${pecasDesc}${sobraStr}\n`;
    });
  }

  return `## Considerações Técnicas do Perfil
- **Dimensões da Estrutura:** ${widthFormatted} m × ${heightFormatted} m
- **Perfil Metalon Selecionado:** ${profile.name} (Largura da face: ${profileFaceMm} mm)
- **Espaçamento Máximo (Vão Livre Configurado):** ${vaoMaxCm} cm (${vaoMaxM.toLocaleString("pt-BR")} m)
- **Desconto de Encaixe:** -${(profile.faceSizeM * 2 * 1000).toFixed(0)} mm na altura dos perfis verticais internos (encaixe entre perfis superiores/inferiores de ${profileFaceMm} mm)

---

## 1. Estrutura Horizontal
* Linhas Horizontais: **${linhasHorizontais} linhas** (${vaosVerticais} vãos de **${vaoLivreVert.toLocaleString("pt-BR")} m** de vão livre entre perfis)
* Comprimento de corte por barra horizontal: **${widthFormatted} m**
* Metragem linear total horizontal:
$$${linhasHorizontais} \\times ${widthFormatted} = ${metragemHorizontal.toLocaleString("pt-BR")} \\text{ m}$$

---

## 2. Estrutura Vertical (Com Desconto do Perfil)
* Colunas Verticais: **${colunasVerticais} colunas** (${vaosHorizontais} vãos de **${vaoLivreHoriz.toLocaleString("pt-BR")} m** de vão livre entre perfis)
* **Comprimento real de corte por coluna:** **${vertCutLength.toLocaleString("pt-BR")} m** (calculado com o desconto de 2× ${profileFaceMm} mm dos perfis de contorno)
* Metragem linear total vertical:
$$${colunasVerticais} \\times ${vertCutLength.toLocaleString("pt-BR")} = ${metragemVertical.toLocaleString("pt-BR")} \\text{ m}$$

---

## 3. Plano de Corte Otimizado (Reaproveitamento Cruzado com Desconto do Perfil)
Considerando o desconto das dimensões do perfil (${profile.name}) e o vão máximo de **${vaoMaxCm} cm**, o comprimento exato das colunas verticais foi ajustado para **${vertCutLength.toLocaleString("pt-BR")} m**. As sobras das peças horizontais são integradas diretamente no corte das verticais.

Metragem total real necessária: **${metragemTotal.toLocaleString("pt-BR")} m**

${planoDeCorteTexto}

---

## 4. Resultado e Comparativo de Consumo

| Método de Compra / Corte | Horizontais | Verticais | Total de Barras (6m) |
| :----------------------- | :---------: | :-------: | :------------------: |
| **Sem emenda** (Sem desconto/reaproveitamento) | ${barrasHorizSemEmenda} | ${barrasVertSemEmenda} | **${totalSemEmenda} barra(s)** |
| **Com emenda** (Otimizado + Desconto do Perfil) | - | - | **${totalComEmenda} barra(s)** |`;
}

app.post("/api/calculate", async (req, res) => {
  try {
    const { largura, altura, perfil, vaoMaximo } = req.body;

    if (!largura || !altura || !perfil) {
      return res.status(400).json({ error: "Largura, altura e perfil são obrigatórios." });
    }

    const numLargura = parseFloat(String(largura).replace(",", "."));
    const numAltura = parseFloat(String(altura).replace(",", "."));
    const perfilStr = String(perfil).trim();

    const rawVaoMax = vaoMaximo ? parseFloat(String(vaoMaximo).replace(",", ".")) : 80;
    const vaoMaxCm = (isNaN(rawVaoMax) || rawVaoMax <= 0) ? 80 : rawVaoMax;
    const vaoMaxM = vaoMaxCm / 100;

    if (isNaN(numLargura) || isNaN(numAltura) || numLargura <= 0 || numAltura <= 0) {
      return res.status(400).json({ error: "Largura e altura devem ser números positivos válidos." });
    }

    const dateFormatted = getPortugueseDate();

    const profileInfo = parseProfileInfo(perfilStr);

    const prompt = `Atue como um serralheiro e calculista de estruturas metálicas experiente. 
Preciso calcular a quantidade exata de barras de metalon para uma estrutura retangular, levando em conta a bitola real do perfil selecionado e o vão máximo configurado pelo usuário.

Regras fundamentais de cálculo e otimização:
1. Comprimento de cada barra de metalon padrão disponível no mercado: 6 metros.
2. O ESPAÇAMENTO MÁXIMO PERMITIDO (VÃO LIVRE) entre os perfis é de **${vaoMaxCm} cm** (${vaoMaxM.toString().replace(".", ",")} metros).
3. Tipo de metalon utilizado: ${perfilStr} (Face do perfil: ${profileInfo.faceSizeM * 1000} mm).
4. DESCONTO DAS DIMENSÕES DO PERFIL NOS PORTES INTERNOS:
   - As colunas verticais internas se encaixam entre as barras horizontais superior e inferior do contorno.
   - Portanto, o comprimento de corte real de cada coluna vertical DEVE descontar 2x a largura da face do perfil: Comprimento Corte Vert = Altura - (2 × ${profileInfo.faceSizeM} m) = ${(numAltura - 2 * profileInfo.faceSizeM).toFixed(3)} m.
5. REAPROVEITAMENTO CRUZADO DE SOBRAS (Corte Otimizado / Com Emenda):
   - Ao calcular o consumo "Com emenda" (corte otimizado), você DEVE unificar as peças horizontais e verticais necessárias.
   - As sobras/retalhos gerados ao cortar as peças horizontais DEVEM ser aproveitados para cortar as peças verticais (e vice-versa) a partir das mesmas barras de 6 metros.
   - Aplique otimização de plano de corte (Bin Packing) para determinar o número mínimo total de barras de 6m necessárias para cobrir toda a estrutura.

Dimensões da estrutura:
- Largura: [${numLargura.toString().replace(".", ",")} metros]
- Altura: [${numAltura.toString().replace(".", ",")} metros]
- Perfil de metalon: [${perfilStr}]
- Vão máximo configurado: [${vaoMaxCm} cm]

Formato da resposta (obrigatório em Markdown):

## Considerações Técnicas do Perfil
- **Dimensões da Estrutura:** [x] m × [y] m
- **Perfil Metalon Selecionado:** ${perfilStr}
- **Espaçamento Máximo (Vão Livre Configurado):** ${vaoMaxCm} cm
- **Desconto de Encaixe:** -[2x face do perfil em mm] mm no comprimento de corte das colunas verticais

---

## 1. Estrutura Horizontal
* Linhas Horizontais: **[qtd] linhas** ([vãos] vãos de **[vão livre] m** entre perfis)
* Comprimento de corte por barra horizontal: **[largura] m**
* Metragem linear total horizontal:
$$[linhas] \\times [largura] = [resultado] \\text{ m}$$

---

## 2. Estrutura Vertical (Com Desconto do Perfil)
* Colunas Verticais: **[qtd] colunas** ([vãos] vãos de **[vão livre] m** entre perfis)
* **Comprimento real de corte por coluna:** **[altura - 2x perfil] m** (calculado com o desconto dos perfis de contorno)
* Metragem linear total vertical:
$$[colunas] \\times [comprimento_corte] = [resultado] \\text{ m}$$

---

## 3. Plano de Corte Otimizado (Reaproveitamento Cruzado com Desconto do Perfil)
[Detalhe o plano de corte das barras de 6m considerando os comprimentos ajustados com o desconto do perfil, vão máximo de ${vaoMaxCm} cm e o reaproveitamento cruzado de retalhos]

---

## 4. Resultado e Comparativo de Consumo
| Método de Compra / Corte | Horizontais | Verticais | Total de Barras (6m) |
| :----------------------- | :---------: | :-------: | :------------------: |
| **Sem emenda** (Sem desconto/reaproveitamento) | [qtd] | [qtd] | **[total] barra(s)** |
| **Com emenda** (Otimizado + Desconto do Perfil) | - | - | **[total otimizado] barra(s)** |
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
            systemInstruction: `Você é um especialista em serralheria e cálculo de estruturas de metalon. Calcule com extrema precisão os vãos, linhas, colunas, metragens lineares e barras de 6 metros respeitando estritamente o vão máximo de ${vaoMaxCm} cm configurado pelo usuário. OBRIGATÓRIO: Na Seção 4, exiba APENAS a tabela comparativa, sem adicionar nenhum texto, marcadores ou resumos de economia abaixo da tabela. Responda rigorosamente no formato especificado em Markdown.`,
          },
        });

        if (response.text) {
          return res.json({
            markdown: response.text,
            source: "gemini",
            date: dateFormatted
          });
        }
      } catch (geminiErr) {
        console.warn("Gemini API call warning, using fallback calculation:", geminiErr);
      }
    }

    // Fallback deterministic calculation if Gemini API key is missing or errored
    const fallbackMarkdown = generateFallbackMarkdown(numLargura, numAltura, perfilStr, vaoMaxCm);
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
