/**
 * Tree Builder Module
 * 
 * Constructs a forest of trees from validated edges using adjacency maps.
 * Handles:
 * - Connected component discovery (undirected reachability)
 * - Root detection per component (nodes that are never children)
 * - Multi-parent conflict resolution (first parent wins)
 * - Cycle detection via DFS with WHITE/GRAY/BLACK coloring
 * - Tree depth calculation (longest root-to-leaf path as node count)
 */

/**
 * Builds a directed adjacency map and tracks parent assignments.
 * Multi-parent conflicts resolved by keeping the first parent edge.
 * 
 * @param {{ from: string, to: string }[]} edges
 * @returns {{ adjacency: Map<string, string[]>, childOf: Map<string, string>, allNodes: Set<string> }}
 */
function buildAdjacencyMap(edges) {
  const adjacency = new Map();   // parent → [children]
  const childOf = new Map();      // child  → parent  (first parent wins)
  const allNodes = new Set();

  for (const { from, to } of edges) {
    allNodes.add(from);
    allNodes.add(to);

    // Multi-parent: first parent wins, silently discard subsequent
    if (childOf.has(to)) {
      continue;
    }

    childOf.set(to, from);

    if (!adjacency.has(from)) {
      adjacency.set(from, []);
    }
    adjacency.get(from).push(to);
  }

  return { adjacency, childOf, allNodes };
}

/**
 * Discovers connected components using undirected reachability.
 * Two nodes are in the same component if connected by any edge (regardless of direction).
 * 
 * @param {Set<string>} allNodes
 * @param {Map<string, string[]>} adjacency
 * @param {Map<string, string>} childOf
 * @returns {Set<string>[]}
 */
