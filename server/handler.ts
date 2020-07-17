import "reflect-metadata";

import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import {createConnection, getConnectionManager} from "typeorm";

import {User} from "./entity/user";

require('dotenv').config();

// Use pg2 to force inclusion in final package
import * as pg2 from 'pg';
console.log(pg2 != null ? 'pg initialized' : '');

export async function createDB() {
  try {
    const connection  = await  createConnection({
      type: "postgres",
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      entities: [
        User,
      ],
      // entities: getMetadataArgsStorage().tables.map(tbl => tbl.target),
      synchronize: true,
      logging: true
    });
    console.log('Using NEW connection. Connected: ', connection.isConnected);
    return connection;
  } catch (err) {
    // If AlreadyHasActiveConnectionError occurs, return already existing connection
    if (err.name === "AlreadyHasActiveConnectionError") {
      const existingConnection = getConnectionManager().get("default");
      console.log('Using existing connection. Connected: ', existingConnection.isConnected);
      console.log('Using existing connection. Connected: ', existingConnection.entityMetadatas);

      return existingConnection;
    } else {
      throw err;
    }
  }
}

export const hello3: APIGatewayProxyHandler = async (event, _context) => {

  console.log('starting');

  const connection = await createDB();
  // console.log(connection);

  // const users1 = await connection.manager.find(User);
  // console.log(users1.length);

  const newViper = {
    clan: null,
    icon: null,
    name: 'TheViper' + new Date().getSeconds(),
    rank: 5,
    wins: 328,
    drops: 1,
    games: 470,
    losses: 142,
    rating: 2298,
    streak: 2,
    country: 'DE',
    steam_id: '76561197984749679',
    last_match: 1594417850,
    profile_id: 196240,
    lowest_streak: -5,
    highest_rating: 2341,
    highest_streak: 22,
    last_match_time: 1594417850,
    previous_rating: 2288
  };

  // console.log("Clear user table...");
  // await connection.getRepository(User).clear(); // remove all users

  let start = new Date();

  // const data = await fetchLeaderboard('aoe2de', 3, { count: 10000 });
  // const entries: ILeaderboardPlayerRaw[] = data.leaderboard;
  // console.log(entries.length);

  // console.log('==> ', (new Date().getTime() - start.getTime()));
  // start = new Date();

  let currentId = 1;

  console.log("Inserting a new user into the database...");
  const rows = [newViper].map(entry => {
      const user = new User();
      user.id = 4;//currentId++;
      user.name = entry.name;
      user.country = entry.country;
      user.rank = entry.rank;
      user.data = entry;
      return user;
  });

  const query = connection.createQueryBuilder()
      .insert()
      .into(User)
      .values(rows)
      .orUpdate({ conflict_target: ['id'], overwrite: ['name', 'country', 'rank', 'data'] });
  await query.execute();

  // await connection.manager.save(rows);
  console.log("Saved a new user with id...");

  console.log('==> ', (new Date().getTime() - start.getTime()));
  start = new Date();

  const users = await connection.manager.find(User, {where: { country: 'DE' }, skip: 0, take: 2 });
  // console.log(users);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hu:' + process.env.TWITTER_ACCESS_TOKEN + '. Ho:' + process.env.TWITTER_ACCESS_TOKEN2 + '. Go Serverless Webpack (Typescript) v10.0! Your function executed successfully!',
      // input: event,
      users: users,//.map(u => u.data),
    }, null, 2),
  };
}