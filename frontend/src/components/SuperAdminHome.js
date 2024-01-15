import { useState } from 'react';
import Select from 'react-select';
import { spaceFields, registrationFields } from "../constants/formFields";
import FormAction from "./FormAction";
import Input from "./Input";

// Define the initial state for form fields
const fields1 = spaceFields;
const fields2 = registrationFields;

// Initialize the form state with empty values for each field
let fieldsState1 = {};
fields1.forEach(field => fieldsState1[field.id] = '');

let fieldsState2 = {};
fields2.forEach(field => fieldsState2[field.id] = '');

export default function SuperAdminHome() {

    // Declare and initialize state variables
    const [addSpaceState, setAddSpaceState] = useState(fieldsState1);
    const [updateSpaceState, setUpdateSpaceState] = useState({
        oldSpaceName: '',
        newSpaceName: ''
    });
    const [assignSpaceState, setAssignSpaceState] = useState({
        spaceid: '',
        selectedAdmins: []
    });
    const [signupState, setSignupState] = useState(fieldsState2);

    const [spaceInfo, setSpaceInfo] = useState([]);
    const [adminInfo, setAdminInfo] = useState([]);
    const [activeAdmins, setActiveAdmins] = useState([]);

    const [divNumber, setDivNumber] = useState(0); // State to track the form number
    const [menuNumber, setMenuNumber] = useState(0); // State to track the menu/options number

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
        setAddSpaceState({ ...addSpaceState, [e.target.id]: e.target.value });
    }
    const handleChange2 = (e) => {
        setUpdateSpaceState({ ...updateSpaceState, [e.target.id]: e.target.value });
    }
    const handleChange4 = (e) => {
        if (e.target.id === "contactnumber") {
            const onlyNums = e.target.value.replace(/[^0-9]/g, ''); // Remove any non-numeric characters
            setSignupState({ ...signupState, [e.target.id]: onlyNums });
        } else {
            setSignupState({ ...signupState, [e.target.id]: e.target.value });
        }
    };
    const handleChange5 = (e) => {
        const { id, value } = e.target;

        if (id === 'spaceid') {
            setAssignSpaceState({ ...assignSpaceState, [id]: value });
        } else if (id === 'selectedAdmins') {
            // For multi-option dropdown
            setAssignSpaceState({ ...assignSpaceState, selectedAdmins: value });
        }
    }

    const handleAddSpace = (e) => {
        e.preventDefault();

        // Retrieve entered details
        var enteredSpaceName = addSpaceState.spaceName;

        fetch("/create_space", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                spaceName: enteredSpaceName,
            }),
        })
            .then((response) => {
                if (response.ok) {
                    handleFlashMessage("Space created successfully", true, 2000);
                } else if (response.status === 409) {
                    handleFlashMessage("Space already exists.", false, 2000);
                } else if (response.status === 404) {
                    handleFlashMessage("Spaces not found", false, 5000);
                }
                else {
                    console.error("Server error. Please try again.");
                    handleFlashMessage("Server error. Please try again.", false, 3000);
                }
            })
            .catch((error) => {
                console.error("Error creating space:", error);
            })
            .finally(() => {
                resetForms();
            });
    }

    // Function to get spaces info
    async function getSpaceInfo() {
        try {
            const response = await fetch("/api/get_space_data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSpaceInfo(data);
            } else if (response.status === 404) {
                handleFlashMessage("Spaces not found", false, 5000);
            } 
            else {
                console.error("Server error. Please try again.");
                handleFlashMessage("Server error. Please try again.", false, 3000);
            }
        } catch (error) {
            console.error("Error fetching space IDs:", error);
        }
    }

    // Update the click handler for space IDs
    const handleSpaceClick = async (name) => {
        setDivNumber(2);

        setUpdateSpaceState({
            oldSpaceName: name,
            newSpaceName: name

        });
    };

    const handleUpdateSpace = (e) => {
        e.preventDefault();

        // Retrieve entered details
        var oldSpaceName = updateSpaceState.oldSpaceName;
        var newSpaceName = updateSpaceState.newSpaceName;

        fetch("/update_space", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                oldSpaceName: oldSpaceName,
                newSpaceName: newSpaceName,
            }),
        })
            .then((response) => {
                if (response.ok) {
                    handleFlashMessage("Space updated successfully", true, 2000);
                    resetForms();
                    setDivNumber(3);
                    getSpaceInfo();
                } else if (response.status === 409) {
                    handleFlashMessage("Space name already exists.", false, 2000);
                } else {
                    console.error("Server error. Please try again.");
                    handleFlashMessage("Server error. Please try again.", false, 3000);
                }
            })
            .catch((error) => {
                console.error("Error updating space:", error);
            })
    }

    const handleAssignAdmin = (e) => {
        e.preventDefault();

        const adminIds = assignSpaceState.selectedAdmins.map(admin => admin.value);
        // Now adminIds contains an array of admin IDs

        // Retrieve entered details
        var selectedSpace = assignSpaceState.spaceid;

        fetch("/assign_space", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                space_id: selectedSpace,
                admin_ids: adminIds,
            }),
        })
            .then((response) => {
                if (response.ok) {
                    handleFlashMessage("Space assigned successfully", true, 2000);
                } else if (response.status === 400) {
                    handleFlashMessage("Admin already has a space assigned.", false, 3000);
                } else {
                    console.error("Server error. Please try again.");
                    handleFlashMessage("Server error. Please try again.", false, 3000);
                }
            })
            .catch((error) => {
                console.error("Error assigning space:", error);
            })
            .finally(() => {
                resetForms();
            });
    }

    // Function to get admin info
    async function getAdminInfo() {
        try {
            const response = await fetch("/api/get_adminUsernamesWithoutSpace", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok || response.status === 404) {
                const data = await response.json();
                setAdminInfo(data);
            } else {
                console.error("Server error. Please try again.");
                handleFlashMessage("Server error. Please try again.", false, 3000);
            }
        } catch (error) {
            console.error("Error fetching space IDs:", error);
        }
    }

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

    const getActiveAdmins = async () => {
        fetch("/active_admins", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(async (response) => {
                if (response.ok) {
                    const data = await response.json();
                    setActiveAdmins(data.active_admins);
                }
            })
            .catch((error) => {
                console.error("An error ocurred:", error);
                handleFlashMessage("Error:" + error, false);
            })
    };

    // Function to handle space button click
    const handleSpacesButton = () => {
        setMenuNumber(1);
        setDivNumber(3);
        getSpaceInfo();
    }

    // Function to handle user access click
    const handleAccessButton = () => {
        setMenuNumber(2);
        setDivNumber(0);
    }

    const showAddSpaceForm = () => {
        setDivNumber(1);
    }

    const viewSpacesDiv = () => {
        setDivNumber(3);
        getSpaceInfo();
    }

    const showRegistrationForm = () => {
        setDivNumber(4);
    }

    const showManageSpaceDiv = () => {
        setDivNumber(5);
        getSpaceInfo();
        getAdminInfo();
    }

    const handleActiveAdminsButton = () => {
        getActiveAdmins();
        setDivNumber(6);
    }

    // Function to reset the forms to its initial state
    const resetForms = () => {
        setAddSpaceState({
            spaceName: ''
        });
        setUpdateSpaceState({
            oldSpaceName: '',
            newSpaceName: ''
        });
        setAssignSpaceState({
            spaceid: '',
            selectedAdmins: []
        })
        const signupState = {};
        fields2.forEach(field => signupState[field.id] = '');
        setSignupState(signupState);
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
                <div id="successFlashMsg" style={{ marginTop: '15px' }}>
                    {flashMessage.text}
                </div>
            )}

            {/* Displaying failure flash message */}
            {flashMessage.failure && (
                <div id="failFlashMsg" style={{ marginTop: '15px' }}>
                    {flashMessage.text}
                </div>
            )}

            <div className="flex justify-center mt-4">
                <button className="group relative flex py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500" onClick={handleSpacesButton}>
                    Spaces
                </button>
                <button className="group relative flex py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ml-10" onClick={handleAccessButton}>
                    Access
                </button>
            </div>

            {/* Spaces Menu */}
            {menuNumber === 1 && (
                <div id='spaces' className="flex justify-center space-x-10" style={{ margin: '10px 0px 10px 0px' }}>
                    <button
                        onClick={showAddSpaceForm}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        Add
                    </button>
                    <button
                        onClick={viewSpacesDiv}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        View
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
                        onClick={showManageSpaceDiv}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        Manage
                    </button>
                    <button
                        onClick={handleActiveAdminsButton}
                        className="font-medium text-purple-600 hover:text-purple-500">
                        Active Admins
                    </button>
                </div>
            )}

            {divNumber === 1 && (
                <div>
                    <h1 style={h1Style}>Add Space</h1>

                    <form className="mt-6 space-y-6" onSubmit={handleAddSpace}>
                        <div className="">
                            {/* Map over form fields and render Input components for each */}
                            {fields1.map(field =>
                                <Input
                                    key={field.id}
                                    handleChange={handleChange1}
                                    value={addSpaceState[field.id]}
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

                        {/* Form submission action button */}
                        <FormAction handleSubmit={handleAddSpace} text="Add Space" />
                    </form>
                </div>
            )}

            {divNumber === 2 && (
                <div>
                    <h1 style={h1Style}>Update Space</h1>

                    <form className="mt-6 space-y-6" onSubmit={handleUpdateSpace}>
                        <div className="">
                            <div className="mb-2">
                                <select
                                    id="oldSpaceName"
                                    name="oldSpaceName"
                                    value={updateSpaceState.oldSpaceName}
                                    onChange={handleChange2}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required>
                                    <option value="">Select Space</option>
                                    {spaceInfo.map((space) => (
                                        <option key={space.id} value={space.name}>
                                            {space.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-2">
                                <Input
                                    handleChange={handleChange2}
                                    value={updateSpaceState.newSpaceName}
                                    id="newSpaceName"
                                    name="newSpaceName"
                                    type="text"
                                    isRequired={true}
                                    placeholder="Enter new Space Name"
                                    maxLength={15}
                                />
                            </div>
                        </div>

                        {/* Form submission action button */}
                        <FormAction handleSubmit={handleUpdateSpace} text="Update Space" />
                    </form>
                </div>
            )}

            {divNumber === 3 && (
                <div>
                    <h1 style={h1Style}>View Spaces</h1>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'rgba(255, 255, 255, 1)' }}>
                                <tr>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>S No.</th>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Space ID</th>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Space Name</th>
                                </tr>
                            </thead>
                            {/* Table body with spaces data */}
                            <tbody>
                                {spaceInfo.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>No records found</td>
                                    </tr>
                                ) : (
                                    spaceInfo.map((space, index) => (
                                        <tr key={index}>
                                            <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                                            <td
                                                style={{ border: '1.5px solid #ddd', textAlign: 'center', cursor: 'pointer', color: 'blue' }}
                                                onClick={() => handleSpaceClick(space.name)}
                                            >
                                                {space.id}
                                            </td>
                                            <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{space.name}</td>
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
                    <h1 style={h1Style}>Admin Registration</h1>

                    <form className="mt-6 space-y-6" onSubmit={handleRegButton}>
                        <div className="">
                            {/* Map over form fields and render Input components for each */}
                            {fields2.map((field) =>
                                field.type === "select" ? ( // Check if the field is a select dropdown
                                    <div key={field.id} className="mb-4">
                                        <select
                                            id={field.id}
                                            name={field.name}
                                            value={signupState[field.id]}
                                            onChange={handleChange4}
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
                                        handleChange={handleChange4}
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

            {divNumber === 5 && (
                <div>
                    <h1 style={h1Style}>Manage Access</h1>

                    <form className="mt-6 space-y-6" onSubmit={handleAssignAdmin}>
                        <div className="">
                            <div className="mb-2">
                                <select
                                    id="spaceid"
                                    name="spaceid"
                                    value={assignSpaceState.spaceid}
                                    onChange={handleChange5}
                                    className="mt-1 p-2 border rounded-md w-full"
                                    required>
                                    <option value="">Select Space</option>
                                    {spaceInfo.map((space) => (
                                        <option key={space.id} value={space.id}>
                                            {space.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-2">
                                <Select
                                    isMulti
                                    id="selectedAdmins"
                                    name="selectedAdmins"
                                    placeholder="Select Admins"
                                    value={assignSpaceState.selectedAdmins}
                                    onChange={(selectedOptions) => handleChange5({ target: { id: 'selectedAdmins', value: selectedOptions } })}
                                    className="mt-1 rounded-md w-full"
                                    options={adminInfo.map(admin => ({ value: admin.id, label: admin.name }))}
                                    required
                                />
                            </div>
                        </div>

                        {/* Form submission action button */}
                        <FormAction handleSubmit={handleAssignAdmin} text="Assign Admins" />
                    </form>
                </div>
            )}

            {divNumber === 6 && (
                <div>
                    <h1 style={h1Style}>Active Admins</h1>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'rgba(255, 255, 255, 1)' }}>
                                <tr>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>S No.</th>
                                    <th style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>Username</th>
                                </tr>
                            </thead>
                            {/* Table body with active admins data */}
                            <tbody>
                                {activeAdmins.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>No active admins</td>
                                    </tr>
                                ) : (
                                    activeAdmins.map((username, index) => (
                                        <tr key={index}>
                                            <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                                            <td style={{ border: '1.5px solid #ddd', textAlign: 'center' }}>{username}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    )
}