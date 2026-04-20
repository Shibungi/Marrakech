/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_GAME_SERVER?: string;
	readonly VITE_GAME_SERVER_PORT?: string;
	readonly VITE_PUBLIC_APP_ORIGIN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
