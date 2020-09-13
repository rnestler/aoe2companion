import {createDB} from "./helper/db";
import {fetchLeaderboardRecentMatches, setValue} from "../../serverless/src/helper";
import {LeaderboardRow} from "../../serverless/entity/leaderboard-row";
import {upsertLeaderboardRows} from "../../serverless/entity/entity-helper";
import {createExpress} from "./helper/express";
import * as cron from "node-cron";


async function fetchLeaderboardData(leaderboardId: number) {
    const connection = await createDB();

    console.log(new Date(), "Fetch leaderboard recent matches", leaderboardId);
    let entries = await fetchLeaderboardRecentMatches(leaderboardId, 50);
    console.log(new Date(), 'GOT', entries.data.length);

    const leaderboardRows = entries.data.map(d => ({
        leaderboard_id: leaderboardId,
        steam_id: d.steam_id,
        profile_id: d.profile_id,
        rank: d.rank,
        rating: d.rating,
        previous_rating: d.previous_rating,
        country: d.country_code,
        name: d.name,
        // x1: d[7], profile
        // x2: d[8], profilefull
        // x3: d[9], profilemedium
        games: d.num_games,
        streak: d.streak,
        wins: d.num_wins,
        // finished: d[13],
        // drops: parseInt(d[14]),
        // longest_streak: d[15],
        // rank: d[16],
        // y1: d[17],
        // y2: d[18],
        // y3: d[19],
        // y4: d[20],
        last_match_time: d.last_match,
    } as LeaderboardRow));

    if (leaderboardRows.length > 0) {
        console.log(leaderboardRows[0].last_match_time, '-', leaderboardRows[leaderboardRows.length-1].last_match_time);
        await upsertLeaderboardRows(connection, leaderboardRows);
    } else {
        console.log('No elements');
    }
}

async function ingest() {
    console.log("Running ingest...");

    await fetchLeaderboardData(0);
    await fetchLeaderboardData(1);
    await fetchLeaderboardData(2);
    await fetchLeaderboardData(3);
    await fetchLeaderboardData(4);

    await setValue('leaderboardUpdated', new Date());
}

async function main() {
    await createDB();

    const app = createExpress();
    app.listen(process.env.PORT || 3003, () => console.log(`Server listening on port ${process.env.PORT || 3003}!`));

    // Every minute
    cron.schedule("* * * * *", ingest);
}

main();
