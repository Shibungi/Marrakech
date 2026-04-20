import { describe, expect, it } from "vitest";

import { buildShareUrl, resolveGameServerUrl } from "../network";

describe("resolveGameServerUrl", () => {
	it("prefers an explicit server URL", () => {
		expect(
			resolveGameServerUrl({
				configuredServer: "https://game.example.com/",
				configuredPort: "9000",
				location: { protocol: "http:", hostname: "192.168.0.10" },
			}),
		).toBe("https://game.example.com");
	});

	it("derives the server URL from the current host when no override is set", () => {
		expect(
			resolveGameServerUrl({
				configuredPort: "8000",
				location: { protocol: "https:", hostname: "play.example.com" },
			}),
		).toBe("https://play.example.com:8000");
	});
});

describe("buildShareUrl", () => {
	it("uses the configured public app origin when present", () => {
		expect(
			buildShareUrl("room-123", {
				href: "http://localhost:5173/?playerID=1&name=Akira",
				publicAppOrigin: "https://marrakech.example.com/",
			}),
		).toBe("https://marrakech.example.com/?matchID=room-123");
	});

	it("returns only the share path on localhost without a public origin", () => {
		expect(
			buildShareUrl("room-123", {
				href: "http://localhost:5173/?playerID=1&name=Akira",
			}),
		).toBe("/?matchID=room-123");
	});

	it("returns a full URL when the page is already on a non-localhost origin", () => {
		expect(
			buildShareUrl("room-123", {
				href: "https://play.example.com/?playerID=2&name=Hana",
			}),
		).toBe("https://play.example.com/?matchID=room-123");
	});
});