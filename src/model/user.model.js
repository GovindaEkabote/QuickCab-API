const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { HASH_SALT_ROUNDS } = require('../constant/constant.js')
const validator = require("validator");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,  
      unique: true,
      validate: [validator.isEmail, "Please valid Email"],
    },
    password: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    profile_image: {
      public_id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    role: {
      type: String,
      enum: ["user", "driver", "admin"],
      default: "user",
    },
    socialAuth: {
      googleId: String,
      facebookId: String,
      appleId: String,
    },
    firebaseToken: {
      type: String,
    },
    referenceToken: {
      type: String,
      require: true,
      default: "-",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, HASH_SALT_ROUNDS);
});

userSchema.method.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password)
}

module.exports = mongoose.model("User", userSchema);