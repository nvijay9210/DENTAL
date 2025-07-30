const cron = require("node-cron");
const {
  updateRoomIdBeforeAppointment,
  updateAppoinmentStatusCompleted,
  updateAppointmentStats,
} = require("../models/AppointmentModel");
const { archiveOldReadNotifications } = require("../models/NotificationModel");
const { getAllTenantIds } = require("../models/TenantModel");

// ✅ Get system's local time zone dynamically
const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ✅ Get current system-local time (converted from UTC if needed)
const getSystemDateTime = (timeZone = systemTimeZone) => {
  const now = new Date();
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .replace(",", "");
};

// 🔒 Locking mechanism to prevent job overlapping
const locks = {
  roomUpdate: false,
  statusUpdate: true,
  dailyMaintenance: false,
};

// ⏰ CRON 1: Update Room ID 5 minutes before appointment start (every 1 minute)
cron.schedule("* * * * *", async () => {
  if (locks.roomUpdate) return;
  locks.roomUpdate = true;

  try {
    const tenants = await getAllTenantIds();
    for (const tenantId of tenants) {
      await updateRoomIdBeforeAppointment(tenantId); // Your DB logic should subtract 5 minutes in query
    }
    console.log(`[${getSystemDateTime()}] ✅ Room IDs updated`);
  } catch (err) {
    console.error(`[${getSystemDateTime()}] ❌ Room ID update failed:`, err);
  } finally {
    locks.roomUpdate = false;
  }
});

// ⏰ CRON 2: Mark appointments as completed if end_time < now (every 1 minute)
cron.schedule("* * * * *", async () => {
  if (locks.statusUpdate) return;
  locks.statusUpdate = true;

  try {
    const tenants = await getAllTenantIds();
    for (const tenantId of tenants) {
      await updateAppoinmentStatusCompleted(tenantId); // Use local time inside your SQL
    }
    console.log(`[${getSystemDateTime()}] ✅ Appointments status updated`);
  } catch (err) {
    console.error(`[${getSystemDateTime()}] ❌ Status update failed:`, err);
  } finally {
    locks.statusUpdate = false;
  }
});

// 🌙 CRON 3: Daily maintenance at 00:00 system-local time
cron.schedule("0 0 * * *", async () => {
  if (locks.dailyMaintenance) return;
  locks.dailyMaintenance = true;

  try {
    console.log(`[${getSystemDateTime()}] 🛠️ Daily maintenance started`);

    await archiveOldReadNotifications();
    console.log("✅ Archived old notifications");

    await updateAppointmentStats();
    console.log("✅ Updated appointment stats");

    console.log(`[${getSystemDateTime()}] ✅ Maintenance completed`);
  } catch (err) {
    console.error(`[${getSystemDateTime()}] ❌ Maintenance failed:`, err);
  } finally {
    locks.dailyMaintenance = false;
  }
});
