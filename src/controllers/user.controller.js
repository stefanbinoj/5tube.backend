import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadToCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'

const registerUser = asyncHandler( async(req,res) =>{
    const {username , fullname , email , password} = req.body;
    if([username,fullname,email,password].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"All Fields are necessary")
    }

    if(await User.findOne({
        $or:[{email},{username}]
    })){
        throw new ApiError(409,"User Exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    console.log("Files received are : ",req.files)
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is needed ")
    }
    const avatarRes = await uploadToCloudinary(avatarLocalPath)
    const coverImageRes = await uploadToCloudinary(coverImageLocalPath)

    if(!avatarRes){
        throw new ApiError(400,"Avatar is needed ")
    }

    const user = await User.create({
        fullname , email , password ,
        avatar : avatarRes.url,
        coverImage : coverImageRes?.url || "",
        username : username.toLowerCase()
    })
    const createdUser  = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong on our side ")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
})

export {registerUser}