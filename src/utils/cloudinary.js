import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
// Configuration
cloudinary.config({ 
    cloud_name:process.env.CLOUDINARY_NAME,
    api_key:process.env.CLOUDINARY_API_KEY , 
    api_secret:process.env.CLOUDINARY_API_SECRET  // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async(filePath) =>{
    try {
        if(!filePath)return null
        const uploadResult = await cloudinary.uploader.upload(filePath, {
            resource_type:'auto'}
        )
        console.log("File Uploaded Successfully : ",uploadResult)
        fs.unlinkSync(filePath)
        return uploadResult
    } catch (error) {
        fs.unlinkSync(filePath)
        console.log("The Error is : ",error)
        return null
    }
}
export {uploadOnCloudinary}
