// =================================================================================================
//
//   VERSION: 1.2 (STABLE)
//   DATE: 2024-07-16
//
//   DESCRIPTION: This file represents a stable, working version of the application.
//                Extreme caution should be exercised when making modifications.
//                It is highly recommended to create a new branch from the 'v1.2-stable'
//                git tag before implementing new features or fixes.
//
// =================================================================================================

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
require('dotenv').config();

const app = express();
const port = 5001;

// Define the exact list of Jira fields required for the dashboard.
// This prevents fetching all fields and makes the app's behavior predictable.
const REQUIRED_JIRA_FIELDS = [
    // Standard fields that are always available
    'summary',
    'status',
    'issuetype',
    'project',
    'created',
    'duedate',
    'labels',
    'reporter',
    'assignee',

    // Custom fields - these names must match the configuration in your Jira instance.
    'UAT Handover Date',
    'UAT Planned Start Date',
    'UAT Planned Completion',
    'UAT Status',
    'Planned Release Date',
    'Release Status',
];


// CORS configuration to allow credentials from the frontend origin
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'null', 'file://'],
    credentials: true
}));

app.use(express.json());

// Session management setup
app.use(session({
    store: new FileStore({ path: './sessions', ttl: 86400, retries: 0 }),
    secret: process.env.SESSION_SECRET || 'a-very-secret-key',
    resave: false,
    saveUninitialized: false, // Changed to false for better security
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// Login endpoint to authenticate with Jira
app.post('/api/auth/login', async (req, res) => {
    const { jiraSite, email, apiToken, jiraProjectKey } = req.body;

    if (!jiraSite || !email || !apiToken || !jiraProjectKey) {
        return res.status(400).json({ message: 'Jira Site, Email, API Token, and Project Key are required.' });
    }

    // Ensure the URL starts with https://
    const url = jiraSite.startsWith('http') ? jiraSite : `https://${jiraSite}`;
    const auth = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;

    try {
        // Verify credentials by fetching user info
        const response = await axios.get(`${url}/rest/api/3/myself`, {
            headers: { 'Authorization': auth }
        });

        if (response.status === 200) {
            // Store all necessary credentials and the project key in the session
            req.session.jiraCreds = { url, auth, jiraProjectKey };
            res.json({ message: 'Login successful' });
        } else {
            res.status(response.status).json({ message: 'Login failed' });
        }
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const message = error.response ? error.response.statusText : error.message;
        res.status(status).json({ message: `Login failed: ${message}` });
    }
});

// Fetches and maps all available Jira fields
app.get('/api/jira-fields', async (req, res) => {
    if (!req.session.jiraCreds) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    const { url, auth } = req.session.jiraCreds;

    try {
        const response = await axios.get(`${url}/rest/api/2/field`, {
            headers: { 'Authorization': auth }
        });

        // Instead of returning all fields, filter to only include the ones we need.
        const allJiraFields = response.data;
        const requiredFieldNames = REQUIRED_JIRA_FIELDS.map(name => name.toLowerCase());
        
        const requiredFields = allJiraFields.filter(field => 
            requiredFieldNames.includes(field.name.toLowerCase()) || requiredFieldNames.includes(field.id)
        );

        res.json(requiredFields);
    } catch (error) {
        console.error('Failed to fetch Jira fields:', error.message);
        res.status(500).json({ message: 'Failed to fetch Jira fields' });
    }
});

// Fetches all tickets for a given project
app.get('/api/tickets', async (req, res) => {
    console.log('--- Received request for /api/tickets ---');

    if (!req.session.jiraCreds) {
        console.log('Session check failed: No jiraCreds found.');
        return res.status(401).json({ message: 'Unauthorized. Please log in first.' });
    }

    const { url, auth, jiraProjectKey } = req.session.jiraCreds;
    
    console.log(`Session details: projectKey=${jiraProjectKey}`);

    if (!jiraProjectKey) {
        console.log('Error: jiraProjectKey is missing from session.');
        return res.status(400).json({ message: 'Jira Project Key is missing from session. Please log in again.' });
    }

    const jql = `project = "${jiraProjectKey}" AND issuetype = Story ORDER BY created DESC`;
    const fieldsToFetch = REQUIRED_JIRA_FIELDS.join(',');

    console.log(`Constructed JQL: ${jql}`);
    console.log(`Fields to fetch: ${fieldsToFetch}`);

    try {
        const searchResponse = await axios.get(`${url}/rest/api/3/search`, {
            headers: { 'Authorization': auth },
            params: { jql, fields: fieldsToFetch }
        });

        console.log('Jira API response status:', searchResponse.status);
        console.log(`Jira API returned ${searchResponse.data.issues.length} issues.`);

        // The frontend expects an array of tickets, not an object.
        res.json(searchResponse.data.issues);

    } catch (error) {
        console.error('Error fetching Jira tickets:');
        if (error.response) {
            console.error('Jira API Error Status:', error.response.status);
            console.error('Jira API Error Body:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Axios Error:', error.message);
        }
        res.status(500).json({ message: 'An internal server error occurred while fetching tickets.' });
    }
});

// Updates a specific ticket. Changed to PATCH for partial updates.
app.patch('/api/tickets/:issueKey', async (req, res) => {
    if (!req.session.jiraCreds) {
        return res.status(401).json({ message: 'Unauthorized. Please log in first.' });
    }

    const { url, auth } = req.session.jiraCreds;
    const { issueKey } = req.params;
    const { updates } = req.body; // Expecting an 'updates' object from the frontend.

    if (!updates) {
        return res.status(400).json({ message: 'Update data is missing.' });
    }
    
    try {
        const fieldsToUpdate = {};
        let statusTransitionId = null;

        // Separate regular field updates from status transitions
        for (const fieldName in updates) {
            const value = updates[fieldName];
            if (fieldName.toLowerCase() === 'status') {
                // Find the transition ID for the new status
                const transitionsResponse = await axios.get(`${url}/rest/api/3/issue/${issueKey}/transitions`, {
                    headers: { 'Authorization': auth }
                });
                const transition = transitionsResponse.data.transitions.find(t => t.name.toLowerCase() === value.toLowerCase());
                
                if (transition) {
                    statusTransitionId = transition.id;
                } else {
                    return res.status(400).json({ message: `Invalid status transition: "${value}"`});
                }
            } else {
                fieldsToUpdate[fieldName] = value;
            }
        }
        
        // If there are regular fields to update, send a PUT request to the issue.
        // Jira's API for setting fields is a PUT, not a PATCH on the /issue endpoint.
        if (Object.keys(fieldsToUpdate).length > 0) {
            await axios.put(`${url}/rest/api/3/issue/${issueKey}`, { fields: fieldsToUpdate }, {
                headers: { 
                    'Authorization': auth,
                    'Content-Type': 'application/json'
                }
            });
        }

        // If there is a status transition to perform, do it now.
        if (statusTransitionId) {
            await axios.post(`${url}/rest/api/3/issue/${issueKey}/transitions`, { transition: { id: statusTransitionId } }, {
                headers: { 
                    'Authorization': auth,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        res.json({ message: 'Ticket updated successfully.' });

    } catch (error) {
        const errDetails = error.response ? error.response.data : { message: error.message };
        console.error('Error updating Jira ticket:', JSON.stringify(errDetails, null, 2));
        res.status(500).json({ 
            message: 'Failed to update ticket in Jira.',
            details: errDetails.errors || errDetails.errorMessages || {}
        });
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}); 