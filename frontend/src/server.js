const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const fingerprint = require('express-fingerprint');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const AES = require('crypto-js/aes');
const fileUpload = require('express-fileupload');
const encUtf8 = require('crypto-js/enc-utf8');
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const app = express();
const configData = require('./constants/config.json');
const xss = require('xss'); // Import the xss library

// Logging
const { createLogger, transports, format } = require('winston');
const { combine, timestamp, printf } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const logpath = require('path');
const currentDir = __dirname;
const parentDir = path.join(currentDir, '..', '..');
const logdir = path.join(parentDir, "logs");
const archiveDir = path.join(parentDir, "archive");

// Create the log directory if it does not exist
if (!fs.existsSync(logdir)) {
    fs.mkdirSync(logdir);
}

const log_frontenddir = path.join(logdir, "frontend");
const moment = require('moment');

// Create the frontend log directory if it does not exist
if (!fs.existsSync(log_frontenddir)) {
    fs.mkdirSync(log_frontenddir);
}

// Create the archive directory if it does not exist
if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir);
}

const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new DailyRotateFile({
            filename: logpath.join(log_frontenddir, `${configData.logFilePrefix}-%DATE%.log`),
            datePattern: 'DD-MM-YYYY',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});

app.use(
    session({
        secret: crypto.randomBytes(32).toString('hex'), // Replace with your own secret key
        resave: false,
        saveUninitialized: false,
    })
);

// Use the fingerprint middleware
app.use(
    fingerprint({
        parameters: [
            fingerprint.useragent,
            fingerprint.acceptHeaders,
            fingerprint.geoip,
        ],
    })
);


app.use(fileUpload());
app.use(cors());
app.use(express.json());

const API_URL = configData.API_URL
const sessionTimestamps = {};
let number_of_questions;
let qid = [];
let questions = [];
let savedFlag = [];
let promptFlag = [];
let llmFlag = [];
const key = "kojsnhfitonhsuth"
const iv = "odbshirnkofgfffs";
const SECRET_KEY = 'your_secret_key';

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'build')));
const userDirectoriesPath = path.join(parentDir, configData.mediaDest);
const questiondir = path.join(parentDir, configData.questionDest);

app.post('/login', async (req, res) => {
    const encryptedUsername = req.body.username;
    const encryptedPassword = req.body.password;


    try {
        // Decrypt the username and password using the server's encryption key and IV
        const username = AES.decrypt(encryptedUsername, key, { iv: encUtf8.parse(iv) }).toString(encUtf8);
        const password = AES.decrypt(encryptedPassword, key, { iv: encUtf8.parse(iv) }).toString(encUtf8);
        const deviceInfo = req.fingerprint;
        const devicehash = deviceInfo.hash
        const api_url = API_URL + '/api/login';

        // Logging before making the API call
        logger.info(`${username}: Attempting to log in`, { timestamp: moment().format('DD-MM-YYYY HH:mm:ss') });
        logger.info(`${api_url}: Attempting to log in`, { timestamp: moment().format('DD-MM-YYYY HH:mm:ss') });

        const response = await axios.post(api_url, { username, password, devicehash });
        if (response.status === 200) {
            const user_data = response.data;

            // Store user data in session
            req.session.access_token = xss(user_data.access_token);
            req.session.refresh_token = xss(user_data.refresh_token);
            req.session.devicehash = xss(user_data.devicehash);
            req.session.username = xss(user_data.username);
            req.session.userrole = xss(user_data.role);
            req.session.user_id = xss(user_data.userid);
            res.status(200).json({ role: user_data.role });

            // Logging after successful login
            logger.info(`${user_data.username} (${user_data.role}): Login successful`, { timestamp: moment().format('DD-MM-YYYY HH:mm:ss') });
        } else if (response.status === 401) {
            res.status(401).json({ detail: "User already logged in!" })
        }
    } catch (error) {
        // Logging errors during login
        logger.error(`Error during login: ${error.message}`, { timestamp: moment().format('DD-MM-YYYY HH:mm:ss') });
        console.error('Error:', error.message);
        res.status(error.response.status).json(error.response.data);
    }
});

app.post('/validateTokens', async (req, res) => {
    const Tokendevicehash = req.body.devicehash;
    const refreshToken = req.body.refreshToken;

    try {
        const deviceInfo = req.fingerprint;
        const devicehash = deviceInfo.hash
        if (Tokendevicehash == devicehash) {
            const api_url = API_URL + '/api/validateTokens';

            const response = await axios.post(api_url, { refreshToken });
            if (response.status === 200) {
                const user_data = response.data;

                res.status(200).json({ role: user_data.role });
            } else if (response.status === 401) {
                res.status(401).json({ detail: "Invalid Username" })
            }
        }
    } catch (error) {
        // Logging errors during login
        logger.error(`Error during login: ${error.message}`, { timestamp: moment().format('DD-MM-YYYY HH:mm:ss') });
        console.error('Error:', error.message);
        res.status(error.response.status).json(error.response.data);
    }
});

async function tokenRequired(req, res, next) {
    const accessToken = req.session.access_token;
    const refreshToken = req.session.refresh_token;

    if (!accessToken || !refreshToken) {
        console.error("Access token or refresh token is missing.");
        return res.redirect('/');
    }

    try {
        // Verify the access token
        const accessTokenData = jwt.verify(accessToken, SECRET_KEY, { algorithms: ["HS256"] });
        const username = accessTokenData.user_data.username;

        // Attach 'username' to the request object
        req.username = username;


        // Call the next middleware or route handler
        next();
    } catch (accessTokenError) {
        if (accessTokenError.name === 'TokenExpiredError') {
            // Access token expired, try refreshing using the refresh token
            try {
                data = { refresh_token: refreshToken }
                const refreshResponse = await axios.post(API_URL + '/api/refreshToken', data);
                const accessToken = refreshResponse.data.access_token;

                // Update the session with the new access token
                req.session.access_token = accessToken

                const accessTokenData = jwt.verify(accessToken, SECRET_KEY, { algorithms: ["HS256"] });
                const username = accessTokenData.user_data.username;

                req.username = username;
                next();
            } catch (refreshError) {
                console.error("Error refreshing access token:", refreshError.message);
                return res.redirect('/');
            }
        } else {
            console.error("Access token is invalid.");
            return res.redirect('/');
        }
    }
}


