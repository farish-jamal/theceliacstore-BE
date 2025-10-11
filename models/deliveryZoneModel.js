const mongoose = require("mongoose");

const DeliveryZoneSchema = new mongoose.Schema(
  {
    zone_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    pincodes: {
      type: [String],
      required: true,
      validate: {
        validator: function(pincodes) {
          return pincodes && pincodes.length > 0;
        },
        message: "At least one pincode is required",
      },
    },
    pricing_type: {
      type: String,
      enum: ["free", "flat_rate", "fixed_rate"],
      required: true,
    },
    // For flat_rate: pricing based on weight unit and multiplier
    weight_unit_grams: {
      type: Number,
      validate: {
        validator: function(weight) {
          if (this.pricing_type === "flat_rate") {
            return weight != null && weight > 0;
          }
          return true;
        },
        message: "Weight unit in grams is required for flat_rate pricing type",
      },
    },
    price: {
      type: Number,
      validate: {
        validator: function(price) {
          if (this.pricing_type === "flat_rate") {
            return price != null && price >= 0;
          }
          return true;
        },
        message: "Price is required for flat_rate pricing type",
      },
    },
    // For fixed_rate: single fixed amount
    fixed_amount: {
      type: Number,
      validate: {
        validator: function(amount) {
          if (this.pricing_type === "fixed_rate") {
            return amount != null && amount >= 0;
          }
          return true;
        },
        message: "Fixed amount is required for fixed_rate pricing type",
      },
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Index for faster pincode lookups
DeliveryZoneSchema.index({ pincodes: 1 });
DeliveryZoneSchema.index({ is_default: 1 });
DeliveryZoneSchema.index({ is_active: 1 });

const DeliveryZone = mongoose.model("DeliveryZone", DeliveryZoneSchema);
module.exports = DeliveryZone;

