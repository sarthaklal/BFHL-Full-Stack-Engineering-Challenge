/**
 * BFHL Route Handler
 * 
 * GET  /bfhl — Returns operation code (used for health/identification).
 * POST /bfhl — Accepts { data: string[] } and returns hierarchy analysis.
 */

const express = require('express');
const { classifyEdges } = require('../helpers/validator');
const { constructForest } = require('../helpers/treeBuilder');

const router = express.Router();

// User identity (could be env-driven in production)
const USER_IDENTITY = {
  user_id: 'sarthaklal_31012006',
  email_id: 'sl4787@srmist.edu.in',
  college_roll_number: 'RA2311003010991',
};

/**
 * GET /bfhl
 * Returns an operation code — commonly used for evaluator health checks.
 */
router.get('/', (req, res) => {
  return res.status(200).json({ operation_code: 1 });
});

/**
 * POST /bfhl
 * Body: { "data": ["A->B", "A->C", ...] }
 */
router.post('/', (req, res) => {
  try {
    const { data } = req.body;

    // Input validation
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        error: 'Invalid request. Expected { "data": ["X->Y", ...] }',
      });
    }

    // Step 1: Classify edges into valid, invalid, and duplicate
    const { validEdges, invalidEntries, duplicateEdges } = classifyEdges(data);

    // Step 2: Build trees and compute summary from valid edges
    const { hierarchies, summary } = constructForest(validEdges);

    // Step 3: Assemble response
    const response = {
      ...USER_IDENTITY,
      hierarchies,
      invalid_entries: invalidEntries,
      duplicate_edges: duplicateEdges,
      summary,
    };

    return res.json(response);
  } catch (error) {
    console.error('Error processing /bfhl:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
