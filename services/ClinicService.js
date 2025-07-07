const { CustomError } = require("../middlewares/CustomeError");
const pool = require("../config/db");
const dayjs = require("dayjs");
const clinicModel = require("../models/ClinicModel");
const {
  invalidateCacheByPattern,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const helper = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const {
  updateClinicIdAndNameAndAddress,
  updateNullClinicInfoWithJoin,
} = require("../services/DentistService");

const message = require("../middlewares/ErrorMessages");
const { convertUTCToLocal } = require("../utils/DateUtils");
const { createGroup } = require("../middlewares/KeycloakAdmin");

const clinicFieldMap = {
  tenant_id: (val) => val,
  clinic_name: (val) => val,
  email: (val) => val || null,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val || null,
  branch: (val) => val || null,
  website: (val) => val || null,
  address: (val) => JSON.stringify(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,
  license_number: (val) => val,
  gst_number: (val) => val || null,
  pan_number: (val) => val || null,
  established_year: (val) => val? parseInt(val) : 0,
  total_doctors: (val) => val? parseInt(val) : 0,
  total_patients: (val) => val? parseInt(val) : 0,
  seating_capacity: (val) => val? parseInt(val) : 0,
  number_of_assistants: (val) => val? parseInt(val) : 0,
  available_services: (val) => (val ? JSON.stringify(val) : null),
  operating_hours: (val) => (val ? JSON.stringify(val) : null),
  insurance_supported: helper.parseBoolean,
  ratings: (val) => val? parseFloat(val) : 0,
  reviews_count: (val) => val? parseInt(val) : 0,
  emergency_support: helper.parseBoolean,
  teleconsultation_supported: helper.parseBoolean,
  clinic_logo: (val) => val || null,
  parking_availability: helper.parseBoolean,
  pharmacy: helper.parseBoolean,
  wifi: helper.parseBoolean,
  clinic_app_font:(val)=>val,
  clinic_app_themes:(val)=>val
};

const clinicFieldReverseMap = {
  clinic_id: (val) => val,
  tenant_id: (val) => val,
  clinic_name: (val) => val,
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  branch: (val) => val,
  website: (val) => val,
  address: (val) => helper.safeJsonParse(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,
  license_number: (val) => val,
  gst_number: (val) => val,
  pan_number: (val) => val,
  established_year: (val) => val? parseInt(val) : 0,
  total_doctors: (val) => val? parseInt(val) : 0,
  total_patients: (val) => val? parseInt(val) : 0,
  seating_capacity: (val) => val? parseInt(val) : 0,
  number_of_assistants: (val) => val? parseInt(val) : 0,
  available_services: (val) => helper.safeJsonParse(val),
  operating_hours: (val) => helper.safeJsonParse(val),
  insurance_supported: (val) => Boolean(val),
  ratings: (val) => val? parseFloat(val) : 0,
  reviews_count: (val) => val? parseInt(val) : 0,
  emergency_support: (val) => Boolean(val),
  teleconsultation_supported: (val) => Boolean(val),
  clinic_logo: (val) => val,
  parking_availability: (val) => Boolean(val),
  pharmacy: (val) => Boolean(val),
  wifi: (val) => Boolean(val),
  clinic_app_font:(val)=>val,
  clinic_app_themes:(val)=>val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// -------------------- CREATE --------------------
const createClinic = async (data, token, realm) => {
  const createClinicFieldMap = {
    ...clinicFieldMap,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, createClinicFieldMap);
    const clinicId = await clinicModel.createClinic("clinic", columns, values);
    await invalidateCacheByPattern("clinics:*");
    if (clinicId && process.env.KEYCLOAK_POWER==='on') {
      const groupName = `dental-${data.tenant_id}-${clinicId}`;

      const attributes = {
        tenant_id: [String(data.tenant_id)],
        clinic_id: [String(clinicId)],
      };

      const response = await createGroup(token, realm, groupName, attributes);
      if (!response) throw new CustomError("Group created error", 404);
    }

    return clinicId;
  } catch (error) {
    console.trace(error);
    throw new CustomError(message.CLINIC_CREATE_FAIL, 404);
  }
};

// -------------------- UPDATE --------------------
const updateClinic = async (clinicId, data, tenant_id) => {
  const updateClinicFieldMap = {
    ...clinicFieldMap,
    updated_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, updateClinicFieldMap);

    const affectedRows = await clinicModel.updateClinic(
      clinicId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError(message.CLINIC_UPDATE_FAIL, 404);
    }

    await invalidateCacheByPattern("clinics:*");
    return affectedRows;
  } catch (error) {
    console.log("Service Error:", error);
    throw new CustomError(message.CLINIC_UPDATE_FAIL, 404);
  }
};

// -------------------- GET ALL --------------------
const getAllClinicsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `clinics:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const clinics = await getOrSetCache(cacheKey, async () => {
      const result = await clinicModel.getAllClinicsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });
    const convertedRows = clinics.data.map((clinic) =>
      helper.convertDbToFrontend(clinic, clinicFieldReverseMap)
    );

    return {
      data: convertedRows,
      total: clinics.total,
    };
  } catch (err) {
    console.error(err);
    throw new CustomError(message.CLINICS_FETCH_FAIL, 404);
  }
};

// -------------------- GET SINGLE --------------------
const getClinicByTenantIdAndClinicId = async (tenantId, clinicId) => {
  try {
    const clinic = await clinicModel.getClinicByTenantIdAndClinicId(
      tenantId,
      clinicId
    );

    const convertedRows = helper.convertDbToFrontend(
      clinic,
      clinicFieldReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError(message.CLINIC_FETCH_FAIL, 404);
  }
};

const deleteClinicByTenantIdAndClinicId = async (tenantId, clinicId) => {
  try {
    const clinic = await clinicModel.deleteClinicByTenantIdAndClinicId(
      tenantId,
      clinicId
    );
    await invalidateCacheByPattern("clinics:*");
    return clinic;
  } catch (error) {
    throw new CustomError(message.CLINIC_DELETE_FAIL, 404);
  }
};

// -------------------- CHECK EXISTS --------------------
const checkClinicExistsByTenantIdAndClinicId = async (tenantId, clinicId) => {
  try {
    return await clinicModel.checkClinicExistsByTenantIdAndClinicId(
      tenantId,
      clinicId
    );
  } catch (error) {
    throw new CustomError(message.CLINIC_CREATE_FAIL, 404);
  }
};

const handleClinicAssignment = async (
  tenantId,
  clinicId,
  details,
  assign = true
) => {
  try {
    if (assign === "true") {
      const clinic = await clinicModel.getClinicNameAndAddressByClinicId(
        tenantId,
        clinicId
      );

      const dentistIds = details?.dentist_id;
      if (!Array.isArray(dentistIds) || dentistIds.length === 0) {
        throw new CustomError("At least one dentistId is required", 404);
      }

      const updatedDentists = await Promise.all(
        dentistIds.map((dentistId) =>
          updateClinicIdAndNameAndAddress(
            tenantId,
            clinicId,
            clinic.clinic_name,
            clinic.address,
            dentistId
          )
        )
      );

      await clinicModel.updateDoctorCount(tenantId, clinicId, assign);
      await invalidateCacheByPattern("clinics:*");

      return "Dentists Added Successfully";
    } else {
      const dentistIds = details?.dentist_id;
      if (!Array.isArray(dentistIds) || dentistIds.length === 0) {
        throw new CustomError("At least one dentistId is required", 404);
      }

      await Promise.all(
        dentistIds.map((dentistId) =>
          updateNullClinicInfoWithJoin(tenantId, clinicId, dentistId)
        )
      );

      await clinicModel.updateDoctorCount(tenantId, clinicId, assign);
      await invalidateCacheByPattern("clinics:*");

      return "Dentists Removed Successfully";
    }
  } catch (error) {
    console.error("Error in handleClinicAssignment:", error);
    throw new CustomError(
      `Failed to update clinic assignment: ${error.message}`,
      404
    );
  }
};

// const getFinanceSummary = async (tenant_id, clinic_id) => {
//   const cacheKey = `financeSummary:${tenant_id}:${clinic_id}`;
//   try {
//     const result = await getOrSetCache(cacheKey, async () => {
//       const { appointments, treatments, expenses } =
//         await clinicModel.getFinanceSummary(tenant_id, clinic_id);

//       const incomeData = [...appointments, ...treatments].map((item) => {
//         const d = new Date(item.date);
//         d.setHours(0, 0, 0, 0);
//         return {
//           date: d,
//           amount: parseFloat(item.amount) || 0,
//         };
//       });

//       const expenseData = expenses.map((item) => ({
//         date: normalizeDate(item.date),
//         amount: parseFloat(item.amount) || 0,
//       }));

//       // Helper functions...
//       function normalizeDate(date) {
//         const d = new Date(date);
//         return new Date(d.getFullYear(), d.getMonth(), d.getDate());
//       }

//       function groupByDay(data) {
//         const result = Array(7).fill(0);
//         const now = new Date();
//         now.setHours(0, 0, 0, 0);
//         const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
//         for (const entry of data) {
//           const entryDate = new Date(entry.date);
//           entryDate.setHours(0, 0, 0, 0);
//           if (entryDate >= sevenDaysAgo && entryDate <= now) {
//             const dayIndex = entryDate.getDay();
//             result[dayIndex] += entry.amount;
//           }
//         }
//         const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
//         return dayLabels.map((label, i) => ({ label, amount: result[i] }));
//       }

//       function groupByWeek(data, numWeeks = 4) {
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         let currentSunday = new Date(today);
//         currentSunday.setDate(today.getDate() - today.getDay() - 7);
//         const result = Array(numWeeks).fill(0);
//         const weekRanges = [];
//         for (let i = 0; i < numWeeks; i++) {
//           const start = new Date(currentSunday);
//           start.setDate(currentSunday.getDate() - i * 7);
//           const end = new Date(start);
//           end.setDate(start.getDate() + 6);
//           weekRanges.push({ start, end });
//         }
//         for (const entry of data) {
//           const entryDate = new Date(entry.date);
//           entryDate.setHours(0, 0, 0, 0);
//           for (let i = 0; i < numWeeks; i++) {
//             const { start, end } = weekRanges[i];
//             if (entryDate >= start && entryDate <= end) {
//               result[i] += entry.amount;
//               break;
//             }
//           }
//         }
//         return result.map((amount, i) => ({
//           label: `Week ${i + 1}`,
//           amount,
//         }));
//       }

//       function groupByMonth(data, numMonths = 3) {
//         const today = new Date();
//         const result = Array(numMonths).fill(0);
//         const monthLabels = [
//           "Jan",
//           "Feb",
//           "Mar",
//           "Apr",
//           "May",
//           "Jun",
//           "Jul",
//           "Aug",
//           "Sep",
//           "Oct",
//           "Nov",
//           "Dec",
//         ];
//         const refDates = [];
//         for (let i = numMonths - 1; i >= 0; i--) {
//           const refDate = new Date(
//             today.getFullYear(),
//             today.getMonth() - (numMonths - i - 1),
//             1
//           );
//           refDates.push({
//             year: refDate.getFullYear(),
//             month: refDate.getMonth(),
//             label: monthLabels[refDate.getMonth()],
//           });
//         }
//         for (const entry of data) {
//           const entryDate = new Date(entry.date);
//           const entryYear = entryDate.getFullYear();
//           const entryMonth = entryDate.getMonth();
//           for (let i = 0; i < numMonths; i++) {
//             const ref = refDates[i];
//             if (entryYear === ref.year && entryMonth === ref.month) {
//               result[i] += entry.amount;
//               break;
//             }
//           }
//         }
//         return result.map((amount, i) => ({
//           label: refDates[i].label,
//           amount,
//         }));
//       }

//       function groupByYear(data, numYears = 4) {
//         const result = Array(numYears).fill(0);
//         const currentYear = new Date().getFullYear();
//         for (const entry of data) {
//           const entryYear = new Date(entry.date).getFullYear();
//           const offset = currentYear - entryYear;
//           const yearIndex = numYears - offset - 1;
//           if (yearIndex >= 0 && yearIndex < numYears) {
//             result[yearIndex] += entry.amount;
//           }
//         }
//         return result.map((amount, i) => ({
//           date: `${currentYear - (numYears - i - 1)}`,
//           amount,
//         }));
//       }

//       return {
//         "1w": {
//           income: groupByDay(incomeData),
//           expense: groupByDay(expenseData),
//         },
//         "2w": {
//           income: groupByWeek(incomeData, 2),
//           expense: groupByWeek(expenseData, 2),
//         },
//         "3w": {
//           income: groupByWeek(incomeData, 3),
//           expense: groupByWeek(expenseData, 3),
//         },
//         "4w": {
//           income: groupByWeek(incomeData, 4),
//           expense: groupByWeek(expenseData, 4),
//         },
//         "1m": {
//           income: groupByMonth(incomeData, 1),
//           expense: groupByMonth(expenseData, 1),
//         },
//         "2m": {
//           income: groupByMonth(incomeData, 2),
//           expense: groupByMonth(expenseData, 2),
//         },
//         "3m": {
//           income: groupByMonth(incomeData, 3),
//           expense: groupByMonth(expenseData, 3),
//         },
//         "4m": {
//           income: groupByMonth(incomeData, 4),
//           expense: groupByMonth(expenseData, 4),
//         },
//         "5m": {
//           income: groupByMonth(incomeData, 5),
//           expense: groupByMonth(expenseData, 5),
//         },
//         "6m": {
//           income: groupByMonth(incomeData, 6),
//           expense: groupByWeek(expenseData, 6),
//         },
//         "7m": {
//           income: groupByMonth(incomeData, 7),
//           expense: groupByMonth(expenseData, 7),
//         },
//         "8m": {
//           income: groupByMonth(incomeData, 8),
//           expense: groupByMonth(expenseData, 8),
//         },
//         "9m": {
//           income: groupByMonth(incomeData, 9),
//           expense: groupByMonth(expenseData, 9),
//         },
//         "10m": {
//           income: groupByMonth(incomeData, 10),
//           expense: groupByMonth(expenseData, 10),
//         },
//         "11m": {
//           income: groupByMonth(incomeData, 11),
//           expense: groupByMonth(expenseData, 11),
//         },
//         "12m": {
//           income: groupByMonth(incomeData, 12),
//           expense: groupByMonth(expenseData, 12),
//         },
//         "1y": {
//           income: groupByYear(incomeData, 1),
//           expense: groupByYear(expenseData, 1),
//         },
//         "2y": {
//           income: groupByYear(incomeData, 2),
//           expense: groupByYear(expenseData, 2),
//         },
//         "3y": {
//           income: groupByYear(incomeData, 3),
//           expense: groupByYear(expenseData, 3),
//         },
//         "4y": {
//           income: groupByYear(incomeData, 4),
//           expense: groupByYear(expenseData, 4),
//         },
//       };
//     });

//     return result;
//   } catch (err) {
//     console.error("Finance summary error", err);
//     throw err;
//   }
// };


const getFinanceSummary = async (tenantId,clinicId,dentistId,startDate,endDate) => {
  const cacheKey = `financeSummary:incomes:${tenantId}:appointmentswise`;
  console.log(typeof startDate,typeof endDate)
  try {
    const patients = await getOrSetCache(cacheKey, async () => {
      const result = await clinicModel.getFinanceSummary(
        tenantId,
        clinicId,
        startDate,
        endDate,
        dentistId=null
      );
      console.log("✅ Serving patients from DB and caching result");
      return result;
    });

    return patients;
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching incomes", 404);
  }
};

const getFinanceSummarybyDentist = async (tenant_id, clinic_id, dentist_id) => {
  const now = new Date();
  const cacheKey = `financeSummary:${tenant_id}:${clinic_id}:${dentist_id}`;
  try {
    const finance = await getOrSetCache(cacheKey, async () => {
      const { appointments, treatments, expenses } =
        await clinicModel.getFinanceSummarybyDentist(
          tenant_id,
          clinic_id,
          dentist_id
        );

      // Convert to uniform format and normalize dates
      const incomeData = [...appointments, ...treatments].map((item) => {
        const d = new Date(item.date);
        d.setHours(0, 0, 0, 0);
        return {
          date: d,
          amount: parseFloat(item.amount) || 0,
        };
      });

      const expenseData = expenses.map((item) => ({
        date: normalizeDate(item.date),
        amount: parseFloat(item.amount) || 0,
      }));

      console.log(expenses);
      console.log(expenseData);

      function groupByDay(data) {
        const result = Array(7).fill(0);
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalize to midnight

        // Ensure we only include dates from the last 7 days
        const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // Go back exactly 6 days (today + 6 days ago = 7-day range)

        for (const entry of data) {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);

          if (entryDate >= sevenDaysAgo && entryDate <= now) {
            const dayIndex = entryDate.getDay(); // 0 = Sunday
            result[dayIndex] += entry.amount;
          }
        }

        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return dayLabels.map((label, i) => ({ label, amount: result[i] }));
      }

      function normalizeDate(date) {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }

      function groupByWeek(data, numWeeks = 4) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize time

        // Start from last full week (Sunday)
        let currentSunday = new Date(today);
        currentSunday.setDate(today.getDate() - today.getDay() - 7); // Go back one full week

        const result = Array(numWeeks).fill(0);

        // Generate past N weeks from oldest to newest
        const weekRanges = [];
        for (let i = 0; i < numWeeks; i++) {
          const start = new Date(currentSunday);
          start.setDate(currentSunday.getDate() - i * 7);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);

          weekRanges.push({ start, end });
        }

        // Match each entry to a week
        for (const entry of data) {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);

          for (let i = 0; i < numWeeks; i++) {
            const { start, end } = weekRanges[i];

            if (entryDate >= start && entryDate <= end) {
              result[i] += entry.amount;
              break;
            }
          }
        }

        // Return with "Week 1", "Week 2", ..., "Week N"
        return result.map((amount, i) => ({
          label: `Week ${i + 1}`,
          amount,
        }));
      }

      function groupByMonth(data, numMonths = 3) {
        const today = new Date();
        const result = Array(numMonths).fill(0);
        const monthLabels = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        // Build reference dates for each bucket (from oldest to newest)
        const refDates = [];
        for (let i = numMonths - 1; i >= 0; i--) {
          const refDate = new Date(
            today.getFullYear(),
            today.getMonth() - (numMonths - i - 1),
            1
          ); // First of month
          refDates.push({
            year: refDate.getFullYear(),
            month: refDate.getMonth(), // 0 = Jan, ..., 4 = May
            label: monthLabels[refDate.getMonth()],
          });
        }

        // Match entries to months
        for (const entry of data) {
          const entryDate = new Date(entry.date);
          const entryYear = entryDate.getFullYear();
          const entryMonth = entryDate.getMonth();

          for (let i = 0; i < numMonths; i++) {
            const ref = refDates[i];
            if (entryYear === ref.year && entryMonth === ref.month) {
              result[i] += entry.amount;
              break;
            }
          }
        }

        return result.map((amount, i) => ({
          label: refDates[i].label,
          amount,
        }));
      }

      function groupByYear(data, numYears = 4) {
        const result = Array(numYears).fill(0);
        const currentYear = now.getFullYear();

        for (const entry of data) {
          const entryYear = entry.date.getFullYear();
          const offset = currentYear - entryYear;

          const yearIndex = numYears - offset - 1;

          if (yearIndex >= 0 && yearIndex < numYears) {
            result[yearIndex] += entry.amount;
          }
        }

        return result.map((amount, i) => ({
          date: `${currentYear - (numYears - i - 1)}`,
          amount,
        }));
      }

      const finalResult = {
        "1w": {
          income: groupByDay(incomeData),
          expense: groupByDay(expenseData),
        },
        "2w": {
          income: groupByWeek(incomeData, 2),
          expense: groupByWeek(expenseData, 2),
        },
        "3w": {
          income: groupByWeek(incomeData, 3),
          expense: groupByWeek(expenseData, 3),
        },
        "4w": {
          income: groupByWeek(incomeData, 4),
          expense: groupByWeek(expenseData, 4),
        },
        "1m": {
          income: groupByMonth(incomeData, 1),
          expense: groupByMonth(expenseData, 1),
        },
        "2m": {
          income: groupByMonth(incomeData, 2),
          expense: groupByMonth(expenseData, 2),
        },
        "3m": {
          income: groupByMonth(incomeData, 3),
          expense: groupByMonth(expenseData, 3),
        },
        "4m": {
          income: groupByMonth(incomeData, 4),
          expense: groupByMonth(expenseData, 4),
        },
        "5m": {
          income: groupByMonth(incomeData, 5),
          expense: groupByMonth(expenseData, 5),
        },
        "6m": {
          income: groupByMonth(incomeData, 6),
          expense: groupByWeek(expenseData, 6),
        },
        "7m": {
          income: groupByMonth(incomeData, 7),
          expense: groupByMonth(expenseData, 7),
        },
        "8m": {
          income: groupByMonth(incomeData, 8),
          expense: groupByMonth(expenseData, 8),
        },
        "9m": {
          income: groupByMonth(incomeData, 9),
          expense: groupByMonth(expenseData, 9),
        },
        "10m": {
          income: groupByMonth(incomeData, 10),
          expense: groupByMonth(expenseData, 10),
        },
        "11m": {
          income: groupByMonth(incomeData, 11),
          expense: groupByMonth(expenseData, 11),
        },
        "12m": {
          income: groupByMonth(incomeData, 12),
          expense: groupByMonth(expenseData, 12),
        },
        "1y": {
          income: groupByYear(incomeData, 1),
          expense: groupByYear(expenseData, 1),
        },
        "2y": {
          income: groupByYear(incomeData, 2),
          expense: groupByYear(expenseData, 2),
        },
        "3y": {
          income: groupByYear(incomeData, 3),
          expense: groupByYear(expenseData, 3),
        },
        "4y": {
          income: groupByYear(incomeData, 4),
          expense: groupByYear(expenseData, 4),
        },
      };

      return finalResult;
    });
    return finance;
  } catch (err) {
    console.error("Finance summary dentist error", err);
    throw err;
  }
};

const getClinicSettingsByTenantIdAndClinicId = async (
  tenantId,
  clinicId
) => {
  try {
    const clinic = await clinicModel.getClinicSettingsByTenantIdAndClinicId(
      tenantId,
      clinicId
    );
    return clinic;
  } catch (error) {
    throw new CustomError(message.CLINIC_FETCH_FAIL, 404);
  }
};

const updateClinicSettings = async (
  tenantId,
  clinicId,
  details
) => {
  try {
    const clinic = await clinicModel.updateClinicSettings(
      tenantId,
      clinicId,
      details
    );
    return clinic;
  } catch (error) {
    throw new CustomError(error.message, 404);
  }
};

module.exports = {
  createClinic,
  updateClinic,
  getAllClinicsByTenantId,
  getClinicByTenantIdAndClinicId,
  checkClinicExistsByTenantIdAndClinicId,
  deleteClinicByTenantIdAndClinicId,
  handleClinicAssignment,
  getFinanceSummary,
  getFinanceSummarybyDentist,
  getClinicSettingsByTenantIdAndClinicId,
  updateClinicSettings
};
