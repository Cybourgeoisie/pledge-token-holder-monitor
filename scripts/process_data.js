const fs = require('fs');
const path = require('path');

function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
            // Handle commas within quoted fields
            const values = [];
            let currentValue = '';
            let inQuotes = false;
            
            for (let char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentValue.trim());
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue.trim());

            // Create object from headers and values
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });
            return record;
        });
}

async function processData() {
    try {
        // Read the CSV file
        const csvPath = path.join(__dirname, '..', 'data', 'pledgers.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const records = parseCSV(csvContent);

        // Create a map of all names for lookup
        const nameMap = new Map();
        const discordMap = new Map();
        const handleMap = new Map();
        records.forEach(record => {
            if (record.Name) {
                nameMap.set(record.Name.toLowerCase(), record);
            }
            if (record.Discord) {
                discordMap.set(record.Discord.toLowerCase(), record);
            }
            if (record.Handle) {
                handleMap.set(record.Handle.toLowerCase(), record);
            }
        });

        // Process records and check inviter relationships
        const processedData = records.map(record => {
            // Split invited by field on commas
            const inviters = record['Invited By'].split(',').map(inv => inv.trim());
            const inviterAddresses = [];
            
            for (const inviterName of inviters) {
                if (!inviterName) continue;
                
                // Try to find the inviter by their discord handle
                const inviterLower = inviterName.toLowerCase();
                let inviter = nameMap.get(inviterLower);
                
                if (!inviter) {
                    // Try to find the inviter by their discord handle
                    const inviterDiscord = discordMap.get(inviterLower);
                    if (inviterDiscord) {
                        inviter = inviterDiscord;
                    } else {
                        // Try to find the inviter by their handle
                        const inviterHandle = handleMap.get(inviterLower);
                        if (inviterHandle) {
                            inviter = inviterHandle;
                        } else {
                            console.warn(`Warning: Cannot find inviter "${inviterName}" for user "${record.Name}"`);
                        }
                    }
                }

                if (inviter) {
                    inviterAddresses.push(inviter['ETH Wallet']);
                }
            }

            return {
                name: record.Name,
                address: record['ETH Wallet'],
                handle: record.Handle,
                discord: record.Discord,
                invitedBy: record['Invited By'],
                inviterAddresses: inviterAddresses,
                tweetUrl: record['Link to Tweet']
            };
        });

        // Ensure the data directory exists
        const dataDir = path.join(__dirname, '..', 'src', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Write the processed data
        fs.writeFileSync(
            path.join(dataDir, 'pledges.json'),
            JSON.stringify(processedData, null, 2)
        );

        console.log('Data processing completed successfully');
        console.log(`Processed ${processedData.length} records`);
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

// Execute the processing function
processData();