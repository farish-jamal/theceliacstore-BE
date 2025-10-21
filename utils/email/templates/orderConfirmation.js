/**
 * Helper to convert Decimal128 to number
 */
const toNumber = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  // Handle Decimal128 object format: { '$numberDecimal': '150' }
  if (value.$numberDecimal) return parseFloat(value.$numberDecimal);
  // Handle regular toString
  if (value.toString && typeof value.toString === 'function') {
    const strValue = value.toString();
    if (strValue !== '[object Object]') {
      return parseFloat(strValue);
    }
  }
  return 0;
};

/**
 * Generate order confirmation email for customer
 * @param {Object} order - Order object
 * @param {Object} user - User object
 * @returns {string} HTML email content
 */
const generateCustomerOrderConfirmation = (order, user) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const orderTime = new Date(order.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemsHTML = order.items
    .map(
      (item) => {
        const itemName = item.type === "product" ? item.product.name : item.bundle.name;
        const itemPrice = toNumber(item.discounted_total_amount);
        const unitPrice = item.quantity > 0 ? itemPrice / item.quantity : 0;
        
        return `
        <tr>
          <td style="padding: 16px 12px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: flex-start;">
              <div style="flex: 1;">
                <div style="font-weight: 600; color: #111827; font-size: 15px; margin-bottom: 4px;">
                  ${itemName}
                </div>
                <div style="color: #6b7280; font-size: 13px;">
                  ${item.type === "product" ? "Product" : "Bundle"} • Qty: ${item.quantity}
                </div>
                <div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">
                  ₹${unitPrice.toFixed(2)} each
                </div>
              </div>
              <div style="font-weight: 600; color: #111827; font-size: 15px; white-space: nowrap;">
                ₹${itemPrice.toFixed(2)}
              </div>
            </div>
          </td>
        </tr>
      `;
      }
    )
    .join("");

  const subtotal = toNumber(order.discountedTotalAmount);
  const shipping = toNumber(order.shippingCost);
  const total = toNumber(order.finalTotalAmount);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Order Confirmation - Celic Store</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 32px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                    ✓ Order Confirmed
                  </h1>
                  <p style="margin: 12px 0 0 0; color: #e0e7ff; font-size: 16px; font-weight: 400;">
                    Thank you for your purchase!
                  </p>
                </td>
              </tr>
              
              <!-- Success Badge -->
              <tr>
                <td style="padding: 32px 32px 24px; text-align: center;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 28px; border-radius: 50px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                    ✓ Your order has been received
                  </div>
                </td>
              </tr>
              
              <!-- Greeting -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6;">
                    Hi <strong style="color: #111827;">${user.name || "there"}</strong>,
                  </p>
                  <p style="margin: 12px 0 0 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                    We're getting your order ready! You'll receive a shipping confirmation email with tracking information once your items are on the way.
                  </p>
                </td>
              </tr>
              
              <!-- Order Summary Card -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%">
                          <div style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 4px;">Order Number</div>
                          <div style="font-size: 16px; color: #78350f; font-weight: 700; font-family: 'Courier New', monospace;">#${order._id.toString().slice(-8).toUpperCase()}</div>
                        </td>
                        <td width="50%" align="right">
                          <div style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 4px;">Order Date</div>
                          <div style="font-size: 15px; color: #78350f; font-weight: 600;">${orderDate}</div>
                          <div style="font-size: 13px; color: #a16207;">${orderTime}</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              
              <!-- Order Items -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #111827; font-weight: 700;">
                    Order Items
                  </h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <tbody>
                      ${itemsHTML}
                    </tbody>
                  </table>
                </td>
              </tr>
              
              <!-- Order Total -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">Subtotal</td>
                        <td align="right" style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">₹${subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 15px;">
                          Shipping
                          ${shipping === 0 ? '<span style="color: #10b981; font-weight: 600; font-size: 12px; margin-left: 8px;">FREE</span>' : ''}
                        </td>
                        <td align="right" style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">
                          ${shipping === 0 ? '<span style="color: #10b981; font-weight: 600;">FREE</span>' : `₹${shipping.toFixed(2)}`}
                        </td>
                      </tr>
                      <tr style="border-top: 2px solid #d1d5db;">
                        <td style="padding: 16px 0 4px 0; color: #111827; font-size: 18px; font-weight: 700;">Total</td>
                        <td align="right" style="padding: 16px 0 4px 0;">
                          <div style="font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">₹${total.toFixed(2)}</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              
              <!-- Shipping Address -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #111827; font-weight: 700;">
                    📍 Delivery Address
                  </h2>
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
                    <div style="font-weight: 600; color: #111827; font-size: 16px; margin-bottom: 8px;">${order.address.name}</div>
                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">
                      ${order.address.address}<br>
                      ${order.address.locality}<br>
                      ${order.address.city}, ${order.address.state} - ${order.address.pincode}
                    </div>
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                      <strong>Phone:</strong> ${order.address.mobile}
                    </div>
                  </div>
                </td>
              </tr>
              
              <!-- CTA Button -->
              <tr>
                <td style="padding: 0 32px 32px; text-align: center;">
                  <a href="${process.env.APP_URL || 'http://localhost:5000'}/orders/${order._id}" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4); transition: all 0.3s;">
                    Track Your Order →
                  </a>
                </td>
              </tr>
              
              <!-- Help Section -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; border-left: 4px solid #3b82f6;">
                    <div style="font-weight: 600; color: #1e40af; font-size: 15px; margin-bottom: 8px;">
                      💬 Need Help?
                    </div>
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                      Our customer support team is here to help. Contact us anytime if you have questions about your order.
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #111827; padding: 32px; text-align: center;">
                  <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 12px 0; color: #ffffff; font-size: 22px; font-weight: 700;">Celic Store</h3>
                    <p style="margin: 0; color: #9ca3af; font-size: 14px;">Premium Quality Products</p>
                  </div>
                  
                  <div style="margin: 24px 0; padding: 20px 0; border-top: 1px solid #374151; border-bottom: 1px solid #374151;">
                    <p style="margin: 0 0 8px 0; color: #d1d5db; font-size: 13px;">Follow us on social media</p>
                    <div style="margin-top: 12px;">
                      <a href="#" style="display: inline-block; margin: 0 8px; color: #9ca3af; text-decoration: none; font-size: 24px;">📘</a>
                      <a href="#" style="display: inline-block; margin: 0 8px; color: #9ca3af; text-decoration: none; font-size: 24px;">📷</a>
                      <a href="#" style="display: inline-block; margin: 0 8px; color: #9ca3af; text-decoration: none; font-size: 24px;">🐦</a>
                    </div>
                  </div>
                  
                  <p style="margin: 16px 0 8px 0; color: #9ca3af; font-size: 13px;">
                    © ${new Date().getFullYear()} Celic Store. All rights reserved.
                  </p>
                  <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px;">
                    This email was sent to ${user.email}
                  </p>
                  <p style="margin: 12px 0 0 0;">
                    <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Privacy Policy</a>
                    <span style="color: #4b5563;">•</span>
                    <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Terms of Service</a>
                    <span style="color: #4b5563;">•</span>
                    <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Contact Us</a>
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

