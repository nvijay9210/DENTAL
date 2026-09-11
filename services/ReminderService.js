const { CustomError } = require("../middlewares/CustomeError");
const reminderModel = require("../models/ReminderModel");

const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");

const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const dayjs = require("dayjs");
const weekday = require("dayjs/plugin/weekday");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
const customParseFormat = require("dayjs/plugin/customParseFormat");

dayjs.extend(weekday);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

const { buildCacheKey } = require("../utils/RedisCache");

/* ============================================================
   HELPERS
============================================================ */

/**
 * Safely convert undefined/null values.
 * MySQL should never receive undefined as a bind parameter.
 */
const nullValue = (value) => {
  return value === undefined || value === null ? null : value;
};

/**
 * Safely parse JSON.
 */
const safeParseJson = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/**
 * Convert weekdays stored either as:
 *
 * ["Sunday","Monday"]
 *
 * or:
 *
 * "Sunday,Monday"
 *
 * or:
 *
 * "\"sunday\""
 *
 * into an array.
 */
const parseWeekdays = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  let parsed = value;

  if (typeof value === "string") {
    const jsonParsed = safeParseJson(value, null);

    if (jsonParsed !== null) {
      parsed = jsonParsed;
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(parsed)
    .replace(/^["']|["']$/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * Invalidate reminder cache without blocking
 * create/update/delete HTTP responses.
 */
const invalidateReminderCache = () => {
  Promise.resolve()
    .then(() => invalidateCacheByPattern("reminder:*"))
    .catch((error) => {
      console.error(
        "Reminder cache invalidation failed:",
        error?.message || error,
      );
    });
};

/* ============================================================
   FIELD MAP
============================================================ */

const reminderFields = {
  tenant_id: (val) => nullValue(val),

  clinic_id: (val) => nullValue(val),

  dentist_id: (val) => nullValue(val),

  title: (val) => nullValue(val),

  description: (val) => {
    if (val === undefined || val === null || val === "") {
      return null;
    }

    return helper.safeStringify(val);
  },

  reminder_reason: (val) => nullValue(val),

  reminder_type: (val) => nullValue(val),

  type: (val) => nullValue(val),

  category: (val) => nullValue(val),

  start_date: (val) => {
    return val ? formatDateOnly(val) : null;
  },

  time: (val) => nullValue(val),

  is_recurring: (val) => {
    if (val === undefined || val === null || val === "") {
      return false;
    }

    return helper.parseBoolean(val);
  },

  reminder_repeat: (val) => nullValue(val),

  repeat_interval: (val) => {
    if (val === undefined || val === null || val === "") {
      return 0;
    }

    const parsed = Number.parseInt(val, 10);

    return Number.isNaN(parsed) ? 0 : parsed;
  },

  repeat_count: (val) => {
    if (val === undefined || val === null || val === "") {
      return 0;
    }

    const parsed = Number.parseInt(val, 10);

    return Number.isNaN(parsed) ? 0 : parsed;
  },

  repeat_weekdays: (val) => {
    if (val === undefined || val === null || val === "") {
      return null;
    }

    return helper.safeStringify(val);
  },

  monthly_week: (val) => {
    if (val === undefined || val === null || val === "") {
      return null;
    }

    return helper.safeStringify(val);
  },

  monthly_weekdays: (val) => {
    if (val === undefined || val === null || val === "") {
      return null;
    }

    return helper.safeStringify(val);
  },

  monthly_option: (val) => nullValue(val),

  repeat_end_date: (val) => {
    return val ? formatDateOnly(val) : null;
  },

  notify: (val) => {
    if (val === undefined || val === null || val === "") {
      return false;
    }

    return helper.parseBoolean(val);
  },

  notify_before_hours: (val) => {
    if (val === undefined || val === null || val === "") {
      return 0;
    }

    const parsed = Number.parseInt(val, 10);

    return Number.isNaN(parsed) ? 0 : parsed;
  },

  status: (val) => nullValue(val),
};

/* ============================================================
   REVERSE FIELD MAP
============================================================ */

const reminderFieldsReverseMap = {
  reminder_id: (val) => val,

  tenant_id: (val) => val,

  clinic_id: (val) => val,

  dentist_id: (val) => val,

  title: (val) => val,

  description: (val) => safeParseJson(val, null),

  reminder_reason: (val) => val,

  reminder_type: (val) => val,

  type: (val) => val,

  category: (val) => val,

  start_date: (val) => {
    return val ? formatDateOnly(val) : null;
  },

  time: (val) => val,

  reminder_repeat: (val) => val,

  repeat_interval: (val) => {
    if (val === undefined || val === null || val === "") {
      return 0;
    }

    const parsed = Number.parseInt(val, 10);

    return Number.isNaN(parsed) ? 0 : parsed;
  },

  repeat_count: (val) => {
    if (val === undefined || val === null || val === "") {
      return 0;
    }

    const parsed = Number.parseInt(val, 10);

    return Number.isNaN(parsed) ? 0 : parsed;
  },

  repeat_weekdays: (val) => safeParseJson(val, []),

  monthly_week: (val) => safeParseJson(val, null),

  monthly_weekdays: (val) => safeParseJson(val, []),

  monthly_option: (val) => val,

  repeat_end_date: (val) => {
    return val ? formatDateOnly(val) : null;
  },

  notify: (val) => Boolean(val),

  notify_before_hours: (val) => {
    if (val === undefined || val === null || val === "") {
      return 0;
    }

    const parsed = Number.parseInt(val, 10);

    return Number.isNaN(parsed) ? 0 : parsed;
  },

  is_recurring: (val) => Boolean(val),

  status: (val) => val,

  created_by: (val) => val,

  created_time: (val) => {
    return val ? convertUTCToLocal(val) : null;
  },

  updated_by: (val) => val,

  updated_time: (val) => {
    return val ? convertUTCToLocal(val) : null;
  },
};

/* ============================================================
   CREATE REMINDER
============================================================ */

const createReminder = async (data) => {
  try {
    const fieldMap = {
      ...reminderFields,

      created_by: (val) => nullValue(val),
    };

    const { columns, values } = mapFields(data, fieldMap);

    /*
     * Important:
     * mapFields may return undefined values.
     * Convert all undefined values to null before MySQL.
     */
    const normalizedValues = values.map((value) =>
      value === undefined ? null : value,
    );

    console.log("Reminder CREATE columns:", columns);

    console.log("Reminder CREATE values:", normalizedValues);

    /*
     * DB operation must complete first.
     */
    const reminderId = await reminderModel.createReminder(
      "reminder",
      columns,
      normalizedValues,
    );

    console.log("Reminder DB INSERT COMPLETED:", reminderId);

    /*
     * IMPORTANT:
     * Do NOT await Redis cache invalidation.
     *
     * This allows controller to immediately send:
     *
     * 201 { message: "Reminder created", id }
     */
    invalidateReminderCache();

    return reminderId;
  } catch (error) {
    console.error("Failed to create reminder:", error);

    throw new CustomError(error?.message || "Failed to create reminder", 500);
  }
};

/* ============================================================
   GET ALL REMINDERS BY TENANT
============================================================ */

const getAllRemindersByTenantId = async (tenantId, page = 1, limit = 10) => {
  try {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);

    const safeLimit = Math.max(Number.parseInt(limit, 10) || 10, 1);

    const offset = (safePage - 1) * safeLimit;

    const cacheKey = buildCacheKey("reminder", "list", {
      tenant_id: tenantId,
      page: safePage,
      limit: safeLimit,
    });

    const reminders = await getOrSetCache(cacheKey, async () => {
      return reminderModel.getAllRemindersByTenantId(
        tenantId,
        safeLimit,
        offset,
      );
    });

    const convertedRows = (reminders?.data || []).map((reminder) =>
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap),
    );

    return {
      data: convertedRows,
      total: reminders?.total || 0,
    };
  } catch (error) {
    console.error("Get reminders by tenant error:", error);

    throw new CustomError(error?.message || "Failed to fetch reminders", 500);
  }
};

/* ============================================================
   GET ALL REMINDERS BY TENANT + CLINIC
============================================================ */

const getAllRemindersByTenantAndClinicId = async (
  tenant_id,
  clinic_id,
  page = 1,
  limit = 10,
) => {
  try {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);

    const safeLimit = Math.max(Number.parseInt(limit, 10) || 10, 1);

    const offset = (safePage - 1) * safeLimit;

    const cacheKey = buildCacheKey("reminder", "list", {
      tenant_id,
      clinic_id,
      page: safePage,
      limit: safeLimit,
    });

    const reminders = await getOrSetCache(cacheKey, async () => {
      return reminderModel.getAllRemindersByTenantAndClinicId(
        tenant_id,
        clinic_id,
        safeLimit,
        offset,
      );
    });

    const convertedRows = (reminders?.data || []).map((reminder) =>
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap),
    );

    return {
      data: convertedRows,
      total: reminders?.total || 0,
    };
  } catch (error) {
    console.error("Get reminders by tenant and clinic error:", error);

    throw new CustomError(error?.message || "Failed to fetch reminders", 500);
  }
};

