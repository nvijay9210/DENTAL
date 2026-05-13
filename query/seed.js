// seed.js
// Run with: node seed.js
// Make sure to configure your database connection details below.

const mysql = require('mysql2/promise');

// Database configuration - UPDATE THESE VALUES TO MATCH YOUR SETUP
const DB_CONFIG = {
    host: '127.0.0.1',
    user: 'root',           // Your database username
    password: 'root',           // Your database password
    database: 'dental',     // Your database name
    port: 3306,
    multipleStatements: true
};

// Seed data
const TENANTS = [
    {
        tenant_id: 1,
        tenant_name: 'Apollo',
        tenant_domain: 'aplollo.com',
        created_time: '2026-04-02 10:27:07',
        created_by: 'ADMIN',
        updated_time: null,
        updated_by: null,
        tenant_app_name: null,
        tenant_app_logo: null,
        tenant_app_font: null,
        tenant_app_themes: null
    }
];

const CLINICS = [
    {
        clinic_id: 1,
        tenant_id: 1,
        clinic_name: 'APOLLO',
        email: 'apollo@gmail.com',
        phone_number: '919888989889',
        alternate_phone_number: null,
        branch: null,
        website: null,
        address: '["ClinicA,Forest road"]',
        city: 'Theni',
        landmark: null,
        state: 'Tamil Nadu',
        country: 'India',
        pin_code: '625531',
        license_number: 'AP1234OL56',
        gst_number: null,
        pan_number: null,
        clinic_logo: 'uploads/tenant_1/Clinic/photo/WhatsApp Image 2025-12-23 at 2.12.49 PM (2)_1775127824309_7327.jpeg',
        established_year: 2000,
        total_doctors: 0,
        total_patients: 1,
        seating_capacity: 10,
        number_of_assistants: 5,
        available_services: '["Root Canal Therapy"]',
        operating_hours: '{"monday":{"active":"true","timeSlots":[{"start":"09:00","end":"12:00"}]},"tuesday":{"active":"true","timeSlots":[{"start":"08:30","end":"11:30"}]},"wednesday":{"active":"true","timeSlots":[{"start":"09:00","end":"12:00"}]},"thursday":{"active":"true","timeSlots":[{"start":"10:00","end":"13:00"}]},"friday":{"active":"true","timeSlots":[{"start":"09:30","end":"12:30"}]},"saturday":{"active":"false"},"sunday":{"active":"false"}}',
        insurance_supported: 1,
        ratings: 0.00,
        reviews_count: 0,
        emergency_support: 1,
        teleconsultation_supported: 1,
        parking_availability: 1,
        pharmacy: 1,
        wifi: 1,
        clinic_app_font: null,
        clinic_app_themes: null,
        created_by: 'dev',
        created_time: '2026-04-02 11:03:19',
        updated_by: 'dev',
        updated_time: '2026-05-05 07:33:14',
        otp: 1,
        otp_type: 'sms'
    }
];

// All status types from statustype table
const STATUS_TYPES = [
    { status_type_id: 1, status_type: 'specialisation' },
    { status_type_id: 2, status_type: 'designation' },
    { status_type_id: 3, status_type: 'available_services' },
    { status_type_id: 4, status_type: 'alcohol_consumption' },
    { status_type_id: 5, status_type: 'mode_of_payment' },
    { status_type_id: 6, status_type: 'asset_type' },
    { status_type_id: 7, status_type: 'asset_status' },
    { status_type_id: 8, status_type: 'languages_spoken' },
    { status_type_id: 9, status_type: 'tenant_app_font' },
    { status_type_id: 10, status_type: 'treatment_type' },
    { status_type_id: 11, status_type: 'treatment_status' },
    { status_type_id: 12, status_type: 'smoking_status' },
    { status_type_id: 13, status_type: 'disease_type' },
    { status_type_id: 14, status_type: 'currency_code' },
    { status_type_id: 15, status_type: 'appointment_status' },
    { status_type_id: 16, status_type: 'purchase_order_status' },
    { status_type_id: 17, status_type: 'reminder_status' },
    { status_type_id: 18, status_type: 'expense_category' },
    { status_type_id: 19, status_type: 'pre_history' },
    { status_type_id: 20, status_type: 'tax_catalog' },
    { status_type_id: 21, status_type: 'category' },
    { status_type_id: 22, status_type: 'medication' },
    { status_type_id: 23, status_type: 'frequency' },
    { status_type_id: 24, status_type: 'unit' }
];

