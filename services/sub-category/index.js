const SubCategoryRepository = require("../../repositories/sub-category/index.js");

const getAllSubCategories = async ({
  category,
  page = 1,
  per_page = 50,
  search = "",
}) => {
  const skip = (page - 1) * per_page;
  const filter = {};
  if (category) filter.category = category;
  if (search) filter.name = { $regex: search, $options: "i" };
  return await SubCategoryRepository.getAllSubCategories(
    filter,
    skip,
    per_page
  );
};

const getSubCategoryById = async (id) => {
  return await SubCategoryRepository.getSubCategoryById(id);
};

const createSubCategory = async (data) => {
  return await SubCategoryRepository.createSubCategory(data);
};

const updateSubCategory = async (id, data) => {
  return await SubCategoryRepository.updateSubCategory(id, data);
};

const deleteSubCategory = async (id) => {
  return await SubCategoryRepository.deleteSubCategory(id);
};

module.exports = {
  getAllSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
};
