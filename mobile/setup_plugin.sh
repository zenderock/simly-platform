#!/bin/bash
set -e

PLUGIN_DIR="local_plugins/sms_gateway"
ANDROID_DIR="$PLUGIN_DIR/android/src/main/kotlin/com/simly/gateway"

mkdir -p "$PLUGIN_DIR/lib"
mkdir -p "$ANDROID_DIR"

# Create pubspec.yaml
cat << 'INNER_EOF' > "$PLUGIN_DIR/pubspec.yaml"
name: sms_gateway
description: A local plugin for SMS gateway.
version: 0.0.1
publish_to: 'none'

environment:
  sdk: ">=3.0.0 <4.0.0"
  flutter: ">=3.3.0"

dependencies:
  flutter:
    sdk: flutter

flutter:
  plugin:
    platforms:
      android:
        package: com.simly.gateway.plugin
        pluginClass: SmsGatewayPlugin
INNER_EOF

# Create Android build.gradle
cat << 'INNER_EOF' > "$PLUGIN_DIR/android/build.gradle"
group 'com.simly.gateway.plugin'
version '1.0-SNAPSHOT'

buildscript {
    ext.kotlin_version = '1.9.0'
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:\$kotlin_version"
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'

android {
    if (project.android.hasProperty("namespace")) {
        namespace 'com.simly.gateway.plugin'
    }
    compileSdk 34

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = '1.8'
    }

    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
    }

    defaultConfig {
        minSdk 21
    }
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib-jdk8:\$kotlin_version"
}
INNER_EOF

# Create dart dummy file
cat << 'INNER_EOF' > "$PLUGIN_DIR/lib/sms_gateway.dart"
// SMS Gateway Plugin
// This is just to satisfy the flutter plugin structure.
INNER_EOF

# Move files from app to plugin
mv android/app/src/main/kotlin/com/simly/gateway/SmsGatewayPlugin.kt "$ANDROID_DIR/"
mv android/app/src/main/kotlin/com/simly/gateway/SmsGatewayApi.g.kt "$ANDROID_DIR/"
mv android/app/src/main/kotlin/com/simly/gateway/SmsStatusReceiver.kt "$ANDROID_DIR/"

# Update package name in moved files
sed -i 's/package com.simly.gateway/package com.simly.gateway.plugin/' "$ANDROID_DIR/SmsGatewayPlugin.kt"
sed -i 's/package com.simly.gateway/package com.simly.gateway.plugin/' "$ANDROID_DIR/SmsGatewayApi.g.kt"
sed -i 's/package com.simly.gateway/package com.simly.gateway.plugin/' "$ANDROID_DIR/SmsStatusReceiver.kt"

echo "Plugin setup complete!"
