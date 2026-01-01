package com.example.mobile

import android.content.Context
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.app.PendingIntent
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
            } else {
                result.notImplemented()
            }
        }
    }

    private fun sendSms(phoneNumber: String, message: String, simSlot: Int?, callback: (String?, String?) -> Unit) {
        val smsManager: SmsManager = if (simSlot != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            val subscriptionManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
            val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList
            
            val subInfo = activeSubscriptions?.find { it.simSlotIndex == simSlot }
            
            if (subInfo != null) {
                SmsManager.getSmsManagerForSubscriptionId(subInfo.subscriptionId)
            } else {
                SmsManager.getDefault()
            }
        } else {
            SmsManager.getDefault()
        }

        val SENT = "SMS_SENT"
        val sentPI = PendingIntent.getBroadcast(
            this, 0, Intent(SENT), 
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT else PendingIntent.FLAG_UPDATE_CURRENT
        )

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val errorCode = when (resultCode) {
                    SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "GENERIC_FAILURE"
                    SmsManager.RESULT_ERROR_NO_SERVICE -> "NO_SERVICE"
                    SmsManager.RESULT_ERROR_NULL_PDU -> "NULL_PDU"
                    SmsManager.RESULT_ERROR_RADIO_OFF -> "RADIO_OFF"
                    SmsManager.RESULT_LIMIT_EXCEEDED -> "LIMIT_EXCEEDED"
                    else -> null
                }
                
                if (resultCode == FlutterActivity.RESULT_OK) {
                    callback(null, null)
                } else {
                    callback("SMS delivery failed with code: $resultCode", errorCode ?: "UNKNOWN_ERROR")
                }
                context?.unregisterReceiver(this)
            }
        }

        registerReceiver(receiver, IntentFilter(SENT))
        
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
            unregisterReceiver(receiver)
            callback(e.message, "EXCEPTION")
        }
    }
}
