package com.simly.gateway

import android.content.Context
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.simly.gateway/sms"
    private val NOTIFICATION_CHANNEL_ID = "simly_gateway_v2"

    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Simly Gateway Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the SMS gateway running in background"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "sendSms" -> {
                    val phoneNumber = call.argument<String>("phoneNumber")
                    val message = call.argument<String>("message")
                    val simSlot = call.argument<Int>("simSlot")

                    if (phoneNumber != null && message != null) {
                        sendSms(phoneNumber, message, simSlot) { error, errorCode ->
                            if (error == null) {
                                result.success(null)
                            } else {
                                result.error(errorCode ?: "SMS_FAILED", error, null)
                            }
                        }
                    } else {
                        result.error("INVALID_ARGUMENTS", "Phone number and message must not be null", null)
                    }
                }
                "getSimCards" -> {
                    try {
                        val simCards = getSimCards()
                        result.success(simCards)
                    } catch (e: Exception) {
                        result.error("SIM_ERROR", e.message, null)
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun getSimCards(): List<Map<String, Any?>> {
        val simCards = mutableListOf<Map<String, Any?>>()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            try {
                val subscriptionManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
                val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList
                
                activeSubscriptions?.forEach { subInfo ->
                    // Try multiple ways to get phone number
                    var phoneNumber = subInfo.number
                    
                    // If number is null or empty, try TelephonyManager
                    if (phoneNumber.isNullOrEmpty()) {
                        try {
                            val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                // Android 13+ - use SubscriptionManager directly
                                phoneNumber = subscriptionManager.getPhoneNumber(subInfo.subscriptionId)
                            } else {
                                // Older versions - try basic line1 number
                                @Suppress("DEPRECATION")
                                phoneNumber = telephonyManager.line1Number
                            }
                        } catch (e: SecurityException) {
                            // Permission denied
                        } catch (e: Exception) {
                            // Other error
                        }
                    }
                    
                    val simCard = mapOf(
                        "slot_index" to subInfo.simSlotIndex,
                        "phone_number" to (phoneNumber ?: ""),
                        "operator" to subInfo.carrierName?.toString(),
                        "is_active" to true,
                        "subscription_id" to subInfo.subscriptionId,
                        "display_name" to subInfo.displayName?.toString()
                    )
                    simCards.add(simCard)
                }
            } catch (e: SecurityException) {
                // Permission denied - return empty list
            }
        }
        
        return simCards
    }

    private fun sendSms(phoneNumber: String, message: String, simSlot: Int?, callback: (String?, String?) -> Unit) {
        val smsManager: SmsManager = if (simSlot != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            try {
                val subscriptionManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
                val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList
                
                val subInfo = activeSubscriptions?.find { it.simSlotIndex == simSlot }
                
                if (subInfo != null) {
                    SmsManager.getSmsManagerForSubscriptionId(subInfo.subscriptionId)
                } else {
                    SmsManager.getDefault()
                }
            } catch (e: SecurityException) {
                SmsManager.getDefault()
            }
        } else {
            SmsManager.getDefault()
        }
        
        try {
            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            }
            // Return success immediately after sending (don't wait for delivery confirmation)
            callback(null, null)
        } catch (e: Exception) {
            callback(e.message, "EXCEPTION")
        }
    }
}
