/**
 * Helper to convert Decimal128 to number
 */
const toNumber = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value.$numberDecimal) return parseFloat(value.$numberDecimal);
  if (value.toString && typeof value.toString === 'function') {
    const strValue = value.toString();
    if (strValue !== '[object Object]') {
      return parseFloat(strValue);
    }
  }
  return 0;
};

/**
 * Generate welcome email for new user
 * @param {Object} user - User object
 * @returns {string} HTML email content
 */
const generateWelcomeEmail = (user) => {
  const joinDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Welcome to Celic Store!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
              
              <!-- Header with Celebration -->
              <tr>
                <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 48px 32px; text-align: center;">
                  <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: -0.5px;">
                    Welcome to Celic Store!
                  </h1>
                  <p style="margin: 16px 0 0 0; color: #fce7f3; font-size: 16px; font-weight: 400;">
                    Your account has been created successfully
                  </p>
                </td>
              </tr>
              
              <!-- Welcome Message -->
              <tr>
                <td style="padding: 40px 32px 32px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #34d399 0%, #10b981 100%); color: white; padding: 12px 32px; border-radius: 50px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
                      ✓ Account Created
                    </div>
                  </div>
                  
                  <p style="margin: 0; font-size: 18px; color: #111827; text-align: center; line-height: 1.6;">
                    Hi <strong style="color: #ec4899;">${user.name || "there"}</strong>! 👋
                  </p>
                  <p style="margin: 16px 0 0 0; font-size: 15px; color: #6b7280; text-align: center; line-height: 1.7;">
                    Thank you for joining Celic Store! We're excited to have you as part of our community. Get ready to discover premium quality products curated just for you.
                  </p>
                </td>
              </tr>
              
              <!-- Account Details -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #f59e0b;">
                    <h3 style="margin: 0 0 16px 0; color: #78350f; font-size: 16px; font-weight: 700;">
                      📋 Your Account Details
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-size: 13px; width: 120px;">Name</td>
                        <td style="padding: 8px 0; color: #78350f; font-size: 14px; font-weight: 600;">${user.name || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-size: 13px;">Email</td>
                        <td style="padding: 8px 0; color: #78350f; font-size: 14px; font-weight: 600;">${user.email}</td>
                      </tr>
                      ${user.phone ? `
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-size: 13px;">Phone</td>
                        <td style="padding: 8px 0; color: #78350f; font-size: 14px; font-weight: 600;">${user.phone}</td>
                      </tr>
                      ` : ""}
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-size: 13px;">Joined</td>
                        <td style="padding: 8px 0; color: #78350f; font-size: 14px; font-weight: 600;">${joinDate}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              
              <!-- What's Next -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 22px; font-weight: 700; text-align: center;">
                    🚀 What's Next?
                  </h2>
                  
                  <!-- Feature Cards -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                    <tr>
                      <td style="padding: 0 8px 16px 0; width: 50%;">
                        <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; border-left: 4px solid #3b82f6; height: 100%;">
                          <div style="font-size: 28px; margin-bottom: 8px;">🛍️</div>
                          <div style="font-weight: 700; color: #1e40af; font-size: 15px; margin-bottom: 6px;">Start Shopping</div>
                          <p style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
                            Browse our curated collection of premium products
                          </p>
                        </div>
                      </td>
                      <td style="padding: 0 0 16px 8px; width: 50%;">
                        <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; border-left: 4px solid #10b981; height: 100%;">
                          <div style="font-size: 28px; margin-bottom: 8px;">🎁</div>
                          <div style="font-weight: 700; color: #065f46; font-size: 15px; margin-bottom: 6px;">Special Offers</div>
                          <p style="margin: 0; color: #047857; font-size: 13px; line-height: 1.5;">
                            Get exclusive deals on your favorite items
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 8px 0 0; width: 50%;">
                        <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b; height: 100%;">
                          <div style="font-size: 28px; margin-bottom: 8px;">📍</div>
                          <div style="font-weight: 700; color: #92400e; font-size: 15px; margin-bottom: 6px;">Save Addresses</div>
                          <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
                            Add your delivery addresses for faster checkout
                          </p>
                        </div>
                      </td>
                      <td style="padding: 0 0 0 8px; width: 50%;">
                        <div style="background-color: #fae8ff; border-radius: 12px; padding: 20px; border-left: 4px solid #a855f7; height: 100%;">
                          <div style="font-size: 28px; margin-bottom: 8px;">🔔</div>
                          <div style="font-weight: 700; color: #6b21a8; font-size: 15px; margin-bottom: 6px;">Track Orders</div>
                          <p style="margin: 0; color: #7e22ce; font-size: 13px; line-height: 1.5;">
                            Get real-time updates on your orders
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- CTA Button -->
              <tr>
                <td style="padding: 0 32px 32px; text-align: center;">
                  <a href="${process.env.APP_URL || 'http://localhost:5000'}/products" 
                     style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 6px 20px rgba(236, 72, 153, 0.4); letter-spacing: 0.3px;">
                    Start Shopping Now →
                  </a>
                </td>
              </tr>
              
              <!-- Benefits Section -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 28px; border: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 700; text-align: center;">
                      ✨ Why Shop With Us?
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="font-size: 24px; margin-right: 12px;">✓</div>
                            <div>
                              <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">Premium Quality</div>
                              <div style="color: #6b7280; font-size: 13px;">Carefully curated products from trusted brands</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="font-size: 24px; margin-right: 12px;">🚚</div>
                            <div>
                              <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">Fast Delivery</div>
                              <div style="color: #6b7280; font-size: 13px;">Quick and reliable shipping to your doorstep</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="font-size: 24px; margin-right: 12px;">🔒</div>
                            <div>
                              <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">Secure Payments</div>
                              <div style="color: #6b7280; font-size: 13px;">Safe and encrypted payment processing</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <div style="display: flex; align-items: flex-start;">
                            <div style="font-size: 24px; margin-right: 12px;">💬</div>
                            <div>
                              <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">24/7 Support</div>
                              <div style="color: #6b7280; font-size: 13px;">Our team is always here to help you</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              
              <!-- Help Section -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <div style="background-color: #eff6ff; border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6; text-align: center;">
                    <div style="font-weight: 700; color: #1e40af; font-size: 16px; margin-bottom: 8px;">
                      💡 Need Help Getting Started?
                    </div>
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                      Check out our help center or contact our support team. We're here to make your shopping experience amazing!
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #111827; padding: 36px 32px; text-align: center;">
                  <div style="margin-bottom: 24px;">
                    <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 24px; font-weight: 700;">Celic Store</h3>
                    <p style="margin: 0; color: #9ca3af; font-size: 14px;">Premium Quality Products, Delivered With Care</p>
                  </div>
                  
                  <div style="margin: 28px 0; padding: 24px 0; border-top: 1px solid #374151; border-bottom: 1px solid #374151;">
                    <p style="margin: 0 0 12px 0; color: #d1d5db; font-size: 14px; font-weight: 600;">Connect With Us</p>
                    <div style="margin-top: 16px;">
                      <a href="#" style="display: inline-block; margin: 0 10px; color: #9ca3af; text-decoration: none; font-size: 28px;">📘</a>
                      <a href="#" style="display: inline-block; margin: 0 10px; color: #9ca3af; text-decoration: none; font-size: 28px;">📷</a>
                      <a href="#" style="display: inline-block; margin: 0 10px; color: #9ca3af; text-decoration: none; font-size: 28px;">🐦</a>
                      <a href="#" style="display: inline-block; margin: 0 10px; color: #9ca3af; text-decoration: none; font-size: 28px;">💼</a>
                    </div>
                  </div>
                  
                  <p style="margin: 20px 0 8px 0; color: #9ca3af; font-size: 13px;">
                    © ${new Date().getFullYear()} Celic Store. All rights reserved.
                  </p>
                  <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px;">
                    You're receiving this because you created an account at Celic Store
                  </p>
                  <p style="margin: 16px 0 0 0;">
                    <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Privacy Policy</a>
                    <span style="color: #4b5563;">•</span>
                    <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Terms</a>
                    <span style="color: #4b5563;">•</span>
                    <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Unsubscribe</a>
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

module.exports = {
  generateWelcomeEmail,
};

