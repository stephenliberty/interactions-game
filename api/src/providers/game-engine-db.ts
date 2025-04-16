import { verbose } from 'sqlite3';
import { promises as fsp } from 'fs';
const sqlite3 = verbose();
import { Database, open } from 'sqlite';
import { parse as yamlParse } from 'yaml';

/*
 * We're just using this because a game engine instance need something
 * slightly more complicated than dynamodb to put together all the pieces
 * but not so much as to need a running db service. Given that we've got static
 * lists of content that will not change unless a new deployment rolls out
 * it makes sense to just have a local sqlite do the
 * heavy lifting. This is a bit messy but there's plenty of
 * opportunity to clean it up later :)
 */

export interface PROPS {
  id: string;
  name: string;
}
export interface FEATURES {
  id: string;
  name: string;
}
export interface PROPS_SEED {
  props: Map<
    string,
    {
      name: string;
    }
  >;
}
export interface FEATURES_SEED {
  features: Map<
    string,
    {
      name: string;
    }
  >;
}
interface INTERACTION_REQUIREMENTS_FOR_PLAYER {
  props?: string[];
  features?: [];
}
export interface INTERACTIONS_SEED {
  interactions: {
    interaction: string;
    virtual: number;
    intensity: number;
    requires?: {
      fromPlayer?: INTERACTION_REQUIREMENTS_FOR_PLAYER;
      toPlayer?: INTERACTION_REQUIREMENTS_FOR_PLAYER;
    };
  }[];
}

async function seedData(db: Database) {
  await db.exec(`
    CREATE TABLE props (id PRIMARY KEY, name);
    CREATE TABLE features (id PRIMARY_KEY, name);
    CREATE TABLE interactions (id INTEGER PRIMARY KEY AUTOINCREMENT, description, intensity, virtual);
    CREATE TABLE interactions_prop (id PRIMARY_KEY, interaction_id INTEGER, player_side);
    CREATE TABLE interactions_feature (id PRIMARY_KEY, interaction_id INTEGER, player_side);
  `);
  const props = await fsp.readFile(process.env.PROPS_SEED_FILE, {
    encoding: 'utf8',
  });
  const propsSeed = yamlParse(props) as PROPS_SEED;
  propsSeed.props = new Map(Object.entries(propsSeed.props));
  for (const entry of propsSeed.props.entries()) {
    await db.run(
      'INSERT INTO props (id, name) VALUES (?, ?)',
      entry[0],
      entry[1].name,
    );
  }

  const features = await fsp.readFile(process.env.FEATURES_SEED_FILE, {
    encoding: 'utf8',
  });
  const featuresSeed = yamlParse(features) as FEATURES_SEED;
  featuresSeed.features = new Map(Object.entries(featuresSeed.features));
  for (const entry of featuresSeed.features.entries()) {
    await db.run(
      'INSERT INTO features (id, name) VALUES (?, ?)',
      entry[0],
      entry[1].name,
    );
  }

  const interactions = await fsp.readFile(process.env.INTERACTIONS_SEED_FILE, {
    encoding: 'utf8',
  });
  const interactionsSeed = yamlParse(interactions) as INTERACTIONS_SEED;
  for (const entry of interactionsSeed.interactions) {
    const res = await db.run(
      'INSERT INTO interactions (description, intensity, virtual) VALUES (?, ?, ?)',
      entry.interaction,
      entry.intensity,
      entry.virtual,
    );
    const id = res.lastID;
    if (entry.requires) {
      if (entry.requires.fromPlayer) {
        await insertPlayerPropReq(
          db,
          id,
          entry.requires.fromPlayer.props || [],
          'from',
        );
        await insertPlayerFeatureReq(
          db,
          id,
          entry.requires.fromPlayer.features || [],
          'from',
        );
      }
      if (entry.requires.toPlayer) {
        await insertPlayerPropReq(
          db,
          id,
          entry.requires.toPlayer.props || [],
          'to',
        );
        await insertPlayerFeatureReq(
          db,
          id,
          entry.requires.toPlayer.features || [],
          'to',
        );
      }
    }
  }
}

async function insertPlayerPropReq(db, interactionId, props, player_side) {
  for (const prop of props) {
    await db.run(
      'INSERT INTO interactions_prop (id, interaction_id, player_side) values (?, ?, ?)',
      prop,
      interactionId,
      player_side,
    );
  }
}
async function insertPlayerFeatureReq(db, interactionId, props, player_side) {
  for (const prop of props) {
    await db.run(
      'INSERT INTO interactions_feature (id, interaction_id, player_side) values (?, ?, ?)',
      prop,
      interactionId,
      player_side,
    );
  }
}

export const connectionProvider = {
  provide: Database,
  useFactory: async () => {
    const db = await open({
      filename: ':memory:',
      driver: sqlite3.Database,
    });

    await seedData(db);

    return db;
  },
};
