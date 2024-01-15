import React, { useState, useRef, useEffect, useMemo } from "react";
import { DotPulse } from '@uiball/loaders';
import axios from "axios";
import configData from '../constants/config.json';

const mimeType = 'video/webm; codecs="opus,vp8"';

export default function VideoRecorder() {
    const [sessionType, setSessionType] = useState('');

    const [quesNumber, setQuesNumber] = useState(1);
    const [questions, setQuestions] = useState([]); // Array to store questions

    // State variables
    const [permission, setPermission] = useState(false);
    const [stream, setStream] = useState(null);
    const mediaRecorder = useRef(null);
    const liveVideoFeed = useRef(null);
    const [recordingStatus, setRecordingStatus] = useState("inactive");
    const [recordedVideo, setRecordedVideo] = useState(null);
    const [videoChunks, setVideoChunks] = useState([]);

    const [remainingTime, setRemainingTime] = useState(configData.SessionDuration);
    const timerIdRef = useRef(null);

    // Feedback-related state variables
    const [showFeedback, setShowFeedback] = useState(false);
    const [showGetFeedbackButton, setShowGetFeedbackButton] = useState(false);
    const [feedbackdivMaxHeight, setFeedbackdivMaxHeight] = useState("350px");
    const [feedbackHistory, setFeedbackHistory] = useState([]); // Store feedback history
    const [sttHistory, setSTTHistory] = useState([]); // Store STT history

    // State variables for loading and UI elements
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toggleState, setToggleState] = useState("Expand");
    const [sttLoading, setSttLoading] = useState(false);

    const [attemptNumber, setAttemptNumber] = useState(0);
    const [feedbacksNumber, setFeedbacksNumber] = useState(0);
    const [tabSwitchingCount, setTabSwitchingCount] = useState(0);
    const [tabSwitchingConfig, setTabSwitchingConfig] = useState(false); // Used for tab switching config depending on mode

    const [answer, setAnswer] = useState('');
    const [text, setText] = useState("Start");

    // State to control flash messages
    const [flashMessage, setFlashMessage] = useState({
        text: "",
        success: false,
        failure: false,
    });

    const [endFlag, setEndFlag] = useState(1);
    const [resultsConfig, setResultsConfig] = useState(false); // Used for results config depending on mode

    // Function to fetch questions from the /getquestionsfromapi route
    const fetchQuestionsFromAPI = async (hierarchy) => {
        try {
            const response = await fetch("/getquestionsfromapi", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    hierarchyid: hierarchy,
                }),
            });

            if (response.status === 200) {
                const { questions: fetchedQuestions } = await response.json();

                // Set the fetched questions into the state
                setQuestions(fetchedQuestions);
            } else {
                console.error("Failed to fetch questions.");
                handleFlashMessage("Failed to fetch questions. Please login again.", false);
            }
        } catch (error) {
            console.error("An error occurred while fetching questions:", error);
            handleFlashMessage("Error: " + error, false);
        }
    };

    // Retrieve info from the URL parameter
    useEffect(() => {
        // Retrieve the sessionType from the URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const sessionTypeParam = urlParams.get('session');
        const hierarchyParam = urlParams.get('hid');
        setSessionType(sessionTypeParam);
        fetchQuestionsFromAPI(hierarchyParam);
    }, []);

    // Function to disable cut, copy, paste and menu
    useEffect(() => {
        if (!configData.CutCopyPasteMenu) {
            const disableCut = (e) => { e.preventDefault(); };
            const disableCopy = (e) => { e.preventDefault(); };
            const disablePaste = (e) => { e.preventDefault(); };
            const disableContextMenu = (e) => { e.preventDefault(); };

            // Event listeners to disable copy, cut, paste and context menu
            document.addEventListener('cut', disableCut);
            document.addEventListener('copy', disableCopy);
            document.addEventListener('paste', disablePaste);
            document.addEventListener("contextmenu", disableContextMenu);

            // Cleanup function to remove event listeners
            return () => {
                document.removeEventListener('cut', disableCut);
                document.removeEventListener('copy', disableCopy);
                document.removeEventListener('paste', disablePaste);
                document.removeEventListener("contextmenu", disableContextMenu);
            };
        }
    }, []);

    // Function to disable tab switching
    useEffect(() => {
        if (!tabSwitchingConfig) {
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    if (tabSwitchingCount + 1 === configData.MaxTabSwitchingCount) {
                        window.location.href = '/userhome'; // Redirect to the results page
                        // window.location.href = `/results?navigationViolated=true`; // Redirect to the results page
                    } else {
                        setTabSwitchingCount(tabSwitchingCount + 1);
                        alert("Don't switch tabs! You've already switched tabs " + (tabSwitchingCount + 1) + " times.");
                    }
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        }
    }, [tabSwitchingConfig, tabSwitchingCount]);

    useEffect(() => {
        if (permission && stream && liveVideoFeed.current) {
            liveVideoFeed.current.srcObject = stream;
        }
    }, [permission, stream]);

    // Timer logic
    useEffect(() => {
        if (recordingStatus === "recording" && !timerIdRef.current) {
            // Start the timer when recording starts
            timerIdRef.current = setInterval(() => {
                setRemainingTime((prevTime) => {
                    if (prevTime <= 0) {
                        clearInterval(timerIdRef.current);
                        stopRecording(); // Call stopRecording when time reaches zero
                        setRemainingTime(configData.SessionDuration);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        } else if (recordingStatus !== "recording" && timerIdRef.current) {
            // Stop the timer when recording stops
            clearInterval(timerIdRef.current);
            timerIdRef.current = null;
        }
    });

    // Function to enter full-screen mode for the browser
    const openFullscreen = () => {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) { /* Firefox */
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { /* IE/Edge */
            element.msRequestFullscreen();
        }
    };

    // Function to exit full-screen mode for the browser
    const closeFullscreen = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    };

    // Function to handle flash messages
    const handleFlashMessage = (text, success) => {
        setFlashMessage({ text, success, failure: !success });
        setTimeout(() => setFlashMessage({ text: "", success: false, failure: false }), 2000);
    };

    // Function to request permission
    const getCameraPermission = async () => {
        // Entering fullscreen mode
        if (configData.FullScreenMode) {
            openFullscreen();
        }

        // Set feedbacks and results config based on the session type
        if (sessionType === "practice") {
            setResultsConfig(configData.PracticeMode.Results);
            setTabSwitchingConfig(configData.PracticeMode.TabSwitching);
        } else if (sessionType === "assessment") {
            setResultsConfig(configData.AssessmentMode.Results);
            setTabSwitchingConfig(configData.AssessmentMode.TabSwitching);
        } else if (sessionType === "both") {
            setResultsConfig(configData.BothMode.Results);
            setTabSwitchingConfig(configData.BothMode.TabSwitching);
        }

        if ("MediaRecorder" in window) {
            try {
                const streamData = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        noiseSuppression: true,
                        echoCancellation: true
                    },
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 15, max: 40 }
                    }
                });
                setPermission(true);
                setStream(streamData);
            } catch (err) {
                console.log(err.message)
            }
        } else {
            console.log("The MediaRecorder API is not supported in your browser.");
        }

        // Start the timer when permission is granted and recording starts
        if (permission && recordingStatus === "recording" && !timerIdRef.current) {
            timerIdRef.current = setInterval(() => {
                setRemainingTime((prevTime) => {
                    if (prevTime <= 0) {
                        clearInterval(timerIdRef.current);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }
    };

    // Start recording logic
    const startRecording = async () => {
        setFeedbackdivMaxHeight("150px");
        // Check if the maximum number of attempts is reached
        if (attemptNumber > configData.MaxAttempts) {
            handleFlashMessage("Max number of attempts reached", false);
            return;
        }

        setRecordingStatus("recording");
        setToggleState("Collapse");
        setRecordedVideo(null);
        const media = new MediaRecorder(stream, { mimeType });
        mediaRecorder.current = media;
        mediaRecorder.current.start();

        let localVideoChunks = [];
        mediaRecorder.current.ondataavailable = (event) => {
            if (typeof event.data === "undefined") return;
            if (event.data.size === 0) return;
            localVideoChunks.push(event.data);
        };
        setVideoChunks(localVideoChunks);
    };

    // Stop recording logic
    const stopRecording = async () => {
        setRecordingStatus("inactive");
        mediaRecorder.current.stop();
        setRemainingTime(configData.SessionDuration);
        setShowGetFeedbackButton(true);
        setShowFeedback(true);
        mediaRecorder.current.onstop = async () => {
            const videoBlob = new Blob(videoChunks, { type: mimeType });
            const videoUrl = URL.createObjectURL(videoBlob);
            const videoFile = new File([videoBlob], `Question${quesNumber}.mp4`); // Change the file extension if needed
            setUploading(true);
            setText("Uploading..");

            try {
                const formData = new FormData();
                formData.append("video", videoFile);
                formData.append("quesNumber", quesNumber); // Add quesNumber to the FormData
                const response = await axios.post("/upload", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });

                if (response.status === 200) {
                    setRecordedVideo(videoUrl);
                    setVideoChunks([]);
                    setUploading(false);
                    setSttLoading(true);
                    setText("Transcribing..");

                    const response2 = await fetch("/stt", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ quesNumber: quesNumber }),
                    });

                    if (response2.status === 200) {
                        const data = await response2.json();
                        setAnswer(data[0]);

                        if (data[0]) {
                            setSTTHistory((prevSTT) => [
                                ...prevSTT,
                                data[0] && (
                                    <>
                                        {prevSTT.length > 0 && (
                                            <div
                                                key={prevSTT.length}
                                                style={{
                                                    borderTop: "2px solid #000", // Customize line break appearance
                                                    marginTop: "10px", // Add space above the line break
                                                    marginBottom: "10px", // Add space below the line break
                                                }}
                                            ></div>
                                        )}
                                        {data[0]}
                                    </>
                                ),
                            ]);
                        }
                        setToggleState("Expand");
                        setAttemptNumber(attemptNumber + 1);
                    } else {
                        console.log("An error occurred while calling /stt");
                    }
                } else if (response.status === 404) {
                    handleFlashMessage("User Session not found. Please login again.", false);
                    window.location.href = '/';
                }
                else {
                    console.error("Error uploading video. Status:", response.status);
                    handleFlashMessage("Error uploading video. Status:" + response.status, false);
                }
            } catch (error) {
                console.error("Error uploading video:", error);
                handleFlashMessage("Error uploading video." + error, false);
            } finally {
                setUploading(false);
                setSttLoading(false);
                setText("Start");
                setFeedbackdivMaxHeight("350px");
            }
        };
    };

    const handlePreviousQues = () => {
        // Check if it's the first question; if so, set it to 1
        if (quesNumber <= 1) {
            setQuesNumber(1);
        } else {
            // Decrement the question number by 1
            setQuesNumber(quesNumber - 1);
        }
        // Hide feedback-related elements
        setShowFeedback(false);
        setShowGetFeedbackButton(false);
        // Clear the feedback history when moving to the previous question
        setFeedbackHistory([]);
        setSTTHistory([]);
        setAttemptNumber(0);
        setFeedbacksNumber(0);
    };

    const handleNextQues = async () => {
        // Increment the question number
        setQuesNumber(quesNumber + 1);
        setRecordedVideo(null); // Reset the video state
        // Hide feedback-related elements
        setShowFeedback(false);
        setShowGetFeedbackButton(false);
        setToggleState("Expand");

        try {
            const response = await fetch("/chatreset", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
            });

            if (response.status === 200) {
                // const response1 = await fetch("/chatinit", {
                //     method: "POST",
                //     headers: {
                //         "Content-Type": "application/json"
                //     },
                // });

                // if (response1.status === 200) {
                // Clear the feedback history when moving to the next question
                setFeedbackHistory([]);
                setSTTHistory([]);
                setAttemptNumber(0);
                setFeedbacksNumber(0);
            } else if (response.status === 401) {
                handleFlashMessage("Unauthorized access. Please Login", false);
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                console.error("Error resetting chat");
                handleFlashMessage("Error resetting chat.", false);
            }
        } catch (error) {
            console.error("Error occurred:", error);
            handleFlashMessage("Error occurred:" + error, false);
        }
    };

    // Send a request to reset the chat
    const handleFinish = async () => {
        // Exiting fullscreen mode
        if (configData.FullScreenMode) {
            closeFullscreen();
        }

        const response = await fetch("/chatreset", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
        });

        if (response.status === 200) {
            setEndFlag(0);
            if (resultsConfig === true) {
                const message = "Please submit and review the status";
                const url = `/results?message=${encodeURIComponent(message)}`;
                window.location.href = url;
                handleFlashMessage(message, true);
                setTimeout(() => {
                    window.location.href = '/results';
                }, 5000);
            } else if (response.status === 401) {
                handleFlashMessage("Unauthorized access. Please login again.", false);
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                handleFlashMessage("Practice session ended!", true);
                setTimeout(() => {
                    window.location.href = '/userhome';
                }, 2000);
            }
        } else {
            console.error("Error resetting chat.");
            handleFlashMessage("Error resetting chat.", false);
        }
    };

    // Function to format time in "MM:SS" format
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    const handleTry = async () => {
        if (!questions[quesNumber - 1]) {
            // Handle the case where there is no question to send
            console.error("No question available for feedback.");
            return;
        }

        if (attemptNumber <= feedbacksNumber) {
            console.error("Feedback requested for same recording");
            handleFlashMessage("Feedback requested for same recording", false);
            return;
        }

        try {
            setLoading(true);
            setToggleState("Expand");

            const questionToSubmit = questions[quesNumber - 1];
            const response = await fetch("/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ question: questionToSubmit, answer: answer }),
            });

            if (response.status === 200) {
                // Handle success, e.g., show a confirmation message

                // Set the feedbackText based on the data received from the route
                const data = await response.json();
                const parsed = JSON.parse(data);

                if (parsed) {
                    // Update the feedback at the specific index based on attemptNumber
                    setFeedbackHistory((prevFeedback) => {
                        const updatedFeedback = [...prevFeedback];
                        updatedFeedback[attemptNumber - 1] = parsed;

                        return updatedFeedback;
                    });

                    setShowFeedback(true);
                    setToggleState("Expand");
                    setFeedbacksNumber(feedbacksNumber + 1);
                } else {
                    console.error("Received invalid feedback");
                    handleFlashMessage("Received invalid feedback", false);
                }
            } else if (response.status === 404) {
                handleFlashMessage("Video not found. Please try again", false);
            } else if (response.status === 401) {
                handleFlashMessage("Unauthorized access. Please Login", false);
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                console.error("Failed to send feedback. Status:", response.status);
                handleFlashMessage("Failed to send feedback.", false);
            }
        } catch (error) {
            console.error("Error sending feedback:", error);
            handleFlashMessage("Error sending feedback.", false);
        } finally {
            setLoading(false);
        }
    };

    // Function to toggle between 'Expand' and 'Collapse' states
    const handleToggle = () => {
        if (toggleState === "Expand") {
            setToggleState("Collapse");
            setFeedbackdivMaxHeight("150px");
        } else if (toggleState === "Collapse") {
            setToggleState("Expand");
            setFeedbackdivMaxHeight("350px");
        }
    }

    // STT Component
    const STTComponent = ({ sttItem }) => (
        <div style={{ backgroundColor: '#C3EDC0', padding: '10px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
            {sttItem}
        </div>
    );

    // Feedback Component
    const FeedbackComponent = ({ feedbackItem }) => (
        <div style={{ backgroundColor: 'lightgrey', padding: '10px', borderRadius: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
            {feedbackItem}
        </div>
    );


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

            {permission && (
                <div>
                    <div className="mt-2 text-sm text-gray-600 mt-5">
                        {/* Display the current question number */}
                        Question: {quesNumber} <br />
                    </div>
                    <div id="questions" style={{ backgroundColor: 'lightgrey', color: 'black', fontWeight: 'bold', padding: '10px', textAlign: 'center', fontSize: '20px', maxHeight: '75px', overflowY: 'auto' }}>
                        {/* Display the current question text */}
                        {questions[quesNumber - 1]}
                    </div>
                </div>
            )}

            <div id="feedbacksDiv" style={{ marginTop: '10px' }}>
                {showFeedback && (
                    <div id="feedback" style={{ maxHeight: feedbackdivMaxHeight, overflowY: 'auto' }}>
                        {/* Display STT and feedback history */}
                        {sttHistory.map((sttItem, index) => (
                            <React.Fragment key={`stt_${index}`}>
                                <STTComponent sttItem={sttItem} />
                                {feedbackHistory[index] && feedbackHistory[index].length !== 0 && (
                                    <FeedbackComponent key={`feedback_${index}`} feedbackItem={feedbackHistory[index]} />
                                )}
                            </React.Fragment>
                        ))}
                        {sttLoading && (
                            <div style={{ backgroundColor: '#C3EDC0', padding: '10px', borderRadius: '10px', marginBottom: '10px', alignItems: 'center', display: 'flex', justifyContent: 'center' }}>
                                <DotPulse size={35} color="black" />
                            </div>
                        )}
                        {loading && (
                            <div style={{ backgroundColor: 'lightgrey', padding: '10px', borderRadius: '10px', marginBottom: '10px', alignItems: 'center', display: 'flex', justifyContent: 'center' }}>
                                <DotPulse size={35} color="black" />
                            </div>
                        )}
                    </div>
                )}

                {showGetFeedbackButton && sessionType === "practice" && !sttLoading && (
                    <div style={{ marginRight: '17px', marginLeft: '19px', marginTop: '8px' }}>
                        <center>
                            <button
                                onClick={handleTry}
                                disabled={uploading || sttLoading || recordingStatus === "recording"}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                                {loading ? (
                                    'Loading..'
                                ) : 'Get Feedback'}
                            </button>
                        </center>
                    </div>
                )}
            </div>

            <div className="video-player" style={{ marginTop: '5px' }}>
                <center>
                    <video ref={liveVideoFeed} autoPlay muted className="live-player" style={{ width: '90%' }}
                        hidden={!permission || recordingStatus !== "recording"}></video>
                </center>
            </div>

            {permission && (
                <div style={{ textAlign: 'right', marginBottom: '8px', marginRight: '20px' }}>
                    <button
                        onClick={handleToggle}
                        className="font-medium text-purple-600 hover:text-purple-500 mt-2 text-center text-sm mt-5">
                        {/* Display the current toggle state */}
                        {toggleState}
                    </button>
                </div>
            )}

            {toggleState !== "Expand" && (
                <div>
                    {uploading && (
                        <div className="flex items-center justify-center">
                            <br />
                            {/* Display a loading indicator when uploading */}
                            <DotPulse size={35} color="purple" />
                        </div>
                    )}

                    <center>
                        {recordedVideo && recordingStatus === "inactive" && !uploading ? (
                            <div className="recorded-player">
                                <video className="recorded" src={recordedVideo} controls style={{ width: '90%' }}>
                                </video>
                                <br />
                            </div>
                        ) : null}
                    </center>
                </div>
            )}

            {!permission && (
                <div className="mt-2 text-center text-sm text-gray-600 mt-5">
                    {/* Display a message when permission is required */}
                    Click "Get Camera" to get the questions <br /> <br />
                </div>
            )}

            {permission && (
                <div className="mt-2 text-center text-sm text-gray-600 mt-5" style={{ alignItems: 'center' }} >
                    {/* Display the remaining time */}
                    {formatTime(remainingTime)}
                </div>
            )}

            <div className="video-controls flex justify-center">
                <button
                    type="button"
                    className={`group relative flex-grow py-2.5 px-2.5 mx-5 border border-transparent text-sm font-medium rounded-md text-white ${(quesNumber === 1 || recordingStatus === "recording" || !permission || loading || uploading || sttLoading || endFlag === 0) ? 'bg-gray-300 text-black-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'}`}
                    onClick={handlePreviousQues}
                    disabled={quesNumber === 1 || recordingStatus === "recording" || !permission || loading || uploading || sttLoading || endFlag === 0}
                >
                    {/* Button to go to the previous question */}
                    &lt;&lt;
                </button>

                {!permission ? (
                    <button
                        type="button"
                        className="group relative flex py-2.5 px-9 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        onClick={getCameraPermission}
                    >
                        {/* Button to request microphone permission */}
                        Get Camera
                    </button>
                ) : null}

                {permission && recordingStatus === "inactive" ? (
                    <button
                        type="button"
                        className={`group relative flex-grow py-2.5 px-9 mx-4 border border-transparent text-sm font-medium rounded-md ${(loading || uploading || endFlag === 0) ? 'bg-gray-300 text-black-500 cursor-not-allowed' : 'text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'}`}
                        onClick={startRecording}
                        disabled={loading || uploading || sttLoading || endFlag === 0}
                    >
                        {/* Button to start recording */}
                        {text}
                    </button>
                ) : null}

                {recordingStatus === "recording" ? (
                    <button
                        type="button"
                        className={`group relative flex-grow py-2.5 px-9 mx-4 border border-transparent text-sm font-medium rounded-md text-white ${(loading || uploading || sttLoading || endFlag === 0) ? 'bg-gray-300 text-black-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'}`}
                        onClick={stopRecording}
                        disabled={loading || uploading || sttLoading || endFlag === 0}
                    >
                        {/* Button to stop recording */}
                        Stop
                    </button>
                ) : null}

                <button
                    type="button"
                    className={`group relative flex-grow py-2.5 px-2.5 mx-5 border border-transparent text-sm font-medium rounded-md text-white ${(recordingStatus === "recording" || !permission || loading || sttLoading || uploading || endFlag === 0) ? 'bg-gray-300 text-black-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'}`}
                    onClick={handleNextQues}
                    disabled={recordingStatus === "recording" || !permission || loading || sttLoading || uploading || endFlag === 0}
                    hidden={quesNumber === questions.length}
                >
                    {/* Button to go to the next question */}
                    &gt;&gt;
                </button>

                {quesNumber === questions.length && (
                    <button
                        type="button"
                        className={`group relative flex-grow py-2.5 px-2.5 mx-5 border border-transparent text-sm font-medium rounded-md ${(recordingStatus === "recording" || loading || uploading || sttLoading || endFlag === 0) ? 'bg-gray-300 text-black-500 cursor-not-allowed' : 'text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'}`}
                        onClick={handleFinish}
                        disabled={recordingStatus === "recording" || loading || uploading || sttLoading || endFlag === 0}
                    >
                        {/* Button to finish the questions */}
                        Finish
                    </button>
                )}
            </div>

            {configData.SkipAll && resultsConfig && (
                <div className="mt-2 text-center text-sm text-gray-600 mt-5">
                    {/* Display a message for Free Mode and results configuration */}
                    Click the button below to skip all questions and submit <br />
                    <a href="./results" className={`font-medium text-purple-600 hover:text-purple-500 mt-2 text-center text-sm mt-5 ${recordingStatus === "recording" ? "cursor-not-allowed" : ""}`} disabled={recordingStatus === "recording" || loading || sttLoading || uploading}
                        onClick={(e) => {
                            if (recordingStatus === "recording") {
                                e.preventDefault(); // Prevent the default click action when recording
                            }
                        }}>
                        {/* Button to skip all questions and submit */}
                        SKIP ALL
                    </a>
                </div>
            )}

        </div>
    );
};