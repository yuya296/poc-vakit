import type {
  CreateCalendarEventInput,
  CreateCalendarEventOutput,
  ListCalendarEventsInput,
  ListCalendarEventsOutput,
} from '../types.js';

/**
 * n8n Webhook経由でGoogle Calendarイベントを作成
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput,
  webhookBaseUrl: string,
  bearerToken: string
): Promise<CreateCalendarEventOutput> {
  try {
    const url = `${webhookBaseUrl}/calendar-create`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        title: input.title,
        start: input.start,
        end: input.end || input.start,
        description: input.description || '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      success: data.success ?? true,
      eventId: data.eventId,
      start: data.start,
      end: data.end,
    };
  } catch (error) {
    console.error('createCalendarEvent error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * n8n Webhook経由でGoogle Calendarイベント一覧を取得
 */
export async function listCalendarEvents(
  input: ListCalendarEventsInput,
  webhookBaseUrl: string,
  bearerToken: string
): Promise<ListCalendarEventsOutput> {
  try {
    const url = `${webhookBaseUrl}/calendar-list`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        dateRangeStart: input.dateRangeStart,
        dateRangeEnd: input.dateRangeEnd,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook error: ${response.status} ${errorText}`);
    }

    const responseText = await response.text();
    console.log('n8n raw response:', responseText);

    if (!responseText) {
      throw new Error('Empty response from n8n webhook');
    }

    const data = JSON.parse(responseText);

    // デバッグ: n8nからのレスポンスを確認
    console.log('n8n response:', JSON.stringify(data, null, 2));

    // n8nからのレスポンス形式に応じて調整
    // n8nは配列を返すが、各要素は {json: {...}} の形式
    let events = Array.isArray(data.events) ? data.events : (Array.isArray(data) ? data : []);

    // {json: {...}} 形式の場合は .json を取り出す
    events = events.map((item: any) => item.json || item);

    return {
      success: true,
      events: events.map((event: any) => ({
        title: event.summary || event.title || 'Untitled',
        start: event.start?.dateTime || event.start?.date || event.start,
        end: event.end?.dateTime || event.end?.date || event.end,
        description: event.description || '',
      })),
    };
  } catch (error) {
    console.error('listCalendarEvents error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      events: [],
    };
  }
}
