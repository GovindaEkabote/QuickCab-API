module.exports = {
    HASH_SALT_ROUNDS: 14,
    SUCCESS: `the operation has been successful`,
    SOMETHING_WENT_WRONG: `Something went wrong`,
    NOT_FOUND: (entity) => {
        return `${entity} not found` // Ensure the string is returned
    },
    cookieOptions: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        sameSite: "none",
        httpOnly: true,
        secure: true,
    },
    PRESETN: 'User already Register',
    userNotCreated:
        'Something went wrong while registering the customer. Please try again later or contact support for assistance. Thank you.',
    userCreated: 'User registered successfully. Welcome onboard!',
    OTP_SENT: 'OTP sent successfully',
    OTP_NOT_SENT: 'Failed to send OTP',
    OTP_VERIFIED: 'OTP verified successfully',
    INVALID_OTP: 'Invalid OTP',
    OTP_EXPIRED: 'OTP has expired',
    OTP_VERIFICATION_FAILED: 'OTP verification failed',
    profileImageUploadedSuccessfully:"Profile image uploaded successfully",
    PROFILE_NOT_FOUND:'No profile image to delete',
    PROFILE:'Profile image deleted successfully',
    userNotFound:'User Not Found',
    userFetchedSuccessfully: "User fetched successfully",
    LOGOUT:'Logged out successfully',
    DeleteProfile:"User profile soft-deleted successfully",
}
