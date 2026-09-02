import type {
  GmCharacterContext,
  GmCharacterModelAdapter,
  GmCharacterModelResponse,
} from "@/types/conversation";

function latestPlayerText(context: GmCharacterContext): string {
  return [...context.transcript]
    .reverse()
    .find((turn) => turn.speakerRole === "player")
    ?.text ?? "";
}

const safeDemoAdapter: GmCharacterModelAdapter = {
  async generateResponse(
    context: GmCharacterContext
  ): Promise<GmCharacterModelResponse> {
    const question = latestPlayerText(context).toLocaleLowerCase("tr-TR");

    const asksMilitary = [
      "enemy",
      "army",
      "soldier",
      "düşman",
      "ordu",
      "asker",
      "kuvvet",
    ].some((word) => question.includes(word));

    if (asksMilitary) {
      const militaryFact = context.knowledge.find(
        (fact) =>
          fact.kind === "army" ||
          /enemy|army|düşman|ordu/i.test(fact.summary)
      );

      if (militaryFact) {
        return {
          text: `Bana ulaşan bilgiye göre ${militaryFact.summary}`,
        };
      }

      return {
        text: "Bu konuda güvenilir bir bilgim yok. Kesin sayı söylemem doğru olmaz.",
      };
    }

    const memory = context.relevantMemories[0];

    if (memory) {
      return {
        text: `Bunu konuşurken önceki görüşmemizi de hatırlıyorum: ${memory.summary}`,
      };
    }

    return {
      text: "Söyleyebileceğim şeyi yalnız kendi bildiklerimle sınırlamak zorundayım. Seni dinliyorum.",
    };
  },
};

let adapter: GmCharacterModelAdapter = safeDemoAdapter;

export function setGmCharacterModelAdapter(
  nextAdapter: GmCharacterModelAdapter
): void {
  adapter = nextAdapter;
}

export function resetGmCharacterModelAdapter(): void {
  adapter = safeDemoAdapter;
}

export function getGmCharacterModelAdapter(): GmCharacterModelAdapter {
  return adapter;
}
