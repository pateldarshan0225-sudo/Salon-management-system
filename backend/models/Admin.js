import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: {type:String,required:true}, email:{type:String,required:true,unique:true,lowercase:true}, password:{type:String,required:true,select:false}, role:{type:String,default:'admin',enum:['admin']}, createdAt:{type:Date,default:Date.now}
}, { collection: 'admins', versionKey: false });
export default mongoose.model('Admin', schema);
