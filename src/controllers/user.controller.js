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
        $unset:{
            refreshToken:1
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

const changePassword = asyncHandler ( async(req,res)=>{
    const {oldPassword , newPassword} = req.body
    const user = await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(404,"User doesnt exists")
    }
    if(!oldPassword || !newPassword){
        throw new ApiError(402,"old and new Password are mandatory")

    }
    const isPassValid = await user.isPasswordCorrect(oldPassword)
    if(!isPassValid){
        throw new ApiError(404,"Password is incorrect ")
    }
    user.password = newPassword
    user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json( new ApiResponse(
        200,{},"Password changed !! "
    ))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json( new ApiResponse(
        200, req.user, "current user fetched successfully"))
})
const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body
    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});
const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})
const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserProfile = asyncHandler ( async(req,res) => {
    const {usrname} = req.params
    if(!usrname)throw new ApiError(400,"username is missing")

    const channel = await User.aggregate([
        {
            $match : {
                username :  usrname
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as:"subscribers"

            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as:"subcribedTo"
            }
        },
        {
            $addFields : {
                subcribersCount  : {
                    $size : "$subscribers"
                },
                subcribedToCount : {
                    $size : "$subcribedTo"
                },
                isSubscribed : {
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                fullname:1,
                subcribersCount:1,
                subcribedToCount:1,
                avatar:1,
                coverImage:1,
                isSubscribed:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"Channel doesnot exists : ")
    }

    return res.status(200)
    .json(new ApiResponse(200,channel[0],"data fetched successfully"))
})

const getWatchHistory = asyncHandler( async(req,res)=>{
    const user = User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup :{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistoryTable",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerTable",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },{
                        $addFields:{
                            owner:{
                                $first:"$ownerTable"
                            }
                        }
                    }
                ]

            }
        }
    ])

    res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully"))
})

export {registerUser,loginUser,logoutUser,refreshTokenEndpoint,changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserProfile,
    getWatchHistory
}