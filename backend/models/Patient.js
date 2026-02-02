const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
      default: 'unknown',
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' },
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    insurance: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      expirationDate: Date,
    },
    allergies: [
      {
        name: String,
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe'],
        },
        notes: String,
      },
    ],
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
        prescribedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Provider',
        },
        startDate: Date,
        endDate: Date,
        isActive: { type: Boolean, default: true },
      },
    ],
    medicalConditions: [
      {
        name: String,
        diagnosedDate: Date,
        status: {
          type: String,
          enum: ['active', 'resolved', 'chronic'],
          default: 'active',
        },
        notes: String,
      },
    ],
    primaryProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
    },
  },
  {
    timestamps: true,
  }
);

// Calculate age virtual
patientSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Patient', patientSchema);
