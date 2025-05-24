const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

const errorHandler = require('./middlewares/errorHandler');
const createTable=require('./models/CreateModel')
require('dotenv').config();
const rateLimit = require('express-rate-limit');

const userRouter = require('./routes/userRouter');
const tenantRouter = require('./routes/TenantRouter');
const clinicRouter = require('./routes/ClinicRouter');
const dentistRouter = require('./routes/DentistRouter');
const patientRouter = require('./routes/PatientRouter');
const appointmentRouter = require('./routes/AppointmentRouter');
const treatmentRouter = require('./routes/TreatmentRouter');
const prescriptionRouter=require('./routes/PrescriptionRouter')
const statusTypeRouter=require('./routes/StatusTypeRouter')
const statusTypeSubRouter=require('./routes/StatusTypeSubRouter')
const assetRouter=require('./routes/AssetRouter')
const expenseRouter=require('./routes/ExpenseRouter')
const supplierRouter=require('./routes/SupplierRouter')
const reminderRouter=require('./routes/ReminderRouter')
const paymentRouter=require('./routes/PaymentRouter')

// const compressionMiddleware = require('./middlewares/CompressionMiddleware');
const { redisconnect } = require('./config/redisConfig');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads/", express.static(path.join(__dirname, "uploads")));
app.use("/files", express.static("uploads/"));
redisconnect()

// app.use(compressionMiddleware)

async function initializeTables() {
    try {
      await createTable.createTenantTable();
      await createTable.createClinicTable();
      await createTable.createDentistTable();
      await createTable.createPatientTable();
      await createTable.createAppointmentTable();
      await createTable.createTreatmentTable();
      await createTable.createPrescriptionTable();
      await createTable.createStatusTypeTable();
      await createTable.createStatusTypeSubTable();
      await createTable.createAssetTable();
      await createTable.createExpenseTable();
      await createTable.createSupplierTable();
      await createTable.createReminderTable();
      await createTable.createPaymentTable();
  
      console.log('All tables created in order.');
    } catch (err) {
      console.error('Error creating tables:', err);
    }
  }

  // initializeTables()
  

// app.use('/users',rateLimit({ windowMs: 5 * 60 * 1000, max: 2,handler: (req, res) => {
//     res.status(429).json({
//         success:false,
//       message: 'Too many login attempts. Please wait 15 minutes.'
//     });
//   } }), userRouter);

app.use('/tenant', tenantRouter);
app.use('/clinic', clinicRouter);
app.use('/dentist', dentistRouter);
app.use('/patient', patientRouter);
app.use('/appointment', appointmentRouter);
app.use('/treatment', treatmentRouter);
app.use('/prescription', prescriptionRouter);
app.use('/statustype', statusTypeRouter);
app.use('/statustypesub', statusTypeSubRouter);
app.use('/asset', assetRouter);
app.use('/expense', expenseRouter);
app.use('/supplier', supplierRouter);
app.use('/reminder', reminderRouter);
app.use('/payment', paymentRouter);

app.use(errorHandler);

module.exports = app;
