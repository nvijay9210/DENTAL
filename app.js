const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
// require('./middlewares/Schedule') //appointment schedule
// const { logFilePath, logStream } = require('./logs/logger'); //log file

const errorHandler = require('./middlewares/errorHandler');
const createTable = require('./models/CreateModel');
require('dotenv').config();
const rateLimit = require('express-rate-limit');

// Routers
const userRouter = require('./routes/userRouter');
const tenantRouter = require('./routes/TenantRouter');
const clinicRouter = require('./routes/ClinicRouter');
const dentistRouter = require('./routes/DentistRouter');
const patientRouter = require('./routes/PatientRouter');
const appointmentRouter = require('./routes/AppointmentRouter');
const treatmentRouter = require('./routes/TreatmentRouter');
const prescriptionRouter = require('./routes/PrescriptionRouter');
const statusTypeRouter = require('./routes/StatusTypeRouter');
const statusTypeSubRouter = require('./routes/StatusTypeSubRouter');
const assetRouter = require('./routes/AssetRouter');
const expenseRouter = require('./routes/ExpenseRouter');
const supplierRouter = require('./routes/SupplierRouter');
const supplierProductsRouter = require('./routes/SupplierProductsRouter');
const supplierPaymentsRouter = require('./routes/SupplierPaymentsRouter');
const purchaseOrdersRouter = require('./routes/PurchaseOrdersRouter');
const supplierReviewsRouter = require('./routes/SupplierReviewsRouter');
const reminderRouter = require('./routes/ReminderRouter');
const paymentRouter = require('./routes/PaymentRouter');
const dashboardRouter = require('./routes/DashboardRouter');
const appointment_reschedules = require('./routes/AppointmentReschedulesRouter');
const receptionRouter = require('./routes/ReceptionRouter');
const userActivityRouter = require('./routes/UserActivityRouter');
const loginHistoryRouter = require('./routes/LoginHistoryRouter');
const notificationRouter = require('./routes/NotificationRouter');

// const compressionMiddleware = require('./middlewares/CompressionMiddleware');
const { redisconnect } = require('./config/redisConfig');

// Initialize Express
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://192.168.1.17:5173',
  'https://yourfrontend.com', 
];

const cloudflareRegex = /\.trycloudflare\.com$/;

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow Postman/no-origin

      try {
        if (
          allowedOrigins.includes(origin) ||
          (origin.startsWith('https://')  && cloudflareRegex.test(new URL(origin).hostname))
        ) {
          callback(null, true);
        } else {
          callback(new Error(`CORS not allowed: ${origin}`));
        }
      } catch (err) {
        callback(new Error(`Invalid origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO events
const rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', (roomId) => {
    socket.join(roomId);
    rooms[roomId] = rooms[roomId] || [];
    rooms[roomId].push(socket.id);

    const otherUser = rooms[roomId].find(id => id !== socket.id);
    if (otherUser) {
      socket.to(otherUser).emit('ready');
    }
  });

  socket.on('offer', (offer, roomId) => {
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', (answer, roomId) => {
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate, roomId) => {
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
  });
});

// Middleware setup
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads/", express.static(path.join(__dirname, "uploads")));
app.use("/files", express.static("uploads/"));


// ✅ Morgan logging (system time)
// morgan.token('local-date', () => new Date().toLocaleString());
// app.use(morgan(':local-date :method :url :status', { stream: logStream }));


// Redis connection
redisconnect();

// Initialize tables
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
    await createTable.createSupplierProdutsTable();
    await createTable.createPurchaseOrder();
    await createTable.createSupplierPaymentsTable();
    await createTable.createSupplierReviewTable();
    await createTable.createReminderTable();
    await createTable.createPaymentTable();
    await createTable.createAppointmentReschedulesTable();
    await createTable.createReception();
    await createTable.creatLoginHistoryTable();
    await createTable.createUserActivityTable();
    await createTable.creatNotificationTable();
    await createTable.creatNotificationRecipientsTable();
    await createTable.createAppointmentStatsTable();

    console.log('All tables created in order.');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
}

// initializeTables(); // Uncomment if you want to auto-create tables on startup

// require('./models/AlterTables')


// ✅ Log viewer route
// app.get('/logs', (req, res) => {
//   if (!fs.existsSync(logFilePath)) {
//     return res.status(404).send('Log file not found');
//   }

//   fs.readFile(logFilePath, 'utf8', (err, data) => {
//     if (err) {
//       console.error('Error reading log file:', err.message);
//       return res.status(500).send('Error reading log file');
//     }
//     res.type('text/plain').send(data);
//   });
// });


// Test route
app.get('/test', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Successfully Running' });
});

// API Routes
app.use('/v1/tenant', tenantRouter);
app.use('/v1/clinic', clinicRouter);
app.use('/v1/dentist', dentistRouter);
app.use('/v1/patient', patientRouter);
app.use('/v1/appointment', appointmentRouter);
app.use('/v1/treatment', treatmentRouter);
app.use('/v1/prescription', prescriptionRouter);
app.use('/v1/statustype', statusTypeRouter);
app.use('/v1/statustypesub', statusTypeSubRouter);
app.use('/v1/asset', assetRouter);
app.use('/v1/expense', expenseRouter);
app.use('/v1/supplier', supplierRouter);
app.use('/v1/supplierproduct', supplierProductsRouter);
app.use('/v1/supplierpayment', supplierPaymentsRouter);
app.use('/v1/purchaseorder', purchaseOrdersRouter);
app.use('/v1/supplierreview', supplierReviewsRouter);
app.use('/v1/reminder', reminderRouter);
app.use('/v1/payment', paymentRouter);
app.use('/v1/dashboard', dashboardRouter);
app.use('/v1/appointment_reschedules', appointment_reschedules);
app.use('/v1/reception', receptionRouter);
app.use('/v1/useractivity', userActivityRouter);
app.use('/v1/loginhistory', loginHistoryRouter);
app.use('/v1/notification', notificationRouter);

// Error handler must be last
app.use(errorHandler);

module.exports={app}