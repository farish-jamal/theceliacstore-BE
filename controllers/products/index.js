const mongoose = require("mongoose");
const ApiResponse = require("../../utils/ApiResponse.js");
const ProductsServices = require("../../services/product/index.js");
const { asyncHandler } = require("../../common/asyncHandler.js");
const {
  uploadMultipleFiles,
  uploadSingleFile,
} = require("../../utils/upload/index.js");
const Product = require("../../models/productsModel.js");

const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    per_page = 10,
    price_range,
    service_id,
    sub_category_id,
    is_best_seller,
    search,
    sort_by = "created_at",
  } = req.query;

  const products = await ProductsServices.getAllProducts({
    page: parseInt(page, 10),
    per_page: parseInt(per_page, 10),
    service_id,
    sub_category_id,
    is_best_seller,
    search,
    price_range,
    sort_by,
  });
  res.json(
    new ApiResponse(200, products, "Products fetched successfully", true)
  );
});

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(400, null, "Invalid product ID", false));
  }

  const product = await ProductsServices.getProductById(id);
  if (!product) {
    return res.json(new ApiResponse(404, null, "Product not found", false));
  }

  res.json(new ApiResponse(200, product, "Product fetched successfully", true));
});

const createProduct = asyncHandler(async (req, res) => {
  const images = req.files?.images || [];
  const bannerImageFile = req.files?.banner_image?.[0];

  if (!images.length && !bannerImageFile) {
    return res.json(new ApiResponse(404, null, "No Images Found", false));
  }

  const imageUrls = images.length
    ? await uploadMultipleFiles(images, "uploads/images")
    : [];

  const bannerImageUrl = await uploadSingleFile(
    bannerImageFile.path,
    "uploads/images"
  );

  let { meta_data, variants } = req.body;

  if (meta_data) {
    try {
      meta_data = JSON.parse(meta_data);
    } catch (error) {
      return res.json(
        new ApiResponse(400, null, "Invalid meta_data format", false)
      );
    }
  }

  if (Array.isArray(variants)) {
    variants = await Promise.all(
      variants.map(async (variant) => {
        if (Array.isArray(variant.images) && variant.images.length) {
          variant.images = await uploadMultipleFiles(
            variant.images,
            "uploads/images"
          );
        } else {
          variant.images = [];
        }
        return variant;
      })
    );
  }
  
  const productData = {
    ...req.body,
    images: imageUrls,
    banner_image: bannerImageUrl,
    meta_data,
    variants,
  };

  if (productData.inventory === undefined) productData.inventory = 0;

  const product = await ProductsServices.createProduct(productData);
  res.json(new ApiResponse(201, product, "Product created successfully", true));
});

const updateProduct = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const product = await Product.findById(id);

  if (!product) {
    return res.json(new ApiResponse(404, null, "Product not found", false));
  }

  const images = req.files?.images || [];
  const bannerImageFile = req.files?.banner_image?.[0];

  const imageUrls = images.length
    ? await uploadMultipleFiles(images, "uploads/images")
    : [];

  const bannerImageUrl = await uploadSingleFile(
    bannerImageFile.path,
    "uploads/images"
  );

  let { meta_data, variants } = req.body;

  if (meta_data) {
    try {
      meta_data = JSON.parse(meta_data);
    } catch (error) {
      return res.json(
        new ApiResponse(400, null, "Invalid meta_data format", false)
      );
    }
  }

  // Handle variants: parse if string, else use as is
  if (variants && typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch (error) {
      return res.json(
        new ApiResponse(400, null, "Invalid variants format", false)
      );
    }
  }
  // For each variant, parse images if string
  if (Array.isArray(variants)) {
    variants = await Promise.all(
      variants.map(async (variant) => {
        if (Array.isArray(variant.images) && variant.images.length) {
          variant.images = await uploadMultipleFiles(
            variant.images,
            "uploads/images"
          );
        } else {
          variant.images = [];
        }
        return variant;
      })
    );
  }

  // Handle product images: parse if string, else use as is
  let productImages = imageUrls;
  if (req.body.images && typeof req.body.images === "string") {
    try {
      productImages = JSON.parse(req.body.images);
    } catch (error) {
      productImages = [req.body.images];
    }
  }

  const productData = {
    ...req.body,
    images: productImages,
    banner_image: bannerImageUrl,
    meta_data,
    variants,
  };

  if (productData.inventory === undefined)
    productData.inventory = product.inventory || 0;

  const updatedProduct = await ProductsServices.updateProduct(id, productData);

  res.json(
    new ApiResponse(200, updatedProduct, "Product updated successfully", true)
  );
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await ProductsServices.deleteProduct(req.params.id);
  if (!product) {
    return res.json(new ApiResponse(404, null, "Product not found", false));
  }

  res.json(new ApiResponse(200, null, "Product deleted successfully", true));
});

const getProductsByAdmin = asyncHandler(async (req, res) => {
  const adminId = req.admin._id;
  if (!adminId) {
    return res.json(new ApiResponse(404, null, "Admin not found", false));
  }

  const { page = 1, per_page = 10, search } = req.query;

  const products = await ProductsServices.getProductsByAdmin({
    id: adminId,
    page,
    per_page,
    search,
  });

  res.json(
    new ApiResponse(200, products, "Product fetched successfully", true)
  );
});

const bulkCreateProducts = asyncHandler(async (req, res) => {
  const products = req.body;
  const adminId = req.admin._id;

  if (!adminId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Admin not found", false));
  }

  if (!products?.length) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "No products provided", false));
  }

  const result = await ProductsServices.bulkCreateProducts(products, adminId);

  res
    .status(207)
    .json(new ApiResponse(207, result, "Batch processing completed", true));
});

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByAdmin,
  bulkCreateProducts,
};