app.get('/', (req, res) => {
    // If access token or refresh token is missing or invalid, redirect to '/'
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});


app.get('/userhome', tokenRequired, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/adminhome', tokenRequired, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const user_role = req.session.userrole;
    if (user_role == "user") {
        return res.redirect("/");
    }
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/superadminhome', tokenRequired, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const user_role = req.session.userrole;
    if (user_role != "superadmin") {
        return res.redirect("/");
    }
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/passwordreset', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/results', tokenRequired, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/userregistration', tokenRequired, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const user_role = req.session.userrole;
    if (user_role == "user") {
        return res.redirect("/");
    }
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/dashboard', tokenRequired, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const user_role = req.session.userrole;
    if (user_role == "user") {
        return res.redirect("/");
    }
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/audio', tokenRequired, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/video', tokenRequired, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.get('/account', tokenRequired, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

app.post('/get_user_details', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        const username = req.session.username;
        logger.info(`${username}: Attempting to get user details`, { timestamp }); // Logging the attempt to get user details

        data = {
            username: username
        }
        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_user_details', data);

        if (response.status === 200) {
            logger.info(`${username}: User details retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data); // 200 for success
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred while getting user details. ${error.message}`, { timestamp }); // Logging errors during the process
        res.status(error.response.status).end();
    }
});

app.post('/register', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        // Extract form data or JSON data from the frontend (adjust as needed)
        const details = {
            username: xss(req.body.username.toLowerCase()),
            email: xss(req.body.email_address),
            password: xss(req.body.password),
            firstName: xss(req.body.firstname),
            lastName: xss(req.body.lastname),
            contactNumber: xss(req.body.contactnumber),
            role: '',
            spaceid: ''
        };

        if (req.session.userrole === "superadmin") {
            details.role = "admin";
            details.spaceid = '';
        } else if (req.session.userrole === "admin") {
            details.role = "user";
            details.spaceid = xss(req.body.spaceid);
        }

        const data = { details: details };

        logger.info(`Attempting to register a new user ${details.username}`, { timestamp }); // Logging the attempt to register a new user

        // Send the data as JSON to the backend API
        const response = await axios.post(API_URL + '/api/register', data);

        if (response.status === 200) {
            logger.info(`User registration successful - ${details.username}`, { timestamp }); // Logging successful registration
            res.status(200).end(); // Registration successful
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred during user registration ${error.message}`, { timestamp }); // Logging errors during user registration
        res.status(error.response.status).end();
    }
});

// Reset Password Route
app.post('/reset_password', async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try { // Extract data from the request
        data = {
            email: xss(req.body.email)
        }

        logger.info(`${data.email} Attempting to reset password`, { timestamp }); // Logging the attempt to reset the password

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/reset_password', data);

        if (response.status === 200) {
            logger.info(`${data.email} Password reset request successful`, { timestamp }); // Logging successful password reset request
            res.status(200).json({}); // 200 for success
        }
        else if (response.status === 423) {
            logger.info(`${data.email} Password reset locked `, { timestamp });
            res.status(423).json({});
        }

    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred during password reset ${error.message}`, { timestamp }); // Logging errors during password reset
        res.status(error.response.status).end();
    }
});

// Verify OTP Route
app.post('/verify_otp', async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        data = {
            otp: xss(req.body.otp),
            email: xss(req.body.email)
        } // Extract data from the request

        logger.info(`${data.email} Verifying OTP`, { timestamp }); // Log the OTP verification attempt

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/verify_otp', data);

        if (response.status === 200) {
            logger.info(`${data.email} OTP verification successful`, { timestamp }); // Log the successful OTP verification
            res.status(200).json({}); // 200 for success
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during OTP verification. ${error.message}`, { timestamp }); // Log errors during OTP verification
        res.status(error.response.status).end();
    }
});

// Update Password Route
app.post('/update_password', async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        const data = {
            new_password: xss(req.body.password),
            email: xss(req.body.email)
        }; // Extract data from the request

        logger.info(`${data.email} Updating password`, { timestamp }); // Log the password update attempt
        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/update_password', data);

        if (response.status === 200) {
            logger.info(`${data.email} Password updated successfully`, { timestamp }); // Log the successful password update
            res.status(200).json({}); // 200 for success
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during password update. ${error.message}`, { timestamp }); // Log errors during the password update
        res.status(error.response.status).end();
    }
});

app.post('/create_space', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    const spaceName = xss(req.body.spaceName);
    logger.info(`${spaceName} Attempting to create Space`, { timestamp }); // Logging the attempt to create space

    try {

        // Extract data from the request
        data = {
            spacename: spaceName
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/create_space', data);

        if (response.status === 200) {
            logger.info(`${data.spacename} Space created successfully.`, { timestamp });
            res.status(200).json({});
        } else if (response.status === 409) {
            logger.info(`${data.spacename} Space already exists`, { timestamp });
            res.status(409).json({});
        }

    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred during creating space ${error.message}`, { timestamp }); // Logging errors during creating space
        res.status(error.response.status).end();
    }
});

app.post('/update_space', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    const oldSpaceName = xss(req.body.oldSpaceName);
    const newSpaceName = xss(req.body.newSpaceName);
    logger.info(`Attempting to update Space ${oldSpaceName} to ${newSpaceName}`, { timestamp }); // Logging the attempt to update space

    try {

        // Extract data from the request
        data = {
            oldSpaceName: oldSpaceName,
            newSpaceName: newSpaceName
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/update_space', data);

        if (response.status === 200) {
            logger.info(`${data.oldSpaceName} Space updated successfully.`, { timestamp });
            res.status(200).json({});
        } else if (response.status === 409) {
            logger.info(`${data.oldSpaceName} Space name already exists`, { timestamp });
            res.status(409).json({});
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred during updating space ${error.message}`, { timestamp }); // Logging errors during updating space
        res.status(error.response.status).end();
    }
});

