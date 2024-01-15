import { useState } from 'react';
import { registrationFields } from "../constants/formFields";
import Input from "./Input";

// Define form fields based on the imported registrationFields from constants
const fields = registrationFields;

// Initialize the form state with empty values for each field
let fieldsState = {};
fields.forEach(field => fieldsState[field.id] = '');

export default function Signup() {
    // Declare and initialize state variables
    const [signupState, setSignupState] = useState(fieldsState); // Form field values

    // State to control flash messages
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });

    // Function to handle input field changes
    const handleChange = (e) => {
        if (e.target.id === "contactnumber") {
            const onlyNums = e.target.value.replace(/[^0-9]/g, ''); // Remove any non-numeric characters
            setSignupState({ ...signupState, [e.target.id]: onlyNums });
        } else {
            setSignupState({ ...signupState, [e.target.id]: e.target.value });
        }
    };

    // Function to handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationResult = isValidPassword(signupState.password);
        if (!validationResult.isValid) {
            // Handle case where the password does not meet the criteria
            handleFlashMessage(`Password must contain at least ${validationResult.missingCriteria}.`, false);
        } else {
            await createAccount();
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

    // Handle Account Creation here
    const createAccount = async () => {
        const response = await fetch("/register", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(signupState),
        });

        if (response.status === 200) {
            handleFlashMessage("Account created successfully", true);
            resetForm();
        } else if (response.status === 400) {
            handleFlashMessage("Username or email already exists", false);
        } else if (response.status === 500) {
            handleFlashMessage("Error Registering. Please try again", false);
        } else {
            console.log("Unknown error");
            handleFlashMessage("An unknown error occurred. Please try again later.", false);
        }
    };

    // Function to reset the form to its initial state
    const resetForm = () => {
        const signupState = {};
        fields.forEach(field => signupState[field.id] = '');
        setSignupState(signupState);
    }

    // Function to handle flash messages
    const handleFlashMessage = (text, success) => {
        setFlashMessage({ text, success, failure: !success });
        setTimeout(() => setFlashMessage({ text: "", success: false, failure: false }), 2000);
    };

    // Handle User Account button
    const handleAdminHomeButton = () => {
        window.location.href = '/adminhome';
    };

    // CSS class for buttons
    const buttonClass = "group relative flex items-center justify-center py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500";


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

            {/* Registration form */}
            <form className="mt-8 space-y-6">
                <div className="">
                    {fields.map((field) =>
                        field.type === "select" ? ( // Check if the field is a select dropdown
                            <div key={field.id} className="mb-4">
                                <select
                                    id={field.id}
                                    name={field.name}
                                    value={signupState[field.id]}
                                    onChange={handleChange}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required={field.isRequired}
                                >
                                    {field.options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <Input
                                key={field.id}
                                handleChange={handleChange}
                                value={signupState[field.id]}
                                labelText={field.labelText}
                                labelFor={field.labelFor}
                                id={field.id}
                                name={field.name}
                                type={field.type}
                                isRequired={field.isRequired}
                                placeholder={field.placeholder}
                                maxLength={field.maxLength}
                                minLength={field.minLength}
                            />
                        )
                    )}
                </div>
            </form>

            <div className="flex justify-between items-center mt-6">
                <button
                    onClick={handleAdminHomeButton}
                    className={buttonClass}
                    style={{ width: '200px', height: '40px' }}>
                    Back to Home
                </button>
                <button
                    onClick={handleSubmit}
                    className={buttonClass}
                    style={{ width: '200px', height: '40px' }}>
                    Register
                </button>
            </div>

        </div>
    );
}