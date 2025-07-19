module.exports = {
  TEST_URL: "/test",

  ADD_TENANT: "/addtenant",
  GETALL_TENTANT: "/getalltenants",
  GET_TENANT: "/gettenant/:tenant_id",
  GET_TENANT_NAME_DOMAIN: "/gettenant/:tenant_name/:tenant_domain",
  UPDATE_TENANT: "/updatetenant/:tenant_id",
  DELETE_TENANT: "/deletetenant/:tenant_id",

  ADD_CLINIC: "/addclinic",
  GETALL_CLINIC_TENANT: "/getallclinics/:tenant_id",
  GET_CLINIC_TENANT: "/getclinic/:clinic_id/:tenant_id",
  UPDATE_CLINIC_TENANT: "/updateclinic/:clinic_id/:tenant_id",
  UPDATE_CLINIC_SETTINGS: "/updateclinic_settings/:tenant_id/:clinic_id", //settings:1 in query
  HANDLE_CLINIC_ASSIGNMENT: "/handleClinicassignment/:tenant_id/:clinic_id",
  DELETE_CLINIC_TENANT: "/deleteclinic/:clinic_id/:tenant_id",

  ADD_DENTIST: "/adddentist",
  GETALL_DENTIST_TENANT: "/getalldentists/:tenant_id",
  GET_DENTIST_TENANT: "/getdentist_tenant/:dentist_id/:tenant_id",
  GET_DENTIST_TENANT_CLINIC:
    "/getalldentist_tenant_clinic/:tenant_id/:clinic_id",
  UPDATE_DENTIST_TENANT: "/updatedentist/:dentist_id/:tenant_id",
  DELETE_DENTIST_TENANT: "/deletedentist/:dentist_id/:tenant_id",

  ADD_PATIENT: "/addpatient",
  GETALL_PATIENT_TENANT: "/getallpatients/:tenant_id",
  GETALL_PATIENT_TENANT_CLINIC: "/getallpatients/:tenant_id/:clinic_id",
  GETALL_PATIENT_TENANT_CLINIC_DENTIST: "/getallpatientsdentist/:tenant_id/:clinic_id/:dentist_id",
  GET_PATIENT_TENANT: "/getpatient/:patient_id/:tenant_id",
  UPDATE_PATIENT_TENANT: "/updatepatient/:patient_id/:tenant_id",
  DELETE_PATIENT_TENANT: "/deletepatient/:patient_id/:tenant_id",

  ADD_APPOINTMENT: "/addappointment",
  GETALL_APPOINTMENT_TENANT: "/getallappointments/:tenant_id",
  GETALL_APPOINTMENT_TENANT_CLINIC: "/getallappointments/:tenant_id/:clinic_id",
  GETALL_APPOINTMENTS_TENANT_CLINIC_DENTIST:
    "/getallappointments_dentist/:tenant_id/:clinic_id/:dentist_id",
  GET_APPOINTMENT_TENANT: "/getappointment/:appointment_id/:tenant_id",
  UPDATE_APPOINTMENT_TENANT: "/updateappointment/:appointment_id/:tenant_id",
  DELETE_APPOINTMENT_TENANT: "/deleteappointment/:appointment_id/:tenant_id",
  //fetch some specific data
  GETALL_APPOINTMENT_TENANT_CLINIC_DENTIST: 
    "/getallappointments/:tenant_id/:clinic_id/:dentist_id",
  GETALL_APPOINTMENT_WITHDETAILS_TENANT_CLINIC: 
    "/getallappointments_withdetails/:tenant_id/:clinic_id",
  GETALL_APPOINTMENT_TENANT_DENTIST:
    "/getallappointments_dentistid/:tenant_id/:dentist_id",
  GETALL_APPOINTMENT_TENANT_PATIENTID:
    "/getallappointments_patientid/:tenant_id/:patient_id",

  //appointment show by patient
  GETALL_APPOINTMENT_TENANT_PATIENT:
    "/getallappointmentsbypatient/:tenant_id/:patient_id",
    
  GET_APPOINTMENT_MONTHLY_SUMMARY:
    "/getallappointments/monthlysummary/:tenant_id/:clinic_id/:dentist_id",
  GET_APPOINTMENT_MONTHLY_SUMMARY_CLINIC:
    "/getallappointments_monthly_clinic/:tenant_id/:clinic_id",
  GETALL_PATIENT_VISITEDETAILS:
    "/getallvisitdetails/:tenant_id/:clinic_id/:patient_id",
  UPDATE_APPOINTMENT_RATING_FEEDBACK:
    "/submitfeedback/:tenant_id/:appointment_id",
  UPDATE_APPOINTMENT_FEEDBACK_DISPLAY:
    "/feedbackdisplay/:tenant_id/:appointment_id",
  UPDATE_APPOINTMENT_STATUS:
    "/updateappointment_status/:appointment_id/:tenant_id/:clinic_id/",
  // UPDATE_APPOINTMENT_SCHEDULE_CANCELED:
  //   "/updateappointment_cancelstatus/:appointment_id/:tenant_id/:clinic_id/",
  GETALL_APPOINTMENT_ROOMID_PATIENT:
    "/getallroomidpatient/:tenant_id/:patient_id",
  GETALL_APPOINTMENT_ROOMID_DENTIST:
    "/getallroomiddentist/:tenant_id/:clinic_id/:dentist_id",
  GET_ROOMID_APPOINTMENTID: "/getroomidappointment/:tenant_id/:appointment_id",

  ADD_TREATMENT: "/addtreatment",
  GETALL_TREATMENT_TENANT: "/getalltreatments/:tenant_id",
  GETALL_TREATMENT_TENANT_CLIENT_APPOINTEMENT:
    "/getalltreatments/:tenant_id/:clinic_id/:appointment_id",
  GETALL_TREATMENT_TENANT_DENTIST:
    "/getalltreatments_dentistid/:tenant_id/:dentist_id",
  GETALL_TREATMENT_TENANT_PATIENT:
    "/getalltreatments_patientid/:tenant_id/:patient_id",
  GETALL_TREATMENT_TENANT_CLINIC_DENTIST_APPOINTEMENT:
    "/getalltreatments/:tenant_id/:clinic_id/:dentist_id/:appointment_id",
  GET_TREATMENT_TENANT: "/gettreatment/:treatment_id/:tenant_id",
  UPDATE_TREATMENT_TENANT: "/updatetreatment/:treatment_id/:tenant_id",
  DELETE_TREATMENT_TENANT: "/deletetreatment/:treatment_id/:tenant_id",
  //use query role and user-id 
  GETALL_TREATMENT_FOLLOWUP_NOTIFY:
    "/getallfollowup/:tenant_id/:clinic_id",

  ADD_PRESCRIPTION: "/addprescription",
  GETALL_PRESCRIPTION_TENANT: "/getallprescriptions/:tenant_id",
  GET_PRESCRIPTION_TENANT: "/getprescription/:prescription_id/:tenant_id",
  GETALL_PRESCRIPTION_TENANT_CLINIC_TREATMENT:
    "/getallprescriptions/:tenant_id/:clinic_id/:treatment_id",
  GETALL_PRESCRIPTION_TENANT_CLINIC_APPOINTMENT:
    "/getallprescriptions_appointment/:tenant_id/:clinic_id/:appointment_id",
  GETALL_PRESCRIPTION_TENANT_CLINIC_DENTIST_TREATMENT:
    "/getallprescriptions/:tenant_id/:clinic_id/:dentist_id/:treatment_id",
  GETALL_PRESCRIPTION_TENANT_DENTIST:
    "/getallprescriptions_dentistid/:tenant_id/:dentist_id",
  GETALL_PRESCRIPTION_TENANT_PATIENT:
    "/getallprescriptions_patientid/:tenant_id/:patient_id",
  UPDATE_PRESCRIPTION_TENANT: "/updateprescription/:prescription_id/:tenant_id",
  DELETE_PRESCRIPTION_TENANT: "/deleteprescription/:prescription_id/:tenant_id",

  ADD_STATUS_TYPE: "/addstatustype",
  GETALL_STATUS_TYPE: "/getallstatustype",
  GET_STATUS_TYPE: "/getstatustype/:statustype_id",
  UPDATE_STATUS_TYPE: "/updatestatustype/:statustype_id",
  DELETE_STATUS_TYPE: "/deletestatustype/:statustype_id",

  ADD_STATUS_TYPE_SUB: "/addstatustypesub/:status_type",
  GETALL_STATUS_TYPE_SUB_TENANT: "/getallstatustypesub/:tenant_id",
  GET_STATUS_TYPE_SUB: "/getstatustypesub/:status_type_sub_id/:tenant_id",
  GET_STATUS_TYPE_SUB_STATUS_TYPE_ID:
    "/getstatustypesub_statustypeid/:status_type_id/:tenant_id",
  GET_STATUS_TYPE_SUB_STATUS_TYPE:
    "/getstatustypesub_statustype/:status_type/:tenant_id",
  UPDATE_STATUS_TYPE_SUB: "/updatestatustypesub/:status_type_sub_id/:tenant_id",
  DELETE_STATUS_TYPE_SUB_TENANT:
    "/deletestatustypesub/:status_type_sub_id/:tenant_id",

  ADD_ASSET: "/addasset",
  GETALL_ASSET_TENANT: "/getallassets/:tenant_id",
  GETALL_ASSET_TENANT_CLINIC: "/getallassets/:tenant_id/:clinic_id",
  GET_ASSET_TENANT: "/getasset/:asset_id/:tenant_id",
  UPDATE_ASSET_TENANT: "/updateasset/:asset_id/:tenant_id",
  DELETE_ASSET_TENANT: "/deleteasset/:asset_id/:tenant_id",
  GETALL_ASSET_REPORT_TENANT_CLINIC: "/getallassets/:tenant_id/:clinic_id",
  GET_EXPENSE: "/getexpense/:expense_id",

  ADD_EXPENSE: "/addexpense",
  GETALL_EXPENSE_TENANT: "/getallexpenses/:tenant_id",
  GETALL_EXPENSE_TENANT_CLINIC: "/getallexpenses/:tenant_id/:clinic_id",
  GETALL_EXPENSE_REPORT_TENANT_CLINIC: "/getallexpenses/:tenant_id/:clinic_id",
  GET_EXPENSE_TENANT: "/getexpense/:expense_id/:tenant_id",
  UPDATE_EXPENSE_TENANT: "/updateexpense/:expense_id/:tenant_id",
  DELETE_EXPENSE_TENANT: "/deleteexpense/:expense_id/:tenant_id",

  ADD_SUPPLIER: "/addsupplier",
  GETALL_SUPPLIER_TENANT_CLINIC: "/getallsuppliers/:tenant_id/:clinic_id",
  GETALL_SUPPLIER_TENANT: "/getallsuppliers/:tenant_id",
  GET_SUPPLIER_TENANT: "/getsupplier/:supplier_id/:tenant_id",
  UPDATE_SUPPLIER_TENANT: "/updatesupplier/:supplier_id/:tenant_id",
  DELETE_SUPPLIER_TENANT: "/deletesupplier/:supplier_id/:tenant_id",

  ADD_SUPPLIER_PRODUCTS: "/addsupplierproduct",
  GETALL_SUPPLIER_PRODUCTS_TENANT: "/getallsupplierproducts/:tenant_id",
  GETALL_SUPPLIER_PRODUCTS_TENANT_SUPPLIER:
    "/getallsupplierproducts/:tenant_id/:supplier_id",
  GET_SUPPLIER_PRODUCTS_TENANT:
    "/getsupplierproduct/:supplier_product_id/:tenant_id",
  UPDATE_SUPPLIER_PRODUCTS_TENANT:
    "/updatesupplierproduct/:supplier_product_id/:tenant_id",
  DELETE_SUPPLIER_PRODUCTS_TENANT:
    "/deletesupplierproduct/:supplier_product_id/:tenant_id",

  ADD_SUPPLIER_PAYMENTS: "/addsupplierpayment",
  GETALL_SUPPLIER_PAYMENTS_TENANT: "/getallsupplierpayments/:tenant_id",
  GETALL_SUPPLIER_PAYMENTS_TENANT_SUPPLIER:
    "/getallsupplierpayments/:tenant_id/:supplier_id",
  GET_SUPPLIER_PAYMENTS_TENANT_PURCHASEORDER:
    "/getsupplierpaymentbypurhaseorder/:purchase_order_id/:tenant_id",
  GET_SUPPLIER_PAYMENTS_TENANT:
    "/getsupplierpayment/:supplier_payment_id/:tenant_id",
  UPDATE_SUPPLIER_PAYMENTS_TENANT:
    "/updatesupplierpayment/:supplier_payment_id/:tenant_id",
  DELETE_SUPPLIER_PAYMENTS_TENANT:
    "/deletesupplierpayment/:supplier_payment_id/:tenant_id",

  ADD_SUPPLIER_REVIEWS: "/addsupplierreview",
  GETALL_SUPPLIER_REVIEWS_TENANT: "/getallsupplierreviews/:tenant_id",
  GETALL_SUPPLIER_REVIEWS_TENANT_SUPPLIER:
    "/getallsupplierreviews/:tenant_id/:supplier_id",
  GET_SUPPLIER_REVIEWS_TENANT:
    "/getsupplierreview/:supplier_review_id/:tenant_id",
  UPDATE_SUPPLIER_REVIEWS_TENANT:
    "/updatesupplierreview/:supplier_review_id/:tenant_id",
  DELETE_SUPPLIER_REVIEWS_TENANT:
    "/deletesupplierreview/:supplier_review_id/:tenant_id",

  ADD_PURCHASE_ORDER: "/addpurchaseorder",
  GETALL_PURCHASE_ORDER_TENANT: "/getallpurchaseorders/:tenant_id",
  GETALL_PURCHASE_ORDER_TENANT_CLINIC: "/getallpurchaseordersclinic/:tenant_id/:clinic_id",
  GETALL_PURCHASE_ORDER_TENANT_SUPPLIER:
    "/getallpurchaseorders/:tenant_id/:supplier_id",
  GET_PURCHASE_ORDER_TENANT: "/getpurchaseorder/:purchase_order_id/:tenant_id",
  UPDATE_PURCHASE_ORDER_TENANT:
    "/updatepurchaseorder/:purchase_order_id/:tenant_id",
  UPDATE_PURCHASE_ORDER_STATUS_CLINIC:
    "/updatepurchaseorderstatus/:purchase_order_id/:tenant_id/:clinic_id",
  DELETE_PURCHASE_ORDER_TENANT:
    "/deletepurchaseorder/:purchase_order_id/:tenant_id",

  ADD_RECEPTION: "/addreceptionist",
  GETALL_RECEPTION_TENANT: "/getallreceptionists/:tenant_id",
  GETALL_RECEPTION_TENANT_CLINIC: "/getallreceptionists/:tenant_id/:clinic_id",
  GET_RECEPTION_TENANT: "/getreceptionist/:reception_id/:tenant_id",
  UPDATE_RECEPTION_TENANT: "/updatereceptionist/:reception_id/:tenant_id",
  DELETE_RECEPTION_TENANT: "/deletereceptionist/:reception_id/:tenant_id",

  ADD_REMINDER: "/addreminder",
  GETALL_REMINDER_TENANT: "/getallreminders/:tenant_id",
  GETALL_REMINDER_TENANT_CLINIC: "/getallreminders/:tenant_id/:clinic_id",
  GETALL_REMINDER_TENANT_CLINIC_DENTIST: "/getallreminders/:tenant_id/:clinic_id/:dentist_id",
  GET_REMINDER_TENANT: "/getreminder/:reminder_id/:tenant_id",
  GET_REMINDER_SCHEDULE:
    "/getreminder/:tenant_id/:clinic_id/:dentist_id/:reminder_id",
  GET_REMINDER_DENTIST_TYPE:
    "/getreminderbytype/:tenant_id/:clinic_id/:dentist_id",
  GET_REMINDER_SCHEDULE_MONTHLY:
    "/getreminder/:tenant_id/:clinic_id/:dentist_id",
  UPDATE_REMINDER_TENANT: "/updatereminder/:reminder_id/:tenant_id",
  DELETE_REMINDER_TENANT: "/deletereminder/:reminder_id/:tenant_id",
  GETALL_NOTIFY_DENTIST:
    "/getallnoticationdentist/:tenant_id/:clinic_id/:dentist_id",
  GETALL_NOTIFY_PATIENT:
    "/getallnoticationpatient/:tenant_id/:clinic_id/:patient_id",
  GETALL_REMINDER_NOTIFY_DENTIST:
    "/getallremindernoticationdentist/:tenant_id/:clinic_id/:dentist_id",

  ADD_PAYMENT: "/addpayment",
  GETALL_PAYMENT_TENANT: "/getallpayments/:tenant_id",
  GET_PAYEMENT_TENANT_APPOINTMENT: "/getpayment/:tenant_id/:appointment_id",
  GET_PAYMENT: "/getpayment/:payment_id",
  UPDATE_PAYMENT_TENANT: "/updatepayment/:payment_id/:tenant_id",
  DELETE_PAYMENT_TENANT: "/deletepayment/:payment_id/:tenant_id",

  ADD_APPOINTMENT_RESCHEDULES: "/addappointment_reschedules",
  GETALL_APPOINTMENT_RESCHEDULES_TENANT:
    "/getallappointment_reschedules/:tenant_id",
  GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC:
    "/getallappointment_rescheduless/:tenant_id/:clinic_id",
  GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC_DENTIST:
    "/getallappointment_reschedules/:tenant_id/:clinic_id/:dentist_id",
  GET_APPOINTMENT_RESCHEDULES:
    "/getappointment_reschedules/:appointment_reschedules_id",
  UPDATE_APPOINTMENT_RESCHEDULES_TENANT:
    "/updateappointment_reschedules/:appointment_reschedules_id/:tenant_id",
  DELETE_APPOINTMENT_RESCHEDULES_TENANT:
    "/deleteappointment_reschedules/:appointment_reschedules_id/:tenant_id",

  ADD_NOTIFICATION: "/addnotification",
  GETALL_NOTIFICATION_TENANT: "/getallnotifications/:tenant_id",
  GET_NOTIFICATION_TENANT: "/getnotification/:notification_id/:tenant_id",
  GET_NOTIFICATION_TENANT_RECEIVER: "/getnotificationreceiver/:tenant_id",
  UPDATE_NOTIFICATION_TENANT: "/updatenotification/:notification_id/:tenant_id",
  UPDATE_NOTIFICATION_RECIPIENTS_STATUS_TENANT: "/updatenotificationrecipients/:notification_recipient_id",
  DELETE_NOTIFICATION_TENANT: "/deletenotification/:notification_id/:tenant_id",

  
  ADD_TOOTHDETAILS: "/addtoothdetails",
  GETALL_TOOTHDETAILS_TENANT: "/getalltoothdetails/:tenant_id",
  GETALL_TOOTHDETAILS_TENANT_CLINIC_DENTIST_PATIENT: "/getalltoothdetails/:tenant_id/:clinic_id/:dentist_id/:patient_id",
  GETALL_TOOTHDETAILS_TENANT_CLINIC_PATIENT: "/getalltoothdetails/:tenant_id/:clinic_id/:patient_id",
  GET_TOOTHDETAILS_TENANT: "/gettoothdetails/:toothdetails_id/:tenant_id",
  UPDATE_TOOTHDETAILS_TENANT: "/updatetoothdetails/:toothdetails_id/:tenant_id",
  DELETE_TOOTHDETAILS_TENANT: "/deletetoothdetails/:toothdetails_id/:tenant_id",
  


  //dashboard Routes

  GET_APPOINTMENT_SUMMARY_PERIOD:
    "/getallappointments/periodsummary/:tenant_id/:clinic_id",

  GET_APPOINTMENT_SUMMARY_PERIOD_DENTIST:
    "/getallappointments/dentistperiodsummary/:tenant_id/:clinic_id/:dentist_id",

  GET_APPOINTMENT_SUMMARY_CHART_CLINIC:
    "/getallappointments/summarychartclinic/:tenant_id/:clinic_id",

  GET_APPOINTMENT_SUMMARY_CHART_DENTIST:
    "/getallappointments/summarychartdentist/:tenant_id/:clinic_id/:dentist_id",

  GET_PATIENT_SUMMARY_DENTIST:
    "/getallpatients/patientsummarydentist/:tenant_id/:clinic_id/:dentist_id",

  GET_PATIENT_SUMMARY_CLINIC:
    "/getallpatients/patientsummaryclinic/:tenant_id/:clinic_id",

  GET_NEW_PATIENT_SUMMARY_CLINIC:
    "/getallpatients/newpatientsummaryclinic/:tenant_id/:clinic_id",

  GET_NEW_PATIENT_SUMMARY_DENTIST:
    "/getallpatients/newpatientsummarydentist/:tenant_id/:clinic_id/:dentist_id",

  GET_AGE_GENDER_SUMMARY_DENTIST:
    "/getallpatients/agegendersummarydentist/:tenant_id/:clinic_id/:dentist_id",

  GET_AGE_GENDER_SUMMARY_CLINIC:
    "/getallpatients/agegendersummaryclinic/:tenant_id/:clinic_id",

  GET_CLINIC_FINANACE_SUMMARY_CLINIC:
    "/getallclinics/financesummary/:tenant_id/:clinic_id",

  GET_CLINIC_FINANACE_SUMMARY_DENTIST:
    "/getallclinics/financesummary/:tenant_id/:clinic_id/:dentist_id",

  GET_TOOTH_DETAILS_CLINIC: "/toothdetails/:tenant_id/:clinic_id",
  GET_TOOTH_DETAILS_DENTIST: "/toothdetails/:tenant_id/:clinic_id/:dentist_id",

  ADD_USER_ACTIVITY_LOGIN: "/adduseractivity",
  ADD_USER_ACTIVITY_LOGOUT: "/updateuseractivity/:useractivity_id",

  ADD_LOGIN_HISTORY_LOGIN: "/addloginhistory",
  ADD_LOGIN_HISTORY_LOGOUT: "/updateloginhistory/:loginhistory_id/:tenant_id",
};

// GET /api/tenant?page=2&limit=10
