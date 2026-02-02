const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/patients
// @desc    Create patient profile
// @access  Private
router.post('/', protect, async (req, res, next) => {
  try {
    // Check if patient profile already exists for this user
    const existingPatient = await Patient.findOne({ user: req.user.id });
    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'Patient profile already exists for this user',
      });
    }

    const patientData = {
      ...req.body,
      user: req.user.id,
    };

    const patient = await Patient.create(patientData);

    res.status(201).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/patients
// @desc    Get all patients (providers and admins only)
// @access  Private/Provider/Admin
router.get('/', protect, authorize('provider', 'admin'), async (req, res, next) => {
  try {
    const patients = await Patient.find().populate('user', 'email firstName lastName phone');

    res.json({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/patients/me
// @desc    Get current user's patient profile
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ user: req.user.id })
      .populate('user', 'email firstName lastName phone')
      .populate('primaryProvider');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found',
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/patients/:id
// @desc    Get single patient
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('user', 'email firstName lastName phone')
      .populate('primaryProvider');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Patients can only view their own profile, providers/admins can view all
    if (
      req.user.role === 'patient' &&
      patient.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this patient',
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/patients/:id
// @desc    Update patient
// @access  Private
router.put('/:id', protect, async (req, res, next) => {
  try {
    let patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Only the patient themselves or admins can update
    if (
      req.user.role !== 'admin' &&
      patient.user.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this patient',
      });
    }

    patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('user', 'email firstName lastName phone');

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/patients/:id
// @desc    Delete patient profile
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      message: 'Patient profile deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
