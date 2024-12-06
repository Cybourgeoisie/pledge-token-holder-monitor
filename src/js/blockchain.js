import ABI from '../data/abi.js';

const CONTRACT_ADDRESS = '0x910812c44ed2a3b611e4b051d9d83a88d652e2dd';
const START_BLOCK = 21344733;
const FALLBACK_RPC = 'https://eth.llamarpc.com';

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

export {
    getProvider,
    getContract,
    query,
    checkForBrokenPledges
};