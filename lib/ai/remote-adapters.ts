import type {
  LlmPlayerContext,
  LlmPlayerDecision,
  LlmPlayerModelAdapter,
} from "@/types/actors";

import type {
  GmCharacterContext,
  GmCharacterModelAdapter,
  GmCharacterModelResponse,
} from "@/types/conversation";

import type {
  GmLordOrderContext,
  GmLordOrderDecision,
  GmLordOrderModelAdapter,
} from "@/types/lords";

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

import {
  buildGmWorldSnapshot,
} from "@/lib/director/world-snapshot";

export interface JsonTransport {
  post<T>(url: string, body: unknown): Promise<T>;
}

const browserTransport: JsonTransport = {
  async post<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as {
      ok?: boolean;
      error?: string;
    } & Record<string, unknown>;

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || `MODEL_ROUTE_${response.status}`);
    }

    return result as T;
  },
};

export class RemotePlayerLlmAdapter implements LlmPlayerModelAdapter {
  constructor(private readonly transport: JsonTransport = browserTransport) {}

  async generateDecision(
    context: LlmPlayerContext
  ): Promise<LlmPlayerDecision> {
    const result = await this.transport.post<{
      ok: true;
      decision: LlmPlayerDecision;
    }>("/api/ai/player", context);

    return result.decision;
  }
}


export class RemoteGmRealmAdapter implements LlmPlayerModelAdapter {
  constructor(private readonly transport: JsonTransport = browserTransport) {}

  async generateDecision(
    context: LlmPlayerContext
  ): Promise<LlmPlayerDecision> {
    const result = await this.transport.post<{
      ok: true;
      decision: LlmPlayerDecision;
    }>("/api/ai/gm-realm", {
      playerContext: context,
      worldSnapshot: buildGmWorldSnapshot(),
    });

    return result.decision;
  }
}

export class RemoteGmCharacterAdapter implements GmCharacterModelAdapter {
  constructor(private readonly transport: JsonTransport = browserTransport) {}

  async generateResponse(
    context: GmCharacterContext
  ): Promise<GmCharacterModelResponse> {
    const result = await this.transport.post<{
      ok: true;
      response: GmCharacterModelResponse;
    }>("/api/ai/gm-character", context);

    return result.response;
  }
}

export class RemoteGmLordOrderAdapter implements GmLordOrderModelAdapter {
  constructor(private readonly transport: JsonTransport = browserTransport) {}

  async decideOrder(
    context: GmLordOrderContext
  ): Promise<GmLordOrderDecision> {
    const result = await this.transport.post<{
      ok: true;
      decision: GmLordOrderDecision;
    }>("/api/ai/gm-lord-order", context);

    return result.decision;
  }
}

export class RemoteEventDirectorAdapter implements EventDirectorModelAdapter {
  constructor(private readonly transport: JsonTransport = browserTransport) {}

  async selectEvent(
    context: EventDirectorContext
  ): Promise<EventDirectorSelection> {
    const result = await this.transport.post<{
      ok: true;
      selection: EventDirectorSelection;
    }>("/api/ai/director-event", context);

    return result.selection;
  }
}

export class RemoteWorldDirectorProposalAdapter implements DirectorModelAdapter {
  constructor(private readonly transport: JsonTransport = browserTransport) {}

  async generateProposals(
    context: DirectorContext
  ): Promise<DirectorProposalDraft[]> {
    const result = await this.transport.post<{
      ok: true;
      proposals: DirectorProposalDraft[];
    }>("/api/ai/director-proposals", context);

    return result.proposals;
  }
}
