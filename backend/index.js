const express = require('express');
const cors = require('cors');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow both old and new frontend ports
    credentials: true,
}));
app.use(express.json());
// Session configuration
const fileStoreOptions = {};
app.use(session({
    store: new FileStore(fileStoreOptions),
    secret: 'your-secret-key', // It's good practice to use an environment variable for this
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    }
}));

// Routes
app.get('/', (req, res) => {
    res.send('Jira Integration Backend is running!');
});

app.post('/api/auth/login', async (req, res) => {
    // Correctly extract jiraSite from the request body
    let { jiraSite, email, apiToken } = req.body;

    if (!jiraSite || !email || !apiToken) {
        return res.status(400).json({ message: 'Jira Site, email, and API token are required.' });
    }

    // Ensure the URL has a protocol
    if (!jiraSite.startsWith('http://') && !jiraSite.startsWith('https://')) {
        jiraSite = `https://${jiraSite}`;
    }

    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;

    try {
        const response = await axios.get(`${jiraSite}/rest/api/3/myself`, { headers: { 'Authorization': authHeader } });

        if (response.status === 200) {
            req.session.jiraCreds = {
                url: jiraSite, // Use the corrected variable
                auth: authHeader
            };
            res.status(200).json({ message: 'Login successful.' });
        } else {
            res.status(response.status).json({ message: 'Jira authentication failed.' });
        }
    } catch (error) {
        res.status(401).json({ message: 'Login failed. Please check your credentials and site URL.' });
    }
});

app.get('/api/tickets', async (req, res) => {
    if (!req.session.jiraCreds) {
        return res.status(401).json({ message: 'Unauthorized. Please log in first.' });
    }

    const { url, auth } = req.session.jiraCreds;
    const jiraProjectKey = process.env.JIRA_PROJECT_KEY || 'KAN';

    try {
        const response = await axios.get(`${url}/rest/api/3/search`, {
            headers: { 'Authorization': auth },
            params: {
                jql: `project = "${jiraProjectKey}" AND issuetype = Story ORDER BY created DESC`,
                // Fetch only the necessary fields from Jira.
                fields: 'summary,status,duedate'
            }
        });

        if (response.status === 200) {
            const issues = response.data.issues;
            const columns = ['Item#', 'Title', 'Status', 'Due Date'];
            const tickets = issues.map(issue => {
                const fields = issue.fields || {};
                return {
                    'Item#': issue.key,
                    'Title': fields.summary || 'No Summary',
                    'Status': fields.status ? fields.status.name : 'No Status',
                    // Send date in YYYY-MM-DD format or null
                    'Due Date': fields.duedate ? fields.duedate : null
                };
            });
            res.json({ columns, tickets });
        } else {
            res.status(response.status).json({ message: 'Failed to fetch tickets from Jira' });
        }
    } catch (error) {
        console.error('Error fetching Jira tickets:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'An error occurred while fetching tickets.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 