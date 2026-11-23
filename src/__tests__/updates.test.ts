// ─── New release check ────────────────────────────────────────────
//
// The notice shows only for a release that is newer than the installed
// extension, and its Download link points at the extension zip.

import { describe, expect, it } from "vitest";
import { isNewerVersion, toReleaseInfo } from "../api/updates";

describe("isNewerVersion", () => {
    it.each([
        ["v1.0.1", "1.0.0"],
        ["1.1.0", "1.0.9"],
        ["2.0.0", "1.12.3"],
        ["v1.10.0", "1.9.0"],
    ])("%s is newer than %s", (candidate, current) => {
        expect(isNewerVersion(candidate, current)).toBe(true);
    });

    it.each([
        ["v1.0.0", "1.0.0"],
        ["1.0.0", "1.0.1"],
        ["1.9.0", "1.10.0"],
        ["v1.1.0-beta", "1.0.0"],
        ["latest", "1.0.0"],
    ])("%s is not newer than %s", (candidate, current) => {
        expect(isNewerVersion(candidate, current)).toBe(false);
    });
});

describe("toReleaseInfo", () => {
    const page = "https://github.com/o/r/releases/tag/v1.2.0";
    const zip =
        "https://github.com/o/r/releases/download/v1.2.0/expression-flow-extension.zip";

    it("reads the version and the zip link", () => {
        expect(
            toReleaseInfo({
                tag_name: "v1.2.0",
                html_url: page,
                assets: [
                    {
                        name: "expression-flow-extension.zip",
                        browser_download_url: zip,
                    },
                ],
            }),
        ).toEqual({ version: "1.2.0", pageUrl: page, zipUrl: zip });
    });

    it("links the release page when there is no zip", () => {
        expect(
            toReleaseInfo({ tag_name: "v1.2.0", html_url: page })?.zipUrl,
        ).toBe(page);
    });

    it("returns null without a tag", () => {
        expect(toReleaseInfo({ html_url: page })).toBeNull();
    });
});