/* ============================================================
   GET ALL REMINDERS BY TENANT + CLINIC + DENTIST
============================================================ */

const getAllRemindersByTenantAndClinicAndDentistId = async (
  tenant_id,
  clinic_id,
  dentist_id,
  page = 1,
  limit = 10,
) => {
  try {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);

    const safeLimit = Math.max(Number.parseInt(limit, 10) || 10, 1);

    const offset = (safePage - 1) * safeLimit;

    const cacheKey = buildCacheKey("reminder", "list", {
      tenant_id,
      clinic_id,
      dentist_id,
      page: safePage,
      limit: safeLimit,
    });

    const reminders = await getOrSetCache(cacheKey, async () => {
      return reminderModel.getAllRemindersByTenantAndClinicAndDentistId(
        tenant_id,
        clinic_id,
        dentist_id,
        safeLimit,
        offset,
      );
    });

    const convertedRows = (reminders?.data || []).map((reminder) =>
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap),
    );

    return {
      data: convertedRows,
      total: reminders?.total || 0,
    };
  } catch (error) {
    console.error("Get reminders by dentist error:", error);

    throw new CustomError(error?.message || "Failed to fetch reminders", 500);
  }
};

/* ============================================================
   GET ALL REMINDERS BY TYPE
============================================================ */

