import { useState, useEffect } from 'react';
import { DotPulse } from '@uiball/loaders';

export default function Dashboard() {
    // State variables to track loading status and questions data
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState([]);

    // State to control the status of Submit buton
    const [submitStatus, setSubmitStatus] = useState(true);

    // State to control flash messages
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });


    // Function to handle flash messages
    const handleFlashMessage = (text, success) => {
        setFlashMessage({ text, success, failure: !success });
        setTimeout(() => setFlashMessage({ text: "", success: false, failure: false }), 5000);
    };

    // Fetch summary data when the component mounts
    useEffect(() => {
        async function fetchSummaryData() {
            try {
                setLoading(true); // Set loading to true while fetching data

                const response = await fetch("/summary"); // Fetch summary data from the backend
                if (response.ok) {
                    const data = await response.json();
                    setQuestions(data.questions); // Update questions state with fetched data

                    // Auto submitting the session when tab switching is vialoted
                    // const urlParams = new URLSearchParams(window.location.search);
                    // const sessionTypeParam = urlParams.get('navigationViolated');
                    // if (sessionTypeParam === "true") {
                    //     handleSubmitButton();
                    // }

                    const urlParams = new URLSearchParams(window.location.search);
                    const message = urlParams.get('message');
                    console.log(message)
                    if (message) {
                        handleFlashMessage(message);
                    }
                } else if (response.status === 401) {
                    handleFlashMessage("Unauthorized access.Please Login", false);
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                }
            } catch (error) {
                console.error(error);
                handleFlashMessage("Error:" + error, false);
            } finally {
                setLoading(false);
            }
        }
        fetchSummaryData();
    }, []);

    // Function to handle the submit button click
    const handleSubmitButton = async () => {
        setLoading(true); // Show the loader when the submit button is clicked

        try {
            // Make an HTTP POST request to create a session
            const response = await fetch("/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // You can include a request body here if needed
            });


            if (response.ok) {
                const updatedQuestions = questions.map((question) => {
                    let statusValue = (question.recorded_flag === 0 && response.ok) ? false : true;

                    const updatedQuestion = {
                        ...question,
                        status: statusValue,
                    };
                    return updatedQuestion;
                });
                setQuestions(updatedQuestions);
                handleFlashMessage("Submission completed; please review the status.", true);
            } else if (response.status === 401) {
                handleFlashMessage("Unauthorized access. Please Login", false);
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else if (response.status === 404) {
                handleFlashMessage("Video or audio for this session not found. Please try again or Login again", false);
            } else if (response.status === 400) {
                handleFlashMessage("Something went wrong. Please try again or Login again", false);
            } else {
                console.error('Failed to create Whisper session');
            }
        } catch (error) {
            // Handle any network or request error here
            console.error('An error occurred:', error);
            handleFlashMessage('An error occurred:' + error, false);
        } finally {
            setLoading(false); // Hide the loader when the operation is complete
            setSubmitStatus(false);
        }
    };

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

    // Function to display a checkmark or cross symbol based on a flag
    const getFlagSymbol = (flag) => {
        // "&#9989;" for true (checkmark) and "&#10062;" for false (cross)
        return flag ? "\u2714" : "\u2716"; // "\u2714" for true (checkmark) and "\u2716" for false (cross)
    }


    return (
        <div>

            {/* Displaying failure flash message */}
            {flashMessage.failure && (
                <div id="failFlashMsg">
                    {flashMessage.text}
                </div>
            )}
            {flashMessage.success && (
                <div id="successFlashMsg">{flashMessage.text}</div>
            )}
            {/* Display a table to show question data */}
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '10px' }}>
                <table
                    style={{
                        borderCollapse: 'collapse',
                        width: '100%',
                    }}
                >
                    <thead style={{ position: 'sticky', top: 0, background: 'rgba(255, 255, 255, 1)' }}>
                        <tr>
                            {['Question', 'Question Recorded', 'Question Saved', 'Status'].map((header, index) => (
                                <th key={index} style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Map through questions and display their details */}
                        {questions.map((question, index) => (
                            <tr key={index}>
                                <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>
                                    <div style={{ maxHeight: '50px', overflowY: 'auto' }}>{question.question}</div>
                                </td>
                                <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{getFlagSymbol(question.recorded_flag)}</td>
                                <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{getFlagSymbol(question.saved_flag)}</td>
                                <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{getFlagSymbol(question.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <br />
            <div className="flex justify-center mt-4">
                {/* Submit button with loading spinner */}
                <button
                    className={`group relative flex py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
                    onClick={handleSubmitButton}
                    disabled={loading || !submitStatus} // Disable the button while loading
                    style={{ width: loading ? '125px' : 'auto' }} // Increase width when loading
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <br />
                            <DotPulse size={35} color="black" />
                        </div>
                    ) : 'Submit'}
                </button>

                {/* Logout button */}
                <button
                    className="group relative flex py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ml-10"
                    onClick={handleLogoutButton}
                >
                    Logout
                </button>
            </div>

        </div>
    );
}