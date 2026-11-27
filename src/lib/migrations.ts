// Schema migrations, applied in order at server start (see src/instrumentation.ts).
// Never edit a migration that has already run on the server: add a new one instead.
// On exam day, add the topic's tables as 002, 003, ...

export type Migration = { id: string; sql: string };

export const migrations: Migration[] = [
  {
    id: "001_contact_messages",
    sql: `
      CREATE TABLE contact_messages (
        id         bigserial PRIMARY KEY,
        name       text        NOT NULL,
        email      text        NOT NULL,
        message    text        NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `,
  },
];
