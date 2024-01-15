const loginFields = [
    {
        labelText: "Username",
        labelFor: "username",
        id: "username",
        name: "username",
        type: "username",
        autoComplete: "username",
        isRequired: true,
        placeholder: "Username",
        maxLength: 30
    },
    {
        labelText: "Password",
        labelFor: "password",
        id: "password",
        name: "password",
        type: "password",
        autoComplete: "current-password",
        isRequired: true,
        placeholder: "Password",
        maxLength: 20
    }
]

const passwordResetFields = [
    {
        labelText: "Email address",
        labelFor: "email-address",
        id: "emailAddress",
        name: "email",
        type: "email",
        autoComplete: "email",
        isRequired: true,
        placeholder: "Email address",
        maxLength: 40
    }
]

const otpVerificationFields = [
    {
        labelText: "OTP",
        labelFor: "otp",
        id: "otp",
        name: "otp",
        type: "number",
        autoComplete: "otp",
        isRequired: true,
        placeholder: "OTP",
        minLength: 6,
        maxLength: 6
    }
]

const signupFields = [
    {
        labelText: "Username",
        labelFor: "username",
        id: "username",
        name: "username",
        type: "text",
        autoComplete: "username",
        isRequired: true,
        placeholder: "Username",
        maxLength: 30
    },
    {
        labelText: "Email address",
        labelFor: "email-address",
        id: "email-address",
        name: "email",
        type: "email",
        autoComplete: "email",
        isRequired: true,
        placeholder: "Email address",
        maxLength: 40
    },
    {
        labelText: "Password",
        labelFor: "password",
        id: "password",
        name: "password",
        type: "password",
        autoComplete: "current-password",
        isRequired: true,
        placeholder: "Password",
        maxLength: 20
    },
    {
        labelText: "Confirm Password",
        labelFor: "confirm-password",
        id: "confirm-password",
        name: "confirm-password",
        type: "password",
        autoComplete: "confirm-password",
        isRequired: true,
        placeholder: "Confirm Password",
        maxLength: 20
    }
]

const passwordUpdateFields = [
    {
        labelText: "Password",
        labelFor: "password",
        id: "password",
        name: "password",
        type: "password",
        autoComplete: "current-password",
        isRequired: true,
        placeholder: "New Password",
        maxLength: 20
    },
    {
        labelText: "Confirm Password",
        labelFor: "confirm-password",
        id: "confirmPassword",
        name: "confirm-password",
        type: "password",
        autoComplete: "confirm-password",
        isRequired: true,
        placeholder: "Confirm New Password",
        maxLength: 20
    }
]

const registrationFields = [
    {
        labelText: "Firstname",
        labelFor: "firstname",
        id: "firstname",
        name: "firstname",
        type: "firstname",
        autoComplete: "firstname",
        isRequired: true,
        placeholder: "First name",
        maxLength: 30
    },
    {
        labelText: "Lastname",
        labelFor: "lastname",
        id: "lastname",
        name: "lastname",
        type: "lastname",
        autoComplete: "lastname",
        isRequired: true,
        placeholder: "Last name",
        maxLength: 30
    },
    {
        labelText: "Email address",
        labelFor: "email-address",
        id: "email_address",
        name: "email",
        type: "email",
        autoComplete: "email",
        isRequired: true,
        placeholder: "Email address",
        maxLength: 40
    },
    {
        labelText: "Username",
        labelFor: "username",
        id: "username",
        name: "username",
        type: "text",
        autoComplete: "username",
        isRequired: true,
        placeholder: "Username",
        maxLength: 30
    },
    {
        labelText: "Password",
        labelFor: "password",
        id: "password",
        name: "password",
        type: "password",
        autoComplete: "current-password",
        isRequired: true,
        placeholder: "Password",
        maxLength: 20
    },
    {
        labelText: "Contactnumber",
        labelFor: "contactnumber",
        id: "contactnumber",
        name: "contactnumber",
        type: "text",
        autoComplete: "contactnumber",
        isRequired: true,
        placeholder: "Contact Number",
        minLength: 10,
        maxLength: 10
    }
]

const spaceFields = [
    {
        labelText: "Space Name",
        labelFor: "spaceName",
        id: "spaceName",
        name: "spaceName",
        type: "text",
        autoComplete: "spaceName",
        isRequired: true,
        placeholder: "Enter Space Name",
        maxLength: 15
    }
]

export { loginFields, passwordResetFields, signupFields, otpVerificationFields, passwordUpdateFields, registrationFields, spaceFields }