// All status type sub entries for tenant_id = 1
const STATUS_TYPE_SUBS = [
    // Appointment statuses (status_type_id: 15)
    { status_type_sub_id: 1, tenant_id: 1, status_type_id: 15, status_type_sub: 'pending', status_type_sub_ref: 'pending' },
    { status_type_sub_id: 2, tenant_id: 1, status_type_id: 15, status_type_sub: 'confirmed', status_type_sub_ref: 'confirmed' },
    { status_type_sub_id: 3, tenant_id: 1, status_type_id: 15, status_type_sub: 'checkedin', status_type_sub_ref: 'checked_in' },
    { status_type_sub_id: 4, tenant_id: 1, status_type_id: 15, status_type_sub: 'inprogress', status_type_sub_ref: 'in_progress' },
    { status_type_sub_id: 5, tenant_id: 1, status_type_id: 15, status_type_sub: 'completed', status_type_sub_ref: 'completed' },
    { status_type_sub_id: 6, tenant_id: 1, status_type_id: 15, status_type_sub: 'cancelled', status_type_sub_ref: 'cancelled' },
    { status_type_sub_id: 7, tenant_id: 1, status_type_id: 15, status_type_sub: 'clinic_cancelled', status_type_sub_ref: 'clinic_cancelled' },
    { status_type_sub_id: 8, tenant_id: 1, status_type_id: 15, status_type_sub: 'noshow', status_type_sub_ref: 'no_show' },
    { status_type_sub_id: 9, tenant_id: 1, status_type_id: 15, status_type_sub: 'rescheduled', status_type_sub_ref: 'rescheduled' },
    { status_type_sub_id: 10, tenant_id: 1, status_type_id: 15, status_type_sub: 'followup', status_type_sub_ref: 'follow_up' },
    { status_type_sub_id: 11, tenant_id: 1, status_type_id: 15, status_type_sub: 'rejected', status_type_sub_ref: 'rejected' },
    { status_type_sub_id: 12, tenant_id: 1, status_type_id: 15, status_type_sub: 'expired', status_type_sub_ref: 'expired' },
    { status_type_sub_id: 13, tenant_id: 1, status_type_id: 15, status_type_sub: 'payment_pending', status_type_sub_ref: 'payment_pending' },
    { status_type_sub_id: 14, tenant_id: 1, status_type_id: 15, status_type_sub: 'paid', status_type_sub_ref: 'paid' },
    
    // Purchase order statuses (status_type_id: 16)
    { status_type_sub_id: 15, tenant_id: 1, status_type_id: 16, status_type_sub: 'pending', status_type_sub_ref: 'pending' },
    { status_type_sub_id: 16, tenant_id: 1, status_type_id: 16, status_type_sub: 'confirmed', status_type_sub_ref: 'confirmed' },
    { status_type_sub_id: 17, tenant_id: 1, status_type_id: 16, status_type_sub: 'shipped', status_type_sub_ref: 'shipped' },
    { status_type_sub_id: 18, tenant_id: 1, status_type_id: 16, status_type_sub: 'delivered', status_type_sub_ref: 'delivered' },
    { status_type_sub_id: 19, tenant_id: 1, status_type_id: 16, status_type_sub: 'cancelled', status_type_sub_ref: 'cancelled' },
    
    // Reminder statuses (status_type_id: 17)
    { status_type_sub_id: 20, tenant_id: 1, status_type_id: 17, status_type_sub: 'pending', status_type_sub_ref: 'pending' },
    { status_type_sub_id: 21, tenant_id: 1, status_type_id: 17, status_type_sub: 'completed', status_type_sub_ref: 'completed' },
    { status_type_sub_id: 22, tenant_id: 1, status_type_id: 17, status_type_sub: 'dismissed', status_type_sub_ref: 'dismissed' },
    { status_type_sub_id: 23, tenant_id: 1, status_type_id: 17, status_type_sub: 'overdue', status_type_sub_ref: 'overdue' },
    { status_type_sub_id: 24, tenant_id: 1, status_type_id: 17, status_type_sub: 'in_progress', status_type_sub_ref: 'in_progress' },
    
    // Currency codes (status_type_id: 14)
    { status_type_sub_id: 25, tenant_id: 1, status_type_id: 14, status_type_sub: 'Afghanistan', status_type_sub_ref: 'AFN ؋' },
    { status_type_sub_id: 26, tenant_id: 1, status_type_id: 14, status_type_sub: 'Albania', status_type_sub_ref: 'ALL L' },
    { status_type_sub_id: 27, tenant_id: 1, status_type_id: 14, status_type_sub: 'Algeria', status_type_sub_ref: 'DZD جد' },
    { status_type_sub_id: 28, tenant_id: 1, status_type_id: 14, status_type_sub: 'Andorra', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 29, tenant_id: 1, status_type_id: 14, status_type_sub: 'Angola', status_type_sub_ref: 'AOA Kz' },
    { status_type_sub_id: 30, tenant_id: 1, status_type_id: 14, status_type_sub: 'Argentina', status_type_sub_ref: 'ARS $' },
    { status_type_sub_id: 31, tenant_id: 1, status_type_id: 14, status_type_sub: 'Armenia', status_type_sub_ref: 'AMD ' },
    { status_type_sub_id: 32, tenant_id: 1, status_type_id: 14, status_type_sub: 'Australia', status_type_sub_ref: 'AUD A$' },
    { status_type_sub_id: 33, tenant_id: 1, status_type_id: 14, status_type_sub: 'Austria', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 34, tenant_id: 1, status_type_id: 14, status_type_sub: 'Azerbaijan', status_type_sub_ref: 'AZN ₼' },
    { status_type_sub_id: 35, tenant_id: 1, status_type_id: 14, status_type_sub: 'Bahamas', status_type_sub_ref: 'BSD B$' },
    { status_type_sub_id: 36, tenant_id: 1, status_type_id: 14, status_type_sub: 'Bahrain', status_type_sub_ref: 'BHD .ب.د' },
    { status_type_sub_id: 37, tenant_id: 1, status_type_id: 14, status_type_sub: 'Bangladesh', status_type_sub_ref: 'BDT ৳' },
    { status_type_sub_id: 38, tenant_id: 1, status_type_id: 14, status_type_sub: 'Barbados', status_type_sub_ref: 'BBD Bds$' },
    { status_type_sub_id: 39, tenant_id: 1, status_type_id: 14, status_type_sub: 'Belarus', status_type_sub_ref: 'BYN Br' },
    { status_type_sub_id: 40, tenant_id: 1, status_type_id: 14, status_type_sub: 'Belgium', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 41, tenant_id: 1, status_type_id: 14, status_type_sub: 'Belize', status_type_sub_ref: 'BZD BZ$' },
    { status_type_sub_id: 42, tenant_id: 1, status_type_id: 14, status_type_sub: 'Benin', status_type_sub_ref: 'XOF CFA' },
    { status_type_sub_id: 43, tenant_id: 1, status_type_id: 14, status_type_sub: 'Bhutan', status_type_sub_ref: 'BTN Nu.' },
    { status_type_sub_id: 44, tenant_id: 1, status_type_id: 14, status_type_sub: 'Bolivia', status_type_sub_ref: 'BOB Bs.' },
    { status_type_sub_id: 45, tenant_id: 1, status_type_id: 14, status_type_sub: 'Bosnia & Herzegovina', status_type_sub_ref: 'BAM KM' },
    { status_type_sub_id: 46, tenant_id: 1, status_type_id: 14, status_type_sub: 'Botswana', status_type_sub_ref: 'BWP P' },
    { status_type_sub_id: 47, tenant_id: 1, status_type_id: 14, status_type_sub: 'Brazil', status_type_sub_ref: 'BRL R$' },
    { status_type_sub_id: 48, tenant_id: 1, status_type_id: 14, status_type_sub: 'Brunei', status_type_sub_ref: 'BND B$' },
    { status_type_sub_id: 49, tenant_id: 1, status_type_id: 14, status_type_sub: 'Bulgaria', status_type_sub_ref: 'BGN лв' },
    { status_type_sub_id: 50, tenant_id: 1, status_type_id: 14, status_type_sub: 'Burkina Faso', status_type_sub_ref: 'XOF CFA' },
    { status_type_sub_id: 51, tenant_id: 1, status_type_id: 14, status_type_sub: 'Burundi', status_type_sub_ref: 'BIF FBu' },
    { status_type_sub_id: 52, tenant_id: 1, status_type_id: 14, status_type_sub: 'Cambodia', status_type_sub_ref: 'KHR ៛' },
    { status_type_sub_id: 53, tenant_id: 1, status_type_id: 14, status_type_sub: 'Cameroon', status_type_sub_ref: 'XAF FCFA' },
    { status_type_sub_id: 54, tenant_id: 1, status_type_id: 14, status_type_sub: 'Canada', status_type_sub_ref: 'CAD C$' },
    { status_type_sub_id: 55, tenant_id: 1, status_type_id: 14, status_type_sub: 'Cape Verde', status_type_sub_ref: 'CVE $' },
    { status_type_sub_id: 56, tenant_id: 1, status_type_id: 14, status_type_sub: 'Central African Republic', status_type_sub_ref: 'XAF FCFA' },
    { status_type_sub_id: 57, tenant_id: 1, status_type_id: 14, status_type_sub: 'Chad', status_type_sub_ref: 'XAF FCFA' },
    { status_type_sub_id: 58, tenant_id: 1, status_type_id: 14, status_type_sub: 'Chile', status_type_sub_ref: 'CLP $' },
    { status_type_sub_id: 59, tenant_id: 1, status_type_id: 14, status_type_sub: 'China', status_type_sub_ref: 'CNY ¥' },
    { status_type_sub_id: 60, tenant_id: 1, status_type_id: 14, status_type_sub: 'Colombia', status_type_sub_ref: 'COP $' },
    { status_type_sub_id: 61, tenant_id: 1, status_type_id: 14, status_type_sub: 'Comoros', status_type_sub_ref: 'KMF CF' },
    { status_type_sub_id: 62, tenant_id: 1, status_type_id: 14, status_type_sub: 'Congo (DRC)', status_type_sub_ref: 'CDF FC' },
    { status_type_sub_id: 63, tenant_id: 1, status_type_id: 14, status_type_sub: 'Costa Rica', status_type_sub_ref: 'CRC ₡' },
    { status_type_sub_id: 64, tenant_id: 1, status_type_id: 14, status_type_sub: 'Croatia', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 65, tenant_id: 1, status_type_id: 14, status_type_sub: 'Cuba', status_type_sub_ref: 'CUP $' },
    { status_type_sub_id: 66, tenant_id: 1, status_type_id: 14, status_type_sub: 'Cyprus', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 67, tenant_id: 1, status_type_id: 14, status_type_sub: 'Czech Republic', status_type_sub_ref: 'CZK Kč' },
    { status_type_sub_id: 68, tenant_id: 1, status_type_id: 14, status_type_sub: 'Denmark', status_type_sub_ref: 'DKK kr' },
    { status_type_sub_id: 69, tenant_id: 1, status_type_id: 14, status_type_sub: 'Djibouti', status_type_sub_ref: 'DJF Fdj' },
    { status_type_sub_id: 70, tenant_id: 1, status_type_id: 14, status_type_sub: 'Dominican Republic', status_type_sub_ref: 'DOP RD$' },
    { status_type_sub_id: 71, tenant_id: 1, status_type_id: 14, status_type_sub: 'Ecuador', status_type_sub_ref: 'USD $' },
    { status_type_sub_id: 72, tenant_id: 1, status_type_id: 14, status_type_sub: 'Egypt', status_type_sub_ref: 'EGP £' },
    { status_type_sub_id: 73, tenant_id: 1, status_type_id: 14, status_type_sub: 'El Salvador', status_type_sub_ref: 'USD $' },
    { status_type_sub_id: 74, tenant_id: 1, status_type_id: 14, status_type_sub: 'Ethiopia', status_type_sub_ref: 'ETB Br' },
    { status_type_sub_id: 75, tenant_id: 1, status_type_id: 14, status_type_sub: 'Eurozone', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 76, tenant_id: 1, status_type_id: 14, status_type_sub: 'Fiji', status_type_sub_ref: 'FJD FJ$' },
    { status_type_sub_id: 77, tenant_id: 1, status_type_id: 14, status_type_sub: 'Finland', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 78, tenant_id: 1, status_type_id: 14, status_type_sub: 'France', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 79, tenant_id: 1, status_type_id: 14, status_type_sub: 'Gabon', status_type_sub_ref: 'XAF FCFA' },
    { status_type_sub_id: 80, tenant_id: 1, status_type_id: 14, status_type_sub: 'Gambia', status_type_sub_ref: 'GMD D' },
    { status_type_sub_id: 81, tenant_id: 1, status_type_id: 14, status_type_sub: 'Georgia', status_type_sub_ref: 'GEL ₾' },
    { status_type_sub_id: 82, tenant_id: 1, status_type_id: 14, status_type_sub: 'Germany', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 83, tenant_id: 1, status_type_id: 14, status_type_sub: 'Ghana', status_type_sub_ref: 'GHS ₵' },
    { status_type_sub_id: 84, tenant_id: 1, status_type_id: 14, status_type_sub: 'Greece', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 85, tenant_id: 1, status_type_id: 14, status_type_sub: 'Guatemala', status_type_sub_ref: 'GTQ Q' },
    { status_type_sub_id: 86, tenant_id: 1, status_type_id: 14, status_type_sub: 'Guinea', status_type_sub_ref: 'GNF FG' },
    { status_type_sub_id: 87, tenant_id: 1, status_type_id: 14, status_type_sub: 'Honduras', status_type_sub_ref: 'HNL L' },
    { status_type_sub_id: 88, tenant_id: 1, status_type_id: 14, status_type_sub: 'Hong Kong', status_type_sub_ref: 'HKD HK$' },
    { status_type_sub_id: 89, tenant_id: 1, status_type_id: 14, status_type_sub: 'Hungary', status_type_sub_ref: 'HUF Ft' },
    { status_type_sub_id: 90, tenant_id: 1, status_type_id: 14, status_type_sub: 'Iceland', status_type_sub_ref: 'ISK kr' },
    { status_type_sub_id: 91, tenant_id: 1, status_type_id: 14, status_type_sub: 'India', status_type_sub_ref: 'INR ₹' },
    { status_type_sub_id: 92, tenant_id: 1, status_type_id: 14, status_type_sub: 'Indonesia', status_type_sub_ref: 'IDR Rp' },
    { status_type_sub_id: 93, tenant_id: 1, status_type_id: 14, status_type_sub: 'Iran', status_type_sub_ref: 'IRR ﷼' },
    { status_type_sub_id: 94, tenant_id: 1, status_type_id: 14, status_type_sub: 'Iraq', status_type_sub_ref: 'IQD د.ع' },
    { status_type_sub_id: 95, tenant_id: 1, status_type_id: 14, status_type_sub: 'Ireland', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 96, tenant_id: 1, status_type_id: 14, status_type_sub: 'Israel', status_type_sub_ref: 'ILS ₪' },
    { status_type_sub_id: 97, tenant_id: 1, status_type_id: 14, status_type_sub: 'Italy', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 98, tenant_id: 1, status_type_id: 14, status_type_sub: 'Jamaica', status_type_sub_ref: 'JMD J$' },
    { status_type_sub_id: 99, tenant_id: 1, status_type_id: 14, status_type_sub: 'Japan', status_type_sub_ref: 'JPY ¥' },
    { status_type_sub_id: 100, tenant_id: 1, status_type_id: 14, status_type_sub: 'Jordan', status_type_sub_ref: 'JOD ا.د' },
    { status_type_sub_id: 101, tenant_id: 1, status_type_id: 14, status_type_sub: 'Kazakhstan', status_type_sub_ref: 'KZT ₸' },
    { status_type_sub_id: 102, tenant_id: 1, status_type_id: 14, status_type_sub: 'Kenya', status_type_sub_ref: 'KES KSh' },
    { status_type_sub_id: 103, tenant_id: 1, status_type_id: 14, status_type_sub: 'Kuwait', status_type_sub_ref: 'KWD KD' },
    { status_type_sub_id: 104, tenant_id: 1, status_type_id: 14, status_type_sub: 'Kyrgyzstan', status_type_sub_ref: 'KGS лв' },
    { status_type_sub_id: 105, tenant_id: 1, status_type_id: 14, status_type_sub: 'Laos', status_type_sub_ref: 'LAK ₭' },
    { status_type_sub_id: 106, tenant_id: 1, status_type_id: 14, status_type_sub: 'Latvia', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 107, tenant_id: 1, status_type_id: 14, status_type_sub: 'Lebanon', status_type_sub_ref: 'LBP ل.ل' },
    { status_type_sub_id: 108, tenant_id: 1, status_type_id: 14, status_type_sub: 'Lesotho', status_type_sub_ref: 'LSL L' },
    { status_type_sub_id: 109, tenant_id: 1, status_type_id: 14, status_type_sub: 'Liberia', status_type_sub_ref: 'LRD L$' },
    { status_type_sub_id: 110, tenant_id: 1, status_type_id: 14, status_type_sub: 'Libya', status_type_sub_ref: 'LYD د.ل' },
    { status_type_sub_id: 111, tenant_id: 1, status_type_id: 14, status_type_sub: 'Liechtenstein', status_type_sub_ref: 'CHF CHF' },
    { status_type_sub_id: 112, tenant_id: 1, status_type_id: 14, status_type_sub: 'Lithuania', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 113, tenant_id: 1, status_type_id: 14, status_type_sub: 'Luxembourg', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 114, tenant_id: 1, status_type_id: 14, status_type_sub: 'Madagascar', status_type_sub_ref: 'MGA Ar' },
    { status_type_sub_id: 115, tenant_id: 1, status_type_id: 14, status_type_sub: 'Malawi', status_type_sub_ref: 'MWK MK' },
    { status_type_sub_id: 116, tenant_id: 1, status_type_id: 14, status_type_sub: 'Malaysia', status_type_sub_ref: 'MYR RM' },
    { status_type_sub_id: 117, tenant_id: 1, status_type_id: 14, status_type_sub: 'Maldives', status_type_sub_ref: 'MVR Rf' },
    { status_type_sub_id: 118, tenant_id: 1, status_type_id: 14, status_type_sub: 'Mali', status_type_sub_ref: 'XOF CFA' },
    { status_type_sub_id: 119, tenant_id: 1, status_type_id: 14, status_type_sub: 'Malta', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 120, tenant_id: 1, status_type_id: 14, status_type_sub: 'Mauritania', status_type_sub_ref: 'MRU UM' },
    { status_type_sub_id: 121, tenant_id: 1, status_type_id: 14, status_type_sub: 'Mauritius', status_type_sub_ref: 'MUR ₨' },
    { status_type_sub_id: 122, tenant_id: 1, status_type_id: 14, status_type_sub: 'Mexico', status_type_sub_ref: 'MXN $' },
    { status_type_sub_id: 123, tenant_id: 1, status_type_id: 14, status_type_sub: 'Moldova', status_type_sub_ref: 'MDL L' },
    { status_type_sub_id: 124, tenant_id: 1, status_type_id: 14, status_type_sub: 'Monaco', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 125, tenant_id: 1, status_type_id: 14, status_type_sub: 'Mongolia', status_type_sub_ref: 'MNT ₮' },
    { status_type_sub_id: 126, tenant_id: 1, status_type_id: 14, status_type_sub: 'Montenegro', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 127, tenant_id: 1, status_type_id: 14, status_type_sub: 'Morocco', status_type_sub_ref: 'MAD MAD' },
    { status_type_sub_id: 128, tenant_id: 1, status_type_id: 14, status_type_sub: 'Mozambique', status_type_sub_ref: 'MZN MT' },
    { status_type_sub_id: 129, tenant_id: 1, status_type_id: 14, status_type_sub: 'Myanmar', status_type_sub_ref: 'MMK Ks' },
    { status_type_sub_id: 130, tenant_id: 1, status_type_id: 14, status_type_sub: 'Namibia', status_type_sub_ref: 'NAD N$' },
    { status_type_sub_id: 131, tenant_id: 1, status_type_id: 14, status_type_sub: 'Nepal', status_type_sub_ref: 'NPR ₨' },
    { status_type_sub_id: 132, tenant_id: 1, status_type_id: 14, status_type_sub: 'Netherlands', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 133, tenant_id: 1, status_type_id: 14, status_type_sub: 'New Zealand', status_type_sub_ref: 'NZD NZ$' },
    { status_type_sub_id: 134, tenant_id: 1, status_type_id: 14, status_type_sub: 'Nicaragua', status_type_sub_ref: 'NIO C$' },
    { status_type_sub_id: 135, tenant_id: 1, status_type_id: 14, status_type_sub: 'Niger', status_type_sub_ref: 'XOF CFA' },
    { status_type_sub_id: 136, tenant_id: 1, status_type_id: 14, status_type_sub: 'Nigeria', status_type_sub_ref: 'NGN ₦' },
    { status_type_sub_id: 137, tenant_id: 1, status_type_id: 14, status_type_sub: 'North Korea', status_type_sub_ref: 'KPW ₩' },
    { status_type_sub_id: 138, tenant_id: 1, status_type_id: 14, status_type_sub: 'North Macedonia', status_type_sub_ref: 'MKD ден' },
    { status_type_sub_id: 139, tenant_id: 1, status_type_id: 14, status_type_sub: 'Norway', status_type_sub_ref: 'NOK kr' },
    { status_type_sub_id: 140, tenant_id: 1, status_type_id: 14, status_type_sub: 'Oman', status_type_sub_ref: 'OMR ع.ر.' },
    { status_type_sub_id: 141, tenant_id: 1, status_type_id: 14, status_type_sub: 'Pakistan', status_type_sub_ref: 'PKR ₨' },
    { status_type_sub_id: 142, tenant_id: 1, status_type_id: 14, status_type_sub: 'Palestine', status_type_sub_ref: 'ILS ₪' },
    { status_type_sub_id: 143, tenant_id: 1, status_type_id: 14, status_type_sub: 'Panama', status_type_sub_ref: 'PAB B/.' },
    { status_type_sub_id: 144, tenant_id: 1, status_type_id: 14, status_type_sub: 'Papua New Guinea', status_type_sub_ref: 'PGK K' },
    { status_type_sub_id: 145, tenant_id: 1, status_type_id: 14, status_type_sub: 'Paraguay', status_type_sub_ref: 'PYG ₲' },
    { status_type_sub_id: 146, tenant_id: 1, status_type_id: 14, status_type_sub: 'Peru', status_type_sub_ref: 'PEN S/' },
    { status_type_sub_id: 147, tenant_id: 1, status_type_id: 14, status_type_sub: 'Philippines', status_type_sub_ref: 'PHP ₱' },
    { status_type_sub_id: 148, tenant_id: 1, status_type_id: 14, status_type_sub: 'Poland', status_type_sub_ref: 'PLN zł' },
    { status_type_sub_id: 149, tenant_id: 1, status_type_id: 14, status_type_sub: 'Portugal', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 150, tenant_id: 1, status_type_id: 14, status_type_sub: 'Qatar', status_type_sub_ref: 'QAR ق.ر' },
    { status_type_sub_id: 151, tenant_id: 1, status_type_id: 14, status_type_sub: 'Romania', status_type_sub_ref: 'RON lei' },
    { status_type_sub_id: 152, tenant_id: 1, status_type_id: 14, status_type_sub: 'Russia', status_type_sub_ref: 'RUB ₽' },
    { status_type_sub_id: 153, tenant_id: 1, status_type_id: 14, status_type_sub: 'Rwanda', status_type_sub_ref: 'RWF FRw' },
    { status_type_sub_id: 154, tenant_id: 1, status_type_id: 14, status_type_sub: 'Saudi Arabia', status_type_sub_ref: 'SAR SAR' },
    { status_type_sub_id: 155, tenant_id: 1, status_type_id: 14, status_type_sub: 'Senegal', status_type_sub_ref: 'XOF CFA' },
    { status_type_sub_id: 156, tenant_id: 1, status_type_id: 14, status_type_sub: 'Serbia', status_type_sub_ref: 'RSD дин.' },
    { status_type_sub_id: 157, tenant_id: 1, status_type_id: 14, status_type_sub: 'Seychelles', status_type_sub_ref: 'SCR ₨' },
    { status_type_sub_id: 158, tenant_id: 1, status_type_id: 14, status_type_sub: 'Singapore', status_type_sub_ref: 'SGD S$' },
    { status_type_sub_id: 159, tenant_id: 1, status_type_id: 14, status_type_sub: 'Slovakia', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 160, tenant_id: 1, status_type_id: 14, status_type_sub: 'Slovenia', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 161, tenant_id: 1, status_type_id: 14, status_type_sub: 'Solomon Islands', status_type_sub_ref: 'SBD SI$' },
    { status_type_sub_id: 162, tenant_id: 1, status_type_id: 14, status_type_sub: 'South Africa', status_type_sub_ref: 'ZAR R' },
    { status_type_sub_id: 163, tenant_id: 1, status_type_id: 14, status_type_sub: 'South Korea', status_type_sub_ref: 'KRW ₩' },
    { status_type_sub_id: 164, tenant_id: 1, status_type_id: 14, status_type_sub: 'Spain', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 165, tenant_id: 1, status_type_id: 14, status_type_sub: 'Sri Lanka', status_type_sub_ref: 'LKR Rs' },
    { status_type_sub_id: 166, tenant_id: 1, status_type_id: 14, status_type_sub: 'Sudan', status_type_sub_ref: 'SDG س.ج.' },
    { status_type_sub_id: 167, tenant_id: 1, status_type_id: 14, status_type_sub: 'Sweden', status_type_sub_ref: 'SEK kr' },
    { status_type_sub_id: 168, tenant_id: 1, status_type_id: 14, status_type_sub: 'Switzerland', status_type_sub_ref: 'CHF CHF' },
    { status_type_sub_id: 169, tenant_id: 1, status_type_id: 14, status_type_sub: 'Syria', status_type_sub_ref: 'SYP £S' },
    { status_type_sub_id: 170, tenant_id: 1, status_type_id: 14, status_type_sub: 'Taiwan', status_type_sub_ref: 'TWD NT$' },
    { status_type_sub_id: 171, tenant_id: 1, status_type_id: 14, status_type_sub: 'Tanzania', status_type_sub_ref: 'TZS TSh' },
    { status_type_sub_id: 172, tenant_id: 1, status_type_id: 14, status_type_sub: 'Thailand', status_type_sub_ref: 'THB ฿' },
    { status_type_sub_id: 173, tenant_id: 1, status_type_id: 14, status_type_sub: 'Togo', status_type_sub_ref: 'XOF CFA' },
    { status_type_sub_id: 174, tenant_id: 1, status_type_id: 14, status_type_sub: 'Tonga', status_type_sub_ref: 'TOP T$' },
    { status_type_sub_id: 175, tenant_id: 1, status_type_id: 14, status_type_sub: 'Trinidad & Tobago', status_type_sub_ref: 'TTD TT$' },
    { status_type_sub_id: 176, tenant_id: 1, status_type_id: 14, status_type_sub: 'Tunisia', status_type_sub_ref: 'TND ت.د' },
    { status_type_sub_id: 177, tenant_id: 1, status_type_id: 14, status_type_sub: 'Turkey', status_type_sub_ref: 'TRY ₺' },
    { status_type_sub_id: 178, tenant_id: 1, status_type_id: 14, status_type_sub: 'Turkmenistan', status_type_sub_ref: 'TMT T' },
    { status_type_sub_id: 179, tenant_id: 1, status_type_id: 14, status_type_sub: 'Uganda', status_type_sub_ref: 'UGX USh' },
    { status_type_sub_id: 180, tenant_id: 1, status_type_id: 14, status_type_sub: 'Ukraine', status_type_sub_ref: 'UAH ₴' },
    { status_type_sub_id: 181, tenant_id: 1, status_type_id: 14, status_type_sub: 'United Arab Emirates', status_type_sub_ref: 'AED AED' },
    { status_type_sub_id: 182, tenant_id: 1, status_type_id: 14, status_type_sub: 'United Kingdom', status_type_sub_ref: 'GBP £' },
    { status_type_sub_id: 183, tenant_id: 1, status_type_id: 14, status_type_sub: 'United States', status_type_sub_ref: 'USD $' },
    { status_type_sub_id: 184, tenant_id: 1, status_type_id: 14, status_type_sub: 'Uruguay', status_type_sub_ref: 'UYU $U' },
    { status_type_sub_id: 185, tenant_id: 1, status_type_id: 14, status_type_sub: 'Uzbekistan', status_type_sub_ref: 'UZS лв' },
    { status_type_sub_id: 186, tenant_id: 1, status_type_id: 14, status_type_sub: 'Vanuatu', status_type_sub_ref: 'VUV VT' },
    { status_type_sub_id: 187, tenant_id: 1, status_type_id: 14, status_type_sub: 'Vatican City', status_type_sub_ref: 'EUR €' },
    { status_type_sub_id: 188, tenant_id: 1, status_type_id: 14, status_type_sub: 'Venezuela', status_type_sub_ref: 'VES Bs' },
    { status_type_sub_id: 189, tenant_id: 1, status_type_id: 14, status_type_sub: 'Vietnam', status_type_sub_ref: 'VND ₫' },
    { status_type_sub_id: 190, tenant_id: 1, status_type_id: 14, status_type_sub: 'Yemen', status_type_sub_ref: 'YER ﷼' },
    { status_type_sub_id: 191, tenant_id: 1, status_type_id: 14, status_type_sub: 'Zambia', status_type_sub_ref: 'ZMW ZK' },
    { status_type_sub_id: 192, tenant_id: 1, status_type_id: 14, status_type_sub: 'Zimbabwe', status_type_sub_ref: 'ZWL Z$' },
    
    // Additional custom entries
    { status_type_sub_id: 193, tenant_id: 1, status_type_id: 5, status_type_sub: 'GPAY', status_type_sub_ref: 'GPAY' },
    { status_type_sub_id: 194, tenant_id: 1, status_type_id: 20, status_type_sub: 'JEWELLERY', status_type_sub_ref: '10' },
    { status_type_sub_id: 195, tenant_id: 1, status_type_id: 22, status_type_sub: 'FRIEND', status_type_sub_ref: 'FRIEND' }
];

