import FormAction from "./FormAction";
import React, { useEffect, useState } from "react";
import "@szhsin/react-menu/dist/index.css";
import configData from '../constants/config.json';

export default function UserHome() {
    // State to store the selected radio button option
    const [selectedOption, setSelectedOption] = useState("");
    const [hideModeOption, setHideModeOptions] = useState(false);
    const [hideSessionOption, setHideSessionOption] = useState(false);
    const [hierarchyInfo, setHierarchyInfo] = useState([]);
    const [selectedHierarchy, setSelectedHierarchy] = useState("");

    // State to store the selected practice or assessment session
    const [selectedPracticeAssessment, setSelectedPracticeAssessment] = useState("");

    // State to control flash messages
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });

    // Handle radio button selection for audio or video session
    const handleOptionChange1 = (e) => {
        setSelectedOption(e.target.value);
    };

    // Handle radio button selection for practice or assessment session
    const handleOptionChange2 = (e) => {
        setSelectedPracticeAssessment(e.target.value);
    };

    const handleOptionChange3 = (e) => {
        setSelectedHierarchy(e.target.value);
    }

    // Function to handle flash messages
    const handleFlashMessage = (text, success) => {
        setFlashMessage({ text, success, failure: !success });
        setTimeout(() => setFlashMessage({ text: "", success: false, failure: false }), 2000);
    };

    // Function to get hierarchies info
    useEffect(() => {
        async function getUserHierarchies() {
            try {
                const response = await fetch("/get_user_hierarchy_names", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setHierarchyInfo(data);
                } else {
                    console.error("Server error. Please try again.");
                    handleFlashMessage("Server error. Please try again.", false, 3000);
                }
            } catch (error) {
                console.error("Error fetching user hierarchy IDs:", error);
            }
        }

        getUserHierarchies();
    }, []);

    useEffect(() => {
        if (configData.Mode.Audio === false || configData.Mode.Video === false) {
            setHideModeOptions(true);
            if (configData.Mode.Audio === false) {
                setSelectedOption("videoSession");
            } else {
                setSelectedOption("audioSession");
            }
        }
        if (configData.AudioSession.PracticeMode === false || configData.AudioSession.AssessmentMode === false) {
            setHideSessionOption(true);
            if (configData.AudioSession.PracticeMode === false) {
                setSelectedPracticeAssessment("assessmentSession");
            } else {
                setSelectedPracticeAssessment("practiceSession");
            }
        }
    }, [])

    // Handle the form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedHierarchy) {
            handleFlashMessage("Please select a hierarchy", false);
            return;
        }

        let sessionType;
        try {
            // First, call the createUserDirectories route with the selected option
            const createUserResponse = await fetch("/create_user_directory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!createUserResponse.ok) {
                throw new Error("Network response was not ok");
            }

            // Now, fetch the timestamp
            const timestampResponse = await fetch("/timestamps", {
                method: "POST",
            });

            if (!timestampResponse.ok) {
                throw new Error("Network response was not ok");
            }

            const timestampData = await timestampResponse.json();
            const timestamp = timestampData.timestamp;

            // Handle redirection based on selected option
            if (selectedOption === "audioSession" || selectedOption === "videoSession") {

                if (configData.BothMode.ActivationStatus === true) {
                    sessionType = "both";
                } else if (!selectedPracticeAssessment) {
                    handleFlashMessage("Please select the session type", false);
                    return;
                } else {
                    sessionType = selectedPracticeAssessment === "practiceSession" ? "practice" : "assessment";
                }

                // // Handle audio and video redirection
                // const chatInitResponse = await fetch("/chatinit", {
                //     method: "POST",
                //     headers: {
                //         "Content-Type": "application/json",
                //     },
                // });

                // if (!chatInitResponse.ok) {
                //     throw new Error("Network response was not ok");
                // }

                if (selectedOption === "audioSession") {
                    window.location.href = `/audio?session=${sessionType}&timestamp=${timestamp}&hid=${selectedHierarchy}`;
                } else if (selectedOption === "videoSession") {
                    window.location.href = `/video?session=${sessionType}&timestamp=${timestamp}&hid=${selectedHierarchy}`;
                }
            } else {
                handleFlashMessage("Please select a session", false);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            handleFlashMessage("Error: " + error, false);
        }
    };


    return (
        <div>

            {/* Displaying failure flash message */}
            {flashMessage.failure && (
                <div id="failFlashMsg">
                    {flashMessage.text}
                </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {!hideModeOption && (
                    <div className="flex justify-center space-x-4">
                        {/* Radio button for selecting audio session */}
                        <div>
                            <input
                                type="radio"
                                id="audioSession"
                                value="audioSession"
                                checked={selectedOption === "audioSession"}
                                onChange={handleOptionChange1}
                            />
                            <label htmlFor="audioSession" className="ml-2 text-gray-700">Audio</label>
                        </div>

                        {/* Radio button for selecting video session */}
                        <div>
                            <input
                                type="radio"
                                id="videoSession"
                                value="videoSession"
                                checked={selectedOption === "videoSession"}
                                onChange={handleOptionChange1}
                            />
                            <label htmlFor="videoSession" className="ml-2 text-gray-700">Video</label>
                        </div>
                    </div>
                )}

                {/* Audio Options */}
                < div hidden={!selectedOption || selectedOption === "videoSession" || hideSessionOption}>
                    {/* Render practice and assessment session selection if not in both mode */}
                    {!configData.BothMode.ActivationStatus && (
                        <div className="flex justify-center space-x-4" id="video_options">
                            {/* Radio button for selecting practice session */}
                            <div hidden={!configData.AudioSession.PracticeMode}>
                                <input
                                    type="radio"
                                    id="practiceSession"
                                    value="practiceSession"
                                    checked={selectedPracticeAssessment === "practiceSession"}
                                    onChange={handleOptionChange2}
                                />
                                <label htmlFor="practiceSession" className="ml-2 text-gray-700">{configData.PracticeMode.Label}</label>
                            </div>

                            {/* Radio button for selecting assessment session */}
                            <div hidden={!configData.AudioSession.AssessmentMode}>
                                <input
                                    type="radio"
                                    id="assessmentSession"
                                    value="assessmentSession"
                                    checked={selectedPracticeAssessment === "assessmentSession"}
                                    onChange={handleOptionChange2}
                                />
                                <label htmlFor="assessmentSession" className="ml-2 text-gray-700">{configData.AssessmentMode.Label}</label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Video Options */}
                <div hidden={!selectedOption || selectedOption === "audioSession" || hideSessionOption}>
                    {/* Render practice and assessment session selection if not in both mode */}
                    {!configData.BothMode.ActivationStatus && (
                        <div className="flex justify-center space-x-4" id="video_options">
                            {/* Radio button for selecting practice session */}
                            <div hidden={!configData.VideoSession.PracticeMode}>
                                <input
                                    type="radio"
                                    id="practiceSession"
                                    value="practiceSession"
                                    checked={selectedPracticeAssessment === "practiceSession"}
                                    onChange={handleOptionChange2}
                                />
                                <label htmlFor="practiceSession" className="ml-2 text-gray-700">{configData.PracticeMode.Label}</label>
                            </div>

                            {/* Radio button for selecting assessment session */}
                            <div hidden={!configData.VideoSession.AssessmentMode}>
                                <input
                                    type="radio"
                                    id="assessmentSession"
                                    value="assessmentSession"
                                    checked={selectedPracticeAssessment === "assessmentSession"}
                                    onChange={handleOptionChange2}
                                />
                                <label htmlFor="assessmentSession" className="ml-2 text-gray-700">{configData.AssessmentMode.Label}</label>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <select
                        id="selectedHierarchy"
                        name="selectedHierarchy"
                        value={selectedHierarchy}
                        onChange={handleOptionChange3}
                        className="mt-1 p-2 border rounded-md w-full"
                        required>
                        <option value="">Select Hierarchy</option>
                        {hierarchyInfo.map((hierarchy) => (
                            <option key={hierarchy.hierarchy_id} value={hierarchy.hierarchy_id}>
                                {hierarchy.hierarchy_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Start Session button */}
                <FormAction handleSubmit={handleSubmit} text="Start Session" />
            </form>

            <div className="mt-2 text-center text-sm text-gray-600 mt-5">
                Click the button above to start your session
            </div>

        </div>
    );
}