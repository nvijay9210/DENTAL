const cron = require('node-cron');
const { updateRoomIdBeforeAppointment, updateAppoinmentStatusCompleted, updateAppointmentStats } = require('../models/AppointmentModel');
const { archiveOldReadNotifications } = require('../models/NotificationModel');
const { getSystemTimeOnly } = require('../utils/DateUtils');

function getSystemDateTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(now).replace(',', '');
}

// ✅ Every minute check for upcoming appointments
cron.schedule('* * * * *', () => {
  setImmediate(async () => {
    const systemTime = getSystemDateTime();
    console.log(`[${systemTime}] ⏳ Checking virtual appointments...`);
    try {
      const start = Date.now();
      await updateRoomIdBeforeAppointment();
      console.log(`✅ Completed in ${Date.now() - start}ms`);
    } catch (err) {
      console.error("❌ Appointment cron failed:", err.message);
    }
  });
});

// ✅ Every minute check and mark completed appointments

cron.schedule('* * * * *', () => {
  setImmediate(async () => {
    const systemTime = getSystemTimeOnly(); // <-- get local system time (HH:MM:SS)
    console.log(`[${new Date().toLocaleString()}] 🔁 Checking for appointments to complete with system time: ${systemTime}`);
    
    try {
      const count = await updateAppoinmentStatusCompleted(systemTime); // ⬅ pass time to your query
      console.log(`✅ Marked ${count} appointments as completed.`);
    } catch (err) {
      console.error("❌ Error updating appointment status:", err.message);
    }
  });
});


// ✅ Midnight task for archiving notifications
cron.schedule('0 0 * * *', () => {
  setImmediate(async () => {
    console.log("🕒 Running daily maintenance tasks at 00:00...");
    try {
      await archiveOldReadNotifications();
      console.log("✅ Old read notifications archived");

      await updateAppointmentStats(); // ✅ Call the stats update function
      console.log("✅ Appointment stats updated");
    } catch (err) {
      console.error("❌ Maintenance task failed:", err.message);
    }
  });
});
