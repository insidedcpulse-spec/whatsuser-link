const AD_WIDTH = 300;
const AD_HEIGHT = 250;

export function AdBanner() {
  return (
    <div className="flex justify-center">
      <iframe
        src="/ad-frame.html"
        width={AD_WIDTH}
        height={AD_HEIGHT}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
        title="Advertisement"
        style={{ border: "none" }}
      />
    </div>
  );
}
