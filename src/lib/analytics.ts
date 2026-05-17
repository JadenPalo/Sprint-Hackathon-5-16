import type { ActivityEntry, InventoryItem } from "../types/inventory";

export interface SalesPoint {
  label: string;
  sales: number;
}

export interface HourPoint {
  hour: string;
  orders: number;
}

export interface SeasonalInsight {
  season: "Winter" | "Spring" | "Summer" | "Fall";
  promote: string;
  stockFocus: string;
  note: string;
}

export function buildWeeklySalesData(activity: ActivityEntry[]): SalesPoint[] {
  const base = 180;
  const activityWeight = Math.min(activity.length, 30) * 3;

  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => ({
    label,
    sales: base + activityWeight + index * 18 + ((index % 2) * 14),
  }));
}

export function buildPeakHourData(): HourPoint[] {
  return [
    { hour: "6a", orders: 10 },
    { hour: "8a", orders: 31 },
    { hour: "10a", orders: 22 },
    { hour: "12p", orders: 35 },
    { hour: "2p", orders: 18 },
    { hour: "4p", orders: 16 },
    { hour: "6p", orders: 26 },
    { hour: "8p", orders: 13 },
  ];
}

export function buildTopItems(items: InventoryItem[]): Array<{ name: string; quantity: number }> {
  return [...items]
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 5)
    .map((item) => ({ name: item.name, quantity: item.quantity }));
}

export function buildSeasonalInsight(items: InventoryItem[], now: Date = new Date()): SeasonalInsight {
  const month = now.getMonth();
  const season: SeasonalInsight["season"] =
    month <= 1 || month === 11 ? "Winter" : month <= 4 ? "Spring" : month <= 7 ? "Summer" : "Fall";

  const dairyHeavy = items
    .filter((item) => /milk|cream|syrup/i.test(item.name))
    .sort((left, right) => left.quantity - right.quantity)[0];

  if (season === "Winter") {
    return {
      season,
      promote: "Hot espresso drinks + flavored lattes",
      stockFocus: dairyHeavy ? dairyHeavy.name : "milk alternatives",
      note: "Colder weather usually lifts hot beverage demand and syrup usage.",
    };
  }

  if (season === "Summer") {
    return {
      season,
      promote: "Cold brew and iced specialty drinks",
      stockFocus: "cups and lids",
      note: "Prepare for higher takeout volume and ice-heavy drink prep.",
    };
  }

  if (season === "Spring") {
    return {
      season,
      promote: "Light seasonal specials and pastry bundles",
      stockFocus: "syrups and dairy alternatives",
      note: "Traffic often rises steadily into late spring weekends.",
    };
  }

  return {
    season,
    promote: "Pumpkin/spice promotions and bundled snacks",
    stockFocus: "napkins and cups",
    note: "Transition season typically needs balanced hot/cold inventory planning.",
  };
}
