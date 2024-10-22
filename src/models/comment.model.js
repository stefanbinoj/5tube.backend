import mongoose from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'
import nodemon from 'nodemon'

const commentSchema = new mongoose.Schema({
    content:{
        type:String,
        required :[true,"please provide an content "],

    },
    video:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Video"
    },
    owner : {
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true})

commentSchema.plugin(mongooseAggregatePaginate)
export const Comment = mongoose.model("Comment", commentSchema)