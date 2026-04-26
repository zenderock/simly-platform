package com.simly.gateway.plugin

import android.app.Activity
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Log
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding

class SmsGatewayPlugin : FlutterPlugin, ActivityAware, SmsGatewayHostApi {

    companion object {
        private const val TAG = "SmsGatewayPlugin"
        const val SMS_SENT_ACTION = "com.simly.gateway.SMS_SENT"
        const val SMS_DELIVERED_ACTION = "com.simly.gateway.SMS_DELIVERED"
    }

    private var context: Context? = null
    private var activity: Activity? = null

    // --- FlutterPlugin lifecycle ---

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        context = binding.applicationContext
        SmsGatewayHostApi.setUp(binding.binaryMessenger, this)
        Log.d(TAG, "SmsGatewayPlugin attached to engine")
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        SmsGatewayHostApi.setUp(binding.binaryMessenger, null)
        context = null
        Log.d(TAG, "SmsGatewayPlugin detached from engine")
    }

    // --- ActivityAware lifecycle ---

    override fun onAttachedToActivity(binding: ActivityPluginBinding) {
        activity = binding.activity
    }

    override fun onDetachedFromActivityForConfigChanges() {
        activity = null
    }

    override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
        activity = binding.activity
    }

    override fun onDetachedFromActivity() {
        activity = null
    }

    // --- SmsGatewayHostApi implementation ---

    override fun sendSms(
        phoneNumber: String,
        message: String,
        simSlot: Long?,
        callback: (Result<SmsSendResult>) -> Unit
    ) {
        val ctx = context
        if (ctx == null) {
            callback(
                Result.success(
                    SmsSendResult(
                        success = false,
                        errorCode = "NO_CONTEXT",
                        errorMessage = "Plugin context not available"
                    )
                )
            )
            return
        }

        val smsManager: SmsManager = if (simSlot != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            try {
                val subscriptionManager =
                    ctx.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
                val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList
                val subInfo = activeSubscriptions?.find { it.simSlotIndex == simSlot.toInt() }

                if (subInfo != null) {
                    SmsManager.getSmsManagerForSubscriptionId(subInfo.subscriptionId)
                } else {
                    SmsManager.getDefault()
                }
            } catch (e: SecurityException) {
                Log.w(TAG, "SecurityException accessing SIM info, using default SmsManager", e)
                SmsManager.getDefault()
            }
        } else {
            SmsManager.getDefault()
        }

        try {
            val parts = smsManager.divideMessage(message)

            // Create PendingIntent for SENT confirmation
            val sentIntent = PendingIntent.getBroadcast(
                ctx,
                System.currentTimeMillis().toInt(),
                Intent(SMS_SENT_ACTION),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_ONE_SHOT
            )

            // Register an inline receiver to capture the SENT result and resolve the callback
            val sentReceiver = SmsStatusReceiver { resultCode ->
                val result = when (resultCode) {
                    Activity.RESULT_OK -> SmsSendResult(success = true)
                    SmsManager.RESULT_ERROR_GENERIC_FAILURE -> SmsSendResult(
                        success = false,
                        errorCode = "GENERIC_FAILURE",
                        errorMessage = "Generic failure"
                    )
                    SmsManager.RESULT_ERROR_NO_SERVICE -> SmsSendResult(
                        success = false,
                        errorCode = "NO_SERVICE",
                        errorMessage = "No service available"
                    )
                    SmsManager.RESULT_ERROR_NULL_PDU -> SmsSendResult(
                        success = false,
                        errorCode = "NULL_PDU",
                        errorMessage = "Null PDU"
                    )
                    SmsManager.RESULT_ERROR_RADIO_OFF -> SmsSendResult(
                        success = false,
                        errorCode = "RADIO_OFF",
                        errorMessage = "Radio off"
                    )
                    else -> SmsSendResult(
                        success = false,
                        errorCode = "UNKNOWN_$resultCode",
                        errorMessage = "Unknown error code: $resultCode"
                    )
                }
                callback(Result.success(result))
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ctx.registerReceiver(
                    sentReceiver,
                    IntentFilter(SMS_SENT_ACTION),
                    Context.RECEIVER_NOT_EXPORTED
                )
            } else {
                ctx.registerReceiver(sentReceiver, IntentFilter(SMS_SENT_ACTION))
            }

            if (parts.size > 1) {
                val sentIntents = ArrayList<PendingIntent>()
                // Only track the last part for the overall "sent" status
                for (i in parts.indices) {
                    if (i == parts.lastIndex) {
                        sentIntents.add(sentIntent)
                    } else {
                        sentIntents.add(
                            PendingIntent.getBroadcast(
                                ctx,
                                System.currentTimeMillis().toInt() + i,
                                Intent("${SMS_SENT_ACTION}_PART_$i"),
                                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_ONE_SHOT
                            )
                        )
                    }
                }
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, sentIntents, null)
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, sentIntent, null)
            }

            Log.d(TAG, "SMS dispatch initiated to $phoneNumber")
        } catch (e: Exception) {
            Log.e(TAG, "Exception sending SMS", e)
            callback(
                Result.success(
                    SmsSendResult(
                        success = false,
                        errorCode = "EXCEPTION",
                        errorMessage = e.message
                    )
                )
            )
        }
    }

    override fun getSimCards(): List<SimCardInfo> {
        val ctx = context ?: return emptyList()
        val simCards = mutableListOf<SimCardInfo>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            try {
                val subscriptionManager =
                    ctx.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
                val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList

                activeSubscriptions?.forEach { subInfo ->
                    var phoneNumber = subInfo.number

                    if (phoneNumber.isNullOrEmpty()) {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                phoneNumber =
                                    subscriptionManager.getPhoneNumber(subInfo.subscriptionId)
                            } else {
                                val telephonyManager =
                                    ctx.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
                                @Suppress("DEPRECATION")
                                phoneNumber = telephonyManager.line1Number
                            }
                        } catch (_: SecurityException) {
                        } catch (_: Exception) {
                        }
                    }

                    simCards.add(
                        SimCardInfo(
                            slotIndex = subInfo.simSlotIndex.toLong(),
                            phoneNumber = phoneNumber ?: "",
                            operator_ = subInfo.carrierName?.toString(),
                            isActive = true,
                            subscriptionId = subInfo.subscriptionId.toLong(),
                            displayName = subInfo.displayName?.toString()
                        )
                    )
                }
            } catch (e: SecurityException) {
                Log.w(TAG, "SecurityException reading SIM cards", e)
            }
        }

        return simCards
    }
}
