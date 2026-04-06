import { DateTime } from 'luxon';
import { ModelQueryBuilder } from '../../orm/query_builder/index.js';
const SOFT_DELETE_MODE = Symbol('lucinate.softDeleteMode');
function getDeletedAtColumn(Model) {
    return Model.$softDeletes?.deletedAtColumn ?? 'deletedAt';
}
/**
 * Coluna qualificada `tabela.coluna` no SQL (ex.: `partners.deleted_at`).
 * Evita ambiguidade em JOINs quando outra tabela também tem a mesma coluna.
 */
function getQualifiedDeletedAtColumn(Model) {
    const attr = getDeletedAtColumn(Model);
    const columnName = Model.$keys.attributesToColumns.resolve(attr);
    return `${Model.table}.${columnName}`;
}
function getMode(builder) {
    return builder[SOFT_DELETE_MODE];
}
function setMode(builder, mode) {
    builder[SOFT_DELETE_MODE] = mode;
}
function applySoftDeleteScope(builder, Model) {
    const qualifiedDeletedAt = getQualifiedDeletedAtColumn(Model);
    const mode = getMode(builder);
    if (mode === 'with') {
        return;
    }
    if (mode === 'only') {
        builder.whereNotNull(qualifiedDeletedAt);
        return;
    }
    builder.whereNull(qualifiedDeletedAt);
}
function ensureSoftDeleteMacros(ModelQueryBuilder) {
    if (ModelQueryBuilder.__softDeletesMacrosRegistered) {
        return;
    }
    ModelQueryBuilder.macro('withTrashed', function () {
        setMode(this, 'with');
        return this;
    });
    ModelQueryBuilder.macro('onlyTrashed', function () {
        setMode(this, 'only');
        return this;
    });
    ModelQueryBuilder.macro('withoutTrashed', function () {
        setMode(this, undefined);
        return this;
    });
    ModelQueryBuilder.macro('restore', async function () {
        const deletedAtColumn = getDeletedAtColumn(this.model);
        const qualifiedDeletedAt = getQualifiedDeletedAtColumn(this.model);
        return this.withTrashed().whereNotNull(qualifiedDeletedAt).update({ [deletedAtColumn]: null });
    });
    ModelQueryBuilder.macro('forceDelete', async function () {
        return this.withTrashed().delete();
    });
    ModelQueryBuilder.__softDeletesMacrosRegistered = true;
}
export const SoftDeletes = (superclass) => {
    class SoftDeletesModel extends superclass {
        static $softDeletes = {
            deletedAtColumn: 'deletedAt',
            initialized: false,
        };
        static boot() {
            super.boot();
            ensureSoftDeleteMacros(ModelQueryBuilder);
            if (this.$softDeletes.initialized) {
                return;
            }
            this.$softDeletes.initialized = true;
            this.before('find', (query) => {
                applySoftDeleteScope(query, this);
            });
            this.before('fetch', (query) => {
                applySoftDeleteScope(query, this);
            });
            this.before('paginate', (queries) => {
                const [mainQuery, countQuery] = queries;
                applySoftDeleteScope(mainQuery, this);
                applySoftDeleteScope(countQuery, this);
            });
        }
        async delete() {
            const Model = this.constructor;
            const deletedAtColumn = getDeletedAtColumn(Model);
            this[deletedAtColumn] = DateTime.now();
            await this.save();
        }
        async deleteQuietly() {
            const Model = this.constructor;
            const deletedAtColumn = getDeletedAtColumn(Model);
            this[deletedAtColumn] = DateTime.now();
            await this.saveQuietly();
        }
        async restore() {
            const Model = this.constructor;
            const deletedAtColumn = getDeletedAtColumn(Model);
            this[deletedAtColumn] = null;
            await this.save();
            return this;
        }
        async forceDelete() {
            return super.delete();
        }
        get trashed() {
            const Model = this.constructor;
            const deletedAtColumn = getDeletedAtColumn(Model);
            return !!this[deletedAtColumn];
        }
    }
    return SoftDeletesModel;
};
export function configureSoftDeletes(Model, options = {}) {
    const target = Model;
    target.boot();
    target.$softDeletes = {
        ...(target.$softDeletes || {}),
        deletedAtColumn: options.deletedAtColumn ?? target.$softDeletes?.deletedAtColumn ?? 'deletedAt',
        initialized: target.$softDeletes?.initialized ?? true,
    };
}
export function registerSoftDeletesAddon(ModelQueryBuilder) {
    ensureSoftDeleteMacros(ModelQueryBuilder);
}
//# sourceMappingURL=index.js.map