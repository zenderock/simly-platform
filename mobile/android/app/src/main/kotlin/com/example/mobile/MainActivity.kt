package com.example.mobile

import android.content.Context
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.simly.gateway/sms"

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "sendSms") {
                val phoneNumber = call.argument<String>("phoneNumber")
                val message = call.argument<String>("message")
                val simSlot = call.argument<Int>("simSlot")

                if (phoneNumber != null && message != null) {
                    try {
                        sendSms(phoneNumber, message, simSlot)
                        result.success(null)
                    } catch (e: Exception) {
                        result.error("SMS_FAILED", e.message, null)
                    }
                } else {
                    result.error("INVALID_ARGUMENTS", "Phone number and message must not be null", null)
                }
            } else {
                result.notImplemented()
            }
        }
    }

    private fun sendSms(phoneNumber: String, message: String, simSlot: Int?) {
        val smsManager: SmsManager = if (simSlot != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            val subscriptionManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
            val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList
            
            // Look for subscription at the requested slot index
            val subInfo = activeSubscriptions.find { it.simSlotIndex == simSlot }
            
            if (subInfo != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // API 31+
                    getSystemService(android.telephony.TelephonyManager::class.java).createForSubscriptionId(subInfo.subscriptionId).let {
                        SmsManager.getSmsManagerForSubscriptionId(subInfo.subscriptionId)
                    }
                } else {
                    SmsManager.getSmsManagerForSubscriptionId(subInfo.subscriptionId)
                }
            } else {
                // Fallback to default if slot not found
                SmsManager.getDefault()
            }
        } else {
            SmsManager.getDefault()
        }

        val sentIntent = null // Can be added for detailed tracking later
        val deliveryIntent = null
        
        // Handle long messages
        val parts = smsManager.divideMessage(message)
        if (parts.size > 1) {
            smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
        } else {
            smsManager.sendTextMessage(phoneNumber, null, message, sentIntent, deliveryIntent)
        }
    }
}
