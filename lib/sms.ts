import axios from "axios";
import { normalizePhone } from "@/lib/phone";
// This file is the ONLY place that should know about SMSEthiopia specifically.
// Every other part of the app calls sendSms() and doesn't care which
// provider is behind it. To switch providers later, only this file changes.

const SMS_ETHIOPIA_ENDPOINT = "https://smsethiopia.et/api/sms/send";

interface SmsResult {
  success: boolean;
  error?: string;
}

// Their format wants the number as 251XXXXXXXXX — no plus sign, no spaces.
// Parent phone numbers might get entered various ways, so we normalize here.


export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  if (!phone) {
    return { success: false, error: "No phone number on file." };
  }

  const apiKey = process.env.SMS_ETHIOPIA_API_KEY;

  if (!apiKey) {
    console.error("SMS_ETHIOPIA_API_KEY is missing from .env");
    return { success: false, error: "SMS provider not configured." };
  }

  // Standard SMS is 160 chars — truncate with a clear marker rather than
  // silently sending a cut-off message that might confuse a parent
  const text = message.length > 160 ? message.slice(0, 157) + "..." : message;

  try {
    const response = await axios.post(
      SMS_ETHIOPIA_ENDPOINT,
      {
        msisdn: normalizePhone(phone),
        text,
      },
      {
        headers: {
          KEY: apiKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
if (response.data?.sent === true) {
      return { success: true };
    }

    console.error("[SMS Ethiopia] Unexpected response:", response.data);
    return { success: false, error: response.data?.description || "Unexpected response from SMS provider." };
  } catch (error) {
    const errorMessage = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : "Unknown SMS error";

    console.error("[SMS Ethiopia] Send failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}