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
 * Get status color and message
 */
const getStatusInfo = (status) => {
  const statusMap = {
    pending: {
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
      bgColor: "#fef3c7",
      icon: "⏳",
      emoji: "⏰",
      title: "Order Pending",
      message: "We've received your order and it's awaiting confirmation.",
    },
    confirmed: {
      color: "#3b82f6",
      gradient: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
      bgColor: "#dbeafe",
      icon: "✓",
      emoji: "✅",
      title: "Order Confirmed",
      message: "Great news! Your order has been confirmed and will be processed soon.",
    },
    processing: {
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
      bgColor: "#ede9fe",
      icon: "⚙️",
      emoji: "📦",
      title: "Processing",
      message: "We're carefully preparing your items for shipment.",
    },
    shipped: {
      color: "#06b6d4",
      gradient: "linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)",
      bgColor: "#cffafe",
      icon: "🚚",
      emoji: "🚀",
      title: "Shipped",
      message: "Your order is on its way! Track your package below.",
    },
    delivered: {
      color: "#10b981",
      gradient: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
      bgColor: "#d1fae5",
      icon: "✅",
      emoji: "🎉",
      title: "Delivered",
      message: "Success! Your order has been delivered. Enjoy your purchase!",
    },
    cancelled: {
      color: "#ef4444",
      gradient: "linear-gradient(135deg, #f87171 0%, #ef4444 100%)",
      bgColor: "#fee2e2",
      icon: "❌",
      emoji: "🔴",
      title: "Cancelled",
      message: "Your order has been cancelled. If you have questions, please contact support.",
    },
  };

  return statusMap[status] || statusMap.pending;
};

/**
 * Generate order status update email for customer
 * @param {Object} order - Order object
 * @param {Object} user - User object
 * @param {string} previousStatus - Previous order status
 * @returns {string} HTML email content
 */
