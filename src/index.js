import dotenv from 'dotenv'
import connectDb from './db/index.js'
import { app } from './app.js'

dotenv.config({path:'./env'})


connectDb()
.then(()=>{
    app.on("error",(error)=>{
        throw error
    })
    app.listen(process.env.PORT || 80001 , ()=>{
        console.log(`Port is running on ${process.env.PORT || 8001}`)
    })
})
.catch((error)=>{
    console.log("Db connection Error : ",error)
})