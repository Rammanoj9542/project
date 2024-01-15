import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function Dashboard() {
    // State variables to manage the user's selections and flash messages

    // State to control flash messages
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });
    const [manageHierarchyState, setManageHierarchyState] = useState({
        spaceid: '',
        hierarchyid: '',
        username: '',
        session: '',
    })
    // State variables to store data fetched from the server
    const [users, setUsers] = useState([]); // To store usernames
    const [sessions, setSessions] = useState([]); // Store distinct session IDs
    const [transactions, setTransactions] = useState([]); // Store transaction data


    // State variables to control the visibility of transaction table and chart
    const [showTransactions, setShowTransactions] = useState(false);
    const [showUserField, setShowUserField] = useState(false)
    const [showChart, setShowChart] = useState(false);
    const [chartDetails, setChartDetails] = useState({});
    const [sessionOptions, setSessionOptions] = useState([]);


    const [hierarchyInfo, setHierarchyInfo] = useState([]);
    const [spaceInfo, setSpaceInfo] = useState([]);

    // Fetch session data function
    const fetchSessionData = async (hierarchyid, username) => {
        try {
            const requestData = {
                username: username,
                hierarchy_id: hierarchyid,
            };
            const response = await fetch("/get_sessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            // Update state with the received data
            setSessionOptions(data);
        } catch (error) {
            console.error("Error fetching session data:", error);
        }
    };


    // Handle session change function
    const handleSessionChange = (event) => {
        const selectedSession = event.target.value;

        // Update local state first
        setManageHierarchyState((prevState) => ({
            ...prevState,
            session: selectedSession,
        }));

    };

    // Function to handle flash messages
    const handleFlashMessage = (text, success) => {
        setFlashMessage({ text, success, failure: !success });
        setTimeout(() => setFlashMessage({ text: "", success: false, failure: false }), 2000);
    };


    const handleSpaceChange = (event) => {
        const selectedSpace = event.target.value;
        setManageHierarchyState((prevState) => ({
            ...prevState,
            spaceid: selectedSpace
        }));
    };
    // Handle input changes

    const handleUserChange = (event) => {
        const selectedUser = event.target.value;
        setManageHierarchyState((prevState) => ({
            ...prevState,
            username: selectedUser,
        }));
    };



    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        setShowChart(false);
        setShowTransactions(true);
        getTransactions();
    }

    async function getHierarchyInfoOfSpace(spaceid) {
        try {
            const response = await fetch("/api/get_hierarchy_data_of_space", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    spaceid: spaceid,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setHierarchyInfo(data);
            }else if (response.status === 404) {
                handleFlashMessage(" hierarchies not found for the selected space", false, 5000);
            }
            else {
                console.error("Server error. Please try again.");
                handleFlashMessage("Server error. Please try again.", false, 3000);
            }
        } catch (error) {
            console.error("Error fetching admin hierarchy IDs:", error);
        }
    }


    async function getSpaceInfo() {
        try {
            const response = await fetch("/api/get_admin_spaceids", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSpaceInfo(data);
            }else if (response.status === 404) {
                handleFlashMessage("data not found", false, 5000);
            }
            else {
                console.error("Server error. Please try again.");
                handleFlashMessage("Server error. Please try again.", false, 3000);
            }
        } catch (error) {
            console.error("Error fetching admin space IDs:", error);
        }
    }

    async function getUserInfoOfHierarchy(hierarchyid) {
        console.log("getUserInfoOfHierarchy - Start", hierarchyid);

        {
            const response = await fetch("/api/get_users_by_hierarchies", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    hierarchy_id: hierarchyid,
                }),
            });

            if (response.status === 200) {
                const data = await response.json();
                console.log("getUserInfoOfHierarchy - Received Data", data);

                // Use the callback version of setUsers to ensure synchronous update
                setUsers(data);
                setShowUserField(true);
            } else if (response.status === 404) {
                console.error("Bad request. Please check your input.");
                handleFlashMessage("no users found for the selected hierarchy", false, 3000);

                // Set users to an empty array when no data is received
                setUsers([]);
                setShowUserField(true);
            } else {
                // Handle other non-404 errors
                console.error("Error in API response:", response.status);
                handleFlashMessage(`Error in API response: ${response.status}`, false, 3000);

                // Set users to an empty array on error
                setUsers([]);
                setShowUserField(true);
            }
        }
    }






    // useEffect(() => {
    //     // Call getUserInfoOfHierarchy when hierarchyid changes
    //     console.log("useEffect - Triggered", manageHierarchyState.hierarchyid);

    //     if (manageHierarchyState.hierarchyid) {
    //         getUserInfoOfHierarchy(manageHierarchyState.hierarchyid);
    //     }
    // }, [manageHierarchyState.hierarchyid]);

    // const [dummyState, setDummyState] = useState(false);

    // useEffect(() => {
    //     // This effect runs after the component renders
    //     console.log("useEffect - Data Updated", users);
    //     // Force a re-render by updating a dummy state variable
    //     setDummyState((prev) => !prev);
    // }, [users]);

    // Fetch transaction data from the server
    const getTransactions = async () => {
        const { username, session, hierarchyid } = manageHierarchyState;

        if (!username || !session || !hierarchyid) {
            return;
        }

        try {
            const requestData = {
                username: username,
                session_id: session,
                hierarchy_id: hierarchyid
            };
            const response = await fetch('/dashboardtransactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                console.error("Error fetching transaction data");
                handleFlashMessage("Error fetching transaction data. Please try again.", false);
                return;
            }

            const transactionsData = await response.json();
            setTransactions(transactionsData.transactions_html);
        } catch (error) {
            console.error("An error occurred while fetching transaction data:", error);
            handleFlashMessage("Error: " + error, false);
        }
    };

    // Function to render checkmark (✓) for true and cross mark (✖) for false
    const getFlagSymbol = (flag) => {
        // "&#9989;" for true and "&#10062;" for false
        return flag ? "\u2714" : "\u2716";
    }
    const handleChange4 = (e) => {
        const { id, value } = e.target;

        if (id === 'spaceid') {
            getHierarchyInfoOfSpace(value);
            setManageHierarchyState({ ...manageHierarchyState, [id]: value });
        } else if (id === "hierarchyid") {
            setManageHierarchyState({ ...manageHierarchyState, [id]: value });
        } else if (id === 'username') {
            setManageHierarchyState({ ...manageHierarchyState, [id]: value });
            // Fetch user info when user changes
            getUserInfoOfHierarchy(manageHierarchyState.hierarchyid);
            console.log("hierarchy in getUserInfoOfHierarchy" + manageHierarchyState.hierarchyid);
            console.log("selected user: " + value);
            console.log("manageHierarchyState after user selection:", manageHierarchyState);
        }
    };





    useEffect(() => {
        // Call getUserInfoOfHierarchy when hierarchyid changes
        if (manageHierarchyState.hierarchyid) {
            getUserInfoOfHierarchy(manageHierarchyState.hierarchyid);
        }
    }, [manageHierarchyState.hierarchyid]);


    // Handle fetching and displaying the chart
    const handleChartButton = async () => {
        try {
            // Get the username from the loginState.user object
            const username = manageHierarchyState.user;
            const requestData = {
                username: username,
            };

            // Define the fetch options including the request method, headers, and body
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            };

            const response = await fetch('/chart', requestOptions);

            if (response.status === 200) {
                const chartData = await response.json();
                setChartDetails(chartData);
            } else {
                console.error("Failed to fetch session details");
                handleFlashMessage("Failed to fetch session details", false);
            }
        } catch (error) {
            console.error("Error:", error);
            handleFlashMessage("Error: " + error, false);
        }
        setShowTransactions(false);
        setShowChart(true);
    };

    // CSS class for buttons
    const buttonClass = "group relative flex items-center justify-center py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500";


    return (
        <div>

            {/* Displaying failure flash message */}
            {flashMessage.failure && (
                <div id="failFlashMsg">
                    {flashMessage.text}
                </div>
            )}

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                    <div className="">
                        <div className="mb-2">
                            <select
                                id="spaceid"
                                name="spaceid"
                                value={manageHierarchyState.spaceid}
                                onChange={handleSpaceChange}
                                onClick={getSpaceInfo}
                                className="mt-1 p-2 border rounded-md w-full"
                                required
                            >
                                <option value="">Select Space</option>
                                {spaceInfo.map((space) => (
                                    <option key={space} value={space}>
                                        {space}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {manageHierarchyState.spaceid && (
                            <div className="mb-2">
                                <select
                                    id="hierarchyid"
                                    name="hierarchyid"
                                    value={manageHierarchyState.hierarchyid}
                                    onChange={handleChange4}
                                    onClick={() => getHierarchyInfoOfSpace(manageHierarchyState.spaceid)}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required
                                >
                                    <option value="">Select Hierarchy</option>
                                    {hierarchyInfo.map((hierarchy) => (
                                        <option key={hierarchy.id} value={hierarchy.id}>
                                            {hierarchy.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Form for selecting a user and a session */}
                    {manageHierarchyState.hierarchyid && showUserField && (
                        <div className="">
                            <div className="mb-4">
                                <select
                                    id="username"
                                    name="user"
                                    value={manageHierarchyState.username}
                                    onChange={handleChange4}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required
                                >
                                    <option value="">Select User</option>
                                    {users.map((data) => (
                                        <option key={data} value={data}>
                                            {data}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {manageHierarchyState.username && (
                                <div className="mb-4">
                                    <select
                                        name="session"
                                        value={manageHierarchyState.session}
                                        onChange={handleSessionChange}
                                        onClick={() => fetchSessionData(manageHierarchyState.hierarchyid, manageHierarchyState.username)}
                                        className="mt-1 p-2 border rounded-md w-full"
                                        required
                                    >
                                        <option value="">Select Session</option>
                                        {sessionOptions.map((session, index) => (
                                            <option key={index} value={session}>
                                                {session}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Additional form fields or buttons can be added here as needed */}
            </form>



            {/* Buttons for displaying transactions and the chart */}
            {manageHierarchyState.session && (
                <div className="flex justify-between items-center mt-6">
                    <button
                        onClick={handleSubmit}
                        className={buttonClass}
                        style={{ width: '200px', height: '40px' }}>
                        Transactions
                    </button>
                    <button
                        onClick={handleChartButton}
                        className={buttonClass}
                        style={{ width: '200px', height: '40px' }}>
                        View Chart
                    </button>
                </div>
            )}

            {showTransactions && (
                <div>
                    {/* Header for the Transactions table */}
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Transactions
                    </h2>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'rgba(255, 255, 255, 1)' }}>
                                <tr>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Question ID</th>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Video Flag</th>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>LLM Flag</th>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Result</th>
                                </tr>
                            </thead>
                            {/* Table body with transaction data */}
                            <tbody>
                                {transactions.map((transaction, index) => (
                                    <tr key={index}>
                                        <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{transaction.questionId}</td>
                                        <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{getFlagSymbol(transaction.videoFlag)}</td>
                                        <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{getFlagSymbol(transaction.llmFlag)}</td>
                                        <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{transaction.result}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showChart && (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {/* Display an AreaChart using Recharts library */}
                    <AreaChart
                        width={500}
                        height={400}
                        data={chartDetails}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis />
                        <YAxis dataKey="result" />
                        <Tooltip />
                        <Area type="monotone" dataKey="result" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                </div>
            )}

        </div>
    )
}