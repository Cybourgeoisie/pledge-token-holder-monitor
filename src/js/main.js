document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('tableBody');
    let pledgeData = []; // Will store the loaded data

    // Function to load data
    async function loadData() {
        try {
            const response = await fetch('data/pledges.json');
            pledgeData = await response.json();
            renderTable(pledgeData);
        } catch (error) {
            console.error('Error loading pledge data:', error);
        }
    }

    // Function to truncate address
    function truncateAddress(address) {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // Function to create Twitter link
    function createTwitterLink(url) {
        if (!url) return '';
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-twitter"></i>
        </a>`;
    }

    // Function to render table
    function renderTable(data) {
        tableBody.innerHTML = '';
        
        data.forEach(pledge => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="user-cell">
                        <span class="user-name">${pledge.name}</span>
                        <span class="user-handle">${pledge.handle}</span>
                    </div>
                </td>
                <td>
                    <a href="https://etherscan.io/address/${pledge.address}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       title="${pledge.address}">
                        ${truncateAddress(pledge.address)}
                    </a>
                </td>
                <td>${pledge.discord || '-'}</td>
                <td>${pledge.invitedBy || '-'}</td>
                <td>${createTwitterLink(pledge.tweetUrl)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Search functionality
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = pledgeData.filter(pledge => 
            pledge.name.toLowerCase().includes(searchTerm) ||
            pledge.handle.toLowerCase().includes(searchTerm) ||
            pledge.address.toLowerCase().includes(searchTerm) ||
            pledge.discord.toLowerCase().includes(searchTerm) ||
            (pledge.invitedBy && pledge.invitedBy.toLowerCase().includes(searchTerm))
        );
        renderTable(filteredData);
    });

    // Initial load
    loadData();
});