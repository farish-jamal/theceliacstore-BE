const BundleRepository = require("../../repositories/bundle/index.js");

const getAllBundles = async ({ page = 1, per_page = 50, search = "" }) => {
  const skip = (page - 1) * per_page;
  const filter = {};
  if (search) filter.name = { $regex: search, $options: "i" };
  return await BundleRepository.getAllBundles(filter, skip, per_page);
};

const getBundleById = async (id) => {
  return await BundleRepository.getBundleById(id);
};

const createBundle = async (data) => {
  return await BundleRepository.createBundle(data);
};

const updateBundle = async (id, data) => {
  return await BundleRepository.updateBundle(id, data);
};

const deleteBundle = async (id) => {
  return await BundleRepository.deleteBundle(id);
};

module.exports = {
  getAllBundles,
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
};
