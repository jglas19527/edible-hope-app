import SwiftUI
import WebKit

/// Receives JSON saved by public/db.js's `save()` and persists it to a file
/// in the app's Documents directory, which survives across Xcode rebuilds
/// and reinstalls (unlike WKWebView's file:// localStorage, whose origin
/// changes every time the app bundle is rebuilt).
final class NativeBridge: NSObject, WKScriptMessageHandler, ObservableObject {
    private let fileURL: URL

    override init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        fileURL = docs.appendingPathComponent("volunteer-db.json")
        super.init()
    }

    /// A JS snippet assigning the last-saved data (or `null` on first run)
    /// to a global the page reads before anything else runs.
    func bootstrapScriptSource() -> String {
        if let data = try? Data(contentsOf: fileURL), let json = String(data: data, encoding: .utf8), !json.isEmpty {
            return "window.__NATIVE_BOOTSTRAP_DB__ = \(json);"
        }
        return "window.__NATIVE_BOOTSTRAP_DB__ = null;"
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let json = message.body as? String else { return }
        try? json.write(to: fileURL, atomically: true, encoding: .utf8)
    }
}

struct WebView: UIViewRepresentable {
    let url: URL
    let bridge: NativeBridge

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        controller.add(bridge, name: "nativeBridge")
        let script = WKUserScript(
            source: bridge.bootstrapScriptSource(),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        controller.addUserScript(script)
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.bounces = false

        let directory = url.deletingLastPathComponent()
        webView.loadFileURL(url, allowingReadAccessTo: directory)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct ContentView: View {
    @StateObject private var bridge = NativeBridge()

    var body: some View {
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "public") {
            WebView(url: url, bridge: bridge)
                .ignoresSafeArea()
        } else {
            VStack(spacing: 12) {
                Text("Could not find the app's bundled files.")
                Text("Make sure the \"public\" folder was added to the project as a folder reference (blue icon), not a group.")
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
            .multilineTextAlignment(.center)
            .padding()
        }
    }
}
