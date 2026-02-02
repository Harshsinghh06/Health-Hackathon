const express = require('express');
const router = express.Router();
const Provider = require('../models/Provider');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/providers
// @desc    Create provider profile
// @access  Private
router.post('/', protect, authorize('provider', 'admin'), async (req, res, next) => {
  try {
    // Check if provider profile already exists for this user
    const existingProvider = await Provider.findOne({ user: req.user.id });
    if (existingProvider) {
      return res.status(400).json({
        success: false,
        message: 'Provider profile already exists for this user',
      });
    }

    const providerData = {
      ...req.body,
      user: req.user.id,
    };

    const provider = await Provider.create(providerData);

    res.status(201).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/providers
// @desc    Get all providers
// @access  Public (for finding doctors)
router.get('/', async (req, res, next) => {
  try {
    const { specialty, acceptingNewPatients } = req.query;

    const filter = {};
    if (specialty) {
      filter.specialty = { $regex: specialty, $options: 'i' };
    }
    if (acceptingNewPatients !== undefined) {
      filter.acceptingNewPatients = acceptingNewPatients === 'true';
    }

    const providers = await Provider.find(filter)
      .populate('user', 'firstName lastName email phone');

    res.json({
      success: true,
      count: providers.length,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/providers/me
// @desc    Get current user's provider profile
// @access  Private/Provider
router.get('/me', protect, authorize('provider', 'admin'), async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ user: req.user.id })
      .populate('user', 'email firstName lastName phone')
      .populate('patients');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider profile not found',
      });
    }

    res.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/providers/:id
// @desc    Get single provider
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate('user', 'firstName lastName email phone');

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    res.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/providers/:id
// @desc    Update provider
// @access  Private/Provider
router.put('/:id', protect, async (req, res, next) => {
  try {
    let provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    // Only the provider themselves or admins can update
    if (
      req.user.role !== 'admin' &&
      provider.user.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this provider',
      });
    }

    provider = await Provider.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('user', 'email firstName lastName phone');

    res.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/providers/:id
// @desc    Delete provider profile
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const provider = await Provider.findByIdAndDelete(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    res.json({
      success: true,
      message: 'Provider profile deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/providers/:id/patients
// @desc    Add patient to provider's list
// @access  Private/Provider
router.post('/:id/patients', protect, authorize('provider', 'admin'), async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    const { patientId } = req.body;

    if (provider.patients.includes(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Patient already assigned to this provider',
      });
    }

    provider.patients.push(patientId);
    await provider.save();

    res.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
