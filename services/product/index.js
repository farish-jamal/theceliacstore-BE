const { default: mongoose } = require("mongoose");
const SubCategory = require("../../models/subCategoryModel.js");
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

      // Validate sub_category as a single ObjectId, not an array
      const isValidSubCategory = await SubCategory.exists({
        _id: productData.sub_category,
      });

      if (!isValidSubCategory) {
        throw new Error("Invalid sub_category ID");
      }

      const existingProduct = await Product.findOne({
        name: productData.name,
        sub_category: productData.sub_category,
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
      for (const field of priceFields) {
        if (processedProduct[field]) {
          processedProduct[field] = mongoose.Types.Decimal128.fromString(
            processedProduct[field].toString()
          );
        }
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
