import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name:{type:String,required:true}, phone:{type:String,required:true}, categoryId:{type:mongoose.Schema.Types.ObjectId,ref:'ServiceCategory',required:true}, experienceYears:{type:Number,min:0}, bio:String, image:String, workingDays:[String], startTime:{type:String,required:true}, endTime:{type:String,required:true}, isActive:{type:Boolean,default:true}
}, { collection: 'staff', versionKey: false });
export default mongoose.model('Staff', schema);
