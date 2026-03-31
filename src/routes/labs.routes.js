const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const labStore = require('../services/labStore');

// GET all labs
router.get('/', async (req, res, next) => {
  try {
    const labs = await labStore.getAllLabs();
    res.json(labs.map(labStore.formatLab));
  } catch (error) {
    next(error);
  }
});

// GET labs by building
router.get('/building/:building', async (req, res, next) => {
  try {
    const labs = await labStore.getLabsByBuilding(req.params.building);
    res.json(labs.map(labStore.formatLab));
  } catch (error) {
    next(error);
  }
});

// GET single lab
router.get('/:labId', async (req, res, next) => {
  try {
    const lab = await labStore.getLabById(req.params.labId);
    if (!lab) {
      return res.status(404).json({ error: 'Lab not found' });
    }
    res.json(labStore.formatLab(lab));
  } catch (error) {
    next(error);
  }
});

// PATCH update lab available PCs (authenticated)
router.patch('/:labId', authenticate, async (req, res, next) => {
  try {
    const { availablePCs } = req.body;

    if (availablePCs === undefined) {
      return res.status(400).json({ error: 'availablePCs is required' });
    }

    const lab = await labStore.updateLabStatus(req.params.labId, availablePCs);
    res.json(lab);
  } catch (error) {
    next(error);
  }
});

// POST create new lab (authenticated, admin only - future feature)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, building, floor, totalPCs, operatingHours } = req.body;

    if (!name || !building || !floor || !totalPCs) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const lab = await labStore.createLab({
      name,
      building,
      floor,
      totalPCs,
      operatingHours,
    });

    res.status(201).json(lab);
  } catch (error) {
    next(error);
  }
});

// DELETE lab (authenticated, admin only - future feature)
router.delete('/:labId', authenticate, async (req, res, next) => {
  try {
    const result = await labStore.deleteLab(req.params.labId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
