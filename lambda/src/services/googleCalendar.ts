/**
 * Google Calendar API Service
 *
 * Googleカレンダーとの連携を行うサービスモジュール
 */

import { google, calendar_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

// 環境変数から認証情報を読み込み
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Lambdaコンテナ再利用のためにグローバルスコープでキャッシュ
let oauth2Client: OAuth2Client | null = null;
let calendarApi: calendar_v3.Calendar | null = null;

/**
 * OAuth2クライアントを初期化（キャッシュあり）
 */
function getOAuth2Client(): OAuth2Client {
  if (oauth2Client) {
    return oauth2Client;
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
      "Google Calendar credentials not found. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN."
    );
  }

  oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

  return oauth2Client;
}

/**
 * Calendar APIクライアントを取得（キャッシュあり）
 */
function getCalendarApi(): calendar_v3.Calendar {
  if (calendarApi) {
    return calendarApi;
  }

  const auth = getOAuth2Client();
  calendarApi = google.calendar({ version: "v3", auth });

  return calendarApi;
}

/**
 * カレンダーイベントの形式
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
  location?: string;
}

/**
 * 予定一覧を取得（全カレンダーから）
 *
 * @param timeMin 検索開始日時（ISO 8601形式）
 * @param timeMax 検索終了日時（ISO 8601形式）
 * @returns イベントのリスト
 */
export async function listEvents(
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const calendar = getCalendarApi();

  try {
    // 全カレンダーのリストを取得
    const calendarListResponse = await calendar.calendarList.list();
    const calendars = calendarListResponse.data.items || [];

    console.log(`[GoogleCalendar] Found ${calendars.length} calendars`);

    // 各カレンダーから予定を取得
    const allEvents: CalendarEvent[] = [];

    for (const cal of calendars) {
      if (!cal.id) continue;

      try {
        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax,
          maxResults: 50,
          singleEvents: true,
          orderBy: "startTime",
        });

        const items = response.data.items || [];

        const events = items.map((event) => ({
          id: event.id || "",
          summary: event.summary || "（タイトルなし）",
          description: event.description || undefined,
          start: event.start?.dateTime || event.start?.date || "",
          end: event.end?.dateTime || event.end?.date || "",
          location: event.location || undefined,
        }));

        allEvents.push(...events);
      } catch (error: any) {
        // 個別のカレンダーでエラーが出ても続行
        console.error(`[GoogleCalendar] Error fetching calendar ${cal.summary}:`, error.message);
      }
    }

    // 開始時刻でソート
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    console.log(`[GoogleCalendar] Found ${allEvents.length} total events`);

    return allEvents;
  } catch (error: any) {
    console.error("[GoogleCalendar] listEvents error:", error);

    if (error.code === 401) {
      throw new Error(
        "Google Calendar認証が失敗しました。refresh tokenが無効化されている可能性があります。"
      );
    }

    throw new Error(`Google Calendar API error: ${error.message}`);
  }
}

/**
 * 新しい予定を追加
 *
 * @param summary イベントのタイトル
 * @param start 開始日時（ISO 8601形式）
 * @param end 終了日時（ISO 8601形式）
 * @param description イベントの説明（オプション）
 * @param location 場所（オプション）
 * @returns 作成されたイベント
 */
export async function createEvent(
  summary: string,
  start: string,
  end: string,
  description?: string,
  location?: string
): Promise<CalendarEvent> {
  const calendar = getCalendarApi();

  const event: calendar_v3.Schema$Event = {
    summary,
    description,
    location,
    start: { dateTime: start, timeZone: "Asia/Tokyo" },
    end: { dateTime: end, timeZone: "Asia/Tokyo" },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    const created = response.data;

    return {
      id: created.id || "",
      summary: created.summary || summary,
      description: created.description || undefined,
      start: created.start?.dateTime || start,
      end: created.end?.dateTime || end,
      location: created.location || undefined,
    };
  } catch (error: any) {
    console.error("[GoogleCalendar] createEvent error:", error);
    throw new Error(`Google Calendar API error: ${error.message}`);
  }
}

/**
 * 予定を更新
 *
 * @param eventId 更新対象のイベントID
 * @param updates 更新内容（部分更新可能）
 * @returns 更新されたイベント
 */
export async function updateEvent(
  eventId: string,
  updates: {
    summary?: string;
    start?: string;
    end?: string;
    description?: string;
    location?: string;
  }
): Promise<CalendarEvent> {
  const calendar = getCalendarApi();

  try {
    // 既存イベントを取得
    const existingEvent = await calendar.events.get({
      calendarId: "primary",
      eventId,
    });

    // 更新内容をマージ
    const updatedEvent: calendar_v3.Schema$Event = {
      ...existingEvent.data,
      summary: updates.summary ?? existingEvent.data.summary,
      description: updates.description ?? existingEvent.data.description,
      location: updates.location ?? existingEvent.data.location,
      start: updates.start
        ? { dateTime: updates.start, timeZone: "Asia/Tokyo" }
        : existingEvent.data.start,
      end: updates.end
        ? { dateTime: updates.end, timeZone: "Asia/Tokyo" }
        : existingEvent.data.end,
    };

    const response = await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: updatedEvent,
    });

    const updated = response.data;

    return {
      id: updated.id || eventId,
      summary: updated.summary || "",
      description: updated.description || undefined,
      start: updated.start?.dateTime || updated.start?.date || "",
      end: updated.end?.dateTime || updated.end?.date || "",
      location: updated.location || undefined,
    };
  } catch (error: any) {
    console.error("[GoogleCalendar] updateEvent error:", error);

    if (error.code === 404) {
      throw new Error(`イベントID ${eventId} が見つかりません。`);
    }

    throw new Error(`Google Calendar API error: ${error.message}`);
  }
}

/**
 * 予定を削除
 *
 * @param eventId 削除対象のイベントID
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const calendar = getCalendarApi();

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
  } catch (error: any) {
    console.error("[GoogleCalendar] deleteEvent error:", error);

    if (error.code === 404) {
      throw new Error(`イベントID ${eventId} が見つかりません。`);
    }

    throw new Error(`Google Calendar API error: ${error.message}`);
  }
}

/**
 * キーワードでイベントを検索
 *
 * @param keyword 検索キーワード（タイトルに含まれる）
 * @param timeMin 検索開始日時
 * @param timeMax 検索終了日時
 * @returns マッチしたイベントのリスト
 */
export async function searchEvents(
  keyword: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const events = await listEvents(timeMin, timeMax);

  return events.filter((event) =>
    event.summary.toLowerCase().includes(keyword.toLowerCase())
  );
}
