const { CustomError } = require("../middlewares/CustomeError");

function formatDateOnly(isoString) {
  console.log(isoString)
  if (!isoString) return null;

  const date = new Date(isoString);
  if (isNaN(date)) return null; // Check if date is invalid

  return date.toISOString().split("T")[0];
}

// utils/dateFormatter.js

function formatAppointments(rows) {
  return rows.data.map((app) => {
    const formatted = { ...app };

    if (app.appointment_date) {
      const appointmentDate = new Date(app.appointment_date);
      formatted.appointment_date = appointmentDate.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    }

    if (app.date_of_birth) {
      const dob = new Date(app.date_of_birth);
      formatted.date_of_birth = dob.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    }

    // if (app.start_date) {
    //   const dob = new Date(app.start_date);
    //   formatted.start_date = dob.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    // }

    // if (app.end_date) {
    //   const dob = new Date(app.end_date);
    //   formatted.end_date = dob.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    // }

    return formatted;
  });
}

function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isoToSqlDatetime(isoStr) {
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date string");
  }

  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const DD = String(date.getDate()).padStart(2, "0");

  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

const compareDateTime=async(d1, t1, d2, t2)=> {
  const datetime1 = new Date(`${d1}T${t1}`);
  const datetime2 = new Date(`${d2}T${t2}`);

  console.log(datetime1,datetime2)

  const millis1 = datetime1.getTime();
  const millis2 = datetime2.getTime();

  console.log(millis1,millis2)

  if (millis1 > millis2) {
    throw new CustomError(`${d1} ${t1} is later than ${d2} ${t2}`,400) 

  // if (millis1 < millis2) {
  //   return `${d1} ${t1} is earlier than ${d2} ${t2}`;
  // } else if (millis1 > millis2) {
  //   return `${d1} ${t1} is later than ${d2} ${t2}`;
  // } else {
  //   return `${d1} ${t1} is the same as ${d2} ${t2}`;
  // }
}
}


module.exports = { formatDateOnly, formatAppointments,isValidDate,isoToSqlDatetime,compareDateTime };
