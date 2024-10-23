import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import jwt from 'jsonwebtoken'
import { User} from '../models/User.model.js'

export const verifyJWT = asyncHandler( async(req,res,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token){
            throw new ApiError(402,"Unauthorized request ")
        }
        const decoded = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decoded?._id).select("-password -refreshToken")

        if(!user){
            throw new ApiError(402,"User not found while logging out ")
        }

        req.user=user
        next()

    } catch (error) {
        throw new ApiError(401,"Invalid Tokens doesnt mactch for logout")
    }
})