import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, staffId:{type:mongoose.Schema.Types.ObjectId,ref:'Staff',required:true}, appointmentDate:{type:String,required:true}, startTime:{type:String,required:true}, endTime:{type:String,required:true}, totalDuration:Number, totalAmount:Number, offerId:{type:mongoose.Schema.Types.ObjectId,ref:'Offer',default:null}, discountAmount:{type:Number,default:0}, status:{type:String,enum:['Pending','Confirmed','Completed','Cancelled'],default:'Pending'}, notes:String, createdAt:{type:Date,default:Date.now}
}, { collection: 'appointments', versionKey: false });
schema.index({staffId:1,appointmentDate:1,status:1});
schema.index({status:1,appointmentDate:1,endTime:1});
export default mongoose.model('Appointment', schema);
