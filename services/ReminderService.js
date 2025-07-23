const { CustomError } = require("../middlewares/CustomeError");
const reminderModel = require("../models/ReminderModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const dayjs = require("dayjs");
const weekday = require("dayjs/plugin/weekday");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(weekday);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(weekday);

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { duration } = require("moment");
const { buildCacheKey } = require("../utils/RedisCache");

// Field mapping for reminders (similar to treatment)
const reminderFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  title: (val) => val,
  description: (val) => (val ? helper.safeStringify(val) : null),
  reminder_reason: (val) => val,
  reminder_type: (val) => val,
  type: (val) => val,
  category: (val) => val,
  start_date: (val) => (val ? formatDateOnly(val) : null),
  time: (val) => val,
  is_recurring: (val) => val,
  reminder_repeat: (val) => val,
  repeat_interval: (val) => (val ? parseInt(val) : 0),
  repeat_count: (val) => (val ? parseInt(val) : 0),
  repeat_weekdays: (val) => (val ? helper.safeStringify(val) : null),
  monthly_week: (val) => (val ? helper.safeStringify(val) : null),
  monthly_weekdays: (val) => (val ? helper.safeStringify(val) : null),
  monthly_option: (val) => val,
  repeat_end_date: (val) => (val ? formatDateOnly(val) : null),
  notify: helper.parseBoolean,
  notify_before_hours: (val) => (val ? parseInt(val) : 0),
  reminder_reason: (val) => val,
  status: (val) => val,
};

const reminderFieldsReverseMap = {
  reminder_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  title: (val) => val,
  description: helper.safeJsonParse,
  reminder_reason: (val) => val,
  reminder_type: (val) => val,
  type: (val) => val,
  category: (val) => val,
  start_date: (val) => formatDateOnly(val),
  time: (val) => val,
  reminder_repeat: (val) => val,
  repeat_interval: (val) => (val ? parseInt(val) : 0),
  repeat_weekdays: (val) => helper.safeJsonParse(val),
  monthly_week: (val) => helper.safeJsonParse(val),
  monthly_weekdays: (val) => helper.safeJsonParse(val),
  repeat_end_date: (val) => formatDateOnly(val),
  notify: (val) => Boolean(val),
  is_recurring: (val) => val,
  repeat_count: (val) => (val ? parseInt(val) : 0),
  monthly_option: (val) => val,
  reminder_reason: (val) => val,
  notify_before_hours: (val) => (val ? parseInt(val) : 0),
  status: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create Reminder
const createReminder = async (data) => {
  const fieldMap = {
    ...reminderFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const reminderId = await reminderModel.createReminder(
      "reminder",
      columns,
      values
    );
    await invalidateCacheByPattern("reminder:*");
    return reminderId;
  } catch (error) {
    console.error("Failed to create reminder:", error);
    throw new CustomError(`Failed to create reminder: ${error.message}`, 404);
  }
};

// Get All Reminders by Tenant ID with Caching
const getAllRemindersByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("reminder", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllRemindersByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = reminders.data.map((reminder) =>
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap)
    );

    return { data: convertedRows, total: reminders.total };
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};

const getAllRemindersByTenantAndClinicId = async (
  tenant_id,
  clinic_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("reminder", "list", {
    tenant_id,
    clinic_id,
    page,
    limit,
  });
  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllRemindersByTenantAndClinicId(
        tenant_id,
        clinic_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = reminders.data.map((reminder) =>
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap)
    );

    return { data: convertedRows, total: reminders.total };
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};
const getAllRemindersByTenantAndClinicAndDentistId = async (
  tenant_id,
  clinic_id,
  dentist_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("reminder", "list", {
    tenant_id,
    clinic_id,
    dentist_id,
    page,
    limit,
  });
  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result =
        await reminderModel.getAllRemindersByTenantAndClinicAndDentistId(
          tenant_id,
          clinic_id,
          dentist_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = reminders.data.map((reminder) =>
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap)
    );

    return { data: convertedRows, total: reminders.total };
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};

