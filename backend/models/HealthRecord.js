const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    recordType: {
      type: String,
      enum: [
        'consultation',
        'lab_result',
        'prescription',
        'imaging',
        'procedure',
        'vaccination',
        'vital_signs',
        'note',
        'referral',
        'discharge_summary',
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Record title is required'],
    },
    description: {
      type: String,
    },
    visitDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Vital signs (if applicable)
    vitals: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      heartRate: Number, // bpm
      temperature: Number, // Fahrenheit
      weight: Number, // lbs
      height: Number, // inches
      oxygenSaturation: Number, // percentage
      respiratoryRate: Number, // breaths per minute
    },
    // Lab results (if applicable)
    labResults: [
      {
        testName: String,
        value: String,
        unit: String,
        referenceRange: String,
        isAbnormal: Boolean,
      },
    ],
    // Diagnosis
    diagnosis: [
      {
        code: String, // ICD-10 code
        description: String,
        isPrimary: Boolean,
      },
    ],
    // Treatment/Prescription
    treatment: {
      medications: [
        {
          name: String,
          dosage: String,
          frequency: String,
          duration: String,
          instructions: String,
        },
      ],
      procedures: [
        {
          code: String, // CPT code
          description: String,
          notes: String,
        },
      ],
      instructions: String,
    },
    // Follow-up
    followUp: {
      isRequired: { type: Boolean, default: false },
      date: Date,
      notes: String,
    },
    // Attachments (file references)
    attachments: [
      {
        fileName: String,
        fileType: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Access control
    isConfidential: {
      type: Boolean,
      default: false,
    },
    accessLog: [
      {
        accessedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        accessedAt: { type: Date, default: Date.now },
        action: {
          type: String,
          enum: ['view', 'edit', 'download'],
        },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'final', 'amended', 'entered_in_error'],
      default: 'final',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
healthRecordSchema.index({ patient: 1, visitDate: -1 });
healthRecordSchema.index({ provider: 1, visitDate: -1 });
healthRecordSchema.index({ recordType: 1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
