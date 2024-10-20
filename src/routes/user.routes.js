import { Router } from "express";
import {registerUser,loginUser,logoutUser,refreshTokenEndpoint,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserProfile,
    getWatchHistory
} from '../controllers/user.controller.js'
import {upload} from '../middleware/multer.middleware.js'
import {verifyJWT} from '../middleware/auth.middleware.js'
const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount : 1
        } , 
        { 
            name : "coverImage",
            maxCount:1
        }
    ]),
    registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshTokenEndpoint)
router.route("/change-password").post(verifyJWT, changePassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:username").get(verifyJWT, getUserProfile)
router.route("/history").get(verifyJWT, getWatchHistory)

export default router