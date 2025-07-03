const Bundle = require("../../models/bundleModel");
const Product = require("../../models/productsModel");
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

  // Fetch bundles (no aggregation pipeline, use lean for performance)
  const bundles = await Bundle.find(match)
    .sort(sortOptions)
    .skip(skip)
    .limit(per_page)
    .lean();

    console.log("Bundles fetched:", bundles);

  // Populate products and handle variants
  const populatedBundles = await Promise.all(
    bundles.map(async (bundle) => {
      console.log("Processing bundle:",bundle, bundle._id);
      // Fix: Always parse bundle.price and bundle.discounted_price to numbers
      let bundlePrice = bundle.price;
      let bundleDiscountedPrice = bundle.discounted_price;
      if (bundlePrice && bundlePrice.$numberDecimal) {
        bundlePrice = parseFloat(bundlePrice.$numberDecimal);
      } else if (bundlePrice && bundlePrice.toString) {
        bundlePrice = parseFloat(bundlePrice.toString());
      }
      if (bundleDiscountedPrice && bundleDiscountedPrice.$numberDecimal) {
        bundleDiscountedPrice = parseFloat(bundleDiscountedPrice.$numberDecimal);
      } else if (bundleDiscountedPrice && bundleDiscountedPrice.toString) {
        bundleDiscountedPrice = parseFloat(bundleDiscountedPrice.toString());
      }
      const populatedProducts = await Promise.all(
        (bundle.products || []).map(async (entry) => {
          const productDoc = await Product.findById(entry.product).lean();
          if (!productDoc) return null;

          let productPrice = productDoc.price;
          let productDiscountedPrice = productDoc.discounted_price;
          if (productPrice && productPrice.$numberDecimal) {
            productPrice = parseFloat(productPrice.$numberDecimal);
          } else if (productPrice && productPrice.toString) {
            productPrice = parseFloat(productPrice.toString());
          }
          if (productDiscountedPrice && productDiscountedPrice.$numberDecimal) {
            productDiscountedPrice = parseFloat(productDiscountedPrice.$numberDecimal);
          } else if (productDiscountedPrice && productDiscountedPrice.toString) {
            productDiscountedPrice = parseFloat(productDiscountedPrice.toString());
          }
          // Attach reviews
          const reviews = await Product.aggregate([
            { $match: { _id: productDoc._id } },
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
          ]);
          const productWithReviews = reviews[0] || productDoc;
          productWithReviews.reviews = productWithReviews.reviews || [];
          productWithReviews.price = productPrice;
          productWithReviews.discounted_price = productDiscountedPrice;
          // If variant_sku is present, attach only that variant
          if (entry.variant_sku && Array.isArray(productDoc.variants)) {
            const variant = productDoc.variants.find(v => v.sku === entry.variant_sku);
            if (variant) {
              variant.price = variant.price && variant.price.$numberDecimal ? parseFloat(variant.price.$numberDecimal) : (variant.price && variant.price.toString ? parseFloat(variant.price.toString()) : variant.price);
              variant.discounted_price = variant.discounted_price && variant.discounted_price.$numberDecimal ? parseFloat(variant.discounted_price.$numberDecimal) : (variant.discounted_price && variant.discounted_price.toString ? parseFloat(variant.discounted_price.toString()) : variant.discounted_price);
              productWithReviews.selected_variant = variant;
            }
          }
          if (Array.isArray(productWithReviews.variants)) {
            productWithReviews.variants = productWithReviews.variants.map(variant => ({
              ...variant,
              price: variant.price && variant.price.$numberDecimal ? parseFloat(variant.price.$numberDecimal) : (variant.price && variant.price.toString ? parseFloat(variant.price.toString()) : variant.price),
              discounted_price: variant.discounted_price && variant.discounted_price.$numberDecimal ? parseFloat(variant.discounted_price.$numberDecimal) : (variant.discounted_price && variant.discounted_price.toString ? parseFloat(variant.discounted_price.toString()) : variant.discounted_price),
            }));
          }
          return productWithReviews;
        })
      );
      return {
        ...bundle,
        price: bundlePrice,
        discounted_price: bundleDiscountedPrice,
        products: populatedProducts.filter(Boolean),
      };
    })
  );

  // For total count (without pagination)
  const total = await Bundle.countDocuments(match);

  return {
    data: populatedBundles,
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