function findConnectedComponents(allNodes, adjacency, childOf) {
  // Build undirected neighbor map for component discovery
  const undirected = new Map();

  const addUndirectedEdge = (a, b) => {
    if (!undirected.has(a)) undirected.set(a, new Set());
    if (!undirected.has(b)) undirected.set(b, new Set());
    undirected.get(a).add(b);
    undirected.get(b).add(a);
  };

  for (const [parent, children] of adjacency) {
    for (const child of children) {
      addUndirectedEdge(parent, child);
    }
  }

  // Also include isolated nodes (nodes in allNodes but no edges in adjacency)
  for (const node of allNodes) {
    if (!undirected.has(node)) {
      undirected.set(node, new Set());
    }
  }

  // BFS to find components
  const visited = new Set();
  const components = [];

  for (const startNode of allNodes) {
    if (visited.has(startNode)) continue;

    const component = new Set();
    const queue = [startNode];

    while (queue.length > 0) {
      const node = queue.shift();
      if (visited.has(node)) continue;
      visited.add(node);
      component.add(node);

      for (const neighbor of (undirected.get(node) || [])) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components;
}

/**
 * Finds the root of a component.
 * Root = node in the component that never appears as a child.
 * Fallback: lexicographically smallest node if all nodes are children (pure cycle).
 * 
 * @param {Set<string>} component
 * @param {Map<string, string>} childOf
 * @returns {string}
 */
function findComponentRoot(component, childOf) {
  const roots = [];

  for (const node of component) {
    // A root is a node whose parent (if any) is outside this component, or has no parent
    if (!childOf.has(node)) {
      roots.push(node);
    }
  }

  if (roots.length > 0) {
    roots.sort();
    return roots[0];
  }

  // All nodes are children → pure cycle → use lex smallest
  const sorted = [...component].sort();
  return sorted[0];
}

/**
 * Detects if a cycle exists in the directed subgraph rooted at `startNode`
 * using iterative DFS with WHITE/GRAY/BLACK coloring.
 * 
 * @param {string} startNode
 * @param {Map<string, string[]>} adjacency
 * @param {Set<string>} componentNodes - restrict detection to this component
 * @returns {boolean}
 */
function detectCycleInComponent(startNode, adjacency, componentNodes) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();

  // Initialize all component nodes as white
  for (const node of componentNodes) {
    color.set(node, WHITE);
  }

  // Run DFS from every unvisited node in the component
  // (important: the start node alone may not reach all nodes in a cycle)
  for (const entryNode of componentNodes) {
    if (color.get(entryNode) !== WHITE) continue;

    const stack = [{ node: entryNode, phase: 'enter' }];

    while (stack.length > 0) {
      const { node, phase } = stack.pop();

      if (phase === 'exit') {
        color.set(node, BLACK);
        continue;
      }

      const currentColor = color.get(node);

      if (currentColor === GRAY) {
        return true;
      }

      if (currentColor === BLACK) {
        continue;
      }

      color.set(node, GRAY);
      stack.push({ node, phase: 'exit' });

      const children = adjacency.get(node) || [];
      for (const child of children) {
        if (!componentNodes.has(child)) continue; // stay within component

        const childColor = color.get(child);
        if (childColor === GRAY) {
          return true; // back edge → cycle
        }
        if (childColor === WHITE) {
          stack.push({ node: child, phase: 'enter' });
        }
      }
    }
  }

  return false;
}

/**
 * Builds a nested tree object from `root` using recursive DFS.
 * Returns the tree structure and the depth (node count on longest path).
 * 
 * @param {string} root
 * @param {Map<string, string[]>} adjacency
 * @returns {{ tree: object, depth: number }}
 */
function buildTreeFromRoot(root, adjacency) {
  let maxDepth = 0;
  const visited = new Set();

  function buildRecursive(node, depth) {
    if (visited.has(node)) return {};
    visited.add(node);

    if (depth > maxDepth) maxDepth = depth;

    const nodeObj = {};
    const children = adjacency.get(node) || [];

    for (const child of children) {
      if (!visited.has(child)) {
        nodeObj[child] = buildRecursive(child, depth + 1);
      }
    }

    return nodeObj;
  }

  const tree = {};
  tree[root] = buildRecursive(root, 1);

  return { tree, depth: maxDepth };
}

/**
 * Main entry: constructs hierarchies from validated edges.
 * 
 * Pipeline:
 *  1. Build adjacency map (multi-parent resolved)
 *  2. Discover connected components (undirected)
 *  3. Per component: find root, detect cycles, build tree, compute depth
 *  4. Assemble summary
 * 
 * @param {{ from: string, to: string }[]} edges
 * @returns {{ hierarchies: object[], summary: object }}
 */
function constructForest(edges) {
  if (edges.length === 0) {
    return {
      hierarchies: [],
      summary: {
        total_trees: 0,
        total_cycles: 0,
        largest_tree_root: null,
      },
    };
  }

  const { adjacency, childOf, allNodes } = buildAdjacencyMap(edges);
  const components = findConnectedComponents(allNodes, adjacency, childOf);

  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let largestTreeRoot = null;
  let largestTreeDepth = 0;

  // Sort components by their root for deterministic output ordering
  const componentEntries = components
    .map(comp => ({
      component: comp,
      root: findComponentRoot(comp, childOf),
    }))
    .sort((a, b) => a.root.localeCompare(b.root));

  for (const { component, root } of componentEntries) {
    const cycleDetected = detectCycleInComponent(root, adjacency, component);

    if (cycleDetected) {
      totalCycles++;
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
    } else {
      const { tree, depth } = buildTreeFromRoot(root, adjacency);
      totalTrees++;
      hierarchies.push({
        root,
        tree,
        depth,
      });

      // Track largest tree: max depth, lex smaller root on tie
      if (
        depth > largestTreeDepth ||
        (depth === largestTreeDepth && (largestTreeRoot === null || root < largestTreeRoot))
      ) {
        largestTreeDepth = depth;
        largestTreeRoot = root;
      }
    }
  }

  const summary = {
    total_trees: totalTrees,
    total_cycles: totalCycles,
    largest_tree_root: largestTreeRoot,
  };

  return { hierarchies, summary };
}

module.exports = { constructForest, buildAdjacencyMap, findRoots: findComponentRoot, hasCycle: detectCycleInComponent, buildTreeFromRoot };
