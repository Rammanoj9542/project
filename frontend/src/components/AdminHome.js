import { useState } from 'react';
import Select from 'react-select';
import { registrationFields } from "../constants/formFields";
import FormAction from "./FormAction";
import Input from "./Input";

// Define the initial state for form fields
const fields = registrationFields;

// Initialize the form state with empty values for each field
let fieldsState = {};
fields.forEach(field => fieldsState[field.id] = '');

export default function AdminHome() {

    // Declare and initialize state variables
    const [addHierarchyState, setAddHierarchyState] = useState({
        spaceid: '',
        hierarchyName: ''
    });
    const [updateHierarchyState, setUpdateHierarchyState] = useState({
        oldHierarchyName: '',
        newHierarchyName: ''
    });
    const [manageHierarchyState, setManageHierarchyState] = useState({
        spaceid: '',
        hierarchyid: '',
        quesNumber: ''
    })

    const [selectedFile, setSelectedFile] = useState(null);
    const [spaceInfo, setSpaceInfo] = useState([]);
    const [usersInfo, setUsersInfo] = useState([]);
    const [hierarchyInfo, setHierarchyInfo] = useState([]);

    const [activeUsers, setActiveUsers] = useState([]);
    const [availableQuestionCount, setAvailableQuestionCount] = useState("");
    const [signupState, setSignupState] = useState(fieldsState);
    const [assignHierarchyState, setAssignHierarchyState] = useState({
        spaceid: '',
        hierarchyid: '',
        selectedUsers: []
    });
    const [activeUsersState, setActiveUsersState] = useState({
        spaceid: ''
    });

    const [divNumber, setDivNumber] = useState(0);
    const [menuNumber, setMenuNumber] = useState(0);

    // State to control flash messages
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });

    // Function to handle flash messages
    const handleFlashMessage = (text, success) => {
        setFlashMessage({ text, success, failure: !success });
        setTimeout(() => setFlashMessage({ text: "", success: false, failure: false }), 3000);
    };
    // Function to handle input field changes
    const handleChange1 = (e) => {
        setAddHierarchyState({ ...addHierarchyState, [e.target.id]: e.target.value });
    }
    const handleChange2 = (e) => {
        setUpdateHierarchyState({ ...updateHierarchyState, [e.target.id]: e.target.value });
    }
    const handleChange4 = (e) => {
        const { id, value } = e.target;

        if (id === 'spaceid') {
            getHierarchyInfoOfSpace(value);
            setManageHierarchyState({ ...manageHierarchyState, [id]: value });
        } else if (id === "hierarchyid") {
            setManageHierarchyState({ ...manageHierarchyState, [id]: value });
            fetchAvailableQuestionCount(manageHierarchyState.spaceid, value);
        } else if (id === "quesNumber") {
            const onlyNums = value.replace(/[^0-9]/g, '');

            // Range validation for quesNumber
            const min = 1;
            const max = availableQuestionCount;

            let newValue = onlyNums;
            if (newValue !== '') {
                newValue = Math.min(Math.max(parseInt(newValue, 10), min), max).toString();
            }
            setManageHierarchyState({ ...manageHierarchyState, [id]: newValue });
        } else {
            setManageHierarchyState({ ...manageHierarchyState, [id]: value });
        }
    };
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
    };
    const handleChange5 = (e) => {
        if (e.target.id === "contactnumber") {
            const onlyNums = e.target.value.replace(/[^0-9]/g, ''); // Remove any non-numeric characters
            setSignupState({ ...signupState, [e.target.id]: onlyNums });
        } else {
            setSignupState({ ...signupState, [e.target.id]: e.target.value });
        }
    };
    const handleChange6 = (e) => {
        const { id, value } = e.target;

        if (id === 'spaceid') {
            getHierarchyInfoOfSpace(value);
            getUsersInfo(value);
            setAssignHierarchyState({ ...assignHierarchyState, [id]: value });
        } else if (id === 'selectedUsers') {
            // For multi-option dropdown
            setAssignHierarchyState({ ...assignHierarchyState, selectedUsers: value });
        } else {
            setAssignHierarchyState({ ...assignHierarchyState, [e.target.id]: e.target.value });
        }
    }
    const handleChange7 = (e) => {
        if (e.target.id === "spaceid") {
            setActiveUsersState({ ...activeUsersState, [e.target.id]: e.target.value });
            getActiveUsers(e.target.value);
        } else {
            setActiveUsersState({ ...activeUsersState, [e.target.id]: e.target.value });
        }
    }

    // Function to get spaces info
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
            } else if (response.status === 404) {
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

    // Function to get hierarchies info
    async function getHierarchyInfo() {
        try {
            const response = await fetch("/api/get_hierarchy_data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                setHierarchyInfo(data);
            } else if (response.status === 404) {
                handleFlashMessage("data not found", false, 5000);
            }

            else {
                console.error("Server error. Please try again.");
                handleFlashMessage("Server. Please try again.", false, 3000);
            }
        } catch (error) {
            console.error("Error fetching admin hierarchy IDs:", error);
        }
    }

    // Function to get hierarchies info
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
            } else if (response.status = 404) {
                handleFlashMessage("hierarchy not found.", false, 5000);
            }
            else {
                console.error("Server error. Please try again.");
                handleFlashMessage("Server error. Please try again.", false, 3000);
            }
        } catch (error) {
            console.error("Error fetching admin hierarchy IDs:", error);
        }
    }

    // Function to get users info
    async function getUsersInfo(spaceid) {
        try {
            const response = await fetch("/api/get_users_of_space", {
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
                setUsersInfo(data);
            } else if (response.status === 404) {
                handleFlashMessage("data not found.", false, 5000);
            }
            else {
                console.error("Server error. Please try again.");
                handleFlashMessage("Server error. Please try again.", false, 3000);
            }
        } catch (error) {
            console.error("Error fetching users of a space:", error);
        }
    }

    const handleAddHierarchy = (e) => {
        e.preventDefault();

        // Retrieve entered details
        var selectedSpaceID = addHierarchyState.spaceid;
        var enteredHierarchyName = addHierarchyState.hierarchyName;

        fetch("/create_hierarchy", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                spaceid: selectedSpaceID,
                hierarchyName: enteredHierarchyName,
            }),
        })
            .then((response) => {
                if (response.ok) {
                    handleFlashMessage("Hierarchy created successfully", true, 2000);
                } else if (response.status === 409) {
                    handleFlashMessage("Hierarchy already exists.", false, 2000);
                } else {
                    console.error("Server error. Please try again.");
                    handleFlashMessage("Server error. Please try again.", false, 3000);
                }
            })
            .catch((error) => {
                console.error("Error creating hierarchy:", error);
            })
            .finally(() => {
                resetForms();
            });
    }

    // Update the click handler for hierarchy IDs
    const handleHierarchyClick = async (name) => {
        setDivNumber(2);

        setUpdateHierarchyState({
            oldHierarchyName: name,
            newHierarchyName: name

        });
    };

    const handleUpdateHierarchy = (e) => {
        e.preventDefault();

        // Retrieve entered details
        var oldHierarchyName = updateHierarchyState.oldHierarchyName;
        var newHierarchyName = updateHierarchyState.newHierarchyName;

        fetch("/update_hierarchy", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                oldHierarchyName: oldHierarchyName,
                newHierarchyName: newHierarchyName,
            }),
        })
            .then((response) => {
                if (response.ok) {
                    handleFlashMessage("Hierarchy updated successfully", true, 2000);
                    resetForms();
                    setDivNumber(3);
                    getHierarchyInfo();
                } else if (response.status === 409) {
                    handleFlashMessage("Hierarchy name already exists.", false, 2000);
                } else {
                    console.error("Server error. Please try again.");
                    handleFlashMessage("Server error. Please try again.", false, 3000);
                }
            })
            .catch((error) => {
                console.error("Error updating hierarchy:", error);
            })
    }

    const handleFileSubmit = async (e) => {
        e.preventDefault();

        if (!manageHierarchyState.spaceid || !manageHierarchyState.hierarchyid) {
            handleFlashMessage("Please select a space and hierarchy", false, 3000);
            return;
        }

        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const requestBody = new FormData();
            requestBody.append('spaceid', manageHierarchyState.spaceid);
            requestBody.append('hierarchyid', manageHierarchyState.hierarchyid);
            requestBody.append('files', selectedFile);

            try {
                const response = await fetch('/uploadFile', {
                    method: 'POST',
                    body: requestBody
                });

                if (response.ok) {
                    resetForms();

                    // Clear the file input field value
                    const fileInput = document.getElementById('fileInput');
                    if (fileInput) {
                        fileInput.value = '';
                    }

                    handleFlashMessage("Questions uploaded successfully", true, 2000);
                } else if (response.status === 400) {
                    handleFlashMessage(`Error uploading file.`, false, 3000);
                } else if (response.status === 404) {
                    handleFlashMessage(`The hierarchical table does not exist in the database.`, false, 3000);
                } else {
                    console.error('File upload failed.');
                    handleFlashMessage("File upload failed. Please try again", false, 3000);
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                handleFlashMessage(`Error uploading file: ${error}`, false, 3000);
            }
        } else {
            console.warn('No file selected');
            handleFlashMessage("No file selected", false, 2000);
        }
    };

    const handleQuestionNoSubmit = async (e) => {
        e.preventDefault();

        if (!manageHierarchyState.spaceid || !manageHierarchyState.hierarchyid) {
            handleFlashMessage("Please select a space and hierarchy", false, 3000);
            return;
        }

        // Retrieve required details
        var spaceid = manageHierarchyState.spaceid;
        var hierarchyid = manageHierarchyState.hierarchyid;
        var quesCount = manageHierarchyState.quesNumber;

        try {
            // Send a POST request to the `/submit_number` route
            const response = await fetch("/submit_number", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    numberInput: quesCount,
                    spaceid: spaceid,
                    hierarchyid: hierarchyid,
                }),
            });

            if (response.status === 200) {
                handleFlashMessage("Selected questions successfully", true);
                fetchAvailableQuestionCount(manageHierarchyState.spaceid, manageHierarchyState.hierarchyid);
                setManageHierarchyState({
                    ...manageHierarchyState,
                    quesNumber: '',
                });
            } else if (response.status === 400) {
                handleFlashMessage("Please enter a valid number", false);
            } else {
                console.error("Error: Failed to send JSON response to API app");
                handleFlashMessage("Failed to select questions. Please select a number less than questions remaining", false);
            }
        } catch (error) {
            console.error("Error: An error occurred", error);
            handleFlashMessage("Error: " + error, false);
        }
    }

    const fetchAvailableQuestionCount = async (spaceid, hierarchyid) => {
        try {
            const response = await fetch("/available_question_count", {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    spaceid: spaceid,
                    hierarchyid: hierarchyid,
                }),
            });

            if (response.status === 200) {
                const data = await response.json();
                setAvailableQuestionCount(data.available_question_count);
            } else {
                console.error("Error: Failed to fetch available_question_count");
                handleFlashMessage("Failed to fetch available_question_count", false);
            }
        } catch (error) {
            console.error("Error: An error occurred while fetching available_question_count", error);
            handleFlashMessage("Error: " + error, false);
        }
    };

    // Function to reset question flags
    const handleResetButton = async () => {
        try {

            if (!manageHierarchyState.spaceid || !manageHierarchyState.hierarchyid) {
                handleFlashMessage("Please select a space and hierarchy", false, 3000);
                return;
            }

            // Retrieve required details
            var spaceid = manageHierarchyState.spaceid;
            var hierarchyid = manageHierarchyState.hierarchyid;

            const response = await fetch("/reset_question_flags", {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    spaceid: spaceid,
                    hierarchyid: hierarchyid,
                }),
            });

            if (response.status === 200) {
                handleFlashMessage("Question flags reset successfully", true);
                //resetForms();
                fetchAvailableQuestionCount(manageHierarchyState.spaceid, manageHierarchyState.hierarchyid);
            } else {
                console.error("Error: Failed to reset question flags");
                handleFlashMessage("Failed to reset question flags", false);
            }
        } catch (error) {
            console.error("Error: An error occurred while resetting question flags", error);
            handleFlashMessage("An error occurred while resetting question flags", false);
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
            resetForms();
        } else if (response.status === 400) {
            handleFlashMessage("Username or email already exists", false);
        } else if (response.status === 500) {
            handleFlashMessage("Error registering. Please try again", false);
        } else {
            console.log("Unknown error");
            handleFlashMessage("An unknown error occurred. Please try again later.", false);
        }
    };

    // Function to handle registration
    const handleRegButton = async (e) => {
        e.preventDefault();
        const validationResult = isValidPassword(signupState.password);
        if (!validationResult.isValid) {
            // Handle case where the password does not meet the criteria
            handleFlashMessage(`Password must contain at least ${validationResult.missingCriteria}.`, false);
        } else {
            await createAccount();
        }
    };

    const handleAssignHierarchy = (e) => {
        e.preventDefault();

        const userIds = assignHierarchyState.selectedUsers.map(user => user.value);
        // Now adminIds contains an array of admin IDs

        // Retrieve entered details
        var selectedHierarchy = [assignHierarchyState.hierarchyid];

        fetch("/assign_hierarchy", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                hierarchy_ids: selectedHierarchy,
                user_ids: userIds,
            }),
        })
            .then((response) => {
                if (response.ok) {
                    handleFlashMessage("Hierarchy assigned successfully", true, 2000);
                } else if (response.status === 400) {
                    handleFlashMessage("User already has a hierarchy assigned.", false, 3000);
                } else if (response.status === 404) {
                    handleFlashMessage("required data is not found", false, 3000);
                }

                else {
                    console.error("Server error. Please try again.");
                    handleFlashMessage("Server error. Please try again.", false, 3000);
                }
            })
            .catch((error) => {
                console.error("Error assigning hierarchy:", error);
            })
            .finally(() => {
                resetForms();
            });
    }

    async function getActiveUsers(spaceid) {
        try {
            const response = await fetch("/active_users", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ spaceid: spaceid }),
            });

            if (response.ok) {
                const data = await response.json();
                setActiveUsers(data);
            } else {
                console.error("Server error. Please try again.");
                handleFlashMessage("Server error. Please try again.", false, 3000);
            }
        } catch (error) {
            console.error("Error fetching active users:", error);
        }
    }

    // Function to handle hierarchy button click
    const handleHierarchyButton = () => {
        setManageHierarchyState({
            spaceid: '',
            hierarchyid: '',
        });

        setMenuNumber(1);
        setDivNumber(3);
        getHierarchyInfo();
    }

    // Function to handle user access click
    const handleAccessButton = () => {
        setAssignHierarchyState({
            spaceid: '',
            hierarchyid: '',
        });
        setMenuNumber(2);
        setDivNumber(0);
    }

    // Function to handle dashboard button click
    const handleDashboardButton = () => {
        window.location.href = '/dashboard';
    }

    const showAddHierarchyForm = () => {
        setDivNumber(1);
        getSpaceInfo();
    }

    const viewHierarchiesDiv = () => {
        setDivNumber(3);
        getHierarchyInfo();
    }

    const showManageHierarchyForm = () => {
        setDivNumber(4);
        getSpaceInfo();
    }

    const showRegistrationForm = () => {

        setDivNumber(5);
        getSpaceInfo();
    }

    const showManageHierarchyDiv = () => {
        setAssignHierarchyState({
            spaceid: '',
            hierarchyid: '',
        });
        setDivNumber(6);
        getSpaceInfo();
    }

    const handleActiveUsersButton = () => {
        setAssignHierarchyState({
            spaceid: '',
            hierarchyid: '',
        });
        setDivNumber(7);
        getSpaceInfo();
    }

    // Function to reset the forms to its initial state
    const resetForms = () => {
        setAddHierarchyState({
            spaceid: '',
            hierarchyName: ''
        });
        setUpdateHierarchyState({
            oldHierarchyName: '',
            newHierarchyName: ''
        });
        const signupState = {};
        fields.forEach(field => signupState[field.id] = '');
        setSignupState(signupState);
        setSignupState({
            spaceid: ''
        })
        setAssignHierarchyState({
            spaceid: '',
            hierarchyid: '',
            selectedUsers: []
        })
        setManageHierarchyState({
            spaceid: '',
            hierarchyid: '',
            quesNumber: ''
        })
    };

    const h1Style = {
        textAlign: 'center',
        fontWeight: 'bold',
        marginTop: '5px'
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

            <div className="flex justify-center mt-4">
                <button className="group relative flex py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500" onClick={handleHierarchyButton}>
                    Hierarchies
                </button>
                <button className="group relative flex py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ml-10" onClick={handleAccessButton}>
                    Access
                </button>
                <button className="group relative flex py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ml-10" onClick={handleDashboardButton}>
                    Dashboard
                </button>
            </div>

            {/* Spaces Menu */}
            {menuNumber === 1 && (
                <div id='hierarchy' className="flex justify-center space-x-10" style={{ margin: '10px 0px 10px 0px' }}>
                    <button
                        onClick={() => {
                            showAddHierarchyForm();
                            setManageHierarchyState({
                                ...manageHierarchyState,
                                spaceid: '',
                                hierarchyid: '',
                            });
                        }}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        Add
                    </button>
                    <button
                        onClick={() => {
                            viewHierarchiesDiv();
                            setManageHierarchyState({
                                ...manageHierarchyState,
                                spaceid: '',
                                hierarchyid: '',
                            });
                        }}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        View
                    </button>

                    <button
                        onClick={showManageHierarchyForm}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        Manage
                    </button>
                </div>
            )}

            {/* Access Menu */}
            {menuNumber === 2 && (
                <div id='access' className="flex justify-center space-x-10" style={{ margin: '10px 0px 10px 0px' }}>
                    <button
                        onClick={showRegistrationForm}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        Register
                    </button>
                    <button
                        onClick={showManageHierarchyDiv}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        Manage
                    </button>
                    <button
                        onClick={handleActiveUsersButton}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        Active Users
                    </button>
                </div>
            )}

            {divNumber === 1 && (
                <div>
                    <h1 style={h1Style}>Add Hierarchy</h1>

                    <form className="mt-6 space-y-6" onSubmit={handleAddHierarchy}>
                        <div className="">
                            <div className="mb-2">
                                <select
                                    id="spaceid"
                                    name="spaceid"
                                    value={addHierarchyState.spaceid}
                                    onChange={handleChange1}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required>
                                    <option value="">Select Space</option>
                                    {spaceInfo.map((space) => (
                                        <option key={space} value={space}>
                                            {space}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-2">
                                <Input
                                    handleChange={handleChange1}
                                    value={addHierarchyState.hierarchyName}
                                    id="hierarchyName"
                                    name="hierarchyName"
                                    type="text"
                                    isRequired={true}
                                    placeholder={"Enter Hierarchy Name"}
                                    maxLength={30}
                                />
                            </div>
                        </div>

                        {/* Form submission action button */}
                        <FormAction handleSubmit={handleAddHierarchy} text="Add Hierarchy" />
                    </form>
                </div>
            )}

            {divNumber === 2 && (
                <div>
                    <h1 style={h1Style}>Update Hierarchy</h1>

                    <form className="mt-6 space-y-6" onSubmit={handleUpdateHierarchy}>
                        <div className="">
                            <div className="mb-2">
                                <select
                                    id="oldHierarchyName"
                                    name="oldHierarchyName"
                                    value={updateHierarchyState.oldHierarchyName}
                                    onChange={handleChange2}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required>
                                    <option value="">Select Hierarchy</option>
                                    {hierarchyInfo.map((hierarchy) => (
                                        <option key={hierarchy.hierarchy_name} value={hierarchy.hierarchy_name}>
                                            {hierarchy.hierarchy_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-2">
                                <Input
                                    handleChange={handleChange2}
                                    value={updateHierarchyState.newHierarchyName}
                                    id="newHierarchyName"
                                    name="newHierarchyName"
                                    type="text"
                                    isRequired={true}
                                    placeholder="Enter new Hierarchy Name"
                                    maxLength={30}
                                />
                            </div>
                        </div>

                        {/* Form submission action button */}
                        <FormAction handleSubmit={handleUpdateHierarchy} text="Update Hierarchy" />
                    </form>
                </div>
            )}

            {divNumber === 3 && (
                <div>
                    <h1 style={h1Style}>View Hierarchies</h1>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'rgba(255, 255, 255, 1)' }}>
                                <tr>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>S No.</th>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Space ID</th>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Hierarchy ID</th>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Hierarchy Name</th>
                                </tr>
                            </thead>

                            {/* Table body with spaces data */}
                            <tbody>
                                {hierarchyInfo.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>No records found</td>
                                    </tr>
                                ) : (
                                    hierarchyInfo.map((hierarchy, index) => (
                                        <tr key={index}>
                                            <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                                            <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{hierarchy.space_id}</td>
                                            <td
                                                style={{ border: '1.5px solid #ddd', textAlign: 'center', cursor: 'pointer', color: 'blue' }}

                                                onClick={() => handleHierarchyClick(hierarchy.hierarchy_name)}
                                            >
                                                {hierarchy.hierarchy_id}
                                            </td>
                                            <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{hierarchy.hierarchy_name}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {divNumber === 4 && (
                <div>
                    <h1 style={h1Style}>Manage Hierarchies</h1>

                    <form className="mt-6 space-y-6">
                        <div className="">
                            <div className="mb-2">
                                <select
                                    id="spaceid"
                                    name="spaceid"
                                    value={manageHierarchyState.spaceid}
                                    onChange={handleChange4}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required>
                                    <option value="">Select Space</option>
                                    {spaceInfo.map((space) => (
                                        <option key={space} value={space}>
                                            {space}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-2">
                                <select
                                    id="hierarchyid"
                                    name="hierarchyid"
                                    value={manageHierarchyState.hierarchyid}
                                    onChange={handleChange4}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required>
                                    <option value="">Select Hierarchy</option>
                                    {hierarchyInfo.map((hierarchy) => (
                                        <option key={hierarchy.id} value={hierarchy.id}>
                                            {hierarchy.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </form>


                    {manageHierarchyState.spaceid && manageHierarchyState.hierarchyid && (
                        <div>
                            <br />
                            <form className="mt-6 space-y-0" onSubmit={handleFileSubmit}>
                                <Input
                                    id="fileInput"
                                    name="fileInput"
                                    type="file"
                                    handleChange={handleFileChange}
                                    isRequired={true}
                                    multiple={false}
                                    accept=".yaml, .yml"
                                />

                                {/* Form submission action button */}
                                <FormAction handleSubmit={handleFileSubmit} text="Upload Questions" />
                            </form>

                            <br />
                            <form className="mt-4 space-y-0" onSubmit={(e) => handleQuestionNoSubmit(e)}>
                                <div className="-space-y-px">
                                    <Input
                                        id="quesNumber"
                                        key="quesNumber"
                                        handleChange={handleChange4}
                                        value={manageHierarchyState.quesNumber}
                                        name="quesNumber"
                                        type="text"
                                        isRequired={true}
                                        placeholder="Enter the number of questions"
                                    />
                                </div>

                                {/* Form submission action button */}
                                <FormAction handleSubmit={handleQuestionNoSubmit} text="Submit" />
                            </form>

                            {/* Display available question count and reset flags button */}
                            <div className="mt-2 text-center text-sm text-gray-600 mt-5">
                                Number of questions remaining: <span>{availableQuestionCount}</span> <br />
                                <button onClick={handleResetButton} className="font-medium text-purple-600 hover:text-purple-500 mt-2 text-center text-sm mt-5">
                                    RESET Flags
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {divNumber === 5 && (
                <div>
                    <h1 style={h1Style}>User Registration</h1>

                    <form className="mt-6 space-y-6" onSubmit={handleRegButton}>
                        <div className="">
                            <select
                                id="spaceid"
                                name="spaceid"
                                value={signupState.spaceid}
                                onChange={handleChange5}
                                className="mt-1 p-2 border rounded-md w-full"
                                required>
                                <option value="">Select Space</option>
                                {spaceInfo.map((space) => (
                                    <option key={space} value={space}>
                                        {space}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="">
                            {/* Map over form fields and render Input components for each */}
                            {fields.map((field) =>
                                field.type === "select" ? ( // Check if the field is a select dropdown
                                    <div key={field.id} className="mb-4">
                                        <select
                                            id={field.id}
                                            name={field.name}
                                            value={signupState[field.id]}
                                            onChange={handleChange5}
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
                                        handleChange={handleChange5}
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

                        {/* Form submission action button */}
                        <FormAction handleSubmit={handleRegButton} text="Register" />
                    </form>
                </div>
            )}

            {divNumber === 6 && (
                <div>
                    <h1 style={h1Style}>Manage Access</h1>

                    <form className="mt-6 space-y-6" onSubmit={handleAssignHierarchy}>
                        <div className="">
                            <div className="mb-2">
                                <select
                                    id="spaceid"
                                    name="spaceid"
                                    value={assignHierarchyState.spaceid}
                                    onChange={handleChange6}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required>
                                    <option value="">Select Space</option>
                                    {spaceInfo.map((space) => (
                                        <option key={space} value={space}>
                                            {space}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-2">
                                <select
                                    id="hierarchyid"
                                    name="hierarchyid"
                                    value={assignHierarchyState.hierarchyid}
                                    onChange={handleChange6}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required>
                                    <option value="">Select Hierarchy</option>
                                    {hierarchyInfo.map((hierarchy) => (
                                        <option key={hierarchy.id} value={hierarchy.id}>
                                            {hierarchy.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-2">
                                <Select
                                    isMulti
                                    id="selectedUsers"
                                    name="selectedUsers"
                                    placeholder="Select Users"
                                    value={assignHierarchyState.selectedUsers}
                                    onChange={(selectedOptions) => handleChange6({ target: { id: 'selectedUsers', value: selectedOptions } })}
                                    className="mt-1 rounded-md w-full"
                                    options={usersInfo.map(user => ({ value: user.user_id, label: user.username }))}
                                    required
                                />
                            </div>
                        </div>

                        {/* Form submission action button */}
                        <FormAction handleSubmit={handleAssignHierarchy} text="Assign Users" />
                    </form>
                </div>
            )}

            {divNumber === 7 && (
                <div>
                    <h1 style={h1Style}>Active Users</h1>

                    <div className="">
                        <select
                            id="spaceid"
                            name="spaceid"
                            value={activeUsersState.spaceid}
                            onChange={handleChange7}
                            className="mt-1 p-2 border rounded-md w-full"
                            required>
                            <option value="">Select Space</option>
                            {spaceInfo.map((space) => (
                                <option key={space} value={space}>
                                    {space}
                                </option>
                            ))}
                        </select>
                    </div>

                    {activeUsersState.spaceid && (
                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '10px' }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'rgba(255, 255, 255, 1)' }}>
                                    <tr>
                                        <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>S No.</th>
                                        <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Space ID</th>
                                        <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Username</th>
                                    </tr>
                                </thead>

                                {/* Table body with active users data */}
                                <tbody>
                                    {activeUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>No active users</td>
                                        </tr>
                                    ) : (
                                        activeUsers.map((user, index) => (
                                            <tr key={index}>
                                                <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                                                <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{activeUsersState.spaceid}</td>
                                                <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{user.username}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}