const getAllRemindersByTenantAndClinicAndDentistAndType = async (
  tenant_id,
  clinic_id,
  dentist_id,
  page = 1,
  limit = 10,
  type,
) => {
  try {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);

    const safeLimit = Math.max(Number.parseInt(limit, 10) || 10, 1);

    const offset = (safePage - 1) * safeLimit;

    const cacheKey = buildCacheKey("reminder", "list", {
      tenant_id,
      clinic_id,
      dentist_id,
      appointment_type: type,
      page: safePage,
      limit: safeLimit,
    });

    const reminders = await getOrSetCache(cacheKey, async () => {
      return reminderModel.getAllRemindersByTenantAndClinicAndDentistAndType(
        tenant_id,
        clinic_id,
        dentist_id,
        type,
        safeLimit,
        offset,
      );
    });

    const convertedRows = (reminders?.data || []).map((reminder) =>
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap),
    );

    return {
      data: convertedRows,
      total: reminders?.total || 0,
    };
  } catch (error) {
    console.error("Get reminders by type error:", error);

    throw new CustomError(error?.message || "Failed to fetch reminders", 500);
  }
};

/* ============================================================
   GET NOTIFY BY DENTIST
============================================================ */

const getAllNotifyByDentist = async (tenant_id, clinic_id, dentist_id) => {
  try {
    const cacheKey = buildCacheKey("reminder", "notify", {
      tenant_id,
      clinic_id,
      dentist_id,
    });

    return await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllNotifyByDentist(
        tenant_id,
        clinic_id,
        dentist_id,
      );

      return (result || []).map((row) => ({
        ...row,
        description: safeParseJson(row.description, []),
        appointment_date: row.appointment_date
          ? formatDateOnly(row.appointment_date)
          : null,
      }));
    });
  } catch (error) {
    console.error("Get notify by dentist error:", error);

    throw new CustomError(
      error?.message || "Failed to fetch dentist notifications",
      500,
    );
  }
};

/* ============================================================
   GET NOTIFY BY CLINIC
============================================================ */

const getAllNotifyByClinic = async (tenant_id, clinic_id) => {
  try {
    const cacheKey = buildCacheKey("reminder", "notify", {
      tenant_id,
      clinic_id,
    });

    return await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllNotifyByClinic(
        tenant_id,
        clinic_id,
      );

      return (result || []).map((row) => ({
        ...row,
        description: safeParseJson(row.description, []),
        visit_reason: safeParseJson(row.visit_reason, []),
        appointment_date: row.appointment_date
          ? formatDateOnly(row.appointment_date)
          : null,
      }));
    });
  } catch (error) {
    console.error("Get notify by clinic error:", error);

    throw new CustomError(
      error?.message || "Failed to fetch clinic notifications",
      500,
    );
  }
};

