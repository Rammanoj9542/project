import React, { useState, useEffect } from 'react';
import { loginFields } from "../constants/formFields";
import FormAction from "./FormAction";
import FormExtra from "./FormExtra";
import Input from "./Input";
import { AES } from 'crypto-js';
import { useNavigate } from 'react-router-dom'; 


// Define form fields based on the imported loginFields from constants
const fields = loginFields;

// Initialize the form state with empty values for each field
let fieldsState = {};
fields.forEach(field => fieldsState[field.id] = '');

export default function Login() {
    const navigate  = useNavigate();

    useEffect(() => {
        const validateAndRedirect = async () => {
          
          const devicehash = localStorage.getItem('devicehash');
          const refreshToken = localStorage.getItem('refresh_token');
          if (devicehash && refreshToken) {
            try {
              const response = await fetch('/validateTokens', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ devicehash, refreshToken }),
              });
    
              const data = await response.json();
    
              if (response.status === 200 && data.valid) {
                const userRole = localStorage.getItem('user_role');
                if (userRole === "user") {
                    navigate.push('/userhome');
                } else if (userRole === "admin") {
                    navigate.push('/adminhome');
                }
              }
            } catch (error) {
              console.error('Error validating tokens:', error.message);
            }
          }
        };
    
        validateAndRedirect();
      }, [navigate]);

    // Declare and initialize state variables
    const [loginState, setLoginState] = useState(fieldsState); // Form field values
    // State to control flash messages
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });

    // Function to handle flash messages
    const handleFlashMessage = (text, success) => {
        setFlashMessage({ text, success, failure: !success });
        setTimeout(() => setFlashMessage({ text: "", success: false, failure: false }), 2000);
    };

    // Function to handle input field changes
    const handleChange = (e) => {
        setLoginState({ ...loginState, [e.target.id]: e.target.value });
    }

    // Function to handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        authenticateUser();
    }

    // Handle Login API Integration here
    const authenticateUser = () => {
        // Extract username and password from the form state
        const usernameInput = loginState.username.toLowerCase();
        const passwordInput = loginState.password;

        // Generate a random encryption key and initialization vector (IV)
        const key = "kojsnhfitonhsuth";
        const iv = "odbshirnkofgfffs";

        // Encrypt the username and password
        const encryptedUsername = AES.encrypt(usernameInput, key, { iv: iv });
        const encryptedPassword = AES.encrypt(passwordInput, key, { iv: iv });

        // Convert the encrypted data to base64-encoded strings
        const encryptedUsernameStr = encryptedUsername.toString();
        const encryptedPasswordStr = encryptedPassword.toString();

        // Send the encrypted credentials to the server
        fetch("/login", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: encryptedUsernameStr,
                password: encryptedPasswordStr,
                iv: iv
            }),
        })
            .then(async (response) => {
                if (response.ok) {
                    // If the login is successful, redirect to the corresponding user role's home page
                    const userData = await response.json();
                    localStorage.setItem('refreshToken', userData.refreshToken);
                    localStorage.setItem('devicehash', userData.devicehash);
                    localStorage.setItem('user_role', userData.role);
                    window.location.href = `/${userData.role}home`;
                } else if (response.status === 401) {
                    const userdata = await response.json();
                    const serverResponse = userdata.detail;
                    handleFlashMessage(serverResponse, false);
                } else {
                    // If the login is unsuccessful, show a flash message and reset the form
                    handleFlashMessage("Invalid login", false);
                    resetForm();
                }
            })
            .catch((error) => {
                console.error("Error authenticating user:", error);
                handleFlashMessage("Error authenticating user", false);
            });
    };

    // Function to reset the form to its initial state
    const resetForm = () => {
        const loginState = {};
        fields.forEach(field => loginState[field.id] = '');
        setLoginState(loginState);
    }


    return (
        <div>

            {/* Displaying failure flash message */}
            {flashMessage.failure && (
                <div id="failFlashMsg">
                    {flashMessage.text}
                </div>
            )}

            {/* Login form */}
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="-space-y-px">
                    {/* Map over form fields and render Input components for each */}
                    {fields.map(field =>
                        <Input
                            key={field.id}
                            handleChange={handleChange}
                            value={loginState[field.id]}
                            labelText={field.labelText}
                            labelFor={field.labelFor}
                            id={field.id}
                            name={field.name}
                            type={field.type}
                            isRequired={field.isRequired}
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                        />
                    )}
                </div>

                {/* Additional form components (e.g., forgot password link) */}
                <FormExtra />

                {/* Login button */}
                <FormAction handleSubmit={handleSubmit} text="Login" />
            </form>

        </div>
    )
}
