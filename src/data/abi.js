// ABI for the Pledge contract
export default [
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