import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name:{type:String,required:true}, categoryId:{type:mongoose.Schema.Types.ObjectId,ref:'ServiceCategory',required:true}, price:{type:Number,required:true,min:0.01}, duration:{type:Number,required:true,min:1}, description:String, image:String, isActive:{type:Boolean,default:true}, createdAt:{type:Date,default:Date.now}
}, { collection: 'services', versionKey: false });
export default mongoose.model('Service', schema);
