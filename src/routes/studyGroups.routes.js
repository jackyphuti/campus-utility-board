const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const studyGroupStore = require('../services/studyGroupStore');

// GET all study groups (with optional module filter)
router.get('/', async (req, res, next) => {
  try {
    const { module } = req.query;
    const groups = await studyGroupStore.getAllStudyGroups(module);
    res.json(groups.map(studyGroupStore.formatGroup));
  } catch (error) {
    next(error);
  }
});

// GET single study group
router.get('/:groupId', async (req, res, next) => {
  try {
    const group = await studyGroupStore.getStudyGroupById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(studyGroupStore.formatGroup(group));
  } catch (error) {
    next(error);
  }
});

// POST create new study group (authenticated)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { topic, module, location, maxMembers, capacity, description } = req.body;

    if (!topic || !module || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const group = await studyGroupStore.createStudyGroup({
      topic,
      module,
      location,
      maxMembers: maxMembers || capacity || 8,
      university: req.user.university || 'General',
      description,
      createdBy: req.user.id,
    });

    res.status(201).json(studyGroupStore.formatGroup(group));
  } catch (error) {
    next(error);
  }
});

// POST join study group (authenticated)
router.post('/:groupId/join', authenticate, async (req, res, next) => {
  try {
    const group = await studyGroupStore.joinStudyGroup(
      req.params.groupId,
      req.user.id,
      req.user.name
    );
    res.json(studyGroupStore.formatGroup(group));
  } catch (error) {
    next(error);
  }
});

// POST leave study group (authenticated)
router.post('/:groupId/leave', authenticate, async (req, res, next) => {
  try {
    const group = await studyGroupStore.leaveStudyGroup(
      req.params.groupId,
      req.user.id
    );
    res.json(studyGroupStore.formatGroup(group));
  } catch (error) {
    next(error);
  }
});

// DELETE study group (authenticated, owner only)
router.delete('/:groupId', authenticate, async (req, res, next) => {
  try {
    const result = await studyGroupStore.deleteStudyGroup(
      req.params.groupId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
