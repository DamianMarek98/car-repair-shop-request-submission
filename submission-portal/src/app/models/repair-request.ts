export interface RepairRequest {
    vin: String | null,
    plateNumber: String,
    issueDescription: String,
    firstName: String,
    lastName: String,
    email: String,
    phoneNumber: String,
    timeSlots: TimeSlot[],
    asap: boolean,
    rodo: boolean
}

export interface TimeSlot {
    date: Date,
    from: String,
    to: String
}