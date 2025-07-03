const { asyncHandler } = require("../../common/asyncHandler.js");
const ApiResponse = require("../../utils/ApiResponse.js");
const BundleService = require("../../services/bundle/index.js");
const mongoose = require("mongoose");
const { uploadMultipleFiles } = require("../../utils/upload/index.js");
const Product = require("../../models/productsModel.js");

const getAllBundles = asyncHandler(async (req, res) => {
  const { page = 1, per_page = 50, search = "" } = req.query;
  const bundles = await BundleService.getAllBundles({ page, per_page, search });
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
    for (const entry of bundleData.products) {
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
