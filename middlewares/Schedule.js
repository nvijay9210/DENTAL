// roomScheduler.js
const cron = require('node-cron');
const { updateRoomIdBeforeAppointment } = require('../models/AppointmentModel');

// Schedule it to run every minute
cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Checking for upcoming virtual appointments...`);
  await updateRoomIdBeforeAppointment();
});


