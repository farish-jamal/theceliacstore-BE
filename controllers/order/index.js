const { asyncHandler } = require("../../common/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");
const mongoose = require("mongoose");
const Cart = require("../../models/cartModel");
const Address = require("../../models/addressModel");
const Product = require("../../models/productsModel");
const Order = require("../../models/orderModel");
const Category = require("../../models/categoryModel");
const Bundle = require("../../models/bundleModel");
const { calculateShippingCost, calculateShippingByZone } = require("../../utils/shipping/calculateShipping");

const getAllOrders = asyncHandler(async (req, res) => {
  const adminId = req.admin._id;
  if (!adminId) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Unauthorized", false));
  }

  const {
    service_id,
    page = 1,
    per_page = 50,
    search = "",
    start_date,
    end_date,
    status,
  } = req.query;

  try {
    let query = {};

    if (service_id) {
      if (!mongoose.Types.ObjectId.isValid(service_id)) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Invalid service_id format", false));
      }
      const serviceObjectId = new mongoose.Types.ObjectId(service_id);
      const categoryIds = await Category.find({
        service: serviceObjectId,
      }).distinct("_id");
      if (categoryIds.length === 0) {
        return res
          .status(404)
          .json(
            new ApiResponse(
              404,
              null,
              "No categories found for this service",
              false
            )
          );
      }
      const productIds = await Product.find({
        sub_category: { $in: categoryIds },
      }).distinct("_id");
      if (productIds.length === 0) {
        return res
          .status(404)
          .json(
            new ApiResponse(
              404,
              null,
              "No products found in these categories",
              false
            )
          );
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

    if (status) {
      query.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * per_page)
        .limit(parseInt(per_page, 10)),
      Order.countDocuments(query),
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { data: orders, total },
          "Orders fetched successfully",
          true
        )
      );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Server error", false));
  }
});

const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { cartId, addressId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(cartId) ||
    !mongoose.Types.ObjectId.isValid(addressId)
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid cart or address ID", false));
  }

  const cart = await Cart.findOne({ _id: cartId, user: userId });
  if (!cart || cart.items.length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Cart not found or empty", false));
  }
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Address not found", false));
  }

  let totalAmount = 0;
  let discountedTotalAmount = 0;
  let totalWeightGrams = 0;
  const orderItems = [];
  for (const cartItem of cart.items) {
    if (cartItem.type === "product") {
      const product = await Product.findById(cartItem.product);
      if (!product) continue;
      const price = parseFloat(product.price.toString());
      const discountedPrice = product.discounted_price
        ? parseFloat(product.discounted_price.toString())
        : price;
      const itemTotal = price * cartItem.quantity;
      const discountedItemTotal = discountedPrice * cartItem.quantity;
      totalAmount += itemTotal;
      discountedTotalAmount += discountedItemTotal;
      
      // Calculate weight for shipping
      if (product.weight_in_grams) {
        totalWeightGrams += product.weight_in_grams * cartItem.quantity;
      }
      
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
      const discountedPrice = bundle.discounted_price
        ? parseFloat(bundle.discounted_price.toString())
        : price;
      const itemTotal = price * cartItem.quantity;
      const discountedItemTotal = discountedPrice * cartItem.quantity;
      totalAmount += itemTotal;
      discountedTotalAmount += discountedItemTotal;
      
      // Calculate weight for bundles - sum up all products in the bundle
      if (bundle.products && Array.isArray(bundle.products)) {
        for (const bundleProduct of bundle.products) {
          const product = await Product.findById(bundleProduct.product);
          if (product && product.weight_in_grams) {
            totalWeightGrams += product.weight_in_grams * bundleProduct.quantity * cartItem.quantity;
          }
        }
      }
      
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

  // Calculate shipping cost based on pincode and total weight
  // This creates a snapshot of the shipping cost at order time
  const { shippingCost, shippingDetails } = await calculateShippingCost(
    address.pincode,
    totalWeightGrams
  );

  // Calculate final total amount (discounted total + shipping)
  const finalTotalAmount = discountedTotalAmount + shippingCost;

  const order = new Order({
    user: userId,
    items: orderItems,
    address: addressSnapshot,
    totalAmount,
    discountedTotalAmount,
    shippingCost,
    shippingDetails,
    finalTotalAmount,
    status: "pending",
  });
  await order.save();

  cart.items = [];
  await cart.save();

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order created successfully", true));
});

const getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [orders, total] = await Promise.all([
    Order.find({ user: userId }).sort({ createdAt: -1 }),
    Order.countDocuments({ user: userId }),
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { data: orders, total },
        "Orders fetched successfully",
        true
      )
    );
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid order ID", false));
  }

  if (!status) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Status is required", false));
  }

  // Validate status values
  const validStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          false
        )
      );
  }

  const order = await Order.findById(id);
  if (!order) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Order not found", false));
  }

  // Check if status transition is valid (optional business logic)
  const currentStatus = order.status;
  const statusTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [], // Final state
    cancelled: [], // Final state
  };

  if (
    statusTransitions[currentStatus] &&
    !statusTransitions[currentStatus].includes(status)
  ) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          `Cannot change status from ${currentStatus} to ${status}`,
          false
        )
      );
  }

  order.status = status;
  await order.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, order, "Order status updated successfully", true)
    );
});

const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid order ID", false));
  }
  const order = await Order.findById(id);
  if (!order) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Order not found", false));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order fetched successfully", true));
});

const getOrderByIdFormUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid order ID", false));
  }
  const order = await Order.findById(id);
  if (!order) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Order not found", false));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order fetched successfully", true));
});

const editOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid order ID", false));
  }
  const order = await Order.findOne({ _id: id, user: userId });
  if (!order) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Order not found", false));
  }
  if (order.status !== "pending") {
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, "Only pending orders can be edited", false)
      );
  }

  const { addressId, items } = req.body;
  let addressSnapshot = order.address;
  let newAddress = null;
  if (addressId) {
    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Address not found", false));
    }
    newAddress = address;
    addressSnapshot = { ...address.toObject() };
    delete addressSnapshot._id;
    delete addressSnapshot.user;
    delete addressSnapshot.createdAt;
    delete addressSnapshot.updatedAt;
    delete addressSnapshot.__v;
  }

  let totalAmount = 0;
  let discountedTotalAmount = 0;
  let totalWeightGrams = 0;
  const orderItems = [];
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item.type === "product") {
        const product = await Product.findById(item.product);
        if (!product) continue;
        const price = parseFloat(product.price.toString());
        const discountedPrice = product.discounted_price
          ? parseFloat(product.discounted_price.toString())
          : price;
        const itemTotal = price * item.quantity;
        const discountedItemTotal = discountedPrice * item.quantity;
        totalAmount += itemTotal;
        discountedTotalAmount += discountedItemTotal;
        
        // Calculate weight for shipping
        if (product.weight_in_grams) {
          totalWeightGrams += product.weight_in_grams * item.quantity;
        }
        
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
          quantity: item.quantity,
          total_amount: itemTotal,
          discounted_total_amount: discountedItemTotal,
        });
      } else if (item.type === "bundle") {
        const bundle = await Bundle.findById(item.bundle);
        if (!bundle) continue;
        const price = parseFloat(bundle.price.toString());
        const discountedPrice = bundle.discounted_price
          ? parseFloat(bundle.discounted_price.toString())
          : price;
        const itemTotal = price * item.quantity;
        const discountedItemTotal = discountedPrice * item.quantity;
        totalAmount += itemTotal;
        discountedTotalAmount += discountedItemTotal;
        
        // Calculate weight for bundles
        if (bundle.products && Array.isArray(bundle.products)) {
          for (const bundleProduct of bundle.products) {
            const product = await Product.findById(bundleProduct.product);
            if (product && product.weight_in_grams) {
              totalWeightGrams += product.weight_in_grams * bundleProduct.quantity * item.quantity;
            }
          }
        }
        
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
          quantity: item.quantity,
          total_amount: itemTotal,
          discounted_total_amount: discountedItemTotal,
        });
      }
    }
  }

  if (orderItems.length > 0) {
    order.items = orderItems;
    order.totalAmount = totalAmount;
    order.discountedTotalAmount = discountedTotalAmount;
  } else {
    // If no items provided, recalculate weight from existing items
    for (const item of order.items) {
      if (item.type === "product" && item.product) {
        const product = await Product.findById(item.product._id);
        if (product && product.weight_in_grams) {
          totalWeightGrams += product.weight_in_grams * item.quantity;
        }
      } else if (item.type === "bundle" && item.bundle) {
        const bundle = await Bundle.findById(item.bundle._id);
        if (bundle && bundle.products && Array.isArray(bundle.products)) {
          for (const bundleProduct of bundle.products) {
            const product = await Product.findById(bundleProduct.product);
            if (product && product.weight_in_grams) {
              totalWeightGrams += product.weight_in_grams * bundleProduct.quantity * item.quantity;
            }
          }
        }
      }
    }
    discountedTotalAmount = parseFloat(order.discountedTotalAmount.toString());
  }
  
  order.address = addressSnapshot;
  
  // Recalculate shipping if address or items changed
  if (newAddress || orderItems.length > 0) {
    const pincode = newAddress ? newAddress.pincode : order.address.pincode;
    const { shippingCost, shippingDetails } = await calculateShippingCost(
      pincode,
      totalWeightGrams
    );
    order.shippingCost = shippingCost;
    order.shippingDetails = shippingDetails;
    order.finalTotalAmount = discountedTotalAmount + shippingCost;
  }
  
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order updated successfully", true));
});

