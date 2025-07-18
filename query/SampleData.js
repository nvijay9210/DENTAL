{
    "tenant": [
      {
        "tenant_id": 1,
        "tenant_name": "DentalCare",
        "tenant_domain": "dentalcare.com",
        "created_by": "ADMIN",
        "updated_by": null,
        "tenant_app_name": "DentalPro",
        "tenant_app_logo": "https://example.com/logo.png", 
        "tenant_app_font": "Arial",
        "tenant_app_themes": "{\"primary_color\": \"#008080\", \"secondary_color\": \"#FFFFFF\"}"
      }
    ],
    "clinic": [
      {
        "clinic_id": 1,
        "tenant_id": 1,
        "clinic_name": "City Dental Clinic",
        "email": "info@citydental.com",
        "phone_number": "1234567890",
        "alternate_phone_number": "0987654321",
        "branch": "Main Branch",
        "website": "www.citydental.com",
        "address": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "pin_code": "10001",
        "license_number": "LIC123456",
        "gst_number": "GST1234567890",
        "pan_number": "PAN1234567",
        "established_year": 2010,
        "total_doctors": 10,
        "total_patients": 500,
        "seating_capacity": 20,
        "number_of_assistants": 15,
        "available_services": "[\"Teeth Cleaning\", \"Fillings\", \"Root Canal\"]",
        "operating_hours": "{\"monday\": \"9AM-6PM\", \"tuesday\": \"9AM-6PM\"}",
        "insurance_supported": 1,
        "ratings": 4.5,
        "reviews_count": 100,
        "emergency_support": 1,
        "teleconsultation_supported": 1,
        "clinic_logo": "https://example.com/clinic-logo.png", 
        "parking_availability": 1,
        "pharmacy": 1,
        "wifi": 1,
        "created_by": "ADMIN"
      }
    ],
    "dentist": [
      {
        "dentist_id": 1,
        "tenant_id": 1,
        "clinic_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "gender": "M",
        "date_of_birth": "1980-05-15",
        "email": "johndoe@dentalcare.com",
        "phone_number": "1111111111",
        "alternate_phone_number": "2222222222",
        "specialisation": "[\"Orthodontics\", \"Cosmetic Dentistry\"]",
        "designation": "Senior Dentist",
        "member_of": "[\"American Dental Association\"]",
        "experience_years": 15,
        "license_number": "DL123456",
        "clinic_name": "City Dental Clinic",
        "clinic_address": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "pin_code": "10001",
        "working_hours": "{\"monday\": \"9AM-6PM\", \"tuesday\": \"9AM-6PM\"}",
        "available_days": "[\"Monday\", \"Tuesday\"]",
        "consultation_fee": 100.00,
        "min_booking_fee": 20.00,
        "ratings": 4.7,
        "reviews_count": 80,
        "appointment_count": 100,
        "profile_picture": "https://example.com/john-doe.jpg", 
        "bio": "{\"education\": \"DDS from XYZ University\"}",
        "teleconsultation_supported": 1,
        "insurance_supported": 1,
        "languages_spoken": "[\"English\", \"Spanish\"]",
        "awards_certifications": "[\"Best Dentist 2023\"]",
        "social_links": "{\"linkedin\": \"https://linkedin.com/in/johndoe\"}", 
        "internship": "[\"General Practice Residency\"]",
        "position_held": "[\"Chief Dentist\"]",
        "research_projects": "[\"Tooth Sensitivity Study\"]",
        "publication": "[\"Journal of Dental Science\"]",
        "social_activities": "[\"Community Outreach\"]",
        "created_by": "ADMIN"
      }
    ],
    "patient": [
      {
        "patient_id": 1,
        "tenant_id": 1,
        "first_name": "Alice",
        "last_name": "Johnson",
        "email": "alice.johnson@example.com",
        "phone_number": "3333333333",
        "alternate_phone_number": "4444444444",
        "date_of_birth": "1990-08-20",
        "gender": "F",
        "blood_group": "A+",
        "address": "456 Oak Avenue",
        "city": "Los Angeles",
        "state": "CA",
        "country": "USA",
        "pin_code": "90001",
        "pre_history": "No significant history",
        "current_medications": "None",
        "dentist_preference": 1,
        "smoking_status": "Non-smoker",
        "alcohol_consumption": "Social",
        "emergency_contact_name": "Bob Johnson",
        "emergency_contact_number": "5555555555",
        "insurance_provider": "HealthGuard",
        "insurance_policy_number": "POL1234567",
        "treatment_history": "{\"last_visit\": \"2023-01-15\"}",
        "appointment_count": 5,
        "last_appointment_date": "2023-01-15T00:00:00Z",
        "profile_picture": "https://example.com/alice-johnson.jpg", 
        "created_by": "ADMIN"
      }
    ],
    "appointment": [
      {
        "appointment_id": 1,
        "tenant_id": 1,
        "patient_id": 1,
        "dentist_id": 1,
        "clinic_id": 1,
        "room_id": "00000000-0000-0000-0000-000000000000",
        "appointment_date": "2023-10-25",
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "status": "confirmed",
        "appointment_type": "online",
        "consultation_fee": 100.00,
        "discount_applied": 0.00,
        "payment_status": "paid",
        "min_booking_fee": 20,
        "paid_amount": 100,
        "rescheduled_from": null,
        "cancelled_by": null,
        "cancellation_reason": null,
        "is_virtual": 1,
        "reminder_send": 1,
        "meeting_link": "https://meet.example.com/appointment1", 
        "checkin_time": "2023-10-25T10:05:00Z",
        "checkout_time": "2023-10-25T11:05:00Z",
        "mode_of_payment": "Credit Card",
        "visit_reason": "Routine Checkup",
        "follow_up_needed": 0,
        "reminder_method": "Email",
        "notes": "Patient prefers online consultation.",
        "created_by": "ADMIN"
      }
    ],
    "prescription": [
      {
        "prescription_id": 1,
        "tenant_id": 1,
        "clinic_id": 1,
        "patient_id": 1,
        "dentist_id": 1,
        "treatment_id": 1,
        "medication": "Ibuprofen",
        "generic_name": "Ibuprofen",
        "brand_name": "Advil",
        "dosage": 400,
        "frequency": "Twice daily",
        "quantity": 20,
        "refill_allowed": 1,
        "refill_count": 2,
        "side_effects": "Mild stomach discomfort",
        "start_date": "2023-10-25",
        "end_date": "2023-11-05",
        "instructions": "Take after meals",
        "notes": "For pain relief",
        "is_active": 1,
        "created_by": "ADMIN"
      }
    ],
    "treatment": [
      {
        "treatment_id": 1,
        "tenant_id": 1,
        "appointment_id": 1,
        "patient_id": 1,
        "dentist_id": 1,
        "clinic_id": 1,
        "diagnosis": "Cavity",
        "treatment_procedure": "Filling",
        "treatment_type": "Restorative",
        "treatment_status": "Completed",
        "treatment_date": "2023-10-25",
        "cost": 150.00,
        "duration": "1 hour",
        "teeth_involved": "Upper Right Molar",
        "complications": "None",
        "follow_up_required": 0,
        "follow_up_notes": "",
        "anesthesia_used": 1,
        "anesthesia_type": "Local Anesthesia",
        "technician_assisted": "Yes",
        "treatment_images": "[\"image1.jpg\", \"image2.jpg\"]",
        "notes": "Standard procedure",
        "created_by": "ADMIN"
      }
    ],
    "expense": [
      {
        "expense_id": 1,
        "tenant_id": 1,
        "clinic_id": 1,
        "expense_amount": 500.00,
        "expense_category": "Equipment",
        "expense_reason": "Purchase of dental chair",
        "expense_date": "2023-10-20",
        "mode_of_payment": "Bank Transfer",
        "receipt_number": "RCPT123456",
        "created_by": "ADMIN"
      }
    ],
    "supplier": [
      {
        "supplier_id": 1,
        "tenant_id": 1,
        "clinic_id": 1,
        "supplier_name": "Dental Supplies Co.",
        "supplier_category": "Medical Equipment",
        "supplier_status": "Active",
        "supplier_contact_number": "6666666666",
        "supplier_country": "USA",
        "supplier_performance_rating": 4.8,
        "created_by": "ADMIN"
      }
    ],
    "reminder": [
      {
        "reminder_id": 1,
        "tenant_id": 1,
        "clinic_id": 1,
        "dentist_id": 1,
        "title": "Morning Check-In",
        "description": "Daily check-in reminder",
        "reminder_repeat": "daily",
        "category": "Appointment",
        "reminder_type": "Email",
        "is_recurring": 1,
        "start_date": "2023-10-25",
        "time": "08:00:00",
        "repeat_interval": 1,
        "repeat_count": 0,
        "repeat_weekdays": "MON-FRI",
        "repeat_end_date": null,
        "monthly_option": null,
        "notify": 1,
        "notify_before_hours": 1,
        "reminder_reason": "Start of work day",
        "status": "Active",
        "created_by": "ADMIN"
      }
    ],
    "appointment_reschedules": [
      {
        "resheduled_id": 1,
        "tenant_id": 1,
        "clinic_id": 1,
        "dentist_id": 1,
        "original_appointment_id": 1,
        "new_appointment_id": 2,
        "previous_date": "2023-10-25",
        "previous_time": "10:00:00",
        "new_date": "2023-10-26",
        "new_time": "11:00:00",
        "reason": "Scheduling conflict",
        "charge_applicable": 0,
        "charge_amount": 0.00,
        "rescheduled_by": "ADMIN",
        "created_by": "ADMIN"
      }
    ],
    "payment": [
      {
        "payment_id": 1,
        "tenant_id": 1,
        "clinic_id": 1,
        "patient_id": 1,
        "dentist_id": 1,
        "appointment_id": 1,
        "amount": 100.00,
        "discount_applied": 0.00,
        "final_amount": 100.00,
        "mode_of_payment": "Credit Card",
        "payment_source": "Online",
        "payment_reference": "PAY123456",
        "payment_status": "Paid",
        "payment_verified": 1,
        "receipt_number": "RCPT123456",
        "insurance_number": "INS123456",
        "payment_date": "2023-10-25",
        "created_by": "ADMIN"
      }
    ]
  }