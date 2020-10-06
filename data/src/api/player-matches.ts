import {fromUnixTime, parseISO} from "date-fns";
import {uniqBy} from "lodash";


function convertTimestampsToDates(json: IMatchRaw): IMatch {
    return {
        ...json,
        players: json.players,
        started: json.started ? fromUnixTime(json.started) : undefined,
        finished: json.finished ? fromUnixTime(json.finished) : undefined,
        opened: json.opened ? fromUnixTime(json.opened) : undefined,
    };
}

function convertTimestampsToDates2(json: IMatchRaw): IMatch {
    return {
        ...json,
        players: json.players,
        started: json.started ? parseISO(json.started) : undefined,
        finished: json.finished ? parseISO(json.finished) : undefined,
        opened: json.opened ? parseISO(json.opened) : undefined,
    };
}

export interface IFetchMatchesParams {
    steam_id?: string;
    profile_id?: number;
}

import request, {gql} from "graphql-request";
import {makeQueryString, makeQueryStringRaw} from '../lib/util';
import {getHost} from '../lib/host';
import {IMatch, IMatchRaw} from './api.types';
import {fetchJson} from '../lib/fetch-json';


export async function fetchPlayerMatches(game: string, start: number, count: number, params: IFetchMatchesParams[]): Promise<IMatch[]> {
    if (params.length === 0) {
        return [];
    }
    const args = {
        game,
        start,
        count,
        profile_ids: params.map(p => p.profile_id),
    };
    const queryString = makeQueryString(args);
    const url = getHost('aoe2net') + `api/player/matches?${queryString}`;

    // profile_ids: [196240]

    const endpoint = 'http://localhost:3333/graphql'
    const query = gql`
        query H2($start: Int!, $count: Int!, $profile_ids: [Int!]) {
            matches(
                start: $start,
                count: $count,
                profile_ids: $profile_ids
            ) {
                total
                matches {
                    match_id
                    leaderboard_id
                    name
                    map_type
                    speed
                    num_players
                    started
                    finished
                    players {
                        profile_id
                        steam_id
                        name
                        country
                        rating
                        civ
                        slot
                        slot_type
                        color
                        won
                        team
                    }
                }
            }
        }
    `;

    const timeLastDate = new Date();
    const variables = { start, count, profile_ids: params.map(p => p.profile_id) };
    // console.groupCollapsed('fetchPlayerMatches - matches()');
    // console.log(query);
    // console.groupEnd();
    // console.log(variables);
    const data = await request(endpoint, query, variables)
    console.log('gql', new Date().getTime() - timeLastDate.getTime());

    let json = data.matches.matches as IMatchRaw[];
    // console.log(json);
    // let json2 = await fetchJson('fetchPlayerMatches', url) as IMatchRaw[];
    // console.log(json2);

    // TODO: Temporary fix: Filter duplicate matches
    json = uniqBy(json, m => m.match_id);

    return json.map(match => convertTimestampsToDates2(match));
    // return json2.map(match => convertTimestampsToDates(match));
}



export async function fetchPlayerMatchesLegacy(game: string, start: number, count: number, params: IFetchMatchesParams[]): Promise<IMatch[]> {
    if (params.length === 0) {
        return [];
    }
    const args = {
        game,
        start,
        count,
        profile_ids: params.map(p => p.profile_id),
    };
    const queryString = makeQueryStringRaw(args);
    const url = getHost('aoe2net') + `api/player/matches?${queryString}`;
    let json = await fetchJson('fetchPlayerMatches', url) as IMatchRaw[];

    // TODO: Temporary fix: Filter duplicate matches
    json = uniqBy(json, m => m.match_id);

    return json.map(match => convertTimestampsToDates(match));
}

export async function fetchPlayerMatchesLegacyRaw(game: string, start: number, count: number, params: IFetchMatchesParams[]): Promise<IMatchRaw[]> {
    if (params.length === 0) {
        return [];
    }
    const args = {
        game,
        start,
        count,
        profile_ids: params.map(p => p.profile_id),
    };
    const queryString = makeQueryStringRaw(args);
    const url = getHost('aoe2net') + `api/player/matches?${queryString}`;
    let json = await fetchJson('fetchPlayerMatches', url) as IMatchRaw[];

    // TODO: Temporary fix: Filter duplicate matches
    json = uniqBy(json, m => m.match_id);

    return json;
}