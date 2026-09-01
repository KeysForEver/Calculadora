export interface RawPieceItem {
  id?: string;
  length: number; // in meters (e.g. 3.90)
  description: string;
  type?: 'Horizontal' | 'Vertical' | 'Travessa' | 'Borda' | 'Outro';
  profileName?: string;
  quantity?: number;
}

export interface BarCutSegment {
  id: string;
  pieceIndex: number;
  description: string;
  type: 'Horizontal' | 'Vertical' | 'Travessa' | 'Borda' | 'Outro';
  length: number; // in meters
  startM: number;
  endM: number;
  percentageOfBar: number;
  kerfAfterM: number;
  colorIndex: number;
}

export interface PackedBar {
  barIndex: number; // 1-indexed (Barra 01, Barra 02...)
  profileName: string;
  totalCapacityM: number; // 6.00m
  usedLengthM: number;
  wasteLengthM: number;
  kerfLossM: number;
  efficiencyPct: number;
  cuts: BarCutSegment[];
  isFullyUsed: boolean;
  leftoverCategory: 'reusable' | 'scrap' | 'none'; // >= 0.8m is reusable, < 0.8m is scrap
  isOverloaded?: boolean;
  overloadM?: number;
}

export interface BinPackingResult {
  bars: PackedBar[];
  totalBars: number;
  totalCutLengthM: number;
  totalPurchasedLengthM: number;
  totalWasteLengthM: number;
  totalKerfLossM: number;
  globalEfficiencyPct: number;
  reusableLeftoversCount: number;
  reusableLeftoversLengthM: number;
  scrapWasteLengthM: number;
  kerfMm: number;
  piecesCount: number;
  profileName: string;
}

export interface BinPackingOptions {
  barLengthM?: number; // default 6.00
  kerfMm?: number; // default 0 or 3 mm
  profileName?: string;
}

/**
 * Robust 1D Bin Packing (Cutting Stock) Optimization Engine.
 * Packs cut pieces into 6.00m commercial bars to minimize waste and total bars.
 */