const getAllRemindersByTenantAndClinicAndDentistAndType = async (
  tenant_id,
  clinic_id,
  dentist_id,
  page = 1,
  limit = 10,
  type
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("reminder", "list", {
    tenant_id,
    clinic_id,
    dentist_id,
    appointment_type: type,
    page,
    limit,
  });
  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result =
        await reminderModel.getAllRemindersByTenantAndClinicAndDentistAndType(
          tenant_id,
          clinic_id,
          dentist_id,
          type,
          limit,
          offset
        );
      return result;
    });

    const convertedRows = reminders.data.map((reminder) =>
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap)
    );

    return { data: convertedRows, total: reminders.total };
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};

const getAllNotifyByDentist = async (tenant_id, clinic_id, dentist_id) => {
  const cacheKey = buildCacheKey("reminder", "notify", {
    tenant_id,
    clinic_id,
    dentist_id,
  });
  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllNotifyByDentist(
        tenant_id,
        clinic_id,
        dentist_id
      );
      const result1 = result.map((r) => ({
        ...r,
        description: helper.safeJsonParse(r.description),
        appointment_date: formatDateOnly(r.appointment_date),
      }));

      return result1;
    });
    return reminders;
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};
const getAllNotifyByClinic = async (tenant_id, clinic_id) => {
  const cacheKey = buildCacheKey("reminder", "notify", {
    tenant_id,
    clinic_id,
  });
  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllNotifyByClinic(
        tenant_id,
        clinic_id
      );
      const result1 = result.map((r) => ({
        ...r,
        description: helper.safeJsonParse(r.description),
        visit_reason: helper.safeJsonParse(r.visit_reason),
        appointment_date: formatDateOnly(r.appointment_date),
      }));

      return result1;
    });
    return reminders;
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};

const getAllNotifyByPatient = async (tenant_id, clinic_id, patient_id) => {
  const cacheKey = buildCacheKey("reminder", "notify", {
    tenant_id,
    clinic_id,
    patient_id,
  });
  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllNotifyByPatient(
        tenant_id,
        clinic_id,
        patient_id
      );
      const result1 = result.map((r) => ({
        ...r,
        description: helper.safeJsonParse(r.description),
        appointment_date: formatDateOnly(r.appointment_date),
      }));
      return result1;
    });
    return reminders;
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};

const getAllReminderNotifyByDentist = async (
  tenant_id,
  clinic_id,
  dentist_id
) => {
  const cacheKey = buildCacheKey("reminder", "remindernotify", {
    tenant_id,
    clinic_id,
    dentist_id,
  });
  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllReminderNotifyByDentist(
        tenant_id,
        clinic_id,
        dentist_id
      );
      const result1 = result.map((r) => ({
        ...r,
        description: helper.safeJsonParse(r.description),
        start_date: formatDateOnly(r.start_date),
      }));
      return result1;
    });
    return reminders;
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};

const getAllReminderNotifyByClinic = async (tenant_id, clinic_id) => {
  const cacheKey = buildCacheKey("reminder", "remindernotify", {
    tenant_id,
    clinic_id,
  });
  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllReminderNotifyByClinic(
        tenant_id,
        clinic_id
      );
      const result1 = result.map((r) => ({
        ...r,
        description: helper.safeJsonParse(r.description),
        start_date: formatDateOnly(r.start_date),
      }));
      return result1;
    });
    return reminders;
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};

