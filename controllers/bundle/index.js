const { asyncHandler } = require("../../common/asyncHandler.js");
const ApiResponse = require("../../utils/ApiResponse.js");
const BundleService = require("../../services/bundle/index.js");
const mongoose = require("mongoose");
const { uploadMultipleFiles } = require("../../utils/upload/index.js");
const Product = require("../../models/productsModel.js");

const getAllBundles = asyncHandler(async (req, res) => {
  const {
    page = 1,
    per_page = 50,
    price_range,
    category,
    rating,
    sub_category,
    is_best_seller,
    search,
    brands,
    sort_by = "created_at",
  } = req.query;

  const bundles = await BundleService.getAllBundles({
    page: parseInt(page, 10),
    per_page: parseInt(per_page, 10),
    category,
    sub_category,
    is_best_seller,
    search,
    rating,
    price_range,
    brands,
    sort_by,
  });

  // Convert Decimal128 to numbers for all bundles
  if (bundles.data && Array.isArray(bundles.data)) {
    bundles.data = bundles.data.map(bundle => {
      const convertedBundle = {
        ...bundle,
        price: bundle.price && typeof bundle.price === 'object' && bundle.price.$numberDecimal 
          ? parseFloat(bundle.price.$numberDecimal) 
          : (bundle.price && typeof bundle.price === 'object' ? parseFloat(bundle.price.toString()) : bundle.price),
        discounted_price: bundle.discounted_price && typeof bundle.discounted_price === 'object' && bundle.discounted_price.$numberDecimal
          ? parseFloat(bundle.discounted_price.$numberDecimal)
          : (bundle.discounted_price && typeof bundle.discounted_price === 'object' ? parseFloat(bundle.discounted_price.toString()) : bundle.discounted_price),
      };

      // Handle products within bundles
      if (Array.isArray(convertedBundle.products)) {
        convertedBundle.products = convertedBundle.products.map(product => {
          const convertedProduct = {
            ...product,
            price: product.price && typeof product.price === 'object' && product.price.$numberDecimal 
              ? parseFloat(product.price.$numberDecimal) 
              : (product.price && typeof product.price === 'object' ? parseFloat(product.price.toString()) : product.price),
            discounted_price: product.discounted_price && typeof product.discounted_price === 'object' && product.discounted_price.$numberDecimal
              ? parseFloat(product.discounted_price.$numberDecimal)
              : (product.discounted_price && typeof product.discounted_price === 'object' ? parseFloat(product.discounted_price.toString()) : product.discounted_price),
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
      }

      return convertedBundle;
    });
  }

  res.json(new ApiResponse(200, bundles, "Bundles fetched successfully", true));
});

const getBundleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(400, null, "Invalid bundle ID", false));
  }
  const bundle = await BundleService.getBundleById(id);
  if (!bundle) {
    return res.json(new ApiResponse(404, null, "Bundle not found", false));
  }
  res.json(new ApiResponse(200, bundle, "Bundle fetched successfully", true));
});

const createBundle = asyncHandler(async (req, res) => {
  let imageUrls = [];

  if (req.files && req.files.length > 0) {
    imageUrls = await uploadMultipleFiles(req.files, "uploads/images");
  }

  let bundleData = { ...req.body };

  if (imageUrls.length > 0) {
    bundleData.images = imageUrls;
  }

  if (bundleData?.meta_data) {
    bundleData.meta_data = JSON.parse(bundleData.meta_data);
  }

  if (bundleData.products) {
    if (!Array.isArray(bundleData.products)) {
      bundleData.products = [bundleData.products];
    }
    bundleData.products = bundleData.products.map((p) =>
      typeof p === "string" ? JSON.parse(p) : p
    );

    console.log("bundleData", bundleData)
    for (const entry of bundleData.products) {
      console.log(">>>>>",entry.product)
      const productDoc = await Product.findById(entry.product).lean();
      if (!productDoc) {
        return res.json(new ApiResponse(400, null, `Product not found: ${entry.product}`, false));
      }
      if (Array.isArray(productDoc.variants) && productDoc.variants.length > 0) {
        if (!entry.variant_sku) {
          return res.json(new ApiResponse(400, null, `variant_sku is required for product with variants: ${productDoc.name}`, false));
        }

        const found = productDoc.variants.some(v => v.sku === entry.variant_sku);
        if (!found) {
          return res.json(new ApiResponse(400, null, `variant_sku '${entry.variant_sku}' not found in product: ${productDoc.name}`, false));
        }
      } else {
        entry.variant_sku = undefined;
      }
    }
  }

  bundleData.created_by_admin = req.admin._id;
  const bundle = await BundleService.createBundle(bundleData);
  res.json(new ApiResponse(201, bundle, "Bundle created successfully", true));
});

const updateBundle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(400, null, "Invalid bundle ID", false));
  }
  let bundleData = { ...req.body };
  if (req.files && req.files.length > 0) {
    const imageUrls = await uploadMultipleFiles(req.files, "uploads/images");
    bundleData.images = imageUrls;
  }
  if (bundleData?.meta_data) {
    try {
      bundleData.meta_data = JSON.parse(bundleData.meta_data);
    } catch (error) {
      return res.json(
        new ApiResponse(400, null, "Invalid meta_data format", false)
      );
    }
  }
  const updatedBundle = await BundleService.updateBundle(id, bundleData);
  if (!updatedBundle) {
    return res.json(new ApiResponse(404, null, "Bundle not found", false));
  }
  res.json(
    new ApiResponse(200, updatedBundle, "Bundle updated successfully", true)
  );
});

const deleteBundle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(400, null, "Invalid bundle ID", false));
  }
  const bundle = await BundleService.deleteBundle(id);
  if (!bundle) {
    return res.json(new ApiResponse(404, null, "Bundle not found", false));
  }
  res.json(new ApiResponse(200, null, "Bundle deleted successfully", true));
});

module.exports = {
  getAllBundles,
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
};
