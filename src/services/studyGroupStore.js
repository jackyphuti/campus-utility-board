const StudyGroup = require('../../models/StudyGroup');
const mongoose = require('mongoose');

const assertMongoConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    const err = new Error('Database not connected');
    err.statusCode = 503;
    throw err;
  }
};

exports.getAllStudyGroups = async (module = null) => {
  assertMongoConnection();
  const query = { isActive: true };
  if (module) {
    query.module = module.toUpperCase();
  }
  return StudyGroup.find(query)
    .populate('createdBy', 'name email')
    .populate('members.userId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
};

exports.getStudyGroupById = async (groupId) => {
  assertMongoConnection();
  return StudyGroup.findById(groupId)
    .populate('createdBy', 'name email')
    .populate('members.userId', 'name email');
};

exports.createStudyGroup = async ({
  topic,
  module,
  location,
  maxMembers,
  university,
  description,
  createdBy,
}) => {
  assertMongoConnection();

  const group = await StudyGroup.create({
    topic,
    module: module.toUpperCase(),
    location,
    university,
    creator: createdBy,
    capacity: maxMembers,
    maxMembers,
    description,
    createdBy,
    currentMembers: [createdBy],
    members: [{ userId: createdBy, userName: createdBy }],
  });

  return this.getStudyGroupById(group._id);
};

exports.joinStudyGroup = async (groupId, userId, userName) => {
  assertMongoConnection();

  const group = await StudyGroup.findById(groupId);
  if (!group) {
    const err = new Error('Study group not found');
    err.statusCode = 404;
    throw err;
  }

  if (group.members.length >= (group.capacity || group.maxMembers)) {
    const err = new Error('Group is full');
    err.statusCode = 400;
    throw err;
  }

  const alreadyMember = group.members.some(
    (m) => m.userId.toString() === userId.toString()
  );

  if (alreadyMember) {
    const err = new Error('User is already a member');
    err.statusCode = 400;
    throw err;
  }

  group.members.push({ userId, userName });
  group.currentMembers = Array.from(new Set([...(group.currentMembers || []).map(String), String(userId)]));
  await group.save();

  return this.getStudyGroupById(groupId);
};

exports.leaveStudyGroup = async (groupId, userId) => {
  assertMongoConnection();

  const group = await StudyGroup.findById(groupId);
  if (!group) {
    const err = new Error('Study group not found');
    err.statusCode = 404;
    throw err;
  }

  group.members = group.members.filter(
    (m) => m.userId.toString() !== userId.toString()
  );
  group.currentMembers = (group.currentMembers || []).filter(
    (memberId) => memberId.toString() !== userId.toString()
  );

  // If creator leaves and no members left, deactivate group
  if (group.members.length === 0) {
    group.isActive = false;
  }

  await group.save();
  return this.getStudyGroupById(groupId);
};

exports.deleteStudyGroup = async (groupId, userId) => {
  assertMongoConnection();

  const group = await StudyGroup.findById(groupId);
  if (!group) {
    const err = new Error('Study group not found');
    err.statusCode = 404;
    throw err;
  }

  if (group.createdBy.toString() !== userId.toString()) {
    const err = new Error('Only the creator can delete the group');
    err.statusCode = 403;
    throw err;
  }

  await StudyGroup.findByIdAndDelete(groupId);
  return { groupId, deleted: true };
};

exports.formatGroup = (group) => {
  return {
    id: group._id,
    topic: group.topic,
    module: group.module,
    location: group.location,
    university: group.university,
    capacity: group.capacity || group.maxMembers,
    maxMembers: group.maxMembers || group.capacity,
    memberCount: group.members.length,
    members: group.members,
    currentMembers: group.currentMembers,
    description: group.description,
    createdBy: group.createdBy || group.creator,
    creator: group.creator || group.createdBy,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
};
