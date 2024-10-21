const redis = require('redis');

// Create a Redis client
const client = redis.createClient({
    password: process.env.REDIS_KEY,  // Ensure the password is correct
    socket: {
        host: 'redis-17974.c274.us-east-1-3.ec2.redns.redis-cloud.com',
        port: 17974
    }
});

// Handle connection and error events
client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('error', (err) => {
    console.error('Redis error: ', err);
});

(async () => {
    try {
        console.log('Attempting to connect to Redis...');
        await client.connect();  // Ensure connection
        console.log('Successfully connected to Redis');
    } catch (err) {
        console.error('Connection Error:', err);
    }
})();

// CRUD Functions
async function createKey(key, value) {
    try {
        await client.set(JSON.stringify(key), JSON.stringify(value));
        console.log(`Created key: ${key} with value: ${value}`);
    } catch (err) {
        console.error('Error creating key:', err);
    }
}

async function readKey(key) {
    try {
        const value = await client.get(key);
        if (value) {
            console.log(`Value for key ${key}: ${value}`);
            return value;
        } else {
            console.log(`Key ${key} not found`);
            return null;
        }
    } catch (err) {
        console.error('Error reading key:', err);
    }
}

async function updateKey(key, newValue) {
    try {
        await client.set(key, newValue);
        console.log(`Updated key: ${key} with new value: ${newValue}`);
    } catch (err) {
        console.error('Error updating key:', err);
    }
}

async function deleteKey(key) {
    try {
        await client.del(key);
        console.log(`Deleted key: ${key}`);
    } catch (err) {
        console.error('Error deleting key:', err);
    }
}

// Export functions
module.exports = {
    createKey,
    readKey,
    updateKey,
    deleteKey
};
