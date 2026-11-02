package com.novaos.kids;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** JS-Schnittstelle für den Nova-Schutzdienst. */
@CapacitorPlugin(name = "NovaGuard")
public class NovaGuardPlugin extends Plugin {
    private String pendingReason = null;

    @Override
    public void load() {
        Intent i = getActivity().getIntent();
        if (i != null && i.hasExtra("novaGuard")) {
            pendingReason = i.getStringExtra("novaGuard");
            i.removeExtra("novaGuard");
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (intent != null && intent.hasExtra("novaGuard")) {
            JSObject data = new JSObject();
            data.put("reason", intent.getStringExtra("novaGuard"));
            intent.removeExtra("novaGuard");
            notifyListeners("returned", data, true);
        }
    }

    private boolean hasUsage() {
        AppOpsManager ops = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
        if (ops == null) return false;
        int mode = Build.VERSION.SDK_INT >= 29
            ? ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), getContext().getPackageName())
            : ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), getContext().getPackageName());
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private boolean hasOverlay() {
        return Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(getContext());
    }

    private void allowSettingsFor(int seconds) {
        long until = System.currentTimeMillis() + seconds * 1000L;
        GuardService.temp.put("com.android.settings", until);
        GuardService.temp.put("com.samsung.android.settings", until);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("usage", hasUsage());
        r.put("overlay", hasOverlay());
        r.put("running", GuardService.running);
        call.resolve(r);
    }

    @PluginMethod
    public void consumeReason(PluginCall call) {
        JSObject r = new JSObject();
        r.put("reason", pendingReason);
        pendingReason = null;
        call.resolve(r);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasUsage()) { call.reject("Nutzungszugriff fehlt"); return; }
        try {
            ContextCompat.startForegroundService(getContext(), new Intent(getContext(), GuardService.class));
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        GuardService.running = false;
        getContext().stopService(new Intent(getContext(), GuardService.class));
        call.resolve();
    }

    @PluginMethod
    public void setGame(PluginCall call) {
        GuardService.game = call.getString("pkg");
        Double d = call.getDouble("deadline");
        GuardService.deadline = d == null ? 0 : d.longValue();
        call.resolve();
    }

    @PluginMethod
    public void allow(PluginCall call) {
        JSArray arr = call.getArray("packages");
        int seconds = call.getInt("seconds", 300);
        long until = System.currentTimeMillis() + seconds * 1000L;
        try {
            if (arr != null) for (Object o : arr.toList()) GuardService.temp.put(String.valueOf(o), until);
        } catch (Exception ignored) { }
        call.resolve();
    }

    @PluginMethod
    public void openUsageSettings(PluginCall call) {
        allowSettingsFor(300);
        try {
            Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        allowSettingsFor(300);
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }
}
