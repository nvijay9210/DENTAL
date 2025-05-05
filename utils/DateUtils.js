function formatDateOnly(isoString) {
  if (!isoString) return null;

  const date = new Date(isoString);
  if (isNaN(date)) return null; // Check if date is invalid

  return date.toISOString().split("T")[0];
}

// utils/dateFormatter.js

function formatAppointments(rows) {
  return rows.map((app) => {
    const appointmentDate = new Date(app.appointment_date);

    return {
      ...app,
      appointment_date: appointmentDate.toLocaleDateString("en-CA"), // "YYYY-MM-DD"
    };
  });
}

module.exports = { formatDateOnly, formatAppointments };
