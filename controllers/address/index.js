const mongoose = require("mongoose");
const ApiResponse = require("../../utils/ApiResponse.js");
const AddressServices = require("../../services/address/index.js");
const { asyncHandler } = require("../../common/asyncHandler.js");

const getAllAddresses = asyncHandler(async (req, res) => {
  const addresses = await AddressServices.getAllAddresses();
  res.json(
    new ApiResponse(200, addresses, "Addresses fetched successfully", true)
  );
});

const getAddressById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(400, null, "Invalid address ID", false));
  }

  const address = await AddressServices.getAddressById(id);
  if (!address) {
    return res.json(new ApiResponse(404, null, "Address not found", false));
  }

  res.json(new ApiResponse(200, address, "Address fetched successfully", true));
});

const getAddressByUserId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate user ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(400, null, "Invalid user ID", false));
  }

  // Fetch addresses for the user
  const addresses = await AddressServices.getAddressesByUserId(id);

  // Check if addresses exist
  if (!addresses || addresses.length === 0) {
    return res.json(
      new ApiResponse(404, null, "No addresses found for this user", false)
    );
  }

  // Return the addresses
  res.json(
    new ApiResponse(200, addresses, "Addresses fetched successfully", true)
  );
});

const createAddress = asyncHandler(async (req, res) => {
  const addressData = req.body;

  if (
    !addressData.user ||
    !addressData.name ||
    !addressData.mobile ||
    !addressData.pincode ||
    !addressData.locality ||
    !addressData.address ||
    !addressData.city ||
    !addressData.state ||
    !addressData.addressType
  ) {
    return res.json(
      new ApiResponse(400, null, "Missing required fields", false)
    );
  }

  const address = await AddressServices.createAddress(addressData);
  res.json(new ApiResponse(200, address, "Address created successfully", true));
});

const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const addressData = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(400, null, "Invalid address ID", false));
  }

  const address = await AddressServices.updateAddress(id, addressData);
  if (!address) {
    return res.json(new ApiResponse(404, null, "Address not found", false));
  }

  res.json(new ApiResponse(200, address, "Address updated successfully", true));
});

const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.json(new ApiResponse(400, null, "Invalid address ID", false));
  }

  const address = await AddressServices.deleteAddress(id);
  if (!address) {
    return res.json(new ApiResponse(404, null, "Address not found", false));
  }

  res.json(new ApiResponse(200, null, "Address deleted successfully", true));
});

module.exports = {
  getAllAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  getAddressByUserId,
};
