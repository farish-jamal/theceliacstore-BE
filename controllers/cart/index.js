const { asyncHandler } = require("../../common/asyncHandler.js");
const ApiResponse = require("../../utils/ApiResponse.js");
const CartService = require("../../services/cart/index.js");
const mongoose = require("mongoose");

const getCart = asyncHandler(async (req, res) => {
  const user_id = req.user?._id;

  const cart = await CartService.getCart({ user_id });
  const data = {
    data: cart || [],
    total: !user_id ? (cart ? cart.length : 0) : cart ? 1 : 0,
  };

  res.json(new ApiResponse(200, data, "Cart fetched successfully", true));
});

const addToCart = asyncHandler(async (req, res) => {
  const { type, product_id, bundle_id, quantity, variant_sku } = req.body;
  const { _id } = req.user;

  // Validate required fields
  if (!type || quantity === null || quantity === undefined) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Invalid request: type and quantity are required",
          false
        )
      );
  }

  if (type === "product" && !product_id) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Product ID is required for product type",
          false
        )
      );
  }

  if (type === "bundle" && !bundle_id) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Bundle ID is required for bundle type",
          false
        )
      );
  }

  const cartItem = await CartService.updateCart({
    user_id: _id,
    type,
    product_id,
    bundle_id,
    quantity,
    variant_sku,
  });

  if (!cartItem) {
    res.json(new ApiResponse(200, null, "Cart is empty", true));
  } else {
    res.json(
      new ApiResponse(201, cartItem, "Item added to cart successfully", true)
    );
  }
});

const deleteCartItem = asyncHandler(async (req, res) => {
  const { id: user_id } = req.params;

  await CartService.deleteCart(user_id);
  res.json(new ApiResponse(200, null, "Cart deleted successfully", true));
});

module.exports = {
  getCart,
  addToCart,
  deleteCartItem,
};
