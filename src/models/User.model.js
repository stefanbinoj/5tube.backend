import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
const userSchema = new mongoose.Schema({
    username:{
        require:true,
        type:String,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        require:true,
        type:String,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullname:{
        require:true,
        type:String,
        trim:true,
        index:true
    },
    avatar : String,
    coverImage:String,
    watchHistory:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"video"
        }
    ],
    password:{
        required:[true,"Please provide an password"],
        type:String
    },
    refreshToken : {
        required:[true,"user credentials failed"],
        type:String
    }
},{timestamps:true})

userSchema.pre('save',async function(next){
    if(!this.isModified("password")) return next()
    this.password=bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password,this.password)
    
}

export const User =  mongoose.model("User",userSchema)