/* ============================================================
   GET NOTIFY BY PATIENT
============================================================ */

const getAllNotifyByPatient = async (tenant_id, clinic_id, patient_id) => {
  try {
    const cacheKey = buildCacheKey("reminder", "notify", {
      tenant_id,
      clinic_id,
      patient_id,
    });

    return await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllNotifyByPatient(
        tenant_id,
        clinic_id,
        patient_id,
      );

      return (result || []).map((row) => ({
        ...row,
        description: safeParseJson(row.description, []),
        appointment_date: row.appointment_date
          ? formatDateOnly(row.appointment_date)
          : null,
      }));
    });
  } catch (error) {
    console.error("Get notify by patient error:", error);

    throw new CustomError(
      error?.message || "Failed to fetch patient notifications",
      500,
    );
  }
};

/* ============================================================
   GET REMINDER NOTIFY BY DENTIST
============================================================ */

const getAllReminderNotifyByDentist = async (
  tenant_id,
  clinic_id,
  dentist_id,
) => {
  try {
    const cacheKey = buildCacheKey("reminder", "remindernotify", {
      tenant_id,
      clinic_id,
      dentist_id,
    });

    return await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllReminderNotifyByDentist(
        tenant_id,
        clinic_id,
        dentist_id,
      );

      return (result || []).map((row) => ({
        ...row,
        description: safeParseJson(row.description, []),
        start_date: row.start_date ? formatDateOnly(row.start_date) : null,
      }));
    });
  } catch (error) {
    console.error("Get reminder notify by dentist error:", error);

    throw new CustomError(
      error?.message || "Failed to fetch reminder notifications",
      500,
    );
  }
};

/* ============================================================
   GET REMINDER NOTIFY BY CLINIC
============================================================ */

const getAllReminderNotifyByClinic = async (tenant_id, clinic_id) => {
  try {
    const cacheKey = buildCacheKey("reminder", "remindernotify", {
      tenant_id,
      clinic_id,
    });

    return await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllReminderNotifyByClinic(
        tenant_id,
        clinic_id,
      );

      return (result || []).map((row) => ({
        ...row,
        description: safeParseJson(row.description, []),
        start_date: row.start_date ? formatDateOnly(row.start_date) : null,
      }));
    });
  } catch (error) {
    console.error("Get reminder notify by clinic error:", error);

    throw new CustomError(
      error?.message || "Failed to fetch reminder notifications",
      500,
    );
  }
};

/* ============================================================
   GET REMINDER BY ID + TENANT
============================================================ */

const getReminderByTenantIdAndReminderId = async (tenantId, reminderId) => {
  try {
    const reminder = await reminderModel.getReminderByTenantAndReminderId(
      tenantId,
      reminderId,
    );

    if (!reminder) {
      throw new CustomError("Reminder not found", 404);
    }

    return helper.convertDbToFrontend(reminder, reminderFieldsReverseMap);
  } catch (error) {
    console.error("Get reminder by ID error:", error);

    if (error instanceof CustomError) {
      throw error;
    }

    throw new CustomError(error?.message || "Failed to fetch reminder", 500);
  }
};

/* ============================================================
   UPDATE REMINDER
============================================================ */

const updateReminder = async (reminderId, data, tenant_id) => {
  try {
    const fieldMap = {
      ...reminderFields,

      updated_by: (val) => nullValue(val),
    };

    const { columns, values } = mapFields(data, fieldMap);

    /*
     * Never send undefined to MySQL.
     */
    const normalizedValues = values.map((value) =>
      value === undefined ? null : value,
    );

    console.log("Reminder UPDATE ID:", reminderId);

    console.log("Reminder UPDATE columns:", columns);

    console.log("Reminder UPDATE values:", normalizedValues);

    const affectedRows = await reminderModel.updateReminder(
      reminderId,
      columns,
      normalizedValues,
      tenant_id,
    );

    console.log("Reminder UPDATE COMPLETED:", affectedRows);

    /*
     * Do not block HTTP response on Redis.
     */
    invalidateReminderCache();

    return affectedRows;
  } catch (error) {
    console.error("Update Reminder Error:", error);

    throw new CustomError(error?.message || "Failed to update reminder", 500);
  }
};

/* ============================================================
   DELETE REMINDER
============================================================ */

