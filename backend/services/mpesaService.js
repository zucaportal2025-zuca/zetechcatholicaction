const axios = require("axios");

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE || "174379";
    this.environment = process.env.MPESA_ENVIRONMENT || "sandbox";
    
    this.baseURL = this.environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString("base64");
    
    try {
      const response = await axios.get(
        `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );
      
      this.accessToken = response.data.access_token;
      // Token expires in 3600 seconds, set expiry 10 minutes earlier
      this.tokenExpiry = Date.now() + (3500 * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error("Failed to get M-PESA access token:", error.response?.data || error.message);
      throw new Error("Failed to authenticate with M-PESA");
    }
  }

  formatPhoneNumber(phoneNumber) {
    let formatted = phoneNumber.toString().replace(/\s/g, "");
    if (formatted.startsWith("0")) {
      formatted = "254" + formatted.substring(1);
    } else if (formatted.startsWith("+")) {
      formatted = formatted.substring(1);
    } else if (!formatted.startsWith("254")) {
      formatted = "254" + formatted;
    }
    return formatted;
  }

  getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  async stkPush(phoneNumber, amount, accountReference, transactionDesc, callbackUrl) {
  try {
    const token = await this.getAccessToken();
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const timestamp = this.getTimestamp();
    const password = Buffer.from(
      `${this.shortcode}${this.passkey}${timestamp}`
    ).toString("base64");
    
    const requestBody = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: this.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference.substring(0, 12),
      TransactionDesc: transactionDesc.substring(0, 13),
    };
    
    const response = await axios.post(
      `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,  // ← Add timeout
      }
    );
    
    return {
      success: true,
      checkoutRequestID: response.data.CheckoutRequestID,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription,
      merchantRequestID: response.data.MerchantRequestID,
    };
  } catch (error) {
    console.error("STK Push failed:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errorMessage || error.message,
    };
  }
}

  async queryStatus(checkoutRequestID) {
    try {
      const token = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = Buffer.from(
        `${this.shortcode}${this.passkey}${timestamp}`
      ).toString("base64");
      
      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: this.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestID,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error("Query status failed:", error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new MpesaService();