const getProductsWithOrderCounts = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      per_page = 50,
      search = "",
      status = "",
      sort_by = "totalOrders", // totalOrders, totalQuantity, totalRevenue, totalDiscountedRevenue
      sort_order = "desc", // asc, desc
    } = req.query;

    // Build query for orders based on status filter
    let orderQuery = {};
    if (status) {
      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];
      if (validStatuses.includes(status)) {
        orderQuery.status = status;
      }
    }

    // Get orders with status filter
    const orders = await Order.find(orderQuery);
    const productOrderMap = {};

    // Iterate through filtered orders and count by product
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.type === "product" && item.product && item.product._id) {
          // Handle individual products
          const productId = item.product._id.toString();

          if (!productOrderMap[productId]) {
            // Convert Decimal128 fields to numbers for direct products
            productOrderMap[productId] = {
              product: {
                _id: item.product._id,
                name: item.product.name,
                sku: item.product.sku,
                price: item.product.price
                  ? parseFloat(item.product.price.toString())
                  : null,
                discounted_price: item.product.discounted_price
                  ? parseFloat(item.product.discounted_price.toString())
                  : null,
                banner_image: item.product.banner_image,
              },
              totalOrders: 0,
              totalQuantity: 0,
              totalRevenue: 0,
              totalDiscountedRevenue: 0,
            };
          }

          productOrderMap[productId].totalOrders += 1;
          productOrderMap[productId].totalQuantity += item.quantity || 0;

          // Safe parsing with null checks
          const totalAmount = item.total_amount
            ? parseFloat(item.total_amount.toString())
            : 0;
          const discountedTotalAmount = item.discounted_total_amount
            ? parseFloat(item.discounted_total_amount.toString())
            : 0;

          // If discounted_total_amount is 0 or null, calculate it from the product's discounted price
          let finalDiscountedAmount = discountedTotalAmount;
          if (discountedTotalAmount === 0 && item.product.discounted_price) {
            const productDiscountedPrice = parseFloat(
              item.product.discounted_price.toString()
            );
            const productQuantity = item.quantity || 0;
            finalDiscountedAmount = productDiscountedPrice * productQuantity;
          }

          productOrderMap[productId].totalRevenue += totalAmount;
          productOrderMap[productId].totalDiscountedRevenue +=
            finalDiscountedAmount;
        } else if (
          item.type === "bundle" &&
          item.bundle &&
          item.bundle.products
        ) {
          // Handle bundles - extract individual products from bundles
          item.bundle.products.forEach((bundleProduct) => {
            const productId = bundleProduct.product.toString();

            if (!productOrderMap[productId]) {
              productOrderMap[productId] = {
                product: {
                  _id: bundleProduct.product,
                  name: `Product from Bundle: ${item.bundle.name}`,
                  // We'll need to fetch actual product details
                },
                totalOrders: 0,
                totalQuantity: 0,
                totalRevenue: 0,
                totalDiscountedRevenue: 0,
              };
            }

            // Calculate quantity: bundle quantity * product quantity in bundle
            const totalProductQuantity =
              (item.quantity || 0) * (bundleProduct.quantity || 0);

            productOrderMap[productId].totalOrders += 1;
            productOrderMap[productId].totalQuantity += totalProductQuantity;

            // For bundles, we can't directly calculate individual product revenue
            // So we'll distribute bundle revenue proportionally
            const bundleRevenue = item.total_amount
              ? parseFloat(item.total_amount.toString())
              : 0;
            const bundleDiscountedRevenue = item.discounted_total_amount
              ? parseFloat(item.discounted_total_amount.toString())
              : 0;

            // Simple proportional distribution (you might want to improve this logic)
            const productCount = item.bundle.products.length;
            productOrderMap[productId].totalRevenue +=
              bundleRevenue / productCount;
            productOrderMap[productId].totalDiscountedRevenue +=
              bundleDiscountedRevenue / productCount;
          });
        }
      });
    });

    // Fetch actual product details for products that came from bundles
    for (const productId in productOrderMap) {
      if (
        productOrderMap[productId].product.name &&
        productOrderMap[productId].product.name.startsWith(
          "Product from Bundle:"
        )
      ) {
        const product = await Product.findById(productId);
        if (product) {
          productOrderMap[productId].product = {
            _id: product._id,
            name: product.name,
            sku: product.sku,
            price: product.price ? parseFloat(product.price.toString()) : null,
            discounted_price: product.discounted_price
              ? parseFloat(product.discounted_price.toString())
              : null,
            banner_image: product.banner_image,
          };
        }
      }
    }

    // Convert to array and apply search filter
    let result = Object.values(productOrderMap);

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.product.name.toLowerCase().includes(searchLower) ||
          (item.product.sku &&
            item.product.sku.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    const validSortFields = [
      "totalOrders",
      "totalQuantity",
      "totalRevenue",
      "totalDiscountedRevenue",
    ];
    const sortField = validSortFields.includes(sort_by)
      ? sort_by
      : "totalOrders";
    const sortDirection = sort_order === "asc" ? 1 : -1;

    result.sort((a, b) => {
      const aValue = a[sortField] || 0;
      const bValue = b[sortField] || 0;
      return (aValue - bValue) * sortDirection;
    });

    // Apply pagination
    const total = result.length;
    const startIndex = (page - 1) * per_page;
    const endIndex = startIndex + parseInt(per_page, 10);
    const paginatedResult = result.slice(startIndex, endIndex);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          data: paginatedResult,
          total,
        },
        "Products with order counts fetched successfully",
        true
      )
    );
  } catch (error) {
    console.error("Error fetching products with order counts:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Server error", false));
  }
});

