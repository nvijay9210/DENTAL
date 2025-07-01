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

cron.schedule('* * * * *', async () => {
  const systemTime = getSystemDateTime();
  console.log(`[${systemTime}] Checking for upcoming virtual appointments...`);
  await updateRoomIdBeforeAppointment();
});

cron.schedule('0 0 * * *', async () => {
  console.log("🕒 Running daily maintenance tasks at 00:00...");

  await archiveOldReadNotifications();
});
