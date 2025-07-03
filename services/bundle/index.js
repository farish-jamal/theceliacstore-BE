const BundleRepository = require("../../repositories/bundle/index.js");

const getAllBundles = async (params) => {
  return await BundleRepository.getAllBundles(params);
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
