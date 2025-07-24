const { asyncHandler } = require("../../common/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");
const mongoose = require("mongoose");
const Cart = require("../../models/cartModel");
const Address = require("../../models/addressModel");
const Product = require("../../models/productsModel");
const Order = require("../../models/orderModel");
const Category = require("../../models/categoryModel");
const Bundle = require("../../models/bundleModel");

const getAllOrders = asyncHandler(async (req, res) => {
  const adminId = req.admin._id;
  if (!adminId) {
    return res.status(401).json(new ApiResponse(401, null, "Unauthorized", false));
  }

  const {
    service_id,
    page = 1,
    per_page = 50,
    search = "",
    start_date,
    end_date,
  } = req.query;

  try {
    let query = {};

    if (service_id) {
      if (!mongoose.Types.ObjectId.isValid(service_id)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid service_id format", false));
      }
      const serviceObjectId = new mongoose.Types.ObjectId(service_id);
      const categoryIds = await Category.find({ service: serviceObjectId }).distinct("_id");
      if (categoryIds.length === 0) {
        return res.status(404).json(new ApiResponse(404, null, "No categories found for this service", false));
      }
      const productIds = await Product.find({
        sub_category: { $in: categoryIds },
      }).distinct("_id");
      if (productIds.length === 0) {
        return res.status(404).json(new ApiResponse(404, null, "No products found in these categories", false));
      }
      query["items.product._id"] = { $in: productIds };
    }

    if (search.trim()) {
      const productIdsByName = await Product.find({
        name: { $regex: search, $options: "i" },
      }).distinct("_id");
      query["$or"] = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "items.product._id": { $in: productIdsByName } },
      ];
    }

    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) query.createdAt.$gte = new Date(start_date);
      if (end_date) query.createdAt.$lte = new Date(end_date);
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * per_page)
        .limit(parseInt(per_page, 10)),
      Order.countDocuments(query),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        { data: orders, total },
        "Orders fetched successfully",
        true
      )
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json(new ApiResponse(500, null, "Server error", false));
  }
});

const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { cartId, addressId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(cartId) || !mongoose.Types.ObjectId.isValid(addressId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid cart or address ID", false));
  }

  const cart = await Cart.findOne({ _id: cartId, user: userId });
  if (!cart || cart.items.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, "Cart not found or empty", false));
  }
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    return res.status(400).json(new ApiResponse(400, null, "Address not found", false));
  }

  let totalAmount = 0;
  let discountedTotalAmount = 0;
  const orderItems = [];
  for (const cartItem of cart.items) {
    if (cartItem.type === "product") {
      const product = await Product.findById(cartItem.product);
      if (!product) continue;
      const price = parseFloat(product.price.toString());
      const discountedPrice = product.discounted_price ? parseFloat(product.discounted_price.toString()) : price;
      const itemTotal = price * cartItem.quantity;
      const discountedItemTotal = discountedPrice * cartItem.quantity;
      totalAmount += itemTotal;
      discountedTotalAmount += discountedItemTotal;
      orderItems.push({
        type: "product",
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          discounted_price: product.discounted_price,
          banner_image: product.banner_image,
          sub_category: product.sub_category,
        },
        quantity: cartItem.quantity,
        total_amount: itemTotal,
        discounted_total_amount: discountedItemTotal,
      });
    } else if (cartItem.type === "bundle") {
      const bundle = await Bundle.findById(cartItem.bundle);
      if (!bundle) continue;
      const price = parseFloat(bundle.price.toString());
      const discountedPrice = bundle.discounted_price ? parseFloat(bundle.discounted_price.toString()) : price;
      const itemTotal = price * cartItem.quantity;
      const discountedItemTotal = discountedPrice * cartItem.quantity;
      totalAmount += itemTotal;
      discountedTotalAmount += discountedItemTotal;
      orderItems.push({
        type: "bundle",
        bundle: {
          _id: bundle._id,
          name: bundle.name,
          price: bundle.price,
          discounted_price: bundle.discounted_price,
          images: bundle.images,
          description: bundle.description,
          products: bundle.products,
        },
        quantity: cartItem.quantity,
        total_amount: itemTotal,
        discounted_total_amount: discountedItemTotal,
      });
    }
  }

  const addressSnapshot = { ...address.toObject() };
  delete addressSnapshot._id;
  delete addressSnapshot.user;
  delete addressSnapshot.createdAt;
  delete addressSnapshot.updatedAt;
  delete addressSnapshot.__v;

  const order = new Order({
    user: userId,
    items: orderItems,
    address: addressSnapshot,
    totalAmount,
    discountedTotalAmount,
    status: "pending",
  });
  await order.save();

  cart.items = [];
  await cart.save();

  return res.status(201).json(
    new ApiResponse(201, order, "Order created successfully", true)
  );
});

const getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, orders, "Orders fetched successfully", true));
});

const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid order ID", false));
  }
  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json(new ApiResponse(404, null, "Order not found", false));
  }
  const { status } = req.body;
  if (!status) {
    return res.status(400).json(new ApiResponse(400, null, "Status is required", false));
  }
  order.status = status;
  await order.save();
  return res.status(200).json(new ApiResponse(200, order, "Order status updated successfully", true));
});

const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid order ID", false));
  }
  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json(new ApiResponse(404, null, "Order not found", false));
  }
  return res.status(200).json(new ApiResponse(200, order, "Order fetched successfully", true));
});

module.exports = {
  createOrder,
  getOrderHistory,
  getAllOrders,
  updateOrder,
  getOrderById,
};
