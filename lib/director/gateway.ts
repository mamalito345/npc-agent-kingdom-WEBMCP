import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  buildDirectorContext,
} from "@/lib/director/context";

import {
  validateDirectorProposal,
} from "@/lib/director/validator";

import {
  applyAcceptedDirectorProposal,
} from "@/lib/director/apply";

import type {
  DirectorModelAdapter,
  DirectorProposal,
  DirectorProposalDraft,
} from "@/types/director";

export function submitDirectorProposal(
  draft:
    DirectorProposalDraft
): DirectorProposal {
  const validation =
    validateDirectorProposal(
      draft
    );

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const proposal:
    DirectorProposal = {
    id:
      `director-proposal-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    type:
      draft.type,

    reason:
      draft.reason,

    payload:
      draft.payload,

    proposedAt:
      now,

    updatedAt:
      now,

    status:
      validation.ok
        ? "accepted"
        : "rejected",

    rejectionReason:
      validation.ok
        ? undefined
        : validation.error,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        director: {
          ...current
            .session
            .director,

          proposals: {
            ...current
              .session
              .director
              .proposals,

            [proposal.id]:
              proposal,
          },
        },
      },
    })
  );

  return proposal;
}

export function applyDirectorProposal(
  proposalId:
    string
): DirectorProposal | undefined {
  const world =
    getRuntimeWorldState();

  const proposal =
    world.session
      .director
      .proposals[
        proposalId
      ];

  if (!proposal) {
    return undefined;
  }

  if (
    proposal.status !==
    "accepted"
  ) {
    return proposal;
  }

  /*
   * Revalidate immediately before apply.
   *
   * World state may have changed since
   * the LLM originally proposed this.
   */
  const validation =
    validateDirectorProposal({
      type:
        proposal.type,

      reason:
        proposal.reason,

      payload:
        proposal.payload,
    });

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  if (
    validation.ok ===
    false
  ) {
    updateRuntimeWorldState(
      (current) => ({
        ...current,

        session: {
          ...current.session,

          director: {
            ...current
              .session
              .director,

            proposals: {
              ...current
                .session
                .director
                .proposals,

              [proposal.id]: {
                ...proposal,

                status:
                  "rejected",

                updatedAt:
                  now,

                rejectionReason:
                  validation.error,
              },
            },
          },
        },
      })
    );

    return getRuntimeWorldState()
      .session
      .director
      .proposals[
        proposal.id
      ];
  }

  const result =
    applyAcceptedDirectorProposal(
      proposal
    );

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        director: {
          ...current
            .session
            .director,

          lastAppliedProposalId:
            result.ok
              ? proposal.id
              : current
                  .session
                  .director
                  .lastAppliedProposalId,

          proposals: {
            ...current
              .session
              .director
              .proposals,

            [proposal.id]: {
              ...proposal,

              status:
                result.ok
                  ? "applied"
                  : "failed",

              updatedAt:
                now,

              resultSummary:
                result.ok
                  ? result.summary
                  : undefined,

              failureReason:
                result.ok
                  ? undefined
                  : result.error,
            },
          },
        },
      },
    })
  );

  return getRuntimeWorldState()
    .session
    .director
    .proposals[
      proposal.id
    ];
}

export interface RunDirectorTurnResult {
  proposed:
    DirectorProposal[];

  applied:
    DirectorProposal[];

  rejected:
    DirectorProposal[];

  failed:
    DirectorProposal[];
}

export async function runDirectorTurn(
  adapter:
    DirectorModelAdapter
): Promise<RunDirectorTurnResult> {
  const context =
    buildDirectorContext();

  /*
   * This is the ONLY point where an
   * external LLM adapter participates.
   *
   * It receives context.
   * It returns proposals.
   *
   * It never receives a mutable
   * WorldState reference.
   */
  const drafts =
    await adapter
      .generateProposals(
        context
      );

  const proposed =
    drafts.map(
      (draft) =>
        submitDirectorProposal(
          draft
        )
    );

  const applied:
    DirectorProposal[] =
    [];

  const rejected:
    DirectorProposal[] =
    [];

  const failed:
    DirectorProposal[] =
    [];

  for (
    const proposal
    of proposed
  ) {
    if (
      proposal.status ===
      "rejected"
    ) {
      rejected.push(
        proposal
      );

      continue;
    }

    const finalProposal =
      applyDirectorProposal(
        proposal.id
      );

    if (!finalProposal) {
      continue;
    }

    if (
      finalProposal.status ===
      "applied"
    ) {
      applied.push(
        finalProposal
      );
    } else if (
      finalProposal.status ===
      "failed"
    ) {
      failed.push(
        finalProposal
      );
    } else if (
      finalProposal.status ===
      "rejected"
    ) {
      rejected.push(
        finalProposal
      );
    }
  }

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        director: {
          ...current
            .session
            .director,

          lastTurnAt:
            now,
        },
      },
    })
  );

  return {
    proposed,

    applied,

    rejected,

    failed,
  };
}