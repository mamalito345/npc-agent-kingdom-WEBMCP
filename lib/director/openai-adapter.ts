import type {
  DirectorContext,
  DirectorModelAdapter,
  DirectorProposalDraft,
} from "@/types/director";

import type {
  EventDirectorContext,
  EventDirectorModelAdapter,
  EventDirectorSelection,
} from "@/types/events";

export interface OpenAIResponsesTransport {
  request(body: Record<string, unknown>): Promise<unknown>;
}

function defaultTransport(apiKey: string): OpenAIResponsesTransport {
  return {
    async request(body: Record<string, unknown>): Promise<unknown> {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(
          `OPENAI_RESPONSES_ERROR_${response.status}: ${bodyText.slice(0, 500)}`
        );
      }

      return response.json();
    },
  };
}

function extractOutputText(response: unknown): string {
  if (
    typeof response === "object" &&
    response !== null &&
    "output_text" in response &&
    typeof (response as { output_text?: unknown }).output_text === "string"
  ) {
    return (response as { output_text: string }).output_text;
  }

  if (
    typeof response !== "object" ||
    response === null ||
    !("output" in response) ||
    !Array.isArray((response as { output?: unknown }).output)
  ) {
    throw new Error("OPENAI_RESPONSE_TEXT_NOT_FOUND");
  }

  const texts: string[] = [];

  for (const item of (response as { output: unknown[] }).output) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("content" in item) ||
      !Array.isArray((item as { content?: unknown }).content)
    ) {
      continue;
    }

    for (const content of (item as { content: unknown[] }).content) {
      if (
        typeof content === "object" &&
        content !== null &&
        "text" in content &&
        typeof (content as { text?: unknown }).text === "string"
      ) {
        texts.push((content as { text: string }).text);
      }
    }
  }

  if (texts.length === 0) {
    throw new Error("OPENAI_RESPONSE_TEXT_NOT_FOUND");
  }

  return texts.join("");
}

function modelName(explicit?: string): string {
  return (
    explicit ||
    process.env.OPENAI_DIRECTOR_MODEL ||
    "gpt-5.6-terra"
  );
}

export class OpenAIEventDirectorAdapter implements EventDirectorModelAdapter {
  private readonly transport: OpenAIResponsesTransport;
  private readonly model: string;

  constructor(options?: {
    apiKey?: string;
    model?: string;
    transport?: OpenAIResponsesTransport;
  }) {
    const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;

    if (!options?.transport && !apiKey) {
      throw new Error("OPENAI_API_KEY_REQUIRED");
    }

    this.transport =
      options?.transport ??
      defaultTransport(apiKey as string);

    this.model = modelName(options?.model);
  }

  async selectEvent(
    context: EventDirectorContext
  ): Promise<EventDirectorSelection> {
    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["decisionSummary", "selectedCandidateId"],
      properties: {
        decisionSummary: {
          type: "string",
        },
        selectedCandidateId: {
          anyOf: [
            {
              type: "string",
              enum: context.candidates.map((candidate) => candidate.candidateId),
            },
            {
              type: "null",
            },
          ],
        },
      },
    };

    const response = await this.transport.request({
      model: this.model,
      input: [
        {
          role: "system",
          content:
            "You are the World Director of a fictional strategy simulation. Select only from the supplied predefined event candidates. Do not invent effects, issue player orders, impersonate NPCs, or claim hidden information was delivered.",
        },
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "world_director_event_selection",
          strict: true,
          schema,
        },
      },
    });

    const parsed = JSON.parse(extractOutputText(response)) as EventDirectorSelection;

    if (
      typeof parsed.decisionSummary !== "string" ||
      !(
        parsed.selectedCandidateId === null ||
        typeof parsed.selectedCandidateId === "string"
      )
    ) {
      throw new Error("INVALID_EVENT_DIRECTOR_RESPONSE");
    }

    return parsed;
  }
}

interface ProposalEnvelope {
  proposals: DirectorProposalDraft[];
}

/*
 * Existing DirectorModelAdapter remains available for non-event structured
 * proposals. runDirectorTurn() still sends every returned proposal through
 * validateDirectorProposal() and applyDirectorProposal().
 */
export class OpenAIWorldDirectorProposalAdapter implements DirectorModelAdapter {
  private readonly transport: OpenAIResponsesTransport;
  private readonly model: string;

  constructor(options?: {
    apiKey?: string;
    model?: string;
    transport?: OpenAIResponsesTransport;
  }) {
    const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;

    if (!options?.transport && !apiKey) {
      throw new Error("OPENAI_API_KEY_REQUIRED");
    }

    this.transport =
      options?.transport ??
      defaultTransport(apiKey as string);

    this.model = modelName(options?.model);
  }

  async generateProposals(
    context: DirectorContext
  ): Promise<DirectorProposalDraft[]> {
    const response = await this.transport.request({
      model: this.model,
      input: [
        {
          role: "system",
          content:
            "You are a World Director. Return only structured proposals. Never mutate state, control player characters or player armies, choose battle winners, teleport entities, or reveal hidden information.",
        },
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "world_director_proposals",
          strict: false,
          schema: {
            type: "object",
            required: ["proposals"],
            properties: {
              proposals: {
                type: "array",
                maxItems: 4,
                items: {
                  type: "object",
                  required: ["type", "reason", "payload"],
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "npc_character_travel",
                        "npc_army_move",
                        "npc_recruit_units",
                        "npc_start_siege",
                        "npc_send_message",
                        "schedule_world_interrupt",
                        "kingdom_relation_delta",
                        "player_knowledge_report",
                      ],
                    },
                    reason: {
                      type: "string",
                    },
                    payload: {
                      type: "object",
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(extractOutputText(response)) as ProposalEnvelope;

    if (!Array.isArray(parsed.proposals)) {
      throw new Error("INVALID_DIRECTOR_PROPOSAL_RESPONSE");
    }

    return parsed.proposals;
  }
}
