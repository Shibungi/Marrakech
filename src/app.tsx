import { LobbyClient } from "boardgame.io/client";
import { useEffect, useMemo, useState } from "react";

import type { PlayerId } from "./game/types";
import { GamePage } from "./pages/GamePage";
import { buildShareUrl, getGameServerUrl, getPublicAppOrigin, isLocalhostHost } from "./network";

const GAME_NAME = "marrakech";
const PLAYER_NAME_STORAGE_KEY = "marrakech:player-name";

type RoomPlayer = {
  id: number;
  name?: string;
};

type RoomMetadata = {
  matchID: string;
  players?: RoomPlayer[];
};

function normalizePlayerID(value: string | null | undefined): PlayerId {
  if (value === "1" || value === "2") {
    return value;
  }

  return "0";
}

function getInitialQueryParam(name: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

function createCredentialsStorageKey(matchID: string, playerID: PlayerId): string {
  return `marrakech:credentials:${matchID}:${playerID}`;
}

function getStoredCredentials(matchID: string, playerID: PlayerId): string | null {
  if (typeof window === "undefined" || !matchID) {
    return null;
  }

  return window.localStorage.getItem(createCredentialsStorageKey(matchID, playerID));
}

function storeCredentials(matchID: string, playerID: PlayerId, credentials: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    createCredentialsStorageKey(matchID, playerID),
    credentials,
  );
}

function syncRoomParams(matchID: string, playerID: PlayerId): void {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);

  if (matchID) {
    params.set("matchID", matchID);
    params.set("playerID", playerID);
  } else {
    params.delete("matchID");
    params.delete("playerID");
  }

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

