import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  appointmentId:{type:mongoose.Schema.Types.ObjectId,ref:'Appointment',required:true,unique:true}, subtotal:Number, discount:Number, finalAmount:Number, paymentMode:{type:String,enum:['Cash','UPI','Card'],default:'Cash'}, paymentStatus:{type:String,enum:['Unpaid','Paid'],default:'Unpaid'}, paidAt:{type:Date,default:null}, createdAt:{type:Date,default:Date.now}
}, { collection: 'bills', versionKey: false });
export default mongoose.model('Bill', schema);
