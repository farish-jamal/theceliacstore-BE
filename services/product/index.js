const { default: mongoose } = require("mongoose");
const SubCategory = require("../../models/subCategoryModel.js");
const Brand = require("../../models/brandModel.js");
const ProductsRepository = require("../../repositories/product/index.js");
const Product = require("../../models/productsModel.js");

const getAllProducts = async ({
  page,
  per_page,
  category,
  sub_category,
  is_best_seller,
  search,
  price_range,
  sort_by,
  rating,
  brands
}) => {
  return await ProductsRepository.getAllProducts({
    page,
    per_page,
    category,
    sub_category,
    is_best_seller,
    search,
    price_range,
    sort_by,
    rating,
    brands
  });
};

const getProductById = async (id) => {
  return await ProductsRepository.getProductById(id);
};

const createProduct = async (data) => {
  return await ProductsRepository.createProduct(data);
};

const updateProduct = async (id, data) => {
  return await ProductsRepository.updateProduct(id, data);
};

const deleteProduct = async (id) => {
  return await ProductsRepository.deleteProduct(id);
};

const getProductsByAdmin = async ({ id, page, per_page, search }) => {
  const filters = {
    ...(search && { name: { $regex: search, $options: "i" } }),
  };
  return await ProductsRepository.getProductsByAdmin({
    id,
    filters,
    page,
    per_page,
  });
};

// Helper function to process image fields from bulk import data
const processImageFields = (productData) => {
  const imageFields = {
    banner_image: null,
    images: []
  };

  // Handle different photo_links formats - support up to 8 columns
  const photoLinksFields = Object.keys(productData).filter(key => 
    key.startsWith('photo_links') || key.toLowerCase().includes('photo')
  );

  if (photoLinksFields.length === 0) {
    return imageFields;
  }

  // Collect all image URLs
  const allImageUrls = [];

  photoLinksFields.forEach(field => {
    const value = productData[field];
    if (value) {
      if (typeof value === 'string') {
        // Handle comma-separated URLs or single URL
        const urls = value.split(',').map(url => url.trim()).filter(url => url);
        allImageUrls.push(...urls);
      } else if (Array.isArray(value)) {
        // Handle array of URLs
        allImageUrls.push(...value.filter(url => url && typeof url === 'string'));
      }
    }
  });

  // Remove duplicates and filter out empty strings
  const uniqueImageUrls = [...new Set(allImageUrls)].filter(url => url.trim());

  if (uniqueImageUrls.length > 0) {
    // Set first image as banner_image
    imageFields.banner_image = uniqueImageUrls[0];
    
    // Set all images in the images array
    imageFields.images = uniqueImageUrls;
  }

  return imageFields;
};

// Helper function to process status field
const processStatusField = (productData) => {
  // Look for various status field names including those with special characters
  const statusField = productData.status || 
                     productData.published_draft || 
                     productData.published ||
                     productData["published_/_draft?"] ||
                     productData["published_/_draft"] ||
                     productData["published_/_draft:"] ||
                     productData["published/draft"];
  
  if (statusField === undefined || statusField === null || statusField === "") {
    return "draft"; // default status
  }

  // Handle numeric values first (1 = published, 0 = draft)
  if (typeof statusField === 'number' || !isNaN(Number(statusField))) {
    const numericValue = Number(statusField);
    return numericValue === 1 ? "published" : "draft";
  }

  const statusValue = statusField.toString().toLowerCase().trim();
  
  // Handle various status formats
  if (statusValue === "published" || statusValue === "publish" || statusValue === "1" || statusValue === "true") {
    return "published";
  } else if (statusValue === "draft" || statusValue === "0" || statusValue === "false") {
    return "draft";
  }
  
  return "draft"; // default to draft if unrecognized
};

// Helper function to process weight field
const processWeightField = (productData) => {
  const weightField = productData.weight_in_grams || productData.weight || productData.weight_grams;
  
  if (!weightField) {
    return null;
  }

  const weightValue = parseFloat(weightField);
  
  if (isNaN(weightValue) || weightValue < 0) {
    return null;
  }

  return weightValue;
};

// Helper function to process SKU field
const processSkuField = (productData) => {
  const skuField = productData.sku || productData.SKU || productData.product_sku;
  
  if (!skuField) {
    return null;
  }

  // Convert to string and trim whitespace
  const skuValue = skuField.toString().trim();
  
  if (skuValue === "") {
    return null;
  }

  return skuValue;
};

// Helper function to find subcategory by name or ID
const findSubCategory = async (subCategoryValue) => {
  if (!subCategoryValue) {
    return null;
  }

  // If it's already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(subCategoryValue)) {
    const subCategory = await SubCategory.findById(subCategoryValue);
    if (subCategory) {
      return subCategory._id;
    }
  }

  // If it's a string, try to find by name (case-insensitive)
  const subCategoryName = subCategoryValue.toString().trim();
  if (subCategoryName) {
    const subCategory = await SubCategory.findOne({
      name: { $regex: new RegExp(`^${subCategoryName}$`, 'i') },
      is_active: true
    });
    
    if (subCategory) {
      return subCategory._id;
    }
  }

  return null;
};

// Helper function to find brand by name or ID
const findBrand = async (brandValue) => {
  if (!brandValue) {
    return null;
  }

  // If it's already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(brandValue)) {
    const brand = await Brand.findById(brandValue);
    if (brand) {
      return brand._id;
    }
  }

  // If it's a string, try to find by name (case-insensitive)
  const brandName = brandValue.toString().trim();
  if (brandName) {
    const brand = await Brand.findOne({
      name: { $regex: new RegExp(`^${brandName}$`, 'i') },
      is_active: true
    });
    
    if (brand) {
      return brand._id;
    }
  }

  return null;
};

