import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/User.model.js"
import {uploadToCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

const generateRefreshAndAccessToken = async(userId) =>{
    try {
        const user =await User.findById(userId)
        const accessToken = user.accessTokenGen()
        const refreshToken = user.refreshTokenGen()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : true})
        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"Error while generating Tokens")
    }
}

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
 
const loginUser = asyncHandler( async (req,res) => {
    const{email,username,password}=req.body
    console.log(req.body)
    if(!(username || email)){
        throw new ApiError(400,"username or email is required for login")
    }
    const user =await User.findOne({
        $or:[{email},{username}]
    })
    if(!user){
        throw new ApiError(404,"User doesnot exists")
    }
    const isPassValid = await user.isPasswordCorrect(password)

    if(!isPassValid) throw new ApiError(407,"Credentials donot match")

    const {accessToken , refreshToken} = await generateRefreshAndAccessToken(user._id)

    const loggedUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedUser , accessToken , refreshToken
        },"User Logged in successfully")
    )

})

const logoutUser = asyncHandler( async (req,res) => {
    const user =await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken:undefined
        }
    },{
        new:true
    })
    const options = {
        htttOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,user,"User Logged out Successfully")
    )
})

const refreshTokenEndpoint = asyncHandler( async(req,res) =>{
    const incomingToken = req.body?.refreshToken || req.cookie?.refreshToken 
    if (!incomingToken){
        throw new ApiError(401 , "NO refresh Token Found ")
    }
    const decoded = jwt.verify(incomingToken,process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decoded._id)
    if(!user){
        throw new ApiError(404,"User not found ")
    }
    if(incomingToken!==user?.refreshToken){
        throw new ApiError(401,"Refresh token does not match")
    }
    const{accessToken , refreshToken : newRefreshToken} = await generateRefreshAndAccessToken(user._id)

    const options={
        httpOnly : true,
        secure : true
    }

    res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
        new ApiResponse(200,{accessToken,refreshToken : newRefreshToken},"refresh Token refreshed")
    )
})

export {registerUser,loginUser,logoutUser,refreshTokenEndpoint}