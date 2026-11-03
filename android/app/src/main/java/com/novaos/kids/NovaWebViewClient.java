package com.novaos.kids;

import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.util.HashMap;

/**
 * Internet-Sperre für Nova: Die App darf nur ihre eigenen Dateien laden (https://localhost).
 * Nur während eines vom Kind/den Eltern mit Passwort erlaubten KI-Modell-Downloads
 * sind die Server von Hugging Face kurz erreichbar.
 */
public class NovaWebViewClient extends BridgeWebViewClient {
    public static volatile boolean downloadAllowed = false;

    public NovaWebViewClient(Bridge bridge) { super(bridge); }

    private static boolean isDownloadHost(String host) {
        if (host == null) return false;
        host = host.toLowerCase();
        return host.equals("huggingface.co") || host.endsWith(".huggingface.co") || host.equals("hf.co") || host.endsWith(".hf.co");
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri u = request.getUrl();
        String scheme = u.getScheme();
        String host = u.getHost();
        boolean web = "http".equals(scheme) || "https".equals(scheme);
        if (web && !"localhost".equals(host) && !(downloadAllowed && isDownloadHost(host))) {
            HashMap<String, String> h = new HashMap<>();
            h.put("Access-Control-Allow-Origin", "*");
            return new WebResourceResponse("text/plain", "utf-8", 403, "Blocked", h, new ByteArrayInputStream(new byte[0]));
        }
        return super.shouldInterceptRequest(view, request);
    }
}
