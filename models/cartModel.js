const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        total: {
          type: Number,
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    total_price: {
      type: Number,
      required: true,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ✅ Auto-calculate total for each item before saving
CartSchema.pre("save", function (next) {
  this.items.forEach((item) => {
    item.total = item.quantity * item.price;
  });

  // ✅ Calculate total_price for the cart
  this.total_price = this.items.reduce((sum, item) => sum + item.total, 0);

  next();
});

const Cart = mongoose.model("Cart", CartSchema);
module.exports = Cart;
