package com.simly.gateway

import android.content.Context
import io.flutter.embedding.engine.plugins.FlutterPlugin

class SmsPlugin : FlutterPlugin {
    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        SmsService.registerWith(binding.flutterEngine, binding.applicationContext)
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        // Cleanup if needed
    }
}
