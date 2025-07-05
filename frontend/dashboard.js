const API_URL = 'http://localhost:5001';

// This configuration defines the structure and behavior of the dashboard table.
// It is the single source of truth for what columns are displayed and how they function.
const columnDefinition = [
    // Standard Jira fields that are displayed but not editable by the user.
    { name: 'Item#', jiraName: 'key', isJira: true, isEditable: false, isVisible: true, isStandardJiraField: true },
    { name: 'Title', jiraName: 'summary', isJira: true, isEditable: true, isVisible: true, isStandardJiraField: true },
    { name: 'Status', jiraName: 'status', isJira: true, isEditable: true, isVisible: true, isStandardJiraField: true },
    // "Due Date" from Jira is repurposed as the "UAT Handover Date" on the frontend.
    { name: 'UAT Handover Date', jiraName: 'duedate', isJira: true, isEditable: true, isVisible: true, type: 'date', isStandardJiraField: true },

    // User-editable fields that correspond to Jira custom fields.
    { name: 'UAT Planned Start Date', jiraName: 'UAT Planned Start Date', isJira: true, isEditable: true, isVisible: true, type: 'date' },
    { name: 'UAT Planned Completion', jiraName: 'UAT Planned Completion', isJira: true, isEditable: true, isVisible: true, type: 'date' },
    { 
        name: 'UAT Status', 
        jiraName: 'UAT Status', 
        isJira: true, 
        isEditable: true, 
        isVisible: true, 
        type: 'dropdown',
        dropdownOptions: ['Not Started', 'In Progress', 'Signed-off', 'Delayed'] 
    },
    { name: 'Planned Release Date', jiraName: 'Planned Release Date', isJira: true, isEditable: true, isVisible: true, type: 'date' },
    { 
        name: 'Release Status', 
        jiraName: 'Release Status', 
        isJira: true, 
        isEditable: true, 
        isVisible: true, 
        type: 'dropdown',
        dropdownOptions: ['Not Started', 'In Progress', 'Released', 'Delayed']
    },

    // Jira fields that are fetched for logic but not displayed to the user.
    { name: 'Created', jiraName: 'created', isJira: true, isEditable: false, isVisible: false },
    { name: 'Labels', jiraName: 'labels', isJira: true, isEditable: false, isVisible: false },
    { name: 'Reporter', jiraName: 'reporter', isJira: true, isEditable: false, isVisible: false },
];

// This will be populated with the final column configuration, including Jira field IDs.
let tableColumns = [];
// This map stores the mapping of user-facing column names to Jira's internal field IDs.
let jiraFieldIdMap = {};


/**
 * Retrieves ticket data from local storage.
 * @param {string} issueKey - The key of the issue to retrieve.
 * @returns {object} The stored data for the ticket.
 */
const getStoredTicketData = (issueKey) => JSON.parse(localStorage.getItem(issueKey) || '{}');

/**
 * Saves ticket data to local storage.
 * @param {string} issueKey - The key of the issue to save.
 * @param {object} data - The data to save for the ticket.
 */
const saveStoredTicketData = (issueKey, data) => localStorage.setItem(issueKey, JSON.stringify(data));


/**
 * Fetches the required Jira field definitions from the backend and configures the table columns.
 */