// Get Reminder by ID & Tenant
const getReminderByTenantIdAndReminderId = async (tenantId, reminderId) => {
  try {
    const reminder = await reminderModel.getReminderByTenantAndReminderId(
      tenantId,
      reminderId
    );

    const convertedRows = helper.convertDbToFrontend(
      reminder,
      reminderFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get reminder: " + error.message, 404);
  }
};

// Update Reminder
const updateReminder = async (reminderId, data, tenant_id) => {
  const fieldMap = {
    ...reminderFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await reminderModel.updateReminder(
      reminderId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Reminder not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("reminder:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update reminder", 404);
  }
};

// Delete Reminder
const deleteReminderByTenantIdAndReminderId = async (tenantId, reminderId) => {
  try {
    const affectedRows =
      await reminderModel.deleteReminderByTenantAndReminderId(
        tenantId,
        reminderId
      );
    if (affectedRows === 0) {
      throw new CustomError("Reminder not found.", 404);
    }

    await invalidateCacheByPattern("reminder:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete reminder: ${error.message}`, 404);
  }
};

const getReminderByTenantAndClinicIdAndDentistIdAndReminderId = async (
  tenantId,
  clinicId,
  dentistId,
  reminderId
) => {
  try {
    const reminder =
      await reminderModel.getReminderByTenantAndClinicIdAndDentistIdAndReminderId(
        tenantId,
        clinicId,
        dentistId,
        reminderId
      );

    const {
      start_date,
      time,
      repeat_end_date,
      reminder_repeat,
      repeat_weekdays,
      title,
      reminder_type,
      category,
      description,
    } = reminder;

    const schedule = [];
    const end = dayjs(repeat_end_date);
    const start = dayjs(start_date);
    const repeatType = (reminder_repeat || "").toLowerCase().trim();

    if (repeatType === "daily") {
      let current = start;
      while (current.isSameOrBefore(end)) {
        schedule.push({
          date: current.format("YYYY-MM-DD"),
          weekday: current.format("dddd"),
          title,
          description: JSON.parse(description),
        });
        current = current.add(1, "day"); // fixed 1-day step
      }
    } else if (repeatType === "every week" || repeatType === "weekly") {
      const weekdaysArray = repeat_weekdays
        ? repeat_weekdays.split(",").data.map((w) => w.trim())
        : [start.format("dddd")]; // default to start_date's weekday

      let current = start.startOf("week");

      while (current.isSameOrBefore(end)) {
        for (const wd of weekdaysArray) {
          const targetDay = WEEKDAYS[wd];
          if (targetDay !== undefined) {
            const reminderDate = current.add(targetDay, "day");
            if (
              reminderDate.isSameOrAfter(start) &&
              reminderDate.isSameOrBefore(end)
            ) {
              schedule.push({
                date: reminderDate.format("YYYY-MM-DD"),
                time,
                weekday: reminderDate.format("dddd"),
                title,
                reminder_type,
                category,
                description: JSON.parse(description),
              });
            }
          }
        }
        current = current.add(1, "week"); // fixed 1-week step
      }
    } else if (repeatType === "every month" || repeatType === "monthly") {
      let current = start;
      const dayOfMonth = start.date();

      while (current.isSameOrBefore(end)) {
        let reminderDate = current.date(dayOfMonth);

        if (reminderDate.month() !== current.month()) {
          // Adjust if invalid (e.g., Feb 30)
          reminderDate = current.endOf("month");
        }

        if (
          reminderDate.isSameOrAfter(start) &&
          reminderDate.isSameOrBefore(end)
        ) {
          schedule.push({
            date: reminderDate.format("YYYY-MM-DD"),
            time,
            weekday: reminderDate.format("dddd"),
            title,
            reminder_type,
            category,
            description: JSON.parse(description),
          });
        }

        current = current.add(1, "month"); // fixed 1-month step
      }
    } else {
      // Fallback: one-time reminder
      schedule.push({
        date: start.format("YYYY-MM-DD"),
        time,
        weekday: start.format("dddd"),
        title,
        reminder_type,
        category,
        time,
        description: JSON.parse(description),
      });
    }

    return schedule;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to generate reminder schedule");
  }
};

const WEEKDAYS = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const getMonthlywiseRemindersByTenantAndClinicIdAndDentistId = async (
  tenant_id,
  clinic_id,
  dentist_id,
  month,
  year
) => {
  try {
    const result = {};

    const startDate = dayjs(`${year}-${month}-01`);
    const endDate = startDate.endOf("month");

    const reminders =
      await reminderModel.getMonthlywiseRemindersByTenantAndClinicIdAndDentistId(
        tenant_id,
        clinic_id,
        dentist_id,
        month,
        year
      );
 

    for (const reminder of reminders) {
      const {
        start_date,
        time,
        repeat_end_date,
        reminder_repeat,
        repeat_weekdays,
        repeat_interval = 1, // default to 1 if undefined
        title,
        reminder_type,
        category,
        description,
      } = reminder;

      const repeatType = (reminder_repeat || "").toLowerCase().trim();
      const parsedDescription = JSON.parse(description || "[]");

      const start = dayjs(start_date);
      const end = repeat_end_date ? dayjs(repeat_end_date) : endDate;

      // Start from either start_date or the start of the requested month, whichever is later
      let current = start.isBefore(startDate) ? startDate : start;

      if (repeatType === "daily") {
        while (current.isSameOrBefore(end) && current.isSameOrBefore(endDate)) {
          const formattedDate = current.format("YYYY-MM-DD");
          if (!result[formattedDate]) result[formattedDate] = [];

          result[formattedDate].push({
            date: formattedDate,
            time,
            weekday: current.format("dddd"),
            title,
            reminder_type,
            category,
            description: parsedDescription,
          });

          current = current.add(repeat_interval, "day"); // <-- interval applied here
        }
      } else if (repeatType === "weekly" || repeatType === "every week") {
        const weekdays = repeat_weekdays
          ? repeat_weekdays.split(",").data.map((d) => d.trim())
          : [];

        while (current.isSameOrBefore(end)) {
          for (const wd of weekdays) {
            const dayNum = WEEKDAYS[wd];
            if (dayNum === undefined) continue;

            const target = current.startOf("week").add(dayNum, "day");

            if (
              target.isSameOrAfter(startDate) &&
              target.isSameOrBefore(endDate) &&
              target.isSameOrAfter(start) &&
              target.isSameOrBefore(end)
            ) {
              const formattedDate = target.format("YYYY-MM-DD");
              if (!result[formattedDate]) result[formattedDate] = [];

              result[formattedDate].push({
                date: formattedDate,
                time,
                weekday: target.format("dddd"),
                title,
                reminder_type,
                category,
                description: parsedDescription,
              });
            }
          }

          current = current.add(repeat_interval, "week"); // <-- interval applied here
        }
      } else if (repeatType === "monthly" || repeatType === "every month") {
        while (current.isSameOrBefore(end) && current.isSameOrBefore(endDate)) {
          const formattedDate = current.format("YYYY-MM-DD");
          if (!result[formattedDate]) result[formattedDate] = [];

          result[formattedDate].push({
            date: formattedDate,
            time,
            weekday: current.format("dddd"),
            title,
            reminder_type,
            category,
            description: parsedDescription,
          });

          current = current.add(repeat_interval, "month"); // <-- interval applied here
        }
      } else {
        // One-time reminder
        if (start.isSameOrAfter(startDate) && start.isSameOrBefore(endDate)) {
          const formattedDate = start.format("YYYY-MM-DD");
          if (!result[formattedDate]) result[formattedDate] = [];

          result[formattedDate].push({
            date: formattedDate,
            time,
            weekday: start.format("dddd"),
            title,
            reminder_type,
            category,
            description: parsedDescription,
          });
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Reminder Fetch Error:", error);
    throw new CustomError("Error fetching reminders.", 500);
  }
};

module.exports = {
  createReminder,
  getAllRemindersByTenantId,
  getReminderByTenantIdAndReminderId,
  updateReminder,
  deleteReminderByTenantIdAndReminderId,
  getReminderByTenantAndClinicIdAndDentistIdAndReminderId,
  getMonthlywiseRemindersByTenantAndClinicIdAndDentistId,
  getAllRemindersByTenantAndClinicAndDentistAndType,
  getAllNotifyByPatient,
  getAllNotifyByDentist,
  getAllReminderNotifyByDentist,
  getAllRemindersByTenantAndClinicId,
  getAllRemindersByTenantAndClinicAndDentistId,
  getAllReminderNotifyByClinic,
  getAllNotifyByClinic,
};
