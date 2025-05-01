const { asyncHandler } = require("../../common/asyncHandler.js");
const ApiResponse = require("../../utils/ApiResponse.js");
const CartService = require("../../services/cart/index.js");
const mongoose = require("mongoose");

const getCart = asyncHandler(async (req, res) => {
  const { user_id } = req.query;
  const { role } = req.user;

  const cart = await CartService.getCart({ user_id , role});
  const data = {
    cart: cart,
    total: !user_id ? cart.length : cart ? 1 : 0,
  };

  res.json(new ApiResponse(200, data, "Cart fetched successfully", true));
});

const addToCart = asyncHandler(async (req, res) => {
  const { user_id, product_id, quantity } = req.body;
  const { role } = req.user;

  const cartItem = await CartService.updateCart(user_id, product_id, quantity, role);
  res.json(
    new ApiResponse(201, cartItem, "Item added to cart successfully", true)
  );
});

const deleteCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await CartService.deleteCart(id);
  res.json(new ApiResponse(200, null, "Cart deleted successfully", true));
});

module.exports = {
  getCart,
  addToCart,
  deleteCartItem,
};
