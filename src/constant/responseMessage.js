module.exports = {
    HASH_SALT_ROUNDS: 14,
    SUCCESS: `the operation has been successful`,
    SOMETHING_WENT_WRONG: `Something went wrong`,
    NOT_FOUND: (entity) => {
        return `${entity} not found` // Ensure the string is returned
    },
    cookieOptions: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
        sameSite: 'none',
        httpOnly: true,
        secure: true
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
    profileImageUploadedSuccessfully: 'Profile image uploaded successfully',
    PROFILE_NOT_FOUND: 'No profile image to delete',
    PROFILE: 'Profile image deleted successfully',
    userNotFound: 'User Not Found',
    userFetchedSuccessfully: 'User fetched successfully',
    LOGOUT: 'Logged out successfully',
    DeleteProfile: 'User profile soft-deleted successfully',
    EMAIL_EXIST: 'Email Id already in use',
    INVALID_EMAIL_FORMAT: 'Email Format is incorrect',
    EMAIL_SEND_FAILED: 'Failed to send mail',
    NO_PENDING_UPDATE: 'No Pending Updates',
    OTP_ALREADY_VERIFIED: 'OTP Already Verified',
    TOO_MANY_ATTEMPTS:
        'You have exceeded maximum OTP attempts. Please try again after 24 hours.',
    EMAIL_UPDATED: 'Email Updated successfully',
    UPDATE_FAILED:"Email Updation Failed"
}