// Helper function to build INSERT IGNORE queries
function buildInsertIgnoreQuery(table, data, idColumn) {
    if (!data.length) return '';
    
    const columns = Object.keys(data[0]);
    const values = data.map(row => 
        `(${columns.map(col => {
            let val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return val;
        }).join(', ')})`
    ).join(',\n');
    
    return `INSERT IGNORE INTO ${table} (${columns.join(', ')}) VALUES\n${values};`;
}

async function seed() {
    let connection;
    
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        
        console.log('Starting seed process...\n');
        
        // Check if data already exists
        const [tenantExists] = await connection.execute('SELECT COUNT(*) as count FROM tenant WHERE tenant_id = 1');
        const [clinicExists] = await connection.execute('SELECT COUNT(*) as count FROM clinic WHERE clinic_id = 5');
        const [statusTypeExists] = await connection.execute('SELECT COUNT(*) as count FROM statustype');
        const [statusTypeSubExists] = await connection.execute('SELECT COUNT(*) as count FROM statustypesub WHERE tenant_id = 1');
        
        // Seed tenant
        if (tenantExists[0].count === 0) {
            console.log('Seeding tenant...');
            const query = buildInsertIgnoreQuery('tenant', TENANTS, 'tenant_id');
            await connection.execute(query);
            console.log('✓ Tenant seeded successfully');
        } else {
            console.log('⚠ Tenant already exists, skipping...');
        }
        
        // Seed clinic
        if (clinicExists[0].count === 0) {
            console.log('\nSeeding clinic...');
            const query = buildInsertIgnoreQuery('clinic', CLINICS, 'clinic_id');
            await connection.execute(query);
            console.log('✓ Clinic seeded successfully');
        } else {
            console.log('\n⚠ Clinic already exists, skipping...');
        }
        
        // Seed statustype (all static status types)
        console.log('\nSeeding statustype...');
        const statusTypeQuery = buildInsertIgnoreQuery('statustype', STATUS_TYPES, 'status_type_id');
        await connection.execute(statusTypeQuery);
        console.log(`✓ ${STATUS_TYPES.length} status types seeded successfully`);
        
        // Seed statustypesub
        console.log('\nSeeding statustypesub...');
        // Insert in batches of 50 to avoid query too large
        const batchSize = 50;
        let insertedCount = 0;
        
        for (let i = 0; i < STATUS_TYPE_SUBS.length; i += batchSize) {
            const batch = STATUS_TYPE_SUBS.slice(i, i + batchSize);
            const query = buildInsertIgnoreQuery('statustypesub', batch, 'status_type_sub_id');
            await connection.execute(query);
            insertedCount += batch.length;
            console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
        }
        console.log(`✓ ${insertedCount} status type sub-entries seeded successfully`);
        
        console.log('\n=================================');
        console.log('Seed completed successfully!');
        console.log('=================================');
        console.log(`- Tenant: ${TENANTS.length} record`);
        console.log(`- Clinic: ${CLINICS.length} record`);
        console.log(`- StatusType: ${STATUS_TYPES.length} records`);
        console.log(`- StatusTypeSub: ${STATUS_TYPE_SUBS.length} records`);
        
    } catch (error) {
        console.error('\n❌ Error during seeding:', error.message);
        if (error.code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
            console.error('\nMySQL authentication issue. Try updating your password plugin:');
            console.error('ALTER USER \'root\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'your_password\';');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\nCannot connect to MySQL. Make sure MySQL is running and credentials are correct.');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the seed function
seed();