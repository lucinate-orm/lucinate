import { defineConfig } from '../../../index.js';
export default defineConfig({
    connection: 'default',
    connections: {
        default: {
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: './examples/cli/demo.sqlite',
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