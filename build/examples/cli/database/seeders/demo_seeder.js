import { BaseSeeder } from '../../../../index.js';
export default class extends BaseSeeder {
    async run() {
        await this.client.insertQuery().table('demo_posts').insert({
            title: 'Hello from the demo seeder',
            created_at: new Date(),
            updated_at: new Date(),
        });
    }
}
//# sourceMappingURL=demo_seeder.js.map