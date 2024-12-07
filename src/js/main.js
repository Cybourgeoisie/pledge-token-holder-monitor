const CONTRACT_ADDRESS = '0x910812c44ed2a3b611e4b051d9d83a88d652e2dd';
const START_BLOCK = 21344733;
const FALLBACK_RPC = 'https://eth.llamarpc.com';
const ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "pledgerAddress",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "transferredAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "allowedTransferAmount",
                "type": "uint256"
            }
        ],
        "name": "BrokenPledge",
        "type": "event"
    }
];

// Initialize provider
function getProvider() {
    // Check if window.ethereum is available (MetaMask or other web3 wallet)
    if (typeof window !== 'undefined' && window.ethereum) {
        return new window.ethers.providers.Web3Provider(window.ethereum);
    }
    // Fallback to LlamaRPC
    return new window.ethers.providers.JsonRpcProvider(FALLBACK_RPC);
}

// Get contract instance
function getContract() {
    const provider = getProvider();
    return new window.ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
}

// Generic query function for event filtering
async function query(contract, filter, fromBlock, toBlock) {
    console.log('querying...', fromBlock, '...', toBlock);
    try {
        return await contract.queryFilter(filter, fromBlock, toBlock);
    } catch (e) {
        const step = ~~((toBlock - fromBlock) / 2);
        const middle = fromBlock + step;
        return [
            ...(await query(contract, filter, fromBlock, middle)),
            ...(await query(contract, filter, middle + 1, toBlock))
        ];
    }
}

// Check for broken pledges
async function checkForBrokenPledges() {
    const contract = getContract();
    const filter = contract.filters.BrokenPledge();
    const provider = getProvider();
    const latestBlock = await provider.getBlockNumber();
    
    try {
        const events = await query(contract, filter, START_BLOCK, latestBlock);
        return events.map(event => ({
            pledgerAddress: event.args.pledgerAddress,
            transferredAmount: window.ethers.utils.formatEther(event.args.transferredAmount),
            allowedTransferAmount: window.ethers.utils.formatEther(event.args.allowedTransferAmount),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
        }));
    } catch (error) {
        console.error('Error checking for broken pledges:', error);
        throw error;
    }
}

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

    // Function to check if an address invited someone who broke their pledge
    function hasInvitedPledgeBreaker(pledge) {
        const pledgerAddressLower = pledge.address.toLowerCase();
        // Look through all pledges to find if this person invited any pledge breakers
        for (const otherPledge of pledgeData) {
            if (otherPledge.inviterAddresses && otherPledge.inviterAddresses.length > 0) {
                const inviterAddressLower = otherPledge.inviterAddresses[0].toLowerCase();
                // If this person was the inviter and the invitee broke their pledge
                if (inviterAddressLower === pledgerAddressLower && brokenPledges.has(otherPledge.address.toLowerCase())) {
                    return otherPledge.name || 'Unknown';
                }
            }
        }
        return null;
    }

    // Function to load data
    async function loadData() {
        try {
            // Load pledge data
            pledgeData = await getPledgeData();

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
            const invitedBreakerName = hasInvitedPledgeBreaker(pledge);
            
            if (isBroken) {
                brokenCount++;
            }
            if (invitedBreakerName) {
                recommendedCount++;
            }
            if (!isBroken) {
                keepingCount++;
            }
        });

        keepingPledgeCount.textContent = `(${keepingCount})`;
        brokePledgeCount.textContent = `(${brokenCount})`;
        recommendedBreakerCount.textContent = `(${recommendedCount})`;
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

        // Create map of pledgers who invited pledge breakers
        const invitedBreakerMap = new Map();
        filteredData.forEach(pledge => {
            const invitedBreakerName = hasInvitedPledgeBreaker(pledge);
            if (invitedBreakerName) {
                invitedBreakerMap.set(pledge.address.toLowerCase(), invitedBreakerName);
            }
        });

        // Then apply status filters
        filteredData = filteredData.filter(pledge => {
            const addressLower = pledge.address.toLowerCase();
            const isBroken = brokenPledges.has(addressLower);
            const hasInvitedBreaker = invitedBreakerMap.has(addressLower);
            const isKeepingPledge = !isBroken;
            
            return (!isBroken && keepingPledgeFilter.checked) ||
                   (isBroken && brokePledgeFilter.checked) ||
                   (hasInvitedBreaker && recommendedBreakerFilter.checked);
        });

        renderTable(filteredData, invitedBreakerMap);
    }

    // Function to render table
    function renderTable(data, invitedBreakerMap) {
        tableBody.innerHTML = '';
        
        data.forEach(pledge => {
            const row = document.createElement('tr');
            const addressLower = pledge.address.toLowerCase();
            const isBroken = brokenPledges.has(addressLower);
            const invitedBreakerName = invitedBreakerMap.get(addressLower);
            const txHash = isBroken ? brokenPledges.get(addressLower) : null;
            
            if (isBroken) {
                row.classList.add('broken-pledge');
            } else if (invitedBreakerName) {
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
                        ${invitedBreakerName ? `<span class="status-label recommended-breaker-label">Invited ${invitedBreakerName} (Pledge Breaker)</span>` : ''}
                        ${!isBroken ? `<span class="status-label keeping-pledge-label">Keeping Pledge</span>` : ''}
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

async function getPledgeData() {
  const pledgeData = await fetch('../data/pledges.json')
    .then(response => response.json())
    .catch(error => console.error('Error fetching pledge data:', error));
  return pledgeData;
}