const Product = require("../../models/productsModel");
const SubCategory = require("../../models/subCategoryModel");

const getAllProducts = async ({
  page,
  per_page,
  category,
  sub_category,
  is_best_seller,
  search,
  rating,
  price_range,
  brands,
  sort_by,
}) => {
  const skip = (page - 1) * per_page;
  const match = {};

  let subCategoryIds = [];
  if (category) {
    const categoryArray = Array.isArray(category) ? category : [category];
    const subCats = await SubCategory.find({ category: { $in: categoryArray } }, "_id");
    subCategoryIds = subCats.map((sc) => sc._id);
    if (sub_category) {
      const subCatArray = Array.isArray(sub_category)
        ? sub_category
        : [sub_category];
      subCategoryIds = subCategoryIds.filter((id) =>
        subCatArray.includes(id.toString())
      );
    }
    if (subCategoryIds.length > 0) {
      match.sub_category = { $in: subCategoryIds };
    } else {
      return { data: [], total: 0 };
    }
  } else if (sub_category) {
    match.sub_category = Array.isArray(sub_category)
      ? { $in: sub_category }
      : sub_category;
  }

  if (is_best_seller !== undefined && is_best_seller !== null) {
    const bestSellerValue = is_best_seller === 'true' || is_best_seller === true;
    match.is_best_seller = bestSellerValue;
    console.log("is_best_seller filter applied:", bestSellerValue);
  }
  if (search) {
    match.name = { $regex: search, $options: "i" };
  }

  if (brands) {
    match.brand = { $in: Array.isArray(brands) ? brands : [brands] };
    console.log("Brand filter applied:", match.brand);
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
      match.price = { $gte: minPrice, $lte: maxPrice };
    } else if (minPrice !== Infinity) {
      match.price = { $gte: minPrice };
    }
  }

  let sortOptions = {};
  switch (sort_by) {
    case "latest":
    case "created_at":
      sortOptions = { createdAt: -1 };
      break;
    case "high_to_low":
      sortOptions = { price: -1 };
      break;
    case "low_to_high":
      sortOptions = { price: 1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }



  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "productId",
        as: "reviews",
      },
    },
    {
      $addFields: {
        avgRating: { $avg: "$reviews.rating" },
        reviewsCount: { $size: "$reviews" },
      },
    },
  ];

  if (rating) {
    pipeline.push({ $match: { avgRating: { $gte: Number(rating) } } });
  }

  pipeline.push({ $sort: sortOptions });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: per_page });

  const products = await Product.aggregate(pipeline);
  console.log(products,"<<<<<<<<<<<<<<<<,")

  const countPipeline = pipeline.filter(
    (stage) =>
      !("$skip" in stage) && !("$limit" in stage) && !("$sort" in stage)
  );
  countPipeline.push({ $count: "total" });
  const totalResult = await Product.aggregate(countPipeline);
  const total = totalResult[0]?.total || 0;

  // Convert Decimal128 to numbers for all products
  const productsWithReviews = products.map((product) => {
    const convertedProduct = {
      ...product,
      price: product.price && typeof product.price === 'object' && product.price.$numberDecimal 
        ? parseFloat(product.price.$numberDecimal) 
        : (product.price && typeof product.price === 'object' ? parseFloat(product.price.toString()) : product.price),
      discounted_price: product.discounted_price && typeof product.discounted_price === 'object' && product.discounted_price.$numberDecimal
        ? parseFloat(product.discounted_price.$numberDecimal)
        : (product.discounted_price && typeof product.discounted_price === 'object' ? parseFloat(product.discounted_price.toString()) : product.discounted_price),
      reviews: product.reviews || [],
    };

    // Handle variants
    if (Array.isArray(convertedProduct.variants)) {
      convertedProduct.variants = convertedProduct.variants.map(variant => ({
        ...variant,
        price: variant.price && typeof variant.price === 'object' && variant.price.$numberDecimal
          ? parseFloat(variant.price.$numberDecimal)
          : (variant.price && typeof variant.price === 'object' ? parseFloat(variant.price.toString()) : variant.price),
        discounted_price: variant.discounted_price && typeof variant.discounted_price === 'object' && variant.discounted_price.$numberDecimal
          ? parseFloat(variant.discounted_price.$numberDecimal)
          : (variant.discounted_price && typeof variant.discounted_price === 'object' ? parseFloat(variant.discounted_price.toString()) : variant.discounted_price),
      }));
    }

    return convertedProduct;
  });

  return {
    data: productsWithReviews,
    total,
  };
};

const getProductById = async (id) => {
  return await Product.findById(id).populate('brand');
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
    .populate('brand')
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
      ordered: true, // Change to true to get proper error messages
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
