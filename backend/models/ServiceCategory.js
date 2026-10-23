import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name:{type:String,required:true,unique:true}, description:String, image:String, isActive:{type:Boolean,default:true}
}, { collection: 'serviceCategories', versionKey: false });
export default mongoose.model('ServiceCategory', schema);