const deleteReminderByTenantIdAndReminderId = async (tenantId, reminderId) => {
  try {
    console.log("Reminder DELETE tenant:", tenantId);

    console.log("Reminder DELETE ID:", reminderId);

    const affectedRows =
      await reminderModel.deleteReminderByTenantAndReminderId(
        tenantId,
        reminderId,
      );

    console.log("Reminder DELETE COMPLETED:", affectedRows);

    /*
     * Do not block HTTP response on Redis.
     */
    invalidateReminderCache();

    return affectedRows;
  } catch (error) {
    console.error("Delete Reminder Error:", error);

    throw new CustomError(error?.message || "Failed to delete reminder", 500);
  }
};

/* ============================================================
   GET REMINDER SCHEDULE
============================================================ */

const getReminderByTenantAndClinicIdAndDentistIdAndReminderId = async (
  tenantId,
  clinicId,
  dentistId,
  reminderId,
) => {
  try {
    const reminder =
      await reminderModel.getReminderByTenantAndClinicIdAndDentistIdAndReminderId(
        tenantId,
        clinicId,
        dentistId,
        reminderId,
      );

    if (!reminder) {
      throw new CustomError("Reminder not found", 404);
    }

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

    const start = dayjs(start_date);

    const end = repeat_end_date ? dayjs(repeat_end_date) : start;

    const repeatType = (reminder_repeat || "").toLowerCase().trim();

    const parsedDescription = safeParseJson(description, []);

    /* --------------------------------------------------------
         DAILY
      -------------------------------------------------------- */

    if (repeatType === "daily") {
      let current = start;

      while (current.isSameOrBefore(end)) {
        schedule.push({
          date: current.format("YYYY-MM-DD"),
          time,
          weekday: current.format("dddd"),
          title,
          reminder_type,
          category,
          description: parsedDescription,
        });

        current = current.add(1, "day");
      }
    } else if (repeatType === "weekly" || repeatType === "every week") {

    /* --------------------------------------------------------
         WEEKLY
      -------------------------------------------------------- */
      const weekdaysArray = parseWeekdays(repeat_weekdays);

      const effectiveWeekdays =
        weekdaysArray.length > 0 ? weekdaysArray : [start.format("dddd")];

      let current = start.startOf("week");

      while (current.isSameOrBefore(end)) {
        for (const weekdayName of effectiveWeekdays) {
          const targetDay = WEEKDAYS[normalizeWeekdayName(weekdayName)];

          if (targetDay === undefined) {
            continue;
          }

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
              description: parsedDescription,
            });
          }
        }

        current = current.add(1, "week");
      }
    } else if (repeatType === "monthly" || repeatType === "every month") {

    /* --------------------------------------------------------
         MONTHLY
      -------------------------------------------------------- */
      let current = start;

      const dayOfMonth = start.date();

      while (current.isSameOrBefore(end)) {
        let reminderDate = current.date(dayOfMonth);

        /*
         * Example:
         * January 31 -> February
         * February doesn't have 31.
         */
        if (reminderDate.month() !== current.month()) {
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
            description: parsedDescription,
          });
        }

        current = current.add(1, "month");
      }
    } else {

    /* --------------------------------------------------------
         ONE TIME
      -------------------------------------------------------- */
      schedule.push({
        date: start.format("YYYY-MM-DD"),
        time,
        weekday: start.format("dddd"),
        title,
        reminder_type,
        category,
        description: parsedDescription,
      });
    }

    return schedule;
  } catch (error) {
    console.error("Generate reminder schedule error:", error);

    if (error instanceof CustomError) {
      throw error;
    }

    throw new CustomError(
      error?.message || "Failed to generate reminder schedule",
      500,
    );
  }
};

/* ============================================================
   WEEKDAYS
============================================================ */

const WEEKDAYS = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Converts:
 *
 * sunday
 * SUNDAY
 * Sunday
 *
 * to:
 *
 * Sunday
 */
const normalizeWeekdayName = (value) => {
  if (!value) {
    return "";
  }

  const normalized = String(value).trim().toLowerCase();

  return (
    Object.keys(WEEKDAYS).find((day) => day.toLowerCase() === normalized) || ""
  );
};

/* ============================================================
   MONTHLY CALENDAR REMINDERS
============================================================ */

