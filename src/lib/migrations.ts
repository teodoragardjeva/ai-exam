// Schema migrations, applied in order at server start (see src/instrumentation.ts).
// Never edit a migration that has already run on the server: add a new one instead.
// Grants for the n8n database roles are applied separately on every start (src/lib/migrate.ts).

export type Migration = { id: string; sql: string };

export const TICKET_STATUSES = [
  "New",
  "Auto-answered",
  "Waiting for approval",
  "Approved & sent",
  "Rejected",
  "Manual review",
  "Closed",
] as const;

export const DEPARTMENTS = [
  "Technical support",
  "Returns & refunds",
  "Shipping & delivery",
  "Billing & invoices",
  "Other",
] as const;

export const URGENCIES = ["Low", "Medium", "High"] as const;

const sqlList = (values: readonly string[]) => values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");

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
  {
    // Only pgvector, pinned to "public". We don't create "uuid-ossp": an extension lives in one
    // schema per database, n8n creates it in its own schema "n8n", and our tables use the
    // built-in gen_random_uuid() instead. (Edited after it ran on the server: on an existing
    // database IF NOT EXISTS makes it a no-op either way.)
    id: "002_extensions",
    sql: `
      CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
    `,
  },
  {
    // Appendix B. Dates are relative to the day the migration runs (exam day),
    // so the 30-day and 24-month rules can be tested.
    id: "003_orders",
    sql: `
      CREATE TABLE orders (
        order_number    text PRIMARY KEY,
        customer_name   text          NOT NULL,
        customer_email  text          NOT NULL,
        product         text          NOT NULL,
        purchase_date   date          NOT NULL,
        amount_eur      numeric(10,2) NOT NULL CHECK (amount_eur >= 0),
        delivery_status text          NOT NULL,
        created_at      timestamptz   NOT NULL DEFAULT now()
      );

      INSERT INTO orders (order_number, customer_name, customer_email, product, purchase_date, amount_eur, delivery_status) VALUES
        ('HT-10421', 'Мария Петрова',      'maria.petrova@example.com', 'HT Plug Mini (2 бр.)', CURRENT_DATE - 5,                    39.80, 'Доставена'),
        ('HT-10422', 'Георги Иванов',      'georgi.ivanov@example.com', 'HT Cam Outdoor',       CURRENT_DATE - 12,                  149.00, 'Доставена'),
        ('HT-10423', 'Елена Димитрова',    'elena.d@example.com',       'HT Thermo 2',          CURRENT_DATE - 45,                  129.00, 'Доставена'),
        ('HT-10424', 'Николай Стоянов',    'n.stoyanov@example.com',    'HT Hub + 3 сензора',   (CURRENT_DATE - interval '30 months')::date, 199.00, 'Доставена'),
        ('HT-10425', 'Anna Schmidt',       'anna.schmidt@example.de',   'HT Cam Indoor',        CURRENT_DATE - 3,                    59.00, 'В движение'),
        ('HT-10426', 'Иван Колев',         'ivan.kolev@example.com',    'HT Plug Mini',         CURRENT_DATE - 20,                   19.90, 'Доставена'),
        ('HT-10427', 'Десислава Маринова', 'desi.marinova@example.com', 'HT Thermo 2',          CURRENT_DATE - 8,                   129.00, 'Доставена'),
        ('HT-10428', 'Петър Георгиев',     'p.georgiev@example.com',    'HT Hub',               CURRENT_DATE - 2,                    89.00, 'Неизпратена');
    `,
  },
  {
    id: "004_tickets",
    sql: `
      CREATE SEQUENCE ticket_number_seq START 1001;

      CREATE TABLE tickets (
        id                   bigserial PRIMARY KEY,
        ticket_number        text        NOT NULL UNIQUE
                               DEFAULT 'T-' || lpad(nextval('ticket_number_seq')::text, 6, '0'),
        created_at           timestamptz NOT NULL DEFAULT now(),
        updated_at           timestamptz NOT NULL DEFAULT now(),
        order_number         text        NOT NULL REFERENCES orders(order_number),
        customer_name        text        NOT NULL,
        customer_email       text        NOT NULL,
        message              text        NOT NULL,
        photo_path           text,
        photo_description    text,
        language             text,
        department           text CHECK (department IN (${sqlList(DEPARTMENTS)})),
        sentiment            text,
        sentiment_score      numeric(4,3),
        sentiment_confidence numeric(4,3),
        urgency              text CHECK (urgency IN (${sqlList(URGENCIES)})),
        ai_summary           text,
        ai_draft_reply       text,
        answer_found_in_kb   boolean,
        final_reply          text,
        refund_requested     boolean     NOT NULL DEFAULT false,
        refund_amount        numeric(10,2),
        policy_rule          text,
        status               text        NOT NULL DEFAULT 'New' CHECK (status IN (${sqlList(TICKET_STATUSES)})),
        status_reason        text,
        handled_by           text
      );

      CREATE INDEX tickets_status_idx ON tickets (status);
      CREATE INDEX tickets_created_at_idx ON tickets (created_at DESC);

      -- updated_at + live updates for the staff dashboard (SSE listens on "tickets_changed").
      CREATE FUNCTION tickets_touch_and_notify() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          NEW.updated_at := now();
        END IF;
        PERFORM pg_notify('tickets_changed', json_build_object(
          'op', TG_OP, 'ticket_number', NEW.ticket_number, 'status', NEW.status)::text);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER tickets_touch_and_notify
        BEFORE INSERT OR UPDATE ON tickets
        FOR EACH ROW EXECUTE FUNCTION tickets_touch_and_notify();
    `,
  },
  {
    // Matches the columns the n8n PGVector Store node uses. 1536 = text-embedding-3-small.
    id: "005_kb_documents",
    sql: `
      CREATE TABLE kb_documents (
        id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        text      text  NOT NULL,
        metadata  jsonb NOT NULL DEFAULT '{}'::jsonb,
        embedding vector(1536)
      );
      CREATE INDEX kb_documents_source_idx ON kb_documents ((metadata->>'source'));
    `,
  },
  {
    id: "006_logs",
    sql: `
      CREATE TABLE security_log (
        id            bigserial PRIMARY KEY,
        created_at    timestamptz NOT NULL DEFAULT now(),
        source_field  text        NOT NULL,
        original_text text        NOT NULL,
        reason        text        NOT NULL,
        ticket_number text
      );

      CREATE TABLE error_log (
        id            bigserial PRIMARY KEY,
        created_at    timestamptz NOT NULL DEFAULT now(),
        workflow      text,
        node          text,
        message       text NOT NULL,
        execution_url text
      );
    `,
  },
  {
    // Same shape the n8n Postgres Chat Memory node creates; created here so the
    // workflow role doesn't need CREATE rights on the public schema.
    id: "007_chat_memory",
    sql: `
      CREATE TABLE n8n_chat_histories (
        id         serial PRIMARY KEY,
        session_id varchar(255) NOT NULL,
        message    jsonb        NOT NULL
      );
      CREATE INDEX n8n_chat_histories_session_idx ON n8n_chat_histories (session_id);
    `,
  },
  {
    // The scaffold's example contact form is replaced by tickets.
    id: "008_drop_contact_messages",
    sql: `DROP TABLE IF EXISTS contact_messages;`,
  },
  {
    // Settings n8n reads from the database (e.g. manager_email for approval emails),
    // so n8n never needs access to environment variables. Written by the app on start.
    id: "009_app_settings",
    sql: `
      CREATE TABLE app_settings (
        key        text PRIMARY KEY,
        value      text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `,
  },
];
