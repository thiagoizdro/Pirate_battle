import { delay, http, HttpResponse } from 'msw';

import {
  API_MAX_PAGE_SIZE,
  type ApiErrorBody,
  type MatchRecord,
  type Page,
  type RankingEntry,
  type RegisterMatchResponse,
} from '../api/contracts';
import { isMatchRecord } from '../api/validation';
import type { MockDb } from './db';
import { paginate } from './db';
import { generatedMatches } from './fixtures';
import type { Behaviour, MockNetwork } from './network';

/** How many extra rows the "multiple pages" scenario adds. */
const EXTRA_RANKING_ROWS = 20;
const EXTRA_HISTORY_ROWS = 12;

function errorResponse(status: number, error: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ error, message }, { status });
}

/**
 * Applies the scenario's latency and failure. Returns a response when the request must fail,
 * or null when the handler should continue normally.
 */
async function applyBehaviour(behaviour: Behaviour): Promise<Response | null> {
  await delay(behaviour.delayMs);
  if (behaviour.type === 'network-error') return HttpResponse.error();
  if (behaviour.type === 'status') {
    const message =
      behaviour.status >= 500 ? 'The service is temporarily unavailable.' : 'Invalid request.';
    return errorResponse(behaviour.status, `http_${behaviour.status}`, message);
  }
  return null;
}

/** Reads page and pageSize, or returns null if they are not valid positive integers. */
function readPaging(url: URL): { page: number; pageSize: number } | null {
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '5');
  const valid =
    Number.isInteger(page) &&
    page >= 1 &&
    Number.isInteger(pageSize) &&
    pageSize >= 1 &&
    pageSize <= API_MAX_PAGE_SIZE;
  return valid ? { page, pageSize } : null;
}

/**
 * The REST API mocked at the network level (R86). The same handlers run in the browser
 * (service worker, also in the published build) and in Node tests (msw/node).
 * Paths start with "*" so they match /api on any origin.
 */
export function createHandlers(db: MockDb, network: MockNetwork) {
  return [
    http.get('*/api/ranking', async ({ request }) => {
      const failure = await applyBehaviour(network.behaviourFor('ranking'));
      if (failure) return failure;
      const url = new URL(request.url);
      const paging = readPaging(url);
      const configKey = url.searchParams.get('configKey') ?? '';
      if (!paging || configKey === '') {
        return errorResponse(400, 'invalid_query', 'page, pageSize and configKey are required.');
      }
      if (network.emptyLists) {
        return HttpResponse.json<Page<RankingEntry>>(paginate([], paging.page, paging.pageSize));
      }
      const extra = network.extraPages
        ? generatedMatches('generated-crew', 'Deckhand Pete', configKey, EXTRA_RANKING_ROWS)
        : [];
      return HttpResponse.json<Page<RankingEntry>>(db.ranking({ ...paging, configKey }, extra));
    }),

    http.get('*/api/players/:playerId/matches', async ({ request, params }) => {
      const failure = await applyBehaviour(network.behaviourFor('history'));
      if (failure) return failure;
      const paging = readPaging(new URL(request.url));
      const playerId = typeof params.playerId === 'string' ? params.playerId : '';
      if (!paging || playerId === '') {
        return errorResponse(400, 'invalid_query', 'page and pageSize must be valid.');
      }
      if (network.emptyLists) {
        return HttpResponse.json<Page<MatchRecord>>(paginate([], paging.page, paging.pageSize));
      }
      const extra = network.extraPages
        ? generatedMatches(playerId, 'You', 'v1-120s-3s', EXTRA_HISTORY_ROWS)
        : [];
      return HttpResponse.json<Page<MatchRecord>>(db.history({ ...paging, playerId }, extra));
    }),

    http.put('*/api/matches/:matchId', async ({ request, params }) => {
      const matchId = typeof params.matchId === 'string' ? params.matchId : '';
      const behaviour = network.behaviourFor('register', matchId);
      if (behaviour.type !== 'save-then-hang') {
        const failure = await applyBehaviour(behaviour);
        if (failure) return failure;
      }

      const body: unknown = await request.json().catch(() => null);
      if (!isMatchRecord(body) || body.matchId !== matchId) {
        return errorResponse(400, 'invalid_record', 'The match record is invalid.');
      }
      if (!Number.isInteger(body.score) || body.score < 0 || body.durationMs < 0) {
        return errorResponse(422, 'invalid_values', 'Score and duration must be non-negative.');
      }

      const result = db.upsert(body);
      if (behaviour.type === 'save-then-hang') {
        // The record is stored, but the answer arrives after the client gave up (R92).
        await delay(behaviour.delayMs);
      }
      return HttpResponse.json<RegisterMatchResponse>(result, {
        status: result.created ? 201 : 200,
      });
    }),
  ];
}
