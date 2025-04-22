/* eslint-disable no-unused-vars */
const User = require('../model/user.model')
const Otp = require('../model/otp.model')
const { asyncHandler } = require("../util/asyncHandler");
const httpResponse = require('../util/httpResponse')
const responseMessage = require('../constant/responseMessage')
const httpError = require('../util/httpError')



// src/controller/api.controller.js
// exports.self = (req, res) => {
//    try {
//     httpResponse(req,res,200,responseMessage.SUCCESS,{id:'id'})
//    } catch (error) {
//     httpError(next, error, req,500)
//    }
// }


/*
exports.self = (req, res, next) => {
    try {
      throw new Error('this is an error');
      // httpResponse(req,res,200,responseMessage.SUCCESS,{id:'id'})
    } catch (error) {
      httpError(res, error, 500); // Pass res directly to httpError
    }
 };
*/