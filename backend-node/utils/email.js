const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD) {
    console.warn('SMTP not configured');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Send email
const sendEmail = async (to, subject, html) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('SMTP not configured, skipping email');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Send inquiry notification to admin
const sendInquiryNotification = async (inquiry) => {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) return;

  const equipmentList = (inquiry.equipment || []).join(', ');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1A1D23; color: white; padding: 20px; text-align: center; }
            .header h1 { margin: 0; color: #E63946; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #1A1D23; }
            .value { color: #555; }
            .equipment { background-color: #E63946; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin: 2px; }
            .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
            .cta { background-color: #E63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; display: inline-block; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>REVMA HIRE</h1>
                <p>New Equipment Hire Enquiry</p>
            </div>
            <div class="content">
                <h2>Customer Details</h2>
                <div class="field">
                    <span class="label">Name:</span>
                    <span class="value">${inquiry.first_name} ${inquiry.last_name}</span>
                </div>
                <div class="field">
                    <span class="label">Email:</span>
                    <span class="value">${inquiry.email}</span>
                </div>
                <div class="field">
                    <span class="label">Phone:</span>
                    <span class="value">${inquiry.phone}</span>
                </div>
                ${inquiry.is_business ? `<div class="field"><span class="label">Company:</span> <span class="value">${inquiry.company_name || ''}</span></div>` : ''}
                ${inquiry.abn ? `<div class="field"><span class="label">ABN:</span> <span class="value">${inquiry.abn}</span></div>` : ''}
                
                <h2>Equipment Required</h2>
                <div class="field">
                    ${(inquiry.equipment || []).map(eq => `<span class="equipment">${eq}</span>`).join('')}
                </div>
                
                <h2>Hire Details</h2>
                <div class="field">
                    <span class="label">Start Date:</span>
                    <span class="value">${inquiry.hire_start_date}</span>
                </div>
                <div class="field">
                    <span class="label">End Date:</span>
                    <span class="value">${inquiry.hire_end_date}</span>
                </div>
                <div class="field">
                    <span class="label">Preferred Rate:</span>
                    <span class="value">${(inquiry.hire_rate_preference || '').charAt(0).toUpperCase() + (inquiry.hire_rate_preference || '').slice(1)}</span>
                </div>
                <div class="field">
                    <span class="label">Delivery Method:</span>
                    <span class="value">${(inquiry.delivery_method || '').charAt(0).toUpperCase() + (inquiry.delivery_method || '').slice(1)}</span>
                </div>
                ${inquiry.delivery_address ? `<div class="field"><span class="label">Delivery Address:</span> <span class="value">${inquiry.delivery_address}</span></div>` : ''}
                
                <h2>Job Description</h2>
                <p>${inquiry.job_description || ''}</p>
                
                ${inquiry.additional_notes ? `<h2>Additional Notes</h2><p>${inquiry.additional_notes}</p>` : ''}
                
                <p style="text-align: center; margin-top: 20px;">
                    <a href="mailto:${inquiry.email}" class="cta">Reply to Customer</a>
                    <a href="tel:${inquiry.phone}" class="cta" style="background-color: #1A1D23;">Call Customer</a>
                </p>
            </div>
            <div class="footer">
                <p>This notification was sent from the Revma Equipment Hire Portal</p>
                <p>Revma Pty Ltd | ABN: 37 121 035 710 | 0448 473 862</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const subject = `New Hire Enquiry: ${inquiry.first_name} ${inquiry.last_name} - ${equipmentList}`;
  await sendEmail(notificationEmail, subject, html);
};

// Send quote to customer
const sendQuoteToCustomer = async (quote) => {
  const customerEmail = quote.customer_email;
  if (!customerEmail) return;

  const quoteUrl = `${process.env.FRONTEND_URL}/quote/${quote.id}?token=${quote.access_token}`;

  const itemsHtml = (quote.line_items || []).map(item => `
    <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.machine_name || ''}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${(item.rate_type || '').charAt(0).toUpperCase() + (item.rate_type || '').slice(1)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.rate || 0).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.subtotal || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background-color: #1A1D23; color: white; padding: 30px; text-align: center; }
            .header img { max-height: 60px; }
            .header h1 { margin: 10px 0 0 0; color: #E63946; font-size: 24px; }
            .content { padding: 30px; background-color: #ffffff; }
            .quote-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .quote-number { color: #E63946; font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #1A1D23; color: white; padding: 12px; text-align: left; }
            .totals { background-color: #f8f9fa; }
            .totals td { padding: 10px; font-weight: bold; }
            .total-row { background-color: #E63946; color: white; }
            .cta { display: inline-block; background-color: #E63946; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 10px 5px; }
            .steps { margin: 30px 0; }
            .step { display: flex; align-items: flex-start; margin: 15px 0; }
            .step-number { background-color: #E63946; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .id-notice { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://www.revma.com.au/assets/images/revma-logo.jpg" alt="Revma Logo" />
                <h1>YOUR EQUIPMENT HIRE QUOTE</h1>
            </div>
            <div class="content">
                <p>Hi ${(quote.customer_name || '').split(' ')[0] || 'there'},</p>
                <p>Thank you for your equipment hire enquiry. Please find your quote below:</p>
                
                <div class="quote-box">
                    <span class="quote-number">Quote #${quote.quote_number || ''}</span>
                    <p style="margin: 5px 0; color: #666;">Valid until: ${quote.valid_until || ''}</p>
                </div>
                
                <h3>Hire Details</h3>
                <p><strong>Hire Period:</strong> ${quote.hire_start_date || ''} to ${quote.hire_end_date || ''}</p>
                <p><strong>Collection:</strong> ${(quote.delivery_method || '').charAt(0).toUpperCase() + (quote.delivery_method || '').slice(1)}</p>
                ${quote.delivery_address ? `<p><strong>Delivery Address:</strong> ${quote.delivery_address}</p>` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th>Equipment</th>
                            <th style="text-align: center;">Rate</th>
                            <th style="text-align: right;">Price</th>
                            <th style="text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot class="totals">
                        <tr>
                            <td colspan="3" style="text-align: right; padding: 10px;">Subtotal:</td>
                            <td style="text-align: right; padding: 10px;">$${(quote.subtotal || 0).toFixed(2)}</td>
                        </tr>
                        ${(quote.delivery_fee || 0) > 0 ? `<tr><td colspan="3" style="text-align: right; padding: 10px;">Delivery Fee:</td><td style="text-align: right; padding: 10px;">$${(quote.delivery_fee || 0).toFixed(2)}</td></tr>` : ''}
                        <tr>
                            <td colspan="3" style="text-align: right; padding: 10px;">Security Bond (refundable):</td>
                            <td style="text-align: right; padding: 10px;">$${(quote.security_bond || 0).toFixed(2)}</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="3" style="text-align: right; padding: 12px;">TOTAL:</td>
                            <td style="text-align: right; padding: 12px; font-size: 18px;">$${(quote.total || 0).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
                
                ${quote.notes ? `<p><strong>Notes:</strong> ${quote.notes}</p>` : ''}
                
                <div class="id-notice">
                    <strong>📋 100 Points of ID Required</strong>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">To proceed with your hire, you'll need to upload identification documents (e.g., Driver's Licence + Medicare Card or Passport).</p>
                </div>
                
                <div class="steps">
                    <h3>To Accept This Quote:</h3>
                    <div class="step">
                        <div class="step-number">1</div>
                        <div>
                            <strong>Review Quote</strong>
                            <p style="margin: 5px 0; color: #666;">Check the equipment, dates, and pricing</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div>
                            <strong>Upload ID Documents</strong>
                            <p style="margin: 5px 0; color: #666;">Provide 100 points of identification</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div>
                            <strong>Read & Sign Agreement</strong>
                            <p style="margin: 5px 0; color: #666;">Review terms and sign digitally</p>
                        </div>
                    </div>
                </div>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${quoteUrl}" class="cta">View Quote & Accept</a>
                </p>
                
                <p style="color: #666; font-size: 14px;">If you have any questions, please call us on <a href="tel:0448473862" style="color: #E63946;">0448 473 862</a> or reply to this email.</p>
            </div>
            <div class="footer">
                <p>Revma Pty Ltd | ABN: 37 121 035 710</p>
                <p>Unit 9/12 Channel Road, Mayfield West NSW 2304</p>
                <p>Phone: 0448 473 862 | Email: office@revma.com.au</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const subject = `Your Equipment Hire Quote #${quote.quote_number || ''} - Revma Pty Ltd`;
  await sendEmail(customerEmail, subject, html);
};

module.exports = {
  sendEmail,
  sendInquiryNotification,
  sendQuoteToCustomer
};
