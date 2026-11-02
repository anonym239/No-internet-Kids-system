package com.novaos.kids;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Nova-Schutz: beobachtet, welche App im Vordergrund ist.
 * Wird Nova (oder ein über Nova gestartetes Spiel) über Home/Übersicht verlassen,
 * holt der Dienst Nova sofort zurück. Dort muss das Passwort eingegeben werden.
 * Läuft die Bildschirmzeit während eines Spiels ab, kommt Nova ebenfalls zurück.
 */
public class GuardService extends Service {
    public static volatile boolean running = false;
    public static volatile String game = null;
    public static volatile long deadline = 0;
    public static final Map<String, Long> temp = new ConcurrentHashMap<>();

    /* Systemteile, die nie blockiert werden dürfen (Anrufe, Berechtigungen, Notfall, Dateiauswahl) */
    static final Set<String> ALWAYS = new HashSet<>(Arrays.asList(
        "com.android.systemui", "com.android.incallui", "com.google.android.dialer", "com.android.dialer",
        "com.samsung.android.incallui", "com.samsung.android.dialer", "com.android.server.telecom",
        "com.google.android.permissioncontroller", "com.android.permissioncontroller",
        "com.google.android.packageinstaller", "com.android.packageinstaller",
        "com.google.android.documentsui", "com.android.documentsui", "com.android.emergency",
        "com.google.android.apps.safetyhub", "com.android.phone"
    ));

    private static final String CHANNEL = "nova_guard";
    private static String lastFg = null;
    private static long lastBring = 0;
    private Handler handler;
    private Runnable tick;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createChannel();
        Notification n = new NotificationCompat.Builder(this, CHANNEL)
            .setContentTitle("Nova-Schutz aktiv")
            .setContentText("Nova kann nur mit Passwort verlassen werden.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
        int type = Build.VERSION.SDK_INT >= 34 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0;
        ServiceCompat.startForeground(this, 1, n, type);
        running = true;
        if (handler == null) {
            handler = new Handler(Looper.getMainLooper());
            tick = new Runnable() {
                @Override
                public void run() {
                    try { check(); } catch (Exception ignored) { }
                    if (running) handler.postDelayed(this, 700);
                }
            };
            handler.post(tick);
        }
        return START_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL) == null) {
                nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Nova-Schutz", NotificationManager.IMPORTANCE_LOW));
            }
        }
    }

    private String currentForeground() {
        UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return lastFg;
        long now = System.currentTimeMillis();
        UsageEvents events = usm.queryEvents(now - 10000, now);
        UsageEvents.Event e = new UsageEvents.Event();
        String fg = null;
        while (events.hasNextEvent()) {
            events.getNextEvent(e);
            if (e.getEventType() == 1 /* ACTIVITY_RESUMED / MOVE_TO_FOREGROUND */) fg = e.getPackageName();
        }
        if (fg != null) lastFg = fg;
        return lastFg;
    }

    private void check() {
        String fg = currentForeground();
        if (fg == null || fg.equals(getPackageName()) || ALWAYS.contains(fg)) return;
        long now = System.currentTimeMillis();
        Long until = temp.get(fg);
        if (until != null && until > now) return;
        if (fg.equals(game)) {
            if (deadline > 0 && now > deadline) bringBack("timeup");
            return;
        }
        bringBack("left");
    }

    private void bringBack(String reason) {
        long now = System.currentTimeMillis();
        if (now - lastBring < 1500) return;
        lastBring = now;
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        i.putExtra("novaGuard", reason);
        try { startActivity(i); } catch (Exception ignored) { }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Nova wurde in der Übersicht weggewischt -> sofort wieder öffnen
        if (running && handler != null) handler.postDelayed(() -> { lastBring = 0; bringBack("closed"); }, 500);
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        running = false;
        if (handler != null) handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
