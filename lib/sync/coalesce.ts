import { LocalMutation } from "../local-db/index";

/**
 * Coalesces an array of pending mutations safely, preserving semantic order
 * while eliminating redundant intermediate updates and cancel-pairs.
 */
export function coalesceMutations(mutations: LocalMutation[]): LocalMutation[] {
  if (mutations.length <= 1) return [...mutations];

  // Group mutations by entityType + entityId
  const entityGroups = new Map<string, LocalMutation[]>();

  for (const mut of mutations) {
    const key = `${mut.entityType}:${mut.entityId}`;
    const group = entityGroups.get(key) || [];
    group.push(mut);
    entityGroups.set(key, group);
  }

  const result: LocalMutation[] = [];

  for (const [, group] of entityGroups.entries()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // Inspect lifecycle of operations on this specific entity
    const firstOp = group[0];
    const lastOp = group[group.length - 1];

    // Case 1: Created locally and then Deleted locally before syncing -> cancel both
    if (firstOp.action === "create" && lastOp.action === "delete") {
      // Nothing needs to be sent to server for an entity that never existed remotely!
      continue;
    }

    // Case 2: Created locally and followed by updates -> single Create with merged latest payload
    if (firstOp.action === "create") {
      let mergedPayload = { ...firstOp.payload };
      for (let i = 1; i < group.length; i++) {
        if (group[i].action === "update") {
          mergedPayload = { ...mergedPayload, ...group[i].payload };
        }
      }
      result.push({
        ...firstOp,
        payload: mergedPayload,
        clientTimestamp: lastOp.clientTimestamp,
        version: lastOp.version,
      });
      continue;
    }

    // Case 3: Existing entity updated then deleted -> only send the Delete
    if (lastOp.action === "delete") {
      result.push(lastOp);
      continue;
    }

    // Case 4: Multiple updates on existing entity -> collapse into single update with merged payload
    let mergedPayload = {};
    for (const op of group) {
      if (op.action === "update") {
        mergedPayload = { ...mergedPayload, ...op.payload };
      }
    }
    result.push({
      ...lastOp,
      action: "update",
      payload: mergedPayload,
    });
  }

  // Preserve chronological ordering by clientTimestamp
  return result.sort((a, b) => a.clientTimestamp - b.clientTimestamp);
}

