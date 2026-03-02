// Re-export utilities for backward compatibility
export {
  formatDateForBigQuery,
  formatTimestampForBigQuery,
  formatTimeForBigQuery,
  formatBoolForBigQuery,
  formatMediaIdArrayForBigQuery,
  formatDeliveryMediaForBigQuery,
  formatMediaIdStringForBigQuery,
  formatDeliveryMediaStringForBigQuery,
} from './bigquery/utils';

import {
  generateNextProjectId,
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from './bigquery/project';

import {
  getSegments,
  getSegmentsByProject,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
} from './bigquery/segment';

import {
  getPois,
  getPoisByProject,
  getPoisBySegment,
  getPoiById,
  createPoi,
  createPoisBulk,
  updatePoi,
  deletePoi,
} from './bigquery/poi';

import {
  getUsers,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  getUserRequests,
  createUserRequest,
  approveUserRequest,
  requestPasswordReset,
  resetPassword,
  rejectUserRequest,
} from './bigquery/user';

import {
  getMessages,
  getAllMessages,
  createMessage,
  markMessagesAsRead,
  getEditRequests,
  createEditRequest,
  updateEditRequest,
  deleteEditRequest,
  getVisitMeasurementGroups,
  createVisitMeasurementGroup,
  updateVisitMeasurementGroup,
  deleteVisitMeasurementGroup,
  getFeatureRequests,
  createFeatureRequest,
  updateFeatureRequest,
  getReportRequests,
  getReportRequestById,
  createReportRequest,
  updateReportRequest,
  getChangeHistories,
  insertChangeHistory,
} from './bigquery/message';

import {
  exportToGoogleSheets,
  exportToGoogleSheetsWithAccumulation,
  createSheetExport,
  createSheetExportDataBulk,
  updateSheetExportStatus,
  getSheetExports,
  getSheetExportData,
  runScheduledExport,
} from './bigquery/sheets';

export class BigQueryService {
  // Project
  generateNextProjectId = generateNextProjectId;
  getProjects = getProjects;
  getProjectById = getProjectById;
  createProject = createProject;
  updateProject = updateProject;
  deleteProject = deleteProject;

  // Segment
  getSegments = getSegments;
  getSegmentsByProject = getSegmentsByProject;
  getSegmentById = getSegmentById;
  createSegment = createSegment;
  updateSegment = updateSegment;
  deleteSegment = deleteSegment;

  // POI
  getPois = getPois;
  getPoisByProject = getPoisByProject;
  getPoisBySegment = getPoisBySegment;
  getPoiById = getPoiById;
  createPoi = createPoi;
  createPoisBulk = createPoisBulk;
  updatePoi = updatePoi;
  deletePoi = deletePoi;

  // User
  getUsers = getUsers;
  getUserByEmail = getUserByEmail;
  createUser = createUser;
  updateUser = updateUser;
  deleteUser = deleteUser;

  // User requests & auth
  getUserRequests = getUserRequests;
  createUserRequest = createUserRequest;
  approveUserRequest = approveUserRequest;
  requestPasswordReset = requestPasswordReset;
  resetPassword = resetPassword;
  rejectUserRequest = rejectUserRequest;

  // Messages
  getMessages = getMessages;
  getAllMessages = getAllMessages;
  createMessage = createMessage;
  markMessagesAsRead = markMessagesAsRead;

  // Edit requests
  getEditRequests = getEditRequests;
  createEditRequest = createEditRequest;
  updateEditRequest = updateEditRequest;
  deleteEditRequest = deleteEditRequest;

  // Visit measurement groups
  getVisitMeasurementGroups = getVisitMeasurementGroups;
  createVisitMeasurementGroup = createVisitMeasurementGroup;
  updateVisitMeasurementGroup = updateVisitMeasurementGroup;
  deleteVisitMeasurementGroup = deleteVisitMeasurementGroup;

  // Feature requests
  getFeatureRequests = getFeatureRequests;
  createFeatureRequest = createFeatureRequest;
  updateFeatureRequest = updateFeatureRequest;

  // Report requests
  getReportRequests = getReportRequests;
  getReportRequestById = getReportRequestById;
  createReportRequest = createReportRequest;
  updateReportRequest = updateReportRequest;

  // Change history
  getChangeHistories = getChangeHistories;
  insertChangeHistory = insertChangeHistory;

  // Google Sheets
  exportToGoogleSheets = exportToGoogleSheets;
  exportToGoogleSheetsWithAccumulation = exportToGoogleSheetsWithAccumulation;
  createSheetExport = createSheetExport;
  createSheetExportDataBulk = createSheetExportDataBulk;
  updateSheetExportStatus = updateSheetExportStatus;
  getSheetExports = getSheetExports;
  getSheetExportData = getSheetExportData;
  runScheduledExport = runScheduledExport;
}

let bqServiceInstance: BigQueryService | null = null;

export function getBqService(): BigQueryService {
  if (!bqServiceInstance) {
    bqServiceInstance = new BigQueryService();
  }
  return bqServiceInstance;
}
