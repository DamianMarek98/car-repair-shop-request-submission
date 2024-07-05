export interface RepairRequest {
    vin: String,
    issueDescription: String,
    firstName: String,
    lastName: String,
    email: String,
    phoneNumber: String,
    timeSlots: TimeSlot[],
    asap: boolean
}

export interface TimeSlot {
    date: Date,
    from: String,
    to: String
}