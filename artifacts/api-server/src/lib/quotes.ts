export const DAILY_QUOTES: { text: string; author: string | null }[] = [
  { text: "Small steps every day become big achievements.", author: null },
  { text: "Growth is quiet. Keep showing up.", author: null },
  {
    text: "You don't have to see the whole staircase, just take the first step.",
    author: "Martin Luther King Jr.",
  },
  { text: "A little progress each day adds up to big results.", author: null },
  { text: "Study like you're planting seeds — the bloom comes later.", author: null },
  { text: "Consistency is what transforms average into excellence.", author: null },
  { text: "Rest is part of the process, not a departure from it.", author: null },
];

/** Deterministic pick so the quote is stable for the whole day. */
export function quoteForDate(date: string): { text: string; author: string | null } {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  const quote = DAILY_QUOTES[hash % DAILY_QUOTES.length];
  return quote ?? DAILY_QUOTES[0]!;
}
