import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name:{type:String,required:true}, email:{type:String,required:true,unique:true,lowercase:true}, password:{type:String,required:true,select:false}, phone:{type:String,required:true}, gender:{type:String,default:'Prefer not to say'}, createdAt:{type:Date,default:Date.now}
}, { collection: 'users', versionKey: false });
export default mongoose.model('User', schema);