app.post('/api/get_space_data', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        data = {}

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_space_data', data);

        if (response.status === 200) {
            logger.info(`Space Ids retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data.spaces);
        } else if (response.status === 404) {
            logger.info(`Spaces not found`, { timestamp }); // Logging successful retrieval
            res.status(404).json(response.data.spaces);
        }
        console.log(response.status)
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred while getting space Ids. ${error.message}`, { timestamp }); // Logging errors during the process
        res.status(error.response.status).end();
    }
});

app.post('/api/get_adminUsernames', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        data = {}

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_adminUsernames', data);

        if (response.status === 200) {
            logger.info(`Admin Usernames retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data.adminData); // 200 for success
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred while getting Admin Usernames. ${error.message}`, { timestamp }); // Logging errors during the process
        res.status(error.response.status).end();
    }
});

app.post('/api/get_adminUsernamesWithoutSpace', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        data = {}

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_adminUsernamesWithoutSpace', data);

        if (response.status === 200 || response.status === 404) {
            logger.info(`Admin Usernames retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data.adminData); // 200 for success
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred while getting Admin Usernames. ${error.message}`, { timestamp }); // Logging errors during the process
        res.status(error.response.status).end();
    }
});

app.post('/assign_space', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    const spaceId = xss(req.body.space_id);
    const adminIds = req.body.admin_ids;
    logger.info(`Attempting to assign Space`, { timestamp }); // Logging the attempt to assign space

    try {

        // Extract data from the request
        data = {
            space_id: spaceId,
            user_ids: adminIds, // Pass admin IDs to the API
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/assign_space', data);

        if (response.status === 200) {
            logger.info(`${data.spacename} Space  assigned successfully.`, { timestamp });
            res.status(200).json({});
        } else if (response.status === 400) {
            logger.info(`${data.spacename} Admin already has a space assigned.`, { timestamp });
            res.status(400).json({});
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred during assigning space ${error.message}`, { timestamp }); // Logging errors during assigning space
        res.status(error.response.status).end();
    }
});

app.post('/api/get_admin_spaceids', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        data = {
            user_id: req.session.user_id
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_admin_spaceids', data);

        if (response.status === 200) {
            logger.info(`Admin space IDs retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data.spaces); // 200 for success
        } else if (response.status === 409) {
            logger.info(`${data.hierarchy_name} Hierarchy already exists`, { timestamp });
            res.status(409).json({});
        } else if (response.status === 404) {
            logger.info(`${data.hierarchy_name} space not found for the admin`, { timestamp });
            res.status(409).json({});
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred while getting Admin space IDs. ${error.message}`, { timestamp }); // Logging errors during the process
        res.status(error.response.status).end();
    }
});

app.post('/create_hierarchy', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    const spaceid = xss(req.body.spaceid);
    const hierarchy_name = xss(req.body.hierarchyName);
    logger.info(`${hierarchy_name} Attempting to create hierarchy`, { timestamp }); // Logging the attempt to create space

    try {

        // Extract data from the request
        data = {
            adminId: req.session.user_id,
            spaceId: spaceid,
            hierarchy_name: hierarchy_name
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/create_hierarchy', data);

        if (response.status === 200) {
            logger.info(`${data.hierarchy_name} Hierarchy created successfully.`, { timestamp });
            res.status(200).json({});
        } else if (response.status === 409) {
            logger.info(`${data.hierarchy_name} Hierarchy already exists`, { timestamp });
            res.status(409).json({});
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred during creating hierarchy ${error.message}`, { timestamp }); // Logging errors during creating space
        res.status(error.response.status).end();
    }
});

app.post('/api/get_hierarchy_data', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        data = {
            admin_id: req.session.user_id
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_hierarchy_data', data);

        if (response.status === 200) {
            logger.info(`Hierarchy Ids retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data.admin_hierarchies);
        } else if (response.status === 404) {
            logger.info(`No hierarchies found for the admin`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data.admin_hierarchies);
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred while getting hierarchy Ids. ${error.message}`, { timestamp }); // Logging errors during the process
        res.status(error.response.status).end();
    }
});

app.post('/update_hierarchy', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    const oldHierarchyName = xss(req.body.oldHierarchyName);
    const newHierarchyName = xss(req.body.newHierarchyName);
    logger.info(`Attempting to update hierarchy ${oldHierarchyName} to ${newHierarchyName}`, { timestamp }); // Logging the attempt to update hierarchy

    try {

        // Extract data from the request
        data = {
            oldHierarchyName: oldHierarchyName,
            newHierarchyName: newHierarchyName
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/update_hierarchy', data);

        if (response.status === 200) {
            logger.info(`${data.oldHierarchyName} Hierarchy updated successfully.`, { timestamp });
            res.status(200).json({});
        } else if (response.status === 409) {
            logger.info(`${data.oldHierarchyName} Hierarchy name already exists`, { timestamp });
            res.status(409).json({});
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred during updating hierarchy ${error.message}`, { timestamp }); // Logging errors during updating hierarchy
        res.status(error.response.status).end();
    }
});

app.post('/api/get_hierarchy_data_of_space', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        data = {
            spaceId: xss(req.body.spaceid)
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_hierarchy_data_of_space', data);

        if (response.status === 200) {
            logger.info(`Hierarchy Ids of a space retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data);
        } else if (response.status === 404) {
            logger.info(`${data.spacename}  hierarchies not found for the selected space`, { timestamp });
            res.status(404).json({});
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred while getting hierarchy Ids of a space. ${error.message}`, { timestamp }); // Logging errors during the process
        res.status(error.response.status).end();
    }
});

app.post('/api/get_users_by_hierarchies', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        const data = {
            hierarchy_id: xss(req.body.hierarchy_id)
        };

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_users_by_hierarchies', data);

        if (response.status === 200) {
            logger.info(`Users for the hierarchy retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data.users);
        } else if (response.status === 400) {
            // Handle bad request
            logger.error(`Bad request: ${response.data.message}`, { timestamp });
            res.status(404).json({ error: 'no users found for the selected hierarchy', message: response.data.message });
        } else if (response.status === 500) {
            // Handle internal server error
            logger.error(`Internal server error: ${response.data.message}`, { timestamp });
            res.status(500).json({ error: 'Internal server error', message: response.data.message });
        } else {
            // Handle other HTTP status codes
            logger.error(`Unexpected status code: ${response.status}`, { timestamp });
            res.status(response.status).json({ error: 'Unexpected status code', message: response.data.message });
        }
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            logger.error(`Error response from server: ${error.response.status}`, { timestamp });
            res.status(error.response.status).json({ error: 'Server error', message: error.message });
        } else if (error.request) {
            // The request was made but no response was received
            logger.error('No response received from the server', { timestamp });
            res.status(500).json({ error: 'No response received from the server', message: error.message });
        } else {
            // Something happened in setting up the request that triggered an error
            logger.error(`Error setting up the request: ${error.message}`, { timestamp });
            res.status(500).json({ error: 'Request setup error', message: error.message });
        }
    }
});