const generateCustomerStatusUpdate = (order, user, previousStatus) => {
  const statusInfo = getStatusInfo(order.status);
  const prevStatusInfo = getStatusInfo(previousStatus);
  const updateDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const updateTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const total = toNumber(order.finalTotalAmount);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update - ${statusInfo.title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
              
              <!-- Header with Status Icon -->
              <tr>
                <td style="background: ${statusInfo.gradient}; padding: 40px 32px; text-align: center;">
                  <div style="background-color: rgba(255,255,255,0.3); display: inline-block; padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                    <span style="font-size: 48px;">${statusInfo.emoji}</span>
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                    ${statusInfo.title}
                  </h1>
                  <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                    Order #${order._id.toString().slice(-8).toUpperCase()}
                  </p>
                </td>
              </tr>
              
              <!-- Status Transition -->
              <tr>
                <td style="padding: 32px 32px 24px;">
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 28px; text-align: center;">
                    <div style="font-size: 13px; color: #6b7280; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Status Update</div>
                    <div style="display: inline-block; background-color: #e5e7eb; color: #374151; padding: 10px 20px; border-radius: 50px; font-size: 14px; font-weight: 600; margin: 0 8px;">
                      ${prevStatusInfo.icon} ${previousStatus.toUpperCase()}
                    </div>
                    <div style="display: inline-block; margin: 0 12px; font-size: 24px; color: ${statusInfo.color};">
                      →
                    </div>
                    <div style="display: inline-block; background: ${statusInfo.gradient}; color: #ffffff; padding: 10px 20px; border-radius: 50px; font-size: 14px; font-weight: 700; margin: 0 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                      ${statusInfo.icon} ${order.status.toUpperCase()}
                    </div>
                  </div>
                </td>
              </tr>
              
              <!-- Main Message -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background-color: ${statusInfo.bgColor}; border-radius: 12px; padding: 24px; border-left: 4px solid ${statusInfo.color};">
                    <p style="margin: 0; font-size: 16px; color: #111827; line-height: 1.6;">
                      <strong>Hi ${user.name || "there"},</strong>
                    </p>
                    <p style="margin: 12px 0 0 0; font-size: 15px; color: #374151; line-height: 1.7;">
                      ${statusInfo.message}
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Order Summary -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%">
                          <div style="font-size: 11px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 4px;">Order ID</div>
                          <div style="font-size: 16px; color: #78350f; font-weight: 700; font-family: 'Courier New', monospace;">#${order._id.toString().slice(-8).toUpperCase()}</div>
                        </td>
                        <td width="50%" align="right">
                          <div style="font-size: 11px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 4px;">Total Amount</div>
                          <div style="font-size: 20px; color: #78350f; font-weight: 800;">₹${total.toFixed(2)}</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              
              <!-- Delivery Address -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 700;">
                    📍 Delivery Address
                  </h3>
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
                    <div style="font-weight: 700; color: #111827; font-size: 15px; margin-bottom: 8px;">${order.address.name}</div>
                    <div style="color: #4b5563; font-size: 14px; line-height: 1.7;">
                      ${order.address.address}<br>
                      ${order.address.locality}<br>
                      ${order.address.city}, ${order.address.state} - ${order.address.pincode}
                    </div>
                  </div>
                </td>
              </tr>
              
              ${order.status === "delivered" ? `
              <!-- Delivered Success Message -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #10b981; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
                    <div style="font-size: 18px; font-weight: 700; color: #065f46; margin-bottom: 8px;">
                      Thank You for Shopping With Us!
                    </div>
                    <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.6;">
                      We hope you love your purchase! Your satisfaction is our top priority. If you have any questions or concerns, we're here to help.
                    </p>
                  </div>
                </td>
              </tr>
              ` : ""}
              
              ${order.status === "shipped" ? `
              <!-- Tracking Info -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #06b6d4;">
                    <div style="font-size: 16px; font-weight: 700; color: #164e63; margin-bottom: 12px;">
                      📦 Your Package is On The Way!
                    </div>
                    <p style="margin: 0; color: #155e75; font-size: 14px; line-height: 1.6;">
                      Your order has been shipped and will arrive soon. You can track your package or contact us if you have any questions.
                    </p>
                  </div>
                </td>
              </tr>
              ` : ""}
              
              ${order.status === "cancelled" ? `
              <!-- Cancellation Message -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #ef4444;">
                    <div style="font-size: 16px; font-weight: 700; color: #991b1b; margin-bottom: 8px;">
                      Order Cancelled
                    </div>
                    <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                      If you have any questions about the cancellation or need assistance, please don't hesitate to contact our support team.
                    </p>
                  </div>
                </td>
              </tr>
              ` : ""}
              
              <!-- CTA Button -->
              ${order.status !== "cancelled" ? `
              <tr>
                <td style="padding: 0 32px 32px; text-align: center;">
                  <a href="${process.env.APP_URL || 'http://localhost:5000'}/orders/${order._id}" 
                     style="display: inline-block; background: ${statusInfo.gradient}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
                    View Order Details →
                  </a>
                </td>
              </tr>
              ` : ""}
              
              <!-- Help Section -->
              <tr>
                <td style="padding: 0 32px 32px;">
                  <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; border-left: 4px solid #3b82f6;">
                    <div style="font-weight: 600; color: #1e40af; font-size: 15px; margin-bottom: 8px;">
                      💬 Need Assistance?
                    </div>
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                      Our customer support team is available 24/7. Feel free to reach out anytime!
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #111827; padding: 32px; text-align: center;">
                  <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 8px 0; color: #ffffff; font-size: 20px; font-weight: 700;">Celic Store</h3>
                    <p style="margin: 0; color: #9ca3af; font-size: 13px;">Premium Quality Products</p>
                  </div>
                  
                  <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 12px;">
                    Updated on ${updateDate} at ${updateTime}
                  </p>
                  <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 11px;">
                    © ${new Date().getFullYear()} Celic Store. All rights reserved.
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
 * Generate order status update email for company
 * @param {Object} order - Order object
 * @param {Object} user - User object
 * @param {string} previousStatus - Previous order status
 * @param {Object} updatedBy - Admin who updated the status
 * @returns {string} HTML email content
 */
const generateCompanyStatusUpdate = (order, user, previousStatus, updatedBy) => {
  const statusInfo = getStatusInfo(order.status);
  const prevStatusInfo = getStatusInfo(previousStatus);
  const updateDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const updateTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const total = toNumber(order.finalTotalAmount);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Status Update - Admin Notification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden; max-width: 600px;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 32px; text-align: center;">
                  <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 12px; border-radius: 50%; margin-bottom: 12px;">
                    <span style="font-size: 36px;">📝</span>
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                    Order Status Updated
                  </h1>
                  <p style="margin: 8px 0 0 0; color: #c7d2fe; font-size: 14px;">
                    Internal Admin Notification
                  </p>
                </td>
              </tr>
              
              <!-- Status Transition -->
              <tr>
                <td style="padding: 28px 32px;">
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #e5e7eb;">
                    <div style="font-size: 12px; color: #6b7280; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Status Transition</div>
                    <div>
                      <div style="display: inline-block; background-color: #e5e7eb; color: #4b5563; padding: 10px 24px; border-radius: 50px; font-size: 13px; font-weight: 600;">
                        ${prevStatusInfo.icon} ${previousStatus.toUpperCase()}
                      </div>
                      <div style="display: inline-block; margin: 0 16px; font-size: 24px; color: #6366f1;">
                        →
                      </div>
                      <div style="display: inline-block; background: ${statusInfo.gradient}; color: #ffffff; padding: 10px 24px; border-radius: 50px; font-size: 13px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                        ${statusInfo.icon} ${order.status.toUpperCase()}
                      </div>
                    </div>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                      <div style="font-size: 13px; color: #6b7280;">
                        <strong>Updated:</strong> ${updateDate} at ${updateTime}
                      </div>
                      ${updatedBy ? `
                      <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
                        <strong>By:</strong> ${updatedBy.name || updatedBy.email || "System Admin"}
                      </div>
                      ` : ""}
                    </div>
                  </div>
                </td>
              </tr>
              
              <!-- Order Details -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b;">
                    <h3 style="margin: 0 0 16px 0; color: #78350f; font-size: 16px; font-weight: 700;">
                      📋 Order Summary
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #92400e; font-size: 13px;">Order ID</td>
                        <td align="right" style="padding: 6px 0; color: #78350f; font-size: 13px; font-weight: 700; font-family: 'Courier New', monospace;">#${order._id.toString().slice(-8).toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #92400e; font-size: 13px;">Total Amount</td>
                        <td align="right" style="padding: 6px 0; color: #78350f; font-size: 18px; font-weight: 800;">₹${total.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #92400e; font-size: 13px;">Current Status</td>
                        <td align="right" style="padding: 6px 0;">
                          <span style="background: ${statusInfo.gradient}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700;">${order.status.toUpperCase()}</span>
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
                    <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 700;">
                      👤 Customer Details
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 100px;">Name</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${user.name || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Email</td>
                        <td style="padding: 8px 0;">
                          <a href="mailto:${user.email}" style="color: #3b82f6; text-decoration: none; font-size: 14px; font-weight: 500;">${user.email || "N/A"}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Phone</td>
                        <td style="padding: 8px 0;">
                          <a href="tel:${order.address.mobile}" style="color: #3b82f6; text-decoration: none; font-size: 14px; font-weight: 500;">${order.address.mobile}</a>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              
              <!-- Shipping Address -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 700;">
                      📍 Shipping Address
                    </h3>
                    <div style="color: #4b5563; font-size: 14px; line-height: 1.7;">
                      <strong style="color: #111827;">${order.address.name}</strong><br>
                      ${order.address.address}<br>
                      ${order.address.locality}<br>
                      ${order.address.city}, ${order.address.state} - <strong>${order.address.pincode}</strong>
                    </div>
                  </div>
                </td>
              </tr>
              
              ${order.status === "delivered" ? `
              <!-- Completed Notice -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #10b981; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                    <div style="font-size: 16px; font-weight: 700; color: #065f46;">
                      Order Successfully Delivered
                    </div>
                    <p style="margin: 8px 0 0 0; color: #047857; font-size: 13px;">
                      This order has been completed and delivered to the customer.
                    </p>
                  </div>
                </td>
              </tr>
              ` : ""}
              
              ${order.status === "cancelled" ? `
              <!-- Cancelled Warning -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #ef4444; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">❌</div>
                    <div style="font-size: 16px; font-weight: 700; color: #991b1b;">
                      Order Cancelled
                    </div>
                    <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 13px;">
                      Please review the cancellation and take any necessary follow-up actions.
                    </p>
                  </div>
                </td>
              </tr>
              ` : ""}
              
              ${order.status === "pending" || order.status === "confirmed" || order.status === "processing" ? `
              <!-- Action Reminder -->
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; border-left: 4px solid #3b82f6; text-align: center;">
                    <div style="font-size: 15px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">
                      ⚡ Next Steps
                    </div>
                    <p style="margin: 0; color: #1e3a8a; font-size: 13px;">
                      Please continue processing this order and update to the next status when ready.
                    </p>
                  </div>
                </td>
              </tr>
              ` : ""}
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 500;">
                    Celic Store Admin System
                  </p>
                  <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 11px;">
                    Automated notification • ${updateDate} ${updateTime}
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
  generateCustomerStatusUpdate,
  generateCompanyStatusUpdate,
  getStatusInfo,
};

