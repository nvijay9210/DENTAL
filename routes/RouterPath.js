module.exports={
    ADD_TENANT:'/addtenant',
    GETALL_TENTANT:'/getalltenants',
    GET_TENANT:'/gettenant/:tenant_id',
    UPDATE_TENANT:'/updatetenant/:tenant_id',
    DELETE_TENANT:'/deletetenant/:tenant_id',

    ADD_CLINIC:'/addclinic',
    GETALL_CLINIC_TENANT:'/getallclinics/:tenant_id',
    GET_CLINIC_TENANT:'/getclinic/:clinic_id/:tenant_id',
    UPDATE_CLINIC_TENANT:'/updateclinic/:clinic_id/:tenant_id',
    DELETE_CLINIC_TENANT:'/deleteclinic/:clinic_id/:tenant_id',

    ADD_DENTIST:'/adddentist',
    GETALL_DENTIST_TENANT:'/getalldentists/:tenant_id',
    GET_DENTIST_TENANT:'/getdentist/:dentist_id/:tenant_id',
    GET_DENTIST_TENANT_CLINIC:'/getdentist/:tenant_id/:clinic_id',
    UPDATE_DENTIST_TENANT:'/updatedentist/:dentist_id/:tenant_id',
    DELETE_DENTIST_TENANT:'/deletedentist/:dentist_id/:tenant_id',

    ADD_PATIENT:'/addpatient',
    GETALL_PATIENT_TENANT:'/getallpatients/:tenant_id',
    GET_PATIENT_TENANT:'/getpatient/:patient_id/:tenant_id',
    UPDATE_PATIENT_TENANT:'/updatepatient/:patient_id/:tenant_id',
    DELETE_PATIENT_TENANT:'/deletepatient/:patient_id/:tenant_id',

    ADD_APPOINTMENT:'/addappointment',
    GETALL_APPOINTMENT_TENANT:'/getallappointments/:tenant_id',
    GET_APPOINTMENT_TENANT:'/getappointment/:appointment_id/:tenant_id',
    UPDATE_APPOINTMENT_TENANT:'/updateappointment/:appointment_id/:tenant_id',
    DELETE_APPOINTMENT_TENANT:'/deleteappointment/:appointment_id/:tenant_id',
    GETALL_APPOINTMENT_TENANT_CLINIC_DENTIST:'/getallappointments/:tenant_id/:clinic_id/:dentist_id',
    GET_APPOINTMENT_MONTHLY_SUMMARY:'/getallappointments/monthlysummary/:tenant_id/:clinic_id/:dentist_id',
    GETALL_PATIENT_VISITEDETAILS:'/getallvisitdetails/:tenant_id/:clinic_id/:patient_id',

    ADD_TREATMENT:'/addtreatment',
    GETALL_TREATMENT_TENANT:'/getalltreatments/:tenant_id',
    GET_TREATMENT_TENANT:'/gettreatment/:treatment_id/:tenant_id',
    UPDATE_TREATMENT_TENANT:'/updatetreatment/:treatment_id/:tenant_id',
    DELETE_TREATMENT_TENANT:'/deletetreatment/:treatment_id/:tenant_id',

    ADD_PRESCRIPTION:'/addprescription',
    GETALL_PRESCRIPTION_TENANT:'/getallprescriptions/:tenant_id',
    GET_PRESCRIPTION_TENANT:'/getprescription/:prescription_id/:tenant_id',
    UPDATE_PRESCRIPTION_TENANT:'/updateprescription/:prescription_id/:tenant_id',
    DELETE_PRESCRIPTION_TENANT:'/deleteprescription/:prescription_id/:tenant_id',
}

// GET /api/tenant?page=2&limit=10