import { checkForBrokenPledges } from './blockchain.js';

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('tableBody');
    const statusMessage = document.getElementById('statusMessage');
    const keepingPledgeFilter = document.getElementById('keepingPledgeFilter');
    const brokePledgeFilter = document.getElementById('brokePledgeFilter');
    const recommendedBreakerFilter = document.getElementById('recommendedBreakerFilter');
    const keepingPledgeCount = document.getElementById('keepingPledgeCount');
    const brokePledgeCount = document.getElementById('brokePledgeCount');
    const recommendedBreakerCount = document.getElementById('recommendedBreakerCount');
    
    let pledgeData = []; // Will store the loaded data
    let brokenPledges = new Map(); // Store broken pledge addresses and their tx hashes
    let brokenPledgeNames = new Map(); // Store broken pledge addresses to names

    // Function to load data
    async function loadData() {
        try {
            // Load pledge data
            const response = await fetch('data/pledges.json');
            pledgeData = await response.json();

            // Check for broken pledges
            const brokenPledgeEvents = await checkForBrokenPledges();
            brokenPledges = new Map(brokenPledgeEvents.map(event => [
                event.pledgerAddress.toLowerCase(),
                event.transactionHash
            ]));
            
            // Create mapping of broken pledge addresses to names
            pledgeData.forEach(pledge => {
                if (brokenPledges.has(pledge.address.toLowerCase())) {
                    brokenPledgeNames.set(pledge.address.toLowerCase(), pledge.name);
                }
            });

            // Update status message
            statusMessage.innerHTML = '<i class="fas fa-check-circle"></i> Data Retrieved!';
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);

            updateCounts();
            filterAndRenderTable();
        } catch (error) {
            console.error('Error loading data:', error);
            statusMessage.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error loading data';
            statusMessage.style.color = 'var(--broken-pledge-color)';
        }
    }

    // Function to update counts
    function updateCounts() {
        let keepingCount = 0;
        let brokenCount = 0;
        let recommendedCount = 0;

        pledgeData.forEach(pledge => {
            const addressLower = pledge.address.toLowerCase();
            const isBroken = brokenPledges.has(addressLower);
            const invitedByName = wasInvitedByBrokenPledge(pledge);
            
            if (isBroken) {
                brokenCount++;
            } else if (invitedByName) {
                recommendedCount++;
            } else {
                keepingCount++;
            }
        });

        keepingPledgeCount.textContent = `(${keepingCount})`;
        brokePledgeCount.textContent = `(${brokenCount})`;
        recommendedBreakerCount.textContent = `(${recommendedCount})`;
    }

    // Function to truncate address
    function truncateAddress(address) {
        if (!address) return '-';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // Function to create Twitter link
    function createTwitterLink(url) {
        if (!url) return '';
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-twitter"></i>
        </a>`;
    }

    // Function to check if an address was invited by a broken pledge
    function wasInvitedByBrokenPledge(pledge) {
        if (pledge.inviterAddresses && pledge.inviterAddresses.length > 0) {
            for (const inviterAddress of pledge.inviterAddresses) {
                if (!inviterAddress) continue;
                const inviterLower = inviterAddress.toLowerCase();
                if (brokenPledges.has(inviterLower)) {
                    return brokenPledgeNames.get(inviterLower) || 'Unknown';
                }
            }
        }
        return null;
    }

    // Function to apply filters and search
    function filterAndRenderTable() {
        const searchTerm = searchInput.value.toLowerCase();
        
        // First apply search filter
        let filteredData = pledgeData.filter(pledge => 
            pledge.name.toLowerCase().includes(searchTerm) ||
            pledge.handle.toLowerCase().includes(searchTerm) ||
            pledge.address.toLowerCase().includes(searchTerm) ||
            (pledge.discord && pledge.discord.toLowerCase().includes(searchTerm)) ||
            (pledge.invitedBy && pledge.invitedBy.toLowerCase().includes(searchTerm))
        );

        // Create map of broken pledgers and their invitees
        const invitedByBroken = new Map();
        filteredData.forEach(pledge => {
            const invitedByName = wasInvitedByBrokenPledge(pledge);
            if (invitedByName) {
                invitedByBroken.set(pledge.address.toLowerCase(), invitedByName);
            }
        });

        // Then apply status filters
        filteredData = filteredData.filter(pledge => {
            const addressLower = pledge.address.toLowerCase();
            const isBroken = brokenPledges.has(addressLower);
            const isRecommendedBreaker = invitedByBroken.has(addressLower);
            const isKeepingPledge = !isBroken && !isRecommendedBreaker;
            
            return (isKeepingPledge && keepingPledgeFilter.checked) ||
                   (isBroken && brokePledgeFilter.checked) ||
                   (isRecommendedBreaker && recommendedBreakerFilter.checked);
        });

        renderTable(filteredData, invitedByBroken);
    }

    // Function to render table
    function renderTable(data, invitedByBroken) {
        tableBody.innerHTML = '';
        
        data.forEach(pledge => {
            const row = document.createElement('tr');
            const addressLower = pledge.address.toLowerCase();
            const isBroken = brokenPledges.has(addressLower);
            const invitedByName = invitedByBroken.get(addressLower);
            const txHash = isBroken ? brokenPledges.get(addressLower) : null;
            
            if (isBroken) {
                row.classList.add('broken-pledge');
            } else if (invitedByName) {
                row.classList.add('recommended-breaker');
            }
            
            const inviterAddress = pledge.inviterAddresses && pledge.inviterAddresses.length > 0 ? 
                pledge.inviterAddresses[0] : null;
            
            row.innerHTML = `
                <td>
                    <div class="user-cell">
                        <span class="user-name">${pledge.name}</span>
                        <span class="user-handle">${pledge.handle}</span>
                        ${isBroken ? `<span class="status-label broken-pledge-label">
                            Broken Pledge 
                            <a href="https://etherscan.io/tx/${txHash}" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               style="color: white; text-decoration: underline;">
                                (View Transaction)
                            </a>
                        </span>` : ''}
                        ${invitedByName ? `<span class="status-label recommended-breaker-label">Recommended Broken Pledge: ${invitedByName}</span>` : ''}
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
                <td>${inviterAddress ? `<a href="https://etherscan.io/address/${inviterAddress}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       title="${inviterAddress}">
                        ${truncateAddress(inviterAddress)}
                    </a>` : '-'}</td>
                <td>${createTwitterLink(pledge.tweetUrl)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Filter checkbox functionality
    [keepingPledgeFilter, brokePledgeFilter, recommendedBreakerFilter].forEach(checkbox => {
        checkbox.addEventListener('change', filterAndRenderTable);
    });

    // Search functionality
    searchInput.addEventListener('input', filterAndRenderTable);

    // Initial load
    loadData();
});