export function optimizeBarCuttingStock(
  piecesInput: RawPieceItem[],
  options: BinPackingOptions = {}
): BinPackingResult {
  const barLengthM = options.barLengthM ?? 6.0;
  const kerfMm = options.kerfMm ?? 0;
  const kerfM = kerfMm / 1000.0;
  const profileName = options.profileName ?? 'Metalon';

  // 1. Flatten all pieces according to quantities
  const expandedPieces: {
    id: string;
    originalDesc: string;
    type: 'Horizontal' | 'Vertical' | 'Travessa' | 'Borda' | 'Outro';
    length: number;
  }[] = [];

  let pieceCounter = 1;

  for (const item of piecesInput) {
    const qty = item.quantity ?? 1;
    for (let q = 0; q < qty; q++) {
      let remLen = item.length;
      let seg = 1;
      // Handle pieces longer than 6.00m by splitting into 6m segments
      while (remLen > barLengthM + 0.001) {
        expandedPieces.push({
          id: `p-${pieceCounter++}`,
          originalDesc: `${item.description} (Trecho ${seg})`,
          type: item.type ?? 'Horizontal',
          length: barLengthM,
        });
        remLen = Number((remLen - barLengthM).toFixed(4));
        seg++;
      }

      if (remLen > 0.001) {
        expandedPieces.push({
          id: `p-${pieceCounter++}`,
          originalDesc: seg > 1 ? `${item.description} (Final)` : item.description,
          type: item.type ?? 'Horizontal',
          length: Number(remLen.toFixed(4)),
        });
      }
    }
  }

  // 2. Multi-strategy packing simulation to find the best layout
  // Strategy A: Best-Fit Decreasing (BFD)
  const resultBFD = runPackingPass(expandedPieces, barLengthM, kerfM, 'BFD');
  // Strategy B: First-Fit Decreasing (FFD)
  const resultFFD = runPackingPass(expandedPieces, barLengthM, kerfM, 'FFD');
  // Strategy C: Exact-Sum Pairing Priority + BFD
  const resultPaired = runPackingPass(expandedPieces, barLengthM, kerfM, 'PAIRED');

  // Choose the result with fewest bars, then highest efficiency, then highest reusable leftover
  const candidates = [resultBFD, resultFFD, resultPaired];
  candidates.sort((a, b) => {
    if (a.bars.length !== b.bars.length) {
      return a.bars.length - b.bars.length;
    }
    if (Math.abs(a.totalWaste - b.totalWaste) > 0.01) {
      return a.totalWaste - b.totalWaste;
    }
    return b.reusableWaste - a.reusableWaste;
  });

  const bestPlan = candidates[0];

  // 3. Format the final output structures
  const formattedBars: PackedBar[] = bestPlan.bars.map((bar, barIdx) => {
    let currentOffset = 0;
    const cuts: BarCutSegment[] = [];

    bar.items.forEach((item, itemIdx) => {
      const isLastCut = itemIdx === bar.items.length - 1;
      const appliedKerf = !isLastCut ? kerfM : 0;
      const startM = Number(currentOffset.toFixed(4));
      const endM = Number((currentOffset + item.length).toFixed(4));
      const pct = Number(((item.length / barLengthM) * 100).toFixed(1));

      cuts.push({
        id: `bar-${barIdx + 1}-cut-${itemIdx + 1}`,
        pieceIndex: itemIdx + 1,
        description: item.originalDesc,
        type: item.type,
        length: item.length,
        startM,
        endM,
        percentageOfBar: pct,
        kerfAfterM: appliedKerf,
        colorIndex: (barIdx * 3 + itemIdx) % 6,
      });

      currentOffset += item.length + appliedKerf;
    });

    const usedLengthM = Number(bar.items.reduce((s, it) => s + it.length, 0).toFixed(4));
    const kerfLossM = Number((bar.items.length > 1 ? (bar.items.length - 1) * kerfM : 0).toFixed(4));
    const wasteLengthM = Number(Math.max(0, barLengthM - (usedLengthM + kerfLossM)).toFixed(4));
    const efficiencyPct = Number(((usedLengthM / barLengthM) * 100).toFixed(1));
    const leftoverCategory = wasteLengthM < 0.01 ? 'none' : wasteLengthM >= 0.8 ? 'reusable' : 'scrap';

    return {
      barIndex: barIdx + 1,
      profileName,
      totalCapacityM: barLengthM,
      usedLengthM,
      wasteLengthM,
      kerfLossM,
      efficiencyPct,
      cuts,
      isFullyUsed: wasteLengthM < 0.01,
      leftoverCategory,
    };
  });

  const totalBars = formattedBars.length;
  const totalCutLengthM = Number(formattedBars.reduce((s, b) => s + b.usedLengthM, 0).toFixed(2));
  const totalPurchasedLengthM = Number((totalBars * barLengthM).toFixed(2));
  const totalWasteLengthM = Number(formattedBars.reduce((s, b) => s + b.wasteLengthM, 0).toFixed(2));
  const totalKerfLossM = Number(formattedBars.reduce((s, b) => s + b.kerfLossM, 0).toFixed(2));
  const globalEfficiencyPct = totalPurchasedLengthM > 0
    ? Number(((totalCutLengthM / totalPurchasedLengthM) * 100).toFixed(1))
    : 0;

  const reusableBars = formattedBars.filter(b => b.leftoverCategory === 'reusable');
  const reusableLeftoversCount = reusableBars.length;
  const reusableLeftoversLengthM = Number(reusableBars.reduce((s, b) => s + b.wasteLengthM, 0).toFixed(2));
  const scrapWasteLengthM = Number((totalWasteLengthM - reusableLeftoversLengthM).toFixed(2));

  return {
    bars: formattedBars,
    totalBars,
    totalCutLengthM,
    totalPurchasedLengthM,
    totalWasteLengthM,
    totalKerfLossM,
    globalEfficiencyPct,
    reusableLeftoversCount,
    reusableLeftoversLengthM,
    scrapWasteLengthM,
    kerfMm,
    piecesCount: expandedPieces.length,
    profileName,
  };
}

