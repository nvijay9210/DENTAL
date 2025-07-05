const cron = require('node-cron');
const { updateRoomIdBeforeAppointment } = require('../models/AppointmentModel');
const { archiveOldReadNotifications } = require('../models/NotificationModel');

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

cron.schedule('0 0 * * *', () => {
  setImmediate(async () => {
    console.log("🕒 Running daily maintenance tasks at 00:00...");
    try {
      await archiveOldReadNotifications();
      console.log("✅ Old read notifications archived");
    } catch (err) {
      console.error("❌ Maintenance task failed:", err.message);
    }
  });
});
