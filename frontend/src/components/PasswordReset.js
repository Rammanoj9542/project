import { useState } from 'react';
import { passwordResetFields, otpVerificationFields, passwordUpdateFields } from "../constants/formFields";
import FormAction from "./FormAction";
import Input from "./Input";

// Initialize state variables for different form fields
const fields1 = passwordResetFields;
let fieldsState1 = {};
fields1.forEach(field => (fieldsState1[field.id] = ''));

const fields2 = otpVerificationFields;
let fieldsState2 = {};
fields2.forEach(field => (fieldsState2[field.id] = ''));

const fields3 = passwordUpdateFields;
let fieldsState3 = {};
fields3.forEach(field => (fieldsState3[field.id] = ''));

export default function PasswordReset() {
    // Set up state variables for each form step and flash messages
    const [passwordResetState, setPasswordResetState] = useState(fieldsState1);
    const [OtpVerificationState, setOtpVerificationState] = useState(fieldsState2);
    const [passwordUpdateState, setPasswordUpdateState] = useState(fieldsState3);

    // State to control flash messages
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });

    const [step, setStep] = useState(1); // State to track the current step
    // const [remainingTime, setRemainingTime] = useState(180);
    // const [timerRunning, setTimerRunning] = useState(false);

    // Event handlers for handling form input changes
    const handleChange1 = (e) => setPasswordResetState({ ...passwordResetState, [e.target.id]: e.target.value });
    const handleChange2 = (e) => setOtpVerificationState({ ...OtpVerificationState, [e.target.id]: e.target.value });
    const handleChange3 = (e) => setPasswordUpdateState({ ...passwordUpdateState, [e.target.id]: e.target.value });

    // Store the email input from the first step
    const emailInput = passwordResetState.emailAddress;

    // Event handler for the first form submission
    const handleSubmit1 = async (e) => {
        e.preventDefault();
        try {
            // Create a data object with the email address
            const data1 = { email: emailInput };

            // Make a POST request to reset the password
            const response1 = await fetch('/reset_password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data1),
            });

            // Handle the response
            if (response1.status === 200) {
                // Handle success (e.g., show a success message)
                handleFlashMessage("OTP sent successfully", true);

                // setTimerRunning(true);
                // let timeLeft = remainingTime;
                // const timer = setInterval(() => {
                //     if (timeLeft > 0) {
                //         timeLeft--;
                //         setRemainingTime(timeLeft);
                //     } else {
                //         clearInterval(timer);
                //         setTimerRunning(false);
                //     }
                // }, 1000);

                setTimeout(() => {
                    setStep(2); // Move to the next step
                }, 2000);
            } else if (response1.status === 404) {
                // Handle not found (e.g., show an error message)
                console.error('Email not registered');
                handleFlashMessage("Email not registered", false);
            } 

            else if (response1.status === 423) {
                // Handle not found (e.g., show an error message)
                console.error('password reset is locked');
                handleFlashMessage("password reset  is locked ", false);
            } 
            else {
                // Handle other errors (e.g., show an error message)
                console.error('Failed to send OTP');
                handleFlashMessage("Failed to send OTP", false);
            }
        } catch (error) {
            console.error("Error sending OTP.", error);
            handleFlashMessage("Error: " + error, false);
        }
    };

    // Event handler for the second form submission
    const handleSubmit2 = async (e) => {
        e.preventDefault();
        const otpInput = OtpVerificationState.otp;
        try {
            // Create a data object with the OTP and email
            const data2 = {
                otp: otpInput,
                email: emailInput
            };

            // Make a POST request to verify the OTP
            const response2 = await fetch('/verify_otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data2),
            });

            // Handle the response
            if (response2.status === 200) {
                // Handle success (e.g., show a success message)
                handleFlashMessage("OTP verification successful", true);

                setTimeout(() => {
                    setStep(3); // Move to the next step
                }, 2000);
            } else if (response2.status === 404) {
                // Handle not found (e.g., show an error message)
                console.error('Email not registered');
                handleFlashMessage("Email not registered", false);
            } else if (response2.status === 400) {
                // Handle unauthorized (e.g., show an error message)
                console.error('Invalid OTP');
                handleFlashMessage("Invalid OTP", false);
            } else if (response2.status === 423) {
                // Handle not found (e.g., show an error message)
                console.error('password reset is locked');
                handleFlashMessage("password reset  is locked ", false);
            } else {
                // Handle other errors (e.g., show an error message)
                console.error('Failed to verify OTP');
                handleFlashMessage("Failed to verify OTP", false);
            }
        } catch (error) {
            console.error(error);
            handleFlashMessage("Error: " + error, false);
        }
    };

    // const handleResendOTP = () => {
    //     setRemainingTime(180); // Reset timer
    //     setTimerRunning(true);

    //     // Implement your logic to resend the OTP
    //     handleSubmit1();
    // };

    // Event handler for the third form submission
    const handleSubmit3 = (e) => {
        e.preventDefault();
        const validationResult = isValidPassword(passwordUpdateState.password);
        if (!validationResult.isValid) {
            // Handle case where the password does not meet the criteria
            handleFlashMessage(`Password must contain at least ${validationResult.missingCriteria}.`, false);
        } else {
            comparePasswords();
        }
    };

    // Function to check if the password meets the required constraints
    const isValidPassword = (password) => {
        const criteria = [];
        if (!/(?=.*\d)/.test(password)) {
            criteria.push("one number");
        }
        if (!/(?=.*[a-z])/.test(password)) {
            criteria.push("one lowercase letter");
        }
        if (!/(?=.*[A-Z])/.test(password)) {
            criteria.push("one uppercase letter");
        }
        if (!/[!@#$%^&*]/.test(password)) {
            criteria.push("one special character");
        }
        if (password.length < 8) {
            criteria.push("8 characters");
        }

        if (criteria.length === 0) {
            return { isValid: true };
        } else {
            return { isValid: false, missingCriteria: criteria.join(", ") };
        }
    };

    // Compare the entered passwords
    const comparePasswords = () => {
        const newPasswordInput = passwordUpdateState.password;
        const newPasswordInputConfirm = passwordUpdateState.confirmPassword;

        if (newPasswordInput === newPasswordInputConfirm) {
            updatePassword();
        } else {
            handleFlashMessage("Passwords don't match. Try again.", false);
        }
    };

    // Event handler to update the password
    const updatePassword = async () => {
        try {
            // Create a data object with the new password and email
            const data3 = {
                password: passwordUpdateState.password,
                email: emailInput
            };

            // Make a POST request to your backend route (in this case, "/update_password")
            const response3 = await fetch("/update_password", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data3),
            });

            if (response3.status === 200) {
                // Handle success (e.g., show a success message)
                handleFlashMessage("Password updated successfully. Redirecting back to login page.", true);
                // Redirecting to the Login page after a delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else if (response3.status === 404) {
                // Handle not found (e.g., show an error message)
                console.error('Email not registered');
                handleFlashMessage("Email not registered", false);
            } else {
                // Handle other errors (e.g., show an error message)
                console.error('Failed to update password');
                handleFlashMessage("Failed to update password", false);
            }
        } catch (error) {
            console.error(error);
            handleFlashMessage("Error: " + error, false);
        }
    };

    // Function to handle flash messages
    const handleFlashMessage = (text, success) => {
        setFlashMessage({ text, success, failure: !success });
        setTimeout(() => setFlashMessage({ text: "", success: false, failure: false }), 2000);
    };


    return (
        <div>

            {/* Displaying success flash message */}
            {flashMessage.success && (
                <div id="successFlashMsg">{flashMessage.text}</div>
            )}

            {/* Displaying failure flash message */}
            {flashMessage.failure && (
                <div id="failFlashMsg">{flashMessage.text}</div>
            )}

            {/* Step 1: Email input */}
            {step === 1 && (
                <div id='PR1'>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit1}>
                        {/* Map over fields1 and create Input components for password reset */}
                        {fields1.map((field) => (
                            <Input
                                key={field.id}
                                value={passwordResetState[field.id]}
                                handleChange={handleChange1}
                                labelText={field.labelText}
                                labelFor={field.labelFor}
                                id={field.id}
                                name={field.name}
                                type={field.type}
                                isRequired={field.isRequired}
                                placeholder={field.placeholder}
                                maxLength={field.maxLength}
                            />
                        ))}
                        {/* Display the "Send OTP" button */}
                        <FormAction handleSubmit={handleSubmit1} text="Send OTP" />
                    </form>
                </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
                <div id='PR2'>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit2}>
                        {/* Map over fields2 and create Input components for OTP verification */}
                        {fields2.map((field) => (
                            <Input
                                key={field.id}
                                value={OtpVerificationState[field.id]}
                                handleChange={handleChange2}
                                labelText={field.labelText}
                                labelFor={field.labelFor}
                                id={field.id}
                                name={field.name}
                                type={field.type}
                                isRequired={field.isRequired}
                                placeholder={field.placeholder}
                                minLength={field.minLength}
                                maxLength={field.maxLength}
                            />
                        ))}
                        {/* Display the "Validate OTP" button */}
                        <FormAction handleSubmit={handleSubmit2} text="Validate OTP" />
                    </form>

                    {/* <div className="mt-2 text-sm text-gray-600" hidden={!timerRunning}>
                        Resend OTP in {remainingTime} seconds
                    </div>
                    <div hidden={remainingTime !== 0}>
                        <button className="text-sm font-medium text-purple-600 hover:text-purple-500" onClick={handleResendOTP}>Resend OTP</button>
                    </div> */}

                </div>
            )}

            {/* Div for new Password input */}
            {step === 3 && (
                <div id='PR3'>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit3}>
                        <div className="-space-y-px">
                            {/* Map over fields3 and create Input components for new password input */}
                            {fields3.map((field) => (
                                <Input
                                    key={field.id}
                                    handleChange={handleChange3}
                                    value={passwordUpdateState[field.id]}
                                    labelText={field.labelText}
                                    labelFor={field.labelFor}
                                    id={field.id}
                                    name={field.name}
                                    type={field.type}
                                    isRequired={field.isRequired}
                                    placeholder={field.placeholder}
                                    maxLength={field.maxLength}
                                />
                            ))}
                        </div>
                        {/* Display the "Update Password" button */}
                        <FormAction handleSubmit={handleSubmit3} text="Update Password" />
                    </form>
                </div>
            )}

        </div>
    );
}