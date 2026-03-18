import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_OTP_API_URL || "https://zero-broker.onrender.com/api";

/**
 * Service to interact with the custom OTP backend.
 */
export const otpApi = {
  /**
   * Sends an OTP to the specified phone number.
   * @param phoneNumber The recipient's phone number.
   */
  async sendOtp(phoneNumber: string): Promise<{ message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/otp/send`, {
        phoneNumber,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to send OTP");
    }
  },

  /**
   * Verifies the OTP for the specified phone number.
   * @param phoneNumber The recipient's phone number.
   * @param otp The 6-digit OTP code.
   */
  async verifyOtp(
    phoneNumber: string,
    otp: string,
  ): Promise<{ message: string; verified: boolean }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/otp/verify`, {
        phoneNumber,
        otp,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to verify OTP");
    }
  },
};
