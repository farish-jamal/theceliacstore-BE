const Category = require("../../models/categoryModel");
const Product = require("../../models/productsModel");
const mongoose = require("mongoose");

const getAllProducts = async ({
  page,
  per_page,
  service_id,
  category_id,
  is_best_seller,
  search,
  price_range,
  sort_by,
}) => {
  const skip = (page - 1) * per_page;

  const filter = {};

  let serviceCategoryIds = [];

  if (service_id) {
    const services = Array.isArray(service_id)
      ? service_id
      : service_id.split(",");
    const serviceObjectIds = services
      .map((s) =>
        mongoose.isValidObjectId(s)
          ? mongoose.Types.ObjectId.createFromHexString(s)
          : null
      )
      .filter(Boolean);

    if (serviceObjectIds.length > 0) {
      const serviceCategories = await Category.find({
        service: { $in: serviceObjectIds },
      });
      serviceCategoryIds = serviceCategories.map((category) =>
        category._id.toString()
      );
    }
  }

  let finalCategoryIds = [
    ...new Set([
      ...(Array.isArray(category_id)
        ? category_id
        : [category_id].filter(Boolean)),
      ...serviceCategoryIds,
    ]),
  ];

  console.log("finalCategoryIds", finalCategoryIds);

  if (finalCategoryIds.length > 0) {
    filter.category = { $in: finalCategoryIds };
  }

  // if (Array.isArray(category_id) && category_id.length > 0) {
  //   filter.category = { $in: category_id };
  // } else if (category_id) {
  //   filter.category = category_id;
  // }

  if (is_best_seller) {
    filter.is_best_seller = is_best_seller;
  }

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (price_range) {
    const priceRanges = Array.isArray(price_range)
      ? price_range
      : [price_range];

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    priceRanges.forEach((range) => {
      if (typeof range === "string") {
        const prices = range.split("_").map(Number);

        if (prices.length === 2 && !isNaN(prices[0]) && !isNaN(prices[1])) {
          minPrice = Math.min(minPrice, prices[0]);
          maxPrice = Math.max(maxPrice, prices[1]);
        } else if (prices.length === 1 && !isNaN(prices[0])) {
          minPrice = Math.min(minPrice, prices[0]);
        }
      }
    });

    if (minPrice !== Infinity && maxPrice !== -Infinity) {
      filter.price = { $gte: minPrice, $lte: maxPrice };
    } else if (minPrice !== Infinity) {
      filter.price = { $gte: minPrice };
    }
  }

  let sortOptions = {};
  if (sort_by === "asc") {
    sortOptions = { price: 1 };
  } else if (sort_by === "dec") {
    sortOptions = { price: -1 };
  } else {
    sortOptions = { createdAt: -1 };
  }

  const products = await Product.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(per_page);

  const total = await Product.countDocuments(filter);

  return {
    data: products,
    total,
  };
};

const getProductById = async (id) => {
  return await Product.findById(id);
};

const createProduct = async (data) => {
  return await Product.create(data);
};

const updateProduct = async (id, data) => {
  return await Product.findByIdAndUpdate(id, data, { new: true });
};

const deleteProduct = async (id) => {
  return await Product.findByIdAndDelete(id);
};

const getProductsByAdmin = async ({ id, filters, page, per_page }) => {
  const skip = (page - 1) * per_page;
  const limit = parseInt(per_page);

  return await Product.find({ ...filters, created_by_admin: id })
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit);
};

const bulkCreateProducts = async (productsData) => {
  try {
    if (!Array.isArray(productsData)) {
      throw new Error("Input must be an array of product data");
    }

    const createdProducts = await Product.insertMany(productsData, {
      ordered: false,
    });

    return createdProducts;
  } catch (error) {
    if (error.writeErrors) {
      const errors = error.writeErrors.map((err) => ({
        index: err.index,
        error: err.errmsg,
      }));
      throw new Error(
        `Bulk create failed for some products: ${JSON.stringify(errors)}`
      );
    } else {
      throw new Error(`Bulk create failed: ${error.message}`);
    }
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByAdmin,
  bulkCreateProducts,
};
