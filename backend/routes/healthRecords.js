const express = require('express');
const router = express.Router();
const HealthRecord = require('../models/HealthRecord');
const Patient = require('../models/Patient');
const Provider = require('../models/Provider');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/health-records
// @desc    Create health record
// @access  Private/Provider
router.post('/', protect, authorize('provider', 'admin'), async (req, res, next) => {
  try {
    // Get provider profile for current user
    const provider = await Provider.findOne({ user: req.user.id });
    if (!provider && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Provider profile required to create health records',
      });
    }

    const recordData = {
      ...req.body,
      provider: provider ? provider._id : req.body.provider,
    };

    const healthRecord = await HealthRecord.create(recordData);

    res.status(201).json({
      success: true,
      data: healthRecord,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/health-records
// @desc    Get health records (filtered by role)
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    let filter = {};
    const { recordType, startDate, endDate, patientId } = req.query;

    // Role-based filtering
    if (req.user.role === 'patient') {
      // Patients can only see their own records
      const patient = await Patient.findOne({ user: req.user.id });
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient profile not found',
        });
      }
      filter.patient = patient._id;
    } else if (req.user.role === 'provider') {
      // Providers can see records they created or filter by patient
      const provider = await Provider.findOne({ user: req.user.id });
      if (patientId) {
        filter.patient = patientId;
      } else if (provider) {
        filter.provider = provider._id;
      }
    }
    // Admins can see all records

    // Additional filters
    if (recordType) {
      filter.recordType = recordType;
    }
    if (startDate || endDate) {
      filter.visitDate = {};
      if (startDate) filter.visitDate.$gte = new Date(startDate);
      if (endDate) filter.visitDate.$lte = new Date(endDate);
    }

    const healthRecords = await HealthRecord.find(filter)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'firstName lastName' },
      })
      .populate({
        path: 'provider',
        populate: { path: 'user', select: 'firstName lastName' },
      })
      .sort({ visitDate: -1 });

    res.json({
      success: true,
      count: healthRecords.length,
      data: healthRecords,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/health-records/:id
// @desc    Get single health record
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const healthRecord = await HealthRecord.findById(req.params.id)
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'firstName lastName email' },
      })
      .populate({
        path: 'provider',
        populate: { path: 'user', select: 'firstName lastName' },
      });

    if (!healthRecord) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found',
      });
    }

    // Check authorization
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      if (!patient || healthRecord.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this record',
        });
      }
    }

    // Log access
    healthRecord.accessLog.push({
      accessedBy: req.user.id,
      action: 'view',
    });
    await healthRecord.save();

    res.json({
      success: true,
      data: healthRecord,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/health-records/:id
// @desc    Update health record
// @access  Private/Provider
router.put('/:id', protect, authorize('provider', 'admin'), async (req, res, next) => {
  try {
    let healthRecord = await HealthRecord.findById(req.params.id);

    if (!healthRecord) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found',
      });
    }

    // Only the creating provider or admin can update
    if (req.user.role === 'provider') {
      const provider = await Provider.findOne({ user: req.user.id });
      if (!provider || healthRecord.provider.toString() !== provider._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this record',
        });
      }
    }

    // If record was final, mark as amended
    if (healthRecord.status === 'final' && req.body.status !== 'entered_in_error') {
      req.body.status = 'amended';
    }

    healthRecord = await HealthRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Log access
    healthRecord.accessLog.push({
      accessedBy: req.user.id,
      action: 'edit',
    });
    await healthRecord.save();

    res.json({
      success: true,
      data: healthRecord,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/health-records/:id
// @desc    Delete health record (soft delete - mark as entered_in_error)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const healthRecord = await HealthRecord.findByIdAndUpdate(
      req.params.id,
      { status: 'entered_in_error' },
      { new: true }
    );

    if (!healthRecord) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found',
      });
    }

    res.json({
      success: true,
      message: 'Health record marked as entered in error',
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/health-records/patient/:patientId
// @desc    Get all health records for a specific patient
// @access  Private
router.get('/patient/:patientId', protect, async (req, res, next) => {
  try {
    // Authorization check
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      if (!patient || patient._id.toString() !== req.params.patientId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view these records',
        });
      }
    }

    const healthRecords = await HealthRecord.find({ patient: req.params.patientId })
      .populate({
        path: 'provider',
        populate: { path: 'user', select: 'firstName lastName' },
      })
      .sort({ visitDate: -1 });

    res.json({
      success: true,
      count: healthRecords.length,
      data: healthRecords,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