const getMonthlywiseRemindersByTenantAndClinicIdAndDentistId = async (
  tenant_id,
  clinic_id,
  dentist_id,
  month,
  year,
) => {
  try {
    const result = {};

    const startDate = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);

    const endDate = startDate.endOf("month");

    const reminders =
      await reminderModel.getMonthlywiseRemindersByTenantAndClinicIdAndDentistId(
        tenant_id,
        clinic_id,
        dentist_id,
        month,
        year,
      );

    for (const reminder of reminders || []) {
      const {
        start_date,
        time,
        repeat_end_date,
        reminder_repeat,
        repeat_weekdays,
        repeat_interval = 1,
        title,
        reminder_type,
        category,
        description,
      } = reminder;

      const repeatType = (reminder_repeat || "").toLowerCase().trim();

      const parsedDescription = safeParseJson(description, []);

      const start = dayjs(start_date);

      const end = repeat_end_date ? dayjs(repeat_end_date) : endDate;

      const interval = Number.parseInt(repeat_interval, 10) || 1;

      /*
       * Start from whichever is later:
       *
       * reminder start date
       * requested month start
       */
      let current = start.isBefore(startDate) ? startDate : start;

      /* ------------------------------------------------------
           DAILY
        ------------------------------------------------------ */

      if (repeatType === "daily") {
        while (current.isSameOrBefore(end) && current.isSameOrBefore(endDate)) {
          const formattedDate = current.format("YYYY-MM-DD");

          if (!result[formattedDate]) {
            result[formattedDate] = [];
          }

          result[formattedDate].push({
            date: formattedDate,
            time,
            weekday: current.format("dddd"),
            title,
            reminder_type,
            category,
            description: parsedDescription,
          });

          current = current.add(interval, "day");
        }
      } else if (repeatType === "weekly" || repeatType === "every week") {

      /* ------------------------------------------------------
           WEEKLY
        ------------------------------------------------------ */
        const weekdays = parseWeekdays(repeat_weekdays);

        /*
         * If no weekday selected,
         * use start date weekday.
         */
        const effectiveWeekdays =
          weekdays.length > 0 ? weekdays : [start.format("dddd")];

        while (current.isSameOrBefore(end)) {
          for (const weekdayName of effectiveWeekdays) {
            const normalized = normalizeWeekdayName(weekdayName);

            const dayNum = WEEKDAYS[normalized];

            if (dayNum === undefined) {
              continue;
            }

            const target = current.startOf("week").add(dayNum, "day");

            if (
              target.isSameOrAfter(startDate) &&
              target.isSameOrBefore(endDate) &&
              target.isSameOrAfter(start) &&
              target.isSameOrBefore(end)
            ) {
              const formattedDate = target.format("YYYY-MM-DD");

              if (!result[formattedDate]) {
                result[formattedDate] = [];
              }

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

          current = current.add(interval, "week");
        }
      } else if (repeatType === "monthly" || repeatType === "every month") {

      /* ------------------------------------------------------
           MONTHLY
        ------------------------------------------------------ */
        const dayOfMonth = start.date();

        while (current.isSameOrBefore(end) && current.isSameOrBefore(endDate)) {
          let reminderDate = current.date(dayOfMonth);

          /*
           * Handle dates such as:
           *
           * Jan 31 -> Feb
           */
          if (reminderDate.month() !== current.month()) {
            reminderDate = current.endOf("month");
          }

          if (
            reminderDate.isSameOrAfter(startDate) &&
            reminderDate.isSameOrBefore(endDate) &&
            reminderDate.isSameOrAfter(start) &&
            reminderDate.isSameOrBefore(end)
          ) {
            const formattedDate = reminderDate.format("YYYY-MM-DD");

            if (!result[formattedDate]) {
              result[formattedDate] = [];
            }

            result[formattedDate].push({
              date: formattedDate,
              time,
              weekday: reminderDate.format("dddd"),
              title,
              reminder_type,
              category,
              description: parsedDescription,
            });
          }

          current = current.add(interval, "month");
        }
      } else {

      /* ------------------------------------------------------
           ONE TIME
        ------------------------------------------------------ */
        if (start.isSameOrAfter(startDate) && start.isSameOrBefore(endDate)) {
          const formattedDate = start.format("YYYY-MM-DD");

          if (!result[formattedDate]) {
            result[formattedDate] = [];
          }

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
    console.error("Monthly reminder fetch error:", error);

    throw new CustomError(
      error?.message || "Failed to fetch monthly reminders",
      500,
    );
  }
};

/* ============================================================
   EXPORTS
============================================================ */

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
