const { Queue } = require("bullmq");
const redisConfig = require("../config/redis");

// Create email queue
const emailQueue = new Queue("email-notifications", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: "exponential",
      delay: 60000, // Start with 1 minute delay
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
});

// Event listeners for monitoring
emailQueue.on("error", (error) => {
  console.error("Email queue error:", error);
});

module.exports = emailQueue;

