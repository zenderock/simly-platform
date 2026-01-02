package com.simly.gateway

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.plugin.common.PluginRegistry

class MainApplication : Application(), PluginRegistry.PluginRegistrantCallback {
    companion object {
        const val NOTIFICATION_CHANNEL_ID = "simly_gateway_v2"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun registerWith(registry: PluginRegistry) {
        // Register the SMS plugin for background isolate
        SmsService.registerWith(
            (registry as io.flutter.embedding.engine.FlutterEngine),
            applicationContext
        )
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
}
