const Cart = require("../../models/cartModel.js");
const CartRepository = require("../../repositories/cart/index.js");
const ProductRepository = require("../../repositories/product/index.js");
const ApiResponse = require("../../utils/ApiResponse.js");

const getCart = async ({ user_id }) => {
  return await CartRepository.getCartByUserId({ user_id });
};

const updateCart = async ({ user_id, type, product_id, bundle_id, quantity, variant_sku, role }) => {
  let cart = await CartRepository.getCartByUserId({ user_id });

  if (quantity < 0) {
    throw new ApiResponse(400, null, "Invalid quantity", false);
  }

  let itemData, itemPrice, item;

  if (type === "product") {
    itemData = await ProductRepository.getProductById(product_id);
    if (!itemData) {
      throw new ApiResponse(404, null, "Product not found", false);
    }
    itemPrice = itemData.discounted_price !== null ? itemData.discounted_price : itemData.price;
    item = {
      type: "product",
      product: product_id,
      quantity,
      price: itemPrice,
      total: itemPrice * quantity,
    };
    if (variant_sku) item.variant_sku = variant_sku;
  } else if (type === "bundle") {
    // You may want to add bundle validation here
    item = {
      type: "bundle",
      bundle: bundle_id,
      quantity,
      // price and total should be set after fetching bundle price
    };
    // TODO: Fetch bundle price and set item.price and item.total
    // For now, set to 0 as placeholder
    item.price = 0;
    item.total = 0;
  } else {
    throw new ApiResponse(400, null, "Invalid type. Must be 'product' or 'bundle'", false);
  }

  if (!cart) {
    // Validate that every item has a type field if items array is present
    let itemsToAdd = [item];
    if (Array.isArray(itemsToAdd)) {
      itemsToAdd.forEach((itm, idx) => {
        if (!itm.type) {
          throw new ApiResponse(400, null, `Cart item at index ${idx} is missing required 'type' field`, false);
        }
      });
    }
    if (quantity > 0) {
      cart = await CartRepository.addToCart({
        user: user_id,
        items: itemsToAdd,
        total_price: item.total,
        is_active: true,
      });
    }
    cart = await Cart.findOne({ user: user_id }).populate(["items.product", "items.bundle"]);
    return new ApiResponse(201, cart, "Cart created successfully", true);
  }

  let existingItemIndex = -1;
  if (type === "product") {
    existingItemIndex = cart.items.findIndex(
      (i) => i.type === "product" && i.product && i.product.toString() === product_id && (!variant_sku || i.variant_sku === variant_sku)
    );
  } else if (type === "bundle") {
    existingItemIndex = cart.items.findIndex(
      (i) => i.type === "bundle" && i.bundle && i.bundle.toString() === bundle_id
    );
  }

  if (existingItemIndex !== -1) {
    if (quantity > 0) {
      cart.items[existingItemIndex].quantity = quantity;
      cart.items[existingItemIndex].total = cart.items[existingItemIndex].price * quantity;
    } else {
      cart.items.splice(existingItemIndex, 1);
    }
  } else if (quantity > 0) {
    cart.items.push(item);
  }

  cart.total_price = cart.items.reduce((sum, i) => sum + (i.total || 0), 0);
  cart.is_active = cart.items.length > 0;

  await cart.save();

  cart = await Cart.findOne({ user: user_id }).populate(["items.product", "items.bundle"]);

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