// Order update function with safe field updates
const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid order ID", false));
  }

  const order = await Order.findById(id);
  if (!order) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Order not found", false));
  }

  try {
    // Update status if provided
    if (updateData.status) {
      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (!validStatuses.includes(updateData.status)) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Invalid status", false));
      }

      order.status = updateData.status;
    }

    if (updateData.addressId) {
      const address = await Address.findById(updateData.addressId);
      if (!address) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Address not found", false));
      }

      // Create address snapshot
      const addressSnapshot = { ...address.toObject() };
      delete addressSnapshot._id;
      delete addressSnapshot.user;
      delete addressSnapshot.createdAt;
      delete addressSnapshot.updatedAt;
      delete addressSnapshot.__v;

      order.address = addressSnapshot;
    }

    // Update multiple products and bundles
    if (updateData.products && Array.isArray(updateData.products)) {
      for (const productUpdate of updateData.products) {
        const { productId, newQuantity } = productUpdate;
        const quantity = parseInt(newQuantity);

        if (quantity < 0) {
          return res
            .status(400)
            .json(
              new ApiResponse(
                400,
                null,
                `Quantity cannot be negative for product ${productId}`,
                false
              )
            );
        }

        // Find the product in order items
        const itemIndex = order.items.findIndex(
          (item) =>
            item.type === "product" && item.product._id.toString() === productId
        );

        if (itemIndex === -1) {
          return res
            .status(400)
            .json(
              new ApiResponse(
                400,
                null,
                `Product ${productId} not found in order`,
                false
              )
            );
        }

        if (quantity === 0) {
          // Remove item from order
          order.items.splice(itemIndex, 1);
        } else {
          // Update quantity
          const product = await Product.findById(productId);
          if (!product) {
            return res
              .status(400)
              .json(
                new ApiResponse(
                  400,
                  null,
                  `Product ${productId} not found`,
                  false
                )
              );
          }

          const price = parseFloat(product.price.toString());
          const discountedPrice = product.discounted_price
            ? parseFloat(product.discounted_price.toString())
            : price;
          const itemTotal = price * quantity;
          const discountedItemTotal = discountedPrice * quantity;

          order.items[itemIndex].quantity = quantity;
          order.items[itemIndex].total_amount =
            mongoose.Types.Decimal128.fromString(itemTotal.toString());
          order.items[itemIndex].discounted_total_amount =
            mongoose.Types.Decimal128.fromString(
              discountedItemTotal.toString()
            );
        }
      }
    }

    // Update multiple bundles
    if (updateData.bundles && Array.isArray(updateData.bundles)) {
      for (const bundleUpdate of updateData.bundles) {
        const { bundleId, newQuantity } = bundleUpdate;
        const quantity = parseInt(newQuantity);

        if (quantity < 0) {
          return res
            .status(400)
            .json(
              new ApiResponse(
                400,
                null,
                `Quantity cannot be negative for bundle ${bundleId}`,
                false
              )
            );
        }

        // Find the bundle in order items
        const itemIndex = order.items.findIndex(
          (item) =>
            item.type === "bundle" && item.bundle._id.toString() === bundleId
        );

        if (itemIndex === -1) {
          return res
            .status(400)
            .json(
              new ApiResponse(
                400,
                null,
                `Bundle ${bundleId} not found in order`,
                false
              )
            );
        }

        if (quantity === 0) {
          // Remove item from order
          order.items.splice(itemIndex, 1);
        } else {
          // Update quantity
          const bundle = await Bundle.findById(bundleId);
          if (!bundle) {
            return res
              .status(400)
              .json(
                new ApiResponse(
                  400,
                  null,
                  `Bundle ${bundleId} not found`,
                  false
                )
              );
          }

          const price = parseFloat(bundle.price.toString());
          const discountedPrice = bundle.discounted_price
            ? parseFloat(bundle.discounted_price.toString())
            : price;
          const itemTotal = price * quantity;
          const discountedItemTotal = discountedPrice * quantity;

          order.items[itemIndex].quantity = quantity;
          order.items[itemIndex].total_amount =
            mongoose.Types.Decimal128.fromString(itemTotal.toString());
          order.items[itemIndex].discounted_total_amount =
            mongoose.Types.Decimal128.fromString(
              discountedItemTotal.toString()
            );
        }
      }
    }

    // Recalculate totals after item updates
    if (updateData.products || updateData.bundles) {
      let totalAmount = 0;
      let discountedTotalAmount = 0;

      order.items.forEach((item) => {
        totalAmount += parseFloat(item.total_amount.toString());
        discountedTotalAmount += parseFloat(
          item.discounted_total_amount.toString()
        );
      });

      order.totalAmount = mongoose.Types.Decimal128.fromString(
        totalAmount.toString()
      );
      order.discountedTotalAmount = mongoose.Types.Decimal128.fromString(
        discountedTotalAmount.toString()
      );
    }

    // Handle shipping updates with three options:
    // 1. Manual override (updateData.shippingCost)
    // 2. Recalculate by specific delivery zone (updateData.deliveryZoneId)
    // 3. Auto-recalculate if address or items changed
    
    let shippingUpdated = false;
    let newShippingCost = 0;
    let newShippingDetails = null;
    
    // Option 1: Manual shipping cost override
    if (updateData.shippingCost !== undefined) {
      newShippingCost = parseFloat(updateData.shippingCost);
      
      if (newShippingCost < 0) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Shipping cost cannot be negative", false));
      }
      
      // Keep existing shipping details but mark as manual override
      newShippingDetails = order.shippingDetails || {
        deliveryZoneId: null,
        zoneName: "Manual Override",
        pricingType: "manual",
        isManual: true,
        calculatedAt: new Date(),
      };
      newShippingDetails.isManual = true;
      newShippingDetails.calculatedAt = new Date();
      shippingUpdated = true;
    }
    // Option 2: Recalculate by specific delivery zone
    else if (updateData.deliveryZoneId) {
      let totalWeightGrams = 0;
      
      // Calculate total weight from current order items
      for (const item of order.items) {
        if (item.type === "product" && item.product) {
          const product = await Product.findById(item.product._id);
          if (product && product.weight_in_grams) {
            totalWeightGrams += product.weight_in_grams * item.quantity;
          }
        } else if (item.type === "bundle" && item.bundle) {
          const bundle = await Bundle.findById(item.bundle._id);
          if (bundle && bundle.products && Array.isArray(bundle.products)) {
            for (const bundleProduct of bundle.products) {
              const product = await Product.findById(bundleProduct.product);
              if (product && product.weight_in_grams) {
                totalWeightGrams += product.weight_in_grams * bundleProduct.quantity * item.quantity;
              }
            }
          }
        }
      }
      
      const result = await calculateShippingByZone(
        updateData.deliveryZoneId,
        totalWeightGrams
      );
      
      if (result.shippingDetails) {
        newShippingCost = result.shippingCost;
        newShippingDetails = result.shippingDetails;
        shippingUpdated = true;
      } else {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Invalid or inactive delivery zone", false));
      }
    }
    // Option 3: Auto-recalculate if address or items changed
    else if (updateData.addressId || updateData.products || updateData.bundles) {
      let totalWeightGrams = 0;
      
      // Calculate total weight from current order items
      for (const item of order.items) {
        if (item.type === "product" && item.product) {
          const product = await Product.findById(item.product._id);
          if (product && product.weight_in_grams) {
            totalWeightGrams += product.weight_in_grams * item.quantity;
          }
        } else if (item.type === "bundle" && item.bundle) {
          const bundle = await Bundle.findById(item.bundle._id);
          if (bundle && bundle.products && Array.isArray(bundle.products)) {
            for (const bundleProduct of bundle.products) {
              const product = await Product.findById(bundleProduct.product);
              if (product && product.weight_in_grams) {
                totalWeightGrams += product.weight_in_grams * bundleProduct.quantity * item.quantity;
              }
            }
          }
        }
      }
      
      // Recalculate shipping based on new weight and/or address
      const pincode = order.address.pincode;
      const result = await calculateShippingCost(
        pincode,
        totalWeightGrams
      );
      
      newShippingCost = result.shippingCost;
      newShippingDetails = result.shippingDetails;
      shippingUpdated = true;
    }
    
    // Update shipping if any of the above conditions triggered
    if (shippingUpdated) {
      order.shippingCost = newShippingCost;
      order.shippingDetails = newShippingDetails;
      
      // Recalculate final total
      const discountedTotal = parseFloat(order.discountedTotalAmount.toString());
      order.finalTotalAmount = mongoose.Types.Decimal128.fromString(
        (discountedTotal + newShippingCost).toString()
      );
    }

    // Update other fields if provided
    if (updateData.notes) {
      order.notes = updateData.notes;
    }

    await order.save();

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order updated successfully", true));
  } catch (error) {
    console.error("Error updating order:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Error updating order", false));
  }
});

