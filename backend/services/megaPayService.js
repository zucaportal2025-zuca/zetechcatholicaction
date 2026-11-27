const axios = require("axios");

class MegaPayService {
  constructor() {
    this.apiKey = process.env.MEGAPAY_API_KEY;
    this.email = process.env.MEGAPAY_EMAIL;
    this.baseURL =
      process.env.MEGAPAY_BASE_URL || "https://megapay.co.ke/backend/v1";
  }

  // Accepts 07..., +254..., 254..., or 7... — normalizes to 254...
  formatPhoneNumber(phoneNumber) {
    let f = String(phoneNumber).replace(/\s/g, "");
    if (f.startsWith("0")) f = "254" + f.substring(1);
    else if (f.startsWith("+")) f = f.substring(1);
    else if (!f.startsWith("254")) f = "254" + f;
    return f;
  }

  /**
   * Same 5-arg signature as MpesaService.stkPush, so callers don't change.
   * Maps MegaPay's response back to { success, checkoutRequestID, ... }
   */
  async stkPush(phoneNumber, amount, accountReference, transactionDesc, callbackUrl) {
    try {
      const { data } = await axios.post(
        `${this.baseURL}/initiatestk`,
        {
          api_key: this.apiKey,
          email: this.email,
          amount: String(Math.round(amount)),
          msisdn: this.formatPhoneNumber(phoneNumber),
          reference: (accountReference || `REF${Date.now()}`).substring(0, 50),
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        }
      );

      console.log("🔵 RAW MEGAPAY RESPONSE:", JSON.stringify(data, null, 2));

      const ok = String(data.success) === "200";
      return {
        success: ok,
        checkoutRequestID: data.transaction_request_id,
        responseCode: data.success,
        responseDescription: data.massage || data.message,
        merchantRequestID: null,
      };
    } catch (error) {
      console.error("❌ MegaPay STK Push failed");
      console.error("   HTTP status:", error.response?.status);
      console.error("   Response body:", JSON.stringify(error.response?.data, null, 2));
      console.error("   Error message:", error.message);
      return {
        success: false,
        error:
          error.response?.data?.massage ||
          error.response?.data?.message ||
          error.message,
      };
    }
  }

  /**
   * Same 1-arg signature as MpesaService.queryStatus.
   * Returns { ResultCode, ResultDesc, ... } so the caller's result.ResultCode checks still work.
   */
  async queryStatus(checkoutRequestID) {
    try {
      const { data } = await axios.post(
        `${this.baseURL}/transactionstatus`,
        {
          api_key: this.apiKey,
          email: this.email,
          transaction_request_id: checkoutRequestID,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        }
      );

      // MegaPay returns ResultCode "200" for success, other codes for failures.
      // Caller checks result.ResultCode == 0 for success, 1037 for pending.
      // Map MegaPay's codes to Daraja-compatible values:
      let resultCode;
      if (String(data.ResultCode) === "200" && data.TransactionStatus === "Completed") {
        resultCode = 0;               // <-- Daraja success code
      } else if (data.TransactionStatus === "Pending") {
        resultCode = "1037";          // <-- Daraja "still processing" code
      } else {
        resultCode = data.ResultCode; // pass through error code
      }

      return {
        ResultCode: resultCode,
        ResultDesc: data.TransactionStatus || data.ResultDesc,
        TransactionReceipt: data.TransactionReceipt,
        raw: data,
      };
    } catch (error) {
      console.error("MegaPay query status failed:", error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new MegaPayService();