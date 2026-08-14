export interface ProfileInfo {
  name: string;
  widthM: number;        // width in meters (e.g. 0.03m)
  heightM: number;       // height in meters (e.g. 0.03m)
  faceSizeM: number;     // main profile face dimension in meters
  linearWeightKgM: number; // estimated weight per meter in kg/m
}

export function parseProfileInfo(perfilStr: string): ProfileInfo {
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

export interface PieceToCut {
  type: 'Horizontal' | 'Vertical';
  length: number;
  description: string;
}

export interface AllocatedBar {
  id: number;
  remainingLength: number;
  usedLength: number;
  pieces: PieceToCut[];
}

export function optimizePiecesPlan(inputPieces: PieceToCut[]) {
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

  const totalComEmenda = full6mBarsCount + allocatedBars.length;

  return {
    full6mBarsCount,
    allocatedBars,
    totalComEmenda,
  };
}

export function optimizeWholePiecesPlan(inputPieces: PieceToCut[]) {
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

export function getPortugueseDate(): string {
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

export function generateReportMarkdown(
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

  let planoDeCorteTexto = "";
  let totalSemEmendaSemOpt = 0;
  let totalSemEmendaComOpt = 0;
  let totalComEmendaComOpt = 0;

  // Profiles comparison variables
  let extScenario1 = 0, extScenario2 = 0, extScenario3 = 0;
  let intScenario1 = 0, intScenario2 = 0, intScenario3 = 0;

  const totalMetragemLinear = Number((metragemExtTotal + metragemIntTotal).toFixed(2));
  const teoricoBarrasGeral = (totalMetragemLinear / 6.0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const widthFormatted = largura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const heightFormatted = altura.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

    planoDeCorteTexto = `### Memória de Cálculo e Lógica de Otimização

- **Demanda Linear e Consumo Teórico:**
  - **Metragem Linear Total:** ${totalMetragemLinear.toLocaleString("pt-BR")} m (${linhasHorizontais} linhas horizontais de ${widthFormatted} m + ${colunasVerticais} colunas verticais de ${vertCutLength.toLocaleString("pt-BR")} m).
  - **Consumo Teórico Mínimo:** ${teoricoBarrasGeral} barras comerciais de 6,00 m (sem considerar perdas de ponta).

- **Estratégia de Recombinação de Retalhos (Bin-Packing):**
  - As peças mais longas (${linhasHorizontais} linhas de ${widthFormatted} m) são priorizadas para o primeiro corte em barras novas de 6,00 m.
  - As sobras de comprimento útil geradas em cada barra são imediatamente combinadas para cortar as colunas verticais menores (${vertCutLength.toLocaleString("pt-BR")} m), evitando a abertura desnecessária de barras adicionais.
  - O detalhamento peça a peça de cada barra está consolidado na **Tabela de Corte de Barras para a Produção**.

- **Critério de Avaliação Técnica (Emenda vs. Mão de Obra):**
  - **Cenário Sem Emenda (Peças Inteiras):** Mantém as barras cortadas em peças integrais sem soldas de união em peças longas, reduzindo tempo de fabricação e acabamento.
  - **Cenário Com Emenda (Otimização Máxima):** Permite reaproveitamento de retalhos com solda para alcançar o menor volume de compra de aço comercial quando houver economia efetiva de barras.`;
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

    const teoricoExt = (metragemExtTotal / 6.0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const teoricoInt = (metragemIntTotal / 6.0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    planoDeCorteTexto = `### Memória de Cálculo e Lógica de Otimização

- **Demanda Linear por Perfil:**
  - **Perfil Externo (${profileExt.name}):** Metragem total de ${metragemExtTotal.toLocaleString("pt-BR")} m (${horizExtCount} linhas de ${widthFormatted} m + ${vertExtCount} colunas de ${vertCutLength.toLocaleString("pt-BR")} m) -> Consumo Teórico: ${teoricoExt} barras de 6,00 m.
  - **Perfil Interno (${profileInt.name}):** Metragem total de ${metragemIntTotal.toLocaleString("pt-BR")} m (${horizIntCount} linhas de ${widthFormatted} m + ${vertIntCount} colunas de ${vertCutLength.toLocaleString("pt-BR")} m) -> Consumo Teórico: ${teoricoInt} barras de 6,00 m.

- **Estratégia de Recombinação de Retalhos:**
  - Os cálculos de corte são segregados por tipo de perfil para evitar misturas de bitolas na montagem.
  - As sobras das linhas de borda externa de ${widthFormatted} m são aproveitadas para as colunas laterais (${vertCutLength.toLocaleString("pt-BR")} m); similarmente, as sobras das travessas internas são utilizadas nas colunas internas.
  - A alocação peça a peça para cada perfil está detalhada na **Tabela de Corte de Barras para a Produção**.

- **Critério de Avaliação Técnica:**
  - Compara a redução de custo de barras no Cenário 3 contra a agilidade do Cenário 2, favorecendo o corte sem emenda quando a quantidade total de barras de 6m for equivalente.`;
  }

  const profileHeader = isSameProfile
    ? `- **Perfil Metalon Selecionado:** ${profileExt.name} (Face: ${extFaceMm} mm)`
    : `- **Perfil Metalon Externo (Borda):** ${profileExt.name} (Face: ${extFaceMm} mm)\n- **Perfil Metalon Interno (Travessas):** ${profileInt.name} (Face: ${intFaceMm} mm)`;

  // Section 7 Table for Production
  let tablaProducaoTexto = `\n\n---\n\n## 7. Tabela de Corte de Barras para a Produção\n\n| Barra N° | Perfil Metalon | Tamanho Inicial | Peças a Cortar (Gabarito de Corte) | Sobra Restante |\n| :---: | :--- | :---: | :--- | :---: |\n`;

  let barIndexGlobal = 1;

  if (isSameProfile) {
    const allPieces: PieceToCut[] = [
      ...Array(linhasHorizontais).fill(0).map((_, i) => ({ type: 'Horizontal' as const, length: largura, description: `Linha Horiz. ${i + 1}` })),
      ...Array(colunasVerticais).fill(0).map((_, i) => ({ type: 'Vertical' as const, length: vertCutLength, description: `Coluna Vert. ${i + 1}` })),
    ];
    const optSpliceUnified = optimizePiecesPlan(allPieces);

    for (let f = 0; f < optSpliceUnified.full6mBarsCount; f++) {
      tablaProducaoTexto += `| Barra ${String(barIndexGlobal++).padStart(2, '0')} | ${profileExt.name} | 6,00 m | 1x Peça Inteira (6,00 m) | 0,00 m (Sem sobra) |\n`;
    }
    optSpliceUnified.allocatedBars.forEach((bar) => {
      const pecasDesc = bar.pieces.map((p) => `1x ${p.description} (${p.length.toLocaleString('pt-BR')} m)`).join(' + ');
      const sobraStr = bar.remainingLength > 0 ? `${bar.remainingLength.toLocaleString('pt-BR')} m` : '0,00 m (Sem sobra)';
      tablaProducaoTexto += `| Barra ${String(barIndexGlobal++).padStart(2, '0')} | ${profileExt.name} | 6,00 m | ${pecasDesc} | ${sobraStr} |\n`;
    });
  } else {
    const piecesExt: PieceToCut[] = [
      ...Array(horizExtCount).fill(0).map((_, i) => ({ type: 'Horizontal' as const, length: largura, description: `Horiz. Borda ${i + 1}` })),
      ...Array(vertExtCount).fill(0).map((_, i) => ({ type: 'Vertical' as const, length: vertCutLength, description: `Vert. Borda ${i + 1}` })),
    ];
    const piecesInt: PieceToCut[] = [
      ...Array(horizIntCount).fill(0).map((_, i) => ({ type: 'Horizontal' as const, length: largura, description: `Horiz. Interna ${i + 1}` })),
      ...Array(vertIntCount).fill(0).map((_, i) => ({ type: 'Vertical' as const, length: vertCutLength, description: `Vert. Interna ${i + 1}` })),
    ];

    const optExtResult = optimizePiecesPlan(piecesExt);
    const optIntResult = optimizePiecesPlan(piecesInt);

    for (let f = 0; f < optExtResult.full6mBarsCount; f++) {
      tablaProducaoTexto += `| Barra ${String(barIndexGlobal++).padStart(2, '0')} | ${profileExt.name} (Borda) | 6,00 m | 1x Peça Inteira (6,00 m) | 0,00 m (Sem sobra) |\n`;
    }
    optExtResult.allocatedBars.forEach((bar) => {
      const pecasDesc = bar.pieces.map((p) => `1x ${p.description} (${p.length.toLocaleString('pt-BR')} m)`).join(' + ');
      const sobraStr = bar.remainingLength > 0 ? `${bar.remainingLength.toLocaleString('pt-BR')} m` : '0,00 m (Sem sobra)';
      tablaProducaoTexto += `| Barra ${String(barIndexGlobal++).padStart(2, '0')} | ${profileExt.name} (Borda) | 6,00 m | ${pecasDesc} | ${sobraStr} |\n`;
    });

    for (let f = 0; f < optIntResult.full6mBarsCount; f++) {
      tablaProducaoTexto += `| Barra ${String(barIndexGlobal++).padStart(2, '0')} | ${profileInt.name} (Interno) | 6,00 m | 1x Peça Inteira (6,00 m) | 0,00 m (Sem sobra) |\n`;
    }
    optIntResult.allocatedBars.forEach((bar) => {
      const pecasDesc = bar.pieces.map((p) => `1x ${p.description} (${p.length.toLocaleString('pt-BR')} m)`).join(' + ');
      const sobraStr = bar.remainingLength > 0 ? `${bar.remainingLength.toLocaleString('pt-BR')} m` : '0,00 m (Sem sobra)';
      tablaProducaoTexto += `| Barra ${String(barIndexGlobal++).padStart(2, '0')} | ${profileInt.name} (Interno) | 6,00 m | ${pecasDesc} | ${sobraStr} |\n`;
    });
  }

  // Calculate welds/splices logic
  const horizSplicesPerPiece = Math.floor(largura / 6.0);
  const vertSplicesPerPiece = Math.floor(vertCutLength / 6.0);
  const baseLongPieceWelds = (linhasHorizontais * horizSplicesPerPiece) + (colunasVerticais * vertSplicesPerPiece);

  const weldsCountScenario1 = baseLongPieceWelds;
  const weldsCountScenario2 = baseLongPieceWelds;

  // In Scenario 3, additional welds occur if remnants are joined to save bars
  const barsSavedScenario3 = Math.max(0, totalSemEmendaComOpt - totalComEmendaComOpt);
  const weldsCountScenario3 = baseLongPieceWelds + (barsSavedScenario3 > 0 ? barsSavedScenario3 * 1 : 0);

  let recomendacaoCenario2 = "0 soldas adicionais";
  let recomendacaoCenario3 = weldsCountScenario3 > 0 ? `${weldsCountScenario3} ponto(s) de solda` : "0 soldas adicionais";

  if (totalComEmendaComOpt === totalSemEmendaComOpt) {
    recomendacaoCenario2 = "⭐ **RECOMENDADO (Mesmo consumo de barras sem soldas extras)**";
    recomendacaoCenario3 = `${weldsCountScenario3} solda(s) (Não vale a pena por não economizar barras)`;
  } else {
    recomendacaoCenario3 = `⭐ **Economiza ${barsSavedScenario3} barra(s) com ${weldsCountScenario3} ponto(s) de solda**`;
  }

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
}`;
}