const fetchAndSetColumns = async () => {
    try {
        const response = await fetch(`${API_URL}/api/jira-fields`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jiraFields = await response.json();
        
        // Create a map of Jira field names and IDs for quick lookup.
        const jiraFieldMap = new Map();
        jiraFields.forEach(field => {
            jiraFieldMap.set(field.name.toLowerCase(), field);
            jiraFieldMap.set(field.id, field);
        });

        // Enrich the columnDefinition with the actual Jira field ID.
        tableColumns = columnDefinition.map(col => {
            const jiraField = jiraFieldMap.get(col.jiraName.toLowerCase());
            const fieldId = jiraField ? jiraField.id : col.jiraName;
            return { ...col, id: fieldId };
        });
        
        // Populate the name-to-ID map used when saving data.
        tableColumns.forEach(col => {
            if (col.isJira) {
                jiraFieldIdMap[col.name] = col.id;
            }
        });

    } catch (error) {
        console.error('Failed to fetch and set up Jira columns:', error);
        // Display an error to the user on the page
        const container = document.getElementById('dashboard-container');
        if (container) {
            container.innerHTML = `<div class="text-red-500">Error: Could not load Jira field configuration. Please check the backend server and your Jira connection.</div>`;
        }
    }
};

/**
 * Fetches all tickets from the backend.
 * @returns {Promise<Array>} A promise that resolves to an array of ticket objects.
 */
async function fetchTickets() {
    try {
        const response = await fetch(`${API_URL}/api/tickets`, {credentials: 'include'});
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'index.html'; // Redirect to login
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tickets = await response.json();
        return tickets;
    } catch (error) {
        console.error('Failed to fetch tickets:', error);
        return [];
    }
}

/**
 * Renders the entire ticket table, including headers and rows.
 * @param {Array} tickets - An array of ticket objects from Jira.
 */
function renderTable(tickets) {
    const container = document.getElementById('dashboard-container');
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';

    const visibleColumns = tableColumns.filter(c => c.isVisible);

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add an actions column header first
    const actionsHeader = document.createElement('th');
    actionsHeader.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50';
    actionsHeader.textContent = 'Actions';
    headerRow.appendChild(actionsHeader);

    visibleColumns.forEach(column => {
        const th = document.createElement('th');
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
        
        // Apply color coding to headers based on column type
        if (column.isStandardJiraField) {
            th.classList.add('bg-green-100'); // Standard Jira field header color
        } else if (column.isEditable) {
            th.classList.add('bg-yellow-100'); // Editable custom field header color
        } else {
            th.classList.add('bg-gray-50'); // Default header color
        }

        th.textContent = column.name;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';
    if (tickets.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = visibleColumns.length + 2; // +2 for actions and save
        td.className = 'px-6 py-4 text-center text-gray-500';
        td.textContent = 'No tickets found.';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        tickets.forEach(ticket => {
            const tr = document.createElement('tr');
            tr.id = `ticket-${ticket.key}`;

            const storedData = getStoredTicketData(ticket.key);

            // Add actions cell with edit/save buttons
            const actionsCell = document.createElement('td');
            actionsCell.className = 'px-6 py-4';
            
            const editButton = document.createElement('button');
            editButton.innerHTML = '✏️'; // Edit icon
            editButton.className = 'edit-btn bg-gray-200 hover:bg-gray-300 text-black font-bold py-2 px-4 rounded';
            editButton.onclick = () => toggleEditMode(ticket.key, true);
            
            const saveButton = document.createElement('button');
            saveButton.textContent = 'Save';
            saveButton.className = 'save-btn bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded hidden';
            saveButton.onclick = () => saveChanges(ticket.key);

            actionsCell.appendChild(editButton);
            actionsCell.appendChild(saveButton);
            tr.appendChild(actionsCell);

            visibleColumns.forEach(column => {
                const td = document.createElement('td');
                td.className = 'px-6 py-4 whitespace-nowrap';

                // Apply color coding to cells. Only non-standard editable columns get a background color.
                if (column.isEditable && !column.isStandardJiraField) {
                    td.classList.add('bg-yellow-50'); // Editable cell color for custom fields
                }

                if (column.isEditable) {
                    // This is a field the user can edit directly.
                    const savedValue = storedData[column.name] || (ticket.fields[column.id] ? (column.type === 'date' ? ticket.fields[column.id].split('T')[0] : ticket.fields[column.id]) : '');
                    
                    const isStandardJiraField = column.isStandardJiraField;

                    if (column.type === 'dropdown') {
                        const select = document.createElement('select');
                        select.id = `${ticket.key}-${column.id}`;
                        // Standard Jira fields start as text-like, others are regular inputs.
                        select.className = isStandardJiraField ? 'w-full p-1 bg-transparent border-none' : 'w-full p-1 bg-white border border-gray-300 rounded';
                        select.disabled = isStandardJiraField; // Only disable standard Jira fields by default
                        
                        column.dropdownOptions.forEach(optionText => {
                            const option = document.createElement('option');
                            option.value = optionText;
                            option.textContent = optionText;
                            if (savedValue === optionText) {
                                option.selected = true;
                            }
                            select.appendChild(option);
                        });
                        td.appendChild(select);
                    } else {
                        const input = document.createElement('input');
                        input.type = column.type || 'text';
                        input.id = `${ticket.key}-${column.id}`;
                        // Standard Jira fields start as text-like, others are regular inputs.
                        input.className = isStandardJiraField ? 'w-full p-1 bg-transparent border-none' : 'w-full p-1 bg-white border border-gray-300 rounded';
                        input.value = savedValue;
                        input.readOnly = isStandardJiraField; // Only make standard Jira fields read-only by default
                        td.appendChild(input);
                    }
                } else {
                    let cellValue = '';
                    if (column.id === 'key') {
                        cellValue = ticket.key;
                    } else if (ticket.fields[column.id]) {
                        const field = ticket.fields[column.id];
                        if (column.jiraName === 'status' && typeof field === 'object' && field !== null) {
                            cellValue = field.name || JSON.stringify(field);
                        } else if (typeof field === 'object' && field !== null) {
                            cellValue = field.name || field.value || JSON.stringify(field);
                        } else {
                            // Format date fields correctly
                            if (column.jiraName === 'duedate') {
                                cellValue = new Date(field).toLocaleDateString('en-CA'); // YYYY-MM-DD
                            } else {
                                cellValue = field;
                            }
                        }
                    }
                    td.textContent = cellValue;
                }
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
    }

    table.appendChild(tbody);
    container.appendChild(table);

    // Add instructional text if there are editable columns
    if (tableColumns.some(c => c.isEditable)) {
        const p = document.createElement('p');
        p.className = 'text-sm text-gray-600 mt-4';
        p.innerHTML = `
            <span class="font-bold">Instructions:</span> 
            Click the <span class="inline-block bg-gray-200 px-2 py-1 rounded">✏️</span> icon to edit a row's fields.
            Rows with a <span class="bg-green-100">green header</span> are from Jira. 
            Those with a <span class="bg-yellow-100">yellow header</span> are user-editable fields.
        `;
        container.appendChild(p);
    }
}

/**
 * Toggles the edit state for a specific ticket row.
 * @param {string} issueKey - The key of the ticket row to toggle.
 * @param {boolean} isEditing - True to enable editing, false to disable.
 */
function toggleEditMode(issueKey, isEditing) {
    // This function now specifically targets the standard Jira fields for toggling.
    tableColumns.forEach(column => {
        if (column.isEditable && column.isStandardJiraField) {
            const element = document.getElementById(`${issueKey}-${column.id}`);
            if (element) {
                const isReadOnly = !isEditing;
                
                if (column.type === 'dropdown') {
                    element.disabled = isReadOnly;
                } else {
                    element.readOnly = isReadOnly;
                }

                // Toggle styles to make it look editable or like plain text.
                if (isReadOnly) {
                    element.classList.add('bg-transparent', 'border-none');
                    element.classList.remove('bg-white', 'border-gray-300', 'rounded');
                } else {
                    element.classList.remove('bg-transparent', 'border-none');
                    element.classList.add('bg-white', 'border-gray-300', 'rounded');
                }
            }
        }
    });

    // Toggle the visibility of the Edit and Save buttons
    const editButton = document.querySelector(`#ticket-${issueKey} .edit-btn`);
    const saveButton = document.querySelector(`#ticket-${issueKey} .save-btn`);
    if (editButton) editButton.classList.toggle('hidden', isEditing);
    if (saveButton) saveButton.classList.toggle('hidden', !isEditing);
}

/**
 * Gathers the edited data from the form, sends it to the backend, and handles the response.
 * @param {string} issueKey - The Jira issue key for the ticket being saved.
 */
async function saveChanges(issueKey) {
    const payload = {};
    const updatedLocalData = {};

    tableColumns.forEach(column => {
        if (column.isEditable) {
            const input = document.getElementById(`${issueKey}-${column.id}`);
            if (input) {
                payload[column.id] = input.value;
                updatedLocalData[column.name] = input.value;
            }
        }
    });

    saveStoredTicketData(issueKey, updatedLocalData);

    try {
        const response = await fetch(`${API_URL}/api/tickets/${issueKey}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fields: payload })
        });

        if (!response.ok) {
            throw new Error(`Failed to save changes: ${response.statusText}`);
        }

        alert('Changes saved successfully!');
        // On successful save, revert the row to read-only mode.
        toggleEditMode(issueKey, false);

    } catch (error) {
        console.error('Error saving changes:', error);
        alert(`Error saving changes: ${error.message}`);
    }
}

/**
 * Main function to initialize the dashboard.
 * It sets up the columns, fetches the tickets, and renders the table.
 */
async function main() {
    // First, configure the columns based on Jira fields. This is critical.
    await fetchAndSetColumns();
    
    // Only after the columns are set up, fetch the tickets.
    const tickets = await fetchTickets();
    
    // Finally, render the table with the tickets.
    renderTable(tickets);
}

// Initial load
document.addEventListener('DOMContentLoaded', main);