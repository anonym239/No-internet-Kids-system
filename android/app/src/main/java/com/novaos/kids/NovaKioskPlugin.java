package com.novaos.kids;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Nova-Kiosk: fixiert die App (Android "Bildschirm fixieren" / Lock Task),
 * damit man Nova nicht ohne Passwort verlassen kann.
 */
@CapacitorPlugin(name = "NovaKiosk")
public class NovaKioskPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (!isLocked()) getActivity().startLockTask();
                call.resolve();
            } catch (Exception e) {
                call.reject("Fixieren nicht möglich: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (isLocked()) getActivity().stopLockTask();
                call.resolve();
            } catch (Exception e) {
                call.reject("Lösen nicht möglich: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void isActive(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("value", isLocked());
        call.resolve(ret);
    }

    @PluginMethod
    public void openHomeSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_HOME_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /** Internet nur für erlaubte KI-Modell-Downloads kurz freigeben */
    @PluginMethod
    public void setNetwork(PluginCall call) {
        NovaWebViewClient.downloadAllowed = Boolean.TRUE.equals(call.getBoolean("allowed", false));
        call.resolve();
    }

    /** Abstände für Kamera-Loch/Notch in dp (Nova setzt sie als CSS-Variablen) */
    @PluginMethod
    public void insets(PluginCall call) {
        JSObject r = new JSObject();
        r.put("top", MainActivity.insetTop);
        r.put("bottom", MainActivity.insetBottom);
        r.put("left", MainActivity.insetLeft);
        r.put("right", MainActivity.insetRight);
        call.resolve(r);
    }

    private boolean isLocked() {
        ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        if (am == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;
        }
        return false;
    }
}
