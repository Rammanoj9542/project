import { useEffect, useState } from 'react';
import axios from 'axios';

export default function UserAccount() {
    // User details state
    const [userDetails, setUserDetails] = useState({});
    // State to control flash messages
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });

    // Call getUserDetails function when the component mounts
    useEffect(() => {
        // Function to fetch user details from the server
        const getUserDetails = async () => {
            try {
                // Make a GET request to your FastAPI backend endpoint
                const response = await axios.post('/get_user_details'); // Update the URL as needed

                if (response.status === 200) {
                    const userDetailsData = response.data;
                    // Update the userDetails state with the fetched data
                    setUserDetails(userDetailsData);
                } else if (response.status === 404) {
                    console.error("Username not found");
                    handleFlashMessage("Username not found", false);
                } else {
                    // Handle other status codes, e.g., display an error message
                    console.error("Failed to fetch user details");
                    handleFlashMessage("Failed to fetch user details", false);
                }
            } catch (error) {
                console.error("Error:", error);
                handleFlashMessage("Error: " + error, false);
            }
        };
        getUserDetails();
    }, []);

    // Function to handle flash messages
    const handleFlashMessage = (text, success) => {
        setFlashMessage({ text, success, failure: !success });
        setTimeout(() => setFlashMessage({ text: "", success: false, failure: false }), 2000);
    };

    // Function to handle the "Back to Home" button click
    const handleHomeButton = () => {
        window.location.href = '/userhome';
    }

    // Function to handle the "Logout" button click
    const handleLogoutButton = () => {
        // Assuming you want to use a GET request to trigger the logout on the server
        fetch('/logout', {
            method: 'GET',
            credentials: 'same-origin', // Include this if you need to send cookies
        })
            .then(response => {
                if (response.status === 200) {
                    // Redirect to the root URL after successful logout
                    window.location.href = '/';
                } else {
                    // Handle the case where logout was not successful (e.g., display an error message)
                    console.error('Logout failed');
                    handleFlashMessage("Logout failed", false);
                }
            })
            .catch(error => {
                console.error('An error occurred during logout:', error);
                handleFlashMessage("An error occurred during logout.", false);
            });
    }

    const InputField = ({ label, value }) => {
        return (
            <div className='flex flex-row items-center' style={{ margin: '0px 40px 10px 40px' }}>
                <label htmlFor={label.toLowerCase()}>{label}:</label>
                <div className="flex-grow"></div>
                <input value={value} className={fixedInputClass} disabled />
            </div>
        );
    }

    // CSS class for input fields
    const fixedInputClass = "rounded-md appearance-none relative block px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm";

    return (
        <div>

            {/* Displaying failure flash message */}
            {flashMessage.failure && (
                <div id="failFlashMsg">
                    {flashMessage.text}
                </div>
            )}

            {/* User detail input fields */}
            <InputField label="First Name" value={userDetails.firstname} />
            <InputField label="Last Name" value={userDetails.lastname} />
            <InputField label="Email" value={userDetails.email} />
            <InputField label="Username" value={userDetails.username} />
            <InputField label="Contact Number:" value={userDetails.contact_number} />
            <InputField label="Role" value={userDetails.role} />

            <br />
            {/* Buttons for "Back to Home" and "Logout" */}
            <div className="flex justify-center mt-4">
                <button className="group relative flex py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500" onClick={handleHomeButton}>
                    Back to Home
                </button>
                <button className="group relative flex py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ml-10" onClick={handleLogoutButton}>
                    Logout
                </button>
            </div>

        </div>
    );
}