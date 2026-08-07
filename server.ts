import express from "express";
import path from "path";
import dotenv from "dotenv";
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

// Fallback exact calculation function if API is unavailable or offline
function generateFallbackMarkdown(largura: number, altura: number, perfil: string): string {
  const dateStr = getPortugueseDate();
  
  // 1. Horizontal Structure
  const vaosVerticais = Math.ceil(altura / 0.80);
  const linhasHorizontais = vaosVerticais + 1;
  const metragemHorizontal = Number((linhasHorizontais * largura).toFixed(2));
  
  const barrasHorizSemEmenda = linhasHorizontais * Math.ceil(largura / 6.0);
  const barrasHorizComEmenda = Math.ceil(metragemHorizontal / 6.0);

  // 2. Vertical Structure
  const vaosHorizontais = Math.ceil(largura / 0.80);
  const colunasVerticais = vaosHorizontais + 1;
  const metragemVertical = Number((colunasVerticais * altura).toFixed(2));
  
  const barrasVertSemEmenda = colunasVerticais * Math.ceil(altura / 6.0);
  const barrasVertComEmenda = altura <= 6.0 ? colunasVerticais : Math.ceil(metragemVertical / 6.0);

  const totalSemEmenda = barrasHorizSemEmenda + barrasVertSemEmenda;
  const totalComEmenda = barrasHorizComEmenda + barrasVertComEmenda;

  const widthFormatted = largura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const heightFormatted = altura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `## Considerações
- Dimensões da estrutura: ${widthFormatted} m × ${heightFormatted} m
- Espaçamento máx: 0,80 m
- Perfil metalon: ${perfil}

---

## 1. Estrutura Horizontal
* Cálculo dos vãos verticais:
$$\\text{Vãos} = \\frac{${heightFormatted}}{0,80} = ${vaosVerticais}$$

* Quantidade de linhas horizontais:
$$\\text{Linhas} = ${vaosVerticais} + 1 = ${linhasHorizontais}$$

* Metragem linear total horizontal:
$$${linhasHorizontais} \\times ${widthFormatted} = ${metragemHorizontal.toLocaleString("pt-BR")} \\text{ m}$$

Consumo de barras horizontais:
- **Sem emenda:** Cada linha necessita de ${Math.ceil(largura / 6.0)} barra(s) de 6m → ${barrasHorizSemEmenda} barra(s)
- **Com emenda:** ${metragemHorizontal.toLocaleString("pt-BR")} m ÷ 6 m = ${barrasHorizComEmenda} barra(s)

---

## 2. Estrutura Vertical
* Cálculo dos vãos horizontais:
$$\\text{Vãos} = \\frac{${widthFormatted}}{0,80} = ${vaosHorizontais}$$

* Quantidade de colunas verticais:
$$\\text{Colunas} = ${vaosHorizontais} + 1 = ${colunasVerticais}$$

* Metragem linear total vertical:
$$${colunasVerticais} \\times ${heightFormatted} = ${metragemVertical.toLocaleString("pt-BR")} \\text{ m}$$

Consumo de barras verticais:
- **Sem emenda:** cada coluna consome 1 barra inteira de 6m → ${barrasVertSemEmenda} barra(s)
- **Com emenda:** regra idêntica às sem emenda (não há reaproveitamento de sobras) → ${barrasVertComEmenda} barra(s)

---

## 3. Resultado
| Tipo        | Horizontal | Vertical | Total |
| :---------: | :--------: | :------: | :---: |
| Sem emenda  | ${barrasHorizSemEmenda} | ${barrasVertSemEmenda} | ${totalSemEmenda} |
| Com emenda  | ${barrasHorizComEmenda} | ${barrasVertComEmenda} | ${totalComEmenda} |

---

Data: ${dateStr}`;
}

app.post("/api/calculate", async (req, res) => {
  try {
    const { largura, altura, perfil } = req.body;

    if (!largura || !altura || !perfil) {
      return res.status(400).json({ error: "Largura, altura e perfil são obrigatórios." });
    }

    const numLargura = parseFloat(String(largura).replace(",", "."));
    const numAltura = parseFloat(String(altura).replace(",", "."));
    const perfilStr = String(perfil).trim();

    if (isNaN(numLargura) || isNaN(numAltura) || numLargura <= 0 || numAltura <= 0) {
      return res.status(400).json({ error: "Largura e altura devem ser números positivos válidos." });
    }

    const dateFormatted = getPortugueseDate();

    const prompt = `Atue como um serralheiro e calculista de estruturas metálicas experiente. 
Preciso calcular a quantidade exata de barras de metalon para uma estrutura retangular.

Regras fundamentais:
1. Comprimento de cada barra de metalon disponível: 6 metros.
2. O espaçamento máximo permitido entre os perfis é de [80 cm] tanto na horizontal quanto na vertical.
3. O tipo de metalon utilizado deve ser informado no resultado (exemplo: 30x30).

Dimensões da estrutura:
- Largura: [${numLargura.toString().replace(".", ",")} metros]
- Altura: [${numAltura.toString().replace(".", ",")} metros]
- Perfil de metalon: [${perfilStr}]

Formato da resposta (obrigatório):

## Considerações
- Dimensões da estrutura: [x] m × [y] m
- Espaçamento máx: 0,80 m
- Perfil metalon: [z x z mm]

---

## 1. Estrutura Horizontal
* Cálculo dos vãos verticais:
$$\\text{Vãos} = \\frac{[altura]}{0,80} = [resultado]$$

* Quantidade de linhas horizontais:
$$\\text{Linhas} = [vãos] + 1 = [resultado]$$

* Metragem linear total horizontal:
$$[linhas] \\times [largura] = [resultado] \\text{ m}$$

Consumo de barras horizontais:
- **Sem emenda:** [detalhe do cálculo e resultado]  
- **Com emenda:** [detalhe do cálculo e resultado]

---

## 2. Estrutura Vertical
* Cálculo dos vãos horizontais:
$$\\text{Vãos} = \\frac{[largura]}{0,80} = [resultado]$$

* Quantidade de colunas verticais:
$$\\text{Colunas} = [vãos] + 1 = [resultado]$$

* Metragem linear total vertical:
$$[colunas] \\times [altura] = [resultado] \\text{ m}$$

Consumo de barras verticais:
- **Sem emenda:** cada coluna consome 1 barra inteira de 6m → [resultado]  
- **Com emenda:** regra idêntica às sem emenda (não há reaproveitamento de sobras) → [resultado]

---

## 3. Resultado
| Tipo        | Horizontal | Vertical | Total |
| :---------: | :--------: | :------: | :---: |
| Sem emenda  | [valor]    | [valor]  | [total] |
| Com emenda  | [valor]    | [valor]  | [total] |

---

Data: ${dateFormatted}
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
            systemInstruction: "Você é um especialista em serralheria e cálculo de estruturas de metalon. Calcule com extrema precisão os vãos, linhas, colunas, metragens lineares e barras de 6 metros. Responda rigorosamente no formato especificado em Markdown.",
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
    const fallbackMarkdown = generateFallbackMarkdown(numLargura, numAltura, perfilStr);
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar o servidor Express/Vite:", err);
});
