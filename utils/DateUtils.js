function formatDateOnly(isoString) {
  if (!isoString) return null;

  const date = new Date(isoString);
  if (isNaN(date)) return null; // Check if date is invalid

  return date.toISOString().split("T")[0];
}

// utils/dateFormatter.js

function formatAppointments(rows) {
  return rows.map((app) => {
    const formatted = { ...app };

    if (app.appointment_date) {
      const appointmentDate = new Date(app.appointment_date);
      formatted.appointment_date = appointmentDate.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    }

    if (app.date_of_birth) {
      const dob = new Date(app.date_of_birth);
      formatted.date_of_birth = dob.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    }

    return formatted;
  });
}


module.exports = { formatDateOnly, formatAppointments };