function formatLobbyError(error: unknown): string {
  if (error && typeof error === "object") {
    const details = (error as { details?: { error?: unknown } }).details;
    if (details && typeof details.error === "string") {
      return details.error;
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "ルーム操作に失敗しました。";
}

export default function App() {
  const initialPlayerID = normalizePlayerID(getInitialQueryParam("playerID"));
  const initialMatchID = getInitialQueryParam("matchID")?.trim() ?? "";
  const serverUrl = useMemo(() => getGameServerUrl(), []);
  const lobbyClient = useMemo(() => new LobbyClient({ server: serverUrl }), [serverUrl]);
  const [playerID, setPlayerID] = useState<PlayerId>(initialPlayerID);
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return getInitialQueryParam("name") ?? window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "";
  });
  const [matchID, setMatchID] = useState(initialMatchID);
  const [credentials, setCredentials] = useState<string | null>(() =>
    getStoredCredentials(initialMatchID, initialPlayerID),
  );
  const [roomInfo, setRoomInfo] = useState<RoomMetadata | null>(null);
  const [busyAction, setBusyAction] = useState<"create" | "join" | "refresh" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [matchRefreshKey, setMatchRefreshKey] = useState(0);
  const publicAppOrigin = useMemo(() => getPublicAppOrigin(), []);
  const currentHostname = typeof window === "undefined" ? "localhost" : window.location.hostname;
  const usingLocalhostOrigin = isLocalhostHost(currentHostname);
  const sharingPublicUrl = Boolean(publicAppOrigin) || !usingLocalhostOrigin;

  const launchHint = publicAppOrigin
    ? `公開用 URL は ${publicAppOrigin} です。Share URL をそのまま友人に送れます。`
    : usingLocalhostOrigin
      ? "localhost のままでは他端末からアクセスできません。LAN IP かトンネル経由の公開 URL を設定して共有してください。"
      : "この URL を友人に共有し、空いている Player を選んでもらえば同じルームに参加できます。";

  const shareValue = useMemo(() => {
    return buildShareUrl(matchID, {
      href: typeof window === "undefined" ? null : window.location.href,
      publicAppOrigin,
    });
  }, [matchID, publicAppOrigin]);

  useEffect(() => {
    syncRoomParams(matchID, playerID);
  }, [matchID, playerID]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const trimmedName = playerName.trim();
    if (trimmedName) {
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmedName);
    }
  }, [playerName]);

  useEffect(() => {
    setCredentials(getStoredCredentials(matchID, playerID));
  }, [matchID, playerID]);

  useEffect(() => {
    if (!matchID) {
      setRoomInfo(null);
      return;
    }

    let cancelled = false;

    void lobbyClient
      .getMatch(GAME_NAME, matchID)
      .then((match) => {
        if (!cancelled) {
          setRoomInfo(match as RoomMetadata);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoomInfo(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lobbyClient, matchID, matchRefreshKey]);

  const seats = (["0", "1", "2"] as PlayerId[]).map((id) => ({
    id,
    player: roomInfo?.players?.find((player) => String(player.id) === id),
  }));

  const canCreateOrJoin = playerName.trim().length > 0;
  const canJoinRoom = canCreateOrJoin && matchID.trim().length > 0;
  const isJoined = Boolean(matchID && credentials);

  const refreshRoom = async (): Promise<void> => {
    if (!matchID) {
      return;
    }

    setBusyAction("refresh");
    setErrorMessage(null);

    try {
      await lobbyClient.getMatch(GAME_NAME, matchID);
      setMatchRefreshKey((value) => value + 1);
      setStatusMessage(`ルーム ${matchID} の最新状態を更新しました。`);
    } catch (error) {
      setErrorMessage(formatLobbyError(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateRoom = async (): Promise<void> => {
    if (!canCreateOrJoin) {
      setErrorMessage("プレイヤー名を入力してください。");
      return;
    }

    setBusyAction("create");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { matchID: createdMatchID } = await lobbyClient.createMatch(GAME_NAME, {
        numPlayers: 3,
      });
      const joinResponse = await lobbyClient.joinMatch(GAME_NAME, createdMatchID, {
        playerID,
        playerName: playerName.trim(),
      });
      const nextPlayerID = normalizePlayerID(joinResponse.playerID);

      storeCredentials(createdMatchID, nextPlayerID, joinResponse.playerCredentials);
      setMatchID(createdMatchID);
      setPlayerID(nextPlayerID);
      setCredentials(joinResponse.playerCredentials);
      setMatchRefreshKey((value) => value + 1);
      setStatusMessage(
        `ルーム ${createdMatchID} を作成し、Player ${nextPlayerID} として参加しました。`,
      );
    } catch (error) {
      setErrorMessage(formatLobbyError(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoinRoom = async (): Promise<void> => {
    const normalizedMatchID = matchID.trim();
    if (!normalizedMatchID) {
      setErrorMessage("参加する Match ID を入力してください。");
      return;
    }
    if (!canCreateOrJoin) {
      setErrorMessage("プレイヤー名を入力してください。");
      return;
    }

    const storedCredentials = getStoredCredentials(normalizedMatchID, playerID);
    if (storedCredentials) {
      setMatchID(normalizedMatchID);
      setCredentials(storedCredentials);
      setStatusMessage(
        `保存済みの資格情報でルーム ${normalizedMatchID} に再接続しました。`,
      );
      setMatchRefreshKey((value) => value + 1);
      return;
    }

    setBusyAction("join");
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const joinResponse = await lobbyClient.joinMatch(GAME_NAME, normalizedMatchID, {
        playerID,
        playerName: playerName.trim(),
      });
      const nextPlayerID = normalizePlayerID(joinResponse.playerID);

      storeCredentials(normalizedMatchID, nextPlayerID, joinResponse.playerCredentials);
      setMatchID(normalizedMatchID);
      setPlayerID(nextPlayerID);
      setCredentials(joinResponse.playerCredentials);
      setMatchRefreshKey((value) => value + 1);
      setStatusMessage(
        `ルーム ${normalizedMatchID} の Player ${nextPlayerID} に参加しました。`,
      );
    } catch (error) {
      setErrorMessage(formatLobbyError(error));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyShareValue = async (): Promise<void> => {
    if (!shareValue || typeof navigator === "undefined" || !navigator.clipboard) {
      setErrorMessage("共有 URL をコピーできませんでした。");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareValue);
      setStatusMessage(
        sharingPublicUrl
          ? "共有 URL をコピーしました。"
          : "共有用パスをコピーしました。LAN IP か公開 URL の後ろに貼り付けて共有してください。",
      );
    } catch {
      setErrorMessage("共有 URL をコピーできませんでした。");
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">roadmap.md / Phase 10 + 13</p>
          <h1>Marrakech boardgame.io</h1>
          <p className="hero-text">
            ローカルネットワーク上でルームを作成し、共有 URL から 3 人対戦に参加できる構成へ進めました。
          </p>
          <p className="hint">{launchHint}</p>
          <div className="hero-meta">
            <span>Game server: {serverUrl}</span>
            <span>Seats: 3 players fixed</span>
          </div>
        </div>

        <div className="control-card">
          <label className="field">
            <span>Player Name</span>
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="例: Akira"
            />
          </label>

          <label className="field">
            <span>Player Seat</span>
            <select
              value={playerID}
              onChange={(event) => setPlayerID(normalizePlayerID(event.target.value))}
            >
              <option value="0">0 / A</option>
              <option value="1">1 / B</option>
              <option value="2">2 / C</option>
            </select>
          </label>

          <label className="field">
            <span>Match ID</span>
            <input
              value={matchID}
              onChange={(event) => setMatchID(event.target.value)}
              placeholder="create すると自動入力されます"
            />
          </label>

          <div className="button-row">
            <button
              className="primary-button"
              type="button"
              onClick={handleCreateRoom}
              disabled={busyAction !== null || !canCreateOrJoin}
            >
              {busyAction === "create" ? "Creating..." : "Create Room"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handleJoinRoom}
              disabled={busyAction !== null || !canJoinRoom}
            >
              {busyAction === "join" ? "Joining..." : "Join Seat"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void refreshRoom()}
              disabled={busyAction !== null || !matchID}
            >
              {busyAction === "refresh" ? "Refreshing..." : "Refresh Room"}
            </button>
          </div>

          <label className="field">
            <span>{sharingPublicUrl ? "Share URL" : "Share Path"}</span>
            <div className="room-link-row">
              <input readOnly value={shareValue} placeholder="ルーム作成後に共有リンクが入ります" />
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={() => void handleCopyShareValue()}
                disabled={!shareValue}
              >
                Copy
              </button>
            </div>
          </label>

          {!sharingPublicUrl && (
            <p className="notice warning">
              共有時は <strong>localhost</strong> ではなく
              <strong> http://&lt;このPCのLAN IP&gt;:5173</strong>
              または設定した公開 URL に上の Share Path を付けて送ってください。
            </p>
          )}

          {statusMessage && <p className="notice success">{statusMessage}</p>}
          {errorMessage && <p className="notice error">{errorMessage}</p>}
        </div>
      </header>

      <section className="panel panel-stack">
        <p className="panel-title">Room Seats</p>
        <div className="seat-grid">
          {seats.map((seat) => (
            <article
              className={`seat-card ${seat.id === playerID ? "selected" : ""}`}
              key={seat.id}
            >
              <span>Player {seat.id}</span>
              <strong>{seat.player?.name ?? "Open seat"}</strong>
            </article>
          ))}
        </div>
      </section>

      {isJoined ? (
        <GamePage
          key={`${matchID}:${playerID}`}
          matchID={matchID}
          playerID={playerID}
          credentials={credentials ?? undefined}
        />
      ) : (
        <section className="panel placeholder-panel">
          <p className="panel-title">Ready To Play</p>
          <p className="lead">
            ルームを作成するか、共有された Match ID に参加すると盤面を表示します。
          </p>
        </section>
      )}
    </div>
  );
}
