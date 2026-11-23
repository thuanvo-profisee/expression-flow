import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { checkForUpdate, dismissUpdate } from "../api/updates";
import type { AvailableUpdate } from "../api/updates";

/** Banner that tells the user a newer extension release is out */
export function UpdateNotice() {
    const [update, setUpdate] = useState<AvailableUpdate | null>(null);

    useEffect(() => {
        let cancelled = false;
        void checkForUpdate().then((u) => {
            if (!cancelled) setUpdate(u);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!update) return null;

    const linkClass =
        "font-semibold text-blue-700 hover:text-blue-900 hover:underline underline-offset-2";

    return (
        <div
            role="status"
            className="flex items-start gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200 text-[13px] text-blue-950"
        >
            <Download size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex-1 min-w-0 basis-[240px]">
                    <p className="font-semibold">
                        Version {update.version} is available{" "}
                        <span className="font-normal text-blue-800">
                            (you have {update.current})
                        </span>
                    </p>
                    <p className="text-[12px] text-blue-800 leading-snug">
                        Unzip it over your extension folder, then click reload
                        on the Expression Flow card in{" "}
                        <code className="font-mono">chrome://extensions</code>.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <a
                        href={update.zipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={linkClass}
                    >
                        Download
                    </a>
                    <a
                        href={update.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={linkClass}
                    >
                        What's new
                    </a>
                </div>
            </div>
            <button
                onClick={() => {
                    dismissUpdate(update.version);
                    setUpdate(null);
                }}
                aria-label="Dismiss"
                title="Hide until the next release"
                className="shrink-0 p-0.5 rounded text-blue-500 hover:text-blue-800 hover:bg-blue-100 transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
}
