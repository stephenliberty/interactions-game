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
export interface PROPS_USED_BY {
  prop_id: string;
  used_by: string;
}
export interface FEATURES {
  id: string;
  name: string;
}
export interface PROPS_SEED {
  props: Map<
    string,
    {
      usedBy: string[];
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

async function seedData(db: Database) {
  await db.exec(`
    CREATE TABLE props (id PRIMARY KEY, name);
    CREATE TABLE props_used_by (prop_id, used_by);
    CREATE TABLE features (id PRIMARY_KEY, name);
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
    for (const used_by_entry of entry[1].usedBy) {
      await db.run(
        'INSERT INTO props_used_by (prop_id, used_by) VALUES (?, ?)',
        entry[0],
        used_by_entry,
      );
    }
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
