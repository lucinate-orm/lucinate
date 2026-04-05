import { BaseSchema } from '../../../../index.js';
export default class extends BaseSchema {
    async up() {
        this.schema.createTable('demo_posts', (table) => {
            table.increments('id').primary();
            table.string('title', 255).notNullable();
            table.timestamps(true, true);
        });
    }
    async down() {
        this.schema.dropTable('demo_posts');
    }
}
//# sourceMappingURL=1700000000000_demo_posts.js.map