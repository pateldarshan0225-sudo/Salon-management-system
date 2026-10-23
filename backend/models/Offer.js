import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  title:{type:String,required:true}, code:{type:String,required:true,unique:true,uppercase:true}, discountPercent:{type:Number,min:1,max:90,required:true}, validFrom:{type:String,required:true}, validTo:{type:String,required:true}, isActive:{type:Boolean,default:true}, description:String
}, { collection: 'offers', versionKey: false });
export default mongoose.model('Offer', schema);
