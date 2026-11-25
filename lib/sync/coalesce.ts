import { LocalMutation } from "../local-db/index";

export interface CoalescedMutation extends LocalMutation {
  /** All original mutationIds merged into this single coalesced operation */
  coalescedIds: string[];
}

export interface CoalesceResult {
  coalesced: CoalescedMutation[];
  /** Mutation IDs from cancel-pairs (e.g. local create then delete) that never need syncing */
  cancelledIds: string[];
}

/**
 * Coalesces pending mutations safely, preserving semantic order while tracking
 * every merged and cancelled mutationId so the outbox never leaves stale rows behind.
 */
export function coalesceMutationsWithDropped(mutations: LocalMutation[]): CoalesceResult {
  if (mutations.length === 0) {
    return { coalesced: [], cancelledIds: [] };
  }

  // Group mutations chronologically by entityType + entityId
  const entityGroups = new Map<string, LocalMutation[]>();

  for (const mut of mutations) {
    const key = `${mut.entityType}:${mut.entityId}`;
    const group = entityGroups.get(key) || [];
    group.push(mut);
    entityGroups.set(key, group);
  }

  const coalesced: CoalescedMutation[] = [];
  const cancelledIds: string[] = [];

  for (const [, group] of entityGroups.entries()) {
    group.sort((a, b) => a.clientTimestamp - b.clientTimestamp);
    const allIds = group.map((g) => g.mutationId);

    if (group.length === 1) {
      coalesced.push({ ...group[0], coalescedIds: allIds });
      continue;
    }

    const firstOp = group[0];
    const lastOp = group[group.length - 1];

    // Case 1: Created locally and then Deleted locally before syncing -> cancel all ops
    if (firstOp.action === "create" && lastOp.action === "delete") {
      cancelledIds.push(...allIds);
      continue;
    }

    // Case 2: Created locally followed by updates -> single Create with merged payload
    if (firstOp.action === "create") {
      let mergedPayload = { ...firstOp.payload };
      for (let i = 1; i < group.length; i++) {
        if (group[i].action === "update") {
          mergedPayload = { ...mergedPayload, ...group[i].payload };
        }
      }
      coalesced.push({
        ...firstOp,
        payload: mergedPayload,
        clientTimestamp: lastOp.clientTimestamp,
        version: lastOp.version,
        coalescedIds: allIds,
      });
      continue;
    }

    // Case 3: Existing entity updated then deleted -> only send the Delete
    if (lastOp.action === "delete") {
      coalesced.push({
        ...lastOp,
        coalescedIds: allIds,
      });
      continue;
    }

    // Case 4: Multiple updates on existing entity -> collapse into single update with merged payload
    let mergedPayload = {};
    for (const op of group) {
      if (op.action === "update") {
        mergedPayload = { ...mergedPayload, ...op.payload };
      }
    }
    coalesced.push({
      ...lastOp,
      action: "update",
      payload: mergedPayload,
      coalescedIds: allIds,
    });
  }

  // Preserve chronological ordering by clientTimestamp
  coalesced.sort((a, b) => a.clientTimestamp - b.clientTimestamp);
  return { coalesced, cancelledIds };
}

/**
 * Legacy-compatible wrapper returning only the coalesced mutation array.
 */
export function coalesceMutations(mutations: LocalMutation[]): LocalMutation[] {
  return coalesceMutationsWithDropped(mutations).coalesced;
}
