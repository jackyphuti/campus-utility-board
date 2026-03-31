const Lab = require('../../models/Lab');
const mongoose = require('mongoose');

const assertMongoConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    const err = new Error('Database not connected');
    err.statusCode = 503;
    throw err;
  }
};

exports.getAllLabs = async () => {
  assertMongoConnection();
  return Lab.find().sort({ building: 1, floor: 1 }).lean();
};

exports.getLabById = async (labId) => {
  assertMongoConnection();
  return Lab.findById(labId);
};

exports.getLabsByBuilding = async (building) => {
  assertMongoConnection();
  return Lab.find({ building }).sort({ floor: 1 }).lean();
};

exports.updateLabStatus = async (labId, availablePCs) => {
  assertMongoConnection();

  const lab = await Lab.findById(labId);
  if (!lab) {
    const err = new Error('Lab not found');
    err.statusCode = 404;
    throw err;
  }

  if (availablePCs < 0 || availablePCs > lab.totalPCs) {
    const err = new Error('Invalid PC count');
    err.statusCode = 400;
    throw err;
  }

  lab.availablePCs = availablePCs;
  lab.updateStatus();
  await lab.save();

  return this.formatLab(lab);
};

exports.createLab = async ({
  name,
  building,
  floor,
  totalPCs,
  operatingHours,
}) => {
  assertMongoConnection();

  const lab = await Lab.create({
    name,
    building,
    floor,
    totalPCs,
    availablePCs: totalPCs,
    operatingHours,
  });

  return this.formatLab(lab);
};

exports.deleteLab = async (labId) => {
  assertMongoConnection();

  const lab = await Lab.findByIdAndDelete(labId);
  if (!lab) {
    const err = new Error('Lab not found');
    err.statusCode = 404;
    throw err;
  }

  return { labId, deleted: true };
};

// Seed default labs
exports.ensureDefaultLabsInDb = async () => {
  assertMongoConnection();

  const count = await Lab.countDocuments();
  if (count > 0) return; // Already seeded

  const defaultLabs = [
    {
      name: 'Computer Lab A1',
      building: 'Engineering Building',
      floor: 1,
      totalPCs: 30,
      availablePCs: 30,
      operatingHours: { start: '07:00', end: '22:00' },
    },
    {
      name: 'Computer Lab A2',
      building: 'Engineering Building',
      floor: 2,
      totalPCs: 25,
      availablePCs: 25,
      operatingHours: { start: '07:00', end: '22:00' },
    },
    {
      name: 'Computer Lab B1',
      building: 'Science Building',
      floor: 1,
      totalPCs: 35,
      availablePCs: 35,
      operatingHours: { start: '08:00', end: '20:00' },
    },
    {
      name: 'Computer Lab B2',
      building: 'Science Building',
      floor: 3,
      totalPCs: 28,
      availablePCs: 28,
      operatingHours: { start: '08:00', end: '20:00' },
    },
    {
      name: 'Computer Lab C1',
      building: 'Library Building',
      floor: 2,
      totalPCs: 20,
      availablePCs: 20,
      operatingHours: { start: '07:00', end: '23:00' },
    },
  ];

  await Lab.insertMany(defaultLabs);
};

exports.formatLab = (lab) => {
  return {
    id: lab._id,
    name: lab.name,
    building: lab.building,
    floor: lab.floor,
    totalPCs: lab.totalPCs,
    availablePCs: lab.availablePCs,
    status: lab.status,
    lastUpdated: lab.lastUpdated,
    operatingHours: lab.operatingHours,
    isOpen: lab.isOpen,
  };
};
