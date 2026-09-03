/*
 * The Five Kingdoms' shared history. This exists to make the starting
 * world feel like the aftermath of fifty real years of politics and war
 * rather than five identical, freshly-spawned nations -- and to give the
 * GM and Actor LLMs a concrete, in-character REASON for the numbers
 * already baked into data/kingdoms.ts (treasury, food, stability,
 * relations). The relations values themselves are not changed here;
 * this is the story that explains why they are what they are.
 */

export interface KingdomLoreEntry {
  kingdomId: string;
  /** The current ruler's father (or predecessor), and how he is remembered. */
  predecessor: string;
  /** A short line for the "choose your realm" screen. */
  summary: string;
  /** The realm's current strategic posture -- shown to the player and fed to the GM/Actor LLM as flavor + motive. */
  posture: string;
  /** One paragraph of grounded, in-character history fed into the GM/Actor world snapshot so decisions have a real reason behind them. */
  aiHistory: string;
}

export const worldTimelineTitle =
  "Fifty Years Since the Iron Marches War";

export const worldTimeline: Array<{
  yearsAgo: number;
  title: string;
  summary: string;
}> = [
  {
    yearsAgo: 52,
    title: "The Iron Marches War begins",
    summary:
      "King Baldric of Northreach marches on the mountain passes of Ironhollow, claiming the ore-rich Marches for the crown. King Harrow of Ironhollow refuses to yield a single hold.",
  },
  {
    yearsAgo: 43,
    title: "The Siege of Ironhold breaks",
    summary:
      "After nine years of grinding mountain warfare, Northreach's siege of Ironhold collapses in the snow. Baldric withdraws with half his host dead. Harrow's mountain lords never forgive the attempt, and Ironhollow is rebuilt as a fortress-realm: every hold armed, every boy old enough to march.",
  },
  {
    yearsAgo: 40,
    title: "The Long Famine and the Trade Accord",
    summary:
      "A failed harvest strikes the eastern coast. Southmark's plains feed Eastvale's starving ports through the winter in exchange for salt, ships and coin. The bond struck that year between Eastvale and Southmark has never broken.",
  },
  {
    yearsAgo: 30,
    title: "The Marsh Raids",
    summary:
      "With Ironhollow's passes closed to him, Baldric's marcher lords turn west instead, raiding Westmoor's fenland manors for grain and cattle for a decade. Westmoor, too poor and too waterlogged to field heavy cavalry of its own, turns to the one realm that shares its grudge against Northreach: Ironhollow. An unwritten understanding along the western frontier holds ever since.",
  },
  {
    yearsAgo: 6,
    title: "King Baldric dies, Aldric crowned",
    summary:
      "Aldric inherits Northreach, and with it his father's unfinished war. He has made no move on the Marches himself -- yet -- but Ironhollow's lords watch the northern passes as closely as ever, and Northreach's court still speaks of the Marches as a debt owed.",
  },
];

export const kingdomLore: Record<
  string,
  KingdomLoreEntry