interface InternalItem {
  id: string;
  originalDesc: string;
  type: 'Horizontal' | 'Vertical' | 'Travessa' | 'Borda' | 'Outro';
  length: number;
}

interface InternalBar {
  items: InternalItem[];
  remainingSpace: number;
}

function runPackingPass(
  items: InternalItem[],
  barLengthM: number,
  kerfM: number,
  mode: 'BFD' | 'FFD' | 'PAIRED'
): { bars: InternalBar[]; totalWaste: number; reusableWaste: number } {
  // Sort items descending
  const sorted = [...items].sort((a, b) => b.length - a.length);
  const bars: InternalBar[] = [];

  // If PAIRED mode, look for pairs/triplets that add up close to 6m first
  const unassigned = [...sorted];
  if (mode === 'PAIRED') {
    for (let i = 0; i < unassigned.length; i++) {
      const it1 = unassigned[i];
      if (!it1) continue;
      for (let j = i + 1; j < unassigned.length; j++) {
        const it2 = unassigned[j];
        if (!it2) continue;
        const sum = it1.length + it2.length + kerfM;
        if (Math.abs(barLengthM - sum) < 0.05 && sum <= barLengthM) {
          bars.push({
            items: [it1, it2],
            remainingSpace: Number((barLengthM - sum).toFixed(4)),
          });
          unassigned.splice(j, 1);
          unassigned.splice(i, 1);
          i--;
          break;
        }
      }
    }
  }

  // Pack remaining unassigned items
  for (const item of unassigned) {
    let chosenBarIndex = -1;
    let minLeftover = 9999;

    for (let b = 0; b < bars.length; b++) {
      const bar = bars[b];
      const neededSpace = item.length + (bar.items.length > 0 ? kerfM : 0);
      if (bar.remainingSpace >= neededSpace - 0.0001) {
        const leftover = bar.remainingSpace - neededSpace;
        if (mode === 'FFD') {
          chosenBarIndex = b;
          break;
        } else {
          // BFD / PAIRED
          if (leftover < minLeftover) {
            minLeftover = leftover;
            chosenBarIndex = b;
          }
        }
      }
    }

    if (chosenBarIndex >= 0) {
      const targetBar = bars[chosenBarIndex];
      const neededSpace = item.length + (targetBar.items.length > 0 ? kerfM : 0);
      targetBar.items.push(item);
      targetBar.remainingSpace = Number((targetBar.remainingSpace - neededSpace).toFixed(4));
    } else {
      bars.push({
        items: [item],
        remainingSpace: Number((barLengthM - item.length).toFixed(4)),
      });
    }
  }

  const totalWaste = bars.reduce((s, b) => s + Math.max(0, b.remainingSpace), 0);
  const reusableWaste = bars
    .filter(b => b.remainingSpace >= 0.8)
    .reduce((s, b) => s + b.remainingSpace, 0);

  return { bars, totalWaste, reusableWaste };
}

/**
 * Recalculates and reformats a BinPackingResult from a custom array of PackedBars
 * after manual user adjustments (moving cuts, adding/removing bars, reordering).
 */
