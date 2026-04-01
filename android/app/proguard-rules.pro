# Keep app entry points used by manifest and WebView startup.
-keep class org.youthmtl.app.MainActivity { *; }

# Keep WebView and AndroidX webkit APIs referenced at runtime.
-keep class android.webkit.** { *; }
-dontwarn android.webkit.**

# Keep AndroidX WebKit helper classes used by WebViewAssetLoader.
-keep class androidx.webkit.** { *; }
-dontwarn androidx.webkit.**