// Helper function to process tags field
const processTagsField = (productData) => {
  const tagsField = productData.tags || productData.tag;
  
  if (!tagsField) {
    return [];
  }

  // If it's already an array, return it
  if (Array.isArray(tagsField)) {
    return tagsField.filter(tag => tag && tag.toString().trim());
  }

  // If it's a string, split by comma and clean up
  if (typeof tagsField === 'string') {
    return tagsField
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
  }

  return [];
};

const bulkCreateProducts = async (products, adminId) => {
  const results = {
    success: [],
    failed: [],
  };

  const validProducts = [];

  for (const [index, productData] of products.entries()) {
    try {
      if (!productData.name || !productData.price || !productData.sub_category) {
        throw new Error("Missing required fields (name, price, or sub_category)");
      }

      // Process SKU field
      const skuValue = processSkuField(productData);
      if (!skuValue) {
        throw new Error("SKU is required");
      }

      // Find subcategory by ID or name
      const subCategoryId = await findSubCategory(productData.sub_category);

      if (!subCategoryId) {
        throw new Error(`Subcategory not found: "${productData.sub_category}". Please check the name or ID.`);
      }

      // Find brand by ID or name
      const brandId = await findBrand(productData.brand || productData.manufacturer);

      if (!brandId) {
        throw new Error(`Brand not found: "${productData.brand || productData.manufacturer}". Please check the name or ID.`);
      }

      // Check for existing product with same SKU
      const existingProductBySku = await Product.findOne({
        sku: skuValue,
      });

      if (existingProductBySku) {
        throw new Error(
          `Duplicate SKU: Product with SKU "${skuValue}" already exists.`
        );
      }

      const existingProduct = await Product.findOne({
        name: productData.name,
        sub_category: subCategoryId,
      });

      if (existingProduct) {
        throw new Error(
          "Duplicate product: Product with the same name and subcategory already exists."
        );
      }

      const priceFields = [
        "price",
        "discounted_price",
      ];

      const processedProduct = { ...productData };
      
      // Process price fields
      for (const field of priceFields) {
        if (processedProduct[field]) {
          processedProduct[field] = mongoose.Types.Decimal128.fromString(
            processedProduct[field].toString()
          );
        }
      }

      // Process image fields
      const imageFields = processImageFields(productData);
      processedProduct.banner_image = imageFields.banner_image;
      processedProduct.images = imageFields.images;

      // Process status field
      processedProduct.status = processStatusField(productData);

      // Process weight field
      processedProduct.weight_in_grams = processWeightField(productData);

      // Process SKU field
      processedProduct.sku = skuValue;

      // Set the found subcategory ID
      processedProduct.sub_category = subCategoryId;

      // Set the found brand ID
      processedProduct.brand = brandId;

      // Process tags field
      processedProduct.tags = processTagsField(productData);

      // Remove photo_links fields from the final product data
      Object.keys(processedProduct).forEach(key => {
        if (key.startsWith('photo_links') || key.toLowerCase().includes('photo')) {
          delete processedProduct[key];
        }
      });

      // Remove status-related fields that might have different names
      Object.keys(processedProduct).forEach(key => {
        if (key.toLowerCase().includes('published') || 
            key.toLowerCase().includes('draft') ||
            key.includes('published_/_draft') ||
            key.includes('published/draft')) {
          delete processedProduct[key];
        }
      });

      // Remove weight-related fields that might have different names
      Object.keys(processedProduct).forEach(key => {
        if (key.toLowerCase().includes('weight')) {
          delete processedProduct[key];
        }
      });

      // Remove SKU-related fields that might have different names
      Object.keys(processedProduct).forEach(key => {
        if (key.toLowerCase() === 'sku' || key.toLowerCase() === 'product_sku') {
          delete processedProduct[key];
        }
      });

      // Remove brand-related fields that might have different names
      Object.keys(processedProduct).forEach(key => {
        if (key.toLowerCase() === 'brand' || key.toLowerCase() === 'manufacturer') {
          delete processedProduct[key];
        }
      });

      // Remove tags-related fields that might have different names
      Object.keys(processedProduct).forEach(key => {
        if (key.toLowerCase() === 'tags' || key.toLowerCase() === 'tag') {
          delete processedProduct[key];
        }
      });

      // Remove the original sub_category field since we've processed it
      if (processedProduct.sub_category && processedProduct.sub_category !== subCategoryId) {
        // Keep the processed sub_category, remove any other sub_category related fields
        Object.keys(processedProduct).forEach(key => {
          if (key.toLowerCase().includes('sub_category') && key !== 'sub_category') {
            delete processedProduct[key];
          }
        });
      }

      if (
        processedProduct.discounted_price &&
        parseFloat(processedProduct.discounted_price.toString()) >
          parseFloat(processedProduct.price.toString())
      ) {
        throw new Error("Discounted price cannot be higher than regular price");
      }

      validProducts.push({
        ...processedProduct,
        created_by_admin: adminId,
      });

      results.success.push({
        index,
        name: productData.name,
      });
    } catch (error) {
      results.failed.push({
        index,
        name: productData.name || "Unnamed Product",
        error: error.message,
      });
    }
  }

  if (validProducts.length > 0) {
    try {
      const insertedProducts = await ProductsRepository.bulkCreateProducts(
        validProducts
      );
      results.success = insertedProducts.map((product, i) => ({
        index: i,
        _id: product._id,
        name: product.name,
      }));
    } catch (error) {
      results.failed.push({ error: error.message });
    }
  }

  return results;
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
