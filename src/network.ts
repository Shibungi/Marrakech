const DEFAULT_GAME_SERVER_PORT = "8000";

type LocationForServerUrl = {
	protocol: string;
	hostname: string;
};

type ShareUrlOptions = {
	href?: string | null;
	publicAppOrigin?: string | null;
};

type ServerUrlOptions = {
	configuredServer?: string | null;
	configuredPort?: string | null;
	location?: LocationForServerUrl | null;
};

function trimTrailingSlash(value: string): string {
	return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeOptionalValue(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

export function isLocalhostHost(hostname: string): boolean {
	return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getPublicAppOrigin(): string | null {
	const configuredOrigin = normalizeOptionalValue(import.meta.env.VITE_PUBLIC_APP_ORIGIN);
	return configuredOrigin ? trimTrailingSlash(configuredOrigin) : null;
}

export function resolveGameServerUrl(options: ServerUrlOptions = {}): string {
	const configuredServer = normalizeOptionalValue(options.configuredServer);
	if (configuredServer) {
		return trimTrailingSlash(configuredServer);
	}

	const port = normalizeOptionalValue(options.configuredPort) || DEFAULT_GAME_SERVER_PORT;
	const location = options.location;

	if (!location) {
		return `http://localhost:${port}`;
	}

	const protocol = location.protocol === "https:" ? "https:" : "http:";
	const hostname = location.hostname || "localhost";

	return `${protocol}//${hostname}:${port}`;
}

export function getGameServerUrl(): string {
	return resolveGameServerUrl({
		configuredServer: import.meta.env.VITE_GAME_SERVER,
		configuredPort: import.meta.env.VITE_GAME_SERVER_PORT,
		location: typeof window === "undefined" ? null : window.location,
	});
}

export function buildShareUrl(matchID: string, options: ShareUrlOptions = {}): string {
	const normalizedMatchID = matchID.trim();
	if (!normalizedMatchID) {
		return "";
	}

	const href = options.href ?? (typeof window === "undefined" ? null : window.location.href);
	if (!href) {
		return "";
	}

	const url = new URL(href);
	url.searchParams.set("matchID", normalizedMatchID);
	url.searchParams.delete("playerID");
	url.searchParams.delete("name");

	const publicAppOrigin = normalizeOptionalValue(options.publicAppOrigin);
	if (publicAppOrigin) {
		return `${trimTrailingSlash(publicAppOrigin)}${url.pathname}${url.search}`;
	}

	if (isLocalhostHost(url.hostname)) {
		return `${url.pathname}${url.search}`;
	}

	return url.toString();
}