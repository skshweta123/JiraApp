document.addEventListener('DOMContentLoaded', async () => {
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    const tableHead = document.querySelector('#tickets-table thead');
    const ticketsBody = document.getElementById('tickets-tbody');

    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        loading.style.display = 'none';
    };

    try {
        const response = await fetch('http://localhost:5001/api/tickets', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const { tickets } = await response.json();

            // Define the complete, ordered structure for the table columns.
            const tableColumns = [
                { name: 'Item#', type: 'jira', source: 'Item#' },
                { name: 'Title', type: 'jira', source: 'Title' },
                { name: 'Status', type: 'jira', source: 'Status' },
                { name: 'UAT Handover Date', type: 'jira', source: 'Due Date' },
                { name: 'UAT Planned Start Date', type: 'date' },
                { name: 'UAT Planned Completion Date', type: 'date' },
                { name: 'UAT Status', type: 'select', options: ['Not Started', 'In Progress', 'Signed-Off', 'Delayed'] },
                { name: 'Release Planned Date', type: 'date' },
                { name: 'Release Status', type: 'select', options: ['Not Started', 'In Progress', 'Released', 'Delayed'] }
            ];

            // Clear existing content
            tableHead.innerHTML = '';
            ticketsBody.innerHTML = '';

            // Create table headers from the new structure
            const headerRow = document.createElement('tr');
            tableColumns.forEach(column => {
                const th = document.createElement('th');
                const isJiraColumn = column.type === 'jira';
                th.className = `px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${isJiraColumn ? 'bg-gray-100' : 'bg-blue-300'}`;
                th.textContent = column.name;
                headerRow.appendChild(th);
            });
            tableHead.appendChild(headerRow);

            // This function contains all the validation and dynamic status logic for a single row.
            const updateRowLogic = (row) => {
                const rowData = {};
                tableColumns.forEach((col, index) => {
                    const cell = row.cells[index];
                    if (col.type === 'jira') {
                        // For handover date, parse it, otherwise just get text content
                        if(col.name === 'UAT Handover Date' && cell.textContent) {
                            rowData[col.name] = new Date(cell.textContent);
                        }
                    } else {
                        rowData[col.name] = cell.querySelector('input, select');
                    }
                });

                const handoverDate = rowData['UAT Handover Date'];
                const startDateInput = rowData['UAT Planned Start Date'];
                const completionDateInput = rowData['UAT Planned Completion Date'];
                const releaseDateInput = rowData['Release Planned Date'];
                const uatStatusSelect = rowData['UAT Status'];
                const releaseStatusSelect = rowData['Release Status'];

                const startDateValue = startDateInput.value;
                const completionDateValue = completionDateInput.value;
                const releaseDateValue = releaseDateInput.value;

                const startDate = startDateValue ? new Date(`${startDateValue}T00:00:00`) : null;
                const completionDate = completionDateValue ? new Date(`${completionDateValue}T00:00:00`) : null;
                const releaseDate = releaseDateValue ? new Date(`${releaseDateValue}T00:00:00`) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // --- Reset validation styles ---
                [startDateInput, completionDateInput, releaseDateInput].forEach(input => input.classList.remove('border-red-500', 'border-2'));

                let errors = [];
                // --- Validation Rules ---
                if (handoverDate && startDate && startDate < handoverDate) errors.push('UAT Start Date must be on or after Handover Date.');
                if (startDate && completionDate && completionDate < startDate) errors.push('UAT Completion Date must be on or after Start Date.');
                if (completionDate && releaseDate && releaseDate < completionDate) errors.push('Release Date must be on or after UAT Completion Date.');
                
                if (errors.length > 0) {
                    showError(errors.join(' '));
                    if (startDate < handoverDate) startDateInput.classList.add('border-red-500', 'border-2');
                    if (completionDate < startDate) completionDateInput.classList.add('border-red-500', 'border-2');
                    if (releaseDate < completionDate) releaseDateInput.classList.add('border-red-500', 'border-2');
                } else {
                    const hasOtherErrors = document.querySelector('.border-red-500');
                    if (!hasOtherErrors) errorMessage.classList.add('hidden');
                }

                // --- Dynamic Status & Color Logic ---
                // UAT Status
                const uatStatusCell = uatStatusSelect.parentElement;
                if (startDate && startDate < today && uatStatusSelect.value === 'Not Started') {
                    uatStatusSelect.value = 'Delayed';
                } else if (startDate && startDate > today) {
                     uatStatusSelect.value = 'Not Started';
                }
                
                if(uatStatusSelect.value === 'Delayed') {
                    uatStatusCell.classList.add('bg-red-300');
                    uatStatusCell.classList.remove('bg-blue-300');
                } else {
                    uatStatusCell.classList.add('bg-blue-300');
                    uatStatusCell.classList.remove('bg-red-300');
                }
                
                // Release Status
                const releaseStatusCell = releaseStatusSelect.parentElement;
                 if (releaseDate && releaseDate < today && releaseStatusSelect.value === 'Not Started') {
                    releaseStatusSelect.value = 'Delayed';
                } else if (releaseDate && releaseDate > today) {
                    releaseStatusSelect.value = 'Not Started';
                }

                if(releaseStatusSelect.value === 'Delayed') {
                    releaseStatusCell.classList.add('bg-red-300');
                    releaseStatusCell.classList.remove('bg-blue-300');
                } else {
                    releaseStatusCell.classList.add('bg-blue-300');
                    releaseStatusCell.classList.remove('bg-red-300');
                }
            };

            // Populate table rows
            if (tickets.length > 0) {
                tickets.forEach(ticket => {
                    const row = document.createElement('tr');
                    row.className = 'border-b border-gray-200 hover:bg-gray-100';

                    tableColumns.forEach(column => {
                        const cell = document.createElement('td');
                        const isJiraColumn = column.type === 'jira';
                        cell.className = `px-4 py-2 whitespace-nowrap ${isJiraColumn ? 'bg-gray-50' : 'bg-blue-300'}`;

                        if (column.type === 'jira') {
                            cell.textContent = ticket[column.source] || '';
                        } else if (column.type === 'date') {
                            const input = document.createElement('input');
                            input.type = 'date';
                            input.className = 'w-full px-2 py-1 border rounded';
                            if (column.source) {
                                // Format the date for the input field
                                const dateValue = ticket[column.source];
                                if (dateValue) {
                                    input.value = dateValue;
                                }
                            }
                            input.setAttribute('data-ticket-id', ticket['Item#']);
                            input.setAttribute('data-field-name', column.name);

                            // Load from localStorage
                            const savedValue = localStorage.getItem(`JiraDashboard-${ticket['Item#']}-${column.name}`);
                            if (savedValue) {
                                input.value = savedValue;
                            }

                            cell.appendChild(input);
                        } else if (column.type === 'select') {
                            const select = document.createElement('select');
                            select.className = 'w-full px-2 py-1 border rounded';
                            column.options.forEach(optionText => {
                                const option = document.createElement('option');
                                option.value = optionText;
                                option.textContent = optionText;
                                select.appendChild(option);
                            });
                            select.setAttribute('data-ticket-id', ticket['Item#']);
                            select.setAttribute('data-field-name', column.name);
                            
                            // Load from localStorage
                            const savedValue = localStorage.getItem(`JiraDashboard-${ticket['Item#']}-${column.name}`);
                            if (savedValue) {
                                select.value = savedValue;
                            }

                            cell.appendChild(select);
                        }
                        row.appendChild(cell);
                    });

                    ticketsBody.appendChild(row);
                    updateRowLogic(row); // Run logic for the new row
                });

                // Add a single event listener to the table body
                ticketsBody.addEventListener('change', (e) => {
                    if (e.target.matches('input, select')) {
                        // Save to localStorage
                        const ticketId = e.target.getAttribute('data-ticket-id');
                        const fieldName = e.target.getAttribute('data-field-name');
                        if (ticketId && fieldName) {
                            localStorage.setItem(`JiraDashboard-${ticketId}-${fieldName}`, e.target.value);
                        }
                        updateRowLogic(e.target.closest('tr'));
                    }
                });

            } else {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = tableColumns.length;
                cell.className = 'text-center text-gray-500 py-4';
                cell.textContent = 'No tickets found for this project.';
                row.appendChild(cell);
                ticketsBody.appendChild(row);
            }

            loading.style.display = 'none';
        } else {
            const error = await response.json();
            showError(`Error: ${error.message}`);
        }
    } catch (error) {
        console.error('An error occurred while fetching tickets:', error);
        showError('An error occurred while fetching tickets. Please check the console for details.');
    }
}); 