export function recalculatePackingResult(
  barsInput: {
    profileName?: string;
    cuts: {
      id?: string;
      description: string;
      type?: 'Horizontal' | 'Vertical' | 'Travessa' | 'Borda' | 'Outro';
      length: number;
      colorIndex?: number;
    }[];
  }[],
  options: BinPackingOptions = {}
): BinPackingResult {
  const barLengthM = options.barLengthM ?? 6.0;
  const kerfMm = options.kerfMm ?? 0;
  const kerfM = kerfMm / 1000.0;
  const defaultProfile = options.profileName ?? 'Metalon';

  let totalPieceCount = 0;

  const formattedBars: PackedBar[] = barsInput.map((rawBar, barIdx) => {
    const profileName = rawBar.profileName || defaultProfile;
    let currentOffset = 0;
    const cuts: BarCutSegment[] = [];

    rawBar.cuts.forEach((cut, cutIdx) => {
      totalPieceCount++;
      const isLastCut = cutIdx === rawBar.cuts.length - 1;
      const appliedKerf = !isLastCut ? kerfM : 0;
      const startM = Number(currentOffset.toFixed(4));
      const endM = Number((currentOffset + cut.length).toFixed(4));
      const pct = Number(((cut.length / barLengthM) * 100).toFixed(1));

      cuts.push({
        id: cut.id || `bar-${barIdx + 1}-cut-${cutIdx + 1}-${Date.now()}-${cutIdx}`,
        pieceIndex: cutIdx + 1,
        description: cut.description,
        type: cut.type || 'Horizontal',
        length: Number(cut.length.toFixed(4)),
        startM,
        endM,
        percentageOfBar: pct,
        kerfAfterM: appliedKerf,
        colorIndex: cut.colorIndex !== undefined ? cut.colorIndex : (barIdx * 3 + cutIdx) % 8,
      });

      currentOffset += cut.length + appliedKerf;
    });

    const usedLengthM = Number(cuts.reduce((s, it) => s + it.length, 0).toFixed(4));
    const kerfLossM = Number((cuts.length > 1 ? (cuts.length - 1) * kerfM : 0).toFixed(4));
    const rawWaste = barLengthM - (usedLengthM + kerfLossM);
    const isOverloaded = rawWaste < -0.001;
    const overloadM = isOverloaded ? Number(Math.abs(rawWaste).toFixed(4)) : 0;
    const wasteLengthM = Number(Math.max(0, rawWaste).toFixed(4));
    const efficiencyPct = Number(Math.min(100, Math.max(0, (usedLengthM / barLengthM) * 100)).toFixed(1));
    const leftoverCategory = wasteLengthM < 0.01 ? 'none' : wasteLengthM >= 0.8 ? 'reusable' : 'scrap';

    return {
      barIndex: barIdx + 1,
      profileName,
      totalCapacityM: barLengthM,
      usedLengthM,
      wasteLengthM,
      kerfLossM,
      efficiencyPct,
      cuts,
      isFullyUsed: wasteLengthM < 0.01 && !isOverloaded,
      leftoverCategory,
      isOverloaded,
      overloadM,
    };
  });

  const totalBars = formattedBars.length;
  const totalCutLengthM = Number(formattedBars.reduce((s, b) => s + b.usedLengthM, 0).toFixed(2));
  const totalPurchasedLengthM = Number((totalBars * barLengthM).toFixed(2));
  const totalWasteLengthM = Number(formattedBars.reduce((s, b) => s + b.wasteLengthM, 0).toFixed(2));
  const totalKerfLossM = Number(formattedBars.reduce((s, b) => s + b.kerfLossM, 0).toFixed(2));
  const globalEfficiencyPct = totalPurchasedLengthM > 0
    ? Number(((totalCutLengthM / totalPurchasedLengthM) * 100).toFixed(1))
    : 0;

  const reusableBars = formattedBars.filter(b => b.leftoverCategory === 'reusable' && !b.isOverloaded);
  const reusableLeftoversCount = reusableBars.length;
  const reusableLeftoversLengthM = Number(reusableBars.reduce((s, b) => s + b.wasteLengthM, 0).toFixed(2));
  const scrapWasteLengthM = Number((totalWasteLengthM - reusableLeftoversLengthM).toFixed(2));

  return {
    bars: formattedBars,
    totalBars,
    totalCutLengthM,
    totalPurchasedLengthM,
    totalWasteLengthM,
    totalKerfLossM,
    globalEfficiencyPct,
    reusableLeftoversCount,
    reusableLeftoversLengthM,
    scrapWasteLengthM,
    kerfMm,
    piecesCount: totalPieceCount,
    profileName: defaultProfile,
  };
}

