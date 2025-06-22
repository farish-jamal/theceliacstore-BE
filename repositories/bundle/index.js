const Bundle = require("../../models/bundleModel");
const SubCategory = require("../../models/subCategoryModel");

const getAllBundles = async ({
  page = 1,
  per_page = 50,
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

  if (search) {
    match.name = { $regex: search, $options: "i" };
  }
  if (is_best_seller !== undefined) {
    match.is_best_seller = is_best_seller;
  }
  if (price_range) {
    const priceRanges = Array.isArray(price_range) ? price_range : [price_range];
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

  // Filtering by brands, category, sub_category, rating via products in bundle
  let productMatch = {};
  if (brands) {
    productMatch.brand = { $in: Array.isArray(brands) ? brands : [brands] };
  }
  if (is_best_seller !== undefined) {
    productMatch.is_best_seller = is_best_seller;
  }
  if (category) {
    const subCats = await SubCategory.find({ category: category }, '_id');
    const subCategoryIds = subCats.map(sc => sc._id);
    if (subCategoryIds.length > 0) {
      productMatch.sub_category = { $in: subCategoryIds };
    } else {
      return { data: [], total: 0 };
    }
  } else if (sub_category) {
    productMatch.sub_category = Array.isArray(sub_category) ? { $in: sub_category } : sub_category;
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

  // Aggregate pipeline for bundles
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "products",
        localField: "products",
        foreignField: "_id",
        as: "products",
        pipeline: [
          { $match: productMatch },
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
        ],
      },
    },
    // Only keep bundles with at least one product after product filter
    { $match: { "products.0": { $exists: true } } },
  ];

  if (rating) {
    pipeline[1].$lookup.pipeline.push({ $match: { avgRating: { $gte: Number(rating) } } });
  }

  pipeline.push({ $sort: sortOptions });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: per_page });

  const bundles = await Bundle.aggregate(pipeline);

  // Ensure reviews key is always present for each product
  const bundlesWithReviews = bundles.map(bundle => ({
    ...bundle,
    products: (bundle.products || []).map(product => ({
      ...product,
      reviews: product.reviews || [],
    })),
  }));

  // For total count (without pagination)
  const countPipeline = pipeline.filter(
    (stage) => !("$skip" in stage) && !("$limit" in stage) && !("$sort" in stage)
  );
  countPipeline.push({ $count: "total" });
  const totalResult = await Bundle.aggregate(countPipeline);
  const total = totalResult[0]?.total || 0;

  return {
    data: bundlesWithReviews,
    total,
  };
};

const getBundleById = async (id) => {
  return await Bundle.findById(id).populate("products");
};

const createBundle = async (data) => {
  return await Bundle.create(data);
};

const updateBundle = async (id, data) => {
  return await Bundle.findByIdAndUpdate(id, data, { new: true }).populate("products");
};

const deleteBundle = async (id) => {
  return await Bundle.findByIdAndDelete(id);
};

module.exports = {
  getAllBundles,
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
};
