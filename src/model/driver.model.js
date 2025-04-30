const Schema = mongoose.Schema;
const mongoose = require("mongoose");


const driverSchema = new Schema(
    {
        user:{
           type: mongoose.Schema.ObjectId,
           ref:'User',
           required:true
        },
        license:{
            number:String,
            expiry:Date,
            verified:Boolean
        },
        vehicle: {
            type: {  // e.g., "Sedan", "SUV", "Motorcycle"
                type: String,
                trim: true
            },
            make: {  // e.g., "Toyota", "Honda"
                type: String,
                trim: true
            },
            model: {  // e.g., "Camry", "Civic"
                type: String,
                trim: true
            },
            year: {  // Manufacturing year
                type: Number,
                min: 1900,
                max: new Date().getFullYear() + 1
            },
            color: {
                type: String,
                trim: true
            },
            plateNumber: {
                type: String,
                uppercase: true,
                trim: true
            }
        },
        location:{
            type:{
                type:String,
                default:'Point'
            },
            coordinates:[Number], // [langutude,latitude]
            updatedAt:Date
        },
        status:{
            type:String,
            enum:['offline','available','in_ride','busy'],
            default:'offline'
        },
        rating:{
            average:{
                type:Number,
                min:1,
                max:5,
                default:5
            },
            count:{
                type:Number,
                default:0
            }
        },
        document:[{
            type:{
                type:String,
                enum:['license','rc','insurance']
            },
            url:String,
            verified: Boolean
        }],
        createdAt:Date
    }
)

module.exports = mongoose.model("Driver", driverSchema);