const getOrdersByProductId = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { status } = req.query;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid product ID", false));
  }

  try {
    // Build the base query
    const baseOr = [
      {
        "items.type": "product",
        "items.product._id": new mongoose.Types.ObjectId(productId),
      },
      {
        "items.type": "bundle",
        "items.bundle.products.product": new mongoose.Types.ObjectId(productId),
      },
    ];

    // If status is provided, add it to the query
    const query = status
      ? { $and: [{ $or: baseOr }, { status }] }
      : { $or: baseOr };

    // Find orders that contain this product either directly or in bundles
    const orders = await Order.find(query);

    let totalOrders = 0;
    let totalQuantity = 0;
    let totalRevenue = 0;
    let totalDiscountedRevenue = 0;
    let product = null;
    const relevantOrders = [];

    // Calculate stats and get product info
    orders.forEach((order) => {
      let orderContainsProduct = false;
      let orderQuantity = 0;
      let orderRevenue = 0;
      let orderDiscountedRevenue = 0;

      order.items.forEach((item) => {
        if (
          item.type === "product" &&
          item.product &&
          item.product._id &&
          item.product._id.toString() === productId
        ) {
          // Direct product order
          orderContainsProduct = true;
          orderQuantity += item.quantity || 0;

          // Safe parsing with null checks
          const totalAmount = item.total_amount
            ? parseFloat(item.total_amount.toString())
            : 0;
          const discountedTotalAmount = item.discounted_total_amount
            ? parseFloat(item.discounted_total_amount.toString())
            : 0;

          // If discounted_total_amount is 0 or null, calculate it from the product's discounted price
          let finalDiscountedAmount = discountedTotalAmount;
          if (discountedTotalAmount === 0 && item.product.discounted_price) {
            const productDiscountedPrice = parseFloat(
              item.product.discounted_price.toString()
            );
            const productQuantity = item.quantity || 0;
            finalDiscountedAmount = productDiscountedPrice * productQuantity;
          }

          orderRevenue += totalAmount;
          orderDiscountedRevenue += finalDiscountedAmount;

          if (!product) {
            // Convert Decimal128 fields to numbers for product details
            product = {
              _id: item.product._id,
              name: item.product.name,
              sku: item.product.sku,
              price: item.product.price
                ? parseFloat(item.product.price.toString())
                : null,
              discounted_price: item.product.discounted_price
                ? parseFloat(item.product.discounted_price.toString())
                : null,
              banner_image: item.product.banner_image,
            };
          }
        } else if (
          item.type === "bundle" &&
          item.bundle &&
          item.bundle.products
        ) {
          // Check if this bundle contains the product
          const bundleProduct = item.bundle.products.find(
            (bp) => bp.product && bp.product.toString() === productId
          );
          if (bundleProduct) {
            orderContainsProduct = true;
            // Calculate quantity: bundle quantity * product quantity in bundle
            orderQuantity +=
              (item.quantity || 0) * (bundleProduct.quantity || 0);

            // Distribute bundle revenue proportionally
            const bundleRevenue = item.total_amount
              ? parseFloat(item.total_amount.toString())
              : 0;
            const bundleDiscountedRevenue = item.discounted_total_amount
              ? parseFloat(item.discounted_total_amount.toString())
              : 0;
            const productCount = item.bundle.products.length;

            orderRevenue += bundleRevenue / productCount;
            orderDiscountedRevenue += bundleDiscountedRevenue / productCount;

            if (!product) {
              // We'll fetch the actual product details
              product = { _id: productId };
            }
          }
        }
      });

      if (orderContainsProduct) {
        totalOrders += 1;
        totalQuantity += orderQuantity;
        totalRevenue += orderRevenue;
        totalDiscountedRevenue += orderDiscountedRevenue;
        relevantOrders.push(order);
      }
    });

    // Fetch actual product details if not already available
    if (!product || !product.name) {
      const productDetails = await Product.findById(productId);
      if (productDetails) {
        product = {
          _id: productDetails._id,
          name: productDetails.name,
          sku: productDetails.sku,
          price: productDetails.price
            ? parseFloat(productDetails.price.toString())
            : null,
          discounted_price: productDetails.discounted_price
            ? parseFloat(productDetails.discounted_price.toString())
            : null,
          banner_image: productDetails.banner_image,
        };
      }
    }

    const result = {
      product,
      totalOrders,
      totalQuantity,
      totalRevenue,
      totalDiscountedRevenue,
      orders: relevantOrders,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          "Orders by product ID fetched successfully",
          true
        )
      );
  } catch (error) {
    console.error("Error fetching orders by product ID:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Server error", false));
  }
});

module.exports = {
  createOrder,
  getOrderHistory,
  getAllOrders,
  updateOrder,
  updateOrderStatus,
  getOrderById,
  editOrder,
  getProductsWithOrderCounts,
  getOrdersByProductId,
  getOrderByIdFormUser,
};