app.post('/uploadFile', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY_HH-mm-ss');

    try {
        const space_id = req.body.spaceid;
        const hierarchy_id = req.body.hierarchyid;
        const uploadedFiles = Array.isArray(req.files.files) ? req.files.files : [req.files.files];

        const archiveDirPath = path.join(archiveDir, space_id, hierarchy_id);

        // Ensure the directory exists
        fs.mkdirSync(archiveDirPath, { recursive: true });

        // Handle each file
        for (let i = 0; i < uploadedFiles.length; i++) {
            const uploadedFile = uploadedFiles[i];
            const fileName = `${timestamp}_${uploadedFile.name}`;
            const uploadPath = path.join(archiveDirPath, fileName);

            uploadedFile.mv(uploadPath, (err) => {
                if (err) {
                    logger.error(`${username} - Error uploading file: ${err}`);
                    return res.status(500).send(err);
                }
            });
        }

        const data = {
            hierarchy_id: hierarchy_id,
            space_id: space_id,
            file_path: path.join(archiveDirPath, `${timestamp}_${uploadedFiles[0].name}`)
        };

        const response = await axios.post(API_URL + '/api/upload_questions', data);

        if (response.status === 200) {
            res.status(200).json({ message: 'Questions uploaded successfully' });
        } else if (response.status === 400) {
            res.status(400).json({ error: 'Error loading questions from file' });
        } else if (response.status === 404) {
            res.status(404).json({ error: 'The hierarchical table does not exist in the database.' });
        }
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

app.post('/api/get_users_of_space', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        data = {
            spaceId: xss(req.body.spaceid)
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_users_of_space', data);

        if (response.status === 200) {
            logger.info(`Users of a space retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data.Users);
        }
        else if(response.status === 404) {
            logger.info(`data not found`, { timestamp }); // Logging successful retrieval
            res.status(404).json(response.data.Users);
        }
     } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred while getting users of a space. ${error.message}`, { timestamp }); // Logging errors during the process
        res.status(error.response.status).end();
    }
});

app.post('/assign_hierarchy', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    const hierarchyIds = req.body.hierarchy_ids;
    const userIds = req.body.user_ids;
    logger.info(`Attempting to assign Space`, { timestamp }); // Logging the attempt to assign hierarchy
    try {

        // Extract data from the request
        data = {
            user_ids: userIds,
            admin_id: req.session.user_id,
            hierarchy_ids: hierarchyIds,

        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/assign_hierarchy', data);

        if (response.status === 200) {
            logger.info(`${data.hierarchy_id} Hierarchy  assigned successfully.`, { timestamp });
            res.status(200).json({});
        } else if (response.status === 404) {
            logger.info(`${data.hierarchy_id} required data is not found.`, { timestamp });
            res.status(404).json({});
        }
        else if (response.status === 400) {
            logger.info(`${data.hierarchy_id} User already has a hierarchy assigned.`, { timestamp });
            res.status(400).json({});
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred during assigning hierarchy ${error.message}`, { timestamp }); // Logging errors during assigning space
        res.status(error.response.status).end();
    }
});

// Active Admins Route
app.post('/active_users', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    const spaceid = xss(req.body.spaceid);
    try {
        data = { space_id: spaceid }

        // Make an HTTP GET request to your Python backend
        const response = await axios.post(API_URL + '/api/active_users', data);

        if (response.status === 200) {
            logger.info('Active users fetched successfully', { timestamp }); // Log the successful retrieval of the active users
            const responseData = response.data;
            res.status(200).json(responseData.active_users);
        } else {
            logger.error('An error occurred on the server', { timestamp }); // Log an error if there is an issue on the server
            res.status(response.status).json({ message: 'An error occurred on the server.' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error: ${error.message}`, { timestamp }); // Log any error that occurs during the process
        res.status(error.response.status).end();
    }
});

app.post('/get_user_hierarchy_names', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        data = {
            user_id: req.session.user_id
        }

        // Make a POST request to the backend route
        const response = await axios.post(API_URL + '/api/get_user_hierarchy_names', data);

        if (response.status === 200) {
            logger.info(`Hierarchy Ids retrieved successfully`, { timestamp }); // Logging successful retrieval
            res.status(200).json(response.data.user_hierarchy_ids);
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error occurred while getting hierarchy Ids. ${error.message}`, { timestamp }); // Logging errors during the process
        res.status(error.response.status).end();
    }
});

// Upload Route
app.post('/upload', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        const username = req.session.username; // Assuming you have user sessions set up

        logger.info(`User ${username} uploading file`, { timestamp }); // Log the start of the file upload

        if (username in sessionTimestamps) {
            const sessionTimestamp = sessionTimestamps[username];
            const extname = path.extname(req.files.video.name); // Access the uploaded file via req.files
            const quesNumber = xss(req.body.quesNumber);
            const filename = `${username}_${sessionTimestamp}_Question${quesNumber}${extname}`;
            const newuserdirectorypath = path.join(userDirectoriesPath, username);
            const destinationPathInS3 = `${newuserdirectorypath}/${filename}`;
            await new Promise((resolve, reject) => {
                req.files.video.mv(destinationPathInS3, (err) => {
                    if (err) {
                        console.error('Error moving file:', err);
                        logger.error(`Error moving file. ${err.message}`, { timestamp }); // Log any errors that occur during the file move
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            logger.info(`${username} File uploaded successfully`, { timestamp }); // Log the successful file upload
            res.sendStatus(200); // Use sendStatus to send a 200 status code
        } else {
            logger.error('User session not found', { timestamp }); // Log the case where the user session is not found
            res.status(401).json({ error: 'User session not found' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during upload. ${error.message}`, { timestamp }); // Log errors during the file upload
        res.status(error.response.status).end();
    }
});

