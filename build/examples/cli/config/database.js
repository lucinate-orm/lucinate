import { defineConfig } from '../../../index.js';
export default defineConfig({
    connection: 'default',
    connections: {
        default: {
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                /** Resolved relative to `process.cwd()` — run migrate/seed from `examples/cli`. */
                filename: './demo.sqlite',
            },
            migrations: {
                paths: ['../../build/examples/cli/database/migrations'],
            },
            seeders: {
                paths: ['../../build/examples/cli/database/seeders'],
            },
        },
    },
});
//# sourceMappingURL=database.js.map