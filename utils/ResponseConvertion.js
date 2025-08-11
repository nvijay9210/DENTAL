// utils/dbRowConverter.js
const { getDocumentsByField } = require("../models/documentModel");
const { formatDateOnly } = require("./DateUtils");
const { safeJsonParse } = require("./Helpers");

async function convertRowsWithDocs({
  rows,
  convertFn,        // Optional: e.g., helper.convertDbToFrontend
  convertArgs = [],  // Optional: extra args for convertFn
  jsonFields = [],   // e.g., ["visit_reason", "working_hours"]
  dateFields = [],   // e.g., ["appointment_date", "date_of_birth"]
  docOptions = []    // Array of { tableName, idField, docFieldName, extractFields }
}) {
  const docOptionsArray = Array.isArray(docOptions) ? docOptions : [docOptions];

  return Promise.all(
    rows.map(async (row) => {
      // Step 1: Apply base conversion if provided
      let formatted = convertFn ? convertFn(row, ...convertArgs) : { ...row };

      // Step 2: JSON parse specified fields
      jsonFields.forEach((field) => {
        if (formatted[field]) {
          formatted[field] = safeJsonParse(formatted[field]);
        }
      });

      // Step 3: Format specified date fields
      dateFields.forEach((field) => {
        if (formatted[field]) {
          formatted[field] = formatDateOnly(formatted[field]);
        }
      });

      // Step 4: Process each document option
      for (const opt of docOptionsArray) {
        const { tableName, idField, docFieldName, extractFields = [] } = opt;

        const docs = await getDocumentsByField(
          tableName,
          row[idField],
          docFieldName
        );

        formatted[docFieldName] = docs.map((doc) => {
          if (extractFields.length > 0) {
            return extractFields.reduce((acc, field) => {
              acc[field] = doc[field];
              return acc;
            }, {});
          }
          return doc;
        });
      }

      return formatted;
    })
  );
}

module.exports = { convertRowsWithDocs };


// const convertedRows = await convertRowsWithDocs({
//   rows: notifications.data,
//   convertFn: helper.convertDbToFrontend,
//   convertArgs: [notificationFieldsReverseMap],
//   jsonFields: ["extra_data"],
//   dateFields: ["created_at", "updated_at"],
//   docOptions: [
//     {
//       tableName: "notifications",
//       idField: "notification_id",
//       docFieldName: "file_url",
//       extractFields: ["document_id", "file_url"]
//     },
//     {
//       tableName: "notifications",
//       idField: "notification_id",
//       docFieldName: "attachments",
//       extractFields: ["document_id", "file_url", "file_name"]
//     }
//   ]
// });

// const convertedRows = await convertRowsWithDocs({
//   rows: appointments.data,
//   jsonFields: ["visit_reason", "working_hours"],
//   dateFields: ["appointment_date", "date_of_birth"],
//   docOptions: [
//     {
//       tableName: "patient",
//       idField: "patient_id",
//       docFieldName: "profile_picture",
//       extractFields: ["document_id", "file_url"]
//     }
//   ]
// });

