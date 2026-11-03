package com.novaos.kids;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    /** Abstände (in dp) für Kamera-Loch/Notch – werden als CSS-Variablen an Nova gegeben */
    public static volatile float insetTop = 0, insetBottom = 0, insetLeft = 0, insetRight = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NovaKioskPlugin.class);
        registerPlugin(NovaGuardPlugin.class);
        super.onCreate(savedInstanceState);
        // Internet-Sperre: nur eigene Dateien, außer bei erlaubten KI-Downloads
        getBridge().setWebViewClient(new NovaWebViewClient(getBridge()));

        // Vollbild bis an die Ränder, auch neben dem Kamera-Loch
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideSystemBars();

        WebView wv = getBridge().getWebView();
        // Systemschrift nicht zu stark vergrößern (sonst bricht das Layout), aber Barrierefreiheit respektieren
        float fs = getResources().getConfiguration().fontScale;
        wv.getSettings().setTextZoom(Math.round(Math.min(1.12f, Math.max(0.9f, fs)) * 100));

        ViewCompat.setOnApplyWindowInsetsListener(wv, (v, insets) -> {
            // Nur das Kamera-Loch zählt – Status- und Navigationsleiste sind ausgeblendet
            Insets c = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
            float d = getResources().getDisplayMetrics().density;
            insetTop = c.top / d; insetBottom = c.bottom / d; insetLeft = c.left / d; insetRight = c.right / d;
            pushInsets();
            return insets;
        });
    }

    /** Statusleiste (Uhr, WLAN …) und die drei Android-Tasten ausblenden – durch Wischen kurz einblendbar */
    private void hideSystemBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }

    public void pushInsets() {
        if (getBridge() == null) return;
        WebView wv = getBridge().getWebView();
        String js = String.format(Locale.US,
            "(function(){var s=document.documentElement.style;s.setProperty('--sat','%.1fpx');s.setProperty('--sab','%.1fpx');s.setProperty('--sal','%.1fpx');s.setProperty('--sar','%.1fpx');})()",
            insetTop, insetBottom, insetLeft, insetRight);
        wv.post(() -> wv.evaluateJavascript(js, null));
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
        pushInsets();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) { hideSystemBars(); pushInsets(); }
    }
}
