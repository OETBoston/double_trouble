import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rough real-world double-parking hotspots, used only to make the demo
// dataset look plausible on the map.
const HOTSPOTS = [
  { street: "Newbury St, Boston, MA", latitude: 42.3505, longitude: -71.0810 },
  { street: "Boylston St, Boston, MA", latitude: 42.3488, longitude: -71.0827 },
  { street: "Charles St, Boston, MA", latitude: 42.3588, longitude: -71.0707 },
  { street: "Hanover St, Boston, MA", latitude: 42.3634, longitude: -71.0544 },
  { street: "Tremont St, Boston, MA", latitude: 42.3396, longitude: -71.0721 },
  { street: "Commonwealth Ave, Boston, MA", latitude: 42.3505, longitude: -71.1075 },
  { street: "Massachusetts Ave, Boston, MA", latitude: 42.3398, longitude: -71.0892 },
  { street: "Dorchester Ave, Boston, MA", latitude: 42.3016, longitude: -71.0575 },
];

const METHODS = ["GPS", "MAP_PIN", "ADDRESS_SEARCH"] as const;

function weightedHour(): number {
  // Bias toward morning and evening rush hours.
  const rushHours = [7, 8, 9, 16, 17, 18];
  if (Math.random() < 0.55) {
    return rushHours[Math.floor(Math.random() * rushHours.length)];
  }
  return Math.floor(Math.random() * 24);
}

function jitter(value: number, amount: number): number {
  return value + (Math.random() - 0.5) * amount;
}

async function main() {
  const count = 500;
  const now = new Date();
  const data = Array.from({ length: count }, () => {
    const hotspot = HOTSPOTS[Math.floor(Math.random() * HOTSPOTS.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(weightedHour(), Math.floor(Math.random() * 60), 0, 0);

    return {
      latitude: jitter(hotspot.latitude, 0.004),
      longitude: jitter(hotspot.longitude, 0.004),
      address: hotspot.street,
      locationMethod: METHODS[Math.floor(Math.random() * METHODS.length)],
      reportedAt: date,
      createdAt: date,
    };
  });

  await prisma.report.createMany({ data });
  console.log(`Seeded ${count} sample reports.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
