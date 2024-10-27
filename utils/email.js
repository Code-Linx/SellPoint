/* eslint-disable no-undef */

const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');

class Email {
  constructor(user, url) {
    // Accept loginDetails here
    this.to = user.email;
    this.name = user.name;
    this.from = `Sellpoint <${process.env.EMAIL_FROM}>`;
    this.url = url;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({});
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject, data = {}) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      name: this.name,
      url: this.url,
      subject,
      ...data, // Spread the additional data into the template variables
    });

    // 2) Define Email Options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };

    await this.newTransport().sendMail(mailOptions);
  }

  // Send OTP email
  async sendEmailVerification() {
    await this.send('emailVerification', 'Your SellPass OTP');
  }
  async sendVerificationSuccess() {
    await this.send('verificationSuccess', 'Email Verification Successful!');
  }

  // Send password reset code email
  async sendPasswordReset() {
    await this.send('sendResetCode', 'Your Password Reset Code');
  }

  // Method to send the order receipt
  async sendReceipt(items, total, currencySymbol) {
    await this.send('receipt', 'Your Order Receipt', {
      items,
      total: `${currencySymbol}${total.toFixed(2)}`,
    });
  }

  async sendSalesReport(startDate, endDate, orderHistory, reportData) {
    await this.send(
      'salesReport',
      `Sales Report from ${startDate.toDateString()} to ${endDate.toDateString()}`,
      {
        orderHistory,
        totalSales: reportData.totalSales,
        totalOrders: reportData.totalOrders,
        firstName: this.name,
        startDate: startDate, // Pass as a Date object
        endDate: endDate, // Pass as a Date object
      }
    );
  }
}

module.exports = Email;