/**
 * Generate order confirmation email for company
 * @param {Object} order - Order object
 * @param {Object} user - User object
 * @returns {string} HTML email content
 */
const generateCompanyOrderNotification = (order, user) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const orderTime = new Date(order.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemsHTML = order.items
    .map(
      (item) => {
        const itemName = item.type === "product" ? item.product.name : item.bundle.name;
        const itemPrice = toNumber(item.discounted_total_amount);
        
        return `
        <tr>
          <td style="padding: 14px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">
              ${itemName}
            </div>
            <div style="color: #6b7280; font-size: 12px;">
              ${item.type === "product" ? "📦 Product" : "🎁 Bundle"}
            </div>
          </td>
          <td style="padding: 14px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151; font-weight: 500;">
            × ${item.quantity}
          </td>
          <td style="padding: 14px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 600;">
            ₹${itemPrice.toFixed(2)}
          </td>
        </tr>
      `;
      }
    )
    .join("");

  const subtotal = toNumber(order.discountedTotalAmount);
  const shipping = toNumber(order.shippingCost);
  const total = toNumber(order.finalTotalAmount);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Alert - Celic Store Admin</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
              
              <!-- Alert Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px; text-align: center;">
                  <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 12px; border-radius: 50%; margin-bottom: 12px;">
                    <span style="font-size: 40px;">🛒</span>
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                    New Order Alert
                  </h1>
                  <p style="margin: 8px 0 0 0; color: #fecaca; font-size: 14px;">
                    Action Required - Process Order
                  </p>
                </td>
              </tr>
              
              <!-- Urgent Notice -->
              <tr>
                <td style="padding: 24px 32px;">
                  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%">
                          <div style="font-size: 11px; color: #92400e; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 6px;">⚡ Order ID</div>
                          <div style="font-size: 18px; color: #78350f; font-weight: 800; font-family: 'Courier New', monospace;">#${order._id.toString().slice(-8).toUpperCase()}</div>
                        </td>
                        <td width="50%" align="right">
                          <div style="font-size: 11px; color: #92400e; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 6px;">💰 Total</div>
                          <div style="font-size: 24px; color: #78350f; font-weight: 800;">₹${total.toFixed(2)}</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              
              <!-- Customer Info -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
                      👤 Customer Information
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 100px;">Name</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${user.name || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Email</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                          <a href="mailto:${user.email}" style="color: #3b82f6; text-decoration: none;">${user.email || "N/A"}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Phone</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                          <a href="tel:${order.address.mobile}" style="color: #3b82f6; text-decoration: none;">${order.address.mobile}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Order Date</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${orderDate} at ${orderTime}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              
              <!-- Order Items -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 700;">
                    📦 Order Items
                  </h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: #f9fafb;">
                        <th style="padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">Item</th>
                        <th style="padding: 12px 14px; text-align: center; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">Qty</th>
                        <th style="padding: 12px 14px; text-align: right; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHTML}
                    </tbody>
                  </table>
                </td>
              </tr>
              
              <!-- Pricing Breakdown -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
                        <td align="right" style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 500;">₹${subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          Shipping ${order.shippingDetails?.isManual ? '<span style="color: #f59e0b; font-weight: 600; font-size: 11px;">(MANUAL)</span>' : '<span style="color: #10b981; font-size: 11px;">(AUTO)</span>'}
                        </td>
                        <td align="right" style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 500;">₹${shipping.toFixed(2)}</td>
                      </tr>
                      <tr style="border-top: 2px solid #d1d5db;">
                        <td style="padding: 16px 0 4px 0; color: #111827; font-size: 16px; font-weight: 700;">Total Amount</td>
                        <td align="right" style="padding: 16px 0 4px 0;">
                          <div style="font-size: 24px; font-weight: 800; color: #dc2626;">₹${total.toFixed(2)}</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              
              <!-- Shipping Address -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 700;">
                    📍 Shipping Address
                  </h3>
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
                    <div style="font-weight: 700; color: #111827; font-size: 15px; margin-bottom: 12px;">${order.address.name}</div>
                    <div style="color: #4b5563; font-size: 14px; line-height: 1.7;">
                      ${order.address.address}<br>
                      ${order.address.locality}<br>
                      ${order.address.city}, ${order.address.state} - <strong>${order.address.pincode}</strong>
                    </div>
                    ${order.address.landmark ? `<div style="color: #6b7280; font-size: 13px; margin-top: 8px;">Landmark: ${order.address.landmark}</div>` : ""}
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                      <div style="color: #374151; font-size: 14px; margin-bottom: 6px;">
                        <strong>📞 Primary:</strong> <a href="tel:${order.address.mobile}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">${order.address.mobile}</a>
                      </div>
                      ${order.address.alternatePhone ? `
                      <div style="color: #374151; font-size: 14px;">
                        <strong>📱 Alternate:</strong> <a href="tel:${order.address.alternatePhone}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">${order.address.alternatePhone}</a>
                      </div>
                      ` : ""}
                    </div>
                  </div>
                </td>
              </tr>
              
              ${order.shippingDetails ? `
              <!-- Shipping Details -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background-color: #eff6ff; border-radius: 12px; padding: 18px; border-left: 4px solid #3b82f6;">
                    <h4 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      🚚 Shipping Details
                    </h4>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #1e3a8a; font-size: 13px;">Zone</td>
                        <td align="right" style="padding: 6px 0; color: #1e40af; font-size: 13px; font-weight: 600;">${order.shippingDetails.zoneName || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #1e3a8a; font-size: 13px;">Pricing</td>
                        <td align="right" style="padding: 6px 0; color: #1e40af; font-size: 13px; font-weight: 600;">${order.shippingDetails.pricingType || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #1e3a8a; font-size: 13px;">Override</td>
                        <td align="right" style="padding: 6px 0;">
                          ${order.shippingDetails.isManual 
                            ? '<span style="background-color: #fbbf24; color: #78350f; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700;">MANUAL</span>' 
                            : '<span style="background-color: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700;">AUTO</span>'
                          }
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              ` : ""}
              
              <!-- Action Required -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #ef4444; text-align: center;">
                    <div style="font-size: 18px; font-weight: 700; color: #991b1b; margin-bottom: 8px;">
                      ⚡ Action Required
                    </div>
                    <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                      Please process this order and update the status in the admin panel
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Quick Stats -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="33%" style="text-align: center; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 4px;">${order.items.length}</div>
                        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Items</div>
                      </td>
                      <td width="4%"></td>
                      <td width="33%" style="text-align: center; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 4px;">${order.items.reduce((sum, item) => sum + item.quantity, 0)}</div>
                        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Qty</div>
                      </td>
                      <td width="4%"></td>
                      <td width="33%" style="text-align: center; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
                        <div style="font-size: 20px; font-weight: 800; color: #dc2626; margin-bottom: 4px;">${order.status.toUpperCase()}</div>
                        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Status</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Order Items Section -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 700;">Order Items</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: #f9fafb;">
                        <th style="padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                        <th style="padding: 12px 14px; text-align: center; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Quantity</th>
                        <th style="padding: 12px 14px; text-align: right; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHTML}
                    </tbody>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    This is an automated notification from Celic Store Admin System
                  </p>
                  <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 11px;">
                    Sent at ${new Date().toLocaleString()} • Order Management System
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
  generateCustomerOrderConfirmation,
  generateCompanyOrderNotification,
};

