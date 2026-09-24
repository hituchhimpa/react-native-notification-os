# Proguard / R8 rules for react-native-notification-os

# Keep RNNOS native package and TurboModule
-keep class com.rnnos.** { *; }
-keepclassmembers class com.rnnos.** { *; }

# Keep Domain Models and Serialization structures
-keep class com.rnnos.core.domain.model.** { *; }
-keepclassmembers class com.rnnos.core.domain.model.** { *; }

# Keep Receivers and Services
-keep class com.rnnos.core.services.** { *; }
-keep class com.rnnos.core.renderers.** { *; }
-keepclassmembers class com.rnnos.core.renderers.** { *; }
