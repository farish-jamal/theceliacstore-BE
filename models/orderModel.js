const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["product", "bundle"],
    required: true,
  },
  product: {
    type: new mongoose.Schema({
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: function() { return this.type === "product"; }
      },
      name: String,
      price: mongoose.Schema.Types.Decimal128,
      discounted_price: mongoose.Schema.Types.Decimal128,
      banner_image: String,
      sub_category: mongoose.Schema.Types.ObjectId,
    }),
    required: function() { return this.type === "product"; }
  },
  bundle: {
    type: new mongoose.Schema({
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: function() { return this.type === "bundle"; }
      },
      name: String,
      price: mongoose.Schema.Types.Decimal128,
      discounted_price: mongoose.Schema.Types.Decimal128,
      images: [String],
      description: String,
      products: [
        {
          product: mongoose.Schema.Types.ObjectId,
          variant_sku: String,
          quantity: Number,
        }
      ],
    }),
    required: function() { return this.type === "bundle"; }
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  total_amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  discounted_total_amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  }
});

const OrderAddressSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  pincode: String,
  locality: String,
  address: String,
  city: String,
  state: String,
  landmark: String,
  alternatePhone: String,
  addressType: String
});

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [OrderItemSchema],
  address: OrderAddressSchema,
  totalAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  discountedTotalAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  shippingCost: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0
  },
  shippingDetails: {
    deliveryZoneId: mongoose.Schema.Types.ObjectId,
    zoneName: String,
    pricingType: String,
    isManual: {
      type: Boolean,
      default: false
    },
    calculatedAt: Date
  },
  finalTotalAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
    default: "pending"
  }
}, { timestamps: true });

OrderSchema.set("toJSON", {
  transform: (doc, ret) => {
    // Convert totalAmount and discountedTotalAmount to number with null checks
    if (ret.totalAmount) {
      ret.totalAmount = parseFloat(ret.totalAmount.toString());
    }
    if (ret.discountedTotalAmount) {
      ret.discountedTotalAmount = parseFloat(ret.discountedTotalAmount.toString());
    }
    if (ret.shippingCost) {
      ret.shippingCost = parseFloat(ret.shippingCost.toString());
    }
    if (ret.finalTotalAmount) {
      ret.finalTotalAmount = parseFloat(ret.finalTotalAmount.toString());
    }

    // Ensure ret.items is an array before mapping
    if (Array.isArray(ret.items)) {
      ret.items = ret.items.map(item => {
        if (item.type === "product" && item.product) {
          return {
            ...item,
            product: {
              ...item.product,
              price: item.product.price ? parseFloat(item.product.price.toString()) : null,
              discounted_price: item.product.discounted_price
                ? parseFloat(item.product.discounted_price.toString())
                : null
            },
            total_amount: item.total_amount ? parseFloat(item.total_amount.toString()) : null,
            discounted_total_amount: item.discounted_total_amount ? parseFloat(item.discounted_total_amount.toString()) : null
          };
        } else if (item.type === "bundle" && item.bundle) {
          return {
            ...item,
            bundle: {
              ...item.bundle,
              price: item.bundle.price ? parseFloat(item.bundle.price.toString()) : null,
              discounted_price: item.bundle.discounted_price
                ? parseFloat(item.bundle.discounted_price.toString())
                : null
            },
            total_amount: item.total_amount ? parseFloat(item.total_amount.toString()) : null,
            discounted_total_amount: item.discounted_total_amount ? parseFloat(item.discounted_total_amount.toString()) : null
          };
        }
        return item;
      });
    }

    return ret;
  }
});

module.exports = mongoose.model("Order", OrderSchema);
