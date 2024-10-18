import mongoose from "mongoose";
import { DB_Name } from "../constants.js";

const connectDB=async()=>{
    try{
        const connection = await mongoose.connect(`${process.env.MONGO_URI}/${DB_Name}`)
        console.log(`Host connected is ${connection.connection.host}`)
    }catch(error){
        console.log("MONGO BD Error is : ",error)
        throw error
        process.exit(1)
    }
} 
export default connectDB