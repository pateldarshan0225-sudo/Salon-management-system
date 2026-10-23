import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, appointmentId:{type:mongoose.Schema.Types.ObjectId,ref:'Appointment',required:true,unique:true}, rating:{type:Number,min:1,max:5,required:true}, comment:{type:String,required:true}, createdAt:{type:Date,default:Date.now}
}, { collection: 'reviews', versionKey: false });
export default mongoose.model('Review', schema);
