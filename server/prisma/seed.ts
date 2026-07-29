import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Real Boston double-parking hotspots, each with its own character so the
// demo dashboard tells a story instead of looking like uniform noise:
// retail loading corridors peak midday on weekdays, nightlife strips peak
// weekend evenings, the medical area peaks weekday mornings, etc.
//
// dayWeights is [Sun, Mon, Tue, Wed, Thu, Fri, Sat]; weight is this
// street's relative share of total reports (drives the "top streets"
// metric); peakHours are the hours (0-23) reports cluster around.
interface Hotspot {
  street: string;
  zip: string;
  latitude: number;
  longitude: number;
  weight: number;
  peakHours: number[];
  dayWeights: [number, number, number, number, number, number, number];
}

const HOTSPOTS: Hotspot[] = [
  {
    street: "Newbury St, Boston, MA",
    zip: "02116",
    latitude: 42.3505,
    longitude: -71.081,
    weight: 4,
    peakHours: [11, 12, 13, 14, 15],
    dayWeights: [0.6, 1.4, 1.5, 1.5, 1.5, 1.3, 0.9],
  },
  {
    street: "Boylston St, Boston, MA",
    zip: "02116",
    latitude: 42.3488,
    longitude: -71.0827,
    weight: 3,
    peakHours: [8, 9, 17, 18],
    dayWeights: [0.5, 1.4, 1.5, 1.5, 1.5, 1.4, 0.7],
  },
  {
    street: "Charles St, Boston, MA",
    zip: "02114",
    latitude: 42.3588,
    longitude: -71.0707,
    weight: 2,
    peakHours: [18, 19, 20, 21],
    dayWeights: [0.9, 0.8, 0.9, 1.0, 1.1, 1.5, 1.6],
  },
  {
    street: "Hanover St, Boston, MA",
    zip: "02113",
    latitude: 42.3634,
    longitude: -71.0544,
    weight: 3,
    peakHours: [19, 20, 21, 22],
    dayWeights: [1.0, 0.5, 0.6, 0.7, 0.9, 1.8, 2.0],
  },
  {
    street: "Tremont St, Boston, MA",
    zip: "02116",
    latitude: 42.3396,
    longitude: -71.0721,
    weight: 3,
    peakHours: [21, 22, 23, 0],
    dayWeights: [1.1, 0.5, 0.6, 0.7, 1.0, 1.8, 1.9],
  },
  {
    street: "Commonwealth Ave, Boston, MA",
    zip: "02215",
    latitude: 42.3505,
    longitude: -71.1075,
    weight: 2,
    peakHours: [8, 9, 15, 16],
    dayWeights: [0.6, 1.4, 1.4, 1.4, 1.4, 1.2, 0.7],
  },
  {
    street: "Massachusetts Ave, Boston, MA",
    zip: "02118",
    latitude: 42.3398,
    longitude: -71.0892,
    weight: 3,
    peakHours: [7, 8, 9, 16, 17, 18],
    dayWeights: [0.5, 1.5, 1.5, 1.5, 1.5, 1.3, 0.6],
  },
  {
    street: "Dorchester Ave, Boston, MA",
    zip: "02125",
    latitude: 42.3016,
    longitude: -71.0575,
    weight: 2,
    peakHours: [8, 9, 12, 13, 17, 18],
    dayWeights: [1.0, 1.1, 1.1, 1.1, 1.1, 1.1, 1.0],
  },
  {
    street: "Longwood Ave, Boston, MA",
    zip: "02115",
    latitude: 42.3376,
    longitude: -71.1073,
    weight: 3,
    peakHours: [8, 9, 10, 14, 15, 16],
    dayWeights: [0.2, 1.6, 1.7, 1.7, 1.6, 1.3, 0.3],
  },
  {
    street: "Brighton Ave, Boston, MA",
    zip: "02134",
    latitude: 42.3536,
    longitude: -71.1325,
    weight: 2,
    peakHours: [21, 22, 23, 0, 1],
    dayWeights: [1.2, 0.5, 0.5, 0.6, 0.9, 1.7, 1.9],
  },
  {
    street: "Northern Ave, Boston, MA",
    zip: "02210",
    latitude: 42.3489,
    longitude: -71.043,
    weight: 2,
    peakHours: [12, 13, 18, 19],
    dayWeights: [0.5, 1.3, 1.4, 1.4, 1.4, 1.6, 0.7],
  },
  {
    street: "Centre St, Boston, MA",
    zip: "02130",
    latitude: 42.3118,
    longitude: -71.1145,
    weight: 1,
    peakHours: [17, 18, 19, 20],
    dayWeights: [1.0, 0.9, 0.9, 1.0, 1.1, 1.3, 1.2],
  },
];

const METHODS = ["GPS", "MAP_PIN", "ADDRESS_SEARCH"] as const;
const WINDOW_DAYS = 45;
const REPORT_COUNT = 650;
// Chance an hour is drawn from the hotspot's own peak hours rather than
// uniformly at random across the day.
const PEAK_HOUR_BIAS = 0.6;

function weightedIndex(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

function pickHotspot(): Hotspot {
  return HOTSPOTS[weightedIndex(HOTSPOTS.map((h) => h.weight))];
}

// Weights every day in the window by this hotspot's day-of-week
// preference, plus a mild recency boost so the trend chart shows gentle
// growth rather than flat noise — a believable "awareness is spreading"
// story for the demo.
function pickDaysAgo(hotspot: Hotspot, now: Date): number {
  const weights = Array.from({ length: WINDOW_DAYS }, (_, daysAgo) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const recencyBoost = 1 + ((WINDOW_DAYS - daysAgo) / WINDOW_DAYS) * 0.6;
    return hotspot.dayWeights[date.getDay()] * recencyBoost;
  });
  return weightedIndex(weights);
}

function pickHour(hotspot: Hotspot): number {
  if (Math.random() < PEAK_HOUR_BIAS) {
    return hotspot.peakHours[Math.floor(Math.random() * hotspot.peakHours.length)];
  }
  return Math.floor(Math.random() * 24);
}

function jitter(value: number, amount: number): number {
  return value + (Math.random() - 0.5) * amount;
}

async function main() {
  // Clear first so re-running this script for a fresh demo is repeatable
  // instead of piling more rows onto whatever was seeded last time.
  await prisma.report.deleteMany();

  const now = new Date();
  const data = Array.from({ length: REPORT_COUNT }, () => {
    const hotspot = pickHotspot();
    const date = new Date(now);
    date.setDate(date.getDate() - pickDaysAgo(hotspot, now));
    date.setHours(pickHour(hotspot), Math.floor(Math.random() * 60), 0, 0);

    return {
      latitude: jitter(hotspot.latitude, 0.0035),
      longitude: jitter(hotspot.longitude, 0.0035),
      address: hotspot.street,
      locationMethod: METHODS[Math.floor(Math.random() * METHODS.length)],
      reportedAt: date,
      createdAt: date,
    };
  });

  await prisma.report.createMany({ data });
  console.log(`Seeded ${REPORT_COUNT} sample reports across ${HOTSPOTS.length} hotspots.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
