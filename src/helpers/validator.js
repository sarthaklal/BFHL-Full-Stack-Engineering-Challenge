/**
 * Edge Validator Module
 * 
 * Validates individual edge strings against the required format:
 * - Must be exactly "X->Y" where X and Y are single uppercase A-Z characters
 * - Self-loops (X->X) are invalid
 * - Handles trimming and provides specific rejection reasons
 */

const EDGE_SEPARATOR = '->';
const VALID_NODE_PATTERN = /^[A-Z]$/;

/**
 * Checks if a string represents a valid single uppercase node identifier.
 */
function isValidNode(node) {
  return VALID_NODE_PATTERN.test(node);
}

/**
 * Validates and parses a raw edge string.
 * 
 * @param {string} rawEdge - The raw edge string (e.g., "A->B")
 * @returns {{ valid: boolean, from?: string, to?: string, trimmed: string }}
 */
function validateEdge(rawEdge) {
  const trimmed = typeof rawEdge === 'string' ? rawEdge.trim() : '';

  // Empty or non-string
  if (!trimmed) {
    return { valid: false, trimmed: trimmed || String(rawEdge) };
  }

  // Must contain the separator
  if (!trimmed.includes(EDGE_SEPARATOR)) {
    return { valid: false, trimmed };
  }

  const parts = trimmed.split(EDGE_SEPARATOR);

  // Must split into exactly two parts (one separator)
  if (parts.length !== 2) {
    return { valid: false, trimmed };
  }

  const from = parts[0].trim();
  const to = parts[1].trim();

  // Both nodes must be present
  if (!from || !to) {
    return { valid: false, trimmed };
  }

  // Each node must be a single uppercase A-Z letter
  if (!isValidNode(from) || !isValidNode(to)) {
    return { valid: false, trimmed };
  }

  // Self-loops are invalid
  if (from === to) {
    return { valid: false, trimmed };
  }

  return { valid: true, from, to, trimmed };
}

/**
 * Processes an array of raw edge strings and sorts them into:
 * - validEdges: unique valid edges (first occurrence preserved)
 * - invalidEntries: edges that failed validation
 * - duplicateEdges: edges that appeared more than once (listed once each)
 * 
 * @param {string[]} rawEdges
 * @returns {{ validEdges: {from: string, to: string}[], invalidEntries: string[], duplicateEdges: string[] }}
 */
function classifyEdges(rawEdges) {
  const validEdges = [];
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdgeKeys = new Set();

  for (const rawEdge of rawEdges) {
    const result = validateEdge(rawEdge);

    if (!result.valid) {
      invalidEntries.push(result.trimmed);
      continue;
    }

    const edgeKey = `${result.from}->${result.to}`;

    if (seenEdgeKeys.has(edgeKey)) {
      // Only add to duplicates once per unique duplicate
      if (!duplicateEdges.includes(edgeKey)) {
        duplicateEdges.push(edgeKey);
      }
      continue;
    }

    seenEdgeKeys.add(edgeKey);
    validEdges.push({ from: result.from, to: result.to });
  }

  return { validEdges, invalidEntries, duplicateEdges };
}

module.exports = { validateEdge, classifyEdges };
