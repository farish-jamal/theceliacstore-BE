const Cart = require("../../models/cartModel.js");
const CartRepository = require("../../repositories/cart/index.js");
const ProductRepository = require("../../repositories/product/index.js");
const ApiResponse = require("../../utils/ApiResponse.js");

const getCart = async ({ user_id }) => {
  return await CartRepository.getCartByUserId({ user_id });
};

const updateCart = async (user_id, product_id, quantity, role) => {
  let cart = await CartRepository.getCartByUserId({ user_id });

  if (quantity < 0) {
    throw new ApiResponse(400, null, "Invalid quantity", false);
  }

  const productData = await ProductRepository.getProductById(product_id);
  if (!productData) {
    throw new ApiResponse(404, null, "Product not found", false);
  }

  let productPrice;
  // const productPrice = parseFloat(
  //   productData.discounted_price || productData.price
  // );

  if (role === "salesperson") {
    productPrice =
      productData.salesperson_discounted_price !== null
        ? productData.salesperson_discounted_price
        : productData.price;
  } else if (role === "dnd") {
    productPrice =
      productData.dnd_discounted_price !== null
        ? productData.dnd_discounted_price
        : productData.price;
  } else {
    productPrice =
      productData.discounted_price !== null
        ? productData.discounted_price
        : productData.price;
  }

  if (!cart) {
    if (quantity > 0) {
      cart = await CartRepository.addToCart({
        user: user_id,
        items: [
          {
            product: product_id,
            quantity,
            price: productPrice,
            total: productPrice * quantity,
          },
        ],
        total_price: productPrice * quantity,
        is_active: true,
      });
    }
    cart = await Cart.findOne({ user: user_id }).populate("items.product");
    return new ApiResponse(201, cart, "Cart created successfully", true);
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product._id.toString() === product_id
  );

  if (existingItemIndex !== -1) {
    if (quantity > 0) {
      cart.items[existingItemIndex].quantity = quantity;
      cart.items[existingItemIndex].total = productPrice * quantity;
    } else {
      cart.items.splice(existingItemIndex, 1);
    }
  } else if (quantity > 0) {
    cart.items.push({
      product: product_id,
      quantity,
      price: productPrice,
      total: productPrice * quantity,
    });
  }

  cart.total_price = cart.items.reduce((sum, item) => sum + item.total, 0);
  cart.is_active = cart.items.length > 0;

  await cart.save();

  cart = await Cart.findOne({ user: user_id }).populate("items.product");

  return new ApiResponse(200, cart, "Cart updated successfully", true);
};

const deleteCart = async (user_id) => {
  const deletedCart = await CartRepository.deleteCartByUserId(user_id);
  if (!deletedCart) {
    throw new ApiResponse(404, null, "Cart not found", false);
  }
  return deletedCart;
};

module.exports = {
  getCart,
  updateCart,
  deleteCart,
};
