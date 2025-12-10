import express from 'express';
import { PLANS } from '../config/plans';

const router = express.Router();

// GET /api/plans
router.get('/plans', (_req, res) => {
  res.json({
    success: true,
    plans: Object.values(PLANS),
  });
});

export default router;

