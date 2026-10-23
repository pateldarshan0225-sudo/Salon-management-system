import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  appointmentId:{type:mongoose.Schema.Types.ObjectId,ref:'Appointment',required:true,index:true}, serviceId:{type:mongoose.Schema.Types.ObjectId,ref:'Service',required:true}, price:Number, duration:Number
}, { collection: 'appointmentServices', versionKey: false });
export default mongoose.model('AppointmentService', schema);
