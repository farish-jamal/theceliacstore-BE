const mongoose = require("mongoose");

const BundleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 255 },
    description: { type: String, maxlength: 2056 },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
    ],
    price: { type: mongoose.Schema.Types.Decimal128, required: true },
    discounted_price: {
      type: mongoose.Schema.Types.Decimal128,
      default: null,
      validate: {
        validator: function (value) {
          return value === null || value >= 0;
        },
        message: "Discounted price must be a non-negative number or null",
      },
    },
    images: { type: [String], default: [] },
    is_active: { type: Boolean, default: true },
    meta_data: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    created_by_admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

BundleSchema.set("toJSON", {
  transform: (_, ret) => {
    if (ret.price) ret.price = parseFloat(ret.price.toString());
    if (ret.discounted_price)
      ret.discounted_price = parseFloat(ret.discounted_price.toString());
    return ret;
  },
});

module.exports = mongoose.model("Bundle", BundleSchema);
