const { asyncHandler } = require("../../../common/asyncHandler");
const User = require("../../../models/userModel");
const ApiResponse = require("../../../utils/ApiResponse");
const { generateAccessToken } = require("../../../utils/auth");
const { sendWelcomeEmail, sendForgotPasswordEmail } = require("../../../utils/email/directEmailService");
const crypto = require("crypto");

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

  // Send welcome email asynchronously (non-blocking)
  setImmediate(async () => {
    try {
      await sendWelcomeEmail({
        user: user.toObject(),
      });
    } catch (error) {
      console.error("❌ Failed to send welcome email:", error.message);
    }
  });


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
  const { name, email, phone } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found", false));
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;

  await user.save();
  const updatedUser = await User.findById(id).select("-password");

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

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Email is required", false));
  }

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, null, "User not found with this email", false)
      );
  }

  // Generate a random secure password (8 characters: alphanumeric + special chars)
  const newPassword =
    crypto.randomBytes(4).toString("hex") +
    String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
    "!";

  // Update user password (will be hashed by pre-save hook in model)
  user.password = newPassword;
  await user.save();

  console.log(`[Forgot Password] Password reset for user: ${user.email}`);

  // Send forgot password email asynchronously (non-blocking)
  setImmediate(async () => {
    try {
      await sendForgotPasswordEmail({
        user: user.toObject(),
        newPassword: newPassword, // Send plain password in email (only once)
      });
    } catch (error) {
      console.error("❌ Failed to send forgot password email:", error.message);
    }
  });


  console.log(`[Forgot Password] Email queued for: ${user.email}`);

  res.json(
    new ApiResponse(
      200,
      null,
      "Password reset successful! Check your email for the new password.",
      true
    )
  );
});

module.exports = {
  getAllUsers,
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  getUserById,
  forgotPassword,
};
