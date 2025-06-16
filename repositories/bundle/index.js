const Bundle = require("../../models/bundleModel");

const getAllBundles = async (filter = {}, skip = 0, limit = 50) => {
  return await Bundle.find(filter)
    .skip(skip)
    .limit(limit)
    .populate("products");
};

const getBundleById = async (id) => {
  return await Bundle.findById(id).populate("products");
};

const createBundle = async (data) => {
  return await Bundle.create(data);
};

const updateBundle = async (id, data) => {
  return await Bundle.findByIdAndUpdate(id, data, { new: true }).populate("products");
};

const deleteBundle = async (id) => {
  return await Bundle.findByIdAndDelete(id);
};

module.exports = {
  getAllBundles,
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
};
