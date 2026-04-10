require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("./models/orderModel.js");
const Counter = require("./models/counterModel.js");

async function backfill() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to database");

  const orders = await Order.find({ orderNumber: { $exists: false } })
    .sort({ createdAt: 1 });

  console.log(`Found ${orders.length} orders to backfill`);

  for (const order of orders) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "orderNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    order.orderNumber = counter.seq;
    await order.save();
    console.log(`Order ${order._id} → #${order.orderNumber}`);
  }

  console.log("Backfill complete.");
  await mongoose.disconnect();
}

backfill().catch(console.error);