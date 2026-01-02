package com.simly.gateway

import android.content.Context
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.app.PendingIntent
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

object SmsService {
    private const val CHANNEL = "com.simly.gateway/sms"

    fun registerWith(flutterEngine: FlutterEngine, context: Context) {
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "sendSms" -> {
                    val phoneNumber = call.argument<String>("phoneNumber")
                    val message = call.argument<String>("message")
                    val simSlot = call.argument<Int>("simSlot")

                    if (phoneNumber != null && message != null) {
                        sendSms(context, phoneNumber, message, simSlot) { error, errorCode ->
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
                        val simCards = getSimCards(context)
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

    fun getSimCards(context: Context): List<Map<String, Any?>> {
        val simCards = mutableListOf<Map<String, Any?>>()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            try {
                val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
                val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList
                
                activeSubscriptions?.forEach { subInfo ->
                    val simCard = mapOf(
                        "slot_index" to subInfo.simSlotIndex,
                        "phone_number" to subInfo.number,
                        "operator" to subInfo.carrierName?.toString(),
                        "is_active" to true
                    )
                    simCards.add(simCard)
                }
            } catch (e: SecurityException) {
                // Permission denied - return empty list
            }
        }
        
        return simCards
    }

    fun sendSms(context: Context, phoneNumber: String, message: String, simSlot: Int?, callback: (String?, String?) -> Unit) {
        val smsManager: SmsManager = if (simSlot != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            try {
                val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
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

        val SENT = "SMS_SENT_${System.currentTimeMillis()}"
        val sentPI = PendingIntent.getBroadcast(
            context, 
            System.currentTimeMillis().toInt(), 
            Intent(SENT), 
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) 
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT 
            else 
                PendingIntent.FLAG_UPDATE_CURRENT
        )

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                val errorCode = when (resultCode) {
                    SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "GENERIC_FAILURE"
                    SmsManager.RESULT_ERROR_NO_SERVICE -> "NO_SERVICE"
                    SmsManager.RESULT_ERROR_NULL_PDU -> "NULL_PDU"
                    SmsManager.RESULT_ERROR_RADIO_OFF -> "RADIO_OFF"
                    else -> null
                }
                
                if (resultCode == android.app.Activity.RESULT_OK) {
                    callback(null, null)
                } else {
                    callback("SMS delivery failed with code: $resultCode", errorCode ?: "UNKNOWN_ERROR")
                }
                
                try {
                    ctx?.unregisterReceiver(this)
                } catch (e: Exception) {
                    // Already unregistered
                }
            }
        }

        // Use RECEIVER_NOT_EXPORTED for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, IntentFilter(SENT), Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(receiver, IntentFilter(SENT))
        }
        
        try {
            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                val sentIntents = ArrayList<PendingIntent>()
                for (i in 0 until parts.size) sentIntents.add(sentPI)
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, null)
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, sentPI, null)
            }
        } catch (e: Exception) {
            try {
                context.unregisterReceiver(receiver)
            } catch (ex: Exception) {
                // Already unregistered
            }
            callback(e.message, "EXCEPTION")
        }
    }
}
