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
  const files = req.files || [];
  const images = files.filter((f) => f.fieldname === "images");
  const bannerImageFile = files.find((f) => f.fieldname === "banner_image");

  if (!images.length && !bannerImageFile) {
    return res.json(new ApiResponse(404, null, "No Images Found", false));
  }

  const imageUrls = images.length
    ? await uploadMultipleFiles(images, "uploads/images")
    : [];

  const bannerImageUrl = bannerImageFile
    ? await uploadSingleFile(bannerImageFile.path, "uploads/images")
    : null;

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

  if (variants && typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch (error) {
      return res.json(
        new ApiResponse(400, null, "Invalid variants format", false)
      );
    }
  }

  if (Array.isArray(variants)) {
    variants = await Promise.all(
      variants.map(async (variant, idx) => {
        const variantImageFiles = files.filter(
          (f) => f.fieldname === `variants[${idx}][images]`
        );
        if (variantImageFiles.length) {
          variant.images = await uploadMultipleFiles(
            variantImageFiles,
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

  const files = req.files || [];
  // Handle product images: keep URLs, upload only new files
  let productImages = [];
  if (req.body.images) {
    let imagesArr = req.body.images;
    if (typeof imagesArr === "string") {
      try {
        imagesArr = JSON.parse(imagesArr);
      } catch {
        imagesArr = [imagesArr];
      }
    }
    productImages = await Promise.all(
      imagesArr.map(async (img, idx) => {
        if (img && typeof img === "object" && img.path) {
          // File object (shouldn't happen with upload.any, but for safety)
          return await uploadSingleFile(img.path, "uploads/images");
        } else if (typeof img === "string" && img.startsWith("http")) {
          return img;
        } else {
          // Check if a file was uploaded for this index
          const file = files.find(
            (f) => f.fieldname === `images` && f.originalname === img
          );
          if (file) {
            return await uploadSingleFile(file.path, "uploads/images");
          }
        }
        return null;
      })
    );
    productImages = productImages.filter(Boolean);
  } else {
    // If no images in body, check for uploaded files
    const imageFiles = files.filter((f) => f.fieldname === "images");
    productImages =
      imageFiles.length > 0
        ? await uploadMultipleFiles(imageFiles, "uploads/images")
        : product.images || [];
  }

  // Banner image: keep URL if string, upload if file
  let bannerImageUrl = product.banner_image;
  const bannerImageFile = files.find((f) => f.fieldname === "banner_image");
  if (bannerImageFile) {
    bannerImageUrl = await uploadSingleFile(bannerImageFile.path, "uploads/images");
  } else if (
    req.body.banner_image &&
    typeof req.body.banner_image === "string" &&
    req.body.banner_image.startsWith("http")
  ) {
    bannerImageUrl = req.body.banner_image;
  }

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

  if (variants && typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch (error) {
      return res.json(
        new ApiResponse(400, null, "Invalid variants format", false)
      );
    }
  }

  // For each variant, keep URLs, upload only new files
  if (Array.isArray(variants)) {
    variants = await Promise.all(
      variants.map(async (variant, idx) => {
        let variantImages = [];
        if (variant.images) {
          let vImgs = variant.images;
          if (typeof vImgs === "string") {
            try {
              vImgs = JSON.parse(vImgs);
            } catch {
              vImgs = [vImgs];
            }
          }
          variantImages = await Promise.all(
            vImgs.map(async (img, vIdx) => {
              if (img && typeof img === "object" && img.path) {
                return await uploadSingleFile(img.path, "uploads/images");
              } else if (typeof img === "string" && img.startsWith("http")) {
                return img;
              } else {
                // Check if a file was uploaded for this variant image
                const file = files.find(
                  (f) =>
                    f.fieldname === `variants[${idx}][images]` &&
                    f.originalname === img
                );
                if (file) {
                  return await uploadSingleFile(file.path, "uploads/images");
                }
              }
              return null;
            })
          );
          variantImages = variantImages.filter(Boolean);
        } else {
          // If no images in body, check for uploaded files
          const variantImageFiles = files.filter(
            (f) => f.fieldname === `variants[${idx}][images]`
          );
          variantImages =
            variantImageFiles.length > 0
              ? await uploadMultipleFiles(variantImageFiles, "uploads/images")
              : variant.images || [];
        }
        return { ...variant, images: variantImages };
      })
    );
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
