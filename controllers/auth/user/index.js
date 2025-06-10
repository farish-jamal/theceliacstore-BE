const { asyncHandler } = require("../../../common/asyncHandler");
const User = require("../../../models/userModel");
const ApiResponse = require("../../../utils/ApiResponse");
const { generateAccessToken } = require("../../../utils/auth");

const getAllUsers = asyncHandler(async (req, res) => {
  const superAdminId = req.admin._id;

  if (!superAdminId) {
    return res.json(new ApiResponse(404, null, "Not authorized"));
  }

  const { search, page, per_page = 50 } = req.query;

  const filters = {
    ...(search && {
      name: { $regex: search, $options: "i" },
      email: { $regex: search, $options: "i" },
    }),
  };

  const skip = (page - 1) * per_page;

  const users = await User.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(per_page)
    .select("-password");

  res.json(new ApiResponse(200, users, "Users fetched successfully", true));
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const userExists = await User.findOne({ email });
  const phoneExists = await User.findOne({ phone });

  if (userExists) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "User already exists", false));
  }

  if (phoneExists) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Phone number already exists", false));
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
  });

  const accessToken = generateAccessToken(user._id);

  const data = {
    id: user.id,
    name: user.name,
    email: user.email,
    token: accessToken,
  };

  res.json(new ApiResponse(201, data, "New user created successfully", true));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Invalid credentials", false));
  }

  const accessToken = generateAccessToken(user._id);

  const data = {
    id: user.id,
    name: user.name,
    email: user.email,
    token: accessToken,
    phone: user.phone,
  };

  res.json(new ApiResponse(200, data, "User login successful", true));
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }

  if (name) user.name = name;
  if (email) user.email = email;

  await user.save();
  const updatedUser = await User.findById(id);

  res.json(
    new ApiResponse(200, updatedUser, "User updated successfully", true)
  );
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }

  await user.deleteOne();

  res.json(new ApiResponse(200, null, "User deleted successfully", true));
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password");
  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }

  res.json(new ApiResponse(200, user, "User fetched successfully", true));
});

module.exports = {
  getAllUsers,
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  getUserById,
};
