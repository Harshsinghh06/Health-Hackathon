const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
    },
    licenseState: {
      type: String,
      required: true,
    },
    licenseExpiration: {
      type: Date,
      required: true,
    },
    npi: {
      type: String, // National Provider Identifier
      unique: true,
      sparse: true,
    },
    qualifications: [
      {
        degree: String,
        institution: String,
        year: Number,
      },
    ],
    practiceAddress: {
      facilityName: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' },
    },
    workingHours: {
      monday: { start: String, end: String, isAvailable: Boolean },
      tuesday: { start: String, end: String, isAvailable: Boolean },
      wednesday: { start: String, end: String, isAvailable: Boolean },
      thursday: { start: String, end: String, isAvailable: Boolean },
      friday: { start: String, end: String, isAvailable: Boolean },
      saturday: { start: String, end: String, isAvailable: Boolean },
      sunday: { start: String, end: String, isAvailable: Boolean },
    },
    acceptingNewPatients: {
      type: Boolean,
      default: true,
    },
    languages: [
      {
        type: String,
      },
    ],
    patients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Check if license is valid
providerSchema.virtual('isLicenseValid').get(function () {
  return this.licenseExpiration > new Date();
});

providerSchema.set('toJSON', { virtuals: true });
providerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Provider', providerSchema);