> = {
  northreach: {
    kingdomId: "northreach",
    predecessor:
      "King Baldric, who spent nine years and half his army trying to take the Ironhollow passes, and lost.",
    summary:
      "Mountain roads and marcher lords who never stopped believing the Ore Marches belong to the crown.",
    posture:
      "Watchful and unresolved: Aldric has not renewed his father's war, but the old claim on the Marches is still taught at court, and the border with Ironhollow is the one that truly matters.",
    aiHistory:
      "Ruled by King Aldric, son of King Baldric, who invaded Ironhollow's mountain passes fifty-two years ago and was broken at the Siege of Ironhold nine years into the war. Aldric inherited his father's unfinished claim on the Marches but has not renewed the war himself. Northreach also raided Westmoor's marshlands for a decade when the mountain war failed, which still colors that border. Relations with Eastvale are genuinely warm, dating to timber aid sent during the Long Famine.",
  },

  eastvale: {
    kingdomId: "eastvale",
    predecessor:
      "A line of merchant-kings who built Eastvale's wealth on the Trade Accord with Southmark rather than on the sword.",
    summary:
      "Trade roads, coast and eastern wealth, bound to Southmark by forty years of grain and salt.",
    posture:
      "Prosperous and cautious: Eastvale profits from peace and has every reason to keep it, but will not let Southmark, its oldest partner, be threatened.",
    aiHistory:
      "Ruled by King Roderic. Eastvale's wealth and stability rest on the Trade Accord struck with Southmark forty years ago during the Long Famine, still the strongest bond between any two of the Five Kingdoms. Eastvale also has genuine goodwill toward Northreach, who sent timber aid during that same famine. Eastvale has no real quarrel with anyone and every incentive to keep trade routes open and stay out of the Northreach-Ironhollow rivalry.",
  },

  westmoor: {
    kingdomId: "westmoor",
    predecessor:
      "King Garran's father held the fenland manors through a decade of Northreach's marsh raids with too few horsemen and too little grain.",
    summary:
      "Marshlands and guarded western crossings, still bruised from thirty years of Northreach's raids.",
    posture:
      "Defensive and quietly allied: too poor and too waterlogged to field real cavalry, Westmoor leans on its understanding with Ironhollow to deter Northreach rather than confronting it alone.",
    aiHistory:
      "Ruled by King Garran. Westmoor's fenland manors were raided by Northreach's marcher lords for roughly a decade after the Iron Marches War failed, and the marsh terrain has always made fielding heavy cavalry impractical. Out of that shared grievance against Northreach, Westmoor built an unwritten mutual-defense understanding with Ironhollow that still holds today. Westmoor is the poorest of the Five Kingdoms and strategically prefers fortification and this quiet alliance over open war.",
  },

  southmark: {
    kingdomId: "southmark",
    predecessor:
      "King Osric's father fed Eastvale through the Long Famine and forged the Trade Accord that still anchors Southmark's prosperity.",
    summary:
      "Open plains and fortified southern approaches, the breadbasket that saved Eastvale forty years ago.",
    posture:
      "Prosperous and secure: Southmark's fertile plains and horse culture give it real strength, and its oldest alliance with Eastvale means it rarely stands alone.",
    aiHistory:
      "Ruled by King Osric. Southmark's plains fed Eastvale through the Long Famine forty years ago, founding the Trade Accord that remains the strongest alliance among the Five Kingdoms. Southmark has no direct history with the Iron Marches War and stays largely outside the Northreach-Ironhollow rivalry, relying on plains agriculture and horse-breeding for its strength rather than mountain warfare.",
  },

  ironhollow: {
    kingdomId: "ironhollow",
    predecessor:
      "King Harrow, who held every mountain hold against King Baldric's nine-year siege and never yielded the passes.",
    summary:
      "Mountain holds and hard frontier country, rebuilt into a fortress-realm after Northreach's invasion.",
    posture:
      "Militarized and unforgiving: Ironhollow never forgot the Iron Marches War, keeps the largest standing army of the Five Kingdoms for exactly that reason, and watches Northreach's northern passes above all else.",
    aiHistory:
      "Ruled by King Varren, whose grandfather Harrow broke King Baldric's nine-year siege of Ironhold in the Iron Marches War. That invasion is why Ironhollow keeps the largest field army of the Five Kingdoms despite harsh, food-poor mountain terrain -- every hold still arms as if Northreach might come again. Ironhollow has a long-standing mutual-defense understanding with Westmoor, who share the same grievance against Northreach, and holds no real quarrel with Eastvale or Southmark beyond ordinary distance and mild distrust.",
  },
};

export function getKingdomLore(
  kingdomId: string
): KingdomLoreEntry | undefined {
  return kingdomLore[
    kingdomId
  ];
}