// Upload Audio Route
app.post('/upload-audio', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
    try {
        const username = req.session.username; // Assuming you have user sessions set up
        logger.info(`User ${username} uploading file`, { timestamp }); // Log the start of the audio upload

        if (username in sessionTimestamps) {
            const sessionTimestamp = sessionTimestamps[username];
            const extname = path.extname(req.files.audio.name); // Access the uploaded file via req.files
            const quesNumber = xss(req.body.quesNumber);
            const filename = `${username}_${sessionTimestamp}_Question${quesNumber}${extname}`;
            const newuserdirectorypath = path.join(userDirectoriesPath, username);
            // Define the destination path where you want to save the audio
            //const destinationPath = path.join(newuserdirectorypath, filename);
            const audioFile = req.files.audio;
            const destinationPathInS3 = `${newuserdirectorypath}/${filename}`;

            // Use the fs module to move the audio file to the destination
            await new Promise((resolve, reject) => {
                logger.info(`${username} File upload in progress`, { timestamp }); // Log the file upload in progress
                req.files.audio.mv(destinationPathInS3, (err) => {
                    if (err) {
                        console.error('Error moving file:', err);
                        logger.error(`Error moving audio file. ${err.message}`, { timestamp }); // Log any errors that occur during the file move
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            logger.info(`${username} Audio file uploaded successfully`, { timestamp }); // Log the successful audio upload
            res.sendStatus(200); // Use sendStatus to send a 200 status code
        } else {
            logger.error('User session not found', { timestamp }); // Log the case where the user session is not found
            res.status(401).json({ error: 'User session not found' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during audio upload. ${error.message}`, { timestamp }); // Log errors during the audio upload
        res.status(error.response.status).end();
    }
});

app.post('/timestamps', tokenRequired, (req, res) => {
    const username = req.session.username; // Retrieve username from session
    if (!username) {
        res.status(400).json({ error: 'Username is required' });
        return;
    }
    // Check if a timestamp already exists for the username and delete it
    if (sessionTimestamps.hasOwnProperty(username)) {
        delete sessionTimestamps[username];
    }

    // Update the session timestamp for the username
    sessionTimestamps[username] = Math.floor(Date.now() / 1000);

    res.json({ timestamp: sessionTimestamps[username] }); // Return the session timestamp for the same username
});

// Create User Directory Route
app.post('/create_user_directory', tokenRequired, (req, res) => {
    const username = req.session.username;
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    if (!username) {
        logger.error('Invalid request: Username is missing', { timestamp }); // Log an error if the username is missing
        return res.status(400).json({ message: "Invalid request" });
    }

    logger.info(`User directory created for: ${username}`, { timestamp }); // Log the creation of the user directory for the specific username

    // Define the path where the user directory will be created (adjust this as needed)
    const userDirectoryPath = path.join(parentDir, 'data', username);

    // Create the user directory
    fs.mkdir(userDirectoryPath, { recursive: true }, (err) => {
        if (err) {
            console.error("Error creating user directory:", err);
            logger.error(`Error creating user directory. ${err.message}`, { timestamp }); // Log the error if there's an issue creating the user directory
            return res.status(500).json({ message: "Error creating user directory" });
        }

        logger.info(`User directory created successfully for: ${username}`, { timestamp });

        res.status(200).json({ message: "User directory created" });
    });
});

// Submit Number Route
app.post('/submit_number', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging    
    const hierarchyid = xss(req.body.hierarchyid);
    const spaceid = xss(req.body.spaceid);

    try {
        data = {
            num_questions: parseInt(req.body.numberInput),
            space_id: spaceid,
            hierarchy_id: hierarchyid
        }

        const response = await axios.post(API_URL + "/api/get_num_questions", data);

        if (response.status === 200) {
            logger.info('Selected questions successfully', { timestamp }); // Log the successful selection of questions
            res.status(200).json({ message: "Selected questions successfully" });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error: ${error.message}`, { timestamp }); // Log any error that occurs during the process
        res.status(error.response.status).end();
    }
});

// Available Question Count Route
app.post('/available_question_count', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    const hierarchyid = xss(req.body.hierarchyid);
    const spaceid = xss(req.body.spaceid);

    try {
        data = {
            space_id: spaceid,
            hierarchy_id: hierarchyid
        }

        // Make an HTTP GET request to your Python backend
        const response = await axios.post(API_URL + '/api/available_question_count', data);

        if (response.status === 200) {
            logger.info('Available question count fetched successfully', { timestamp }); // Log the successful retrieval of the available question count
            const { available_question_count } = response.data;
            res.status(200).json({ available_question_count });
        } else {
            logger.error('An error occurred on the server', { timestamp }); // Log an error if there is an issue on the server
            res.status(response.status).json({ message: 'An error occurred on the server.' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error: ${error.message}`, { timestamp }); // Log any error that occurs during the process
        res.status(error.response.status).end();
    }
});

app.post('/reset_question_flags', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    const hierarchyid = xss(req.body.hierarchyid);
    const spaceid = xss(req.body.spaceid);

    try {
        data = {
            space_id: spaceid,
            hierarchy_id: hierarchyid
        }

        // Make an HTTP POST request to your Python backend
        const response = await axios.post(API_URL + '/api/reset_question_flags', data);

        if (response.status === 200) {
            logger.info('Question flags reset successfully', { timestamp }); // Log the successful reset of question flags
            res.status(200).json({ message: 'Question flags reset successfully.' });
        } else {
            logger.error('An error occurred on the server', { timestamp }); // Log an error if there is an issue on the server
            res.status(response.status).json({ message: 'An error occurred on the server.' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error: ${error.message}`, { timestamp }); // Log any error that occurs during the process
        res.status(error.response.status).end();
    }
});

app.post('/getquestionsfromapi', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    const hierarchyid = xss(req.body.hierarchyid);
    const user_id = req.session.user_id;

    // Store the hierarchy id in the session
    req.session.hierarchy_id = hierarchyid;

    try {
        logger.info('Attempting to fetch questions from the API', { timestamp }); // Log the attempt to fetch questions from the API

        data = {
            user_id: user_id,
            hierarchy_id: hierarchyid
        }

        const questionurl = API_URL + '/api/get_chosen_questions';
        const response = await axios.post(questionurl, data);

        if (response.status === 200) {
            const data = response.data;
            questions.length = 0;
            qid.length = 0; // Clear existing data
            qid.push(...data.chosen_questions.map((question_data) => question_data.qid));

            const qidLog = [...qid]; // Store qid values for logging without affecting the original array
            logger.info('Retrieved qid values:', { timestamp, qid: qidLog }); // Log the retrieved qid values

            questions = data.chosen_questions.map((question_data) => question_data.question);

            const questionsLog = [...questions]; // Store questions for logging without affecting the original array
            logger.info('Retrieved questions:', { timestamp, questions: questionsLog }); // Log the retrieved questions

            return res.status(200).json({ questions });
        } else {
            // Redirect to the second route in case of a 500 error
            throw new Error("Failed to fetch questions from the API");
        }
    } catch (error) {
        // Handle the error and redirect to the second route if it's a 500 error
        if (error.response && error.response.status === 500) {
            logger.error('Failed to fetch questions from the API', { timestamp }); // Log the failure to fetch questions from the API
            return res.redirect('/getquestionsfromapidb');
        } else {
            logger.error(`An error occurred: ${error.message}`, { timestamp }); // Log the general error message
            return res.status(500).json({ message: `An error occurred: ${error.message}` });
        }
    }
});

app.get('/getquestionsfromapidb', async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    try {
        const filePath = path.join(questiondir, 'dbquestions.txt');
        logger.info('Attempting to read questions from the database file', { timestamp }); // Log the attempt to read questions from the database file

        const fileContents = fs.readFileSync(filePath, 'utf8');

        const lines = fileContents.split('\n');
        const questionsArray = [];
        const qidArray = [];

        for (let i = 0; i < lines.length; i++) {
            // Split each line by 'Question ID:' to extract the value after it
            const parts = lines[i].split('Question ID:');

            if (parts.length === 2) {
                // Extract the numeric part (QID) and parse it as an integer
                const qidValue = parseInt(parts[1].trim(), 10);
                qidArray.push(qidValue);
            }

            // Find the position of "Question:"
            const questionIndex = lines[i].indexOf('Question:');

            if (questionIndex !== -1) {
                // Extract the question text after "Question:" and trim whitespace
                const questionText = lines[i].substring(questionIndex + 'Question:'.length).trim();
                questionsArray.push(questionText);
            }
        }

        // Update the global qid and questions variables with the new values
        qid.length = 0;
        qid.push(...qidArray);

        const qidLog = [...qid]; // Store qid values for logging without affecting the original array
        logger.info(`Retrieved qid values from the database file: ${qidLog}`, { timestamp }); // Log the retrieved qid values from the database file

        questions.length = 0;
        questions.push(...questionsArray);

        const questionsLog = [...questions]; // Store questions for logging without affecting the original array
        logger.info(`Retrieved questions from the database file: ${questionsLog}`, { timestamp }); // Log the retrieved questions from the database file

        return res.status(200).json({ questions: questionsArray });
    } catch (error) {
        logger.error(`An error occurred while reading questions from the database file. ${error.message}`, { timestamp }); // Log the error that occurred while reading questions from the database file
        return res.status(500).json({ message: `An error occurred: ${error.message}` });
    }
});

app.post('/stt', async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    try {
        const username = req.session.username; // Assuming you have session management middleware
        const quesNumber = xss(req.body.quesNumber);
        logger.info(`${username} Performing STT:`, { timestamp }); // Log the entry into the chat mode

        if (username in sessionTimestamps) {
            const sessionTimestamp = sessionTimestamps[username];
            const newuserdirectorypath = path.join(userDirectoriesPath, username);
            const video_files = fs.readdirSync(newuserdirectorypath);
            const video_names = video_files.filter((filename) =>
                (filename.endsWith('.mp4') || filename.endsWith('.mp3')) && filename.startsWith(`${username}_${sessionTimestamp}_Question${quesNumber}`)
            );
            logger.info(`${username} Matching videos found: ${video_names}`, { timestamp }); // Log the matching videos found

            let data = {};

            if (video_names.length > 0) {
                data = {
                    user_id: xss(username),
                    quesNumber: quesNumber,
                    videos: video_names,
                    timestamp: sessionTimestamp,
                };
                logger.info(`${username} Data for stt API: ${data}`, { timestamp }); // Log the data before making the chat API request

                // Make a POST request to the API endpoint
                const sttResponse = await axios.post(API_URL + '/api/stt', data);

                if (sttResponse.status === 200) {
                    logger.info(`${username} STT request successful: ${sttResponse.data}`, { timestamp }); // Log the successful chat API request
                    return res.status(200).json(sttResponse.data);
                } else {
                    logger.error(`${username} Failed to get the feedback.`, { timestamp }); // Log the failure to get the feedback
                    return res.status(sttResponse.status).json({ message: 'Failed to get the feedback' });
                }
            } else {
                // Handle the case where there are no video_names
                logger.error(`${username} No matching video found.`, { timestamp }); // Log the case where no matching videos are found
                return res.status(404).json({ message: 'No matching video found' });
            }
        } else {
            // Handle the case where the username is not in sessionTimestamps
            logger.error('Unauthorized access:', { timestamp }); // Log the unauthorized access attempt
            return res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during stt: ${error.message}`, { timestamp }); // Log any error that occurs during the stt
        res.status(error.response.status).end();
    }
});

app.post('/chat', async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    try {
        const username = req.session.username; // Assuming you have session management middleware
        const question = xss(req.body.question);
        const answer = xss(req.body.answer);
        logger.info(`${username} Performing LLM:`, { timestamp }); // Log the entry into the chat mode

        if (username in sessionTimestamps) {
            const sessionTimestamp = sessionTimestamps[username];
            let data = {};

            if (answer.length > 0) {
                data = {
                    user_id: xss(username),
                    question: question,
                    timestamp: sessionTimestamp,
                    answer: answer,
                };
                logger.info(`${username} Data for LLM API: ${data}`, { timestamp }); // Log the data before making the llm API request

                // Make a POST request to the API endpoint
                const llmResponse = await axios.post(API_URL + '/api/chat', data);

                if (llmResponse.status === 200) {
                    logger.info(`${username} llm request successful: ${llmResponse.data}`, { timestamp }); // Log the successful llm API request
                    return res.status(200).json(llmResponse.data);
                } else {
                    logger.error(`${username} Failed to get the feedback.`, { timestamp }); // Log the failure to get the feedback
                    return res.status(llmResponse.status).json({ message: 'Failed to get the feedback' });
                }
            } else {
                // Handle the case where there are no answer
                logger.error(`${username} No answer found.`, { timestamp }); // Log the case where no answer are found
                return res.status(404).json({ message: 'No answer found' });
            }
        } else {
            // Handle the case where the username is not in sessionTimestamps
            logger.error('Unauthorized access:', { timestamp }); // Log the unauthorized access attempt
            return res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during stt: ${error.message}`, { timestamp }); // Log any error that occurs during the llm
        res.status(error.response.status).end();
    }
});

app.post('/chatreset', async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    try {
        const username = req.session.username; // Assuming you have session management middleware
        logger.info(`${username} Initiating chat reset.`, { timestamp }); // Log the initiation of the chat reset

        if (username) {
            let data = {};
            data = {
                user_id: xss(username),
            };
            logger.info(`${username} Data for chat reset API: ${data}`, { timestamp }); // Log the data before making the chat reset API request

            // Make a POST request to the API endpoint
            const apiResponse = await axios.post(API_URL + '/api/chatreset', data);

            if (apiResponse.status === 200) {
                logger.info(`${username} Chat reset API request successful: ${apiResponse.data}`, { timestamp }); // Log the successful chat reset API request
                return res.status(200).json(apiResponse.data);
            } else {
                logger.error(`${username} Failed to reset chat.`, { timestamp }); // Log the failure to reset the chat
                return res.status(apiResponse.status).json({ message: 'Failed to reset the chat' });
            }
        } else {
            // Handle the case where the username is not in sessionTimestamps
            logger.error('Unauthorized access:', { timestamp }); // Log the unauthorized access attempt
            return res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during chat reset: ${error.message}`, { timestamp }); // Log any error that occurs during the chat reset
        res.status(error.response.status).end();
    }
});









app.post('/submit', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    try {
        const username = req.session.username;

        if (username in sessionTimestamps) {
            const sessionTimestamp = sessionTimestamps[username];
            let data = {};
            let responseStatus = {};

            data = {
                hierarchy_id: req.session.hierarchy_id,
                username: username,
                qid: qid,
                timestamp: sessionTimestamp,
            };

            const timestamp = moment().format('DD-MM-YYYY HH:mm:ss');
            logger.info(`${username} Data for Whisper session creation: ${data}`, { timestamp }); // Log the data before creating the Whisper session

            // Make a POST request to the API endpoint
            const response = await axios.post(API_URL + '/api/submit', data);

            if (response.status === 200) {
                responseStatus = { status: 'success' };
                logger.info(`${username} Whisper session created successfully.`, { timestamp });
                return res.status(200).json(responseStatus);
            } else {
                logger.error(`${username} Failed to create Whisper session.`, { timestamp });
                return res.status(response.status).json({ message: 'Failed to create Whisper session' });
            }

        } else {
            // Handle the case where the username is not in sessionTimestamps
            logger.error('Unauthorized access during Whisper session creation:', { timestamp });
            return res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during Whisper session creation: ${error.message}`, { timestamp });
        res.status(error.response.status).end();
    }
});

app.get('/summary', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    try {
        const summaryTable = [];
        const username = req.session.username; // Assuming you have user sessions set up

        if (username in sessionTimestamps) {
            const sessionTimestamp = sessionTimestamps[username];
            // const qidToQuestion = Object.fromEntries(qid.map((key, i) => [key, questions[i]]));

            // Ensure savedFlag has the same length as questions list
            while (savedFlag.length < questions.length) {
                savedFlag.push(0); // Initialize with default value
            }

            while (promptFlag.length < qid.length) {
                promptFlag.push(0);
            }

            while (llmFlag.length < qid.length) {
                llmFlag.push(0);
            }

            // const userDirectoryPath = path.join(backendApiPath, username);

            for (let idx = 0; idx < qid.length; idx++) {
                const questionId = qid[idx];
                const question = questions[idx];
                let questionRecorded = false;
                let questionSaved = false;
                const videoFilename = `${username}_${sessionTimestamp}_Question${idx + 1}.mp4`;
                const audioFilename = `${username}_${sessionTimestamp}_Question${idx + 1}.mp3`;
                const newuserdirectorypath = path.join(userDirectoriesPath, username)
                // Define the destination path where you want to save the video
                const filepath = path.join(newuserdirectorypath, videoFilename);
                const filepath1 = path.join(newuserdirectorypath, audioFilename);
                if (fs.existsSync(newuserdirectorypath)) {
                    const filesInDirectory = fs.readdirSync(newuserdirectorypath);

                    if (filesInDirectory.includes(videoFilename)) {
                        questionRecorded = true;
                    }

                    if (filesInDirectory.includes(audioFilename)) {
                        questionRecorded = true;
                    }

                    if (questionRecorded && fs.existsSync(filepath)) {
                        questionSaved = true;
                    }
                    if (questionRecorded && fs.existsSync(filepath1)) {
                        questionSaved = true;
                    }
                }

                savedFlag[idx] = questionSaved ? 1 : 0;
                const questionSavedFlag = savedFlag[idx];
                promptFlag[idx] = 0;
                llmFlag[idx] = 0;

                const data = {
                    hierarchy_id: req.session.hierarchy_id,
                    user_id: req.session.user_id,
                    session_id: sessionTimestamp,
                    question_id: questionId,
                    question_saved_flag: questionSavedFlag,
                    prompt_flag: promptFlag[idx],
                    llm_flag: llmFlag[idx],
                };

                try {
                    const response = await axios.post(API_URL + '/api/summary', data);

                    if (response.status === 200) {
                        summaryTable.push({
                            question,
                            recorded_flag: questionRecorded ? 1 : 0,
                            saved_flag: questionSaved ? 1 : 0,
                        });
                    }
                } catch (error) {
                    console.error(error);
                }
            }

            logger.info(`${username} Summary data retrieved successfully.`, { timestamp });
            return res.status(200).json({ questions: summaryTable });
        } else {
            logger.error('Unauthorized access during summary retrieval:', { timestamp });
            return res.status(401).json({ message: 'Unauthorized' });
        }
    } catch (error) {
        logger.error(`Error during summary retrieval: ${error.message}`, { timestamp, error: error.message });
        return res.status(500).json({ message: 'An error occurred during summary retrieval' });
    }
});

app.post('/get_sessions', async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    try {
        const username = req.body.username;
        const hierarchy_id = req.body.hierarchy_id;
        const data = {
            username,
            hierarchy_id
        };
        const response = await axios.post(API_URL + '/api/get_sessions', data);

        if (response.status === 200) {
            let html = response.data;

            // Ensure html is a string
            if (typeof html !== 'string') {
                html = html.toString();
            }

            const sessionOptionsArray = html.split('<option').map(option => {
                const match = option.match(/value="(\d+)"/);
                return match ? match[1] : null;
            }).filter(Boolean);

            // Convert Unix timestamps to custom format date-time strings
            const customDateStrings = sessionOptionsArray.map(timestamp => {
                const date = new Date(parseInt(timestamp) * 1000); // Convert seconds to milliseconds
                const options = {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                };
                return date.toLocaleDateString(undefined, options);
            });

            logger.info(`${username} Sessions fetched successfully`, { timestamp });
            res.status(200).json(customDateStrings);
        } else {
            logger.error(`${username} Failed to fetch sessions`, { timestamp });
            res.status(response.status).json({ error: 'Failed to fetch sessions' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during session retrieval: ${error.message}`, { timestamp, error: error.message });
        res.status(500).json({ error: 'An error occurred during session retrieval' });
    }
});
app.post('/dashboardtransactions', async (req, res) => {
    const username = req.body.username;
    const sessionTimestamp = req.body.session_id;
    const hierarchy_id = req.body.hierarchy_id;
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging

    try {

        const convertedDate = moment(sessionTimestamp, 'MMM DD, YYYY, hh:mm:ss A').format('MMM DD, YYYY, HH:mm:ss');
        const sessionUnixTimestamp = moment(convertedDate, 'MMM DD, YYYY, HH:mm:ss').unix();

        const data = {
            username: username,
            session_id: sessionUnixTimestamp,
            hierarchy_id: hierarchy_id // Include the UNIX timestamp in the data
        };
        // Send data as JSON in the request using axios
        const response = await axios.post(API_URL + '/api/dashboard', data);

        if (response.status === 200) {
            const transaction_rows = response.data.transactions;
            logger.info(`${username} Transactions fetched successfully`, { timestamp });
            return res.status(200).json({ transactions_html: transaction_rows });
        } else {
            const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
            logger.error(`${username} Failed to fetch transactions`, { timestamp });
            return res.status(response.status).json({ error: 'Failed to fetch transactions' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during transaction retrieval: ${error.message}`, { timestamp });
        return res.status(500).json({ error: 'An error occurred during transaction retrieval' });
    }
});


app.post('/chart', async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    try {
        // Get the username from the request body
        const username = req.body.username;
        const requestData = {
            username: username
        };

        // Make a POST request to /api/chart with the username
        const response = await axios.post(API_URL + '/api/chart', requestData);

        // Check if the response status is 200
        if (response.status === 200) {
            // Assuming you receive some data back from /api/chart
            const chartData = response.data;
            // You can do something with chartData here or send it back to the front end
            logger.info(`${username} Chart data fetched successfully`, { timestamp });
            res.status(200).json(chartData);
        } else {
            // Handle non-200 status codes here
            logger.error(`Received non-200 status from API. ${response.status}`, { timestamp });
            res.status(response.status).json({ error: 'Received non-200 status from API' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error during chart data retrieval: ${error.message}`, { timestamp });
        res.status(500).json({ error: 'An error occurred during chart data retrieval' });
    }
});

// Active Admins Route
app.post('/active_admins', tokenRequired, async (req, res) => {
    const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
    try {
        data = {}
        // Make an HTTP GET request to your Python backend
        const response = await axios.post(API_URL + '/api/active_admins', data);

        if (response.status === 200) {
            logger.info('Active Users fetched successfully', { timestamp }); // Log the successful retrieval of the active users
            const { active_admins } = response.data;
            res.status(200).json({ active_admins });
        } else {
            logger.error('An error occurred on the server', { timestamp }); // Log an error if there is an issue on the server
            res.status(response.status).json({ message: 'An error occurred on the server.' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        logger.error(`Error: ${error.message}`, { timestamp }); // Log any error that occurs during the process
        res.status(error.response.status).end();
    }
});

app.get('/logout', async (req, res) => {
    try {
        // Assuming you have access to the user_id in your session data
        const user_id = req.session.user_id;

        const requestData = {
            user_id: user_id
        };

        // Make a request to the FastAPI route to update user_active
        const response = await axios.post(API_URL + '/api/logout', requestData);

        if (response.status === 200) {
            // Clear session data
            req.session.destroy(err => {
                if (err) {
                    console.error('Error while logging out:', err);
                    return res.status(500).json({ message: 'Internal Server Error' });
                }

                const timestamp = moment().format('DD-MM-YYYY HH:mm:ss');
                res.status(200).json({ message: 'Logout successful' });
            });
        } else {
            console.error(`Unexpected response status: ${response.status}`);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



app.listen(port, host, (err) => {
    if (err) {
        console.error('Error starting the server:', err);
    } else {
        console.log(`Server is running on ${host}:${port}`);
    }
});

module.exports = app;
