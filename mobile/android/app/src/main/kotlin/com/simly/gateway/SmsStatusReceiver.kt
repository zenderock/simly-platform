package com.simly.gateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * A simple one-shot BroadcastReceiver that captures the SMS_SENT result code
 * and invokes a callback. It automatically unregisters itself after receiving.
 */
class SmsStatusReceiver(
    private val onResult: (Int) -> Unit
) : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        onResult(resultCode)
        // Unregister to avoid leaks
        try {
            context?.unregisterReceiver(this)
        } catch (_: IllegalArgumentException) {
            // Already unregistered
        }
    }
}
