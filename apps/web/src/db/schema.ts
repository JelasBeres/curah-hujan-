import { pgTable, uuid, text, timestamp, doublePrecision, integer, jsonb, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const hydrologyData = pgTable('hydrology_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().unique(),
  tma: doublePrecision('tma').notNull(),
  rainfallMm: doublePrecision('rainfall_mm').default(0),
  calculatedDischargeM3s: doublePrecision('calculated_discharge_m3s'),
  source: text('source').default('manual'),
  importBatchId: uuid('import_batch_id'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const predictions = pgTable('predictions', {
  id: uuid('id').defaultRandom().primaryKey(),
  inputTimestamp: timestamp('input_timestamp', { withTimezone: true }).notNull(),
  predictionTimestamp: timestamp('prediction_timestamp', { withTimezone: true }).notNull(),
  predictedTma: doublePrecision('predicted_tma').notNull(),
  calculatedDischargeM3s: doublePrecision('calculated_discharge_m3s'),
  warningStatus: text('warning_status').notNull(),
  modelVersionId: uuid('model_version_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const modelVersions = pgTable('model_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: text('version').notNull().unique(),
  algorithm: text('algorithm').notNull(),
  featureList: jsonb('feature_list').notNull(),
  parameters: jsonb('parameters').notNull(),
  mae: doublePrecision('mae'),
  rmse: doublePrecision('rmse'),
  r2: doublePrecision('r2'),
  trainingStartDate: timestamp('training_start_date', { withTimezone: true }),
  trainingEndDate: timestamp('training_end_date', { withTimezone: true }),
  artifactPath: text('artifact_path'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const warningThresholds = pgTable('warning_thresholds', {
  id: uuid('id').defaultRandom().primaryKey(),
  safeMax: doublePrecision('safe_max').notNull(),
  alertMax: doublePrecision('alert_max').notNull(),
  dangerMin: doublePrecision('danger_min').notNull(),
  unit: text('unit').default('m'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const warningInformation = pgTable('warning_information', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status').default('Aman'),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const siteContent = pgTable('site_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const importBatches = pgTable('import_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: text('filename').notNull(),
  totalRows: integer('total_rows').default(0),
  validRows: integer('valid_rows').default(0),
  invalidRows: integer('invalid_rows').default(0),
  errorReport: jsonb('error_report'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
