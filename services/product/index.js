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
  is_imported_picks,
  is_bakery,
  search,
  price_range,
  sort_by,
  rating,
  brands
}) => {
  console.log("category", category);
  console.log("sub_category", sub_category);
  console.log("brands", brands);
  console.log("is_best_seller", is_best_seller);
  console.log("is_imported_picks", is_imported_picks);
  console.log("is_bakery", is_bakery);
  console.log("search", search);
  console.log("price_range", price_range);
  return await ProductsRepository.getAllProducts({
    page,
    per_page,
    category,
    sub_category,
    is_best_seller,
    is_imported_picks,
    is_bakery,
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

// Helper function to process boolean fields
const processBooleanField = (productData, fieldName) => {
  const fieldValue = productData[fieldName];
  
  if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
    return false; // default value
  }

  // Handle numeric values first (1 = true, 0 = false)
  if (typeof fieldValue === 'number' || !isNaN(Number(fieldValue))) {
    const numericValue = Number(fieldValue);
    return numericValue === 1;
  }

  // Handle string values
  if (typeof fieldValue === 'string') {
    const stringValue = fieldValue.toLowerCase().trim();
    return stringValue === 'true' || stringValue === '1' || stringValue === 'yes';
  }

  // Handle boolean values
  if (typeof fieldValue === 'boolean') {
    return fieldValue;
  }

  return false; // default to false if unrecognized
};

// Helper function to detect template/header rows
const isTemplateRow = (productData) => {
  const name = productData.name?.toString().toLowerCase().trim();
  
  // Check for common template patterns
  const templatePatterns = [
    'product name (required)',
    'product name',
    'name (required)',
    'required',
    'template',
    'header',
    'example'
  ];
  
  return templatePatterns.some(pattern => name?.includes(pattern)) || 
         !name || 
         name === '' ||
         productData.price === 0 && !productData.discounted_price;
};

// Helper function to create missing brand
const createMissingBrand = async (brandName) => {
  if (!brandName) return null;
  
  try {
    const brand = new Brand({
      name: brandName,
      is_active: true
    });
    
    await brand.save();
    return brand._id;
  } catch (error) {
    console.error('Error creating brand:', error);
    return null;
  }
};

// Helper function to generate SKU from product name following industry standards
const generateSku = async (productName, brandName = '', subCategoryName = '') => {
  if (!productName) {
    throw new Error("Product name is required to generate SKU");
  }

  // Clean and format brand name (max 8 chars for industry standard)
  const cleanBrand = brandName
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Remove special characters
    .substring(0, 8);

  const cleanCategory = subCategoryName
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6);

  const cleanName = productName
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') 
    .replace(/\s+/g, '') 
    .substring(0, 12);

  const sizeMatch = productName.match(/(\d+)\s*(g|kg|ml|l|gm|gms|kgs|mls|ls)/i);
  const sizeSuffix = sizeMatch ? sizeMatch[0].replace(/\s/g, '').toUpperCase() : '';

  const parts = [];
  
  if (cleanBrand) parts.push(cleanBrand);
  if (cleanCategory) parts.push(cleanCategory);
  parts.push(cleanName);
  if (sizeSuffix) parts.push(sizeSuffix);

  let baseSku = parts.join('-');
  
  if (baseSku.length > 20) { // Reduced from 25 to account for "SKU-" prefix
    baseSku = baseSku.substring(0, 20);
  }

  let sku = `SKU-${baseSku}`;
  let counter = 1;
  
  while (await Product.findOne({ sku })) {
    const suffix = counter.toString().padStart(2, '0'); 
    sku = `SKU-${baseSku}-${suffix}`;
    counter++;
    
    // Prevent infinite loop
    if (counter > 99) {
      sku = `SKU-${baseSku}-${Date.now().toString().slice(-4)}`;
      break;
    }
  }

  return sku;
};

const bulkCreateProducts = async (products, adminId) => {
  const results = { success: [], failed: [] };
  const BATCH_SIZE = 100; // Process in batches of 100

  try {
    // Pre-fetch all subcategories and brands to reduce database queries
    const subCategoryNames = [...new Set(products.map(p => p.sub_category).filter(Boolean))];
    const brandNames = [...new Set(products.map(p => p.brand || p.manufacturer).filter(Boolean))];

    // Batch fetch subcategories
    const subCategories = await SubCategory.find({
      $or: [
        { _id: { $in: subCategoryNames.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
        { name: { $in: subCategoryNames.filter(name => !mongoose.Types.ObjectId.isValid(name)) } }
      ]
    });
    
    const subCategoryMap = new Map();
    subCategories.forEach(sc => {
      subCategoryMap.set(sc._id.toString(), sc._id);
      subCategoryMap.set(sc.name.toLowerCase(), sc._id);
    });

    // Batch fetch brands
    const brands = await Brand.find({
      name: { $in: brandNames }
    });
    
    const brandMap = new Map();
    brands.forEach(brand => {
      brandMap.set(brand.name.toLowerCase(), brand._id);
    });

    // Get existing SKUs to check for duplicates
    const existingSkus = await Product.find({}, 'sku').lean();
    const existingSkuSet = new Set(existingSkus.map(p => p.sku));

    // Get existing products for duplicate checking
    const existingProducts = await Product.find({
      $or: brandNames.map(name => ({ brand: brandMap.get(name.toLowerCase()) })).filter(Boolean)
    }, 'name brand').lean();
    
    const existingProductSet = new Set(
      existingProducts.map(p => `${p.name.toLowerCase()}_${p.brand}`)
    );

    // Process products in batches
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchResults = await processBatch(batch, i, adminId, subCategoryMap, brandMap, existingSkuSet, existingProductSet);
      
      results.success.push(...batchResults.success);
      results.failed.push(...batchResults.failed);
    }

  } catch (error) {
    console.error('Bulk create error:', error);
    // If there's a major error, mark all products as failed
    products.forEach((product, index) => {
      results.failed.push({
        index,
        name: product.name || "Unnamed Product",
        error: error.message,
      });
    });
  }

  return results;
};

const processBatch = async (batch, startIndex, adminId, subCategoryMap, brandMap, existingSkuSet, existingProductSet) => {
  const results = { success: [], failed: [] };
  const validProducts = [];

  for (const [batchIndex, productData] of batch.entries()) {
    const originalIndex = startIndex + batchIndex;
    
    try {
      // Skip template rows
      // if (isTemplateRow(productData)) {
      //   continue;
      // }

      // Check required fields
      if (!productData.name || !productData.price || !productData.sub_category) {
        throw new Error("Missing required fields (name, price, or sub_category)");
      }

      // Find subcategory using pre-fetched data
      let subCategoryId = subCategoryMap.get(productData.sub_category);
      if (!subCategoryId && mongoose.Types.ObjectId.isValid(productData.sub_category)) {
        subCategoryId = productData.sub_category;
      }
      if (!subCategoryId) {
        subCategoryId = subCategoryMap.get(productData.sub_category.toLowerCase());
      }
      if (!subCategoryId) {
        throw new Error(`Subcategory not found: "${productData.sub_category}". Please check the name or ID.`);
      }

      // Find brand using pre-fetched data
      const brandName = productData.brand || productData.manufacturer;
      let brandId = brandMap.get(brandName?.toLowerCase());
      
      if (!brandId && brandName) {
        // Create missing brand
        const newBrand = new Brand({ name: brandName, is_active: true });
        const savedBrand = await newBrand.save();
        brandId = savedBrand._id;
        brandMap.set(brandName.toLowerCase(), brandId);
      }

      if (!brandId) {
        throw new Error(`Brand not found and could not be created: "${brandName}". Please check the name or ID.`);
      }

      // Get brand and subcategory names for SKU generation
      const brand = await Brand.findById(brandId);
      const brandNameForSku = brand ? brand.name : '';
      const subCategory = await SubCategory.findById(subCategoryId);
      const subCategoryNameForSku = subCategory ? subCategory.name : '';

      // Process SKU field - generate if missing
      let skuValue = processSkuField(productData);
      if (!skuValue) {
        skuValue = await generateSku(productData.name, brandNameForSku, subCategoryNameForSku);
      }

      // Check for existing SKU using pre-fetched data
      if (existingSkuSet.has(skuValue)) {
        throw new Error(`Duplicate SKU: Product with SKU "${skuValue}" already exists.`);
      }

      // Check for existing product using pre-fetched data
      const productKey = `${productData.name.toLowerCase()}_${brandId}`;
      if (existingProductSet.has(productKey)) {
        throw new Error(`Duplicate product: Product with name "${productData.name}" and brand already exists.`);
      }

      // Process the product data
      const processedProduct = { ...productData };

      // Process price fields
      if (processedProduct.price) {
        processedProduct.price = mongoose.Types.Decimal128.fromString(processedProduct.price.toString());
      }
      if (processedProduct.discounted_price) {
        processedProduct.discounted_price = mongoose.Types.Decimal128.fromString(processedProduct.discounted_price.toString());
      }

      // Process image fields
      const imageData = processImageFields(productData);
      if (imageData.banner_image) {
        processedProduct.banner_image = imageData.banner_image;
      }
      if (imageData.images && imageData.images.length > 0) {
        processedProduct.images = imageData.images;
      }

      // Process status field
      const statusValue = processStatusField(productData);
      if (statusValue) {
        processedProduct.status = statusValue;
      }

      // Process weight field
      const weightValue = processWeightField(productData);
      if (weightValue !== null) {
        processedProduct.weight_in_grams = weightValue;
      }

      // Set SKU
      processedProduct.sku = skuValue;

      // Set subcategory and brand
      processedProduct.sub_category = subCategoryId;
      processedProduct.brand = brandId;

      // Set manufacturer field from input data
      if (productData.manufacturer) {
        processedProduct.manufacturer = productData.manufacturer;
      }

      // Process tags field
      const tagsValue = processTagsField(productData);
      if (tagsValue && tagsValue.length > 0) {
        processedProduct.tags = tagsValue;
      }

      // Process boolean fields
      processedProduct.is_best_seller = processBooleanField(productData, 'is_best_seller');
      processedProduct.is_imported_picks = processBooleanField(productData, 'is_imported_picks');
      processedProduct.is_bakery = processBooleanField(productData, 'is_bakery');

      // Clean up redundant fields
      Object.keys(processedProduct).forEach(key => {
        if (key.startsWith('photo_links') || key.toLowerCase().includes('photo')) {
          delete processedProduct[key];
        }
        if (key.toLowerCase().includes('published') || 
            key.toLowerCase().includes('draft') ||
            key.includes('published_/_draft') ||
            key.includes('published/draft')) {
          delete processedProduct[key];
        }
        if (key.toLowerCase().includes('weight')) {
          delete processedProduct[key];
        }
        if ((key.toLowerCase() === 'sku' || key.toLowerCase() === 'product_sku') && key !== 'sku') {
          delete processedProduct[key];
        }
        if ((key.toLowerCase() === 'brand' || key.toLowerCase() === 'manufacturer') && key !== 'brand') {
          delete processedProduct[key];
        }
        if (key.toLowerCase() === 'tags' || key.toLowerCase() === 'tag') {
          delete processedProduct[key];
        }
        if (key.toLowerCase().includes('sub_category') && key !== 'sub_category') {
          delete processedProduct[key];
        }
      });

      // Remove category field as it's not in Product schema
      if (processedProduct.category) {
        delete processedProduct.category;
      }

      if (
        processedProduct.discounted_price &&
        parseFloat(processedProduct.discounted_price.toString()) >
          parseFloat(processedProduct.price.toString())
      ) {
        throw new Error("Discounted price cannot be higher than regular price");
      }

      // Store original index separately for tracking
      const productWithIndex = {
        ...processedProduct,
        created_by_admin: adminId,
        originalIndex: originalIndex,
      };
      
      validProducts.push(productWithIndex);

    } catch (error) {
      results.failed.push({
        index: originalIndex,
        name: productData.name || "Unnamed Product",
        error: error.message,
      });
    }
  }

  // Insert valid products in this batch
  if (validProducts.length > 0) {
    try {
      // Remove originalIndex field before insertion to avoid validation errors
      const productsForInsert = validProducts.map(({ originalIndex, ...product }) => product);
      
      const insertedProducts = await ProductsRepository.bulkCreateProducts(productsForInsert);
      
      // Map inserted products back to their original indices
      results.success = insertedProducts.map((product, i) => ({
        index: validProducts[i].originalIndex,
        _id: product._id,
        name: product.name,
        sku: product.sku,
      }));

      // Add new SKUs to existing set for next batches
      insertedProducts.forEach(product => {
        existingSkuSet.add(product.sku);
      });

    } catch (error) {
      console.error('Batch insert error:', error);
      
      // If batch insert fails, add all valid products in this batch to failed list
      validProducts.forEach(validProduct => {
        results.failed.push({
          index: validProduct.originalIndex,
          name: validProduct.name,
          error: error.message,
        });
      });
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
